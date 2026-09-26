# -*- coding: utf-8 -*-
"""
Generates, from the workbook and the catalogue (through model.build()):

  app/src/khld/forms.generated.ts      the 23 form definitions the screens render
  app/src/locales/en/khld.json         English
  app/src/locales/ar/khld.json         Arabic

Every label under forms.<id> is the sheet's, in both languages: the title is
the form's sub-page (Page En / Page Ar of 'Forms needed'), a field's label is
its Field Label En / Ar, a yes/no answer and a 1-5 scale are the words
catalogue.py typed and model.py held to the sheet's option cell. Option lists
are not here: they are ref_khld_* rows (0156, 0157), seeded from the same
catalogue.

What is NOT the sheet's is named, and written here once:

  - SHORT          the sidebar name of each form (catalogue.FORMS short=)
  - DRAFTED        the Arabic the sheet does not have: three help texts
                   (the Help Text column is English only) and the label of
                   F160's added option, "General park visit" (the Dependency
                   column names it in English). 06_OPEN_QUESTIONS.md lists
                   them for the M&E lead to confirm.
  - LIST           which fields the list screen shows as columns
  - the static block at the end: the screens' own words

The definitions are structure only. Every field says which column, question
or junction it writes, in the terms save_khld_record (0161) accepts, and
which answers of which other field it belongs to (`when`), so the screens
carry answers to the payload without knowing the sheets. The same `when`
rules are khld_field_rule rows (0158), which is what refuses.

Checks (the generator fails, so a label cannot drift from the workbook):
  - every field has an English and an Arabic label
  - every form has a title in both languages and a short name
  - every LIST entry is a field of its form
  - every static key has both languages, and differs between them

Run from anywhere:  python3 supabase/khalidiyah/gen_forms.py
"""
import io, json, os, re, sys
from collections import OrderedDict as O

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import model as M
import catalogue as C

m = M.build()
errors = []


def err(s):
    errors.append(s)


# ── what the sheet does not say in Arabic (06_OPEN_QUESTIONS.md, OQ-68) ─────
DRAFTED = {
    ('F136', 'help'): ('Mixed groups, teams or joint tasks between the two communities',
                       'مجموعات أو فرق مختلطة أو مهام مشتركة بين المجتمعين'),
    ('F158', 'help'): ('if no then end survey', 'إذا كانت الإجابة لا، ينتهي الاستبيان'),
    ('F162', 'help'): ('Respondents under 15 are not surveyed', 'لا يُستطلع رأي من هم دون 15 عاماً'),
    # the Dependency column: prepopulated from FORM-08 <F129> + "General park visit"
    ('F160', 'extra'): ('General park visit', 'زيارة عامة للحديقة'),
    # the Dependency column: prepopulated <F004> + "Other"; the sheet's own Arabic for Other
    ('F181', 'extra'): ('Other', 'أخرى'),
}

# ── the list screen's columns: the app's choice, fields of the form ──────────
LIST = {
    'form01': ['F001', 'F002', 'F003'],
    'form02': ['F004', 'F006', 'F115'],
    'form04': ['F010', 'F011', 'F013', 'F015'],
    'form05': ['F016', 'F117', 'F119'],
    'form20': ['F173', 'F174', 'F179'],
    'form21': ['F181', 'F183', 'F184', 'F186'],
    'form22': ['F189', 'F194', 'F195'],
    'form06': ['F021', 'F020', 'F122'],
    'form07': ['F023', 'F024', 'F126', 'F127'],
    'form08': ['F129', 'F031', 'F034', 'F130'],
    'form09': ['F037', 'F038', 'F039'],
    'form19': ['F159', 'F160', 'F158'],
    'form10': ['F048', 'F141', 'F140'],
    'form11': ['F051', 'F142', 'F143'],
    'form12': ['F055', 'F058', 'F063'],
    'form13': ['F068', 'F070', 'F147'],
    'form14': ['F073', 'F074', 'F149', 'F150'],
    'form15': ['F080', 'F083', 'F088'],
    'form23': ['F197', 'F198', 'F199'],
    'form16': ['F091', 'F092', 'F154', 'F094'],
    'form17': ['F101', 'F104', 'F155'],
    'form18': ['F110', 'F157', 'F112'],
    'form24': ['F205', 'F206', 'F207', 'F208'],
}


