# -*- coding: utf-8 -*-
"""
How each of the 213 fields of Khaldia_2_reviewed.xlsx reaches the schema.

workbook.py reads the 'Forms needed' sheet; this file says, per field, what
KIND of thing it is in the database and on the screen. Labels, help texts and
option wording are the sheet's: every option typed below is held to the
sheet's own option cell by model.py (English and Arabic), so a string on
screen cannot differ from the workbook except where REVIEW_FIXES says so.

Kinds (what the column or control is):

  text / area            one text column
  int                    one integer column
  money                  numeric(12,3), JOD
  percent                numeric(5,2), 0-100
  date                   one date column
  stamp                  timestamptz set by the database on insert ("(Auto gen.) date/time")
  reference              the KHLD-XXX reference the database issues (F010)
  bool                   one boolean column (the sheet's Yes / No, or Attended / Absent)
  select                 a ref_khld_<list> foreign key; `<col>_other` when an option takes free text
  multi                  a khld_<table>_option row per tick (question = field id)
  likert                 an integer 1-5; the five labels are the sheet's, in the locale
  file                   evidence attached to the record under this field id (attachment.field_code)
  record                 a picker over another Khalidiyah table (a foreign key)
  records                several of another table's rows (a junction, e.g. partners at a meeting)
  occasion               FORM-13 F147: one campaign (FORM-07) or one activity (FORM-08)
  person_ref             a person picked from another form's registrations (F112, F197, F206)
  id_type / ident / person_name / person_sex / dob / person_phone
                         the identifier block -> `person` (national ID, UNHCR number or other ID)
  shown                  derived from another field of the same form, never typed (F069, F111)

`when` makes a control belong to one answer of another control of the same
form: (field, [values]). A select's values are option CODES; a bool's are
'true' / 'false'; a record's are '__extra__' (the sheet's added option: "Other"
contributor, "General park visit") or '__record__' (any real row). A control
whose answer is not chosen is dimmed and sent blank; a required one is
required only while its answer is chosen. The same rules are generated into
each table's guard trigger (gen_schema.py), so the database refuses what the
screen would have stopped.
"""
from collections import OrderedDict as O

# ── the corrections the reviewer asks for, applied and named ───────────────
# (field, what) -> the reviewer's note, and what the app shows instead. The
# sheet's text is kept verbatim everywhere else.
REVIEW_FIXES = {
    ('F004', 'label_en'): ('Partner name', 'the English label cell is #VALUE!; the reviewer names it "Partner name"'),
    ('F004', 'sub'): ('List of potential partners', 'sub-page said "Responsible Officer"; the rest of FORM-02 is "List of potential partners"'),
    ('FORM-03', 'merge'): ('FORM-04', 'FORM-03 holds only F010 and shares its sub-page with FORM-04 -- merged into FORM-04'),
    ('F060', 'options'): ('Yes - No', 'options missing -- "Yes - No" / "نعم - لا"'),
    ('F061', 'options'): ('nationality', 'options missing -- "Jordanians - Syrians - Palestinians - others" as in the other forms'),
    ('F038', 'kind'): ('record', 'free text -- a select of FORM-08 "Activity name", so attendance links to the activity'),
    ('F070', 'kind'): ('record', 'a lookup from FORM-12 (F058), so a mistyped ID cannot break the unique count'),
    ('F112', 'kind'): ('person_ref', 'a lookup from FORM-17 (F104)'),
    ('FORM-06', 'page'): ('park', 'Page En said "Partnerships and Institutional Sustainability"; Page Ar says park rehabilitation'),
    ('F094', 'page'): ('business', 'Page En / Page Ar empty -- "Small Business Support"'),
}

# ── the pillars (Page En / Page Ar), the sidebar's groups ──────────────────
GROUPS = O([
    ('partnerships', ('Partnerships and Institutional Sustainability', 'الشراكات والاستدامة')),
    ('park', ('Rehabilitation and activation of the park', 'تأهيل وتفعيل الحديقة')),
    ('volunteer', ('Volunteer Program', 'برنامج التطوع')),
    ('business', ('Small Business Support', 'دعم الاعمال الصغيرة')),
])

