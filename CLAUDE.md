# CLAUDE.md — SHM M&E Platform

Read this file first. It is the standing brief for this repository.

---

## What this project is

A monitoring and evaluation platform for **Sahel Horan Municipality, Jordan**.

It backs the *Action Plan for Enhancing Local Economic Participation Through Agriculture and Food Production* — an EU-funded plan implemented with Enabel, running **1 August 2026 to 1 September 2029**.

The platform does three jobs:

1. Collects records through seven forms.
2. Computes **20 indicators** from those records, broken down by sex, age, refugee status and disability.
3. Produces a quarterly return for the donor.

It is not a general CRM. Every table exists to make a specific indicator countable. If a proposed table does not serve an indicator or a form, question it before building it.

---

## Stack

| Layer | Choice |
|---|---|
| Database | Supabase — PostgreSQL 15+ |
| Access control | Postgres row-level security, five app roles |
| Files | Supabase Storage, private bucket `evidence` |
| Migrations | Numbered SQL files, applied in order, append-only |
| Front end | Not in this repo yet |

---

## Where things are

```
CLAUDE.md                      ← this file
docs/01_PROJECT_CONTEXT.md     ← the Action Plan, the four pillars, why rules exist
docs/02_DATABASE_PLAN.md       ← the full schema spec, table by table
docs/03_INDICATORS.md          ← all 20 indicators: definition, formula, targets, source
docs/04_DATA_DICTIONARY.md     ← every field of every form, with option lists
docs/05_ROLES_AND_RLS.md       ← the five roles and the policy for every table
docs/06_OPEN_QUESTIONS.md      ← decisions that must NOT be guessed
docs/07_BUILD_CHECKLIST.md     ← the 17 migrations, in order, with verification
supabase/migrations/           ← the SQL you write
```

When a task touches indicators, open `03_INDICATORS.md`. When it touches a form field, open `04_DATA_DICTIONARY.md`. Do not work from memory on either — the definitions have known conflicts and the exact wording matters.

This applies to the small things too, not only to formulas and targets. The
coordination office module was given the objective label `SO2`, written from
memory, on a screen a coordinator would read as authoritative. `03_INDICATORS.md`
gives `B1.2` as **`SHM-SO1-B1.2`**. One grep would have answered it, and the
document exists so that nobody has to remember.

---

## Hard rules

**1. Never invent an indicator number, target or definition.**
Eight of them have conflicts or gaps in the source workbook. They are listed in `06_OPEN_QUESTIONS.md`. If a value is missing, leave it `null` and surface it as "not set". Do not put a zero there — a zero reads as a real target in a donor report.

**2. Never hard-delete.**
Every table has `deleted_at timestamptz`. Deletion sets it. Every query, view and RLS policy filters `deleted_at is null`.

There are exactly two exceptions, and both are written down here so neither looks like a lapse:

- `audit_log` — insert-only. Cannot be modified by anyone, including a coordinator.
- `applicant_lookup_throttle` — ephemeral rate-limit counters for the public applicant lookup. Rows are purged once their window has passed.

The reason the second one is allowed: this rule exists to keep **programme data** auditable for the donor. Those rows hold no programme data and no personal data — a salted HMAC and an integer, nothing else. Keeping them forever would grow the table without bound *and* would build a permanent record of every lookup any member of the public ever attempted, which is worse for privacy than discarding them. See `06_OPEN_QUESTIONS.md` OQ-21.

Anything else that wants to hard-delete is a defect until it is argued for here.

### Restored, never recreated

Soft delete raises a second question that is easy to get wrong: when a new row arrives whose unique key matches a soft-deleted one, is that a duplicate to refuse or a record to bring back?

> **An entity with history hanging off it is RESTORED, never recreated. An event someone took part in can be re-entered.**

`person` and `partner` are the first kind. Enrolments, registrations and surveys are the second.

The reason is not tidiness, it is that recreating an entity **moves a figure that has already been reported.** G0.4 counts distinct partners with a contribution in the period. Soft-delete a partner and recreate them under the same name, and the old contributions stop counting while the new ones attach to a different row — so a historical quarter's G0.4 changes retroactively. A reported number moving after it was reported is worse than a constraint error.

