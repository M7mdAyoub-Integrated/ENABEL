-- ═══════════════════════════════════════════════════════════════════════════
--  0123 — rmth_threshold: the seven open definitions, as data with null values
--
--  The forms index (RMTH_indicator_forms.xlsx, 00_Index, "Open items")
--  lists seven definitions the Municipality has not fixed. Each decides
--  whether a record counts, and none is in any workbook:
--
--    1. Sustained engagement (IMP-0)     X consecutive months
--    2. Short-term intensive (C1.1)       no more than X weeks, at least Y
--                                          contact hours per week
--    3. Regular income (SO3-0)            income in at least N of the last six
--                                          months (the form proposes 4)
--    4. Completion criteria (C1.2, E0.3, F0.1)  the rule two enumerators
--                                          apply to reach the same total
--    5. Self-employment as placement (SO2-0)
--    6. Programmes or sessions (F0.2)     which reading governs
--    7. Employability threshold (SO1-0)   the form's rule, or the Action
--                                          Plan's confirmed-employment-only
--
--  Plan §5.4: put each in a configuration table, scoped to the municipality,
--  with a null value and a note naming the open item. The indicator views
--  (Part 6) read the row; a null value makes the indicator NOT COMPUTABLE,
--  named, never zero. When the M&E lead answers, the answer is an UPDATE on
--  this table -- recorded with who decided and when -- not a migration.
--
--  ── ONE ROW PER VALUE, NOT PER ITEM ──
--
--  Item 2 is two numbers and item 4 is three rules, so seven items are ten
--  rows. `key` is what the views read; `open_item` groups the rows back
--  into the index's seven so the report can restate them.
--
--  ── THE SHAPE OF A VALUE ──
--
--  Three typed columns rather than one text column, so a view can compare
--  `value_numeric` to a month count without parsing, and a check keeps
--  exactly one of them in use per row. `value_text` for the rules and the
--  two either/or choices; `value_bool` for item 5. Nothing is defaulted:
--  the form's proposal for item 3 (four of six) is written in the note, not
--  in the value, because the note is where a proposal belongs.
--
--  Written by a coordinator of the municipality (the M&E lead is one) or a
--  super admin; read by every signed-in role of the municipality.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.rmth_threshold (
  id               uuid primary key default gen_random_uuid(),
  municipality_id  uuid not null references public.municipality(id) default public.my_municipality(),
  key              text not null,
  open_item        text not null,
  label_en         text not null,
  label_ar         text not null,
  value_numeric    numeric,
  value_text       text,
  value_bool       boolean,
  unit             text,
  note_en          text not null,
  note_ar          text not null,
  decided_by       uuid references auth.users(id),
  decided_on       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id),
  deleted_at       timestamptz,
  constraint rmth_threshold_municipality_key_key unique (municipality_id, key),
  constraint rmth_threshold_key_shape check (key ~ '^[a-z0-9_]+$'),
  -- at most one value column is filled; a decided row says who and when
  constraint rmth_threshold_one_value check (
    (value_numeric is not null)::int + (value_text is not null)::int + (value_bool is not null)::int <= 1),
  constraint rmth_threshold_decision_dated check (
    ((value_numeric is null and value_text is null and value_bool is null) and decided_on is null)
    or (decided_on is not null)),
  constraint rmth_threshold_numeric_positive check (value_numeric is null or value_numeric >= 0)
);

create index rmth_threshold_municipality_idx on public.rmth_threshold (municipality_id);
create index rmth_threshold_decided_by_idx on public.rmth_threshold (decided_by);
create index rmth_threshold_created_by_idx on public.rmth_threshold (created_by);

select public.attach_standard_triggers('rmth_threshold');

alter table public.rmth_threshold enable row level security;

create policy rmth_threshold_read on public.rmth_threshold
  for select to authenticated
  using (public.can_see_municipality(municipality_id));

create policy rmth_threshold_write on public.rmth_threshold
  for all to authenticated
  using (public.is_coordinator() and public.can_see_municipality(municipality_id))
  with check (public.is_coordinator() and public.can_see_municipality(municipality_id));

comment on table public.rmth_threshold is
  'The definitions the Ramtha forms index leaves open, one row per value, '
  'null until the M&E lead decides. A null makes the indicator that reads it '
  'NOT COMPUTABLE, never zero (plan §5.4). Answering is an UPDATE here, with '
  'decided_by and decided_on, not a migration.';

