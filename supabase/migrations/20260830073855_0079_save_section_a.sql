-- ═══════════════════════════════════════════════════════════════════════════
--  0079 — saving section A
--
--  ── ONE CALL, ONE TRANSACTION ──
--
--  Section A writes to three tables: two columns on followup_survey (Q8 and
--  Q14, which feed A1 and B1's denominator), five rows in followup_answer, and
--  option rows for Q9, Q11 and Q15.
--
--  Done from the browser that is eight round trips, and a connection dropping
--  between the third and the fourth leaves a section half-written -- which is
--  precisely what the draft design exists to prevent. A section either lands or
--  it does not.
--
--  ── THE CONDITIONAL QUESTIONS ARE CLEARED, NOT LEFT BEHIND ──
--
--  Q9 is only asked when Q8 is 'no'. Q11 only when Q10 is not 'no'. Q15 and Q16
--  only when Q14 is 'yes'.
--
--  An enumerator who ticks three reasons under Q9, then corrects Q8 to
--  'regularly', has left three reasons attached to a survey that says the
--  knowledge WAS applied. Nothing downstream would notice, and the row would
--  read as a contradiction forever. So the branch that is no longer reachable
--  is deleted in the same transaction.
--
--  That is the same reasoning as clearing q37/q38/q40 on a non-twelve-month
--  round, which section_d_only_at_12m already enforces at the database level.
--
--  ── WHAT IT DOES NOT DO ──
--
--  It does not submit. status stays 'draft' until the whole survey is
--  submitted, because A1 and B1 count submitted surveys and a section-A-only
--  survey would drag both percentages toward one interview's first ten answers.
--
--  It does not validate the answer codes: 0078's constraints and
--  guard_followup_answer do that, and a second copy here would be a second
--  copy free to drift.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_a(
  p_survey_id     uuid,
  p_q7            text default null,
  p_q8            text default null,
  p_q9_options    uuid[] default null,
  p_q10           text default null,
  p_q11_options   uuid[] default null,
  p_q12           text default null,
  p_q13           text default null,
  p_q14           text default null,
  p_q15_count     numeric default null,
  p_q15_options   uuid[] default null,
  p_q16           text default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey followup_survey%rowtype;
begin
  -- Locked, so two enumerators on the same draft serialise. RLS applies the
  -- UPDATE policy to a locking read (see 0068), which is also what stops
  -- anyone who may not write this survey -- fu_update admits a coordinator, or
  -- an enumerator while it is still a draft.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  update followup_survey
     set q08_applied_knowledge = p_q8,
         q14_used_office       = p_q14,
         -- Q16 is only asked when the office was used. Cleared otherwise, so
         -- B1's numerator can never carry an answer from someone its
         -- denominator excludes.
         q16_advice_useful     = case when p_q14 = 'yes' then p_q16 else null end
   where id = p_survey_id;

  -- Single-value answers. The primary key is (survey_id, question_code), so
  -- re-saving a section overwrites rather than duplicating.
  insert into followup_answer (survey_id, question_code, value_text)
  values (p_survey_id, 'Q7',  p_q7),
         (p_survey_id, 'Q10', p_q10),
         (p_survey_id, 'Q12', p_q12),
         (p_survey_id, 'Q13', p_q13)
  on conflict (survey_id, question_code)
  do update set value_text = excluded.value_text, updated_at = now();

  -- Q15's count lives in value_number; its services are options below.
  if p_q14 = 'yes' then
    insert into followup_answer (survey_id, question_code, value_number)
    values (p_survey_id, 'Q15', p_q15_count)
    on conflict (survey_id, question_code)
    do update set value_number = excluded.value_number, updated_at = now();
  else
    delete from followup_answer where survey_id = p_survey_id and question_code = 'Q15';
  end if;

  -- Options are replaced wholesale: a deselected box has to disappear, and
  -- there is no other way to say "these and only these".
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q9','Q11','Q15');

  -- Q9 belongs only to a 'no' at Q8. Anything else and the branch is gone.
  if p_q8 = 'no' and p_q9_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id)
    select p_survey_id, 'Q9', unnest(p_q9_options)
    on conflict do nothing;
  end if;

  if p_q10 is distinct from 'no' and p_q11_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id)
    select p_survey_id, 'Q11', unnest(p_q11_options)
    on conflict do nothing;
  end if;

  if p_q14 = 'yes' and p_q15_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id)
    select p_survey_id, 'Q15', unnest(p_q15_options)
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved', 'survey_id', p_survey_id);
end;
$function$;

comment on function public.save_followup_section_a(uuid, text, text, uuid[], text, uuid[], text, text, text, numeric, uuid[], text) is
  'Saves section A in one transaction across followup_survey, followup_answer '
  'and followup_answer_option. Clears the conditional branches (Q9, Q11, Q15, '
  'Q16) when their condition no longer holds, so a corrected answer cannot '
  'leave a contradicting one attached. Never submits: status stays draft until '
  'the whole survey is, because A1 and B1 count submitted surveys.';

revoke all on function public.save_followup_section_a(uuid, text, text, uuid[], text, uuid[], text, text, text, numeric, uuid[], text) from public, anon;
grant execute on function public.save_followup_section_a(uuid, text, text, uuid[], text, uuid[], text, text, text, numeric, uuid[], text) to authenticated;
