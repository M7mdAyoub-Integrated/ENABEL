-- ═══════════════════════════════════════════════════════════════════════════
--  0070 — my_applications: what one person applied for, and what happened
--
--  The fourth and last public RPC. Someone who applied through the public site
--  has, until now, had no way to find out whether anything came of it.
--
--  ── ITS OWN FUNCTION, NOT A WIDER applicant_prefill ──
--
--  applicant_prefill exists to fill in a form. Adding an application list to it
--  would mean every form fill also carries a history nobody asked for, and one
--  function with two reasons to change is how a narrow public surface stops
--  being narrow. One function, one purpose.
--
--  The identity check is a COPY of prefill's, deliberately, rather than a call
--  into it: prefill returns the person's name, sex, village and phone, so
--  calling it here would compute a payload this function must not have and
--  then discard it. The four lines are duplicated so that nothing is fetched
--  that is not returned.
--
--  ── THE FAILURE IS ONE CONSTANT ──
--
--  c_miss is the single answer to: a malformed id, a throttled caller, an
--  unknown national id, a wrong date of birth, and a wrong phone. Byte for
--  byte identical, so this endpoint cannot be used to discover whether an ID is
--  registered. Same rule and same reasoning as 0052 and 0054.
--
--  ── THE PAYLOAD IS DELIBERATELY THIN ──
--
--  Four fields per row: kind, title, on, status. That is what someone needs to
--  know whether to wait or to come in.
--
--  What is NOT here, and must never be added:
--
--    person_id       a durable handle to a person row, sitting in a browser
--    is_refugee      }  the disaggregation fields. They are why the registry
--    has_disability  }  is sensitive, and 0052 already refuses to return them
--    any row id      nothing on this page needs to address a record
--    anything about anyone else
--
--  `title` is the session, market or venture the person applied to or named
--  themselves. `status` is one string per row rather than a status plus an
--  outcome, because for a training the two collapse: once met_criteria is
--  decided, "completed" IS the status from the applicant's point of view, and
--  it is the thing that tells them whether the next step has opened. A second
--  field would be a second thing to keep in step.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.my_applications(
  p_national_id   text,
  p_date_of_birth date default null,
  p_phone         text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id     text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone  text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client text;
  v_ok     boolean;
  v_person person%rowtype;
  v_rows   jsonb;
  c_miss   constant jsonb := jsonb_build_object('found', false);
begin
  v_client := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown');

  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);

  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;

  if not v_ok then
    return c_miss;
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;

  if not found then
    return c_miss;
  end if;

  -- Same asymmetric rule as 0053: no downgrade from a date of birth that
  -- exists to a phone number.
  if v_person.date_of_birth is not null then
    if p_date_of_birth is null or v_person.date_of_birth <> p_date_of_birth then
      return c_miss;
    end if;
  else
    if length(v_phone) < 9
       or right(regexp_replace(coalesce(v_person.phone, ''), '\D', '', 'g'), 9) <> v_phone then
      return c_miss;
    end if;
  end if;

  -- Every branch filters deleted_at on BOTH the application and the thing it
  -- points at. A withdrawn application, or one against a cancelled session
  -- that was removed, must not appear here saying "approved".
  select coalesce(jsonb_agg(r order by r->>'on' desc), '[]'::jsonb)
    into v_rows
    from (
      select jsonb_build_object(
               'kind',   'training',
               'title',  ts.title,
               'on',     te.applied_on,
               'status', case
                           when te.met_criteria is true  then 'completed'
                           when te.met_criteria is false then 'not_completed'
                           else te.application_status::text
                         end) as r
        from training_enrolment te
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.person_id = v_person.id and te.deleted_at is null

      union all

      select jsonb_build_object(
               'kind',   'advisory',
               'title',  a.title,
               'on',     ae.applied_on,
               'status', case
                           when ae.met_criteria is true  then 'completed'
                           when ae.met_criteria is false then 'not_completed'
                           else ae.application_status::text
                         end)
        from advisory_enrolment ae
        join advisory_session a on a.id = ae.session_id and a.deleted_at is null
       where ae.person_id = v_person.id and ae.deleted_at is null

      union all

      select jsonb_build_object(
               'kind',   'exhibition',
               'title',  e.name,
               'on',     er.created_at::date,
               'status', er.status::text)
        from exhibition_registration er
        join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
       where er.person_id = v_person.id and er.deleted_at is null

      union all

      select jsonb_build_object(
               'kind',   'linkage',
               'title',  lr.initiative_title,
               'on',     lr.requested_on,
               'status', lr.status::text)
        from linkage_request lr
       where lr.person_id = v_person.id and lr.deleted_at is null
    ) s(r);

  return jsonb_build_object('found', true, 'applications', v_rows);
end;
$function$;

comment on function public.my_applications(text, date, text) is
  'What one person applied for, and what happened. Four fields per row: kind, '
  'title, on, status. Never person_id, never a row id, never is_refugee or '
  'has_disability, never anything about anyone else. One constant failure for '
  'a wrong pair and an unknown person, so it cannot answer "is this ID '
  'registered?". Separate from applicant_prefill on purpose -- one function, '
  'one purpose.';

revoke all on function public.my_applications(text, date, text) from public;
grant execute on function public.my_applications(text, date, text) to anon, authenticated;
