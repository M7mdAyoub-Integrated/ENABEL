# Both municipalities' baseline — captured 2026-09-16, before the field-by-field form audit

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0135`, through the
MCP (owner, no JWT — the right connection for a baseline, the wrong one for any claim
about a signed-in user). **Every figure below must read the same at the end**, except
where a step is documented as changing one.

## The indicator matrix

Both municipalities' `v_indicator_actual` lines — Sahel Horan's 20 and Ramtha's 17 —
hash to `c18e5dfd2bc65eaedbd2ded1935db17a` over 37 lines, identical to
`2026-09-15_both_before_dashboard.md` and `2026-09-16_both_before_platform_modal.md`
(same query as those files).

## Whole-view hashes, per municipality — all seven identical to 15 and 16 September

| view | muni | rows | md5 of every row, sorted |
|---|---|---|---|
| `v_indicator_actual` | SHM | 260 | `59eafe143eb80c8b7544f3786ee15f2c` |
| `v_indicator_actual` | RMTH | 221 | `7f4013e1737301544c8271ce8ccc92c6` |
| `v_indicator_progress` | SHM | 260 | `fdbbbd818f2da34653ad0720dd434b43` |
| `v_indicator_progress` | RMTH | 234 | `a108297fee4ae3a09e760607f24df900` |
| `v_indicator_disaggregated` | SHM | 7 | `208d1a04c22569ac7bb311f1f81c6868` |
| `v_rmth_indicator_status` | RMTH | 18 | `50bccbbcb38f22de64f6a26ff6e5ef3f` |
| `v_rmth_indicator_unique` | RMTH | 39 | `661c10c777b42c3456a19929cdf8547b` |

## Row counts, every non-`ref_` table (live / soft-deleted; `-` = no `deleted_at`)

Equal to the 16 September platform-modal file's end state: `audit_log` 2869,
`rmth_reference_counter` 2 (TC/2026 and EV/2026 both at 1, both kept),
`rmth_training_cycle` 0/1, `person` 4/3, `training_enrolment` 5/5, `training_session` 8/3,
and every other table as the 15 September file lists it.

One md5 over every `relname live/del` line, ordered by name:
- all tables: `77d595f3b98ddfb9ad4ad98cf4c0e1ca`
- every table except `audit_log`: `d89e05c13003199e5b01f3c244f4294e`

(This md5 is over a `name live/del` line per table, newline-joined; it is not the same
string the 16 September file hashed, so the two md5s are not comparable to each other —
only to their own re-run at the end.)

## Checks run at the start

- `check_migration_files.sh`: 134 exact, 2 expected-divergent (0030, 0031), PASS
- `check_municipality_scope.sql`: 40 views read `reporting_period`, none duplicates its
  key; RMTH holds no records and shows no figure; every function reading
  `reporting_period` names a municipality. PASS
- `git status`: clean at `f1920ee`
