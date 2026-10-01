# -*- coding: utf-8 -*-
"""
The Ramtha option lists, one per response-option list in RMTH_indicator_forms.xlsx.

This file is the catalogue that generated migration 0122 (`ref_rmth_*` tables and
their seed rows) and that the form definitions in app/src/rmth are checked
against. English labels are VERBATIM from the sheets, in the sheet's order.
Arabic labels were drafted for this platform (the workbook has no Arabic for the
forms); OQ-46 lists them for the Municipality's review and says which ones name
a document or artefact rather than a plain phrase.

    key           -> table ref_rmth_<key>
    options       -> (code, label_en, label_ar, allows_free_text)
    used_by       -> the sheets that read the list (documentation only)

Run `python supabase/ramtha/gen_0122.py` to regenerate the SQL; do not edit the
migration by hand.
"""

L = {}

def lst(key, used_by, options):
    assert key not in L, key
    seen = set()
    for o in options:
        assert o[0] not in seen, (key, o[0])
        seen.add(o[0])
    L[key] = {'used_by': used_by, 'options': options}

# ── shared across the person-level sheets ────────────────────────────────
lst('nationality', ['IMP-0', 'SO1-0', 'SO2-0', 'SO2-C1.2', 'SO3-0', 'SO3-E0.2', 'SO3-F0.1'], [
    ('jordanian', 'Jordanian', 'أردني/ة', False),
    ('syrian',    'Syrian',    'سوري/ة',  False),
    ('other',     'Other nationality (specify)', 'جنسية أخرى (حدّد)', True),
])
lst('vulnerability', ['IMP-0', 'SO1-0', 'SO2-0', 'SO2-C1.2', 'SO3-0', 'SO3-E0.2', 'SO3-F0.1'], [
    ('disability',    'Person with disability',    'شخص من ذوي الإعاقة',        False),
    ('female_head',   'Female head of household',  'امرأة معيلة لأسرة',         False),
    ('refugee',       'Refugee',                   'لاجئ/ة',                    False),
    ('long_term_unemployed', 'Long-term unemployed', 'عاطل/ة عن العمل لفترة طويلة', False),
    ('none',          'None of the above',         'لا شيء مما سبق',             False),
])
lst('reached', ['SO1-0', 'SO2-0', 'SO2-C1'], [
    ('yes',            'Yes',                                    'نعم',                                   False),
    ('no_no_answer',   'No - not answered after three attempts', 'لا - لم يُجب بعد ثلاث محاولات',         False),
    ('no_not_in_service', 'No - number not in service',          'لا - الرقم غير مستخدم',                 False),
    ('refused',        'Refused',                                'رفض/ت',                                 False),
])
lst('project_type', ['SO1-B1', 'SO1-B1.2'], [
    ('investment',   'Investment project',               'مشروع استثماري',              False),
    ('development',  'Development project',              'مشروع تنموي',                 False),
    ('service_contract', 'Municipal service contract',   'عقد خدمة بلدية',              False),
    ('ppp',          'Public-private partnership',       'شراكة بين القطاعين العام والخاص', False),
    ('community',    'Community or household initiative', 'مبادرة مجتمعية أو أسرية',     False),
    ('other',        'Other (specify)',                  'أخرى (حدّد)',                 True),
])
lst('sector', ['SO1-B1', 'SO1-B1.1', 'SO1-B1.2'], [
    ('manufacturing', 'Manufacturing and industry', 'التصنيع والصناعة',        False),
    ('construction',  'Construction',               'الإنشاءات',               False),
    ('agri_food',     'Agriculture and food',       'الزراعة والغذاء',          False),
    ('retail_trade',  'Retail and trade',           'التجزئة والتجارة',         False),
    ('services',      'Services',                   'الخدمات',                  False),
    ('ict',           'ICT and digital',            'تكنولوجيا المعلومات والرقمنة', False),
    ('transport',     'Transport and logistics',    'النقل والخدمات اللوجستية', False),
    ('other',         'Other (specify)',            'أخرى (حدّد)',              True),
])
lst('assessment_result', ['SO2-C1.2', 'SO3-F0.1'], [
    ('passed',       'Passed',       'ناجح/ة',       False),
    ('not_passed',   'Not passed',   'غير ناجح/ة',   False),
    ('not_assessed', 'Not assessed', 'لم يُقيَّم',   False),
])
lst('modality_ipob', ['SO1-A1.3', 'SO3-F0.2'], [
    ('in_person', 'In person', 'حضوري',  False),
    ('online',    'Online',    'عن بُعد', False),
    ('blended',   'Blended',   'مدمج',   False),
])

# ── IMP-0 ────────────────────────────────────────────────────────────────
lst('imp0_pathway', ['IMP-0'], [
    ('project_employment', 'Employment within an investment or development project supported by municipal committees', 'التوظيف ضمن مشروع استثماري أو تنموي مدعوم من اللجان البلدية', False),
    ('after_vocational',   'Employment secured after vocational training',   'الحصول على عمل بعد التدريب المهني',           False),
    ('after_on_the_job',   'Employment secured after on-the-job training',   'الحصول على عمل بعد التدريب أثناء العمل',      False),
    ('after_internship',   'Employment obtained after an internship or a Municipality-facilitated job interview', 'الحصول على عمل بعد تدريب داخلي أو مقابلة عمل سهّلتها البلدية', False),
    ('incubator',          'Income generation through a business incubator', 'توليد الدخل من خلال حاضنة أعمال',             False),
    ('household',          'Household-based enterprise supported by the Municipality', 'مشروع منزلي مدعوم من البلدية',       False),
    ('micro_small',        'Supported micro or small business',             'مشروع صغير أو متناهي الصغر مدعوم',            False),
    ('other',              'Other Municipality-facilitated pathway (specify)', 'مسار آخر سهّلته البلدية (حدّد)',            True),
])
lst('imp0_round', ['IMP-0'], [
    ('first',  'First follow-up',  'المتابعة الأولى',   False),
    ('second', 'Second follow-up', 'المتابعة الثانية',  False),
    ('third',  'Third follow-up',  'المتابعة الثالثة',  False),
    ('final',  'Final round',      'الجولة النهائية',   False),
])
lst('imp0_engaged', ['IMP-0'], [
    ('yes_main',      'Yes, as my main activity',                 'نعم، كنشاطي الرئيسي',            False),
    ('yes_secondary', 'Yes, as a secondary or seasonal activity', 'نعم، كنشاط ثانوي أو موسمي',      False),
    ('no_stopped',    'No, I stopped',                            'لا، توقفت',                      False),
    ('no_never',      'No, I never started',                      'لا، لم أبدأ أصلاً',              False),
])
lst('imp0_capacity', ['IMP-0'], [
    ('employed',        'Employed by a company or organisation',   'موظف/ة لدى شركة أو مؤسسة',     False),
    ('self_employed',   'Self-employed or own business',           'عمل حر أو مشروع خاص',           False),
    ('household_owner', 'Owner of a household-based enterprise',   'صاحب/ة مشروع منزلي',            False),
    ('family',          'Working in a family activity',            'العمل في نشاط عائلي',           False),
    ('casual',          'Daily or casual labour',                  'عمل يومي أو عرضي',              False),
    ('never',           'Never engaged',                           'لم أنخرط أبداً',                 False),
])
lst('imp0_stop_reason', ['IMP-0'], [
    ('contract_ended', 'Work or contract ended',                'انتهى العمل أو العقد',              False),
    ('no_customers',   'No customers or buyers',                'لا يوجد زبائن أو مشترون',           False),
    ('low_income',     'Wage or income too low',                'الأجر أو الدخل منخفض جداً',         False),
    ('input_costs',    'Cost of inputs',                        'تكلفة المستلزمات',                  False),
    ('premises',       'Access to premises, land or equipment', 'الوصول إلى المقر أو الأرض أو المعدات', False),
    ('licensing',      'Licensing or regulatory obstacle',      'عقبة في الترخيص أو التنظيم',        False),
    ('health_family',  'Health or family reasons',              'أسباب صحية أو عائلية',              False),
    ('study',          'Returned to study',                     'العودة إلى الدراسة',                False),
    ('seasonal',       'Seasonal end',                          'انتهاء الموسم',                     False),
    ('other',          'Other (specify)',                       'أخرى (حدّد)',                       True),
])
lst('imp0_criterion', ['IMP-0'], [
    ('yes',         'Yes - engaged for at least X consecutive months', 'نعم - منخرط/ة لمدة X شهراً متتالياً على الأقل', False),
    ('no',          'No - below the threshold',                        'لا - دون الحد المطلوب',                          False),
    ('not_yet_due', 'Not yet due for assessment',                      'لم يحن موعد التقييم بعد',                        False),
    ('not_reached', 'Could not be reached',                            'تعذّر الوصول إليه/ها',                           False),
])
lst('imp0_verification', ['IMP-0'], [
    ('employer_letter',  'Employer confirmation letter',                  'كتاب تأكيد من صاحب العمل',              False),
    ('social_security',  'Social security record',                        'سجل الضمان الاجتماعي',                  False),
    ('partner_record',   'Implementing partner or incubator record',      'سجل الشريك المنفذ أو الحاضنة',           False),
    ('sales_records',    'Sales, invoice or wallet records',              'سجلات المبيعات أو الفواتير أو المحفظة',  False),
    ('site_visit',       'Site visit report',                             'تقرير زيارة ميدانية',                    False),
    ('photos',           'Photographs of the activity',                   'صور للنشاط',                             False),
    ('survey_only',      'Follow-up survey record only',                  'سجل استبيان المتابعة فقط',               False),
    ('self_report_only', 'Beneficiary self-report by telephone only',     'إفادة المستفيد/ة هاتفياً فقط',           False),
])

