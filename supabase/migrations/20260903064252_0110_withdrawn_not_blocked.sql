-- ═══════════════════════════════════════════════════════════════════════════
--  0110 — withdrawal is not a ban, and until now nothing said so
--
--  ── THE RULE THIS SERVES ──
--
--  OQ-24 settled it and `0059` built it: an entity with history hanging off it
--  is RESTORED, never recreated; an event someone took part in can be
--  RE-ENTERED. So `person.national_id` and `partner (name, unit)` stay globally
--  unique and get a restore path (`0107`, `0108`), while five event-shaped
--  indexes were made partial:
--
--      advisory_enrolment_person_session_live         (person_id, session_id)
--      exhibition_registration_exhibition_person_live (exhibition_id, person_id)
--      followup_survey_person_round_live              (person_id, round)
--      training_enrolment_person_session_live         (person_id, session_id)
--      partnership_partner_type_live                  (partner_id, partnership_type)
--
--  That is correct and stays. **Withdrawal is not a ban.**
--
--  ── WHAT WAS MISSING ──
--
--  The re-entry now succeeds, and succeeds SILENTLY. A coordinator re-enrolling
--  someone who was withdrawn from that course last month gets the same screen,
--  the same toast and the same silence as a first enrolment. Nothing tells them
--  a predecessor existed, when it was withdrawn, or by whom.
--
--  That is the mirror of the defect `0107` fixed. There a global key refused
--  and offered no way forward, so the rule looked like a bug. Here a partial
--  key permits and says nothing, so a deliberate decision — that this pair may
--  happen again — looks like the system having forgotten. Both leave the person
--  in front of the screen without the fact they need.
--
--  It also matters for a reason beyond tidiness. Someone re-entering a
--  withdrawn record is often doing it BECAUSE they do not know it was
--  withdrawn: the withdrawal is exactly the thing they would want to ask about
--  before creating a second one. Staff withdrew that enrolment for a reason,
--  and the reason is not on this screen.
--
--  ── WHY A SEPARATE LOOKUP AND NOT A CHANGE TO THE WRITE PATHS ──
--
--  The obvious implementation is to make each create function report it. That
--  means `create or replace` on `start_followup` and on `apply_for_opportunity`
--  — the second of which is a security definer standing between `anon` and a
--  table of national IDs, and carries exactly the `0082` reversion risk
--  CLAUDE.md names. OQ-41 already judged that class of change too large to make
--  as a side effect of an audit pass, and this is smaller than OQ-41's case.
--
--  So this is shaped like `person_restore_candidate`: a read-only lookup on the
--  same key, called beside the write rather than inside it. No existing
--  function is rewritten by this migration.
--
--  ── SECURITY ──
--
--  `security invoker`, so RLS decides whether the caller may see the withdrawn
--  row at all. A `participant` or `partner_viewer` who cannot read
--  `training_enrolment` gets nothing back, which is the same answer they get
--  from the table. The actor's NAME comes from `actor_display_name` (`0108`), a
--  definer that resolves one uuid and cannot enumerate — see that migration for
--  why exposing a staff display name is not a leak.
--
--  This is `05_ROLES_AND_RLS.md` §14's shape: an invoker calling a definer. The
--  caller therefore needs EXECUTE on `actor_display_name`, and has it —
--  `0108` granted it to `authenticated`. Verified by running this function as
--  all five roles, not as the owner, which is the mistake `0108` exists to fix.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.withdrawn_predecessor(
  p_kind text,
  p_a    uuid,
  p_b    text
)
returns table (
  withdrawn_at   timestamptz,
  withdrawn_by   text,
  how_many       int
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_id   uuid;
  v_at   timestamptz;
  v_n    int := 0;
begin
  -- One branch per partial index above. The pair of keys is spelled out rather
  -- than derived, because deriving it from pg_index at runtime would be clever
  -- and unreadable; the verification block at the foot of this migration is
  -- what stops the two drifting apart.
  --
  -- IF/ELSIF rather than a UNION ALL over all five, deliberately. `p_b` is a
  -- uuid for three of these kinds and an ENUM LABEL for the other two
  -- ('six_month', 'training'). In a UNION the planner cannot prove the
  -- non-matching branches unreachable -- `p_kind` is a parameter, not a
  -- constant -- so `p_b::uuid` can be evaluated on a branch that was never
  -- meant to run, and a Section C lookup dies with 22P02 invalid input syntax
  -- for type uuid. Only the matching query is built here, so the cast only
  -- happens where p_b really is a uuid.
  --
  -- `deleted_at` is the withdrawal time. audit_log is asked for the ACTOR: the
  -- row records when it was withdrawn, never by whom. `audit_row` writes
  -- action 'delete' for a soft delete, and the LATEST one wins, because a pair
  -- may have been withdrawn, restored and withdrawn again.
  if p_kind = 'training_enrolment' then
    select count(*)::int into v_n from training_enrolment t
     where t.person_id = p_a and t.session_id = p_b::uuid and t.deleted_at is not null;
    select t.id, t.deleted_at into v_id, v_at from training_enrolment t
     where t.person_id = p_a and t.session_id = p_b::uuid and t.deleted_at is not null
     order by t.deleted_at desc limit 1;

  elsif p_kind = 'advisory_enrolment' then
    select count(*)::int into v_n from advisory_enrolment a
     where a.person_id = p_a and a.session_id = p_b::uuid and a.deleted_at is not null;
    select a.id, a.deleted_at into v_id, v_at from advisory_enrolment a
     where a.person_id = p_a and a.session_id = p_b::uuid and a.deleted_at is not null
     order by a.deleted_at desc limit 1;

  elsif p_kind = 'exhibition_registration' then
    select count(*)::int into v_n from exhibition_registration e
     where e.exhibition_id = p_a and e.person_id = p_b::uuid and e.deleted_at is not null;
    select e.id, e.deleted_at into v_id, v_at from exhibition_registration e
     where e.exhibition_id = p_a and e.person_id = p_b::uuid and e.deleted_at is not null
     order by e.deleted_at desc limit 1;

  elsif p_kind = 'followup_survey' then
    select count(*)::int into v_n from followup_survey f
     where f.person_id = p_a and f.round::text = p_b and f.deleted_at is not null;
    select f.id, f.deleted_at into v_id, v_at from followup_survey f
     where f.person_id = p_a and f.round::text = p_b and f.deleted_at is not null
     order by f.deleted_at desc limit 1;

  elsif p_kind = 'partnership' then
    select count(*)::int into v_n from partnership s
     where s.partner_id = p_a and s.partnership_type::text = p_b and s.deleted_at is not null;
    select s.id, s.deleted_at into v_id, v_at from partnership s
     where s.partner_id = p_a and s.partnership_type::text = p_b and s.deleted_at is not null
     order by s.deleted_at desc limit 1;

  else
    -- An unknown kind is a caller bug, not "no predecessor". Returning no rows
    -- would be indistinguishable from a clean key and would hide a typo
    -- forever -- the exact shape this project keeps finding.
    raise exception 'withdrawn_predecessor: unknown kind %', p_kind
      using errcode = 'invalid_parameter_value',
            hint = 'One of training_enrolment, advisory_enrolment, '
                   'exhibition_registration, followup_survey, partnership.';
  end if;

  if v_id is null then
    return;   -- no predecessor: zero rows, which is the honest answer
  end if;

  return query
  select v_at,
         public.actor_display_name(
           (select a.actor from audit_log a
             where a.table_name = p_kind and a.row_id = v_id and a.action = 'delete'
             order by a.created_at desc limit 1)),
         v_n;
end $$;

revoke all on function public.withdrawn_predecessor(text, uuid, text) from public, anon;
grant execute on function public.withdrawn_predecessor(text, uuid, text) to authenticated;

comment on function public.withdrawn_predecessor(text, uuid, text) is
  'Was this event-shaped pair withdrawn before? Returns when and by whom, or no '
  'rows. security invoker: RLS decides who may see it. Companion to '
  'person_restore_candidate -- that one is for keys that REFUSE, this one for '
  'keys that PERMIT and would otherwise say nothing. See 0110.';

-- ── verification ───────────────────────────────────────────────────────────
--
-- The five branches above name a table and two columns each. If an index is
-- ever changed, a branch becomes a lookup on the wrong key -- and it would
-- still compile, still run, and silently return no rows, which reads exactly
-- like "there was no predecessor". That is the failure this project keeps
-- finding, so the assumption is asserted rather than commented.

do $verify$
declare
  v_want constant text[] := array[
    'advisory_enrolment_person_session_live',
    'exhibition_registration_exhibition_person_live',
    'followup_survey_person_round_live',
    'partnership_partner_type_live',
    'training_enrolment_person_session_live'
  ];
  v_missing text[];
  v_notpartial text[];
begin
  select array_agg(w order by w) into v_missing
    from unnest(v_want) w
   where not exists (
     select 1 from pg_class i join pg_namespace n on n.oid = i.relnamespace
      where n.nspname = 'public' and i.relname = w);
  if v_missing is not null then
    raise exception '0110: withdrawn_predecessor assumes indexes that do not exist: %', v_missing;
  end if;

  -- and each must still EXCLUDE soft-deleted rows -- if one became global, the
  -- pair could no longer be re-created and this whole function is answering a
  -- question nobody can now ask.
  select array_agg(i.relname order by i.relname) into v_notpartial
    from pg_class i join pg_namespace n on n.oid = i.relnamespace
   where n.nspname = 'public' and i.relname = any (v_want)
     and pg_get_indexdef(i.oid) !~* 'where \(deleted_at is null\)';
  if v_notpartial is not null then
    raise exception '0110: these are no longer partial, so re-entry is blocked: %', v_notpartial;
  end if;
end $verify$;
