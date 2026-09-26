# -*- coding: utf-8 -*-
"""
The resolved model: workbook + catalogue -> lists, columns, junctions, children.

Every generator (gen_0141 lists, gen_0143 tables, gen_forms definitions and
locales) calls build() and reads the same objects, so the three cannot
disagree about which list a field reads or which column it writes.

Verbatim is enforced here: an option typed in catalogue.py (the sub-items of
a "Days: Friday / Saturday / ..." cell) must appear, English and Arabic, in
the sheet's option cell, or build() fails.
"""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from workbook import load_forms
from catalogue import (FORMS, TABLES, SHARED_LISTS, OPTION_CODES, OVERRIDES, REFERENCES,
                       CHECKLIST_PREFIXES, LIST_FIXES, LISTS_ADDED_LATER, effective_free, spec_for, list_name, has_blank)

FREE_TEXT_WORDS = ('specify', 'describe', 'names:', 'name:', 'reason:', 'why:', 'phone:', 'date:',
                   'number:', 'reference:', 'example:', 'explanation:', 'provider:', 'missing:', 'no.:',
                   'authority:', 'partner:', 'organisation:', 'entity:', 'licence number:', 'score:',
                   'institution:', 'rank:', 'justification:', 'complete:', 'where and in what:')


def slug(s, maxlen=48):
    s = s.lower()
    s = s.replace('—', ' ').replace('–', '_').replace('&', 'and').replace('’', '').replace("'", '')
    s = re.sub(r'\(.*?\)', ' ', s)          # drop parentheticals
    s = re.sub(r':\s*_+.*$', '', s)          # drop ": ____ ..." tails
    s = re.sub(r'_+', '_', s)
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    s = re.sub(r'_+', '_', s)
    if s and s[0].isdigit():
        s = 'n_' + s
    return s[:maxlen].strip('_') or 'option'


def option_is_free_text(label):
    l = label.lower()
    if has_blank(label):
        return True
    if l.strip() == 'other':
        return True
    return any(w in l for w in ('(specify', 'specify)', '(specify)', 'describe'))


def checklist_code(label, i):
    l = label.lower()
    if l.startswith('in place'):
        prefix = 'in_place'
    elif l.startswith('partly in place'):
        prefix = 'partly'
    elif l.startswith('not in place'):
        prefix = 'not_in_place'
    elif l.startswith('no volunteers under 18'):
        return 'not_accepted'
    else:
        raise ValueError('checklist option without a status prefix: %r' % label)
    rest = re.sub(r'^(in place|partly in place|not in place)', '', l).strip(' —-')
    rest = slug(rest, 30) if rest else ''
    return prefix + ('_' + rest if rest else '')


class Lst:
    def __init__(self, name):
        self.name = name
        self.options = []      # (code, en, ar, free)
        self.used_by = []
        self.is_checklist = False
        self.is_cells = False


