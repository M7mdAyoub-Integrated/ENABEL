-- ═══════════════════════════════════════════════════════════════════════════
--  0177 — Ramtha's seven forms, the tables
--
--  One table per form of RMTH_Forms_and_Calculations_v2.xlsx ("Forms
--  Needed"), every column a field of the sheet; which field is which is
--  supabase/ramtha/catalogue.py, from which the screens and both locale files
--  are generated.
--
--    rmth_beneficiary         FORM-01 Person Register        PR-01 .. PR-07
--    rmth_project             FORM-02 Approved Projects      PJ-01 .. PJ-04
--    rmth_activity            FORM-03 Activity Register      AC-01 .. AC-12
--    rmth_participation       FORM-04 Participation Record   PA-01 .. PA-06
--    rmth_feedback            FORM-05 Participant Feedback   FB-01 .. FB-04
--    rmth_followup            FORM-06 Beneficiary Follow-up  FU-01 .. FU-09
--    rmth_implementer_survey  FORM-07 Project Implementer Survey  IS-01 .. IS-03
--
--  ── WHAT IS NOT A COLUMN ──
--
--  A multi-select (AC-08, AC-12, PA-05, FU-03) is a rmth_<table>_option row
--  per tick, question_code = the Field ID ('ac08'), guarded by
--  guard_rmth_option. The person fields of FORM-01 -- national ID, name, sex
--  -- are `person`, one person one row (hard rule 6); the name (PR-07) and
--  the disability question (PR-06) were added to the sheet's form by the
--  owner on 1 October 2026 (OQ-79). PR-04 is worked out here from PR-03 and
--  the registration year, as the sheet says ("registration year − PR-03").
--  PJ-01 and AC-01 are issued on insert (RMTH-PP-001, RMTH-AC-001, the
--  sheet's own examples); IS-03 is the moment of saving.
--
--  ── THE DEPENDENCY COLUMN ──
--
--  Every "if AC-02 = ..." of the sheet is enforced in BOTH directions by the
--  table's guard: required while its answer is chosen (every field of the
--  sheet is marked required), and BLANK while it is not -- a stray value on
--  a branch not taken would otherwise be counted by a view that does not
--  look at the category. Refusals are named rmth_<field>_required /
--  rmth_<field>_not_applicable (rmth_ac03_required), and the screen words
--  them from the field's label. FORM-04's and FORM-05's conditions read the
--  CATEGORY OF THE ACTIVITY the record names (PA-01, FB-01), so an
--  activity's category cannot change once a participation or a feedback
--  names it (rmth_ac02_in_use): the answers already given were asked
--  because of it. The rules over multi-selects -- required, not applicable,
--  "None" exclusive, and FU-04, which hangs on FU-03's ticks -- are checked
--  by save_rmth_record after the ticks are written (0178).
--
--  ── WHO IS A PARTICIPANT ──
--
--  PA-02, FB-02 and FU-01 are "prepopulated <PR-01>": a person in Ramtha's
--  register. A composite foreign key (person_id, municipality_id) into
--  rmth_beneficiary makes that structural, and the guards refuse a register
--  row that has been deleted (rmth_<field>_not_registered). The sheet's own
--  help: "If the person is not found, register them in FORM-01 first".
--
--  ── UNIQUENESS ──
--
--  The register is an entity: one row per person per municipality, deleted
--  rows included -- re-registering a deleted person is a RESTORE, never a
--  second row (CLAUDE.md, "Restored, never recreated"). Participations and
--  feedback are events, unique while live: "One record per person per
--  activity (except Business incubator)" and "One response per person per
--  activity". A business incubator's participation is one row per service
--  occasion (PA-05 "on this occasion", PA-06 its date), so it repeats.
--  FORM-07's "One response per project per survey round" is not enforced:
--  the sheet defines no round, and B1 reads the latest response per project
--  in the year (OQ-80).
--
--  ── THE SHEET'S VALIDATION COLUMN ──
--
--  PR-03 four digits and not after the registration year; PJ-02, PA-06 and
--  FU-02 not after today (Asia/Amman); AC-05 not before AC-04; AC-09 and
--  AC-11 above zero; FU-04 and FU-07 not after FU-02; FU-08 from 0 to 6.
--
--  ── EVERY TABLE ──
--
--  municipality_id (default my_municipality(); the composite (id,
--  municipality_id) key; every link to another Ramtha table is a COMPOSITE
--  foreign key and the only one on its pair, so PostgREST sees one
--  relationship and never answers 300), the standard block, client_uuid, the
--  standard triggers, RLS by municipality, and an index on every foreign key.
--  The four forms of record are written by coordinators and data entry
--  (can_write); the three surveys by any staff role, enumerators included
--  (is_staff), as Khalidiyah's questionnaires are. The junctions take a
--  DELETE policy: they are replaced by delete-then-insert (CLAUDE.md, the
--  seventh row of the register).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. helpers ───────────────────────────────────────────────────────────

-- "Today" as the Municipality's calendar has it: the database runs in UTC,
-- and a record saved at 01:00 in Ramtha on the 2nd is not in the future.
create function public.rmth_today()
returns date
language sql
stable
set search_path = public, pg_temp
as $$ select (now() at time zone 'Asia/Amman')::date $$;
grant execute on function public.rmth_today() to authenticated;

-- One rule of the Dependency column, both directions.
create function public.rmth_field_rule(p_field text, p_on boolean, p_has boolean)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_name text := 'rmth_' || lower(replace(p_field, '-', ''));
begin
  if p_on and not p_has then
    raise exception '% is required', p_field
      using errcode = 'check_violation', constraint = v_name || '_required';
  end if;
  if not p_on and p_has then
    raise exception '% belongs to an answer that is not chosen, so it must be empty', p_field
      using errcode = 'check_violation', constraint = v_name || '_not_applicable';
  end if;
end $$;
grant execute on function public.rmth_field_rule(text, boolean, boolean) to authenticated;

-- References without a year, as the sheet writes them: RMTH-PP-001.
-- rmth_reference_counter (0124) keeps its key; a series with no year is
-- year 0, so the spent numbers of the first forms' series are untouched.
-- 0124's year_sane allowed 2000-2100 only; year 0 is added, nothing else.
alter table public.rmth_reference_counter drop constraint rmth_reference_counter_year_sane;
alter table public.rmth_reference_counter add constraint rmth_reference_counter_year_sane
  check (year = 0 or (year >= 2000 and year <= 2100));
comment on column public.rmth_reference_counter.year is
  'The year of a RMTH-XX-YYYY-NNN series (0122-0133), or 0 for a series with no year (RMTH-PP-001, 0177).';

create function public.rmth_next_reference(p_municipality_id uuid, p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_no   int;
begin
  select m.code into v_code from public.municipality m where m.id = p_municipality_id;
  if v_code is null then
    raise exception 'rmth_next_reference: unknown municipality %', p_municipality_id;
  end if;
  insert into public.rmth_reference_counter (municipality_id, prefix, year, last_no)
  values (p_municipality_id, p_prefix, 0, 1)
  on conflict (municipality_id, prefix, year)
    do update set last_no = public.rmth_reference_counter.last_no + 1
  returning last_no into v_no;
  return format('%s-%s-%s', v_code, p_prefix, lpad(v_no::text, greatest(3, length(v_no::text)), '0'));
end $$;
revoke all on function public.rmth_next_reference(uuid, text) from public, anon, authenticated;

create function public.rmth_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reference is not null then
    if new.reference !~ '^[A-Z]{2,8}-[A-Z]{2}-\d{3,}$' then
      raise exception 'reference % is not of the form RMTH-XX-NNN', new.reference using errcode = 'check_violation';
    end if;
    return new;
  end if;
  new.reference := public.rmth_next_reference(new.municipality_id, tg_argv[0]);
  return new;
end $$;
revoke all on function public.rmth_assign_reference() from public, anon, authenticated;

-- ── 2. FORM-01 Person Register ────────────────────────────────────────────

create table public.rmth_beneficiary (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  person_id uuid not null references public.person(id),
  registered_on date not null default public.rmth_today(),
  year_of_birth int not null constraint rmth_beneficiary_year_of_birth_four_digits check (year_of_birth between 1000 and 9999),
  age_group_id uuid not null references public.ref_rmth_age_group(id),
  nationality_id uuid not null references public.ref_rmth_nationality(id),
  nationality_other text,
  has_disability boolean not null,
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_beneficiary_id_municipality_key unique (id, municipality_id),
  constraint rmth_beneficiary_person_key unique (person_id, municipality_id)
);
comment on table public.rmth_beneficiary is
  'FORM-01 Person Register (سجل المستفيدين): one row per person per municipality, deleted rows included '
  '(restore, never re-register). National ID, name and sex are person''s. 0177.';
create trigger trg_rmth_beneficiary_other before insert or update on public.rmth_beneficiary
  for each row execute function public.guard_rmth_other('nationality_id:ref_rmth_nationality:nationality_other');

-- PR-04 "Auto-calculated: registration year − PR-03", into the sheet's five bands.
create function public.set_rmth_beneficiary_age_group()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_age int;
begin
  if new.year_of_birth > extract(year from new.registered_on)::int then
    raise exception 'PR-03 is after the registration year' using errcode = 'check_violation', constraint = 'rmth_pr03_future';
  end if;
  v_age := extract(year from new.registered_on)::int - new.year_of_birth;
  select id into new.age_group_id from public.ref_rmth_age_group
   where code = case when v_age < 18 then 'under_18' when v_age <= 24 then 'age_18_24' when v_age <= 35 then 'age_25_35'
                     when v_age <= 45 then 'age_36_45' else 'over_45' end;
  if tg_op = 'INSERT' or new.person_id is distinct from old.person_id then
    if exists (select 1 from public.person p where p.id = new.person_id and p.deleted_at is not null) then
      raise exception 'PR-01 belongs to a person who was deleted' using errcode = 'check_violation', constraint = 'rmth_pr01_person_deleted';
    end if;
  end if;
  return new;
end $$;
create trigger trg_rmth_beneficiary_age before insert or update on public.rmth_beneficiary
  for each row execute function public.set_rmth_beneficiary_age_group();

-- ── 3. FORM-02 Approved Projects ──────────────────────────────────────────

create table public.rmth_project (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  reference text,
  approved_on date not null,
  sector_id uuid not null references public.ref_rmth_sector(id),
  sector_other text,
  sub_sector text not null constraint rmth_project_sub_sector_not_blank check (btrim(sub_sector) <> ''),
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_project_id_municipality_key unique (id, municipality_id),
  constraint rmth_project_reference_key unique (municipality_id, reference)
);
comment on table public.rmth_project is
  'FORM-02 Approved Projects (المشاريع المعتمدة): one row per approved proposal (B1.2); RMTH-PP-NNN. 0177.';
create trigger trg_rmth_project_reference before insert on public.rmth_project
  for each row execute function public.rmth_assign_reference('PP');
create trigger trg_rmth_project_other before insert or update on public.rmth_project
  for each row execute function public.guard_rmth_other('sector_id:ref_rmth_sector:sector_other');

create function public.guard_rmth_project()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' or new.approved_on is distinct from old.approved_on) and new.approved_on > public.rmth_today() then
    raise exception 'PJ-02 is after today' using errcode = 'check_violation', constraint = 'rmth_pj02_future';
  end if;
  return new;
end $$;
create trigger trg_rmth_project_guard before insert or update on public.rmth_project
  for each row execute function public.guard_rmth_project();

-- ── 4. FORM-03 Activity Register ──────────────────────────────────────────

create table public.rmth_activity (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  reference text,
  category_id uuid not null references public.ref_rmth_activity_category(id),
  networking_type_id uuid references public.ref_rmth_networking_type(id),
  start_date date not null,
  end_date date,
  sector_id uuid references public.ref_rmth_sector(id),
  sector_other text,
  project_id uuid,
  contact_hours numeric(7,2) constraint rmth_activity_contact_hours_positive check (contact_hours > 0),
  training_type_id uuid references public.ref_rmth_training_type(id),
  sessions_delivered int constraint rmth_activity_sessions_positive check (sessions_delivered > 0),
  is_published boolean not null default false,
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_activity_id_municipality_key unique (id, municipality_id),
  constraint rmth_activity_reference_key unique (municipality_id, reference),
  constraint rmth_activity_end_after_start check (end_date is null or end_date >= start_date),
  constraint rmth_activity_project_id_fkey foreign key (project_id, municipality_id) references public.rmth_project(id, municipality_id)
);
comment on table public.rmth_activity is
  'FORM-03 Activity Register (سجل الأنشطة): one row per activity, routed to its indicators by AC-02; '
  'RMTH-AC-NNN. is_published puts it on the public page (the owner, 1 October 2026; OQ-81). 0177.';
comment on column public.rmth_activity.is_published is
  'On the Municipality''s public page while true and not ended (v_public_rmth_whats_on, 0181). '
  'A coordinator''s switch on the activity''s page, not a field of the sheet. 0177.';
create trigger trg_rmth_activity_reference before insert on public.rmth_activity
  for each row execute function public.rmth_assign_reference('AC');
create trigger trg_rmth_activity_other before insert or update on public.rmth_activity
  for each row execute function public.guard_rmth_other('sector_id:ref_rmth_sector:sector_other');

create function public.guard_rmth_activity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_cat text;
begin
  select code into v_cat from public.ref_rmth_activity_category where id = new.category_id;
  if tg_op = 'UPDATE' and new.category_id is distinct from old.category_id
     and (exists (select 1 from public.rmth_participation x where x.activity_id = new.id)
          or exists (select 1 from public.rmth_feedback x where x.activity_id = new.id)) then
    raise exception 'AC-02 cannot change: participations or feedback were recorded for this category'
      using errcode = 'check_violation', constraint = 'rmth_ac02_in_use';
  end if;
  perform public.rmth_field_rule('AC-03', v_cat = 'networking', new.networking_type_id is not null);
  perform public.rmth_field_rule('AC-05', v_cat in ('specialised', 'short_term', 'entrepreneurship', 'incubator_design'), new.end_date is not null);
  perform public.rmth_field_rule('AC-06', v_cat <> 'networking', new.sector_id is not null);
  perform public.rmth_field_rule('AC-07', v_cat = 'specialised', new.project_id is not null);
  perform public.rmth_field_rule('AC-09', v_cat = 'short_term', new.contact_hours is not null);
  perform public.rmth_field_rule('AC-10', v_cat in ('specialised', 'short_term'), new.training_type_id is not null);
  perform public.rmth_field_rule('AC-11', v_cat = 'entrepreneurship', new.sessions_delivered is not null);
  if new.project_id is not null and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
     and exists (select 1 from public.rmth_project p where p.id = new.project_id and p.deleted_at is not null) then
    raise exception 'AC-07 names a deleted project' using errcode = 'check_violation', constraint = 'rmth_ac07_deleted';
  end if;
  return new;
end $$;
create trigger trg_rmth_activity_guard before insert or update on public.rmth_activity
  for each row execute function public.guard_rmth_activity();

-- ── 5. FORM-04 Participation Record ───────────────────────────────────────

create table public.rmth_participation (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  activity_id uuid not null,
  person_id uuid not null references public.person(id),
  completed boolean,
  stakeholder_type_id uuid references public.ref_rmth_stakeholder_type(id),
  service_date date,
  -- copied from the activity on save, so "except Business incubator" can be
  -- a unique index; the activity's category is locked once this row exists
  activity_is_incubator boolean not null default false,
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_participation_id_municipality_key unique (id, municipality_id),
  constraint rmth_participation_activity_id_fkey foreign key (activity_id, municipality_id) references public.rmth_activity(id, municipality_id),
  constraint rmth_participation_person_registered_fkey foreign key (person_id, municipality_id) references public.rmth_beneficiary(person_id, municipality_id)
);
comment on table public.rmth_participation is
  'FORM-04 Participation Record (سجل المشاركة): a registered person on an activity; once per person '
  'per activity, except a business incubator, where each row is one service occasion. 0177.';
create unique index rmth_participation_once_per_activity on public.rmth_participation (activity_id, person_id)
  where deleted_at is null and not activity_is_incubator;

-- ── 6. FORM-05 Participant Feedback ───────────────────────────────────────

create table public.rmth_feedback (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  activity_id uuid not null,
  person_id uuid not null references public.person(id),
  improved_knowledge boolean,
  supported_employment boolean,
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_feedback_id_municipality_key unique (id, municipality_id),
  constraint rmth_feedback_activity_id_fkey foreign key (activity_id, municipality_id) references public.rmth_activity(id, municipality_id),
  constraint rmth_feedback_person_registered_fkey foreign key (person_id, municipality_id) references public.rmth_beneficiary(person_id, municipality_id)
);
comment on table public.rmth_feedback is
  'FORM-05 Participant Feedback (استبيان رأي المشاركين): one response per person per activity, '
  'for the activities one of its questions is asked about (A1, C1). 0177.';
create unique index rmth_feedback_once_per_activity on public.rmth_feedback (activity_id, person_id)
  where deleted_at is null;

-- ── 7. FORM-06 Beneficiary Follow-up ──────────────────────────────────────

create table public.rmth_followup (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  person_id uuid not null references public.person(id),
  followup_date date not null,
  first_placement_on date,
  first_placement_type_id uuid references public.ref_rmth_placement_type(id),
  work_status_id uuid not null references public.ref_rmth_work_status(id),
  continuous_since date,
  income_months int constraint rmth_followup_income_months_of_six check (income_months between 0 and 6),
  in_municipal_project boolean,
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_followup_id_municipality_key unique (id, municipality_id),
  constraint rmth_followup_first_placement_by_followup check (first_placement_on is null or first_placement_on <= followup_date),
  constraint rmth_followup_continuous_by_followup check (continuous_since is null or continuous_since <= followup_date),
  constraint rmth_followup_person_registered_fkey foreign key (person_id, municipality_id) references public.rmth_beneficiary(person_id, municipality_id)
);
comment on table public.rmth_followup is
  'FORM-06 Beneficiary Follow-up (متابعة المستفيدين): one follow-up of a registered person; the views '
  'read the latest per person (IMP-0, SO3-0) or any in the year (SO1-0, SO2-0). 0177.';

-- ── 8. FORM-07 Project Implementer Survey ─────────────────────────────────

create table public.rmth_implementer_survey (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references public.municipality(id) default public.my_municipality(),
  project_id uuid not null,
  support_essential boolean not null,
  surveyed_at timestamptz not null default now(),
  client_uuid uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) default auth.uid(),
  deleted_at timestamptz,
  constraint rmth_implementer_survey_id_municipality_key unique (id, municipality_id),
  constraint rmth_implementer_survey_project_id_fkey foreign key (project_id, municipality_id) references public.rmth_project(id, municipality_id)
);
comment on table public.rmth_implementer_survey is
  'FORM-07 Project Implementer Survey (استبيان منفذي المشاريع): one response about one approved project; '
  'IS-03 is the moment of saving. 0177.';

-- ── 9. the multi-selects ─────────────────────────────────────────────────

create table public.rmth_activity_option (
  activity_id uuid not null,
  municipality_id uuid not null default public.my_municipality(),
  question_code text not null,
  option_id uuid not null,
  option_other text,
  created_at timestamptz not null default now(),
  primary key (activity_id, question_code, option_id),
  constraint rmth_activity_option_activity_id_fkey foreign key (activity_id, municipality_id) references public.rmth_activity(id, municipality_id)
);
comment on table public.rmth_activity_option is 'AC-08 (ac08, joint_partner) and AC-12 (ac12, training_topic): one row per tick. 0177.';

create table public.rmth_participation_option (
  participation_id uuid not null,
  municipality_id uuid not null default public.my_municipality(),
  question_code text not null,
  option_id uuid not null,
  option_other text,
  created_at timestamptz not null default now(),
  primary key (participation_id, question_code, option_id),
  constraint rmth_participation_option_participation_id_fkey foreign key (participation_id, municipality_id) references public.rmth_participation(id, municipality_id)
);
comment on table public.rmth_participation_option is 'PA-05 (pa05, incubation_service): one row per tick. 0177.';

create table public.rmth_followup_option (
  followup_id uuid not null,
  municipality_id uuid not null default public.my_municipality(),
  question_code text not null,
  option_id uuid not null,
  option_other text,
  created_at timestamptz not null default now(),
  primary key (followup_id, question_code, option_id),
  constraint rmth_followup_option_followup_id_fkey foreign key (followup_id, municipality_id) references public.rmth_followup(id, municipality_id)
);
comment on table public.rmth_followup_option is 'FU-03 (fu03, employability_outcome): one row per tick. 0177.';

-- A tick belongs to its question's list, and an "Other" says what it was.
create function public.guard_rmth_option()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_list text;
  v_free boolean;
begin
  v_list := case tg_table_name || ':' || new.question_code
    when 'rmth_activity_option:ac08' then 'joint_partner'
    when 'rmth_activity_option:ac12' then 'training_topic'
    when 'rmth_participation_option:pa05' then 'incubation_service'
    when 'rmth_followup_option:fu03' then 'employability_outcome'
    else null end;
  if v_list is null then
    raise exception 'question_code % does not belong on %', new.question_code, tg_table_name using errcode = 'check_violation';
  end if;
  execute format('select allows_free_text from public.%I where id = $1 and deleted_at is null', 'ref_rmth_' || v_list)
    into v_free using new.option_id;
  if v_free is null then
    raise exception 'option % is not a live row of ref_rmth_%', new.option_id, v_list using errcode = 'foreign_key_violation';
  end if;
  if v_free and coalesce(btrim(new.option_other), '') = '' then
    raise exception 'the option chosen allows free text, so option_other must say what it was'
      using errcode = 'check_violation', constraint = 'rmth_' || new.question_code || '_specify';
  end if;
  if not v_free and new.option_other is not null then
    raise exception 'the option chosen is a fixed answer and takes no free text' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.guard_rmth_option() from public, anon, authenticated;
create trigger trg_rmth_activity_option_guard before insert or update on public.rmth_activity_option
  for each row execute function public.guard_rmth_option();
create trigger trg_rmth_participation_option_guard before insert or update on public.rmth_participation_option
  for each row execute function public.guard_rmth_option();
create trigger trg_rmth_followup_option_guard before insert or update on public.rmth_followup_option
  for each row execute function public.guard_rmth_option();

-- ── 10. the guards of FORM-04 to FORM-07 ─────────────────────────────────

-- A registered person: the composite key says the register row exists; this
-- says it is live, checked when the link is made or changed.
create function public.rmth_require_registered(p_field text, p_person uuid, p_municipality uuid)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.rmth_beneficiary b join public.person p on p.id = b.person_id
                  where b.person_id = p_person and b.municipality_id = p_municipality
                    and b.deleted_at is null and p.deleted_at is null) then
    raise exception '% is not a live registration in FORM-01', p_field
      using errcode = 'check_violation', constraint = 'rmth_' || lower(replace(p_field, '-', '')) || '_not_registered';
  end if;
