# 06 — Open Questions

Decisions the source documents do not settle. **Do not guess any of these.** Each entry says what the source says, why it matters, what the database does in the meantime, and who decides.

Every one of these came out of a line-by-line comparison of the printed Action Plan, the Excel workbook and the results framework.

When a new conflict is found, add it here with the same shape. Do not resolve it in a code comment.

---

## Status key

| | |
|---|---|
| 🔴 | Blocks a number in the donor report |
| 🟠 | Affects the schema or the forms |
| 🟡 | Affects wording or presentation |

---

## 🔴 OQ-1 · C1.3 has no definition and no target

**What the source says.** The row `SHM-SO2-C1.3` — *Number of advisory mentorship sessions provided to the selected initiatives* — has a code, a name and a unit. Definition, method, formula, disaggregation, data source, all eight quarterly targets and the final target are all blank. The target cell says `TBD`.

**Why it matters.** It is one of the 20 indicators. It will appear on the dashboard and in the donor return with nothing behind it.

**Interim behaviour.** `mentorship_session` table exists and counts sessions. `indicator_target` rows are `null`. The dashboard must display **"not set"**, never `0`. A zero target reads as "we achieved 100%".

**Decides.** M&E lead, with Enabel.

**Needed.** A final target, and whether a session with one farmer counts the same as a session with a group.

### Added 26 Aug 2026 — is C1.3 the new advisory sessions, or mentorship on funded initiatives?

The platform has gained an **advisory stage**: a published session that a person applies to, sitting between training and market linkage. It is a new table, `advisory_session`, added in migration `0045`.

That raises a question C1.3 cannot answer for itself, because its definition is blank.

**The two readings are structurally different, not just differently worded:**

| | `mentorship_session` (what C1.3 counts today) | `advisory_session` (new) |
|---|---|---|
| Attached to | a `production_initiative` — `initiative_id` is **NOT NULL** | a person, via `advisory_enrolment` |
| Position in the flow | **downstream** of linkage: the producer must already have an initiative | **upstream** of linkage: it is the gate that unlocks it |
| Counts | sessions delivered | sessions delivered |

So they are not two names for one thing. `mentorship_session` is hand-holding for producers who already have a funded initiative; advisory is a step on the way to getting one.

The workbook name — *"provided to the selected initiatives"* — points at the mentorship reading. But the name is all there is, and "selected initiatives" may simply be loose wording.

**The question for the M&E lead:** *When the framework says "advisory mentorship sessions", does it mean the new advisory sessions people apply to, or mentorship delivered to initiatives that have already been selected for support?*

**Interim behaviour.** `v_ind_c1_3` still counts `mentorship_session` and was **deliberately not repointed**. Choosing would mean inventing an indicator definition, which CLAUDE.md rule 1 forbids. `advisory_session` is shaped so it could feed C1.3 later with no change to the table if the answer is the former.

---

## 🔴 OQ-2 · G0.2 arithmetic does not add up

**What the source says.** Target text: *"≥2 meetings per quarter."* Quarterly values: 0, 2, 2, 2, 2, 2, 2, 2. Final target: **14**.

**Why it matters.** Eight quarters at two per quarter is 16, not 14. The gap is 27/Q1, which is set to zero. So either the rule is wrong, or the first quarter is deliberately exempt, or the total is wrong.

**Interim behaviour.** Seed the quarterly values exactly as written and the final target as 14. Do not "correct" it to 16.

**Decides.** M&E lead.

---

## 🔴 OQ-3 · Three targets contradict their own deadline

**What the source says.**

| Indicator | Target text | Where the value actually sits |
|---|---|---|
| A1.2 | "≥4 partnerships by June 2027" | 2 in 27/Q2, 2 in **28/Q2** |
| C1.1 | "≥3 by June 2027" | 3 in **28/Q1** |
| C1.2 | "≥6 by June 2027" | 3 in 27/Q4, 3 in **28/Q4** |
| B1.1 | "1 operational office by Q1 2027" | 1 in **27/Q2** |

**Why it matters.** If the Council is told the target is June 2027, the plan will be judged against that date, but the quarterly schedule delivers half of it a year later. Either the narrative deadline or the schedule has to move.

**Interim behaviour.** Seed the quarterly schedule, because that is what the reporting is built on. Record the narrative deadline in `indicator.definition` so the conflict is visible.

**Decides.** M&E lead and the Coordinator.

