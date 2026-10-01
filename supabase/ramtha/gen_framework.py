# -*- coding: utf-8 -*-
"""
Writes 0179, Ramtha's framework rows brought to RMTH_Forms_and_Calculations_v2.xlsx:
the two codes the workbook renames, SO1-A1's statement, and every
indicator's formula from the "Calculation Method" sheet, verbatim; and the
open definitions (rmth_threshold) the new formulas still leave open.

Run from the repository root:  python supabase/ramtha/gen_framework.py
Same discipline as gen_lists.py: PENDING_ until applied, then it only checks
that it still reproduces the applied file.
"""
import glob, io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import catalogue as C  # noqa: E402
import model  # noqa: E402

MIGRATIONS = os.path.normpath(os.path.join(HERE, '..', 'migrations'))
NAME = '0179_ramtha_framework_v2.sql'

# The indicator.code each full code is stored under (0131's short codes),
# after the workbook's renames.
RENAMES = {'RMTH-SO1-A0.1': 'A1.2', 'RMTH-SO1-A0.2': 'A1.3'}

# SO1-A1 had a code and no statement (OQ-48). The workbook gives the English;
# the Arabic is drafted (OQ-78). Its type is not stated anywhere: an
# intermediate result, as B1 and C1 are at the same place in the framework
# (OQ-79).
A1_NAME_AR = ('نسبة المشاركين في معارض التوظيف وفعاليات الإرشاد المهني الذين أفادوا بتحسّن معرفتهم '
              'بفرص العمل المتاحة وكيفية الوصول إليها')

FORM_TABLE = {f['form']: f['table'] for f in C.FORMS}


def q(s):
    return "'" + s.replace("'", "''") + "'"


def short(code):
    """RMTH-SO1-A0.1 -> A0.1; RMTH-IMP-0 -> IMP-0; RMTH-SO2-0 -> SO2-0."""
    parts = code.split('-')
    return '-'.join(parts[1:]) if parts[2] == '0' else parts[2]


def view_name(code):
    return 'v_ind_rmth_' + short(code).lower().replace('.', '_').replace('-', '_')


def disaggregation(formula):
    for line in formula.split('\n'):
        if line.startswith('Disaggregate by:'):
            body = line[len('Disaggregate by:'):].strip().rstrip('.')
            return [x.strip() for x in body.split(' | ') if x.strip()]
    return []


def arr(xs):
    if not xs:
        return 'null'
    return 'array[' + ', '.join(q(x) for x in xs) + ']::text[]'


