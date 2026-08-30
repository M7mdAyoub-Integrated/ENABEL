-- ═══════════════════════════════════════════════════════════════════════════
--  0073 — a linkage can be recorded without a public request
--
--  ── THE GAP ──
--
--  Until now the ONLY way into C1.2 was: a producer finds the public website,
--  fills in a linkage request, and a coordinator matches it. Every other way a
--  linkage actually happens -- a partner mentions a buyer at a meeting, someone
--  makes an introduction at a market -- had nowhere to go.
--
--  That is most of them. A programme whose only path into an indicator is a
--  public web form will under-report, and it will under-report exactly the
--  linkages made by staff doing their job well.
--
--  ── ONE COPY OF THE RULES, NOT TWO ──
--
--  The tempting shape is a second function with the same guards pasted in. This
--  project has been bitten repeatedly by two copies of one rule drifting, and
--  the rule here is the one that protects C1.2 from silently gaining a
--  duplicate initiative. So the shared part is extracted:
--
--    attach_or_create_linkage()   validate, choose or create the initiative,
--                                 insert the market_linkage
--    match_linkage_request()      loads a request, calls it, marks the request
--    create_direct_linkage()      takes the details as arguments, calls it
--
--  match_linkage_request keeps its own FOR UPDATE lock and its own
--  not_permitted/not_found distinction (0068), because those are about the
--  REQUEST, which the direct path does not have.
--
--  ── WHO MAY DO IT ──
--
--  Everything here is SECURITY INVOKER, so RLS decides, and this migration adds
--  no rule of its own. market_linkage and production_initiative both allow
--  coordinator and data_entry to insert, so the direct path is open to both --
--  which is what the table policies already said. Matching stays
--  coordinator-only because it updates linkage_request, and that is unchanged.
--
--  If direct linkage should be narrower than data entry, that is a policy
--  change on market_linkage, not a condition buried in a function.
--
--  C1.2 is untouched: the linkage is created 'proposed', exactly as matching
--  creates it, and only becomes countable when someone moves it to active.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.attach_or_create_linkage(
  p_person_id             uuid,
  p_partnership_id        uuid,
  p_scope                 text,
  p_request               text,
  p_initiative_title      text,
  p_activity_type_id      uuid,
  p_main_product          text,
  p_initiative_id         uuid,
  p_create_new_initiative boolean,
  p_linked_on             date
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_init_id  uuid;
  v_link_id  uuid;
  v_created  boolean := false;
  v_existing int;
begin
  if coalesce(btrim(p_scope), '') = '' then
    return jsonb_build_object('ok', false, 'result', 'scope_required');
  end if;

  if not exists (select 1 from partnership
                  where id = p_partnership_id and deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'partnership_not_found');
  end if;

  select count(*) into v_existing
    from production_initiative
   where person_id = p_person_id and deleted_at is null;

  if p_initiative_id is not null then
    -- Attaching to someone else's initiative would put this person's linkage
    -- under another producer's name, and C1.2 would count it there.
    if not exists (select 1 from production_initiative
                    where id = p_initiative_id
                      and person_id = p_person_id
                      and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'initiative_not_theirs');
    end if;
    v_init_id := p_initiative_id;
  else
    -- The refusal that protects C1.2. A second initiative for someone who
    -- already has one moves the figure permanently and is indistinguishable
    -- afterwards from a real second venture, so it must be asked for.
    if v_existing > 0 and not coalesce(p_create_new_initiative, false) then
      return jsonb_build_object('ok', false, 'result', 'needs_initiative_choice',
                                'existing_initiatives', v_existing);
    end if;

    if coalesce(btrim(p_initiative_title), '') = '' or p_activity_type_id is null then
      return jsonb_build_object('ok', false, 'result', 'initiative_details_required');
    end if;

    insert into production_initiative
      (person_id, title, activity_type_id, main_product)
    values (p_person_id, btrim(p_initiative_title), p_activity_type_id,
            nullif(btrim(coalesce(p_main_product, '')), ''))
    returning id into v_init_id;
    v_created := true;
  end if;

  -- 'proposed', never 'active'. An introduction is not a trading relationship,
  -- and C1.2 counts only active and ended.
  insert into market_linkage
    (initiative_id, partnership_id, scope, request, linked_on, status)
  values (v_init_id, p_partnership_id, btrim(p_scope),
          nullif(btrim(coalesce(p_request, '')), ''),
          coalesce(p_linked_on, current_date), 'proposed'::link_status_t)
  returning id into v_link_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'linked',
    'initiative_id', v_init_id,
    'linkage_id', v_link_id,
    'initiative_created', v_created,
    'linkage_status', 'proposed');
end;
$function$;

