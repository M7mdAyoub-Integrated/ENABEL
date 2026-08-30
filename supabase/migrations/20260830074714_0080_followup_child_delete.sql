-- ═══════════════════════════════════════════════════════════════════════════
--  0080 — the follow-up child tables could not delete, and nothing said so
--
--  ── WHAT HAPPENED ──
--
--  0079's header claims that correcting Q8 away from "no" removes the Q9
--  reasons attached to it. It does not. Tested through the screen:
--
--    Q8 = no, two reasons ticked, saved      Q9 options: 2
--    Q8 corrected to "regularly", saved      Q9 options: 2
--
--  followup_answer, followup_answer_option, followup_safety_item and
--  followup_buyer_connection each have SELECT, INSERT and UPDATE policies and
--  NO DELETE policy. RLS does not raise on a delete it does not permit -- it
--  filters the rows, the statement affects zero, and the caller is told
--  nothing. The delete in save_followup_section_a has never done anything.
--
--  This is the `partnership_role` problem again, in a new place. It is recorded
--  in data/partnerships.ts in almost these words, and it still cost a false
--  claim in a migration header because the code was written from the intent
--  rather than from the policy list.
--
--  ── IT IS WORSE THAN THE CONDITIONAL BRANCHES ──
--
--  Every multi-select in this survey replaces its rows by deleting and
--  re-inserting, because that is the only way to say "these and only these".
--  With no DELETE policy, EVERY option list in the survey was append-only: a
--  box, once ticked and saved, could never be unticked. Q9, Q11, Q15, Q20, Q21,
--  Q23's safety items, Q27, Q28, Q33, Q35's buyers, Q36, Q41. All of them.
--
--  ── WHY A DELETE POLICY DOES NOT BREAK RULE 2 ──
--
--  CLAUDE.md forbids hard deletes so that programme data stays auditable for
--  the donor. These four tables are not that:
--
--    • They have no deleted_at column and never did, so there is no soft
--      delete available to use instead.
--    • They cascade from followup_survey, which IS soft-deleted and audited.
--      They have no life of their own.
--    • All four carry audit_row(), so a removed tick is recorded in audit_log
--      with its old value. The correction is traceable, which is the thing rule
--      2 exists to protect.
--
--  A deselected box that cannot be removed is not conservation, it is a wrong
--  answer preserved forever and reported to the donor.
--
--  The policy mirrors fu_update_child exactly: a coordinator always, an
--  enumerator only while the survey is a draft. Nobody gains a power they did
--  not already have over the same rows.
--
--  ── AND THE FUNCTION NOW CHECKS ──
--
--  save_followup_section_a re-reads after clearing and raises if a branch that
--  should be empty is not. Had that been there, the silent delete would have
--  been an error on the first save instead of a claim in a comment.
-- ═══════════════════════════════════════════════════════════════════════════

create policy fu_delete_child on public.followup_answer
  for delete to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator'
             and exists (select 1 from public.followup_survey s
                          where s.id = followup_answer.survey_id
                            and s.status = 'draft'::record_status_t)));

create policy fu_delete_child on public.followup_answer_option
  for delete to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator'
             and exists (select 1 from public.followup_survey s
                          where s.id = followup_answer_option.survey_id
                            and s.status = 'draft'::record_status_t)));

create policy fu_delete_child on public.followup_safety_item
  for delete to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator'
             and exists (select 1 from public.followup_survey s
                          where s.id = followup_safety_item.survey_id
                            and s.status = 'draft'::record_status_t)));

create policy fu_delete_child on public.followup_buyer_connection
  for delete to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator'
             and exists (select 1 from public.followup_survey s
                          where s.id = followup_buyer_connection.survey_id
                            and s.status = 'draft'::record_status_t)));

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
  v_stale  int;
begin
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
         q16_advice_useful     = case when p_q14 = 'yes' then p_q16 else null end
   where id = p_survey_id;

  insert into followup_answer (survey_id, question_code, value_text)
  values (p_survey_id, 'Q7',  p_q7),
         (p_survey_id, 'Q10', p_q10),
         (p_survey_id, 'Q12', p_q12),
         (p_survey_id, 'Q13', p_q13)
  on conflict (survey_id, question_code)
  do update set value_text = excluded.value_text, updated_at = now();

  if p_q14 = 'yes' then
    insert into followup_answer (survey_id, question_code, value_number)
    values (p_survey_id, 'Q15', p_q15_count)
    on conflict (survey_id, question_code)
    do update set value_number = excluded.value_number, updated_at = now();
  else
    delete from followup_answer where survey_id = p_survey_id and question_code = 'Q15';
  end if;

  delete from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q9','Q11','Q15');

  -- RLS does not raise on a delete it will not permit; it filters the rows and
  -- reports success. Until 0080 there was no DELETE policy at all, so the line
  -- above did nothing for the whole life of this function and said nothing.
  -- Reading back turns that into an error instead of a wrong answer.
  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q9','Q11','Q15');
  if v_stale > 0 then
    raise exception
      'could not clear the conditional answers for survey % -- % option rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

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
  'Saves section A in one transaction. Clears the conditional branches (Q9, '
  'Q11, Q15, Q16) when their condition no longer holds, and VERIFIES the clear '
  'happened -- RLS filters a delete it will not permit and reports success, '
  'which is how 0079 shipped a comment claiming behaviour it did not have. '
  'Never submits: status stays draft until the whole survey is.';
