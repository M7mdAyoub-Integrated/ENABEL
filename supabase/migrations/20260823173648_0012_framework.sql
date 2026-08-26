-- 0012 framework
create table public.objective (
  id      uuid primary key default gen_random_uuid(),
  code    text not null unique,
  name_en text not null,
  name_ar text not null,
  result_statement_en text,
  sort_order int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.attach_updated_at('objective');

create table public.activity (
  id           uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objective(id),
  code         text not null unique,
  name_en      text not null,
  name_ar      text not null,
  sort_order   int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.attach_updated_at('activity');

create table public.indicator (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  objective_id   uuid not null references public.objective(id),
  activity_id    uuid references public.activity(id),
  name_en        text not null,
  name_ar        text,
  indicator_type text not null check (indicator_type in
                   ('impact','result','intermediate','output','milestone')),
  unit           text not null check (unit in ('#','%')),
  definition     text,
  formula        text,
  data_source    text,
  view_name      text,
  baseline       numeric default 0,
  final_target   numeric,
  disaggregation text[],
  sort_order     int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.attach_updated_at('indicator');

create table public.reporting_period (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  start_date date not null,
  end_date   date not null,
  is_locked  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_dates check (end_date >= start_date)
);
select public.attach_updated_at('reporting_period');

create table public.indicator_target (
  indicator_id uuid not null references public.indicator(id),
  period_id    uuid not null references public.reporting_period(id),
  target_value numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (indicator_id, period_id)
);
select public.attach_updated_at('indicator_target');

-- the live view drives the dashboard; the snapshot freezes the donor return
create table public.indicator_snapshot (
  indicator_id uuid not null references public.indicator(id),
  period_id    uuid not null references public.reporting_period(id),
  actual_value numeric,
  computed_at  timestamptz not null default now(),
  computed_by  uuid references auth.users(id),
  is_final     boolean not null default false,
  note         text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (indicator_id, period_id)
);
select public.attach_updated_at('indicator_snapshot');
