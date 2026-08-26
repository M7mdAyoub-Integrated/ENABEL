-- 0019 role guard on the disaggregated view + move pg_trgm out of public
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
where auth.uid() is null
   or public.is_staff()
   or public.current_role() = 'partner_viewer'
group by 1,2,3,4,5,6;

revoke all on public.v_indicator_disaggregated from anon;
grant select on public.v_indicator_disaggregated to authenticated;

-- keep public clean; Supabase provisions an `extensions` schema for this
alter extension pg_trgm set schema extensions;
