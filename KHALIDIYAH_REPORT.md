# Al Khalidiyah — report after the reviewed workbook

**26 September 2026.** Khalidiyah's forms were replaced by those of
`Khaldia_2_reviewed.xlsx`. The full account is `09_MULTI_MUNICIPALITY.md`
Part 13; the decisions that must not be guessed are OQ-60 to OQ-70 in
`06_OPEN_QUESTIONS.md`. This is the short version, for the M&E lead. The
first build (21 forms, 22 September) is described in Part 12, and its
generators are kept in `supabase/khalidiyah/v1/`.

What exists now: migrations `0153`–`0164` (twelve, every one
byte-identical to the ledger), the `evidence` Edge Function at version 6,
**22 forms** as screens with one save path (FORM-03 and FORM-04 are one,
as the reviewer asked; FORM-20 was taken off the app afterwards at the
owner's request — OQ-71), **20 indicators computing and SO1-0 waiting on
a decision**, the same
dashboard as the other two municipalities, and a public page that lists
what is on and lets residents **register as volunteers**. Sahel Horan's and
Ramtha's figures read exactly as they did before any Khalidiyah work
(section 6).

---

## 1. What the owner decided before the build

| question | answer | where it is recorded |
|---|---|---|
| Who fills FORM-12, -15, -17? | FORM-12 (volunteers) is **public**; the vendor and enterprise forms are **staff** | OQ-61 |
| Keep the old tables beside the new? | **Drop them** | OQ-60, CLAUDE.md hard rule 5 |
| Apply to the live project? | **Yes** | — |
| Minors on FORM-12? | **Follow the sheet** — no guardian block | OQ-62 🔴 |

## 2. The forms

| page (sidebar group) | forms |
|---|---|
| Partnerships and Institutional Sustainability | FORM-01 focal point · FORM-02 partners · FORM-03+04 partner outreach · FORM-05 stakeholder meetings · FORM-21 contributions · FORM-22 milestones register |
| Rehabilitation and activation of the park | FORM-06 rehabilitation checklist · FORM-07 volunteer campaigns · FORM-08 community activities · FORM-09 activity participation · FORM-19 park user survey |
| Volunteer Program | FORM-10 committee members · FORM-11 committee meetings · FORM-12 volunteers (also public) · FORM-13 volunteer attendance |
| Small Business Support | FORM-14 counselling sessions · FORM-15 attendance requests · FORM-23 enterprise support · FORM-16 markets · FORM-17 bazaar beneficiaries · FORM-18 bazaar attendance · FORM-24 producer follow-up |

FORM-20 (partner coordination survey) was removed from the app on 26
September at the owner's request. Its table and view are kept, both empty
(OQ-71).

Every label and option is the sheet's, in both languages. Five strings the
sheet has in English only were drafted in Arabic (OQ-68). The Dependency
column is enforced twice: the screen dims and blanks a field whose answer
is not chosen, and the database refuses it by name (36 rules). The nine
file-upload fields attach evidence under their Field ID, up to the sheet's
"5 max".

## 3. Which indicators produce a number

**20 of 21**, from the Calculation formulas sheet, each in its own view.
**SO1-0 has no source now**: FORM-20 was its only one. It reads *not
measured* in every quarter, never 0, until OQ-71 is decided. No
quarterly target exists, so every figure reads against *not set*; the
Plan's 27 targets are held as written (unchanged from the first build: 273
quarterly rows null, none split into quarters).

| window (OQ-65) | indicators |
|---|---|
| year to date | IMP-0, SO1-0, SO2-0, SO4-0, A3, C2 |
| everything to date | A2, C1 (latest report), D1, D2, F2, F3, G1, G2, H1, H2, SO3-0 |
| milestone, 1 from the quarter it is established | A1, B1, E1, F1 |

Worth knowing when reading them:

- **A2** counts a partner coordination meeting only once its **attendance
  sheet (F120) is attached** — the sheet's filter. Checked as the
  coordinator: 0 → 1 when the sheet is attached, back to 0 when it is
  removed or the meeting is marked internal.
- **E1** reads a founding committee meeting whose minutes (F052) are
  attached, or FORM-22's record.
- **A3, H1, H2** carry a second figure beside the first — contributions,
  markets held, unique vendors — labelled so nobody adds them together.
