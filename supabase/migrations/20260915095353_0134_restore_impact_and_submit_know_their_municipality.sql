-- 0134 · the three functions that read reporting_period without saying whose
--
-- ── WHAT THE AUDIT ASKED, AND WHAT THE BODIES SAID ──
--
--  PLATFORM_AUDIT.md §2.1 named four functions as reading the indicator views
--  with no municipality filter of their own: followup_indicator_reach,
--  followup_view_statuses, person_restore_impact, submit_followup. Read line
--  by line, none of the four reads a row of any indicator view:
--
--    followup_view_statuses      pg_get_viewdef only. Metadata. Unchanged.
--    followup_indicator_reach    view DEFINITIONS (through the function above)
--                                plus base-table rows keyed by the survey id.
--                                Its one municipality-sensitive read -- the C1
--                                six-month test on production_initiative -- is
--                                the same unscoped test v_ind_c1 itself makes,
--                                and it exists so the preview and the figure
--                                cannot disagree. Scoping it alone would make
--                                them disagree. Unchanged; the view is noted
--                                in the report.
--    person_restore_impact       no view at all, but reporting_period and six
--                                base tables with no municipality anywhere.
--    submit_followup             reporting_period, unscoped, `limit 1`.
--
--  So the defect is not "reads a view unscoped", it is the 0114 bug class in
--  a function: `join reporting_period rp on <date> between rp.start_date and
--  rp.end_date`, written when there was one municipality. Since 0131 there
--  are two rows called 26/Q3.
--
-- ── MEASURED, NOT INFERRED ──
--
--  person_restore_impact for Demo Person One (300000001), 15 September 2026:
--
--    as coordinator@shm.test, through RLS      A1.3 1 · B1.2 1 · C1.2 1 · C1.3 2 · E0.2 1
--    as the owner, no JWT                       every row TWICE; C1.2 2, C1.3 4
--    as superadmin, no municipality chosen      the same doubling -- a signed-in
--                                               user, 26 periods visible
--
--  Through the restore screen a coordinator gets the right figures today only
--  because reporting_period's RLS hides the other municipality's 13 rows from
--  them. That is the gate protecting a query that does not protect itself.
--  A super admin who has not chosen a municipality is kept off the screen by
--  MunicipalityGate; through PostgREST directly the function answers double.
--  partner_restore_impact has the identical shape (same migration, 0107) and
--  the audit did not list it; the sweep below found it, and leaving a twin is
--  the half-correction CLAUDE.md's register warns about.
--
--  The sweep: every non-trigger function whose body (comments stripped)
--  mentions reporting_period and never mentions municipality. Exactly three:
--  partner_restore_impact, person_restore_impact, submit_followup.
--  review_followup (0118) already reads its period as
--  `rp.municipality_id = v_survey.municipality_id`, and that is the model.
--
-- ── WHAT CHANGES ──
--
--  person_restore_impact and partner_restore_impact gain
--  `p_municipality_id uuid default null`, resolved as
--  coalesce(p_municipality_id, my_municipality()) -- the same expression as
--  snapshot_period (0115) and indicator_figures (0118) -- and RAISE when that
--  is null, because a figure for no municipality is not a figure. Every join
--  carries it: reporting_period and each base table. A signature change, so
--  the old one-argument function is dropped first and both grants (0107)
--  re-applied. The app calls with the id alone and inherits the default.
--
--  submit_followup's period read gains `rp.municipality_id =
--  v_survey.municipality_id`: the survey's own municipality, as review_followup
--  does. One line; the body is otherwise 0098's, taken from
--  pg_get_functiondef and not from the file.
--
--  Grep before replacing: person_restore_impact and partner_restore_impact
--  were written once (0107); submit_followup was written by 0095, rewritten by
--  0096 and 0098, and 0099, 0100, 0107 and 0118 only mention it. The live body
--  is 0098's and that is what this file starts from.
--
-- ── WHAT DOES NOT CHANGE ──
--
--  No view, no figure. Both restore-impact functions stay security invoker, so
--  RLS still applies underneath the explicit filter -- the filter is there so
--  the answer does not depend on it. The verification block at the end runs
--  as the owner with the municipality passed explicitly and asserts that no
--  (code, period) pair comes back twice, which is exactly what failed before.

-- ── person_restore_impact ─────────────────────────────────────────────────

drop function if exists public.person_restore_impact(uuid);

create function public.person_restore_impact(p_person_id uuid, p_municipality_id uuid default null)
returns table(
  code        text,
  period_code text,
  delta       int,
  recomputed  boolean
)
language plpgsql
stable
set search_path = public, pg_temp
as $function$
declare
  v_muni uuid := coalesce(p_municipality_id, public.my_municipality());
begin
  -- The same refusal as snapshot_period: a service context, or a super admin
  -- who has not chosen a municipality, must say whose figures it wants. An
  -- empty result here would read as "restoring moves nothing", which is the
  -- one answer this function must never give by accident.
  if v_muni is null then
    raise exception 'person_restore_impact needs a municipality: pass p_municipality_id'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with
  -- A1.3 -- distinct person with a completion. v_ind_a1_3 dates it on
  -- min(coalesce(decided_on, registered_on)) across LIVE sessions.
  a13 as (
    select 'A1.3'::text as code,
           min(coalesce(te.decided_on, te.registered_on)) as on_date
      from training_enrolment te
      join training_session ts on ts.id = te.session_id and ts.deleted_at is null
     where te.person_id = p_person_id
       and te.municipality_id = v_muni
       and te.met_criteria is true
       and te.deleted_at is null
  ),
  -- B1.2 -- distinct person reaching the office, on their first visit.
  b12 as (
    select 'B1.2'::text, min(os.service_date)
      from office_service os
     where os.person_id = p_person_id
       and os.municipality_id = v_muni
       and os.deleted_at is null
  ),
  -- D0.1 -- distinct producer guided, on their first session.
  d01 as (
    select 'D0.1'::text, min(gr.guidance_date)
      from guidance_record gr
     where gr.person_id = p_person_id
       and gr.municipality_id = v_muni
       and gr.deleted_at is null
  ),
  -- E0.2 -- distinct producer with an APPROVED registration, dated on the
  -- exhibition's start_date, not the registration's.
  e02 as (
    select 'E0.2'::text, min(e.start_date)
      from exhibition_registration er
      join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
     where er.person_id = p_person_id
       and er.municipality_id = v_muni
       and er.status = 'approved'::record_status_t
       and er.deleted_at is null
  ),
  -- C1.2 counts INITIATIVES, not people, so this person may bring back more than
  -- one -- and they may fall in different quarters. Grouped by period rather than
  -- collapsed to a single min().
  c12 as (
    select 'C1.2'::text as code, rp.code as period_code, count(*)::int as delta
      from (
        select ml.initiative_id, min(ml.linked_on) as first_on
          from market_linkage ml
          join production_initiative pi on pi.id = ml.initiative_id and pi.deleted_at is null
         where pi.person_id = p_person_id
           and ml.municipality_id = v_muni
           and ml.status = any (array['active'::link_status_t, 'ended'::link_status_t])
           and ml.deleted_at is null
         group by ml.initiative_id
      ) f
      join reporting_period rp
        on rp.municipality_id = v_muni
       and f.first_on between rp.start_date and rp.end_date
     group by rp.code
  ),
  -- C1.3 counts SESSIONS. Same reasoning as C1.2, and more likely to span
  -- quarters because a mentorship run is spread over months.
  c13 as (
    select 'C1.3'::text as code, rp.code as period_code, count(*)::int as delta
      from mentorship_session m
      join production_initiative pi on pi.id = m.initiative_id and pi.deleted_at is null
      join reporting_period rp
        on rp.municipality_id = v_muni
       and m.session_date between rp.start_date and rp.end_date
     where pi.person_id = p_person_id
       and m.municipality_id = v_muni
       and m.deleted_at is null
     group by rp.code
  ),
  -- The four percentages. Every one of them joins person and filters
  -- deleted_at, so a restored respondent re-enters BOTH halves of the ratio.
  -- Reported per period the surveys were contacted in.
  pct as (
    select c.code, rp.code as period_code
      from followup_survey s
      join reporting_period rp
        on rp.municipality_id = v_muni
       and s.contact_date between rp.start_date and rp.end_date
      -- Each predicate is the VIEW's own denominator condition, copied from
      -- pg_get_viewdef rather than from the indicator doc. Two of them are not
      -- what they look like: B1's denominator is everyone who used the office
      -- (`q14_used_office = 'yes'`, a text enum and NOT a boolean), whether or
      -- not they went on to rate it; and C1's requires an initiative started at
      -- least six months before the contact date, which is the whole point of
      -- "still operating at six months". C1's initiative test is unscoped here
      -- because it is unscoped in v_ind_c1, and this must agree with the view.
      cross join lateral (values
        ('A1',    s.q08_applied_knowledge is not null),
        ('B1',    s.q14_used_office = 'yes'),
        ('C1',    s.q17_activity_status is not null
                  and exists (select 1 from production_initiative pi
                               where pi.person_id = s.person_id
                                 and pi.deleted_at is null
                                 and pi.started_on <= s.contact_date - interval '6 months')),
        ('IMP-0', s.round = 'twelve_month'::followup_round_t
                  and s.q37_still_engaged is not null)
      ) as c(code, applies)
     where s.person_id = p_person_id
       and s.municipality_id = v_muni
       and s.deleted_at is null
       and s.status = any (array['submitted'::record_status_t, 'approved'::record_status_t])
       and c.applies
     group by c.code, rp.code
  ),
  singles as (
    select * from a13 union all select * from b12
    union all select * from d01 union all select * from e02
  )
  select s.code, rp.code, 1, false
    from singles s
    join reporting_period rp
      on rp.municipality_id = v_muni
     and s.on_date between rp.start_date and rp.end_date
   where s.on_date is not null
  union all
  select c12.code, c12.period_code, c12.delta, false from c12
  union all
  select c13.code, c13.period_code, c13.delta, false from c13
  union all
  select pct.code, pct.period_code, null::int, true from pct
  order by 1, 2;
end;
$function$;

comment on function public.person_restore_impact(uuid, uuid) is
  'Which indicator figures move, and in which reporting periods, if this '
  'soft-deleted person is restored -- for ONE municipality, the one passed or '
  'the caller''s, and refused for none. Re-runs each view''s own dating rule '
  'with the person filter removed -- so the period is the one the FIRST '
  'qualifying record falls in, which may be long before today. Percentages '
  'return recomputed = true and no delta, because restoring a respondent '
  'changes both halves of the ratio. See 0107; scoped in 0134.';

revoke all on function public.person_restore_impact(uuid, uuid) from public, anon;
grant execute on function public.person_restore_impact(uuid, uuid) to authenticated;

-- ── partner_restore_impact ────────────────────────────────────────────────

drop function if exists public.partner_restore_impact(uuid);

create function public.partner_restore_impact(p_partner_id uuid, p_municipality_id uuid default null)
returns table(
  code        text,
  period_code text,
  delta       int,
  recomputed  boolean
)
language plpgsql
stable
set search_path = public, pg_temp
as $function$
declare
  v_muni uuid := coalesce(p_municipality_id, public.my_municipality());
begin
  if v_muni is null then
    raise exception 'partner_restore_impact needs a municipality: pass p_municipality_id'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with
  -- A1.2 and C1.1 count PARTNERSHIP rows, dated on established_on, and one
  -- organisation may hold both kinds -- which is the whole reason the partner
  -- module was merged. Both are reported, per period.
  ships as (
    select case pa.partnership_type
             when 'training'::partnership_type_t then 'A1.2'
             else 'C1.1'
           end as code,
           rp.code as period_code,
           count(*)::int as delta
      from partnership pa
      join reporting_period rp
        on rp.municipality_id = v_muni
       and pa.established_on between rp.start_date and rp.end_date
     where pa.partner_id = p_partner_id
       and pa.municipality_id = v_muni
       and pa.deleted_at is null
       and pa.is_active
     group by 1, 2
  ),
  -- G0.4 counts DISTINCT PARTNERS, so this partner adds at most one per period
  -- however many contributions they made in it. That is the trap the indicator
  -- doc names, and getting it wrong here would overstate the restore.
  g04 as (
    select 'G0.4'::text as code, rp.code as period_code, 1 as delta
      from partner_contribution pc
      join partnership pa on pa.id = pc.partnership_id and pa.deleted_at is null
      join reporting_period rp
        on rp.municipality_id = v_muni
       and pc.contributed_on between rp.start_date and rp.end_date
     where pa.partner_id = p_partner_id
       and pc.municipality_id = v_muni
       and pc.deleted_at is null
     group by rp.code
  )
  select ships.code, ships.period_code, ships.delta, false from ships
  union all
  select g04.code, g04.period_code, g04.delta, false from g04
  order by 1, 2;
end;
$function$;

comment on function public.partner_restore_impact(uuid, uuid) is
  'Which indicator figures move, and in which reporting periods, if this '
  'soft-deleted partner is restored -- for ONE municipality, the one passed or '
  'the caller''s, and refused for none. A1.2 and C1.1 per partnership, G0.4 at '
  'most one per period. See 0107; scoped in 0134.';

revoke all on function public.partner_restore_impact(uuid, uuid) from public, anon;
grant execute on function public.partner_restore_impact(uuid, uuid) to authenticated;

-- ── submit_followup ───────────────────────────────────────────────────────
--
-- 0098's body, from pg_get_functiondef, with one change: the period is the
-- survey's municipality's. Marked below.

create or replace function public.submit_followup(p_survey_id uuid, p_confirm boolean default false)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_survey  followup_survey%rowtype;
  v_live    boolean;
  v_empty   text[] := '{}';
  v_ind     text[] := '{}';
  v_period  text;
  v_any     boolean;
  v_rows    int;
  v_con     text;
  v_payload jsonb;
begin
  -- RLS applies the UPDATE policy to a locking read (0068), so this is the
  -- permission check as well as the lock: a coordinator on any survey, an
  -- enumerator only while it is a draft.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    -- Look, do not assume. An empty FOR UPDATE means "no such row" or "not
    -- yours", and telling someone a survey has vanished sends them looking for
    -- a bug instead of for a coordinator. See 0068.
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- ── which sections have nothing in them ─────────────────────────────────
  --
  -- On values, not on rows: a section that was opened and left blank has rows.

  select v_survey.q08_applied_knowledge is not null
      or v_survey.q14_used_office       is not null
      or v_survey.q16_advice_useful     is not null
      or exists (select 1 from followup_answer a
                  where a.survey_id = p_survey_id
                    and a.question_code in ('Q7','Q10','Q12','Q13','Q15')
                    and (a.value_text is not null or a.value_number is not null
                         or a.value_boolean is not null))
      or exists (select 1 from followup_answer_option o
                  where o.survey_id = p_survey_id
                    and o.question_code in ('Q9','Q11','Q15'))
    into v_any;
  if not v_any then v_empty := array_append(v_empty, 'A'); end if;

  select v_survey.q17_activity_status      is not null
      or v_survey.q18_started_after_support is not null
      or v_survey.q22_volume_change        is not null
      or v_survey.q26_workers_total        is not null
      or v_survey.q26_workers_women        is not null
      or v_survey.q26_workers_under30      is not null
      or exists (select 1 from followup_answer a
                  where a.survey_id = p_survey_id
                    and a.question_code in ('Q19','Q21','Q25')
                    and (a.value_text is not null or a.value_number is not null
                         or a.value_boolean is not null))
      or exists (select 1 from followup_answer_option o
                  where o.survey_id = p_survey_id
                    and o.question_code in ('Q19','Q20','Q21','Q24'))
      or exists (select 1 from followup_safety_item s where s.survey_id = p_survey_id)
    into v_any;
  if not v_any then v_empty := array_append(v_empty, 'B'); end if;

  select v_survey.q29_selling_change         is not null
      or v_survey.q30_events_attended        is not null
      or v_survey.q31_last_event_sales_band  is not null
      or v_survey.q34_connection_made        is not null
      or exists (select 1 from followup_answer a
                  where a.survey_id = p_survey_id
                    and a.question_code = 'Q32'
                    and (a.value_text is not null or a.value_number is not null
                         or a.value_boolean is not null))
      or exists (select 1 from followup_answer_option o
                  where o.survey_id = p_survey_id
                    and o.question_code in ('Q27','Q28','Q33','Q36'))
      or exists (select 1 from followup_buyer_connection b where b.survey_id = p_survey_id)
    into v_any;
  if not v_any then v_empty := array_append(v_empty, 'C'); end if;

  -- Only where it exists. section_d_only_at_12m refuses these columns on any
  -- other round, so on a six-month survey D is absent rather than unanswered.
  if v_survey.round = 'twelve_month'::followup_round_t then
    select v_survey.q37_still_engaged is not null
        or v_survey.q38_capacity      is not null
        or v_survey.q40_income_change is not null
        or exists (select 1 from followup_answer a
                    where a.survey_id = p_survey_id
                      and a.question_code = 'Q39'
                      and (a.value_text is not null or a.value_number is not null
                           or a.value_boolean is not null))
        or exists (select 1 from followup_answer_option o
                    where o.survey_id = p_survey_id and o.question_code = 'Q39')
      into v_any;
    if not v_any then v_empty := array_append(v_empty, 'D'); end if;
  end if;

  select v_survey.q43_enumerator_notes is not null
      or exists (select 1 from followup_answer a
                  where a.survey_id = p_survey_id
                    and a.question_code = 'Q42'
                    and a.value_boolean is not null)
      or exists (select 1 from followup_answer_option o
                  where o.survey_id = p_survey_id and o.question_code = 'Q41')
    into v_any;
  if not v_any then v_empty := array_append(v_empty, 'E'); end if;

  -- ── which indicators this survey will feed ──────────────────────────────
  --
  -- The four tests used to sit inline here. They moved into
  -- followup_indicator_reach (0098) because review_followup has to ask the same
  -- question about three different statuses, and two copies of "which
  -- indicators does this survey feed" would drift -- a promise and an act that
  -- must agree should be the same code, which is the whole reason p_confirm
  -- exists rather than a _preview sibling.
  --
  -- The reach function also reads each view's admitted statuses out of
  -- pg_get_viewdef instead of assuming 'submitted' is one of them. So if a view
  -- is ever narrowed to approved-only, this stops promising it the same day
  -- rather than a quarter later.
  --
  -- person_live is still read here: the screen is told it in its own right, and
  -- the reach function folds it into eligibility rather than returning it.
  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  v_live := coalesce(v_live, false);

  v_ind := coalesce(
             public.followup_indicator_reach(p_survey_id, 'submitted'::record_status_t),
             '{}'::text[]);

  -- Every view joins the survey to a period on its contact date. Outside all of
  -- them the answers are stored and counted in no quarter, so null is a real
  -- answer here and the screen should say so rather than hide it.
  --
  -- The survey's own municipality's periods (0134). Both municipalities have a
  -- row called 26/Q3, and `limit 1` over both was answering with whichever
  -- came first -- the right code by coincidence, from the wrong row.
  select rp.code into v_period from reporting_period rp
   where rp.municipality_id = v_survey.municipality_id
     and v_survey.contact_date between rp.start_date and rp.end_date
   limit 1;

  v_payload := jsonb_build_object(
    'survey_id',      p_survey_id,
    'round',          v_survey.round,
    'empty_sections', to_jsonb(v_empty),
    'indicators',     to_jsonb(v_ind),
    'period',         v_period,
    'person_live',    v_live);

  if v_survey.status <> 'draft'::record_status_t then
    return jsonb_build_object('ok', false, 'result', 'not_draft',
                              'status', v_survey.status) || v_payload;
  end if;

  if not coalesce(p_confirm, false) then
    return jsonb_build_object('ok', true, 'result', 'preview',
                              'status', v_survey.status) || v_payload;
  end if;

  update followup_survey
     set status = 'submitted'::record_status_t
   where id = p_survey_id;

  -- Count what came back. The lock passed fu_update's USING, so this should be
  -- one row -- but a filtered UPDATE reports success with zero, and a submit
  -- that silently did not happen would leave four indicators short of a survey
  -- the enumerator was told had been counted.
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception
      'submitting survey % changed % rows, not 1', p_survey_id, v_rows
      using errcode = 'insufficient_privilege',
            hint = 'An UPDATE that RLS filters reports success. Check fu_update.';
  end if;

  return jsonb_build_object('ok', true, 'result', 'submitted',
                            'status', 'submitted') || v_payload;

exception
  -- The same shape as the five section saves, so nobody has to remember which
  -- of the six behaves differently at the end of an interview.
  --
  -- No delete runs above it, so 0090's rule is not what this is for -- it is
  -- here so a refusal arrives as "not submitted" rather than as a raw error on
  -- the last screen. insufficient_privilege stays uncaught: that is the
  -- read-back above reporting a submit that did not happen.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

revoke all on function public.submit_followup(uuid, boolean) from public, anon;
grant execute on function public.submit_followup(uuid, boolean) to authenticated;

-- ── verification ──────────────────────────────────────────────────────────
--
-- As the owner, with no JWT: the state in which every row came back twice.

do $verify$
declare
  v_shm  uuid;
  v_dups int;
  v_rows int;
  v_row_id uuid;
  v_raised boolean := false;
begin
  select id into v_shm from public.municipality where code = 'SHM';

  -- 1. no municipality, no JWT: refused, not an empty list
  begin
    perform * from public.person_restore_impact(gen_random_uuid());
  exception when invalid_parameter_value then
    v_raised := true;
  end;
  if not v_raised then
    raise exception '0134: person_restore_impact with no municipality returned instead of raising';
  end if;

  v_raised := false;
  begin
    perform * from public.partner_restore_impact(gen_random_uuid());
  exception when invalid_parameter_value then
    v_raised := true;
  end;
  if not v_raised then
    raise exception '0134: partner_restore_impact with no municipality returned instead of raising';
  end if;

  -- 2. with Sahel Horan named: no (code, period) pair twice, for any live
  --    person. Before this migration every pair came back once per
  --    municipality that had a period of that code.
  for v_row_id in select id from public.person where deleted_at is null loop
    select count(*) - count(distinct (code, period_code)) into v_dups
      from public.person_restore_impact(v_row_id, v_shm);
    if v_dups > 0 then
      raise exception '0134: person_restore_impact(%, SHM) returns % duplicated (code, period) pair(s)', v_row_id, v_dups;
    end if;
  end loop;

  -- 3. and the same for every live partner
  for v_row_id in select id from public.partner where deleted_at is null loop
    select count(*) - count(distinct (code, period_code)) into v_dups
      from public.partner_restore_impact(v_row_id, v_shm);
    if v_dups > 0 then
      raise exception '0134: partner_restore_impact(%, SHM) returns % duplicated (code, period) pair(s)', v_row_id, v_dups;
    end if;
  end loop;

  -- 4. the demo person the doubling was measured on still has their five
  --    figures, once each: A1.3, B1.2, C1.2, C1.3 and E0.2 in 26/Q3
  select count(*) into v_rows
    from public.person_restore_impact(
           (select id from public.person where national_id = '300000001'), v_shm) r
   where r.period_code = '26/Q3'
     and r.code in ('A1.3', 'B1.2', 'C1.2', 'C1.3', 'E0.2');
  if v_rows <> 5 then
    raise exception '0134: expected the five 26/Q3 figures for 300000001 once each, got % rows', v_rows;
  end if;

  -- 5. the grants: authenticated may call all three, anon none
  if not has_function_privilege('authenticated', 'public.person_restore_impact(uuid, uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.partner_restore_impact(uuid, uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.submit_followup(uuid, boolean)', 'EXECUTE') then
    raise exception '0134: authenticated lost EXECUTE on one of the three functions';
  end if;
  if has_function_privilege('anon', 'public.person_restore_impact(uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.partner_restore_impact(uuid, uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.submit_followup(uuid, boolean)', 'EXECUTE') then
    raise exception '0134: anon can execute one of the three functions';
  end if;

  -- 6. the sweep that found these three now finds none
  if exists (
    with stripped as (
      select p.proname,
             regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g') as src
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
    )
    select 1 from stripped where src ~ 'reporting_period' and src !~ 'municipality'
  ) then
    raise exception '0134: a function still reads reporting_period without naming a municipality';
  end if;
end $verify$;
