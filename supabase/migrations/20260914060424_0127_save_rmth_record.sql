-- ═══════════════════════════════════════════════════════════════════════════
--  0127 — save_rmth_record: one save function for the ten Ramtha tables
--
--  Every Ramtha form saves through this function. It takes the table name
--  and one jsonb payload, and does, inside ONE exception block that covers
--  every delete (CLAUDE.md, the seventh and eighth rows of the register):
--
--    1. the person spine   `person` block → rmth_ensure_person (below): an
--                          existing national ID is prefilled and LOCKED
--                          (name never overwritten; sex and phone filled only
--                          where empty); a new one creates the shared
--                          person row (plan §5.2)
--    2. the header         insert, or update by id -- only the columns the
--                          payload names are written, so the column defaults
--                          (municipality_id above all) and the triggers
--                          (references, decision stamps, kind) do their work;
--                          an update that reaches no row answers not_found
--                          rather than pretending
--    3. the multi-selects  for each question in `option_questions`, delete
--                          then insert, with a read-back that raises
--                          insufficient_privilege when RLS filtered the
--                          delete instead of reporting a save that did not
--                          happen
--    4. the children       the support grid, the live services, the proposal
--                          links -- same delete-then-insert, same read-back,
--                          only when the payload carries the key
--    5. the derivations    what the sheets say "must follow" from other
--                          answers (0125 header): B1's three flags from the
--                          grid; SO1-0's threshold from its three questions;
--                          SO2-0's three-month point; a delivery's cycle
--                          number; and `counted_under_id` for the sheets
--                          that ask "already counted under record ___",
--                          derived from the records rather than asked blind
--
--  ── WHAT THE PAYLOAD MAY NOT WRITE ──
--
--  The database's own columns are refused as unknown, not ignored: a
--  misspelt column name would otherwise vanish silently, which is the seventh
--  row's cost from the other side. Refused: id, municipality_id, the standard
--  block, every *_decided_by/_on, first_approved_on, counted_under_id,
--  enrolment_kind, the B1 flags, so10_threshold_id, three_month_reached.
--  `reference` is allowed, because a paper form may already carry one.
--
--  ── WHAT IS CAUGHT AND WHAT IS NOT ──
--
--  Constraint and trigger refusals come back as {ok:false, result:'invalid'}
--  with the SQLSTATE, the constraint name where there is one, and the
--  message, so the screen can name the field. insufficient_privilege is NOT
--  caught: that is RLS or the read-back guard, and turning it into a tidy
--  message is the failure the guard exists to catch.
--
--  Security INVOKER: the caller's RLS decides what it can write, and the
--  function adds no privilege. rmth_ensure_person is invoker too.
-- ═══════════════════════════════════════════════════════════════════════════

