# Ramtha — report at the end of the build

**14 September 2026.** The report `RAMTHA_IMPLEMENTATION_PLAN.md` Part 8
asks for, written after Part 7's verification and clean-up. The full
account, part by part, is `09_MULTI_MUNICIPALITY.md`; the decisions that
must not be guessed are OQ-46 to OQ-49 in `06_OPEN_QUESTIONS.md`. This is
the short version, for the M&E lead.

What exists: migrations `0111`–`0133` (23, every one byte-identical to the
ledger), the `manage-account` and `evidence` Edge Functions, one public site
per municipality, Ramtha's seventeen forms as screens with one save path,
eighteen indicators with seventeen views, a dashboard and an Open items
screen. Sahel Horan's twenty indicators read exactly as they did on 13
September before any of it (section 5).

---

## 1. Which Ramtha indicators produce a number today, and which cannot

Every figure comes from the database (`v_indicator_progress`, gated by
municipality). No Ramtha target is set (section 3), so every figure reads
against *target not set*.

### Eight compute now

| code | statement (short) | counts |
|---|---|---|
| RMTH-SO1-A1.2 | networking events | events not marked *solely guidance*, by start date; an undecided event counts nowhere |
| RMTH-SO1-A1.3 | vocational guidance sessions | sessions, by date; a session inside a larger event still counts 1 |
| RMTH-SO1-B1 | % implementers rating a support component essential | numerator / denominator from the support grid; ∅/0 until an implementer is interviewed |
| RMTH-SO1-B1.1 | specialised training programmes | programmes tailored to an approved project, industrial / agricultural / administrative |
| RMTH-SO1-B1.2 | proposals approved | on **first** approval; a later rejection does not move it |
| RMTH-SO2-C1 | % trainees reporting the training supported them | reached trainees on a completion roster |
| RMTH-SO3-E0.1 | specialised incubators established and operational | by the date achieved |
| RMTH-SO3-E0.2 | participants receiving incubation services | **unique people**, on first admission |

### Nine cannot, until an open item is decided — never zero

The dashboard shows each as *Not computable until decided:* and names the
definition. Deciding is one control on the Open items screen
(`/rmth/thresholds`), by a Ramtha coordinator; no migration.

| code | waits on | open item |
|---|---|---|
| RMTH-IMP-0 | X consecutive months | 1 |
| RMTH-SO1-0 | the form's rule or confirmed placement only | 7 |
| RMTH-SO2-0 | whether self-employment counts | 5 |
| RMTH-SO2-C1.1 | max weeks **and** min hours per week | 2 |
| RMTH-SO2-C1.2 | the written completion rule | 4 |
| RMTH-SO3-0 | months with income out of six | 3 |
| RMTH-SO3-E0.3 | the written completion rule | 4 |
| RMTH-SO3-F0.1 | the written completion rule | 4 |
| RMTH-SO3-F0.2 | programmes or sessions | 6 |

Each was seen to compute the moment its item was decided, through the
screen, in Part 7 — and to go back to *not computable* when the decision
was cleared.

### One has no statement

**RMTH-SO1-A1** is a code and nothing else in the framework workbook — no
statement, no type, no definition. It is seeded so the gap is visible (its
name says so in both languages), with no formula, no form and no view, and
the dashboard lists it greyed as *no statement* (OQ-48).

---

## 2. The seven open items, as questions for the M&E lead

Answered on the Open items screen, each with the date and by whom. Until
answered, the indicator named is *not computable*.

1. **Sustained engagement (IMP-0).** How many consecutive months count as
   sustained? And the Action Plan writes the calculation as a ratio while
   the target is 65 persons — is a **count** what is reported? *Needs
   ENABEL for the second half.*
2. **Short-term intensive (C1.1).** No definition exists. No more than how
   many weeks, and at least how many contact hours per week? Both are
   needed.
3. **Regular income (SO3-0).** The form proposes income in at least four
   of the last six months. Confirm, or change the number.
