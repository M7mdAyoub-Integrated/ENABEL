-- ═══════════════════════════════════════════════════════════════════════════
--  0107 — RESTORE, and the figures a restore moves
--
--  ── THE RULE THIS SERVES, AND THE UI OBLIGATION IT CREATES ──
--
--  CLAUDE.md: "An entity with history hanging off it is RESTORED, never
--  recreated." `person` and `partner` are that kind, which is why 0059 left
--  their unique indexes GLOBAL while making the event-shaped ones partial.
--
--  The reason is not tidiness. G0.4 counts distinct partners with a
--  contribution in the period. Soft-delete a partner, recreate them under the
--  same name, and the old contributions stop counting while the new ones attach
--  to a different row -- so a quarter that has already been reported to the
--  donor changes retroactively. A reported number moving after it was reported
--  is worse than a constraint error.
--
--  CLAUDE.md states the corollary in the same breath: "when someone tries to
--  create a person or partner whose key matches a soft-deleted row, offer
--  RESTORE rather than failing with a constraint error. The rule is correct;
--  without the restore path the UI makes it look like a bug."
--
--  That restore path did not exist. Creating a person with a soft-deleted
--  national ID failed on `person_national_id_key` with no way forward at all --
--  not through the UI, not through any RPC. The one correct action was
--  unreachable, and the only thing a coordinator could do was type a different
--  national ID, which is the exact duplicate the rule exists to prevent.
--
--  ── WHY RESTORING NEEDS AN IMPACT STATEMENT, NOT JUST A CONFIRM ──
--
--  Restoring a person brings back EVERYTHING attached to them. Every indicator
--  view that touches a person joins it and filters `pe.deleted_at is null`:
--
--      A1.3   distinct person with met_criteria         v_ind_a1_3
--      B1.2   distinct person in office_service         v_ind_b1_2
--      D0.1   distinct person in guidance_record        v_ind_d0_1
--      E0.2   distinct person, approved registration    v_ind_e0_2
--      C1.2   their initiatives with a live linkage     v_ind_c1_2
--      C1.3   mentorship sessions on those initiatives  v_ind_c1_3
--      A1 B1 C1 IMP-0   their submitted follow-up surveys
--
--  And each lands in the period of the FIRST qualifying date -- `min(...)` in
--  every one of those views -- not in the quarter the restore happens. So a
--  restore today can change a figure for a quarter eighteen months ago.
--
--  "Are you sure?" cannot convey that. `submit_followup` already established
--  the pattern for this: name the indicators and the periods, computed from the
--  record rather than described in prose. These functions do the same.
--
--  ── WHAT THE IMPACT FUNCTIONS ARE, EXACTLY ──
--
--  Each one re-runs the view's own logic with the person/partner filter removed
--  and everything else intact -- the child row's own `deleted_at`, the parent
--  session/exhibition's `deleted_at`, `met_criteria is true`, `status =
--  'approved'`, the linkage status set, the survey status set. A child row that
--  is itself soft-deleted stays uncounted after the restore and so is not
--  reported here.
--
--  They deliberately do NOT read the views. A view already excludes this
--  person, so subtracting one from the other would give the answer only where
--  nobody else shares the period. The counting rule is duplicated, and that is
--  a real cost -- if a view's definition changes, these have to change with it.
--  The alternative is worse: computing a delta by difference is wrong whenever
--  a second person's first date falls in the same quarter.
--
--  ── PERCENTAGES ARE REPORTED AS "RECOMPUTED", NOT AS A DELTA ──
--
--  A1, B1, C1 and IMP-0 are ratios. Restoring one respondent changes both
--  halves, so "+1" would be a lie. Those rows carry `delta = null` and
--  `recomputed = true`, and the screen says the figure will be recalculated
--  rather than putting a number on it.
--
--  ── SECURITY ──
--
--  SECURITY INVOKER throughout, so RLS decides. `guard_soft_delete` (trigger,
--  0069) already refuses any change to `deleted_at` from anyone who is not a
--  coordinator, in either direction, and its message already says "delete or
--  restore". The restore functions add no rule of their own; they surface that
--  one. Verified as all five roles, not as the owner.
--
--  The impact functions read `person`, `partner` and their children, all of
--  which are is_staff() to read, so a partner_viewer gets nothing from them.
--
--  ── WHY THE LOOKUPS TAKE A KEY AND NOT AN ID ──
--
--  The caller is a form that has just been refused. It knows the national ID
--  the user typed, or the partner name and unit; it does not know the id of a
--  row it cannot see. So the lookup is by the same key the unique index refused
--  on -- `person.national_id`, and `partner (name, unit)` where unit is
--  null-normalised the way the index treats it.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── who is behind a refused key ─────────────────────────────────────────────

create or replace function public.person_restore_candidate(p_national_id text)
returns table(
  id            uuid,
  national_id   text,
  full_name     text,
  village       text,
  deleted_at    timestamptz,
  deleted_by    text
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
  -- `deleted_by` is a display name, not an id: the person confirming a restore
  -- needs to recognise a colleague. audit_log is the only place that records
  -- WHO soft-deleted a row -- `person` has created_by and no deleted_by -- so
  -- the most recent delete entry for this row is what names them.
  select p.id,
         p.national_id,
         p.full_name,
         p.village,
         p.deleted_at,
         (select coalesce(u.email, a.actor::text)
            from audit_log a
            left join auth.users u on u.id = a.actor
           where a.table_name = 'person'
             and a.row_id = p.id
             and a.action = 'delete'
           order by a.changed_at desc
           limit 1)
    from person p
   where p.national_id = regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g')
     and p.deleted_at is not null;
$function$;

comment on function public.person_restore_candidate(text) is
  'The soft-deleted person behind a national ID that a create was just refused '
  'on, with when they were deleted and by whom. Empty when the ID is free or '
  'belongs to a live person. See 0107.';

create or replace function public.partner_restore_candidate(
  p_name text,
  p_unit text default null
)
returns table(
  id          uuid,
  name        text,
  unit        text,
  deleted_at  timestamptz,
  deleted_by  text
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
  select pr.id,
         pr.name,
         pr.unit,
         pr.deleted_at,
         (select coalesce(u.email, a.actor::text)
            from audit_log a
            left join auth.users u on u.id = a.actor
           where a.table_name = 'partner'
             and a.row_id = pr.id
             and a.action = 'delete'
           order by a.changed_at desc
           limit 1)
    from partner pr
   where btrim(pr.name) = btrim(coalesce(p_name, ''))
     -- The unique index treats a null unit and an empty unit as the same
     -- organisation, so the lookup has to as well or a refused save would find
     -- no candidate and look like a plain constraint error again.
     and coalesce(nullif(btrim(pr.unit), ''), '') = coalesce(nullif(btrim(coalesce(p_unit, '')), ''), '')
     and pr.deleted_at is not null;
$function$;

comment on function public.partner_restore_candidate(text, text) is
  'The soft-deleted partner behind a (name, unit) that a create was just '
  'refused on. Unit is null-normalised to match the unique index. See 0107.';

-- ── what a restore would move ───────────────────────────────────────────────

create or replace function public.person_restore_impact(p_person_id uuid)
returns table(
  code        text,
  period_code text,
  delta       integer,
  recomputed  boolean
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
with
-- A1.3 -- distinct person with a completion. v_ind_a1_3 dates it on
-- min(coalesce(decided_on, registered_on)) across LIVE sessions.
a13 as (
  select 'A1.3'::text as code,
         min(coalesce(te.decided_on, te.registered_on)) as on_date
    from training_enrolment te
    join training_session ts on ts.id = te.session_id and ts.deleted_at is null
   where te.person_id = p_person_id
     and te.met_criteria is true
     and te.deleted_at is null
),
-- B1.2 -- distinct person reaching the office, on their first visit.
b12 as (
  select 'B1.2'::text, min(os.service_date)
    from office_service os
   where os.person_id = p_person_id and os.deleted_at is null
),
-- D0.1 -- distinct producer guided, on their first session.
d01 as (
  select 'D0.1'::text, min(gr.guidance_date)
    from guidance_record gr
   where gr.person_id = p_person_id and gr.deleted_at is null
),
-- E0.2 -- distinct producer with an APPROVED registration, dated on the
-- exhibition's start_date, not the registration's.
e02 as (
  select 'E0.2'::text, min(e.start_date)
    from exhibition_registration er
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.person_id = p_person_id
     and er.status = 'approved'::record_status_t
     and er.deleted_at is null
),
-- C1.2 counts INITIATIVES, not people, so this person may bring back more than
-- one -- and they may fall in different quarters. Grouped by period rather than
-- collapsed to a single min().
c12 as (
  select 'C1.2'::text as code, rp.code as period_code, count(*)::int as delta
    from (
      select ml.initiative_id, min(ml.linked_on) as first_on
        from market_linkage ml
        join production_initiative pi on pi.id = ml.initiative_id and pi.deleted_at is null
       where pi.person_id = p_person_id
         and ml.status = any (array['active'::link_status_t, 'ended'::link_status_t])
         and ml.deleted_at is null
       group by ml.initiative_id
    ) f
    join reporting_period rp on f.first_on between rp.start_date and rp.end_date
   group by rp.code
),
-- C1.3 counts SESSIONS. Same reasoning as C1.2, and more likely to span
-- quarters because a mentorship run is spread over months.
c13 as (
  select 'C1.3'::text as code, rp.code as period_code, count(*)::int as delta
    from mentorship_session m
    join production_initiative pi on pi.id = m.initiative_id and pi.deleted_at is null
    join reporting_period rp on m.session_date between rp.start_date and rp.end_date
   where pi.person_id = p_person_id
     and m.deleted_at is null
   group by rp.code
),
-- The four percentages. Every one of them joins person and filters
-- deleted_at, so a restored respondent re-enters BOTH halves of the ratio.
-- Reported per period the surveys were contacted in.
pct as (
  select c.code, rp.code as period_code
    from followup_survey s
    join reporting_period rp on s.contact_date between rp.start_date and rp.end_date
    -- Each predicate is the VIEW's own denominator condition, copied from
    -- pg_get_viewdef rather than from the indicator doc. Two of them are not
    -- what they look like: B1's denominator is everyone who used the office
    -- (`q14_used_office = 'yes'`, a text enum and NOT a boolean), whether or
    -- not they went on to rate it; and C1's requires an initiative started at
    -- least six months before the contact date, which is the whole point of
    -- "still operating at six months".
    cross join lateral (values
      ('A1',    s.q08_applied_knowledge is not null),
      ('B1',    s.q14_used_office = 'yes'),
      ('C1',    s.q17_activity_status is not null
                and exists (select 1 from production_initiative pi
                             where pi.person_id = s.person_id
                               and pi.deleted_at is null
                               and pi.started_on <= s.contact_date - interval '6 months')),
      ('IMP-0', s.round = 'twelve_month'::followup_round_t
                and s.q37_still_engaged is not null)
    ) as c(code, applies)
   where s.person_id = p_person_id
     and s.deleted_at is null
     and s.status = any (array['submitted'::record_status_t, 'approved'::record_status_t])
     and c.applies
   group by c.code, rp.code
),
singles as (
  select * from a13 union all select * from b12
  union all select * from d01 union all select * from e02
)
select s.code, rp.code, 1, false
  from singles s
  join reporting_period rp on s.on_date between rp.start_date and rp.end_date
 where s.on_date is not null
union all
select code, period_code, delta, false from c12
union all
select code, period_code, delta, false from c13
union all
select code, period_code, null::int, true from pct
order by 1, 2;
$function$;

comment on function public.person_restore_impact(uuid) is
  'Which indicator figures move, and in which reporting periods, if this '
  'soft-deleted person is restored. Re-runs each view''s own dating rule with '
  'the person filter removed -- so the period is the one the FIRST qualifying '
  'record falls in, which may be long before today. Percentages return '
  'recomputed = true and no delta, because restoring a respondent changes both '
  'halves of the ratio. See 0107.';

create or replace function public.partner_restore_impact(p_partner_id uuid)
returns table(
  code        text,
  period_code text,
  delta       integer,
  recomputed  boolean
)
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $function$
with
-- A1.2 and C1.1 count PARTNERSHIP rows, dated on established_on, and one
-- organisation may hold both kinds -- which is the whole reason the partner
-- module was merged. Both are reported, per period.
ships as (
  select case pa.partnership_type
           when 'training'::partnership_type_t then 'A1.2'
           else 'C1.1'
         end as code,
         rp.code as period_code,
         count(*)::int as delta
    from partnership pa
    join reporting_period rp on pa.established_on between rp.start_date and rp.end_date
   where pa.partner_id = p_partner_id
     and pa.deleted_at is null
     and pa.is_active
   group by 1, 2
),
-- G0.4 counts DISTINCT PARTNERS, so this partner adds at most one per period
-- however many contributions they made in it. That is the trap the indicator
-- doc names, and getting it wrong here would overstate the restore.
g04 as (
  select 'G0.4'::text as code, rp.code as period_code, 1 as delta
    from partner_contribution pc
    join partnership pa on pa.id = pc.partnership_id and pa.deleted_at is null
    join reporting_period rp on pc.contributed_on between rp.start_date and rp.end_date
   where pa.partner_id = p_partner_id
     and pc.deleted_at is null
   group by rp.code
)
select code, period_code, delta, false from ships
union all
select code, period_code, delta, false from g04
order by 1, 2;
$function$;

comment on function public.partner_restore_impact(uuid) is
  'Which indicator figures move, and in which reporting periods, if this '
  'soft-deleted partner is restored. G0.4 counts DISTINCT PARTNERS, so it '
  'contributes at most 1 per period no matter how many contributions fall in '
  'it. See 0107.';

-- ── the restore itself ──────────────────────────────────────────────────────

create or replace function public.restore_person(p_person_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row person%rowtype;
  v_n   int;
begin
  select * into v_row from person where id = p_person_id;
  if not found then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;
  if v_row.deleted_at is null then
    return jsonb_build_object('ok', false, 'result', 'not_deleted');
  end if;

  update person set deleted_at = null where id = p_person_id;

  -- Count what came back. RLS does not raise on an update it will not permit,
  -- it filters the row -- so a zero here is "you are not allowed", reported as
  -- such rather than as a cheerful success. `guard_soft_delete` raises for a
  -- non-coordinator before this is reached, and this catches the case where
  -- the row was filtered out by person_update instead.
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'restore affected no row for person %', p_person_id
      using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'ok', true, 'result', 'restored',
    'person_id', p_person_id,
    'national_id', v_row.national_id,
    'full_name', v_row.full_name);
end;
$function$;

comment on function public.restore_person(uuid) is
  'Bring a soft-deleted person back, with everything attached to them. '
  'Coordinator only -- guard_soft_delete enforces that on the column, in both '
  'directions. Call person_restore_impact first and show it: the figures this '
  'moves may belong to a quarter already reported. See 0107.';

create or replace function public.restore_partner(p_partner_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_row partner%rowtype;
  v_n   int;
begin
  select * into v_row from partner where id = p_partner_id;
  if not found then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;
  if v_row.deleted_at is null then
    return jsonb_build_object('ok', false, 'result', 'not_deleted');
  end if;

  update partner set deleted_at = null where id = p_partner_id;
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'restore affected no row for partner %', p_partner_id
      using errcode = 'insufficient_privilege';
  end if;

  -- The partnerships hanging off a partner carry their own deleted_at, and
  -- soft-deleting the partner did NOT set theirs -- the indicator views
  -- exclude them through the join to partner instead. So they come back with
  -- the partner and nothing else has to be touched. Deliberately not
  -- cascading: a partnership that was separately deleted stays deleted, which
  -- is the only reading that does not resurrect a decision somebody made.
  return jsonb_build_object(
    'ok', true, 'result', 'restored',
    'partner_id', p_partner_id,
    'name', v_row.name,
    'unit', v_row.unit);
end;
$function$;

comment on function public.restore_partner(uuid) is
  'Bring a soft-deleted partner back. Partnerships that were not separately '
  'deleted come back with it; ones that were stay deleted. Coordinator only. '
  'See 0107.';

-- ── grants ─────────────────────────────────────────────────────────────────
-- `authenticated` is the only role the application ever uses. The four reads
-- are SECURITY INVOKER over is_staff() tables, and both writes are gated by
-- guard_soft_delete, so the grant is not the boundary -- but without it the
-- coordinator cannot call them at all, which is the shape that stopped
-- save_followup_section_c working for everyone except the owner.

revoke all on function public.person_restore_candidate(text) from public, anon;
revoke all on function public.partner_restore_candidate(text, text) from public, anon;
revoke all on function public.person_restore_impact(uuid) from public, anon;
revoke all on function public.partner_restore_impact(uuid) from public, anon;
revoke all on function public.restore_person(uuid) from public, anon;
revoke all on function public.restore_partner(uuid) from public, anon;

grant execute on function public.person_restore_candidate(text) to authenticated;
grant execute on function public.partner_restore_candidate(text, text) to authenticated;
grant execute on function public.person_restore_impact(uuid) to authenticated;
grant execute on function public.partner_restore_impact(uuid) to authenticated;
grant execute on function public.restore_person(uuid) to authenticated;
grant execute on function public.restore_partner(uuid) to authenticated;
