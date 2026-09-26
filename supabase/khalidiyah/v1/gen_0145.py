# -*- coding: utf-8 -*-
"""
Generates supabase/migrations/PENDING_0145_khalidiyah_domain_tables.sql from the
resolved model (workbook + catalogue): the 21 record tables and 3 entity
tables, their option junctions, their count children, the checklist items,
the rating rows, the participations, the milestone catalogue and rules, the
question->list map, RLS and the standard triggers.

Run from the repository root:  python supabase/khalidiyah/gen_0145.py
Writes LF only (newline=''), per CLAUDE.md rule 5.
"""
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model import build
from catalogue import FORMS, TABLES, REFERENCES, LIST_FIXES, LISTS_ADDED_LATER, spec_for

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
# v1 is history: it writes into v1/out/, never over the live migrations or app files
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
os.makedirs(OUT, exist_ok=True)
KHLD = '00000000-0000-4000-8000-0000000000b2'


def q(s):
    return "'" + s.replace("'", "''") + "'"


m = build()

# ── per-table extras ──────────────────────────────────────────────────────
# fk: the column name a child uses to point at the table
# writer: the policy helper that may insert/update (can_write | is_staff)
# ref: (prefix, width, date columns) from the catalogue's REFERENCES
FK = {
    'khld_partner': 'partner_id', 'khld_enterprise': 'enterprise_id', 'khld_vendor': 'vendor_id',
    'khld_works_item': 'works_item_id', 'khld_coordination_meeting': 'meeting_id',
    'khld_contribution': 'contribution_id', 'khld_campaign': 'campaign_id', 'khld_activity': 'activity_id',
    'khld_market': 'market_id', 'khld_action_day': 'action_day_id', 'khld_volunteer': 'volunteer_id',
    'khld_attendance': 'attendance_id', 'khld_guidance_completion': 'completion_id',
    'khld_enterprise_support': 'support_id', 'khld_vendor_registration': 'registration_id',
    'khld_interaction_survey': 'survey_id', 'khld_partner_survey': 'survey_id', 'khld_user_feedback': 'feedback_id',
    'khld_volunteer_tracking': 'tracking_id', 'khld_producer_survey': 'survey_id',
    'khld_milestone_verification': 'verification_id',
}
WRITER = {t: 'can_write' for t in TABLES}
for t in ('khld_interaction_survey', 'khld_partner_survey', 'khld_user_feedback', 'khld_producer_survey', 'khld_volunteer_tracking'):
    WRITER[t] = 'is_staff'

FORM_OF = {v['table']: k for k, v in FORMS.items() if v['table'] != 'khld_milestone_verification'}
REF_OF = {}
for fid, (prefix, width, datecol) in REFERENCES.items():
    REF_OF[FORMS[fid]['table']] = (prefix, width, datecol)
# entities: the reference the sheet issues belongs to the ENTITY, not the record
REF_OF['khld_enterprise'] = REF_OF.pop('khld_guidance_completion')   # KHLD-ENT-NNN
REF_OF['khld_vendor'] = REF_OF.pop('khld_vendor_registration')       # KHLD-VEN-NNN
REF_OF['khld_contribution'] = ('CON', 2, 'date_pledged,date_received')

# columns the ENTITY tables carry (they have no sheet of their own)
ENTITY_COLUMNS = {
    'khld_partner': [
        ('name', 'text', False, None, 'Name of partner organisation (SO1-0 field 3; SO1-A3 contributor)'),
        ('partner_type_id', 'uuid', True, 'partner_type', 'Partner type (SO1-0 field 4)'),
        ('partner_type_other', 'text', True, None, 'free text for partner_type'),
        ('contact', 'text', True, None, 'Phone and email (SO1-0 field 7)'),
    ],
    'khld_enterprise': [
        ('owner_person_id', 'uuid', True, '@person', 'The owner, when an identifier was collected (SO4-G1 field 4, SO4-H2 field 6)'),
        ('owner_name', 'text', True, None, "Owner's name (SO4-G2 field 5) when no person record exists"),
        ('owner_phone', 'text', True, None, "Owner's phone (SO4-G2 field 5) when no person record exists"),
        ('enterprise_name', 'text', True, None, 'Trade or product name, if the enterprise has one (SO4-G1 field 11)'),
    ],
    'khld_vendor': [
        ('person_id', 'uuid', False, '@person', 'The vendor (SO4-H2 fields 5-6)'),
    ],
    # links a record table carries that the sheet implies but names as no field
    'khld_vendor_registration': [
        ('vendor_id', 'uuid', False, '@khld_vendor', 'The vendor this registration is for (SO4-H2 fields 2-3: found or created from the identifier)'),
    ],
    'khld_contribution': [
        ('partner_id', 'uuid', True, '@khld_partner', 'The registered partner, when the contributor is one (plan Part 6, SO1-A3: an optional partner reference)'),
    ],
}
PERSON_TABLES = {'khld_volunteer'}          # the record IS the person-level entity
PUBLISHED = {'khld_activity', 'khld_market'}

# unique keys: (name, expression, partial where-clause or None)
UNIQUES = {
    'khld_partner': [('khld_partner_name_key', '(municipality_id, lower(btrim(name)))', None)],
    'khld_vendor': [('khld_vendor_person_key', '(municipality_id, person_id)', None)],
    'khld_volunteer': [('khld_volunteer_person_key', '(municipality_id, person_id)', None)],
    'khld_attendance': [('khld_attendance_activity_live', '(activity_id)', 'deleted_at is null')],
    'khld_enterprise_support': [('khld_enterprise_support_enterprise_live', '(enterprise_id)', 'deleted_at is null')],
    'khld_vendor_registration': [('khld_vendor_registration_market_vendor_live', '(market_id, vendor_id)', 'deleted_at is null')],
    'khld_partner_survey': [('khld_partner_survey_partner_round_live', '(partner_id, survey_round_id)', 'deleted_at is null')],
    'khld_guidance_completion': [('khld_guidance_completion_enterprise_year_live', '(enterprise_id, cycle_year)', 'deleted_at is null')],
}

SCOPED_PARENTS = set(TABLES)


def ref_clause(ref):
    if ref is None:
        return ''
    if ref == '@person':
        return ' references public.person(id)'
    if ref.startswith('@'):
        return ''   # composite key added at table level
    return ' references public.ref_khld_%s(id)' % ref


