# -*- coding: utf-8 -*-
"""
Writes supabase/migrations/PENDING_0131_ramtha_framework.sql: Ramtha's
objective, activity, indicator, reporting_period and indicator_target rows.

Every English string comes from a workbook -- the framework workbook's
English_form (objectives, activities, the two definitions it has) or the
forms workbook (each indicator's statement, calculation rule and
disaggregation, exactly as the sheet has them) -- and every Arabic statement
from forms.STATEMENT_AR, which records its own source. Nothing here is typed
from memory, and the generator fails if a form id it expects is missing.

Run from the repository root:  python supabase/ramtha/gen_0131.py
"""
import io, os, re, sys
from collections import OrderedDict
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from forms import FORMS, STATEMENT_AR

RMTH = "'00000000-0000-4000-8000-0000000000a1'"

def q(s):
    if s is None:
        return 'null'
    return "'" + str(s).replace("'", "''") + "'"

def norm(s):
    return re.sub(r'\s+', ' ', str(s)).strip()

# ── the forms workbook: statement, calculation rule, disaggregation ────────
wb = openpyxl.load_workbook(os.path.join(ROOT, 'RMTH_indicator_forms.xlsx'), read_only=True, data_only=True)
sheet = {}
for fid, f in FORMS.items():
    ws = wb[f['sheet']]
    rows = [[norm(v) if v is not None else '' for v in r] for r in ws.iter_rows(values_only=True)]
    rows = [r + [''] * (3 - len(r)) for r in rows if any(r)]
    title = rows[0][0]
    d = {'title': title.split('|', 1)[1].strip() if '|' in title else title}
    for r in rows[1:10]:
        if r[0] == 'How the indicator is calculated from this form': d['calc'] = r[1]
        if r[0] == 'Required disaggregation': d['disagg'] = r[1]
        if r[0] == 'Unit of observation': d['unit_obs'] = r[1]
    sheet[fid] = d

# ── the framework workbook: objectives, activities, the two definitions ────
fw = openpyxl.load_workbook(os.path.join(ROOT, 'RAMTHA Framework.xlsx'), data_only=True)
ef = fw['English_form']
defs = {}
obj_names = {}
act_names = {}
for r in ef.iter_rows(min_row=2, values_only=True):
    code = r[0]
    if not code or not str(code).startswith('RMTH'):
        continue
    code = str(code).strip()
    if r[4]:
        defs[code] = norm(r[4])
    if r[1] and code in ('RMTH-SO1-0', 'RMTH-SO2-0', 'RMTH-SO3-0'):
        obj_names[code[5:8]] = norm(r[1])
    if r[1] and code in ('RMTH-SO1-A', 'RMTH-SO1-B', 'RMTH-SO2-C', 'RMTH-SO3-E', 'RMTH-SO3-F'):
        act_names[code[-1]] = norm(r[1]).split('|', 1)[-1].strip()

assert set(obj_names) == {'SO1', 'SO2', 'SO3'}, obj_names
assert set(act_names) == {'A', 'B', 'C', 'E', 'F'}, act_names

# The Arabic Copy sheet, verbatim, for the three objectives.
ac = fw['Arabic Copy']
obj_ar = {}
for r in ac.iter_rows(values_only=True):
    if r[0] in ('SO1', 'SO2', 'SO3') and r[1]:
        obj_ar[r[0]] = norm(r[1])
assert set(obj_ar) == {'SO1', 'SO2', 'SO3'}, obj_ar

OBJECTIVES = [
    ('IMPACT', 'Impact', 'الأثر', 0),
    ('SO1', obj_names['SO1'], obj_ar['SO1'], 1),
    ('SO2', obj_names['SO2'], obj_ar['SO2'], 2),
    ('SO3', obj_names['SO3'], obj_ar['SO3'], 3),
]

