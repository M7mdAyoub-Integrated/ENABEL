# 05 — Roles and Row-Level Security

This system holds Jordanian national ID numbers and refugee status. Treat access control as a requirement, not a feature.

---

## 1. The five roles

```sql
create type app_role_t as enum (
  'coordinator',
  'data_entry',
  'enumerator',
  'partner_viewer',
  'participant'
);
```

| Role | Who | Can do |
|---|---|---|
| `coordinator` | Municipal Action Plan Coordinator | Everything. Approves registrations. Only role that may soft-delete, lock a period, or change reference data. |
| `data_entry` | Municipal staff | Create and edit operational records. Cannot delete, cannot approve, cannot change reference data. |
| `enumerator` | Field officer doing follow-up calls and visits | Follow-up surveys only, plus read access to `person` so they can find the respondent. Can edit a survey only while it is a draft. |
| `partner_viewer` | Enabel, EU, external evaluator | Read-only dashboard and indicator figures. **Never sees a national ID.** |
| `participant` | A producer or farmer | Their own person record and their own exhibition registrations. Nothing else. |

Default role on signup is `participant`. Promotion is manual and only a `coordinator` can do it.

---

## 2. Helper functions

All `security definer` with `set search_path = public`, so policies can call them without recursion.

```sql
create or replace function public.current_role()
returns app_role_t
language sql stable security definer set search_path = public as $$
  select role from public.app_user where id = auth.uid() and is_active;
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('coordinator','data_entry','enumerator');
$$;

create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() = 'coordinator';
$$;

create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_role() in ('coordinator','data_entry');
$$;

create or replace function public.my_person_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.person
  where auth_user_id = auth.uid() and deleted_at is null;
$$;
```

Revoke `execute` from `anon` on all of them.

---

## 3. Permission matrix

`R` read · `C` create · `U` update · `D` soft-delete · `—` no access

| Table | coordinator | data_entry | enumerator | partner_viewer | participant |
|---|---|---|---|---|---|
| `ref_*`, `objective`, `activity` | R C U D | R | R | R | R |
| `indicator`, `reporting_period`, `indicator_target` | R C U D | R | R | R | — |
| `indicator_snapshot` | R C U | R | R | R | — |
| `app_user` | R C U D | R own | R own | R own | R own |
| `person` | R C U D | R C U | R | via masked view | R U own |
| `partner`, `partnership`, `partnership_role` | R C U D | R C U | R | R | — |

*(2026-09-01: the two partner FORMS merged into one keyed on the organisation.
No permission changed — `pn` replaces `tp` and `pp` in `MODULE_ACCESS`, and the
three tables above keep the policies they had. Worth stating because a merged
screen looks like a permission change and is not: soft-deleting the PARTNER now
has a control of its own, and it is still `guard_soft_delete`, still coordinator
only, and still removes every partnership under it from A1.2, C1.1 and G0.4 at
once.)*
| `partner_contribution` | R C U D | R C U | R | R | — |
| `training_session`, `training_enrolment` | R C U D | R C U | R | R | — |
| `milestone`, `office_service` | R C U D | R C U | R | R | — |
| `production_initiative`, `mentorship_session`, `market_linkage`, `guidance_record` | R C U D | R C U | R | R | — |
| `exhibition` | R C U D | R C U | R | R | R |
| `exhibition_registration` | R C U D | R C U | R | R | R C own |
| `exhibition_registration_product` | R C U D | R C U | R | R | R C own |
| `promotional_action` | R C U D | R C U | R | R | — |
| `coordination_meeting`, `_partner`, `case_study` | R C U D | R C U | R | R | — |
| `followup_survey` and children | R C U D | — | R C U draft | — | — |
| `attachment` | R C U D | R C | R C | R | — |
| `audit_log` | R | — | — | — | — |

Nobody, including `coordinator`, may update or delete `audit_log`.

**The `followup_survey` row was corrected on 2026-08-31 to match the database,
not the other way round.** It granted `R` to `data_entry` and to
`partner_viewer`; `fu_read` admits `current_role() in ('coordinator',
'enumerator')` and always has. Tested as all five roles against a submitted
survey, through RLS: coordinator 1 row, enumerator 1 row, `data_entry` 0,
`partner_viewer` 0, `participant` 0.

The database is the stricter one and it is right. A follow-up survey is
forty-three answers about one named person's household, income and food-safety
compliance — the most intrusive record the platform holds. `data_entry` never
has a reason to open one, and `partner_viewer` is the donor, who gets
percentages: `v_indicator_actual` admits `partner_viewer` explicitly, so the
figures reach them without the interviews behind them ever doing so.

> **Two roles losing a permission on paper is not a regression here — it is the
> document catching up.** When this file and `pg_policy` disagree, find out
> which is right before changing either; §15 exists because the assumption ran
> the other way and two guards turned out never to have been built.

### The same divergence runs through eighteen more rows — see OQ-39

**Added 2026-09-01.** The correction above fixed the one row it was looking at.
Measured across the whole matrix while testing the guidance log as all five
roles: **every operational table's SELECT policy is `is_staff()`**, so
`partner_viewer` reads *nothing* from any of them — not `partner`, not
`partnership`, not `partner_contribution`, not `attachment` — while this table
grants them `R` on all eighteen.

Counted through RLS as each role, in a transaction that rolled back:
`partner_viewer` got 0 rows from `partner`, `partnership`,
`partner_contribution`, `training_session` and `exhibition`, and all 20 rows
from `v_indicator_actual`.

