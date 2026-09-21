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

### Added 1 Sep 2026 — it now has a screen, and still no definition

`mentorship_session` rows are entered on the initiative's own detail screen
(`/initiatives/:id`), because `initiative_id` is NOT NULL and a central form
would open with a dropdown of every initiative in the programme.

**Nothing about this question changed.** The screen shows the live C1.3 figure
and renders its target as **"not set"**, never `0` — read off the screen in both
languages, not assumed. If the answer turns out to be `advisory_session`, the
screen moves; the table does not.

Verified while building it, as `data_entry` through RLS in a transaction that
rolled back: three sessions on ONE initiative moved C1.3 from 2 to 5. It counts
sessions, not people — the opposite of the three screens next to it — and the
panel says so in words rather than leaving it to be inferred from a family
resemblance.

### Added 1 Sep 2026, second pass — advisory now has a TRACK, and C1.3 still points elsewhere

`advisory_session.track` (`0105`) splits advisory into `market` and
`home_based`. That sharpens this question rather than answering it: the reading
where C1.3 means advisory now has to say WHICH track, and the two tracks are not
countable the same way. See **OQ-40**, which carries the full comparison.

`v_ind_c1_3` is unchanged and still counts `mentorship_session`. Repointing it
would answer this question in SQL and orphan the 2 live rows it counts today.

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

**Added 1 Sep 2026.** `guidance_record` now has a form of its own — module `gd`,
the guidance log — built the same way as the coordination office: national-ID
first, creating people through the one shared `resolvePerson` path, because
D0.1 counts distinct producers and a second creation path is how one producer
becomes two.

Verified as `data_entry` through RLS, in a transaction that rolled back: three
guidance records for one producer moved D0.1 by **one**; a second producer moved
it by one more; and a later record for a producer already counted moved nothing
and did not add them to the next quarter — `v_ind_d0_1` places a producer in the
quarter of their FIRST guidance, which is what makes the eight quarterly targets
sum to a final target of 40 distinct producers rather than to 40 visits.

**This does not answer the question.** If the M&E lead rules that the Completion
form is the source after all, the module goes and `v_ind_d0_1` is repointed.

**Added 1 Sep 2026, second pass.** A third candidate source now exists: a
home-based advisory session (`0105`), which covers food safety, licensing and
packaging — the same subjects as D0.1. `v_ind_d0_1` was NOT repointed, for the
same reason as OQ-1. See **OQ-40**, and note especially that D0.1 counts
DISTINCT PEOPLE while C1.3 counts SESSIONS, so the two advisory tracks cannot be
given one shared figure.

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

### Added 1 Sep 2026 — a log, and three sources that fill it themselves

`partner_contribution` now has a screen: a contributions log on the partnership
detail screen, because `partnership_id` is NOT NULL.

**Most of it should never be typed, and now is not.** Three parents write their
own contribution and stamp its provenance in `entity_type`/`entity_id`:

| source | when | migration |
|---|---|---|
| `coordination_meeting_partner` | a partner attends a meeting | `0010` |
| `market_linkage` | the linkage is `active` or `ended` | `0101` |
| `training_session` | the session is marked delivered | `0102` |

The reasoning is the project owner's: if staff must log by hand what the system
already knows, they will not, and G0.4 reads lower than the truth. **It already
did** — `0101`'s backfill moved 26/Q3 from **1 to 2**, because Demo Agro
Processing held an `active` market linkage dated inside the quarter and earned
no credit for it, while the only partner counted was the university that had
attended a meeting.

Derived rows are shown in the log, marked, and are **not editable there**: they
track their parent in both directions, so an edit would be overwritten the next
time the parent was touched. The screen names which parent each came from and
what would have to change to withdraw it.

**Still open, and unchanged:** the question above. "What counts as a
contribution" now has three concrete answers built in and a fourth
(hand-entered) left free, but nobody has confirmed that list is right. See
OQ-37 on which linkage statuses qualify.

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

Rebuilt 2026-08-31 from the headings in this file. It had stopped at OQ-30 and
was missing five entries, which is the sort of drift that makes a summary worse
than no summary — a reader counts nine reds and stops looking.

| Priority | Count | Codes |
|---|---|---|
| 🔴 Blocks a reported number | 13 | OQ-1, OQ-2, OQ-3, OQ-4, OQ-5, OQ-12, OQ-25, OQ-32, OQ-40, OQ-44, OQ-47, OQ-48, OQ-56 |
| 🟠 Affects the schema, the forms or a permission | 25 | OQ-6, OQ-7, OQ-8, OQ-9, OQ-10, OQ-11, OQ-13, OQ-14, OQ-21, OQ-26, OQ-27, OQ-28, OQ-29, OQ-35, OQ-36, OQ-37, OQ-39, OQ-41, OQ-43, OQ-45, OQ-49, OQ-51, OQ-52, OQ-55, OQ-57 |
| 🟡 Wording and presentation | 14 | OQ-15, OQ-16, OQ-17, OQ-18, OQ-19, OQ-20, OQ-33, OQ-34, OQ-38, OQ-46, OQ-50, OQ-53, OQ-54, OQ-58 |
| 🟢 Resolved, fixed or moot | 6 | OQ-22, OQ-23, OQ-24, OQ-30, OQ-31, OQ-42 |

**52 open, 6 closed, 58 in total.**

Updated 21 September 2026: OQ-52 to OQ-58 are added with the Khalidiyah
migrations `0138`–`0150` — the UNHCR number's format, the bare "Other",
the disability instrument, status as at the activity, the two milestone
rules that name a text and a date as things to be "In place", the person
a band-only sheet creates, and the five calculation lines that number
their indicator question wrongly. **OQ-56 is the one to read**: two of the
four milestones cannot compute until the M&E lead names their critical
items, and the platform says so rather than guessing.

Updated 16 September 2026 (later): OQ-51 is added — the `app_user` policies
admit a municipal coordinator to their own municipality's accounts while the
screen is super admin only. Earlier that day: the table is regenerated from the headings, so it
cannot drift from them again. OQ-30 is moot since 0128, OQ-43 is half answered
and OQ-49 mostly, all three re-marked; OQ-41 to OQ-50 are counted for the first
time.

Earlier note, 2026-09-01, second pass: the partner merge, the advisory track and the
linkage gate. **OQ-40 is new and it is the one to read** — it is the KPI half of
the advisory-track work, deliberately not built, and answering it settles OQ-1
and OQ-4 as a side effect. OQ-29 is unchanged and now visible on three screens
rather than one, because the partner dropdown became a single implementation.

Updated 2026-09-01, building the last three forms. Three entries were added
(OQ-37, OQ-38, OQ-39) and none closed — **OQ-1, OQ-4 and OQ-14 each gained a
screen, which is not the same as gaining an answer.** All three ask what a
figure MEANS, and building the thing that produces it settles nothing about
that.

Two of the reds are the ones that stop work rather than merely misreport it:
**OQ-32** (138 Arabic labels, blocking the survey in the field) and **OQ-25**
(no period has ever been snapshotted, so no reported figure is protected).

---

## 🟡 OQ-19 · Cancellation reasons are required for training and advisory, not for exhibitions

**What the code does.** `training_session` and `advisory_session` both carry `cancellation_reason` with a `check (not is_cancelled or cancellation_reason is not null)`. `exhibition` carries `is_cancelled` with **no** reason column and no such constraint.

**Why it looks like an oversight and is not.** Migration `0027` added `cancellation_reason` to `exhibition` with exactly that constraint. Migration `0029` removed it, with the rest of `0027`, at the project owner's explicit request — a scope decision, not a defect. When `0043` built the pattern for training and advisory it deliberately did **not** reinstate it on `exhibition`, because quietly reversing a deliberate removal inside an unrelated migration would hide the change.

**The consequence.** A cancelled training or advisory session states why. A cancelled exhibition does not, so E0.1 excludes it with no record of the reason.

**Decides.** Project owner.

**Needed.** Either reinstate `cancellation_reason` on `exhibition` for symmetry, or confirm the asymmetry is intended and close this.

---

## 🟡 OQ-20 · `ref_office_service_type` was invented, not taken from the workbook

> **RESOLVED, 2026-08-30.** The Post_intervention sheet's Q15 service list was
> supplied from the workbook: *Technical advice / Input or equipment guidance /
> Licensing and paperwork help / Market or buyer information / Referral to
> another entity / Other*. That is `ref_office_service_type` exactly, option for
> option and in the same order. The invented list turned out to match the
> source. `guard_followup_option` now maps Q15 onto it (0076) rather than
> creating a second copy.
>
> Worth keeping the entry rather than deleting it: it was right to record the
> uncertainty, and being right by luck is not the same as having checked.

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

**It is user-visible since 15 September 2026, not latent.** Ramtha's
eighteen indicators arrived with Arabic statements from its own workbook, so
its dashboard is fully Arabic; Sahel Horan's, on the same screen, has Arabic
headings, chips and notices around **English row names**. A super admin who
switches between them sees one finished and one half done, and a Sahel Horan
coordinator working in Arabic sees the half. That does not change the
answer -- a native speaker supplies the twenty, and nothing here should
guess them -- but it changes how long the answer can wait.

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

## 🟠 OQ-28 · `ref_activity_type` allows free text, and there is nowhere to put it

**What the reference data says.** `ref_activity_type` carries `allows_free_text`, and the **Other** row has it set to true. By the project's own convention that means the owning table should carry a matching `activity_type_other` column, with a check constraint requiring it when Other is chosen.

**What the schema has.** Neither `production_initiative` nor `linkage_request` has that column. Both have `activity_type_id` and nothing else.

**Why it matters now.** The public linkage request asks what someone produces, and `activity_type_id` is `not null`. A producer whose work is not crop production, livestock, greenhouse farming or food processing has to choose **Other**, and there is no way to say what Other means. The row records that they do something unlisted, and nothing more.

**What was done instead of guessing.** The form does not offer a "please specify" box. `v_public_activity_type` does not publish `allows_free_text`, so the browser cannot render one by accident. Offering a field whose contents are discarded on submit is worse than not offering it — the producer would believe they had told us.

**Not fixed here.** Adding the column is a schema decision about `production_initiative`, which feeds C1.2 and C1.3, not a detail of one public form. It also needs an answer to whether the five options are the intended list at all.

**Decides.** Municipal Coordinator — either the five activity types are complete and **Other** should be retired, or Other is real and both tables need `activity_type_other`.

---

## 🟠 OQ-29 · Nothing says which kind of partnership a market linkage may point at

**What exists.** `partnership_type_t` is `(training, production_support)`. `market_linkage.partnership_id` references `partnership` with no restriction on its type, so a market linkage can be made against a training partnership.

**Why that looks wrong.** A university that delivers a course is not a buyer. Connecting a producer to it as a market outlet is, on the face of it, a category error.

