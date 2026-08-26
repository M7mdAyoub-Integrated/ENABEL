-- 0050 called hmac() unqualified from a function pinned to
-- `search_path = public, pg_temp`. pgcrypto lives in `extensions`, so the call
-- resolved at migration time (default search path) but would have thrown
-- 42883 at runtime. plpgsql does not resolve function names until execution,
-- which is why the migration reported success.
--
-- Qualifying explicitly rather than widening search_path: a security-definer
-- function should name exactly what it calls.

create or replace function bump_lookup_throttle(
  p_scope   text,
  p_value   text,
  p_window  interval,
  p_limit   integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash  text;
  v_now   timestamptz := now();
  v_used  integer;
begin
  select encode(extensions.hmac(p_value, s.salt, 'sha256'), 'hex')
    into v_hash
    from applicant_lookup_secret s
   where s.id;

  delete from applicant_lookup_throttle
   where minute_bucket < v_now - (p_window + interval '5 minutes');

  insert into applicant_lookup_throttle (scope, key_hash, minute_bucket, attempts)
  values (p_scope, v_hash, date_trunc('minute', v_now), 1)
  on conflict (scope, key_hash, minute_bucket)
    do update set attempts = applicant_lookup_throttle.attempts + 1;

  select coalesce(sum(attempts), 0)
    into v_used
    from applicant_lookup_throttle
   where scope = p_scope
     and key_hash = v_hash
     and minute_bucket > v_now - p_window;

  return v_used <= p_limit;
end;
$$;

revoke all on function bump_lookup_throttle(text, text, interval, integer) from public, anon, authenticated;
