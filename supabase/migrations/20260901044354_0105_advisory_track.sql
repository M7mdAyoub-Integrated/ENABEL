-- 0105 advisory sessions carry a track: market, or home-based
--
-- ── WHY A COLUMN AND NOT TWO TABLES ──
--
-- `advisory_session` already carries everything both kinds of advisory need:
-- title, topic, dates, duration, venue, delivering partnership, adviser, seats
-- and the publish/cancel/deliver fields. The only thing that differs between a
-- market advisory and a home-based one is what it is FOR, and one enum column
-- says that without duplicating eighteen columns and every policy on them.
--
-- It is also what lets `check_linkage_eligibility` ask a question it cannot
-- ask today: `0106` narrows the linkage gate to a completed advisory whose
-- session has `track = 'market'`, and there is nothing to narrow on until this
-- column exists.
--
-- ── THE BACKFILL, AND WHY 'market' ──
--
-- Exactly one advisory_session exists:
--
--     "Demo Market Advisory"
--     "One-to-one advice on pricing, packaging and finding buyers."
--     0 enrolments, 0 completions
--
-- Its title says market, its description describes market advice, and it is the
-- session the linkage gate was written around. Setting it to 'market' is
-- reading the row rather than choosing for it.
--
-- It also costs nothing to be wrong about, which is the part worth stating:
-- with **zero completions**, no advisory place exists that this value could
-- revoke, and `0106`'s gate has nobody to refuse. If the Coordinator says this
-- session was really home-based, it is a one-row update with no consequence.
-- That will not be true of the second session, so the form asks from now on.
--
-- Backfill BEFORE the not-null, in that order, in one transaction: a migration
-- that adds the constraint first fails on the existing row and leaves the
-- column half-added.
create type public.advisory_track_t as enum ('market', 'home_based');

alter table public.advisory_session
  add column track public.advisory_track_t;

update public.advisory_session set track = 'market' where track is null;

alter table public.advisory_session
  alter column track set not null;

comment on column public.advisory_session.track is
  'What the advisory is for. market = pricing, buyers, market linkage — and the only track that satisfies check_linkage_eligibility (0106). home_based = food safety, licensing, packaging for home-based production.';

-- The linkage gate reads (person, met_criteria, track) on every insert into
-- market_linkage, so the join it makes has an index to land on.
create index advisory_session_track_idx on public.advisory_session (track);
