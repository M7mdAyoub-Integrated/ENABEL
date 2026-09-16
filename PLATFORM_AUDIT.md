# Platform Audit

Database and code, read systematically, September 2026.

Everything below was verified by querying the live database or reading the committed code. Where I could not verify something, I say so.

---

## Summary

**The multi-tenancy work is sound.** I went looking for the class of bug where a query that was correct with one municipality becomes silently wrong with two. Migration `0114` had already found it and closed it before Ramtha's first period row existed.

**I found one false positive of my own** and four narrow residual risks. None is currently producing a wrong number.

**The bigger gaps are in the forms**, not the schema — and one of them undermines the stated purpose of both programmes.

---

# PART 1 — The bug class, and what I checked

## 1.1 The pattern

A query written when there was one municipality can be silently wrong with two. Nothing fails. No error, no exception, no failing test. A number is simply wrong.

Migration `0114`'s header states the specific case better than I could:

> Every leaf view is shaped `from reporting_period rp left join <data> on <date> between rp.start_date and rp.end_date group by rp.code`. Nothing in it says whose periods. The day Ramtha's thirteen quarters are seeded, `reporting_period` holds two rows called `27/Q1`, the join matches every Sahel Horan record against both, and `GROUP BY rp.code` folds the two into one — so A1.3 reads 6 where it reads 3 today, in every quarter, with no error anywhere.

Catching that **before** the second tenant existed is the single most consequential decision in this repo.

## 1.2 What I checked, and the result

| Check | Result |
|---|---|
| Views reading `reporting_period` without anchoring on municipality | **none** |
| Views over scoped tables with no municipality reference | 6, all correct — see 1.3 |
| Unique indexes on scoped tables omitting `municipality_id` | 4, all globally unique by construction — see 1.4 |
| RLS policies on scoped tables missing the municipality check | **1**, documented and deliberate |
| Functions reading indicator views without a municipality filter | **4** — see 2.1 |

## 1.3 The six views without a municipality reference — all correct

- `v_person_public`, `v_person_missing_verification` — `person` is deliberately **shared**. A national ID identifies one human. Correct.
- `v_public_activity_type`, `v_public_producer_type`, `v_public_product` — reference tables, shared vocabulary. Correct.
- `v_upcoming_exhibitions` — reads `exhibition`, which **is** scoped. But it is `security_invoker = true`, so RLS on `exhibition` applies to the caller and a Sahel Horan admin sees only Sahel Horan rows. Correct, though it relies on the invoker property rather than stating the filter.

## 1.4 The four unique indexes — all correct

```
attachment (bucket, object_key)                      globally unique by construction
followup_buyer_connection (survey_id, seq)           parent is already scoped
indicator (full_code)                                deliberately global: SHM-SO1-A1.2
partner_contribution (entity_type, entity_id)        entity_id is a uuid
```

Every other unique index on a scoped table is a primary key on `uuid` or a `client_uuid`. Neither can collide.

## 1.5 My own false positive — worth recording

I reported that `v_indicator_actual` returning **25 distinct codes instead of 20** was a defect.

It was not. The union view carries the gate:

```sql
auth.uid() is null or public.can_see_municipality(i.municipality_id)
```

I queried through the Supabase MCP, which connects **as the owner with no JWT**. `auth.uid()` is null, the gate passes, and both municipalities return. A signed-in admin sees only their own.

This is the same owner-connection trap that has hidden three real defects in this project. It has now also produced one false finding.

**Rule:** a result from the MCP or any owner connection is not evidence about what a signed-in user sees. Any claim about role-gated behaviour must be made with `set local role authenticated` and `set local request.jwt.claims`.

---

# PART 2 — Residual risks

None of these is producing a wrong number today. All four are worth closing.

## 2.1 🟠 Four functions read indicator views without scoping themselves

```
followup_indicator_reach
followup_view_statuses
person_restore_impact
submit_followup
```

The views' own gate covers them **whenever a JWT is present**, which is every normal path. The gap is a service context — a migration, a scheduled job, anything where `auth.uid()` is null — where the gate passes and both municipalities are visible.

`snapshot_period` and `indicator_figures` already filter explicitly. These four should match.

**First establish which read view *rows* and which only read view *definitions* via `pg_get_viewdef`.** A function reading definitions is inspecting metadata and is fine; only row-readers matter.

