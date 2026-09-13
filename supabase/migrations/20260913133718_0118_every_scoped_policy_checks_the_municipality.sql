-- ═══════════════════════════════════════════════════════════════════════════
--  0118 — every policy on a scoped table checks the municipality,
--         USING and WITH CHECK both, walked from the catalogue
--
--  ── WHAT THIS DOES (plan §2.4) ──
--
--  Every policy in `public` is dropped and recreated from its own catalogue
--  expression, with three changes applied by text:
--
--  1. Role literals become the helpers 0117 taught about super_admin:
--
--        ("current_role"() = 'coordinator'::app_role_t)              → public.is_coordinator()
--        ("current_role"() = ANY (ARRAY['coordinator', 'data_entry'])) → public.can_write()
--        ("current_role"() = ANY (ARRAY['coordinator', 'enumerator'])) → the same list plus 'super_admin'
--
--     `is_staff()` already appears as a call and already admits super_admin.
--     This is the `can_write()` doc drift from 05 §15 closed as a side effect.
--
--  2. On the 35 scoped tables, `public.can_see_municipality(municipality_id)`
--     is ANDed onto USING and onto WITH CHECK. Both, deliberately: a USING-only
--     change would let an admin WRITE a row into the other municipality —
--     the `fu_update` shape 05 §7 records. An UPDATE policy written with
--     USING alone applies USING to the new row too, so those are covered.
--
--     Three policies carry an own-row branch for a participant, whose
--     account has no municipality (0117). Those are rewritten by hand so the
--     municipality test sits on the STAFF branch only:
--
--        exhibition_registration.er_select   own row OR (staff AND municipality)
--        exhibition_registration.er_insert   (staff AND municipality) OR own submission
--        linkage_request.op_read_self        own row, unchanged
--
--  3. Every policy is `to authenticated`. Ten were `to public` (OQ-35) —
--     the three tables from the 0034–0049 stretch. Closed here.
--
--  Then, by hand:
--
--    app_user     own row; a coordinator reads and edits the accounts of
--                 their own municipality; a super admin reads and edits all.
--                 guard_app_user (0117) decides what an edit may do.
--    audit_log    a coordinator reads rows about their municipality and rows
--                 about shared tables (municipality_id null); a super admin
--                 not switched in reads all.
--
--  The three exposed indicator views gain the municipality gate in their
--  WHERE, next to the role gate they already had — they are security
--  definer, so RLS on the tables beneath them does nothing for them.
--  `v_opportunity` and `v_recent_activity` (security invoker, so RLS already
--  scopes them) gain `municipality_id` as a last column so the application
--  can show it.
--
--  `indicator_figures` and `overview_counts` are security definer and read
--  Sahel Horan's tables directly; each gains `p_municipality_id` (default:
--  the caller's) and a gate, and is refused when the caller can see no single
--  municipality. Neither is called by the application; both were exposed to
--  `authenticated`, so they had to be closed rather than left to return two
--  municipalities' figures in one list. `review_followup` looked its period
--  up by date alone (`limit 1`), which from Part 6 could name the other
--  municipality's period row; it now says whose.
--
--  ── VERIFIED AS THE THREE ACCOUNTS, NOT AS THE OWNER (plan §2.6) ──
--
--  There is no Ramtha admin and no super admin yet — Part 2.5 creates them
--  through the Auth admin API. So the verification block creates BOTH inside
--  a savepoint, as auth rows that `handle_new_user` turns into app_user rows
--  from app metadata (which exercises 0117's trigger too), runs the whole
--  isolation test through RLS with `set local role authenticated` and the
--  claims set, and then discards the savepoint. Every scoped table, not a
--  sample:
--
--    Sahel Horan admin   sees every Sahel Horan row and zero Ramtha rows
--    Ramtha admin        the mirror
--    super admin         both; switched into Sahel Horan, only Sahel Horan
--    Sahel Horan admin   CANNOT write a row carrying Ramtha's id (42501)
--    Ramtha admin        CANNOT write a row carrying Sahel Horan's id
--
--  A row is written by the Ramtha admin during the probe to give "the mirror"
--  something to read; it vanishes with the savepoint.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the walk ──────────────────────────────────────────────────────────

do $rls$
declare
  r record;
  v_qual text;
  v_wc   text;
  v_cmd  text;
  v_sql  text;
  c_scoped constant text[] := array[
    'objective', 'activity', 'indicator', 'indicator_target',
    'indicator_snapshot', 'reporting_period',
    'training_session', 'training_enrolment', 'advisory_session',
    'advisory_enrolment', 'exhibition', 'exhibition_registration',
    'office_service', 'guidance_record', 'production_initiative',
    'mentorship_session', 'market_linkage', 'linkage_request',
    'coordination_meeting', 'case_study', 'promotional_action', 'milestone',
    'followup_survey', 'partner', 'partnership', 'partner_contribution',
    'partnership_role', 'coordination_meeting_partner',
    'exhibition_registration_product', 'followup_answer',
    'followup_answer_option', 'followup_safety_item',
    'followup_buyer_connection', 'attachment'];
  c_see constant text := 'public.can_see_municipality(municipality_id)';
begin
  -- Materialised first: the loop creates policies, and a cursor over
  -- pg_policy would see the ones it had just made.
  create temp table pol_0118 as
    select c.relname as tbl, p.polname, p.polcmd, p.polpermissive,
           pg_get_expr(p.polqual, p.polrelid)      as qual,
           pg_get_expr(p.polwithcheck, p.polrelid) as wc
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public';

  for r in select * from pol_0118 order by tbl, polname loop
    v_qual := r.qual;
    v_wc   := r.wc;

    -- 1. helpers instead of literals
    v_qual := replace(v_qual, '("current_role"() = ''coordinator''::app_role_t)', 'public.is_coordinator()');
    v_wc   := replace(v_wc,   '("current_role"() = ''coordinator''::app_role_t)', 'public.is_coordinator()');
    v_qual := replace(v_qual, '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''data_entry''::app_role_t]))', 'public.can_write()');
    v_wc   := replace(v_wc,   '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''data_entry''::app_role_t]))', 'public.can_write()');
    v_qual := replace(v_qual, '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''enumerator''::app_role_t]))',
                              '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''enumerator''::app_role_t, ''super_admin''::app_role_t]))');
    v_wc   := replace(v_wc,   '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''enumerator''::app_role_t]))',
                              '("current_role"() = ANY (ARRAY[''coordinator''::app_role_t, ''enumerator''::app_role_t, ''super_admin''::app_role_t]))');

    -- 2. the municipality, on scoped tables
    if r.tbl = any (c_scoped) then
      if r.tbl = 'exhibition_registration' and r.polname = 'er_select' then
        v_qual := '((person_id = my_person_id()) OR (is_staff() AND ' || c_see || '))';
      elsif r.tbl = 'exhibition_registration' and r.polname = 'er_insert' then
        v_wc := '((public.can_write() AND ' || c_see || ') OR ((person_id = my_person_id()) '
             || 'AND (status = ''submitted''::record_status_t) AND (submitted_by_participant = true)))';
      elsif r.tbl = 'linkage_request' and r.polname = 'op_read_self' then
        null;  -- own row only; a participant has no municipality
      else
        if v_qual is not null then v_qual := '(' || v_qual || ') AND ' || c_see; end if;
        if v_wc   is not null then v_wc   := '(' || v_wc   || ') AND ' || c_see; end if;
      end if;
    end if;

    v_cmd := case r.polcmd when 'r' then 'select' when 'a' then 'insert'
                           when 'w' then 'update' when 'd' then 'delete' else 'all' end;

    execute format('drop policy %I on public.%I', r.polname, r.tbl);
    v_sql := format('create policy %I on public.%I as %s for %s to authenticated',
                    r.polname, r.tbl,
                    case when r.polpermissive then 'permissive' else 'restrictive' end,
                    v_cmd);
    if v_qual is not null then v_sql := v_sql || ' using (' || v_qual || ')'; end if;
    if v_wc   is not null then v_sql := v_sql || ' with check (' || v_wc || ')'; end if;
    execute v_sql;
  end loop;

  drop table pol_0118;
end $rls$;

-- ── 2. app_user and audit_log, by hand ───────────────────────────────────

drop policy au_read   on public.app_user;
drop policy au_insert on public.app_user;
drop policy au_update on public.app_user;

create policy au_read on public.app_user
  for select to authenticated
  using (id = (select auth.uid())
         or public.is_super_admin()
         or (public.is_coordinator() and municipality_id = public.my_municipality()));

create policy au_insert on public.app_user
  for insert to authenticated
  with check (public.is_super_admin()
              or (public.is_coordinator() and municipality_id = public.my_municipality()
                  and role <> 'super_admin'));

create policy au_update on public.app_user
  for update to authenticated
  using (public.is_super_admin()
         or (public.is_coordinator() and municipality_id = public.my_municipality()))
  with check (public.is_super_admin()
              or (public.is_coordinator() and municipality_id = public.my_municipality()));

drop policy audit_read on public.audit_log;
create policy audit_read on public.audit_log
  for select to authenticated
  using (public.is_coordinator()
         and (municipality_id is null or public.can_see_municipality(municipality_id)));

-- ── 3. the three exposed views gain the municipality gate ────────────────

create or replace view public.v_indicator_actual as
select x.code, x.period_code, x.actual, x.denominator, x.municipality_id
  from (
    select 'IMP-0'::text as code, period_code, actual, denominator, municipality_id from public.v_ind_imp_0
    union all select 'A1',   period_code, actual, denominator, municipality_id from public.v_ind_a1
    union all select 'A1.2', period_code, actual, denominator, municipality_id from public.v_ind_a1_2
    union all select 'A1.3', period_code, actual, denominator, municipality_id from public.v_ind_a1_3
    union all select 'B1',   period_code, actual, denominator, municipality_id from public.v_ind_b1
    union all select 'B1.1', period_code, actual, denominator, municipality_id from public.v_ind_b1_1
    union all select 'B1.2', period_code, actual, denominator, municipality_id from public.v_ind_b1_2
    union all select 'C1',   period_code, actual, denominator, municipality_id from public.v_ind_c1
    union all select 'C1.1', period_code, actual, denominator, municipality_id from public.v_ind_c1_1
    union all select 'C1.2', period_code, actual, denominator, municipality_id from public.v_ind_c1_2
    union all select 'C1.3', period_code, actual, denominator, municipality_id from public.v_ind_c1_3
    union all select 'D0.1', period_code, actual, denominator, municipality_id from public.v_ind_d0_1
    union all select 'D0.2', period_code, actual, denominator, municipality_id from public.v_ind_d0_2
    union all select 'E0.1', period_code, actual, denominator, municipality_id from public.v_ind_e0_1
    union all select 'E0.2', period_code, actual, denominator, municipality_id from public.v_ind_e0_2
    union all select 'F0.1', period_code, actual, denominator, municipality_id from public.v_ind_f0_1
    union all select 'G0.1', period_code, actual, denominator, municipality_id from public.v_ind_g0_1
    union all select 'G0.2', period_code, actual, denominator, municipality_id from public.v_ind_g0_2
    union all select 'G0.3', period_code, actual, denominator, municipality_id from public.v_ind_g0_3
    union all select 'G0.4', period_code, actual, denominator, municipality_id from public.v_ind_g0_4
  ) x
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t)
   and (auth.uid() is null or public.can_see_municipality(x.municipality_id));

