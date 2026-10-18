-- Magic Village 2026-10-17: append-only per-child evidence from paired snapshots.
-- SECURITY: No anon table access; public RPC indexes only a SHA-bound snapshot
-- already stored for the caller's high-entropy family pairing code.
-- Historical local snapshots remain intact. No fake academic certifications.

alter table public.magic_stage_state
  drop constraint if exists magic_stage_state_subject_check;
alter table public.magic_stage_state
  add constraint magic_stage_state_subject_check
  check (subject in ('math','korean','english','hanja'));

create table if not exists public.magic_pond_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 100),
  event_type text not null check (event_type in ('adopt','feed')),
  fish_id text not null check (fish_id in ('guppy','goldfish','neon','betta','koi','angel')),
  occurred_at timestamptz not null,
  primary key (learner_id,event_id)
);
create index if not exists magic_pond_events_learner_time_idx
  on public.magic_pond_events(learner_id,occurred_at desc);
alter table public.magic_pond_events enable row level security;
revoke all on public.magic_pond_events from public, anon;
grant select on public.magic_pond_events to authenticated;
drop policy if exists magic_pond_events_family on public.magic_pond_events;
create policy magic_pond_events_family on public.magic_pond_events
  for select using (exists(
    select 1 from public.magic_learners l
    where l.id=learner_id and magic_private.is_magic_family_member(l.family_id)
  ));

