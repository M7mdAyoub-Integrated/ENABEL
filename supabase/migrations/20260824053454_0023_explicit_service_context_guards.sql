-- 0023 explicit_service_context_guards
--
-- Both guards previously leaned on NULL propagation: is_coordinator() returns NULL
-- when there is no JWT, and `if not NULL then` does not fire, so a trusted
-- server-side call fell through. Correct, but invisible, and it breaks the moment
-- someone wraps the helper in coalesce(). The service-context branch is now
-- written out: no JWT means service context and is allowed; a JWT means the role
-- must actually match. Same behaviour, survives a coalesce being added later.

create or replace function public.snapshot_period(p_period_code text)
returns int language plpgsql security definer set search_path = public as $$
declare v_period public.reporting_period; n int;
begin
  -- auth.uid() null = trusted server-side / service_role call, allowed.
  -- auth.uid() present = a real signed-in user, who must be a coordinator.
  if auth.uid() is not null
     and not coalesce(public.is_coordinator(), false) then
    raise exception 'Only a coordinator may snapshot a reporting period';
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

create or replace function public.followup_prefill(p_national_id text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  -- Same pattern as snapshot_period: no JWT is a trusted server call; a signed-in
  -- caller must be staff. This function takes a national ID and returns that
  -- person's full record, so a participant must never reach it.
  if auth.uid() is not null
     and not coalesce(public.is_staff(), false) then
    raise exception 'Only staff may read a follow-up prefill';
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

revoke all on function public.followup_prefill(text) from public, anon, authenticated;
revoke all on function public.snapshot_period(text)  from public, anon, authenticated;
