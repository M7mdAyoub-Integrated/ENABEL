# SHM M&E Platform — Database Implementation Plan

**Target:** Supabase (PostgreSQL 15+)
**Audience:** Claude Code, connected to the Supabase project via MCP
**Scope:** schema, constraints, row-level security, indicator views, seed data, migrations

---

## 0. How to run this

Work through the migrations in the order given in section 12. One migration file per step, named `0001_*.sql` … `0016_*.sql`. Apply each with the Supabase MCP, verify, then move on. Do not merge steps — later steps depend on helper functions created in earlier ones.

After every migration, run the verification query listed at the end of that section. Stop and report if it fails.

All objects live in the `public` schema unless stated. All primary keys are `uuid` with `default gen_random_uuid()`. All tables carry `created_at`, `updated_at`, `created_by`, `deleted_at`.

---

## 1. What this database has to do

It backs a monitoring and evaluation system for the Sahel Horan Municipality Action Plan (2026–2029, EU-funded, implemented with Enabel). It must:

1. Hold the records produced by the data collection forms.
2. Never count the same person twice.
3. Compute all **20 indicators** directly from those records, disaggregated by sex, age, refugee status and disability.
4. Keep a full audit trail, because this feeds donor reporting.
5. Support Arabic labels alongside English.
6. Separate what the municipality can see from what a producer can see.

### The three design decisions that shape everything

**One person, one row.** The existing workbook re-types National ID, name and phone in four separate forms. Here there is a single `person` table and everything references it. This is what makes `A1.3` (unique participants) and `E0.2` (unique producers) countable.

**One partner, one row, many partnerships.** The workbook has two near-identical partner sheets, so the same organisation can be counted twice in `G0.4`. Here there is one `partner` table and a `partnership` table that records the *type* of partnership. One organisation can hold both a training partnership and a production-support partnership without being double-counted.

**Every indicator gets a table.** Eight indicators currently have no form anywhere (`B1.1`, `B1.2`, `C1.3`, `D0.2`, `F0.1`, `G0.1`, `G0.2`, `G0.3`). This schema creates a table for each of them so the dashboard has no empty tiles.

---

## 2. Extensions, conventions and helper functions

### Migration 0001

Enable:
- `pgcrypto` (for `gen_random_uuid()`) — usually already on in Supabase
- `pg_trgm` (for name search)

Create a shared trigger function:

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
```

Attach it to every table with:

```sql
create trigger trg_<table>_updated
before update on public.<table>
for each row execute function public.set_updated_at();
```

Create the standard column block used on every table:

```sql
id          uuid primary key default gen_random_uuid(),
created_at  timestamptz not null default now(),
updated_at  timestamptz not null default now(),
created_by  uuid references auth.users(id),
deleted_at  timestamptz
```

**Soft delete rule:** nothing is ever hard-deleted. Every query and every RLS policy filters `deleted_at is null`. Indicator views must filter it too.

**Offline safety:** every table that a field officer can create from a phone gets `client_uuid uuid unique` so a re-sync after losing signal cannot create duplicates. Applies to: `training_enrolment`, `office_service`, `guidance_record`, `exhibition_registration`, `followup_survey`, `mentorship_session`.

---

## 3. Reference tables and enumerations

### Migration 0002

Two mechanisms, used deliberately:

**Postgres enums** for short fixed lists that will never change and are never reported on by label:

```sql
create type sex_t              as enum ('female','male');
create type partnership_type_t as enum ('training','production_support');
create type record_status_t    as enum ('draft','submitted','approved','rejected');
create type link_status_t      as enum ('proposed','under_review','active','ended');
create type followup_round_t   as enum ('six_month','twelve_month','annual');
create type contact_mode_t     as enum ('telephone','site_visit','municipal_office');
create type respondent_t       as enum ('participant','household_member','not_reached');
create type tri_status_t       as enum ('done','in_progress','not_started');
create type initiative_status_t as enum ('planned','operating','paused','stopped');
```

**Lookup tables** for every list that is displayed, translated, reported on, or may grow. All follow the same shape:

```sql
create table public.ref_<name> (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label_en    text not null,
  label_ar    text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  allows_free_text boolean not null default false   -- true for "Other (please specify)"
);
```

Create these lookup tables:

| Table | Used by | Rows to seed |
|---|---|---|
| `ref_partner_type_training` | Partnership form | 8 options from the sheet |
| `ref_partner_type_production` | Production-support form | 9 options |
| `ref_partner_role_training` | Partnership form (multi) | 12 options |
| `ref_partner_role_production` | Production-support form (multi) | 10 options |
| `ref_training_topic` | Training session | 6 topics |
| `ref_agri_involvement` | Completion form | 6 options |
| `ref_activity_type` | Completion, initiative, follow-up | 5 options |
| `ref_product` | Exhibition registration, follow-up | 11 products |
| `ref_producer_type` | Exhibition registration | 9 options |
| `ref_guidance_type` | Guidance log | food safety, licensing, packaging, labelling, pricing, marketing |
| `ref_office_service_type` | Office service log | technical advice, input guidance, licensing help, market info, referral, other |
| `ref_sales_channel` | Follow-up Q27/Q28 | 11 channels |
| `ref_buyer_type` | Follow-up Q35 | 9 types |
| `ref_safety_item` | Follow-up Q23 | 9 items |
| `ref_promotional_channel` | Promotional action | digital platform, local partnership, community event, radio, print |
| `ref_stakeholder_type` | Coordination meeting | government, technical, academic, private sector, community, neighbouring municipality |
| `ref_nationality` | Person | Jordanian, Syrian, Palestinian, Other |
| `ref_disability_type` | Person | Washington Group short set categories |

**Rule for "Other (please specify)":** the lookup row has `allows_free_text = true`, and the owning table carries a matching `*_other text` column. A check constraint requires the free-text column to be non-null when that option is selected.

**Verification:** `select count(*) from ref_product;` returns 11.

---

## 4. Identity, roles and the participant link

### Migration 0003

```sql
create type app_role_t as enum (
  'coordinator',      -- Municipal Action Plan Coordinator: everything
  'data_entry',       -- municipal staff: create and edit forms, no delete, no approvals
  'enumerator',       -- field officer: follow-up surveys only, plus read on person
  'partner_viewer',   -- Enabel / donor: read-only dashboard, no National IDs
  'participant'       -- producer: own records only
);

