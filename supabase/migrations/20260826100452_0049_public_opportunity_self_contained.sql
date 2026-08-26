-- ═══════════════════════════════════════════════════════════════════════════
--  0049 — v_public_opportunity reads the base tables directly
--
--  ── THE DEFECT IN 0048 ──
--
--  0048 built the public view on top of v_opportunity. That does not work, and
--  the reason is worth writing down because it is not obvious:
--
--  v_public_opportunity is `security definer`, so it runs as its owner. But
--  v_opportunity is `security_invoker = true`, and for a nested invoker view
--  permissions are checked against the ORIGINAL calling user -- not against the
--  outer definer view's owner. So an anonymous visitor reached
--  v_public_opportunity, which reached v_opportunity, which tried to read
--  training_session AS anon, and got:
--
--      42501: permission denied for table training_session
--
--  The public page would have shown an error, not an empty list. Caught by
--  actually running as `anon` rather than reasoning about it.
--
--  The wrong fixes, for the record: granting anon on the base tables (exposes
--  everything), or making v_opportunity definer (it would stop applying RLS for
--  the authenticated staff screens that use it, and it carries no role guard).
--
--  ── THE FIX ──
--
--  The public view is now SELF-CONTAINED. It reads training_session,
--  advisory_session and exhibition directly, so as a definer view owned by the
--  migration role it can actually read them, and every condition that keeps a
--  record off the public internet is written in this one file.
--
--  v_opportunity is unchanged and still serves the authenticated staff screens.
--  It is simply no longer load-bearing for public security, which also removes
--  the "do not edit its filters" hazard 0048 had to warn about.
--
--  ── FOUR CONDITIONS, ALL FOUR NOW IN THIS VIEW'S OWN WHERE CLAUSE ──
--
--    1. is_published        the Municipality chose to make it public
--    2. not is_cancelled    a cancelled event must not take applications
--    3. end_date >= today   a finished event must not take applications
--    4. deleted_at is null  a soft-deleted event must not be public
--
--  This view is `security definer`, so RLS DOES NOT APPLY and these four are
--  the entire security boundary. There is nothing behind them. Adding a branch
--  or a column without all four republishes deleted records to the open
--  internet -- migration 0025's bug from the other direction.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_public_opportunity as

select ts.id,
       'training'::text as opportunity_type,
       ts.title,
       ts.description,
       t.label_en as topic_en,
       t.label_ar as topic_ar,
       ts.start_date,
       ts.end_date,
       ts.venue as location,
       ts.focal_point,
       ts.duration_hours,
       ts.application_opens_on,
       ts.application_closes_on,
       (    (ts.application_opens_on  is null or ts.application_opens_on  <= current_date)
        and (ts.application_closes_on is null or ts.application_closes_on >= current_date)
       ) as applications_open,
       ts.planned_seats as capacity,
       case when ts.planned_seats is null then null
            else greatest(0, ts.planned_seats - (
              select count(*) from public.training_enrolment e
               where e.session_id = ts.id and e.deleted_at is null
                 and e.application_status = 'approved'::record_status_t)::int)
       end as places_remaining,
       case when ts.planned_seats is null then false
            else (select count(*) from public.training_enrolment e
                   where e.session_id = ts.id and e.deleted_at is null
                     and e.application_status = 'approved'::record_status_t) >= ts.planned_seats
       end as is_full
  from public.training_session ts
  left join public.ref_training_topic t on t.id = ts.topic_id
 where ts.is_published
   and not ts.is_cancelled
   and ts.end_date >= current_date
   and ts.deleted_at is null

union all

select a.id, 'advisory'::text, a.title, a.description,
       t.label_en, t.label_ar,
       a.start_date, a.end_date, a.venue, a.focal_point, a.duration_hours,
       a.application_opens_on, a.application_closes_on,
       (    (a.application_opens_on  is null or a.application_opens_on  <= current_date)
        and (a.application_closes_on is null or a.application_closes_on >= current_date)),
       a.planned_seats,
       case when a.planned_seats is null then null
            else greatest(0, a.planned_seats - (
              select count(*) from public.advisory_enrolment e
               where e.session_id = a.id and e.deleted_at is null
                 and e.application_status = 'approved'::record_status_t)::int)
       end,
       case when a.planned_seats is null then false
            else (select count(*) from public.advisory_enrolment e
                   where e.session_id = a.id and e.deleted_at is null
                     and e.application_status = 'approved'::record_status_t) >= a.planned_seats
       end
  from public.advisory_session a
  left join public.ref_training_topic t on t.id = a.topic_id
 where a.is_published
   and not a.is_cancelled
   and a.end_date >= current_date
   and a.deleted_at is null

union all

select x.id, 'exhibition'::text, x.name, x.description,
       null::text, null::text,
       x.start_date, x.end_date, x.location, x.focal_point, null::numeric,
       x.application_opens_on, x.application_closes_on,
       (    (x.application_opens_on  is null or x.application_opens_on  <= current_date)
        and (x.application_closes_on is null or x.application_closes_on >= current_date)),
       x.booth_capacity,
       greatest(0, x.booth_capacity - (
         select count(*) from public.exhibition_registration r
          where r.exhibition_id = x.id and r.deleted_at is null
            and r.status = 'approved'::record_status_t)::int),
       (select count(*) from public.exhibition_registration r
         where r.exhibition_id = x.id and r.deleted_at is null
           and r.status = 'approved'::record_status_t) >= x.booth_capacity
  from public.exhibition x
 where x.is_published
   and not x.is_cancelled
   and x.end_date >= current_date
   and x.deleted_at is null;

comment on view public.v_public_opportunity is
  'THE ONLY OBJECT anon MAY READ. security definer, so RLS does not apply and '
  'this view''s own WHERE clauses are the entire security boundary. Every branch '
  'must carry all four: is_published, not is_cancelled, end_date >= current_date, '
  'deleted_at is null. Self-contained by design -- it reads base tables directly '
  'rather than another view, because a nested security_invoker view is evaluated '
  'as the ORIGINAL caller and denies anon. Publishes no personal data: no '
  'applicant names, no national IDs, no applicant counts. capacity and '
  'places_remaining only. focal_point is a municipal contact in an official '
  'capacity.';

-- v_opportunity is no longer load-bearing for public security.
comment on view public.v_opportunity is
  'Training, advisory and exhibition in one shape, for the authenticated staff '
  'screens. security_invoker: RLS on the base tables applies and it grants '
  'nothing on its own. The public site does NOT read this -- see '
  'v_public_opportunity, which is self-contained.';

revoke all on public.v_public_opportunity from public;
grant select on public.v_public_opportunity to anon, authenticated;
