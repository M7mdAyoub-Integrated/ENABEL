-- ═══════════════════════════════════════════════════════════════════════════
--  0153 — Khalidiyah's first forms retired: the 21 indicator forms of
--         0141-0152 dropped, to be replaced by the 24 forms of
--         Khaldia_2_reviewed.xlsx (0156 onward)
--
--  The municipality's owner replaced the forms on 26 September 2026 with the
--  reviewed workbook, and decided that the old tables are DROPPED, not
--  retired beside the new ones. That is an exception to CLAUDE.md hard rule
--  5 ("never drop table on anything holding data"), and it is recorded there
--  and in 09_MULTI_MUNICIPALITY.md Part 13 as the owner's decision. What the
--  tables held, counted on the day: about one record per form and the rows
--  under them, every one written on 21-22 September 2026 by the Khalidiyah
--  admin account during the build's own verification (KHALIDIYAH_REPORT.md
--  section 7; audit_log: 275 inserts, one actor). No programme data:
--  Khalidiyah's plan period had not started.
--
--  ── WHAT GOES ──
--
--  The 50 tables of 0145-0147 (records, entities, junctions, count cells,
--  the milestone catalogue and rules), the 21 leaf views and the milestone
--  quarter view of 0150, and the functions that only served them (the save
--  function, the entity resolvers, the milestone and attendance figures,
--  the guards and the derivations). One DROP TABLE statement names all 50,
--  WITHOUT cascade: a
--  dependency outside the list -- a view or a key nobody knew about --
--  stops the migration instead of disappearing with it.
--
--  The 238 option lists of 0141-0143 and 0145 go in 0154 and 0155, half
--  each: dropped here with the tables, the one transaction ran out of lock
--  slots (53200, max_locks_per_transaction) -- a table, its indexes and its
--  triggers each take one, and this was about 290 tables. Found by running
--  the migration first with a raise at the end, which rolled it back.
--
--  ── WHAT STAYS ──
--
--  - The framework (0149): objectives, activities, the 21 indicators, their
--    null quarterly targets and the plan's own targets. The reviewed
--    workbook's framework sheet is the same one (0162 updates the formulas
--    and SO2-C2's name).
--  - The person rows the old forms created. `person` is shared and never
--    hard-deleted; a person is an entity (restored, never recreated).
--  - khld_reference_counter (0144), which is never reset: the new forms
--    continue their series.
--  - khld_ensure_person, khld_person_lookup (replaced in 0161),
--    khld_assign_reference, khld_next_reference, khld_stamp_recorded,
--    guard_khld_option (read by the new junctions) and the age helpers of
--    0139.
--  - attachment_entity_type_known keeps the retired table names: one
--    soft-deleted attachment row still names khld_coordination_meeting
--    (the evidence test of 22 September), and an attachment row is never
--    hard-deleted. The names are harmless without their tables; the
--    evidence function stops offering them (redeployed with 0158).
--
--  ── WHAT THE RUNNING APP READS IN BETWEEN ──
--
--  v_khld_indicator_status, v_khld_indicator_unique and v_public_khld_
--  whats_on are read by EVERY municipality's dashboard and by the public
--  page, so a missing one is an error on Sahel Horan's and Ramtha's screens
--  too. Each is recreated here with the same columns, the same types, the
--  same grants and no rows, until 0163 gives it its new body.
--
--  ── v_indicator_actual ──
--
--  Recreated from its CURRENT definition (0150's, the last to touch it)
--  without the 21 Khalidiyah branches; the 37 Sahel Horan and Ramtha
--  branches are unchanged, and the migration asserts that every one of their
--  rows is identical against a copy taken at its start.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0153_actual_before on commit drop as
  select * from public.v_indicator_actual
   where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000a1');

-- ── 1. the aggregate view, without Khalidiyah ─────────────────────────────
create or replace view public.v_indicator_actual as
select code, period_code, actual, denominator, municipality_id
  from (
    select 'IMP-0'::text as code, period_code, actual, denominator, municipality_id from public.v_ind_imp_0
    union all select 'A1',   period_code, actual, denominator, municipality_id from public.v_ind_a1
    union all select 'A1.2', period_code, actual, denominator, municipality_id from public.v_ind_a1_2
    union all select 'A1.3', period_code, actual, denominator, municipality_id from public.v_ind_a1_3
    union all select 'B1',   period_code, actual, denominator, municipality_id from public.v_ind_b1
    union all select 'B1.1', period_code, actual, denominator, municipality_id from public.v_ind_b1_1
    union all select 'B1.2', period_code, actual, denominator, municipality_id from public.v_ind_b1_2
    union all select 'C1',   period_code, actual, denominator, municipality_id from public.v_ind_c1
    union all select 'C1.1', period_code, actual, denominator, municipality_id from public.v_ind_c1_1
    union all select 'C1.2', period_code, actual, denominator, municipality_id from public.v_ind_c1_2
    union all select 'C1.3', period_code, actual, denominator, municipality_id from public.v_ind_c1_3
    union all select 'D0.1', period_code, actual, denominator, municipality_id from public.v_ind_d0_1
    union all select 'D0.2', period_code, actual, denominator, municipality_id from public.v_ind_d0_2
    union all select 'E0.1', period_code, actual, denominator, municipality_id from public.v_ind_e0_1
    union all select 'E0.2', period_code, actual, denominator, municipality_id from public.v_ind_e0_2
    union all select 'F0.1', period_code, actual, denominator, municipality_id from public.v_ind_f0_1
    union all select 'G0.1', period_code, actual, denominator, municipality_id from public.v_ind_g0_1
    union all select 'G0.2', period_code, actual, denominator, municipality_id from public.v_ind_g0_2
    union all select 'G0.3', period_code, actual, denominator, municipality_id from public.v_ind_g0_3
    union all select 'G0.4', period_code, actual, denominator, municipality_id from public.v_ind_g0_4
    -- Ramtha (0132)
    union all select 'IMP-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_imp_0
    union all select 'SO1-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so1_0
    union all select 'A1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a1_2
    union all select 'A1.3',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_a1_3
    union all select 'B1',    period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1
    union all select 'B1.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1_1
    union all select 'B1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_b1_2
    union all select 'SO2-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so2_0
    union all select 'C1',    period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1
    union all select 'C1.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1_1
    union all select 'C1.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_c1_2
    union all select 'SO3-0', period_code, actual, denominator, municipality_id from public.v_ind_rmth_so3_0
    union all select 'E0.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_1
    union all select 'E0.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_2
    union all select 'E0.3',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_e0_3
    union all select 'F0.1',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_f0_1
    union all select 'F0.2',  period_code, actual, denominator, municipality_id from public.v_ind_rmth_f0_2
  ) x
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(municipality_id));

