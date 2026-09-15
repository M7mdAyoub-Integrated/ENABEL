# SHM M&E Platform

Monitoring and evaluation platform for two Jordanian municipalities, built
for EU-funded programmes implemented with **Enabel**:

- **Sahel Horan Municipality** — the *Action Plan for Enhancing Local
  Economic Participation Through Agriculture and Food Production*, running
  **1 August 2026 to 1 September 2029**. Seven forms, **20 indicators**,
  broken down by sex, age, refugee status and disability.
- **Ramtha Municipality** — its employment and entrepreneurship programme.
  Seventeen forms, **18 indicators**. Added 13–14 September 2026.

One database, one application, one public site per municipality. Each
municipality sees only its own records; a super admin can switch between
them. The platform does three jobs for each: collect records through forms,
compute the indicators from those records in SQL, and produce the quarterly
return for the donor.

New here? Start with [`00_START_HERE.md`](00_START_HERE.md). For where the
Ramtha side stands — what computes, what waits on a decision — read
[`RAMTHA_REPORT.md`](RAMTHA_REPORT.md).

---

## Status at a glance

| Layer | State |
|---|---|
| Database | **134 migrations** applied (`0001`–`0133`, plus `0015b`), every file byte-identical to the ledger; RLS on every table; two municipalities |
| Indicators | Sahel Horan: 20 views, all live. Ramtha: 17 views; **8 compute today, 9 wait on a definition the M&E lead has to decide, 1 has no statement** |
| Front end | Sahel Horan: every data-entry screen on live data. Ramtha: all 17 forms saving through the screen, a dashboard, an Open items screen |
| Auth | Sign-in, password reset, six roles, account management for super admins. **Demo mode** signs in silently in development only |
| Evidence files | Built end to end on Cloudflare R2; **not configured** — four secrets and a CORS rule are still to be set (OQ-49) |
| Public sites | `/sahel-horan` (training, markets, advisory, linkage requests, "my applications") and `/ramtha` (open list and "my applications") |

---

## Database

- **134 migrations**, numbered and append-only, in
  [`supabase/migrations`](supabase/migrations). `0001`–`0110` are Sahel
  Horan's; `0111`–`0133` add the second municipality, the sixth role, the
  public routing, Ramtha's tables, forms, framework, views and the evidence
  path. `bash supabase/check_migration_files.sh` confirms every file equals
  what the database applied.
- **Row-level security on every table**, including reference tables. Six
  app roles: `coordinator`, `data_entry`, `enumerator`, `partner_viewer`,
  `participant`, `super_admin`. `anon` holds no grants at all.
- **Every scoped table carries `municipality_id`**, and every policy on it
  checks `can_see_municipality()`. `person` is shared — one national ID is
  one row for both programmes — but what that person did in one programme
  is never shown on the other's pages.
- **Soft delete everywhere.** Every table has `deleted_at`; nothing is ever
  hard-deleted. `audit_log` is insert-only and cannot be modified by anyone.
- **Indicator views**: 20 `v_ind_*` for Sahel Horan, 17 `v_ind_rmth_*` for
  Ramtha, all revoked from client roles; the application reads
  `v_indicator_actual`, `v_indicator_progress`, `v_indicator_disaggregated`,
  and for Ramtha `v_rmth_indicator_status` (why a figure is missing) and
  `v_rmth_indicator_unique` (unique completers beside a completion count).
- **Two Edge Functions** in [`supabase/functions`](supabase/functions):
  `manage-account` (super admins create, deactivate and re-assign staff
  accounts) and `evidence` (presigned uploads to R2, confirm-and-record,
  download, remove).

The counting rules live in SQL and nowhere else. Nothing in the front end
computes an indicator — see [`03_INDICATORS.md`](03_INDICATORS.md) for why
the distinction between "distinct people" and "rows" matters, and
[`CLAUDE.md`](CLAUDE.md) for the register of the ways a check can pass while
the thing it checks is wrong.

### Migrations are append-only

Never edit a migration that has been applied. Write a new one. A revert is a
forward migration, not a rewrite. The procedure — file first, apply the exact
text, rename to the ledger version, run the check — is in `CLAUDE.md`, rule 5.

---

## Front end

React + TypeScript + Vite + Tailwind v4, in [`app/`](app). Bilingual
English/Arabic with full RTL. Deployed with Netlify from
[`netlify.toml`](netlify.toml).

### Sahel Horan

Every screen reads and writes the database. The forms modules
(`/forms/pn`, `/forms/ex`, `/forms/tc`, `/forms/os`, `/forms/gd`) plus the
dedicated screens for sessions, exhibitions and their registrations,
advisory sessions, production initiatives and mentorship, linkage requests,
and the follow-up survey (five sections, built for a phone in a field).
Five indicators (`B1.1`, `F0.1`, `G0.1`, `G0.2`, `G0.3`) have no
data-collection form and are entered on `/manual-entries`, greyed and tagged
on the dashboard so the gap is visible.

### Ramtha

Seventeen forms generated from one catalogue
([`supabase/ramtha/forms.py`](supabase/ramtha/forms.py) →
`app/src/rmth/forms.generated.ts` and both locale files), one save function
(`save_rmth_record`), list / form / detail screens that read the catalogue,
a dashboard that says in words why a figure is missing, and `/rmth/thresholds`
where the seven open definitions are decided. A super admin switching
municipality switches the sidebar, the dashboard and the public-site link.

