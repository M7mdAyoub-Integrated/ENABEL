# 07 — Build Checklist

Seventeen migrations, in order. Each one depends on the ones before it.

**Rule for every step:** write the migration, apply it, run the verification query, confirm the expected result, then move on. Do not batch. If a verification fails, fix it before continuing — a broken foundation gets more expensive with every migration on top.

---

## Phase 1 — Foundation

### ☐ 0001 · `extensions_and_helpers.sql`

- Enable `pgcrypto` and `pg_trgm`
- `public.set_updated_at()` trigger function
- `public.audit_row()` trigger function (used from 0013, defined here so every table can attach it as it is created)
- `public.guard_soft_delete()` trigger function

```sql
-- verify
select extname from pg_extension where extname in ('pgcrypto','pg_trgm');
-- expect 2 rows
select proname from pg_proc where proname in
  ('set_updated_at','audit_row','guard_soft_delete');
-- expect 3 rows
```

---

### ☐ 0002 · `enums_and_reference.sql`

- All nine enums from `02_DATABASE_PLAN.md` §3
- All 18 `ref_*` tables, same shape each
- Do **not** seed rows here — seeding is 0016

```sql
select count(*) from pg_type where typtype='e' and typnamespace='public'::regnamespace;
-- expect 9
select count(*) from pg_tables where schemaname='public' and tablename like 'ref_%';
-- expect 18
```

---

### ☐ 0003 · `identity_and_roles.sql`

- `app_role_t` enum
- `app_user` table
- `current_role()`, `is_staff()`, `is_coordinator()`, `can_write()`
- Trigger on `auth.users` insert → create `app_user` with role `participant`
- `revoke execute` on all helper functions from `anon`

```sql
select proname, prosecdef from pg_proc
where proname in ('current_role','is_staff','is_coordinator','can_write');
-- expect 4 rows, prosecdef = true on all
```

---

## Phase 2 — Core entities

### ☐ 0004 · `person.sql`

- `person` with the nine-digit check constraint and the age-or-DOB constraint
- `person_activity_type` junction
- `age_band()` function
- `my_person_id()` function
- Trigram index on `full_name`, btree on `national_id`
- `guard_person_immutable()` trigger

```sql
-- the format check must actually bite
insert into person (national_id, full_name, age_recorded)
values ('12345', 'Test', 30);
-- expect: violates check constraint "national_id_format"
```

---

### ☐ 0005 · `partners.sql`

- `partner`, `partnership`, `partnership_role`, `partner_contribution`
- `unique (partner_id, partnership_type)` on `partnership`
- Trigger validating that `partner_type_id` points at the right `ref_` table for the partnership type

```sql
-- one organisation must be able to hold both partnership types
-- but not two of the same type
```

**This is the migration that fixes G0.4 double counting.** Get the unique constraint right.

---

## Phase 3 — Activity tables, one pillar at a time

### ☐ 0006 · `training.sql`

- `training_session`, `training_enrolment`
- `unique (person_id, session_id)` — the constraint that protects A1.3
- `client_uuid` on enrolment

```sql
-- verify the unique constraint exists
select conname from pg_constraint
where conrelid = 'training_enrolment'::regclass and contype = 'u';
```

### ☐ 0007 · `office.sql`

- `milestone` seeded structurally (rows come in 0016)
- `office_service` with `client_uuid`
- Check constraint: achieved milestones need an `achieved_on`

### ☐ 0008 · `production.sql`

- `production_initiative`, `mentorship_session`, `market_linkage`, `guidance_record`
- `market_linkage.initiative_id` and `partnership_id` both required
- Trigger raising a **notice, not an exception**, when a linkage is created for a person with no completed training

### ☐ 0009 · `markets.sql`

- `exhibition`, `exhibition_registration`, `exhibition_registration_product`, `promotional_action`
- `unique (exhibition_id, person_id)`
- Trigger: reject registration if the exhibition has already ended
- Trigger: reject registration if approved registrations equal `booth_capacity`
- Trigger: derive `is_first_time` from prior approved registrations
- Trigger: `guard_registration_status()` — only a coordinator changes status

