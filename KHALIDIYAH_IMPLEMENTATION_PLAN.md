# Khalidiyah Implementation Plan

**This supersedes any earlier draft of this file.** An earlier version said every target was blank, that two indicators had no computable formula, and that milestones fail when any item is missing. All three were wrong and are corrected here. If an older copy exists anywhere in the repo, delete it.

Every claim in this plan was checked against `Khaldia.xlsx`, `Khalidiyah_Indicator_Data_Collection_Forms.xlsx` and the live database before it was written. Where the source is wrong, the plan says so and says what to do instead of guessing.

Work through it in order without stopping for approval. Commit after every numbered part.

---

# PART 0 — Read this first

## 0.1 What Khalidiyah is

Community integration and social cohesion around **Al Khalidiyah Public Park**: partnerships, park rehabilitation, community events, volunteering, and home-based micro-enterprises selling at market days in the park.

Four objectives — the first framework to use SO4 as a programme pillar. **21 forms**, one per indicator, bilingual, with a guidance sheet (`01_GUIDANCE`) that is a specification, not a preamble: standard code lists, field types, a unique-counting rule and a data-protection section.

## 0.2 Who fills the forms — and why that shapes everything

Every one of the 21 forms is completed by **staff, an enumerator, or an organiser** — never by a resident. Even volunteer registration is done by a *"registering body (Municipality, local association, school or youth initiative)"*, and vendor registration by *"a registration desk staffed by the Municipality"*.

So **Khalidiyah has no public self-service forms.** Do not build any. The public page, if built, is read-only (Part 9).

This also means there is no need to touch `applicant_prefill`, `apply_for_opportunity` or any public RPC. Do not change a public security function you do not need.

## 0.3 Four decisions already made

The earlier draft told you to stop and ask about these. They are decided here so this can run in one pass. Implement them; record each in `09_MULTI_MUNICIPALITY.md`; report them in Part 12.

| # | Question | Decision |
|---|---|---|
| D1 | UNHCR number | Add a second nullable identifier beside `national_id`. **Do not rename `national_id`.** Part 2.1 |
| D2 | Where guardian consent lives | On the **registration**, not on `person`. Minor status is derived, never stored. Part 2.2 |
| D3 | Seven age bands vs four | Khalidiyah gets its own band function. `age_band()` is not used for it. Part 2.3 |
| D4 | Nationality as four categories | Recorded on Khalidiyah's own records at the time of the activity. `person.is_refugee` untouched. Part 2.4 |

## 0.4 Stop only for these

- Anything that would change a **Sahel Horan or Ramtha** figure or view hash.
- Something in this plan that is **impossible as written** — say what, and propose the alternative.

Everything else: decide, document, continue, report.

---

# PART 1 — Reconcile and baseline

Before any change:

```
supabase/check_migration_files.sh
supabase/check_municipality_scope.sql
supabase/check_function_reversions.py
git status          — commit anything outstanding on its own first
```

Capture **both** existing municipalities' indicator baselines and all seven view hashes, the way `supabase/baselines/` already does. Both must be byte-identical at the end.

Also record, before touching anything:

- The live body of `age_band`, `guard_person_immutable`, `presign_upload`, and every function that reads `person.national_id`. You will change some of these; you must change them from the **live** body, never from a migration file. That is how `0082` silently reverted `0080`.
- The live definition of the `attachment.entity_type` CHECK constraint, verbatim.
- `select count(*) from person where coalesce(date_part('year', age(date_of_birth::timestamp))::int, age_recorded) < 18` — the number of existing people under 18. Part 2.3 depends on it.

---

# PART 2 — The shared person table

These four changes touch the table all three municipalities share. **Every one must leave Sahel Horan's and Ramtha's figures identical.** Verify after each.

## 2.1 D1 — The UNHCR identifier

**The problem, verified against the database:** `person.national_id` is `NOT NULL`, checked by `^[0-9]{9}$`, and unique. A Syrian refugee registered with UNHCR who holds no Jordanian national ID **cannot be inserted today**. Four Khalidiyah indicators (SO3-F2, SO4-G1, SO4-G2, SO4-H2) count unique people or enterprises keyed on this identifier.

This is not a Khalidiyah gap. It is a gap in the shared table that Sahel Horan and Ramtha have too; Khalidiyah is the first workbook to say so.

**The decision — add, do not rename:**

```sql
person.national_id      -- becomes NULLABLE. Name, format check and unique constraint unchanged.
person.unhcr_number     -- NEW, text, nullable
check (national_id is not null or unhcr_number is not null)
unique (unhcr_number) where unhcr_number is not null
```

**Why not rename `national_id` to a generic `identifier`:** it is read by the lookup RPCs, the throttle hash, `resolvePerson`, `guard_person_immutable`, the demo-range trigger, and every person-level form across two municipalities. Renaming means rewriting dozens of functions — the exact conditions under which `0082` lost a guard. The column keeps its meaning for everyone who has one.

**Details that must be right:**