create or replace view public.v_indicator_progress as
select i.code, i.name_en, i.name_ar, i.unit, i.definition, i.indicator_type, i.sort_order,
       o.code as objective_code, o.name_en as objective_name_en, o.name_ar as objective_name_ar,
       o.sort_order as objective_sort,
       rp.code as period_code, rp.start_date, rp.end_date,
       t.target_value as target,
       a.actual, a.denominator,
       case when t.target_value is null or t.target_value = 0 then null::numeric
            when i.unit = '%' then a.actual
            else round(a.actual / t.target_value * 100, 1) end as progress_pct,
       case when t.target_value is null or t.target_value = 0 then 'not_set'
            when a.actual is null then 'not_started'
            when a.actual >= t.target_value then 'complete'
            when a.actual = 0 then 'not_started'
            when a.actual >= t.target_value * 0.8 then 'on_track'
            else 'behind' end as status,
       (m.code = 'SHM' and i.code in ('A1.3', 'B1.2', 'D0.1', 'E0.2')) as is_disaggregable,
       case when m.code = 'SHM'
            then i.data_source <> all (array['partnership', 'training_enrolment', 'market_linkage',
                                             'exhibition', 'exhibition_registration', 'followup_survey',
                                             'partner_contribution', 'office_service', 'training_session',
                                             'guidance_record', 'mentorship_session'])
            else i.view_name is null end as is_manual,
       i.municipality_id
  from public.indicator i
  join public.municipality m on m.id = i.municipality_id
  join public.objective o on o.id = i.objective_id
  join public.reporting_period rp on rp.municipality_id = i.municipality_id
  left join public.indicator_target t on t.indicator_id = i.id and t.period_id = rp.id
  left join public.v_indicator_actual a
         on a.municipality_id = i.municipality_id and a.code = i.code and a.period_code = rp.code
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t)
   and (auth.uid() is null or public.can_see_municipality(i.municipality_id));

