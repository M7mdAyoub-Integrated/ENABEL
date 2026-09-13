-- ═══════════════════════════════════════════════════════════════════════════
--  0117 — who may see which municipality: the helpers, the account shape,
--         and the six functions that named roles by hand
--
--  ── THE THREE HELPERS THE PLAN ASKS FOR (§2.3) ──
--
--      is_super_admin()          role = 'super_admin'
--      my_municipality()         the municipality the caller is working in
--      can_see_municipality(m)   THE function every scoped policy calls
--
--  All security definer, search_path = public, revoked from anon.
--
--  ── ONE DEVIATION FROM THE PLAN'S LETTER, AND WHY ──
--
--  The plan reads `my_municipality()` as "the caller's municipality_id, null
--  for super admin". Here it returns
--
--      coalesce(app_user.municipality_id, app_user.acting_municipality_id)
--
--  A municipal admin has a `municipality_id` and no acting one, so for them
--  the two readings are identical. A super admin has none and may SWITCH into
--  one: §3.4 gives them a switcher in the header and says the current
--  municipality must be visible on every screen "so nobody enters data
--  against the wrong one". If that choice lived only in the browser, every
--  query and every insert in the application would have to carry it, and the
--  one that forgot would write a Ramtha row into Sahel Horan with a green
--  toast. Holding it in `app_user.acting_municipality_id` makes it a fact the
--  DATABASE knows: the column default from 0112 fills it into every insert,
--  and `can_see_municipality` narrows every read to it. A super admin who has
--  not switched into anything sees both municipalities — the comparison view —
--  and can insert nothing, because the default is null and NOT NULL refuses.
--
--  So:
--
--      can_see_municipality(m) =
--        super admin, not switched in   → true
--        super admin, switched into X   → m = X
--        anyone else                    → m = their own municipality
--
--  One function. The rule cannot drift table by table.
--
--  ── THE ACCOUNT SHAPE (§2.2) ──
--
--      app_user.municipality_id         null ⇔ role = 'super_admin',
--                                       required for staff, free for a participant
--      app_user.acting_municipality_id  only a super admin may have one
--
--  Both enforced by check constraints. The plan says a non-super-admin must
--  have a municipality; a `participant` is the one exception taken here,
--  because a participant is a PERSON, and person is shared — the plan's own
--  first decision. `handle_new_user` creates every fresh auth account as a
--  participant with no municipality (below), and a participant reads their
--  own records through `auth_user_id`/`my_person_id()`, never through a
--  municipality. The six existing accounts already have Sahel Horan from
--  0112; none is a super admin, so both constraints hold today.
--
--  `handle_new_user` (0003) now reads the account's APP metadata — which only
--  the Auth admin API can set, never the user — for a role and a municipality,
--  so the account-management Edge Function (Part 2.5) can create a staff
--  account in one call. A self-signup carries no app metadata and stays a
--  participant, exactly as before.
--
--  ── super_admin IS A COORDINATOR EVERYWHERE, PLUS ──
--
--  Every policy and guard in the schema asks one of two questions: "is this
--  a coordinator?" or "is this staff?". A super admin is both, in whichever
--  municipality they are acting. Rather than touch 199 policies to add a
--  seventh literal, the two helpers everything calls — `is_coordinator()` and
--  `is_staff()` — admit the new role, and `can_write()` (specified in
--  05_ROLES_AND_RLS.md §2, never created — §15 records it as doc drift) is
--  created now so 0118 can replace the inline role lists with it.
--
--  Six function bodies compare `current_role()` to a literal by hand instead
--  of calling a helper. Left alone, a super admin could not start a
--  follow-up, prefill one, count markets, approve a registration, review a
--  survey or correct a national ID — silently, as `insufficient_privilege`
--  on screens that would otherwise work. Each is rewritten from its LIVE body
--  (pg_get_functiondef) with the role added and nothing else changed:
--
--      count_markets_attended        0086, 0089
--      followup_prefill_for_staff    0074, 0086
--      start_followup                0074
--      guard_followup_review         0097
--      guard_person_national_id      0015
--      guard_registration_status     0015
--
--  One of the six changes a second thing. `start_followup` looks for an
--  existing survey by (person, round); since 0113 the unique key behind that
--  lookup is (municipality, person, round), so the lookup now carries the
--  municipality too — otherwise a Sahel Horan draft would be "resumed" from
--  the other municipality. Nothing else in it moved.
--
--  ── THE SWITCHER, AND THE THINGS AN ACCOUNT MAY NOT DO TO ITSELF ──
--
--  `set_acting_municipality(uuid)` is the switcher's only write. Super admin
--  only, own row only, an active municipality or null.
--
--  `guard_app_user()` is a BEFORE UPDATE trigger, because a policy cannot
--  compare old and new (05 §5). It refuses, whoever asks:
--    - changing your OWN role or deactivating your OWN account — a super admin
--      who could demote or disable themselves is one click from an
--      unrecoverable platform (§2.5);
--    - demoting or deactivating the LAST active super admin, by anyone;
--    - a non-super-admin granting `super_admin`, changing anyone's
--      municipality, or touching a super admin's row at all.
--  It fires for the owner too, deliberately: the escape hatch is a migration.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the account shape ─────────────────────────────────────────────────