# ── the 23 forms (FORM-03 merged into FORM-04) ─────────────────────────────
# id: the app's form id; sheet: the Form ID(s); table; group; writer: the
# RLS helper that may insert/update (can_write: coordinator, data entry;
# is_staff adds the enumerator, for the three questionnaires); ref: the
# reference the database issues (prefix, width, the date column that gives
# the year or None); short: the sidebar name, the app's words; retired: the
# form is off the app at the owner's request (26 September 2026, FORM-20,
# OQ-71) -- its table and view stay, so 0156-0163 still reproduce, and
# gen_forms.py writes no screen, no sidebar entry and no labels for it.
FORMS = O([
    ('form01', dict(sheets=['FORM-01'], table='khld_focal_point', group='partnerships', writer='can_write',
                    short=('Focal point', 'ضابط الارتباط'))),
    ('form02', dict(sheets=['FORM-02'], table='khld_partner', group='partnerships', writer='can_write',
                    short=('Partners', 'الشركاء'))),
    ('form04', dict(sheets=['FORM-03', 'FORM-04'], table='khld_partner_contact', group='partnerships', writer='can_write',
                    ref=('ATT', 2, None), short=('Partner outreach', 'التواصل مع الشركاء'))),
    ('form05', dict(sheets=['FORM-05'], table='khld_meeting', group='partnerships', writer='can_write',
                    ref=('MTG', 2, 'meeting_date'), short=('Stakeholder meetings', 'اجتماعات أصحاب المصلحة'))),
    ('form20', dict(sheets=['FORM-20'], table='khld_partner_survey', group='partnerships', writer='is_staff', retired=True,
                    short=('Partner survey', 'استبيان الشركاء'))),
    ('form21', dict(sheets=['FORM-21'], table='khld_contribution', group='partnerships', writer='can_write',
                    ref=('CON', 2, 'date_received'), short=('Contributions', 'المساهمات'))),
    ('form22', dict(sheets=['FORM-22'], table='khld_milestone_record', group='partnerships', writer='can_write',
                    short=('Milestones', 'المعالم المؤسسية'))),
    ('form06', dict(sheets=['FORM-06'], table='khld_rehab_report', group='park', writer='can_write',
                    ref=('REH', 2, 'report_date'), short=('Rehabilitation progress', 'إنجاز التأهيل'))),
    ('form07', dict(sheets=['FORM-07'], table='khld_campaign', group='park', writer='can_write',
                    ref=('VC', 2, 'start_date'), short=('Volunteer campaigns', 'الحملات التطوعية'))),
    ('form08', dict(sheets=['FORM-08'], table='khld_activity', group='park', writer='can_write', published=True,
                    ref=('EV', 2, 'start_date'), short=('Community activities', 'الأنشطة المجتمعية'))),
    ('form09', dict(sheets=['FORM-09'], table='khld_activity_attendance', group='park', writer='can_write',
                    short=('Activity participation', 'المشاركة في الأنشطة'))),
    ('form19', dict(sheets=['FORM-19'], table='khld_park_survey', group='park', writer='is_staff',
                    short=('Park user survey', 'استبيان مرتادي الحديقة'))),
    ('form10', dict(sheets=['FORM-10'], table='khld_committee_member', group='volunteer', writer='can_write',
                    short=('Committee members', 'أعضاء اللجنة'))),
    ('form11', dict(sheets=['FORM-11'], table='khld_committee_meeting', group='volunteer', writer='can_write',
                    ref=('CMT', 2, 'meeting_date'), short=('Committee meetings', 'اجتماعات اللجنة'))),
    ('form12', dict(sheets=['FORM-12'], table='khld_volunteer', group='volunteer', writer='can_write', public=True,
                    ref=('VOL', 4, None), short=('Volunteers', 'المتطوعون'))),
    ('form13', dict(sheets=['FORM-13'], table='khld_volunteer_attendance', group='volunteer', writer='can_write',
                    short=('Volunteer attendance', 'حضور المتطوعين'))),
    ('form14', dict(sheets=['FORM-14'], table='khld_guidance_session', group='business', writer='can_write',
                    ref=('GS', 2, 'start_date'), short=('Counselling sessions', 'جلسات الإرشاد'))),
    ('form15', dict(sheets=['FORM-15'], table='khld_enterprise_request', group='business', writer='can_write',
                    short=('Attendance requests', 'طلبات الحضور'))),
    ('form23', dict(sheets=['FORM-23'], table='khld_enterprise_support', group='business', writer='can_write',
                    short=('Enterprise support', 'دعم المشاريع'))),
    ('form16', dict(sheets=['FORM-16'], table='khld_market', group='business', writer='can_write', published=True,
                    ref=('MKT', 2, 'start_date'), short=('Markets', 'البازارات'))),
    ('form17', dict(sheets=['FORM-17'], table='khld_vendor_application', group='business', writer='can_write',
                    short=('Bazaar beneficiaries', 'مستفيدو البازارات'))),
    ('form18', dict(sheets=['FORM-18'], table='khld_market_attendance', group='business', writer='can_write',
                    short=('Bazaar attendance', 'حضور البازارات'))),
    ('form24', dict(sheets=['FORM-24'], table='khld_producer_survey', group='business', writer='is_staff',
                    short=('Producer follow-up', 'متابعة المنتجين'))),
])

# The tables in dependency order (a parent before any table pointing at it).
TABLES = [
    'khld_focal_point', 'khld_partner', 'khld_partner_contact', 'khld_meeting', 'khld_rehab_report',
    'khld_campaign', 'khld_activity', 'khld_activity_attendance', 'khld_committee_member',
    'khld_committee_meeting', 'khld_volunteer', 'khld_volunteer_attendance', 'khld_guidance_session',
    'khld_enterprise_request', 'khld_market', 'khld_vendor_application', 'khld_market_attendance',
    'khld_park_survey', 'khld_partner_survey', 'khld_contribution', 'khld_milestone_record',
    'khld_enterprise_support', 'khld_producer_survey',
]

# The column a child row (junction) uses to point at each table.
CHILD_FK = {
    'khld_meeting': 'meeting_id', 'khld_rehab_report': 'report_id', 'khld_campaign': 'campaign_id',
    'khld_activity': 'activity_id', 'khld_activity_attendance': 'attendance_id', 'khld_volunteer': 'volunteer_id',
    'khld_milestone_record': 'milestone_record_id',
}

# ── the option lists: (code, English, Arabic), in the sheet's order ─────────
# A code marked with a trailing '*' takes free text (the "Other (please
# specify)" convention; a bare "Other" specifies too, OQ-53).
L = O()
L['partner_type'] = [
    ('intl_org', 'Representative/International Organization', 'ممثل/منظمة دولية'),
    ('legal_person', 'Legal Person', 'شخصية اعتبارية'),
    ('private_company', 'Representative/Private Company', 'ممثل/ شركة خاصة'),
    ('influencer', 'Influencer', 'مؤثر')]
L['partner_category'] = [
    ('local_association', 'Local association / CSO', 'جمعية محلية / منظمة مجتمع مدني'),
    ('cultural', 'Cultural institution', 'مؤسسة ثقافية'),
    ('private_sector', 'Private sector', 'قطاع خاص'),
    ('educational', 'Educational institution (school / university)', 'مؤسسة تعليمية (مدرسة / جامعة)'),
    ('donor', 'Donor / international organisation', 'جهة مانحة / منظمة دولية'),
    ('other*', 'Other', 'أخرى')]
