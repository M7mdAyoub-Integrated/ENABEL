-- 0014 indicator_views
-- Every view returns (period_code, actual, denominator) for every reporting period,
-- so the dashboard gets a zero rather than a missing row.
-- Unique-person indicators attribute each person to the period of their FIRST
-- qualifying event, so quarterly figures sum to the cumulative distinct total.

-- IMP-0 : of 12-month surveys answering q37, percent still engaged
create or replace view public.v_ind_imp_0 as
select rp.code as period_code,
       case when count(s.*) = 0 then null
            else round(100.0 * count(*) filter (where s.q37_still_engaged in ('main','secondary'))
                       / count(s.*), 1) end as actual,
       count(s.*)::numeric as denominator
from public.reporting_period rp
left join public.followup_survey s
  on s.contact_date between rp.start_date and rp.end_date
 and s.round = 'twelve_month' and s.q37_still_engaged is not null and s.deleted_at is null
group by rp.code;

-- A1 : percent applying knowledge
create or replace view public.v_ind_a1 as
select rp.code as period_code,
       case when count(s.*) = 0 then null
            else round(100.0 * count(*) filter (where s.q08_applied_knowledge in ('regularly','occasionally'))
                       / count(s.*), 1) end as actual,
       count(s.*)::numeric as denominator
from public.reporting_period rp
left join public.followup_survey s
  on s.contact_date between rp.start_date and rp.end_date
 and s.q08_applied_knowledge is not null and s.deleted_at is null
group by rp.code;

