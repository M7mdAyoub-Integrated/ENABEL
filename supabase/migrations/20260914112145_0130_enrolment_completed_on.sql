-- ═══════════════════════════════════════════════════════════════════════════
--  0130 — the date on E0.3's "Trainer name and date"
--
--  Found on 14 September 2026 by saving an E0.3 record through the screen:
--  save_rmth_record answered `unknown_column: completed_on`. That refusal is
--  0127 doing what it was written to do -- a column the form sends and the
--  table does not have is refused, not dropped -- and the form was right:
--  the E0.3 sheet closes with "Trainer name and date: Name / Date", where
--  C1.2 and F0.1 close with "Trainer name" alone. 0125 gave the enrolment
--  table `trainer_name` and no date.
--
--  Nullable, on every enrolment kind: the two other sheets simply do not ask
--  for it, and a constraint reserving it for incubator-design enrolments
--  would be a second copy of "which sheet has a date" for someone to keep in
--  step with forms.py.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.rmth_training_enrolment
  add column completed_on date;

comment on column public.rmth_training_enrolment.completed_on is
  'E0.3''s "Trainer name and date" -- the date the trainer completed the record. '
  'C1.2 and F0.1 ask for the name only, so it stays null there.';

-- ── verification, as the Ramtha admin, discarded ─────────────────────────
do $verify$
declare
  v_res jsonb;
  v_cyc uuid;
  v_ok  boolean;
begin
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'incubator_design', 'title', '0130 probe cycle', 'start_date', '2026-08-03', 'end_date', '2026-08-07')));
    if (v_res->>'ok')::boolean is not true then raise exception '0130: cycle insert failed: %', v_res; end if;
    v_cyc := (v_res->>'id')::uuid;
    v_res := public.save_rmth_record('rmth_training_enrolment', jsonb_build_object(
      'person', jsonb_build_object('national_id', '399000009', 'full_name', '0130 Probe', 'sex', 'male'),
      'row', jsonb_build_object('cycle_id', v_cyc, 'age_years', 40, 'trainer_name', 'x', 'completed_on', '2026-09-14')));
    if (v_res->>'ok')::boolean is not true then raise exception '0130: an enrolment with completed_on was refused: %', v_res; end if;
    if (select completed_on from public.rmth_training_enrolment where id = (v_res->>'id')::uuid) <> date '2026-09-14' then
      raise exception '0130: completed_on was not written';
    end if;
    v_ok := true;
    reset role;
    raise exception using errcode = 'P0130', message = 'rollback the probe';
  exception
    when sqlstate 'P0130' then null;
  end;
  if not coalesce(v_ok, false) then raise exception '0130: the probe did not run to the end'; end if;
  if exists (select 1 from public.person where national_id = '399000009') then
    raise exception '0130: probe rows survived the rollback';
  end if;
end $verify$;