**Why it was not refused.** Nothing in the workbook says so. A1.2 counts training partnerships, C1.1 counts production-support ones, and **G0.4 counts distinct partners with a contribution in the period regardless of type** — so a partner that both trains and buys is a real shape the schema already anticipates. Refusing the combination in SQL would be a rule invented by us, and it would be invisible until it wrongly blocked something.

**What was done instead.** `match_linkage_request` (0067) does not filter. The matching screen shows the partnership type beside every option, so a coordinator choosing a training partner can see that is what they are doing.

**Added 1 Sep 2026.** The partner dropdown is now ONE implementation —
`usePartnershipOptions` — shared by the matching screen, the direct-linkage
screen and the session form, and every one of them shows the partnership type
beside the option. There were previously two queries returning the same list,
which is how a filter gets added to one of them and not the other. Still
unfiltered by type, still deliberately.

**Decides.** Municipal Coordinator — should a market linkage be restricted to production-support partnerships, or is a training partner that also buys a legitimate case?

---

## 🟢 OQ-30 · Staff can overwrite evidence in place, which section 8 was written to prevent — MOOT since 0128

**What section 8 grants.** Read and insert to staff; delete to a coordinator only. The intent is clear: uploading evidence is routine, removing it is not.

**What the database has.** `evidence_staff_read`, `evidence_staff_insert` and **`evidence_staff_update`** — and no delete policy at all.

The missing delete policy is *stricter* than the spec and is fine. `evidence_staff_update` is not in the spec, and it defeats the same protection by another route: an `update` on a `storage.objects` row lets any staff member replace the bytes of an uploaded file while keeping its path, name and row id. The attachment record still points at it, the audit log shows nothing about the file contents, and the evidence is gone.

**Why it matters.** Evidence is mandatory for `B1.1`, `G0.1`, `G0.2` and `G0.3` — the workbook names the required document for each. Those are the indicators whose defensibility rests entirely on a file existing and being what it says it is.

**Why it is not fixed here.** Dropping the policy may break a legitimate flow — re-uploading after a failed upload, or a metadata update Supabase Storage performs internally as part of a normal upload. That needs checking against how the storage client actually writes, not guessing.

**Decides.** Municipal Coordinator, with a technical check first — is `evidence_staff_update` needed for uploads to work at all, and if not, should overwriting be a coordinator action like deleting?


**14 September 2026.** Moot for new evidence: since 0128 files live on R2,
where every upload is signed for a new key and no update path exists; the
Supabase bucket's three policies, the update one included, were dropped in
0128 with zero objects in it. Left open only as the record of what section 8
asked for.
---

## ✅ OQ-31 · Q25's options — RESOLVED 2026-08-30

**Was.** Q25 had no answer list anywhere. `0078` left `followup_answer` unconstrained for it and named the gap; `0084` shipped with no Q25 parameter at all and the screen showed the question as a visible gap rather than a guess.

**Supplied, verbatim.**

> Do you know which authority to approach for a food safety approval or licence for your product?
> — Yes, clearly / Somewhat / No

Note the stem: **"a food safety approval OR licence"**, not licensing alone. Q23 lists the health certificate and the home-business licence as separate items, and Q25 spans both.

**Why the guess would have been wrong, which is the point worth keeping.** Yes/no was the obvious assumption and it is wrong about the *shape*, not just the wording. "Somewhat" is the answer that separates a producer who has heard of the process from one who could actually start it — and that is precisely the gap the technical coordination office exists to close, so it is the answer B1.1 and G0.1 are about.

Verified after `0085`: `guard_followup_answer` refuses `'yes'` on Q25 with *"value_text yes is not one of the answers to Q25"*. The guess would have been caught.

**Built in.** `0085` — constrained in `guard_followup_answer`, carried by `save_followup_section_b`, rendered as a three-option question in Section B.

## 🔴 OQ-32 · A request for 138 Arabic labels — a translator's afternoon, blocking a field survey

**This is a request, not a question.** The wording is not ours to invent and the migration to load it is trivial; what is needed is the Arabic.

### The size of it

204 option labels across 26 `ref_` tables. **66 already have Arabic** — the eight tables `0075` added for the follow-up survey were translated as they were written. So the request is **138 labels in 18 tables**, and it is smaller than "the platform has no Arabic" sounds.

| Table | Labels | What it is for | Priority |
|---|---|---|---|
| `ref_safety_item` | 9 | Q23, the food-safety checklist | **First — blocks the survey** |
| `ref_product` | 11 | Q21, and market registration | **First — blocks the survey** |
| `ref_sales_channel` | 11 | Q27 and Q28 | **Second — blocks Section C** |
| `ref_buyer_type` | 9 | Q35, buyer connections | **Second — blocks Section C** |
| `ref_office_service_type` | 6 | Q15, and the office form | Third |
| `ref_activity_type` | 5 | production initiatives, linkage | Third |
| `ref_training_topic` | 6 | training sessions | Third |
| `ref_guidance_type` | 6 | guidance records | **Second — on a live Arabic screen since 1 Sep 2026** |
| `ref_producer_type` | 9 | market registration | Third |
| `ref_agri_involvement` | 6 | the applicant form | Third |
| `ref_nationality` | 4 | the applicant form | Third |
| `ref_disability_type` | 6 | disaggregation | Third |
| `ref_partner_role_training` | 12 | partnerships | Fourth — staff-facing |
| `ref_partner_role_production` | 10 | partnerships | Fourth — staff-facing |
| `ref_partner_type_production` | 9 | partnerships | Fourth — staff-facing |
| `ref_partner_type_training` | 8 | partnerships | Fourth — staff-facing |
| `ref_stakeholder_type` | 6 | coordination meetings | Fourth — staff-facing |
| `ref_promotional_channel` | 5 | promotion records | Fourth — staff-facing |

The first four tables are 40 labels and unblock the whole follow-up survey. The last six are 50 labels read only by municipal staff, who can work in English if they must.

**`ref_guidance_type` moved up on 1 Sep 2026**, when the guidance log shipped.
Its six labels are now rendered on `/forms/gd/new` — verified by opening the
page with `?lng=ar`: heading, note, field labels, help text and buttons are all
correct Arabic, and the six options in "موضوع الإرشاد" read *Food safety,
Licensing, Packaging, Labelling, Pricing, Marketing*.

They were **not** drafted, and the line in the section below is why it is worth
pausing on: by the "will somebody act on the exact words?" test these six are
closer to *Vegetables* than to *Health certificate*, so they could probably be
drafted safely. They were left alone anyway, because translating 6 of 138 rows
would break the one thing that makes this request tractable — it is a single
ordered list for one person to work through, and picking off the easy rows
leaves a residue nobody owns. Six labels are not worth fragmenting that.

### Why it is urgent for the survey specifically

Verified on the built Section B screen at 320px with the interface set to Arabic: the heading, the buttons, the tri-state labels, the progress line and the layout direction are all correct Arabic — and **0 of the 9 food-safety items are.** An enumerator reads nine items aloud, in English, to an Arabic-speaking producer.

### Why it was not drafted here

Nine of those items name regulatory artefacts — a health certificate, a home-business licence, a production registration. Those have official Jordanian wordings. A form read aloud using an approximation is **worse** than one read in English, because the producer will act on what they are told and go to the wrong office with the wrong document.

`0016` chose nullable `label_ar` over seeded fake Arabic and that was the right call. This is the bill for it, and it comes due the first time an enumerator opens the survey in Arabic.

### Where the line actually falls — added 2026-08-31, so nobody re-derives it

"Do not invent Arabic" is not the rule, and treating it as one is why four
ordinary questions sat in English for weeks next to nine that genuinely could not
be written. The rule is narrower:

> **A plain conversational question can be drafted. A named regulatory artefact
> cannot.**

*"May we contact you again for a follow-up in six months?"* is ordinary Arabic.
There is one natural way to say it, a wrong choice of phrasing costs nothing, and
the producer's answer does not depend on which synonym was picked.

*"Health certificate or food safety approval"* names a **document** with an
official Jordanian wording. The producer will act on what they are read: they
will go to an office and ask for the thing by name. An approximation sends them
to the wrong counter, and it does so while sounding fluent — which is worse than
being read the English, because the English at least signals that a translation
is needed.

The test is not "is this hard to translate", it is **"will somebody act on the
exact words?"** A question elicits an answer. An artefact name sends a person
somewhere.

That is why `ref_safety_item` is still waiting and why Q41, Q42 and Q43 were
drafted on 2026-08-31 without a coordinator: `q41`, `q42`, `q43` and `q43Ph` were
the last four English values in the survey's own question text, they are all
plain questions, and the baseline fell 112 → 108. Section E's option list
(`ref_support_need`) needed nothing — `0075` seeded it with Arabic already.

The same line applies to `ref_product` in the table above, and it is the reason
that row is only half a blocker: "Vegetables" is a plain word, "Olive oil /
olives" is a plain word. None of the eleven names a regulated document.

### The same shape, in files rather than rows

221 values in `src/locales/ar/*.json` **are** the English string — 108 in `survey.json`, 71 in `forms.json`, 42 in `indicators.json`. Not missing keys: present keys whose value was never translated, which renders as finished English and passes every count-based check.

`app/scripts/check-untranslated.mjs` now holds those as a per-file baseline that may fall and must never rise, wired into `npm run build`. It compares the **value**, so it cannot be satisfied by adding a key — only by translating one. It was confirmed to fail by sabotaging a key, not by reading it.

It cannot see the `ref_` tables. Those are rows, not files, and no build check will reach them.

**Decides.** Municipal Coordinator — who supplies the Arabic, in what order, and whether the follow-up survey may be run in the field before `ref_safety_item` and `ref_product` have it.

---

## 🟡 OQ-33 · Q35's arrangement and "still active" answers have codes but no wording

**Low stakes, easy to settle, and written down because an enumerator reads these aloud.**

`02_DATABASE_PLAN.md` gives `followup_buyer_connection` three fixed-list columns and specifies each as a set of codes in a trailing comment. Two of them have no display wording anywhere — not in the plan, not in `04_DATA_DICTIONARY.md`, not in a `ref_` table:

| Column | Codes, from the plan | Where the wording comes from |
|---|---|---|
| `how_connected` | `exhibition`, `referral`, `partner`, `own_effort`, `other` | **Specified.** `04_DATA_DICTIONARY.md` gives all five verbatim, and they matter — four attribute the connection to municipal support and one does not. |
| `arrangement` | `one_off`, `repeat_no_agreement`, `verbal`, `written` | **Not specified.** Written for the Section C screen. |
| `still_active` | `yes`, `no`, `seasonal` | **Not specified.** Written for the Section C screen. |

### What was written, and on what basis

The codes are close to self-describing, so this is a reading rather than an invention — but it is still wording that goes on a screen and gets read to a producer, so it is recorded rather than left in a commit message.

