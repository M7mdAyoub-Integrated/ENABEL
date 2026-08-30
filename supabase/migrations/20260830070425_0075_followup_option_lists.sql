-- ═══════════════════════════════════════════════════════════════════════════
--  0075 — the follow-up survey's option lists, and a guard on option_id
--
--  ── WHY THESE ARE NEW TABLES AND NOT REUSED ONES ──
--
--  Six questions (Q9, Q11, Q24, Q33, Q36, Q41) store into
--  followup_answer_option and had no list anywhere in the schema. Two more
--  (Q19/Q39, Q20) needed checking. Every list below is verbatim from the
--  Post_intervention sheet, in the sheet's order, not paraphrased.
--
--  Q19 and Q39 SHARE ONE TABLE. The sheet says so explicitly, and two copies
--  of one list is how the same answer stops matching itself.
--
--  Q20 IS NOT ref_activity_type, and this was checked rather than assumed:
--
--    ref_activity_type   Crop production / Livestock / Greenhouse farming /
--                        Food processing / Other                      (5)
--    Q20 in the sheet    Crop production / Livestock / Greenhouse farming /
--                        Home-based food processing / Registered food
--                        processing / Handicraft / Other               (7)
--
--  The sheet splits food processing into home-based and registered, and adds
--  handicraft. Those are different questions about different things --
--  production_initiative.activity_type_id is a programme classification, Q20 is
--  what the respondent says they do -- so they get separate tables and the
--  sheet's version wins for the survey.
--
--  Q15 needed no table: ref_office_service_type matches the sheet exactly,
--  option for option. That list was invented rather than taken from the
--  workbook and has been open as OQ-20 ever since. It turns out to have been
--  right. Recorded there.
--
--  Q27 and Q28 share ref_sales_channel, which already exists -- the sheet says
--  Q28 is the same list with only the new channels selected.
--
--  ── THE GUARD ON option_id ──
--
--  `followup_answer_option.option_id` is a bare uuid with NO foreign key,
--  because the list it points into depends on question_code -- one FK cannot
--  span eight tables. The consequence is that any uuid at all could be written,
--  and nothing would ever say so. That absence is exactly what would have let
--  an invented option through unnoticed, which is how ref_office_service_type
--  became an open question in the first place.
--
--  A single FK is impossible, so this is a trigger. It refuses:
--    • a question_code with no known option list at all
--    • an option_id that is not a live row in that question's list
--
--  The mapping lives in the trigger rather than in a table, deliberately:
--  adding a question to this survey is a schema event that needs a migration
--  anyway, and a mapping table would be one more thing that can be empty while
--  looking present.
-- ═══════════════════════════════════════════════════════════════════════════

-- The eight new lists take the same shape as the other 18, built the same way.
do $outer$
declare t text;
begin
  foreach t in array array[
    'ref_nonapply_reason', 'ref_practice_change', 'ref_stop_reason',
    'ref_survey_activity', 'ref_compliance_obstacle', 'ref_market_improvement',
    'ref_selling_barrier', 'ref_support_need'
  ] loop
    execute format($f$
      create table if not exists public.%I (
        id               uuid primary key default gen_random_uuid(),
        code             text not null unique,
        label_en         text not null,
        label_ar         text not null,
        sort_order       int  not null default 0,
        is_active        boolean not null default true,
        allows_free_text boolean not null default false,
        created_at       timestamptz not null default now(),
        updated_at       timestamptz not null default now(),
        created_by       uuid references auth.users(id),
        deleted_at       timestamptz
      )$f$, t);

    perform public.attach_updated_at(t);

    execute format('alter table public.%I enable row level security', t);
    execute format($f$create policy ref_read on public.%I
      for select to authenticated using (true)$f$, t);
    execute format($f$create policy ref_write on public.%I
      for all to authenticated
      using (public.current_role() = 'coordinator')
      with check (public.current_role() = 'coordinator')$f$, t);

    execute format($f$create trigger trg_%1$s_audit
      after insert or update or delete on public.%1$I
      for each row execute function audit_row()$f$, t);

    -- 0069 attached this by walking the catalogue ONCE. A table created after
    -- that walk gets no guard unless it is attached here, and
    -- check-soft-delete-guards.mjs fails the build if it is forgotten.
    execute format($f$create trigger trg_%1$s_soft_delete
      before update on public.%1$I
      for each row execute function public.guard_soft_delete()$f$, t);
  end loop;
end $outer$;

