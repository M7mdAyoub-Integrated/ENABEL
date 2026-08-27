# Audit and finish the public flow

Full audit against my original requirements, then build what is missing. **Do the audit first and report before building anything.**

---

# PART 0 — What I asked for, in my words

The whiteboard has three columns, SO1 → SO2 → SO3, with a person entering at the left.

**No sign-in for the public. No sign-up. No tailored participant page.** One **global home page** that everyone sees.

*(Corrected 27 Aug 2026. The original wording said "No sign-in" flatly, which read as though staff could not log in either — there are five roles and an entire municipality side. What it meant: the PUBLIC never needs an account. Sign-in stays live in every build for staff; nothing on the public path links to it, redirects to it, or says "log in to continue".)* It lists the trainings and exhibitions the municipality has published. A member of the public opens it, picks something, reads a detail page, and applies with their national ID.

**SO1 — the entry point.** Training (technical capacity) and the coordination office. The municipality creates a training through a form. That form must collect: **training partner, focal point, application start date, application end date, training duration in hours, location, and sector.** Once created and published it appears on the global home page for everyone. Same for exhibitions.

**SO2 — earned, not open.** Market advisory is only for someone who has finished a training. Market linkage is only for someone who has finished an advisory. Advisory is a session, like a training. Linkage connects people who finished advisory to markets and companies.

**SO3 — open to everyone.** Exhibitions. No training required. Anyone can apply. Shown on the home page like everything else.

**Every event has a participant list** — training, exhibition, advisory, coordination office.

**Coordination office.** A municipality form only, no public page. When the office serves someone it records them by national ID, because that is what makes the count unique. Sidebar, admin only for now. Whoever fills it may later be a different user; do not build that role, just do not make it hard to add.

**National ID is the spine.** Everything connects to it. Any question answerable from what is already known about that national ID must be prefilled, so nobody answers it twice.

**Out of scope, do not build:** campaigns, home-based advisory, identity verification beyond what exists.

---

# PART 1 — The audit

Go through every line. Mark **DONE**, **PARTIAL** or **MISSING**, and name the file or table that proves it. Check the code, not your memory of the session. Where something is PARTIAL, say exactly what is missing.

### Public

```
[ ] Global home page at /, no session required
[ ] Lists published trainings, advisory sessions and exhibitions together
[ ] Closed, full and cancelled handled sensibly rather than hidden
[ ] Detail page: description, dates, location, duration, sector, focal point
[ ] Detail page says WHY someone cannot apply, not just a disabled button
[ ] Apply form, national ID first
[ ] Prefill from national ID — every known field, read-only, never asked twice
[ ] Apply works for training
[ ] Apply works for advisory, with the eligibility gate
[ ] Apply works for exhibition, including producer type and products
[ ] "My applications" — national ID in, every application and status out
[ ] No sign-in or sign-up reachable anywhere
[ ] No participant portal, no tailored personal page
[ ] Every public page works at 320px in both languages
```

### Municipality — create and publish

```
[ ] Create-training form, with ALL SEVEN of my fields
[ ] Publish a training so it appears publicly
[ ] Create-exhibition form with the same publishing fields
[ ] Publish an exhibition
[ ] Create-advisory form
[ ] Publish an advisory
[ ] Publish is a separate action, never a field on a create form
[ ] The create form states plainly what becomes public
```

### Municipality — participant lists

```
[ ] Training: who applied, accept, reject, mark attended, mark completed
[ ] Exhibition: same, plus the approval E0.2 counts, plus booths
[ ] Advisory: same, plus how each person qualified
[ ] Coordination office: the people served
[ ] Application status and completion shown as separate facts, never merged
```

### The SO2 chain

```
[ ] Completed training unlocks advisory, enforced in the database
[ ] Completed advisory unlocks linkage, enforced in the database
[ ] A coordinator inserting directly is subject to the same rule
[ ] Public linkage request form
[ ] Municipality screen to review and match a request to a partner
[ ] Matching creates the initiative and the linkage together
[ ] Attach-to-existing or create-new, so nobody accumulates duplicate initiatives
```

### Coordination office

```
[ ] Form exists, sidebar, admin only
[ ] National ID lookup, same as everywhere else
[ ] Writes to office_service — the table already exists, do not create one
[ ] Three visits by one person move B1.2 by ONE
```

**Report the whole list before building.**

---

# PART 2 — Build what is missing

In this order. Stop and report after each. Commit after each.

---

## 1. The create-training form

**This is the entry point to everything and it does not exist.** Right now sessions are created as a side effect of `resolveSession()` in `data/completions.ts`, carrying only title, topic, dates and `is_delivered: true`. None of my seven fields. The two published trainings on the home page were inserted by SQL, not through a screen.

### Fields

