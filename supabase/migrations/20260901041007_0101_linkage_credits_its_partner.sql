-- 0101 a market linkage credits its partner, so G0.4 stops under-reporting
--
-- G0.4 counts distinct partners with a documented contribution IN THE PERIOD,
-- and its definition names "market opportunity" as one of them. Nothing wrote
-- such a contribution: the only automatic source was a coordination meeting
-- (0010). Measured before this migration, 26/Q3 read G0.4 = 1 -- the university
-- that attended a meeting -- while Demo Agro Processing had an ACTIVE market
-- linkage dated inside the same quarter and no credit at all.
--
-- `market_linkage.partnership_id` is NOT NULL, so the partner is already named
-- on every linkage. Asking staff to log by hand what the row already says is
-- how G0.4 reads lower than the truth.

-- ── the shared reconcile, used by 0101, 0102 and 0103 ──────────────────────
--
-- SECURITY INVOKER on purpose. RLS on partner_contribution is what decides who
-- may write a contribution, and a definer here would let any caller write one.
-- 05 section 14: a security invoker's nested calls are checked against the
-- CALLER, so `authenticated` needs EXECUTE -- granted at the foot of this file
-- and tested as each role rather than read off proacl.
--
-- It reconciles in BOTH directions. An insert-only version would reproduce the
-- defect this migration was written next to: a coordination meeting that is
-- soft-deleted leaves its contribution live, so a withdrawn meeting still
-- counts its partner in a quarter. Measured, with coordinator claims, in a
-- transaction that rolled back: G0.4 was 1 before and 1 after. 0103 fixes that
-- one; these two are built not to need fixing.
create or replace function public.sync_auto_contribution(
  p_entity_type    text,
  p_entity_id      uuid,
  p_partnership_id uuid,   -- null means no credit is due for this entity
  p_on             date,
  p_type           text,
  p_description    text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rows int;
  v_live int;
begin
  if p_partnership_id is not null then
    -- Bring an existing credit into line rather than adding a second one: the
    -- partner, the date and the wording can all change on the parent.
    update public.partner_contribution
       set partnership_id    = p_partnership_id,
           contributed_on    = p_on,
           contribution_type = p_type,
           description       = p_description
     where entity_type = p_entity_type
       and entity_id   = p_entity_id
       and deleted_at is null;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into public.partner_contribution
        (partnership_id, contributed_on, contribution_type,
         entity_type, entity_id, description)
      values (p_partnership_id, p_on, p_type,
              p_entity_type, p_entity_id, p_description);
    end if;
    return;
  end if;

  -- No credit is due any more: the parent was withdrawn, or the fact that
  -- earned the credit was reversed.
  select count(*) into v_live
    from public.partner_contribution
   where entity_type = p_entity_type and entity_id = p_entity_id
     and deleted_at is null;
  if v_live = 0 then
    return;
  end if;

  -- Taking a partner out of a quarter's G0.4 is the same act guard_soft_delete
  -- reserves to a coordinator, and it is reached here from an ordinary edit to
  -- the parent. Say what is actually happening: left to the guard, the message
  -- would talk about deleting a record to somebody who was un-ticking a box.
  if not coalesce(public.is_coordinator(), false) then
    raise exception
      'this change would withdraw a partner''s contribution for the period'
      using errcode = 'insufficient_privilege',
            hint = 'The partner is currently credited in G0.4 for this period. '
                   'Removing that credit moves a reported figure, so it is a '
                   'coordinator decision.';
  end if;

  update public.partner_contribution
     set deleted_at = now()
   where entity_type = p_entity_type and entity_id = p_entity_id
     and deleted_at is null;
  get diagnostics v_rows = row_count;

  -- RLS filters an update it will not permit rather than raising, so a refusal
  -- arrives as success having changed nothing. We know there were v_live rows a
  -- moment ago; if none came back, they were filtered, not absent.
  if v_rows = 0 then
    raise exception
      'the contribution for % % could not be withdrawn', p_entity_type, p_entity_id
      using errcode = 'insufficient_privilege';
  end if;
end $$;

comment on function public.sync_auto_contribution(text, uuid, uuid, date, text, text) is
  'Brings a partner_contribution into line with the parent record that earns it. Reconciles in both directions: a reversed or withdrawn parent withdraws the credit.';

-- One live auto-credit per parent record. The reconcile above reads before it
-- writes, and a read that RLS filtered would otherwise let it insert a second
-- row for a parent that already has one. A constraint cannot be filtered.
create unique index partner_contribution_one_per_entity
  on public.partner_contribution (entity_type, entity_id)
  where deleted_at is null
    and entity_type in ('market_linkage', 'training_session');

-- ── the linkage credit ─────────────────────────────────────────────────────
--
-- Only `active` and `ended` earn a credit. C1.2 counts an initiative as
-- connected on exactly those two statuses, and a `proposed` linkage is the
-- MUNICIPALITY proposing -- the partner may not have answered yet, and G0.4 is
-- about what the partner did. Recorded as OQ-37 rather than left here, because
-- it is a reading of a definition and not a fact.
create or replace function public.contribution_from_linkage()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_partnership uuid;
begin
  if new.deleted_at is null and new.status in ('active', 'ended') then
    v_partnership := new.partnership_id;
  end if;

  perform public.sync_auto_contribution(
    'market_linkage', new.id, v_partnership, new.linked_on, 'market',
    'Market linkage: ' || new.scope);
  return null;
end $$;

revoke execute on function public.contribution_from_linkage() from public, anon, authenticated;

create trigger trg_market_linkage_contribution
after insert or update on public.market_linkage
for each row execute function public.contribution_from_linkage();

-- EXECUTE defaults to PUBLIC, which includes anon. Close it first, then open it
-- to the one role the application connects as. Section 11: an unnecessary grant
-- on a security boundary is a defect regardless of whether today's version of
-- the function happens to be harmless.
revoke execute on function
  public.sync_auto_contribution(text, uuid, uuid, date, text, text)
  from public, anon;
grant execute on function
  public.sync_auto_contribution(text, uuid, uuid, date, text, text)
  to authenticated;

-- ── backfill ───────────────────────────────────────────────────────────────
--
-- Without this the trigger is correct and the figure stays wrong: the linkage
-- already on file was made before the trigger existed. No reporting period has
-- ever been snapshotted (06 OQ-25, indicator_snapshot holds 0 rows), so no
-- REPORTED figure moves here -- every number in this system is still a live
-- recomputation. That will not be true after the first donor return, and a
-- backfill then would need saying out loud.
insert into public.partner_contribution
  (partnership_id, contributed_on, contribution_type, entity_type, entity_id, description)
select ml.partnership_id, ml.linked_on, 'market', 'market_linkage', ml.id,
       'Market linkage: ' || ml.scope
from public.market_linkage ml
where ml.deleted_at is null
  and ml.status in ('active', 'ended')
  and not exists (
    select 1 from public.partner_contribution pc
    where pc.entity_type = 'market_linkage' and pc.entity_id = ml.id
      and pc.deleted_at is null);
