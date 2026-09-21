-- ═══════════════════════════════════════════════════════════════════════════
--  0139 — age_band() names a child as a child; Khalidiyah's seven bands
--
--  KHALIDIYAH_IMPLEMENTATION_PLAN.md Part 2.3, decision D3.
--
--  ── THE LATENT DEFECT ──
--
--  The live body of age_band(person) on 2026-09-21:
--
--    case when s.a is null then 'not_recorded'
--         when s.a < 25    then '18-24'
--         when s.a < 35    then '25-34'
--         when s.a < 45    then '35-44'
--         else '45+' end
--
--  Every age under 25 falls into '18-24': a ten-year-old is reported as a
--  young adult. Harmless until now only because nobody under 18 exists in
--  `person` -- counted in Part 1 of the plan: 0, including soft-deleted
--  rows. Khalidiyah's volunteer registration is where minors are expected,
--  and the first one would have been mislabelled silently in every Sahel
--  Horan or Ramtha view that calls this function over them.
--
--  An explicit 'under_18' branch is added. Because no person is under 18,
--  no existing row changes band, and the migration proves it: every
--  per-municipality view hash is taken before and after and compared.
--  Everything else in the body is the live text.
--
--  ── KHALIDIYAH'S OWN BANDS ──
--
--  01_GUIDANCE, "Standard disaggregation lists -- use these exact
--  categories everywhere":
--
--    Under 12 · 12–14 · 15–24 (youth) · 25–34 · 35–49 · 50–64 · 65 and above
--
--  Seven bands, and they do not nest in the four the other two programmes
--  use (35–44 / 45+ against 35–49 / 50–64 / 65+), so Khalidiyah gets its own
--  function and never calls age_band(). The codes match the rows 0141 seeds
--  in ref_khld_age_group, so a band derived from a date of birth and a band
--  chosen on a form compare by code.
--
--  Two forms of it: khld_age_band(age) for an age in years, and
--  khld_age_band_on(person, date) for the age as at a date -- a volunteer's
--  band is the band at the activity, not at the moment the report is run
--  (plan 2.4: status is recorded as at the activity).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. the seven hashes, before ──────────────────────────────────────────
create temp table _0139_before on commit drop as
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

-- ── 1. age_band, from its live body plus one branch ──────────────────────

create or replace function public.age_band(p person)
returns text
language sql
stable
set search_path to 'public'
as $function$
  select case
           when s.a is null then 'not_recorded'
           when s.a < 18    then 'under_18'
           when s.a < 25    then '18-24'
           when s.a < 35    then '25-34'
           when s.a < 45    then '35-44'
           else '45+'
         end
  from (select coalesce(
                 date_part('year', age(p.date_of_birth::timestamp))::int,
                 p.age_recorded) as a) s;
$function$;

-- ── 2. Khalidiyah's bands ────────────────────────────────────────────────

create function public.khld_age_band(p_age int)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
           when p_age is null then 'not_recorded'
           when p_age < 12    then 'under_12'
           when p_age < 15    then '12_14'
           when p_age < 25    then '15_24'
           when p_age < 35    then '25_34'
           when p_age < 50    then '35_49'
           when p_age < 65    then '50_64'
           else 'age_65_plus'
         end;
$$;

comment on function public.khld_age_band(int) is
  'Khalidiyah''s seven age bands from 01_GUIDANCE (Under 12 · 12–14 · 15–24 · '
  '25–34 · 35–49 · 50–64 · 65 and above), by code. Never age_band(). 0139.';

-- The age as at a date: whole years from date_of_birth when it is known,
-- else the recorded age (which has no "as at", and is used as it stands).
create function public.khld_age_on(p person, p_on date)
returns int
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
           case when p.date_of_birth is not null
                then date_part('year', age(coalesce(p_on, current_date)::timestamp, p.date_of_birth::timestamp))::int
           end,
           p.age_recorded);
$$;

create function public.khld_age_band_on(p person, p_on date)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select public.khld_age_band(public.khld_age_on(p, p_on));
$$;

comment on function public.khld_age_band_on(person, date) is
  'khld_age_band of the person''s age as at the date -- a band at the activity, '
  'not at the moment the report runs. 0139.';

grant execute on function public.khld_age_band(int) to authenticated;
grant execute on function public.khld_age_on(person, date) to authenticated;
grant execute on function public.khld_age_band_on(person, date) to authenticated;

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  r record;
  v_after text;
  v_n int;
  v_id uuid;
begin
  -- nobody under 18, still
  select count(*) into v_n from public.person
   where coalesce(date_part('year', age(date_of_birth::timestamp))::int, age_recorded) < 18;
  if v_n <> 0 then
    raise exception '0139: % people under 18 exist; the age_band change would move a figure', v_n;
  end if;

  -- the branch is reached: a ten-year-old, inserted and discarded
  begin
    insert into public.person (national_id, full_name, age_recorded)
    values ('399000999', '0139 probe child', 10) returning id into v_id;
    select public.age_band(p) into v_after from public.person p where p.id = v_id;
    if v_after is distinct from 'under_18' then
      raise exception '0139: a ten-year-old reads % from age_band', v_after;
    end if;
    raise exception using errcode = 'P0139', message = 'rollback the probe';
  exception
    when sqlstate 'P0139' then null;
  end;
  if exists (select 1 from public.person where national_id = '399000999') then
    raise exception '0139: the probe child survived the rollback';
  end if;

  -- the seven hashes, after: identical
  for r in select b.muni, b.v, b.h as before_h,
                  case b.v
                    when 'actual' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_actual t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'progress' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_progress t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'disagg' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_indicator_disaggregated t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_status' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_rmth_indicator_status t where t.municipality_id = (select id from public.municipality where code = b.muni))
                    when 'rmth_unique' then (select md5(string_agg(t::text, E'\n' order by t::text)) from public.v_rmth_indicator_unique t where t.municipality_id = (select id from public.municipality where code = b.muni))
                  end as after_h
             from _0139_before b
  loop
    if r.before_h is distinct from r.after_h then
      raise exception '0139: % % moved: % -> %', r.muni, r.v, r.before_h, r.after_h;
    end if;
  end loop;

  -- the seven bands, by boundary
  if public.khld_age_band(11) <> 'under_12' or public.khld_age_band(12) <> '12_14' or public.khld_age_band(14) <> '12_14'
     or public.khld_age_band(15) <> '15_24' or public.khld_age_band(24) <> '15_24' or public.khld_age_band(25) <> '25_34'
     or public.khld_age_band(34) <> '25_34' or public.khld_age_band(35) <> '35_49' or public.khld_age_band(49) <> '35_49'
     or public.khld_age_band(50) <> '50_64' or public.khld_age_band(64) <> '50_64' or public.khld_age_band(65) <> 'age_65_plus'
     or public.khld_age_band(null) <> 'not_recorded' then
    raise exception '0139: khld_age_band boundaries are wrong';
  end if;
  v_after := public.age_band((select p from public.person p limit 1));
  if v_after is null then
    raise exception '0139: age_band returns null for an existing person';
  end if;
end $verify$;