- **No format regex on `unhcr_number`.** No source gives the format, and an invented pattern rejects real numbers. Normalise only: trim, uppercase, collapse internal whitespace. Record the format as an open question.
- A person may hold **both**. Both immutable once set — extend `guard_person_immutable` to cover `unhcr_number`, starting from its **live** body.
- The Postgres `CHECK` on `national_id` passes for `NULL`, and `UNIQUE` allows many `NULL`s. Confirm both rather than assuming.
- **Check the demo-range trigger** (`trg_person_reserved_demo_range`) against a `NULL` `national_id`. It must not error and must not refuse.
- The staff-side person lookup accepts either identifier, with the identifier type chosen explicitly on the form — never auto-detected from the characters typed.
- Leave `applicant_prefill` and the public path alone. Khalidiyah has no public forms.

**The front end will break, and that is the point.** Regenerate `types/database.ts`. `national_id` becomes `string | null`, and the compiler will name every place that assumed otherwise. Fix each one; do not cast it away. The file regenerates cleanly — `TS2589` was traced to embed depth in postgrest-js, not to staleness.

**Verify:** every existing person still has `national_id`; Sahel Horan's and Ramtha's figures and view hashes unchanged; a UNHCR-only person can be created, found by staff lookup, and counted.

## 2.2 D2 — Minors, guardians and consent

**The problem:** the volunteer registration asks, for anyone under 18, the *"guardian's name, relationship, phone, and written consent."* The platform has no concept of a minor.

**The decision — consent lives on the registration, not on the person.** Consent is given for a specific activity and a guardian can change; a child's age is already derivable from `person.date_of_birth`.

- **Minor status is derived** — age under 18 on the registration date — and **never stored as a flag**, so it cannot drift from the date of birth.
- A registration of a minor is **refused in the database** unless `guardian_name`, `guardian_relationship`, `guardian_phone`, `guardian_consent_given = true` and `guardian_consent_date` are all present. A trigger, not only a form rule — the UI is not the boundary.
- **Require a date of birth on the volunteer registration.** Its field `dob_age` asks for one, and volunteers are where minors are expected. Minor status then comes from the date, not a typed age.
- On the other person forms (SO4-G1, SO4-H2), follow what each sheet asks. Where only an age is collected, minor status is taken from that age, and the existing `age_or_dob` rule still holds. Do not demand a date of birth a form never asked for — it blocks entry for someone who knows only their age.

**Report this to me explicitly.** Recording children's data carries obligations neither other municipality triggered — retention, deletion requests, who may view it. That needs whoever owns data protection, not a developer.

## 2.3 D3 — Seven age bands, and a latent defect in `age_band()`

Khalidiyah's bands, from `01_GUIDANCE`, exact:

```
Under 12 · 12–14 · 15–24 (youth) · 25–34 · 35–49 · 50–64 · 65 and above
```

**A defect found while checking this.** The live `age_band()`:

```sql
case when a is null then 'not_recorded'
     when a < 25 then '18-24'
     when a < 35 then '25-34'
     when a < 45 then '35-44'
     else '45+' end
```

**A 10-year-old returns `'18-24'`.** Every age under 25 falls into that bucket. Harmless today only because nobody under 18 exists. The moment a minor enters the shared `person` table, any view calling `age_band()` over them reports a child as a young adult — silently.

**Do both:**

1. **Khalidiyah uses its own** `khld_age_band()` with the seven bands above. Never `age_band()`.
2. **Close the latent defect.** Add an explicit `'under_18'` branch to `age_band()` — but **only if the count captured in Part 1 is zero**. If it is zero, the change moves no figure; prove it with the view hashes. If it is not zero, change nothing and report the rows.

## 2.4 D4 — Nationality and status

Khalidiyah's list:

```
Jordanian (host community) · Syrian refugee registered with UNHCR ·
Syrian unregistered · Other
```

The shared table has `is_refugee boolean`, which cannot express registered versus unregistered — the distinction the UNHCR number exists for.

**The decision:** record Khalidiyah's status **on Khalidiyah's own records** — the registration or the response — using its own reference list. Do not change `person.is_refugee` or `person.nationality_id`, and do not write to them from any Khalidiyah form.

Status is recorded **as at the activity**. A person who registers with UNHCR later has a different answer next time, and that is correct, not drift.

**Report as an open question:** whether a Khalidiyah status of *"Syrian refugee"* should ever update `person.is_refugee`, which Sahel Horan and Ramtha both read.

---

# PART 3 — Tenancy and the account

## 3.1 Seed the municipality

`municipality`: code `KHLD`, slug `khalidiyah`, both names from the workbook index sheet.

Then verify rather than assume:

- Every scoped table takes a third municipality with no unique-constraint collision.
- `reporting_period` gains Khalidiyah's quarters. Their codes will repeat the other two municipalities' — exactly what `0114` was written to survive. Confirm no view doubles.
- Every RLS policy admits a third municipality through `can_see_municipality()` unchanged. **A policy naming two municipalities explicitly is a leftover from the two-tenant era.**
- With Khalidiyah seeded and **no Khalidiyah data**, every Khalidiyah figure reads zero or not-computable. A non-zero figure means another municipality's rows are reaching it through an unscoped join. Run `check_municipality_scope.sql`.

