# -*- coding: utf-8 -*-
"""
Generates, from forms.py and the forms workbook:

  app/src/rmth/forms.generated.ts      the form definitions the screens render
  app/src/locales/en/rmth.json         English, VERBATIM from the sheets
  app/src/locales/ar/rmth.json         Arabic, drafted in forms.py

Every field's `row` must be a label in its sheet, every option and sub-label
must appear in the sheet's response-option column, and every row that carries
an enumerator note must have an Arabic note in forms.py. The generator fails
otherwise, so the labels on screen cannot drift from the workbook.

Run from the repository root:  python supabase/ramtha/gen_forms.py
"""
import io, json, os, re, sys
from collections import OrderedDict
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from forms import FORMS, DISAGG_AR, SHORT_EN, STATEMENT_AR
from lists import L as LISTS

WB = openpyxl.load_workbook(os.path.join(ROOT, 'RMTH_indicator_forms.xlsx'), read_only=True, data_only=True)

def norm(s):
    return re.sub(r'\s+', ' ', str(s)).strip()

def sheet_rows(name):
    ws = WB[name]
    rows = []
    for r in ws.iter_rows(values_only=True):
        c = [norm(v) if v is not None else '' for v in r]
        c += [''] * (3 - len(c))
        rows.append(c[:3])
    return rows

def head(rows):
    """The header block: title, who, when, calc."""
    title = rows[0][0]
    d = {'title': title.split('|', 1)[1].strip() if '|' in title else title}
    for c1, c2, _ in rows[1:9]:
        if c1 == 'Who completes this form': d['who'] = c2
        if c1 == 'When': d['when'] = c2
        if c1 == 'How the indicator is calculated from this form': d['calc'] = c2
        if c1 == 'Required disaggregation': d['disagg'] = c2
    return d

def option_lines(c2):
    """The response-option cell, split the way the sheets separate options."""
    out = []
    for part in re.split(r'\n', c2):
        p = part.strip()
        p = re.sub(r':\s*_+\s*$', '', p)
        p = re.sub(r'\s*_+\s*$', '', p)
        if p: out.append(norm(p))
    return out

def contains(hay, needle):
    return norm(needle).lower() in norm(hay).lower()

errors = []

# Every form must have Arabic for its disaggregation line. Checked here rather
# than left to the untranslated check, because that one compares en to ar and
# would only notice if the two happened to be identical -- an Arabic string
# that was never written for a NEW form would sail past it the same way
# searchPlaceholder.os did. See CLAUDE.md's eleventh register row.
_missing_short = [k for k in FORMS if k not in SHORT_EN]
if _missing_short:
    raise SystemExit('gen_forms: no SHORT_EN entry for: %s' % ', '.join(sorted(_missing_short)))
_missing_stmt = [k for k in FORMS if k not in STATEMENT_AR]
if _missing_stmt:
    raise SystemExit('gen_forms: no STATEMENT_AR entry for: %s' % ', '.join(sorted(_missing_stmt)))
_missing_disagg = [k for k in FORMS if k not in DISAGG_AR]
if _missing_disagg:
    raise SystemExit('gen_forms: no DISAGG_AR entry for: %s' % ', '.join(sorted(_missing_disagg)))
_extra_disagg = [k for k in DISAGG_AR if k not in FORMS]
if _extra_disagg:
    raise SystemExit('gen_forms: DISAGG_AR has entries for forms that do not exist: %s'
                     % ', '.join(sorted(_extra_disagg)))
en = OrderedDict(forms=OrderedDict())
ar = OrderedDict(forms=OrderedDict())
defs = OrderedDict()