L['attempt_case'] = [
    ('not_answered', 'Not answered (disconnected/cannot be called/wrong number)', 'لايجيب (مفصول/لا يمكن الاتصال به/ الرقم خاطئ)'),
    ('call_later', 'Partner requested to contact at another time', 'الشريك طلب التواصل في وقت اخر'),
    ('contacted', 'Contacted', 'تم التواصل')]
L['attempt_evaluation'] = [
    ('interested', 'Interested', 'مهتم'),
    ('not_interested', 'Not Interested', 'غير مهتم')]
L['meeting_type'] = [
    ('partner_coordination', 'Coordination meeting with partners', 'اجتماع تنسيقي مع الشركاء'),
    ('stakeholder_consultation', 'Stakeholder consultation', 'تشاور مع أصحاب المصلحة'),
    ('internal', 'Internal municipal meeting', 'اجتماع داخلي للبلدية'),
    ('other*', 'Other', 'أخرى')]
L['facility_type'] = [
    ('seating', 'Seating', 'مقاعد وجلسات'),
    ('play_areas', 'Play areas', 'مناطق ألعاب'),
    ('landscaping', 'Landscaping and planting', 'تنسيق وتشجير'),
    ('sports', 'Sports facilities', 'مرافق رياضية'),
    ('lighting', 'Lighting', 'إنارة'),
    ('accessibility', 'Accessibility features', 'مرافق إمكانية الوصول'),
    ('walkways', 'Walkways', 'ممرات'),
    ('other*', 'Other agreed improvement', 'تحسينات أخرى متفق عليها')]
L['campaign_activity_type'] = [
    ('cleaning', 'Cleaning', 'تنظيف'),
    ('planting', 'Planting and afforestation', 'تشجير وزراعة'),
    ('maintenance', 'Minor maintenance and painting', 'صيانة بسيطة ودهان'),
    ('event_preparation', 'Preparing the park for events', 'تجهيز الحديقة للفعاليات'),
    ('environmental_awareness', 'Environmental awareness', 'توعية بيئية'),
    ('other*', 'Other', 'أخرى')]
L['event_status'] = [
    ('planned', 'Planned', 'مخطط'),
    ('held', 'Held', 'تم التنفيذ'),
    ('postponed', 'Postponed', 'مؤجل'),
    ('cancelled', 'Cancelled', 'ملغى')]
L['activity_type'] = [
    ('cultural', 'Cultural or artistic', 'ثقافي أو فني'),
    ('educational', 'Educational or awareness session', 'جلسة تعليمية أو توعوية'),
    ('children', 'Recreational activity for children', 'نشاط ترفيهي للأطفال'),
    ('sports', 'Activity or sports league', 'نشاط أو دوري رياضي'),
    ('open_day', 'Open day or community celebration', 'يوم مفتوح أو احتفال مجتمعي'),
    ('market', 'Community market or bazaar', 'سوق أو بازار مجتمعي'),
    ('environmental', 'Environmental Activity', 'نشاط بيئي'),
    ('blended', 'Blended Program', 'برنامج مختلط')]
L['target_audience'] = [
    ('women', 'Women and mothers', 'النساء والأمهات'),
    ('children_under_12', 'Children under 12', 'الأطفال دون ١٢'),
    ('adolescents', 'Adolescents 13-17', 'المراهقون ١٣–١٧'),
    ('youth', 'Youth 18-24', 'الشباب ١٨–٢٤'),
    ('families', 'Families', 'العائلات'),
    ('disabilities', 'People with disabilities', 'ذوو الإعاقة'),
    ('all_residents', 'open to all residents', 'مفتوح لجميع السكان')]
L['organiser'] = [
    ('municipality_alone', 'Municipality alone', 'البلدية وحدها'),
    ('municipality_with_partner', 'Municipality with partner', 'البلدية مع شريك'),
    ('local_association', 'Local association', 'جمعية محلية'),
    ('youth_initiative', 'Youth initiative', 'مبادرة شبابية'),
    ('school_university', 'School or university', 'مدرسة أو جامعة'),
    ('other*', 'Other', 'أخرى')]
L['nationality'] = [
    ('jordanian', 'Jordanians', 'اردنيون'),
    ('syrian', 'Syrians', 'سوريون'),
    ('palestinian', 'Palestinians', 'فلسطينيون'),
    ('other*', 'others', 'اخرى')]
L['counting_method'] = [
    ('attendance_sheet', 'Attendance sheet (exact)', 'كشف حضور (دقيق)'),
    ('head_count', 'Head count', 'عد مباشر'),
    ('visual_estimate', 'Visual estimate', 'تقدير بصري')]
L['observed_interaction'] = [
    ('none', 'None', 'لا يوجد'),
    ('limited', 'Limited', 'محدود'),
    ('moderate', 'Moderate', 'متوسط'),
    ('strong', 'Strong', 'قوي')]
L['sex'] = [
    ('male', 'Male', 'ذكر'),
    ('female', 'Female', 'انثى')]
L['organisation_type'] = [
    ('local_association', 'Local association / CSO', 'جمعية محلية / منظمة مجتمع مدني'),
    ('community_initiative', 'Community initiative', 'مبادرة مجتمعية'),
    ('municipality', 'Municipality', 'البلدية'),
    ('school_university', 'School / university', 'مدرسة / جامعة'),
    ('private_sector', 'Private sector', 'قطاع خاص'),
    ('independent', 'Independent community member', 'عضو مجتمع مستقل')]
L['committee_role'] = [
    ('chair', 'Chair', 'رئيس'),
    ('deputy_chair', 'Deputy chair', 'نائب الرئيس'),
    ('secretary', 'Secretary', 'أمين سر'),
    ('member', 'Member', 'عضو')]
L['disability'] = [
    ('no_difficulty', 'No difficulty', 'لا صعوبة'),
    ('some_difficulty', 'a bit difficult', 'صعوبة بعض الشيء'),
    ('a_lot_of_difficulty', 'very difficult', 'صعوبة كبيرة'),
    ('cannot_do_at_all', "I can't at all", 'لا أستطيع على الإطلاق'),
    ('prefer_not_to_say', 'preferably not to disclose', 'يفضل عدم الإفصاح')]
