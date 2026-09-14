-- ═══════════════════════════════════════════════════════════════════════════
--  0125 — Ramtha's domain tables: seventeen forms onto ten record tables
--
--  Plan Part 4. Every sheet of RMTH_indicator_forms.xlsx was read in full
--  before this was written (09_MULTI_MUNICIPALITY.md Part 4 records what
--  each one said). The consolidation is the plan's, checked against the
--  sheets, with the departures argued below.
--
--    rmth_event                A1.2 networking events and A1.3 guidance
--                              sessions, event_kind, one kind each
--    rmth_proposal             B1.2 -- and, once approved, the PROJECT
--    rmth_training_programme   B1.1 specialised and F0.2 entrepreneurship
--    rmth_training_cycle       C1.1 employability cycles (RMTH-TC), E0.3
--                              incubator-design cycles (RMTH-ID), and F0.2's
--                              delivery log (one row per delivery)
--    rmth_training_enrolment   C1.2, E0.3, F0.1: a person on a cycle
--    rmth_project_implementer  B1, one record per IMPLEMENTER, with its
--                              support-criticality grid as child rows
--    rmth_incubator            E0.1, with the criterion-5 services as rows
--    rmth_enterprise           RMTH-EN, the entity E0.2 and SO3-0 issue
--    rmth_incubation_service   E0.2, one record per participant per incubator
--    rmth_outcome_survey       IMP-0, SO1-0, SO2-0, SO2-C1, SO3-0, survey_kind
--
--  ── DEPARTURES FROM THE PLAN'S TABLE LIST, AND WHY ──
--
--  No `rmth_project`. B1.2's sheet says "On approval this same ID becomes
--  the Project ID used by RMTH-SO1-B1 and RMTH-SO1-B1.1", and B1 and B1.1
--  both quote RMTH-PP references. An approved proposal IS the project; a
--  second table would be a second row for one thing, with a join nobody
--  asked for.
--
--  `rmth_enterprise` is added. E0.2 says "One ID per ENTERPRISE, not per
--  person: where two co-founders are admitted, the first record issues the
--  ID and the second reuses it", and SO3-0 issues RMTH-EN numbers for
--  enterprises that never entered an incubator. That is an entity with an
--  identifier of its own; it gets a table. Its sector is NOT on it: E0.2
--  and SO3-0 ask for the sector with two different lists, so each record
--  keeps the answer it was given.
--
--  Incubator-design training is a CYCLE kind, not a programme type. E0.3's
--  sheet references RMTH-ID cycles with dates and hours; nothing develops an
--  incubator-design "programme". So rmth_training_programme has two types
--  and rmth_training_cycle has three kinds.
--
--  F0.1 enrolments hang off a DELIVERY (an entrepreneurship cycle row), not
--  off the programme, because F0.1 records "start and end dates" and F0.2's
--  delivery log is exactly the list of those. The programme is one join
--  away, and the log's "participants completing" can be reconciled against
--  the enrolments instead of typed twice.
--
--  The five outcome surveys are ONE table (plan §4.3, read against the five
--  sheets): an identical identification block, a contact-outcome block on
--  four of them, the enumerator and evidence on all, and a different set of
--  typed questions per kind, each with its own counting field. Typed
--  columns for everything that feeds a count, check constraints keeping
--  each kind to its own columns, and the multi-selects in one option
--  junction (0124 §3) -- the shape followup_survey already proved.
--
--  ── THE FIELDS THAT PRODUCE THE COUNT (plan §5.3) ──
--
--  Where a sheet says in capitals THIS FIELD PRODUCES THE INDICATOR COUNT
--  and the answer is a judgement, it is a three-valued decision with who and
--  when, stamped by trigger when it changes:
--
--    rmth_event.solely_guidance                A1.2: "Is this event solely a
--                                              vocational guidance session?"
--                                              null undecided; false = No,
--                                              record it here; true = belongs
--                                              under A1.3, does not count
--    rmth_training_programme.tailoring_met     B1.1
--    rmth_training_programme.development_complete_id   F0.2 (three options)
--    rmth_training_cycle.joint_development_met C1.1
--    rmth_training_enrolment.met_criteria      C1.2, E0.3, F0.1
--    rmth_incubator.established_id             E0.1 (three options)
--
--  Where the sheet says the field "must follow arithmetically" from the
--  numbers (IMP-0's months, SO3-0's months of six, C1.1's weeks and hours,
--  SO2-0's placement date) the recorded answer is kept as the sheet has it
--  and the VIEW recomputes the count from the numbers and the threshold; a
--  disagreement is visible rather than silently believed. Where it "must
--  follow from the three questions above" (SO1-0) or "from the grid" (B1),
--  the save function derives it and the column stores the derivation.
--
--  ── DE-DUPLICATION ──
--
--  Seven sheets ask "Has this National ID already been counted ... under
--  record ___". `counted_under_id` on the three person-level tables is that
--  answer, derived from the records by the save function (plan §5.2) and
--  shown, not asked blind. The views count DISTINCT person_id regardless,
--  so the column is the explanation, not the mechanism.
--
--  ── EVERY TABLE ──
--
--  municipality_id (default my_municipality(), composite keys to every
--  scoped parent as 0113), the standard block, the four standard triggers,
--  RLS with the municipality gate on USING and WITH CHECK, client_uuid on
--  every record table because any of these may be completed on a phone, an
--  index on every foreign key. Junctions are replaced by delete-then-insert
--  and so allow hard delete and carry a DELETE policy -- the seventh row of
--  the register.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. a stamp for the decision columns ──────────────────────────────────
--
-- Arguments: decision column names. When a column changes (or arrives
-- non-null), <col>_decided_by / <col>_decided_on are set to the caller and
-- now(); when it is cleared, both are cleared.
create function public.rmth_stamp_decision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_new  jsonb := to_jsonb(new);
  v_old  jsonb := '{}'::jsonb;
  v_col  text;
  v_set  jsonb := '{}'::jsonb;
  i      int;
begin
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
  end if;
  for i in 0 .. tg_nargs - 1 loop
    v_col := tg_argv[i];
    if (v_new -> v_col) is distinct from (v_old -> v_col) then
      if v_new -> v_col is null or jsonb_typeof(v_new -> v_col) = 'null' then
        v_set := v_set || jsonb_build_object(v_col || '_decided_by', null, v_col || '_decided_on', null);
      else
        v_set := v_set || jsonb_build_object(v_col || '_decided_by', auth.uid(), v_col || '_decided_on', now());
      end if;
    end if;
  end loop;
  if v_set <> '{}'::jsonb then
    new := jsonb_populate_record(new, v_set);
  end if;
  return new;
end $$;

revoke all on function public.rmth_stamp_decision() from public, anon, authenticated;

comment on function public.rmth_stamp_decision() is
  'BEFORE INSERT OR UPDATE: for each decision column named as an argument, '
  'sets <col>_decided_by and <col>_decided_on when the value changes and '
  'clears them when it is cleared. Plan §5.3: record who decided and when.';

-- ── 1. rmth_enterprise ───────────────────────────────────────────────────

create table public.rmth_enterprise (
  id               uuid primary key default gen_random_uuid(),
  municipality_id  uuid not null references public.municipality(id) default public.my_municipality(),
  reference        text,
  name             text not null,
  client_uuid      uuid unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) default auth.uid(),
  deleted_at       timestamptz,
  constraint rmth_enterprise_id_municipality_key unique (id, municipality_id),
  constraint rmth_enterprise_reference_key unique (municipality_id, reference),
  constraint rmth_enterprise_name_not_blank check (btrim(name) <> '')
);
create index rmth_enterprise_municipality_idx on public.rmth_enterprise (municipality_id);
create index rmth_enterprise_created_by_idx on public.rmth_enterprise (created_by);
create trigger trg_rmth_enterprise_reference before insert on public.rmth_enterprise
  for each row execute function public.rmth_assign_reference('EN');

-- ── 2. rmth_proposal (B1.2) ──────────────────────────────────────────────

create table public.rmth_proposal (
  id                    uuid primary key default gen_random_uuid(),
  municipality_id       uuid not null references public.municipality(id) default public.my_municipality(),
  reference             text,
  title                 text not null,
  submitted_by_name     text not null,
  submitter_type_id     uuid not null references public.ref_rmth_b12_submitter_type(id),
  contact_name          text,
  contact_phone         text,
  submitted_on          date not null,
  proposal_type_id      uuid references public.ref_rmth_project_type(id),
  proposal_type_other   text,
  sector_id             uuid references public.ref_rmth_sector(id),
  sector_other          text,
  sub_sector            text,
  decision_id           uuid references public.ref_rmth_b12_decision(id),
  decided_on            date,
  approving_body_id     uuid references public.ref_rmth_b12_approving_body(id),
  decision_reference    text,
  conditions            text,
  -- counted once, on FIRST approval: set by trigger, never cleared
  first_approved_on     date,
  completed_on          date,
  client_uuid           uuid unique,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users(id) default auth.uid(),
  deleted_at            timestamptz,
  constraint rmth_proposal_id_municipality_key unique (id, municipality_id),
  constraint rmth_proposal_reference_key unique (municipality_id, reference),
  constraint rmth_proposal_title_not_blank check (btrim(title) <> ''),
  constraint rmth_proposal_decision_dated check (decision_id is null or decided_on is not null)
);
create index rmth_proposal_municipality_idx on public.rmth_proposal (municipality_id);
create index rmth_proposal_submitter_type_idx on public.rmth_proposal (submitter_type_id);
create index rmth_proposal_proposal_type_idx on public.rmth_proposal (proposal_type_id);
create index rmth_proposal_sector_idx on public.rmth_proposal (sector_id);
create index rmth_proposal_decision_idx on public.rmth_proposal (decision_id);
create index rmth_proposal_approving_body_idx on public.rmth_proposal (approving_body_id);
create index rmth_proposal_created_by_idx on public.rmth_proposal (created_by);
create trigger trg_rmth_proposal_reference before insert on public.rmth_proposal
  for each row execute function public.rmth_assign_reference('PP', 'submitted_on');