## 2.2 🟡 `linkage_request.op_read_self` has no municipality check

```sql
using (person_id = my_person_id())
```

A person reading their own rows across municipalities. Documented in `05 §17` as deliberate, same shape as the `exhibition_registration` self policy, and dormant while no participant account exists.

Correct as a decision. Flagged only because it is the single policy that does not follow the rule, and anyone auditing later will stop on it.

## 2.3 🟡 A Sahel Horan coordinator can write a Sahel-Horan-scoped row into a Ramtha table

`save_rmth_record` can be called by any coordinator. The row is invisible to Ramtha, read by no indicator, and offered by no screen.

Deliberately not blocked, and defensible. But record what would change if a screen ever made it reachable, so the reasoning survives the person who made it.

## 2.4 🟡 `v_upcoming_exhibitions` relies on invoker semantics rather than stating its filter

Safe today. But a future change to `security_invoker`, or a definer view built on top of it, would silently widen it. Adding an explicit `municipality_id` filter costs nothing and removes the need to reason about it.

---

# PART 3 — Forms that need editing or questions added

This is where the real gaps are.

## 3.1 🔴 Sahel Horan collects neither refugee status nor disability

**Seven indicators require these breakdowns**: `IMP-0`, `A1`, `A1.3`, `B1.2`, `C1`, `D0.1`, `E0.2`.

**No form collects either.** The columns exist on `person` and are null for anyone entered through a form. The figures on the disaggregation panel come from seeded demo data.

This programme exists because of an assessment on **the inclusion of Syrian refugees in municipal services**. Refugee disaggregation is the point of the work, not a reporting detail.

**Two questions, on two forms:**

| Form | Add |
|---|---|
| Completion form | Refugee status · Disability |
| Exhibition Registration | Refugee status · Disability · Sex · Age |

Exhibition Registration is missing **four of its five** required breakdowns for `E0.2`.

This was built once and reverted on instruction. It is open as **OQ-12** and it needs the Coordinator, not a developer.

## 3.2 🟠 Two Ramtha person-level forms omit required disaggregation

Nine of seventeen Ramtha forms collect vulnerability data. Two that should, do not:

**`SO3-E0.3` Incubator design training** — required disaggregation is *gender; age; type of organisation; role*. It collects all four. **No gap.** Listed here only because it has no vulnerability field, which is correct for a form about institutional staff rather than beneficiaries.

**`SO2-C1` Trainee feedback** — required disaggregation is *gender; age; training cycle; type of support reported*. It collects all four. **No gap.**

So both are fine. The six record-level forms that omit vulnerability are about events, programmes, proposals and incubators — not people — and correctly do not ask.

**Conclusion: Ramtha's forms are complete against their own stated disaggregation.** That is a better position than Sahel Horan.

## 3.3 🔴 Sixteen of seventeen Ramtha forms require evidence, and the upload path is unconfigured

Every Ramtha form except `SO2-0_3month_placement` names required evidence: attendance sheets, photographs, pre/post results, certificates, employer evaluations, signed decisions, licences.

`attachment` is **empty** (the probes of 15 September 2026 were removed from the table and the store; their audit rows remain). The R2 path is built and verified from the browser; the bucket's CORS rule names the 5173 dev origin only and the production origin is outstanding (**OQ-49**).

Two forms verify their indicator **entirely** through evidence:

- `IMP-0` asks *"how was this verified and what is on file"* — employer letter, social security record, sales records
- `SO3-0` does the same for income

Without the document, the claim is unverifiable. Those are the **impact indicators**.

## 3.4 🟠 `SO1-A1` has a code and no indicator statement

Seeded visibly incomplete. Same shape as Sahel Horan's `C1.3`. Nobody can write a form against it because nobody has said what it measures.

## 3.5 🟠 Seven Ramtha thresholds are undefined

All ten threshold rows are seeded null, correctly, and the affected indicators report **not computable** rather than zero.

Undefined: sustained engagement duration · short-term intensive definition · regular income rule · completion criteria (three indicators) · self-employment as placement · programmes versus sessions · employability threshold.

**Nine of eighteen Ramtha indicators wait on one of these.** The forms are built and collecting; the views cannot compute until someone answers.

## 3.6 🟡 Ramtha has no targets at all

