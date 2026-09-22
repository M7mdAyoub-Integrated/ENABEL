# -*- coding: utf-8 -*-
"""
How each of the 526 fields of the 21 Khalidiyah sheets reaches the schema.

workbook.py reads the sheets; this file says, per field, what KIND of thing it
is in the database. Nothing here carries a label: every question, option,
section heading and note is read from the sheet at generation time, so a
string on screen cannot differ from the workbook. What this file carries is
structure -- which fields are one column, which are several (plan 5.2), which
lists are shared between sheets, which "by" counts are child rows, which
records link to which, and which fields the database derives (plan 5.4).

The default for a field follows its sheet type (default_spec below); an entry
in OVERRIDES replaces it. Every field of every form must resolve, and the
generators assert it.

Kinds (what the column, child or control is):

  text / area / number / money / date         one column, the sheet's field name
  bool                                        one boolean column (the sheet's Yes/No)
  select   ref list; `other` column when an option carries free text
  multi    an option junction row per tick (khld_<table>_option, question = field key)
  checklist  a khld_milestone_checklist_item row (milestone forms only)
  counts   a khld_<table>_count row per cell (the "by ..." fields)
  parts    several columns under one sheet row, each with its own kind
  ident    the identifier block -> person (national ID or UNHCR, chosen explicitly)
  person_name / person_sex / person_phone / dob / dob_age  -> person
  record   a picker over another Khalidiyah table (a foreign key)
  readonly derived by the database, shown, never accepted
  rating   SO2-0's facility matrix (a khld_user_feedback_rating row per item)
  session  one of SO4-G1's five core sessions (status + date)
  participants  the volunteers present (khld_volunteer_participation rows)
"""

# ── the reference prefixes the sheets issue ───────────────────────────────
REFERENCES = {
    'a2': ('CM',  2, 'meeting_date'),        # KHLD-CM-YYYY-NN
    'a3': ('CON', 2, 'date_pledged'),        # KHLD-CON-YYYY-NN (the year of the pledge, else receipt, else creation)
    'c1': ('REH', 2, None),                  # KHLD-REH-NN
    'c2': ('VC',  2, 'campaign_date'),       # KHLD-VC-YYYY-NN
    'd1': ('EV',  2, 'event_date'),          # KHLD-EV-YYYY-NN
    'f2': ('VOL', 4, None),                  # KHLD-VOL-NNNN
    'f3': ('AD',  2, 'date'),                # KHLD-AD-YYYY-NN
    'g1': ('ENT', 3, None),                  # KHLD-ENT-NNN (the enterprise, an entity)
    'h1': ('MKT', 2, 'market_date'),         # KHLD-MKT-YYYY-NN
    'h2': ('VEN', 3, None),                  # KHLD-VEN-NNN (the vendor, an entity)
}

# ── the 21 forms: table, identity class, unit of observation ─────────────
FORMS = {
    'imp0': dict(table='khld_interaction_survey', cls='anonymous'),
    'so10': dict(table='khld_partner_survey',     cls='organisation'),
    'a1':   dict(table='khld_milestone_verification', cls='record', milestone='SO1-A1'),
    'a2':   dict(table='khld_coordination_meeting', cls='record'),
    'a3':   dict(table='khld_contribution',        cls='organisation'),
    'b1':   dict(table='khld_milestone_verification', cls='record', milestone='SO1-B1'),
    'so20': dict(table='khld_user_feedback',       cls='anonymous'),
    'c1':   dict(table='khld_works_item',          cls='record'),
    'c2':   dict(table='khld_campaign',            cls='record'),
    'd1':   dict(table='khld_activity',            cls='record'),
    'd2':   dict(table='khld_attendance',          cls='aggregate'),
    'so30': dict(table='khld_volunteer_tracking',  cls='linked'),
    'e1':   dict(table='khld_milestone_verification', cls='record', milestone='SO3-E1'),
    'f1':   dict(table='khld_milestone_verification', cls='record', milestone='SO3-F1'),
    'f2':   dict(table='khld_volunteer',           cls='person'),
    'f3':   dict(table='khld_action_day',          cls='record'),
    'so40': dict(table='khld_producer_survey',     cls='linked'),
    'g1':   dict(table='khld_guidance_completion', cls='person'),
    'g2':   dict(table='khld_enterprise_support',  cls='linked'),
    'h1':   dict(table='khld_market',              cls='record'),
    'h2':   dict(table='khld_vendor_registration', cls='person'),
}

# The tables (record tables + entities) in dependency order.
TABLES = [
    'khld_partner', 'khld_enterprise', 'khld_vendor',
    'khld_works_item', 'khld_coordination_meeting', 'khld_contribution',
    'khld_campaign', 'khld_activity', 'khld_market', 'khld_action_day',
    'khld_volunteer', 'khld_attendance',
    'khld_guidance_completion', 'khld_enterprise_support', 'khld_vendor_registration',
    'khld_interaction_survey', 'khld_partner_survey', 'khld_user_feedback',
    'khld_volunteer_tracking', 'khld_producer_survey',
    'khld_milestone_verification',
]

# ── shared option lists: identical option text on several sheets is ONE list ─
# The key is the tuple of English options exactly as the sheets have them.
SHARED_LISTS = {
    ('Female', 'Male'): 'sex',
    ('Under 12', '12–14', '15–24 (youth)', '25–34', '35–49', '50–64', '65 and above'): 'age_group',
    ('Jordanian (host community)', 'Syrian refugee registered with UNHCR', 'Syrian, not registered',
     'Other nationality', 'Prefer not to say'): 'nationality',
    ('No difficulty', 'Some difficulty', 'A lot of difficulty', 'Cannot do at all', 'Prefer not to say'): 'disability',
    ('New Khaldiyah (Al-Karama)', 'Al-Mabrouka', 'Old Khaldiyah', 'Al-Mashrafa', 'Outside the municipality'): 'neighbourhood',
    ('Strongly agree', 'Agree', 'Neither agree nor disagree', 'Disagree', 'Strongly disagree'): 'agree_scale',
    ('In place', 'Partly in place', 'Not in place'): 'checklist_status',
    ('Baked goods and pastries', 'Cooked food and meals', 'Pickles and preserves', 'Jams', 'Dairy products',
     'Honey and bee products', 'Herbs and spices', 'Handicrafts and embroidery', 'Sewing and clothing',
     'Accessories', 'Soaps and cosmetics', 'Plants and seedlings', 'Other'): 'product_type',
    ('Under 20 JOD', '20–50 JOD', '51–100 JOD', '101–200 JOD', '201–500 JOD', 'Over 500 JOD', 'Prefer not to say'): 'sales_band',
    ('Yes, fully', 'Partly', 'No'): 'yes_fully_partly_no',
    ('Attended — date: ____', 'Did not attend'): 'session_attendance',
    ('Local charitable or development association', "Women's organisation", 'Youth initiative or volunteer group',
     'Cultural institution (e.g. Zaha Cultural Centre)', 'School', 'University', 'Private sector business or trader',
     'Government entity', 'Donor or development partner', 'Other'): 'partner_type',
    ('Yes — phone: ____', 'No'): 'recontact',
    ('No', 'Yes — describe and state the action taken: ____'): 'incident',
}

