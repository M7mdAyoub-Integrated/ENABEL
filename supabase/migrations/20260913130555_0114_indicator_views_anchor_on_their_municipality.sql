-- ═══════════════════════════════════════════════════════════════════════════
--  0114 — the twenty Sahel Horan indicator views anchor on their municipality
--
--  ── WHY THIS HAS TO HAPPEN BEFORE A SINGLE RAMTHA PERIOD EXISTS ──
--
--  Every leaf view is shaped
--
--      from reporting_period rp
--      left join <data> on <date> between rp.start_date and rp.end_date
--      group by rp.code
--
--  Nothing in it says whose periods. The day Ramtha's thirteen quarters are
--  seeded, `reporting_period` holds two rows called `27/Q1`, the join matches
--  every Sahel Horan record against both, and GROUP BY rp.code folds the two
--  into one — so A1.3 reads 6 where it reads 3 today, in every quarter, with
--  no error anywhere. This migration is what makes that impossible, and it
--  runs while every period row is still Sahel Horan's, which is why the
--  figures cannot move here and are asserted not to.
--
--  ── WHAT CHANGES ──
--
--  Each of the twenty leaf views now starts from `municipality m` with
--  `m.code = 'SHM'`, joins `reporting_period` on `rp.municipality_id = m.id`,
--  and joins its data on `municipality_id = m.id` as well as on the date
--  range. It gains `municipality_id` as a new LAST column, so any reader of
--  the old three columns is unaffected. Every counting rule — the distinct
--  person in A1.3, B1.2, D0.1 and E0.2, the distinct partner in G0.4, the
--  distinct initiative in C1.2, the `submitted`/`approved` gate on the four
--  survey views, the six-month test in C1, the food-processing topic in D0.2,
--  the `end_date < current_date` in E0.1 — is carried over character for
--  character from the live definitions, which were read with pg_get_viewdef
--  rather than from 0014, so nothing later than 0014 can be reverted here.
--
--  The four survey views keep EXACTLY ONE `status = any (array[...])` gate
--  each, because `followup_view_statuses` (0098) reads it out of
--  pg_get_viewdef and raises if it finds none or more than one. Checked in
--  the verification block by calling that function on all four.
--
--  `v_indicator_actual` unions the twenty with `municipality_id` and keeps
--  its role gate. `v_indicator_progress` joins indicator to period and to the
--  actual ON MUNICIPALITY as well as on code, and `v_indicator_disaggregated`
--  anchors the same way. All three gain `municipality_id`; 0118 adds the
--  municipality gate to their WHERE once `can_see_municipality()` exists.
--
--  Ramtha's own leaf views arrive in Part 6 as `v_rmth_ind_*`, anchored on
--  `m.code = 'RMTH'`, and are unioned into `v_indicator_actual` there.
--
--  ── DROP AND RECREATE, NOT REPLACE ──
--
--  `create or replace view` cannot add a column anywhere but the end and the
--  twenty are the base of a dependency chain, so they are dropped with
--  CASCADE (which takes `v_indicator_actual` and `v_indicator_progress` with
--  them) and all recreated. Recreating re-applies the schema's default
--  privileges, which grant SELECT to `authenticated` — so the twenty leaves
--  are revoked again at the end, as 0015 did. Doing that found that FOUR of
--  them (`v_ind_a1`, `v_ind_b1`, `v_ind_c1`, `v_ind_imp_0`) had quietly
--  regained the grant when they were last recreated (0080–0098): security
--  definer views over `followup_survey`, selectable by any signed-in account.
--  Aggregates only, no personal data, and 07_BUILD_CHECKLIST.md's step b
--  ("authed_select must be false for all 20") had been false for a month.
--  Closed here; the verification asserts it for all twenty.
--
--  `is_manual` and `is_disaggregable` in v_indicator_progress are Sahel Horan
--  rules written against Sahel Horan table and code names. They are now
--  conditioned on `m.code = 'SHM'` so a Ramtha indicator is never judged by
--  them; Part 6 gives Ramtha its own.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table baseline_0114 as
  select code, period_code, actual, denominator from public.v_indicator_actual;

drop view if exists public.v_indicator_progress;
drop view if exists public.v_indicator_actual;
drop view if exists public.v_indicator_disaggregated;
drop view if exists
  public.v_ind_imp_0, public.v_ind_a1, public.v_ind_a1_2, public.v_ind_a1_3,
  public.v_ind_b1, public.v_ind_b1_1, public.v_ind_b1_2,
  public.v_ind_c1, public.v_ind_c1_1, public.v_ind_c1_2, public.v_ind_c1_3,
  public.v_ind_d0_1, public.v_ind_d0_2, public.v_ind_e0_1, public.v_ind_e0_2,
  public.v_ind_f0_1, public.v_ind_g0_1, public.v_ind_g0_2, public.v_ind_g0_3,
  public.v_ind_g0_4;

