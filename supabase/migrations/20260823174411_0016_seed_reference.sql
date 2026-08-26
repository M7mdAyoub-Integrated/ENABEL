-- 0016 seed_reference
-- The source workbook is English-only. Rather than seed fake Arabic, label_ar is
-- made nullable and left null until translations are supplied.
do $outer$
declare r record;
begin
  for r in select c.relname as t from pg_class c
           join pg_namespace ns on ns.oid=c.relnamespace
           where ns.nspname='public' and c.relkind='r' and c.relname like 'ref\_%'
  loop
    execute format('alter table public.%I alter column label_ar drop not null', r.t);
  end loop;
end $outer$;
alter table public.objective alter column name_ar drop not null;
alter table public.activity  alter column name_ar drop not null;

insert into public.ref_product (code,label_en,sort_order) values
 ('fresh_fruits','Fresh fruits',1),('vegetables','Vegetables',2),
 ('dairy','Dairy products',3),('meat_livestock','Meat / livestock products',4),
 ('honey','Honey / bee products',5),('olive_oil','Olive oil / olives',6),
 ('pickled_preserved','Pickled / preserved products',7),
 ('baked_traditional','Baked / traditional food products',8),
 ('jams_processed','Jams / processed foods',9),
 ('herbs_medicinal','Herbs / medicinal plants',10),('handicrafts','Handicrafts',11);

insert into public.ref_producer_type (code,label_en,sort_order,allows_free_text) values
 ('individual_farmer','Individual farmer/producer',1,false),
 ('household_producer','Household producer',2,false),
 ('cooperative','Agricultural cooperative',3,false),
 ('association','Agricultural association',4,false),
 ('food_processing_business','Food-processing business',5,false),
 ('agri_enterprise','Agricultural enterprise',6,false),
 ('handicraft_producer','Handicraft producer',7,false),
 ('womens_group','Women''s group/community group',8,false),
 ('other','Other (specify)',9,true);

insert into public.ref_partner_type_training (code,label_en,sort_order,allows_free_text) values
 ('government','Government institution (national or local)',1,false),
 ('public_training_institute','Public training institute / extension service',2,false),
 ('university','University / academic institution',3,false),
 ('private_sector','Private sector company',4,false),
 ('ngo_cso','Non-governmental organization (NGO) / civil society organization (CSO)',5,false),
 ('international_org','International organization / development partner',6,false),
 ('financial_institution','Financial institution',7,false),
 ('other','Other (please specify)',8,true);

insert into public.ref_partner_role_training (code,label_en,sort_order,allows_free_text) values
 ('training_delivery','Training delivery (provision of training services)',1,false),
 ('curriculum_development','Curriculum development and accreditation',2,false),
 ('funding','Funding / financial support',3,false),
 ('market_linkage_jobs','Market linkage / job placement',4,false),
 ('input_provision','Input provision (e.g., seeds, equipment, technology)',5,false),
 ('community_outreach','Community outreach and participant mobilization',6,false),
 ('technical_advisory','Technical advisory / extension services',7,false),
 ('mel_support','Monitoring, evaluation, and learning (MEL) support',8,false),
 ('logistics','Logistics and operational support (e.g., venues, transport)',9,false),
 ('financial_services','Financial services (e.g., loans, grants to beneficiaries)',10,false),
 ('policy_support','Policy / regulatory support',11,false),
 ('other','Other (please specify)',12,true);

insert into public.ref_partner_type_production (code,label_en,sort_order,allows_free_text) values
 ('government','Government institution (national or local)',1,false),
 ('technical_institution','Technical institution / research centre',2,false),
 ('food_processing_facility','Food processing facility / agro-processing company',3,false),
 ('private_sector','Private sector company (input supplier, trader, agribusiness, etc.)',4,false),
 ('financial_institution','Financial institution',5,false),
 ('ngo_cso','Non-governmental organization (NGO) / civil society organization (CSO)',6,false),
 ('international_org','International organization / development partner',7,false),
 ('university','Universities',8,false),
 ('other','Other (please specify)',9,true);

insert into public.ref_partner_role_production (code,label_en,sort_order,allows_free_text) values
 ('technical_advisory','Technical advisory / extension services to producers',1,false),
 ('input_provision','Input provision (e.g., seeds, fertilizer, equipment, technology)',2,false),
 ('processing_value_addition','Processing / value addition support',3,false),
 ('market_linkage_buyers','Market linkage / buyer connections',4,false),
 ('quality_standards','Quality standards, certification, or food safety support',5,false),
 ('financing_credit','Financing / credit / grants to producers',6,false),
 ('infrastructure_logistics','Infrastructure or logistics support (e.g., storage, transport, cold chain)',7,false),
 ('policy_support','Policy / regulatory support',8,false),
 ('tech_readiness','Tech readiness',9,false),
 ('other','Other (please specify)',10,true);