---

## 🔴 OQ-4 · D0.1 points at the wrong form

**What the source says.** Data source: `Completion_form (training title = food processing … etc.)`. Indicator name: *Number of home-based and rural producers receiving guidance on food safety, licensing, packaging and related requirements.* Definition: *unique producers receiving municipal or partner guidance.*

**Why it matters.** Completing a training and receiving guidance are two different events. A producer can get licensing guidance at the counter without attending any course. Counting completions will understate the real figure, and it means the guidance work is invisible.

**Interim behaviour.** This schema gives D0.1 a dedicated `guidance_record` table. The Completion form is not used for it.

**Decides.** M&E lead.

**If they insist on the Completion form**, the formula becomes `count(distinct person_id)` from `training_enrolment` joined to `training_session` where the topic is in the food-processing set — and the `guidance_record` table becomes optional. Say so before changing it.

---

## 🔴 OQ-5 · E0.1 targets twelve events, the budget funds six

**What the source says.** Indicator: *rural markets and seasonal exhibitions organised **or co-organised***, target 12. Annexe 1: rural markets, JOD 2,000 × 6 = 12,000.

**Why it matters.** Either six events are expected to be hosted externally at no cost — plausible, since the Plan lists venues in Irbid such as King Abdullah II Gardens, the Chamber of Commerce and JUST — or there is a JOD 12,000 shortfall.

**Interim behaviour.** None available. **No field currently distinguishes an event the Municipality organised from one it co-organised**, so the twelve-event target cannot be reconciled against a budget that funds six until such a field is added. `E0.1` counts every documented, non-cancelled event that has ended, with no way to separate the two kinds. A column was added for this in `migration 0027` and removed again by `0029`; if this is taken forward, that migration is the reference for what to rebuild.

**Decides.** Coordinator, with the finance side.

**Note for comparison:** C1.2 targets six initiatives and the budget funds exactly six at JOD 3,000. That one reconciles. Use it as the model.

---

## 🟠 OQ-6 · "Completion criteria" is undefined

**What the source says.** A1.3 definition: *"Number of unique participants meeting the completion criteria (determin with municipality)"* — the typo is in the original.

**Why it matters.** A1.3 is the largest participant target in the plan, 120 people. The Completion form reduces the whole decision to one Yes/No box with no stated rule. Two different staff will answer it differently.

**Interim behaviour.** `training_enrolment.met_criteria` is a nullable boolean with `decided_on` and `decided_by`, so at least the decision is attributable.

**Decides.** Coordinator with the training providers.

**Needed.** A written rule. For example: attended at least 80% of sessions, and passed the practical assessment.

---

## 🟠 OQ-7 · B1 has no definition at all

**What the source says.** Definition, method, formula, disaggregation and data source are **all blank**. Only the name, the target of ≥70% and the timing survive.

**Why it matters.** It is an intermediate-result indicator with a target. It cannot be computed from a blank row.

**Interim behaviour.** The schema proposes: denominator is follow-up surveys where Q14 says the person used the office; numerator is those where Q16 says the advice was very or somewhat useful. Both questions already exist, so no new question is needed.

**Decides.** M&E lead — confirm or replace.

---

## 🟠 OQ-8 · Activity C has two different titles

**What the source says.**

- Printed Action Plan and its table of contents: *"Supporting Small-Scale and Family-Based Agricultural Initiatives Linked to **Local Crops**"*
- Excel workbook and results framework: *"…Linked to **Market Opportunity**"*

**Why it matters.** These are opposite strategies. *Local crops* is supply-led — grow what grows well here. *Market opportunity* is demand-led — grow what a buyer has asked for. The narrative text of the activity actually describes the second one, mapping processors' raw-material needs and quality benchmarks.

**Interim behaviour.** `activity.name_en` uses the market-opportunity wording, matching the workbook and the indicator definitions.

**Decides.** Coordinator.

---

## 🟠 OQ-9 · The four result-level rows have no targets

**What the source says.** `SHM-SO1-0`, `SO2-0`, `SO3-0`, `SO4-0` each carry a result statement, a definition and a disaggregation list — but the target is `TBD`, and the method and formula are both `-`.

**Why it matters.** The results layer is what a donor asks about at mid-term. Right now only outputs and two intermediate results are measurable.

**Interim behaviour.** Seed them in `objective.result_statement_en` as text. They are not in the `indicator` table because they cannot be computed.