# ── SO1-0 ────────────────────────────────────────────────────────────────
lst('so10_event_type', ['SO1-0'], [
    ('job_fair',     'Job fair',                                'يوم وظيفي',                          False),
    ('networking',   'Employer-jobseeker networking meeting',   'لقاء تشبيك بين أصحاب العمل والباحثين عن عمل', False),
    ('guidance',     'Vocational guidance session',             'جلسة توجيه مهني',                    False),
    ('coordination', 'Sector or periodic coordination meeting', 'اجتماع تنسيقي قطاعي أو دوري',        False),
    ('combined',     'Combined event',                          'فعالية مشتركة',                      False),
])
lst('so10_verifiable_step', ['SO1-0'], [
    ('interview',   'Attended a job interview',                         'حضرت مقابلة عمل',                         False),
    ('offer',       'Received a job offer',                             'تلقيت عرض عمل',                           False),
    ('internship',  'Started an internship or on-the-job placement',    'بدأت تدريباً داخلياً أو تدريباً أثناء العمل', False),
    ('training',    'Enrolled in a training programme',                 'التحقت ببرنامج تدريبي',                    False),
    ('own_activity', 'Started my own income-generating activity',       'بدأت نشاطي الخاص المدرّ للدخل',           False),
    ('none',        'None of these',                                    'لا شيء من هذه',                           False),
])
lst('so10_other_step', ['SO1-0'], [
    ('cv',          'Updated or prepared a CV',                                   'أعددت أو حدّثت سيرتي الذاتية',                    False),
    ('registered',  'Registered on a job platform or with an employment office',  'سجّلت على منصة توظيف أو لدى مكتب تشغيل',           False),
    ('contacted',   'Made direct contact with an employer met at the event',      'تواصلت مباشرة مع صاحب عمل قابلته في الفعالية',     False),
    ('applied',     'Submitted a job application',                                'قدّمت طلب توظيف',                                  False),
    ('none',        'None of these',                                              'لا شيء من هذه',                                    False),
])
lst('so10_current_status', ['SO1-0'], [
    ('full_time',      'Working full-time',                        'أعمل بدوام كامل',                    False),
    ('part_time',      'Working part-time or seasonally',          'أعمل بدوام جزئي أو موسمي',           False),
    ('self_employed',  'Self-employed',                            'أعمل لحسابي الخاص',                  False),
    ('internship',     'In an internship or on-the-job placement', 'في تدريب داخلي أو تدريب أثناء العمل', False),
    ('in_training',    'In training',                              'في تدريب',                           False),
    ('unemployed_looking', 'Unemployed, actively looking',         'عاطل/ة عن العمل وأبحث عن عمل',       False),
    ('unemployed_not_looking', 'Unemployed, not looking',          'عاطل/ة عن العمل ولا أبحث عن عمل',    False),
    ('student',        'Student',                                  'طالب/ة',                             False),
])
lst('so10_threshold', ['SO1-0'], [
    ('yes_placement', 'Yes - confirmed placement',                          'نعم - توظيف مؤكد',                               False),
    ('yes_steps',     'Yes - one verifiable step plus one other step',      'نعم - خطوة واحدة قابلة للتحقق وخطوة أخرى',       False),
    ('no',            'No',                                                 'لا',                                              False),
    ('not_reached',   'Could not be reached',                               'تعذّر الوصول إليه/ها',                           False),
])
lst('so10_evidence', ['SO1-0'], [
    ('attendance',   'Event attendance sheet',                    'كشف حضور الفعالية',                    False),
    ('survey',       'Follow-up survey record',                   'سجل استبيان المتابعة',                 False),
    ('interview',    'Interview or offer confirmation',           'تأكيد المقابلة أو العرض',               False),
    ('enrolment',    'Internship or training enrolment record',   'سجل الالتحاق بالتدريب الداخلي أو التدريب', False),
    ('employer',     'Employer contact record',                   'سجل التواصل مع صاحب العمل',            False),
    ('none',         'None',                                      'لا شيء',                               False),
])

# ── SO1-A1.2 ─────────────────────────────────────────────────────────────
lst('a12_event_type', ['SO1-A1.2'], [
    ('job_fair',     'Job fair',                                            'يوم وظيفي',                                  False),
    ('networking',   'Employer-jobseeker networking meeting',               'لقاء تشبيك بين أصحاب العمل والباحثين عن عمل', False),
    ('coordination', 'Periodic coordination meeting with employers',        'اجتماع تنسيقي دوري مع أصحاب العمل',           False),
    ('sector',       'Sector networking event',                             'فعالية تشبيك قطاعية',                        False),
    ('combined',     'Combined event (job fair with a guidance component)', 'فعالية مشتركة (يوم وظيفي مع جزء توجيهي)',     False),
    ('other',        'Other (specify)',                                     'أخرى (حدّد)',                                True),
])
lst('a12_organised_by', ['SO1-A1.2'], [
    ('municipality', 'Ramtha Municipality alone',                 'بلدية الرمثا وحدها',                 False),
    ('joint',        'Municipality jointly with a partner',       'البلدية بالاشتراك مع شريك',           False),
    ('partner',      'Partner, facilitated by the Municipality',  'شريك، بتسهيل من البلدية',            False),
])
lst('a12_partner_type', ['SO1-A1.2'], [
    ('private',       'Private sector company',             'شركة من القطاع الخاص',         False),
    ('employers_assoc', "Employers' association",           'جمعية أصحاب عمل',              False),
    ('university',    'University or academic institution', 'جامعة أو مؤسسة أكاديمية',       False),
    ('vocational',    'Vocational training institute',      'معهد تدريب مهني',              False),
    ('government',    'Government institution',             'مؤسسة حكومية',                 False),
    ('ngo',           'NGO or CSO',                         'منظمة غير حكومية أو مؤسسة مجتمع مدني', False),
    ('international', 'International organisation',         'منظمة دولية',                  False),
    ('other',         'Other',                              'أخرى',                         False),
])
lst('a12_evidence', ['SO1-A1.2'], [
    ('attendance', 'Attendance sheet with names and National IDs', 'كشف حضور بالأسماء والأرقام الوطنية', False),
    ('photos',     'Event photographs',                            'صور الفعالية',                       False),
    ('report',     'Event report',                                 'تقرير الفعالية',                     False),
    ('agenda',     'Agenda or programme',                          'جدول الأعمال أو البرنامج',           False),
    ('employers',  'List of participating employers',              'قائمة أصحاب العمل المشاركين',        False),
    ('media',      'Social media or press coverage',               'تغطية إعلامية أو على وسائل التواصل', False),
])