L['situation'] = [
    ('school_student', 'School Student', 'طالب مدرسة'),
    ('university_student', 'University or College Student', 'طالب جامعة أو كلية'),
    ('employee', 'Employee', 'موظف'),
    ('self_employed', 'He works for himself', 'يعمل لحسابه'),
    ('unemployed', 'Unemployed', 'عاطل عن العمل'),
    ('homemaker', 'Housewife', 'ربة/رب منزل'),
    ('retired', 'Retired', 'متقاعد')]
L['volunteer_interest'] = [
    ('cleaning', 'Cleaning & Environment', 'التنظيف والبيئة'),
    ('planting', 'Afforestation and Agriculture', 'التشجير والزراعة'),
    ('maintenance', 'Simple Maintenance and Painting', 'الصيانة البسيطة والدهان'),
    ('children', "Children's Activities", 'أنشطة الأطفال'),
    ('sports', 'Sports Activities', 'الأنشطة الرياضية'),
    ('cultural', 'Cultural and artistic activities', 'الأنشطة الثقافية والفنية'),
    ('events', 'Event Organizing & Reception', 'تنظيم الفعاليات والاستقبال'),
    ('site_safety', 'Site Safety & Attendance Management', 'سلامة الموقع وتنظيم الحضور'),
    ('documentation', 'Documentation and photography', 'التوثيق والتصوير'),
    ('awareness', 'Raising awareness and mobilizing other residents', 'التوعية وحشد سكان آخرين'),
    ('market_days', 'Community Market Days Support', 'مساندة أيام السوق المجتمعي'),
    ('disability_support', 'Supporting volunteers with disabilities', 'مساندة المتطوعين من ذوي الإعاقة'),
    ('other*', 'Other', 'أخرى')]
L['weekday'] = [
    ('saturday', 'Saturday', 'السبت'), ('sunday', 'Sunday', 'الاحد'), ('monday', 'Monday', 'الاثنين'),
    ('tuesday', 'Tuesday', 'الثلاثاء'), ('wednesday', 'Wednesday', 'الاربعاء'), ('thursday', 'Thursday', 'الخميس'),
    ('friday', 'Friday', 'الجمعة')]
L['time_of_day'] = [
    ('morning', 'Morning Hours', 'ساعات الصباح'),
    ('afternoon', 'Afternoon', 'بعد الظهيرة'),
    ('evening', 'Evening', 'مساء')]
L['id_type'] = [
    ('national_id', 'Jordanian National Number', 'رقم وطني أردني'),
    ('unhcr_number', 'UNHCR registration (refugee)', 'تسجيل لدى المفوضية (لاجئ)'),
    ('other_id', 'Other ID', 'وثيقة أخرى')]
L['affiliation'] = [
    ('school', 'School', 'مدرسة'),
    ('university', 'University / college', 'جامعة / كلية'),
    ('cso', 'CSO / association', 'جمعية / منظمة مجتمع مدني'),
    ('community_member', 'Community member (no affiliation)', 'فرد من المجتمع (بدون جهة)'),
    ('other*', 'Other', 'أخرى')]
L['session_topic'] = [
    ('basics', 'Small business basics', 'أساسيات المشاريع الصغيرة'),
    ('licensing', 'Licensing requirements', 'متطلبات الترخيص'),
    ('hygiene', 'Hygiene and health & safety', 'النظافة والصحة والسلامة'),
    ('marketing', 'Marketing and pricing', 'التسويق والتسعير'),
    ('other*', 'Other', 'أخرى')]
L['working_status'] = [
    ('licensed', 'Existing and Licensed', 'قائم ومرخص'),
    ('unlicensed', 'Existing and Unlicensed', 'قائم وغير مرخص'),
    ('intermittent', 'Quarterly or Intermittently', 'قائم موسمياً أو بشكل متقطع'),
    ('not_started', 'Not Started Yet (In the Process)', 'لم يبدأ بعد (بصدد البدء)')]
L['product_type'] = [
    ('baked_goods', 'Baked goods and pastries', 'مخبوزات ومعجنات'),
    ('cooked_food', 'Cooked food and meals', 'أطعمة وأطباق جاهزة'),
    ('pickles', 'Pickles and preserves', 'مخللات ومؤونة'),
    ('jams', 'Jams', 'مربيات'),
    ('dairy', 'Dairy products', 'ألبان وأجبان'),
    ('honey', 'Honey and bee products', 'عسل ومنتجات النحل'),
    ('herbs', 'Herbs and spices', 'أعشاب وبهارات'),
    ('handicrafts', 'Handicrafts and embroidery', 'حرف يدوية وتطريز'),
    ('sewing', 'Sewing and clothing', 'خياطة وألبسة'),
    ('accessories', 'Accessories', 'إكسسوارات'),
    ('soaps', 'Soaps and cosmetics', 'صابون ومستحضرات'),
    ('plants', 'Plants and seedlings', 'نباتات وأشتال'),
    ('other*', 'Other', 'أخرى')]
L['market_occasion'] = [
    ('friday_market', 'Friday market', 'سوق الجمعة'),
    ('holiday', 'Public holiday / occasion', 'عطلة / مناسبة عامة'),
    ('seasonal', 'Seasonal market', 'سوق موسمي'),
    ('other*', 'Other', 'أخرى')]
L['survey_age_group'] = [
    ('15_17', '15-17', '15-17'), ('18_24', '18-24', '18-24'), ('25_59', '25-59', '25-59'), ('60_plus', '60+', '60+')]
L['contribution_type'] = [
    ('financial', 'Financial', 'مالية'),
    ('in_kind', 'In-kind', 'عينية'),
    ('technical', 'Technical', 'فنية'),
    ('volunteer_time', 'Volunteer time', 'وقت تطوعي')]
