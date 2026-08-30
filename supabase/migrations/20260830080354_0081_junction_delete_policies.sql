-- ═══════════════════════════════════════════════════════════════════════════
--  0081 — four more multi-select junctions were append-only
--
--  ── THE SAME DEFECT AS 0080, FOUND BY SWEEPING FOR ITS SHAPE ──
--
--  A table with RLS on, no deleted_at, and SELECT/INSERT/UPDATE policies but no
--  DELETE policy. Every one of these is a multi-select written by
--  delete-then-insert, which is the only way to say "these and only these":
--
--    partnership_role                  what a partner does
--    exhibition_registration_product   what a producer brings to a market
--    person_activity_type              what activities a person does
--    coordination_meeting_partner      who attended a meeting
--
--  Tick a role on a partner, save, untick it, save -- it stays. RLS does not
--  raise on a delete it will not permit; it filters the rows and reports
--  success. Nothing raises, nothing logs, nothing looks wrong. The only symptom
--  is a wrong answer in a donor report a quarter later.
--
--  A full sweep of every RLS table without deleted_at found exactly these four
--  and nothing else. The remaining three without a DELETE policy are deliberate
--  and are left alone:
--
--    audit_log                   read-only by design. CLAUDE.md rule 2 makes it
--                                insert-only and unmodifiable by anyone, and
--                                audit_row is definer so it does not need one.
--    applicant_lookup_throttle   RLS on with ZERO policies, so nothing reaches
--    applicant_lookup_secret     it through RLS at all. Only definer functions
--                                touch them, and bump_lookup_throttle purges
--                                its own expired rows from inside one. A policy
--                                would open a door that is currently sealed.
--
--  ── exhibition_registration_product IS THE ONE THAT WOULD HAVE HURT ──
--
--  Producers change what they sell between seasons, and E0.2 disaggregates by
--  product. Correcting a registration's products would have added the new ones
--  and kept the old, so a producer would accumulate every product they had ever
--  listed and be counted under all of them.
--
--  It has no edit screen yet -- only the public application inserts, through a
--  definer function that RLS never applied to -- so the damage is latent rather
--  than done. That is luck about build order, not a design that held.
--
--  ── WHY THIS DOES NOT BREACH RULE 2 ──
--
--  Same argument as 0080, and it is checked rather than assumed. None of the
--  four has a deleted_at column, so there is no soft delete to use instead;
--  each is a pure junction whose rows have no life apart from their parent; and
--  all four carry audit_row, so a removed tick is recorded with its old value
--  and the actor. Verified on followup_answer_option in 0080: seven delete rows,
--  every one with old_data and actor_role.
--
--  The policy mirrors each table's existing op_update exactly -- coordinator or
--  data_entry. Nobody gains a power they did not already have over these rows.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array[
    'partnership_role', 'exhibition_registration_product',
    'person_activity_type', 'coordination_meeting_partner'
  ] loop
    execute format($f$
      create policy op_delete on public.%I
        for delete to authenticated
        using (public.current_role() = any (array['coordinator','data_entry']::app_role_t[]))
    $f$, t);
  end loop;
end $$;

comment on table public.partnership_role is
  'Junction. Roles are replaced by delete-then-insert; the DELETE policy that '
  'makes that possible arrived in 0081, and until then unticking a role '
  'silently did nothing.';
comment on table public.exhibition_registration_product is
  'Junction. E0.2 disaggregates by product, so an append-only edit path would '
  'have counted a producer under every product they had ever listed. DELETE '
  'policy added in 0081.';
comment on table public.person_activity_type is
  'Junction. DELETE policy added in 0081 -- see that migration for why '
  'append-only junctions fail silently.';
comment on table public.coordination_meeting_partner is
  'Junction feeding G0.2''s attendance. DELETE policy added in 0081.';
