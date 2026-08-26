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