L['activity_supported'] = [
    ('rehabilitation', 'Park rehabilitation', 'تأهيل الحديقة'),
    ('community_activities', 'Community activities', 'أنشطة مجتمعية'),
    ('volunteer_campaigns', 'Volunteer campaigns', 'حملات تطوعية'),
    ('community_markets', 'Community markets', 'أسواق مجتمعية'),
    ('business_support', 'Business support', 'دعم الأعمال'),
    ('other*', 'Other', 'أخرى')]
L['milestone'] = [
    ('so1_a1', 'Partnership mechanism (SO1-A1)', 'آلية الشراكة (SO1-A1)'),
    ('so1_b1', 'Park use & activity arrangements (SO1-B1)', 'ترتيبات استخدام الحديقة والأنشطة (SO1-B1)'),
    ('so3_e1', 'Community coordination committee (SO3-E1)', 'لجنة التنسيق المجتمعية (SO3-E1)'),
    ('so3_f1', 'Volunteer programme (SO3-F1)', 'برنامج التطوع (SO3-F1)')]
L['components_a1'] = [
    ('focal_point', 'Focal point designated', 'تعيين ضابط ارتباط'),
    ('stakeholder_mapping', 'Stakeholder mapping done', 'إعداد خارطة أصحاب المصلحة'),
    ('partner_communication', 'Partner communication arrangements', 'ترتيبات التواصل مع الشركاء'),
    ('contribution_tracking', 'Contribution tracking in place', 'تتبع المساهمات')]
L['components_b1'] = [
    ('activity_schedule', 'Activity schedule / calendar', 'جدول / تقويم الأنشطة'),
    ('space_rules', 'Rules for use of spaces', 'قواعد استخدام المساحات'),
    ('coordination_procedures', 'Coordination procedures', 'إجراءات التنسيق'),
    ('partner_communication', 'Communication with partners', 'التواصل مع الشركاء')]
L['components_e1'] = [
    ('members_nominated', 'Members nominated', 'تسمية الأعضاء'),
    ('founding_meeting', 'Founding meeting held', 'عقد الاجتماع التأسيسي'),
    ('terms_of_reference', 'Terms of reference agreed', 'اعتماد الشروط المرجعية')]
L['components_f1'] = [
    ('registration_open', 'Volunteer registration open', 'فتح تسجيل المتطوعين'),
    ('roles_defined', 'Volunteer roles defined', 'تحديد أدوار المتطوعين'),
    ('coordination_procedures', 'Coordination procedures agreed', 'اعتماد إجراءات التنسيق'),
    ('programme_launched', 'Programme launched', 'إطلاق البرنامج')]
L['milestone_status'] = [
    ('not_started', 'Not started', 'لم يبدأ'),
    ('in_progress', 'In progress', 'قيد التنفيذ'),
    ('established', 'Established', 'تم الإنشاء'),
    ('updated', 'Updated', 'تم التحديث')]
L['support_type'] = [
    ('guidance', 'Guidance session', 'جلسة إرشاد'),
    ('licensing', 'Licensing information', 'معلومات الترخيص'),
    ('referral', 'Referral to training / technical partner', 'إحالة إلى تدريب / شريك فني'),
    ('peer_network', 'Peer-to-peer exchange network', 'شبكة تبادل بين الرياديين'),
    ('support_visit', 'Enterprise support visit', 'زيارة دعم للمشروع')]
L['support_provider'] = [
    ('local_association', 'Local association', 'جمعية محلية'),
    ('community_coordinator', 'Community coordinator', 'المنسق المجتمعي'),
    ('municipality', 'Municipality', 'البلدية'),
    ('partner', 'Partner', 'شريك')]
LISTS = L

# The likert scales: the five labels of each, from the sheet's option cell.
SCALES = O()
SCALES['plain'] = [('1', '1', '1'), ('2', '2', '2'), ('3', '3', '3'), ('4', '4', '4'), ('5', '5', '5')]
SCALES['agree'] = [
    ('1', '1 Strongly disagree', '1 غير موافق بشدة'), ('2', '2 Disagree', '2 غير موافق'),
    ('3', '3 Neutral', '3 محايد'), ('4', '4 Agree', '4 موافق'), ('5', '5 Strongly agree', '5 موافق بشدة')]
SCALES['satisfied'] = [
    ('1', '1 Very dissatisfied', '1 غير راضٍ إطلاقاً'), ('2', '2 Dissatisfied', '2 غير راضٍ'),
    ('3', '3 Neutral', '3 محايد'), ('4', '4 Satisfied', '4 راضٍ'), ('5', '5 Very satisfied', '5 راضٍ جداً')]
SCALES['suitable'] = [
    ('1', '1 Not suitable', '1 غير ملائم'), ('2', '2', '2'), ('3', '3', '3'), ('4', '4', '4'), ('5', '5 Very suitable', '5 ملائم جداً')]

# The two answers of a boolean, from the sheet's cell: (true, false).
YES_NO = (('Yes', 'نعم'), ('No', 'لا'))
ATTENDED_ABSENT = (('Attended', 'حضر'), ('Absent', 'غاب'))


def F(kind, col=None, **kw):
    d = dict(kind=kind)
    if col:
        d['col'] = col
    d.update(kw)
    return d