It is **not** corrected here, and that is deliberate. Two of those rows are a
real decision rather than drift — `partner`/`partnership` hold no personal data,
and `attachment` is the evidence trail for the four indicators whose
defensibility rests on it. Editing the matrix to match `pg_policy` would turn
this file back into a description of the code, which is the failure §15 records.
Recorded as **OQ-39** for the M&E lead, who is the `partner_viewer`.

> **A correction that fixes the row you were looking at, in a table with
> nineteen rows of the same shape, is half a correction.** The August fix was
> right and stopped one row short of the sweep.

---

## 4. Policy patterns

### Reference tables — read by all, written by coordinator

```sql
alter table public.ref_product enable row level security;

create policy ref_product_read on public.ref_product
  for select to authenticated using (true);

-- INSERT and UPDATE named separately. NOT `for all` -- see below.
create policy ref_product_insert on public.ref_product
  for insert to authenticated
  with check (public.is_coordinator());

create policy ref_product_update on public.ref_product
  for update to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());
```

Repeat for every `ref_*` table.

**This pattern said `for all` until 2026-09-03, and `for all` includes DELETE.**
A `ref_*` table carries `deleted_at`, `is_active` and `guard_soft_delete`, so
the intended retirement path is `is_active = false` — and the policy quietly
granted a coordinator a way round all three. Eight of the tables (`0075`'s
survey option lists) were built from this pattern literally and had exactly one
`for all` policy; the other eighteen had a separate `ref_delete`. Both were
removed in `0109`. The lesson is small and worth keeping: **`for all` is four
verbs, and one of them is the one this project does not do.** Name the verbs
you mean. See §16.

### Operational tables — the standard four

```sql
alter table public.guidance_record enable row level security;

create policy gr_read on public.guidance_record
  for select to authenticated
  using (public.is_staff() and deleted_at is null);

create policy gr_insert on public.guidance_record
  for insert to authenticated
  with check (public.can_write());

create policy gr_update on public.guidance_record
  for update to authenticated
  using (public.can_write() and deleted_at is null)
  with check (public.can_write());

-- no delete policy at all: rows are never removed
```

Soft delete is an `update` that sets `deleted_at`. Restrict it with a trigger:

```sql
create or replace function public.guard_soft_delete()
returns trigger language plpgsql as $$
begin
  if new.deleted_at is distinct from old.deleted_at
     and not public.is_coordinator() then
    raise exception 'Only a coordinator may delete or restore a record';
  end if;
  return new;
end $$;
```

Attach to every operational table.

---

## 5. `exhibition_registration` — the two-sided table

This is the only table two different roles write to, and the only place a participant creates data.

```sql
alter table public.exhibition_registration enable row level security;

-- staff see everything
create policy er_staff_read on public.exhibition_registration
  for select to authenticated
  using (public.is_staff() and deleted_at is null);

-- a participant sees only their own
create policy er_own_read on public.exhibition_registration
  for select to authenticated
  using (person_id = public.my_person_id() and deleted_at is null);

-- a participant may submit for themselves, always as 'submitted'
create policy er_own_insert on public.exhibition_registration
  for insert to authenticated
  with check (
    person_id = public.my_person_id()
    and status = 'submitted'
    and submitted_by_participant = true
  );

-- staff may create on behalf of someone
create policy er_staff_insert on public.exhibition_registration
  for insert to authenticated
  with check (public.can_write() and submitted_by_participant = false);

-- staff may edit
create policy er_staff_update on public.exhibition_registration
  for update to authenticated
  using (public.can_write() and deleted_at is null)
  with check (public.can_write());
```

**Only a coordinator may approve or reject.** A policy cannot compare `old.status` to `new.status`, so use a trigger:

```sql
create or replace function public.guard_registration_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and not public.is_coordinator() then
    raise exception 'Only a coordinator may approve or reject a registration';
  end if;
  if new.status in ('approved','rejected') then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
```

**Why this matters for the numbers.** `E0.2` counts approved registrations only. If a producer could approve their own, the indicator would be self-reported. The trigger is what makes the figure defensible to the donor.

---

## 6. `person` — the sensitive table

**What this section specified:**

```sql
-- staff read
create policy person_staff_read on public.person
  for select to authenticated
  using (public.is_staff() and deleted_at is null);

-- a participant reads and updates only their own row
create policy person_own_read on public.person
  for select to authenticated
  using (auth_user_id = auth.uid() and deleted_at is null);

create policy person_own_update on public.person
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
```

**What the database has** — two policies rather than four, and *neither filters
`deleted_at`*:

```sql
person_read   select  using (is_staff() or auth_user_id = auth.uid())
person_update update  using / with check
                        (current_role() in ('coordinator','data_entry')
                         or auth_user_id = auth.uid())
```

### The missing `deleted_at` filter is design, and it is what the restore path stands on

Checked on 2026-08-31 rather than assumed, because "a policy that forgot its
soft-delete filter" is exactly what an oversight looks like.

CLAUDE.md requires that a `person` matching a soft-deleted row is **restored,
never recreated** — their unique index is global on purpose, because recreating
an entity moves a figure that has already been reported. Offering restore means
being able to *find* the soft-deleted row and then *write* to it. A
`deleted_at is null` on either policy would make that impossible: the row would
be invisible to the very screen that has to offer the choice.

So the pair is coherent, and it was run end to end as each role, through RLS, in
a transaction that rolled back:

| | |
|---|---|
| coordinator sets `deleted_at` | 1 row |
| the row is still visible to a coordinator afterwards | visible — restore needs this |
| the row is still visible to `data_entry` | visible |
| `data_entry` clears `deleted_at` | **refused** — *only a coordinator may delete or restore a record* |
| coordinator clears `deleted_at` | 1 row, live again |

