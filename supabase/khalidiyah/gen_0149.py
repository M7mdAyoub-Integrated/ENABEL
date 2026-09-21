# -*- coding: utf-8 -*-
"""
Generates supabase/migrations/PENDING_0149_khalidiyah_framework.sql: the
four objectives, eight activities, 21 indicators, 273 null target rows, and
the plan's own targets as data (indicator_plan_target).

Run from the repository root:  python supabase/khalidiyah/gen_0149.py
Writes LF only (newline=''), per CLAUDE.md rule 5.
"""
import io, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from workbook import load_forms, load_framework, load_index, split_bilingual
from catalogue import FORMS

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
KHLD = '00000000-0000-4000-8000-0000000000b2'


def q(s):
    if s is None:
        return 'null'
    return "'" + s.replace("'", "''") + "'"


def num(v):
    return 'null' if v is None else str(v)


forms = load_forms()
header, body = load_framework()
fw = {r[0]: r for r in body}
idx = {r[1]: r for r in load_index()}
FORM_OF_CODE = {f.code: fid for fid, f in forms.items()}

# ── objectives and activities: the sheet's English after its "X | " code ─
# The framework writes 'SO1 | Strengthening ...' and 'Activity A | Establish
# ...': the text after the separator is the name. No source has these in
# Arabic; the Arabic below is DRAFTED for the platform and marked so.
def after_bar(s):
    return s.split('|', 1)[1].strip() if '|' in s else s.strip()

OBJECTIVES = [
    ('IMPACT', 0, 'Impact', 'الأثر'),
    ('SO1', 1, after_bar(fw['KHLD-SO1-0'][1]), 'تعزيز الشراكات المجتمعية والاستدامة المؤسسية'),
    ('SO2', 2, after_bar(fw['KHLD-SO2-0'][1]), 'تأهيل حديقة الخالدية العامة وتفعيلها كمساحة اجتماعية مشتركة'),
    ('SO3', 3, after_bar(fw['KHLD-SO3-0'][1]), 'تعزيز المشاركة المجتمعية والعمل التطوعي'),
    ('SO4', 4, after_bar(fw['KHLD-SO4-0'][1]), 'دعم المنتجين المنزليين من خلال الأسواق المجتمعية وأنشطة الحديقة'),
]
ACTIVITIES = [
    ('A', 'SO1', 1, after_bar(fw['KHLD-SO1-A'][1]), 'إنشاء آلية شراكة بلدية مستدامة'),
    ('B', 'SO1', 2, after_bar(fw['KHLD-SO1-B'][1]), 'تفعيل ترتيبات التنسيق الخاصة بالحديقة'),
    ('C', 'SO2', 3, after_bar(fw['KHLD-SO2-C'][1]), 'تأهيل مرافق الحديقة'),
    ('D', 'SO2', 4, after_bar(fw['KHLD-SO2-D'][1]), 'تنظيم أنشطة مجتمعية وثقافية وترفيهية ورياضية'),
    ('E', 'SO3', 5, after_bar(fw['KHLD-SO3-E'][1]), 'إنشاء لجنة تنسيق مجتمعي'),
    ('F', 'SO3', 6, after_bar(fw['KHLD-SO3-F'][1]), 'إطلاق برنامج تطوعي'),
    ('G', 'SO4', 7, after_bar(fw['KHLD-SO4-G'][1]), 'دعم المشاريع المنزلية الصغيرة من خلال الإرشاد والروابط التسويقية'),
    ('H', 'SO4', 8, after_bar(fw['KHLD-SO4-H'][1]), 'تنظيم أسواق مجتمعية موسمية وأيام سوق مفتوحة للمنتجين المنزليين'),
]

# ── the 21 indicators, in the framework's order ───────────────────────────
TYPE_MAP = {'Impact': 'impact', 'Outcome': 'result', 'Output': 'output', 'Milestone': 'milestone',
            'Outocme': 'result', 'Ouput': 'output'}   # the two source typos, corrected; the originals are recorded below
TYPOS = {}

