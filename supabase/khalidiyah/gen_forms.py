# -*- coding: utf-8 -*-
"""
Generates, from the workbook and the catalogue (through model.build()):

  app/src/khld/forms.generated.ts      the 21 form definitions the screens render
  app/src/locales/en/khld.json         English, VERBATIM from the sheets
  app/src/locales/ar/khld.json         Arabic, VERBATIM from the sheets

The sheets are bilingual in every cell (question, options, section heading,
note), so unlike Ramtha's generator nothing here drafts a label: every string
under forms.<id> is the sheet's, in both languages. What is drafted is the
sidebar name of each form (SHORT), the words around the controls (the static
block at the end), and the label of the one control no sheet has -- the
participants block on SO2-C2, which the participation table needs and the
campaign sheet does not ask for (catalogue.py, c2._participants).

The definitions are structure only. Every field says which column, junction
question, count list, checklist item or child block it writes, in the terms
save_khld_record (0148) accepts, so the screens carry answers from the
controls to the payload without knowing the sheets.

Checks (the generator fails, so a label cannot drift from the workbook):
  - every field of every sheet resolves to a kind the screens render
  - every note with English has Arabic, and vice versa
  - every part heading has both languages (the typed OPTIONS of a part are
    held to the sheet's cell by the model; the heading is the catalogue's
    reading of the compound cell, applied as the column comment in 0145)
  - every list a field reads is in the model
  - every static key has both languages

Run from the repository root:  python supabase/khalidiyah/gen_forms.py
"""
import io, json, os, re, sys
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import model as M
from catalogue import FORMS, REFERENCES, effective_free, has_blank
from workbook import load_index, split_bilingual

m = M.build()
idx = {r[1]: r for r in load_index()}

# ── the sidebar names: the app's words, not the sheets' ─────────────────
SHORT = {
    'imp0': ('Interaction survey', 'مسح التفاعل المجتمعي'),
    'so10': ('Partner survey', 'مسح الشركاء'),
    'a1':   ('Partnership mechanism', 'آلية الشراكة'),
    'a2':   ('Coordination meetings', 'اجتماعات التنسيق'),
    'a3':   ('Contributions', 'المساهمات'),
    'b1':   ('Park arrangements', 'ترتيبات الحديقة'),
    'so20': ('User satisfaction', 'رضا المستخدمين'),
    'c1':   ('Works completion', 'إنجاز الأعمال'),
    'c2':   ('Volunteer campaigns', 'الحملات التطوعية'),
    'd1':   ('Activities and events', 'الأنشطة والفعاليات'),
    'd2':   ('Attendance counts', 'عدّ الحضور'),
    'so30': ('Volunteer tracking', 'تتبع المتطوعين'),
    'e1':   ('Community committee', 'لجنة التنسيق المجتمعي'),
    'f1':   ('Volunteer programme', 'برنامج التطوع'),
    'f2':   ('Volunteer registration', 'تسجيل المتطوعين'),
    'f3':   ('Action days', 'أيام العمل التطوعي'),
    'so40': ('Producer follow-up', 'متابعة المنتجين'),
    'g1':   ('Guidance completion', 'إتمام الجلسات الإرشادية'),
    'g2':   ('Enterprise support', 'دعم المشاريع'),
    'h1':   ('Market days', 'أيام السوق'),
    'h2':   ('Vendor registration', 'تسجيل العارضين'),
}

# The one control no sheet row asks for: the volunteers present at a
# rehabilitation campaign, which SO3-0's retention indicator counts from
# (catalogue c2._participants, placed after volunteers_total).
PARTICIPANTS_LABEL = ('Volunteers present (from the attendance sheet)', 'المتطوعون الحاضرون (من كشف الحضور)')

errors = []


def err(s):
    errors.append(s)


def strip_blanks(s):
    """'Number: ____' -> 'Number'; 'Date ____ | Hours ____' -> 'Date | Hours'."""
    s = re.sub(r':\s*_+', '', s)
    s = re.sub(r'\s*_+\s*', ' ', s)
    return re.sub(r'\s+', ' ', s).strip(' :')


def contains(hay, needle):
    return re.sub(r'\s+', ' ', needle).strip().lower() in re.sub(r'\s+', ' ', hay).strip().lower()


def yes_no_labels(f, en, ar):
    """The two answers of a boolean part, from the sheet's cell.

    The sheet writes 'Yes — number of sessions: ____ Dates: ____' / 'No'; the
    blanks are the part's own sub-fields beside the radio, so the radio says
    what is left once they are taken out: the answer word alone when the line
    carried blanks, the whole line otherwise ('No — stalls provided free of
    charge', 'Yes — free of charge')."""
    def cut(line):
        if has_blank(line):
            return re.split(r'\s+[—-]\s+', line, maxsplit=1)[0].strip()
        return line.strip()
    lines_en, lines_ar = f.opts_en, f.opts_ar
    if len(lines_en) == 2 and len(lines_ar) == 2 and {l.split()[0].lower().rstrip(',') for l in lines_en} == {'yes', 'no'}:
        yes_i = 0 if lines_en[0].lower().startswith('yes') else 1
        return (cut(lines_en[yes_i]), cut(lines_en[1 - yes_i])), (cut(lines_ar[yes_i]), cut(lines_ar[1 - yes_i]))
    # 'Written consent obtained: Yes / No' inside one line
    cell_en, cell_ar = ' '.join(lines_en), ' '.join(lines_ar)
    if 'Yes' not in cell_en or 'No' not in cell_en or 'نعم' not in cell_ar or 'لا' not in cell_ar:
        err('%s: boolean part %s has no Yes / No in the sheet cell' % (f.key, en))
    return ('Yes', 'No'), ('نعم', 'لا')


def part_required(spec, i, pkind):
    """model._plan_field: a required compound field makes its FIRST typed part NOT NULL."""
    return bool(spec.get('required')) and i == 0 and pkind in ('select', 'bool', 'number', 'date', 'money')


