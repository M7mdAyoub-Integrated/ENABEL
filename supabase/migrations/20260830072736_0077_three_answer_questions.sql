-- ═══════════════════════════════════════════════════════════════════════════
--  0077 — two questions with three answers were stored as booleans
--
--  ── THE SWEEP ──
--
--  Every boolean on followup_survey, checked against its question in the sheet:
--
--    q14_used_office            THREE answers   defect
--    q18_started_after_support  THREE answers   defect
--    q30_is_overridden          a flag, not an answer -- correct as a boolean
--
--  Exactly two. q30_is_overridden records whether the enumerator overrode the
--  derived market count; it is not a question and stays as it is.
--
--  ── WHAT WAS BEING THROWN AWAY ──
--
--  Q14 is "Have you used the municipal agricultural advisory and technical
--  office?" and its third answer is *I was not aware it exists*. Folded into
--  false, that becomes indistinguishable from "I knew about it and chose not
--  to" -- and those are different findings with different remedies. Only one of
--  them is the Municipality's to fix. B1.1 and G0.1 exist to establish that
--  office; whether people know it is there is exactly what year one is for.
--
--  Q18's three answers are *Started after receiving support* / *Existed before,
--  strengthened after support* / *Existed before, no change*. A boolean keeps
--  "started after" and loses the difference between strengthening something and
--  changing nothing -- which is the whole question.
--
--  ── WHY TEXT-WITH-A-CHECK AND NOT A SIDE TABLE ──
--
--  q08_applied_knowledge, q16_advice_useful, q17_activity_status,
--  q34_connection_made and q37_still_engaged are already text with a check
--  constraint, for the same reason. Two shapes for one kind of answer is how a
--  question ends up half in one place and half in another.
--
--  ── AND B1 DOES NOT MOVE. CHECKED, NOT ASSUMED. ──
--
--  v_ind_b1's denominator is `q14_used_office IS TRUE` -- a POSITIVE test. It
--  becomes `= 'yes'`. Today false and null are both excluded; afterwards 'no'
--  and 'not_aware' are both excluded. Same rows, same figure.
--
--  That is the thing worth checking. Had the denominator been `IS NOT FALSE` or
--  `IS DISTINCT FROM FALSE`, this conversion would have pulled nulls in and
--  moved B1 silently. It is not, so it does not.
--
--  Only v_ind_b1 filters on either column. The other three v_ind_* views merely
--  mention them, because their subqueries `select s.*` -- the same reason an
--  ilike for `status` matched all four in 0072. Nothing else reads either one:
--  no function does, and followup_survey has no rows.
--
--  ── THE VIEWS HAVE TO BE DROPPED AND PUT BACK, AND ALL FOUR OF THEM ──
--
--  A column type cannot change while a view depends on it. The first attempt at
--  this migration dropped only v_ind_b1 and was refused:
--
--    rule _RETURN on view v_ind_a1 depends on column "q14_used_office"
--
--  A1 has nothing to do with Q14. It depends on the column because its
--  subquery is `select s.*`, which pulls in every column of followup_survey
--  whether the view uses it or not.
--
--  That is the same `select s.*` that put `status` into all four definitions
--  and made an ilike for it return true on views that never filtered it --
--  0072's false positive. One shortcut, two separate problems: a grep that
--  cannot tell a filter from a mention, and four views that must be dropped to
--  change a column three of them ignore.
--
--  So all four are recreated selecting ONLY the columns they use. After this,
--  each depends on its own answer column and nothing else, and a definition
--  mentions a column only where it means something.
--
--  Their grants are restored exactly as found -- including the write privileges
--  `authenticated` holds on the two aggregate views. Those are inert on a view
--  with a UNION and an aggregate, and tightening them is a privilege decision
--  that does not belong in a migration about two columns.
--
--  ── THE false -> ? PROBLEM, AND WHY IT IS SAFE HERE ──
--
--  A true q18 maps cleanly to 'after'. A FALSE cannot be mapped: it means
--  "existed before" without saying whether it was strengthened, and no amount
--  of care recovers which. It maps to NULL, and that is only acceptable
--  because followup_survey is empty -- verified before writing this. On a table
--  with rows, this migration would need the Coordinator to decide.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.v_indicator_progress;
drop view if exists public.v_indicator_actual;
drop view if exists public.v_ind_b1;
drop view if exists public.v_ind_a1;
drop view if exists public.v_ind_c1;
drop view if exists public.v_ind_imp_0;

alter table public.followup_survey
  alter column q14_used_office type text
    using case when q14_used_office then 'yes'
               when not q14_used_office then 'no'
          end;

alter table public.followup_survey
  add constraint followup_survey_q14_used_office_check
    check (q14_used_office = any (array['yes','no','not_aware']));

comment on column public.followup_survey.q14_used_office is
  'Q14. THREE answers: yes / no / not_aware. Was a boolean until 0077, which '
  'made "I was not aware it exists" indistinguishable from "I knew and chose '
  'not to" -- different findings, and only one of them is the Municipality''s '
  'to fix. B1''s denominator is = ''yes''.';

alter table public.followup_survey
  alter column q18_started_after_support type text
    using case when q18_started_after_support then 'after' end;

alter table public.followup_survey
  add constraint followup_survey_q18_started_after_support_check
    check (q18_started_after_support = any
           (array['after','before_strengthened','before_no_change']));