**Decides.** M&E lead, with Enabel.

---

## 🟠 OQ-10 · G0.3 is two different indicators in one row

**What the source says.**

| Column | Content |
|---|---|
| Name | Number of **case studies** that demonstrate positive change |
| Definition | Number of unique residents and producers who receive a documented **referral or connection** |
| Method | Referral log |
| Formula | Number of unique people **referred or connected** |
| Disaggregation | Sex; age; refugee status; disability; service type |

**Why it matters.** The name says one thing; everything else says another. Four columns describe a referral indicator. As written, G0.3 cannot be measured — you do not know what to count.

Note also that follow-up Q5 offers *"Referral or connection to a partner or programme"* as a support type, which suggests referrals are tracked somewhere in the design. But no form records them.

**Interim behaviour.** The schema follows the **name** and provides `case_study`.

**Decides.** M&E lead.

**If referrals are the intent**, a `referral` table must be added — person, referred to which partner or programme, date, service type, outcome — and G0.3 becomes `count(distinct person_id)`.

---

## 🟠 OQ-11 · Targets stop a year early

**What the source says.** The workbook has target columns for `27/Q1` through `28/Q4` only — eight quarters. The Action Plan implementation period is **1 August 2026 to 1 September 2029**.

**Why it matters.** Roughly a third of the plan has no targets. IMP-0 in particular needs twelve-month follow-up cohorts, and its only target sits in 28/Q4, before the plan ends.

**Interim behaviour.** Create `reporting_period` rows for 26/Q3, 26/Q4, 29/Q1, 29/Q2 and 29/Q3 with **no** `indicator_target` rows. The dashboard shows "no target set".

**Decides.** M&E lead, with Enabel.

---

## 🔴 OQ-12 · No form collects refugee status or disability

**What the source says.** The disaggregation column requires refugee status and disability for **IMP-0, A1, A1.3, B1.2, C1, D0.1 and E0.2**. Neither `Completion_form` nor `Exhibition_Registration_form` has a field for either. Exhibition registration does not even collect sex or age.

**Why it matters.** This Action Plan exists because of an assessment on the inclusion of Syrian refugees in municipal services. Refugee disaggregation is the point of the programme, not a nice-to-have. Without these fields the inclusion story cannot be told, and seven indicators can be reported only as totals.

**Interim behaviour.** `person.is_refugee`, `person.has_disability`, `person.sex` and `person.date_of_birth` all exist. They will be null until the forms ask. Disaggregation views report a `not_recorded` bucket rather than dropping those people, so totals still reconcile.

**Decides.** Coordinator — this is a form change, and it may need a data-protection review.

**History [2026-08-24].** These fields were built onto both forms and then removed again the same day on the project owner's instruction. The database side needed nothing (`person.is_refugee`, `has_disability`, `nationality_id`, `disability_type_id` all pre-date this and remain in place); the front-end fields were reverted with the prototype restore, so this question is open again exactly as written above. One thing did survive the revert deliberately: `ref_disability_type` now holds six plain categories (seeing, hearing, mobility, memory or concentration, self-care, communication) rather than instrument-specific wording, per `migration 0028`. That matters here — **the source workbook names only "disability" as a disaggregation and specifies no measurement instrument.** If Enabel requires reporting against a particular one, the field will need to change accordingly. That is a live question for the M&E lead, not a task waiting to be done.

---

## 🟠 OQ-13 · Exhibition registration has no event field

**What the source says.** `Exhibition_Registration_form` contains: national ID, name, phone, products, producer type, first-time flag. There is **no reference to which exhibition**.

**Why it matters.** A registration that belongs to no event means no exhibitor list can be produced for E0.1 evidence, booth capacity cannot be managed, and follow-up Q30 has nothing to verify against.

**Interim behaviour.** `exhibition_registration.exhibition_id` is a required foreign key. This is a one-field addition to the form.

**Decides.** Nobody needs to — it is a defect. But tell the Coordinator the form is changing.

**History [2026-08-24].** Re-checked against the front-end prototype during a form-field round on this date, and worth recording because it changes what this question is actually about: the Exhibition dropdown is **already built and working in the prototype** — required, above National ID, with booths-free / Full / Already held handling correct. It survived the revert of that round untouched, because it was never part of it. The database side (`exhibition_registration.exhibition_id not null`) has been in place since `migration 0009`. So the gap this question describes is real **in the source workbook**, which is permanent and will not change, but is already closed in both the prototype and the database. What remains open is only the paperwork: the workbook sheet still needs updating for whoever works from it directly.