en = OrderedDict(forms=OrderedDict())
ar = OrderedDict(forms=OrderedDict())
defs = OrderedDict()

for fid, form in m.forms.items():
    meta = FORMS[fid]
    table = meta['table']
    mcode = meta.get('milestone')
    code = form.code
    st_en, st_ar = split_bilingual(idx[code][2])
    head = form.head
    h = lambda k: head.get(k, ('', ''))
    fen = OrderedDict(title=form.title_en, short=SHORT[fid][0], code=code, indicator=st_en,
                      who=h('responsible')[0], when=h('frequency')[0], calc=h('calculation')[0],
                      disaggregation=h('disaggregation')[0], definition=h('definition')[0], measures=h('measures')[0],
                      unit=h('unit')[0], source=h('source')[0], evidence=h('evidence')[0],
                      sections=OrderedDict(), fields=OrderedDict())
    far = OrderedDict(title=form.title_ar, short=SHORT[fid][1], code=code, indicator=st_ar,
                      who=h('responsible')[1], when=h('frequency')[1], calc=h('calculation')[1],
                      disaggregation=h('disaggregation')[1], definition=h('definition')[1], measures=h('measures')[1],
                      unit=h('unit')[1], source=h('source')[1], evidence=h('evidence')[1],
                      sections=OrderedDict(), fields=OrderedDict())
    for k in ('who', 'when', 'calc', 'disaggregation', 'definition', 'measures', 'unit', 'source', 'evidence'):
        if not fen[k] or not far[k]:
            err('%s: header %s is empty in %s' % (fid, k, 'en' if not fen[k] else 'ar'))

    # sections: the sheet's "Section X — ..." rows, a field belongs to the last one before it
    sections = []
    for si, (before, sen, sar) in enumerate(form.headings):
        skey = 's%d' % si
        if not sen or not sar:
            err('%s: section %d has no %s heading' % (fid, si, 'English' if not sen else 'Arabic'))
        fen['sections'][skey] = sen
        far['sections'][skey] = sar
        sections.append((before, skey, []))
    if not sections:
        err('%s: no section headings' % fid)

    def section_for(no):
        cur = sections[0]
        for s in sections:
            if s[0] <= no:
                cur = s
        return cur[2]

    def emit(f, spec, key, dfields):
        kind = spec['kind']
        req = bool(spec.get('required'))
        e = OrderedDict(label=f.q_en)
        a = OrderedDict(label=f.q_ar)
        if not f.q_en or not f.q_ar:
            err('%s.%s: question missing in %s' % (fid, key, 'en' if not f.q_en else 'ar'))
        if f.note_en or f.note_ar:
            if not f.note_en or not f.note_ar:
                err('%s.%s: the note has %s only' % (fid, key, 'English' if f.note_en else 'Arabic'))
            e['help'] = f.note_en
            a['help'] = f.note_ar
        d = OrderedDict(key=key, type=kind)
        if req:
            d['required'] = True
        if spec.get('gate'):
            d['counting'] = True
        if spec.get('stamp'):
            d['stamp'] = True
        if spec.get('must_be_true'):
            d['mustBeTrue'] = True
        cell_en, cell_ar = ' '.join(f.opts_en), ' '.join(f.opts_ar)

        def sub_from_cell():
            if f.opts_en and f.opts_ar:
                s_en = ' | '.join(strip_blanks(x) for x in f.opts_en)
                s_ar = ' | '.join(strip_blanks(x) for x in f.opts_ar)
                if s_en and s_ar:
                    e['sub'] = s_en
                    a['sub'] = s_ar

        if kind in ('text', 'area', 'number', 'money', 'date', 'month'):
            d['column'] = key
            sub_from_cell()
        elif kind == 'bool':
            d['column'] = key
            opts = []
            e['opts'] = OrderedDict(); a['opts'] = OrderedDict()
            for o_en, o_ar in zip(f.opts_en, f.opts_ar):
                val = 'true' if o_en.strip().lower().startswith('yes') else 'false'
                opts.append(val)
                e['opts'][val] = o_en; a['opts'][val] = o_ar
            if not opts:
                err('%s.%s: a boolean with no options' % (fid, key))
            d['options'] = opts
        elif kind == 'select':
            lst = M.list_name(fid, f, spec)
            d['column'] = key + '_id'
            d['ref'] = lst
            l = m.lists.get(lst)
            if l is None:
                err('%s.%s: list %s is not in the model' % (fid, key, lst))
            elif any(effective_free(l.name, o[0], o[3]) for o in l.options):
                d['other'] = key + '_other'
        elif kind == 'multi':
            lst = M.list_name(fid, f, spec)
            d['question'] = m.qcode(fid, key, mcode)
            d['ref'] = lst
            if lst not in m.lists:
                err('%s.%s: list %s is not in the model' % (fid, key, lst))
        elif kind == 'checklist':
            items = {i[1]: i for i in m.checklist_items[mcode]}
            it = items.get(key)
            if it is None:
                err('%s.%s: not a checklist item of %s' % (fid, key, mcode))
            else:
                d['itemNo'] = it[0]
                d['ref'] = it[2]
                l = m.lists[it[2]]
                detail = [o[0] for o in l.options if has_blank(o[1])]
                if detail:
                    d['detail'] = detail
        elif kind == 'counts':
            d['fieldCode'] = m.qcode(fid, key, mcode)
            d['ref'] = '%s_%s' % (fid, key)
            if d['ref'] not in m.lists:
                err('%s.%s: cells list %s is not in the model' % (fid, key, d['ref']))
        elif kind == 'parts':
            e['parts'] = OrderedDict(); a['parts'] = OrderedDict()
            d['parts'] = []
            # A part's heading is the catalogue's reading of the sheet's compound
            # cell ('Recorded by and verified by (names, positions, dates)' ->
            # 'Recorded by (name, position)'), the same text 0145 applied as the
            # column's comment. The sheet's own words are the field label above
            # it and the options beside it; the heading only says which blank
            # this control fills, so it is required in both languages and not
            # matched against the cell.
            for i, (col, pkind, p_en, p_ar, cfg) in enumerate(spec['parts']):
                if not p_en or not p_ar:
                    err('%s.%s.%s: part heading missing in %s' % (fid, key, col, 'en' if not p_en else 'ar'))
                e['parts'][col] = p_en; a['parts'][col] = p_ar
                pd = OrderedDict(column=col, type=pkind)
                if part_required(spec, i, pkind):
                    pd['required'] = True
                if pkind == 'select':
                    pd['ref'] = cfg['list']
                    l = m.lists.get(cfg['list'])
                    if l is None:
                        err('%s.%s.%s: list %s is not in the model' % (fid, key, col, cfg['list']))
                    elif any(effective_free(l.name, o[0], o[3]) for o in l.options):
                        pd['other'] = re.sub(r'_id$', '', col) + '_other'
                elif pkind == 'multi':
                    pd['question'] = m.qcode(fid, col, mcode)
                    pd['ref'] = cfg['list']
                elif pkind == 'record':
                    pd['table'] = cfg['table']
                elif pkind == 'bool':
                    (y_en, n_en), (y_ar, n_ar) = yes_no_labels(f, p_en, p_ar)
                    pd['options'] = ['true', 'false']
                    e.setdefault('partOpts', OrderedDict())[col] = OrderedDict([('true', y_en), ('false', n_en)])
                    a.setdefault('partOpts', OrderedDict())[col] = OrderedDict([('true', y_ar), ('false', n_ar)])
                d['parts'].append(pd)
        elif kind == 'record':
            d['column'] = spec['column']
            d['table'] = spec['table']
            if spec.get('create'):
                d['create'] = True
            sub_from_cell()
        elif kind == 'age_group':
            d['type'] = 'select'
            d['column'] = 'age_group_id'
            d['ref'] = 'age_group'
        elif kind in ('ident', 'person_name', 'person_sex', 'person_phone', 'dob', 'dob_age'):
            if kind == 'person_sex':
                d['ref'] = 'sex'
            sub_from_cell()
        elif kind == 'readonly':
            d['derived'] = spec.get('derived', key)
            if spec.get('list'):
                d['ref'] = spec['list']
            sub_from_cell()
        elif kind == 'rating':
            d['items'] = 'so20_facility_item'
            d['ratings'] = 'so20_facility_rating'
            for lst in (d['items'], d['ratings']):
                if lst not in m.lists:
                    err('%s.%s: list %s is not in the model' % (fid, key, lst))
        elif kind == 'session':
            n = spec['n']
            d['n'] = n
            d['column'] = 's%d_status_id' % n
            d['dateColumn'] = 's%d_date' % n
            d['ref'] = M.list_name(fid, f, spec)
            if spec.get('na'):
                d['na'] = True
            if d['ref'] not in m.lists:
                err('%s.%s: list %s is not in the model' % (fid, key, d['ref']))
        elif kind == 'participants':
            sub_from_cell()
        elif kind == 'participation_log':
            sub_from_cell()
        else:
            err('%s.%s: kind %s has no screen rendering' % (fid, key, kind))
        fen['fields'][key] = e
        far['fields'][key] = a
        dfields.append(d)

    for f in form.fields:
        spec = m.specs[fid][f.key]
        dfields = section_for(f.no)
        emit(f, spec, f.key, dfields)
        # the controls the catalogue places after a sheet row
        for okey, ospec in m.specs[fid].items():
            if okey.startswith('_') and ospec.get('after') == f.key:
                d = OrderedDict(key=okey, type=ospec['kind'])
                fen['fields'][okey] = OrderedDict(label=PARTICIPANTS_LABEL[0])
                far['fields'][okey] = OrderedDict(label=PARTICIPANTS_LABEL[1])
                dfields.append(d)
    for okey, ospec in m.specs[fid].items():
        if okey.startswith('_') and okey not in fen['fields']:
            err('%s: override %s (after %s) was not placed' % (fid, okey, ospec.get('after')))

    en['forms'][fid] = fen
    ar['forms'][fid] = far
    fixed = OrderedDict([('milestone_code', mcode)]) if mcode else OrderedDict()
    ref = REFERENCES.get(fid)
    d = OrderedDict(id=fid, code=code, indicator=code.replace('KHLD-', ''), sheet=form.sheet, table=table, cls=meta['cls'])
    if mcode:
        d['milestone'] = mcode
    if ref:
        d['reference'] = 'KHLD-' + ref[0]
    d['fixed'] = fixed
    d['filter'] = fixed
    d['sections'] = [OrderedDict(key=skey, fields=fields) for (_, skey, fields) in sections]
    defs[fid] = d

