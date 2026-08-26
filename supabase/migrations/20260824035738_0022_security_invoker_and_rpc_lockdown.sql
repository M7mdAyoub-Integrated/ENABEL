-- 0022 security_invoker_and_rpc_lockdown
--
-- SCOPE NOTE: the security_invoker half of this migration was deliberately NOT
-- applied. Setting security_invoker on v_indicator_actual, v_indicator_disaggregated
-- and v_person_public would require partner_viewer to hold select policies on the
-- ~20 underlying operational tables, including person. Because every signed-in user
-- shares the single `authenticated` Postgres role, such a policy would also expose
-- the raw, unmasked national_id at /rest/v1/person. The three views each self-gate
-- by app role internally, so SECURITY DEFINER is the control that keeps raw tables
-- unreachable. The advisor's three ERROR lints are accepted as known false
-- positives for these views. See "Corrections applied during the build" in
-- 02_DATABASE_PLAN.md.
--
-- What this migration does apply: the RPC lockdown (B) and the anon revoke (C).

-- ---------------------------------------------------------------- B. RPC lockdown

-- Explicit coordinator helper, mirroring is_staff(). Returns NULL when there is no
-- JWT, exactly as current_role() does.
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() = 'coordinator';
$$;

revoke all on function public.is_coordinator() from public, anon;
grant execute on function public.is_coordinator() to authenticated;

-- snapshot_period keeps SECURITY DEFINER so it can write to indicator_snapshot,
-- but the role check is now the first statement in the body rather than an
-- implicit consequence of who holds the grant.
--
-- NOTE ON NULL: is_coordinator() returns NULL when auth.uid() is null, i.e. a
-- trusted server-side or service_role call. `if not NULL then` is not true, so
-- that path passes the guard by design. Do NOT wrap is_coordinator() in
-- coalesce(..., false) without also reworking this guard, or the function
-- becomes uncallable by anything once the authenticated grant is revoked.
create or replace function public.snapshot_period(p_period_code text)
returns int language plpgsql security definer set search_path = public as $$
declare v_period public.reporting_period; n int;
begin
  if not public.is_coordinator() then
    raise exception 'Only a coordinator may snapshot a reporting period';
  end if;

  select * into v_period from public.reporting_period where code = p_period_code;
  if not found then
    raise exception 'unknown reporting period %', p_period_code;
  end if;
  if v_period.is_locked then
    raise exception 'reporting period % is locked and cannot be recomputed', p_period_code;
  end if;

  insert into public.indicator_snapshot
    (indicator_id, period_id, actual_value, computed_at, computed_by)
  select i.id, v_period.id, a.actual, now(), auth.uid()
  from public.v_indicator_actual a
  join public.indicator i on i.code = a.code
  where a.period_code = p_period_code
  on conflict (indicator_id, period_id) do update
    set actual_value = excluded.actual_value,
        computed_at  = now(),
        computed_by  = excluded.computed_by
    where public.indicator_snapshot.is_final = false;

  get diagnostics n = row_count;
  return n;
end $$;

-- followup_prefill takes a national ID and returns that person's full record.
-- A participant could enumerate other people, so no client-side role may call it.
-- The internal is_staff() guard stays as defence in depth.
revoke all on function public.followup_prefill(text) from public, anon, authenticated;
revoke all on function public.snapshot_period(text)  from public, anon, authenticated;

-- current_role(), is_staff() and my_person_id() stay callable: all three take zero
-- arguments and can only ever report on auth.uid(), so they cannot be used to ask
-- about another user. RLS policies evaluate as the invoker and need them.

-- ------------------------------------------------------------- C. anon lockdown
-- No policy grants anon anything today and nothing in the app authenticates
-- anonymously, but a single future policy written "to public" would open all of
-- these. Revoke defensively, including for objects created later.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
