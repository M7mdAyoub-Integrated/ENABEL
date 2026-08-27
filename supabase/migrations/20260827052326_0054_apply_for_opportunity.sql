-- ═══════════════════════════════════════════════════════════════════════════
--  0054 — apply_for_opportunity(): the public application, one entry point
--
--  Training, advisory and exhibition are three tables, but one act: a member of
--  the public asks to take part. One function, so the rules cannot drift and
--  the front end has one thing to call.
--
--  This runs as `anon`, so it is security definer and IT IS THE ENTIRE
--  BOUNDARY. Everything below is written on the assumption that the caller is
--  hostile and the arguments are attacker-controlled.
--
--  ── ONE FAILURE VALUE FOR EVERYTHING ABOUT IDENTITY ──
--
--  `cannot_verify` is returned for ALL of these, and they must stay
--  indistinguishable:
--
--    • the national ID is on file and the date of birth did not match
--    • the national ID is on file, has no DOB, and the phone did not match
--    • the national ID is NOT on file and the registration details were
--      incomplete
--    • the national ID was claimed by someone else between the check and the
--      insert
--    • the caller is out of throttle budget
--
--  The second and fourth cases are the ones that matter. If "this ID is already
--  registered" were its own answer, the apply endpoint would become the
--  existence oracle that applicant_prefill was carefully built not to be.
--
--  A HONEST ADMISSION about what this cannot fully close: a registration
--  attempt either succeeds or does not, and that is itself one bit about
--  whether an ID is on file. It cannot be designed away while national_id is
--  unique and one person is one row. The throttle is the control, and
--  registration consumes the same budget as a lookup.
--
--  ── WHY A MISTYPED ID CANNOT QUIETLY CREATE A SECOND PERSON ──
--
--  The insert is `on conflict (national_id) do nothing`. If a typo lands on a
--  national ID that already exists, the insert writes NOTHING and the caller
--  gets cannot_verify. It cannot register over an existing participant, and it
--  cannot create a duplicate, because the unique constraint decides -- not a
--  prior SELECT that another transaction could invalidate.
--
--  ── DATE OF BIRTH IS REQUIRED TO REGISTER (OQ-22) ──
--
--  A new person created through the public path ALWAYS has a date of birth.
--  This is the half of OQ-22 that 0053 could not implement, and it is what
--  stops the no-DOB population growing. Staff-side entry is unaffected and may
--  still record an age instead.
--
--  ── ELIGIBILITY ──
--
--  Advisory requires a COMPLETED training -- met_criteria is true, not merely
--  applied, accepted or attended. Enforced here rather than left to step 5,
--  because an unenforced gate on a live public endpoint is a hole, not a
--  to-do. Step 5 adds the trigger so staff-side inserts are covered too; this
--  function is the public half of the same rule.
-- ═══════════════════════════════════════════════════════════════════════════

-- Symmetry with exhibition_registration, which has carried this since 0009.
-- Without it there is no way to tell a public application from a staff-entered
-- one: anon has no auth.uid(), so created_by is null either way.
alter table public.training_enrolment
  add column if not exists submitted_by_participant boolean not null default false;
alter table public.advisory_enrolment
  add column if not exists submitted_by_participant boolean not null default false;

comment on column public.training_enrolment.submitted_by_participant is
  'True when the row came from the public application form rather than staff '
  'entry. created_by cannot distinguish them: anon has no auth.uid().';

