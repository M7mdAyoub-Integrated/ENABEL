-- ═══════════════════════════════════════════════════════════════════════════
--  0094 — saving section E (Q41–Q43), the closing section, asked in every round
--
--  Two tables, one transaction, the same shape as A, B, C and D.
--
--    followup_survey        Q43, the enumerator's notes
--    followup_answer        Q42, a boolean
--    followup_answer_option Q41, list ref_support_need, one free-text option
--
--  ── NOTHING HERE FEEDS AN INDICATOR, AND THAT IS WORTH SAYING ──
--
--  A1 reads Q08, B1 reads Q14 and Q16, C1 reads Q17, IMP-0 reads Q37. Q41, Q42
--  and Q43 are read by a coordinator looking at one producer, and by nothing
--  else. This section moves no figure.
--
--  What it is adjacent to is the act that DOES move all four -- submitting --
--  and the two are deliberately not the same function. See 0095.
--
--  ── THE STORAGE ALL EXISTED ALREADY ──
--
--  `ref_support_need` was seeded with Arabic by 0075, `guard_followup_option`
--  has mapped Q41 to it since then, `guard_followup_answer` has admitted Q42
--  as a free `value_boolean` since 0078, and `q43_enumerator_notes` has been a
--  column on followup_survey since 0011. So this is a function, not a schema
--  change, and nothing below creates a table.
--
--  ── Q42 IS UPSERTED EVEN WHEN IT IS NULL ──
--
--  The same as Q7, Q10, Q12 and Q13 in section A: the row means the question
--  was put, `value_boolean` means what was answered, and null means it was not.
--
--  The consequence lands in 0095 rather than here, and it is the reason to
--  state it: "has section E been filled in" cannot be asked as "is there a Q42
--  row", because saving an empty section E writes one. It has to be asked of
--  the VALUE. Every section in this survey has that property and 0095 tests all
--  six on values for exactly this reason.
--
--  ── Q41 IS REPLACED, NOT MERGED, AND THE CLEAR IS READ BACK ──
--
--  Delete-then-insert is the only way to say "these and only these", and RLS
--  filters a delete it will not permit while reporting success (0080). So the
--  clear is counted afterwards and a survivor is a hard error, not a message.
--
--  ── ONE EXCEPTION BLOCK, ROUND THE WHOLE BODY ──
--
--  Covering the delete above it. A handler that began after it would catch a
--  refusal, report "not saved", and leave the previous answers destroyed --
--  0090, now a rule in CLAUDE.md. `insufficient_privilege` stays uncaught: that
--  is the read-back guard, and turning it into a tidy message is the failure it
--  exists to catch.
--
--  `foreign_key_violation` is also left uncaught, matching A through D. That is
--  `guard_followup_option` reporting an option id that is not a live row in
--  ref_support_need at all -- reachable from a tampered request or a tab open
--  since the list changed, not from the screen. Dressing it as an ordinary
--  validation refusal would make a rejected identifier look like a typo.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.save_followup_section_e(
  p_survey_id   uuid,
  p_q41_options uuid[]  default null,
  p_q41_other   text    default null,
  p_q42         boolean default null,
  p_q43         text    default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey followup_survey%rowtype;
  v_stale  int;
  v_con    text;
begin
  -- Locked, so two enumerators on the same draft serialise. RLS applies the
  -- UPDATE policy to a locking read (see 0068), which is also what refuses
  -- anyone who may not write this survey -- an enumerator after 0093 reaches
  -- this only while the survey is a draft.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- Section E is put in every round, so there is no round gate here. Section D
  -- has one because Q37-Q40 exist only at twelve months; Q41-Q43 do not.
  update followup_survey
     set q43_enumerator_notes = nullif(btrim(p_q43), '')
   where id = p_survey_id;

  -- ── Q42 ──────────────────────────────────────────────────────────────────
  insert into followup_answer (survey_id, question_code, value_boolean)
  values (p_survey_id, 'Q42', p_q42)
  on conflict (survey_id, question_code)
  do update set value_boolean = excluded.value_boolean, updated_at = now();

  -- ── Q41 ──────────────────────────────────────────────────────────────────
  delete from followup_answer_option
   where survey_id = p_survey_id and question_code = 'Q41';

  select count(*) into v_stale from followup_answer_option
   where survey_id = p_survey_id and question_code = 'Q41';
  if v_stale > 0 then
    raise exception
      'could not clear Q41 for survey % -- % option rows survived the delete',
      p_survey_id, v_stale
      using errcode = 'insufficient_privilege',
            hint = 'A delete that RLS filters reports success. Check for a DELETE policy.';
  end if;

  -- LEFT joined, not filtered, so an option id outside the list reaches
  -- guard_followup_option and is refused rather than dropped in silence. The
  -- join also puts the free text on the one option that takes it and null on
  -- the rest, so both halves of that guard are satisfied by construction.
  if p_q41_options is not null then
    insert into followup_answer_option (survey_id, question_code, option_id, option_other)
    select p_survey_id, 'Q41', x.id,
           case when o.allows_free_text then nullif(btrim(p_q41_other), '') end
      from unnest(p_q41_options) as x(id)
      left join ref_support_need o on o.id = x.id
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'result', 'saved', 'survey_id', p_survey_id);

exception
  -- One block, round the whole body, covering the delete above. See 0090.
  -- insufficient_privilege is deliberately NOT caught -- it is the read-back
  -- guard reporting that RLS filtered a delete.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

comment on function public.save_followup_section_e(uuid, uuid[], text, boolean, text) is
  'Saves section E (Q41-Q43) in one transaction across followup_survey and its '
  'answer and option children. Asked in every round -- no round gate, unlike '
  'section D. Feeds no indicator: A1, B1, C1 and IMP-0 read Q08, Q14/Q16, Q17 '
  'and Q37. Q42 is upserted even when null, so emptiness must be judged on the '
  'value and not on the row -- see 0095. Q41 is replaced, and the clear is read '
  'back because RLS filters a delete it will not permit. NEVER SUBMITS: '
  'submitting is submit_followup(), a separate deliberate act.';

revoke all on function public.save_followup_section_e(uuid, uuid[], text, boolean, text) from public, anon;
grant execute on function public.save_followup_section_e(uuid, uuid[], text, boolean, text) to authenticated;