create or replace view public.v_indicator_disaggregated as
with people as (
  select 'A1.3'::text as code, m.id as municipality_id, rp.code as period_code, f.person_id
    from public.municipality m
    join public.reporting_period rp on rp.municipality_id = m.id
    join (select te.municipality_id, te.person_id,
                 min(coalesce(te.decided_on, te.registered_on)) as first_on
            from public.training_enrolment te
            join public.person pe on pe.id = te.person_id and pe.deleted_at is null
            join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null
           where te.met_criteria is true and te.deleted_at is null
           group by te.municipality_id, te.person_id) f
      on f.municipality_id = m.id and f.first_on >= rp.start_date and f.first_on <= rp.end_date
   where m.code = 'SHM'
  union all
  select 'B1.2', m.id, rp.code, f.person_id
    from public.municipality m
    join public.reporting_period rp on rp.municipality_id = m.id
    join (select os.municipality_id, os.person_id, min(os.service_date) as first_on
            from public.office_service os
            join public.person pe on pe.id = os.person_id and pe.deleted_at is null
           where os.deleted_at is null
           group by os.municipality_id, os.person_id) f
      on f.municipality_id = m.id and f.first_on >= rp.start_date and f.first_on <= rp.end_date
   where m.code = 'SHM'
  union all
  select 'D0.1', m.id, rp.code, f.person_id
    from public.municipality m
    join public.reporting_period rp on rp.municipality_id = m.id
    join (select gr.municipality_id, gr.person_id, min(gr.guidance_date) as first_on
            from public.guidance_record gr
            join public.person pe on pe.id = gr.person_id and pe.deleted_at is null
           where gr.deleted_at is null
           group by gr.municipality_id, gr.person_id) f
      on f.municipality_id = m.id and f.first_on >= rp.start_date and f.first_on <= rp.end_date
   where m.code = 'SHM'
  union all
  select 'E0.2', m.id, rp.code, f.person_id
    from public.municipality m
    join public.reporting_period rp on rp.municipality_id = m.id
    join (select er.municipality_id, er.person_id, min(e.start_date) as first_on
            from public.exhibition_registration er
            join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
            join public.person pe on pe.id = er.person_id and pe.deleted_at is null
           where er.status = 'approved'::record_status_t and er.deleted_at is null
           group by er.municipality_id, er.person_id) f
      on f.municipality_id = m.id and f.first_on >= rp.start_date and f.first_on <= rp.end_date
   where m.code = 'SHM'
)
select pl.code, pl.period_code,
       coalesce(p.sex::text, 'not_recorded') as sex,
       public.age_band(p.*) as age_band,
       case when p.is_refugee is null then 'not_recorded'
            when p.is_refugee then 'refugee' else 'non_refugee' end as refugee_status,
       case when p.has_disability is null then 'not_recorded'
            when p.has_disability then 'with_disability' else 'without_disability' end as disability_status,
       coalesce(nullif(btrim(p.village), ''), 'not_recorded') as village,
       count(distinct p.id)::numeric as value,
       pl.municipality_id
  from people pl
  join public.person p on p.id = pl.person_id and p.deleted_at is null
 where (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t)
   and (auth.uid() is null or public.can_see_municipality(pl.municipality_id))
 group by pl.code, pl.municipality_id, pl.period_code,
          coalesce(p.sex::text, 'not_recorded'), public.age_band(p.*),
          case when p.is_refugee is null then 'not_recorded'
               when p.is_refugee then 'refugee' else 'non_refugee' end,
          case when p.has_disability is null then 'not_recorded'
               when p.has_disability then 'with_disability' else 'without_disability' end,
          coalesce(nullif(btrim(p.village), ''), 'not_recorded');

-- ── 4. the two invoker views say which municipality each row is in ───────