-- ── 2. the views over the old tables ───────────────────────────────────────
drop view public.v_public_khld_whats_on;
drop view public.v_khld_indicator_status;
drop view public.v_khld_indicator_unique;
drop view public.v_ind_khld_imp_0, public.v_ind_khld_so1_0, public.v_ind_khld_a1, public.v_ind_khld_a2,
  public.v_ind_khld_a3, public.v_ind_khld_b1, public.v_ind_khld_so2_0, public.v_ind_khld_c1, public.v_ind_khld_c2,
  public.v_ind_khld_d1, public.v_ind_khld_d2, public.v_ind_khld_so3_0, public.v_ind_khld_e1, public.v_ind_khld_f1,
  public.v_ind_khld_f2, public.v_ind_khld_f3, public.v_ind_khld_so4_0, public.v_ind_khld_g1, public.v_ind_khld_g2,
  public.v_ind_khld_h1, public.v_ind_khld_h2;
drop view public.v_khld_milestone_quarter;

-- ── 3. the 50 tables, in one statement, no cascade ────────────────────────
drop table
  khld_action_day, khld_action_day_count, khld_action_day_option, khld_activity, khld_activity_option,
  khld_attendance, khld_attendance_count, khld_campaign, khld_campaign_count, khld_campaign_option,
  khld_contribution, khld_contribution_option, khld_coordination_meeting, khld_coordination_meeting_count,
  khld_coordination_meeting_option, khld_enterprise, khld_enterprise_support, khld_enterprise_support_option,
  khld_guidance_completion, khld_guidance_completion_option, khld_interaction_survey, khld_interaction_survey_option,
  khld_market, khld_market_count, khld_market_option, khld_milestone_checklist_item, khld_milestone_item,
  khld_milestone_rule, khld_milestone_verification, khld_milestone_verification_count,
  khld_milestone_verification_option, khld_partner, khld_partner_survey, khld_partner_survey_option,
  khld_producer_survey, khld_producer_survey_option, khld_question_list, khld_user_feedback,
  khld_user_feedback_option, khld_user_feedback_rating, khld_vendor, khld_vendor_registration,
  khld_vendor_registration_option, khld_volunteer, khld_volunteer_option, khld_volunteer_participation,
  khld_volunteer_tracking, khld_volunteer_tracking_option, khld_works_item, khld_works_item_option;

