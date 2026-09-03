# 04 — Data Dictionary

Every field of every form as it exists in the source workbook, and where it goes in the database.

Seven form sheets exist. This document also records the fields that **must be added** for the indicators to work.

---

## Reading key

- **Source field** — exact wording from the sheet, including its typos where they matter
- **→** — the table and column it maps to
- **NEW** — does not exist in the sheet, must be added
- **Options** — the exact list from the sheet; seed these into the matching `ref_*` table

---

# 1. `Partnership_form` → `partner` + `partnership`

Feeds **A1.2** and **G0.4**.

| Source field | → | Type | Notes |
|---|---|---|---|
| Name of Partner | `partner.name` | text | required |
| Contact person | `partner.contact_person` | text | |
| phone | `partner.phone` | text | |
| email | `partner.email` | text | |
| Partner type *(single select)* | `partnership.partner_type_id` → `ref_partner_type_training` | uuid | |
| Primary role(s) in the agricultural training programme *(select all)* | `partnership_role` junction → `ref_partner_role_training` | many | |
| — | `partnership.partnership_type` | enum | fixed to `'training'` |
| **NEW** | `partnership.established_on` | date | **required for A1.2** — the indicator counts partnerships "established or activated", which needs a date to fall inside a reporting period |
| **NEW** | `partnership.is_active` | boolean | the formula says "active partnerships" |
| **NEW** | `partner_contribution` rows | table | **required for G0.4** — the indicator counts partners with a documented contribution *in the period*. Nothing in the workbook records contributions. |

### Partner type options (8)

```
Government institution (national or local)
Public training institute / extension service
University / academic institution
Private sector company
Non-governmental organization (NGO) / civil society organization (CSO)
International organization / development partner
Financial institution
Other (please specify)          ← allows_free_text
```

### Primary role options (12)

```
Training delivery (provision of training services)
Curriculum development and accreditation
Funding / financial support
Market linkage / job placement
Input provision (e.g., seeds, equipment, technology)
Community outreach and participant mobilization
Technical advisory / extension services
Monitoring, evaluation, and learning (MEL) support
Logistics and operational support (e.g., venues, transport)
Financial services (e.g., loans, grants to beneficiaries)
Policy / regulatory support
Other (please specify)          ← allows_free_text
```

---

# 2. `Production-support_Partnership_` → `partner` + `partnership`

Feeds **C1.1** and **G0.4**.

Same `partner` table as above. This is the change that stops double counting: one organisation, one `partner` row, and a second `partnership` row with `partnership_type = 'production_support'`.

| Source field | → | Notes |
|---|---|---|
| Name of Partner | `partner.name` | if the name already exists, reuse the `partner` row |
| Contact person | `partner.contact_person` | |
| Phone | `partner.phone` | |
| Email | `partner.email` | |
| Partner Type *(single select)* | `partnership.partner_type_id` → `ref_partner_type_production` | |
| Primary role(s) in supporting local producers *(select all)* | `partnership_role` → `ref_partner_role_production` | |

### Partner type options (9)

```
Government institution (national or local)
Technical institution / research centre
Food processing facility / agro-processing company
Private sector company (input supplier, trader, agribusiness, etc.)
Financial institution
Non-governmental organization (NGO) / civil society organization (CSO)
International organization / development partner
Universities
Other (please specify)          ← allows_free_text
```

### Primary role options (10)

```
Technical advisory / extension services to producers
Input provision (e.g., seeds, fertilizer, equipment, technology)
Processing / value addition support
Market linkage / buyer connections
Quality standards, certification, or food safety support
Financing / credit / grants to producers
Infrastructure or logistics support (e.g., storage, transport, cold chain)
Policy / regulatory support
Tech readyness                  ← typo in source; seed as "Technology readiness"
Other (please specify)          ← allows_free_text
```

---

# 3. `Completion_form` → `person` + `training_enrolment`

Feeds **A1.3** and, in the workbook's reading, **D0.1**.

This sheet does two jobs at once: it creates the person and it records the completion. In the database these are two tables.

