# CLAUDE.md — SHM M&E Platform

Read this file first. It is the standing brief for this repository.

---

## What this project is

A monitoring and evaluation platform for **Sahel Horan Municipality, Jordan**.

It backs the *Action Plan for Enhancing Local Economic Participation Through Agriculture and Food Production* — an EU-funded plan implemented with Enabel, running **1 August 2026 to 1 September 2029**.

The platform does three jobs:

1. Collects records through seven forms.
2. Computes **20 indicators** from those records, broken down by sex, age, refugee status and disability.
3. Produces a quarterly return for the donor.

It is not a general CRM. Every table exists to make a specific indicator countable. If a proposed table does not serve an indicator or a form, question it before building it.

---

## Stack

| Layer | Choice |
|---|---|
| Database | Supabase — PostgreSQL 15+ |
| Access control | Postgres row-level security, five app roles |
| Files | Supabase Storage, private bucket `evidence` |
| Migrations | Numbered SQL files, applied in order, append-only |
| Front end | Not in this repo yet |

---

## Where things are

```
CLAUDE.md                      ← this file
docs/01_PROJECT_CONTEXT.md     ← the Action Plan, the four pillars, why rules exist
docs/02_DATABASE_PLAN.md       ← the full schema spec, table by table
docs/03_INDICATORS.md          ← all 20 indicators: definition, formula, targets, source
docs/04_DATA_DICTIONARY.md     ← every field of every form, with option lists
docs/05_ROLES_AND_RLS.md       ← the five roles and the policy for every table
docs/06_OPEN_QUESTIONS.md      ← decisions that must NOT be guessed
docs/07_BUILD_CHECKLIST.md     ← the 17 migrations, in order, with verification
supabase/migrations/           ← the SQL you write
```

When a task touches indicators, open `03_INDICATORS.md`. When it touches a form field, open `04_DATA_DICTIONARY.md`. Do not work from memory on either — the definitions have known conflicts and the exact wording matters.

---

## Hard rules

**1. Never invent an indicator number, target or definition.**
Eight of them have conflicts or gaps in the source workbook. They are listed in `06_OPEN_QUESTIONS.md`. If a value is missing, leave it `null` and surface it as "not set". Do not put a zero there — a zero reads as a real target in a donor report.

**2. Never hard-delete.**
Every table has `deleted_at timestamptz`. Deletion sets it. Every query, view and RLS policy filters `deleted_at is null`.

There are exactly two exceptions, and both are written down here so neither looks like a lapse:

- `audit_log` — insert-only. Cannot be modified by anyone, including a coordinator.
- `applicant_lookup_throttle` — ephemeral rate-limit counters for the public applicant lookup. Rows are purged once their window has passed.

The reason the second one is allowed: this rule exists to keep **programme data** auditable for the donor. Those rows hold no programme data and no personal data — a salted HMAC and an integer, nothing else. Keeping them forever would grow the table without bound *and* would build a permanent record of every lookup any member of the public ever attempted, which is worse for privacy than discarding them. See `06_OPEN_QUESTIONS.md` OQ-21.

Anything else that wants to hard-delete is a defect until it is argued for here.

**3. Row-level security on every table, no exceptions.**
Including reference tables. A table without RLS in a project holding national ID numbers is a defect, not a shortcut.

**4. Count unique people, not rows.**
`A1.3`, `B1.2`, `D0.1` and `E0.2` all count **distinct `person_id`**. One person in three trainings is one person. This is the single most common way these numbers go wrong.

**5. Migrations are append-only, and a migration is not applied until its SQL is in the repo.**
Never edit a migration that has been applied. Write a new one. Never `drop table` on anything holding data.

**Applying SQL through the Supabase MCP and leaving a note in `supabase/migrations/` is not a migration.** It is an undocumented change to a production database.

This happened: migrations 0034–0049 — sixteen consecutive — were applied through the MCP while the local file was a three-line pointer saying the remote held the authoritative text. For that stretch the repository could not rebuild the database, and the GitHub backup did not contain the schema it existed to back up. `advisory_session`, `linkage_request`, `v_opportunity` and `v_public_opportunity` lived in exactly one place.

So, for every migration:

1. Write the SQL into `supabase/migrations/<timestamp>_<nnnn>_<name>.sql` **first**.
2. Apply that exact text — do not retype it, do not improve it on the way through.
3. The filename timestamp must equal the `version` recorded in `supabase_migrations.schema_migrations`. **A file whose name disagrees with the ledger is not the same migration, even when the bytes match.** `supabase db reset` orders by filename and the CLI identifies migrations by version, so a mismatch replays a migration the ledger has never heard of, in a position it never occupied. Two of the recovered files had drifted this way; the ordering happened to survive, which is luck, not a margin.
4. Verify with `bash supabase/check_migration_files.sh` (see that file's header for the one query it needs).

The recovered files are byte-identical to what was applied, taken from the migration ledger — not reconstructed from the schema. `0030` and `0031` are deliberate exceptions and are listed in the check script: the applied text of `0030` contains a password literal, so repairing it from the ledger would put a credential back into git.

**A secret written into a migration survives a git history rewrite.** `supabase_migrations.schema_migrations` stores the applied SQL verbatim, so anything that has ever been in a migration exists in *two* places. Scrubbing the repository — even with `git-filter-repo`, even verified against the remote — does not touch the ledger copy. That is exactly what happened here: the test-account password was removed from git history, and its original text sat in the ledger unnoticed until the recovery work went looking.

So: **never put a credential in a migration.** If one gets in, rotating it is the fix that actually works, because the ledger copy cannot be assumed gone. Scrubbing git is necessary but not sufficient, and treating it as sufficient is how a live secret gets left behind.

The ledger row *can* be edited — `version` is the primary key and the only thing the tooling matches on, and nothing ever replays from `statements`. But editing it to match a file weakens the check that file equals ledger, which is the thing standing between us and a repeat. So: **rotate first, edit only if a live secret lands there, and treat the edit as cleanup rather than containment.**

**6. One person, one row.**
`person.national_id` is unique and constrained to exactly nine digits. Nothing else stores a name or phone for a participant — everything references `person_id`.

**7. Ask before assuming.**
This is a real municipality with a real donor. If a definition is ambiguous, stop and say so rather than picking the reading that is easiest to implement.

---

## Conventions

### Every table gets this block

```sql
id          uuid primary key default gen_random_uuid(),
created_at  timestamptz not null default now(),
updated_at  timestamptz not null default now(),
created_by  uuid references auth.users(id),
deleted_at  timestamptz
```

Plus an `updated_at` trigger named `trg_<table>_updated`, and an audit trigger named `trg_<table>_audit`.

### Naming

- Tables: singular, snake_case — `person`, `training_enrolment`, not `persons`
- Lookup tables: `ref_` prefix — `ref_product`, `ref_partner_type_training`
- Junction tables: `<parent>_<child>` — `exhibition_registration_product`
- Views: `v_` prefix. Indicator views: `v_ind_<code>` with dots as underscores — `v_ind_a1_2`
- Functions: verb first — `snapshot_period()`, `followup_prefill()`
- Enums: `_t` suffix — `sex_t`, `record_status_t`

### Anything a field officer creates on a phone

Add `client_uuid uuid unique`. A worker who loses signal and re-syncs must not create a duplicate row.

Applies to: `training_enrolment`, `office_service`, `guidance_record`, `exhibition_registration`, `followup_survey`, `mentorship_session`.

### Multi-select fields

Never a text array. Always a junction table against a `ref_*` table. The indicators require breakdowns by these values, and you cannot index or join an array of labels cleanly.

### "Other (please specify)"

The `ref_*` row carries `allows_free_text = true`. The owning table carries a matching `*_other text` column. A check constraint requires the free-text column to be filled when that option is chosen.

### Bilingual

Every `ref_*` table has `label_en` and `label_ar`. Free-text fields store whatever the user typed. Do not build a translation table for user content.

---

## Commands

```bash
supabase migration new <name>      # create a numbered migration
supabase db push                   # apply to the linked project
supabase db reset                  # rebuild locally from all migrations + seed
supabase gen types typescript --linked > types/database.ts
```

When using the Supabase MCP, apply one migration at a time and run that step's verification query before moving on.

---

## Definition of done for a migration

Before you say a migration is complete, all of these must be true:

- [ ] **The SQL is in `supabase/migrations/`, byte-for-byte what was applied, under a filename whose timestamp matches the ledger `version`**
- [ ] **`bash supabase/check_migration_files.sh` passes**
- [ ] It runs on a clean database with `supabase db reset`
- [ ] Every new table has RLS enabled and at least one policy
- [ ] Every new table has the standard column block and both triggers
- [ ] Every foreign key has an index
- [ ] The step's verification query in `07_BUILD_CHECKLIST.md` returns the expected result
- [ ] Any assumption you had to make is written into `06_OPEN_QUESTIONS.md`, not left in a code comment

---

## Working style for this repo

- Small migrations. One concern each. Do not combine "create the markets tables" with "write the market indicator views".
- Comment the *why* in SQL, not the *what*. `-- E0.2 counts distinct people, so this must not be per-registration` is useful. `-- create table` is not.
- **Never write a comment claiming a behaviour is implemented somewhere else.** Comments explain reasoning. Behaviour is proven by a test or by running it.

  This has now happened twice. `format.ts` carried a constant that read as authoritative about Western digits while two of three code paths ignored it. `glyphs.ts` said the back arrow was "mirrored under RTL by the `scale-x-[-1]` on the span that renders it" — and not one of the four call sites did that. Both comments were written in good faith, described a real intention, and were false.

  A comment that asserts is a comment that will eventually lie, and it lies most convincingly to whoever reads it next — including to whoever wrote it, six weeks later, deciding they do not need to check. Describe what *this* code does and why. If the behaviour lives elsewhere, point at it (`see 0053`) rather than vouching for it.
- When a business rule and a technical convenience conflict, the business rule wins. If a trigger has to be slow to stop double counting, it is slow.
- Report conflicts you find in the source data. There are already eight known ones; there may be more.
