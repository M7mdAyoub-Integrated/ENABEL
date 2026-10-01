-- ═══════════════════════════════════════════════════════════════════════════
--  0175 — Ramtha's first option lists dropped: the 106 ref_rmth_* tables of
--         0122 (613 options), which only the tables 0174 dropped read
--
--  The second half of 0174, the owner's decision of 1 October 2026 (OQ-77).
--  In its own migration for the reason 0154 gives: a table, its indexes and
--  its triggers each take a lock slot, and Khalidiyah's retirement ran out of
--  them (53200) dropping about 290 tables in one transaction. 106 lists fit
--  in one.
--
--  The lists are dropped by name, WITHOUT cascade, after a check that the
--  names are exactly the live ref_rmth_ tables: nothing outside the old forms
--  pointed at them (checked on 1 October 2026: no foreign key from any other
--  table, and the only views that read them were the leaf views 0174
--  dropped). 0176 creates the new forms' fourteen lists under new names where
--  the names differ, and under the same names (nationality, sector) where the
--  workbook kept the list's purpose.
-- ═══════════════════════════════════════════════════════════════════════════

do $check$
declare
  v_live text[];
  v_want text[] := array[
    'ref_rmth_a12_event_type', 'ref_rmth_a12_evidence', 'ref_rmth_a12_organised_by',
    'ref_rmth_a12_partner_type', 'ref_rmth_a13_delivered_by', 'ref_rmth_a13_evidence',
    'ref_rmth_a13_target_group', 'ref_rmth_a13_topic', 'ref_rmth_assessment_result',
    'ref_rmth_b11_developed_with', 'ref_rmth_b11_evidence', 'ref_rmth_b11_modality',
    'ref_rmth_b11_requirements_method', 'ref_rmth_b11_specialisation',
    'ref_rmth_b12_approving_body', 'ref_rmth_b12_decision', 'ref_rmth_b12_evidence',
    'ref_rmth_b12_submitter_type', 'ref_rmth_b12_support_requested', 'ref_rmth_b1_evidence',
    'ref_rmth_b1_implementer_type', 'ref_rmth_b1_operating_status', 'ref_rmth_b1_reached',
    'ref_rmth_c11_academic_contribution', 'ref_rmth_c11_academic_type', 'ref_rmth_c11_evidence',
    'ref_rmth_c11_joint_evidence', 'ref_rmth_c11_modality', 'ref_rmth_c11_private_contribution',
    'ref_rmth_c11_sector', 'ref_rmth_c12_employer_evaluation', 'ref_rmth_c12_evidence',
    'ref_rmth_c12_training_type', 'ref_rmth_e01_c1', 'ref_rmth_e01_c2', 'ref_rmth_e01_c3',
    'ref_rmth_e01_c4', 'ref_rmth_e01_evidence', 'ref_rmth_e01_field', 'ref_rmth_e01_host',
    'ref_rmth_e01_partner_role', 'ref_rmth_e01_service', 'ref_rmth_e01_status',
    'ref_rmth_e02_evidence', 'ref_rmth_e02_sector', 'ref_rmth_e02_service', 'ref_rmth_e02_stage',
    'ref_rmth_e02_status', 'ref_rmth_e03_delivered_by', 'ref_rmth_e03_evidence',
    'ref_rmth_e03_module', 'ref_rmth_e03_org_type', 'ref_rmth_f01_enterprise_status',
    'ref_rmth_f01_evidence', 'ref_rmth_f01_module', 'ref_rmth_f01_sector',
    'ref_rmth_f01_training_type', 'ref_rmth_f02_complete', 'ref_rmth_f02_content_basis',
    'ref_rmth_f02_developed_by', 'ref_rmth_f02_evidence', 'ref_rmth_f02_group',
    'ref_rmth_f02_level', 'ref_rmth_f02_material', 'ref_rmth_f02_module',
    'ref_rmth_f02_partner_type', 'ref_rmth_f02_sector', 'ref_rmth_imp0_capacity',
    'ref_rmth_imp0_criterion', 'ref_rmth_imp0_engaged', 'ref_rmth_imp0_pathway',
    'ref_rmth_imp0_round', 'ref_rmth_imp0_stop_reason', 'ref_rmth_imp0_verification',
    'ref_rmth_modality_ipob', 'ref_rmth_nationality', 'ref_rmth_project_type', 'ref_rmth_reached',
    'ref_rmth_sector', 'ref_rmth_so10_current_status', 'ref_rmth_so10_event_type',
    'ref_rmth_so10_evidence', 'ref_rmth_so10_other_step', 'ref_rmth_so10_threshold',
    'ref_rmth_so10_verifiable_step', 'ref_rmth_so20_arrangement', 'ref_rmth_so20_facilitated_by',
    'ref_rmth_so20_obstacle', 'ref_rmth_so20_outcome', 'ref_rmth_so20_placement_type',
    'ref_rmth_so20_verification', 'ref_rmth_so20_working_time', 'ref_rmth_so2c1_evidence',
    'ref_rmth_so2c1_headline', 'ref_rmth_so2c1_support_way', 'ref_rmth_so2c1_why_not',
    'ref_rmth_so30_criterion', 'ref_rmth_so30_income_change', 'ref_rmth_so30_role',
    'ref_rmth_so30_sector', 'ref_rmth_so30_stop_reason', 'ref_rmth_so30_support',
    'ref_rmth_so30_verification', 'ref_rmth_support_component', 'ref_rmth_support_rating',
    'ref_rmth_vulnerability'
  ];
