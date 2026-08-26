-- 0025 soft_delete_cascade_in_views
--
-- DEFECT FOUND BY FINAL ACCEPTANCE TEST 6. Every indicator view filtered
-- `deleted_at is null` on its own fact table but not on the parent tables it
-- joins. Soft-deleting a parent therefore left its children in the counts:
-- retiring a partner did not drop A1.2, C1.1 or G0.4, and removing a person from
-- the register did not drop them out of A1.3, B1.2, D0.1 or E0.2.
--
-- Fix: each fact source is now a subquery that INNER JOINs its live parents, so a
-- soft delete anywhere up the chain removes the row from the count. The LEFT JOIN
-- to reporting_period is preserved so every period still returns a row.
--
-- Column names and types are unchanged, so v_indicator_actual stays valid and
-- existing grants are preserved.

create or replace view public.v_ind_imp_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null
            else round(100.0 * count(*) filter (where s.q37_still_engaged in ('main','secondary'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator
from public.reporting_period rp
left join (
  select s.* from public.followup_survey s
  join public.person pe on pe.id = s.person_id and pe.deleted_at is null
  where s.deleted_at is null and s.round = 'twelve_month' and s.q37_still_engaged is not null
) s on s.contact_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_a1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null
            else round(100.0 * count(*) filter (where s.q08_applied_knowledge in ('regularly','occasionally'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator
from public.reporting_period rp
left join (
  select s.* from public.followup_survey s
  join public.person pe on pe.id = s.person_id and pe.deleted_at is null
  where s.deleted_at is null and s.q08_applied_knowledge is not null
) s on s.contact_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_a1_2 as
select rp.code as period_code, count(p.id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select pa.* from public.partnership pa
  join public.partner pr on pr.id = pa.partner_id and pr.deleted_at is null
  where pa.deleted_at is null and pa.partnership_type = 'training' and pa.is_active
) p on p.established_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_a1_3 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select te.person_id, min(coalesce(te.decided_on, te.registered_on)) as first_on
  from public.training_enrolment te
  join public.person pe          on pe.id = te.person_id  and pe.deleted_at is null
  join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null
  where te.met_criteria is true and te.deleted_at is null
  group by te.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_b1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null
            else round(100.0 * count(*) filter (where s.q16_advice_useful in ('very','somewhat'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator
from public.reporting_period rp
left join (
  select s.* from public.followup_survey s
  join public.person pe on pe.id = s.person_id and pe.deleted_at is null
  where s.deleted_at is null and s.q14_used_office is true
) s on s.contact_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_b1_2 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select os.person_id, min(os.service_date) as first_on
  from public.office_service os
  join public.person pe on pe.id = os.person_id and pe.deleted_at is null
  where os.deleted_at is null
  group by os.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_c1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null
            else round(100.0 * count(*) filter (where s.q17_activity_status in ('expanded','same','reduced'))
                       / count(s.id), 1) end as actual,
       count(s.id)::numeric as denominator
from public.reporting_period rp
left join (
  select s.* from public.followup_survey s
  join public.person pe on pe.id = s.person_id and pe.deleted_at is null
  where s.deleted_at is null and s.q17_activity_status is not null
    and exists (
      select 1 from public.production_initiative pi
      where pi.person_id = s.person_id and pi.deleted_at is null
        and pi.started_on <= s.contact_date - interval '6 months'
    )
) s on s.contact_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_c1_1 as
select rp.code as period_code, count(p.id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select pa.* from public.partnership pa
  join public.partner pr on pr.id = pa.partner_id and pr.deleted_at is null
  where pa.deleted_at is null and pa.partnership_type = 'production_support' and pa.is_active
) p on p.established_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_c1_2 as
select rp.code as period_code, count(f.initiative_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select ml.initiative_id, min(ml.linked_on) as first_on
  from public.market_linkage ml
  join public.production_initiative pi on pi.id = ml.initiative_id and pi.deleted_at is null
  join public.person pe                on pe.id = pi.person_id     and pe.deleted_at is null
  where ml.status in ('active','ended') and ml.deleted_at is null
  group by ml.initiative_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_c1_3 as
select rp.code as period_code, count(ms.id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select m.* from public.mentorship_session m
  join public.production_initiative pi on pi.id = m.initiative_id and pi.deleted_at is null
  join public.person pe                on pe.id = pi.person_id    and pe.deleted_at is null
  where m.deleted_at is null
) ms on ms.session_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_d0_1 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select gr.person_id, min(gr.guidance_date) as first_on
  from public.guidance_record gr
  join public.person pe on pe.id = gr.person_id and pe.deleted_at is null
  where gr.deleted_at is null
  group by gr.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_d0_2 as
select rp.code as period_code, count(ts.id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select t.* from public.training_session t
  join public.ref_training_topic rt on rt.id = t.topic_id and rt.is_food_processing
  where t.deleted_at is null and t.is_delivered
) ts on ts.end_date between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_e0_2 as
select rp.code as period_code, count(f.person_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select er.person_id, min(e.start_date) as first_on
  from public.exhibition_registration er
  join public.exhibition e  on e.id  = er.exhibition_id and e.deleted_at is null
  join public.person      pe on pe.id = er.person_id     and pe.deleted_at is null
  where er.status = 'approved' and er.deleted_at is null
  group by er.person_id
) f on f.first_on between rp.start_date and rp.end_date
group by rp.code;

create or replace view public.v_ind_g0_4 as
select rp.code as period_code,
       count(distinct c.partner_id)::numeric as actual, null::numeric as denominator
from public.reporting_period rp
left join (
  select pc.contributed_on, pa.partner_id
  from public.partner_contribution pc
  join public.partnership pa on pa.id = pc.partnership_id and pa.deleted_at is null
  join public.partner     pr on pr.id = pa.partner_id     and pr.deleted_at is null
  where pc.deleted_at is null
) c on c.contributed_on between rp.start_date and rp.end_date
group by rp.code;

-- disaggregation: same parent filters, so the breakdown reconciles against the
-- headline figures after a soft delete as well as before one
create or replace view public.v_indicator_disaggregated as
with people as (
  select 'A1.3'::text as code, rp.code as period_code, f.person_id
  from public.reporting_period rp
  join (
    select te.person_id, min(coalesce(te.decided_on, te.registered_on)) as first_on
    from public.training_enrolment te
    join public.person pe           on pe.id = te.person_id  and pe.deleted_at is null
    join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null
    where te.met_criteria is true and te.deleted_at is null
    group by te.person_id
  ) f on f.first_on between rp.start_date and rp.end_date
  union all
  select 'B1.2', rp.code, f.person_id
  from public.reporting_period rp
  join (
    select os.person_id, min(os.service_date) as first_on
    from public.office_service os
    join public.person pe on pe.id = os.person_id and pe.deleted_at is null
    where os.deleted_at is null
    group by os.person_id
  ) f on f.first_on between rp.start_date and rp.end_date
  union all
  select 'D0.1', rp.code, f.person_id
  from public.reporting_period rp
  join (
    select gr.person_id, min(gr.guidance_date) as first_on
    from public.guidance_record gr
    join public.person pe on pe.id = gr.person_id and pe.deleted_at is null
    where gr.deleted_at is null
    group by gr.person_id
  ) f on f.first_on between rp.start_date and rp.end_date
  union all
  select 'E0.2', rp.code, f.person_id
  from public.reporting_period rp
  join (
    select er.person_id, min(e.start_date) as first_on
    from public.exhibition_registration er
    join public.exhibition e  on e.id  = er.exhibition_id and e.deleted_at is null
    join public.person      pe on pe.id = er.person_id     and pe.deleted_at is null
    where er.status = 'approved' and er.deleted_at is null
    group by er.person_id
  ) f on f.first_on between rp.start_date and rp.end_date
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
where auth.uid() is null
   or public.is_staff()
   or public.current_role() = 'partner_viewer'
group by 1,2,3,4,5,6;