### Demo mode

In development the app signs itself in as a test account so it can be used
without a login. It is bound to `import.meta.env.DEV`, so a production build
cannot run it, and `npm run build` fails if a real password reaches a
bundle. Everything it changes is a conditional on one flag in
[`app/src/demo/demoMode.ts`](app/src/demo/demoMode.ts) (`DEMO_MODE_REQUESTED`);
set it to `false` to restore sign-in and role gating in development too.

The password comes from `VITE_DEMO_PASSWORD` in `.env.local`, which is
gitignored. `node scripts/demo-as.mjs admin@ramtha.test` switches which test
account demo mode uses. That is a **real** session — `app_user.role` is real
and RLS behaves exactly as in production.

---

## Running it

```bash
cd app
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev
```

### Environment

`app/.env.local`, which is gitignored. Only `VITE_`-prefixed variables reach
the browser bundle — that is deliberate, and it is what makes it structurally
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

The Edge Functions take their secrets from the Supabase dashboard, never from
a file here: `SUPABASE_SERVICE_ROLE_KEY` for `manage-account`; `R2_ACCOUNT_ID`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET` for `evidence`.

### Commands

```bash
npm run dev        # dev server
npm run build      # seven checks, then tsc, eslint (zero warnings) and vite build
npm run lint       # eslint, zero warnings tolerated
npm run typecheck  # tsc, no emit
```

The build's checks each verify a piece of substance rather than shape: that
every constraint the UI maps a message for exists in the schema, that every
soft-deletable table has its guard, that no locale value is silently
English, that no module is missing a locale group, that every Ramtha form
field has a label in both languages, and that no "not built yet" label
points at a route that exists.

```bash
bash supabase/check_migration_files.sh       # every migration file equals the ledger
node supabase/functions/evidence/sigv4.test.mjs   # the presigner against AWS's published vector
PYTHONIOENCODING=utf-8 python supabase/ramtha/gen_forms.py   # regenerate the Ramtha forms
```

---

## Repository layout

```
00_START_HERE.md            read this first
01_PROJECT_CONTEXT.md       the Action Plan, the four pillars
02_DATABASE_PLAN.md         schema spec, table by table
03_INDICATORS.md            all 20 Sahel Horan indicators: definition, formula, targets
04_DATA_DICTIONARY.md       every field of every Sahel Horan form
05_ROLES_AND_RLS.md         the roles and the policy for every table
06_OPEN_QUESTIONS.md        decisions that must not be guessed (OQ-1 to OQ-49)
07_BUILD_CHECKLIST.md       the migrations, in order, with verification
08_FRONTEND_BUILD_PLAN.md   responsive and translation standards
09_MULTI_MUNICIPALITY.md    the second municipality, part by part (0111–0133)
RAMTHA_IMPLEMENTATION_PLAN.md   the brief the Ramtha work followed
RAMTHA_REPORT.md            where Ramtha stands, for the M&E lead
CLAUDE.md                   the standing brief — hard rules and the register
RAMTHA Framework.xlsx       Ramtha's results framework (two lists; see OQ-48)
RMTH_indicator_forms.xlsx   the seventeen Ramtha form sheets

app/                        the React front end
supabase/migrations/        134 numbered SQL migrations
supabase/functions/         manage-account, evidence (Deno)
supabase/ramtha/            the Ramtha form catalogue and generators
supabase/baselines/         Sahel Horan's figures before the Ramtha work
supabase/verification/      the Part 7 probe statements
shm-install/                the design source of record (prototype)
```

`shm-install/` and the standalone HTML are the **design source of record**
for the Sahel Horan screens. The front end is a copy of that prototype; if
the two disagree, the prototype is right.

---

## Known gaps

These are deliberate and documented, not oversights:

- **Ramtha has no targets.** The framework workbook's `English_form` list —
  the one implemented — carries none; its `English Copy` list carries
  targets for a different set of indicators. Nothing was mapped across; the
  dashboard shows *target not set*, never 0. The reconciliation is OQ-48.
- **Nine Ramtha indicators are not computable** until the M&E lead decides
  the seven open definitions (OQ-47), on `/rmth/thresholds`. A null there
  reads as *not computable*, never as zero.
- **`RMTH-SO1-A1` has a code and no statement** in the framework workbook.
  It is seeded visibly incomplete rather than invented.
- **Evidence storage is not configured.** Every upload answers
  *"Evidence storage is not configured yet"* naming the four secrets (OQ-49).
- **Arabic that is not the Municipalities' own.** 138 of Sahel Horan's 204
  reference labels and all 20 of its indicator names in the database still
  lack Arabic (OQ-26, OQ-32); the application falls back to English and never
  renders blank. Ramtha's 613 option labels and ten of its indicator
  statements carry Arabic drafted for this platform, listed for review
  (OQ-46).
- **Refugee status and disability are not collected by any Sahel Horan
  form**, so those breakdowns are almost entirely "not recorded". The bucket
  is shown rather than dropped, so the totals still reconcile.

Open decisions are tracked in [`06_OPEN_QUESTIONS.md`](06_OPEN_QUESTIONS.md).
