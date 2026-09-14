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

---

## Part 2 — roles and accounts (migrations 0116–0119, `manage-account`)

### The sixth role, and what did not change

`app_role_t` gained `super_admin` (0116). Nothing was collapsed: `coordinator`,
`data_entry`, `enumerator`, `partner_viewer` and `participant` are all still in
the enum with every policy they had; the last four are simply unassigned at the
moment, as the plan says. Three accounts are assigned today:

| account | role | municipality |
|---|---|---|
| `coordinator@shm.test` | `coordinator` | Sahel Horan |
| `admin@ramtha.test` | `coordinator` | Ramtha |
| `superadmin@shm.test` | `super_admin` | none — switches |

The five other build-phase test accounts keep their roles and are Sahel Horan's.

### The helpers (0117)

| | |
|---|---|
| `is_super_admin()` | `role = 'super_admin'` |
| `my_municipality()` | `coalesce(app_user.municipality_id, app_user.acting_municipality_id)` — the municipality the caller is working in |
| `can_see_municipality(m)` | super admin not switched in → true; super admin switched into X → `m = X`; anyone else → `m = their own` |

`is_coordinator()`, `is_staff()` and the newly created `can_write()` (05 §2 had
specified it; §15 records that it was never built) all admit `super_admin`, so
a super admin is a coordinator everywhere without a seventh literal in 199
policies.

**One deviation from the plan's letter.** The plan reads `my_municipality()` as
"null for super admin". Here a super admin who has *switched into* a
municipality gets that municipality back, because the switch is held in
`app_user.acting_municipality_id` — a fact the database knows — rather than in
browser state. §3.4 says the current municipality must be visible on every
screen "so nobody enters data against the wrong one"; if the choice lived only
in the browser, every query and every insert would have to carry it and the one
that forgot would write a Ramtha row into Sahel Horan with a green toast. With
the acting municipality on the account, the column default from 0112 fills it
into every insert and `can_see_municipality` narrows every read to it. A super
admin who has not switched in sees both programmes and can insert nothing
(NOT NULL refuses); the `MunicipalityGate` in `App.tsx` holds them at a chooser
until they pick one. The accounts screen and settings need no municipality.

### The account shape

`app_user.municipality_id` is null **iff** the role is `super_admin`, required
for every other staff role, and free for a `participant` — the one exception
taken here, because a participant is a person and person is shared (the plan's
own first decision). `acting_municipality_id` may be set only on a super admin.
Both are check constraints.

`guard_app_user()` (BEFORE UPDATE, fires for the owner too) refuses: changing
your own role; deactivating your own account; demoting or deactivating the last
active super admin; and, for a non-super-admin, minting a super admin, moving an
account between municipalities, or touching a super admin's row at all. The
accounts screen renders these refusals with their own words (`errors.ts` maps
the five messages) rather than the generic "your role does not allow this",
which was the first thing the screen showed and was true and useless.

### Every scoped policy, by catalogue walk (0118)

All 202 policies in `public` were dropped and recreated from their own
catalogue expression with three textual changes: role literals became the
helpers; on the 35 scoped tables `can_see_municipality(municipality_id)` was
ANDed onto USING **and** WITH CHECK (a USING-only change would let an admin
write into the other municipality — the `fu_update` shape); and every policy
became `to authenticated`, which closes OQ-35. Three policies with an own-row
branch for a participant were rewritten by hand so the municipality test sits on
the staff branch only.

`app_user` and `audit_log` were rewritten by hand. The three exposed indicator
views gained the municipality gate in their WHERE (they are security definer, so
table RLS does nothing for them). `indicator_figures` and `overview_counts` —
security definer, exposed, uncalled by the app — gained `p_municipality_id`
and a gate. `review_followup`'s period lookup now says whose period.

**Verified inside the migration as all three account shapes**, through RLS with
`set local role authenticated` and the claims set, in a savepoint that was
discarded: the Ramtha admin sees zero rows of every scoped table and cannot
write a row carrying Sahel Horan's id; the Sahel Horan admin sees no Ramtha row
and cannot write one; the super admin sees both, and only Sahel Horan once
switched into it. 0118 created the two probe accounts itself, as auth rows with
app metadata, which is where the next finding came from.

### Creating accounts, and the finding

`manage-account` (an Edge Function, `supabase/functions/manage-account/`) is the
one place a login is created or a password set, because both need the Auth
admin API and therefore the service-role key, which never reaches a browser.
Only an active super admin may call it, checked against `app_user` and never
against the request. Everything else about an account — role, municipality,
active or not — is a plain UPDATE on `app_user` from the accounts screen, under
RLS and the guard.

