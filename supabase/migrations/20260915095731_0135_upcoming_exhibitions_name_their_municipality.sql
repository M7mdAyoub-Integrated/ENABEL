-- 0135 · v_upcoming_exhibitions states its municipality instead of inheriting it
--
-- ── WHY ──
--
--  PLATFORM_AUDIT.md §1.3 and §2.4. The view reads `exhibition`, which is
--  scoped, and carries no municipality of its own. It is correct today only
--  because it is `security_invoker = true`, so exhibition's RLS -- which
--  checks can_see_municipality() on every row (0118) -- applies to the caller
--  and a Sahel Horan coordinator sees only Sahel Horan's markets.
--
--  That is a filter the view inherits from a property it could lose: set
--  security_invoker back to false, or build a definer view on top of it, and
--  the other municipality's markets appear with no error anywhere. The three
--  views the application reads for figures (v_indicator_actual,
--  v_indicator_progress, v_indicator_disaggregated) carry the gate in their
--  own WHERE for exactly this reason. This one now does too.
--
-- ── WHAT CHANGES ──
--
--  1. The WHERE gains `(auth.uid() is null or public.can_see_municipality(
--     e.municipality_id))` -- the same expression as the three figure views,
--     so a service context still sees everything and a signed-in caller sees
--     their own municipality whether or not RLS is doing its job underneath.
--  2. `municipality_id` becomes a column, appended last so `create or replace
--     view` accepts it and no consumer's column order moves. A caller can now
--     filter explicitly instead of trusting the gate.
--  3. The grants are stated rather than inherited. The view held ALL on
--     authenticated -- the schema's default at creation, which 0039's
--     `revoke ... from public, anon` never touched. It is a grouped view and so
--     not updatable, so nothing was reachable through it; the grant was
--     untidy rather than open, and it goes anyway.
--
--  security_invoker stays true. The explicit gate and the RLS underneath are
--  two independent reasons the answer is right; the point of this migration
--  is that removing either leaves the other.
--
--  0038 wrote the view, 0039 rewrote it (a corrupted column name), 0047 only
--  mentions it. The body below is 0039's, from pg_get_viewdef.
--
-- ── CONSUMERS ──
--
--  app/src/data/exhibitions.ts reads it twice, by `select *`-style column
--  lists that do not name municipality_id, so neither changes. Nothing else
--  reads it.

create or replace view public.v_upcoming_exhibitions
with (security_invoker = true) as
select e.id,
       e.name,
       e.location,
       e.start_date,
       e.end_date,
       e.booth_capacity,
       count(er.id) filter (
         where er.deleted_at is null and er.status = 'approved'::record_status_t
       )::int as booths_taken,
       count(er.id) filter (
         where er.deleted_at is null and er.status = 'submitted'::record_status_t
       )::int as booths_pending,
       (e.end_date < current_date) as has_ended,
       e.municipality_id
  from exhibition e
  left join exhibition_registration er on er.exhibition_id = e.id
 where e.deleted_at is null
   -- The same gate as v_indicator_actual (0118): a service context sees
   -- everything, a signed-in caller sees the municipality they are working in.
   and (auth.uid() is null or public.can_see_municipality(e.municipality_id))
 group by e.id, e.name, e.location, e.start_date, e.end_date, e.booth_capacity, e.municipality_id;

revoke all on public.v_upcoming_exhibitions from public, anon, authenticated;
grant select on public.v_upcoming_exhibitions to authenticated;

comment on view public.v_upcoming_exhibitions is
  'Every market of the caller''s municipality with live booth counts derived '
  'from exhibition_registration, so an approval or a soft delete moves the '
  'number with no counter to keep in sync. Gated on can_see_municipality() in '
  'its own WHERE (0135) as well as by RLS through security_invoker; either '
  'alone is enough.';

-- ── verification ──────────────────────────────────────────────────────────

do $verify$
declare
  v_def   text;
  v_opts  text[];
  v_shm   int;
  v_rmth  int;
  v_all   int;
begin
  -- 1. the gate is in the definition, and security_invoker is still on
  v_def := pg_get_viewdef('public.v_upcoming_exhibitions'::regclass, true);
  if v_def !~ 'can_see_municipality\(e\.municipality_id\)' then
    raise exception '0135: the view definition does not gate on can_see_municipality';
  end if;
  select reloptions into v_opts from pg_class where oid = 'public.v_upcoming_exhibitions'::regclass;
  if not ('security_invoker=true' = any (coalesce(v_opts, '{}'))) then
    raise exception '0135: security_invoker is no longer set on the view';
  end if;

  -- 2. the grants: authenticated SELECT only, anon nothing
  if not has_table_privilege('authenticated', 'public.v_upcoming_exhibitions', 'SELECT') then
    raise exception '0135: authenticated cannot select from the view';
  end if;
  if has_table_privilege('authenticated', 'public.v_upcoming_exhibitions', 'INSERT, UPDATE, DELETE') then
    raise exception '0135: authenticated still holds a write privilege on the view';
  end if;
  if has_table_privilege('anon', 'public.v_upcoming_exhibitions', 'SELECT') then
    raise exception '0135: anon can select from the view';
  end if;

  -- 3. the owner, no JWT, sees every municipality's markets; each
  --    municipality's count is what the table holds for it
  select count(*) into v_all from public.v_upcoming_exhibitions;
  select count(*) into v_shm from public.exhibition e join public.municipality m on m.id = e.municipality_id
   where m.code = 'SHM' and e.deleted_at is null;
  select count(*) into v_rmth from public.exhibition e join public.municipality m on m.id = e.municipality_id
   where m.code = 'RMTH' and e.deleted_at is null;
  if v_all <> v_shm + v_rmth then
    raise exception '0135: owner sees % rows, the table holds % + %', v_all, v_shm, v_rmth;
  end if;
  if (select count(*) from public.v_upcoming_exhibitions v join public.municipality m on m.id = v.municipality_id where m.code = 'SHM') <> v_shm then
    raise exception '0135: municipality_id on the view does not partition the rows as the table does';
  end if;
end $verify$;