**`guard_soft_delete` is what makes it safe, not the policy.** The policy lets
`data_entry` see and update a soft-deleted person; the trigger is the only thing
stopping them undeleting one. That is the right division — §15 is the record of
what happened when that trigger did not exist — but it means this permission
cannot be reasoned about from `pg_policy` alone.

### Nothing relies on it yet, and that is the part to watch

**The restore path is not built.** No screen offers it, so today this is a
capability sitting unused, and the only *live* consequence is that a staff read
of `person` returns soft-deleted people unless the query excludes them itself.

All three of the application's `person` reads do:
`AuthProvider.tsx`, and two in `data/completions.ts`. They filter
`.is('deleted_at', null)` in the query. So the platform behaves correctly and
would keep behaving correctly if the filter were added to the policy — until
someone came to build the restore path and found the row invisible.

> **A fourth `person` read that forgets `.is('deleted_at', null)` will silently
> include deleted people, and RLS will not stop it.** That is the cost of
> keeping this open. Grep before adding one:
>
>     grep -n "from('person')" app/src -r

**A participant must never change their own national ID, refugee status or disability status.** Those drive indicator disaggregation. Guard with a trigger:

```sql
create or replace function public.guard_person_immutable()
returns trigger language plpgsql as $$
begin
  if not public.is_staff() then
    if new.national_id   is distinct from old.national_id
    or new.is_refugee    is distinct from old.is_refugee
    or new.has_disability is distinct from old.has_disability
    or new.auth_user_id  is distinct from old.auth_user_id then
      raise exception 'This field can only be changed by municipal staff';
    end if;
  end if;
  return new;
end $$;
```

### Masking the national ID for the donor role

`partner_viewer` gets no access to `person` at all. Give them a view instead:

```sql
create or replace view public.v_person_public
with (security_invoker = false) as
select
  id,
  left(national_id, 3) || '******' as national_id_masked,
  full_name,
  sex,
  public.age_band(person.*) as age_band,
  is_refugee,
  has_disability,
  village
from public.person
where deleted_at is null;

revoke all on public.v_person_public from anon;
grant select on public.v_person_public to authenticated;
```

Then a policy on `person` that explicitly excludes `partner_viewer`, so they can only reach the masked view.

---

## 7. `followup_survey` — the enumerator table

```sql
create policy fs_read on public.followup_survey
  for select to authenticated
  using (public.is_staff() and deleted_at is null);

create policy fs_insert on public.followup_survey
  for insert to authenticated
  with check (public.current_role() in ('coordinator','enumerator'));

create policy fs_update on public.followup_survey
  for update to authenticated
  using (
    public.is_coordinator()
    or (public.current_role() = 'enumerator' and status = 'draft')
  )
  with check (
    public.is_coordinator()
    or (public.current_role() = 'enumerator' and status in ('draft','submitted'))
  );
```

An enumerator can write a draft and submit it once. After that only a coordinator can reopen it. This protects the percentages in `A1`, `B1`, `C1` and `IMP-0` from being edited after reporting.

Child tables (`followup_answer`, `followup_answer_option`, `followup_safety_item`, `followup_buyer_connection`) inherit the same rule by checking the parent:

```sql
create policy fa_write on public.followup_answer
  for all to authenticated
  using (exists (
    select 1 from public.followup_survey s
    where s.id = survey_id
      and (public.is_coordinator()
           or (public.current_role() = 'enumerator' and s.status = 'draft'))
  ));
```

### The review side, and what actually refuses an enumerator

`0099` added `review_followup` — approve, reject and reopen — and `0097` added
`reviewed_by`, `reviewed_at`, `review_note`, the `rejected_has_a_reason`
constraint and the `guard_followup_review` trigger.

There are four things between an enumerator and an approval, and **only three
of them are boundaries**:

| | what it does |
|---|---|
| `fu_update` USING | coordinator on any survey, enumerator only while it is a draft |
| `fu_update` WITH CHECK | enumerator may write only `draft` or `submitted` (0093) |
| `guard_followup_review` | raises for any non-coordinator status change, including from a connection with no JWT (§12) |
| the role test inside `review_followup` | **not a boundary.** It exists so the refusal is a readable `not_permitted` instead of a filtered row or a raw 42501 |

Measured as an enumerator, through RLS, writing to the table **directly** rather
than through the function, in a transaction that rolled back:

| attempt | result |
|---|---|
| `SUBMITTED -> approved` | no error, **0 rows**, status unchanged |
| `SUBMITTED -> rejected` | no error, **0 rows**, status unchanged |
| `SUBMITTED -> draft` (reopen) | no error, **0 rows**, status unchanged |
| their own `DRAFT -> approved` | **raised 42501**, status unchanged |

> **Three of those four refusals are silent.** `fu_update`'s USING filters the
> row; the UPDATE affects nothing and reports success, so a client driving
> PostgREST directly gets a 200 back. This is the seventh failure in `CLAUDE.md`
> on the review path, and it is why `review_followup` counts what came back
> (`GET DIAGNOSTICS`) instead of trusting that the UPDATE did anything.

The fourth is what `guard_followup_review` is for: on a **draft** the enumerator
passes USING, so the row is not filtered and only the trigger stops them. It got
there before the WITH CHECK did.

`data_entry`, `partner_viewer` and `participant` receive `not_found` rather than
`not_permitted`, because `fu_read` does not admit them either — the survey
genuinely does not exist as far as they can see, and saying so leaks nothing.

