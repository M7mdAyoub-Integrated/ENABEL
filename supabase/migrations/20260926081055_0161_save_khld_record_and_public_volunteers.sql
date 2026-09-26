-- ═══════════════════════════════════════════════════════════════════════════
--  0161 — save_khld_record for the 23 tables of Khaldia_2_reviewed.xlsx, the
--         person spine with a third identifier, and the public volunteer
--         registration (FORM-12)
--
--  ── ONE SAVE PATH ──
--
--  Every Khalidiyah form saves through save_khld_record, the shape of 0148's
--  and save_rmth_record's (0127): the table and one jsonb payload, and ONE
--  exception block that covers every delete (CLAUDE.md, the seventh and
--  eighth rows of the register):
--
--    1. the person      FORM-12, -15 and -17: `person` through
--                       khld_ensure_person, found by the identifier of the
--                       TYPE the form chose (F144 / F151 / F156, read from the
--                       row's id_type_id, never from the digits), identity
--                       locked, a soft-deleted person refused with the
--                       restore path
--    2. the header      insert, or update by id -- only the columns the
--                       payload names are written, so the defaults and the
--                       triggers do their work; an update that reaches no
--                       row answers not_found
--    3. the children    the multi-select rows (<table>_option) and the
--                       partner rows (F118, F131): delete then insert, with a
--                       read-back that raises insufficient_privilege when RLS
--                       filtered the delete instead of reporting a save that
--                       did not happen; only when the payload carries them
--    4. their rules     khld_child_rules: the khld_field_rule rows for a
--                       multi-select or a partner list (required, and blank
--                       while their answer is not chosen) -- the rules a row
--                       trigger cannot see, inside the same block
--
--  The database's own columns are refused as unknown, not ignored: the
--  standard block, municipality_id, reference (F010 and every other one is
--  issued), the two stamps F012 and F159, the review of a public
--  registration, is_published, and a person table's person_id (it comes
--  from the person block). Refusals come back as {ok:false, result:'invalid'}
--  with the SQLSTATE, the constraint and the message; person_deleted
--  carries the id to restore. insufficient_privilege is not caught (the
--  read-back guard). Security invoker: RLS decides.
--
--  ── A THIRD IDENTIFIER ──
--
--  khld_ensure_person and khld_person_lookup from their last text (0148 and
--  0144: grep -l "function public.khld_ensure_person" supabase/migrations/*.sql),
--  with other_id beside national_id and unhcr_number (0158). The lookup
--  returns one more column, so it is dropped and created.
--
--  ── THE PUBLIC VOLUNTEER FORM ──
--
--  The municipality's owner decided on 26 September 2026 that FORM-12 is
--  filled in by volunteers themselves. khld_register_volunteer is the one
--  thing anon may call, the shape of apply_for_opportunity (0115, 0120):
--  security definer; throttled per client and per identifier
--  (bump_lookup_throttle, 0050); a person already on file must prove who
--  they are with their date of birth (or, where none is on file, their
--  phone) and nothing about them is changed or returned; one refusal,
--  cannot_verify, for every identity failure, so the form cannot be used to
--  learn who is registered; the registration arrives 'submitted' and counts
--  nowhere until staff approve it (0159). F060 "if no then disqualified":
--  not_eligible before anything is looked up.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the person spine: national ID, UNHCR number, or another ID ─────────

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
  v_other text;
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
  elsif v_type in ('unhcr_number', 'other_id') then
    v_unhcr := nullif(upper(regexp_replace(btrim(v_raw), '\s+', ' ', 'g')), '');
    if v_unhcr is null then
      raise exception 'The identifier number is required' using errcode = 'check_violation';
    end if;
    if v_type = 'other_id' then
      v_other := v_unhcr;
      v_unhcr := null;
      select id, deleted_at into v_id, v_del from public.person where other_id_number = v_other;
    else
      select id, deleted_at into v_id, v_del from public.person where unhcr_number = v_unhcr;
    end if;
  else
    raise exception 'id_type must be national_id, unhcr_number or other_id' using errcode = 'check_violation';
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
  insert into public.person (national_id, unhcr_number, other_id_number, full_name, phone, sex, date_of_birth, age_recorded, age_unrecorded_reason)
  values (v_nid, v_unhcr, v_other, v_name, v_phone, v_sex, v_dob, v_age,
          case when v_dob is null and v_age is null then 'khld_band_only' end)
  returning id into v_id;
  return v_id;
end $$;

drop function public.khld_person_lookup(text, text);
create function public.khld_person_lookup(p_id_type text, p_id_number text)
returns table (id uuid, national_id text, unhcr_number text, other_id_number text, full_name text, phone text,
               sex sex_t, date_of_birth date, age_recorded int, deleted_at timestamptz, deleted_by text)
language sql
stable
set search_path = public, pg_temp
as $$
  select p.id, p.national_id, p.unhcr_number, p.other_id_number, p.full_name, p.phone, p.sex, p.date_of_birth,
         p.age_recorded, p.deleted_at,
         case when p.deleted_at is null then null
              else (select public.actor_display_name(a.actor)
                      from public.audit_log a
                     where a.table_name = 'person' and a.row_id = p.id and a.action = 'delete'
                     order by a.changed_at desc limit 1) end
    from public.person p
   where (p_id_type = 'national_id' and p.national_id = regexp_replace(coalesce(p_id_number, ''), '\D', '', 'g'))
      or (p_id_type = 'unhcr_number' and p.unhcr_number = nullif(upper(regexp_replace(btrim(coalesce(p_id_number, '')), '\s+', ' ', 'g')), ''))
      or (p_id_type = 'other_id' and p.other_id_number = nullif(upper(regexp_replace(btrim(coalesce(p_id_number, '')), '\s+', ' ', 'g')), ''));
$$;
revoke all on function public.khld_person_lookup(text, text) from public, anon;
grant execute on function public.khld_person_lookup(text, text) to authenticated;
comment on function public.khld_person_lookup(text, text) is
  'The staff lookup the Khalidiyah forms use before saving: the live person, or the deleted one '
  'to restore, by national ID, UNHCR number or other ID (the type chosen on the form). 0161.';

-- ── 2. the rules a row trigger cannot see ─────────────────────────────────

create function public.khld_child_rules(p_table text, p_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  r     record;
  v_on  boolean;
  v_n   int;
begin
  execute format('select to_jsonb(t) from public.%I t where t.id = $1', p_table) into v_row using p_id;
  for r in select * from public.khld_field_rule
            where table_name = p_table and (column_name ~ '^option:' or column_name = 'partners')
            order by field_code loop
    v_on := public.khld_rule_on(v_row, r.conditions);
    if r.column_name = 'partners' then
      execute format('select count(*) from public.%I where %I = $1',
                     case p_table when 'khld_meeting' then 'khld_meeting_partner' else 'khld_activity_partner' end,
                     case p_table when 'khld_meeting' then 'meeting_id' else 'activity_id' end)
        into v_n using p_id;
    else
      execute format('select count(*) from public.%I where %I = $1 and question_code = $2',
                     p_table || '_option',
                     case p_table
                       when 'khld_rehab_report' then 'report_id'
                       when 'khld_activity_attendance' then 'attendance_id'
                       when 'khld_milestone_record' then 'milestone_record_id'
                       else regexp_replace(p_table, '^khld_', '') || '_id' end)
        into v_n using p_id, split_part(r.column_name, ':', 2);
    end if;
    if v_on and r.required and v_n = 0 then
      raise exception '% is required%', r.field_code, case when r.when_text = 'always' then '' else ' when ' || r.when_text end
        using errcode = 'check_violation', constraint = 'khld_' || lower(r.field_code) || '_required';
    end if;
    if not v_on and v_n > 0 then
      raise exception '% belongs to the answer "%", which is not chosen, so it must be empty', r.field_code, r.when_text
        using errcode = 'check_violation', constraint = 'khld_' || lower(r.field_code) || '_not_applicable';
    end if;
  end loop;
end $$;
revoke all on function public.khld_child_rules(text, uuid) from public, anon;
grant execute on function public.khld_child_rules(text, uuid) to authenticated;

-- ── 3. the save function ──────────────────────────────────────────────────

create function public.save_khld_record(p_table text, p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  c_tables   constant text[] := array[
    'khld_focal_point', 'khld_partner', 'khld_partner_contact', 'khld_meeting', 'khld_rehab_report',
    'khld_campaign', 'khld_activity', 'khld_activity_attendance', 'khld_committee_member',
    'khld_committee_meeting', 'khld_volunteer', 'khld_volunteer_attendance', 'khld_guidance_session',
    'khld_enterprise_request', 'khld_market', 'khld_vendor_application', 'khld_market_attendance',
    'khld_park_survey', 'khld_partner_survey', 'khld_contribution', 'khld_milestone_record',
    'khld_enterprise_support', 'khld_producer_survey'];
  c_person   constant text[] := array['khld_volunteer', 'khld_enterprise_request', 'khld_vendor_application'];
  c_owned    constant text[] := array['id', 'municipality_id', 'created_at', 'updated_at', 'created_by', 'deleted_at',
    'reference', 'attempted_at', 'surveyed_at', 'application_status', 'submitted_publicly', 'reviewed_by',
    'reviewed_on', 'is_published'];
  v_id       uuid := nullif(p->>'id', '')::uuid;
  v_row      jsonb := coalesce(p->'row', '{}'::jsonb);
  v_known    text[];
  v_cols     text[];
  v_col      text;
  v_list     text;
  v_muni     uuid;
  v_ref      text;
  v_person   uuid;
  v_idtype   text;
  v_fk       text;
  v_join     text;
  v_n        int;
  v_q        text;
  v_o        jsonb;
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
     and not (p_table = any(c_person) and a.attname = 'person_id');

  select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
  foreach v_col in array coalesce(v_cols, '{}'::text[]) loop
    if not (v_col = any(v_known)) then
      return jsonb_build_object('ok', false, 'result', 'unknown_column', 'column', v_col);
    end if;
  end loop;
  if p ? 'person' and not (p_table = any(c_person)) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'person');
  end if;
  if p ? 'partners' and not (p_table in ('khld_meeting', 'khld_activity')) then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'partners');
  end if;

  v_fk := case p_table
    when 'khld_meeting' then 'meeting_id' when 'khld_rehab_report' then 'report_id'
    when 'khld_campaign' then 'campaign_id' when 'khld_activity' then 'activity_id'
    when 'khld_activity_attendance' then 'attendance_id' when 'khld_volunteer' then 'volunteer_id'
    when 'khld_milestone_record' then 'milestone_record_id' else null end;
  v_join := case p_table when 'khld_meeting' then 'khld_meeting_partner' when 'khld_activity' then 'khld_activity_partner' else null end;

  begin
    -- ── 1. the person ────────────────────────────────────────────────────
    if p_table = any(c_person) and p ? 'person' and jsonb_typeof(p->'person') = 'object' then
      -- the identifier's type is the row's F144 / F151 / F156, or the saved one on an edit
      if v_row ? 'id_type_id' then
        select code into v_idtype from public.ref_khld_id_type where id = (v_row->>'id_type_id')::uuid;
      elsif v_id is not null then
        execute format('select r.code from public.%I t join public.ref_khld_id_type r on r.id = t.id_type_id where t.id = $1', p_table)
          into v_idtype using v_id;
      end if;
      v_person := public.khld_ensure_person((p->'person') || jsonb_build_object('id_type', v_idtype));
      if v_id is null then
        v_row := v_row || jsonb_build_object('person_id', v_person);
      end if;
    elsif p_table = any(c_person) and v_id is null then
      return jsonb_build_object('ok', false, 'result', 'invalid', 'message', 'a new record needs its person');
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
    if p ? 'option_questions' and v_fk is not null and to_regclass('public.' || p_table || '_option') is not null then
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

    if p ? 'partners' and v_join is not null then
      execute format('delete from public.%I where %I = $1', v_join, v_fk) using v_id;
      execute format('select count(*) from public.%I where %I = $1', v_join, v_fk) into v_n using v_id;
      if v_n > 0 then
        raise exception 'the partners could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      execute format('insert into public.%I (%I, partner_id, municipality_id) select $1, x::uuid, $2 from jsonb_array_elements_text($3) x',
                     v_join, v_fk)
        using v_id, v_muni, p->'partners';
    end if;

    -- ── 4. the rules over the children ───────────────────────────────────
    perform public.khld_child_rules(p_table, v_id);

    if 'reference' = any(select a.attname::text from pg_attribute a
                          where a.attrelid = ('public.' || quote_ident(p_table))::regclass and a.attnum > 0 and not a.attisdropped) then
      execute format('select reference from public.%I where id = $1', p_table) into v_ref using v_id;
    end if;
    v_out := jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref);
    if v_person is not null then v_out := v_out || jsonb_build_object('person_id', v_person); end if;
    return v_out;

  exception
    when sqlstate 'P0KHL' then
      get stacked diagnostics v_detail = pg_exception_detail;
      return jsonb_build_object('ok', false, 'result', 'person_deleted', 'person_id', v_detail);
    when check_violation or foreign_key_violation or unique_violation or not_null_violation
         or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range
         or invalid_datetime_format or string_data_right_truncation then
      get stacked diagnostics v_state = returned_sqlstate, v_constraint = constraint_name, v_message = message_text;
      return jsonb_build_object('ok', false, 'result', 'invalid', 'code', v_state,
                                'constraint', nullif(v_constraint, ''), 'message', v_message);
  end;
end $$;

revoke all on function public.save_khld_record(text, jsonb) from public, anon;
grant execute on function public.save_khld_record(text, jsonb) to authenticated;
comment on function public.save_khld_record(text, jsonb) is
  'The one save path for the Khalidiyah forms (Khaldia_2_reviewed.xlsx). {id?, row, person?, '
  'option_questions?, options?, partners?}. Writes only the columns the payload names, resolves '
  'the person of FORM-12 / -15 / -17 by the ID type the form chose, replaces the named children '
  'by delete-then-insert with a read-back, checks the rules over them, and answers {ok, id, '
  'reference, person_id?} or {ok:false, result: unknown_table | unknown_column | unknown_block | '
  'not_found | person_deleted | invalid}. Security invoker. 0161.';

-- ── 4. the public volunteer registration (FORM-12) ────────────────────────

create function public.khld_register_volunteer(p jsonb)
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
       situation_id, photo_consent, affiliation_id, affiliation_other, affiliation_name,
       application_status, submitted_publicly, client_uuid)
    values
      (v_muni, v_pid, (v_row->>'id_type_id')::uuid, true, (v_row->>'nationality_id')::uuid,
       nullif(btrim(coalesce(v_row->>'nationality_other', '')), ''), (v_row->>'disability_id')::uuid,
       (v_row->>'situation_id')::uuid, (v_row->>'photo_consent')::boolean, (v_row->>'affiliation_id')::uuid,
       nullif(btrim(coalesce(v_row->>'affiliation_other', '')), ''), nullif(btrim(coalesce(v_row->>'affiliation_name', '')), ''),
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

revoke all on function public.khld_register_volunteer(jsonb) from public;
grant execute on function public.khld_register_volunteer(jsonb) to anon, authenticated;
comment on function public.khld_register_volunteer(jsonb) is
  'FORM-12 filled in by the volunteer: {municipality_slug, id_number, full_name, sex, '
  'date_of_birth, phone, row: {id_type_id, is_resident, nationality_id, ..., affiliation_name}, '
  'options: [{question_code f064|f065|f066, option_id, option_other}], client_uuid}. Throttled; '
  'a person on file proves who they are; answers registered | already_registered | withdrawn | '
  'not_eligible | not_open | cannot_verify | invalid. The registration is submitted and counts '
  'once staff approve it. 0161.';

-- ── verification: as anon, discarded ─────────────────────────────────────
do $verify$
declare
  v_khld  uuid := '00000000-0000-4000-8000-0000000000b2';
  v_slug  text;
  v_res   jsonb;
  v_nat   uuid;
  v_dis   uuid;
  v_sit   uuid;
  v_aff   uuid;
  v_idt   uuid;
  v_day   uuid;
  v_time  uuid;
  v_int   uuid;
begin
  select id into v_idt from public.ref_khld_id_type where code = 'unhcr_number';
  select id into v_nat from public.ref_khld_nationality where code = 'jordanian';
  select id into v_dis from public.ref_khld_disability where code = 'no_difficulty';
  select id into v_sit from public.ref_khld_situation where code = 'employee';
  select id into v_aff from public.ref_khld_affiliation where code = 'community_member';
  select id into v_int from public.ref_khld_volunteer_interest where code = 'cleaning';
  select id into v_day from public.ref_khld_weekday where code = 'friday';
  select id into v_time from public.ref_khld_time_of_day where code = 'evening';
  select slug into v_slug from public.municipality where id = v_khld;

  -- anon: not a resident is not eligible, before anything is looked up
  set local role anon;
  v_res := public.khld_register_volunteer(jsonb_build_object('municipality_slug', v_slug,
             'row', jsonb_build_object('is_resident', false)));
  if v_res->>'result' <> 'not_eligible' then raise exception '0161: a non-resident was answered %', v_res; end if;
  -- anon: a complete public registration is saved, submitted, with its options
  v_res := public.khld_register_volunteer(jsonb_build_object(
             'municipality_slug', v_slug,
             'id_number', ' probe  0161 a ', 'full_name', '0161 probe volunteer', 'sex', 'female', 'date_of_birth', '2000-05-05',
             'phone', '0790000161',
             'row', jsonb_build_object('id_type_id', v_idt, 'is_resident', true, 'nationality_id', v_nat, 'disability_id', v_dis,
                                       'situation_id', v_sit, 'photo_consent', true, 'affiliation_id', v_aff),
             'options', jsonb_build_array(
               jsonb_build_object('question_code', 'f064', 'option_id', v_int),
               jsonb_build_object('question_code', 'f065', 'option_id', v_day),
               jsonb_build_object('question_code', 'f066', 'option_id', v_time))));
  reset role;
  if v_res->>'result' <> 'registered' then
    raise exception '0161: the public registration was answered %', v_res;
  elsif not exists (select 1 from public.khld_volunteer v join public.person pp on pp.id = v.person_id
                     where pp.unhcr_number = 'PROBE 0161 A' and v.application_status = 'submitted' and v.submitted_publicly
                       and (select count(*) from public.khld_volunteer_option o where o.volunteer_id = v.id) = 3) then
    raise exception '0161: the public registration is not a submitted volunteer with three options';
  end if;
  -- anon: without the day, the time and the interest, the multi-select rules refuse it
  set local role anon;
  v_res := public.khld_register_volunteer(jsonb_build_object(
             'municipality_slug', v_slug,
             'id_number', 'probe 0161 b', 'full_name', '0161 probe two', 'sex', 'male', 'date_of_birth', '2001-05-05',
             'phone', '0790000162',
             'row', jsonb_build_object('id_type_id', v_idt, 'is_resident', true, 'nationality_id', v_nat, 'disability_id', v_dis,
                                       'situation_id', v_sit, 'photo_consent', true, 'affiliation_id', v_aff)));
  reset role;
  if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'khld_f064_required' then
    raise exception '0161: a registration without its required multi-selects was answered %', v_res;
  end if;
  -- the same person again, with the wrong date of birth: cannot_verify, nothing revealed
  set local role anon;
  v_res := public.khld_register_volunteer(jsonb_build_object(
             'municipality_slug', v_slug,
             'id_number', 'PROBE 0161 A', 'date_of_birth', '1999-01-01',
             'row', jsonb_build_object('id_type_id', v_idt, 'is_resident', true)));
  reset role;
  if v_res->>'result' <> 'cannot_verify' then
    raise exception '0161: a wrong date of birth was answered %', v_res;
  end if;
  -- anon cannot call the staff save path
  begin
    set local role anon;
    perform public.save_khld_record('khld_focal_point', '{"row": {}}'::jsonb);
    reset role;
    raise exception '0161: anon could call save_khld_record';
  exception when insufficient_privilege then
    reset role;
  end;
  raise exception using errcode = 'P0161', message = 'rollback the probes';
exception when sqlstate 'P0161' then
  null;
end $verify$;