---

## 🟠 OQ-14 · G0.4 cannot be measured with the current forms

**What the source says.** Definition: *partners that have contributed to at least one documented activity, service, referral, training, market opportunity or other agreed contribution **during the reporting period***. Data source: `Partnership_form`.

**Why it matters.** The Partnership form records that a partnership exists. It records no date of activation and no contribution. So it cannot answer "did this partner contribute this period". Also, the same organisation can sit in both partner sheets and be counted twice.

**Interim behaviour.** One `partner` table plus a `partnership` table fixes the double count. A `partner_contribution` table makes the contribution recordable.

**Decides.** M&E lead — confirm what counts as a contribution.

---

## 🟡 OQ-15 · Terminology is inconsistent across documents

| Thing | Printed plan | Workbook / framework |
|---|---|---|
| Structure | **Pillar One–Four** | **Specific Objective 1–4** |
| Municipality | Sahel **Horan** | SVG says Sahel **Houran** |

No crosswalk exists in any source document.

**Interim behaviour.** Use **Sahel Horan**. Map Pillar N to SO N — the mapping is in `01_PROJECT_CONTEXT.md`. Store both labels on `objective` so either audience recognises it.

**Decides.** Coordinator, for the public-facing wording.

---

## 🟡 OQ-16 · Two dates for the implementation period

**What the source says.** Cover page: *1 August 2026 – 1 September 2029*. Annexe 1: *June 2026 – July 2029*.

**Interim behaviour.** Use the cover page. It is the version presented to the Council for approval.

**Decides.** Coordinator.

---

## 🟡 OQ-17 · Follow-up Q7 stem does not match its answers

**What the source says.** Q7 asks *"How useful was the training for your agricultural work?"* and offers *Very relevant / Somewhat relevant / Not very relevant / Not at all relevant*.

**Interim behaviour.** Store as written. Fix the wording when the form is built — either ask about relevance, or offer usefulness options.

**Decides.** M&E lead.

---

## 🟡 OQ-18 · National ID retention

**What the source says.** Nothing. The workbook collects a nine-digit national ID on three forms.

**Why it matters.** This is personal data under Jordanian law, held alongside refugee status, on an EU-funded project. There is no stated retention period, no stated lawful basis and no stated deletion rule.

**Interim behaviour.** The ID is stored, masked from `partner_viewer`, protected by RLS, and every read path is auditable.

**Decides.** Coordinator, with whoever handles data protection for the project. This should be settled before the system holds real records, not after.

---

## Summary

| Priority | Count | Codes |
|---|---|---|
| 🔴 Blocks a reported number | 6 | OQ-1, OQ-2, OQ-3, OQ-4, OQ-5, OQ-12 |
| 🟠 Affects schema or forms | 8 | OQ-6, OQ-7, OQ-8, OQ-9, OQ-10, OQ-11, OQ-13, OQ-14 |
| 🟡 Wording and policy | 4 | OQ-15, OQ-16, OQ-17, OQ-18 |
| 🟡 Recorded during Phase 6 | 2 | OQ-19, OQ-20 |
| 🟠 Public apply flow (Phase 6 step 4) | 2 | OQ-21 *(approved)*, OQ-22 *(resolved)* |
| 🟢 Eligibility (Phase 6 step 5) | 2 | OQ-23 *(resolved)*, OQ-24 *(fixed)* |
| 🔴 Reporting integrity | 2 | OQ-25, OQ-26 |

## 🟡 OQ-19 · Cancellation reasons are required for training and advisory, not for exhibitions

**What the code does.** `training_session` and `advisory_session` both carry `cancellation_reason` with a `check (not is_cancelled or cancellation_reason is not null)`. `exhibition` carries `is_cancelled` with **no** reason column and no such constraint.

**Why it looks like an oversight and is not.** Migration `0027` added `cancellation_reason` to `exhibition` with exactly that constraint. Migration `0029` removed it, with the rest of `0027`, at the project owner's explicit request — a scope decision, not a defect. When `0043` built the pattern for training and advisory it deliberately did **not** reinstate it on `exhibition`, because quietly reversing a deliberate removal inside an unrelated migration would hide the change.

**The consequence.** A cancelled training or advisory session states why. A cancelled exhibition does not, so E0.1 excludes it with no record of the reason.