`English_form` has none. `English Copy` has them — 4 per year, 80, 40, 15 annually, 65 over three years — against a **different indicator list**.

Seeded as null, correctly. Mapping one onto the other would put an invented target in a donor report. The reconciliation is **OQ-48**.

---

# PART 4 — The Ramtha dashboard must match Sahel Horan

## 4.1 The problem

Ramtha's dashboard was built as a thin screen because the plan said the forms mattered more and the dashboard could be plain. That was the right call at the time. It is no longer.

**It should be the same screen as Sahel Horan's** — same layout, same components, same behaviour, differing only in which municipality's data it reads.

Right now it is not, and a coordinator moving between the two sees two different products.

## 4.2 What Sahel Horan's dashboard has

Rebuild Ramtha's to match, feature for feature:

**Four KPI cards at the top.** Each shows the number, its target, a thin progress bar in the objective's colour, and a delta for the quarter. Each card **is** one of the rows in the table beneath it, looked up by code from the same array — so a card and its row cannot disagree, because there is only one calculation.

**The indicator table, grouped by objective.** Columns: code, name, source form, target, actual, progress bar, status chip. Colour-coded by objective — teal for SO1, green for SO2, amber for SO3, slate for SO4.

**"Not set" never renders as 0.** Both cases: no target row, and a target row holding a stored zero. Both read as not set, with no progress bar. A zero reads as a real target in a donor report and Ramtha currently has **no targets at all**, so every row will take this path.

**"Not computable" for the thresholds.** Where an undefined threshold blocks an indicator, the row says so and names the missing definition. Nine of eighteen Ramtha indicators are in this state. Do not render them as zero.

**Rows with no entry path shown greyed**, with a tag saying so. That gap is information, not something to tidy away.

**The disaggregation panel, below the indicator table.** Sex, age band, and the not-recorded buckets — with the note stating which fields no form collects. Below, not above: the indicators are what the dashboard is opened for.

**Empty and error states.** A failed query shows an error and no numbers — never a partial dashboard, because half a set of indicator figures is not a smaller truth.

## 4.3 How to build it

**Do not write a second dashboard.** Parameterise the existing one by municipality, the way the advisory screens were parameterised by `kind`.

One warning from that work: parameterising made the logic right and the **copy** wrong — an advisory screen ended up telling a coordinator it counted towards `A1.3`. Every string that names an indicator, a table or a source must come from the municipality's own data, not from a literal.

Sahel Horan's dashboard must render **identically** to how it does today. Verify that explicitly rather than assuming.

## 4.4 Responsive and translated

320px first, both languages, RTL correct, no raw locale keys. Ramtha's indicator statements already have Arabic from the workbook's Arabic Copy sheet.

---

# PART 5 — Accounts

Eight accounts exist. Three are the ones that matter for the structure we agreed.

## 5.1 The three that matter

| Account | Role | Municipality | Sees |
|---|---|---|---|
| `coordinator@shm.test` | `coordinator` | SHM | Sahel Horan only |
| `admin@ramtha.test` | `coordinator` | RMTH | Ramtha only |
| `superadmin@shm.test` | `super_admin` | null = all | Both, and can create admins |

## 5.2 The other five

Left from the Sahel Horan build. All scoped to SHM, all active, none needed for the three-role structure.

| Account | Role |
|---|---|
| `dataentry@shm.test` | `data_entry` |
| `enumerator@shm.test` | `enumerator` |
| `viewer@shm.test` | `partner_viewer` |
| `producer@shm.test` | `participant`, linked to Demo Person One |
| `unlinked@shm.test` | `participant`, deliberately unlinked |

`producer@shm.test` and `unlinked@shm.test` are fixtures for the linked and no-link states.

## 5.3 Two things about them

**Passwords live in `app/.env.local` only.** Gitignored and not backed up. Lose that file and all eight need recreating by hand. Copy the coordinator and super admin passwords into a password manager.

**`superadmin@shm.test` is misleadingly named** — it is not scoped to Sahel Horan, its municipality is null. Rename it to something neutral before anyone assumes otherwise.

---

# PART 6 — The recurring failure pattern

Every defect found in this project belongs to one family: **a check that verifies shape rather than substance.**

