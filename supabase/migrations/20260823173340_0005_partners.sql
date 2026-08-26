-- 0005 partners
create table public.partner (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  unit           text,
  contact_person text,
  phone          text,
  email          text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  -- nulls not distinct so two rows with the same name and no unit collide
  constraint partner_name_unique unique nulls not distinct (name, unit)
);
select public.attach_updated_at('partner');

create table public.partnership (
  id                 uuid primary key default gen_random_uuid(),
  partner_id         uuid not null references public.partner(id),
  partnership_type   partnership_type_t not null,
  partner_type_id    uuid not null,
  partner_type_other text,
  established_on     date not null,
  agreement_ref      text,
  is_active          boolean not null default true,
  ended_on           date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  unique (partner_id, partnership_type),
  constraint ended_after_established check (ended_on is null or ended_on >= established_on)
);
select public.attach_updated_at('partnership');

create table public.partnership_role (
  partnership_id uuid not null references public.partnership(id) on delete cascade,
  role_id        uuid not null,
  role_other     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (partnership_id, role_id)
);
select public.attach_updated_at('partnership_role');

-- Postgres cannot express a conditional FK, so validate in a trigger.
create or replace function public.check_partnership_type()
returns trigger language plpgsql as $$
declare ok boolean; needs_text boolean;
begin
  if new.partnership_type = 'training' then
    select exists(select 1 from public.ref_partner_type_training where id = new.partner_type_id),
           coalesce((select allows_free_text from public.ref_partner_type_training where id = new.partner_type_id), false)
      into ok, needs_text;
  else
    select exists(select 1 from public.ref_partner_type_production where id = new.partner_type_id),
           coalesce((select allows_free_text from public.ref_partner_type_production where id = new.partner_type_id), false)
      into ok, needs_text;
  end if;

  if not ok then
    raise exception 'partner_type_id % is not a valid option for partnership_type %',
      new.partner_type_id, new.partnership_type;
  end if;
  if needs_text and coalesce(btrim(new.partner_type_other), '') = '' then
    raise exception 'partner_type_other is required when the selected partner type allows free text';
  end if;
  return new;
end $$;

create trigger trg_partnership_type_check
before insert or update on public.partnership
for each row execute function public.check_partnership_type();

create or replace function public.check_partnership_role()
returns trigger language plpgsql as $$
declare ptype partnership_type_t; ok boolean; needs_text boolean;
begin
  select partnership_type into ptype
  from public.partnership where id = new.partnership_id;

  if ptype = 'training' then
    select exists(select 1 from public.ref_partner_role_training where id = new.role_id),
           coalesce((select allows_free_text from public.ref_partner_role_training where id = new.role_id), false)
      into ok, needs_text;
  else
    select exists(select 1 from public.ref_partner_role_production where id = new.role_id),
           coalesce((select allows_free_text from public.ref_partner_role_production where id = new.role_id), false)
      into ok, needs_text;
  end if;

  if not ok then
    raise exception 'role_id % is not a valid role for a % partnership', new.role_id, ptype;
  end if;
  if needs_text and coalesce(btrim(new.role_other), '') = '' then
    raise exception 'role_other is required when the selected role allows free text';
  end if;
  return new;
end $$;

create trigger trg_partnership_role_check
before insert or update on public.partnership_role
for each row execute function public.check_partnership_role();

-- the table that makes G0.4 measurable
create table public.partner_contribution (
  id                uuid primary key default gen_random_uuid(),
  partnership_id    uuid not null references public.partnership(id),
  contributed_on    date not null,
  contribution_type text not null check (contribution_type in
                      ('training','service','referral','market','funding','other')),
  entity_type       text,
  entity_id         uuid,
  description       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('partner_contribution');

create index partner_contribution_period_idx on public.partner_contribution (contributed_on);
create index partner_contribution_entity_idx on public.partner_contribution (entity_type, entity_id);
