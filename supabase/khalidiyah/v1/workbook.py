# -*- coding: utf-8 -*-
"""
One reading of Khalidiyah_Indicator_Data_Collection_Forms.xlsx.

Every generator under supabase/khalidiyah/ imports this and nothing else reads
the workbook, so the ref lists (0141), the tables (0143), the framework rows
(0144), the form definitions and both locale files come from the SAME cells.

A sheet has a header block (indicator, definition, what the form measures,
unit of analysis, calculation, disaggregation, data source, frequency,
responsible, evidence) and a field table with the columns

    No. | Section | Field name | Question (EN) | Question (AR) |
    Options (EN) | Options (AR) | Field type | Req. | Notes / evidence

Section rows ("Section A — …") carry no No. and are kept as headings.
Every string is kept VERBATIM (whitespace-normalised only); nothing here
translates, drafts or corrects.
"""
import os, re
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
FORMS_XLSX = os.path.join(ROOT, 'Khalidiyah_Indicator_Data_Collection_Forms.xlsx')
FRAMEWORK_XLSX = os.path.join(ROOT, 'Khaldia.xlsx')

FORM_SHEETS = [
    ('imp0',  '02_IMP-0_Interaction_Survey'),
    ('so10',  '03_SO1-0_Partner_Survey'),
    ('a1',    '04_SO1-A1_Partnership_Mech'),
    ('a2',    '05_SO1-A2_Coord_Meeting'),
    ('a3',    '06_SO1-A3_Contributions'),
    ('b1',    '07_SO1-B1_Park_Arrangements'),
    ('so20',  '08_SO2-0_User_Satisfaction'),
    ('c1',    '09_SO2-C1_Works_Completion'),
    ('c2',    '10_SO2-C2_Volunteer_Campaign'),
    ('d1',    '11_SO2-D1_Activity_Record'),
    ('d2',    '12_SO2-D2_Attendance'),
    ('so30',  '13_SO3-0_Volunteer_Tracking'),
    ('e1',    '14_SO3-E1_Committee'),
    ('f1',    '15_SO3-F1_Vol_Programme'),
    ('f2',    '16_SO3-F2_Vol_Registration'),
    ('f3',    '17_SO3-F3_Action_Day'),
    ('so40',  '18_SO4-0_Producer_Followup'),
    ('g1',    '19_SO4-G1_Guidance_Completion'),
    ('g2',    '20_SO4-G2_Enterprise_Support'),
    ('h1',    '21_SO4-H1_Market_Day_Record'),
    ('h2',    '22_SO4-H2_Vendor_Registration'),
]

HEADER_KEYS = {
    'Indicator code': 'code',
    'Indicator': 'indicator',
    'Indicator type': 'type',
    'Definition (framework)': 'definition',
    'What this form measures': 'measures',
    'Unit of analysis — one record per': 'unit',
    'Calculation': 'calculation',
    'Disaggregation': 'disaggregation',
    'Data source': 'source',
    'Frequency / timing': 'frequency',
    'Responsible for completing': 'responsible',
    'Evidence to be filed': 'evidence',
}


def norm(s):
    if s is None:
        return ''
    return re.sub(r'[ \t]+', ' ', str(s)).strip()


def split_bilingual(cell):
    """A header cell is 'English\\nArabic'; returns (en, ar)."""
    parts = [norm(p) for p in str(cell).split('\n') if norm(p)]
    if len(parts) >= 2:
        return parts[0], parts[-1]
    return (parts[0] if parts else ''), ''


def options(cell):
    """The response-option cell split into its lines, verbatim."""
    return [norm(p) for p in str(cell or '').split('\n') if norm(p)]


