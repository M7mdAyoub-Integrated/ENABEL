-- ═══════════════════════════════════════════════════════════════════════════
--  0092 — saving section D (Q37–Q40), the twelve-month round only
--
--  Three tables, one transaction, the same reasons as A, B and C.
--
--    followup_survey        Q37, Q38, Q40
--    followup_answer        Q39's month
--    followup_answer_option Q39's reasons, list ref_stop_reason (shared with Q19)
--
--  ── THIS IS THE SECTION THAT MOVES IMP-0 ──
--
--  `q37_still_engaged` is the whole of it. `v_ind_imp_0` counts twelve-month
--  surveys where it is not null as the denominator, and `main` or `secondary`
--  as the numerator. A percentage, so one wrong answer drags the figure rather
--  than nudging it, and it is the impact indicator the whole Action Plan is
--  judged on -- baseline 0, nothing until 28/Q4, then 70.
--
--  Nothing here computes it. The answer is written and the view reads it, and
--  the survey must reach `submitted` or `approved` before the view sees it
--  (0072). A draft moves nothing.
--
--  ── THE ROUND GATE IS A RESULT, NOT A CONSTRAINT VIOLATION ──
--
--  `section_d_only_at_12m` already refuses these columns on any other round.
--  Relying on it alone would answer a six-month survey with
--
--      'invalid', constraint 'section_d_only_at_12m'
--
--  which is true and useless: the enumerator cannot fix it, because the round
--  is not something section D can change. So the round is checked first and
--  answered as `not_twelve_month`, before anything is written. The constraint
--  stays as the thing that makes it true -- this is the thing that makes it
--  legible, the same division of labour as Q28 in 0088.
--
--  ── Q39 IS Q19 AT TWELVE MONTHS, AND SHARES ITS LIST ──
--
--  "If not engaged, when and why." The month goes to followup_answer, the
--  reasons to followup_answer_option against `ref_stop_reason` -- the same
--  table Q19 uses, because the sheet says it is the same list (0075).
--
--  Both are cleared when Q37 is not 'no', and cleared server-side rather than
--  hidden: an enumerator who ticks reasons and then corrects Q37 to 'main' must
--  not leave "why did you stop" attached to someone who did not stop. Every
--  clear is read back -- RLS filters a delete it will not permit and reports
--  success (0080).
--
--  ── Q38 IS NOT GATED ON Q37, DELIBERATELY ──
--
--  `q38_capacity` carries `not_engaged` as one of its six options, so the sheet
--  plainly expects it answered whether or not the person is still working. It
--  is therefore not cleared and not cross-checked against Q37.
--
--  A contradictory pair -- `main` with `not_engaged` -- is possible and is left
--  possible. No indicator reads Q38, so it moves no figure, and refusing it
--  would mean inventing a rule the sheet does not state. See OQ-34.
--
--  ── ONE EXCEPTION BLOCK, ROUND THE WHOLE BODY ──
--
--  Written this way from the start rather than fixed later: the handler has to
--  cover the deletes above it, or a refusal reports failure and leaves the
--  cleared rows cleared. That is 0090, and CLAUDE.md now carries it as a rule.
--  `insufficient_privilege` stays uncaught -- it is the read-back guard.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_d(
  p_survey_id     uuid,
  p_q37           text default null,
  p_q38           text default null,
  p_q39_when      text default null,
  p_q39_options   uuid[] default null,
  p_q39_other     text default null,
  p_q40           text default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey     followup_survey%rowtype;
  v_stale      int;
  v_not_engaged boolean;
  v_con        text;
begin
  -- Locked, so two enumerators on the same draft serialise. RLS applies the
  -- UPDATE policy to a locking read (see 0068), which is also what refuses
  -- anyone who may not write this survey.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- Before anything is written. A six-month survey has no section D at all, and
  -- saying so is more use than the constraint name.
  if v_survey.round <> 'twelve_month'::followup_round_t then
    return jsonb_build_object('ok', false, 'result', 'not_twelve_month',
                              'round', v_survey.round);
  end if;

  -- Q39 belongs only to a 'no' at Q37. Null is not 'no': an unanswered Q37 is
  -- not a statement that the person stopped.
  v_not_engaged := p_q37 = 'no';

  update followup_survey
     set q37_still_engaged = p_q37,
         q38_capacity      = p_q38,
         q40_income_change = p_q40
   where id = p_survey_id;

  -- ── Q39's month ──────────────────────────────────────────────────────────
  if v_not_engaged then
    insert into followup_answer (survey_id, question_code, value_text)
    values (p_survey_id, 'Q39', nullif(btrim(p_q39_when), ''))
    on conflict (survey_id, question_code)
    do update set value_text = excluded.value_text, updated_at = now();
  else
    delete from followup_answer where survey_id = p_survey_id and question_code = 'Q39';

    select count(*) into v_stale from followup_answer
     where survey_id = p_survey_id and question_code = 'Q39';
    if v_stale > 0 then
      raise exception
        'could not clear Q39 for survey % -- the answer survived the delete', p_survey_id
        using errcode = 'insufficient_privilege',
              hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
    end if;
  end if;

  -- ── Q39's reasons ────────────────────────────────────────────────────────
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code = 'Q39';

  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code = 'Q39';
  if v_stale > 0 then
    raise exception
      'could not clear section D''s options for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered, so an option id outside the list reaches
  -- guard_followup_option and is refused rather than dropped in silence. The
  -- join also puts the free text on the one option that takes it and null on
  -- the rest, so both halves of that guard are satisfied by construction.
  if v_not_engaged and p_q39_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q39', x.id,
           case when o.allows_free_text then nullif(btrim(p_q39_other), '') end
      from unnest(p_q39_options) as x(id)
      left join ref_stop_reason o on o.id = x.id
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved', 'survey_id', p_survey_id);

exception
  -- One block, round the whole body, covering the deletes above. A handler that
  -- began after them would catch a refusal, report "not saved", and leave the
  -- cleared rows cleared. See 0090.
  --
  -- insufficient_privilege is deliberately NOT caught: that is the read-back
  -- guard saying RLS filtered a delete, and it must stay a hard error.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

comment on function public.save_followup_section_d(uuid, text, text, text, uuid[], text, text) is
  'Saves section D (Q37-Q40) in one transaction across followup_survey, '
  'followup_answer and followup_answer_option. Refuses any round other than '
  'twelve_month by name rather than by constraint violation, before writing '
  'anything. Q37 is the whole of IMP-0 and is written, never computed. Q39''s '
  'month and reasons are cleared unless Q37 is ''no''; Q38 is not gated on Q37 '
  'because not_engaged is one of its own options. Every clear is read back. '
  'Never submits.';

revoke all on function public.save_followup_section_d(uuid, text, text, text, uuid[], text, text) from public, anon;
grant execute on function public.save_followup_section_d(uuid, text, text, text, uuid[], text, text) to authenticated;