create or replace view public.v_opportunity with (security_invoker = true) as
select ts.id, 'training'::text as opportunity_type, ts.title, ts.description, ts.topic_id,
       ts.start_date, ts.end_date, ts.venue as location, ts.focal_point, ts.duration_hours,
       ts.delivered_by_partnership_id, ts.planned_seats as capacity,
       (select count(*) from public.training_enrolment e
         where e.session_id = ts.id and e.deleted_at is null
           and e.application_status = 'approved'::record_status_t)::integer as seats_taken,
       ts.application_opens_on, ts.application_closes_on, ts.is_published, ts.is_cancelled,
       (ts.is_published and not ts.is_cancelled and ts.end_date >= current_date
        and (ts.application_opens_on is null or ts.application_opens_on <= current_date)
        and (ts.application_closes_on is null or ts.application_closes_on >= current_date)) as applications_open,
       ts.created_at,
       ts.municipality_id
  from public.training_session ts
 where ts.deleted_at is null
union all
select a.id, 'advisory'::text, a.title, a.description, a.topic_id,
       a.start_date, a.end_date, a.venue, a.focal_point, a.duration_hours,
       a.delivered_by_partnership_id, a.planned_seats,
       (select count(*) from public.advisory_enrolment e
         where e.session_id = a.id and e.deleted_at is null
           and e.application_status = 'approved'::record_status_t)::integer,
       a.application_opens_on, a.application_closes_on, a.is_published, a.is_cancelled,
       (a.is_published and not a.is_cancelled and a.end_date >= current_date
        and (a.application_opens_on is null or a.application_opens_on <= current_date)
        and (a.application_closes_on is null or a.application_closes_on >= current_date)),
       a.created_at,
       a.municipality_id
  from public.advisory_session a
 where a.deleted_at is null
union all
select x.id, 'exhibition'::text, x.name, x.description, null::uuid,
       x.start_date, x.end_date, x.location, x.focal_point, null::numeric,
       null::uuid, x.booth_capacity,
       (select count(*) from public.exhibition_registration r
         where r.exhibition_id = x.id and r.deleted_at is null
           and r.status = 'approved'::record_status_t)::integer,
       x.application_opens_on, x.application_closes_on, x.is_published, x.is_cancelled,
       (x.is_published and not x.is_cancelled and x.end_date >= current_date
        and (x.application_opens_on is null or x.application_opens_on <= current_date)
        and (x.application_closes_on is null or x.application_closes_on >= current_date)),
       x.created_at,
       x.municipality_id
  from public.exhibition x
 where x.deleted_at is null;

create or replace view public.v_recent_activity with (security_invoker = true) as
select 'training_completion'::text as kind, te.id,
       coalesce(te.decided_on, te.registered_on) as happened_on,
       te.person_id, p.full_name as subject, p.village,
       case when te.met_criteria is true then 'met'
            when te.met_criteria is false then 'not_met' else 'pending' end as detail,
       'tc'::text as module,
       te.municipality_id
  from public.training_enrolment te
  join public.person p on p.id = te.person_id and p.deleted_at is null
 where te.deleted_at is null
union all
select 'exhibition_registration', er.id, e.start_date, er.person_id, p.full_name, p.village,
       er.status::text, 'rg', er.municipality_id
  from public.exhibition_registration er
  join public.person p on p.id = er.person_id and p.deleted_at is null
  join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
 where er.deleted_at is null
union all
select 'office_service', os.id, os.service_date, os.person_id, p.full_name, p.village,
       null::text, 'os', os.municipality_id
  from public.office_service os
  join public.person p on p.id = os.person_id and p.deleted_at is null
 where os.deleted_at is null
union all
select 'guidance', gr.id, gr.guidance_date, gr.person_id, p.full_name, p.village,
       null::text, 'gr', gr.municipality_id
  from public.guidance_record gr
  join public.person p on p.id = gr.person_id and p.deleted_at is null
 where gr.deleted_at is null
union all
select 'followup', fs.id, fs.contact_date, fs.person_id, p.full_name, p.village,
       fs.status::text, 'fu', fs.municipality_id
  from public.followup_survey fs
  join public.person p on p.id = fs.person_id and p.deleted_at is null
 where fs.deleted_at is null
union all
select 'market_linkage', ml.id, ml.linked_on, null::uuid, pt.name, null::text,
       null::text, 'ln', ml.municipality_id
  from public.market_linkage ml
  join public.partnership ps on ps.id = ml.partnership_id and ps.deleted_at is null
  join public.partner pt on pt.id = ps.partner_id and pt.deleted_at is null
 where ml.deleted_at is null
union all
select 'exhibition_held', e.id, e.end_date, null::uuid, e.name, e.location,
       null::text, 'ex', e.municipality_id
  from public.exhibition e
 where e.deleted_at is null
union all
select 'partnership', ps.id, ps.established_on, null::uuid, pt.name, null::text,
       ps.partnership_type::text,
       case when ps.partnership_type = 'training'::partnership_type_t then 'tp' else 'pp' end,
       ps.municipality_id
  from public.partnership ps
  join public.partner pt on pt.id = ps.partner_id and pt.deleted_at is null
 where ps.deleted_at is null;

-- ── 5. the two definer RPCs and review_followup name their municipality ──

drop function public.indicator_figures(text, text, text[], text[], text[], text[], text[], text[], text[]);

create function public.indicator_figures(
  p_period_from text default null, p_period_to text default null,
  p_objectives text[] default null, p_villages text[] default null, p_sex text[] default null,
  p_age_bands text[] default null, p_refugee text[] default null, p_disability text[] default null,
  p_statuses text[] default null,
  p_municipality_id uuid default null)