insert into public.ref_agri_involvement (code,label_en,sort_order) values
 ('farmer_own_land','Farmer (own land)',1),
 ('farmer_rented_land','Farmer (working on rented/shared land)',2),
 ('agri_worker','Agricultural worker (laborer)',3),
 ('agribusiness_owner','Agribusiness owner (e.g., processing, trading)',4),
 ('student','Student (agriculture-related)',5),
 ('not_working_agri','Not currently working in agriculture',6);

insert into public.ref_activity_type (code,label_en,sort_order,allows_free_text) values
 ('crop_production','Crop production',1,false),('livestock','Livestock',2,false),
 ('greenhouse','Greenhouse farming',3,false),('food_processing','Food processing',4,false),
 ('other','Other',5,true);

insert into public.ref_guidance_type (code,label_en,sort_order) values
 ('food_safety','Food safety',1),('licensing','Licensing',2),('packaging','Packaging',3),
 ('labelling','Labelling',4),('pricing','Pricing',5),('marketing','Marketing',6);

insert into public.ref_office_service_type (code,label_en,sort_order,allows_free_text) values
 ('technical_advice','Technical advice',1,false),
 ('input_guidance','Input or equipment guidance',2,false),
 ('licensing_help','Licensing and paperwork help',3,false),
 ('market_info','Market or buyer information',4,false),
 ('referral','Referral to another entity',5,false),
 ('other','Other',6,true);

insert into public.ref_sales_channel (code,label_en,sort_order,allows_free_text) values
 ('not_selling','I am not selling yet',1,false),
 ('neighbours','To neighbours, by word of mouth',2,false),
 ('from_home','From home',3,false),
 ('municipal_market','Municipal rural market or exhibition',4,false),
 ('local_shops','Local shops or retailers',5,false),
 ('wholesaler_trader','Wholesaler or trader',6,false),
 ('food_processing_facility','Food processing facility',7,false),
 ('cooperative_association','Cooperative or association',8,false),
 ('social_media_online','Social media or online',9,false),
 ('outside_governorate','Buyers outside the governorate',10,false),
 ('other','Other',11,true);

insert into public.ref_buyer_type (code,label_en,sort_order,allows_free_text) values
 ('retailer_shop','Retailer or shop',1,false),
 ('wholesaler_trader','Wholesaler or trader',2,false),
 ('food_processing_facility','Food processing facility',3,false),
 ('restaurant_hotel','Restaurant or hotel',4,false),
 ('cooperative','Cooperative',5,false),
 ('institutional_buyer','Institutional buyer (school, hospital, government body)',6,false),
 ('exporter','Exporter',7,false),
 ('online_platform','Online platform',8,false),
 ('other','Other',9,true);

insert into public.ref_safety_item (code,label_en,sort_order) values
 ('health_certificate','Health certificate or food safety approval',1),
 ('licence_registration','Production or home-business licence or registration',2),
 ('hygiene_practices','Improved hygiene practices in the production area',3),
 ('storage_cold_chain','Improved storage or cold-chain handling',4),
 ('packaging','Proper packaging for the product',5),
 ('product_label','Product label showing name, ingredients, weight, production and expiry dates',6),
 ('trade_name_brand','A trade name, brand or logo for my products',7),
 ('costing_pricing','Costing and pricing of the product',8),
 ('online_presence','Social media page or online presence for the product',9);

insert into public.ref_promotional_channel (code,label_en,sort_order) values
 ('digital_platform','Digital platform',1),('local_partnership','Local partnership',2),
 ('community_event','Community event',3),('radio','Radio',4),('print','Print',5);

insert into public.ref_stakeholder_type (code,label_en,sort_order) values
 ('government','Government',1),('technical','Technical',2),('academic','Academic',3),
 ('private_sector','Private sector',4),('community','Community',5),
 ('neighbouring_municipality','Neighbouring municipality',6);

insert into public.ref_nationality (code,label_en,sort_order,allows_free_text) values
 ('jordanian','Jordanian',1,false),('syrian','Syrian',2,false),
 ('palestinian','Palestinian',3,false),('other','Other',4,true);

-- Washington Group short set
insert into public.ref_disability_type (code,label_en,sort_order) values
 ('seeing','Difficulty seeing, even if wearing glasses',1),
 ('hearing','Difficulty hearing, even if using a hearing aid',2),
 ('mobility','Difficulty walking or climbing steps',3),
 ('cognition','Difficulty remembering or concentrating',4),
 ('self_care','Difficulty with self-care, such as washing all over or dressing',5),
 ('communication','Difficulty communicating in usual language',6);

-- PROVISIONAL. The source workbook contains no training-topic list anywhere.
-- These six are inferred from the D0.2 definition and the activity types.
-- The M&E lead must confirm or replace them.
insert into public.ref_training_topic (code,label_en,sort_order,is_food_processing) values
 ('crop_production','Crop production and cultivation practices',1,false),
 ('livestock_management','Livestock management',2,false),
 ('greenhouse_farming','Greenhouse farming',3,false),
 ('food_processing','Food processing and preservation',4,true),
 ('food_safety_licensing','Food safety, licensing and packaging',5,true),
 ('marketing_business','Marketing, pricing and business practices',6,false);