# ── SO1-A1.3 ─────────────────────────────────────────────────────────────
lst('a13_delivered_by', ['SO1-A1.3'], [
    ('municipal_officer', 'Municipal careers or employment officer', 'موظف/ة التوجيه المهني أو التشغيل في البلدية', False),
    ('partner_counsellor', 'Partner career counsellor',              'مرشد/ة مهني/ة من جهة شريكة',              False),
    ('university',        'University or academic institution',      'جامعة أو مؤسسة أكاديمية',                 False),
    ('vocational',        'Vocational training institute',           'معهد تدريب مهني',                         False),
    ('private_hr',        'Private sector HR representative',        'ممثل/ة موارد بشرية من القطاع الخاص',      False),
    ('other',             'Other (specify)',                         'أخرى (حدّد)',                             True),
])
lst('a13_topic', ['SO1-A1.3'], [
    ('labour_market',    'Labour market information for Ramtha',             'معلومات سوق العمل في الرمثا',              False),
    ('career_pathway',   'Career pathway counselling',                       'الإرشاد حول المسار المهني',                False),
    ('cv',               'CV and application writing',                       'كتابة السيرة الذاتية وطلبات التوظيف',      False),
    ('interview',        'Interview skills',                                 'مهارات المقابلة',                          False),
    ('digital_search',   'Digital job search and platforms',                 'البحث الرقمي عن عمل ومنصات التوظيف',       False),
    ('apprenticeship',   'Apprenticeship and on-the-job training options',   'خيارات التلمذة المهنية والتدريب أثناء العمل', False),
    ('entrepreneurship', 'Entrepreneurship and self-employment orientation', 'التوجيه نحو ريادة الأعمال والعمل الحر',    False),
    ('rights',           'Workplace rights and expectations',                'الحقوق والتوقعات في مكان العمل',           False),
    ('other',            'Other (specify)',                                  'أخرى (حدّد)',                              True),
])
lst('a13_target_group', ['SO1-A1.3'], [
    ('school_leavers', 'School leavers',                           'خريجو المدارس',                       False),
    ('students',       'University students or recent graduates', 'طلبة الجامعات أو الخريجون الجدد',     False),
    ('unemployed',     'Unemployed adults',                        'البالغون العاطلون عن العمل',          False),
    ('women_returning', 'Women returning to work',                 'النساء العائدات إلى العمل',           False),
    ('vocational',     'Vocational trainees',                      'متدربو التدريب المهني',               False),
    ('mixed',          'Mixed or open to all',                     'مختلط أو مفتوح للجميع',               False),
    ('other',          'Other (specify)',                          'أخرى (حدّد)',                         True),
])
lst('a13_evidence', ['SO1-A1.3'], [
    ('attendance', 'Attendance sheet with names and National IDs', 'كشف حضور بالأسماء والأرقام الوطنية', False),
    ('photos',     'Session photographs',                          'صور الجلسة',                         False),
    ('materials',  'Session plan or materials',                    'خطة الجلسة أو موادها',               False),
    ('feedback',   'Participant feedback sheets',                  'استمارات تقييم المشاركين',           False),
    ('report',     'Facilitator report',                           'تقرير الميسّر/ة',                    False),
])

# ── SO1-B1 ───────────────────────────────────────────────────────────────
lst('b1_implementer_type', ['SO1-B1'], [
    ('private',      'Private company',            'شركة خاصة',                     False),
    ('cooperative',  'Cooperative',                'جمعية تعاونية',                 False),
    ('ngo',          'NGO or CSO',                 'منظمة غير حكومية أو مؤسسة مجتمع مدني', False),
    ('community',    'Community group',            'مجموعة مجتمعية',                False),
    ('individual',   'Individual entrepreneur',    'رائد/ة أعمال فرد',              False),
    ('ppp',          'Public-private partnership', 'شراكة بين القطاعين العام والخاص', False),
    ('other',        'Other',                      'أخرى',                          False),
])
lst('b1_reached', ['SO1-B1'], [
    ('completed',     'Yes - interview completed',            'نعم - أُجريت المقابلة',              False),
    ('refused',       'Refused',                              'رفض',                                False),
    ('not_reachable', 'Not reachable after three attempts',   'تعذّر الوصول بعد ثلاث محاولات',       False),
])
lst('support_component', ['SO1-B1'], [
    ('approval',       'Approval, licensing or permit facilitation',          'تسهيل الموافقات أو الترخيص أو التصاريح',        False),
    ('land',           'Land or premises',                                    'أرض أو مقر',                                    False),
    ('infrastructure', 'Infrastructure or utilities connection',              'بنية تحتية أو ربط بالمرافق',                    False),
    ('equipment',      'In-kind equipment or materials',                      'معدات أو مواد عينية',                           False),
    ('financial',      'Financial support',                                   'دعم مالي',                                      False),
    ('training',       'Specialised technical training for the workforce',    'تدريب فني متخصص للقوى العاملة',                 False),
    ('recruitment',    'Recruitment or mobilisation of workers or trainees',   'استقطاب أو حشد العمال أو المتدربين',            False),
    ('buyers',         'Linkage to buyers or markets',                        'الربط بالمشترين أو الأسواق',                    False),
    ('finance',        'Linkage to finance providers',                        'الربط بمزوّدي التمويل',                         False),
    ('advisory',       'Advisory or technical support',                       'دعم استشاري أو فني',                            False),
    ('government',     'Coordination with government entities',               'التنسيق مع الجهات الحكومية',                    False),
    ('promotion',      'Promotion or visibility',                             'الترويج أو الإبراز',                            False),
    ('other',          'Other (specify)',                                     'أخرى (حدّد)',                                   True),
])
lst('support_rating', ['SO1-B1'], [
    ('not_received',  'Not received',                                     'لم يُستلم',                                  False),
    ('essential',     'Essential - could not have operated without it',   'أساسي - ما كان ليعمل من دونه',               False),
    ('important',     'Important but not essential',                      'مهم لكنه غير أساسي',                         False),
    ('helpful',       'Helpful',                                          'مفيد',                                       False),
    ('not_important', 'Not important',                                    'غير مهم',                                    False),
])
lst('b1_operating_status', ['SO1-B1'], [
    ('fully',      'Yes, fully operating',         'نعم، يعمل بشكل كامل',      False),
    ('reduced',    'Yes, but at reduced level',    'نعم، لكن بمستوى أقل',      False),
    ('suspended',  'Suspended temporarily',        'متوقف مؤقتاً',             False),
    ('closed',     'Closed',                       'مغلق',                     False),
    ('not_started', 'Not yet started',             'لم يبدأ بعد',              False),
])
lst('b1_evidence', ['SO1-B1'], [
    ('interview',  'Signed interview record',                 'محضر مقابلة موقّع',               False),
    ('agreement',  'Support agreement or handover document',  'اتفاقية دعم أو وثيقة تسليم',      False),
    ('approval',   'Approval or licence copy',                'نسخة من الموافقة أو الترخيص',     False),
    ('site_visit', 'Site visit report',                       'تقرير زيارة ميدانية',             False),
    ('photos',     'Photographs',                             'صور',                             False),
])

# ── SO1-B1.1 ─────────────────────────────────────────────────────────────
lst('b11_specialisation', ['SO1-B1.1'], [
    ('industrial',     'Industrial',      'صناعي',        False),
    ('agricultural',   'Agricultural',    'زراعي',        False),
    ('administrative', 'Administrative',  'إداري',        False),
    ('other',          'Other (specify)', 'أخرى (حدّد)',  True),
])
lst('b11_requirements_method', ['SO1-B1.1'], [
    ('skills_request',  'Written skills request from the project implementer',  'طلب مهارات خطي من منفذ المشروع',            False),
    ('job_descriptions', 'Analysis of job descriptions supplied by the project', 'تحليل الأوصاف الوظيفية المقدمة من المشروع', False),
    ('site_assessment', 'Site or workplace assessment',                          'تقييم الموقع أو مكان العمل',                False),
    ('workshop',        'Joint curriculum workshop with the implementer',        'ورشة منهاج مشتركة مع المنفذ',               False),
    ('skills_gap',      'Skills gap survey of candidates',                       'مسح فجوة المهارات لدى المرشحين',            False),
    ('other',           'Other (specify)',                                       'أخرى (حدّد)',                               True),
])
lst('b11_developed_with', ['SO1-B1.1'], [
    ('municipality', 'Municipality alone',              'البلدية وحدها',              False),
    ('private',      'Private sector establishment',    'منشأة من القطاع الخاص',      False),
    ('academic',     'Academic institution',            'مؤسسة أكاديمية',             False),
    ('vocational',   'Vocational training institute',   'معهد تدريب مهني',            False),
    ('government',   'Government technical body',       'جهة فنية حكومية',            False),
    ('combination',  'Combination (list all)',          'مزيج (اذكر الجميع)',         False),
])
lst('b11_modality', ['SO1-B1.1'], [
    ('in_person',  'In person',  'حضوري',       False),
    ('on_the_job', 'On the job', 'أثناء العمل', False),
    ('blended',    'Blended',    'مدمج',        False),
    ('online',     'Online',     'عن بُعد',      False),
])
lst('b11_evidence', ['SO1-B1.1'], [
    ('curriculum', 'Approved curriculum or training plan',                   'منهاج أو خطة تدريب معتمدة',                 False),
    ('skills_request', 'Skills request or requirements document from the project', 'طلب المهارات أو وثيقة المتطلبات من المشروع', False),
    ('agreement',  'Partner agreement or MoU',                               'اتفاقية شراكة أو مذكرة تفاهم',              False),
    ('minutes',    'Minutes of the curriculum workshop',                      'محضر ورشة المنهاج',                         False),
    ('materials',  'Trainer guide and participant materials',                 'دليل المدرب ومواد المشاركين',               False),
])

