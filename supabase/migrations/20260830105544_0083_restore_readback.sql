-- ═══════════════════════════════════════════════════════════════════════════
--  0083 — restoring the read-back guard that 0082 removed
--
--  ── WHAT HAPPENED, TWENTY MINUTES AFTER IT WAS WRITTEN ──
--
--  0080 added a read-back to save_followup_section_a: clear the conditional
--  branches, then count what is left, and raise if anything survived. It exists
--  because RLS filters a delete it will not permit and reports success, which
--  is how 0079 shipped a comment describing behaviour it did not have.
--
--  0082 needed to change that function's signature, so it rewrote it -- from
--  0079's text, which is the version WITHOUT the guard. The rewrite compiled,
--  applied cleanly, passed check_migration_files.sh, and its own test of the
--  free-text rules passed. Every check was green and the tripwire was gone.
--
--  Nothing would have caught this. The file existed, the function existed, the
--  signature was right, the new behaviour worked. Only reading 0080 next to
--  0082 shows the four lines that stopped being there.
--
--  ── THE GENERAL SHAPE ──
--
--  `create or replace function` takes the WHOLE body. Rewriting one from an
--  older migration silently reverts every later change to it. A migration that
--  replaces a function is not additive the way a migration that adds a column
--  is, and it is the only kind of migration in this project that can quietly
--  undo an earlier one.
--
--  So: before replacing a function, list every migration that has touched it.
--
--    grep -l "function public.<name>" supabase/migrations/*.sql
--
--  0079 wrote it, 0080 added the guard, 0082 changed the signature. Three, and
--  the middle one is the one that mattered.
--
--  ── WHETHER THIS RAISE CAN ACTUALLY FIRE TODAY ──
--
--  Not with the current policies, and that is worth stating rather than
--  implying. The delete needs fu_delete_child, the FOR UPDATE above it needs
--  fu_update -- and both admit exactly a coordinator, or an enumerator while
--  the survey is a draft. Anyone who gets past the lock can also delete.
--
--  It is a tripwire for the next policy change, not a live branch. It was
--  tested by dropping fu_delete_child inside a transaction, confirming the
--  raise, and restoring it -- rather than by asserting it in a comment, which
--  is what this project keeps learning not to do.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_a(
  p_survey_id     uuid,
  p_q7            text default null,
  p_q8            text default null,
  p_q9_options    uuid[] default null,
  p_q9_other      text default null,
  p_q10           text default null,
  p_q11_options   uuid[] default null,
  p_q11_other     text default null,
  p_q12           text default null,
  p_q13           text default null,
  p_q14           text default null,
  p_q15_count     numeric default null,
  p_q15_options   uuid[] default null,
  p_q15_other     text default null,
  p_q16           text default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey followup_survey%rowtype;
  v_stale  int;
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

  -- RLS does not raise on a delete it will not permit; it filters the rows and
  -- reports success. Until 0080 there was no DELETE policy at all, so the line
  -- above did nothing for the whole life of this function and said nothing.
  -- Reading back turns that into an error instead of a wrong answer. 0082
  -- rewrote this function from 0079 and dropped these six lines; 0083 is them.
  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q9','Q11','Q15');
  if v_stale > 0 then
    raise exception
      'could not clear the conditional answers for survey % -- % option rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered. An option id that is not in the list has to
  -- reach the guard and be refused; selecting only the ids that matched would
  -- drop it silently, which is the failure this family of guards exists to
  -- stop. The join is also what puts the free text on the one option that takes
  -- it and null on every other, so both halves of the guard are satisfied by
  -- construction rather than by the caller being careful.

  -- Q9 belongs only to a 'no' at Q8. Anything else and the branch is gone.
  if p_q8 = 'no' and p_q9_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q9', x.id,
           case when o.allows_free_text then nullif(btrim(p_q9_other), '') end
      from unnest(p_q9_options) as x(id)
      left join ref_nonapply_reason o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q10 is distinct from 'no' and p_q11_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q11', x.id,
           case when o.allows_free_text then nullif(btrim(p_q11_other), '') end
      from unnest(p_q11_options) as x(id)
      left join ref_practice_change o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q14 = 'yes' and p_q15_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q15', x.id,
           case when o.allows_free_text then nullif(btrim(p_q15_other), '') end
      from unnest(p_q15_options) as x(id)
      left join ref_office_service_type o on o.id = x.id
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved', 'survey_id', p_survey_id);
end;
$function$;

comment on function public.save_followup_section_a(uuid, text, text, uuid[], text, text, uuid[], text, text, text, text, numeric, uuid[], text, text) is
  'Saves section A in one transaction across followup_survey, followup_answer '
  'and followup_answer_option. Clears the conditional branches (Q9, Q11, Q15, '
  'Q16) when their condition no longer holds, and VERIFIES the clear happened '
  '-- RLS filters a delete it will not permit and reports success, which is how '
  '0079 shipped a comment claiming behaviour it did not have. Carries the '
  '"Other" specification for Q9, Q11 and Q15 (0082). Never submits: status '
  'stays draft until the whole survey is, because A1 and B1 count submitted '
  'surveys.';
