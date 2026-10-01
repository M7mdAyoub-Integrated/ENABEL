# -*- coding: utf-8 -*-
"""
What each field of RMTH_Forms_and_Calculations_v2.xlsx IS, for the platform.

workbook.py reads the cells; this file says, per Field ID, which kind of
control it is, which column (or junction question) it writes, which option
list it reads and when it is asked. The generators combine the two, so the
labels on screen are the sheet's words and the structure is this file's.

Nothing here restates a label the sheet has. What the platform adds beyond
the sheet is named, each with its reason:

  ADDED        two fields the municipality's owner asked for on 1 October
               2026 -- PR-07 "Full name" (the shared person table needs a
               name, and pickers name people) and PR-06 the disability
               question (the Calculation Method sheet disaggregates by
               "vulnerability PR-06", which FORM-01 did not ask)
  HELP_AR      the Arabic of the sheet's help texts: the sheet has them in
               English only, so they are drafted (OQ-32's rule; listed for
               review in 06_OPEN_QUESTIONS.md OQ-78)
  LIST codes   a stable code per option; the label beside each is CHECKED
               against the sheet's cell by the generator, never written out

Edit this file and regenerate (gen_lists.py, gen_forms.py); never edit a
generated file.
"""

# ── the forms ────────────────────────────────────────────────────────────────
#
# slug       the app's route segment (/rmth/form01)
# table      the one table the form writes
# group      the workbook's "Page En", as a key (GROUPS)
# writer     the RLS helper that may write: can_write (coordinators, data
#            entry) or is_staff (enumerators too: the three surveys)
# reference  the prefix of the ID the database issues (PJ-01, AC-01)
# published  a coordinator publishes the row on the public page (the owner's
#            request of 1 October 2026: "a button ... to publish it in the
#            public site or not")
# list       the fields the list screen shows as columns
FORMS = [
    dict(form='FORM-01', slug='form01', table='rmth_beneficiary', group='registration', writer='can_write',
         list=['PR-01', 'PR-07', 'PR-02', 'PR-04', 'PR-05']),
    dict(form='FORM-02', slug='form02', table='rmth_project', group='projects', writer='can_write',
         reference='PP', list=['PJ-01', 'PJ-02', 'PJ-03', 'PJ-04']),
    dict(form='FORM-03', slug='form03', table='rmth_activity', group='activities', writer='can_write',
         reference='AC', published=True, list=['AC-01', 'AC-02', 'AC-03', 'AC-04', 'AC-05']),
    dict(form='FORM-04', slug='form04', table='rmth_participation', group='activities', writer='can_write',
         list=['PA-01', 'PA-02', 'PA-03']),
    dict(form='FORM-05', slug='form05', table='rmth_feedback', group='surveys', writer='is_staff',
         list=['FB-01', 'FB-02', 'FB-03', 'FB-04']),
    dict(form='FORM-06', slug='form06', table='rmth_followup', group='surveys', writer='is_staff',
         list=['FU-01', 'FU-02', 'FU-06']),
    dict(form='FORM-07', slug='form07', table='rmth_implementer_survey', group='projects', writer='is_staff',
         list=['IS-01', 'IS-02', 'IS-03']),
]

# The workbook's "Page En" -> the sidebar group, in the order the pages first
# appear. The group labels are the sheet's Page En / Page Ar, verbatim.
GROUPS = {
    'Beneficiary Registration': 'registration',
    'Activities and Participation': 'activities',
    'Local Projects Linked to the Labour Market': 'projects',
    'Surveys and Follow-up': 'surveys',
}

