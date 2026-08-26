-- ═══════════════════════════════════════════════════════════════════════════
--  0040 — overview_counts(): the headline tallies for the overview tab
--
--  Deliberately NOT indicator figures. These answer "what is in my system",
--  which is a different question from "how are we doing against target", and
--  conflating them is how a coordinator ends up reading a plan figure as an
--  operational one.
--
--  Every count is a distinct-person or distinct-row count done here, honouring
--  the same person filters the indicator function takes so the two tabs agree
--  when the same filter is on.
--
--  `security definer` with the standard role guard, matching the indicator
--  views: these are aggregates with no names in them, so a partner_viewer may
--  read them. The ACTIVITY FEED is the one that names people and it is invoker.
-- ═══════════════════════════════════════════════════════════════════════════

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
  people_total bigint,
  people_in_period bigint,
  trainings_completed bigint,
  markets_held bigint,
  markets_upcoming bigint,
  partners_active bigint,
  registrations_pending bigint,
  villages_reached bigint,
  followups_done bigint
)
language sql
stable
security definer
set search_path to public
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
    from reporting_period rp, bounds b
   where rp.code >= b.pf and rp.code <= b.pt
),
-- People matching the demographic filters. One place, reused by every count
-- below, so a filter cannot apply to one tally and not another.
eligible as (
  select p.id, p.village
    from person p
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
  -- Someone is "in the period" if any of their records falls inside it. The
  -- person table has no join date of its own, so first contact is derived.
  (select count(distinct a.id) from eligible a
     join v_recent_activity r on r.subject is not null
     where exists (
       select 1 from person p2 where p2.id = a.id and p2.full_name = r.subject
     )
     and r.happened_on between (select d_from from window_dates)
                           and (select d_to from window_dates)),
  (select count(distinct te.person_id)
     from training_enrolment te join eligible e on e.id = te.person_id
    where te.deleted_at is null and te.met_criteria is true
      and coalesce(te.decided_on, te.registered_on)
          between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e
    where e.deleted_at is null and e.end_date < current_date
      and e.start_date between (select d_from from window_dates) and (select d_to from window_dates)),
  (select count(*) from exhibition e
    where e.deleted_at is null and e.end_date >= current_date),
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