-- ── the ten rows, for Ramtha ─────────────────────────────────────────────

insert into public.rmth_threshold
  (municipality_id, key, open_item, label_en, label_ar, unit, note_en, note_ar)
values
  ('00000000-0000-4000-8000-0000000000a1', 'imp0_sustained_months', 'sustained_engagement',
   'Sustained engagement: minimum consecutive months (X)',
   'الانخراط المستدام: الحد الأدنى من الأشهر المتتالية (X)',
   'months',
   'RMTH-IMP-0. The Action Plan defines sustained engagement as at least X consecutive months but does not fix X. The form records the raw month count. Until X is set the indicator is not computable. The Action Plan also writes the calculation as a ratio while the target is 65 persons; the form counts, and that reading needs confirming with ENABEL.',
   'RMTH-IMP-0. تُعرّف خطة العمل الانخراط المستدام بأنه X شهراً متتالياً على الأقل دون تحديد قيمة X. يسجّل النموذج عدد الأشهر الخام. إلى أن تُحدَّد قيمة X لا يمكن احتساب المؤشر. كما تكتب خطة العمل الصيغة الحسابية كنسبة بينما الهدف 65 شخصاً؛ النموذج يعدّ الأشخاص، وهذه القراءة تحتاج تأكيداً من إينابل.'),
  ('00000000-0000-4000-8000-0000000000a1', 'c11_max_weeks', 'short_term_intensive',
   'Short-term intensive: maximum number of weeks',
   'قصير الأمد ومكثف: الحد الأقصى لعدد الأسابيع',
   'weeks',
   'RMTH-SO2-C1.1. No definition exists for "short-term intensive". The form records contact hours, weeks and hours per week; this row is the "no more than X weeks" half of the agreed threshold.',
   'RMTH-SO2-C1.1. لا يوجد تعريف لعبارة "قصير الأمد ومكثف". يسجّل النموذج ساعات التدريب والأسابيع والساعات الأسبوعية؛ هذا الصف هو شطر "بما لا يزيد على X أسبوعاً" من الحد المتفق عليه.'),
  ('00000000-0000-4000-8000-0000000000a1', 'c11_min_hours_per_week', 'short_term_intensive',
   'Short-term intensive: minimum contact hours per week',
   'قصير الأمد ومكثف: الحد الأدنى لساعات التدريب الأسبوعية',
   'hours per week',
   'RMTH-SO2-C1.1. The "at least Y contact hours per week" half of the short-term intensive threshold. Both halves must be set before C1.1 is computable.',
   'RMTH-SO2-C1.1. شطر "بما لا يقل عن Y ساعة تدريب أسبوعياً" من حد قصير الأمد ومكثف. يجب تحديد الشطرين معاً قبل أن يصبح C1.1 قابلاً للاحتساب.'),
  ('00000000-0000-4000-8000-0000000000a1', 'so30_income_months_of_six', 'regular_income',
   'Regular income: minimum months with income out of the last six',
   'الدخل المنتظم: الحد الأدنى للأشهر ذات الدخل من الأشهر الستة الأخيرة',
   'months of six',
   'RMTH-SO3-0. The form proposes income in at least four of the last six months. The proposal is not applied until it is confirmed or changed here.',
   'RMTH-SO3-0. يقترح النموذج دخلاً في أربعة أشهر على الأقل من الأشهر الستة الأخيرة. لا يُطبَّق المقترح حتى يُؤكَّد أو يُعدَّل هنا.'),
  ('00000000-0000-4000-8000-0000000000a1', 'c12_completion_rule', 'completion_criteria',
   'Completion criteria for employability training (C1.2)',
   'معايير الإتمام لتدريب التشغيل (C1.2)',
   null,
   'RMTH-SO2-C1.2. "Did this person meet the completion criteria?" decides the count but has no written rule. Write the agreed rule here, for example "Yes only where attendance is at least 75%, the final assessment is Passed, and job-ready is Yes", so two enumerators produce the same total. Until it is written the indicator is not computable.',
   'RMTH-SO2-C1.2. سؤال "هل استوفى هذا الشخص معايير الإتمام؟" يحدد العدّ لكن دون قاعدة مكتوبة. اكتب القاعدة المتفق عليها هنا، مثلاً "نعم فقط إذا كان الحضور 75% على الأقل والتقييم النهائي ناجح وجاهز للعمل نعم"، حتى يصل باحثان إلى المجموع نفسه. إلى أن تُكتب لا يمكن احتساب المؤشر.'),
  ('00000000-0000-4000-8000-0000000000a1', 'e03_completion_rule', 'completion_criteria',
   'Completion criteria for incubator-design training (E0.3)',
   'معايير الإتمام لتدريب تصميم الحاضنات (E0.3)',
   null,
   'RMTH-SO3-E0.3. The rule must include the content test: at least one incubator-design module covered. For example "attendance at least 75%, post-test at least 60, and at least one design module covered". Until written, not computable.',
   'RMTH-SO3-E0.3. يجب أن تتضمن القاعدة اختبار المحتوى: تغطية وحدة واحدة على الأقل من وحدات تصميم الحاضنات. مثلاً "حضور 75% على الأقل، واختبار بعدي 60 على الأقل، وتغطية وحدة تصميم واحدة على الأقل". إلى أن تُكتب لا يمكن الاحتساب.'),
  ('00000000-0000-4000-8000-0000000000a1', 'f01_completion_rule', 'completion_criteria',
   'Completion criteria for entrepreneurship training (F0.1)',
   'معايير الإتمام لتدريب ريادة الأعمال (F0.1)',
   null,
   'RMTH-SO3-F0.1. The rule must include the Action Plan''s content test: at least one of production practices, quality standards or business management among the modules completed. For example "attendance at least 75%, final assessment Passed, and at least one of the three named module areas completed". Until written, not computable.',
   'RMTH-SO3-F0.1. يجب أن تتضمن القاعدة اختبار المحتوى الوارد في خطة العمل: وحدة واحدة على الأقل من ممارسات الإنتاج أو معايير الجودة أو إدارة الأعمال ضمن الوحدات المكتملة. مثلاً "حضور 75% على الأقل، وتقييم نهائي ناجح، وإتمام وحدة واحدة على الأقل من المجالات الثلاثة المذكورة". إلى أن تُكتب لا يمكن الاحتساب.'),
  ('00000000-0000-4000-8000-0000000000a1', 'so20_self_employment_counts', 'self_employment_as_placement',
   'Does self-employment count as a placement?',
   'هل يُحتسب العمل الحر إلحاقاً؟',
   null,
   'RMTH-SO2-0. The indicator says employment or internship. The form keeps self-employment on its own line in the numerator field so the percentage can be computed either way. true: "Yes - into self-employment" counts; false: it does not. Until decided, not computable.',
   'RMTH-SO2-0. ينص المؤشر على التوظيف أو التدريب الداخلي. يُبقي النموذج العمل الحر في سطر مستقل في حقل البسط حتى يمكن احتساب النسبة بأي من الطريقتين. true: يُحتسب "نعم - في عمل حر"؛ false: لا يُحتسب. إلى أن يُقرَّر لا يمكن الاحتساب.'),
  ('00000000-0000-4000-8000-0000000000a1', 'f02_counting_reading', 'programmes_or_sessions',
   'F0.2 counts programmes developed, or sessions delivered?',
   'هل يعدّ F0.2 البرامج المطوّرة أم الجلسات المنفذة؟',
   null,
   'RMTH-SO3-F0.2. The framework counts programmes developed; the Action Plan counts training sessions delivered, each once. The form carries a delivery log so either can be reported. Value: "programmes" or "sessions". Until chosen, not computable.',
   'RMTH-SO3-F0.2. يعدّ الإطار البرامج المطوّرة؛ وتعدّ خطة العمل جلسات التدريب المنفذة، كل واحدة مرة. يحمل النموذج سجل تنفيذ حتى يمكن الإبلاغ بأي من الطريقتين. القيمة: "programmes" أو "sessions". إلى أن يُختار لا يمكن الاحتساب.'),
  ('00000000-0000-4000-8000-0000000000a1', 'so10_employability_threshold', 'employability_threshold',
   'Employability threshold: the form''s rule, or confirmed placement only?',
   'حد قابلية التشغيل: قاعدة النموذج أم الإلحاق المؤكد فقط؟',
   null,
   'RMTH-SO1-0. The form counts a confirmed placement, or one verifiable step plus one other. The Action Plan''s equivalent result indicator counts confirmed employment only, which is stricter. Value: "form_rule" (both Yes answers count) or "placement_only" (only "Yes - confirmed placement" counts). Until chosen, not computable.',
   'RMTH-SO1-0. يعدّ النموذج الإلحاق المؤكد، أو خطوة واحدة قابلة للتحقق مع خطوة أخرى. أما مؤشر النتيجة المقابل في خطة العمل فيعدّ التوظيف المؤكد فقط، وهو أكثر تشدداً. القيمة: "form_rule" (تُحتسب إجابتا نعم) أو "placement_only" (تُحتسب "نعم - إلحاق مؤكد" فقط). إلى أن يُختار لا يمكن الاحتساب.');

