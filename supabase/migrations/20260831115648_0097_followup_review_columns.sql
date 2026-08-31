-- ═══════════════════════════════════════════════════════════════════════════
--  0097 — a follow-up survey can be submitted and never reviewed
--
--  0093 spent a whole migration protecting a review that cannot happen: it
--  stopped an enumerator writing 'approved' themselves, and 'approved' is
--  offered nowhere. `record_status_t` has had the state since the beginning.
--  Nothing has ever set it, and `followup_survey` carries no record of who
--  decided or why.
--
--  This adds the three columns. The function that writes them is 0099.
--
--  ── THE NAMES MATCH exhibition_registration, DELIBERATELY ──
--
--  `reviewed_by` and `reviewed_at` are what the other reviewed table in this
--  schema calls them (05 §5). A second spelling for the same idea is how a
--  reporting query ends up with a CASE in it.
--
--  `review_note` is new because exhibition approval has no reason field — its
--  refusals are structural (booth capacity, an ended market) and the trigger
--  raises them. A rejected survey is a judgement about content, and the only
--  person who can act on it is the enumerator who is about to be sent back to
--  a producer's yard. Without the reason they do not know what to fix.
--
--  ── WHAT EACH COLUMN MEANS, SO THE NEXT PERSON DOES NOT GUESS ──
--
--  All three describe the LAST review decision, which includes a reopen —
--  reopening is a coordinator's judgement about the survey, not an undo.
--  Submitting is not a review and does not touch them.
--
--    approve   review_note := null   an approved survey has nothing outstanding
--    reject    review_note := reason required, below
--    reopen    review_note := kept unless the coordinator supplies a new one
--
--  Keeping it on reopen is the case worth explaining. Reject freezes the survey
--  — fu_update admits an enumerator only while it is a draft — so the reason
--  sits there unreachable until a coordinator reopens it, and that reopen is
--  the exact moment the enumerator can finally act on it. Clearing it there
--  would destroy the instruction at the instant it became useful.
--
--  History is not lost either way: trg_followup_survey_audit records every
--  update, and audit_log is insert-only.
--
--  ── THE TRIGGER STAMPS, THE CONSTRAINT DEMANDS, NEITHER EDITS THE NOTE ──
--
--  guard_followup_review sets reviewed_by/reviewed_at and refuses a non-
--  coordinator. It deliberately does NOT touch review_note, even though
--  clearing it on approve would be convenient: a trigger that silently
--  discards a value somebody wrote is the seventh failure in CLAUDE.md wearing
--  a different hat — the write reports success and does not happen. 0099 sets
--  the note explicitly for all three actions instead, where it can be read.
--
--  ── WHY A TRIGGER WHEN 0093 ALREADY HAS A POLICY ──
--
--  fu_update's WITH CHECK refuses an enumerator writing 'approved' or
--  'rejected', and that is the boundary for anything arriving through
--  PostgREST. It is not the boundary for a migration, a backfill or the SQL
--  editor, none of which go through RLS at all.
--
--  So the trigger says it again, and says it the way 05 §12 requires:
--  `coalesce(current_role(), 'participant')`, which means a connection with no
--  JWT is refused rather than trusted. That WILL look like a broken trigger the
--  first time a support script hits it from a connection that owns the table.
--  It is not. Set coordinator claims in the same transaction, as §12 says, and
--  say in a comment why.
--
--  ── ONLY THE REVIEW TRANSITIONS ARE GUARDED ──
--
--  draft -> submitted changes status too, and it is not a review. Stamping it
--  would put a reviewer's name on a survey nobody has read — which is 0063's
--  argument exactly: a value generated as a side effect, in a field nobody is
--  looking at, will be wrong. The two branches below name the transitions they
--  cover and leave submit alone.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.followup_survey
  add column reviewed_by uuid references auth.users(id),
  add column reviewed_at timestamptz,
  add column review_note text;

comment on column public.followup_survey.reviewed_by is
  'Who last approved, rejected or reopened this survey. Stamped by '
  'guard_followup_review, never by the client. Null until it is first reviewed; '
  'submitting does not set it.';
comment on column public.followup_survey.reviewed_at is
  'When it was last approved, rejected or reopened.';
comment on column public.followup_survey.review_note is
  'The coordinator''s reason. Required when status is rejected (see '
  'rejected_has_a_reason). Cleared on approve and kept across a reopen, because '
  'a reopen is the moment the enumerator can finally act on it -- 0099 writes '
  'it explicitly for all three actions, no trigger edits it.';

-- Rule 6's shape, applied to a reason: a rejection whose reason is blank sends
-- the enumerator back to a producer with nothing to correct. Whitespace counts
-- as blank, because a space is what gets typed to get past a required field.
alter table public.followup_survey
  add constraint rejected_has_a_reason
  check (status <> 'rejected'::record_status_t
         or (review_note is not null and btrim(review_note) <> ''));

-- Every foreign key has an index -- followup_survey_created_by_idx is the
-- precedent, same table, same target.
create index followup_survey_reviewed_by_idx
  on public.followup_survey (reviewed_by);

create or replace function public.guard_followup_review()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.status is distinct from old.status then

    -- A review outcome, or a reopen. Submitting reaches neither branch.
    if new.status in ('approved'::record_status_t, 'rejected'::record_status_t)
       or (new.status = 'draft'::record_status_t
           and old.status <> 'draft'::record_status_t) then

      -- 05 §12: no JWT means no uid means a null role, and a guard that
      -- coalesces null to the least-privileged caller refuses rather than
      -- trusts. A script that must do this carries coordinator claims.
      if coalesce(public."current_role"()::text, 'participant') <> 'coordinator' then
        raise exception
          'Only a coordinator may approve, reject or reopen a follow-up survey'
          using errcode = 'insufficient_privilege';
      end if;

      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;
  return new;
end;
$function$;

comment on function public.guard_followup_review() is
  'Stamps reviewed_by/reviewed_at on approve, reject and reopen, and refuses '
  'anyone but a coordinator. Says again outside RLS what fu_update''s WITH '
  'CHECK says inside it (0093), because a migration or the SQL editor does not '
  'go through RLS. Does not touch review_note: 0099 writes it explicitly, so '
  'nothing a coordinator typed is silently discarded. Submitting is not a '
  'review and reaches neither branch.';

create trigger trg_followup_survey_review
  before update on public.followup_survey
  for each row execute function public.guard_followup_review();

-- 05 §11: a trigger fires as part of the statement, without consulting EXECUTE
-- on its function. A grant here would only create a second way to reach a
-- guard, from outside the context it was written for.
revoke all on function public.guard_followup_review() from public, anon, authenticated;