end $$;
grant execute on function public.rmth_require_registered(text, uuid, uuid) to authenticated;

create function public.rmth_activity_category(p_activity uuid, p_field text, p_check_live boolean)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_cat text;
  v_del timestamptz;
begin
  select c.code, a.deleted_at into v_cat, v_del
    from public.rmth_activity a join public.ref_rmth_activity_category c on c.id = a.category_id
   where a.id = p_activity;
  if p_check_live and v_del is not null then
    raise exception '% names a deleted activity', p_field
      using errcode = 'check_violation', constraint = 'rmth_' || lower(replace(p_field, '-', '')) || '_deleted';
  end if;
  return v_cat;
end $$;
grant execute on function public.rmth_activity_category(uuid, text, boolean) to authenticated;

create function public.guard_rmth_participation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_cat text;
begin
  v_cat := public.rmth_activity_category(new.activity_id, 'PA-01', tg_op = 'INSERT' or new.activity_id is distinct from old.activity_id);
  if tg_op = 'INSERT' or new.person_id is distinct from old.person_id then
    perform public.rmth_require_registered('PA-02', new.person_id, new.municipality_id);
  end if;
  new.activity_is_incubator := (v_cat = 'business_incubator');
  perform public.rmth_field_rule('PA-03', v_cat in ('specialised', 'short_term', 'entrepreneurship', 'incubator_design'), new.completed is not null);
  perform public.rmth_field_rule('PA-04', v_cat = 'incubator_design', new.stakeholder_type_id is not null);
  perform public.rmth_field_rule('PA-06', v_cat = 'business_incubator', new.service_date is not null);
  if new.service_date is not null and (tg_op = 'INSERT' or new.service_date is distinct from old.service_date)
     and new.service_date > public.rmth_today() then
    raise exception 'PA-06 is after today' using errcode = 'check_violation', constraint = 'rmth_pa06_future';
  end if;
  return new;
