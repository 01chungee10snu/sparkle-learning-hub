-- Magic Village v35: one versioned family state shared by every paired device.
-- Clients merge local offline work with the canonical payload, then commit with
-- compare-and-swap. A stale device can never overwrite a newer family state.

create table if not exists public.magic_family_state (
  family_id uuid primary key references public.magic_families(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  payload jsonb not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  updated_by_device uuid references public.magic_devices(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.magic_family_state enable row level security;
revoke all on public.magic_family_state from public, anon, authenticated;
grant select on public.magic_family_state to authenticated;

drop policy if exists magic_family_state_member_read on public.magic_family_state;
create policy magic_family_state_member_read on public.magic_family_state
for select using (magic_private.is_magic_family_member(family_id));

create or replace function magic_private.magic_family_state_pull(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public,magic_private,extensions
as $$
declare
  v_family uuid;
  v_state public.magic_family_state%rowtype;
begin
  v_family:=magic_private.family_for_pairing_code(p_code);
  if v_family is null then raise exception 'invalid family pairing code'; end if;

  select * into v_state
  from public.magic_family_state
  where family_id=v_family;

  if not found then
    return jsonb_build_object('exists',false,'version',0);
  end if;

  return jsonb_build_object(
    'exists',true,
    'version',v_state.version,
    'contentSha256',v_state.content_sha256,
    'payload',v_state.payload,
    'updatedAt',floor(extract(epoch from v_state.updated_at)*1000)::bigint
  );
end;
$$;

create or replace function magic_private.magic_family_state_commit(
  p_code text,
  p_device_key text,
  p_expected_version bigint,
  p_payload jsonb,
  p_content_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,magic_private,extensions
as $$
declare
  v_family uuid;
  v_device uuid;
  v_state public.magic_family_state%rowtype;
  v_next bigint;
  v_device_revision bigint;
begin
  v_family:=magic_private.family_for_pairing_code(p_code);
  if v_family is null then raise exception 'invalid family pairing code'; end if;

  if p_device_key is null or char_length(p_device_key) not between 8 and 160
     or p_device_key !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'invalid device key';
  end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'invalid expected version';
  end if;
  if p_content_sha256 is null or p_content_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid content hash';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or p_payload->>'cloudSnapshotVersion' <> '1'
     or p_payload->>'format' <> 'sparkle-learning-backup'
     or p_payload #>> '{platform,version}' <> '1' then
    raise exception 'invalid canonical payload';
  end if;
  if octet_length(p_payload::text) > 8388608 then
    raise exception 'canonical payload too large';
  end if;

  insert into public.magic_devices(family_id,device_key,label,last_seen_at)
  values(v_family,p_device_key,'Magic Village Web',now())
  on conflict(family_id,device_key) do update set last_seen_at=now()
  returning id into v_device;

  select * into v_state
  from public.magic_family_state
  where family_id=v_family
  for update;

  if found then
    if v_state.version <> p_expected_version then
      return jsonb_build_object(
        'committed',false,
        'conflict',true,
        'version',v_state.version,
        'contentSha256',v_state.content_sha256,
        'payload',v_state.payload,
        'updatedAt',floor(extract(epoch from v_state.updated_at)*1000)::bigint
      );
    end if;
    if v_state.content_sha256=p_content_sha256 then
      return jsonb_build_object(
        'committed',false,
        'conflict',false,
        'unchanged',true,
        'version',v_state.version,
        'contentSha256',v_state.content_sha256
      );
    end if;
    v_next:=v_state.version+1;
    update public.magic_family_state
      set version=v_next,payload=p_payload,content_sha256=p_content_sha256,
          updated_by_device=v_device,updated_at=now()
      where family_id=v_family;
  else
    if p_expected_version<>0 then
      return jsonb_build_object('committed',false,'conflict',true,'version',0);
    end if;
    v_next:=1;
    insert into public.magic_family_state(
      family_id,version,payload,content_sha256,updated_by_device,updated_at
    ) values(v_family,v_next,p_payload,p_content_sha256,v_device,now());
  end if;

  -- Keep the existing immutable snapshot/archive pipeline usable. Canonical
  -- commits therefore also leave one hash-addressed historical receipt.
  select coalesce(max(client_revision),0)+1 into v_device_revision
  from public.magic_device_snapshots where device_id=v_device;
  insert into public.magic_device_snapshots(
    family_id,device_id,client_revision,payload,content_sha256
  ) values(v_family,v_device,v_device_revision,p_payload,p_content_sha256)
  on conflict(family_id,content_sha256) do nothing;

  return jsonb_build_object(
    'committed',true,
    'conflict',false,
    'version',v_next,
    'contentSha256',p_content_sha256
  );
end;
$$;

revoke all on function magic_private.magic_family_state_pull(text) from public;
revoke all on function magic_private.magic_family_state_commit(text,text,bigint,jsonb,text) from public;
grant execute on function magic_private.magic_family_state_pull(text) to anon,authenticated;
grant execute on function magic_private.magic_family_state_commit(text,text,bigint,jsonb,text) to anon,authenticated;

create or replace function public.magic_family_state_pull(p_code text)
returns jsonb language sql security invoker
set search_path=pg_catalog,public,magic_private
as $$ select magic_private.magic_family_state_pull(p_code); $$;

create or replace function public.magic_family_state_commit(
  p_code text,p_device_key text,p_expected_version bigint,p_payload jsonb,p_content_sha256 text
)
returns jsonb language sql security invoker
set search_path=pg_catalog,public,magic_private
as $$ select magic_private.magic_family_state_commit(
  p_code,p_device_key,p_expected_version,p_payload,p_content_sha256
); $$;

revoke all on function public.magic_family_state_pull(text) from public;
revoke all on function public.magic_family_state_commit(text,text,bigint,jsonb,text) from public;
grant execute on function public.magic_family_state_pull(text) to anon,authenticated;
grant execute on function public.magic_family_state_commit(text,text,bigint,jsonb,text) to anon,authenticated;

notify pgrst, 'reload schema';