| Source field | → | Notes |
|---|---|---|
| National_ID | `person.national_id` | unique, `^[0-9]{9}$` |
| National_ID (validation) | *not stored* | UI-only confirm field |
| Name | `person.full_name` | |
| Gender | `person.sex` | enum `female` / `male` |
| Age | `person.age_recorded` | prefer `date_of_birth` if available |
| Phone number | `person.phone` | |
| Training title | `training_session.title` / `topic_id` | select an existing session, do not free-type |
| Training date | `training_session.start_date` | comes from the session |
| What is your current involvement in agriculture? | `person.agri_involvement_id` → `ref_agri_involvement` | |
| What type of agricultural activity are you involved in? *(select all)* | `person_activity_type` → `ref_activity_type` | |
| did this person meet the completion criteria? | `training_enrolment.met_criteria` | boolean, the decision that drives A1.3 |
| **NEW** | `person.is_refugee` | **required** — A1.3 and D0.1 both disaggregate by refugee status |
| **NEW** | `person.has_disability` | **required** — same |
| **NEW** | `person.village` | Al Turra / Al Shajara / Amrawa / Al Thnaibeh |
| **NEW** | `training_enrolment.session_id` | which session — the sheet only has a free-text title |
| **NEW** | `training_enrolment.attended` | attendance is separate from completion |
| **NEW** | `training_enrolment.decided_on` / `decided_by` | who made the completion decision and when |

### Involvement options (6)

```
Farmer (own land)
Farmer (working on rented/shared land)
Agricultural worker (laborer)
Agribusiness owner (e.g., processing, trading)
Student (agriculture-related)
Not currently working in agriculture
```

### Activity type options (5)

```
Crop production
Livestock
Greenhouse farming
Food processing
Other
```

### Training topics (6) — from the Action Plan narrative

```
Modern agriculture
Smallholding management
Irrigation
Product quality
Food processing
Marketing
```

---

# 4. `Linkage_profile` → `market_linkage`

Feeds **C1.2**.

| Source field | → | Notes |
|---|---|---|
| National ID of farmer | via `production_initiative.person_id` | look up in `person`, do not re-type |
| name | *not stored* | read from `person.full_name` |
| phone | *not stored* | read from `person.phone` |
| Partner linkage name | `market_linkage.partnership_id` | **was free text** — now a foreign key to `partnership` |
| linkage scope | `market_linkage.scope` | text |
| request to linkage | `market_linkage.request` | text |
| **NEW** | `market_linkage.initiative_id` | **required for C1.2** — the indicator counts *initiatives* connected to a market, so the linkage must point at an initiative, not only at a person |
| **NEW** | `market_linkage.linked_on` | date, so it falls in a reporting period |
| **NEW** | `market_linkage.status` | `proposed` / `under_review` / `active` / `ended` — C1.2 only counts `active` or `ended` |
| **NEW** | `market_linkage.outcome` | did it produce a sale or an agreement |

**Why the person is not stored here.** The sheet repeats National ID, name and phone. That is how the same farmer ends up spelled three ways. The linkage now reaches the person through the initiative.

---

# 5. `Exhibition_Form` → `exhibition`

Feeds **E0.1**. This is the cleanest sheet in the workbook.

| Source field | → | Notes |
|---|---|---|
| Exhibition / market name | `exhibition.name` | required |
| Start Date | `exhibition.start_date` | |
| End Date | `exhibition.end_date` | check `end_date >= start_date` |
| Location | `exhibition.location` | |
| Exhibition duration (Number of days) | *computed* | derive from the dates; store only if it differs |
| Capacity (number of booths) | `exhibition.booth_capacity` | `> 0` |
| external Sponser (if any) | `exhibition.external_sponsor` | typo in source; optional |
| **NEW** | `exhibition.is_co_organised` | needed to reconcile 12 events against a budget for 6 — see OQ-5 |
| **NEW** | `exhibition.is_cancelled` | a cancelled event must not count towards E0.1 |

---

# 6. `Exhibition_Registration_form` → `exhibition_registration`

Feeds **E0.2**.