### Approving does not move a figure, and the function proves it rather than saying it

All four survey-fed views admit `submitted` and `approved` identically, so
approval changes no number; rejecting and reopening remove the survey from every
indicator it feeds. **That sentence is not written down in the function.**
`followup_indicator_reach` (0098) is asked twice — at the current status and at
the status the action would produce — and it reads each view's admitted statuses
out of `pg_get_viewdef` rather than assuming them. The difference between the
two answers is what the screen renders.

The obvious way to read that gate is wrong, and it is worth knowing why:

```
'status = ANY \(ARRAY\[([^]]*)\]\)'      -- matches q17_activity_STATUS
'\mstatus = ANY \(ARRAY\[([^]]*)\]\)'    -- correct; \m is a word boundary
```

Without `\m` the pattern matches `q17_activity_status` in `v_ind_c1` and returns
Q17's answer list, from which no `record_status_t` value can be read — so C1
would have been reported as unaffected by any status change. Wrong, and wrong in
the reassuring direction. `followup_view_statuses` requires **exactly one** gate
and raises otherwise; both failure shapes were sabotage-tested against a
rewritten view before the migration was applied.

---

## 8. Storage

Private bucket `evidence`. Path convention:

```
{entity_type}/{entity_id}/{uuid}_{filename}
```

Policies:

```sql
-- staff may read
create policy evidence_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.is_staff());

-- staff may upload
create policy evidence_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_staff());

-- only a coordinator may remove
create policy evidence_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidence' and public.is_coordinator());
```

No public URLs. Serve through signed URLs with a short expiry.

Evidence is mandatory for `B1.1`, `G0.1`, `G0.2` and `G0.3` — the workbook names the document required for each. Enforce with a check on the milestone and case study tables that at least one attachment exists before the record can be marked complete.

---

## 9. Verification

Run these after the RLS migration. All three must pass.

```sql
-- 1. no table without RLS
select tablename from pg_tables t
where schemaname = 'public'
  and not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t.tablename and c.relrowsecurity
  );
-- expect zero rows

-- 2. RLS on with no policy, other than the two where that is the design
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  and c.relname not in ('applicant_lookup_secret', 'applicant_lookup_throttle');
-- expect zero rows

-- and confirm the two are still there, so this cannot pass by their being dropped
select count(*) = 2
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relrowsecurity
  and c.relname in ('applicant_lookup_secret', 'applicant_lookup_throttle')
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
-- expect true

-- 3. anon reaches the four public views and nothing else
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
  and table_name not in ('v_public_opportunity', 'v_public_activity_type',
                         'v_public_producer_type', 'v_public_product');
-- expect zero rows

-- and confirm the four are still there, so this check cannot pass by the
-- public site having been taken away
select count(*) = 4
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
  and privilege_type = 'SELECT'
  and table_name in ('v_public_opportunity', 'v_public_activity_type',
                     'v_public_producer_type', 'v_public_product');
-- expect true
```

**Check 2 was corrected on 2026-09-03, for the same reason check 3 was.** It
read "expect zero rows" and returned two — `applicant_lookup_secret` and
`applicant_lookup_throttle` — and had done since `0050`. Zero policies denies
every role, which is *stricter* than any policy could be and is the right shape
for a table nothing may touch except a `security definer`; adding one to satisfy
the check would weaken both. So the expectation was wrong, not the schema. It is
now an allow-list with a second query that fails if the two are dropped, because
an exception list alone passes happily when the exceptions have been deleted.
The thing worth catching is a **third** — a new table with RLS on and no policy
is usually an unfinished migration. See OQ-42.

**Check 3 used to read "anon has no access anywhere, expect zero rows", and that
was this document contradicting itself.** §10 describes a public site that reads
as `anon` by design, and `0048` and `0056` granted it four views. §9 predates
that site and was never revisited, so the stated expectation had been wrong for
every run since — which means either nobody ran it, or somebody ran it, saw four
rows, and decided they were fine. Both are worse than no check.

It is now an allow-list, and it fails on a **fifth** grant, which is the thing
worth catching: one more `grant select … to anon` is how programme data reaches
the open internet. The second query is there because an allow-list alone passes
happily when the four views have been dropped — a check that can be satisfied by
deletion is not checking.

The name is also why the contradiction survived: `role_table_grants` lists
**views** as well as tables, so §10's "no grants on any table" and §9's zero rows
are not the same claim, and only one of them is true.

Then test by hand: sign in as each of the five roles and confirm a `participant`
cannot read another person's row, and a `partner_viewer` cannot select from
`person`. And run §10's `set role anon` test — a grant is not proof that the
view returns anything, and four grants are not proof that four views work.

---

## 10. Public views and the nested-invoker trap

The public site has no sign-in, so it reads as `anon`. `anon` holds **no grants on any table**, and that does not change. It reads four views and nothing else: `v_public_opportunity`, and the three reference lists `0056` added for the exhibition application form — `v_public_activity_type`, `v_public_producer_type` and `v_public_product`.

*(This sentence said "exactly one object" until 2026-08-31. `0056` had added the other three months earlier.)*

### The rule

> **A public `security definer` view must read BASE TABLES ONLY — never another view, unless that view is `security definer` too.**

### The failure mode, because it is counterintuitive

A `security definer` view wrapping a `security_invoker` view **does not shield it**. Permissions on the inner view are still checked against the **original caller**, not against the outer view's owner. So:

```
anon
  └─ v_public_opportunity      security definer  ← runs as owner
       └─ v_opportunity        security_invoker  ← still evaluated as ANON
            └─ training_session                  ← anon has no grant

ERROR: 42501: permission denied for table training_session
```