def table_ddl(t):
    cols = list(ENTITY_COLUMNS.get(t, [])) + list(m.columns.get(t, []))
    if t == 'khld_milestone_verification':
        # a column one milestone's sheet requires must be NULL on the other
        # three, so only the columns every milestone carries keep NOT NULL
        shared = set.intersection(*[set(v) for v in m.milestone_columns.values()])
        cols = [(n, ty, (nu or n not in shared), r, c) for (n, ty, nu, r, c) in cols]
    lines = []
    lines.append('create table public.%s (' % t)
    lines.append('  id                    uuid primary key default gen_random_uuid(),')
    lines.append('  municipality_id       uuid not null references public.municipality(id) default public.my_municipality(),')
    if t in REF_OF:
        lines.append('  reference             text,')
    if t in PERSON_TABLES:
        lines.append('  person_id             uuid not null references public.person(id),')
    if t == 'khld_milestone_verification':
        lines.append("  milestone_code        text not null check (milestone_code in ('SO1-A1', 'SO1-B1', 'SO3-E1', 'SO3-F1')),")
    if t == 'khld_guidance_completion':
        # derived by trigger from the five sessions (plan 5.4); never accepted from a client
        lines.append('  sessions_attended_count int,')
        lines.append("  completion            text check (completion in ('completed', 'not_completed', 'not_yet_decided')),")
    if t == 'khld_enterprise_support':
        lines.append('  support_types_count   int,')
    for (name, sqltype, nullable, ref, comment) in cols:
        nn = '' if nullable else ' not null'
        lines.append('  %-21s %s%s%s,' % (name, sqltype, nn, ref_clause(ref)))
    if t in PUBLISHED:
        lines.append('  is_published          boolean not null default false,')
    lines.append('  client_uuid           uuid unique,')
    lines.append('  created_at            timestamptz not null default now(),')
    lines.append('  updated_at            timestamptz not null default now(),')
    lines.append('  created_by            uuid references auth.users(id) default auth.uid(),')
    lines.append('  deleted_at            timestamptz,')
    lines.append('  constraint %s_id_municipality_key unique (id, municipality_id),' % t)
    if t in REF_OF:
        lines.append('  constraint %s_reference_key unique (municipality_id, reference),' % t)
    # composite keys to scoped parents (the 0113 tenant guard, as the ONLY key so
    # PostgREST sees one relationship per pair -- the register's 300 lesson)
    for (name, sqltype, nullable, ref, comment) in cols:
        if ref and ref.startswith('@') and ref != '@person':
            parent = ref[1:]
            lines.append('  constraint %s_%s_fkey foreign key (%s, municipality_id) references public.%s(id, municipality_id),' % (t, name, name, parent))
    # milestone: each code's columns are null on the other codes
    if t == 'khld_milestone_verification':
        for code, mcols in m.milestone_columns.items():
            others = [c[0] for c in cols if c[0] not in mcols]
            if others:
                lines.append("  constraint %s_%s_columns check (milestone_code <> %s or (%s)),"
                             % (t, code.lower().replace('-', '_'), q(code), ' and '.join('%s is null' % c for c in others)))
    lines[-1] = lines[-1].rstrip(',')
    lines.append(');')
    # indexes: every foreign key
    lines.append('create index %s_municipality_idx on public.%s (municipality_id);' % (t, t))
    lines.append('create index %s_created_by_idx on public.%s (created_by);' % (t, t))
    if t in PERSON_TABLES:
        lines.append('create index %s_person_idx on public.%s (person_id);' % (t, t))
    for (name, sqltype, nullable, ref, comment) in cols:
        if ref:
            lines.append('create index %s_%s_idx on public.%s (%s);' % (t, name, t, name))
    for (uname, expr, where) in UNIQUES.get(t, []):
        lines.append('create unique index %s on public.%s %s%s;' % (uname, t, expr, (' where ' + where) if where else ''))
    # column comments: the sheet's question
    for (name, sqltype, nullable, ref, comment) in cols:
        if comment:
            lines.append('comment on column public.%s.%s is %s;' % (t, name, q(comment)))
    # reference trigger
    if t in REF_OF:
        prefix, width, datecol = REF_OF[t]
        args = [q(prefix), q(str(width))] + ([q(c) for c in datecol.split(',')] if datecol else [])
        lines.append('create trigger trg_%s_reference before insert on public.%s' % (t, t))
        lines.append('  for each row execute function public.khld_assign_reference(%s);' % ', '.join(args))
    # "Other" guard for every select column that has a free-text companion
    triples = []
    names = [c[0] for c in cols]
    for (name, sqltype, nullable, ref, comment) in cols:
        if ref and not ref.startswith('@'):
            other = (name[:-3] if name.endswith('_id') else name) + '_other'
            if other in names:
                triples.append("'%s:ref_khld_%s:%s'" % (name, ref, other))
    if triples:
        lines.append('create trigger trg_%s_other before insert or update on public.%s' % (t, t))
        lines.append('  for each row execute function public.guard_rmth_other(\n    %s);' % ',\n    '.join(triples))
    # stamps: <col>_recorded_on / _recorded_by
    stamped = [n[:-len('_recorded_on')] for n in names if n.endswith('_recorded_on')]
    if stamped:
        # a select consent lives in <base>_id; the stamp columns are <base>_recorded_*
        args = [q(b if b in names else '%s_id:%s' % (b, b)) for b in stamped]
        lines.append('create trigger trg_%s_stamp before insert or update on public.%s' % (t, t))
        lines.append('  for each row execute function public.khld_stamp_recorded(%s);' % ', '.join(args))
    if t == 'khld_volunteer':
        lines.append('create trigger trg_khld_volunteer_guardian before insert or update on public.khld_volunteer')
        lines.append('  for each row execute function public.guard_khld_guardian();')
        lines.append("alter table public.khld_volunteer add constraint khld_volunteer_consent_data_given check (consent_data is true);")
        lines.append("alter table public.khld_volunteer add constraint khld_volunteer_safety_commitment_given check (safety_commitment is true);")
    if t == 'khld_guidance_completion':
        lines.append('create trigger trg_khld_guidance_completion_derive before insert or update on public.khld_guidance_completion')
        lines.append('  for each row execute function public.khld_derive_completion();')
    if t == 'khld_enterprise_support':
        lines.append('create trigger trg_khld_enterprise_support_derive before insert or update on public.khld_enterprise_support')
        lines.append('  for each row execute function public.khld_derive_support_types();')
    return '\n'.join(lines) + '\n'


def option_ddl(t):
    fk = FK[t]
    j = t + '_option'
    return '''create table public.%(j)s (
  %(fk)-16s uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  question_code    text not null,
  option_id        uuid not null,
  option_other     text,
  created_at       timestamptz not null default now(),
  primary key (%(fk)s, question_code, option_id),
  constraint %(j)s_%(fk)s_fkey foreign key (%(fk)s, municipality_id) references public.%(t)s(id, municipality_id)
);
create index %(j)s_municipality_idx on public.%(j)s (municipality_id);
create trigger trg_%(j)s_guard before insert or update on public.%(j)s
  for each row execute function public.guard_khld_option();
''' % dict(j=j, fk=fk, t=t)


def count_ddl(t):
    fk = FK[t]
    j = t + '_count'
    return '''create table public.%(j)s (
  %(fk)-16s uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  field_code       text not null,
  cell_id          uuid not null,
  count            int not null check (count >= 0),
  created_at       timestamptz not null default now(),
  primary key (%(fk)s, field_code, cell_id),
  constraint %(j)s_%(fk)s_fkey foreign key (%(fk)s, municipality_id) references public.%(t)s(id, municipality_id)
);
create index %(j)s_municipality_idx on public.%(j)s (municipality_id);
create trigger trg_%(j)s_guard before insert or update on public.%(j)s
  for each row execute function public.guard_khld_count();
''' % dict(j=j, fk=fk, t=t)