| Source field | → | Notes |
|---|---|---|
| **NEW** | `exhibition_registration.exhibition_id` | **the sheet has no event field at all.** Without it a registration floats free of any event, no exhibitor list can be produced, and follow-up Q30 has nothing to check against. This is the single most important missing field in the workbook. |
| National ID | look up → `person.national_id` | if known, reuse the person; if new, create one |
| Participant name | `person.full_name` | only editable for a new person |
| Phone Number | `person.phone` | only editable for a new person |
| What products do you produce? *(select all)* | `exhibition_registration_product` → `ref_product` | |
| What type of producer are you? | `exhibition_registration.producer_type_id` → `ref_producer_type` | |
| Is this your first time participating…? | `exhibition_registration.is_first_time` | **derive it** — true when the person has no earlier approved registration. Keep the column overridable. |
| **NEW** | `exhibition_registration.status` | `submitted` / `approved` / `rejected`. **E0.2 counts only approved.** |
| **NEW** | `exhibition_registration.submitted_by_participant` | separates portal submissions from municipal entry |
| **NEW** | `person.sex`, `age`, `is_refugee`, `has_disability` | **required** — E0.2 disaggregates by all four and the sheet collects none of them |

### Product options (11)

```
Fresh fruits
Vegetables
Dairy products
Meat / livestock products
Honey / bee products
Olive oil / olives
Pickled / preserved products
Baked / traditional food products
Jams / processed foods
Herbs / medicinal plants
Handicrafts
```

### Producer type options (9)

```
Individual farmer/producer
Household producer
Agricultural cooperative
Agricultural association
Food-processing business
Agricultural enterprise
Handicraft producer
Women's group/community group
Other (specify)                 ← allows_free_text
```

---

# 7. `Post_intervention` → `followup_survey` and children

Feeds **A1**, **B1**, **C1** and **IMP-0**. Forty-three questions, six sections.

## Section 0 — Identification (Q1–Q6), all rounds

| Q | Source field | → |
|---|---|---|
| 1 | National ID (9-digit number) | `followup_survey.person_id` via lookup |
| 2 | Is the respondent the registered participant? | `respondent` enum |
| 3 | Which follow-up round is this? | `round` enum — six-month / twelve-month / annual |
| 4 | Contact details: date, mode, enumerator name | `contact_date`, `contact_mode`, `enumerator_name` |
| 5 | Which municipal support have you received? | **pre-filled, not asked** — derive from the person's records |
| 6 | Which training(s) did you attend? | **read-only** — the sheet says `<inherited from training registration>` |

**Q5 options in the sheet (6):**
```
Training programme
Guidance on food safety, licensing or packaging
Production support for a small-scale or family activity
Participation in a rural market or exhibition
Advisory service from the technical coordination office
Referral or connection to a partner or programme
```
Each maps to a table: `training_enrolment`, `guidance_record`, `production_initiative`, `exhibition_registration`, `office_service`, and a referral source that does not yet exist (see OQ-10).

## Section A — Technical capacity, SO1 (Q7–Q16)

| Q | Question | → | Feeds |
|---|---|---|---|
| 7 | How useful was the training for your agricultural work? | `followup_answer` | |
| 8 | Have you applied any of the knowledge or skills? | **`q08_applied_knowledge`** | **A1** |
| 9 | If not applied, main reasons | `followup_answer_option` | |
| 10 | Have you changed how you carry out activities? | `followup_answer` | |
| 11 | What changes have you made? | `followup_answer_option` | |
| 12 | Ability compared with before the training | `followup_answer` | |
| 13 | Have you taught another producer or family member? | `followup_answer` | |
| 14 | Have you used the municipal advisory office? | **`q14_used_office`** | **B1 denominator** |
| 15 | If yes, how many times and for what service | `followup_answer` | |
| 16 | Was the advice useful in practice? | **`q16_advice_useful`** | **B1 numerator** |

**Q7 has a stem/answer mismatch in the source.** It asks "how useful" but offers *Very relevant / Somewhat relevant / Not very relevant / Not at all relevant*. Fix the wording when the form is built.

## Section B — Production, food safety, market readiness, SO2 (Q17–Q26)

