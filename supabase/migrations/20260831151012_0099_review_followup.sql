-- ═══════════════════════════════════════════════════════════════════════════
--  0099 — approve, reject and reopen: the review 0093 protected and nobody
--         could perform
--
--  Submit has existed since 0095. Approve, reject and reopen were enforced in
--  the database and offered nowhere, so a survey could be submitted and never
--  reviewed. 0093 spent a whole migration stopping an enumerator writing
--  'approved' themselves — protecting a state that no screen could reach.
--
--  ── THE THING A COORDINATOR MUST BE TOLD, AND WHY IT IS COUNTERINTUITIVE ──
--
--  All four views admit `submitted` and `approved` identically. So:
--
--    APPROVE   moves no figure. The survey was already being counted the
--              moment the enumerator submitted it.
--    REJECT    removes it from every indicator it currently feeds.
--    REOPEN    does exactly the same.
--
--  Approving is the one that will be misread. A coordinator who thinks
--  approval is what makes a survey count will approve one, watch the dashboard
--  not move, and conclude the platform is broken — or worse, conclude the
--  survey was not really counted and go looking for something to fix. So the
--  panel says it in advance, in words, naming the indicators that stay.
--
--  Rejecting and reopening are the ones that need stating BEFORE they happen,
--  because they take a figure back out of a quarter that may already have been
--  reported. Both name the indicators, the same way submit names them.
--
--  ── THE LISTS ARE READ, NOT ASSERTED ──
--
--  Every list in the payload comes from followup_indicator_reach (0098), asked
--  twice: once at the status the survey has now, once at the status the action
--  would leave it in. The difference between the two answers IS the sentence.
--
--  That is why approving reports an empty `indicators_removed` rather than a
--  hardcoded "approval changes nothing": if a view were ever narrowed to
--  approved-only, approving would start moving a figure and this panel would
--  say so the same day, without anybody remembering to come back here.
--
--  Nothing about "submitted and approved count the same" is written down in
--  this file. It is read out of pg_get_viewdef, per view, per call.
--
--  ── WHO MAY DO IT: THREE LAYERS, AND THE UI IS NOT ONE OF THEM ──
--
--  1. fu_update's USING admits a coordinator on any survey, and an enumerator
--     only while it is a draft (0093). The locking read below is therefore the
--     permission check for anything already submitted.
--  2. fu_update's WITH CHECK refuses an enumerator writing 'approved' or
--     'rejected' (0093).
--  3. guard_followup_review raises for any non-coordinator status change,
--     including from a connection with no JWT (0097).
--
--  The explicit gate in this function is a FOURTH thing and it exists for one
--  reason: to make the refusal readable. This returns 'not_permitted' and the
--  screen says who to ask.
--
--  It is not the boundary. Verified by taking the function out of it entirely
--  — as an enumerator, through RLS, updating followup_survey directly, in a
--  transaction that rolled back:
--
--    SUBMITTED -> approved            no error, 0 rows        status unchanged
--    SUBMITTED -> rejected            no error, 0 rows        status unchanged
--    SUBMITTED -> draft (reopen)      no error, 0 rows        status unchanged
--    their own DRAFT -> approved      RAISED 42501            status unchanged
--
--  Read the first three again. **The refusal is silent.** fu_update's USING
--  filters the row, the UPDATE affects nothing and reports success, and an
--  enumerator driving PostgREST directly would get a 200 back. That is the
--  seventh failure in CLAUDE.md exactly, and it is the whole reason the
--  read-back guard at the bottom of this function counts what came back
--  instead of trusting that the UPDATE did something.
--
--  The fourth is the one 0097 is for. On a DRAFT an enumerator passes
--  fu_update's USING, so the lock succeeds and the row is not filtered;
--  guard_followup_review is what stops them, and it got there before the
--  WITH CHECK did.
--
--  ── REOPENING IS RECOVERABLE, BY CONSTRUCTION ──
--
--  Reopen sets the survey back to `draft`, which is the state submit_followup
--  requires and the only state fu_update lets an enumerator write. So a
--  coordinator who reopens by mistake can submit it again immediately, and the
--  enumerator who filled it in can edit it again. Nothing else has to be
--  undone.
--
--  ── THE NOTE ──
--
--  Rejecting requires a reason: it is the only thing that tells the enumerator
--  what to fix, and rejected surveys are frozen to them until a coordinator
--  reopens one. Whitespace is not a reason — btrim, here and in the constraint.
--
--  Approving takes no note and clears any that is there. Passing one is
--  REFUSED rather than ignored: a value quietly dropped is the seventh failure
--  in CLAUDE.md, and "the write succeeded and did nothing" is exactly the shape
--  worth never repeating.
--
--  Reopening keeps the existing note unless a new one is given, because a
--  reopen is the moment the rejection reason becomes actionable. See 0097.
--
--  ── SHAPE ──
--
--  p_confirm false previews and writes nothing; true does the same work and
--  then writes. One body, like submit_followup, so the sentence cannot drift
--  from the act (0095).
--
--  security INVOKER: the locking read is the permission check. It calls only
--  followup_indicator_reach, which is an invoker too, so 05 §14's nested-
--  EXECUTE trap does not bite — but that is a property to preserve, not to
--  assume.
--
--  One exception block, around the whole body. There is no delete in here, so
--  0090's rule is not what it is for; it is here so a refusal arrives as a
--  result rather than as a raw error, and so that the shape is the same as the
--  other seven functions an enumerator or coordinator can trigger.
--  insufficient_privilege stays uncaught: that is the read-back guard below
--  reporting an UPDATE that RLS silently filtered, and dressing it up as a
--  tidy message is the exact failure the guard exists to catch.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.review_followup(
  p_survey_id uuid,
  p_action    text,
  p_note      text default null,
  p_confirm   boolean default false
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_survey   followup_survey%rowtype;
  v_target   record_status_t;
  v_note     text;
  v_now      text[];
  v_after    text[];
  v_removed  text[];
  v_added    text[];
  v_period   text;
  v_live     boolean;
  v_rows     int;
  v_con      text;
  v_payload  jsonb;
begin
  if p_action is null or p_action not in ('approve','reject','reopen') then
    return jsonb_build_object('ok', false, 'result', 'bad_action');
  end if;

  -- RLS applies the UPDATE policy to a locking read (0068). For a submitted,
  -- approved or rejected survey this refuses everyone but a coordinator; for a
  -- draft it also admits the enumerator, which is why the role is checked
  -- explicitly below.
  select * into v_survey from followup_survey
   where id = p_survey_id and deleted_at is null
   for update;

  if not found then
    -- Look, do not assume. An empty FOR UPDATE means "no such row" or "not
    -- yours", and reporting absence sends someone looking for a bug instead of
    -- for a coordinator. See 0068.
    if exists (select 1 from followup_survey where id = p_survey_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  -- The readable refusal. Not the boundary -- see the header.
  if not public.is_coordinator() then
    return jsonb_build_object('ok', false, 'result', 'not_permitted');
  end if;

  -- ── what state may be acted on ──────────────────────────────────────────
  --
  -- Review acts on a submitted survey. Reopen undoes any review, and the
  -- submission itself, so it accepts anything that is not already a draft.
  if p_action in ('approve','reject') then
    if v_survey.status <> 'submitted'::record_status_t then
      return jsonb_build_object('ok', false, 'result', 'not_reviewable',
                                'status', v_survey.status, 'action', p_action);
    end if;
    v_target := case p_action when 'approve' then 'approved'::record_status_t
                              else 'rejected'::record_status_t end;
  else
    if v_survey.status = 'draft'::record_status_t then
      return jsonb_build_object('ok', false, 'result', 'not_reviewable',
                                'status', v_survey.status, 'action', p_action);
    end if;
    v_target := 'draft'::record_status_t;
  end if;

  -- ── the note ────────────────────────────────────────────────────────────
  if p_action = 'reject' then
    if coalesce(btrim(p_note), '') = '' then
      -- Caught here as well as by rejected_has_a_reason, because the
      -- constraint's message names a constraint and this one names the field.
      return jsonb_build_object('ok', false, 'result', 'reason_required');
    end if;
    v_note := btrim(p_note);
  elsif p_action = 'approve' then
    if coalesce(btrim(p_note), '') <> '' then
      -- Refused, not ignored. An approval carries no note, and silently
      -- discarding one a coordinator typed is worse than saying so.
      return jsonb_build_object('ok', false, 'result', 'note_not_accepted');
    end if;
    v_note := null;
  else
    -- Reopen: a new note replaces, no note keeps the rejection reason the
    -- enumerator is about to act on.
    v_note := coalesce(nullif(btrim(coalesce(p_note, '')), ''), v_survey.review_note);
  end if;

  -- ── what moves ──────────────────────────────────────────────────────────
  --
  -- Asked twice of the same function, at two statuses. The difference is the
  -- sentence on the screen, and neither list is written down here.
  v_now   := coalesce(public.followup_indicator_reach(p_survey_id, v_survey.status), '{}'::text[]);
  v_after := coalesce(public.followup_indicator_reach(p_survey_id, v_target),        '{}'::text[]);

  select coalesce(array_agg(x order by ord), '{}'::text[]) into v_removed
    from unnest(v_now) with ordinality as u(x, ord) where not (x = any(v_after));
  select coalesce(array_agg(x order by ord), '{}'::text[]) into v_added
    from unnest(v_after) with ordinality as u(x, ord) where not (x = any(v_now));

  select p.deleted_at is null into v_live from person p where p.id = v_survey.person_id;
  v_live := coalesce(v_live, false);

  -- Every view joins the survey to a period on its contact date, so this is the
  -- quarter the figures move in. Null means none of the thirteen, which is a
  -- real answer and the screen should say it rather than hide it.
  select rp.code into v_period from reporting_period rp
   where v_survey.contact_date between rp.start_date and rp.end_date
   limit 1;

  v_payload := jsonb_build_object(
    'survey_id',           p_survey_id,
    'action',              p_action,
    'status',              v_survey.status,
    'status_after',        v_target,
    'indicators_now',      to_jsonb(v_now),
    'indicators_after',    to_jsonb(v_after),
    'indicators_removed',  to_jsonb(v_removed),
    'indicators_added',    to_jsonb(v_added),
    'period',              v_period,
    'person_live',         v_live);

  if not coalesce(p_confirm, false) then
    return jsonb_build_object('ok', true, 'result', 'preview') || v_payload;
  end if;

  -- reviewed_by and reviewed_at are stamped by guard_followup_review, not set
  -- here: a client-supplied reviewer is not evidence of who reviewed it.
  update followup_survey
     set status      = v_target,
         review_note = v_note
   where id = p_survey_id;

  -- Count what came back. The lock passed fu_update's USING, so this should be
  -- one row -- but an UPDATE that RLS filters reports success with zero, and a
  -- rejection that silently did not happen would leave a survey counting in
  -- four indicators while the screen said it had been taken out.
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception
      'reviewing survey % changed % rows, not 1', p_survey_id, v_rows
      using errcode = 'insufficient_privilege',
            hint = 'An UPDATE that RLS filters reports success. Check fu_update.';
  end if;

  return jsonb_build_object('ok', true, 'result', 'reviewed') || v_payload;

exception
  -- Same shape as submit_followup and the five section saves.
  -- insufficient_privilege stays uncaught: it is the read-back guard above.
  when check_violation or not_null_violation then
    get stacked diagnostics v_con = constraint_name;
    return jsonb_build_object('ok', false, 'result', 'invalid',
                              'constraint', coalesce(nullif(v_con, ''), 'invalid'));
end;
$function$;

comment on function public.review_followup(uuid, text, text, boolean) is
  'Approve, reject or reopen a follow-up survey. Coordinator only. p_confirm '
  'false previews and writes nothing; true does the same work and then writes, '
  'so the sentence shown cannot drift from the act (0095). Reports which '
  'indicators count this survey now and which would after, both from '
  'followup_indicator_reach (0098), which reads each view''s admitted statuses '
  'out of pg_get_viewdef -- so "approving moves no figure" is a computed '
  'result, not a claim in a comment. Rejecting requires a reason; approving '
  'refuses one rather than discarding it; reopening keeps the rejection reason '
  'unless given a new one. Reopen returns the survey to draft, which is '
  'submittable and editable again. security INVOKER: the locking read is the '
  'permission check, and fu_update plus guard_followup_review are the boundary '
  '-- the role test here only makes the refusal readable.';

revoke all on function public.review_followup(uuid, text, text, boolean) from public, anon;
grant execute on function public.review_followup(uuid, text, text, boolean) to authenticated;