**Decides.** Project owner.

**Needed.** Either reinstate `cancellation_reason` on `exhibition` for symmetry, or confirm the asymmetry is intended and close this.

---

## 🟡 OQ-20 · `ref_office_service_type` was invented, not taken from the workbook

**What the source says.** Nothing. The six categories seeded in `0016` were written by the project owner as a placeholder, not drawn from the Action Plan or the framework workbook:

| code | label |
|---|---|
| `technical_advice` | Technical advice |
| `input_guidance` | Input or equipment guidance |
| `licensing_help` | Licensing and paperwork help |
| `market_info` | Market or buyer information |
| `referral` | Referral to another entity |
| `other` | Other *(free text)* |

**Why it matters.** These are the categories the coordination office form will offer, and `office_service` is the sole source for **B1.2** — farmers and productive households reaching technical coordination office services. If a common reason for walking in has no category it lands under "Other", and the breakdown stops being useful. The count itself is unaffected: B1.2 counts distinct people, not categories.

**Gaps that stand out.** Nothing covers **licensing inspections**, **cooperative or association registration**, or **subsidy and grant applications** — all plausible reasons to visit an agricultural office, none a natural fit for the five named options.

**Interim behaviour.** The list is used as seeded. `other` allows free text, so nothing is lost — it accumulates in a free-text field instead of being categorised.

**Decides.** Municipal Coordinator, from what the front desk actually sees.

**Needed.** The real list. Once it exists, `is_active = false` retires a category without breaking rows that already reference it — never delete one.

---

## 🟠 OQ-21 · Throttle counters are hard-deleted, which departs from the no-delete rule

**What was built.** `applicant_lookup_throttle` (migration `0050`) counts attempts against the public applicant lookup in two scopes — per national ID, and per calling client. Rows are keyed by a **salted HMAC**, never the identifier itself.

**Where it departs from the standing rules.** Two places, both deliberate:

1. **No standard column block.** No `id`, no `created_by`, no `deleted_at`. The primary key is `(scope, key_hash, minute_bucket)`, because the row *is* the counter.
2. **Rows are hard-deleted.** Each call purges buckets older than the window plus five minutes.

**Why.** Rule 2 exists so programme data stays auditable for the donor. These rows are not programme data — no name, no national ID, no indicator input; only a hash and an integer. Retaining them forever would grow the table without bound **and** would build a permanent record of every lookup any member of the public ever attempted, which is worse for privacy than discarding it. `audit_log` is already an explicit carve-out from the deletion rule; this is a second one.

**What could change the answer.** If lookup attempts should be retained as a security log, this becomes an insert-only table with a retention policy rather than a purging one — a different design, not a tweak. Decide before the public form is live, because the choice is hard to reverse once real traffic has been discarded.

**Approved 26 August 2026 by the project owner.** Rule 2 exists to protect programme data; these rows are not that. The reasoning is now written into the rule itself in `CLAUDE.md`, alongside the `audit_log` carve-out, so the exception is documented rather than looking like a lapse.

**Decides.** Settled. Revisit only if a security-log retention requirement appears.

---

## 🟢 OQ-22 · A person with no date of birth cannot be found by the public lookup — RESOLVED

**The problem.** `applicant_prefill` (migration `0052`) verifies an applicant on **national ID + date of birth**. `person.date_of_birth` is **nullable**. A person whose DOB was never recorded cannot satisfy the check, receives the standard `{"found": false}`, and — unless the form stops them — registers again as a new person.

**Why it is expensive.** A duplicate `person` row inflates **A1.3**, **B1.2**, **D0.1** and **E0.2** permanently, because all four count distinct `person_id`. Merging duplicates afterwards means rewriting every enrolment that references the wrong row.

**Current state of the data.** All 4 people on file have a DOB, so nothing is broken today. The risk arrives with staff-entered records: the module 3 completion form creates people via find-or-create and does not require a DOB.

**What was NOT done, and why.** The lookup was not weakened to fall back on name matching — two people share a name, and that is how the `overview_counts` defect happened. Nor is the applicant told *why* the lookup failed, because "this ID exists but the date is wrong" is precisely the oracle the fixed `{"found": false}` exists to prevent.

**Interim behaviour.** The no-match branch of the public form does not offer "register as new" as its default action. It asks whether the applicant has taken part before; someone who says yes is directed to the Municipality office rather than allowed to self-register.