4. **Completion criteria (C1.2, E0.3, F0.1).** For each: what attendance
   threshold, which assessment result, and (C1.2) job-ready — written so
   two enumerators reach the same total. E0.3's rule must include at least
   one incubator-design module; F0.1's at least one of production
   practices, quality standards or business management.
5. **Self-employment as placement (SO2-0).** The indicator says employment
   or internship; the form keeps *"Yes — into self-employment"* on its own
   line. Does it count?
6. **Programmes or sessions (F0.2).** The framework counts programmes
   developed; the Action Plan counts training sessions delivered. Which
   reading governs? *Needs ENABEL.*
7. **Employability threshold (SO1-0).** The form counts a confirmed
   placement, or one verifiable step plus one other; the Action Plan's
   equivalent counts confirmed employment only. Which?

The full wording, keys and the indicators blocked are OQ-47.

---

## 3. Targets: what is in one sheet and not the other

`RAMTHA Framework.xlsx` has two lists. **English_form** — the list the
forms workbook was built from and the list this platform implements (18
codes) — has **no targets at all**: its target columns, its baseline column
and its *Target (to be deleted)* column are empty on every row. **English
Copy** has targets, for a **different list of 13** lettered statements.
The plan says not to map one onto the other and nothing was: all 234
target rows (18 × 13 quarters) are null, the dashboard reads *target not
set*, and it never reads 0.

For whoever reconciles them:

| English Copy (target) | nearest English_form code | why it was not carried across |
|---|---|---|
| IMPACT — sustained employment/income (**65 persons at the end of 3 years**) | IMP-0 | the only identical statement; the Copy's formula is a **ratio**, the form sheet says "a COUNT, not a rate" (item 1); three-year figure, not quarterly |
| SO1 / SO1-C — persons employed (**15 annually**, listed twice) | SO1-0 | SO1-0 counts *increased employability*, a wider statement (item 7) |
| SO1-A — networking events **and** vocational guidance sessions (**4 per year**) | A1.2 + A1.3 | English_form splits it into two that must never be summed |
| SO1-B — projects developed for employment (**1 annually**) | B1.2 | B1.2 counts *proposals approved* |
| SO2-A — training programs developed for employment (**4**) | C1.1 | C1.1 counts *cycles delivered* jointly developed |
| SO2-B — trainees completing employability training (**80**) | C1.2 | same words; the Copy does not say per quarter, per year or in total |
| SO3-A — entrepreneurship projects established (**10 by end of 3 years**) | — | **no counterpart** |
| SO3-B — training programs developed for entrepreneurship (**2**) | F0.2 | identical statement; the Copy's own definition counts *sessions* (item 6) |
| SO3-C — participants trained in entrepreneurship (**40**) | F0.1 | identical statement; same "per what period" question |
| SO3-D — in-kind support mechanism (milestone, **1**) | — | **no counterpart** |
| SO3-E — incubator established (milestone, **1**) | E0.1 | E0.1 is a *count*; the Copy has one milestone |
| SO3-F — persons with regular income from entrepreneurship (**20 by end of 3 years**) | SO3-0 | near-identical; three-year figure |

In English_form and not in the Copy: SO1-A1, B1, B1.1, SO2-0, C1, E0.2,
E0.3. Neither sheet states Ramtha's programme dates; the same thirteen
quarters as Sahel Horan (26/Q3–29/Q3) were seeded, as separate rows, so the
two plans lock independently.

**What is needed:** the decision which list is the framework, then targets
per quarter for it, entered as data in `indicator_target`. Never a target
from the Copy against an English_form code because the words match.
(OQ-48.)

---

## 4. What could not be built, and what it needs

