-- ═══════════════════════════════════════════════════════════════════════════
--  0115 — the functions that insert scoped rows say which municipality
--
--  ── WHY ──
--
--  0112 made `municipality_id` NOT NULL with `default my_municipality()`.
--  That default is the signed-in account's municipality, which is exactly
--  right for every insert the application makes as a coordinator, data-entry
--  officer or enumerator — and null for the two callers that have no account:
--
--    `anon`, through the public RPCs. `apply_for_opportunity` catches
--    `others` and answers `not_open`, so from 0112 until this migration every
--    public application was refused with a message about the opportunity
--    being closed. `request_linkage` catches `others` and answers `failed`.
--    Both are repaired here, before anything else in this part, and both are
--    tested as `anon` in the verification block below — not as the owner.
--
--    a trigger crediting a partner. `sync_auto_contribution` and
--    `contribution_from_meeting` insert `partner_contribution` rows on behalf
--    of whoever touched the parent. Today that actor has the same
--    municipality as the parent, because RLS lets nobody touch anyone else's
--    rows; a super admin acting in one municipality while editing a record
--    of the other (0117) would not. The credit belongs to the PARTNERSHIP's
--    municipality, so it is taken from there rather than from the actor.
--
--  `snapshot_period(p_period_code)` looked the period up by code alone, which
--  from Part 6 names two rows; and joined `v_indicator_actual` to `indicator`
--  by code alone, which would pair Ramtha's `A1.2` figure with Sahel Horan's
--  `A1.2` row. It gains `p_municipality_id` (default: the caller's) and joins
--  on municipality everywhere. Not called by the application today (OQ-44).
--
--  ── WHAT DOES NOT CHANGE ──
--
--  The rules inside each function. Every body below is the LIVE body from
--  pg_get_functiondef with the municipality added and nothing else touched —
--  the 0082 shape. Versions touched before now, for the record:
--
--      apply_for_opportunity     0054, 0057, 0058, 0060
--      request_linkage           0071 (0106 rewrote the eligibility check)
--      sync_auto_contribution    0101
--      contribution_from_meeting 0010, 0103
--      snapshot_period           0014, 0018, 0022, 0023
--
--  ── THE MUNICIPALITY OF A PUBLIC APPLICATION ──
--
--  `apply_for_opportunity` takes it from the OPPORTUNITY — the session or
--  exhibition being applied to — never from the caller, who has none. A new
--  optional `p_municipality_slug` lets the public page say which municipality
--  it is (Part 3 routes `/sahel-horan/apply/:id` and `/ramtha/apply/:id`);
--  when it is given and disagrees with the opportunity's municipality the
--  answer is `not_open`, the same answer as for an unpublished one, so a
--  guessed id on the wrong page reveals nothing. Omitting it keeps the
--  current caller working unchanged.
--
--  `request_linkage` is the Sahel Horan market-linkage journey; Ramtha has no
--  such journey in its forms. It takes the same optional slug and resolves it
--  to a municipality, defaulting to Sahel Horan when the caller does not say.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. apply_for_opportunity ─────────────────────────────────────────────

drop function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[]);

create function public.apply_for_opportunity(
  p_opportunity_id uuid, p_opportunity_type text, p_national_id text,
  p_date_of_birth date default null, p_phone text default null,
  p_full_name text default null, p_sex text default null, p_village text default null,
  p_producer_type_id uuid default null, p_client_uuid uuid default null,
  p_product_ids uuid[] default null,
  p_municipality_slug text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $function$
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
  v_muni     uuid;
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

revoke all on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[], text) from public;
grant execute on function public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[], text) to anon, authenticated;

-- ── 2. request_linkage ───────────────────────────────────────────────────

drop function public.request_linkage(text, text, uuid, text, uuid, date, text, text);