## 3.2 The Khalidiyah admin account

`admin@khalidiyah.test`, role `coordinator`, scoped to `KHLD`.

**No password in any migration.** `0030_seed_test_users` put a password literal into `supabase_migrations.schema_migrations`, which stores applied SQL verbatim — and it survived the git history rewrite that removed it from the repo. It is still there. Create the account through the auth admin API or the super admin's accounts screen. The password goes in `app/.env.local` only.

---

# PART 4 — Framework, targets and units

## 4.1 The framework sheet

`Khaldia.xlsx` holds 30 rows: 1 impact, 4 outcome, 8 activity headers, 16 indicators, 1 orphan `*` row. Seed them with `KHLD-` full codes.

Source typos — `Outocme`, `Ouput` — seed the corrected type, record the original.

## 4.2 Targets are NOT blank — they are in the forms

The framework sheet's target columns are empty for every indicator. **The forms' calculation lines carry the targets.** This is the same two-source trap as Ramtha's, in the other direction.

| Indicator | Target, verbatim from the form | Basis |
|---|---|---|
| SO1-0 | ≥ 70% | percentage |
| SO1-A2 | ≥ 4 per year; ≥ 12 over the Plan period | annual and plan |
| SO2-0 | ≥ 60% | percentage |
| SO2-C2 | at least 4 campaigns annually during active implementation | annual |
| SO2-D1 | ≥ 12 during the Plan period; ≥ 4 annually from December 2026 | plan and annual |
| SO3-0 | ≥ 40% | percentage |
| SO3-F2 | ≥ 100 over the Plan period, of whom ≥ 40% women, ≥ 30% youth 15–24, ≥ 15% refugees, including persons with disabilities | plan, with sub-targets |
| SO3-F3 | ≥ 12 during the Plan period | plan |
| SO4-0 | ≥ 40% | percentage |
| SO4-G1 | 20–30 enterprises | range |
| SO4-G2 | 20–30 enterprises | range |
| SO4-H1 | 10 markets (Annex 1, JOD 2,000 × 10); pilot April–December 2027, then seasonally to 2029 | plan |
| SO4-H2 | 100–150 vendor participations | range |

**Every one is annual, plan-period, a range, or a percentage. None is quarterly.**

- Store them in a new table, **`indicator_plan_target`**: indicator, the verbatim text, a numeric minimum and maximum where unambiguous, the basis, and the sub-targets as their own rows.
- **Do not split any of them into quarters.** Dividing "≥ 12 over the Plan period" by twelve quarters invents a quarterly target the source never set, and puts it in a donor report.
- `indicator_target` rows for Khalidiyah stay **null**, and the quarterly column reads **"not set"**.
- On the dashboard, where a plan target exists, show it as a secondary line under the indicator — *"Plan target: ≥ 12 over the Plan period"*. It renders only when a row exists, so Sahel Horan and Ramtha are visually unchanged. **Verify that by comparing screens.**
- SO3-F2's sub-targets are recorded, not enforced. There is no disaggregation-target mechanism and this is not the place to build one.

## 4.3 Units

Every unit in the framework is blank. Infer from the formula — `(… ÷ …) × 100` is `%`, a count is `#` — and **record that each was inferred**.

**SO1-A3 is `JOD`**, not a count. Its figure is a sum of money (Part 6).

---

# PART 5 — Rules that apply to every form

This part exists because every rule below was learned from a defect.

## 5.1 Five identity classes — and most forms collect no identity

`01_GUIDANCE`: *"National ID and UNHCR numbers are collected only where the indicator requires a unique count."*

Across the platform, "national ID is the spine" and every person-level form creates or finds a person. **That pattern is wrong for most of Khalidiyah**, and applying it would both break the data-protection rule and create person rows for anonymous survey respondents.

| Class | Forms | What it means |
|---|---|---|
| **Anonymous response** | IMP-0, SO2-0 | No person row. No identifier. Disaggregation fields live on the response row. |
| **Aggregate count** | SO2-D2 | No individuals at all — counts by sex, age band and nationality. |
| **Organisation** | SO1-0, SO1-A3 | Keys on a partner, or a named contributor who may not be a partner. |
| **Person** | SO3-F2, SO4-G1, SO4-H2 | Creates or finds a person by national ID **or** UNHCR number. |
| **Linked** | SO3-0, SO4-0, SO4-G2 | References an **existing** person or enterprise. Collects no new identifier. |
| **Record** | SO1-A1, SO1-A2, SO1-B1, SO2-C1, SO2-C2, SO2-D1, SO3-E1, SO3-F1, SO3-F3, SO4-H1 | Events, meetings, works, milestones. No person. |

Only **three** forms collect an identifier.

## 5.2 Field names become column names — except compound fields

Each sheet gives a field name (`reg_date`, `guardian_consent`, `overall_status`). **Use it as the column name** so a form field and its column can be traced to each other.

But many field names cover several facts. Splitting them is required; jamming them into one text column loses the data, and a JSON blob cannot be disaggregated.

