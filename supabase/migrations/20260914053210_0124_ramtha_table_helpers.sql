-- ═══════════════════════════════════════════════════════════════════════════
--  0124 — three helpers the Ramtha tables share: references, "Other", options
--
--  ── 1. RMTH-EV-2026-001 ──
--
--  The forms index issues nine identifiers -- RMTH-EV events, RMTH-VG guidance
--  sessions, RMTH-PP proposals (which become the project ID on approval),
--  RMTH-TP specialised programmes, RMTH-TC employability cycles, RMTH-IN
--  incubators, RMTH-EN enterprises, RMTH-ID incubator-design cycles, RMTH-EP
--  entrepreneurship programmes -- in the shape (RMTH-XX-YYYY-000). Every
--  person-level form quotes one of them, so they must be unique and must not
--  depend on who was typing.
--
--  `rmth_reference_counter` holds the last number issued per municipality,
--  prefix and year; `rmth_next_reference` takes the next under a row lock,
--  and `rmth_assign_reference` is the BEFORE INSERT trigger that fills a
--  null `reference`. The municipality's CODE is the first segment, read from
--  the row's municipality, so a third municipality issues its own series.
--  The year is the record's own date where the table has one (the event's
--  start, the proposal's submission, the cycle's start), else the year of
--  creation; the trigger is told which column in its second argument.
--
--  A reference typed in by hand is kept if it has the right shape -- a
--  paper form may already carry one -- and the unique key refuses a repeat.
--
--  ── 2. "Other (specify)" on a single-select column ──
--
--  CLAUDE.md: the ref_ row carries allows_free_text, the owning table carries
--  a matching *_other column, and the free text is required when that
--  option is chosen. A check constraint cannot read allows_free_text from
--  another table, so it is a trigger, generic across the Ramtha tables:
--  each trigger names its (id column : ref table : other column) triples as
--  arguments. Refuses in both directions, as 0082 does for the survey: an
--  "Other" with nothing specified, and free text on an option that is not
--  "Other".
--
--  ── 3. The multi-select junctions ──
--
--  Every Ramtha record table gets ONE junction, `rmth_<table>_option`, with
--  (record_id, question_code, option_id, option_other) -- the shape 0075
--  gave the follow-up survey -- rather than one junction per list. The
--  question_code names the ref_rmth_ list, and `guard_rmth_option` is the
--  trigger that a foreign key cannot be: it refuses a question_code that is
--  not one of the multi-select lists, a question_code that does not belong
--  on that table, an option that is not a live row in that list, and the
--  two "Other" errors above. The per-table whitelist lives here rather than
--  in a table, for 0075's reason: adding a question is a migration anyway,
--  and a mapping table can be empty while looking present.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. references ────────────────────────────────────────────────────────

create table public.rmth_reference_counter (
  municipality_id  uuid not null references public.municipality(id),
  prefix           text not null,
  year             int  not null,
  last_no          int  not null default 0,
  primary key (municipality_id, prefix, year),
  constraint rmth_reference_counter_prefix_shape check (prefix ~ '^[A-Z]{2}$'),
  constraint rmth_reference_counter_year_sane check (year between 2000 and 2100)
);

-- Counters, not programme data: no standard block, no audit, no soft delete.
-- Reached only through the definer below; no client role touches the table.
alter table public.rmth_reference_counter enable row level security;
revoke all on public.rmth_reference_counter from anon, authenticated;

comment on table public.rmth_reference_counter is
  'Last number issued per municipality, prefix and year for the RMTH-XX-YYYY-000 '
  'references. No policies: only rmth_next_reference (security definer) writes it.';

