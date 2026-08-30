-- ═══════════════════════════════════════════════════════════════════════════
--  0076 — Q15 has an option list too, and 0075 did not map it
--
--  Q15 is "if yes, how many times and for what service". The data dictionary
--  routes it to `followup_answer`, which is where the COUNT goes -- so 0075
--  read that as "no options" and left Q15 out of guard_followup_option's
--  mapping.
--
--  It has a service list as well, and that list is ref_office_service_type,
--  option for option. Without this line the guard would have refused every
--  Q15 service the moment section A tried to write one, with "question_code
--  Q15 has no option list" -- a refusal caused by an omission here rather than
--  by anything the enumerator did.
--
--  Found by writing out section A's ten questions against the mapping rather
--  than assuming 0075 had covered them. The mapping is the kind of list that
--  looks complete because every line in it is correct.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.guard_followup_option()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_table text;
  v_ok    boolean;
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

  execute format(
    'select exists (select 1 from public.%I where id = $1 and deleted_at is null)', v_table)
    into v_ok using new.option_id;

  if not v_ok then
    raise exception
      'option % is not a live row in %, which is the list for %',
      new.option_id, v_table, new.question_code
      using errcode = 'foreign_key_violation';
  end if;

  return new;
end $function$;

comment on function public.guard_followup_option() is
  'followup_answer_option.option_id is a bare uuid: the list it points into '
  'depends on question_code, so one foreign key cannot cover it. Refuses an '
  'unknown question_code and an option that is not live in that question''s '
  'list. Q15 shares ref_office_service_type, which is the list the workbook '
  'confirms was right all along -- see OQ-20.';
