-- ═══════════════════════════════════════════════════════════════════════════
--  0100 — a rejection could never be previewed, so the one action that takes a
--         figure out of a reported quarter was the one that never said so
--
--  ── WHAT WAS WRONG ──
--
--  0099 checked the note before it built the payload. The check does not look
--  at p_confirm, so it fired on the preview too:
--
--      review_followup(id, 'reject', null, false)  ->  {"result":"reason_required"}
--
--  The screen asks for the preview the moment a coordinator picks "Reject" —
--  before they have typed anything, because the reason box is IN the panel the
--  preview populates. So the panel never showed:
--
--      "Rejecting takes this survey out of A1 · B1 · C1 · IMP-0."
--      "Those figures are for the 26/Q3 reporting period, which may already
--       have been reported."
--
--  Of the three actions, rejecting is the one whose consequence most needed
--  stating in advance, and it was the only one that could not state it.
--  Approve and reopen were unaffected: neither requires a note, so both
--  previewed correctly, and testing those two proved nothing about this one.
--
--  ── AND IT SURFACED AS A RAW LOCALE KEY ──
--
--  `reason_required` is not one of the results the screen's "cannot preview"
--  branch has wording for, so the panel rendered the literal string
--  `review.blocked.reason_required` to a coordinator. That is CLAUDE.md's
--  fifth failure again — a key on a live screen — and the `defaultValue` sitting
--  beside it did not catch it, because `parseMissingKeyHandler` was written as
--  `(key) => key` and discarded the default. Fourteen fallbacks across nine
--  files had never fired. Both are fixed; neither would have been found without
--  opening the screen.
--
--  ── THE RULE ──
--
--  > A preview never refuses on the CONTENT of what is being submitted. It
--  > describes what the action would do. Refusals about content belong to the
--  > act.
--
--  What a rejection does to the figures does not depend on the words in the
--  reason, so making the description conditional on them was wrong on its own
--  terms. Both note refusals now fire only when p_confirm is true:
--
--    reason_required     rejecting with a blank reason
--    note_not_accepted   approving with a note, which is refused rather than
--                        silently dropped
--
--  The state-machine checks stay where they are, above the preview, and that
--  is deliberate rather than inconsistent: "you cannot approve a draft" is a
--  fact about the survey, so there is no consequence to describe. "You have not
--  typed a reason yet" is a fact about the form.
--
--  ── ON REPLACING IT ──
--
--      grep -l "function public.review_followup" supabase/migrations/*.sql
--
--  One file: 0099. Nothing else has touched it, so there is no later change to
--  revert (0083). The body below is 0099's own applied text with the two
--  refusals moved past the preview return and nothing else altered; it was
--  derived from the file by script and the diff printed.
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
  --
  -- Computed here, refused below. A preview must describe what the action
  -- would do; whether the reason box has been filled in yet is not part of
  -- that, and making it part of it meant a rejection could never be previewed
  -- at all. See 0100.
  if p_action = 'reject' then
    v_note := nullif(btrim(coalesce(p_note, '')), '');
  elsif p_action = 'approve' then
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

  -- ── refusals about the note, now that we are actually writing ───────────
  --
  -- Below the preview return on purpose (0100). rejected_has_a_reason enforces
  -- the same rule in the table; this one is here because a constraint names a
  -- constraint and this names the field.
  if p_action = 'reject' and v_note is null then
    return jsonb_build_object('ok', false, 'result', 'reason_required') || v_payload;
  end if;

  -- Refused, not ignored. An approval carries no note, and silently discarding
  -- one a coordinator typed is worse than saying so.
  if p_action = 'approve' and coalesce(btrim(coalesce(p_note, '')), '') <> '' then
    return jsonb_build_object('ok', false, 'result', 'note_not_accepted') || v_payload;
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
