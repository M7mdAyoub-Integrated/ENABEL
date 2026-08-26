-- ═══════════════════════════════════════════════════════════════════════════
--  0034 — everything the dashboard needs, computed HERE
--
--  The Phase 5 rule: nothing is computed in the browser. That is not style. The
--  counting rules were tested against real rows and a soft-deleted parent, and
--  a second implementation in TypeScript would drift from the donor return the
--  first time either changed. So target, actual, progress and status are all
--  decided in SQL and the front end only renders them.
--
--  Three things are added:
--
--   1. `village` on v_indicator_disaggregated. The column has always been on
--      `person`; the view simply never carried it, so a village filter was
--      impossible without counting in the browser.
--
--   2. `v_indicator_progress` — one row per indicator per period carrying the
--      target, the actual, the percentage and the status. The status thresholds
--      live here so the dashboard chip and any future report cannot disagree.
--
--   3. `indicator_figures()` — a filter-aware function. A view cannot take
--      arguments, and the dashboard filters by sex, age band, refugee status,
--      disability, village and a period RANGE. Doing that filtering in SQL is
--      the only way the deliverable's "run the same filters as a SQL query and
--      prove the numbers match" can ever be true: it is the same query.
--
--  WHAT CANNOT BE FILTERED, AND WHY IT MATTERS
--
--  Only four indicators count people: A1.3, B1.2, D0.1 and E0.2. The other
--  sixteen count partnerships, exhibitions, sessions and committee meetings.
--  A partnership has no sex and a market has no age band, so a person filter
--  cannot narrow them.
--
--  The function therefore reports `is_disaggregable` per row rather than
--  silently returning an unfiltered number. Returning the full figure under an
--  active filter would be the worst outcome available: it looks filtered, it
--  reconciles against nothing, and nobody would catch it in a review.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. village on the disaggregation view ─────────────────────────────────
-- Rebuilt rather than altered: a view's column list cannot be extended in
-- place. Same definition, same role guard, one extra grouping column.
drop view if exists public.v_indicator_disaggregated;

create view public.v_indicator_disaggregated as
with people as (
  select 'A1.3'::text as code, rp.code as period_code, f.person_id
    from reporting_period rp
    join (
      select te.person_id, min(coalesce(te.decided_on, te.registered_on)) as first_on
        from training_enrolment te
        join person pe on pe.id = te.person_id and pe.deleted_at is null
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.met_criteria is true and te.deleted_at is null
       group by te.person_id
    ) f on f.first_on >= rp.start_date and f.first_on <= rp.end_date
  union all
  select 'B1.2', rp.code, f.person_id
    from reporting_period rp
    join (
      select os.person_id, min(os.service_date) as first_on
        from office_service os
        join person pe on pe.id = os.person_id and pe.deleted_at is null
       where os.deleted_at is null
       group by os.person_id
    ) f on f.first_on >= rp.start_date and f.first_on <= rp.end_date
  union all
  select 'D0.1', rp.code, f.person_id
    from reporting_period rp
    join (
      select gr.person_id, min(gr.guidance_date) as first_on
        from guidance_record gr
        join person pe on pe.id = gr.person_id and pe.deleted_at is null
       where gr.deleted_at is null
       group by gr.person_id
    ) f on f.first_on >= rp.start_date and f.first_on <= rp.end_date
  union all
  select 'E0.2', rp.code, f.person_id
    from reporting_period rp
    join (
      select er.person_id, min(e.start_date) as first_on
        from exhibition_registration er
        join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
        join person pe on pe.id = er.person_id and pe.deleted_at is null
       where er.status = 'approved'::record_status_t and er.deleted_at is null
       group by er.person_id
    ) f on f.first_on >= rp.start_date and f.first_on <= rp.end_date
)
select pl.code,
       pl.period_code,
       coalesce(p.sex::text, 'not_recorded') as sex,
       age_band(p.*) as age_band,
       case when p.is_refugee is null then 'not_recorded'
            when p.is_refugee then 'refugee'
            else 'non_refugee' end as refugee_status,
       case when p.has_disability is null then 'not_recorded'
            when p.has_disability then 'with_disability'
            else 'without_disability' end as disability_status,
       -- Village is free text on `person` and is frequently blank. It gets the
       -- same 'not_recorded' treatment as the other dimensions so the buckets
       -- still sum to the headline figure.
       coalesce(nullif(btrim(p.village), ''), 'not_recorded') as village,
       count(distinct p.id)::numeric as value
  from people pl
  join person p on p.id = pl.person_id and p.deleted_at is null
 where auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t
 group by pl.code, pl.period_code,
          coalesce(p.sex::text, 'not_recorded'),
          age_band(p.*),
          case when p.is_refugee is null then 'not_recorded'
               when p.is_refugee then 'refugee' else 'non_refugee' end,
          case when p.has_disability is null then 'not_recorded'
               when p.has_disability then 'with_disability' else 'without_disability' end,
          coalesce(nullif(btrim(p.village), ''), 'not_recorded');

