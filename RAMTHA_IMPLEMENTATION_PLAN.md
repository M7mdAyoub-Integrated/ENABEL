# Ramtha Implementation Plan

Adding a second municipality to the platform, and the accounts that keep them apart.

Read this whole document before writing anything. Work through it in order, without stopping for approval. Commit after every numbered part.

---

## Part 0 — What we are building, and why in this order

The platform currently serves **Sahel Horan**, an agricultural livelihoods programme. We are adding **Ramtha**, an employment and entrepreneurship programme. Same structure — objectives, activities, indicators, forms — entirely different domain.

### The three accounts

| Account | Sees |
|---|---|
| Sahel Horan admin | Sahel Horan only |
| Ramtha admin | Ramtha only |
| Integrated super admin | Both, and can create admins and other super admins |

**Residents have no accounts.** They reach a public home page, see what is open, and apply with their national ID. That does not change.

### The order matters and is not negotiable

**Multi-tenancy first, on the existing schema.** Retrofitting `municipality_id` onto two municipalities' worth of tables is far worse than adding it once to what exists. Every Ramtha table is then born with it.

### One decision already made

**`person` is shared. Everything else is scoped.**

A national ID identifies one human. The same person may appear in both programmes, and there is no registration, no login and no proof of anything — so two person rows would be two records of one human that neither municipality knows about.

So: one `person` table, national ID unique across the system. `municipality_id` goes on the **activity** tables, not on the person. Each municipality owns what it did; nobody owns the human.

Consequence to handle explicitly: a Sahel Horan admin looking up a national ID will find the person exists. That is unavoidable and is already true today. What they must **not** see is what Ramtha did with them. That is an RLS rule on the activity tables.

`is_refugee` and `has_disability` live on `person` and are therefore shared. Whichever municipality asks first records them and the other inherits. That is better than asking twice and getting different answers — but write it into the docs as a decision, not a side effect.

---

## Part 1 — Multi-tenancy

### 1.1 The municipality table

```
municipality
  id            uuid pk
  code          text unique      'SHM' | 'RMTH'
  name_en       text
  name_ar       text
  slug          text unique      'sahel-horan' | 'ramtha'
  is_active     boolean
  + standard columns
```

Seed both. Sahel Horan's code is `SHM`, Ramtha's is `RMTH`, matching the indicator prefixes already in use.

### 1.2 Scope every table that is not shared

Add `municipality_id uuid not null references municipality(id)` to:

**Framework** — `objective`, `activity`, `indicator`, `indicator_target`, `indicator_snapshot`, `reporting_period`

`reporting_period` matters: both run 2027–2028 quarters, but they are separate plans and may lock independently. Do not share them.

**Operational, Sahel Horan** — `training_session`, `training_enrolment`, `advisory_session`, `advisory_enrolment`, `exhibition`, `exhibition_registration`, `office_service`, `guidance_record`, `production_initiative`, `mentorship_session`, `market_linkage`, `linkage_request`, `coordination_meeting`, `case_study`, `promotional_action`, `milestone`, `followup_survey`

**Partners** — `partner`, `partnership`, `partner_contribution`

Decide and justify: is a partner shared like a person, or scoped like an activity? My reading is **scoped**. A partner relationship is a municipality's own, `G0.4` counts contributions per municipality, and the two will have different partners. If you disagree, argue it before changing it.

**Not scoped, shared** — `person`, `person_activity_type`, every `ref_*` table, `app_user`, `audit_log`, `applicant_lookup_secret`, `applicant_lookup_throttle`, `attachment`

Reference tables are shared because they are vocabulary. If Ramtha needs lists Sahel Horan does not — event types, training types, vulnerability categories — add **new** `ref_*` tables rather than adding rows to existing ones that would then appear in Sahel Horan's dropdowns.

### 1.3 Backfill

Every existing row is Sahel Horan. Use the three-step pattern: add nullable, backfill, set not null. Safe on any environment, including one that picked up rows.

### 1.4 Unique constraints have to change

Every unique index on a scoped table must now include `municipality_id`, or one municipality will block the other.

Check every one. The five partial `_live` indexes especially — `(person_id, session_id) where deleted_at is null` becomes `(municipality_id, person_id, session_id) where deleted_at is null`.