| Field | Column | Notes |
|---|---|---|
| Title | `title` | required |
| Sector | `topic_id` → `ref_training_topic` | required. This is my "sector" — same list, public label may say sector |
| Start date | `start_date` | required |
| End date | `end_date` | required, `>= start_date`, already constrained |
| Duration in hours | `duration_hours` | required. **Not derived from the dates** — a three-day course may be twelve hours |
| Location | `venue` | required for a public page. Someone has to know where to go |
| Training partner | `delivered_by_partnership_id` | dropdown of active training partnerships |
| Focal point | `focal_point` | free text, **goes public** |
| Description | `description` | free text, goes public |
| Places | `planned_seats` | optional. Set means the public page shows places remaining |
| Applications open | `application_opens_on` | |
| Applications close | `application_closes_on` | |

**Not on this form:** `is_published`, `is_delivered`. Both are separate deliberate actions.

### Rules

- **Partner may be empty.** The column is nullable and there may be no training partnership yet. If the dropdown is empty, say so and link to where partnerships are created rather than blocking the form.
- **Warn if applications close after the training starts.** Legal, occasionally intended, usually a mistake. Warn, do not block.
- **Warn if the application window is entirely in the past.** The training can still be created — the municipality may be recording something historic — but it will never be applicable, and that should be said out loud.
- **`focal_point` and `description` go public exactly as typed.** Quote them back on the publish step with a plain warning: this appears on a page anyone can read, so use an office contact, not a personal mobile.
- **Places is not the same as applicants.** If `planned_seats` is set the public page shows places remaining. If it is null the public page shows the closing date instead. Never show an applicant count publicly.

### Verify

- Create one through the screen with all fields, then read the row in the database and confirm every field landed.
- Confirm it does **not** appear on the public home page until published.
- Publish it, confirm it appears, confirm `v_public_opportunity` returns it.
- Confirm `is_delivered` is still false and `D0.2` has not moved.

---

## 2. Decide what to do about `resolveSession`

**Tell me your reasoning before changing it.**

The function made sense when a session was a grouping key for completions. It is now a public opportunity with an application window and a focal point, so a form that creates them as a by-product will keep producing rows that can never be published.

But the paper-form argument in your own comment is real: staff record a completion for a course that was never in the system, and blocking that would make the completion form unusable.

Two options I can see:

**A. Keep it, mark what it creates.** Add a column recording that the session came from a completion rather than being set up. The sessions list then shows a "needs details" state, and a coordinator can fill in the missing fields and publish it if it should be public. Costs a migration.

**B. Keep it, infer the state.** A session with no focal point, no application window and `is_delivered` true was auto-created. No migration, but it is a heuristic, and heuristics drift.

I lean towards A because explicit beats inferred, and this is the kind of thing someone will need to audit later. But you have read that code more recently. Say what you think and why.

**Either way:** check whether the three existing `draft/DELIVERED` sessions are real trainings or test artefacts. They are currently feeding `D0.2`.

---

## 3. Extend the exhibition create form

The form exists from module 2 but collects only name, dates, location, capacity and sponsor. An exhibition created through the UI today can never appear publicly.

**Add:** `description`, `focal_point`, `application_opens_on`, `application_closes_on`.

Same shape and same wording as the training form, so a coordinator learns one form rather than two.

Note that `exhibition` has `is_cancelled` but no cancellation-reason constraint — that was removed in 0029 deliberately, and training and advisory do require one. Leave the asymmetry; it is recorded in the open questions.

---

## 4. Exhibition publish and participant screens

Same shape as the training screens you already built, with **three differences that matter**.

**Capacity is real.** Booths taken against booth capacity, live. The trigger already refuses a registration when approved registrations equal capacity, and refuses one for an exhibition that has ended. The screen must not offer what the database will refuse.

**Approval is what counts.** `E0.2` counts distinct people with `status = 'approved'`. So approving is the action that moves an indicator, and it should look like a decision rather than a tidy-up. A registration sitting at `submitted` counts for nothing, and the screen should make that plain rather than letting a coordinator assume applying is enough.

**`is_first_time` is derived, never asked.** A trigger sets it from prior approved registrations. Display it; do not offer it as a field.

Also show, per registration: producer type, and the products they selected from the junction table.

### Verify

- Approve one registration, confirm `E0.2` moves by exactly one.
- Approve a second registration for the same person on a different exhibition, confirm `E0.2` does **not** move — it counts people, not registrations.
- Try to approve past capacity, confirm the refusal is readable.

---

## 5. Advisory: create, publish and participant screens

Same shape again. **Two differences.**

**Eligibility on entry.** Only someone with a completed training can apply, and the trigger enforces it. The participant list should show **how each person qualified** — which training they completed and when. That is the audit trail for the chain, and without it a coordinator cannot answer "why is this person here".

**Completing an advisory unlocks linkage.** So it is a decision with three outcomes — completed, did not complete, not yet decided — exactly like training. Never a checkbox.

Advisory has no indicator of its own. `C1.3` is still an open question — do not wire it, and do not let the screen imply it is wired.

### Verify

- A person with no completed training is refused, with a message saying what they need first.
- A person with a completed training is accepted.
- Mark an advisory complete, then confirm that person can now request a linkage.
- Soft-delete their training, confirm their existing advisory place survives but a new application would be refused.

---

## 6. Linkage: request and matching

The most complex item. Two screens.

### Public: the linkage request

