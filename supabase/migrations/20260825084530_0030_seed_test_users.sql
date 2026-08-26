-- 0030 seed_test_users
--
-- BUILD-PHASE ONLY. One test identity per role so Phase 3 access control can be
-- verified by actually signing in, rather than asserted. These are throwaway
-- credentials in a development project; they must be removed by the go-live
-- boundary step in 07_BUILD_CHECKLIST.md before any real participant data
-- exists. They all share one obvious non-production password.
--
-- The participant is linked to an existing demo person so the person <-> auth
-- link (my_person_id()) can be exercised. A SECOND participant is created with
-- NO person row on purpose, so the "signed in but not linked" path has a
-- fixture too -- that case must show a message, not crash.

insert into auth.users
  (id, instance_id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data, raw_app_meta_data)
values
  ('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','coordinator@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Coordinator"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','dataentry@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Data Entry"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','enumerator@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Enumerator"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','viewer@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Partner Viewer"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','producer@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Producer"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb),
  ('a0000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','unlinked@shm.test',
   extensions.crypt('REDACTED-ROTATED-CREDENTIAL', extensions.gen_salt('bf')),
   now(), now(), now(), '{"full_name":"Test Unlinked Producer"}'::jsonb,
   '{"provider":"email","providers":["email"]}'::jsonb);

-- handle_new_user() created each app_user row with the default 'participant'
-- role; promote the four staff roles. Promotion is coordinator-only in the
-- running app, which is why it happens here in a migration.
update public.app_user set role = 'coordinator'    where id = 'a0000000-0000-4000-8000-000000000001';
update public.app_user set role = 'data_entry'     where id = 'a0000000-0000-4000-8000-000000000002';
update public.app_user set role = 'enumerator'     where id = 'a0000000-0000-4000-8000-000000000003';
update public.app_user set role = 'partner_viewer' where id = 'a0000000-0000-4000-8000-000000000004';
-- 000005 and 000006 stay 'participant'.

-- Link only the first producer. 000006 is deliberately left unlinked.
update public.person
set auth_user_id = 'a0000000-0000-4000-8000-000000000005'
where national_id = '300000001';
