-- ═══════════════════════════════════════════════════════════════════════════
--  0036 — is_manual is about the FORMS, not the views
--
--  0034 derived "no form yet" from `indicator.view_name is null`. That is wrong:
--  every one of the twenty has a view, because every one is computed in the
--  database. What eight of them lack is a way to GET the data in -- there is no
--  data-collection form behind `milestone`, `office_service`,
--  `mentorship_session`, `training_session`, `promotional_action`,
--  `coordination_meeting` or `case_study`, so a coordinator types the figure in
--  by hand each quarter.
--
--  That gap is deliberate and the dashboard is required to keep showing it, so
--  the signal has to be right. It is expressed as the set of source tables the
--  seven built forms actually write to; anything outside that set is hand-keyed.
--  When a form is built for one of them, its table joins this list and the grey
--  row turns black on its own.
-- ═══════════════════════════════════════════════════════════════════════════

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
       case
         when t.target_value is null or t.target_value = 0 then null
         when i.unit = '%' then a.actual
         else round(a.actual / t.target_value * 100, 1)
       end as progress_pct,
       case
         when t.target_value is null      then 'not_set'
         when a.actual is null            then 'not_started'
         when a.actual >= t.target_value  then 'complete'
         when a.actual = 0                then 'not_started'
         when a.actual >= t.target_value * 0.8 then 'on_track'
         else 'behind'
       end as status,
       (i.code in ('A1.3','B1.2','D0.1','E0.2')) as is_disaggregable,
       -- The six tables the seven built forms write to. Everything else is
       -- hand-keyed on the Manual entries screen.
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