# Activity Arabic is drafted (the Arabic Copy has no activity rows) -- OQ-46's rule.
ACTIVITIES = [
    ('A', 'SO1', act_names['A'], 'تنظيم أيام وظيفية وفعاليات توجيه مهني بشكل دوري', 1),
    ('B', 'SO1', act_names['B'], 'تطوير مشاريع محلية مرتبطة بسوق العمل', 2),
    ('C', 'SO2', act_names['C'], 'دعم تطوير برامج تدريب عملية بالتعاون مع المؤسسات التعليمية المحلية', 3),
    ('E', 'SO3', act_names['E'], 'إنشاء حاضنات أعمال صغيرة بالتعاون مع الجامعات والقطاع الخاص', 4),
    ('F', 'SO3', act_names['F'], 'تيسير الوصول إلى التمويل والدعم الاستشاري من خلال التنسيق بين أصحاب المصلحة', 5),
]

# code, full code, objective, activity, type, unit, form id, view, table
INDICATORS = [
    ('IMP-0', 'RMTH-IMP-0',     'IMPACT', None, 'impact',       '#', 'imp0',  'v_ind_rmth_imp_0', 'rmth_outcome_survey'),
    ('SO1-0', 'RMTH-SO1-0',     'SO1',    None, 'result',       '#', 'so10',  'v_ind_rmth_so1_0', 'rmth_outcome_survey'),
    ('A1',    'RMTH-SO1-A1',    'SO1',    'A',  'output',       '#', None,    None,               None),
    ('A1.2',  'RMTH-SO1-A1.2',  'SO1',    'A',  'output',       '#', 'a12',   'v_ind_rmth_a1_2',  'rmth_event'),
    ('A1.3',  'RMTH-SO1-A1.3',  'SO1',    'A',  'output',       '#', 'a13',   'v_ind_rmth_a1_3',  'rmth_event'),
    ('B1',    'RMTH-SO1-B1',    'SO1',    'B',  'intermediate', '%', 'b1',    'v_ind_rmth_b1',    'rmth_project_implementer'),
    ('B1.1',  'RMTH-SO1-B1.1',  'SO1',    'B',  'output',       '#', 'b11',   'v_ind_rmth_b1_1',  'rmth_training_programme'),
    ('B1.2',  'RMTH-SO1-B1.2',  'SO1',    'B',  'output',       '#', 'b12',   'v_ind_rmth_b1_2',  'rmth_proposal'),
    ('SO2-0', 'RMTH-SO2-0',     'SO2',    None, 'result',       '%', 'so20',  'v_ind_rmth_so2_0', 'rmth_outcome_survey'),
    ('C1',    'RMTH-SO2-C1',    'SO2',    'C',  'intermediate', '%', 'so2c1', 'v_ind_rmth_c1',    'rmth_outcome_survey'),
    ('C1.1',  'RMTH-SO2-C1.1',  'SO2',    'C',  'output',       '#', 'c11',   'v_ind_rmth_c1_1',  'rmth_training_cycle'),
    ('C1.2',  'RMTH-SO2-C1.2',  'SO2',    'C',  'output',       '#', 'c12',   'v_ind_rmth_c1_2',  'rmth_training_enrolment'),
    ('SO3-0', 'RMTH-SO3-0',     'SO3',    None, 'result',       '#', 'so30',  'v_ind_rmth_so3_0', 'rmth_outcome_survey'),
    ('E0.1',  'RMTH-SO3-E0.1',  'SO3',    'E',  'output',       '#', 'e01',   'v_ind_rmth_e0_1',  'rmth_incubator'),
    ('E0.2',  'RMTH-SO3-E0.2',  'SO3',    'E',  'output',       '#', 'e02',   'v_ind_rmth_e0_2',  'rmth_incubation_service'),
    ('E0.3',  'RMTH-SO3-E0.3',  'SO3',    'E',  'output',       '#', 'e03',   'v_ind_rmth_e0_3',  'rmth_training_enrolment'),
    ('F0.1',  'RMTH-SO3-F0.1',  'SO3',    'F',  'output',       '#', 'f01',   'v_ind_rmth_f0_1',  'rmth_training_enrolment'),
    ('F0.2',  'RMTH-SO3-F0.2',  'SO3',    'F',  'output',       '#', 'f02',   'v_ind_rmth_f0_2',  'rmth_training_programme'),
]