The first super admin was bootstrapped out of band (an auth row inserted
directly, the shape 0031 repaired), because nobody existed who could call the
function. Its password, and the Ramtha admin's, live in `app/.env.local` under
`SHM_TEST_PW_*` with the six that were already there. `scripts/demo-as.mjs`
switches which of them demo mode signs in as.

**The finding.** 0118's probe inserted an auth row with `app_role` and
`municipality_id` already in `raw_app_meta_data`, and `handle_new_user` shaped
the account from it, and the probe passed. GoTrue's admin API does not insert
that way: it writes the row first and applies the caller's `app_metadata`
afterwards, so the AFTER INSERT trigger saw `{provider, providers}` and shaped
the first real account as a participant with no municipality. The function's
read-back — *not assumed* — is what caught it, on its first real call. It now
shapes `app_user` explicitly as the service role and reads it back before
reporting success; the trigger stays as a default for rows created with the
metadata present. Recorded in the CLAUDE.md register.

### What the screens do

The header of every municipal screen names the municipality and its programme
line from the `municipality` row (0119 added `programme_en/ar`; the locale
strings said "Sahel Horan" to everyone). A super admin gets the switcher there;
a municipal account has no switcher, because its municipality comes from its
account and never from the URL. `/accounts` lists every account (email is now
on `app_user`, copied from `auth.users` where `authenticated` cannot read),
creates one with a generated one-time password shown once, changes role or
municipality, sets a password, deactivates and reactivates.

---

## Part 3 — routing and the public side (migrations 0120–0121)

### One public site per municipality

```
/                          the chooser; redirects when only one municipality is active
/sahel-horan               Sahel Horan's public home
/sahel-horan/opportunity/:id
/sahel-horan/apply/:id
/sahel-horan/linkage
/sahel-horan/my-applications
/ramtha                    Ramtha's
/ramtha/my-applications
```

The prefix is the `slug` of an active `municipality` row, resolved on every
public page through `v_public_municipality`; anything else under `/:slug` is
the public site's own not-found page, which is also where a mistyped
single-segment path now lands instead of on the staff sign-in. The four paths
the site had before — `/opportunity/:id`, `/apply/:id`, `/linkage`,
`/my-applications` — redirect to `/sahel-horan/…`, because every link printed
or sent before 13 September 2026 was Sahel Horan's.