for fid, f in FORMS.items():
    rows = sheet_rows(f['sheet'])
    by_label = {}
    for c1, c2, c3 in rows:
        if c1 and c1 not in by_label:
            by_label[c1] = (c2, c3)
    h = head(rows)
    fen = OrderedDict(title=h['title'], short=SHORT_EN[fid], indicator=f['indicator'], who=h.get('who', ''), when=h.get('when', ''),
                      calc=h.get('calc', ''), disaggregation=h.get('disagg', ''), sections=OrderedDict(), fields=OrderedDict())
    # Arabic mirrors English: `title` is the indicator STATEMENT (the Arabic
    # Copy's where it has one -- see STATEMENT_AR) and `short` is the name the
    # sidebar shows. Until 14 September both were the short name.
    far = OrderedDict(title=STATEMENT_AR[fid][1], short=f['title_ar'], indicator=f['indicator'], who=f['who_ar'], when=f['when_ar'],
                      calc=f['calc_ar'], disaggregation=DISAGG_AR[fid], sections=OrderedDict(), fields=OrderedDict())
    dsecs = []
    for si, s in enumerate(f['sections']):
        skey = f's{si}'
        if s['row'] not in by_label:
            errors.append(f"{fid}: section '{s['row']}' is not a row of {f['sheet']}")
        fen['sections'][skey] = s['row']
        far['sections'][skey] = s['title_ar']
        dfields = []
        for fl in s['fields']:
            row = fl['row']
            if row not in by_label:
                errors.append(f"{fid}: field row '{row}' is not a row of {f['sheet']}")
                c2, c3 = '', ''
            else:
                c2, c3 = by_label[row]
            key = fl['key']
            e = OrderedDict(label=row)
            a = OrderedDict(label=fl['label_ar'])
            if c3:
                e['help'] = c3
                if not fl.get('help_ar'):
                    errors.append(f"{fid}.{key}: the sheet has a note and forms.py has no help_ar")
                else:
                    a['help'] = fl['help_ar']
            elif fl.get('help_ar'):
                errors.append(f"{fid}.{key}: help_ar given but the sheet has no note")
            d = OrderedDict(key=key, type=fl['type'])
            for k in ('required', 'counting', 'derived', 'ref', 'other', 'question', 'table', 'kind', 'payload',
                      'components', 'ratings', 'services', 'create', 'rule', 'mirror', 'step', 'unit', 'max'):
                if k in fl and fl[k] is not None:
                    d[k] = fl[k]
            if fl.get('sub'):
                if c2 and not contains(c2, fl['sub']) and not contains(c2.replace('_', ''), fl['sub']):
                    errors.append(f"{fid}.{key}: sub-label '{fl['sub']}' not in the sheet's options cell")
                e['sub'] = fl['sub']; a['sub'] = fl['sub_ar']
            if fl.get('empty'):
                if c2 and not contains(c2, fl['empty']):
                    errors.append(f"{fid}.{key}: empty label '{fl['empty']}' not in the sheet's options cell")
                e['empty'] = fl['empty']; a['empty'] = fl['empty_ar']
            if fl.get('criterion'):
                e['criterion'] = fl['criterion']; a['criterion'] = fl['criterion_ar']
            if fl.get('options'):
                lines = option_lines(c2)
                e['opts'] = OrderedDict(); a['opts'] = OrderedDict()
                d['options'] = [o[0] for o in fl['options']]
                for val, en_txt, ar_txt in fl['options']:
                    # A `{reference}` placeholder stands where the sheet has a
                    # blank to write the record reference into ("... under
                    # record: _______"); option_lines() has already stripped
                    # the blank, so strip the placeholder the same way.
                    en_cmp = re.sub(r':\s*\{reference\}\s*$', '', en_txt)
                    if not any(contains(l, en_cmp) or contains(en_cmp, l) for l in lines):
                        errors.append(f"{fid}.{key}: option '{en_txt}' not in the sheet")
                    e['opts'][val] = en_txt; a['opts'][val] = ar_txt
            if fl.get('parts'):
                e['parts'] = OrderedDict(); a['parts'] = OrderedDict()
                d['parts'] = []
                for col, ptype, sub_en, sub_ar, cfg in fl['parts']:
                    if sub_en and c2 and not (contains(c2, sub_en) or contains(c2.replace('_', ''), sub_en)):
                        errors.append(f"{fid}.{key}: part label '{sub_en}' not in the sheet's options cell")
                    e['parts'][col] = sub_en; a['parts'][col] = sub_ar
                    pd = OrderedDict(column=col, type=ptype)
                    for k, v in cfg.items():
                        if k == 'options':
                            pd['options'] = [o[0] for o in v]
                            e.setdefault('partOpts', OrderedDict())[col] = OrderedDict((o[0], o[1]) for o in v)
                            a.setdefault('partOpts', OrderedDict())[col] = OrderedDict((o[0], o[2]) for o in v)
                        else:
                            pd[k] = v
                    d['parts'].append(pd)
            # the list a select/multi reads must exist in the catalogue
            for k in ('ref', 'question', 'components', 'ratings', 'services'):
                if k in d and d[k] not in LISTS:
                    errors.append(f"{fid}.{key}: list '{d[k]}' is not in lists.py")
            for pd in d.get('parts', []):
                for k in ('ref', 'question'):
                    if k in pd and pd[k] not in LISTS:
                        errors.append(f"{fid}.{key}.{pd['column']}: list '{pd[k]}' is not in lists.py")
            fen['fields'][key] = e
            far['fields'][key] = a
            dfields.append(d)
        dsecs.append(OrderedDict(key=skey, fields=dfields))
    en['forms'][fid] = fen
    ar['forms'][fid] = far
    defs[fid] = OrderedDict(id=fid, indicator=f['indicator'], sheet=f['sheet'], table=f['table'],
                            fixed=f['fixed'], filter=f['filter'], sections=dsecs)

