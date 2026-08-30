-- ═══════════════════════════════════════════════════════════════════════════
--  0082 — "Other (please specify)" is specified, or refused
--
--  ── WHAT WAS WRONG ──
--
--  CLAUDE.md's convention reads: the ref_ row carries allows_free_text, the
--  owning table carries a matching *_other column, and a check constraint
--  requires the free text when that option is chosen.
--
--  followup_answer_option had the column and nothing else. Measured before
--  writing this:
--
--    constraints on followup_answer_option   pkey, survey_id fkey. That is all.
--    rows with option_other filled           0
--    lists with a free-text option           7 of the 8
--
--  So an enumerator ticking "Other" under Q9 stored the fact that something
--  else was the reason and threw away what it was. Nothing anywhere said so:
--  the insert succeeded, the option came back on reload, and the box was
--  ticked. The specification was never asked for, so it was never missed.
--
--  Same shape as the eight junctions in 0080 and 0081 -- a column that exists,
--  a convention that is written down, and no mechanism between them. It is
--  cheaper here because no indicator depends on it. It is still an answer lost
--  from an interview nobody is going back to repeat.
--
--  ── WHY A GUARD AND NOT A CHECK CONSTRAINT ──
--
--  A check constraint cannot see allows_free_text: it lives in one of eight
--  ref_ tables and which one depends on question_code. That is the same reason
--  option_id has no foreign key, and this trigger already resolves the table.
--  The rule goes where the resolution already happens.
--
--  It refuses in BOTH directions, deliberately:
--    - a free-text option with nothing specified -- the answer that was lost
--    - free text on an option that does not take it -- text nobody will read,
--      hanging off an answer that already says everything it says
--
--  ── AND SECTION A IS IN THE SAME MIGRATION ──
--
--  Normally one concern per migration. This is one concern. The moment the
--  guard exists, save_followup_section_a starts REFUSING a save it used to
--  accept: Q9, Q11 and Q15 each carry a free-text option and it has no
--  parameter to carry the text. Shipping the guard by itself would turn a
--  quietly lost answer into a lost section.
--
--  The signature gains three parameters, so the twelve-argument version is
--  DROPPED rather than replaced. Every parameter has a default, and two
--  overloads differing only in trailing defaults make every call ambiguous.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_followup_option()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_table text;
  v_free  boolean;
begin
  v_table := case new.question_code
    when 'Q9'  then 'ref_nonapply_reason'
    when 'Q11' then 'ref_practice_change'
    when 'Q15' then 'ref_office_service_type'
    when 'Q19' then 'ref_stop_reason'
    when 'Q20' then 'ref_survey_activity'
    when 'Q21' then 'ref_product'
    when 'Q24' then 'ref_compliance_obstacle'
    when 'Q27' then 'ref_sales_channel'
    when 'Q28' then 'ref_sales_channel'
    when 'Q33' then 'ref_market_improvement'
    when 'Q36' then 'ref_selling_barrier'
    when 'Q39' then 'ref_stop_reason'
    when 'Q41' then 'ref_support_need'
    else null
  end;

  if v_table is null then
    raise exception
      'question_code % has no option list; followup_answer_option accepts only the multi-select questions',
      new.question_code
      using errcode = 'check_violation';
  end if;

  -- One lookup answers both questions. allows_free_text is `not null default
  -- false` on every ref_ table, so a null coming back from here means no row
  -- matched -- never an option whose flag happens to be unset.
  execute format(
    'select allows_free_text from public.%I where id = $1 and deleted_at is null', v_table)
    into v_free using new.option_id;

  if v_free is null then
    raise exception
      'option % is not a live row in %, which is the list for %',
      new.option_id, v_table, new.question_code
      using errcode = 'foreign_key_violation';
  end if;

  if v_free and coalesce(btrim(new.option_other), '') = '' then
    raise exception
      'option % in % allows free text, so option_other must say what it was',
      new.option_id, v_table
      using errcode = 'check_violation';
  end if;

  if not v_free and new.option_other is not null then
    raise exception
      'option % in % is a fixed answer and takes no free text',
      new.option_id, v_table
      using errcode = 'check_violation';
  end if;

  return new;
end $function$;

comment on function public.guard_followup_option() is
  'followup_answer_option.option_id is a bare uuid: the list it points into '
  'depends on question_code, so one foreign key cannot cover it. Without this, '
  'any uuid could be written and nothing would ever say so. Refuses an unknown '
  'question_code, an option that is not live in that question''s list, an '
  '"Other" with nothing specified, and free text on an option that is not '
  '"Other". Q15 joined the mapping in 0076; the free-text rules arrived in 0082.';

revoke all on function public.guard_followup_option() from public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
--  Section A, carrying the three specifications it was dropping
-- ═══════════════════════════════════════════════════════════════════════════

drop function public.save_followup_section_a(
  uuid, text, text, uuid[], text, uuid[], text, text, text, numeric, uuid[], text);

create function public.save_followup_section_a(
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
  'Q16) when their condition no longer holds, so a corrected answer cannot '
  'leave a contradicting one attached. Carries the "Other" specification for '
  'Q9, Q11 and Q15, which it dropped on the floor until 0082. Never submits: '
  'status stays draft until the whole survey is, because A1 and B1 count '
  'submitted surveys.';

revoke all on function public.save_followup_section_a(uuid, text, text, uuid[], text, text, uuid[], text, text, text, text, numeric, uuid[], text, text) from public, anon;
grant execute on function public.save_followup_section_a(uuid, text, text, uuid[], text, text, uuid[], text, text, text, text, numeric, uuid[], text, text) to authenticated;
