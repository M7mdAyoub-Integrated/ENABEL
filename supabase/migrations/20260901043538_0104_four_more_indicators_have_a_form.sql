-- 0104 four indicators stopped being hand-keyed and the dashboard did not notice
--
-- ── WHAT WAS WRONG ──
--
-- `is_manual` drives two things a coordinator reads as fact: the row is greyed
-- out, and the objective's heading carries "N without a form". It is the set of
-- `indicator.data_source` values that a built form writes to, and `0036` says
-- plainly what maintaining it means:
--
--     "When a form is built for one of them, its table joins this list and the
--      grey row turns black on its own."
--
-- Nobody performed that step. Four have since been built:
--
--     office_service       B1.2   /forms/os        weeks ago
--     training_session     D0.2   /sessions        weeks ago
--     guidance_record      D0.1   /forms/gd        today
--     mentorship_session   C1.3   /initiatives/:id today
--
-- So the dashboard has been telling a coordinator that B1.2 and D0.2 have no
-- form since the day they got one, greying out two indicators that are being
-- collected properly. This is `0036`'s own maintenance note going unread, not a
-- flaw in its design — the design is right, the list is a claim, and a claim
-- goes stale silently.
--
-- ── WHAT IS LEFT, AND IT IS EXACTLY /manual-entries ──
--
--     milestone            B1.1, G0.1
--     promotional_action   F0.1
--     coordination_meeting G0.2
--     case_study           G0.3
--
-- Five indicators, and those five are precisely what the manual-entries screen
-- handles. That correspondence is the check on this migration: if the two ever
-- disagree, one of them is lying to somebody.
--
-- ── WHY THE WHOLE VIEW IS RESTATED ──
--
-- `create or replace view` takes the whole body and silently reverts every later
-- change to it — CLAUDE.md's eighth failure. So: what has touched this view?
--
--     grep -l "view public.v_indicator_progress" supabase/migrations/*.sql
--     0034 created it, 0036 fixed is_manual, 0037 fixed the zero target,
--     0077 recreated it verbatim while repairing an unrelated drop.
--
-- The text below is `0077`'s, unchanged except for the `is_manual` array, and it
-- was diffed against `pg_get_viewdef` on the live database first rather than
-- trusted to be current.
create or replace view public.v_indicator_progress as
select i.code, i.name_en, i.name_ar, i.unit, i.definition, i.indicator_type, i.sort_order,
       o.code as objective_code, o.name_en as objective_name_en, o.name_ar as objective_name_ar,
       o.sort_order as objective_sort,
       rp.code as period_code, rp.start_date, rp.end_date,
       t.target_value as target, a.actual, a.denominator,
       case
         when t.target_value is null or t.target_value = 0::numeric then null::numeric
         when i.unit = '%'::text then a.actual
         else round(a.actual / t.target_value * 100::numeric, 1)
       end as progress_pct,
       case
         when t.target_value is null or t.target_value = 0::numeric then 'not_set'::text
         when a.actual is null then 'not_started'::text
         when a.actual >= t.target_value then 'complete'::text
         when a.actual = 0::numeric then 'not_started'::text
         when a.actual >= (t.target_value * 0.8) then 'on_track'::text
         else 'behind'::text
       end as status,
       i.code = any (array['A1.3'::text,'B1.2'::text,'D0.1'::text,'E0.2'::text]) as is_disaggregable,
       i.data_source <> all (array['partnership'::text,'training_enrolment'::text,
         'market_linkage'::text,'exhibition'::text,'exhibition_registration'::text,
         'followup_survey'::text,'partner_contribution'::text,
         'office_service'::text,'training_session'::text,
         'guidance_record'::text,'mentorship_session'::text]) as is_manual
  from indicator i
  join objective o on o.id = i.objective_id
  cross join reporting_period rp
  left join indicator_target t on t.indicator_id = i.id and t.period_id = rp.id
  left join v_indicator_actual a on a.code = i.code and a.period_code = rp.code
 where auth.uid() is null or is_staff() or "current_role"() = 'partner_viewer'::app_role_t;
