-- ═══════════════════════════════════════════════════════════════════════════
--  0126 — the evidence upload path: the bucket knows whose file it is
--
--  Plan §4.5. `attachment` and the private `evidence` bucket have existed
--  since 0012 with zero rows and zero objects; nothing in the application
--  uploaded a file. Nearly every Ramtha form names required evidence
--  (attendance sheets, photographs, pre/post results, certificates, employer
--  evaluations, municipal decisions), so for Ramtha the path is a
--  requirement. This migration is the database half; the screen half is
--  `EvidencePanel` in the app, which puts the file in the bucket and the row
--  in `attachment`, in that order, and removes the object if the row is
--  refused.
--
--  ── WHAT WAS MISSING ──
--
--  The three storage policies (0012) said `bucket_id = 'evidence' and
--  is_staff()`. That is the right role gate and no municipality gate at all:
--  a Ramtha enumerator who knew the path of a Sahel Horan photograph could
--  read it, because storage.objects has no municipality_id for 0118's walk
--  to find. `attachment` got its gate in 0118; the object did not.
--
--  ── THE PATH IS THE GATE ──
--
--  Every object lives under `<municipality_id>/<entity_type>/<entity_id>/`
--  and the first folder is what the storage policies check, through the
--  same `can_see_municipality` every table uses. `attachment.storage_path`
--  is constrained to start with the row's own municipality_id, so a row
--  cannot point at the other municipality's folder either.
--
--  ── WHO MAY DO WHAT ──
--
--    read        staff of the municipality (is_staff, the gate)
--    upload      staff of the municipality
--    update      nobody (an object is immutable; replace it by uploading
--                another) -- the 0012 update policy is dropped, which also
--                closes the half of OQ-30 that was about the bucket
--    delete      a coordinator of the municipality, and only after the
--                attachment row is soft-deleted, which guard_soft_delete
--                already limits to a coordinator
--
--  `attachment.entity_type` is the table the file belongs to; a check
--  constraint names the tables that carry evidence today.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── storage.objects ──────────────────────────────────────────────────────

drop policy if exists evidence_staff_insert on storage.objects;
drop policy if exists evidence_staff_read   on storage.objects;
drop policy if exists evidence_staff_update on storage.objects;

-- The first folder of the object name is the municipality; a name that does
-- not start with a uuid is nobody's and matches no policy.
create function public.evidence_municipality(p_name text)
returns uuid
language sql immutable
as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_name, '/', 1)::uuid end
$$;
revoke all on function public.evidence_municipality(text) from public, anon;
grant execute on function public.evidence_municipality(text) to authenticated;

create policy evidence_read on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.is_staff()
         and public.can_see_municipality(public.evidence_municipality(name)));

create policy evidence_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and public.is_staff()
              and public.can_see_municipality(public.evidence_municipality(name)));

create policy evidence_remove on storage.objects
  for delete to authenticated
  using (bucket_id = 'evidence' and public.is_coordinator()
         and public.can_see_municipality(public.evidence_municipality(name)));

-- ── attachment ───────────────────────────────────────────────────────────

alter table public.attachment
  add constraint attachment_path_in_own_municipality
    check (storage_path like municipality_id::text || '/%'),
  add constraint attachment_entity_type_known
    check (entity_type in (
      -- Sahel Horan's tables that name evidence in their forms
      'training_session', 'training_enrolment', 'exhibition', 'exhibition_registration',
      'partnership', 'production_initiative', 'followup_survey', 'coordination_meeting',
      'office_service', 'guidance_record', 'mentorship_session', 'advisory_session',
      -- Ramtha's ten record tables
      'rmth_event', 'rmth_proposal', 'rmth_training_programme', 'rmth_training_cycle',
      'rmth_training_enrolment', 'rmth_project_implementer', 'rmth_incubator',
      'rmth_enterprise', 'rmth_incubation_service', 'rmth_outcome_survey')),
  add constraint attachment_file_name_not_blank check (btrim(file_name) <> '');

create index if not exists attachment_entity_idx on public.attachment (entity_type, entity_id);
create index if not exists attachment_municipality_idx on public.attachment (municipality_id);

comment on table public.attachment is
  'A file in the private evidence bucket, linked to the record it evidences '
  '(entity_type is the table, entity_id the row). storage_path starts with '
  'the municipality_id, which is also what the bucket policies check (0126). '
  'Removal is a soft delete of this row by a coordinator, then the object.';

-- ── verification: as the roles, not the owner ────────────────────────────
do $verify$
declare
  v_rmth uuid := '00000000-0000-4000-8000-0000000000a1';
  v_shm  uuid := '00000000-0000-4000-8000-00000000005a';
  v_ok   boolean;
begin
  if (select count(*) from pg_policy where polrelid = 'storage.objects'::regclass) <> 3 then
    raise exception '0126: expected exactly three policies on storage.objects';
  end if;
  if public.evidence_municipality(v_rmth::text || '/rmth_event/x/y.pdf') <> v_rmth
     or public.evidence_municipality('rmth_event/x/y.pdf') is not null then
    raise exception '0126: evidence_municipality does not read the first folder';
  end if;

  begin
    -- the Sahel Horan admin can place a file under Sahel Horan and not under Ramtha
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'coordinator@shm.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('evidence', v_shm::text || '/training_session/00000000-0000-0000-0000-000000000001/probe.txt', auth.uid(), '{}'::jsonb);
    v_ok := false;
    begin
      insert into storage.objects (bucket_id, name, owner, metadata)
      values ('evidence', v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000001/probe.txt', auth.uid(), '{}'::jsonb);
    exception when insufficient_privilege then v_ok := true; end;
    if not v_ok then raise exception '0126: the Sahel Horan admin placed a file in Ramtha''s folder'; end if;
    v_ok := false;
    begin
      insert into storage.objects (bucket_id, name, owner, metadata)
      values ('evidence', 'loose/probe.txt', auth.uid(), '{}'::jsonb);
    exception when insufficient_privilege then v_ok := true; end;
    if not v_ok then raise exception '0126: a file outside any municipality folder was accepted'; end if;
    -- and an attachment row cannot point at the other folder
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, storage_path, file_name, municipality_id)
      values ('training_session', '00000000-0000-0000-0000-000000000001', v_rmth::text || '/x/y.txt', 'y.txt', v_shm);
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0126: an attachment row pointed at the other municipality''s folder'; end if;
    reset role;

    -- the Ramtha admin cannot see the Sahel Horan object
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    if (select count(*) from storage.objects where bucket_id = 'evidence') <> 0 then
      raise exception '0126: the Ramtha admin can see a Sahel Horan object';
    end if;
    reset role;

    raise exception using errcode = 'P0126', message = 'rollback the probe';
  exception
    when sqlstate 'P0126' then null;
  end;

  if exists (select 1 from storage.objects where bucket_id = 'evidence') then
    raise exception '0126: probe objects survived the rollback';
  end if;
end $verify$;
