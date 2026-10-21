-- Run as a database administrator. Everything is rolled back.
-- Schema verified against the existing project metadata on 2026-10-21.
-- Never supply an existing family's pairing code or learner ID.
begin;
set local statement_timeout='15s';
create temp table qa_response_fixture(code text not null,learner_id uuid not null) on commit drop;
-- Generate a new, synthetic family and 244-bit random pairing code in this
-- transaction. No existing family identifiers or credentials are read.
do $$
declare f uuid; l uuid; c text;
begin
  c:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.magic_families(name) values('Synthetic response QA rollback only') returning id into f;
  insert into public.magic_learners(family_id,learner_key,display_name)
    values(f,'tae','Synthetic learner') returning id into l;
  insert into magic_private.magic_family_pairing_keys(family_id,code_hash)
    values(f,extensions.digest(c,'sha256'));
  insert into qa_response_fixture values(c,l);
end;
$$;

create temp table qa_response_results(test text not null,passed boolean not null) on commit drop;
create temp table qa_response_payload(event jsonb not null) on commit drop;
grant select on qa_response_fixture,qa_response_payload to anon;
grant insert on qa_response_results to anon;

do $$
declare e jsonb;
begin
  if (select count(*) from qa_response_fixture)<>1 then
    raise exception 'Create exactly one NEW synthetic family fixture before running this test';
  end if;
  e:=jsonb_build_object(
    'version',1,'eventId','qa-response-rollback-001','learnerKey','tae','eventType','answer',
    'sessionId','round-qa-rollback','gameId','qa-synthetic','questionId','qa-question',
    'subject','math','skill','qa-synthetic-skill','itemVersion','content-qa-test',
    'submittedAt',floor(extract(epoch from now())*1000)::bigint,
    'presentedAt',floor(extract(epoch from now())*1000)::bigint-1500,
    'responseMs',1500,'responseTimeKind','elapsed_capped_ms',
    'attemptIndex',1,'attemptIndexScope','device_item',
    'isCorrect',false,'hintUsed',false,'assistanceUsed',false,'independentFirst',true,
    'difficulty',-2,'guessing',0.2,'difficultySource','editorial_provisional',
    'thetaBefore',-2.2,'thetaAfter',-2.5,'modelVersion','provisional-1pl-guessing-v1','response',0);
  insert into qa_response_payload values(e);
  if has_table_privilege('anon','public.magic_response_events','SELECT') or
     has_table_privilege('anon','public.magic_response_events','INSERT') or
     has_table_privilege('anon','public.magic_response_events','UPDATE') or
     has_table_privilege('anon','public.magic_response_events','DELETE') then
    raise exception 'Anonymous direct table privilege found';
  end if;
  if not has_function_privilege('anon','public.magic_family_append_responses(text,jsonb)','EXECUTE') then
    raise exception 'Anonymous family RPC execute privilege missing';
  end if;
  insert into qa_response_results values('direct table grants denied / public RPC allowed',true);
end;
$$;

set local role anon;
do $$
declare c text; e jsonb; r jsonb; expected jsonb; rejected boolean;
begin
  select code into c from qa_response_fixture;
  select event into e from qa_response_payload;
  expected:=jsonb_build_array(e->>'eventId');
  r:=public.magic_family_append_responses(c,jsonb_build_array(e));
  if r->>'stored' is distinct from 'true' or r->>'inserted' is distinct from '1' or
     r->'eventIds' is distinct from expected then raise exception 'First append/ACK failed'; end if;
  insert into qa_response_results values('first append / exact ACK',true);
  r:=public.magic_family_append_responses(c,jsonb_build_array(e));
  if r->>'inserted' is distinct from '0' or r->'eventIds' is distinct from expected then
    raise exception 'Idempotent retry/ACK failed'; end if;
  insert into qa_response_results values('same event retry inserts zero / same ACK',true);
  rejected:=false;
  begin
    perform public.magic_family_append_responses(c,jsonb_build_array(e||jsonb_build_object('isCorrect',true)));
  exception when others then
    if sqlerrm='response event identity conflict' then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'Conflicting event identity was accepted'; end if;
  insert into qa_response_results values('same identity changed payload rejected',true);
  rejected:=false;
  begin
    perform public.magic_family_append_responses(c||'-invalid',jsonb_build_array(e));
  exception when others then
    if position('invalid family pairing code' in sqlerrm)>0 then rejected:=true; else raise; end if;
  end;
  if not rejected then raise exception 'Invalid family code was accepted'; end if;
  insert into qa_response_results values('invalid family rejected',true);
  rejected:=false;
  begin
    execute 'select count(*) from public.magic_response_events';
  exception when insufficient_privilege then rejected:=true;
  end;
  if not rejected then raise exception 'Anonymous table read was allowed'; end if;
  insert into qa_response_results values('anon direct read rejected',true);
  -- Hints retain null correctness and do not pretend to be independent answers.
  e:=e||jsonb_build_object('eventId','qa-response-rollback-hint','eventType','hint',
       'isCorrect',null,'hintUsed',true,'assistanceUsed',true,'independentFirst',false);
  r:=public.magic_family_append_responses(c,jsonb_build_array(e));
  if r->>'inserted' is distinct from '1' then raise exception 'Hint append failed'; end if;
  insert into qa_response_results values('null-correctness hint accepted',true);
end;
$$;
reset role;
do $$
declare l uuid; n bigint;
begin
  select learner_id into l from qa_response_fixture;
  select count(*) into n from public.magic_response_events
    where learner_id=l and event_id in ('qa-response-rollback-001','qa-response-rollback-hint');
  if n<>2 then raise exception 'Unexpected synthetic event count'; end if;
  if not exists(select 1 from public.magic_response_events where learner_id=l
    and event_id='qa-response-rollback-001' and correct=false) then
    raise exception 'Original incorrect response changed';
  end if;
  insert into qa_response_results values('only two synthetic rows / original answer immutable',true);
end;
$$;
select test,passed from qa_response_results order by test;
rollback;
