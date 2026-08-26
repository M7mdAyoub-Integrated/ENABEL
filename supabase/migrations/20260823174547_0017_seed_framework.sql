-- 0017 seed_framework
insert into public.objective (code,name_en,result_statement_en,sort_order) values
 ('IMPACT','Impact','Social and economic participation in Sahel Horan Municipality increases, contributing over time to improved household livelihoods, stronger social cohesion, and greater use of the area''s agricultural potential.',0),
 ('SO1','Specific Objective 1: Developing Agricultural Technical Skills and Capacity Building','Target groups have improved access to practical agricultural knowledge and technical support',1),
 ('SO2','Specific Objective 2: Supporting Agricultural Production and Local Food Production','Target groups and local producers are better able to engage in feasible agricultural and food production activities',2),
 ('SO3','Specific Objective 3: Developing Local Marketing and Rural Markets','Local producers have increased access to markets and commercial opportunities',3),
 ('SO4','Specific Objective 4: Strengthening Municipal Planning, Partnerships and Institutional Coordination','The Municipality has a functioning coordination role that connects residents and producers with relevant programmes, services and partners',4);

insert into public.activity (objective_id,code,name_en,sort_order)
select o.id, v.code, v.name_en, v.sort_order
from (values
 ('SO1','A','Developing Technical Partnerships for Applied Agricultural Training',1),
 ('SO1','B','Establishing a Technical Coordination Office to Support Local Agriculture',2),
 ('SO2','C','Supporting Small-Scale and Family-Based Agricultural Initiatives Linked to Market Opportunity',3),
 ('SO2','D','Promoting Home-Based and Rural Food Processing Projects',4),
 ('SO3','E','Organising Open Rural Markets and Seasonal Exhibitions for Agricultural and Food Products',5),
 ('SO3','F','Supporting Promotion and Marketing of Local Products',6),
 ('SO4','G','Activating the Municipality''s Role as a Platform for Planning, Organisation and Coordination for Agriculture and Food Production',7)
) as v(obj,code,name_en,sort_order)
join public.objective o on o.code = v.obj;

insert into public.indicator
 (code,objective_id,activity_id,name_en,indicator_type,unit,definition,formula,
  data_source,view_name,baseline,final_target,disaggregation,sort_order)
select v.code, o.id, a.id, v.name_en, v.itype, v.unit, v.definition, v.formula,
       v.data_source, v.view_name, 0, v.final_target, v.disagg, v.sort_order