def field_def(f):
    """One field as the screens read it."""
    s = f.spec
    d = O(id=f.fid, kind=f.kind)
    if f.col:
        d['column'] = f.col
    if f.required:
        d['required'] = True
    if f.when:
        d['when'] = [O(field=g, values=list(v)) for g, v in f.when]
    if f.kind in ('select', 'id_type', 'person_sex', 'multi'):
        d['list'] = f.list
    if f.kind in ('select', 'id_type') and any(C.free(c) for c, _e, _a in C.LISTS[f.list]):
        d['other'] = f.col[:-3] + '_other'
    if f.kind == 'multi':
        d['question'] = f.key
    if f.kind == 'likert':
        d['scale'] = s['scale']
    if f.kind in ('record', 'records'):
        d['table'] = s['table']
    if f.kind == 'person_ref':
        d['table'] = s['source']
    if s.get('window'):
        d['window'] = list(s['window'])
    if s.get('extra'):
        code, col = s['extra']
        d['extra'] = O(code=code)
        if col:
            d['extra']['column'] = col
    if s.get('confirmed'):
        d['confirmed'] = True
    if s.get('held'):
        d['held'] = True
    if f.kind == 'file':
        d['maxFiles'] = s.get('max', 5)
    if f.kind == 'shown':
        d['of'] = s['of']
    if s.get('ltr'):
        d['ltr'] = True
    if 'min' in s:
        d['min'] = s['min']
    if f.kind == 'percent':
        d['min'], d['max'] = 0, 100
    if s.get('must_be_true'):
        d['mustBeTrue'] = True
    return d


def field_labels(f):
    """(en, ar) locale entries for one field."""
    e, a = O(label=f.label_en), O(label=f.label_ar)
    if not f.label_en or not f.label_ar:
        err('%s: label missing in %s' % (f.fid, 'en' if not f.label_en else 'ar'))
    if (f.fid, 'help') in DRAFTED:
        he, ha = DRAFTED[(f.fid, 'help')]
        if f.help_en and f.help_en != he:
            err('%s: the sheet\'s help text is now %r, not %r' % (f.fid, f.help_en, he))
        e['help'], a['help'] = he, ha
    if f.kind == 'bool':
        (te, ta), (fe, fa) = f.spec.get('labels', C.YES_NO)
        e['opts'] = O([('true', te), ('false', fe)])
        a['opts'] = O([('true', ta), ('false', fa)])
    if f.kind == 'likert':
        e['opts'] = O((c, en) for c, en, _ar in C.SCALES[f.spec['scale']])
        a['opts'] = O((c, ar) for c, _en, ar in C.SCALES[f.spec['scale']])
    if f.spec.get('extra'):
        if (f.fid, 'extra') not in DRAFTED:
            err('%s: the added option has no label' % f.fid)
        else:
            xe, xa = DRAFTED[(f.fid, 'extra')]
            if xe not in f.sheet.dependency:
                err('%s: the Dependency column no longer names %r: %r' % (f.fid, xe, f.sheet.dependency))
            e['extra'], a['extra'] = xe, xa
    return e, a


en = O(forms=O())
ar = O(forms=O())
defs = O()

for fid, fm in m.forms.items():
    meta = C.FORMS[fid]
    short_en, short_ar = meta['short']
    if not fm.title_en or not fm.title_ar:
        err('%s: the sub-page title is missing in %s' % (fid, 'en' if not fm.title_en else 'ar'))
    fe = O(title=fm.title_en, short=short_en, fields=O())
    fa = O(title=fm.title_ar, short=short_ar, fields=O())
    fields = []
    inds = []
    for f in fm.fields:
        fields.append(field_def(f))
        le, la = field_labels(f)
        fe['fields'][f.fid] = le
        fa['fields'][f.fid] = la
        for x in f.sheet.indicators:
            if x not in inds:
                inds.append(x)
    ids = {f.fid for f in fm.fields}
    for x in LIST.get(fid, []):
        if x not in ids:
            err('%s: LIST names %s, which is not on the form' % (fid, x))
    if fid not in LIST:
        err('%s: no LIST' % fid)
    d = O(id=fid, sheets=list(fm.sheets), table=fm.table, group=fm.group, writer=meta['writer'])
    if meta.get('ref'):
        d['reference'] = 'KHLD-' + meta['ref'][0]
    if meta.get('published'):
        d['published'] = True
    if meta.get('public'):
        d['public'] = True
    d['indicators'] = inds
    d['list'] = LIST.get(fid, [])
    d['fields'] = fields
    defs[fid] = d
    en['forms'][fid] = fe
    ar['forms'][fid] = fa