end $$;
create trigger trg_rmth_participation_guard before insert or update on public.rmth_participation
  for each row execute function public.guard_rmth_participation();

create function public.guard_rmth_feedback()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_cat text;
begin
  v_cat := public.rmth_activity_category(new.activity_id, 'FB-01', tg_op = 'INSERT' or new.activity_id is distinct from old.activity_id);
  if tg_op = 'INSERT' or new.person_id is distinct from old.person_id then
    perform public.rmth_require_registered('FB-02', new.person_id, new.municipality_id);
  end if;
  -- FB-03 is asked about a networking event, FB-04 about an employability
  -- training; a feedback about anything else would answer nothing
  if v_cat not in ('networking', 'specialised', 'short_term') then
    raise exception 'FB-01: this survey asks nothing about a % activity', v_cat
      using errcode = 'check_violation', constraint = 'rmth_fb01_not_surveyed';
  end if;
  perform public.rmth_field_rule('FB-03', v_cat = 'networking', new.improved_knowledge is not null);
  perform public.rmth_field_rule('FB-04', v_cat in ('specialised', 'short_term'), new.supported_employment is not null);
  return new;
end $$;
create trigger trg_rmth_feedback_guard before insert or update on public.rmth_feedback
  for each row execute function public.guard_rmth_feedback();

