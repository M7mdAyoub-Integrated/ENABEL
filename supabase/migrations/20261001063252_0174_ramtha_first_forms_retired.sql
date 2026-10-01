-- ═══════════════════════════════════════════════════════════════════════════
--  0174 — Ramtha's first forms retired: the seventeen indicator forms of
--         0122-0133 dropped, to be replaced by the seven forms of
--         RMTH_Forms_and_Calculations_v2.xlsx (0176 onward)
--
--  The municipality's owner replaced Ramtha's forms on 1 October 2026 with
--  the workbook, and asked, when told the old tables held only trial rows,
--  that they be DROPPED rather than kept beside the new ones. That is the
--  exception to CLAUDE.md hard rule 5 ("never drop table on anything holding
--  data") that OQ-60 recorded for Khalidiyah, made a second time and recorded
--  again (06_OPEN_QUESTIONS.md OQ-77, 09_MULTI_MUNICIPALITY.md Part 14). What
--  the tables held, counted on the day: 21 record rows and 91 option and
--  link rows under them, every one written between 14 and 16 September 2026
--  by the test accounts "Test Ramtha Admin" and "Test Super Admin" during the
--  build's own verification and the form audit (audit_log: 682 rows over the
--  23 tables). No reported figure: no Ramtha target is set and no quarter
--  has been returned (RAMTHA_REPORT.md section 3). Every row survives in
--  audit_log.
--
--  ── WHAT GOES ──
--
--  The 23 tables of 0125-0130 (records, entities, their option and link
--  junctions), the 17 leaf views of 0132, and the functions that served only
--  them: the save function, the person resolver, the option guard, the
--  reference issuer, and the derivations and kind guards. One DROP TABLE
--  statement names all 23, WITHOUT cascade: a dependency outside the list --
--  a view or a key nobody knew about -- stops the migration instead of
--  disappearing with it. The 106 option lists of 0122 go in 0175.
--
--  ── WHAT STAYS ──
--
--  - The framework (0131): objectives, activities, the 18 indicators and
--    their null targets. 0179 renames two codes and gives SO1-A1 its
--    statement, from the new workbook.
--  - rmth_threshold (0123) and its three readers (rmth_threshold_numeric,
--    _text, _bool): four of its definitions are still open in the new
--    workbook (0179 retires the rest).
--  - rmth_reference_counter, which is never reset: its spent numbers are
--    history (09 Part 7). The new forms take new prefixes.
--  - guard_rmth_other: eleven Khalidiyah tables check their "Other" columns
--    with it (0159-0160).
--  - The person rows the old forms created. `person` is shared and never
--    hard-deleted; a person is an entity (restored, never recreated).
--  - attachment_entity_type_known keeps the retired table names: two
--    soft-deleted attachment rows still name rmth_training_cycle (the
--    evidence test of 15 September), and an attachment row is never
--    hard-deleted. The names are harmless without their tables.
--
--  ── WHAT THE RUNNING APP READS IN BETWEEN ──
--
--  v_rmth_indicator_status and v_rmth_indicator_unique are read by EVERY
--  municipality's dashboard, so a missing one is an error on Sahel Horan's
--  and Khalidiyah's screens too. Each is recreated here with the same
--  columns, the same types, the same grants and no rows, until 0180 gives it
--  its new body.
--
--  ── v_indicator_actual ──
--
--  Recreated from its CURRENT definition (0163's, the last to touch it)
--  without the 17 Ramtha branches; the 41 Sahel Horan and Khalidiyah
--  branches are unchanged, and the migration asserts that every one of their
--  rows is identical against a copy taken at its start.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0174_actual_before on commit drop as
  select * from public.v_indicator_actual
   where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2');

-- ── 1. the aggregate view, without Ramtha ─────────────────────────────────
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
    -- Khalidiyah (0162, 0163)
    union all select 'IMP-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_imp_0
    union all select 'SO1-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so1_0
    union all select 'A1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a1
    union all select 'A2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a2
    union all select 'A3',    period_code, actual, denominator, municipality_id from public.v_ind_khld_a3
    union all select 'B1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_b1
    union all select 'SO2-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so2_0
    union all select 'C1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_c1
    union all select 'C2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_c2
    union all select 'D1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_d1
    union all select 'D2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_d2
    union all select 'SO3-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so3_0
    union all select 'E1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_e1
    union all select 'F1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f1
    union all select 'F2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f2
    union all select 'F3',    period_code, actual, denominator, municipality_id from public.v_ind_khld_f3
    union all select 'SO4-0', period_code, actual, denominator, municipality_id from public.v_ind_khld_so4_0
    union all select 'G1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_g1
    union all select 'G2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_g2
    union all select 'H1',    period_code, actual, denominator, municipality_id from public.v_ind_khld_h1
    union all select 'H2',    period_code, actual, denominator, municipality_id from public.v_ind_khld_h2
  ) x
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(municipality_id));

