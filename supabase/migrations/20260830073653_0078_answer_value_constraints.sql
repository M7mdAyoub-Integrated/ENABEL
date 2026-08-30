-- ═══════════════════════════════════════════════════════════════════════════
--  0078 — the coded answers get constrained, on both tables
--
--  ── FIVE COLUMNS ON followup_survey HAD NO CHECK ──
--
--  q08, q16, q17, q34 and q37 have always been text with a check constraint.
--  q22, q29, q31, q38 and q40 are the same kind of answer and had none, so any
--  string at all was a valid response. Found by the same sweep that caught the
--  two booleans in 0077.
--
--  ── Q22 AND Q29 DO NOT SHARE A CONSTRAINT, AND THAT IS THE POINT ──
--
--    Q22  Much more / Somewhat more / About the same / Less / NOT PRODUCING
--    Q29  Much more / Somewhat more / About the same / Less / I AM NOT SELLING
--
--  Four options identical, the fifth different, and the difference is real:
--  someone can be producing and not selling. One shared constraint would make
--  those two states interchangeable in the schema, and the first person who
--  reused the wrong code would never find out.
--
--  ── Q31: "PREFER NOT TO SAY" IS AN ANSWER ──
--
--  It is stored as a value, not as NULL. NULL means the question was not
--  reached; prefer_not_to_say means it was asked and declined. On a money
--  question those are different facts about the interview, and collapsing them
--  loses the one that says something about trust.
--
--  ── Q38: A CHECK, NOT A ref_ TABLE ──
--
--  It is a six-way category list and NOT an ordered scale -- the codes below
--  are deliberately not ranked, and nothing should sort them.
--
--  A ref_ table was the alternative. Against it: every other single-select on
--  followup_survey is a coded column with the labels in the locale files, and
--  q17_activity_status is already a six-option check. A ref_ table earns its
--  place when rows in several tables point at it, or when the list has to
--  change without a deploy. Neither is true here, and a second pattern for one
--  shape is how a question ends up half in each.
--
--  If the Coordinator ever needs to add a capacity without a migration, that is
--  the moment to convert it -- not before.
--
--  ── AND followup_answer HAD NO VALUE CHECK AT ALL ──
--
--  A primary key and a foreign key, nothing else. Q7, Q10, Q12, Q13 and Q32 all
--  have fixed option sets and all store there, so every one of them was free
--  text. Q32 in particular is a BAND -- None / one to two / three to five /
--  more than five -- and a numeric column would have been wrong for it, so the
--  band goes in value_text where nothing was checking it.
--
--  Same class as option_id having no foreign key, and the same remedy: a
--  trigger, because the allowed set depends on question_code.
--
--  It also refuses a question_code that does not belong to this table at all,
--  so a typo cannot quietly create an answer to a question nobody asked.
--
--  Q25 is deliberately listed as known-but-unconstrained: "do you know which
--  authority to approach?" has options nobody has supplied yet, and guessing
--  yes/no would be inventing. It is named here so the gap is visible rather
--  than looking like an oversight.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.followup_survey
  add constraint followup_survey_q22_volume_change_check
    check (q22_volume_change = any
           (array['much_more','somewhat_more','about_same','less','not_producing']));

-- NOT the same array as q22. The fifth option differs, and someone can be
-- producing and not selling.
alter table public.followup_survey
  add constraint followup_survey_q29_selling_change_check
    check (q29_selling_change = any
           (array['much_more','somewhat_more','about_same','less','not_selling']));

alter table public.followup_survey
  add constraint followup_survey_q31_last_event_sales_band_check
    check (q31_last_event_sales_band = any
           (array['under_50','50_150','151_300','301_500','over_500','prefer_not_to_say']));

alter table public.followup_survey
  add constraint followup_survey_q38_capacity_check
    check (q38_capacity = any
           (array['own_land','rented_land','own_business','employed',
                  'family_activity','not_engaged']));

alter table public.followup_survey
  add constraint followup_survey_q40_income_change_check
    check (q40_income_change = any
           (array['higher','about_same','lower','no_income']));

comment on column public.followup_survey.q22_volume_change is
  'Q22. Production per month vs before. Its fifth option is not_producing, '
  'which is NOT q29''s not_selling -- someone can produce and not sell.';
comment on column public.followup_survey.q29_selling_change is
  'Q29. Selling more or less than before. Its fifth option is not_selling, '
  'which is NOT q22''s not_producing.';
comment on column public.followup_survey.q31_last_event_sales_band is
  'Q31. A band, not an amount. prefer_not_to_say is a stored ANSWER: null '
  'means the question was never reached, this means it was asked and declined.';
comment on column public.followup_survey.q38_capacity is
  'Q38. A six-way CATEGORY list, not an ordered scale. Nothing should sort '
  'these codes.';
comment on column public.followup_survey.q40_income_change is
  'Q40. Income vs twelve months ago. Twelve-month round only, per '
  'section_d_only_at_12m.';

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
  if new.question_code not in ('Q7','Q10','Q12','Q13','Q15','Q19','Q25','Q32','Q42') then
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
    when 'Q32' then array['none','one_to_two','three_to_five','more_than_five']
    -- Q15 is a count in value_number, Q19 is free text, Q42 is value_boolean,
    -- and Q25's options have not been supplied -- see this migration's header.
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
  'does not belong to this table. Q25 is knowingly unconstrained: its options '
  'have not been supplied and guessing them would be inventing.';

revoke all on function public.guard_followup_answer() from public, anon, authenticated;

create trigger trg_followup_answer_guard
  before insert or update on public.followup_answer
  for each row execute function public.guard_followup_answer();
