-- ═══════════════════════════════════════════════════════════════════════════
--  0041 — the activity feed carries person_id, and the overview joins on it
--
--  0040 worked out "people active in this period" by joining the feed on
--  `full_name`. That is wrong for the obvious reason -- two people can share a
--  name, and in a municipality of four villages they will -- and it made the
--  count quietly depend on the spelling of a text field. The feed now carries
--  the person id it already had in hand, and the join uses it.
--
--  Dropped and recreated rather than replaced: `create or replace view` cannot
--  insert a column in the middle of the list.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.v_recent_activity;

create view public.v_recent_activity
with (security_invoker = true) as
  select 'training_completion'::text as kind, te.id,
         coalesce(te.decided_on, te.registered_on) as happened_on,
         te.person_id, p.full_name as subject, p.village,
         case when te.met_criteria is true then 'met'
              when te.met_criteria is false then 'not_met'
              else 'pending' end as detail,
         'tc'::text as module
    from training_enrolment te
    join person p on p.id = te.person_id and p.deleted_at is null
   where te.deleted_at is null
  union all
  select 'exhibition_registration', er.id, e.start_date, er.person_id, p.full_name, p.village,
         er.status::text, 'rg'
    from exhibition_registration er
    join person p on p.id = er.person_id and p.deleted_at is null
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.deleted_at is null
  union all
  select 'office_service', os.id, os.service_date, os.person_id, p.full_name, p.village, null, 'os'
    from office_service os
    join person p on p.id = os.person_id and p.deleted_at is null
   where os.deleted_at is null
  union all
  select 'guidance', gr.id, gr.guidance_date, gr.person_id, p.full_name, p.village, null, 'gr'
    from guidance_record gr
    join person p on p.id = gr.person_id and p.deleted_at is null
   where gr.deleted_at is null
  union all
  select 'followup', fs.id, fs.contact_date, fs.person_id, p.full_name, p.village, fs.status::text, 'fu'
    from followup_survey fs
    join person p on p.id = fs.person_id and p.deleted_at is null
   where fs.deleted_at is null
  union all
  select 'market_linkage', ml.id, ml.linked_on, null::uuid, pt.name, null, null, 'ln'
    from market_linkage ml
    join partnership ps on ps.id = ml.partnership_id and ps.deleted_at is null
    join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
   where ml.deleted_at is null
  union all
  select 'exhibition_held', e.id, e.end_date, null::uuid, e.name, e.location, null, 'ex'
    from exhibition e where e.deleted_at is null
  union all
  select 'partnership', ps.id, ps.established_on, null::uuid, pt.name, null,
         ps.partnership_type::text,
         case when ps.partnership_type = 'training' then 'tp' else 'pp' end
    from partnership ps
    join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
   where ps.deleted_at is null;

revoke all on public.v_recent_activity from public, anon;
grant select on public.v_recent_activity to authenticated;

comment on view public.v_recent_activity is
  'Dated feed across every operational form. security_invoker so RLS applies: a '
  'partner_viewer sees an empty feed because they cannot read person. Do not '
  'make this definer.';

create or replace function public.overview_counts(
  p_period_from text default null,
  p_period_to   text default null,
  p_villages    text[] default null,
  p_sex         text[] default null,
  p_age_bands   text[] default null,
  p_refugee     text[] default null,
  p_disability  text[] default null
)
returns table (
  people_total bigint, people_in_period bigint, trainings_completed bigint,
  markets_held bigint, markets_upcoming bigint, partners_active bigint,
  registrations_pending bigint, villages_reached bigint, followups_done bigint
)
language sql stable security definer set search_path to public
as $function$
with guard as (
  select (auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t) as ok
),
bounds as (
  select coalesce(p_period_from, (select min(code) from reporting_period)) as pf,
         coalesce(p_period_to, p_period_from, (select max(code) from reporting_period)) as pt
),
window_dates as (
  select min(rp.start_date) as d_from, max(rp.end_date) as d_to
    from reporting_period rp, bounds b where rp.code >= b.pf and rp.code <= b.pt
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
     from v_recent_activity r
     join eligible e on e.id = r.person_id
    where r.happened_on between (select d_from from window_dates)
                            and (select d_to from window_dates)),
  (select count(distinct te.person_id)
     from training_enrolment te join eligible e on e.id = te.person_id
    where te.deleted_at is null and te.met_criteria is true
      and coalesce(te.decided_on, te.registered_on)
          between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e
    where e.deleted_at is null and e.end_date < current_date
      and e.start_date between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e where e.deleted_at is null and e.end_date >= current_date),
  (select count(*) from partnership ps
     join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
    where ps.deleted_at is null and ps.is_active),
  (select count(*) from exhibition_registration er
    where er.deleted_at is null and er.status = 'submitted'::record_status_t),
  (select count(distinct coalesce(nullif(btrim(e.village), ''), 'not_recorded')) from eligible e),
  (select count(distinct fs.person_id)
     from followup_survey fs join eligible e on e.id = fs.person_id
    where fs.deleted_at is null
      and fs.contact_date between (select d_from from window_dates) and (select d_to from window_dates))
from guard g where g.ok;
$function$;

revoke all on function public.overview_counts(
  text, text, text[], text[], text[], text[], text[]) from public, anon;
grant execute on function public.overview_counts(
  text, text, text[], text[], text[], text[], text[]) to authenticated;
