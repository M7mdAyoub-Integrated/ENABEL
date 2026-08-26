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
| `partner_contribution` | R C U D | R C U | R | R | — |
| `training_session`, `training_enrolment` | R C U D | R C U | R | R | — |
| `milestone`, `office_service` | R C U D | R C U | R | R | — |
| `production_initiative`, `mentorship_session`, `market_linkage`, `guidance_record` | R C U D | R C U | R | R | — |
| `exhibition` | R C U D | R C U | R | R | R |
| `exhibition_registration` | R C U D | R C U | R | R | R C own |
| `exhibition_registration_product` | R C U D | R C U | R | R | R C own |
| `promotional_action` | R C U D | R C U | R | R | — |
| `coordination_meeting`, `_partner`, `case_study` | R C U D | R C U | R | R | — |
| `followup_survey` and children | R C U D | R | R C U draft | R | — |
| `attachment` | R C U D | R C | R C | R | — |
| `audit_log` | R | — | — | — | — |

Nobody, including `coordinator`, may update or delete `audit_log`.

---

## 4. Policy patterns

### Reference tables — read by all, written by coordinator

```sql
alter table public.ref_product enable row level security;

create policy ref_product_read on public.ref_product
  for select to authenticated using (true);

create policy ref_product_write on public.ref_product
  for all to authenticated
  using (public.is_coordinator())
  with check (public.is_coordinator());
```

Repeat for every `ref_*` table.

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

-- 2. no table with RLS on but no policy
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (select 1 from pg_policy p where p.polrelid = c.oid);
-- expect zero rows

-- 3. anon has no access anywhere
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';
-- expect zero rows
```

Then test by hand: sign in as each of the five roles and confirm a `participant` cannot read another person's row, and a `partner_viewer` cannot select from `person`.

---

## 10. Public views and the nested-invoker trap

The public site has no sign-in, so it reads as `anon`. `anon` holds **no grants on any table**, and that does not change. It reads exactly one object: `v_public_opportunity`.

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

