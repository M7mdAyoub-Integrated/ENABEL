-- 0008 production
create table public.production_initiative (
  id                uuid primary key default gen_random_uuid(),
  person_id         uuid not null references public.person(id),
  title             text not null,
  activity_type_id  uuid not null references public.ref_activity_type(id),
  main_product      text,
  started_on        date,
  status            initiative_status_t not null default 'planned',
  is_women_led      boolean,
  is_youth_led      boolean,
  support_value_jod numeric(10,2) check (support_value_jod is null or support_value_jod >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('production_initiative');
create index production_initiative_person_idx on public.production_initiative (person_id);

create table public.mentorship_session (
  id            uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.production_initiative(id),
  session_date  date not null,
  topic         text not null,
  adviser       text,
  client_uuid   uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('mentorship_session');
create index mentorship_session_date_idx on public.mentorship_session (session_date);

-- points at an initiative, not just a person, so C1.2 can require both halves
create table public.market_linkage (
  id             uuid primary key default gen_random_uuid(),
  initiative_id  uuid not null references public.production_initiative(id),
  partnership_id uuid not null references public.partnership(id),
  scope          text not null,
  request        text,
  linked_on      date not null default current_date,
  status         link_status_t not null default 'proposed',
  outcome        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('market_linkage');
create index market_linkage_initiative_idx on public.market_linkage (initiative_id);
create index market_linkage_linked_on_idx  on public.market_linkage (linked_on);

-- D0.1 gets its own source rather than borrowing the Completion form
create table public.guidance_record (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.person(id),
  guidance_type_id uuid not null references public.ref_guidance_type(id),
  guidance_date    date not null,
  delivered_by     text,
  client_uuid      uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('guidance_record');
create index guidance_record_person_idx on public.guidance_record (person_id);
create index guidance_record_date_idx   on public.guidance_record (guidance_date);

-- The Action Plan sequences production support after training, but the
-- municipality must still be able to record exceptions: warn, never block.
create or replace function public.warn_linkage_without_training()
returns trigger language plpgsql as $$
declare has_training boolean;
begin
  select exists (
    select 1
    from public.production_initiative pi
    join public.training_enrolment te on te.person_id = pi.person_id
    where pi.id = new.initiative_id
      and te.met_criteria is true
      and te.deleted_at is null
  ) into has_training;

  if not has_training then
    raise warning 'market_linkage %: person has no completed training on record', new.id;
  end if;
  return new;
end $$;

create trigger trg_market_linkage_training_warn
after insert on public.market_linkage
for each row execute function public.warn_linkage_without_training();