out = []
out.append("""-- ═══════════════════════════════════════════════════════════════════════════
--  0145 — Khalidiyah's domain tables: twenty-one forms onto twenty-one record
--         tables, three entities, and their children
--
--  GENERATED by supabase/khalidiyah/gen_0145.py from workbook.py (the one
--  reading of the sheets) and catalogue.py (the structure). Do not edit;
--  edit the catalogue and regenerate. Split across 0145, 0146 and 0147 only
--  because each is applied through the MCP as one pasted text: this file
--  carries the three small triggers and the first ten tables, 0146 the
--  other eleven, 0147 the milestone catalogue and rules, the checklist,
--  ratings and participations, the question map, RLS on every table and
--  the verification over all three. KHALIDIYAH_IMPLEMENTATION_PLAN.md
--  Parts 5 and 6; every sheet was read in full first (09_MULTI_MUNICIPALITY.md
--  Part 12 records what each one said).
--
--  ── ONE TABLE PER FORM, AND THREE ENTITIES ──
--
--  Each sheet's unit of observation is one row of one table, and every
--  sheet FIELD NAME is a column name (plan 5.2) -- except the compound
--  fields, which are split into the facts they name (period_covered ->
--  period_covered_from/_to; guardian_consent -> five columns; recorded_by
--  -> name, position, date), and the "by ..." counts, which are child rows
--  (khld_<table>_count, one per cell) never a column per cell and never
--  JSON. The rows and their sheet field are traceable both ways through
--  the column comments, which carry the sheet's question.
--
--  Three things the sheets refer to across forms are entities with a table
--  of their own: khld_partner (SO1-0 keys on one partner per year; SO1-A3
--  may name one), khld_enterprise (SO4-G1's owner, SO4-G2's record, SO4-H2's
--  optional link; issues KHLD-ENT-NNN), khld_vendor (SO4-H2's stable
--  KHLD-VEN-NNN across market days, the person behind it in `person`).
--  khld_volunteer IS the entity of SO3-F2 (KHLD-VOL-NNNN, one per person,
--  registered once, never per activity).
--
--  ── IDENTITY CLASSES (plan 5.1) ──
--
--  Only khld_volunteer, khld_guidance_completion (through the enterprise's
--  owner) and khld_vendor_registration (through the vendor) reach `person`,
--  and they reach it through khld_ensure_person (0144) with the identifier
--  type chosen on the form. The two anonymous surveys (IMP-0, SO2-0) and
--  the aggregate count sheet (SO2-D2) carry no person and no identifier;
--  their disaggregation lives on the row. The linked forms (SO3-0, SO4-0,
--  SO4-G2) reference an existing volunteer, vendor or enterprise and
--  collect nothing new.
--
--  ── STATUS AS AT THE ACTIVITY (plan 2.4, decision D4) ──
--
--  Nationality/status and disability are on Khalidiyah's OWN rows, as the
--  sheet asks them, at the time of the activity. Nothing here writes
--  person.is_refugee or person.nationality_id (OQ-55).
--
--  ── WHAT THE DATABASE DERIVES (plan 5.4) ──
--
--  sessions_attended_count and completion on khld_guidance_completion,
--  support_types_count on khld_enterprise_support, and the milestone
--  overall_status are worked out by trigger or function from the recorded
--  fields; save_khld_record (0148) refuses them from a client as
--  unknown_column, and a direct write is overwritten by the trigger.
--  activities_count and hours_total (SO3-0) are read from the participation
--  rows by the views and never stored.
--
--  ── UNIQUENESS (plan 5.10) ──
--
--  Entities are unique GLOBALLY, deleted rows included -- a volunteer per
--  person, a vendor per person, a partner per name -- so re-registering a
--  deactivated volunteer is a restore and never a second KHLD-VOL. Participa-
--  tions are unique only while live (a vendor at a market, an attendance
--  sheet per activity, a partner survey per round): a withdrawal is not a
--  ban. client_uuid stays globally unique everywhere.
--
--  ── CONSENTS (plan 5.5) ──
--
--  Every consent is its own column with its own recorded_on/recorded_by
--  stamp (khld_stamp_recorded): consent_data, consent_photo and
--  safety_commitment on the volunteer; consent_informed and photo_consent
--  on the attendance sheet; consent on the vendor registration. A photo
--  refusal beside a register consent is visible as two answers.
--
--  ── MINORS (plan 2.2) ──
--
--  trg_khld_volunteer_guardian (guard_khld_guardian, 0144) refuses a
--  volunteer under 18 on reg_date without the full guardian block. Minor
--  status is derived from person.date_of_birth, which the SO3-F2 form
--  requires; nothing stores it.
--
--  ── EVERY TABLE ──
--
--  municipality_id (default my_municipality(); the composite (id,
--  municipality_id) key; every link to a scoped parent is a COMPOSITE
--  foreign key and the ONLY key on that pair, so PostgREST sees one
--  relationship and never answers 300 -- the register's ninth-embed row),
--  the standard block, the four standard triggers, RLS with the
--  municipality gate on USING and WITH CHECK, client_uuid, an index on
--  every foreign key. Children are replaced by delete-then-insert and so
--  allow hard delete and carry a DELETE policy (the seventh register row);
--  khld_volunteer_participation is a record (withdrawal is audited), not a
--  junction.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. two small triggers the tables use ─────────────────────────────────

-- <col>_recorded_on / <col>_recorded_by follow the consent column named as
-- each argument: set when the answer arrives or changes, cleared when it
-- is cleared. rmth_stamp_decision's shape (0125) with the consent suffix.
create function public.khld_stamp_recorded()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_new  jsonb := to_jsonb(new);
  v_old  jsonb := '{}'::jsonb;
  v_col  text;
  v_base text;
  v_set  jsonb := '{}'::jsonb;
  i      int;
begin
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
  end if;
  for i in 0 .. tg_nargs - 1 loop
    -- "column" or "column:base": a select consent lives in <base>_id, its stamps in <base>_recorded_*
    v_col  := split_part(tg_argv[i], ':', 1);
    v_base := coalesce(nullif(split_part(tg_argv[i], ':', 2), ''), v_col);
    if (v_new -> v_col) is distinct from (v_old -> v_col) then
      if v_new -> v_col is null or jsonb_typeof(v_new -> v_col) = 'null' then
        v_set := v_set || jsonb_build_object(v_base || '_recorded_by', null, v_base || '_recorded_on', null);
      else
        v_set := v_set || jsonb_build_object(v_base || '_recorded_by', auth.uid(), v_base || '_recorded_on', now());
      end if;
    end if;
  end loop;
  if v_set <> '{}'::jsonb then
    new := jsonb_populate_record(new, v_set);
  end if;
  return new;
end $$;
revoke all on function public.khld_stamp_recorded() from public, anon, authenticated;

-- SO4-G1: "Total number of core sessions attended (out of 5)" and "Did the
-- owner meet the completion criteria (attendance at all applicable core
-- sessions)?" are typed `calculated` on the sheet. Three outcomes, like
-- met_criteria everywhere else: completed when every applicable core
-- session is attended; not_completed the moment one is recorded as not
-- attended; not_yet_decided while any applicable session has no answer.
-- Session 3 may be not applicable (non-food products) and then does not
-- count either way.
create function public.khld_derive_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_codes text[];
  v_attended int := 0;
  v_missed   int := 0;
  v_open     int := 0;
  v_code     text;
  v_ids      uuid[] := array[new.s1_status_id, new.s2_status_id, new.s3_status_id, new.s4_status_id, new.s5_status_id];
  v_id       uuid;
begin
  foreach v_id in array v_ids loop
    if v_id is null then
      v_open := v_open + 1;
      continue;
    end if;
    select code into v_code from public.ref_khld_session_attendance where id = v_id;
    if v_code is null then
      select code into v_code from public.ref_khld_g1_s3_hygiene where id = v_id;
    end if;
    if v_code = 'attended' then v_attended := v_attended + 1;
    elsif v_code = 'did_not_attend' then v_missed := v_missed + 1;
    elsif v_code = 'not_applicable' then null;
    else v_open := v_open + 1;
    end if;
  end loop;
  new.sessions_attended_count := v_attended;
  new.completion := case when v_missed > 0 then 'not_completed'
                         when v_open > 0 then 'not_yet_decided'
                         else 'completed' end;
  return new;
end $$;
revoke all on function public.khld_derive_completion() from public, anon, authenticated;

-- SO4-G2: "Total number of distinct types of support received" is typed
-- `calculated`; an enterprise with at least one type counts (plan 6).
create function public.khld_derive_support_types()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.support_types_count :=
      (new.sup_guidance is true)::int + (new.sup_licensing_info is true)::int
    + (exists (select 1 from public.ref_khld_g2_sup_hygiene h where h.id = new.sup_hygiene_id and h.code = 'yes'))::int
    + (new.sup_referral is true)::int + (new.sup_peer_network is true)::int + (new.sup_market_access is true)::int
    + (new.sup_inkind is true)::int + (new.sup_marketing is true)::int + (new.sup_site_visit is true)::int
    + (coalesce(btrim(new.sup_other), '') <> '')::int;
  return new;
end $$;
revoke all on function public.khld_derive_support_types() from public, anon, authenticated;

""")

# ── 0b. a list no sheet field selects from, needed by an entity column ────
for lname, mig in LISTS_ADDED_LATER.items():
    if mig != '0145':
        continue
    l = m.lists[lname]
    tbl = 'ref_khld_' + lname
    out.append("""-- ── %(tbl)s (%(used)s) ──
--
-- Not in 0141-0143: no sheet field is a select on this list -- SO1-0 shows
-- the partner type from the partner entity, and the entity's column is what
-- reads it. The same shape as every other ref_khld_ table (0141), the
-- sheet's options verbatim in both languages.
create table public.%(tbl)s (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  label_en         text not null,
  label_ar         text not null,
  sort_order       int  not null default 0,
  is_active        boolean not null default true,
  allows_free_text boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id),
  deleted_at       timestamptz
);
select public.attach_standard_triggers('%(tbl)s');
alter table public.%(tbl)s enable row level security;
create policy ref_read on public.%(tbl)s for select to authenticated using (true);
create policy ref_write on public.%(tbl)s for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());
insert into public.%(tbl)s (code, label_en, label_ar, sort_order, allows_free_text) values
%(rows)s;

""" % dict(tbl=tbl, used=', '.join(l.used_by),
           rows=',\n'.join('  (%s, %s, %s, %d, %s)' % (q(c), q(en), q(ar), i, 'true' if fr else 'false')
                            for i, (c, en, ar, fr) in enumerate(l.options, 1))))

# ── 1. the tables, in dependency order ────────────────────────────────────
for ti, t in enumerate(TABLES):
    if ti == 10:
        out.append('<<CUT>>')
    fid = FORM_OF.get(t)
    head = ('(%s, %s)' % (fid, m.forms[fid].code)) if fid else ('(entity)' if t in ENTITY_COLUMNS else '(SO1-A1, SO1-B1, SO3-E1, SO3-F1)')
    out.append('-- ── %s %s ──\n\n' % (t, head))
    out.append(table_ddl(t))
    if m.questions.get(t):
        out.append('\n')
        out.append(option_ddl(t))
    if m.count_fields.get(t):
        out.append('\n')
        out.append(count_ddl(t))
    out.append('\n')

# ── 2. the other children ─────────────────────────────────────────────────
out.append('<<CUT>>')
out.append("""-- ── the milestone catalogue: every item of the four checklists, from the sheet ──
--
-- Read by the checklist-item guard (so an item must exist on that
-- milestone and carry a status from ITS list) and by the rule validator (a
-- critical item must be a checklist row). field_type is the sheet's own
-- type, so a broken rule can be named: "item 4 is period_covered (text)".
create table public.khld_milestone_item (
  milestone_code   text not null check (milestone_code in ('SO1-A1', 'SO1-B1', 'SO3-E1', 'SO3-F1')),
  item_no          int  not null,
  field_code       text not null,
  field_type       text not null,
  list_name        text,
  label_en         text not null,
  label_ar         text not null,
  primary key (milestone_code, item_no),
  unique (milestone_code, field_code)
);
alter table public.khld_milestone_item enable row level security;
create policy khld_milestone_item_read on public.khld_milestone_item for select to authenticated using (true);
revoke insert, update, delete on public.khld_milestone_item from anon, authenticated;

""")
rows = []
for fid in ('a1', 'b1', 'e1', 'f1'):
    mcode = FORMS[fid]['milestone']
    form = m.forms[fid]
    items = {i[0]: i for i in m.checklist_items[mcode]}
    for f in form.fields:
        spec = spec_for(fid, f)
        ftype = 'checklist' if spec['kind'] == 'checklist' else f.ftype
        lst = items[f.no][2] if f.no in items else None
        rows.append('  (%s, %d, %s, %s, %s, %s, %s)' % (q(mcode), f.no, q(f.key), q(ftype), q(lst) if lst else 'null', q(f.q_en), q(f.q_ar)))
out.append('insert into public.khld_milestone_item (milestone_code, item_no, field_code, field_type, list_name, label_en, label_ar) values\n' + ',\n'.join(rows) + ';\n\n')

