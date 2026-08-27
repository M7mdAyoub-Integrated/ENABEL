-- ═══════════════════════════════════════════════════════════════════════════
--  0055 — trigger functions are granted to nobody
--
--  A trigger fires as part of the statement that fired it. It does NOT consult
--  EXECUTE privilege on its function, so granting one buys the trigger nothing
--  and only creates a way to call the guard directly, outside the context it
--  was written for.
--
--  check_delivery_not_future arrived with 0043 and missed the pattern every
--  other trigger function in this schema follows. It was executable by public,
--  anon and authenticated.
--
--  What that actually exposed is small -- it reads NEW and raises, so calling it
--  by hand does nothing useful and it cannot be called by hand meaningfully at
--  all without a trigger context. This is closed because an unnecessary grant on
--  a security boundary is a defect regardless of whether today's version of the
--  function happens to be harmless. The next edit is the one that isn't.
--
--  Swept the whole schema rather than fixing the one: every function in public
--  returning `trigger` now grants to nobody.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace s on s.oid = p.pronamespace
      join pg_type t on t.oid = p.prorettype
     where s.nspname = 'public'
       and t.typname = 'trigger'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

comment on function public.check_delivery_not_future() is
  'Trigger function. Granted to NOBODY -- a trigger fires regardless of EXECUTE '
  'privilege, so any grant here is surface with no purpose. See '
  '05_ROLES_AND_RLS.md.';