create trigger trg_rmth_proposal_other before insert or update on public.rmth_proposal
  for each row execute function public.guard_rmth_other(
    'proposal_type_id:ref_rmth_project_type:proposal_type_other',
    'sector_id:ref_rmth_sector:sector_other');

-- "Each proposal is counted once, on first approval." The first time the
-- decision is one of the two approvals, the date of that decision is kept;
-- a later change of decision does not move a figure already reported.
create function public.rmth_proposal_first_approval()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.first_approved_on is null and new.decision_id is not null
     and exists (select 1 from public.ref_rmth_b12_decision d
                  where d.id = new.decision_id and d.code in ('approved', 'approved_conditions')) then
    new.first_approved_on := coalesce(new.decided_on, current_date);
  end if;
  if tg_op = 'UPDATE' and old.first_approved_on is not null and new.first_approved_on is distinct from old.first_approved_on then
    raise exception 'first_approved_on is the date B1.2 counted this proposal and does not move'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.rmth_proposal_first_approval() from public, anon, authenticated;
create trigger trg_rmth_proposal_first_approval before insert or update on public.rmth_proposal
  for each row execute function public.rmth_proposal_first_approval();

create table public.rmth_proposal_option (
  proposal_id      uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (proposal_id, question_code, option_id),
  foreign key (proposal_id, municipality_id) references public.rmth_proposal(id, municipality_id)
);
create index rmth_proposal_option_municipality_idx on public.rmth_proposal_option (municipality_id);
create trigger trg_rmth_proposal_option_guard before insert or update on public.rmth_proposal_option
  for each row execute function public.guard_rmth_option();

-- ── 3. rmth_training_programme (B1.1, F0.2) ──────────────────────────────

create table public.rmth_training_programme (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  reference                 text,
  programme_type            text not null,
  title                     text not null,
  -- B1.1
  specialisation_id         uuid references public.ref_rmth_b11_specialisation(id),
  specialisation_other      text,
  occupation                text,
  linked_sector_id          uuid references public.ref_rmth_sector(id),
  linked_sector_other       text,
  requirements_document     text,
  tailoring_met             boolean,
  tailoring_met_decided_by  uuid references auth.users(id),
  tailoring_met_decided_on  timestamptz,
  developed_with_id         uuid references public.ref_rmth_b11_developed_with(id),
  b11_modality_id           uuid references public.ref_rmth_b11_modality(id),
  -- F0.2
  level_id                  uuid references public.ref_rmth_f02_level(id),
  group_id                  uuid references public.ref_rmth_f02_group(id),
  sector_focus_id           uuid references public.ref_rmth_f02_sector(id),
  sector_focus_other        text,
  developed_by_id           uuid references public.ref_rmth_f02_developed_by(id),
  partner_type_id           uuid references public.ref_rmth_f02_partner_type(id),
  source_document           text,
  sessions_count            int,
  f02_modality_id           uuid references public.ref_rmth_modality_ipob(id),
  development_complete_id   uuid references public.ref_rmth_f02_complete(id),
  development_complete_id_decided_by uuid references auth.users(id),
  development_complete_id_decided_on timestamptz,
  -- both
  partner_names             text,
  total_hours               numeric,
  completed_on              date,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_training_programme_id_municipality_key unique (id, municipality_id),
  constraint rmth_training_programme_reference_key unique (municipality_id, reference),
  constraint rmth_training_programme_type check (programme_type in ('specialised', 'entrepreneurship')),
  constraint rmth_training_programme_title_not_blank check (btrim(title) <> ''),
  constraint rmth_training_programme_hours_positive check (total_hours is null or total_hours > 0),
  constraint rmth_training_programme_sessions_positive check (sessions_count is null or sessions_count > 0),
  constraint rmth_training_programme_specialised_only check (programme_type = 'specialised' or num_nonnulls(
    specialisation_id, specialisation_other, occupation, linked_sector_id, linked_sector_other,
    requirements_document, tailoring_met, developed_with_id, b11_modality_id) = 0),
  constraint rmth_training_programme_entrepreneurship_only check (programme_type = 'entrepreneurship' or num_nonnulls(
    level_id, group_id, sector_focus_id, sector_focus_other, developed_by_id, partner_type_id,
    source_document, sessions_count, f02_modality_id, development_complete_id) = 0),
  constraint rmth_training_programme_tailoring_stamped check ((tailoring_met is null) = (tailoring_met_decided_on is null)),
  constraint rmth_training_programme_development_stamped check ((development_complete_id is null) = (development_complete_id_decided_on is null))
);
create index rmth_training_programme_municipality_idx on public.rmth_training_programme (municipality_id);
create index rmth_training_programme_specialisation_idx on public.rmth_training_programme (specialisation_id);
create index rmth_training_programme_linked_sector_idx on public.rmth_training_programme (linked_sector_id);
create index rmth_training_programme_developed_with_idx on public.rmth_training_programme (developed_with_id);
create index rmth_training_programme_b11_modality_idx on public.rmth_training_programme (b11_modality_id);
create index rmth_training_programme_level_idx on public.rmth_training_programme (level_id);
create index rmth_training_programme_group_idx on public.rmth_training_programme (group_id);
create index rmth_training_programme_sector_focus_idx on public.rmth_training_programme (sector_focus_id);
create index rmth_training_programme_developed_by_idx on public.rmth_training_programme (developed_by_id);
create index rmth_training_programme_partner_type_idx on public.rmth_training_programme (partner_type_id);
create index rmth_training_programme_f02_modality_idx on public.rmth_training_programme (f02_modality_id);
create index rmth_training_programme_development_complete_idx on public.rmth_training_programme (development_complete_id);
create index rmth_training_programme_tailoring_decided_by_idx on public.rmth_training_programme (tailoring_met_decided_by);
create index rmth_training_programme_development_decided_by_idx on public.rmth_training_programme (development_complete_id_decided_by);
create index rmth_training_programme_created_by_idx on public.rmth_training_programme (created_by);
create trigger trg_rmth_training_programme_reference before insert on public.rmth_training_programme
  for each row execute function public.rmth_assign_reference('programme_type=specialised:TP,entrepreneurship:EP');
create trigger trg_rmth_training_programme_other before insert or update on public.rmth_training_programme
  for each row execute function public.guard_rmth_other(
    'specialisation_id:ref_rmth_b11_specialisation:specialisation_other',
    'linked_sector_id:ref_rmth_sector:linked_sector_other',
    'sector_focus_id:ref_rmth_f02_sector:sector_focus_other');
create trigger trg_rmth_training_programme_decision before insert or update on public.rmth_training_programme
  for each row execute function public.rmth_stamp_decision('tailoring_met', 'development_complete_id');

create table public.rmth_training_programme_option (
  programme_id     uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (programme_id, question_code, option_id),
  foreign key (programme_id, municipality_id) references public.rmth_training_programme(id, municipality_id)
);
create index rmth_training_programme_option_municipality_idx on public.rmth_training_programme_option (municipality_id);
create trigger trg_rmth_training_programme_option_guard before insert or update on public.rmth_training_programme_option
  for each row execute function public.guard_rmth_option();

-- "Which approved project(s) does this programme serve?" -- B1.1, required
-- for the programme to count, so it is a junction to the proposals.
create table public.rmth_training_programme_proposal (
  programme_id     uuid not null,
  proposal_id      uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  created_at       timestamptz not null default now(),
  primary key (programme_id, proposal_id),
  foreign key (programme_id, municipality_id) references public.rmth_training_programme(id, municipality_id),
  foreign key (proposal_id, municipality_id) references public.rmth_proposal(id, municipality_id)
);
create index rmth_training_programme_proposal_proposal_idx on public.rmth_training_programme_proposal (proposal_id);
create index rmth_training_programme_proposal_municipality_idx on public.rmth_training_programme_proposal (municipality_id);

-- ── 4. rmth_training_cycle (C1.1, E0.3 cycles, F0.2 deliveries) ──────────