# ── every field ────────────────────────────────────────────────────────────
# Field ID -> spec. `req` overrides the sheet's Required column where the
# kind decides it (a stamp or a reference is the database's). `order` on a
# form (ORDER below) puts the identifier type before the number it types.
FIELDS = {
    # FORM-01 Responsible Officer
    'F001': F('text', 'focal_point_name'),
    'F002': F('text', 'phone', ltr=True),
    'F003': F('date', 'assigned_on'),
    # FORM-02 List of potential partners (the entity)
    'F004': F('text', 'name'),
    'F005': F('text', 'phone', ltr=True),
    'F006': F('select', 'partner_type_id', list='partner_type'),
    'F007': F('area', 'expected_contribution'),
    'F008': F('text', 'contact_position'),
    'F009': F('text', 'email', ltr=True),
    'F115': F('select', 'partner_category_id', list='partner_category'),
    # FORM-03 + FORM-04 Reach out to partners
    'F010': F('reference', 'reference'),
    'F011': F('record', 'partner_id', table='khld_partner'),
    'F012': F('stamp', 'attempted_at'),
    'F013': F('select', 'attempt_case_id', list='attempt_case'),
    'F014': F('area', 'notes'),
    'F015': F('select', 'evaluation_id', list='attempt_evaluation', when=('F013', ['contacted'])),
    'F116': F('bool', 'partnership_confirmed', when=('F015', ['interested'])),
    # FORM-05 Stakeholder meetings
    'F016': F('date', 'meeting_date'),
    'F017': F('file', max=5),
    'F018': F('area', 'summary'),
    'F019': F('bool', 'priorities_identified'),
    'F117': F('select', 'meeting_type_id', list='meeting_type'),
    'F118': F('records', table='khld_partner', junction='khld_meeting_partner'),
    'F119': F('int', 'attendees_count', min=1),
    'F120': F('file', max=5),
    # FORM-06 Checklist (rehabilitation progress)
    'F020': F('percent', 'completion_pct'),
    'F021': F('date', 'report_date'),
    'F022': F('area', 'accomplished'),
    'F121': F('int', 'agreed_total', min=1),
    'F122': F('int', 'completed_count', min=0),
    'F123': F('multi', list='facility_type'),
    'F124': F('file', max=5),
    # FORM-07 Volunteer campaigns
    'F023': F('text', 'campaign_name'),
    'F024': F('date', 'start_date'),
    'F025': F('date', 'end_date'),
    'F026': F('date', 'applications_open'),
    'F027': F('date', 'applications_close'),
    'F028': F('area', 'description'),
    'F029': F('bool', 'has_sponsor'),
    'F030': F('text', 'sponsor_name', when=('F029', ['true'])),
    'F125': F('multi', list='campaign_activity_type'),
    'F126': F('select', 'status_id', list='event_status'),
    'F127': F('int', 'action_days', min=1, when=('F126', ['held'])),
    'F128': F('file', max=5, when=('F126', ['held'])),
    # FORM-08 Community activities
    'F031': F('date', 'start_date'),
    'F032': F('date', 'end_date'),
    'F033': F('area', 'description'),
    'F034': F('select', 'activity_type_id', list='activity_type'),
    'F035': F('select', 'target_audience_id', list='target_audience'),
    'F036': F('select', 'organiser_id', list='organiser'),
    'F129': F('text', 'activity_name'),
    'F130': F('select', 'status_id', list='event_status'),
    'F131': F('records', table='khld_partner', junction='khld_activity_partner', when=('F036', ['municipality_with_partner'])),
    # FORM-09 Register your participation in garden activities (aggregate)
    'F037': F('date', 'report_date'),
    'F038': F('record', 'activity_id', table='khld_activity'),
    'F039': F('int', 'total_participants', min=0),
    'F040': F('percent', 'pct_children'),
    'F041': F('percent', 'pct_adults'),
    'F042': F('percent', 'pct_male'),
    'F043': F('percent', 'pct_female'),
    'F044': F('percent', 'pct_disability'),
    'F045': F('multi', list='nationality'),
    'F046': F('area', 'social_media_links'),
    'F047': F('file', max=5),
    'F132': F('select', 'counting_method_id', list='counting_method'),
    'F133': F('percent', 'pct_youth'),
    'F134': F('percent', 'pct_jordanian'),
    'F135': F('percent', 'pct_syrian'),
    'F136': F('select', 'observed_interaction_id', list='observed_interaction'),
    'F137': F('file', max=5, when=('F132', ['attendance_sheet'])),
    # FORM-10 Volunteer management committee (members)
    'F048': F('text', 'member_name'),
    'F049': F('text', 'phone', ltr=True),
    'F050': F('date', 'appointed_on'),
    'F138': F('select', 'sex_id', list='sex'),
    'F139': F('text', 'organisation'),
    'F140': F('select', 'organisation_type_id', list='organisation_type'),
    'F141': F('select', 'role_id', list='committee_role'),
    # FORM-11 Committee meeting record
    'F051': F('date', 'meeting_date'),
    'F052': F('file', max=5),
    'F053': F('area', 'summary'),
    'F054': F('bool', 'workplan_discussed'),
    'F142': F('bool', 'is_founding'),
    'F143': F('int', 'members_present', min=1),
    # FORM-12 Volunteer database (public)
    'F144': F('id_type', 'id_type_id', list='id_type'),
    'F058': F('ident'),
    'F055': F('person_name'),
    'F056': F('person_sex', list='sex'),
    'F057': F('dob'),
    'F059': F('person_phone'),
    'F060': F('bool', 'is_resident', must_be_true=True),
    'F061': F('select', 'nationality_id', list='nationality'),
    'F062': F('select', 'disability_id', list='disability'),
    'F063': F('select', 'situation_id', list='situation'),
    'F064': F('multi', list='volunteer_interest'),
    'F065': F('multi', list='weekday'),
    'F066': F('multi', list='time_of_day'),
    'F067': F('bool', 'photo_consent'),
    'F145': F('select', 'affiliation_id', list='affiliation'),
    'F146': F('text', 'affiliation_name', when=('F145', ['school', 'university', 'cso', 'other'])),
    # FORM-13 Volunteer attendance record
    'F068': F('date', 'report_date'),
    'F069': F('shown', of='F070'),
    'F070': F('record', 'volunteer_id', table='khld_volunteer'),
    'F071': F('likert', 'assessment', scale='plain'),
    'F072': F('area', 'notes'),
    'F147': F('occasion'),
    'F148': F('select', 'role_id', list='volunteer_interest'),
    # FORM-14 Counselling sessions
    'F073': F('text', 'title'),
    'F074': F('date', 'start_date'),
    'F075': F('date', 'end_date'),
    'F076': F('date', 'applications_open'),
    'F077': F('date', 'applications_close'),
    'F078': F('area', 'description'),
    'F079': F('text', 'executing_entity'),
    'F149': F('select', 'topic_id', list='session_topic'),
    'F150': F('bool', 'is_core'),
    # FORM-15 Attendance requests (enterprise owners, staff)
    'F151': F('id_type', 'id_type_id', list='id_type'),
    'F083': F('ident'),
    'F080': F('person_name'),
    'F081': F('person_sex', list='sex'),
    'F082': F('dob'),
    'F084': F('person_phone'),
    'F085': F('bool', 'is_resident'),
    'F086': F('select', 'nationality_id', list='nationality'),
    'F087': F('select', 'disability_id', list='disability'),
    'F088': F('record', 'session_id', table='khld_guidance_session', window=('start_date', 'end_date')),
    'F089': F('bool', 'has_business'),
    'F090': F('select', 'working_status_id', list='working_status'),
    'F152': F('select', 'product_type_id', list='product_type'),
    # FORM-16 Markets
    'F091': F('text', 'name'),
    'F092': F('date', 'start_date'),
    'F093': F('date', 'end_date'),
    'F094': F('int', 'actual_days', min=0),
    'F095': F('date', 'applications_open'),
    'F096': F('date', 'applications_close'),
    'F097': F('area', 'description'),
    'F098': F('bool', 'has_sponsor'),
    'F099': F('text', 'sponsor_name', when=('F098', ['true'])),
    'F100': F('int', 'kiosks_available', min=0),
    'F153': F('select', 'occasion_id', list='market_occasion'),
    'F154': F('select', 'status_id', list='event_status'),
    # FORM-17 Bazaar beneficiaries (vendors, staff)
    'F156': F('id_type', 'id_type_id', list='id_type'),
    'F104': F('ident'),
    'F101': F('person_name'),
    'F102': F('person_sex', list='sex'),
    'F103': F('dob'),
    'F105': F('person_phone'),
    'F106': F('bool', 'is_resident'),
    'F107': F('select', 'nationality_id', list='nationality'),
    'F108': F('select', 'disability_id', list='disability'),
    'F109': F('select', 'product_type_id', list='product_type'),
    'F155': F('record', 'market_id', table='khld_market', window=('applications_open', 'applications_close')),
    # FORM-18 Bazaar attendance record
    'F110': F('date', 'report_date'),
    'F111': F('shown', of='F112'),
    'F112': F('person_ref', 'person_id', source='khld_vendor_application'),
    'F113': F('likert', 'kiosk_rating', scale='plain'),
    'F114': F('area', 'notes'),
    'F157': F('record', 'market_id', table='khld_market', window=('start_date', 'end_date')),
    # FORM-19 Park user feedback survey (anonymous)
    'F158': F('bool', 'consent'),
    'F159': F('stamp', 'surveyed_at'),
    'F160': F('record', 'activity_id', table='khld_activity', extra=('general_visit', 'is_general_visit'), req=False),
    'F161': F('select', 'sex_id', list='sex'),
    'F162': F('select', 'age_group_id', list='survey_age_group'),
    'F163': F('select', 'nationality_id', list='nationality'),
    'F164': F('select', 'disability_id', list='disability'),
    'F165': F('bool', 'is_resident'),
    'F166': F('likert', 'interaction_score', scale='agree'),
    'F167': F('bool', 'shared_participation'),
    'F168': F('likert', 'safe_score', scale='agree'),
    'F169': F('likert', 'welcoming_score', scale='agree'),
    'F170': F('likert', 'satisfaction_score', scale='satisfied'),
    'F171': F('likert', 'suitability_score', scale='suitable', when=('F160', ['__record__'])),
    'F172': F('area', 'suggestions'),
    # FORM-20 Partner coordination survey
    'F173': F('date', 'survey_date'),
    'F174': F('record', 'partner_id', table='khld_partner', confirmed=True),
    'F175': F('text', 'respondent_position'),
    'F176': F('select', 'respondent_sex_id', list='sex'),
    'F177': F('likert', 'coordination_score', scale='agree'),
    'F178': F('likert', 'joint_planning_score', scale='agree'),
    'F179': F('bool', 'overall_effective'),
    'F180': F('area', 'suggestions'),
    # FORM-21 Partner contributions log
    'F181': F('record', 'partner_id', table='khld_partner', extra=('other', None)),
    'F182': F('text', 'contributor_name', when=('F181', ['__extra__'])),
    'F183': F('date', 'date_received'),
    'F184': F('select', 'contribution_type_id', list='contribution_type'),
    'F185': F('area', 'description'),
    'F186': F('money', 'value_jod', min=0),
    'F187': F('select', 'activity_supported_id', list='activity_supported'),
    'F188': F('file', max=5),
    # FORM-22 Milestones register
    'F189': F('select', 'milestone_id', list='milestone'),
    'F190': F('multi', list='components_a1', when=('F189', ['so1_a1'])),
    'F191': F('multi', list='components_b1', when=('F189', ['so1_b1'])),
    'F192': F('multi', list='components_e1', when=('F189', ['so3_e1'])),
    'F193': F('multi', list='components_f1', when=('F189', ['so3_f1'])),
    'F194': F('select', 'status_id', list='milestone_status'),
    'F195': F('date', 'status_date', when=('F194', ['established', 'updated'])),
    'F196': F('file', max=5, when=('F194', ['established', 'updated'])),
    # FORM-23 Enterprise support log
    'F197': F('person_ref', 'person_id', source='khld_enterprise_request'),
    'F198': F('date', 'support_date'),
    'F199': F('select', 'support_type_id', list='support_type'),
    'F200': F('record', 'session_id', table='khld_guidance_session', when=('F199', ['guidance'])),
    'F201': F('bool', 'attended', labels=ATTENDED_ABSENT, when=('F199', ['guidance'])),
    'F202': F('text', 'referred_to', when=('F199', ['referral'])),
    'F203': F('select', 'provided_by_id', list='support_provider'),
    'F204': F('area', 'notes'),
    # FORM-24 Producer market follow-up survey
    'F205': F('date', 'survey_date'),
    'F206': F('person_ref', 'person_id', source='khld_vendor_application'),
    'F207': F('record', 'market_id', table='khld_market', held=True),
    'F208': F('bool', 'increased_opportunities'),
    'F209': F('bool', 'new_customers'),
    'F210': F('bool', 'made_sales'),
    'F211': F('money', 'sales_value_jod', min=0, when=('F210', ['true'])),
    'F212': F('bool', 'received_orders'),
    'F213': F('area', 'suggestions'),
}

