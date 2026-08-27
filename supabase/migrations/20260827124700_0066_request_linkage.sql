-- ═══════════════════════════════════════════════════════════════════════════
--  0066 — request_linkage: the public end of SO3
--
--  The third and last public write. Same shape as apply_for_opportunity (0054):
--  security definer, throttled twice, one indistinguishable failure. Differences
--  from that function are all deliberate and each is argued below.
--
--  ── IT NEVER CREATES A PERSON ──
--
--  apply_for_opportunity registers someone the database has never seen, because
--  a training is open to anyone. Linkage is not. It requires a completed
--  advisory, which requires a completed training, which requires an enrolment
--  someone in the Municipality approved. A caller this function has never heard
--  of cannot possibly be eligible.
--
--  So an unknown national ID returns cannot_verify -- the same constant as a
--  wrong date of birth, and for the same reason. If "we do not know you" and
--  "your date of birth is wrong" were distinguishable, this endpoint would
--  answer the question "is this national ID registered?" for anyone who asked.
--
--  It also means the public linkage form cannot bring a new person row into
--  existence. There is no path here that writes to `person` at all.
--
--  ── ELIGIBILITY IS CHECKED TWICE, ON PURPOSE ──
--
--  Explicitly, to return 'ineligible' with a reason someone can act on; and by
--  trg_linkage_request_eligibility (0057), which is what actually enforces it.
--  The explicit check exists only to produce a better sentence. If the two ever
--  disagree the trigger wins, and check_violation is caught below and mapped to
--  the same answer -- so a race between the two cannot produce a row the
--  trigger would have refused, nor a raw Postgres error reaching a browser.
--
--  ── WHY A PERSON MAY HAVE MORE THAN ONE OPEN REQUEST ──
--
--  Nothing here refuses a second request while a first is unmatched. A producer
--  can genuinely need two different things -- a buyer for the tomatoes and a
--  supplier for the seed -- and those are two linkages to two partners, not one
--  request entered twice.
--
--  Double-submission is a different problem and client_uuid already solves it:
--  the same attempt resent after a dropped connection returns already_requested
--  instead of writing again.
--
--  What is left is a producer who forgets and asks twice. That is noise in a
--  queue, not wrong data, and the matching screen shows a person's other open
--  requests so a coordinator can see the two together and close one. Refusing
--  it in SQL would cost the two-ventures case, which is real, to save a
--  coordinator one click.
--
--  ── 'failed' IS NOT 'cannot_verify' ──
--
--  apply_for_opportunity maps an unexpected exception to 'not_open'. That is a
--  small untruth: it tells a visitor the opportunity is closed when in fact
--  something broke. This function returns 'failed' instead, so the page can say
--  "something went wrong, try again" -- which is both true and actionable,
--  where "we could not verify who you are" would send someone off to re-check a
--  national ID that was never the problem.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.request_linkage(
  p_national_id      text,
  p_initiative_title text,
  p_activity_type_id uuid,
  p_request          text,
  p_client_uuid      uuid    default null,
  p_date_of_birth    date    default null,
  p_phone            text    default null,
  p_main_product     text    default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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

  -- Same four conditions as check_linkage_eligibility. If this ever drifts
  -- from the trigger, the trigger is the one that decides.
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id  and p.deleted_at is null
      join advisory_session s on s.id = ae.session_id and s.deleted_at is null
     where ae.person_id = v_person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
  ) then
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
       main_product, status, client_uuid)
    values (v_person_id, current_date, btrim(p_request), btrim(p_initiative_title),
            p_activity_type_id, nullif(btrim(coalesce(p_main_product,'')),''),
            'submitted'::linkage_request_status_t, p_client_uuid);
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
      -- The eligibility trigger, or a constraint. Either way the honest answer
      -- is the one the explicit check above would have given.
      return jsonb_build_object('ok', false, 'result', 'ineligible',
                                'requires', 'completed_advisory');
    when others then
      return jsonb_build_object('ok', false, 'result', 'failed');
  end;

  return jsonb_build_object('ok', true, 'result', 'requested');
end;
$function$;

comment on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) is
  'Public linkage request. Never creates a person: linkage requires a completed '
  'advisory, so an unknown national ID cannot be eligible and returns the same '
  'cannot_verify as a wrong date of birth. Enforcement is '
  'trg_linkage_request_eligibility (0057); the explicit check here only '
  'produces a better message.';

revoke all on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) from public;
grant execute on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) to anon, authenticated;
