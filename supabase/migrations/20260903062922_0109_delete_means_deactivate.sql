-- ═══════════════════════════════════════════════════════════════════════════
--  0109 — delete means deactivate, and the guard that was only half a guard
--
--  ── WHAT WAS FOUND ──
--
--  `guard_soft_delete` (0069) is a BEFORE **UPDATE** trigger. It is attached to
--  all 32 tables carrying `deleted_at`, and `check-soft-delete-guards.mjs`
--  fails the build if one is missing. Both of those are true and neither of
--  them stops a hard delete, because a DELETE is not an UPDATE and the trigger
--  never fires on it.
--
--  Measured through RLS, as a real coordinator, with `set local role
--  authenticated` and the claims set, in a transaction that rolled back:
--
--      delete from ref_safety_item where code = <first>   ->    1 row
--      delete from indicator_target                       ->  260 rows
--      delete from reporting_period where code = '29/Q3'  ->    1 row
--
--  260 rows is the donor's entire quarterly target matrix. There is no
--  `deleted_at` on `indicator_target` to reverse it with and no guard to refuse
--  it, and afterwards a reporting period could be removed too, because the
--  foreign keys that had been protecting it pointed at rows that were now gone.
--  As `data_entry` the same statement against `ref_product` returned 0 rows --
--  RLS filtered it, silently, which is the seventh failure in CLAUDE.md and is
--  the correct outcome arrived at the frightening way.
--
--  ── WHY NOTHING CAUGHT IT ──
--
--  This is the register's own test, failed by the register's own check:
--
--      "The test for any check: could this pass while the thing it checks is
--       wrong?"
--
--  `check-soft-delete-guards.mjs` asks whether a table with `deleted_at` has a
--  guard. Every one of the 32 does. It never asks whether deletion actually
--  goes THROUGH that guard, and on all 32 it did not have to.
--
--  ── WHAT THIS MIGRATION DOES ──
--
--  1. `guard_no_hard_delete()` — a BEFORE DELETE trigger that refuses.
--     Attached by walking `pg_class`, not by a hand-written list, so a table
--     added later without one is a visible omission rather than a typo nobody
--     sees. 57 tables get it.
--
--  2. The DELETE-capable POLICIES come off the same tables. A policy fix alone
--     would be the wrong shape: RLS does not apply to the table owner, so
--     dropping `ref_delete` protects `authenticated` and leaves every
--     migration, support script and MCP session -- which is how the three
--     deletes above were first reproduced -- able to do it anyway. The trigger
--     is the boundary; the policy change is so the refusal happens at the right
--     layer for the roles RLS does cover.
--
--  ── WHAT IS DELIBERATELY LEFT ABLE TO DELETE, AND WHY ──
--
--  Nine tables. Adding a guard to any of them would be a defect, not a
--  tightening.
--
--  Eight are rewritten by delete-then-insert, because that is the only way to
--  express "these and only these" for a multi-select:
--
--      exhibition_registration_product   person_activity_type
--      partnership_role                  coordination_meeting_partner
--      followup_answer                   followup_answer_option
--      followup_safety_item              followup_buyer_connection
--
--  A `deleted_at` on these would be actively harmful: re-ticking a box would
--  find a soft-deleted row and either refuse on the unique key or resurrect it
--  with the wrong provenance. The audit trail is what makes their history safe,
--  and it was confirmed rather than assumed -- all eight carry an AFTER
--  INSERT OR UPDATE OR DELETE `audit_row` trigger, which writes `old_data`,
--  `actor` and `actor_role` for every removed row, and all eight hang off a
--  parent that IS soft-deleted and audited (`exhibition_registration`,
--  `person`, `partnership`, `coordination_meeting`, `followup_survey`).
--
--  The ninth is `applicant_lookup_throttle` — OQ-21, approved 26 Aug 2026 and
--  written into CLAUDE.md rule 2. `bump_lookup_throttle` purges expired
--  buckets; guarding it would break the public applicant lookup.
--
--  ── indicator_snapshot: BLOCKED, AND NO `deleted_at` ──
--
--  Asked to decide and justify rather than copy the pattern. It gets the
--  trigger and it does NOT get the column.
--
--  A snapshot is the frozen record of a figure that was reported to the donor.
--  OQ-25's whole design is the reconciliation -- "reported 47, current data
--  says 49" -- and that sentence has two halves. `deleted_at` would let the
--  left half be removed: every read would filter it out, the dashboard would
--  fall back to the live recomputation, and the divergence the donor asks
--  about would vanish silently rather than being answered.
--
--  There is also no operation that needs it. Re-snapshotting an unlocked period
--  is already an UPSERT -- `on conflict (indicator_id, period_id) do update ...
--  where is_final = false` -- so correction is an update, and `is_final` is the
--  freeze. Nothing legitimate deletes a snapshot; the column would exist only
--  to make an illegitimate act look tidy.
--
--  ── app_user: BLOCKED, `is_active` is the deactivation path ──
--
--  `au_delete` admitted a coordinator. Deleting an `app_user` row would leave
--  `current_role()` returning null for that account -- which reads as "not
--  signed in" rather than "removed" -- and would orphan every `actor` in
--  `audit_log` pointing at them, which is the one table that must stay
--  readable. `current_role()` already honours `is_active` (0032), so an
--  inactive user is refused everywhere by the same mechanism, reversibly, with
--  their history intact.
--
--  `app_user.id` is `references auth.users(id) on delete cascade`, so deleting
--  a Supabase auth account used to remove the role row with it, and now hits
--  this guard instead. That is not a capability being taken away. `person`
--  references `auth.users` twice -- `auth_user_id` and `created_by` -- and both
--  are NO ACTION, so deleting the auth account of anyone who has ever entered a
--  record was already refused by a foreign key. The cascade only made it look
--  possible for accounts that had not yet touched anything. The guard gets its
--  own branch for this table so the refusal names auth.users, rather than
--  arriving from the dashboard as an unexplained database error two joins away
--  from its cause -- 05_ROLES_AND_RLS.md §13, a refusal must not be dressed as
--  something else.
--
--  ── framework tables: BLOCKED, no column ──
--
--  `objective`, `activity`, `indicator`, `indicator_target`, `reporting_period`.
--  Nothing should ever delete these and nothing ever has. They are seeded from
--  the workbook and they are the definition of the report, not data about it.
--  A `deleted_at` here would mean an indicator could be made to disappear from
--  the framework while its rows still existed.
--
--  ── ref_ tables: BLOCKED, they already have the column ──
--
--  All 26 carry `deleted_at`, `is_active` and `guard_soft_delete`, and their
--  retirement path is `is_active = false` (OQ-20). The DELETE policy was pure
--  escape hatch. Note the shape of the exposure: an FK is `NO ACTION` on every
--  one of them, so a referenced row is protected by accident -- and a row
--  nothing references YET, which is most of the survey option lists, is not
--  protected at all. `ref_safety_item` has 9 rows and 0 references today.
--
--  ── THE ESCAPE HATCH, NAMED RATHER THAN AMBIENT ──
--
--  `07_BUILD_CHECKLIST.md` still has "retire the demo data and draw the audit
--  boundary before go-live" outstanding, and every row in this database is
--  demo or test residue. A guard with no way past it would either block that
--  work or get dropped in a hurry by whoever is doing it.
--
--  So there is one way past, and it takes two deliberate acts in the same
--  transaction: be the table's OWNER, and set `app.allow_hard_delete = 'on'`.
--  `authenticated` is never the owner, so this is not reachable from the
--  application at any role. The owner is read from `pg_class` rather than
--  compared against the literal 'postgres', so the check does not quietly stop
--  working if the project is restored under a different owner.
--
--  Deletes taken that way are still audited: `audit_row` is an AFTER trigger,
--  so it fires and its row commits with the delete. A refused delete audits
--  nothing, because the exception rolls the statement back.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the guard ───────────────────────────────────────────────────────────

