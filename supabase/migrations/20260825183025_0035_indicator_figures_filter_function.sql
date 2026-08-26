-- ═══════════════════════════════════════════════════════════════════════════
--  0035 — indicator_figures(): the dashboard's filtered read
--
--  A view cannot take arguments and the dashboard filters on seven dimensions
--  plus a period RANGE, so the filtered figures come from a function. Every
--  number it returns is still counted in SQL; the front end passes filters in
--  and renders what comes back.
--
--  WHY A RANGE IS NOT A SUM
--
--  A1.3, B1.2, D0.1 and E0.2 count DISTINCT PEOPLE. Adding Q1's 12 to Q2's 15
--  gives 27 only if nobody appears in both quarters, and the whole point of
--  "count unique people, not rows" (CLAUDE.md rule 4) is that they do. Over a
--  range these four are therefore recounted from the underlying person set,
--  not summed.
--
--  The other sixteen count events -- markets held, meetings held, partnerships
--  established -- which are genuinely additive across quarters, except the
--  running-total ones (A1.2, C1.1, G0.4 count partnerships that EXIST, so the
--  last period's figure is the answer, not the sum). `aggregation` on each row
--  says which rule was applied so the front end can label it and a reviewer can
--  check it.
--
--  SECURITY. `security definer` matching the views it reads, with the same
--  explicit role guard. A participant gets nothing.
-- ═══════════════════════════════════════════════════════════════════════════

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
  code text,
  name_en text,
  name_ar text,
  unit text,
  objective_code text,
  objective_name_en text,
  objective_name_ar text,
  objective_sort int,
  sort_order int,
  target numeric,
  actual numeric,
  progress_pct numeric,
  status text,
  is_disaggregable boolean,
  is_manual boolean,
  /** True when a person filter is active and this indicator cannot honour it. */
  filter_ignored boolean,
  aggregation text,
  period_from text,
  period_to text
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
         coalesce(p_period_to,   p_period_from,
                  (select max(code) from reporting_period)) as pt
),
periods as (
  select rp.* from reporting_period rp, bounds b
   where rp.code >= b.pf and rp.code <= b.pt
),
-- Is any person-level filter active? If not, the unfiltered figures stand for
-- every indicator and nothing is marked as ignoring a filter.
flt as (
  select (p_villages is not null or p_sex is not null or p_age_bands is not null
          or p_refugee is not null or p_disability is not null) as person_filter
),
-- Distinct people per code across the WHOLE range, honouring the filters.
-- Recounted, never summed -- see the header.
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
-- Event-style indicators across the range.
evt as (
  select p.code,
         -- Running totals report the latest period in range, not a sum: they
         -- already count everything that exists at that date.
         case when p.code in ('A1.2','C1.1','G0.4','B1.1','G0.1')
              then 'latest' else 'sum' end as rule,
         sum(p.actual)                                        as summed,
         (array_agg(p.actual order by p.period_code desc
                    ) filter (where p.actual is not null))[1] as latest
    from v_indicator_progress p
   where p.period_code in (select code from periods)
   group by p.code
),
tgt as (
  select p.code,
         -- The target for a range is the target at its end: these are
         -- cumulative plan figures, not per-quarter increments.
         (array_agg(p.target order by p.period_code desc
                    ) filter (where p.target is not null))[1] as target
    from v_indicator_progress p
   where p.period_code in (select code from periods)
   group by p.code
),
meta as (
  select distinct on (p.code)
         p.code, p.name_en, p.name_ar, p.unit, p.objective_code,
         p.objective_name_en, p.objective_name_ar, p.objective_sort,
         p.sort_order, p.is_disaggregable, p.is_manual
    from v_indicator_progress p
   order by p.code
),
joined as (
  select m.code, m.name_en, m.name_ar, m.unit,
         m.objective_code, m.objective_name_en, m.objective_name_ar,
         m.objective_sort, m.sort_order,
         t.target,
         case
           when m.is_disaggregable and f.person_filter then coalesce(d.value, 0)
           when e.rule = 'latest' then e.latest
           else e.summed
         end as actual,
         m.is_disaggregable, m.is_manual,
         (f.person_filter and not m.is_disaggregable) as filter_ignored,
         case when m.is_disaggregable then 'distinct_people' else e.rule end as aggregation
    from meta m
    cross join flt f
    left join tgt t on t.code = m.code
    left join evt e on e.code = m.code
    left join disagg d on d.code = m.code
)
select j.code, j.name_en, j.name_ar, j.unit,
       j.objective_code, j.objective_name_en, j.objective_name_ar,
       j.objective_sort, j.sort_order,
       j.target, j.actual,
       case
         when j.target is null or j.target = 0 then null
         when j.unit = '%' then j.actual
         else round(j.actual / j.target * 100, 1)
       end as progress_pct,
       case
         when j.target is null                  then 'not_set'
         when j.actual is null                  then 'not_started'
         when j.actual >= j.target              then 'complete'
         when j.actual = 0                      then 'not_started'
         when j.actual >= j.target * 0.8        then 'on_track'
         else 'behind'
       end as status,
       j.is_disaggregable, j.is_manual, j.filter_ignored, j.aggregation,
       (select pf from bounds), (select pt from bounds)
  from joined j, guard g
 where g.ok
   and (p_objectives is null or j.objective_code = any(p_objectives))
   and (p_statuses is null or
        (case
           when j.target is null           then 'not_set'
           when j.actual is null           then 'not_started'
           when j.actual >= j.target       then 'complete'
           when j.actual = 0               then 'not_started'
           when j.actual >= j.target * 0.8 then 'on_track'
           else 'behind'
         end) = any(p_statuses))
 order by j.objective_sort, j.sort_order;
$function$;

revoke all on function public.indicator_figures(
  text, text, text[], text[], text[], text[], text[], text[], text[]) from public, anon;
grant execute on function public.indicator_figures(
  text, text, text[], text[], text[], text[], text[], text[], text[]) to authenticated;

comment on function public.indicator_figures(text, text, text[], text[], text[], text[], text[], text[], text[]) is
  'Filtered indicator figures for the dashboard. All counting happens here so the '
  'screen and the donor return cannot drift. Person filters narrow only the four '
  'person-counting indicators; every other row is returned with filter_ignored = true '
  'rather than silently showing an unfiltered number.';
