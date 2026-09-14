-- ═══════════════════════════════════════════════════════════════════════════
--  0128 — evidence lives on Cloudflare R2: a row names a bucket and a key,
--         never a URL, and the platform stops itself at 9 GB
--
--  Supersedes 0126's Supabase Storage half. 0126 was right about everything
--  it did -- the path is the gate, removal is a coordinator's, an object is
--  never edited in place -- and it is superseded rather than edited because
--  migrations are append-only. `attachment` has zero rows and the `evidence`
--  bucket zero objects, so nothing is migrated; the bucket's three policies
--  are dropped so there is exactly one place evidence can go.
--
--  ── WHY R2, AND WHAT THE DATABASE HAS TO KNOW ──
--
--  R2 is the store; the Edge Function `evidence` (supabase/functions/evidence)
--  is the only thing holding its credentials. The browser never talks to R2
--  with a key: it asks the function for a presigned PUT, uploads, and asks
--  the function to CONFIRM -- the function checks the object is really there
--  (HEAD) and its size is what was declared, then inserts this row AS THE
--  USER (the caller's JWT, so RLS, `guard_soft_delete`, the audit trigger's
--  actor and the column defaults all behave as they do everywhere else). A
--  row refused here means the function deletes the object again, so the
--  bucket never holds a file no row points at.
--
--  So the row stores WHERE the object is in backend-neutral terms -- a bucket
--  name and an object key -- and never a provider URL. Moving to another
--  S3-compatible store is a change of function secrets and of `bucket`, not
--  a data migration.
--
--  ── THE STOP IS OURS ──
--
--  R2 has a payment method attached, so exceeding the 10 GB included storage
--  bills rather than fails. Overage is cheap; the risk is not a large bill,
--  it is not noticing for a year. Two limits, both enforced HERE as well as
--  in the function, because a check that lives only in a function that can
--  be redeployed is a comment:
--
--    evidence_file_limit_bytes()   1 MB per file, after client-side
--                                  compression -- a check constraint
--    evidence_quota_bytes()        9 GB in total -- guard_evidence_quota,
--                                  BEFORE INSERT, security definer so it sums
--                                  EVERY municipality's rows and not only the
--                                  caller's (RLS would otherwise make each
--                                  coordinator's total their own)
--
--  Decimal gigabytes (10^9), deliberately: Cloudflare's included 10 GB is
--  the smaller of the two readings, so the stop trips on the safe side.
--
--  Compression is mandatory, not an optimisation: 10 GB compressed is roughly
--  50 000 files, uncompressed closer to 3 000, and sixteen of Ramtha's
--  seventeen forms require evidence. `original_size_bytes` is kept beside the
--  stored size so the settings screen can say what the compression is worth.
--
--  ── WHAT THE DATABASE DOES NOT ENFORCE ──
--
--  That a row's object exists. `op_insert` still admits `authenticated`
--  (the function inserts as the user), so a signed-in staff account could
--  insert a row by hand that points at nothing. It would count against the
--  quota, fail to open, and carry that account's name in audit_log. The
--  invariant is the function's flow, and this header says so rather than a
--  policy pretending otherwise.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── the Supabase bucket is retired ───────────────────────────────────────

drop policy if exists evidence_read   on storage.objects;
drop policy if exists evidence_upload on storage.objects;
drop policy if exists evidence_remove on storage.objects;

-- ── the limits, as functions, so there is one copy of each number ────────

create function public.evidence_file_limit_bytes()
returns bigint language sql immutable parallel safe
as $$ select 1048576::bigint $$;

create function public.evidence_quota_bytes()
returns bigint language sql immutable parallel safe
as $$ select 9000000000::bigint $$;

-- The figure the settings screen shows the total against. Display only; the
-- stop is evidence_quota_bytes().
create function public.evidence_included_bytes()
returns bigint language sql immutable parallel safe
as $$ select 10000000000::bigint $$;

revoke all on function public.evidence_file_limit_bytes() from public, anon;
revoke all on function public.evidence_quota_bytes()      from public, anon;
revoke all on function public.evidence_included_bytes()   from public, anon;
grant execute on function public.evidence_file_limit_bytes() to authenticated;
grant execute on function public.evidence_quota_bytes()      to authenticated;
grant execute on function public.evidence_included_bytes()   to authenticated;

-- ── attachment ───────────────────────────────────────────────────────────

alter table public.attachment rename column storage_path to object_key;