alter table public.app_user
  add column acting_municipality_id uuid references public.municipality(id);

alter table public.app_user
  add constraint app_user_municipality_by_role
    check (case when role = 'super_admin' then municipality_id is null
                when role = 'participant' then true
                else municipality_id is not null end),
  add constraint app_user_acting_only_super_admin
    check (acting_municipality_id is null or role = 'super_admin');

-- Versions before this one: 0003. The role and municipality come from
-- raw_app_meta_data, which the Auth admin API sets and a user cannot.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role app_role_t;
  v_muni uuid;
begin
  begin
    v_role := coalesce(nullif(new.raw_app_meta_data->>'app_role', ''), 'participant')::app_role_t;
  exception when invalid_text_representation then
    v_role := 'participant';
  end;
  v_muni := nullif(new.raw_app_meta_data->>'municipality_id', '')::uuid;

  insert into public.app_user (id, full_name, role, municipality_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Unknown'),
    v_role,
    case when v_role = 'super_admin' then null else v_muni end
  )
  on conflict (id) do nothing;
  return new;
end $$;

create index app_user_acting_municipality_idx on public.app_user (acting_municipality_id);

-- ── 2. the helpers ───────────────────────────────────────────────────────

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public."current_role"() = 'super_admin', false);
$$;

-- Versions before this one: 0112. See the header for the deviation.
create or replace function public.my_municipality()
returns uuid
language sql stable security definer set search_path = public
as $$
  select coalesce(municipality_id, acting_municipality_id)
    from public.app_user where id = auth.uid() and is_active;
$$;

create or replace function public.can_see_municipality(p_municipality uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case
           when public.is_super_admin() and public.my_municipality() is null then true
           else p_municipality = public.my_municipality()
         end;
$$;

-- Versions before this one: is_coordinator 0022, 0032; is_staff 0003.
create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public."current_role"() in ('coordinator', 'super_admin'), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public."current_role"() in ('coordinator', 'data_entry', 'enumerator', 'super_admin'), false);
$$;

create or replace function public.can_write()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public."current_role"() in ('coordinator', 'data_entry', 'super_admin'), false);
$$;

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.my_municipality() from public, anon;
revoke all on function public.can_see_municipality(uuid) from public, anon;
revoke all on function public.is_coordinator() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.can_write() from public, anon;
grant execute on function public.is_super_admin(), public.my_municipality(),
  public.can_see_municipality(uuid), public.is_coordinator(), public.is_staff(),
  public.can_write() to authenticated;

comment on function public.can_see_municipality(uuid) is
  'The one municipality test every scoped policy calls. Super admin not '
  'switched in: everything. Super admin switched in, or anyone else: only '
  'their municipality. See 0117.';

-- ── 3. the switcher ──────────────────────────────────────────────────────