returns table (
  code text, name_en text, name_ar text, unit text,
  objective_code text, objective_name_en text, objective_name_ar text,
  objective_sort integer, sort_order integer,
  target numeric, actual numeric, progress_pct numeric, status text,
  is_disaggregable boolean, is_manual boolean, filter_ignored boolean, aggregation text,
  period_from text, period_to text)
language sql stable security definer set search_path = public
as $$
with muni as (
  select coalesce(p_municipality_id, public.my_municipality()) as id
),
guard as (
  select (auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t)
         and (select id from muni) is not null
         and (auth.uid() is null or public.can_see_municipality((select id from muni))) as ok
),
bounds as (
  select coalesce(p_period_from, (select min(code) from reporting_period where municipality_id = (select id from muni))) as pf,
         coalesce(p_period_to, p_period_from, (select max(code) from reporting_period where municipality_id = (select id from muni))) as pt
),
periods as (
  select rp.* from reporting_period rp, bounds b
   where rp.municipality_id = (select id from muni) and rp.code >= b.pf and rp.code <= b.pt
),
flt as (
  select (p_villages is not null or p_sex is not null or p_age_bands is not null
          or p_refugee is not null or p_disability is not null) as person_filter
),
disagg as (
  select d.code, sum(d.value) as value
    from v_indicator_disaggregated d
   where d.municipality_id = (select id from muni)
     and d.period_code in (select code from periods)
     and (p_villages   is null or d.village           = any(p_villages))
     and (p_sex        is null or d.sex               = any(p_sex))
     and (p_age_bands  is null or d.age_band          = any(p_age_bands))
     and (p_refugee    is null or d.refugee_status    = any(p_refugee))
     and (p_disability is null or d.disability_status = any(p_disability))
   group by d.code
),
evt as (
  select p.code,
         case when p.code in ('A1.2','C1.1','G0.4','B1.1','G0.1') then 'latest' else 'sum' end as rule,
         sum(p.actual) as summed,
         (array_agg(p.actual order by p.period_code desc) filter (where p.actual is not null))[1] as latest
    from v_indicator_progress p
   where p.municipality_id = (select id from muni)
     and p.period_code in (select code from periods)
   group by p.code
),
tgt as (
  select p.code,
         (array_agg(p.target order by p.period_code desc) filter (where p.target is not null))[1] as target
    from v_indicator_progress p
   where p.municipality_id = (select id from muni)
     and p.period_code in (select code from periods)
   group by p.code
),
meta as (
  select distinct on (p.code)
         p.code, p.name_en, p.name_ar, p.unit, p.objective_code,
         p.objective_name_en, p.objective_name_ar, p.objective_sort,
         p.sort_order, p.is_disaggregable, p.is_manual
    from v_indicator_progress p
   where p.municipality_id = (select id from muni)
   order by p.code
),
joined as (
  select m.*, t.target,
         case
           when m.is_disaggregable and f.person_filter then coalesce(d.value, 0)
           when e.rule = 'latest' then e.latest
           else e.summed
         end as actual,
         (f.person_filter and not m.is_disaggregable) as filter_ignored,
         case when m.is_disaggregable then 'distinct_people' else e.rule end as aggregation
    from meta m
    cross join flt f
    left join tgt t on t.code = m.code
    left join evt e on e.code = m.code
    left join disagg d on d.code = m.code
),
scored as (
  select j.*,
         case
           when j.target is null or j.target = 0 then null
           when j.unit = '%' then j.actual
           else round(j.actual / j.target * 100, 1)
         end as progress_pct,
         case
           when j.target is null or j.target = 0 then 'not_set'
           when j.actual is null           then 'not_started'
           when j.actual >= j.target       then 'complete'
           when j.actual = 0               then 'not_started'
           when j.actual >= j.target * 0.8 then 'on_track'
           else 'behind'
         end as status
    from joined j
)
select s.code, s.name_en, s.name_ar, s.unit,
       s.objective_code, s.objective_name_en, s.objective_name_ar,
       s.objective_sort, s.sort_order,
       s.target, s.actual, s.progress_pct, s.status,
       s.is_disaggregable, s.is_manual, s.filter_ignored, s.aggregation,
       (select pf from bounds), (select pt from bounds)
  from scored s, guard g
 where g.ok
   and (p_objectives is null or s.objective_code = any(p_objectives))
   and (p_statuses   is null or s.status = any(p_statuses))
 order by s.objective_sort, s.sort_order;
$$;

revoke all on function public.indicator_figures(text, text, text[], text[], text[], text[], text[], text[], text[], uuid) from public, anon;
grant execute on function public.indicator_figures(text, text, text[], text[], text[], text[], text[], text[], text[], uuid) to authenticated;

drop function public.overview_counts(text, text, text[], text[], text[], text[], text[]);

create function public.overview_counts(
  p_period_from text default null, p_period_to text default null,
  p_villages text[] default null, p_sex text[] default null, p_age_bands text[] default null,
  p_refugee text[] default null, p_disability text[] default null,
  p_municipality_id uuid default null)
returns table (
  people_total bigint, people_in_period bigint, trainings_completed bigint, markets_held bigint,
  markets_upcoming bigint, partners_active bigint, registrations_pending bigint,
  villages_reached bigint, followups_done bigint)
