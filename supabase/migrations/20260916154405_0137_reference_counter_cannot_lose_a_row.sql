-- 0137 · The reference counter cannot lose a row either
--
-- ── WHY ──
--
--  0109 attached `guard_no_hard_delete` to every table outside its cases 1
--  and 4 by walking pg_class, and 0111's `attach_standard_triggers` does the
--  same for each table it is given. `rmth_reference_counter` (0124) was
--  created without the standard block on purpose -- "counters, not programme
--  data: no standard block, no audit, no soft delete" -- and so went through
--  neither path. On 16 September 2026 the form audit's catalogue sweep found
--  it the only table in the schema that is neither rewritten by
--  delete-then-insert (case 1), nor the throttle (case 4), nor guarded.
--
--  RLS is on with zero policies, so no client role can reach a DELETE and
--  the grant list says so (05_ROLES_AND_RLS.md section 9, check 2, which
--  lists this table beside the two applicant_lookup tables as the third
--  where zero policies is the design). The owner can. And the row IS worth
--  guarding, even though it is not programme data: 09_MULTI_MUNICIPALITY.md
--  Part 10 records that a counter which has advanced must not be reset,
--  because the number it issued names a record -- RMTH-TC-2026-001 was a
--  probe, soft-deleted, and its number is spent. Deleting the counter row
--  is exactly a reset: `rmth_next_reference` would insert it afresh at 1 and
--  hand the probe's reference to the first real cycle. A reference that once
--  named one record must not name another.
--
-- ── WHAT CHANGES ──
--
--  One trigger, in 0111's naming. Nothing else: no audit trigger (the table
--  holds no programme data and no actor, and an audit row per issued
--  reference would double every Ramtha save's audit footprint for nothing),
--  no deleted_at (a soft-deleted counter row would still block the primary
--  key and make the next reference fail rather than repeat), no policy
--  (05 section 9: zero policies is stricter than any policy, and is the
--  design here).
--
--  `guard_no_hard_delete()` is 0109's function, unchanged: the owner with
--  `app.allow_hard_delete = 'on'` can still remove a row, which is the
--  sanctioned escape for cleaning a probe out.

create trigger trg_rmth_reference_counter_no_hard_delete
  before delete on public.rmth_reference_counter
  for each row execute function public.guard_no_hard_delete();

-- ── VERIFY: every table is now case 1, case 4, or guarded ────────────────
--
--  Case 1 is the eight 0109 junctions and the thirteen 0125 children, all
--  rewritten by delete-then-insert; case 4 is the throttle. Anything else
--  without the trigger is the omission this migration closes, and a table
--  added later without one fails here rather than waiting for a sweep.
do $$
declare
  v_missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into v_missing
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_trigger t
                      where t.tgrelid = c.oid
                        and t.tgname = 'trg_' || c.relname || '_no_hard_delete')
     and c.relname not in (
       'applicant_lookup_throttle',
       'exhibition_registration_product', 'person_activity_type',
       'partnership_role', 'coordination_meeting_partner',
       'followup_answer', 'followup_answer_option',
       'followup_safety_item', 'followup_buyer_connection',
       'rmth_event_option', 'rmth_implementer_support',
       'rmth_incubation_service_option', 'rmth_incubator_option',
       'rmth_incubator_service_live', 'rmth_outcome_survey_option',
       'rmth_project_implementer_option', 'rmth_project_implementer_proposal',
       'rmth_proposal_option', 'rmth_training_cycle_option',
       'rmth_training_enrolment_option', 'rmth_training_programme_option',
       'rmth_training_programme_proposal');
  if v_missing is not null then
    raise exception '0137: tables without a no-hard-delete guard: %', v_missing;
  end if;
end $$;
