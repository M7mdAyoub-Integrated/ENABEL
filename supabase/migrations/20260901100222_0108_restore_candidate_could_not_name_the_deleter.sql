-- ═══════════════════════════════════════════════════════════════════════════
--  0108 — the restore lookup worked for the owner and for nobody else
--
--  ── WHAT WAS WRONG ──
--
--  `person_restore_candidate` and `partner_restore_candidate` (0107) are
--  SECURITY INVOKER, which is right: RLS should decide who may see a deleted
--  person. To name WHO deleted the row they joined `auth.users` for the email.
--
--  `authenticated` has no SELECT on `auth.users`. So every call from the
--  application failed:
--
--      42501  permission denied for table users
--
--  Not "no candidate found" -- a hard error, on the one screen whose entire
--  purpose is to give a coordinator a way forward from a constraint refusal.
--  The refusal message came back and the restore offer never appeared.
--
--  ── WHY IT PASSED VERIFICATION ANYWAY ──
--
--  This is the ninth entry in CLAUDE.md's shape-not-substance register,
--  repeated exactly. `save_followup_section_c` was a security invoker calling a
--  security definer its caller could not EXECUTE; this is a security invoker
--  reading a table its caller cannot SELECT. Same shape, same reason it
--  survived: **a privilege check does not fire for the owner.**
--
--  0107 was tested as all five roles -- but only `restore_person` was. The
--  CANDIDATE functions were tested through the MCP, which connects as the
--  owner, where the join to `auth.users` is unremarkable. The half that was
--  role-tested worked. The half that was not was completely broken.
--
--  Found by driving the actual screen: filling the completion form with a
--  soft-deleted national ID produced the duplicate error and no restore panel.
--
--  ── THE FIX ──
--
--  A SECURITY DEFINER helper that resolves one uuid to one display name, and
--  nothing else. The candidate functions stay SECURITY INVOKER, so RLS still
--  decides whether the caller may see the person at all; only the name lookup
--  is elevated.
--
--  `app_user.full_name` first, because a colleague's NAME is what makes a
--  deletion recognisable -- an email is a fallback, not the answer. `auth.users`
--  is read inside the definer where it is allowed.
--
--  ── WHY EXPOSING THIS IS NOT A LEAK ──
--
--  It returns the display name of a STAFF user, and only for a uuid the caller
--  already holds from a row they were permitted to read. It cannot enumerate:
--  an unknown uuid returns null, the same as a known one with no name. Staff
--  names are not protected data here -- 05 section 6 protects PARTICIPANT
--  identifiers, and this touches none.
--
--  It is granted to `authenticated` and NOT to `anon`, so no public page can
--  reach it.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.actor_display_name(p_actor uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  -- app_user.full_name is the readable answer; the auth email is the fallback
  -- for an actor with no app_user row (a service-role or seeded write). Null
  -- for an unknown uuid, which the caller renders as "the record does not say".
  select coalesce(
    (select nullif(btrim(au.full_name), '') from app_user au where au.id = p_actor),
    (select u.email from auth.users u where u.id = p_actor)
  );
$function$;

comment on function public.actor_display_name(uuid) is
  'One uuid to one staff display name, for provenance lines. SECURITY DEFINER '
  'because `authenticated` cannot read auth.users -- which is what broke both '
  'restore-candidate lookups in 0107. Returns a staff name only, never a '
  'participant identifier. See 0108.';

revoke all on function public.actor_display_name(uuid) from public, anon;
grant execute on function public.actor_display_name(uuid) to authenticated;

-- ── the two lookups, with the join replaced by the helper ───────────────────
--
-- grep -l "function public.person_restore_candidate" supabase/migrations/*.sql
--   -> 0107 only. Both bodies below are 0107's, with the `left join auth.users`
--      replaced by a call to actor_display_name and nothing else changed.

create or replace function public.person_restore_candidate(p_national_id text)
returns table(
  id            uuid,
  national_id   text,
  full_name     text,
  village       text,
  deleted_at    timestamptz,
  deleted_by    text
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
  -- `deleted_by` is a display name, not an id: the person confirming a restore
  -- needs to recognise a colleague. audit_log is the only place that records
  -- WHO soft-deleted a row -- `person` has created_by and no deleted_by -- so
  -- the most recent delete entry for this row is what names them.
  select p.id,
         p.national_id,
         p.full_name,
         p.village,
         p.deleted_at,
         (select actor_display_name(a.actor)
            from audit_log a
           where a.table_name = 'person'
             and a.row_id = p.id
             and a.action = 'delete'
           order by a.changed_at desc
           limit 1)
    from person p
   where p.national_id = regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g')
     and p.deleted_at is not null;
$function$;

create or replace function public.partner_restore_candidate(
  p_name text,
  p_unit text default null
)
returns table(
  id          uuid,
  name        text,
  unit        text,
  deleted_at  timestamptz,
  deleted_by  text
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
  select pr.id,
         pr.name,
         pr.unit,
         pr.deleted_at,
         (select actor_display_name(a.actor)
            from audit_log a
           where a.table_name = 'partner'
             and a.row_id = pr.id
             and a.action = 'delete'
           order by a.changed_at desc
           limit 1)
    from partner pr
   where btrim(pr.name) = btrim(coalesce(p_name, ''))
     -- The unique index treats a null unit and an empty unit as the same
     -- organisation, so the lookup has to as well or a refused save would find
     -- no candidate and look like a plain constraint error again.
     and coalesce(nullif(btrim(pr.unit), ''), '') = coalesce(nullif(btrim(coalesce(p_unit, '')), ''), '')
     and pr.deleted_at is not null;
$function$;

-- `create or replace` keeps the COMMENTs and GRANTs 0107 set on both, because
-- the signatures are unchanged. Re-granted anyway rather than assumed: that
-- assumption is exactly what this migration exists to correct.
grant execute on function public.person_restore_candidate(text) to authenticated;
grant execute on function public.partner_restore_candidate(text, text) to authenticated;