out.append("""-- ── the milestone rules: the sheet's critical items, as data ──
--
-- Plan Part 7: the numbers a rule names are DATA, validated at seed time
-- and on every change against the catalogue above. A rule whose numbers
-- do not all point at checklist rows cannot be stored, so SO1-A1 and
-- SO1-B1 are seeded with critical_items NULL and the source text kept:
-- their status reads not_computable and names the broken references
-- (khld_milestone_status, below). Deciding a rule is an UPDATE on this
-- row by a coordinator, never a migration -- the same shape as Ramtha's
-- thresholds (0123, OQ-47).
create table public.khld_milestone_rule (
  municipality_id  uuid not null references public.municipality(id) default public.my_municipality(),
  milestone_code   text not null check (milestone_code in ('SO1-A1', 'SO1-B1', 'SO3-E1', 'SO3-F1')),
  source_rule_en   text not null,
  source_rule_ar   text not null,
  source_items     int[] not null,
  critical_items   int[],
  decided_by       uuid references auth.users(id),
  decided_on       date,
  note_en          text,
  note_ar          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  primary key (municipality_id, milestone_code)
);
create index khld_milestone_rule_municipality_idx on public.khld_milestone_rule (municipality_id);
create index khld_milestone_rule_decided_by_idx on public.khld_milestone_rule (decided_by);

create function public.guard_khld_milestone_rule()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bad text;
begin
  if new.critical_items is null then
    return new;
  end if;
  if array_length(new.critical_items, 1) is null then
    raise exception 'critical_items must name at least one item or be null' using errcode = 'check_violation';
  end if;
  select string_agg(format('%s (%s, %s)', n, coalesce(i.field_code, 'no such item'), coalesce(i.field_type, '-')), ', ')
    into v_bad
    from unnest(new.critical_items) n
    left join public.khld_milestone_item i on i.milestone_code = new.milestone_code and i.item_no = n
   where i.field_type is distinct from 'checklist';
  if v_bad is not null then
    raise exception 'critical_items of % must all be checklist rows; not: %', new.milestone_code, v_bad
      using errcode = 'check_violation', constraint = 'khld_milestone_rule_items_are_checklist';
  end if;
  if tg_op = 'UPDATE' and new.critical_items is distinct from old.critical_items then
    new.decided_by := auth.uid();
    new.decided_on := current_date;
  end if;
  return new;
end $$;
revoke all on function public.guard_khld_milestone_rule() from public, anon, authenticated;
create trigger trg_khld_milestone_rule_guard before insert or update on public.khld_milestone_rule
  for each row execute function public.guard_khld_milestone_rule();

""")
RULES = {
    'a1': ('SO1-A1', [4, 7, 10, 11], None),
    'b1': ('SO1-B1', [3, 4, 6, 7, 8], None),
    'e1': ('SO3-E1', [5, 6, 8, 10], [5, 6, 8, 10]),
    'f1': ('SO3-F1', [3, 5, 7, 9], [3, 5, 7, 9]),
}
NOTES = {
    'SO1-A1': ("The sheet's rule names items 4, 7, 10 and 11. Item 4 is period_covered (text) and item 10 is stakeholder_updated (date); neither can be In place, so the rule cannot be evaluated as written and the status reads not computable. The notes column marks items 5, 8, 11 and 12 'Required for Established' — the rule's numbers plus one — and those four are the definition's four components. Not applied: a guess would put a milestone in a donor report. OQ-56.",
               "تسمّي القاعدة في الورقة البنود ٤ و٧ و١٠ و١١. البند ٤ هو period_covered (نص) والبند ١٠ هو stakeholder_updated (تاريخ)؛ ولا يمكن لأي منهما أن يكون «متوفر»، فلا يمكن تقييم القاعدة كما كُتبت وتُقرأ الحالة على أنها غير قابلة للاحتساب. تشير خانة الملاحظات إلى البنود ٥ و٨ و١١ و١٢ بعبارة «مطلوب لاعتبار الآلية منشأة». لم تُطبَّق: التخمين يضع إنجازاً مرحلياً في تقرير المانح. OQ-56."),
    'SO1-B1': ("The sheet's rule names items 3, 4, 6, 7 and 8. Item 4 is protocol_ref (text) and cannot be In place, so the rule cannot be evaluated as written. The notes column marks items 3, 5, 7, 8 and 10 'Required for Established'. Not applied. OQ-56.",
               "تسمّي القاعدة في الورقة البنود ٣ و٤ و٦ و٧ و٨. البند ٤ هو protocol_ref (نص) ولا يمكن أن يكون «متوفر»، فلا يمكن تقييم القاعدة كما كُتبت. تشير خانة الملاحظات إلى البنود ٣ و٥ و٧ و٨ و١٠. لم تُطبَّق. OQ-56."),
    'SO3-E1': ("Items 5, 6, 8 and 10 are all checklist rows, and the notes column marks exactly these four 'Required for Established'. Applied as written.",
               "البنود ٥ و٦ و٨ و١٠ جميعها صفوف قائمة تحقق، وتشير خانة الملاحظات إلى هذه الأربعة تحديداً. طُبِّقت كما كُتبت."),
    'SO3-F1': ("Items 3, 5, 7 and 9 are all checklist rows and the rule is applied as written. The notes column marks 3, 5, 8 and 10 'Required for Established' instead (roles_defined and coordination_procedure rather than registration_form and assignment_procedure), which is closer to the definition's three elements. Recorded for the M&E lead; changing it is an update of this row. OQ-56.",
               "البنود ٣ و٥ و٧ و٩ جميعها صفوف قائمة تحقق وطُبِّقت القاعدة كما كُتبت. تشير خانة الملاحظات إلى ٣ و٥ و٨ و١٠ بدلاً منها. مسجَّل لمسؤول المتابعة والتقييم؛ وتغييره تحديث لهذا الصف. OQ-56."),
}
rows = []
for fid, (mcode, src, crit) in RULES.items():
    form = m.forms[fid]
    calc_en, calc_ar = form.head['calculation']
    note_en, note_ar = NOTES[mcode]
    rows.append('  (%s, %s, %s, %s, array[%s]::int[], %s, %s, %s)' % (
        q(KHLD), q(mcode), q(calc_en), q(calc_ar), ', '.join(str(x) for x in src),
        ('array[%s]::int[]' % ', '.join(str(x) for x in crit)) if crit else 'null', q(note_en), q(note_ar)))
out.append('insert into public.khld_milestone_rule (municipality_id, milestone_code, source_rule_en, source_rule_ar, source_items, critical_items, note_en, note_ar) values\n' + ',\n'.join(rows) + ';\n\n')