The visitor gets **an error page, not an empty list**. This happened in migration `0048` and was fixed in `0049` by making the public view self-contained.

### What follows from it

- A public view carries **every** filter in its own `WHERE` clause. It cannot inherit one from a view it reads, because it must not read one.
- `security definer` means **RLS does not apply**. The `WHERE` clause is the entire security boundary — there is nothing behind it. For `v_public_opportunity` that is four conditions on every branch: `is_published`, `not is_cancelled`, `end_date >= current_date`, `deleted_at is null`.
- Adding a `union all` branch or a column means re-checking all four. Missing `deleted_at is null` republishes soft-deleted records to the open internet — migration `0025`'s bug from the other direction.

### Testing it

Reading the definition is not a test. Reading `information_schema.role_table_grants` is not a test. **Execute as the role:**

```sql
set role anon;
select count(*) from public.v_public_opportunity;   -- must return rows
select 1 from public.person limit 1;                -- must raise 42501
reset role;
```

Every anon-facing object gets this before it ships.

---

## 11. Trigger functions are granted to nobody

**A trigger fires as part of the statement that fired it. It does not consult `EXECUTE` privilege on its function.**

So a grant on a trigger function buys the trigger nothing. All it does is create a second way to reach a guard — by calling it directly, outside the context it was written for, with arguments it never expected.

### The rule

> Every function in `public` that `returns trigger` is revoked from `public`, `anon` and `authenticated`. No exceptions. If a routine genuinely needs to be callable *and* used as a trigger, that is two functions: a granted one that takes explicit arguments, and a trigger wrapper that is granted to nobody.

### How it was missed

`check_delivery_not_future` arrived with migration `0043` and was executable by `public`, `anon` and `authenticated`. Every other trigger function in the schema — `audit_row`, `guard_registration_status`, `guard_person_national_id`, `handle_new_user`, `set_updated_at` and the rest — was already locked to nobody. One function missed the pattern, and nothing was checking.

What it exposed was small: the function reads `NEW` and raises, so calling it by hand achieves nothing. **It was closed anyway.** An unnecessary grant on a security boundary is a defect regardless of whether today's version of the function happens to be harmless — the next edit is the one that isn't, and by then nobody remembers the grant is there.

### Verifying it

`0055` swept the whole schema rather than fixing the one. To check it has stayed swept:

```sql
select p.proname
from pg_proc p
join pg_namespace s on s.oid = p.pronamespace
join pg_type t on t.oid = p.prorettype
where s.nspname = 'public' and t.typname = 'trigger'
  and (has_function_privilege('public', p.oid, 'EXECUTE')
       or has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
```

**Expected: zero rows.**

And confirm the triggers still fire afterwards, rather than assuming they do — inserting a `training_session` with `is_delivered = true` and a future `end_date` must still be refused. It was, with zero grants in place.

---

## 12. `current_role()` is null without a JWT, and guards default to refusing

`public."current_role"()` reads `auth.uid()`. With **no JWT there is no uid**, so it returns null, and every guard that coalesces a null role treats the caller as the least-privileged one.

`guard_registration_status` does exactly that:

```sql
if new.status is distinct from old.status
   and coalesce(public."current_role"(), 'participant') <> 'coordinator' then
  raise exception 'only a coordinator may change registration status';
end if;
```

### What this means in practice

**A direct database connection is not privileged here.** Reverting two test approvals through the Supabase MCP — a connection with full table rights — was refused with *"only a coordinator may change registration status"*. The row could not be updated until coordinator claims were set:

```sql
perform set_config('request.jwt.claims',
  json_build_object('sub', (select id::text from app_user where role = 'coordinator' limit 1),
                    'role', 'authenticated')::text, true);
```

This is the guard working. It is not a bug, and it is worth writing down because **it will not look like a guard when it happens.** A migration, a backfill, a scheduled job or a support script that touches `exhibition_registration.status` will fail with a message about coordinators, from a connection that owns the table — which reads like a broken trigger rather than a policy decision.

> **Any script or job that changes a status must carry coordinator claims.** Set them explicitly, in the same transaction, and say in a comment why.

The same applies to anything else guarded on `current_role()`. Grep for `coalesce(public."current_role"()` before writing a script that updates rows in bulk.


---

## 13. RLS applies the UPDATE policy to `SELECT ... FOR UPDATE`

**Any function that locks a row before updating it will hit this.** It is not obvious from reading either the policy or the function, and the symptom is a message that is wrong rather than an error that is loud.

Measured on `linkage_request`, as `data_entry`, on a row that exists:

```sql
select ... where id = $1;              -- 1 row
select ... where id = $1 for update;   -- 0 rows
```

`linkage_request` has `op_read` = `is_staff()` and `op_update` = coordinator only. A plain read passes the SELECT policy. A **locking** read must also pass the UPDATE policy's `USING` clause, so for a non-coordinator it returns nothing — silently, with no error.

`match_linkage_request` (0067) opened with exactly that pattern:

```sql
select * into v_req from linkage_request where id = p_request_id for update;
if not found then
  return jsonb_build_object('ok', false, 'result', 'not_found');
end if;
```

So a `data_entry` user clicking **Match** was told *"That request no longer exists. It may have been withdrawn while this page was open."* The request was on their screen. They would reload, still see it, and conclude the software was broken.

**The guard held — nothing was ever written.** The defect was the words. A refusal must never be dressed as a disappearance: it sends someone to look for a bug instead of for a coordinator.