class Model:
    def __init__(self):
        self.forms = load_forms()
        self.lists = {}        # name -> Lst
        self.specs = {}        # fid -> {key: spec}
        self.columns = {}      # table -> [(name, sqltype, nullable, ref_list|None, comment)]
        self.questions = {}    # table -> [(question_code, list_name, milestone_code|None)]
        self.count_fields = {} # table -> [(field_code, list_name, milestone_code|None)]
        self.checklist_items = {}  # milestone_code -> [(item_no, field_code, list_name, has_detail)]
        self.milestone_columns = {}  # milestone_code -> [column names specific to it]

    # ── lists ────────────────────────────────────────────────────────────
    def add_list(self, name, en_opts, ar_opts, used_by, codes=None, no_other=False, checklist=False, cells=False):
        if len(en_opts) != len(ar_opts):
            raise ValueError('%s: %d English options, %d Arabic (%s)' % (name, len(en_opts), len(ar_opts), used_by))
        opts = []
        seen = set()
        for i, (en, ar) in enumerate(zip(en_opts, ar_opts)):
            if codes:
                code = codes[i]
            elif name in OPTION_CODES:
                code = OPTION_CODES[name][i]
            elif checklist:
                code = checklist_code(en, i)
            else:
                code = slug(en)
            if code in seen:
                code = '%s_%d' % (code, i + 1)
            seen.add(code)
            free = (not no_other) and (not cells) and (not checklist) and option_is_free_text(en)
            opts.append((code, en, ar, free))
        if name in OPTION_CODES and len(OPTION_CODES[name]) != len(en_opts):
            raise ValueError('%s: OPTION_CODES has %d codes for %d options' % (name, len(OPTION_CODES[name]), len(en_opts)))
        if name in self.lists:
            ex = self.lists[name]
            if [o[1] for o in ex.options] != en_opts:
                raise ValueError('%s: used with different options by %s and %s' % (name, ex.used_by, used_by))
            if [o[2] for o in ex.options] != ar_opts:
                raise ValueError('%s: Arabic differs between %s and %s' % (name, ex.used_by, used_by))
            ex.used_by.append(used_by)
            return ex
        l = Lst(name)
        l.options = opts
        l.used_by = [used_by]
        l.is_checklist = checklist
        l.is_cells = cells
        self.lists[name] = l
        return l

    def _verbatim(self, f, en_opts, ar_opts, where):
        """Every typed sub-option must be a substring of the sheet's cell."""
        cell_en = ' '.join(f.opts_en)
        cell_ar = ' '.join(f.opts_ar)
        for o in en_opts:
            if o not in cell_en:
                raise ValueError('%s: English option %r is not in the sheet cell %r' % (where, o, cell_en[:80]))
        for o in ar_opts:
            if o not in cell_ar:
                raise ValueError('%s: Arabic option %r is not in the sheet cell' % (where, o))

    # The code a multi-select question or a count field is stored under in
    # its junction. Four milestone forms share khld_milestone_verification,
    # and khld_question_list is keyed on (table, code), so on that table the
    # code carries the form id: a1_evidence_attached, b1_evidence_attached,
    # e1_evidence_attached and f1_evidence_attached are four questions
    # reading four lists. guard_khld_milestone_child (0147) then requires
    # the prefix to be the parent's milestone. Everywhere else the code is
    # the sheet's field key.
    @staticmethod
    def qcode(fid, key, mcode):
        return '%s_%s' % (fid, key) if mcode else key

    def _list_for_part(self, fid, f, col, cfg, where):
        en, ar = cfg['options'], cfg['options_ar']
        self._verbatim(f, en, ar, where)
        return self.add_list(cfg['list'], en, ar, cfg.get('used_by', where), codes=cfg.get('codes'), no_other=cfg.get('no_other', False))

    # ── build ────────────────────────────────────────────────────────────
    def build(self):
        for fid, form in self.forms.items():
            meta = FORMS[fid]
            table = meta['table']
            self.specs[fid] = {}
            self.columns.setdefault(table, [])
            self.questions.setdefault(table, [])
            self.count_fields.setdefault(table, [])
            mcode = meta.get('milestone')
            if mcode:
                self.checklist_items[mcode] = []
                self.milestone_columns[mcode] = []
            seen_keys = set()
            for f in form.fields:
                spec = spec_for(fid, f)
                self.specs[fid][f.key] = spec
                seen_keys.add(f.key)
                self._plan_field(fid, form, f, spec, table, mcode)
            # overrides that name a field the sheet does not have (e.g. c2._participants)
            for key, spec in OVERRIDES.get(fid, {}).items():
                if key not in seen_keys:
                    if not key.startswith('_'):
                        raise ValueError('%s: override for unknown field %s' % (fid, key))
                    self.specs[fid][key] = spec
        return self

    def _col(self, table, name, sqltype, nullable=True, ref=None, comment='', mcode=None):
        cols = self.columns[table]
        names = [c[0] for c in cols]
        if name in names:
            if mcode:
                # the same column on two milestone forms is one column
                self.milestone_columns[mcode].append(name)
                return
            raise ValueError('%s: column %s defined twice' % (table, name))
        cols.append((name, sqltype, nullable, ref, comment))
        if mcode:
            self.milestone_columns[mcode].append(name)

    def _plan_field(self, fid, form, f, spec, table, mcode):
        kind = spec['kind']
        where = '%s.%s' % (fid, f.key)
        req = spec.get('required', False)
        if kind in ('text', 'area'):
            self._col(table, f.key, 'text', not req, comment=f.q_en, mcode=mcode)
        elif kind == 'number':
            self._col(table, f.key, 'int', not req, comment=f.q_en, mcode=mcode)
        elif kind == 'money':
            self._col(table, f.key, 'numeric(12,3)', not req, comment=f.q_en, mcode=mcode)
        elif kind == 'date':
            self._col(table, f.key, 'date', not req, comment=f.q_en, mcode=mcode)
        elif kind == 'month':
            self._col(table, f.key, 'date', not req, comment=f.q_en + ' (first of the month)', mcode=mcode)
        elif kind == 'bool':
            self._col(table, f.key, 'boolean', not req, comment=f.q_en, mcode=mcode)
            if spec.get('stamp'):
                self._col(table, f.key + '_recorded_on', 'timestamptz', True, comment='when ' + f.key + ' was recorded', mcode=mcode)
                self._col(table, f.key + '_recorded_by', 'uuid', True, comment='who recorded ' + f.key, mcode=mcode)
        elif kind == 'select':
            name = list_name(fid, f, spec)
            opts = spec.get('options') or f.opts_en
            opts_ar = spec.get('options_ar') or f.opts_ar
            if spec.get('options'):
                self._verbatim(f, opts, opts_ar, where)
            l = self.add_list(name, opts, opts_ar, where, codes=spec.get('codes'), no_other=spec.get('no_other', False))
            self._col(table, f.key + '_id', 'uuid', not req, ref=name, comment=f.q_en, mcode=mcode)
            if any(effective_free(l.name, o[0], o[3]) for o in l.options):
                self._col(table, f.key + '_other', 'text', True, comment='free text for ' + f.key, mcode=mcode)
            if spec.get('stamp'):
                self._col(table, f.key + '_recorded_on', 'timestamptz', True, comment='when ' + f.key + ' was recorded', mcode=mcode)
                self._col(table, f.key + '_recorded_by', 'uuid', True, comment='who recorded ' + f.key, mcode=mcode)
        elif kind == 'multi':
            name = list_name(fid, f, spec)
            self.add_list(name, f.opts_en, f.opts_ar, where)
            self.questions[table].append((self.qcode(fid, f.key, mcode), name, mcode))
        elif kind == 'checklist':
            opts = spec.get('options') or f.opts_en
            opts_ar = spec.get('options_ar') or f.opts_ar
            name = list_name(fid, f, spec) if not spec.get('options') else 'checklist_status'
            if spec.get('options'):
                self._verbatim(f, opts, opts_ar, where)
            self.add_list(name, opts, opts_ar, where, checklist=True)
            has_detail = any(has_blank(o) for o in opts)
            self.checklist_items[mcode].append((f.no, f.key, name, has_detail))
        elif kind == 'counts':
            name = '%s_%s' % (fid, f.key)
            cells = spec['cells']
            self.add_list(name, [c[1] for c in cells], [c[2] for c in cells], where, codes=[c[0] for c in cells], cells=True)
            self.count_fields[table].append((self.qcode(fid, f.key, mcode), name, mcode))
        elif kind == 'parts':
            # a required compound field makes its FIRST typed part NOT NULL (the
            # answer that says which case applies); a free-text part never is
            first = True
            for (col, pkind, en, ar, cfg) in spec['parts']:
                pwhere = where + '.' + col
                nullable = not (req and first and pkind in ('select', 'bool', 'number', 'date', 'money'))
                first = False
                if pkind in ('text', 'phone'):
                    self._col(table, col, 'text', True, comment=en, mcode=mcode)
                elif pkind == 'number':
                    self._col(table, col, 'int', nullable, comment=en, mcode=mcode)
                elif pkind == 'money':
                    self._col(table, col, 'numeric(12,3)', nullable, comment=en, mcode=mcode)
                elif pkind == 'date':
                    self._col(table, col, 'date', nullable, comment=en, mcode=mcode)
                elif pkind == 'bool':
                    self._col(table, col, 'boolean', nullable, comment=en, mcode=mcode)
                elif pkind == 'select':
                    l = self._list_for_part(fid, f, col, cfg, pwhere)
                    self._col(table, col, 'uuid', nullable, ref=cfg['list'], comment=en, mcode=mcode)
                    if any(effective_free(l.name, o[0], o[3]) for o in l.options):
                        self._col(table, re.sub(r'_id$', '', col) + '_other', 'text', True, comment='free text for ' + col, mcode=mcode)
                elif pkind == 'multi':
                    self._list_for_part(fid, f, col, cfg, pwhere)
                    self.questions[table].append((self.qcode(fid, col, mcode), cfg['list'], mcode))
                elif pkind == 'record':
                    self._col(table, col, 'uuid', True, ref='@' + cfg['table'], comment=en, mcode=mcode)
                elif pkind == 'person_phone':
                    pass  # person.phone
                else:
                    raise ValueError('%s: unknown part kind %s' % (pwhere, pkind))
        elif kind == 'record':
            self._col(table, spec['column'], 'uuid', not req, ref='@' + spec['table'], comment=f.q_en, mcode=mcode)
        elif kind == 'age_group':
            self.add_list('age_group', f.opts_en, f.opts_ar, where)
            self._col(table, 'age_group_id', 'uuid', not req, ref='age_group', comment=f.q_en, mcode=mcode)
        elif kind in ('ident', 'person_name', 'person_sex', 'person_phone', 'dob', 'dob_age'):
            if kind == 'person_sex':
                self.add_list('sex', f.opts_en, f.opts_ar, where)
        elif kind == 'readonly':
            if spec.get('list'):
                self.add_list(spec['list'], f.opts_en, f.opts_ar, where)
        elif kind == 'rating':
            items, ratings = parse_matrix(f)
            self.add_list('so20_facility_item', [i[0] for i in items], [i[1] for i in items], where, cells=True)
            self.add_list('so20_facility_rating', [r[0] for r in ratings], [r[1] for r in ratings], where, cells=True)
        elif kind == 'session':
            n = spec['n']
            name = list_name(fid, f, spec)
            # the session's date has its own column; "Attended — date: ____" takes no free text
            self.add_list(name, f.opts_en, f.opts_ar, where, no_other=True)
            self._col(table, 's%d_status_id' % n, 'uuid', True, ref=name, comment=f.q_en, mcode=mcode)
            self._col(table, 's%d_date' % n, 'date', True, comment='date of session %d' % n, mcode=mcode)
        elif kind in ('participants', 'participation_log'):
            pass
        else:
            raise ValueError('%s: unknown kind %s' % (where, kind))


def parse_matrix(f):
    """SO2-0's rate_facilities: 'Rate each: a | b | c … → Good / Acceptable / Poor / Not available'."""
    en = f.opts_en
    ar = f.opts_ar
    items_en = [x.strip() for x in en[0].split(':', 1)[1].split('|')]
    items_ar = [x.strip() for x in ar[0].split(':', 1)[1].split('|')]
    ratings_en = [x.strip() for x in en[1].lstrip('→ ').split('/')]
    ratings_ar = [x.strip() for x in ar[1].lstrip('→ ').split('/')]
    if len(items_en) != len(items_ar) or len(ratings_en) != len(ratings_ar):
        raise ValueError('rate_facilities: English and Arabic do not align')
    return list(zip(items_en, items_ar)), list(zip(ratings_en, ratings_ar))


def build():
    return Model().build()


if __name__ == '__main__':
    m = build()
    print(len(m.lists), 'lists,', sum(len(l.options) for l in m.lists.values()), 'options')
    for t in TABLES:
        print(' ', t, len(m.columns.get(t, [])), 'columns', len(m.questions.get(t, [])), 'questions', len(m.count_fields.get(t, [])), 'count fields')
    for mc, items in m.checklist_items.items():
        print(' ', mc, [i[0] for i in items])
