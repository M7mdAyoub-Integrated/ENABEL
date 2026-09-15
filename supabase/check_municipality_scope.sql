-- check_municipality_scope.sql -- does anything read the framework tables
-- without saying whose framework?
--
-- Run as the owner (psql "$DATABASE_URL" -f supabase/check_municipality_scope.sql,
-- or paste into the SQL editor). It raises on the first failure and prints
-- one NOTICE per passing group.
--
-- ── THE CLASS ──
--
-- reporting_period, indicator, objective, activity and indicator_target each
-- hold one row set PER MUNICIPALITY since 0111, and the two municipalities
-- share their codes: both have a `26/Q3`, both have an `A1.2`. A join on
-- code or on date alone matches both, and the figure doubles for anyone
-- unscoped -- the owner, a super admin acting nowhere -- while a coordinator
-- looks right only because RLS hides the other municipality's rows from
-- them. person_restore_impact read C1.3 = 4 where two sessions existed
-- (CLAUDE.md register; 0134 fixed three functions, 0135 a view).
--
-- ── WHAT IS VERIFIED, AND HOW ──
--
-- 1. Behaviour: every view that reads reporting_period yields each row of
--    its natural key once, as the owner, unscoped. A doubled join shows as
--    duplicates on (municipality_id, period_code[, code]).
--
-- 2. Behaviour: a municipality with no live records has no figure. While
--    that is true of one of them, any non-zero actual there can only be the
--    other's data through an unscoped join. This assertion is skipped, with
--    a NOTICE, once both municipalities hold records.
--
-- 3. Shape, deliberately last and weakest: every function whose body reads
--    reporting_period also mentions municipality_id. A function can mention
--    the column and still join wrong, which is why 1 and 2 come first; this
--    one exists to catch a new function written with no municipality in
--    mind at all.
--
-- Nothing here reads the application. A PostgREST embed or a screen query
-- that forgets the municipality is app/scripts' business.

do $$
declare
  v record; cols text[]; n_all bigint; n_key bigint; k text; checked int := 0;
  empties text[]; bad text;
begin
  -- 1. views, keyed on what they carry
  for v in select viewname from pg_views where schemaname = 'public' and definition ~* 'reporting_period' order by viewname loop
    select array_agg(column_name::text) into cols
      from information_schema.columns where table_schema = 'public' and table_name = v.viewname;
    if not ('municipality_id' = any(cols) and 'period_code' = any(cols)) then
      raise exception 'check_municipality_scope: view % reads reporting_period but exposes no (municipality_id, period_code) to key on', v.viewname;
    end if;
    k := 'municipality_id, period_code'
         || case when 'code' = any(cols) then ', code' else '' end
         || case when 'sex' = any(cols) then ', sex, age_band, refugee_status, disability_status, village' else '' end;
    execute format('select count(*), count(distinct (%s)) from public.%I', k, v.viewname) into n_all, n_key;
    if n_all <> n_key then
      raise exception 'check_municipality_scope: view % has % rows but % distinct on (%) -- a join across municipalities', v.viewname, n_all, n_key, k;
    end if;
    checked := checked + 1;
  end loop;
  raise notice 'check_municipality_scope: % views read reporting_period, none duplicates its key', checked;

  -- 2. an empty municipality has no figure
  select array_agg(m.code order by m.code) into empties
    from public.municipality m
   where m.deleted_at is null
     and not exists (select 1 from public.v_indicator_progress p where p.municipality_id = m.id and coalesce(p.actual, 0) <> 0)
     and not exists (select 1 from public.v_indicator_actual a where a.municipality_id = m.id and coalesce(a.actual, 0) <> 0);
  if empties is null then
    raise notice 'check_municipality_scope: both municipalities hold records; the empty-municipality assertion no longer applies';
  else
    -- Confirmed empty in the views; now the same must hold in every leaf.
    select string_agg(x, ', ') into bad from (
      select p.municipality_code || ' ' || p.code as x
        from (select m.code as municipality_code, pr.code, pr.actual, pr.denominator
                from public.v_indicator_progress pr join public.municipality m on m.id = pr.municipality_id
               where m.code = any(empties)) p
       where coalesce(p.actual, 0) <> 0 or coalesce(p.denominator, 0) <> 0) s;
    if bad is not null then
      raise exception 'check_municipality_scope: a municipality with no records shows figures: %', bad;
    end if;
    raise notice 'check_municipality_scope: % holds no records and shows no figure in any view', array_to_string(empties, ', ');
  end if;

  -- 3. functions reading reporting_period name a municipality somewhere
  select string_agg(p.proname, ', ' order by p.proname) into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and regexp_replace(p.prosrc, '--[^\n]*', '', 'g') ~* '\m(public\.)?reporting_period\M'
     and regexp_replace(p.prosrc, '--[^\n]*', '', 'g') !~* 'municipality_id';
  if bad is not null then
    raise exception 'check_municipality_scope: functions reading reporting_period with no municipality_id in the body: %', bad;
  end if;
  raise notice 'check_municipality_scope: every function reading reporting_period names a municipality';
end $$;