A1_EN = 'RMTH-SO1-A1 carries a code and no indicator statement in the framework workbook (OQ-48)'
A1_AR = 'يحمل RMTH-SO1-A1 رمزاً دون نص مؤشر في مصنّف الإطار (OQ-48)'

PERIODS = [('26/Q3', '2026-07-01', '2026-09-30'), ('26/Q4', '2026-10-01', '2026-12-31'),
           ('27/Q1', '2027-01-01', '2027-03-31'), ('27/Q2', '2027-04-01', '2027-06-30'),
           ('27/Q3', '2027-07-01', '2027-09-30'), ('27/Q4', '2027-10-01', '2027-12-31'),
           ('28/Q1', '2028-01-01', '2028-03-31'), ('28/Q2', '2028-04-01', '2028-06-30'),
           ('28/Q3', '2028-07-01', '2028-09-30'), ('28/Q4', '2028-10-01', '2028-12-31'),
           ('29/Q1', '2029-01-01', '2029-03-31'), ('29/Q2', '2029-04-01', '2029-06-30'),
           ('29/Q3', '2029-07-01', '2029-09-30')]

out = []
w = out.append
w("""-- ═══════════════════════════════════════════════════════════════════════════
--  0131 — Ramtha's framework: 4 objectives, 5 activities, 18 indicators,
--         13 reporting periods, 234 target rows -- every target null
--
--  GENERATED by supabase/ramtha/gen_0131.py from the two workbooks and
--  supabase/ramtha/forms.py. Do not edit; edit the generator and regenerate.
--
--  ── WHERE EACH VALUE COMES FROM ──
--
--  objective.name_en    RAMTHA Framework.xlsx, English_form, verbatim
--  objective.name_ar    the same workbook's Arabic Copy sheet, verbatim
--  activity.name_en     English_form, verbatim (the workbook labels
--                       RMTH-SO3-E "Activity D"; the CODE is E and is kept)
--  activity.name_ar     drafted -- the Arabic Copy has no activity rows
--  indicator.name_en    the form sheet's own statement, verbatim
--  indicator.name_ar    forms.STATEMENT_AR: the Arabic Copy's statement
--                       where the form's statement is the English Copy's,
--                       drafted and marked otherwise (see forms.py)
--  indicator.formula    the sheet's "How the indicator is calculated from
--                       this form", verbatim -- the specification the view
--                       in 0132 implements
--  indicator.definition English_form's Definition, present for A1.2 and A1.3
--                       only (and identical for both, which is the index's
--                       never-sum warning); null elsewhere, not invented
--  disaggregation       the sheet's "Required disaggregation", split on ';'
--
--  ── WHAT IS DELIBERATELY NULL ──
--
--  Every target. English_form has no targets at all; the English Copy has
--  them against a different indicator list (plan §6.2). They are NOT mapped
--  across: a 234-row target matrix is seeded with target_value null, so the
--  dashboard says "not set" and never 0. The reconciliation is OQ-48.
--
--  Baselines: English_form's Baseline column is empty. Null.
--
--  RMTH-SO1-A1 is seeded with a code, no statement, no formula and no view
--  (plan §6.3) -- its name says so in both languages, and 0132's status view
--  names the gap on the dashboard.
--
--  ── DECISIONS TAKEN HERE ──
--
--  Reporting periods: the same thirteen quarters as Sahel Horan, 26/Q3 to
--  29/Q3. Neither workbook states Ramtha's programme dates; English_form's
--  target columns run 27/Q1 to 28/Q4 exactly as Sahel Horan's do. Separate
--  rows, so the two plans lock independently (plan §1.2).
--
--  Units: '#' for counts, '%' for the three statements that begin with a
--  percentage (B1, SO2-0, C1). IMP-0 is a count -- the sheet says "A COUNT,
--  not a rate" -- while the Action Plan writes it as a ratio; OQ-47 item 1.
--
--  indicator.full_code: added here as a real column, NOT NULL and unique,
--  because 0113's header said 0116 would add it and 0116 did not. Backfilled
--  for Sahel Horan from its documented codes (03_INDICATORS.md: SHM-IMP-0,
--  SHM-SO1-A1 ... SHM-SO4-G0.4).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── full_code ─────────────────────────────────────────────────────────────

alter table public.indicator add column full_code text;

update public.indicator i
   set full_code = 'SHM-' || case when o.code = 'IMPACT' then i.code else o.code || '-' || i.code end
  from public.objective o, public.municipality m
 where o.id = i.objective_id and m.id = i.municipality_id and m.code = 'SHM' and i.full_code is null;

-- ── objectives ───────────────────────────────────────────────────────────
""")
for code, en, ar, sort in OBJECTIVES:
    w(f"insert into public.objective (municipality_id, code, name_en, name_ar, sort_order)\nvalues ({RMTH}, {q(code)}, {q(en)}, {q(ar)}, {sort});")