create table public.rmth_training_cycle (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  reference                 text,
  cycle_kind                text not null,
  programme_id              uuid,
  cycle_no                  int,
  title                     text,
  sector_id                 uuid references public.ref_rmth_c11_sector(id),
  sector_other              text,
  start_date                date not null,
  end_date                  date not null,
  contact_hours             numeric,
  weeks                     numeric,
  hours_per_week            numeric,
  modality_id               uuid references public.ref_rmth_c11_modality(id),
  location                  text,
  private_partner_names     text,
  academic_partner_names    text,
  academic_type_id          uuid references public.ref_rmth_c11_academic_type(id),
  joint_development_met     boolean,
  joint_development_met_decided_by uuid references auth.users(id),
  joint_development_met_decided_on timestamptz,
  enrolled_count            int,
  completed_count           int,
  completed_women           int,
  delivered_by_id           uuid references public.ref_rmth_e03_delivered_by(id),
  delivered_by_other        text,
  completed_on              date,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_training_cycle_id_municipality_key unique (id, municipality_id),
  constraint rmth_training_cycle_reference_key unique (municipality_id, reference),
  constraint rmth_training_cycle_programme_fkey foreign key (programme_id, municipality_id)
    references public.rmth_training_programme(id, municipality_id),
  constraint rmth_training_cycle_kind check (cycle_kind in ('employability', 'incubator_design', 'entrepreneurship')),
  constraint rmth_training_cycle_dates check (end_date >= start_date),
  constraint rmth_training_cycle_numbers_positive check (
    (contact_hours is null or contact_hours > 0) and (weeks is null or weeks > 0)
    and (hours_per_week is null or hours_per_week > 0)
    and (enrolled_count is null or enrolled_count >= 0) and (completed_count is null or completed_count >= 0)
    and (completed_women is null or completed_women >= 0)),
  constraint rmth_training_cycle_completed_within_enrolled check (
    completed_count is null or enrolled_count is null or completed_count <= enrolled_count),
  constraint rmth_training_cycle_women_within_completed check (
    completed_women is null or completed_count is null or completed_women <= completed_count),
  -- a delivery belongs to an entrepreneurship programme and is numbered within it; the other two kinds have a title and a reference
  constraint rmth_training_cycle_delivery_shape check (
    (cycle_kind = 'entrepreneurship' and programme_id is not null and cycle_no is not null and cycle_no > 0)
    or (cycle_kind <> 'entrepreneurship' and programme_id is null and cycle_no is null and title is not null and btrim(title) <> '')),
  constraint rmth_training_cycle_employability_only check (cycle_kind = 'employability' or num_nonnulls(
    sector_id, sector_other, weeks, hours_per_week, modality_id, private_partner_names, academic_partner_names,
    academic_type_id, joint_development_met, enrolled_count, completed_count, completed_women) = 0),
  constraint rmth_training_cycle_incubator_design_only check (cycle_kind = 'incubator_design' or num_nonnulls(
    delivered_by_id, delivered_by_other) = 0),
  constraint rmth_training_cycle_joint_stamped check ((joint_development_met is null) = (joint_development_met_decided_on is null))
);
create index rmth_training_cycle_municipality_idx on public.rmth_training_cycle (municipality_id);
create index rmth_training_cycle_programme_idx on public.rmth_training_cycle (programme_id);
create index rmth_training_cycle_sector_idx on public.rmth_training_cycle (sector_id);
create index rmth_training_cycle_modality_idx on public.rmth_training_cycle (modality_id);
create index rmth_training_cycle_academic_type_idx on public.rmth_training_cycle (academic_type_id);
create index rmth_training_cycle_delivered_by_idx on public.rmth_training_cycle (delivered_by_id);
create index rmth_training_cycle_joint_decided_by_idx on public.rmth_training_cycle (joint_development_met_decided_by);
create index rmth_training_cycle_created_by_idx on public.rmth_training_cycle (created_by);
create unique index rmth_training_cycle_delivery_no_live on public.rmth_training_cycle (municipality_id, programme_id, cycle_no)
  where deleted_at is null and programme_id is not null;
create trigger trg_rmth_training_cycle_reference before insert on public.rmth_training_cycle
  for each row execute function public.rmth_assign_reference('cycle_kind=employability:TC,incubator_design:ID', 'start_date');
create trigger trg_rmth_training_cycle_other before insert or update on public.rmth_training_cycle
  for each row execute function public.guard_rmth_other(
    'sector_id:ref_rmth_c11_sector:sector_other',
    'delivered_by_id:ref_rmth_e03_delivered_by:delivered_by_other');
create trigger trg_rmth_training_cycle_decision before insert or update on public.rmth_training_cycle
  for each row execute function public.rmth_stamp_decision('joint_development_met');

-- A delivery may only hang off an entrepreneurship programme.
create function public.rmth_training_cycle_programme_kind()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.programme_id is not null and not exists (
       select 1 from public.rmth_training_programme p
        where p.id = new.programme_id and p.programme_type = 'entrepreneurship') then
    raise exception 'a delivery row must belong to an entrepreneurship programme'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.rmth_training_cycle_programme_kind() from public, anon, authenticated;
create trigger trg_rmth_training_cycle_programme_kind before insert or update of programme_id on public.rmth_training_cycle
  for each row execute function public.rmth_training_cycle_programme_kind();

create table public.rmth_training_cycle_option (
  cycle_id         uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (cycle_id, question_code, option_id),
  foreign key (cycle_id, municipality_id) references public.rmth_training_cycle(id, municipality_id)
);
create index rmth_training_cycle_option_municipality_idx on public.rmth_training_cycle_option (municipality_id);
create trigger trg_rmth_training_cycle_option_guard before insert or update on public.rmth_training_cycle_option
  for each row execute function public.guard_rmth_option();

-- ── 5. rmth_event (A1.2, A1.3) ───────────────────────────────────────────

create table public.rmth_event (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  reference                 text,
  event_kind                text not null,
  title                     text not null,
  start_date                date not null,
  end_date                  date not null,
  location                  text,
  -- A1.2 networking
  event_type_id             uuid references public.ref_rmth_a12_event_type(id),
  event_type_other          text,
  solely_guidance           boolean,
  solely_guidance_decided_by uuid references auth.users(id),
  solely_guidance_decided_on timestamptz,
  organised_by_id           uuid references public.ref_rmth_a12_organised_by(id),
  partner_names             text,
  employers_count           int,
  focal_point_name          text,
  focal_point_phone         text,
  -- A1.3 guidance
  duration_hours            numeric,
  modality_id               uuid references public.ref_rmth_modality_ipob(id),
  parent_event_id           uuid,
  delivered_by_id           uuid references public.ref_rmth_a13_delivered_by(id),
  delivered_by_other        text,
  target_group_id           uuid references public.ref_rmth_a13_target_group(id),
  target_group_other        text,
  facilitator_name          text,
  -- participation, both kinds
  attendees_total           int,
  attendees_women           int,
  attendees_men             int,
  attendees_non_jordanian   int,
  attendees_disability      int,
  age_under_18              int,
  age_18_24                 int,
  age_25_35                 int,
  age_36_45                 int,
  age_46_plus               int,
  completed_on              date,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_event_id_municipality_key unique (id, municipality_id),
  constraint rmth_event_reference_key unique (municipality_id, reference),
  constraint rmth_event_parent_fkey foreign key (parent_event_id, municipality_id)
    references public.rmth_event(id, municipality_id),
  constraint rmth_event_kind check (event_kind in ('networking', 'guidance')),
  constraint rmth_event_title_not_blank check (btrim(title) <> ''),
  constraint rmth_event_dates check (end_date >= start_date),
  constraint rmth_event_guidance_one_day check (event_kind <> 'guidance' or end_date = start_date),
  constraint rmth_event_networking_only check (event_kind = 'networking' or num_nonnulls(
    event_type_id, event_type_other, solely_guidance, organised_by_id, partner_names, employers_count,
    focal_point_name, focal_point_phone) = 0),
  constraint rmth_event_guidance_only check (event_kind = 'guidance' or num_nonnulls(
    duration_hours, modality_id, parent_event_id, delivered_by_id, delivered_by_other,
    target_group_id, target_group_other, facilitator_name) = 0),
  constraint rmth_event_solely_stamped check ((solely_guidance is null) = (solely_guidance_decided_on is null)),
  constraint rmth_event_counts_non_negative check (
    (employers_count is null or employers_count >= 0) and (duration_hours is null or duration_hours > 0)
    and (attendees_total is null or attendees_total >= 0) and (attendees_women is null or attendees_women >= 0)
    and (attendees_men is null or attendees_men >= 0) and (attendees_non_jordanian is null or attendees_non_jordanian >= 0)
    and (attendees_disability is null or attendees_disability >= 0)
    and (age_under_18 is null or age_under_18 >= 0) and (age_18_24 is null or age_18_24 >= 0)
    and (age_25_35 is null or age_25_35 >= 0) and (age_36_45 is null or age_36_45 >= 0)
    and (age_46_plus is null or age_46_plus >= 0)),
  constraint rmth_event_women_men_within_total check (
    attendees_total is null or coalesce(attendees_women, 0) + coalesce(attendees_men, 0) <= attendees_total),
  constraint rmth_event_subgroups_within_total check (
    attendees_total is null or (
      coalesce(attendees_non_jordanian, 0) <= attendees_total and coalesce(attendees_disability, 0) <= attendees_total)),
  constraint rmth_event_age_bands_within_total check (
    attendees_total is null or coalesce(age_under_18, 0) + coalesce(age_18_24, 0) + coalesce(age_25_35, 0)
      + coalesce(age_36_45, 0) + coalesce(age_46_plus, 0) <= attendees_total)
);
create index rmth_event_municipality_idx on public.rmth_event (municipality_id);
create index rmth_event_event_type_idx on public.rmth_event (event_type_id);
create index rmth_event_organised_by_idx on public.rmth_event (organised_by_id);
create index rmth_event_modality_idx on public.rmth_event (modality_id);
create index rmth_event_parent_idx on public.rmth_event (parent_event_id);
create index rmth_event_delivered_by_idx on public.rmth_event (delivered_by_id);
create index rmth_event_target_group_idx on public.rmth_event (target_group_id);
create index rmth_event_solely_decided_by_idx on public.rmth_event (solely_guidance_decided_by);
create index rmth_event_created_by_idx on public.rmth_event (created_by);
create trigger trg_rmth_event_reference before insert on public.rmth_event
  for each row execute function public.rmth_assign_reference('event_kind=networking:EV,guidance:VG', 'start_date');
