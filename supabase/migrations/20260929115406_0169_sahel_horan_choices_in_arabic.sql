-- ═══════════════════════════════════════════════════════════════════════════
--  0169 — Sahel Horan's choices in Arabic
--
--  Eighteen of Sahel Horan's option lists carried no Arabic: label_ar was
--  empty or a copy of the English, so every dropdown and checklist on the
--  Arabic screens read in English. The owner asked on 29 September 2026 for
--  everything to be in Arabic, and for إطار_عمل_بلدية_سهل_حوران_عربي.xlsx to
--  be the source.
--
--  Where the framework's form sheets word an option, that wording is used:
--  producer types and products (نموذج_التسجيل_في_المعرض), the partner types
--  and roles (نموذج_الشراكة, نموذج_شراكة_دعم_الإنتاج), agricultural
--  involvement and activity (نموذج_إتمام_التدريب), and the follow-up
--  survey's buyers, sales channels, food-safety items and office services
--  (نموذج_ما_بعد_التدخل). The rest -- disability types, guidance types,
--  nationality, promotional channels, stakeholder types, training topics --
--  are translated here; 06_OPEN_QUESTIONS.md OQ-75 lists them for the
--  Arabic reviewer.
--
--  Only label_ar changes. Codes, English labels, order and the free-text
--  flags are untouched, so no stored answer and no figure moves.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0169 (tbl text, code text, label_ar text) on commit drop;
insert into _0169 (tbl, code, label_ar) values
  -- نموذج_إتمام_التدريب، السؤال 10
  ('ref_activity_type', 'crop_production', 'الإنتاج النباتي (المحاصيل)'),
  ('ref_activity_type', 'livestock', 'الثروة الحيوانية'),
  ('ref_activity_type', 'greenhouse', 'الزراعة في البيوت البلاستيكية'),
  ('ref_activity_type', 'food_processing', 'التصنيع الغذائي'),
  ('ref_activity_type', 'other', 'أخرى'),
  -- نموذج_إتمام_التدريب، السؤال 9
  ('ref_agri_involvement', 'farmer_own_land', 'مزارع (أرض مملوكة)'),
  ('ref_agri_involvement', 'farmer_rented_land', 'مزارع (يعمل في أرض مستأجرة / بالشراكة)'),
  ('ref_agri_involvement', 'agri_worker', 'عامل زراعي'),
  ('ref_agri_involvement', 'agribusiness_owner', 'صاحب مشروع زراعي (مثل التصنيع أو التجارة)'),
  ('ref_agri_involvement', 'student', 'طالب (في تخصص ذي صلة بالزراعة)'),
  ('ref_agri_involvement', 'not_working_agri', 'لا يعمل حالياً في الزراعة'),
  -- نموذج_ما_بعد_التدخل، السؤال 35
  ('ref_buyer_type', 'retailer_shop', 'بائع تجزئة أو محل'),
  ('ref_buyer_type', 'wholesaler_trader', 'تاجر جملة أو وسيط'),
  ('ref_buyer_type', 'food_processing_facility', 'منشأة تصنيع غذائي'),
  ('ref_buyer_type', 'restaurant_hotel', 'مطعم أو فندق'),
  ('ref_buyer_type', 'cooperative', 'جمعية تعاونية'),
  ('ref_buyer_type', 'institutional_buyer', 'مشترٍ مؤسسي مثل مدرسة أو مستشفى أو جهة حكومية'),
  ('ref_buyer_type', 'exporter', 'مُصدِّر'),
  ('ref_buyer_type', 'online_platform', 'منصة إلكترونية'),
  ('ref_buyer_type', 'other', 'أخرى'),
  -- the Washington Group domains
  ('ref_disability_type', 'seeing', 'الرؤية'),
  ('ref_disability_type', 'hearing', 'السمع'),
  ('ref_disability_type', 'mobility', 'الحركة'),
  ('ref_disability_type', 'cognition', 'التذكر أو التركيز'),
  ('ref_disability_type', 'self_care', 'العناية الذاتية'),
  ('ref_disability_type', 'communication', 'التواصل'),
  ('ref_guidance_type', 'food_safety', 'سلامة الغذاء'),
  ('ref_guidance_type', 'licensing', 'الترخيص'),
  ('ref_guidance_type', 'packaging', 'التغليف'),
  ('ref_guidance_type', 'labelling', 'الملصقات التعريفية'),
  ('ref_guidance_type', 'pricing', 'التسعير'),
  ('ref_guidance_type', 'marketing', 'التسويق'),
  ('ref_nationality', 'jordanian', 'أردني'),
  ('ref_nationality', 'syrian', 'سوري'),
  ('ref_nationality', 'palestinian', 'فلسطيني'),
  ('ref_nationality', 'other', 'أخرى'),
  -- نموذج_ما_بعد_التدخل، السؤال 15
  ('ref_office_service_type', 'technical_advice', 'استشارة فنية'),
  ('ref_office_service_type', 'input_guidance', 'توجيه بشأن المدخلات أو المعدات'),
  ('ref_office_service_type', 'licensing_help', 'مساعدة في الترخيص والمعاملات'),
  ('ref_office_service_type', 'market_info', 'معلومات عن السوق أو المشترين'),
  ('ref_office_service_type', 'referral', 'إحالة إلى جهة أخرى'),
  ('ref_office_service_type', 'other', 'أخرى'),
  -- نموذج_شراكة_دعم_الإنتاج، السؤال 5
  ('ref_partner_role_production', 'technical_advisory', 'الاستشارات الفنية / خدمات الإرشاد الزراعي للمنتجين'),
  ('ref_partner_role_production', 'input_provision', 'توفير المدخلات (مثل البذور والأسمدة والمعدات والتكنولوجيا)'),
  ('ref_partner_role_production', 'processing_value_addition', 'دعم التصنيع / إضافة القيمة'),
  ('ref_partner_role_production', 'market_linkage_buyers', 'الربط بالسوق / التواصل مع المشترين'),
  ('ref_partner_role_production', 'quality_standards', 'دعم معايير الجودة أو الشهادات أو سلامة الغذاء'),
  ('ref_partner_role_production', 'financing_credit', 'التمويل / الائتمان / المنح للمنتجين'),
  ('ref_partner_role_production', 'infrastructure_logistics', 'دعم البنية التحتية أو الخدمات اللوجستية (مثل التخزين والنقل وسلسلة التبريد)'),
  ('ref_partner_role_production', 'policy_support', 'دعم السياسات / الأنظمة والتشريعات'),
  ('ref_partner_role_production', 'tech_readiness', 'الجاهزية التكنولوجية'),
  ('ref_partner_role_production', 'other', 'أخرى (يرجى التحديد)'),
  -- نموذج_الشراكة، السؤال 5
  ('ref_partner_role_training', 'training_delivery', 'تقديم التدريب (توفير خدمات التدريب)'),
  ('ref_partner_role_training', 'curriculum_development', 'تطوير المناهج واعتمادها'),
  ('ref_partner_role_training', 'funding', 'التمويل / الدعم المالي'),
  ('ref_partner_role_training', 'market_linkage_jobs', 'الربط بالسوق / التوظيف'),
  ('ref_partner_role_training', 'input_provision', 'توفير المدخلات (مثل البذور والمعدات والتكنولوجيا)'),
  ('ref_partner_role_training', 'community_outreach', 'التواصل المجتمعي وحشد المشاركين'),
  ('ref_partner_role_training', 'technical_advisory', 'الاستشارات الفنية / خدمات الإرشاد الزراعي'),
  ('ref_partner_role_training', 'mel_support', 'دعم الرصد والتقييم والتعلم'),
  ('ref_partner_role_training', 'logistics', 'الدعم اللوجستي والتشغيلي (مثل القاعات والمواصلات)'),
  ('ref_partner_role_training', 'financial_services', 'الخدمات المالية (مثل القروض والمنح للمستفيدين)'),
  ('ref_partner_role_training', 'policy_support', 'دعم السياسات / الأنظمة والتشريعات'),
  ('ref_partner_role_training', 'other', 'أخرى (يرجى التحديد)'),
  -- نموذج_شراكة_دعم_الإنتاج، السؤال 4
  ('ref_partner_type_production', 'government', 'مؤسسة حكومية (وطنية أو محلية)'),
  ('ref_partner_type_production', 'technical_institution', 'مؤسسة فنية / مركز بحثي'),
  ('ref_partner_type_production', 'food_processing_facility', 'منشأة تصنيع غذائي / شركة تصنيع زراعي'),
  ('ref_partner_type_production', 'private_sector', 'شركة من القطاع الخاص (مورد مدخلات، تاجر، أعمال زراعية، إلخ)'),
  ('ref_partner_type_production', 'financial_institution', 'مؤسسة مالية'),
  ('ref_partner_type_production', 'ngo_cso', 'منظمة غير حكومية / منظمة مجتمع مدني'),
  ('ref_partner_type_production', 'international_org', 'منظمة دولية / شريك تنموي'),
  ('ref_partner_type_production', 'university', 'الجامعات'),
  ('ref_partner_type_production', 'other', 'أخرى (يرجى التحديد)'),
  -- نموذج_الشراكة، السؤال 4
  ('ref_partner_type_training', 'government', 'مؤسسة حكومية (وطنية أو محلية)'),
  ('ref_partner_type_training', 'public_training_institute', 'معهد تدريب حكومي / خدمات الإرشاد الزراعي'),
  ('ref_partner_type_training', 'university', 'جامعة / مؤسسة أكاديمية'),
  ('ref_partner_type_training', 'private_sector', 'شركة من القطاع الخاص'),
  ('ref_partner_type_training', 'ngo_cso', 'منظمة غير حكومية / منظمة مجتمع مدني'),
  ('ref_partner_type_training', 'international_org', 'منظمة دولية / شريك تنموي'),
  ('ref_partner_type_training', 'financial_institution', 'مؤسسة مالية'),
  ('ref_partner_type_training', 'other', 'أخرى (يرجى التحديد)'),
  -- نموذج_التسجيل_في_المعرض، السؤال 5
  ('ref_producer_type', 'individual_farmer', 'مزارع / منتج فردي'),
  ('ref_producer_type', 'household_producer', 'منتج منزلي'),
  ('ref_producer_type', 'cooperative', 'جمعية تعاونية زراعية'),
  ('ref_producer_type', 'association', 'جمعية زراعية'),
  ('ref_producer_type', 'food_processing_business', 'منشأة تصنيع غذائي'),
  ('ref_producer_type', 'agri_enterprise', 'مشروع زراعي'),
  ('ref_producer_type', 'handicraft_producer', 'منتج حرف يدوية'),
  ('ref_producer_type', 'womens_group', 'مجموعة نسائية / مجموعة مجتمعية'),
  ('ref_producer_type', 'other', 'أخرى (يرجى التحديد)'),
  -- نموذج_التسجيل_في_المعرض، السؤال 4
  ('ref_product', 'fresh_fruits', 'فواكه طازجة'),
  ('ref_product', 'vegetables', 'خضروات'),
  ('ref_product', 'dairy', 'منتجات الألبان'),
  ('ref_product', 'meat_livestock', 'اللحوم / منتجات الثروة الحيوانية'),
  ('ref_product', 'honey', 'العسل / منتجات النحل'),
  ('ref_product', 'olive_oil', 'زيت الزيتون / الزيتون'),
  ('ref_product', 'pickled_preserved', 'المخللات / المنتجات المحفوظة'),
  ('ref_product', 'baked_traditional', 'المخبوزات / المنتجات الغذائية التقليدية'),
  ('ref_product', 'jams_processed', 'المربيات / الأغذية المصنعة'),
  ('ref_product', 'herbs_medicinal', 'الأعشاب / النباتات الطبية'),
  ('ref_product', 'handicrafts', 'الحرف اليدوية'),
  ('ref_promotional_channel', 'digital_platform', 'منصة رقمية'),
  ('ref_promotional_channel', 'local_partnership', 'شراكة محلية'),
  ('ref_promotional_channel', 'community_event', 'فعالية مجتمعية'),
  ('ref_promotional_channel', 'radio', 'إذاعة'),
  ('ref_promotional_channel', 'print', 'مطبوعات'),
  -- نموذج_ما_بعد_التدخل، السؤال 23
  ('ref_safety_item', 'health_certificate', 'شهادة صحية أو موافقة سلامة الغذاء'),
  ('ref_safety_item', 'licence_registration', 'رخصة أو تسجيل للإنتاج أو المشروع المنزلي'),
  ('ref_safety_item', 'hygiene_practices', 'تحسين ممارسات النظافة في منطقة الإنتاج'),
  ('ref_safety_item', 'storage_cold_chain', 'تحسين التخزين أو التعامل مع سلسلة التبريد'),
  ('ref_safety_item', 'packaging', 'التغليف المناسب للمنتج'),
  ('ref_safety_item', 'product_label', 'ملصق للمنتج يبين الاسم والمكونات والوزن وتاريخي الإنتاج والانتهاء'),
  ('ref_safety_item', 'trade_name_brand', 'اسم تجاري أو علامة تجارية أو شعار لمنتجاتي'),
  ('ref_safety_item', 'costing_pricing', 'احتساب تكلفة المنتج وتسعيره'),
  ('ref_safety_item', 'online_presence', 'صفحة على وسائل التواصل الاجتماعي أو حضور إلكتروني للمنتج'),
  -- نموذج_ما_بعد_التدخل، السؤال 27
  ('ref_sales_channel', 'not_selling', 'لا أبيع بعد'),
  ('ref_sales_channel', 'neighbours', 'للجيران، عن طريق التوصية الشفهية'),
  ('ref_sales_channel', 'from_home', 'من المنزل'),
  ('ref_sales_channel', 'municipal_market', 'سوق ريفي أو معرض تنظمه البلدية'),
  ('ref_sales_channel', 'local_shops', 'المحلات أو تجار التجزئة المحليون'),
  ('ref_sales_channel', 'wholesaler_trader', 'تاجر جملة أو وسيط'),
  ('ref_sales_channel', 'food_processing_facility', 'منشأة تصنيع غذائي'),
  ('ref_sales_channel', 'cooperative_association', 'جمعية تعاونية أو جمعية'),
  ('ref_sales_channel', 'social_media_online', 'وسائل التواصل الاجتماعي أو الإنترنت'),
  ('ref_sales_channel', 'outside_governorate', 'مشترون من خارج المحافظة'),
  ('ref_sales_channel', 'other', 'أخرى'),
  ('ref_stakeholder_type', 'government', 'حكومي'),
  ('ref_stakeholder_type', 'technical', 'فني'),
  ('ref_stakeholder_type', 'academic', 'أكاديمي'),
  ('ref_stakeholder_type', 'private_sector', 'القطاع الخاص'),
  ('ref_stakeholder_type', 'community', 'مجتمعي'),
  ('ref_stakeholder_type', 'neighbouring_municipality', 'بلدية مجاورة'),
  ('ref_training_topic', 'crop_production', 'إنتاج المحاصيل وممارسات الزراعة'),
  ('ref_training_topic', 'livestock_management', 'إدارة الثروة الحيوانية'),
  ('ref_training_topic', 'greenhouse_farming', 'الزراعة في البيوت البلاستيكية'),
  ('ref_training_topic', 'food_processing', 'التصنيع الغذائي والحفظ'),
  ('ref_training_topic', 'food_safety_licensing', 'سلامة الغذاء والترخيص والتغليف'),
  ('ref_training_topic', 'marketing_business', 'التسويق والتسعير وممارسات الأعمال');

do $apply$
declare
  r   record;
  v_n int;
begin
  for r in select * from _0169 loop
    execute format('update public.%I set label_ar = $1 where code = $2 and deleted_at is null', r.tbl)
      using r.label_ar, r.code;
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception '0169: %.% matched % rows, not 1', r.tbl, r.code, v_n;
    end if;
  end loop;
end $apply$;

-- ── verification: no live Sahel Horan option without Arabic ───────────────
do $verify$
declare
  r   record;
  v_n int;
begin
  for r in select distinct tbl from _0169 loop
    execute format($f$select count(*) from public.%I where deleted_at is null and coalesce(label_ar, '') !~ '[ء-ي]'$f$, r.tbl) into v_n;
    if v_n > 0 then
      raise exception '0169: % still has % options without Arabic', r.tbl, v_n;
    end if;
  end loop;
  if (select count(*) from _0169) <> 138 then
    raise exception '0169: expected 138 translations';
  end if;
end $verify$;
