-- ═══════════════════════════════════════════════════════════════════════════
--  0074 — starting a follow-up survey, and prefilling what we already know
--
--  ── HOW A PART-FINISHED SURVEY SURVIVES ──
--
--  This is decided here, before the second section is built, because
--  retrofitting it would mean touching all six.
--
--  The survey row is created at the END OF SECTION 0, as `status = 'draft'`.
--  Every later section UPDATEs that row and upserts its children. So an
--  enumerator who loses signal has lost the current section's typing, not the
--  interview: everything answered up to the last section boundary is already in
--  the database.
--
--  The alternative -- hold 43 answers in memory and write once at the end --
--  loses the whole interview to one dropped connection, in a field, with the
--  farmer already gone. That is not acceptable for a form this long.
--
--  A draft is safe to leave lying around because 0072 made the four indicator
--  views require `status in ('submitted','approved')`. Before 0072 this design
--  would have been dangerous: a half-finished survey would have moved A1.
--
--  ── AND WHY THE DUPLICATE CHECK HAPPENS HERE, NOT AT SUBMIT ──
--
--  `followup_survey_person_round_live` is unique on (person_id, round) where
--  deleted_at is null. Creating the row in section 0 means that constraint is
--  hit BEFORE the enumerator asks 43 questions rather than after. Discovering a
--  duplicate at the end of an interview wastes the interview and the farmer's
--  afternoon.
--
--  The refusal names the round that already exists, and says whether it is a
--  draft the enumerator can resume or a finished survey they cannot.
--
--  ── client_uuid ──
--
--  Globally unique, deliberately (0059 left it that way): a resync must not be
--  able to resurrect a survey the Municipality withdrew. It makes the section-0
--  insert idempotent -- the same attempt resent after a dropped response
--  returns the existing survey instead of failing on the person/round key.
--
--  ── WHY THE PREFILL IS STAFF-GATED, NOT IDENTITY-GATED ──
--
--  `followup_prefill(p_national_id)` exists from an earlier migration and is
--  executable by nobody. It is LEFT THAT WAY and is not re-granted.
--
--  The national-ID-plus-date-of-birth check on the public functions exists to
--  stop an ANONYMOUS endpoint answering "is this national ID registered?".
--  That protection buys nothing here: an enumerator can already select from
--  `person` under fu_read. Making them produce a date of birth they do not have
--  -- mid-interview, on a phone, in a field -- would block the work without
--  protecting anything.
--
--  So this variant is gated on the role instead, and on the same two roles that
--  can open the survey at all: coordinator and enumerator. `data_entry` has no
--  reason to look up someone's support history.
-- ═══════════════════════════════════════════════════════════════════════════

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

  -- Q30: markets participated in. Distinct exhibitions, approved only -- the
  -- same rule E0.2 counts by, so the prefilled number and the indicator cannot
  -- disagree about what "participated" means.
  select count(distinct er.exhibition_id) into v_events
    from exhibition_registration er
    join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
   where er.person_id = v_person.id
     and er.deleted_at is null
     and er.status = 'approved'::record_status_t;

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
  'buys nothing from a caller who can already read `person`. support.referral '
  'is null, not false: no table records referrals (OQ-10).';

revoke all on function public.followup_prefill_for_staff(text) from public, anon;
grant execute on function public.followup_prefill_for_staff(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.start_followup(
  p_national_id    text,
  p_round          followup_round_t,
  p_contact_date   date,
  p_contact_mode   contact_mode_t,
  p_enumerator_name text,
  p_respondent     respondent_t,
  p_client_uuid    uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person  person%rowtype;
  v_existing followup_survey%rowtype;
  v_new_id  uuid;
begin
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator') then
    raise exception 'only a coordinator or an enumerator may start a follow-up'
      using errcode = 'insufficient_privilege';
  end if;

  if v_id !~ '^\d{9}$' then
    return jsonb_build_object('ok', false, 'result', 'bad_national_id');
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'result', 'person_not_found');
  end if;

  if coalesce(btrim(p_enumerator_name), '') = '' then
    return jsonb_build_object('ok', false, 'result', 'enumerator_required');
  end if;

  -- The same attempt arriving twice must not fail on the person/round key.
  if p_client_uuid is not null then
    select * into v_existing from followup_survey
     where client_uuid = p_client_uuid and deleted_at is null;
    if found then
      return jsonb_build_object('ok', true, 'result', 'resumed',
                                'survey_id', v_existing.id,
                                'status', v_existing.status);
    end if;
  end if;

  -- One survey per person per round. Look BEFORE inserting so the answer can
  -- name the round and say whether it can be resumed -- an enumerator standing
  -- in a field needs to know which of those it is.
  select * into v_existing from followup_survey
   where person_id = v_person.id and round = p_round and deleted_at is null;

  if found then
    if v_existing.status = 'draft'::record_status_t then
      return jsonb_build_object('ok', true, 'result', 'resumed',
                                'survey_id', v_existing.id,
                                'status', v_existing.status);
    end if;
    return jsonb_build_object('ok', false, 'result', 'already_exists',
                              'round', p_round::text,
                              'status', v_existing.status::text,
                              'contact_date', v_existing.contact_date);
  end if;

  insert into followup_survey
    (person_id, round, contact_date, contact_mode, enumerator_name, respondent,
     status, client_uuid)
  values (v_person.id, p_round, p_contact_date, p_contact_mode,
          btrim(p_enumerator_name), p_respondent,
          'draft'::record_status_t, p_client_uuid)
  returning id into v_new_id;

  return jsonb_build_object('ok', true, 'result', 'started',
                            'survey_id', v_new_id, 'status', 'draft');
exception
  when unique_violation then
    -- LOOK, do not infer. Two enumerators can reach the check above at the
    -- same moment; whichever loses the race lands here.
    select * into v_existing from followup_survey
     where person_id = v_person.id and round = p_round and deleted_at is null;
    if found and v_existing.status = 'draft'::record_status_t then
      return jsonb_build_object('ok', true, 'result', 'resumed',
                                'survey_id', v_existing.id,
                                'status', v_existing.status);
    elsif found then
      return jsonb_build_object('ok', false, 'result', 'already_exists',
                                'round', p_round::text,
                                'status', v_existing.status::text,
                                'contact_date', v_existing.contact_date);
    end if;
    return jsonb_build_object('ok', false, 'result', 'withdrawn');
end;
$function$;

comment on function public.start_followup(text, followup_round_t, date, contact_mode_t, text, respondent_t, uuid) is
  'Creates the follow-up survey as a DRAFT at the end of section 0, so later '
  'sections update a row that already exists and a lost connection costs one '
  'section rather than the interview. Drafts are safe to leave because 0072 '
  'made the four survey views require submitted or approved. The '
  '(person_id, round) refusal happens here rather than at submit, so a '
  'duplicate is found before 43 questions are asked, and it names the round.';

revoke all on function public.start_followup(text, followup_round_t, date, contact_mode_t, text, respondent_t, uuid) from public, anon;
grant execute on function public.start_followup(text, followup_round_t, date, contact_mode_t, text, respondent_t, uuid) to authenticated;