indicators = []
sort = 0
for r in body:
    code = r[0]
    if code not in FORM_OF_CODE:
        continue
    sort += 1
    fid = FORM_OF_CODE[code]
    f = forms[fid]
    parts = code.split('-')            # KHLD, SO1, A2  /  KHLD, IMP, 0  /  KHLD, SO1, 0
    if parts[1] == 'IMP':
        short, obj, act = 'IMP-0', 'IMPACT', None
    elif parts[2] == '0':
        short, obj, act = parts[1] + '-0', parts[1], None
    else:
        short, obj, act = parts[2], parts[1], parts[2][0]
    st_en, st_ar = split_bilingual(idx[code][2])
    raw_type = r[3]
    itype = TYPE_MAP[raw_type]
    if raw_type not in ('Impact', 'Outcome', 'Output', 'Milestone'):
        TYPOS[code] = raw_type
    calc_en, calc_ar = f.head['calculation']
    def_en = f.head['definition'][0]
    # unit, inferred (plan 4.3): a statement that begins with a percentage, or
    # a calculation that multiplies by 100, is %; SO1-A3 is money; the rest count
    if code == 'KHLD-SO1-A3':
        unit = 'JOD'
    elif st_en.strip().startswith('%') or '× 100' in calc_en:
        unit = '%'
    else:
        unit = '#'
    disagg = [d.strip() for d in re.split(r';', f.head['disaggregation'][0]) if d.strip()]
    indicators.append(dict(code=short, full=code, obj=obj, act=act, sort=sort, st_en=st_en.strip(), st_ar=st_ar.strip(),
                           itype=itype, unit=unit, def_en=def_en.strip(), calc_en=calc_en.strip(), calc_ar=calc_ar.strip(),
                           table=FORMS[fid]['table'], view='v_ind_khld_' + short.lower().replace('-', '_').replace('.', '_'),
                           disagg=disagg, fw_target=r[5].strip(), fw_formula=(r[7] or '').strip(), duration=(r[9] or '').strip()))

assert len(indicators) == 21, len(indicators)

# ── the plan's targets, as data ───────────────────────────────────────────
# One row per figure the source text states; a sub-target (SO3-F2's shares)
# is a child row. source_en is the framework's Target column, verbatim;
# source_ar is the form's "المستهدف ..." sentence where the form states the
# target (13 of 21), verbatim, and null for the eight the framework alone
# states in English. Numbers are read off the text only where unambiguous.
def target_sentences(code):
    f = forms[FORM_OF_CODE[code]]
    en, ar = f.head['calculation']
    m = re.search(r'(Target[^.]*\.)', en)
    ma = re.search(r'(المستهدف[^.]*\.)', ar)
    return (m.group(1).strip() if m else None), (ma.group(1).strip() if ma else None)

# (full code, basis, minimum, maximum, unit, subgroup, from_date, by_date, note_en)
PLAN_TARGETS = [
    ('KHLD-IMP-0',  'narrative',  None, None, None,  None, None, None, None),
    ('KHLD-SO1-0',  'percentage', 70,   None, '%',   None, None, None, None),
    ('KHLD-SO1-A1', 'plan',       1,    None, '#',   None, None, None, 'one mechanism established'),
    ('KHLD-SO1-A2', 'annual',     4,    None, '#',   None, None, None, None),
    ('KHLD-SO1-A2', 'plan',       12,   None, '#',   None, None, None, None),
    ('KHLD-SO1-A3', 'narrative',  None, None, None,  None, None, None, None),
    ('KHLD-SO1-B1', 'plan',       1,    None, '#',   None, None, None, 'one operational arrangement established'),
    ('KHLD-SO2-0',  'percentage', 60,   None, '%',   None, None, None, None),
    ('KHLD-SO2-C1', 'narrative',  None, None, None,  None, None, None, None),
    ('KHLD-SO2-C2', 'annual',     4,    None, '#',   None, None, None, 'during active implementation'),
    ('KHLD-SO2-D1', 'plan',       12,   None, '#',   None, None, None, None),
    ('KHLD-SO2-D1', 'annual',     4,    None, '#',   None, '2026-12-01', None, 'from December 2026'),
    ('KHLD-SO2-D2', 'narrative',  None, None, None,  None, None, None, None),
    ('KHLD-SO3-0',  'percentage', 40,   None, '%',   None, None, None, None),
    ('KHLD-SO3-E1', 'narrative',  None, None, None,  None, None, None, 'established / not established; no number in the source'),
    ('KHLD-SO3-F1', 'plan',       1,    None, '#',   None, None, '2027-04-30', 'launched by April 2027'),
    ('KHLD-SO3-F2', 'plan',       100,  None, '#',   None, None, None, None),
    ('KHLD-SO3-F2', 'percentage', 40,   None, '%',   'women', None, None, 'share of the volunteers counted'),
    ('KHLD-SO3-F2', 'percentage', 30,   None, '%',   'youth_15_24', None, None, 'share of the volunteers counted'),
    ('KHLD-SO3-F2', 'percentage', 15,   None, '%',   'refugees', None, None, 'share of the volunteers counted'),
    ('KHLD-SO3-F2', 'narrative',  None, None, None,  'persons_with_disabilities', None, None, '"including persons with disabilities": no share stated'),
    ('KHLD-SO3-F3', 'plan',       12,   None, '#',   None, None, None, None),
    ('KHLD-SO4-0',  'percentage', 40,   None, '%',   None, None, None, None),
    ('KHLD-SO4-G1', 'range',      20,   30,   '#',   None, None, None, None),
    ('KHLD-SO4-G2', 'range',      20,   30,   '#',   None, None, None, None),
    ('KHLD-SO4-H1', 'plan',       10,   10,   '#',   None, '2027-04-01', None, 'pilot phase April-December 2027, then seasonally to 2029; Annex 1 costs JOD 2,000 x 10'),
    ('KHLD-SO4-H2', 'range',      100,  150,  '#',   None, None, None, 'vendor participations, not unique vendors'),
]

