-- ═══════════════════════════════════════════════════════════════════════════
--  0038 — what the Coordinator actually opens the dashboard to see
--
--  The indicator views answer "how are we doing against the plan". They do not
--  answer "what is happening in my municipality this week", which is the
--  question the person who opens this screen every Monday is actually asking.
--
--  Three objects, all counting in SQL so the overview cannot drift from the
--  report the way a browser-side count would:
--
--   1. v_recent_activity  — a dated feed across every operational form.
--   2. v_upcoming_exhibitions — the next markets and how full they are.
--   3. overview_counts()  — the headline tallies, filterable.
--
--  SECURITY IS DELIBERATELY DIFFERENT HERE
--
--  The indicator views are `security definer` with an explicit role guard,
--  because aggregate figures are exactly what a partner_viewer is entitled to.
--  The activity feed is the opposite: it names people. So it is
--  `security_invoker = true` and RLS applies normally -- a partner_viewer reads
--  zero rows from `person` and therefore gets an empty feed, which is what
--  05 section 6 requires. No role guard is written here because none is needed;
--  the underlying policies already say the right thing.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. recent activity ────────────────────────────────────────────────────
create or replace view public.v_recent_activity
with (security_invoker = true) as
  select 'training_completion'::text as kind,
         te.id,
         coalesce(te.decided_on, te.registered_on) as happened_on,
         p.full_name  as subject,
         p.village    as village,
         case when te.met_criteria is true then 'met'
              when te.met_criteria is false then 'not_met'
              else 'pending' end as detail,
         'tc'::text as module
    from training_enrolment te
    join person p on p.id = te.person_id and p.deleted_at is null
   where te.deleted_at is null

  union all
  select 'exhibition_registration', er.id, e.start_date, p.full_name, p.village,
         er.status::text, 'rg'
    from exhibition_registration er
    join person p on p.id = er.person_id and p.deleted_at is null
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.deleted_at is null

  union all
  select 'office_service', os.id, os.service_date, p.full_name, p.village, null, 'os'
    from office_service os
    join person p on p.id = os.person_id and p.deleted_at is null
   where os.deleted_at is null

  union all
  select 'guidance', gr.id, gr.guidance_date, p.full_name, p.village, null, 'gr'
    from guidance_record gr
    join person p on p.id = gr.person_id and p.deleted_at is null
   where gr.deleted_at is null

  union all
  select 'followup', fs.id, fs.contact_date, p.full_name, p.village, fs.status::text, 'fu'
    from followup_survey fs
    join person p on p.id = fs.person_id and p.deleted_at is null
   where fs.deleted_at is null

  -- These four have no person attached; the subject is the thing itself.
  union all
  select 'market_linkage', ml.id, ml.linked_on, pt.name, null, null, 'ln'
    from market_linkage ml
    join partnership ps on ps.id = ml.partnership_id and ps.deleted_at is null
    join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
   where ml.deleted_at is null

  union all
  select 'exhibition_held', e.id, e.end_date, e.name, e.location, null, 'ex'
    from exhibition e
   where e.deleted_at is null

  union all
  select 'partnership', ps.id, ps.established_on, pt.name, null,
         ps.partnership_type::text, case when ps.partnership_type = 'training' then 'tp' else 'pp' end
    from partnership ps
    join partner pt on pt.id = ps.partner_id and pt.deleted_at is null
   where ps.deleted_at is null;

revoke all on public.v_recent_activity from public, anon;
grant select on public.v_recent_activity to authenticated;

comment on view public.v_recent_activity is
  'Dated feed across every operational form, newest first when ordered. '
  'security_invoker so RLS applies: a partner_viewer sees an empty feed because '
  'they cannot read person. Do not make this definer.';

-- ── 2. upcoming exhibitions ───────────────────────────────────────────────
-- Booth counts come from the registration table, not from a stored counter, so
-- an approval or a soft delete moves the number with no second place to update.
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
       (e.end_date < current_date) as已held
  from exhibition e
  left join exhibition_registration er on er.exhibition_id = e.id
 where e.deleted_at is null
 group by e.id, e.name, e.location, e.start_date, e.end_date, e.booth_capacity;

revoke all on public.v_upcoming_exhibitions from public, anon;
grant select on public.v_upcoming_exhibitions to authenticated;