| Q | Question | → | Feeds |
|---|---|---|---|
| 17 | Are you currently carrying out the activity? | **`q17_activity_status`** | **C1** |
| 18 | Did it start after support, or exist before? | `q18_started_after_support` | |
| 19 | If stopped, when and why | `followup_answer` | |
| 20 | What type of activity is it? | `followup_answer_option` → `ref_activity_type` | |
| 21 | Main products | `followup_answer_option` → `ref_product` | sheet says use the exhibition product list |
| 22 | Production per month vs before | `q22_volume_change` | |
| 23 | Food safety and licensing checklist — 9 items | `followup_safety_item`, tri-state | |
| 24 | Main obstacle for items not done | `followup_answer_option` | |
| 25 | Do you know which authority to approach? | `followup_answer` | |
| 26 | People working: total, women, under 30 | `q26_workers_total`, `_women`, `_under30` | |

**Q23 items (9):**
```
Health certificate or food safety approval
Production or home-business licence or registration
Improved hygiene practices in the production area
Improved storage or cold-chain handling
Proper packaging for the product
Product label (name, ingredients, weight, production and expiry dates)
A trade name, brand or logo
Costing and pricing of the product
Social media page or online presence
```

## Section C — Market access, SO3 (Q27–Q36)

| Q | Question | → |
|---|---|---|
| 27 | Where do you currently sell? | `followup_answer_option` → `ref_sales_channel` |
| 28 | Which channels are new since support? | same list, separate question code |
| 29 | Selling more or less than before? | `q29_selling_change` |
| 30 | How many municipal markets have you participated in? | **`q30_events_attended`** — pre-fill from `exhibition_registration`, allow override via `q30_is_overridden` |
| 31 | Total sales at the most recent event | `q31_last_event_sales_band` |
| 32 | New customers or buyers met | `followup_answer` |
| 33 | What would make markets more useful? | `followup_answer_option` |
| 34 | Have you established a market connection? | **`q34_connection_made`** |
| 35 | Buyer connection details, repeat up to 3 | `followup_buyer_connection` |
| 36 | Main barrier to selling more | `followup_answer_option` |

**Q31 bands (6):** `Under 50 JOD` · `50–150` · `151–300` · `301–500` · `Over 500` · `Prefer not to say`

**Q35 sub-fields:** buyer name (required); type; how the connection came about; nature of the arrangement; still active today.
The "how it came about" options matter — they attribute the connection to municipal support or not:
```
Through a municipal exhibition or market
Through a municipal referral or the coordination office
Through a partner introduced by the Municipality
Through my own effort, unrelated to municipal support
Other
```

## Section D — Continued engagement, IMPACT (Q37–Q40) — twelve-month round only

| Q | Question | → | Feeds |
|---|---|---|---|
| 37 | Currently engaged in an income-generating activity? | **`q37_still_engaged`** | **IMP-0** |
| 38 | In what capacity? | `q38_capacity` | |
| 39 | If not engaged, when and why | `followup_answer` | |
| 40 | Income vs twelve months ago | `q40_income_change` | |

Enforced by a check constraint: these columns must be null unless `round = 'twelve_month'`.

## Section E — Closing (Q41–Q43), all rounds

| Q | Question | → |
|---|---|---|
| 41 | What support would help most next year? | `followup_answer_option` |
| 42 | May we contact you again in six months? | `followup_answer` boolean |
| 43 | Enumerator notes | `q43_enumerator_notes` |

---

# 8. Forms that must be created

These have no sheet in the workbook. Eight indicators depend on them.

| Table | Fields | Feeds |
|---|---|---|
| `training_session` | title, topic, start date, end date, venue, delivering partnership, is_delivered, planned seats | **D0.2**, and gives A1.3 a real session to attach to |
| `office_service` | person, service type, date, adviser, notes | **B1.2** |
| `mentorship_session` | initiative, date, topic, adviser | **C1.3** |
| `guidance_record` | person, guidance type, date, delivered by | **D0.1** |
| `promotional_action` | title, channel, date, reach estimate, description | **F0.1** |
| `coordination_meeting` + `_partner` | date, subject, minutes reference, partners present | **G0.2** |
| `case_study` | title, person or initiative, date, summary, change evidenced | **G0.3** |
| `milestone` | code, achieved, achieved date, decision reference | **B1.1**, **G0.1** |
| `partner_contribution` | partnership, date, type, description, linked entity | **G0.4** |
| `production_initiative` | person, title, activity type, product, start date, status, women-led, youth-led | **C1.2**, and the six-month window for C1 |

