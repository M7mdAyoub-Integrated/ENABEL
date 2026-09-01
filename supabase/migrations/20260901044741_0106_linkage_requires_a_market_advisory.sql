-- 0106 linkage requires a MARKET advisory, not any advisory
--
-- ── THE MESSAGE WAS ALREADY RIGHT. THE CHECK NEVER WAS. ──
--
-- `check_linkage_eligibility` (0057) accepts any completed advisory_enrolment.
-- Its own hint has always read:
--
--     'The producer must complete a market advisory session first.'
--
-- and so does every line of public copy around it — `linkage.whoCanAsk`,
-- `linkage.intro`, `home.linkageCta`, and the refusal title itself, *"A market
-- advisory session comes first"*. The whole product states the market rule and
-- nothing enforced it, because until `0105` there was no track to enforce it
-- on. This is CLAUDE.md's "a comment that asserts will eventually lie", except
-- the reader was a producer rather than a developer.
--
-- ── BOTH COPIES, IN ONE MIGRATION ──
--
-- The rule lives in two places on purpose (0057, 0066): the TRIGGER decides,
-- and `request_linkage` asks the same question first so the public form can
-- return a readable `ineligible` instead of a swallowed exception. 0066 wrote
-- that down — *"If this ever drifts from the trigger, the trigger is the one
-- that decides"* — which is an admission that they can drift. Narrowing one
-- without the other is exactly that drift, so both move here, together.
--
-- ── A REFUSAL MUST NOT BE DRESSED AS AN ABSENCE ──
--
-- 05 §13: `match_linkage_request` once told a coordinator a request "no longer
-- exists" when they simply were not allowed to touch it, and they went looking
-- for a bug instead of a coordinator. The same trap is here in a worse place.
--
-- A producer who completed a HOME-BASED advisory and is refused by a message
-- saying "our records do not show a completed advisory" will conclude the
-- Municipality lost their record. They did the work; it was the wrong track.
-- So the two cases are told apart and named:
--
--     no advisory at all      -> 'ineligible'  requires completed_advisory
--     home-based advisory only -> 'wrong_track' requires market_track
--
-- ── WHAT DOES NOT CHANGE ──
--
-- Eligibility is still checked at INSERT only and never re-evaluated — 0057's
-- asymmetry, deliberate, and the reason nobody loses a place they already hold.
-- Nothing here revokes anything: the gate is on `linkage_request`, and there
-- are no linkage requests and no completed advisories on file today.
--
-- `create_direct_linkage` (0073) is untouched and still checks no prerequisite.
-- That gate is about who may ASK; a linkage the Municipality brokered in person
-- is a record of something that happened, and refusing to record it because the
-- paperwork ran the other way would lose real programme activity.

create or replace function public.check_linkage_eligibility()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_other_track boolean;
begin
  if exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id     and p.deleted_at  is null
      join advisory_session s on s.id = ae.session_id    and s.deleted_at  is null
     where ae.person_id = new.person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
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
    'market linkage requires a completed market advisory: person % has none on record',
    new.person_id
    using errcode = 'check_violation',
          hint = 'The producer must complete an advisory session on the MARKET track first.';
end $$;

comment on function public.check_linkage_eligibility() is
  'The SO2 linkage gate. Requires a completed advisory whose session is on the '
  'market track (0105/0106) -- not any advisory. Names which of the two '
  'refusals it is, because a home-based completer has done real work and must '
  'not be told their record is missing. Checked at insert only.';

-- Section 11: trigger functions are granted to nobody. `create or replace`
-- preserves the existing ACL, so this is belt and braces rather than a change.
revoke all on function public.check_linkage_eligibility() from public, anon, authenticated;

-- ── the public form's copy of the same question ─────────────────────────────
--
-- Taken from the LIVE definition (pg_get_functiondef), not from 0066's text, so
-- nothing applied since can be silently reverted -- CLAUDE.md's eighth failure.
-- `grep -l "function public.request_linkage" supabase/migrations/*.sql` returns
-- 0066 alone, and the live body matched it; the text below differs from that
-- body in the eligibility block and the check_violation handler, and nowhere
-- else.
create or replace function public.request_linkage(
  p_national_id text,
  p_initiative_title text,
  p_activity_type_id uuid,
  p_request text,
  p_client_uuid uuid default null::uuid,
  p_date_of_birth date default null::date,
  p_phone text default null::text,
  p_main_product text default null::text
)
returns jsonb
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
  v_any_advisory boolean;
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

  -- The same question check_linkage_eligibility asks, including the track. If
  -- this ever drifts from the trigger, the trigger is the one that decides.
  if not exists (
    select 1
      from advisory_enrolment ae
      join person p           on p.id = ae.person_id  and p.deleted_at is null
      join advisory_session s on s.id = ae.session_id and s.deleted_at is null
     where ae.person_id = v_person_id
       and ae.met_criteria is true
       and ae.deleted_at is null
       and s.track = 'market'::advisory_track_t
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

comment on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) is
  'Public linkage request. Never creates a person: linkage requires a completed '
  'MARKET advisory, so an unknown national ID cannot be eligible and returns the '
  'same cannot_verify as a wrong date of birth. Enforcement is '
  'trg_linkage_request_eligibility (0057, narrowed by 0106); the explicit check '
  'here only produces a better message, and distinguishes wrong_track from '
  'ineligible so a home-based completer is not told their record is missing.';

revoke all on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) from public;
grant execute on function public.request_linkage(text, text, uuid, text, uuid, date, text, text) to anon, authenticated;
