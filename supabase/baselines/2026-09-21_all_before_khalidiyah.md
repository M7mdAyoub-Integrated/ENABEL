# Both municipalities' baseline — captured 2026-09-21, before the Khalidiyah work

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0137`, through the
MCP (owner, no JWT — the right connection for a baseline, the wrong one for any claim
about a signed-in user). **Every Sahel Horan and Ramtha figure below must read the same
at the end of the Khalidiyah work.** The check at the end re-runs the same queries.

## ⚠ This baseline is NOT the 16 September one, and the reason is not Khalidiyah

`2026-09-16_both_before_form_audit.md` was captured before the field-by-field form
audit. That audit session ended without cleaning up, committing or reporting. On
21 September its app changes and migrations `0136`–`0137` were found uncommitted
(committed as `20a9959`, unchanged) and its probe data was found **live**. Nothing in
this file's divergence from 16 September was caused by the Khalidiyah session, and the
Khalidiyah session did not remove any of it — removing it changes a Sahel Horan or
Ramtha figure, which is the one thing the Khalidiyah brief says to stop for. It is
listed here row by row so the decision can be taken by whoever owns those figures.

### What is live that was not on 16 September

**Sahel Horan** (`municipality_id` `…005a`), all created by `a0000000-…-0001` on
16 September between 14:11 and 15:52 UTC:

| table | id | what | figure it touches |
|---|---|---|---|
| `person` | `4062dd93-…` | AUDIT Trainee One, `399000201` | — (enrolment deleted) |
| `person` | `d1c4c099-…` | AUDIT Producer Two, `399000202` | A1.3 (live enrolment), E0.2 (live registration) |
| `person` | `0433a01c-…` | AUDIT Visitor Three, `399000203` | C1.1 (initiative) |
| `person` | `87aed543-…` | AUDIT Trainee Four, `399000204` | — (enrolment deleted) |
| `person` | `b00f3ea6-…` | AUD Person c12, `399000301` | — (Ramtha probe person; Ramtha rows deleted) |
| `person` | `b6365864-…` | AUD Person so10, `399000302` | — |
| `person` | `ac36f533-…` | AUD Person e02, `399000303` | — |
| `person` | `4ec9e535-…` | AUD Person e03, `399000304` | — |
| `person` | `027caa21-…` | AUD Person f01, `399000305` | — |
| `person` | `73353953-…` | AUD Person imp0, `399000306` | — |
| `partner` | `6d384488-…` | AUDIT Partner Beta | (no partnership) |
| `partner` | `aa3950e4-…` | AUDIT Partner Alpha — **soft-deleted**, but its partnership `d450ead5-…` is live | A1.2, G0.4 |
| `partnership` | `d450ead5-…` | training, on the deleted partner above | A1.2 |
| `partnership_role` | ×2 | on `d450ead5-…` | A1.2 |
| `partner_contribution` | `d88f0aa3-…` | referral, 2026-09-10, "AUDIT referred three producers" | G0.4 |
| `training_session` | `b6a299e8-…` | "Food processing and preservation" (created by `resolveSession`) | D0.2 |
| `training_enrolment` | `31070621-…` | AUDIT Producer Two on session `4935e4b5-…` | A1.3 |
| `exhibition` | `5067cfec-…` | "AUDIT Market" — **soft-deleted** | — |
| `exhibition_registration` | `52a59f98-…` | AUDIT Producer Two on the **deleted** exhibition above — live child of a deleted parent | E0.2 (if the view does not filter the parent) |
| `exhibition_registration_product` | ×2 | on the registration above | — |
| `production_initiative` | `495b64c0-…` | "Pickled cucumbers", AUDIT Visitor Three | C1.1 |
| `production_initiative` | `a6473420-…` | "Olive oil", person `558c6edb-…` (pre-existing) | C1.1 |
| `market_linkage` | `b665bb8a-…`, `659ffa21-…` | both `proposed` | C1.2 (not counted while proposed) |
| `linkage_request` | `0684e182-…` | matched | — |
| `followup_survey` | `01760104-…` | **rejected**, person `558c6edb-…`, with 11 answers, 27 options, 9 safety items, 1 buyer connection | — (rejected) |
| `person_activity_type` | ×2 | on AUDIT persons | — |
| `milestone` | `ad2539d3-…` B1.1 | updated twice (achieved then un-achieved); reads `false` | B1.1 |

**Ramtha** (`…00a1`): every probe record was soft-deleted (`rmth_event 0/2`,
`rmth_outcome_survey 0/5`, …) except `rmth_enterprise` 1 live and `rmth_training_cycle`
2 live. `rmth_reference_counter` advanced from 2 rows to 9. **All ten `rmth_threshold`
rows were set** on 16 September 14:54–14:58 UTC by `735b2f87-…` with values such as
`AUD rule c12: attendance >= 75%, assessment Passed, job-ready Yes`, `imp0_sustained_months = 6`,
`c11_max_weeks = 12`, `so20_self_employment_counts = true`. Every Ramtha indicator that read
`∅` (threshold unset) on 16 September now reads `0`, and `v_rmth_indicator_status` reports
no `threshold_unset` at all. **These are probe values on the screen the M&E lead reads as
authoritative** — the open items Ramtha's Part 8 report said were unresolved now look
resolved. `decided_by` names the probe account.

What the figures show as a result, against the 15/16 September lines:

- Sahel Horan `E0.1` 26/Q3: **1 → 2**. (The AUDIT Market is deleted; the second
  counted exhibition needs identifying — not done here, not Khalidiyah's to change.)
- Ramtha `C1.1, C1.2, E0.3, F0.1, F0.2, IMP-0, SO1-0, SO3-0`: **∅ → 0**; `SO2-0`: **∅ → ∅/0**.
- Every other line identical.

## The indicator matrix (`v_indicator_actual`, both municipalities)

37 lines, ordered by municipality then code, one md5: **`c9d7dedc923819cf9a0b5164d47a38c1`**
(16 September: `c18e5dfd2bc65eaedbd2ded1935db17a`).

```
RMTH A1.2  | 0 ×13
RMTH A1.3  | 0 ×13
RMTH B1    | ∅/0 ×13
RMTH B1.1  | 0 ×13
RMTH B1.2  | 0 ×13
RMTH C1    | ∅/0 ×13
RMTH C1.1  | 0 ×13          ← was ∅
RMTH C1.2  | 0 ×13          ← was ∅
RMTH E0.1  | 0 ×13
RMTH E0.2  | 0 ×13
RMTH E0.3  | 0 ×13          ← was ∅
RMTH F0.1  | 0 ×13          ← was ∅
RMTH F0.2  | 0 ×13          ← was ∅
RMTH IMP-0 | 0 ×13          ← was ∅
RMTH SO1-0 | 0 ×13          ← was ∅
RMTH SO2-0 | ∅/0 ×13        ← was ∅
RMTH SO3-0 | 0 ×13          ← was ∅
SHM  A1    | ∅/0 ×13
SHM  A1.2  | 2 | 0 ×12
SHM  A1.3  | 3 | 0 ×12
SHM  B1    | ∅/0 ×13
SHM  B1.1  | 0 ×13
SHM  B1.2  | 1 | 0 ×12
SHM  C1    | ∅/0 ×13
SHM  C1.1  | 1 | 0 ×12
SHM  C1.2  | 1 | 0 ×12
SHM  C1.3  | 2 | 0 ×12
SHM  D0.1  | 2 | 0 ×12
SHM  D0.2  | 2 | 0 ×12
SHM  E0.1  | 2 | 0 ×12      ← was 1
SHM  E0.2  | 1 | 0 ×12
SHM  F0.1  | 2 | 0 ×12
SHM  G0.1  | 0 ×13
SHM  G0.2  | 1 | 0 ×12
SHM  G0.3  | 1 | 0 ×12
SHM  G0.4  | 2 | 0 ×12
SHM  IMP-0 | ∅/0 ×13
```

```sql
with lines as (
select m.code as muni, s.line from (
  select a.municipality_id, a.code, a.code || ' | ' || string_agg(coalesce(a.actual::text,'∅')
         || case when a.denominator is not null then '/'||a.denominator::text else '' end,
         ' | ' order by a.period_code) as line
  from public.v_indicator_actual a
  group by a.municipality_id, a.code) s
join public.municipality m on m.id = s.municipality_id)
select md5(string_agg(line, E'\n' order by muni, line)), count(*) from lines;
```

## Whole-view hashes, per municipality — the seven

| view | muni | rows | md5 of every row, sorted | 16 Sept |
|---|---|---|---|---|
| `v_indicator_actual` | SHM | 260 | `0bad6f26962d8998efc8aa04793432ef` | `59eafe14…` |
| `v_indicator_actual` | RMTH | 221 | `7a7e1045da6bb9b73966081b8eb25dbe` | `7f4013e1…` |
| `v_indicator_progress` | SHM | 260 | `159873873f04e7e456bf9bcb4871200c` | `fdbbbd81…` |
| `v_indicator_progress` | RMTH | 234 | `80111f91cd0850ac657ba5ffd4f690c2` | `a108297f…` |
| `v_indicator_disaggregated` | SHM | 7 | `208d1a04c22569ac7bb311f1f81c6868` | same |
| `v_rmth_indicator_status` | RMTH | 18 | `1edea0a1c10df16a9448136429019ad7` | `50bccbbc…` |
| `v_rmth_indicator_unique` | RMTH | 39 | `661c10c777b42c3456a19929cdf8547b` | same |

```sql
select m.code, count(*), md5(string_agg(t::text, E'\n' order by t::text))
  from public.<view> t join public.municipality m on m.id = t.municipality_id group by m.code;
