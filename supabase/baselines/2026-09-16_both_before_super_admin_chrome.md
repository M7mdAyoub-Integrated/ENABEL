# Both municipalities' baseline — captured 2026-09-16, before the super admin chrome work

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0135`, through the
MCP (owner, no JWT — the right connection for a baseline, the wrong one for any claim
about a signed-in user). **Every figure below must read the same at the end.**

## The indicator matrix

Both municipalities' `v_indicator_actual` lines — Sahel Horan's 20 and Ramtha's 17 —
are **identical, line for line, to `2026-09-15_both_before_dashboard.md`**, taken with
the same query. They are not repeated here; that file is the reference.

## Whole-view hashes, per municipality — all seven identical to 15 September

| view | muni | rows | md5 of every row, sorted |
|---|---|---|---|
| `v_indicator_actual` | SHM | 260 | `59eafe143eb80c8b7544f3786ee15f2c` |
| `v_indicator_actual` | RMTH | 221 | `7f4013e1737301544c8271ce8ccc92c6` |
| `v_indicator_progress` | SHM | 260 | `fdbbbd818f2da34653ad0720dd434b43` |
| `v_indicator_progress` | RMTH | 234 | `a108297fee4ae3a09e760607f24df900` |
| `v_indicator_disaggregated` | SHM | 7 | `208d1a04c22569ac7bb311f1f81c6868` |
| `v_rmth_indicator_status` | RMTH | 18 | `50bccbbcb38f22de64f6a26ff6e5ef3f` |
| `v_rmth_indicator_unique` | RMTH | 39 | `661c10c777b42c3456a19929cdf8547b` |

## Row counts — three documented movements since 15 September, nothing else

```
audit_log              2804 → 2856   insert-only; the 15 September session's own writes
rmth_reference_counter    0 → 1      the TC/2026 counter at 1 — spent by the probe cycle, kept (09 Part 7)
rmth_training_cycle     0/0 → 0/1    RMTH-TC-2026-001, the probe, soft-deleted the same day (09 Part 7)
```

Every other table's live and soft-deleted counts equal the 15 September file's.

## Accounts

Eight. `superadmin@platform.test` has `acting_municipality_id` **null** at the start
of this work (it was RMTH at the start of the 15 September session).

## Checks run at the start

- `check_migration_files.sh`: 134 exact, 2 expected-divergent (0030, 0031), PASS
- `check_municipality_scope.sql`: all three groups passed as the owner

## At the end of the work (same day)

All seven view hashes above identical; both matrices identical to 15 September
(one md5 over every line of both: `586257485961af14853f3493d26932e2`). Row counts
identical except two documented movements:

```
audit_log               2856 → 2861   the probe event's insert, its removal, two acting-municipality switches
rmth_reference_counter     1 → 2      EV/2026 now stands at 1 — spent by RMTH-EV-2026-001, the probe; kept, as TC/2026 is
```

The super admin is back to `acting_municipality_id` null. 09 Part 10 has the probe.
