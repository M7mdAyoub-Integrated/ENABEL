-- ═══════════════════════════════════════════════════════════════════════════
--  0057 — the progression is enforced by the database, not by the form
--
--    Training   open to anyone
--    Advisory   requires a COMPLETED training
--    Linkage    requires a COMPLETED advisory
--
--  0054 enforced the advisory rule inside apply_for_opportunity, which covers
--  the public form and nothing else. A coordinator inserting an advisory
--  enrolment through the staff screens, or through PostgREST, or by hand,
--  bypassed it entirely. A rule that only one caller obeys is not a rule.
--
--  These triggers apply to EVERY writer, including a coordinator. That is
--  deliberate: the gate exists so the reported progression means something, and
--  a coordinator is exactly who would be under pressure to make an exception
--  the day before a report is due. If a genuine exception is needed, the
--  answer is to record the training that actually happened, not to skip the
--  check.
--
--  ── WHAT "COMPLETED" MEANS, AND WHY IT IS COPIED FROM v_ind_a1_3 ──
--
--  v_ind_a1_3 counts a person as trained when:
--        te.met_criteria is true
--    and te.deleted_at is null
--    and person.deleted_at is null
--    and training_session.deleted_at is null      <- easy to miss
--
--  The check below is the same four conditions. 0054's version omitted the
--  SESSION join, so soft-deleting a training session left people eligible while
--  A1.3 stopped counting them -- the gate and the indicator disagreeing about
--  the same word. Fixed here, in both places, so there is one definition.
--
--  ── DOES ELIGIBILITY SURVIVE A SOFT DELETE? NO. ──
--
--  A soft delete in this schema means "this record was entered in error or
--  withdrawn", not "this happened but we are archiving it" -- which is why
--  every indicator filters it out. So a soft-deleted completion is an assertion
--  that the completion did not validly happen, and the gate must agree with
--  A1.3 rather than keep its own memory.
--
--  ── BUT IT IS CHECKED ONCE, NOT CONTINUOUSLY ──
--
--  These fire BEFORE INSERT, and on UPDATE only when the person or the session
--  changes. They are NOT re-evaluated afterwards. If someone applies while
--  eligible and their training is soft-deleted next week, THE ADVISORY
--  ENROLMENT STAYS. Taking away a place already granted because of a later
--  administrative correction would be punishing the participant for a
--  data-entry decision they had no part in.
--
--  Do not "improve" this into a cascade or a continuously-enforced constraint.
--  The asymmetry is the design.
--
--  ── A HAZARD WORTH KNOWING (OQ-23) ──
--
--  Soft-deleting a training_session silently removes eligibility from everyone
--  who completed it. A coordinator tidying up a duplicate session could close
--  the advisory door on a whole cohort with no warning. Recorded rather than
--  guessed at.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.check_advisory_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from training_enrolment te
      join person p          on p.id  = te.person_id     and p.deleted_at  is null
      join training_session ts on ts.id = te.session_id  and ts.deleted_at is null
     where te.person_id = new.person_id
       and te.met_criteria is true
       and te.deleted_at is null
  ) then
    raise exception
      'advisory requires a completed training: person % has none on record',
      new.person_id
      using errcode = 'check_violation',
            hint = 'Record the completed training first. met_criteria must be true '
                   'and neither the enrolment nor its session may be deleted.';
  end if;
  return new;
end $$;

comment on function public.check_advisory_eligibility() is
  'The SO2 gate. Same four conditions as v_ind_a1_3 so the gate and the '
  'indicator cannot disagree about the word "completed". Checked at insert '
  'only -- a later soft delete does not revoke a place already granted.';

drop trigger if exists trg_advisory_enrolment_eligibility on public.advisory_enrolment;
create trigger trg_advisory_enrolment_eligibility
  before insert or update of person_id, session_id on public.advisory_enrolment
  for each row execute function public.check_advisory_eligibility();

-- ── linkage requires a completed advisory ────────────────────────────────
-- 0046's comment on linkage_request already promised this ("enforced by the
-- eligibility trigger, not by the UI"). Making the comment true.
--
-- NOTE: warn_linkage_without_training on market_linkage is left exactly as it
-- is. It only RAISES WARNING, and it guards a different table at a different
-- point -- the coordinator's match, not the producer's request. Turning a
-- warning into an exception on a table with live rows is a separate decision
-- with its own blast radius, and it is not this migration's business.
create or replace function public.check_linkage_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id     and p.deleted_at  is null
      join advisory_session s on s.id = ae.session_id    and s.deleted_at  is null
     where ae.person_id = new.person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
  ) then
    raise exception
      'market linkage requires a completed advisory: person % has none on record',
      new.person_id
      using errcode = 'check_violation',
            hint = 'The producer must complete a market advisory session first.';
  end if;
  return new;
end $$;

comment on function public.check_linkage_eligibility() is
  'The SO2 linkage gate. Mirrors check_advisory_eligibility one stage along. '
  'Checked at insert only.';

drop trigger if exists trg_linkage_request_eligibility on public.linkage_request;
create trigger trg_linkage_request_eligibility
  before insert or update of person_id on public.linkage_request
  for each row execute function public.check_linkage_eligibility();

-- Trigger functions are granted to nobody. See 0055.
revoke all on function public.check_advisory_eligibility() from public, anon, authenticated;
revoke all on function public.check_linkage_eligibility()  from public, anon, authenticated;

-- ── one definition, both places ──────────────────────────────────────────
-- apply_for_opportunity keeps its own pre-check so the public form can return
-- a clean `ineligible` instead of the trigger's exception being swallowed by
-- the catch-all and reported as `not_open`. It must therefore ask EXACTLY the
-- same question the trigger asks -- including the training_session join, which
-- the 0054 version was missing.
create or replace function public.apply_for_opportunity(
  p_opportunity_id   uuid,
  p_opportunity_type text,
  p_national_id      text,
  p_date_of_birth    date    default null,
  p_phone            text    default null,
  p_full_name        text    default null,
  p_sex              text    default null,
  p_village          text    default null,
  p_producer_type_id uuid    default null,
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

  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;
  if not v_ok then
    return c_fail;
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;

  if found then
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

    if v_person_id is null then
      return c_fail;
    end if;
  end if;

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

  -- The SAME four conditions as check_advisory_eligibility and v_ind_a1_3.
  -- The training_session join is what 0054 was missing.
  if p_opportunity_type = 'advisory' then
    if not exists (
      select 1
        from training_enrolment te
        join person pp           on pp.id = te.person_id  and pp.deleted_at is null
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.person_id = v_person_id
         and te.met_criteria is true
         and te.deleted_at is null
    ) then
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_training');
    end if;
  end if;

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
      insert into exhibition_registration
        (exhibition_id, person_id, producer_type_id, is_first_time, status,
         submitted_by_participant, client_uuid)
      values (p_opportunity_id, v_person_id, p_producer_type_id, null,
              'submitted'::record_status_t, true, p_client_uuid);
    end if;
  exception
    when unique_violation then
      return jsonb_build_object('ok', true, 'result', 'already_applied');
    when others then
      return jsonb_build_object('ok', false, 'result', 'not_open');
  end;

  return jsonb_build_object('ok', true, 'result', 'applied');
end;
$$;

revoke all on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid) from public;
grant execute on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid) to anon, authenticated;
