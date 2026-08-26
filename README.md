# SHM M&E Platform

Monitoring and evaluation platform for **Sahel Horan Municipality, Jordan**.

It backs the *Action Plan for Enhancing Local Economic Participation Through
Agriculture and Food Production* — EU-funded, implemented with **Enabel**,
running **1 August 2026 to 1 September 2029**.

The platform does three jobs:

1. Collects records through seven forms.
2. Computes **20 indicators** from those records, broken down by sex, age,
   refugee status and disability.
3. Produces a quarterly return for the donor.

New here? Start with [`00_START_HERE.md`](00_START_HERE.md), then
[`01_PROJECT_CONTEXT.md`](01_PROJECT_CONTEXT.md).

---

## Status at a glance

| Layer | State |
|---|---|
| Database | **Complete.** 42 migrations applied, RLS on every table |
| Indicators | 20 indicator views + a filterable `indicator_figures()` function |
| Front end | Built; **2 of 7 forms on live data**, the rest still on mock |
| Auth | Built and working, but **switched off** by demo mode |

---

## Database

- **42 migrations**, numbered and append-only, in [`supabase/migrations`](supabase/migrations).
- **Row-level security on every table**, including reference tables. Five app
  roles: `coordinator`, `data_entry`, `enumerator`, `partner_viewer`,
  `participant`. `anon` holds no grants at all.
- **Soft delete everywhere.** Every table has `deleted_at`; nothing is ever
  hard-deleted. `audit_log` is insert-only and cannot be modified by anyone.
- **20 indicator views** (`v_ind_*`) plus `v_indicator_actual`,
  `v_indicator_disaggregated` and `v_indicator_progress`.

The counting rules live in SQL and nowhere else. Nothing in the front end
computes an indicator — see [`03_INDICATORS.md`](03_INDICATORS.md) for why the
distinction between "distinct people" and "rows" matters.

### Migrations are append-only

Never edit a migration that has been applied. Write a new one. A revert is a
forward migration, not a rewrite.

---

## Front end

React + TypeScript + Vite + Tailwind v4, in [`app/`](app). Bilingual
English/Arabic with full RTL.

### Which forms are on live data

Phase 4 wires the seven modules to the database one at a time. **A module on
mock data looks like it saves and does not.**

| # | Module | Status |
|---|---|---|
| 1 | Partnerships (training + support) | **live** |
| 2 | Exhibitions | **live** |
| 3 | Training completion | mock — in progress |
| 4 | Exhibition registration | mock |
| 5 | Market linkage | mock |
| 6 | Manual entries | mock |
| 7 | Follow-up survey | mock |

The authoritative version of this table is the comment at the top of
[`app/src/data/moduleRows.ts`](app/src/data/moduleRows.ts) — it sits next to the
code that decides, so it cannot drift.

The dashboard is also still on mock numbers.

---

## Demo mode

**The app currently has no sign-in.** It opens straight into the municipality
view and a single button switches to the participant view, matching the
standalone prototype.

Everything is behind one constant in
[`app/src/demo/demoMode.ts`](app/src/demo/demoMode.ts):

```ts
export const DEMO_MODE = true   // set to false to restore sign-in and roles
```

**To turn it off, set that to `false`.** That is the entire reversal. No
component was deleted and no route removed — sign-in, the route guards,
role-filtered navigation and the account chip are all conditionals on that flag.

### It still signs in

The database is untouched: RLS gates every table and `anon` has no grants, so
without a session every read returns empty and every write is refused. Demo mode
therefore signs in silently as a coordinator test account. That is a **real**
session — `app_user.role` is real and RLS behaves exactly as in production. The
demo simply never shows it.

The producer portal is pointed at one demo person by national ID
(`DEMO_PORTAL_NATIONAL_ID`), because the coordinator account is not itself a
participant.

---

## Running it

```bash
cd app
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev
```

### Environment

`app/.env.local`, which is gitignored. Only `VITE_`-prefixed variables reach the
browser bundle — that is deliberate, and it is what makes it structurally
impossible to leak a server secret through Vite.

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key-here
```

The **anon key is public by design** — it ships to every browser, and RLS is
what protects the data. It is fine in `.env.local`.

> **The `service_role` key must never appear in this repository.** It bypasses
> every RLS policy in the database. Not in `.env.local`, not in `.env.example`,
> not anywhere under `app/`. This project holds national ID numbers for real
> people.

### Commands

```bash
npm run dev        # dev server
npm run build      # typecheck + lint + build; fails on any lint warning
npm run lint       # eslint, zero warnings tolerated
npm run typecheck  # tsc, no emit
```

---

## Repository layout

```
00_START_HERE.md            read this first
01_PROJECT_CONTEXT.md       the Action Plan, the four pillars
02_DATABASE_PLAN.md         schema spec, table by table
03_INDICATORS.md            all 20 indicators: definition, formula, targets
04_DATA_DICTIONARY.md       every field of every form
05_ROLES_AND_RLS.md         the five roles and the policy for every table
06_OPEN_QUESTIONS.md        decisions that must not be guessed
07_BUILD_CHECKLIST.md       the migrations, in order, with verification
08_FRONTEND_BUILD_PLAN.md   responsive and translation standards
CLAUDE.md                   the standing brief — hard rules

app/                        the React front end
supabase/migrations/        42 numbered SQL migrations
shm-install/                the design source of record (prototype)
```

`shm-install/` and the standalone HTML are the **design source of record**. The
front end is a copy of that prototype; if the two disagree, the prototype is
right.

---

## Known gaps

These are deliberate and documented, not oversights:

- **Eight indicators have no data-collection form.** They are typed in by hand
  each quarter and cannot be traced to a record. The dashboard shows them greyed
  and tagged rather than hiding the gap.
- **Refugee status and disability are not collected by any form**, so those
  breakdowns are almost entirely "not recorded". The bucket is shown rather than
  dropped, so the totals still reconcile.
- **`label_ar` is empty across every `ref_*` table**, and `indicator.name_ar` is
  null for all 20. The app falls back to English and logs a warning — it never
  renders blank. Those translations must come from the approved questionnaire
  and the source workbook, not be invented.

Open decisions are tracked in [`06_OPEN_QUESTIONS.md`](06_OPEN_QUESTIONS.md).