create table public.app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        app_role_t not null default 'participant',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

Helper functions, marked `security definer` so RLS policies can call them without recursion:

```sql
create or replace function public.current_role()
returns app_role_t
language sql stable security definer set search_path = public as $$
  select role from public.app_user where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('coordinator','data_entry','enumerator');
$$;

create or replace function public.my_person_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.person where auth_user_id = auth.uid() and deleted_at is null;
$$;
```

Trigger on `auth.users` insert to create the `app_user` row with role `participant` by default.

---

## 5. Core entity tables

### Migration 0004 — person

This is the centre of the whole schema.

```sql
create table public.person (
  id                uuid primary key default gen_random_uuid(),
  national_id       text not null unique,
  full_name         text not null,
  sex               sex_t,
  date_of_birth     date,
  age_recorded      int,                  -- fallback when DOB is unknown
  phone             text,
  nationality_id    uuid references ref_nationality(id),
  is_refugee        boolean,              -- required for A1.3, D0.1, E0.2 disaggregation
  has_disability    boolean,              -- required for the same
  disability_type_id uuid references ref_disability_type(id),
  village           text,                 -- Al Turra, Al Shajara, Amrawa, Al Thnaibeh
  agri_involvement_id uuid references ref_agri_involvement(id),
  auth_user_id      uuid unique references auth.users(id),
  notes             text,
  -- standard columns
  ...
  constraint national_id_format check (national_id ~ '^[0-9]{9}$'),
  constraint age_or_dob check (date_of_birth is not null or age_recorded is not null)
);

create index on person using gin (full_name gin_trgm_ops);
create index on person (national_id);
```

Child table for the multi-select activity types:

```sql
create table public.person_activity_type (
  person_id        uuid not null references person(id) on delete cascade,
  activity_type_id uuid not null references ref_activity_type(id),
  primary key (person_id, activity_type_id)
);
```

**Important note for the team.** `is_refugee` and `has_disability` are not collected by the current Completion form or the current Exhibition Registration form. Almost every indicator in the framework asks for these breakdowns. The columns exist here; the forms must be extended to fill them, otherwise the disaggregation views return mostly nulls. Flag this as a blocker in the project, not a database problem.

A computed age band, used everywhere in reporting:

```sql
create or replace function public.age_band(p person)
returns text language sql immutable as $$
  select case
    when coalesce(date_part('year', age(p.date_of_birth)), p.age_recorded) < 25 then '18-24'
    when coalesce(date_part('year', age(p.date_of_birth)), p.age_recorded) < 35 then '25-34'
    when coalesce(date_part('year', age(p.date_of_birth)), p.age_recorded) < 45 then '35-44'
    else '45+'
  end;
$$;
```

### Migration 0005 — partner, partnership, contribution

```sql
create table public.partner (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  unit          text,                 -- e.g. "Faculty of Agriculture"
  contact_person text,
  phone         text,
  email         text,
  ...
  constraint partner_name_unique unique (name, unit)
);

create table public.partnership (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references partner(id),
  partnership_type partnership_type_t not null,
  partner_type_id  uuid not null,       -- FK resolved by type, see check below
  partner_type_other text,
  established_on   date not null,
  agreement_ref    text,
  is_active        boolean not null default true,
  ended_on         date,
  ...
  unique (partner_id, partnership_type)
);

create table public.partnership_role (
  partnership_id uuid not null references partnership(id) on delete cascade,
  role_id        uuid not null,
  role_other     text,
  primary key (partnership_id, role_id)
);
```

`partner_type_id` points at `ref_partner_type_training` when the type is `training` and `ref_partner_role_production` when it is `production_support`. Enforce with a trigger rather than a FK, since Postgres cannot do conditional foreign keys. Same for `partnership_role.role_id`.

**The table that makes `G0.4` measurable:**

```sql
create table public.partner_contribution (
  id             uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references partnership(id),
  contributed_on date not null,
  contribution_type text not null,     -- 'training','service','referral','market','funding','other'
  entity_type    text,                 -- optional link to the thing they contributed to
  entity_id      uuid,
  description    text not null,
  ...
);
```

`G0.4` counts distinct partners with at least one contribution in the reporting period. Without this table the indicator cannot be computed at all — that is the gap in the current workbook.

---

## 6. Activity tables, one per pillar

### Migration 0006 — Objective 1, training

```sql
create table public.training_session (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  topic_id       uuid not null references ref_training_topic(id),
  start_date     date not null,
  end_date       date not null,
  venue          text,
  delivered_by_partnership_id uuid references partnership(id),
  is_delivered   boolean not null default false,
  planned_seats  int,
  ...
  constraint session_dates check (end_date >= start_date)
);

create table public.training_enrolment (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references person(id),
  session_id    uuid not null references training_session(id),
  registered_on date not null default current_date,
  attended      boolean not null default false,
  met_criteria  boolean,                    -- null until the decision is taken
  decided_on    date,
  decided_by    uuid references auth.users(id),
  client_uuid   uuid unique,
  ...
  unique (person_id, session_id)
);
```

The `unique (person_id, session_id)` constraint is what stops the same person being enrolled twice in one course. `A1.3` counts **distinct person_id** where `met_criteria = true`, so attending three courses still counts as one person.

`D0.2` counts `training_session` rows where the topic is in the food-processing set and `is_delivered = true`.

### Migration 0007 — Objective 1, technical coordination office

```sql
create table public.milestone (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,        -- 'B1.1', 'G0.1'
  name         text not null,
  is_achieved  boolean not null default false,
  achieved_on  date,
  decision_ref text,
  notes        text,
  ...
  constraint achieved_needs_date check (not is_achieved or achieved_on is not null)
);

create table public.office_service (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references person(id),
  service_type_id uuid not null references ref_office_service_type(id),
  service_date date not null,
  adviser      text,
  notes        text,
  client_uuid  uuid unique,
  ...
);
```

`B1.1` reads the milestone. `B1.2` counts **distinct person_id** in `office_service`.

### Migration 0008 — Objective 2, production and processing

```sql
create table public.production_initiative (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references person(id),
  title          text not null,
  activity_type_id uuid not null references ref_activity_type(id),
  main_product   text,
  started_on     date,
  status         initiative_status_t not null default 'planned',
  is_women_led   boolean,
  is_youth_led   boolean,
  support_value_jod numeric(10,2),
  ...
);

create table public.mentorship_session (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references production_initiative(id),
  session_date  date not null,
  topic         text not null,
  adviser       text,
  client_uuid   uuid unique,
  ...
);

create table public.market_linkage (
  id             uuid primary key default gen_random_uuid(),
  initiative_id  uuid not null references production_initiative(id),
  partnership_id uuid not null references partnership(id),
  scope          text not null,
  request        text,
  linked_on      date not null default current_date,
  status         link_status_t not null default 'proposed',
  outcome        text,
  ...
);

create table public.guidance_record (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references person(id),
  guidance_type_id uuid not null references ref_guidance_type(id),
  guidance_date date not null,
  delivered_by  text,
  client_uuid   uuid unique,
  ...
);
```

