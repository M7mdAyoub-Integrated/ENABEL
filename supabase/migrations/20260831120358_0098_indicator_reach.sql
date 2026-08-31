-- ═══════════════════════════════════════════════════════════════════════════
--  0098 — "which indicators does this survey feed" becomes one function, and
--         it reads the answer out of the views
--
--  0095 answered that question inline, for one status: submitted. The review
--  screen has to ask it three times — at the survey's current status, and at
--  the status each of approve, reject and reopen would leave it in — because a
--  coordinator is entitled to know which figures move before they move.
--
--  Copying the four tests into review_followup would have been the obvious
--  thing and it is the thing this project keeps being bitten by. So they move
--  here once, and 0095's body loses them.
--
--  ── THE STATUS LIST IS READ, NOT ASSUMED ──
--
--  Every one of the four views admits `submitted` and `approved` identically
--  today. Writing that down anywhere but the view is how the sentence on the
--  screen and the figure in the return drift apart: narrow one view to
--  approved-only and a hardcoded list keeps promising the old behaviour, in a
--  confirmation dialog, to the person deciding.
--
--  So followup_view_statuses reads it out of pg_get_viewdef every time.
--
--  ── AND THE OBVIOUS PATTERN FOR READING IT IS WRONG ──
--
--  Worth writing down, because it produced a plausible wrong answer on the
--  first try and it is CLAUDE.md's sixth failure in a new place.
--
--      'status = ANY \(ARRAY\[([^]]*)\]\)'
--
--  matches `q17_activity_status = ANY (ARRAY['expanded', 'same', 'reduced'])`,
--  because that column name ENDS IN "status". Run against the four views, that
--  pattern returns the right answer for A1, B1 and IMP-0 and Q17's answer list
--  for C1 — from which no record_status_t literal can be extracted at all, so
--  C1 would have been reported as unaffected by any status change. Wrong, and
--  wrong in the reassuring direction: the screen would have told a coordinator
--  that rejecting a survey does not touch C1.
--
--  `\m` is a word boundary and `_` is a word character, so `\mstatus` cannot
--  match inside `q17_activity_status`. That is the whole fix.
--
--  ── AN UNREADABLE VIEW RAISES; IT DOES NOT RETURN AN EMPTY LIST ──
--
--  The function requires EXACTLY ONE status gate and at least one status
--  inside it. Zero, or two, or a gate written some other way — `status <>
--  'draft'`, a join, a helper function — and it raises.
--
--  Returning "no statuses" for a view it could not read is the failure this
--  whole file is written against: a check that can pass while the thing it
--  checks is wrong is not a check. A loud failure on the submit screen the day
--  somebody edits a view costs an afternoon. A quiet one costs a donor figure
--  and nobody ever connects the two.
--
--  Sabotaged before being trusted: a view rewritten to `status <> 'draft'` and
--  one with two gates were both fed to this function, in a transaction that
--  rolled back, and both raised.
--
--  ── SECURITY invoker, LIKE EVERYTHING ELSE THAT TOUCHES A SURVEY ──
--
--  followup_indicator_reach reads followup_survey, person and
--  production_initiative under the caller's RLS, so it cannot become a way to
--  learn what somebody else's survey contains. Its callers — submit_followup
--  and review_followup — are invokers too, and 05 §14 means the CALLER needs
--  EXECUTE on it. Granted to authenticated, which is the only role the
--  application connects as.
--
--  followup_view_statuses touches no programme data at all. It reads
--  pg_get_viewdef, which is world-readable in any PostgreSQL database, so the
--  grant gives away nothing that `\d+` does not.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.followup_view_statuses(p_view text)
returns text[]
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_def   text;
  v_gates text[];
  v_out   text[];