create function public.guard_rmth_followup()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_ws text;
begin
  if tg_op = 'INSERT' or new.person_id is distinct from old.person_id then
    perform public.rmth_require_registered('FU-01', new.person_id, new.municipality_id);
  end if;
  if (tg_op = 'INSERT' or new.followup_date is distinct from old.followup_date) and new.followup_date > public.rmth_today() then
    raise exception 'FU-02 is after today' using errcode = 'check_violation', constraint = 'rmth_fu02_future';
  end if;
  select code into v_ws from public.ref_rmth_work_status where id = new.work_status_id;
  -- FU-04 itself hangs on FU-03's ticks: save_rmth_record checks it (0178)
  perform public.rmth_field_rule('FU-05', new.first_placement_on is not null, new.first_placement_type_id is not null);
  perform public.rmth_field_rule('FU-07', v_ws in ('paid_employment', 'self_employment'), new.continuous_since is not null);
  perform public.rmth_field_rule('FU-08', v_ws = 'self_employment', new.income_months is not null);
  perform public.rmth_field_rule('FU-09', v_ws = 'paid_employment', new.in_municipal_project is not null);
  return new;
end $$;
create trigger trg_rmth_followup_guard before insert or update on public.rmth_followup
  for each row execute function public.guard_rmth_followup();