out = []
out.append("""-- ═══════════════════════════════════════════════════════════════════════════
--  0149 — Khalidiyah's framework: 4 objectives, 8 activities, 21 indicators,
--         273 target rows -- every target null -- and the plan's own targets
--         as data (indicator_plan_target)
--
--  GENERATED by supabase/khalidiyah/gen_0149.py from Khaldia.xlsx (the
--  framework), Khalidiyah_Indicator_Data_Collection_Forms.xlsx (00_INDEX and
--  each form's head block) and catalogue.FORMS. Do not edit; edit the
--  generator and regenerate.
--
--  ── WHERE EACH VALUE COMES FROM ──
--
--  objective.name_en    Khaldia.xlsx, Objective/Activity column, the text
--                       after the sheet's "SO1 | " code separator, verbatim
--  objective.name_ar    DRAFTED for the platform -- neither workbook names
--                       the objectives in Arabic (the same position as
--                       Ramtha's activities in 0131; 09 Part 12 records it)
--  activity.name_en     the same column, after "Activity A | ", verbatim
--  activity.name_ar     DRAFTED, as above
--  indicator.name_en/ar 00_INDEX's statement, both languages, verbatim
--  indicator.definition the form's head block, Definition, verbatim
--  indicator.formula    the form's head block, "How the indicator is
--                       calculated", verbatim -- the specification the
--                       view implements. The framework sheet's own
--                       Calculation Formula column is shorter and, for
--                       IMP-0, different in kind ("Qualitative assessment
--                       based on documented evidence" against the form's
--                       numerator ÷ denominator): the form's governs, as
--                       plan Part 6 says, and the framework's text is kept
--                       in this header's table below
--  disaggregation       the form's head block, split on ';'
--  data_source          the table 0145-0147 built for the form
--  view_name            v_ind_khld_<code>, created by the views migration
--  indicator_type       the framework's Type column, corrected: the sheet
--                       writes 'Outocme' for KHLD-SO2-0 and 'Ouput' for
--                       KHLD-SO3-F3 (plan 4.1); outcomes are stored as
--                       'result', as Ramtha's are
--  unit                 INFERRED, every one (plan 4.3): the framework's
--                       Unit column is blank for all 21. '%%' where the
--                       statement begins with a percentage or the
--                       calculation multiplies by 100 (the five outcome
--                       and impact statements); JOD for KHLD-SO1-A3, whose
--                       figure is a sum of money; '#' for every count and
--                       milestone. The unit check gains 'JOD' here
--  baseline             null: the framework's Baseline column is empty
--
--  ── WHAT IS DELIBERATELY NULL ──
--
--  Every quarterly target. The framework's 27/Q1..28/Q4 columns are empty
--  for all 21 indicators, and the targets the forms DO state are annual,
--  plan-period, a range or a percentage -- none is quarterly (plan 4.2).
--  273 indicator_target rows are seeded with target_value null so the
--  dashboard says "not set" and never 0; nothing is divided into quarters.
--
--  ── THE PLAN'S TARGETS, AS DATA ──
--
--  indicator_plan_target holds what the sources state, one row per figure:
--  the framework's Target column verbatim (source_en), the form's
--  "المستهدف ..." sentence verbatim where the form states one (source_ar,
--  %(n_ar)d of 21), the basis (percentage / annual / plan / range / narrative),
--  and a minimum and maximum only where the text is unambiguous. SO3-F2's
--  three shares are child rows of its count (parent_id); "including
--  persons with disabilities" is a child with no number. Nothing here is
--  enforced against a figure: the dashboard shows the row under the
--  indicator as a secondary line, and the seven narrative rows show their
--  text. The framework's Target column, per indicator:
--
""" % dict(n_ar=sum(1 for i in indicators if target_sentences(i['full'])[1] is not None)))
for i in indicators:
    out.append('--    %-12s %s\n' % (i['full'], i['fw_target']))
