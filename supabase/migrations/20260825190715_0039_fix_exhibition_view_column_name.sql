-- ═══════════════════════════════════════════════════════════════════════════
--  0039 — repair a corrupted column name in v_upcoming_exhibitions
--
--  0038 shipped the "has this already happened" column with a mangled name
--  containing non-Latin characters. It parsed, because Postgres accepts any
--  UTF-8 in a quoted identifier, which is exactly why it slipped through: the
--  migration succeeded and the defect was in the schema rather than in an error
--  message. Renamed to `has_ended` before anything reads it.
-- ═══════════════════════════════════════════════════════════════════════════

drop view if exists public.v_upcoming_exhibitions;

create view public.v_upcoming_exhibitions
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
       (e.end_date < current_date) as has_ended
  from exhibition e
  left join exhibition_registration er on er.exhibition_id = e.id
 where e.deleted_at is null
 group by e.id, e.name, e.location, e.start_date, e.end_date, e.booth_capacity;

revoke all on public.v_upcoming_exhibitions from public, anon;
grant select on public.v_upcoming_exhibitions to authenticated;

comment on view public.v_upcoming_exhibitions is
  'Every market with live booth counts derived from exhibition_registration, so '
  'an approval or a soft delete moves the number with no counter to keep in sync.';