-- ── IMPACT ───────────────────────────────────────────────────────────────

create view public.v_ind_imp_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.q37_still_engaged in ('main', 'secondary'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s_1.id, s_1.municipality_id, s_1.contact_date, s_1.q37_still_engaged
      from public.followup_survey s_1
      join public.person pe on pe.id = s_1.person_id and pe.deleted_at is null
     where s_1.deleted_at is null
       and s_1.status in ('submitted'::record_status_t, 'approved'::record_status_t)
       and s_1.round = 'twelve_month'::followup_round_t
       and s_1.q37_still_engaged is not null
  ) s on s.municipality_id = m.id
     and s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

-- ── SO1 ──────────────────────────────────────────────────────────────────

create view public.v_ind_a1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.q08_applied_knowledge in ('regularly', 'occasionally'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s_1.id, s_1.municipality_id, s_1.contact_date, s_1.q08_applied_knowledge
      from public.followup_survey s_1
      join public.person pe on pe.id = s_1.person_id and pe.deleted_at is null
     where s_1.deleted_at is null
       and s_1.status in ('submitted'::record_status_t, 'approved'::record_status_t)
       and s_1.q08_applied_knowledge is not null
  ) s on s.municipality_id = m.id
     and s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_a1_2 as
select rp.code as period_code,
       count(p.id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select pa.id, pa.municipality_id, pa.established_on
      from public.partnership pa
      join public.partner pr on pr.id = pa.partner_id and pr.deleted_at is null
     where pa.deleted_at is null
       and pa.partnership_type = 'training'::partnership_type_t
       and pa.is_active
  ) p on p.municipality_id = m.id
     and p.established_on >= rp.start_date and p.established_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_a1_3 as
select rp.code as period_code,
       count(f.person_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    -- A1.3 counts PEOPLE: one person, however many completions, placed in the
    -- quarter of their first completion.
    select te.municipality_id, te.person_id,
           min(coalesce(te.decided_on, te.registered_on)) as first_on
      from public.training_enrolment te
      join public.person pe on pe.id = te.person_id and pe.deleted_at is null
      join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null
     where te.met_criteria is true and te.deleted_at is null
     group by te.municipality_id, te.person_id
  ) f on f.municipality_id = m.id
     and f.first_on >= rp.start_date and f.first_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_b1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.q16_advice_useful in ('very', 'somewhat'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s_1.id, s_1.municipality_id, s_1.contact_date, s_1.q16_advice_useful
      from public.followup_survey s_1
      join public.person pe on pe.id = s_1.person_id and pe.deleted_at is null
     where s_1.deleted_at is null
       and s_1.status in ('submitted'::record_status_t, 'approved'::record_status_t)
       and s_1.q14_used_office = 'yes'
  ) s on s.municipality_id = m.id
     and s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_b1_1 as
select rp.code as period_code,
       coalesce(count(ms.*), 0)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.milestone ms
         on ms.municipality_id = m.id
        and ms.code = 'B1.1' and ms.is_achieved
        and ms.achieved_on >= rp.start_date and ms.achieved_on <= rp.end_date
        and ms.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_b1_2 as
select rp.code as period_code,
       count(f.person_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select os.municipality_id, os.person_id, min(os.service_date) as first_on
      from public.office_service os
      join public.person pe on pe.id = os.person_id and pe.deleted_at is null
     where os.deleted_at is null
     group by os.municipality_id, os.person_id
  ) f on f.municipality_id = m.id
     and f.first_on >= rp.start_date and f.first_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

-- ── SO2 ──────────────────────────────────────────────────────────────────