out.append("""--
--  Sahel Horan and Ramtha are untouched: their objective, activity,
--  indicator and target counts are asserted, and the five view hashes
--  captured before this file are asserted after it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. the hashes, before ────────────────────────────────────────────────
create temp table _0149_before on commit drop as
select m.code as muni, 'actual' as v, md5(string_agg(t::text, E'\\n' order by t::text)) as h
  from public.v_indicator_actual t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'progress', md5(string_agg(t::text, E'\\n' order by t::text))
  from public.v_indicator_progress t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'disagg', md5(string_agg(t::text, E'\\n' order by t::text))
  from public.v_indicator_disaggregated t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'rmth_status', md5(string_agg(t::text, E'\\n' order by t::text))
  from public.v_rmth_indicator_status t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'rmth_unique', md5(string_agg(t::text, E'\\n' order by t::text))
  from public.v_rmth_indicator_unique t join public.municipality m on m.id = t.municipality_id group by m.code;

-- ── 1. a third unit: money ───────────────────────────────────────────────
-- KHLD-SO1-A3 reports "the annual total value in JOD" (plan 4.3). The
-- check keeps its name; nothing on file changes.
alter table public.indicator drop constraint indicator_unit_check;
alter table public.indicator add constraint indicator_unit_check check (unit in ('#', '%', 'JOD'));

-- ── 2. objectives ────────────────────────────────────────────────────────

""")
for code, sort, en, ar in OBJECTIVES:
    out.append("insert into public.objective (municipality_id, code, name_en, name_ar, sort_order)\nvalues (%s, %s, %s, %s, %d);\n"
               % (q(KHLD), q(code), q(en), q(ar), sort))

out.append("\n-- ── 3. activities ────────────────────────────────────────────────────────\n\n")
for code, obj, sort, en, ar in ACTIVITIES:
    out.append("insert into public.activity (municipality_id, objective_id, code, name_en, name_ar, sort_order)\n"
               "select %s, o.id, %s, %s, %s, %d\n  from public.objective o where o.municipality_id = %s and o.code = %s;\n"
               % (q(KHLD), q(code), q(en), q(ar), sort, q(KHLD), q(obj)))

out.append("\n-- ── 4. indicators ────────────────────────────────────────────────────────\n\n")
for i in indicators:
    act = ("(select a.id from public.activity a where a.municipality_id = %s and a.code = %s)" % (q(KHLD), q(i['act']))) if i['act'] else 'null'
    disagg = "array[%s]::text[]" % ', '.join(q(d) for d in i['disagg']) if i['disagg'] else 'null'
    out.append("insert into public.indicator (municipality_id, code, full_code, objective_id, activity_id, name_en, name_ar, indicator_type, unit, definition, formula, data_source, view_name, baseline, final_target, disaggregation, sort_order)\n"
               "select %s, %s, %s, o.id, %s,\n       %s,\n       %s,\n       %s, %s,\n       %s,\n       %s,\n       %s, %s, null, null, %s, %d\n"
               "  from public.objective o where o.municipality_id = %s and o.code = %s;\n"
               % (q(KHLD), q(i['code']), q(i['full']), act, q(i['st_en']), q(i['st_ar']), q(i['itype']), q(i['unit']),
                  q(i['def_en']), q(i['calc_en']), q(i['table']), q(i['view']), disagg, i['sort'], q(KHLD), q(i['obj'])))