w("\n-- ── activities ───────────────────────────────────────────────────────────\n")
for code, obj, en, ar, sort in ACTIVITIES:
    w(f"insert into public.activity (municipality_id, objective_id, code, name_en, name_ar, sort_order)\n"
      f"select {RMTH}, o.id, {q(code)}, {q(en)}, {q(ar)}, {sort}\n  from public.objective o where o.municipality_id = {RMTH} and o.code = {q(obj)};")
w("\n-- ── reporting periods ────────────────────────────────────────────────────\n")
for code, s, e in PERIODS:
    w(f"insert into public.reporting_period (municipality_id, code, start_date, end_date, is_locked) values ({RMTH}, {q(code)}, {q(s)}, {q(e)}, false);")
w("\n-- ── indicators ───────────────────────────────────────────────────────────\n")
for sort, (code, full, obj, act, typ, unit, fid, view, table) in enumerate(INDICATORS, start=1):
    if fid:
        assert fid in FORMS and fid in STATEMENT_AR and fid in sheet, fid
        d = sheet[fid]
        name_en = d['title']
        name_ar = STATEMENT_AR[fid][1]
        formula = d.get('calc')
        assert formula, fid
        disagg = [norm(x) for x in re.split(r';', d.get('disagg', '')) if norm(x)]
        definition = defs.get(full)
    else:
        name_en, name_ar, formula, disagg, definition = A1_EN, A1_AR, None, [], None
    disagg_sql = 'null' if not disagg else 'array[' + ', '.join(q(x) for x in disagg) + ']::text[]'
    act_sql = 'null' if act is None else f"(select a.id from public.activity a where a.municipality_id = {RMTH} and a.code = {q(act)})"
    w(f"insert into public.indicator (municipality_id, code, full_code, objective_id, activity_id, name_en, name_ar, indicator_type, unit, definition, formula, data_source, view_name, baseline, final_target, disaggregation, sort_order)\n"
      f"select {RMTH}, {q(code)}, {q(full)}, o.id, {act_sql},\n"
      f"       {q(name_en)},\n       {q(name_ar)},\n"
      f"       {q(typ)}, {q(unit)}, {q(definition)},\n       {q(formula)},\n"
      f"       {q(table)}, {q(view)}, null, null, {disagg_sql}, {sort}\n"
      f"  from public.objective o where o.municipality_id = {RMTH} and o.code = {q(obj)};")
