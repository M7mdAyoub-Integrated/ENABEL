-- ═══════════════════════════════════════════════════════════════════════════
--  0091 — Q39 could store its reasons but not its month
--
--  ── THE ASYMMETRY ──
--
--  Q39 is "if not engaged, when and why", the twelve-month twin of Q19. Both
--  halves have to land somewhere:
--
--      the reasons -> followup_answer_option, list ref_stop_reason
--      the month   -> followup_answer, free text
--
--  `guard_followup_option` has known about Q39 since 0075 -- it maps Q39 to
--  `ref_stop_reason`, which is the same list Q19 uses, because the sheet says
--  they are the same list and two copies of one list is how the same answer
--  stops matching itself.
--
--  `guard_followup_answer` was never told. Its list of codes that may write to
--  followup_answer is Q7, Q10, Q12, Q13, Q15, Q19, Q21, Q25, Q32, Q42 -- Q19 is
--  there and Q39 is not. So the month would have been refused with
--
--      question_code Q39 does not store an answer in followup_answer
--
--  ...at the end of a twelve-month interview, from a guard that is otherwise
--  right to be strict. Half of Q39 was reachable and half was not, and the two
--  guards disagreed about the same question.
--
--  ── FREE BY DESIGN, LIKE Q19'S MONTH ──
--
--  Q39 joins the list of codes that may write, and NOT the `v_allowed` case.
--  There is no option set for "when did it stop": it is a month and a year in
--  whatever form the respondent gives it, exactly as Q19 is. Constraining it
--  would mean inventing a date format for a spoken answer.
--
--  ── ON REPLACING guard_followup_answer ──
--
--      grep -l "function public.guard_followup_answer" supabase/migrations/*.sql
--
--  0078 wrote it, 0085 added Q25 to the constrained set and Q21 to the free
--  one. The body below is 0085's, verified byte-for-byte against pg_proc.prosrc
--  before being copied, with 'Q39' added to the code list and the two comments
--  that enumerate the free questions brought up to date. Nothing else moves.
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
     ('Q7','Q10','Q12','Q13','Q15','Q19','Q21','Q25','Q32','Q39','Q42') then
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
    -- Q15 is a count in value_number, Q19 and Q39 are the month an activity
    -- stopped, Q21 is a product the eleven-item list does not carry, and Q42 is
    -- value_boolean. All five are free by design, not by omission.
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
  'its options were supplied; Q39 joined the permitted codes in 0091, having '
  'been in guard_followup_option since 0075 and here since never. Q19, Q21, '
  'Q39 and Q42 are free by design.';

revoke all on function public.guard_followup_answer() from public, anon, authenticated;
