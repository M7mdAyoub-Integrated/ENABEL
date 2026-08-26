-- 0027 form_field_additions
-- Adds what the seven data-collection forms need to disaggregate seven indicators
-- and to place an exhibition registration against a real event.

-- ---------------------------------------------------------------- ref_event_type
create table public.ref_event_type (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  label_en         text not null,
  label_ar         text,
  sort_order       int  not null default 0,
  is_active        boolean not null default true,
  allows_free_text boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id),
  deleted_at       timestamptz
);
select public.attach_updated_at('ref_event_type');
create trigger trg_ref_event_type_audit
  after insert or update or delete on public.ref_event_type
  for each row execute function public.audit_row();

alter table public.ref_event_type enable row level security;
create policy ref_read on public.ref_event_type
  for select to authenticated using (true);
create policy ref_insert on public.ref_event_type
  for insert to authenticated with check (public.current_role() = 'coordinator');
create policy ref_update on public.ref_event_type
  for update to authenticated
  using (public.current_role() = 'coordinator')
  with check (public.current_role() = 'coordinator');
create policy ref_delete on public.ref_event_type
  for delete to authenticated using (public.current_role() = 'coordinator');

insert into public.ref_event_type (code, label_en, sort_order) values
  ('rural_market',        'Rural market',        1),
  ('seasonal_exhibition',  'Seasonal exhibition', 2),
  ('festival',            'Festival',             3),
  ('open_day',            'Open day',             4),
  ('external_platform',    'External platform',   5);

-- ------------------------------------------------------- exhibition.event_type_id
-- Three-step safe pattern: add nullable, backfill, then tighten. E0.1 disaggregates
-- by event type, so a null here is an event that cannot be counted in the breakdown.
alter table public.exhibition
  add column event_type_id uuid references public.ref_event_type(id);

update public.exhibition e
set event_type_id = (select id from public.ref_event_type where code = 'rural_market')
where e.event_type_id is null;

alter table public.exhibition
  alter column event_type_id set not null;

create index exhibition_event_type_id_idx on public.exhibition (event_type_id);

comment on column public.exhibition.event_type_id is
  'What kind of event this was. Separate axis from is_co_organised: "external_platform" and '
  'is_co_organised = true will often coincide (e.g. a stall at the Irbid Chamber of Commerce), '
  'but neither field is a substitute for the other -- one is what it was, the other is who ran it.';

-- ------------------------------------------------------------ exhibition.is_co_organised
alter table public.exhibition
  add column is_co_organised boolean not null default false;

comment on column public.exhibition.is_co_organised is
  'Who ran the event: false = organised solely by the Municipality, true = co-organised with a '
  'partner. Not a cost proxy -- see municipal_cost_jod. A co-organised event can still be fully '
  'paid for by the Municipality, and a solely-organised event can be free.';

-- ------------------------------------------------------- exhibition.municipal_cost_jod
-- Lets the budget line reconcile directly: sum this column and compare against the
-- 12,000 JOD / 6-rural-market line in Annexe 1, rather than inferring cost from
-- is_co_organised, which answers a different question.
alter table public.exhibition
  add column municipal_cost_jod numeric(10,2)
    check (municipal_cost_jod is null or municipal_cost_jod >= 0);

comment on column public.exhibition.municipal_cost_jod is
  'What the Municipality actually paid for this event, in JOD. Sum and compare against the '
  'Annexe 1 budget line (12,000 JOD across 6 rural markets at 2,000 JOD each). Do not use '
  'is_co_organised as a cost proxy -- they answer different questions (see its comment).';

-- ------------------------------------------------------- exhibition.cancellation_reason
alter table public.exhibition
  add column cancellation_reason text;

alter table public.exhibition
  add constraint cancelled_needs_reason
    check (not is_cancelled or cancellation_reason is not null);
