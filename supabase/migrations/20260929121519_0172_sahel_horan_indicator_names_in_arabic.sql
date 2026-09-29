-- ═══════════════════════════════════════════════════════════════════════════
--  0172 — Sahel Horan's indicators and objectives named in Arabic
--
--  Ramtha's and Khalidiyah's indicators and objectives carry name_ar;
--  Sahel Horan's twenty indicators and five objectives did not, so every
--  screen that reads the name from the database -- rather than from the
--  dashboard's locale file -- showed English on the Arabic site. The owner
--  asked on 29 September 2026 for everything in Arabic, from
--  إطار_عمل_بلدية_سهل_حوران_عربي.xlsx.
--
--  Each indicator's name_ar is the framework's "المؤشرات" cell for its code
--  (SHM-SO1-A1 ... SHM-IMP-0), verbatim, as the dashboard's locale names
--  have been since 6bbdc90. Each objective's is its SHM-SOx-0 row's title
--  ("الهدف الخاص الأول: ..."); the impact objective is «الأثر». Only name_ar
--  changes: codes, English names, targets and formulas are untouched.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0172 (kind text, code text, name_ar text) on commit drop;
insert into _0172 (kind, code, name_ar) values
  ('indicator', 'A1', 'نسبة المشاركين في التدريب (قصير المدى) الذين أفادوا بتطبيق المعرفة المكتسبة'),
  ('indicator', 'A1.2', 'عدد الشراكات الفنية المنشأة أو المفعّلة للتدريب الزراعي والدعم الفني'),
  ('indicator', 'A1.3', 'عدد المشاركين (دون تكرار) الذين أتمّوا برنامجاً تدريبياً واحداً على الأقل في الزراعة أو إنتاج الغذاء'),
  ('indicator', 'B1', 'نسبة المزارعين والأسر المنتجة الذين أفادوا باستفادتهم من جلسات التدريب والإرشاد الدورية التي يقدمها مكتب التنسيق الفني'),
  ('indicator', 'B1.1', 'إنشاء مكتب التنسيق الفني الزراعي وتشغيله'),
  ('indicator', 'B1.2', 'عدد المزارعين والأسر المنتجة المستفيدين من خدمات المكتب الفني'),
  ('indicator', 'C1', 'نسبة أنشطة الإنتاج المدعومة التي لا تزال عاملة بعد ستة أشهر من الدعم'),
  ('indicator', 'C1.1', 'عدد شراكات دعم الإنتاج المنشأة أو المفعّلة'),
  ('indicator', 'C1.2', 'عدد المبادرات الزراعية التجريبية التي تم إطلاقها وربطها بفرص سوقية أوسع'),
  ('indicator', 'C1.3', 'عدد جلسات الإرشاد والتوجيه المقدمة للمبادرات المختارة'),
  ('indicator', 'D0.1', 'عدد المنتجين المنزليين والريفيين الذين تلقوا توجيهاً حول سلامة الغذاء والترخيص والتغليف والمتطلبات ذات الصلة'),
  ('indicator', 'D0.2', 'عدد الجلسات التدريبية المقدمة حول التصنيع الغذائي ومتطلبات الإنتاج ذات الصلة'),
  ('indicator', 'E0.1', 'عدد الأسواق الريفية والمعارض الموسمية التي نظمتها البلدية أو شاركت في تنظيمها'),
  ('indicator', 'E0.2', 'عدد المنتجين المحليين (دون تكرار) المشاركين في الأسواق والمعارض المدعومة'),
  ('indicator', 'F0.1', 'عدد الأنشطة / الحملات الترويجية المنشورة عبر القنوات الرسمية للبلدية (المنصات الرقمية، والشراكات المحلية، والفعاليات المجتمعية)'),
  ('indicator', 'G0.1', 'تشكيل لجنة محلية لتنسيق الزراعة وإنتاج الغذاء'),
  ('indicator', 'G0.2', 'عدد اجتماعات التنسيق المنعقدة مع الشركاء المعنيين'),
  ('indicator', 'G0.3', 'عدد دراسات الحالة التي تُظهر تغييراً إيجابياً ناتجاً عن أنشطة البلدية'),
  ('indicator', 'G0.4', 'عدد الشراكات الفاعلة المساهمة في أنشطة خطة العمل'),
  ('indicator', 'IMP-0', 'نسبة المشاركين المدعومين الذين يستمرون في مزاولة نشاط اقتصادي بعد 12 شهراً من تلقي الدعم'),
  ('objective', 'IMPACT', 'الأثر'),
  ('objective', 'SO1', 'الهدف الخاص الأول: تطوير المهارات الفنية الزراعية وبناء القدرات'),
  ('objective', 'SO2', 'الهدف الخاص الثاني: دعم الإنتاج الزراعي وإنتاج الغذاء المحلي'),
  ('objective', 'SO3', 'الهدف الخاص الثالث: تطوير التسويق المحلي والأسواق الريفية'),
  ('objective', 'SO4', 'الهدف الخاص الرابع: تعزيز التخطيط البلدي والشراكات والتنسيق المؤسسي');

do $apply$
declare
  v_shm uuid := (select id from public.municipality where code = 'SHM');
  r     record;
  v_n   int;
begin
  for r in select * from _0172 loop
    if r.kind = 'indicator' then
      update public.indicator set name_ar = r.name_ar where municipality_id = v_shm and code = r.code;
    else
      update public.objective set name_ar = r.name_ar where municipality_id = v_shm and code = r.code;
    end if;
    get diagnostics v_n = row_count;
    if v_n <> 1 then
      raise exception '0172: % % matched % rows, not 1', r.kind, r.code, v_n;
    end if;
  end loop;
end $apply$;

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_shm uuid := (select id from public.municipality where code = 'SHM');
begin
  if exists (select 1 from public.indicator where municipality_id = v_shm and coalesce(name_ar, '') !~ '[ء-ي]')
     or exists (select 1 from public.objective where municipality_id = v_shm and coalesce(name_ar, '') !~ '[ء-ي]') then
    raise exception '0172: a Sahel Horan indicator or objective still has no Arabic name';
  end if;
end $verify$;