-- A1.2 : training partnerships established in the period and still active
create or replace view public.v_ind_a1_2 as
select rp.code as period_code, count(p.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.partnership p
  on p.established_on between rp.start_date and rp.end_date
 and p.partnership_type = 'training' and p.is_active and p.deleted_at is null
group by rp.code;

-- A1.3 : unique participants meeting the training criteria
create or replace view public.v_ind_a1_3 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select te.person_id, min(coalesce(te.decided_on, te.registered_on)) as first_on
  from public.training_enrolment te
  where te.met_criteria is true and te.deleted_at is null
  group by te.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

-- B1 : of those who used the office, percent finding advice useful
create or replace view public.v_ind_b1 as
select rp.code as period_code,
       case when count(s.*) = 0 then null
            else round(100.0 * count(*) filter (where s.q16_advice_useful in ('very','somewhat'))
                       / count(s.*), 1) end as actual,
       count(s.*)::numeric as denominator
from public.reporting_period rp
left join public.followup_survey s
  on s.contact_date between rp.start_date and rp.end_date
 and s.q14_used_office is true and s.deleted_at is null
group by rp.code;

-- B1.1 : milestone, credited to the period it was achieved in
create or replace view public.v_ind_b1_1 as
select rp.code as period_code,
       coalesce(count(m.*), 0)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.milestone m
  on m.code = 'B1.1' and m.is_achieved
 and m.achieved_on between rp.start_date and rp.end_date and m.deleted_at is null
group by rp.code;

-- B1.2 : unique people served by the technical office
create or replace view public.v_ind_b1_2 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select os.person_id, min(os.service_date) as first_on
  from public.office_service os where os.deleted_at is null
  group by os.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

-- C1 : of survey respondents with an initiative older than six months, percent still operating
create or replace view public.v_ind_c1 as
select rp.code as period_code,
       case when count(s.*) = 0 then null
            else round(100.0 * count(*) filter (where s.q17_activity_status in ('expanded','same','reduced'))
                       / count(s.*), 1) end as actual,
       count(s.*)::numeric as denominator
from public.reporting_period rp
left join public.followup_survey s
  on s.contact_date between rp.start_date and rp.end_date
 and s.q17_activity_status is not null and s.deleted_at is null
 and exists (
   select 1 from public.production_initiative pi
   where pi.person_id = s.person_id and pi.deleted_at is null
     and pi.started_on <= s.contact_date - interval '6 months'
 )
group by rp.code;

-- C1.1 : production-support partnerships established in the period
create or replace view public.v_ind_c1_1 as
select rp.code as period_code, count(p.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.partnership p
  on p.established_on between rp.start_date and rp.end_date
 and p.partnership_type = 'production_support' and p.is_active and p.deleted_at is null
group by rp.code;

-- C1.2 : initiatives launched AND connected to a market
create or replace view public.v_ind_c1_2 as
select rp.code as period_code, count(f.initiative_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select ml.initiative_id, min(ml.linked_on) as first_on
  from public.market_linkage ml
  join public.production_initiative pi on pi.id = ml.initiative_id and pi.deleted_at is null
  where ml.status in ('active','ended') and ml.deleted_at is null
  group by ml.initiative_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

-- C1.3 : mentorship sessions delivered
create or replace view public.v_ind_c1_3 as
select rp.code as period_code, count(ms.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.mentorship_session ms
  on ms.session_date between rp.start_date and rp.end_date and ms.deleted_at is null
group by rp.code;

-- D0.1 : unique people receiving guidance
create or replace view public.v_ind_d0_1 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select gr.person_id, min(gr.guidance_date) as first_on
  from public.guidance_record gr where gr.deleted_at is null
  group by gr.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

-- D0.2 : delivered food-processing training sessions
create or replace view public.v_ind_d0_2 as
select rp.code as period_code, count(ts.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.training_session ts
  on ts.end_date between rp.start_date and rp.end_date
 and ts.is_delivered and ts.deleted_at is null
left join public.ref_training_topic rt on rt.id = ts.topic_id
where rt.id is null or rt.is_food_processing
group by rp.code;

-- E0.1 : exhibitions actually held (past, not cancelled)
create or replace view public.v_ind_e0_1 as
select rp.code as period_code, count(e.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.exhibition e
  on e.end_date between rp.start_date and rp.end_date
 and e.end_date < current_date and not e.is_cancelled and e.deleted_at is null
group by rp.code;

-- E0.2 : unique approved producers
create or replace view public.v_ind_e0_2 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select er.person_id, min(e.start_date) as first_on
  from public.exhibition_registration er
  join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
  where er.status = 'approved' and er.deleted_at is null
  group by er.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

-- F0.1 : promotional actions
create or replace view public.v_ind_f0_1 as
select rp.code as period_code, count(pa.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.promotional_action pa
  on pa.action_date between rp.start_date and rp.end_date and pa.deleted_at is null
group by rp.code;

-- G0.1 : milestone
create or replace view public.v_ind_g0_1 as
select rp.code as period_code, coalesce(count(m.*), 0)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.milestone m
  on m.code = 'G0.1' and m.is_achieved
 and m.achieved_on between rp.start_date and rp.end_date and m.deleted_at is null
group by rp.code;

-- G0.2 : coordination meetings
create or replace view public.v_ind_g0_2 as
select rp.code as period_code, count(cm.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.coordination_meeting cm
  on cm.meeting_date between rp.start_date and rp.end_date and cm.deleted_at is null
group by rp.code;

-- G0.3 : case studies documented
create or replace view public.v_ind_g0_3 as
select rp.code as period_code, count(cs.*)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.case_study cs
  on cs.documented_on between rp.start_date and rp.end_date and cs.deleted_at is null
group by rp.code;

-- G0.4 : distinct partners contributing in the period (recounted each period by design)
create or replace view public.v_ind_g0_4 as
select rp.code as period_code, count(distinct pa.partner_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join public.partner_contribution pc
  on pc.contributed_on between rp.start_date and rp.end_date and pc.deleted_at is null
left join public.partnership pa on pa.id = pc.partnership_id and pa.deleted_at is null
group by rp.code;

-- the uniform surface the dashboard queries
create or replace view public.v_indicator_actual as
            select 'IMP-0'::text as code, * from public.v_ind_imp_0
  union all select 'A1',    * from public.v_ind_a1
  union all select 'A1.2',  * from public.v_ind_a1_2
  union all select 'A1.3',  * from public.v_ind_a1_3
  union all select 'B1',    * from public.v_ind_b1
  union all select 'B1.1',  * from public.v_ind_b1_1
  union all select 'B1.2',  * from public.v_ind_b1_2
  union all select 'C1',    * from public.v_ind_c1
  union all select 'C1.1',  * from public.v_ind_c1_1
  union all select 'C1.2',  * from public.v_ind_c1_2
  union all select 'C1.3',  * from public.v_ind_c1_3
  union all select 'D0.1',  * from public.v_ind_d0_1
  union all select 'D0.2',  * from public.v_ind_d0_2
  union all select 'E0.1',  * from public.v_ind_e0_1
  union all select 'E0.2',  * from public.v_ind_e0_2
  union all select 'F0.1',  * from public.v_ind_f0_1
  union all select 'G0.1',  * from public.v_ind_g0_1
  union all select 'G0.2',  * from public.v_ind_g0_2
  union all select 'G0.3',  * from public.v_ind_g0_3
  union all select 'G0.4',  * from public.v_ind_g0_4;

-- person-level breakdown; people with unrecorded status land in a not_recorded bucket
-- rather than being dropped, so totals reconcile against the headline view.
create or replace view public.v_indicator_disaggregated as
with people as (
  select 'A1.3'::text as code, rp.code as period_code, f.person_id
  from public.reporting_period rp
  join (select te.person_id, min(coalesce(te.decided_on, te.registered_on)) as first_on
        from public.training_enrolment te
        where te.met_criteria is true and te.deleted_at is null
        group by te.person_id) f
    on f.first_on between rp.start_date and rp.end_date
  union all
  select 'B1.2', rp.code, f.person_id
  from public.reporting_period rp
  join (select os.person_id, min(os.service_date) as first_on
        from public.office_service os where os.deleted_at is null
        group by os.person_id) f
    on f.first_on between rp.start_date and rp.end_date
  union all
  select 'D0.1', rp.code, f.person_id
  from public.reporting_period rp
  join (select gr.person_id, min(gr.guidance_date) as first_on
        from public.guidance_record gr where gr.deleted_at is null
        group by gr.person_id) f
    on f.first_on between rp.start_date and rp.end_date
  union all
  select 'E0.2', rp.code, f.person_id
  from public.reporting_period rp
  join (select er.person_id, min(e.start_date) as first_on
        from public.exhibition_registration er
        join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
        where er.status = 'approved' and er.deleted_at is null
        group by er.person_id) f
    on f.first_on between rp.start_date and rp.end_date
)
select
  pl.code,
  pl.period_code,
  coalesce(p.sex::text, 'not_recorded')                          as sex,
  public.age_band(p)                                             as age_band,
  case when p.is_refugee is null then 'not_recorded'
       when p.is_refugee then 'refugee' else 'non_refugee' end   as refugee_status,
  case when p.has_disability is null then 'not_recorded'
       when p.has_disability then 'with_disability'
       else 'without_disability' end                             as disability_status,
  count(distinct p.id)::numeric as value
from people pl
join public.person p on p.id = pl.person_id and p.deleted_at is null
group by 1,2,3,4,5,6;

-- freeze a period into indicator_snapshot for the donor return
create or replace function public.snapshot_period(p_period_code text)
returns int language plpgsql security definer set search_path = public as $$
declare v_period public.reporting_period; n int;
begin
  select * into v_period from public.reporting_period where code = p_period_code;
  if not found then
    raise exception 'unknown reporting period %', p_period_code;
  end if;
  if v_period.is_locked then
    raise exception 'reporting period % is locked and cannot be recomputed', p_period_code;
  end if;

  insert into public.indicator_snapshot
    (indicator_id, period_id, actual_value, computed_at, computed_by)
  select i.id, v_period.id, a.actual, now(), auth.uid()
  from public.v_indicator_actual a
  join public.indicator i on i.code = a.code
  where a.period_code = p_period_code
  on conflict (indicator_id, period_id) do update
    set actual_value = excluded.actual_value,
        computed_at  = now(),
        computed_by  = excluded.computed_by
    where public.indicator_snapshot.is_final = false;

  get diagnostics n = row_count;
  return n;
end $$;
