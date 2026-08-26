-- ═══════════════════════════════════════════════════════════════════════════
--  0044 — training_enrolment becomes an application table
--
--  A member of the public applies; the Municipality reviews; only then is
--  anyone enrolled. That review state needs somewhere to live.
--
--  ── WHY record_status_t AND NOT A NEW ENUM ──
--
--  The plan called for applied/accepted/rejected. record_status_t already
--  exists as draft/submitted/approved/rejected and exhibition_registration
--  already uses it. Since the whole point is ONE application pattern across
--  training, advisory and exhibition, they share one enum:
--
--    submitted -> applied          approved -> accepted          rejected
--
--  A second, near-identical enum would mean every screen and every query
--  translating between two vocabularies for the same idea.
--
--  ── THE BACKFILL, AND WHY THE DEFAULT IS SET TWICE ──
--
--  The rows already in this table are staff-entered COMPLETIONS, not
--  applications. Adding the column with a 'submitted' default would file every
--  finished training into a pending review queue.
--
--  So the column is added defaulting to 'approved' -- which is what every
--  existing row correctly becomes -- and the default is then changed to
--  'submitted' for everything inserted afterwards. One statement each, and at
--  no point does a completed training look pending.
--
--  ── APPLYING IS NOT COMPLETING ──
--
--  This changes nothing about A1.3. v_ind_a1_3 counts met_criteria is true; an
--  application has met_criteria null. A pending applicant is not a trained
--  person and must never be counted as one.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.training_enrolment
  add column application_status record_status_t not null default 'approved',
  add column applied_on         date;

-- Everything that existed before this migration is a completion: leave it
-- 'approved'. From here on, a new row is an application awaiting review.
alter table public.training_enrolment
  alter column application_status set default 'submitted';

comment on column public.training_enrolment.application_status is
  'Review state of the APPLICATION. Existing rows were backfilled to approved '
  'because they were staff-entered completions, not applications. Says nothing '
  'about whether the training was passed -- that is met_criteria, which is what '
  'A1.3 counts.';
comment on column public.training_enrolment.applied_on is
  'When the person applied. Null for rows entered directly by staff, which had '
  'no application step.';

create index if not exists training_enrolment_application_status_idx
  on public.training_enrolment (application_status)
  where deleted_at is null;