-- The two either/or rows may only ever hold their own two words.
alter table public.rmth_threshold add constraint rmth_threshold_text_choices check (
  (key <> 'f02_counting_reading' or value_text is null or value_text in ('programmes', 'sessions'))
  and (key <> 'so10_employability_threshold' or value_text is null or value_text in ('form_rule', 'placement_only')));

-- ── the reader every view will use ───────────────────────────────────────
--
-- One function, three typed accessors, so a view says
-- `rmth_threshold_numeric(municipality_id, 'imp0_sustained_months')` and gets
-- null when the answer has not been given. Security invoker: the caller's
-- own RLS decides what it can see, and every caller that reads a view of a
-- municipality can see that municipality's thresholds.

create function public.rmth_threshold_numeric(p_municipality_id uuid, p_key text)
returns numeric
language sql stable
set search_path = public
as $$
  select t.value_numeric from public.rmth_threshold t
   where t.municipality_id = p_municipality_id and t.key = p_key and t.deleted_at is null
$$;

create function public.rmth_threshold_text(p_municipality_id uuid, p_key text)
returns text
language sql stable
set search_path = public
as $$
  select t.value_text from public.rmth_threshold t
   where t.municipality_id = p_municipality_id and t.key = p_key and t.deleted_at is null
$$;