-- ── Q9: if you have not applied the knowledge or skills, main reasons ───────
insert into public.ref_nonapply_reason (code, label_en, label_ar, sort_order, allows_free_text) values
  ('no_finance',   'Lack of financial resources',            'نقص الموارد المالية',            1, false),
  ('no_equipment', 'Lack of equipment or inputs',            'نقص المعدات أو المستلزمات',      2, false),
  ('no_land',      'Lack of access to land',                 'تعذّر الوصول إلى الأرض',          3, false),
  ('no_jobs',      'Lack of employment opportunities',       'نقص فرص العمل',                  4, false),
  ('no_markets',   'Lack of access to markets',              'تعذّر الوصول إلى الأسواق',        5, false),
  ('no_time',      'Lack of time',                           'ضيق الوقت',                      6, false),
  ('not_relevant', 'Training was not relevant to my work',   'التدريب لم يكن ذا صلة بعملي',    7, false),
  ('need_more',    'I need additional training or practice', 'أحتاج إلى تدريب أو ممارسة إضافية', 8, false),
  ('other',        'Other',                                  'أخرى',                           9, true)
on conflict (code) do nothing;

-- ── Q11: what changes have you made? ───────────────────────────────────────
insert into public.ref_practice_change (code, label_en, label_ar, sort_order, allows_free_text) values
  ('production_methods', 'Changed production methods',                     'غيّرت أساليب الإنتاج',                    1, false),
  ('inputs',             'Improved use of inputs',                         'تحسين استخدام المستلزمات',               2, false),
  ('irrigation',         'Improved irrigation or water management',        'تحسين الري أو إدارة المياه',              3, false),
  ('pests',              'Improved pest and disease management',           'تحسين مكافحة الآفات والأمراض',            4, false),
  ('livestock',          'Improved livestock management',                  'تحسين إدارة الثروة الحيوانية',            5, false),
  ('postharvest',        'Improved post-harvest handling or storage',      'تحسين التداول بعد الحصاد أو التخزين',     6, false),
  ('equipment',          'Improved use of equipment or technology',        'تحسين استخدام المعدات أو التقنية',        7, false),
  ('records',            'Improved record keeping or business practices',  'تحسين مسك السجلات أو الممارسات التجارية', 8, false),
  ('other',              'Other',                                          'أخرى',                                   9, true)
on conflict (code) do nothing;

-- ── Q19 and Q39: why the activity stopped. ONE list, two questions. ─────────
insert into public.ref_stop_reason (code, label_en, label_ar, sort_order, allows_free_text) values
  ('capital',       'Lack of capital',                    'نقص رأس المال',                  1, false),
  ('no_buyers',     'No market or buyers',                'لا يوجد سوق أو مشترون',           2, false),
  ('low_prices',    'Prices too low',                     'الأسعار منخفضة جدًا',             3, false),
  ('input_costs',   'Cost of inputs',                     'تكلفة المستلزمات',                4, false),
  ('water_land',    'Water or land access',               'الوصول إلى المياه أو الأرض',      5, false),
  ('health_family', 'Health or family reasons',           'أسباب صحية أو عائلية',            6, false),
  ('licensing',     'Licensing or regulatory obstacle',   'عقبة في الترخيص أو التنظيم',      7, false),
  ('seasonal',      'Seasonal only, will resume',         'موسمي فقط، وسأستأنف',            8, false),
  ('other',         'Other',                              'أخرى',                            9, true)
on conflict (code) do nothing;

-- ── Q20: type of activity, as the RESPONDENT describes it ──────────────────
insert into public.ref_survey_activity (code, label_en, label_ar, sort_order, allows_free_text) values
  ('crop',                  'Crop production',            'إنتاج المحاصيل',        1, false),
  ('livestock',             'Livestock',                  'الثروة الحيوانية',      2, false),
  ('greenhouse',            'Greenhouse farming',         'الزراعة المحمية',       3, false),
  ('home_processing',       'Home-based food processing', 'تصنيع غذائي منزلي',     4, false),
  ('registered_processing', 'Registered food processing', 'تصنيع غذائي مسجّل',     5, false),
  ('handicraft',            'Handicraft',                 'حِرف يدوية',            6, false),
  ('other',                 'Other',                      'أخرى',                  7, true)
on conflict (code) do nothing;