---

# 9. Typos in the source

Seed clean text. Recorded here so nobody thinks the source was misread.

| In the workbook | Correct |
|---|---|
| `Sponser` | Sponsor |
| `Tech readyness` | Technology readiness |
| `determin` | determine |
| `benfiting` | benefiting |
| `setp up` | set up |
| `opprtiunity` | opportunity |
| `agricaultural inisitives` | agricultural initiatives |
| `initivies` | initiatives |
| `campagins dissemenated` | campaigns disseminated |
| `Muncicipality's offical` | Municipality's official |
| `muncipality activites` | municipality activities |
| `Insititutional` | Institutional |
| `evidance` | evidence |

Also note: the framework SVG spells the municipality **"Sahel Houran"**; every other document says **"Sahel Horan"**. Use *Sahel Horan*.

---

# 10. Table audit — every table, what writes it, what reads it

**Taken 3 September 2026** against the live database (`ocjdsqwhcekyzeqrrznc`) and
the application in `app/src`. **66 tables: 40 non-reference, 26 `ref_`.**

The method matters, because the register in `CLAUDE.md` is a list of checks that
passed while the thing they checked was wrong. Nothing here is inferred from a
table's name or from a comment:

- **written** — a `.insert(`/`.update(` in `app/src` against that table, or an
  `insert into` inside a `pg_proc` body. Both were enumerated from the live
  catalogue, with SQL comments stripped first (a name in a comment is not a
  write — `05_ROLES_AND_RLS.md` §14 records the six false positives that
  produced).
- **read** — the table appears in a view's dependency graph (`pg_depend` →
  `pg_rewrite`, not a text search of the definition), or in a `.select(` in
  `app/src`, or is read by a trigger function.
- **rows** — `count(*)`, split live / soft-deleted. Not `reltuples`.

## EARNS ITS PLACE — written and read, serving a named indicator or journey