comment on function public.attach_or_create_linkage(uuid, uuid, text, text, text, uuid, text, uuid, boolean, date) is
  'The shared core of both linkage paths: validate, attach to an existing '
  'production_initiative or create one, then insert a market_linkage at '
  'proposed. Holds the refusal that stops a second initiative being created '
  'for a person who already has one. Called by match_linkage_request and by '
  'create_direct_linkage so that rule exists once.';

-- ── matching, rewritten to call the shared core ─────────────────────────────
create or replace function public.match_linkage_request(
  p_request_id            uuid,
  p_partnership_id        uuid,
  p_scope                 text,
  p_initiative_id         uuid    default null,
  p_create_new_initiative boolean default false,
  p_linked_on             date    default null,
  p_review_note           text    default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_req linkage_request%rowtype;
  v_res jsonb;
begin
  -- Locked, so two coordinators matching the same request serialise. This is
  -- ALSO where a non-coordinator is stopped, because RLS applies
  -- linkage_request.op_update to a locking read -- see 0068.
  select * into v_req from linkage_request
   where id = p_request_id and deleted_at is null
   for update;

  if not found then
    if exists (select 1 from linkage_request
                where id = p_request_id and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'not_permitted');
    end if;
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  if v_req.status = 'matched' then
    return jsonb_build_object('ok', false, 'result', 'already_matched');
  end if;

  if v_req.status = 'closed' then
    return jsonb_build_object('ok', false, 'result', 'is_closed');
  end if;

  v_res := attach_or_create_linkage(
    v_req.person_id, p_partnership_id, p_scope, v_req.request,
    v_req.initiative_title, v_req.activity_type_id, v_req.main_product,
    p_initiative_id, p_create_new_initiative, p_linked_on);

  if not (v_res->>'ok')::boolean then
    return v_res;
  end if;

  update linkage_request
     set status                = 'matched'::linkage_request_status_t,
         matched_initiative_id = (v_res->>'initiative_id')::uuid,
         matched_linkage_id    = (v_res->>'linkage_id')::uuid,
         reviewed_by           = auth.uid(),
         reviewed_at           = now(),
         review_note           = nullif(btrim(coalesce(p_review_note, '')), '')
   where id = p_request_id;

  if not found then
    raise exception 'match update affected no row for request %', p_request_id
      using errcode = 'raise_exception';
  end if;

  -- 'matched' rather than the core's 'linked', because the caller's screen
  -- distinguishes them.
  return jsonb_set(v_res, '{result}', '"matched"');
end;
$function$;

-- ── the direct path ─────────────────────────────────────────────────────────
create or replace function public.create_direct_linkage(
  p_national_id           text,
  p_partnership_id        uuid,
  p_scope                 text,
  p_initiative_id         uuid    default null,
  p_create_new_initiative boolean default false,
  p_initiative_title      text    default null,
  p_activity_type_id      uuid    default null,
  p_main_product          text    default null,
  p_linked_on             date    default null,
  p_note                  text    default null
) returns jsonb
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_id     text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
  v_person person%rowtype;
begin
  -- Staff-facing, so an unknown national ID says so plainly. The public
  -- functions deliberately blur that into one failure; there is nothing to
  -- protect here, because the caller can already read `person`.
  if v_id !~ '^\d{9}$' then
    return jsonb_build_object('ok', false, 'result', 'bad_national_id');
  end if;

  select * into v_person from person where national_id = v_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'result', 'person_not_found');
  end if;

  -- NOTE: no advisory prerequisite is checked here, and that is deliberate.
  -- check_linkage_eligibility guards linkage_request -- who may ASK. A linkage
  -- the Municipality brokered is a record of something that happened, and
  -- refusing to record it because the paperwork ran the other way would lose
  -- real programme activity. warn_linkage_without_training already raises a
  -- warning on market_linkage for the same reason: notice, do not refuse.
  return attach_or_create_linkage(
    v_person.id, p_partnership_id, p_scope, p_note,
    p_initiative_title, p_activity_type_id, p_main_product,
    p_initiative_id, p_create_new_initiative, p_linked_on);
end;
$function$;

comment on function public.create_direct_linkage(text, uuid, text, uuid, boolean, text, uuid, text, date, text) is
  'Record a linkage the Municipality brokered in person, with no public request '
  'behind it. Shares attach_or_create_linkage with matching, so the '
  'duplicate-initiative refusal is the same rule and not a second copy. '
  'Deliberately does NOT require a completed advisory: that gate is about who '
  'may ask, not about what may be recorded.';

revoke all on function public.attach_or_create_linkage(uuid, uuid, text, text, text, uuid, text, uuid, boolean, date) from public, anon;
revoke all on function public.create_direct_linkage(text, uuid, text, uuid, boolean, text, uuid, text, date, text) from public, anon;
grant execute on function public.attach_or_create_linkage(uuid, uuid, text, text, text, uuid, text, uuid, boolean, date) to authenticated;
grant execute on function public.create_direct_linkage(text, uuid, text, uuid, boolean, text, uuid, text, date, text) to authenticated;