The masthead names the municipality from its row (0121 made the English name
the organisation's, "Sahel Horan Municipality", to match the Arabic) and gives
a plain-language programme line from public copy — Sahel Horan's page keeps
"Agriculture and Food Production Programme", the wording it has always had;
Ramtha's is its plan's own description. The staff header's "View public site"
goes to the current municipality's page.

### One more view than the plan's letter

§3.2 of the plan: *"anon still reaches exactly the four public views and the
two RPCs. Do not widen the surface."* The surface is now **five views and
four RPCs** (the plan's "two" predates `my_applications` and
`request_linkage`). The fifth view, `v_public_municipality`, carries slug,
code, the two names and the two programme lines of each active municipality:
the text on the poster and nothing else — no id, no counts, no person.

The alternative was a list of municipalities in the bundle. That is a claim
about the database that nothing checks (CLAUDE.md, *a placeholder is a claim*):
the public masthead would name a municipality from a locale string while the
staff header names it from the row, and a municipality deactivated in the table
would keep a live public page. The rule the widening bends exists to keep
personal data off the open internet; this carries none. `05 §9` check 3, `05
§10` and `07` check 5/5a were changed to the allow-list of five in the same
commit, so the check still fails on a sixth. 0111's header had already named
the view as the way the public site would read the two columns.

### Identity is shared; history is not

`person` is one table for both programmes, so a Ramtha page may confirm that
a national ID and date of birth belong to someone on file (`applicant_prefill`
returns the same four identity fields on either page). It may never say what
that person did in Sahel Horan's programme, and before 0120 three things
said exactly that:

| | before | after 0120 |
|---|---|---|
| `my_applications` | every application the person ever made | those in the asking municipality |
| `request_linkage` | `wrong_track` / `ineligible` / `requested` from advisories anywhere — which told a Ramtha page whether the person had completed one in Sahel Horan, and would have created a Ramtha linkage request on the strength of it | the page's municipality's advisories only |
| `apply_for_opportunity`, advisory branch | a completed training anywhere | a completed training in the opportunity's municipality |

The two triggers that decide — `check_advisory_eligibility`,
`check_linkage_eligibility` — moved in the same migration as their RPC
copies, as 0106 did, so the two copies of each rule still agree.

Every RPC takes `p_municipality_slug`; the page passes its own. Unsaid means
Sahel Horan (0115's decision, for the same reason as the redirects); unknown or
inactive means the same byte-identical miss as a wrong date of birth, so a page
that is not live learns nothing. `apply_for_opportunity` keeps 0115's shape:
the row is written with the opportunity's municipality, and a page for the
other one is answered `not_open`.

Verified in 0120 as `anon`, in a discarded savepoint, with the one person on
file who completed a Sahel Horan market advisory: found on the Ramtha page,
no history on the Ramtha page, all of it on the Sahel Horan page;
`ineligible` (not `wrong_track`) from the Ramtha linkage page and through the
gate on Sahel Horan's; both triggers refusing a Ramtha row on Sahel Horan
history and accepting the same person on a Sahel Horan session; the public
list separating a probe Ramtha session from Sahel Horan's unchanged eight rows.

### What Ramtha's public page is

Nothing in Ramtha's seventeen forms is a public journey: its residents are
recorded by staff at events, in training cycles, in incubators. So
`/ramtha` today is a masthead, an empty "open now" list drawn live from the
same view as Sahel Horan's, and "check an application I made". The
market-linkage panel and `/ramtha/linkage` are not offered — `hasLinkageJourney`
in `PublicSite.tsx` is the one place that says which programme runs that
journey, and the database answers `ineligible` on a Ramtha page regardless.
If Ramtha is later given something to apply to, it publishes through the same
three tables and appears on its page with no further routing work.

### Not changed

Sahel Horan's public list returns the same eight rows, asserted inside 0120
against a copy taken at its start; the baseline hashes of
`v_indicator_disaggregated` and `v_indicator_progress` match after 0120 and
0121. No indicator view was touched.

---

## Part 4 — Ramtha's domain tables (migrations 0122–0126)

### What the seventeen sheets said, read in full first

Every sheet of `RMTH_indicator_forms.xlsx` states its unit of observation,
who completes it, when, **how the indicator is calculated from it** (that line
is the specification, quoted in the migration headers and never paraphrased),
the required disaggregation, and its fields with the response options. The
index adds seven open items, the identifiers it issues, the never-sum rule for
A1.2/A1.3, and two gaps in the framework (SO1-A1 has no statement; E0.3 is a
proposed code). The Framework workbook's `English_form` has no targets at all;
its `English Copy` has targets against a different indicator list.

### Seventeen forms onto ten record tables (0125)

| table | forms | what one row is |
|---|---|---|
| `rmth_event` | A1.2, A1.3 | a networking event or a guidance session — `event_kind`, one kind each, a session may name its parent networking event |
| `rmth_proposal` | B1.2 | a proposal, which on approval *is* the project B1 and B1.1 quote |
| `rmth_training_programme` | B1.1, F0.2 | a specialised or an entrepreneurship programme |
| `rmth_training_cycle` | C1.1, E0.3, F0.2's delivery log | an employability cycle (RMTH-TC), an incubator-design cycle (RMTH-ID), or one delivery of an entrepreneurship programme |
| `rmth_training_enrolment` | C1.2, E0.3, F0.1 | a person on a cycle, kind copied from the cycle |
| `rmth_project_implementer` | B1 | one implementer (not one project), with `rmth_implementer_support` as its grid |
| `rmth_incubator` | E0.1 | an incubator, with `rmth_incubator_service_live` as criterion 5 |
| `rmth_enterprise` | — | the RMTH-EN entity E0.2 and SO3-0 issue |
| `rmth_incubation_service` | E0.2 | one participant in one incubator |
| `rmth_outcome_survey` | IMP-0, SO1-0, SO2-0, SO2-C1, SO3-0 | one follow-up, `survey_kind`, each kind kept to its own columns by check constraint |

Departures from the plan's list, each argued in 0125's header: no
`rmth_project` (the approved proposal is the project — B1.2's own words); an
`rmth_enterprise` is added (E0.2: "one ID per ENTERPRISE, not per person");
incubator-design training is a cycle kind, not a programme type (E0.3 quotes
RMTH-ID cycle references); F0.1 enrolments hang off a delivery row rather than
the programme, so F0.2's log and F0.1's roster are one set of dates. The five
outcome surveys are one table, as the plan read them and as the sheets bear
out: the identification block is identical, the questions are not.

Every multi-select is a row in the table's single `rmth_<table>_option`
junction — the shape 0075 gave the follow-up survey — guarded by
`guard_rmth_option` (0124), which knows which lists belong on which table and
refuses an "Other" with nothing specified. Every single-select is a real
foreign key into its own `ref_rmth_*` list, and `guard_rmth_other` enforces the
companion `*_other` column in both directions.

### The 106 option lists (0122)

One `ref_rmth_*` table per response list, 613 options, English **verbatim**
from the sheets in the sheets' order — checked by script against the workbook
text, not by eye (every one of the 613 labels was found in the workbook after
normalising the `_______` blanks). Seven lists serve more than one sheet and
exist once; where two sheets' lists differ by a single option they are two
tables, and no Sahel Horan list was borrowed (Ramtha's nationality list is
three options, not `ref_nationality`'s four). `supabase/ramtha/lists.py` is
the catalogue; `gen_0122.py` wrote the migration from it.

**Arabic.** The workbook has no Arabic for the forms. The 613 labels carry
Arabic drafted for this platform under OQ-32's rule (a plain phrase may be
drafted; a named regulatory artefact may not be invented) rather than null,
because a Ramtha enumerator reading a form in Arabic with English options is
not using a bilingual form. OQ-46 lists them for the Municipality's review and
names the evidence lists that mention documents.

### The counting fields (plan §5.3)

Six are judgements and are stored as decisions with who and when, stamped by
`rmth_stamp_decision` whenever the value changes: `solely_guidance` (A1.2 —
`false` is "No, record it here" and counts; `true` belongs under A1.3 and does
not), `tailoring_met` (B1.1), `development_complete_id` (F0.2),
`joint_development_met` (C1.1), `met_criteria` (C1.2, E0.3, F0.1),
`established_id` (E0.1). Four "must follow arithmetically" from numbers the
form records (IMP-0's months, SO3-0's months of six, C1.1's weeks and hours,
SO2-0's placement date): the recorded answer is kept as the sheet has it and
the view (Part 6) recomputes from the numbers and the threshold, so a
disagreement is visible. Two derive from other answers (SO1-0's threshold from
its three questions; B1's numerator and denominator from the grid and three
conditions) and are computed by the save function into their columns.

B1.2's "counted once, on first approval" is `first_approved_on`, set by
trigger the first time the decision is an approval and refused any later
change, so a proposal later rejected stays in the quarter it was counted in.

### The seven open items (0123)

`rmth_threshold` holds ten rows for the index's seven items, every value
null, each with the open item's text in both languages. The views read the
value through `rmth_threshold_numeric/text/bool`; a null makes the indicator
**not computable**, named, never zero. Answering is an UPDATE with
`decided_by` and `decided_on` — a data change, not a migration. OQ-47.

### Identifiers (0124)

`rmth_next_reference` issues `RMTH-EV-2026-001`-shaped references per
municipality code, prefix and year under a row lock; `rmth_assign_reference`
fills a null `reference` on insert (EV/VG by event kind, TP/EP by programme
type, TC/ID by cycle kind, PP, IN, EN), taking the year from the record's own
date where it has one. A reference typed from a paper form is kept if it has
the shape. Entrepreneurship deliveries are numbered within their programme
(`cycle_no`) instead, as F0.2's log has it.

### Evidence (0126)

The `evidence` bucket's three policies said `is_staff()` and nothing about
municipality: a Ramtha enumerator who knew the path could read a Sahel Horan
photograph. Every object now lives under `<municipality_id>/<entity_type>/
<entity_id>/`, the first folder is what the bucket policies check through
`can_see_municipality`, `attachment.storage_path` must start with its row's
municipality, `entity_type` is constrained to the tables that carry evidence,
and removal is a coordinator's (soft-delete the row, then the object). The
0012 update policy is dropped: an object is replaced, never edited. Verified
as both admins in a discarded savepoint. The screen half is Part 5.

### Verified

Inside each migration, as the owner for the mechanics and as the two admins
for the gate, all discarded: references issue per kind and year and carry the
municipality's code; a session cannot parent a session; a guidance session
refuses a networking column; an "Other" without its text is refused; the
option junction refuses a survey question on an event and an option from the
wrong list; a deferred proposal is not counted, an approval sets
`first_approved_on`, a later rejection does not move it; a delivery row gets no
reference and an employability cycle refuses a programme; an enrolment takes
its cycle's kind and its decision is stamped; the Sahel Horan admin sees no
Ramtha row and cannot write one; the Ramtha admin sees the probe rows, the
column default fills Ramtha, and the junction DELETE is permitted. Sahel
Horan's baseline hashes are unchanged after 0122–0126; every Ramtha table has
zero rows.
