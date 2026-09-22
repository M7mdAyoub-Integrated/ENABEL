# Al Khalidiyah — report at the end of the build

**22 September 2026.** The report `KHALIDIYAH_IMPLEMENTATION_PLAN.md`
Part 12 asks for. The full account, part by part, is
`09_MULTI_MUNICIPALITY.md` Part 12; the decisions that must not be guessed
are OQ-52 to OQ-58 in `06_OPEN_QUESTIONS.md`. This is the short version, for
the M&E lead.

What exists: migrations `0138`–`0151` (fourteen, every one byte-identical
to the ledger), one more written and **not yet applied** (`0152`, section
7), the `evidence` Edge Function at version 5, Khalidiyah's twenty-one forms
as screens with one save path, twenty-one indicators with twenty-one views,
the same dashboard as the other two municipalities with a third entry, a
Milestone rules screen, and a public page that lists what is on. Sahel
Horan's twenty indicators and Ramtha's eighteen are asserted unchanged by
the migrations that could have moved them (section 8).

---

## 1. Which Khalidiyah indicators produce a number, and which cannot

Every figure comes from the database (`v_indicator_progress`, gated by
municipality). No quarterly target exists (section 4), so every figure reads
against *not set*; the Plan's own target is written under each row.

### Nineteen compute

| code | what counts | the gate the sheet states |
|---|---|---|
| KHLD-IMP-0 | % of respondents *Strongly agree* / *Agree* on the marked question, of those who visited the park in the last 12 months | consent given; *Never* visited is outside the denominator |
| KHLD-SO1-0 | % of partner organisations *Strongly agree* / *Agree* on the marked question | one response per partner per round |
| KHLD-SO1-A2 | documented coordination meetings | minutes *prepared and filed*, at least one organisation present |
| KHLD-SO1-A3 | **JOD** received from partners, by receipt date | *received* or *partly received* — a pledge does not enter |
| KHLD-SO2-0 | % of park users *Very satisfied* / *Satisfied* | — |
| KHLD-SO2-C1 | works items completed, over the priority list | status *completed*, on completion date |
| KHLD-SO2-C2 | volunteer rehabilitation campaigns | a *signed attendance sheet* declared |
| KHLD-SO2-D1 | community activities | an *activity report* **and** an *attendance or count sheet* declared |
| KHLD-SO2-D2 | participants (participations), plus **distinct individuals** where the register allowed a duplicate check | — |
| KHLD-SO3-0 | % of registered volunteers with two or more **verified** participations, cumulative | verified from a signed sheet |
| KHLD-SO3-E1 | committee established | items 5, 6, 8, 10 all *In place* |
| KHLD-SO3-F1 | programme launched | items 3, 5, 7, 9 all *In place* |
| KHLD-SO3-F2 | **unique** volunteers with at least one participation, on the first | — |
| KHLD-SO3-F3 | action days | a *signed attendance sheet* **and** a *task completion note* declared |
| KHLD-SO4-0 | % of producers answering *Yes, significantly* / *Yes, to some extent* | the respondent is the vendor |
| KHLD-SO4-G1 | enterprises completing a guidance cycle, on the first | all applicable core sessions attended (computed) |
| KHLD-SO4-G2 | **unique** enterprises with at least one type of support | — |
| KHLD-SO4-H1 | market days | at least one vendor registered |
| KHLD-SO4-H2 | vendor **participations**, plus **unique vendors** beside them | attended in whole or in part |

The two figures the plan warns about are both shown and labelled so nobody
sums them: SO2-D2's participations and its distinct individuals, SO4-H2's
participations and its unique vendors.

### Two cannot, until the M&E lead names their critical items — never zero

| code | the sheet's rule, verbatim | why it cannot be applied |
|---|---|---|
| KHLD-SO1-A1 | *Status = 'Established' only when items 4, 7, 10 and 11 are all recorded 'In place'* | item 4 is *Reporting period covered* (a text), item 10 is *Date the stakeholder list was last updated* (a date). Neither can be In place. |
| KHLD-SO1-B1 | *Status = 'Established' when items 3, 4, 6, 7 and 8 are all 'In place'* | item 4 is *Approval reference* (a text). |

The dashboard shows each as *Not computable: 4 = period_covered (text), 10 =
stakeholder_updated (date)* and links to the Milestone rules screen. The
checklists themselves are fully usable and every row is recorded.

## 2. The milestone defects, as questions for the M&E lead

