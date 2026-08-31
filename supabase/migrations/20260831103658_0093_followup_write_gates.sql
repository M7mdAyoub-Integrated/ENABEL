-- ═══════════════════════════════════════════════════════════════════════════
--  0093 — one defect in three places: a submitted survey could still be written
--
--  §7 of 05_ROLES_AND_RLS.md says an enumerator writes a draft and submits it
--  once, and after that only a coordinator may change it. Three policies did
--  not enforce that. All three were confirmed by running them as an enumerator
--  under RLS -- `set local role authenticated` with an enumerator's claims, in
--  a transaction that rolled back -- not by reading the policy text.
--
--  ── 1. fu_update let an enumerator write 'approved' ──
--
--      using      coordinator, or enumerator and status = 'draft'      ✓
--      with check current_role() in ('coordinator','enumerator')       ✗
--
--  The USING clause decides which rows may be touched; the WITH CHECK clause
--  decides what they may become, and it only asked for a role. So an enumerator
--  holding a draft could set any status at all:
--
--      GAP1 enumerator draft -> APPROVED     ALLOWED rows=1
--
--  What that costs is not the figure -- v_ind_a1, v_ind_b1, v_ind_c1 and
--  v_ind_imp_0 count `submitted` and `approved` identically, so the numbers do
--  not move. It is the review. `approved` is the state that says a coordinator
--  read this survey and stood behind it, and it was reachable by the person who
--  filled it in. A donor asking who checked a figure gets an answer that is not
--  true.
--
--  ── 2. fu_insert on the four children asked for a role and nothing else ──
--
--  No parent status test at all, on any of the four:
--
--      INSERT followup_answer            on SUBMITTED    ALLOWED rows=1
--      INSERT followup_answer_option     on SUBMITTED    ALLOWED rows=1
--      INSERT followup_safety_item       on SUBMITTED    ALLOWED rows=1
--      INSERT followup_buyer_connection  on SUBMITTED    ALLOWED rows=1
--
--  ── 3. fu_update_child checked the parent, but only in USING ──
--
--  This one is not what it looks like from a distance, and the difference
--  matters for what the fix has to do.
--
--  The USING clause DOES test the parent's status, and it works: updating an
--  answer belonging to a submitted survey came back `rows=0`, filtered. What is
--  role-only is the WITH CHECK -- so the row cannot be edited in place, but it
--  can be moved:
--
--      UPDATE child of SUBMITTED (USING)              filtered rows=0
--      RE-PARENT child DRAFT -> SUBMITTED (WITH CHECK) ALLOWED rows=1
--
--  An enumerator could take an answer off a draft they own and attach it to a
--  submitted survey. Same outcome as the missing insert gate, by a longer road.
--
--  ── WHY THE THREE TOGETHER ARE ONE DEFECT ──
--
--  fu_delete_child already had the right shape (0080). So a submitted survey
--  could gain answers and could not lose them: an enumerator could add a Q41
--  option to a survey a coordinator had already reviewed, and nobody could take
--  it off again without a coordinator. A record that only grows after it is
--  closed is worse than one that is simply editable, because the tampering is
--  one-directional and looks like completeness.
--
--  It becomes reachable the moment submit exists, which is this same batch.
--
--  ── INSERTS ARE LOUD, UPDATES AND DELETES ARE NOT ──
--
--  Worth stating because it changes what the callers must do. A WITH CHECK
--  failure on INSERT raises 42501. A USING failure on UPDATE or DELETE filters
--  the rows and reports success -- which is the whole of 0080, 0081 and 0083.
--  So the new insert gate will announce itself; the update gate will not, and
--  the read-back guards in the save functions stay the thing that notices.
--
--  ── WHAT IS DELIBERATELY UNCHANGED ──
--
--  fu_update's USING. An enumerator may still only touch a draft, so submitting
--  is the last thing they can do to a survey and reopening stays a coordinator
--  action -- no reopen function is needed for that, the policy is the whole of
--  it. And 'rejected' is refused to an enumerator along with 'approved': both
--  are review outcomes, and §7 names 'draft' and 'submitted' as the two states
--  an enumerator may write.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1 ─────────────────────────────────────────────────────────────────────
drop policy fu_update on public.followup_survey;

create policy fu_update on public.followup_survey
  for update to authenticated
  using (public.current_role() = 'coordinator'
         or (public.current_role() = 'enumerator'
             and status = 'draft'::record_status_t))
  with check (public.current_role() = 'coordinator'
              or (public.current_role() = 'enumerator'
                  and status in ('draft'::record_status_t,
                                 'submitted'::record_status_t)));

-- ── 2 and 3 ───────────────────────────────────────────────────────────────
--
-- The parent test is written once and used in three places per table, so the
-- insert gate, the update gate and the existing delete gate cannot drift into
-- disagreeing about what "still editable" means.
do $outer$
declare
  t     text;
  gate  constant text :=
    $g$public.current_role() = 'coordinator'
       or (public.current_role() = 'enumerator'
           and exists (select 1 from public.followup_survey s
                        where s.id = survey_id
                          and s.status = 'draft'::record_status_t))$g$;
begin
  foreach t in array array['followup_answer','followup_answer_option',
                           'followup_safety_item','followup_buyer_connection'] loop

    execute format('drop policy fu_insert on public.%I', t);
    execute format('create policy fu_insert on public.%I
                      for insert to authenticated
                      with check (%s)', t, gate);

    execute format('drop policy fu_update_child on public.%I', t);
    execute format('create policy fu_update_child on public.%I
                      for update to authenticated
                      using (%s)
                      with check (%s)', t, gate, gate);
  end loop;
end $outer$;
