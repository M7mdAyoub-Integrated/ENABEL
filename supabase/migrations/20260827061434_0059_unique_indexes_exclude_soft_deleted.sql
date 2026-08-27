-- ═══════════════════════════════════════════════════════════════════════════
--  0059 — a withdrawn record must not occupy its slot forever (OQ-24)
--
--  `unique (person_id, session_id)` does not exclude soft-deleted rows, so
--  withdrawing someone permanently blocked them from ever being enrolled in
--  that session again. The insert failed against a row nobody could see, and
--  the public form reported "already applied" -- forever, with no screen able
--  to explain why.
--
--  Withdrawal is not a ban. If a ban is ever needed it is a separate mechanism,
--  not a side effect of soft delete.
--
--  ── THE SWEEP, AND WHY MOST OF THE 35 ARE LEFT ALONE ──
--
--  35 unique indexes sit on tables carrying deleted_at. They are NOT all the
--  same bug, and changing them all would have broken three separate things:
--
--  FIXED (5) -- "a thing a person took part in, which can be withdrawn":
--      training_enrolment    (person_id, session_id)
--      advisory_enrolment    (person_id, session_id)
--      exhibition_registration (exhibition_id, person_id)
--      followup_survey       (person_id, round)
--      partnership           (partner_id, partnership_type)
--
--  LEFT GLOBAL -- client_uuid, on six tables.
--      This is the OFFLINE IDEMPOTENCY KEY. Its entire job is "this exact
--      submission has already been seen". Made partial, a withdrawn row would
--      release the uuid and a phone re-syncing would RESURRECT the withdrawn
--      application -- precisely what client_uuid exists to prevent.
--
--  LEFT GLOBAL -- person.national_id and person.auth_user_id.
--      A soft-deleted person must NOT free their national ID. CLAUDE.md rule 6
--      is one person, one row; re-creating a deleted person under the same ID
--      produces exactly the duplicate that inflates A1.3, B1.2, D0.1 and E0.2
--      permanently. A deleted person is RESTORED, not recreated.
--
--  LEFT GLOBAL -- every ref_*.code and milestone.code.
--      Reference rows are retired with is_active = false, never deleted -- and
--      the seed migrations use `on conflict (code) do nothing`, which requires
--      a non-partial index to infer. Making these partial would silently break
--      seed idempotency.
--
--  NOT CHANGED, FLAGGED INSTEAD -- partner (name, unit).
--      Same shape, different question: partnerships and contributions hang off
--      a partner, so re-creating one under the same name splits its history
--      rather than continuing it. That is the person argument, not the
--      enrolment argument, and it is a judgement for the Coordinator.
--
--  ── ON CONFLICT ──
--
--  Nothing infers a conflict target on the five being changed, so no insert
--  breaks. `on conflict (national_id)` in apply_for_opportunity is untouched
--  because person is untouched -- deliberately.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.training_enrolment
  drop constraint training_enrolment_person_id_session_id_key;
create unique index training_enrolment_person_session_live
  on public.training_enrolment (person_id, session_id)
  where deleted_at is null;

alter table public.advisory_enrolment
  drop constraint advisory_enrolment_person_id_session_id_key;
create unique index advisory_enrolment_person_session_live
  on public.advisory_enrolment (person_id, session_id)
  where deleted_at is null;

alter table public.exhibition_registration
  drop constraint exhibition_registration_exhibition_id_person_id_key;
create unique index exhibition_registration_exhibition_person_live
  on public.exhibition_registration (exhibition_id, person_id)
  where deleted_at is null;

alter table public.followup_survey
  drop constraint followup_survey_person_id_round_key;
create unique index followup_survey_person_round_live
  on public.followup_survey (person_id, round)
  where deleted_at is null;

alter table public.partnership
  drop constraint partnership_partner_id_partnership_type_key;
create unique index partnership_partner_type_live
  on public.partnership (partner_id, partnership_type)
  where deleted_at is null;

comment on index public.training_enrolment_person_session_live is
  'One LIVE enrolment per person per session. Partial on purpose: a withdrawn '
  'enrolment must not block re-enrolling. See 06_OPEN_QUESTIONS.md OQ-24.';
comment on index public.exhibition_registration_exhibition_person_live is
  'One LIVE registration per person per market. Partial on purpose -- see OQ-24.';