| Code | English | Arabic |
|---|---|---|
| `one_off` | A one-off sale | بيعة واحدة |
| `repeat_no_agreement` | Repeat sales, no agreement | مبيعات متكررة دون اتفاق |
| `verbal` | A verbal agreement | اتفاق شفهي |
| `written` | A written agreement | اتفاق مكتوب |
| `yes` / `no` / `seasonal` | Yes / No / Seasonal | نعم / لا / موسمية |

### Why it is amber rather than red

Nothing counts these. No indicator reads `followup_buyer_connection` — Section C feeds no view (see `03_INDICATORS.md`; A1 reads Q08, C1 reads Q17, IMP-0 reads Q37). The rows are read by a coordinator looking at one producer's market connections, so wrong wording produces a misfiled answer rather than a wrong figure in a donor report.

It is still worth confirming, because `verbal` versus `written` is the distinction that says whether a linkage is contractual, and "agreement" is a word a producer may hear as more binding than intended.

### What would settle it

Either a line in `04_DATA_DICTIONARY.md` giving the seven labels the way it already gives Q35's five "how it came about" options, or a shrug — in which case the wording above stands and this becomes resolved-as-written.

**Decides.** M&E Officer. The labels are live in Section C in both languages, so a change is a one-line edit to `locales/{en,ar}/survey.json` and nothing else.

**Raised.** 2026-08-30, building Section C.

---

## 🟡 OQ-34 · Q37 and Q38 can contradict each other, and nothing stops them

**A deliberate non-decision, recorded so it is not mistaken for an oversight.**

Section D asks two questions about the same thing from different angles:

| Q | Column | Answers |
|---|---|---|
| 37 | `q37_still_engaged` | `main`, `secondary`, `no` |
| 38 | `q38_capacity` | `own_land`, `rented_land`, `own_business`, `employed`, `family_activity`, **`not_engaged`** |

`not_engaged` is one of Q38's own six options, so the sheet plainly expects Q38 answered whether or not the person is still working. That is why `save_followup_section_d` (0092) does **not** clear Q38 when Q37 says `no`, and why the screen does not hide options.

The consequence is that these pairs are storable:

- `q37 = 'main'` with `q38 = 'not_engaged'` — still engaged, in no capacity
- `q37 = 'no'` with `q38 = 'own_land'` — not engaged, on their own land

### Why it was left possible

**No indicator reads Q38.** IMP-0 takes `q37_still_engaged` and nothing else, so a contradictory pair produces a confusing row for a coordinator, never a wrong figure in a donor return. That is the whole reason this is amber rather than red.

Refusing the pair would mean writing a cross-field rule the source sheet does not state. This project has been bitten harder by invented rules than by permissive ones — `ref_office_service_type` was invented and spent weeks as OQ-20 before turning out to be right by luck. A rule that says "these two answers may not co-occur" is exactly the kind of thing that looks obvious and turns out to have a case nobody thought of: someone who owns land they have stopped working is `no` + `own_land` under one reading and `no` + `not_engaged` under another.

### The alternative, if it is wanted

A check constraint is the natural home, because it compares two columns of one row and needs no other table:

```sql
alter table public.followup_survey
  add constraint q38_agrees_with_q37 check (
    q37_still_engaged is null or q38_capacity is null
    or (q37_still_engaged = 'no') = (q38_capacity = 'not_engaged')
  );
```

That is written here rather than applied — but it was run before being written down, in a transaction that rolled back: `no`+`not_engaged` accepted, `main`+`not_engaged` refused, `main`+`own_land` accepted, both-null accepted. It is a constraint that works, not a sketch of one.

It would also need a decision about existing rows — there are none today, so it is cheap now and gets more expensive with every twelve-month interview.

### What would settle it

A line in `04_DATA_DICTIONARY.md` saying whether Q38 is asked of everyone or only of the still-engaged. If it is only asked of the still-engaged, then `not_engaged` is the answer for everybody else and the constraint above is right. If it is asked of everyone, the current behaviour is right and this resolves as-written.

**Decides.** M&E Officer.

**Raised.** 2026-08-30, building Section D.

---

---

## 🟠 OQ-35 · Three tables' policies are addressed to `PUBLIC`, not `authenticated`

**Found 2026-08-31 while correcting §9.3, and it is defence in depth rather than a hole — which is exactly why it needs writing down instead of fixing quietly.**

Every policy in this schema is `for … to authenticated`. Ten are not:

| Table | Policies |
|---|---|
| `advisory_session` | `op_read`, `op_insert`, `op_update` |
| `advisory_enrolment` | `op_read`, `op_insert`, `op_update` |
| `linkage_request` | `op_read`, `op_read_self`, `op_insert`, `op_update` |

A `create policy` with no `TO` clause defaults to `TO PUBLIC`, and `PUBLIC` includes `anon`. All three tables come from the `0034`–`0049` stretch that was applied through the MCP with no SQL in the repository — the same stretch CLAUDE.md rule 5 exists because of. The `TO authenticated` was simply left off, consistently, across three tables written together.

**`anon` cannot currently reach any of them**, and that was tested rather than assumed — `set role anon`, in a transaction that rolled back:

| | |
|---|---|
| `select from advisory_session` | refused 42501, permission denied for table |
| `select from linkage_request` | refused 42501, permission denied for **function `my_person_id`** |
| `select from v_public_opportunity` | 4 rows — the public site still works |
| `select from person` | refused 42501 |

Two independent things are stopping it: `anon` holds no table grant, and the guard functions the policies call are revoked from `anon` (§2, §11).

**Why it still matters.** The role list is the outermost boundary and on these three tables it is doing nothing; the refusal is coming from grants underneath it. Note the second row — `linkage_request` was refused for *lack of EXECUTE on a helper*, not for lack of a table grant. That is a thinner margin than the others and it is not the margin anyone thinks they are relying on.

The failure mode is one migration away: a permissive branch that does not depend on `current_role()` — a published-flag test, an `or is_published` — would be evaluated for `anon` on these three tables and not on any other. `0025` and `0048` are both records of a public-facing filter being got wrong once.

**Interim behaviour.** Left as is. Changing ten policies is `drop`/`create` on live tables and it is not urgent, since nothing reaches them today.

**What the fix is,** when it is taken: recreate the ten with `to authenticated`, then re-run the `set role anon` probe above and the §10 test, and confirm the public site still returns its four views. Not a `alter policy` — that cannot change the role list.

**Decides.** Nobody, really. This is a maintenance item rather than a question; it is here because a comment in a migration would stop the search (CLAUDE.md), and because the next person to run §9.3's check will see these ten in `policies_open_to_anon` and needs to know they are known.

**Grep for it:**

    select tablename, policyname from pg_policies
     where schemaname='public' and ('anon' = any(roles) or 'public' = any(roles));

---

**Take OQ-12 to the Coordinator first.** It is the one that undermines the purpose of the programme, and it is a form change, not a database change.

Note: OQ-12 and OQ-13 were briefly marked resolved on 2026-08-24 when the form fields were built, then set back to open when that work was reverted the same day at the project owner's instruction. Each carries a **History** line recording what was built and what survived. Nothing about the underlying questions has changed.

---

## 🟠 OQ-36 · Approving a follow-up survey moves no figure, and that may not be what the M&E lead expects

**Raised 2026-08-31, building the coordinator's review UI (`0097`–`0100`).**

**What the database does.** `v_ind_a1`, `v_ind_b1`, `v_ind_c1` and `v_ind_imp_0`
all admit `status in ('submitted','approved')`. So a survey enters A1, B1, C1 and
IMP-0 the moment an **enumerator** submits it. A coordinator's approval records
that somebody read it and changes no number; rejecting or reopening removes it
from all four.

**Why that might be wrong.** The alternative reading — approval is the gate, and
only `approved` counts — is the one most people assume when they see an approval
step, and it is what `exhibition_registration` does: `E0.2` counts **approved
only**, and `05_ROLES_AND_RLS.md` §5 says that trigger "is what makes the figure
defensible to the donor."

So the platform now has two review workflows with opposite semantics, and
nothing in the source workbook settles which one a follow-up survey should
follow.

**The case for leaving it.** A survey held out of the figures until a coordinator
finds time to read it under-reports the quarter, and the enumerator has already
done the work. Submission is the act of record; review is quality assurance
after the fact, with the divergence visible.

**The case for changing it.** IMP-0 is the Action Plan's impact indicator and A1,
B1 and C1 are its three intermediate results. If the donor asks "who checked
this figure", the honest answer today is "an enumerator, and a coordinator may or
may not have looked since."

**Interim behaviour.** Unchanged, and **stated on screen rather than left to be
discovered**: the confirmation panel tells the coordinator, before they approve,
that the survey is already counted and that approving will not move anything.
That sentence is computed from `pg_get_viewdef` (`0098`), not written down — so
if the answer to this question is "approval should be the gate", narrowing the
four views is the whole change and every screen follows the same day.

**Decides.** M&E lead, with Enabel. It is a reporting-policy question, not a
schema one.

**Needed.** One sentence: does a follow-up survey count from submission, or from
approval?

---

## 🟠 OQ-37 · Which market linkage statuses count as a contribution to G0.4

**Raised 2026-09-01, building the G0.4 auto-credit (`0101`).**

**What the source says.** G0.4's definition names *"market opportunity"* as one
of the contributions that count. It says nothing about the state a linkage has
to be in.

**Why it matters.** `market_linkage.partnership_id` is NOT NULL, so every
linkage names a partner and could credit them. But a `proposed` linkage is the
**Municipality proposing** — the partner may not have answered, and G0.4 is
about what the partner *did*. Crediting on `proposed` would mean a partner
counts in a quarter for a conversation the Municipality had about them.

`link_status_t` is `proposed`, `under_review`, `active`, `ended`.

**What was built, and on what basis.** `0101` credits on **`active` or
`ended`**, which is exactly the pair `v_ind_c1_2` uses to decide an initiative is
"connected to market opportunity". Taking C1.2's own reading rather than
inventing a second one means the two cannot come to disagree about what a live
linkage is.

Measured, in a transaction that rolled back: an `active` linkage to a new
partner moved G0.4 by one; a `proposed` linkage to the same partner moved
nothing and wrote no contribution.

**What would change the answer.** If the M&E lead reads "contributed to a market
opportunity" as including a partner who has been approached and is considering
it, the fix is one line in `contribution_from_linkage` — and `under_review`
would probably come with it. If it is narrower still (only a linkage that
produced a sale), that is `market_linkage.outcome`, which is free text today and
would need a shape first.

**Decides.** M&E lead.

---

## 🟡 OQ-38 · D0.2 counts a training session that is both cancelled and delivered

**Found 2026-09-01 while writing `0102`, in the view it had to agree with.**

**What the code does.** `v_ind_d0_2` admits `deleted_at is null and
is_delivered`, keyed on `end_date`. It does **not** filter `is_cancelled`.
Nothing stops a row having `is_cancelled = true` and `is_delivered = true` at
the same time — `check_delivery_not_future` only compares the delivery flag
against the end date, and `cancellation_reason` is required when cancelled but
says nothing about delivery.