Three things this fixes:

- `market_linkage` points at an **initiative**, not just a farmer. `C1.2` is defined as initiatives launched *and connected to a market*, so both halves are now recorded.
- `partnership_id` replaces the free-text "Partner linkage name" in the current sheet, so linkages join cleanly to partners.
- `guidance_record` gives `D0.1` its own source. The current workbook points `D0.1` at the Completion form, which measures something different. Use this table.

Add a trigger that raises a **warning, not an error**, when a linkage is created for a person with no completed training. The Action Plan says production support follows training completion, but the municipality must still be able to record exceptions.

### Migration 0009 — Objective 3, markets and promotion

```sql
create table public.exhibition (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  start_date    date not null,
  end_date      date not null,
  location      text not null,
  booth_capacity int not null check (booth_capacity > 0),
  external_sponsor text,
  is_cancelled  boolean not null default false,
  ...
  constraint exhibition_dates check (end_date >= start_date)
);

create table public.exhibition_registration (
  id              uuid primary key default gen_random_uuid(),
  exhibition_id   uuid not null references exhibition(id),
  person_id       uuid not null references person(id),
  producer_type_id uuid not null references ref_producer_type(id),
  producer_type_other text,
  is_first_time   boolean not null,
  status          record_status_t not null default 'submitted',
  submitted_by_participant boolean not null default false,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  client_uuid     uuid unique,
  ...
  unique (exhibition_id, person_id)
);

create table public.exhibition_registration_product (
  registration_id uuid not null references exhibition_registration(id) on delete cascade,
  product_id      uuid not null references ref_product(id),
  primary key (registration_id, product_id)
);

create table public.promotional_action (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  channel_id   uuid not null references ref_promotional_channel(id),
  action_date  date not null,
  reach_estimate int,
  description  text,
  ...
);
```

Two business rules enforced by a `before insert` trigger on `exhibition_registration`:

1. Reject if the exhibition's `end_date < current_date`.
2. Reject if approved registrations already equal `booth_capacity`.

`is_first_time` should be **derived, not asked**: a trigger sets it to true when the person has no earlier approved registration. Keep the column so it can be overridden, but default it from the data.

`E0.1` counts exhibitions where `end_date < current_date and not is_cancelled`. Do not count upcoming events.
`E0.2` counts **distinct person_id** where `status = 'approved'`.

### Migration 0010 — Objective 4, coordination

```sql
create table public.coordination_meeting (
  id           uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  subject      text not null,
  minutes_ref  text,
  ...
);

create table public.coordination_meeting_partner (
  meeting_id     uuid not null references coordination_meeting(id) on delete cascade,
  partnership_id uuid references partnership(id),
  external_name  text,
  stakeholder_type_id uuid references ref_stakeholder_type(id),
  primary key (meeting_id, coalesce(partnership_id::text, external_name))
);

create table public.case_study (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  person_id    uuid references person(id),
  initiative_id uuid references production_initiative(id),
  documented_on date not null,
  summary      text not null,
  change_evidenced text not null,
  ...
);
```

Attendance at a meeting is a valid `partner_contribution`. Add an `after insert` trigger on `coordination_meeting_partner` that writes a contribution row, so `G0.4` picks it up automatically.

---

## 7. The follow-up survey

### Migration 0011

43 questions, six sections, one conditional section, one repeatable block. Do not build 43 columns and do not build pure key-value. Use a hybrid.

**Header, with the indicator-bearing answers as real typed columns:**