begin
  v_def := pg_get_viewdef(('public.' || p_view)::regclass, true);

  -- \m is a word boundary, and it is doing real work: without it this matches
  -- q17_activity_status in v_ind_c1 and returns Q17's answer list.
  select array_agg(m[1]) into v_gates
    from regexp_matches(v_def, '\mstatus = ANY \(ARRAY\[([^]]*)\]\)', 'g') m;

  if coalesce(array_length(v_gates, 1), 0) <> 1 then
    raise exception
      'view %.% has % status gates, expected exactly 1',
      'public', p_view, coalesce(array_length(v_gates, 1), 0)
      using hint = 'A view whose status filter cannot be read must not be '
                   'reported as unaffected by a status change. Widen this '
                   'function to the new shape, or say why the view has none.';
  end if;

  select array_agg(m[1] order by m[1]) into v_out
    from regexp_matches(v_gates[1], '''([a-z_]+)''::record_status_t', 'g') m;

  if coalesce(array_length(v_out, 1), 0) = 0 then
    raise exception
      'view %.% has a status gate with no record_status_t values in it',
      'public', p_view
      using hint = 'The gate matched but nothing could be read out of it. See 0098.';
  end if;

  return v_out;
end;
$function$;

comment on function public.followup_view_statuses(text) is
  'Which record_status_t values a view admits, read out of pg_get_viewdef. '
  'Raises rather than returning an empty list when the gate cannot be read, '
  'because "unreadable" and "counts nothing" must never look the same. The '
  '\m word boundary is load-bearing: without it the pattern matches '
  'q17_activity_status in v_ind_c1. See 0098.';

revoke all on function public.followup_view_statuses(text) from public, anon;
grant execute on function public.followup_view_statuses(text) to authenticated;


create or replace function public.followup_indicator_reach(
  p_survey_id uuid,
  p_status    record_status_t
) returns text[]
language plpgsql
stable
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey followup_survey%rowtype;
  v_live   boolean;
  v_out    text[] := '{}';
begin
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null;
  if not found then
    -- Null, not '{}'. "I cannot see this survey" and "this survey feeds
    -- nothing" are different answers and the caller may need to tell them
    -- apart. Both callers have already locked the row, so neither sees this.
    return null;
  end if;

  -- All four views inner-join person on deleted_at is null, so a survey
  -- attached to a deleted person feeds nothing whatever it answers.
  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  if not coalesce(v_live, false) then
    return '{}'::text[];
  end if;

  -- Each block is that view's own content condition, and the status test comes
  -- from the view itself. Order is A1, B1, C1, IMP-0 -- 03_INDICATORS.md's
  -- order, so the screen can render the array as it stands.

  if v_survey.q08_applied_knowledge is not null
     and p_status::text = any(public.followup_view_statuses('v_ind_a1')) then
    v_out := array_append(v_out, 'A1');
  end if;

  -- B1's denominator is surveys that used the office at all; q16 then decides
  -- which side of the percentage this one lands on.
  if v_survey.q14_used_office = 'yes'
     and p_status::text = any(public.followup_view_statuses('v_ind_b1')) then
    v_out := array_append(v_out, 'B1');
  end if;

  -- C1 counts activities that have REACHED six months, so Q17 alone is not
  -- enough. Same test as v_ind_c1, including the interval.
  if v_survey.q17_activity_status is not null
     and exists (select 1 from production_initiative pi
                  where pi.person_id = v_survey.person_id
                    and pi.deleted_at is null
                    and pi.started_on <= (v_survey.contact_date - '6 mons'::interval))
     and p_status::text = any(public.followup_view_statuses('v_ind_c1')) then
    v_out := array_append(v_out, 'C1');
  end if;

  if v_survey.round = 'twelve_month'::followup_round_t
     and v_survey.q37_still_engaged is not null
     and p_status::text = any(public.followup_view_statuses('v_ind_imp_0')) then
    v_out := array_append(v_out, 'IMP-0');
  end if;

  return v_out;
end;
$function$;

comment on function public.followup_indicator_reach(uuid, record_status_t) is
  'Which of A1, B1, C1 and IMP-0 would count this survey if its status were '
  'p_status. One copy of the four view conditions, shared by submit_followup '
  'and review_followup so the sentence shown before an action cannot drift '
  'from the one shown before another. Each view''s admitted statuses are read '
  'out of pg_get_viewdef, never assumed. Null means the survey is not visible '
  'to the caller; empty means it feeds nothing. security INVOKER: RLS decides '
  'which surveys it can be asked about.';

revoke all on function public.followup_indicator_reach(uuid, record_status_t) from public, anon;
grant execute on function public.followup_indicator_reach(uuid, record_status_t) to authenticated;


-- ── submit_followup: the four inline tests become one call ────────────────
--
-- grep -l "function public.submit_followup" supabase/migrations/*.sql
--   0095 wrote it, 0096 fixed its append operator. Two files, and 0096 is the
--   later one, so this body is 0096's -- taken from the file, not retyped, and
--   the file was hashed against pg_proc.prosrc before it was used. They matched
--   at 91a43f0629fa34f1af25c20d29e25cb2. create or replace takes the whole body,
--   so anything else in there would have been silently reverted (0083).
--
-- The substitution was scripted and its diff printed: one block out, one call
-- in, nothing else in 210 lines touched.

create or replace function public.submit_followup(
  p_survey_id uuid,
  p_confirm   boolean default false
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
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
  select rp.code into v_period from reporting_period rp
   where v_survey.contact_date between rp.start_date and rp.end_date
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

comment on function public.submit_followup(uuid, boolean) is
  'Moves a follow-up survey from draft to submitted -- the moment A1, B1, C1 '
  'and IMP-0 begin counting it (0072). p_confirm false returns the preview and '
  'writes nothing; true does the same work and then submits, so what the '
  'enumerator is shown cannot drift from what confirming does. Reports which '
  'sections are empty (judged on values, not rows -- a blank section still has '
  'rows) and which indicators this survey will feed, using each view''s own '
  'condition including C1''s six-month production_initiative test. A survey '
  'with sections missing is submittable; they are named, not refused. Only a '
  'draft submits. security INVOKER: the locking read is the permission check. '
  'The indicator list comes from followup_indicator_reach (0098), shared with '
  'review_followup so the two screens cannot disagree.';

revoke all on function public.submit_followup(uuid, boolean) from public, anon;
grant execute on function public.submit_followup(uuid, boolean) to authenticated;
