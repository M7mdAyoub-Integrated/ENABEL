-- ═══════════════════════════════════════════════════════════════════════════
--  0089 — save_followup_section_c could not call the function it depends on
--
--  ── THE DEFECT ──
--
--  `save_followup_section_c` is SECURITY INVOKER, deliberately: sections A, B
--  and C all rely on RLS applying the UPDATE policy to their locking read, and
--  that read IS the permission check. Making any of them a definer would let
--  any authenticated user write any survey.
--
--  `count_markets_attended` is SECURITY DEFINER, also deliberately: it reads
--  every exhibition registration for a person, so 0086 revoked EXECUTE from
--  public, anon and authenticated to stop any logged-in account asking how many
--  markets any named person attended.
--
--  Both decisions are right and together they do not work. PostgreSQL checks
--  EXECUTE on a nested call against the INVOKER of an invoker-security caller,
--  so an enumerator calling `save_followup_section_c` reached:
--
--      ERROR: 42501: permission denied for function count_markets_attended
--      CONTEXT: PL/pgSQL function save_followup_section_c(...) line 35
--
--  `authenticated` is the only role the application ever uses. Section C could
--  not be saved by anybody. `followup_prefill_for_staff` was unaffected because
--  it is a definer and its nested call is checked against its owner, which is
--  why Q30 prefilled correctly on screen while saving it was impossible.
--
--  ── WHY NOT JUST GRANT IT ──
--
--  A bare `grant execute ... to authenticated` would reopen exactly what 0086
--  closed: the function is a definer, so RLS on exhibition_registration does not
--  apply inside it, and any participant or partner_viewer account could call it
--  with any person_id and get a count back.
--
--  So the grant comes with the gate that makes it safe, which is the one
--  `followup_prefill_for_staff` already carries verbatim: coordinator or
--  enumerator, the two roles `fu_read` admits. Nobody else has any reason to
--  ask this question, and the two callers are both already inside that set --
--  the prefill checks it before calling, and the save is reached only through
--  RLS policies that admit the same two roles.
--
--  ── ON REPLACING count_markets_attended ──
--
--      grep -l "function public.count_markets_attended" supabase/migrations/*.sql
--
--  0086, and only 0086. Checked before rewriting. The counting expression below
--  is 0086's, character for character; the language changes from `sql` to
--  `plpgsql` only because a gate needs a statement before the select.
--
--  ── HOW THIS GOT PAST EVERYTHING ──
--
--  The file existed, the function existed, the signature was right,
--  check_migration_files.sh passed, `tsc` and `eslint` passed, and the four
--  option lists were seeded. Every check pointed at what 0088 added.
--
--  None of them ran the function as the role that would actually run it. The
--  privilege check does not fire for the owner, and the owner is who tests it
--  when a query is pasted into an editor. It fires for `authenticated`, once, in
--  a field, at the end of an interview.
--
--      Verifying a SECURITY INVOKER function as the table owner proves nothing
--      about whether anyone else can run it. Set the role and set the claims.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.count_markets_attended(p_person_id uuid)
returns int
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_count int;
begin
  -- The same two roles fu_read admits, and the same gate
  -- followup_prefill_for_staff carries. This function is a definer over every
  -- registration in the table, so without this the grant below would let any
  -- logged-in account count markets for any person by id.
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator') then
    raise exception 'only a coordinator or an enumerator may count markets attended'
      using errcode = 'insufficient_privilege';
  end if;

  -- Distinct exhibitions, approved only, live market and live registration.
  -- The same rule E0.2 counts by, so a prefilled Q30 and the indicator cannot
  -- disagree about what "participated" means.
  select count(distinct er.exhibition_id)::int
    into v_count
    from exhibition_registration er
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.person_id = p_person_id
     and er.deleted_at is null
     and er.status = 'approved'::record_status_t;

  return v_count;
end;
$function$;

comment on function public.count_markets_attended(uuid) is
  'Markets a person has taken part in: distinct approved registrations against '
  'live exhibitions. The single definition, called by '
  'followup_prefill_for_staff to fill Q30 and by save_followup_section_c to '
  'decide whether the enumerator overrode it. Two copies of this rule would '
  'set q30_is_overridden for someone who changed nothing. Gated on coordinator '
  'or enumerator because it is a definer and 0089 had to grant EXECUTE to '
  'authenticated -- save_followup_section_c is an invoker and could not '
  'otherwise call it at all.';

revoke all on function public.count_markets_attended(uuid) from public, anon;
grant execute on function public.count_markets_attended(uuid) to authenticated;
