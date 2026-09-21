-- ═══════════════════════════════════════════════════════════════════════════
--  0144 — the helpers the Khalidiyah tables share
--
--  KHALIDIYAH_IMPLEMENTATION_PLAN.md 5.1, 5.2, 5.6, 5.10, 5.11 and 2.2.
--  Nothing of Ramtha's is modified (plan 5.11): where a Ramtha helper is
--  generic it is reused as it stands and said so; where its shape does not
--  fit, Khalidiyah gets its own beside it.
--
--  ── 1. KHLD-CM-2026-01, KHLD-VOL-0001 ──
--
--  The sheets issue ten references: KHLD-CM-YYYY-NN (meetings), KHLD-CON-
--  YYYY-NN (contributions), KHLD-REH-NN (works items), KHLD-VC-YYYY-NN
--  (campaigns), KHLD-EV-YYYY-NN (activities), KHLD-VOL-NNNN (volunteers),
--  KHLD-AD-YYYY-NN (action days), KHLD-ENT-NNN (enterprises), KHLD-MKT-
--  YYYY-NN (markets), KHLD-VEN-NNN (vendors). Three things differ from
--  Ramtha's series: prefixes of three letters, series with no year, and a
--  width the sheet states. rmth_reference_counter checks prefix ~ ^[A-Z]{2}$
--  and rmth_next_reference always writes a year, so Khalidiyah gets its own
--  counter and pair of functions in the same shape (0124): a row per
--  municipality, prefix and year (0 = a series with no year), locked while
--  the next number is taken, reached only through a definer. The number is
--  padded to the sheet's width and never truncated: NN becomes 100 when
--  the hundredth meeting is recorded, which is honest, where lpad to 2
--  would silently reuse a number. Never reset (plan 5.11).
--
--  ── 2. "Other (specify)" on a single-select column ──
--
--  guard_rmth_other (0124) reads allows_free_text from whatever table its
--  arguments name; nothing in it is Ramtha's. It is attached unchanged to
--  the Khalidiyah tables in 0145.
--
--  ── 3. the multi-select junctions ──
--
--  One junction per table, khld_<table>_option, question_code = the sheet's
--  FIELD NAME (plan 5.2: a field and its rows trace to each other), so the
--  list a question reads is looked up here, not spelled in the code. The
--  same for the "by ..." count children: khld_<table>_count rows name a
--  field and a cell, and the cell must be a live row of that field's list.
--  Both guards are the foreign key a polymorphic column cannot have, in
--  guard_rmth_option's shape, and both refuse a field that does not belong
--  on the table.
--
--  ── 4. the person spine, with two identifiers ──
--
--  khld_ensure_person takes {id_type, id_number, full_name, sex, phone,
--  date_of_birth, age_years}. id_type is 'national_id' or 'unhcr_number',
--  CHOSEN ON THE FORM and never inferred from the digits (plan 2.1). A
--  national ID is normalised to its nine digits; a UNHCR number to the
--  trimmed, upper-cased form 0138 stores. On file: identity is locked,
--  empties may be filled, and a soft-deleted person is refused with
--  person_deleted so the screen offers restore (CLAUDE.md: restored, never
--  recreated). Not on file: created with what the sheet gave.
--
--  ── 5. minors ──
--
--  guard_khld_guardian is the trigger plan 2.2 asks for: on the volunteer
--  registration, a person under 18 on reg_date cannot be saved unless
--  guardian_name, guardian_relationship, guardian_phone, guardian_consent_
--  given = true and guardian_consent_date are all present. Minor status is
--  derived from the person's date of birth (required on that form) and
--  never stored. The UI is not the boundary.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. references ────────────────────────────────────────────────────────

create table public.khld_reference_counter (
  municipality_id  uuid not null references public.municipality(id),
  prefix           text not null,
  year             int  not null,
  last_no          int  not null default 0,
  primary key (municipality_id, prefix, year),
  constraint khld_reference_counter_prefix_shape check (prefix ~ '^[A-Z]{2,4}$'),
  constraint khld_reference_counter_year_sane check (year = 0 or year between 2000 and 2100)
);

alter table public.khld_reference_counter enable row level security;
revoke all on public.khld_reference_counter from anon, authenticated;

