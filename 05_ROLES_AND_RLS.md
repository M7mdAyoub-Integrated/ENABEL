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