-- ── 4. the functions that served only the old tables ─────────────────────
drop function public.save_khld_record(text, jsonb);
drop function public.khld_ensure_partner(jsonb);
drop function public.khld_ensure_enterprise(jsonb, uuid);
drop function public.khld_ensure_vendor(uuid);
drop function public.khld_milestone_status(uuid);
drop function public.khld_checklist_status(uuid, text);
drop function public.khld_attendance_figures(uuid);
drop function public.guard_khld_rules();
drop function public.guard_khld_guardian();
drop function public.guard_khld_milestone_child();
drop function public.guard_khld_milestone_rule();
drop function public.guard_khld_checklist_item();
drop function public.guard_khld_count();
drop function public.khld_derive_completion();
drop function public.khld_derive_support_types();

-- ── 5. the three views the running app reads, empty until 0163 ───────────
create view public.v_khld_indicator_status as
select null::uuid as municipality_id, null::text as code, null::text as full_code,
       null::text as reason, null::text as detail, null::text as milestone_code
 where false;
create view public.v_khld_indicator_unique as
select null::text as code, null::text as period_code, null::numeric as unique_actual, null::uuid as municipality_id
 where false;
create view public.v_public_khld_whats_on
with (security_invoker = false) as
select null::uuid as id, null::text as kind, null::text as title, null::date as on_date,
       null::text as time_from, null::text as time_to, null::text as place_en, null::text as place_ar,
       null::text as type_en, null::text as type_ar, null::text as description, null::text as municipality_slug
 where false;
revoke all on public.v_khld_indicator_status, public.v_khld_indicator_unique, public.v_public_khld_whats_on from public, anon;
grant select on public.v_khld_indicator_status, public.v_khld_indicator_unique to authenticated;
grant select on public.v_public_khld_whats_on to anon, authenticated;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_n int;
begin
  -- Sahel Horan's and Ramtha's figures, every row, unchanged
  select count(*) into v_n from (
    (select * from _0153_actual_before
     except all
     select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000a1'))
    union all
    (select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000a1')
     except all
     select * from _0153_actual_before)) d;
  if v_n <> 0 then
    raise exception '0153: % Sahel Horan / Ramtha indicator rows changed', v_n;
  end if;
  if exists (select 1 from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception '0153: Khalidiyah rows remain in v_indicator_actual';
  end if;
  -- nothing of the old forms is left, and nothing kept was lost
  select count(*) into v_n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r', 'v') and (c.relname like 'khld\_%' or c.relname like 'v\_ind\_khld\_%');
  if v_n <> 1 then
    raise exception '0153: % khld tables or views remain, expected khld_reference_counter alone', v_n;
  end if;
  if to_regclass('public.khld_reference_counter') is null then
    raise exception '0153: khld_reference_counter was dropped';
  end if;
  if to_regprocedure('public.khld_ensure_person(jsonb)') is null or to_regprocedure('public.guard_khld_option()') is null
     or to_regprocedure('public.khld_assign_reference()') is null then
    raise exception '0153: a function that stays was dropped';
  end if;
  if (select count(*) from public.indicator i join public.municipality m on m.id = i.municipality_id where m.code = 'KHLD') <> 21 then
    raise exception '0153: the Khalidiyah framework lost an indicator';
  end if;
  -- the three views the app reads still answer, as authenticated and (the public one) as anon
  perform 1 from public.v_khld_indicator_status;
  perform 1 from public.v_khld_indicator_unique;
  set local role anon;
  perform 1 from public.v_public_khld_whats_on;
  reset role;
end $verify$;