language sql stable security definer set search_path = public
as $$
with muni as (
  select coalesce(p_municipality_id, public.my_municipality()) as id
),
guard as (
  select (auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t)
         and (select id from muni) is not null
         and (auth.uid() is null or public.can_see_municipality((select id from muni))) as ok
),
bounds as (
  select coalesce(p_period_from, (select min(code) from reporting_period where municipality_id = (select id from muni))) as pf,
         coalesce(p_period_to, p_period_from, (select max(code) from reporting_period where municipality_id = (select id from muni))) as pt
),
window_dates as (
  select min(rp.start_date) as d_from, max(rp.end_date) as d_to
    from reporting_period rp, bounds b
   where rp.municipality_id = (select id from muni) and rp.code >= b.pf and rp.code <= b.pt
),
eligible as (
  select p.id, p.village from person p
   where p.deleted_at is null
     and (p_villages is null
          or coalesce(nullif(btrim(p.village), ''), 'not_recorded') = any(p_villages))
     and (p_sex is null or coalesce(p.sex::text, 'not_recorded') = any(p_sex))
     and (p_age_bands is null or age_band(p.*) = any(p_age_bands))
     and (p_refugee is null or
          (case when p.is_refugee is null then 'not_recorded'
                when p.is_refugee then 'refugee' else 'non_refugee' end) = any(p_refugee))
     and (p_disability is null or
          (case when p.has_disability is null then 'not_recorded'
                when p.has_disability then 'with_disability'
                else 'without_disability' end) = any(p_disability))
)
select
  (select count(*) from eligible),
  (select count(distinct r.person_id)
     from v_recent_activity r join eligible e on e.id = r.person_id
    where r.municipality_id = (select id from muni)
      and r.happened_on between (select d_from from window_dates)
                            and (select d_to from window_dates)),
  (select count(distinct te.person_id)
     from training_enrolment te join eligible e on e.id = te.person_id
    where te.municipality_id = (select id from muni)
      and te.deleted_at is null and te.met_criteria is true
      and coalesce(te.decided_on, te.registered_on)
          between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e
    where e.municipality_id = (select id from muni)
      and e.deleted_at is null and e.end_date < current_date
      and e.start_date between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e
    where e.municipality_id = (select id from muni)
      and e.deleted_at is null and e.end_date >= current_date),
  (select count(*) from partnership ps
     join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
    where ps.municipality_id = (select id from muni)
      and ps.deleted_at is null and ps.is_active),
  (select count(*) from exhibition_registration er
     join eligible e on e.id = er.person_id
    where er.municipality_id = (select id from muni)
      and er.deleted_at is null and er.status = 'submitted'::record_status_t),
  (select count(distinct coalesce(nullif(btrim(e.village), ''), 'not_recorded')) from eligible e),
  (select count(distinct fs.person_id)
     from followup_survey fs join eligible e on e.id = fs.person_id
    where fs.municipality_id = (select id from muni)
      and fs.deleted_at is null
      and fs.contact_date between (select d_from from window_dates) and (select d_to from window_dates))
from guard g where g.ok;
$$;

revoke all on function public.overview_counts(text, text, text[], text[], text[], text[], text[], uuid) from public, anon;
grant execute on function public.overview_counts(text, text, text[], text[], text[], text[], text[], uuid) to authenticated;

-- review_followup: versions 0099, 0100. One predicate added to the period
-- lookup; nothing else in the body moved.
create or replace function public.review_followup(
  p_survey_id uuid, p_action text, p_note text default null, p_confirm boolean default false)
returns jsonb
language plpgsql set search_path = public, pg_temp
as $function$
declare
  v_survey   followup_survey%rowtype;
  v_target   record_status_t;
  v_note     text;
  v_now      text[];
  v_after    text[];
  v_removed  text[];
  v_added    text[];
  v_period   text;
  v_live     boolean;
  v_rows     int;
  v_con      text;
  v_payload  jsonb;