w("""
-- ── targets: one row per indicator per period, every value null ──────────

insert into public.indicator_target (municipality_id, indicator_id, period_id, target_value)
select i.municipality_id, i.id, p.id, null
  from public.indicator i
  join public.reporting_period p on p.municipality_id = i.municipality_id
 where i.municipality_id = """ + RMTH + """;

-- ── full_code becomes a column with rules ────────────────────────────────

alter table public.indicator
  alter column full_code set not null,
  add constraint indicator_full_code_key unique (full_code),
  add constraint indicator_full_code_shape check (full_code ~ '^[A-Z]+-[A-Z0-9.-]+$');

comment on column public.indicator.full_code is
  'The code the framework and the donor return use: municipality code, objective, short code (SHM-SO1-A1.2, RMTH-IMP-0). '
  'Stored rather than derived because a derivation cannot tell RMTH-SO1-0 from RMTH-SO1-SO1-0.';

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_rmth uuid := '00000000-0000-4000-8000-0000000000a1';
  v_shm  uuid := '00000000-0000-4000-8000-00000000005a';
  v_n    int;
  v_txt  text;
begin
  select count(*) into v_n from public.objective where municipality_id = v_rmth;
  if v_n <> 4 then raise exception '0131: expected 4 objectives, got %', v_n; end if;
  select count(*) into v_n from public.activity where municipality_id = v_rmth;
  if v_n <> 5 then raise exception '0131: expected 5 activities, got %', v_n; end if;
  select count(*) into v_n from public.reporting_period where municipality_id = v_rmth;
  if v_n <> 13 then raise exception '0131: expected 13 periods, got %', v_n; end if;
  select count(*) into v_n from public.indicator where municipality_id = v_rmth;
  if v_n <> 18 then raise exception '0131: expected 18 indicators, got %', v_n; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_rmth;
  if v_n <> 234 then raise exception '0131: expected 234 target rows, got %', v_n; end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_rmth and target_value is not null;
  if v_n <> 0 then raise exception '0131: % Ramtha targets are not null', v_n; end if;
  -- exactly one indicator with no statement, no formula and no view: A1
  select string_agg(code, ',') into v_txt from public.indicator where municipality_id = v_rmth and (formula is null or view_name is null);
  if v_txt <> 'A1' then raise exception '0131: indicators without a formula or view: %', v_txt; end if;
  -- every other Ramtha indicator names a view that 0132 has to create, and a source table that exists
  if exists (select 1 from public.indicator i where i.municipality_id = v_rmth and i.data_source is not null
               and not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                                where n.nspname = 'public' and c.relname = i.data_source)) then
    raise exception '0131: an indicator names a source table that does not exist';
  end if;
  -- Sahel Horan: full codes as documented, nothing else touched
  select count(*) into v_n from public.indicator where municipality_id = v_shm;
  if v_n <> 20 then raise exception '0131: Sahel Horan no longer has 20 indicators'; end if;
  if (select full_code from public.indicator where municipality_id = v_shm and code = 'B1.2') <> 'SHM-SO1-B1.2'
     or (select full_code from public.indicator where municipality_id = v_shm and code = 'IMP-0') <> 'SHM-IMP-0'
     or (select full_code from public.indicator where municipality_id = v_shm and code = 'G0.4') <> 'SHM-SO4-G0.4' then
    raise exception '0131: a Sahel Horan full code is not the documented one';
  end if;
  select count(*) into v_n from public.indicator_target where municipality_id = v_shm;
  if v_n <> 260 then raise exception '0131: Sahel Horan target rows changed'; end if;
  -- the Arabic statements from the workbook are the workbook's
  if (select name_ar from public.indicator where municipality_id = v_rmth and code = 'C1.2') <> 'عدد المتدربين الذين أتمّوا برامج تدريب مرتبطة بالتشغيل' then
    raise exception '0131: C1.2''s Arabic is not the Arabic Copy''s';
  end if;
end $verify$;
""")
# Applied on 14 September 2026 as version 20260914113931; regenerating must reproduce that file byte for byte.
path = os.path.join(ROOT, 'supabase', 'migrations', '20260914113931_0131_ramtha_framework.sql')
io.open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out))
print('wrote', path, len(INDICATORS), 'indicators')
