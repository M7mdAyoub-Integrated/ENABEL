-- ═══════════════════════════════════════════════════════════════════════════
--  0064 — a linkage request gets a lifecycle of its own
--
--  `linkage_request.status` was record_status_t: draft, submitted, approved,
--  rejected. Those are the words for reviewing an APPLICATION, and a linkage
--  request is not one. Nobody is approved onto a linkage -- they are matched to
--  a partner, or they are not.
--
--  Four states, and each has to be distinguishable from the others:
--
--    submitted     asked for, not yet looked at
--    under_review  a coordinator is working on it
--    matched       an initiative and a linkage now exist for it
--    closed        it will not be matched, and the reason is recorded
--
--  A matched request must leave the queue; a closed one must not look matched.
--  Under record_status_t both collapsed onto 'approved'/'rejected', which said
--  the wrong thing about both.
--
--  ── WHY `closed` EXISTS AT ALL ──
--
--  A request nobody can fulfil is a real outcome. Someone asked the Municipality
--  for help finding a buyer and did not get one. Leaving that row 'submitted'
--  forever means the queue fills with things nobody will act on, and a queue
--  that is never empty stops being read -- so the genuinely new requests get
--  lost among the dead ones.
--
--  It is also the honest record. "We could not help this person" is exactly
--  what a coordinator's successor, or a donor asking why linkage numbers are
--  low, needs to be able to see.
--
--  ── WHY THE REASON IS FREE TEXT AND NOT A CATEGORY LIST ──
--
--  Because the categories would be invented. That is precisely how
--  ref_office_service_type happened -- a plausible list written by us rather
--  than taken from the workbook, still open as OQ-20 because nobody can say
--  whether it matches what the office actually does.
--
--  Free text records what really happened. If patterns emerge from real
--  refusals, a ref_* list can be built FROM them later. Guessing them now would
--  shape the data to fit the guess.
--
--  Safe to change the column type outright: the table has zero rows.
-- ═══════════════════════════════════════════════════════════════════════════

create type linkage_request_status_t as enum ('submitted', 'under_review', 'matched', 'closed');

alter table public.linkage_request
  drop constraint linkage_approved_needs_match;

alter table public.linkage_request
  alter column status drop default;

alter table public.linkage_request
  alter column status type linkage_request_status_t
    using case status::text
           when 'approved' then 'matched'::linkage_request_status_t
           when 'rejected' then 'closed'::linkage_request_status_t
           when 'draft'    then 'submitted'::linkage_request_status_t
           else 'submitted'::linkage_request_status_t
         end;

alter table public.linkage_request
  alter column status set default 'submitted'::linkage_request_status_t;

alter table public.linkage_request
  add column closed_reason text;

comment on column public.linkage_request.closed_reason is
  'Why this request will not be matched. Free text on purpose: a category list '
  'would be invented rather than observed -- see OQ-20. Build one FROM real '
  'refusals later if patterns appear.';

-- A matched request must point at what it was matched to. A request marked
-- done with nothing to show for it is the same defect the old constraint
-- guarded against, kept under the new vocabulary.
alter table public.linkage_request
  add constraint linkage_matched_needs_both
    check (status <> 'matched'
           or (matched_initiative_id is not null and matched_linkage_id is not null));

-- And a closed one must say why. A silent 'closed' is indistinguishable from
-- someone clearing their queue.
alter table public.linkage_request
  add constraint linkage_closed_needs_reason
    check (status <> 'closed' or coalesce(btrim(closed_reason), '') <> '');

comment on column public.linkage_request.status is
  'submitted -> under_review -> matched | closed. Deliberately NOT '
  'record_status_t: nobody is approved onto a linkage, they are matched to a '
  'partner or they are not. matched requires both matched ids; closed requires '
  'a reason.';