out.append("""-- ── the checklist rows of a verification ──
create table public.khld_milestone_checklist_item (
  verification_id  uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  item_no          int  not null,
  field_code       text not null,
  status_id        uuid not null,
  detail           text,
  status_date      date,
  evidence_ref     text,
  created_at       timestamptz not null default now(),
  primary key (verification_id, item_no),
  constraint khld_milestone_checklist_item_verification_id_fkey foreign key (verification_id, municipality_id)
    references public.khld_milestone_verification(id, municipality_id)
);
create index khld_milestone_checklist_item_municipality_idx on public.khld_milestone_checklist_item (municipality_id);

create function public.guard_khld_checklist_item()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_item public.khld_milestone_item%rowtype;
  v_ok   boolean;
begin
  select milestone_code into v_code from public.khld_milestone_verification where id = new.verification_id;
  select * into v_item from public.khld_milestone_item i where i.milestone_code = v_code and i.item_no = new.item_no;
  if v_item.item_no is null or v_item.field_code <> new.field_code then
    raise exception 'item % (%) is not a row of the % checklist', new.item_no, new.field_code, v_code
      using errcode = 'check_violation';
  end if;
  if v_item.field_type <> 'checklist' then
    raise exception 'item % (%) of % is a % field, not a checklist row', new.item_no, new.field_code, v_code, v_item.field_type
      using errcode = 'check_violation';
  end if;
  execute format('select exists (select 1 from public.%I where id = $1 and deleted_at is null)', 'ref_khld_' || v_item.list_name)
    into v_ok using new.status_id;
  if not v_ok then
    raise exception 'status % is not a live row of ref_khld_%, the list for item % of %', new.status_id, v_item.list_name, new.item_no, v_code
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end $$;
revoke all on function public.guard_khld_checklist_item() from public, anon, authenticated;
create trigger trg_khld_milestone_checklist_item_guard before insert or update on public.khld_milestone_checklist_item
  for each row execute function public.guard_khld_checklist_item();

-- The status of one checklist item, read from its option's code prefix
-- (0141: in_place… / partly… / not_in_place / not_accepted).
create function public.khld_checklist_status(p_status_id uuid, p_list text)
returns text
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare v_code text;
begin
  execute format('select code from public.%I where id = $1', 'ref_khld_' || p_list) into v_code using p_status_id;
  return case when v_code like 'in_place%' then 'in_place'
              when v_code like 'partly%' then 'partly'
              when v_code like 'not_in_place%' then 'not_in_place'
              when v_code = 'not_accepted' then 'not_accepted'
              else null end;
end $$;
grant execute on function public.khld_checklist_status(uuid, text) to authenticated;

-- The milestone's overall status, from its rule and its checklist rows.
-- Plan 7.3: Established when every critical item is In place; Not
-- established when no critical item is In place or Partly in place;
-- Partly established otherwise; not_computable (with the reason) when the
-- rule cannot be evaluated or a critical item has no row yet.
create function public.khld_milestone_status(p_verification_id uuid)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_ver   public.khld_milestone_verification%rowtype;
  v_rule  public.khld_milestone_rule%rowtype;
  v_n     int;
  v_in    int := 0;
  v_part  int := 0;
  v_none  int := 0;
  v_miss  int[] := '{}';
  v_item  int;
  v_st    text;
  v_bad   text;
begin
  select * into v_ver from public.khld_milestone_verification where id = p_verification_id;
  if v_ver.id is null then
    return jsonb_build_object('status', 'not_computable', 'reason', 'not_found');
  end if;
  select * into v_rule from public.khld_milestone_rule r
   where r.municipality_id = v_ver.municipality_id and r.milestone_code = v_ver.milestone_code;
  if v_rule.milestone_code is null then
    return jsonb_build_object('status', 'not_computable', 'reason', 'no_rule');
  end if;
  if v_rule.critical_items is null then
    select string_agg(format('%s = %s (%s)', n, coalesce(i.field_code, '?'), coalesce(i.field_type, '?')), ', ' order by n)
      into v_bad
      from unnest(v_rule.source_items) n
      left join public.khld_milestone_item i on i.milestone_code = v_ver.milestone_code and i.item_no = n
     where i.field_type is distinct from 'checklist';
    return jsonb_build_object('status', 'not_computable', 'reason', 'rule_not_evaluable',
                              'source_items', to_jsonb(v_rule.source_items), 'broken', v_bad);
  end if;
  foreach v_item in array v_rule.critical_items loop
    select public.khld_checklist_status(c.status_id, i.list_name) into v_st
      from public.khld_milestone_checklist_item c
      join public.khld_milestone_item i on i.milestone_code = v_ver.milestone_code and i.item_no = c.item_no
     where c.verification_id = p_verification_id and c.item_no = v_item;
    if v_st is null then
      v_miss := v_miss || v_item;
    elsif v_st = 'in_place' then v_in := v_in + 1;
    elsif v_st = 'partly' then v_part := v_part + 1;
    else v_none := v_none + 1;
    end if;
  end loop;
  if array_length(v_miss, 1) is not null then
    return jsonb_build_object('status', 'not_computable', 'reason', 'items_missing', 'missing', to_jsonb(v_miss),
                              'critical_items', to_jsonb(v_rule.critical_items));
  end if;
  v_n := array_length(v_rule.critical_items, 1);
  return jsonb_build_object(
    'status', case when v_in = v_n then 'established'
                   when v_in = 0 and v_part = 0 then 'not_established'
                   else 'partly_established' end,
    'in_place', v_in, 'partly', v_part, 'not_in_place', v_none, 'critical_items', to_jsonb(v_rule.critical_items));
end $$;
grant execute on function public.khld_milestone_status(uuid) to authenticated;

-- ── SO2-0's facility ratings ──
create table public.khld_user_feedback_rating (
  feedback_id      uuid not null,
  municipality_id  uuid not null default public.my_municipality(),
  item_id          uuid not null references public.ref_khld_so20_facility_item(id),
  rating_id        uuid not null references public.ref_khld_so20_facility_rating(id),
  created_at       timestamptz not null default now(),
  primary key (feedback_id, item_id),
  constraint khld_user_feedback_rating_feedback_id_fkey foreign key (feedback_id, municipality_id)
    references public.khld_user_feedback(id, municipality_id)
);
create index khld_user_feedback_rating_municipality_idx on public.khld_user_feedback_rating (municipality_id);
create index khld_user_feedback_rating_item_idx on public.khld_user_feedback_rating (item_id);
create index khld_user_feedback_rating_rating_idx on public.khld_user_feedback_rating (rating_id);

-- ── a volunteer's participations ──
--
-- One row per volunteer per occasion: a campaign (SO2-C2), an action day
-- (SO3-F3), an activity supported, a market day supported, a committee
-- task or outreach (SO3-0's participation log names all six). The
-- occasions with a record link to it by composite key; the others carry
-- the sheet's reference text. SO3-0 counts a volunteer with two or more
-- VERIFIED participations; SO3-F2 counts a volunteer with at least one.
create table public.khld_volunteer_participation (
  id               uuid primary key default gen_random_uuid(),
  municipality_id  uuid not null references public.municipality(id) default public.my_municipality(),
  volunteer_id     uuid not null,
  kind             text not null check (kind in ('campaign', 'action_day', 'activity', 'market', 'committee', 'outreach')),
  campaign_id      uuid,
  action_day_id    uuid,
  activity_id      uuid,
  market_id        uuid,
  participated_on  date not null,
  hours            numeric(6,2) check (hours is null or hours >= 0),
  verified         boolean not null default false,
  reference_text   text,
  notes            text,
  client_uuid      uuid unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) default auth.uid(),
  deleted_at       timestamptz,
  constraint khld_volunteer_participation_id_municipality_key unique (id, municipality_id),
  constraint khld_volunteer_participation_volunteer_id_fkey foreign key (volunteer_id, municipality_id) references public.khld_volunteer(id, municipality_id),
  constraint khld_volunteer_participation_campaign_id_fkey foreign key (campaign_id, municipality_id) references public.khld_campaign(id, municipality_id),
  constraint khld_volunteer_participation_action_day_id_fkey foreign key (action_day_id, municipality_id) references public.khld_action_day(id, municipality_id),
  constraint khld_volunteer_participation_activity_id_fkey foreign key (activity_id, municipality_id) references public.khld_activity(id, municipality_id),
  constraint khld_volunteer_participation_market_id_fkey foreign key (market_id, municipality_id) references public.khld_market(id, municipality_id),
  constraint khld_volunteer_participation_kind_link check (
    (kind = 'campaign'   and campaign_id   is not null and action_day_id is null and activity_id is null and market_id is null) or
    (kind = 'action_day' and action_day_id is not null and campaign_id   is null and activity_id is null and market_id is null) or
    (kind = 'activity'   and activity_id   is not null and campaign_id   is null and action_day_id is null and market_id is null) or
    (kind = 'market'     and market_id     is not null and campaign_id   is null and action_day_id is null and activity_id is null) or
    (kind in ('committee', 'outreach') and campaign_id is null and action_day_id is null and activity_id is null and market_id is null))
);
create index khld_volunteer_participation_municipality_idx on public.khld_volunteer_participation (municipality_id);
create index khld_volunteer_participation_volunteer_idx on public.khld_volunteer_participation (volunteer_id);
create index khld_volunteer_participation_campaign_idx on public.khld_volunteer_participation (campaign_id);
create index khld_volunteer_participation_action_day_idx on public.khld_volunteer_participation (action_day_id);
create index khld_volunteer_participation_activity_idx on public.khld_volunteer_participation (activity_id);
create index khld_volunteer_participation_market_idx on public.khld_volunteer_participation (market_id);
create index khld_volunteer_participation_created_by_idx on public.khld_volunteer_participation (created_by);
-- one participation per volunteer per occasion, while live (plan 5.10)
create unique index khld_volunteer_participation_campaign_live on public.khld_volunteer_participation (volunteer_id, campaign_id) where deleted_at is null and campaign_id is not null;
create unique index khld_volunteer_participation_action_day_live on public.khld_volunteer_participation (volunteer_id, action_day_id) where deleted_at is null and action_day_id is not null;
create unique index khld_volunteer_participation_activity_live on public.khld_volunteer_participation (volunteer_id, activity_id) where deleted_at is null and activity_id is not null;
create unique index khld_volunteer_participation_market_live on public.khld_volunteer_participation (volunteer_id, market_id) where deleted_at is null and market_id is not null;

""")

# ── 2b. corrections to the applied lists, and SO2-D2's derived figures ────
fixes = []
for (lst, code), fix in LIST_FIXES.items():
    if fix.get('migration') == '0145':
        fixes.append("-- %s\nupdate public.ref_khld_%s set allows_free_text = %s where code = %s;\n"
                     % (fix['why'], lst, 'true' if fix['allows_free_text'] else 'false', q(code)))
out.append("""-- ── a correction to one applied list row (catalogue.LIST_FIXES) ──
--
-- 0142 seeded ref_khld_d2_duplicate_check.yes with allows_free_text = true,
-- read off the blank in "Yes — number of repeat participants identified:
-- ____". The blank is a NUMBER -- the one the distinct-individuals figure
-- subtracts -- so it has its own column (khld_attendance.repeat_participants)
-- and the option takes no free text. gen_0141 still reproduces 0142 as
-- applied; this is the row's later state, and the form reads it from here.
""" + ''.join(fixes) + "\n")

