-- v21 family-only device pairing: no parent account/login required.
-- A high-entropy family code is verified only inside magic_private.

create table if not exists magic_private.magic_family_pairing_keys (
  family_id uuid primary key references public.magic_families(id) on delete cascade,
  code_hash bytea not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

revoke all on magic_private.magic_family_pairing_keys from public, anon, authenticated;

create or replace function magic_private.family_for_pairing_code(p_code text)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public, magic_private, extensions
as $$
declare
  v_family uuid;
begin
  if p_code is null or char_length(p_code) not between 20 and 128 then
    return null;
  end if;

  select k.family_id into v_family
  from magic_private.magic_family_pairing_keys k
  where k.code_hash = extensions.digest(p_code,'sha256')
  limit 1;

  return v_family;
end;
$$;

revoke all on function magic_private.family_for_pairing_code(text) from public;
grant execute on function magic_private.family_for_pairing_code(text) to anon, authenticated;

create or replace function magic_private.magic_family_pair(
  p_code text,
  p_device_key text,
  p_label text default 'Magic Village Web'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, magic_private, extensions
as $$
declare
  v_family uuid;
  v_device uuid;
  v_learners jsonb;
begin
  v_family := magic_private.family_for_pairing_code(p_code);
  if v_family is null then
    raise exception 'invalid family pairing code';
  end if;

  if p_device_key is null or char_length(p_device_key) not between 8 and 160
     or p_device_key !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'invalid device key';
  end if;

  insert into public.magic_devices(family_id,device_key,label,last_seen_at)
  values(v_family,p_device_key,left(coalesce(nullif(trim(p_label),''),'Magic Village Web'),120),now())
  on conflict(family_id,device_key) do update
    set label=excluded.label,last_seen_at=now()
  returning id into v_device;

  select coalesce(jsonb_object_agg(l.learner_key,l.id), '{}'::jsonb)
  into v_learners
  from public.magic_learners l
  where l.family_id=v_family;

  return jsonb_build_object(
    'familyId',v_family,
    'deviceId',v_device,
    'learners',v_learners
  );
end;
$$;

revoke all on function magic_private.magic_family_pair(text,text,text) from public;
grant execute on function magic_private.magic_family_pair(text,text,text) to anon, authenticated;

create or replace function magic_private.magic_family_pull(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, magic_private, extensions
as $$
declare
  v_family uuid;
  v_rows jsonb;
begin
  v_family := magic_private.family_for_pairing_code(p_code);
  if v_family is null then
    raise exception 'invalid family pairing code';
  end if;

  select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc),'[]'::jsonb)
  into v_rows
  from (
    select distinct on (d.id)
      x.payload,
      x.content_sha256,
      x.created_at,
      x.device_id,
      x.client_revision
    from public.magic_devices d
    left join public.magic_device_snapshots x on x.device_id=d.id
    where d.family_id=v_family and x.id is not null
    order by d.id,x.client_revision desc,x.created_at desc
  ) s;

  return v_rows;
end;
$$;

revoke all on function magic_private.magic_family_pull(text) from public;
grant execute on function magic_private.magic_family_pull(text) to anon, authenticated;

create or replace function magic_private.magic_family_push(
  p_code text,
  p_device_key text,
  p_client_revision bigint,
  p_payload jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, magic_private, extensions
as $$
declare
  v_family uuid;
  v_device uuid;
  v_revision bigint;
  v_inserted boolean := false;
begin
  v_family := magic_private.family_for_pairing_code(p_code);
  if v_family is null then
    raise exception 'invalid family pairing code';
  end if;

  if p_device_key is null or char_length(p_device_key) not between 8 and 160
     or p_device_key !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'invalid device key';
  end if;
  if p_content_sha256 is null or p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid content hash';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid snapshot payload';
  end if;

  insert into public.magic_devices(family_id,device_key,label,last_seen_at)
  values(v_family,p_device_key,'Magic Village Web',now())
  on conflict(family_id,device_key) do update set last_seen_at=now()
  returning id into v_device;

  select greatest(coalesce(max(x.client_revision),0)+1,coalesce(p_client_revision,0))
  into v_revision
  from public.magic_device_snapshots x
  where x.device_id=v_device;

  begin
    insert into public.magic_device_snapshots(
      family_id,device_id,client_revision,payload,content_sha256
    ) values(
      v_family,v_device,v_revision,p_payload,p_content_sha256
    );
    v_inserted := true;
  exception
    when unique_violation then
      v_inserted := false;
  end;

  return jsonb_build_object(
    'familyId',v_family,
    'deviceId',v_device,
    'revision',v_revision,
    'uploaded',v_inserted
  );
end;
$$;

revoke all on function magic_private.magic_family_push(text,text,bigint,jsonb,text) from public;
grant execute on function magic_private.magic_family_push(text,text,bigint,jsonb,text) to anon, authenticated;

-- Public RPC wrappers stay SECURITY INVOKER and expose no privileged table access.
create or replace function public.magic_family_pair(
  p_code text,
  p_device_key text,
  p_label text default 'Magic Village Web'
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, magic_private
as $$
  select magic_private.magic_family_pair(p_code,p_device_key,p_label);
$$;

create or replace function public.magic_family_pull(p_code text)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, magic_private
as $$
  select magic_private.magic_family_pull(p_code);
$$;

create or replace function public.magic_family_push(
  p_code text,
  p_device_key text,
  p_client_revision bigint,
  p_payload jsonb,
  p_content_sha256 text
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, magic_private
as $$
  select magic_private.magic_family_push(
    p_code,p_device_key,p_client_revision,p_payload,p_content_sha256
  );
$$;

revoke all on function public.magic_family_pair(text,text,text) from public;
revoke all on function public.magic_family_pull(text) from public;
revoke all on function public.magic_family_push(text,text,bigint,jsonb,text) from public;
grant execute on function public.magic_family_pair(text,text,text) to anon, authenticated;
grant execute on function public.magic_family_pull(text) to anon, authenticated;
grant execute on function public.magic_family_push(text,text,bigint,jsonb,text) to anon, authenticated;
