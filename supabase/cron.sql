-- ANGELUS: exact-time nightly lock, run from Supabase (pg_cron + pg_net).
--
-- Why: on Vercel's Hobby plan a cron job can fire at any minute inside its hour, so the
-- 04:00 ET lock could land as late as 04:59, after Wall Street's pre-market has begun.
-- pg_cron fires on the minute. The Vercel crons in vercel.json stay as a backup: the lock
-- route is idempotent ("already locked"), so a second call does nothing.
--
-- Run once in the Supabase SQL editor AFTER the site is deployed, replacing the two values:
--   <SITE>         the production origin, e.g. https://angelus.example (no trailing slash)
--   <CRON_SECRET>  the same CRON_SECRET set on Vercel

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the secret in Supabase Vault, not in the job text.
select vault.create_secret('<CRON_SECRET>', 'angelus_cron_secret');

create or replace function private.angelus_call_lock()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret text;
begin
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'angelus_cron_secret';
  perform net.http_get(
    url := '<SITE>/api/cron/lock',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret),
    timeout_milliseconds := 120000
  );
end;
$$;

revoke all on function private.angelus_call_lock() from public, anon, authenticated;

-- 04:00 ET is 08:00 UTC in summer (EDT) and 09:00 UTC in winter (EST). Both run; the route
-- acts only inside the hour after 04:00 ET, so exactly one of them locks each night.
select cron.schedule('angelus-lock-0800', '0 8 * * *', 'select private.angelus_call_lock()');
select cron.schedule('angelus-lock-0900', '0 9 * * *', 'select private.angelus_call_lock()');

-- Check later:
--   select jobname, schedule from cron.job;
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
--   select status_code, created from net._http_response order by created desc limit 5;
