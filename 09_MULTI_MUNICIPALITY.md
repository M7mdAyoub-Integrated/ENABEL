# 09 — Two municipalities on one platform

How Ramtha was added beside Sahel Horan without either seeing the other, and the
decisions taken on the way that the plan (`RAMTHA_IMPLEMENTATION_PLAN.md`) left
open or that this build departed from. Written as the work was done, one section
per part, so that nothing here is recalled.

---

## Part 1 — tenancy on the existing schema (migrations 0111–0115)

### The shape

`municipality` is the anchor. Two rows, at fixed ids:

| code | slug | id |
|---|---|---|
| `SHM` | `sahel-horan` | `00000000-0000-4000-8000-00000000005a` |
| `RMTH` | `ramtha` | `00000000-0000-4000-8000-0000000000a1` |

Every table that belongs to one programme carries
`municipality_id uuid not null references municipality(id) default my_municipality()`.
Every row that existed on 13 September 2026 is Sahel Horan's and was backfilled
that way, table by table, with the three-step pattern (add nullable → backfill →
set not null), and each table verified before the next.

### What is scoped, and three decisions the plan did not make

The plan's list — framework (6), Sahel Horan operational (17), partners (3) — is
scoped as written. Three things go further, each argued in 0112's header:

1. **Partners are scoped** (the plan's reading, confirmed). A partnership is one
   municipality's agreement; G0.4 counts contributions per programme.
2. **The seven child tables carry the column too** — `partnership_role`,
   `coordination_meeting_partner`, `exhibition_registration_product` and the four
   `followup_*` children. The plan does not name them. Scoping them through the
   parent would have meant an `EXISTS` in every policy that somebody has to
   remember, and `fu_read` on the survey children checks only the caller's role —
   a Ramtha coordinator would have been able to read the answers to a Sahel Horan
   interview. Composite foreign keys (0113) make a child unable to disagree with
   its parent about which municipality it is in.
3. **`attachment` is scoped**, although the plan lists it as shared. Its owner is
   polymorphic (`entity_type`, `entity_id`), so it cannot be scoped through a
   parent, and evidence is municipal. Zero rows, so the backfill was free.

**`audit_log` stays one shared table** but each row is stamped with the
municipality of the record it describes (`audit_row()` reads the row's own
`municipality_id`); rows about shared tables carry null. The 1 245 existing rows
about scoped tables were stamped Sahel Horan in 0112 — an UPDATE on `audit_log`,
done once, as the owner, on a column that did not exist when they were written,
touching nothing else in them. Recorded here because CLAUDE.md rule 2 reserves
that table.

Not scoped: `person`, `person_activity_type`, every `ref_*`, `app_user` (it has
a municipality of its own), `applicant_lookup_secret`, `applicant_lookup_throttle`.

### The default, and why no insert site in the app changed

`my_municipality()` (0112) returns `app_user.municipality_id` for the signed-in
account. As a column default it fills every insert the application makes with
the actor's municipality, so not one `.insert(` in `app/src` had to change. A
caller with no municipality — `anon` through a public RPC, a migration, a super
admin who has not chosen one (Part 2) — gets null and is refused by NOT NULL,
loudly. That is the right failure: a row in the wrong municipality is invisible;
a refused row is not.

Two triggers and two public RPCs insert from such a context and were repaired in
0115 to say which municipality: `apply_for_opportunity` takes it from the
opportunity, `request_linkage` from the page's slug (Sahel Horan when unsaid),
`sync_auto_contribution` and `contribution_from_meeting` from the partnership or
meeting being credited. Between 0112 and 0115 every public application was
answered `not_open`; the repair was tested as `anon` in a rolled-back probe.

### Unique keys

Twelve unique keys now lead with `municipality_id` (0113): the five `code` keys
(`objective`, `activity`, `indicator`, `reporting_period`, `milestone`),
`partner (name, unit)`, and the six partial `_live` / junction keys. Left global,
and why: `client_uuid` (a v4 uuid, and OQ-24's idempotency argument);
`partner_contribution_one_per_entity`; `(survey_id, seq)`; the child primary
keys, which lead with a scoped uuid and are the index the section-save functions
use; `person.national_id`; every `ref_*.code`.

**Ramtha's short codes are not prefixed.** `indicator.code` stays `A1.2` for both
programmes, unique on `(municipality_id, code)`; the full code
(`RMTH-SO1-A1.2`) is derived from the municipality and objective rows. A code
that carries its municipality twice can be written inconsistently.

### The views, and why they had to move first

Every Sahel Horan leaf view joined `reporting_period` by date range with no
municipality filter. The day Ramtha's periods were seeded, `27/Q1` would exist
twice, every Sahel Horan record would match both, and GROUP BY would fold them —
A1.3 reading 6 where it reads 3 — with no error anywhere. 0114 anchors all
twenty on `municipality m where m.code = 'SHM'` and joins data on
`municipality_id = m.id` as well as on date, **before** any Ramtha period
exists. Each of 0112, 0113 and 0114 asserts inside the migration that
`v_indicator_actual` is unchanged against a copy taken at its start; the
whole-view hashes in `supabase/baselines/2026-09-13_shm_before_ramtha.md` were
re-checked on the original column projections after 0114 and match.

`v_indicator_actual`, `v_indicator_progress` and `v_indicator_disaggregated`
gained `municipality_id` as a last column and, in Part 2, a municipality gate.

### Found on the way

Four of the twenty leaf views (`v_ind_a1`, `v_ind_b1`, `v_ind_c1`,
`v_ind_imp_0`) had SELECT granted to `authenticated`. They are security-definer
views over `followup_survey`, and 07_BUILD_CHECKLIST.md's step b says
`authed_select` must be false for all twenty. They were recreated between 0080
and 0098 and regained the schema's default grant; nothing revoked it and nothing
checked. Aggregates only — but the check existed and had been false for a month.
0114 revokes all twenty and asserts it. See the CLAUDE.md register.