create view public.v_ind_c1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (where s.q17_activity_status in ('expanded', 'same', 'reduced'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select s_1.id, s_1.municipality_id, s_1.contact_date, s_1.q17_activity_status
      from public.followup_survey s_1
      join public.person pe on pe.id = s_1.person_id and pe.deleted_at is null
     where s_1.deleted_at is null
       and s_1.status in ('submitted'::record_status_t, 'approved'::record_status_t)
       and s_1.q17_activity_status is not null
       and exists (select 1 from public.production_initiative pi
                    where pi.person_id = s_1.person_id
                      and pi.deleted_at is null
                      and pi.started_on <= (s_1.contact_date - '6 mons'::interval))
  ) s on s.municipality_id = m.id
     and s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_c1_1 as
select rp.code as period_code,
       count(p.id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select pa.id, pa.municipality_id, pa.established_on
      from public.partnership pa
      join public.partner pr on pr.id = pa.partner_id and pr.deleted_at is null
     where pa.deleted_at is null
       and pa.partnership_type = 'production_support'::partnership_type_t
       and pa.is_active
  ) p on p.municipality_id = m.id
     and p.established_on >= rp.start_date and p.established_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_c1_2 as
select rp.code as period_code,
       count(f.initiative_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    -- one initiative, however many linkages, in the quarter of its first
    select ml.municipality_id, ml.initiative_id, min(ml.linked_on) as first_on
      from public.market_linkage ml
      join public.production_initiative pi on pi.id = ml.initiative_id and pi.deleted_at is null
      join public.person pe on pe.id = pi.person_id and pe.deleted_at is null
     where ml.status in ('active'::link_status_t, 'ended'::link_status_t)
       and ml.deleted_at is null
     group by ml.municipality_id, ml.initiative_id
  ) f on f.municipality_id = m.id
     and f.first_on >= rp.start_date and f.first_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_c1_3 as
select rp.code as period_code,
       count(ms.id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select ms_1.id, ms_1.municipality_id, ms_1.session_date
      from public.mentorship_session ms_1
      join public.production_initiative pi on pi.id = ms_1.initiative_id and pi.deleted_at is null
      join public.person pe on pe.id = pi.person_id and pe.deleted_at is null
     where ms_1.deleted_at is null
  ) ms on ms.municipality_id = m.id
      and ms.session_date >= rp.start_date and ms.session_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_d0_1 as
select rp.code as period_code,
       count(f.person_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select gr.municipality_id, gr.person_id, min(gr.guidance_date) as first_on
      from public.guidance_record gr
      join public.person pe on pe.id = gr.person_id and pe.deleted_at is null
     where gr.deleted_at is null
     group by gr.municipality_id, gr.person_id
  ) f on f.municipality_id = m.id
     and f.first_on >= rp.start_date and f.first_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_d0_2 as
select rp.code as period_code,
       count(ts.id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select t.id, t.municipality_id, t.end_date
      from public.training_session t
      join public.ref_training_topic rt on rt.id = t.topic_id and rt.is_food_processing
     where t.deleted_at is null and t.is_delivered
  ) ts on ts.municipality_id = m.id
      and ts.end_date >= rp.start_date and ts.end_date <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

-- ── SO3 ──────────────────────────────────────────────────────────────────

create view public.v_ind_e0_1 as
select rp.code as period_code,
       count(e.*)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.exhibition e
         on e.municipality_id = m.id
        and e.end_date >= rp.start_date and e.end_date <= rp.end_date
        and e.end_date < current_date
        and not e.is_cancelled
        and e.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_e0_2 as
select rp.code as period_code,
       count(f.person_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    select er.municipality_id, er.person_id, min(e.start_date) as first_on
      from public.exhibition_registration er
      join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
      join public.person pe on pe.id = er.person_id and pe.deleted_at is null
     where er.status = 'approved'::record_status_t and er.deleted_at is null
     group by er.municipality_id, er.person_id
  ) f on f.municipality_id = m.id
     and f.first_on >= rp.start_date and f.first_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_f0_1 as
select rp.code as period_code,
       count(pa.*)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.promotional_action pa
         on pa.municipality_id = m.id
        and pa.action_date >= rp.start_date and pa.action_date <= rp.end_date
        and pa.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

-- ── SO4 ──────────────────────────────────────────────────────────────────

create view public.v_ind_g0_1 as
select rp.code as period_code,
       coalesce(count(ms.*), 0)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.milestone ms
         on ms.municipality_id = m.id
        and ms.code = 'G0.1' and ms.is_achieved
        and ms.achieved_on >= rp.start_date and ms.achieved_on <= rp.end_date
        and ms.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_g0_2 as
select rp.code as period_code,
       count(cm.*)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.coordination_meeting cm
         on cm.municipality_id = m.id
        and cm.meeting_date >= rp.start_date and cm.meeting_date <= rp.end_date
        and cm.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_g0_3 as
select rp.code as period_code,
       count(cs.*)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join public.case_study cs
         on cs.municipality_id = m.id
        and cs.documented_on >= rp.start_date and cs.documented_on <= rp.end_date
        and cs.deleted_at is null
 where m.code = 'SHM'
 group by m.id, rp.code;

create view public.v_ind_g0_4 as
select rp.code as period_code,
       count(distinct c.partner_id)::numeric as actual,
       null::numeric as denominator,
       m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  left join (
    -- G0.4 counts distinct PARTNERS with a contribution in the period, never
    -- partnerships and never contributions
    select pc.municipality_id, pc.contributed_on, pa.partner_id
      from public.partner_contribution pc
      join public.partnership pa on pa.id = pc.partnership_id and pa.deleted_at is null
      join public.partner pr on pr.id = pa.partner_id and pr.deleted_at is null
     where pc.deleted_at is null
  ) c on c.municipality_id = m.id
     and c.contributed_on >= rp.start_date and c.contributed_on <= rp.end_date
 where m.code = 'SHM'
 group by m.id, rp.code;

-- ── the union ────────────────────────────────────────────────────────────

create view public.v_indicator_actual as
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
 where auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t;

-- ── progress ─────────────────────────────────────────────────────────────

create view public.v_indicator_progress as
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
 where auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t;

-- ── disaggregation ───────────────────────────────────────────────────────

create view public.v_indicator_disaggregated as
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
 where auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer'::app_role_t
 group by pl.code, pl.municipality_id, pl.period_code,
          coalesce(p.sex::text, 'not_recorded'), public.age_band(p.*),
          case when p.is_refugee is null then 'not_recorded'
               when p.is_refugee then 'refugee' else 'non_refugee' end,
          case when p.has_disability is null then 'not_recorded'
               when p.has_disability then 'with_disability' else 'without_disability' end,
          coalesce(nullif(btrim(p.village), ''), 'not_recorded');

-- ── grants: leaves internal, the three exposed ones as before ────────────

do $grants$
declare v text;
begin
  for v in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'v\_ind\_%'
  loop
    execute format('revoke all on public.%I from public, anon, authenticated', v);
  end loop;
end $grants$;

revoke all on public.v_indicator_actual, public.v_indicator_progress, public.v_indicator_disaggregated
  from public, anon;
grant select on public.v_indicator_actual, public.v_indicator_progress, public.v_indicator_disaggregated
  to authenticated;

-- ── verification ─────────────────────────────────────────────────────────

do $verify$
declare
  v_diff bigint;
  v_bad text[];
  v_n int;
  v_view text;
  v_statuses text[];
begin
  -- 1. NOT ONE FIGURE MOVED, on the three columns every reader has always seen
  select count(*) into v_diff from (
    (select code, period_code, actual, denominator from baseline_0114
     except
     select code, period_code, actual, denominator from public.v_indicator_actual)
    union all
    (select code, period_code, actual, denominator from public.v_indicator_actual
     except
     select code, period_code, actual, denominator from baseline_0114)) d;
  if v_diff <> 0 then
    raise exception '0114: v_indicator_actual changed — % rows differ', v_diff;
  end if;

  -- 2. still 260 rows, 20 codes, all Sahel Horan's
  select count(*) into v_n from public.v_indicator_actual;
  if v_n <> 260 then raise exception '0114: expected 260 rows, found %', v_n; end if;
  select count(distinct code) into v_n from public.v_indicator_actual;
  if v_n <> 20 then raise exception '0114: expected 20 codes, found %', v_n; end if;
  if exists (select 1 from public.v_indicator_actual
              where municipality_id <> '00000000-0000-4000-8000-00000000005a') then
    raise exception '0114: a row is not Sahel Horan''s';
  end if;

  -- 3. the four survey views still expose exactly one readable status gate
  foreach v_view in array array['v_ind_a1', 'v_ind_b1', 'v_ind_c1', 'v_ind_imp_0'] loop
    v_statuses := public.followup_view_statuses(v_view);
    if v_statuses <> array['approved', 'submitted'] then
      raise exception '0114: % admits % — expected {approved,submitted}', v_view, v_statuses;
    end if;
  end loop;

  -- 4. v_indicator_progress: 260 rows, every one with a municipality
  select count(*) into v_n from public.v_indicator_progress;
  if v_n <> 260 then raise exception '0114: v_indicator_progress has % rows, expected 260', v_n; end if;

  -- 5. no leaf view is selectable by a client role (07_BUILD_CHECKLIST step b)
  select array_agg(c.relname) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'v\_ind\_%'
     and (has_table_privilege('authenticated', c.oid, 'select')
          or has_table_privilege('anon', c.oid, 'select'));
  if v_bad is not null then
    raise exception '0114: leaf views still reachable by a client role: %', v_bad;
  end if;
end $verify$;

drop table baseline_0114;
