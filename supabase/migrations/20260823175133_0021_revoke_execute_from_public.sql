-- 0021 revoke_execute_from_public
-- Postgres grants EXECUTE on new functions to PUBLIC, and anon/authenticated
-- inherit it. Revoking from the roles alone left that grant standing, so every
-- function was still reachable at /rest/v1/rpc/*. Revoke at the source, then
-- grant back only what RLS and the app actually need.
do $outer$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end $outer$;

-- RLS policies evaluate as the invoking user, so signed-in users need these three
grant execute on function public.current_role()  to authenticated;
grant execute on function public.is_staff()      to authenticated;
grant execute on function public.my_person_id()  to authenticated;

-- used when reading person rows the caller can already see
grant execute on function public.age_band(public.person) to authenticated;

-- both carry their own internal role checks
grant execute on function public.followup_prefill(text) to authenticated;
grant execute on function public.snapshot_period(text)  to authenticated;

-- trigger functions deliberately get no grants: triggers do not check EXECUTE.
