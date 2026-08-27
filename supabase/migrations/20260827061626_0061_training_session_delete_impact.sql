-- ═══════════════════════════════════════════════════════════════════════════
--  0061 — say what deleting a session would cost, before it is deleted (OQ-23)
--
--  check_advisory_eligibility requires training_session.deleted_at is null, so
--  soft-deleting a session silently removes advisory eligibility from everyone
--  who completed it. The deletion looks like housekeeping; the consequence
--  lands weeks later when somebody is refused with no visible connection.
--
--  ── WARN, DO NOT PREVENT ──
--
--  Refusing to delete a session that has completions leaves a coordinator with
--  a genuine mess and no way out: duplicated sessions with enrolments on both
--  is a real situation and this system has no merge. So the consequence is
--  stated, the decision stays with the human, and the audit trigger records who
--  made it.
--
--  ── THE NUMBER THAT MATTERS ──
--
--  Not "how many completed this session" -- someone with another completed
--  training keeps their eligibility and loses nothing. The figure to put in
--  front of a coordinator is how many people would be left with NO completed
--  training at all. That is the number that closes a door.
--
--  security invoker (the default), so RLS applies and this cannot become a way
--  to count participants without permission to read them.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.training_session_delete_impact(p_session_id uuid)
returns table (
  live_enrolments        int,
  completions            int,
  /** People who would be left with no completed training anywhere. */
  eligibility_lost       int,
  /** Of those, how many already hold an advisory place they would keep. */
  keep_existing_advisory int
)
language sql
stable
set search_path = public
as $$
with completed_here as (
  select distinct te.person_id
    from training_enrolment te
    join person p on p.id = te.person_id and p.deleted_at is null
   where te.session_id = p_session_id
     and te.met_criteria is true
     and te.deleted_at is null
),
would_lose as (
  select c.person_id
    from completed_here c
   where not exists (
     select 1
       from training_enrolment te2
       join training_session ts2 on ts2.id = te2.session_id and ts2.deleted_at is null
      where te2.person_id = c.person_id
        and te2.session_id <> p_session_id
        and te2.met_criteria is true
        and te2.deleted_at is null
   )
)
select
  (select count(*)::int from training_enrolment
    where session_id = p_session_id and deleted_at is null),
  (select count(*)::int from completed_here),
  (select count(*)::int from would_lose),
  (select count(distinct ae.person_id)::int
     from advisory_enrolment ae
     join would_lose w on w.person_id = ae.person_id
    where ae.deleted_at is null);
$$;

comment on function public.training_session_delete_impact(uuid) is
  'What soft-deleting this training session would cost. eligibility_lost is the '
  'number to show a coordinator: people who would be left with NO completed '
  'training and therefore lose advisory eligibility. Warn, do not prevent -- '
  'see 06_OPEN_QUESTIONS.md OQ-23. security invoker, so RLS applies.';

revoke all on function public.training_session_delete_impact(uuid) from public, anon;
grant execute on function public.training_session_delete_impact(uuid) to authenticated;