| Table | What it is for | Indicator / journey | Written at | Read at | Rows (live/del) |
|---|---|---|---|---|---|
| `person` | The participant registry. One person, one row. | Every distinct-person indicator: A1.3, B1.2, D0.1, E0.2 | `/forms/tc`, public `/apply/:id` via `apply_for_opportunity` | every `v_ind_*` that disaggregates; `v_person_public` | 4 / 3 |
| `partner` | The organisation. One body, one row. | A1.2, C1.1, G0.4 | `/forms/pn` | `v_ind_a1_2`, `v_ind_c1_1`, `v_ind_g0_4` | 3 / 3 |
| `partnership` | One agreement of one type with one partner. | A1.2 (`training`), C1.1 (`production_support`) | `/forms/pn` | `v_ind_a1_2`, `v_ind_c1_1`, `v_ind_g0_4` | 3 / 2 |
| `partner_contribution` | A dated act by a partner in a period. | **G0.4** — unmeasurable without it | `/forms/pn` detail; auto by `contribution_from_meeting`, `contribution_from_linkage`, `sync_auto_contribution` | `v_ind_g0_4` | 2 / 1 |
| `training_session` | A course occurrence. | **D0.2**; gives A1.3 a parent | `/sessions/new`, `/sessions/:id/edit`; `resolveSession()` as a by-product | `v_ind_d0_2`, `v_ind_a1_3`, `v_opportunity` | 6 / 3 |
| `training_enrolment` | One person on one session, with the completion decision. | **A1.3** | `/forms/tc`; public apply | `v_ind_a1_3`, `v_opportunity`, `v_recent_activity` | 5 / 5 |
| `office_service` | One visit to the coordination office. | **B1.2** | `/forms/os` | `v_ind_b1_2`, `v_indicator_disaggregated` | 1 / 3 |
| `guidance_record` | One guidance contact with a producer. | **D0.1** | `/forms/gd` | `v_ind_d0_1`, `v_indicator_disaggregated` | 2 / 1 |
| `exhibition` | A market or seasonal exhibition. | **E0.1** | `/forms/ex` | `v_ind_e0_1`, `v_ind_e0_2`, `v_public_opportunity` | 2 / 1 |
| `exhibition_registration` | One producer at one event. | **E0.2** | public `/apply/:id`; approved at `/exhibitions/:id` | `v_ind_e0_2`, `v_opportunity`, `v_upcoming_exhibitions` | 2 / 0 |
| `production_initiative` | A supported production activity. | **C1.2**, C1.3 parent, C1's six-month window | `attach_or_create_linkage` (from a linkage) | `v_ind_c1`, `v_ind_c1_2`, `v_ind_c1_3` | 1 / 0 |
| `market_linkage` | An initiative connected to a buyer. | **C1.2** | `create_direct_linkage`, `match_linkage_request`; updated at `/linkage-requests/:id` | `v_ind_c1_2`, `v_recent_activity` | 2 / 0 |
| `mentorship_session` | An advisory session on a funded initiative. | **C1.3** | `/initiatives/:id` | `v_ind_c1_3` | 2 / 1 |
| `milestone` | Achieved / not achieved, with the date that fixes the quarter. | **B1.1**, **G0.1** | `/manual-entries` | `v_ind_b1_1`, `v_ind_g0_1` | 2 / 0 |
| `promotional_action` | A campaign or promotional act. | **F0.1** | `/manual-entries` | `v_ind_f0_1` | 2 / 0 |
| `coordination_meeting` | A meeting with partners. | **G0.2** | `/manual-entries` | `v_ind_g0_2` | 1 / 0 |
| `case_study` | A documented change story. | **G0.3** | `/manual-entries` | `v_ind_g0_3` | 1 / 0 |
| `linkage_request` | A producer asking to be connected. | Journey: public `/linkage` to queue to match | `request_linkage` (public); `/linkage-requests/:id` | `/linkage-requests`, `my_applications` | 1 / 1 |
| `advisory_session` | A market or home-based advisory session. | Journey: the gate on C1.2's linkage (`0106`) | `/advisory/new`, `/advisory/:id/edit` | `v_opportunity`, `v_public_opportunity`, `check_linkage_eligibility` | 2 / 0 |
| `advisory_enrolment` | A producer's place on an advisory session. | Journey: the linkage gate | public `/apply/:id` | `v_opportunity`, `check_linkage_eligibility`, `my_applications` | 1 / 1 |
| `indicator` | The 20 framework rows. | All | seed | `v_indicator_progress` | 20 / 0 |
| `indicator_target` | The quarterly target matrix. | All | seed | `v_indicator_progress` | 260 / 0 |
| `reporting_period` | The 13 quarters. | All | seed | every `v_ind_*` | 13 / 0 |
| `objective` | The four objectives plus impact. | Grouping on the dashboard | seed | `v_indicator_progress` | 5 / 0 |
| `partnership_role` | Multi-select: roles under a partnership. | A1.2 / C1.1 disaggregation | `/forms/pn` (delete-then-insert) | `/forms/pn` detail | 5 / 0 |
| `followup_survey` | The 43-question instrument. | **A1, B1, C1, IMP-0** | `/followups/*` via `start_followup`, five section saves, `submit_followup` | `v_ind_a1`, `v_ind_b1`, `v_ind_c1`, `v_ind_imp_0` | 0 / 0 |
| `followup_answer` | Single-value answers. | A1/B1/C1 context | section saves A–E | `/followups/:id` | 0 / 0 |
| `followup_answer_option` | Multi-select answers. | disaggregation | section saves A–E | `/followups/:id` | 0 / 0 |
| `followup_safety_item` | Q23, tri-state across 9 items. | Section B | `save_followup_section_b` | `/followups/:id` | 0 / 0 |
| `followup_buyer_connection` | Q35, up to 3 buyers. | Section C | `save_followup_section_c` | `/followups/:id`, `submit_followup` | 0 / 0 |

The five `followup_*` tables hold **0 rows** and that is not a defect: the
survey shipped on 31 August and no interview has been conducted. Every one has a
working write path and a working read path, exercised in `0090`–`0100`.