```

These seven, at these values, are what the Khalidiyah work must leave alone. Khalidiyah's
own rows in these views (once it is seeded) are new rows under a third `municipality_id`;
the per-municipality hashes for SHM and RMTH are unaffected by them.

## Row counts, every non-`ref_` table (live / soft-deleted; `-` = no `deleted_at`)

```
activity 12/-  advisory_enrolment 1/1  advisory_session 2/1  app_user 8/-
applicant_lookup_secret 1/-  applicant_lookup_throttle 6/-  attachment 0/0  audit_log 3402/-
case_study 1/1  coordination_meeting 1/1  coordination_meeting_partner 1/-
exhibition 2/2  exhibition_registration 3/0  exhibition_registration_product 2/-
followup_answer 11/-  followup_answer_option 27/-  followup_buyer_connection 1/-
followup_safety_item 9/-  followup_survey 1/0  guidance_record 2/2
indicator 38/-  indicator_snapshot 0/-  indicator_target 494/-
linkage_request 2/1  market_linkage 4/0  mentorship_session 2/2  milestone 2/0
municipality 2/0  objective 9/-  office_service 1/4  partner 4/4  partner_contribution 3/3
partnership 4/2  partnership_role 7/-  person 14/3  person_activity_type 2/-
production_initiative 3/0  promotional_action 2/1  reporting_period 26/-
rmth_enterprise 1/0  rmth_event 0/2  rmth_event_option 8/-  rmth_implementer_support 2/-
rmth_incubation_service 0/1  rmth_incubation_service_option 6/-  rmth_incubator 0/1
rmth_incubator_option 4/-  rmth_incubator_service_live 2/-  rmth_outcome_survey 0/5
rmth_outcome_survey_option 28/-  rmth_project_implementer 0/1  rmth_project_implementer_option 2/-
rmth_project_implementer_proposal 1/-  rmth_proposal 0/1  rmth_proposal_option 4/-
rmth_reference_counter 9/-  rmth_threshold 10/0  rmth_training_cycle 2/2
rmth_training_cycle_option 9/-  rmth_training_enrolment 0/3  rmth_training_enrolment_option 12/-
rmth_training_programme 0/2  rmth_training_programme_option 12/-
rmth_training_programme_proposal 1/-  training_enrolment 6/7  training_session 9/4
```

One md5 over every `relname live/del` line, ordered by name:
- all tables: `0458bed4175fb909791c2b31c25f116f`
- every table except `audit_log`: `88386b122bb723913a030d97e429db22`

At the end, the Khalidiyah tables will be new lines (all at their post-cleanup counts)
and `municipality`, `objective`, `activity`, `indicator`, `indicator_target`,
`reporting_period`, `app_user` and `audit_log` will have grown by Khalidiyah's rows.
**Every other line must be identical.**

## Live bodies captured before any change (Part 1 of the plan)

Recorded so that every replacement starts from what is live, not from a migration file.

`age_band(p person)` — `sql stable`, invoker:
```sql
  select case
           when s.a is null then 'not_recorded'
           when s.a < 25    then '18-24'
           when s.a < 35    then '25-34'
           when s.a < 45    then '35-44'
           else '45+'
         end
  from (select coalesce(
                 date_part('year', age(p.date_of_birth::timestamp))::int,
                 p.age_recorded) as a) s;
