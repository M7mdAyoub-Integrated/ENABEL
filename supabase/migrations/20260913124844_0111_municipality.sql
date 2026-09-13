-- ═══════════════════════════════════════════════════════════════════════════
--  0111 — municipality: the table the second programme hangs off
--
--  ── WHY ──
--
--  The platform serves one municipality, Sahel Horan, and is gaining a second,
--  Ramtha — an employment and entrepreneurship programme with its own
--  objectives, indicators and forms. RAMTHA_IMPLEMENTATION_PLAN.md Part 1: the
--  tenancy goes on FIRST, onto the existing schema, before a single Ramtha
--  table exists, because retrofitting `municipality_id` onto one programme's
--  worth of tables is far cheaper than onto two.
--
--  This migration creates only the anchor: the `municipality` table and its
--  two rows. Nothing else changes yet. 0112 adds `municipality_id` to every
--  scoped table and backfills it; 0113 reshapes the unique indexes; 0114
--  re-anchors the indicator views. Small migrations, one concern each.
--
--  ── THE TWO ROWS ──
--
--      SHM   Sahel Horan   slug sahel-horan
--      RMTH  Ramtha        slug ramtha
--
--  The codes are the prefixes the two framework workbooks already use for
--  their indicators (`SHM-SO1-A1.2`, `RMTH-SO1-A1.2`), so a full indicator
--  code can be derived from data rather than remembered — CLAUDE.md records
--  what happened the last time an objective label was written from memory.
--
--  The ids are FIXED, not generated. Every later migration that backfills or
--  seeds needs to name a municipality, and a lookup by code on every row would
--  be both slower and a second thing that can be mistyped. A fixed uuid is
--  one constant, checked once here.
--
--  Sahel Horan's Arabic name is the one the application already uses
--  (`locales/ar/common.json`, `orgName`). Ramtha's is the wording of the
--  framework workbook's Arabic Copy sheet (`بلدية الرمثا`).
--
--  ── `is_active` ──
--
--  Both active. The public site (Part 3) offers a chooser when more than one
--  municipality is active. Ramtha has nothing published yet, so its public
--  page is an honest empty state, which is better than a municipality that
--  exists in the database and not on the door.
--
--  ── STANDARD TRIGGERS, AND A HELPER FOR THE TABLES STILL TO COME ──
--
--  Every table in this schema carries four triggers: `trg_<t>_updated`,
--  `trg_<t>_audit`, `trg_<t>_soft_delete` (when it has `deleted_at`) and
--  `trg_<t>_no_hard_delete` (unless it is rewritten by delete-then-insert).
--  Until now each was attached by its own migration-time loop, and a table
--  created after the loop ran got none of them — which is exactly what
--  `check-soft-delete-guards.mjs` exists to catch. `attach_standard_triggers`
--  makes the four one call, so a Ramtha table cannot be created with three.
--  It is revoked from every client role like every other DDL helper.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. one call attaches the four standard triggers ──────────────────────

