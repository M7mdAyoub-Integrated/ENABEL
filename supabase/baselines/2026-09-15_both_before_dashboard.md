# Both municipalities' baseline — captured 2026-09-15 08:52 UTC, before the dashboard work

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0133`, before any of
the work `PLATFORM_AUDIT.md` asks for. **Every figure below must read the same at the end.**
The check at the end re-runs the same queries and diffs.

Sahel Horan's 20 lines are identical to `2026-09-13_shm_before_ramtha.md`, which is the
Ramtha work's own end-of-work claim holding two days later.

## Sahel Horan — the 20 indicators, every period (`v_indicator_actual`, `municipality_id` = SHM)

Columns are the 13 periods in order: 26/Q3 · 26/Q4 · 27/Q1 · 27/Q2 · 27/Q3 · 27/Q4 ·
28/Q1 · 28/Q2 · 28/Q3 · 28/Q4 · 29/Q1 · 29/Q2 · 29/Q3.
`∅/0` is a percentage indicator with a null actual and a zero denominator — not 0%.
`∅` alone (Ramtha only) is an indicator the view returns null for because a threshold is unset.

```
A1    | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
A1.2  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
A1.3  | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
B1    | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
B1.1  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
B1.2  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
C1    | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
C1.1  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
C1.2  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
C1.3  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
D0.1  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
D0.2  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
E0.1  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
E0.2  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
F0.1  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
G0.1  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
G0.2  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
G0.3  | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
G0.4  | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
IMP-0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
```

260 rows.

## Ramtha — the 17 indicators with a view, every period (`municipality_id` = RMTH)

```
A1.2  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
A1.3  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
B1    | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
B1.1  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
B1.2  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
C1    | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0 | ∅/0
C1.1  | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
C1.2  | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
E0.1  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
E0.2  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0
E0.3  | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
F0.1  | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
F0.2  | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
IMP-0 | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
SO1-0 | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
SO2-0 | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
SO3-0 | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅ | ∅
```

221 rows (17 × 13). `A1` (`RMTH-SO1-A1`) has no view and so no line here; it appears in
`v_indicator_progress` (234 rows = 18 × 13) with a null actual and `v_rmth_indicator_status`
gives it `reason = 'no_statement'`.

`v_rmth_indicator_status`, 18 rows:

```
A1     no_statement
C1.1   threshold_unset  {c11_max_weeks, c11_min_hours_per_week}
C1.2   threshold_unset  {c12_completion_rule}
E0.3   threshold_unset  {e03_completion_rule}
F0.1   threshold_unset  {f01_completion_rule}
F0.2   threshold_unset  {f02_counting_reading}
IMP-0  threshold_unset  {imp0_sustained_months}
SO1-0  threshold_unset  {so10_employability_threshold}
SO2-0  threshold_unset  {so20_self_employment_counts}
SO3-0  threshold_unset  {so30_income_months_of_six}
A1.2 A1.3 B1 B1.1 B1.2 C1 E0.1 E0.2   reason null
```

Produced by:

```sql
select m.code as muni, s.line from (
  select a.municipality_id, a.code, a.code || ' | ' || string_agg(coalesce(a.actual::text,'∅')
         || case when a.denominator is not null then '/'||a.denominator::text else '' end,
         ' | ' order by a.period_code) as line
  from public.v_indicator_actual a
  group by a.municipality_id, a.code) s
