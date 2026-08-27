-- ═══════════════════════════════════════════════════════════════════════════
--  0068 — the match refusal says what it actually means
--
--  ── WHAT 0067's HEADER CLAIMED, AND WHY IT WAS WRONG ──
--
--  0067 says, of a data_entry user:
--
--    "A data_entry user gets as far as the update and is refused, and the
--     transaction takes the two inserts back with it."
--
--  That is not what happens. Measured, as data_entry, on a live request:
--
--    select ... where initiative_title = '...'              -> 1 row
--    select ... where initiative_title = '...' for update   -> 0 rows
--
--  PostgreSQL applies the UPDATE policy's USING clause to locking reads, and
--  linkage_request.op_update is coordinator-only. So the FOR UPDATE at the top
--  of the function returns nothing, `found` is false, and it returns at the
--  very first check -- before the inserts, before the update, before anything.
--
--  The SAFETY was never in doubt: nothing is written either way, and that is
--  what matters most. But the sentence describing how was invented rather than
--  observed, and it is the fourth comment in this project to describe an
--  intention as though it were behaviour. It is corrected here rather than
--  edited in place, because 0067 has been applied.
--
--  ── AND THE MESSAGE WAS A LIE ──
--
--  The user-visible consequence: a data_entry user clicking Match was told
--  "That request no longer exists. It may have been withdrawn while this page
--  was open." The request is right there on their screen. They would reload,
--  see it still listed, and reasonably conclude the software is broken.
--
--  A refusal must never be dressed as a disappearance. So the function now
--  looks: if the locking read finds nothing but a plain read finds the row,
--  the row exists and this caller may not match it, and it says so.
--
--  The plain read is safe to rely on for that distinction because op_read is
--  `is_staff()` -- anyone who can reach this function at all can see the row.
--  A caller who is not staff sees neither read succeed and still gets
--  not_found, which for them is the truth.
--
--  Everything else about the function is unchanged.
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
  --
  -- This is ALSO where a non-coordinator is stopped, because RLS applies
  -- linkage_request.op_update to a locking read. See this migration's header:
  -- an empty result here means either no such row or no permission, and the
  -- two are told apart below rather than both reported as absence.
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

  -- The row was locked above, so this cannot be filtered by RLS at this point.
  -- Checked anyway: reporting a match that did not happen would leave an
  -- initiative and a linkage with nothing pointing at them, and the screen
  -- would say it was done.
  if not found then
    raise exception 'match update affected no row for request %', p_request_id
      using errcode = 'raise_exception';
  end if;

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
  'INVOKER. A non-coordinator is stopped by the FOR UPDATE at the top, because '
  'RLS applies linkage_request.op_update to locking reads -- that returns '
  'not_permitted, not not_found. Refuses to create a second initiative for a '
  'person who already has one unless p_create_new_initiative is passed.';