| Field | Question names | Becomes |
|---|---|---|
| `dob_age` | date of birth **and** age | `date_of_birth`; age derived, never stored |
| `guardian_consent` | name, relationship, phone, written consent | `guardian_name`, `guardian_relationship`, `guardian_phone`, `guardian_consent_given`, `guardian_consent_date` |
| `phone` | phone **and** an alternative | `phone`, `phone_alternative` |
| `registered_by` | name, position, organisation, date | four columns |
| `coordinator_ref` | decision number, date, officer | three columns |
| `countersign`, `signatures` | name, signature, date | name and date as columns; the signed paper is an **attachment** |

**Counts "by" a dimension become a child table**, never a column per cell and never JSON:

- `by_sex`, `by_age_sex`, `by_nationality` on SO2-D2 → `khld_attendance_count (event_id, dimension, category, count)`
- `stakeholder_count` "by type" on SO1-A1, `members_by_type` and `members_by_sex` on SO3-E1 → the same pattern

Then the totals reconcile server-side: SO2-D2's `reconciliation` field asks whether the entrance tally, the register and the section totals agree — **compute that**, do not ask it.

**Signatures are not captured digitally.** The signed paper form is filed as evidence; the record stores who signed and when.

Read every sheet for compound fields. The list above is what was checked, not everything that exists.

## 5.3 Count gates — a record that exists is not always a record that counts

Six indicators count a record **only if a condition holds**. These are the equivalent of `met_criteria`, stated in the calculation lines:

| Indicator | Counts only when |
|---|---|
| SO1-A2 | Q18 = *"Yes, prepared and filed"* (minutes filed) |
| SO1-A3 | status is *Received* or *Partly received* — pledges reported separately, never in the total |
| SO2-C1 | status is *Completed* |
| SO2-C2 | a signed attendance sheet exists |
| SO2-D1 | an activity report exists **and** either an attendance sheet or a documented count |
| SO3-F3 | a signed attendance sheet **and** documented tasks exist |
| SO4-H1 | an event record exists **and** the market has at least one SO4-H2 vendor registration |

**Gate on the recorded field that declares the evidence, never on whether a file uploaded.** Making a donor figure depend on an upload succeeding is the shape of the evidence defect where `confirm` deleted a correctly stored file. The attachment is verification of the declaration; the declaration decides the count. Record this as a choice the M&E lead can reverse.

SO4-H1's gate is data, not a declaration: count the market only if SO4-H2 rows exist for it.

## 5.4 Calculated fields are computed, never accepted

Nine fields are typed `calculated` in the sheets:

```
overall_status            × 4   the four milestones (Part 7)
activities_count          SO3-0
hours_total               SO3-0
sessions_attended_count   SO4-G1
completion                SO4-G1
```

Computed server-side, **never accepted from the client**, never editable. A client sending one must be ignored or refused. Verify by sending one.

`completion` on SO4-G1 is a decision with **three outcomes** — completed, did not complete, not yet decided — like `met_criteria` everywhere else. Never a checkbox. It is completed when the enterprise attended **every session flagged as core**; the sessions therefore need a `is_core` flag.

## 5.5 Consent is a set of fields, never one boolean

Three consents on the volunteer registration — `consent_data`, `consent_photo`, `safety_commitment` — and `consent_informed` plus `photo_consent` on the event attendance sheet.

Store each **separately, with a date and who recorded it.** A person may consent to the register and refuse photographs, and the system must be able to say which.

## 5.6 Multi-select junctions

Every multi-select becomes a junction table rewritten by delete-then-insert. **Every one needs a DELETE policy and a read-back guard.**

RLS does not refuse a delete it will not permit — it filters the rows and reports success. Without a DELETE policy, every tick box is permanent, the screen confirms the save, the audit log shows nothing, and the answer is wrong. That shipped once on the survey and once on four other junctions.

Junctions carry no `deleted_at` — re-ticking a box would find the soft-deleted row. The parent is soft-deleted and audited; `audit_log` holds every removed row.

## 5.7 Bilingual from the first line

Every question, option and section heading is **already written in Arabic** in the sheets. This is the first framework that arrives translated.

- Use the Arabic that is there, verbatim.
- Where a string has no Arabic in the source, leave it English and record it. **Do not draft and do not machine-translate** — the OQ-32 rule.
- Run `check-no-raw-keys.mjs` and `check-locale-leaks.mjs`. Keys that compile still render as raw names on screen; that has shipped once.

## 5.8 Reference lists

Use the lists from `01_GUIDANCE` exactly — sex, age group, nationality/status, disability, neighbourhood, partner type, product type — and each form's own options.

**New `ref_khld_*` tables**, never new rows in existing `ref_*` tables. Rows added to a shared list appear in Sahel Horan's and Ramtha's dropdowns.

**Disability is asked functionally** — the Washington Group short set: seeing, hearing, walking or climbing steps, remembering or concentrating, self-care, communicating. It was proposed for Sahel Horan and correctly removed because that workbook named no instrument. Khalidiyah names it. So Khalidiyah uses it and the others keep their plain labels. **Record the asymmetry so nobody harmonises it later.**

## 5.9 Evidence