```

`guard_person_immutable()` — trigger, **definer**. Guards `is_refugee`, `has_disability`,
`disability_type_id`, `auth_user_id` against non-staff. **Does not touch `national_id`.**

`guard_person_national_id()` — trigger, **definer**. This is where `national_id`
immutability lives:
```sql
  if new.national_id is distinct from old.national_id
     and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
    raise exception 'national_id cannot be changed';
  end if;
```
The plan's 2.1 names `guard_person_immutable` as the function to extend for `unhcr_number`;
the live schema says it is this one.

`guard_reserved_demo_national_id()` — `if new.national_id like '3000000__'` — a `NULL`
`national_id` makes the condition `NULL`, so the trigger passes. Confirmed by test in 2.1.

`person` constraints: `age_or_dob`, `national_id_format` (`~ '^[0-9]{9}$'`),
`person_national_id_key` UNIQUE, and `national_id` is `NOT NULL`. Triggers:
`trg_person_audit`, `trg_person_guard_immutable`, `trg_person_guard_national_id`,
`trg_person_no_hard_delete`, `trg_person_reserved_demo_range` (INSERT OR UPDATE OF
national_id), `trg_person_soft_delete`, `trg_person_updated`.

Functions whose body reads `national_id` (13): `applicant_prefill`, `apply_for_opportunity`,
`create_direct_linkage`, `followup_prefill`, `followup_prefill_for_staff`,
`guard_person_national_id`, `guard_reserved_demo_national_id`, `my_applications`,
`person_restore_candidate`, `request_linkage`, `restore_person`, `rmth_ensure_person`,
`start_followup`.

`attachment_entity_type_known`, verbatim:
```
CHECK ((entity_type = ANY (ARRAY['training_session'::text, 'training_enrolment'::text,
'exhibition'::text, 'exhibition_registration'::text, 'partnership'::text,
'production_initiative'::text, 'followup_survey'::text, 'coordination_meeting'::text,
'office_service'::text, 'guidance_record'::text, 'mentorship_session'::text,
'advisory_session'::text, 'milestone'::text, 'case_study'::text, 'rmth_event'::text,
'rmth_proposal'::text, 'rmth_training_programme'::text, 'rmth_training_cycle'::text,
'rmth_training_enrolment'::text, 'rmth_project_implementer'::text, 'rmth_incubator'::text,
'rmth_enterprise'::text, 'rmth_incubation_service'::text, 'rmth_outcome_survey'::text])))
```
24 entries. `supabase/functions/evidence/index.ts` carries the same list as `ENTITY_TABLES`.

`presign_upload` (edge function, `supabase/functions/evidence/index.ts` lines 197–235): reads
`municipality_id, deleted_at` from the entity table as the user, refuses `record_deleted`,
then `can_write()` and `evidence_usage()`. No per-table mapping beyond `ENTITY_TABLES`.

People under 18: **0**, including soft-deleted rows
(`coalesce(date_part('year', age(date_of_birth::timestamp))::int, age_recorded) < 18`).

## Checks run at the start

- `check_migration_files.sh`: 136 exact, 2 expected-divergent (0030, 0031), PASS
- `check_municipality_scope.sql`: PASS (no exception; both municipalities now hold
  records, so the empty-municipality assertion is skipped — it will apply to KHLD)
- `check_function_reversions.py`: 16 flags, the calibration count
- app: all seven `check-*.mjs`, `tsc -b`, `eslint --max-warnings=0`: PASS
- `git status`: clean at `20a9959` apart from the three Khalidiyah source files

## Compared 22 September 2026, after 0152 and the probe clean-up

Same queries, same connection. The 37-line matrix reads
`c9d7dedc923819cf9a0b5164d47a38c1` — identical. All seven per-municipality view
hashes identical (`0bad6f26…`, `7a7e1045…`, `15987387…`, `80111f91…`, `208d1a04…`,
`1edea0a1…`, `661c10c7…`); Khalidiyah's own rows are 273 in each of
`v_indicator_actual` and `v_indicator_progress`, under the third id. Every table's
counts identical except the growth this file predicted — `activity` 12→20,
`objective` 9→14, `indicator` 38→59, `indicator_target` 494→767, `reporting_period`
26→39, `municipality` 2→3, `app_user` 8→9, `audit_log` 3402→5128 — the new
`khld_*` and `indicator_plan_target` lines, and **`person` 14/3 → 14/5**: the two
probe people the Khalidiyah screens were driven with (`399000980`, `399000981`),
soft-deleted with their records as the Khalidiyah coordinator; the live count is
unchanged. `check_migration_files.sh`: exact=151, PASS.