# The identifier type before the number it types, then the person, then the rest.
ORDER = {
    'form12': ['F144', 'F058', 'F055', 'F056', 'F057', 'F059'],
    'form15': ['F151', 'F083', 'F080', 'F081', 'F082', 'F084'],
    'form17': ['F156', 'F104', 'F101', 'F102', 'F103', 'F105'],
    'form04': ['F010', 'F011', 'F012'],
    'form13': ['F068', 'F070', 'F069'],
    'form18': ['F110', 'F157', 'F112', 'F111'],
}

# The CHECK constraints that are rules between the columns of one row, from
# the sheet's Validation column. (table, name, expression, the sheet's words).
CHECKS = [
    ('khld_rehab_report', 'khld_rehab_report_completed_within_agreed', 'completed_count <= agreed_total',
     'F122: <= total agreed improvements'),
    ('khld_campaign', 'khld_campaign_dates_in_order', 'end_date >= start_date', 'F024 / F025'),
    ('khld_campaign', 'khld_campaign_window_in_order', 'applications_close >= applications_open', 'F026 / F027'),
    ('khld_campaign', 'khld_campaign_action_days_within_dates',
     'action_days is null or action_days <= (end_date - start_date + 1)', 'F127: >= 1 and <= (F025 - F024 + 1)'),
    ('khld_activity', 'khld_activity_dates_in_order', 'end_date >= start_date', 'F031 / F032'),
    ('khld_activity_attendance', 'khld_activity_attendance_age_split_is_100', 'pct_children + pct_adults = 100',
     'F040 + F041 = 100 (reviewer note)'),
    ('khld_activity_attendance', 'khld_activity_attendance_sex_split_is_100', 'pct_male + pct_female = 100',
     'F042 + F043 = 100 (reviewer note)'),
    ('khld_activity_attendance', 'khld_activity_attendance_nationality_within_100', 'pct_jordanian + pct_syrian <= 100',
     "F135: Jordanian% + Syrian% <= 100"),
    ('khld_guidance_session', 'khld_guidance_session_dates_in_order', 'end_date >= start_date', 'F074 / F075'),
    ('khld_guidance_session', 'khld_guidance_session_window_in_order', 'applications_close >= applications_open', 'F076 / F077'),
    ('khld_market', 'khld_market_dates_in_order', 'end_date >= start_date', 'F092 / F093'),
    ('khld_market', 'khld_market_window_in_order', 'applications_close >= applications_open', 'F095 / F096'),
    ('khld_contribution', 'khld_contribution_one_contributor',
     '(partner_id is null) <> (contributor_name is null)', 'F181 / F182: a listed partner, or "Other" and a name'),
    ('khld_park_survey', 'khld_park_survey_visit_is_one_thing',
     'not (activity_id is not null and is_general_visit)', 'F160: an activity, or "General park visit"'),
    ('khld_park_survey', 'khld_park_survey_visit_needs_consent',
     'consent or not is_general_visit', 'F158 "if no then end survey": F160 is blank too'),
]