# ── the option lists ─────────────────────────────────────────────────────────
#
# One ref_rmth_<name> table each. `source` is the field whose cell gives the
# labels; every other field named in `also` must have exactly the same
# options (the generator checks). `options` are (code, English label as the
# sheet writes it, free text). The English is only a CHECK: the label written
# to the table is the cell's, in both languages.
#
# Free text: a bare "Other" takes a specification, the convention of OQ-53
# (an "Other" that cannot say what it was cannot be disaggregated). "Other
# stakeholder" names a category and does not.
LISTS = {
    'sex': dict(source='PR-02', options=[
        ('male', 'Male', False), ('female', 'Female', False)]),
    'age_group': dict(source='PR-04', options=[
        ('under_18', 'Under 18', False), ('age_18_24', '18 to 24', False), ('age_25_35', '25 to 35', False),
        ('age_36_45', '36 to 45', False), ('over_45', 'Over 45', False)]),
    'nationality': dict(source='PR-05', options=[
        ('jordanian', 'Jordanian', False), ('syrian', 'Syrian', False), ('other', 'Other', True)]),
    'sector': dict(source='PJ-03', also=['AC-06'], options=[
        ('industrial', 'Industrial', False), ('agricultural', 'Agricultural', False),
        ('administrative', 'Administrative', False), ('urban_development', 'Urban development', False),
        ('infrastructure', 'Infrastructure', False), ('food_manufacturing', 'Food manufacturing', False),
        ('professional_services', 'Professional services', False), ('other', 'Other', True)]),
    'activity_category': dict(source='AC-02', options=[
        ('networking', 'Networking event', False), ('specialised', 'Specialised training programme', False),
        ('short_term', 'Short term training cycle', False),
        ('entrepreneurship', 'Entrepreneurship training programme', False),
        ('incubator_design', 'Incubator design training', False), ('business_incubator', 'Business incubator', False)]),
    'networking_type': dict(source='AC-03', options=[
        ('job_fair', 'Job fair', False), ('guidance_session', 'Vocational guidance session', False),
        ('employer_meeting', 'Employer and job seeker meeting', False)]),
    'joint_partner': dict(source='AC-08', options=[
        ('private_sector', 'Private sector establishment', False), ('academic', 'Academic institution', False),
        ('vocational', 'Vocational institution', False), ('none', 'None', False)]),
    'training_type': dict(source='AC-10', options=[
        ('vocational', 'Vocational training (classroom or workshop)', False), ('on_the_job', 'On the job training', False),
        ('combined', 'Combined', False)]),
    'training_topic': dict(source='AC-12', options=[
        ('production_practices', 'Production practices', False), ('quality_standards', 'Quality standards', False),
        ('management_skills', 'Basic management skills', False), ('other', 'Other', True)]),
    'stakeholder_type': dict(source='PA-04', options=[
        ('municipal_staff', 'Municipal staff', False), ('university', 'University', False),
        ('private_sector', 'Private sector', False), ('other_stakeholder', 'Other stakeholder', False)]),
    'incubation_service': dict(source='PA-05', options=[
        ('business_development', 'Business development support', False), ('mentorship', 'Mentorship', False),
        ('finance_guidance', 'Access to finance guidance', False), ('networking', 'Networking', False),
        ('linkage', 'Linkage to national programmes or private sector', False)]),
    'employability_outcome': dict(source='FU-03', options=[
        ('job_interview', 'Job interview', False), ('job_offer', 'Job offer', False),
        ('internship', 'Internship or on the job training placement', False), ('paid_employment', 'Paid employment', False),
        ('self_employment', 'Self employment or own business', False), ('none', 'None', False)]),
    'placement_type': dict(source='FU-05', options=[
        ('paid_employment', 'Paid employment', False), ('internship', 'Internship or on the job training', False)]),
    'work_status': dict(source='FU-06', options=[
        ('paid_employment', 'Paid employment', False), ('self_employment', 'Self employment or own business', False),
        ('internship', 'Internship or on the job training', False), ('not_working', 'Not working', False)]),
}

# The "Yes - No" fields are booleans; their two labels are the sheet's.
BOOL_OPTIONS = ('Yes', 'No')

# ── the fields ───────────────────────────────────────────────────────────────
#
# kind
#   ident        PR-01: person.national_id, looked up as it is typed
#   person_name  PR-07 (added): person.full_name
#   person_sex   PR-02: person.sex (sex_t), labelled by ref_rmth_sex
#   int, number  one column, a whole number / a number
#   calc         PR-04: worked out by the database (set_rmth_beneficiary_age_group, 0177)
#   select       one column, a foreign key into its list
#   bool         one column, "Yes - No"
#   text, date   one column
#   reference    PJ-01, AC-01: the ID the database issues on save
#   stamp        IS-03: the moment of saving
#   multi        a rmth_<table>_option row per tick; question = the Field ID
#   record       a picker over another Ramtha table (a composite foreign key)
#   person       a person picked from the register (FORM-01): "prepopulated <PR-01>"
#
# when -- every condition must hold:
#   {'field': F, 'values': [codes]}            F's chosen option is one of these
#   {'field': F, 'via': 'category', 'values'}  the ACTIVITY F picked has one of these categories
#   {'field': F, 'answered': True}             F has an answer
# A field whose condition does not hold is dimmed on screen and must be BLANK
# in the database (the guard triggers, 0177; save_rmth_record for the
# multi-selects, 0178).
TRAINING4 = ['specialised', 'short_term', 'entrepreneurship', 'incubator_design']
EMPLOYABILITY = ['specialised', 'short_term']
NOT_NETWORKING = ['specialised', 'short_term', 'entrepreneurship', 'incubator_design', 'business_incubator']