# the indicator -> form map the dashboard's source chips read (catalogue.INDICATOR_FORM)
for code, fid in C.INDICATOR_FORM.items():
    if fid not in defs:
        err('INDICATOR_FORM %s names %s, which is not a form' % (code, fid))

# ── the screens' own words ──────────────────────────────────────────────────
S_EN = O([
    ('nav', O([
        ('group', O((k, v[0]) for k, v in C.GROUPS.items())),
    ])),
    ('list', O([
        ('new', 'New record'), ('empty', 'No records yet.'),
        ('emptyBody', 'Records entered through this form appear here, newest first.'),
        ('deleted', 'Deleted'), ('showDeleted', 'Show deleted'),
        ('count', '{count, plural, =0 {No records} one {# record} other {# records}}'),
        ('reference', 'Reference'), ('status', 'Status'),
        ('onlySubmitted', 'Waiting for review only'),
    ])),
    ('form', O([
        ('newTitle', 'New: {title}'), ('editTitle', 'Edit: {title}'), ('save', 'Save'), ('saving', 'Saving…'),
        ('saved', 'Saved'), ('savedRef', 'Saved as {reference}'), ('cancel', 'Cancel'), ('back', 'Back to the list'),
        ('required', 'This field is required.'), ('specify', 'Please specify'), ('choose', 'Choose…'),
        ('assignedOnSave', 'Assigned when the record is saved.'),
        ('stampedOnSave', 'The date and time of saving.'),
        ('filesAfterSave', 'Files are attached once the record is saved, on its page.'),
        ('shownFrom', 'Shown from the record chosen above.'),
        ('notApplicable', 'Not asked with the answer given above.'),
        ('lookingUp', 'Looking up…'), ('onFile', 'On file — the name is locked; empty details can be added.'),
        ('newPerson', 'Not on file — a new person will be created.'),
        ('idTypeFirst', 'Choose the ID type first.'),
        ('nidInvalid', 'A national ID is exactly nine digits.'),
        ('idEmpty', 'Enter the number as written on the document.'),
        ('phoneOnFile', 'On file. A number already recorded is never overwritten.'),
        ('personLocked', 'The person is fixed once the record is saved.'),
        ('min', 'At least {min}.'), ('range', 'Between {min} and {max}.'),
        ('invalid', 'Not saved. {message}'), ('notSaved', 'Not saved'),
        ('ruleRequired', '"{label}" is required with the answers given.'),
        ('ruleNotApplicable', '"{label}" is not asked with the answers given, so it must be left empty.'),
        ('notFound', 'This record no longer exists or is not yours to edit.'),
        ('unknownColumn', 'Not saved: the form sent a field the database does not know ({column}). This is a defect in the form.'),
        ('unknownBlock', 'Not saved: the form sent a block this table does not take ({block}). This is a defect in the form.'),
        ('yes', 'Yes'), ('no', 'No'),
        ('picker', O([
            ('none', 'None'), ('loadFailed', 'The list could not be loaded.'),
            ('window', 'Only those open today are listed.'),
            ('confirmed', 'Only partners whose outreach confirmed the partnership are listed.'),
            ('held', 'Only markets marked held are listed.'),
            ('fromSource', 'Only people registered on {form} are listed.'),
            ('noneToChoose', 'Nothing to choose yet.'),
        ])),
        ('occasion', O([('campaign', 'Volunteer campaign'), ('activity', 'Community activity')])),
        ('deleted', O([
            ('person', 'This identifier belongs to a person who was deleted.'),
            ('who', 'Deleted {when} by {by}'), ('whoUnknown', 'Deleted {when}'),
            ('restoreNote', 'Restoring puts their records back into every Khalidiyah figure that counts them, including quarters already reported.'),
            ('restore', 'Restore and continue'), ('restored', 'Restored. Save again to continue.'),
            ('coordinatorOnly', 'Only a coordinator can restore. Ask one, then save again.'),
        ])),
    ])),
    ('detail', O([
        ('edit', 'Edit'), ('delete', 'Delete'), ('restore', 'Restore'),
        ('deleteConfirm', 'Delete this record? It stops counting and can be restored later.'),
        ('deletedNote', 'This record is deleted and does not count. A coordinator can restore it.'),
        ('created', 'Created'), ('updated', 'Updated'), ('notSet', 'Not set'),
        ('feeds', 'Feeds'),
        ('files', O([
            ('requiredMissing', 'The form asks for at least one file here; none is attached yet.'),
            ('max', 'Up to {max} files.'),
        ])),
        ('publish', O([
            ('title', 'Public page'), ('on', 'Published'), ('off', 'Not published'),
            ('publish', 'Publish on the public page'), ('unpublish', 'Take off the public page'),
            ('note', 'The public page at /khalidiyah lists published activities and markets that have not ended: the title, the type, the dates and the description, and nothing else.'),
        ])),
        ('review', O([
            ('title', 'Registration'),
            ('submitted', 'Waiting for review'), ('approved', 'Approved'), ('rejected', 'Not accepted'),
            ('approve', 'Approve'), ('reject', 'Do not accept'), ('reopen', 'Back to waiting'),
            ('public', 'Registered by the volunteer on the public page.'),
            ('staff', 'Entered by staff.'),
            ('note', 'A registration counts towards the volunteer figures only once approved.'),
            ('reviewedOn', 'Reviewed {when}'),
        ])),
    ])),
    ('gate', O([('title', 'Khalidiyah screens'), ('body', 'These forms belong to Al Khalidiyah Municipality. Your account works in another municipality.')])),
    ('objective', O([
        ('impact', 'IMPACT · Social cohesion and shared participation'),
        ('so1', 'SO1 · Partnerships'),
        ('so2', 'SO2 · The park'),
        ('so3', 'SO3 · Volunteering'),
        ('so4', 'SO4 · Home-based enterprises and markets'),
    ])),
    ('dashboard', O([
        ('planTarget', 'Plan target'),
        ('planTargetNote', 'The Plan states targets for the whole period, by year or as a percentage; none is split into quarters. The quarterly column therefore reads "not set", never zero.'),
        # the second figure beside a row: labelled so nobody sums it with the first
        ('unique', O([
            ('A3', '{count, plural, one {# contribution} other {# contributions}}'),
            ('H1', '{count, plural, one {# market held} other {# markets held}}'),
            ('H2', '{count, plural, one {# unique vendor} other {# unique vendors}}'),
        ])),
    ])),
    ('volunteer', O([
        ('title', 'Volunteer with the Municipality'),
        ('intro', 'Register as a volunteer in Al Khalidiyah. The Municipality reviews every registration and will contact you.'),
        ('submit', 'Register'), ('submitting', 'Sending…'),
        ('registered', 'Thank you. Your registration is received as {reference}. The Municipality will review it and contact you.'),
        ('already_registered', 'You are already registered as a volunteer. The Municipality will contact you.'),
        ('withdrawn', 'A registration under this ID was withdrawn. Please contact the Municipality office.'),
        ('not_eligible', 'This registration is for residents of Al Khalidiyah.'),
        ('not_open', 'Volunteer registration is not open on this page.'),
        ('cannot_verify', 'We could not register you with these details. If you registered before, check the date of birth, or try again later.'),
        ('invalid', 'Some answers are missing or not accepted. Check the form and try again.'),
        ('failed', 'The registration could not be sent. Check your connection and try again.'),
        ('again', 'Register someone else'),
        ('privacy', 'Your details are used by the Municipality for the volunteer programme only.'),
    ])),
])

