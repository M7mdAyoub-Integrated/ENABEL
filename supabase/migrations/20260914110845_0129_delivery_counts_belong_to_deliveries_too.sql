-- ═══════════════════════════════════════════════════════════════════════════
--  0129 — a delivery's participant counts belong to the delivery
--
--  Found on 14 September 2026 by adding a delivery to an entrepreneurship
--  programme through the screen: the save answered
--
--      new row for relation "rmth_training_cycle" violates check constraint
--      "rmth_training_cycle_employability_only"
--
--  0125's constraint kept `enrolled_count`, `completed_count` and
--  `completed_women` for employability cycles (C1.1's "trainees" block).
--  The F0.2 sheet's delivery log -- "one row per cycle delivered: cycle
--  number, start date, end date, location, participants enrolled,
--  participants completing" -- records the first two per delivery, so the
--  constraint refused what the sheet asks for, and F0.1's enrolments, which
--  hang off a delivery, could not have followed.
--
--  `completed_women` stays employability-only: C1.1's "of whom women" has no
--  counterpart in the delivery log (F0.1 disaggregates by the enrolment's
--  own person). The delivery-log panel had also been swallowing the refusal
--  -- it closed only on success and showed nothing otherwise -- which is the
--  register's seventh shape from the screen side; fixed in the app in the
--  same commit.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.rmth_training_cycle
  drop constraint rmth_training_cycle_employability_only,
  add constraint rmth_training_cycle_employability_only check (cycle_kind = 'employability' or num_nonnulls(
    sector_id, sector_other, weeks, hours_per_week, modality_id, private_partner_names, academic_partner_names,
    academic_type_id, joint_development_met, completed_women) = 0);

-- ── verification, as the Ramtha admin, discarded ─────────────────────────
do $verify$
declare
  v_res  jsonb;
  v_prog uuid;
  v_ok   boolean;
begin
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.app_user where email = 'admin@ramtha.test'), 'role', 'authenticated')::text, true);
    set local role authenticated;

    v_res := public.save_rmth_record('rmth_training_programme', jsonb_build_object('row', jsonb_build_object(
      'programme_type', 'entrepreneurship', 'title', '0129 probe programme')));
    if (v_res->>'ok')::boolean is not true then raise exception '0129: programme insert failed: %', v_res; end if;
    v_prog := (v_res->>'id')::uuid;

    -- a delivery with its two counts is accepted and numbered
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'entrepreneurship', 'programme_id', v_prog, 'start_date', '2026-09-01', 'end_date', '2026-09-12',
      'location', 'x', 'enrolled_count', 15, 'completed_count', 12)));
    if (v_res->>'ok')::boolean is not true then raise exception '0129: a delivery with counts was refused: %', v_res; end if;
    if (select cycle_no from public.rmth_training_cycle where id = (v_res->>'id')::uuid) <> 1 then
      raise exception '0129: the delivery was not numbered 1';
    end if;

    -- "of whom women" is still C1.1's alone
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'entrepreneurship', 'programme_id', v_prog, 'start_date', '2026-10-01', 'end_date', '2026-10-12',
      'enrolled_count', 10, 'completed_count', 8, 'completed_women', 4)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'rmth_training_cycle_employability_only' then
      raise exception '0129: completed_women was accepted on a delivery: %', v_res;
    end if;

    -- and the other employability-only columns are still refused on a delivery
    v_res := public.save_rmth_record('rmth_training_cycle', jsonb_build_object('row', jsonb_build_object(
      'cycle_kind', 'entrepreneurship', 'programme_id', v_prog, 'start_date', '2026-10-01', 'end_date', '2026-10-12',
      'weeks', 2)));
    if v_res->>'result' <> 'invalid' or v_res->>'constraint' <> 'rmth_training_cycle_employability_only' then
      raise exception '0129: weeks was accepted on a delivery: %', v_res;
    end if;

    v_ok := true;
    reset role;
    raise exception using errcode = 'P0129', message = 'rollback the probe';
  exception
    when sqlstate 'P0129' then null;
  end;
  if not coalesce(v_ok, false) then raise exception '0129: the probe did not run to the end'; end if;
  if exists (select 1 from public.rmth_training_programme where title = '0129 probe programme') then
    raise exception '0129: probe rows survived the rollback';
  end if;
end $verify$;