**Why it matters.** A session cancelled and then marked delivered by mistake
counts towards D0.2, whose target is one session per quarter for eight quarters.
One wrong row is a whole quarter's target.

**Why it was not fixed in `0102`.** `0102` credits the delivering partner for
G0.4 and had to choose a condition. It uses D0.2's three conditions unchanged,
deliberately: a stricter copy here would make G0.4 and D0.2 disagree about what
"delivered" means, and two copies of one rule drift. Fixing the view is a change
to a reported figure and belongs in its own migration with its own decision, not
folded into an unrelated one.

**The two ways to close it.** Either `v_ind_d0_2` gains `and not is_cancelled`
— and then `0102`'s trigger gains it too, in the same migration — or a check
constraint refuses `is_cancelled and is_delivered` outright, which is cleaner
because it stops the contradiction existing rather than filtering it afterwards.
The second needs a sweep of existing rows first; there are none today.

**Grep for it:**

    select id, title, is_cancelled, is_delivered from training_session
     where is_cancelled and is_delivered and deleted_at is null;

**Decides.** M&E lead, with the Coordinator.

---

## 🟠 OQ-39 · `partner_viewer` reads nothing from any operational table, and the matrix says it reads almost all of them

**Found 1 Sep 2026, testing the guidance log as each of the five roles.**

**This is the same shape `05_ROLES_AND_RLS.md` §3 already records for
`followup_survey` — but it is eighteen tables, not one, and §3 fixed only the
row it was looking at.**

**What §3's matrix grants.** `R` to `partner_viewer` on `partner`,
`partnership`, `partnership_role`, `partner_contribution`, `training_session`,
`training_enrolment`, `milestone`, `office_service`, `production_initiative`,
`mentorship_session`, `market_linkage`, `guidance_record`, `exhibition`,
`exhibition_registration`, `promotional_action`, `coordination_meeting`,
`coordination_meeting_partner`, `case_study` and `attachment`.

**What the database has.** Every one of those SELECT policies is `is_staff()`,
and `is_staff()` is `coordinator`, `data_entry`, `enumerator`.
`exhibition_registration` is the only one that widens it, and it widens it to
the *participant* who owns the row, not to the donor.

Measured through RLS as all five roles, in a transaction that rolled back:

| role | partner | partnership | partner_contribution | training_session | exhibition | `v_indicator_actual` |
|---|---|---|---|---|---|---|
| coordinator | 2 | 2 | 2 | 5 | 2 | 20 |
| data_entry | 2 | 2 | 2 | 5 | 2 | 20 |
| enumerator | 2 | 2 | 2 | 5 | 2 | 20 |
| **partner_viewer** | **0** | **0** | **0** | **0** | **0** | **20** |
| participant | 0 | 0 | 0 | 0 | 0 | 0 |

**The database is almost certainly the one that is right, for the same reason
§3 gave.** The donor gets figures, not records: `v_indicator_actual` admits
`partner_viewer` explicitly and returns all twenty, so every number they are
entitled to reaches them without a single participant record doing so. That is
the stronger reading of §6's "never sees a national ID", and several of these
tables join straight to `person`.

**Why it is amber rather than a documentation fix made on the spot.** Two
things are genuinely undecided and neither should be guessed:

1. **`partner`, `partnership` and `partnership_role` hold no personal data at
   all** — an organisation's name, type and role. There is a real argument that
   an external evaluator should be able to see the partner list behind A1.2,
   C1.1 and G0.4. That is a decision, not a typo.
2. `attachment` is the evidence trail for `B1.1`, `G0.1`, `G0.2` and `G0.3`,
   and "the donor can see the evidence" may well be the intent. Today they
   cannot.

**Do not fix this by editing the matrix to match the database.** That is what
makes the document a description of the code instead of a specification, and §15
is the record of what that costs. Settle 1 and 2 first, then correct whichever
side is wrong.

**Decides.** M&E lead, with Enabel — they are the `partner_viewer`.

**Grep for it:**

    select tablename, pg_get_expr(polqual, polrelid) from pg_policies pol
      join pg_policy p on p.polname = pol.policyname
     where schemaname = 'public' and cmd = 'SELECT';

---

## 🔴 OQ-40 · Advisory now has two tracks, and neither has an indicator

**Raised 2026-09-01, building the track (`0105`) and the linkage gate (`0106`).**

**What was built.** `advisory_session.track` is `market` | `home_based`, NOT
NULL, chosen on one form. `check_linkage_eligibility` now requires a completed
advisory on the **market** track before a producer may ask to be connected to a
buyer; a home-based completer is refused by name.

**What was NOT built, deliberately: any change to any view.** The instruction
was one form, two tracks, and a KPI for each. The KPI half is the part that
cannot be done without an answer from the M&E lead, and doing it would have
answered two open questions by implementation.

### Why market advisory cannot simply be pointed at C1.3

C1.3 counts `mentorship_session` — a DIFFERENT table, hanging off
`production_initiative` with `initiative_id` **NOT NULL**. Its definition,
method, formula, disaggregation, data source and every target are blank in the
source workbook. That is **OQ-1**, still open, and it already asks precisely
this question: *does "advisory mentorship sessions" mean the new advisory
sessions people apply to, or mentorship delivered to initiatives already
selected for support?*

Repointing `v_ind_c1_3` at `advisory_session` would answer OQ-1 by writing SQL,
and it would **orphan `mentorship_session`, which currently holds 2 live rows
and is the only thing C1.3 counts today.**

### Why home-based advisory cannot simply be pointed at D0.1

D0.1 counts **distinct people** in `guidance_record`. The workbook names the
Completion form as its source, which measures training completions — a
different event. That is **OQ-4**, still open. `guidance_record` holds 2 live
rows and has had its own module since 2026-09-01.

### The asymmetry, which is the part most likely to be missed

**The two tracks are not symmetrical, even though the form is.**

| | C1.3 | D0.1 |
|---|---|---|
| Counts | **SESSIONS** — `count(*)` | **DISTINCT PEOPLE** — `count(distinct person_id)` |
| Source | `mentorship_session` | `guidance_record` |
| Target | none — `TBD`, all quarters blank | 5 per quarter, 40 final |
| Open question | OQ-1 | OQ-4 |

So "a KPI for each track" is two different KPIs of two different KINDS. Three
market advisories with one producer would be **three** under C1.3's rule and
**one** under D0.1's. A single generic "advisory sessions delivered" figure
covering both tracks would be wrong for whichever of the two it did not match,
and the error would be invisible: the number would look plausible either way.

This is CLAUDE.md rule 4 in its most expensive form — the distinct-person count
is the single most common way these numbers go wrong.

### What the M&E lead has to answer

1. **Which indicator does each track feed?** Market advisory → C1.3, a new
   indicator, or nothing? Home-based advisory → D0.1, a new indicator, or
   nothing?
2. **Do `mentorship_session` and `guidance_record` continue alongside advisory
   sessions, or are they replaced?** Both hold live rows and both have screens.
   If replaced, those rows need migrating, not deleting — they are already in a
   reported figure.
3. **If a track feeds C1.3, does a session with a group count once or once per
   participant?** OQ-1 has been asking this since 26 August and it is the same
   question in new clothes.

**Interim behaviour.** No view changed. C1.3 still counts `mentorship_session`,
D0.1 still counts `guidance_record`, and advisory sessions feed **no indicator
at all** — which is exactly what they did before the track existed. The track
does real work today regardless: it is what the linkage gate reads.

**Decides.** M&E lead, with Enabel. Answering 1 settles OQ-1 and OQ-4 as a side
effect, so it is one conversation and not three.

---

## 🟠 OQ-41 · The rate limiter and a wrong national ID are the same answer to the applicant

**Found 1 September 2026, by applying to three things in a row as an anonymous
visitor.**

`bump_lookup_throttle` (0050) allows **5 attempts per national ID per 10
minutes** and 20 per client. All four public functions call it —
`applicant_prefill`, `apply_for_opportunity`, `my_applications`,
`request_linkage` — and every one of them turns a refusal into the same
`cannot_verify` they return when the identity check itself fails.

**Why the blur is wrong here, when the other blur is right.** Returning one
answer for "this ID is not on file" and "this ID is on file but the date is
wrong" is deliberate and correct: telling them apart is an existence oracle,
and OQ-22 settled it. **Being over a rate limit reveals nothing about whether
an ID exists**, so folding it into the same answer buys no privacy and costs
the applicant the truth. Every rate limiter in general use says so plainly.

**What it cost, measured.** The screen said:

> *We could not confirm your details. Check your national ID and date of birth
> against your card. If they are right and this keeps happening, please visit
> the Municipality office.*

The details were correct. The applicant had simply used their five attempts:
two per application (lookup, then apply) and one for "my applications". Three
ordinary actions in ten minutes is five attempts — **a normal session reaches
the limit**, and the message then sends the person to the Municipality office
to fix a problem they do not have.

**What was done now.** The copy on all three public screens stops asserting one
cause and names both, in both languages, with "wait ten minutes" as the action.
That removes the false statement.

**What was NOT done, and why.** Making the two results distinguishable means
returning a separate `too_many_attempts` from the four RPCs. That is the right
fix, and it is four `create or replace` on security-definer functions that
stand between `anon` and a table of national IDs — each last touched by a
different migration (0062, 0060, 0071, 0106), each carrying the `0082`
reversion risk. It was judged too large to do at the end of an audit pass
without a dedicated review. Two of the four (`apply_for_opportunity`,
`request_linkage`) also catch `others`, so fixing it inside
`bump_lookup_throttle` by raising would be swallowed by them — the callers have
to change either way.

**Needed.** A migration adding `too_many_attempts` to all four, each body taken
from `pg_get_functiondef` rather than from the newest migration file, plus
copy for the new result. Verified as `anon`, not as the owner.

**Also worth the M&E lead's view:** whether 5 per identifier per 10 minutes is
the right limit at all. It was chosen against a credential-stuffing threat, and
the observed cost is that an ordinary applicant hits it.

**Decides.** Developer for the mechanism; Coordinator on the limit.

---

## 🟢 OQ-42 · The RLS verification's second check has always returned two rows — RESOLVED as a doc fix

**Found 3 September 2026**, during the table audit.

`05_ROLES_AND_RLS.md` §9 check 2 reads *"no table with RLS on but no policy —
expect zero rows"*. It returns **two**, and always has:
`applicant_lookup_secret` and `applicant_lookup_throttle`.

Both are correct as they stand. RLS enabled with **zero policies** denies every
role — it is *stricter* than any policy could be, and it is the right shape for
a table nothing may touch except a `security definer` (`bump_lookup_throttle`).
Adding a policy to satisfy the check would weaken both tables: one holds the
HMAC salt for the public applicant lookup, the other the lookup counters.