# ── SO1-B1.2 ─────────────────────────────────────────────────────────────
lst('b12_submitter_type', ['SO1-B1.2'], [
    ('private',      'Private company',            'شركة خاصة',                     False),
    ('cooperative',  'Cooperative',                'جمعية تعاونية',                 False),
    ('ngo',          'NGO or CSO',                 'منظمة غير حكومية أو مؤسسة مجتمع مدني', False),
    ('community',    'Community group',            'مجموعة مجتمعية',                False),
    ('individual',   'Individual entrepreneur',    'رائد/ة أعمال فرد',              False),
    ('academic',     'Academic institution',       'مؤسسة أكاديمية',                False),
    ('ppp',          'Public-private partnership', 'شراكة بين القطاعين العام والخاص', False),
    ('other',        'Other',                      'أخرى',                          False),
])
lst('b12_support_requested', ['SO1-B1.2'], [
    ('approval',       'Approval, licensing or permits',  'الموافقات أو الترخيص أو التصاريح', False),
    ('land',           'Land or premises',                'أرض أو مقر',                      False),
    ('infrastructure', 'Infrastructure or utilities',     'بنية تحتية أو مرافق',             False),
    ('equipment',      'In-kind equipment',               'معدات عينية',                     False),
    ('financial',      'Financial support',               'دعم مالي',                        False),
    ('training',       'Workforce training',              'تدريب القوى العاملة',             False),
    ('finance',        'Linkage to finance',              'الربط بالتمويل',                  False),
    ('buyers',         'Linkage to buyers or markets',    'الربط بالمشترين أو الأسواق',      False),
    ('advisory',       'Advisory support',                'دعم استشاري',                     False),
    ('other',          'Other (specify)',                 'أخرى (حدّد)',                     True),
])
lst('b12_decision', ['SO1-B1.2'], [
    ('approved',            'Approved for implementation',              'معتمد للتنفيذ',                       False),
    ('approved_conditions', 'Approved with conditions',                 'معتمد بشروط',                         False),
    ('deferred',            'Deferred, further information requested',  'مؤجل، طُلبت معلومات إضافية',           False),
    ('rejected',            'Rejected',                                 'مرفوض',                               False),
    ('under_review',        'Still under review',                       'لا يزال قيد المراجعة',                False),
])
lst('b12_approving_body', ['SO1-B1.2'], [
    ('council',     'Municipal council',            'المجلس البلدي',            False),
    ('investment',  'Investment committee',         'لجنة الاستثمار',           False),
    ('development', 'Local development committee',  'لجنة التنمية المحلية',     False),
    ('other',       'Other',                        'أخرى',                     False),
])
lst('b12_evidence', ['SO1-B1.2'], [
    ('proposal',    'Proposal document',                          'وثيقة المقترح',                        False),
    ('minutes',     'Minutes of the review committee',            'محضر لجنة المراجعة',                   False),
    ('decision',    'Signed approval decision',                   'قرار الاعتماد الموقّع',                False),
    ('conditions',  'Conditions letter',                          'كتاب الشروط',                          False),
    ('annexes',     'Supporting technical or financial annexes',  'ملاحق فنية أو مالية داعمة',            False),
    ('photos',      'Project photographs',                        'صور المشروع',                          False),
    ('testimonial', 'Implementer testimonial',                    'شهادة من المنفذ',                      False),
])

# ── SO2-0 ────────────────────────────────────────────────────────────────
lst('so20_placement_type', ['SO2-0'], [
    ('employment_full', 'Paid employment, full-time',              'عمل مأجور بدوام كامل',              False),
    ('employment_part', 'Paid employment, part-time or seasonal',  'عمل مأجور بدوام جزئي أو موسمي',     False),
    ('internship',      'Internship',                              'تدريب داخلي',                       False),
    ('on_the_job',      'On-the-job training placement',           'تدريب أثناء العمل',                 False),
    ('apprenticeship',  'Apprenticeship',                          'تلمذة مهنية',                       False),
    ('self_employment', 'Self-employment or own activity',         'عمل حر أو نشاط خاص',                False),
    ('none',            'None of these',                           'لا شيء من هذه',                     False),
])
lst('so20_outcome', ['SO2-0'], [
    ('yes_employment',      'Yes - into employment, internship, on-the-job placement or apprenticeship', 'نعم - في عمل أو تدريب داخلي أو تدريب أثناء العمل أو تلمذة مهنية', False),
    ('yes_self_employment', 'Yes - into self-employment',                    'نعم - في عمل حر',                           False),
    ('later',               'No - placement started later than three months', 'لا - بدأ الإلحاق بعد أكثر من ثلاثة أشهر',  False),
    ('not_placed',          'Not placed',                                    'لم يُلحق',                                   False),
])
lst('so20_facilitated_by', ['SO2-0'], [
    ('municipality', 'Yes, directly by the Municipality', 'نعم، مباشرة من البلدية',   False),
    ('partner',      'Yes, through a partner',            'نعم، من خلال شريك',        False),
    ('independent',  'No, found independently',           'لا، وجدته بنفسي',          False),
    ('unknown',      'Do not know',                       'لا أعرف',                  False),
])
lst('so20_arrangement', ['SO2-0'], [
    ('written',    'Written contract',      'عقد مكتوب',        False),
    ('verbal',     'Verbal agreement',      'اتفاق شفهي',       False),
    ('internship', 'Internship agreement',  'اتفاقية تدريب داخلي', False),
    ('daily_wage', 'Daily wage',            'أجر يومي',         False),
    ('self',       'Self-employed',         'عمل حر',           False),
])
lst('so20_working_time', ['SO2-0'], [
    ('full_time', 'Full-time', 'دوام كامل', False),
    ('part_time', 'Part-time', 'دوام جزئي', False),
    ('seasonal',  'Seasonal',  'موسمي',     False),
])
lst('so20_obstacle', ['SO2-0'], [
    ('no_vacancies',  'No vacancies in this field',               'لا توجد شواغر في هذا المجال',            False),
    ('low_wage',      'Wage or stipend offered is too low',       'الأجر أو المكافأة المعروضة منخفضة جداً', False),
    ('transport',     'Transport cost or distance',               'تكلفة المواصلات أو بُعد المسافة',        False),
    ('experience',    'Lack of required experience',              'نقص الخبرة المطلوبة',                    False),
    ('certificate',   'Certificate not recognised by employers',  'الشهادة غير معترف بها لدى أصحاب العمل',  False),
    ('family',        'Family or care responsibilities',          'مسؤوليات عائلية أو رعاية',               False),
    ('health',        'Health reasons',                           'أسباب صحية',                             False),
    ('searching',     'Still searching',                          'لا أزال أبحث',                           False),
    ('other',         'Other (specify)',                          'أخرى (حدّد)',                            True),
])
lst('so20_verification', ['SO2-0'], [
    ('employer',        'Employer or host confirmation',               'تأكيد من صاحب العمل أو الجهة المضيفة',   False),
    ('contract',        'Copy of contract or internship agreement',    'نسخة من العقد أو اتفاقية التدريب الداخلي', False),
    ('social_security', 'Social security record',                      'سجل الضمان الاجتماعي',                    False),
    ('partner',         'Partner records',                             'سجلات الشريك',                            False),
    ('survey_only',     'Follow-up survey record only',                'سجل استبيان المتابعة فقط',                False),
    ('self_report_only', 'Self-report by telephone only',              'إفادة ذاتية هاتفياً فقط',                 False),
])