`person.national_id` stays globally unique. That is the point of sharing it.

### 1.5 Indexes

Every scoped table gets an index on `municipality_id`, and composite indexes where a query filters on municipality plus something else. Every query in the system is about to gain a municipality filter.

---

## Part 2 — Roles and accounts

### 2.1 Do not collapse the role enum

`app_role_t` currently holds `coordinator`, `data_entry`, `enumerator`, `partner_viewer`, `participant`, and **185 policies are built on it**. Rewriting that is a large blast radius for no benefit.

Instead: **add `super_admin`** and assign only three roles for now.

| Account | Role | `municipality_id` |
|---|---|---|
| Sahel Horan admin | `coordinator` | SHM |
| Ramtha admin | `coordinator` | RMTH |
| Integrated | `super_admin` | null |

`data_entry`, `enumerator`, `partner_viewer` and `participant` stay in the enum and stay unassigned. Document that plainly so nobody thinks they were removed.

### 2.2 `app_user` gains a municipality

```
app_user.municipality_id uuid references municipality(id)
```

Null means "all municipalities" and is only valid for `super_admin`. Enforce with a check constraint: a non-super-admin must have one.

### 2.3 Helper functions

```sql
my_municipality()        -- the caller's municipality_id, null for super admin
is_super_admin()         -- role = 'super_admin'
can_see_municipality(m)  -- is_super_admin() or m = my_municipality()
```

All `security definer`, `set search_path = public`, revoked from `anon`.

`can_see_municipality()` is the one every policy calls. One function, so the rule cannot drift table by table.

### 2.4 Every policy on a scoped table gains the check

`USING` and `WITH CHECK` both. A `USING`-only change lets an admin write a row into another municipality — that is the exact shape of the `fu_update` gap found earlier.

Walk the catalogue rather than listing tables by hand.

### 2.5 Super admin can manage accounts

A screen to create an admin, assign a municipality, create another super admin, and deactivate an account. Super admin only.

**Never allow a super admin to delete their own account or remove their own super admin role.** Losing the last super admin is unrecoverable through the interface.

### 2.6 Verify by executing, not by reading

As each of the three accounts, using `set local role authenticated` with `set local request.jwt.claims`, in a transaction that rolls back:

- Sahel Horan admin reads Sahel Horan rows and **zero** Ramtha rows, on every scoped table
- Ramtha admin, the mirror
- Super admin reads both
- Sahel Horan admin **cannot write** a row with Ramtha's `municipality_id`
- Every scoped table, not a sample

Testing as the owner proves nothing — a privilege check does not fire for the owner, and that has hidden three permission problems in this project already.

---

## Part 3 — Routing and the public side

### 3.1 Path prefix

```
/sahel-horan            public home
/sahel-horan/opportunity/:id
/sahel-horan/apply/:id
/ramtha                 public home
/ramtha/...
```

Path prefix over subdomain: one link on a poster, no DNS, and it is obvious in a URL which municipality a page belongs to.

`/` shows a chooser, or redirects if only one is active.

### 3.2 The public view is scoped

`v_public_opportunity` gains `municipality_id` and the public page filters on the slug in the URL. A resident on `/ramtha` sees only Ramtha's opportunities.

`anon` still reaches exactly the four public views and the two RPCs. Do not widen the surface.

### 3.3 The apply and lookup RPCs

`applicant_prefill` and `apply_for_opportunity` take a municipality. The prefill returns identity from the shared `person` table but **history scoped to the asking municipality** — a Ramtha page must never reveal that someone is in Sahel Horan's programme.

Same byte-identical failure response. Same throttle.

### 3.4 Municipal side

The admin's municipality comes from their account, never from the URL. A municipal admin has no municipality switcher.

A super admin **does** — a switcher in the header, and the current municipality visible on every screen so nobody enters data against the wrong one.

---

## Part 4 — Ramtha's domain tables

Source: `RMTH_indicator_forms.xlsx`, 17 forms with an index. Read every sheet.

### 4.1 Consolidate before building

The forms are one per indicator. The tables must not be. Three groups collapse:

**Events.** `SO1-A1.2` networking events and `SO1-A1.3` guidance sessions are one entity with a discriminator. The form itself carries the branching question *"Is this event solely a vocational guidance session?"* and the index warns **never sum A1.2 and A1.3**, because the framework gave both indicators the same definition text.

