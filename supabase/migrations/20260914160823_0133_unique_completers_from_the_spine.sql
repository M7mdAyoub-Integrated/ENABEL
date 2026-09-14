-- ═══════════════════════════════════════════════════════════════════════════
--  0133 — v_rmth_indicator_unique counts people from the spine, not from a
--         derived field
--
--  Found in Part 7's counting-rule probe. 0132's unique-completer view
--  counted enrolments whose `counted_under_id` is null. That field is
--  worked out by save_rmth_record at the moment a record is saved (0127):
--  "the earliest OTHER live completion of the same kind and person". It is
--  right on the day it is written and nothing keeps it right afterwards:
--
--    - the earlier record is soft-deleted, or edited to "did not meet the
--      criteria" -- the later one still points at it, and the person's one
--      remaining completion is not counted as unique (undercount);
--    - the earlier record is saved with "did not meet" and edited to "met"
--      after a later one was saved -- both carry null, and one person is two
--      (overcount);
--    - a row that reaches the table any way but the RPC carries null.
--
--  The probe was the third: one person on three cycles gave C1.2 = 3 and
--  unique = 3, where the sheet says "unique participants by National ID".
--
--  CLAUDE.md rule 4 -- count unique people, not rows -- is the spine's job.
--  Every other person-level view here (E0.2, IMP-0, SO1-0, SO3-0) already
--  takes min(date) per person from the records; this one now does the same:
--  a person is unique in the quarter of their FIRST qualifying completion,
--  by the cycle's end date, and never again. `counted_under_id` stays on the
--  form as the enumerator's "already counted under record X" note; no figure
--  reads it.
--
--  Same shape, same grants, same gate as 0132. Nothing Sahel Horan reads.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace view public.v_rmth_indicator_unique as
select x.code, rp.code as period_code, count(f.person_id)::numeric as unique_actual, m.id as municipality_id
  from public.municipality m
  join public.reporting_period rp on rp.municipality_id = m.id
  cross join (values ('C1.2', 'employability'), ('E0.3', 'incubator_design'), ('F0.1', 'entrepreneurship')) x(code, kind)
  left join (select e.municipality_id, e.enrolment_kind, e.person_id, min(c.end_date) as first_on
               from public.rmth_training_enrolment e
               join public.rmth_training_cycle c on c.id = e.cycle_id and c.deleted_at is null
               join public.person pe on pe.id = e.person_id and pe.deleted_at is null
              where e.met_criteria is true and e.deleted_at is null
              group by e.municipality_id, e.enrolment_kind, e.person_id) f
    on f.municipality_id = m.id and f.enrolment_kind = x.kind and f.first_on between rp.start_date and rp.end_date
 where m.code = 'RMTH'
   and (auth.uid() is null or public.is_staff() or public."current_role"() = 'partner_viewer')
   and (auth.uid() is null or public.can_see_municipality(m.id))
 group by x.code, m.id, rp.code;

-- create or replace keeps the grants; said again so the file states them.
revoke all on public.v_rmth_indicator_unique from public, anon;
grant select on public.v_rmth_indicator_unique to authenticated;

-- ── verification: the probe that found it, in a discarded savepoint ──────
do $$
declare
  v_rmth uuid := '00000000-0000-4000-8000-0000000000a1';
  v_person uuid;
  v_c1 uuid := gen_random_uuid(); v_c2 uuid := gen_random_uuid(); v_c3 uuid := gen_random_uuid();
  v_e1 uuid := gen_random_uuid(); v_e2 uuid := gen_random_uuid();
  v_total numeric; v_unique numeric;
begin
  insert into public.person (national_id, full_name, age_recorded) values ('399000199', 'Probe 0133', 30) returning id into v_person;
  insert into public.rmth_training_cycle (id, municipality_id, cycle_kind, title, start_date, end_date)
  values (v_c1, v_rmth, 'employability', 'probe 0133 c1', '2027-07-01', '2027-07-20'),
         (v_c2, v_rmth, 'employability', 'probe 0133 c2', '2027-07-02', '2027-07-25'),
         (v_c3, v_rmth, 'employability', 'probe 0133 c3', '2027-10-02', '2027-10-25');
  -- three completions, one person: counted_under deliberately left null on all three
  insert into public.rmth_training_enrolment (id, municipality_id, cycle_id, enrolment_kind, person_id, met_criteria, met_criteria_decided_by, met_criteria_decided_on)
  values (v_e1, v_rmth, v_c1, 'employability', v_person, true, null, now()),
         (v_e2, v_rmth, v_c2, 'employability', v_person, true, null, now()),
         (gen_random_uuid(), v_rmth, v_c3, 'employability', v_person, true, null, now());

  select actual into v_total from public.v_indicator_actual where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3';
  select unique_actual into v_unique from public.v_rmth_indicator_unique where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3';
  if v_total <> 2 then raise exception '0133: C1.2 27/Q3 expected 2 completions, got %', v_total; end if;
  if v_unique <> 1 then raise exception '0133: C1.2 unique 27/Q3 expected 1 person, got %', v_unique; end if;

  -- the third cycle ends in 27/Q4: a completion, not a new unique person
  select actual into v_total from public.v_indicator_actual where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q4';
  select unique_actual into v_unique from public.v_rmth_indicator_unique where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q4';
  if v_total <> 1 or v_unique <> 0 then raise exception '0133: 27/Q4 expected 1 completion and 0 unique, got % and %', v_total, v_unique; end if;

  -- the first completion withdrawn: the person's first qualifying completion is now the second cycle, same quarter
  update public.rmth_training_enrolment set met_criteria = false where id = v_e1;
  select unique_actual into v_unique from public.v_rmth_indicator_unique where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q3';
  if v_unique <> 1 then raise exception '0133: after withdrawing the first completion expected unique 1, got %', v_unique; end if;

  -- both 27/Q3 completions withdrawn: the person moves to 27/Q4. (Withdrawn by
  -- the criterion, not by soft delete: guard_soft_delete refuses the owner,
  -- which has no role, and the view treats the two the same way.)
  update public.rmth_training_enrolment set met_criteria = false where id = v_e2;
  select unique_actual into v_unique from public.v_rmth_indicator_unique where municipality_id = v_rmth and code = 'C1.2' and period_code = '27/Q4';
  if v_unique <> 1 then raise exception '0133: after withdrawing both 27/Q3 completions expected unique 1 in 27/Q4, got %', v_unique; end if;

  raise exception 'probe complete, rolling back' using errcode = 'P0001';
exception when others then
  if sqlerrm <> 'probe complete, rolling back' then raise; end if;
end $$;

-- ── grants as the client roles see them ──────────────────────────────────
do $$
begin
  if has_table_privilege('anon', 'public.v_rmth_indicator_unique', 'select') then
    raise exception '0133: anon can read v_rmth_indicator_unique';
  end if;
  if not has_table_privilege('authenticated', 'public.v_rmth_indicator_unique', 'select') then
    raise exception '0133: authenticated lost select on v_rmth_indicator_unique';
  end if;
end $$;