# ── SO2-C1 ───────────────────────────────────────────────────────────────
lst('so2c1_headline', ['SO2-C1'], [
    ('yes_significantly', 'Yes, significantly',  'نعم، بشكل كبير',       False),
    ('yes_some',          'Yes, to some extent', 'نعم، إلى حد ما',       False),
    ('no_not_really',     'No, not really',      'لا، ليس فعلاً',        False),
    ('no_not_at_all',     'No, not at all',      'لا، على الإطلاق',      False),
])
lst('so2c1_support_way', ['SO2-C1'], [
    ('skills',      'It gave me skills that employers ask for',      'أكسبني مهارات يطلبها أصحاب العمل',        False),
    ('certificate', 'It gave me a certificate employers recognise',  'منحني شهادة يعترف بها أصحاب العمل',        False),
    ('interview',   'It led to a job interview',                     'أدى إلى مقابلة عمل',                       False),
    ('job',         'It led to a job, internship or placement',      'أدى إلى عمل أو تدريب داخلي أو إلحاق',      False),
    ('direction',   'It helped me decide on a career direction',     'ساعدني في تحديد اتجاهي المهني',            False),
    ('cv',          'It improved my CV or job applications',         'حسّن سيرتي الذاتية أو طلبات التوظيف',      False),
    ('contacts',    'It gave me contacts with employers',            'وفّر لي تواصلاً مع أصحاب العمل',           False),
    ('own_activity', 'It helped me start my own activity',           'ساعدني في بدء نشاطي الخاص',                False),
])
lst('so2c1_why_not', ['SO2-C1'], [
    ('content',     'The content did not match available jobs',                 'المحتوى لم يتوافق مع الوظائف المتاحة',        False),
    ('too_short',   'Too short or too theoretical',                             'قصير جداً أو نظري جداً',                       False),
    ('certificate', 'No certificate, or the certificate is not recognised',     'لا شهادة، أو الشهادة غير معترف بها',           False),
    ('no_placement', 'No employer contact or placement support',                'لا تواصل مع أصحاب العمل ولا دعم للإلحاق',      False),
    ('travel',      'I could not travel to where the jobs are',                 'لم أستطع الانتقال إلى حيث الوظائف',            False),
    ('personal',    'Personal or family circumstances',                         'ظروف شخصية أو عائلية',                         False),
    ('other',       'Other (specify)',                                          'أخرى (حدّد)',                                  True),
])
lst('so2c1_evidence', ['SO2-C1'], [
    ('record',   'Completed feedback record signed or initialled by the enumerator', 'سجل التغذية الراجعة المكتمل موقّعاً أو مؤشّراً من الباحث/ة', False),
    ('call_log', 'Call log showing the contact attempts',                            'سجل الاتصالات يبيّن محاولات التواصل',                     False),
    ('roster',   'Completion roster for the cycle',                                  'كشف المتمّين للدورة',                                     False),
    ('none',     'None',                                                             'لا شيء',                                                  False),
])

# ── SO2-C1.1 ─────────────────────────────────────────────────────────────
lst('c11_sector', ['SO2-C1.1'], [
    ('manufacturing', 'Manufacturing and industry',      'التصنيع والصناعة',          False),
    ('construction',  'Construction',                    'الإنشاءات',                 False),
    ('agri_food',     'Agriculture and food',            'الزراعة والغذاء',            False),
    ('retail_trade',  'Retail and trade',                'التجزئة والتجارة',           False),
    ('services',      'Services',                        'الخدمات',                    False),
    ('ict',           'ICT and digital',                 'تكنولوجيا المعلومات والرقمنة', False),
    ('transport',     'Transport and logistics',         'النقل والخدمات اللوجستية',   False),
    ('administrative', 'Administrative and office skills', 'المهارات الإدارية والمكتبية', False),
    ('other',         'Other (specify)',                 'أخرى (حدّد)',                True),
])
lst('c11_modality', ['SO2-C1.1'], [
    ('classroom',  'Classroom',  'صفّي',        False),
    ('on_the_job', 'On the job', 'أثناء العمل', False),
    ('blended',    'Blended',    'مدمج',        False),
    ('online',     'Online',     'عن بُعد',      False),
])
lst('c11_private_contribution', ['SO2-C1.1'], [
    ('skills',     'Defined the skills required',              'حدّدت المهارات المطلوبة',              False),
    ('co_wrote',   'Co-wrote the curriculum',                  'شاركت في كتابة المنهاج',               False),
    ('reviewed',   'Reviewed and validated the curriculum',    'راجعت المنهاج واعتمدته',               False),
    ('trainers',   'Provided trainers',                        'وفّرت مدربين',                         False),
    ('equipment',  'Provided equipment or a training site',    'وفّرت معدات أو موقع تدريب',            False),
    ('placements', 'Committed to placements or interviews',    'التزمت بإلحاق المتدربين أو مقابلتهم',  False),
])
lst('c11_academic_type', ['SO2-C1.1'], [
    ('university',  'University',                    'جامعة',             False),
    ('college',     'Community college',             'كلية مجتمع',        False),
    ('vocational',  'Vocational training institute', 'معهد تدريب مهني',   False),
    ('technical',   'Technical school',              'مدرسة فنية',        False),
    ('other',       'Other',                         'أخرى',              False),
])
lst('c11_academic_contribution', ['SO2-C1.1'], [
    ('outcomes',      'Defined learning outcomes',             'حدّدت مخرجات التعلم',        False),
    ('co_wrote',      'Co-wrote the curriculum',               'شاركت في كتابة المنهاج',     False),
    ('reviewed',      'Reviewed and validated the curriculum', 'راجعت المنهاج واعتمدته',     False),
    ('trainers',      'Provided trainers',                     'وفّرت مدربين',               False),
    ('premises',      'Provided premises or equipment',        'وفّرت مرافق أو معدات',       False),
    ('accreditation', 'Provided accreditation',                'وفّرت الاعتماد',             False),
])
lst('c11_joint_evidence', ['SO2-C1.1'], [
    ('signed_curriculum', 'Curriculum signed or endorsed by both partner types', 'منهاج موقّع أو معتمد من كلا نوعي الشركاء', False),
    ('minutes',           'Minutes of a joint curriculum workshop',              'محضر ورشة منهاج مشتركة',                  False),
    ('mou',               'Memorandum of understanding or partnership agreement', 'مذكرة تفاهم أو اتفاقية شراكة',            False),
    ('sign_off',          'Joint validation or sign-off sheet',                  'ورقة اعتماد أو توقيع مشتركة',             False),
    ('skills_spec',       'Written skills specification from the employer',     'مواصفات مهارات خطية من صاحب العمل',       False),
    ('correspondence',    'Email or letter record of the contributions',        'سجل مراسلات بريدية أو خطية للمساهمات',    False),
])
lst('c11_evidence', ['SO2-C1.1'], [
    ('curriculum',  'Approved curriculum',           'منهاج معتمد',                  False),
    ('agreement',   'Partner agreement or MoU',      'اتفاقية شراكة أو مذكرة تفاهم', False),
    ('minutes',     'Workshop minutes',              'محاضر الورش',                  False),
    ('attendance',  'Attendance sheets',             'كشوف الحضور',                  False),
    ('photos',      'Training photographs',          'صور التدريب',                  False),
    ('assessment',  'Completion assessment records', 'سجلات تقييم الإتمام',          False),
])

# ── SO2-C1.2 ─────────────────────────────────────────────────────────────
lst('c12_training_type', ['SO2-C1.2'], [
    ('vocational_classroom', 'Vocational classroom training', 'تدريب مهني صفّي',       False),
    ('on_the_job',           'On-the-job training',           'تدريب أثناء العمل',      False),
    ('internship',           'Internship',                    'تدريب داخلي',            False),
    ('blended',              'Blended',                       'مدمج',                   False),
    ('online',               'Online',                        'عن بُعد',                 False),
])
lst('c12_employer_evaluation', ['SO2-C1.2'], [
    ('yes',            'Yes - date and assessor',               'نعم - التاريخ والمقيّم',          False),
    ('no',             'No',                                    'لا',                              False),
    ('not_applicable', 'Not applicable, classroom training',    'لا ينطبق، تدريب صفّي',            False),
])
lst('c12_evidence', ['SO2-C1.2'], [
    ('attendance',  'Attendance sheet',            'كشف الحضور',               False),
    ('pre_post',    'Pre and post survey results', 'نتائج الاستبيان القبلي والبعدي', False),
    ('assessment',  'Assessment record',           'سجل التقييم',              False),
    ('employer',    'Employer evaluation form',    'نموذج تقييم صاحب العمل',   False),
    ('certificate', 'Certificate copy',            'نسخة الشهادة',             False),
    ('photos',      'Training photographs',        'صور التدريب',              False),
])

