-- 0007 office
create table public.milestone (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  is_achieved  boolean not null default false,
  achieved_on  date,
  decision_ref text,
  notes        text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint achieved_needs_date check (not is_achieved or achieved_on is not null)
);
select public.attach_updated_at('milestone');

create table public.office_service (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.person(id),
  service_type_id uuid not null references public.ref_office_service_type(id),
  service_date    date not null,
  adviser         text,
  notes           text,
  client_uuid     uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('office_service');
create index office_service_person_idx on public.office_service (person_id);
create index office_service_date_idx   on public.office_service (service_date);