create or replace function public.guard_no_hard_delete()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_owner text;
begin
  -- Derived from the catalogue, not compared against a literal role name, so a
  -- project restored under a different owner does not silently lose the escape.
  select pg_get_userbyid(c.relowner) into v_owner
    from pg_class c where c.oid = tg_relid;

  if current_user = v_owner
     and coalesce(current_setting('app.allow_hard_delete', true), '') = 'on' then
    return old;
  end if;

  if tg_table_name = 'app_user' then
    -- Reached by cascade from auth.users far more often than by a direct
    -- DELETE, and from the Supabase dashboard, which shows only the message.
    raise exception
      'app_user rows are never removed -- set is_active = false instead'
      using errcode = 'restrict_violation',
            hint    = 'If this came from deleting an account in auth.users: that '
                      'cascade is what this refuses. The role row is the only '
                      'record of what an audit_log actor was allowed to do.',
            detail  = 'attempted by role ' || current_user;
  end if;

  raise exception
    'rows in % are never removed -- set deleted_at (or is_active) instead', tg_table_name
    using errcode   = 'restrict_violation',
          hint      = 'CLAUDE.md rule 2. Deletion is deactivation. If this is go-live '
                      'demo-data retirement, do it as the table owner with '
                      'app.allow_hard_delete set to on, in one transaction.',
          detail    = 'attempted by role ' || current_user;
end $$;

