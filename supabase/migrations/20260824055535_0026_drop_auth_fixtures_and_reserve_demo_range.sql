-- 0026 drop_auth_fixtures_and_reserve_demo_range

-- 1. Remove the two build-phase auth identities.
-- They existed only so final acceptance test 8 could run the coordinator approval
-- under a real JWT instead of bypassing it. Empty-password identities must not
-- persist in the auth system of a project that will hold refugee status data.
-- app_user cascades (on delete cascade); nothing else references these uuids.
-- audit_log.actual actor ids are intentionally left intact: audit_log has no FK to
-- auth.users, and an append-only log must keep who did what even after the
-- identity is gone.
delete from auth.users
where id in ('11111111-1111-1111-1111-111111111111',
             '22222222-2222-2222-2222-222222222222');

-- 2. Reserve the demo national_id range.
--
-- WHY A TRIGGER AND NOT A CHECK CONSTRAINT: a plain CHECK is validated against
-- existing rows at creation time, and person already holds 300000001-300000004,
-- so adding one would fail. CHECK ... NOT VALID would succeed but leaves the table
-- carrying a constraint that can never be validated while the demo set exists,
-- which is a confusing state for anyone running a schema sweep. A trigger fires
-- only on new or changed values, gives a message that explains itself, does not
-- interfere with the DELETE that removes the range at go-live, and is dropped in
-- one statement when the range is retired.
create or replace function public.guard_reserved_demo_national_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.national_id like '3000000__' then
    if tg_op = 'INSERT' then
      raise exception
        'national_id % is in the reserved demo range 300000000-300000099. '
        'That range holds build-phase demo data only and is deleted at go-live. '
        'Use a real national ID.', new.national_id;
    elsif new.national_id is distinct from old.national_id then
      raise exception
        'national_id cannot be changed into the reserved demo range 300000000-300000099 '
        '(attempted: %).', new.national_id;
    end if;
  end if;
  return new;
end $$;

revoke all on function public.guard_reserved_demo_national_id() from public, anon, authenticated;

create trigger trg_person_reserved_demo_range
before insert or update of national_id on public.person
for each row execute function public.guard_reserved_demo_national_id();
