# -*- coding: utf-8 -*-
"""
The sheet and the catalogue joined, and checked against each other.

build() is the one model gen_lists.py and gen_forms.py both read. It stops
on any disagreement instead of guessing: a sheet field the catalogue does not
know, a catalogue field the sheet does not have (other than ADDED), an option
label that is not the sheet's, a help text with no Arabic, a condition that
names a field the form does not have.
"""
from collections import OrderedDict

import catalogue as C
import workbook as W


class Fail(SystemExit):
    pass


def _fail(msg):
    raise Fail('model: ' + msg)


def build():
    sheet = W.load_forms()
    calcs = W.load_calculations()

    # ── the forms in the sheet's order, the catalogue's form list in step ──
    if list(sheet.keys()) != [f['form'] for f in C.FORMS]:
        _fail('the sheet has forms %r, the catalogue %r' % (list(sheet.keys()), [f['form'] for f in C.FORMS]))

    known = set(C.FIELDS)
    seen = set()
    forms = []
    for spec in C.FORMS:
        sf = sheet[spec['form']]
        first = sf.fields[0]
        if first.page_en not in C.GROUPS:
            _fail('%s: page %r is not in GROUPS' % (spec['form'], first.page_en))
        if C.GROUPS[first.page_en] != spec['group']:
            _fail('%s: the sheet puts it on %r, the catalogue in group %r' % (spec['form'], first.page_en, spec['group']))
        fields = []
        for f in sf.fields:
            if f.fid not in known:
                _fail('%s %s is in the sheet and not in catalogue.FIELDS' % (f.form, f.fid))
            if f.sub_en != first.sub_en or f.page_en != first.page_en:
                _fail('%s %s: sub-page or page differs from the form\'s first row' % (f.form, f.fid))
            seen.add(f.fid)
            fields.append(_field(f.fid, f.label_en, f.label_ar, f.ftype, f.readonly, f.required, f.opts_en, f.opts_ar,
                                 f.validation, f.help, f.dependency, f.indicators, f.role, added=False))
        # the owner's additions, each after the field it names
        for fid, a in C.ADDED.items():
            if a['form'] != spec['form']:
                continue
            if fid in seen:
                _fail('%s is ADDED and also in the sheet' % fid)
            seen.add(fid)
            at = next((i for i, x in enumerate(fields) if x['id'] == a['after']), None)
            if at is None:
                _fail('%s: ADDED after %s, which %s does not have' % (fid, a['after'], spec['form']))
            fields.insert(at + 1, _field(fid, a['label_en'], a['label_ar'], a['ftype'], False, a['required'],
                                         a.get('opts_en', []), a.get('opts_ar', []), '', '', '', [], '', added=True))
        ids = {x['id'] for x in fields}
        for x in fields:
            for c in x['spec'].get('when', []):
                if c['field'] not in ids:
                    _fail('%s: condition names %s, not a field of %s' % (x['id'], c['field'], spec['form']))
        indicators = []
        for x in fields:
            for code in x['indicators']:
                if code not in indicators:
                    indicators.append(code)
        forms.append(OrderedDict(spec=spec, title_en=first.sub_en, title_ar=first.sub_ar,
                                 page_en=first.page_en, page_ar=first.page_ar,
                                 fields=fields, indicators=indicators))

    missing = known - seen
    if missing:
        _fail('catalogue.FIELDS names %s, which neither the sheet nor ADDED has' % sorted(missing))

    lists = _lists(sheet)
    for form in forms:
        for x in form['fields']:
            s = x['spec']
            if s['kind'] in ('select', 'multi', 'calc', 'person_sex'):
                if s.get('list') not in lists:
                    _fail('%s reads list %r, which LISTS does not define' % (x['id'], s.get('list')))
            if s['kind'] == 'bool' and tuple(x['opts_en']) != C.BOOL_OPTIONS:
                _fail('%s is a bool and its options are %r' % (x['id'], x['opts_en']))
            if s.get('exclusive') and s['exclusive'] not in [o[0] for o in lists[s['list']]['options']]:
                _fail('%s: exclusive option %r is not in %s' % (x['id'], s['exclusive'], s['list']))

    return dict(forms=forms, lists=lists, calcs=calcs)


def _field(fid, label_en, label_ar, ftype, readonly, required, opts_en, opts_ar, validation, help_en,
           dependency, indicators, role, added):
    spec = C.FIELDS[fid]
    help_ar = ''
    if help_en:
        if help_en not in C.HELP_AR:
            _fail('%s: the help text %r has no Arabic in catalogue.HELP_AR' % (fid, help_en))
        help_ar = C.HELP_AR[help_en]
    if spec['kind'] in ('select', 'multi', 'bool', 'person_sex', 'calc') and not opts_en:
        _fail('%s is a %s and the sheet gives it no options' % (fid, spec['kind']))
    if bool(spec.get('when')) != bool(dependency) and not added:
        # "prepopulated <PR-01>" is a source, not a condition; anything else must be a `when`
        if not (dependency.startswith('prepopulated') and not spec.get('when')):
            _fail('%s: the sheet\'s dependency %r and the catalogue\'s when %r disagree'
                  % (fid, dependency, spec.get('when')))
    return OrderedDict(id=fid, label_en=label_en, label_ar=label_ar, ftype=ftype, readonly=readonly,
                       required=required, opts_en=opts_en, opts_ar=opts_ar, validation=validation,
                       help_en=help_en, help_ar=help_ar, dependency=dependency, indicators=indicators,
                       role=role, added=added, spec=spec)


def _lists(sheet):
    by_id = {}
    for form in sheet.values():
        for f in form.fields:
            by_id[f.fid] = f
    out = OrderedDict()
    for name, spec in C.LISTS.items():
        src = by_id.get(spec['source'])
        if src is None:
            _fail('list %s: source field %s is not in the sheet' % (name, spec['source']))
        if len(src.opts_en) != len(spec['options']):
            _fail('list %s: the sheet has %d options in %s, the catalogue %d'
                  % (name, len(src.opts_en), spec['source'], len(spec['options'])))
        rows = []
        for (code, en_check, free), en, ar in zip(spec['options'], src.opts_en, src.opts_ar):
            if en != en_check:
                _fail('list %s: option %s is %r in the sheet, %r in the catalogue' % (name, code, en, en_check))
            rows.append((code, en, ar, free))
        for other in spec.get('also', []):
            o = by_id[other]
            if o.opts_en != src.opts_en or o.opts_ar != src.opts_ar:
                _fail('list %s: %s and %s do not have the same options' % (name, spec['source'], other))
        if len({r[0] for r in rows}) != len(rows):
            _fail('list %s: duplicate codes' % name)
        out[name] = dict(options=rows, used_by=[spec['source']] + spec.get('also', []))
    return out
