-- ═══════════════════════════════════════════════════════════════════════════
--  0043 — make training_session and exhibition publishable opportunities
--
--  The app is gaining a public home page. An opportunity appears there only
--  once the Municipality publishes it, so both tables need a publication flag,
--  an application window, and the descriptive fields a member of the public
--  needs in order to decide whether to apply.
--
--  ── REUSED, NOT DUPLICATED ──
--
--  Three fields the plan called for already exist under other names, and are
--  deliberately NOT re-added. Two columns holding one fact is how they drift:
--
--    "partner"    -> training_session.delivered_by_partnership_id  (a real FK)
--    "location"   -> training_session.venue / exhibition.location
--    "sector"     -> training_session.topic_id -> ref_training_topic
--
--  ref_training_topic is already seeded with what are, in substance, sectors:
--  crop production, livestock, greenhouse, food processing, food safety,
--  marketing. A separate ref_sector would duplicate that list, and D0.2 filters
--  on topic_id (is_food_processing), so the two would have to be kept in step
--  forever. If the public word should be "sector", that is a translation-file
--  label, not a table.
--
--  ── PUBLISHED IS NOT DELIVERED ──
--
--  v_ind_d0_2 counts training_session rows with is_delivered = true and has no
--  publication filter; v_ind_e0_1 counts exhibitions the same way. So a draft
--  created while planning next quarter could inflate D0.2 the moment someone
--  ticked the wrong box.
--
--  Both flags therefore default to false and mean different things:
--    is_published  the public can see it and apply
--    is_delivered  it actually happened, and D0.2 may count it
--
--  A comment alone would not survive, so it is enforced -- see the trigger
--  below, and note WHY it is a trigger rather than a check constraint.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── training_session ──────────────────────────────────────────────────────
alter table public.training_session
  add column description           text,
  add column focal_point           text,
  add column duration_hours        numeric(5,1),
  add column application_opens_on  date,
  add column application_closes_on date,
  add column is_published          boolean not null default false,
  add column is_cancelled          boolean not null default false,
  add column cancellation_reason   text;

alter table public.training_session
  add constraint training_duration_positive
    check (duration_hours is null or duration_hours > 0),
  add constraint training_application_window
    check (application_closes_on is null
           or application_opens_on is null
           or application_closes_on >= application_opens_on),
  -- Same shape as the constraint 0027 put on exhibition. A cancellation with no
  -- stated reason is not auditable, and these feed a donor return.
  add constraint training_cancelled_needs_reason
    check (not is_cancelled or cancellation_reason is not null);

comment on column public.training_session.is_published is
  'Visible on the public site and open to applications. NOT the same as '
  'is_delivered -- see is_delivered. Defaults false so a draft is never public.';
comment on column public.training_session.is_delivered is
  'The session actually took place. v_ind_d0_2 counts this, so it must never be '
  'set on a session that has not happened. Enforced by trg_training_session_delivery.';

-- ── exhibition ────────────────────────────────────────────────────────────
-- NOT re-adding cancellation_reason here. 0027 added it and 0029 removed it at
-- the owner's explicit request -- that was a scope decision, not a defect, and
-- reversing it silently inside an unrelated migration would be wrong. Raised
-- separately for a decision.
alter table public.exhibition
  add column description           text,
  add column focal_point           text,
  add column application_opens_on  date,
  add column application_closes_on date,
  add column is_published          boolean not null default false;

alter table public.exhibition
  add constraint exhibition_application_window
    check (application_closes_on is null
           or application_opens_on is null
           or application_closes_on >= application_opens_on);

comment on column public.exhibition.is_published is
  'Visible on the public site and open to applications. Defaults false so a '
  'draft is never public. v_ind_e0_1 counts held, uncancelled events regardless '
  'of publication -- an unpublished event that genuinely happened still counts.';

-- ── delivery cannot be in the future ──────────────────────────────────────
--
--  WHY THIS IS A TRIGGER AND NOT A CHECK CONSTRAINT
--
--  A CHECK constraint may only call IMMUTABLE functions. `current_date` is
--  STABLE -- its value depends on when it is evaluated -- so Postgres refuses
--  it inside a CHECK. The rule still has to be enforced somewhere, so it is
--  enforced here, on insert and update, which is exactly when a CHECK would
--  have fired anyway.
create or replace function public.check_delivery_not_future()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.is_delivered and new.end_date > current_date then
    raise exception
      'a session cannot be marked delivered before it has ended (ends %)', new.end_date
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_training_session_delivery on public.training_session;
create trigger trg_training_session_delivery
  before insert or update on public.training_session
  for each row execute function public.check_delivery_not_future();

-- Indexes for the public listing: "published, open, not cancelled, by date".
create index if not exists training_session_published_idx
  on public.training_session (is_published, start_date)
  where deleted_at is null and not is_cancelled;
create index if not exists exhibition_published_idx
  on public.exhibition (is_published, start_date)
  where deleted_at is null and not is_cancelled;
