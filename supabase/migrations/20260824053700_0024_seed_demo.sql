-- 0024 seed_demo  (this is the plan's optional "0017 seed_demo.sql" step)
--
-- BUILD-PHASE DATA ONLY. Exclude or remove before go-live; see the audit-log
-- boundary step in 07_BUILD_CHECKLIST.md final acceptance.
--
-- The two auth.users rows are role fixtures with no usable password. They exist
-- so the coordinator approval path can be exercised under a real JWT instead of
-- being bypassed, which is the only way test 8 actually proves anything.

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data)
values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','coordinator@demo.local','',
   now(), now(), now(), '{"full_name":"Demo Coordinator"}'::jsonb, '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','dataentry@demo.local','',
   now(), now(), now(), '{"full_name":"Demo Data Entry"}'::jsonb, '{}'::jsonb);

update public.app_user set role = 'coordinator'
  where id = '11111111-1111-1111-1111-111111111111';
update public.app_user set role = 'data_entry'
  where id = '22222222-2222-2222-2222-222222222222';

-- four participants, spread across the disaggregation dimensions
insert into public.person (national_id, full_name, sex, date_of_birth, is_refugee, has_disability, village)
values ('300000001','Demo Person One',   'female','1999-04-12', true,  false, 'Al Turra'),
       ('300000002','Demo Person Two',   'male',  '1988-09-30', false, true,  'Al Shajara'),
       ('300000003','Demo Person Three', 'female','1971-01-20', false, false, 'Amrawa'),
       ('300000004','Demo Person Four',  'male',  '2003-06-05', true,  null,  'Al Thnaibeh');

insert into public.partner (name, unit) values
  ('Demo University','Faculty of Agriculture'),
  ('Demo Agro Processing', null);

insert into public.partnership (partner_id, partnership_type, partner_type_id, established_on)
select p.id, 'training', r.id, '2026-07-15'::date
from public.partner p, public.ref_partner_type_training r
where p.name='Demo University' and r.code='university';

insert into public.partnership (partner_id, partnership_type, partner_type_id, established_on)
select p.id, 'production_support', r.id, '2026-07-20'::date
from public.partner p, public.ref_partner_type_production r
where p.name='Demo Agro Processing' and r.code='technical_institution';

-- three delivered sessions; two of them food-processing so D0.2 = 2
insert into public.training_session (title, topic_id, start_date, end_date, is_delivered)
select 'Food Processing I',  id,'2026-07-20'::date,'2026-07-22'::date, true
  from public.ref_training_topic where code='food_processing'
union all
select 'Food Safety Basics', id,'2026-08-03'::date,'2026-08-05'::date, true
  from public.ref_training_topic where code='food_safety_licensing'
union all
select 'Crop Practices',     id,'2026-08-10'::date,'2026-08-12'::date, true
  from public.ref_training_topic where code='crop_production';

-- Person One attends ALL THREE. Persons Two and Three attend one each.
-- A1.3 must therefore be 3 distinct people, not 5 enrolments.
insert into public.training_enrolment (person_id, session_id, attended, met_criteria, decided_on)
select p.id, s.id, true, true, '2026-08-15'::date
from public.person p join public.training_session s on true
where p.national_id = '300000001';

insert into public.training_enrolment (person_id, session_id, attended, met_criteria, decided_on)
select p.id, s.id, true, true, '2026-08-15'::date
from public.person p join public.training_session s on s.title='Food Processing I'
where p.national_id = '300000002';

insert into public.training_enrolment (person_id, session_id, attended, met_criteria, decided_on)
select p.id, s.id, true, true, '2026-08-15'::date
from public.person p join public.training_session s on s.title='Crop Practices'
where p.national_id = '300000003';

insert into public.office_service (person_id, service_type_id, service_date)
select p.id, r.id, '2026-08-18'::date
from public.person p, public.ref_office_service_type r
where p.national_id='300000001' and r.code='technical_advice';

insert into public.guidance_record (person_id, guidance_type_id, guidance_date)
select p.id, r.id, '2026-08-19'::date
from public.person p, public.ref_guidance_type r
where p.national_id in ('300000002','300000003') and r.code='food_safety';

-- one finished event (feeds E0.1), one still open (accepts registrations)
insert into public.exhibition (name,start_date,end_date,location,booth_capacity) values
  ('Demo Summer Market','2026-08-01','2026-08-05','Al Turra',12),
  ('Demo Autumn Market','2026-09-01','2026-09-20','Amrawa',12);

-- registrations land as 'submitted'. E0.2 must NOT count them yet.
insert into public.exhibition_registration
  (exhibition_id, person_id, producer_type_id, is_first_time, status, submitted_by_participant)
select e.id, p.id, r.id, null, 'submitted', true
from public.exhibition e, public.person p, public.ref_producer_type r
where e.name='Demo Autumn Market'
  and p.national_id in ('300000001','300000002')
  and r.code='individual_farmer';

-- meeting attendance auto-writes a partner_contribution, which feeds G0.4
insert into public.coordination_meeting (meeting_date,subject)
values ('2026-08-20','Demo quarterly coordination');
insert into public.coordination_meeting_partner (meeting_id, partnership_id)
select m.id, pa.id
from public.coordination_meeting m, public.partnership pa
where m.subject='Demo quarterly coordination' and pa.partnership_type='training';

-- initiative + active linkage feeds C1.2; mentorship feeds C1.3
insert into public.production_initiative (person_id, title, activity_type_id, started_on, status)
select p.id, 'Demo home preserves', r.id, '2026-07-25'::date, 'operating'
from public.person p, public.ref_activity_type r
where p.national_id='300000001' and r.code='food_processing';

insert into public.market_linkage (initiative_id, partnership_id, scope, linked_on, status)
select i.id, pa.id, 'Supply preserves to processor', '2026-08-14'::date, 'active'
from public.production_initiative i, public.partnership pa
where i.title='Demo home preserves' and pa.partnership_type='production_support';

insert into public.mentorship_session (initiative_id, session_date, topic)
select i.id, d.dt, 'Costing and pricing'
from public.production_initiative i,
     (values ('2026-08-05'::date),('2026-08-19'::date)) as d(dt)
where i.title='Demo home preserves';

insert into public.promotional_action (title, channel_id, action_date)
select v.t, r.id, v.d
from (values ('Demo market announcement','2026-08-06'::date),
             ('Demo producer feature','2026-08-21'::date)) as v(t,d),
     public.ref_promotional_channel r
where r.code='digital_platform';

insert into public.case_study (title, person_id, documented_on, summary, change_evidenced)
select 'Demo preserves case study', p.id, '2026-08-22'::date,
       'Household preserves activity scaled after training and linkage.',
       'Moved from home sales to a processor supply arrangement.'
from public.person p where p.national_id='300000001';
