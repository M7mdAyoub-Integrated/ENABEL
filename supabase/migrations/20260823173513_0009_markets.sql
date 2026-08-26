-- 0009 markets
create table public.exhibition (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  location         text not null,
  booth_capacity   int not null check (booth_capacity > 0),
  external_sponsor text,
  is_cancelled     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint exhibition_dates check (end_date >= start_date)
);
select public.attach_updated_at('exhibition');
create index exhibition_end_date_idx on public.exhibition (end_date);

create table public.exhibition_registration (
  id                  uuid primary key default gen_random_uuid(),
  exhibition_id       uuid not null references public.exhibition(id),
  person_id           uuid not null references public.person(id),
  producer_type_id    uuid not null references public.ref_producer_type(id),
  producer_type_other text,
  -- left null by the client and derived by trigger; pass a value to override
  is_first_time       boolean not null,
  status              record_status_t not null default 'submitted',
  submitted_by_participant boolean not null default false,
  reviewed_by         uuid references auth.users(id),
  reviewed_at         timestamptz,
  client_uuid         uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  unique (exhibition_id, person_id)
);
select public.attach_updated_at('exhibition_registration');
create index exhibition_registration_person_idx on public.exhibition_registration (person_id);
create index exhibition_registration_status_idx on public.exhibition_registration (status);

create table public.exhibition_registration_product (
  registration_id uuid not null references public.exhibition_registration(id) on delete cascade,
  product_id      uuid not null references public.ref_product(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (registration_id, product_id)
);
select public.attach_updated_at('exhibition_registration_product');

create table public.promotional_action (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  channel_id     uuid not null references public.ref_promotional_channel(id),
  action_date    date not null,
  reach_estimate int check (reach_estimate is null or reach_estimate >= 0),
  description    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('promotional_action');
create index promotional_action_date_idx on public.promotional_action (action_date);

-- business rules: no registering for a finished event, no overbooking,
-- and first-time status is derived from history rather than asked.
create or replace function public.check_exhibition_registration()
returns trigger language plpgsql as $$
declare ex public.exhibition; approved_count int;
begin
  select * into ex from public.exhibition where id = new.exhibition_id;

  if ex.end_date < current_date then
    raise exception 'exhibition % ended on %, registration is closed', ex.name, ex.end_date;
  end if;
  if ex.is_cancelled then
    raise exception 'exhibition % is cancelled', ex.name;
  end if;

  select count(*) into approved_count
  from public.exhibition_registration
  where exhibition_id = new.exhibition_id
    and status = 'approved'
    and deleted_at is null;

  if approved_count >= ex.booth_capacity then
    raise exception 'exhibition % is full: % of % booths approved',
      ex.name, approved_count, ex.booth_capacity;
  end if;

  if new.is_first_time is null then
    new.is_first_time := not exists (
      select 1 from public.exhibition_registration r
      join public.exhibition e2 on e2.id = r.exhibition_id
      where r.person_id = new.person_id
        and r.status = 'approved'
        and r.deleted_at is null
        and e2.start_date < ex.start_date
    );
  end if;

  return new;
end $$;

create trigger trg_exhibition_registration_check
before insert on public.exhibition_registration
for each row execute function public.check_exhibition_registration();