# The open definitions after this migration: kept rows reworded from the
# sheet, one added, the rest retired. Arabic drafted (OQ-78).
THRESHOLDS = [
    dict(key='imp0_sustained_months', open_item='sustained_engagement', unit='months',
         label_en='Sustained employment: minimum months working or earning continuously (X)',
         label_ar='التشغيل المستدام: الحد الأدنى للأشهر المتواصلة من العمل أو الدخل (X)',
         note_en=('RMTH-IMP-0. The Calculation Method sheet counts a person as sustained when their latest '
                  'follow-up says paid employment or self-employment (FU-06) and the months from FU-07 '
                  '(working continuously since) to FU-02 (the follow-up date) are at least X. The sheet marks X '
                  'as REQUIRES CONFIRMATION. Until X is set the indicator is not computable.'),
         note_ar=('RMTH-IMP-0. تعدّ ورقة طريقة الاحتساب الشخص مستداماً عندما تفيد آخر متابعة له بعمل مدفوع الأجر '
                  'أو عمل حر (FU-06)، وتكون الأشهر من FU-07 (يعمل بشكل متواصل منذ) إلى FU-02 (تاريخ المتابعة) '
                  'X شهراً على الأقل. تشير الورقة إلى أن قيمة X تحتاج إلى تأكيد. إلى أن تُحدَّد X لا يمكن احتساب المؤشر.')),
    dict(key='c11_max_weeks', open_item='short_term_intensive', unit='weeks',
         label_en='Short-term intensive: maximum duration in weeks (AC-04 to AC-05)',
         label_ar='قصير الأمد ومكثف: الحد الأقصى للمدة بالأسابيع (من AC-04 إلى AC-05)',
         note_en=('RMTH-SO2-C1.1. The sheet counts a short term training cycle when (AC-05 − AC-04) is at most '
                  'the maximum duration and AC-09 is at least the minimum hours, and marks both thresholds '
                  'REQUIRES CONFIRMATION. This row is the maximum duration, in weeks. Both rows must be set '
                  'before C1.1 is computable.'),
         note_ar=('RMTH-SO2-C1.1. تعدّ الورقة الدورة التدريبية القصيرة عندما تكون (AC-05 − AC-04) لا تزيد على الحد '
                  'الأقصى للمدة، ويكون AC-09 لا يقل عن الحد الأدنى للساعات، وتشير إلى أن الحدين يحتاجان إلى تأكيد. '
                  'هذا الصف هو الحد الأقصى للمدة بالأسابيع. يجب تحديد الصفين قبل أن يصبح C1.1 قابلاً للاحتساب.')),
    dict(key='c11_min_total_hours', open_item='short_term_intensive', unit='hours',
         label_en='Short-term intensive: minimum total contact hours (AC-09)',
         label_ar='قصير الأمد ومكثف: الحد الأدنى لإجمالي الساعات التدريبية (AC-09)',
         note_en=('RMTH-SO2-C1.1. The "AC-09 ≥ min hours" half of the threshold: AC-09 is the cycle\'s total '
                  'training contact hours. Both rows must be set before C1.1 is computable.'),
         note_ar=('RMTH-SO2-C1.1. شطر "AC-09 ≥ الحد الأدنى للساعات" من الحد: AC-09 هو إجمالي الساعات التدريبية '
                  'للدورة. يجب تحديد الصفين قبل أن يصبح C1.1 قابلاً للاحتساب.')),
    dict(key='so30_income_months_of_six', open_item='regular_income', unit='months of six',
         label_en='Regular income: minimum months with income out of the last six (N)',
         label_ar='الدخل المنتظم: الحد الأدنى للأشهر ذات الدخل من الأشهر الستة الأخيرة (N)',
         note_en=('RMTH-SO3-0. The sheet counts FU-08 ≥ N months out of the last six as regular income, with '
                  '4 as its working assumption, marked REQUIRES CONFIRMATION. The assumption is not applied '
                  'until it is confirmed or changed here.'),
         note_ar=('RMTH-SO3-0. تعدّ الورقة FU-08 ≥ N شهراً من الأشهر الستة الأخيرة دخلاً منتظماً، مع افتراض عمل '
                  'قدره 4، وتشير إلى أنه يحتاج إلى تأكيد. لا يُطبَّق الافتراض حتى يُؤكَّد أو يُعدَّل هنا.')),
    dict(key='f02_counting_reading', open_item='programmes_or_sessions', unit=None,
         label_en='F0.2 counts programmes, or sessions delivered?',
         label_ar='هل يعدّ F0.2 البرامج أم الجلسات المنفذة؟',
         note_en=('RMTH-SO3-F0.2. The statement counts entrepreneurship training programmes (FORM-03 records); '
                  'the definition counts sessions delivered (the sum of AC-11). The sheet says choose one; both '
                  'are computable. Value: "programmes" or "sessions". Until chosen, not computable.'),
         note_ar=('RMTH-SO3-F0.2. يعدّ نص المؤشر برامج التدريب على ريادة الأعمال (سجلات FORM-03)؛ ويعدّ التعريف '
                  'الجلسات المنفذة (مجموع AC-11). تطلب الورقة اختيار أحدهما؛ وكلاهما قابل للاحتساب. القيمة: '
                  '"programmes" أو "sessions". إلى أن يُختار لا يمكن الاحتساب.')),
]
RETIRED = ['so10_employability_threshold', 'so20_self_employment_counts', 'c12_completion_rule',
           'e03_completion_rule', 'f01_completion_rule', 'c11_min_hours_per_week']