```sql
create table public.followup_survey (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references person(id),
  round           followup_round_t not null,
  contact_date    date,
  contact_mode    contact_mode_t,
  enumerator_name text,
  respondent      respondent_t not null,
  status          record_status_t not null default 'draft',

  -- Section A, feeds A1 and B1
  q08_applied_knowledge text,          -- 'regularly' | 'occasionally' | 'no'
  q14_used_office       boolean,
  q16_advice_useful     text,          -- 'very' | 'somewhat' | 'not_very' | 'not_at_all'

  -- Section B, feeds C1
  q17_activity_status   text,          -- 'expanded'|'same'|'reduced'|'paused'|'stopped'|'never_started'
  q18_started_after_support boolean,
  q22_volume_change     text,
  q26_workers_total     int,
  q26_workers_women     int,
  q26_workers_under30   int,

  -- Section C
  q29_selling_change    text,
  q30_events_attended   int,           -- pre-filled from registrations, overridable
  q30_is_overridden     boolean not null default false,
  q31_last_event_sales_band text,
  q34_connection_made   text,          -- 'yes' | 'no' | 'connection_no_sale'

  -- Section D, twelve-month only, feeds IMP-0
  q37_still_engaged     text,          -- 'main' | 'secondary' | 'no'
  q38_capacity          text,
  q40_income_change     text,

  q43_enumerator_notes  text,
  client_uuid           uuid unique,
  ...
  unique (person_id, round),
  constraint section_d_only_at_12m check (
    round = 'twelve_month' or (q37_still_engaged is null and q40_income_change is null)
  )
);
```

**The long tail, as answers:**

```sql
create table public.followup_answer (
  survey_id     uuid not null references followup_survey(id) on delete cascade,
  question_code text not null,          -- 'q07','q09','q10' ...
  value_text    text,
  value_number  numeric,
  value_boolean boolean,
  primary key (survey_id, question_code)
);

create table public.followup_answer_option (
  survey_id     uuid not null references followup_survey(id) on delete cascade,
  question_code text not null,
  option_id     uuid not null,
  option_other  text,
  primary key (survey_id, question_code, option_id)
);
```

**The two structured blocks:**

```sql
create table public.followup_safety_item (
  survey_id     uuid not null references followup_survey(id) on delete cascade,
  item_id       uuid not null references ref_safety_item(id),
  status        tri_status_t not null,
  obstacle      text,
  primary key (survey_id, item_id)
);

create table public.followup_buyer_connection (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references followup_survey(id) on delete cascade,
  seq           smallint not null check (seq between 1 and 3),
  buyer_name    text not null,
  buyer_type_id uuid not null references ref_buyer_type(id),
  how_connected text not null,          -- 'exhibition','referral','partner','own_effort','other'
  arrangement   text not null,          -- 'one_off','repeat_no_agreement','verbal','written'
  still_active  text not null,          -- 'yes','no','seasonal'
  unique (survey_id, seq)
);
```

**Pre-fill, not re-ask.** Before the enumerator opens the survey, the app should read:
- which trainings the person completed → `training_enrolment`
- whether they have a linkage → `market_linkage`
- how many events they attended → `exhibition_registration`

Provide this as one function:

```sql
create or replace function public.followup_prefill(p_national_id text)
returns jsonb language sql stable security definer as $$
  -- returns { person, trainings[], has_linkage, events_attended, support_received[] }
$$;
```

---

## 8. The results framework itself

### Migration 0012

The framework should be data, not hard-coded in the front end.

```sql
create table public.objective (
  id      uuid primary key default gen_random_uuid(),
  code    text not null unique,        -- 'SO1'..'SO4','IMPACT'
  name_en text not null,
  name_ar text not null,
  result_statement_en text,
  sort_order int not null
);

create table public.activity (
  id           uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objective(id),
  code         text not null unique,   -- 'A'..'G'
  name_en      text not null,
  name_ar      text not null,
  sort_order   int not null
);

create table public.indicator (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,  -- 'A1.2','IMP-0'
  objective_id  uuid not null references objective(id),
  activity_id   uuid references activity(id),
  name_en       text not null,
  name_ar       text,
  indicator_type text not null,        -- 'impact','result','intermediate','output','milestone'
  unit          text not null,         -- '#','%'
  definition    text,
  formula       text,
  data_source   text,                  -- which table feeds it
  view_name     text,                  -- the view that computes it
  baseline      numeric default 0,
  final_target  numeric,
  disaggregation text[],
  sort_order    int not null
);

create table public.reporting_period (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,     -- '27/Q1'
  start_date date not null,
  end_date   date not null,
  is_locked  boolean not null default false
);

create table public.indicator_target (
  indicator_id uuid not null references indicator(id),
  period_id    uuid not null references reporting_period(id),
  target_value numeric not null,
  primary key (indicator_id, period_id)
);

create table public.indicator_snapshot (
  indicator_id uuid not null references indicator(id),
  period_id    uuid not null references reporting_period(id),
  actual_value numeric,
  computed_at  timestamptz not null default now(),
  computed_by  uuid references auth.users(id),
  is_final     boolean not null default false,
  note         text,
  primary key (indicator_id, period_id)
);
```