alter table public.attachment
  drop constraint attachment_path_in_own_municipality,
  drop constraint attachment_size_bytes_check;

alter table public.attachment
  add column bucket              text,
  add column original_size_bytes bigint,
  add column content_kind        text;

-- Three-step pattern, as everywhere: add nullable, backfill, set not null.
-- Zero rows today, so the backfill touches nothing; kept so the migration
-- reads the same as every other one and replays on a database that has rows.
update public.attachment
   set bucket = coalesce(bucket, 'evidence'),
       original_size_bytes = coalesce(original_size_bytes, size_bytes, 1),
       size_bytes = coalesce(size_bytes, 1),
       content_kind = coalesce(content_kind, 'other')
 where bucket is null or original_size_bytes is null or size_bytes is null or content_kind is null;

alter table public.attachment
  alter column bucket              set not null,
  alter column size_bytes          set not null,
  alter column original_size_bytes set not null,
  alter column content_kind        set not null,
  alter column uploaded_by         set default auth.uid();

alter table public.attachment
  add constraint attachment_key_in_own_municipality
    check (public.evidence_municipality(object_key) = municipality_id),
  add constraint attachment_size_within_limit
    check (size_bytes > 0 and size_bytes <= public.evidence_file_limit_bytes()),
  add constraint attachment_original_size_positive
    check (original_size_bytes > 0),
  add constraint attachment_content_kind_known
    check (content_kind in ('photo', 'document', 'other')),
  add constraint attachment_bucket_not_blank
    check (btrim(bucket) <> ''),
  add constraint attachment_object_unique unique (bucket, object_key);

-- 05_ROLES_AND_RLS.md §8 makes evidence mandatory for B1.1, G0.1 and G0.3,
-- whose tables 0126's list left out. Allowed here so the Sahel Horan screens
-- can be given the panel (OQ-43) without another migration; no screen
-- uploads to them yet.
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
      'rmth_enterprise', 'rmth_incubation_service', 'rmth_outcome_survey'));

comment on table public.attachment is
  'A file in the evidence store (Cloudflare R2 since 0128), linked to the '
  'record it evidences (entity_type is the table, entity_id the row). '
  '`bucket` and `object_key` locate it in backend-neutral terms; never a URL. '
  'object_key starts with the municipality_id. size_bytes is the stored '
  '(compressed) size, at most evidence_file_limit_bytes(); original_size_bytes '
  'what the user chose. Written only by the `evidence` Edge Function, as the '
  'user, after the object is confirmed to exist. Removal is a soft delete of '
  'this row by a coordinator, then the object.';

-- ── the quota guard ──────────────────────────────────────────────────────
--
-- Security DEFINER, and that is the point: the sum has to be over every
-- municipality's live rows, and a trigger function runs as the caller, whose
-- RLS would hide the other municipality's. Granted to nobody (05 §11).

create function public.guard_evidence_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used bigint;
begin
  select coalesce(sum(size_bytes), 0) into v_used
    from public.attachment
   where deleted_at is null;
  if v_used + new.size_bytes > public.evidence_quota_bytes() then
    raise exception 'Evidence storage has reached its limit of % GB. This file was not added. Tell the platform administrator (super admin) before adding more evidence.',
      public.evidence_quota_bytes() / 1000000000
      using errcode = 'disk_full',
            detail = format('used=%s, this file=%s, quota=%s', v_used, new.size_bytes, public.evidence_quota_bytes());
  end if;
  return new;
end $$;

revoke all on function public.guard_evidence_quota() from public, anon, authenticated;

create trigger trg_attachment_evidence_quota
  before insert on public.attachment
  for each row execute function public.guard_evidence_quota();

-- ── what the settings screen shows ───────────────────────────────────────
--
-- The platform total is the number the stop is about, so it is platform-wide
-- for every staff role. The breakdowns are of the rows the caller may see
-- (the municipality gate, evaluated here as the caller), so a Ramtha
-- coordinator sees Ramtha's biggest consumers and the platform's total.

create function public.evidence_usage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total  bigint;
  v_files  bigint;
  v_orig   bigint;
  v_mine   bigint;
  v_tables jsonb;
  v_rows   jsonb;
  v_munis  jsonb;