create trigger trg_rmth_event_other before insert or update on public.rmth_event
  for each row execute function public.guard_rmth_other(
    'event_type_id:ref_rmth_a12_event_type:event_type_other',
    'delivered_by_id:ref_rmth_a13_delivered_by:delivered_by_other',
    'target_group_id:ref_rmth_a13_target_group:target_group_other');
create trigger trg_rmth_event_decision before insert or update on public.rmth_event
  for each row execute function public.rmth_stamp_decision('solely_guidance');

-- A session "part of a larger networking event" names a NETWORKING event as
-- its parent, never another session.
create function public.rmth_event_parent_kind()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.parent_event_id is not null then
    if new.parent_event_id = new.id then
      raise exception 'a session cannot be its own parent event' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.rmth_event e
                    where e.id = new.parent_event_id and e.event_kind = 'networking') then
      raise exception 'parent_event_id must name a networking event (A1.2), not a guidance session'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.rmth_event_parent_kind() from public, anon, authenticated;
create trigger trg_rmth_event_parent_kind before insert or update of parent_event_id on public.rmth_event
  for each row execute function public.rmth_event_parent_kind();

create table public.rmth_event_option (
  event_id         uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (event_id, question_code, option_id),
  foreign key (event_id, municipality_id) references public.rmth_event(id, municipality_id)
);
create index rmth_event_option_municipality_idx on public.rmth_event_option (municipality_id);
create trigger trg_rmth_event_option_guard before insert or update on public.rmth_event_option
  for each row execute function public.guard_rmth_option();

-- ── 6. rmth_incubator (E0.1) ─────────────────────────────────────────────

create table public.rmth_incubator (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  reference                 text,
  name                      text not null,
  field_id                  uuid references public.ref_rmth_e01_field(id),
  field_other               text,
  host_id                   uuid references public.ref_rmth_e01_host(id),
  partner_university        text,
  partner_private           text,
  c1_id                     uuid references public.ref_rmth_e01_c1(id),
  c1_location               text,
  c1_date                   date,
  c2_id                     uuid references public.ref_rmth_e01_c2(id),
  c2_reference              text,
  c2_date                   date,
  c3_id                     uuid references public.ref_rmth_e01_c3(id),
  c3_date                   date,
  c4_id                     uuid references public.ref_rmth_e01_c4(id),
  c4_staff_count            int,
  established_id            uuid references public.ref_rmth_e01_status(id),
  established_other         text,
  established_id_decided_by uuid references auth.users(id),
  established_id_decided_on timestamptz,
  achieved_on               date,
  first_cohort_admitted     boolean,
  first_cohort_count        int,
  first_cohort_date         date,
  completed_on              date,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_incubator_id_municipality_key unique (id, municipality_id),
  constraint rmth_incubator_reference_key unique (municipality_id, reference),
  constraint rmth_incubator_name_not_blank check (btrim(name) <> ''),
  constraint rmth_incubator_staff_non_negative check (c4_staff_count is null or c4_staff_count >= 0),
  constraint rmth_incubator_cohort_non_negative check (first_cohort_count is null or first_cohort_count >= 0),
  constraint rmth_incubator_established_stamped check ((established_id is null) = (established_id_decided_on is null))
);
create index rmth_incubator_municipality_idx on public.rmth_incubator (municipality_id);
create index rmth_incubator_field_idx on public.rmth_incubator (field_id);
create index rmth_incubator_host_idx on public.rmth_incubator (host_id);
create index rmth_incubator_c1_idx on public.rmth_incubator (c1_id);
create index rmth_incubator_c2_idx on public.rmth_incubator (c2_id);
create index rmth_incubator_c3_idx on public.rmth_incubator (c3_id);
create index rmth_incubator_c4_idx on public.rmth_incubator (c4_id);
create index rmth_incubator_established_idx on public.rmth_incubator (established_id);
create index rmth_incubator_established_decided_by_idx on public.rmth_incubator (established_id_decided_by);
create index rmth_incubator_created_by_idx on public.rmth_incubator (created_by);
create trigger trg_rmth_incubator_reference before insert on public.rmth_incubator
  for each row execute function public.rmth_assign_reference('IN');
create trigger trg_rmth_incubator_other before insert or update on public.rmth_incubator
  for each row execute function public.guard_rmth_other(
    'field_id:ref_rmth_e01_field:field_other',
    'established_id:ref_rmth_e01_status:established_other');
create trigger trg_rmth_incubator_decision before insert or update on public.rmth_incubator
  for each row execute function public.rmth_stamp_decision('established_id');

-- Criterion 5: "Services live (select all, with the date each began)".
create table public.rmth_incubator_service_live (
  incubator_id     uuid not null,
  service_id       uuid not null references public.ref_rmth_e01_service(id),
  municipality_id  uuid not null default public.my_municipality(),
  began_on         date,
  created_at       timestamptz not null default now(),
  primary key (incubator_id, service_id),
  foreign key (incubator_id, municipality_id) references public.rmth_incubator(id, municipality_id)
);
create index rmth_incubator_service_live_service_idx on public.rmth_incubator_service_live (service_id);
create index rmth_incubator_service_live_municipality_idx on public.rmth_incubator_service_live (municipality_id);

create table public.rmth_incubator_option (
  incubator_id     uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (incubator_id, question_code, option_id),
  foreign key (incubator_id, municipality_id) references public.rmth_incubator(id, municipality_id)
);
create index rmth_incubator_option_municipality_idx on public.rmth_incubator_option (municipality_id);
create trigger trg_rmth_incubator_option_guard before insert or update on public.rmth_incubator_option
  for each row execute function public.guard_rmth_option();

-- ── 7. rmth_training_enrolment (C1.2, E0.3, F0.1) ────────────────────────

create table public.rmth_training_enrolment (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  cycle_id                  uuid not null,
  enrolment_kind            text not null,
  person_id                 uuid not null references public.person(id),
  age_years                 int,
  nationality_id            uuid references public.ref_rmth_nationality(id),
  nationality_other         text,
  -- C1.2
  c12_training_type_id      uuid references public.ref_rmth_c12_training_type(id),
  job_ready                 boolean,
  employer_evaluation_id    uuid references public.ref_rmth_c12_employer_evaluation(id),
  employer_evaluation_note  text,
  -- E0.3
  organisation_name         text,
  org_type_id               uuid references public.ref_rmth_e03_org_type(id),
  org_role                  text,
  -- F0.1
  f01_training_type_id      uuid references public.ref_rmth_f01_training_type(id),
  enterprise_status_id      uuid references public.ref_rmth_f01_enterprise_status(id),
  enterprise_sector_id      uuid references public.ref_rmth_f01_sector(id),
  enterprise_sector_other   text,
  -- completion, all kinds
  attendance_pct            numeric,
  pre_test                  numeric,
  post_test                 numeric,
  assessment_result_id      uuid references public.ref_rmth_assessment_result(id),
  met_criteria              boolean,
  met_criteria_decided_by   uuid references auth.users(id),
  met_criteria_decided_on   timestamptz,
  certificate_issued        boolean,
  certificate_number        text,
  counted_under_id          uuid,
  trainer_name              text,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_training_enrolment_id_municipality_key unique (id, municipality_id),
  constraint rmth_training_enrolment_cycle_fkey foreign key (cycle_id, municipality_id)
    references public.rmth_training_cycle(id, municipality_id),
  constraint rmth_training_enrolment_counted_under_fkey foreign key (counted_under_id, municipality_id)
    references public.rmth_training_enrolment(id, municipality_id),
  constraint rmth_training_enrolment_kind check (enrolment_kind in ('employability', 'incubator_design', 'entrepreneurship')),
  constraint rmth_training_enrolment_age check (age_years is null or age_years between 0 and 120),
  constraint rmth_training_enrolment_pct check (
    (attendance_pct is null or attendance_pct between 0 and 100)
    and (pre_test is null or pre_test between 0 and 100) and (post_test is null or post_test between 0 and 100)),
  constraint rmth_training_enrolment_employability_only check (enrolment_kind = 'employability' or num_nonnulls(
    c12_training_type_id, job_ready, employer_evaluation_id, employer_evaluation_note) = 0),
  constraint rmth_training_enrolment_incubator_design_only check (enrolment_kind = 'incubator_design' or num_nonnulls(
    organisation_name, org_type_id, org_role) = 0),
  constraint rmth_training_enrolment_entrepreneurship_only check (enrolment_kind = 'entrepreneurship' or num_nonnulls(
    f01_training_type_id, enterprise_status_id, enterprise_sector_id, enterprise_sector_other) = 0),
  -- E0.3 has no nationality, vulnerability or final assessment on its sheet
  constraint rmth_training_enrolment_incubator_design_has_no check (enrolment_kind <> 'incubator_design' or num_nonnulls(
    nationality_id, nationality_other, assessment_result_id) = 0),
  constraint rmth_training_enrolment_met_stamped check ((met_criteria is null) = (met_criteria_decided_on is null)),
  constraint rmth_training_enrolment_certificate_number check (certificate_number is null or certificate_issued is true),
  constraint rmth_training_enrolment_not_counted_under_self check (counted_under_id is null or counted_under_id <> id)
);
create index rmth_training_enrolment_municipality_idx on public.rmth_training_enrolment (municipality_id);
create index rmth_training_enrolment_cycle_idx on public.rmth_training_enrolment (cycle_id);
create index rmth_training_enrolment_person_idx on public.rmth_training_enrolment (person_id);
create index rmth_training_enrolment_nationality_idx on public.rmth_training_enrolment (nationality_id);
create index rmth_training_enrolment_c12_training_type_idx on public.rmth_training_enrolment (c12_training_type_id);
create index rmth_training_enrolment_employer_evaluation_idx on public.rmth_training_enrolment (employer_evaluation_id);
create index rmth_training_enrolment_org_type_idx on public.rmth_training_enrolment (org_type_id);
create index rmth_training_enrolment_f01_training_type_idx on public.rmth_training_enrolment (f01_training_type_id);
create index rmth_training_enrolment_enterprise_status_idx on public.rmth_training_enrolment (enterprise_status_id);
create index rmth_training_enrolment_enterprise_sector_idx on public.rmth_training_enrolment (enterprise_sector_id);
create index rmth_training_enrolment_assessment_result_idx on public.rmth_training_enrolment (assessment_result_id);
create index rmth_training_enrolment_met_decided_by_idx on public.rmth_training_enrolment (met_criteria_decided_by);
create index rmth_training_enrolment_counted_under_idx on public.rmth_training_enrolment (counted_under_id);
create index rmth_training_enrolment_created_by_idx on public.rmth_training_enrolment (created_by);
-- one live record per person per cycle: "one record per trainee per training cycle"
create unique index rmth_training_enrolment_person_cycle_live on public.rmth_training_enrolment (municipality_id, cycle_id, person_id)
  where deleted_at is null;
