-- ═══════════════════════════════════════════════════════════════════════════
--  0151 — evidence on the Khalidiyah records: attachment_entity_type_known
--         extended from its live definition
--
--  attachment.entity_type is a CHECK over an explicit list of tables (0126,
--  0128). No khld_ table was in it, so every Khalidiyah upload would have
--  been refused by the database after the evidence function had signed the
--  URL (plan 5.9). The list below is the LIVE definition read from
--  pg_constraint today -- the fourteen Sahel Horan and ten Ramtha tables,
--  in its order -- with the twenty-one Khalidiyah tables appended: the
--  eighteen form tables and the three entities (a partner's letter or MoU,
--  an enterprise's licence, a vendor's health certificate are evidence on
--  the entity, not on one sheet). Participations and the junctions carry no
--  evidence of their own.
--
--  Appended, never retyped: the migration reads the old definition before
--  dropping it and asserts afterwards that every table it named is still
--  named. The evidence function's ENTITY_TABLES (supabase/functions/
--  evidence/index.ts) is the same list and is redeployed with this file;
--  the function checks the name before it queries, the database checks it
--  before it records, and the two lists are kept identical by hand -- there
--  is no third place.
-- ═══════════════════════════════════════════════════════════════════════════

create temp table _0151_before on commit drop as
  select pg_get_constraintdef(oid) as def
    from pg_constraint where conrelid = 'public.attachment'::regclass and conname = 'attachment_entity_type_known';

alter table public.attachment
  drop constraint attachment_entity_type_known,
  add constraint attachment_entity_type_known
    check (entity_type in (
      'training_session', 'training_enrolment', 'exhibition', 'exhibition_registration',
      'partnership', 'production_initiative', 'followup_survey', 'coordination_meeting',
      'office_service', 'guidance_record', 'mentorship_session', 'advisory_session',
      'milestone', 'case_study',
      'rmth_event', 'rmth_proposal', 'rmth_training_programme', 'rmth_training_cycle',
      'rmth_training_enrolment', 'rmth_project_implementer', 'rmth_incubator',
      'rmth_enterprise', 'rmth_incubation_service', 'rmth_outcome_survey',
      'khld_partner', 'khld_enterprise', 'khld_vendor',
      'khld_works_item', 'khld_coordination_meeting', 'khld_contribution',
      'khld_campaign', 'khld_activity', 'khld_market', 'khld_action_day',
      'khld_volunteer', 'khld_attendance',
      'khld_guidance_completion', 'khld_enterprise_support', 'khld_vendor_registration',
      'khld_interaction_survey', 'khld_partner_survey', 'khld_user_feedback',
      'khld_volunteer_tracking', 'khld_producer_survey',
      'khld_milestone_verification'));

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_old  text;
  v_new  text;
  v_name text;
  v_n    int;
begin
  select def into v_old from _0151_before;
  select pg_get_constraintdef(oid) into v_new
    from pg_constraint where conrelid = 'public.attachment'::regclass and conname = 'attachment_entity_type_known';
  -- every table the old definition named is in the new one, in the same order
  for v_name in select (regexp_matches(v_old, '''([a-z_]+)''', 'g'))[1] loop
    if v_new !~ ('''' || v_name || '''') then
      raise exception '0151: the rewritten check dropped %', v_name;
    end if;
  end loop;
  if position('training_session' in v_new) > position('rmth_event' in v_new)
     or position('rmth_outcome_survey' in v_new) > position('khld_partner' in v_new) then
    raise exception '0151: the rewritten check reordered the list';
  end if;
  -- 24 before, 45 after
  select count(*) into v_n from regexp_matches(v_old, '''([a-z_]+)''', 'g');
  if v_n <> 24 then raise exception '0151: the live definition named % tables, not 24', v_n; end if;
  select count(*) into v_n from regexp_matches(v_new, '''([a-z_]+)''', 'g');
  if v_n <> 45 then raise exception '0151: the new definition names % tables, not 45', v_n; end if;
  -- every khld_ table named exists and carries municipality_id and deleted_at (what presign_upload reads)
  for v_name in select (regexp_matches(v_new, '''(khld_[a-z_]+)''', 'g'))[1] loop
    if not exists (select 1 from pg_attribute a
                    where a.attrelid = ('public.' || v_name)::regclass and a.attname = 'municipality_id' and not a.attisdropped)
       or not exists (select 1 from pg_attribute a
                    where a.attrelid = ('public.' || v_name)::regclass and a.attname = 'deleted_at' and not a.attisdropped) then
      raise exception '0151: % has no municipality_id or deleted_at for the evidence function to read', v_name;
    end if;
  end loop;
  -- the check admits a Khalidiyah table and still refuses an unknown one (as the owner, rolled back)
  begin
    insert into public.attachment (municipality_id, entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
    values ('00000000-0000-4000-8000-0000000000b2', 'khld_volunteer', gen_random_uuid(), 'probe', '0151/probe', 'probe.jpg', 10, 10, 'photo');
    insert into public.attachment (municipality_id, entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
    values ('00000000-0000-4000-8000-0000000000b2', 'khld_volunteer_participation', gen_random_uuid(), 'probe', '0151/probe2', 'probe.jpg', 10, 10, 'photo');
    raise exception '0151: a table outside the list was accepted';
  exception
    when check_violation then
      if sqlerrm !~ 'attachment_entity_type_known' then raise; end if;
  end;
  if exists (select 1 from public.attachment where object_key like '0151/%') then
    raise exception '0151: probe rows survived the rollback';
  end if;
end $verify$;