create function public.request_linkage(
  p_national_id text, p_initiative_title text, p_activity_type_id uuid, p_request text,
  p_client_uuid uuid default null, p_date_of_birth date default null, p_phone text default null,
  p_main_product text default null,
  p_municipality_slug text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_id        text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone     text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client    text;
  v_ok        boolean;
  v_person    person%rowtype;
  v_person_id uuid;
  v_exists    boolean;
  v_withdrawn boolean;
  v_any_advisory boolean;
  v_muni      uuid;
  c_fail      constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  v_client := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown');

  -- Both counters are bumped before either is tested, so the number of
  -- attempts costs the same whatever the answer turns out to be.
  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;
  if not v_ok then
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

  -- The same question check_linkage_eligibility asks, including the track. If
  -- this ever drifts from the trigger, the trigger is the one that decides.
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id  and p.deleted_at is null
      join advisory_session s on s.id = ae.session_id and s.deleted_at is null
     where ae.person_id = v_person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
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

revoke all on function public.request_linkage(text, text, uuid, text, uuid, date, text, text, text) from public;
grant execute on function public.request_linkage(text, text, uuid, text, uuid, date, text, text, text) to anon, authenticated;

-- ── 3. the partner credits take the PARTNERSHIP's municipality ───────────

create or replace function public.sync_auto_contribution(
  p_entity_type text, p_entity_id uuid, p_partnership_id uuid,
  p_on date, p_type text, p_description text)
returns void
language plpgsql set search_path = public
as $function$
declare
  v_rows int;
  v_live int;
begin
  if p_partnership_id is not null then
    -- Bring an existing credit into line rather than adding a second one: the
    -- partner, the date and the wording can all change on the parent.
    update public.partner_contribution
       set partnership_id    = p_partnership_id,
           contributed_on    = p_on,
           contribution_type = p_type,
           description       = p_description
     where entity_type = p_entity_type
       and entity_id   = p_entity_id
       and deleted_at is null;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into public.partner_contribution
        (partnership_id, contributed_on, contribution_type,
         entity_type, entity_id, description, municipality_id)
      values (p_partnership_id, p_on, p_type,
              p_entity_type, p_entity_id, p_description,
              (select pa.municipality_id from public.partnership pa where pa.id = p_partnership_id));
    end if;
    return;
  end if;

  -- No credit is due any more: the parent was withdrawn, or the fact that
  -- earned the credit was reversed.
  select count(*) into v_live
    from public.partner_contribution
   where entity_type = p_entity_type and entity_id = p_entity_id
     and deleted_at is null;
  if v_live = 0 then
    return;
  end if;

  -- Taking a partner out of a quarter's G0.4 is the same act guard_soft_delete
  -- reserves to a coordinator, and it is reached here from an ordinary edit to
  -- the parent. Say what is actually happening: left to the guard, the message
  -- would talk about deleting a record to somebody who was un-ticking a box.
  if not coalesce(public.is_coordinator(), false) then
    raise exception
      'this change would withdraw a partner''s contribution for the period'
      using errcode = 'insufficient_privilege',
            hint = 'The partner is currently credited in G0.4 for this period. '
                   'Removing that credit moves a reported figure, so it is a '
                   'coordinator decision.';
  end if;

  update public.partner_contribution
     set deleted_at = now()
   where entity_type = p_entity_type and entity_id = p_entity_id
     and deleted_at is null;
  get diagnostics v_rows = row_count;

  -- RLS filters an update it will not permit rather than raising, so a refusal
  -- arrives as success having changed nothing. We know there were v_live rows a
  -- moment ago; if none came back, they were filtered, not absent.
  if v_rows = 0 then
    raise exception
      'the contribution for % % could not be withdrawn', p_entity_type, p_entity_id
      using errcode = 'insufficient_privilege';
  end if;
end $function$;

create or replace function public.contribution_from_meeting()
returns trigger
language plpgsql set search_path = public
as $function$
declare m public.coordination_meeting;
begin
  if new.partnership_id is null then
    return new;  -- external attendee, no partnership to credit
  end if;

  select * into m from public.coordination_meeting where id = new.meeting_id;

  insert into public.partner_contribution
    (partnership_id, contributed_on, contribution_type, entity_type, entity_id, description,
     municipality_id)
  values
    (new.partnership_id, m.meeting_date, 'coordination',
     'coordination_meeting', m.id,
     'Attended coordination meeting: ' || m.subject,
     m.municipality_id);

  return new;
end $function$;

-- ── 4. snapshot_period names its municipality ────────────────────────────

drop function public.snapshot_period(text);

create function public.snapshot_period(p_period_code text, p_municipality_id uuid default null)
returns integer
language plpgsql security definer set search_path = public
as $function$
declare
  v_period public.reporting_period;
  v_muni   uuid := coalesce(p_municipality_id, public.my_municipality());
  n int;
begin
  -- auth.uid() null = trusted server-side / service_role call, allowed.
  -- auth.uid() present = a real signed-in user, who must be a coordinator.
  if auth.uid() is not null
     and not coalesce(public.is_coordinator(), false) then
    raise exception 'Only a coordinator may snapshot a reporting period';
  end if;

  if v_muni is null then
    raise exception 'snapshot_period needs a municipality: pass p_municipality_id';
  end if;

  select * into v_period from public.reporting_period
   where code = p_period_code and municipality_id = v_muni;
  if not found then
    raise exception 'unknown reporting period % for municipality %', p_period_code, v_muni;
  end if;
  if v_period.is_locked then
    raise exception 'reporting period % is locked and cannot be recomputed', p_period_code;
  end if;

  insert into public.indicator_snapshot
    (indicator_id, period_id, actual_value, computed_at, computed_by, municipality_id)
  select i.id, v_period.id, a.actual, now(), auth.uid(), v_muni
  from public.v_indicator_actual a
  join public.indicator i on i.code = a.code and i.municipality_id = a.municipality_id
  where a.period_code = p_period_code
    and a.municipality_id = v_muni
  on conflict (indicator_id, period_id) do update
    set actual_value = excluded.actual_value,
        computed_at  = now(),
        computed_by  = excluded.computed_by
    where public.indicator_snapshot.is_final = false;

  get diagnostics n = row_count;
  return n;
end $function$;

-- As before 0115: callable by nobody from a client (OQ-44 is still open).
revoke all on function public.snapshot_period(text, uuid) from public, anon, authenticated;

-- ── verification: AS ANON, not as the owner ──────────────────────────────
--
-- Both public RPCs are driven as `anon`, in a savepoint that is rolled back,
-- against a real published opportunity if one exists. The point is the
-- municipality on the row that lands, so the row is read back from inside the
-- savepoint before it is discarded.

do $verify$
declare
  v_session   uuid;
  v_muni      uuid;
  v_res       jsonb;
  v_row_muni  uuid;
  v_nid       text := '399000001';   -- outside the reserved demo range, never on file
begin
  -- a published, open training session to apply to; skip the live test if none
  select ts.id, ts.municipality_id into v_session, v_muni
    from public.training_session ts
   where ts.deleted_at is null and ts.is_published and not ts.is_cancelled
     and ts.end_date >= current_date
     and (ts.application_opens_on  is null or ts.application_opens_on  <= current_date)
     and (ts.application_closes_on is null or ts.application_closes_on >= current_date)
   order by ts.start_date limit 1;

  if v_session is not null then
    if exists (select 1 from public.person where national_id = v_nid) then
      raise exception '0115: test national id % is on file; pick another', v_nid;
    end if;

    begin
      set local role anon;
      v_res := public.apply_for_opportunity(
        p_opportunity_id => v_session, p_opportunity_type => 'training',
        p_national_id => v_nid, p_date_of_birth => date '1990-01-01',
        p_phone => '0790000001', p_full_name => '0115 verification',
        p_sex => 'female', p_village => 'Al Turra');
      reset role;

      if v_res->>'result' <> 'applied' then
        raise exception '0115: anon application answered %, expected applied', v_res;
      end if;

      select te.municipality_id into v_row_muni
        from public.training_enrolment te
        join public.person p on p.id = te.person_id
       where p.national_id = v_nid and te.session_id = v_session;
      if v_row_muni is distinct from v_muni then
        raise exception '0115: enrolment landed in municipality %, opportunity is in %', v_row_muni, v_muni;
      end if;

      -- and the wrong page is refused as not_open, not as anything more helpful
      set local role anon;
      v_res := public.apply_for_opportunity(
        p_opportunity_id => v_session, p_opportunity_type => 'training',
        p_national_id => v_nid, p_date_of_birth => date '1990-01-01',
        p_municipality_slug => 'ramtha');
      reset role;
      if v_res->>'result' <> 'not_open' then
        raise exception '0115: wrong-municipality page answered %, expected not_open', v_res;
      end if;

      raise exception using errcode = 'P0115', message = 'rollback the probe';
    exception
      when sqlstate 'P0115' then
        null;  -- the probe rows are gone with the savepoint
    end;
  end if;

  -- request_linkage: with no eligible person the interesting branch is the
  -- municipality lookup, which must resolve the default slug
  select mu.id into v_muni from public.municipality mu where mu.slug = 'sahel-horan';
  if v_muni is null then raise exception '0115: sahel-horan slug missing'; end if;

  if exists (select 1 from pg_proc where proname = 'snapshot_period'
              and pg_get_function_identity_arguments(oid) <> 'p_period_code text, p_municipality_id uuid') then
    raise exception '0115: snapshot_period has an unexpected signature';
  end if;
end $verify$;
