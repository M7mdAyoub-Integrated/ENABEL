-- ═══════════════════════════════════════════════════════════════════════════
--  0071 — my_applications returns the date of the THING, not of the application
--
--  ── THE DEFECT ──
--
--  0070 returned `applied_on` for training and advisory rows. That column is
--  only set by apply_for_opportunity -- an enrolment a coordinator typed in has
--  no applied_on, and every one of the seeded records has it null. Run as anon
--  against a real person, three of four rows came back:
--
--    {"on": null, "kind": "training", "title": "Food Processing I", ...}
--
--  "When" is one of the three things this payload exists to carry, and it was
--  empty for exactly the records a participant is most likely to be looking
--  for: the trainings they actually attended.
--
--  ── WHAT IT RETURNS NOW, AND WHY THAT AND NOT applied_on ──
--
--  The date of the thing itself: the session's start date, the market's start
--  date, and for a linkage request the date it was asked for, because a linkage
--  request has no event until it is matched.
--
--  This is the date a person recognises. Nobody remembers the day they filled
--  in a form; they remember the training in August and the market in September.
--  `applied_on` also could not be shown consistently -- it exists for public
--  applications and not for staff-entered ones, so a list would have carried
--  two different meanings under one heading, with the difference invisible.
--
--  Deliberately NOT returning both. Two dates per row is not a minimal payload,
--  and it would raise a question ("why do these differ?") that the page has no
--  room to answer.
--
--  Nothing else about the function changes: same identity check, same single
--  failure constant, same four fields.
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
  -- points at. A withdrawn application, or one against a session that was
  -- removed, must not appear here saying "approved".
  select coalesce(jsonb_agg(r order by r->>'on' desc), '[]'::jsonb)
    into v_rows
    from (
      select jsonb_build_object(
               'kind',   'training',
               'title',  ts.title,
               'on',     ts.start_date,
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
               'on',     a.start_date,
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
               'on',     e.start_date,
               'status', er.status::text)
        from exhibition_registration er
        join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
       where er.person_id = v_person.id and er.deleted_at is null

      union all

      -- A linkage request has no event to date until it is matched, so this is
      -- the day it was asked for. It is the only branch where that is true.
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
  'title, on, status. `on` is the date of the THING -- the session, the market '
  '-- not of the application: applied_on is null for staff-entered records, so '
  'it produced empty dates on exactly the rows people look for (0071). Never '
  'person_id, never a row id, never is_refugee or has_disability, never '
  'anything about anyone else. One constant failure for a wrong pair and an '
  'unknown person.';