- **SO3-0** divides by all approved volunteers (the sheet's denominator —
  OQ-66); **G1** uses the sheet's four-core-topic simplification (OQ-67);
  **D1**'s bazaar exclusion is not applied (OQ-69).
- A **public** volunteer registration counts nowhere until staff approve it
  on the record's page.

## 4. What waits on a decision

| | question | who |
|---|---|---|
| 🔴 OQ-62 | a minimum age or a guardian block, **before the public link is printed** | the Municipality with Enabel's safeguarding focal point |
| 🟠 OQ-71 | SO1-0 without FORM-20: drop it from the return, source it elsewhere, or bring the form back | the owner with the M&E lead |
| 🟠 OQ-61 | whether `cannot_verify` needs two wordings; the review workflow | community coordinator, M&E lead |
| 🟠 OQ-64 | F089 "if no then disqualified" conflicts with F090 "Not started yet" — not enforced | M&E lead |
| 🟠 OQ-65–67 | increments per quarter for the cumulative figures; SO3-0's denominator; G1's cycles | M&E lead |
| 🟡 OQ-63 | what "Other ID" is for | community coordinator |
| 🟡 OQ-68 | the five drafted Arabic strings | Arabic reviewer |
| 🟡 OQ-69, OQ-70 | D1's exclusion; committee members as persons | M&E lead |

Still open from the first build and still true: OQ-52 (UNHCR format), OQ-54
(Washington Group disability), OQ-55 (`person.is_refugee`). OQ-56 and OQ-58
are superseded — the forms they concerned are gone.

## 5. Verification

- **Migrations**: `check_migration_files.sh` passes (163 exact, the two
  deliberate exceptions); each generator reproduces its applied file byte
  for byte; `check_municipality_scope.sql` passes as the owner.
- **As the Khalidiyah coordinator**, in rolled-back transactions: a partner,
  an outreach attempt (KHLD-ATT-01), a meeting refused without partners and
  saved with them (KHLD-MTG-2026-01), a campaign with its multi-select, a
  volunteer with the person block (approved on save), an attendance and a
  second one the same day refused, a rule refusal by name
  (`khld_f015_not_applicable`, `khld_f161_not_applicable`), FORM-19 saved
  with consent "No", the review stamped with who and when, a soft delete
  read back, an attachment under F017 accepted and under F124 refused.
  **As anon**: the public registration, its refusals and the option lists
  (`0161`, `0164`). The enumerator's path to the three questionnaires is
  not tested at that role — there is no enumerator account (OQ-59).
- **The app**: `tsc`, `eslint`, the build and its eight checks pass;
  `check-khld-forms` and the soft-delete check were confirmed to fail on a
  removed key and a missing table. All **184 screens** (23 forms × list,
  new, detail, edit × English and Arabic) were opened in a browser against
  a stub backend built from the catalogue — this container cannot reach the
  project — with no raw key and no page error; the one defect it found (the
  lists' "Open" had no key, in Ramtha's lists too) is fixed. The behaviours
  that matter were driven: the first click on an empty form stops,
  *Other* un-dims the contributor's name, consent *No* blanks the survey,
  a rule refusal names its field, the review sends only the status, and the
  public form sends exactly what the function reads.
- **The references** continue after the first build's test entries
  (the first real volunteer is KHLD-VOL-0003): a number once printed is
  not reissued (OQ-60).

## 6. Sahel Horan and Ramtha are untouched

Compared on 26 September 2026 against
`supabase/baselines/2026-09-21_all_before_khalidiyah.md`: the 37-line
indicator matrix `c9d7dedc923819cf9a0b5164d47a38c1` and all seven
per-municipality view hashes — **identical**. `0153` and `0163` each assert
every Sahel Horan and Ramtha row of `v_indicator_actual` unchanged.

## 7. Deployment

The database is live. On 26 September `main` was fast-forwarded to this
branch, at the owner's request, because the production front end is built
from `main`. Before that, Khalidiyah's production screens read tables that
no longer existed. Sahel Horan's and Ramtha's were unaffected throughout.

## What to do next, in order

1. Check the deployed site shows the 22 forms (section 7).
2. Decide OQ-62 before printing the volunteer link anywhere.
3. Answer F089 (OQ-64) and confirm the windows (OQ-65).
4. Give the drafted Arabic to the reviewer (OQ-68).
5. Create an enumerator account and try FORM-19 and -24 as it (OQ-59).
6. Decide SO1-0 now that FORM-20 is off the app (OQ-71).