if errors:
    for e in errors: print('ERROR', e)
    sys.exit(1)

# ── the screens' own strings ──────────────────────────────────────────────
common_en = OrderedDict([
    ('nav', OrderedDict([
        ('group', OrderedDict([('so1', 'Objective 1 · Job opportunities'), ('so2', 'Objective 2 · Training'), ('so3', 'Objective 3 · Entrepreneurship'), ('impact', 'Impact'), ('other', 'Other')])),
    ])),
    ('list', OrderedDict([
        ('new', 'New record'), ('empty', 'No records yet.'), ('emptyBody', 'Records entered through this form appear here, newest first.'),
        ('loadFailed', 'The list could not be loaded.'), ('search', 'Search'), ('deleted', 'Deleted'),
        ('showDeleted', 'Show deleted'), ('count', '{count, plural, =0 {No records} one {# record} other {# records}}'),
        ('columns', OrderedDict([('reference', 'Reference'), ('title', 'Title'), ('person', 'Person'), ('date', 'Date'), ('counts', 'Counts'), ('status', 'Status')])),
    ])),
    ('form', OrderedDict([
        ('newTitle', 'New: {title}'), ('editTitle', 'Edit: {title}'), ('save', 'Save'), ('saving', 'Saving…'),
        ('saved', 'Saved'), ('savedRef', 'Saved as {reference}'), ('cancel', 'Cancel'), ('back', 'Back to the list'),
        ('required', 'This field is required.'), ('assignedOnSave', 'Assigned when the record is saved.'),
        ('derivedOnSave', 'Worked out from the answers when the record is saved.'), ('notYet', 'Not yet'),
        ('specify', 'Please specify'), ('noneSelected', 'Nothing selected'), ('choose', 'Choose…'),
        ('calcTitle', 'How the indicator is calculated from this form'), ('who', 'Who completes this form'),
        ('when', 'When'), ('disaggregation', 'Required disaggregation'),
        ('countingField', 'This field produces the indicator count'),
        ('ruleTitle', 'Agreed rule'), ('ruleMissing', 'The rule has not been agreed yet (open item). Records can be entered; the indicator is not computable until the M&E lead writes the rule in the thresholds table.'),
        ('lookup', 'Look up'), ('lookingUp', 'Looking up…'), ('onFile', 'On file — name is locked; empty details can be added.'),
        ('newPerson', 'Not on file — a new person will be created.'), ('nidMismatch', 'The two numbers are different.'),
        ('nidInvalid', 'A national ID is exactly nine digits.'), ('personDeleted', 'This national ID belongs to a person who was deleted. Restore them from the Sahel Horan person screen first.'),
        ('invalid', 'Not saved. {message}'), ('notFound', 'This record no longer exists or is not yours to edit.'),
        ('unknownColumn', 'Not saved: the form sent a field the database does not know ({column}). This is a defect in the form.'),
        ('yes', 'Yes'), ('no', 'No'), ('undecided', 'Not decided'), ('decidedBy', 'Decided {when}'),
        ('gridComponent', 'Component'), ('gridRating', 'Rating'), ('serviceBegan', 'Date it began'),
        ('deliveryAdd', 'Add a delivery'), ('deliveryCycle', 'Cycle number'), ('deliveryStart', 'Start date'),
        ('deliveryEnd', 'End date'), ('deliveryLocation', 'Location'), ('deliveryEnrolled', 'Participants enrolled'),
        ('deliveryCompleting', 'Participants completing'), ('deliveryNone', 'No deliveries recorded yet.'),
        ('deliveriesSavedSeparately', 'Deliveries are saved one at a time from the programme\'s page once the programme exists.'),
        ('createEnterprise', 'New enterprise'), ('enterpriseName', 'Enterprise name'), ('mirrorEnd', 'A session is one day: the end date is the same as the date.'),
        # The inline cycle for E0.3 (the sheet's own four rows, verbatim)
        ('cycleNew', OrderedDict([
            ('open', 'Add an incubator-design cycle'), ('title', 'Title'), ('start', 'Start'), ('end', 'End'),
            ('hours', 'Total hours'), ('deliveredBy', 'Delivered by'), ('modules', 'Modules covered'),
            ('add', 'Add cycle'), ('cancel', 'Cancel'),
            ('note', 'RMTH-ID is the prefix for incubator-design cycles. The reference is assigned when the cycle is added; at least one design module must be recorded or the participant will not count.'),
        ])),
        ('recordPicker', OrderedDict([('none', 'None'), ('loadFailed', 'The list could not be loaded.')])),
    ])),
    ('detail', OrderedDict([
        ('edit', 'Edit'), ('delete', 'Delete'), ('restore', 'Restore'), ('deleteConfirm', 'Delete this record? It stops counting and can be restored later.'),
        ('deletedNote', 'This record is deleted and does not count. A coordinator can restore it.'),
        ('created', 'Created'), ('updated', 'Updated'), ('notSet', 'Not set'),
        # The evidence panel's strings are in common.json (`evidence.*`): since
        # 0128 the panel is the platform's, not Ramtha's.
        ('counts', 'Counts towards the indicator'), ('notCounts', 'Does not count'),
        ('thresholdUndecided', 'Cannot be worked out until the open item is decided'),
        ('deliveries', 'Deliveries'),
    ])),
    ('kinds', OrderedDict([('training', 'Training cycle'), ('event', 'Event'), ('enterprise', 'Enterprise')])),
    ('gate', OrderedDict([('title', 'Ramtha screens'), ('body', 'These forms belong to Ramtha Municipality. Your account works in another municipality.')])),
])
common_ar = OrderedDict([
    ('nav', OrderedDict([
        ('group', OrderedDict([('so1', 'الهدف 1 · فرص العمل'), ('so2', 'الهدف 2 · التدريب'), ('so3', 'الهدف 3 · ريادة الأعمال'), ('impact', 'الأثر'), ('other', 'أخرى')])),
    ])),
    ('list', OrderedDict([
        ('new', 'سجل جديد'), ('empty', 'لا توجد سجلات بعد.'), ('emptyBody', 'تظهر هنا السجلات المدخلة عبر هذا النموذج، الأحدث أولاً.'),
        ('loadFailed', 'تعذّر تحميل القائمة.'), ('search', 'بحث'), ('deleted', 'محذوف'),
        ('showDeleted', 'إظهار المحذوف'), ('count', '{count, plural, =0 {لا توجد سجلات} one {سجل واحد} two {سجلان} few {# سجلات} many {# سجلاً} other {# سجل}}'),
        ('columns', OrderedDict([('reference', 'المرجع'), ('title', 'العنوان'), ('person', 'الشخص'), ('date', 'التاريخ'), ('counts', 'يُحتسب'), ('status', 'الحالة')])),
    ])),
    ('form', OrderedDict([
        ('newTitle', 'جديد: {title}'), ('editTitle', 'تعديل: {title}'), ('save', 'حفظ'), ('saving', 'جارٍ الحفظ…'),
        ('saved', 'تم الحفظ'), ('savedRef', 'حُفظ بالمرجع {reference}'), ('cancel', 'إلغاء'), ('back', 'العودة إلى القائمة'),
        ('required', 'هذا الحقل مطلوب.'), ('assignedOnSave', 'يُعيَّن عند حفظ السجل.'),
        ('derivedOnSave', 'يُستخلص من الإجابات عند حفظ السجل.'), ('notYet', 'ليس بعد'),
        ('specify', 'يرجى التحديد'), ('noneSelected', 'لم يُختر شيء'), ('choose', 'اختر…'),
        ('calcTitle', 'كيف يُحتسب المؤشر من هذا النموذج'), ('who', 'من يكمل هذا النموذج'),
        ('when', 'متى'), ('disaggregation', 'التفصيل المطلوب'),
        ('countingField', 'هذا الحقل ينتج عدّ المؤشر'),
        ('ruleTitle', 'القاعدة المتفق عليها'), ('ruleMissing', 'لم يُتفق على القاعدة بعد (بند مفتوح). يمكن إدخال السجلات؛ ولا يمكن احتساب المؤشر حتى يكتب مسؤول الرصد والتقييم القاعدة في جدول الحدود.'),
        ('lookup', 'بحث'), ('lookingUp', 'جارٍ البحث…'), ('onFile', 'مسجّل - الاسم مقفل؛ يمكن إضافة التفاصيل الفارغة.'),
        ('newPerson', 'غير مسجّل - سيُنشأ شخص جديد.'), ('nidMismatch', 'الرقمان مختلفان.'),
        ('nidInvalid', 'الرقم الوطني تسعة أرقام بالضبط.'), ('personDeleted', 'هذا الرقم الوطني يعود لشخص محذوف. استعده أولاً من شاشة الأشخاص.'),
        ('invalid', 'لم يُحفظ. {message}'), ('notFound', 'هذا السجل لم يعد موجوداً أو ليس لك تعديله.'),
        ('unknownColumn', 'لم يُحفظ: أرسل النموذج حقلاً لا تعرفه قاعدة البيانات ({column}). هذا خلل في النموذج.'),
        ('yes', 'نعم'), ('no', 'لا'), ('undecided', 'لم يُقرَّر'), ('decidedBy', 'قُرِّر {when}'),
        ('gridComponent', 'المكوّن'), ('gridRating', 'التقييم'), ('serviceBegan', 'تاريخ البدء'),
        ('deliveryAdd', 'إضافة تنفيذ'), ('deliveryCycle', 'رقم الدورة'), ('deliveryStart', 'تاريخ البدء'),
        ('deliveryEnd', 'تاريخ الانتهاء'), ('deliveryLocation', 'الموقع'), ('deliveryEnrolled', 'المشاركون الملتحقون'),
        ('deliveryCompleting', 'المشاركون المتمّون'), ('deliveryNone', 'لم تُسجَّل أي عمليات تنفيذ بعد.'),
        ('deliveriesSavedSeparately', 'تُحفظ عمليات التنفيذ واحدة تلو الأخرى من صفحة البرنامج بعد إنشائه.'),
        ('createEnterprise', 'مشروع جديد'), ('enterpriseName', 'اسم المشروع'), ('mirrorEnd', 'الجلسة يوم واحد: تاريخ الانتهاء هو التاريخ نفسه.'),
        ('cycleNew', OrderedDict([
            ('open', 'إضافة دورة تصميم حاضنات'), ('title', 'العنوان'), ('start', 'البداية'), ('end', 'النهاية'),
            ('hours', 'إجمالي الساعات'), ('deliveredBy', 'مقدَّمة من'), ('modules', 'الوحدات المغطاة'),
            ('add', 'إضافة الدورة'), ('cancel', 'إلغاء'),
            ('note', 'RMTH-ID هي البادئة لدورات تصميم الحاضنات. يُعيَّن المرجع عند إضافة الدورة؛ ويجب تسجيل وحدة تصميم واحدة على الأقل وإلا فلن يُحتسب المشارك.'),
        ])),
        ('recordPicker', OrderedDict([('none', 'لا شيء'), ('loadFailed', 'تعذّر تحميل القائمة.')])),
    ])),
    ('detail', OrderedDict([
        ('edit', 'تعديل'), ('delete', 'حذف'), ('restore', 'استعادة'), ('deleteConfirm', 'حذف هذا السجل؟ سيتوقف عن الاحتساب ويمكن استعادته لاحقاً.'),
        ('deletedNote', 'هذا السجل محذوف ولا يُحتسب. يمكن للمنسق استعادته.'),
        ('created', 'أُنشئ'), ('updated', 'حُدِّث'), ('notSet', 'غير محدد'),
        ('counts', 'يُحتسب في المؤشر'), ('notCounts', 'لا يُحتسب'),
        ('thresholdUndecided', 'لا يمكن استخلاصه حتى يُقرَّر البند المفتوح'),
        ('deliveries', 'عمليات التنفيذ'),
    ])),
    ('kinds', OrderedDict([('training', 'دورة تدريب'), ('event', 'فعالية'), ('enterprise', 'مشروع')])),
    ('gate', OrderedDict([('title', 'شاشات الرمثا'), ('body', 'هذه النماذج تخص بلدية الرمثا. حسابك يعمل في بلدية أخرى.')])),
])
en.update(common_en)
ar.update(common_ar)