create function public.guard_rmth_implementer_survey()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
     and exists (select 1 from public.rmth_project p where p.id = new.project_id and p.deleted_at is not null) then
    raise exception 'IS-01 names a deleted project' using errcode = 'check_violation', constraint = 'rmth_is01_deleted';
  end if;
  return new;
end $$;
create trigger trg_rmth_implementer_survey_guard before insert or update on public.rmth_implementer_survey
  for each row execute function public.guard_rmth_implementer_survey();

-- ── 11. the standard triggers, RLS, the junctions' DELETE policy ─────────
do $secure$
declare
  r record;
  v_writer text;
begin
  for r in select * from (values
    ('rmth_beneficiary', 'can_write', false),
    ('rmth_project', 'can_write', false),
    ('rmth_activity', 'can_write', false),
    ('rmth_participation', 'can_write', false),
    ('rmth_feedback', 'is_staff', false),
    ('rmth_followup', 'is_staff', false),
    ('rmth_implementer_survey', 'is_staff', false),
    ('rmth_activity_option', 'can_write', true),
    ('rmth_participation_option', 'can_write', true),
    ('rmth_followup_option', 'is_staff', true)
  ) as t(tbl, writer, is_child) loop
    v_writer := format('public.%I()', r.writer);
    if r.is_child then
      execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$I '
                     'for each row execute function public.audit_row()', r.tbl);
    else
      perform public.attach_standard_triggers(r.tbl, false);
    end if;
    execute format('alter table public.%I enable row level security', r.tbl);
    execute format('create policy %1$s_read on public.%1$I for select to authenticated '
                   'using (public.can_see_municipality(municipality_id))', r.tbl);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated '
                   'with check (%2$s and public.can_see_municipality(municipality_id))', r.tbl, v_writer);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated '
                   'using (%2$s and public.can_see_municipality(municipality_id)) '
                   'with check (%2$s and public.can_see_municipality(municipality_id))', r.tbl, v_writer);
    if r.is_child then
      execute format('create policy %1$s_delete on public.%1$I for delete to authenticated '
                     'using (%2$s and public.can_see_municipality(municipality_id))', r.tbl, v_writer);
    end if;
  end loop;
