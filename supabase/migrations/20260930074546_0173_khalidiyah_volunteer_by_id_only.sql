-- ═══════════════════════════════════════════════════════════════════════════
--  0173 — Khalidiyah's public volunteer form asks for the ID only
--
--  0171 took the date of birth and the attempt limit off Sahel Horan's and
--  Ramtha's public forms, at the owner's decision (OQ-76). On 30 September
--  2026 the owner asked for the same on every municipality's public forms;
--  Khalidiyah's one public form is the volunteer registration (FORM-12,
--  khld_register_volunteer).
--
--  From its LIVE body (pg_get_functiondef, 30 September 2026), the text 0166
--  gave it (grep -l "function public.khld_register_volunteer"
--  supabase/migrations/*.sql lists 0161 and 0166). Three changes and
--  nothing else:
--
--    - the two bump_lookup_throttle calls go: no limit on attempts;
--    - a person already on file is identified by the ID alone, with no date
--      of birth or phone to prove it;
--    - a new person needs a name, sex and phone, and no date of birth; one
--      registered without it carries age_unrecorded_reason 'public_id_only'
--      (0171), and a date of birth a caller still sends is kept.
--
--  The staff form (FORM-12 in the app) still asks for the date of birth: it
--  is the workbook's field F057, and staff are not "applying". The signature
--  is unchanged, so anon's grant stays.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.khld_register_volunteer(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  c_fail    constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
  v_row     jsonb := coalesce(p->'row', '{}'::jsonb);
  v_type    text;
  v_raw     text := coalesce(p->>'id_number', '');
  v_key     text;
  v_muni    uuid;
  v_person  public.person%rowtype;
  v_pid     uuid;
  v_dob     date := nullif(p->>'date_of_birth', '')::date;
  v_phone   text := right(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), 9);
  v_vol     uuid;
  v_ref     text;
  v_o       jsonb;
  v_constraint text;
begin
  -- the municipality is the page's; the form exists for Khalidiyah alone
  select m.id into v_muni from public.municipality m
   where m.slug = p->>'municipality_slug' and m.code = 'KHLD' and m.is_active and m.deleted_at is null;
  if v_muni is null then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- F060 "Are you a resident of Khalidiyah? -- if no then disqualified"
  if coalesce((v_row->>'is_resident')::boolean, false) is not true then
    return jsonb_build_object('ok', false, 'result', 'not_eligible');
  end if;

  select code into v_type from public.ref_khld_id_type
   where id = nullif(v_row->>'id_type_id', '')::uuid and deleted_at is null and is_active;
  v_key := case v_type
             when 'national_id' then regexp_replace(v_raw, '\D', '', 'g')
             else nullif(upper(regexp_replace(btrim(v_raw), '\s+', ' ', 'g')), '') end;
  if v_type is null or v_key is null or (v_type = 'national_id' and v_key !~ '^\d{9}$') then
    return c_fail;
  end if;

  select * into v_person from public.person
   where case v_type when 'national_id' then national_id = v_key
                     when 'unhcr_number' then unhcr_number = v_key
                     else other_id_number = v_key end;
  if found then
    -- on file: the ID alone identifies them (0173, OQ-76); nothing about the person is changed
    if v_person.deleted_at is not null then
      return c_fail;
    end if;
    v_pid := v_person.id;
    if exists (select 1 from public.khld_volunteer v where v.person_id = v_pid and v.municipality_id = v_muni) then
      -- a live registration is answered as such; a withdrawn one is the office's to restore
      if exists (select 1 from public.khld_volunteer v where v.person_id = v_pid and v.municipality_id = v_muni and v.deleted_at is null) then
        return jsonb_build_object('ok', true, 'result', 'already_registered');
      end if;
      return jsonb_build_object('ok', false, 'result', 'withdrawn');
    end if;
  else
    -- a new person: a name, sex and phone; a date of birth only if one is sent
    if coalesce(btrim(p->>'full_name'), '') = '' or length(v_phone) < 9
       or coalesce(p->>'sex', '') not in ('male', 'female')
       or (v_dob is not null and (v_dob > current_date or v_dob < current_date - interval '120 years')) then
      return c_fail;
    end if;
  end if;

  begin
    if v_pid is null then
      insert into public.person (national_id, unhcr_number, other_id_number, full_name, date_of_birth, sex, phone, age_unrecorded_reason)
      values (case when v_type = 'national_id' then v_key end,
              case when v_type = 'unhcr_number' then v_key end,
              case when v_type = 'other_id' then v_key end,
              btrim(p->>'full_name'), v_dob, (p->>'sex')::sex_t, btrim(p->>'phone'),
              case when v_dob is null then 'public_id_only' end)
      returning id into v_pid;
    end if;

    insert into public.khld_volunteer
      (municipality_id, person_id, id_type_id, is_resident, nationality_id, nationality_other, disability_id,
       situation_id, photo_consent, affiliation_id, affiliation_other, affiliation_name, affiliation_partner_id,
       application_status, submitted_publicly, client_uuid)
    values
      (v_muni, v_pid, (v_row->>'id_type_id')::uuid, true, (v_row->>'nationality_id')::uuid,
       nullif(btrim(coalesce(v_row->>'nationality_other', '')), ''), (v_row->>'disability_id')::uuid,
       (v_row->>'situation_id')::uuid, (v_row->>'photo_consent')::boolean, (v_row->>'affiliation_id')::uuid,
       nullif(btrim(coalesce(v_row->>'affiliation_other', '')), ''), nullif(btrim(coalesce(v_row->>'affiliation_name', '')), ''),
       nullif(v_row->>'affiliation_partner_id', '')::uuid,
       'submitted', true, nullif(p->>'client_uuid', '')::uuid)
    returning id, reference into v_vol, v_ref;

    for v_o in select e from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) e loop
      if v_o->>'question_code' not in ('f064', 'f065', 'f066') then
        raise exception 'not a question of the public form' using errcode = 'check_violation';
      end if;
      insert into public.khld_volunteer_option (volunteer_id, municipality_id, question_code, option_id, option_other)
      values (v_vol, v_muni, v_o->>'question_code', (v_o->>'option_id')::uuid, nullif(btrim(coalesce(v_o->>'option_other', '')), ''));
    end loop;
    perform public.khld_child_rules('khld_volunteer', v_vol);
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'khld_volunteer_client_uuid_key' then
        return jsonb_build_object('ok', true, 'result', 'already_registered');
      end if;
      return c_fail;
    when check_violation or foreign_key_violation or not_null_violation or invalid_text_representation then
      get stacked diagnostics v_constraint = constraint_name;
      return jsonb_build_object('ok', false, 'result', 'invalid', 'constraint', nullif(v_constraint, ''));
  end;

  return jsonb_build_object('ok', true, 'result', 'registered', 'reference', v_ref);
end $function$;

-- ── verification, as anon, discarded ──────────────────────────────────────
do $verify$
declare
  v_nid text := '999000173';
  v_p   jsonb;
  v_r   jsonb;
  i     int;
begin
  if exists (select 1 from public.person where national_id = v_nid) then
    raise exception '0173: the probe national ID is in use';
  end if;
  v_p := jsonb_build_object(
    'municipality_slug', (select slug from public.municipality where code = 'KHLD'),
    'id_number', v_nid, 'full_name', '0173 probe', 'sex', 'female', 'phone', '0790000173',
    'client_uuid', gen_random_uuid(),
    'row', jsonb_build_object(
      'id_type_id', (select id from public.ref_khld_id_type where code = 'national_id'),
      'is_resident', true,
      'nationality_id', (select id from public.ref_khld_nationality where code = 'jordanian'),
      'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
      'situation_id', (select id from public.ref_khld_situation where code = 'employee'),
      'photo_consent', true,
      'affiliation_id', (select id from public.ref_khld_affiliation where code = 'community_member')),
    'options', jsonb_build_array(
      jsonb_build_object('question_code', 'f064', 'option_id', (select id from public.ref_khld_volunteer_interest where deleted_at is null order by sort_order limit 1)),
      jsonb_build_object('question_code', 'f065', 'option_id', (select id from public.ref_khld_weekday where deleted_at is null order by sort_order limit 1)),
      jsonb_build_object('question_code', 'f066', 'option_id', (select id from public.ref_khld_time_of_day where deleted_at is null order by sort_order limit 1))));
  begin
    perform set_config('role', 'anon', true);
    -- a new volunteer with no date of birth
    v_r := public.khld_register_volunteer(v_p);
    if v_r->>'result' <> 'registered' then
      raise exception '0173: a new volunteer with no date of birth got %', v_r;
    end if;
    -- the same ID again, with nothing to prove it, thirty times: no limit, and it is them
    for i in 1..30 loop
      v_r := public.khld_register_volunteer(v_p || jsonb_build_object('client_uuid', gen_random_uuid(), 'full_name', '', 'phone', ''));
      if v_r->>'result' <> 'already_registered' then
        raise exception '0173: attempt % by ID alone got %', i, v_r;
      end if;
    end loop;
    raise exception using errcode = 'P0173', message = 'rollback the probes';
  exception when sqlstate 'P0173' then null;
  end;
  if exists (select 1 from public.person where national_id = v_nid) then
    raise exception '0173: probe rows survived the rollback';
  end if;
end $verify$;
