-- ═══════════════════════════════════════════════════════════════════════════
--  0032 — current_role() must honour app_user.is_active
--
--  05_ROLES_AND_RLS.md section 2 defines this function as:
--      select role from public.app_user where id = auth.uid() and is_active;
--  The deployed version dropped `and is_active`. The document wins.
--
--  WHY THIS MATTERED. Deactivating a user is how the Coordinator removes
--  someone who has left the municipality. Demonstrated on the deployed
--  database: with is_active set to false, the front end correctly dropped the
--  user to the "no role" screen, and the SAME session still read public.person
--  over PostgREST and got a national ID back. The UI revoked; the database did
--  not. `is_active` was decoration.
--
--  Fixing it here rather than in each policy is deliberate: every policy
--  reaches the role through this one function, so this closes the hole
--  everywhere at once and cannot be half-applied to some tables.
--
--  A deactivated user now has NO role at all: current_role() returns null, so
--  every `current_role() = ...` and `... in (...)` test fails. Their JWT stays
--  valid until it expires -- that is Auth's business, not RLS's -- but it
--  buys them nothing.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public."current_role"()
returns app_role_t
language sql stable security definer set search_path = public as $$
  select role from public.app_user where id = auth.uid() and is_active;
$$;

-- is_staff() already coalesces. is_coordinator() did not, and now that
-- current_role() can return null it would return null instead of false.
-- Postgres treats a null USING clause as "no rows", so this is not a hole
-- today, but a null boolean is a trap for the next person who writes
-- `not is_coordinator()` -- which is null, not true.
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public."current_role"() = 'coordinator', false);
$$;

-- 0021/0022 revoked EXECUTE from PUBLIC. `create or replace` keeps the
-- existing ACL, but assert it rather than trust it.
revoke execute on function public."current_role"() from public, anon;
revoke execute on function public.is_coordinator() from public, anon;
grant execute on function public."current_role"() to authenticated;
grant execute on function public.is_coordinator() to authenticated;