from (values
 ('IMP-0','IMPACT',null,'Percentage of supported participants who remain engaged in an economic activity 12 months after receiving support','impact','%',
  'Percentage of supported participants who remain engaged in an agricultural, food production, food processing, or related income-generating activity 12 months after first receiving support.',
  'Eligible participants remaining engaged at 12 months / eligible participants assessed at 12 months x 100',
  'followup_survey','v_ind_imp_0',70::numeric,array['sex','age','refugee_status','disability','support_type'],1),
 ('A1','SO1','A','Percentage of training participants who report applying knowledge gained','intermediate','%',
  'Percentage of training participants who report using at least one skill or practice gained through the training within six months of completion.',
  'Participants reporting application / participants followed up x 100',
  'followup_survey','v_ind_a1',60,array['sex','age','refugee_status','disability','training_topic'],2),
 ('A1.2','SO1','A','Number of technical partnerships established or activated for agricultural training and technical support','output','#',
  'Number of documented partnerships through which academic, technical, government or national initiative partners provide training, technical advice or related support under the Action Plan.',
  'Count of training partnerships established in the period and active',
  'partnership','v_ind_a1_2',4,array['partner_type'],3),
 ('A1.3','SO1','A','Number of unique participants completing at least one agricultural or food production training programme','output','#',
  'Number of unique participants meeting the completion criteria.',
  'Count of distinct persons meeting completion criteria, credited to the period of their first qualifying completion',
  'training_enrolment','v_ind_a1_3',120,array['sex','age','refugee_status','disability','training_topic'],4),
 ('B1','SO1','B','Percentage of farmers and productive households who report benefit from the technical coordination office','intermediate','%',
  'Of survey respondents who used the office, the percentage reporting the advice was useful in practice.',
  'Respondents rating advice very or somewhat useful / respondents who used the office x 100',
  'followup_survey','v_ind_b1',70,array['sex','age','refugee_status','disability'],5),
 ('B1.1','SO1','B','Technical agricultural coordination office established and operational','milestone','#',
  'A municipal venue or agreed partner facility provides scheduled agricultural advisory and technical services under a defined pilot arrangement, with a published service schedule and at least one session delivered.',
  'Achieved / not achieved','milestone','v_ind_b1_1',1,null,6),
 ('B1.2','SO1','B','Number of farmers and productive households reaching technical office services','output','#',
  'Number of unique farmers and productive households receiving at least one advisory or technical service through the office.',
  'Count of distinct persons in the office service log, credited to the period of first service',
  'office_service','v_ind_b1_2',100,array['sex','age','refugee_status','user_type'],7),
 ('C1','SO2','C','Percentage of supported production activities still operating six months after support','intermediate','%',
  'Percentage of supported production activities that remain active six months after receiving support.',
  'Active activities at six months / activities reaching six months x 100',
  'followup_survey','v_ind_c1',70,array['activity_type','product','lead_group'],8),
 ('C1.1','SO2','C','Number of production-support partnerships established or activated','output','#',
  'Number of documented partnerships through which technical institutions, government entities, food processing facilities or private sector actors provide technical or commercial support to local producers.',
  'Count of production-support partnerships established in the period and active',
  'partnership','v_ind_c1_1',3,array['partner_type'],9),
 ('C1.2','SO2','C','Number of pilot agricultural initiatives launched and connected to wider market opportunity','output','#',
  'Number of individual or group production initiatives that receive documented municipal facilitation and technical support and have started production or processing.',
  'Count of distinct initiatives with at least one active or ended market linkage, credited to the period of first linkage',
  'market_linkage','v_ind_c1_2',6,array['activity_type','product','women_led','youth_led','refugee_participation'],10),
 ('C1.3','SO2','C','Number of advisory mentorship sessions provided to the selected initiatives','output','#',
  'Count of mentorship sessions delivered against supported initiatives.',
  'Count of mentorship sessions in the period',
  'mentorship_session','v_ind_c1_3',null,null,11),
 ('D0.1','SO2','D','Number of home-based and rural producers receiving guidance on food safety, licensing, packaging and related requirements','output','#',
  'Number of unique producers receiving municipal or partner guidance on requirements relevant to home-based and rural food production.',
  'Count of distinct persons in the guidance log, credited to the period of first guidance',
  'guidance_record','v_ind_d0_1',40,array['sex','age','refugee_status','disability','guidance_type'],12),
 ('D0.2','SO2','D','Number of training sessions delivered on food processing and related production requirements','output','#',
  'Number of training sessions delivered on food safety, food processing, packaging, pricing and marketing for home-based and rural producers.',
  'Count of delivered sessions whose topic is flagged as food processing',
  'training_session','v_ind_d0_2',8,array['topic'],13),
 ('E0.1','SO3','E','Number of rural markets and seasonal exhibitions organised or co-organised by the Municipality','output','#',
  'Number of documented rural markets, seasonal exhibitions or similar events organised or co-organised by the Municipality.',
  'Count of documented events that have ended and were not cancelled',
  'exhibition','v_ind_e0_1',12,array['event_type','location'],14),
 ('E0.2','SO3','E','Number of unique local producers participating in supported markets and exhibitions','output','#',
  'Number of unique local producers participating in at least one market, exhibition or promotional platform supported by the Municipality.',
  'Count of distinct persons with an approved registration, credited to the period of their first event',
  'exhibition_registration','v_ind_e0_2',150,array['sex','age','refugee_status','disability','producer_type'],15),
 ('F0.1','SO3','F','Number of promotional actions disseminated through the Municipality''s official channels','output','#',
  'Number of documented promotional activities delivered through municipal communication channels, community events or product promotion days.',
  'Count of documented promotional actions in the period',
  'promotional_action','v_ind_f0_1',12,array['action_type','channel'],16),
 ('G0.1','SO4','G','Local agriculture and food production coordination committee established','milestone','#',
  'A committee is formally established with defined membership and responsibilities and holds regular documented meetings.',
  'Achieved / not achieved','milestone','v_ind_g0_1',1,array['stakeholder_type'],17),
 ('G0.2','SO4','G','Number of coordination meetings held with relevant partners','output','#',
  'Number of documented meetings convened by the Municipality with government, technical, academic, private sector, community and neighbouring municipal partners.',
  'Count of documented meetings in the period',
  'coordination_meeting','v_ind_g0_2',14,array['partner_type'],18),
 ('G0.3','SO4','G','Number of case studies that demonstrate positive change emerging from municipality activities','output','#',
  'CONFLICT: the workbook name says case studies, but its definition, method and formula all describe documented referrals. This schema follows the name. Confirm with the M&E lead.',
  'Count of case studies documented in the period',
  'case_study','v_ind_g0_3',4,null,19),
 ('G0.4','SO4','G','Number of active partnerships contributing to Action Plan activities','output','#',
  'Number of partners that have contributed to at least one documented activity, service, referral, training, market opportunity or other agreed contribution during the reporting period.',
  'Count of distinct partners with at least one contribution in the period',
  'partner_contribution','v_ind_g0_4',6,array['partner_type'],20)
) as v(code,obj,act,name_en,itype,unit,definition,formula,data_source,view_name,final_target,disagg,sort_order)
join public.objective o on o.code = v.obj
left join public.activity a on a.code = v.act;

