-- ═══════════════════════════════════════════════════════════════════════════
--  0058 — the exhibition application carries what the producer makes
--
--  `exhibition_registration_product` is a junction, and the form asks what the
--  producer sells. 0054 could not write it: the RPC had nowhere to put the
--  answer, so an exhibition application would have landed with a producer type
--  and no products.
--
--  ── WHY THE ARRAY AND THE REGISTRATION ARE WRITTEN TOGETHER ──
--
--  Same transaction, same function. A registration with its products missing is
--  not a smaller version of the record -- E0.2 counts distinct people so it does
--  not care, but the market team plans stalls by product, and a half-written
--  registration is worse than a refused one because nobody knows it is
--  incomplete.
--
--  ── SIGNATURE CHANGE, SO THE OLD ONE IS DROPPED ──
--
--  Adding a parameter creates an OVERLOAD rather than replacing the function,
--  and PostgREST would then choose by argument shape. Two functions with the
--  same name and different behaviour is exactly what 0053 avoided when it
--  dropped the two-argument applicant_prefill. Same treatment here.
--
--  Products are OPTIONAL: the junction has no NOT NULL requirement and a
--  producer may genuinely not have decided. An empty array writes no rows.
--  Unknown or inactive product ids are filtered rather than rejected, so a
--  stale page cannot fail a whole application over one retired option.
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
              'submitted'::record_status_t, true, p_client_uuid)
      returning id into v_reg_id;

      -- Filtered against the live reference list rather than trusted. A stale
      -- page holding a retired product must not fail the whole application,
      -- and an id the caller invented must not reach the junction.
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
      return jsonb_build_object('ok', true, 'result', 'already_applied');
    when others then
      return jsonb_build_object('ok', false, 'result', 'not_open');
  end;

  return jsonb_build_object('ok', true, 'result', 'applied');
end;
$$;

-- The 10-argument form is dropped, not left as an overload: PostgREST would
-- pick by argument shape and two versions of an auth-bearing function is
-- exactly what 0053 refused to leave lying around.
drop function if exists public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid);

revoke all on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]) from public;
grant execute on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]) to anon, authenticated;

comment on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]) is
  'The public application, for all three opportunity types. security definer and '
  'callable by anon, so it is the entire security boundary. Every identity '
  'failure returns the same cannot_verify so the endpoint cannot be used as an '
  'existence oracle. Registering REQUIRES a date of birth (OQ-22). Advisory '
  'requires a completed training, matching v_ind_a1_3 exactly. Always writes '
  'status = submitted: an application never self-approves.';