```sql
-- both business rules must actually block
-- 1. register for an exhibition with end_date in the past  → rejected
-- 2. register when booths are full                          → rejected
```

### ☐ 0010 · `coordination.sql`

- `coordination_meeting`, `coordination_meeting_partner`, `case_study`
- Trigger on `coordination_meeting_partner` insert → write a `partner_contribution` row, so G0.4 picks up attendance automatically

---

## Phase 4 — The survey

### ☐ 0011 · `followup.sql`

- `followup_survey` with the typed indicator columns
- `followup_answer`, `followup_answer_option`, `followup_safety_item`, `followup_buyer_connection`
- `unique (person_id, round)`
- Check constraint: Section D columns null unless `round = 'twelve_month'`
- `followup_prefill(national_id)` returning jsonb

```sql
-- section D must be locked outside the twelve-month round
insert into followup_survey (person_id, round, respondent, q37_still_engaged)
values ('<uuid>', 'six_month', 'participant', 'main');
-- expect: violates check constraint "section_d_only_at_12m"

-- prefill must return the person, their trainings, linkage flag and event count
select public.followup_prefill('991200447');
```

---

## Phase 5 — Framework and infrastructure

### ☐ 0012 · `framework.sql`

- `objective`, `activity`, `indicator`, `reporting_period`, `indicator_target`, `indicator_snapshot`
- `snapshot_period(period_code)` function — refuses when `reporting_period.is_locked`

### ☐ 0013 · `audit_and_storage.sql`

- `audit_log` table, insert-only
- Attach `trg_<table>_audit` to **every** operational table
- Attach `trg_<table>_updated` to every table
- Attach `guard_soft_delete` to every operational table
- `attachment` table
- Create the private `evidence` bucket

```sql
-- every operational table must have all three triggers
select c.relname,
       count(*) filter (where g.tgname like '%_updated') as upd,
       count(*) filter (where g.tgname like '%_audit')   as aud
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_trigger g on g.tgrelid = c.oid and not g.tgisinternal
where n.nspname='public' and c.relkind='r'
group by c.relname
having count(*) filter (where g.tgname like '%_audit') = 0;
-- expect zero rows, apart from ref_* and audit_log itself
```

---

## Phase 6 — Computation

### ☐ 0014 · `indicator_views.sql`

Twenty views, one per indicator. All return the same shape:

```
(period_code text, actual numeric, denominator numeric)
```

Then:
- `v_indicator_actual` — union of all 20
- `v_indicator_disaggregated` — by sex, age band, refugee status, disability, with a `not_recorded` bucket
- `v_person_public` — the masked view for `partner_viewer`

Work from `03_INDICATORS.md`. Do not write these from memory.

**Check the six unique-count indicators specifically:** A1.3, B1.2, D0.1, E0.2, G0.4 and C1.2. Every one must use `count(distinct …)`.

```sql
select count(distinct code) from v_indicator_actual;
-- expect 20

-- no view may forget the soft-delete filter
-- insert a row, soft-delete it, confirm the indicator drops back
```

---

## Phase 7 — Security

### ☐ 0015 · `rls.sql`

- `alter table … enable row level security` on every table
- Policies per `05_ROLES_AND_RLS.md`
- The three verification queries from that document must all return zero rows
- Then test by hand as each of the five roles

**Do not skip the manual test.** The automated checks confirm policies exist; they do not confirm the policies are correct.

#### ☐ Settle the security posture of every view created in 0014

This step exists because the Supabase security advisor raises an `ERROR`-level `security_definer_view` lint for each exposed view, and the obvious remedy is wrong here. Decide deliberately, then record the decision.

**The 20 leaf `v_ind_*` views:** internal. Revoke all grants so they are not reachable through PostgREST.