-- the plan runs 1 August 2026 to 1 September 2029
insert into public.reporting_period (code,start_date,end_date) values
 ('26/Q3','2026-07-01','2026-09-30'),('26/Q4','2026-10-01','2026-12-31'),
 ('27/Q1','2027-01-01','2027-03-31'),('27/Q2','2027-04-01','2027-06-30'),
 ('27/Q3','2027-07-01','2027-09-30'),('27/Q4','2027-10-01','2027-12-31'),
 ('28/Q1','2028-01-01','2028-03-31'),('28/Q2','2028-04-01','2028-06-30'),
 ('28/Q3','2028-07-01','2028-09-30'),('28/Q4','2028-10-01','2028-12-31'),
 ('29/Q1','2029-01-01','2029-03-31'),('29/Q2','2029-04-01','2029-06-30'),
 ('29/Q3','2029-07-01','2029-09-30');

-- a row for every indicator in every period, so the dashboard always finds one;
-- target_value stays null where the workbook set no target
insert into public.indicator_target (indicator_id, period_id, target_value)
select i.id, rp.id, null
from public.indicator i cross join public.reporting_period rp;

update public.indicator_target t
set target_value = v.val
from (values
 ('IMP-0','28/Q4',70),
 ('A1','27/Q4',60),('A1','28/Q4',60),
 ('A1.2','27/Q1',0),('A1.2','27/Q2',2),('A1.2','27/Q3',0),('A1.2','27/Q4',0),
 ('A1.2','28/Q1',0),('A1.2','28/Q2',2),('A1.2','28/Q3',0),('A1.2','28/Q4',0),
 ('A1.3','27/Q1',15),('A1.3','27/Q2',15),('A1.3','27/Q3',15),('A1.3','27/Q4',15),
 ('A1.3','28/Q1',15),('A1.3','28/Q2',15),('A1.3','28/Q3',15),('A1.3','28/Q4',15),
 ('B1','27/Q4',70),('B1','28/Q4',70),
 ('B1.1','27/Q1',0),('B1.1','27/Q2',1),('B1.1','27/Q3',0),('B1.1','27/Q4',0),
 ('B1.1','28/Q1',0),('B1.1','28/Q2',0),('B1.1','28/Q3',0),('B1.1','28/Q4',0),
 ('B1.2','27/Q1',0),('B1.2','27/Q2',10),('B1.2','27/Q3',20),('B1.2','27/Q4',20),
 ('B1.2','28/Q1',20),('B1.2','28/Q2',10),('B1.2','28/Q3',10),('B1.2','28/Q4',10),
 ('C1','27/Q4',70),('C1','28/Q4',70),
 ('C1.1','27/Q1',0),('C1.1','27/Q2',0),('C1.1','27/Q3',0),('C1.1','27/Q4',0),
 ('C1.1','28/Q1',3),('C1.1','28/Q2',0),('C1.1','28/Q3',0),('C1.1','28/Q4',0),
 ('C1.2','27/Q1',0),('C1.2','27/Q2',0),('C1.2','27/Q3',0),('C1.2','27/Q4',3),
 ('C1.2','28/Q1',0),('C1.2','28/Q2',0),('C1.2','28/Q3',0),('C1.2','28/Q4',3),
 ('D0.1','27/Q1',5),('D0.1','27/Q2',5),('D0.1','27/Q3',5),('D0.1','27/Q4',5),
 ('D0.1','28/Q1',5),('D0.1','28/Q2',5),('D0.1','28/Q3',5),('D0.1','28/Q4',5),
 ('D0.2','27/Q1',1),('D0.2','27/Q2',1),('D0.2','27/Q3',1),('D0.2','27/Q4',1),
 ('D0.2','28/Q1',1),('D0.2','28/Q2',1),('D0.2','28/Q3',1),('D0.2','28/Q4',1),
 ('E0.1','27/Q1',0),('E0.1','27/Q2',2),('E0.1','27/Q3',2),('E0.1','27/Q4',2),
 ('E0.1','28/Q1',2),('E0.1','28/Q2',2),('E0.1','28/Q3',2),('E0.1','28/Q4',0),
 ('E0.2','27/Q2',25),('E0.2','27/Q3',25),('E0.2','27/Q4',25),
 ('E0.2','28/Q1',25),('E0.2','28/Q2',25),('E0.2','28/Q3',25),
 ('F0.1','27/Q1',0),('F0.1','27/Q2',1),('F0.1','27/Q3',2),('F0.1','27/Q4',2),
 ('F0.1','28/Q1',1),('F0.1','28/Q2',2),('F0.1','28/Q3',2),('F0.1','28/Q4',2),
 ('G0.1','27/Q1',0),('G0.1','27/Q2',1),('G0.1','27/Q3',0),('G0.1','27/Q4',0),
 ('G0.1','28/Q1',0),('G0.1','28/Q2',0),('G0.1','28/Q3',0),('G0.1','28/Q4',0),
 ('G0.2','27/Q1',0),('G0.2','27/Q2',2),('G0.2','27/Q3',2),('G0.2','27/Q4',2),
 ('G0.2','28/Q1',2),('G0.2','28/Q2',2),('G0.2','28/Q3',2),('G0.2','28/Q4',2),
 ('G0.3','27/Q1',0),('G0.3','27/Q2',0),('G0.3','27/Q3',0),('G0.3','27/Q4',2),
 ('G0.3','28/Q1',0),('G0.3','28/Q2',0),('G0.3','28/Q3',0),('G0.3','28/Q4',2),
 ('G0.4','27/Q1',0),('G0.4','27/Q2',0),('G0.4','27/Q3',0),('G0.4','27/Q4',3),
 ('G0.4','28/Q1',0),('G0.4','28/Q2',0),('G0.4','28/Q3',0),('G0.4','28/Q4',3)
) as v(icode,pcode,val)
where t.indicator_id = (select id from public.indicator where code = v.icode)
  and t.period_id    = (select id from public.reporting_period where code = v.pcode);

insert into public.milestone (code,name,is_achieved) values
 ('B1.1','Technical agricultural coordination office established and operational',false),
 ('G0.1','Local agriculture and food production coordination committee established',false);
