-- ═══════════════════════════════════════════════════════════════════════════
--  0120 — the public side knows whose page it is
--
--  Plan §3 (RAMTHA_IMPLEMENTATION_PLAN.md). The public site becomes
--  /sahel-horan and /ramtha, and everything the anonymous visitor can reach
--  answers for ONE municipality:
--
--    v_public_municipality   NEW   the four strings on the poster, per slug
--    v_public_opportunity          + municipality_id, municipality_slug
--    applicant_prefill             + p_municipality_slug
--    my_applications               + p_municipality_slug — history scoped
--    apply_for_opportunity         advisory gate scoped to the opportunity's
--    request_linkage               linkage gate scoped to the page's
--    check_advisory_eligibility    the trigger copy of the same gate
--    check_linkage_eligibility     the trigger copy of the same gate
--
--  ── THE RULE ──
--
--  Identity is shared; history is not. `person` is one table for both
--  programmes (plan Part 0, "one decision already made"), so a Ramtha page
--  may confirm that a national ID and date of birth belong to someone on
--  file. It may never say what that person did in Sahel Horan's programme.
--  That leaks in three places, and each is closed here:
--
--    my_applications      returned every application the person ever made.
--                         It now returns those in the asking municipality.
--    request_linkage      answered `wrong_track` / `ineligible` / `requested`
--                         from advisories in ANY municipality, which told a
--                         Ramtha page whether the person had completed one in
--                         Sahel Horan. The gate now reads the page's
--                         municipality only, so a Ramtha page answers
--                         `ineligible` for everyone until Ramtha runs an
--                         advisory — and it would also have created a Ramtha
--                         linkage request on the strength of a Sahel Horan
--                         advisory, which no indicator on either side counts.
--    apply_for_opportunity's advisory branch required a completed training
--                         in any municipality. It now requires one in the
--                         opportunity's.
--
--  The two triggers are the copies that DECIDE (0057, 0106: "if this ever
--  drifts from the trigger, the trigger is the one that decides"), so both
--  move in the same migration as their RPC copies, as 0106 did.
--
--  ── ONE MORE VIEW THAN THE PLAN'S LETTER ──
--
--  §3.2: "anon still reaches exactly the four public views and the two RPCs.
--  Do not widen the surface." The surface here is five views and four RPCs
--  (the plan's "two" predates my_applications and request_linkage, 0066/0070).
--
--  The fifth view is `v_public_municipality`: slug, code, name and programme
--  line of each ACTIVE municipality — the text printed on the poster, and
--  nothing else. Not the id, not is_active (absence says that), no counts.
--  The alternative was a list of municipalities in the bundle, which is a
--  claim about the database that nothing checks (CLAUDE.md, "a placeholder is
--  a claim"): the public masthead would name a municipality from a locale
--  string while the municipal header names it from the row, and a
--  municipality deactivated in the table would keep a live public page. The
--  widening is one view of two rows of public text; the rule it bends exists
--  to keep PERSONAL data off the open internet, and this carries none.
--  05 §9/§10 and 07 check 5/5a are updated to the allow-list of five.
--
--  ── WHAT DOES NOT CHANGE ──
--
--  Same byte-identical failure response from every RPC ({"found": false} or
--  `cannot_verify`), same throttle, bumped in the same order before anything
--  is looked at. An unknown or inactive slug is answered with that same
--  failure, not with anything that says "no such municipality" — a page that
--  is not live learns nothing. When no slug is given the municipality is
--  Sahel Horan, as 0115 decided for request_linkage: every link that exists
--  today predates Ramtha and is Sahel Horan's.
--
--  apply_for_opportunity keeps 0115's shape — the municipality is the
--  OPPORTUNITY's, and a page for the other municipality is refused as
--  not_open — with the one-line change to the advisory gate.
--
--  Sahel Horan: v_public_opportunity returns the same rows as before, every
--  one now saying sahel-horan; asserted below. No indicator view is touched.
--
--  ── FUNCTION HISTORY (the 0082 check) ──
--
--    applicant_prefill           0052, 0053, 0062         ← body from 0062
--    my_applications             0070, 0071               ← body from 0071
--    apply_for_opportunity       0054, 0057, 0058, 0060, 0115  ← from 0115
--    request_linkage             0066, 0106, 0115         ← body from 0115
--    check_advisory_eligibility  0057                     ← body from 0057
--    check_linkage_eligibility   0057, 0106               ← body from 0106
--
--  The live bodies of the two 0115 functions are checked below for 0115's
--  own marker comment before they are replaced, so this cannot revert a
--  version this file has not seen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. what the public list returns today, kept for the assertion at the end
create temp table t0120 on commit drop as
select count(*)::int as n_rows,
       md5(string_agg(id::text || ':' || opportunity_type, ',' order by id, opportunity_type)) as h
  from public.v_public_opportunity;

do $pre$
begin
  if position('The municipality is the OPPORTUNITY''s. The caller has none.'
              in pg_get_functiondef('public.apply_for_opportunity(uuid, text, text, date, text, text, text, text, uuid, uuid, uuid[], text)'::regprocedure)) = 0 then
    raise exception '0120: apply_for_opportunity is not 0115''s body; read the live definition before replacing it';
  end if;
  if position('The municipality whose page this came from; Sahel Horan when unsaid.'
              in pg_get_functiondef('public.request_linkage(text, text, uuid, text, uuid, date, text, text, text)'::regprocedure)) = 0 then
    raise exception '0120: request_linkage is not 0115''s body; read the live definition before replacing it';
  end if;
end $pre$;

-- ── 1. v_public_municipality ─────────────────────────────────────────────
--
-- Base table only (05 §10). Active municipalities only: an inactive one has
-- no public page, and this view returning no row is how the site learns it.

create view public.v_public_municipality as
select m.slug, m.code, m.name_en, m.name_ar, m.programme_en, m.programme_ar
  from public.municipality m
 where m.is_active and m.deleted_at is null;

grant select on public.v_public_municipality to anon;

comment on view public.v_public_municipality is
  'The public site''s list of municipalities: slug, code, names and programme '
  'line of each ACTIVE municipality. The text on the poster and nothing else '
  '-- no id, no counts, no personal data. Fifth anon view (0120).';

-- ── 2. v_public_opportunity carries its municipality ─────────────────────
--
-- Same three branches as 0049, same four conditions on each (is_published,
-- not is_cancelled, end_date >= today, deleted_at is null), plus an INNER
-- join to the active municipality and two trailing columns. `create or
-- replace` keeps the grants; the anon grant is asserted below anyway.

create or replace view public.v_public_opportunity as
 SELECT ts.id,
    'training'::text AS opportunity_type,
    ts.title,
    ts.description,
    t.label_en AS topic_en,
    t.label_ar AS topic_ar,
    ts.start_date,
    ts.end_date,
    ts.venue AS location,
    ts.focal_point,
    ts.duration_hours,
    ts.application_opens_on,
    ts.application_closes_on,
    (ts.application_opens_on IS NULL OR ts.application_opens_on <= CURRENT_DATE) AND (ts.application_closes_on IS NULL OR ts.application_closes_on >= CURRENT_DATE) AS applications_open,
    ts.planned_seats AS capacity,
        CASE
            WHEN ts.planned_seats IS NULL THEN NULL::integer
            ELSE GREATEST(0, ts.planned_seats - (( SELECT count(*) AS count
               FROM training_enrolment e
              WHERE e.session_id = ts.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t))::integer)
        END AS places_remaining,
        CASE
            WHEN ts.planned_seats IS NULL THEN false
            ELSE (( SELECT count(*) AS count
               FROM training_enrolment e
              WHERE e.session_id = ts.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t)) >= ts.planned_seats
        END AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM training_session ts
     JOIN municipality m ON m.id = ts.municipality_id AND m.is_active AND m.deleted_at IS NULL
     LEFT JOIN ref_training_topic t ON t.id = ts.topic_id
  WHERE ts.is_published AND NOT ts.is_cancelled AND ts.end_date >= CURRENT_DATE AND ts.deleted_at IS NULL
UNION ALL
 SELECT a.id,
    'advisory'::text AS opportunity_type,
    a.title,
    a.description,
    t.label_en AS topic_en,
    t.label_ar AS topic_ar,
    a.start_date,
    a.end_date,
    a.venue AS location,
    a.focal_point,
    a.duration_hours,
    a.application_opens_on,
    a.application_closes_on,
    (a.application_opens_on IS NULL OR a.application_opens_on <= CURRENT_DATE) AND (a.application_closes_on IS NULL OR a.application_closes_on >= CURRENT_DATE) AS applications_open,
    a.planned_seats AS capacity,
        CASE
            WHEN a.planned_seats IS NULL THEN NULL::integer
            ELSE GREATEST(0, a.planned_seats - (( SELECT count(*) AS count
               FROM advisory_enrolment e
              WHERE e.session_id = a.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t))::integer)
        END AS places_remaining,
        CASE
            WHEN a.planned_seats IS NULL THEN false
            ELSE (( SELECT count(*) AS count
               FROM advisory_enrolment e
              WHERE e.session_id = a.id AND e.deleted_at IS NULL AND e.application_status = 'approved'::record_status_t)) >= a.planned_seats
        END AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM advisory_session a
     JOIN municipality m ON m.id = a.municipality_id AND m.is_active AND m.deleted_at IS NULL
     LEFT JOIN ref_training_topic t ON t.id = a.topic_id
  WHERE a.is_published AND NOT a.is_cancelled AND a.end_date >= CURRENT_DATE AND a.deleted_at IS NULL
UNION ALL
 SELECT x.id,
    'exhibition'::text AS opportunity_type,
    x.name AS title,
    x.description,
    NULL::text AS topic_en,
    NULL::text AS topic_ar,
    x.start_date,
    x.end_date,
    x.location,
    x.focal_point,
    NULL::numeric AS duration_hours,
    x.application_opens_on,
    x.application_closes_on,
    (x.application_opens_on IS NULL OR x.application_opens_on <= CURRENT_DATE) AND (x.application_closes_on IS NULL OR x.application_closes_on >= CURRENT_DATE) AS applications_open,
    x.booth_capacity AS capacity,
    GREATEST(0, x.booth_capacity - (( SELECT count(*) AS count
           FROM exhibition_registration r
          WHERE r.exhibition_id = x.id AND r.deleted_at IS NULL AND r.status = 'approved'::record_status_t))::integer) AS places_remaining,
    (( SELECT count(*) AS count
           FROM exhibition_registration r
          WHERE r.exhibition_id = x.id AND r.deleted_at IS NULL AND r.status = 'approved'::record_status_t)) >= x.booth_capacity AS is_full,
    m.id AS municipality_id,
    m.slug AS municipality_slug
   FROM exhibition x
     JOIN municipality m ON m.id = x.municipality_id AND m.is_active AND m.deleted_at IS NULL
  WHERE x.is_published AND NOT x.is_cancelled AND x.end_date >= CURRENT_DATE AND x.deleted_at IS NULL;

comment on view public.v_public_opportunity is
  'Everything the public may apply to, for every active municipality, each '
  'row saying whose it is (municipality_id, municipality_slug -- 0120). '
  'Security definer over base tables only; its WHERE is the whole boundary: '
  'is_published, not is_cancelled, end_date >= today, deleted_at is null, and '
  'the municipality active. The public page filters on the slug.';

-- ── 3. applicant_prefill takes the page's municipality ───────────────────
--
-- Body from 0062. The slug resolves to a municipality or the call answers the
-- same {"found": false} as everything else; nothing it returns is history, so
-- the municipality scopes nothing further today. It is here so that the
-- signature is the one the plan describes and so that a field added later
-- has the municipality to scope on.

drop function public.applicant_prefill(text, date, text);

create function public.applicant_prefill(
  p_national_id        text,
  p_date_of_birth      date default null,
  p_phone              text default null,
  p_municipality_slug  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id      text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone   text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client  text;
  v_ok      boolean;
  v_muni    uuid;
  v_person  person%rowtype;
  c_miss    constant jsonb := jsonb_build_object('found', false);
begin
  v_client := coalesce(
    split_part(
      current_setting('request.headers', true)::json ->> 'x-forwarded-for',
      ',', 1),
    'unknown');

  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);

  if v_id !~ '^\d{9}$' then
    return c_miss;
  end if;

  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5)
          and v_ok;

  if not v_ok then
    return c_miss;
  end if;

  -- The municipality whose page this came from; Sahel Horan when unsaid. A
  -- page that is not live gets the same nothing as a wrong date of birth.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
    return c_miss;
  end if;

  select * into v_person
    from person
   where national_id = v_id
     and deleted_at is null;

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

  return jsonb_build_object(
    'found',     true,
    'full_name', v_person.full_name,
    'sex',       v_person.sex,
    'village',   v_person.village,
    'phone',     v_person.phone
  );
end;
$$;

revoke all on function public.applicant_prefill(text, date, text, text) from public;
grant execute on function public.applicant_prefill(text, date, text, text) to anon, authenticated;

comment on function public.applicant_prefill(text, date, text, text) is
  'Public applicant lookup. Verifies on national ID + date of birth, falling '
  'back to national ID + phone ONLY when the person has no date_of_birth on '
  'file. Never downgrades. Returns a fixed {"found": false} for every failure '
  'mode so it cannot be used as an existence oracle -- including an unknown '
  'or inactive municipality slug (0120). Returns ONLY what the apply form '
  'displays back: full_name, sex, village, phone. Never is_refugee, '
  'has_disability, disability_type_id or person_id -- and no reference-table '
  'uuid the browser cannot render without a new anon grant.';

-- ── 4. my_applications returns the asking municipality's history only ────
--
-- Body from 0071. Each branch now also requires the application to be in the
-- page's municipality. The enrolment's own municipality_id is used (the
-- composite keys of 0113 make it agree with its session's).

drop function public.my_applications(text, date, text);

create function public.my_applications(
  p_national_id        text,
  p_date_of_birth      date default null,
  p_phone              text default null,
  p_municipality_slug  text default null
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
  v_muni   uuid;
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

  -- The municipality whose page this came from; Sahel Horan when unsaid.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
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
  -- removed, must not appear here saying "approved". And every branch is the
  -- asking municipality's: identity is shared, history is not (0120).
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
         and te.municipality_id = v_muni

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
         and ae.municipality_id = v_muni

      union all

      select jsonb_build_object(
               'kind',   'exhibition',
               'title',  e.name,
               'on',     e.start_date,
               'status', er.status::text)
        from exhibition_registration er
        join exhibition e on e.id = er.exhibition_id and e.deleted_at is null
       where er.person_id = v_person.id and er.deleted_at is null
         and er.municipality_id = v_muni

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
         and lr.municipality_id = v_muni
    ) s(r);

  return jsonb_build_object('found', true, 'applications', v_rows);
end;
$function$;

revoke all on function public.my_applications(text, date, text, text) from public;
grant execute on function public.my_applications(text, date, text, text) to anon, authenticated;

comment on function public.my_applications(text, date, text, text) is
  'What one person applied for IN THE ASKING MUNICIPALITY, and what happened. '
  'Four fields per row: kind, title, on, status. `on` is the date of the THING '
  '-- the session, the market -- not of the application (0071). Identity is '
  'shared between municipalities; history is not (0120): a Ramtha page never '
  'lists a Sahel Horan enrolment. Never person_id, never a row id, never '
  'is_refugee or has_disability, never anything about anyone else. One '
  'constant failure for a wrong pair, an unknown person and an unknown slug.';

-- ── 5. apply_for_opportunity: the advisory gate is the opportunity's ─────
--
-- Body from 0115, one change: the completed training must be in the
-- opportunity's municipality (v_muni, resolved just above the gate).

create or replace function public.apply_for_opportunity(
  p_opportunity_id uuid, p_opportunity_type text, p_national_id text,
  p_date_of_birth date default null, p_phone text default null,
  p_full_name text default null, p_sex text default null, p_village text default null,
  p_producer_type_id uuid default null, p_client_uuid uuid default null,
  p_product_ids uuid[] default null,
  p_municipality_slug text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_id       text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone    text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client   text;
  v_ok       boolean;
  v_person   person%rowtype;
  v_person_id uuid;
  v_reg_id   uuid;
  v_open     boolean;
  v_cap      int;
  v_taken    int;
  v_exists   boolean;
  v_withdrawn boolean;
  v_muni     uuid;
  c_fail     constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  if p_opportunity_type not in ('training', 'advisory', 'exhibition') then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  v_client := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown');

  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;
  if not v_ok then
    return c_fail;
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;

  if found then
    if v_person.date_of_birth is not null then
      if p_date_of_birth is null or v_person.date_of_birth <> p_date_of_birth then
        return c_fail;
      end if;
    else
      if length(v_phone) < 9
         or right(regexp_replace(coalesce(v_person.phone,''), '\D','','g'), 9) <> v_phone then
        return c_fail;
      end if;
    end if;
    v_person_id := v_person.id;
  else
    if coalesce(btrim(p_full_name), '') = '' or p_date_of_birth is null then
      return c_fail;
    end if;
    if p_date_of_birth > current_date or p_date_of_birth < current_date - interval '120 years' then
      return c_fail;
    end if;

    insert into person (national_id, full_name, date_of_birth, sex, village, phone)
    values (v_id, btrim(p_full_name), p_date_of_birth,
            nullif(p_sex,'')::sex_t, nullif(btrim(coalesce(p_village,'')),''),
            nullif(btrim(coalesce(p_phone,'')),''))
    on conflict (national_id) do nothing
    returning id into v_person_id;

    if v_person_id is null then
      return c_fail;
    end if;
  end if;

  -- The municipality is the OPPORTUNITY's. The caller has none.
  if p_opportunity_type = 'training' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats, municipality_id
      into v_open, v_cap, v_muni
      from training_session where id = p_opportunity_id and deleted_at is null;
  elsif p_opportunity_type = 'advisory' then
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           planned_seats, municipality_id
      into v_open, v_cap, v_muni
      from advisory_session where id = p_opportunity_id and deleted_at is null;
  else
    select (is_published and not is_cancelled and end_date >= current_date
            and (application_opens_on  is null or application_opens_on  <= current_date)
            and (application_closes_on is null or application_closes_on >= current_date)),
           booth_capacity, municipality_id
      into v_open, v_cap, v_muni
      from exhibition where id = p_opportunity_id and deleted_at is null;
  end if;

  if v_open is null or not v_open then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- A page for one municipality may not apply to the other's opportunity.
  -- Same answer as an unpublished one: a wrong page learns nothing.
  if p_municipality_slug is not null and not exists (
       select 1 from municipality mu
        where mu.id = v_muni and mu.slug = p_municipality_slug
          and mu.is_active and mu.deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'not_open');
  end if;

  -- The same question check_advisory_eligibility asks: a completed training
  -- IN THIS MUNICIPALITY (0120). The trigger is the one that decides.
  if p_opportunity_type = 'advisory' then
    if not exists (
      select 1
        from training_enrolment te
        join person pp           on pp.id = te.person_id  and pp.deleted_at is null
        join training_session ts on ts.id = te.session_id and ts.deleted_at is null
       where te.person_id = v_person_id
         and te.met_criteria is true
         and te.deleted_at is null
         and ts.municipality_id = v_muni
    ) then
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_training');
    end if;
  end if;

  -- A LIVE application only. A withdrawn one is not an application.
  if p_opportunity_type = 'training' then
    select exists (select 1 from training_enrolment
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and session_id = p_opportunity_id)))
      into v_exists;
  elsif p_opportunity_type = 'advisory' then
    select exists (select 1 from advisory_enrolment
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and session_id = p_opportunity_id)))
      into v_exists;
  else
    select exists (select 1 from exhibition_registration
                    where deleted_at is null
                      and ((p_client_uuid is not null and client_uuid = p_client_uuid)
                           or (person_id = v_person_id and exhibition_id = p_opportunity_id)))
      into v_exists;
  end if;

  if v_exists then
    return jsonb_build_object('ok', true, 'result', 'already_applied');
  end if;

  if v_cap is not null then
    if p_opportunity_type = 'training' then
      select count(*) into v_taken from training_enrolment
       where session_id = p_opportunity_id and deleted_at is null
         and application_status = 'approved'::record_status_t;
    elsif p_opportunity_type = 'advisory' then
      select count(*) into v_taken from advisory_enrolment
       where session_id = p_opportunity_id and deleted_at is null
         and application_status = 'approved'::record_status_t;
    else
      select count(*) into v_taken from exhibition_registration
       where exhibition_id = p_opportunity_id and deleted_at is null
         and status = 'approved'::record_status_t;
    end if;
    if v_taken >= v_cap then
      return jsonb_build_object('ok', false, 'result', 'full');
    end if;
  end if;

  begin
    if p_opportunity_type = 'training' then
      insert into training_enrolment
        (person_id, session_id, application_status, applied_on, client_uuid,
         submitted_by_participant, municipality_id)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true, v_muni);
    elsif p_opportunity_type = 'advisory' then
      insert into advisory_enrolment
        (person_id, session_id, application_status, applied_on, client_uuid,
         submitted_by_participant, municipality_id)
      values (v_person_id, p_opportunity_id, 'submitted'::record_status_t,
              current_date, p_client_uuid, true, v_muni);
    else
      if p_producer_type_id is null then
        return c_fail;
      end if;
      insert into exhibition_registration
        (exhibition_id, person_id, producer_type_id, is_first_time, status,
         submitted_by_participant, client_uuid, municipality_id)
      values (p_opportunity_id, v_person_id, p_producer_type_id, null,
              'submitted'::record_status_t, true, p_client_uuid, v_muni)
      returning id into v_reg_id;

      if p_product_ids is not null and array_length(p_product_ids, 1) > 0 then
        insert into exhibition_registration_product (registration_id, product_id, municipality_id)
        select v_reg_id, rp.id, v_muni
          from ref_product rp
         where rp.id = any(p_product_ids)
           and rp.is_active
           and rp.deleted_at is null
        on conflict do nothing;
      end if;
    end if;
  exception
    when unique_violation then
      -- LOOK, do not infer. See 0060's header.
      if p_opportunity_type = 'training' then
        select exists (select 1 from training_enrolment
                        where person_id = v_person_id and session_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from training_enrolment
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      elsif p_opportunity_type = 'advisory' then
        select exists (select 1 from advisory_enrolment
                        where person_id = v_person_id and session_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from advisory_enrolment
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      else
        select exists (select 1 from exhibition_registration
                        where person_id = v_person_id and exhibition_id = p_opportunity_id
                          and deleted_at is null),
               exists (select 1 from exhibition_registration
                        where p_client_uuid is not null and client_uuid = p_client_uuid
                          and deleted_at is not null)
          into v_exists, v_withdrawn;
      end if;

      if v_exists then
        return jsonb_build_object('ok', true, 'result', 'already_applied');
      elsif v_withdrawn then
        return jsonb_build_object('ok', false, 'result', 'withdrawn');
      else
        return c_fail;
      end if;
    when others then
      return jsonb_build_object('ok', false, 'result', 'not_open');
  end;

  return jsonb_build_object('ok', true, 'result', 'applied');
end;
$function$;

-- ── 6. request_linkage: the linkage gate is the page's municipality ──────
--
-- Body from 0115, two changes: both eligibility queries require the advisory
-- session to be in v_muni, which is resolved before the person is looked up.

create or replace function public.request_linkage(
  p_national_id text, p_initiative_title text, p_activity_type_id uuid, p_request text,
  p_client_uuid uuid default null, p_date_of_birth date default null, p_phone text default null,
  p_main_product text default null,
  p_municipality_slug text default null)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $function$
declare
  v_id        text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_phone     text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  v_client    text;
  v_ok        boolean;
  v_person    person%rowtype;
  v_person_id uuid;
  v_exists    boolean;
  v_withdrawn boolean;
  v_any_advisory boolean;
  v_muni      uuid;
  c_fail      constant jsonb := jsonb_build_object('ok', false, 'result', 'cannot_verify');
begin
  v_client := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown');

  -- Both counters are bumped before either is tested, so the number of
  -- attempts costs the same whatever the answer turns out to be.
  v_ok := bump_lookup_throttle('client', v_client, interval '10 minutes', 20);
  if v_id !~ '^\d{9}$' then
    return c_fail;
  end if;
  v_ok := bump_lookup_throttle('identifier', v_id, interval '10 minutes', 5) and v_ok;
  if not v_ok then
    return c_fail;
  end if;

  if coalesce(btrim(p_initiative_title), '') = ''
     or coalesce(btrim(p_request), '') = ''
     or p_activity_type_id is null then
    return c_fail;
  end if;

  if not exists (select 1 from ref_activity_type
                  where id = p_activity_type_id and is_active and deleted_at is null) then
    return c_fail;
  end if;

  -- The municipality whose page this came from; Sahel Horan when unsaid.
  select mu.id into v_muni from municipality mu
   where mu.slug = coalesce(p_municipality_slug, 'sahel-horan')
     and mu.is_active and mu.deleted_at is null;
  if v_muni is null then
    return jsonb_build_object('ok', false, 'result', 'failed');
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;
  if not found then
    return c_fail;
  end if;

  if v_person.date_of_birth is not null then
    if p_date_of_birth is null or v_person.date_of_birth <> p_date_of_birth then
      return c_fail;
    end if;
  else
    if length(v_phone) < 9
       or right(regexp_replace(coalesce(v_person.phone,''), '\D','','g'), 9) <> v_phone then
      return c_fail;
    end if;
  end if;
  v_person_id := v_person.id;

  -- The same question check_linkage_eligibility asks, including the track,
  -- and only about THIS municipality's advisories (0120): a Ramtha page must
  -- not learn from the answer whether the person completed one in Sahel
  -- Horan. If this ever drifts from the trigger, the trigger is the one that
  -- decides.
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id  and p.deleted_at is null
      join advisory_session s on s.id = ae.session_id and s.deleted_at is null
     where ae.person_id = v_person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
       and s.municipality_id = v_muni
  ) then
    -- Which refusal? A home-based completer is not missing a record, and must
    -- not be told they are.
    select exists (
      select 1
        from advisory_enrolment ae
        join person p           on p.id = ae.person_id  and p.deleted_at is null
        join advisory_session s on s.id = ae.session_id and s.deleted_at is null
       where ae.person_id = v_person_id
         and ae.met_criteria is true
         and ae.deleted_at is null
         and s.municipality_id = v_muni
    ) into v_any_advisory;

    if v_any_advisory then
      return jsonb_build_object('ok', false, 'result', 'wrong_track',
                                'requires', 'market_track');
    end if;
    return jsonb_build_object('ok', false, 'result', 'ineligible',
                              'requires', 'completed_advisory');
  end if;

  if p_client_uuid is not null then
    select exists (select 1 from linkage_request
                    where client_uuid = p_client_uuid and deleted_at is null)
      into v_exists;
    if v_exists then
      return jsonb_build_object('ok', true, 'result', 'already_requested');
    end if;
  end if;

  begin
    insert into linkage_request
      (person_id, requested_on, request, initiative_title, activity_type_id,
       main_product, status, client_uuid, municipality_id)
    values (v_person_id, current_date, btrim(p_request), btrim(p_initiative_title),
            p_activity_type_id, nullif(btrim(coalesce(p_main_product,'')),''),
            'submitted'::linkage_request_status_t, p_client_uuid, v_muni);
  exception
    when unique_violation then
      -- LOOK, do not infer. client_uuid is globally unique and stays that way:
      -- a resync must not be able to resurrect a request the Municipality
      -- withdrew. So a collision means either a live row or a withdrawn one,
      -- and telling them apart requires reading.
      select exists (select 1 from linkage_request
                      where client_uuid = p_client_uuid and deleted_at is null),
             exists (select 1 from linkage_request
                      where client_uuid = p_client_uuid and deleted_at is not null)
        into v_exists, v_withdrawn;
      if v_exists then
        return jsonb_build_object('ok', true, 'result', 'already_requested');
      elsif v_withdrawn then
        return jsonb_build_object('ok', false, 'result', 'withdrawn');
      else
        return jsonb_build_object('ok', false, 'result', 'failed');
      end if;
    when check_violation then
      -- The eligibility trigger, or a constraint. The explicit check above has
      -- already returned for both track cases, so reaching here means the two
      -- disagreed -- report the trigger's answer, which is the one that decides.
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_advisory');
    when others then
      return jsonb_build_object('ok', false, 'result', 'failed');
  end;

  return jsonb_build_object('ok', true, 'result', 'requested');
end;
$function$;

-- ── 7. the two triggers, the copies that decide ──────────────────────────
--
-- check_advisory_eligibility: body from 0057, scoped to the SESSION's
-- municipality (read from the session row, not from NEW, so the check does
-- not depend on when a column default is filled in). An unknown session is
-- left to the foreign key, which is the error that names it.

create or replace function public.check_advisory_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_muni uuid;
begin
  select s.municipality_id into v_muni
    from advisory_session s where s.id = new.session_id;
  if v_muni is null then
    return new;
  end if;

  if not exists (
    select 1
      from training_enrolment te
      join person p          on p.id  = te.person_id     and p.deleted_at  is null
      join training_session ts on ts.id = te.session_id  and ts.deleted_at is null
     where te.person_id = new.person_id
       and te.met_criteria is true
       and te.deleted_at is null
       and ts.municipality_id = v_muni
  ) then
    raise exception
      'advisory requires a completed training: person % has none on record in this municipality',
      new.person_id
      using errcode = 'check_violation',
            hint = 'Record the completed training first. met_criteria must be true, '
                   'neither the enrolment nor its session may be deleted, and the '
                   'training must be this municipality''s.';
  end if;
  return new;
end $$;

comment on function public.check_advisory_eligibility() is
  'The SO2 gate. Same four conditions as v_ind_a1_3 so the gate and the '
  'indicator cannot disagree about the word "completed", and since 0120 the '
  'training must be in the advisory session''s municipality. Checked at '
  'insert only -- a later soft delete does not revoke a place already granted.';

revoke all on function public.check_advisory_eligibility() from public, anon, authenticated;

-- check_linkage_eligibility: body from 0106, scoped to the REQUEST's
-- municipality. linkage_request has no parent session, so NEW's own column is
-- the only source; a null one is left to NOT NULL.

create or replace function public.check_linkage_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_other_track boolean;
begin
  if new.municipality_id is null then
    return new;
  end if;

  if exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id     and p.deleted_at  is null
      join advisory_session s on s.id = ae.session_id    and s.deleted_at  is null
     where ae.person_id = new.person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
       and s.municipality_id = new.municipality_id
  ) then
    return new;
  end if;

  -- Refused. Now find out WHICH refusal it is, because the two send the person
  -- to different places: one to apply for a market advisory, the other to the
  -- Municipality to explain that the one they completed was the wrong kind.
  select exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id     and p.deleted_at  is null
      join advisory_session s on s.id = ae.session_id    and s.deleted_at  is null
     where ae.person_id = new.person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.municipality_id = new.municipality_id
  ) into v_other_track;

  if v_other_track then
    raise exception
      'market linkage requires a MARKET advisory: person % has completed only a home-based advisory',
      new.person_id
      using errcode = 'check_violation',
            hint = 'A home-based advisory covers food safety, licensing and packaging. '
                   'Market linkage needs the market track — pricing, buyers and market access.';
  end if;

  raise exception
    'market linkage requires a completed market advisory: person % has none on record in this municipality',
    new.person_id
    using errcode = 'check_violation',
          hint = 'The producer must complete an advisory session on the MARKET track first.';