out.append("""
-- ── 5. targets: one row per indicator per period, every value null ───────

insert into public.indicator_target (municipality_id, indicator_id, period_id, target_value)
select i.municipality_id, i.id, p.id, null
  from public.indicator i
  join public.reporting_period p on p.municipality_id = i.municipality_id
 where i.municipality_id = %s;

-- ── 6. the plan's targets as data ────────────────────────────────────────

create table public.indicator_plan_target (
  id               uuid primary key default gen_random_uuid(),
  municipality_id  uuid not null references public.municipality(id) default public.my_municipality(),
  indicator_id     uuid not null,
  parent_id        uuid references public.indicator_plan_target(id),
  source_en        text not null,
  source_ar        text,
  basis            text not null check (basis in ('percentage', 'annual', 'plan', 'range', 'narrative')),
  minimum          numeric,
  maximum          numeric,
  unit             text check (unit in ('#', '%%', 'JOD')),
  subgroup         text,
  from_date        date,
  by_date          date,
  note_en          text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) default auth.uid(),
  deleted_at       timestamptz,
  constraint indicator_plan_target_id_municipality_key unique (id, municipality_id),
  constraint indicator_plan_target_indicator_id_fkey foreign key (indicator_id, municipality_id) references public.indicator(id, municipality_id),
  constraint indicator_plan_target_bounds check (minimum is null or maximum is null or minimum <= maximum),
  constraint indicator_plan_target_figure_has_unit check ((minimum is null and maximum is null) or unit is not null),
  constraint indicator_plan_target_narrative_has_no_figure check (basis <> 'narrative' or (minimum is null and maximum is null))
);
create index indicator_plan_target_municipality_idx on public.indicator_plan_target (municipality_id);
create index indicator_plan_target_indicator_idx on public.indicator_plan_target (indicator_id);
create index indicator_plan_target_parent_idx on public.indicator_plan_target (parent_id);
create index indicator_plan_target_created_by_idx on public.indicator_plan_target (created_by);
select public.attach_standard_triggers('indicator_plan_target');
alter table public.indicator_plan_target enable row level security;
create policy indicator_plan_target_read on public.indicator_plan_target for select to authenticated
  using (public.can_see_municipality(municipality_id));
create policy indicator_plan_target_write on public.indicator_plan_target for all to authenticated
  using (public.is_coordinator() and public.can_see_municipality(municipality_id))
  with check (public.is_coordinator() and public.can_see_municipality(municipality_id));

comment on table public.indicator_plan_target is
  'A target the plan or the forms state for an indicator, as the source states it: annual, over the '
  'Plan period, a range or a percentage -- never quarterly (plan 4.2). source_en is the framework''s '
  'Target column verbatim; source_ar the form''s target sentence verbatim where it has one. minimum and '
  'maximum only where the text is unambiguous; a narrative row has neither. A sub-target (SO3-F2''s '
  'shares) is a child row. Shown under the indicator; enforced against nothing. 0149.';
comment on column public.indicator_plan_target.basis is
  'percentage: a share of a denominator; annual: per year; plan: over the Plan period; range: between '
  'minimum and maximum; narrative: the source states no figure.';
comment on column public.indicator_plan_target.subgroup is
  'A sub-target''s population: women, youth_15_24, refugees, persons_with_disabilities. Null on the figure itself.';

""" % q(KHLD))

# the rows, parents before children
by_code = {i['full']: i for i in indicators}
sort_n = {}
parent_var = None
for (full, basis, mn, mx, unit, sub, frm, by, note) in PLAN_TARGETS:
    sort_n[full] = sort_n.get(full, 0) + 1
    src_en = by_code[full]['fw_target']
    sen, sar = target_sentences(full)
    src_ar = sar
    is_child = sub is not None
    if not is_child:
        out.append("insert into public.indicator_plan_target (municipality_id, indicator_id, parent_id, source_en, source_ar, basis, minimum, maximum, unit, subgroup, from_date, by_date, note_en, sort_order)\n"
                   "select %s, i.id, null, %s, %s, %s, %s, %s, %s, null, %s, %s, %s, %d\n"
                   "  from public.indicator i where i.full_code = %s;\n"
                   % (q(KHLD), q(src_en), q(src_ar), q(basis), num(mn), num(mx), q(unit),
                      q(frm), q(by), q(note), sort_n[full], q(full)))
    else:
        out.append("insert into public.indicator_plan_target (municipality_id, indicator_id, parent_id, source_en, source_ar, basis, minimum, maximum, unit, subgroup, from_date, by_date, note_en, sort_order)\n"
                   "select %s, i.id, (select p.id from public.indicator_plan_target p where p.indicator_id = i.id and p.parent_id is null and p.sort_order = 1),\n"
                   "       %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %d\n"
                   "  from public.indicator i where i.full_code = %s;\n"
                   % (q(KHLD), q(src_en), q(src_ar), q(basis), num(mn), num(mx), q(unit), q(sub),
                      q(frm), q(by), q(note), sort_n[full], q(full)))

