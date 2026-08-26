-- ═══════════════════════════════════════════════════════════════════════════
--  0048 — the public read: one view, one grant, no personal data
--
--  This is the first and only object `anon` may read in this database. Every
--  other table, view and function stays revoked.
--
--  ── WHY IT IS security definer, AND WHAT THAT COSTS ──
--
--  An invoker view would hit the base tables as `anon`, find no anon policy,
--  and return nothing. So this runs as the owner -- which means RLS DOES NOT
--  APPLY to anything it reads. The WHERE clause is therefore the entire
--  security boundary. There is no second line of defence behind it.
--
--  ── FOUR CONDITIONS. ALL FOUR ARE LOAD-BEARING. ──
--
--    1. is_published        the Municipality has chosen to make it public
--    2. not is_cancelled     a cancelled event must not take applications
--    3. end_date >= today    a finished event must not take applications
--    4. deleted_at is null   a soft-deleted event must not be public
--
--  Conditions 1-3 are in the WHERE clause below. CONDITION 4 IS UPSTREAM, in
--  v_opportunity, which filters `deleted_at is null` on all three of its
--  branches. It is not repeated here because v_opportunity does not expose the
--  column -- reaching around the source view to re-filter would mean two places
--  deciding the same thing.
--
--  If you are editing v_opportunity: ITS deleted_at FILTERS ARE THIS VIEW'S
--  SECURITY. Removing one publishes soft-deleted records to the open internet.
--  That is migration 0025's bug arriving from the other direction, and there is
--  no RLS behind this to catch it. A matching warning sits on v_opportunity.
--
--  ── WHAT IS DELIBERATELY NOT HERE ──
--
--  seats_taken          an applicant count. All trainings have planned_seats
--                       null, so it would be the only number on the page and it
--                       reads as "N people applied". capacity, places_remaining
--                       and is_full say what an applicant needs without it.
--  delivered_by_partnership_id
--                       a bare FK. Rendering the partner's name would need a
--                       grant on `partner`, which carries contact_person, phone
--                       and email. If the name should be public, JOIN IT IN the
--                       way the topic label is joined below -- never grant.
--  created_at, ids of any person, any enrolment, any registration.
--
--  focal_point IS published, and is the only human name here: a municipal
--  officer to contact, in an official capacity, like a name on a poster. It is
--  free text, so whatever staff type goes public -- the create form warns them.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_public_opportunity as
select
  o.id,
  o.opportunity_type,
  o.title,
  o.description,
  -- Joined in so anon needs NO grant on ref_training_topic.
  t.label_en as topic_en,
  t.label_ar as topic_ar,
  o.start_date,
  o.end_date,
  o.location,
  o.focal_point,
  o.duration_hours,
  o.application_opens_on,
  o.application_closes_on,
  o.applications_open,
  -- Capacity is published. The applicant count is not.
  o.capacity,
  case when o.capacity is null then null
       else greatest(0, o.capacity - o.seats_taken) end as places_remaining,
  case when o.capacity is null then false
       else o.seats_taken >= o.capacity end as is_full
from public.v_opportunity o
left join public.ref_training_topic t on t.id = o.topic_id
where o.is_published
  and not o.is_cancelled
  and o.end_date >= current_date;

comment on view public.v_public_opportunity is
  'THE ONLY OBJECT anon MAY READ. security definer, so RLS does not apply and '
  'the WHERE clause is the entire security boundary. Four conditions, all '
  'load-bearing: (1) is_published, (2) not is_cancelled, (3) end_date >= today '
  'in this view; (4) deleted_at is null UPSTREAM in v_opportunity. Never add a '
  'column without checking all four still hold. Publishes no personal data: no '
  'applicant names, no national IDs, no applicant counts. focal_point is a '
  'municipal contact in an official capacity.';

comment on view public.v_opportunity is
  'Training, advisory and exhibition in one shape. security_invoker: RLS on the '
  'base tables applies and this view grants nothing on its own. '
  'WARNING: its `deleted_at is null` filters are the ONLY thing keeping '
  'soft-deleted records off the PUBLIC internet, because v_public_opportunity '
  'reads this view as security definer and RLS does not apply there. Do not '
  'remove them.';

revoke all on public.v_public_opportunity from public;
grant select on public.v_public_opportunity to anon, authenticated;
