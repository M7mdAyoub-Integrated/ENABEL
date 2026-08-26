-- 0004 person
create table public.person (
  id                  uuid primary key default gen_random_uuid(),
  national_id         text not null unique,
  full_name           text not null,
  sex                 sex_t,
  date_of_birth       date,
  age_recorded        int,
  phone               text,
  nationality_id      uuid references public.ref_nationality(id),
  is_refugee          boolean,
  has_disability      boolean,
  disability_type_id  uuid references public.ref_disability_type(id),
  village             text,
  agri_involvement_id uuid references public.ref_agri_involvement(id),
  auth_user_id        uuid unique references auth.users(id),
  notes               text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint national_id_format check (national_id ~ '^[0-9]{9}$'),
  constraint age_or_dob check (date_of_birth is not null or age_recorded is not null)
);
select public.attach_updated_at('person');

create index person_full_name_trgm on public.person using gin (full_name gin_trgm_ops);
create index person_national_id_idx on public.person (national_id);
create index person_deleted_at_idx  on public.person (deleted_at) where deleted_at is null;

create table public.person_activity_type (
  person_id        uuid not null references public.person(id) on delete cascade,
  activity_type_id uuid not null references public.ref_activity_type(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (person_id, activity_type_id)
);
select public.attach_updated_at('person_activity_type');

-- age band used across all reporting; STABLE not IMMUTABLE because age() reads current_date
create or replace function public.age_band(p public.person)
returns text language sql stable as $$
  select case
           when s.a is null then 'not_recorded'
           when s.a < 25    then '18-24'
           when s.a < 35    then '25-34'
           when s.a < 45    then '35-44'
           else '45+'
         end
  from (select coalesce(
                 date_part('year', age(p.date_of_birth::timestamp))::int,
                 p.age_recorded) as a) s;
$$;

-- needed by RLS later; created here because it depends on person
create or replace function public.my_person_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.person
  where auth_user_id = auth.uid() and deleted_at is null;
$$;
