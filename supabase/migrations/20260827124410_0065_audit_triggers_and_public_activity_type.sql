-- ═══════════════════════════════════════════════════════════════════════════
--  0065 — the three tables that never got an audit trigger, and the activity
--         type list the linkage request needs
--
--  ── THE MISSING TRIGGERS ──
--
--  CLAUDE.md says every table carries trg_<table>_updated and
--  trg_<table>_audit. Three do not:
--
--    advisory_session      0045
--    advisory_enrolment    0045
--    linkage_request       0046
--
--  All three fall inside 0034-0049 -- the stretch applied through the MCP with
--  a three-line pointer left in the repository instead of the SQL. That
--  incident is remembered as a backup problem, and it was one. This is its
--  second mark: with no file to read, nothing was reviewed against the
--  conventions, so a whole column block's worth of habit quietly lapsed on
--  three tables and stayed lapsed through every migration since.
--
--  It survived item 5 as well, which built three screens on advisory_session
--  and advisory_enrolment without noticing that changes to either left no
--  trace. Worth stating plainly: the gap is found by asking the catalogue
--  which tables lack the trigger, and never by reading the migrations.
--
--  These are AFTER triggers on tables that already hold rows. Existing rows
--  gain no history -- audit_log records changes, and their changes have already
--  happened unwitnessed. Nothing can be done about that, and inventing entries
--  to fill the gap would be worse than the gap.
--
--  advisory_enrolment matters most of the three. met_criteria on that table is
--  what unlocks market linkage, so an unlogged edit there silently grants or
--  removes someone's eligibility for the whole SO3 pillar.
--
--  ── THE ACTIVITY TYPE LIST ──
--
--  The public linkage request asks what someone produces, and
--  linkage_request.activity_type_id is NOT NULL. Same shape and same reasoning
--  as 0056: a label-only view, never a grant on ref_activity_type.
--
--  ref_activity_type carries allows_free_text, and 'Other' has it set. Neither
--  linkage_request nor production_initiative has an activity_type_other
--  column, so there is nowhere to put the free text and the view does not
--  publish the flag. A form that offered "please specify" over a column that
--  does not exist would discard what was typed. Recorded as OQ-28 rather than
--  fixed here: adding the column is a schema decision about production_initiative,
--  not a detail of the public form.
--
--  ── WHAT anon MAY READ AFTER THIS ──
--
--    v_public_opportunity      what is open
--    v_public_producer_type    the "what kind of producer are you" list
--    v_public_product          the "what do you make" list
--    v_public_activity_type    the "what do you produce" list
--
--  Four views, all label-only. Plus the RPCs.
-- ═══════════════════════════════════════════════════════════════════════════

create trigger trg_advisory_session_audit
  after insert or update or delete on public.advisory_session
  for each row execute function audit_row();

create trigger trg_advisory_enrolment_audit
  after insert or update or delete on public.advisory_enrolment
  for each row execute function audit_row();

create trigger trg_linkage_request_audit
  after insert or update or delete on public.linkage_request
  for each row execute function audit_row();

create or replace view public.v_public_activity_type as
select id, label_en, label_ar
  from public.ref_activity_type
 where is_active
   and deleted_at is null;

comment on view public.v_public_activity_type is
  'Activity types for the public linkage request, feeding '
  'linkage_request.activity_type_id. Label-only, same reasoning as '
  'v_public_producer_type. allows_free_text is deliberately NOT published: '
  'there is no activity_type_other column to receive the text -- see OQ-28.';

revoke all on public.v_public_activity_type from public;
grant select on public.v_public_activity_type to anon, authenticated;