-- 0137: a counter row that has advanced names records; it must not be
-- deletable, so it carries the no-hard-delete guard and nothing else.
create trigger trg_khld_reference_counter_no_hard_delete
  before delete on public.khld_reference_counter
  for each row execute function public.guard_no_hard_delete();

comment on table public.khld_reference_counter is
  'Last number issued per municipality, prefix and year (0 = a series with no '
  'year) for the KHLD-XXX-YYYY-NN / KHLD-XXX-NNNN references. No policies: only '
  'khld_next_reference (security definer) writes it. Never reset. 0144.';

create function public.khld_next_reference(p_municipality_id uuid, p_prefix text, p_width int, p_year int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_no   int;
  v_num  text;
begin
  select m.code into v_code from public.municipality m where m.id = p_municipality_id;
  if v_code is null then
    raise exception 'khld_next_reference: unknown municipality %', p_municipality_id;
  end if;

  insert into public.khld_reference_counter (municipality_id, prefix, year, last_no)
  values (p_municipality_id, p_prefix, coalesce(p_year, 0), 1)
  on conflict (municipality_id, prefix, year)
    do update set last_no = public.khld_reference_counter.last_no + 1
  returning last_no into v_no;

  -- padded to the sheet's width, never truncated
  v_num := lpad(v_no::text, greatest(p_width, length(v_no::text)), '0');
  if coalesce(p_year, 0) = 0 then
    return format('%s-%s-%s', v_code, p_prefix, v_num);
  end if;
  return format('%s-%s-%s-%s', v_code, p_prefix, p_year, v_num);
end $$;

revoke all on function public.khld_next_reference(uuid, text, int, int) from public, anon, authenticated;

comment on function public.khld_next_reference(uuid, text, int, int) is
  'The next KHLD-XXX-YYYY-NN (or KHLD-XXX-NNNN when the year is null) for a '
  'municipality, prefix and width, taken under the counter row''s lock. Called '
  'by khld_assign_reference only. 0144.';

-- Trigger arguments:
--   TG_ARGV[0]  the prefix (CM, CON, REH, VC, EV, VOL, AD, ENT, MKT, VEN)
--   TG_ARGV[1]  the width the sheet states (2, 3 or 4)
--   TG_ARGV[2..] optional: date columns; the first non-null one gives the
--               year; none given = a series with no year
create function public.khld_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row    jsonb := to_jsonb(new);
  v_prefix text := tg_argv[0];
  v_width  int  := tg_argv[1]::int;
  v_year   int  := null;
  v_date   text;
  i        int;
begin
  if new.reference is not null then
    if new.reference !~ '^[A-Z]{2,8}-[A-Z]{2,4}-(\d{4}-)?\d{2,}$' then
      raise exception 'reference % is not of the form KHLD-XXX-YYYY-NN or KHLD-XXX-NNNN', new.reference
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_nargs > 2 then
    v_year := extract(year from now())::int;
    for i in 2 .. tg_nargs - 1 loop
      v_date := v_row ->> tg_argv[i];
      if v_date is not null then
        v_year := extract(year from v_date::date)::int;
        exit;
      end if;
    end loop;
  end if;

  new.reference := public.khld_next_reference(new.municipality_id, v_prefix, v_width, v_year);
  return new;
end $$;

revoke all on function public.khld_assign_reference() from public, anon, authenticated;

comment on function public.khld_assign_reference() is
  'BEFORE INSERT: fills a null reference with the next KHLD reference for the '
  'row''s municipality. Arguments: prefix, width, then optional date columns '
  '(the first non-null gives the year; none = no year in the series). A '
  'reference supplied by hand is kept if well-formed. 0144.';

-- ── 3a. the multi-select junctions ───────────────────────────────────────
--
-- (table, question_code) -> list. Generated from the catalogue by
-- supabase/khalidiyah/gen_0144_map.py and pasted here; the table is what
-- guard_khld_option and guard_khld_count read, so a question that is not
-- in it cannot be written and a list cannot be spelled differently in two
-- places.
create table public.khld_question_list (
  table_name    text not null,
  question_code text not null,
  list_name     text not null,
  kind          text not null check (kind in ('option', 'count')),
  primary key (table_name, question_code)
);
alter table public.khld_question_list enable row level security;
create policy khld_question_list_read on public.khld_question_list for select to authenticated using (true);
revoke insert, update, delete on public.khld_question_list from anon, authenticated;

comment on table public.khld_question_list is
  'Which ref_khld_ list each multi-select question (kind option) and each "by ..." '
  'count field (kind count) of each khld_ table reads. Read by guard_khld_option '
  'and guard_khld_count. Seeded by 0145 from the catalogue. 0144.';

create function public.guard_khld_option()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_list text;
  v_free boolean;
begin
  select q.list_name into v_list
    from public.khld_question_list q
   where q.table_name = tg_table_name and q.question_code = new.question_code and q.kind = 'option';
  if v_list is null then
    raise exception 'question_code % does not belong on %', new.question_code, tg_table_name
      using errcode = 'check_violation';
  end if;

  execute format('select allows_free_text from public.%I where id = $1 and deleted_at is null', 'ref_khld_' || v_list)
    into v_free using new.option_id;

  if v_free is null then
    raise exception 'option % is not a live row in ref_khld_%, which is the list for %',
      new.option_id, v_list, new.question_code
      using errcode = 'foreign_key_violation';
  end if;
  if v_free and coalesce(btrim(new.option_other), '') = '' then
    raise exception 'option % in ref_khld_% allows free text, so option_other must say what it was',
      new.option_id, v_list
      using errcode = 'check_violation';
  end if;
  if not v_free and new.option_other is not null then
    raise exception 'option % in ref_khld_% is a fixed answer and takes no free text',
      new.option_id, v_list
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.guard_khld_option() from public, anon, authenticated;

comment on function public.guard_khld_option() is
  'The foreign key a khld_*_option junction cannot have: option_id points into '
  'the list khld_question_list names for (table, question_code). Refuses a '
  'question that does not belong on the table, an option that is not live in '
  'that list, an "Other" with nothing specified, and free text on a fixed '
  'answer. guard_rmth_option''s shape (0124). 0144.';

-- ── 3b. the count children ───────────────────────────────────────────────

create function public.guard_khld_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_list text;
  v_ok   boolean;
begin
  select q.list_name into v_list
    from public.khld_question_list q
   where q.table_name = tg_table_name and q.question_code = new.field_code and q.kind = 'count';
  if v_list is null then
    raise exception 'field_code % is not a count field of %', new.field_code, tg_table_name
      using errcode = 'check_violation';
  end if;
  execute format('select exists (select 1 from public.%I where id = $1 and deleted_at is null)', 'ref_khld_' || v_list)
    into v_ok using new.cell_id;
  if not v_ok then
    raise exception 'cell % is not a live row in ref_khld_%, which is the cell list for %',
      new.cell_id, v_list, new.field_code
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;

revoke all on function public.guard_khld_count() from public, anon, authenticated;

comment on function public.guard_khld_count() is
  'For a khld_*_count row: the cell must be a live row of the list '
  'khld_question_list names for (table, field_code, kind count). 0144.';

-- ── 4. the person spine ──────────────────────────────────────────────────

create function public.khld_ensure_person(p jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_type  text := p->>'id_type';
  v_raw   text := coalesce(p->>'id_number', '');
  v_nid   text;
  v_unhcr text;
  v_id    uuid;
  v_del   timestamptz;
  v_sex   sex_t := nullif(p->>'sex', '')::sex_t;
  v_phone text := nullif(btrim(coalesce(p->>'phone', '')), '');
  v_name  text := nullif(btrim(coalesce(p->>'full_name', '')), '');
  v_dob   date := nullif(p->>'date_of_birth', '')::date;
  v_age   int  := nullif(p->>'age_years', '')::int;
begin
  -- the type is the form's explicit choice; nothing is inferred from the digits
  if v_type = 'national_id' then
    v_nid := regexp_replace(v_raw, '\D', '', 'g');
    if v_nid !~ '^\d{9}$' then
      raise exception 'A national ID is exactly nine digits' using errcode = 'check_violation';
    end if;
    select id, deleted_at into v_id, v_del from public.person where national_id = v_nid;
  elsif v_type = 'unhcr_number' then
    v_unhcr := nullif(upper(regexp_replace(btrim(v_raw), '\s+', ' ', 'g')), '');
    if v_unhcr is null then
      raise exception 'A UNHCR number is required when the identifier type is UNHCR' using errcode = 'check_violation';
    end if;
    select id, deleted_at into v_id, v_del from public.person where unhcr_number = v_unhcr;
  else
    raise exception 'id_type must be national_id or unhcr_number' using errcode = 'check_violation';
  end if;

  if v_id is not null and v_del is not null then
    -- An entity is RESTORED, never recreated (CLAUDE.md). The screen offers
    -- the restore path; this function only says why it stopped.
    raise exception 'This identifier belongs to a person who was deleted; restore them first'
      using errcode = 'P0KHL', detail = v_id::text;
  end if;

  if v_id is not null then
    -- identity is locked; empties may be filled, nothing is overwritten
    update public.person
       set sex           = coalesce(sex, v_sex),
           phone         = coalesce(phone, v_phone),
           date_of_birth = coalesce(date_of_birth, v_dob),
           age_recorded  = coalesce(age_recorded, v_age)
     where id = v_id
       and ((sex is null and v_sex is not null) or (phone is null and v_phone is not null)
            or (date_of_birth is null and v_dob is not null) or (age_recorded is null and v_age is not null));
    return v_id;
  end if;

  if v_name is null then
    raise exception 'A new person needs a full name' using errcode = 'not_null_violation';
  end if;
  insert into public.person (national_id, unhcr_number, full_name, phone, sex, date_of_birth, age_recorded)
  values (v_nid, v_unhcr, v_name, v_phone, v_sex, v_dob, v_age)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.khld_ensure_person(jsonb) from public, anon;
grant execute on function public.khld_ensure_person(jsonb) to authenticated;

comment on function public.khld_ensure_person(jsonb) is
  'The Khalidiyah person spine: {id_type: national_id|unhcr_number, id_number, '
  'full_name, sex, phone, date_of_birth, age_years}. Finds by the chosen '
  'identifier (never inferred), refuses a soft-deleted person with P0KHL so the '
  'screen offers restore, fills empties on a person on file, creates one '
  'otherwise. security invoker: person''s own RLS applies. 0144.';

-- The staff lookup the forms use before saving: live person, or the deleted
-- candidate to restore, by either identifier. Reads person under RLS (staff
-- read every person: 05 section 6); the deleter's name comes through
-- actor_display_name, the 0108 definer, so authenticated can call this
-- (the person_restore_candidate lesson, CLAUDE.md register).
create function public.khld_person_lookup(p_id_type text, p_id_number text)
returns table (id uuid, national_id text, unhcr_number text, full_name text, phone text, sex sex_t,
               date_of_birth date, age_recorded int, deleted_at timestamptz, deleted_by text)
language sql
stable
set search_path = public, pg_temp
as $$
  select p.id, p.national_id, p.unhcr_number, p.full_name, p.phone, p.sex, p.date_of_birth, p.age_recorded,
         p.deleted_at,
         case when p.deleted_at is null then null
              else (select public.actor_display_name(a.actor)
                      from public.audit_log a
                     where a.table_name = 'person' and a.row_id = p.id and a.action = 'delete'
                     order by a.changed_at desc limit 1) end
    from public.person p
   where (p_id_type = 'national_id' and p.national_id = regexp_replace(coalesce(p_id_number, ''), '\D', '', 'g'))
      or (p_id_type = 'unhcr_number' and p.unhcr_number = nullif(upper(regexp_replace(btrim(coalesce(p_id_number, '')), '\s+', ' ', 'g')), ''));
$$;

revoke all on function public.khld_person_lookup(text, text) from public, anon;
grant execute on function public.khld_person_lookup(text, text) to authenticated;

-- ── 5. minors ────────────────────────────────────────────────────────────
--
-- Attached to khld_volunteer in 0145. reg_date is the registration date;
-- the age is the person's on that date (khld_age_on, 0139).
create function public.guard_khld_guardian()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_age int;
begin
  select public.khld_age_on(p, new.reg_date) into v_age from public.person p where p.id = new.person_id;
  if v_age is null then
    raise exception 'A volunteer needs a date of birth or an age on their person record' using errcode = 'check_violation';
  end if;
  if v_age < 18 then
    if coalesce(btrim(new.guardian_name), '') = '' or coalesce(btrim(new.guardian_relationship), '') = ''
       or coalesce(btrim(new.guardian_phone), '') = '' or new.guardian_consent_given is not true
       or new.guardian_consent_date is null then
      raise exception 'A volunteer under 18 cannot be registered without the guardian''s name, relationship, phone, written consent and its date'
        using errcode = 'check_violation', constraint = 'khld_volunteer_minor_needs_guardian';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.guard_khld_guardian() from public, anon, authenticated;

comment on function public.guard_khld_guardian() is
  'BEFORE INSERT OR UPDATE on khld_volunteer: a person under 18 on reg_date '
  'needs guardian_name, guardian_relationship, guardian_phone, '
  'guardian_consent_given = true and guardian_consent_date (plan 2.2). Minor '
  'status is derived from the date of birth, never stored. 0144.';

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_r1 text; v_r2 text; v_r3 text; v_r4 text;
  v_khld uuid := '00000000-0000-4000-8000-0000000000b2';
  v_p1 uuid; v_p2 uuid;
begin
  -- the series: width, year-less, and the hundredth of a 2-wide series
  begin
    v_r1 := public.khld_next_reference(v_khld, 'CM', 2, 2026);
    v_r2 := public.khld_next_reference(v_khld, 'CM', 2, 2026);
    v_r3 := public.khld_next_reference(v_khld, 'VOL', 4, null);
    v_r4 := public.khld_next_reference(v_khld, 'ENT', 3, null);
    if v_r1 <> 'KHLD-CM-2026-01' or v_r2 <> 'KHLD-CM-2026-02' or v_r3 <> 'KHLD-VOL-0001' or v_r4 <> 'KHLD-ENT-001' then
      raise exception '0144: references came out as %, %, %, %', v_r1, v_r2, v_r3, v_r4;
    end if;
    update public.khld_reference_counter set last_no = 99 where municipality_id = v_khld and prefix = 'CM';
    if public.khld_next_reference(v_khld, 'CM', 2, 2026) <> 'KHLD-CM-2026-100' then
      raise exception '0144: the hundredth reference was truncated';
    end if;
    raise exception using errcode = 'P0144', message = 'rollback the probe';
  exception
    when sqlstate 'P0144' then null;
  end;
  if exists (select 1 from public.khld_reference_counter) then
    raise exception '0144: probe counters survived the rollback';
  end if;

  -- no client role can take a number or reach the counter
  if has_function_privilege('authenticated', 'public.khld_next_reference(uuid, text, int, int)', 'execute')
     or has_table_privilege('authenticated', 'public.khld_reference_counter', 'select') then
    raise exception '0144: a client role reaches the reference counter';
  end if;

  -- the spine: a UNHCR-only person is created by type, found again by type,
  -- and not found by the other type; a national-ID person likewise
  begin
    v_p1 := public.khld_ensure_person('{"id_type":"unhcr_number","id_number":" 0144-probe-a ","full_name":"0144 probe A","age_years":30}');
    v_p2 := public.khld_ensure_person('{"id_type":"unhcr_number","id_number":"0144-PROBE-A","full_name":"0144 probe A"}');
    if v_p1 <> v_p2 then raise exception '0144: the same UNHCR number made two people'; end if;
    if (select unhcr_number from public.person where id = v_p1) <> '0144-PROBE-A' then
      raise exception '0144: the UNHCR number was not normalised';
    end if;
    if exists (select 1 from public.khld_person_lookup('national_id', '0144-PROBE-A')) then
      raise exception '0144: a UNHCR number was found as a national ID';
    end if;
    v_p2 := public.khld_ensure_person('{"id_type":"national_id","id_number":"399 000 998","full_name":"0144 probe B","age_years":40}');
    if (select national_id from public.person where id = v_p2) <> '399000998' then
      raise exception '0144: the national ID was not normalised to nine digits';
    end if;
    begin
      perform public.khld_ensure_person('{"id_type":"national_id","id_number":"12","full_name":"x","age_years":1}');
      raise exception '0144: a two-digit national ID was accepted';
    exception when check_violation then null; end;
    begin
      perform public.khld_ensure_person('{"id_type":"phone","id_number":"12","full_name":"x","age_years":1}');
      raise exception '0144: an unknown id_type was accepted';
    exception when check_violation then null; end;
    raise exception using errcode = 'P0144', message = 'rollback the probe';
  exception
    when sqlstate 'P0144' then null;
  end;
  if exists (select 1 from public.person where full_name like '0144 probe%') then
    raise exception '0144: probe people survived the rollback';
  end if;
end $verify$;