`0068` fixes it by looking rather than assuming:

```sql
if not found then
  if exists (select 1 from linkage_request where id = p_request_id and deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'not_permitted');
  end if;
  return jsonb_build_object('ok', false, 'result', 'not_found');
end if;
```

The plain read is safe to distinguish on because `op_read` is `is_staff()` — anyone who can reach the function at all can see the row. A caller who cannot passes neither read and still gets `not_found`, which for them is true.

> **When a `security invoker` function locks before updating, an empty `FOR UPDATE` means either "no such row" or "not your row". Tell them apart before reporting absence.**

This also means the lock is doing double duty as an authorisation check. That is fine — it is the same policy either way — but do not *rely* on it as the only one, because it is invisible at the call site.

---

## 14. A `security invoker` function needs its own grant on every function it calls

The sibling of §10. There the outer object was a definer and the inner one was not, so the inner view's permissions were still checked against the visitor. Here it is the other way round — the outer function is an **invoker** — and the same thing happens for the same reason: the caller's privileges are what get checked, however deep the call goes.

### The rule

> **A `security invoker` function runs every nested call with the CALLER's privileges. If it calls a `security definer` function, the caller needs `EXECUTE` on that function — being allowed to call the outer one is not enough.**

### The failure mode

`save_followup_section_c` is an invoker on purpose. All three section saves rely on RLS applying the UPDATE policy to their locking read (§13), and that read *is* the permission check. A definer would bypass RLS and let any authenticated user write any survey.

`count_markets_attended` is a definer on purpose. It reads every exhibition registration for a person, so `0086` revoked `EXECUTE` from `public`, `anon` and `authenticated` — otherwise any logged-in account could ask how many markets any named person had attended.

Both decisions are right. Together they did not work:

```
authenticated (an enumerator)
  └─ save_followup_section_c        security INVOKER  ← runs as the enumerator
       └─ count_markets_attended    security DEFINER  ← EXECUTE still checked
                                                        against the ENUMERATOR

ERROR: 42501: permission denied for function count_markets_attended
```

`authenticated` is the only role the application ever connects as, so **Section C could not be saved by anybody**. `0089` is the fix: `EXECUTE` granted to `authenticated`, and the coordinator-or-enumerator gate moved *inside* the definer so the grant does not reopen what `0086` closed.

### Why nothing caught it

Every check in the project passed. The file existed, the function existed, the signature was right, `check_migration_files.sh` passed, `tsc` and `eslint` passed, the option lists were seeded, and the Q30 prefill worked correctly on screen — because `followup_prefill_for_staff` is a **definer**, so its nested call is checked against its owner rather than the caller.

Half the feature worked and the visible half was the working one.

> **A privilege check does not fire for the owner, and the owner is who runs it when a query is pasted into the SQL editor.** Testing a `security invoker` function as `postgres` proves nothing about whether anyone else can run it. It fires for `authenticated`, once, in a field, at the end of an interview.

This is the same shape as §13: a permission behaves differently for the role that will actually use it, and testing as yourself cannot see the difference.

### Testing it

Reading `proacl` is not a test. Reading the function body is not a test. **Execute as the role, with the claims set:**

```sql
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<an enumerator''s auth.users id>"}';
  select public.save_followup_section_c(p_survey_id => '<a draft>', p_q29 => 'about_same');
rollback;
```

`set local role` and `set local request.jwt.claims` inside a transaction that rolls back is the whole technique, and it costs nothing — DDL and grants are transactional in PostgreSQL, so a fix can be simulated in the same transaction and thrown away.

Both directions, as everywhere else in this document: confirm the roles that should reach it do, **and** that the roles that should not are refused. `0089` was verified with four calls — enumerator and coordinator return a number, participant and partner_viewer raise `insufficient_privilege`.

### Where else this can bite

Any invoker calling a definer. Today there is exactly one such call in the whole schema — `save_followup_section_c` calling `count_markets_attended` — and this is the sweep that says so:

```sql
with stripped as (
  select p.oid, p.proname, p.prosecdef,
         regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g') as src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prolang = (select oid from pg_language where lanname = 'plpgsql')
     and p.prorettype <> 'trigger'::regtype
),
definers as (
  select oid, proname,
         has_function_privilege('authenticated', oid, 'EXECUTE') as authed_can_call
    from stripped where prosecdef
)
select s.proname as invoker, d.proname as calls_definer, d.authed_can_call
  from stripped s join definers d on s.src ~ ('\m' || d.proname || '\M')
 where not s.prosecdef and d.proname <> s.proname
 order by d.authed_can_call, s.proname;
```

**Both exclusions in that query are there because the obvious version was wrong,** and it is worth saying how — it is CLAUDE.md's sixth failure, committed while writing the check for the ninth.

The first draft matched `prosrc` directly and returned six rows that looked like the same defect: three trigger functions, `authed_can_call = false`, called from the section saves. All six were false.

- **`prosrc` includes comments.** Every one of those matches was a *comment* saying an option id "has to reach `guard_followup_option` and be refused". Searching a function body for a name tells you the name appears in it, not that anything calls it — the same thing that made an `ilike '%status%'` on a view definition return true for four views that filtered nothing.
- **Trigger functions are not called by the function that fires them.** The trigger mechanism runs them as the trigger's owner, so no `EXECUTE` check happens against the caller at all. `authed_can_call = false` is correct and deliberate for every one of them — see §11.

A check that cries wolf six times is worse than no check, because the seventh time nobody looks. A new definer with a narrow grant is still the moment to run this.

---

