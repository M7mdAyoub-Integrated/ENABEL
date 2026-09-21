-- ═══════════════════════════════════════════════════════════════════════════
--  0148 — save_khld_record: one save function for the 24 Khalidiyah tables
--
--  Every Khalidiyah form saves through this function, the shape of
--  save_rmth_record (0127): the table name and one jsonb payload, and inside
--  ONE exception block that covers every delete (CLAUDE.md, the seventh and
--  eighth rows of the register):
--
--    1. the spine        `person` -> khld_ensure_person (0144): found by the
--                        identifier the form CHOSE (national ID or UNHCR
--                        number), identity locked, a soft-deleted person
--                        refused with the restore path; then the ENTITY the
--                        person keys -- a volunteer's person_id, a vendor
--                        (khld_ensure_vendor), an enterprise and its owner
--                        (khld_ensure_enterprise) -- and `partner`, found by
--                        name or created (khld_ensure_partner). Plan 5.1:
--                        three forms collect an identifier, two key on an
--                        organisation, three link to an entity on file
--    2. the header       insert, or update by id -- only the columns the
--                        payload names are written, so the defaults
--                        (municipality_id above all) and the triggers
--                        (references, stamps, derivations, the sheets'
--                        conditional rules) do their work; an update that
--                        reaches no row answers not_found
--    3. the children     the option junctions, the "by ..." count cells, a
--                        milestone's checklist rows and SO2-0's facility
--                        ratings: delete then insert, with a read-back that
--                        raises insufficient_privilege when RLS filtered the
--                        delete instead of reporting a save that did not
--                        happen; only when the payload carries the key
--    4. participations   a campaign's, an action day's, an activity's or a
--                        market's volunteers: MERGED by volunteer, never
--                        replaced. A participation is a record SO3-0 counts
--                        (verified, hours), so it is soft-deleted through the
--                        record's own path, not dropped by an untick
--
--  ── THE RULES THE SHEETS STATE BETWEEN FIELDS ──
--
--  Six sheets make one answer depend on another, and the catalogue left
--  those columns nullable so the other case can be saved (IMP-0's "Never
--  skips to Q20", SO3-0's "if inactive or withdrawn"). guard_khld_rules,
--  below, is where each rule lives -- ONE place, as a trigger, so a write
--  that bypasses this function meets the same rule -- and every refusal is
--  named after the sheet's field so the screen can point at it. The one
--  rule a row trigger cannot see (IMP-0 Q13 is a multi-select, a child) is
--  checked here after the children are written, inside the same block.
--
--  ── WHAT THE PAYLOAD MAY NOT WRITE ──
--
--  The database's own columns are refused as unknown, not ignored (0127):
--  id, municipality_id, the standard block, the consent stamps, and the
--  three derived figures (sessions_attended_count, completion,
--  support_types_count -- plan 5.4). `reference` is allowed: a paper form
--  may already carry the number khld_assign_reference then checks.
--
--  ── WHAT IS CAUGHT AND WHAT IS NOT ──
--
--  Constraint and trigger refusals come back as {ok:false, result:'invalid'}
--  with the SQLSTATE, the constraint name where there is one, and the
--  message. Two refusals have their own result because the screen acts on
--  them: the four *_deleted results carry the id to restore, and
--  consent_refused (IMP-0 field 5: "Do not proceed without consent") is a
--  questionnaire that must not become a record. insufficient_privilege is
--  NOT caught: that is RLS or the read-back guard, and turning it into a
--  tidy message is the failure the guard exists to catch.
--
--  Security INVOKER throughout: the caller's RLS decides what it can write.
--
--  ── A PERSON FROM A SHEET THAT RECORDS AN AGE BAND ONLY ──
--
--  Found by this file's probe: SO4-G1 identifies the enterprise owner by
--  national ID or UNHCR number and records their age as one of the seven
--  bands (field 6) -- no date of birth, no age in years, by design (the
--  guidance sheet collects "only where the indicator requires"). person's
--  age_or_dob (0004) refused the owner outright. The invariant is kept in a
--  wider form: a person has a date of birth, or an age, or a RECORDED
--  REASON for having neither -- age_unrecorded_reason, 'khld_band_only',
--  which khld_ensure_person sets when a Khalidiyah form gives no age. A
--  Sahel Horan or Ramtha insert without an age is refused exactly as before
--  (the reason is never set for them), the constraint keeps its name so the
--  app's message for it still applies, and the person row says why the
--  field is empty rather than carrying a guessed number (0063's rule). The
--  seven-band views read the band from the RECORD; khld_age_band(null) is
--  not_recorded. OQ-57.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. person: an age, a date of birth, or the reason there is neither ────

alter table public.person add column age_unrecorded_reason text
  constraint person_age_unrecorded_reason_known check (age_unrecorded_reason in ('khld_band_only'));
alter table public.person drop constraint age_or_dob;
alter table public.person add constraint age_or_dob
  check (date_of_birth is not null or age_recorded is not null or age_unrecorded_reason is not null);

comment on column public.person.age_unrecorded_reason is
  'Why neither date_of_birth nor age_recorded is set: khld_band_only -- the '
  'Khalidiyah sheet that created this person records an age band on the record '
  'and nothing finer (SO4-G1 field 6). Null whenever an age or a date is known. 0148.';

-- khld_ensure_person, from 0144's text (the only migration to have touched
-- it: grep -l "function public.khld_ensure_person" supabase/migrations/*.sql),
-- plus the reason on the insert. Nothing else changes.
create or replace function public.khld_ensure_person(p jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_type  text := p->>'id_type';
  v_raw   text := coalesce(p->>'id_number', '');
  v_nid   text;
  v_unhcr text;
  v_id    uuid;
  v_del   timestamptz;
  v_sex   sex_t := nullif(p->>'sex', '')::sex_t;
  v_phone text := nullif(btrim(coalesce(p->>'phone', '')), '');
  v_name  text := nullif(btrim(coalesce(p->>'full_name', '')), '');
  v_dob   date := nullif(p->>'date_of_birth', '')::date;
  v_age   int  := nullif(p->>'age_years', '')::int;
begin
  -- the type is the form's explicit choice; nothing is inferred from the digits
  if v_type = 'national_id' then
    v_nid := regexp_replace(v_raw, '\D', '', 'g');
    if v_nid !~ '^\d{9}$' then
      raise exception 'A national ID is exactly nine digits' using errcode = 'check_violation';
    end if;
    select id, deleted_at into v_id, v_del from public.person where national_id = v_nid;
  elsif v_type = 'unhcr_number' then
    v_unhcr := nullif(upper(regexp_replace(btrim(v_raw), '\s+', ' ', 'g')), '');
    if v_unhcr is null then
      raise exception 'A UNHCR number is required when the identifier type is UNHCR' using errcode = 'check_violation';
    end if;
    select id, deleted_at into v_id, v_del from public.person where unhcr_number = v_unhcr;
  else
    raise exception 'id_type must be national_id or unhcr_number' using errcode = 'check_violation';
  end if;

  if v_id is not null and v_del is not null then
    -- An entity is RESTORED, never recreated (CLAUDE.md). The screen offers
    -- the restore path; this function only says why it stopped.
    raise exception 'This identifier belongs to a person who was deleted; restore them first'
      using errcode = 'P0KHL', detail = v_id::text;
  end if;

  if v_id is not null then
    -- identity is locked; empties may be filled, nothing is overwritten
    update public.person
       set sex           = coalesce(sex, v_sex),
           phone         = coalesce(phone, v_phone),
           date_of_birth = coalesce(date_of_birth, v_dob),
           age_recorded  = coalesce(age_recorded, v_age)
     where id = v_id
       and ((sex is null and v_sex is not null) or (phone is null and v_phone is not null)
            or (date_of_birth is null and v_dob is not null) or (age_recorded is null and v_age is not null));
    return v_id;
  end if;

  if v_name is null then
    raise exception 'A new person needs a full name' using errcode = 'not_null_violation';
  end if;
  -- a form that records an age band only (SO4-G1) creates a person with
  -- neither a date nor an age, and the row says so rather than guessing
  insert into public.person (national_id, unhcr_number, full_name, phone, sex, date_of_birth, age_recorded, age_unrecorded_reason)
  values (v_nid, v_unhcr, v_name, v_phone, v_sex, v_dob, v_age,
          case when v_dob is null and v_age is null then 'khld_band_only' end)
  returning id into v_id;
  return v_id;
end $$;

-- ── 1. the conditional rules, one trigger, six tables ─────────────────────

create function public.guard_khld_rules()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code    text;
  v_missing text[];
  v_filled  text[];
begin
  if tg_table_name = 'khld_interaction_survey' then
    -- field 5: "Do not proceed without consent" -- a refused interview ends there
    select code into v_code from public.ref_khld_imp0_consent where id = new.consent_id;
    if v_code is distinct from 'yes' then
      raise exception 'IMP-0 field 5: the respondent did not consent, so there is no questionnaire to record'
        using errcode = 'check_violation', constraint = 'khld_imp0_consent_required';
    end if;
    -- field 12: "Respondents answering ''Never'' skip to Q20"; everyone else answers 13-19
    select code into v_code from public.ref_khld_imp0_visit_freq where id = new.visit_freq_id;
    v_missing := array_remove(array[
      case when new.mixed_presence_id is null then 'mixed_presence' end,
      case when new.new_contact_id is null then 'new_contact' end,
      case when new.opportunity_increase_id is null then 'opportunity_increase' end,
      case when new.joint_activity_id is null then 'joint_activity' end,
      case when new.comfort_level_id is null then 'comfort_level' end], null);
    v_filled := array_remove(array[
      case when new.mixed_presence_id is not null then 'mixed_presence' end,
      case when new.new_contact_id is not null then 'new_contact' end,
      case when new.opportunity_increase_id is not null then 'opportunity_increase' end,
      case when new.joint_activity_id is not null then 'joint_activity' end,
      case when new.comfort_level_id is not null then 'comfort_level' end], null);
    if v_code = 'never' then
      if array_length(v_filled, 1) is not null then
        raise exception 'IMP-0 field 12: a respondent who never visited skips questions 13-19, so % must be blank', array_to_string(v_filled, ', ')
          using errcode = 'check_violation', constraint = 'khld_imp0_visit_block_skipped';
      end if;
    elsif array_length(v_missing, 1) is not null then
      raise exception 'IMP-0 questions 13-19 are required unless field 12 is Never; missing: %', array_to_string(v_missing, ', ')
        using errcode = 'check_violation', constraint = 'khld_imp0_visit_block_required';
    end if;

  elsif tg_table_name = 'khld_volunteer_tracking' then
    -- field 15: "If inactive or withdrawn, what is the main reason?"
    select code into v_code from public.ref_khld_so30_status_end_period where id = new.status_end_period_id;
    if v_code ~ '^(inactive|withdrew)' and new.inactive_reason_id is null then
      raise exception 'SO3-0 field 15: an inactive or withdrawn volunteer needs the main reason'
        using errcode = 'check_violation', constraint = 'khld_so30_inactive_reason_required';
    end if;

  elsif tg_table_name = 'khld_attendance' then
    -- field 4: "An undocumented estimate cannot be reported as an attendance figure"
    select code into v_code from public.ref_khld_d2_count_method where id = new.count_method_id;
    if v_code = 'organisers_estimate'
       and (coalesce(btrim(new.estimate_by), '') = '' or coalesce(btrim(new.estimate_basis), '') = '') then
      raise exception 'SO2-D2 field 4: an estimate names who made it and on what basis, or it cannot be reported'
        using errcode = 'check_violation', constraint = 'khld_d2_estimate_basis_required';
    end if;
    -- field 17: "Yes -- number of repeat participants identified: ____"
    select code into v_code from public.ref_khld_d2_duplicate_check where id = new.duplicate_check_id;
    if v_code = 'yes' and new.repeat_participants is null then
      raise exception 'SO2-D2 field 17: a duplicate check that was done states the number of repeat participants identified'
        using errcode = 'check_violation', constraint = 'khld_d2_repeat_participants_required';
    end if;

  elsif tg_table_name = 'khld_vendor_registration' then
    -- field 21: "Yes -- free of charge / No -- fee paid: ____"
    if new.stall_free is false and new.stall_fee_jod is null then
      raise exception 'SO4-H2 field 21: a stall that was not free states the fee paid'
        using errcode = 'check_violation', constraint = 'khld_h2_stall_fee_required';
    end if;

  elsif tg_table_name = 'khld_guidance_completion' then
    -- field 23: "If the cycle was not completed, what was the main reason?"
    -- completion is derived by trg_..._derive, which fires before this (by name)
    select code into v_code from public.ref_khld_g1_non_completion_reason where id = new.non_completion_reason_id;
    if new.completion = 'completed' and v_code <> 'not_applicable_completed' then
      raise exception 'SO4-G1 field 23: the cycle was completed, so the non-completion reason is Not applicable'
        using errcode = 'check_violation', constraint = 'khld_g1_reason_is_not_applicable';
    end if;
    if new.completion = 'not_completed' and v_code = 'not_applicable_completed' then
      raise exception 'SO4-G1 field 23: the cycle was not completed, so a reason is needed'
        using errcode = 'check_violation', constraint = 'khld_g1_reason_required';
    end if;

  elsif tg_table_name = 'khld_action_day' then
    -- field 5: "Linked to: campaign / activity / market -- reference: ____ / stand-alone"
    select code into v_code from public.ref_khld_f3_linked_records where id = new.linked_kind_id;
    if (v_code = 'campaign' and new.campaign_id is null)
       or (v_code = 'activity' and new.activity_id is null)
       or (v_code = 'market' and new.market_id is null) then
      raise exception 'SO3-F3 field 5: the action day is linked to a %, so that record is required', v_code
        using errcode = 'check_violation', constraint = 'khld_f3_linked_record_required';
    end if;
    if (v_code <> 'campaign' and new.campaign_id is not null)
       or (v_code <> 'activity' and new.activity_id is not null)
       or (v_code <> 'market' and new.market_id is not null) then
      raise exception 'SO3-F3 field 5: the action day is % but carries a link of another kind', v_code
        using errcode = 'check_violation', constraint = 'khld_f3_linked_record_mismatch';
    end if;
  end if;
  return new;
end $$;

revoke all on function public.guard_khld_rules() from public, anon, authenticated;

comment on function public.guard_khld_rules() is
  'The rules the Khalidiyah sheets state between two fields, one place: IMP-0 '
  'consent and the Never skip (fields 5, 12), SO3-0 the inactive reason (15), '
  'SO2-D2 the estimate basis and the repeat count (4, 17), SO4-H2 the stall fee '
  '(21), SO4-G1 the non-completion reason against the derived completion (23), '
  'SO3-F3 the linked record (5). Each refusal is a check_violation named '
  'khld_<form>_<rule>. 0148.';

create trigger trg_khld_interaction_survey_rules before insert or update on public.khld_interaction_survey
  for each row execute function public.guard_khld_rules();
create trigger trg_khld_volunteer_tracking_rules before insert or update on public.khld_volunteer_tracking
  for each row execute function public.guard_khld_rules();
create trigger trg_khld_attendance_rules before insert or update on public.khld_attendance
  for each row execute function public.guard_khld_rules();
create trigger trg_khld_vendor_registration_rules before insert or update on public.khld_vendor_registration
  for each row execute function public.guard_khld_rules();
create trigger trg_khld_guidance_completion_rules before insert or update on public.khld_guidance_completion
  for each row execute function public.guard_khld_rules();
create trigger trg_khld_action_day_rules before insert or update on public.khld_action_day
  for each row execute function public.guard_khld_rules();

-- ── 2. the entities a form keys on ────────────────────────────────────────

-- A partner (SO1-0, SO1-A3) is found by name within the municipality, or
-- created. The name is the key (khld_partner_name_key, 0145: global, so a
-- soft-deleted partner is RESTORED, never recreated -- G0.4's lesson in
-- CLAUDE.md, the same figure moving here as SO1-A3's partner count).
create function public.khld_ensure_partner(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id    uuid := nullif(p->>'id', '')::uuid;
  v_name  text := nullif(btrim(coalesce(p->>'name', '')), '');
  v_type  uuid := nullif(p->>'partner_type_id', '')::uuid;
  v_other text := nullif(btrim(coalesce(p->>'partner_type_other', '')), '');
  v_cont  text := nullif(btrim(coalesce(p->>'contact', '')), '');
  v_del   timestamptz;
  v_found boolean;
begin
  if v_id is not null then
    select deleted_at into v_del from public.khld_partner where id = v_id;
    v_found := found;
    if not v_found then
      raise exception 'partner % is not on file', v_id using errcode = 'foreign_key_violation';
    end if;
  else
    if v_name is null then
      raise exception 'A partner needs a name' using errcode = 'not_null_violation';
    end if;
    select id, deleted_at into v_id, v_del
      from public.khld_partner
     where municipality_id = public.my_municipality() and lower(btrim(name)) = lower(v_name);
  end if;

  if v_id is not null and v_del is not null then
    raise exception 'This name belongs to a partner who was deleted; restore them first'
      using errcode = 'P0KHP', detail = v_id::text;
  end if;

  if v_id is not null then
    -- on file: empties may be filled, nothing is overwritten
    update public.khld_partner
       set partner_type_id    = coalesce(partner_type_id, v_type),
           partner_type_other = coalesce(partner_type_other, v_other),
           contact            = coalesce(contact, v_cont)
     where id = v_id
       and ((partner_type_id is null and v_type is not null)
            or (partner_type_other is null and v_other is not null)
            or (contact is null and v_cont is not null));
    return v_id;
  end if;

  insert into public.khld_partner (name, partner_type_id, partner_type_other, contact)
  values (v_name, v_type, v_other, v_cont)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.khld_ensure_partner(jsonb) from public, anon;
grant execute on function public.khld_ensure_partner(jsonb) to authenticated;

comment on function public.khld_ensure_partner(jsonb) is
  '{id} or {name, partner_type_id, partner_type_other, contact}: the partner on '
  'file by id or by name (case and space insensitive, within the caller''s '
  'municipality), empties filled, or a new one; a soft-deleted partner raises '
  'P0KHP with the id to restore. Security invoker. 0148.';

-- An enterprise (SO4-G1, SO4-G2, SO4-H2) is the entity the sheets call
-- "Enterprise ID -- use the same ID on forms 19, 20 and 22". Found by id, or
-- by its owner when the form carries the owner's identity (a person owns
-- one home-based enterprise: a second G1 for the same owner without an id
-- is the same enterprise, not a new one -- SO4-G2 is a UNIQUE count of
-- enterprises), or created. The owner's name on the entity is the person's
-- name on file, not what was typed.
create function public.khld_ensure_enterprise(p jsonb, p_owner uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id    uuid := nullif(p->>'id', '')::uuid;
  v_name  text := nullif(btrim(coalesce(p->>'enterprise_name', '')), '');
  v_owner text := coalesce((select full_name from public.person where id = p_owner),
                           nullif(btrim(coalesce(p->>'owner_name', '')), ''));
  v_phone text := coalesce((select phone from public.person where id = p_owner),
                           nullif(btrim(coalesce(p->>'owner_phone', '')), ''));
  v_del   timestamptz;
  v_found boolean;
begin
  if v_id is not null then
    select deleted_at into v_del from public.khld_enterprise where id = v_id;
    v_found := found;
    if not v_found then
      raise exception 'enterprise % is not on file', v_id using errcode = 'foreign_key_violation';
    end if;
  elsif p_owner is not null then
    select id, deleted_at into v_id, v_del
      from public.khld_enterprise
     where municipality_id = public.my_municipality() and owner_person_id = p_owner
     order by (deleted_at is null) desc, created_at
     limit 1;
  end if;

  if v_id is not null and v_del is not null then
    raise exception 'This owner''s enterprise was deleted; restore it first'
      using errcode = 'P0KHE', detail = v_id::text;
  end if;

  if v_id is not null then
    update public.khld_enterprise
       set owner_person_id = coalesce(owner_person_id, p_owner),
           owner_name      = coalesce(owner_name, v_owner),
           owner_phone     = coalesce(owner_phone, v_phone),
           enterprise_name = coalesce(enterprise_name, v_name)
     where id = v_id
       and ((owner_person_id is null and p_owner is not null)
            or (owner_name is null and v_owner is not null)
            or (owner_phone is null and v_phone is not null)
            or (enterprise_name is null and v_name is not null));
    return v_id;
  end if;

  insert into public.khld_enterprise (owner_person_id, owner_name, owner_phone, enterprise_name)
  values (p_owner, v_owner, v_phone, v_name)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.khld_ensure_enterprise(jsonb, uuid) from public, anon;
grant execute on function public.khld_ensure_enterprise(jsonb, uuid) to authenticated;

comment on function public.khld_ensure_enterprise(jsonb, uuid) is
  '({id} or {enterprise_name, owner_name, owner_phone}, owner person or null): '
  'the enterprise by id, else the owner''s enterprise on file, else a new one '
  '(KHLD-ENT-NNN from the trigger); empties filled from the person on file; a '
  'soft-deleted one raises P0KHE with the id to restore. Security invoker. 0148.';

-- A vendor (SO4-H2, SO4-0) is a person in the producer register, once:
-- khld_vendor_person_key is global (0145), so the same person at a second
-- market is the same vendor -- "unique vendor identifiers across all
-- markets" is the second figure the sheet asks for.
create function public.khld_ensure_vendor(p_person uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_id  uuid;
  v_del timestamptz;
begin
  select id, deleted_at into v_id, v_del
    from public.khld_vendor
   where municipality_id = public.my_municipality() and person_id = p_person;
  if v_id is not null and v_del is not null then
    raise exception 'This person''s vendor record was deleted; restore it first'
      using errcode = 'P0KHV', detail = v_id::text;
  end if;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.khld_vendor (person_id) values (p_person) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.khld_ensure_vendor(uuid) from public, anon;
grant execute on function public.khld_ensure_vendor(uuid) to authenticated;

comment on function public.khld_ensure_vendor(uuid) is
  'The vendor record of a person, or a new one (KHLD-VEN-NNN from the trigger); '
  'a soft-deleted one raises P0KHV with the id to restore. Security invoker. 0148.';

-- ── 3. the save function ──────────────────────────────────────────────────

create function public.save_khld_record(p_table text, p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  c_tables   constant text[] := array[
    'khld_partner', 'khld_enterprise', 'khld_vendor',
    'khld_works_item', 'khld_coordination_meeting', 'khld_contribution', 'khld_campaign', 'khld_activity',
    'khld_market', 'khld_action_day', 'khld_volunteer', 'khld_attendance', 'khld_guidance_completion',
    'khld_enterprise_support', 'khld_vendor_registration', 'khld_interaction_survey', 'khld_partner_survey',
    'khld_user_feedback', 'khld_volunteer_tracking', 'khld_producer_survey', 'khld_milestone_verification',
    'khld_volunteer_participation'];
  c_owned    constant text[] := array['id', 'municipality_id', 'created_at', 'updated_at', 'created_by', 'deleted_at',
    'sessions_attended_count', 'completion', 'support_types_count'];
  v_id       uuid := nullif(p->>'id', '')::uuid;
  v_row      jsonb := coalesce(p->'row', '{}'::jsonb);
  v_known    text[];
  v_cols     text[];
  v_col      text;
  v_list     text;
  v_muni     uuid;
  v_ref      text;
  v_person   uuid;
  v_partner  uuid;
  v_ent      uuid;
  v_vendor   uuid;
  v_n        int;
  v_q        text;
  v_o        jsonb;
  v_fk       text;
  v_occ      text;
  v_kind     text;
  v_when     date;
  v_part     uuid;
  v_state    text;
  v_constraint text;
  v_message  text;
  v_detail   text;
  v_out      jsonb;
begin
  if not (p_table = any(c_tables)) then
    return jsonb_build_object('ok', false, 'result', 'unknown_table');
  end if;

  -- pg_attribute, not information_schema.columns: the latter shows a role only
  -- the columns it has privileges on, and this list must be the table's
  select array_agg(a.attname::text) into v_known
    from pg_attribute a
   where a.attrelid = ('public.' || quote_ident(p_table))::regclass
     and a.attnum > 0 and not a.attisdropped
     and not (a.attname = any(c_owned))
     and a.attname not like '%\_recorded\_on' and a.attname not like '%\_recorded\_by';

  select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
  foreach v_col in array coalesce(v_cols, '{}'::text[]) loop
    if not (v_col = any(v_known)) then
      return jsonb_build_object('ok', false, 'result', 'unknown_column', 'column', v_col);
    end if;
  end loop;

  -- the blocks a table cannot take are refused, not ignored
  if p ? 'person' and not (p_table in ('khld_volunteer', 'khld_guidance_completion', 'khld_vendor_registration', 'khld_enterprise')) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'person');
  end if;
  if p ? 'partner' and not (p_table in ('khld_partner_survey', 'khld_contribution')) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'partner');
  end if;
  if p ? 'enterprise' and not (p_table in ('khld_guidance_completion', 'khld_enterprise_support', 'khld_vendor_registration')) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'enterprise');
  end if;
  if p ? 'checklist' and p_table <> 'khld_milestone_verification' then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'checklist');
  end if;
  if p ? 'ratings' and p_table <> 'khld_user_feedback' then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'ratings');
  end if;
  if p ? 'participations' and not (p_table in ('khld_campaign', 'khld_action_day', 'khld_activity', 'khld_market')) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'participations');
  end if;

  -- the junction column, the participation link and the date it defaults to
  v_fk := case p_table
    when 'khld_partner' then 'partner_id'
    when 'khld_enterprise' then 'enterprise_id'
    when 'khld_vendor' then 'vendor_id'
    when 'khld_works_item' then 'works_item_id'
    when 'khld_coordination_meeting' then 'meeting_id'
    when 'khld_contribution' then 'contribution_id'
    when 'khld_campaign' then 'campaign_id'
    when 'khld_activity' then 'activity_id'
    when 'khld_market' then 'market_id'
    when 'khld_action_day' then 'action_day_id'
    when 'khld_volunteer' then 'volunteer_id'
    when 'khld_attendance' then 'attendance_id'
    when 'khld_guidance_completion' then 'completion_id'
    when 'khld_enterprise_support' then 'support_id'
    when 'khld_vendor_registration' then 'registration_id'
    when 'khld_interaction_survey' then 'survey_id'
    when 'khld_partner_survey' then 'survey_id'
    when 'khld_user_feedback' then 'feedback_id'
    when 'khld_volunteer_tracking' then 'tracking_id'
    when 'khld_producer_survey' then 'survey_id'
    when 'khld_milestone_verification' then 'verification_id'
    else null end;
  v_occ := case p_table
    when 'khld_campaign' then 'campaign_id'
    when 'khld_action_day' then 'action_day_id'
    when 'khld_activity' then 'activity_id'
    when 'khld_market' then 'market_id'
    else null end;
  v_kind := case p_table
    when 'khld_campaign' then 'campaign'
    when 'khld_action_day' then 'action_day'
    when 'khld_activity' then 'activity'
    when 'khld_market' then 'market'
    else null end;

  begin
    -- ── 1. the spine and the entities ────────────────────────────────────
    if p ? 'person' and jsonb_typeof(p->'person') = 'object' then
      v_person := public.khld_ensure_person(p->'person');
    end if;
    if p_table = 'khld_volunteer' and v_person is not null then
      v_row := v_row || jsonb_build_object('person_id', v_person);
    end if;
    if p_table = 'khld_enterprise' and v_person is not null then
      v_row := v_row || jsonb_build_object('owner_person_id', v_person);
    end if;
    if p_table = 'khld_guidance_completion' and (v_person is not null or p ? 'enterprise') then
      -- the enterprise's name on the entity is the sheet's field 11 when the entity has none yet
      v_ent := public.khld_ensure_enterprise(
        coalesce(p->'enterprise', '{}'::jsonb)
          || jsonb_strip_nulls(jsonb_build_object('enterprise_name', coalesce(p->'enterprise'->>'enterprise_name', v_row->>'enterprise_name'))),
        v_person);
      v_row := v_row || jsonb_build_object('enterprise_id', v_ent);
    end if;
    if p_table = 'khld_enterprise_support' and p ? 'enterprise' then
      v_ent := public.khld_ensure_enterprise(p->'enterprise', null);
      v_row := v_row || jsonb_build_object('enterprise_id', v_ent);
    end if;
    if p_table = 'khld_vendor_registration' then
      if v_person is not null then
        v_vendor := public.khld_ensure_vendor(v_person);
        v_row := v_row || jsonb_build_object('vendor_id', v_vendor);
      end if;
      if p ? 'enterprise' then
        v_ent := public.khld_ensure_enterprise(p->'enterprise', v_person);
        v_row := v_row || jsonb_build_object('enterprise_id', v_ent);
      end if;
    end if;
    if p ? 'partner' and jsonb_typeof(p->'partner') = 'object' then
      v_partner := public.khld_ensure_partner(p->'partner');
      v_row := v_row || jsonb_build_object('partner_id', v_partner);
    end if;
    select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;

    -- ── 2. the header ────────────────────────────────────────────────────
    if v_id is null then
      if v_cols is null then
        return jsonb_build_object('ok', false, 'result', 'invalid', 'message', 'nothing to save');
      end if;
      select string_agg(format('%I', c), ', ') into v_list from unnest(v_cols) c;
      execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) returning id, municipality_id',
                     p_table, v_list, v_list, p_table)
        into v_id, v_muni using v_row;
    else
      if v_cols is not null then
        select string_agg(format('%I', c), ', ') into v_list from unnest(v_cols) c;
        execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where t.id = $2 and t.deleted_at is null returning t.municipality_id',
                       p_table, v_list, v_list, p_table)
          into v_muni using v_row, v_id;
      else
        execute format('select municipality_id from public.%I where id = $1 and deleted_at is null', p_table)
          into v_muni using v_id;
      end if;
      if v_muni is null then
        return jsonb_build_object('ok', false, 'result', 'not_found');
      end if;
    end if;

    -- ── 3. the children: replaced per question, with the read-back ───────
    if p ? 'option_questions' and to_regclass('public.' || p_table || '_option') is not null then
      for v_q in select jsonb_array_elements_text(p->'option_questions') loop
        execute format('delete from public.%I where %I = $1 and question_code = $2', p_table || '_option', v_fk)
          using v_id, v_q;
        execute format('select count(*) from public.%I where %I = $1 and question_code = $2', p_table || '_option', v_fk)
          into v_n using v_id, v_q;
        if v_n > 0 then
          raise exception 'the options of % could not be replaced: % rows remain after the delete', v_q, v_n
            using errcode = 'insufficient_privilege';
        end if;
        for v_o in select e from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) e
                    where e->>'question_code' = v_q loop
          execute format('insert into public.%I (%I, municipality_id, question_code, option_id, option_other) values ($1, $2, $3, $4, $5)',
                         p_table || '_option', v_fk)
            using v_id, v_muni, v_q, (v_o->>'option_id')::uuid, nullif(btrim(coalesce(v_o->>'option_other', '')), '');
        end loop;
      end loop;
    end if;

    if p ? 'count_fields' and to_regclass('public.' || p_table || '_count') is not null then
      for v_q in select jsonb_array_elements_text(p->'count_fields') loop
        execute format('delete from public.%I where %I = $1 and field_code = $2', p_table || '_count', v_fk)
          using v_id, v_q;
        execute format('select count(*) from public.%I where %I = $1 and field_code = $2', p_table || '_count', v_fk)
          into v_n using v_id, v_q;
        if v_n > 0 then
          raise exception 'the cells of % could not be replaced: % rows remain after the delete', v_q, v_n
            using errcode = 'insufficient_privilege';
        end if;
        for v_o in select e from jsonb_array_elements(coalesce(p->'counts', '[]'::jsonb)) e
                    where e->>'field_code' = v_q loop
          execute format('insert into public.%I (%I, municipality_id, field_code, cell_id, count) values ($1, $2, $3, $4, $5)',
                         p_table || '_count', v_fk)
            using v_id, v_muni, v_q, (v_o->>'cell_id')::uuid, (v_o->>'count')::int;
        end loop;
      end loop;
    end if;

    if p ? 'checklist' then
      delete from public.khld_milestone_checklist_item where verification_id = v_id;
      select count(*) into v_n from public.khld_milestone_checklist_item where verification_id = v_id;
      if v_n > 0 then
        raise exception 'the checklist could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.khld_milestone_checklist_item (verification_id, municipality_id, item_no, field_code, status_id, detail, status_date, evidence_ref)
      select v_id, v_muni, (e->>'item_no')::int, e->>'field_code', (e->>'status_id')::uuid,
             nullif(btrim(coalesce(e->>'detail', '')), ''), nullif(e->>'status_date', '')::date,
             nullif(btrim(coalesce(e->>'evidence_ref', '')), '')
        from jsonb_array_elements(p->'checklist') e;
    end if;

    if p ? 'ratings' then
      delete from public.khld_user_feedback_rating where feedback_id = v_id;
      select count(*) into v_n from public.khld_user_feedback_rating where feedback_id = v_id;
      if v_n > 0 then
        raise exception 'the facility ratings could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.khld_user_feedback_rating (feedback_id, municipality_id, item_id, rating_id)
      select v_id, v_muni, (e->>'item_id')::uuid, (e->>'rating_id')::uuid
        from jsonb_array_elements(p->'ratings') e;
    end if;

    -- ── 4. participations: merged by volunteer, never replaced ───────────
    if p ? 'participations' and v_occ is not null then
      execute format('select %I from public.%I where id = $1',
                     case p_table when 'khld_campaign' then 'campaign_date' when 'khld_action_day' then 'date'
                                  when 'khld_activity' then 'event_date' else 'market_date' end, p_table)
        into v_when using v_id;
      for v_o in select e from jsonb_array_elements(p->'participations') e loop
        execute format('select id from public.khld_volunteer_participation where %I = $1 and volunteer_id = $2 and deleted_at is null', v_occ)
          into v_part using v_id, (v_o->>'volunteer_id')::uuid;
        if v_part is not null then
          update public.khld_volunteer_participation
             set participated_on = coalesce(nullif(v_o->>'participated_on', '')::date, participated_on),
                 hours           = coalesce(nullif(v_o->>'hours', '')::numeric, hours),
                 verified        = coalesce(nullif(v_o->>'verified', '')::boolean, verified),
                 reference_text  = coalesce(nullif(btrim(coalesce(v_o->>'reference_text', '')), ''), reference_text),
                 notes           = coalesce(nullif(btrim(coalesce(v_o->>'notes', '')), ''), notes)
           where id = v_part;
        else
          execute format('insert into public.khld_volunteer_participation (municipality_id, volunteer_id, kind, %I, participated_on, hours, verified, reference_text, notes) '
                         'values ($1, $2, $3, $4, $5, $6, $7, $8, $9)', v_occ)
            using v_muni, (v_o->>'volunteer_id')::uuid, v_kind, v_id,
                  coalesce(nullif(v_o->>'participated_on', '')::date, v_when),
                  nullif(v_o->>'hours', '')::numeric, coalesce(nullif(v_o->>'verified', '')::boolean, false),
                  nullif(btrim(coalesce(v_o->>'reference_text', '')), ''), nullif(btrim(coalesce(v_o->>'notes', '')), '');
        end if;
      end loop;
    end if;

    -- ── 5. the one rule a row trigger cannot see ─────────────────────────
    -- IMP-0 question 13 (activities taken part in) is a multi-select, so its
    -- rows arrive after the header; a visitor's questionnaire needs at least
    -- one, and a non-visitor's none (field 12: "Never skips to Q20")
    if p_table = 'khld_interaction_survey' then
      select count(*) into v_n from public.khld_interaction_survey_option o
       where o.survey_id = v_id and o.question_code = 'activities_taken';
      if exists (select 1 from public.khld_interaction_survey s
                   join public.ref_khld_imp0_visit_freq f on f.id = s.visit_freq_id
                  where s.id = v_id and f.code = 'never') then
        if v_n > 0 then
          raise exception 'IMP-0 field 12: a respondent who never visited skips question 13, so activities_taken must be empty'
            using errcode = 'check_violation', constraint = 'khld_imp0_visit_block_skipped';
        end if;
      elsif v_n = 0 then
        raise exception 'IMP-0 question 13 is required unless field 12 is Never: at least one activity, or "None"'
          using errcode = 'check_violation', constraint = 'khld_imp0_activities_taken_required';
      end if;
    end if;

    if 'reference' = any(v_known) then
      execute format('select reference from public.%I where id = $1', p_table) into v_ref using v_id;
    end if;
    v_out := jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref);
    if v_person is not null then v_out := v_out || jsonb_build_object('person_id', v_person); end if;
    if v_partner is not null then v_out := v_out || jsonb_build_object('partner_id', v_partner); end if;
    if v_ent is not null then
      v_out := v_out || jsonb_build_object('enterprise_id', v_ent,
        'enterprise_reference', (select reference from public.khld_enterprise where id = v_ent));
    end if;
    if v_vendor is not null then
      v_out := v_out || jsonb_build_object('vendor_id', v_vendor,
        'vendor_reference', (select reference from public.khld_vendor where id = v_vendor));
    end if;
    return v_out;

  exception
    when sqlstate 'P0KHL' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'result', 'person_deleted', 'person_id', v_detail);
    when sqlstate 'P0KHP' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'result', 'partner_deleted', 'partner_id', v_detail);
    when sqlstate 'P0KHE' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'result', 'enterprise_deleted', 'enterprise_id', v_detail);
    when sqlstate 'P0KHV' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'result', 'vendor_deleted', 'vendor_id', v_detail);
    when check_violation or foreign_key_violation or unique_violation or not_null_violation
         or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range
         or invalid_datetime_format or string_data_right_truncation then
      get stacked diagnostics v_state = returned_sqlstate, v_constraint = constraint_name, v_message = message_text;
      if v_constraint = 'khld_imp0_consent_required' then
        return jsonb_build_object('ok', false, 'result', 'consent_refused', 'message', v_message);
      end if;
      return jsonb_build_object('ok', false, 'result', 'invalid', 'code', v_state,
                                'constraint', nullif(v_constraint, ''), 'message', v_message);
  end;
end $$;

revoke all on function public.save_khld_record(text, jsonb) from public, anon;
grant execute on function public.save_khld_record(text, jsonb) to authenticated;

comment on function public.save_khld_record(text, jsonb) is
  'The one save path for the Khalidiyah tables. {id?, row, person?, partner?, '
  'enterprise?, option_questions?, options?, count_fields?, counts?, checklist?, '
  'ratings?, participations?}. Writes only the columns the payload names, '
  'resolves the person and the entity the form keys on, replaces the named '
  'children by delete-then-insert with a read-back, merges participations by '
  'volunteer, and answers {ok, id, reference, ...} or {ok:false, result, ...}: '
  'unknown_table, unknown_column, unknown_block, not_found, consent_refused, '
  'person_deleted, partner_deleted, enterprise_deleted, vendor_deleted, invalid. '
  'Security invoker. 0148.';

-- ── verification: as the Khalidiyah admin, discarded ─────────────────────
do $verify$
declare
  v_khld  uuid := '00000000-0000-4000-8000-0000000000b2';
  v_res   jsonb;
  v_vol   uuid;
  v_vol2  uuid;
  v_ptn   uuid;
  v_act   uuid;
  v_att   uuid;
  v_g1    uuid;
  v_ent   uuid;
  v_mkt   uuid;
  v_h2    uuid;
  v_cmp   uuid;
  v_ad    uuid;
  v_ms    uuid;
  v_fb    uuid;
  v_imp   uuid;
  v_person uuid;
  v_nid1  text := '399000990';
  v_nid2  text := '399000991';
  v_nid3  text := '399000992';
  v_unhcr text := '048-26C00148';
  v_n     int;
begin
  if exists (select 1 from public.person where national_id in (v_nid1, v_nid2, v_nid3) or unhcr_number = v_unhcr) then
    raise exception '0148: a probe identifier is on file; pick another';
  end if;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@khalidiyah.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- 0. what the payload may not write: a misspelt column, an owned column,
    --    a derived figure, a block the table cannot take
    v_res := public.save_khld_record('khld_activity', jsonb_build_object('row', jsonb_build_object('event_titel', 'x')));
    if v_res->>'result' <> 'unknown_column' then raise exception '0148: a misspelt column was accepted: %', v_res; end if;
    v_res := public.save_khld_record('khld_activity', jsonb_build_object('row', jsonb_build_object('municipality_id', v_khld)));
    if v_res->>'result' <> 'unknown_column' then raise exception '0148: municipality_id was writable: %', v_res; end if;
    v_res := public.save_khld_record('khld_guidance_completion', jsonb_build_object('row', jsonb_build_object('completion', 'completed')));
    if v_res->>'result' <> 'unknown_column' then raise exception '0148: the derived completion was writable: %', v_res; end if;
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object('row', jsonb_build_object('consent_data_recorded_on', now())));
    if v_res->>'result' <> 'unknown_column' then raise exception '0148: a consent stamp was writable: %', v_res; end if;
    v_res := public.save_khld_record('khld_activity', jsonb_build_object('row', '{}'::jsonb, 'person', '{}'::jsonb));
    if v_res->>'result' <> 'unknown_block' then raise exception '0148: a person block on an activity was accepted: %', v_res; end if;
    v_res := public.save_khld_record('rmth_event', jsonb_build_object('row', '{}'::jsonb));
    if v_res->>'result' <> 'unknown_table' then raise exception '0148: a Ramtha table was accepted: %', v_res; end if;

    -- 1. SO3-F2: an adult by national ID, with one multi-select; the
    --    reference issued, the person created, the option written
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid1, 'full_name', '0148 Probe Volunteer',
                                   'sex', 'female', 'phone', '0790000148', 'date_of_birth', '1990-05-01'),
      'row', jsonb_build_object('reg_date', '2026-09-21',
        'reg_channel_id', (select id from public.ref_khld_f2_reg_channel where code = 'at_the_municipality'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'affiliation_id', (select id from public.ref_khld_f2_affiliation where code = 'none_individual_volunteer'),
        'transport_id', (select id from public.ref_khld_f2_transport where code = 'yes'),
        'consent_data', true, 'consent_photo', true, 'safety_commitment', true),
      'option_questions', jsonb_build_array('interests'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'interests',
        'option_id', (select id from public.ref_khld_f2_interests where not allows_free_text order by sort_order limit 1)))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: volunteer insert failed: %', v_res; end if;
    v_vol := (v_res->>'id')::uuid;
    if v_res->>'reference' <> 'KHLD-VOL-0001' then raise exception '0148: the volunteer reference is %', v_res->>'reference'; end if;
    select id into v_person from public.person where national_id = v_nid1;
    if v_person is null or (v_res->>'person_id')::uuid <> v_person then raise exception '0148: the person was not created'; end if;
    if (select count(*) from public.khld_volunteer_option where volunteer_id = v_vol) <> 1 then raise exception '0148: expected 1 option row'; end if;
    if (select municipality_id from public.khld_volunteer where id = v_vol) <> v_khld then raise exception '0148: the municipality default did not fill'; end if;
    if (select consent_data_recorded_by from public.khld_volunteer where id = v_vol) is null then raise exception '0148: the consent was not stamped'; end if;

    -- the same person a second time is the same volunteer, refused by name
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid1, 'full_name', 'A DIFFERENT NAME', 'sex', 'male'),
      'row', (select jsonb_build_object('reg_date', '2026-09-22', 'reg_channel_id', reg_channel_id, 'nationality_id', nationality_id,
                'disability_id', disability_id, 'neighbourhood_id', neighbourhood_id, 'affiliation_id', affiliation_id,
                'transport_id', transport_id, 'consent_data', true, 'consent_photo', false, 'safety_commitment', true)
                from public.khld_volunteer where id = v_vol)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_volunteer_person_key' then
      raise exception '0148: a second registration of one person was not refused by name: %', v_res;
    end if;
    if (select full_name from public.person where id = v_person) <> '0148 Probe Volunteer'
       or (select sex from public.person where id = v_person) <> 'female' then
      raise exception '0148: an existing person''s identity was overwritten';
    end if;

    -- a minor by UNHCR number: refused without the guardian block, named; accepted with it
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'unhcr_number', 'id_number', v_unhcr, 'full_name', '0148 Probe Child',
                                   'sex', 'male', 'date_of_birth', '2013-03-03'),
      'row', (select jsonb_build_object('reg_date', '2026-09-21', 'reg_channel_id', reg_channel_id, 'nationality_id',
                (select id from public.ref_khld_nationality where code = 'syrian_registered'),
                'disability_id', disability_id, 'neighbourhood_id', neighbourhood_id, 'affiliation_id', affiliation_id,
                'transport_id', transport_id, 'consent_data', true, 'consent_photo', false, 'safety_commitment', true)
                from public.khld_volunteer where id = v_vol)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_volunteer_minor_needs_guardian' then
      raise exception '0148: a minor without a guardian was not refused by name: %', v_res;
    end if;
    if exists (select 1 from public.person where unhcr_number = v_unhcr) then
      raise exception '0148: a refused registration left its person behind';
    end if;
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'unhcr_number', 'id_number', v_unhcr, 'full_name', '0148 Probe Child',
                                   'sex', 'male', 'date_of_birth', '2013-03-03'),
      'row', (select jsonb_build_object('reg_date', '2026-09-21', 'reg_channel_id', reg_channel_id, 'nationality_id',
                (select id from public.ref_khld_nationality where code = 'syrian_registered'),
                'disability_id', disability_id, 'neighbourhood_id', neighbourhood_id, 'affiliation_id', affiliation_id,
                'transport_id', transport_id, 'consent_data', true, 'consent_photo', false, 'safety_commitment', true,
                'guardian_name', 'A parent', 'guardian_relationship', 'father', 'guardian_phone', '0790000149',
                'guardian_consent_given', true, 'guardian_consent_date', '2026-09-21')
                from public.khld_volunteer where id = v_vol)));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: the minor with a guardian was refused: %', v_res; end if;
    v_vol2 := (v_res->>'id')::uuid;
    if v_res->>'reference' <> 'KHLD-VOL-0002' then raise exception '0148: the second reference is %', v_res->>'reference'; end if;

    -- 2. a refusal AFTER the delete leaves the earlier option rows in place
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object(
      'id', v_vol, 'row', '{}'::jsonb,
      'option_questions', jsonb_build_array('interests'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'interests',
        'option_id', (select id from public.ref_khld_c2_focus where code = 'minor_repairs')))));
    if v_res->>'result' <> 'invalid' then raise exception '0148: an option from another list was accepted: %', v_res; end if;
    if (select count(*) from public.khld_volunteer_option where volunteer_id = v_vol and question_code = 'interests') <> 1 then
      raise exception '0148: a refused save destroyed the interests (the delete was outside the handler)';
    end if;
    -- and an update to a row that is not there answers not_found
    v_res := public.save_khld_record('khld_volunteer', jsonb_build_object('id', gen_random_uuid(), 'row', jsonb_build_object('hours_per_month', 4)));
    if v_res->>'result' <> 'not_found' then raise exception '0148: expected not_found, got %', v_res; end if;

    -- 3. SO1-0: the partner found by name or created; one survey per partner per round
    v_res := public.save_khld_record('khld_partner_survey', jsonb_build_object(
      'partner', jsonb_build_object('name', '  0148 Probe Association ',
        'partner_type_id', (select id from public.ref_khld_partner_type where not allows_free_text order by sort_order limit 1)),
      'row', jsonb_build_object('resp_date', '2027-06-01',
        'survey_round_id', (select id from public.ref_khld_so10_survey_round where code = 'n_2027'),
        'resp_name', 'A respondent, director', 'engagement_since', '2026-09-01', 'meetings_attended', 3,
        'focal_point_id', (select id from public.ref_khld_so10_focal_point where code = 'yes_and_they_respond_promptly'),
        'q_communication_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'q_roles_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'q_joint_planning_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'q_followup_id', (select id from public.ref_khld_agree_scale where code = 'neither'),
        'q_transparency_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'q_improved_id', (select id from public.ref_khld_agree_scale where code = 'strongly_agree'),
        'overall_rating_id', (select id from public.ref_khld_so10_overall_rating where code = 'effective'),
        'duplication_id', (select id from public.ref_khld_so10_duplication where code = 'to_some_extent'),
        'improve_suggestion', 'probe', 'continue_intent_id', (select id from public.ref_khld_so10_continue_intent where code = 'undecided'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: partner survey insert failed: %', v_res; end if;
    v_ptn := (v_res->>'partner_id')::uuid;
    if (select name from public.khld_partner where id = v_ptn) <> '0148 Probe Association' then raise exception '0148: the partner name was not trimmed'; end if;
    v_res := public.save_khld_record('khld_partner_survey', jsonb_build_object(
      'partner', jsonb_build_object('name', '0148 probe association'),
      'row', (select jsonb_build_object('resp_date', '2027-06-02', 'survey_round_id', survey_round_id, 'resp_name', 'x',
                'engagement_since', engagement_since, 'meetings_attended', 1, 'focal_point_id', focal_point_id,
                'q_communication_id', q_communication_id, 'q_roles_id', q_roles_id, 'q_joint_planning_id', q_joint_planning_id,
                'q_followup_id', q_followup_id, 'q_transparency_id', q_transparency_id, 'q_improved_id', q_improved_id,
                'overall_rating_id', overall_rating_id, 'duplication_id', duplication_id, 'improve_suggestion', 'x',
                'continue_intent_id', continue_intent_id)
                from public.khld_partner_survey where partner_id = v_ptn)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_partner_survey_partner_round_live' then
      raise exception '0148: a second survey of one partner in one round was accepted: %', v_res;
    end if;
    if (select count(*) from public.khld_partner where lower(name) = '0148 probe association') <> 1 then
      raise exception '0148: the partner was created twice';
    end if;
    -- a soft-deleted partner is offered for restore, not recreated
    update public.khld_partner set deleted_at = now() where id = v_ptn;
    v_res := public.save_khld_record('khld_partner_survey', jsonb_build_object(
      'partner', jsonb_build_object('name', '0148 Probe Association'), 'row', jsonb_build_object('resp_date', '2028-06-01')));
    if v_res->>'result' <> 'partner_deleted' or (v_res->>'partner_id')::uuid <> v_ptn then
      raise exception '0148: a deleted partner was not offered for restore: %', v_res;
    end if;
    update public.khld_partner set deleted_at = null where id = v_ptn;

    -- 4. IMP-0: no consent is no record; Never skips the block; a visitor
    --    answers the block and names at least one activity
    v_res := public.save_khld_record('khld_interaction_survey', jsonb_build_object(
      'row', jsonb_build_object('int_date', '2027-05-01',
        'survey_round_id', (select id from public.ref_khld_imp0_survey_round where code = 'n_2027_round'),
        'enum_name', 'probe', 'int_place_id', (select id from public.ref_khld_imp0_int_place where code = 'in_the_park_on_an_ordinary_day'),
        'consent_id', (select id from public.ref_khld_imp0_consent where code = 'no'),
        'sex_id', (select id from public.ref_khld_sex where code = 'female'),
        'age_group_id', (select id from public.ref_khld_age_group where code = '25_34'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'has_children_id', (select id from public.ref_khld_imp0_has_children where code = 'no'),
        'visit_freq_id', (select id from public.ref_khld_imp0_visit_freq where code = 'never'),
        'suitable_women_children_id', (select id from public.ref_khld_yes_fully_partly_no where code = 'partly'),
        'relations_change_id', (select id from public.ref_khld_imp0_relations_change where code = 'no_change'),
        'change_narrative', 'probe', 'recontact_id', (select id from public.ref_khld_recontact where code = 'no'))));
    if v_res->>'result' <> 'consent_refused' then raise exception '0148: an interview without consent was recorded: %', v_res; end if;
    v_res := public.save_khld_record('khld_interaction_survey', jsonb_build_object(
      'row', jsonb_build_object('int_date', '2027-05-01',
        'survey_round_id', (select id from public.ref_khld_imp0_survey_round where code = 'n_2027_round'),
        'enum_name', 'probe', 'int_place_id', (select id from public.ref_khld_imp0_int_place where code = 'in_the_park_on_an_ordinary_day'),
        'consent_id', (select id from public.ref_khld_imp0_consent where code = 'yes'),
        'sex_id', (select id from public.ref_khld_sex where code = 'female'),
        'age_group_id', (select id from public.ref_khld_age_group where code = '25_34'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'has_children_id', (select id from public.ref_khld_imp0_has_children where code = 'no'),
        'visit_freq_id', (select id from public.ref_khld_imp0_visit_freq where code = 'never'),
        'suitable_women_children_id', (select id from public.ref_khld_yes_fully_partly_no where code = 'partly'),
        'relations_change_id', (select id from public.ref_khld_imp0_relations_change where code = 'no_change'),
        'change_narrative', 'probe', 'recontact_id', (select id from public.ref_khld_recontact where code = 'no'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: a non-visitor''s questionnaire was refused: %', v_res; end if;
    v_imp := (v_res->>'id')::uuid;
    -- the same respondent as a weekly visitor: the block is required ...
    v_res := public.save_khld_record('khld_interaction_survey', jsonb_build_object(
      'id', v_imp, 'row', jsonb_build_object('visit_freq_id', (select id from public.ref_khld_imp0_visit_freq where code = 'weekly_or_more'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_imp0_visit_block_required' then
      raise exception '0148: a visitor without questions 13-19 was accepted: %', v_res;
    end if;
    -- ... and so is at least one activity, checked after the children, and the header rolls back with it
    v_res := public.save_khld_record('khld_interaction_survey', jsonb_build_object(
      'id', v_imp, 'row', jsonb_build_object('visit_freq_id', (select id from public.ref_khld_imp0_visit_freq where code = 'weekly_or_more'),
        'mixed_presence_id', (select id from public.ref_khld_imp0_mixed_presence where code = 'yes_sometimes'),
        'new_contact_id', (select id from public.ref_khld_imp0_new_contact where code = 'yes_once_or_twice'),
        'opportunity_increase_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'joint_activity_id', (select id from public.ref_khld_imp0_joint_activity where code = 'yes_once'),
        'comfort_level_id', (select id from public.ref_khld_imp0_comfort_level where code = 'comfortable'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_imp0_activities_taken_required' then
      raise exception '0148: a visitor with no activity was accepted: %', v_res;
    end if;
    if (select f.code from public.khld_interaction_survey s join public.ref_khld_imp0_visit_freq f on f.id = s.visit_freq_id where s.id = v_imp) <> 'never' then
      raise exception '0148: a refused save left the header changed';
    end if;
    v_res := public.save_khld_record('khld_interaction_survey', jsonb_build_object(
      'id', v_imp, 'row', jsonb_build_object('visit_freq_id', (select id from public.ref_khld_imp0_visit_freq where code = 'weekly_or_more'),
        'mixed_presence_id', (select id from public.ref_khld_imp0_mixed_presence where code = 'yes_sometimes'),
        'new_contact_id', (select id from public.ref_khld_imp0_new_contact where code = 'yes_once_or_twice'),
        'opportunity_increase_id', (select id from public.ref_khld_agree_scale where code = 'agree'),
        'joint_activity_id', (select id from public.ref_khld_imp0_joint_activity where code = 'yes_once'),
        'comfort_level_id', (select id from public.ref_khld_imp0_comfort_level where code = 'comfortable')),
      'option_questions', jsonb_build_array('activities_taken'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'activities_taken',
        'option_id', (select id from public.ref_khld_imp0_activities_taken where code = 'sports_activity')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: a complete visitor''s questionnaire was refused: %', v_res; end if;

    -- 5. SO3-0: an inactive volunteer needs a reason
    v_res := public.save_khld_record('khld_volunteer_tracking', jsonb_build_object(
      'row', jsonb_build_object('volunteer_id', v_vol, 'period_from', '2027-01-01', 'period_to', '2027-06-30',
        'status_end_period_id', (select id from public.ref_khld_so30_status_end_period where code like 'inactive%'),
        'recognition_given_id', (select id from public.ref_khld_so30_recognition_given where code = 'no'),
        'continue_intent_id', (select id from public.ref_khld_so30_continue_intent where code = 'undecided'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_so30_inactive_reason_required' then
      raise exception '0148: an inactive volunteer without a reason was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_volunteer_tracking', jsonb_build_object(
      'row', jsonb_build_object('volunteer_id', v_vol, 'period_from', '2027-01-01', 'period_to', '2027-06-30',
        'status_end_period_id', (select id from public.ref_khld_so30_status_end_period where code like 'inactive%'),
        'inactive_reason_id', (select id from public.ref_khld_so30_inactive_reason where code = 'health_reasons'),
        'recognition_given_id', (select id from public.ref_khld_so30_recognition_given where code = 'no'),
        'continue_intent_id', (select id from public.ref_khld_so30_continue_intent where code = 'undecided'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: tracking insert failed: %', v_res; end if;

    -- 6. SO2-D1 and SO2-D2: an activity, its sheet, the count cells; an
    --    estimate needs its basis; the figures follow the cells
    v_res := public.save_khld_record('khld_activity', jsonb_build_object(
      'row', jsonb_build_object('event_title', '0148 probe activity', 'event_date', '2027-04-10',
        'location_id', (select id from public.ref_khld_d1_location where code = 'sports_field'),
        'activity_type_id', (select id from public.ref_khld_d1_activity_type where code = 'sports_activity_or_tournament'),
        'calendar_status_id', (select id from public.ref_khld_d1_calendar_status where code = 'no_ad_hoc_or_one_off'),
        'frequency_type_id', (select id from public.ref_khld_d1_frequency_type where code = 'one_off'),
        'organiser_id', (select id from public.ref_khld_d1_organiser where code = 'municipality_alone'),
        'partner_count', 0, 'content_summary', 'probe', 'participants_planned', 10, 'participants_actual', 12,
        'cash_cost_jod', 0, 'feedback_collected_id', (select id from public.ref_khld_d1_feedback_collected where code = 'no'), 'lessons', 'probe')));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: activity insert failed: %', v_res; end if;
    v_act := (v_res->>'id')::uuid;
    if v_res->>'reference' <> 'KHLD-EV-2027-01' then raise exception '0148: the activity reference is %', v_res->>'reference'; end if;
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act,
        'count_method_id', (select id from public.ref_khld_d2_count_method where code = 'organisers_estimate'),
        'counters', 'probe', 'total_participants', 12, 'staff_volunteers', 0,
        'register_attached_id', (select id from public.ref_khld_d2_register_attached where code = 'partly'),
        'consent_informed_id', (select id from public.ref_khld_d2_consent_informed where code = 'no'),
        'photo_consent_id', (select id from public.ref_khld_d2_photo_consent where code = 'no_photographs_taken'),
        'duplicate_check_id', (select id from public.ref_khld_d2_duplicate_check where code = 'not_possible'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_d2_estimate_basis_required' then
      raise exception '0148: an undocumented estimate was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act,
        'count_method_id', (select id from public.ref_khld_d2_count_method where code = 'tally_by_activity_station'),
        'counters', 'probe', 'total_participants', 12, 'staff_volunteers', 0,
        'register_attached_id', (select id from public.ref_khld_d2_register_attached where code = 'partly'),
        'consent_informed_id', (select id from public.ref_khld_d2_consent_informed where code = 'no'),
        'photo_consent_id', (select id from public.ref_khld_d2_photo_consent where code = 'no_photographs_taken'),
        'duplicate_check_id', (select id from public.ref_khld_d2_duplicate_check where code = 'yes')),
      'count_fields', jsonb_build_array('by_sex'),
      'counts', jsonb_build_array(
        jsonb_build_object('field_code', 'by_sex', 'cell_id', (select id from public.ref_khld_d2_by_sex where code = 'female'), 'count', 7),
        jsonb_build_object('field_code', 'by_sex', 'cell_id', (select id from public.ref_khld_d2_by_sex where code = 'male'), 'count', 5))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_d2_repeat_participants_required' then
      raise exception '0148: a duplicate check without its number was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act,
        'count_method_id', (select id from public.ref_khld_d2_count_method where code = 'tally_by_activity_station'),
        'counters', 'probe', 'total_participants', 12, 'staff_volunteers', 0, 'repeat_participants', 2,
        'register_attached_id', (select id from public.ref_khld_d2_register_attached where code = 'partly'),
        'consent_informed_id', (select id from public.ref_khld_d2_consent_informed where code = 'no'),
        'photo_consent_id', (select id from public.ref_khld_d2_photo_consent where code = 'no_photographs_taken'),
        'duplicate_check_id', (select id from public.ref_khld_d2_duplicate_check where code = 'yes')),
      'count_fields', jsonb_build_array('by_sex'),
      'counts', jsonb_build_array(
        jsonb_build_object('field_code', 'by_sex', 'cell_id', (select id from public.ref_khld_d2_by_sex where code = 'female'), 'count', 7),
        jsonb_build_object('field_code', 'by_sex', 'cell_id', (select id from public.ref_khld_d2_by_sex where code = 'male'), 'count', 5))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: attendance insert failed: %', v_res; end if;
    v_att := (v_res->>'id')::uuid;
    if (select count(*) from public.khld_attendance_count where attendance_id = v_att) <> 2 then raise exception '0148: expected 2 count cells'; end if;
    v_res := public.khld_attendance_figures(v_att);
    if (v_res->>'agrees')::boolean is not true or (v_res->>'distinct_individuals')::int <> 10 then
      raise exception '0148: the attendance figures came back as %', v_res;
    end if;
    -- the cells replaced: one field, two rows become one
    v_res := public.save_khld_record('khld_attendance', jsonb_build_object(
      'id', v_att, 'row', '{}'::jsonb, 'count_fields', jsonb_build_array('by_sex'),
      'counts', jsonb_build_array(
        jsonb_build_object('field_code', 'by_sex', 'cell_id', (select id from public.ref_khld_d2_by_sex where code = 'female'), 'count', 12))));
    if (v_res->>'ok')::boolean is not true or (select count(*) from public.khld_attendance_count where attendance_id = v_att) <> 1 then
      raise exception '0148: the cells were not replaced: %', v_res;
    end if;

    -- 7. SO2-0: the facility ratings replaced with the feedback
    v_res := public.save_khld_record('khld_user_feedback', jsonb_build_object(
      'row', jsonb_build_object('activity_id', v_act, 'feedback_date', '2027-04-10',
        'collection_mode_id', (select id from public.ref_khld_so20_collection_mode where code = 'short_interview_at_the_exit'),
        'sex_id', (select id from public.ref_khld_sex where code = 'male'),
        'age_group_id', (select id from public.ref_khld_age_group where code = '15_24'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'syrian_registered'),
        'first_visit', true,
        'overall_satisfaction_id', (select id from public.ref_khld_so20_overall_satisfaction where code = 'satisfied'),
        'feel_safe_id', (select id from public.ref_khld_so20_feel_safe where code = 'mostly'),
        'feel_welcome_id', (select id from public.ref_khld_yes_fully_partly_no where code = 'yes_fully'),
        'suitable_women_children_id', (select id from public.ref_khld_so20_suitable_women_children where code = 'partly'),
        'participate_freely_id', (select id from public.ref_khld_so20_participate_freely where code = 'yes'),
        'activity_suitable_id', (select id from public.ref_khld_so20_activity_suitable where code = 'very_suitable'),
        'timing_convenient_id', (select id from public.ref_khld_so20_timing_convenient where code = 'yes'),
        'improve_most', 'probe', 'would_return_id', (select id from public.ref_khld_so20_would_return where code = 'yes')),
      'ratings', jsonb_build_array(
        jsonb_build_object('item_id', (select id from public.ref_khld_so20_facility_item where code = 'cleanliness'),
                           'rating_id', (select id from public.ref_khld_so20_facility_rating where code = 'good')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: feedback insert failed: %', v_res; end if;
    v_fb := (v_res->>'id')::uuid;
    v_res := public.save_khld_record('khld_user_feedback', jsonb_build_object(
      'id', v_fb, 'row', '{}'::jsonb,
      'ratings', jsonb_build_array(
        jsonb_build_object('item_id', (select id from public.ref_khld_so20_facility_item where code = 'cleanliness'),
                           'rating_id', (select id from public.ref_khld_so20_facility_rating where code = 'acceptable')),
        jsonb_build_object('item_id', (select id from public.ref_khld_so20_facility_item where code = 'lighting'),
                           'rating_id', (select id from public.ref_khld_so20_facility_rating where code = 'poor')))));
    if (v_res->>'ok')::boolean is not true or (select count(*) from public.khld_user_feedback_rating where feedback_id = v_fb) <> 2 then
      raise exception '0148: the ratings were not replaced: %', v_res;
    end if;

    -- 8. SO4-G1: the owner by national ID creates the enterprise; the reason
    --    follows the derived completion; the owner's second cycle is the same
    --    enterprise
    v_res := public.save_khld_record('khld_guidance_completion', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid2, 'full_name', '0148 Probe Owner', 'sex', 'female', 'phone', '0790000150'),
      'enterprise', '{}'::jsonb,
      'row', jsonb_build_object('cycle_year', (select id from public.ref_khld_g1_cycle_year where code = 'n_2027'),
        'enterprise_name', 'Probe pickles',
        'age_group_id', (select id from public.ref_khld_age_group where code = '35_49'),
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'enterprise_status_id', (select id from public.ref_khld_g1_enterprise_status where code = 'operating_not_licensed'),
        'peer_network_id', (select id from public.ref_khld_g1_peer_network where code = 'no'),
        'non_completion_reason_id', (select id from public.ref_khld_g1_non_completion_reason where code = 'not_applicable_completed'),
        'referral_made_id', (select id from public.ref_khld_g1_referral_made where code = 'no'),
        'certificate_id', (select id from public.ref_khld_g1_certificate where code = 'due_but_not_yet_issued'),
        's1_status_id', (select id from public.ref_khld_session_attendance where code = 'attended'),
        's2_status_id', (select id from public.ref_khld_session_attendance where code = 'attended'),
        's3_status_id', (select id from public.ref_khld_g1_s3_hygiene where code = 'attended'),
        's4_status_id', (select id from public.ref_khld_session_attendance where code = 'attended'),
        's5_status_id', (select id from public.ref_khld_session_attendance where code = 'attended'))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: guidance completion insert failed: %', v_res; end if;
    v_g1 := (v_res->>'id')::uuid;
    v_ent := (v_res->>'enterprise_id')::uuid;
    if v_res->>'enterprise_reference' <> 'KHLD-ENT-001' then raise exception '0148: the enterprise reference is %', v_res->>'enterprise_reference'; end if;
    if (select owner_person_id from public.khld_enterprise where id = v_ent) <> (select id from public.person where national_id = v_nid2)
       or (select owner_name from public.khld_enterprise where id = v_ent) <> '0148 Probe Owner'
       or (select enterprise_name from public.khld_enterprise where id = v_ent) <> 'Probe pickles' then
      raise exception '0148: the enterprise was not filled from the owner and the sheet';
    end if;
    if (select completion from public.khld_guidance_completion where id = v_g1) <> 'completed' then raise exception '0148: completion was not derived'; end if;
    if (select age_unrecorded_reason from public.person where national_id = v_nid2) is distinct from 'khld_band_only' then
      raise exception '0148: the owner created from a band-only sheet does not say why the age is empty';
    end if;
    -- and the Sahel Horan invariant stands: a person with neither and no reason is refused
    begin
      insert into public.person (national_id, full_name) values ('399000993', '0148 no age');
      raise exception '0148: a person with neither an age nor a reason was accepted';
    exception when check_violation then null; end;
    v_res := public.save_khld_record('khld_guidance_completion', jsonb_build_object(
      'id', v_g1, 'row', jsonb_build_object('s2_status_id', (select id from public.ref_khld_session_attendance where code = 'did_not_attend'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_g1_reason_required' then
      raise exception '0148: a missed session with a Not applicable reason was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_guidance_completion', jsonb_build_object(
      'id', v_g1, 'row', jsonb_build_object('s2_status_id', (select id from public.ref_khld_session_attendance where code = 'did_not_attend'),
        'non_completion_reason_id', (select id from public.ref_khld_g1_non_completion_reason where code = 'lost_interest'))));
    if (v_res->>'ok')::boolean is not true or (select completion from public.khld_guidance_completion where id = v_g1) <> 'not_completed' then
      raise exception '0148: the reason with the missed session was refused: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_guidance_completion', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid2, 'full_name', 'x', 'sex', 'female'),
      'row', (select jsonb_build_object('cycle_year', (select id from public.ref_khld_g1_cycle_year where code = 'n_2028'),
                'age_group_id', age_group_id, 'nationality_id', nationality_id, 'enterprise_status_id', enterprise_status_id,
                'peer_network_id', peer_network_id, 'non_completion_reason_id', non_completion_reason_id,
                'referral_made_id', referral_made_id, 'certificate_id', certificate_id)
                from public.khld_guidance_completion where id = v_g1)));
    if (v_res->>'ok')::boolean is not true or (v_res->>'enterprise_id')::uuid <> v_ent then
      raise exception '0148: the owner''s second cycle did not find the enterprise: %', v_res;
    end if;
    if (select count(*) from public.khld_enterprise where owner_person_id = (select id from public.person where national_id = v_nid2)) <> 1 then
      raise exception '0148: the enterprise was created twice';
    end if;

    -- 9. SO4-H1 and SO4-H2: the vendor by national ID, once across markets;
    --    the stall fee when not free
    v_res := public.save_khld_record('khld_market', jsonb_build_object(
      'row', jsonb_build_object('market_name', '0148 probe market', 'market_date', '2027-05-14',
        'occasion_id', (select id from public.ref_khld_h1_occasion where code = 'regular_friday_market_day'),
        'phase_id', (select id from public.ref_khld_h1_phase where code = 'pilot_phase'),
        'location_id', (select id from public.ref_khld_h1_location where code = 'open_central_space'),
        'stalls_offered', 10, 'stalls_occupied', 8, 'applications_received', 12,
        'selection_method_id', (select id from public.ref_khld_h1_selection_method where code = 'open_to_all_who_applied'),
        'fee_charged', false, 'accessibility_id', (select id from public.ref_khld_h1_accessibility where code = 'fully_accessible'),
        'visitors_estimated', 200, 'hygiene_check_id', (select id from public.ref_khld_h1_hygiene_check where code = 'no_not_carried_out'),
        'total_sales_jod', 0, 'cash_cost_jod', 0,
        'feedback_collected_id', (select id from public.ref_khld_h1_feedback_collected where code = 'no'), 'lessons', 'probe')));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: market insert failed: %', v_res; end if;
    v_mkt := (v_res->>'id')::uuid;
    v_res := public.save_khld_record('khld_vendor_registration', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid3, 'full_name', '0148 Probe Vendor', 'sex', 'female',
                                   'phone', '0790000151', 'date_of_birth', '1985-01-01'),
      'row', jsonb_build_object('market_id', v_mkt,
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'vendor_type_id', (select id from public.ref_khld_h2_vendor_type where code = 'home_based_food_business'),
        'licensed_id', (select id from public.ref_khld_h2_licensed where code = 'no'),
        'health_certificate_id', (select id from public.ref_khld_h2_health_certificate where code = 'no'),
        'first_organised_market', true,
        'nominated_by_id', (select id from public.ref_khld_h2_nominated_by where code = 'invited_by_the_municipality'),
        'stall_number', 'A3', 'stall_free', false,
        'commitment_signed_id', (select id from public.ref_khld_h2_commitment_signed where code = 'yes'),
        'attended_id', (select id from public.ref_khld_h2_attended where code = 'whole'),
        'consent_id', (select id from public.ref_khld_h2_consent where code = 'yes_to_both'))));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_h2_stall_fee_required' then
      raise exception '0148: a paid stall without its fee was accepted: %', v_res;
    end if;
    if exists (select 1 from public.person where national_id = v_nid3) or exists (select 1 from public.khld_vendor) then
      raise exception '0148: a refused registration left its person or vendor behind';
    end if;
    v_res := public.save_khld_record('khld_vendor_registration', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid3, 'full_name', '0148 Probe Vendor', 'sex', 'female',
                                   'phone', '0790000151', 'date_of_birth', '1985-01-01'),
      'row', jsonb_build_object('market_id', v_mkt,
        'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
        'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
        'neighbourhood_id', (select id from public.ref_khld_neighbourhood where code = 'al_mabrouka'),
        'vendor_type_id', (select id from public.ref_khld_h2_vendor_type where code = 'home_based_food_business'),
        'licensed_id', (select id from public.ref_khld_h2_licensed where code = 'no'),
        'health_certificate_id', (select id from public.ref_khld_h2_health_certificate where code = 'no'),
        'first_organised_market', true,
        'nominated_by_id', (select id from public.ref_khld_h2_nominated_by where code = 'invited_by_the_municipality'),
        'stall_number', 'A3', 'stall_free', true,
        'commitment_signed_id', (select id from public.ref_khld_h2_commitment_signed where code = 'yes'),
        'attended_id', (select id from public.ref_khld_h2_attended where code = 'whole'),
        'consent_id', (select id from public.ref_khld_h2_consent where code = 'yes_to_both')),
      'option_questions', jsonb_build_array('priority_flags'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'priority_flags',
        'option_id', (select id from public.ref_khld_h2_priority_flags where code = 'woman')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: vendor registration failed: %', v_res; end if;
    v_h2 := (v_res->>'id')::uuid;
    if v_res->>'vendor_reference' <> 'KHLD-VEN-001' then raise exception '0148: the vendor reference is %', v_res->>'vendor_reference'; end if;
    v_res := public.save_khld_record('khld_vendor_registration', jsonb_build_object(
      'person', jsonb_build_object('id_type', 'national_id', 'id_number', v_nid3),
      'row', (select jsonb_build_object('market_id', market_id, 'nationality_id', nationality_id, 'disability_id', disability_id,
                'neighbourhood_id', neighbourhood_id, 'vendor_type_id', vendor_type_id, 'licensed_id', licensed_id,
                'health_certificate_id', health_certificate_id, 'first_organised_market', false, 'nominated_by_id', nominated_by_id,
                'stall_number', 'A4', 'stall_free', true, 'commitment_signed_id', commitment_signed_id, 'attended_id', attended_id,
                'consent_id', consent_id) from public.khld_vendor_registration where id = v_h2)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_vendor_registration_market_vendor_live' then
      raise exception '0148: one vendor twice at one market was accepted: %', v_res;
    end if;
    if (select count(*) from public.khld_vendor) <> 1 then raise exception '0148: the vendor was created twice'; end if;

    -- 10. SO2-C2 and SO3-F3: participations merged by volunteer; the linked
    --     record follows the kind
    v_res := public.save_khld_record('khld_campaign', jsonb_build_object(
      'row', jsonb_build_object('campaign_date', '2027-03-20',
        'lead_organiser_id', (select id from public.ref_khld_c2_lead_organiser where code = 'municipality'),
        'volunteers_total', 2, 'new_volunteers', 0, 'person_hours', 6, 'materials', 'probe', 'outputs', 'probe',
        'safety_briefing_id', (select id from public.ref_khld_c2_safety_briefing where code = 'yes_both'),
        'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'municipal_supervision_id', (select id from public.ref_khld_c2_municipal_supervision where code = 'no'),
        'remaining_work', 'probe'),
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol, 'hours', 3))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: campaign insert failed: %', v_res; end if;
    v_cmp := (v_res->>'id')::uuid;
    if (select count(*) from public.khld_volunteer_participation where campaign_id = v_cmp) <> 1
       or (select participated_on from public.khld_volunteer_participation where campaign_id = v_cmp) <> date '2027-03-20' then
      raise exception '0148: the participation was not written with the campaign date';
    end if;
    v_res := public.save_khld_record('khld_campaign', jsonb_build_object(
      'id', v_cmp, 'row', '{}'::jsonb,
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol, 'hours', 4, 'verified', true),
                                          jsonb_build_object('volunteer_id', v_vol2))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: campaign re-save failed: %', v_res; end if;
    if (select count(*) from public.khld_volunteer_participation where campaign_id = v_cmp) <> 2
       or (select hours from public.khld_volunteer_participation where campaign_id = v_cmp and volunteer_id = v_vol) <> 4
       or (select verified from public.khld_volunteer_participation where campaign_id = v_cmp and volunteer_id = v_vol) is not true then
      raise exception '0148: participations were not merged by volunteer';
    end if;
    v_res := public.save_khld_record('khld_action_day', jsonb_build_object(
      'row', jsonb_build_object('date', '2027-03-27',
        'location_id', (select id from public.ref_khld_f3_location where code = 'al_khalidiyah_public_park_rehabilitated_section'),
        'linked_kind_id', (select id from public.ref_khld_f3_linked_records where code = 'campaign'),
        'called_by_id', (select id from public.ref_khld_f3_called_by where code = 'municipality'),
        'volunteers_total', 1, 'new_registrations', 0, 'person_hours', 3, 'roles_assigned', false,
        'tasks_completed', 'probe', 'materials', 'probe', 'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'supervisor', 'probe', 'remaining_tasks', 'probe')));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_f3_linked_record_required' then
      raise exception '0148: an action day linked to a campaign without one was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_action_day', jsonb_build_object(
      'row', jsonb_build_object('date', '2027-03-27',
        'location_id', (select id from public.ref_khld_f3_location where code = 'al_khalidiyah_public_park_rehabilitated_section'),
        'linked_kind_id', (select id from public.ref_khld_f3_linked_records where code = 'stand_alone'), 'campaign_id', v_cmp,
        'called_by_id', (select id from public.ref_khld_f3_called_by where code = 'municipality'),
        'volunteers_total', 1, 'new_registrations', 0, 'person_hours', 3, 'roles_assigned', false,
        'tasks_completed', 'probe', 'materials', 'probe', 'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'supervisor', 'probe', 'remaining_tasks', 'probe')));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_f3_linked_record_mismatch' then
      raise exception '0148: a stand-alone action day with a campaign link was accepted: %', v_res;
    end if;
    v_res := public.save_khld_record('khld_action_day', jsonb_build_object(
      'row', jsonb_build_object('date', '2027-03-27',
        'location_id', (select id from public.ref_khld_f3_location where code = 'al_khalidiyah_public_park_rehabilitated_section'),
        'linked_kind_id', (select id from public.ref_khld_f3_linked_records where code = 'campaign'), 'campaign_id', v_cmp,
        'called_by_id', (select id from public.ref_khld_f3_called_by where code = 'municipality'),
        'volunteers_total', 1, 'new_registrations', 0, 'person_hours', 3, 'roles_assigned', false,
        'tasks_completed', 'probe', 'materials', 'probe', 'incident_id', (select id from public.ref_khld_incident where code = 'no'),
        'supervisor', 'probe', 'remaining_tasks', 'probe'),
      'participations', jsonb_build_array(jsonb_build_object('volunteer_id', v_vol, 'hours', 3, 'verified', true))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: action day insert failed: %', v_res; end if;
    v_ad := (v_res->>'id')::uuid;
    if v_res->>'reference' <> 'KHLD-AD-2027-01' then raise exception '0148: the action day reference is %', v_res->>'reference'; end if;
    if (select count(*) from public.khld_volunteer_participation where volunteer_id = v_vol and verified and deleted_at is null) <> 2 then
      raise exception '0148: the volunteer should have two verified participations';
    end if;

    -- 11. a milestone: the checklist rows through the save, the status from them
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object(
      'row', jsonb_build_object('milestone_code', 'SO3-F1', 'verif_date', '2027-01-15', 'verif_by', 'probe', 'gaps', 'probe',
        'launch_date', '2026-11-01'),
      'checklist', jsonb_build_array(
        jsonb_build_object('item_no', 3, 'field_code', 'procedures_approved', 'status_id', (select id from public.ref_khld_f1_procedures_approved where code = 'in_place_decision_no_and_date'), 'detail', 'decision 12/2026'),
        jsonb_build_object('item_no', 5, 'field_code', 'database_established', 'status_id', (select id from public.ref_khld_f1_database_established where code = 'in_place')),
        jsonb_build_object('item_no', 7, 'field_code', 'registration_form', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')),
        jsonb_build_object('item_no', 9, 'field_code', 'assignment_procedure', 'status_id', (select id from public.ref_khld_checklist_status where code = 'partly'))),
      'option_questions', jsonb_build_array('f1_evidence_attached'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'f1_evidence_attached',
        'option_id', (select id from public.ref_khld_f1_evidence_attached where code = 'adoption_decision')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0148: milestone insert failed: %', v_res; end if;
    v_ms := (v_res->>'id')::uuid;
    if (public.khld_milestone_status(v_ms))->>'status' <> 'partly_established' then
      raise exception '0148: SO3-F1 with three In place and one Partly should read partly_established: %', public.khld_milestone_status(v_ms);
    end if;
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object(
      'id', v_ms, 'row', '{}'::jsonb,
      'checklist', jsonb_build_array(
        jsonb_build_object('item_no', 3, 'field_code', 'procedures_approved', 'status_id', (select id from public.ref_khld_f1_procedures_approved where code = 'in_place_decision_no_and_date')),
        jsonb_build_object('item_no', 5, 'field_code', 'database_established', 'status_id', (select id from public.ref_khld_f1_database_established where code = 'in_place')),
        jsonb_build_object('item_no', 7, 'field_code', 'registration_form', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')),
        jsonb_build_object('item_no', 9, 'field_code', 'assignment_procedure', 'status_id', (select id from public.ref_khld_checklist_status where code = 'in_place')))));
    if (v_res->>'ok')::boolean is not true or (public.khld_milestone_status(v_ms))->>'status' <> 'established' then
      raise exception '0148: the replaced checklist did not read established: %', v_res;
    end if;
    -- an SO1-A1 option on this SO3-F1 verification is refused, and the earlier option survives the refused save
    v_res := public.save_khld_record('khld_milestone_verification', jsonb_build_object(
      'id', v_ms, 'row', '{}'::jsonb,
      'option_questions', jsonb_build_array('f1_evidence_attached'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'f1_evidence_attached',
        'option_id', (select id from public.ref_khld_a1_evidence_attached where code = 'council_decision')))));
    if v_res->>'result' <> 'invalid' then raise exception '0148: an option from another milestone''s list was accepted: %', v_res; end if;
    if (select count(*) from public.khld_milestone_verification_option where verification_id = v_ms) <> 1 then
      raise exception '0148: a refused save destroyed the evidence options';
    end if;

    reset role;
    raise exception using errcode = 'P0148', message = 'rollback the probe';
  exception
    when sqlstate 'P0148' then null;
  end;

  if exists (select 1 from public.person where national_id in (v_nid1, v_nid2, v_nid3, '399000993') or unhcr_number = v_unhcr)
     or exists (select 1 from public.khld_volunteer) or exists (select 1 from public.khld_partner)
     or exists (select 1 from public.khld_enterprise) or exists (select 1 from public.khld_vendor)
     or exists (select 1 from public.khld_activity) or exists (select 1 from public.khld_campaign)
     or exists (select 1 from public.khld_milestone_verification) or exists (select 1 from public.khld_reference_counter) then
    raise exception '0148: probe rows survived the rollback';
  end if;
end $verify$;