begin
  -- compared in one collation: relname sorts as "C", text in the database's locale
  select array_agg(c.relname::text collate "C" order by c.relname::text collate "C") into v_live
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'ref\_rmth\_%';
  if v_live is distinct from (select array_agg(x collate "C" order by x collate "C") from unnest(v_want) x) then
    raise exception '0175: the live ref_rmth_ tables are not the 106 of 0122';
  end if;
end $check$;

drop table
  ref_rmth_a12_event_type, ref_rmth_a12_evidence, ref_rmth_a12_organised_by,
  ref_rmth_a12_partner_type, ref_rmth_a13_delivered_by, ref_rmth_a13_evidence,
  ref_rmth_a13_target_group, ref_rmth_a13_topic, ref_rmth_assessment_result,
  ref_rmth_b11_developed_with, ref_rmth_b11_evidence, ref_rmth_b11_modality,
  ref_rmth_b11_requirements_method, ref_rmth_b11_specialisation, ref_rmth_b12_approving_body,
  ref_rmth_b12_decision, ref_rmth_b12_evidence, ref_rmth_b12_submitter_type,
  ref_rmth_b12_support_requested, ref_rmth_b1_evidence, ref_rmth_b1_implementer_type,
  ref_rmth_b1_operating_status, ref_rmth_b1_reached, ref_rmth_c11_academic_contribution,
  ref_rmth_c11_academic_type, ref_rmth_c11_evidence, ref_rmth_c11_joint_evidence,
  ref_rmth_c11_modality, ref_rmth_c11_private_contribution, ref_rmth_c11_sector,
  ref_rmth_c12_employer_evaluation, ref_rmth_c12_evidence, ref_rmth_c12_training_type,
  ref_rmth_e01_c1, ref_rmth_e01_c2, ref_rmth_e01_c3, ref_rmth_e01_c4, ref_rmth_e01_evidence,
  ref_rmth_e01_field, ref_rmth_e01_host, ref_rmth_e01_partner_role, ref_rmth_e01_service,
  ref_rmth_e01_status, ref_rmth_e02_evidence, ref_rmth_e02_sector, ref_rmth_e02_service,
  ref_rmth_e02_stage, ref_rmth_e02_status, ref_rmth_e03_delivered_by, ref_rmth_e03_evidence,
  ref_rmth_e03_module, ref_rmth_e03_org_type, ref_rmth_f01_enterprise_status, ref_rmth_f01_evidence,
  ref_rmth_f01_module, ref_rmth_f01_sector, ref_rmth_f01_training_type, ref_rmth_f02_complete,
  ref_rmth_f02_content_basis, ref_rmth_f02_developed_by, ref_rmth_f02_evidence, ref_rmth_f02_group,
  ref_rmth_f02_level, ref_rmth_f02_material, ref_rmth_f02_module, ref_rmth_f02_partner_type,
  ref_rmth_f02_sector, ref_rmth_imp0_capacity, ref_rmth_imp0_criterion, ref_rmth_imp0_engaged,
  ref_rmth_imp0_pathway, ref_rmth_imp0_round, ref_rmth_imp0_stop_reason, ref_rmth_imp0_verification,
  ref_rmth_modality_ipob, ref_rmth_nationality, ref_rmth_project_type, ref_rmth_reached,
  ref_rmth_sector, ref_rmth_so10_current_status, ref_rmth_so10_event_type, ref_rmth_so10_evidence,
  ref_rmth_so10_other_step, ref_rmth_so10_threshold, ref_rmth_so10_verifiable_step,
  ref_rmth_so20_arrangement, ref_rmth_so20_facilitated_by, ref_rmth_so20_obstacle,
  ref_rmth_so20_outcome, ref_rmth_so20_placement_type, ref_rmth_so20_verification,
  ref_rmth_so20_working_time, ref_rmth_so2c1_evidence, ref_rmth_so2c1_headline,
  ref_rmth_so2c1_support_way, ref_rmth_so2c1_why_not, ref_rmth_so30_criterion,
  ref_rmth_so30_income_change, ref_rmth_so30_role, ref_rmth_so30_sector, ref_rmth_so30_stop_reason,
  ref_rmth_so30_support, ref_rmth_so30_verification, ref_rmth_support_component,
  ref_rmth_support_rating, ref_rmth_vulnerability;

do $verify$
begin
  if exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
              where s.nspname = 'public' and c.relname like 'ref\_rmth\_%') then
    raise exception '0175: ref_rmth_ tables remain';
  end if;
end $verify$;