Only for someone with a completed advisory. Same national ID plus date of birth check as everywhere else, same throttle, same byte-identical failure.

Collects, into `linkage_request`:

- What they produce — a title, and an activity type from `ref_activity_type`
- What they are looking for — free text. A buyer, a processor, an input supplier, a market
- When requested
- Status: submitted, under review, matched, closed

The activity type and title are captured **here** rather than at match time, so matching is one click and the coordinator is not filling an initiative form they never asked for.

### Municipality: matching

Review a request, then match it to a partnership. On match, create **both** a `production_initiative` and a `market_linkage` in one action.

**The important part:** a person may already have an initiative. The screen must offer **attach to an existing initiative** or **create a new one**, and default to attach where one exists.

`C1.2` counts distinct initiatives that have a linkage. Creating a second initiative for someone who already had one inflates that indicator permanently, and nothing downstream will ever notice.

`market_linkage.status` should start at `proposed` or `under_review`. **`C1.2` only counts `active` and `ended`**, so a proposed linkage does not count yet — which is correct, and the screen should show that plainly rather than letting a coordinator think matching alone moved the number.

### Verify

- A person with no completed advisory cannot request a linkage.
- Match a request, confirm both rows are created and linked.
- Confirm `C1.2` does **not** move while the linkage is `proposed`.
- Move it to `active`, confirm `C1.2` moves by one.
- Match a second request for the same person, attach to the existing initiative, confirm `C1.2` does **not** move again.

---

## 7. The coordination office

Municipality form only. No public page, no application, no eligibility, no publishing.

`office_service` already exists from migration 0007 — **do not create a table.** It has `person_id`, `service_type_id`, `service_date`, `adviser`, `notes` and `client_uuid`.

### Fields

- **National ID first**, using the same lookup as everywhere else. Existing person prefilled and locked; a new ID creates a person
- Service type from `ref_office_service_type`
- Date
- Adviser
- Notes

Normal module shape: list screen, form screen, detail, soft delete. Sidebar, **admin only** for now.

### Why the national ID is the whole point

`B1.2` counts **distinct people** reaching office services, not visits. The same farmer may come six times — one person, six rows. If the identifier were a name, six spellings become six people and `B1.2` inflates permanently and invisibly.

So the lookup is not a convenience here. It is the indicator.

### On the future role

Do not build an office-staff role. But do not architect anything that makes it hard: `office_service` policies follow the same `is_staff()` shape as everything else, so adding a role later should be a policy change and not a restructure. If anything you build would make that harder, say so.

### Verify

- Record three visits by one person on different dates, confirm `B1.2` moves by **one**.
- Record a visit by a second person, confirm it moves to two.
- Confirm `ref_office_service_type` covers what the office actually does — it is a list I invented, not one from the source workbook, and it is already an open question.

---

## 8. "My applications"

Confirm whether this exists. I do not think it was ever built.

A public page where someone enters their national ID and date of birth and sees every application they have made and its status, across trainings, advisory sessions, exhibitions and linkage requests.

### Rules

- **Same verification as the prefill** — national ID plus date of birth, or national ID plus phone where date of birth is null. Same byte-identical failure for a wrong pair and a non-existent person. Same throttle. Do not build a second, weaker path to the same data.
- **Minimal payload.** What they applied for, when, and its status. Never `is_refugee`, never `has_disability`, never a person id, never anything about another person.
- Needs its own `security definer` RPC. Do not widen the existing prefill to carry it — one function, one purpose.
- Works with no session at all.

### Verify

- Run it as `set role anon` and confirm the payload contains nothing beyond what is listed.
- Confirm a wrong pair returns exactly the same bytes as a non-existent person.
- Confirm the throttle applies.

---

# PART 3 — Rules for all of it

**National ID prefill everywhere.** If the system knows it, do not ask. This is not only convenience — a person typed in twice becomes two people and inflates `A1.3`, `B1.2`, `D0.1` and `E0.2` permanently.

**Publish is always a separate deliberate action.** Never a field on a create form. And the publish control must never look like the delivered control — one makes something public, the other feeds `D0.2`.

**Completion is a decision with three outcomes** — completed, did not complete, not yet decided. A checkbox holds two of the three, and the one it drops is what the donor return needs.

**Never compute an indicator in the front end.** Every figure comes from a view.

**Never weaken a database refusal.** If a trigger refuses something, that is the answer. Surface it in plain language; do not route around it.

**Responsive from 320px, both languages, RTL correct.** The public pages are what a farmer opens on a phone.

**Tell me every form you create** — by name, what it collects, which table it writes to. I am keeping that list.

**Check the database, not the screen.** After every write path, read the row back. A delete that navigates away and writes nothing looks exactly like success.

---

# PART 4 — When it is all done

Run the three acceptance tests from `07_BUILD_CHECKLIST.md`, using data entered through the new screens rather than seeded:

1. Soft delete flows through to indicators
2. One person across three trainings counts as one
3. A registration does not count until approved

Then give me the current value of all 20 indicators and tell me which ones moved, and why.

Then clean up: every row created during testing, named so it is findable, removed.