FIELDS = {
    # FORM-01 -- Person Register
    'PR-01': dict(kind='ident'),
    'PR-07': dict(kind='person_name'),
    'PR-02': dict(kind='person_sex', list='sex'),
    'PR-03': dict(kind='int', column='year_of_birth', min=1000, maxCurrentYear=True),
    'PR-04': dict(kind='calc', column='age_group_id', list='age_group'),
    'PR-05': dict(kind='select', column='nationality_id', list='nationality', other='nationality_other'),
    'PR-06': dict(kind='bool', column='has_disability'),
    # FORM-02 -- Approved Projects
    'PJ-01': dict(kind='reference'),
    'PJ-02': dict(kind='date', column='approved_on', notFuture=True),
    'PJ-03': dict(kind='select', column='sector_id', list='sector', other='sector_other'),
    'PJ-04': dict(kind='text', column='sub_sector'),
    # FORM-03 -- Activity Register
    'AC-01': dict(kind='reference'),
    'AC-02': dict(kind='select', column='category_id', list='activity_category'),
    'AC-03': dict(kind='select', column='networking_type_id', list='networking_type',
                  when=[{'field': 'AC-02', 'values': ['networking']}]),
    'AC-04': dict(kind='date', column='start_date'),
    'AC-05': dict(kind='date', column='end_date', notBefore='AC-04',
                  when=[{'field': 'AC-02', 'values': TRAINING4}]),
    'AC-06': dict(kind='select', column='sector_id', list='sector', other='sector_other',
                  when=[{'field': 'AC-02', 'values': NOT_NETWORKING}]),
    'AC-07': dict(kind='record', column='project_id', table='rmth_project',
                  when=[{'field': 'AC-02', 'values': ['specialised']}]),
    'AC-08': dict(kind='multi', question='ac08', list='joint_partner', exclusive='none',
                  when=[{'field': 'AC-02', 'values': ['short_term']}]),
    'AC-09': dict(kind='number', column='contact_hours', positive=True,
                  when=[{'field': 'AC-02', 'values': ['short_term']}]),
    'AC-10': dict(kind='select', column='training_type_id', list='training_type',
                  when=[{'field': 'AC-02', 'values': EMPLOYABILITY}]),
    'AC-11': dict(kind='int', column='sessions_delivered', positive=True,
                  when=[{'field': 'AC-02', 'values': ['entrepreneurship']}]),
    'AC-12': dict(kind='multi', question='ac12', list='training_topic',
                  when=[{'field': 'AC-02', 'values': ['entrepreneurship']}]),
    # FORM-04 -- Participation Record
    'PA-01': dict(kind='record', column='activity_id', table='rmth_activity'),
    'PA-02': dict(kind='person', column='person_id'),
    'PA-03': dict(kind='bool', column='completed',
                  when=[{'field': 'PA-01', 'via': 'category', 'values': TRAINING4}]),
    'PA-04': dict(kind='select', column='stakeholder_type_id', list='stakeholder_type',
                  when=[{'field': 'PA-01', 'via': 'category', 'values': ['incubator_design']}]),
    'PA-05': dict(kind='multi', question='pa05', list='incubation_service',
                  when=[{'field': 'PA-01', 'via': 'category', 'values': ['business_incubator']}]),
    'PA-06': dict(kind='date', column='service_date', notFuture=True,
                  when=[{'field': 'PA-01', 'via': 'category', 'values': ['business_incubator']}]),
    # FORM-05 -- Participant Feedback. FB-01 lists only the activities one of
    # its two questions is asked about: a feedback with nothing to answer is
    # not a response (guard_rmth_feedback, 0177).
    'FB-01': dict(kind='record', column='activity_id', table='rmth_activity',
                  categories=['networking'] + EMPLOYABILITY),
    'FB-02': dict(kind='person', column='person_id'),
    'FB-03': dict(kind='bool', column='improved_knowledge',
                  when=[{'field': 'FB-01', 'via': 'category', 'values': ['networking']}]),
    'FB-04': dict(kind='bool', column='supported_employment',
                  when=[{'field': 'FB-01', 'via': 'category', 'values': EMPLOYABILITY}]),
    # FORM-06 -- Beneficiary Follow-up
    'FU-01': dict(kind='person', column='person_id'),
    'FU-02': dict(kind='date', column='followup_date', notFuture=True),
    'FU-03': dict(kind='multi', question='fu03', list='employability_outcome', exclusive='none'),
    'FU-04': dict(kind='date', column='first_placement_on', notAfter='FU-02',
                  when=[{'field': 'FU-03', 'values': ['internship', 'paid_employment']}]),
    'FU-05': dict(kind='select', column='first_placement_type_id', list='placement_type',
                  when=[{'field': 'FU-04', 'answered': True}]),
    'FU-06': dict(kind='select', column='work_status_id', list='work_status'),
    'FU-07': dict(kind='date', column='continuous_since', notAfter='FU-02',
                  when=[{'field': 'FU-06', 'values': ['paid_employment', 'self_employment']}]),
    'FU-08': dict(kind='int', column='income_months', min=0, max=6,
                  when=[{'field': 'FU-06', 'values': ['self_employment']}]),
    'FU-09': dict(kind='bool', column='in_municipal_project',
                  when=[{'field': 'FU-06', 'values': ['paid_employment']}]),
    # FORM-07 -- Project Implementer Survey
    'IS-01': dict(kind='record', column='project_id', table='rmth_project'),
    'IS-02': dict(kind='bool', column='support_essential'),
    'IS-03': dict(kind='stamp', column='surveyed_at'),
}