Each rule is stored as data with its source numbers; the critical items
that are actually applied are a second column, validated so that every
number must be a checklist row of that milestone. Deciding is one control
on `/khld/rules`: tick the items, save. It stamps who and when, and the
status computes from the next read. **Never a migration.**

1. **SO1-A1** — which checklist items must be In place? The rule says 4,
   7, 10, 11 (two of them are not checklist rows). The sheet's own Notes
   column marks **5, 8, 11 and 12** *Required for 'Established'* — the
   rule's numbers plus one, and the definition's four components. The
   platform did not guess.
2. **SO1-B1** — the rule says 3, 4, 6, 7, 8 (4 is a text). The Notes column
   marks **3, 5, 7, 8 and 10**.
3. **SO3-F1** — applied as written (3, 5, 7, 9). The Notes column marks
   **3, 5, 8 and 10** instead — *roles defined* and *coordination
   procedures* rather than *registration form* and *assignment procedure*.
   Confirm or change; the same control.
4. **The boundary** between *Partly established* and *Not established*,
   which no sheet defines. Applied: Established when every critical item is
   In place; Not established when none is In place or Partly in place;
   Partly established otherwise. Only Established counts.

## 3. Five calculation lines number their indicator question wrongly

IMP-0's calculation says *Q15*; the field the sheet marks *INDICATOR
QUESTION* is 17, and 15 (*mixed presence*) has no *Agree* to select. The
same on SO1-0 (Q14 → 17), SO3-0 (Q12 → 11), SO4-0 (Q20 → 22) and SO1-A2
(Q18 → 21). Every view reads the **marked** field; the formula shown on the
dashboard is the sheet's text, wrong number included. Correct the five
numbers in the sheets and regenerate the framework (OQ-58); the views do
not change.

## 4. The targets recorded, and the confirmation that none was split

The framework's quarterly columns are empty for all 21 indicators. **273
quarterly target rows are seeded null**, so the dashboard reads *not set*,
never 0. The targets the Plan does state — *≥ 4 per year (≥ 12 over the
Plan period)*, *≥ 100 volunteers over the Plan period; of whom ≥ 40% women,
≥ 30% youth (15–24) and ≥ 15% refugees*, *20–30 enterprises*, *≥ 70%*, *10
markets (per Annex 1: JOD 2,000 × 10)* — are held as 27 rows of
`indicator_plan_target`, each with the framework's sentence verbatim and,
for 13 of the 21 indicators, the form's Arabic *المستهدف …* sentence. Nothing
was divided into quarters. The eight without an Arabic sentence show the
English one on the Arabic dashboard.

The units were inferred, every one: the framework's Unit column is blank.
`%` for the five percentage statements, **JOD for SO1-A3**, `#` for the
rest.

## 5. The four decisions of plan §0.3, as built

- **D1 — the UNHCR number** is a second identifier on the shared `person`
  table. `national_id` is now nullable; its name, format and uniqueness
  are unchanged, so nothing in Sahel Horan's or Ramtha's forms or public
  lookups moved. **No format check** (OQ-52): no source gives the format,
  and an invented pattern refuses real numbers. The number is trimmed,
  upper-cased and its spaces collapsed, so two spellings of one number are
  one person. **The Sahel Horan and Ramtha forms do not offer it**; a
  UNHCR-only person can be registered through the Khalidiyah forms only.
- **D2 — minors** are refused by the database, not the form: a volunteer
  under 18 on the registration date cannot be saved without the guardian's
  name, relationship, phone, written consent and its date. Minor status is
  derived from the date of birth, never stored. The three consents store
  separately, each stamped with who recorded it and when; a photo refusal
  is visible on the record. **The data-protection obligation** — a
  municipal register of minors with guardians' phone numbers, keyed on
  national ID or UNHCR number — is flagged to whoever owns data protection
  for the platform; nothing here decides it.
- **D3 — age bands.** `age_band()` put every age under 25 into *18-24*;
  no person under 18 existed, so nothing had moved. It names *under_18*
  now, and Khalidiyah's seven bands live in their own function. Sahel
  Horan's and Ramtha's views are asserted unchanged.
- **D4 — nationality and status** are recorded on the Khalidiyah rows, as
  at the activity, from the sheet's own list (*Jordanian / Syrian
  registered with UNHCR / Syrian, not registered / Other / Prefer not to
  say*). **`person.is_refugee` is not written** (OQ-55): whether a
  Khalidiyah answer should ever update the shared column is the M&E lead's
  question, because the two other municipalities' OQ-12 is still open.

