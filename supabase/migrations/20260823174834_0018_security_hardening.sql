-- 0018 security_hardening (from the Supabase security advisor)

-- 1. pin search_path on the functions that were missing it
alter function public.set_updated_at()                set search_path = public;
alter function public.attach_updated_at(text)         set search_path = public;
alter function public.age_band(public.person)         set search_path = public;
alter function public.check_partnership_type()        set search_path = public;
alter function public.check_partnership_role()        set search_path = public;
alter function public.warn_linkage_without_training() set search_path = public;
alter function public.check_exhibition_registration() set search_path = public;
alter function public.contribution_from_meeting()     set search_path = public;

-- 2. trigger functions must never be callable over the REST API
do $outer$
declare f text;
begin
  foreach f in array array[
    'public.set_updated_at()','public.audit_row()','public.handle_new_user()',
    'public.check_partnership_type()','public.check_partnership_role()',
    'public.warn_linkage_without_training()','public.check_exhibition_registration()',
    'public.contribution_from_meeting()','public.guard_person_national_id()',
    'public.guard_registration_status()','public.attach_updated_at(text)'
  ] loop
    execute format('revoke all on function %s from anon, authenticated', f);
  end loop;
end $outer$;

-- 3. helper functions are needed by RLS for signed-in users, but never by anon
revoke all on function public.current_role()  from anon;
revoke all on function public.is_staff()      from anon;
revoke all on function public.my_person_id()  from anon;

-- 4. followup_prefill returned a full person record to anyone who knew a National ID.
--    Lock it to staff. A null auth.uid() means a trusted server-side/service call.
create or replace function public.followup_prefill(p_national_id text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'not authorised';
  end if;

  return (
    select jsonb_build_object(
      'person', (
        select to_jsonb(pe) from public.person pe
        where pe.national_id = p_national_id and pe.deleted_at is null
      ),
      'trainings', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'session_id', ts.id, 'title', ts.title,
                 'topic_en', rt.label_en, 'topic_ar', rt.label_ar,
                 'end_date', ts.end_date, 'attended', te.attended,
                 'met_criteria', te.met_criteria) order by ts.end_date)
        from public.training_enrolment te
        join public.training_session   ts on ts.id = te.session_id
        join public.ref_training_topic rt on rt.id = ts.topic_id
        join public.person             pe on pe.id = te.person_id
        where pe.national_id = p_national_id
          and te.deleted_at is null and ts.deleted_at is null
      ), '[]'::jsonb),
      'has_linkage', exists (
        select 1 from public.market_linkage ml
        join public.production_initiative pi on pi.id = ml.initiative_id
        join public.person pe on pe.id = pi.person_id
        where pe.national_id = p_national_id
          and ml.deleted_at is null and ml.status in ('active','ended')
      ),
      'events_attended', (
        select count(*) from public.exhibition_registration er
        join public.person pe on pe.id = er.person_id
        where pe.national_id = p_national_id
          and er.status = 'approved' and er.deleted_at is null
      ),
      'support_received', jsonb_build_object(
        'initiatives', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'id', pi.id, 'title', pi.title,
                   'status', pi.status, 'started_on', pi.started_on))
          from public.production_initiative pi
          join public.person pe on pe.id = pi.person_id
          where pe.national_id = p_national_id and pi.deleted_at is null
        ), '[]'::jsonb),
        'guidance_sessions', (
          select count(*) from public.guidance_record gr
          join public.person pe on pe.id = gr.person_id
          where pe.national_id = p_national_id and gr.deleted_at is null
        ),
        'office_services', (
          select count(*) from public.office_service os
          join public.person pe on pe.id = os.person_id
          where pe.national_id = p_national_id and os.deleted_at is null
        )
      )
    )
  );
end $$;
revoke all on function public.followup_prefill(text) from anon;

-- 5. only a coordinator may freeze a reporting period
create or replace function public.snapshot_period(p_period_code text)
returns int language plpgsql security definer set search_path = public as $$
declare v_period public.reporting_period; n int;
begin
  if auth.uid() is not null and public.current_role() <> 'coordinator' then
    raise exception 'only a coordinator may snapshot a reporting period';
  end if;

  select * into v_period from public.reporting_period where code = p_period_code;
  if not found then
    raise exception 'unknown reporting period %', p_period_code;
  end if;
  if v_period.is_locked then
    raise exception 'reporting period % is locked and cannot be recomputed', p_period_code;
  end if;

  insert into public.indicator_snapshot
    (indicator_id, period_id, actual_value, computed_at, computed_by)
  select i.id, v_period.id, a.actual, now(), auth.uid()
  from public.v_indicator_actual a
  join public.indicator i on i.code = a.code
  where a.period_code = p_period_code
  on conflict (indicator_id, period_id) do update
    set actual_value = excluded.actual_value,
        computed_at  = now(),
        computed_by  = excluded.computed_by
    where public.indicator_snapshot.is_final = false;

  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.snapshot_period(text) from anon;

-- 6. The 20 leaf views stay SECURITY DEFINER on purpose: that is what lets a
--    partner_viewer read aggregates without any grant on the underlying tables.
--    They are internal, so revoke direct access and gate the two public surfaces.
do $outer$
declare v text;
begin
  for v in select c.relname from pg_class c
           join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relkind='v' and c.relname like 'v\_ind\_%'
  loop
    execute format('revoke all on public.%I from anon, authenticated', v);
  end loop;
end $outer$;

create or replace view public.v_indicator_actual as
select * from (
              select 'IMP-0'::text as code, * from public.v_ind_imp_0
    union all select 'A1',    * from public.v_ind_a1
    union all select 'A1.2',  * from public.v_ind_a1_2
    union all select 'A1.3',  * from public.v_ind_a1_3
    union all select 'B1',    * from public.v_ind_b1
    union all select 'B1.1',  * from public.v_ind_b1_1
    union all select 'B1.2',  * from public.v_ind_b1_2
    union all select 'C1',    * from public.v_ind_c1
    union all select 'C1.1',  * from public.v_ind_c1_1
    union all select 'C1.2',  * from public.v_ind_c1_2
    union all select 'C1.3',  * from public.v_ind_c1_3
    union all select 'D0.1',  * from public.v_ind_d0_1
    union all select 'D0.2',  * from public.v_ind_d0_2
    union all select 'E0.1',  * from public.v_ind_e0_1
    union all select 'E0.2',  * from public.v_ind_e0_2
    union all select 'F0.1',  * from public.v_ind_f0_1
    union all select 'G0.1',  * from public.v_ind_g0_1
    union all select 'G0.2',  * from public.v_ind_g0_2
    union all select 'G0.3',  * from public.v_ind_g0_3
    union all select 'G0.4',  * from public.v_ind_g0_4
) x
where auth.uid() is null
   or public.is_staff()
   or public.current_role() = 'partner_viewer';

revoke all on public.v_indicator_actual from anon;
grant select on public.v_indicator_actual to authenticated;
revoke all on public.v_person_public from anon;
revoke all on public.v_indicator_disaggregated from anon, authenticated;
grant select on public.v_indicator_disaggregated to authenticated;