-- ── 2. the views over the old tables ───────────────────────────────────────
drop view public.v_rmth_indicator_status;
drop view public.v_rmth_indicator_unique;
drop view public.v_ind_rmth_imp_0, public.v_ind_rmth_so1_0, public.v_ind_rmth_a1_2, public.v_ind_rmth_a1_3,
  public.v_ind_rmth_b1, public.v_ind_rmth_b1_1, public.v_ind_rmth_b1_2, public.v_ind_rmth_so2_0,
  public.v_ind_rmth_c1, public.v_ind_rmth_c1_1, public.v_ind_rmth_c1_2, public.v_ind_rmth_so3_0,
  public.v_ind_rmth_e0_1, public.v_ind_rmth_e0_2, public.v_ind_rmth_e0_3, public.v_ind_rmth_f0_1,
  public.v_ind_rmth_f0_2;

-- ── 3. the 23 tables, in one statement, no cascade ────────────────────────
drop table
  rmth_enterprise, rmth_event, rmth_event_option, rmth_implementer_support, rmth_incubation_service,
  rmth_incubation_service_option, rmth_incubator, rmth_incubator_option, rmth_incubator_service_live,
  rmth_outcome_survey, rmth_outcome_survey_option, rmth_project_implementer, rmth_project_implementer_option,
  rmth_project_implementer_proposal, rmth_proposal, rmth_proposal_option, rmth_training_cycle,
  rmth_training_cycle_option, rmth_training_enrolment, rmth_training_enrolment_option, rmth_training_programme,
  rmth_training_programme_option, rmth_training_programme_proposal;

-- ── 4. the functions that served only the old tables ─────────────────────
drop function public.save_rmth_record(text, jsonb);
drop function public.rmth_ensure_person(jsonb);
drop function public.guard_rmth_option();
drop function public.rmth_assign_reference();
drop function public.rmth_next_reference(uuid, text, integer);
drop function public.rmth_event_parent_kind();
drop function public.rmth_proposal_first_approval();
drop function public.rmth_stamp_decision();
drop function public.rmth_training_cycle_programme_kind();
drop function public.rmth_training_enrolment_kind();

-- ── 5. the two views every dashboard reads, empty until 0180 ─────────────
create view public.v_rmth_indicator_status as
select null::uuid as municipality_id, null::text as code, null::text as full_code,
       null::text as reason, null::text[] as missing_keys
 where false;
create view public.v_rmth_indicator_unique as
select null::text as code, null::text as period_code, null::numeric as unique_actual, null::uuid as municipality_id
 where false;
revoke all on public.v_rmth_indicator_status, public.v_rmth_indicator_unique from public, anon;
grant select on public.v_rmth_indicator_status, public.v_rmth_indicator_unique to authenticated;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_n int;
begin
  -- Sahel Horan's and Khalidiyah's figures, every row, unchanged
  select count(*) into v_n from (
    (select * from _0174_actual_before
     except all
     select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2'))
    union all
    (select * from public.v_indicator_actual
      where municipality_id in ('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-8000-0000000000b2')
     except all
     select * from _0174_actual_before)) d;
  if v_n <> 0 then
    raise exception '0174: % Sahel Horan / Khalidiyah indicator rows changed', v_n;
  end if;
  if exists (select 1 from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-0000000000a1') then
    raise exception '0174: Ramtha rows remain in v_indicator_actual';
  end if;
  -- nothing of the old forms is left, and nothing kept was lost
  select count(*) into v_n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind in ('r', 'v') and (c.relname like 'rmth\_%' or c.relname like 'v\_ind\_rmth\_%');
  if v_n <> 2 then
    raise exception '0174: % rmth tables or views remain, expected rmth_reference_counter and rmth_threshold', v_n;
  end if;
  if to_regclass('public.rmth_reference_counter') is null or to_regclass('public.rmth_threshold') is null then
    raise exception '0174: a table that stays was dropped';
  end if;
  if to_regprocedure('public.guard_rmth_other()') is null or to_regprocedure('public.rmth_threshold_numeric(uuid, text)') is null
     or to_regprocedure('public.rmth_threshold_text(uuid, text)') is null or to_regprocedure('public.rmth_threshold_bool(uuid, text)') is null then
    raise exception '0174: a function that stays was dropped';
  end if;
  if (select count(*) from public.indicator i join public.municipality m on m.id = i.municipality_id where m.code = 'RMTH') <> 18 then
    raise exception '0174: the Ramtha framework lost an indicator';
  end if;
  -- the two views the dashboards read still answer
  perform 1 from public.v_rmth_indicator_status;
  perform 1 from public.v_rmth_indicator_unique;
end $verify$;
