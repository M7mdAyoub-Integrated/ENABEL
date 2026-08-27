-- ═══════════════════════════════════════════════════════════════════════════
--  0063 — where a training session came from, recorded rather than inferred
--
--  ── THE DEFECT THIS CLOSES ──
--
--  `resolveSession()` in data/completions.ts creates a training_session as a
--  BY-PRODUCT of recording a completion, for a course that was never set up in
--  the system. It inserted with `is_delivered = true`.
--
--  v_ind_d0_2 counts delivered sessions with a food-processing topic. So
--  recording one completion moved a donor indicator, with no form filled in and
--  nothing on screen saying so. Measured: D0.2 went 2 -> 3 on a single
--  completion, and 3 -> 4 when a second clerk entered day two of the SAME
--  course, because matching is on (topic_id, start_date) and a new date is a
--  new session.
--
--  ── WHY A COLUMN AND NOT A HEURISTIC ──
--
--  The alternative was inferring it: no focal point, no application window,
--  is_delivered true. That works on today's data and is already one edit from
--  breaking -- the create-training form makes the application window and seats
--  optional, so its correctness now rests on `focal_point` staying required on
--  a form written yesterday. Nobody would think to check that before relaxing
--  it.
--
--  Provenance is a fact about how a row was made. It should be stored, not
--  reconstructed from the shape of what is missing.
--
--  ── WHAT CHANGES BESIDES THE COLUMN ──
--
--  resolveSession now writes `origin = 'completion'` AND `is_delivered = false`.
--  The flag is the part that was actually wrong: `is_delivered` asserts a
--  countable session took place, and the coordinator recording a completion
--  never made that assertion. The row now says what it is -- a person completed
--  something and the session details are not known yet -- and a coordinator
--  supplies them and records delivery deliberately.
--
--  A1.3 IS UNAFFECTED. v_ind_a1_3 requires training_session.deleted_at is null
--  and says nothing about is_delivered, so completions keep counting people
--  exactly as before. Checked against the view definition, not assumed.
--
--  D0.2 will under-report until someone confirms delivery. That is the right
--  direction: under-reporting visibly, in a queue, beats over-reporting
--  silently in a donor return.
--
--  ── BACKFILL ──
--
--  Everything existing is 'created'. The three seeded sessions came from
--  0024_seed_demo, deliberately set up as delivered; the two published ones
--  were set up by hand. None of them came from a completion. The only two rows
--  resolveSession ever produced are already soft-deleted Phase 4 test
--  artefacts, and one is titled "Phase4 test — New Trainee" -- a person's name
--  in the course-title field, which is the argument for this column in a
--  sentence.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.training_session
  add column origin text not null default 'created'
    constraint training_session_origin_known
      check (origin in ('created', 'completion'));

comment on column public.training_session.origin is
  'How this row came to exist. ''created'' = set up through the create-training '
  'form or a migration. ''completion'' = created as a by-product of recording a '
  'completion for a course that was never set up, by resolveSession(). A '
  'completion-origin row starts is_delivered = false and must not count towards '
  'D0.2 until a coordinator supplies the details and records delivery.';

-- Reading the sessions list filters on this, and the "needs details" queue is
-- the whole point of recording it.
create index training_session_origin_idx
  on public.training_session (origin)
  where deleted_at is null;