-- Section 11 of 05_ROLES_AND_RLS.md: a trigger does not consult EXECUTE
-- privilege on its function, so a grant here buys the trigger nothing and only
-- creates a second way to reach a guard from outside the context it expects.
revoke all on function public.guard_no_hard_delete() from public, anon, authenticated;

-- ── 2. attach it by walking the catalogue ──────────────────────────────────

do $attach$
declare
  r record;
  -- The nine that are SUPPOSED to lose rows. See the header for each.
  c_exempt constant text[] := array[
    'exhibition_registration_product', 'person_activity_type',
    'partnership_role', 'coordination_meeting_partner',
    'followup_answer', 'followup_answer_option',
    'followup_safety_item', 'followup_buyer_connection',
    'applicant_lookup_throttle'
  ];
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not (c.relname = any (c_exempt))
     order by c.relname
  loop
    execute format('drop trigger if exists %I on public.%I',
                   'trg_' || r.relname || '_no_hard_delete', r.relname);
    execute format(
      'create trigger %I before delete on public.%I '
      'for each row execute function public.guard_no_hard_delete()',
      'trg_' || r.relname || '_no_hard_delete', r.relname);
  end loop;
end $attach$;

-- ── 3. take the DELETE policies off the same tables ────────────────────────
--
-- Three policy names carry a delete capability on tables that must not lose
-- rows: `ref_delete` (24 tables), `au_delete` (app_user), and `ref_write`
-- (8 survey option lists, `for all`, which includes DELETE).
--
-- `op_delete` and `fu_delete_child` are NOT touched. They are the eight
-- delete-then-insert rewrites, and removing them recreates CLAUDE.md's seventh
-- failure exactly: RLS filters the delete, the statement reports success, the
-- toast is green, and the box the user unticked is still ticked.

do $policies$
declare
  r record;
begin
  for r in
    select c.relname as tbl, p.polname
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and p.polcmd::text = 'd'
       and p.polname in ('ref_delete', 'au_delete')
  loop
    execute format('drop policy %I on public.%I', r.polname, r.tbl);
  end loop;
end $policies$;

-- The eight follow-up option lists (0075) were given a single `for all` policy
-- rather than the four-policy pattern, so DELETE rode along inside it. Split it
-- into the three verbs that are actually wanted. Same predicate, same roles --
-- the only thing that changes is that DELETE is no longer among them.
do $refwrite$
declare
  r record;
begin
  for r in
    select c.relname as tbl
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and p.polname = 'ref_write'
       and p.polcmd::text = '*'
  loop
    execute format('drop policy ref_write on public.%I', r.tbl);
    execute format(
      'create policy ref_insert on public.%I for insert to authenticated '
      'with check (public."current_role"() = ''coordinator''::app_role_t)', r.tbl);
    execute format(
      'create policy ref_update on public.%I for update to authenticated '
      'using (public."current_role"() = ''coordinator''::app_role_t) '
      'with check (public."current_role"() = ''coordinator''::app_role_t)', r.tbl);
  end loop;
end $refwrite$;

-- ── 4. verification, inside the migration ──────────────────────────────────
--
-- Not a comment claiming the guard works. Two assertions that fail the
-- migration if it does not, both derived from the catalogue rather than from a
-- count somebody typed.

do $verify$
declare
  v_missing text[];
  v_extra   text[];
  c_exempt constant text[] := array[
    'exhibition_registration_product', 'person_activity_type',
    'partnership_role', 'coordination_meeting_partner',
    'followup_answer', 'followup_answer_option',
    'followup_safety_item', 'followup_buyer_connection',
    'applicant_lookup_throttle'
  ];
begin
  -- every non-exempt table has the trigger
  select array_agg(c.relname order by c.relname) into v_missing
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not (c.relname = any (c_exempt))
     and not exists (
       select 1 from pg_trigger t
        where t.tgrelid = c.oid and not t.tgisinternal
          and t.tgfoid = 'public.guard_no_hard_delete()'::regprocedure);
  if v_missing is not null then
    raise exception '0109: no hard-delete guard on %', v_missing;
  end if;

  -- and no exempt table accidentally got one
  select array_agg(c.relname order by c.relname) into v_extra
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and c.relname = any (c_exempt)
     and exists (
       select 1 from pg_trigger t
        where t.tgrelid = c.oid and not t.tgisinternal
          and t.tgfoid = 'public.guard_no_hard_delete()'::regprocedure);
  if v_extra is not null then
    raise exception '0109: delete-then-insert table wrongly guarded: %', v_extra;
  end if;
end $verify$;

comment on function public.guard_no_hard_delete() is
  'Refuses DELETE. Attached to every table except the eight rewritten by '
  'delete-then-insert and applicant_lookup_throttle (OQ-21). Fires for the '
  'owner too, which a policy cannot -- see 0109 for why that is the point.';