R2 is live. Wire evidence from the first form, not at the end.

**Two certain failures to prevent:**

- The `attachment.entity_type` CHECK lists every allowed table explicitly. **No `khld_` table is in it.** Every Khalidiyah upload fails until it is extended. Rewrite it from the **live** definition captured in Part 1 — append, never retype. A retyped list that drops a Sahel Horan or Ramtha table breaks their uploads silently.
- `presign_upload` refuses uploads for soft-deleted records by looking up the entity. Extend its entity mapping to every `khld_` table, from its live body.

Compression, the 1 MB ceiling and the 9 GB stop are already built. Do not re-implement them.

## 5.10 Uniqueness

- **Entities** — a volunteer, an enterprise — are unique **globally**, including soft-deleted rows. Re-registering someone deactivated must offer **reactivate**, never a duplicate. A recreated volunteer inflates SO3-F2 permanently.
- **Participations** — a vendor at one market, a volunteer at one action day — are unique **only while live**: `unique (…) where deleted_at is null`. Withdrawal is not a ban.
- **`client_uuid` stays globally unique** on every table. Making it partial lets an offline phone resurrect a withdrawn record.
- `duplicate_check` fields (*"Has this person registered before?"*) are **derived from the lookup**, never asked. Do not ask a person what the database already knows.

## 5.11 Reference numbers

`volunteer_id` and similar assigned references are generated server-side, following `rmth_reference_counter`: RLS on, no policies, reached only through a definer function. **Never reset a counter** — a gap in a sequence is honest; a reused number is not. Do not modify Ramtha's counter; add Khalidiyah's own or generalise additively.

---

# PART 6 — The forms, one by one

**This is the task.** Each form is built from its sheet: every field, the sheet's own field names and Arabic, and the calculation line as the specification for its view.

For each form below, the entry names its table, identity class, what it counts, and anything that will bite.

### Objective 1 — Partnerships

**KHLD-IMP-0 — Community Interaction Survey** · 26 fields · *anonymous response*
Numerator: respondents answering *Strongly agree* or *Agree* to **Q15**. Denominator: respondents who **visited the park at least once in the last 12 months** — a conditional denominator, like B1's. Find the question that records the visit. Report Q13, Q14, Q16 and Q19 alongside.
**The framework calls this formula "Qualitative assessment based on documented evidence." The form gives a quantitative one.** Use the form's, and record the disagreement — the same shape as Sahel Horan's G0.3, where name and formula described different things.

**KHLD-SO1-0 — Partner Coordination Survey** · 24 fields · *organisation*
One response per partner organisation **per year** — unique on `(partner, year)`. Numerator: *Strongly agree* or *Agree* on **Q14**. Q9–Q13 reported as a sub-index. Target ≥ 70%.

**KHLD-SO1-A1 — Partnership Mechanism checklist** · 23 fields · *record* · **milestone — see Part 7**

**KHLD-SO1-A2 — Coordination Meeting Record** · 25 fields · *record*
Cumulative count. **Gated:** only meetings where **Q18 = *"Yes, prepared and filed"***. Partners attending are a multi-select → junction (5.6).

**KHLD-SO1-A3 — Partner Contributions** · 24 fields · *organisation*
**This is a sum of money, not a count.** Annual total value in JOD, by contribution type and by source type. **Gated:** only *Received* and *Partly received* enter the total; **pledges are reported separately and never summed in.**
The contributor may not be a registered partner — store `contributor_name` and an optional partner reference.
Do **not** reuse `partner_contribution`. It feeds Sahel Horan's G0.4 and has a different shape; overloading it would put value fields on a table whose indicator counts partners.
The earlier draft said this indicator had no countable formula. It does; the form states it.

**KHLD-SO1-B1 — Park Arrangements checklist** · 22 fields · *record* · **milestone — see Part 7**

### Objective 2 — The park

**KHLD-SO2-0 — User Satisfaction exit form** · 21 fields · *anonymous response*
One participant at one activity. Numerator: *Very satisfied* or *Satisfied* on **Q9**. Q10–Q13 as dimension scores. Target ≥ 60%. Links to the activity it was collected at; collects no identity.

**KHLD-SO2-C1 — Works Completion** · 20 fields · *record*
One item on the agreed rehabilitation list. **Two figures:** items with status *Completed*, and completed ÷ items on the priority list. Report completed items by facility type. The denominator is the agreed list — if the sheet flags priority, use it.

**KHLD-SO2-C2 — Volunteer Campaign** · 24 fields · *record*
Count of campaigns. **Gated:** only with a signed attendance sheet. Volunteers who took part are **participations** feeding SO3-0 and SO3-F2.

**KHLD-SO2-D1 — Community Activity Record** · 24 fields · *record*
Cumulative count of events. **Gated:** activity report **and** either an attendance sheet or a documented count. Partners → junction. Carries `is_published` for the public page (Part 9), defaulting to false — publishing is a separate deliberate action, never a field on the create form.