out.append("""-- ── SO2-D2: reconciliation and distinct individuals, computed, never stored ──
--
-- "Do the entrance tally, the register and the section B totals agree?" is
-- typed text on the sheet with a Yes/No; here it is worked out from the
-- rows: the by-sex cells must sum to the total, and the by-age-and-sex
-- cells, when any are given, must too. "Distinct individuals ... where the
-- register allows" is total minus the repeat participants identified, and
-- only when duplicate_check says the register WAS checked; otherwise it is
-- not available, never estimated (plan Part 6).
create function public.khld_attendance_figures(p_attendance_id uuid)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  with a as (select * from public.khld_attendance where id = p_attendance_id),
       s as (select coalesce(sum(c.count), 0) as n, count(*) as cells
               from public.khld_attendance_count c where c.attendance_id = p_attendance_id and c.field_code = 'by_sex'),
       g as (select coalesce(sum(c.count), 0) as n, count(*) as cells
               from public.khld_attendance_count c where c.attendance_id = p_attendance_id and c.field_code = 'by_age_sex'),
       d as (select dc.code from a join public.ref_khld_d2_duplicate_check dc on dc.id = a.duplicate_check_id)
  select jsonb_build_object(
    'total', a.total_participants,
    'by_sex_sum', s.n,
    'by_age_sex_sum', case when g.cells > 0 then g.n end,
    'agrees', (s.cells = 0 or s.n = a.total_participants) and (g.cells = 0 or g.n = a.total_participants),
    'distinct_individuals', case when (select code from d) = 'yes' and a.repeat_participants is not null
                                 then greatest(a.total_participants - a.repeat_participants, 0) end,
    'distinct_reason', case when (select code from d) = 'yes' and a.repeat_participants is not null then null
                            when (select code from d) = 'yes' then 'repeat_count_missing'
                            else coalesce((select code from d), 'not_checked') end)
    from a, s, g;
$$;
grant execute on function public.khld_attendance_figures(uuid) to authenticated;

""")

# ── 2b. the milestone children carry their milestone in the code ──────────
out.append("""-- ── the milestone's option and count rows name their milestone ──
--
-- Four forms share khld_milestone_verification, and khld_question_list is
-- keyed on (table, question_code): evidence_attached alone would name four
-- lists. So on this table the code carries the form id (a1_, b1_, e1_,
-- f1_), which is what the question map below stores, and this guard
-- requires the prefix to be the PARENT's milestone -- an a1_ option on an
-- SO3-F1 verification is a row of another checklist, not an answer.
create function public.guard_khld_milestone_child()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code   text;
  v_prefix text;
  v_qcode  text := coalesce(to_jsonb(new)->>'question_code', to_jsonb(new)->>'field_code');
begin
  select milestone_code into v_code from public.khld_milestone_verification where id = new.verification_id;
  v_prefix := lower(split_part(v_code, '-', 2)) || '_';
  if v_code is null or left(v_qcode, length(v_prefix)) <> v_prefix then
    raise exception '% is not a question of % (the code must start with %)', v_qcode, coalesce(v_code, 'a missing verification'), v_prefix
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.guard_khld_milestone_child() from public, anon, authenticated;
create trigger trg_khld_milestone_verification_option_milestone before insert or update on public.khld_milestone_verification_option
  for each row execute function public.guard_khld_milestone_child();
create trigger trg_khld_milestone_verification_count_milestone before insert or update on public.khld_milestone_verification_count
  for each row execute function public.guard_khld_milestone_child();

""")

# ── 3. the question -> list map ───────────────────────────────────────────
rows = []
for t in TABLES:
    for (qc, lst, mcode) in m.questions.get(t, []):
        rows.append('  (%s, %s, %s, %s)' % (q(t + '_option'), q(qc), q(lst), q('option')))
    for (fc, lst, mcode) in m.count_fields.get(t, []):
        rows.append('  (%s, %s, %s, %s)' % (q(t + '_count'), q(fc), q(lst), q('count')))
out.append('-- ── the question -> list map the two guards read (0144) ──\ninsert into public.khld_question_list (table_name, question_code, list_name, kind) values\n' + ',\n'.join(rows) + ';\n\n')

# ── 4. triggers, RLS ──────────────────────────────────────────────────────
record_tables = list(TABLES) + ['khld_volunteer_participation']
child_tables = []
for t in TABLES:
    if m.questions.get(t):
        child_tables.append((t + '_option', WRITER[t]))
    if m.count_fields.get(t):
        child_tables.append((t + '_count', WRITER[t]))
child_tables += [('khld_milestone_checklist_item', 'can_write'), ('khld_user_feedback_rating', 'is_staff')]
n_record = len(record_tables)
n_child = len(child_tables)

out.append("""-- ── the four standard triggers, RLS, and the DELETE policy on the children ──
do $secure$
declare
  r record;
  v_writer text;
begin
  for r in
    select * from (values
""")
vals = []
for t in record_tables:
    vals.append("      (%s, %s, false)" % (q(t), q(WRITER.get(t, 'can_write'))))
for (t, w) in child_tables:
    vals.append("      (%s, %s, true)" % (q(t), q(w)))
out.append(',\n'.join(vals))
out.append("""
    ) as t(tbl, writer, is_child)
  loop
    v_writer := format('public.%I()', r.writer);

    if r.is_child then
      -- children: replaced by delete-then-insert; audit only, hard delete allowed
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

  -- the rule table: read by everyone who sees the municipality, decided by a coordinator
  perform public.attach_standard_triggers('khld_milestone_rule');
  execute 'alter table public.khld_milestone_rule enable row level security';
  execute 'create policy khld_milestone_rule_read on public.khld_milestone_rule for select to authenticated using (public.can_see_municipality(municipality_id))';
  execute 'create policy khld_milestone_rule_update on public.khld_milestone_rule for update to authenticated using (public.is_coordinator() and public.can_see_municipality(municipality_id)) with check (public.is_coordinator() and public.can_see_municipality(municipality_id))';
end $secure$;

""")