# Unique keys: (table, name, expression, partial where or None). Entities
# are unique GLOBALLY, deleted rows included (restored, never recreated);
# events someone took part in are unique while live.
UNIQUES = [
    ('khld_partner', 'khld_partner_name_key', '(municipality_id, lower(btrim(name)))', None),
    ('khld_volunteer', 'khld_volunteer_person_key', '(municipality_id, person_id)', None),
    ('khld_enterprise_request', 'khld_enterprise_request_person_session_live', '(person_id, session_id)', 'deleted_at is null'),
    ('khld_vendor_application', 'khld_vendor_application_person_market_live', '(person_id, market_id)', 'deleted_at is null'),
    ('khld_market_attendance', 'khld_market_attendance_once_a_day_live', '(market_id, person_id, report_date)', 'deleted_at is null'),
    ('khld_volunteer_attendance', 'khld_volunteer_attendance_once_a_day_live',
     '(volunteer_id, coalesce(campaign_id, activity_id), report_date)', 'deleted_at is null'),
]

# Which form carries each indicator's main source (the Calculation formulas
# sheet's "Source form(s)", its first or "(main)" form), for the dashboard.
INDICATOR_FORM = O([
    ('IMP-0', 'form19'), ('SO1-0', None), ('A1', 'form22'), ('A2', 'form05'), ('A3', 'form21'),
    ('B1', 'form22'), ('SO2-0', 'form19'), ('C1', 'form06'), ('C2', 'form07'), ('D1', 'form08'),
    ('D2', 'form09'), ('SO3-0', 'form13'), ('E1', 'form11'), ('F1', 'form22'), ('F2', 'form12'),
    ('F3', 'form07'), ('SO4-0', 'form24'), ('G1', 'form23'), ('G2', 'form23'), ('H1', 'form16'),
    ('H2', 'form18'),
])


def free(code):
    return code.endswith('*')


def code_of(code):
    return code.rstrip('*')