-- ── Q24: main obstacle for a food-safety item not yet done ─────────────────
insert into public.ref_compliance_obstacle (code, label_en, label_ar, sort_order, allows_free_text) values
  ('cost',        'Cost of fees or equipment',          'تكلفة الرسوم أو المعدات',        1, false),
  ('unclear',     'Procedures are unclear',             'الإجراءات غير واضحة',            2, false),
  ('far',         'The office is far or hard to reach', 'المكتب بعيد أو يصعب الوصول إليه', 3, false),
  ('documents',   'Missing documents',                  'نقص في الوثائق',                 4, false),
  ('inspection',  'Waiting on an inspection',           'بانتظار الكشف',                  5, false),
  ('unnecessary', 'I do not consider it necessary',     'لا أراه ضروريًا',                6, false),
  ('dont_know',   'I do not know where to go',          'لا أعرف إلى أين أتوجّه',          7, false),
  ('other',       'Other',                              'أخرى',                           8, true)
on conflict (code) do nothing;

-- ── Q33: what would make the markets more useful ───────────────────────────
insert into public.ref_market_improvement (code, label_en, label_ar, sort_order, allows_free_text) values
  ('more_events', 'More frequent events',                                     'فعاليات أكثر تكرارًا',                   1, false),
  ('location',    'Better location',                                          'موقع أفضل',                              2, false),
  ('fees',        'Lower or no booth fees',                                   'رسوم أجنحة أقل أو بلا رسوم',             3, false),
  ('promotion',   'More promotion beforehand',                                'ترويج أكبر قبل الفعالية',                4, false),
  ('facilities',  'Better facilities such as shade, electricity or cooling',  'مرافق أفضل كالتظليل والكهرباء والتبريد', 5, false),
  ('buyers',      'Buyers invited, not only the general public',              'دعوة المشترين، لا الجمهور العام فقط',    6, false),
  ('other',       'Other',                                                    'أخرى',                                   7, true)
on conflict (code) do nothing;

-- ── Q36: main barrier to selling more ──────────────────────────────────────
insert into public.ref_selling_barrier (code, label_en, label_ar, sort_order, allows_free_text) values
  ('no_buyer',    'No steady buyer',                                     'لا يوجد مشترٍ ثابت',                          1, false),
  ('low_price',   'The price offered is too low',                        'السعر المعروض منخفض جدًا',                    2, false),
  ('transport',   'Transport costs',                                     'تكاليف النقل',                                3, false),
  ('volume',      'I cannot produce enough volume',                      'لا أستطيع إنتاج كمية كافية',                  4, false),
  ('quality',     'I cannot meet quality or certification requirements', 'لا أستطيع استيفاء متطلبات الجودة أو الشهادات', 5, false),
  ('packaging',   'Packaging or shelf-life',                             'التغليف أو مدة الصلاحية',                     6, false),
  ('competition', 'Competition',                                         'المنافسة',                                    7, false),
  ('other',       'Other',                                               'أخرى',                                        8, true)
on conflict (code) do nothing;

-- ── Q41: what additional support would help most next year ─────────────────
insert into public.ref_support_need (code, label_en, label_ar, sort_order, allows_free_text) values
  ('training',     'More technical training',              'مزيد من التدريب الفني',            1, false),
  ('licensing',    'Help with licensing and food safety',  'مساعدة في الترخيص وسلامة الغذاء',  2, false),
  ('equipment',    'Equipment or inputs',                  'معدات أو مستلزمات',                3, false),
  ('finance',      'Financing or a small grant',           'تمويل أو منحة صغيرة',              4, false),
  ('buyers',       'Help finding buyers',                  'مساعدة في إيجاد مشترين',           5, false),
  ('exhibitions',  'More exhibitions',                     'مزيد من المعارض',                  6, false),
  ('marketing',    'Marketing and branding support',       'دعم التسويق والعلامة التجارية',    7, false),
  ('transport',    'Transport or storage',                 'النقل أو التخزين',                 8, false),
  ('other',        'Other',                                'أخرى',                             9, true)
on conflict (code) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
--  The guard. option_id has no FK because the list depends on question_code.
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
  'depends on question_code, so one foreign key cannot cover it. Without this, '
  'any uuid could be written and nothing would ever say so -- which is how an '
  'invented option list would go unnoticed. Refuses an unknown question_code '
  'and an option that is not live in that question''s list.';

revoke all on function public.guard_followup_option() from public, anon, authenticated;

create trigger trg_followup_answer_option_guard
  before insert or update on public.followup_answer_option
  for each row execute function public.guard_followup_option();
