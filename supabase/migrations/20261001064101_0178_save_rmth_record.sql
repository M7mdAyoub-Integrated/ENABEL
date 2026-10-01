-- ═══════════════════════════════════════════════════════════════════════════
--  0178 — save_rmth_record for the seven forms of
--         RMTH_Forms_and_Calculations_v2.xlsx, the person spine for FORM-01,
--         and the staff lookup by national ID
--
--  ── ONE SAVE PATH ──
--
--  Every Ramtha form saves through save_rmth_record(p_table, p), the shape of
--  save_khld_record (0161): the table and one jsonb payload
--  {id?, row, person?, option_questions?, options?}, and ONE exception block
--  that covers every delete (CLAUDE.md, the seventh and eighth rows of the
--  register):
--
--    1. the person      FORM-01 only: `person` through rmth_ensure_person,
--                       found by national ID, identity locked, empty details
--                       filled, a soft-deleted person refused with the
--                       restore path (person_deleted). A person already in
--                       the register answers already_registered, or
--                       registration_deleted, with the row's id -- the
--                       register is an entity, restored and never
--                       re-registered (CLAUDE.md), and the screen offers
--                       the way forward rather than a constraint error
--    2. the header      insert, or update by id -- only the columns the
--                       payload names, so the defaults and the guards
--                       (0177) do their work; an update that reaches no live
--                       row answers not_found
--    3. the ticks       the multi-select rows: delete then insert per
--                       question, with a read-back that raises
--                       insufficient_privilege when RLS filtered the delete
--                       instead of reporting a save that did not happen
--    4. their rules     rmth_child_rules: AC-08, AC-12, PA-05 and FU-03
--                       required while their answer is chosen and empty
--                       while it is not; "None" exclusive (AC-08, FU-03);
--                       FU-04 required exactly when FU-03 ticks an
--                       internship or paid employment -- inside the same
--                       block, so a refusal undoes the ticks it replaced
--
--  The database's own columns are refused as unknown, not ignored: the
--  standard block, municipality_id, the issued reference (PJ-01, AC-01), the
--  survey stamp (IS-03), the registration date and age group (PR-04),
--  activity_is_incubator, is_published (a coordinator's switch, not a field),
--  and FORM-01's person_id (it comes from the person block). Refusals come
--  back as {ok:false, result:'invalid'} with the SQLSTATE, the constraint and
--  the message; insufficient_privilege is not caught (the read-back guard).
--  Security invoker: RLS decides.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. the person spine, by national ID ──────────────────────────────────

create function public.rmth_ensure_person(p jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_nid  text := regexp_replace(coalesce(p->>'national_id', ''), '\D', '', 'g');
  v_id   uuid;
  v_del  timestamptz;
  v_sex  sex_t := nullif(p->>'sex', '')::sex_t;
  v_name text := nullif(btrim(coalesce(p->>'full_name', '')), '');
  v_age  int  := nullif(p->>'age_years', '')::int;
begin
  if v_nid !~ '^\d{9}$' then
    raise exception 'A national ID is exactly nine digits' using errcode = 'check_violation', constraint = 'national_id_format';
  end if;
  select id, deleted_at into v_id, v_del from public.person where national_id = v_nid;
  if v_id is not null and v_del is not null then
    -- An entity is RESTORED, never recreated (CLAUDE.md). The screen offers
    -- the restore path; this function only says why it stopped.
    raise exception 'This national ID belongs to a person who was deleted; restore them first'
      using errcode = 'P0RMT', detail = v_id::text;
  end if;
  if v_id is not null then
    -- identity is locked; empties may be filled, nothing is overwritten
    update public.person
       set sex          = coalesce(sex, v_sex),
           age_recorded = case when date_of_birth is null then coalesce(age_recorded, v_age) else age_recorded end
     where id = v_id
       and ((sex is null and v_sex is not null) or (date_of_birth is null and age_recorded is null and v_age is not null));
    return v_id;
  end if;
  if v_name is null then
    raise exception 'A new person needs a full name' using errcode = 'check_violation', constraint = 'rmth_pr07_required';
  end if;
  insert into public.person (national_id, full_name, sex, age_recorded)
  values (v_nid, v_name, v_sex, v_age)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.rmth_ensure_person(jsonb) from public, anon;
grant execute on function public.rmth_ensure_person(jsonb) to authenticated;

-- The staff lookup FORM-01 runs as the national ID is typed: the person (or
-- the deleted one to restore, with who deleted them) and, if they are in
-- Ramtha's register, that row -- live, or deleted and waiting to be restored.
create function public.rmth_person_lookup(p_national_id text)
returns table (id uuid, national_id text, full_name text, sex sex_t, deleted_at timestamptz, deleted_by text,
               beneficiary_id uuid, beneficiary_deleted_at timestamptz)
language sql
stable
set search_path = public, pg_temp
as $$
  select p.id, p.national_id, p.full_name, p.sex, p.deleted_at,
         case when p.deleted_at is null then null
              else (select public.actor_display_name(a.actor)
                      from public.audit_log a
                     where a.table_name = 'person' and a.row_id = p.id and a.action = 'delete'
                     order by a.changed_at desc limit 1) end,
         b.id, b.deleted_at
    from public.person p
    left join public.rmth_beneficiary b on b.person_id = p.id and b.municipality_id = public.my_municipality()
   where p.national_id = regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
$$;
revoke all on function public.rmth_person_lookup(text) from public, anon;
grant execute on function public.rmth_person_lookup(text) to authenticated;
comment on function public.rmth_person_lookup(text) is
  'FORM-01''s lookup by national ID: the person (or the deleted one, and who deleted them) and their '
  'Ramtha register row, live or deleted. Security invoker. 0178.';

-- ── 2. the rules a row trigger cannot see ─────────────────────────────────

create function public.rmth_child_rules(p_table text, p_id uuid)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_cat   text;
  v_n     int;
  v_none  boolean;
  v_place boolean;
  v_date  date;
begin
  if p_table = 'rmth_activity' then
    select c.code into v_cat from public.rmth_activity a join public.ref_rmth_activity_category c on c.id = a.category_id where a.id = p_id;
    select count(*), bool_or(r.code = 'none') into v_n, v_none
      from public.rmth_activity_option o join public.ref_rmth_joint_partner r on r.id = o.option_id
     where o.activity_id = p_id and o.question_code = 'ac08';
    perform public.rmth_field_rule('AC-08', v_cat = 'short_term', v_n > 0);
    if v_none and v_n > 1 then
      raise exception 'AC-08: "None" is exclusive' using errcode = 'check_violation', constraint = 'rmth_ac08_none_exclusive';
    end if;
    select count(*) into v_n from public.rmth_activity_option where activity_id = p_id and question_code = 'ac12';
    perform public.rmth_field_rule('AC-12', v_cat = 'entrepreneurship', v_n > 0);
  elsif p_table = 'rmth_participation' then
    select c.code into v_cat
      from public.rmth_participation x join public.rmth_activity a on a.id = x.activity_id
      join public.ref_rmth_activity_category c on c.id = a.category_id where x.id = p_id;
    select count(*) into v_n from public.rmth_participation_option where participation_id = p_id and question_code = 'pa05';
    perform public.rmth_field_rule('PA-05', v_cat = 'business_incubator', v_n > 0);
  elsif p_table = 'rmth_followup' then
    select count(*), bool_or(r.code = 'none'), bool_or(r.code in ('internship', 'paid_employment'))
      into v_n, v_none, v_place
      from public.rmth_followup_option o join public.ref_rmth_employability_outcome r on r.id = o.option_id
     where o.followup_id = p_id and o.question_code = 'fu03';
    perform public.rmth_field_rule('FU-03', true, v_n > 0);
    if v_none and v_n > 1 then
      raise exception 'FU-03: "None" is exclusive' using errcode = 'check_violation', constraint = 'rmth_fu03_none_exclusive';
    end if;
    select first_placement_on into v_date from public.rmth_followup where id = p_id;
    perform public.rmth_field_rule('FU-04', coalesce(v_place, false), v_date is not null);
  end if;
end $$;
revoke all on function public.rmth_child_rules(text, uuid) from public, anon;
grant execute on function public.rmth_child_rules(text, uuid) to authenticated;

-- ── 3. the save function ──────────────────────────────────────────────────

create function public.save_rmth_record(p_table text, p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  c_tables   constant text[] := array['rmth_beneficiary', 'rmth_project', 'rmth_activity', 'rmth_participation',
                                      'rmth_feedback', 'rmth_followup', 'rmth_implementer_survey'];
  c_owned    constant text[] := array['id', 'municipality_id', 'created_at', 'updated_at', 'created_by', 'deleted_at',
                                      'reference', 'surveyed_at', 'registered_on', 'age_group_id',
                                      'activity_is_incubator', 'is_published'];
  v_id       uuid := nullif(p->>'id', '')::uuid;
  v_row      jsonb := coalesce(p->'row', '{}'::jsonb);
  v_known    text[];
  v_cols     text[];
  v_col      text;
  v_list     text;
  v_muni     uuid;
  v_ref      text;
  v_person   uuid;
  v_saved    uuid;
  v_bid      uuid;
  v_bdel     timestamptz;
  v_sex      sex_t;
  v_yob      int;
  v_fk       text;
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
     and not (p_table = 'rmth_beneficiary' and a.attname = 'person_id');

  select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
  foreach v_col in array coalesce(v_cols, '{}'::text[]) loop
    if not (v_col = any(v_known)) then
      return jsonb_build_object('ok', false, 'result', 'unknown_column', 'column', v_col);
    end if;
  end loop;
  if p ? 'person' and p_table <> 'rmth_beneficiary' then
    return jsonb_build_object('ok', false, 'result', 'unknown_block', 'block', 'person');
  end if;

  v_fk := case p_table when 'rmth_activity' then 'activity_id' when 'rmth_participation' then 'participation_id'
                       when 'rmth_followup' then 'followup_id' else null end;

  begin
    -- ── 1. the person (FORM-01) ──────────────────────────────────────────
    if p_table = 'rmth_beneficiary' then
      if v_id is null and not (p ? 'person' and jsonb_typeof(p->'person') = 'object') then
        return jsonb_build_object('ok', false, 'result', 'invalid', 'message', 'a new registration needs its person');
      end if;
      if p ? 'person' and jsonb_typeof(p->'person') = 'object' then
        if v_id is null then
          -- already in the register: answered before anything is written, so
          -- a refusal never fills in the person's details on the way out
          select b.id, b.deleted_at, b.person_id into v_bid, v_bdel, v_person
            from public.person pe
            join public.rmth_beneficiary b on b.person_id = pe.id and b.municipality_id = public.my_municipality()
           where pe.national_id = regexp_replace(coalesce(p->'person'->>'national_id', ''), '\D', '', 'g');
          if v_bid is not null then
            return jsonb_build_object('ok', false, 'result',
                                      case when v_bdel is null then 'already_registered' else 'registration_deleted' end,
                                      'id', v_bid, 'person_id', v_person);
          end if;
        end if;
        -- the age a new person is recorded at: the registration year less PR-03
        v_yob := nullif(v_row->>'year_of_birth', '')::int;
        v_person := public.rmth_ensure_person((p->'person')
          || case when v_yob between 1000 and extract(year from public.rmth_today())::int
                  then jsonb_build_object('age_years', extract(year from public.rmth_today())::int - v_yob)
                  else '{}'::jsonb end);
        if v_id is null then
          v_row := v_row || jsonb_build_object('person_id', v_person);
        else
          -- an edit may fill the person's empty details, never change who it is
          select person_id into v_saved from public.rmth_beneficiary where id = v_id;
          if v_saved is distinct from v_person then
            return jsonb_build_object('ok', false, 'result', 'invalid', 'constraint', 'rmth_pr01_locked',
                                      'message', 'PR-01 cannot change on a saved registration');
          end if;
        end if;
      end if;
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

    -- FORM-01's sex is the person's: required, from the form or already on file
    if p_table = 'rmth_beneficiary' then
      select pe.sex into v_sex from public.rmth_beneficiary b join public.person pe on pe.id = b.person_id where b.id = v_id;
      perform public.rmth_field_rule('PR-02', true, v_sex is not null);
    end if;

    -- ── 3. the ticks: replaced per question, with the read-back ─────────
    if p ? 'option_questions' and v_fk is not null then
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

    -- ── 4. the rules over the ticks ──────────────────────────────────────
    perform public.rmth_child_rules(p_table, v_id);

    if p_table in ('rmth_project', 'rmth_activity') then
      execute format('select reference from public.%I where id = $1', p_table) into v_ref using v_id;
    end if;
    v_out := jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref);
    if v_person is not null then v_out := v_out || jsonb_build_object('person_id', v_person); end if;
    return v_out;

  exception
    when sqlstate 'P0RMT' then
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

revoke all on function public.save_rmth_record(text, jsonb) from public, anon;
grant execute on function public.save_rmth_record(text, jsonb) to authenticated;
comment on function public.save_rmth_record(text, jsonb) is
  'The one save path for Ramtha''s seven forms (RMTH_Forms_and_Calculations_v2.xlsx). {id?, row, person?, '
  'option_questions?, options?}. Writes only the columns the payload names, resolves FORM-01''s person by '
  'national ID, replaces the named ticks by delete-then-insert with a read-back, checks the rules over them, '
  'and answers {ok, id, reference, person_id?} or {ok:false, result: unknown_table | unknown_column | '
  'unknown_block | not_found | person_deleted | already_registered | registration_deleted | invalid}. '
  'Security invoker. 0178.';