join public.municipality m on m.id = s.municipality_id
order by m.code, s.code;
```

## Whole-view hashes, per municipality

| view | muni | rows | md5 of every row, sorted |
|---|---|---|---|
| `v_indicator_actual` | SHM | 260 | `59eafe143eb80c8b7544f3786ee15f2c` |
| `v_indicator_actual` | RMTH | 221 | `7f4013e1737301544c8271ce8ccc92c6` |
| `v_indicator_progress` | SHM | 260 | `fdbbbd818f2da34653ad0720dd434b43` |
| `v_indicator_progress` | RMTH | 234 | `a108297fee4ae3a09e760607f24df900` |
| `v_indicator_disaggregated` | SHM | 7 | `208d1a04c22569ac7bb311f1f81c6868` |
| `v_indicator_disaggregated` | RMTH | 0 | — (no rows; the view is SHM-only by its `m.code = 'SHM'`) |
| `v_rmth_indicator_status` | RMTH | 18 | `50bccbbcb38f22de64f6a26ff6e5ef3f` |
| `v_rmth_indicator_unique` | RMTH | 39 | `661c10c777b42c3456a19929cdf8547b` |

```sql
select m.code, count(*), md5(string_agg(t::text, E'\n' order by t::text))
  from public.<view> t join public.municipality m on m.id = t.municipality_id group by m.code;
```

Every one of these was taken through the MCP, i.e. as the owner with no JWT, so the
`auth.uid() is null` branch of each view's gate is what admitted both municipalities.
That is the right connection for a *baseline* (it sees everything) and the wrong one for
any claim about what a signed-in user sees — `PLATFORM_AUDIT.md` §1.5.

## Row counts, every table (live / soft-deleted; `-` = no `deleted_at`)

```
activity 12/-  advisory_enrolment 1/1  advisory_session 2/0  app_user 8/-
applicant_lookup_secret 1/-  applicant_lookup_throttle 3/-  attachment 0/0  audit_log 2804/-
case_study 1/0  coordination_meeting 1/0  coordination_meeting_partner 1/-
exhibition 2/1  exhibition_registration 2/0  exhibition_registration_product 0/-
followup_answer 0/-  followup_answer_option 0/-  followup_buyer_connection 0/-
followup_safety_item 0/-  followup_survey 0/0  guidance_record 2/1
indicator 38/-  indicator_snapshot 0/-  indicator_target 494/-
linkage_request 1/1  market_linkage 2/0  mentorship_session 2/1  milestone 2/0
municipality 2/0  objective 9/-  office_service 1/3  partner 3/3  partner_contribution 2/1
partnership 3/2  partnership_role 5/-  person 4/3  person_activity_type 0/-
production_initiative 1/0  promotional_action 2/0  reporting_period 26/-
rmth_enterprise 0/0  rmth_event 0/0  rmth_event_option 0/-  rmth_implementer_support 0/-
rmth_incubation_service 0/0  rmth_incubation_service_option 0/-  rmth_incubator 0/0
rmth_incubator_option 0/-  rmth_incubator_service_live 0/-  rmth_outcome_survey 0/0
rmth_outcome_survey_option 0/-  rmth_project_implementer 0/0  rmth_project_implementer_option 0/-
rmth_project_implementer_proposal 0/-  rmth_proposal 0/0  rmth_proposal_option 0/-
rmth_reference_counter 0/-  rmth_threshold 10/0  rmth_training_cycle 0/0
rmth_training_cycle_option 0/-  rmth_training_enrolment 0/0  rmth_training_enrolment_option 0/-
rmth_training_programme 0/0  rmth_training_programme_option 0/-  rmth_training_programme_proposal 0/-
training_enrolment 5/5  training_session 8/3
```

The 26 `ref_*` and 106 `ref_rmth_*` tables carry the counts recorded in
`2026-09-13_shm_before_ramtha.md` and `0122` respectively; none has a soft-deleted row.

Catalogue: 198 tables · 52 views · 91 functions · 498 policies · 773 triggers · 12 enums.

## Accounts

Eight, as `PLATFORM_AUDIT.md` Part 5 lists them. One thing the audit did not record:
`superadmin@shm.test` was left with `acting_municipality_id` = RMTH, i.e. switched into
Ramtha, by the last session.

`audit_log` will grow — it is insert-only. Every other count above must be the same at the
end, except where a step is *documented* as changing one.