create trigger trg_rmth_training_enrolment_other before insert or update on public.rmth_training_enrolment
  for each row execute function public.guard_rmth_other(
    'nationality_id:ref_rmth_nationality:nationality_other',
    'enterprise_sector_id:ref_rmth_f01_sector:enterprise_sector_other');
create trigger trg_rmth_training_enrolment_decision before insert or update on public.rmth_training_enrolment
  for each row execute function public.rmth_stamp_decision('met_criteria');

-- The enrolment's kind is its cycle's kind, copied in so the check
-- constraints above can see it, and refused if it disagrees.
create function public.rmth_training_enrolment_kind()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_kind text;
begin
  select c.cycle_kind into v_kind from public.rmth_training_cycle c where c.id = new.cycle_id;
  if v_kind is null then
    return new;  -- the foreign key names the missing cycle
  end if;
  if new.enrolment_kind is null then
    new.enrolment_kind := v_kind;
  elsif new.enrolment_kind <> v_kind then
    raise exception 'enrolment_kind % does not match the cycle, which is %', new.enrolment_kind, v_kind
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.rmth_training_enrolment_kind() from public, anon, authenticated;
-- A BEFORE ROW trigger runs before NOT NULL is checked, so a null
-- enrolment_kind arriving from the app is filled here first.
create trigger trg_rmth_training_enrolment_kind before insert or update of cycle_id, enrolment_kind on public.rmth_training_enrolment
  for each row execute function public.rmth_training_enrolment_kind();

create table public.rmth_training_enrolment_option (
  enrolment_id     uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (enrolment_id, question_code, option_id),
  foreign key (enrolment_id, municipality_id) references public.rmth_training_enrolment(id, municipality_id)
);
create index rmth_training_enrolment_option_municipality_idx on public.rmth_training_enrolment_option (municipality_id);
create trigger trg_rmth_training_enrolment_option_guard before insert or update on public.rmth_training_enrolment_option
  for each row execute function public.guard_rmth_option();

-- ── 8. rmth_project_implementer (B1) ─────────────────────────────────────

create table public.rmth_project_implementer (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  entity_name               text not null,
  entity_type_id            uuid references public.ref_rmth_b1_implementer_type(id),
  first_record_of_id        uuid,
  project_titles            text,
  project_type_id           uuid references public.ref_rmth_project_type(id),
  project_type_other        text,
  sector_id                 uuid references public.ref_rmth_sector(id),
  sector_other              text,
  respondent_name           text,
  respondent_role           text,
  respondent_phone          text,
  reached_id                uuid references public.ref_rmth_b1_reached(id),
  interviewed_on            date,
  -- derived by the save function from the grid and the three conditions
  received_any              boolean,
  any_essential             boolean,
  enters_denominator        boolean,
  most_essential_component_id uuid references public.ref_rmth_support_component(id),
  would_have_helped         text,
  operating_status_id       uuid references public.ref_rmth_b1_operating_status(id),
  enumerator_name           text,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_project_implementer_id_municipality_key unique (id, municipality_id),
  constraint rmth_project_implementer_first_record_fkey foreign key (first_record_of_id, municipality_id)
    references public.rmth_project_implementer(id, municipality_id),
  constraint rmth_project_implementer_name_not_blank check (btrim(entity_name) <> ''),
  constraint rmth_project_implementer_not_first_of_self check (first_record_of_id is null or first_record_of_id <> id)
);
create index rmth_project_implementer_municipality_idx on public.rmth_project_implementer (municipality_id);
create index rmth_project_implementer_entity_type_idx on public.rmth_project_implementer (entity_type_id);
create index rmth_project_implementer_first_record_idx on public.rmth_project_implementer (first_record_of_id);
create index rmth_project_implementer_project_type_idx on public.rmth_project_implementer (project_type_id);
create index rmth_project_implementer_sector_idx on public.rmth_project_implementer (sector_id);
create index rmth_project_implementer_reached_idx on public.rmth_project_implementer (reached_id);
create index rmth_project_implementer_most_essential_idx on public.rmth_project_implementer (most_essential_component_id);
create index rmth_project_implementer_operating_status_idx on public.rmth_project_implementer (operating_status_id);
create index rmth_project_implementer_created_by_idx on public.rmth_project_implementer (created_by);
create trigger trg_rmth_project_implementer_other before insert or update on public.rmth_project_implementer
  for each row execute function public.guard_rmth_other(
    'project_type_id:ref_rmth_project_type:project_type_other',
    'sector_id:ref_rmth_sector:sector_other');

-- The support-criticality grid: one row per component, "lay this out as a
-- grid, one row per component, before digitising".
create table public.rmth_implementer_support (
  implementer_id   uuid not null,
  component_id     uuid not null references public.ref_rmth_support_component(id),
  municipality_id  uuid not null default public.my_municipality(),
  rating_id        uuid not null references public.ref_rmth_support_rating(id),
  component_other  text,
  created_at       timestamptz not null default now(),
  primary key (implementer_id, component_id),
  foreign key (implementer_id, municipality_id) references public.rmth_project_implementer(id, municipality_id)
);
create index rmth_implementer_support_component_idx on public.rmth_implementer_support (component_id);
create index rmth_implementer_support_rating_idx on public.rmth_implementer_support (rating_id);
create index rmth_implementer_support_municipality_idx on public.rmth_implementer_support (municipality_id);
create trigger trg_rmth_implementer_support_other before insert or update on public.rmth_implementer_support
  for each row execute function public.guard_rmth_other('component_id:ref_rmth_support_component:component_other');

create table public.rmth_project_implementer_proposal (
  implementer_id   uuid not null,
  proposal_id      uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  created_at       timestamptz not null default now(),
  primary key (implementer_id, proposal_id),
  foreign key (implementer_id, municipality_id) references public.rmth_project_implementer(id, municipality_id),
  foreign key (proposal_id, municipality_id) references public.rmth_proposal(id, municipality_id)
);
create index rmth_project_implementer_proposal_proposal_idx on public.rmth_project_implementer_proposal (proposal_id);
create index rmth_project_implementer_proposal_municipality_idx on public.rmth_project_implementer_proposal (municipality_id);

create table public.rmth_project_implementer_option (
  implementer_id   uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (implementer_id, question_code, option_id),
  foreign key (implementer_id, municipality_id) references public.rmth_project_implementer(id, municipality_id)
);
create index rmth_project_implementer_option_municipality_idx on public.rmth_project_implementer_option (municipality_id);
create trigger trg_rmth_project_implementer_option_guard before insert or update on public.rmth_project_implementer_option
  for each row execute function public.guard_rmth_option();

-- ── 9. rmth_incubation_service (E0.2) ────────────────────────────────────