create or replace function magic_private.magic_family_index_snapshot(
  p_code text, p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, magic_private, extensions
as $$
declare
  v_family uuid;
  v_payload jsonb;
  v_who text;
  v_learner uuid;
  v_games jsonb;
  v_game record;
  v_question record;
  v_attempt jsonb;
  v_round jsonb;
  v_record jsonb;
  v_fish record;
  v_day record;
  v_at bigint;
  v_events integer := 0;
  v_rounds integer := 0;
  v_fish_events integer := 0;
begin
  v_family:=magic_private.family_for_pairing_code(p_code);
  if v_family is null then raise exception 'invalid family pairing code'; end if;
  if coalesce(p_content_sha256,'') !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid snapshot hash';
  end if;
  select s.payload into v_payload from public.magic_device_snapshots s
  where s.family_id=v_family and s.content_sha256=p_content_sha256
  order by s.created_at desc limit 1;
  if v_payload is null or v_payload->>'format' <> 'sparkle-learning-backup'
     or v_payload #>> '{platform,version}' <> '1' then
     raise exception 'known compatible family snapshot required';
  end if;
  foreach v_who in array array['tae','se'] loop
    select id into v_learner from public.magic_learners
      where family_id=v_family and learner_key=v_who;
    if v_learner is null then continue; end if;
    v_games=v_payload #> array['platform','profiles',v_who,'games'];
    if jsonb_typeof(v_games)<>'object' then continue; end if;
    for v_game in select * from jsonb_each(v_games) loop
      if v_game.key !~ '^[a-z][a-z0-9-]{0,79}$' then continue; end if;
      if jsonb_typeof(v_game.value->'records')='object' then
        for v_question in select * from jsonb_each(v_game.value->'records') loop
          if v_question.key !~ '^[a-z][a-z0-9-]{0,79}$' then continue; end if;
          v_record=v_question.value;
          for v_attempt in
            select value from jsonb_array_elements(
              case when jsonb_typeof(v_record->'attempts')='array'
                then v_record->'attempts' else '[]'::jsonb end
            )
            union all
            select v_record->'firstAttempt'
            where jsonb_typeof(v_record->'firstAttempt')='object'
          loop
            if jsonb_typeof(v_attempt)<>'object' or
              coalesce(v_attempt->>'id','') !~ '^attempt-[a-zA-Z0-9-]{3,140}$' or
              coalesce(v_attempt->>'roundId','') !~ '^round-[a-zA-Z0-9-]{3,140}$' or
              jsonb_typeof(v_attempt->'correct')<>'boolean' or
              coalesce(v_attempt->>'at','') !~ '^[0-9]{12,14}$' then continue; end if;
            v_at=(v_attempt->>'at')::bigint;
            if v_at<946684800000 or v_at>extract(epoch from now()+interval '1 day')*1000 then continue; end if;
            insert into public.magic_learning_attempts(
              event_id,learner_id,game_id,question_id,round_id,correct,assisted,
              duration_ms,answered_at,payload,purpose,strategy
            ) values(
              encode(extensions.digest(v_learner::text||':'||(v_attempt->>'id'),'sha256'),'hex'),
              v_learner,v_game.key,v_question.key,v_attempt->>'roundId',
              (v_attempt->>'correct')::boolean,
              coalesce((v_attempt->>'assisted')::boolean,false),
              case when coalesce(v_attempt->>'durationMs','') ~ '^[0-9]{1,6}$'
                    then least((v_attempt->>'durationMs')::integer,600000)
                    else null end,
              to_timestamp(v_at/1000.0),v_attempt,
              case when v_attempt->>'purpose' in ('foundation','review','challenge','transfer') then v_attempt->>'purpose' else null end,
              case when v_attempt->>'strategy' in ('adaptive','review') then v_attempt->>'strategy' else null end
            )
            on conflict(event_id) do nothing;
            get diagnostics v_events = row_count;
          end loop;
        end loop;
      end if;
      for v_round in
        select value from jsonb_array_elements(
          case when jsonb_typeof(v_game.value->'completedRounds')='array'
            then v_game.value->'completedRounds' else '[]'::jsonb end
        )
      loop
        if jsonb_typeof(v_round)<>'object' or
            coalesce(v_round->>'id','') !~ '^round-[a-zA-Z0-9-]{3,140}$' or
            coalesce(v_round->>'at','') !~ '^[0-9]{12,14}$' or
            jsonb_typeof(v_round->'questionIds')<>'array' then continue; end if;
        v_at=(v_round->>'at')::bigint;
        if v_at<946684800000 or v_at>extract(epoch from now()+interval '1 day')*1000 then continue; end if;
        insert into public.magic_round_receipts(
          learner_id,round_id,game_id,paper_id,question_ids,completed_at,purpose,strategy
        ) values(
          v_learner,v_round->>'id',v_game.key,v_round->>'paperId',
          v_round->'questionIds',to_timestamp(v_at/1000.0),
          case when v_round->>'purpose' in ('foundation','review','challenge','transfer') then v_round->>'purpose' else null end,
          case when v_round->>'strategy' in ('adaptive','review') then v_round->>'strategy' else null end
        ) on conflict(learner_id,game_id,round_id) do nothing;
        get diagnostics v_rounds = row_count;
      end loop;
    end loop;
    for v_fish in
      select * from jsonb_each(
        case when jsonb_typeof(v_payload #> array['resources','profiles',v_who,'adoptions'])='object'
          then v_payload #> array['resources','profiles',v_who,'adoptions']
          else '{}'::jsonb end
      )
    loop
      if v_fish.key not in ('goldfish','neon','betta','koi','angel') or
        coalesce(v_fish.value->>'at','') !~ '^[0-9]{12,14}$' then continue; end if;
      v_at=(v_fish.value->>'at')::bigint;
      if v_at<946684800000 or v_at>extract(epoch from now()+interval '1 day')*1000 then continue; end if;
      insert into public.magic_pond_events(learner_id,event_id,event_type,fish_id,occurred_at)
        values (v_learner,'adopt-'||v_fish.key,'adopt',v_fish.key,to_timestamp(v_at/1000.0))
      on conflict(learner_id,event_id) do nothing;
      get diagnostics v_fish_events = row_count;
    end loop;
    for v_day in
      select * from jsonb_each(
        case when jsonb_typeof(v_payload #> array['resources','profiles',v_who,'feedEvents'])='object'
          then v_payload #> array['resources','profiles',v_who,'feedEvents']
          else '{}'::jsonb end
      )
    loop
      if v_day.key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-(guppy|goldfish|neon|betta|koi|angel)$'
        or coalesce(v_day.value->>'at','') !~ '^[0-9]{12,14}$' then continue; end if;
      v_at=(v_day.value->>'at')::bigint;
      if v_at<946684800000 or v_at>extract(epoch from now()+interval '1 day')*1000 then continue; end if;
      insert into public.magic_pond_events(learner_id,event_id,event_type,fish_id,occurred_at)
        values (v_learner,'feed-'||v_day.key,'feed',v_day.value->>'fishId',to_timestamp(v_at/1000.0))
      on conflict(learner_id,event_id) do nothing;
      get diagnostics v_fish_events = row_count;
    end loop;
  end loop;
  return jsonb_build_object('indexed',true,'snapshot',p_content_sha256);
end;
$$;

revoke all on function magic_private.magic_family_index_snapshot(text,text) from public;
grant execute on function magic_private.magic_family_index_snapshot(text,text) to anon,authenticated;

create or replace function public.magic_family_index_snapshot(
 p_code text,p_content_sha256 text
)
returns jsonb language sql security invoker
set search_path = pg_catalog, public, magic_private
as $$
 select magic_private.magic_family_index_snapshot(p_code,p_content_sha256);
$$;
revoke all on function public.magic_family_index_snapshot(text,text) from public;
grant execute on function public.magic_family_index_snapshot(text,text) to anon,authenticated;