**Why both a live view and a snapshot table.** The dashboard shows the live figure. The donor return must show the figure as it stood when the quarter closed. `indicator_snapshot` freezes it; `is_locked` on the period stops it changing afterwards.

**Known gap to record in the data:** the workbook only has targets for `27/Q1` through `28/Q4` — eight quarters. The plan runs to September 2029. Seed the eight known quarters, create the remaining period rows with `target_value` null, and let the dashboard show "no target set" rather than zero.

---

## 9. Indicator computation

### Migration 0014 (after RLS in 0013, see order)

One view per indicator, all returning the same shape so the dashboard can query them uniformly:

```sql
-- shape: (period_code text, actual numeric, denominator numeric)
```

Then one union view:

```sql
create or replace view public.v_indicator_actual as
  select 'A1.2' as code, * from v_ind_a1_2
  union all select 'A1.3', * from v_ind_a1_3
  ...;
```

### The 20 definitions

Write each as its own view. These are the formulas:

| Code | Rule |
|---|---|
| **IMP-0** | of surveys with `round='twelve_month'` and `q37_still_engaged` not null: percent where it is `main` or `secondary` |
| **A1** | of surveys where `q08_applied_knowledge` not null: percent where it is `regularly` or `occasionally` |
| **A1.2** | count of `partnership` where `partnership_type='training'` and `is_active` |
| **A1.3** | count of **distinct** `person_id` in `training_enrolment` where `met_criteria = true` |
| **B1** | of surveys where `q14_used_office = true`: percent where `q16_advice_useful` is `very` or `somewhat` |
| **B1.1** | `milestone` where `code='B1.1'` → 1 if achieved else 0 |
| **B1.2** | count of **distinct** `person_id` in `office_service` |
| **C1** | of surveys where `q17_activity_status` not null and the person has an initiative older than 6 months: percent where status is `expanded`, `same` or `reduced` |
| **C1.1** | count of `partnership` where `partnership_type='production_support'` and `is_active` |
| **C1.2** | count of **distinct** `production_initiative` that have at least one `market_linkage` with status `active` or `ended` |
| **C1.3** | count of `mentorship_session` |
| **D0.1** | count of **distinct** `person_id` in `guidance_record` |
| **D0.2** | count of `training_session` where `is_delivered` and topic in the food-processing set |
| **E0.1** | count of `exhibition` where `end_date < current_date` and not cancelled |
| **E0.2** | count of **distinct** `person_id` in `exhibition_registration` where `status='approved'` |
| **F0.1** | count of `promotional_action` |
| **G0.1** | `milestone` where `code='G0.1'` → 1 if achieved else 0 |
| **G0.2** | count of `coordination_meeting` |
| **G0.3** | count of `case_study` |
| **G0.4** | count of **distinct** `partner_id` having at least one `partner_contribution` in the period |

Every view filters `deleted_at is null`.

### Disaggregation

One extra view for the six person-based counting indicators (`A1.3`, `B1.2`, `D0.1`, `E0.2`, plus `A1` and `IMP-0` as percentages):

```sql
create or replace view public.v_indicator_disaggregated as
select
  i.code,
  p.sex,
  public.age_band(p) as age_band,
  p.is_refugee,
  p.has_disability,
  count(distinct p.id) as value
from ...
group by 1,2,3,4,5;
```

Expect nulls in `is_refugee` and `has_disability` until the forms collect them. Have the view report a `not_recorded` bucket rather than dropping those people, so the totals still reconcile.

### Refresh function

```sql
create or replace function public.snapshot_period(p_period_code text)
returns int language plpgsql security definer as $$
-- writes v_indicator_actual into indicator_snapshot for that period
-- refuses if reporting_period.is_locked
$$;
```

---

## 10. Row-level security

### Migration 0015

Enable RLS on **every** table. No exceptions. Then apply this pattern:

**Reference tables** (`ref_*`, `objective`, `activity`, `indicator`, `reporting_period`)
- select: any authenticated user
- insert/update/delete: `coordinator` only

**Operational tables** (`person`, `partner`, `partnership`, training, office, production, markets, coordination)
- select: `is_staff()`
- insert/update: `coordinator` or `data_entry`
- delete: nobody — soft delete via `deleted_at`, and only `coordinator` may set it

**`followup_survey` and its children**
- select/insert/update: `coordinator`, `enumerator`
- `enumerator` may only update rows where `status = 'draft'`