# ── 5. verification ───────────────────────────────────────────────────────
out.append("""-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_bad   int;
  v_khld  uuid := '%(khld)s';
  v_shm   uuid := '00000000-0000-4000-8000-00000000005a';
  v_ok    boolean;
  v_id    uuid;
  v_p     uuid;
  v_vol   uuid;
  v_act   uuid;
  v_st    jsonb;
begin
  -- 1. shape: %(n_tables)d tables carrying municipality_id, RLS on and a read policy on each,
  --    a DELETE policy on exactly the %(n_child)d children, every FK indexed
  select count(*) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'khld\\_%%'
     and c.relname not in ('khld_reference_counter', 'khld_question_list', 'khld_milestone_item');
  if v_bad <> %(n_tables)d then
    raise exception '0145: expected %(n_tables)d khld tables, found %%', v_bad;
  end if;
  select count(*) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'khld\\_%%'
     and c.relname not in ('khld_reference_counter', 'khld_question_list', 'khld_milestone_item')
     and (not c.relrowsecurity
          or not exists (select 1 from pg_policy p where p.polrelid = c.oid and p.polcmd = 'r'));
  if v_bad <> 0 then
    raise exception '0145: %% tables lack RLS or a read policy', v_bad;
  end if;
  select count(*) into v_bad from pg_policy p join pg_class c on c.oid = p.polrelid
   where p.polcmd = 'd' and c.relname like 'khld\\_%%';
  if v_bad <> %(n_child)d then
    raise exception '0145: expected %(n_child)d DELETE policies (the children), found %%', v_bad;
  end if;
  select count(*) into v_bad
    from pg_constraint k join pg_class c on c.oid = k.conrelid
   where k.contype = 'f' and c.relname like 'khld\\_%%'
     and not exists (select 1 from pg_index i
                      where i.indrelid = k.conrelid and i.indkey[0] = k.conkey[1]);
  if v_bad <> 0 then
    raise exception '0145: %% foreign keys have no index on their first column', v_bad;
  end if;
  -- every soft-deletable khld table has the soft-delete guard and the no-hard-delete guard
  select count(*) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'khld\\_%%'
     and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'deleted_at' and not a.attisdropped)
     and (not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'trg_' || c.relname || '_soft_delete')
          or not exists (select 1 from pg_trigger t where t.tgrelid = c.oid and t.tgname = 'trg_' || c.relname || '_no_hard_delete'));
  if v_bad <> 0 then
    raise exception '0145: %% soft-deletable tables lack a guard', v_bad;
  end if;

  -- 2. the rules: the two broken ones refuse their source numbers; the two
  --    valid ones hold them
  begin
    update public.khld_milestone_rule set critical_items = source_items where milestone_code = 'SO1-A1';
    raise exception '0145: SO1-A1 accepted items 4, 7, 10, 11';
  exception when check_violation then null; end;
  begin
    update public.khld_milestone_rule set critical_items = source_items where milestone_code = 'SO1-B1';
    raise exception '0145: SO1-B1 accepted items 3, 4, 6, 7, 8';
  exception when check_violation then null; end;
  if (select critical_items from public.khld_milestone_rule where milestone_code = 'SO3-E1') <> array[5,6,8,10]
     or (select critical_items from public.khld_milestone_rule where milestone_code = 'SO3-F1') <> array[3,5,7,9] then
    raise exception '0145: the valid rules were not seeded';
  end if;

  -- 3. behaviour, as the owner, in a discarded savepoint: a milestone whose
  --    rule is broken reads not_computable naming the fields; SO3-F1
  --    computes; a checklist row with the wrong list is refused; a minor
  --    without a guardian is refused and with one is accepted; the
  --    completion derivation has three outcomes; a reference is issued
  begin
    insert into public.khld_milestone_verification (municipality_id, milestone_code, verif_date, verif_by, gaps)
    values (v_khld, 'SO1-A1', current_date, 'probe', 'probe') returning id into v_id;
    v_st := public.khld_milestone_status(v_id);
    if v_st->>'status' <> 'not_computable' or v_st->>'reason' <> 'rule_not_evaluable' or v_st->>'broken' !~ 'period_covered' then
      raise exception '0145: SO1-A1 status came back as %%', v_st;
    end if;

    insert into public.khld_milestone_verification (municipality_id, milestone_code, verif_date, verif_by, gaps)
    values (v_khld, 'SO3-F1', current_date, 'probe', 'probe') returning id into v_id;
    if (public.khld_milestone_status(v_id))->>'reason' <> 'items_missing' then
      raise exception '0145: SO3-F1 with no rows should be items_missing';
    end if;
    insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
    select v_id, v_khld, 3, 'procedures_approved', id from public.ref_khld_f1_procedures_approved where code = 'in_place_decision_no_and_date';
    insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
    select v_id, v_khld, 5, 'database_established', id from public.ref_khld_f1_database_established where code = 'in_place';
    insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
    select v_id, v_khld, 7, 'registration_form', id from public.ref_khld_checklist_status where code = 'in_place';
    insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
    select v_id, v_khld, 9, 'assignment_procedure', id from public.ref_khld_checklist_status where code = 'partly';
    if (public.khld_milestone_status(v_id))->>'status' <> 'partly_established' then
      raise exception '0145: SO3-F1 with three In place and one Partly should be partly_established, got %%', public.khld_milestone_status(v_id);
    end if;
    update public.khld_milestone_checklist_item set status_id = (select id from public.ref_khld_checklist_status where code = 'in_place')
     where verification_id = v_id and item_no = 9;
    if (public.khld_milestone_status(v_id))->>'status' <> 'established' then
      raise exception '0145: SO3-F1 with four In place should be established';
    end if;
    begin
      insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
      select v_id, v_khld, 4, 'launch_date', id from public.ref_khld_checklist_status where code = 'in_place';
      raise exception '0145: a date field was accepted as a checklist row';
    exception when check_violation then null; end;
    begin
      insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id)
      select v_id, v_khld, 8, 'roles_defined', id from public.ref_khld_a1_periodic_updates where code = 'in_place_regularly';
      raise exception '0145: a status from another item''s list was accepted';
    exception when foreign_key_violation then null; end;
    -- an option of another milestone's checklist is refused on this one; its own is taken
    begin
      insert into public.khld_milestone_verification_option (verification_id, municipality_id, question_code, option_id)
      select v_id, v_khld, 'a1_evidence_attached', id from public.ref_khld_a1_evidence_attached where not allows_free_text limit 1;
      raise exception '0145: an SO1-A1 option was accepted on an SO3-F1 verification';
    exception when check_violation then null; end;
    begin
      insert into public.khld_milestone_verification_count (verification_id, municipality_id, field_code, cell_id, count)
      select v_id, v_khld, 'a1_stakeholder_count', id, 1 from public.ref_khld_a1_stakeholder_count limit 1;
      raise exception '0145: an SO1-A1 count was accepted on an SO3-F1 verification';
    exception when check_violation then null; end;
    insert into public.khld_milestone_verification_option (verification_id, municipality_id, question_code, option_id)
    select v_id, v_khld, 'f1_evidence_attached', id from public.ref_khld_f1_evidence_attached where not allows_free_text limit 1;
    if not exists (select 1 from public.khld_milestone_verification_option where verification_id = v_id) then
      raise exception '0145: the SO3-F1 option was not written';
    end if;

    -- a minor: refused without the guardian block, accepted with it, the
    -- reference issued, the consents stamped, the data consent mandatory
    insert into public.person (national_id, full_name, date_of_birth) values ('399000997', '0145 probe child', current_date - interval '12 years')
    returning id into v_p;
    begin
      insert into public.khld_volunteer (municipality_id, person_id, reg_date, reg_channel_id, nationality_id, disability_id, neighbourhood_id,
                                         affiliation_id, transport_id, consent_data, consent_photo, safety_commitment)
      select v_khld, v_p, current_date, (select id from public.ref_khld_f2_reg_channel where code = 'at_the_municipality'),
             (select id from public.ref_khld_nationality where code = 'jordanian'), (select id from public.ref_khld_disability where code = 'no_difficulty'),
             (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'), (select id from public.ref_khld_f2_affiliation where code = 'none_individual_volunteer'),
             (select id from public.ref_khld_f2_transport where code = 'yes'), true, false, true;
      raise exception '0145: a twelve-year-old was registered without a guardian';
    exception when check_violation then null; end;
    insert into public.khld_volunteer (municipality_id, person_id, reg_date, reg_channel_id, nationality_id, disability_id, neighbourhood_id,
                                       affiliation_id, transport_id, consent_data, consent_photo, safety_commitment,
                                       guardian_name, guardian_relationship, guardian_phone, guardian_consent_given, guardian_consent_date)
    select v_khld, v_p, current_date, (select id from public.ref_khld_f2_reg_channel where code = 'at_the_municipality'),
           (select id from public.ref_khld_nationality where code = 'jordanian'), (select id from public.ref_khld_disability where code = 'no_difficulty'),
           (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'), (select id from public.ref_khld_f2_affiliation where code = 'none_individual_volunteer'),
           (select id from public.ref_khld_f2_transport where code = 'yes'), true, false, true,
           'A guardian', 'mother', '0790000000', true, current_date
    returning id into v_vol;
    if (select reference from public.khld_volunteer where id = v_vol) !~ '^KHLD-VOL-\\d{4}$' then
      raise exception '0145: the volunteer reference is %%', (select reference from public.khld_volunteer where id = v_vol);
    end if;
    if (select consent_photo_recorded_on from public.khld_volunteer where id = v_vol) is null
       or (select consent_data_recorded_on from public.khld_volunteer where id = v_vol) is null then
      raise exception '0145: the consents were not stamped';
    end if;
    begin
      update public.khld_volunteer set consent_data = false where id = v_vol;
      raise exception '0145: registration without data consent was accepted';
    exception when check_violation then null; end;
    -- a second registration of the same person is refused, deleted or not
    -- (plan 5.10). The soft delete is a coordinator's act (guard_soft_delete),
    -- so it is done as the Khalidiyah admin, through RLS, and read back:
    -- an update RLS filters affects no row and raises nothing
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@khalidiyah.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    update public.khld_volunteer set deleted_at = now() where id = v_vol;
    reset role;
    perform set_config('request.jwt.claims', '', true);
    if (select deleted_at from public.khld_volunteer where id = v_vol) is null then
      raise exception '0145: the Khalidiyah admin could not soft-delete a volunteer';
    end if;
    begin
      insert into public.khld_volunteer (municipality_id, person_id, reg_date, reg_channel_id, nationality_id, disability_id, neighbourhood_id,
                                         affiliation_id, transport_id, consent_data, consent_photo, safety_commitment,
                                         guardian_name, guardian_relationship, guardian_phone, guardian_consent_given, guardian_consent_date)
      select v_khld, v_p, current_date, reg_channel_id, nationality_id, disability_id, neighbourhood_id, affiliation_id, transport_id,
             true, false, true, guardian_name, guardian_relationship, guardian_phone, true, current_date
        from public.khld_volunteer where id = v_vol;
      raise exception '0145: a deleted volunteer was recreated instead of restored';
    exception when unique_violation then null; end;

    -- the completion derivation: three outcomes, and a client value overwritten
    insert into public.khld_enterprise (municipality_id, owner_name) values (v_khld, '0145 probe enterprise') returning id into v_id;
    if (select reference from public.khld_enterprise where id = v_id) !~ '^KHLD-ENT-\\d{3}$' then
      raise exception '0145: the enterprise reference is wrong';
    end if;
    insert into public.khld_guidance_completion (municipality_id, enterprise_id, cycle_year, age_group_id, nationality_id, enterprise_status_id,
                                                 peer_network_id, non_completion_reason_id, referral_made_id, certificate_id,
                                                 s1_status_id, s2_status_id, s3_status_id, s4_status_id, s5_status_id)
    select v_khld, v_id, (select id from public.ref_khld_g1_cycle_year where code = 'n_2027'),
           (select id from public.ref_khld_age_group where code = '35_49'),
           (select id from public.ref_khld_nationality where code = 'jordanian'),
           (select id from public.ref_khld_g1_enterprise_status where code = 'operating_and_licensed'),
           (select id from public.ref_khld_g1_peer_network where code = 'no'),
           (select id from public.ref_khld_g1_non_completion_reason where code = 'not_applicable_completed'),
           (select id from public.ref_khld_g1_referral_made where code = 'no'),
           (select id from public.ref_khld_g1_certificate where code = 'due_but_not_yet_issued'),
           (select id from public.ref_khld_session_attendance where code = 'attended'),
           (select id from public.ref_khld_session_attendance where code = 'attended'),
           (select id from public.ref_khld_g1_s3_hygiene where code = 'not_applicable'),
           (select id from public.ref_khld_session_attendance where code = 'attended'),
           null
    returning id into v_act;
    if (select completion from public.khld_guidance_completion where id = v_act) <> 'not_yet_decided'
       or (select sessions_attended_count from public.khld_guidance_completion where id = v_act) <> 3 then
      raise exception '0145: completion with one session open should be not_yet_decided / 3';
    end if;
    update public.khld_guidance_completion set s5_status_id = (select id from public.ref_khld_session_attendance where code = 'attended') where id = v_act;
    if (select completion from public.khld_guidance_completion where id = v_act) <> 'completed' then
      raise exception '0145: completion with every applicable session attended should be completed';
    end if;
    update public.khld_guidance_completion set s2_status_id = (select id from public.ref_khld_session_attendance where code = 'did_not_attend') where id = v_act;
    if (select completion from public.khld_guidance_completion where id = v_act) <> 'not_completed' then
      raise exception '0145: completion with a missed session should be not_completed';
    end if;
    update public.khld_guidance_completion set completion = 'completed' where id = v_act;
    if (select completion from public.khld_guidance_completion where id = v_act) <> 'not_completed' then
      raise exception '0145: a client value for completion survived the trigger';
    end if;

    -- an activity, its attendance sheet, the count cells and the derived figures
    insert into public.khld_activity (municipality_id, event_title, event_date, location_id, activity_type_id, calendar_status_id, frequency_type_id,
                                      organiser_id, partner_count, content_summary, participants_planned, participants_actual,
                                      cash_cost_jod, feedback_collected_id, lessons)
    select v_khld, '0145 probe activity', current_date, (select id from public.ref_khld_d1_location where code = 'sports_field'),
           (select id from public.ref_khld_d1_activity_type where code = 'sports_activity_or_tournament'),
           (select id from public.ref_khld_d1_calendar_status where code = 'no_ad_hoc_or_one_off'),
           (select id from public.ref_khld_d1_frequency_type where code = 'one_off'),
           (select id from public.ref_khld_d1_organiser where code = 'municipality_alone'), 0, 'probe', 10, 12,
           0, (select id from public.ref_khld_d1_feedback_collected where code = 'no'), 'probe'
    returning id into v_act;
    if (select reference from public.khld_activity where id = v_act) !~ '^KHLD-EV-\\d{4}-\\d{2}$' then
      raise exception '0145: the activity reference is wrong';
    end if;
    insert into public.khld_attendance (municipality_id, activity_id, count_method_id, counters, total_participants, repeat_participants, staff_volunteers,
                                        register_attached_id, consent_informed_id, photo_consent_id, duplicate_check_id)
    select v_khld, v_act, (select id from public.ref_khld_d2_count_method where code = 'tally_by_activity_station'), 'probe', 12, 2, 0,
           (select id from public.ref_khld_d2_register_attached where code = 'partly'),
           (select id from public.ref_khld_d2_consent_informed where code = 'no'),
           (select id from public.ref_khld_d2_photo_consent where code = 'no_photographs_taken'),
           (select id from public.ref_khld_d2_duplicate_check where code = 'yes')
    returning id into v_id;
    insert into public.khld_attendance_count (attendance_id, municipality_id, field_code, cell_id, count)
    select v_id, v_khld, 'by_sex', c.id, case c.code when 'female' then 7 when 'male' then 5 else 0 end
      from public.ref_khld_d2_by_sex c;
    v_st := public.khld_attendance_figures(v_id);
    if (v_st->>'agrees')::boolean is not true or (v_st->>'distinct_individuals')::int <> 10 then
      raise exception '0145: attendance figures came back as %%', v_st;
    end if;
    update public.khld_attendance_count set count = 6 where attendance_id = v_id and field_code = 'by_sex'
       and cell_id = (select id from public.ref_khld_d2_by_sex where code = 'male');
    if ((public.khld_attendance_figures(v_id))->>'agrees')::boolean is not false then
      raise exception '0145: a by-sex sum of 13 against a total of 12 should not agree';
    end if;
    update public.khld_attendance set duplicate_check_id = (select id from public.ref_khld_d2_duplicate_check where code = 'not_yet') where id = v_id;
    if (public.khld_attendance_figures(v_id))->'distinct_individuals' is distinct from 'null'::jsonb then
      raise exception '0145: distinct individuals should be unavailable when the register was not checked';
    end if;
    -- a cell from the wrong list, and a field that is not a count field, are refused
    begin
      insert into public.khld_attendance_count (attendance_id, municipality_id, field_code, cell_id, count)
      select v_id, v_khld, 'by_sex', id, 1 from public.ref_khld_d2_by_nationality where code = 'other';
      raise exception '0145: a cell from another list was accepted';
    exception when foreign_key_violation then null; end;
    begin
      insert into public.khld_attendance_count (attendance_id, municipality_id, field_code, cell_id, count)
      select v_id, v_khld, 'total_participants', id, 1 from public.ref_khld_d2_by_sex where code = 'female';
      raise exception '0145: a non-count field was accepted as a count';
    exception when check_violation then null; end;
    -- a second live attendance sheet for the same activity is refused; a deleted one is not in the way
    begin
      insert into public.khld_attendance (municipality_id, activity_id, count_method_id, counters, total_participants, staff_volunteers,
                                          register_attached_id, consent_informed_id, photo_consent_id, duplicate_check_id)
      select v_khld, v_act, count_method_id, counters, 1, 0, register_attached_id, consent_informed_id, photo_consent_id, duplicate_check_id
        from public.khld_attendance where id = v_id;
      raise exception '0145: two live attendance sheets on one activity were accepted';
    exception when unique_violation then null; end;

    -- a child in another municipality than its parent is refused by the
    -- composite key. Probed on an option row, not a second attendance sheet:
    -- the sheet's per-activity unique index answers before the key does
    begin
      insert into public.khld_activity_option (activity_id, municipality_id, question_code, option_id)
      select v_act, v_shm, 'issues', id from public.ref_khld_d1_issues where not allows_free_text limit 1;
      raise exception '0145: a child in another municipality than its parent was accepted';
    exception when foreign_key_violation then null; end;

    -- an option on the wrong table, and an "Other" with nothing specified, are refused
    begin
      insert into public.khld_activity_option (activity_id, municipality_id, question_code, option_id)
      select v_act, v_khld, 'focus', id from public.ref_khld_c2_focus where code = 'minor_repairs';
      raise exception '0145: a campaign question was accepted on an activity';
    exception when check_violation then null; end;
    begin
      insert into public.khld_activity_option (activity_id, municipality_id, question_code, option_id)
      select v_act, v_khld, 'issues', id from public.ref_khld_d1_issues where code = 'other';
      raise exception '0145: Other without its text was accepted';
    exception when check_violation then null; end;
    insert into public.khld_activity_option (activity_id, municipality_id, question_code, option_id, option_other)
    select v_act, v_khld, 'issues', id, 'the probe' from public.ref_khld_d1_issues where code = 'other';
    raise exception using errcode = 'P0145', message = 'rollback the probe';
  exception
    when sqlstate 'P0145' then null;
  end;
  if exists (select 1 from public.person where national_id = '399000997')
     or exists (select 1 from public.khld_milestone_verification) or exists (select 1 from public.khld_volunteer)
     or exists (select 1 from public.khld_enterprise) or exists (select 1 from public.khld_activity)
     or exists (select 1 from public.khld_attendance) or exists (select 1 from public.khld_reference_counter) then
    raise exception '0145: probe rows survived the rollback';
  end if;
end $verify$;
""" % dict(khld=KHLD, n_tables=n_record + n_child + 1, n_child=n_child))