# ── the screens' own strings ──────────────────────────────────────────────
common_en = OrderedDict([
    ('nav', OrderedDict([
        ('group', OrderedDict([
            ('impact', 'Impact'),
            ('so1', 'Objective 1 · Partnerships'),
            ('so2', 'Objective 2 · The park'),
            ('so3', 'Objective 3 · Volunteering'),
            ('so4', 'Objective 4 · Home-based enterprises and markets'),
            ('definitions', 'Definitions'),
        ])),
        ('rules', 'Milestone rules'),
    ])),
    ('list', OrderedDict([
        ('new', 'New record'), ('empty', 'No records yet.'), ('emptyBody', 'Records entered through this form appear here, newest first.'),
        ('loadFailed', 'The list could not be loaded.'), ('search', 'Search'), ('deleted', 'Deleted'),
        ('showDeleted', 'Show deleted'), ('count', '{count, plural, =0 {No records} one {# record} other {# records}}'),
        ('columns', OrderedDict([('reference', 'Reference'), ('title', 'Title'), ('person', 'Person'), ('partner', 'Partner'), ('enterprise', 'Enterprise'), ('linked', 'Record'), ('date', 'Date'), ('counts', 'Counts'), ('status', 'Status')])),
    ])),
    ('form', OrderedDict([
        ('newTitle', 'New: {title}'), ('editTitle', 'Edit: {title}'), ('save', 'Save'), ('saving', 'Saving…'),
        ('saved', 'Saved'), ('savedRef', 'Saved as {reference}'), ('cancel', 'Cancel'), ('back', 'Back to the list'),
        ('required', 'This field is required.'), ('assignedOnSave', 'Assigned when the record is saved.'),
        ('derivedOnSave', 'Worked out from the answers when the record is saved.'), ('notYet', 'Not yet'),
        ('specify', 'Please specify'), ('noneSelected', 'Nothing selected'), ('choose', 'Choose…'),
        ('calcTitle', 'Calculation'), ('who', 'Responsible for completing'), ('when', 'Frequency / timing'), ('indicator', 'Indicator'),
        ('definition', 'Definition (framework)'), ('measures', 'What this form measures'), ('unit', 'One record per'),
        ('disaggregation', 'Disaggregation'), ('source', 'Data source'), ('evidenceToFile', 'Evidence to be filed'),
        ('countingField', 'This field decides whether the record counts'),
        ('lookup', 'Look up'), ('lookingUp', 'Looking up…'), ('onFile', 'On file — name is locked; empty details can be added.'),
        ('newPerson', 'Not on file — a new person will be created.'),
        ('nidInvalid', 'A national ID is exactly nine digits.'),
        ('unhcrEmpty', 'Enter the UNHCR registration number as written on the certificate.'),
        ('idType', OrderedDict([('label', 'Identifier'), ('national_id', 'National ID number'), ('unhcr_number', 'UNHCR registration number')])),
        ('idNumber', 'Number'),
        ('dob', 'Date of birth'), ('age', 'Age (years)'), ('dobOrAge', 'A date of birth or an age in years.'),
        ('phoneOnFile', 'On file. A number already recorded is never overwritten.'),
        ('invalid', 'Not saved. {message}'), ('notFound', 'This record no longer exists or is not yours to edit.'),
        ('unknownColumn', 'Not saved: the form sent a field the database does not know ({column}). This is a defect in the form.'),
        ('unknownBlock', 'Not saved: the form sent a block this table does not take ({block}). This is a defect in the form.'),
        ('consentRefused', 'Not saved. The respondent did not consent, so the questionnaire is not recorded (field 4).'),
        ('yes', 'Yes'), ('no', 'No'), ('undecided', 'Not decided'), ('recordedOn', 'Recorded {when}'),
        ('recordPicker', OrderedDict([('none', 'None'), ('loadFailed', 'The list could not be loaded.')])),
        ('enterprise', OrderedDict([
            ('fromOwner', 'Leave empty for a new enterprise: it is created from the owner when the record is saved, and its KHLD-ENT number is assigned then.'),
            ('open', 'New enterprise'), ('name', 'Enterprise name'), ('owner', "Owner's name"), ('phone', "Owner's phone"),
            ('add', 'Add enterprise'), ('cancel', 'Cancel'),
        ])),
        ('partner', OrderedDict([
            ('open', 'New partner'), ('name', 'Organisation name'), ('type', 'Partner type'), ('contact', 'Contact'),
            ('add', 'Add partner'), ('cancel', 'Cancel'),
            ('note', 'A partner is one row however many surveys and contributions name it. If the name is already on file, pick it from the list.'),
        ])),
        ('checklist', OrderedDict([('status', 'Status'), ('detail', 'Detail'), ('date', 'Date'), ('evidence', 'Evidence reference')])),
        ('session', OrderedDict([('status', 'Attendance'), ('date', 'Date attended')])),
        ('rating', OrderedDict([('item', 'Item'), ('rating', 'Rating')])),
        ('counts', OrderedDict([('cell', 'Category'), ('count', 'Count'), ('sum', 'Sum of the cells')])),
        ('participants', OrderedDict([
            ('volunteer', 'Volunteer'), ('hours', 'Hours'), ('verified', 'Verified from a signed attendance sheet'), ('unverified', 'Not verified'),
            ('add', 'Add volunteer'), ('remove', 'Remove'), ('none', 'No volunteers listed yet.'),
            ('kept', 'A volunteer already recorded on this occasion is kept; only hours and verification are updated.'),
            ('loadFailed', 'The volunteer register could not be loaded.'),
        ])),
        ('log', OrderedDict([
            ('date', 'Date'), ('kind', 'Activity type'), ('reference', 'Reference'), ('hours', 'Hours'), ('verified', 'Verified'),
            ('none', 'No participation is recorded for this volunteer.'),
            ('inPeriod', 'Only participations dated within the period reviewed are counted below.'),
            ('chooseVolunteer', 'Choose the volunteer first.'),
            ('kind_campaign', 'Rehabilitation campaign'), ('kind_action_day', 'Action day'), ('kind_activity', 'Event support'),
            ('kind_market', 'Market day support'), ('kind_committee', 'Committee task'), ('kind_outreach', 'Outreach'),
        ])),
        ('deleted', OrderedDict([
            ('person', 'This identifier belongs to a person who was deleted.'),
            ('partner', 'This partner was deleted.'),
            ('enterprise', 'This enterprise was deleted.'),
            ('vendor', 'This vendor was deleted.'),
            ('who', 'Deleted {when} by {by}'), ('whoUnknown', 'Deleted {when}'),
            ('restoreNote', 'Restoring puts their records back into every Khalidiyah figure that counts them, including quarters already reported.'),
            ('restore', 'Restore and continue'), ('restored', 'Restored. Save again to continue.'),
            ('coordinatorOnly', 'Only a coordinator can restore. Ask one, then save again.'),
        ])),
    ])),
    ('detail', OrderedDict([
        ('edit', 'Edit'), ('delete', 'Delete'), ('restore', 'Restore'), ('deleteConfirm', 'Delete this record? It stops counting and can be restored later.'),
        ('deletedNote', 'This record is deleted and does not count. A coordinator can restore it.'),
        ('created', 'Created'), ('updated', 'Updated'), ('notSet', 'Not set'),
        ('counts', 'Counts towards the indicator'), ('notCounts', 'Does not count'),
        ('milestone', OrderedDict([
            ('title', 'Milestone status'),
            ('established', 'Established'), ('partly_established', 'Partly established'), ('not_established', 'Not established'),
            ('not_computable', 'Not computable'),
            ('reason_no_rule', 'No rule is recorded for this milestone.'),
            ('reason_rule_not_evaluable', 'The sheet\'s rule names items that are not checklist rows: {broken}. Until the M&E lead names the critical items, the status is not computable (OQ-56).'),
            ('reason_items_missing', 'Critical items not yet recorded on this verification: {missing}.'),
            ('tally', '{in_place} in place · {partly} partly · {not_in_place} not in place, of {n} critical items'),
        ])),
        ('attendance', OrderedDict([
            ('title', 'Reconciliation'),
            ('total', 'Total participants'), ('bySex', 'Sum by sex'), ('byAgeSex', 'Sum by age and sex'),
            ('agrees', 'The totals agree'), ('disagrees', 'The totals do not agree'),
            ('distinct', 'Distinct individuals'),
            ('reason_not_checked', 'No duplicate check was recorded.'),
            ('reason_not_yet', 'The duplicate check has not been done yet.'),
            ('reason_not_possible', 'Not possible with this counting method.'),
            ('reason_repeat_count_missing', 'The duplicate check says yes but the number of repeat participants is missing.'),
        ])),
        ('participations', 'Participations'),
        ('sessionsOf', '{count} of 5'),
        ('completion', OrderedDict([('true', 'Completed'), ('false', 'Not completed')])),
    ])),
    ('gate', OrderedDict([('title', 'Khalidiyah screens'), ('body', 'These forms belong to Al Khalidiyah Municipality. Your account works in another municipality.')])),
    # `CODE · name`, the same form as the other two dashboards head their groups
    ('objective', OrderedDict([
        ('impact', 'IMPACT · Social cohesion and shared participation'),
        ('so1', 'SO1 · Partnerships'),
        ('so2', 'SO2 · The park'),
        ('so3', 'SO3 · Volunteering'),
        ('so4', 'SO4 · Home-based enterprises and markets'),
    ])),
    ('dashboard', OrderedDict([
        ('title', 'Khalidiyah dashboard'),
        ('intro', 'Twenty-one indicators from the Al Khalidiyah results framework, computed from the twenty-one forms. Every figure is read from the database; nothing is typed or worked out here.'),
        ('noValue', '—'),
        ('percent', '{value}%'),
        ('jod', '{value} JOD'),
        ('ofTarget', 'of {target}'),
        ('targetNotSet', 'not set'),
        ('planTarget', 'Plan target'),
        ('planTargetNote', 'The Plan states targets for the whole period, by year or as a percentage; none is split into quarters. The quarterly column therefore reads "not set", never zero.'),
        # D2 counts distinct individuals out of an estimated attendance and H2
        # unique vendors out of participations: labelled so nobody sums them
        ('unique', OrderedDict([
            ('D2', '{count, plural, one {# distinct individual} other {# distinct individuals}}'),
            ('H2', '{count, plural, one {# unique vendor} other {# unique vendors}}'),
        ])),
        ('denominator', 'of {count}'),
        ('notComputable', 'Not computable: {detail}'),
        ('noForm', 'No form'),
        ('rules', 'Milestone rules'),
        ('blockedNotice', '{count, plural, one {# milestone cannot be computed} other {# milestones cannot be computed}} until the M&E lead names its critical items (OQ-56).'),
    ])),
    ('rules', OrderedDict([
        ('title', 'Milestone rules'),
        ('intro', 'Each milestone form carries a rule naming the checklist items that must be "In place" for the milestone to count as established. Two of the four name items that are not checklist rows, so their status cannot be computed until a coordinator writes the critical items here. The sheet\'s own rule is shown verbatim; the decision is data, and the indicator views read it on the next query.'),
        ('sourceRule', 'The sheet\'s rule'), ('sourceItems', 'Items the rule names'), ('critical', 'Critical items applied'),
        ('notDecided', 'Not decided — status not computable'),
        ('decidedOn', 'decided {date}'),
        ('items', 'Checklist items of this milestone'),
        ('decide', 'Decide'), ('save', 'Save decision'), ('cancel', 'Cancel'),
        ('chooseItems', 'Tick the checklist items that must all be "In place".'),
        ('clear', 'Clear the decision'),
        ('blocks', 'Waiting on this'),
        ('boundary', 'Established when every critical item is In place; Not established when none is In place or Partly in place; Partly established otherwise (plan §7.3, a default for the M&E lead to confirm).'),
        ('note', 'Note'),
    ])),
])
common_ar = OrderedDict([
    ('nav', OrderedDict([
        ('group', OrderedDict([
            ('impact', 'الأثر'),
            ('so1', 'الهدف 1 · الشراكات'),
            ('so2', 'الهدف 2 · الحديقة'),
            ('so3', 'الهدف 3 · التطوع'),
            ('so4', 'الهدف 4 · المشاريع المنزلية والأسواق'),
            ('definitions', 'التعريفات'),
        ])),
        ('rules', 'قواعد الإنجازات المرحلية'),
    ])),
    ('list', OrderedDict([
        ('new', 'سجل جديد'), ('empty', 'لا توجد سجلات بعد.'), ('emptyBody', 'تظهر هنا السجلات المدخلة عبر هذا النموذج، الأحدث أولاً.'),
        ('loadFailed', 'تعذّر تحميل القائمة.'), ('search', 'بحث'), ('deleted', 'محذوف'),
        ('showDeleted', 'إظهار المحذوف'), ('count', '{count, plural, =0 {لا توجد سجلات} one {سجل واحد} two {سجلان} few {# سجلات} many {# سجلاً} other {# سجل}}'),
        ('columns', OrderedDict([('reference', 'المرجع'), ('title', 'العنوان'), ('person', 'الشخص'), ('partner', 'الشريك'), ('enterprise', 'المشروع'), ('linked', 'السجل'), ('date', 'التاريخ'), ('counts', 'يُحتسب'), ('status', 'الحالة')])),
    ])),
    ('form', OrderedDict([
        ('newTitle', 'جديد: {title}'), ('editTitle', 'تعديل: {title}'), ('save', 'حفظ'), ('saving', 'جارٍ الحفظ…'),
        ('saved', 'تم الحفظ'), ('savedRef', 'حُفظ بالمرجع {reference}'), ('cancel', 'إلغاء'), ('back', 'العودة إلى القائمة'),
        ('required', 'هذا الحقل مطلوب.'), ('assignedOnSave', 'يُعيَّن عند حفظ السجل.'),
        ('derivedOnSave', 'يُستخلص من الإجابات عند حفظ السجل.'), ('notYet', 'ليس بعد'),
        ('specify', 'يرجى التحديد'), ('noneSelected', 'لم يُختر شيء'), ('choose', 'اختر…'),
        ('calcTitle', 'طريقة الاحتساب'), ('who', 'المسؤول عن التعبئة'), ('when', 'التكرار / التوقيت'), ('indicator', 'المؤشر'),
        ('definition', 'التعريف (الإطار)'), ('measures', 'ما يقيسه هذا النموذج'), ('unit', 'سجل واحد لكل'),
        ('disaggregation', 'التفصيل'), ('source', 'مصدر البيانات'), ('evidenceToFile', 'الأدلة الواجب حفظها'),
        ('countingField', 'هذا الحقل يقرر ما إذا كان السجل يُحتسب'),
        ('lookup', 'بحث'), ('lookingUp', 'جارٍ البحث…'), ('onFile', 'مسجّل - الاسم مقفل؛ يمكن إضافة التفاصيل الفارغة.'),
        ('newPerson', 'غير مسجّل - سيُنشأ شخص جديد.'),
        ('nidInvalid', 'الرقم الوطني تسعة أرقام بالضبط.'),
        ('unhcrEmpty', 'أدخل رقم التسجيل لدى المفوضية كما هو مكتوب في الشهادة.'),
        ('idType', OrderedDict([('label', 'نوع المعرّف'), ('national_id', 'الرقم الوطني'), ('unhcr_number', 'رقم التسجيل لدى المفوضية')])),
        ('idNumber', 'الرقم'),
        ('dob', 'تاريخ الميلاد'), ('age', 'العمر (بالسنوات)'), ('dobOrAge', 'تاريخ الميلاد أو العمر بالسنوات.'),
        ('phoneOnFile', 'مسجّل. لا يُستبدل رقم مسجّل من قبل أبداً.'),
        ('invalid', 'لم يُحفظ. {message}'), ('notFound', 'هذا السجل لم يعد موجوداً أو ليس لك تعديله.'),
        ('unknownColumn', 'لم يُحفظ: أرسل النموذج حقلاً لا تعرفه قاعدة البيانات ({column}). هذا خلل في النموذج.'),
        ('unknownBlock', 'لم يُحفظ: أرسل النموذج كتلة لا يقبلها هذا الجدول ({block}). هذا خلل في النموذج.'),
        ('consentRefused', 'لم يُحفظ. لم يوافق المستجيب، فلا يُسجَّل الاستبيان (الحقل 4).'),
        ('yes', 'نعم'), ('no', 'لا'), ('undecided', 'لم يُقرَّر'), ('recordedOn', 'سُجِّل {when}'),
        ('recordPicker', OrderedDict([('none', 'لا شيء'), ('loadFailed', 'تعذّر تحميل القائمة.')])),
        ('enterprise', OrderedDict([
            ('fromOwner', 'اتركه فارغاً لمشروع جديد: يُنشأ من صاحبه عند حفظ السجل، ويُعيَّن رقمه KHLD-ENT حينها.'),
            ('open', 'مشروع جديد'), ('name', 'اسم المشروع'), ('owner', 'اسم صاحب المشروع'), ('phone', 'هاتف صاحب المشروع'),
            ('add', 'إضافة المشروع'), ('cancel', 'إلغاء'),
        ])),
        ('partner', OrderedDict([
            ('open', 'شريك جديد'), ('name', 'اسم المؤسسة'), ('type', 'نوع الشريك'), ('contact', 'جهة الاتصال'),
            ('add', 'إضافة الشريك'), ('cancel', 'إلغاء'),
            ('note', 'الشريك صف واحد مهما تعددت المسوح والمساهمات التي تسمّيه. إن كان الاسم مسجلاً من قبل فاختره من القائمة.'),
        ])),
        ('checklist', OrderedDict([('status', 'الحالة'), ('detail', 'التفصيل'), ('date', 'التاريخ'), ('evidence', 'مرجع الدليل')])),
        ('session', OrderedDict([('status', 'الحضور'), ('date', 'تاريخ الحضور')])),
        ('rating', OrderedDict([('item', 'البند'), ('rating', 'التقييم')])),
        ('counts', OrderedDict([('cell', 'الفئة'), ('count', 'العدد'), ('sum', 'مجموع الخانات')])),
        ('participants', OrderedDict([
            ('volunteer', 'المتطوع'), ('hours', 'الساعات'), ('verified', 'مُتحقَّق منه من كشف حضور موقّع'), ('unverified', 'غير مُتحقَّق منه'),
            ('add', 'إضافة متطوع'), ('remove', 'إزالة'), ('none', 'لم يُدرج أي متطوع بعد.'),
            ('kept', 'المتطوع المسجَّل من قبل في هذه المناسبة يبقى؛ ولا يُحدَّث سوى الساعات والتحقق.'),
            ('loadFailed', 'تعذّر تحميل سجل المتطوعين.'),
        ])),
        ('log', OrderedDict([
            ('date', 'التاريخ'), ('kind', 'نوع النشاط'), ('reference', 'المرجع'), ('hours', 'الساعات'), ('verified', 'مُتحقَّق منه'),
            ('none', 'لا توجد مشاركة مسجَّلة لهذا المتطوع.'),
            ('inPeriod', 'لا تُحتسب أدناه سوى المشاركات المؤرخة ضمن الفترة المراجَعة.'),
            ('chooseVolunteer', 'اختر المتطوع أولاً.'),
            ('kind_campaign', 'حملة تأهيل'), ('kind_action_day', 'يوم عمل تطوعي'), ('kind_activity', 'مساندة فعالية'),
            ('kind_market', 'مساندة يوم سوق'), ('kind_committee', 'مهمة لجنة'), ('kind_outreach', 'توعية'),
        ])),
        ('deleted', OrderedDict([
            ('person', 'هذا المعرّف يعود لشخص محذوف.'),
            ('partner', 'هذا الشريك محذوف.'),
            ('enterprise', 'هذا المشروع محذوف.'),
            ('vendor', 'هذا العارض محذوف.'),
            ('who', 'حُذف {when} بواسطة {by}'), ('whoUnknown', 'حُذف {when}'),
            ('restoreNote', 'الاستعادة تعيد سجلاتهم إلى كل رقم في الخالدية يحتسبهم، بما في ذلك الأرباع التي سبق الإبلاغ عنها.'),
            ('restore', 'استعادة ومتابعة'), ('restored', 'تمت الاستعادة. احفظ مرة أخرى للمتابعة.'),
            ('coordinatorOnly', 'الاستعادة للمنسق فقط. اطلبها من منسق ثم احفظ مرة أخرى.'),
        ])),
    ])),
    ('detail', OrderedDict([
        ('edit', 'تعديل'), ('delete', 'حذف'), ('restore', 'استعادة'), ('deleteConfirm', 'حذف هذا السجل؟ سيتوقف عن الاحتساب ويمكن استعادته لاحقاً.'),
        ('deletedNote', 'هذا السجل محذوف ولا يُحتسب. يمكن للمنسق استعادته.'),
        ('created', 'أُنشئ'), ('updated', 'حُدِّث'), ('notSet', 'غير محدد'),
        ('counts', 'يُحتسب في المؤشر'), ('notCounts', 'لا يُحتسب'),
        ('milestone', OrderedDict([
            ('title', 'حالة الإنجاز المرحلي'),
            ('established', 'منشأ'), ('partly_established', 'منشأ جزئياً'), ('not_established', 'غير منشأ'),
            ('not_computable', 'غير قابل للاحتساب'),
            ('reason_no_rule', 'لا توجد قاعدة مسجَّلة لهذا الإنجاز المرحلي.'),
            ('reason_rule_not_evaluable', 'تسمّي قاعدة الورقة بنوداً ليست صفوف قائمة تحقق: {broken}. إلى أن يسمّي مسؤول المتابعة والتقييم البنود الحاسمة تبقى الحالة غير قابلة للاحتساب (OQ-56).'),
            ('reason_items_missing', 'بنود حاسمة لم تُسجَّل بعد في هذا التحقق: {missing}.'),
            ('tally', '{in_place} متوفر · {partly} متوفر جزئياً · {not_in_place} غير متوفر، من {n} بنود حاسمة'),
        ])),
        ('attendance', OrderedDict([
            ('title', 'المطابقة'),
            ('total', 'مجموع المشاركين'), ('bySex', 'المجموع حسب الجنس'), ('byAgeSex', 'المجموع حسب العمر والجنس'),
            ('agrees', 'المجاميع متطابقة'), ('disagrees', 'المجاميع غير متطابقة'),
            ('distinct', 'الأفراد المتمايزون'),
            ('reason_not_checked', 'لم يُسجَّل فحص للتكرار.'),
            ('reason_not_yet', 'لم يُنفَّذ فحص التكرار بعد.'),
            ('reason_not_possible', 'غير ممكن بطريقة العدّ هذه.'),
            ('reason_repeat_count_missing', 'يقول فحص التكرار نعم لكن عدد المشاركين المتكررين ناقص.'),
        ])),
        ('participations', 'المشاركات'),
        ('sessionsOf', '{count} من 5'),
        ('completion', OrderedDict([('true', 'أتمّ'), ('false', 'لم يتمّ')])),
    ])),
    ('gate', OrderedDict([('title', 'شاشات الخالدية'), ('body', 'هذه النماذج تخص بلدية الخالدية. حسابك يعمل في بلدية أخرى.')])),
    ('objective', OrderedDict([
        ('impact', 'الأثر · التماسك الاجتماعي والمشاركة المشتركة'),
        ('so1', 'SO1 · الشراكات'),
        ('so2', 'SO2 · الحديقة'),
        ('so3', 'SO3 · التطوع'),
        ('so4', 'SO4 · المشاريع المنزلية والأسواق'),
    ])),
    ('dashboard', OrderedDict([
        ('title', 'لوحة الخالدية'),
        ('intro', 'واحد وعشرون مؤشراً من إطار نتائج الخالدية، تُحتسب من النماذج الواحد والعشرين. كل رقم يُقرأ من قاعدة البيانات؛ لا يُكتب ولا يُحتسب شيء هنا.'),
        ('noValue', '—'),
        ('percent', '{value}٪'),
        ('jod', '{value} دينار'),
        ('ofTarget', 'من {target}'),
        ('targetNotSet', 'غير محدد'),
        ('planTarget', 'هدف الخطة'),
        ('planTargetNote', 'تذكر الخطة أهدافاً للفترة كاملة أو بالسنة أو كنسبة مئوية؛ ولم يُقسَّم أي منها إلى أرباع. لذلك يُقرأ عمود الربع "غير محدد"، وليس صفراً أبداً.'),
        ('unique', OrderedDict([
            ('D2', '{count, plural, =0 {لا أفراد متمايزين} one {فرد متمايز واحد} two {فردان متمايزان} few {# أفراد متمايزين} many {# فرداً متمايزاً} other {# فرد متمايز}}'),
            ('H2', '{count, plural, =0 {لا عارضين فريدين} one {عارض فريد واحد} two {عارضان فريدان} few {# عارضين فريدين} many {# عارضاً فريداً} other {# عارض فريد}}'),
        ])),
        ('denominator', 'من {count}'),
        ('notComputable', 'غير قابل للاحتساب: {detail}'),
        ('noForm', 'لا نموذج'),
        ('rules', 'قواعد الإنجازات المرحلية'),
        ('blockedNotice', '{count, plural, =0 {لا إنجازات مرحلية} one {إنجاز مرحلي واحد لا يمكن احتسابه} two {إنجازان مرحليان لا يمكن احتسابهما} few {# إنجازات مرحلية لا يمكن احتسابها} many {# إنجازاً مرحلياً لا يمكن احتسابها} other {# إنجاز مرحلي لا يمكن احتسابه}} حتى يسمّي مسؤول المتابعة والتقييم بنوده الحاسمة (OQ-56).'),
    ])),
    ('rules', OrderedDict([
        ('title', 'قواعد الإنجازات المرحلية'),
        ('intro', 'يحمل كل نموذج إنجاز مرحلي قاعدة تسمّي بنود قائمة التحقق التي يجب أن تكون "متوفرة" ليُعدّ الإنجاز منشأً. اثنتان من القواعد الأربع تسمّيان بنوداً ليست صفوف قائمة تحقق، فلا يمكن احتساب حالتهما حتى يكتب المنسق البنود الحاسمة هنا. تُعرض قاعدة الورقة حرفياً؛ والقرار بيانات، وتقرؤه عروض المؤشرات في الاستعلام التالي.'),
        ('sourceRule', 'قاعدة الورقة'), ('sourceItems', 'البنود التي تسمّيها القاعدة'), ('critical', 'البنود الحاسمة المطبَّقة'),
        ('notDecided', 'لم يُقرَّر — الحالة غير قابلة للاحتساب'),
        ('decidedOn', 'قُرِّر في {date}'),
        ('items', 'بنود قائمة التحقق لهذا الإنجاز المرحلي'),
        ('decide', 'قرِّر'), ('save', 'حفظ القرار'), ('cancel', 'إلغاء'),
        ('chooseItems', 'ضع علامة على بنود قائمة التحقق التي يجب أن تكون جميعها "متوفرة".'),
        ('clear', 'مسح القرار'),
        ('blocks', 'بانتظار هذا القرار'),
        ('boundary', 'منشأ عندما تكون كل البنود الحاسمة متوفرة؛ غير منشأ عندما لا يكون أي منها متوفراً أو متوفراً جزئياً؛ ومنشأ جزئياً فيما عدا ذلك (الخطة §7.3، افتراض ينبغي لمسؤول المتابعة والتقييم تأكيده).'),
        ('note', 'ملاحظة'),
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


ke, ka = set(keys_of(common_en)), set(keys_of(common_ar))
for k in sorted(ke - ka):
    err('static key %s has no Arabic' % k)
for k in sorted(ka - ke):
    err('static key %s has no English' % k)
for k in ke & ka:
    pe = k.split('.')
    ve, va = common_en, common_ar
    for seg in pe:
        ve, va = ve[seg], va[seg]
    if ve == va and not re.match(r'^[—{]', ve):
        err('static key %s is the same in both languages: %r' % (k, ve))

if errors:
    for e in errors:
        print('ERROR', e)
    sys.exit(1)

en.update(common_en)
ar.update(common_ar)


def write(path, text):
    io.open(path, 'w', encoding='utf-8', newline='').write(text)


write(os.path.join(ROOT, 'app', 'src', 'locales', 'en', 'khld.json'), json.dumps(en, ensure_ascii=False, indent=2) + '\n')
write(os.path.join(ROOT, 'app', 'src', 'locales', 'ar', 'khld.json'), json.dumps(ar, ensure_ascii=False, indent=2) + '\n')

ts = ["// GENERATED by supabase/khalidiyah/gen_forms.py from the catalogue (supabase/khalidiyah/",
      "// catalogue.py) and Khalidiyah_Indicator_Data_Collection_Forms.xlsx. Do not edit; edit",
      "// the catalogue and regenerate. Labels live in locales/{en,ar}/khld.json under",
      "// forms.<id>.fields.<key>; option labels are ref_khld_* rows in the database.",
      "import type { KhldFormDef } from './types'",
      "",
      "export const KHLD_FORMS = " + json.dumps(defs, ensure_ascii=False, indent=2) + " as const satisfies Record<string, KhldFormDef>",
      "",
      "export type KhldFormId = keyof typeof KHLD_FORMS",
      "export const KHLD_FORM_IDS = Object.keys(KHLD_FORMS) as KhldFormId[]",
      ""]
write(os.path.join(ROOT, 'app', 'src', 'khld', 'forms.generated.ts'), '\n'.join(ts))

n = sum(len(s['fields']) for f in defs.values() for s in f['sections'])
print('ok:', len(defs), 'forms,', n, 'fields; locales and forms.generated.ts written')