S_AR = O([
    ('nav', O([
        ('group', O((k, v[1]) for k, v in C.GROUPS.items())),
    ])),
    ('list', O([
        ('new', 'سجل جديد'), ('empty', 'لا توجد سجلات بعد.'),
        ('emptyBody', 'تظهر هنا السجلات المدخلة عبر هذا النموذج، الأحدث أولاً.'),
        ('deleted', 'محذوف'), ('showDeleted', 'إظهار المحذوف'),
        ('count', '{count, plural, =0 {لا توجد سجلات} one {سجل واحد} two {سجلان} few {# سجلات} many {# سجلاً} other {# سجل}}'),
        ('reference', 'المرجع'), ('status', 'الحالة'),
        ('onlySubmitted', 'بانتظار المراجعة فقط'),
    ])),
    ('form', O([
        ('newTitle', 'جديد: {title}'), ('editTitle', 'تعديل: {title}'), ('save', 'حفظ'), ('saving', 'جارٍ الحفظ…'),
        ('saved', 'تم الحفظ'), ('savedRef', 'حُفظ بالمرجع {reference}'), ('cancel', 'إلغاء'), ('back', 'العودة إلى القائمة'),
        ('required', 'هذا الحقل مطلوب.'), ('specify', 'يرجى التحديد'), ('choose', 'اختر…'),
        ('assignedOnSave', 'يُعيَّن عند حفظ السجل.'),
        ('stampedOnSave', 'تاريخ الحفظ ووقته.'),
        ('filesAfterSave', 'تُرفق الملفات بعد حفظ السجل، من صفحته.'),
        ('shownFrom', 'يُعرض من السجل المختار أعلاه.'),
        ('notApplicable', 'لا يُسأل مع الإجابة المعطاة أعلاه.'),
        ('lookingUp', 'جارٍ البحث…'), ('onFile', 'مسجّل - الاسم مقفل؛ يمكن إضافة التفاصيل الفارغة.'),
        ('newPerson', 'غير مسجّل - سيُنشأ شخص جديد.'),
        ('idTypeFirst', 'اختر نوع الوثيقة أولاً.'),
        ('nidInvalid', 'الرقم الوطني تسعة أرقام بالضبط.'),
        ('idEmpty', 'أدخل الرقم كما هو مكتوب في الوثيقة.'),
        ('phoneOnFile', 'مسجّل. لا يُستبدل رقم مسجّل من قبل أبداً.'),
        ('personLocked', 'يثبت الشخص بعد حفظ السجل.'),
        ('min', '{min} على الأقل.'), ('range', 'بين {min} و{max}.'),
        ('invalid', 'لم يُحفظ. {message}'), ('notSaved', 'لم يُحفظ'),
        ('ruleRequired', '"{label}" مطلوب مع الإجابات المعطاة.'),
        ('ruleNotApplicable', '"{label}" لا يُسأل مع الإجابات المعطاة، فيجب أن يبقى فارغاً.'),
        ('notFound', 'هذا السجل لم يعد موجوداً أو ليس لك تعديله.'),
        ('unknownColumn', 'لم يُحفظ: أرسل النموذج حقلاً لا تعرفه قاعدة البيانات ({column}). هذا خلل في النموذج.'),
        ('unknownBlock', 'لم يُحفظ: أرسل النموذج كتلة لا يقبلها هذا الجدول ({block}). هذا خلل في النموذج.'),
        ('yes', 'نعم'), ('no', 'لا'),
        ('picker', O([
            ('none', 'لا شيء'), ('loadFailed', 'تعذّر تحميل القائمة.'),
            ('window', 'لا يُدرج إلا ما هو مفتوح اليوم.'),
            ('confirmed', 'لا يُدرج إلا الشركاء الذين أكّد التواصل معهم الشراكة.'),
            ('held', 'لا تُدرج إلا البازارات المسجّلة على أنها نُفّذت.'),
            ('fromSource', 'لا يُدرج إلا المسجّلون في {form}.'),
            ('noneToChoose', 'لا يوجد ما يُختار بعد.'),
        ])),
        ('occasion', O([('campaign', 'حملة تطوعية'), ('activity', 'نشاط مجتمعي')])),
        ('deleted', O([
            ('person', 'هذا المعرّف يعود لشخص محذوف.'),
            ('who', 'حُذف {when} بواسطة {by}'), ('whoUnknown', 'حُذف {when}'),
            ('restoreNote', 'الاستعادة تعيد سجلاتهم إلى كل رقم في الخالدية يحتسبهم، بما في ذلك الأرباع التي سبق الإبلاغ عنها.'),
            ('restore', 'استعادة ومتابعة'), ('restored', 'تمت الاستعادة. احفظ مرة أخرى للمتابعة.'),
            ('coordinatorOnly', 'الاستعادة للمنسق فقط. اطلبها من منسق ثم احفظ مرة أخرى.'),
        ])),
    ])),
    ('detail', O([
        ('edit', 'تعديل'), ('delete', 'حذف'), ('restore', 'استعادة'),
        ('deleteConfirm', 'حذف هذا السجل؟ سيتوقف عن الاحتساب ويمكن استعادته لاحقاً.'),
        ('deletedNote', 'هذا السجل محذوف ولا يُحتسب. يمكن للمنسق استعادته.'),
        ('created', 'أُنشئ'), ('updated', 'حُدِّث'), ('notSet', 'غير محدد'),
        ('feeds', 'يغذّي'),
        ('files', O([
            ('requiredMissing', 'يطلب النموذج ملفاً واحداً على الأقل هنا؛ ولم يُرفق أي ملف بعد.'),
            ('max', 'حتى {max} ملفات.'),
        ])),
        ('publish', O([
            ('title', 'الصفحة العامة'), ('on', 'منشور'), ('off', 'غير منشور'),
            ('publish', 'نشر على الصفحة العامة'), ('unpublish', 'إزالة من الصفحة العامة'),
            ('note', 'تعرض الصفحة العامة على /khalidiyah الأنشطة والبازارات المنشورة التي لم تنتهِ: العنوان والنوع والتواريخ والوصف، ولا شيء غير ذلك.'),
        ])),
        ('review', O([
            ('title', 'التسجيل'),
            ('submitted', 'بانتظار المراجعة'), ('approved', 'مقبول'), ('rejected', 'غير مقبول'),
            ('approve', 'قبول'), ('reject', 'عدم القبول'), ('reopen', 'إعادة إلى الانتظار'),
            ('public', 'سجّله المتطوع بنفسه على الصفحة العامة.'),
            ('staff', 'أدخله الموظفون.'),
            ('note', 'لا يُحتسب التسجيل في أرقام المتطوعين إلا بعد قبوله.'),
            ('reviewedOn', 'رُوجع {when}'),
        ])),
    ])),
    ('gate', O([('title', 'شاشات الخالدية'), ('body', 'هذه النماذج تخص بلدية الخالدية. حسابك يعمل في بلدية أخرى.')])),
    ('objective', O([
        ('impact', 'الأثر · التماسك الاجتماعي والمشاركة المشتركة'),
        ('so1', 'SO1 · الشراكات'),
        ('so2', 'SO2 · الحديقة'),
        ('so3', 'SO3 · التطوع'),
        ('so4', 'SO4 · المشاريع المنزلية والأسواق'),
    ])),
    ('dashboard', O([
        ('planTarget', 'هدف الخطة'),
        ('planTargetNote', 'تذكر الخطة أهدافاً للفترة كاملة أو بالسنة أو كنسبة مئوية؛ ولم يُقسَّم أي منها إلى أرباع. لذلك يُقرأ عمود الربع "غير محدد"، وليس صفراً أبداً.'),
        ('unique', O([
            ('A3', '{count, plural, =0 {لا مساهمات} one {مساهمة واحدة} two {مساهمتان} few {# مساهمات} many {# مساهمة} other {# مساهمة}}'),
            ('H1', '{count, plural, =0 {لا بازارات منفذة} one {بازار واحد منفذ} two {بازاران منفذان} few {# بازارات منفذة} many {# بازاراً منفذاً} other {# بازار منفذ}}'),
            ('H2', '{count, plural, =0 {لا عارضين فريدين} one {عارض فريد واحد} two {عارضان فريدان} few {# عارضين فريدين} many {# عارضاً فريداً} other {# عارض فريد}}'),
        ])),
    ])),
    ('volunteer', O([
        ('title', 'تطوّع مع البلدية'),
        ('intro', 'سجّل متطوعاً في الخالدية. تراجع البلدية كل تسجيل وستتواصل معك.'),
        ('submit', 'تسجيل'), ('submitting', 'جارٍ الإرسال…'),
        ('registered', 'شكراً لك. استُلم تسجيلك بالمرجع {reference}. ستراجعه البلدية وتتواصل معك.'),
        ('already_registered', 'أنت مسجّل متطوعاً من قبل. ستتواصل معك البلدية.'),
        ('withdrawn', 'سُحب تسجيل سابق بهذه الوثيقة. يرجى مراجعة مكتب البلدية.'),
        ('not_eligible', 'هذا التسجيل لسكان الخالدية.'),
        ('not_open', 'تسجيل المتطوعين غير متاح على هذه الصفحة.'),
        ('cannot_verify', 'تعذّر تسجيلك بهذه البيانات. إن كنت سجّلت من قبل فتحقّق من تاريخ الميلاد، أو حاول لاحقاً.'),
        ('invalid', 'بعض الإجابات ناقصة أو غير مقبولة. راجع النموذج وحاول مرة أخرى.'),
        ('failed', 'تعذّر إرسال التسجيل. تحقّق من الاتصال وحاول مرة أخرى.'),
        ('again', 'تسجيل شخص آخر'),
        ('privacy', 'تستخدم البلدية بياناتك لبرنامج التطوع فقط.'),
    ])),
])


