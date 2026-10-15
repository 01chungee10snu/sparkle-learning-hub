-- v20 security hardening: keep SECURITY DEFINER helpers out of exposed public RPC schema.

create schema if not exists magic_private;
revoke all on schema magic_private from public;
grant usage on schema magic_private to anon, authenticated;

create or replace function magic_private.is_magic_family_member(target_family uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.magic_family_members m
    where m.family_id=target_family and m.user_id=auth.uid()
  );
$$;

revoke all on function magic_private.is_magic_family_member(uuid) from public;
grant execute on function magic_private.is_magic_family_member(uuid) to anon, authenticated;

create or replace function magic_private.bootstrap_magic_family(
  p_family_name text default 'Magic Village Family',
  p_tae_name text default '태희',
  p_se_name text default '세희'
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
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

revoke all on function magic_private.bootstrap_magic_family(text,text,text) from public, anon;
grant execute on function magic_private.bootstrap_magic_family(text,text,text) to authenticated;

-- Exposed RPC is an invoker-rights wrapper only. Privileged work stays private.
create or replace function public.bootstrap_magic_family(
  p_family_name text default 'Magic Village Family',
  p_tae_name text default '태희',
  p_se_name text default '세희'
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, magic_private
as $$
  select magic_private.bootstrap_magic_family(p_family_name,p_tae_name,p_se_name);
$$;

revoke all on function public.bootstrap_magic_family(text,text,text) from public, anon;
grant execute on function public.bootstrap_magic_family(text,text,text) to authenticated;

alter policy magic_families_member on public.magic_families
using (magic_private.is_magic_family_member(id))
with check (magic_private.is_magic_family_member(id));

alter policy magic_members_self_family on public.magic_family_members
using (user_id=auth.uid() or magic_private.is_magic_family_member(family_id));

alter policy magic_learners_family on public.magic_learners
using (magic_private.is_magic_family_member(family_id))
with check (magic_private.is_magic_family_member(family_id));

alter policy magic_devices_family on public.magic_devices
using (magic_private.is_magic_family_member(family_id))
with check (magic_private.is_magic_family_member(family_id));

alter policy magic_stage_family on public.magic_stage_state
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_attempts_family on public.magic_learning_attempts
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_rounds_family on public.magic_round_receipts
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_village_family on public.magic_village_events
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_rewards_family on public.magic_reward_events
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_goals_family on public.magic_growth_goals
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_snapshots_family on public.magic_device_snapshots
using (magic_private.is_magic_family_member(family_id))
with check (magic_private.is_magic_family_member(family_id));

alter policy magic_relationship_family on public.magic_relationship_events
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

alter policy magic_ecology_family on public.magic_ecology_events
using (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)))
with check (exists(select 1 from public.magic_learners l where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)));

revoke all on function public.is_magic_family_member(uuid) from public, anon, authenticated;
drop function public.is_magic_family_member(uuid);