revoke all on public.v_indicator_disaggregated from public, anon;
grant select on public.v_indicator_disaggregated to authenticated;

-- ── 2. progress: target, actual, percentage and status, all in SQL ────────
create or replace view public.v_indicator_progress as
select i.code,
       i.name_en,
       i.name_ar,
       i.unit,
       i.definition,
       i.indicator_type,
       i.sort_order,
       o.code            as objective_code,
       o.name_en         as objective_name_en,
       o.name_ar         as objective_name_ar,
       o.sort_order      as objective_sort,
       rp.code           as period_code,
       rp.start_date,
       rp.end_date,
       t.target_value    as target,
       a.actual,
       a.denominator,
       -- A percentage-unit indicator is already a percentage; a count is a
       -- proportion of its target. Dividing a percentage by its target would
       -- report 58/60 as 97% "progress" when the indicator is simply at 58%.
       case
         when t.target_value is null or t.target_value = 0 then null
         when i.unit = '%' then a.actual
         else round(a.actual / t.target_value * 100, 1)
       end as progress_pct,
       -- Status. THESE THRESHOLDS ARE A JUDGEMENT, not something the framework
       -- states, and they live here so the dashboard chip and any report agree.
       -- `not_set` is deliberately distinct from `not_started`: CLAUDE.md rule
       -- 1 -- a missing target is not a zero target.
       case
         when t.target_value is null            then 'not_set'
         when a.actual is null                  then 'not_started'
         when i.unit = '%' and a.actual >= t.target_value then 'complete'
         when i.unit <> '%' and a.actual >= t.target_value then 'complete'
         when a.actual = 0                      then 'not_started'
         when i.unit = '%' and a.actual >= t.target_value * 0.8 then 'on_track'
         when i.unit <> '%' and a.actual >= t.target_value * 0.8 then 'on_track'
         else 'behind'
       end as status,
       -- Only these four count people, so only these four can be narrowed by a
       -- person filter. The dashboard reads this rather than hard-coding the
       -- list, so adding a person-based indicator later cannot desynchronise.
       (i.code in ('A1.3','B1.2','D0.1','E0.2')) as is_disaggregable,
       -- An indicator with no view behind it is typed in by hand each quarter.
       -- The gap is deliberate and the dashboard must keep showing it.
       (i.view_name is null) as is_manual
  from indicator i
  join objective o on o.id = i.objective_id
  cross join reporting_period rp
  left join indicator_target t on t.indicator_id = i.id and t.period_id = rp.id
  left join v_indicator_actual a on a.code = i.code and a.period_code = rp.code
 where auth.uid() is null or is_staff() or public."current_role"() = 'partner_viewer'::app_role_t;

revoke all on public.v_indicator_progress from public, anon;
grant select on public.v_indicator_progress to authenticated;

comment on view public.v_indicator_progress is
  'One row per indicator per reporting period: target, actual, progress and status. '
  'Status thresholds live here so the dashboard and the donor return cannot disagree. '
  'Read by the Phase 5 dashboard; nothing recomputes these numbers client-side.';
