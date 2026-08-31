-- ═══════════════════════════════════════════════════════════════════════════
--  0096 — submit_followup built its two lists with the wrong operator
--
--  ── WHAT WAS WRONG ──
--
--      v_ind := v_ind || 'A1';
--
--  `v_ind` is `text[]`, and the literal is `unknown`. Postgres resolves that
--  against `anyarray || anyarray` in preference to `anyarray || anyelement`, so
--  it tries to read 'A1' as an array literal and raises:
--
--      22P02: malformed array literal: "A1"
--      DETAIL: Array value must start with "{" or dimension information.
--
--  Nine sites: the five section letters and the four indicator codes.
--  `array_append` says which operand is the element and cannot be resolved the
--  other way.
--
--  ── WHY 0095 LOOKED FINE ──
--
--  Worth writing down, because it is this project's recurring shape in a new
--  place. 0095 was exercised first on a COMPLETE survey -- all six sections
--  answered -- so every `if not v_any` was false and not one of the five
--  section-letter appends ever ran. The four indicator appends sat behind
--  `if v_live`, and the failure came from the first of those.
--
--  So the branch that ran was the one that was broken, and the five that were
--  equally broken did not run at all. Had the indicator appends happened to be
--  correct, 0095 would have passed a full-survey test and then raised on the
--  first survey an enumerator could not finish -- which is exactly the survey
--  the empty-section list exists for.
--
--  The lesson is the same one CLAUDE.md keeps recording: a test that only walks
--  the happy path proves the happy path. The verification for this one runs
--  both -- a survey with every section answered AND a survey with sections
--  missing -- and the second is the one that covers these five lines.
--
--  ── ON REPLACING IT ──
--
--      grep -l "function public.submit_followup" supabase/migrations/*.sql
--
--  One file: 0095. Nothing else has touched this function, so there is no later
--  change to revert -- the trap 0083 was written about. The body below is 0095's
--  own applied text with those nine assignments substituted and nothing else
--  altered; it was derived from the file rather than retyped.
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
  -- Every one of the four views inner-joins person on deleted_at is null, so a
  -- survey attached to a deleted person feeds nothing whatever it answers.
  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  v_live := coalesce(v_live, false);

  if v_live then
    if v_survey.q08_applied_knowledge is not null then
      v_ind := array_append(v_ind, 'A1');
    end if;

    -- B1's denominator is surveys that used the office at all; q16 then decides
    -- which side of the percentage this one lands on.
    if v_survey.q14_used_office = 'yes' then
      v_ind := array_append(v_ind, 'B1');
    end if;

    -- C1 counts activities that have REACHED six months, so Q17 alone is not
    -- enough. Same test as v_ind_c1, including the interval.
    if v_survey.q17_activity_status is not null
       and exists (select 1 from production_initiative pi
                    where pi.person_id = v_survey.person_id
                      and pi.deleted_at is null
                      and pi.started_on <= (v_survey.contact_date - '6 mons'::interval))
    then
      v_ind := array_append(v_ind, 'C1');
    end if;

    if v_survey.round = 'twelve_month'::followup_round_t
       and v_survey.q37_still_engaged is not null then
      v_ind := array_append(v_ind, 'IMP-0');
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
