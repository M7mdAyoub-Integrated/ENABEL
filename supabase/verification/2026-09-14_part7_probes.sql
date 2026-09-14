-- ═══════════════════════════════════════════════════════════════════════════
--  Part 7 verification probes — Ramtha, 14 September 2026
--
--  The statements behind 09_MULTI_MUNICIPALITY.md Part 7. Each block is a
--  transaction that is ROLLED BACK; run one block at a time (the MCP returns
--  the last result set of a multi-statement string). Account ids are the
--  fixtures': coordinator@shm.test a0…01, partner viewer a0…04, participant
--  (producer) a0…05, superadmin@shm.test a0…07, admin@ramtha.test 735b2f87….
--
--  The clean-up at the end is NOT rolled back and is the one sanctioned
--  hard delete (07_BUILD_CHECKLIST.md, "Retire the demo data"): build-phase
--  rows, as the owner, with app.allow_hard_delete on, children before parents.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. what each account sees of every scoped table ───────────────────────
-- Run once as the owner (no role switch) for the truth, then once per account.
-- has_table_privilege keeps a table with no grant from aborting the statement.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
with scoped as (
  select c.relname as t from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attname='municipality_id' and not a.attisdropped
  where n.nspname='public' and c.relkind='r')
select public.my_municipality() as muni, string_agg(t || '=' || n, ' ' order by t) as visible from (
  select t, case when has_table_privilege('public.'||quote_ident(t), 'SELECT')
                 then (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t), false, true, '')))[1]::text
                 else 'NOSELECT' end as n
  from scoped) x;
rollback;

-- The owner's truth, per municipality:
with scoped as (
  select c.table_name as t from information_schema.columns c
  join information_schema.tables tb on tb.table_schema=c.table_schema and tb.table_name=c.table_name and tb.table_type='BASE TABLE'
  where c.table_schema='public' and c.column_name='municipality_id')
select string_agg(t || '=' || total || '/' || shm || '/' || rmth, ' ' order by t) as owner_counts from (
  select t,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t), false, true, '')))[1]::text as total,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I where municipality_id = ''00000000-0000-4000-8000-00000000005a''', t), false, true, '')))[1]::text as shm,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I where municipality_id = ''00000000-0000-4000-8000-0000000000a1''', t), false, true, '')))[1]::text as rmth
  from scoped) x;

-- The super admin with no acting municipality (the column is data, so it is
-- changed inside the transaction and discarded with it):
begin;
update public.app_user set acting_municipality_id = null where id = 'a0000000-0000-4000-8000-000000000007';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000007","role":"authenticated"}', true);
-- … the same scoped count as above …
rollback;

-- ── 2. writes across the boundary: count rows, never catch ────────────────
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
with u1 as (update public.rmth_event set title = title where municipality_id = '00000000-0000-4000-8000-0000000000a1' returning 1),
     u2 as (update public.rmth_threshold set value_numeric = 99 where municipality_id = '00000000-0000-4000-8000-0000000000a1' returning 1),
     u3 as (update public.rmth_training_enrolment set deleted_at = now() where municipality_id = '00000000-0000-4000-8000-0000000000a1' returning 1),
     u4 as (update public.indicator_target set target_value = 5 where municipality_id = '00000000-0000-4000-8000-0000000000a1' returning 1)
select 'shm_coord update ramtha rmth_event' as probe, (select count(*) from u1)::text as result       -- 0
union all select 'shm_coord update ramtha rmth_threshold', (select count(*) from u2)::text            -- 0
union all select 'shm_coord soft-delete ramtha enrolments', (select count(*) from u3)::text           -- 0
union all select 'shm_coord set ramtha targets', (select count(*) from u4)::text                      -- 0
-- allowed, and documented in 09 Part 7: a Sahel-Horan-municipality row in a Ramtha-shaped table
union all select 'shm_coord save_rmth_record -> ', (public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object('event_kind','networking','title','isolation probe','start_date','2026-09-01','end_date','2026-09-01'))))::text;
rollback;

-- An INSERT naming the other municipality outright is refused (42501), from either side:
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"735b2f87-5210-43c7-9186-59a3708d84c5","role":"authenticated"}', true);
create temp table probe_log (line text);
do $$ begin
  insert into public.partner (municipality_id, name) values ('00000000-0000-4000-8000-00000000005a', 'ramtha probe partner');
  insert into probe_log values ('UNEXPECTED: ramtha admin inserted an SHM partner');
exception when insufficient_privilege then insert into probe_log values ('ramtha admin -> SHM partner: refused ' || sqlstate);
end $$;
do $$ begin
  insert into public.rmth_event (municipality_id, event_kind, title, start_date, end_date) values ('00000000-0000-4000-8000-00000000005a', 'networking', 'ramtha probe into shm', '2026-09-01', '2026-09-01');
  insert into probe_log values ('UNEXPECTED: ramtha admin inserted an SHM-municipality rmth_event');