## 15. What this document specified and the database did not have

Twice now this file has been read as a description of the database. It was a specification. On 2026-08-29 every guard named here was checked against `pg_proc` and `pg_trigger`:

| Specified in | Status before 0069 |
|---|---|
| `guard_soft_delete` — §4 | **missing entirely.** No function, no trigger |
| `guard_person_immutable` — §6 | **missing entirely.** No function, no trigger |
| `can_write()` — §2, §4 | never created; policies inline `current_role() = any(...)` instead |
| `guard_registration_status` — §5 | present and attached |
| `guard_person_national_id` | present, and *stricter* than §6 asks — coordinator only, not staff |
| `v_person_public` — §6 | present |
| evidence storage policies — §8 | read / insert / **update** present; no delete policy at all |

**`guard_soft_delete` was the serious one.** Soft delete is an `update` that sets `deleted_at`, and the update policy on `person` admits `data_entry`. So a data_entry account could delete any person, partnership, session or partner — removing them from `A1.3`, `B1.2`, `D0.1`, `E0.2` and every disaggregation, retroactively, in quarters already reported to the donor. It is the most destructive operation in the schema and it was the one restriction never built. Nothing went wrong only because the data_entry account is a test fixture.

Both guards were built in `0069` and verified as `data_entry` and as `participant` through RLS with `set local role authenticated` — not as the owner, which bypasses RLS and would have proved nothing.

Two divergences are deliberately left alone:

- **`can_write()`** is doc drift, not a hole. The policies do the same test inline. This file should be corrected to match the database, or the function added — but nothing is unprotected today.
- **No `delete` policy on `storage.objects`** is *stricter* than §8, which grants delete to a coordinator. Absent policy means nobody deletes. Left as is.

One thing found while checking, and **not** resolved: `evidence_staff_update` exists and is not in §8. An update on a storage object lets any staff member overwrite evidence in place — which destroys it as surely as a delete would, without needing the delete permission §8 withholds. Recorded as **OQ-30**.

`attachment` carries `uploaded_by`/`uploaded_at` rather than the standard `created_by`. Functionally the same thing under a different name; noted so the next person does not go looking for `created_by`.

> **Anything specified in this file is a claim until a query says otherwise.** `check-soft-delete-guards.mjs` now fails the build if a table carrying `deleted_at` has no guard, and `check-constraint-names.mjs` does the same for error mappings. Neither existed when this document was written, and both were added after the thing they check turned out to be missing.

---

## 16. Deletion: which tables may lose a row, and which may not

Added 2026-09-03 with migration `0109`. §4 says *"no delete policy at all: rows
are never removed"* and §15 records that `guard_soft_delete` was missing
entirely until `0069`. Both were about the **soft** delete path. Neither asked
whether anything could take the **hard** one.

### What was found

`guard_soft_delete` is a `before update` trigger. That is correct — a soft
delete *is* an update — and it means the guard cannot see a `DELETE`. Measured
through RLS as a real coordinator, `set local role authenticated` with the
claims set, in a transaction that rolled back:

| statement | rows |
|---|---|
| `delete from ref_safety_item where code = <first>` | **1** |
| `delete from indicator_target` | **260** |
| `delete from reporting_period where code = '29/Q3'` | **1** |

260 rows is the donor's entire quarterly target matrix, and `indicator_target`
has no `deleted_at` to reverse it with. The period went next because the foreign
keys protecting it now pointed at rows that were gone.

`check-soft-delete-guards.mjs` passed throughout. It asks whether a table with
`deleted_at` has a guard; all 32 do. It never asks whether deletion goes through
that guard, and on all 32 it did not have to.

> **A guard on one verb is not a guard.** `deleted_at` plus a trigger describes
> the path you intend people to take. It says nothing about the paths you left
> open beside it. Ask which statements can remove a row, not whether the
> intended one is guarded.

### The classification

Every table falls into one of four cases. `0109` acts on the first three.

**1 — Rewritten by delete-then-insert. DELETE is correct; leave them.** Eight
tables, every multi-select and every follow-up child:

```
exhibition_registration_product   person_activity_type
partnership_role                  coordination_meeting_partner
followup_answer                   followup_answer_option
followup_safety_item              followup_buyer_connection
```

A `deleted_at` here would be a defect, not a tightening: re-ticking a box would
find the soft-deleted row and either fail the unique key or resurrect a row with
the wrong provenance. Their history is safe because of the two things below,
both confirmed from the catalogue rather than assumed:

- all eight carry an **AFTER INSERT OR UPDATE OR DELETE** `audit_row` trigger,
  which writes `old_data`, `actor` and `actor_role` for every row removed;
- all eight hang off a parent that **is** soft-deleted and audited —
  `exhibition_registration`, `person`, `partnership`, `coordination_meeting`,
  `followup_survey` — by an `on delete cascade` that can now never fire, because
  the parent can no longer be hard-deleted.

Note for anyone reading `audit_log` afterwards: `person_activity_type` and
`coordination_meeting_partner` have composite primary keys and no `id` column,
so `audit_log.row_id` is **null** for them. The whole removed row is in
`old_data`; the identity is in there, not in `row_id`.

**2 — Never lose a row. `deleted_at` already present.** The 26 `ref_*` tables
and every operational table. They had the column, the guard and — until `0109` —
a `ref_delete` policy admitting a coordinator straight past both. Retirement is
`is_active = false` (OQ-20).

**3 — Never lose a row, and no `deleted_at` is wanted.** `objective`,
`activity`, `indicator`, `indicator_target`, `reporting_period`,
`indicator_snapshot`, `app_user`, `audit_log`, `applicant_lookup_secret`.