| # | What passed | What was wrong |
|---|---|---|
| 1 | Migration files existed | Sixteen were three-line stubs |
| 2 | Constraint names were in an error map | Three matched nothing |
| 3 | Comments described behaviour | The behaviour lived nowhere |
| 4 | Arabic keys were all present | Every value was the English string |
| 5 | `ilike '%status%'` returned true | It matched a column name, not a filter |
| 6 | The delete navigated away and toasted | RLS filtered it and wrote nothing |
| 7 | i18n keys compiled and type-checked | They rendered as raw key names |
| 8 | A migration replaced a function cleanly | It started from a copy predating a guard |
| 9 | Every test passed as the owner | A privilege check does not fire for the owner |
| 10 | A placeholder was honest when written | It went stale silently and nothing tests copy |

**The test for any new check: could this pass while the thing it checks is wrong?** If yes, it is not a check.

Number 9 is the one that keeps recurring. It has hidden three real defects and produced one false finding of mine.

---

# PART 7 — What to do, in order

## Code

Done, 15 September 2026: the dashboards are one screen (`routes/Dashboard.tsx`
with the differences in `data/dashboardConfig.ts`); the four functions in
2.1 are settled -- `person_restore_impact` and `submit_followup` were scoped
in `0134` along with `partner_restore_impact`, and `followup_indicator_reach`
and `followup_view_statuses` read view **definitions**, not rows, so there is
nothing to scope; `v_upcoming_exhibitions` names its municipality (`0135`);
`superadmin@shm.test` is `superadmin@platform.test`. The sweep behind 2.1 is
now a check, `supabase/check_municipality_scope.sql`.

What is left, 16 September 2026 -- the whole project, one list, by who acts.

## Code

1. **Evidence on G0.2 and G0.3.** Coordination meetings and case studies are rows in a record log on `/manual-entries` with nowhere to hang the panel; B1.1 and G0.1 have it. An expandable row or a detail route, no migration (OQ-43).
2. **A coordinator can snapshot a period.** `snapshot_period` is correct and `authenticated` cannot execute it, so no period has ever been snapshotted and nothing protects a reported figure. A grant and a button (OQ-44, OQ-25).
3. **The completion form writes its two agricultural fields.** Both are on screen; neither reaches `person` (OQ-45).
4. **The rate limiter answers as itself**, not as `cannot_verify` (OQ-41), and `v_ind_c1` counts an initiative of the survey's own municipality (OQ-50).

## Configuration -- the account holder

5. **The bucket's CORS rule**: `http://localhost:5174` now, the Netlify origin when the domain exists. OQ-49 has the JSON and the probe.
6. **Submit the sign-in form once**, as each kind of account. Everything around it was driven from a cleared browser; the keystroke that types a password is a person's.

## Decisions -- these need people, and no code moves them

7. **Ramtha's seven definitions** (OQ-47): nine indicators say "not computable until decided". M&E lead.
8. **Ramtha's targets, `SO1-A1`'s statement, and the two framework sheets** (OQ-48). M&E lead.
9. **Refugee status and disability on two Sahel Horan forms** (OQ-12): seven indicators, and the purpose of the programme. Coordinator.
10. **Arabic**: the twenty Sahel Horan indicator names (OQ-26, now visible beside a fully Arabic Ramtha dashboard), 138 reference labels (OQ-32), and Ramtha's 613 drafted labels read by its focal point (OQ-46). Native speaker.
11. **The Sahel Horan framework's own conflicts** (OQ-1 to OQ-5, OQ-40): C1.3's definition and target, G0.2's arithmetic, three targets against their deadline, D0.1's form, E0.1's twelve events against six, and an indicator for the advisory tracks. M&E lead, with the donor where a target moves.

Six code items became four; the people's list is the same length it was, because nothing in a repository answers it.
9. **Snapshot and lock a period.** No reported figure is protected today. M&E lead.

## Before real data

10. Remove the demo range, drop the guard trigger, confirm indicators read zero, draw the audit boundary, turn demo mode off
11. Rebuild from migrations alone and diff against production — needs Docker or a preview branch

---

# What I could not check

- **Front-end consumers of the indicator views.** I read the migrations and the database; I did not read every React hook. Whether every dashboard query filters by municipality needs a codebase grep.
- **Whether the four functions in 2.1 read rows or definitions.** That needs their bodies read line by line.
- **Runtime behaviour.** Everything here is static analysis plus live queries. No screen was opened.
