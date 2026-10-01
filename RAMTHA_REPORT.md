# Ramtha — where it stands

**1 October 2026.** Ramtha's forms are now the seven of
`RMTH_Forms_and_Calculations_v2.xlsx`, replacing the seventeen indicator
forms of the first build (14 September 2026; that report is in git
history). The full account is `09_MULTI_MUNICIPALITY.md` Part 14; the
decisions are OQ-77 to OQ-81 in `06_OPEN_QUESTIONS.md`. This is the short
version, for the M&E lead.

What exists: migrations `0174`–`0181`, seven forms as screens with one save
path (`save_rmth_record`), eighteen indicator views, the dashboard, the Open
items screen, and a public page listing the activities a coordinator
publishes. Sahel Horan's and Khalidiyah's figures were asserted unchanged,
row for row, by `0174` and `0180`.

---

## 1. The seven forms

| form | sheet name | what one record is |
|---|---|---|
| FORM-01 | Person Register · سجل المستفيدين | a person, once (national ID, name, sex, year of birth, age group, nationality, disability) |
| FORM-02 | Approved Projects · المشاريع المعتمدة | an approved proposal, `RMTH-PP-001` |
| FORM-03 | Activity Register · سجل الأنشطة | an activity of one of six categories, `RMTH-AC-001`, with a **Publish** switch |
| FORM-04 | Participation Record · سجل المشاركة | a registered person on an activity (an incubator: one service visit) |
| FORM-05 | Participant Feedback · استبيان رأي المشاركين | one response per person per networking event or employability training |
| FORM-06 | Beneficiary Follow-up · متابعة المستفيدين | one follow-up of a registered person |
| FORM-07 | Project Implementer Survey · استبيان منفذي المشاريع | one response about an approved project |

Every label and option is the workbook's own, in both languages. The
sheet's Dependency column is enforced: a question appears only for the
answer that asks it, and the database refuses a stray value. Two fields are
not in the sheet and were added at the owner's request: **PR-07 Full name**
and **PR-06 Do you have a disability?** (OQ-79).

## 2. Which indicators compute, and which wait

**Fourteen compute now**: SO1-0, SO1-A1 (new: it has a statement at last),
A0.1, A0.2, B1, B1.1, B1.2, SO2-0, C1, C1.2, E0.1, E0.2, E0.3, F0.1.
A0.1 and A0.2 are the workbook's numbers for what the framework calls A1.2
and A1.3 (OQ-79).

**Four wait on a definition** — shown as *not computable until decided*,
never zero. Each is one control on the Open items screen
(`/rmth/thresholds`), for a coordinator; no migration.

| indicator | the question |
|---|---|
| IMP-0 | How many months working or earning continuously count as sustained (X)? |
| C1.1 | What is "short-term intensive": at most how many weeks, at least how many total contact hours? |
| SO3-0 | Income in at least how many of the last six months is "regular" (the sheet proposes 4)? |
| F0.2 | Does F0.2 count programmes or sessions delivered? |

The values the definitions table held before today were test values from the
16 September audit; they were cleared (OQ-80).

## 3. Questions for the M&E lead

1. The four definitions above.
2. **Completion criteria** behind PA-03 ("…complete the training and meet
   its completion criteria?") for C1.2, E0.3, F0.1 and SO2-0 — written down
   so two enumerators reach the same answer.
3. **Self-employment** as a placement for SO2-0 (currently not, as the
   formula says).
4. **SO1-A1's type** (set to intermediate result) and what
   **"vulnerability"** should cover beyond disability.
5. Whether a quarterly return wants **increments** for the year-to-date
   indicators, and which **breakdowns** to build first (the fields are
   collected; no breakdown view exists yet).
6. **Targets**: still none in any quarter, and the two framework sheets
   still list different indicators (OQ-48).

## 4. The public page

`/ramtha` lists the activities a coordinator publishes from the Activity
Register, with only what the sheet records: category, type, sector, dates.
An activity leaves the page the day after it ends; a business incubator
stays while published. Nothing on the page is applied for (OQ-81).

## What to do next, in order

1. Decide the four definitions on `/rmth/thresholds`.
2. Write the completion criteria and answer the self-employment question.
3. Have Ramtha's focal point read the drafted Arabic (OQ-78).
4. Reconcile the framework sheets and enter targets (OQ-48).
5. Choose the first breakdowns to build (OQ-80).