So their unique indexes stay **global**, deliberately, and `0059` left them that way while making the event-shaped ones partial.

**The corollary is a UI obligation:** when someone tries to create a person or partner whose key matches a soft-deleted row, offer **restore** rather than failing with a constraint error. The rule is correct; without the restore path the UI makes it look like a bug.

**3. Row-level security on every table, no exceptions.**
Including reference tables. A table without RLS in a project holding national ID numbers is a defect, not a shortcut.

**4. Count unique people, not rows.**
`A1.3`, `B1.2`, `D0.1` and `E0.2` all count **distinct `person_id`**. One person in three trainings is one person. This is the single most common way these numbers go wrong.

**5. Migrations are append-only, and a migration is not applied until its SQL is in the repo.**
Never edit a migration that has been applied. Write a new one. Never `drop table` on anything holding data.

**Applying SQL through the Supabase MCP and leaving a note in `supabase/migrations/` is not a migration.** It is an undocumented change to a production database.

This happened: migrations 0034–0049 — sixteen consecutive — were applied through the MCP while the local file was a three-line pointer saying the remote held the authoritative text. For that stretch the repository could not rebuild the database, and the GitHub backup did not contain the schema it existed to back up. `advisory_session`, `linkage_request`, `v_opportunity` and `v_public_opportunity` lived in exactly one place.

So, for every migration:

1. Write the SQL into `supabase/migrations/<timestamp>_<nnnn>_<name>.sql` **first**.
2. Apply that exact text — do not retype it, do not improve it on the way through.
3. The filename timestamp must equal the `version` recorded in `supabase_migrations.schema_migrations`. **A file whose name disagrees with the ledger is not the same migration, even when the bytes match.** `supabase db reset` orders by filename and the CLI identifies migrations by version, so a mismatch replays a migration the ledger has never heard of, in a position it never occupied. Two of the recovered files had drifted this way; the ordering happened to survive, which is luck, not a margin.
4. Verify with `bash supabase/check_migration_files.sh` (see that file's header for the one query it needs).

**Steps 1 and 3 conflict when you apply through the MCP, and the way out is not to skip step 1.** `apply_migration` chooses the `version` itself, so you cannot know the filename until after it has run — which reads like permission to apply first and write the file afterwards. That is exactly the order that produced 0034–0049.

Do this instead:

1. Write the SQL to `supabase/migrations/PENDING_<nnnn>_<name>.sql`. The SQL is now in the repository, which is the substance of the rule.
2. Apply that text.
3. Read the `version` back out of the ledger and rename the file to match.
4. Append the ledger line to `supabase/.ledger_manifest`, then run the check.

The manifest is a saved snapshot, so a migration applied after it was last generated shows up as `NOT APPLIED` — the check is comparing against a stale list, not reporting a real problem. Append the new line rather than concluding the file is wrong.

**Write migration files with LF endings, and be careful when a script writes one.** `0098` was assembled by a Python script that appended to the file with the default `open(path, 'a')`. On Windows that translates `\n` to `\r\n`, so the second half of the file had CRLF while the half written by the editor had LF. The applied text had LF throughout, so the file and the ledger no longer matched — and the file *read back* identically, because Python's universal-newline mode converts CRLF to LF on the way in. Every line hashed the same; only the whole-file hash differed.

`check_migration_files.sh` caught it, which is the point of it. Two things follow: pass `newline=''` (or write bytes) when a script writes a migration, and when the check reports a difference that no per-line comparison can find, compare the byte counts before looking for anything cleverer.

The recovered files are byte-identical to what was applied, taken from the migration ledger — not reconstructed from the schema. `0030` and `0031` are deliberate exceptions and are listed in the check script: the applied text of `0030` contains a password literal, so repairing it from the ledger would put a credential back into git.

**A secret written into a migration survives a git history rewrite.** `supabase_migrations.schema_migrations` stores the applied SQL verbatim, so anything that has ever been in a migration exists in *two* places. Scrubbing the repository — even with `git-filter-repo`, even verified against the remote — does not touch the ledger copy. That is exactly what happened here: the test-account password was removed from git history, and its original text sat in the ledger unnoticed until the recovery work went looking.

So: **never put a credential in a migration.** If one gets in, rotating it is the fix that actually works, because the ledger copy cannot be assumed gone. Scrubbing git is necessary but not sufficient, and treating it as sufficient is how a live secret gets left behind.

The ledger row *can* be edited — `version` is the primary key and the only thing the tooling matches on, and nothing ever replays from `statements`. But editing it to match a file weakens the check that file equals ledger, which is the thing standing between us and a repeat. So: **rotate first, edit only if a live secret lands there, and treat the edit as cleanup rather than containment.**

**6. One person, one row.**
`person.national_id` is unique and constrained to exactly nine digits. Nothing else stores a name or phone for a participant — everything references `person_id`.

**7. Ask before assuming.**
This is a real municipality with a real donor. If a definition is ambiguous, stop and say so rather than picking the reading that is easiest to implement.

---

## Checks that verify shape, not substance

This has now happened eleven times, in eleven unrelated parts of the project.
It is one failure mode, and it is worth naming because every instance looked
fine.

| | what existed | what was missing |
|---|---|---|
| Migration files `0034`–`0049` | the file, correctly named, in the right order | any SQL in it |
| `CONSTRAINT_MESSAGES` keys | a key mapped to a readable message | a constraint of that name in the database |
| Comments in `format.ts`, `glyphs.ts` | a comment describing the behaviour | the behaviour, anywhere |
| `locales/ar/indicators.json` | all 20 `name.*` keys present | Arabic — every value is the English string |
| `objective.os`, `cta.os`, `description.os`, `filterAll.os` | a module wired end to end, compiling, typed, linted | the four keys themselves — the page rendered `description.os` as literal text |
| The four survey views | `status` present in all four definitions, and an `ilike '%status%'` returning true | any `WHERE` on it — the word was in the subquery's *column list*, so a draft survey counted |
| Eight multi-select junctions | a `delete`, a success response, a green toast, and a comment explaining the design | a DELETE **policy** — RLS filtered every row, so unticking a box did nothing, silently, forever |
| `save_followup_section_a` after `0082` | the file, the function, the right signature, a passing migration check and a passing test of the new behaviour | the read-back guard `0080` had added — `create or replace` was written from `0079`'s text and reverted it |
| `save_followup_section_c` after `0088` | the function, the right signature, the RLS policies, four seeded option lists, a green build, and a Q30 prefill that worked on screen | `EXECUTE` on the definer it calls — every test ran as the owner, and a privilege check does not fire for the owner. `authenticated` could not save Section C at all |
| 14 `t(key, { defaultValue })` fallbacks in 9 files | a fallback at every call site that builds a key from a variable, exactly where one is needed | `parseMissingKeyHandler` was `(key) => key` and threw the default away. **Not one of the fourteen had ever fired.** A missing key rendered as `review.blocked.reason_required` on a coordinator's screen |
| `searchPlaceholder.os` | a module live for weeks, its other five per-module key groups all filled in, `en` and `ar` in perfect agreement | the key itself, in **both** locales. The search box on `/forms/os` contained the literal string `searchPlaceholder.os` |
| The Apply button on `/opportunity/:id` | a styled primary control, correct copy, a comment naming the exact route to swap it for | any way to apply. It was **disabled**, on the branch that runs when applications ARE open, saying "applications open shortly" |
| The `ELSEWHERE` map on `/manual-entries` | five rows, each with an indicator, a correct description of where it is entered, and a link or a label | agreement between the label and the app. Three of five said "Not built yet" about screens that existed. The prose beside them was already right |
| `person_restore_candidate` (0107) | the function, the grant, a passing migration check, and a correct result when called | any ability for `authenticated` to call it. It joined `auth.users`, which only the owner can read. **Tested through the MCP, which connects as the owner** |
| `useSetMilestone` | a write that succeeded, an indicator that moved, a mutation with an `onSuccess` that invalidated queries | the query the SCREEN renders. It invalidated `['indicators']` and not `['manual','milestones']`, so the button still said "Mark achieved" after achieving it |
| `detail.state.submitted` | a sentence naming the four follow-up indicators, on a page that had just computed the right three | agreement with the computed list one screen earlier. C1 was named for a survey whose C1 denominator was 0 |
| `cannot_verify` on the three public screens | a clear, sympathetic refusal naming a cause and an action | a true cause. It is also what the RATE LIMITER returns, so a correct national ID was told to check itself against the card and visit the Municipality office |
| The twenty `v_ind_*` leaf views | a checklist step saying `authed_select` must be false for all 20, and a loop in `0015` that revoked them | the revoke, on the four survey views. Each was recreated by `0080`–`0098`, regained the schema's default SELECT grant to `authenticated`, and nobody re-ran the step. A `create view` **re-grants**; a revoke done once is a snapshot of the day it ran. Found by `0114`, which recreates all twenty and asserts the grant is gone |

In each case the thing that would normally be checked *was there*. The file
existed. The key existed. The comment existed. The translation key existed. Any
check counting files, counting keys, or grepping for a name would pass.

The fifth is the inverse of the fourth and the most awkward of the family. There
the key existed and the content was wrong; here the content was never written
and **nothing anywhere knew a key was expected.** `ModuleId` became exhaustive,
`tsc` was clean, `eslint --max-warnings=0` was clean, and four headings on a
live screen read `objective.os`, `cta.os`, `description.os` and `filterAll.os`.

Nothing ever asked whether the **content** was real.

> **The test for any check: could this pass while the thing it checks is wrong?**
> If yes, it is not a check.

The ninth is the one that testing could not have caught by being more careful,
only by being run as somebody else. `save_followup_section_c` is a
`security invoker`, so its nested call to a `security definer` had `EXECUTE`
checked against the caller — and `authenticated`, the only role the application
uses, had been revoked from it. Pasted into the SQL editor it worked perfectly,
because the editor connects as the owner and a privilege check does not fire for
the owner. `05_ROLES_AND_RLS.md` §14 has the full shape and the two-line
technique for testing it.

> **Running something as yourself proves nothing about whether anyone else can
> run it.** `set local role` plus `set local request.jwt.claims`, inside a
> transaction you roll back. Both directions: the roles that should reach it,
> and the roles that should not.
>
> **It happened again on 1 September 2026, in `0107`, and the reason is worth
> keeping.** `person_restore_candidate` is a `security invoker` that joined
> `auth.users` to name who deleted a row. `authenticated` cannot read
> `auth.users`, so every call from the app died with
> *42501 permission denied for table users* — on the one screen whose entire
> purpose is to give a coordinator a way forward from a refusal.
>
> `0107` **was** role-tested. Only half of it was: `restore_person` was driven
> as all five roles and worked; the two lookup functions were checked through
> the MCP, which connects as the owner. The half that was tested was fine and
> the half that was not was completely broken. `0108` is the fix — a
> `security definer` helper for the name, so the lookups stay invoker.
>
> So the rule has a second half: **role-test every function you added, not the
> interesting one.** And the cheapest way to catch this class is not a test at
> all — it is opening the screen, which is how it was actually found.

**The tenth is the fifth again, wearing the safety net that was supposed to stop
it.**

Every place this app builds a translation key from a variable —
`t(\`survey:review.blocked.${result}\`, { defaultValue: … })` — passes a
`defaultValue`, because a server can always return a result nobody wrote wording
for. Fourteen of them, across nine files, all correct-looking.

`parseMissingKeyHandler` was `(key: string) => key`. i18next passes the resolved
default as the **second** argument, and the handler did not take one. So the
default was discarded at every single site and the raw key was rendered instead.
None of the fourteen had ever fired, and nothing could have said so: the key is
built at runtime, so `tsc` cannot see it, the untranslated-value check only looks
at keys that exist, and the missing-key console warning fires *and then the
fallback silently fails anyway*.

It surfaced as `review.blocked.reason_required` on a coordinator's screen, found
by opening the page — the same way `description.os` was found.

> **A fallback that has never fired is not a fallback.** If code exists to
> handle a case that should not happen, make the case happen once and watch it.
> Here that is two lines in the browser console:
>
>     i18n.t('ns:no.such.key', { defaultValue: 'FALLBACK' })   // must not be the key
>     i18n.t('ns:no.such.key')                                 // must not be blank

**The eleventh is the tenth's fix, discovering what it does not cover.**

`parseMissingKeyHandler` now returns the default, so those fourteen call sites
work. `searchPlaceholder.os` was missing anyway, in both locales, from the day
the coordination office shipped — and `ListScreen` reads it as
``t(`forms:searchPlaceholder.${module}`)`` with **no** `defaultValue`, so the
handler never came into it.

That is not an oversight at the call site. **128 of this app's dynamic-key call
sites pass no default, and most of them should not:** there is no sensible
generic fallback for a column heading, a screen description or a search
placeholder. The right answer is the key, written.

So the tenth's fix protects the 14 sites where a default is genuinely
meaningful, and nothing protected the other 128. It was found the same way as
the fifth — by opening the page.

> **`en` and `ar` agreeing proves nothing about whether a key exists.** Both
> were equally missing, and every check in the build was satisfied: `tsc` cannot
> see a key built at runtime, and `check-untranslated` compares the *values of
> keys that exist*, so a key never written is invisible to it.

`check-module-keys.mjs` closes this one class of it: for every id in
`MODULE_IDS`, every locale group indexed by module id must have an entry, in
every locale — plus `columns.<id>.length` against `MODULES.<id>.columnCount`.
**The substance it verifies is that adding a module cannot leave a group
behind**, which is what happened twice. It was confirmed to fail by deleting
`searchPlaceholder.gd` and shortening `columns.gd`, not by reading it. It does
**not** cover dynamic keys built from anything other than a module id; those
still need somebody to open the screen.

And a rule that came out of the same defect, on the database side:

> **A preview never refuses on the CONTENT of what is being submitted.** It
> describes what the action would do; refusals about content belong to the act.
> `review_followup` checked "a rejection needs a reason" before building its
> payload, so previewing a rejection returned `reason_required` instead of the
> consequence — and rejecting is the one action of the three that takes a figure
> out of a quarter that may already have been reported. Approve and reopen need
> no note, so both previewed correctly and testing them proved nothing. Fixed in
> `0100`.

The sixth is the one to remember, because the check was a deliberate act rather
than an oversight. Someone asked "do the survey views filter `status`?", ran
`ilike '%status%'` against `pg_get_viewdef`, got `true` on all four, and moved
on. The word was there. The filter was not — `select s.*` puts every column
name into the definition text, so the pattern matched the subquery's column
list. A grep for a column name can never distinguish a filter from a mention.

> **Searching a view definition for a column name tells you the column exists,
> not that anything is done with it.** Read the `WHERE`, or test the behaviour:
> insert a row in the state that should be excluded and confirm the figure does
> not move — and then flip it to the state that should be included and confirm
> it does. One direction alone passes against a view that counts nothing.

**The seventh is the worst of the family, and it is worth understanding why.**

Eight junction tables — every multi-select in the platform — had RLS enabled,
SELECT/INSERT/UPDATE policies, and no DELETE policy. Every one of them replaces
its rows by delete-then-insert, because that is the only way to express "these
and only these".

**RLS does not raise on a delete it will not permit. It filters the rows.** The
statement affects zero rows and reports success. So: the code runs, PostgREST
returns 200, the UI shows a confirmation, `audit_log` records nothing because
nothing happened, and the box the user just unticked is still ticked in the
database. There is no error anywhere in the system.

The only symptom is a wrong number in a donor report a quarter later, and by
then nothing connects it to the click that caused it.

`partnership_role` had this documented in a code comment for months. The comment
was accurate, thorough, and made the defect feel handled — which is precisely
why nobody swept for the same shape elsewhere and found the other seven.

> **A comment describing a defect is not a fix, and it stops the search.**
> If something cannot be fixed now, the note must say what to grep for.
>
> **After any delete you rely on, count what came back.** `.delete().select()`
> in PostgREST, `GET DIAGNOSTICS`/read-back in plpgsql. A delete that returns
> zero rows is either "nothing matched" or "you are not allowed", and the
> difference is invisible unless you ask.

**And the delete has to be inside the exception block, not above it.**

Every one of these save functions replaces its children by delete-then-insert,
and every one of them catches the refusal and returns a structured result rather
than raising. A plpgsql `exception` block only rolls back the statements inside
its own block. So a handler that begins *after* the delete catches the failure,
reports "not saved", and leaves the deleted rows deleted.

`save_followup_section_c` did exactly that: `buyer_invalid` came back with the
previously recorded buyers already destroyed, and the screen said *"Not saved.
Nothing was written."* Both halves of that sentence were false.

> **Any save function that deletes then inserts must have its exception block
> cover the delete, not just the insert.** One handler on the outermost block.
> Otherwise a refusal reports failure and destroys the old rows in the same
> breath — and the message it shows will be a lie in the most reassuring
> possible direction.

Three things follow, and `0090` is all three:

- Wrap **every** such function the same way, including the ones that look safe.
  Sections A and B were safe only because their handlers happened to sit before
  any delete. Safe by accident is a defect waiting for someone to move a line.
- Do **not** fix it by raising instead of returning. That rolls back correctly
  and throws away the specific result — `buyer_invalid` is the only thing that
  tells the enumerator which block was wrong.
- Do **not** fix it by validating before writing. It reads cleanest and it means
  a second copy of a rule that a trigger already enforces, and two copies drift.
- Keep `insufficient_privilege` **out** of the handler. That is the read-back
  guard above reporting that RLS filtered a delete, and turning it into a tidy
  message is the exact failure the guard exists to catch.

**The eighth happened while fixing the seventh, twenty minutes later.**

`0082` needed to change `save_followup_section_a`'s signature. It rewrote the
function starting from `0079`'s text — which is the version from *before* `0080`
added the read-back guard above. The guard vanished.

Everything was green. The file was there, the function was there, the signature
was right, `check_migration_files.sh` passed, and `0082`'s own test of the new
free-text behaviour passed. Nothing in the project could have caught it, because
every check was pointed at what `0082` *added*.

> **`create or replace function` takes the whole body, so it silently reverts
> every later change to that function.** It is the only kind of migration here
> that can undo an earlier one. Before replacing a function, list what has
> touched it:
>
>     grep -l "function public.<name>" supabase/migrations/*.sql
>
> `0079` wrote it, `0080` guarded it, `0082` re-signed it. Three files, and the
> middle one was the one that mattered.

What that means in practice:

- Do not verify a migration by confirming the file is present. Verify its SQL is
  byte-identical to what was applied — `check_migration_files.sh`.
- Do not verify an error mapping by reading it. Verify each name exists in
  `pg_constraint` / `pg_class` — `check-constraint-names.mjs`.
- Do not verify behaviour with a comment. Run it, or write a test.
- Do not verify a translation by counting keys. A key whose value equals the
  English string is untranslated, and counting will never say so.
- **Do not assume a missing translation key will be caught.** It is not a type
  error and it cannot be, because `t()` takes a string. Adding a module means
  opening every one of its screens in both languages and reading them. There is
  no automated answer to this one, and pretending otherwise is how four raw keys
  reached a screen that had passed every check in the build.

### A placeholder is a claim about the state of the system

Found 1 September 2026, three times in one sweep. It is its own shape and it
belongs beside the others.

A placeholder — a disabled control, a "not built yet" label, a "coming soon" —
is not a neutral absence. **It is an assertion about a part of the system the
screen making it cannot see.** It is written when it is true, and nothing ever
tells it when it stops being true, because nothing tests copy.

Three at once, all of them stale in the same direction:

- The **Apply** button on `/opportunity/:id` was hard-disabled with
  *"Applications open shortly. Ask at the Municipality office in the
  meantime."* `/apply/:id` had existed since `0054`. Worse, that branch is the
  one that runs when `canApply` is **true** — so a farmer looking at something
  open that day was told to come back later and go to the office.
- Three of the five `ELSEWHERE` rows on `/manual-entries` said **"Not built
  yet"** about `/forms/gd`, `/initiatives/:id` and the contribution log. The
  DESCRIPTIONS on the same lines already named those screens correctly:
  somebody updated the prose and not the map beside it.
- `settings.intro` read *"Visual placeholder. Nothing is configurable in this
  prototype."* directly above a working language control, and the empty state
  under it promised the rest "once the platform is built".

The `ELSEWHERE` one is the instructive one, because **a comment warning about
exactly this drift sat directly above the array, and it drifted anyway, within
a day.** A warning is not a check.

> **A placeholder must be derived, or checked, or it will lie.** If a screen
> asserts that something elsewhere does not exist, that assertion needs the
> same treatment as a constraint name or a locale key: derive it from the
> thing itself, or add a check that fails when it goes stale.
> `check-elsewhere-routes.mjs` does this for the one map — it fails when a row
> says "not built" for a route App.tsx declares. It was confirmed by making it
> fail in all four directions, not by reading it.
>
> And the corollary for the reviewer: **grep for the shape.** `disabled=`,
> "not yet", "coming", "soon", "ask at", "in the meantime", "for now",
> "until", "once X exists". Every hit is a claim with a date on it.

### The screen that denies a write that happened

The seventh failure in this register is a delete that reported success and did
nothing. On 1 September 2026 the mirror image turned up: **a write that
succeeded while the screen went on saying it had not.**

Marking milestone B1.1 achieved wrote `is_achieved` and `achieved_on`, moved
the indicator, and left the button reading "Mark achieved". Verified in the
database while the screen still denied it. `useSetMilestone` invalidated
`['indicators']` and `['overview']` — and not `['manual','milestones']`, the
query the screen it lives on actually renders.

Both of its neighbours in the same file invalidate their own list correctly,
which is precisely why it survived: the file looks consistent.

It is the same cost as the silent delete, arrived at from the other side. The
user's only available response to a screen that says nothing happened is to do
it again.

> **A mutation must invalidate the query the user is looking at, not only the
> ones its result feeds.** After any write, watch the screen you are standing
> on change. If it does not, the write is not finished — and "it worked, I
> checked the dashboard" is not the same claim.

### A user-facing message is a comment that the user reads

The rule above about comments — *"a comment that asserts is a comment that will
eventually lie"* — was written about code. On 2026-09-01 the same shape turned
up in the place where it costs most.

`check_linkage_eligibility` (0057) accepted **any** completed advisory. Its own
hint read:

>     'The producer must complete a market advisory session first.'

and so did every line of copy around it: the public page's intro, its
"who can ask" note, the home-page call to action, the queue's introduction, and
the refusal title *"A market advisory session comes first"*. Six places said
market. Nothing enforced it, because there was no track to enforce it on until
`0105`.

Both halves were wrong in opposite directions and both were invisible:

- a producer who completed a **home-based** advisory was let through a gate
  whose own words said they should not be, and
- a producer refused for having no advisory at all was told to go and get a
  *market* one, which was true by accident.

> **Copy is a specification the user can read.** When a message names a rule,
> either the code enforces exactly that rule or the message is a defect —
> and it is a worse defect than a wrong comment, because the person acting on it
> is outside the building. Before writing a rule into copy, grep for the code
> that has to agree with it; before changing that code, grep the locale files:
>
>     grep -rn "market advisory" app/src/locales/

`0106` narrowed the check to `track = 'market'`, in both places the rule lives —
the trigger and `request_linkage`'s pre-check — and made the two refusals
distinguishable, because *"our records do not show a completed advisory"* sends a
home-based completer looking for a lost record instead of for the right session.

The two automated checks above both exist because of this pattern. When you add
another, write down which substance it verifies — not which shape.

---

## Conventions

### Every table gets this block

```sql
id          uuid primary key default gen_random_uuid(),
created_at  timestamptz not null default now(),
updated_at  timestamptz not null default now(),
created_by  uuid references auth.users(id),
deleted_at  timestamptz
```

Plus an `updated_at` trigger named `trg_<table>_updated`, and an audit trigger named `trg_<table>_audit`.

### Naming

- Tables: singular, snake_case — `person`, `training_enrolment`, not `persons`
- Lookup tables: `ref_` prefix — `ref_product`, `ref_partner_type_training`
- Junction tables: `<parent>_<child>` — `exhibition_registration_product`
- Views: `v_` prefix. Indicator views: `v_ind_<code>` with dots as underscores — `v_ind_a1_2`
- Functions: verb first — `snapshot_period()`, `followup_prefill()`
- Enums: `_t` suffix — `sex_t`, `record_status_t`

### Anything a field officer creates on a phone

Add `client_uuid uuid unique`. A worker who loses signal and re-syncs must not create a duplicate row.

Applies to: `training_enrolment`, `office_service`, `guidance_record`, `exhibition_registration`, `followup_survey`, `mentorship_session`.

### Multi-select fields

Never a text array. Always a junction table against a `ref_*` table. The indicators require breakdowns by these values, and you cannot index or join an array of labels cleanly.

### "Other (please specify)"

The `ref_*` row carries `allows_free_text = true`. The owning table carries a matching `*_other text` column. A check constraint requires the free-text column to be filled when that option is chosen.

### Bilingual

Every `ref_*` table has `label_en` and `label_ar`. Free-text fields store whatever the user typed. Do not build a translation table for user content.

---

## Commands

```bash
supabase migration new <name>      # create a numbered migration
supabase db push                   # apply to the linked project
supabase db reset                  # rebuild locally from all migrations + seed
supabase gen types typescript --linked > types/database.ts
```

When using the Supabase MCP, apply one migration at a time and run that step's verification query before moving on.

---

## Definition of done for a migration

Before you say a migration is complete, all of these must be true:

- [ ] **The SQL is in `supabase/migrations/`, byte-for-byte what was applied, under a filename whose timestamp matches the ledger `version`**
- [ ] **`bash supabase/check_migration_files.sh` passes**
- [ ] It runs on a clean database with `supabase db reset`
- [ ] Every new table has RLS enabled and at least one policy
- [ ] Every new table has the standard column block and both triggers
- [ ] Every foreign key has an index
- [ ] The step's verification query in `07_BUILD_CHECKLIST.md` returns the expected result
- [ ] Any assumption you had to make is written into `06_OPEN_QUESTIONS.md`, not left in a code comment

---

## Working style for this repo

- Small migrations. One concern each. Do not combine "create the markets tables" with "write the market indicator views".
- Comment the *why* in SQL, not the *what*. `-- E0.2 counts distinct people, so this must not be per-registration` is useful. `-- create table` is not.
- **Never write a comment claiming a behaviour is implemented somewhere else.** Comments explain reasoning. Behaviour is proven by a test or by running it.

  This has now happened twice. `format.ts` carried a constant that read as authoritative about Western digits while two of three code paths ignored it. `glyphs.ts` said the back arrow was "mirrored under RTL by the `scale-x-[-1]` on the span that renders it" — and not one of the four call sites did that. Both comments were written in good faith, described a real intention, and were false.

  A comment that asserts is a comment that will eventually lie, and it lies most convincingly to whoever reads it next — including to whoever wrote it, six weeks later, deciding they do not need to check. Describe what *this* code does and why. If the behaviour lives elsewhere, point at it (`see 0053`) rather than vouching for it.
- **A value generated as a side effect, in a field nobody is looking at, will be wrong.** `resolveSession()` has produced exactly two rows in this project's life. One is titled **"Phase4 test — New Trainee"** — a person's name where a course title belongs — and the other set `is_delivered = true`, which silently moved D0.2 every time a coordinator recorded a completion. Neither was noticed at the time, because nobody was looking at a field they had not typed into.

  That is the argument for recording provenance (migration `0063`) in one sentence: if a row can be created as a by-product, the row should say so, and the fields it could not know should stay empty rather than being guessed.
- When a business rule and a technical convenience conflict, the business rule wins. If a trigger has to be slow to stop double counting, it is slow.
- Report conflicts you find in the source data. There are already eight known ones; there may be more.
