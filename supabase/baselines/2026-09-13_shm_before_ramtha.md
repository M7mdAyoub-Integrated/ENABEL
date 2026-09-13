# Sahel Horan baseline — captured 2026-09-13 12:34 UTC, before any Ramtha work

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0110`, the last
migration before multi-tenancy. **Every figure below must read the same at the end of the
Ramtha work.** The check at the end re-runs the same three queries and diffs.

## The 20 indicators, every period (`v_indicator_actual`)

Columns are the 13 periods in order: 26/Q3 · 26/Q4 · 27/Q1 · 27/Q2 · 27/Q3 · 27/Q4 ·
28/Q1 · 28/Q2 · 28/Q3 · 28/Q4 · 29/Q1 · 29/Q2 · 29/Q3.
`∅/0` is a percentage indicator with a null actual and a zero denominator — not 0%.

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

260 rows. Produced by:

```sql
select string_agg(line, E'\n' order by code) from (
  select code, code || ' | ' || string_agg(coalesce(actual::text,'∅')
         || case when denominator is not null then '/'||denominator::text else '' end,
         ' | ' order by period_code) as line
  from public.v_indicator_actual group by code) s;
```

## Whole-view hashes

| view | rows | md5 of every row, sorted |
|---|---|---|
| `v_indicator_actual` | 260 | see matrix above |
| `v_indicator_disaggregated` | 7 | `5b35f60334e9c139742d39b5ccb2af1e` |
| `v_indicator_progress` | 260 | `d60f7357f8cea0f70a5f9c3182b490b6` |

```sql
select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_disaggregated t;
select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_progress t;
```

**Note for the end-of-work check.** Adding `municipality_id` to a table changes `t::text`
for any view that selects `*` from it, so these two hashes are expected to change *if and
only if* the view's column list changes. If they differ at the end, the comparison falls
back to the projection of the original columns — the diff must be explained, not waved
through.

## Row counts, every table (live / soft-deleted; `-` = no `deleted_at`)

```
activity 7/-            advisory_enrolment 1/1    advisory_session 2/0
app_user 6/-            applicant_lookup_secret 1/-   applicant_lookup_throttle 2/-
attachment 0/0          audit_log 1515/-          case_study 1/0
coordination_meeting 1/0   coordination_meeting_partner 1/-
exhibition 2/1          exhibition_registration 2/0   exhibition_registration_product 0/-
followup_answer 0/-     followup_answer_option 0/-    followup_buyer_connection 0/-
followup_safety_item 0/-   followup_survey 0/0     guidance_record 2/1
indicator 20/-          indicator_snapshot 0/-    indicator_target 260/-
linkage_request 1/1     market_linkage 2/0        mentorship_session 2/1
milestone 2/0           objective 5/-             office_service 1/3
partner 3/3             partner_contribution 2/1  partnership 3/2
partnership_role 5/-    person 4/3                person_activity_type 0/-
production_initiative 1/0   promotional_action 2/0
ref_activity_type 5     ref_agri_involvement 6    ref_buyer_type 9
ref_compliance_obstacle 8   ref_disability_type 6   ref_guidance_type 6
ref_market_improvement 7    ref_nationality 4     ref_nonapply_reason 9
ref_office_service_type 6   ref_partner_role_production 10   ref_partner_role_training 12
ref_partner_type_production 9   ref_partner_type_training 8   ref_practice_change 9
ref_producer_type 9     ref_product 11            ref_promotional_channel 5
ref_safety_item 9       ref_sales_channel 11      ref_selling_barrier 8
ref_stakeholder_type 6  ref_stop_reason 9         ref_support_need 9
ref_survey_activity 7   ref_training_topic 6      reporting_period 13/-
training_enrolment 5/5  training_session 8/3
```

Catalogue: 66 tables · 32 views · 64 functions · 199 policies · 252 triggers · 12 enums.

`audit_log` will grow — it is insert-only and every verification write lands in it. Every
other count above must be the same at the end, except where the Ramtha work adds rows to
a table it is *documented* as adding to (`app_user`, `municipality` seeds).
