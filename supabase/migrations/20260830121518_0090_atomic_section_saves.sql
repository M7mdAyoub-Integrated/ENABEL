-- ═══════════════════════════════════════════════════════════════════════════
--  0090 — a refusal that reported failure and deleted the old rows anyway
--
--  ── WHAT WAS WRONG ──
--
--  All three section saves replace their children by delete-then-insert,
--  because that is the only way to say "these and only these".
--
--  `save_followup_section_c` wrapped the buyer INSERT in an exception block and
--  returned 'buyer_invalid' from it. The matching DELETE ran *before* that
--  block. A plpgsql exception handler only rolls back the statements inside its
--  own block, so a refused buyer came back as a clean structured "not saved"
--  with the previously recorded buyers already destroyed.
--
--  Verified before writing this, as an enumerator under RLS: one buyer on
--  record, a save carrying an incomplete buyer, result 'buyer_invalid', zero
--  buyers left. The screen said "Not saved". Something had very much been
--  saved, and something else had been deleted.
--
--  Sections A and B did not have the defect -- A catches nothing at all, and
--  B's only handler sits on the UPDATE, which runs before any delete. Both are
--  safe by accident. If a delete is ever moved above that return, nothing in
--  the project notices. So all three are given the same shape.
--
--  ── WHY ONE BLOCK ROUND THE WHOLE BODY, AND NOT THE ALTERNATIVES ──
--
--  Raising instead of returning would roll the whole call back correctly, and
--  it would throw away the structured result -- 'buyer_invalid' is the only
--  thing that tells the enumerator which block was wrong. Trading a specific
--  message for a generic error to fix a transaction problem is fixing the wrong
--  thing.
--
--  Validating the buyers before writing anything reads cleanest, and it means
--  duplicating the buyer rule outside `guard_buyer_connection_other`, which is
--  the trigger that enforces it. Two copies of a rule drift. The trigger stays
--  the only place that knows.
--
--  One handler on the outermost block gives both properties: catching it rolls
--  back everything inside it, deletes included, and it still returns the
--  structured result.
--
--  ── WHAT IS DELIBERATELY NOT CAUGHT ──
--
--  `insufficient_privilege`. That is the read-back guard reporting that RLS
--  filtered a delete (0080, 0083). It must stay a hard error -- catching it
--  would turn "your delete silently did nothing" back into a tidy message,
--  which is the failure those guards were written for.
--
--  ── ONE BEHAVIOUR CHANGE WORTH STATING ──
--
--  Section A previously let a check_violation propagate as a raw error, and
--  Section B let one from `guard_followup_option` or `guard_followup_answer` do
--  the same. Both now return 'invalid' with the constraint name. That is the
--  point of the uniformity, but it is a change: SectionAResult gains 'invalid'
--  and the screens gained a message for it.
--
--  ── ON REPLACING THESE THREE ──
--
--      grep -l "function public.save_followup_section_a" supabase/migrations/*.sql
--
--  A: 0079 wrote it, 0080 guarded it, 0082 re-signed it, 0083 restored the
--  guard 0082 had dropped. B: 0084, then 0085. C: 0088 only.
--
--  Each body below was taken from the migration that last touched that
--  function, and each of those three was compared byte-for-byte against
--  pg_proc.prosrc first -- not read from the newest file and assumed. The only
--  differences are the handlers described above.
--
--  Signatures are unchanged, so the functions are replaced rather than dropped
--  and their COMMENTs and GRANTs carry over untouched. Verified after applying.
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
  v_con    text;
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

exception
  -- ── ONE BLOCK, ROUND THE WHOLE BODY ──
  --
  -- It has to cover the deletes, not just the statement that can fail. A
  -- handler that starts after a delete catches the refusal, returns a tidy
  -- "not saved", and leaves the deleted rows deleted -- the save reports
  -- failure and destroys data in the same breath. See 0090's header.
  --
  -- insufficient_privilege is deliberately NOT caught: that is the read-back
  -- guard saying RLS filtered a delete, and it must stay a hard error.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

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
  p_q21_free_text text default null,
  p_q22           text default null,
  p_q23           jsonb default null,
  p_q24_options   uuid[] default null,
  p_q24_other     text default null,
  p_q25           text default null,
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

  update followup_survey
     set q17_activity_status       = p_q17,
         q18_started_after_support = p_q18,
         q22_volume_change         = p_q22,
         q26_workers_total         = p_q26_total,
         q26_workers_women         = p_q26_women,
         q26_workers_under30       = p_q26_under30
   where id = p_survey_id;

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

  -- ── the single-value answers ─────────────────────────────────────────────
  --
  -- Q21's open text sits beside its options, the way Q19's month sits beside
  -- its reasons. Q25 is a three-point scale constrained by
  -- guard_followup_answer, so nothing is validated twice here.
  insert into followup_answer (survey_id, question_code, value_text)
  values (p_survey_id, 'Q21', nullif(btrim(p_q21_free_text), '')),
         (p_survey_id, 'Q25', p_q25)
  on conflict (survey_id, question_code)
  do update set value_text = excluded.value_text, updated_at = now();

  -- ── Q19's month ──────────────────────────────────────────────────────────
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
  -- option at all. A product the list does not carry goes in p_q21_free_text
  -- above, not as an "Other" row -- ref_product is shared with the market
  -- registration form, which has no column to hold a specification.
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

exception
  -- ── ONE BLOCK, ROUND THE WHOLE BODY ──
  --
  -- It has to cover the deletes, not just the statement that can fail. A
  -- handler that starts after a delete catches the refusal, returns a tidy
  -- "not saved", and leaves the deleted rows deleted -- the save reports
  -- failure and destroys data in the same breath. See 0090's header.
  --
  -- insufficient_privilege is deliberately NOT caught: that is the read-back
  -- guard saying RLS filtered a delete, and it must stay a hard error.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

create or replace function public.save_followup_section_c(
  p_survey_id     uuid,
  p_q27_options   uuid[] default null,
  p_q27_other     text default null,
  p_q28_options   uuid[] default null,
  p_q28_other     text default null,
  p_q29           text default null,
  p_q30           int default null,
  p_q31           text default null,
  p_q32           text default null,
  p_q33_options   uuid[] default null,
  p_q33_other     text default null,
  p_q34           text default null,
  p_q35           jsonb default null,
  p_q36_options   uuid[] default null,
  p_q36_other     text default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey    followup_survey%rowtype;
  v_stale     int;
  v_counted   int;
  v_connected boolean;
  v_extra     int;
  v_con       text;
  v_phase     text := 'survey';
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

  -- Q28 cannot name a channel Q27 does not. Refused rather than silently
  -- trimmed: the enumerator has entered a contradiction and needs to see it.
  if p_q28_options is not null and p_q27_options is not null then
    select count(*) into v_extra
      from unnest(p_q28_options) as x(id)
     where not (x.id = any (p_q27_options));
    if v_extra > 0 then
      return jsonb_build_object('ok', false, 'result', 'q28_not_in_q27', 'count', v_extra);
    end if;
  elsif p_q28_options is not null then
    return jsonb_build_object('ok', false, 'result', 'q28_not_in_q27',
                              'count', array_length(p_q28_options, 1));
  end if;

  v_counted   := count_markets_attended(v_survey.person_id);
  v_connected := p_q34 in ('yes', 'connection_no_sale');

  update followup_survey
     set q29_selling_change     = p_q29,
         q30_events_attended    = coalesce(p_q30, v_counted),
         -- The flag is about the two figures disagreeing, not about the box
         -- having been touched. Recomputed here, never taken from the caller.
         q30_is_overridden      = (p_q30 is not null and p_q30 is distinct from v_counted),
         q31_last_event_sales_band = p_q31,
         q34_connection_made    = p_q34
   where id = p_survey_id;

  -- Q32, a four-point band constrained by guard_followup_answer.
  insert into followup_answer (survey_id, question_code, value_text)
  values (p_survey_id, 'Q32', p_q32)
  on conflict (survey_id, question_code)
  do update set value_text = excluded.value_text, updated_at = now();

  -- ── the option lists ─────────────────────────────────────────────────────
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q27','Q28','Q33','Q36');

  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q27','Q28','Q33','Q36');
  if v_stale > 0 then
    raise exception
      'could not clear section C''s options for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered, so an option id outside the list reaches
  -- guard_followup_option and is refused rather than dropped in silence.
  if p_q27_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q27', x.id,
           case when o.allows_free_text then nullif(btrim(p_q27_other), '') end
      from unnest(p_q27_options) as x(id)
      left join ref_sales_channel o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q28_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q28', x.id,
           case when o.allows_free_text then nullif(btrim(p_q28_other), '') end
      from unnest(p_q28_options) as x(id)
      left join ref_sales_channel o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q33_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q33', x.id,
           case when o.allows_free_text then nullif(btrim(p_q33_other), '') end
      from unnest(p_q33_options) as x(id)
      left join ref_market_improvement o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q36_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q36', x.id,
           case when o.allows_free_text then nullif(btrim(p_q36_other), '') end
      from unnest(p_q36_options) as x(id)
      left join ref_selling_barrier o on o.id = x.id
    on conflict do nothing;
  end if;

  -- ── Q35, the buyer connections ───────────────────────────────────────────
  delete from followup_buyer_connection where survey_id = p_survey_id;

  select count(*) into v_stale from followup_buyer_connection where survey_id = p_survey_id;
  if v_stale > 0 then
    raise exception
      'could not clear the buyer connections for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  if v_connected and p_q35 is not null then
    -- seq is assigned from the order given, not taken from the caller. Removing
    -- the second of three buyers must not leave a hole that unique(survey_id,
    -- seq) then refuses to fill.
    -- Everything from here is a buyer's fault rather than the survey's, and the
    -- single handler at the bottom reads this to say which.
    v_phase := 'buyers';
    insert into followup_buyer_connection
      (survey_id, seq, buyer_name, buyer_type_id, buyer_type_other,
       how_connected, how_connected_other, arrangement, still_active)
    select p_survey_id,
           row_number() over (order by ord)::smallint,
           btrim(e ->> 'buyer_name'),
           (e ->> 'buyer_type_id')::uuid,
           nullif(btrim(e ->> 'buyer_type_other'), ''),
           e ->> 'how_connected',
           nullif(btrim(e ->> 'how_connected_other'), ''),
           e ->> 'arrangement',
           e ->> 'still_active'
      from jsonb_array_elements(p_q35) with ordinality as t(e, ord);
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved',
                            'survey_id', p_survey_id,
                            'markets_counted', v_counted);

exception
  -- ── ONE BLOCK, ROUND THE WHOLE BODY ──
  --
  -- 0088 had two handlers: one on the UPDATE and one on the buyer INSERT. The
  -- second sat after `delete from followup_buyer_connection`, so a refused
  -- buyer returned 'buyer_invalid' with the previously recorded buyers already
  -- gone -- verified: one buyer on record, a refused save, zero buyers left.
  --
  -- v_phase is what keeps the two answers distinguishable now that one handler
  -- catches both. It is not derived from the diagnostics because
  -- guard_buyer_connection_other raises by hand, and a hand-raised exception
  -- carries no table_name to test.
  --
  -- insufficient_privilege is deliberately NOT caught: that is the read-back
  -- guard saying RLS filtered a delete, and it must stay a hard error.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object(
      'ok', false,
      'result', case when v_phase = 'buyers' then 'buyer_invalid' else 'invalid' end,
      'constraint', coalesce(nullif(v_con, ''),
                             case when v_phase = 'buyers' then 'missing_field' else 'invalid' end));
end;
$function$;