**KHLD-SO2-D2 — Attendance Count** · 20 fields · *aggregate count*
**A child of a D1 activity.** Field 1 says *"Activity reference number (must match form KHLD-SO2-D1)"* — make it a **foreign key**, not a typed reference. A typed reference is a mistyped reference.
Counts by sex, by age band × sex, by nationality → the child count table (5.2), using Khalidiyah's seven bands.
**Two figures:** total participations, and distinct individuals *"where the register allows."* The individual register is paper, attached as evidence; distinct individuals is a staff-entered number, counted only when `duplicate_check` confirms the register was checked against previous events. Otherwise not available — never estimated.
Compute `reconciliation` server-side from the counts.

### Objective 3 — Volunteering

**KHLD-SO3-0 — Volunteer Tracking** · 22 fields · *linked* — to a registered volunteer
Numerator: volunteers with **two or more verified participations** — **Q12** is the test. Denominator: **all registered volunteers**. Target ≥ 40%. `activities_count` and `hours_total` are calculated from participation records.

> ⚠ **Two indicators, one register, two different populations.** SO3-F2 counts volunteers with **at least one** participation. SO3-0's denominator is **all** registered volunteers, including those with none. Same table, different filters. Getting them the same is the obvious mistake.

**KHLD-SO3-E1 — Community Committee checklist** · 23 fields · *record* · **milestone — see Part 7**

**KHLD-SO3-F1 — Volunteer Programme checklist** · 22 fields · *record* · **milestone — see Part 7**

**KHLD-SO3-F2 — Volunteer Registration** · 28 fields · *person*
**The form everything in Part 2 was for.** National ID **or** UNHCR number (2.1). Guardian consent for minors, enforced in the database (2.2). Three separate consents (5.5). `volunteer_id` assigned server-side (5.11). `duplicate_check` derived (5.10). Registered once, never per activity.
Counts volunteers with **at least one** recorded participation. Target ≥ 100, with sub-targets recorded (4.2).

**KHLD-SO3-F3 — Action Day Record** · 25 fields · *record*
Cumulative count. **Gated:** signed attendance sheet **and** documented tasks. Volunteers attending are participations feeding SO3-0 and SO3-F2.

### Objective 4 — Home-based enterprises and markets

**KHLD-SO4-0 — Producer Follow-up** · 33 fields · *linked* — to a producer who sold at a market
Numerator: *"Yes, significantly"* or *"Yes, to some extent"* on **Q20**. Q14, Q17, Q19 as components. Target ≥ 40%.
Select the producer from those with at least one SO4-H2 registration — that enforces eligibility and stops a producer being surveyed twice in a round, without collecting a new identifier.

**KHLD-SO4-G1 — Guidance Completion** · 33 fields · *person* — the enterprise owner
One home-based enterprise. Sessions carry `is_core`. `sessions_attended_count` and `completion` calculated (5.4). Counts enterprises meeting the threshold. Report attendance at each session separately. Target 20–30.

**KHLD-SO4-G2 — Enterprise Support Log** · 29 fields · *linked* — to the enterprise
Cumulative, updated at each support event. **Unique** count of supported enterprises. Report by type of support and by the **owner's** sex, age, nationality and disability — which come from the owner's person record through the enterprise. Target 20–30.
The guidance sheet's non-commercial rule applies to this form and SO4-H2 — read it and enforce what it says.

**KHLD-SO4-H1 — Market Day Record** · 29 fields · *record*
Cumulative count. **Gated:** event record **and** at least one SO4-H2 vendor registration. Target 10. Carries `is_published`.

**KHLD-SO4-H2 — Vendor Registration** · 29 fields · *person*
One vendor at one market day — unique while live on `(market_day, vendor)`.
**Two figures from one register:** participations per market, and unique vendor identifiers across all markets. Target 100–150 **participations**. Label both so nobody sums them.

---

# PART 7 — Milestones: the source is wrong, do not guess

Four milestones share one shape: a verification exercise, checklist rows (*In place / Partly in place / Not in place*, each with a date and an evidence reference), and a calculated `overall_status` — *Established / Partly established / Not established*.

Build **one** `khld_milestone_verification` table with a `khld_milestone_checklist_item` child. The milestone code says which milestone. Not four tables.

## 7.1 Three of the four rules cannot be evaluated as written

Each rule names critical items by the form's **No.** column. Checked against the sheets:

| Milestone | Stated rule | Result |
|---|---|---|
| **SO1-A1** | Established when items **4, 7, 10, 11** are *In place* | **Broken.** Item 4 is `period_covered` (**text**). Item 10 is `stakeholder_updated` (**date**). Neither can ever be *In place*. |
| **SO1-B1** | items **3, 4, 6, 7, 8** | **Broken.** Item 4 is `protocol_ref` (**text**). |
| **SO3-E1** | *"Simple count — established"* | **No rule at all.** |
| **SO3-F1** | items **3, 5, 7, 9** | Valid — all four are checklist rows. |

The checklist-only numbering does not rescue them either — SO1-A1 has eight checklist rows, and item 10 and 11 would not exist.

**Coded literally, SO1-A1 and SO1-B1 can never be Established.** They would read zero for the whole programme, with no error anywhere — a rule precise enough to pass any review, pointing at the wrong fields.

