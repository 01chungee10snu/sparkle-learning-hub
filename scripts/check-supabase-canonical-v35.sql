begin;
set local statement_timeout='15s';
set local lock_timeout='5s';

create temp table qa_family(code text,family_id uuid) on commit drop;
do $$
declare f uuid; c text;
begin
  c:='MVQA_'||replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into public.magic_families(name) values('Synthetic canonical v35 rollback') returning id into f;
  insert into magic_private.magic_family_pairing_keys(family_id,code_hash)
    values(f,extensions.digest(c,'sha256'));
  insert into qa_family values(c,f);
end $$;

do $$
declare c text; r jsonb; p1 jsonb; p2 jsonb;
begin
  select code into c from qa_family;
  p1:=jsonb_build_object('format','sparkle-learning-backup','version',1,
    'platform',jsonb_build_object('version',1,'profiles',jsonb_build_object()),
    'cloudSnapshotVersion',1,'qa','device-a');
  p2:=p1||jsonb_build_object('qa','device-b');
  r:=public.magic_family_state_pull(c);
  if r->>'exists' is distinct from 'false' or r->>'version' is distinct from '0' then raise exception 'new family should have no canonical state'; end if;
  r:=public.magic_family_state_commit(c,'qa-device-a-12345678',0,p1,repeat('a',64));
  if r->>'committed' is distinct from 'true' or r->>'version' is distinct from '1' then raise exception 'initial canonical commit failed'; end if;
  r:=public.magic_family_state_commit(c,'qa-device-b-12345678',0,p2,repeat('b',64));
  if r->>'conflict' is distinct from 'true' or r->>'version' is distinct from '1' or r->'payload'->>'qa' is distinct from 'device-a' then raise exception 'stale version was not rejected with current state'; end if;
  r:=public.magic_family_state_commit(c,'qa-device-b-12345678',1,p2,repeat('b',64));
  if r->>'committed' is distinct from 'true' or r->>'version' is distinct from '2' then raise exception 'merged retry did not advance canonical version'; end if;
  r:=public.magic_family_state_pull(c);
  if r->>'version' is distinct from '2' or r->'payload'->>'qa' is distinct from 'device-b' then raise exception 'canonical pull did not return latest state'; end if;
end $$;

do $$
declare f uuid; n integer;
begin
  select family_id into f from qa_family;
  select count(*) into n from public.magic_device_snapshots where family_id=f;
  if n<>2 then raise exception 'canonical commits must leave two immutable snapshot receipts, got %',n; end if;
  if has_table_privilege('anon','public.magic_family_state','SELECT') or has_table_privilege('anon','public.magic_family_state','INSERT') or has_table_privilege('anon','public.magic_family_state','UPDATE') or has_table_privilege('anon','public.magic_family_state','DELETE') then raise exception 'anon direct canonical table privilege found'; end if;
  if not has_function_privilege('anon','public.magic_family_state_pull(text)','EXECUTE') or not has_function_privilege('anon','public.magic_family_state_commit(text,text,bigint,jsonb,text)','EXECUTE') then raise exception 'anon canonical RPC permission missing'; end if;
end $$;

select 'PASS' as result,'initial commit / stale conflict / merged retry / latest pull / immutable receipts / direct table denied' as cases;
rollback;
