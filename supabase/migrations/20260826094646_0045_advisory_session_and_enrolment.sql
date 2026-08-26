-- ═══════════════════════════════════════════════════════════════════════════
--  0045 — advisory: the second stage of the progression
--
--  Training (open to anyone) -> Advisory (needs a completed training) ->
--  Linkage (needs a completed advisory).
--
--  These two tables are deliberately SHAPED THE SAME as training_session and
--  training_enrolment, column for column where the meaning is the same. The
--  public site renders one opportunity template and the Municipality one
--  participant-list template; that only stays true if the tables agree.
--
--  ── NOT mentorship_session, AND NOT C1.3 ──
--
--  mentorship_session already exists and looks superficially similar. It is a
--  different thing: its initiative_id is NOT NULL, so a mentorship session
--  hangs off a production_initiative and can only exist AFTER someone has one.
--  That is downstream of linkage. Advisory is upstream of it.
--
--  v_ind_c1_3 counts mentorship_session and is deliberately NOT repointed here.
--  Its definition, method, formula and target are all blank in the source
--  workbook (OQ-1), so deciding that advisory is what it meant would be
--  inventing an indicator definition. That question goes to the M&E lead. If
--  they say advisory IS what C1.3 meant, this table can feed it later without
--  any change to its shape.
--
--  ── met_criteria IS THE GATE ──
--
--  Applying, being accepted and attending are not completion. Only
--  met_criteria = true unlocks linkage, exactly as it unlocks nothing until
--  A1.3 counts it on the training side. Same column, same rule, same
--  decision_needs_date constraint.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.advisory_session (
  id                       uuid primary key default gen_random_uuid(),
  title                    text not null,
  topic_id                 uuid not null references public.ref_training_topic(id),
  start_date               date not null,
  end_date                 date not null,
  venue                    text,
  delivered_by_partnership_id uuid references public.partnership(id),
  planned_seats            int,
  adviser                  text,
  is_delivered             boolean not null default false,
  description              text,
  focal_point              text,
  duration_hours           numeric(5,1),
  application_opens_on     date,
  application_closes_on    date,
  is_published             boolean not null default false,
  is_cancelled             boolean not null default false,
  cancellation_reason      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  deleted_at timestamptz,
  constraint advisory_session_dates check (end_date >= start_date),
  constraint advisory_seats_positive check (planned_seats is null or planned_seats > 0),
  constraint advisory_duration_positive check (duration_hours is null or duration_hours > 0),
  constraint advisory_application_window
    check (application_closes_on is null
           or application_opens_on is null
           or application_closes_on >= application_opens_on),
  constraint advisory_cancelled_needs_reason
    check (not is_cancelled or cancellation_reason is not null)
);
select public.attach_updated_at('advisory_session');

-- Same rule as training: delivery cannot be in the future. A trigger rather
-- than a CHECK because current_date is STABLE, not IMMUTABLE, and Postgres
-- refuses non-immutable functions in a CHECK.
create trigger trg_advisory_session_delivery
  before insert or update on public.advisory_session
  for each row execute function public.check_delivery_not_future();

create index advisory_session_published_idx
  on public.advisory_session (is_published, start_date)
  where deleted_at is null and not is_cancelled;
create index advisory_session_topic_idx on public.advisory_session (topic_id);
create index advisory_session_partnership_idx
  on public.advisory_session (delivered_by_partnership_id);

create table public.advisory_enrolment (
  id                 uuid primary key default gen_random_uuid(),
  person_id          uuid not null references public.person(id),
  session_id         uuid not null references public.advisory_session(id),
  registered_on      date not null default current_date,
  applied_on         date,
  application_status record_status_t not null default 'submitted',
  attended           boolean not null default false,
  met_criteria       boolean,
  decided_on         date,
  decided_by         uuid references auth.users(id),
  client_uuid        uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  deleted_at timestamptz,
  -- one person cannot be enrolled twice in the same advisory session
  unique (person_id, session_id),
  constraint advisory_decision_needs_date
    check (met_criteria is null or decided_on is not null)
);
select public.attach_updated_at('advisory_enrolment');

create index advisory_enrolment_person_idx  on public.advisory_enrolment (person_id);
create index advisory_enrolment_session_idx on public.advisory_enrolment (session_id);
create index advisory_enrolment_status_idx
  on public.advisory_enrolment (application_status) where deleted_at is null;

comment on column public.advisory_enrolment.met_criteria is
  'THE GATE. Only true unlocks a linkage request. Applying, being accepted and '
  'attending are not completion. Mirrors training_enrolment.met_criteria.';

-- ── RLS. CLAUDE.md rule 3: every table, no exceptions. ────────────────────
-- Mirrors training_session / training_enrolment exactly. Public read access for
-- the anonymous home page is NOT granted here -- that is a separate, deliberate
-- decision and arrives with the public pages.
alter table public.advisory_session   enable row level security;
alter table public.advisory_enrolment enable row level security;

create policy op_read   on public.advisory_session for select using (is_staff());
create policy op_insert on public.advisory_session for insert
  with check (public."current_role"() = any (array['coordinator','data_entry']::app_role_t[]));
create policy op_update on public.advisory_session for update
  using (public."current_role"() = any (array['coordinator','data_entry']::app_role_t[]));

create policy op_read   on public.advisory_enrolment for select using (is_staff());
create policy op_insert on public.advisory_enrolment for insert
  with check (public."current_role"() = any (array['coordinator','data_entry']::app_role_t[]));
create policy op_update on public.advisory_enrolment for update
  using (public."current_role"() = any (array['coordinator','data_entry']::app_role_t[]));

revoke all on public.advisory_session   from anon;
revoke all on public.advisory_enrolment from anon;
grant select, insert, update on public.advisory_session   to authenticated;
grant select, insert, update on public.advisory_enrolment to authenticated;
