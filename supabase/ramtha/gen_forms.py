# -*- coding: utf-8 -*-
"""
Writes the app's side of Ramtha's seven forms from model.build():

  app/src/rmth/forms.generated.ts    structure only: which column, list,
                                     junction question and condition each
                                     field has, in the terms save_rmth_record
                                     (0178) accepts
  app/src/locales/en/rmth.json       every word the Ramtha screens show, the
  app/src/locales/ar/rmth.json       sheet's own for the forms, and the
                                     screens' fixed strings below

Run from the repository root:  python supabase/ramtha/gen_forms.py
Then: node app/scripts/check-rmth-forms.mjs

Labels are the sheet's cells in both languages (Field Label En / Ar, sub-page
En / Ar, Page En / Ar, Options En / Ar for the Yes - No answers); option
labels of the lists are ref_rmth_* rows in the database (0176), never locale
keys. The two fields the owner added and the drafted Arabic of the help texts
are catalogue.py's, named there.
"""
import io, json, os, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import catalogue as C  # noqa: E402
import model  # noqa: E402

# ── the screens' fixed strings ───────────────────────────────────────────────
#
# (en, ar) pairs. The form, list and detail screens build these keys from
# fixed names; check-rmth-forms.mjs fails when one is missing in either
# language, and every key built from a CODE (a group, a refusal, a threshold
# item) is listed there from this same table.
STRINGS = OrderedDict([
    ('nav.group.definitions', ('Definitions', 'التعريفات')),
    ('nav.thresholds', ('Open items', 'البنود المفتوحة')),
    ('objective.impact', ('Impact', 'الأثر')),
    ('objective.so1', ('SO1 · Job opportunities', 'SO1 · فرص العمل')),
    ('objective.so2', ('SO2 · Training', 'SO2 · التدريب')),
    ('objective.so3', ('SO3 · Entrepreneurship', 'SO3 · ريادة الأعمال')),

    ('list.new', ('New record', 'سجل جديد')),
    ('list.empty', ('No records yet.', 'لا توجد سجلات بعد.')),
    ('list.emptyBody', ('Records entered through this form appear here, newest first.',
                        'تظهر هنا السجلات المدخلة عبر هذا النموذج، الأحدث أولاً.')),
    ('list.deleted', ('Deleted', 'محذوف')),
    ('list.showDeleted', ('Show deleted', 'إظهار المحذوف')),
    ('list.status', ('Status', 'الحالة')),
    ('list.public', ('Public page', 'الصفحة العامة')),
    ('list.published', ('Published', 'منشور')),
    ('list.notPublished', ('Not published', 'غير منشور')),

    ('form.newTitle', ('New: {title}', 'جديد: {title}')),
    ('form.editTitle', ('Edit: {title}', 'تعديل: {title}')),
    ('form.save', ('Save', 'حفظ')),
    ('form.saving', ('Saving…', 'جارٍ الحفظ…')),
    ('form.saved', ('Saved', 'تم الحفظ')),
    ('form.savedRef', ('Saved as {reference}', 'حُفظ بالرقم {reference}')),
    ('form.cancel', ('Cancel', 'إلغاء')),
    ('form.back', ('Back to the list', 'العودة إلى القائمة')),
    ('form.required', ('This field is required.', 'هذا الحقل مطلوب.')),
    ('form.specify', ('Please specify', 'يرجى التحديد')),
    ('form.range', ('From {min} to {max}.', 'من {min} إلى {max}.')),
    ('form.positive', ('More than zero.', 'أكثر من صفر.')),
    ('form.wholeNumber', ('A whole number.', 'عدد صحيح.')),
    ('form.year', ('Four digits, not after {year}.', 'أربعة أرقام، ولا تتجاوز {year}.')),
    ('form.future', ('Cannot be after today.', 'لا يمكن أن يكون بعد اليوم.')),
    ('form.notBefore', ('Cannot be before {label}.', 'لا يمكن أن يكون قبل {label}.')),
    ('form.notAfter', ('Cannot be after {label}.', 'لا يمكن أن يكون بعد {label}.')),
    ('form.noneExclusive', ('"None" cannot be ticked with another answer.', 'لا يمكن اختيار "لا يوجد" مع إجابة أخرى.')),
    ('form.assignedOnSave', ('Issued when the record is saved.', 'يُصدر عند حفظ السجل.')),
    ('form.stampedOnSave', ('Recorded when the survey is saved.', 'يُسجَّل عند حفظ الاستبيان.')),
    ('form.calcOnSave', ('Worked out from the year of birth when the record is saved.',
                         'يُحتسب من سنة الميلاد عند حفظ السجل.')),
    ('form.notAsked', ('Not asked for the answer chosen.', 'غير مطلوب للإجابة المختارة.')),
    ('form.activityFirst', ('Choose the activity first: the questions depend on its category.',
                            'اختر النشاط أولاً: الأسئلة تعتمد على فئته.')),
    ('form.lookingUp', ('Looking up…', 'جارٍ البحث…')),
    ('form.onFile', ('On file — the name is locked.', 'مسجّل — الاسم مقفل.')),
    ('form.newPerson', ('Not on file — a new person will be registered.', 'غير مسجّل — سيُسجَّل شخص جديد.')),
    ('form.nidInvalid', ('A national ID is exactly nine digits.', 'الرقم الوطني تسعة أرقام بالضبط.')),
    ('form.personLocked', ('The person cannot change on a saved registration.', 'لا يمكن تغيير الشخص في تسجيل محفوظ.')),
    ('form.alreadyRegistered', ('This national ID is already in the register.', 'هذا الرقم الوطني مسجّل بالفعل في السجل.')),
    ('form.openRegistration', ('Open the registration', 'فتح التسجيل')),
    ('form.registrationDeleted', ("This person's registration was deleted. It is restored from its page, never entered again.",
                                  'حُذف تسجيل هذا الشخص. يُستعاد من صفحته، ولا يُدخل مرة أخرى.')),
    ('form.openDeleted', ('Open the deleted registration', 'فتح التسجيل المحذوف')),
    ('form.personDeleted', ('This national ID belongs to a person who was deleted. A coordinator restores them; they are never entered again.',
                            'هذا الرقم الوطني يعود لشخص محذوف. يستعيده المنسق؛ ولا يُدخل مرة أخرى.')),
    ('form.deletedBy', ('Deleted {when} by {by}.', 'حُذف في {when} بواسطة {by}.')),
    ('form.deletedWhen', ('Deleted {when}.', 'حُذف في {when}.')),
    ('form.restore', ('Restore', 'استعادة')),
    ('form.restored', ('Restored. Save again.', 'تمت الاستعادة. احفظ مرة أخرى.')),
    ('form.coordinatorOnly', ('Only a coordinator can restore a person.', 'المنسق وحده يستطيع استعادة الشخص.')),
    ('form.picker.none', ('Choose…', 'اختر…')),
    ('form.picker.loadFailed', ('The list could not be loaded.', 'تعذّر تحميل القائمة.')),
    ('form.picker.empty', ('Nothing to choose yet.', 'لا يوجد ما يُختار بعد.')),
    ('form.picker.register', ('People in the Person Register (FORM-01).', 'الأشخاص المسجلون في سجل المستفيدين (FORM-01).')),
    ('form.picker.surveyed', ('Networking events and employability trainings only: this survey asks about those.',
                              'فعاليات التشبيك وتدريبات قابلية التوظيف فقط: هذا الاستبيان يسأل عنها.')),
    ('form.notSaved', ('Not saved', 'لم يُحفظ')),
    ('form.invalid', ('The database refused the record: {message}', 'رفضت قاعدة البيانات السجل: {message}')),
    ('form.notFound', ('This record no longer exists or is not yours to edit.', 'هذا السجل لم يعد موجوداً أو ليس لك تعديله.')),
    ('form.unknownColumn', ('The form sent a field the database does not know ({column}). This is a defect in the form.',
                            'أرسل النموذج حقلاً لا تعرفه قاعدة البيانات ({column}). هذا خلل في النموذج.')),
    ('form.unknownBlock', ('The form sent a part the database does not accept ({block}). This is a defect in the form.',
                           'أرسل النموذج جزءاً لا تقبله قاعدة البيانات ({block}). هذا خلل في النموذج.')),
    # refusals named by field (rmth_<field>_<rule>, 0177 / 0178), worded from the field's label
    ('form.rule.required', ('{label}: required for the answer chosen.', '{label}: مطلوب للإجابة المختارة.')),
    ('form.rule.not_applicable', ('{label}: belongs to an answer that is not chosen; leave it empty.',
                                  '{label}: يخص إجابة غير مختارة؛ اتركه فارغاً.')),
    ('form.rule.not_registered', ('{label}: this person is not in the Person Register (FORM-01). Register them there first.',
                                  '{label}: هذا الشخص غير مسجّل في سجل المستفيدين (FORM-01). سجّله هناك أولاً.')),
    ('form.rule.deleted', ('{label}: the record chosen has been deleted.', '{label}: السجل المختار محذوف.')),
    ('form.rule.future', ('{label}: cannot be after today.', '{label}: لا يمكن أن يكون بعد اليوم.')),
    ('form.rule.in_use', ('{label}: cannot change, because participation or feedback has been recorded for this activity.',
                          '{label}: لا يمكن تغييره، لأن مشاركة أو رأياً سُجّل لهذا النشاط.')),
    ('form.rule.none_exclusive', ('{label}: "None" cannot be ticked with another answer.',
                                  '{label}: لا يمكن اختيار "لا يوجد" مع إجابة أخرى.')),
    ('form.rule.not_surveyed', ('{label}: this survey asks nothing about this kind of activity.',
                                '{label}: هذا الاستبيان لا يسأل عن هذا النوع من الأنشطة.')),
    ('form.rule.specify', ('{label}: please specify the "Other".', '{label}: يرجى تحديد "أخرى".')),
    ('form.rule.locked', ('{label}: cannot change on a saved registration.', '{label}: لا يمكن تغييره في تسجيل محفوظ.')),
    ('form.rule.person_deleted', ('{label}: belongs to a person who was deleted.', '{label}: يعود لشخص محذوف.')),
    # the table constraints a screen can meet (0177), by name
    ('form.constraint.rmth_participation_once_per_activity', ('This person is already recorded on this activity.',
                                                              'هذا الشخص مسجّل بالفعل في هذا النشاط.')),
    ('form.constraint.rmth_feedback_once_per_activity', ('This person has already answered for this activity.',
                                                         'أجاب هذا الشخص بالفعل عن هذا النشاط.')),
    ('form.constraint.rmth_activity_end_after_start', ('The end date cannot be before the start date.',
                                                       'لا يمكن أن يكون تاريخ الانتهاء قبل تاريخ البدء.')),
    ('form.constraint.rmth_followup_first_placement_by_followup', ('The first placement date cannot be after the follow-up date.',
                                                                   'لا يمكن أن يكون تاريخ أول التحاق بعد تاريخ المتابعة.')),
    ('form.constraint.rmth_followup_continuous_by_followup', ('Working continuously since cannot be after the follow-up date.',
                                                              'لا يمكن أن يكون تاريخ العمل المتواصل بعد تاريخ المتابعة.')),
    ('form.constraint.rmth_followup_income_months_of_six', ('Months with income is from 0 to 6.',
                                                            'عدد الأشهر ذات الدخل من 0 إلى 6.')),
    ('form.constraint.rmth_activity_contact_hours_positive', ('Contact hours must be more than zero.',
                                                              'يجب أن تكون الساعات التدريبية أكثر من صفر.')),
    ('form.constraint.rmth_activity_sessions_positive', ('Sessions delivered must be more than zero.',
                                                         'يجب أن يكون عدد الجلسات أكثر من صفر.')),
    ('form.constraint.rmth_beneficiary_year_of_birth_four_digits', ('The year of birth is four digits.',
                                                                    'سنة الميلاد أربعة أرقام.')),
    ('form.constraint.national_id_format', ('A national ID is exactly nine digits.', 'الرقم الوطني تسعة أرقام بالضبط.')),

    ('detail.edit', ('Edit', 'تعديل')),
    ('detail.delete', ('Delete', 'حذف')),
    ('detail.restore', ('Restore', 'استعادة')),
    ('detail.deleteConfirm', ('Delete this record? It stops counting and can be restored later.',
                              'حذف هذا السجل؟ سيتوقف عن الاحتساب ويمكن استعادته لاحقاً.')),
    ('detail.deletedNote', ('This record is deleted and does not count. A coordinator can restore it.',
                            'هذا السجل محذوف ولا يُحتسب. يمكن للمنسق استعادته.')),
    ('detail.created', ('Created', 'أُنشئ')),
    ('detail.updated', ('Updated', 'حُدِّث')),
    ('detail.notSet', ('Not set', 'غير محدد')),
    ('detail.notAsked', ('Not asked', 'غير مطلوب')),
    ('detail.feeds', ('Feeds', 'يغذي')),
    ('detail.publish.note', ("Published activities appear on Ramtha's public page with their category, type, sector and dates, "
                             'until the day after they end. A business incubator stays listed while it is published.',
                             'تظهر الأنشطة المنشورة على الصفحة العامة لبلدية الرمثا بفئتها ونوعها وقطاعها وتواريخها، '
                             'حتى اليوم التالي لانتهائها. وتبقى حاضنة الأعمال مدرجة ما دامت منشورة.')),

    ('gate.title', ('Ramtha screens', 'شاشات الرمثا')),
    ('gate.body', ('These forms belong to Ramtha Municipality. Your account works in another municipality.',
                   'هذه النماذج تخص بلدية الرمثا. حسابك يعمل في بلدية أخرى.')),

    ('thresholds.title', ('Open items', 'البنود المفتوحة')),
    ('thresholds.intro', ('The definitions the Calculation Method sheet marks REQUIRES CONFIRMATION and leaves open. '
                          'Each is a value the indicator views read; while it is empty the indicator that depends on it '
                          'is not computable — never zero. A coordinator writes the decision here, with the date; '
                          'nothing else changes.',
                          'التعريفات التي تشير ورقة طريقة الاحتساب إلى أنها تحتاج إلى تأكيد وتتركها مفتوحة. كل منها قيمة '
                          'تقرأها عروض المؤشرات؛ وما دامت فارغة فالمؤشر المعتمد عليها غير قابل للاحتساب - وليس صفراً أبداً. '
                          'يكتب المنسق القرار هنا مع تاريخه؛ ولا يتغير شيء آخر.')),
    ('thresholds.notDecided', ('Not decided', 'لم يُقرَّر')),
    ('thresholds.yes', ('Yes', 'نعم')),
    ('thresholds.no', ('No', 'لا')),
    ('thresholds.value', ('Value', 'القيمة')),
    ('thresholds.rule', ('Rule, as it will be applied', 'القاعدة كما ستُطبَّق')),
    ('thresholds.decide', ('Decide', 'قرِّر')),
    ('thresholds.save', ('Save decision', 'حفظ القرار')),
    ('thresholds.decidedOn', ('decided {date}', 'قُرِّر في {date}')),
    ('thresholds.blocks', ('Waiting on this', 'بانتظار هذا البند')),
    ('thresholds.item.sustained_engagement', ('Sustained employment (IMP-0)', 'التشغيل المستدام (IMP-0)')),
    ('thresholds.item.short_term_intensive', ('Short-term intensive (C1.1)', 'قصير الأمد ومكثف (C1.1)')),
    ('thresholds.item.regular_income', ('Regular income (SO3-0)', 'الدخل المنتظم (SO3-0)')),
    ('thresholds.item.programmes_or_sessions', ('Programmes or sessions (F0.2)', 'البرامج أم الجلسات (F0.2)')),
    ('thresholds.choice.f02_counting_reading.programmes', ('Programmes (FORM-03 records)', 'البرامج (سجلات FORM-03)')),
    ('thresholds.choice.f02_counting_reading.sessions', ('Sessions delivered (sum of AC-11)', 'الجلسات المنفذة (مجموع AC-11)')),

    # C1.2's formula: "Cumulative total = COUNT(DISTINCT PA-02) across all periods"
    ('dashboard.unique.C1.2', ('{count, plural, one {# person} other {# people}} to date, each counted once',
                               '{count, plural, =0 {لا أحد} one {شخص واحد} two {شخصان} few {# أشخاص} many {# شخصاً} other {# شخص}} حتى الآن، كلٌّ مرة واحدة')),
])