exception when insufficient_privilege then insert into probe_log values ('ramtha admin -> SHM-municipality rmth_event: refused ' || sqlstate);
end $$;
select * from probe_log;
rollback;

-- ── 3. the views, per account ─────────────────────────────────────────────
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"735b2f87-5210-43c7-9186-59a3708d84c5","role":"authenticated"}', true);
select (select count(*) from public.v_indicator_progress) as progress,             -- 234 for Ramtha, 260 for Sahel Horan
       (select count(*) from public.v_indicator_actual) as actual,                 -- 221 / 260
       (select count(*) from public.v_indicator_disaggregated) as disaggregated,   -- 0 / 7
       (select count(*) from public.v_rmth_indicator_status) as status,            -- 18 / 0
       (select count(*) from public.v_rmth_indicator_unique) as unique_rows,       -- 39 / 0
       (select count(*) filter (where has_table_privilege('public.'||relname, 'SELECT')) from pg_class
         where relkind='v' and relnamespace='public'::regnamespace and relname like 'v\_ind\_%') as leaf_views_selectable;  -- 0
rollback;

-- ── 4. the public side, as anon ───────────────────────────────────────────
begin;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select municipality_slug, count(*) from public.v_public_opportunity group by 1;   -- sahel-horan 8, no ramtha row
rollback;

-- ── 5. the counting rules, as the Ramtha admin ────────────────────────────
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"735b2f87-5210-43c7-9186-59a3708d84c5","role":"authenticated"}', true);
create temp table probe_log (step text, result text);
-- needs: thresholds decided (c11 12 weeks / 20 hours, c12 rule written), a live employability
-- cycle f15e07fc… ending in 26/Q3 with person 007b6e3f… enrolled and met_criteria true
insert into public.rmth_training_cycle (id, cycle_kind, title, start_date, end_date, weeks, hours_per_week, joint_development_met, joint_development_met_decided_by, joint_development_met_decided_on)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'employability', 'probe cycle 2', '2026-09-02', '2026-09-20', 3, 25, true, auth.uid(), now()),
       ('aaaaaaaa-0000-4000-8000-000000000002', 'employability', 'probe cycle 3', '2026-09-03', '2026-09-27', 13, 25, true, auth.uid(), now());
-- enrolment_kind is derived from the cycle by trigger; the RPC refuses it as a column
insert into probe_log select 'save enrolment 2 via rpc', (public.save_rmth_record('rmth_training_enrolment', jsonb_build_object('row', jsonb_build_object('cycle_id','aaaaaaaa-0000-4000-8000-000000000001','person_id','007b6e3f-8384-4796-b904-7135efc4f2ad','met_criteria',true))))::text;
insert into probe_log select 'save enrolment 3 via rpc', (public.save_rmth_record('rmth_training_enrolment', jsonb_build_object('row', jsonb_build_object('cycle_id','aaaaaaaa-0000-4000-8000-000000000002','person_id','007b6e3f-8384-4796-b904-7135efc4f2ad','met_criteria',true))))::text;
insert into probe_log select 'counted_under derived (created order)', string_agg(coalesce(left(counted_under_id::text, 8), 'null'), ' ' order by created_at) from public.rmth_training_enrolment where person_id='007b6e3f-8384-4796-b904-7135efc4f2ad' and enrolment_kind='employability' and deleted_at is null;
insert into probe_log select 'C1.2 26/Q3 one person, three cycles (expect 3)', actual::text from public.v_indicator_actual where municipality_id='00000000-0000-4000-8000-0000000000a1' and code='C1.2' and period_code='26/Q3';
insert into probe_log select 'C1.2 unique 26/Q3 (expect 1)', unique_actual::text from public.v_rmth_indicator_unique where code='C1.2' and period_code='26/Q3';
insert into probe_log select 'C1.1 26/Q3 (expect 2: the 13-week cycle fails max 12 weeks)', actual::text from public.v_indicator_actual where municipality_id='00000000-0000-4000-8000-0000000000a1' and code='C1.1' and period_code='26/Q3';
-- A1.2 / A1.3: the networking event ff8a6c8c… and the guidance session f60e4ef4… both live in 26/Q4
update public.rmth_event set solely_guidance = true, solely_guidance_decided_by = auth.uid(), solely_guidance_decided_on = now() where id = 'ff8a6c8c-bdaa-4218-ad33-af84163959bf';
insert into probe_log select 'A1.2/A1.3 after the networking event is marked solely guidance (expect 0 and 1)', string_agg(code || '=' || actual, ' ' order by code) from public.v_indicator_actual where municipality_id='00000000-0000-4000-8000-0000000000a1' and code in ('A1.2','A1.3') and period_code='26/Q4';
update public.rmth_event set solely_guidance = null, solely_guidance_decided_by = null, solely_guidance_decided_on = null where id = 'ff8a6c8c-bdaa-4218-ad33-af84163959bf';
insert into probe_log select 'A1.2 with the decision undecided (expect 0)', actual::text from public.v_indicator_actual where municipality_id='00000000-0000-4000-8000-0000000000a1' and code='A1.2' and period_code='26/Q4';
-- E0.2: the same person admitted to a second incubator
insert into public.rmth_incubator (id, name, field_id) values ('bbbbbbbb-0000-4000-8000-000000000001', 'probe incubator 2', (select field_id from public.rmth_incubator where id='2f57ee35-d4b3-4a6b-8635-f1688a61c3d4'));
insert into public.rmth_incubation_service (incubator_id, person_id, admitted_on) values ('bbbbbbbb-0000-4000-8000-000000000001', 'ce8359b2-8bcd-4ff2-bce1-56045581afa6', '2026-09-01');
insert into probe_log select 'E0.2 26/Q3 with one person in two incubators (expect 1)', actual::text from public.v_indicator_actual where municipality_id='00000000-0000-4000-8000-0000000000a1' and code='E0.2' and period_code='26/Q3';
select * from probe_log;
rollback;