## 6. Every string with no Arabic in the source

- The **objectives' and activities' names** — neither workbook names them
  in Arabic. Drafted for the platform (0149), the same position as Ramtha's.
- The **plan-target sentences** of eight indicators (IMP-0, SO1-A1, SO1-A3,
  SO1-B1, SO2-C1, SO2-D2, SO3-E1, SO3-F1) — the forms state no
  *المستهدف …* line for them; the Arabic dashboard shows the English.
- The **sidebar names** of the 21 forms and the words around the controls
  (buttons, notices, the rules screen, the public page) — the platform's,
  written in both languages.
- Everything else on a Khalidiyah screen — questions, options, section
  headings, notes, the indicator statements — is the sheets' own Arabic.

## 7. What is not finished, and what it needs

The Supabase MCP could not be reached from the session that finished the
app, so four things are written and not done:

1. **`0152` — the public view.** `supabase/migrations/PENDING_0152_
   khalidiyah_public_whats_on.sql` is in the repository and **not
   applied**. `check_migration_files.sh` reports it `NOT APPLIED` until it
   is applied through the MCP, renamed with `finish_pending_migration.sh`,
   and its verify block — which drives the view **as anon** and asserts the
   anon surface grew by exactly one view — has run. Until then
   `/khalidiyah` shows its loading state, never an empty list.
2. **The probe rows** the screens were driven with, all created on 22
   September 2026 by `admin@khalidiyah.test` and all still live. They
   should be removed as the owner (plan Part 11, *clean up*), and they are
   the complete list: persons `399000980` (App Probe Volunteer One) and
   `399000981` (App Probe Owner); `khld_volunteer` KHLD-VOL-0001 and its
   participation on KHLD-VC-2027-01; `khld_activity` KHLD-EV-2027-01 (App
   Probe Open Day) with its `khld_attendance` sheet and its `khld_user_
   feedback` row; `khld_campaign` KHLD-VC-2027-01; the SO3-F1
   `khld_milestone_verification` of 20 April 2027; `khld_partner` *App
   Probe Association* and its `khld_partner_survey`; `khld_enterprise`
   KHLD-ENT-001 (App Probe Owner's) with its `khld_guidance_completion`,
   and KHLD-ENT-002 (App Probe Soaps); plus every option, count, checklist
   and rating row hanging off them. Leave the reference counters where they
   are.
3. **The isolation and baseline checks** of plan Part 11: every scoped
   table read as the five account shapes, and the whole of
   `supabase/baselines/2026-09-21_all_before_khalidiyah.md` re-run. 0140,
   0149 and 0150 assert the pieces that could have moved (the two other
   municipalities' figures, the five view hashes, every Sahel Horan and
   Ramtha row of `v_indicator_actual`); the full comparison has not been
   re-run since 0151.
4. **`types/database.ts`** is at head 0135. Every Khalidiyah read and
   write goes through a loosely typed handle by name, so the build is
   clean without it; regenerate and strip when the MCP is back.

And one thing the plan asks for that was not built: the **disaggregation
panel** for Khalidiyah's seven age bands and nationality list. The rows
carry every dimension; the breakdown view does not exist yet, and the panel
says so from the data rather than from a sentence.

## 8. Sahel Horan and Ramtha are untouched

Nothing of theirs was modified except the two shared-table changes the plan
required (D1, D3), and each migration that could have moved a figure
asserts it did not: 0138 (every existing person still has a national ID),
0139 (every per-municipality view hash before and after), 0140 (twenty
Sahel Horan and seventeen Ramtha branches with a third `27/Q1` present),
0149 (the five view hashes), 0150 (every Sahel Horan and Ramtha row of
`v_indicator_actual`). `check_municipality_scope.sql` passes with three
municipalities. The count-gate choice — a **declaration** of the evidence
on the form, not an upload — is the sheets' own wording and is reversible:
the views test the option code, and a rule on `attachment` would replace
it.

---

## What to do next, in order

1. Apply `0152` through the MCP and rename it; open `/khalidiyah` as a
   visitor and publish one activity from its record screen to see it.
2. Remove the probe rows in section 7.2 and re-run the baseline comparison.
3. Decide the two milestone rules and confirm the third on `/khld/rules`
   (section 2).
4. Correct the five question numbers in the sheets (section 3) and
   regenerate `0149`'s successor from the corrected workbook.
5. Answer OQ-52 (the UNHCR format), OQ-55 (`is_refugee`) and OQ-57 (a
   band-only person) — all three are the M&E lead's.
