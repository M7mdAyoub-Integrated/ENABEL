-- ═══════════════════════════════════════════════════════════════════════════
--  0112 — municipality_id on every scoped table, backfilled to Sahel Horan
--
--  ── WHAT THIS DOES ──
--
--  Adds `municipality_id uuid not null references municipality(id)` to every
--  table that belongs to one programme, using the three-step pattern the plan
--  requires — add nullable, backfill, set not null — and verifies each table
--  before moving to the next. Every existing row is Sahel Horan's.
--
--  ── WHICH TABLES, AND WHY ──
--
--  RAMTHA_IMPLEMENTATION_PLAN.md §1.2 lists the framework six, the seventeen
--  Sahel Horan operational tables and the three partner tables. Three
--  decisions here go beyond that list, each argued rather than assumed:
--
--  1. PARTNERS ARE SCOPED, as the plan reads them. A partnership is one
--     municipality's own agreement; G0.4 counts contributions per programme;
--     the two municipalities will have different partners, and where one
--     organisation deals with both, it is two relationships with two contact
--     people and two agreement references. A shared `partner` would make
--     `partner (name, unit)` collide across programmes and would let a Ramtha
--     admin see who Sahel Horan's partners are. Scoped.
--
--  2. THE SEVEN CHILD TABLES GET THE COLUMN TOO — `partnership_role`,
--     `coordination_meeting_partner`, `exhibition_registration_product`,
--     `followup_answer`, `followup_answer_option`, `followup_safety_item`,
--     `followup_buyer_connection`. The plan does not name them. They could be
--     scoped through their parent with an EXISTS in every policy, but:
--       - `fu_read` on the four survey children checks the caller's ROLE and
--         not the parent, so the answers to a Sahel Horan interview — the
--         most intrusive record the platform holds — would be readable by a
--         Ramtha coordinator until somebody remembered the EXISTS;
--       - `audit_row()` stamps each audit row with the municipality of the
--         record it describes (below), and a child without the column would
--         need a per-table parent lookup inside the audit trigger;
--       - the rule "every table that is not shared carries the column" has no
--         exceptions to remember. 0114 adds composite foreign keys so a child
--         cannot disagree with its parent about which municipality it is in.
--
--  3. `attachment` IS SCOPED, although the plan lists it as shared. It
--     references its owner polymorphically (`entity_type`, `entity_id`), so
--     it cannot be scoped through a parent, and evidence is municipal: the
--     file name of a Ramtha attendance sheet is Ramtha's business. It has
--     zero rows today, so the backfill is free.
--
--  `audit_log` stays ONE shared, insert-only table — but each row now records
--  the municipality of the record it describes, stamped by `audit_row()` from
--  the row's own `municipality_id`, so 0118 can filter what a coordinator
--  reads without splitting the log. Rows about shared tables (person, ref_*)
--  carry null and stay visible to every coordinator, which is right: those
--  records are shared.
--
--  NOT scoped, as the plan says: `person`, `person_activity_type`, every
--  `ref_*` table, `app_user` (it gains a municipality of its own, below),
--  `applicant_lookup_secret`, `applicant_lookup_throttle`, `municipality`.
--
--  ── THE DEFAULT, AND WHY THERE IS ONE ──
--
--  Every scoped column is `default public.my_municipality()` — the signed-in
--  account's municipality, read from `app_user`. So not one of the
--  application's insert sites has to change: a Sahel Horan coordinator
--  inserting a guidance record gets Sahel Horan's id, as before, and the
--  WITH CHECK added in 0118 confirms it. For a caller with no municipality
--  (a public RPC running as `anon`, a migration, a super admin who has not
--  chosen one — see 0117) the default is null and NOT NULL refuses the insert
--  loudly, which is the right failure: a row that lands in the wrong
--  municipality is invisible, a row that is refused is not.
--
--  `app_user.municipality_id` is added here, nullable, and backfilled to
--  Sahel Horan for all six existing accounts, because the default needs it.
--  Its constraint — null only for a super admin — waits for the role to exist
--  (0117).
--
--  ── THE BACKFILL RUNS WITH USER TRIGGERS OFF ──
--
--  Three AFTER UPDATE triggers react to any update of their row —
--  `contribution_from_delivery`, `contribution_from_linkage` and, through
--  them, `sync_auto_contribution`, which will re-create a partner credit that
--  a coordinator removed by hand, or raise `insufficient_privilege` for a
--  session that is no longer delivered but still credited. A backfill that
--  touches every row would therefore either move G0.4 or fail, depending on
--  the state of the data on the day it ran. So each table's user triggers are
--  disabled for the one UPDATE and re-enabled immediately after. That also
--  means `updated_at` is not bumped and `audit_log` does not receive ~350
--  rows saying "municipality_id: null -> SHM": this migration is the record
--  of that change, and every row it touched is named by table here.
--
--  The existing audit rows are stamped the same way, once: every row that
--  describes a record on a scoped table gets Sahel Horan's id. That is an
--  UPDATE on `audit_log`, which CLAUDE.md rule 2 reserves — it is done here,
--  as the owner, to fill a column that did not exist when the rows were
--  written, and it touches nothing else in them. Without it, 1 500 rows of
--  Sahel Horan's history would carry null and be readable by any coordinator
--  once 0118 filters the log by municipality.
--
--  ── ORDER OF WORK, AND THE THING THAT MUST NOT MOVE ──
--
--  This migration changes no figure. The twenty indicator views still join
--  `reporting_period` by date range with no municipality filter; that is safe
--  only while every period row is Sahel Horan's, which is true until Ramtha's
--  periods are seeded in Part 6 — AFTER 0115 has re-anchored the views. The
--  verification block at the end compares `v_indicator_actual` against a copy
--  taken before any column was added, and fails the migration on any change.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. the figures before anything changes ───────────────────────────────