create table public.rmth_incubation_service (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  incubator_id              uuid not null,
  person_id                 uuid not null references public.person(id),
  enterprise_id             uuid,
  age_years                 int,
  nationality_id            uuid references public.ref_rmth_nationality(id),
  nationality_other         text,
  admitted_on               date not null,
  stage_id                  uuid references public.ref_rmth_e02_stage(id),
  sector_id                 uuid references public.ref_rmth_e02_sector(id),
  sector_other              text,
  counted_under_id          uuid,
  status_id                 uuid references public.ref_rmth_e02_status(id),
  focal_point_name          text,
  completed_on              date,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_incubation_service_id_municipality_key unique (id, municipality_id),
  constraint rmth_incubation_service_incubator_fkey foreign key (incubator_id, municipality_id)
    references public.rmth_incubator(id, municipality_id),
  constraint rmth_incubation_service_enterprise_fkey foreign key (enterprise_id, municipality_id)
    references public.rmth_enterprise(id, municipality_id),
  constraint rmth_incubation_service_counted_under_fkey foreign key (counted_under_id, municipality_id)
    references public.rmth_incubation_service(id, municipality_id),
  constraint rmth_incubation_service_age check (age_years is null or age_years between 0 and 120),
  constraint rmth_incubation_service_not_counted_under_self check (counted_under_id is null or counted_under_id <> id)
);
create index rmth_incubation_service_municipality_idx on public.rmth_incubation_service (municipality_id);
create index rmth_incubation_service_incubator_idx on public.rmth_incubation_service (incubator_id);
create index rmth_incubation_service_person_idx on public.rmth_incubation_service (person_id);
create index rmth_incubation_service_enterprise_idx on public.rmth_incubation_service (enterprise_id);
create index rmth_incubation_service_nationality_idx on public.rmth_incubation_service (nationality_id);
create index rmth_incubation_service_stage_idx on public.rmth_incubation_service (stage_id);
create index rmth_incubation_service_sector_idx on public.rmth_incubation_service (sector_id);
create index rmth_incubation_service_counted_under_idx on public.rmth_incubation_service (counted_under_id);
create index rmth_incubation_service_status_idx on public.rmth_incubation_service (status_id);
create index rmth_incubation_service_created_by_idx on public.rmth_incubation_service (created_by);
-- "One record per participant per incubator"
create unique index rmth_incubation_service_person_incubator_live on public.rmth_incubation_service (municipality_id, incubator_id, person_id)
  where deleted_at is null;
create trigger trg_rmth_incubation_service_other before insert or update on public.rmth_incubation_service
  for each row execute function public.guard_rmth_other(
    'nationality_id:ref_rmth_nationality:nationality_other',
    'sector_id:ref_rmth_e02_sector:sector_other');

create table public.rmth_incubation_service_option (
  service_id       uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (service_id, question_code, option_id),
  foreign key (service_id, municipality_id) references public.rmth_incubation_service(id, municipality_id)
);
create index rmth_incubation_service_option_municipality_idx on public.rmth_incubation_service_option (municipality_id);
create trigger trg_rmth_incubation_service_option_guard before insert or update on public.rmth_incubation_service_option
  for each row execute function public.guard_rmth_option();

-- ── 10. rmth_outcome_survey (IMP-0, SO1-0, SO2-0, SO2-C1, SO3-0) ─────────

create table public.rmth_outcome_survey (
  id                        uuid primary key default gen_random_uuid(),
  municipality_id           uuid not null references public.municipality(id) default public.my_municipality(),
  survey_kind               text not null,
  person_id                 uuid not null references public.person(id),
  age_years                 int,
  nationality_id            uuid references public.ref_rmth_nationality(id),
  nationality_other         text,
  contact_date              date,
  reached_id                uuid references public.ref_rmth_reached(id),
  enumerator_name           text,
  counted_under_id          uuid,
  -- IMP-0
  pathway_id                uuid references public.ref_rmth_imp0_pathway(id),
  pathway_other             text,
  pathway_event_id          uuid,
  pathway_proposal_id       uuid,
  pathway_cycle_id          uuid,
  pathway_incubator_id      uuid,
  pathway_enterprise_id     uuid,
  first_access_month        date,
  round_id                  uuid references public.ref_rmth_imp0_round(id),
  engaged_id                uuid references public.ref_rmth_imp0_engaged(id),
  capacity_id               uuid references public.ref_rmth_imp0_capacity(id),
  consecutive_months        int,
  stopped_month             date,
  imp0_stop_reason_id       uuid references public.ref_rmth_imp0_stop_reason(id),
  imp0_stop_reason_other    text,
  imp0_criterion_id         uuid references public.ref_rmth_imp0_criterion(id),
  -- SO1-0
  event_id                  uuid,
  so10_event_type_id        uuid references public.ref_rmth_so10_event_type(id),
  other_events              text,
  current_status_id         uuid references public.ref_rmth_so10_current_status(id),
  so10_threshold_id         uuid references public.ref_rmth_so10_threshold(id),
  -- SO2-0 and SO2-C1
  cycle_id                  uuid,
  three_month_reached       boolean,
  placement_start_month     date,
  so20_outcome_id           uuid references public.ref_rmth_so20_outcome(id),
  employer_name             text,
  employer_sector           text,
  placement_title           text,
  facilitated_by_id         uuid references public.ref_rmth_so20_facilitated_by(id),
  arrangement_id            uuid references public.ref_rmth_so20_arrangement(id),
  working_time_id           uuid references public.ref_rmth_so20_working_time(id),
  obstacle_id               uuid references public.ref_rmth_so20_obstacle(id),
  obstacle_other            text,
  headline_id               uuid references public.ref_rmth_so2c1_headline(id),
  why_not_id                uuid references public.ref_rmth_so2c1_why_not(id),
  why_not_other             text,
  -- SO3-0
  incubator_id              uuid,
  enterprise_id             uuid,
  programme_id              uuid,
  enterprise_name           text,
  so30_sector_id            uuid references public.ref_rmth_so30_sector(id),
  so30_sector_other         text,
  role_id                   uuid references public.ref_rmth_so30_role(id),
  earning_since_month       date,
  months_of_six             int,
  so30_criterion_id         uuid references public.ref_rmth_so30_criterion(id),
  income_change_id          uuid references public.ref_rmth_so30_income_change(id),
  income_stopped_month      date,
  so30_stop_reason_id       uuid references public.ref_rmth_so30_stop_reason(id),
  so30_stop_reason_other    text,
  client_uuid               uuid unique,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  created_by                uuid references auth.users(id) default auth.uid(),
  deleted_at                timestamptz,
  constraint rmth_outcome_survey_id_municipality_key unique (id, municipality_id),
  constraint rmth_outcome_survey_counted_under_fkey foreign key (counted_under_id, municipality_id)
    references public.rmth_outcome_survey(id, municipality_id),
  constraint rmth_outcome_survey_pathway_event_fkey foreign key (pathway_event_id, municipality_id)
    references public.rmth_event(id, municipality_id),
  constraint rmth_outcome_survey_pathway_proposal_fkey foreign key (pathway_proposal_id, municipality_id)
    references public.rmth_proposal(id, municipality_id),
  constraint rmth_outcome_survey_pathway_cycle_fkey foreign key (pathway_cycle_id, municipality_id)
    references public.rmth_training_cycle(id, municipality_id),
  constraint rmth_outcome_survey_pathway_incubator_fkey foreign key (pathway_incubator_id, municipality_id)
    references public.rmth_incubator(id, municipality_id),
  constraint rmth_outcome_survey_pathway_enterprise_fkey foreign key (pathway_enterprise_id, municipality_id)
    references public.rmth_enterprise(id, municipality_id),
  constraint rmth_outcome_survey_event_fkey foreign key (event_id, municipality_id)
    references public.rmth_event(id, municipality_id),
  constraint rmth_outcome_survey_cycle_fkey foreign key (cycle_id, municipality_id)
    references public.rmth_training_cycle(id, municipality_id),
  constraint rmth_outcome_survey_incubator_fkey foreign key (incubator_id, municipality_id)
    references public.rmth_incubator(id, municipality_id),
  constraint rmth_outcome_survey_enterprise_fkey foreign key (enterprise_id, municipality_id)
    references public.rmth_enterprise(id, municipality_id),
  constraint rmth_outcome_survey_programme_fkey foreign key (programme_id, municipality_id)
    references public.rmth_training_programme(id, municipality_id),
  constraint rmth_outcome_survey_kind check (survey_kind in ('imp_0', 'so1_0', 'so2_0', 'so2_c1', 'so3_0')),
  constraint rmth_outcome_survey_age check (age_years is null or age_years between 0 and 120),
  constraint rmth_outcome_survey_months check (
    (consecutive_months is null or consecutive_months >= 0) and (months_of_six is null or months_of_six between 0 and 6)),
  constraint rmth_outcome_survey_not_counted_under_self check (counted_under_id is null or counted_under_id <> id),
  constraint rmth_outcome_survey_imp0_only check (survey_kind = 'imp_0' or num_nonnulls(
    pathway_id, pathway_other, pathway_event_id, pathway_proposal_id, pathway_cycle_id, pathway_incubator_id,
    pathway_enterprise_id, first_access_month, round_id, engaged_id, capacity_id, consecutive_months,
    stopped_month, imp0_stop_reason_id, imp0_stop_reason_other, imp0_criterion_id) = 0),
  constraint rmth_outcome_survey_so10_only check (survey_kind = 'so1_0' or num_nonnulls(
    event_id, so10_event_type_id, other_events, current_status_id, so10_threshold_id) = 0),
  constraint rmth_outcome_survey_so20_only check (survey_kind = 'so2_0' or num_nonnulls(
    three_month_reached, placement_start_month, so20_outcome_id, employer_name, employer_sector, placement_title,
    facilitated_by_id, arrangement_id, working_time_id, obstacle_id, obstacle_other) = 0),
  constraint rmth_outcome_survey_so2c1_only check (survey_kind = 'so2_c1' or num_nonnulls(
    headline_id, why_not_id, why_not_other) = 0),
  constraint rmth_outcome_survey_cycle_kinds check (cycle_id is null or survey_kind in ('so2_0', 'so2_c1')),
  constraint rmth_outcome_survey_so30_only check (survey_kind = 'so3_0' or num_nonnulls(
    incubator_id, enterprise_id, programme_id, enterprise_name, so30_sector_id, so30_sector_other, role_id,
    earning_since_month, months_of_six, so30_criterion_id, income_change_id, income_stopped_month,
    so30_stop_reason_id, so30_stop_reason_other) = 0),
  -- IMP-0 has no "was the person reached" question (its criterion field carries that); SO2-C1 has no nationality
  constraint rmth_outcome_survey_imp0_has_no_reached check (survey_kind <> 'imp_0' or reached_id is null),
  constraint rmth_outcome_survey_so2c1_has_no_nationality check (survey_kind <> 'so2_c1' or num_nonnulls(nationality_id, nationality_other) = 0),
  -- counted_under only where the sheet asks it (IMP-0, SO1-0, SO3-0)
  constraint rmth_outcome_survey_counted_under_kinds check (counted_under_id is null or survey_kind in ('imp_0', 'so1_0', 'so3_0'))
);
create index rmth_outcome_survey_municipality_idx on public.rmth_outcome_survey (municipality_id);
create index rmth_outcome_survey_person_idx on public.rmth_outcome_survey (person_id);
create index rmth_outcome_survey_kind_idx on public.rmth_outcome_survey (survey_kind);
create index rmth_outcome_survey_nationality_idx on public.rmth_outcome_survey (nationality_id);
create index rmth_outcome_survey_reached_idx on public.rmth_outcome_survey (reached_id);
create index rmth_outcome_survey_counted_under_idx on public.rmth_outcome_survey (counted_under_id);
create index rmth_outcome_survey_pathway_idx on public.rmth_outcome_survey (pathway_id);
create index rmth_outcome_survey_pathway_event_idx on public.rmth_outcome_survey (pathway_event_id);
create index rmth_outcome_survey_pathway_proposal_idx on public.rmth_outcome_survey (pathway_proposal_id);
create index rmth_outcome_survey_pathway_cycle_idx on public.rmth_outcome_survey (pathway_cycle_id);
create index rmth_outcome_survey_pathway_incubator_idx on public.rmth_outcome_survey (pathway_incubator_id);
create index rmth_outcome_survey_pathway_enterprise_idx on public.rmth_outcome_survey (pathway_enterprise_id);
create index rmth_outcome_survey_round_idx on public.rmth_outcome_survey (round_id);
create index rmth_outcome_survey_engaged_idx on public.rmth_outcome_survey (engaged_id);
create index rmth_outcome_survey_capacity_idx on public.rmth_outcome_survey (capacity_id);
create index rmth_outcome_survey_imp0_stop_reason_idx on public.rmth_outcome_survey (imp0_stop_reason_id);
create index rmth_outcome_survey_imp0_criterion_idx on public.rmth_outcome_survey (imp0_criterion_id);
create index rmth_outcome_survey_event_idx on public.rmth_outcome_survey (event_id);
create index rmth_outcome_survey_so10_event_type_idx on public.rmth_outcome_survey (so10_event_type_id);
create index rmth_outcome_survey_current_status_idx on public.rmth_outcome_survey (current_status_id);
create index rmth_outcome_survey_so10_threshold_idx on public.rmth_outcome_survey (so10_threshold_id);
create index rmth_outcome_survey_cycle_idx on public.rmth_outcome_survey (cycle_id);
create index rmth_outcome_survey_so20_outcome_idx on public.rmth_outcome_survey (so20_outcome_id);
create index rmth_outcome_survey_facilitated_by_idx on public.rmth_outcome_survey (facilitated_by_id);
create index rmth_outcome_survey_arrangement_idx on public.rmth_outcome_survey (arrangement_id);
create index rmth_outcome_survey_working_time_idx on public.rmth_outcome_survey (working_time_id);
create index rmth_outcome_survey_obstacle_idx on public.rmth_outcome_survey (obstacle_id);
create index rmth_outcome_survey_headline_idx on public.rmth_outcome_survey (headline_id);
create index rmth_outcome_survey_why_not_idx on public.rmth_outcome_survey (why_not_id);
create index rmth_outcome_survey_incubator_idx on public.rmth_outcome_survey (incubator_id);
create index rmth_outcome_survey_enterprise_idx on public.rmth_outcome_survey (enterprise_id);
create index rmth_outcome_survey_programme_idx on public.rmth_outcome_survey (programme_id);
create index rmth_outcome_survey_so30_sector_idx on public.rmth_outcome_survey (so30_sector_id);
create index rmth_outcome_survey_role_idx on public.rmth_outcome_survey (role_id);
create index rmth_outcome_survey_so30_criterion_idx on public.rmth_outcome_survey (so30_criterion_id);
create index rmth_outcome_survey_income_change_idx on public.rmth_outcome_survey (income_change_id);
create index rmth_outcome_survey_so30_stop_reason_idx on public.rmth_outcome_survey (so30_stop_reason_id);
create index rmth_outcome_survey_created_by_idx on public.rmth_outcome_survey (created_by);
create trigger trg_rmth_outcome_survey_other before insert or update on public.rmth_outcome_survey
  for each row execute function public.guard_rmth_other(
    'nationality_id:ref_rmth_nationality:nationality_other',
    'pathway_id:ref_rmth_imp0_pathway:pathway_other',
    'imp0_stop_reason_id:ref_rmth_imp0_stop_reason:imp0_stop_reason_other',
    'obstacle_id:ref_rmth_so20_obstacle:obstacle_other',
    'why_not_id:ref_rmth_so2c1_why_not:why_not_other',
    'so30_sector_id:ref_rmth_so30_sector:so30_sector_other',
    'so30_stop_reason_id:ref_rmth_so30_stop_reason:so30_stop_reason_other');