begin
  if not public.is_staff() then
    raise exception 'not permitted' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(sum(size_bytes), 0), count(*), coalesce(sum(original_size_bytes), 0)
    into v_total, v_files, v_orig
    from public.attachment where deleted_at is null;

  select coalesce(sum(size_bytes), 0) into v_mine
    from public.attachment
   where deleted_at is null and public.can_see_municipality(municipality_id);

  select coalesce(jsonb_agg(jsonb_build_object('entity_type', entity_type, 'files', files, 'bytes', bytes)
                            order by bytes desc), '[]'::jsonb)
    into v_tables
    from (select entity_type, count(*) as files, sum(size_bytes) as bytes
            from public.attachment
           where deleted_at is null and public.can_see_municipality(municipality_id)
           group by entity_type) t;

  select coalesce(jsonb_agg(jsonb_build_object('entity_type', entity_type, 'entity_id', entity_id,
                                               'municipality_id', municipality_id, 'files', files, 'bytes', bytes)
                            order by bytes desc), '[]'::jsonb)
    into v_rows
    from (select entity_type, entity_id, municipality_id, count(*) as files, sum(size_bytes) as bytes
            from public.attachment
           where deleted_at is null and public.can_see_municipality(municipality_id)
           group by entity_type, entity_id, municipality_id
           order by sum(size_bytes) desc
           limit 10) r;

  select coalesce(jsonb_agg(jsonb_build_object('code', m.code, 'bytes', coalesce(a.bytes, 0), 'files', coalesce(a.files, 0))
                            order by m.code), '[]'::jsonb)
    into v_munis
    from public.municipality m
    left join (select municipality_id, sum(size_bytes) as bytes, count(*) as files
                 from public.attachment where deleted_at is null group by municipality_id) a
      on a.municipality_id = m.id
   where m.deleted_at is null and public.can_see_municipality(m.id);

  return jsonb_build_object(
    'used_bytes', v_total,
    'files', v_files,
    'original_bytes', v_orig,
    'visible_bytes', v_mine,
    'quota_bytes', public.evidence_quota_bytes(),
    'included_bytes', public.evidence_included_bytes(),
    'file_limit_bytes', public.evidence_file_limit_bytes(),
    'by_table', v_tables,
    'by_record', v_rows,
    'by_municipality', v_munis);
end $$;

revoke all on function public.evidence_usage() from public, anon;
grant execute on function public.evidence_usage() to authenticated;

comment on function public.evidence_usage() is
  'Evidence storage: the platform total (what the 9 GB stop is about) for any '
  'staff role, and the breakdown by table, by record (top 10) and by '
  'municipality of the rows the caller may see. Security definer for the '
  'total; the municipality gate is applied inside for the rest.';

-- ── verification ─────────────────────────────────────────────────────────
do $verify$
declare
  v_rmth  uuid := '00000000-0000-4000-8000-0000000000a1';
  v_shm   uuid := '00000000-0000-4000-8000-00000000005a';
  v_ok    boolean;
  v_id    uuid;
  v_usage jsonb;
  v_n     int;
