# 09 — Three municipalities on one platform

How Ramtha was added beside Sahel Horan without either seeing the other, and the
decisions taken on the way that the plan (`RAMTHA_IMPLEMENTATION_PLAN.md`) left
open or that this build departed from. Written as the work was done, one section
per part, so that nothing here is recalled. Part 12 is Al Khalidiyah, the third,
added the same way from `KHALIDIYAH_IMPLEMENTATION_PLAN.md`.

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
| `superadmin@platform.test` (was `superadmin@shm.test` until 15 September 2026 — it was never Sahel Horan's) | `super_admin` | none — switches |

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
until they pick one. Accounts and settings need no municipality (Part 10).

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
account and never from the URL.

Since 15 September 2026 the super admin's choice also has an address. It
still lives in the database — `app_user.acting_municipality_id`, read by
every policy and every column default — and `?m=<slug>` on every municipal
route is kept equal to it in both directions (`ActingMunicipalityUrl`): the
slug is written from the choice, an address naming another active
municipality switches the choice, an unknown slug is dropped, and a
municipal account's parameter is removed. A switch remounts the screen
(the Outlet is keyed on the acting municipality), because a switch made by
the URL happens on whatever screen is open and a mounted query answered
under the old municipality would otherwise stay. The header carries a super
admin's eyebrow — "super admin · acting on" — above the name, and the account
chip at the foot of the rail names the municipality too. *Until 16 September
2026 a super admin also got one public-site link per municipality, listed
together, and the sidebar mixed the platform's administration into the
programme's forms; Part 10 has what replaced both.* `/admin` is
the staff entrance: signed out it is the sign-in form, signed in it is the
home the role implies; nothing on the public side links to it.

The accounts screen (`/accounts`; since Part 10 the Accounts tab of the
platform panel — a dialog since Part 11 — which that address opens) lists every account (email is now
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

---

## Part 5 — the seventeen forms (migrations 0127–0130, `app/src/rmth`)

### One screen, seventeen definitions

`supabase/ramtha/forms.py` is the catalogue: every field of every sheet,
typed, with its Arabic. `gen_forms.py` turns it into
`app/src/rmth/forms.generated.ts` (structure only) and both `rmth.json`
locales (every English label looked up in the sheet and the generator failing
on any that is not there). `RmthFormScreen` renders whichever of the seventeen
the URL names; `RmthListScreen` and `RmthDetailScreen` the same. Adding a
field is an edit to the catalogue and a regeneration, never to a screen.

`save_rmth_record` (0127) is the one write path for the ten tables: the
person spine (lookup-and-lock on national ID, a new person created in the
shared table, a soft-deleted one refused with *restore, do not recreate*),
the header, every multi-select replaced by delete-then-insert with a
read-back inside ONE exception block, the children (B1's support grid,
E0.1's live services, the proposal links), and the derivations the sheets
say "must follow" — B1's flags from the grid, SO1-0's threshold from its
three questions, SO2-0's three-month point, and `counted_under_id` worked out
from the records rather than asked blind. A column the payload names and the
table lacks is refused as `unknown_column`, not dropped; that refusal found
0130.

### The Arabic statements

The framework workbook's Arabic Copy sheet translates the *English Copy*
list, not the form list (the two lists do not correspond — plan §6.2). Where
a form's statement is the English Copy's, its Arabic is the workbook's
verbatim (IMP-0, C1.2, F0.1, F0.2, SO3-0); A1.2 and A1.3 take the two halves
of the sheet's own "networking events … and vocational guidance sessions",
kept apart because the index says never to sum them; the other ten are
drafted from the form's English under OQ-32's rule and listed for review with
OQ-46. `STATEMENT_AR` in `forms.py` carries the source of each.

### Found by opening the screens, and by saving through them

Every form was created through its screen as the Ramtha admin, read back on
its detail page, and checked in the database. Four things could not have
been found any other way:

- **E0.3 had a picker with nothing to pick.** Its enrolments hang off an
  incubator-design cycle, and no form made one — C1.1 makes employability
  cycles, F0.2's log makes entrepreneurship deliveries. The E0.3 sheet
  carries the cycle block on the participant form, so the picker now offers
  to add one there, with the sheet's own four rows.
- **A delivery could not be saved, and the screen said nothing.** 0125's
  `rmth_training_cycle_employability_only` reserved `enrolled_count` and
  `completed_count` for C1.1, but F0.2's delivery log records both per
  delivery. 0129 lets them through. The deliveries panel had checked only
  `res.ok` to close itself, so the refusal never reached the screen — the
  register's seventh shape from the other side; it renders the refusal now.
- **E0.3's trainer date had no column.** The sheet closes with "Trainer name
  and date"; C1.2 and F0.1 with "Trainer name". 0130 adds `completed_on` to
  the enrolment table.
- **Three sheets word the already-counted question three ways**, and E0.2's
  is inverted (*"Yes — count as a new unique participant"*). One shared
  string said "No — count this person" on all seven; each field now carries
  its sheet's own two answers.

And one thing the sweep for raw keys missed until it was repeated
case-insensitively: a `text-transform: uppercase` label renders
`FORMS.E01.FIELDS…`, so a search of `innerText` for `forms.` finds nothing.
The key itself came from `i18n.exists()` answering true for an empty-string
heading while `returnEmptyString: false` made `t()` answer the key.

### Evidence on Cloudflare R2 (0128, `supabase/functions/evidence`)

The brief moved evidence from Supabase Storage to R2 after 0126 and before
any file existed; 0128 supersedes rather than edits. The row stores a
`bucket` and an `object_key`, never a URL. The browser compresses first
(`lib/evidence/compress.ts`: a photograph to 1600 px JPEG at quality 75, a
scanned document to a grey 150 DPI PDF written by hand from JPEG pages, a
PDF over the limit re-rasterised with pdf.js loaded on demand), refuses
anything still over 1 MB with the sizes, asks the `evidence` Edge Function
for a presigned PUT, uploads, and asks it to confirm — the function HEADs the
object, checks the size R2 reports, and inserts the row **as the user**, so
RLS, the audit actor and the column defaults are the database's. A refused
row deletes the object again.

The stop is ours, in two places: a check constraint (1 MB per file) and
`guard_evidence_quota` (9 GB in total, security definer so it sums every
municipality), both in the database, and both checked again in the function
before any bytes move. Decimal gigabytes, so the stop trips on the safe side
of Cloudflare's included 10 GB. The settings screen shows the total against
10 GB as a figure and a percentage, the stop, what compression has saved, and
the largest consumers by table and by record, from `evidence_usage()`.

The SigV4 presigner is hand-written and tested against AWS's published
vector (`sigv4.test.mjs`). Until the four R2 secrets are set on the function
every upload answers `r2_not_configured` naming them, on screen — OQ-49.

---

## Part 6 — the framework rows, the indicator views, the dashboard (migrations 0131–0132, `app/src/rmth`)

### The rows (0131)

Generated by `supabase/ramtha/gen_0131.py` from the two workbooks and
`forms.py`, and reproducible byte-for-byte: four objectives and five
activities with `English_form`'s names, the Arabic Copy's objective names,
eighteen indicators whose statement is the form sheet's own and whose
formula is the sheet's "How the indicator is calculated" line verbatim,
thirteen quarters, and 234 target rows every one of which is null. The
header of the migration lists where each value came from and what is
deliberately empty; OQ-48 carries the target reconciliation, SO1-A1's empty
statement, and the `full_code` column 0113 had promised.

### The views (0132)

Seventeen `v_ind_rmth_*` leaf views, the same shape as Sahel Horan's
`(period_code, actual, denominator)` plus `municipality_id`, anchored on
`municipality m where m.code = 'RMTH'` and revoked from every client role as
the twenty were in 0114. Nine read a `rmth_threshold` value and return
**null** — never zero — while it is null: IMP-0's months, SO1-0's
threshold, SO2-0's self-employment answer, C1.1's two halves, the three
completion rules, SO3-0's months-of-six, F0.2's counting reading.
`v_rmth_indicator_status` says why a row is null (`threshold_unset` with the
missing keys, or `no_statement`) from the same rows; `v_rmth_indicator_unique`
gives the "of whom unique" figure beside the three completion counts.
`v_indicator_actual` is recreated as twenty Sahel Horan branches and
seventeen Ramtha ones under the 0118 gate; the migration asserts the Sahel
Horan rows against a copy taken at its start, and the three baseline hashes
were re-run after it and match.

Probed as the Ramtha admin, in a rolled-back transaction: A1.2 and A1.3
never count the same event; an undecided event counts in neither; a
soft-deleted record leaves the figure; a deferred proposal is not an
approved one; C1.2 stays null until `c12_completion_rule` is written and
counts the moment it is.

### The dashboard

*Rewritten 15 September 2026.* Until then `/dashboard` chose between two
screens: `routes/Dashboard` for Sahel Horan and a plainer `rmth/RmthDashboard`
for Ramtha, picked by `DashboardSwitch` on the acting municipality. The
audit (`PLATFORM_AUDIT.md` Part 4) asked for one screen, and Part 9 below
records the rebuild: the same `routes/Dashboard.tsx` now renders both
programmes, reading the acting municipality (0117) and never the URL, with
everything that differs between them in `app/src/data/dashboardConfig.ts`.
Nothing is computed in the front end: the rows come from
`v_indicator_progress` for the municipality named in every query, the
reason a row has no figure from `v_rmth_indicator_status`, the names from
the municipality's own entry — Ramtha's from its form catalogue by full
code, because Sahel Horan's `indicators:name.*` keys are Sahel Horan's
statements and `A1.2` is a different indicator here. Three states, each in
words: a figure against *not set*; *not computable until decided*, naming
the definition in the reader's language from the threshold row's own
label, with a link to where it is decided; *no statement* for SO1-A1. The
four headline cards are four of the rows below them — events, proposals
approved, incubators, participants in incubation — chosen because each has
a form and no open item.

### The open items screen (`RmthThresholds`, `/rmth/thresholds`)

The seven definitions of plan §5.4 in the plan's order, each row of
`rmth_threshold` with its question and note in the reader's language, the
current answer or *not decided*, the date it was decided, and which
indicators wait on it (from the status view, so it cannot disagree with the
dashboard). A coordinator — the two roles `is_coordinator()` admits, gated
on screen by `manual.write` — gets a Decide control: a number with its unit,
a rule as text, yes/no, or the two-word choices the check constraint allows.
`useSetThreshold` writes the value with `decided_on` and `decided_by`, counts
the rows that came back, and invalidates both the thresholds and every
indicator query, so the dashboard the reader goes back to has the figure.
Verified through the screen: C1.1 read *not computable* naming both halves,
then one half after the first was set, then 0 for 26/Q3 after the second
(the probe cycle ended in June); the sidebar shows "Open items" for every
Ramtha role.

### Not done

Plan §6.4's optional super-admin comparison view ("if it is cheap"). The
switcher exists (Part 2); a comparison across municipalities would need a
row per municipality per indicator with targets to compare against, and
every Ramtha target is null, so there would be nothing to compare. Left for
when targets exist.

---

## Part 7 — verification (migration 0133)

Everything below was run against the live project on 14 September 2026,
as the role named, in transactions that were rolled back unless the row
was made through the screen — and every row made through the screen was
removed at the end. The statements are in
`supabase/verification/2026-09-14_part7_probes.sql`.

### Isolation — every scoped table, four account shapes

The 61 tables with a `municipality_id` column, counted as the owner and
then as each account (`set local role authenticated` + the account's
claims), the count read through `query_to_xml` so one statement covers the
catalogue rather than a sample:

| as | Sahel Horan tables | Ramtha tables | shared |
|---|---|---|---|
| owner | 20 indicators, 260 targets, 13 periods, every operational count as the baseline | 18, 234, 13, and the probe rows then live | — |
| `coordinator@shm.test` | **every table equal to its Sahel Horan count** | **0 in all 26** | `person` all rows; `audit_log` Sahel Horan rows plus the 904 rows about shared tables (`person`, `app_user`, `ref_*`, `municipality`), none of Ramtha's |
| `admin@ramtha.test` | **0 in all** | **every table equal to its Ramtha count** | `person` all rows; `audit_log` Ramtha's 377 plus the same 904 shared |
| `superadmin@platform.test`, acting Ramtha | 0 | Ramtha's | `app_user` all 8 |
| `superadmin@platform.test`, acting nowhere | all | all | all |

`rmth_reference_counter` answers `NOSELECT` to every client role: it has no
grant at all, and only the reference trigger reads it.

**The TC/2026 counter stands at 1, and stays there.** The only training
cycle Ramtha has ever had was a probe, `RMTH-TC-2026-001`, saved on 15
September 2026 to prove a super admin's write lands in Ramtha, and
soft-deleted the same day. Its number is spent. A counter that has advanced
is honest history: resetting it so the first real cycle reads `-001` would
let a reference that once named the probe name something else, and a gap in
the sequence costs nothing. **Do not reset it.** Ramtha's first real cycle
will be `RMTH-TC-2026-002`, and that is correct.

The views: a Sahel
Horan coordinator reads 260 rows of `v_indicator_progress`, 260 of
`v_indicator_actual` (20 codes), 7 of `v_indicator_disaggregated`, and
**zero** of `v_rmth_indicator_status` and `v_rmth_indicator_unique`; the
Ramtha admin 234 / 221 (17 codes) / 0 / 18 / 39; a Sahel Horan partner
viewer 260 progress rows and no Ramtha row; a participant nothing at all.
None of the 37 `v_ind_*` leaf views is selectable by `authenticated`.

Writes, both directions, counting rows as §16 of `05` insists: a Sahel Horan
coordinator updating Ramtha's events, thresholds, enrolments or targets —
**0 rows** each; the Ramtha admin updating Sahel Horan's partners,
enrolments, targets, milestones or registrations — **0 rows** each. An
INSERT that names the other municipality outright — `partner`, `rmth_event`,
`rmth_incubator` — is refused with `42501` from either side.

**One thing the database allows that the screens do not:** a Sahel Horan
coordinator calling `save_rmth_record` creates a Ramtha-*shaped* row under
*Sahel Horan's* municipality (it was allocated `SHM-EV-2026-001` before the
transaction was discarded). Ramtha cannot see it, no Sahel Horan indicator
reads the table, and no screen offers it — `RequireRamtha` refuses the
route. It is not blocked at the database because the `rmth_*` tables are the
*programme's* tables scoped by municipality, and a third municipality
adopting the same forms would need exactly this. Recorded here so nobody
reads it as a leak later; if it should be a hard rule, it is one check
constraint per table naming the municipality, and it is deliberately not
written.

### The public side

As `anon`: `v_public_opportunity` returns Sahel Horan's eight rows and no
Ramtha row, with no filter and with either slug; `/sahel-horan` lists them
and `/ramtha` reads *nothing open at the moment*, as in Part 3.

### Every Ramtha form, through its screen

The seventeen records Part 5 created through the screens as the Ramtha admin
were used as the "create" step (each was already read back and its
indicator seen to move on the dashboard). In this part each was **edited**
through its screen and the figure checked in `v_indicator_actual`, then
**soft-deleted** through its detail page and the figure checked again. The
seven open items were answered first, through the Open items screen, so
that every indicator computed (numeric, text, yes/no and both two-word
choices, one Decide each):

| form | edit made | figure moved | after delete |
|---|---|---|---|
| IMP-0 | consecutive months 2 → 6 (X = 6) | 0 → **1** in 26/Q3 | 0 |
| SO1-0 | contact date into 26/Q4 | 26/Q3 → **26/Q4** | 0 |
| A1.2 | event dates into 26/Q4 | 26/Q3 → **26/Q4**; A1.3 unmoved | 0; the session held inside it still counts 1 for A1.3 |
| A1.3 | session date into 26/Q4 | → **26/Q4** | 0 |
| B1 | interview date into 26/Q4 | 100/1 → **26/Q4 100/1** | ∅/0 |
| B1.1 | completed date into 26/Q4 | → **26/Q4** | 0 |
| B1.2 | decision → *Rejected*, dated 26/Q4 | **stays 26/Q3 = 1** — counted once, on first approval, as the sheet says | 0 |
| SO2-0 | contact date to three months after the cycle end | `three_month_reached` derived to true; ∅/0 → **26/Q4 100/1** | ∅/0 |
| C1 | headline → *No, not at all* | 100/1 → **0.0/1** | ∅/0 |
| C1.1 | cycle dates into 26/Q3 (it had ended in June, before any period) | 0 → **1**; C1.2 followed it, 0 → 1 | 0, and C1.2 with it |
| C1.2 | completion criteria → *No* | 1 → **0**, unique 1 → 0 | 0 |
| SO3-0 | months of six 5 → 3 (rule = 4) | 1 → **0** | 0 |
| E0.1 | achieved date into 26/Q4 | → **26/Q4** | 0; **restored through the screen: 1 again** |
| E0.2 | admission date into 26/Q4 | → **26/Q4** | 0 |
| E0.3 | completion criteria → *No* | 1 → **0**, unique → 0 | 0 |
| F0.1 | completed → *No* | 1 → **0**, unique → 0 | 0 |
| F0.2 | development complete → *In development* | 1 → **0** (programmes reading); under *sessions* the one delivery counts 1 | 0 |

At the end every one of Ramtha's 221 `v_indicator_actual` rows read zero or
∅/0.

### The counting rules, in discarded transactions as the Ramtha admin

- **C1.2, one person on three cycles** = **3**, `v_rmth_indicator_unique`
  = **1**, and `save_rmth_record` derived `counted_under_id` on the second
  and third (null, then the first record's id twice). A 13-week cycle among
  them fails C1.1's *no more than 12 weeks* and C1.1 reads 2, not 3.
- **A1.2 and A1.3 never both count the same event.** With both probe events
  live, 1 and 1. The networking event marked *solely a vocational guidance
  session*: A1.2 0, A1.3 still 1. The decision cleared to undecided: A1.2 0.
- **E0.2 counts unique participants** (the sheet's line, not the plan's
  "one record per participant per incubator" — OQ-48): the same person
  admitted to a second incubator is two service rows and **1**.

### Found: the unique-completer view read a derived field (0133)

The first run of the C1.2 probe inserted the three enrolments directly and
`v_rmth_indicator_unique` answered **3**: it counted enrolments whose
`counted_under_id` was null, and that field is worked out by the RPC at the
moment a record is saved. A row that reaches the table any other way, an
earlier completion later withdrawn, an earlier record edited from *No* to
*Yes* after a later one was saved — each leaves the field saying something
the rows no longer do. 0133 recreates the view to count people from the
spine, as every other person-level view here already does: a person is
unique in the quarter of their first qualifying completion by cycle end
date. The probe in the migration withdraws completions one by one and
watches the person move. `counted_under_id` stays on the form as the
enumerator's note. The register in `CLAUDE.md` has the row.

### `linkage_request.op_read_self`

Kept. The decision and the probe are in `05_ROLES_AND_RLS.md` §17.

### Clean-up, and both municipalities back at their baselines

Every test row was removed as the owner with `app.allow_hard_delete = on`,
per the one sanctioned exception in `07_BUILD_CHECKLIST.md` (build-phase
rows are not records of anything): the 23 `rmth_*` data tables emptied,
children before parents (76 rows), the nine reference-counter rows, the four
probe persons `399000101`–`399000104`, and the ten threshold rows set back
to null with no decision date. `audit_log` keeps every row, as it must.

Afterwards: Sahel Horan's 20-indicator matrix and both whole-view hashes on
the original projections equal `supabase/baselines/2026-09-13`; every
Sahel Horan table's live and soft-deleted counts equal the baseline's
(`applicant_lookup_throttle` 2 → 3 is a rate-limit counter from the public
probes, OQ-21); Ramtha's 221 view rows are all zero or ∅/0, its status view
reads 9 `threshold_unset` and 1 `no_statement` as seeded, and `person` is
back at 7 rows, 3 deleted.

---

## Part 9 — the platform audit's response (migrations 0134–0135, one dashboard)

**15 September 2026.** `PLATFORM_AUDIT.md` was received and committed as
it arrived; this is what was done with it, in the audit's own order, and
one thing the audit could not see.

### Reconciled first

`check_migration_files.sh` passed (132 exact, the two expected divergences),
both municipalities' figures were captured to
`supabase/baselines/2026-09-15_both_before_dashboard.md` — Sahel Horan's
twenty lines identical to the 13 September baseline — and every function
defined more than once across the 134 migrations was checked for a later
version dropping a middle version's lines. Sixteen flags; the one real
reversion is the documented one (`0082` losing `0080`'s read-back guard,
restored by `0083`), and every other flag is a rewording whose substance is
in the live body. No live function has lost an earlier change.

### Part 4 — one dashboard

`RmthDashboard.tsx`, `DashboardSwitch.tsx` and `rmthDashboard.ts` are gone.
`routes/Dashboard.tsx` renders both programmes; `data/dashboardConfig.ts`
holds what differs, keyed by municipality code — the four headline codes
and tones, the short label for a card and a row, where a source chip points,
and which breakdown dimensions the programme's forms never ask. A
municipality with no entry gets the framework statement from the view.
Every query in `data/indicators.ts` names its municipality in the WHERE and
the query key, and the three other screens that read indicator rows (the
contribution log, an initiative, the linkage match) pass it too.

Sahel Horan renders byte-identically to the reference captured before the
change — `main.outerHTML` compared at 1440 and 320, English and Arabic —
apart from exactly three intended differences: the breakdown panel now
sits below the indicator table; its OQ-12 warning names the municipality
from its row instead of "this platform", which stopped being true when
0122 gave Ramtha's forms a vulnerability list that includes refugee status
and disability; and its intro derives "the 4 indicators" from the rows
instead of spelling "four".

Ramtha, at 1440 and 320 in both languages: no raw locale key (searched
case-insensitively, the E0.1 lesson), no "of 0", no "/0", nine rows
*not computable until decided* naming their definition, twenty-seven
*not set*. A stored zero was written onto Ramtha A1.2 for 26/Q3 — the card
and the row both read *not set* with a dashed bar — and reverted. The
breakdown panel says, from `is_disaggregable` rather than from a sentence,
that no breakdown view exists for Ramtha's indicators.

### Part 2.1 — which of the four read rows

None of the four reads a row of an indicator view. `followup_view_statuses`
reads `pg_get_viewdef` only; `followup_indicator_reach` reads definitions
and rows keyed by the survey, and its one municipality-sensitive test is
the same unscoped test `v_ind_c1` makes (OQ-50). The defect was the 0114 bug
class in three functions that join `reporting_period` with no municipality:
`person_restore_impact`, `partner_restore_impact` (not on the audit's list;
a sweep found it) and `submit_followup`. Measured before the fix,
`person_restore_impact` answered every figure twice for the owner and for a
super admin with no municipality chosen — C1.3 read 4 where two sessions
exist. `0134` scopes all three and refuses a call with no municipality;
role-tested as five account shapes.

### Part 2.4 — `v_upcoming_exhibitions`

`0135` puts the `can_see_municipality()` gate in the view's own WHERE,
exposes `municipality_id`, and states the grants. `security_invoker` stays.

### Part 5.3 — the account

`superadmin@shm.test` is `superadmin@platform.test`, in `auth.users`, the
email identity and `app_user`; signed in through GoTrue from a cleared
session afterwards, and switched both ways through the header.

### Found on the way: nine embeds refused since 0113

`0113` gave every scoped child table a composite foreign key beside its
single-column one. PostgREST then saw two relationships between each pair
and refused every embed across them (PGRST201, HTTP 300). From 13 to 15
September the partners list, the training completions, the contribution
log, the exhibition registrations, the initiatives list and detail, the
linkage match and the session qualification lookup answered *0 of 0 — no
records yet* to a Sahel Horan coordinator whose records were in the
database, beside a sidebar counter that still said 5. Part 7's verification
of "the same components" saw them render and did not read what they said.
The nine embeds now name the relationship they mean, and
`check-constraint-names.mjs` verifies every hint against the constraint
snapshot — confirmed to fail on a misspelt hint before it was trusted.
The Ramtha screens read their children in separate queries and were never
affected.

### Both municipalities unchanged

All seven per-municipality view hashes in the 15 September baseline are
identical at the end; every table's live and soft-deleted counts equal the
baseline's except `audit_log` (+5, insert-only: the stored-zero probe and
its revert, the email, two acting-municipality switches).

---

## Part 10 — the super admin's chrome: two scopes, never mixed (16 September 2026, `app/src/layout`)

No migration. Three defects in the shell, one cause: the chrome did not
distinguish *administering the platform* from *looking at a municipality*.
Signed in as the super admin with no municipality chosen, the sidebar
listed Sahel Horan's nine forms under "choose a municipality", with
"Administration → Accounts" and "Settings" in the same list; acting on
Ramtha, that list still carried the platform's entries beside Ramtha's
forms; and the header offered a public-site link per municipality, listed
together, so acting on Ramtha the one place Sahel Horan still appeared was
the chrome.

### The principle, and what marks a super admin now

**A super admin acting on a municipality sees that municipality's product,
not a super admin product with a municipality filter applied.** The marks of
a super admin on a municipal screen are exactly three: the switcher, the
"super admin · acting on" eyebrow, and the Accounts tab inside the panel
below. Everything else is the same screen the municipality's own admin has,
because it is built by the same code path.

### The sidebar (`useNavGroups`, `Shell.tsx`)

| | sidebar |
|---|---|
| super admin, no municipality | one group, *Platform*: Accounts, Settings. No forms, no dashboard, no municipal navigation — a form belongs to a municipality, and listing one municipality's forms under "choose a municipality" implies a choice that has not been made. *Superseded the same day by Part 11: the two platform entries left the sidebar too, and it is empty, with a line saying why* |
| super admin acting on X | **entry for entry what X's own admin sees** |
| a municipal account | its own product |

Accounts and Settings left the municipal list for everyone. They are the
platform's, and they live in the account menu and the panel it opens.

Verified by capture and `diff`, not by reading: the Ramtha admin's sidebar
and the Sahel Horan coordinator's were captured before the change
(`innerText` of every entry and group heading, in order), the super admin's
was captured acting on each, and each pair is identical apart from the
`Settings` entry that moved to the menu for both roles. The Ramtha admin's
sidebar was captured again after the change and equals the super admin's
acting-on-Ramtha capture exactly. The counts beside the entries follow the
switch (Sahel Horan's 3 / 5 / 2 / 1 / 2 after switching from Ramtha),
because `setActingMunicipality` clears the query cache and the Outlet is
keyed on the acting municipality.

### The account menu (`AccountMenu.tsx`)

The account chip is a button now, in all three places it appears — the foot
of the rail, the tablet header (compact: the role and a chevron), the foot
of the phone's More sheet (expands in place) — and the bare Sign out button
is gone. The menu carries the account, the role and the municipality (under
the compact chip; the full chip already says all of it directly above),
**Settings**, and **Sign out**. The same control for every role: a
municipal admin's menu is the same menu, so the two roles are not two
products. Escape and a click elsewhere close it; a choice in the sheet or
drawer closes the sheet or drawer too.

### The platform panel (`PlatformPanel.tsx`, `platformPanelContext.ts`)

*Superseded later on 16 September 2026 by Part 11: the panel is a centred
dialog (`PlatformDialog.tsx`, `platformDialogContext.ts`), its state is in
the URL, and the account menu is its only entrance. The paragraphs below
describe the panel as it was built that morning.*

*Settings* opens the platform's administration in a panel over whatever is
on screen — the municipality's product stays where it is. Decided by
capability, never by role name:

| `accounts.manage` | title | tabs | content |
|---|---|---|---|
| yes (a super admin) | Platform administration | Accounts · Settings | the accounts management (`AccountsSection`, what `/accounts` rendered); language, the verification worklist, evidence storage (`SettingsSections`) |
| no | Settings | none | language, and the two staff worklists the role reaches |

The eyebrow above the title is the platform's name, in the position where
the rail's masthead names the municipality: it says whose settings these
are. A dialog: focus lands on the close control, the page behind stops
scrolling, Escape closes it — unless one of the accounts tab's own modals
(the one-time password, the deactivation) is open, which owns Escape until
it closes, so one key never closes both. Full width at 320px, 760px from
`md`. The accounts list renders as the card list at every width inside it
(`DataTable layout="stacked"`): the two renderings switch on the viewport,
which is right on a page and wrong in a 760px panel — the five-column table
with three actions per row was a thousand pixels of sideways scrolling.

`/accounts` and `/settings` are addresses still: each opens the panel at
its section and lands on the role's home under it (`PlatformRoute.tsx`) —
the dashboard, or the chooser for a super admin who has not chosen. A role
without `accounts.manage` asking for `/accounts` gets the Settings panel
(behind `RequireCapability` outside demo mode, which refuses first).

### The public-site link (`PublicSiteLink`, `Shell.tsx`)

One component, one behaviour. Acting on Ramtha: one link, *Visit the public
site · Ramtha Municipality*, and nothing about Sahel Horan; acting on Sahel
Horan, the reverse; no municipality chosen, **no link** — there is no site to
visit until one is. The chooser screen deliberately does not offer both:
its one job is the choice, and a super admin who wants a public site
chooses the municipality first, which is how they reach everything else
about it. A municipal account gets the same component for its own
municipality. It opens `/:slug` in a new tab for everyone; the municipal
preview used to navigate the same tab, and the two behaviours were the two
components. Consequence worth knowing: the public page's "Back to the
Municipality" bar now runs in that second tab and opens the dashboard
there rather than returning to the first.

### Copy that had gone stale

`common:settings.emptyBody` said user roles "are seeded and changed in the
database" — false since 0117 gave roles a screen. The register's
placeholder shape; the sentence is gone and the intro names only what is
true (targets and periods). `municipalityGate.body` said "the accounts
screen and settings are available without choosing" and now says where
they are.

### Verified

- Super admin, no municipality: Platform → Accounts, Settings; no form, no
  dashboard entry, no public-site link; the chooser under the panel when
  `/accounts` is typed.
- Super admin acting on Ramtha: sidebar `diff`-identical to
  `admin@ramtha.test`'s; one link, `/ramtha`.
- Switched to Sahel Horan from the header: sidebar `diff`-identical to
  `coordinator@shm.test`'s, counts 3 / 5 / 2 / 1 / 2, the dashboard's four
  cards 3 / 1 / 1 / 2, link `/sahel-horan`, and the only "Ramtha" left on
  the page is the switcher's option.
- Both municipal admins: no switcher, the same menu (Settings, Sign out), a
  Settings panel with no tabs and no accounts list, `/accounts` answering
  the same.
- 320px, English and Arabic: the tab bar, the sheet, the inline menu, the
  panel with its two tabs; nothing wider than the viewport
  (`scrollWidth` checked on the sheet and the panel); no raw locale key,
  searched case-insensitively (the E0.1 lesson); the email isolated LTR
  under RTL. Tablet band (800px): compact chip, menu below it aligned to
  its inline end, drawer with twelve links and no public-site list.
- **The write.** A networking event saved through `/rmth/a12/new` as the
  super admin acting on Ramtha landed with Ramtha's `municipality_id`,
  `created_by = superadmin@platform.test`, an `insert` audit row with the
  same actor and Ramtha's municipality, and moved Ramtha A1.2 26/Q3 from 0
  to **1** with A1.3 unmoved. Then, in a rolled-back transaction as
  `authenticated` with the claims set: the Ramtha admin sees the row and
  A1.2 = 1; the Sahel Horan coordinator 0 rows and no Ramtha A1.2 row; the
  super admin acting on Sahel Horan 0 rows; the same super admin with the
  switch cleared, 1. **The chrome is not the boundary and nothing here
  depends on it for access**; the acting municipality on `app_user` is.
- The probe row was removed as the owner (`app.allow_hard_delete`, the one
  sanctioned exception, as Part 7), the super admin put back to acting
  nowhere through `set_acting_municipality(null)` as themself, and every
  figure and hash in `supabase/baselines/2026-09-16_both_before_super_admin_chrome.md`
  reads the same at the end. `audit_log` +5. **The EV/2026 counter stands
  at 1 and stays there**, for the reason Part 7 gives for TC/2026:
  `RMTH-EV-2026-001` named the probe, and Ramtha's first real networking
  event will be `-002`, which is correct.

### Not changed, and one wording to settle

`RequireRamtha`'s refusal, the dashboard, and every municipal screen were
already free of super admin chrome; the three above were the whole of it.
One thing surfaced by putting the chip and the header eyebrow side by side:
`auth:role.super_admin` reads *مشرف عام* and `nav:superAdminActingOn`
*مدير عام*, two Arabic renderings of one role on one screen. Not decided
here — it belongs with the native speaker's pass (OQ-26's list).

---

## Part 11 — the platform dialog: one door, a modal, and filters with an address (16 September 2026, later the same day, `app/src/layout`, `app/src/ui/Dialog.tsx`)

No migration. Part 10 was reviewed the same day and two things about it
were wrong: the platform panel was a drawer, and Settings could be reached
two ways. A third thing was asked for — filtering the accounts list — and a
fourth was found on the way.

### A dialog, not a drawer

A drawer attached to the inline-end edge reads as another region of the
same page. Administering the platform is a different scope entirely, and a
centred dialog over a dimmed screen says so: you have stepped out of the
municipality and you will step back.

The mechanics — overlay, centred panel, focus trap, Escape, scroll lock,
focus return, the bottom sheet below 768px — lived inline in `Modal`, the
delete confirmation, and the panel had copied them by hand with its own
Escape rule. There was no shared primitive, so the primitive is what was
built: `ui/Dialog.tsx`. `Modal` is now content only (title bar, sentence,
red note, cancel/confirm) on top of it, the same look, and `PlatformDialog`
is header, tabs and a scrolling body on top of the same thing. Two things
in it are worth knowing:

- **Dialogs nest through a module-level stack.** Escape and Tab act on the
  top dialog only, so the one-time-password and deactivation confirmations
  own the keyboard while they are up, and one key never closes both. The
  panel used to decide this with a DOM query for an inner `[role="dialog"]`;
  the stack is the same fact kept where both sides read it. Verified: with
  the deactivation open inside the dialog, the first Escape closed the
  confirmation and returned focus to its Deactivate button with the page
  still locked; the second closed the dialog.
- **`onClose` is read through a ref.** The dialog's close handler now
  writes the URL and so changes identity on every render; an effect keyed
  on it would re-lock scroll and move focus to the close control while
  somebody was typing in the search box. Typing kept focus, checked.

Sized to its content and capped at the viewport (`max-h-full` inside a
padded `inset-0` box, so the empty filtered state is a short centred box
and the full list a tall one), 900px at most, scrolling inside its body.
Below 768px `size="wide"` is a full-screen sheet — full height, not
content-sized, so its header does not jump when the Settings tab gives way
to the longer Accounts tab. The confirmation keeps its content-sized sheet.

### One door

Settings was in the account menu **and**, for a super admin with no
municipality, in the sidebar beside Accounts — the same destination in two
places, one of them inside the thing the other opened. The account menu is
the home, for the reason the review gave: it is the control that already
carries the identity, and platform administration belongs to the person,
not to the municipality being looked at. Part 10 had already decided the
sidebar must be entry-for-entry the municipality's own admin's when acting
on one; an entry that appears in the sidebar only until a municipality is
chosen and lives in the menu at all other times is the worse of the two.

So the *Platform* group is gone from `useNavGroups`, `Dest` lost its
`panel` variant, and the super admin's sidebar before choosing is **empty**
with one line — *"No municipality chosen. Its dashboard and forms appear
here once one is."* — derived from the same condition that empties it, not
from the list being empty. The chooser in the main area does the choosing.
The phone tab bar for that state is a single *More*, which is where the
menu is.

The menu item is labelled by the same capability test that titles the
dialog: `accounts.manage` → *Platform administration*, opening on the
Accounts tab; anyone else → *Settings*, a dialog with no tab bar. A menu
item named "Settings" that opened "Platform administration" on an Accounts
tab would have been the register's placeholder shape in a menu.

    grep -rn "openDialog(" app/src   →  AccountMenu.tsx (the door),
                                        PlatformDialog.tsx (its own tabs, and
                                        the capability redirect below)

`/accounts` and `/settings` remain addresses and redirect into the dialog
(`PlatformRoute`); they are not a second door, they are how a bookmark
arrives.

### The dialog's state is the URL

`?platform=accounts|settings` on whatever route is underneath, read in
`Shell` above the routed screen and written with `replace` — opening,
closing and a keystroke in a filter are one screen's state, not places to
go Back to. It had to be the URL rather than React state because the
filters below are in the URL, and a filter that survives a refresh while
the dialog holding it does not would leave `?role=coordinator` orphaned on
a dashboard. Consequences, each checked:

- a refresh on `/dashboard?platform=accounts&muni=ramtha&role=coordinator`
  comes back with the dialog open, the Accounts tab selected, both selects
  showing their values and the list at 1 of 8;
- `/accounts?role=super_admin` lands on `/dashboard?role=super_admin&platform=accounts`,
  filtered; `/settings` on `/dashboard?platform=settings`;
- a super admin acting on Ramtha opens it over `/rmth/a12?m=ramtha` and the
  address reads `/rmth/a12?m=ramtha&platform=accounts` — `ActingMunicipalityUrl`
  copies the other parameters when it writes `m`, so a switch of
  municipality by address while the dialog is open (Ramtha → Sahel Horan)
  remounted the screen beneath it, changed the sidebar and header, and left
  the dialog open with its filter;
- closing strips `platform` and the four filter keys; leaving the accounts
  tab for settings strips the filter keys. The URL describes what is on
  screen and nothing else;
- `PlatformRoute` is one `<Navigate>` carrying the section and any filter
  parameters, not an effect plus a redirect — two navigations in one commit
  race, and the last to run wins.

**Found while verifying, in my own change.** The capability redirect (a
role without `accounts.manage` asking for the accounts tab gets settings,
and the address is corrected to say so) fired on a cold load *before the
role had resolved*: `can(null, …)` is false, so a super admin's
`?platform=accounts&role=coordinator` was rewritten to `settings` and the
filter thrown away, with the account signing in a moment later to a
Settings tab it had not asked for. The old panel had the same test but only
chose what to render, so the race cost nothing; giving it a write made it
destructive. Gated on `roleResolved`, and the dialog renders nothing until
then rather than a "Settings" title that turns into "Platform
administration". Found by loading the address cold, which is the one thing
a client-side navigation cannot test.

### The accounts filter

Municipality (each municipality by slug, and `none` for the super admins,
who belong to none), role (all six), active or deactivated, and a text
search on name and email — `?muni=`, `?role=`, `?status=`, `?q=`. A value
the URL carries that nothing recognises is read as unset and left alone.
Active filters are removable chips under the strip with a *Clear all
filters*, beside an always-present *n of N accounts*; an empty result under
a filter is an empty state with the same clear-all, not a blank list.

The brief said to do this "the same way the dashboard filters work". **The
dashboard has no filters**, and nothing in the app kept filter state in the
URL before this; the only filter UI is the list screens' search-and-select
strip, in React state. The strip's language was reused — one 1.5px frame,
hairlines between cells — with the search on its own row from 768px and the
three selects sharing the second: four cells in one row truncated every
select's label inside a 900px dialog. Below 768px the frame holds one
*Filters* control with a count badge that opens the four stacked; the chips
beneath still show what is active without opening it.

**The list stays stacked.** The five-column table with three actions per
row needs 1041px; the dialog's body is at most ~850px, so the table
rendering would be sideways scroll here as it was in the 760px panel.

Verified as the super admin, in English and Arabic, at 1440, 800 and 320:
each filter alone (Ramtha → 1 of 8; coordinator → 2; deactivated → 0;
`SHM.test` → the six `@shm.test` accounts, case-insensitively), two and
three combined, one chip removed by its ×, clear all, and the refresh
above. Nothing wider than the viewport at 320 in either language (every
element's bounding box checked, and the dialog's `scrollWidth`); no raw
locale key, searched case-insensitively (the E0.1 lesson). A municipal
admin (`admin@ramtha.test`): *Settings* in the menu, a dialog titled
Settings with no tab bar and no accounts list, and `/accounts?role=…` typed
lands on `?platform=settings` with the filter stripped. Focus lands on the
close control, returns to the chip on close (overlay click and Escape
both), and the page behind is locked.

### Found: the database admits a coordinator to accounts, and the screen does not

The rule for this work was that the chrome is not a permission boundary,
and checking that as the real role found the boundary in the wrong place.
`au_read` and `au_update` (0118, deliberate — its header says "a coordinator
reads and edits the accounts of their own municipality") admit a municipal
coordinator to every `app_user` row of their municipality; `guard_app_user`
stops them minting a super admin, moving an account between municipalities
and touching a super admin's row, and nothing else. Measured as
`coordinator@shm.test`, through RLS, in a transaction that rolled back:
six accounts visible, **deactivating `dataentry@shm.test` — 1 row;
changing `viewer@shm.test`'s role — 1 row**; the super admin and the
Ramtha admin — 0 rows each. The accounts screen is shown to
`accounts.manage`, which is `super_admin` only, as plan §2.5 says.

So for a coordinator the only thing between them and managing their
municipality's accounts is the front end — which is exactly the shape the
rule forbids, and it is not this work's to settle: either the policy is
wider than the plan meant or the screen is narrower than the policy
intends. Recorded as **OQ-51**, and not worked around in either direction.

### Both municipalities unchanged

The matrix, all seven view hashes and every table's counts read the same at
the end as in `supabase/baselines/2026-09-16_both_before_platform_modal.md`;
`audit_log` +5, all of them the super admin's acting-municipality switches
made by the verification. The super admin is back to acting nowhere.


---

## Part 12 — the third municipality: Al Khalidiyah (21–22 September 2026, migrations 0138–0152, `supabase/khalidiyah`, `app/src/khld`)

How Khalidiyah was added beside the other two, following
`KHALIDIYAH_IMPLEMENTATION_PLAN.md`, and where this build departed from it
or had to decide something it left open. The short version for the M&E
lead is `KHALIDIYAH_REPORT.md`; the decisions that must not be guessed are
OQ-52 to OQ-58.

Khalidiyah is a different kind of programme from the other two: a park, a
partnership mechanism, a volunteer programme and home-based enterprises,
with **twenty-one forms feeding twenty-one indicators** and **no public
forms at all** — its residents are recorded by staff, on paper, and the
sheets arrived with their Arabic already written. That last fact shaped the
build: nothing on a Khalidiyah screen is drafted except the sidebar names
and the words around the controls.

### One reading of the workbook, five generators

Everything under `supabase/khalidiyah/` reads the two workbooks once
(`workbook.py`) through one structural catalogue (`catalogue.py`, one entry
per field that is not a plain column) into one resolved model
(`model.py`). The list migration (`gen_0141.py`), the table migrations
(`gen_0145.py`), the framework migration (`gen_0149.py`) and the app's form
definitions and both locale files (`gen_forms.py`) are generated from that
model, so a field cannot read one list on the form and another in the
database. Each generator reproduces its applied file byte for byte; a
change to the catalogue that would alter an applied migration is refused
by `check_migration_files.sh`, and recorded instead as a correction the
next migration applies (`LIST_FIXES`, `LISTS_ADDED_LATER` in the
catalogue).

### 0138–0140 — the shared table changes, and the row

- **A second identifier on `person`** (0138, plan D1). `national_id`
  becomes nullable — its name, format and uniqueness do not change, because
  two municipalities' lookups, the throttle hash and every person-level
  form read it — and `unhcr_number` is added beside it, unique where
  present, normalised by a trigger, **with no format check** (OQ-52: no
  source gives the format). `person_has_identifier` requires one of the
  two. Sahel Horan's and Ramtha's rows are asserted unchanged.
- **`age_band()` named a child as a young adult** (0139, plan D3). The live
  body put every age under 25 into `18-24`; harmless only because nobody
  under 18 existed. An `under_18` branch is added, every per-municipality
  view hash is taken before and after, and Khalidiyah gets its own seven
  bands in `khld_age_band()` — never `age_band()`.
- **The municipality and its thirteen quarters** (0140): code `KHLD`, slug
  `khalidiyah`, names and programme line verbatim from the index sheet,
  the platform's common calendar. Its period codes repeat the other two
  municipalities', which is what 0114 anchored every view against, and the
  migration asserts that no Sahel Horan or Ramtha figure moved when a third
  `27/Q1` appeared.

### 0141–0144 — 237 lists, and the helpers

One `ref_khld_*` table per response list — 237 of them, 1,250 options,
both labels verbatim in the sheet's order — split across three migrations
only because each is one pasted text. Thirteen lists are shared between
sheets and exist once (`sex`, `age_group`, `nationality`, `disability`,
`neighbourhood`, `agree_scale`, `checklist_status`, `product_type`, …); two
sheets share a table only when every option matches in both languages.
`partner_type` is listed in 0141's header but created by 0145, because no
sheet field selects from it — it serves the partner entity's column
(`LISTS_ADDED_LATER`).

0144 gives Khalidiyah its own reference counter (three-letter prefixes,
series without a year, the sheet's width, never reset), its own
"other (specify)" guard, `khld_ensure_person(jsonb)` with the identifier
type chosen **explicitly** (`national_id` | `unhcr_number`; a soft-deleted
match raises `P0KHL` with the id, never recreates), `khld_person_lookup`
for the screens (the deleter's name through the 0108 definer, so
`authenticated` can call it), and the guardian guard: a volunteer under
18 on the registration date cannot be saved without the guardian's name,
relationship, phone, written consent and its date. Minor status is
derived from the date of birth, never stored.

### 0145–0147 — twenty-one forms onto twenty-one tables, three entities, and their children

Every sheet was read in full first. One table per form; every sheet field
name is a column name except the compound fields (split into the facts
they name) and the "by …" counts (a child row per cell, never a column per
cell, never JSON); the column comments carry the sheet's question. The
four milestone forms share **one** table, `khld_milestone_verification`,
told apart by `milestone_code`, with a `khld_milestone_checklist_item`
child (status, detail, date, evidence reference) and the milestone
catalogue and rules described below.

| form | table | class | fields | reference | count gate | keys on |
|---|---|---|---|---|---|---|
| KHLD-IMP-0 | `khld_interaction_survey` | anonymous | 26 | — | consent | — |
| KHLD-SO1-0 | `khld_partner_survey` | organisation | 24 | — | — | partner |
| KHLD-SO1-A1 | `khld_milestone_verification` | record | 23 | — | — | — |
| KHLD-SO1-A2 | `khld_coordination_meeting` | record | 25 | KHLD-CM | minutes_prepared | — |
| KHLD-SO1-A3 | `khld_contribution` | organisation | 24 | KHLD-CON | status | works item |
| KHLD-SO1-B1 | `khld_milestone_verification` | record | 22 | — | — | — |
| KHLD-SO2-0 | `khld_user_feedback` | anonymous | 21 | — | — | activity |
| KHLD-SO2-C1 | `khld_works_item` | record | 20 | KHLD-REH | status | — |
| KHLD-SO2-C2 | `khld_campaign` | record | 24 | KHLD-VC | evidence_attached | — |
| KHLD-SO2-D1 | `khld_activity` | record | 24 | KHLD-EV | evidence_attached | — |
| KHLD-SO2-D2 | `khld_attendance` | aggregate | 20 | — | — | activity |
| KHLD-SO3-0 | `khld_volunteer_tracking` | linked | 22 | — | — | volunteer |
| KHLD-SO3-E1 | `khld_milestone_verification` | record | 23 | — | — | — |
| KHLD-SO3-F1 | `khld_milestone_verification` | record | 22 | — | — | — |
| KHLD-SO3-F2 | `khld_volunteer` | person | 28 | KHLD-VOL | — | person |
| KHLD-SO3-F3 | `khld_action_day` | record | 25 | KHLD-AD | evidence_attached | — |
| KHLD-SO4-0 | `khld_producer_survey` | linked | 33 | — | respondent_is_vendor | vendor |
| KHLD-SO4-G1 | `khld_guidance_completion` | person | 33 | KHLD-ENT | — | enterprise (its owner is the person) |
| KHLD-SO4-G2 | `khld_enterprise_support` | linked | 29 | — | — | enterprise |
| KHLD-SO4-H1 | `khld_market` | record | 29 | KHLD-MKT | — | — |
| KHLD-SO4-H2 | `khld_vendor_registration` | person | 29 | KHLD-VEN | attended | market, vendor, enterprise |

Three things the sheets refer to across forms are entities with a table
of their own: `khld_partner` (one row however many surveys and
contributions name it), `khld_enterprise` (SO4-G1's owner, SO4-G2's
record, SO4-H2's optional link) and `khld_vendor` (stable across market
days, the person behind it in `person`). `khld_volunteer` is itself the
entity of SO3-F2: one per person, registered once.

Two things were found while applying, both by the migrations' own probes:

- **The shared milestone table needs its question codes prefixed.** Four
  forms' `evidence_attached` multi-selects read four different lists, and
  `khld_question_list` is keyed on `(table, question_code)`. On that table
  the code carries the form id (`a1_evidence_attached`, …,
  `a1_stakeholder_count`), and `guard_khld_milestone_child` requires the
  prefix to be the parent's milestone. Found when 0147 hit the primary key.
- **`guard_soft_delete` refuses the owner.** A probe that soft-deletes must
  do it as the Khalidiyah admin (`set local role authenticated` with the
  admin's claims) and read back — which is also the only honest way to
  test a policy.

`d2.duplicate_check`'s *Yes* option was seeded with `allows_free_text`
from its blank, but the blank is a **number** (the repeat participants the
distinct-individuals figure subtracts) and has a typed column; 0145
corrects the flag and `LIST_FIXES` records why the list migration is not
edited.

### 0148 — one save path, and the rules the sheets state in prose

`save_khld_record(p_table, p)` takes `{id?, row, person?, partner?,
enterprise?, option_questions?, options?, count_fields?, counts?,
checklist?, ratings?, participations?}`, writes only the columns the
payload names, refuses an unknown column or a block the table cannot take,
resolves the person and the entity the form keys on, replaces the named
children by delete-then-insert **with a read-back**, and **merges**
participations by volunteer (an occasion's attendance sheet is added to,
never rewritten). One exception block covers the whole thing (0090's
lesson), and it answers `{ok:false, result}` for the refusals a screen
must distinguish: `person_deleted`, `partner_deleted`,
`enterprise_deleted`, `vendor_deleted` (each with the id, so the screen can
offer restore), `consent_refused` (IMP-0's field 4), and `invalid` with the
constraint name.

The conditional rules the sheets write in their notes column live in one
trigger, `guard_khld_rules()`, each with a named constraint
(`khld_imp0_visit_block_skipped`, `khld_so30_inactive_reason_required`,
`khld_d2_repeat_participants_required`, `khld_h2_stall_fee_required`,
`khld_f3_linked_record_mismatch`, …); IMP-0's "at least one activity
unless *Never*" is checked in the save function because its rows arrive
after the header.

Applying it found that SO4-G1 records the owner's **age band only** — no
date of birth, no age in years — and `person.age_or_dob` refused every
owner. 0148 widens the constraint with `age_unrecorded_reason
('khld_band_only')`, set by `khld_ensure_person` only when a sheet gave
neither, and re-asserts that every Sahel Horan and Ramtha person still
carries one of the two (OQ-57).

### 0149 — the framework: every quarterly target null, the Plan's targets as data

Four objectives, eight activities, twenty-one indicators, 273 target rows
— **every one null**. The framework's quarterly columns are empty for all
21, and the targets the forms do state are annual, plan-period, a range or
a percentage: none is quarterly, and nothing was divided into quarters
(plan 4.2). They are held instead in `indicator_plan_target`, one row per
stated figure with the framework's sentence verbatim (`source_en`) and the
form's *المستهدف …* sentence where the form states one (`source_ar`, 13 of
21), a basis, and the figures that could be read from the sentence; a
parent's children are the shares of one target (SO3-F2's "of whom ≥ 40%
women"). The dashboard shows the sentence under the row while the
quarterly column reads *not set*.

What was drafted, and where: **the objectives' and activities' Arabic
names** — neither workbook names them in Arabic — in the same position as
Ramtha's activities in 0131. The indicator statements are the index
sheet's in both languages. **Every unit is inferred** (the framework's Unit
column is blank): `%` for the five statements that begin with a percentage
or multiply by 100, `JOD` for SO1-A3 (the unit check gains it), `#` for
the rest. The framework's type column writes *Outocme* and *Ouput*;
stored corrected.

And one thing the sheets get wrong that the platform keeps verbatim:
**five calculation lines number their indicator question wrongly**
(IMP-0 says Q15, the marked field is 17; SO1-0 Q14 → 17; SO3-0 Q12 → 11;
SO4-0 Q20 → 22; SO1-A2 Q18 → 21). Every view reads the field the sheet
**marks** as the indicator question; `indicator.formula` is the sheet's
text, wrong number included, so the dashboard shows the source (OQ-58).

### 0150 — twenty-one views, the milestone rules as data, and what cannot compute

Each view implements its form's calculation line and the count gate of
plan 5.3, anchored on the municipality: a meeting counts with minutes
*prepared and filed* and at least one organisation present; a contribution
enters the JOD total when *received* or *partly received*, never pledged; a
works item on completion, with its priority list as denominator; a
campaign, an action day and an activity only with the evidence the sheet
names declared; SO3-0 as a cumulative ratio of volunteers with two or more
**verified** participations; SO3-F2 unique volunteers on first
participation; SO4-G1 on first completed cycle; SO4-H1 only with a vendor
registered; SO4-H2 attended in whole or part. `v_khld_indicator_unique`
gives SO2-D2's distinct individuals and SO4-H2's unique vendors beside the
participation figures, labelled so nobody sums them. `v_indicator_actual`
is recreated from its 0132 text plus 21 branches, and the migration
asserts every Sahel Horan and Ramtha row of it unchanged.

**The milestones** (plan Part 7). Each rule's critical item numbers are
data in `khld_milestone_rule`, validated by a guard against
`khld_milestone_item` (every number must be a checklist row of that
milestone). Two of the four cannot be evaluated as written — SO1-A1's rule
names a text and a date, SO1-B1's a text — so their `critical_items` is
null, `khld_milestone_status()` and the views answer **not computable**
naming the broken references, and `v_khld_indicator_status` carries the
reason to the dashboard (OQ-56). SO3-E1 and SO3-F1 compute. The boundary
between *Partly* and *Not established* is plan 7.3's default, recorded for
the M&E lead. A coordinator decides the two undecided rules on
`/khld/rules`; the views read the decision on the next query.

`check_municipality_scope.sql` passes with three municipalities (62 views).

### 0151 — evidence on the twenty-one record tables

`attachment_entity_type_known` is rewritten from the live definition with
the 21 names appended (45 in all; junctions and participations excluded),
and `ENTITY_TABLES` in the `evidence` Edge Function gains the same 21,
deployed as version 5 and confirmed equal to the database's list.

### The screens (`app/src/khld`, no migration)

Three screens render all twenty-one forms (list, form, detail), the
Ramtha shape: `forms.generated.ts` says what a field **is** and which
column, junction question, count list, checklist item or child block it
writes; `khld.json` says what it is **called**, in both languages, verbatim
from the sheets; the database says whether it is right. Controls the
Ramtha screens did not have: the identifier type chosen explicitly; count
cells with their sum; checklist rows with status, detail, date and
evidence reference; SO2-0's rating matrix; SO4-G1's sessions with the date
beside *attended*; the volunteers present at an occasion, merged on save;
SO3-0's read-only participation log with its in-period tally; a partner
typed new under the picker and sent as the `partner` block; an enterprise
made from its owner (SO4-G1) or typed new (SO4-G2). The derived fields are
one module shared by the form and the detail screen — the age band comes
from `khld_age_band` by RPC, never a copy of the bands; the milestone
status and the attendance reconciliation come from the 0147 functions.

Where a save is refused on a soft-deleted person, partner, enterprise or
vendor, the screen names who was deleted, when and by whom, and offers a
coordinator restore; the Khalidiyah constraint names a form can hit are
mapped to sentences in `errors.json` and checked against the schema
snapshot like the others.

The dashboard gains its third entry in `dashboardConfig.ts` (no third
dashboard): status and unique-count rows are read from **both**
programmes' views for every municipality, JOD is rendered by
`indicator.unit`, the Plan's sentence sits under each row, and a milestone
that cannot compute links to the rules screen. The four objectives take the
existing colours, with SO4 as the prototype draws it.

Every one of the 21 forms was then driven through its screen with every
field filled, saved and read back column by column, in dependency order,
with the refusals seen on screen (IMP-0's consent and its *Never*
block, a duplicate attendance sheet) and the edit path checked on F2, C2
and A1. Two things came out of it. The checklist status controls all had
the accessible name *Status* — eight identical radiogroups on one form —
and now carry the item number. And a sub-field of the branch not chosen
(a fee on a free stall, IMP-0's block under *Never*) was accepted with a
value in it: the guard refuses a missing one and not a stray one, and the
screen did not clear it. The dependency is now in the catalogue —
`when=(column, codes | bool)` on 44 controls — emitted by `gen_forms.py`
as `when` on the field or part, and `appliesNow()` on the screen dims and
disables a control whose governing answer is not chosen and sends it
blank. The rules that REFUSE stay in the database; the screen only stops
a value being typed where none belongs. The two restore paths (a deleted
volunteer's identifier on F2, a deleted partner's name on SO1-0) and the
evidence flow against the real R2 store were driven from the browser and
are described in the report's §7.

`check-khld-forms.mjs` fails the build on any key the screens build at
runtime that is missing in either locale — headers, sections, labels, the
bool answers, every part heading, and the static keys built from a code —
and was confirmed by removing a label, a part answer and a static key.
`check-untranslated` learned the `KHLD-` code prefix; `khld.json` is
baselined at zero because both locales are the sheets' own words.

### The public page, and 0152

`/khalidiyah` shows **what's on** — published, upcoming activities and
market days: title, kind, date, time, place — with no apply button and no
mention of applications or accounts. `publicJourney(code)` decides which
page a slug gets; the D1 and H1 record screens carry the coordinator's
publish switch, because no sheet has a field for `is_published`.

The view behind it, `v_public_khld_whats_on`, is 0152: security definer
over the two base tables and their ref lists, the four filters in the view,
the sixth and only new anon grant. It was written as `PENDING_0152_…` while
the Supabase MCP could not be reached, and applied once it could: its verify
block asserts the anon surface grew by exactly one view, drives the view
**as anon** (published and future listed; unpublished, past and deleted
not; no route to the base table), and rolls its probe back. The first
attempt was refused by `guard_rmth_other` — the probe had picked the first
`feedback_collected` option, which carries a blank — and rolled back
cleanly; the probe now picks each list's first option that takes no free
text. Read through the REST API with the anon key the view answers 200 and
the base table 42501.

Writing the page before the view existed found a defect in the existing
public home: a query paused between retries (react-query reports pending,
not fetching, not error) rendered "nothing open" — the register's list
that says none yet. Both public pages now render the empty state only from
a query that succeeded.

### Departures from the plan, and what it left open

- **Part headings are the catalogue's words**, not the sheet's — "Recorded
  by (name, position)" for a cell that reads "Recorded by and verified by
  (names, positions, dates)". They are the column comments 0145 applied;
  the sheet's own words are the field label above and the options beside.
- **One control no sheet asks for**: the volunteers present at a
  rehabilitation campaign (SO2-C2), which SO3-0's retention indicator
  counts from. The sheet asks only for totals; the control is labelled as
  the platform's.
- **The publish switch** on D1 and H1, likewise the platform's.
- **The disaggregation panel**. The plan asks for a Khalidiyah breakdown by
  its seven age bands and nationality list; no `v_khld_indicator_
  disaggregated` view was built, and the panel says so from
  `is_disaggregable` as it does for Ramtha. The person-level rows carry
  every dimension, so it is a view away.
- **Verification** (plan Part 11), done on 22 September once the MCP was
  reachable again. Isolation: the five account shapes over 27 Khalidiyah
  tables holding 58 rows, in a rolled-back transaction — the Khalidiyah
  admin and the super admin acting on Khalidiyah see every row; the Ramtha
  admin, the Sahel Horan coordinator and the super admin acting on Ramtha
  see none; the super admin acting nowhere sees every municipality, which
  `can_see_municipality` (0117) says. The Ramtha admin writing into
  Khalidiyah three ways left 0 rows, counted. The probe rows the screens
  were driven with — persons `399000980` and `399000981`, KHLD-VOL-0001
  and its participation, KHLD-EV-2027-01 with its attendance sheet and
  feedback row, KHLD-VC-2027-01, the SO3-F1 verification, *App Probe
  Association* and its survey, KHLD-ENT-001 with its completion,
  KHLD-ENT-002 — are **soft-deleted** as the Khalidiyah coordinator
  through RLS, every row counted, the way the Ramtha probes were; 0 live
  Khalidiyah rows remain and the reference counters stay. The whole of
  `supabase/baselines/2026-09-21_all_before_khalidiyah.md` was re-run: the
  matrix and all seven view hashes identical, every table's counts
  identical except the lines the baseline said would grow and `person`
  14/3 → 14/7 (the four probe people, soft-deleted, the live count
  unchanged).
- **`types/database.ts`** regenerated at head 0152 and stripped. The six
  mock people gained `age_unrecorded_reason: null`; nothing else changed,
  because every Khalidiyah read and write goes through a loosely typed
  handle by name, as Ramtha's do.

---

## Part 13 — Khalidiyah's forms replaced by the reviewed workbook (26 September 2026, migrations 0153–0164, `supabase/khalidiyah`, `app/src/khld`)

Five days after Part 12, the Municipality sent `Khaldia_2_reviewed.xlsx`:
the same programme, re-cut from **21 indicator forms into 24 operational
forms** — a partner list, an outreach log, meetings, contributions, a
milestones register, a rehabilitation checklist, campaigns, activities,
attendance, a park survey, a committee, a volunteer database, volunteer
attendance, counselling sessions, attendance requests, a support log,
markets, vendors, market attendance and a producer survey — each field with
an ID (F001–F213), a type, a dependency and the indicators it feeds, and a
**Calculation formulas** sheet writing every indicator in terms of those
IDs. The request was to replace all of Khalidiyah's forms with these. Four
questions were put to the owner first; the answers are this part's
premises:

- **FORM-12 (volunteers) is public**; FORM-15 (enterprise owners) and
  FORM-17 (vendors) are staff forms.
- **The old tables are dropped**, not kept beside (OQ-60 — the recorded
  exception to hard rule 5).
- **Applied to the live project**, through the MCP, file first.
- **Minors: follow the sheet** — no guardian block (OQ-62).

### One reading, three generators, and the first build kept reproducible

`workbook.py` reads the reviewed workbook's four sheets; `catalogue.py`
says, per Field ID, what KIND of thing it is (text, select, multi, likert,
file, record, the person block …) and which column it writes; `model.py`
holds every typed option to the sheet's option cell, both languages, both
ways. `gen_schema.py` writes `0156`–`0160`, `gen_views.py` writes `0162`–
`0163`, `gen_forms.py` writes the app's definitions and both locale files;
each refuses to run when an applied file would change. The first build's
generators moved to `supabase/khalidiyah/v1/` and still reproduce
`0141`–`0149` byte for byte (into `v1/out/`, ignored by git).

### 0153–0155 — the first build retired

Views first (the leaf views depend on `v_khld_milestone_quarter`), then the
50 tables in one statement, no cascade, then the 238 option lists in two
migrations of 119 — one transaction ran out of lock slots. `v_indicator_actual`
is recreated without the Khalidiyah branches, and Sahel Horan's and
Ramtha's rows are asserted unchanged. The three views the app reads
(`v_khld_indicator_unique`, `_status`, `v_public_khld_whats_on`) are
recreated empty with their columns, so the production app kept working
between migrations.

### 0156–0160 — 39 lists, 23 tables, and the rules as data

- **39 option lists, 196 options**, verbatim; twelve "Other" options take
  free text (the OQ-53 convention, unchanged).
- **The person block** (FORM-12, -15, -17): the ID type is a column of the
  record (F144 / F151 / F156); the number, name, sex, date of birth and
  phone are `person`, found by the identifier of the type chosen. A third
  identifier, `person.other_id_number` (OQ-63), beside the national ID and
  the UNHCR number.
- **Evidence under a Field ID**: `attachment.field_code`, `khld_file_field`
  (nine fields, the sheet's "5 max"), `guard_khld_attachment_field`.
- **The Dependency column as data**: `khld_field_rule`, 36 rows — a field is
  required while its answer is chosen and must be BLANK while it is not
  (FORM-19's consent governs every other answer). One trigger reads the
  rows for its table; refusals are named `khld_<field>_required` /
  `_not_applicable`, and the screen words them from the field's label.
  The three rules that look at another table (a confirmed partner for F174,
  a market held for F207, a person registered on the form the sheet names)
  are written out.
- **Every link is a composite foreign key and the only one on its pair**,
  so PostgREST sees one relationship (the Part 7 lesson, again).

### 0161 — one save path, and the public register

`save_khld_record(p_table, p)`: `{id?, row, person?, option_questions?,
options?, partners?}`, one exception block covering every delete, the
read-back guard, the child rules checked after the children are written.
`khld_register_volunteer` is anon's one write (OQ-61).

### 0162–0163 — twenty-one views from the Calculation formulas sheet

One view per indicator under the sheet's formula, each window taken from
the sheet's Frequency column (OQ-65). The choices the sheet leaves open are
OQ-66 (SO3-0's denominator), OQ-67 (G1's four core topics) and OQ-69 (D1's
bazaar exclusion, not applied). **All 21 compute**; nothing waits on a
definition. A2 counts a partner meeting only once its attendance sheet
(F120) is attached — verified as the Khalidiyah coordinator in both
directions: 0 → 1 when the sheet is attached, back to 0 when the meeting is
made internal or the sheet removed.

### 0164 — the public form's option lists

`v_public_khld_volunteer_option`: nine lists, labels only, the reasoning
of `0056`.

### The screens

One form, one list and one detail screen serve all 23 forms, from
`forms.generated.ts`. `answers.ts` is the one reading of `when`, so the form
and the detail agree on what was asked. The person block looks the
identifier up as it is typed and offers restore for a deleted person;
pickers narrow as the sheet says (open today, confirmed partners, markets
held — OQ-69 on what the database does not refuse); file fields attach
under their Field ID once the record exists. A volunteer's page carries the
review; an activity's or market's page the publish switch. The milestone
rules screen of Part 12 is gone with the rules. `/khalidiyah/volunteer` is
the public register, linked from the what's-on page.

**How it was checked.** The generators' own checks; `check-khld-forms`,
`check-constraint-names`, `check-soft-delete-guards` (taught to read a
multi-table drop and 0154's pattern drop), `check-untranslated`, `tsc`,
`eslint`, the build; the save path, the rules, the review and the evidence
guard driven as the Khalidiyah coordinator in rolled-back transactions; and
all 184 screens (23 forms × list, new, detail, edit × two languages) opened
in a browser against a stub backend built from the catalogue — the
container cannot reach the project — searching every page for raw keys,
case-insensitively, and in aria-labels. That sweep found one: the lists'
"Open" action had no key in either locale (Ramtha's too), and the Arabic
screen said "Open". The enumerator's path to the three questionnaires is
untested at that role: there is no enumerator account (OQ-59).