**Resolved 26 August 2026 by the project owner: options B and C together, not A.**

`date_of_birth` stays nullable. Making it NOT NULL would block staff who genuinely do not know a participant's birth date, and a required field that cannot be answered honestly gets filled with garbage — 01/01/1980 for everyone — which is worse than a null because it looks like data.

Three changes instead, in migration `0053`:

1. **Public self-registration requires a date of birth.** Anyone created through the public path always has one, so the gap can never grow from that direction. *(Enforced by the registration RPC, which is built with the application form in step 4. Not yet in place — the only part of this resolution still outstanding.)*

2. **The lookup accepts national ID + date of birth, OR national ID + phone when `date_of_birth` is null.** The rule is asymmetric on purpose:

   | on file | accepted |
   |---|---|
   | `date_of_birth` present | DOB only. A phone number is refused. |
   | `date_of_birth` null | phone only. |

   **No downgrade.** A person who has a DOB on file cannot be verified by phone, because otherwise knowing someone's phone number would bypass the stronger factor entirely. Verified: offering the correct phone for a person who has a DOB returns `{"found": false}`.

   Phones are matched on the **last nine digits** after stripping non-numerics, so `0791234567` and `+962791234567` are the same number. Storage is untouched.

   Failure is still one shared `{"found": false}` on both paths, so the caller cannot learn which factor a person has on file by watching which request succeeds.

3. **`v_person_missing_verification`** makes the existing gap visible to staff, with `verification_state`:
   - `phone_only` — no DOB, but a phone is on file, so they can still self-serve.
   - `cannot_self_serve` — neither factor. They must be helped at the office.

**Someone with neither factor cannot self-serve, and that is the correct outcome** rather than a gap to engineer around.

**Noted while implementing.** `person` carries `check (date_of_birth is not null or age_recorded is not null)`, so a person with no DOB always has a recorded age. Age is *not* usable as a verification factor — it changes every year and has roughly sixty possible values — so it does not help here, but it does mean the "no DOB" population is never entirely undated.

**Current state of the data.** All 4 live people have a date of birth; `v_person_missing_verification` returns zero rows.

### Closed 27 August 2026 — the loop is complete

Point 1 is implemented. `apply_for_opportunity` (migration `0054`) refuses to create a person without a date of birth:

```sql
if coalesce(btrim(p_full_name), '') = '' or p_date_of_birth is null then
  return c_fail;
end if;
```

Verified as `anon`: a registration attempt with no date of birth returned `cannot_verify` and **created no person row**. So the no-DOB population cannot grow through the public path, and `0053`'s phone fallback covers the people already in it.

Refused by the database, not by the form — the check is inside the security-definer RPC, which is the only way anon can write a person at all. Staff entry is unaffected and may still record an age instead of a birth date.

---

## 🟢 OQ-23 · Soft-deleting a training session silently removes a cohort's eligibility — RESOLVED

**What the code does.** `check_advisory_eligibility` (migration `0057`) copies the four conditions from `v_ind_a1_3`, one of which is `training_session.deleted_at is null`. So eligibility for market advisory depends on the SESSION still being live, not only the person's enrolment.

**The hazard.** A coordinator tidying up a duplicate or mistakenly-created `training_session` would remove advisory eligibility from **everyone who completed it**, with no warning and no visible connection between the two actions. The soft delete looks like housekeeping; the consequence lands weeks later when someone is refused.

**Why it is built this way anyway.** The alternative is worse: if the gate ignored the session filter, a person could be refused by A1.3 (not counted as trained) while the gate still treated them as trained. Two definitions of "completed a training", drifting apart, with the donor-facing one losing. That is the failure this project has already seen in `overview_counts`.

**What is NOT affected.** Advisory places already granted. The trigger fires at insert only and is never re-evaluated, so a later soft delete does not revoke anyone's existing enrolment. Verified.

**Resolved 27 August 2026: option A — warn, do not prevent.**

Preventing the deletion (option B) leaves a coordinator with a genuine mess and no path out. Duplicated sessions with enrolments on both is a real situation and this system has no merge. So the consequence is stated, the decision stays with the human, and the audit trigger records who made it. Same pattern as the existing linkage warning.

**`training_session_delete_impact(session_id)`** (migration `0061`) returns what the deletion would cost:

| field | meaning |
|---|---|
| `live_enrolments` | how many people are on the session at all |
| `completions` | how many completed it |
| **`eligibility_lost`** | **people who would be left with NO completed training anywhere** |
| `keep_existing_advisory` | of those, how many already hold an advisory place they would keep |

`eligibility_lost` is the number to put in front of a coordinator, and it is deliberately *not* `completions`. Someone with another completed training keeps their eligibility and loses nothing. On the current data, "Crop Practices" has 2 completions but only **1** person would actually lose eligibility — showing "2" would overstate the harm and train people to ignore the warning.

`security invoker`, so RLS applies and it cannot become a way to count participants without permission to read them.

**Remaining work:** wiring the confirmation step into the session delete path, which lands with the municipality screens in step 6.

---

## 🟢 OQ-24 · Unique constraints do not exclude soft-deleted rows — FIXED

**What was found.** `advisory_enrolment` has `unique (person_id, session_id)`, and `training_enrolment` has the equivalent. Neither excludes soft-deleted rows.

So **a soft-deleted enrolment permanently blocks that person from re-enrolling in that session.** Withdrawing someone and then re-adding them is impossible through any normal path; the insert fails on a row nobody can see. Found while testing `0057`, where a soft-deleted test enrolment blocked a legitimate re-insert.

**Why this matters beyond the annoyance.** The public form maps a unique violation to `already_applied` and reports success. Someone whose application was withdrawn would be told they had already applied, forever, and no screen would explain why.

**The fix, if wanted.** Replace each with a partial unique index:

```sql
create unique index <table>_person_session_live
  on <table> (person_id, session_id)
  where deleted_at is null;
```

**Fixed 27 August 2026 in migration `0059`.** The project owner settled the policy underneath it: **withdrawal is not a ban.** A withdrawn participant may re-apply; if a ban is ever needed that is a separate mechanism, not a side effect of soft delete.

**It was live, five times.** Five soft-deleted `training_enrolment` rows were already in the database, each permanently blocking its `(person, session)` pair. All five were test residue — two from Phase 4 module-3 testing on 26 August, three from step-4 testing on 27 August — but two of them blocked *real* demo pairs, including Demo Person One from "Livestock management". Verified fixed: that exact pair now re-enrols.

**The sweep found 35 unique indexes on soft-deletable tables. Only 5 were this bug.** Changing them all would have broken three separate things:

| | what | why |
|---|---|---|
| **Fixed (5)** | `training_enrolment`, `advisory_enrolment`, `exhibition_registration`, `followup_survey`, `partnership` | things a person takes part in, which can be withdrawn |
| **Left global** | `client_uuid` on six tables | it is the offline idempotency key — made partial, a re-syncing phone would **resurrect a withdrawn application** |
| **Left global** | `person.national_id`, `person.auth_user_id` | a deleted person must not free their ID: rule 6, one person one row. A deleted person is **restored**, not recreated |
| **Left global** | every `ref_*.code`, `milestone.code` | retired via `is_active`, never deleted — and the seeds' `on conflict (code)` needs a non-partial index to infer |
| **Flagged, not changed** | `partner (name, unit)` | same shape, different question: partnerships and contributions hang off a partner, so re-creating one under the same name **splits its history**. That is the person argument, not the enrolment argument — a judgement for the Coordinator |

**A1.3 confirmed unaffected.** Re-enrolling the previously-blocked pair *and* marking it complete left A1.3 at **3**, because it counts distinct people, not rows. A second *live* row for the same pair is still refused.

**The error mapping was fixed too** (`0060`). "Already applied" is now established by looking for a live application, not inferred from a constraint name. A `client_uuid` replay whose row was withdrawn returns a new `withdrawn` outcome instead — telling someone they have already applied when staff removed their application sends them away satisfied and wrong.

**`partner (name, unit)` settled 27 August 2026: keep it global, same as `person`.**

The project owner supplied the decisive reason. **G0.4 counts distinct partners with a contribution in the period.** Soft-delete a partner and recreate them under the same name, and the old contributions stop counting while the new ones attach to a different row — so a *historical quarter's G0.4 changes retroactively*. A reported figure moving after it was reported is worse than a constraint error.

The general rule, now in `CLAUDE.md` under rule 2: **an entity with history hanging off it is restored, never recreated; an event someone took part in can be re-entered.** `person` and `partner` are the first kind; enrolments, registrations and surveys are the second.