create function public.rmth_next_reference(p_municipality_id uuid, p_prefix text, p_year int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_code text;
  v_no   int;
begin
  select m.code into v_code from public.municipality m where m.id = p_municipality_id;
  if v_code is null then
    raise exception 'rmth_next_reference: unknown municipality %', p_municipality_id;
  end if;

  insert into public.rmth_reference_counter (municipality_id, prefix, year, last_no)
  values (p_municipality_id, p_prefix, p_year, 1)
  on conflict (municipality_id, prefix, year)
    do update set last_no = public.rmth_reference_counter.last_no + 1
  returning last_no into v_no;

  return format('%s-%s-%s-%s', v_code, p_prefix, p_year, lpad(v_no::text, 3, '0'));
end $$;

revoke all on function public.rmth_next_reference(uuid, text, int) from public, anon, authenticated;

comment on function public.rmth_next_reference(uuid, text, int) is
  'The next RMTH-XX-YYYY-000 reference for a municipality, prefix and year, '
  'taken under the counter row''s lock. Called by rmth_assign_reference only.';

-- Trigger arguments:
--   TG_ARGV[0]  a prefix, or a mapping "kind_column=value:PREFIX,value:PREFIX"
--   TG_ARGV[1]  optional: the date column whose year the reference carries
create function public.rmth_assign_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row     jsonb := to_jsonb(new);
  v_spec    text := tg_argv[0];
  v_prefix  text;
  v_kind    text;
  v_pair    text;
  v_year    int;
  v_date    text;
begin
  if new.reference is not null then
    if new.reference !~ '^[A-Z]{2,8}-[A-Z]{2}-\d{4}-\d{3,}$' then
      raise exception 'reference % is not of the form RMTH-XX-YYYY-000', new.reference
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if position('=' in v_spec) > 0 then
    v_kind := v_row ->> split_part(v_spec, '=', 1);
    foreach v_pair in array string_to_array(split_part(v_spec, '=', 2), ',') loop
      if split_part(v_pair, ':', 1) = v_kind then
        v_prefix := split_part(v_pair, ':', 2);
      end if;
    end loop;
    -- a kind with no prefix issues no reference (an entrepreneurship
    -- delivery is numbered within its programme instead)
    if v_prefix is null or v_prefix = '' then
      return new;
    end if;
  else
    v_prefix := v_spec;
  end if;

  v_year := extract(year from now())::int;
  if tg_nargs > 1 and tg_argv[1] is not null and tg_argv[1] <> '' then
    v_date := v_row ->> tg_argv[1];
    if v_date is not null then
      v_year := extract(year from v_date::date)::int;
    end if;
  end if;

  new.reference := public.rmth_next_reference(new.municipality_id, v_prefix, v_year);
  return new;
end $$;

revoke all on function public.rmth_assign_reference() from public, anon, authenticated;

comment on function public.rmth_assign_reference() is
  'BEFORE INSERT: fills a null reference with the next RMTH-XX-YYYY-000 for '
  'the row''s municipality. Argument 1 is the prefix, or kind_column=value:PREFIX '
  'pairs; argument 2 the date column whose year is used (else the current '
  'year). A reference supplied by hand is kept if well-formed.';

-- ── 2. "Other (specify)" on single-select columns ────────────────────────
--
-- Arguments: any number of "id_column:ref_table:other_column" triples.
create function public.guard_rmth_other()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row    jsonb := to_jsonb(new);
  v_spec   text;
  v_idcol  text;
  v_table  text;
  v_othcol text;
  v_id     uuid;
  v_other  text;
  v_free   boolean;
  i        int;
begin
  for i in 0 .. tg_nargs - 1 loop
    v_spec   := tg_argv[i];
    v_idcol  := split_part(v_spec, ':', 1);
    v_table  := split_part(v_spec, ':', 2);
    v_othcol := split_part(v_spec, ':', 3);
    v_id     := (v_row ->> v_idcol)::uuid;
    v_other  := nullif(btrim(coalesce(v_row ->> v_othcol, '')), '');

    if v_id is null then
      if v_other is not null then
        raise exception '% is filled but % is empty: free text needs the option it specifies', v_othcol, v_idcol
          using errcode = 'check_violation';
      end if;
      continue;
    end if;

    execute format('select allows_free_text from public.%I where id = $1 and deleted_at is null', v_table)
      into v_free using v_id;

    if v_free is null then
      raise exception '% = % is not a live row in %', v_idcol, v_id, v_table
        using errcode = 'foreign_key_violation';
    end if;
    if v_free and v_other is null then
      raise exception 'the option chosen in % allows free text, so % must say what it was', v_idcol, v_othcol
        using errcode = 'check_violation';
    end if;
    if not v_free and v_other is not null then
      raise exception 'the option chosen in % is a fixed answer and % takes no free text', v_idcol, v_othcol
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end $$;

revoke all on function public.guard_rmth_other() from public, anon, authenticated;

comment on function public.guard_rmth_other() is
  'BEFORE INSERT OR UPDATE: for each "id_column:ref_table:other_column" '
  'argument, requires the *_other text when the chosen option allows free '
  'text and refuses it when the option does not (CLAUDE.md, "Other (please '
  'specify)"; 0082 for the survey).';

-- ── 3. the multi-select junctions ────────────────────────────────────────

create function public.guard_rmth_option()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed text[];
  v_table   text;
  v_free    boolean;
begin
  v_allowed := case tg_table_name
    when 'rmth_event_option' then
      array['a12_partner_type', 'a12_evidence', 'a13_topic', 'a13_evidence']
    when 'rmth_proposal_option' then
      array['b12_support_requested', 'b12_evidence']
    when 'rmth_training_programme_option' then
      array['b11_requirements_method', 'b11_evidence',
            'f02_content_basis', 'f02_module', 'f02_material', 'f02_evidence']
    when 'rmth_training_cycle_option' then
      array['c11_private_contribution', 'c11_academic_contribution', 'c11_joint_evidence',
            'c11_evidence', 'e03_module']
    when 'rmth_training_enrolment_option' then
      array['vulnerability', 'c12_evidence', 'e03_evidence', 'f01_module', 'f01_evidence']
    when 'rmth_project_implementer_option' then
      array['b1_evidence']
    when 'rmth_incubator_option' then
      array['e01_partner_role', 'e01_evidence']
    when 'rmth_incubation_service_option' then
      array['vulnerability', 'e02_service', 'e02_evidence']
    when 'rmth_outcome_survey_option' then
      array['vulnerability', 'imp0_verification',
            'so10_verifiable_step', 'so10_other_step', 'so10_evidence',
            'so20_placement_type', 'so20_verification',
            'so2c1_support_way', 'so2c1_evidence',
            'so30_support', 'so30_verification']
    else null
  end;

  if v_allowed is null then
    raise exception 'guard_rmth_option is attached to %, which it does not know', tg_table_name;
  end if;
  if not (new.question_code = any(v_allowed)) then
    raise exception 'question_code % does not belong on %; it accepts %',
      new.question_code, tg_table_name, array_to_string(v_allowed, ', ')
      using errcode = 'check_violation';
  end if;

  v_table := 'ref_rmth_' || new.question_code;
  execute format('select allows_free_text from public.%I where id = $1 and deleted_at is null', v_table)
    into v_free using new.option_id;

  if v_free is null then
    raise exception 'option % is not a live row in %, which is the list for %',
      new.option_id, v_table, new.question_code
      using errcode = 'foreign_key_violation';
  end if;
  if v_free and coalesce(btrim(new.option_other), '') = '' then
    raise exception 'option % in % allows free text, so option_other must say what it was',
      new.option_id, v_table
      using errcode = 'check_violation';
  end if;
  if not v_free and new.option_other is not null then
    raise exception 'option % in % is a fixed answer and takes no free text',
      new.option_id, v_table
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.guard_rmth_option() from public, anon, authenticated;

comment on function public.guard_rmth_option() is
  'The foreign key a rmth_*_option junction cannot have: option_id points '
  'into the list named by question_code. Refuses a question that is not a '
  'multi-select list, one that does not belong on this table, an option that '
  'is not live in that list, an "Other" with nothing specified, and free text '
  'on a fixed answer. Same shape as guard_followup_option (0075/0082).';

-- ── verification ──────────────────────────────────────────────────────────
do $verify$
declare
  v_r1 text;
  v_r2 text;
  v_r3 text;
begin
  -- the series counts up per prefix and year, carries the municipality's code
  begin
    v_r1 := public.rmth_next_reference('00000000-0000-4000-8000-0000000000a1', 'EV', 2026);
    v_r2 := public.rmth_next_reference('00000000-0000-4000-8000-0000000000a1', 'EV', 2026);
    v_r3 := public.rmth_next_reference('00000000-0000-4000-8000-0000000000a1', 'VG', 2026);
    if v_r1 <> 'RMTH-EV-2026-001' or v_r2 <> 'RMTH-EV-2026-002' or v_r3 <> 'RMTH-VG-2026-001' then
      raise exception '0124: references came out as %, %, %', v_r1, v_r2, v_r3;
    end if;
    if public.rmth_next_reference('00000000-0000-4000-8000-00000000005a', 'EV', 2026) <> 'SHM-EV-2026-001' then
      raise exception '0124: the first segment is not the municipality code';
    end if;
    raise exception using errcode = 'P0124', message = 'rollback the probe';
  exception
    when sqlstate 'P0124' then null;
  end;
  if exists (select 1 from public.rmth_reference_counter) then
    raise exception '0124: probe counters survived the rollback';
  end if;

  -- no client role can take a number or reach the counter
  if has_function_privilege('authenticated', 'public.rmth_next_reference(uuid, text, int)', 'execute')
     or has_function_privilege('anon', 'public.rmth_next_reference(uuid, text, int)', 'execute')
     or has_table_privilege('authenticated', 'public.rmth_reference_counter', 'select') then
    raise exception '0124: a client role reaches the reference counter';
  end if;
end $verify$;