## 7.2 What to do

- Store each milestone's **critical item numbers as data**, not in code.
- **Validate them at seed time:** every critical number must point at a checklist row on that milestone. Enforce it with a constraint or trigger so it cannot regress.
- **SO3-F1:** compute `overall_status` from its rule.
- **SO1-A1, SO1-B1, SO3-E1:** the checklist is fully usable — staff record every row. But `overall_status` reports **not computable**, naming the exact broken references. **Do not infer which items were meant.** SO1-A1 looks like its critical items may have shifted when fields were inserted, but the shift is inconsistent and guessing would put a wrong milestone in a donor report.
- Record all three as open questions quoting the rule and the field each number actually hits.

## 7.3 The boundary between Partly and Not established

SO1-A1 says *"otherwise 'Partly established' or 'Not established'"* without defining the line. For SO3-F1, the one computable milestone, use: **Established** when every critical item is *In place*; **Not established** when no critical item is *In place* or *Partly in place*; **Partly established** otherwise. Record it as a default the M&E lead should confirm.

Only **Established** counts toward the indicator.

---

# PART 8 — Indicator views and the dashboard

## 8.1 Views

Each view implements its form's calculation line exactly. Follow the shape of the existing sets, and:

- **Anchor on the municipality.** `from municipality m join reporting_period rp on rp.municipality_id = m.id … where m.code = 'KHLD'`, with every data join scoped. This is `0114`. Without it, three municipalities' periods called `27/Q1` fold together and every figure triples.
- **Every function** joining `reporting_period`, `indicator`, `objective`, `activity` or `indicator_target` filters by municipality. `0134` fixed three that did not.
- Filter `deleted_at` on the **whole parent chain**, not only the fact table. `0025` found fourteen views counting children of deleted parents.
- Apply every count gate from 5.3.
- Where a figure cannot be computed, return a reason, never `0`.

**Computable: 18 of 21** — the impact indicator, all four outcomes, and thirteen of the sixteen activity indicators.
**Not computable, with the reason named:** SO1-A1, SO1-B1, SO3-E1 (broken or missing rule). The orphan `*` row has no form and is not one of the 21.

The earlier draft said IMP-0 and SO1-A3 could not be computed. Both can.

## 8.2 The dashboard

**The same screen as the other two.** Add Khalidiyah to `dashboardConfig.ts`. Do not write a third dashboard.

- Quarterly target column reads **"not set"** — Khalidiyah has no quarterly targets.
- The plan target shows as a secondary line where one exists (4.2).
- **SO1-A3 renders as money** — JOD, three decimals, the platform's convention. Render by `indicator.unit`, and confirm no Sahel Horan or Ramtha row changes.
- Four objectives: reuse the SO4 colour.
- **Every string naming an indicator, table or source comes from Khalidiyah's data**, never a literal. Parameterising the advisory screen once left it telling a coordinator it counted towards A1.3.
- Disaggregation panel below the indicator table, using Khalidiyah's seven age bands and its nationality list.

---

# PART 9 — The public page — build this last

Khalidiyah has no public forms (0.2). A read-only page at `/khalidiyah` showing **what's on**: published community activities (SO2-D1) and market days (SO4-H1). No apply button, no forms, no mention of accounts or signing in.

This adds **one** new anonymous-readable view. Every public-view lesson applies:

- A `security definer` view reading **base tables only**. A definer view wrapping an invoker view does not shield it — `anon` gets `42501`.
- Filter `deleted_at`, `is_published`, the municipality, and past dates.
- Expose title, kind, date, place and description. **No counts, no names, no partners, no participants.**
- Grant `SELECT` to `anon` on this view only. Confirm `anon`'s total grant count rose by exactly one.
- **Test with `set role anon`.** Reading the definition proves nothing; only executing as the role does.

Built last so a problem here cannot block the forms.

---

# PART 10 — Build order

Forms depend on each other. Build in this order:

1. Part 2 — person changes, verified against both existing municipalities
2. Reference lists (5.8)
3. Municipality, account, framework, plan targets (Parts 3–4)
4. **Entities:** partners, volunteers (SO3-F2), enterprises (SO4-G1's owner)
5. **Events:** SO1-A2, SO2-C2, SO2-D1, SO3-F3, SO4-H1
6. **Children of events:** SO2-D2 counts, volunteer participations, SO4-H2 vendors, SO4-G1 sessions and attendance, SO4-G2 support
7. **Surveys:** IMP-0, SO1-0, SO2-0, SO3-0, SO4-0
8. **Milestones** (Part 7), contributions (SO1-A3), works (SO2-C1)
9. Evidence wiring throughout, from step 4
10. Views, then dashboard
11. Public page

---

# PART 11 — Verification

**Read the table, never the screen.** Reading a field list proves a field exists; only reading the row back proves it arrives.

## Every form

Create a record through the screen **filling every field**. Read the row back **column by column**. Edit one field and confirm every other survived — the exhibition edit path once shared a mapping with create and stripped the description and focal point. Soft-delete and confirm the figure returns. Confirm delete is wired in `DetailScreen`'s live-delete map; a delete that navigates away and writes nothing looks exactly like success.

## The counting rules

- SO3-F2: one person at three action days counts **once**.
- SO3-0 and SO3-F2 use **different populations** from one register — prove a volunteer with zero participations counts in SO3-0's denominator and not in SO3-F2.
- SO4-H2 produces **both** figures, and they differ.
- SO4-G2 counts **unique** enterprises.
- Every count gate: a record without its evidence declaration does **not** count; with it, it does.
- SO1-A3: a pledge does **not** enter the JOD total.
- SO4-H1: a market with no vendor registration does **not** count.

## The new ground

- A UNHCR-only person can be registered, found by staff lookup, and counted.
- A volunteer under 18 **cannot be saved** without full guardian details — refused by the database, not the form.
- The three consents store separately; a photo refusal is visible.
- A calculated field sent from the client is ignored or refused.
- SO1-A1 and SO1-B1 report not computable and name their broken references; SO3-F1 computes.
- SO2-D2's age counts use seven bands; Sahel Horan's and Ramtha's use theirs, unchanged.

## Isolation

- As each of **five** account shapes — Sahel Horan admin, Ramtha admin, Khalidiyah admin, super admin acting on each, super admin acting on none — read every scoped table and confirm the counts.
- No admin can write into another municipality — count the rows, do not trust the error.
- **Sahel Horan's and Ramtha's figures and all seven view hashes are byte-identical to Part 1.**
- `check_municipality_scope.sql` with three municipalities.
- `anon` reaches exactly one more view than before, and nothing else.

## Clean up

Remove every test row. All three municipalities back at their baselines. Leave reference counters where they are.

---

# PART 12 — Report

- Which Khalidiyah indicators compute, which do not, and why
- The four decisions in 0.3 — what was built, and what each implies for Sahel Horan and Ramtha
- **The milestone defects**, as questions for the M&E lead, quoting each rule and the field each number actually hits
- The plan targets recorded, and the confirmation that none was split into quarters
- The UNHCR format question
- **The minors data-protection obligation** — flagged to whoever owns data protection
- Whether a Khalidiyah refugee status should ever update `person.is_refugee`
- The count-gate choice (declaration, not upload) as something the M&E lead can reverse
- Every string with no Arabic in the source
- Confirmation that Sahel Horan and Ramtha are untouched

---

# PART 13 — Every past lesson, and where it bites here

Each row is a defect this project already shipped. The right-hand column is where it would recur in Khalidiyah.

| # | The trap | Where it bites in Khalidiyah |
|---|---|---|
| 1 | Migration applied without its SQL in the repo | Every migration here. `PENDING_` file, apply, rename from the ledger. |
| 2 | Constraint name in an error map matching nothing | Every new `khld_` constraint must be in `errors.ts`; `check-constraint-names.mjs` validates it. |
| 3 | A comment claiming behaviour that lives elsewhere | Do not write one. Prove behaviour by running it. |
| 4 | Arabic keys present, every value English | The sheets carry Arabic — use it. Missing stays English and recorded. |
| 5 | A substring match reporting a filter that is not there | Checking the count gates in views — anchor the search. |
| 6 | RLS silently filters a delete | Every multi-select junction (5.6). |
| 7 | i18n keys compile, render raw | Every new screen, both languages. |
| 8 | A function rewritten from an older copy | `age_band`, `guard_person_immutable`, `presign_upload`, the `attachment` CHECK — all from the live body. |
| 9 | **Testing as the owner** | Everything. `set local role authenticated` with jwt claims, rolled back. |
| 10 | A placeholder that goes stale | No "coming soon" on any screen. |
| 11 | A correct schema change making embeds ambiguous | Every `khld_` embed names its relationship hint. |
| 12 | A query correct with one municipality, wrong with more | Every view and function anchors on `KHLD` (8.1). |
| 13 | A rule precise enough to pass review, pointing at the wrong fields | **The milestones (Part 7).** Validate every reference resolves to the right kind of thing. |
| 14 | Two sources disagreeing, one silently used | Targets in the forms, not the framework (4.2); IMP-0's formula (Part 6). |
| 15 | A password in a migration survives a history rewrite | The Khalidiyah admin account (3.2). |
| 16 | An upload's success deciding a figure | Count gates read the declaration, not the attachment (5.3). |
| 17 | `age_band()` mislabelling anyone under 25 as 18–24 | The first minor in the shared table (2.3). |
| 18 | The public-view traps: nested invoker, parent-chain soft delete | The one new public view (Part 9). |

**The test for any new check: could this pass while the thing it checks is wrong?** If yes, it is not a check.

---

## Rules throughout

- Verify as the real role with `set local role authenticated` and `set local request.jwt.claims`, in a rolled-back transaction. **Testing as the owner proves nothing.**
- One exception block around the entire function body, covering any delete.
- Check the database, not the screen.
- Migrations are append-only. Grep and diff the live body before replacing any function.
- 320px first, both languages, no raw locale keys.
- Never compute an indicator in the front end.
- Every embed names its relationship hint.
- Add every new finding to `CLAUDE.md`'s register.