**This is §9 check 3 again.** That one said "anon has no access anywhere,
expect zero rows" while `0048` and `0056` had granted `anon` four views — so
for every run since, either nobody ran it or somebody saw four rows and decided
they were fine. It was fixed by turning it into an allow-list. Check 2 has the
same defect and the same fix: name the two tables, and fail on a **third**.

**Resolved:** the expectation is wrong, not the schema. §9 check 2 should read
"expect exactly `applicant_lookup_secret` and `applicant_lookup_throttle`", and
fail on anything else — because a *new* table with RLS on and no policy is
usually an unfinished migration, which is the thing the check was written for.

**Decides.** Settled — it is a correction to the document, not a schema change.

---

## 🟠 OQ-43 · Four indicators require evidence; two of them can attach one since 15 September 2026

**Found 3 September 2026**, during the table audit.

`05_ROLES_AND_RLS.md` §8 and the source workbook both make an evidence document
**mandatory** for four indicators:

| | Evidence the workbook names |
|---|---|
| **B1.1** | municipal decision, service schedule, record of sessions delivered |
| **G0.1** | formation decision, membership list, terms of reference, minutes |
| **G0.2** | meeting minutes and attendance records |
| **G0.3** | the case study itself |

**What exists.** The private bucket `evidence` (`0013`). Storage policies for
staff read and staff insert. The `attachment` table, with `entity_type`,
`entity_id`, `storage_path`, its audit trigger, its soft-delete guard, and a
generated row type in `app/src/types/database.ts`.

**15 September 2026.** The evidence panel (0128, R2) sits on each milestone
card of `/manual-entries`, so **B1.1 and G0.1** can carry their decisions,
schedules and minutes today, verified with a real photograph from the
browser. **G0.2 and G0.3** cannot yet: coordination meetings and case
studies are rows in a record log on the same screen with no detail view to
hang a panel on. `coordination_meeting` and `case_study` have been admitted
`entity_type`s since 0128, so what is missing is a place on the screen --
an expandable row, or a detail route -- not a migration.

**What did not exist before 0128.** Any code that used the bucket. `supabase.storage` appeared
**nowhere** in `app/src`. `attachment` holds 0 rows, is written by nothing, and
is read by nothing — no view, no function, no screen.

**Why it matters more than an empty table normally would.** B1.1 and G0.1 are
milestones: `/manual-entries` will set `is_achieved` and move the indicator from
0 to 1 today, with no document anywhere, and nothing on the screen asks for one.
§8 says *"Enforce with a check on the milestone and case study tables that at
least one attachment exists before the record can be marked complete."* That
check was never built, and could not be satisfied if it were.

These are the four indicators whose defensibility to the donor rests entirely on
a file existing. Today the platform can assert all four and evidence none.

**What is NOT recommended.** Adding the §8 constraint now. It would make B1.1
and G0.1 unachievable rather than unevidenced, which is worse: it blocks
recording something that really happened, and the workaround is a coordinator
being told the software is broken.

**Needed, in order.** An upload path first (storage client, signed URLs, an
`attachment` write on the four owning screens), then the constraint. Note
**OQ-30** sits underneath this: `evidence_staff_update` lets any staff member
overwrite an uploaded file in place, which destroys evidence as surely as a
delete would. Both should be settled together, because building the upload path
on top of an unresolved overwrite hole is how the evidence trail ends up
looking complete and not being.

**14 September 2026 — the upload path exists.** `EvidencePanel`
(`app/src/components/EvidencePanel.tsx`) uploads to Cloudflare R2 through the
`evidence` Edge Function (0128, OQ-49) and is on every Ramtha detail screen.
0128 also admits `milestone` and `case_study` as `entity_type`, so the four
Sahel Horan screens can be given the same panel without another migration;
they have not been yet, and the §8 constraint is still not built — this
question's own recommendation is that the panel comes first, and for Sahel
Horan it has not. The overwrite hole is closed on the R2 path: an object's
key carries a fresh uuid, nothing signs a PUT to an existing key, and the
Supabase bucket's update policy went with its other two in 0128.

**Decides.** M&E lead — is evidence a hard precondition for marking a milestone
achieved, or a record attached afterwards? The answer changes whether the
constraint or the upload path is the blocking piece.

---

## 🔴 OQ-44 · `snapshot_period` is correct and the application cannot call it

**Found 3 September 2026.** This is the other half of **OQ-25**, which records
that no period has ever been snapshotted. It is now clear that this was not an
oversight of process.

**The function works.** Run on the owner path against the current period it
returned **20 rows**, one per indicator, matching `v_indicator_actual` exactly,
then rolled back. It honours `is_locked`, refuses an unknown period, and
upserts with `where is_final = false`.

**Nobody who could want to call it can.** `snapshot_period` is
`security definer` with `EXECUTE` revoked from `authenticated` **and** `anon`.
`authenticated` is the only role the application ever connects as. Measured:

```
set local role authenticated;  set local request.jwt.claims = '{"sub":"<a coordinator>"}';
select public.snapshot_period('26/Q3');
ERROR:  42501: permission denied for function snapshot_period
```

**The gate inside it has therefore never been reachable.** Its first statement
is `if auth.uid() is not null and not is_coordinator() then raise`, which only
means anything for a signed-in caller — and a signed-in caller is refused by the
grant before reaching it. Every caller that gets through has no `auth.uid()` at
all, so the branch that runs is the one that permits everything.

This is `05_ROLES_AND_RLS.md` §14 from the other side: there a definer's grant
was too narrow for the invoker that called it; here it is too narrow for the
only role that exists. Both were invisible because the function is perfect when
run as the owner, which is how it was tested.

**Why it was not fixed here.** Granting `EXECUTE` to `authenticated` is one
line and is probably right — the coordinator gate is already inside the body and
would start working the moment the grant existed. But snapshotting is the act
that *creates* a reported figure, and OQ-25 records that **who may do it and
when is an unanswered process question**. Granting first would put the button in
reach before anyone has decided whose finger goes on it.

**Needed.** OQ-25's answer, then a one-line grant, then a screen. Verified as a
coordinator *and* as the four other roles — not as the owner.

**Decides.** M&E lead with the Municipal Coordinator, as OQ-25.

---

## 🟠 OQ-45 · The completion form collects two fields and writes neither

**Found 3 September 2026**, during the table audit.

Section 3 of `04_DATA_DICTIONARY.md` maps two fields of the `Completion_form`:

| Source field | → |
|---|---|
| What is your current involvement in agriculture? | `person.agri_involvement_id` |
| What type of agricultural activity are you involved in? *(select all)* | `person_activity_type` junction |

**Both are on the screen.** `/forms/tc` renders an "Agricultural profile"
section containing exactly these two controls — `useFormSchema.ts:393-394`, an
`involve` select over `ref_agri_involvement` and an `act` checkbox group over
`ref_activity_type`. The option lists load, the controls tick, the form
submits, the toast is green.

**Neither reaches the database.** `CompletionInput` has no field for either.
`useCreateCompletion` inserts a `person` without `agri_involvement_id` and never
touches `person_activity_type`; `useUpdateCompletion` does the same. Confirmed
in the data rather than in the code: `person_activity_type` holds **0 rows**,
and `agri_involvement_id` is **null for all 7 people on file**.

**This is CLAUDE.md's seventh shape without the RLS.** There, a delete RLS
filtered reported success and the box stayed ticked. Here there is no delete and
no policy — the values simply never leave the browser. The symptom is identical
and so is the cost: an enumerator answers a question, is told it saved, and the
answer is not anywhere.

**What it costs.** `ref_activity_type` and `ref_agri_involvement` are seeded and
correct. Nothing in `03_INDICATORS.md` computes a figure from either, so **no
indicator is wrong today** — this is lost disaggregation, not a bad number.
A1.3 disaggregates by sex, age, refugee status, disability and training topic,
all of which are collected.

**Why it is amber rather than red.** No donor figure moves. But the longer it
runs the worse it gets: every completion recorded from now on is a person whose
activity profile was asked for, answered, and discarded, and there is no way to
recover the answers later.

**What would settle it.** Either wire both fields through — two lines on
`CompletionInput`, a `person.agri_involvement_id` on the insert and update, and
a delete-then-insert on `person_activity_type` matching the eight junctions
already in the platform — or take both controls off the form. **Taking them off
is a real option**: neither feeds an indicator, and a question nobody answers
honestly because it never mattered is worse than no question. What must not
continue is the third state, where the form asks and the database does not hear.

**Decides.** M&E lead — is the activity profile wanted for reporting at all? If
yes it is a small piece of work; if no, the two controls should go.

---

## 🟡 OQ-46 · The 613 Ramtha option labels carry drafted Arabic, not the Municipality's

**Added 14 September 2026**, with migration `0122`.

`RMTH_indicator_forms.xlsx` gives every response option in English and none
in Arabic. The 106 `ref_rmth_*` lists were seeded with English verbatim from
the sheets and Arabic drafted for this platform — the alternative, null
`label_ar` as `0016` chose for Sahel Horan, would have put 613 English options
in front of an Arabic-speaking enumerator on day one, which is the position
OQ-32 describes as blocking a survey in the field.

The line OQ-32 draws was applied: a plain phrase or category ("Job fair",
"Private company", "Yes, to some extent") is drafted; nothing here names a
Jordanian regulatory document that a beneficiary would be sent to fetch. The
rows closest to that line are the **evidence lists** — what the enumerator
ticks as "on file" — which name record types rather than instruct a person:

| list | rows naming a document or record |
|---|---|
| `ref_rmth_imp0_verification`, `ref_rmth_so20_verification`, `ref_rmth_so30_verification` | social security record; business registration or licence; sales, invoice or wallet records; employer confirmation letter |
| `ref_rmth_b1_evidence`, `ref_rmth_b12_evidence` | approval or licence copy; signed approval decision; conditions letter |
| `ref_rmth_c11_joint_evidence`, `ref_rmth_e01_evidence` | memorandum of understanding; governance document or terms of reference; municipal decision establishing the incubator |
| `ref_rmth_a12_evidence`, `ref_rmth_a13_evidence`, `ref_rmth_c12_evidence`, `ref_rmth_e03_evidence`, `ref_rmth_f01_evidence` | attendance sheet with names and National IDs; certificate copy |

These are filing categories for staff, not questions a beneficiary acts on,
so they were drafted too; they are listed so the review starts there.

**What would settle it.** The Municipality reads the Arabic of the 106 lists
(`select code, label_en, label_ar from ref_rmth_<list> order by sort_order`,
or the form screens with the interface set to Arabic) and corrects any label
by updating the row. No migration is needed; `label_ar` is data.

**Decides.** Ramtha Municipality's M&E focal point.

---

## 🔴 OQ-47 · Seven Ramtha definitions are undecided, and the indicators that read them say so