create or replace function public.attach_standard_triggers(
  p_table text,
  p_allow_hard_delete boolean default false
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_has_deleted_at boolean;
begin
  select exists (
    select 1 from pg_attribute a
     where a.attrelid = ('public.' || quote_ident(p_table))::regclass
       and a.attname = 'deleted_at' and not a.attisdropped)
  into v_has_deleted_at;

  perform public.attach_updated_at(p_table);

  execute format('drop trigger if exists trg_%s_audit on public.%I', p_table, p_table);
  execute format(
    'create trigger trg_%s_audit after insert or update or delete on public.%I '
    'for each row execute function public.audit_row()', p_table, p_table);

  if v_has_deleted_at then
    execute format('drop trigger if exists trg_%1$s_soft_delete on public.%1$I', p_table);
    execute format(
      'create trigger trg_%1$s_soft_delete before update on public.%1$I '
      'for each row execute function public.guard_soft_delete()', p_table);
  end if;

  execute format('drop trigger if exists trg_%1$s_no_hard_delete on public.%1$I', p_table);
  if not p_allow_hard_delete then
    execute format(
      'create trigger trg_%1$s_no_hard_delete before delete on public.%1$I '
      'for each row execute function public.guard_no_hard_delete()', p_table);
  end if;
end $$;

revoke all on function public.attach_standard_triggers(text, boolean) from public, anon, authenticated;

comment on function public.attach_standard_triggers(text, boolean) is
  'Attaches trg_<t>_updated, trg_<t>_audit, trg_<t>_soft_delete (if the table '
  'has deleted_at) and trg_<t>_no_hard_delete (unless p_allow_hard_delete). '
  'One call per table so a new table cannot get three of the four. See 0111.';

-- ── 2. the table ─────────────────────────────────────────────────────────

create table public.municipality (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name_en     text not null,
  name_ar     text,
  slug        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  deleted_at  timestamptz,
  -- The code is the indicator prefix (`SHM-SO1-A1.2`), so it is upper-case
  -- letters only. The slug is a URL segment (`/sahel-horan`), so lower-case.
  constraint municipality_code_key   unique (code),
  constraint municipality_slug_key   unique (slug),
  constraint municipality_code_shape check (code ~ '^[A-Z]{2,8}$'),
  constraint municipality_slug_shape check (slug ~ '^[a-z][a-z0-9-]*$')
);

select public.attach_standard_triggers('municipality');

-- ── 3. the two rows ──────────────────────────────────────────────────────

insert into public.municipality (id, code, name_en, name_ar, slug, is_active) values
  ('00000000-0000-4000-8000-00000000005a', 'SHM',  'Sahel Horan', 'بلدية سهل حوران', 'sahel-horan', true),
  ('00000000-0000-4000-8000-0000000000a1', 'RMTH', 'Ramtha',      'بلدية الرمثا',    'ramtha',      true);

-- ── 4. RLS ───────────────────────────────────────────────────────────────
--
-- Read by every signed-in user: the name is on every screen and the slug is
-- how the public site routes, and neither is sensitive. Written by a
-- coordinator until 0117 introduces `super_admin`, which then becomes the
-- only role that may add or deactivate a municipality. The public site reads
-- the two public columns through `v_public_municipality` (Part 3), never the
-- table — `anon` keeps its zero table grants.

alter table public.municipality enable row level security;

create policy municipality_read on public.municipality
  for select to authenticated using (true);

create policy municipality_insert on public.municipality
  for insert to authenticated with check (public.is_coordinator());

create policy municipality_update on public.municipality
  for update to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

-- ── 5. verification ──────────────────────────────────────────────────────

do $verify$
declare
  v_n int;
  v_missing text[];
begin
  select count(*) into v_n from public.municipality where deleted_at is null;
  if v_n <> 2 then
    raise exception '0111: expected 2 municipalities, found %', v_n;
  end if;

  if not exists (select 1 from public.municipality where code = 'SHM'
                    and id = '00000000-0000-4000-8000-00000000005a') then
    raise exception '0111: SHM row missing or not at its fixed id';
  end if;

  -- all four standard triggers, by name, from the catalogue
  select array_agg(x) into v_missing
    from unnest(array['trg_municipality_updated', 'trg_municipality_audit',
                      'trg_municipality_soft_delete', 'trg_municipality_no_hard_delete']) x
   where not exists (select 1 from pg_trigger t
                      where t.tgrelid = 'public.municipality'::regclass
                        and t.tgname = x and not t.tgisinternal);
  if v_missing is not null then
    raise exception '0111: municipality is missing triggers %', v_missing;
  end if;
end $verify$;

comment on table public.municipality is
  'The programmes the platform serves. SHM (Sahel Horan) and RMTH (Ramtha). '
  'Every scoped table carries municipality_id; person and the ref_ tables are '
  'shared. See RAMTHA_IMPLEMENTATION_PLAN.md Part 0 and migration 0112.';