begin
  if p_action is null or p_action not in ('approve','reject','reopen') then
    return jsonb_build_object('ok', false, 'result', 'bad_action');
  end if;

  -- RLS applies the UPDATE policy to a locking read (0068). For a submitted,
  -- approved or rejected survey this refuses everyone but a coordinator; for a
  -- draft it also admits the enumerator, which is why the role is checked
  -- explicitly below.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    -- Look, do not assume. An empty FOR UPDATE means "no such row" or "not
    -- yours", and reporting absence sends someone looking for a bug instead of
    -- for a coordinator. See 0068.
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- The readable refusal. Not the boundary -- see the header.
  if not public.is_coordinator() then
    return jsonb_build_object('ok', false, 'result', 'not_permitted');
  end if;

  -- ── what state may be acted on ──────────────────────────────────────────
  --
  -- Review acts on a submitted survey. Reopen undoes any review, and the
  -- submission itself, so it accepts anything that is not already a draft.
  if p_action in ('approve','reject') then
    if v_survey.status <> 'submitted'::record_status_t then
      return jsonb_build_object('ok', false, 'result', 'not_reviewable',
                                'status', v_survey.status, 'action', p_action);
    end if;
    v_target := case p_action when 'approve' then 'approved'::record_status_t
                              else 'rejected'::record_status_t end;
  else
    if v_survey.status = 'draft'::record_status_t then
      return jsonb_build_object('ok', false, 'result', 'not_reviewable',
                                'status', v_survey.status, 'action', p_action);
    end if;
    v_target := 'draft'::record_status_t;
  end if;

  -- ── the note ────────────────────────────────────────────────────────────
  --
  -- Computed here, refused below. A preview must describe what the action
  -- would do; whether the reason box has been filled in yet is not part of
  -- that, and making it part of it meant a rejection could never be previewed
  -- at all. See 0100.
  if p_action = 'reject' then
    v_note := nullif(btrim(coalesce(p_note, '')), '');
  elsif p_action = 'approve' then
    v_note := null;
  else
    -- Reopen: a new note replaces, no note keeps the rejection reason the
    -- enumerator is about to act on.
    v_note := coalesce(nullif(btrim(coalesce(p_note, '')), ''), v_survey.review_note);
  end if;

  -- ── what moves ──────────────────────────────────────────────────────────
  --
  -- Asked twice of the same function, at two statuses. The difference is the
  -- sentence on the screen, and neither list is written down here.
  v_now   := coalesce(public.followup_indicator_reach(p_survey_id, v_survey.status), '{}'::text[]);
  v_after := coalesce(public.followup_indicator_reach(p_survey_id, v_target),        '{}'::text[]);

  select coalesce(array_agg(x order by ord), '{}'::text[]) into v_removed
    from unnest(v_now) with ordinality as u(x, ord) where not (x = any(v_after));
  select coalesce(array_agg(x order by ord), '{}'::text[]) into v_added
    from unnest(v_after) with ordinality as u(x, ord) where not (x = any(v_now));

  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  v_live := coalesce(v_live, false);

  -- Every view joins the survey to a period on its contact date, so this is the
  -- quarter the figures move in. Null means none of the thirteen, which is a
  -- real answer and the screen should say it rather than hide it. The
  -- survey's own municipality, because two municipalities share period codes.
  select rp.code into v_period from reporting_period rp
   where rp.municipality_id = v_survey.municipality_id
     and v_survey.contact_date between rp.start_date and rp.end_date
   limit 1;

  v_payload := jsonb_build_object(
    'survey_id',           p_survey_id,
    'action',              p_action,
    'status',              v_survey.status,
    'status_after',        v_target,
    'indicators_now',      to_jsonb(v_now),
    'indicators_after',    to_jsonb(v_after),
    'indicators_removed',  to_jsonb(v_removed),
    'indicators_added',    to_jsonb(v_added),
    'period',              v_period,
    'person_live',         v_live);

  if not coalesce(p_confirm, false) then
    return jsonb_build_object('ok', true, 'result', 'preview') || v_payload;
  end if;

  -- ── refusals about the note, now that we are actually writing ───────────
  --
  -- Below the preview return on purpose (0100). rejected_has_a_reason enforces
  -- the same rule in the table; this one is here because a constraint names a
  -- constraint and this names the field.
  if p_action = 'reject' and v_note is null then
    return jsonb_build_object('ok', false, 'result', 'reason_required') || v_payload;
  end if;

  -- Refused, not ignored. An approval carries no note, and silently discarding
  -- one a coordinator typed is worse than saying so.
  if p_action = 'approve' and coalesce(btrim(coalesce(p_note, '')), '') <> '' then
    return jsonb_build_object('ok', false, 'result', 'note_not_accepted') || v_payload;
  end if;

  -- reviewed_by and reviewed_at are stamped by guard_followup_review, not set
  -- here: a client-supplied reviewer is not evidence of who reviewed it.
  update followup_survey
     set status      = v_target,
         review_note = v_note
   where id = p_survey_id;

  -- Count what came back. The lock passed fu_update's USING, so this should be
  -- one row -- but an UPDATE that RLS filters reports success with zero, and a
  -- rejection that silently did not happen would leave a survey counting in
  -- four indicators while the screen said it had been taken out.
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception
      'reviewing survey % changed % rows, not 1', p_survey_id, v_rows
      using errcode = 'insufficient_privilege',
            hint = 'An UPDATE that RLS filters reports success. Check fu_update.';
  end if;

  return jsonb_build_object('ok', true, 'result', 'reviewed') || v_payload;

exception
  -- Same shape as submit_followup and the five section saves.
  -- insufficient_privilege stays uncaught: it is the read-back guard above.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

-- ── 6. verification ──────────────────────────────────────────────────────

do $verify$
declare
  t text;
  v_bad text[];
  v_n bigint;
  v_rmth_admin uuid := 'b0000000-0000-4000-8000-000000000118';
  v_super      uuid := 'b0000000-0000-4000-8000-000000000119';
  v_shm  constant uuid := '00000000-0000-4000-8000-00000000005a';
  v_rmth constant uuid := '00000000-0000-4000-8000-0000000000a1';
  v_channel uuid;
  v_probe_row uuid;
  v_refused boolean;
  c_scoped constant text[] := array[
    'objective', 'activity', 'indicator', 'indicator_target',
    'indicator_snapshot', 'reporting_period',
    'training_session', 'training_enrolment', 'advisory_session',
    'advisory_enrolment', 'exhibition', 'exhibition_registration',
    'office_service', 'guidance_record', 'production_initiative',
    'mentorship_session', 'market_linkage', 'linkage_request',
    'coordination_meeting', 'case_study', 'promotional_action', 'milestone',
    'followup_survey', 'partner', 'partnership', 'partner_contribution',
    'partnership_role', 'coordination_meeting_partner',
    'exhibition_registration_product', 'followup_answer',
    'followup_answer_option', 'followup_safety_item',
    'followup_buyer_connection', 'attachment'];