# ── SO3-0 ────────────────────────────────────────────────────────────────
lst('so30_support', ['SO3-0'], [
    ('incubation',  'Incubation services',                            'خدمات الاحتضان',                          False),
    ('training',    'Entrepreneurship training',                      'تدريب في ريادة الأعمال',                  False),
    ('in_kind',     'In-kind support (equipment, premises or land)',  'دعم عيني (معدات أو مقر أو أرض)',          False),
    ('advisory',    'Advisory or mentorship support',                 'دعم استشاري أو إرشادي',                   False),
    ('finance',     'Facilitated access to finance',                  'تسهيل الوصول إلى التمويل',                False),
    ('networking',  'Networking or market linkage',                   'التشبيك أو الربط بالأسواق',               False),
    ('other',       'Other (specify)',                                'أخرى (حدّد)',                             True),
])
lst('so30_sector', ['SO3-0'], [
    ('food',          'Food manufacturing',                'تصنيع الأغذية',                    False),
    ('agriculture',   'Agriculture',                       'الزراعة',                          False),
    ('handicraft',    'Handicraft',                        'الحرف اليدوية',                    False),
    ('retail',        'Retail or trade',                   'التجزئة أو التجارة',               False),
    ('services',      'Services',                          'الخدمات',                          False),
    ('ict',           'ICT or digital',                    'تكنولوجيا المعلومات أو الرقمنة',   False),
    ('professional',  'Professional services',             'الخدمات المهنية',                  False),
    ('urban',         'Urban development or infrastructure', 'التنمية الحضرية أو البنية التحتية', False),
    ('other',         'Other',                             'أخرى',                             True),
])
lst('so30_role', ['SO3-0'], [
    ('owner',     'Owner or co-owner',                              'مالك/ة أو شريك/ة في الملكية',           False),
    ('family',    'Working family member',                          'فرد من الأسرة يعمل في النشاط',          False),
    ('employee',  'Employee of a supported enterprise',             'موظف/ة في مشروع مدعوم',                 False),
    ('freelance', 'Freelance or contracted through the enterprise', 'عمل حر أو متعاقد من خلال المشروع',      False),
])
lst('so30_criterion', ['SO3-0'], [
    ('yes',           'Yes - income in at least four of the last six months', 'نعم - دخل في أربعة أشهر على الأقل من الأشهر الستة الأخيرة', False),
    ('no',            'No',                                                    'لا',                                                          False),
    ('not_assessed',  'Could not be assessed',                                 'تعذّر التقييم',                                               False),
    ('not_reached',   'Could not be reached',                                  'تعذّر الوصول إليه/ها',                                        False),
])
lst('so30_income_change', ['SO3-0'], [
    ('higher',    'Higher',                          'أعلى',                       False),
    ('same',      'About the same',                  'تقريباً نفسه',               False),
    ('lower',     'Lower',                           'أقل',                        False),
    ('no_before', 'I had no income from it before',  'لم يكن لي دخل منه من قبل',   False),
])
lst('so30_stop_reason', ['SO3-0'], [
    ('no_customers',  'No customers or buyers',        'لا يوجد زبائن أو مشترون',       False),
    ('low_prices',    'Prices too low',                'الأسعار منخفضة جداً',           False),
    ('input_costs',   'Cost of inputs',                'تكلفة المستلزمات',              False),
    ('premises',      'Premises, land or equipment',   'المقر أو الأرض أو المعدات',     False),
    ('licensing',     'Licensing obstacle',            'عقبة في الترخيص',               False),
    ('finance',       'Access to finance',             'الوصول إلى التمويل',            False),
    ('health_family', 'Health or family reasons',      'أسباب صحية أو عائلية',          False),
    ('seasonal',      'Seasonal end',                  'انتهاء الموسم',                 False),
    ('other',         'Other',                         'أخرى',                          True),
])
lst('so30_verification', ['SO3-0'], [
    ('sales',        'Sales or invoice records',         'سجلات المبيعات أو الفواتير',        False),
    ('bank',         'Bank or mobile wallet records',    'سجلات بنكية أو محفظة إلكترونية',    False),
    ('registration', 'Business registration or licence', 'تسجيل المنشأة أو ترخيصها',          False),
    ('buyer',        'Buyer or client confirmation',     'تأكيد من مشترٍ أو عميل',            False),
    ('site_visit',   'Site visit report',                'تقرير زيارة ميدانية',               False),
    ('photos',       'Photographs of the activity',      'صور للنشاط',                        False),
    ('self_report_only', 'Self-report by telephone only', 'إفادة ذاتية هاتفياً فقط',           False),
])

# ── SO3-E0.1 ─────────────────────────────────────────────────────────────
lst('e01_field', ['SO3-E0.1'], [
    ('urban',        'Urban development',    'التنمية الحضرية',     False),
    ('infrastructure', 'Infrastructure',     'البنية التحتية',      False),
    ('food',         'Food manufacturing',   'تصنيع الأغذية',       False),
    ('professional', 'Professional services', 'الخدمات المهنية',    False),
    ('other',        'Other high-impact field (specify and justify)', 'مجال آخر عالي الأثر (حدّد وبرّر)', True),
])
lst('e01_host', ['SO3-E0.1'], [
    ('municipal',  'Municipal premises',       'مقر بلدي',                False),
    ('university', 'University campus',        'حرم جامعي',               False),
    ('private',    'Private sector premises',  'مقر من القطاع الخاص',     False),
    ('shared',     'Shared or co-hosted',      'مشترك أو باستضافة مشتركة', False),
    ('virtual',    'Virtual only',             'افتراضي فقط',             False),
])
lst('e01_partner_role', ['SO3-E0.1'], [
    ('premises',   'Premises',                      'المقر',                       False),
    ('funding',    'Funding',                       'التمويل',                     False),
    ('mentors',    'Mentors and trainers',          'المرشدون والمدربون',          False),
    ('equipment',  'Equipment',                     'المعدات',                     False),
    ('design',     'Curriculum and service design', 'تصميم المناهج والخدمات',      False),
    ('markets',    'Access to markets',             'الوصول إلى الأسواق',          False),
    ('governance', 'Governance seat',               'مقعد في الحوكمة',             False),
])
lst('e01_c1', ['SO3-E0.1'], [
    ('yes',            'Yes - location and date',      'نعم - الموقع والتاريخ',       False),
    ('identified',     'Identified but not prepared',  'حُدّد لكنه غير مجهّز',        False),
    ('no',             'No',                           'لا',                          False),
])
lst('e01_c2', ['SO3-E0.1'], [
    ('yes',     'Yes - decision reference and date', 'نعم - مرجع القرار وتاريخه', False),
    ('drafted', 'Drafted, not approved',             'مُعدّ، غير معتمد',           False),
    ('no',      'No',                                'لا',                          False),
])
lst('e01_c3', ['SO3-E0.1'], [
    ('yes',     'Yes - date', 'نعم - التاريخ', False),
    ('drafted', 'Drafted',    'مُعدّ',          False),
    ('no',      'No',         'لا',            False),
])
lst('e01_c4', ['SO3-E0.1'], [
    ('yes', 'Yes - number of staff', 'نعم - عدد الموظفين', False),
    ('no',  'No',                    'لا',                 False),
])
lst('e01_service', ['SO3-E0.1'], [
    ('workspace',   'Workspace',                     'مساحة عمل',                    False),
    ('bds',         'Business development support',  'دعم تطوير الأعمال',            False),
    ('mentorship',  'Mentorship and coaching',        'الإرشاد والتوجيه',             False),
    ('finance',     'Access to finance guidance',     'التوجيه للوصول إلى التمويل',   False),
    ('networking',  'Networking and market linkage',  'التشبيك والربط بالأسواق',      False),
    ('national',    'Linkage to national programmes', 'الربط بالبرامج الوطنية',       False),
    ('legal',       'Legal and registration support', 'الدعم القانوني ودعم التسجيل',  False),
    ('technical',   'Technical or production support', 'دعم فني أو إنتاجي',           False),
])
lst('e01_status', ['SO3-E0.1'], [
    ('achieved',     'Achieved - criteria 1 to 5 met',                       'تحقق - استوفيت المعايير 1 إلى 5',          False),
    ('partial',      'Partially achieved - list the outstanding criteria',   'تحقق جزئياً - اذكر المعايير غير المستوفاة', True),
    ('not_achieved', 'Not achieved',                                         'لم يتحقق',                                 False),
])
lst('e01_evidence', ['SO3-E0.1'], [
    ('decision',   'Municipal decision establishing the incubator',                     'قرار بلدي بإنشاء الحاضنة',                          False),
    ('mou',        'Memorandum of understanding with the university or private partner', 'مذكرة تفاهم مع الجامعة أو الشريك الخاص',          False),
    ('governance', 'Governance document or terms of reference',                          'وثيقة الحوكمة أو الشروط المرجعية',                 False),
    ('catalogue',  'Service catalogue',                                                  'دليل الخدمات',                                      False),
    ('photos',     'Photographs of the premises',                                        'صور المقر',                                         False),
    ('report',     'Incubator establishment or project report',                          'تقرير إنشاء الحاضنة أو تقرير المشروع',             False),
    ('cohort',     'First cohort admission list',                                        'قائمة قبول الدفعة الأولى',                          False),
])