begin
  if exists (select 1 from pg_policy where polrelid = 'storage.objects'::regclass
                and polname in ('evidence_read', 'evidence_upload', 'evidence_remove')) then
    raise exception '0128: the Supabase bucket policies are still there';
  end if;
  if public.evidence_quota_bytes() >= public.evidence_included_bytes() then
    raise exception '0128: the stop is not below the included storage';
  end if;

  begin
    -- as the Ramtha admin, through RLS
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    -- a row under the caller's municipality, within the limits, is accepted
    -- and fills uploaded_by and municipality_id from the caller
    insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, mime_type, size_bytes, original_size_bytes, content_kind)
    values ('rmth_event', '00000000-0000-0000-0000-000000000001', 'probe-bucket',
            v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000001/a.jpg', 'a.jpg', 'image/jpeg', 200000, 3500000, 'photo')
    returning id into v_id;
    if (select municipality_id from public.attachment where id = v_id) <> v_rmth
       or (select uploaded_by from public.attachment where id = v_id) is null then
      raise exception '0128: the defaults did not fill from the caller';
    end if;

    -- a key under the other municipality's folder is refused by the check
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
      values ('rmth_event', '00000000-0000-0000-0000-000000000001', 'probe-bucket',
              v_shm::text || '/rmth_event/00000000-0000-0000-0000-000000000001/b.jpg', 'b.jpg', 1000, 1000, 'photo');
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0128: a key in the other municipality''s folder was accepted'; end if;

    -- a file over the per-file limit is refused, naming the constraint
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
      values ('rmth_event', '00000000-0000-0000-0000-000000000001', 'probe-bucket',
              v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000001/c.pdf', 'c.pdf', 1048577, 2000000, 'document');
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0128: a file over 1 MB was accepted'; end if;

    -- an unknown kind and a blank bucket are refused
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
      values ('rmth_event', '00000000-0000-0000-0000-000000000001', 'probe-bucket',
              v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000001/d.bin', 'd.bin', 10, 10, 'video');
    exception when check_violation then v_ok := true; end;
    if not v_ok then raise exception '0128: an unknown content kind was accepted'; end if;

    -- the same object twice is refused
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
      values ('rmth_event', '00000000-0000-0000-0000-000000000001', 'probe-bucket',
              v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000001/a.jpg', 'a2.jpg', 10, 10, 'photo');
    exception when unique_violation then v_ok := true; end;
    if not v_ok then raise exception '0128: one object was allowed two rows'; end if;

    -- the usage figure: platform total counts the row, breakdown names the table
    v_usage := public.evidence_usage();
    if (v_usage->>'used_bytes')::bigint <> 200000 or (v_usage->>'files')::int <> 1
       or (v_usage->>'original_bytes')::bigint <> 3500000
       or v_usage->'by_table'->0->>'entity_type' <> 'rmth_event'
       or (v_usage->>'quota_bytes')::bigint <> 9000000000 then
      raise exception '0128: evidence_usage did not describe the row: %', v_usage;
    end if;
    reset role;

    -- the Sahel Horan admin sees the PLATFORM total but not Ramtha's breakdown
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'coordinator@shm.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_usage := public.evidence_usage();
    if (v_usage->>'used_bytes')::bigint <> 200000 or jsonb_array_length(v_usage->'by_table') <> 0
       or (v_usage->>'visible_bytes')::bigint <> 0 then
      raise exception '0128: the Sahel Horan admin''s usage view was wrong: %', v_usage;
    end if;
    if (select count(*) from public.attachment) <> 0 then
      raise exception '0128: the Sahel Horan admin can see a Ramtha attachment row';
    end if;
    reset role;

    -- the quota guard: fill the store to the brink as the owner (the guard
    -- fires for the owner too), then one more byte as the Ramtha admin is
    -- refused with disk_full, and the same row without that byte is accepted
    insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind, municipality_id, uploaded_by)
    select 'rmth_event', '00000000-0000-0000-0000-000000000002', 'probe-bucket',
           v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000002/fill-' || g || '.bin', 'fill.bin',
           1048576, 1048576, 'other', v_rmth, (select id from public.app_user where email = 'admin@ramtha.test')
      from generate_series(1, 8582) g;   -- 8582 × 1 048 576 = 8 998 879 232, plus the 200 000 above
    if (select sum(size_bytes) from public.attachment where deleted_at is null) <> 8999079232 then
      raise exception '0128: the fill did not land where the arithmetic says';
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_ok := false;
    begin
      insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
      values ('rmth_event', '00000000-0000-0000-0000-000000000003', 'probe-bucket',
              v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000003/over.bin', 'over.bin', 920769, 920769, 'other');
    exception when sqlstate '53100' then v_ok := true; end;
    if not v_ok then raise exception '0128: a file taking the total past 9 GB was accepted'; end if;
    insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
    values ('rmth_event', '00000000-0000-0000-0000-000000000003', 'probe-bucket',
            v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000003/fits.bin', 'fits.bin', 920768, 920768, 'other');
    if (select sum(size_bytes) from public.attachment where deleted_at is null and municipality_id = v_rmth) <> 9000000000 then
      raise exception '0128: the last byte under the quota was not accepted';
    end if;
    -- a soft-deleted row stops counting
    update public.attachment set deleted_at = now() where id = v_id;
    get diagnostics v_n = row_count;
    if v_n <> 1 then raise exception '0128: the coordinator could not soft-delete their own attachment'; end if;
    insert into public.attachment (entity_type, entity_id, bucket, object_key, file_name, size_bytes, original_size_bytes, content_kind)
    values ('rmth_event', '00000000-0000-0000-0000-000000000003', 'probe-bucket',
            v_rmth::text || '/rmth_event/00000000-0000-0000-0000-000000000003/after.bin', 'after.bin', 200000, 200000, 'other');
    reset role;

    raise exception using errcode = 'P0128', message = 'rollback the probe';
  exception
    when sqlstate 'P0128' then null;
  end;

  if exists (select 1 from public.attachment) then
    raise exception '0128: probe rows survived the rollback';
  end if;
end $verify$;