create temp table baseline_0112 as
  select code, period_code, actual, denominator from public.v_indicator_actual;

-- ── 1. the account's municipality, and the helper the defaults read ───────

alter table public.app_user
  add column municipality_id uuid references public.municipality(id);

update public.app_user
   set municipality_id = '00000000-0000-4000-8000-00000000005a'
 where municipality_id is null;

create index app_user_municipality_idx on public.app_user (municipality_id);

-- Which municipality the signed-in account works in. Null for an account with
-- none, which today is nobody and from 0117 is a super admin who has not yet
-- switched into one. Security definer so policies can call it without
-- recursing into app_user's own policies — the same shape as current_role().
create or replace function public.my_municipality()
returns uuid
language sql stable security definer set search_path = public
as $$
  select municipality_id from public.app_user where id = auth.uid() and is_active;
$$;

revoke all on function public.my_municipality() from public, anon;
grant execute on function public.my_municipality() to authenticated;

comment on function public.my_municipality() is
  'municipality_id of the signed-in account (app_user), null when it has none. '
  'Read by every scoped table''s column default and, from 0118, by RLS. See 0112.';

-- ── 2. the column, three steps, one table at a time ──────────────────────

do $scope$
declare
  t text;
  v_nulls bigint;
  c_shm constant uuid := '00000000-0000-4000-8000-00000000005a';
  c_tables constant text[] := array[
    -- framework
    'objective', 'activity', 'indicator', 'indicator_target',
    'indicator_snapshot', 'reporting_period',
    -- Sahel Horan operational
    'training_session', 'training_enrolment', 'advisory_session',
    'advisory_enrolment', 'exhibition', 'exhibition_registration',
    'office_service', 'guidance_record', 'production_initiative',
    'mentorship_session', 'market_linkage', 'linkage_request',
    'coordination_meeting', 'case_study', 'promotional_action', 'milestone',
    'followup_survey',
    -- partners
    'partner', 'partnership', 'partner_contribution',
    -- children of scoped parents (decision 2 in the header)
    'partnership_role', 'coordination_meeting_partner',
    'exhibition_registration_product', 'followup_answer',
    'followup_answer_option', 'followup_safety_item',
    'followup_buyer_connection',
    -- evidence (decision 3)
    'attachment'
  ];
begin
  foreach t in array c_tables loop
    -- step 1: nullable
    execute format(
      'alter table public.%I add column municipality_id uuid references public.municipality(id)', t);

    -- step 2: backfill — every existing row is Sahel Horan's. User triggers
    -- off for this one statement; see the header for which ones and why.
    execute format('alter table public.%I disable trigger user', t);
    execute format(
      'update public.%I set municipality_id = %L where municipality_id is null', t, c_shm);
    execute format('alter table public.%I enable trigger user', t);

    -- verify before tightening: no row may be left behind
    execute format('select count(*) from public.%I where municipality_id is null', t)
      into v_nulls;
    if v_nulls <> 0 then
      raise exception '0112: % still has % rows with no municipality after backfill', t, v_nulls;
    end if;

    -- step 3: not null, with the default that keeps every insert site working
    execute format(
      'alter table public.%I alter column municipality_id set not null, '
      'alter column municipality_id set default public.my_municipality()', t);

    execute format(
      'create index %I on public.%I (municipality_id)', t || '_municipality_idx', t);
  end loop;
end $scope$;

