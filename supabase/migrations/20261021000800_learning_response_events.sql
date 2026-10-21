-- Complete, immutable response history (including hints and feedback retries).
-- Existing high-entropy family pairing verifies membership; clients never choose
-- database learner UUIDs. Public tables have no anonymous read/write privileges.
create table if not exists public.magic_response_events (
  learner_id uuid not null references public.magic_learners(id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 240),
  event_type text not null check (event_type in ('answer','hint','retry')),
  game_id text not null,
  question_id text not null,
  session_id text not null,
  subject text not null check (subject in ('math','korean','english','hanja')),
  item_version text not null,
  correct boolean,
  hint_used boolean not null,
  assistance_used boolean not null,
  independent_first boolean not null,
  attempt_index integer not null check (attempt_index between 0 and 100000),
  response_ms integer check (response_ms between 0 and 600000),
  difficulty numeric,
  theta_before numeric,
  theta_after numeric,
  model_version text not null,
  submitted_at timestamptz not null,
  server_received_at timestamptz not null default now(),
  payload jsonb not null,
  primary key (learner_id,event_id),
  check ((event_type='hint' and correct is null) or (event_type<>'hint' and correct is not null))
);
create index if not exists magic_response_events_learner_time_idx
  on public.magic_response_events(learner_id,submitted_at,event_id);
alter table public.magic_response_events enable row level security;
revoke all on public.magic_response_events from public,anon,authenticated;
grant select on public.magic_response_events to authenticated;
drop policy if exists magic_response_events_family on public.magic_response_events;
create policy magic_response_events_family on public.magic_response_events for select
using (exists(select 1 from public.magic_learners l where l.id=learner_id
  and magic_private.is_magic_family_member(l.family_id)));

create or replace function magic_private.magic_family_append_responses(p_code text,p_events jsonb)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public,magic_private,extensions
as $$
declare
  v_family uuid; v_learner uuid; e jsonb; v_at bigint; v_existing jsonb;
  v_ids jsonb:='[]'::jsonb; v_inserted integer:=0; v_row_count integer;
begin
  v_family:=magic_private.family_for_pairing_code(p_code);
  if v_family is null then raise exception 'invalid family pairing code'; end if;
  if jsonb_typeof(p_events) is distinct from 'array' then raise exception 'response event array required'; end if;
  if jsonb_array_length(p_events)>100 or octet_length(p_events::text)>524288 then
    raise exception 'response event batch too large';
  end if;
  for e in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(e) is distinct from 'object'
      or e->>'version' is distinct from '1'
      or coalesce(e->>'learnerKey','') not in ('tae','se')
      or coalesce(e->>'eventType','') not in ('answer','hint','retry')
      or coalesce(e->>'eventId','') !~ '^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,239}$'
      or coalesce(e->>'sessionId','') !~ '^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,239}$'
      or coalesce(e->>'gameId','') !~ '^[a-z][a-z0-9-]{0,79}$'
      or coalesce(e->>'questionId','') !~ '^[a-z][a-z0-9-]{0,79}$'
      or coalesce(e->>'subject','') not in ('math','korean','english','hanja')
      or coalesce(e->>'submittedAt','') !~ '^[0-9]{12,14}$'
      or coalesce(e->>'attemptIndex','') !~ '^[0-9]{1,6}$'
      or jsonb_typeof(e->'hintUsed') is distinct from 'boolean'
      or jsonb_typeof(e->'assistanceUsed') is distinct from 'boolean'
      or jsonb_typeof(e->'independentFirst') is distinct from 'boolean'
      or jsonb_typeof(e->'itemVersion') is distinct from 'string'
      or char_length(e->>'itemVersion')>100
      or jsonb_typeof(e->'skill') is distinct from 'string'
      or char_length(e->>'skill')>180
      or jsonb_typeof(e->'modelVersion') is distinct from 'string'
      or char_length(e->>'modelVersion')>80
      or e->>'difficultySource' is distinct from 'editorial_provisional' then
      raise exception 'invalid response event metadata';
    end if;
    if (e->>'eventType'='hint' and jsonb_typeof(e->'isCorrect') is distinct from 'null')
      or (e->>'eventType'<>'hint' and jsonb_typeof(e->'isCorrect') is distinct from 'boolean') then
      raise exception 'invalid response correctness';
    end if;
    if (e->>'attemptIndex')::integer>100000 then raise exception 'invalid attempt index'; end if;
    if jsonb_typeof(e->'responseMs') is distinct from 'null' and
      (coalesce(e->>'responseMs','') !~ '^[0-9]{1,6}$') then raise exception 'invalid response time'; end if;
    if coalesce((e->>'responseMs')::integer,0)>600000 then raise exception 'invalid response time'; end if;
    if jsonb_typeof(e->'difficulty') not in ('number','null') or
       jsonb_typeof(e->'thetaBefore') not in ('number','null') or
       jsonb_typeof(e->'thetaAfter') not in ('number','null') then raise exception 'invalid model evidence'; end if;
    v_at:=(e->>'submittedAt')::bigint;
    if v_at<946684800000 or v_at>extract(epoch from now()+interval '1 day')*1000 then
      raise exception 'invalid response timestamp';
    end if;
    select id into v_learner from public.magic_learners
      where family_id=v_family and learner_key=e->>'learnerKey';
    if v_learner is null then raise exception 'family learner unavailable'; end if;
    insert into public.magic_response_events(
      learner_id,event_id,event_type,game_id,question_id,session_id,subject,item_version,correct,
      hint_used,assistance_used,independent_first,attempt_index,response_ms,difficulty,
      theta_before,theta_after,model_version,submitted_at,payload
    ) values (
      v_learner,e->>'eventId',e->>'eventType',e->>'gameId',e->>'questionId',e->>'sessionId',e->>'subject',e->>'itemVersion',
      (e->>'isCorrect')::boolean,(e->>'hintUsed')::boolean,(e->>'assistanceUsed')::boolean,
      (e->>'independentFirst')::boolean,(e->>'attemptIndex')::integer,(e->>'responseMs')::integer,
      (e->>'difficulty')::numeric,(e->>'thetaBefore')::numeric,(e->>'thetaAfter')::numeric,e->>'modelVersion',
      to_timestamp(v_at/1000.0),e
    ) on conflict(learner_id,event_id) do nothing;
    get diagnostics v_row_count=row_count;
    v_inserted:=v_inserted+v_row_count;
    select payload into v_existing from public.magic_response_events
      where learner_id=v_learner and event_id=e->>'eventId';
    if v_existing is distinct from e then raise exception 'response event identity conflict'; end if;
    v_ids:=v_ids||jsonb_build_array(e->>'eventId');
  end loop;
  return jsonb_build_object('stored',true,'inserted',v_inserted,'eventIds',v_ids);
