-- ═══════════════════════════════════════════════════════════════════════════
--  0166 — the public volunteer form's partner association (F215): the list
--         of partners who provide volunteers, and the registration that
--         carries the choice
--
--  0165 added F215: a volunteer whose affiliation is "CSO / association"
--  picks the partner, from the partners who answered yes to F214. FORM-12 is
--  also filled in by the public (0161), and the municipality's owner decided
--  on 28 September 2026 that the public form shows the same list.
--
--  ── v_public_khld_volunteer_partner ──
--
--  The id and the name of each live partner who provides volunteers, and
--  its municipality's slug; nothing else about a partner (phone, contact,
--  email, what they contribute) is published. A definer view, its filters
--  in the view itself, as v_public_khld_volunteer_option (0164). The names
--  are public by the owner's decision: a partner that is a person (F006
--  "Influencer") and answered yes is named too (06_OPEN_QUESTIONS.md OQ-72).
--
--  ── khld_register_volunteer ──
--
--  From its one definition (0161: grep -l "function public.khld_register_
--  volunteer" supabase/migrations/*.sql), with affiliation_partner_id in the
--  row it inserts. Nothing else changes. The rules are the table's (0165):
--  required for a CSO, blank otherwise, a partner who provides volunteers --
--  a refusal comes back as `invalid` with the constraint, as every other
--  rule does. `create or replace` keeps the grants 0161 gave.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the partners a volunteer may name ──────────────────────────────────
create view public.v_public_khld_volunteer_partner
with (security_invoker = false) as
select p.id, p.name, m.slug as municipality_slug
  from public.khld_partner p
  join public.municipality m on m.id = p.municipality_id and m.is_active and m.deleted_at is null
 where p.provides_volunteers and p.deleted_at is null;

comment on view public.v_public_khld_volunteer_partner is
  'The partners a public volunteer registration may name for F215 (FORM-12, CSO / association): '
  'live, F214 = Yes. Id, name and municipality slug only. 0166.';

revoke all on public.v_public_khld_volunteer_partner from public, anon, authenticated;
grant select on public.v_public_khld_volunteer_partner to anon, authenticated;

-- ── 2. the registration ───────────────────────────────────────────────────
create or replace function public.khld_register_volunteer(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  c_fail    constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
  v_row     jsonb := coalesce(p->'row', '{}'::jsonb);
  v_type    text;
  v_raw     text := coalesce(p->>'id_number', '');
  v_key     text;
  v_client  text;
  v_ok      boolean;
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
  v_client := coalesce(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), 'unknown');
  v_ok := public.bump_lookup_throttle('client', v_client, interval '10 minutes', 20);

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
  v_ok := public.bump_lookup_throttle('identifier', v_type || ':' || v_key, interval '10 minutes', 5) and v_ok;
  if not v_ok then
    return c_fail;
  end if;

  select * into v_person from public.person
   where case v_type when 'national_id' then national_id = v_key
                     when 'unhcr_number' then unhcr_number = v_key
                     else other_id_number = v_key end;
  if found then
    -- on file: prove who you are; nothing about the person is changed
    if v_person.deleted_at is not null then
      return c_fail;
    end if;
    if v_person.date_of_birth is not null then
      if v_dob is null or v_person.date_of_birth <> v_dob then
        return c_fail;
      end if;
    elsif length(v_phone) < 9 or right(regexp_replace(coalesce(v_person.phone, ''), '\D', '', 'g'), 9) <> v_phone then
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
    if coalesce(btrim(p->>'full_name'), '') = '' or v_dob is null or v_dob > current_date
       or v_dob < current_date - interval '120 years' or length(v_phone) < 9
       or coalesce(p->>'sex', '') not in ('male', 'female') then
      return c_fail;
    end if;
  end if;

  begin
    if v_pid is null then
      insert into public.person (national_id, unhcr_number, other_id_number, full_name, date_of_birth, sex, phone)
      values (case when v_type = 'national_id' then v_key end,
              case when v_type = 'unhcr_number' then v_key end,
              case when v_type = 'other_id' then v_key end,
              btrim(p->>'full_name'), v_dob, (p->>'sex')::sex_t, btrim(p->>'phone'))
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
end $$;

comment on function public.khld_register_volunteer(jsonb) is
  'FORM-12 filled in by the volunteer: {municipality_slug, id_number, full_name, sex, '
  'date_of_birth, phone, row: {id_type_id, is_resident, nationality_id, ..., affiliation_name, '
  'affiliation_partner_id}, '
  'options: [{question_code f064|f065|f066, option_id, option_other}], client_uuid}. Throttled; '
  'a person on file proves who they are; answers registered | already_registered | withdrawn | '
  'not_eligible | not_open | cannot_verify | invalid. The registration is submitted and counts '
  'once staff approve it. 0161; the partner association (F215) 0166.';

-- ── verification: as anon, discarded ─────────────────────────────────────
do $verify$
declare
  v_khld    uuid := '00000000-0000-4000-8000-0000000000b2';
  v_slug    text;
  v_partner uuid;
  v_res     jsonb;
  v_row     jsonb;
  v_opts    jsonb;
begin
  select slug into v_slug from public.municipality where id = v_khld;
  insert into public.khld_partner (municipality_id, name, phone, partner_type_id, partner_category_id, provides_volunteers)
  select v_khld, '0166 probe association', '0790000166', (select id from public.ref_khld_partner_type limit 1),
         (select id from public.ref_khld_partner_category where code = 'local_association'), true
  returning id into v_partner;
  v_row := jsonb_build_object(
    'id_type_id', (select id from public.ref_khld_id_type where code = 'unhcr_number'),
    'is_resident', true,
    'nationality_id', (select id from public.ref_khld_nationality where code = 'syrian'),
    'disability_id', (select id from public.ref_khld_disability where code = 'no_difficulty'),
    'situation_id', (select id from public.ref_khld_situation where code = 'university_student'),
    'photo_consent', true,
    'affiliation_id', (select id from public.ref_khld_affiliation where code = 'cso'));
  v_opts := jsonb_build_array(
    jsonb_build_object('question_code', 'f064', 'option_id', (select id from public.ref_khld_volunteer_interest where code = 'planting')),
    jsonb_build_object('question_code', 'f065', 'option_id', (select id from public.ref_khld_weekday where code = 'saturday')),
    jsonb_build_object('question_code', 'f066', 'option_id', (select id from public.ref_khld_time_of_day where code = 'morning')));

  set local role anon;
  -- anon sees the partner, by name
  if not exists (select 1 from public.v_public_khld_volunteer_partner
                  where id = v_partner and name = '0166 probe association' and municipality_slug = v_slug) then
    raise exception '0166: anon does not see a partner who provides volunteers';
  end if;
  -- a CSO registration naming the partner is saved with it
  v_res := public.khld_register_volunteer(jsonb_build_object(
             'municipality_slug', v_slug, 'id_number', 'probe 0166 a', 'full_name', '0166 probe one', 'sex', 'male',
             'date_of_birth', '2003-03-03', 'phone', '0790000166',
             'row', v_row || jsonb_build_object('affiliation_partner_id', v_partner), 'options', v_opts));
  if v_res->>'result' is distinct from 'registered' then
    raise exception '0166: a CSO registration naming a partner was answered %', v_res;
  end if;
  -- a CSO registration without one is refused by the rule, by name
  v_res := public.khld_register_volunteer(jsonb_build_object(
             'municipality_slug', v_slug, 'id_number', 'probe 0166 b', 'full_name', '0166 probe two', 'sex', 'female',
             'date_of_birth', '2003-04-04', 'phone', '0790000167', 'row', v_row, 'options', v_opts));
  if v_res->>'result' is distinct from 'invalid' or v_res->>'constraint' is distinct from 'khld_f215_required' then
    raise exception '0166: a CSO registration without a partner was answered %', v_res;
  end if;
  reset role;
  if not exists (select 1 from public.khld_volunteer v join public.person p on p.id = v.person_id
                  where p.unhcr_number = 'PROBE 0166 A' and v.affiliation_partner_id = v_partner
                    and v.application_status = 'submitted') then
    raise exception '0166: the registration did not keep its partner';
  end if;
  -- anon reads the view and writes nothing through it
  if has_table_privilege('anon', 'public.v_public_khld_volunteer_partner', 'insert')
     or not has_table_privilege('anon', 'public.v_public_khld_volunteer_partner', 'select') then
    raise exception '0166: anon''s privileges on the partner view are not select alone';
  end if;
  raise exception using errcode = 'P0166', message = 'rollback the probes';
exception when sqlstate 'P0166' then
  null;
end $verify$;