# ── SO3-E0.2 ─────────────────────────────────────────────────────────────
lst('e02_stage', ['SO3-E0.2'], [
    ('idea',       'Idea only',               'فكرة فقط',              False),
    ('prototype',  'Prototype or pilot',      'نموذج أولي أو تجريبي',  False),
    ('informal',   'Operating informally',    'يعمل بشكل غير رسمي',    False),
    ('registered', 'Registered and operating', 'مسجّل ويعمل',          False),
])
lst('e02_sector', ['SO3-E0.2'], [
    ('urban',          'Urban development',     'التنمية الحضرية',                 False),
    ('infrastructure', 'Infrastructure',        'البنية التحتية',                  False),
    ('food',           'Food manufacturing',    'تصنيع الأغذية',                   False),
    ('professional',   'Professional services', 'الخدمات المهنية',                 False),
    ('agriculture',    'Agriculture',           'الزراعة',                         False),
    ('retail',         'Retail or trade',       'التجزئة أو التجارة',              False),
    ('ict',            'ICT or digital',        'تكنولوجيا المعلومات أو الرقمنة',  False),
    ('handicraft',     'Handicraft',            'الحرف اليدوية',                   False),
    ('other',          'Other (specify)',       'أخرى (حدّد)',                     True),
])
lst('e02_service', ['SO3-E0.2'], [
    ('workspace',   'Workspace or desk',                          'مساحة عمل أو مكتب',                    False),
    ('bds',         'Business development support',               'دعم تطوير الأعمال',                    False),
    ('mentorship',  'Mentorship or coaching',                     'إرشاد أو توجيه',                       False),
    ('finance',     'Access to finance guidance',                 'التوجيه للوصول إلى التمويل',           False),
    ('networking',  'Networking or market linkage',               'التشبيك أو الربط بالأسواق',            False),
    ('national',    'Linkage to national programmes',             'الربط بالبرامج الوطنية',               False),
    ('legal',       'Legal, licensing or registration support',   'دعم قانوني أو ترخيصي أو دعم التسجيل',  False),
    ('technical',   'Technical or production support',            'دعم فني أو إنتاجي',                    False),
    ('marketing',   'Marketing and branding support',             'دعم التسويق والعلامة التجارية',        False),
    ('other',       'Other (specify)',                            'أخرى (حدّد)',                          True),
])
lst('e02_status', ['SO3-E0.2'], [
    ('active',    'Active',    'نشط/ة',       False),
    ('graduated', 'Graduated', 'تخرّج/ت',     False),
    ('withdrew',  'Withdrew',  'انسحب/ت',     False),
    ('suspended', 'Suspended', 'موقوف/ة',     False),
])
lst('e02_evidence', ['SO3-E0.2'], [
    ('agreement',  'Signed incubation agreement',    'اتفاقية احتضان موقّعة',   False),
    ('service_log', 'Service log entries',           'قيود سجل الخدمات',        False),
    ('attendance', 'Attendance records for sessions', 'سجلات حضور الجلسات',     False),
    ('notes',      'Mentorship notes',               'ملاحظات الإرشاد',         False),
    ('photos',     'Photographs',                    'صور',                     False),
])

# ── SO3-E0.3 ─────────────────────────────────────────────────────────────
lst('e03_org_type', ['SO3-E0.3'], [
    ('ramtha',      'Ramtha Municipality',                 'بلدية الرمثا',                 False),
    ('other_municipality', 'Other municipality',           'بلدية أخرى',                   False),
    ('university',  'University or academic institution',  'جامعة أو مؤسسة أكاديمية',       False),
    ('vocational',  'Vocational institute',                'معهد مهني',                    False),
    ('private',     'Private sector company',              'شركة من القطاع الخاص',         False),
    ('ngo',         'NGO or CSO',                          'منظمة غير حكومية أو مؤسسة مجتمع مدني', False),
    ('government',  'Government institution',              'مؤسسة حكومية',                 False),
    ('other',       'Other',                               'أخرى',                         False),
])
lst('e03_delivered_by', ['SO3-E0.3'], [
    ('ramtha',      'Ramtha Municipality',                          'بلدية الرمثا',                          False),
    ('university',  'Partner university or academic institution',   'جامعة أو مؤسسة أكاديمية شريكة',          False),
    ('private',     'Private sector partner',                       'شريك من القطاع الخاص',                  False),
    ('expert',      'National or international incubation expert',  'خبير احتضان وطني أو دولي',              False),
    ('other',       'Other (specify)',                              'أخرى (حدّد)',                           True),
])
lst('e03_module', ['SO3-E0.3'], [
    ('models',       'Incubator models and governance',              'نماذج الحاضنات وحوكمتها',              False),
    ('services',     'Design of incubation services',                'تصميم خدمات الاحتضان',                 False),
    ('selection',    'Selection and admission criteria',             'معايير الاختيار والقبول',              False),
    ('mentorship',   'Mentorship systems and mentor management',     'أنظمة الإرشاد وإدارة المرشدين',         False),
    ('sustainability', 'Financial sustainability and revenue models', 'الاستدامة المالية ونماذج الإيرادات',   False),
    ('partnership',  'Partnership and stakeholder management',       'إدارة الشراكات وأصحاب المصلحة',        False),
    ('monitoring',   'Monitoring and evaluation of incubation',      'رصد وتقييم الاحتضان',                  False),
    ('space',        'Physical and virtual space design',            'تصميم المساحة الفعلية والافتراضية',    False),
    ('other',        'Other (specify)',                              'أخرى (حدّد)',                          True),
])
lst('e03_evidence', ['SO3-E0.3'], [
    ('attendance',  'Attendance sheet',          'كشف الحضور',                     False),
    ('pre_post',    'Pre and post test results', 'نتائج الاختبار القبلي والبعدي',  False),
    ('certificate', 'Certificate copy',          'نسخة الشهادة',                   False),
    ('materials',   'Training materials',        'المواد التدريبية',               False),
    ('photos',      'Photographs',               'صور',                            False),
])