**Corollary, still to build:** when someone tries to create a person or partner whose key matches a soft-deleted row, the UI must offer **restore** rather than failing with a constraint error. Without that path the rule is correct and looks like a bug.

---

## 🔴 OQ-25 · Nothing protects a reported figure, because no period has ever been snapshotted

**The state today.** `indicator_snapshot` holds **0 rows**. All 13 reporting periods have `is_locked = false`. `snapshot_period()` exists, is coordinator-gated, refuses locked periods and honours `is_final` — and has never been called.

**What that means.** There is currently no such thing as a reported figure in this system. Every number on the dashboard is recomputed live from mutable data. Editing a completion, soft-deleting a session, soft-deleting or restoring a person — all silently rewrite history, including quarters that have already been sent to the donor.

This surfaced while working out whether *restoring a person* should warn about changing past figures. It should, but restore is one instance of a general property, not the problem itself.

**The fix is NOT to block writes to a closed quarter.** Corrections to closed periods are normal in M&E — a completion recorded late, a duplicate found in January that belongs to November. Blocking them prevents legitimate work and pushes people to edit around the system.

**The fix is:**

1. For a **locked** period, the dashboard shows the **snapshot**, not the live value.
2. Live recomputation continues underneath, as now.
3. **Surface the divergence deliberately** — *"reported 47, current data says 49"*. That reconciliation is exactly what a donor asks about, and a system that can answer it is more trustworthy than one that cannot drift at all.

**So the open question is a process one, not a schema one:** at what point does the coordinator snapshot and lock a quarter, and who decides? Two weeks after quarter end? On submission of the donor return? Can a locked quarter be reopened, and by whom?

**Decides.** M&E lead, with the Municipal Coordinator.

**Needed before.** The first donor return. Until a period is snapshotted and locked, any figure quoted from this system is a live recomputation and should be described that way in any handover.

---

## 🟠 OQ-26 · The Arabic indicator names are English text

**What was found.** `locales/ar/indicators.json` carries all 20 `name.*` keys, and **every value is the English string** — `"A1.3": "Unique participants completing a training"`. `indicator.name_ar` in the database is **NULL for all 20**.

**Why this is worse than a missing translation.** A missing key falls back visibly and shows up in the missing-key console warning the i18n setup already emits. A key present with English text passes every check — completeness tooling, the missing-key handler, a reviewer counting keys — while being untranslated. It is the same failure shape as the dead constraint names and the comments that claimed behaviour living elsewhere: it looks handled.

**Why it has not been fixed here.** D-3 in `08_FRONTEND_BUILD_PLAN.md` is explicit: a native speaker must review the Arabic, *especially* M&E terms — indicator, disaggregation, baseline, milestone. Machine-translating "Unique participants completing a training" would produce something that reads wrong to a Jordanian civil servant and, worse, would look finished. **Inventing M&E terminology is exactly what CLAUDE.md rule 7 forbids.**

**Where the translation should live.** `indicator.name_ar` already exists on the table and is the better home than a locale file: these are the framework's own wording, they must match the workbook, and they change only when the framework does. The locale file would then be redundant for names.

**Decides.** M&E lead, with a native Arabic speaker who knows the framework vocabulary. This is a translation task with a defined scope: 20 names, 20 definitions.

---

## 🟠 OQ-27 · Nobody tells applicants when an event is cancelled

**What happens now.** `v_public_opportunity` filters on `not is_cancelled`, so a cancelled training or market simply disappears from the public site. That is right for the listing — nobody needs to browse a cancelled market.

**What is missing.** If twenty-five producers had already applied, the system has their applications and says nothing to them. The event vanishes from their view with no explanation, and no screen tells staff who needs contacting.

**Where it belongs.** Not on a public page — on the participant list for the cancelled event, as a contact list: who applied, their phone numbers, and their application status at the moment of cancellation. The data is all there; nothing surfaces it.

**Not built.** Recorded so it is not discovered by a farmer arriving at a market that is not happening.

**Decides.** Municipal Coordinator — is contacting applicants a phone-call job from a printed list, or should the system record that they were told?

---

**Take OQ-12 to the Coordinator first.** It is the one that undermines the purpose of the programme, and it is a form change, not a database change.

Note: OQ-12 and OQ-13 were briefly marked resolved on 2026-08-24 when the form fields were built, then set back to open when that work was reverted the same day at the project owner's instruction. Each carries a **History** line recording what was built and what survived. Nothing about the underlying questions has changed.