end $secure$;

-- ── 12. an index on every foreign key, and on municipality_id and created_by
do $index$
declare
  r record;
begin
  for r in
    select c.relname as tbl, a.attname as col
      from pg_class c join pg_namespace s on s.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
     where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
       and c.relname not in ('rmth_reference_counter', 'rmth_threshold')
       and (a.attname in ('municipality_id', 'created_by')
            or exists (select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'f' and k.conkey[1] = a.attnum))
       and not exists (select 1 from pg_index i where i.indrelid = c.oid and i.indkey[0] = a.attnum)
     order by 1, 2
  loop
    execute format('create index %I on public.%I (%I)', r.tbl || '_' || r.col || '_idx', r.tbl, r.col);
  end loop;
end $index$;

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_n   int;
  v_bad text;
begin
  select count(*), string_agg(c.relname, ', ') into v_n, v_bad
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and c.relname not in ('rmth_reference_counter', 'rmth_threshold')
     and (not c.relrowsecurity
          or not exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'municipality_id')
          or not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd = 'r')
          or not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd = 'a')
          or not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd = 'w'));
  if v_n <> 0 then raise exception '0177: % tables lack RLS, a policy or municipality_id: %', v_n, v_bad; end if;
  select count(*) into v_n from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and c.relname not in ('rmth_reference_counter', 'rmth_threshold');
  if v_n <> 10 then raise exception '0177: % rmth tables, expected 10', v_n; end if;
  select count(*) into v_n from pg_policy p join pg_class c on c.oid = p.polrelid
   where c.relname like 'rmth\_%' and p.polcmd = 'd';
  if v_n <> 3 then raise exception '0177: % DELETE policies, expected 3 (the junctions)', v_n; end if;
  select count(*), string_agg(format('%s.%s', c.conrelid::regclass, c.conname), ', ') into v_n, v_bad
    from pg_constraint c
   where c.contype = 'f' and c.conrelid::regclass::text like 'rmth\_%'
     and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]);
  if v_n <> 0 then raise exception '0177: unindexed foreign keys: %', v_bad; end if;
  select count(*), string_agg(c.relname, ', ') into v_n, v_bad
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and c.relname not in ('rmth_reference_counter', 'rmth_threshold')
     and not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'trg_' || c.relname || '_audit');
  if v_n <> 0 then raise exception '0177: tables without an audit trigger: %', v_bad; end if;
  -- the seven record tables are soft-deletable and guarded, the junctions not
  select count(*), string_agg(c.relname, ', ') into v_n, v_bad
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
   where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'deleted_at' and not a.attisdropped)
     and not exists (select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
                      where t.tgrelid = c.oid and p.proname = 'guard_soft_delete');
  if v_n <> 0 then raise exception '0177: soft-deletable tables without guard_soft_delete: %', v_bad; end if;
end $verify$;