# ── SO3-F0.1 ─────────────────────────────────────────────────────────────
lst('f01_training_type', ['SO3-F0.1'], [
    ('classroom',  'Classroom',                       'صفّي',                      False),
    ('on_the_job', 'On the job or in the enterprise', 'أثناء العمل أو في المشروع', False),
    ('blended',    'Blended',                         'مدمج',                      False),
    ('online',     'Online',                          'عن بُعد',                    False),
    ('mentoring',  'Mentoring or coaching',           'إرشاد أو توجيه',            False),
])
lst('f01_enterprise_status', ['SO3-F0.1'], [
    ('idea',       'Idea only, not yet started',      'فكرة فقط، لم يبدأ بعد',      False),
    ('informal',   'Operating informally',            'يعمل بشكل غير رسمي',         False),
    ('registered', 'Registered and operating',        'مسجّل ويعمل',                False),
    ('stopped',    'Previously operated, now stopped', 'كان يعمل سابقاً وتوقف الآن', False),
])
lst('f01_sector', ['SO3-F0.1'], [
    ('food',         'Food manufacturing',    'تصنيع الأغذية',                   False),
    ('agriculture',  'Agriculture',           'الزراعة',                         False),
    ('handicraft',   'Handicraft',            'الحرف اليدوية',                   False),
    ('retail',       'Retail or trade',       'التجزئة أو التجارة',              False),
    ('services',     'Services',              'الخدمات',                         False),
    ('ict',          'ICT or digital',        'تكنولوجيا المعلومات أو الرقمنة',  False),
    ('professional', 'Professional services', 'الخدمات المهنية',                 False),
    ('other',        'Other (specify)',       'أخرى (حدّد)',                     True),
])
lst('f01_module', ['SO3-F0.1'], [
    ('production', 'Production practices and processes',                     'ممارسات وعمليات الإنتاج',                     False),
    ('quality',    'Quality assurance standards',                            'معايير ضمان الجودة',                          False),
    ('planning',   'Business planning',                                      'تخطيط الأعمال',                               False),
    ('costing',    'Costing and pricing',                                    'حساب التكاليف والتسعير',                      False),
    ('finance_mgmt', 'Financial management and bookkeeping',                 'الإدارة المالية ومسك الدفاتر',                False),
    ('marketing',  'Marketing and sales',                                    'التسويق والمبيعات',                           False),
    ('licensing',  'Licensing, registration and food safety requirements',   'متطلبات الترخيص والتسجيل وسلامة الغذاء',      False),
    ('finance',    'Access to finance',                                      'الوصول إلى التمويل',                          False),
    ('other',      'Other (specify)',                                        'أخرى (حدّد)',                                 True),
])
lst('f01_evidence', ['SO3-F0.1'], [
    ('attendance',  'Attendance sheet',              'كشف الحضور',              False),
    ('certificate', 'Completion certificate copy',   'نسخة شهادة الإتمام',      False),
    ('assessment',  'Assessment record',             'سجل التقييم',             False),
    ('photos',      'Training photographs',          'صور التدريب',             False),
])

# ── SO3-F0.2 ─────────────────────────────────────────────────────────────
lst('f02_level', ['SO3-F0.2'], [
    ('pre_start', 'Pre-start (idea stage)', 'ما قبل البدء (مرحلة الفكرة)', False),
    ('start_up',  'Start-up',               'ناشئ',                        False),
    ('growth',    'Growth',                 'نمو',                         False),
])
lst('f02_group', ['SO3-F0.2'], [
    ('youth',      'Youth',                                'الشباب',                              False),
    ('women',      'Women',                                'النساء',                              False),
    ('household',  'Household producers',                  'المنتجون المنزليون',                  False),
    ('students',   'University students and graduates',    'طلبة الجامعات والخريجون',             False),
    ('existing',   'Existing micro and small businesses',  'المشاريع الصغيرة ومتناهية الصغر القائمة', False),
    ('mixed',      'Mixed',                                'مختلط',                               False),
])
lst('f02_sector', ['SO3-F0.2'], [
    ('food',         'Food manufacturing',    'تصنيع الأغذية',                   False),
    ('agriculture',  'Agriculture',           'الزراعة',                         False),
    ('handicraft',   'Handicraft',            'الحرف اليدوية',                   False),
    ('retail',       'Retail or trade',       'التجزئة أو التجارة',              False),
    ('services',     'Services',              'الخدمات',                         False),
    ('ict',          'ICT or digital',        'تكنولوجيا المعلومات أو الرقمنة',  False),
    ('professional', 'Professional services', 'الخدمات المهنية',                 False),
    ('cross_sector', 'Cross-sector',          'متعدد القطاعات',                  False),
    ('other',        'Other (specify)',       'أخرى (حدّد)',                     True),
])
lst('f02_developed_by', ['SO3-F0.2'], [
    ('municipality', 'Ramtha Municipality alone',            'بلدية الرمثا وحدها',           False),
    ('partner',      'Partner organisation',                 'جهة شريكة',                    False),
    ('joint',        'Municipality jointly with a partner',  'البلدية بالاشتراك مع شريك',     False),
])
lst('f02_partner_type', ['SO3-F0.2'], [
    ('university',    'University or academic institution', 'جامعة أو مؤسسة أكاديمية',       False),
    ('vocational',    'Vocational training institute',      'معهد تدريب مهني',              False),
    ('private',       'Private sector company',             'شركة من القطاع الخاص',         False),
    ('ngo',           'NGO or CSO',                         'منظمة غير حكومية أو مؤسسة مجتمع مدني', False),
    ('international', 'International organisation',         'منظمة دولية',                  False),
    ('financial',     'Financial institution',              'مؤسسة مالية',                  False),
    ('government',    'Government institution',             'مؤسسة حكومية',                 False),
    ('other',         'Other',                              'أخرى',                         False),
])
lst('f02_content_basis', ['SO3-F0.2'], [
    ('needs_assessment', 'Needs assessment with entrepreneurs in Ramtha',  'تقييم احتياجات مع رواد الأعمال في الرمثا',    False),
    ('market_study',     'Local market study',                             'دراسة للسوق المحلي',                          False),
    ('incubator',        'Request from the business incubator',            'طلب من حاضنة الأعمال',                        False),
    ('partner_curriculum', 'Existing partner curriculum, adapted to Ramtha', 'منهاج شريك قائم، مُكيَّف للرمثا',           False),
    ('national',         'National entrepreneurship curriculum',           'منهاج وطني لريادة الأعمال',                   False),
    ('employer',         'Employer or buyer requirements',                 'متطلبات أصحاب العمل أو المشترين',              False),
    ('other',            'Other (specify)',                                'أخرى (حدّد)',                                 True),
])
lst('f02_module', ['SO3-F0.2'], [
    ('production', 'Production practices and processes',                     'ممارسات وعمليات الإنتاج',                     False),
    ('quality',    'Quality assurance standards',                            'معايير ضمان الجودة',                          False),
    ('planning',   'Business planning',                                      'تخطيط الأعمال',                               False),
    ('costing',    'Costing and pricing',                                    'حساب التكاليف والتسعير',                      False),
    ('finance_mgmt', 'Financial management and bookkeeping',                 'الإدارة المالية ومسك الدفاتر',                False),
    ('marketing',  'Marketing and sales',                                    'التسويق والمبيعات',                           False),
    ('licensing',  'Licensing, registration and food safety requirements',   'متطلبات الترخيص والتسجيل وسلامة الغذاء',      False),
    ('finance',    'Access to finance',                                      'الوصول إلى التمويل',                          False),
    ('digital',    'Digital tools for small business',                       'الأدوات الرقمية للمشاريع الصغيرة',            False),
    ('other',      'Other (specify)',                                        'أخرى (حدّد)',                                 True),
])
lst('f02_material', ['SO3-F0.2'], [
    ('curriculum', 'Curriculum or session outline',            'المنهاج أو مخطط الجلسات',          False),
    ('trainer_guide', 'Trainer guide',                         'دليل المدرب',                      False),
    ('handbook',   'Participant handbook or materials',        'دليل المشاركين أو موادهم',         False),
    ('assessment', 'Assessment or completion tool',            'أداة التقييم أو الإتمام',          False),
    ('templates',  'Attendance and registration templates',    'نماذج الحضور والتسجيل',            False),
])
lst('f02_complete', ['SO3-F0.2'], [
    ('yes',            'Yes - materials produced and approved', 'نعم - أُنتجت المواد واعتُمدت', False),
    ('in_development', 'In development',                       'قيد التطوير',                  False),
    ('no',             'No',                                   'لا',                           False),
])
lst('f02_evidence', ['SO3-F0.2'], [
    ('curriculum',   'Approved curriculum',              'منهاج معتمد',                   False),
    ('trainer_guide', 'Trainer guide',                   'دليل المدرب',                   False),
    ('materials',    'Participant materials',            'مواد المشاركين',                False),
    ('needs_report', 'Needs assessment report',          'تقرير تقييم الاحتياجات',        False),
    ('agreement',    'Partner agreement or MoU',         'اتفاقية شراكة أو مذكرة تفاهم',  False),
    ('approval',     'Approval or endorsement record',   'سجل الاعتماد أو الإقرار',       False),
])

if __name__ == '__main__':
    n = sum(len(v['options']) for v in L.values())
    print(len(L), 'lists,', n, 'options')