create or replace function public.apply_for_opportunity(
  p_opportunity_id   uuid,
  p_opportunity_type text,
  p_national_id      text,
  p_date_of_birth    date    default null,
  p_phone            text    default null,
  -- Used only when the national ID is not already on file.
  p_full_name        text    default null,
  p_sex              text    default null,
  p_village          text    default null,
  -- Exhibition only.
  p_producer_type_id uuid    default null,
  -- Offline resync: the same client_uuid must never create a second row.
  p_client_uuid      uuid    default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id       text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone    text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client   text;
  v_ok       boolean;
  v_person   person%rowtype;
  v_person_id uuid;
  v_open     boolean;
  v_cap      int;
  v_taken    int;
  v_exists   boolean;
  c_fail     constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  if p_opportunity_type not in ('training', 'advisory', 'exhibition') then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  v_client := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown');

  -- Applying costs the same budget as looking up, so registration cannot be
  -- used as a cheaper oracle than applicant_prefill.
  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;
  if not v_ok then
    return c_fail;
  end if;

  -- ── 1. identity ────────────────────────────────────────────────────────
  select * into v_person from person where national_id = v_id and deleted_at is null;

  if found then
    -- Same asymmetric rule as applicant_prefill (0053): no downgrade from a
    -- date of birth that exists to a phone number.
    if v_person.date_of_birth is not null then
      if p_date_of_birth is null or v_person.date_of_birth <> p_date_of_birth then
        return c_fail;
      end if;
    else
      if length(v_phone) < 9
         or right(regexp_replace(coalesce(v_person.phone,''), '\D','','g'), 9) <> v_phone then
        return c_fail;
      end if;
    end if;
    v_person_id := v_person.id;
  else
    -- Registering. DOB is mandatory here and nowhere else -- see OQ-22.
    if coalesce(btrim(p_full_name), '') = '' or p_date_of_birth is null then
      return c_fail;
    end if;
    if p_date_of_birth > current_date or p_date_of_birth < current_date - interval '120 years' then
      return c_fail;
    end if;

    insert into person (national_id, full_name, date_of_birth, sex, village, phone)
    values (v_id, btrim(p_full_name), p_date_of_birth,
            nullif(p_sex,'')::sex_t, nullif(btrim(coalesce(p_village,'')),''),
            nullif(btrim(coalesce(p_phone,'')),''))
    on conflict (national_id) do nothing
    returning id into v_person_id;

    -- Lost the race, or a typo landed on an ID that already exists. Either way
    -- nothing was written and the caller learns nothing.
    if v_person_id is null then
      return c_fail;
    end if;
  end if;

  -- ── 2. is the opportunity actually open? ───────────────────────────────
  -- Re-checked here rather than trusted from the page, which may be minutes old.
  if p_opportunity_type = 'training' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats
      into v_open, v_cap
      from training_session where id = p_opportunity_id and deleted_at is null;
  elsif p_opportunity_type = 'advisory' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats
      into v_open, v_cap
      from advisory_session where id = p_opportunity_id and deleted_at is null;
  else
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           booth_capacity
      into v_open, v_cap
      from exhibition where id = p_opportunity_id and deleted_at is null;
  end if;

  if v_open is null or not v_open then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- ── 3. eligibility ────────────────────────────────────────────────────
  -- Advisory needs a COMPLETED training. Applied, accepted and attended are
  -- all insufficient: met_criteria is the gate, the same one A1.3 counts.
  if p_opportunity_type = 'advisory' then
    if not exists (
      select 1 from training_enrolment te
       where te.person_id = v_person_id
         and te.deleted_at is null
         and te.met_criteria is true
    ) then
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_training');
    end if;
  end if;

  -- ── 4. already applied? ───────────────────────────────────────────────
  -- client_uuid first: a phone that lost signal and resent must not create a
  -- second application. Then the person/opportunity pair, for someone who
  -- simply pressed apply twice.
  if p_opportunity_type = 'training' then
    select exists (select 1 from training_enrolment
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and session_id = p_opportunity_id)))
      into v_exists;
  elsif p_opportunity_type = 'advisory' then
    select exists (select 1 from advisory_enrolment
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and session_id = p_opportunity_id)))
      into v_exists;
  else
    select exists (select 1 from exhibition_registration
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and exhibition_id = p_opportunity_id)))
      into v_exists;
  end if;

  if v_exists then
    return jsonb_build_object('ok', true, 'result', 'already_applied');
  end if;

  -- ── 5. capacity ───────────────────────────────────────────────────────
  -- Counted against APPROVED rows, matching v_public_opportunity and the
  -- exhibition trigger. A null capacity means no stated limit, not zero.
  if v_cap is not null then
    if p_opportunity_type = 'training' then
      select count(*) into v_taken from training_enrolment
       where session_id = p_opportunity_id and deleted_at is null
         and application_status = 'approved'::record_status_t;
    elsif p_opportunity_type = 'advisory' then
      select count(*) into v_taken from advisory_enrolment
       where session_id = p_opportunity_id and deleted_at is null
         and application_status = 'approved'::record_status_t;
    else
      select count(*) into v_taken from exhibition_registration
       where exhibition_id = p_opportunity_id and deleted_at is null
         and status = 'approved'::record_status_t;
    end if;
    if v_taken >= v_cap then
      return jsonb_build_object('ok', false, 'result', 'full');
    end if;
  end if;

  -- ── 6. write it ───────────────────────────────────────────────────────
  -- Always 'submitted'. An application is never self-approved: A1.3 counts
  -- met_criteria, and E0.2 counts approved registrations, so a public form
  -- that could write either would let anyone move a donor figure.
  begin
    if p_opportunity_type = 'training' then
      insert into training_enrolment
        (person_id, session_id, application_status, applied_on, client_uuid,
         submitted_by_participant)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true);
    elsif p_opportunity_type = 'advisory' then
      insert into advisory_enrolment
        (person_id, session_id, application_status, applied_on, client_uuid,
         submitted_by_participant)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true);
    else
      if p_producer_type_id is null then
        return c_fail;
      end if;
      -- is_first_time is left null on purpose: trg_exhibition_registration_check
      -- computes it from this person's history, which is more reliable than
      -- asking someone to remember.
      insert into exhibition_registration
        (exhibition_id, person_id, producer_type_id, is_first_time, status,
         submitted_by_participant, client_uuid)
      values (p_opportunity_id, v_person_id, p_producer_type_id, null,
              'submitted'::record_status_t, true, p_client_uuid);
    end if;
  exception
    when unique_violation then
      -- Two submissions raced. The other one won; this is not an error.
      return jsonb_build_object('ok', true, 'result', 'already_applied');
    when others then
      -- The exhibition trigger raises for ended/cancelled/full. Translated
      -- rather than passed through: a raw Postgres message on a public page is
      -- both unreadable and a disclosure.
      return jsonb_build_object('ok', false, 'result', 'not_open');
  end;

  return jsonb_build_object('ok', true, 'result', 'applied');
end;
$$;

revoke all on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid) from public;
grant execute on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid) to anon, authenticated;

comment on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid) is
  'The public application, for all three opportunity types. security definer and '
  'callable by anon, so it is the entire security boundary. Every identity '
  'failure returns the same cannot_verify so the endpoint cannot be used as an '
  'existence oracle, and registration consumes the same throttle budget as a '
  'lookup. Registering REQUIRES a date of birth (OQ-22). Always writes '
  'status = submitted: an application never self-approves, because A1.3 and '
  'E0.2 are counted from met_criteria and approved.';
