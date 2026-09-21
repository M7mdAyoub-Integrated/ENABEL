-- ═══════════════════════════════════════════════════════════════════════════
--  0140 — the third municipality: Al Khalidiyah, and its thirteen quarters
--
--  KHALIDIYAH_IMPLEMENTATION_PLAN.md Part 3.1.
--
--  ── THE ROW ──
--
--  code KHLD, slug khalidiyah, at a fixed id like the other two (0111:
--  SHM …005a, RMTH …00a1). Names from the forms workbook's index sheet,
--  verbatim: "AL KHALIDIYAH MUNICIPALITY" is the sheet's shouted heading and
--  is written here in the same case the other two rows use;
--  "بلدية الخالدية" is the Arabic beside it. The programme line is the
--  index sheet's own description of the plan, in both languages, verbatim.
--
--  ── THE PERIODS ──
--
--  The same thirteen quarters as the other two programmes, 26/Q3 to 29/Q3.
--  The index sheet dates the plan 2026–2029; the activity forms run from
--  "December 2026 (after rehabilitation) to September 2029" and the
--  framework's quarterly target columns run 27/Q1 to 28/Q4 exactly as the
--  other two workbooks' do. Nothing names a different start, so the
--  platform's common calendar is kept -- one quarter that exists for one
--  municipality and not another would put an empty column in a comparison.
--
--  Their codes repeat the other two municipalities' codes, which is exactly
--  what 0114 anchored every leaf view against. The migration asserts, on
--  the twenty Sahel Horan and seventeen Ramtha branches, that no figure
--  moved when a third `27/Q1` appeared.
--
--  ── WHAT DOES NOT NEED CHANGING ──
--
--  Every scoped policy is `can_see_municipality(municipality_id)` (0118) and
--  every scoped default is `my_municipality()` (0112); neither names a
--  municipality. A catalogue search on 2026-09-21 for a policy, function
--  or view naming 'SHM', 'RMTH' or either fixed id found only the leaf
--  indicator views, which anchor on their OWN code by design. There is no
--  two-tenant leftover to remove.
--
--  No account is created here: 3.2 says no password in any migration, and
--  the account is made through the auth admin API (manage-account) after
--  this runs.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. the seven hashes, before ──────────────────────────────────────────
create temp table _0140_before on commit drop as
select m.code as muni, 'actual' as v, md5(string_agg(t::text, E'\n' order by t::text)) as h
  from public.v_indicator_actual t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'progress', md5(string_agg(t::text, E'\n' order by t::text))
  from public.v_indicator_progress t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'disagg', md5(string_agg(t::text, E'\n' order by t::text))
  from public.v_indicator_disaggregated t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'rmth_status', md5(string_agg(t::text, E'\n' order by t::text))
  from public.v_rmth_indicator_status t join public.municipality m on m.id = t.municipality_id group by m.code
union all
select m.code, 'rmth_unique', md5(string_agg(t::text, E'\n' order by t::text))
  from public.v_rmth_indicator_unique t join public.municipality m on m.id = t.municipality_id group by m.code;

-- ── 1. the municipality ──────────────────────────────────────────────────

insert into public.municipality (id, code, name_en, name_ar, slug, is_active, programme_en, programme_ar)
values ('00000000-0000-4000-8000-0000000000b2', 'KHLD',
        'Al Khalidiyah Municipality', 'بلدية الخالدية', 'khalidiyah', true,
        'Action Plan for Enhancing Community Integration and Social Engagement, 2026–2029',
        'خطة تعزيز الاندماج المجتمعي والمشاركة الاجتماعية ٢٠٢٦–٢٠٢٩');

-- ── 2. the thirteen quarters ─────────────────────────────────────────────

insert into public.reporting_period (municipality_id, code, start_date, end_date, is_locked)
select '00000000-0000-4000-8000-0000000000b2', q.code, q.s, q.e, false
  from (values
    ('26/Q3', date '2026-07-01', date '2026-09-30'),
    ('26/Q4', date '2026-10-01', date '2026-12-31'),
    ('27/Q1', date '2027-01-01', date '2027-03-31'),
    ('27/Q2', date '2027-04-01', date '2027-06-30'),
    ('27/Q3', date '2027-07-01', date '2027-09-30'),
    ('27/Q4', date '2027-10-01', date '2027-12-31'),
    ('28/Q1', date '2028-01-01', date '2028-03-31'),
    ('28/Q2', date '2028-04-01', date '2028-06-30'),
    ('28/Q3', date '2028-07-01', date '2028-09-30'),
    ('28/Q4', date '2028-10-01', date '2028-12-31'),
    ('29/Q1', date '2029-01-01', date '2029-03-31'),
    ('29/Q2', date '2029-04-01', date '2029-06-30'),
    ('29/Q3', date '2029-07-01', date '2029-09-30')
  ) as q(code, s, e);

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  r record;
  v_n int;
begin
  select count(*) into v_n from public.municipality where deleted_at is null and is_active;
  if v_n <> 3 then
    raise exception '0140: expected 3 active municipalities, found %', v_n;
  end if;
  select count(*) into v_n from public.reporting_period where municipality_id = '00000000-0000-4000-8000-0000000000b2';
  if v_n <> 13 then
    raise exception '0140: expected 13 Khalidiyah periods, found %', v_n;
  end if;
  -- three municipalities now share every period code, and every code is
  -- unique within its municipality (the 0113 key)
  select count(*) into v_n from (select code from public.reporting_period group by code having count(*) <> 3) x;
  if v_n <> 0 then
    raise exception '0140: % period codes are not held by all three municipalities', v_n;
  end if;

  -- the seven hashes, after: identical -- a third 27/Q1 moved nothing
  for r in select b.muni, b.v, b.h as before_h,
                  case b.v
                    when 'actual' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_actual t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'progress' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_progress t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'disagg' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_disaggregated t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_status' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_rmth_indicator_status t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_unique' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_rmth_indicator_unique t where t.municipality_id = (select id from public.municipality where code = b.muni))
                  end as after_h
             from _0140_before b
  loop
    if r.before_h is distinct from r.after_h then
      raise exception '0140: % % moved: % -> %', r.muni, r.v, r.before_h, r.after_h;
    end if;
  end loop;

  -- and Khalidiyah has no figure anywhere yet: no indicator rows, so no
  -- view row can carry its id
  if exists (select 1 from public.v_indicator_actual where municipality_id = '00000000-0000-4000-8000-0000000000b2')
     or exists (select 1 from public.v_indicator_progress where municipality_id = '00000000-0000-4000-8000-0000000000b2') then
    raise exception '0140: a view already carries a Khalidiyah row';
  end if;
end $verify$;