class Field:
    __slots__ = ('no', 'section', 'section_ar', 'key', 'q_en', 'q_ar', 'opts_en', 'opts_ar',
                 'ftype', 'required', 'note_en', 'note_ar')

    def __init__(self, no, section, key, q_en, q_ar, opts_en, opts_ar, ftype, required, note):
        self.no = int(no)
        sec_en, sec_ar = split_bilingual(section)
        self.section, self.section_ar = sec_en, sec_ar
        self.key = norm(key)
        self.q_en, self.q_ar = norm(q_en), norm(q_ar)
        self.opts_en, self.opts_ar = options(opts_en), options(opts_ar)
        self.ftype = norm(ftype)
        self.required = norm(required) == 'Yes'
        n_en, n_ar = split_bilingual(note) if note else ('', '')
        self.note_en, self.note_ar = n_en, n_ar

    def __repr__(self):
        return 'Field(%d %s %s)' % (self.no, self.key, self.ftype)


class Form:
    __slots__ = ('fid', 'sheet', 'code', 'title_en', 'title_ar', 'head', 'headings', 'fields')

    def __init__(self, fid, sheet):
        self.fid, self.sheet = fid, sheet
        self.head = {}       # key -> (en, ar)
        self.headings = []   # (before_field_no, en, ar)
        self.fields = []

    def field(self, key):
        for f in self.fields:
            if f.key == key:
                return f
        raise KeyError('%s has no field %s' % (self.fid, key))

    def by_no(self, no):
        for f in self.fields:
            if f.no == no:
                return f
        raise KeyError('%s has no item %d' % (self.fid, no))


def load_forms():
    wb = openpyxl.load_workbook(FORMS_XLSX, read_only=True, data_only=True)
    forms = {}
    for fid, sheet in FORM_SHEETS:
        ws = wb[sheet]
        form = Form(fid, sheet)
        rows = list(ws.iter_rows(values_only=True))
        # row 2: "KHLD-IMP-0   |   Title\nKHLD-IMP-0   |   العنوان"
        title_cell = str(rows[1][0])
        en, ar = split_bilingual(title_cell)
        form.code = en.split('|')[0].strip()
        form.title_en = en.split('|', 1)[1].strip()
        form.title_ar = ar.split('|', 1)[1].strip()
        in_table = False
        for r in rows:
            c0 = norm(r[0]) if r and r[0] is not None else ''
            if not in_table:
                key = c0.split('\n')[0] if c0 else ''
                for k, name in HEADER_KEYS.items():
                    if c0.startswith(k) and len(r) > 2 and r[2] is not None:
                        form.head[name] = split_bilingual(r[2])
                if c0.startswith('No.'):
                    in_table = True
                continue
            if not c0:
                continue
            if c0.startswith('Section '):
                sen, sar = [norm(x) for x in c0.split('|', 1)] if '|' in c0 else (c0, '')
                form.headings.append((len(form.fields) + 1, sen, sar))
                continue
            if c0.isdigit():
                form.fields.append(Field(*(list(r[:10]) + [None] * (10 - len(r[:10])))))
        forms[fid] = form
    return forms


def load_framework():
    wb = openpyxl.load_workbook(FRAMEWORK_XLSX, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = [[norm(c) for c in r] for r in ws.iter_rows(values_only=True)]
    header, body = rows[0], [r for r in rows[1:] if any(r)]
    return header, body


def load_guidance():
    wb = openpyxl.load_workbook(FORMS_XLSX, read_only=True, data_only=True)
    ws = wb['01_GUIDANCE']
    return [[norm(c) for c in r] for r in ws.iter_rows(values_only=True)]


def load_index():
    wb = openpyxl.load_workbook(FORMS_XLSX, read_only=True, data_only=True)
    ws = wb['00_INDEX']
    out = []
    for r in ws.iter_rows(values_only=True):
        if r and r[0] is not None and str(r[0]).strip().isdigit():
            out.append([norm(c) for c in r])
    return out


if __name__ == '__main__':
    forms = load_forms()
    n = 0
    for fid, f in forms.items():
        n += len(f.fields)
        print(fid, f.code, len(f.fields), 'fields', len(f.headings), 'sections')
    print('total fields', n)