create function public.rmth_threshold_bool(p_municipality_id uuid, p_key text)
returns boolean
language sql stable
set search_path = public
as $$
  select t.value_bool from public.rmth_threshold t
   where t.municipality_id = p_municipality_id and t.key = p_key and t.deleted_at is null
$$;

revoke all on function public.rmth_threshold_numeric(uuid, text) from public, anon;
revoke all on function public.rmth_threshold_text(uuid, text) from public, anon;
revoke all on function public.rmth_threshold_bool(uuid, text) from public, anon;
grant execute on function public.rmth_threshold_numeric(uuid, text) to authenticated;
grant execute on function public.rmth_threshold_text(uuid, text) to authenticated;
grant execute on function public.rmth_threshold_bool(uuid, text) to authenticated;

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_n int;
begin
  select count(*) into v_n from public.rmth_threshold
   where municipality_id = '00000000-0000-4000-8000-0000000000a1';
  if v_n <> 10 then
    raise exception '0123: expected 10 threshold rows, found %', v_n;
  end if;
  if exists (select 1 from public.rmth_threshold
              where value_numeric is not null or value_text is not null or value_bool is not null) then
    raise exception '0123: a threshold arrived with a value; every one must start null';
  end if;
  if (select count(distinct open_item) from public.rmth_threshold) <> 7 then
    raise exception '0123: expected the seven open items';
  end if;
  -- the readers answer null, not an error, for an undecided key and for an unknown one
  if public.rmth_threshold_numeric('00000000-0000-4000-8000-0000000000a1', 'imp0_sustained_months') is not null
     or public.rmth_threshold_numeric('00000000-0000-4000-8000-0000000000a1', 'no_such_key') is not null then
    raise exception '0123: threshold reader did not answer null';
  end if;
  -- the either/or rows refuse a third word
  begin
    update public.rmth_threshold set value_text = 'both', decided_on = current_date
     where key = 'f02_counting_reading';
    raise exception '0123: f02_counting_reading accepted a value outside its two';
  exception
    when check_violation then null;
  end;
  -- and a value without a decision date is refused
  begin
    update public.rmth_threshold set value_numeric = 6 where key = 'imp0_sustained_months';
    raise exception '0123: a value was accepted without decided_on';
  exception
    when check_violation then null;
  end;
end $verify$;
