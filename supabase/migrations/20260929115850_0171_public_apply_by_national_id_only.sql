-- ═══════════════════════════════════════════════════════════════════════════
--  0171 — the public forms ask for the national ID only
--
--  The owner decided on 29 September 2026, after being told what it exposes,
--  that applying on the public site takes a national ID and nothing else:
--  no date of birth (or phone) to prove who is applying, and no limit on
--  attempts. Asked to choose between showing nothing back and prefilling,
--  the owner chose to prefill. 06_OPEN_QUESTIONS.md OQ-76 records the
--  decision and what it means: anyone who types a national ID on file sees
--  that person's name, sex, village and phone, can apply in their name, and
--  can see their applications; with no limit, the register can be read by
--  trying numbers.
--
--  The four functions the public site calls, each from its LIVE body
--  (pg_get_functiondef, 29 September 2026; the last files to write them are
--  0120 for applicant_prefill and my_applications, and 0120 / 0106 for
--  apply_for_opportunity and request_linkage -- grep -l "function
--  public.<name>" supabase/migrations/*.sql). In each, the two
--  bump_lookup_throttle calls and the date-of-birth / phone test go; nothing
--  else changes. The signatures stay, so the grants and every caller stay:
--  p_date_of_birth and p_phone are still accepted, and p_date_of_birth is
--  still stored for a new person when a caller sends one.
--
--  A new person may now be registered without a date of birth. person's
--  age_or_dob CHECK needs a date of birth, an age or a reason; the reason
--  'public_id_only' is added beside 'khld_band_only', and apply_for_opportunity
--  sets it. Such a person has no age, so the age breakdowns count them as
--  unknown (OQ-76).
--
--  bump_lookup_throttle and applicant_lookup_throttle stay: Khalidiyah's
--  public volunteer form (khld_register_volunteer, 0161) still uses them.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. a person the public form registered by national ID only ────────────
alter table public.person drop constraint person_age_unrecorded_reason_known;
alter table public.person add constraint person_age_unrecorded_reason_known
  check (age_unrecorded_reason in ('khld_band_only', 'public_id_only'));

-- ── 2. applicant_prefill ──────────────────────────────────────────────────
create or replace function public.applicant_prefill(p_national_id text, p_date_of_birth date default null::date, p_phone text default null::text, p_municipality_slug text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_muni    uuid;
  v_person  person%rowtype;
  c_miss    constant jsonb := jsonb_build_object('found', false);
begin
  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  -- The municipality whose page this came from; Sahel Horan when unsaid. A
  -- page that is not live gets the same nothing as an unknown ID.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
    return c_miss;
  end if;

  select * into v_person
    from person
   where national_id = v_id
     and deleted_at is null;

  if not found then
    return c_miss;
  end if;

  -- The national ID alone identifies the applicant (0171, OQ-76).
  return jsonb_build_object(
    'found',     true,
    'full_name', v_person.full_name,
    'sex',       v_person.sex,
    'village',   v_person.village,
    'phone',     v_person.phone
  );
end;
$function$;

-- ── 3. apply_for_opportunity ──────────────────────────────────────────────
create or replace function public.apply_for_opportunity(p_opportunity_id uuid, p_opportunity_type text, p_national_id text, p_date_of_birth date default null::date, p_phone text default null::text, p_full_name text default null::text, p_sex text default null::text, p_village text default null::text, p_producer_type_id uuid default null::uuid, p_client_uuid uuid default null::uuid, p_product_ids uuid[] default null::uuid[], p_municipality_slug text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id       text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person   person%rowtype;
  v_person_id uuid;
  v_reg_id   uuid;
  v_open     boolean;
  v_cap      int;
  v_taken    int;
  v_exists   boolean;
  v_withdrawn boolean;
  v_muni     uuid;
  c_fail     constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  if p_opportunity_type not in ('training', 'advisory', 'exhibition') then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;

  if found then
    -- The national ID alone identifies the applicant (0171, OQ-76).
    v_person_id := v_person.id;
  else
    -- A new person needs a name; a date of birth is optional since 0171.
    if coalesce(btrim(p_full_name), '') = '' then
      return c_fail;
    end if;
    if p_date_of_birth is not null
       and (p_date_of_birth > current_date or p_date_of_birth < current_date - interval '120 years') then
      return c_fail;
    end if;

    insert into person (national_id, full_name, date_of_birth, sex, village, phone, age_unrecorded_reason)
    values (v_id, btrim(p_full_name), p_date_of_birth,
            nullif(p_sex,'')::sex_t, nullif(btrim(coalesce(p_village,'')),''),
            nullif(btrim(coalesce(p_phone,'')),''),
            case when p_date_of_birth is null then 'public_id_only' end)
    on conflict (national_id) do nothing
    returning id into v_person_id;

    if v_person_id is null then
      return c_fail;
    end if;
  end if;

  -- The municipality is the OPPORTUNITY's. The caller has none.
  if p_opportunity_type = 'training' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats, municipality_id
      into v_open, v_cap, v_muni
      from training_session where id = p_opportunity_id and deleted_at is null;
  elsif p_opportunity_type = 'advisory' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats, municipality_id
      into v_open, v_cap, v_muni
      from advisory_session where id = p_opportunity_id and deleted_at is null;
  else
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           booth_capacity, municipality_id
      into v_open, v_cap, v_muni
      from exhibition where id = p_opportunity_id and deleted_at is null;
  end if;

  if v_open is null or not v_open then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- A page for one municipality may not apply to the other's opportunity.
  -- Same answer as an unpublished one: a wrong page learns nothing.
  if p_municipality_slug is not null and not exists (
       select 1 from municipality mu
        where mu.id = v_muni and mu.slug = p_municipality_slug
          and mu.is_active and mu.deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- The same question check_advisory_eligibility asks: a completed training
  -- IN THIS MUNICIPALITY (0120). The trigger is the one that decides.
  if p_opportunity_type = 'advisory' then
    if not exists (
      select 1
        from training_enrolment te
        join person pp           on pp.id = te.person_id  and pp.deleted_at is null
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.person_id = v_person_id
         and te.met_criteria is true
         and te.deleted_at is null
         and ts.municipality_id = v_muni
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
         submitted_by_participant, municipality_id)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true, v_muni);
    elsif p_opportunity_type = 'advisory' then
      insert into advisory_enrolment
        (person_id, session_id, application_status, applied_on, client_uuid,
         submitted_by_participant, municipality_id)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true, v_muni);
    else
      if p_producer_type_id is null then
        return c_fail;
      end if;
      insert into exhibition_registration
        (exhibition_id, person_id, producer_type_id, is_first_time, status,
         submitted_by_participant, client_uuid, municipality_id)
      values (p_opportunity_id, v_person_id, p_producer_type_id, null,
              'submitted'::record_status_t, true, p_client_uuid, v_muni)
      returning id into v_reg_id;

      if p_product_ids is not null and array_length(p_product_ids, 1) > 0 then
        insert into exhibition_registration_product (registration_id, product_id, municipality_id)
        select v_reg_id, rp.id, v_muni
          from ref_product rp
         where rp.id = any(p_product_ids)
           and rp.is_active
           and rp.deleted_at is null
        on conflict do nothing;
      end if;
    end if;
  exception
    when unique_violation then
      -- LOOK, do not infer. See 0060's header.
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
$function$;

-- ── 4. request_linkage ────────────────────────────────────────────────────
create or replace function public.request_linkage(p_national_id text, p_initiative_title text, p_activity_type_id uuid, p_request text, p_client_uuid uuid default null::uuid, p_date_of_birth date default null::date, p_phone text default null::text, p_main_product text default null::text, p_municipality_slug text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id        text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person    person%rowtype;
  v_person_id uuid;
  v_exists    boolean;
  v_withdrawn boolean;
  v_any_advisory boolean;
  v_muni      uuid;
  c_fail      constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;

  if coalesce(btrim(p_initiative_title), '') = ''
     or coalesce(btrim(p_request), '') = ''
     or p_activity_type_id is null then
    return c_fail;
  end if;

  if not exists (select 1 from ref_activity_type
                  where id = p_activity_type_id and is_active and deleted_at is null) then
    return c_fail;
  end if;

  -- The municipality whose page this came from; Sahel Horan when unsaid.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
    return jsonb_build_object('ok', false, 'result', 'failed');
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;
  if not found then
    return c_fail;
  end if;

  -- The national ID alone identifies the applicant (0171, OQ-76).
  v_person_id := v_person.id;

  -- The same question check_linkage_eligibility asks, including the track,
  -- and only about THIS municipality's advisories (0120): a Ramtha page must
  -- not learn from the answer whether the person completed one in Sahel
  -- Horan. If this ever drifts from the trigger, the trigger is the one that
  -- decides.
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id  and p.deleted_at is null
      join advisory_session s on s.id = ae.session_id and s.deleted_at is null
     where ae.person_id = v_person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
       and s.municipality_id = v_muni
  ) then
    -- Which refusal? A home-based completer is not missing a record, and must
    -- not be told they are.
    select exists (
      select 1
        from advisory_enrolment ae
        join person p           on p.id = ae.person_id  and p.deleted_at is null
        join advisory_session s on s.id = ae.session_id and s.deleted_at is null
       where ae.person_id = v_person_id
         and ae.met_criteria is true
         and ae.deleted_at is null
         and s.municipality_id = v_muni
    ) into v_any_advisory;

    if v_any_advisory then
      return jsonb_build_object('ok', false, 'result', 'wrong_track',
                                'requires', 'market_track');
    end if;
    return jsonb_build_object('ok', false, 'result', 'ineligible',
                              'requires', 'completed_advisory');
  end if;

  if p_client_uuid is not null then
    select exists (select 1 from linkage_request
                    where client_uuid = p_client_uuid and deleted_at is null)
      into v_exists;
    if v_exists then
      return jsonb_build_object('ok', true, 'result', 'already_requested');
    end if;
  end if;

  begin
    insert into linkage_request
      (person_id, requested_on, request, initiative_title, activity_type_id,
       main_product, status, client_uuid, municipality_id)
    values (v_person_id, current_date, btrim(p_request), btrim(p_initiative_title),
            p_activity_type_id, nullif(btrim(coalesce(p_main_product,'')),''),
            'submitted'::linkage_request_status_t, p_client_uuid, v_muni);
  exception
    when unique_violation then
      -- LOOK, do not infer. client_uuid is globally unique and stays that way:
      -- a resync must not be able to resurrect a request the Municipality
      -- withdrew. So a collision means either a live row or a withdrawn one,
      -- and telling them apart requires reading.
      select exists (select 1 from linkage_request
                      where client_uuid = p_client_uuid and deleted_at is null),
             exists (select 1 from linkage_request
                      where client_uuid = p_client_uuid and deleted_at is not null)
        into v_exists, v_withdrawn;
      if v_exists then
        return jsonb_build_object('ok', true, 'result', 'already_requested');
      elsif v_withdrawn then
        return jsonb_build_object('ok', false, 'result', 'withdrawn');
      else
        return jsonb_build_object('ok', false, 'result', 'failed');
      end if;
    when check_violation then
      -- The eligibility trigger, or a constraint. The explicit check above has
      -- already returned for both track cases, so reaching here means the two
      -- disagreed -- report the trigger's answer, which is the one that decides.
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_advisory');
    when others then
      return jsonb_build_object('ok', false, 'result', 'failed');
  end;

  return jsonb_build_object('ok', true, 'result', 'requested');
end;
$function$;

-- ── 5. my_applications ────────────────────────────────────────────────────
create or replace function public.my_applications(p_national_id text, p_date_of_birth date default null::date, p_phone text default null::text, p_municipality_slug text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id     text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_muni   uuid;
  v_person person%rowtype;
  v_rows   jsonb;
  c_miss   constant jsonb := jsonb_build_object('found', false);
begin
  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  -- The municipality whose page this came from; Sahel Horan when unsaid.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
    return c_miss;
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;

  if not found then
    return c_miss;
  end if;

  -- The national ID alone identifies the applicant (0171, OQ-76).

  -- Every branch filters deleted_at on BOTH the application and the thing it
  -- points at. A withdrawn application, or one against a session that was
  -- removed, must not appear here saying "approved". And every branch is the
  -- asking municipality's: identity is shared, history is not (0120).
  select coalesce(jsonb_agg(r order by r->>'on' desc), '[]'::jsonb)
    into v_rows
    from (
      select jsonb_build_object(
               'kind',   'training',
               'title',  ts.title,
               'on',     ts.start_date,
               'status', case
                           when te.met_criteria is true  then 'completed'
                           when te.met_criteria is false then 'not_completed'
                           else te.application_status::text
                         end) as r
        from training_enrolment te
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.person_id = v_person.id and te.deleted_at is null
         and te.municipality_id = v_muni

      union all

      select jsonb_build_object(
               'kind',   'advisory',
               'title',  a.title,
               'on',     a.start_date,
               'status', case
                           when ae.met_criteria is true  then 'completed'
                           when ae.met_criteria is false then 'not_completed'
                           else ae.application_status::text
                         end)
        from advisory_enrolment ae
        join advisory_session a on a.id = ae.session_id and a.deleted_at is null
       where ae.person_id = v_person.id and ae.deleted_at is null
         and ae.municipality_id = v_muni

      union all

      select jsonb_build_object(
               'kind',   'exhibition',
               'title',  e.name,
               'on',     e.start_date,
               'status', er.status::text)
        from exhibition_registration er
        join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
       where er.person_id = v_person.id and er.deleted_at is null
         and er.municipality_id = v_muni

      union all

      -- A linkage request has no event to date until it is matched, so this is
      -- the day it was asked for. It is the only branch where that is true.
      select jsonb_build_object(
               'kind',   'linkage',
               'title',  lr.initiative_title,
               'on',     lr.requested_on,
               'status', lr.status::text)
        from linkage_request lr
       where lr.person_id = v_person.id and lr.deleted_at is null
         and lr.municipality_id = v_muni
    ) s(r);

  return jsonb_build_object('found', true, 'applications', v_rows);
end;
$function$;

-- ── verification, as anon, discarded ──────────────────────────────────────
do $verify$
declare
  v_nid  text := '999000171';
  v_ex   uuid;
  v_r    jsonb;
  i      int;
begin
  if exists (select 1 from public.person where national_id = v_nid) then
    raise exception '0171: the probe national ID is in use';
  end if;
  select x.id into v_ex from public.exhibition x join public.municipality m on m.id = x.municipality_id
   where m.slug = 'sahel-horan' and x.is_published and not x.is_cancelled and x.deleted_at is null
     and x.end_date >= current_date
     and (x.application_opens_on is null or x.application_opens_on <= current_date)
     and (x.application_closes_on is null or x.application_closes_on >= current_date)
   limit 1;
  begin
    perform set_config('role', 'anon', true);
    -- a new person, national ID and name only
    if v_ex is not null then
      v_r := public.apply_for_opportunity(v_ex, 'exhibition', v_nid, null, '0790000171', '0171 probe', 'female', null,
                                          (select id from public.v_public_producer_type limit 1), gen_random_uuid(), null, 'sahel-horan');
      if v_r->>'result' not in ('applied', 'full') then
        raise exception '0171: a new applicant with no date of birth got %', v_r;
      end if;
      -- no limit: thirty lookups in a row all answer
      for i in 1..30 loop
        v_r := public.applicant_prefill(v_nid, null, null, 'sahel-horan');
        if not (v_r->>'found')::boolean or v_r->>'full_name' <> '0171 probe' then
          raise exception '0171: lookup % by national ID alone got %', i, v_r;
        end if;
      end loop;
      v_r := public.my_applications(v_nid, null, null, 'sahel-horan');
      if not (v_r->>'found')::boolean then
        raise exception '0171: my_applications by national ID alone got %', v_r;
      end if;
    end if;
    raise exception using errcode = 'P0171', message = 'rollback the probes';
  exception when sqlstate 'P0171' then null;
  end;
  if exists (select 1 from public.person where national_id = v_nid) then
    raise exception '0171: probe rows survived the rollback';
  end if;
end $verify$;
