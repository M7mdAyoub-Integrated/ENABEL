-- 0006 training
-- D0.2 counts delivered sessions "in the food-processing set"; the set needs to be
-- markable in data rather than hard-coded in the view.
alter table public.ref_training_topic
  add column if not exists is_food_processing boolean not null default false;

create table public.training_session (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  topic_id       uuid not null references public.ref_training_topic(id),
  start_date     date not null,
  end_date       date not null,
  venue          text,
  delivered_by_partnership_id uuid references public.partnership(id),
  is_delivered   boolean not null default false,
  planned_seats  int check (planned_seats is null or planned_seats > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint session_dates check (end_date >= start_date)
);
select public.attach_updated_at('training_session');
create index training_session_dates_idx on public.training_session (end_date);

create table public.training_enrolment (
  id            uuid primary key default gen_random_uuid(),
  person_id     uuid not null references public.person(id),
  session_id    uuid not null references public.training_session(id),
  registered_on date not null default current_date,
  attended      boolean not null default false,
  met_criteria  boolean,
  decided_on    date,
  decided_by    uuid references auth.users(id),
  client_uuid   uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  -- one person cannot be enrolled twice in the same course
  unique (person_id, session_id),
  constraint decision_needs_date check (met_criteria is null or decided_on is not null)
);
select public.attach_updated_at('training_enrolment');
create index training_enrolment_person_idx  on public.training_enrolment (person_id);
create index training_enrolment_session_idx on public.training_enrolment (session_id);
