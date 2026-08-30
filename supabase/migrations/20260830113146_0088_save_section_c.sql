-- ═══════════════════════════════════════════════════════════════════════════
--  0088 — saving section C (Q27–Q36)
--
--  Four tables, one transaction, the same reasons as sections A and B.
--
--    followup_survey            Q29, Q30 + its override flag, Q31, Q34
--    followup_answer            Q32
--    followup_answer_option     Q27, Q28, Q33, Q36
--    followup_buyer_connection  Q35, up to three
--
--  ── Q30 IS PREFILLED, AND THE OVERRIDE IS DECIDED HERE, NOT IN THE BROWSER ──
--
--  The screen shows what the Municipality counted and lets the enumerator
--  correct it. q30_is_overridden records that they did.
--
--  It is set by comparing what arrives against count_markets_attended (0086),
--  recomputed at save time. Trusting the browser would mean a tab opened before
--  a registration was approved reports an override that never happened -- a
--  boolean nobody looks at, wrong, in the field a coordinator would read as
--  "the producer disputed our count". A value generated as a by-product, in a
--  field nobody is watching, which is the failure CLAUDE.md names.
--
--  Equal is not overridden, even when the enumerator retyped the same number.
--  The flag is about the figures disagreeing, not about the box being touched.
--
--  ── Q27 AND Q28 ARE THE SAME LIST AND MUST NOT BE THE SAME ANSWER ──
--
--  Q27 is where they sell now. Q28 is which of those are new since the support.
--  Both read ref_sales_channel, under different question codes, so a channel
--  can be current and new, current and old, but never new without being
--  current. That last one is refused: a channel in Q28 and not in Q27 is a
--  contradiction the screen should not have allowed, and storing it would put
--  a market outlet in the "gained through the programme" set that the producer
--  has just said they do not use.
--
--  ── Q35 REPEATS UP TO THREE TIMES AND IS ALL-OR-NOTHING PER BUYER ──
--
--  Every column on followup_buyer_connection is NOT NULL: name, type, how the
--  connection came about, the arrangement, whether it is still live. A buyer
--  with a name and nothing else is not a partial answer, it is an unusable row
--  that would still be counted as a connection. So a buyer is written whole or
--  not at all, and `seq` is reassigned 1..3 from the order given rather than
--  taken from the caller -- deleting the second of three should not leave a
--  gap that the unique (survey_id, seq) then refuses to reuse.
--
--  ── Q34 GATES Q35 ──
--
--  'no' means no connection, so the buyer rows go. 'yes' and
--  'connection_no_sale' both mean a connection was made -- the second one is
--  the interesting case for the programme, a market linkage that has not yet
--  produced a sale, and it must keep its buyers.
--
--  Every clear in here is read back. RLS filters a delete it will not permit
--  and reports success (0080).
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_c(
  p_survey_id     uuid,
  p_q27_options   uuid[] default null,
  p_q27_other     text default null,
  p_q28_options   uuid[] default null,
  p_q28_other     text default null,
  p_q29           text default null,
  p_q30           int default null,
  p_q31           text default null,
  p_q32           text default null,
  p_q33_options   uuid[] default null,
  p_q33_other     text default null,
  p_q34           text default null,
  p_q35           jsonb default null,
  p_q36_options   uuid[] default null,
  p_q36_other     text default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey    followup_survey%rowtype;
  v_stale     int;
  v_counted   int;
  v_connected boolean;
  v_extra     int;
  v_con       text;
begin
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- Q28 cannot name a channel Q27 does not. Refused rather than silently
  -- trimmed: the enumerator has entered a contradiction and needs to see it.
  if p_q28_options is not null and p_q27_options is not null then
    select count(*) into v_extra
      from unnest(p_q28_options) as x(id)
     where not (x.id = any (p_q27_options));
    if v_extra > 0 then
      return jsonb_build_object('ok', false, 'result', 'q28_not_in_q27', 'count', v_extra);
    end if;
  elsif p_q28_options is not null then
    return jsonb_build_object('ok', false, 'result', 'q28_not_in_q27',
                              'count', array_length(p_q28_options, 1));
  end if;

  v_counted   := count_markets_attended(v_survey.person_id);
  v_connected := p_q34 in ('yes', 'connection_no_sale');

  begin
    update followup_survey
       set q29_selling_change     = p_q29,
           q30_events_attended    = coalesce(p_q30, v_counted),
           -- The flag is about the two figures disagreeing, not about the box
           -- having been touched. Recomputed here, never taken from the caller.
           q30_is_overridden      = (p_q30 is not null and p_q30 is distinct from v_counted),
           q31_last_event_sales_band = p_q31,
           q34_connection_made    = p_q34
     where id = p_survey_id;
  exception when check_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid', 'constraint', v_con);
  end;

  -- Q32, a four-point band constrained by guard_followup_answer.
  insert into followup_answer (survey_id, question_code, value_text)
  values (p_survey_id, 'Q32', p_q32)
  on conflict (survey_id, question_code)
  do update set value_text = excluded.value_text, updated_at = now();

  -- ── the option lists ─────────────────────────────────────────────────────
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q27','Q28','Q33','Q36');

  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code in ('Q27','Q28','Q33','Q36');
  if v_stale > 0 then
    raise exception
      'could not clear section C''s options for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered, so an option id outside the list reaches
  -- guard_followup_option and is refused rather than dropped in silence.
  if p_q27_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q27', x.id,
           case when o.allows_free_text then nullif(btrim(p_q27_other), '') end
      from unnest(p_q27_options) as x(id)
      left join ref_sales_channel o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q28_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q28', x.id,
           case when o.allows_free_text then nullif(btrim(p_q28_other), '') end
      from unnest(p_q28_options) as x(id)
      left join ref_sales_channel o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q33_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q33', x.id,
           case when o.allows_free_text then nullif(btrim(p_q33_other), '') end
      from unnest(p_q33_options) as x(id)
      left join ref_market_improvement o on o.id = x.id
    on conflict do nothing;
  end if;

  if p_q36_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q36', x.id,
           case when o.allows_free_text then nullif(btrim(p_q36_other), '') end
      from unnest(p_q36_options) as x(id)
      left join ref_selling_barrier o on o.id = x.id
    on conflict do nothing;
  end if;

  -- ── Q35, the buyer connections ───────────────────────────────────────────
  delete from followup_buyer_connection where survey_id = p_survey_id;

  select count(*) into v_stale from followup_buyer_connection where survey_id = p_survey_id;
  if v_stale > 0 then
    raise exception
      'could not clear the buyer connections for survey % -- % rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  if v_connected and p_q35 is not null then
    -- seq is assigned from the order given, not taken from the caller. Removing
    -- the second of three buyers must not leave a hole that unique(survey_id,
    -- seq) then refuses to fill.
    begin
      insert into followup_buyer_connection
        (survey_id, seq, buyer_name, buyer_type_id, buyer_type_other,
         how_connected, how_connected_other, arrangement, still_active)
      select p_survey_id,
             row_number() over (order by ord)::smallint,
             btrim(e ->> 'buyer_name'),
             (e ->> 'buyer_type_id')::uuid,
             nullif(btrim(e ->> 'buyer_type_other'), ''),
             e ->> 'how_connected',
             nullif(btrim(e ->> 'how_connected_other'), ''),
             e ->> 'arrangement',
             e ->> 'still_active'
        from jsonb_array_elements(p_q35) with ordinality as t(e, ord);
    exception
      when check_violation or not_null_violation then
        get stacked diagnostics v_con = constraint_name;
        return jsonb_build_object('ok', false, 'result', 'buyer_invalid',
                                  'constraint', coalesce(v_con, 'missing_field'));
    end;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved',
                            'survey_id', p_survey_id,
                            'markets_counted', v_counted);
end;
$function$;

comment on function public.save_followup_section_c(uuid, uuid[], text, uuid[], text, text, int, text, text, uuid[], text, text, jsonb, uuid[], text) is
  'Saves section C (Q27-Q36) in one transaction across followup_survey, '
  'followup_answer, followup_answer_option and followup_buyer_connection. '
  'Refuses a Q28 channel that is not also in Q27. Decides q30_is_overridden by '
  'recomputing count_markets_attended rather than trusting the caller -- a '
  'stale tab would otherwise record an override nobody made. Clears the buyer '
  'rows when Q34 says no connection, keeps them for connection_no_sale, and '
  'reassigns seq from the order given. Every clear is read back. Never submits.';

revoke all on function public.save_followup_section_c(uuid, uuid[], text, uuid[], text, text, int, text, text, uuid[], text, text, jsonb, uuid[], text) from public, anon;
grant execute on function public.save_followup_section_c(uuid, uuid[], text, uuid[], text, text, int, text, text, uuid[], text, text, jsonb, uuid[], text) to authenticated;