## WRITTEN BUT NEVER READ — data going in that nothing uses

| Table | Rows | The gap |
|---|---|---|
| `indicator_snapshot` | 0 | `snapshot_period()` writes it. **Nothing reads it** — no view, no screen, no function. See the confirmation below; this is **OQ-25**. |
| `exhibition_registration_product` | 0 | Written by `apply_for_opportunity` (`0058`), read by the exhibitor list on `/exhibitions/:id`. Both halves exist; it is empty only because both registrations predate `0058`. Listed here rather than above because **nothing had ever exercised the pair** until Part 4 of this session did. |

## READ BUT NEVER WRITTEN — something depends on it and nothing can fill it

| Table | Rows | What depends on it |
|---|---|---|
| `coordination_meeting_partner` | 1 | Read by trigger `contribution_from_meeting`, which creates the `partner_contribution` that **feeds G0.4**. `03_INDICATORS.md` names it as G0.2's partner-type disaggregation. `/manual-entries` inserts the meeting and **no partners** — the single row came from `0024_seed_demo`. So one of G0.4's automatic contribution sources, and all of G0.2's disaggregation, cannot be reached from any screen. |
| `attachment` | 0 | Nothing writes it and nothing reads it — but `05_ROLES_AND_RLS.md` §8 makes evidence **mandatory** for B1.1, G0.1, G0.2 and G0.3, and the workbook names the required document for each. See below. |

## NEITHER — dead

| Table | Rows | Finding |
|---|---|---|
| `person_activity_type` | 0 | No view reads it, no function names it, no screen writes it. See below — the form **appears** to collect it. |
| `activity` | 7 | Parent of `indicator.activity_id`. No view, function or screen reads it. Structural only: it is the framework's Activity A–G level, seeded and correct, waiting for a screen that groups by activity rather than by objective. Not dead in the sense of wrong — dead in the sense of unused. |

## INFRASTRUCTURE — no indicator by design

Judged on whether each is doing its job, not on row count.

| Table | Rows | Doing its job? |
|---|---|---|
| `audit_log` | 1 511 | **Yes.** Insert-only, one policy (SELECT, coordinator). 45 audit triggers attached. It is also load-bearing beyond audit: `person_restore_candidate` and `partner_restore_candidate` read it to name who deactivated a row. |
| `app_user` | 6 | **Yes.** Written by `handle_new_user` on signup; read by `current_role()`, which every policy in the schema depends on. Carries `is_active` — deactivation, not deletion. |
| `applicant_lookup_secret` | 1 | **Yes.** RLS on, **zero policies** — deliberate: nothing reaches it except `bump_lookup_throttle`, a definer. Holds the HMAC salt. |
| `applicant_lookup_throttle` | 2 | **Yes.** Same shape. Rows are hard-deleted per **OQ-21**, approved 26 Aug 2026 and written into `CLAUDE.md` rule 2. |