**Added 14 September 2026**, with migration `0123`. This is the forms index's
own "Open items — decide these before the forms go into use" list, restated
as the questions the M&E lead has to answer, and the place the answers go.

Each lives in `rmth_threshold` as a row with a null value. Every indicator
view that reads one returns **not computable** — null, with the missing
definition named — until the value is set. Never zero. Answering is an
UPDATE on the row (`value_numeric` / `value_text` / `value_bool`, with
`decided_by` and `decided_on`), which a coordinator of Ramtha or a super
admin does on the **Open items** screen (`/rmth/thresholds`, Part 6) — the
row's question and note in their language, the current answer, which
indicators wait on it, and a Decide control; it is not a migration. The
dashboard reads the same status view the screen does, so the two cannot
disagree about what is blocked.

| # | question | key(s) | blocks |
|---|---|---|---|
| 1 | **Sustained engagement.** How many consecutive months (X) count as sustained? And the Action Plan writes the calculation as a ratio while the target is 65 persons — is a **count** what is reported? | `imp0_sustained_months` | RMTH-IMP-0 |
| 2 | **Short-term intensive.** No definition exists. No more than how many weeks, and at least how many contact hours per week? | `c11_max_weeks`, `c11_min_hours_per_week` | RMTH-SO2-C1.1 |
| 3 | **Regular income.** The form proposes income in at least four of the last six months. Confirm, or change the number. | `so30_income_months_of_six` | RMTH-SO3-0 |
| 4 | **Completion criteria.** For each of C1.2, E0.3 and F0.1: what attendance threshold, which assessment result, and (C1.2) job-ready, so that two enumerators produce the same total? E0.3's rule must include at least one incubator-design module; F0.1's at least one of production practices, quality standards or business management. | `c12_completion_rule`, `e03_completion_rule`, `f01_completion_rule` | RMTH-SO2-C1.2, RMTH-SO3-E0.3, RMTH-SO3-F0.1 |
| 5 | **Self-employment as placement.** The indicator says employment or internship; the form keeps "Yes - into self-employment" on its own line. Does it count? | `so20_self_employment_counts` | RMTH-SO2-0 |
| 6 | **Programmes or sessions.** The framework counts programmes developed; the Action Plan counts training sessions delivered. Which reading governs F0.2? | `f02_counting_reading` (`programmes` / `sessions`) | RMTH-SO3-F0.2 |
| 7 | **Employability threshold.** The form counts a confirmed placement, or one verifiable step plus one other; the Action Plan's equivalent counts confirmed employment only. Which? | `so10_employability_threshold` (`form_rule` / `placement_only`) | RMTH-SO1-0 |

Until these are answered, nine of Ramtha's 18 indicators cannot produce a
number. Eight do not depend on them (A1.2, A1.3, B1, B1.1, B1.2, SO2-C1,
E0.1, E0.2), and SO1-A1 has no statement at all (OQ-48, Part 6).

**Decides.** Ramtha's M&E lead with ENABEL, for the count-versus-ratio half of
item 1 and for item 6, where the two source documents disagree.

---

## 🔴 OQ-48 · Ramtha has no targets, one indicator has no statement, and the two framework sheets do not list the same indicators

**Added 14 September 2026**, with migration `0131`.

### The targets

`RAMTHA Framework.xlsx` has two English sheets. **`English_form`** is the
list the forms workbook (`RMTH_indicator_forms.xlsx`) was built from and the
list this platform implements: 18 codes, one form each (17 — SO1-A1 has no
form). Its `Target (to be deleted)` column, its `Baseline` column and its
eight quarterly target columns (`27/Q1` … `28/Q4`) are **empty for every
row**. **`English Copy`** carries targets — but for a *different* list of 13
statements, lettered per objective rather than coded, with a different
type column and two milestones that `English_form` does not have.

The plan (§6.2) says not to map one onto the other, and 0131 does not: it
seeds all 234 `indicator_target` rows (18 indicators × 13 quarters) with
`target_value` **null**, so the dashboard reads *target not set* and never
0, and the four headline cards say so under each figure.

What is in one and not the other, for whoever reconciles them:

| English Copy (target) | nearest English_form code | why it was not carried across |
|---|---|---|
| IMPACT — sustained employment/income (**65 persons at the end of 3 years**) | RMTH-IMP-0 | the only statement identical in both sheets. Still not mapped: the Copy's formula writes a **ratio** and the form sheet says "a COUNT, not a rate" (OQ-47 item 1), and a three-year figure is not thirteen quarterly ones |
| SO1 / SO1-C — persons employed in the Ramtha project(s) (**15 annually**, the row appears twice) | RMTH-SO1-0 | SO1-0 counts persons who *demonstrate increased employability*, a wider statement (OQ-47 item 7) |
| SO1-A — networking events including job fairs, periodic meetings **and vocational guidance sessions** (**4 per year**) | RMTH-SO1-A1.2 + A1.3 | English_form splits this into two indicators that the index says must **never** be summed; a target for the union cannot be divided between them |
| SO1-B — Municipality-facilitated projects developed for employment (**1 annually**) | RMTH-SO1-B1.2 | B1.2 counts *proposals approved for implementation*; a different unit of observation |
| SO2-A — training programs developed for employment (**4**) | RMTH-SO2-C1.1 | C1.1 counts short-term intensive *cycles delivered* whose content was jointly developed; not programmes |
| SO2-B — trainees completing training programs related to employability (**80**) | RMTH-SO2-C1.2 | same words bar "Number of" / "#"; the Copy's duration says *quarterly* and does not say whether 80 is per quarter, per year or in total |
| SO3-A — entrepreneurship projects developed/established at household level (**10 by end of 3 years**) | — | **no counterpart** in English_form |
| SO3-B — training programs developed for entrepreneurship (**2**) | RMTH-SO3-F0.2 | identical statement; the Copy's own definition counts *sessions* while its statement counts *programmes* (OQ-47 item 6) |
| SO3-C — participants trained in entrepreneurship training (**40**) | RMTH-SO3-F0.1 | identical statement; the same "per what period" question as SO2-B |
| SO3-D — a mechanism for in-kind support established and operational (milestone, **1**) | — | **no counterpart**; a milestone, not a count |
| SO3-E — Ramtha entrepreneurship incubator established (milestone, **1**) | RMTH-SO3-E0.1 | E0.1 is a *count* of specialised incubators established and operational; the Copy has one milestone |
| SO3-F — persons employed / with regular income from entrepreneurship (**20 by end of 3 years**) | RMTH-SO3-0 | near-identical statement (the Copy's has both "employed" and "regular income"); a three-year figure, not quarterly |

In `English_form` and not in the Copy: SO1-A1 (see below), SO1-B1 (%),
SO1-B1.1, SO2-0 (%), SO2-C1 (%), SO3-E0.2 and SO3-E0.3. E0.3's code is the
**forms workbook's**: its row in `English_form` has the statement and an
empty `No.` cell.

**Reporting periods.** Neither sheet states Ramtha's programme dates; the
target columns run 27/Q1–28/Q4, exactly as Sahel Horan's do. 0131 seeds the
same thirteen quarters (26/Q3–29/Q3) as separate rows, so the two plans
lock independently.

### SO1-A1

`English_form` has a row `RMTH-SO1-A1` with a code and nothing else — no
statement, no type, no definition. Same shape as Sahel Horan's C1.3. 0131
seeds it as an indicator whose name says so in both languages, with no
formula, no source and no view; 0132's `v_rmth_indicator_status` gives it
`reason = 'no_statement'`, and the dashboard lists it greyed with the gap
named rather than leaving a hole between SO1-0 and A1.2.

### Two things the workbook has that the platform corrects silently, and one it does not

- The activity row for E is labelled **"Activity D"** in the workbook while
  its own code and every code under it are `RMTH-SO3-E…`. The code E is
  kept and the row's title ("Establishing Small Business Incubators …") is
  stored as `activity.name_en`; the "Activity D" label is stored nowhere.
- `indicator.full_code` (`SHM-SO1-A1.2`, `RMTH-SO1-A1.2`): 0113's header said
  0116 would add it and 0116 did not. 0131 adds it, NOT NULL and unique,
  backfilled for Sahel Horan from `03_INDICATORS.md`'s documented codes.
- **Not corrected:** the plan (§7) says "E0.2 counts one record per
  participant per incubator". The E0.2 sheet's calculation line counts
  **unique participants** who received at least one service, once however
  many services or incubators. The view follows the sheet, which is the
  specification; the plan's line reads as a description of the unit of
  observation (which *is* one record per participant per incubator). If
  the M&E lead wants the record count, it is a one-line change to
  `v_ind_rmth_e0_2`.

**Decides.** Ramtha's M&E lead with ENABEL: which list is the framework,
and then the targets per quarter for it. Until then every Ramtha target
stays null. **Never** enter a target from the Copy against an
`English_form` code because the words match.

---

## 🟠 OQ-49 · The evidence store works from the browser; the production origin and the two numbers behind the stop remain

**Added 14 September 2026**, with migration `0128` and the `evidence` Edge
Function.

Evidence files are stored on Cloudflare R2. Everything on our side is in
place — the compression, the presigned upload, the confirm-and-record, the
9 GB stop in the database, the settings figure — and every upload today
answers *"Evidence storage is not configured yet"*, naming the four Edge
Function secrets, because they have not been set:

| secret | what it is |
|---|---|
| `R2_ACCOUNT_ID` | the Cloudflare account id; the endpoint is `<account>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | an R2 API token with Object Read & Write on this one bucket |
| `R2_BUCKET` | the bucket name |

plus a **CORS rule on the bucket** allowing `PUT` (and `Content-Type`) from
the app's origins, because the browser PUTs to R2 directly. Set in the
Supabase dashboard under the function's secrets, never in git.

**Where it stands, 15 September 2026.** The four secrets are set: the
function signs upload URLs, and the whole path was driven through the real
store as the super admin — presign, PUT, confirm-as-the-user (the row landed
with the municipality, the uploader and an `insert:super_admin` audit row),
the signed download (byte-identical, with the file's own name and type), the
list on the screen, the settings figure ("1 KB of 10 GB · 1 file", largest
by table and by record), remove (soft delete plus the object), and the two
limits in a rolled-back transaction: a file landing exactly on 9 GB is
accepted, one more byte is refused with `53100` and the message naming the
administrator, and 1 048 577 bytes is refused by the check constraint. RLS:
the Ramtha admin sees neither the Sahel Horan file nor its bytes in the
per-municipality breakdown; the platform total is what everyone sees, by
design.

**Both dev origins are in the rule since 16 September 2026** (5173 and
5174, per the account holder); only the production origin remains. The
paragraph below is the 15 September record of the first origin.

**The CORS rule is set, for one origin.** Later on 15 September the bucket
answered a preflight from `http://localhost:5173` with the right headers
(PUT, GET, HEAD; `content-type`; one hour), and from that origin the whole
path ran **from the browser**: a 6.5 MB photograph on a Sahel Horan milestone
landed as 232 KB (`original_size_bytes` 6 481 309, `size_bytes` 231 748), a
4.5 MB one on a Ramtha cycle as 186 KB, both rendered back at 1600 px from
the signed URL, both scoped -- the Ramtha admin saw one and the Sahel Horan
coordinator the other two, in a rolled-back transaction as those roles. A
2.1 MB "other" file and a 12-page scanned PDF that rasterised to 11.6 MB
were refused with both sizes and the limit, before any request was made.
All test files were removed through the panel and the store confirmed each
object gone (`object_missing`).

The mismatch was not the rule's fault. The repository pinned no port, so
`npm run dev` took 5173 when free and **5174 silently when not** -- a second
server beside a running one came up on an origin the bucket had never heard
of. `app/vite.config.ts` pins 5173 with `strictPort` since 16 September, so
a second server refuses to start rather than drifting. The dev origin is
`http://localhost:5173`, and 5174 is listed below only so a stray server on
it fails for some other reason than CORS.

**The rule to paste** (R2 → the bucket → Settings → CORS policy → edit as
JSON). Replace the placeholder line with the Netlify site's origin when the
domain is set; until then leave it out entirely, because a wrong origin in
the list is silently ignored rather than reported:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://REPLACE-WITH-THE-NETLIFY-ORIGIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

**The probe**, one origin per run, no app needed. The account id is the
host of every signed URL the function returns; the bucket is `evidence`:

```bash
curl -s -o /dev/null -D - -X OPTIONS -H "Origin: http://localhost:5174" -H "Access-Control-Request-Method: PUT" -H "Access-Control-Request-Headers: content-type" "https://3d29f16de77022031f4f442e9cbb9f3c.r2.cloudflarestorage.com/evidence/probe" | grep -i "^HTTP\|access-control"
```

A pass is `HTTP/1.1 204 No Content` followed by
`Access-Control-Allow-Origin: http://localhost:5174` and the methods and
headers echoed back. The failure is `HTTP/1.1 403 Forbidden` and nothing
else -- no `Access-Control-*` line at all. Run it once per origin in the
list, and once with an origin that is NOT in it to see that the bucket says
no to strangers. Verified this way on 15 September: 5173 passed, 5174 and
`https://example.org` were refused.

```json
[
  {
    "AllowedOrigins": ["https://<the app's production origin>", "http://localhost:5174"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

`GET` is not needed: a download is a signed URL opened in a new tab, which
is a navigation, not a cross-origin fetch.

**What a CORS failure looks like, so it can be recognised.** The app cannot
see the cause: a fetch refused by CORS rejects with a bare `TypeError`,
indistinguishable from being offline, so the panel says *"The upload to the
evidence store failed (network)"* and mentions CORS as a possibility. The
browser console (F12 → Console) is the only place the cause is named, as an
error in this shape:

> Access to fetch at 'https://…r2.cloudflarestorage.com/evidence/…' from
> origin 'http://localhost:5174' has been blocked by CORS policy: Response to
> preflight request doesn't pass access control check: No
> 'Access-Control-Allow-Origin' header is present on the requested resource.

followed by `net::ERR_FAILED` on the same URL. In the Network tab the
request shows as an `OPTIONS` to the bucket answering **403** and no `PUT`
after it. The function is not involved: presign succeeded (the URL in the
message is the signed one) and the bucket refused the browser, not the
upload. The fix is always the rule on the bucket; nothing in this
repository can change the outcome.

**Two defects the first real confirm found, both fixed in the function
(deployed as version 4):**

- `confirm` read the object's size from `Content-Length` on a HEAD, Deno's
  fetch handed the response back without that header, `Number(null)` is 0,
  and the function treated a correctly stored 186-byte file as a size
  mismatch and **deleted it**. It asks the store with a one-byte ranged GET
  now, whose `Content-Range` names the total.
- `presign_upload` signed an upload for a **soft-deleted** record (its
  screen shows it, with Restore, so RLS lets the function see it). It
  answers `record_deleted` now, and the panel offers no Add on a deleted
  record.

**Two numbers were decided here and should be confirmed:**

1. **The stop is 9 GB against 10 GB included, in decimal gigabytes**
   (10^9). Cloudflare's included storage is the smaller of the two readings
   of "10 GB", so decimal trips first. If the account's plan changes, the
   figure is `evidence_quota_bytes()` — one function, one migration.
2. **The per-file limit is 1 MB after compression** (1 048 576 bytes,
   `evidence_file_limit_bytes()`). At that size the store holds roughly
   10 000 files at the stop; uncompressed photographs would have made it
   a few hundred.

**Who is told when the stop is reached.** The refusal names "the platform
administrator (super admin)". There is no email or other alert: the stop is
visible on the settings screen of every staff account and in the refusal
itself, and nowhere else. If somebody wants to know *before* a coordinator
hits it, that is a small addition to the settings screen (a warning band at,
say, 80%), not a migration.

**Decides.** Whoever holds the Cloudflare account, for the secrets; the M&E
lead, for the two numbers.

---

## 🟡 OQ-50 · `v_ind_c1` counts an initiative in any municipality as "reaching six months"

**Added 15 September 2026**, with migration `0134`.

**What the code does.** `v_ind_c1`'s denominator is surveys whose respondent
has a `production_initiative` started at least six months before the
contact date — and that `exists (...)` test is on `pi.person_id` alone, with
no municipality. `followup_indicator_reach` and `person_restore_impact`
repeat the same test, deliberately unscoped, so that the preview and the
figure cannot disagree.

**Why it is a question and not a fix.** `person` is shared between the two
programmes (`09_MULTI_MUNICIPALITY.md` Part 3). A producer with an
initiative recorded under one programme and a follow-up survey under the
other would count in the second programme's C1 denominator on the strength
of the first programme's initiative. Today that cannot happen — Ramtha has
no initiative form, and every `production_initiative` row is Sahel Horan's
— so no figure is wrong. Scoping the view to `pi.municipality_id =
s.municipality_id` is one line, but it is a change to a reported figure's
definition and 0134 did not make it in passing.

**Interim behaviour.** Unchanged, in all three places, kept in step with
each other.

**Decides.** M&E lead — does "supported production activity" mean supported
by *this* programme? If yes, the view and the two functions change together.

---

## 🟠 OQ-51 · The database lets a municipal coordinator manage their municipality's accounts, and the screen is super admin only

**Found 16 September 2026**, verifying that the platform dialog is not a
permission boundary (`09_MULTI_MUNICIPALITY.md` Part 11).

**What the plan and the screen say.** `RAMTHA_IMPLEMENTATION_PLAN.md` §2.5:
*"Super admin can manage accounts … Super admin only."* The accounts tab is
shown to `accounts.manage`, which `permissions.ts` gives to `super_admin`
alone; `/accounts` is behind `RequireCapability('accounts.manage')`; and
`manage-account` — the only way to create a login or set a password —
refuses anyone who is not an active super admin.

**What the database does.** `au_read` and `au_update` (0118) admit
`is_coordinator() and municipality_id = my_municipality()`, and 0118's
header says so on purpose: *"a coordinator reads and edits the accounts of
their own municipality."* `guard_app_user` (0117) then refuses a
non-super-admin only three things: minting a super admin, moving an account
between municipalities, and touching a super admin's row.

Measured as `coordinator@shm.test`, through RLS with `set local role
authenticated` and the claims set, in a transaction that rolled back:

| statement | rows |
|---|---|
| `select` from `app_user` | 6 — the Sahel Horan accounts, not the Ramtha admin, not the super admin |
| deactivate `dataentry@shm.test` | **1** |
| change `viewer@shm.test`'s role to `data_entry` | **1** |
| deactivate `superadmin@platform.test` | 0 — filtered |
| deactivate `admin@ramtha.test` | 0 — filtered |

So a coordinator driving PostgREST directly can deactivate, reactivate and
re-role every staff account of their own municipality (short of a super
admin's), and the only thing stopping them on the platform is that the
screen is not offered to them. **That is the front end as the permission
boundary**, which the standing rule for the chrome forbids — from the
opposite direction to the usual: the database is wider than the screen, not
narrower.

**Why it is not fixed here.** Both fixes are one line and both are a
decision:

- narrow the policy to `is_super_admin()` — the plan's reading, and it
  turns 0118's deliberate sentence into a mistake; or
- widen `accounts.manage` to a coordinator for their own municipality — the
  database's reading, and then a municipal admin gets an Accounts tab whose
  *create* and *set password* actions the Edge Function refuses, so the
  function's gate would have to move too.

A municipal coordinator being able to deactivate a colleague who has left is
a plausible intent; a municipal coordinator being able to demote the other
coordinator is a plausible accident. Nothing in the source documents says
which.

**Interim behaviour.** Unchanged. The screen stays super admin only; the
policy stays as 0118 wrote it. Nothing today depends on the gap — every
coordinator account is a test fixture.

**Decides.** Project owner, with the Municipal Coordinator: may a municipal
coordinator manage their own municipality's accounts (which ones, and which
actions), or is that the super admin's alone? Then the policy or the
capability moves to match, and the other is left as the record of the
decision — not both edited to agree with whichever was easier.

**Grep for it:**

    select policyname, pg_get_expr(polqual, polrelid) from pg_policies pol
      join pg_policy p on p.polname = pol.policyname
     where schemaname = 'public' and tablename = 'app_user';

---

## 🟠 OQ-52 · The UNHCR number has no format check, because no source gives the format

**Added 21 September 2026**, with migration `0138`.

**What the sheets say.** Khalidiyah's `01_GUIDANCE` collects a national ID
*or* a UNHCR registration number, and three sheets (SO3-F2, SO4-G1,
SO4-H2) carry `id_number` with that choice. No sheet, and neither workbook,
says what a UNHCR number looks like.

**What was built.** `person.unhcr_number`, text, unique where present, and
`national_id` nullable so that a person may hold either or both
(`person_has_identifier`). The number is normalised by a trigger — trimmed,
upper-cased, internal whitespace collapsed — so two spellings of one number
cannot be two people, and it is immutable under the same rule as the
national ID (`guard_person_national_id`, extended from its live body). It
is **not** pattern-checked. An invented regex would refuse real numbers at
the registration desk, which is the worse failure: OQ-27 is what a
too-strict identifier rule does to a queue.

**What the form does instead.** The identifier type is an explicit choice
on the form (`id_type`), never inferred from the digits, so a nine-digit
UNHCR number is not mistaken for a national ID.

**Decides.** The Municipality's community coordinator, with UNHCR Jordan:
the format (or formats) a registration number takes. Then a check
constraint, applied to new rows only — and a sweep of what is already on
file before it is applied to old ones.

---

## 🟡 OQ-53 · A bare "Other" on a Khalidiyah sheet requires a specification

**Added 21 September 2026**, with migration `0141`.

**What the sheets say.** 81 of the response options carry a blank ("Yes —
names: ____", "Cancelled — reason: ____"), say *(specify)* or *describe*,
or are simply **Other**. 26 of those are the bare word, with nothing after
it, and the sheets are not consistent about which "Other" gets a
*(specify)*.

**What was built.** All 81 have `allows_free_text = true`, and choosing
one requires the record's `<field>_other` text (`guard_rmth_other` on the
columns, `guard_khld_option` on the multi-selects). A bare "Other" is
treated exactly like "Other (specify)". The alternative — an "Other" that
cannot say what it was — is the OQ-28 defect, and an option that records
only that something unlisted happened is a figure nobody can disaggregate.

**Why it is a question.** It is a stricter rule than the paper: an
enumerator who ticks Other on paper and writes nothing can file the paper
and cannot save the screen. The 26 are the ones to confirm.

**Decides.** M&E lead. If any of the 26 should stay a plain answer, it is
one `update ... set allows_free_text = false`, recorded in
`catalogue.LIST_FIXES` so the generator still reproduces `0141`–`0143`
(the `d2_duplicate_check.yes` correction in `0147` is the pattern).

---

## 🟡 OQ-54 · Khalidiyah asks disability the Washington Group way; Sahel Horan and Ramtha do not

**Added 21 September 2026**, with migration `0141`.

**What the sheets say.** Khalidiyah's disability question is the Washington
Group short set — *"Do you have difficulty doing any of the following:
seeing, hearing, walking or climbing steps, remembering or concentrating,
self-care, communicating?"* — with four degrees and *Prefer not to say*.
Sahel Horan's `ref_disability_type` is a list of impairments, and Ramtha's
list follows Sahel Horan's, because neither of those workbooks named an
instrument.

**What was built.** `ref_khld_disability` carries Khalidiyah's five answers
verbatim, on Khalidiyah's own rows. It is not mapped onto
`ref_disability_type`, and no Khalidiyah form writes `person.has_disability`
or `person.disability_type_id`. A cross-municipality disability figure
would be adding two different questions, and no report asks for one.

**Why it is recorded.** So nobody "harmonises" the three lists later. The
asymmetry is the workbooks', not a defect: Khalidiyah's instrument is the
international one and it is the other two that name none.

**Decides.** Enabel, if a platform-wide disability figure is ever wanted:
which question the other two municipalities should ask. Until then the
three are reported separately and labelled.

---

## 🟠 OQ-55 · Khalidiyah records nationality and status on its own rows, as at the activity; `person.is_refugee` is not written

**Added 21 September 2026**, with migration `0145` (plan decision D4).

**What the sheets say.** Khalidiyah's status list is *Jordanian (host
community) · Syrian refugee registered with UNHCR · Syrian, not registered
· Other nationality · Prefer not to say*. The shared `person.is_refugee`
boolean cannot express registered versus unregistered — the distinction
the UNHCR number exists for — and `person.nationality_id` reads Sahel
Horan's list.

**What was built.** Every Khalidiyah form that asks status stores the
answer on its own record (`nationality_id → ref_khld_nationality`), at the
time of the activity. A person who registers with UNHCR between two
activities has two different answers, and both are right. Nothing in
`0138`–`0148` reads or writes `person.is_refugee` or
`person.nationality_id`.

**Why it is a question.** Sahel Horan's and Ramtha's refugee figures read
`person.is_refugee`. A person who appears in two programmes could be a
Syrian refugee on a Khalidiyah row and `is_refugee = false` on the shared
row, and each programme's figure would be internally consistent and
mutually contradictory. Today no person is in two programmes.

**Decides.** M&E lead: whether a Khalidiyah status of *Syrian refugee*
(registered or not) should ever update `person.is_refugee`. If yes, it is
a one-way write on save, dated; if no, the two figures are documented as
answering different questions.

---

## 🔴 OQ-56 · Two of the four milestone rules point at fields that cannot be "In place"

**Added 21 September 2026**, with migration `0147` (plan Part 7).

**What the sheets say.** Each milestone sheet ends with a calculation line
naming the checklist items that must all be *In place* for the milestone
to read *Established*, by the sheet's own **No.** column:

| Milestone | Rule, verbatim | Where the numbers land |
|---|---|---|
| SO1-A1 | *"Status = 'Established' only when items 4, 7, 10 and 11 are all recorded 'In place'"* | 4 is `period_covered` (**text**), 10 is `stakeholder_updated` (**date**). Neither can be In place. |
| SO1-B1 | *"Status = 'Established' when items 3, 4, 6, 7 and 8 are all 'In place'"* | 4 is `protocol_ref` (**text**). |
| SO3-E1 | *"Status = 'Established' when items 5, 6, 8 and 10 are all in place"* | All four are checklist rows. |
| SO3-F1 | *"Status = 'Established' when items 3, 5, 7 and 9 are all in place"* | All four are checklist rows. |

The sheets' *Notes* column marks a different set *Required for
Established* on three of the four: **5, 8, 11, 12** on SO1-A1 (the rule's
numbers plus one, and the definition's four components), **3, 5, 7, 8, 10**
on SO1-B1, and **3, 5, 8, 10** on SO3-F1 (`roles_defined` and
`coordination_procedure` rather than `registration_form` and
`assignment_procedure`). The plan (7.1) read SO3-E1 as having no rule at
all; the sheet has one, and it is valid.

**What was built.** `khld_milestone_rule` holds each rule's source text,
its source numbers and its *critical items* as data, and
`guard_khld_milestone_rule` refuses any critical item that is not a
checklist row of that milestone — so the two broken rules are stored with
`critical_items = null`, and `khld_milestone_status` answers
`not_computable` for them, naming the broken references (*"4 =
period_covered (text), 10 = stakeholder_updated (date)"*). SO3-E1 and
SO3-F1 compute as written. The boundary the sheet leaves undefined (7.3)
is: Established when every critical item is In place; Not established when
none is In place or Partly; Partly established otherwise. Only Established
counts.

**Why nothing was inferred.** SO1-A1 looks like its numbers shifted when
fields were inserted, but the shift is not consistent and the Notes column
disagrees with the rule on three sheets. A guessed rule is a milestone in
a donor report.

**Interim behaviour.** The four checklists are fully usable; every row is
recorded. Two milestone statuses read *not computable* with the reason,
and their indicators (KHLD-SO1-A1, KHLD-SO1-B1) will read the same.

**Decides.** M&E lead, per milestone: the critical items, by field name
not number. Deciding is an `update public.khld_milestone_rule set
critical_items = array[...]` as a coordinator — the trigger validates it,
stamps `decided_by` and `decided_on`, and the status computes from the next
read. Never a migration. The SO3-F1 disagreement between the rule and the
Notes column is the third question in the same update.

---

## 🟠 OQ-57 · A person can now exist with neither an age nor a date of birth, when a sheet records a band only

**Added 21 September 2026**, with migration `0148`.

**What the sheets say.** SO4-G1 identifies the enterprise owner by national
ID or UNHCR number and records their age as one of the seven bands (field
6, *Age group*) — no date of birth and no age in years, by design:
`01_GUIDANCE` collects personal data *only where the indicator requires*.
The other two identifying sheets (SO3-F2, SO4-H2) collect a date of birth
or an age.

**What was built.** `person.age_or_dob` (0004) required one of the two for
every person and refused the enterprise owner outright — the `0148` probe
found it. The constraint keeps its name and is widened by one column:
`age_unrecorded_reason`, allowed value `khld_band_only`, which
`khld_ensure_person` sets when a Khalidiyah form creates a person with
neither. A person therefore has an age, or a date, or a **recorded reason
for having neither**; a Sahel Horan or Ramtha insert without an age is
refused exactly as before (the reason is never set for them — the probe
checks that too). The row says why the field is empty rather than carrying
a guessed number, which is `0063`'s rule about by-product rows.

**What it changes elsewhere.** `age_band()` and `khld_age_band()` both
answer `not_recorded` for such a person, so a Sahel Horan or Ramtha view
that ever met one would report them in the not-recorded band. The
Khalidiyah views read the band from the record, where the sheet put it.

**Why it is a question.** The alternative was to ask G1 for a date of
birth the sheet does not ask for, against the guidance's data-minimisation
rule — a form the clerk could not complete from the paper. This was the
smaller change, but it is a change to a shared table's invariant.

**Decides.** M&E lead, with the Municipality: whether SO4-G1 should collect
the owner's date of birth after all (then the column stays as history and
the form gains a field), or whether the band is enough (then this is
closed).

---

## 🟡 OQ-58 · Five Khalidiyah calculation lines number their indicator question wrongly; the marked field governs

**Added 21 September 2026**, with migration `0150`.

**What the sheets say.** Each form's head block gives the calculation, and
five of them name a question by number:

| Form | The calculation says | The field the sheet MARKS (Notes column) |
|---|---|---|
| KHLD-IMP-0 | *"'Strongly agree' or 'Agree' to Q15"* | field 17, `opportunity_increase` — *INDICATOR QUESTION* |
| KHLD-SO1-0 | *"'Strongly agree' or 'Agree' on Q14"* | field 17, `q_improved` — *INDICATOR QUESTION* |
| KHLD-SO2-0 | *"'Very satisfied' or 'Satisfied' on Q9"* | field 9, `overall_satisfaction` — *INDICATOR QUESTION* (agrees) |
| KHLD-SO3-0 | *"Use Q12 as the numerator test"* | field 11, `activities_count` — *INDICATOR TEST* |
| KHLD-SO4-0 | *"'Yes, significantly' or 'Yes, to some extent' to Q20"* | field 22, `overall_opportunity` — *INDICATOR QUESTION* |
| KHLD-SO1-A2 | *"only meetings where Q18 = 'Yes, prepared and filed'"* | field 21, `minutes_prepared` — *Counting condition* |

On four of the five, the number in the calculation is not the number of
the marked field, and on none of the four does the numbered field carry
the options the calculation names (IMP-0's field 15 is `mixed_presence`,
whose options are *Yes, both regularly / Yes, sometimes / ...*; there is
no *Agree* to select). The numbering looks like the question numbering of
an earlier draft of each sheet, before the header fields were inserted.

**What was built.** Every view in `0150` reads the MARKED field, because it
is the one whose options the calculation names and the one the enumerator
is told is the indicator question. The formula stored on
`indicator.formula` is the sheet's text verbatim, wrong number included,
so the dashboard shows the source and the view comment says which field
implements it.

**Why it is a question.** A reader checking a figure against the sheet
will count from the wrong line. It costs nothing in the data; it costs a
conversation every audit.

**Decides.** M&E lead: correct the five numbers in the sheets (Q17, Q17,
Q11, Q22, Q21). Then `indicator.formula` is regenerated from the corrected
workbook by `gen_0149.py`; the views do not change.