# Codes the option slugs must resolve to where the label alone would be
# ambiguous or where a view reads the code (gates, statuses, bands).
OPTION_CODES = {
    'age_group': ['under_12', '12_14', '15_24', '25_34', '35_49', '50_64', 'age_65_plus'],
    'nationality': ['jordanian', 'syrian_registered', 'syrian_unregistered', 'other', 'prefer_not_to_say'],
    'disability': ['no_difficulty', 'some_difficulty', 'a_lot_of_difficulty', 'cannot_do_at_all', 'prefer_not_to_say'],
    'sex': ['female', 'male'],
    'checklist_status': ['in_place', 'partly', 'not_in_place'],
    'agree_scale': ['strongly_agree', 'agree', 'neither', 'disagree', 'strongly_disagree'],
    'session_attendance': ['attended', 'did_not_attend'],
    'a2_minutes_prepared': ['yes_filed', 'prepared_not_signed', 'not_prepared'],
    'a3_status': ['pledged', 'received_full', 'partly_received', 'cancelled'],
    'c1_status': ['completed', 'in_progress', 'not_started', 'cancelled'],
    'h2_attended': ['whole', 'part', 'absent'],
    'so20_overall_satisfaction': ['very_satisfied', 'satisfied', 'neither', 'dissatisfied', 'very_dissatisfied'],
    'so40_overall_opportunity': ['yes_significantly', 'yes_to_some_extent', 'no_change', 'no_not_useful'],
    'so40_respondent_is_vendor': ['yes', 'no_household_member', 'no_not_reached'],
    'imp0_visit_freq': ['never', 'once_or_twice', 'every_few_months', 'about_monthly', 'weekly_or_more'],
    'imp0_consent': ['yes', 'no'],
    'g1_s3_hygiene': ['attended', 'did_not_attend', 'not_applicable'],
    'd2_duplicate_check': ['yes', 'not_yet', 'not_possible'],
    'd2_register_attached': ['yes', 'partly', 'no'],
    'd2_reconciliation': ['agree', 'disagree'],
    'g2_sup_hygiene': ['yes', 'no', 'not_applicable'],
    'f1_minors_arrangements': ['in_place', 'partly', 'not_in_place', 'not_accepted'],
    'e1_municipal_focal': ['in_place', 'not_in_place'],
}

# Corrections to the option lists AFTER 0141-0143 were applied. gen_0141
# reproduces the applied files byte for byte, so a list row that later turned
# out to need a different flag is not changed in the model's list; it is
# recorded here, emitted by the migration named as an UPDATE, and consulted by
# the later generators (whether a select needs an "other" column, what the
# form renders). (list, code) -> {field: value, 'migration': nnnn, 'why': ...}
LIST_FIXES = {
    ('d2_duplicate_check', 'yes'): dict(
        allows_free_text=False, migration='0145',
        why='the blank is the number of repeat participants; it has its own typed column (repeat_participants)'),
}


# Lists that exist in the model but were NOT part of 0141-0143, because no
# field of any sheet is a select on them: they serve an ENTITY column
# (khld_partner.partner_type_id). gen_0141 leaves them out so it keeps
# reproducing the applied files; the migration named creates them.
LISTS_ADDED_LATER = {
    'partner_type': '0145',
}


def effective_free(list_name, code, free):
    fix = LIST_FIXES.get((list_name, code))
    if fix and 'allows_free_text' in fix:
        return fix['allows_free_text']
    return free


# Checklist items whose options differ from the shared three: their codes
# must START with the status (in_place / partly / not_in_place) so the rule
# evaluator reads the status from the code (0143, khld_milestone_status).
CHECKLIST_PREFIXES = ('in_place', 'partly', 'not_in_place', 'not_accepted')


def _cells(*pairs):
    """(code, en, ar) triples for a counts field, in the sheet's order."""
    return [tuple(p) for p in pairs]


# A control that belongs to one answer of another control: `when=(column,
# value)` on a part's cfg or a field's spec, the value a code (or list of
# codes) for a select column and True/False for a boolean one. The screens
# dim and blank a control whose answer is not chosen; the rules that REFUSE
# a missing one live in guard_khld_rules (0148) and are not repeated here.
# NOT_NEVER is IMP-0's park-use block: every answer to field 12 but "Never".
NOT_NEVER = ['once_or_twice', 'every_few_months', 'about_monthly', 'weekly_or_more']