begin
  -- (a) no policy is addressed to public or anon any more (OQ-35)
  select array_agg(tablename || '.' || policyname) into v_bad
    from pg_policies where schemaname = 'public'
     and ('anon' = any(roles) or 'public' = any(roles));
  if v_bad is not null then
    raise exception '0118: policies still open to anon/public: %', v_bad;
  end if;

  -- (b) no policy names a role list that leaves super_admin out
  select array_agg(tablename || '.' || policyname) into v_bad
    from pg_policies where schemaname = 'public'
     and (coalesce(qual, '') || coalesce(with_check, '')) ~ '''(coordinator|data_entry)''::app_role_t'
     and (coalesce(qual, '') || coalesce(with_check, '')) !~ '''super_admin''::app_role_t';
  if v_bad is not null then
    raise exception '0118: policies naming a role without super_admin: %', v_bad;
  end if;

  -- (c) every policy on a scoped table checks the municipality where it
  --     applies to rows: USING on select/update/delete, WITH CHECK on
  --     insert/update. op_read_self is the one own-row exception.
  select array_agg(tablename || '.' || policyname) into v_bad
    from pg_policies
   where schemaname = 'public' and tablename = any (c_scoped)
     and not (tablename = 'linkage_request' and policyname = 'op_read_self')
     and (   (cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL') and coalesce(qual, '') !~ 'can_see_municipality')
          or (cmd = 'INSERT' and coalesce(with_check, '') !~ 'can_see_municipality')
          or (cmd in ('UPDATE', 'ALL') and with_check is not null and with_check !~ 'can_see_municipality'));
  if v_bad is not null then
    raise exception '0118: scoped policies without a municipality check: %', v_bad;
  end if;

  -- (d) the isolation test, as the three account shapes, discarded after
  select id into v_channel from public.ref_promotional_channel where deleted_at is null limit 1;

  begin
    -- two probe accounts, created the way the Auth admin API creates them:
    -- an auth row with app metadata, which handle_new_user reads
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values
      (v_rmth_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'probe-rmth-admin@0118.invalid', '', now(),
       jsonb_build_object('provider', 'email', 'providers', array['email'],
                          'app_role', 'coordinator', 'municipality_id', v_rmth),
       jsonb_build_object('full_name', '0118 probe Ramtha admin'),
       now(), now(), '', '', '', '', '', '', '', ''),
      (v_super, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'probe-super@0118.invalid', '', now(),
       jsonb_build_object('provider', 'email', 'providers', array['email'],
                          'app_role', 'super_admin'),
       jsonb_build_object('full_name', '0118 probe super admin'),
       now(), now(), '', '', '', '', '', '', '', '');

    if not exists (select 1 from public.app_user where id = v_rmth_admin
                    and role = 'coordinator' and municipality_id = v_rmth) then
      raise exception '0118: handle_new_user did not shape the Ramtha admin from app metadata';
    end if;
    if not exists (select 1 from public.app_user where id = v_super
                    and role = 'super_admin' and municipality_id is null) then
      raise exception '0118: handle_new_user did not shape the super admin from app metadata';
    end if;

    -- ── as the Ramtha admin ──
    set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_rmth_admin::text, 'role', 'authenticated')::text, true);

    foreach t in array c_scoped loop
      execute format('select count(*) from public.%I', t) into v_n;
      if v_n <> 0 then
        raise exception '0118: the Ramtha admin sees % rows of %', v_n, t;
      end if;
    end loop;

    -- cannot write a row carrying Sahel Horan's id
    v_refused := false;
    begin
      insert into public.promotional_action (title, channel_id, action_date, municipality_id)
      values ('0118 probe — wrong municipality', v_channel, current_date, v_shm);
    exception when insufficient_privilege then
      v_refused := true;
    end;
    if not v_refused then
      raise exception '0118: the Ramtha admin wrote a row into Sahel Horan';
    end if;

    -- can write into their own, by default
    insert into public.promotional_action (title, channel_id, action_date)
    values ('0118 probe — Ramtha row', v_channel, current_date)
    returning id into v_probe_row;
    select count(*) into v_n from public.promotional_action;
    if v_n <> 1 then
      raise exception '0118: the Ramtha admin should see exactly its one row, sees %', v_n;
    end if;
    if not exists (select 1 from public.promotional_action where id = v_probe_row and municipality_id = v_rmth) then
      raise exception '0118: the Ramtha row did not land in Ramtha';
    end if;

    -- ── as the Sahel Horan admin ──
    perform set_config('request.jwt.claims',
      json_build_object('sub', 'a0000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);

    foreach t in array c_scoped loop
      execute format('select count(*) from public.%I where municipality_id <> %L', t, v_shm) into v_n;
      if v_n <> 0 then
        raise exception '0118: the Sahel Horan admin sees % foreign rows of %', v_n, t;
      end if;
    end loop;
    if exists (select 1 from public.promotional_action where id = v_probe_row) then
      raise exception '0118: the Sahel Horan admin can see the Ramtha row';
    end if;

    v_refused := false;
    begin
      insert into public.promotional_action (title, channel_id, action_date, municipality_id)
      values ('0118 probe — wrong municipality', v_channel, current_date, v_rmth);
    exception when insufficient_privilege then
      v_refused := true;
    end;
    if not v_refused then
      raise exception '0118: the Sahel Horan admin wrote a row into Ramtha';
    end if;

    -- ── as the super admin, not switched in: both ──
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_super::text, 'role', 'authenticated')::text, true);
    select count(*) into v_n from public.promotional_action;
    if v_n <> 3 then
      raise exception '0118: the super admin should see 3 promotional actions (2 SHM + 1 RMTH), sees %', v_n;
    end if;
    select count(*) into v_n from public.v_indicator_actual;
    if v_n <> 260 then
      raise exception '0118: the super admin should see all 260 indicator rows, sees %', v_n;
    end if;

    -- switched into Sahel Horan: only Sahel Horan
    reset role;
    update public.app_user set acting_municipality_id = v_shm where id = v_super;
    set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_super::text, 'role', 'authenticated')::text, true);
    select count(*) into v_n from public.promotional_action;
    if v_n <> 2 then
      raise exception '0118: the super admin switched into Sahel Horan should see 2, sees %', v_n;
    end if;
    if exists (select 1 from public.promotional_action where id = v_probe_row) then
      raise exception '0118: the super admin switched into Sahel Horan can see the Ramtha row';
    end if;

    reset role;
    perform set_config('request.jwt.claims', '', true);

    raise exception using errcode = 'P0118', message = 'discard the probe';
  exception
    when sqlstate 'P0118' then
      null;  -- the two accounts and the Ramtha row are gone with the savepoint
  end;

  -- and Sahel Horan's figures, read as the owner, are what they were
  select count(*) into v_n from public.v_indicator_actual where municipality_id = v_shm;
  if v_n <> 260 then
    raise exception '0118: expected 260 Sahel Horan indicator rows, found %', v_n;
  end if;
end $verify$;
