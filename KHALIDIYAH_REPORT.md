# Al Khalidiyah — report at the end of the build

**22 September 2026.** The report `KHALIDIYAH_IMPLEMENTATION_PLAN.md`
Part 12 asks for. The full account, part by part, is
`09_MULTI_MUNICIPALITY.md` Part 12; the decisions that must not be guessed
are OQ-52 to OQ-58 in `06_OPEN_QUESTIONS.md`. This is the short version, for
the M&E lead.

What exists: migrations `0138`–`0152` (fifteen, every one byte-identical
to the ledger), the `evidence` Edge Function at version 5, Khalidiyah's
twenty-one forms as screens with one save path, twenty-one indicators with
twenty-one views, the same dashboard as the other two municipalities with a
third entry, a Milestone rules screen, and a public page that lists what is
on. Sahel Horan's twenty indicators and Ramtha's eighteen read exactly as
they did in the baseline taken before any of it (section 8).

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

## 7. Verification, and the one thing not built

Done on 22 September 2026, after the app was finished:

0. **Every one of the 21 forms** was driven through its screen with every
   field filled, saved through `save_khld_record`, and read back column by
   column on its record screen — the plan's own bar for a form. The
   dependencies were built in order (an activity before its count sheet
   and its feedback, a market before its vendor, a volunteer before an
   action day and a tracking sheet, a works item before a contribution),
   and the refusals were seen on screen: IMP-0 without consent, IMP-0
   *Never visited* with the skipped block filled, a second attendance
   sheet for one activity. The edit path was checked on F2, C2 and A1 —
   one field changed, every other value, count cell, checklist row and
   part still there.

   One gap found and closed on the screen: a sub-field that belongs to
   the branch NOT chosen — a fee on a stall marked *free of charge*, a
   repeat count with the duplicate check *not yet done*, IMP-0's park-use
   block under *Never visited* — was accepted with a value in it. The
   database refuses a missing one (`guard_khld_rules`) and does not refuse
   a stray one, so the dependency is now written once, in the catalogue
   (`when=` on 44 controls across IMP-0, C1, C2, D2, SO3-0, F3, G1, G2, H1
   and H2), and the screen dims and disables a control whose governing
   answer is not chosen and sends it blank. Seen on screen: H2's fee input
   disabled until *No — fee paid*; IMP-0 with its block filled and then
   *Never* chosen saved with the block empty. The seven applied migrations
   the catalogue generates were confirmed byte-identical after the change.

   The two restore paths were driven as well. F2 with a soft-deleted
   volunteer's national ID: the amber band names her, when and by whom,
   *Restore and continue* brings her back as *On file — name is locked*,
   and the save is then refused with *This person is already registered as
   a volunteer* — her registration is soft-deleted and the key is global
   (restored, never recreated). SO1-0 typing a soft-deleted partner's name:
   `partner_deleted`, the red band's *Restore and continue*, and the second
   save attached the survey to the restored row — one partner with that
   name in the table, not two. The evidence flow was driven on a
   Khalidiyah record against the real store: presign, the browser's PUT to
   R2, confirm, the listing, a signed download, and remove; the attachment
   is soft-deleted and the object gone.

1. **`0152` — the public view** — applied, renamed to its ledger version,
   its verify block run: the anon surface is six views and four RPCs, the
   view is security definer, and **as anon** a published future activity is
   listed while an unpublished, a past and a deleted one are not, with no
   route to the base table. Read through the REST API with the anon key:
   the view answers 200 with the one published probe activity; the base
   table answers 42501. `/khalidiyah` showed it in both languages.
2. **Isolation**, as the five account shapes over 27 Khalidiyah tables
   holding 58 rows, in a rolled-back transaction: the Khalidiyah admin and
   the super admin acting on Khalidiyah see every row; the Ramtha admin,
   the Sahel Horan coordinator and the super admin acting on Ramtha see
   none; the super admin acting nowhere sees every municipality, which is
   the platform's own rule (`can_see_municipality`, 0117). The Ramtha admin
   writing into Khalidiyah — an insert naming Khalidiyah's id, an update of
   its rows, `save_khld_record` with `municipality_id` in the row — left 0
   rows, counted, not trusted from the error.
3. **The probe rows** the screens were driven with are **soft-deleted**, the
   way the Ramtha probes were, as the Khalidiyah coordinator through RLS,
   every row counted: one record per form (two for IMP-0, four for the
   milestones), the entities, and four people (`399000980`–`399000983`);
   0 live Khalidiyah rows after, the live `person` count back at 14. They
   remain under *Show deleted*; the reference counters are left where they
   are. If the M&E lead prefers them gone, that is an owner's delete.
4. **The baseline.** The full comparison against `supabase/baselines/
   2026-09-21_all_before_khalidiyah.md` was re-run after 0152 and the
   clean-up (section 8).
5. **`types/database.ts`** regenerated at head 0152 and stripped; `tsc`
   and `eslint` clean.

One thing the plan asks for was not built: the **disaggregation panel**
for Khalidiyah's seven age bands and nationality list. The rows carry
every dimension; the breakdown view does not exist yet, and the panel says
so from the data rather than from a sentence.

## 8. Sahel Horan and Ramtha are untouched

Compared on 22 September 2026, after 0152 and the clean-up, against
`supabase/baselines/2026-09-21_all_before_khalidiyah.md`:

- the 37-line indicator matrix (`v_indicator_actual`, both municipalities):
  `c9d7dedc923819cf9a0b5164d47a38c1` — **identical**;
- every one of the seven per-municipality view hashes — `v_indicator_actual`
  SHM `0bad6f26…` / RMTH `7a7e1045…`, `v_indicator_progress` SHM
  `15987387…` / RMTH `80111f91…`, `v_indicator_disaggregated` SHM
  `208d1a04…`, `v_rmth_indicator_status` `1edea0a1…`,
  `v_rmth_indicator_unique` `661c10c7…` — **identical**;
- every non-`ref_` table's live / soft-deleted counts identical, except the
  lines the baseline said would grow — `activity` 12→20, `objective` 9→14,
  `indicator` 38→59, `indicator_target` 494→767, `reporting_period` 26→39,
  `municipality` 2→3, `app_user` 8→9, `audit_log` — and `person` 14/3 →
  14/7: the four probe people, soft-deleted, the live count unchanged.

Nothing of theirs was modified except the two shared-table changes the plan
required (D1, D3), and each migration that could have moved a figure also
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

1. Decide the two milestone rules and confirm the third on `/khld/rules`
   (section 2).
2. Correct the five question numbers in the sheets (section 3) and
   regenerate `0149`'s successor from the corrected workbook.
3. Answer OQ-52 (the UNHCR format), OQ-55 (`is_refugee`) and OQ-57 (a
   band-only person) — all three are the M&E lead's.
4. Say whether the soft-deleted probe rows (section 7.3) should be removed
   outright.
5. Ask for the breakdown view when the disaggregation panel is wanted
   (section 7).
