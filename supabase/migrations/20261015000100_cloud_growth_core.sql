-- Magic Village cloud persistence core
-- Target: Supabase/PostgreSQL. DBeaver is an administration client, not the database host.
-- All child-facing runtime access must use authenticated APIs + RLS; never expose the database password.

create extension if not exists pgcrypto;

create table if not exists public.magic_families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Magic Village Family' check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.magic_family_members (
  family_id uuid not null references public.magic_families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','parent')),
  created_at timestamptz not null default now(),
  primary key (family_id,user_id)
);

create table if not exists public.magic_learners (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.magic_families(id) on delete cascade,
  learner_key text not null check (learner_key in ('tae','se')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (family_id, learner_key)
);

create table if not exists public.magic_devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.magic_families(id) on delete cascade,
  device_key text not null check (char_length(device_key) between 8 and 160),
  label text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (family_id, device_key)
);

create table if not exists public.magic_stage_state (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  subject text not null check (subject in ('math','korean','english')),
  stage smallint not null check (stage between 1 and 4),
  updated_at timestamptz not null,
  primary key (learner_id,subject)
);

create table if not exists public.magic_learning_attempts (
  event_id text primary key check (char_length(event_id) between 1 and 180),
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  game_id text not null,
  question_id text not null,
  round_id text not null,
  correct boolean not null,
  assisted boolean not null default false,
  duration_ms integer check (duration_ms between 0 and 600000),
  answered_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists magic_learning_attempts_learner_time_idx on public.magic_learning_attempts(learner_id,answered_at desc);
create index if not exists magic_learning_attempts_item_idx on public.magic_learning_attempts(learner_id,game_id,question_id);

create table if not exists public.magic_round_receipts (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  round_id text not null,
  game_id text not null,
  paper_id text,
  question_ids jsonb not null check (jsonb_typeof(question_ids)='array'),
  completed_at timestamptz not null,
  primary key (learner_id,game_id,round_id)
);

create table if not exists public.magic_village_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null,
  game_id text,
  round_id text,
  event_type text not null default 'completion',
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (learner_id,event_id)
);

create table if not exists public.magic_reward_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null,
  event_type text not null check (event_type in ('effort','purchase','equip','unequip','family_complete')),
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  primary key (learner_id,event_id)
);

create table if not exists public.magic_growth_goals (
  learner_id uuid primary key references public.magic_learners(id) on delete cascade,
  goal text not null check (goal in ('balanced','math','korean','english','garden')),
  updated_at timestamptz not null
);

create table if not exists public.magic_device_snapshots (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.magic_families(id) on delete cascade,
  device_id uuid not null references public.magic_devices(id) on delete cascade,
  client_revision bigint not null check (client_revision >= 0),
  payload jsonb not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (device_id,client_revision),
  unique (family_id,content_sha256)
);
create index if not exists magic_device_snapshots_family_time_idx on public.magic_device_snapshots(family_id,created_at desc);

create or replace function public.is_magic_family_member(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.magic_family_members m
    where m.family_id=target_family and m.user_id=auth.uid()
  );
$$;

-- First-login bootstrap. A security-definer RPC avoids the RLS chicken-and-egg
-- problem: there is no family membership yet that could authorize the first row.
create or replace function public.bootstrap_magic_family(
  p_family_name text default 'Magic Village Family',
  p_tae_name text default '태희',
  p_se_name text default '세희'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;
  if char_length(trim(coalesce(p_family_name,''))) not between 1 and 120
     or char_length(trim(coalesce(p_tae_name,''))) not between 1 and 40
     or char_length(trim(coalesce(p_se_name,''))) not between 1 and 40 then
    raise exception 'invalid family or learner name';
  end if;

  select m.family_id into v_family
  from public.magic_family_members m
  where m.user_id=v_user
  order by m.created_at asc
  limit 1;

  if v_family is not null then
    return v_family;
  end if;

  insert into public.magic_families(name)
  values (trim(p_family_name))
  returning id into v_family;

  insert into public.magic_family_members(family_id,user_id,role)
  values (v_family,v_user,'owner');

  insert into public.magic_learners(family_id,learner_key,display_name)
  values
    (v_family,'tae',trim(p_tae_name)),
    (v_family,'se',trim(p_se_name));

  return v_family;
end;
$$;

revoke all on function public.bootstrap_magic_family(text,text,text) from public;
grant execute on function public.bootstrap_magic_family(text,text,text) to authenticated;

alter table public.magic_families enable row level security;
alter table public.magic_family_members enable row level security;
alter table public.magic_learners enable row level security;
alter table public.magic_devices enable row level security;
alter table public.magic_stage_state enable row level security;
alter table public.magic_learning_attempts enable row level security;
alter table public.magic_round_receipts enable row level security;
alter table public.magic_village_events enable row level security;
alter table public.magic_reward_events enable row level security;
alter table public.magic_growth_goals enable row level security;
alter table public.magic_device_snapshots enable row level security;

drop policy if exists magic_families_member on public.magic_families;
create policy magic_families_member on public.magic_families
for all using (public.is_magic_family_member(id))
with check (public.is_magic_family_member(id));

drop policy if exists magic_members_self_family on public.magic_family_members;
create policy magic_members_self_family on public.magic_family_members
for select using (user_id=auth.uid() or public.is_magic_family_member(family_id));

drop policy if exists magic_learners_family on public.magic_learners;
create policy magic_learners_family on public.magic_learners
for all using (public.is_magic_family_member(family_id))
with check (public.is_magic_family_member(family_id));

drop policy if exists magic_devices_family on public.magic_devices;
create policy magic_devices_family on public.magic_devices
for all using (public.is_magic_family_member(family_id))
with check (public.is_magic_family_member(family_id));

drop policy if exists magic_stage_family on public.magic_stage_state;
create policy magic_stage_family on public.magic_stage_state
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_attempts_family on public.magic_learning_attempts;
create policy magic_attempts_family on public.magic_learning_attempts
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_rounds_family on public.magic_round_receipts;
create policy magic_rounds_family on public.magic_round_receipts
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_village_family on public.magic_village_events;
create policy magic_village_family on public.magic_village_events
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_rewards_family on public.magic_reward_events;
create policy magic_rewards_family on public.magic_reward_events
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_goals_family on public.magic_growth_goals;
create policy magic_goals_family on public.magic_growth_goals
for all using (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and public.is_magic_family_member(l.family_id)));

drop policy if exists magic_snapshots_family on public.magic_device_snapshots;
create policy magic_snapshots_family on public.magic_device_snapshots
for all using (public.is_magic_family_member(family_id))
with check (public.is_magic_family_member(family_id));

grant usage on schema public to authenticated;
grant select,insert,update,delete on
 public.magic_families, public.magic_family_members, public.magic_learners, public.magic_devices,
 public.magic_stage_state, public.magic_learning_attempts, public.magic_round_receipts,
 public.magic_village_events, public.magic_reward_events, public.magic_growth_goals,
 public.magic_device_snapshots
to authenticated;