# ── per-field overrides ───────────────────────────────────────────────────
# Anything not listed follows default_spec(). The label of a part or cell is
# the sheet's own segment of the option text (English, Arabic).
OVERRIDES = {
    'imp0': {
        'int_date': dict(kind='date', required=True),
        'consent': dict(kind='select', gate='consent'),
        'has_children': dict(kind='parts', parts=[
            ('has_children_id', 'select', 'Yes — number / No', 'نعم — العدد / لا', dict(list='imp0_has_children', options=['Yes — number: ____', 'No'], options_ar=['نعم — العدد: ____', 'لا'], codes=['yes', 'no'], no_other=True)),
            ('children_count', 'number', 'number', 'العدد', dict(when=('has_children_id', 'yes')))]),
        'recontact': dict(kind='select'),
        # "Respondents answering 'Never' skip to Q20; they are excluded from the
        # indicator denominator" (field 12's note) -- so the park-use and
        # interaction questions (13-19) cannot be NOT NULL: a non-visitor's
        # questionnaire is a record with those blank. The rule that they are
        # required for everyone else lives in save_khld_record (0148).
        'activities_taken': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'accompanied_by': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'mixed_presence': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'new_contact': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'opportunity_increase': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'joint_activity': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
        'comfort_level': dict(required=False, when=('visit_freq_id', NOT_NEVER)),
    },
    'so10': {
        'partner_name': dict(kind='record', table='khld_partner', create=True, column='partner_id'),
        # shown from the partner entity, whose partner_type_id reads this list:
        # the sheet's ten partner types (01_GUIDANCE), registered here so the
        # entity's column has a list to point at
        'partner_type': dict(kind='readonly', derived='partner_type', list='partner_type'),
        'engagement_since': dict(kind='month'),
        'meetings_attended': dict(kind='number'),
    },
    'a1': {
        'period_covered': dict(kind='parts', parts=[
            ('period_covered_from', 'date', 'From', 'من', {}),
            ('period_covered_to', 'date', 'to', 'إلى', {})]),
        'coordinator_ref': dict(kind='parts', parts=[
            ('coordinator_decision_no', 'text', 'Decision number', 'رقم القرار', {}),
            ('coordinator_decision_date', 'date', 'date', 'تاريخه', {}),
            ('coordinator_officer_name', 'text', 'name of the designated officer', 'اسم الموظف المعيَّن', {})]),
        'stakeholder_count': dict(kind='counts', cells=_cells(
            ('associations', 'Associations', 'الجمعيات'), ('youth_initiatives', 'Youth initiatives', 'المبادرات الشبابية'),
            ('cultural', 'Cultural', 'الثقافية'), ('schools_universities', 'Schools/universities', 'المدارس/الجامعات'),
            ('private_sector', 'Private sector', 'القطاع الخاص'), ('government', 'Government', 'الحكومية'),
            ('donors', 'Donors', 'الجهات المانحة'), ('total', 'Total', 'المجموع'))),
        'intro_meetings': dict(kind='number'),
        'partnerships_concluded': dict(kind='counts', cells=_cells(
            ('associations', 'Associations', 'الجمعيات'), ('cultural', 'Cultural', 'الثقافية'),
            ('schools_universities', 'Schools/universities', 'المدارس/الجامعات'), ('private_sector', 'Private sector', 'القطاع الخاص'),
            ('government', 'Government', 'الحكومية'), ('donors', 'Donors', 'الجهات المانحة'), ('total', 'Total', 'المجموع'))),
        'council_decision': dict(kind='select'),
        'overall_status': dict(kind='readonly', derived='overall_status'),
        'countersign': dict(kind='parts', parts=[
            ('countersign_name', 'text', 'name', 'الاسم', {}),
            ('countersign_date', 'date', 'date', 'التاريخ', {})]),
    },
    'a2': {
        'meeting_id': dict(kind='readonly', derived='reference'),
        'meeting_time': dict(kind='parts', parts=[
            ('meeting_time_from', 'text', 'From', 'من', {}), ('meeting_time_to', 'text', 'to', 'إلى', {})]),
        'orgs_invited': dict(kind='number'), 'orgs_present': dict(kind='number'), 'attendees_total': dict(kind='number'),
        'orgs_by_type': dict(kind='counts', cells=_cells(
            ('local_associations', 'Local associations', 'جمعيات محلية'), ('womens_organisations', "Women's organisations", 'مؤسسات نسائية'),
            ('youth_initiatives', 'Youth initiatives', 'مبادرات شبابية'), ('cultural_institutions', 'Cultural institutions', 'مؤسسات ثقافية'),
            ('schools_universities', 'Schools/universities', 'مدارس/جامعات'), ('private_sector', 'Private sector', 'القطاع الخاص'),
            ('government_entities', 'Government entities', 'جهات حكومية'), ('donors_development_partners', 'Donors/development partners', 'جهات مانحة/شركاء تنمويون'))),
        'attendees_breakdown': dict(kind='counts', cells=_cells(
            ('women', 'Women', 'نساء'), ('men', 'Men', 'رجال'), ('syrian_refugees', 'Syrian refugees', 'لاجئون سوريون'),
            ('persons_with_disabilities', 'Persons with disabilities', 'ذوو إعاقة'), ('youth_15_24', 'Youth 15–24', 'شباب ١٥–٢٤'))),
        'new_partners': dict(kind='select'),
        'actions_assigned': dict(kind='area'),
        'minutes_prepared': dict(kind='select', gate='minutes_filed'),
        'attendance_sheet': dict(kind='bool'),
        'next_meeting': dict(kind='date', required=False),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'name', 'الاسم', {}), ('recorded_by_position', 'text', 'position', 'المنصب', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {})]),
    },
    'a3': {
        'contribution_id': dict(kind='readonly', derived='reference'),
        'status': dict(kind='select', gate='received'),
        'contributor_name': dict(kind='text'),
        'contributor_type': dict(kind='select'),
        'value_jod': dict(kind='money'),
        'quantity': dict(kind='parts', parts=[
            ('quantity', 'text', 'Quantity', 'الكمية', {}), ('quantity_unit', 'text', 'Unit (e.g. benches, m², litres, days)', 'الوحدة (مثل: مقعد، م²، لتر، يوم)', {})]),
        'volunteer_labour': dict(kind='parts', parts=[
            ('volunteer_labour_volunteers', 'number', 'Volunteers', 'المتطوعون', {}),
            ('volunteer_labour_person_hours', 'number', 'Person-hours', 'ساعات العمل', {})]),
        'requirement_item': dict(kind='record', table='khld_works_item', column='works_item_id', required=False),
        'conditions': dict(kind='select'),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'name', 'الاسم', {}), ('recorded_by_position', 'text', 'position', 'المنصب', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {})]),
    },
    'b1': {
        'requests_received': dict(kind='parts', parts=[
            ('requests_received', 'number', 'Received', 'المستلمة', {}), ('requests_approved', 'number', 'Approved', 'الموافق عليها', {}),
            ('requests_declined', 'number', 'Declined', 'المرفوضة', {})]),
        'last_updated': dict(kind='date', required=False),
        'overall_status': dict(kind='readonly', derived='overall_status'),
        'countersign': dict(kind='parts', parts=[
            ('countersign_name', 'text', 'name', 'الاسم', {}), ('countersign_date', 'date', 'date', 'التاريخ', {})]),
    },
    'so20': {
        'event_id': dict(kind='record', table='khld_activity', column='activity_id'),
        'rate_facilities': dict(kind='rating'),
        'collected_by': dict(kind='text'),
    },
    'c1': {
        'item_id': dict(kind='readonly', derived='reference'),
        'on_priority_list': dict(kind='parts', parts=[
            ('on_priority_list_id', 'select', 'Yes — priority rank / No — added later', 'نعم — ترتيب الأولوية / لا — أُضيف لاحقاً',
             dict(list='c1_on_priority_list', options=['Yes — priority rank: ____', 'No — added later, justification: ____'],
                  options_ar=['نعم — ترتيب الأولوية: ____', 'لا — أُضيف لاحقاً، التبرير: ____'], codes=['yes', 'no'], no_other=True)),
            ('priority_rank', 'number', 'priority rank', 'ترتيب الأولوية', dict(when=('on_priority_list_id', 'yes'))),
            ('addition_justification', 'text', 'justification', 'التبرير', dict(when=('on_priority_list_id', 'no')))]),
        'status': dict(kind='select', gate='completed'),
        'dates': dict(kind='parts', parts=[
            ('planned_start', 'date', 'Planned start', 'البدء المخطط', {}), ('actual_start', 'date', 'Actual start', 'البدء الفعلي', {}),
            ('completed_on', 'date', 'Completed', 'الإنجاز', {})]),
        'quantity': dict(kind='parts', parts=[
            ('quantity', 'text', 'Quantity', 'الكمية', {}), ('quantity_unit', 'text', 'Unit (e.g. 10 benches, 200 m² planted, 6 lamp posts)', 'الوحدة (مثل: ١٠ مقاعد، ٢٠٠ م² مشجرة، ٦ أعمدة إنارة)', {})]),
        'cost_jod': dict(kind='money'),
        'safety_by': dict(kind='parts', parts=[
            ('safety_by_name', 'text', 'name, position', 'الاسم والمنصب', {}), ('safety_on', 'date', 'date', 'التاريخ', {})]),
        'verified_by': dict(kind='parts', parts=[
            ('verified_by_name', 'text', 'name, position', 'الاسم والمنصب', {}), ('verified_on', 'date', 'date', 'التاريخ', {})]),
    },
    'c2': {
        'campaign_id': dict(kind='readonly', derived='reference'),
        'campaign_time': dict(kind='parts', parts=[
            ('campaign_time_from', 'text', 'From', 'من', {}), ('campaign_time_to', 'text', 'to', 'إلى', {})]),
        'area_covered': dict(kind='parts', parts=[
            ('area_section', 'text', 'Section', 'القسم', {}), ('area_m2', 'number', 'Approximate area (m²)', 'المساحة التقريبية (م²)', {})]),
        'linked_item': dict(kind='parts', parts=[
            ('linked_item_id', 'select', 'Yes — item reference / No — general upkeep', 'نعم — مرجع البند / لا — أعمال عناية عامة',
             dict(list='c2_linked_item', options=['Yes — item reference: ____', 'No — general upkeep'], options_ar=['نعم — مرجع البند: ____', 'لا — أعمال عناية عامة'], no_other=True)),
            ('works_item_id', 'record', 'Item reference', 'مرجع البند', dict(table='khld_works_item', when=('linked_item_id', 'yes_item_reference')))]),
        'volunteers_total': dict(kind='number'), 'new_volunteers': dict(kind='number'), 'person_hours': dict(kind='number'),
        'volunteers_breakdown': dict(kind='counts', cells=_cells(
            ('women', 'Women', 'نساء'), ('men', 'Men', 'رجال'), ('under_18', 'Under 18', 'دون ١٨'), ('youth_15_24', 'Youth 15–24', 'شباب ١٥–٢٤'),
            ('jordanian', 'Jordanian', 'أردنيون'), ('syrian_refugee', 'Syrian refugee', 'لاجئون سوريون'),
            ('persons_with_disabilities', 'Persons with disabilities', 'ذوو إعاقة'))),
        'materials': dict(kind='area'), 'outputs': dict(kind='area'),
        'inkind_value': dict(kind='money'),
        'evidence_attached': dict(kind='multi', gate='signed_attendance_sheet'),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'name', 'الاسم', {}), ('recorded_by_position', 'text', 'position', 'المنصب', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {})]),
        '_participants': dict(kind='participants', after='volunteers_total'),
    },
    'd1': {
        'event_id': dict(kind='readonly', derived='reference'),
        'event_time': dict(kind='parts', parts=[
            ('event_time_from', 'text', 'From', 'من', {}), ('event_time_to', 'text', 'to', 'إلى', {})]),
        'partner_count': dict(kind='number'), 'participants_planned': dict(kind='number'), 'participants_actual': dict(kind='number'),
        'announcement': dict(kind='parts', parts=[
            ('announcement', 'multi', 'Channels', 'القنوات', dict(list='d1_announcement',
                options=['municipal notice board', 'park notice board', 'municipal social media', 'local associations', 'schools', 'mosque announcements', 'word of mouth', 'not announced'],
                options_ar=['لوحة إعلانات البلدية', 'لوحة إعلانات الحديقة', 'وسائل التواصل للبلدية', 'الجمعيات المحلية', 'المدارس', 'إعلانات المساجد', 'التواصل الشفهي', 'لم يُعلن عنه'])),
            ('announcement_days_advance', 'number', 'Days in advance', 'عدد الأيام قبل الموعد', {})]),
        'cost_and_inkind': dict(kind='parts', parts=[
            ('cash_cost_jod', 'money', 'Cash cost (JOD)', 'الكلفة النقدية (دينار)', {}),
            ('inkind_value_jod', 'money', 'In-kind value (JOD)', 'قيمة الدعم العيني (دينار)', {}),
            ('inkind_source', 'text', 'Source', 'المصدر', {})]),
        'volunteers_supporting': dict(kind='number'),
        'feedback_collected': dict(kind='select'),
        'evidence_attached': dict(kind='multi', gate='report_and_attendance'),
        'recorded_verified': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'Recorded by (name, position)', 'عُبئ بواسطة (الاسم والمنصب)', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {}),
            ('verified_by_name', 'text', 'Verified by (name, position)', 'دُقِّق بواسطة (الاسم والمنصب)', {}),
            ('verified_on', 'date', 'date', 'التاريخ', {})]),
    },
    'd2': {
        'event_id': dict(kind='record', table='khld_activity', column='activity_id'),
        'event_name_date': dict(kind='readonly', derived='activity_title'),
        'estimate_basis': dict(kind='parts', when=('count_method_id', 'organisers_estimate'), parts=[
            ('estimate_by', 'text', 'Name and position', 'الاسم والمنصب', {}),
            ('estimate_basis', 'text', 'Basis (e.g. count of seating areas, photographs, average per station)', 'الأساس (مثل: عدّ مناطق الجلوس، الصور، المتوسط لكل محطة)', {})]),
        'total_participants': dict(kind='number'),
        'by_sex': dict(kind='counts', cells=_cells(('female', 'Female', 'أنثى'), ('male', 'Male', 'ذكر'), ('not_recorded', 'Sex not recorded', 'لم يُسجَّل الجنس'))),
        'by_age_sex': dict(kind='counts', cells=_cells(
            ('under_12_f', 'Under 12: F', 'أقل من ١٢: أنثى'), ('under_12_m', 'Under 12: M', 'أقل من ١٢: ذكر'),
            ('12_14_f', '12–14: F', '١٢–١٤: أنثى'), ('12_14_m', '12–14: M', '١٢–١٤: ذكر'),
            ('15_24_f', '15–24: F', '١٥–٢٤: أنثى'), ('15_24_m', '15–24: M', '١٥–٢٤: ذكر'),
            ('25_34_f', '25–34: F', '٢٥–٣٤: أنثى'), ('25_34_m', '25–34: M', '٢٥–٣٤: ذكر'),
            ('35_49_f', '35–49: F', '٣٥–٤٩: أنثى'), ('35_49_m', '35–49: M', '٣٥–٤٩: ذكر'),
            ('50_64_f', '50–64: F', '٥٠–٦٤: أنثى'), ('50_64_m', '50–64: M', '٥٠–٦٤: ذكر'),
            ('age_65_plus_f', '65 and above: F', '٦٥ وأكثر: أنثى'), ('age_65_plus_m', '65 and above: M', '٦٥ وأكثر: ذكر'))),
        'by_nationality': dict(kind='counts', cells=_cells(
            ('jordanian', 'Jordanian (host community)', 'أردني (المجتمع المضيف)'), ('syrian_refugee', 'Syrian refugee', 'لاجئ سوري'),
            ('other', 'Other', 'أخرى'), ('not_recorded', 'Not recorded', 'لم تُسجَّل'))),
        'pwd_count': dict(kind='number', required=False), 'mothers_children': dict(kind='number'), 'first_time': dict(kind='number'),
        'staff_volunteers': dict(kind='parts', parts=[
            ('staff_volunteers', 'number', 'Volunteers', 'متطوعون', {}), ('staff_municipal', 'number', 'Municipal staff', 'كوادر البلدية', {}),
            ('staff_partner', 'number', 'Partner staff', 'كوادر الشركاء', {})]),
        'register_attached': dict(kind='select'),
        'consent_informed': dict(kind='select', stamp=True),
        'photo_consent': dict(kind='select', stamp=True),
        # "Yes — number of repeat participants identified: ____": the blank is a
        # NUMBER, and it is the number the distinct-individuals figure subtracts
        # (plan Part 6, SO2-D2), so it gets a typed column beside the select.
        # 0141 seeded the 'yes' option with allows_free_text = true from the
        # blank; LIST_FIXES below records the correction 0145 applies.
        'duplicate_check': dict(kind='parts', parts=[
            ('duplicate_check_id', 'select', 'Yes / No — not yet done / Not possible with this counting method',
             'نعم / لا — لم يُنفَّذ بعد / غير ممكن بطريقة العدّ هذه',
             dict(list='d2_duplicate_check',
                  options=['Yes — number of repeat participants identified: ____', 'No — not yet done', 'Not possible with this counting method'],
                  options_ar=['نعم — عدد المشاركين المتكررين المحددين: ____', 'لا — لم يُنفَّذ بعد', 'غير ممكن بطريقة العدّ هذه'],
                  codes=['yes', 'not_yet', 'not_possible'],
                  # the list was seeded by 0142 while this was a plain select; keep its label
                  used_by='d2.duplicate_check')),
            ('repeat_participants', 'number', 'number of repeat participants identified', 'عدد المشاركين المتكررين المحددين', dict(when=('duplicate_check_id', 'yes')))]),
        'reconciliation': dict(kind='readonly', derived='reconciliation'),
        'entered_in_db': dict(kind='parts', parts=[
            ('entered_by_name', 'text', 'name', 'الاسم', {}), ('entered_on', 'date', 'date', 'التاريخ', {})]),
    },
    'so30': {
        'volunteer_id': dict(kind='record', table='khld_volunteer', column='volunteer_id'),
        'name': dict(kind='readonly', derived='volunteer_name'),
        'sex': dict(kind='readonly', derived='volunteer_sex'),
        'age_group': dict(kind='readonly', derived='volunteer_age_group'),
        'nationality': dict(kind='readonly', derived='volunteer_nationality'),
        'disability': dict(kind='readonly', derived='volunteer_disability'),
        'affiliation': dict(kind='readonly', derived='volunteer_affiliation'),
        'date_registered': dict(kind='readonly', derived='volunteer_reg_date'),
        'period_reviewed': dict(kind='parts', parts=[
            ('period_from', 'date', 'From', 'من', {}), ('period_to', 'date', 'to', 'إلى', {})]),
        'participation_log': dict(kind='participation_log'),
        'activities_count': dict(kind='readonly', derived='activities_count'),
        'hours_total': dict(kind='readonly', derived='hours_total'),
        # "If inactive or withdrawn, what is the main reason?" -- conditional on
        # field 14, and the list has no "not applicable" row, so an active
        # volunteer has no answer; the conditional rule is save_khld_record's
        'inactive_reason': dict(required=False, when=('status_end_period_id', ['inactive_no_participation_for_more_than_six_mont', 'withdrew_formally'])),
        'verified_by': dict(kind='parts', parts=[
            ('verified_by_name', 'text', 'name, position', 'الاسم والمنصب', {}), ('verified_on', 'date', 'date', 'التاريخ', {})]),
    },
    'e1': {
        'founding_meeting': dict(kind='parts', parts=[
            ('founding_meeting_date', 'date', 'Date', 'التاريخ', {}), ('founding_meeting_venue', 'text', 'Venue', 'المكان', {})]),
        'invitations': dict(kind='parts', parts=[
            ('invited_count', 'number', 'Invited', 'المدعوة', {}), ('attended_count', 'number', 'Attended', 'الحاضرة', {})]),
        'members_by_type': dict(kind='counts', cells=_cells(
            ('charitable_development', 'Charitable or development associations', 'جمعيات خيرية أو تنموية'),
            ('womens_organisations', "Women's organisations", 'مؤسسات نسائية'),
            ('youth_initiatives', 'Youth initiatives or volunteer groups', 'مبادرات شبابية أو مجموعات تطوعية'),
            ('schools', 'Schools', 'مدارس'), ('cultural_institutions', 'Cultural institutions', 'مؤسسات ثقافية'),
            ('other', 'Other', 'أخرى'), ('total_organisations', 'Total organisations', 'مجموع المؤسسات'),
            ('individual_members', 'Individual community members', 'أفراد من المجتمع المحلي'))),
        'members_by_sex': dict(kind='counts', cells=_cells(('women', 'Women', 'نساء'), ('men', 'Men', 'رجال'), ('total', 'Total', 'المجموع'))),
        'membership_changes': dict(kind='parts', parts=[
            ('orgs_joined', 'text', 'Organisations joined', 'مؤسسات انضمت', {}), ('orgs_withdrew', 'text', 'Organisations withdrew', 'مؤسسات انسحبت', {})]),
        'meetings_held': dict(kind='parts', parts=[
            ('meetings_held', 'number', 'Meetings held', 'الاجتماعات المعقودة', {}), ('meetings_with_minutes', 'number', 'With minutes', 'التي لها محاضر', {})]),
        'duplication_avoided': dict(kind='select'),
        'overall_status': dict(kind='readonly', derived='overall_status'),
        'signatures': dict(kind='parts', parts=[
            ('committee_coordinator_name', 'text', 'committee coordinator', 'منسق اللجنة', {}),
            ('community_coordinator_name', 'text', 'municipal community coordinator', 'المنسق المجتمعي في البلدية', {}),
            ('signed_on', 'date', 'date', 'التاريخ', {})]),
    },
    'f1': {
        'launch_date': dict(kind='date', required=False),
        'database_format': dict(kind='parts', parts=[
            ('database_format_id', 'select', 'Format', 'الصيغة', dict(list='f1_database_format',
                options=['paper register', 'Excel file', 'digital form such as Kobo', 'municipal system'],
                options_ar=['سجل ورقي', 'ملف إكسل', 'نموذج إلكتروني مثل كوبو', 'نظام البلدية'])),
            ('registered_count', 'number', 'Number registered', 'عدد المسجلين', {}),
            ('registered_women', 'number', 'Of whom women', 'منهم نساء', {}),
            ('registered_youth', 'number', 'Youth 15–24', 'شباب ١٥–٢٤', {}),
            ('registered_refugees', 'number', 'Syrian refugees', 'لاجئون سوريون', {}),
            ('registered_pwd', 'number', 'Persons with disabilities', 'ذوو إعاقة', {})]),
        'roles_defined': dict(kind='checklist', options=['In place', 'Partly in place', 'Not in place'], options_ar=['متوفر', 'متوفر جزئياً', 'غير متوفر']),
        'recognition_delivered': dict(kind='number'),
        'focal_point': dict(kind='select'),
        'action_days_since_launch': dict(kind='number'),
        'overall_status': dict(kind='readonly', derived='overall_status'),
    },
    'f2': {
        'duplicate_check': dict(kind='readonly', derived='duplicate_check'),
        'volunteer_id': dict(kind='readonly', derived='reference'),
        'full_name': dict(kind='person_name'),
        'id_number': dict(kind='ident'),
        'sex': dict(kind='person_sex'),
        'dob_age': dict(kind='dob', required=True),
        'guardian_consent': dict(kind='parts', parts=[
            ('guardian_name', 'text', 'Guardian name', 'اسم ولي الأمر', {}),
            ('guardian_relationship', 'text', 'Relationship', 'صلة القرابة', {}),
            ('guardian_phone', 'phone', 'Phone', 'الهاتف', {}),
            ('guardian_consent_given', 'bool', 'Written consent obtained', 'الموافقة المكتوبة', {}),
            ('guardian_consent_date', 'date', 'date of consent', 'تاريخ الموافقة', {})]),
        'phone': dict(kind='parts', parts=[
            ('phone', 'person_phone', 'Phone', 'الهاتف', {}), ('phone_alternative', 'phone', 'Alternative', 'البديل', {})]),
        'availability': dict(kind='parts', parts=[
            ('availability_days', 'multi', 'Days', 'الأيام', dict(list='f2_availability_days', options=['Friday', 'Saturday', 'weekdays', 'school holidays'], options_ar=['الجمعة', 'السبت', 'أيام الأسبوع', 'العطل المدرسية'])),
            ('availability_times', 'multi', 'Times', 'الأوقات', dict(list='f2_availability_times', options=['morning', 'afternoon', 'evening'], options_ar=['صباحاً', 'بعد الظهر', 'مساءً'])),
            ('hours_per_month', 'number', 'Approximate hours per month', 'عدد الساعات التقريبي شهرياً', {})]),
        'consent_data': dict(kind='bool', stamp=True, must_be_true=True),
        'consent_photo': dict(kind='bool', stamp=True),
        'safety_commitment': dict(kind='bool', stamp=True, must_be_true=True),
        'signature': dict(kind='parts', parts=[
            ('signed_by', 'text', 'Volunteer (or guardian for volunteers under 18)', 'المتطوع (أو ولي الأمر للمتطوعين دون ١٨)', {}),
            ('signed_on', 'date', 'date', 'التاريخ', {})]),
        'registered_by': dict(kind='parts', parts=[
            ('registered_by_name', 'text', 'name', 'الاسم', {}), ('registered_by_position', 'text', 'position', 'المنصب', {}),
            ('registered_by_organisation', 'text', 'organisation', 'المؤسسة', {}), ('registered_on', 'date', 'date', 'التاريخ', {})]),
        'entered_register': dict(kind='parts', parts=[
            ('entered_by_name', 'text', 'name', 'الاسم', {}), ('entered_on', 'date', 'date', 'التاريخ', {})]),
    },
    'f3': {
        'action_day_id': dict(kind='readonly', derived='reference'),
        'times': dict(kind='parts', parts=[('times_from', 'text', 'From', 'من', {}), ('times_to', 'text', 'to', 'إلى', {})]),
        'linked_records': dict(kind='parts', parts=[
            ('linked_kind_id', 'select', 'Linked to', 'مرتبط بـ', dict(list='f3_linked_records',
                options=['Rehabilitation campaign — reference: ____ (form 10)', 'Community activity — reference: ____ (form 11)', 'Market day — reference: ____ (form 21)', 'Stand-alone action day'],
                options_ar=['حملة تأهيل — المرجع: ____ (النموذج ١٠)', 'نشاط مجتمعي — المرجع: ____ (النموذج ١١)', 'يوم سوق — المرجع: ____ (النموذج ٢١)', 'يوم عمل تطوعي مستقل'],
                codes=['campaign', 'activity', 'market', 'stand_alone'], no_other=True)),
            ('campaign_id', 'record', 'Rehabilitation campaign', 'حملة تأهيل', dict(table='khld_campaign', when=('linked_kind_id', 'campaign'))),
            ('activity_id', 'record', 'Community activity', 'نشاط مجتمعي', dict(table='khld_activity', when=('linked_kind_id', 'activity'))),
            ('market_id', 'record', 'Market day', 'يوم سوق', dict(table='khld_market', when=('linked_kind_id', 'market')))]),
        'called_by': dict(kind='parts', parts=[
            ('called_by_id', 'select', 'Called by', 'الجهة الداعية', dict(list='f3_called_by',
                options=['Municipality', 'community coordination committee', 'local association', 'youth initiative', 'school or university'],
                options_ar=['البلدية', 'لجنة التنسيق المجتمعي', 'جمعية محلية', 'مبادرة شبابية', 'مدرسة أو جامعة'])),
            ('notice_days', 'number', "Days' notice given", 'عدد أيام الإشعار المسبق', {})]),
        'volunteers_total': dict(kind='number'), 'new_registrations': dict(kind='number'), 'person_hours': dict(kind='number'),
        'volunteers_breakdown': dict(kind='counts', cells=_cells(
            ('women', 'Women', 'نساء'), ('men', 'Men', 'رجال'), ('under_18', 'Under 18', 'دون ١٨'), ('youth_15_24', 'Youth 15–24', 'شباب ١٥–٢٤'),
            ('jordanian', 'Jordanian', 'أردنيون'), ('syrian_refugee', 'Syrian refugee', 'لاجئون سوريون'),
            ('persons_with_disabilities', 'Persons with disabilities', 'ذوو إعاقة'))),
        'volunteer_ids': dict(kind='participants'),
        'roles_assigned': dict(kind='parts', parts=[
            ('roles_assigned', 'bool', 'Yes — roles used / No — general tasks only', 'نعم — الأدوار المستخدمة / لا — مهام عامة فقط', {}),
            ('roles_used', 'multi', 'roles used', 'الأدوار المستخدمة', dict(list='f3_roles_used', when=('roles_assigned', True),
                options=['event hosting', 'site safety', 'maintenance', 'planting', 'documentation', "children's activities", 'outreach'],
                options_ar=['استقبال الفعاليات', 'سلامة الموقع', 'الصيانة', 'التشجير', 'التوثيق', 'أنشطة الأطفال', 'التوعية']))]),
        'tasks_completed': dict(kind='area'), 'materials': dict(kind='area'),
        'evidence_attached': dict(kind='multi', gate='attendance_and_tasks'),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'name', 'الاسم', {}), ('recorded_by_position', 'text', 'position', 'المنصب', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {})]),
    },
    'so40': {
        'respondent_is_vendor': dict(kind='select', gate='respondent_is_vendor'),
        'vendor_id': dict(kind='record', table='khld_vendor', column='vendor_id'),
        'name': dict(kind='readonly', derived='vendor_name'),
        'markets_count': dict(kind='number'),
        'recontact': dict(kind='select'),
    },
    'g1': {
        'enterprise_id': dict(kind='record', table='khld_enterprise', column='enterprise_id', create=True),
        'cycle': dict(kind='parts', parts=[
            ('cycle_reference', 'text', 'Cycle reference', 'مرجع الدورة', {}),
            ('cycle_year', 'select', 'Year', 'السنة', dict(list='g1_cycle_year', options=['2027', '2028', '2029'], options_ar=['٢٠٢٧', '٢٠٢٨', '٢٠٢٩']))]),
        'owner_name': dict(kind='person_name'),
        'id_number': dict(kind='ident'),
        'sex': dict(kind='person_sex'),
        'age_group': dict(kind='age_group'),
        'phone': dict(kind='person_phone'),
        'workers': dict(kind='parts', parts=[
            ('workers_total', 'number', 'Total', 'المجموع', {}), ('workers_women', 'number', 'Of whom women', 'منهم نساء', {}),
            ('workers_under_30', 'number', 'Of whom under 30', 'منهم دون ٣٠', {})]),
        's1_business_basics': dict(kind='session', n=1), 's2_licensing': dict(kind='session', n=2),
        's3_hygiene': dict(kind='session', n=3, na=True), 's4_packaging': dict(kind='session', n=4), 's5_marketing': dict(kind='session', n=5),
        'extra_sessions': dict(kind='area'),
        'sessions_attended_count': dict(kind='readonly', derived='sessions_attended_count'),
        'completion': dict(kind='readonly', derived='completion'),
        'knowledge_check': dict(kind='parts', parts=[
            ('knowledge_check_done', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('knowledge_score', 'number', 'score', 'النتيجة', dict(when=('knowledge_check_done', True))), ('knowledge_score_of', 'number', 'out of', 'من', dict(when=('knowledge_check_done', True)))]),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'name', 'الاسم', {}), ('recorded_by_position', 'text', 'position', 'المنصب', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {})]),
    },
    'g2': {
        'enterprise_id': dict(kind='record', table='khld_enterprise', column='enterprise_id', create=True),
        'duplicate_check': dict(kind='readonly', derived='duplicate_check'),
        'last_updated': dict(kind='readonly', derived='updated_at'),
        'owner_name_contact': dict(kind='readonly', derived='enterprise_owner'),
        'sup_guidance': dict(kind='parts', parts=[
            ('sup_guidance', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_guidance_sessions', 'number', 'number of sessions', 'عدد الجلسات', dict(when=('sup_guidance', True))),
            ('sup_guidance_dates', 'text', 'Dates', 'التواريخ', dict(when=('sup_guidance', True))), ('sup_guidance_provider', 'text', 'Provider', 'الجهة المقدِّمة', dict(when=('sup_guidance', True)))]),
        'sup_licensing_info': dict(kind='parts', parts=[
            ('sup_licensing_info', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_licensing_info_date', 'date', 'date', 'التاريخ', dict(when=('sup_licensing_info', True))), ('sup_licensing_info_provider', 'text', 'Provider', 'الجهة المقدِّمة', dict(when=('sup_licensing_info', True)))]),
        'sup_hygiene': dict(kind='parts', parts=[
            ('sup_hygiene_id', 'select', 'Yes / No / Not applicable — non-food products', 'نعم / لا / لا ينطبق — منتجات غير غذائية',
             dict(list='g2_sup_hygiene', options=['Yes — date: ____ Provider: ____', 'No', 'Not applicable — non-food products'],
                  options_ar=['نعم — التاريخ: ____ الجهة المقدِّمة: ____', 'لا', 'لا ينطبق — منتجات غير غذائية'], no_other=True)),
            ('sup_hygiene_date', 'date', 'date', 'التاريخ', dict(when=('sup_hygiene_id', 'yes'))), ('sup_hygiene_provider', 'text', 'Provider', 'الجهة المقدِّمة', dict(when=('sup_hygiene_id', 'yes')))]),
        'sup_referral': dict(kind='parts', parts=[
            ('sup_referral', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_referral_entity', 'text', 'entity', 'الجهة', dict(when=('sup_referral', True))), ('sup_referral_purpose', 'text', 'Purpose', 'الغرض', dict(when=('sup_referral', True))),
            ('sup_referral_date', 'date', 'Date', 'التاريخ', dict(when=('sup_referral', True))),
            ('sup_referral_outcome_id', 'select', 'Outcome', 'النتيجة', dict(list='g2_sup_referral_outcome', options=['accepted', 'pending', 'declined'], options_ar=['قُبل', 'قيد الإجراء', 'رُفض'], when=('sup_referral', True)))]),
        'sup_peer_network': dict(kind='parts', parts=[
            ('sup_peer_network', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_peer_network_date', 'date', 'date', 'التاريخ', dict(when=('sup_peer_network', True))), ('sup_peer_network_meetings', 'number', 'Number of exchange meetings attended', 'عدد لقاءات التبادل التي حضرها', dict(when=('sup_peer_network', True)))]),
        'sup_market_access': dict(kind='parts', parts=[
            ('sup_market_access', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_market_access_refs', 'text', 'market day references', 'مراجع أيام السوق', dict(when=('sup_market_access', True))), ('sup_market_access_count', 'number', 'Number of markets', 'عدد الأسواق', dict(when=('sup_market_access', True)))]),
        'sup_inkind': dict(kind='parts', parts=[
            ('sup_inkind', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_inkind_description', 'text', 'describe, with estimated value in JOD and provider', 'يُوصف مع القيمة التقديرية بالدينار والجهة المقدِّمة', dict(when=('sup_inkind', True)))]),
        'sup_marketing': dict(kind='parts', parts=[
            ('sup_marketing', 'bool', 'Yes / No', 'نعم / لا', {}), ('sup_marketing_description', 'text', 'describe', 'يُوصف', dict(when=('sup_marketing', True)))]),
        'sup_site_visit': dict(kind='parts', parts=[
            ('sup_site_visit', 'bool', 'Yes / No', 'نعم / لا', {}),
            ('sup_site_visit_count', 'number', 'number of visits', 'عدد الزيارات', dict(when=('sup_site_visit', True))), ('sup_site_visit_dates', 'text', 'Dates', 'التواريخ', dict(when=('sup_site_visit', True)))]),
        'support_types_count': dict(kind='readonly', derived='support_types_count'),
        'entered_by': dict(kind='parts', parts=[
            ('entered_by_name', 'text', 'name', 'الاسم', {}), ('entered_by_organisation', 'text', 'organisation', 'المؤسسة', {}),
            ('entered_on', 'date', 'date', 'التاريخ', {})]),
        'consolidated_by': dict(kind='parts', parts=[
            ('consolidated_by_name', 'text', 'name', 'الاسم', {}), ('consolidated_on', 'date', 'date', 'التاريخ', {})]),
    },
    'h1': {
        'market_id': dict(kind='readonly', derived='reference'),
        'market_date': dict(kind='date'),
        'times': dict(kind='parts', parts=[('times_from', 'text', 'From', 'من', {}), ('times_to', 'text', 'to', 'إلى', {})]),
        'permit': dict(kind='parts', parts=[('permit_reference', 'text', 'Reference', 'المرجع', {}), ('permit_date', 'date', 'Date', 'التاريخ', {})]),
        'stalls_offered': dict(kind='number'), 'stalls_occupied': dict(kind='number'),
        'announcement': dict(kind='parts', parts=[
            ('announcement', 'multi', 'Channels', 'القنوات', dict(list='h1_announcement',
                options=['municipal notice board', 'park notice board', 'municipal social media', 'local associations', "women's organisations", 'mosque announcements', 'word of mouth', 'not announced'],
                options_ar=['لوحة إعلانات البلدية', 'لوحة إعلانات الحديقة', 'وسائل التواصل للبلدية', 'الجمعيات المحلية', 'المؤسسات النسائية', 'إعلانات المساجد', 'التواصل الشفهي', 'لم يُعلن عنها'])),
            ('announcement_days_before', 'number', 'Days before the market', 'عدد الأيام قبل السوق', {})]),
        'applications': dict(kind='parts', parts=[
            ('applications_received', 'number', 'Received', 'المستلمة', {}), ('applications_accepted', 'number', 'Accepted', 'المقبولة', {}),
            ('applications_declined', 'number', 'Declined', 'المرفوضة', {}), ('decline_reason', 'text', 'Reason for declining', 'سبب الرفض', {})]),
        'priority_share': dict(kind='counts', cells=_cells(
            ('women', 'Women', 'نساء'), ('youth_15_24', 'Youth 15–24', 'شباب ١٥–٢٤'), ('syrian_refugees', 'Syrian refugees', 'لاجئون سوريون'),
            ('persons_with_disabilities', 'Persons with disabilities', 'ذوو إعاقة'), ('low_income_families', 'Low-income families', 'أسر منخفضة الدخل'))),
        'fee_charged': dict(kind='parts', parts=[
            ('fee_charged', 'bool', 'No — free of charge / Yes — fee', 'لا — مجانية / نعم — رسم', {}),
            ('fee_per_stall_jod', 'money', 'amount per stall (JOD)', 'المبلغ لكل كشك (دينار)', dict(when=('fee_charged', True))),
            ('fee_basis', 'text', 'Basis and authorisation', 'الأساس والتخويل', dict(when=('fee_charged', True)))]),
        'visitors': dict(kind='parts', parts=[
            ('visitors_estimated', 'number', 'Estimated visitors', 'العدد التقديري للزوار', {}),
            ('visitors_method_id', 'select', 'Method', 'الطريقة', dict(list='h1_visitors_method',
                options=['entrance count', 'periodic headcount', 'vendor reports', "organisers' estimate"],
                options_ar=['عدّ على المدخل', 'عدّ دوري', 'إفادات العارضين', 'تقدير المنظمين']))]),
        'total_sales': dict(kind='parts', parts=[
            ('total_sales_jod', 'money', 'Total (JOD)', 'المجموع (دينار)', {}),
            ('total_sales_method_id', 'select', 'Method', 'الطريقة', dict(list='h1_total_sales_method',
                options=['each vendor asked at the end of the day', 'sample of vendors', 'not collected'],
                options_ar=['سؤال كل عارض في ختام اليوم', 'عينة من العارضين', 'لم يُجمع']))]),
        'cost': dict(kind='parts', parts=[
            ('cash_cost_jod', 'money', 'Cash cost (JOD)', 'الكلفة النقدية (دينار)', {}),
            ('cash_source_id', 'select', 'Source', 'المصدر', dict(list='h1_cost_source', options=['municipal budget', 'partner', 'donor', 'sponsor'], options_ar=['موازنة البلدية', 'شريك', 'جهة مانحة', 'راعٍ'])),
            ('inkind_value_jod', 'money', 'In-kind support received (JOD)', 'الدعم العيني المستلم (دينار)', {}),
            ('inkind_provider', 'text', 'Provider', 'الجهة المقدِّمة', {})]),
        'feedback_collected': dict(kind='parts', parts=[
            ('feedback_collected_id', 'select', 'Yes / Verbal feedback only / No', 'نعم / تغذية راجعة شفهية فقط / لا',
             dict(list='h1_feedback_collected', options=['Yes — vendor forms: ____ visitor forms: ____', 'Verbal feedback only', 'No'],
                  options_ar=['نعم — نماذج العارضين: ____ نماذج الزوار: ____', 'تغذية راجعة شفهية فقط', 'لا'], no_other=True)),
            ('vendor_forms', 'number', 'vendor forms', 'نماذج العارضين', dict(when=('feedback_collected_id', 'yes_vendor_forms'))), ('visitor_forms', 'number', 'visitor forms', 'نماذج الزوار', dict(when=('feedback_collected_id', 'yes_vendor_forms')))]),
        'recorded_by': dict(kind='parts', parts=[
            ('recorded_by_name', 'text', 'Recorded by (name, position)', 'عُبئ بواسطة (الاسم والمنصب)', {}),
            ('recorded_on', 'date', 'date', 'التاريخ', {}),
            ('verified_by_name', 'text', 'Verified by (name, position)', 'دُقِّق بواسطة (الاسم والمنصب)', {}),
            ('verified_on', 'date', 'date', 'التاريخ', {})]),
    },
    'h2': {
        'market_id': dict(kind='record', table='khld_market', column='market_id'),
        'returning_vendor': dict(kind='readonly', derived='returning_vendor'),
        'vendor_id': dict(kind='readonly', derived='vendor_reference'),
        'enterprise_id': dict(kind='record', table='khld_enterprise', column='enterprise_id', required=False),
        'full_name': dict(kind='person_name'),
        'id_number': dict(kind='ident'),
        'sex': dict(kind='person_sex'),
        'dob_age': dict(kind='dob_age'),
        'phone': dict(kind='person_phone'),
        'stall_number': dict(kind='text'),
        'stall_free': dict(kind='parts', parts=[
            ('stall_free', 'bool', 'Yes — free of charge / No — fee paid', 'نعم — مجاناً / لا — دُفع رسم', {}),
            ('stall_fee_jod', 'money', 'fee paid (JOD)', 'الرسم المدفوع (دينار)', dict(when=('stall_free', False)))]),
        'attended': dict(kind='select', gate='attended'),
        'consent': dict(kind='select', stamp=True),
        'signature': dict(kind='parts', parts=[('signed_by', 'text', 'Vendor', 'العارض', {}), ('signed_on', 'date', 'date', 'التاريخ', {})]),
        'registered_by': dict(kind='parts', parts=[
            ('registered_by_name', 'text', 'name', 'الاسم', {}), ('registered_by_organisation', 'text', 'organisation', 'المؤسسة', {}),
            ('registered_on', 'date', 'date', 'التاريخ', {})]),
    },
}

# Fields whose sheet type is "text" but which name a person's contact or a
# "(name, position, date)" signature line and are NOT split above are kept as
# one text column, as the sheet has them. Listed so nobody thinks they were
# forgotten: so10.resp_name, so10.resp_contact, a1.verif_by, a2.chaired_by,
# a3.contributor_contact, b1.verif_by, b1.protocol_ref, c2.partners_involved,
# e1.verif_by, f1.verif_by, f3.team_leaders, f3.supervisor, so40.enumerator,
# imp0.enum_name, so20.collected_by, d2.counters, g1.enterprise_name.


def is_yes_no(opts):
    return [o.strip() for o in opts] == ['Yes', 'No']


def has_blank(text):
    return '____' in text or '___' in text


def default_spec(f):
    """The spec a field gets when OVERRIDES says nothing about it."""
    t = f.ftype
    o = f.opts_en
    if t == 'date':
        return dict(kind='date', required=f.required and len(o) == 1)
    if t == 'text':
        return dict(kind='text', required=f.required)
    if t == 'long text':
        return dict(kind='area', required=f.required)
    if t == 'number':
        return dict(kind='number', required=f.required)
    if t == 'single select' or t == 'scale (1–5)':
        if is_yes_no(o):
            return dict(kind='bool', required=f.required)
        return dict(kind='select', required=f.required)
    if t == 'multi select':
        return dict(kind='multi', required=f.required)
    if t == 'checklist':
        return dict(kind='checklist', required=f.required)
    if t == 'attachment':
        if is_yes_no(o):
            return dict(kind='bool', required=f.required)
        return dict(kind='multi', required=f.required)
    if t == 'calculated':
        return dict(kind='readonly', derived=f.key)
    if t == 'matrix':
        return dict(kind='rating', required=f.required)
    raise ValueError('no default for %s.%s (%s)' % ('?', f.key, t))


def spec_for(fid, f):
    ov = OVERRIDES.get(fid, {}).get(f.key)
    if ov and 'kind' in ov:
        base = dict(ov)
    else:
        base = default_spec(f)
        if ov:
            base = dict(base)
            base.update(ov)
    if 'required' not in base:
        base['required'] = f.required
    return base


def list_name(fid, f, spec):
    """The ref_khld_ list a select/multi/checklist/session field reads."""
    if spec.get('list'):
        return spec['list']
    key = tuple(o.strip() for o in (spec.get('options') or f.opts_en))
    if key in SHARED_LISTS:
        return SHARED_LISTS[key]
    return '%s_%s' % (fid, f.key)
