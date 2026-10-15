-- Magic Village NPC relationship events
-- Derived familiarity levels, dialogue and resident unlocks are NOT persisted.
-- They are recalculated from immutable relationship evidence.

create table if not exists public.magic_relationship_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 420),
  event_type text not null check (event_type in ('visit','memory')),
  npc_id text not null check (npc_id in ('bunny','cat','squirrel','owl','tutor')),
  occurred_at timestamptz not null,
  day_key text,
  memory_tier text,
  subject text,
  round_id text,
  payload jsonb not null default '{}'::jsonb,
  primary key (learner_id,event_id),
  check (
    (event_type='visit' and day_key ~ '^[0-9]{8}$' and memory_tier is null and round_id is null)
    or
    (event_type='memory' and day_key is null and memory_tier in ('memory-7','memory-14')
      and round_id is not null)
  ),
  check (subject is null or subject in ('math','korean','english'))
);

create index if not exists magic_relationship_events_learner_time_idx
  on public.magic_relationship_events(learner_id,occurred_at desc);

create index if not exists magic_relationship_events_npc_idx
  on public.magic_relationship_events(learner_id,npc_id,event_type);

alter table public.magic_relationship_events enable row level security;

drop policy if exists magic_relationship_family on public.magic_relationship_events;
create policy magic_relationship_family on public.magic_relationship_events
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

grant select,insert,update,delete on public.magic_relationship_events to authenticated;

comment on table public.magic_relationship_events is
  'Event-sourced NPC encounters and verified delayed-memory moments. Familiarity levels are derived, not stored.';
comment on column public.magic_relationship_events.memory_tier is
  'Verified delayed independent recall milestone; never an ability or development rating.';