# Three files only because each is applied through the MCP as one pasted
# text: 0145 carries the header, the three small triggers and the first ten
# tables; 0146 the other eleven; 0147 the milestone catalogue and rules, the
# checklist, ratings and participations, the question map, RLS on every
# table, and the verification over all of it.
parts = ''.join(out).split('<<CUT>>')
assert len(parts) == 3
parts[1] = """-- ═══════════════════════════════════════════════════════════════════════════
--  0146 — Khalidiyah's domain tables, second part: the other eleven tables
--
--  0145 says why and how; this file continues it. Generated by
--  supabase/khalidiyah/gen_0145.py; do not edit by hand. Verified in 0147.
-- ═══════════════════════════════════════════════════════════════════════════

""" + parts[1]
parts[2] = """-- ═══════════════════════════════════════════════════════════════════════════
--  0147 — Khalidiyah's domain tables, last part: the milestone catalogue and
--         rules, the checklist rows, the ratings, the participations, the
--         question map, RLS and the standard triggers on every table, and
--         the verification over 0145-0147
--
--  0145 says why and how. Generated by supabase/khalidiyah/gen_0145.py; do
--  not edit by hand.
-- ═══════════════════════════════════════════════════════════════════════════

""" + parts[2]
for nnnn, name, text in (('0145', 'khalidiyah_domain_tables', parts[0]),
                         ('0146', 'khalidiyah_domain_tables_2', parts[1]),
                         ('0147', 'khalidiyah_domain_tables_3', parts[2])):
    path = os.path.join(OUT, '%s_%s.sql' % (nnnn, name))
    with io.open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)
    print('wrote', path, len(text.encode('utf-8')), 'bytes')
print(n_record, 'record tables,', n_child, 'children')