create table public.rmth_outcome_survey_option (
  survey_id        uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (survey_id, question_code, option_id),
  foreign key (survey_id, municipality_id) references public.rmth_outcome_survey(id, municipality_id)
);
create index rmth_outcome_survey_option_municipality_idx on public.rmth_outcome_survey_option (municipality_id);
create trigger trg_rmth_outcome_survey_option_guard before insert or update on public.rmth_outcome_survey_option
  for each row execute function public.guard_rmth_option();

-- ── 11. triggers, RLS, grants -- every table the same way ─────────────────
--
-- record tables: the four standard triggers; read = the municipality gate;
--   insert/update = the writer AND the gate on both sides; no DELETE policy
--   (soft delete is an UPDATE; guard_no_hard_delete refuses the rest)
-- child tables (junctions, the grid, the live services): replaced by
--   delete-then-insert, so hard delete is allowed and DELETE has a policy
--   -- the seventh row of the register, closed before it can open.

do $secure$
declare
  r record;
  v_writer text;
begin
  for r in
    select * from (values
      ('rmth_enterprise',                    'can_write', false),
      ('rmth_proposal',                      'can_write', false),
      ('rmth_proposal_option',               'can_write', true),
      ('rmth_training_programme',            'can_write', false),
      ('rmth_training_programme_option',     'can_write', true),
      ('rmth_training_programme_proposal',   'can_write', true),
      ('rmth_training_cycle',                'can_write', false),
      ('rmth_training_cycle_option',         'can_write', true),
      ('rmth_event',                         'can_write', false),
      ('rmth_event_option',                  'can_write', true),
      ('rmth_incubator',                     'can_write', false),
      ('rmth_incubator_service_live',        'can_write', true),
      ('rmth_incubator_option',              'can_write', true),
      ('rmth_training_enrolment',            'is_staff',  false),
      ('rmth_training_enrolment_option',     'is_staff',  true),
      ('rmth_project_implementer',           'can_write', false),
      ('rmth_implementer_support',           'can_write', true),
      ('rmth_project_implementer_proposal',  'can_write', true),
      ('rmth_project_implementer_option',    'can_write', true),
      ('rmth_incubation_service',            'is_staff',  false),
      ('rmth_incubation_service_option',     'is_staff',  true),
      ('rmth_outcome_survey',                'is_staff',  false),
      ('rmth_outcome_survey_option',         'is_staff',  true)
    ) as t(tbl, writer, is_child)
  loop
    v_writer := format('public.%I()', r.writer);

    if r.is_child then
      -- children: updated_at is meaningless (no such column); audit only, hard delete allowed
      execute format('drop trigger if exists trg_%1$s_audit on public.%1$I', r.tbl);
      execute format('create trigger trg_%1$s_audit after insert or update or delete on public.%1$I '
                     'for each row execute function public.audit_row()', r.tbl);
    else
      perform public.attach_standard_triggers(r.tbl);
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

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_bad     int;
  v_rmth    uuid := '00000000-0000-4000-8000-0000000000a1';
  v_shm     uuid := '00000000-0000-4000-8000-00000000005a';
  v_ev      uuid;
  v_vg      uuid;
  v_ref     text;
  v_prop    uuid;
  v_prog    uuid;
  v_cyc     uuid;
  v_person  uuid;
  v_enr     uuid;
  v_topic   uuid;
  v_ok      boolean;