# The threshold items the Open items screen orders by (rmth_threshold.open_item, 0179).
THRESHOLD_ITEMS = ['sustained_engagement', 'short_term_intensive', 'regular_income', 'programmes_or_sessions']


def put(tree, path, value):
    cur = tree
    parts = path.split('.')
    # "dashboard.unique.C1.2": the code keeps its dot
    if parts[:2] == ['dashboard', 'unique']:
        parts = ['dashboard', 'unique', '.'.join(parts[2:])]
    for p in parts[:-1]:
        cur = cur.setdefault(p, OrderedDict())
    cur[parts[-1]] = value


def short(code):
    parts = code.split('-')
    return '-'.join(parts[1:]) if parts[2] == '0' else parts[2]


def build():
    m = model.build()
    order = [c.code for c in m['calcs']]
    rank = {code: i for i, code in enumerate(order)}
    slug = {f['form']: f['slug'] for f in C.FORMS}

    forms = OrderedDict()
    en, ar = OrderedDict(), OrderedDict()
    en['forms'], ar['forms'] = OrderedDict(), OrderedDict()
    groups = OrderedDict()
    for form in m['forms']:
        spec = form['spec']
        fid = spec['slug']
        groups.setdefault(spec['group'], (form['page_en'], form['page_ar']))
        fields = []
        fen, far = OrderedDict(), OrderedDict()
        for x in form['fields']:
            s = x['spec']
            d = OrderedDict([('id', x['id']), ('kind', s['kind'])])
            for k in ('column', 'list', 'other', 'question', 'exclusive', 'table', 'categories', 'min', 'max',
                      'maxCurrentYear', 'notFuture', 'notBefore', 'notAfter', 'positive'):
                if k in s:
                    d[k] = s[k]
            if x['required']:
                d['required'] = True
            if s.get('when'):
                d['when'] = s['when']
            if x['added']:
                d['added'] = True
            fields.append(d)
            le = OrderedDict([('label', x['label_en'])])
            la = OrderedDict([('label', x['label_ar'])])
            if x['help_en']:
                le['help'], la['help'] = x['help_en'], x['help_ar']
            if s['kind'] == 'bool':
                le['opts'] = OrderedDict([('true', x['opts_en'][0]), ('false', x['opts_en'][1])])
                la['opts'] = OrderedDict([('true', x['opts_ar'][0]), ('false', x['opts_ar'][1])])
            fen[x['id']], far[x['id']] = le, la
        d = OrderedDict([('id', fid), ('sheet', spec['form']), ('table', spec['table']), ('group', spec['group']),
                         ('writer', spec['writer'])])
        if spec.get('reference'):
            d['reference'] = spec['reference']
        if spec.get('published'):
            d['published'] = True
        d['indicators'] = sorted(form['indicators'], key=lambda c: rank.get(c, 99))
        d['list'] = spec['list']
        d['fields'] = fields
        forms[fid] = d
        en['forms'][fid] = OrderedDict([('title', form['title_en']), ('short', form['title_en']), ('fields', fen)])
        ar['forms'][fid] = OrderedDict([('title', form['title_ar']), ('short', form['title_ar']), ('fields', far)])

    for key, (pen, par) in groups.items():
        put(en, 'nav.group.' + key, pen)
        put(ar, 'nav.group.' + key, par)
    for path, (e, a) in STRINGS.items():
        put(en, path, e)
        put(ar, path, a)

    indicator_forms = OrderedDict()
    for c in m['calcs']:
        indicator_forms[short(c.code)] = [slug[f] for f in C.indicator_forms(c.fields)]
    return forms, list(groups.keys()), indicator_forms, en, ar