-- ── 3. audit rows say which municipality's record they describe ──────────
--
-- `audit_row()` was written in 0013 and has not been touched since (checked:
-- grep -l "function public.audit_row" supabase/migrations/*.sql). The body
-- below is that body plus one column, taken from the live definition rather
-- than from the 0013 file so nothing can be reverted on the way through.

alter table public.audit_log
  add column municipality_id uuid references public.municipality(id);

create index audit_log_municipality_idx on public.audit_log (municipality_id);

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb; v_action text; v_row_id uuid; v_changed text[];
  v_municipality uuid;
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    -- a soft delete is a delete, and clearing it is a restore
    if   (v_old->>'deleted_at') is null and (v_new->>'deleted_at') is not null then
      v_action := 'delete';
    elsif (v_old->>'deleted_at') is not null and (v_new->>'deleted_at') is null then
      v_action := 'restore';
    else
      v_action := 'update';
    end if;
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(v_new) n
    where n.value is distinct from (v_old -> n.key)
      and n.key not in ('updated_at');
  else
    v_old := to_jsonb(old);
    v_action := 'delete';
  end if;

  v_row_id := nullif(coalesce(v_new->>'id', v_old->>'id'), '')::uuid;

  -- The municipality of the RECORD, not of the actor: a super admin editing a
  -- Sahel Horan row produces a Sahel Horan audit row. Null for shared tables.
  v_municipality := nullif(coalesce(v_new->>'municipality_id', v_old->>'municipality_id'), '')::uuid;

  insert into public.audit_log
    (table_name, row_id, action, actor, actor_role, old_data, new_data, changed_fields,
     municipality_id)
  values
    (tg_table_name, v_row_id, v_action, auth.uid(), public.current_role(),
     v_old, v_new, v_changed, v_municipality);

  return coalesce(new, old);
end $$;

-- Existing audit rows: stamp the ones whose payload names a municipality —
-- none do yet, because the column did not exist when they were written. Every
-- existing row describes a Sahel Horan record or a shared one; the shared
-- ones must stay null, so only rows on scoped tables are stamped.
update public.audit_log a
   set municipality_id = '00000000-0000-4000-8000-00000000005a'
 where a.municipality_id is null
   and a.table_name in (
     'objective', 'activity', 'indicator', 'indicator_target',
     'indicator_snapshot', 'reporting_period',
     'training_session', 'training_enrolment', 'advisory_session',
     'advisory_enrolment', 'exhibition', 'exhibition_registration',
     'office_service', 'guidance_record', 'production_initiative',
     'mentorship_session', 'market_linkage', 'linkage_request',
     'coordination_meeting', 'case_study', 'promotional_action', 'milestone',
     'followup_survey', 'partner', 'partnership', 'partner_contribution',
     'partnership_role', 'coordination_meeting_partner',
     'exhibition_registration_product', 'followup_answer',
     'followup_answer_option', 'followup_safety_item',
     'followup_buyer_connection', 'attachment');

-- ── 4. verification ──────────────────────────────────────────────────────

do $verify$
declare
  v_bad text[];
  v_diff bigint;
  c_tables constant text[] := array[
    'objective', 'activity', 'indicator', 'indicator_target',
    'indicator_snapshot', 'reporting_period',
    'training_session', 'training_enrolment', 'advisory_session',
    'advisory_enrolment', 'exhibition', 'exhibition_registration',
    'office_service', 'guidance_record', 'production_initiative',
    'mentorship_session', 'market_linkage', 'linkage_request',
    'coordination_meeting', 'case_study', 'promotional_action', 'milestone',
    'followup_survey', 'partner', 'partnership', 'partner_contribution',
    'partnership_role', 'coordination_meeting_partner',
    'exhibition_registration_product', 'followup_answer',
    'followup_answer_option', 'followup_safety_item',
    'followup_buyer_connection', 'attachment'];
begin
  -- every listed table: column present, not null, defaulted, indexed, FK'd
  select array_agg(t) into v_bad
    from unnest(c_tables) t
   where not exists (
     select 1 from pg_attribute a
      where a.attrelid = ('public.' || t)::regclass and a.attname = 'municipality_id'
        and a.attnotnull and not a.attisdropped
        and pg_get_expr((select d.adbin from pg_attrdef d
                          where d.adrelid = a.attrelid and d.adnum = a.attnum), a.attrelid)
            = 'my_municipality()')
      or not exists (
     select 1 from pg_index i join pg_class ic on ic.oid = i.indexrelid
      where i.indrelid = ('public.' || t)::regclass and ic.relname = t || '_municipality_idx')
      or not exists (
     select 1 from pg_constraint c
      where c.conrelid = ('public.' || t)::regclass and c.contype = 'f'
        and c.confrelid = 'public.municipality'::regclass);
  if v_bad is not null then
    raise exception '0112: incomplete on %', v_bad;
  end if;

  -- no table outside the list quietly gained the column
  select array_agg(c.relname) into v_bad
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'municipality_id' and not a.attisdropped
   where n.nspname = 'public' and c.relkind = 'r'
     and not (c.relname = any (c_tables))
     and c.relname not in ('app_user', 'audit_log');
  if v_bad is not null then
    raise exception '0112: unexpected municipality_id on %', v_bad;
  end if;

  -- the six accounts all have a municipality
  if exists (select 1 from public.app_user where municipality_id is null) then
    raise exception '0112: an app_user has no municipality';
  end if;

  -- and NOT ONE FIGURE MOVED
  select count(*) into v_diff from (
    (select code, period_code, actual, denominator from baseline_0112
     except
     select code, period_code, actual, denominator from public.v_indicator_actual)
    union all
    (select code, period_code, actual, denominator from public.v_indicator_actual
     except
     select code, period_code, actual, denominator from baseline_0112)) d;
  if v_diff <> 0 then
    raise exception '0112: v_indicator_actual changed — % rows differ from the pre-migration copy', v_diff;
  end if;
end $verify$;

drop table baseline_0112;
