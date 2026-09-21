-- ═══════════════════════════════════════════════════════════════════════════
--  0138 — a second identifier on the shared person table: the UNHCR number
--
--  KHALIDIYAH_IMPLEMENTATION_PLAN.md Part 2.1, decision D1.
--
--  ── WHY ──
--
--  `person.national_id` is NOT NULL, checked by ^[0-9]{9}$ and unique. A
--  Syrian refugee registered with UNHCR who holds no Jordanian national ID
--  cannot be inserted today. Khalidiyah's volunteer registration (SO3-F2),
--  guidance completion (SO4-G1) and vendor registration (SO4-H2) each ask
--  for "National ID number, or UNHCR registration number for Syrian
--  refugees" and their indicators count unique people on it. The gap is in
--  the SHARED table -- Sahel Horan and Ramtha have it too; Khalidiyah is the
--  first workbook to say so.
--
--  ── WHAT CHANGES ──
--
--  national_id becomes NULLABLE. Its name, format check and unique
--  constraint do not change: it is read by the two public lookup RPCs, the
--  throttle hash, resolvePerson, guard_person_national_id, the demo-range
--  trigger and every person-level form across two municipalities, and
--  renaming it is the condition under which 0082 lost a guard.
--
--  unhcr_number is added, text, nullable, unique where present. NO format
--  regex: no source gives the format, and an invented pattern rejects real
--  numbers (OQ-52). It is normalised only -- trimmed, upper-cased, internal
--  whitespace collapsed -- by a BEFORE trigger so two spellings of one
--  number cannot be two people.
--
--  A person must hold at least one of the two and may hold both.
--
--  ── WHAT IS EXTENDED, AND FROM WHERE ──
--
--  The plan names `guard_person_immutable` as the function to extend. The
--  LIVE schema (captured in supabase/baselines/2026-09-21_all_before_khalidiyah.md)
--  says national_id's immutability lives in `guard_person_national_id`:
--  "national_id cannot be changed" unless the caller is a coordinator or
--  super admin. That is the function extended here, from its live body,
--  with the same rule for unhcr_number -- the two identifiers are treated
--  alike. guard_person_immutable guards refugee/disability/auth fields
--  against non-staff and is not touched.
--
--  `trg_person_reserved_demo_range` fires on INSERT OR UPDATE OF national_id
--  and tests `new.national_id like '3000000__'`. A NULL national_id makes
--  that NULL and the branch is not entered; verified below rather than
--  assumed. The UNIQUE constraint admits many NULLs and the CHECK passes a
--  NULL; both verified below.
--
--  ── WHAT IS NOT CHANGED ──
--
--  applicant_prefill, apply_for_opportunity, my_applications, request_linkage,
--  start_followup, followup_prefill, followup_prefill_for_staff,
--  person_restore_candidate, rmth_ensure_person: every one of them takes a
--  national ID and keeps doing so. Khalidiyah has no public forms, and its
--  own staff lookup (0142) accepts either identifier with the type chosen
--  explicitly on the form -- never auto-detected from the characters typed.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the column ─────────────────────────────────────────────────────────

alter table public.person alter column national_id drop not null;
alter table public.person add column unhcr_number text;

alter table public.person
  add constraint person_has_identifier
  check (national_id is not null or unhcr_number is not null);

alter table public.person
  add constraint unhcr_number_not_blank
  check (unhcr_number is null or btrim(unhcr_number) <> '');

create unique index person_unhcr_number_key on public.person (unhcr_number)
  where unhcr_number is not null;

comment on column public.person.unhcr_number is
  'UNHCR registration number, for a person who holds one. Trimmed, upper-cased, '
  'internal whitespace collapsed; no format check (OQ-52). At least one of '
  'national_id / unhcr_number is required (person_has_identifier). 0138.';

-- ── 2. normalisation ──────────────────────────────────────────────────────

create function public.normalise_person_unhcr_number()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.unhcr_number is not null then
    new.unhcr_number := nullif(upper(regexp_replace(btrim(new.unhcr_number), '\s+', ' ', 'g')), '');
  end if;
  return new;
end $$;

revoke all on function public.normalise_person_unhcr_number() from public, anon, authenticated;

create trigger trg_person_unhcr_normalise
  before insert or update of unhcr_number on public.person
  for each row execute function public.normalise_person_unhcr_number();

-- ── 3. immutability, from the LIVE body of guard_person_national_id ──────
--
--  Live body on 2026-09-21 (pg_get_functiondef):
--
--    if new.national_id is distinct from old.national_id
--       and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
--      raise exception 'national_id cannot be changed';
--    end if;
--    return new;
--
--  The same clause is added for unhcr_number. Nothing else in the body moves.

create or replace function public.guard_person_national_id()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.national_id is distinct from old.national_id
     and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
    raise exception 'national_id cannot be changed';
  end if;
  if new.unhcr_number is distinct from old.unhcr_number
     and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
    raise exception 'unhcr_number cannot be changed';
  end if;
  return new;
end $function$;

-- The trigger fires BEFORE UPDATE with no column list (live definition), so
-- the new clause is reached without touching the trigger.

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_id   uuid;
  v_id2  uuid;
  v_n    int;
  v_got  text;
begin
  -- every existing person still has a national_id
  select count(*) into v_n from public.person where national_id is null;
  if v_n <> 0 then
    raise exception '0138: % existing people lost their national_id', v_n;
  end if;

  -- inside a savepoint that is discarded: a UNHCR-only person can be created,
  -- the demo-range trigger does not fire on a NULL national_id, the number is
  -- normalised, a second UNHCR-only person does not collide on the NULL
  -- national_id, and the same number twice is refused
  begin
    insert into public.person (unhcr_number, full_name, age_recorded)
    values ('  123-06c12345 ', '0138 probe one', 30)
    returning id, unhcr_number into v_id, v_got;
    if v_got <> '123-06C12345' then
      raise exception '0138: unhcr_number was not normalised (got %)', v_got;
    end if;
    insert into public.person (unhcr_number, full_name, age_recorded)
    values ('123-06C99999', '0138 probe two', 31)
    returning id into v_id2;
    if v_id2 is null then
      raise exception '0138: a second UNHCR-only person collided';
    end if;
    begin
      insert into public.person (unhcr_number, full_name, age_recorded)
      values ('123-06c12345', '0138 probe three', 32);
      raise exception '0138: a duplicate unhcr_number was accepted';
    exception
      when unique_violation then null;
    end;
    begin
      insert into public.person (full_name, age_recorded) values ('0138 probe four', 33);
      raise exception '0138: a person with no identifier was accepted';
    exception
      when check_violation then null;
    end;
    raise exception using errcode = 'P0138', message = 'rollback the probe';
  exception
    when sqlstate 'P0138' then null;
  end;

  if exists (select 1 from public.person where full_name like '0138 probe%') then
    raise exception '0138: probe rows survived the rollback';
  end if;

  -- the constraint and index exist under the names the app will map
  if not exists (select 1 from pg_constraint where conname = 'person_has_identifier')
     or not exists (select 1 from pg_indexes where indexname = 'person_unhcr_number_key') then
    raise exception '0138: constraint or index missing';
  end if;
end $verify$;