create function public.rmth_ensure_person(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_nid   text := regexp_replace(coalesce(p->>'national_id', ''), '\D', '', 'g');
  v_id    uuid;
  v_del   timestamptz;
  v_sex   sex_t := nullif(p->>'sex', '')::sex_t;
  v_phone text := nullif(btrim(coalesce(p->>'phone', '')), '');
  v_name  text := nullif(btrim(coalesce(p->>'full_name', '')), '');
  v_age   int := nullif(p->>'age_years', '')::int;
begin
  if v_nid !~ '^\d{9}$' then
    raise exception 'A national ID is exactly nine digits' using errcode = 'check_violation';
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
       set sex   = coalesce(sex, v_sex),
           phone = coalesce(phone, v_phone)
     where id = v_id and (sex is null and v_sex is not null or phone is null and v_phone is not null);
    return v_id;
  end if;

  if v_name is null then
    raise exception 'A new person needs a full name' using errcode = 'not_null_violation';
  end if;
  insert into public.person (national_id, full_name, phone, sex, age_recorded)
  values (v_nid, v_name, v_phone, v_sex, v_age)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.rmth_ensure_person(jsonb) from public, anon;
grant execute on function public.rmth_ensure_person(jsonb) to authenticated;

comment on function public.rmth_ensure_person(jsonb) is
  'The Ramtha forms'' person spine. {national_id, full_name, phone, sex, '
  'age_years}: an existing person is returned with name untouched and sex/phone '
  'filled only where empty; a soft-deleted one raises P0RMT (restore, do not '
  'recreate); a new one is created. Security invoker: person''s own RLS applies.';

create function public.save_rmth_record(p_table text, p jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  c_tables   constant text[] := array['rmth_event', 'rmth_proposal', 'rmth_training_programme',
    'rmth_training_cycle', 'rmth_training_enrolment', 'rmth_project_implementer', 'rmth_incubator',
    'rmth_enterprise', 'rmth_incubation_service', 'rmth_outcome_survey'];
  c_owned    constant text[] := array['id', 'municipality_id', 'created_at', 'updated_at', 'created_by',
    'deleted_at', 'first_approved_on', 'counted_under_id', 'enrolment_kind', 'received_any',
    'any_essential', 'enters_denominator', 'so10_threshold_id', 'three_month_reached'];
  v_id       uuid := nullif(p->>'id', '')::uuid;
  v_row      jsonb := coalesce(p->'row', '{}'::jsonb);
  v_known    text[];
  v_cols     text[];
  v_col      text;
  v_list     text;
  v_muni     uuid;
  v_ref      text;
  v_person   uuid;
  v_n        int;
  v_q        text;
  v_o        jsonb;
  v_fk       text;
  v_junction text;
  v_kind     text;
  v_max      int;
  v_first    uuid;
  v_state    text;
  v_constraint text;
  v_message  text;
  v_detail   text;
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
     and a.attname not like '%\_decided\_by' and a.attname not like '%\_decided\_on';

  select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
  foreach v_col in array coalesce(v_cols, '{}'::text[]) loop
    if not (v_col = any(v_known)) then
      return jsonb_build_object('ok', false, 'result', 'unknown_column', 'column', v_col);
    end if;
  end loop;

  v_fk := case p_table
    when 'rmth_event' then 'event_id'
    when 'rmth_proposal' then 'proposal_id'
    when 'rmth_training_programme' then 'programme_id'
    when 'rmth_training_cycle' then 'cycle_id'
    when 'rmth_training_enrolment' then 'enrolment_id'
    when 'rmth_project_implementer' then 'implementer_id'
    when 'rmth_incubator' then 'incubator_id'
    when 'rmth_incubation_service' then 'service_id'
    when 'rmth_outcome_survey' then 'survey_id'
    else null end;
  v_junction := p_table || '_option';

  begin
    -- ── 1. the person spine ──────────────────────────────────────────────
    if p ? 'person' and jsonb_typeof(p->'person') = 'object' then
      -- the sheet's one Age field is the record's age_years; a new person row
      -- needs it too (person.age_or_dob), so it is carried across
      v_person := public.rmth_ensure_person(
        (p->'person') || jsonb_build_object('age_years', coalesce(p->'person'->'age_years', v_row->'age_years')));
      v_row := v_row || jsonb_build_object('person_id', v_person);
      select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
    end if;

    -- a delivery is numbered within its programme when the form does not say
    if p_table = 'rmth_training_cycle' and v_id is null
       and v_row->>'cycle_kind' = 'entrepreneurship' and coalesce(v_row->>'cycle_no', '') = '' then
      select coalesce(max(cycle_no), 0) + 1 into v_max
        from public.rmth_training_cycle
       where programme_id = (v_row->>'programme_id')::uuid and deleted_at is null;
      v_row := v_row || jsonb_build_object('cycle_no', v_max);
      select array_agg(k) into v_cols from jsonb_object_keys(v_row) k;
    end if;

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

    -- ── 3. the multi-selects ─────────────────────────────────────────────
    if p ? 'option_questions' and v_fk is not null then
      for v_q in select jsonb_array_elements_text(p->'option_questions') loop
        execute format('delete from public.%I where %I = $1 and question_code = $2', v_junction, v_fk)
          using v_id, v_q;
        execute format('select count(*) from public.%I where %I = $1 and question_code = $2', v_junction, v_fk)
          into v_n using v_id, v_q;
        if v_n > 0 then
          raise exception 'the options of % could not be replaced: % rows remain after the delete', v_q, v_n
            using errcode = 'insufficient_privilege';
        end if;
        for v_o in select e from jsonb_array_elements(coalesce(p->'options', '[]'::jsonb)) e
                    where e->>'question_code' = v_q loop
          execute format('insert into public.%I (%I, municipality_id, question_code, option_id, option_other) values ($1, $2, $3, $4, $5)',
                         v_junction, v_fk)
            using v_id, v_muni, v_q, (v_o->>'option_id')::uuid, nullif(btrim(coalesce(v_o->>'option_other', '')), '');
        end loop;
      end loop;
    end if;

    -- ── 4. the children ──────────────────────────────────────────────────
    if p_table = 'rmth_project_implementer' and p ? 'support' then
      delete from public.rmth_implementer_support where implementer_id = v_id;
      select count(*) into v_n from public.rmth_implementer_support where implementer_id = v_id;
      if v_n > 0 then
        raise exception 'the support grid could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.rmth_implementer_support (implementer_id, municipality_id, component_id, rating_id, component_other)
      select v_id, v_muni, (e->>'component_id')::uuid, (e->>'rating_id')::uuid,
             nullif(btrim(coalesce(e->>'component_other', '')), '')
        from jsonb_array_elements(p->'support') e;
    end if;

    if p_table = 'rmth_incubator' and p ? 'services_live' then
      delete from public.rmth_incubator_service_live where incubator_id = v_id;
      select count(*) into v_n from public.rmth_incubator_service_live where incubator_id = v_id;
      if v_n > 0 then
        raise exception 'the live services could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.rmth_incubator_service_live (incubator_id, municipality_id, service_id, began_on)
      select v_id, v_muni, (e->>'service_id')::uuid, nullif(e->>'began_on', '')::date
        from jsonb_array_elements(p->'services_live') e;
    end if;

    if p_table = 'rmth_training_programme' and p ? 'proposal_ids' then
      delete from public.rmth_training_programme_proposal where programme_id = v_id;
      select count(*) into v_n from public.rmth_training_programme_proposal where programme_id = v_id;
      if v_n > 0 then
        raise exception 'the linked proposals could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.rmth_training_programme_proposal (programme_id, municipality_id, proposal_id)
      select v_id, v_muni, e::uuid from jsonb_array_elements_text(p->'proposal_ids') e;
    end if;

    if p_table = 'rmth_project_implementer' and p ? 'proposal_ids' then
      delete from public.rmth_project_implementer_proposal where implementer_id = v_id;
      select count(*) into v_n from public.rmth_project_implementer_proposal where implementer_id = v_id;
      if v_n > 0 then
        raise exception 'the linked proposals could not be replaced: % rows remain after the delete', v_n
          using errcode = 'insufficient_privilege';
      end if;
      insert into public.rmth_project_implementer_proposal (implementer_id, municipality_id, proposal_id)
      select v_id, v_muni, e::uuid from jsonb_array_elements_text(p->'proposal_ids') e;
    end if;

    -- ── 5. the derivations ───────────────────────────────────────────────
    if p_table = 'rmth_project_implementer' then
      -- B1: "Enters the denominator? Yes - first record for this implementer AND
      -- interview completed AND at least one support component received";
      -- "Was at least one component rated Essential? ... must follow from the grid"
      update public.rmth_project_implementer i
         set received_any = exists (select 1 from public.rmth_implementer_support s
                                      join public.ref_rmth_support_rating r on r.id = s.rating_id
                                     where s.implementer_id = i.id and r.code <> 'not_received'),
             any_essential = exists (select 1 from public.rmth_implementer_support s
                                       join public.ref_rmth_support_rating r on r.id = s.rating_id
                                      where s.implementer_id = i.id and r.code = 'essential')
       where i.id = v_id;
      update public.rmth_project_implementer i
         set enters_denominator = (i.first_record_of_id is null)
                                  and exists (select 1 from public.ref_rmth_b1_reached rr
                                               where rr.id = i.reached_id and rr.code = 'completed')
                                  and coalesce(i.received_any, false)
       where i.id = v_id;
    end if;

    if p_table = 'rmth_outcome_survey' then
      select survey_kind into v_kind from public.rmth_outcome_survey where id = v_id;

      if v_kind = 'so1_0' then
        -- "THIS FIELD PRODUCES THE INDICATOR COUNT. It must follow from the
        -- three questions above, not be judged separately." The first four
        -- current-status options are a confirmed placement; otherwise one
        -- verifiable step (not None) plus one other step (not None).
        update public.rmth_outcome_survey s
           set so10_threshold_id = (
             select t.id from public.ref_rmth_so10_threshold t where t.code =
               case
                 when not exists (select 1 from public.ref_rmth_reached r where r.id = s.reached_id and r.code = 'yes')
                   then 'not_reached'
                 when exists (select 1 from public.ref_rmth_so10_current_status cs
                               where cs.id = s.current_status_id
                                 and cs.code in ('full_time', 'part_time', 'self_employed', 'internship'))
                   then 'yes_placement'
                 when exists (select 1 from public.rmth_outcome_survey_option o
                               join public.ref_rmth_so10_verifiable_step v on v.id = o.option_id
                              where o.survey_id = s.id and o.question_code = 'so10_verifiable_step' and v.code <> 'none')
                  and exists (select 1 from public.rmth_outcome_survey_option o
                               join public.ref_rmth_so10_other_step v on v.id = o.option_id
                              where o.survey_id = s.id and o.question_code = 'so10_other_step' and v.code <> 'none')
                   then 'yes_steps'
                 else 'no'
               end)
         where s.id = v_id;
      end if;

      if v_kind = 'so2_0' then
        -- "Has the three-month point been reached?" -- three months from the
        -- cycle's end date, as at the follow-up contact (or today)
        update public.rmth_outcome_survey s
           set three_month_reached = (
             select (c.end_date + interval '3 months')::date <= coalesce(s.contact_date, current_date)
               from public.rmth_training_cycle c where c.id = s.cycle_id)
         where s.id = v_id;
      end if;

      if v_kind in ('imp_0', 'so1_0', 'so3_0') then
        -- "Has this National ID already been counted for this indicator?"
        -- The earliest OTHER live record of the same kind and person that
        -- met its criterion; null means "No - count this person".
        select o.id into v_first
          from public.rmth_outcome_survey o
         where o.person_id = (select person_id from public.rmth_outcome_survey where id = v_id)
           and o.survey_kind = v_kind and o.id <> v_id and o.deleted_at is null
           and o.municipality_id = v_muni
           and ((v_kind = 'imp_0' and exists (select 1 from public.ref_rmth_imp0_criterion c where c.id = o.imp0_criterion_id and c.code = 'yes'))
             or (v_kind = 'so1_0' and exists (select 1 from public.ref_rmth_so10_threshold c where c.id = o.so10_threshold_id and c.code in ('yes_placement', 'yes_steps')))
             or (v_kind = 'so3_0' and exists (select 1 from public.ref_rmth_so30_criterion c where c.id = o.so30_criterion_id and c.code = 'yes')))
         order by o.created_at limit 1;
        update public.rmth_outcome_survey set counted_under_id = v_first where id = v_id;
      end if;
    end if;

    if p_table = 'rmth_training_enrolment' then
      -- "Has this National ID already completed a cycle counted under this
      -- indicator?" -- the earliest OTHER live completion of the same kind
      select e.id into v_first
        from public.rmth_training_enrolment e
        join public.rmth_training_enrolment me on me.id = v_id
       where e.person_id = me.person_id and e.enrolment_kind = me.enrolment_kind
         and e.id <> me.id and e.deleted_at is null and e.met_criteria is true
         and e.municipality_id = v_muni
       order by e.created_at limit 1;
      update public.rmth_training_enrolment set counted_under_id = v_first where id = v_id;
    end if;

    if p_table = 'rmth_incubation_service' then
      -- "Is this the participant's first time receiving incubation services
      -- from the Municipality?" -- any earlier live record for the person
      select s.id into v_first
        from public.rmth_incubation_service s
        join public.rmth_incubation_service me on me.id = v_id
       where s.person_id = me.person_id and s.id <> me.id and s.deleted_at is null
         and s.municipality_id = v_muni
       order by s.created_at limit 1;
      update public.rmth_incubation_service set counted_under_id = v_first where id = v_id;
    end if;

    if 'reference' = any(v_known) then
      execute format('select reference from public.%I where id = $1', p_table) into v_ref using v_id;
    end if;
    return jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref);

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
  'The one save path for the ten Ramtha record tables. {id?, row, person?, '
  'option_questions?, options?, support?, services_live?, proposal_ids?}. '
  'Writes only the columns the payload names, replaces the named multi-selects '
  'and children by delete-then-insert with a read-back, derives what the '
  'sheets say must follow from other answers, and returns {ok, id, reference} '
  'or {ok:false, result, ...}. One exception block; insufficient_privilege is '
  'not caught. Security invoker.';

-- ── verification: as the Ramtha admin, discarded ─────────────────────────
do $verify$
declare
  v_rmth  uuid := '00000000-0000-4000-8000-0000000000a1';
  v_res   jsonb;
  v_ev    uuid;
  v_cyc   uuid;
  v_cyc2  uuid;
  v_enr   uuid;
  v_enr2  uuid;
  v_imp   uuid;
  v_sv    uuid;
  v_person uuid;
  v_nid   text := '399000002';   -- outside the reserved demo range, never on file
  v_type  uuid;
begin
  if exists (select 1 from public.person where national_id = v_nid) then
    raise exception '0127: test national id % is on file; pick another', v_nid;
  end if;
  select id into v_type from public.ref_rmth_a12_event_type where code = 'job_fair';

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- an unknown column is refused, not dropped
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object('titel', 'x')));
    if v_res->>'result' <> 'unknown_column' then raise exception '0127: a misspelt column was accepted: %', v_res; end if;
    -- a database-owned column is refused too
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('row', jsonb_build_object('municipality_id', v_rmth)));
    if v_res->>'result' <> 'unknown_column' then raise exception '0127: municipality_id was writable: %', v_res; end if;

    -- 1. insert an event with two multi-selects; the default fills the municipality
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object(
      'row', jsonb_build_object('event_kind', 'networking', 'title', '0127 probe fair', 'start_date', '2026-10-01',
                                'end_date', '2026-10-01', 'event_type_id', v_type, 'solely_guidance', false,
                                'attendees_total', 10, 'attendees_women', 4, 'attendees_men', 6),
      'option_questions', jsonb_build_array('a12_evidence', 'a12_partner_type'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'a12_evidence', 'option_id', (select id from public.ref_rmth_a12_evidence where code = 'photos')),
        jsonb_build_object('question_code', 'a12_evidence', 'option_id', (select id from public.ref_rmth_a12_evidence where code = 'report')),
        jsonb_build_object('question_code', 'a12_partner_type', 'option_id', (select id from public.ref_rmth_a12_partner_type where code = 'university')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: event insert failed: %', v_res; end if;
    v_ev := (v_res->>'id')::uuid;
    if v_res->>'reference' <> 'RMTH-EV-2026-001' then raise exception '0127: reference was %', v_res->>'reference'; end if;
    if (select count(*) from public.rmth_event_option where event_id = v_ev) <> 3 then raise exception '0127: expected 3 option rows'; end if;
    if (select municipality_id from public.rmth_event where id = v_ev) <> v_rmth then raise exception '0127: municipality default did not fill'; end if;

    -- 2. update: one question replaced (down to one option), the other untouched
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object(
      'id', v_ev,
      'row', jsonb_build_object('title', '0127 probe fair, renamed'),
      'option_questions', jsonb_build_array('a12_evidence'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'a12_evidence', 'option_id', (select id from public.ref_rmth_a12_evidence where code = 'photos')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: event update failed: %', v_res; end if;
    if (select title from public.rmth_event where id = v_ev) <> '0127 probe fair, renamed' then raise exception '0127: update did not write'; end if;
    if (select count(*) from public.rmth_event_option where event_id = v_ev and question_code = 'a12_evidence') <> 1
       or (select count(*) from public.rmth_event_option where event_id = v_ev and question_code = 'a12_partner_type') <> 1 then
      raise exception '0127: option replacement was not per question';
    end if;

    -- 3. a constraint refusal comes back named ...
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object(
      'id', v_ev, 'row', jsonb_build_object('attendees_women', 20)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'rmth_event_women_men_within_total' then
      raise exception '0127: the check refusal was not named: %', v_res;
    end if;
    -- ... and a refusal that happens AFTER the delete (an option from the wrong
    -- list, refused by guard_rmth_option on the insert) leaves the earlier
    -- rows in place, because the delete is inside the one handler
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object(
      'id', v_ev, 'row', '{}'::jsonb,
      'option_questions', jsonb_build_array('a12_partner_type'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'a12_partner_type', 'option_id', (select id from public.ref_rmth_a13_topic where code = 'cv')))));
    if v_res->>'result' <> 'invalid' then
      raise exception '0127: an option from the wrong list was accepted: %', v_res;
    end if;
    if (select count(*) from public.rmth_event_option where event_id = v_ev and question_code = 'a12_partner_type') <> 1 then
      raise exception '0127: a refused save destroyed the partner types (the delete was outside the handler)';
    end if;

    -- 4. an update to a row that is not there answers not_found
    v_res := public.save_rmth_record('rmth_event', jsonb_build_object('id', gen_random_uuid(), 'row', jsonb_build_object('title', 'x')));
    if v_res->>'result' <> 'not_found' then raise exception '0127: expected not_found, got %', v_res; end if;

    -- 5. the person spine and counted_under: two completions of one person on two cycles
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'employability', 'title', '0127 cycle A', 'start_date', '2026-09-01', 'end_date', '2026-09-20')));
    v_cyc := (v_res->>'id')::uuid;
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'employability', 'title', '0127 cycle B', 'start_date', '2026-10-01', 'end_date', '2026-10-20')));
    v_cyc2 := (v_res->>'id')::uuid;
    if v_cyc is null or v_cyc2 is null then raise exception '0127: cycles were not created'; end if;

    v_res := public.save_rmth_record('rmth_training_enrolment', jsonb_build_object(
      'person', jsonb_build_object('national_id', v_nid, 'full_name', '0127 Probe Person', 'sex', 'female', 'phone', '0790000002'),
      'row', jsonb_build_object('cycle_id', v_cyc, 'age_years', 27, 'met_criteria', true,
                                'nationality_id', (select id from public.ref_rmth_nationality where code = 'jordanian')),
      'option_questions', jsonb_build_array('vulnerability'),
      'options', jsonb_build_array(jsonb_build_object('question_code', 'vulnerability',
                                   'option_id', (select id from public.ref_rmth_vulnerability where code = 'none')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: enrolment insert failed: %', v_res; end if;
    v_enr := (v_res->>'id')::uuid;
    select id into v_person from public.person where national_id = v_nid;
    if v_person is null then raise exception '0127: the person was not created'; end if;
    if (select counted_under_id from public.rmth_training_enrolment where id = v_enr) is not null then
      raise exception '0127: a first completion was marked as already counted';
    end if;

    v_res := public.save_rmth_record('rmth_training_enrolment', jsonb_build_object(
      'person', jsonb_build_object('national_id', v_nid, 'full_name', 'A DIFFERENT NAME', 'sex', 'male'),
      'row', jsonb_build_object('cycle_id', v_cyc2, 'age_years', 27, 'met_criteria', true)));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: second enrolment failed: %', v_res; end if;
    v_enr2 := (v_res->>'id')::uuid;
    if (select counted_under_id from public.rmth_training_enrolment where id = v_enr2) <> v_enr then
      raise exception '0127: the second completion was not marked as counted under the first';
    end if;
    -- identity is locked: the name and sex on file did not change
    if (select full_name from public.person where id = v_person) <> '0127 Probe Person'
       or (select sex from public.person where id = v_person) <> 'female' then
      raise exception '0127: an existing person''s identity was overwritten';
    end if;

    -- 6. B1's derivations from the grid
    v_res := public.save_rmth_record('rmth_project_implementer', jsonb_build_object(
      'row', jsonb_build_object('entity_name', '0127 Probe Co',
                                'reached_id', (select id from public.ref_rmth_b1_reached where code = 'completed')),
      'support', jsonb_build_array(
        jsonb_build_object('component_id', (select id from public.ref_rmth_support_component where code = 'land'),
                           'rating_id', (select id from public.ref_rmth_support_rating where code = 'essential')),
        jsonb_build_object('component_id', (select id from public.ref_rmth_support_component where code = 'financial'),
                           'rating_id', (select id from public.ref_rmth_support_rating where code = 'not_received')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: implementer insert failed: %', v_res; end if;
    v_imp := (v_res->>'id')::uuid;
    if (select received_any and any_essential and enters_denominator from public.rmth_project_implementer where id = v_imp) is not true then
      raise exception '0127: B1 flags were not derived from the grid';
    end if;
    -- rated nothing essential: the numerator flag drops, the denominator stays
    v_res := public.save_rmth_record('rmth_project_implementer', jsonb_build_object(
      'id', v_imp, 'row', '{}'::jsonb,
      'support', jsonb_build_array(
        jsonb_build_object('component_id', (select id from public.ref_rmth_support_component where code = 'land'),
                           'rating_id', (select id from public.ref_rmth_support_rating where code = 'helpful')))));
    if (select any_essential from public.rmth_project_implementer where id = v_imp) is not false
       or (select enters_denominator from public.rmth_project_implementer where id = v_imp) is not true then
      raise exception '0127: B1 flags did not follow the changed grid';
    end if;

    -- 7. SO1-0's threshold from the three questions
    v_res := public.save_rmth_record('rmth_outcome_survey', jsonb_build_object(
      'row', jsonb_build_object('survey_kind', 'so1_0', 'person_id', v_person, 'event_id', v_ev,
                                'reached_id', (select id from public.ref_rmth_reached where code = 'yes'),
                                'current_status_id', (select id from public.ref_rmth_so10_current_status where code = 'unemployed_looking')),
      'option_questions', jsonb_build_array('so10_verifiable_step', 'so10_other_step'),
      'options', jsonb_build_array(
        jsonb_build_object('question_code', 'so10_verifiable_step', 'option_id', (select id from public.ref_rmth_so10_verifiable_step where code = 'interview')),
        jsonb_build_object('question_code', 'so10_other_step', 'option_id', (select id from public.ref_rmth_so10_other_step where code = 'cv')))));
    if (v_res->>'ok')::boolean is not true then raise exception '0127: survey insert failed: %', v_res; end if;
    v_sv := (v_res->>'id')::uuid;
    if (select t.code from public.rmth_outcome_survey s join public.ref_rmth_so10_threshold t on t.id = s.so10_threshold_id where s.id = v_sv) <> 'yes_steps' then
      raise exception '0127: SO1-0 threshold was not derived as yes_steps';
    end if;
    v_res := public.save_rmth_record('rmth_outcome_survey', jsonb_build_object(
      'id', v_sv, 'row', jsonb_build_object('current_status_id', (select id from public.ref_rmth_so10_current_status where code = 'full_time'))));
    if (select t.code from public.rmth_outcome_survey s join public.ref_rmth_so10_threshold t on t.id = s.so10_threshold_id where s.id = v_sv) <> 'yes_placement' then
      raise exception '0127: SO1-0 threshold did not follow the status change';
    end if;

    reset role;
    raise exception using errcode = 'P0127', message = 'rollback the probe';
  exception
    when sqlstate 'P0127' then null;
  end;

  if exists (select 1 from public.person where national_id = v_nid) or exists (select 1 from public.rmth_event) then
    raise exception '0127: probe rows survived the rollback';
  end if;
end $verify$;
