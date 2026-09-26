# -*- coding: utf-8 -*-
"""
The resolved model: workbook + catalogue -> forms, fields, columns, lists,
junctions, file fields and the rules between fields.

Every generator (gen_schema.py for the migrations, gen_forms.py for the app)
calls build() and reads the same objects, so they cannot disagree about which
list a field reads or which column it writes.

Verbatim is enforced here, both ways: every option typed in catalogue.LISTS
must appear, English and Arabic, in the option cell of every field that
reads the list, AND once every option is taken out of the cell nothing but
delimiters may remain -- so a list can neither invent an option nor drop
one. The fields whose cell is empty or wrong are the reviewer's corrections
(catalogue.REVIEW_FIXES) and are named where they are skipped.
"""
import os, re, sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from workbook import load_forms, norm
import catalogue as C

# fields whose option cell is empty or not theirs, by the reviewer's own note
NO_OPTION_CELL = {'F060', 'F061', 'F148'}
# a gate every other answer of the form belongs to: FORM-19 "if no then end survey"
FORM_GATES = {'form19': ('F158', ['true'])}
# fields a gate does not govern (the gate itself, and what the database stamps)
UNGATED = {'F158', 'F159'}

SQLTYPE = {'text': 'text', 'area': 'text', 'int': 'int', 'money': 'numeric(12,3)', 'percent': 'numeric(5,2)',
           'date': 'date', 'bool': 'boolean', 'likert': 'smallint'}


def squash(s):
    return re.sub(r'\s+', ' ', s).strip()


class FieldM:
    def __init__(self, sheet_field, spec, form):
        f = sheet_field
        self.sheet = f
        self.fid = f.fid
        self.key = f.fid.lower()
        self.form = form
        self.kind = spec['kind']
        self.col = spec.get('col')
        self.spec = spec
        self.label_en = f.label_en
        self.label_ar = f.label_ar
        fix = C.REVIEW_FIXES.get((f.fid, 'label_en'))
        if fix:
            self.label_en = fix[0]
        req = f.required if 'req' not in spec else spec['req']
        if self.kind in ('stamp', 'reference', 'shown'):
            req = False
        self.required = req
        self.when = []
        if spec.get('when'):
            self.when.append(spec['when'])
        self.list = spec.get('list')
        self.help_en = f.help if f.fid in ('F136', 'F158', 'F162') else ''

    @property
    def conditional(self):
        return bool(self.when)

    def __repr__(self):
        return 'FieldM(%s %s %s)' % (self.fid, self.kind, self.col)


class FormM:
    def __init__(self, fid, meta):
        self.id = fid
        self.meta = meta
        self.table = meta['table']
        self.sheets = meta['sheets']
        self.fields = []
        self.group = meta['group']
        self.title_en = self.title_ar = ''