end;
$$;
revoke all on function magic_private.magic_family_append_responses(text,jsonb) from public;
grant execute on function magic_private.magic_family_append_responses(text,jsonb) to anon,authenticated;
create or replace function public.magic_family_append_responses(p_code text,p_events jsonb)
returns jsonb language sql security invoker
set search_path=pg_catalog,public,magic_private
as $$ select magic_private.magic_family_append_responses(p_code,p_events); $$;
revoke all on function public.magic_family_append_responses(text,jsonb) from public;
grant execute on function public.magic_family_append_responses(text,jsonb) to anon,authenticated;

-- Expand previously restricted pond history to all 64 real species.
alter table public.magic_pond_events drop constraint if exists magic_pond_events_fish_id_check;
alter table public.magic_pond_events add constraint magic_pond_events_fish_id_check check (fish_id in ('guppy','goldfish','neon','betta','koi','angel','platy','black-molly','zebra-danio','cherry-barb','harlequin-rasbora','dwarf-gourami','bronze-corydoras','otocinclus','medaka','white-cloud-minnow','celestial-pearl-danio','rummy-nose-tetra','discus','german-blue-ram','pearl-gourami','panda-corydoras','scarlet-badis','clown-killifish','clownfish','yellowtail-damselfish','royal-gramma','copperband-butterflyfish','blue-tang','longnose-butterflyfish','porcupinefish','yellow-boxfish','shrimp','long-spined-urchin','common-starfish','moon-jelly','hermit-crab','lion-mane-jelly','bluespotted-ribbontail-ray','manta-ray','sea-crab','bottlenose-dolphin','whale-shark','giant-squid','seahorse','american-lobster','spiny-lobster','cleaner-shrimp','octopus','nudibranch','giant-clam','sea-anemone','sea-turtle','staghorn-coral','sea-cucumber','leafy-seadragon','reef-shark','flame-angelfish','mandarinfish','weedy-seadragon','humpback-whale','giant-pacific-octopus','beluga-whale','leatherback-turtle'));

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
      if v_fish.key not in ('guppy','goldfish','neon','betta','koi','angel','platy','black-molly','zebra-danio','cherry-barb','harlequin-rasbora','dwarf-gourami','bronze-corydoras','otocinclus','medaka','white-cloud-minnow','celestial-pearl-danio','rummy-nose-tetra','discus','german-blue-ram','pearl-gourami','panda-corydoras','scarlet-badis','clown-killifish','clownfish','yellowtail-damselfish','royal-gramma','copperband-butterflyfish','blue-tang','longnose-butterflyfish','porcupinefish','yellow-boxfish','shrimp','long-spined-urchin','common-starfish','moon-jelly','hermit-crab','lion-mane-jelly','bluespotted-ribbontail-ray','manta-ray','sea-crab','bottlenose-dolphin','whale-shark','giant-squid','seahorse','american-lobster','spiny-lobster','cleaner-shrimp','octopus','nudibranch','giant-clam','sea-anemone','sea-turtle','staghorn-coral','sea-cucumber','leafy-seadragon','reef-shark','flame-angelfish','mandarinfish','weedy-seadragon','humpback-whale','giant-pacific-octopus','beluga-whale','leatherback-turtle') or
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
      if v_day.key !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z][a-z0-9-]+$'
        or coalesce(v_day.value->>'fishId','') not in ('guppy','goldfish','neon','betta','koi','angel','platy','black-molly','zebra-danio','cherry-barb','harlequin-rasbora','dwarf-gourami','bronze-corydoras','otocinclus','medaka','white-cloud-minnow','celestial-pearl-danio','rummy-nose-tetra','discus','german-blue-ram','pearl-gourami','panda-corydoras','scarlet-badis','clown-killifish','clownfish','yellowtail-damselfish','royal-gramma','copperband-butterflyfish','blue-tang','longnose-butterflyfish','porcupinefish','yellow-boxfish','shrimp','long-spined-urchin','common-starfish','moon-jelly','hermit-crab','lion-mane-jelly','bluespotted-ribbontail-ray','manta-ray','sea-crab','bottlenose-dolphin','whale-shark','giant-squid','seahorse','american-lobster','spiny-lobster','cleaner-shrimp','octopus','nudibranch','giant-clam','sea-anemone','sea-turtle','staghorn-coral','sea-cucumber','leafy-seadragon','reef-shark','flame-angelfish','mandarinfish','weedy-seadragon','humpback-whale','giant-pacific-octopus','beluga-whale','leatherback-turtle')
        or v_day.key <> (v_day.value->>'day')||'-'||(v_day.value->>'fishId')
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
