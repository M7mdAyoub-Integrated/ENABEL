-- ═══════════════════════════════════════════════════════════════════════════
--  0060 — "already applied" is a fact to be checked, not inferred from a
--         constraint name
--
--  0054's handler mapped ANY unique_violation to already_applied. That was a
--  guess dressed as an answer: it was equally true of a soft-deleted row
--  blocking the slot (OQ-24, fixed in 0059) and of a client_uuid replay.
--  Someone whose application had been withdrawn would be told, forever, that
--  they had already applied.
--
--  0059 removes most of the ambiguity: the (person, opportunity) indexes are
--  now partial, so a violation there means a LIVE row genuinely exists and
--  already_applied is true rather than assumed.
--
--  What remains is client_uuid, which stays global on purpose (it is the
--  offline idempotency key). A collision there means this exact submission was
--  seen before -- but the row it created may since have been withdrawn. So the
--  handler LOOKS, and answers from what it finds:
--
--      live row for this person and opportunity   -> already_applied
--      the client_uuid exists but is soft-deleted -> withdrawn
--      neither                                    -> cannot_verify, not a guess
--
--  `withdrawn` is a new outcome because the honest answer is neither of the
--  existing two. Telling someone "you have already applied" when staff removed
--  their application sends them away satisfied and wrong.
-- ═══════════════════════════════════════════════════════════════════════════

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
  p_client_uuid      uuid    default null,
  p_product_ids      uuid[]  default null
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
  v_reg_id   uuid;
  v_open     boolean;
  v_cap      int;
  v_taken    int;
  v_exists   boolean;
  v_withdrawn boolean;
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

  -- A LIVE application only. A withdrawn one is not an application.
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
              'submitted'::record_status_t, true, p_client_uuid)
      returning id into v_reg_id;

      if p_product_ids is not null and array_length(p_product_ids, 1) > 0 then
        insert into exhibition_registration_product (registration_id, product_id)
        select v_reg_id, rp.id
          from ref_product rp
         where rp.id = any(p_product_ids)
           and rp.is_active
           and rp.deleted_at is null
        on conflict do nothing;
      end if;
    end if;
  exception
    when unique_violation then
      -- LOOK, do not infer. See this migration's header.
      if p_opportunity_type = 'training' then
        select exists (select 1 from training_enrolment
                        where person_id = v_person_id and session_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from training_enrolment
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      elsif p_opportunity_type = 'advisory' then
        select exists (select 1 from advisory_enrolment
                        where person_id = v_person_id and session_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from advisory_enrolment
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      else
        select exists (select 1 from exhibition_registration
                        where person_id = v_person_id and exhibition_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from exhibition_registration
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      end if;

      if v_exists then
        return jsonb_build_object('ok', true, 'result', 'already_applied');
      elsif v_withdrawn then
        return jsonb_build_object('ok', false, 'result', 'withdrawn');
      else
        return c_fail;
      end if;
    when others then
      return jsonb_build_object('ok', false, 'result', 'not_open');
  end;

  return jsonb_build_object('ok', true, 'result', 'applied');
end;
$$;

revoke all on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]) from public;
grant execute on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]) to anon, authenticated;
