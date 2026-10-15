-- v19: 30-day delayed-recall tier and event-sourced skill ecology.

alter table public.magic_relationship_events
  drop constraint if exists magic_relationship_events_check;

-- Postgres may have generated a different name for the inline CHECK. Drop the
-- named tier constraint too if an earlier deployment created it explicitly.
alter table public.magic_relationship_events
  drop constraint if exists magic_relationship_events_memory_tier_check;

alter table public.magic_relationship_events
  add constraint magic_relationship_events_shape_check
  check (
    (event_type='visit' and day_key ~ '^[0-9]{8}$' and memory_tier is null and round_id is null)
    or
    (event_type='memory' and day_key is null and memory_tier in ('memory-7','memory-14','memory-30')
      and round_id is not null)
  );

create table if not exists public.magic_ecology_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 420),
  subject text not null check (subject in ('math','korean','english')),
  memory_tier text not null check (memory_tier in ('memory-7','memory-14','memory-30')),
  round_id text not null check (char_length(round_id) between 1 and 128),
  occurred_at timestamptz not null,
  skills jsonb not null check (
    jsonb_typeof(skills)='array' and jsonb_array_length(skills) between 1 and 12
  ),
  payload jsonb not null default '{}'::jsonb,
  primary key (learner_id,event_id)
);

create index if not exists magic_ecology_events_learner_time_idx
  on public.magic_ecology_events(learner_id,occurred_at desc);
create index if not exists magic_ecology_events_tier_idx
  on public.magic_ecology_events(learner_id,memory_tier);

alter table public.magic_ecology_events enable row level security;

drop policy if exists magic_ecology_family on public.magic_ecology_events;
create policy magic_ecology_family on public.magic_ecology_events
for all using (
  exists(
    select 1 from public.magic_learners l
    where l.id=learner_id and public.is_magic_family_member(l.family_id)
  )
)
with check (
  exists(
    select 1 from public.magic_learners l
    where l.id=learner_id and public.is_magic_family_member(l.family_id)
  )
);

grant select,insert,update,delete on public.magic_ecology_events to authenticated;

comment on table public.magic_ecology_events is
  'Verified delayed-recall events with raw skill labels. Habitat categories are derived and are not ability ratings.';
comment on column public.magic_ecology_events.skills is
  'Raw IRT-bank skill labels for independently recalled items; retained so ecology mappings can be revised later.';
