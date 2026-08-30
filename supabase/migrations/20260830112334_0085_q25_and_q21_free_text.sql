-- ═══════════════════════════════════════════════════════════════════════════
--  0085 — Q25 arrives, and Q21 gets the open text the sheet always allowed
--
--  Both were gaps 0084 left open deliberately rather than guess at. The sheet's
--  wording has now been supplied for both, so they close.
--
--  ── Q25 ──
--
--  0078 left Q25 unconstrained and said so in its comment: "its options have
--  not been supplied and guessing them would be inventing." They have been
--  supplied, verbatim:
--
--    Do you know which authority to approach for a food safety approval or
--    licence for your product?
--        Yes, clearly / Somewhat / No
--
--  Worth noting what the guess would have been. Every neighbouring question is
--  a three- or four-point scale, so "yes/no" would have been wrong about the
--  SHAPE as well as the wording -- "Somewhat" is the answer that distinguishes
--  a producer who has heard of the process from one who could actually start
--  it, and it is the one the Municipality can act on.
--
--  The stem says "a food safety approval OR licence", not licensing alone. Q23
--  separates the health certificate from the home-business licence, so this
--  question spans both of those items and the wording has to keep them.
--
--  ── Q21 ──
--
--  The sheet gives Q21 as open text OR the exhibition product list. 0084 built
--  the list and not the text, so a producer making something not on the eleven
--  had nowhere to put it.
--
--  It is NOT modelled as an "Other" option on ref_product. That table is shared
--  with exhibition_registration_product, which has no option_other column of
--  its own -- adding a free-text row to the list would put an unanswerable
--  "Other" on the market registration form, which is the exact defect 0082 was
--  written to close, introduced somewhere new.
--
--  Instead it takes the shape Q19 already uses: the options in
--  followup_answer_option, the open text in followup_answer under the same
--  question code. Two tables, no collision, nothing else affected.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_followup_answer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_allowed text[];
begin
  -- Every question that legitimately writes here. A code outside this list is a
  -- typo, and an answer to a question nobody asked is worse than a missing one.
  if new.question_code not in
     ('Q7','Q10','Q12','Q13','Q15','Q19','Q21','Q25','Q32','Q42') then
    raise exception
      'question_code % does not store an answer in followup_answer',
      new.question_code
      using errcode = 'check_violation';
  end if;

  v_allowed := case new.question_code
    when 'Q7'  then array['very_relevant','somewhat_relevant',
                          'not_very_relevant','not_at_all_relevant']
    when 'Q10' then array['yes_significantly','yes_some_extent','no']
    when 'Q12' then array['much_better','somewhat_better','no_change','worse']
    when 'Q13' then array['more_than_three','one_to_three','no']
    when 'Q25' then array['yes_clearly','somewhat','no']
    when 'Q32' then array['none','one_to_two','three_to_five','more_than_five']
    -- Q15 is a count in value_number, Q19 is the month an activity stopped,
    -- Q21 is a product the eleven-item list does not carry, and Q42 is
    -- value_boolean. All four are free by design, not by omission.
    else null
  end;

  if v_allowed is not null
     and new.value_text is not null
     and not (new.value_text = any (v_allowed)) then
    raise exception
      'value_text % is not one of the answers to %',
      new.value_text, new.question_code
      using errcode = 'check_violation';
  end if;

  return new;
end $function$;

comment on function public.guard_followup_answer() is
  'followup_answer had a primary key, a foreign key and no value check at all, '
  'so Q7, Q10, Q12, Q13 and Q32 were free text despite having fixed option '
  'sets. Validates value_text per question and refuses a question_code that '
  'does not belong to this table. Q25 joined the constrained set in 0085 when '
  'its options were supplied; Q19, Q21 and Q42 are free by design.';

revoke all on function public.guard_followup_answer() from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  save_followup_section_b, with the two new answers
--
--  Replaced whole, so: 0084 is the only migration that has touched it.
--    grep -l "function public.save_followup_section_b" supabase/migrations/*.sql
--  Checked before writing this, because rewriting a function from an older copy
--  is how 0082 reverted 0080's read-back guard without anything noticing.
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
end;
$function$;

-- The 0084 signature is dropped: every parameter has a default, so leaving both
-- in place makes every call ambiguous.
drop function public.save_followup_section_b(
  uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, jsonb, uuid[], text, int, int, int);

comment on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, text, jsonb, uuid[], text, text, int, int, int) is
  'Saves section B (Q17-Q26) in one transaction across followup_survey, '
  'followup_answer, followup_answer_option and followup_safety_item. Q17 is '
  'C1. Clears Q19 when the activity is not paused or stopped and Q24 when the '
  'checklist has nothing left undone, reading Q23 back from the rows it just '
  'wrote rather than trusting the caller, and verifying every clear -- RLS '
  'filters a delete it will not permit and reports success. Q25 and Q21''s open '
  'text arrived in 0085. Never submits.';

revoke all on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, text, jsonb, uuid[], text, text, int, int, int) from public, anon;
grant execute on function public.save_followup_section_b(uuid, text, text, text, uuid[], text, uuid[], text, uuid[], text, text, jsonb, uuid[], text, text, int, int, int) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  followup_safety_item.obstacle stays empty on purpose
--
--  Q24 is asked ONCE, over the whole checklist -- "for any item marked in
--  progress or not yet started, what is the main obstacle". It is not nine
--  questions. The per-item column has been there since 0011 and the sheet has
--  never asked for what it would hold.
--
--  Recorded here rather than dropped: dropping it is a change to a table
--  holding survey data for a gain of nothing, and a column that is documented
--  as unused is cheaper than one that is quietly repurposed later.
-- ═══════════════════════════════════════════════════════════════════════════
comment on column public.followup_safety_item.obstacle is
  'UNUSED, deliberately. Q24 asks for one main obstacle across the whole '
  'checklist and is stored in followup_answer_option; the sheet has no '
  'per-item obstacle question. Do not fill this without one -- a value nobody '
  'asked for is a value nobody checks.';