-- ── 6. a participant reads only their own rows (05 §17) ───────────────────
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select public.my_person_id() as my_person,
       (select count(*) from public.linkage_request) as linkage_requests_visible,
       (select count(*) from public.linkage_request where person_id = public.my_person_id()) as of_which_own,
       (select count(*) from public.exhibition_registration) as registrations_visible,
       (select count(*) from public.person) as persons_visible,
       (select count(*) from public.rmth_outcome_survey) as rmth_surveys_visible,
       (select count(*) from public.v_indicator_progress) as progress_rows_visible;
rollback;

-- ── 7. clean-up (COMMITTED): the sanctioned hard delete of build-phase rows ─
begin;
select set_config('app.allow_hard_delete', 'on', true);
delete from public.rmth_event_option;  delete from public.rmth_proposal_option;  delete from public.rmth_training_programme_option;
delete from public.rmth_training_cycle_option;  delete from public.rmth_training_enrolment_option;  delete from public.rmth_project_implementer_option;
delete from public.rmth_incubator_option;  delete from public.rmth_incubation_service_option;  delete from public.rmth_outcome_survey_option;
delete from public.rmth_implementer_support;  delete from public.rmth_incubator_service_live;
delete from public.rmth_project_implementer_proposal;  delete from public.rmth_training_programme_proposal;
delete from public.rmth_outcome_survey;  delete from public.rmth_incubation_service;  delete from public.rmth_training_enrolment;
delete from public.rmth_training_cycle;  delete from public.rmth_training_programme;  delete from public.rmth_proposal;
delete from public.rmth_project_implementer;  delete from public.rmth_incubator;  delete from public.rmth_enterprise;  delete from public.rmth_event;
delete from public.rmth_reference_counter;
delete from public.person where national_id in ('399000101','399000102','399000103','399000104');
update public.rmth_threshold set value_numeric = null, value_text = null, value_bool = null, decided_on = null, decided_by = null;
commit;

-- ── 8. back at the baselines ──────────────────────────────────────────────
with shm as (select id from public.municipality where code = 'SHM')
select 'matrix' as what, md5(string_agg(line, E'\n' order by code)) as md5 from (          -- 7d18cdd01205c209ab1f5f3f6e2c169a
  select code, code || ' | ' || string_agg(coalesce(actual::text,'∅')
         || case when denominator is not null then '/'||denominator::text else '' end,
         ' | ' order by period_code) as line
  from public.v_indicator_actual where municipality_id = (select id from shm) group by code) s
union all
select 'progress_original_projection', md5(string_agg(t::text, E'\n' order by t::text)) from (   -- d60f7357f8cea0f70a5f9c3182b490b6
  select code, name_en, name_ar, unit, definition, indicator_type, sort_order, objective_code, objective_name_en, objective_name_ar, objective_sort,
         period_code, start_date, end_date, target, actual, denominator, progress_pct, status, is_disaggregable, is_manual
    from public.v_indicator_progress where municipality_id = (select id from shm)) t
union all
select 'disaggregated_original_projection', md5(string_agg(t::text, E'\n' order by t::text)) from (  -- 5b35f60334e9c139742d39b5ccb2af1e
  select code, period_code, sex, age_band, refugee_status, disability_status, village, value from public.v_indicator_disaggregated where municipality_id = (select id from shm)) t;