One table `rmth_event` with `event_kind`, and a check that an event is exactly one kind. Then A1.2 counts one kind, A1.3 the other, and the never-sum rule is structural rather than a note.

**Training programmes.** `SO1-B1.1` specialised programmes and `SO3-F0.2` entrepreneurship programmes are both "a programme was developed". One table with a `programme_type`.

**Training enrolments.** `SO2-C1.2` completions, `SO3-E0.3` incubator-design training, `SO3-F0.1` entrepreneurship training are all "a person completed a cycle". One enrolment table; the programme type comes from the cycle.

That is 17 forms onto roughly 9 tables.

### 4.2 The tables

| Table | Forms it serves | Notes |
|---|---|---|
| `rmth_event` | A1.2, A1.3 | `event_kind`, event ref `RMTH-EV-YYYY-000`, employers count, attendee counts by gender and age band, evidence |
| `rmth_training_programme` | B1.1, F0.2 | `programme_type`: specialised, entrepreneurship, incubator_design |
| `rmth_training_cycle` | C1.1 | a delivery of a programme, ref `RMTH-TC-...`, jointly developed with a partner flag |
| `rmth_training_enrolment` | C1.2, E0.3, F0.1 | person + cycle, attendance rate, pre/post scores, assessment, job-ready, employer evaluation, **met completion criteria**, certificate |
| `rmth_proposal` | B1.2 | ref `RMTH-PP-...`, submitted, reviewed, approved |
| `rmth_project` | B1, and B1.2's approved proposals | a project developed and linked to the labour market |
| `rmth_project_implementer` | B1 | one record per **implementer**, not per project — the form says so explicitly |
| `rmth_incubator` | E0.1 | one record per incubator, updated until established and operational |
| `rmth_incubation_service` | E0.2 | one record per participant per incubator |
| `rmth_outcome_survey` | IMP-0, SO1-0, SO2-0, SO3-0, C1 | person-level outcome follow-ups |

### 4.3 The outcome surveys

Five forms are person-level follow-ups with different questions but shared identification. Decide and justify: one table with a `survey_kind` and typed columns per indicator, or separate tables.

My reading is **one table**, following the pattern already built for Sahel Horan's `followup_survey` — a header, typed columns for the answers that feed indicators, and the `followup_answer` shape for the long tail. It is proven, and the identification block is identical across all five.

But read the five sheets first and say what you find.

### 4.4 Every table carries

`municipality_id` set to Ramtha. `deleted_at`, `created_by`, `created_at`, `updated_at`. The `guard_soft_delete` trigger. The audit trigger. `client_uuid` on anything a field officer creates.

### 4.5 Evidence is not optional here

Nearly every Ramtha form names required evidence — attendance sheets, photographs, pre/post results, certificates, employer evaluations, municipal records.

`attachment` exists and has **zero rows and no upload path**. For Sahel Horan that was a gap. For Ramtha it is a requirement on most indicators.

Build the upload path: Supabase Storage, the private `evidence` bucket that already exists, `attachment` rows linking to the record. Staff upload and read; only a coordinator removes; nothing public.

---

## Part 5 — The forms

**This is the main focus of this work.** The dashboard can be plain; the forms cannot.

### 5.1 Build each form from its sheet

Every sheet states: the unit of observation, who completes it, when, **how the indicator is calculated from it**, and the required disaggregation. Use all five. Do not paraphrase the field labels — use the sheet's wording.

Where a sheet gives response options, seed a `ref_*` table with those exact options. Do not invent an option and do not reuse a Sahel Horan list unless it matches exactly, option for option.

### 5.2 National ID is the spine, and it is already designed in

Every person-level form keys on national ID with a re-entry field. Reuse the existing lookup — do not write a second one.

Existing person → prefill identity and lock it. New ID → create a person, shared table, scoped records.

`SO2-C1.2` has a field asking *"has this National ID already completed a cycle counted under this indicator?"* so unique completers can be reported alongside total completions. Build it, and derive the default answer from the records rather than asking blind.

### 5.3 The fields that produce the count

Several forms carry one field that decides whether a record counts. The sheets say so in capitals. Treat these the way `met_criteria` is treated on the Sahel Horan side — a decision with three outcomes, never a checkbox:

- `C1.2`, `E0.3`, `F0.1` — *"Did this person meet the completion criteria?"*
- `A1.2` / `A1.3` — *"Is this event solely a vocational guidance session?"*, which decides which indicator a record belongs to
- `E0.1` — whether the incubator is established **and operational**

Record who decided and when.

### 5.4 Thresholds that are not yet defined

Seven open items in the index are unresolved definitions. Do not hardcode a guess and do not block on them.

Put each threshold in a **configuration table**, scoped to the municipality, with a null value and a note naming the open item. The view reads the threshold; when the M&E lead answers, it is a data change rather than a migration.

The seven: sustained engagement duration, short-term intensive definition, regular income rule, completion criteria (three indicators), self-employment as placement, programmes versus sessions, employability threshold.

Where a threshold is null, the indicator must report **not computable**, naming the missing definition. Not zero.

### 5.5 Responsive and translated

320px first, both languages, RTL correct, no raw locale keys.

Ramtha's framework workbook has an **Arabic Copy sheet with the indicator statements already translated**. Use it. That is far better than the Sahel Horan position, where 138 reference labels still have no Arabic.

---

## Part 6 — Indicators and dashboard

### 6.1 Build the views

Each form sheet states how its indicator is calculated. Write one view per indicator, same shape as the Sahel Horan set — `(period_code, actual, denominator)`.

Where a threshold from 5.4 is null, return null with a reason rather than a number.

### 6.2 Targets are missing

`English_form` has **no targets at all**. `English Copy` has them — 4 per year, 80, 40, 15 annually, 65 over three years — but a **different indicator list**.

Seed `indicator_target` rows with null values and record the reconciliation as an open question. **Do not map `English Copy`'s targets onto `English_form`'s codes.** The two lists do not correspond and guessing would put an invented target in a donor report.

The dashboard shows "not set", never 0.

### 6.3 `SO1-A1` has no indicator statement

It carries a code and nothing else. Same shape as Sahel Horan's `C1.3`. Seed it as an indicator with no formula and no view, visibly incomplete, and record it.

### 6.4 The dashboard

Plain is fine. One dashboard per municipality, reading that municipality's indicators.

Super admin gets a switcher and, if it is cheap, a comparison view — which municipality is on track, which is behind. Do not spend long on it; the forms matter more.

**Never compute an indicator in the front end.**

---

## Part 7 — Verification

Nothing counts unless it was checked in the database.

### Isolation
- As each of the three accounts, read every scoped table and confirm the row counts
- Sahel Horan admin cannot write into Ramtha and vice versa
- Sahel Horan's 20 indicators are unchanged from the baseline captured at the start
- Public `/sahel-horan` shows only Sahel Horan opportunities; `/ramtha` only Ramtha's

### Every Ramtha form
Create a record through the screen, read the row back, confirm the indicator moved by the amount the form's sheet says it should. Then edit it, then soft-delete it and confirm the figure returns.

### The counting rules
- `C1.2` counts records where completion criteria were met — three enrolments for one person on three cycles counts three, and the unique-completer field reports one
- `A1.2` and `A1.3` never both count the same event
- `E0.2` counts one record per participant per incubator
- Every person-level indicator counts what its sheet says — some count people, some count records. Check each against its sheet rather than assuming.

### Clean up
Remove every test row. Confirm both municipalities are back at their baselines.

---

## Part 8 — Report at the end

- Which Ramtha indicators can produce a number and which cannot, and why
- The seven open items, restated as questions for the M&E lead
- The target reconciliation between the two sheets — what is in one and not the other
- Anything in the forms that could not be built and what it needs
- Confirmation that Sahel Horan is untouched

---

## Rules throughout

- Verify as the real role with `set local role authenticated` and `set local request.jwt.claims`, in a rolled-back transaction. Testing as the owner proves nothing.
- One exception block around the entire function body, covering any delete.
- Check the database, not the screen.
- Migrations are append-only. Grep before replacing a function — `0082` silently reverted `0080`'s guard and every check passed.
- 320px first, both languages, no raw locale keys.
- Never compute an indicator in the front end.
- Add every new finding to `CLAUDE.md`'s shape-not-substance register.