```sql
do $outer$
declare v text;
begin
  for v in select c.relname from pg_class c
           join pg_namespace n on n.oid = c.relnamespace
           where n.nspname='public' and c.relkind='v' and c.relname like 'v\_ind\_%'
  loop
    execute format('revoke all on public.%I from anon, authenticated', v);
  end loop;
end $outer$;
```

**The three exposed views** — `v_indicator_actual`, `v_indicator_disaggregated`, `v_person_public` — stay `SECURITY DEFINER`. **Do not set `security_invoker = true` on them.** Every signed-in user connects as the single Postgres role `authenticated`, so under `security_invoker` a `partner_viewer` would need `select` policies on `person` and on the ~20 operational tables beneath `v_indicator_actual`. That grant exposes the raw unmasked `national_id` at `/rest/v1/person` and defeats the masking the view exists to provide, and without it the donor dashboard returns zero rows. `SECURITY DEFINER` is the control that keeps raw tables unreachable while aggregates stay readable. See `02_DATABASE_PLAN.md` §17.

What must be true for that to be safe — verify all three:

```sql
-- a. each exposed view carries its own role gate in the WHERE clause
select definition from pg_views
where schemaname='public'
  and viewname in ('v_indicator_actual','v_indicator_disaggregated','v_person_public');
-- each must contain: is_staff() or current_role() = 'partner_viewer'

-- b. no leaf view is reachable by a client role
select c.relname,
       has_table_privilege('authenticated', c.oid, 'select') as authed_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='v' and c.relname like 'v\_ind\_%';
-- authed_select must be false for all 20

-- c. anon reaches nothing
select count(*) from information_schema.role_table_grants
where grantee='anon' and table_schema='public';
-- expect 0
```

If a future change moves the raw operational tables into a schema PostgREST does not expose, revisit this: at that point `security_invoker` becomes safe and the three lints can be cleared properly.

---

## Phase 8 — Data

### ☐ 0016 · `seed.sql`

In this order, because of foreign keys:

1. All `ref_*` rows — the option lists are in `04_DATA_DICTIONARY.md`, with `label_ar` left blank until translations arrive
2. `objective` — SO1–SO4 plus IMPACT, with result statements
3. `activity` — A through G
4. `reporting_period` — the eight quarters with targets, plus 26/Q3, 26/Q4, 29/Q1, 29/Q2, 29/Q3 with none
5. `indicator` — all 20, with definition, formula, source and view name
6. `indicator_target` — the matrix in `03_INDICATORS.md`. **Blank cells become no row, not a zero row.**
7. `milestone` — B1.1 and G0.1, both not achieved

```sql
select count(*) from indicator;                    -- 20
select count(*) from reporting_period;             -- 13
select count(*) from indicator_target;             -- 118, count it and record the number
select code from indicator where view_name is null; -- zero rows
select code from indicator i
where not exists (select 1 from indicator_target t where t.indicator_id = i.id);
-- expect exactly one row: C1.3  (see OQ-1)
```

That last query is a real check, not a formality. If anything other than C1.3 comes back, a target was dropped.

---

### ☐ 0017 · `seed_demo.sql` — optional

Demo records matching the prototype, so the front end has something to render. Keep it in a separate migration so it can be excluded from production.

Suggested volume: 6 people, 4 training partners, 3 support partners, 3 sessions, 8 enrolments, 4 initiatives, 4 linkages, 4 exhibitions (2 held, 2 upcoming), 6 registrations (2 pending), 4 follow-up surveys.

Make the demo data **arithmetically honest** — the indicator views must produce numbers that match the rows. If the tables show 4 training partners, A1.2 must return 4.

---

## After every migration

- [ ] Runs clean on `supabase db reset`
- [ ] RLS enabled on every new table, with at least one policy
- [ ] Standard column block present
- [ ] `updated_at` and audit triggers attached
- [ ] Every foreign key indexed
- [ ] Verification query passes
- [ ] Any assumption written into `06_OPEN_QUESTIONS.md`

---

## Final acceptance

Before calling the database done:

```sql
-- 1. all 20 indicators compute without error
select * from v_indicator_actual order by code;

-- 2. nothing is missing a source
select code from indicator where data_source is null or view_name is null;

-- 3. no table without RLS
-- 4. no table with RLS but no policy
--    (queries in 05_ROLES_AND_RLS.md §9)

-- 5. anon reaches nothing, now and for objects created later
select
  (select count(*) from information_schema.role_table_grants
     where grantee='anon' and table_schema='public')            as anon_table_grants,
  (select count(*) from information_schema.role_routine_grants
     where grantee='anon' and specific_schema='public')          as anon_routine_grants,
  (select count(*) from pg_policies where schemaname='public'
     and ('anon' = any(roles) or 'public' = any(roles)))         as policies_open_to_anon;
-- all three must be 0

-- 5b. no SECURITY DEFINER function is callable by a client role unless it takes
--     no arguments and can only report on the caller
select p.proname, pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('authenticated', p.oid, 'execute') as authed_can_call
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
  and has_function_privilege('authenticated', p.oid, 'execute');
-- expect only: current_role, is_staff, is_coordinator, my_person_id — all with empty args.
-- Anything here that takes an argument can be used to ask about another user.

-- 6. soft delete works end to end
--    delete a partner, confirm A1.2 and G0.4 both drop

-- 7. the unique-person rule holds
--    enrol one person in three sessions, confirm A1.3 returns 1

-- 8. the approval rule holds
--    submit a registration as a participant, confirm E0.2 does not move
--    approve it as coordinator, confirm E0.2 increases by 1
```

Tests 6, 7 and 8 are the ones that matter. They are the three ways this kind of system reports the wrong number to a donor.

**They cannot be run on empty tables.** Seed the demo data first (`seed_demo`). Test 6 in particular passes trivially against zero rows and only fails once there is a partner and a person with dependent records — that is how the soft-delete cascade defect recorded in `02_DATABASE_PLAN.md` §17 went unnoticed until demo data existed.

Tests 5 and 5b are the two ways it leaks a national ID.

---

### ☐ Retire the demo data and draw the audit boundary before go-live

This is one step with three parts and **the order matters.** Do not draw the audit boundary before the demo data is gone, or the boundary row will sit above data that is still live.

Everything in `audit_log` up to this point is seeding, demo data and build-phase verification. None of it is operational activity, and some of it is actively misleading — see `02_DATABASE_PLAN.md` §17 for the `indicator_snapshot` insert/delete pair that reads like an erased quarter close.

#### Part 1 — delete the demo data

The reserved range `300000000`–`300000099` anchors the demo participants. A trigger (`trg_person_reserved_demo_range`) blocks any new `national_id` in it, so the set cannot have grown. Delete children before parents:

```sql
begin;

create temp table demo_person as
  select id from public.person where national_id like '3000000__';

create temp table demo_initiative as
  select id from public.production_initiative where person_id in (select id from demo_person);

delete from public.exhibition_registration_product
  where registration_id in (select id from public.exhibition_registration
                            where person_id in (select id from demo_person));
delete from public.mentorship_session where initiative_id in (select id from demo_initiative);
delete from public.market_linkage     where initiative_id in (select id from demo_initiative);
delete from public.production_initiative where id in (select id from demo_initiative);

delete from public.followup_buyer_connection where survey_id in
  (select id from public.followup_survey where person_id in (select id from demo_person));
delete from public.followup_safety_item      where survey_id in
  (select id from public.followup_survey where person_id in (select id from demo_person));
delete from public.followup_answer_option    where survey_id in
  (select id from public.followup_survey where person_id in (select id from demo_person));
delete from public.followup_answer           where survey_id in
  (select id from public.followup_survey where person_id in (select id from demo_person));
delete from public.followup_survey where person_id in (select id from demo_person);

delete from public.exhibition_registration where person_id in (select id from demo_person);
delete from public.training_enrolment      where person_id in (select id from demo_person);
delete from public.office_service          where person_id in (select id from demo_person);
delete from public.guidance_record         where person_id in (select id from demo_person);
delete from public.case_study              where person_id in (select id from demo_person);
delete from public.person_activity_type    where person_id in (select id from demo_person);
delete from public.person                  where id in (select id from demo_person);

commit;
```