end $$;

comment on function public.check_linkage_eligibility() is
  'The SO2 linkage gate. Requires a completed advisory whose session is on the '
  'market track (0105/0106) and in the request''s own municipality (0120) -- '
  'not any advisory anywhere. Names which of the two refusals it is, because '
  'a home-based completer has done real work and must not be told their '
  'record is missing. Checked at insert only.';

revoke all on function public.check_linkage_eligibility() from public, anon, authenticated;

-- ── verification ──────────────────────────────────────────────────────────
--
-- As `anon` where anon is the caller, in a savepoint that is discarded (the
-- throttle rows the probes bump go with it). The people used are whoever
-- completed a market advisory in Sahel Horan and whoever completed a training
-- there; nothing about them is printed. The identifier throttle allows five
-- calls per national ID per ten minutes, so each person is used for at most
-- five, and the advisory probe prefers a second person.

do $verify$
declare
  v_before   record;
  v_n        int;
  v_h        text;
  v_res      jsonb;
  v_p        person%rowtype;
  v_t        person%rowtype;
  v_shm      uuid;
  v_rmth     uuid;
  v_topic    uuid;
  v_act      uuid;
  v_session  uuid;
  v_expected int;
  v_ok       boolean;
begin
  select * into v_before from t0120;
  select mu.id into v_shm  from public.municipality mu where mu.slug = 'sahel-horan';
  select mu.id into v_rmth from public.municipality mu where mu.slug = 'ramtha';
  if v_shm is null or v_rmth is null then
    raise exception '0120: expected both municipality slugs';
  end if;

  -- 1. Sahel Horan's public list is the same set of rows, every one now saying so
  select count(*)::int,
         md5(string_agg(id::text || ':' || opportunity_type, ',' order by id, opportunity_type))
    into v_n, v_h
    from public.v_public_opportunity;
  if v_n <> v_before.n_rows or v_h is distinct from v_before.h then
    raise exception '0120: v_public_opportunity changed for Sahel Horan: % rows before, % after', v_before.n_rows, v_n;
  end if;
  if exists (select 1 from public.v_public_opportunity
              where municipality_slug is distinct from 'sahel-horan' or municipality_id is distinct from v_shm) then
    raise exception '0120: a public opportunity row is not Sahel Horan''s';
  end if;

  -- 2. the anon surface is five views and four RPCs, no more
  if (select count(*) from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public') <> 5
     or exists (select 1 from information_schema.role_table_grants
                 where grantee = 'anon' and table_schema = 'public'
                   and (privilege_type <> 'SELECT' or table_name not in
                        ('v_public_opportunity','v_public_activity_type','v_public_producer_type',
                         'v_public_product','v_public_municipality'))) then
    raise exception '0120: anon table grants are not the five public views';
  end if;
  if (select count(distinct routine_name) from information_schema.role_routine_grants
       where grantee = 'anon' and specific_schema = 'public') <> 4
     or exists (select 1 from information_schema.role_routine_grants
                 where grantee = 'anon' and specific_schema = 'public'
                   and routine_name not in ('applicant_prefill','apply_for_opportunity',
                                            'my_applications','request_linkage')) then
    raise exception '0120: anon routine grants are not the four public RPCs';
  end if;
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname in ('applicant_prefill','my_applications')) <> 2 then
    raise exception '0120: an old overload of applicant_prefill or my_applications survived';
  end if;

  -- the person who completed a market advisory in Sahel Horan; skip the
  -- person-level probes if the data has none (it has one today)
  select p.* into v_p
    from public.person p
    join public.advisory_enrolment ae on ae.person_id = p.id and ae.met_criteria and ae.deleted_at is null
    join public.advisory_session s on s.id = ae.session_id and s.deleted_at is null
   where p.deleted_at is null and s.track = 'market' and s.municipality_id = v_shm
     and (p.date_of_birth is not null or p.phone is not null)
   order by p.created_at limit 1;

  select id into v_topic from public.ref_training_topic where deleted_at is null order by sort_order, code limit 1;
  -- read as the owner: anon has no grant on the ref table, and the probe's
  -- arguments are evaluated as the caller
  select id into v_act from public.ref_activity_type where is_active and deleted_at is null order by sort_order, code limit 1;

  begin
    set local role anon;

    -- 3. the five views answer anon
    perform 1 from public.v_public_municipality;
    if (select count(*) from public.v_public_municipality) <> 2
       or (select string_agg(slug, ',' order by slug) from public.v_public_municipality) <> 'ramtha,sahel-horan' then
      raise exception '0120: v_public_municipality does not list the two active municipalities';
    end if;
    perform 1 from public.v_public_opportunity;

    -- 4. an unknown slug is the ordinary miss, for both lookups
    v_res := public.applicant_prefill(p_national_id => '000000000', p_municipality_slug => 'nowhere');
    if v_res <> jsonb_build_object('found', false) then
      raise exception '0120: applicant_prefill answered % for an unknown slug', v_res;
    end if;
    v_res := public.my_applications(p_national_id => '000000000', p_municipality_slug => 'nowhere');
    if v_res <> jsonb_build_object('found', false) then
      raise exception '0120: my_applications answered % for an unknown slug', v_res;
    end if;

    if v_p.id is not null then
      -- 5. identity is shared: the Ramtha page confirms who they are ...
      v_res := public.applicant_prefill(p_national_id => v_p.national_id,
                                        p_date_of_birth => v_p.date_of_birth, p_phone => v_p.phone,
                                        p_municipality_slug => 'ramtha');
      if (v_res->>'found')::boolean is not true then
        raise exception '0120: applicant_prefill on the Ramtha page did not find a person on file';
      end if;

      -- 6. ... history is not: no applications in Ramtha, all of them in Sahel Horan
      v_res := public.my_applications(p_national_id => v_p.national_id,
                                      p_date_of_birth => v_p.date_of_birth, p_phone => v_p.phone,
                                      p_municipality_slug => 'ramtha');
      if (v_res->>'found')::boolean is not true or v_res->'applications' <> '[]'::jsonb then
        raise exception '0120: the Ramtha page listed Sahel Horan history: %', v_res;
      end if;

      reset role;
      select ((select count(*) from public.training_enrolment te join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null
                where te.person_id = v_p.id and te.deleted_at is null and te.municipality_id = v_shm)
            + (select count(*) from public.advisory_enrolment ae join public.advisory_session a on a.id = ae.session_id and a.deleted_at is null
                where ae.person_id = v_p.id and ae.deleted_at is null and ae.municipality_id = v_shm)
            + (select count(*) from public.exhibition_registration er join public.exhibition e on e.id = er.exhibition_id and e.deleted_at is null
                where er.person_id = v_p.id and er.deleted_at is null and er.municipality_id = v_shm)
            + (select count(*) from public.linkage_request lr
                where lr.person_id = v_p.id and lr.deleted_at is null and lr.municipality_id = v_shm))::int
        into v_expected;
      set local role anon;
      v_res := public.my_applications(p_national_id => v_p.national_id,
                                      p_date_of_birth => v_p.date_of_birth, p_phone => v_p.phone,
                                      p_municipality_slug => 'sahel-horan');
      if jsonb_array_length(v_res->'applications') <> v_expected then
        raise exception '0120: the Sahel Horan page listed % applications, expected %', jsonb_array_length(v_res->'applications'), v_expected;
      end if;
      -- 7. the linkage gate on the Ramtha page: ineligible, not wrong_track,
      --    not requested -- the Sahel Horan advisory is invisible to it
      v_res := public.request_linkage(p_national_id => v_p.national_id, p_initiative_title => '0120 probe',
                                      p_activity_type_id => v_act,
                                      p_request => '0120 probe', p_date_of_birth => v_p.date_of_birth, p_phone => v_p.phone,
                                      p_municipality_slug => 'ramtha');
      if v_res->>'result' <> 'ineligible' or v_res->>'requires' <> 'completed_advisory' then
        raise exception '0120: the Ramtha linkage page answered % for a Sahel Horan market completer', v_res;
      end if;
      -- and on their own municipality's page the gate still opens
      v_res := public.request_linkage(p_national_id => v_p.national_id, p_initiative_title => '0120 probe',
                                      p_activity_type_id => v_act,
                                      p_request => '0120 probe', p_date_of_birth => v_p.date_of_birth, p_phone => v_p.phone,
                                      p_municipality_slug => 'sahel-horan');
      if v_res->>'result' not in ('requested', 'already_requested') then
        raise exception '0120: the Sahel Horan linkage page answered % for a market completer', v_res;
      end if;

      -- 8. the trigger copy: a Ramtha linkage request for the same person is refused
      reset role;
      v_ok := false;
      begin
        insert into public.linkage_request
          (person_id, requested_on, request, initiative_title, activity_type_id, status, municipality_id)
        values (v_p.id, current_date, '0120 probe', '0120 probe',
                v_act,
                'submitted', v_rmth);
      exception
        when check_violation then v_ok := true;
      end;
      if not v_ok then
        raise exception '0120: check_linkage_eligibility accepted a Ramtha request on a Sahel Horan advisory';
      end if;

      -- 9. the advisory gate: a Ramtha advisory session, open today, and the
      --    Sahel-Horan-trained person applying to it -- refused by the RPC as
      --    ineligible, and by the trigger when inserted directly
      if v_topic is not null then
        insert into public.advisory_session
          (title, topic_id, start_date, end_date, track, is_published, municipality_id)
        values ('0120 probe', v_topic, current_date + 7, current_date + 7, 'market', true, v_rmth)
        returning id into v_session;

        select p.* into v_t
          from public.person p
          join public.training_enrolment te on te.person_id = p.id and te.met_criteria and te.deleted_at is null
          join public.training_session ts on ts.id = te.session_id and ts.deleted_at is null and ts.municipality_id = v_shm
         where p.deleted_at is null and (p.date_of_birth is not null or p.phone is not null)
         order by (p.id = v_p.id), p.created_at limit 1;

        if v_t.id is not null then
          -- the RPC copy, only with a person whose five calls are still unspent
          if v_t.id <> v_p.id then
            set local role anon;
            v_res := public.apply_for_opportunity(
              p_opportunity_id => v_session, p_opportunity_type => 'advisory',
              p_national_id => v_t.national_id, p_date_of_birth => v_t.date_of_birth, p_phone => v_t.phone,
              p_municipality_slug => 'ramtha');
            reset role;
            if v_res->>'result' <> 'ineligible' then
              raise exception '0120: a Ramtha advisory accepted a Sahel Horan training as eligibility: %', v_res;
            end if;
          end if;

          -- the trigger copy, which does not touch the throttle
          v_ok := false;
          begin
            insert into public.advisory_enrolment (person_id, session_id, application_status, municipality_id)
            values (v_t.id, v_session, 'submitted', v_rmth);
          exception
            when check_violation then v_ok := true;
          end;
          if not v_ok then
            raise exception '0120: check_advisory_eligibility accepted a Sahel Horan training for a Ramtha advisory';
          end if;

        end if;

        -- while it exists, the Ramtha public list has it and Sahel Horan's does not
        set local role anon;
        if (select count(*) from public.v_public_opportunity where municipality_slug = 'ramtha') <> 1
           or (select count(*) from public.v_public_opportunity where municipality_slug = 'sahel-horan') <> v_before.n_rows then
          raise exception '0120: the public list did not separate the two municipalities';
        end if;
        reset role;

        -- and the other direction: the same session moved to Sahel Horan, the
        -- same person is let through, so the scoping did not close the gate
        -- on its own municipality (one direction alone passes against a gate
        -- that refuses everyone)
        if v_t.id is not null then
          update public.advisory_session set municipality_id = v_shm where id = v_session;
          insert into public.advisory_enrolment (person_id, session_id, application_status, municipality_id)
          values (v_t.id, v_session, 'submitted', v_shm);
        end if;
      end if;
    end if;

    raise exception using errcode = 'P0120', message = 'rollback the probe';
  exception
    when sqlstate 'P0120' then
      null;  -- the probe rows, and the throttle bumps, are gone with the savepoint
  end;

  -- 10. nothing the probe made survived
  if exists (select 1 from public.advisory_session where title = '0120 probe')
     or exists (select 1 from public.linkage_request where initiative_title = '0120 probe') then
    raise exception '0120: probe rows survived the rollback';
  end if;
end $verify$;