comment on column public.followup_survey.q18_started_after_support is
  'Q18. THREE answers: after / before_strengthened / before_no_change. Was a '
  'boolean until 0077, which kept "started after" and lost the difference '
  'between strengthening an existing activity and changing nothing.';

-- ── v_ind_b1, with the denominator following the column ─────────────────────
create view public.v_ind_b1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q16_advice_useful = any (array['very','somewhat'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    -- Only the columns this view uses. See the header: `select s.*` is what
    -- forced four views to be dropped to change two columns, and what made a
    -- grep for `status` match views that never filtered it.
    select s.id, s.contact_date, s.q16_advice_useful
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       -- Was `is true`. Same rows: 'no' and 'not_aware' are excluded exactly as
       -- false and null were.
       and s.q14_used_office = 'yes'
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

comment on view public.v_ind_b1 is
  'Percentage finding office advice useful, of those who used it. Submitted and '
  'approved only (0072). Denominator is q14_used_office = ''yes'' since 0077 -- '
  'the same rows the boolean `is true` selected.';

-- ── A1, C1 and IMP-0: unchanged logic, narrowed select ──────────────────────
create view public.v_ind_a1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q08_applied_knowledge = any (array['regularly','occasionally'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.id, s.contact_date, s.q08_applied_knowledge
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.q08_applied_knowledge is not null
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

comment on view public.v_ind_a1 is
  'Percentage applying what they learned. Submitted and approved only (0072).';

create view public.v_ind_c1 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q17_activity_status = any (array['expanded','same','reduced'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.id, s.contact_date, s.q17_activity_status
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.q17_activity_status is not null
       and exists (
         select 1 from production_initiative pi
          where pi.person_id = s.person_id
            and pi.deleted_at is null
            and pi.started_on <= (s.contact_date - interval '6 mons')
       )
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

comment on view public.v_ind_c1 is
  'Percentage of initiatives still operating six months on. Submitted and '
  'approved only (0072). The EXISTS makes "six months on" true of the '
  'initiative, not of the interview.';

create view public.v_ind_imp_0 as
select rp.code as period_code,
       case when count(s.id) = 0 then null::numeric
            else round(100.0 * count(*) filter (
                   where s.q37_still_engaged = any (array['main','secondary'])
                 )::numeric / count(s.id)::numeric, 1)
       end as actual,
       count(s.id)::numeric as denominator
  from reporting_period rp
  left join (
    select s.id, s.contact_date, s.q37_still_engaged
      from followup_survey s
      join person pe on pe.id = s.person_id and pe.deleted_at is null
     where s.deleted_at is null
       and s.status = any (array['submitted','approved']::record_status_t[])
       and s.round = 'twelve_month'::followup_round_t
       and s.q37_still_engaged is not null
  ) s on s.contact_date >= rp.start_date and s.contact_date <= rp.end_date
 group by rp.code;

comment on view public.v_ind_imp_0 is
  'Percentage still engaged at twelve months. Submitted and approved only (0072).';

-- ── the two aggregate views, restored unchanged ─────────────────────────────
create view public.v_indicator_actual as
select code, period_code, actual, denominator
  from (
    select 'IMP-0'::text as code, period_code, actual, denominator from v_ind_imp_0
    union all select 'A1'::text,   period_code, actual, denominator from v_ind_a1
    union all select 'A1.2'::text, period_code, actual, denominator from v_ind_a1_2
    union all select 'A1.3'::text, period_code, actual, denominator from v_ind_a1_3
    union all select 'B1'::text,   period_code, actual, denominator from v_ind_b1
    union all select 'B1.1'::text, period_code, actual, denominator from v_ind_b1_1
    union all select 'B1.2'::text, period_code, actual, denominator from v_ind_b1_2
    union all select 'C1'::text,   period_code, actual, denominator from v_ind_c1
    union all select 'C1.1'::text, period_code, actual, denominator from v_ind_c1_1
    union all select 'C1.2'::text, period_code, actual, denominator from v_ind_c1_2
    union all select 'C1.3'::text, period_code, actual, denominator from v_ind_c1_3
    union all select 'D0.1'::text, period_code, actual, denominator from v_ind_d0_1
    union all select 'D0.2'::text, period_code, actual, denominator from v_ind_d0_2
    union all select 'E0.1'::text, period_code, actual, denominator from v_ind_e0_1
    union all select 'E0.2'::text, period_code, actual, denominator from v_ind_e0_2
    union all select 'F0.1'::text, period_code, actual, denominator from v_ind_f0_1
    union all select 'G0.1'::text, period_code, actual, denominator from v_ind_g0_1
    union all select 'G0.2'::text, period_code, actual, denominator from v_ind_g0_2
    union all select 'G0.3'::text, period_code, actual, denominator from v_ind_g0_3
    union all select 'G0.4'::text, period_code, actual, denominator from v_ind_g0_4
  ) x
 where auth.uid() is null or is_staff() or "current_role"() = 'partner_viewer'::app_role_t;

create view public.v_indicator_progress as
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
         'followup_survey'::text,'partner_contribution'::text]) as is_manual
  from indicator i
  join objective o on o.id = i.objective_id
  cross join reporting_period rp
  left join indicator_target t on t.indicator_id = i.id and t.period_id = rp.id
  left join v_indicator_actual a on a.code = i.code and a.period_code = rp.code
 where auth.uid() is null or is_staff() or "current_role"() = 'partner_viewer'::app_role_t;

-- Restored exactly as found, including the inert write privileges.
grant all on public.v_indicator_actual   to authenticated;
grant all on public.v_indicator_progress to authenticated;