n_rows = len(PLAN_TARGETS)
n_children = sum(1 for t in PLAN_TARGETS if t[5] is not None)
n_narr = sum(1 for t in PLAN_TARGETS if t[1] == 'narrative')
n_ar = sum(1 for i in indicators if target_sentences(i['full'])[1] is not None)

out.append("""
-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_khld uuid := %(khld)s;
  v_rmth uuid := '00000000-0000-4000-8000-0000000000a1';
  v_shm  uuid := '00000000-0000-4000-8000-00000000005a';
  v_n    int;
  v_txt  text;
  r      record;
begin
  select count(*) into v_n from public.objective where municipality_id = v_khld;
  if v_n <> 5 then raise exception '0149: expected 5 objectives, got %%', v_n; end if;
  select count(*) into v_n from public.activity where municipality_id = v_khld;
  if v_n <> 8 then raise exception '0149: expected 8 activities, got %%', v_n; end if;
  select count(*) into v_n from public.indicator where municipality_id = v_khld;
  if v_n <> 21 then raise exception '0149: expected 21 indicators, got %%', v_n; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_khld;
  if v_n <> 273 then raise exception '0149: expected 273 target rows, got %%', v_n; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_khld and target_value is not null;
  if v_n <> 0 then raise exception '0149: %% Khalidiyah targets are not null', v_n; end if;
  -- every indicator names the table its form writes, and that table exists
  select string_agg(full_code, ',') into v_txt from public.indicator i where i.municipality_id = v_khld
     and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                      where n.nspname = 'public' and c.relname = i.data_source);
  if v_txt is not null then raise exception '0149: indicators naming a table that does not exist: %%', v_txt; end if;
  -- the types and units are the inferred ones
  if (select indicator_type from public.indicator where full_code = 'KHLD-SO2-0') <> 'result'
     or (select indicator_type from public.indicator where full_code = 'KHLD-SO3-F3') <> 'output' then
    raise exception '0149: a source typo reached the type column';
  end if;
  if (select unit from public.indicator where full_code = 'KHLD-SO1-A3') <> 'JOD'
     or (select count(*) from public.indicator where municipality_id = v_khld and unit = '%%') <> 5
     or (select count(*) from public.indicator where municipality_id = v_khld and indicator_type = 'milestone') <> 4 then
    raise exception '0149: the units or types are not as inferred';
  end if;
  -- the Arabic statements are the index sheet's, not the English
  select count(*) into v_n from public.indicator where municipality_id = v_khld and (name_ar is null or name_ar = name_en or name_ar !~ '[؀-ۿ]');
  if v_n <> 0 then raise exception '0149: %% indicators have no Arabic statement', v_n; end if;
  -- the plan targets: %(n_rows)d rows, %(n_children)d of them sub-targets of SO3-F2, %(n_narr)d narrative
  select count(*) into v_n from public.indicator_plan_target where municipality_id = v_khld;
  if v_n <> %(n_rows)d then raise exception '0149: expected %(n_rows)d plan target rows, got %%', v_n; end if;
  select count(*) into v_n from public.indicator_plan_target t join public.indicator i on i.id = t.indicator_id
   where t.parent_id is not null and i.full_code = 'KHLD-SO3-F2';
  if v_n <> %(n_children)d then raise exception '0149: expected %(n_children)d SO3-F2 sub-targets, got %%', v_n; end if;
  if exists (select 1 from public.indicator_plan_target where parent_id is not null and subgroup is null)
     or exists (select 1 from public.indicator_plan_target where parent_id is null and subgroup is not null) then
    raise exception '0149: a sub-target without a subgroup, or a figure with one';
  end if;
  select count(*) into v_n from public.indicator_plan_target where basis = 'narrative';
  if v_n <> %(n_narr)d then raise exception '0149: expected %(n_narr)d narrative rows, got %%', v_n; end if;
  -- every indicator has at least one row, and the %(n_ar)d the forms state carry the form's Arabic sentence
  select count(*) into v_n from public.indicator i where i.municipality_id = v_khld
     and not exists (select 1 from public.indicator_plan_target t where t.indicator_id = i.id);
  if v_n <> 0 then raise exception '0149: %% indicators have no plan target row', v_n; end if;
  select count(distinct indicator_id) into v_n from public.indicator_plan_target where source_ar is not null;
  if v_n <> %(n_ar)d then raise exception '0149: expected %(n_ar)d indicators with an Arabic target sentence, got %%', v_n; end if;
  if (select minimum from public.indicator_plan_target t join public.indicator i on i.id = t.indicator_id where i.full_code = 'KHLD-SO4-G1') <> 20
     or (select maximum from public.indicator_plan_target t join public.indicator i on i.id = t.indicator_id where i.full_code = 'KHLD-SO4-H2') <> 150 then
    raise exception '0149: a range was not read as stated';
  end if;
  -- nothing quarterly anywhere: no plan target names a period
  if exists (select 1 from information_schema.columns where table_name = 'indicator_plan_target' and column_name like '%%period%%') then
    raise exception '0149: a plan target carries a period';
  end if;

  -- Sahel Horan and Ramtha: counts and hashes unchanged
  select count(*) into v_n from public.indicator where municipality_id = v_shm;
  if v_n <> 20 then raise exception '0149: Sahel Horan no longer has 20 indicators'; end if;
  select count(*) into v_n from public.indicator where municipality_id = v_rmth;
  if v_n <> 18 then raise exception '0149: Ramtha no longer has 18 indicators'; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_shm;
  if v_n <> 260 then raise exception '0149: Sahel Horan target rows changed'; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_rmth;
  if v_n <> 234 then raise exception '0149: Ramtha target rows changed'; end if;
  for r in select b.muni, b.v, b.h as before_h,
                  case b.v
                    when 'actual' then (select md5(string_agg(t::text, E'\\n' order by t::text)) from public.v_indicator_actual t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'progress' then (select md5(string_agg(t::text, E'\\n' order by t::text)) from public.v_indicator_progress t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'disagg' then (select md5(string_agg(t::text, E'\\n' order by t::text)) from public.v_indicator_disaggregated t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_status' then (select md5(string_agg(t::text, E'\\n' order by t::text)) from public.v_rmth_indicator_status t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_unique' then (select md5(string_agg(t::text, E'\\n' order by t::text)) from public.v_rmth_indicator_unique t where t.municipality_id = (select id from public.municipality where code = b.muni))
                  end as after_h
             from _0149_before b
  loop
    if r.before_h is distinct from r.after_h then
      raise exception '0149: %% %% moved: %% -> %%', r.muni, r.v, r.before_h, r.after_h;
    end if;
  end loop;
  -- Khalidiyah's 21 indicators appear in the progress view, every one "not set" and without a figure
  select count(*) into v_n from public.v_indicator_progress where municipality_id = v_khld;
  if v_n <> 273 then raise exception '0149: expected 273 Khalidiyah progress rows, got %%', v_n; end if;
  if exists (select 1 from public.v_indicator_progress where municipality_id = v_khld and (status <> 'not_set' or actual is not null)) then
    raise exception '0149: a Khalidiyah progress row carries a status or a figure before its view exists';
  end if;
end $verify$;
""" % dict(khld=q(KHLD), n_rows=n_rows, n_children=n_children, n_narr=n_narr, n_ar=n_ar))

text = ''.join(out)
path = os.path.join(ROOT, 'supabase', 'migrations', 'PENDING_0149_khalidiyah_framework.sql')
with io.open(path, 'w', encoding='utf-8', newline='') as fh:
    fh.write(text)
print('wrote', path, len(text.encode('utf-8')), 'bytes;', len(indicators), 'indicators,', n_rows, 'plan target rows; typos:', TYPOS)