**`exhibition_registration`** — this one is special because two roles write to it:
```sql
-- participant may insert their own, always as submitted
create policy participant_insert on exhibition_registration
for insert to authenticated
with check (
  person_id = public.my_person_id()
  and status = 'submitted'
  and submitted_by_participant = true
);

-- participant may read only their own
create policy participant_select on exhibition_registration
for select to authenticated
using (person_id = public.my_person_id() or public.is_staff());

-- only a coordinator may move it to approved or rejected
create policy staff_review on exhibition_registration
for update to authenticated
using (public.is_staff())
with check (
  public.current_role() = 'coordinator'
  or status = (select status from exhibition_registration e where e.id = id)
);
```

**`person`** — participants may read and update only their own row, and may never change `national_id`. Enforce with a trigger, not a policy, because policies cannot compare old and new column values cleanly.

**Protecting the National ID.** `partner_viewer` must never see it. Create a masked view and grant that role access to the view instead of the table:

```sql
create or replace view public.v_person_public as
select id, left(national_id,3) || '******' as national_id_masked,
       full_name, sex, public.age_band(person) as age_band,
       is_refugee, has_disability, village
from person where deleted_at is null;
```

---

## 11. Audit trail and attachments

### Migration 0013

```sql
create table public.audit_log (
  id         bigserial primary key,
  table_name text not null,
  row_id     uuid not null,
  action     text not null,        -- 'insert','update','delete','restore'
  actor      uuid,
  actor_role app_role_t,
  changed_at timestamptz not null default now(),
  old_data   jsonb,
  new_data   jsonb,
  changed_fields text[]
);

create index on audit_log (table_name, row_id, changed_at desc);
```

Generic trigger function `public.audit_row()` attached `after insert or update or delete` on every operational table. On update, compute `changed_fields` by comparing the jsonb objects so the log is readable.

`audit_log` is insert-only. No update or delete policy for anyone, including `coordinator`.

**Attachments** — evidence is mandatory for the milestone and coordination indicators.

```sql
create table public.attachment (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,        -- 'milestone','coordination_meeting','case_study', ...
  entity_id   uuid not null,
  storage_path text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now()
);

create index on attachment (entity_type, entity_id);
```

Create a private Supabase Storage bucket named `evidence`. Path convention: `{entity_type}/{entity_id}/{uuid}_{filename}`. Storage policies: staff may upload and read; nobody else.

---

## 12. Migration order

Run in exactly this order. Each depends on the one before.

| # | File | Contents |
|---|---|---|
| 0001 | `extensions_and_helpers.sql` | pgcrypto, pg_trgm, `set_updated_at()` |
| 0002 | `enums_and_reference.sql` | all enums, all `ref_*` tables |
| 0003 | `identity_and_roles.sql` | `app_role_t`, `app_user`, `current_role()`, `is_staff()`, signup trigger |
| 0004 | `person.sql` | `person`, `person_activity_type`, `age_band()` |
| 0005 | `partners.sql` | `partner`, `partnership`, `partnership_role`, `partner_contribution` |
| 0006 | `training.sql` | `training_session`, `training_enrolment` |
| 0007 | `office.sql` | `milestone`, `office_service` |
| 0008 | `production.sql` | `production_initiative`, `mentorship_session`, `market_linkage`, `guidance_record` |
| 0009 | `markets.sql` | `exhibition`, `exhibition_registration`, products junction, `promotional_action` |
| 0010 | `coordination.sql` | `coordination_meeting`, meeting partners, `case_study` |
| 0011 | `followup.sql` | `followup_survey`, answers, options, safety items, buyer connections, `followup_prefill()` |
| 0012 | `framework.sql` | `objective`, `activity`, `indicator`, `reporting_period`, `indicator_target`, `indicator_snapshot` |
| 0013 | `audit_and_storage.sql` | `audit_log`, `audit_row()`, triggers, `attachment`, storage bucket |
| 0014 | `indicator_views.sql` | 20 views, `v_indicator_actual`, `v_indicator_disaggregated`, `snapshot_period()` |
| 0015 | `rls.sql` | enable RLS everywhere, all policies, `my_person_id()`, masked person view |
| 0016 | `seed.sql` | reference data, framework, targets, periods |
| 0017 | `seed_demo.sql` | optional demo records matching the prototype |

Business-rule triggers (booth capacity, past events, first-time flag, linkage warning, meeting contribution) go in the migration that creates their table, not in a separate file.