The framework five are the *definition* of the report rather than data about it;
a `deleted_at` would let an indicator vanish from the framework while its rows
still existed. `app_user` has `is_active`, which `current_role()` already
honours (`0032`). `indicator_snapshot` is argued in `0109`'s header: a snapshot
is one half of the reconciliation OQ-25 exists to make possible, and a column
that hides it would remove the half that says what was reported.

**4 — Deletion is the design.** `applicant_lookup_throttle` only — OQ-21,
approved 26 August 2026 and written into `CLAUDE.md` rule 2.

### What `0109` does, and why a policy alone was not enough

`guard_no_hard_delete()` is a `before delete` trigger attached to all 57 tables
outside cases 1 and 4, by walking `pg_class` rather than from a written list, so
a table added later without one is an omission the migration's own verification
block fails on rather than a typo nobody sees. The DELETE-capable policies
(`ref_delete`, `au_delete`, and the `for all` inside `ref_write` on the eight
`0075` option lists) come off the same tables.

**The trigger is the boundary; the policy change is housekeeping.** RLS does not
apply to the table owner, so dropping `ref_delete` protects `authenticated` and
leaves every migration, support script and MCP session able to do it anyway —
which is the connection the three deletes above were first reproduced from.

### Testing it

Both directions, as §14 requires, and **counting rows rather than catching
exceptions** — which is the mistake this pass made first time and had to redo:

> An RLS-filtered delete raises nothing. It affects zero rows and reports
> success. So a test that only catches exceptions reads "no error" as "deleted",
> and a test that only counts rows cannot tell a guard from a missing policy.
> You need both numbers, and you need the owner path, where RLS is not there to
> flatter the result.

| as | statement | result |
|---|---|---|
| owner | `delete from indicator_target` | **refused, 23001** |
| owner | `delete from audit_log` | **refused, 23001** |
| owner | `delete from app_user where role='partner_viewer'` | **refused, 23001** |
| owner | `delete from indicator_snapshot` (20 rows seeded first) | **refused, 23001** |
| owner + `app.allow_hard_delete='on'` | same | 20 rows — the escape works |
| owner + `app.allow_hard_delete='off'` | same | **refused, 23001** |
| owner | `delete from partnership_role` | 2 rows — the junction still works |
| coordinator | `delete from ref_safety_item` | 0 rows — policy gone |
| coordinator | `update person set deleted_at = now()` | 1 row — soft delete unaffected |
| coordinator | `delete from partnership_role` | 2 rows — junction unaffected |
| `anon`, through `applicant_prefill` | throttle purge | stale bucket gone |

The seeded-snapshot row matters: a **row-level** `before delete` trigger fires
once per row, so an empty table returns "0 rows, no error" and proves nothing.
The first run of this test read `indicator_snapshot` as unprotected for exactly
that reason.

The last case that needed constructing: after `0109` there is no table where
`authenticated` can reach a DELETE at all, so the policy would always stop them
first and the trigger would never be exercised. DDL is transactional, so a
delete policy was created for `authenticated` inside the transaction and thrown
away with it:

```sql
create policy tmp_probe_delete on public.promotional_action
  for delete to authenticated using (true);
set local role authenticated;              -- with a coordinator's claims
select set_config('app.allow_hard_delete','on',true);
delete from public.promotional_action;     -- ERROR 23001
```

Refused with the switch thrown, because `authenticated` is not the table owner.
That is the property worth having: the escape hatch is not reachable from the
application at any role, whatever a policy later says.

---

## 17. A second municipality, and the sixth role

Added 13 September 2026 with migrations 0111–0119. The full account is
`09_MULTI_MUNICIPALITY.md`; this section is what changes for a reader of
**this** document.

**The enum is six values.** `super_admin` was added (0116). The five roles in
§1 are unchanged and keep every policy in §3; `data_entry`, `enumerator`,
`partner_viewer` and `participant` are simply unassigned at the moment.

**Every policy in §3 now has a second condition.** On the 35 scoped tables —
the framework six, the seventeen Sahel Horan operational tables, the three
partner tables, their seven child tables and `attachment` — every USING and
every WITH CHECK also requires

    public.can_see_municipality(municipality_id)

which is: a super admin not switched into a municipality sees everything; a
super admin switched into one, or anyone else, sees only their own. The
matrix in §3 is therefore read per municipality: a Sahel Horan coordinator has
`R C U D` on Sahel Horan's `partnership` rows and nothing on Ramtha's. §2's
helpers `is_coordinator()` and `is_staff()` admit `super_admin`; `can_write()`
now exists and is what every insert/update policy calls.

**Three tables are addressed by hand.** `person` and `person_activity_type` are
shared and keep §6 as it stands. `app_user`: own row, a coordinator's own
municipality, a super admin everything — and `guard_app_user` (0117) refuses
what a policy cannot express: changing your own role, deactivating yourself,
removing the last super admin, or a non-super-admin minting one. `audit_log`:
a coordinator reads rows about their municipality and rows about shared tables.

**The three exposed views carry the municipality gate in their WHERE**, next to
the role gate §7 of `07_BUILD_CHECKLIST.md` describes, because they are security
definer and table RLS does nothing for them.

**OQ-35 is closed.** 0118 recreated every policy `to authenticated`.

**§14's technique now has a third account shape to run.** The isolation test in
0118 is the template: as the Sahel Horan admin, as the Ramtha admin, and as the
super admin both switched in and not, in a savepoint that is discarded — every
scoped table, not a sample.