**The person range is not the whole demo set.** These demo objects hang off no participant and must go too, or Part 2 will fail:

```sql
-- partner_contribution first: the meeting-attendance trigger created rows here
delete from public.partner_contribution where partnership_id in
  (select id from public.partnership where partner_id in
    (select id from public.partner where name like 'Demo %'));
delete from public.coordination_meeting_partner where partnership_id in
  (select id from public.partnership where partner_id in
    (select id from public.partner where name like 'Demo %'));
delete from public.coordination_meeting where subject like 'Demo %';
delete from public.partnership_role where partnership_id in
  (select id from public.partnership where partner_id in
    (select id from public.partner where name like 'Demo %'));
delete from public.partnership where partner_id in
  (select id from public.partner where name like 'Demo %');
delete from public.partner            where name  like 'Demo %';
delete from public.training_session   where title like 'Demo %' or title in
  ('Food Processing I','Food Safety Basics','Crop Practices');
delete from public.exhibition         where name  like 'Demo %';
delete from public.promotional_action where title like 'Demo %';
delete from public.case_study         where title like 'Demo %';
delete from public.indicator_snapshot;   -- any build-phase snapshot
```

These are hard `DELETE`s, not soft deletes. That is deliberate and is the one sanctioned exception to the never-hard-delete rule: demo rows are not records of anything, and soft-deleting them would leave them in the table forever with `deleted_at` set, which is exactly the ambiguity this step exists to remove. Do it before real data arrives, never after.

Then drop the guard, which has no purpose once the range is empty:

```sql
drop trigger if exists trg_person_reserved_demo_range on public.person;
drop function if exists public.guard_reserved_demo_national_id();
```

#### Part 2 — confirm every indicator reads zero

```sql
select a.code, a.actual, a.denominator
from public.v_indicator_actual a
order by a.code;
-- Count indicators (#) must all be 0. Percentage indicators (IMP-0, A1, B1, C1)
-- must be NULL with denominator 0 — a percentage of nothing is not 0%.
select count(*) from public.v_indicator_disaggregated;   -- expect 0
select count(*) from public.person;                      -- expect 0
select count(*) from auth.users;                         -- expect 0
```

If anything is non-zero, demo data is still present. Do not proceed to Part 3.

#### Part 3 — draw the audit boundary

Only now. Choose one and record which was chosen, by whom, and on what date:

**Option A — archive.** Move the build-phase rows out to a separate table, leaving `audit_log` empty at go-live.

```sql
create table public.audit_log_build_phase (like public.audit_log including all);
insert into public.audit_log_build_phase select * from public.audit_log;
delete from public.audit_log;
-- record the row count moved and the timestamp range in 06_OPEN_QUESTIONS.md
```

**Option B — marked boundary row.** Leave the history in place and insert one sentinel so any later reader can tell build from live.

```sql
insert into public.audit_log (table_name, action, new_data, changed_fields)
values ('__go_live_boundary__', 'insert',
        jsonb_build_object(
          'note', 'Everything before this row is build-phase seeding and testing, not operational activity.',
          'build_rows_before', (select count(*) from public.audit_log),
          'decided_by', '<name>'),
        array['go_live_boundary']);
```

Option B keeps the append-only property intact and is the safer default; Option A gives a cleaner log but means deleting audit rows, which the project rules otherwise forbid. Whichever is chosen, `audit_log` still has no update or delete policy for any role, so this must be done from a trusted server context.

Do not skip recording the decision. An auditor reading this log in 2029 has no other way to tell a seed from a service delivery.

---

## What is not in scope here

Front end, auth screens, offline sync, PDF export of the quarterly return, email notifications, Arabic translations.

The database exposes what those need — `followup_prefill()`, `v_indicator_actual`, `v_indicator_disaggregated`, `snapshot_period()` — but does not implement them.
