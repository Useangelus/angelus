-- ANGELUS storage on Supabase, reachable with the PUBLISHABLE key only.
--
-- How it stays private: the tables have row level security on and no policies, so the
-- publishable key cannot read or write them directly. Every read and write goes through
-- the SECURITY DEFINER functions below, and each one first checks a server-only token
-- (ANGELUS_DB_TOKEN). Only the SHA-256 of that token is stored, in a schema PostgREST
-- does not expose. Without the token the functions raise "forbidden".
--
-- Setup (once):
--   1. Run this whole file.
--   2. Run:  select private.angelus_set_token('<the ANGELUS_DB_TOKEN value>');
--      (the function keeps only the hash; it is not callable through the API)

create schema if not exists private;

create table if not exists private.app_secret (
  id boolean primary key default true check (id),
  token_hash text not null
);
revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

create or replace function private.angelus_set_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  insert into private.app_secret (id, token_hash)
  values (true, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'))
  on conflict (id) do update set token_hash = excluded.token_hash;
$$;
revoke all on function private.angelus_set_token(text) from public, anon, authenticated;

create or replace function private.angelus_check(p_token text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or not exists (
    select 1 from private.app_secret
    where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.angelus_check(text) from public, anon, authenticated;

-- ---------- tables ----------

create table if not exists public.kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.calls (
  id bigserial primary key,
  address text not null,
  ticker text not null,
  session date not null,
  side text not null check (side in ('over', 'under')),
  ref numeric not null,
  signature text not null,
  created_at timestamptz not null default now(),
  unique (address, ticker, session)
);
create index if not exists calls_session_idx on public.calls (session);
create index if not exists calls_address_idx on public.calls (address);

alter table public.kv enable row level security;
alter table public.calls enable row level security;
revoke all on public.kv, public.calls from anon, authenticated;

-- ---------- functions the site calls (POST /rest/v1/rpc/<name>) ----------

create or replace function public.angelus_kv_get(p_token text, p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.angelus_check(p_token);
  return (select value from public.kv where key = p_key);
end;
$$;

create or replace function public.angelus_kv_set(p_token text, p_key text, p_value jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.angelus_check(p_token);
  insert into public.kv (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end;
$$;

create or replace function public.angelus_call_insert(
  p_token text, p_address text, p_ticker text, p_session date, p_side text, p_ref numeric, p_signature text
) returns text
language plpgsql security definer set search_path = '' as $$
begin
  perform private.angelus_check(p_token);
  insert into public.calls (address, ticker, session, side, ref, signature)
  values (lower(p_address), p_ticker, p_session, p_side, p_ref, p_signature);
  return 'ok';
exception when unique_violation then
  return 'duplicate';
end;
$$;

create or replace function public.angelus_calls_list(
  p_token text, p_session date default null, p_address text default null, p_since date default null
) returns setof public.calls
language plpgsql security definer set search_path = '' as $$
begin
  perform private.angelus_check(p_token);
  return query
    select * from public.calls c
    where (p_session is null or c.session = p_session)
      and (p_address is null or c.address = lower(p_address))
      and (p_since is null or c.session >= p_since)
    order by c.created_at desc
    limit 5000;
end;
$$;

revoke all on function public.angelus_kv_get(text, text) from public;
revoke all on function public.angelus_kv_set(text, text, jsonb) from public;
revoke all on function public.angelus_call_insert(text, text, text, date, text, numeric, text) from public;
revoke all on function public.angelus_calls_list(text, date, text, date) from public;
grant execute on function public.angelus_kv_get(text, text) to anon, authenticated;
grant execute on function public.angelus_kv_set(text, text, jsonb) to anon, authenticated;
grant execute on function public.angelus_call_insert(text, text, text, date, text, numeric, text) to anon, authenticated;
grant execute on function public.angelus_calls_list(text, date, text, date) to anon, authenticated;