def keys_of(d, prefix=''):
    out = []
    for k, v in d.items():
        if isinstance(v, dict):
            out += keys_of(v, prefix + k + '.')
        else:
            out.append(prefix + k)
    return out


ke, ka = set(keys_of(S_EN)), set(keys_of(S_AR))
for k in sorted(ke - ka):
    err('static key %s has no Arabic' % k)
for k in sorted(ka - ke):
    err('static key %s has no English' % k)
for k in sorted(ke & ka):
    ve, va = S_EN, S_AR
    for seg in k.split('.'):
        ve, va = ve[seg], va[seg]
    if ve == va:
        err('static key %s is the same in both languages: %r' % (k, ve))

if errors:
    for e in errors:
        print('ERROR', e)
    sys.exit(1)

en.update(S_EN)
ar.update(S_AR)


def write(path, text):
    with io.open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(text)


write(os.path.join(ROOT, 'app', 'src', 'locales', 'en', 'khld.json'), json.dumps(en, ensure_ascii=False, indent=2) + '\n')
write(os.path.join(ROOT, 'app', 'src', 'locales', 'ar', 'khld.json'), json.dumps(ar, ensure_ascii=False, indent=2) + '\n')

ts = [
    "// GENERATED by supabase/khalidiyah/gen_forms.py from Khaldia_2_reviewed.xlsx",
    "// (workbook.py) and supabase/khalidiyah/catalogue.py. Do not edit; edit the",
    "// catalogue and regenerate. Labels live in locales/{en,ar}/khld.json under",
    "// forms.<id>.fields.<Field ID>; option labels are ref_khld_* rows in the database.",
    "import type { KhldFormDef } from './types'",
    "",
    "export const KHLD_FORMS = " + json.dumps(defs, ensure_ascii=False, indent=2) + " as const satisfies Record<string, KhldFormDef>",
    "",
    "export type KhldFormId = keyof typeof KHLD_FORMS",
    "export const KHLD_FORM_IDS = Object.keys(KHLD_FORMS) as KhldFormId[]",
    "",
    "/** The sidebar's groups, in the sheet's order (Page En / Page Ar). */",
    "export const KHLD_GROUPS = " + json.dumps(list(C.GROUPS.keys())) + " as const",
    "",
    "/** The form carrying each indicator's main source (the Calculation formulas sheet). */",
    "export const KHLD_INDICATOR_FORM: Readonly<Record<string, KhldFormId>> = " + json.dumps(C.INDICATOR_FORM, indent=2),
    "",
]
write(os.path.join(ROOT, 'app', 'src', 'khld', 'forms.generated.ts'), '\n'.join(ts))

print('ok:', len(defs), 'forms,', sum(len(d['fields']) for d in defs.values()), 'fields; locales and forms.generated.ts written')
