-- ═══════════════════════════════════════════════════════════════════════════
--  0095 — submitting a follow-up survey: the moment four indicators start
--         counting it
--
--  Everything before this is a draft, and 0072 made the four survey-fed views
--  require `submitted` or `approved`. So this one UPDATE is what puts a survey
--  into A1, B1, C1 and IMP-0 -- three intermediate results and the Action Plan's
--  impact indicator. It is the single largest thing an enumerator can do to the
--  donor return, and it happens at the end of a long interview on a phone.
--
--  ── WHY IT IS NOT PART OF SAVING SECTION E ──
--
--  Because then it would be a side effect of finishing a form, and the survey
--  that most needs a deliberate decision is exactly the one that reaches the
--  last screen with sections empty -- somebody who could not reach the farmer
--  for half the questions. Saving section E stores three answers (0094).
--  Submitting is its own act, its own function, and its own confirmation.
--
--  ── p_confirm: THE PREVIEW AND THE ACT ARE ONE FUNCTION ──
--
--  `p_confirm = false` computes everything and writes nothing. `true` computes
--  the same things and then submits. One body, so the sentence shown to the
--  enumerator before they confirm cannot drift away from what confirming does.
--
--  Two functions -- a `..._preview` and a `..._submit` -- is the obvious shape
--  and it is the one that goes wrong: this project has already had a comment
--  describing a delete that never happened (0080) and a function rewritten from
--  a version two migrations stale (0083). A promise and an act that must agree
--  should be the same code, not two copies of it.
--
--  ── WHAT IT PROMISES, AND WHY EACH TEST IS THE VIEW'S OWN ──
--
--  The four conditions below are copied from the view definitions, read out of
--  pg_get_viewdef rather than from 03_INDICATORS.md, because the view is what
--  will actually count:
--
--    A1     q08_applied_knowledge is not null
--    B1     q14_used_office = 'yes'          -- the DENOMINATOR condition; q16
--                                               decides the numerator, so
--                                               answering Q14 'yes' is what
--                                               puts the survey in the figure
--    C1     q17_activity_status is not null AND the person has a
--           production_initiative started at least six months before the
--           contact date
--    IMP-0  round = 'twelve_month' AND q37_still_engaged is not null
--
--  C1's second half is the one worth having: a survey can answer Q17 and still
--  feed nothing, because C1 is about activities that have REACHED six months.
--  Promising C1 on the strength of Q17 alone would be a promise the view does
--  not keep, and nobody would ever find out why.
--
--  All four also require the person to be live. A survey attached to a
--  soft-deleted person is counted by none of the views (they inner-join person
--  on deleted_at is null), so `person_live` gates the whole list.
--
--  And the period: every view joins on `contact_date between start_date and
--  end_date`. A contact date outside all thirteen periods feeds no quarter at
--  all, so the period is returned and a null is a real answer.
--
--  ── EMPTINESS IS JUDGED ON VALUES, NEVER ON ROWS ──
--
--  Every section save in this survey upserts its plain answers unconditionally,
--  null included -- section A writes Q7, Q10, Q12 and Q13 whatever they are,
--  and 0094 writes Q42 the same way. The row means the question was put. So
--  `exists (select 1 from followup_answer ...)` is true for a section somebody
--  opened and left blank, and using it here would report a survey as complete
--  because the enumerator had visited every screen.
--
--  Each test below therefore asks whether any VALUE is present.
--
--  Section D is reported as empty only on a twelve-month round. On the others
--  it does not exist, and listing it as missing would be telling an enumerator
--  to go back and fill in questions the database refuses to store.
--
--  ── A SURVEY WITH SECTIONS MISSING IS STILL SUBMITTABLE ──
--
--  Deliberately. An enumerator does not always get every answer, and a survey
--  held open forever because Section C is blank is a survey that never reaches
--  the donor return. The empty sections are NAMED so the decision is informed;
--  they are not a refusal.
--
--  A survey with nothing at all in it is submittable too, and reports an empty
--  indicator list -- which is the honest thing to say about it. `respondent`
--  already carries 'not_reached' for exactly that interview.
--
--  ── ONLY A DRAFT SUBMITS, AND REOPENING IS SOMEBODY ELSE'S JOB ──
--
--  A survey that is already submitted, approved or rejected returns 'not_draft'
--  with the status it has, rather than submitting twice. Reopening one is a
--  coordinator action and needs no function here: fu_update's USING admits an
--  enumerator only while the survey is a draft, so after this call they cannot
--  touch it again, and 0093 stopped them writing 'approved' directly.
--
--  ── THE LOCK IS THE PERMISSION CHECK ──
--
--  security INVOKER, like the five section saves and for the same reason: RLS
--  applies the UPDATE policy to a locking read (0068), so `for update` is what
--  refuses anyone who may not write this survey. A definer would bypass RLS and
--  let any authenticated account submit any survey. It calls no definer, so
--  §14's nested-EXECUTE trap does not apply -- but that is why it must stay
--  free of one.
--
--  An enumerator asking for a preview of a survey somebody else has already
--  submitted is filtered by that lock and gets 'not_permitted', not
--  'not_draft'. That is the right answer for them: it is no longer theirs.
-- ═══════════════════════════════════════════════════════════════════════════

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
  if not v_any then v_empty := v_empty || 'A'; end if;

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
  if not v_any then v_empty := v_empty || 'B'; end if;

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
  if not v_any then v_empty := v_empty || 'C'; end if;

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
    if not v_any then v_empty := v_empty || 'D'; end if;
  end if;

  select v_survey.q43_enumerator_notes is not null
      or exists (select 1 from followup_answer a
                  where a.survey_id = p_survey_id
                    and a.question_code = 'Q42'
                    and a.value_boolean is not null)
      or exists (select 1 from followup_answer_option o
                  where o.survey_id = p_survey_id and o.question_code = 'Q41')
    into v_any;
  if not v_any then v_empty := v_empty || 'E'; end if;

  -- ── which indicators this survey will feed ──────────────────────────────
  --
  -- Every one of the four views inner-joins person on deleted_at is null, so a
  -- survey attached to a deleted person feeds nothing whatever it answers.
  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  v_live := coalesce(v_live, false);

  if v_live then
    if v_survey.q08_applied_knowledge is not null then
      v_ind := v_ind || 'A1';
    end if;

    -- B1's denominator is surveys that used the office at all; q16 then decides
    -- which side of the percentage this one lands on.
    if v_survey.q14_used_office = 'yes' then
      v_ind := v_ind || 'B1';
    end if;

    -- C1 counts activities that have REACHED six months, so Q17 alone is not
    -- enough. Same test as v_ind_c1, including the interval.
    if v_survey.q17_activity_status is not null
       and exists (select 1 from production_initiative pi
                    where pi.person_id = v_survey.person_id
                      and pi.deleted_at is null
                      and pi.started_on <= (v_survey.contact_date - '6 mons'::interval))
    then
      v_ind := v_ind || 'C1';
    end if;

    if v_survey.round = 'twelve_month'::followup_round_t
       and v_survey.q37_still_engaged is not null then
      v_ind := v_ind || 'IMP-0';
    end if;
  end if;

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
  'draft submits. security INVOKER: the locking read is the permission check.';

revoke all on function public.submit_followup(uuid, boolean) from public, anon;
grant execute on function public.submit_followup(uuid, boolean) to authenticated;
