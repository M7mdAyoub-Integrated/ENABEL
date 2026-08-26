-- 0015 rls
-- 1. RLS on absolutely everything in public
do $outer$
declare r record;
begin
  for r in select c.relname as t from pg_class c
           join pg_namespace ns on ns.oid = c.relnamespace
           where ns.nspname='public' and c.relkind='r'
  loop
    execute format('alter table public.%I enable row level security', r.t);
  end loop;
end $outer$;

-- 2. reference and framework definition tables: everyone reads, coordinator writes
do $outer$
declare r record;
begin
  for r in select c.relname as t from pg_class c
           join pg_namespace ns on ns.oid = c.relnamespace
           where ns.nspname='public' and c.relkind='r'
             and (c.relname like 'ref\_%' or c.relname in
                  ('objective','activity','indicator','reporting_period',
                   'indicator_target','indicator_snapshot'))
  loop
    execute format($f$create policy ref_read on public.%I
      for select to authenticated using (true)$f$, r.t);
    execute format($f$create policy ref_write on public.%I
      for all to authenticated
      using (public.current_role() = 'coordinator')
      with check (public.current_role() = 'coordinator')$f$, r.t);
  end loop;
end $outer$;

-- 3. operational tables: staff read, coordinator/data_entry write, nobody hard-deletes
do $outer$
declare t text;
begin
  foreach t in array array[
    'partner','partnership','partnership_role','partner_contribution',
    'training_session','training_enrolment','milestone','office_service',
    'production_initiative','mentorship_session','market_linkage','guidance_record',
    'exhibition','exhibition_registration_product','promotional_action',
    'coordination_meeting','coordination_meeting_partner','case_study',
    'person_activity_type','attachment'
  ] loop
    execute format($f$create policy op_read on public.%I
      for select to authenticated using (public.is_staff())$f$, t);
    execute format($f$create policy op_insert on public.%I
      for insert to authenticated
      with check (public.current_role() in ('coordinator','data_entry'))$f$, t);
    execute format($f$create policy op_update on public.%I
      for update to authenticated
      using (public.current_role() in ('coordinator','data_entry'))
      with check (public.current_role() in ('coordinator','data_entry'))$f$, t);
  end loop;
end $outer$;

-- 4. person: staff read all; a participant reads and edits only their own row
create policy person_staff_read on public.person
  for select to authenticated using (public.is_staff());
create policy person_self_read on public.person
  for select to authenticated using (auth_user_id = auth.uid());
create policy person_staff_insert on public.person
  for insert to authenticated
  with check (public.current_role() in ('coordinator','data_entry'));
create policy person_staff_update on public.person
  for update to authenticated
  using (public.current_role() in ('coordinator','data_entry'))
  with check (public.current_role() in ('coordinator','data_entry'));
create policy person_self_update on public.person
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- policies cannot compare old and new cleanly, so guard the National ID in a trigger
create or replace function public.guard_person_national_id()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.national_id is distinct from old.national_id
     and coalesce(public.current_role(), 'participant') <> 'coordinator' then
    raise exception 'national_id cannot be changed';
  end if;
  return new;
end $$;

create trigger trg_person_guard_national_id
before update on public.person
for each row execute function public.guard_person_national_id();

-- 5. follow-up survey and children: coordinator and enumerator only
do $outer$
declare t text;
begin
  foreach t in array array[
    'followup_survey','followup_answer','followup_answer_option',
    'followup_safety_item','followup_buyer_connection'
  ] loop
    execute format($f$create policy fu_read on public.%I
      for select to authenticated
      using (public.current_role() in ('coordinator','enumerator'))$f$, t);
    execute format($f$create policy fu_insert on public.%I
      for insert to authenticated
      with check (public.current_role() in ('coordinator','enumerator'))$f$, t);
  end loop;
end $outer$;

-- coordinator may update any survey; an enumerator only while it is still a draft
create policy fu_update_coord on public.followup_survey
  for update to authenticated
  using (public.current_role() = 'coordinator')
  with check (public.current_role() = 'coordinator');
create policy fu_update_enum on public.followup_survey
  for update to authenticated
  using (public.current_role() = 'enumerator' and status = 'draft')
  with check (public.current_role() = 'enumerator');

do $outer$
declare t text;
begin
  foreach t in array array['followup_answer','followup_answer_option',
                           'followup_safety_item','followup_buyer_connection'] loop
    execute format($f$create policy fu_update_child on public.%I
      for update to authenticated
      using (public.current_role() = 'coordinator'
             or (public.current_role() = 'enumerator'
                 and exists (select 1 from public.followup_survey s
                             where s.id = survey_id and s.status = 'draft')))
      with check (public.current_role() in ('coordinator','enumerator'))$f$, t);
  end loop;
end $outer$;

-- 6. exhibition_registration: two roles write to it
create policy er_participant_insert on public.exhibition_registration
  for insert to authenticated
  with check (
    person_id = public.my_person_id()
    and status = 'submitted'
    and submitted_by_participant = true
  );
create policy er_staff_insert on public.exhibition_registration
  for insert to authenticated
  with check (public.current_role() in ('coordinator','data_entry'));
create policy er_select on public.exhibition_registration
  for select to authenticated
  using (person_id = public.my_person_id() or public.is_staff());
create policy er_staff_update on public.exhibition_registration
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- only a coordinator may move a registration to approved or rejected
create or replace function public.guard_registration_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and coalesce(public.current_role(), 'participant') <> 'coordinator' then
    raise exception 'only a coordinator may change registration status';
  end if;
  return new;
end $$;

create trigger trg_registration_guard_status
before update on public.exhibition_registration
for each row execute function public.guard_registration_status();

-- 7. app_user: read your own row, coordinator manages all
create policy au_self_read on public.app_user
  for select to authenticated using (id = auth.uid());
create policy au_coord_read on public.app_user
  for select to authenticated using (public.current_role() = 'coordinator');
create policy au_coord_write on public.app_user
  for all to authenticated
  using (public.current_role() = 'coordinator')
  with check (public.current_role() = 'coordinator');

-- 8. audit_log is append-only and coordinator-readable. No update or delete policy
--    exists for anyone, including coordinator, so those operations are impossible.
create policy audit_read on public.audit_log
  for select to authenticated using (public.current_role() = 'coordinator');

-- 9. the masked person view for partner_viewer; National ID never leaves the table
create or replace view public.v_person_public as
select p.id,
       left(p.national_id, 3) || '******' as national_id_masked,
       p.full_name, p.sex,
       public.age_band(p) as age_band,
       p.is_refugee, p.has_disability, p.village
from public.person p
where p.deleted_at is null
  and (public.is_staff() or public.current_role() = 'partner_viewer');

grant select on public.v_person_public to authenticated;
grant select on public.v_indicator_actual to authenticated;
grant select on public.v_indicator_disaggregated to authenticated;
