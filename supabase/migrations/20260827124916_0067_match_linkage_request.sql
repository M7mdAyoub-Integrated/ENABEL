-- ═══════════════════════════════════════════════════════════════════════════
--  0067 — match_linkage_request: one action, two rows, one transaction
--
--  Matching creates a production_initiative and a market_linkage together. Two
--  separate inserts from the browser would leave, on a failure between them, an
--  initiative with no linkage: invisible to C1.2, which only counts initiatives
--  that HAVE a linkage, and therefore never noticed -- but still offered
--  forever afterwards as "an existing initiative to attach to". A phantom that
--  costs nothing today and corrupts the choice tomorrow.
--
--  ── SECURITY INVOKER, DELIBERATELY ──
--
--  No `security definer` here. This runs as whoever called it, so RLS decides,
--  and the tightest policy involved wins:
--
--    production_initiative  insert   coordinator, data_entry
--    market_linkage         insert   coordinator, data_entry
--    linkage_request        update   coordinator ONLY
--
--  Matching therefore requires a coordinator, and that comes out of policy that
--  already existed rather than a rule invented in this function. A data_entry
--  user gets as far as the update and is refused, and the transaction takes the
--  two inserts back with it.
--
--  ── THE DUPLICATE INITIATIVE, REFUSED RATHER THAN TRUSTED ──
--
--  C1.2 counts distinct initiatives with a linkage. A second initiative for
--  someone who already has one moves that number by one, permanently, and
--  nothing downstream can tell it apart from a genuine second venture.
--
--  So the function will not create an initiative for a person who already has
--  one unless the caller says so explicitly, with p_create_new_initiative.
--  Omitting the parameter is refused, not guessed:
--
--    initiative id supplied   -> attach to it
--    none, person has none    -> create, no question to ask
--    none, person HAS one     -> REFUSED with needs_initiative_choice
--
--  The last line is the whole point. A coordinator who simply did not think
--  about it gets a question; a coordinator who means it passes the flag. The
--  difference between the two is invisible after the fact, which is exactly why
--  it has to be settled before the write rather than after.
--
--  This is not a substitute for the screen defaulting to attach. It is what
--  makes the default safe to rely on -- the refusal holds for a script, a
--  second UI, or a coordinator on a stale page whose "attach" option was
--  rendered before the initiative existed.
--
--  ── WHY IT DOES NOT SAY WHETHER C1.2 MOVED ──
--
--  It returns the linkage status and nothing else about indicators. It would be
--  easy to return counts_in_c1_2:false alongside a 'proposed' linkage, and it
--  would be true today. It would also be a claim about a view this function
--  does not read, of exactly the kind that goes stale silently -- and the
--  screen would print it with total confidence long after it stopped being so.
--
--  The screen reads C1.2 from v_indicator_progress instead, so what a
--  coordinator sees is the real figure rather than this function's opinion of it.
--
--  ── PARTNERSHIP TYPE IS NOT FILTERED ──
--
--  partnership_type_t is (training, production_support). A market linkage to a
--  training partnership looks wrong, and may well be, but nothing in the
--  workbook says so. Refusing it here would be a rule we made up. The screen
--  shows the type next to every partnership so the choice is informed, and
--  OQ-29 records the question.
-- ═══════════════════════════════════════════════════════════════════════════

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
  v_req      linkage_request%rowtype;
  v_init_id  uuid;
  v_link_id  uuid;
  v_created  boolean := false;
  v_existing int;
begin
  -- Locked, so two coordinators matching the same request serialise: the
  -- second one finds it already matched instead of creating a second linkage.
  select * into v_req from linkage_request
   where id = p_request_id and deleted_at is null
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;

  if v_req.status = 'matched' then
    return jsonb_build_object('ok', false, 'result', 'already_matched');
  end if;

  if v_req.status = 'closed' then
    return jsonb_build_object('ok', false, 'result', 'is_closed');
  end if;

  if coalesce(btrim(p_scope), '') = '' then
    return jsonb_build_object('ok', false, 'result', 'scope_required');
  end if;

  if not exists (select 1 from partnership
                  where id = p_partnership_id and deleted_at is null) then
    return jsonb_build_object('ok', false, 'result', 'partnership_not_found');
  end if;

  select count(*) into v_existing
    from production_initiative
   where person_id = v_req.person_id and deleted_at is null;

  if p_initiative_id is not null then
    -- Attaching to someone else's initiative would put this person's linkage
    -- under another producer's name, and C1.2 would count it there.
    if not exists (select 1 from production_initiative
                    where id = p_initiative_id
                      and person_id = v_req.person_id
                      and deleted_at is null) then
      return jsonb_build_object('ok', false, 'result', 'initiative_not_theirs');
    end if;
    v_init_id := p_initiative_id;
  else
    if v_existing > 0 and not p_create_new_initiative then
      return jsonb_build_object('ok', false, 'result', 'needs_initiative_choice',
                                'existing_initiatives', v_existing);
    end if;

    -- The title and activity type were captured on the request, so there is no
    -- initiative form for the coordinator to fill in at this point.
    insert into production_initiative
      (person_id, title, activity_type_id, main_product)
    values (v_req.person_id, v_req.initiative_title, v_req.activity_type_id,
            v_req.main_product)
    returning id into v_init_id;
    v_created := true;
  end if;

  -- 'proposed', never 'active'. Matching is an introduction, not a trading
  -- relationship, and C1.2 counts only active and ended.
  insert into market_linkage
    (initiative_id, partnership_id, scope, request, linked_on, status)
  values (v_init_id, p_partnership_id, btrim(p_scope), v_req.request,
          coalesce(p_linked_on, current_date), 'proposed'::link_status_t)
  returning id into v_link_id;

  update linkage_request
     set status                = 'matched'::linkage_request_status_t,
         matched_initiative_id = v_init_id,
         matched_linkage_id    = v_link_id,
         reviewed_by           = auth.uid(),
         reviewed_at           = now(),
         review_note           = nullif(btrim(coalesce(p_review_note, '')), '')
   where id = p_request_id;

  return jsonb_build_object(
    'ok', true,
    'result', 'matched',
    'initiative_id', v_init_id,
    'linkage_id', v_link_id,
    'initiative_created', v_created,
    'linkage_status', 'proposed');
end;
$function$;

comment on function public.match_linkage_request(uuid, uuid, text, uuid, boolean, date, text) is
  'Matches a linkage request: creates or attaches a production_initiative and '
  'creates a market_linkage at status proposed, in one transaction. Security '
  'INVOKER, so linkage_request.op_update makes this coordinator-only. Refuses '
  'to create a second initiative for a person who already has one unless '
  'p_create_new_initiative is passed -- that second initiative would move C1.2 '
  'permanently and indistinguishably from a real one.';

revoke all on function public.match_linkage_request(uuid, uuid, text, uuid, boolean, date, text) from public;
grant execute on function public.match_linkage_request(uuid, uuid, text, uuid, boolean, date, text) to authenticated;