> **Note on `05_ROLES_AND_RLS.md` §9 check 2** ("no table with RLS on but no
> policy — expect zero rows"). It returns **two** rows, and always has:
> `applicant_lookup_secret` and `applicant_lookup_throttle`. Zero policies is
> *stricter* than one policy, and it is the correct design for a table only a
> `security definer` may touch. The check's stated expectation is wrong, in the
> same way §9 check 3's was before it was made an allow-list. Recorded as
> **OQ-42**.

## The six asked about by name

**`attachment` — 0 rows, and there is no upload path at all.**
`supabase.storage` appears nowhere in `app/src`. The bucket exists (`0013`), the
policies exist (§8, minus the delete policy), the table exists with its audit and
soft-delete triggers, and `types/database.ts` has the generated row type. Nothing
calls any of it. **B1.1, G0.1, G0.2 and G0.3 have an evidence requirement that
nothing in the platform can satisfy** — and B1.1 and G0.1 are togglable to
achieved today from `/manual-entries` with no document anywhere. Recorded as
**OQ-43**.

**`indicator_snapshot` — 0 rows, and `snapshot_period` cannot be called by the
application.** The function is correct: run on the owner path it returned **20
rows matching the live figures exactly**, then rolled back. But it is
`security definer` with `EXECUTE` revoked from `authenticated` *and* `anon`, so
the only role the application connects as cannot call it. Its own coordinator
gate — `if auth.uid() is not null and not is_coordinator()` — has therefore never
been reachable: a signed-in coordinator is refused by the grant before the gate
runs, and the only callers that get through are the ones with no `auth.uid()` at
all. This is the §14 shape again, from the other side. Recorded as **OQ-44**.

**`person_activity_type` — 0 rows, and the form appears to collect it.**
Section 3 of this document maps *"What type of agricultural activity are you
involved in? (select all)"* to this junction. The `tc` form renders exactly that
control — `useFormSchema.ts:394`, `key: 'act'`, a `checks` group over
`ref_activity_type`. `CompletionInput` has no field for it and neither
`useCreateCompletion` nor `useUpdateCompletion` writes the junction. The same is
true of the `involve` select beside it: `person.agri_involvement_id` is **null
for all 7 people**. Two fields in the "agricultural profile" section are
collected, validated, submitted, confirmed — and discarded. This is the register's
seventh shape without the RLS: a control that reports success having written
nothing. Recorded as **OQ-45**.

**`exhibition_registration_product` — 0 rows despite two registrations, and the
junction is being written.** Both registrations are dated 2026-08-24;
`0058_apply_accepts_products` landed 2026-08-27. The path is complete —
`ApplyForm.tsx` to `p_product_ids` to `apply_for_opportunity` to the junction —
and `/exhibitions/:id` reads it back through an embed. It is empty because no
registration has been taken since the feature existed, not because anything is
broken. Exercised end to end in Part 4.

**`mentorship_session` and `guidance_record` — both now have a working screen.**
`guidance_record` is module `gd` at `/forms/gd`, national-ID-first because D0.1
counts distinct people. `mentorship_session` is on `/initiatives/:id`, because
`initiative_id` is `NOT NULL` and the parent has to be chosen first. Both have
insert, update and soft-delete wired. The `ELSEWHERE` map on `/manual-entries`
that claimed otherwise was corrected on 1 September and is now checked by
`check-elsewhere-routes.mjs`.

**`milestone` — `/manual-entries` does write it.** `useSetMilestone` updates
`is_achieved` and `achieved_on` together (the `achieved_needs_date` constraint
requires it), and since 1 September it invalidates `['manual','milestones']` —
the query the screen renders — as well as the indicator queries. Both rows
(B1.1, G0.1) are present and currently `is_achieved = false`, which is why
`v_ind_b1_1` and `v_ind_g0_1` both read 0.

## Reference tables

All 26 have RLS, four policies each (read-all / write-coordinator), `label_en`
and `label_ar`, `is_active` for retirement and `deleted_at`. 23 of the 26 are
reachable from a screen through `useRefTable`. **Three are not:**

| Table | Rows | Why it is unreachable |
|---|---|---|
| `ref_stakeholder_type` | 6 | The only consumer is `coordination_meeting_partner`, which has no write path. Consistent with the row above, not a separate defect. |
| `ref_nationality` | 4 | `person.nationality_id` is null for all 7 people. No form offers it. |
| `ref_disability_type` | 6 | `person.disability_type_id` is null for all 7. `has_disability` **is** collected (3 of 4 live people); the *type* is not. |

`ref_nationality` and `ref_disability_type` are not dead — they are the
disaggregation depth the framework asks for and no form has reached yet.
Neither is required by a formula in `03_INDICATORS.md`: A1.3, D0.1 and E0.2
disaggregate by *refugee status* and *disability*, both of which are boolean
columns on `person` and both of which are collected.

## Data provenance

**Every row in this database is demo or test residue. There is no real
programme data.** All 7 `person` rows are either in the reserved demo range
`300000000`–`300000099` (4, live) or test accounts from build-phase work (3, all
deactivated). Everything else hangs off those people or off `0024_seed_demo`.
`07_BUILD_CHECKLIST.md`'s "retire the demo data and draw the audit boundary
before go-live" is still outstanding and is the correct place to deal with it.