begin
  -- 1. shape: 23 tables, RLS on, a read policy on each, a DELETE policy on
  --    exactly the 13 children and no record table, every FK indexed
  select count(*) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and c.relname not in ('rmth_threshold', 'rmth_reference_counter');
  if v_bad <> 23 then
    raise exception '0125: expected 23 tables, found %', v_bad;
  end if;
  select count(*) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'rmth\_%'
     and c.relname not in ('rmth_threshold', 'rmth_reference_counter')
     and (not c.relrowsecurity
          or not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd = 'r'));
  if v_bad <> 0 then
    raise exception '0125: % tables lack RLS or a read policy', v_bad;
  end if;
  select count(*) into v_bad from pg_policy p join pg_class c on c.oid = p.polrelid
   where p.polcmd = 'd' and c.relname like 'rmth\_%';
  if v_bad <> 13 then
    raise exception '0125: expected 13 DELETE policies (the children), found %', v_bad;
  end if;
  -- every foreign key column has an index whose first column it is
  select count(*) into v_bad
    from pg_constraint k join pg_class c on c.oid = k.conrelid
   where k.contype = 'f' and c.relname like 'rmth\_%'
     and not exists (
       select 1 from pg_index i
        where i.indrelid = k.conrelid and i.indkey[0] = k.conkey[1]);
  if v_bad <> 0 then
    raise exception '0125: % foreign keys have no index on their first column', v_bad;
  end if;

  -- 2. behaviour, as the OWNER for the mechanics and as the Ramtha admin
  --    for the gate, all discarded
  begin
    select id into v_topic from public.ref_rmth_a12_event_type where code = 'job_fair';

    -- references issue per kind and year
    insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date, event_type_id, solely_guidance)
    values (v_rmth, 'networking', '0125 probe fair', date '2026-10-01', date '2026-10-01', v_topic, false)
    returning id, reference into v_ev, v_ref;
    if v_ref <> 'RMTH-EV-2026-001' then
      raise exception '0125: event reference was %', v_ref;
    end if;
    if (select solely_guidance_decided_on from public.rmth_event where id = v_ev) is null then
      raise exception '0125: the decision stamp did not fire';
    end if;

    insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date, parent_event_id, duration_hours)
    values (v_rmth, 'guidance', '0125 probe session', date '2026-10-01', date '2026-10-01', v_ev, 2)
    returning id, reference into v_vg, v_ref;
    if v_ref <> 'RMTH-VG-2026-001' then
      raise exception '0125: session reference was %', v_ref;
    end if;

    -- a session cannot parent a session; a networking column on a session is refused
    v_ok := false;
    begin
      insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date, parent_event_id)
      values (v_rmth, 'guidance', 'x', date '2026-10-02', date '2026-10-02', v_vg);
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: a session accepted a session as its parent'; end if;
    v_ok := false;
    begin
      insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date, employers_count)
      values (v_rmth, 'guidance', 'x', date '2026-10-02', date '2026-10-02', 3);
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: a guidance session accepted a networking column'; end if;

    -- "Other (specify)" without the text is refused; with it, accepted
    v_ok := false;
    begin
      insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date, event_type_id)
      values (v_rmth, 'networking', 'x', date '2026-10-02', date '2026-10-02',
              (select id from public.ref_rmth_a12_event_type where code = 'other'));
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: an "Other" event type was accepted with nothing specified'; end if;

    -- the option junction: a wrong question, a wrong list, then a right one
    v_ok := false;
    begin
      insert into public.rmth_event_option (event_id, municipality_id, question_code, option_id)
      values (v_ev, v_rmth, 'so30_support', (select id from public.ref_rmth_so30_support limit 1));
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: an event accepted a survey question'; end if;
    v_ok := false;
    begin
      insert into public.rmth_event_option (event_id, municipality_id, question_code, option_id)
      values (v_ev, v_rmth, 'a12_evidence', (select id from public.ref_rmth_a13_evidence where code = 'report'));
    exception when foreign_key_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: an option from the wrong list was accepted'; end if;
    insert into public.rmth_event_option (event_id, municipality_id, question_code, option_id)
    values (v_ev, v_rmth, 'a12_evidence', (select id from public.ref_rmth_a12_evidence where code = 'report'));

    -- a proposal is counted on FIRST approval and the date does not move
    insert into public.rmth_proposal (municipality_id, title, submitted_by_name, submitter_type_id, submitted_on,
                                      decision_id, decided_on)
    values (v_rmth, '0125 probe proposal', 'Probe Co', (select id from public.ref_rmth_b12_submitter_type where code = 'private'),
            date '2026-09-01', (select id from public.ref_rmth_b12_decision where code = 'deferred'), date '2026-09-10')
    returning id into v_prop;
    if (select first_approved_on from public.rmth_proposal where id = v_prop) is not null then
      raise exception '0125: a deferred proposal was counted';
    end if;
    update public.rmth_proposal set decision_id = (select id from public.ref_rmth_b12_decision where code = 'approved_conditions'),
           decided_on = date '2026-09-20' where id = v_prop;
    if (select first_approved_on from public.rmth_proposal where id = v_prop) <> date '2026-09-20' then
      raise exception '0125: first_approved_on was not set on approval';
    end if;
    update public.rmth_proposal set decision_id = (select id from public.ref_rmth_b12_decision where code = 'rejected'),
           decided_on = date '2026-09-25' where id = v_prop;
    if (select first_approved_on from public.rmth_proposal where id = v_prop) <> date '2026-09-20' then
      raise exception '0125: first_approved_on moved after a later decision';
    end if;
    if (select reference from public.rmth_proposal where id = v_prop) <> 'RMTH-PP-2026-001' then
      raise exception '0125: proposal reference was not RMTH-PP-2026-001';
    end if;

    -- a delivery needs an entrepreneurship programme; an enrolment takes its cycle's kind
    insert into public.rmth_training_programme (municipality_id, programme_type, title)
    values (v_rmth, 'entrepreneurship', '0125 probe programme') returning id into v_prog;
    if (select reference from public.rmth_training_programme where id = v_prog) <> 'RMTH-EP-2026-001' then
      raise exception '0125: programme reference was not RMTH-EP-2026-001';
    end if;
    insert into public.rmth_training_cycle (municipality_id, cycle_kind, programme_id, cycle_no, start_date, end_date)
    values (v_rmth, 'entrepreneurship', v_prog, 1, date '2026-11-01', date '2026-11-05') returning id into v_cyc;
    if (select reference from public.rmth_training_cycle where id = v_cyc) is not null then
      raise exception '0125: a delivery row was issued a reference';
    end if;
    v_ok := false;
    begin
      insert into public.rmth_training_cycle (municipality_id, cycle_kind, title, start_date, end_date, programme_id, cycle_no)
      values (v_rmth, 'employability', 'x', date '2026-11-01', date '2026-11-05', v_prog, 2);
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: an employability cycle accepted a programme'; end if;

    select id into v_person from public.person where deleted_at is null order by created_at limit 1;
    insert into public.rmth_training_enrolment (municipality_id, cycle_id, person_id, met_criteria)
    values (v_rmth, v_cyc, v_person, true) returning id into v_enr;
    if (select enrolment_kind from public.rmth_training_enrolment where id = v_enr) <> 'entrepreneurship'
       or (select met_criteria_decided_on from public.rmth_training_enrolment where id = v_enr) is null then
      raise exception '0125: the enrolment did not take its cycle''s kind, or the decision was not stamped';
    end if;
    v_ok := false;
    begin
      insert into public.rmth_training_enrolment (municipality_id, cycle_id, person_id, job_ready)
      values (v_rmth, v_cyc, v_person, true);
    exception when check_violation then v_ok := true; when unique_violation then v_ok := true; end;
    if not v_ok then raise exception '0125: an entrepreneurship enrolment accepted a C1.2 column'; end if;

    -- 3. the gate: the Ramtha admin sees the probe rows, the Sahel Horan admin none
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'coordinator@shm.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    if (select count(*) from public.rmth_event) <> 0 or (select count(*) from public.rmth_proposal) <> 0 then
      raise exception '0125: the Sahel Horan admin can see Ramtha rows';
    end if;
    -- and cannot write one carrying Ramtha's id
    v_ok := false;
    begin
      insert into public.rmth_enterprise (municipality_id, name) values (v_rmth, 'x');
    exception when insufficient_privilege then v_ok := true; when others then v_ok := true; end;
    if not v_ok then raise exception '0125: the Sahel Horan admin wrote a Ramtha row'; end if;
    reset role;
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    if (select count(*) from public.rmth_event) <> 2 or (select count(*) from public.rmth_event_option) <> 1 then
      raise exception '0125: the Ramtha admin does not see the probe rows';
    end if;
    -- the default fills the municipality for the Ramtha admin
    insert into public.rmth_enterprise (name) values ('0125 probe enterprise');
    if (select municipality_id from public.rmth_enterprise where name = '0125 probe enterprise') <> v_rmth then
      raise exception '0125: the municipality default did not fill for the Ramtha admin';
    end if;
    -- and the junction delete is permitted (the seventh row of the register)
    delete from public.rmth_event_option where event_id = v_ev;
    if (select count(*) from public.rmth_event_option where event_id = v_ev) <> 0 then
      raise exception '0125: the junction delete was filtered';
    end if;
    reset role;

    raise exception using errcode = 'P0125', message = 'rollback the probe';
  exception
    when sqlstate 'P0125' then null;
  end;

  if exists (select 1 from public.rmth_event) or exists (select 1 from public.rmth_reference_counter) then
    raise exception '0125: probe rows survived the rollback';
  end if;
end $verify$;