# ── what the owner added (1 October 2026) ────────────────────────────────────
#
# `after` places the field in the form; the IDs continue the sheet's series
# (PR-06 is the ID the Calculation Method sheet already uses for
# "vulnerability"). Labels in both languages, as put to the owner.
ADDED = {
    'PR-07': dict(form='FORM-01', after='PR-01', label_en='Full name', label_ar='الاسم الكامل',
                  ftype='text', required=True,
                  why='the shared person table needs a name, and the pickers of FORM-04/05/06 name people'),
    'PR-06': dict(form='FORM-01', after='PR-05', label_en='Do you have a disability?', label_ar='هل لديك إعاقة؟',
                  ftype='select one', required=True, opts_en=['Yes', 'No'], opts_ar=['نعم', 'لا'],
                  why='the Calculation Method sheet disaggregates by "vulnerability PR-06"'),
}

# ── the help texts in Arabic (drafted; OQ-78) ────────────────────────────────
#
# Keyed by the sheet's English, so a changed help text in the workbook fails
# the generator instead of keeping a stale translation.
HELP_AR = {
    'Search the register before adding; each person is registered once only':
        'ابحث في السجل قبل الإضافة؛ يُسجَّل كل شخص مرة واحدة فقط',
    "Auto-calculated: registration year − PR-03. Bands combine to the framework's 25–35 (impact) and 25–45 (other indicators)":
        'يُحتسب تلقائياً: سنة التسجيل − PR-03. تُجمع الفئات لتطابق فئة 25–35 في الإطار (الأثر) و25–45 (المؤشرات الأخرى)',
    'Register approved proposals only':
        'سجّل المقترحات المعتمدة فقط',
    'Choose the category that matches the indicator the activity reports to':
        'اختر الفئة التي تطابق المؤشر الذي يُبلَّغ عنه النشاط',
    'For a business incubator: the date core incubation services began':
        'لحاضنة الأعمال: تاريخ بدء خدمات الاحتضان الأساسية',
    'If the person is not found, register them in FORM-01 first':
        'إذا لم يُعثر على الشخص، سجّله أولاً في FORM-01',
    'For employability trainings answer Yes only if the participant was assessed as job-ready':
        'في تدريبات قابلية التوظيف، أجب بنعم فقط إذا قُيِّم المشارك على أنه جاهز للعمل',
}

# The prefix of a Field ID -> the form it belongs to, for reading the
# Calculation Method sheet's "Required Field(s)".
PREFIX_FORM = {'PR': 'FORM-01', 'PJ': 'FORM-02', 'AC': 'FORM-03', 'PA': 'FORM-04',
               'FB': 'FORM-05', 'FU': 'FORM-06', 'IS': 'FORM-07'}


def indicator_forms(required_fields):
    """
    The forms an indicator is entered through, from its "Required Field(s)"
    cell: the form of the first field of each ';'-separated group, in order,
    without FORM-01 (the register supplies the breakdowns, never the count).
    A lookup across an arrow ("PA-01->AC-02") belongs to the group's form.
    """
    out = []
    for group in required_fields.split(';'):
        first = group.strip().split(',')[0].strip()
        prefix = first[:2]
        form = PREFIX_FORM.get(prefix)
        if form and form != 'FORM-01' and form not in out:
            out.append(form)
    return out