create function public.set_acting_municipality(p_municipality_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_rows int;
begin
  if not public.is_super_admin() then
    return jsonb_build_object('ok', false, 'result', 'not_permitted');
  end if;

  if p_municipality_id is not null and not exists (
       select 1 from public.municipality
        where id = p_municipality_id and is_active and deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'unknown_municipality');
  end if;

  update public.app_user
     set acting_municipality_id = p_municipality_id
   where id = auth.uid();
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  return jsonb_build_object('ok', true, 'result', 'switched',
                            'municipality_id', p_municipality_id);
end $$;

revoke all on function public.set_acting_municipality(uuid) from public, anon;
grant execute on function public.set_acting_municipality(uuid) to authenticated;

-- ── 4. what an account may not do to itself, and the last super admin ────

create function public.guard_app_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_last_super boolean;
begin
  -- Your own role and your own activity are not yours to change.
  if new.id = auth.uid() then
    if new.role is distinct from old.role then
      raise exception 'you cannot change your own role'
        using errcode = 'insufficient_privilege';
    end if;
    if old.is_active and not new.is_active then
      raise exception 'you cannot deactivate your own account'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- The last active super admin stays a super admin, whoever is asking.
  if old.role = 'super_admin' and old.is_active
     and (new.role <> 'super_admin' or not new.is_active) then
    select count(*) = 1 into v_last_super
      from public.app_user where role = 'super_admin' and is_active;
    if v_last_super then
      raise exception 'this is the last active super admin; create another before removing it'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  -- Only a super admin may mint one, move an account between municipalities,
  -- or touch a super admin's row. A signed-in caller that is not one is
  -- refused; a caller with no uid (a migration, a support script) passes.
  if auth.uid() is not null and not public.is_super_admin() then
    if new.role = 'super_admin' or old.role = 'super_admin' then
      raise exception 'only a super admin may change a super admin account'
        using errcode = 'insufficient_privilege';
    end if;
    if new.municipality_id is distinct from old.municipality_id then
      raise exception 'only a super admin may move an account to another municipality'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end $$;

revoke all on function public.guard_app_user() from public, anon, authenticated;

create trigger trg_app_user_guard
  before update on public.app_user
  for each row execute function public.guard_app_user();

-- ── 5. the six functions that named roles by hand ────────────────────────

create or replace function public.count_markets_attended(p_person_id uuid)
returns integer
language plpgsql stable security definer set search_path = public
as $function$
declare
  v_count int;
begin
  -- The same roles fu_read admits, and the same gate
  -- followup_prefill_for_staff carries. This function is a definer over every
  -- registration in the table, so without this the grant below would let any
  -- logged-in account count markets for any person by id.
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator', 'super_admin') then
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

create or replace function public.followup_prefill_for_staff(p_national_id text)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $function$
declare
  v_id     text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person person%rowtype;
  v_trainings jsonb;
  v_events    int;
begin
  -- The same roles fu_read admits. Not is_staff(): data_entry can read
  -- neither the survey nor any reason to need this.
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator', 'super_admin') then
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

create or replace function public.start_followup(
  p_national_id text, p_round followup_round_t, p_contact_date date,
  p_contact_mode contact_mode_t, p_enumerator_name text, p_respondent respondent_t,
  p_client_uuid uuid default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person  person%rowtype;
  v_existing followup_survey%rowtype;
  v_new_id  uuid;
begin
  if coalesce(public."current_role"(), 'participant') not in ('coordinator', 'enumerator', 'super_admin') then
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
   where person_id = v_person.id and round = p_round and deleted_at is null
     and municipality_id = public.my_municipality();

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
     where person_id = v_person.id and round = p_round and deleted_at is null
       and municipality_id = public.my_municipality();
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

create or replace function public.guard_followup_review()
returns trigger
language plpgsql security definer set search_path = public
as $function$
begin
  if new.status is distinct from old.status then

    -- A review outcome, or a reopen. Submitting reaches neither branch.
    if new.status in ('approved'::record_status_t, 'rejected'::record_status_t)
       or (new.status = 'draft'::record_status_t
           and old.status <> 'draft'::record_status_t) then

      -- 05 §12: no JWT means no uid means a null role, and a guard that
      -- coalesces null to the least-privileged caller refuses rather than
      -- trusts. A script that must do this carries coordinator claims.
      if coalesce(public."current_role"()::text, 'participant') not in ('coordinator', 'super_admin') then
        raise exception
          'Only a coordinator may approve, reject or reopen a follow-up survey'
          using errcode = 'insufficient_privilege';
      end if;

      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.guard_person_national_id()
returns trigger
language plpgsql security definer set search_path = public
as $function$
begin
  if new.national_id is distinct from old.national_id
     and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
    raise exception 'national_id cannot be changed';
  end if;
  return new;
end $function$;

create or replace function public.guard_registration_status()
returns trigger
language plpgsql security definer set search_path = public
as $function$
begin
  if new.status is distinct from old.status
     and coalesce(public.current_role()::text, 'participant') not in ('coordinator', 'super_admin') then
    raise exception 'only a coordinator may change registration status';
  end if;
  return new;
end $function$;

-- ── 6. municipality rows are a super admin's to write ────────────────────

drop policy municipality_insert on public.municipality;
drop policy municipality_update on public.municipality;

create policy municipality_insert on public.municipality
  for insert to authenticated with check (public.is_super_admin());

create policy municipality_update on public.municipality
  for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ── verification ─────────────────────────────────────────────────────────

do $verify$
declare
  v_bad text[];
begin
  -- no function body still names 'coordinator' in a list without 'super_admin'
  -- (the two helpers that DEFINE the roles are the exceptions: they are the list)
  select array_agg(p.proname order by p.proname) into v_bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname not in ('handle_new_user')
     and regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g') ~ '''coordinator'''
     and regexp_replace(p.prosrc, '--[^' || chr(10) || ']*', '', 'g') !~ '''super_admin''';
  if v_bad is not null then
    raise exception '0117: functions still naming coordinator without super_admin: %', v_bad;
  end if;

  -- the constraints hold on the existing accounts
  if exists (select 1 from public.app_user
              where role not in ('super_admin', 'participant') and municipality_id is null) then
    raise exception '0117: a staff account has no municipality';
  end if;

  -- a super admin not switched in sees both; switched in sees one; a
  -- coordinator sees their own. Evaluated by calling the helper as each shape
  -- of account through set_config, in this transaction, then reset.
  perform set_config('request.jwt.claims',
    json_build_object('sub', 'a0000000-0000-4000-8000-000000000001', 'role', 'authenticated')::text, true);
  if not public.can_see_municipality('00000000-0000-4000-8000-00000000005a')
     or public.can_see_municipality('00000000-0000-4000-8000-0000000000a1') then
    raise exception '0117: the Sahel Horan coordinator does not see exactly Sahel Horan';
  end if;
  perform set_config('request.jwt.claims', '', true);
end $verify$;