def ts(forms, groups, indicator_forms):
    out = [
        '// GENERATED by supabase/ramtha/gen_forms.py from RMTH_Forms_and_Calculations_v2.xlsx',
        '// (workbook.py) and supabase/ramtha/catalogue.py. Do not edit; edit the catalogue',
        '// and regenerate. Labels live in locales/{en,ar}/rmth.json under',
        '// forms.<id>.fields.<Field ID>; option labels are ref_rmth_* rows in the database (0176).',
        "import type { RmthFormDef } from './types'",
        '',
        'export const RMTH_FORMS = ' + json.dumps(forms, ensure_ascii=False, indent=2) + ' as const satisfies Record<string, RmthFormDef>',
        '',
        'export type RmthFormId = keyof typeof RMTH_FORMS',
        'export const RMTH_FORM_IDS = Object.keys(RMTH_FORMS) as RmthFormId[]',
        '',
        "/** The workbook's pages (Page En), in the order the forms first appear on them: the sidebar's groups. */",
        'export const RMTH_GROUPS = ' + json.dumps(groups) + ' as const',
        '',
        '/**',
        ' * The forms an indicator is entered through, by its short code, from the Calculation',
        ' * Method sheet\'s "Required Field(s)" (catalogue.indicator_forms): the first field of',
        ' * each group names a form; FORM-01 supplies breakdowns, never the count.',
        ' */',
        'export const RMTH_INDICATOR_FORMS: Readonly<Record<string, readonly RmthFormId[]>> = '
        + json.dumps(indicator_forms, indent=2),
        '',
    ]
    return '\n'.join(out)


def write(path, text):
    io.open(path, 'w', encoding='utf-8', newline='').write(text)


def main():
    forms, groups, indicator_forms, en, ar = build()
    write(os.path.join(ROOT, 'app', 'src', 'rmth', 'forms.generated.ts'), ts(forms, groups, indicator_forms))
    write(os.path.join(ROOT, 'app', 'src', 'locales', 'en', 'rmth.json'), json.dumps(en, ensure_ascii=False, indent=2) + '\n')
    write(os.path.join(ROOT, 'app', 'src', 'locales', 'ar', 'rmth.json'), json.dumps(ar, ensure_ascii=False, indent=2) + '\n')
    n = sum(len(f['fields']) for f in forms.values())
    print('ok: %d forms, %d fields; forms.generated.ts and both rmth.json written' % (len(forms), n))


if __name__ == '__main__':
    main()
