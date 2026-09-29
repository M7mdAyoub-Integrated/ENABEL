-- ═══════════════════════════════════════════════════════════════════════════
--  0170 — the public page no longer shows a bazaar's booths
--
--  The owner asked on 29 September 2026 that a member of the public applying
--  to a Sahel Horan market or exhibition should not see how many booths it
--  has, or how many are left. v_public_opportunity is the only object anon
--  reads, so the numbers are removed there, not only hidden on the screen:
--  a visitor reading the API directly gets nothing either.
--
--  From 0120's text (grep -l "view public.v_public_opportunity"
--  supabase/migrations/*.sql lists 0048, 0049, 0120; the live definition
--  was compared with 0120's before this was written). One change, in the
--  exhibition branch: capacity and places_remaining are NULL, as they are
--  for a training with no planned seats, so the page says "Open · apply by"
--  instead of "N places left". is_full stays: a market whose booths are all
--  taken still reads "full", because applying to it would be refused.
--  Training and advisory rows are unchanged. The column list, names and
--  types are unchanged, so `create or replace` keeps the grants.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_public_opportunity as
 SELECT ts.id,
    'training'::text AS opportunity_type,
    ts.title,
    ts.description,
    t.label_en AS topic_en,
    t.label_ar AS topic_ar,
    ts.start_date,
    ts.end_date,
    ts.venue AS location,
    ts.focal_point,
    ts.duration_hours,
    ts.application_opens_on,
    ts.application_closes_on,
    (ts.application_opens_on IS NULL OR ts.application_opens_on <= CURRENT_DATE) AND (ts.application_closes_on IS NULL OR ts.application_closes_on >= CURRENT_DATE) AS applications_open,
    ts.planned_seats AS capacity,
        CASE
            WHEN ts.planned_seats IS NULL THEN NULL::integer
            ELSE GREATEST(0, ts.planned_seats - (( SELECT count(*) AS count
               FROM training_enrolment e
              WHERE e.session_id = ts.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t))::integer)
        END AS places_remaining,
        CASE
            WHEN ts.planned_seats IS NULL THEN false
            ELSE (( SELECT count(*) AS count
               FROM training_enrolment e
              WHERE e.session_id = ts.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t)) >= ts.planned_seats
        END AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM training_session ts
     JOIN municipality m ON m.id = ts.municipality_id AND m.is_active AND m.deleted_at IS NULL
     LEFT JOIN ref_training_topic t ON t.id = ts.topic_id
  WHERE ts.is_published AND NOT ts.is_cancelled AND ts.end_date >= CURRENT_DATE AND ts.deleted_at IS NULL
UNION ALL
 SELECT a.id,
    'advisory'::text AS opportunity_type,
    a.title,
    a.description,
    t.label_en AS topic_en,
    t.label_ar AS topic_ar,
    a.start_date,
    a.end_date,
    a.venue AS location,
    a.focal_point,
    a.duration_hours,
    a.application_opens_on,
    a.application_closes_on,
    (a.application_opens_on IS NULL OR a.application_opens_on <= CURRENT_DATE) AND (a.application_closes_on IS NULL OR a.application_closes_on >= CURRENT_DATE) AS applications_open,
    a.planned_seats AS capacity,
        CASE
            WHEN a.planned_seats IS NULL THEN NULL::integer
            ELSE GREATEST(0, a.planned_seats - (( SELECT count(*) AS count
               FROM advisory_enrolment e
              WHERE e.session_id = a.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t))::integer)
        END AS places_remaining,
        CASE
            WHEN a.planned_seats IS NULL THEN false
            ELSE (( SELECT count(*) AS count
               FROM advisory_enrolment e
              WHERE e.session_id = a.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t)) >= a.planned_seats
        END AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM advisory_session a
     JOIN municipality m ON m.id = a.municipality_id AND m.is_active AND m.deleted_at IS NULL
     LEFT JOIN ref_training_topic t ON t.id = a.topic_id
  WHERE a.is_published AND NOT a.is_cancelled AND a.end_date >= CURRENT_DATE AND a.deleted_at IS NULL
UNION ALL
 SELECT x.id,
    'exhibition'::text AS opportunity_type,
    x.name AS title,
    x.description,
    NULL::text AS topic_en,
    NULL::text AS topic_ar,
    x.start_date,
    x.end_date,
    x.location,
    x.focal_point,
    NULL::numeric AS duration_hours,
    x.application_opens_on,
    x.application_closes_on,
    (x.application_opens_on IS NULL OR x.application_opens_on <= CURRENT_DATE) AND (x.application_closes_on IS NULL OR x.application_closes_on >= CURRENT_DATE) AS applications_open,
    NULL::integer AS capacity,
    NULL::integer AS places_remaining,
    (( SELECT count(*) AS count
           FROM exhibition_registration r
          WHERE r.exhibition_id = x.id AND r.deleted_at IS NULL AND r.status = 'approved'::record_status_t)) >= x.booth_capacity AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM exhibition x
     JOIN municipality m ON m.id = x.municipality_id AND m.is_active AND m.deleted_at IS NULL
  WHERE x.is_published AND NOT x.is_cancelled AND x.end_date >= CURRENT_DATE AND x.deleted_at IS NULL;

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
begin
  if exists (select 1 from public.v_public_opportunity
              where opportunity_type = 'exhibition' and (capacity is not null or places_remaining is not null)) then
    raise exception '0170: an exhibition still publishes its booths';
  end if;
  if not exists (select 1 from information_schema.role_table_grants
                  where grantee = 'anon' and table_schema = 'public'
                    and table_name = 'v_public_opportunity' and privilege_type = 'SELECT') then
    raise exception '0170: anon lost the public view';
  end if;
end $verify$;
