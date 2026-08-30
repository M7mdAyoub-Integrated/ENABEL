-- ═══════════════════════════════════════════════════════════════════════════
--  0086 — one definition of "markets attended"
--
--  ── WHY THIS EXISTS BEFORE SECTION C DOES ──
--
--  Q30 asks how many municipal markets the respondent has taken part in. It is
--  prefilled rather than asked, and the enumerator may override it -- that is
--  what q30_is_overridden records.
--
--  An override is only meaningful against a number. `save_followup_section_c`
--  has to know what the Municipality counted in order to say whether what the
--  enumerator typed differs from it, and it cannot take that figure from the
--  browser: a tab left open while a registration is approved would report an
--  override that never happened, or miss one that did.
--
--  So it has to count. And `followup_prefill_for_staff` already counts, with a
--  five-line expression carrying three separate rules:
--
--      distinct exhibition_id      one market attended twice is one market
--      exhibition not deleted      a withdrawn market is not attendance
--      status = 'approved'         the same rule E0.2 counts by
--
--  Two copies of that will disagree eventually, and the failure is the worst
--  shape available: the prefill shows 3, the save compares against 2, and
--  q30_is_overridden goes true for an enumerator who changed nothing. A boolean
--  nobody looks at, wrong, in a field the donor report reads as "the count was
--  disputed". Exactly the by-product-value problem CLAUDE.md names.
--
--  One function, called twice. The prefill is rewired to it in the same
--  migration so there is never a moment where two copies exist.
--
--  ── ON REPLACING followup_prefill_for_staff ──
--
--      grep -l "function public.followup_prefill_for_staff" supabase/migrations/*.sql
--
--  0074, and only 0074. Checked before rewriting, because 0082 reverted 0080's
--  read-back guard by rebuilding a function from an older copy and nothing
--  noticed. The body below is 0074's, unchanged except that the counting
--  expression is now a call.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.count_markets_attended(p_person_id uuid)
returns int
language sql
stable
security definer
set search_path to 'public'
as $function$
  -- Distinct exhibitions, approved only, live market and live registration.
  -- The same rule E0.2 counts by, so a prefilled Q30 and the indicator cannot
  -- disagree about what "participated" means.
  select count(distinct er.exhibition_id)::int
    from exhibition_registration er
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.person_id = p_person_id
     and er.deleted_at is null
     and er.status = 'approved'::record_status_t;
$function$;

comment on function public.count_markets_attended(uuid) is
  'Markets a person has taken part in: distinct approved registrations against '
  'live exhibitions. The single definition, called by '
  'followup_prefill_for_staff to fill Q30 and by save_followup_section_c to '
  'decide whether the enumerator overrode it. Two copies of this rule would '
  'set q30_is_overridden for someone who changed nothing.';

revoke all on function public.count_markets_attended(uuid) from public, anon, authenticated;

create or replace function public.followup_prefill_for_staff(p_national_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id     text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person person%rowtype;
  v_trainings jsonb;
  v_events    int;
begin
  -- The same two roles fu_read admits. Not is_staff(): data_entry can read
  -- neither the survey nor any reason to need this.
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator') then
    raise exception 'only a coordinator or an enumerator may prefill a follow-up'
      using errcode = 'insufficient_privilege';
  end if;

  if v_id !~ '^\d{9}$' then
    return jsonb_build_object('found', false, 'reason', 'bad_national_id');
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;
  if not found then
    return jsonb_build_object('found', false, 'reason', 'person_not_found');
  end if;

  -- Q6: read-only, inherited from the training registration.
  select coalesce(jsonb_agg(jsonb_build_object(
           'title', ts.title,
           'on',    ts.start_date,
           'completed', te.met_criteria
         ) order by ts.start_date desc), '[]'::jsonb)
    into v_trainings
    from training_enrolment te
    join training_session ts on ts.id = te.session_id and ts.deleted_at is null
   where te.person_id = v_person.id and te.deleted_at is null;

  -- Q30. The counting rule moved to count_markets_attended in 0086 so that
  -- this and save_followup_section_c cannot drift apart.
  v_events := count_markets_attended(v_person.id);

  return jsonb_build_object(
    'found', true,
    'full_name', v_person.full_name,
    'village',   v_person.village,
    -- Q5: derived, not asked. Each key is one of the six options in the sheet.
    -- `referral` is NULL rather than false on purpose: there is no table
    -- recording referrals (OQ-10), so we do not know. Returning false would
    -- claim we had checked and found none, and the enumerator would tick past
    -- it. Null means the screen must say "not recorded anywhere yet".
    'support', jsonb_build_object(
      'training',   exists (select 1 from training_enrolment te
                             where te.person_id = v_person.id and te.deleted_at is null
                               and te.met_criteria is true),
      'guidance',   exists (select 1 from guidance_record gr
                             where gr.person_id = v_person.id and gr.deleted_at is null),
      'production', exists (select 1 from production_initiative pi
                             where pi.person_id = v_person.id and pi.deleted_at is null),
      'exhibition', v_events > 0,
      'office',     exists (select 1 from office_service os
                             where os.person_id = v_person.id and os.deleted_at is null),
      'referral',   null
    ),
    'trainings', v_trainings,
    'events_attended', v_events
  );
end;
$function$;

comment on function public.followup_prefill_for_staff(text) is
  'Q5, Q6 and Q30 derived from the person''s own records, for the follow-up '
  'survey. Gated on coordinator or enumerator -- the two roles fu_read admits '
  '-- rather than on the public national-ID-plus-date-of-birth check, which '
  'exists to stop an anonymous endpoint confirming an ID is registered and '
  'protects nothing against staff who can already read person. Q30''s count '
  'moved to count_markets_attended in 0086.';

revoke all on function public.followup_prefill_for_staff(text) from public, anon;
grant execute on function public.followup_prefill_for_staff(text) to authenticated;
