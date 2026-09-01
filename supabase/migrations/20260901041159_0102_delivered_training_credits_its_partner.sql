-- 0102 a delivered training session credits the partner that delivered it
--
-- Same argument as 0101. `training_session.delivered_by_partnership_id` already
-- names the partner, and G0.4's definition names "training" as a contribution.
-- Nothing wrote one, so a partner could deliver every course in the programme
-- and appear in G0.4 only if somebody remembered to type a contribution by
-- hand. Nobody will, and the figure reads lower than the truth.
--
-- ── THE SESSION EXISTING IS NOT THE CONTRIBUTION ──
--
-- Being scheduled to deliver a course is not a contribution; delivering it is.
-- So the credit hangs off `is_delivered`, not off the row, and it is dated by
-- `end_date` -- the day the session finished, which `check_delivery_not_future`
-- already refuses to let sit in the future.
--
-- ── THE CONDITION IS D0.2's, DELIBERATELY ──
--
-- `v_ind_d0_2` admits `deleted_at is null and is_delivered`, keyed on
-- `end_date`. This uses the same three, so the two indicators cannot come to
-- disagree about what "delivered" means. In particular it does NOT add
-- `not is_cancelled`, even though a cancelled session that is also marked
-- delivered is a contradiction -- D0.2 counts that row today, and a second,
-- stricter copy of the rule here is how two figures start drifting. The gap is
-- D0.2's and it is recorded as OQ-38 rather than quietly patched from inside an
-- unrelated migration.
--
-- The fourth condition is this migration's own and not a copy of anything:
-- there is no partner to credit unless one is named.
create or replace function public.contribution_from_delivery()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_partnership uuid;
begin
  if new.deleted_at is null
     and new.is_delivered
     and new.delivered_by_partnership_id is not null then
    v_partnership := new.delivered_by_partnership_id;
  end if;

  perform public.sync_auto_contribution(
    'training_session', new.id, v_partnership, new.end_date, 'training',
    'Delivered training: ' || new.title);
  return null;
end $$;

revoke execute on function public.contribution_from_delivery() from public, anon, authenticated;

create trigger trg_training_session_contribution
after insert or update on public.training_session
for each row execute function public.contribution_from_delivery();

-- ── backfill ───────────────────────────────────────────────────────────────
--
-- Zero rows today: `delivered_by_partnership_id` is null on all five sessions
-- on file, so nothing is under-counted yet and this moves no figure. It is here
-- anyway, because a backfill that happens to be empty and a backfill that was
-- forgotten look identical afterwards.
insert into public.partner_contribution
  (partnership_id, contributed_on, contribution_type, entity_type, entity_id, description)
select ts.delivered_by_partnership_id, ts.end_date, 'training', 'training_session', ts.id,
       'Delivered training: ' || ts.title
from public.training_session ts
where ts.deleted_at is null
  and ts.is_delivered
  and ts.delivered_by_partnership_id is not null
  and not exists (
    select 1 from public.partner_contribution pc
    where pc.entity_type = 'training_session' and pc.entity_id = ts.id
      and pc.deleted_at is null);