| what | state | needs |
|---|---|---|
| **Evidence files** | Built end to end: compression in the browser (photo → 1600 px JPEG q75; scanned document → grey 150 DPI PDF; refused over 1 MB with the sizes), a presigned PUT to Cloudflare R2, confirm-and-record as the user, the 9 GB stop in the database, the settings figure against 10 GB with the largest consumers by table and by record. Verified from the browser on 15 September 2026: a 4.5 MB photograph on a Ramtha cycle landed as 186 KB, rendered back, and was seen by the Ramtha admin and not by Sahel Horan. | The bucket's CORS rule names `http://localhost:5173` only: add the production origin (and 5174, this repository's dev port) — OQ-49 has the one-line probe. Two numbers to confirm: the stop at 9 GB of 10 GB in decimal gigabytes, and 1 MB per file. |
| **Targets** | Seeded null | Section 3 |
| **SO1-A1** | Seeded as a code with no statement | A statement from the framework's authors, then a form, a formula and a view |
| **Arabic that is not the Municipality's** | The 613 response options of the 106 Ramtha lists carry drafted Arabic; ten of the eighteen indicator statements are drafted (the workbook's Arabic Copy translates the *other* list, so only IMP-0, C1.2, F0.1, F0.2, SO3-0 and the two halves of A1.2/A1.3 are its words). Every screen reads correctly in Arabic today; the words are the platform's, not Ramtha's. | Ramtha's focal point reads the lists and statements in Arabic and corrects any row — `label_ar` / `name_ar` are data, no migration. (OQ-46.) |
| **A super-admin comparison view** | Not built (plan §6.4, "if it is cheap") | Targets. There is nothing to compare Ramtha against while every target is null. |
| **Ramtha's public page** | A masthead, an empty "open now" list from the shared view, and *check an application I made* | Nothing: none of the seventeen forms is a public journey. If Ramtha later publishes something to apply to, it appears there through the same three tables. |

Two things found by verifying, already fixed in this build:
`v_rmth_indicator_unique` counted a derived field and read one person on
three cycles as three unique people (`0133`, now counted from the person
spine); and `0113`'s header promised a column (`indicator.full_code`) that
no later migration added (`0131`). Both are in `CLAUDE.md`'s register.

---

## 5. Sahel Horan is untouched

Checked at the end of every part and again after Part 7's clean-up,
against `supabase/baselines/2026-09-13_shm_before_ramtha.md`:

- the **20-indicator matrix** (every code, every quarter, actual and
  denominator) hashes to `7d18cdd01205c209ab1f5f3f6e2c169a`, as at the
  baseline;
- `v_indicator_progress` on its original columns:
  `d60f7357f8cea0f70a5f9c3182b490b6`; `v_indicator_disaggregated`:
  `5b35f60334e9c139742d39b5ccb2af1e` — both equal to the baseline;
- every Sahel Horan table's live and soft-deleted row counts equal the
  baseline's (`audit_log` grew, as it must; `applicant_lookup_throttle`
  holds one more ephemeral counter from the public-site probes);
- as the Sahel Horan coordinator, every scoped table returns exactly its
  Sahel Horan rows and no Ramtha row; every Ramtha table 0; the Sahel Horan
  dashboard, forms, follow-up surveys, public page and sign-in screens
  render the same components they did. The one visible addition on a
  shared screen is the evidence storage card on Settings, which the brief
  asked for.

  **Corrected 15 September 2026.** "Render the same components" was true
  and not enough. Six of those Sahel Horan screens rendered *0 of 0 — no
  records yet*: `0113`'s composite foreign keys had made every PostgREST
  embed between a scoped child and its parent ambiguous, and the refusal
  rendered as an empty list rather than an error. Found and fixed on
  15 September (`09_MULTI_MUNICIPALITY.md` Part 9); the figures above were
  never affected, because the views do not embed.

Every Ramtha test row was removed as the owner under the one sanctioned
hard-delete exception; Ramtha's 221 view rows read zero or null, its ten
open items are undecided as seeded, and `person` is back at 7 rows, 3
soft-deleted.

---

## What to do next, in order

1. Add the production origin to the bucket's CORS rule (it names
   `http://localhost:5173` only; the path was driven from that origin on
   15 September 2026 and works end to end) and confirm it with the probe in
   OQ-49.
2. Decide the seven open items on `/rmth/thresholds` (section 2).
3. Reconcile the two framework sheets and enter targets (section 3).
4. Have Ramtha's focal point read the Arabic of the 106 lists and the ten
   drafted statements (OQ-46).
5. Give SO1-A1 a statement, or remove it from the framework.
