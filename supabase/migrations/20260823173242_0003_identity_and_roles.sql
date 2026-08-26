-- 0003 identity_and_roles
create type app_role_t as enum (
  'coordinator',    -- everything
  'data_entry',     -- create/edit forms, no delete, no approvals
  'enumerator',     -- follow-up surveys only, plus read on person
  'partner_viewer', -- read-only dashboard, no National IDs
  'participant'     -- own records only
);

create table public.app_user (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       app_role_t not null default 'participant',
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select public.attach_updated_at('app_user');

create or replace function public.current_role()
returns app_role_t
language sql stable security definer set search_path = public as $$
  select role from public.app_user where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() in ('coordinator','data_entry','enumerator'), false);
$$;

-- auto-provision an app_user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.app_user (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Unknown'),
    'participant'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
