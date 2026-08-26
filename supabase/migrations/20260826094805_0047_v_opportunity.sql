-- ═══════════════════════════════════════════════════════════════════════════
--  0047 — v_opportunity: one shape for three tables
--
--  The brief is to build the opportunity pattern ONCE, not three times. The
--  obvious way -- a single `opportunity` table with a type discriminator --
--  would mean dropping or rewriting training_session and exhibition, which
--  between them feed A1.3, D0.2, E0.1 and E0.2 and are working. The brief is
--  also additive-only.
--
--  So the three tables stay as they are and this view gives them one shape. The
--  public home page and the detail page read this and nothing else, which is
--  what makes them one component instead of three.
--
--  ── DERIVED, NOT STORED ──
--
--  `applications_open` and `seats_taken` are computed here for the same reason
--  booth counts are computed in v_upcoming_exhibitions: a stored counter goes
--  stale the moment a row is approved somewhere else, and then two places
--  disagree about whether a market is full.
--
--  Open means: published, not cancelled, not already finished, and today falls
--  inside the application window. A null window means no restriction -- the
--  Municipality has not set one, not that it is closed.
--
--  ── SECURITY ──
--
--  security_invoker, so RLS on the underlying tables applies normally. This
--  view grants nothing by itself. The anonymous public read that the home page
--  needs is a separate, deliberate decision and is NOT made here.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_opportunity
with (security_invoker = true) as
select
  ts.id,
  'training'::text            as opportunity_type,
  ts.title,
  ts.description,
  ts.topic_id,
  ts.start_date,
  ts.end_date,
  ts.venue                    as location,
  ts.focal_point,
  ts.duration_hours,
  ts.delivered_by_partnership_id,
  ts.planned_seats            as capacity,
  (select count(*) from public.training_enrolment e
    where e.session_id = ts.id and e.deleted_at is null
      and e.application_status = 'approved'::record_status_t)::int as seats_taken,
  ts.application_opens_on,
  ts.application_closes_on,
  ts.is_published,
  ts.is_cancelled,
  (ts.is_published
   and not ts.is_cancelled
   and ts.end_date >= current_date
   and (ts.application_opens_on  is null or ts.application_opens_on  <= current_date)
   and (ts.application_closes_on is null or ts.application_closes_on >= current_date)
  ) as applications_open,
  ts.created_at
from public.training_session ts
where ts.deleted_at is null

union all

select
  a.id,
  'advisory'::text,
  a.title,
  a.description,
  a.topic_id,
  a.start_date,
  a.end_date,
  a.venue,
  a.focal_point,
  a.duration_hours,
  a.delivered_by_partnership_id,
  a.planned_seats,
  (select count(*) from public.advisory_enrolment e
    where e.session_id = a.id and e.deleted_at is null
      and e.application_status = 'approved'::record_status_t)::int,
  a.application_opens_on,
  a.application_closes_on,
  a.is_published,
  a.is_cancelled,
  (a.is_published
   and not a.is_cancelled
   and a.end_date >= current_date
   and (a.application_opens_on  is null or a.application_opens_on  <= current_date)
   and (a.application_closes_on is null or a.application_closes_on >= current_date)
  ),
  a.created_at
from public.advisory_session a
where a.deleted_at is null

union all

select
  x.id,
  'exhibition'::text,
  x.name,
  x.description,
  null::uuid,                 -- exhibitions have no training topic
  x.start_date,
  x.end_date,
  x.location,
  x.focal_point,
  null::numeric,              -- duration comes from the dates, not a field
  null::uuid,
  x.booth_capacity,
  (select count(*) from public.exhibition_registration r
    where r.exhibition_id = x.id and r.deleted_at is null
      and r.status = 'approved'::record_status_t)::int,
  x.application_opens_on,
  x.application_closes_on,
  x.is_published,
  x.is_cancelled,
  (x.is_published
   and not x.is_cancelled
   and x.end_date >= current_date
   and (x.application_opens_on  is null or x.application_opens_on  <= current_date)
   and (x.application_closes_on is null or x.application_closes_on >= current_date)
  ),
  x.created_at
from public.exhibition x
where x.deleted_at is null;

comment on view public.v_opportunity is
  'Training, advisory and exhibition in one shape, so the public pages are one '
  'component rather than three. applications_open and seats_taken are derived, '
  'never stored. security_invoker: RLS on the base tables applies and this view '
  'grants nothing on its own.';

revoke all on public.v_opportunity from anon;
grant select on public.v_opportunity to authenticated;