def render(m):
    calcs = m['calcs']
    if len(calcs) != 18:
        raise SystemExit('gen_framework: the sheet has %d indicators, expected 18' % len(calcs))
    out = []
    out.append("""-- ═══════════════════════════════════════════════════════════════════════════
--  0179 — Ramtha's framework rows brought to RMTH_Forms_and_Calculations_v2.xlsx
--
--  GENERATED by supabase/ramtha/gen_framework.py from workbook.py (the
--  "Calculation Method" sheet). Do not edit; edit the generator and
--  regenerate.
--
--  ── THE CODES ──
--
--  The workbook numbers two indicators RMTH-SO1-A0.1 and RMTH-SO1-A0.2; both
--  framework workbooks (RAMTHA Framework.xlsx and its Arabic copy) call them
--  A1.2 and A1.3. The owner decided on 1 October 2026 that the new workbook
--  wins (OQ-79): code and full_code are renamed, the statements -- the same
--  in both -- are kept. Targets follow by indicator_id, and every one is
--  still null (OQ-48).
--
--  RMTH-SO1-A1 had a code and no statement (OQ-48). The workbook gives it
--  one -- "% of job fair and career guidance participants who report
--  improved knowledge ..." -- and a formula (FORM-05). Its Arabic is drafted
--  (OQ-78); its type, which no source states, is an intermediate result, as
--  B1 and C1 are at the same place in the framework (OQ-79); its unit is %.
--
--  ── THE FORMULAS ──
--
--  indicator.formula is the sheet's Formula cell, VERBATIM, line breaks
--  included: it is the specification 0180's views implement, written in the
--  Field IDs of the seven forms. disaggregation is the cell's "Disaggregate
--  by:" line, split on its bars. data_source is the table of the first form
--  the sheet's "Required Field(s)" names (FORM-01 aside: it supplies the
--  breakdowns, never the count). view_name is the leaf view 0180 creates.
--  The other statements stay as 0131 wrote them, from the framework.
--
--  ── THE OPEN DEFINITIONS ──
--
--  Four parameters of the new formulas are still undecided -- X months
--  (IMP-0), the short-term intensive thresholds (C1.1, now a maximum
--  duration and a minimum of TOTAL contact hours, AC-09), N months of six
--  (SO3-0), and programmes or sessions (F0.2) -- and stay rmth_threshold
--  rows, reworded from the sheet; c11_min_total_hours is added. Every value
--  is set back to null: what the ten rows held were the 16 September audit's
--  probe values ("AUD rule c12 ..."), not decisions (CLEANUP_PLAN.md), and a
--  dashboard computing from them computes from definitions nobody made.
--
--  Six rows are retired: the new forms answer them directly (PA-03 asks
--  whether the participant met the completion criteria; FU-03 is the
--  employability outcome; the sheet's formula for SO2-0 names its placement
--  types) or ask them differently (hours per week -> total hours). They are
--  soft-deleted. guard_soft_delete admits a coordinator only, and a schema
--  change run as the owner is not a coordinator's decision about a record,
--  so its trigger is disabled for that one statement and enabled again.
--  The questions the sheet marks REQUIRES CONFIRMATION without a parameter
--  are OQ-80.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0179_others_before on commit drop as
  select i.* from public.indicator i join public.municipality m on m.id = i.municipality_id where m.code <> 'RMTH';

-- ── 1. the two codes the workbook renames ─────────────────────────────────
""")
    for full, old in RENAMES.items():
        out.append("update public.indicator i set code = %s, full_code = %s\n"
                   "  from public.municipality m\n"
                   " where m.id = i.municipality_id and m.code = 'RMTH' and i.code = %s;\n"
                   % (q(short(full)), q(full), q(old)))
    out.append("\n-- ── 2. every indicator's formula, source, view and breakdowns ──────────\n")
    for c in calcs:
        forms = C.indicator_forms(c.fields)
        table = FORM_TABLE[forms[0]] if forms else None
        sets = ["formula = %s" % q(c.formula),
                "data_source = %s" % (q(table) if table else 'null'),
                "view_name = %s" % q(view_name(c.code)),
                "disaggregation = %s" % arr(disaggregation(c.formula)),
                "unit = %s" % q('%' if c.unit == '%' else '#')]
        if c.code == 'RMTH-SO1-A1':
            sets = ["name_en = %s" % q(c.statement), "name_ar = %s" % q(A1_NAME_AR),
                    "indicator_type = 'intermediate'"] + sets
        out.append("-- %s (%s, %s)\n" % (c.code, c.ctype, c.unit))
        out.append("update public.indicator i set\n  " + ",\n  ".join(sets) + "\n"
                   "  from public.municipality m\n"
                   " where m.id = i.municipality_id and m.code = 'RMTH' and i.full_code = %s;\n\n" % q(c.code))

    out.append("""-- ── 3. the open definitions ──────────────────────────────────────────────
alter table public.rmth_threshold disable trigger trg_rmth_threshold_soft_delete;
update public.rmth_threshold t set deleted_at = now()
  from public.municipality m
 where m.id = t.municipality_id and m.code = 'RMTH' and t.deleted_at is null
   and t.key in (%s);
alter table public.rmth_threshold enable trigger trg_rmth_threshold_soft_delete;

update public.rmth_threshold t set value_numeric = null, value_text = null, value_bool = null,
       decided_on = null, decided_by = null
  from public.municipality m
 where m.id = t.municipality_id and m.code = 'RMTH';

""" % ", ".join(q(k) for k in RETIRED))
    for t in THRESHOLDS:
        if t['key'] == 'c11_min_total_hours':
            out.append("insert into public.rmth_threshold (municipality_id, key, open_item, label_en, label_ar, unit, note_en, note_ar)\n"
                       "select m.id, %s, %s, %s, %s, %s, %s, %s from public.municipality m where m.code = 'RMTH';\n\n"
                       % (q(t['key']), q(t['open_item']), q(t['label_en']), q(t['label_ar']),
                          q(t['unit']) if t['unit'] else 'null', q(t['note_en']), q(t['note_ar'])))
        else:
            out.append("update public.rmth_threshold t set open_item = %s, unit = %s,\n"
                       "       label_en = %s,\n       label_ar = %s,\n       note_en = %s,\n       note_ar = %s\n"
                       "  from public.municipality m\n"
                       " where m.id = t.municipality_id and m.code = 'RMTH' and t.key = %s;\n\n"
                       % (q(t['open_item']), q(t['unit']) if t['unit'] else 'null', q(t['label_en']),
                          q(t['label_ar']), q(t['note_en']), q(t['note_ar']), q(t['key'])))

    codes = ", ".join(q(short(c.code)) for c in calcs)
    keys = ", ".join(q(t['key']) for t in THRESHOLDS)
    out.append("""-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_n int;
begin
  -- the eighteen, by the workbook's codes, each with a formula and a view name
  select count(*) into v_n from public.indicator i join public.municipality m on m.id = i.municipality_id
   where m.code = 'RMTH' and i.code in (__CODES__) and i.formula is not null and i.view_name is not null;
  if v_n <> 18 then
    raise exception '0179: % Ramtha indicators carry the workbook''s codes, a formula and a view, expected 18', v_n;
  end if;
  if exists (select 1 from public.indicator i join public.municipality m on m.id = i.municipality_id
              where m.code = 'RMTH' and i.code in ('A1.2', 'A1.3')) then
    raise exception '0179: an old code remains';
  end if;
  if exists (select 1 from public.indicator i join public.municipality m on m.id = i.municipality_id
              where m.code = 'RMTH' and i.code = 'A1' and (i.unit <> '%' or i.name_en like '%no indicator statement%')) then
    raise exception '0179: SO1-A1 has no statement';
  end if;
  -- nobody else's framework moved
  select count(*) into v_n from (
    (select * from _0179_others_before except all
     select i.* from public.indicator i join public.municipality m on m.id = i.municipality_id where m.code <> 'RMTH')
    union all
    (select i.* from public.indicator i join public.municipality m on m.id = i.municipality_id where m.code <> 'RMTH'
     except all select * from _0179_others_before)) d;
  if v_n <> 0 then
    raise exception '0179: % indicator rows of another municipality changed', v_n;
  end if;
  -- five open definitions, live, undecided; six retired
  select count(*) into v_n from public.rmth_threshold t join public.municipality m on m.id = t.municipality_id
   where m.code = 'RMTH' and t.deleted_at is null and t.key in (__KEYS__)
     and num_nonnulls(t.value_numeric, t.value_text, t.value_bool, t.decided_on) = 0;
  if v_n <> 5 then
    raise exception '0179: % open definitions live and undecided, expected 5', v_n;
  end if;
  select count(*) into v_n from public.rmth_threshold t join public.municipality m on m.id = t.municipality_id
   where m.code = 'RMTH' and t.deleted_at is null;
  if v_n <> 5 then
    raise exception '0179: % live rmth_threshold rows, expected 5', v_n;
  end if;
  -- and the guard is back on
  if not exists (select 1 from pg_trigger where tgname = 'trg_rmth_threshold_soft_delete' and tgenabled = 'O') then
    raise exception '0179: trg_rmth_threshold_soft_delete is not enabled';
  end if;
end $verify$;
""".replace('__CODES__', codes).replace('__KEYS__', keys))
    return "".join(out)


def main():
    text = render(model.build())
    applied = [p for p in glob.glob(os.path.join(MIGRATIONS, '*_' + NAME)) if not os.path.basename(p).startswith('PENDING_')]
    if applied:
        cur = io.open(applied[0], encoding='utf-8', newline='').read()
        if cur != text:
            raise SystemExit('gen_framework: %s is applied and no longer reproduces. A later change is a later migration.'
                             % os.path.basename(applied[0]))
        print('reproduces', os.path.basename(applied[0]))
        return
    path = os.path.join(MIGRATIONS, 'PENDING_' + NAME)
    io.open(path, 'w', encoding='utf-8', newline='').write(text)
    print('wrote', path)


if __name__ == '__main__':
    main()
