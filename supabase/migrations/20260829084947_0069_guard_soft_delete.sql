-- ═══════════════════════════════════════════════════════════════════════════
--  0069 — guard_soft_delete, which 05_ROLES_AND_RLS.md has specified since the
--         beginning and which was never created
--
--  ── THE GAP ──
--
--  Section 4 of 05 says only a coordinator may soft-delete, and gives the
--  trigger to do it. The function did not exist. No trigger referenced it.
--  Two people have now read that document as a description of the database.
--
--  Soft delete is an UPDATE that sets deleted_at, so the only thing standing in
--  front of it was the ordinary update policy. On `person` that is:
--
--    current_role() in ('coordinator','data_entry') or auth_user_id = auth.uid()
--
--  So a data_entry account could delete any person, partnership, session or
--  partner in the database. Deleting a person removes them from A1.3, B1.2,
--  D0.1, E0.2 and every disaggregation, retroactively, across every period they
--  appear in -- including quarters already reported to the donor. It is the
--  most destructive thing in the schema and it was the one restriction never
--  built.
--
--  Nothing has gone wrong because the data_entry account is a test fixture.
--  That is luck, not a control.
--
--  ── IT GUARDS RESTORE AS WELL AS DELETE ──
--
--  The condition is `is distinct from`, not `is not null`. Clearing deleted_at
--  brings a person back into every indicator just as setting it removed them,
--  and CLAUDE.md's "restored, never recreated" rule means restore is a path the
--  UI is meant to offer. A figure moving because someone was restored is the
--  same problem as one moving because someone was deleted.
--
--  ── ALL 40 TABLES, INCLUDING THE ref_* ONES ──
--
--  Attached by walking the catalogue rather than by naming tables, so it cannot
--  miss one through a typo. That has a cost: a table added later gets no guard,
--  and this migration will not say so. `check-soft-delete-guards.mjs` closes
--  that -- it fails the build when a table carrying deleted_at has no trigger,
--  which is a check on the substance rather than on this file having run.
--
--  The 18 ref_* tables are included deliberately. Retiring a reference row is
--  `is_active = false`; deleted_at on one of them breaks the joins inside the
--  indicator views, which is worse than deleting a single record, not better.
--
--  ── AND IT WILL REFUSE A PRIVILEGED CONNECTION ──
--
--  is_coordinator() is `coalesce(current_role() = 'coordinator', false)`, and
--  current_role() is null without a JWT. So this refuses a direct owner
--  connection exactly as guard_registration_status does -- see 05 section 12.
--  A migration, backfill or support script that soft-deletes anything must set
--  coordinator claims in the same transaction. That is the same trade already
--  accepted for registration status, and it is the right one: a guard that any
--  script can walk past is not a guard.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_soft_delete()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not public.is_coordinator() then
    raise exception
      'only a coordinator may delete or restore a record'
      using errcode = 'insufficient_privilege',
            hint = 'Soft delete and restore move historical indicator figures, '
                   'so they are a coordinator decision.';
  end if;
  return new;
end $function$;

comment on function public.guard_soft_delete() is
  'Only a coordinator may set or clear deleted_at. Specified in '
  '05_ROLES_AND_RLS.md section 4 and never built until 0069. Guards RESTORE as '
  'well as delete: clearing deleted_at moves the same indicator figures that '
  'setting it moved.';

-- Granted to nobody, per 05 section 11: a trigger does not consult EXECUTE
-- privilege, so a grant here would only create a second way to reach the guard.
revoke all on function public.guard_soft_delete() from public, anon, authenticated;

do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and exists (select 1 from pg_attribute a
                    where a.attrelid = c.oid
                      and a.attname = 'deleted_at'
                      and not a.attisdropped)
     order by c.relname
  loop
    execute format(
      'drop trigger if exists trg_%1$s_soft_delete on public.%1$I', r.relname);
    execute format(
      'create trigger trg_%1$s_soft_delete
         before update on public.%1$I
         for each row execute function public.guard_soft_delete()', r.relname);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
--  guard_person_immutable — the second thing 05 specifies and nothing built
--
--  Section 6 says a participant must never change their own national ID,
--  refugee status or disability status, because those drive disaggregation.
--
--  `national_id` is already covered, and covered MORE strictly than the spec:
--  guard_person_national_id allows only a coordinator, where the spec allows
--  any staff. That guard is left exactly as it is -- this function does not
--  touch national_id, because re-guarding it here at is_staff() would silently
--  loosen it.
--
--  What was genuinely unguarded: is_refugee, has_disability and auth_user_id.
--  person_update lets a participant update their own row, so all three were
--  self-editable. is_refugee and has_disability are disaggregation fields on
--  every indicator that breaks down by them; auth_user_id is which login owns
--  the row.
--
--  disability_type_id is included although the spec's list stops at
--  has_disability. It is the same field in two parts -- a row saying
--  has_disability with a type nobody in the Municipality entered is the same
--  self-reported disaggregation the rule exists to prevent. Recorded here
--  rather than assumed: if the Coordinator wants participants to be able to
--  state their own disability type, this line is the one to remove.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_person_immutable()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_staff() then
    if new.is_refugee         is distinct from old.is_refugee
    or new.has_disability     is distinct from old.has_disability
    or new.disability_type_id is distinct from old.disability_type_id
    or new.auth_user_id       is distinct from old.auth_user_id then
      raise exception
        'this field can only be changed by municipal staff'
        using errcode = 'insufficient_privilege',
              hint = 'Refugee and disability status drive indicator '
                     'disaggregation, so they are not self-reported.';
    end if;
  end if;
  return new;
end $function$;

comment on function public.guard_person_immutable() is
  'A participant may not change their own refugee status, disability status or '
  'auth_user_id. national_id is deliberately NOT re-guarded here -- '
  'guard_person_national_id already allows only a coordinator, which is '
  'stricter than 05 section 6 asks for.';

revoke all on function public.guard_person_immutable() from public, anon, authenticated;

create trigger trg_person_guard_immutable
  before update on public.person
  for each row execute function public.guard_person_immutable();
