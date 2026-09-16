# Both municipalities' baseline — captured 2026-09-16, before the platform modal and account filters

Captured from the live project `ocjdsqwhcekyzeqrrznc` at migration `0135`, through the
MCP (owner, no JWT — the right connection for a baseline, the wrong one for any claim
about a signed-in user). **Every figure below must read the same at the end.**

## The indicator matrix

Both municipalities' `v_indicator_actual` lines — Sahel Horan's 20 and Ramtha's 17 —
are **identical, line for line, to `2026-09-15_both_before_dashboard.md`**, taken with
the same query. One md5 over the 37 lines ordered by municipality then code:
`c18e5dfd2bc65eaedbd2ded1935db17a`.

```sql
with lines as (
select m.code as muni, s.line from (
  select a.municipality_id, a.code, a.code || ' | ' || string_agg(coalesce(a.actual::text,'∅')
         || case when a.denominator is not null then '/'||a.denominator::text else '' end,
         ' | ' order by a.period_code) as line
  from public.v_indicator_actual a
  group by a.municipality_id, a.code) s
join public.municipality m on m.id = s.municipality_id)
select md5(string_agg(line, E'\n' order by muni, line)), count(*) from lines;
```

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

## Row counts — equal to the 16 September file's end state, with one movement

```
audit_log   2861 → 2864   insert-only; three acting_municipality_id switches by the super admin,
                          16 Sept 07:13–07:26 UTC, after that file's end note was written
```

`rmth_reference_counter` 2 (TC/2026 and EV/2026, both at 1, both kept — 09 Part 7 and
Part 10), `rmth_training_cycle` 0/1, every other table's live and soft-deleted counts
equal the 15 September file's.

## Accounts

Eight. `superadmin@platform.test` has `acting_municipality_id` **null** at the start of
this work. No account is deactivated.

## Checks run at the start

- `check_migration_files.sh`: 134 exact, 2 expected-divergent (0030, 0031), PASS
- `git status`: clean at `cf27907`

## At the end of the work (same day)

Re-run with the same queries, as the owner through the MCP:

- the 37-line matrix: md5 `c18e5dfd2bc65eaedbd2ded1935db17a`, identical;
- all seven per-municipality view hashes identical to the table above;
- every table's live and soft-deleted counts identical (one md5 over every line
  except `audit_log`, `14a9eeaf806746e62bc238c9923c4aee`, at the start and at the end);
- `audit_log` 2864 → 2869: five `app_user` updates by the super admin, all
  `acting_municipality_id` — the switches the verification made (into Ramtha by
  address, into Sahel Horan by address, and back to none from the header);
- eight accounts, all active, `superadmin@platform.test` acting nowhere. The
  deactivation confirmation was opened for the nested-Escape test and never
  confirmed; `dataentry@shm.test` is active.

The coordinator write probe (a Sahel Horan coordinator deactivating a colleague
and changing a role, both permitted by `au_update`, OQ-51) ran inside
`begin … rollback` and left nothing: both rows read back unchanged afterwards.
