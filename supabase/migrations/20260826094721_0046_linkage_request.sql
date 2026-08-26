-- ═══════════════════════════════════════════════════════════════════════════
--  0046 — linkage_request: a request, not an event
--
--  The other three stages are events with a date that people apply to. Linkage
--  is not: a producer who has completed an advisory asks to be connected to a
--  buyer, and the Municipality matches them to a partner when it can.
--
--  ── WHY THE INITIATIVE FIELDS LIVE HERE ──
--
--  market_linkage requires initiative_id AND partnership_id, both NOT NULL, and
--  production_initiative requires person_id, title and activity_type_id. So at
--  match time somebody must supply a title and an activity type.
--
--  Asking the coordinator for them at match time would mean building an
--  initiative form -- a screen nobody asked for, filled in by the wrong person,
--  about someone else's business. So the REQUESTER supplies them, in their own
--  words, when they ask. Matching is then one click.
--
--  ── WHY matched_initiative_id CAN POINT AT AN EXISTING INITIATIVE ──
--
--  C1.2 counts DISTINCT INITIATIVES with a linkage. A producer who requests
--  linkage twice must not end up with two production_initiative rows, or C1.2
--  inflates permanently and nothing downstream can tell the duplicates apart --
--  the same failure mode as duplicate person rows for A1.3.
--
--  So this column is nullable and set at match time, and the matching screen
--  offers "attach to an initiative this person already has" as well as "create
--  a new one". The column existing is what makes that choice possible.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.linkage_request (
  id                    uuid primary key default gen_random_uuid(),
  person_id             uuid not null references public.person(id),
  requested_on          date not null default current_date,

  -- What they are asking for, in their words.
  request               text not null,
  -- Carried so that matching does not need a second form. These become the
  -- production_initiative when the request is matched.
  initiative_title      text not null,
  activity_type_id      uuid not null references public.ref_activity_type(id),
  main_product          text,

  status                record_status_t not null default 'submitted',

  -- Filled at match time. Nullable: an unmatched request has neither.
  matched_initiative_id uuid references public.production_initiative(id),
  matched_linkage_id    uuid references public.market_linkage(id),
  reviewed_by           uuid references auth.users(id),
  reviewed_at           timestamptz,
  review_note           text,

  client_uuid           uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  deleted_at timestamptz,

  -- An approved request must say what it was matched to. Anything else is a
  -- request marked done with nothing to show for it.
  constraint linkage_approved_needs_match
    check (status <> 'approved' or (matched_initiative_id is not null
                                    and matched_linkage_id is not null))
);
select public.attach_updated_at('linkage_request');

create index linkage_request_person_idx on public.linkage_request (person_id);
create index linkage_request_status_idx
  on public.linkage_request (status) where deleted_at is null;

comment on table public.linkage_request is
  'A producer asking to be connected to a buyer. Becomes a production_initiative '
  'plus a market_linkage when matched. Requires a completed advisory -- enforced '
  'by the eligibility trigger, not by the UI.';
comment on column public.linkage_request.matched_initiative_id is
  'Set at match time. May point at an initiative the person ALREADY has: C1.2 '
  'counts distinct initiatives, so creating a second one for the same producer '
  'would inflate it permanently.';

-- ── RLS. CLAUDE.md rule 3. ────────────────────────────────────────────────
alter table public.linkage_request enable row level security;

create policy op_read on public.linkage_request for select using (is_staff());
-- A participant may see their own requests.
create policy op_read_self on public.linkage_request for select
  using (person_id = public.my_person_id());
create policy op_insert on public.linkage_request for insert
  with check (public."current_role"() = any (array['coordinator','data_entry']::app_role_t[]));
-- Matching is a coordinator decision, like registration approval.
create policy op_update on public.linkage_request for update
  using (public."current_role"() = 'coordinator'::app_role_t);

revoke all on public.linkage_request from anon;
grant select, insert, update on public.linkage_request to authenticated;
