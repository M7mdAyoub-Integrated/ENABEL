-- 0010 coordination
create table public.coordination_meeting (
  id           uuid primary key default gen_random_uuid(),
  meeting_date date not null,
  subject      text not null,
  minutes_ref  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('coordination_meeting');
create index coordination_meeting_date_idx on public.coordination_meeting (meeting_date);

-- The plan specified primary key (meeting_id, coalesce(partnership_id::text, external_name)).
-- Postgres does not allow expressions in a primary key, so: surrogate PK + unique index.
create table public.coordination_meeting_partner (
  id                  uuid primary key default gen_random_uuid(),
  meeting_id          uuid not null references public.coordination_meeting(id) on delete cascade,
  partnership_id      uuid references public.partnership(id),
  external_name       text,
  stakeholder_type_id uuid references public.ref_stakeholder_type(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendee_identified check (partnership_id is not null or external_name is not null)
);
select public.attach_updated_at('coordination_meeting_partner');

create unique index coordination_meeting_partner_uniq
  on public.coordination_meeting_partner (meeting_id, coalesce(partnership_id::text, external_name));

create table public.case_study (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  person_id        uuid references public.person(id),
  initiative_id    uuid references public.production_initiative(id),
  documented_on    date not null,
  summary          text not null,
  change_evidenced text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
select public.attach_updated_at('case_study');
create index case_study_documented_on_idx on public.case_study (documented_on);

-- attendance is a contribution, so G0.4 picks it up automatically
alter table public.partner_contribution
  drop constraint partner_contribution_contribution_type_check;
alter table public.partner_contribution
  add constraint partner_contribution_contribution_type_check
  check (contribution_type in
    ('training','service','referral','market','funding','coordination','other'));

create or replace function public.contribution_from_meeting()
returns trigger language plpgsql as $$
declare m public.coordination_meeting;
begin
  if new.partnership_id is null then
    return new;  -- external attendee, no partnership to credit
  end if;

  select * into m from public.coordination_meeting where id = new.meeting_id;

  insert into public.partner_contribution
    (partnership_id, contributed_on, contribution_type, entity_type, entity_id, description)
  values
    (new.partnership_id, m.meeting_date, 'coordination',
     'coordination_meeting', m.id,
     'Attended coordination meeting: ' || m.subject);

  return new;
end $$;

create trigger trg_meeting_partner_contribution
after insert on public.coordination_meeting_partner
for each row execute function public.contribution_from_meeting();
