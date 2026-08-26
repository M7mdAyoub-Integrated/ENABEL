-- 0020 performance (from the Supabase performance advisor)

-- 1. the API roles need `extensions` on the search_path now that pg_trgm moved,
--    otherwise the app has to schema-qualify every trigram operator
alter role authenticated set search_path = "$user", public, extensions;
alter role anon          set search_path = "$user", public, extensions;
alter role service_role  set search_path = "$user", public, extensions;

-- 2. collapse overlapping permissive policies into one policy per action,
--    and wrap auth.uid() in a scalar subquery so it is evaluated once, not per row
drop policy if exists ref_write on public.objective;
do $outer$
declare r record;
begin
  for r in select c.relname as t from pg_class c
           join pg_namespace ns on ns.oid=c.relnamespace
           where ns.nspname='public' and c.relkind='r'
             and (c.relname like 'ref\_%' or c.relname in
                  ('objective','activity','indicator','reporting_period',
                   'indicator_target','indicator_snapshot'))
  loop
    execute format('drop policy if exists ref_write on public.%I', r.t);
    execute format($f$create policy ref_insert on public.%I for insert to authenticated
      with check (public.current_role() = 'coordinator')$f$, r.t);
    execute format($f$create policy ref_update on public.%I for update to authenticated
      using (public.current_role() = 'coordinator')
      with check (public.current_role() = 'coordinator')$f$, r.t);
    execute format($f$create policy ref_delete on public.%I for delete to authenticated
      using (public.current_role() = 'coordinator')$f$, r.t);
  end loop;
end $outer$;

-- person: one SELECT policy, one UPDATE policy
drop policy person_staff_read   on public.person;
drop policy person_self_read    on public.person;
drop policy person_staff_update on public.person;
drop policy person_self_update  on public.person;
create policy person_read on public.person
  for select to authenticated
  using (public.is_staff() or auth_user_id = (select auth.uid()));
create policy person_update on public.person
  for update to authenticated
  using (public.current_role() in ('coordinator','data_entry')
         or auth_user_id = (select auth.uid()))
  with check (public.current_role() in ('coordinator','data_entry')
         or auth_user_id = (select auth.uid()));

-- app_user: one SELECT policy, explicit write policies
drop policy au_self_read   on public.app_user;
drop policy au_coord_read  on public.app_user;
drop policy au_coord_write on public.app_user;
create policy au_read on public.app_user
  for select to authenticated
  using (id = (select auth.uid()) or public.current_role() = 'coordinator');
create policy au_insert on public.app_user
  for insert to authenticated
  with check (public.current_role() = 'coordinator');
create policy au_update on public.app_user
  for update to authenticated
  using (public.current_role() = 'coordinator')
  with check (public.current_role() = 'coordinator');
create policy au_delete on public.app_user
  for delete to authenticated
  using (public.current_role() = 'coordinator');

-- exhibition_registration: one INSERT policy covering both writer roles
drop policy er_participant_insert on public.exhibition_registration;
drop policy er_staff_insert       on public.exhibition_registration;
create policy er_insert on public.exhibition_registration
  for insert to authenticated
  with check (
    public.current_role() in ('coordinator','data_entry')
    or (person_id = public.my_person_id()
        and status = 'submitted'
        and submitted_by_participant = true)
  );

-- followup_survey: one UPDATE policy
drop policy fu_update_coord on public.followup_survey;
drop policy fu_update_enum  on public.followup_survey;
create policy fu_update on public.followup_survey
  for update to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator' and status = 'draft'))
  with check (public.current_role() in ('coordinator','enumerator'));

-- 3. index every foreign key whose leading column is not already indexed
do $outer$
declare r record; idx_name text;
begin
  for r in
    select c.conrelid::regclass::text as tbl,
           a.attname                  as col,
           c.conrelid                 as reloid,
           c.conkey[1]                as attnum
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and array_length(c.conkey,1) = 1
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
  loop
    idx_name := left(replace(r.tbl,'public.','') || '_' || r.col || '_idx', 63);
    execute format('create index if not exists %I on %s (%I)', idx_name, r.tbl, r.col);
  end loop;
end $outer$;