class Model:
    def __init__(self):
        self.sheet = load_forms()
        self.forms = OrderedDict()
        self.lists_used = OrderedDict()     # list -> [field ids]
        self.columns = OrderedDict((t, []) for t in C.TABLES)
        self.questions = OrderedDict((t, []) for t in C.TABLES)   # multi: (question, list)
        self.junctions = []                 # records: (junction, parent table, parent fk, target table, field)
        self.files = []                     # (table, field id, max, required, when)
        self.errors = []

    def err(self, s):
        self.errors.append(s)

    # ── verbatim ──────────────────────────────────────────────────────────
    def check_cell(self, where, cell_en, cell_ar, opts):
        ce, ca = squash(cell_en), squash(cell_ar)
        rest_e, rest_a = ce, ca
        for _code, en, ar in sorted(opts, key=lambda o: -len(o[1])):
            if squash(en) not in ce:
                self.err('%s: English option %r is not in the sheet cell %r' % (where, en, ce[:90]))
            rest_e = rest_e.replace(squash(en), ' ', 1)
        for _code, en, ar in sorted(opts, key=lambda o: -len(o[2])):
            if squash(ar) not in ca:
                self.err('%s: Arabic option %r is not in the sheet cell %r' % (where, ar, ca[:90]))
            rest_a = rest_a.replace(squash(ar), ' ', 1)
        for side, rest in (('English', rest_e), ('Arabic', rest_a)):
            if re.sub(r'[\s\-–]+', '', rest):
                self.err('%s: the %s cell has text no option accounts for: %r' % (where, side, rest.strip()))

    def check_bool(self, fm):
        f = fm.sheet
        if f.fid in NO_OPTION_CELL:
            return
        (te, ta), (fe, fa) = fm.spec.get('labels', C.YES_NO)
        self.check_cell('%s bool' % f.fid, f.opts_en, f.opts_ar, [('t', te, ta), ('f', fe, fa)])

    # ── build ─────────────────────────────────────────────────────────────
    def build(self):
        by_sheet = {}
        for sid, form in self.sheet.items():
            for f in form.fields:
                by_sheet[f.fid] = f
        seen = set()
        for fid, meta in C.FORMS.items():
            fm = FormM(fid, meta)
            sheet_fields = [f for s in meta['sheets'] for f in self.sheet[s].fields]
            order = C.ORDER.get(fid, [])
            ordered = [by_sheet[x] for x in order] + [f for f in sheet_fields if f.fid not in order]
            if sorted(f.fid for f in ordered) != sorted(f.fid for f in sheet_fields):
                self.err('%s: ORDER names a field that is not on the form' % fid)
            # the title: the sub-page of the form's fields (F004's is the reviewer's fix)
            subs = {(f.sub_en, f.sub_ar) for f in sheet_fields if f.fid != 'F004' and f.fid != 'F010'}
            if len(subs) != 1:
                self.err('%s: the sub-page is not one title: %r' % (fid, subs))
            fm.title_en, fm.title_ar = sorted(subs)[0]
            for f in ordered:
                if f.fid not in C.FIELDS:
                    self.err('%s: no catalogue entry' % f.fid)
                    continue
                seen.add(f.fid)
                field = FieldM(f, C.FIELDS[f.fid], fm)
                gate = FORM_GATES.get(fid)
                if gate and f.fid not in UNGATED:
                    field.when.insert(0, gate)
                fm.fields.append(field)
            self.forms[fid] = fm
        missing = set(C.FIELDS) - seen
        if missing:
            self.err('catalogue fields not on any form: %s' % sorted(missing))
        for fm in self.forms.values():
            for field in fm.fields:
                self.plan(fm, field)
        self.check_whens()
        if self.errors:
            raise SystemExit('model: %d problems\n  ' % len(self.errors) + '\n  '.join(self.errors))
        return self

    def use_list(self, name, field):
        if name not in C.LISTS:
            self.err('%s: unknown list %s' % (field.fid, name))
            return
        self.lists_used.setdefault(name, []).append(field.fid)
        f = field.sheet
        if f.fid in NO_OPTION_CELL:
            return
        opts = [(C.code_of(c), e, a) for c, e, a in C.LISTS[name]]
        self.check_cell('%s (%s)' % (f.fid, name), f.opts_en, f.opts_ar, opts)

    def col(self, table, name, sqltype, notnull, ref, comment):
        if any(c[0] == name for c in self.columns[table]):
            self.err('%s: column %s twice' % (table, name))
        self.columns[table].append((name, sqltype, notnull, ref, comment))

    def plan(self, fm, field):
        t, k, f = fm.table, field.kind, field.sheet
        comment = '%s %s' % (field.fid, field.label_en)
        notnull = field.required and not field.conditional
        if k in SQLTYPE:
            self.col(t, field.col, SQLTYPE[k], notnull, None, comment)
            if k == 'bool':
                self.check_bool(field)
            if k == 'likert':
                self.check_cell('%s likert' % f.fid, f.opts_en, f.opts_ar, C.SCALES[field.spec['scale']])
        elif k == 'select' or k == 'id_type':
            self.use_list(field.list, field)
            self.col(t, field.col, 'uuid', notnull, field.list, comment)
            if any(C.free(c) for c, _e, _a in C.LISTS[field.list]):
                self.col(t, field.col[:-3] + '_other', 'text', False, None, 'free text for ' + field.fid)
        elif k == 'multi':
            self.use_list(field.list, field)
            self.questions[t].append((field.key, field.list))
        elif k == 'records':
            self.junctions.append((field.spec['junction'], t, C.CHILD_FK[t], field.spec['table'], field))
        elif k == 'record':
            self.col(t, field.col, 'uuid', notnull and 'extra' not in field.spec, '@' + field.spec['table'], comment)
            extra = field.spec.get('extra')
            if extra and extra[1]:
                self.col(t, extra[1], 'boolean', True, 'default false', '%s "%s"' % (field.fid, 'General park visit'))
        elif k == 'person_ref':
            self.col(t, field.col, 'uuid', notnull, '@person', comment)
        elif k == 'occasion':
            self.col(t, 'campaign_id', 'uuid', False, '@khld_campaign', comment + ' (a FORM-07 campaign)')
            self.col(t, 'activity_id', 'uuid', False, '@khld_activity', comment + ' (a FORM-08 activity)')
        elif k == 'stamp':
            self.col(t, field.col, 'timestamptz', True, 'now()', comment)
        elif k == 'file':
            self.files.append((t, field.fid, field.spec.get('max', 5), field.required, field.when))
        elif k in ('reference', 'shown', 'ident', 'person_name', 'person_sex', 'dob', 'person_phone'):
            if k == 'person_sex':
                self.use_list(field.list, field)
        else:
            self.err('%s: unknown kind %s' % (field.fid, k))

    def field(self, fid):
        for fm in self.forms.values():
            for f in fm.fields:
                if f.fid == fid:
                    return f
        raise KeyError(fid)

    def check_whens(self):
        for fm in self.forms.values():
            ids = {f.fid for f in fm.fields}
            for f in fm.fields:
                for (gov, values) in f.when:
                    if gov not in ids:
                        self.err('%s: when= names %s, which is not on %s' % (f.fid, gov, fm.id))
                        continue
                    g = self.field(gov)
                    if g.kind in ('select', 'id_type'):
                        codes = [C.code_of(c) for c, _e, _a in C.LISTS[g.list]]
                        for v in values:
                            if v not in codes:
                                self.err('%s: when= code %r is not an option of %s' % (f.fid, v, g.list))
                    elif g.kind == 'bool':
                        if not set(values) <= {'true', 'false'}:
                            self.err('%s: when= on a bool takes true / false' % f.fid)
                    elif g.kind == 'record':
                        if not set(values) <= {'__extra__', '__record__'}:
                            self.err('%s: when= on a record takes __extra__ / __record__' % f.fid)
                    else:
                        self.err('%s: when= on a %s is not supported' % (f.fid, g.kind))


def build():
    return Model().build()


if __name__ == '__main__':
    m = build()
    print(len(m.forms), 'forms,', sum(len(f.fields) for f in m.forms.values()), 'fields,', len(m.lists_used), 'lists,',
          sum(len(C.LISTS[l]) for l in m.lists_used), 'options,', len(m.files), 'file fields,', len(m.junctions), 'junctions')
    for t, cols in m.columns.items():
        print(' ', t, len(cols), 'columns', len(m.questions[t]), 'multi')
    unused = [l for l in C.LISTS if l not in m.lists_used]
    if unused:
        print('unused lists', unused)