def write(path, text):
    io.open(path, 'w', encoding='utf-8', newline='').write(text)

write(os.path.join(ROOT, 'app', 'src', 'locales', 'en', 'rmth.json'), json.dumps(en, ensure_ascii=False, indent=2) + '\n')
write(os.path.join(ROOT, 'app', 'src', 'locales', 'ar', 'rmth.json'), json.dumps(ar, ensure_ascii=False, indent=2) + '\n')

ts = ["// GENERATED by supabase/ramtha/gen_forms.py from supabase/ramtha/forms.py and",
      "// RMTH_indicator_forms.xlsx. Do not edit; edit forms.py and regenerate.",
      "// Labels live in locales/{en,ar}/rmth.json under forms.<id>.fields.<key>.",
      "import type { RmthFormDef } from './types'",
      "",
      "export const RMTH_FORMS = " + json.dumps(defs, ensure_ascii=False, indent=2) + " as const satisfies Record<string, RmthFormDef>",
      "",
      "export type RmthFormId = keyof typeof RMTH_FORMS",
      "export const RMTH_FORM_IDS = Object.keys(RMTH_FORMS) as RmthFormId[]",
      ""]
write(os.path.join(ROOT, 'app', 'src', 'rmth', 'forms.generated.ts'), '\n'.join(ts))

n = sum(len(s['fields']) for f in defs.values() for s in f['sections'])
print('ok:', len(defs), 'forms,', n, 'fields; locales and forms.generated.ts written')