---

## 13. Seed data

### Reporting periods

Eight quarters from the workbook, then the rest of the plan with null targets:

```
27/Q1  2027-01-01 .. 2027-03-31
27/Q2  2027-04-01 .. 2027-06-30
27/Q3  2027-07-01 .. 2027-09-30
27/Q4  2027-10-01 .. 2027-12-31
28/Q1  2028-01-01 .. 2028-03-31
28/Q2  2028-04-01 .. 2028-06-30
28/Q3  2028-07-01 .. 2028-09-30
28/Q4  2028-10-01 .. 2028-12-31
```

Also create `26/Q3`, `26/Q4`, `29/Q1`, `29/Q2`, `29/Q3` with no targets, since the plan runs 1 August 2026 to 1 September 2029.

### Indicators and quarterly targets

Seed exactly these. Blank means no target in that quarter.

| Code | Unit | 27Q1 | 27Q2 | 27Q3 | 27Q4 | 28Q1 | 28Q2 | 28Q3 | 28Q4 | Final |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-0 | % | | | | | | | | 70 | 70 |
| A1 | % | | | | 60 | | | | 60 | 60 |
| A1.2 | # | 0 | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 4 |
| A1.3 | # | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 120 |
| B1 | % | | | | 70 | | | | 70 | 70 |
| B1.1 | # | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| B1.2 | # | 0 | 10 | 20 | 20 | 20 | 10 | 10 | 10 | 100 |
| C1 | % | | | | 70 | | | | 70 | 70 |
| C1.1 | # | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| C1.2 | # | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 6 |
| C1.3 | # | | | | | | | | | *not set* |
| D0.1 | # | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 |
| D0.2 | # | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 8 |
| E0.1 | # | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 0 | 12 |
| E0.2 | # | | 25 | 25 | 25 | 25 | 25 | 25 | | 150 |
| F0.1 | # | 0 | 1 | 2 | 2 | 1 | 2 | 2 | 2 | 12 |
| G0.1 | # | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| G0.2 | # | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 14 |
| G0.3 | # | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 4 |
| G0.4 | # | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 6 |

Note in the seed comments: `C1.3` has no target anywhere in the source workbook, and `G0.2` sums to 14 although the stated rule is "at least 2 per quarter", which would be 16. Both need a decision from the M&E lead. Do not silently invent numbers.

### Milestones

Seed two rows: `B1.1` (not achieved) and `G0.1` (not achieved).

---

## 14. Verification after each stage

Run these and report the result:

```sql
-- 1. every table has RLS on
select tablename from pg_tables t
where schemaname='public'
  and not exists (select 1 from pg_class c
                  where c.relname=t.tablename and c.relrowsecurity);
-- must return zero rows

-- 2. every table has an updated_at trigger
select c.relname from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and not exists (select 1 from pg_trigger g
                  where g.tgrelid=c.oid and g.tgname like 'trg_%_updated');

-- 3. all 20 indicators have a view and it runs
select code, view_name from indicator order by sort_order;

-- 4. no indicator is missing a source
select code from indicator where data_source is null;
-- must return zero rows

-- 5. the union view returns 20 codes
select count(distinct code) from v_indicator_actual;  -- 20
```

---

## 15. Things to decide before or during the build

These are project decisions, not technical ones. Raise them, do not guess.

1. **Refugee status and disability.** Not collected by any current form. Six indicators require the breakdown. The columns exist here; the forms must add the questions.
2. **`C1.3` has no target.** Blank everywhere in the source.
3. **`G0.2` arithmetic.** The rule says two meetings per quarter; the total says 14, not 16.
4. **Targets stop at 28/Q4** while the plan runs to September 2029.
5. **`D0.1` source.** The workbook points it at the Completion form; the definition describes guidance sessions. This schema gives it a dedicated table. Confirm with the M&E lead.
6. **`G0.3` definition conflict.** The name says "case studies", but the definition, method and formula in the workbook all describe *referrals*. The `case_study` table follows the name. Confirm.
7. **National ID handling.** Confirm the municipality is permitted to store it, who may see it, and how long it is retained.
8. **Arabic.** Reference tables carry `label_ar`. Someone has to supply the translations.

---

## 16. Out of scope for this plan

Front end, authentication UI, offline sync engine, PDF export of the quarterly return, email notifications. The database exposes what these need — `followup_prefill()`, `v_indicator_actual`, `snapshot_period()` — but does not implement them.
