-- ═══════════════════════════════════════════════════════════════════════════
--  0037 — a target of zero is not an achievement
--
--  Spotted on the live dashboard: A1.2 and B1.1 in 27/Q4 have target 0 and
--  actual 0, and `actual >= target` marked them COMPLETE. A donor reading a
--  green "Complete" against a quarter where nothing was planned and nothing
--  happened is being told something untrue.
--
--  03_INDICATORS.md is careful about this: "Blank means no target in that
--  quarter, which is not the same as zero." Both are still true here -- a zero
--  target means "no delivery expected this quarter", a null means "the workbook
--  gives no figure". Neither is something you can complete, so both now report
--  `not_set`, which is what `progress_pct` already did for target = 0.
--
--  Applied in both places the status is decided, so the table and the filter
--  cannot disagree.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_indicator_progress as
select i.code, i.name_en, i.name_ar, i.unit, i.definition, i.indicator_type, i.sort_order,
       o.code as objective_code, o.name_en as objective_name_en, o.name_ar as objective_name_ar,
       o.sort_order as objective_sort,
       rp.code as period_code, rp.start_date, rp.end_date,
       t.target_value as target, a.actual, a.denominator,
       case
         when t.target_value is null or t.target_value = 0 then null
         when i.unit = '%' then a.actual
         else round(a.actual / t.target_value * 100, 1)
       end as progress_pct,
       case
         when t.target_value is null or t.target_value = 0 then 'not_set'
         when a.actual is null                  then 'not_started'
         when a.actual >= t.target_value        then 'complete'
         when a.actual = 0                      then 'not_started'
         when a.actual >= t.target_value * 0.8  then 'on_track'
         else 'behind'
       end as status,
       (i.code in ('A1.3','B1.2','D0.1','E0.2')) as is_disaggregable,
       (i.data_source not in (
          'partnership', 'training_enrolment', 'market_linkage',
          'exhibition', 'exhibition_registration', 'followup_survey',
          'partner_contribution'
        )) as is_manual
  from indicator i
  join objective o on o.id = i.objective_id
  cross join reporting_period rp
  left join indicator_target t on t.indicator_id = i.id and t.period_id = rp.id
  left join v_indicator_actual a on a.code = i.code and a.period_code = rp.code
 where auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t;

revoke all on public.v_indicator_progress from public, anon;
grant select on public.v_indicator_progress to authenticated;

-- The same rule inside the filter function.
create or replace function public.indicator_figures(
  p_period_from text default null,
  p_period_to   text default null,
  p_objectives  text[] default null,
  p_villages    text[] default null,
  p_sex         text[] default null,
  p_age_bands   text[] default null,
  p_refugee     text[] default null,
  p_disability  text[] default null,
  p_statuses    text[] default null
)
returns table (
  code text, name_en text, name_ar text, unit text,
  objective_code text, objective_name_en text, objective_name_ar text,
  objective_sort int, sort_order int,
  target numeric, actual numeric, progress_pct numeric, status text,
  is_disaggregable boolean, is_manual boolean, filter_ignored boolean,
  aggregation text, period_from text, period_to text
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
periods as (
  select rp.* from reporting_period rp, bounds b where rp.code >= b.pf and rp.code <= b.pt
),
flt as (
  select (p_villages is not null or p_sex is not null or p_age_bands is not null
          or p_refugee is not null or p_disability is not null) as person_filter
),
disagg as (
  select d.code, sum(d.value) as value
    from v_indicator_disaggregated d
   where d.period_code in (select code from periods)
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
   where p.period_code in (select code from periods)
   group by p.code
),
tgt as (
  select p.code,
         (array_agg(p.target order by p.period_code desc) filter (where p.target is not null))[1] as target
    from v_indicator_progress p
   where p.period_code in (select code from periods)
   group by p.code
),
meta as (
  select distinct on (p.code)
         p.code, p.name_en, p.name_ar, p.unit, p.objective_code,
         p.objective_name_en, p.objective_name_ar, p.objective_sort,
         p.sort_order, p.is_disaggregable, p.is_manual
    from v_indicator_progress p order by p.code
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
$function$;

revoke all on function public.indicator_figures(
  text, text, text[], text[], text[], text[], text[], text[], text[]) from public, anon;
grant execute on function public.indicator_figures(
  text, text, text[], text[], text[], text[], text[], text[], text[]) to authenticated;
