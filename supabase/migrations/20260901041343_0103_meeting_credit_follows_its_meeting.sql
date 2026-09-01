-- 0103 a withdrawn coordination meeting withdraws the credit it gave
--
-- ── THE DEFECT, MEASURED ──
--
-- `trg_meeting_partner_contribution` (0010) writes a contribution when a
-- partner is recorded as attending a coordination meeting, and G0.4 picks it up
-- automatically. That half is right and is the pattern 0101 and 0102 follow.
--
-- Nothing takes it back. Soft-deleting the meeting leaves the contribution
-- live, so a partner stays credited in a quarter for a meeting that has been
-- withdrawn. Measured with coordinator claims, in a transaction that rolled
-- back:
--
--     before                     G0.4 26/Q3 = 1, 1 live contribution
--     meeting soft-deleted       G0.4 26/Q3 = 1, 1 live contribution
--
-- There is no error anywhere: the coordinator deletes the meeting, the screen
-- says it is gone, and the only symptom is a partner counted in a donor return
-- for a meeting that was withdrawn.
--
-- ── WHY THIS IS NOT sync_auto_contribution ──
--
-- 0101's helper keys on (entity_type, entity_id) and assumes ONE credit per
-- parent -- true of a linkage and of a session. A meeting has one credit PER
-- ATTENDING PARTNER, all sharing the meeting's id, so that helper would
-- collapse them to one. Hence a separate function rather than a parameter, and
-- hence 0101's unique index names only the two single-credit entity types.
--
-- ── RESTORE PUTS BACK ONLY WHAT THE DELETE TOOK ──
--
-- The delete branch stamps each credit with the MEETING's own `deleted_at`
-- rather than `now()`, and the restore branch lifts exactly the rows carrying
-- that stamp. Restoring everything would resurrect a credit a coordinator had
-- removed by hand while the meeting was still live -- a figure moving for a
-- reason nobody could trace back to the click that caused it, which is the
-- whole shape this migration exists to close.
--
-- Soft delete and restore of a `coordination_meeting` are both coordinator-only
-- (guard_soft_delete), so the write below is always made by a coordinator and
-- needs no gate of its own.
create or replace function public.contributions_follow_meeting()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_wrong int;
begin
  if new.deleted_at is not distinct from old.deleted_at then
    return null;
  end if;

  if new.deleted_at is not null then
    update public.partner_contribution
       set deleted_at = new.deleted_at
     where entity_type = 'coordination_meeting'
       and entity_id   = new.id
       and deleted_at is null;
  else
    update public.partner_contribution
       set deleted_at = null
     where entity_type = 'coordination_meeting'
       and entity_id   = new.id
       and deleted_at  = old.deleted_at;
  end if;

  -- RLS does not raise on an update it will not permit, it filters the rows --
  -- the statement reports success having changed nothing. So look at the result
  -- rather than trusting it: after a withdrawal no credit for this meeting may
  -- still be live. (The restore direction is deliberately not asserted: a credit
  -- removed by hand is meant to stay removed.)
  if new.deleted_at is not null then
    select count(*) into v_wrong
      from public.partner_contribution
     where entity_type = 'coordination_meeting'
       and entity_id   = new.id
       and deleted_at is null;
    if v_wrong > 0 then
      raise exception
        'meeting % still has % live partner contribution(s) after withdrawal',
        new.id, v_wrong
        using errcode = 'insufficient_privilege';
    end if;
  end if;
  return null;
end $$;

revoke execute on function public.contributions_follow_meeting() from public, anon, authenticated;

create trigger trg_coordination_meeting_contribution_sync
after update on public.coordination_meeting
for each row execute function public.contributions_follow_meeting();

-- No backfill. The one meeting on file is live and its contribution is live,
-- which is already the state this trigger maintains. A backfill would be a
-- no-op dressed as a repair.
