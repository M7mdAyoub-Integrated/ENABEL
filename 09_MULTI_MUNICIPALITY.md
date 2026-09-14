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

### The dashboard (`RmthDashboard`, `DashboardSwitch`)

`/dashboard` is one URL. `DashboardSwitch` renders `routes/Dashboard` —
Sahel Horan's, unchanged — unless the acting municipality is Ramtha, in
which case `rmth/RmthDashboard`. Nothing is computed in the front end: the
eighteen rows come from `v_indicator_progress`, the reason a row has no
figure from `v_rmth_indicator_status`, the names from the database (Sahel
Horan's `indicators:name.*` keys are Sahel Horan's statements, and `A1.2` is
a different indicator here). Three states, each in words: a figure against
*target not set*; *not computable until decided*, naming the definition in
the reader's language from the threshold row's own label, with a link to
where it is decided; *no statement* for SO1-A1. The four headline cards are
four of the rows below them — events, proposals approved, incubators,
participants in incubation — chosen because each has a form and no open
item.

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
| `superadmin@shm.test`, acting Ramtha | 0 | Ramtha's | `app_user` all 8 |
| `superadmin@shm.test`, acting nowhere | all | all | all |

`rmth_reference_counter` answers `NOSELECT` to every client role: it has no
grant at all, and only the reference trigger reads it. The views: a Sahel
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
