-- ═══════════════════════════════════════════════════════════════════════════
--  0084 — saving section B (Q17–Q26)
--
--  Section B writes to four tables in one transaction, for the same reason
--  section A does: a connection dropping between round trips leaves a section
--  half-written, and the draft design exists to stop exactly that.
--
--    followup_survey          Q17, Q18, Q22, Q26 x3
--    followup_answer          Q19's "when"
--    followup_answer_option   Q19 why, Q20, Q21, Q24
--    followup_safety_item     Q23, nine tri-state rows
--
--  ── Q17 IS C1 ──
--
--  v_ind_c1 counts q17_activity_status in ('expanded','same','reduced') over
--  everyone with a non-null q17. It is a percentage, so one wrong answer does
--  not nudge it -- it drags it. Nothing here computes it; the column is written
--  and the view reads it, and the survey has to reach 'submitted' before the
--  view sees it at all (0072).
--
--  ── THE TWO CONDITIONAL BRANCHES ARE THE ONES THE SHEET STATES ──
--
--  Q19 is "if stopped, when and why", so it belongs to q17 in (paused,
--  stopped). Q24 is "main obstacle for items not done", so it belongs to a Q23
--  with at least one item not 'done'.
--
--  Both are cleared when their condition stops holding, and the clear is READ
--  BACK -- RLS filters a delete it will not permit and reports success, which
--  is the defect 0080 was written for.
--
--  NO OTHER SKIP LOGIC IS INVENTED HERE, and that is a decision rather than an
--  omission. Q20, Q21, Q22, Q23 and Q26 are arguably meaningless when Q17 says
--  the activity never started, but the sheet's skip logic is not in the data
--  dictionary and a hidden question is an unasked question. Asking a redundant
--  question wastes ten seconds; hiding one loses the answer permanently.
--
--  ── Q25 IS NOT HERE ──
--
--  "Do you know which authority to approach?" has no option list in anything
--  supplied so far. 0078 left it deliberately unconstrained and named it rather
--  than guessing. This function has no Q25 parameter for the same reason: with
--  one, the screen would collect something, and a value invented now would not
--  match the real list when it arrives. See OQ-31.
--
--  ── Q26 REFUSES READABLY ──
--
--  workers_women_lte_total and workers_under30_lte_total are typed by a person
--  into three boxes and are easy to get wrong. The UPDATE is wrapped so the
--  constraint name comes back as a result the screen can name, instead of a raw
--  23514 the caller has to parse. The constraint is still the authority; this
--  only translates it, so there is no second copy of the rule to drift.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_b(
  p_survey_id     uuid,
  p_q17           text default null,
  p_q18           text default null,
  p_q19_when      text default null,
  p_q19_options   uuid[] default null,
  p_q19_other     text default null,
  p_q20_options   uuid[] default null,
  p_q20_other     text default null,
  p_q21_options   uuid[] default null,
  p_q22           text default null,
  p_q23           jsonb default null,
  p_q24_options   uuid[] default null,
  p_q24_other     text default null,
  p_q26_total     int default null,
  p_q26_women     int default null,
  p_q26_under30   int default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey    followup_survey%rowtype;
  v_stale     int;
  v_stopped   boolean;
  v_any_undone boolean;
  v_con       text;
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

  v_stopped := p_q17 in ('paused', 'stopped');

  begin
    update followup_survey
       set q17_activity_status       = p_q17,
           q18_started_after_support = p_q18,
           q22_volume_change         = p_q22,
           q26_workers_total         = p_q26_total,
           q26_workers_women         = p_q26_women,
           q26_workers_under30       = p_q26_under30
     where id = p_survey_id;
  exception when check_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid', 'constraint', v_con);
  end;

  -- ── Q23, the nine safety items ────────────────────────────────────────────
  --
  -- Replaced wholesale. An item the enumerator changed from 'done' to
  -- 'not_started' has to actually change, and an item left unanswered has to
  -- have NO ROW -- absent is not the same answer as 'not_started', and
  -- defaulting the nine would report nine not-started items for every
  -- half-finished interview.
  delete from followup_safety_item where survey_id = p_survey_id;

  select count(*) into v_stale from followup_safety_item where survey_id = p_survey_id;
  if v_stale > 0 then
    raise exception
      'could not clear the safety checklist for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  if p_q23 is not null then
    insert into followup_safety_item (survey_id, item_id, status)
    select p_survey_id,
           (e ->> 'item_id')::uuid,
           (e ->> 'status')::tri_status_t
      from jsonb_array_elements(p_q23) as e
    on conflict (survey_id, item_id) do update set status = excluded.status, updated_at = now();
  end if;

  select exists (
    select 1 from followup_safety_item
     where survey_id = p_survey_id and status <> 'done'
  ) into v_any_undone;

  -- ── Q19's "when" ─────────────────────────────────────────────────────────
  if v_stopped then
    insert into followup_answer (survey_id, question_code, value_text)
    values (p_survey_id, 'Q19', p_q19_when)
    on conflict (survey_id, question_code)
    do update set value_text = excluded.value_text, updated_at = now();
  else
    delete from followup_answer where survey_id = p_survey_id and question_code = 'Q19';

    select count(*) into v_stale from followup_answer
     where survey_id = p_survey_id and question_code = 'Q19';
    if v_stale > 0 then
      raise exception
        'could not clear Q19 for survey % -- the answer survived the delete', p_survey_id
        using errcode = 'insufficient_privilege',
              hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
    end if;
  end if;

  -- ── the option lists ─────────────────────────────────────────────────────
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q19','Q20','Q21','Q24');

  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q19','Q20','Q21','Q24');
  if v_stale > 0 then
    raise exception
      'could not clear section B''s options for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered, in every one of these. An option id that is not
  -- in the list has to reach guard_followup_option and be refused; selecting
  -- only the ids that matched would drop it silently. The join also puts the
  -- free text on the one option that takes it and null on the rest, so both
  -- halves of that guard are satisfied by construction.

  if v_stopped and p_q19_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q19', x.id,
           case when o.allows_free_text then nullif(btrim(p_q19_other), '') end
      from unnest(p_q19_options) as x(id)
      left join ref_stop_reason o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q20_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q20', x.id,
           case when o.allows_free_text then nullif(btrim(p_q20_other), '') end
      from unnest(p_q20_options) as x(id)
      left join ref_survey_activity o on o.id = x.id
    on conflict do nothing;
  end if;

  -- Q21 is ref_product, the only one of the eight lists with no free-text
  -- option at all, so there is no p_q21_other to carry.
  if p_q21_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id)
    select p_survey_id, 'Q21', unnest(p_q21_options)
    on conflict do nothing;
  end if;

  -- Q24 belongs to a checklist with something left undone. Read from the rows
  -- just written, not from what the caller claimed, so a stale screen cannot
  -- attach obstacles to a checklist that is now complete.
  if v_any_undone and p_q24_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q24', x.id,
           case when o.allows_free_text then nullif(btrim(p_q24_other), '') end
      from unnest(p_q24_options) as x(id)
      left join ref_compliance_obstacle o on o.id = x.id
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved', 'survey_id', p_survey_id);
end;
$function$;

comment on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, jsonb, uuid[], text, int, int, int) is
  'Saves section B (Q17-Q26) in one transaction across followup_survey, '
  'followup_answer, followup_answer_option and followup_safety_item. Q17 is '
  'C1. Clears Q19 when the activity is not paused or stopped and Q24 when the '
  'checklist has nothing left undone, reading Q23 back from the rows it just '
  'wrote rather than trusting the caller, and verifying every clear -- RLS '
  'filters a delete it will not permit and reports success. Takes no Q25: its '
  'option list has never been supplied and a guess would not match the real '
  'one. Never submits.';

revoke all on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, jsonb, uuid[], text, int, int, int) from public, anon;
grant execute on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, jsonb, uuid[], text, int, int, int) to authenticated;
