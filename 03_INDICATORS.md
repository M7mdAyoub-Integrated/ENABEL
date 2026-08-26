# 03 — Indicators

The single source of truth for M&E logic. **Twenty indicators.** Do not compute any of them from memory — use the formula written here.

Structure: 1 impact indicator, 19 activity-level indicators, plus 4 result-level statements that carry no target.

---

## How to read each entry

- **Source** — the table that feeds it in this database
- **Formula** — the exact calculation; `distinct` is never decorative
- **Disaggregation** — the breakdowns the framework requires
- **Targets** — quarterly, from the workbook. Blank means no target in that quarter, which is **not** the same as zero.

---

# IMPACT

## IMP-0 · Continued engagement at twelve months

| | |
|---|---|
| Full code | `SHM-IMP-0` |
| Type | Impact |
| Unit | % |
| Objective | Impact level |

**Name.** Percentage of supported participants who remain engaged in an economic activity 12 months after receiving support.

**Definition.** Percentage of supported participants who remain engaged in an agricultural, food production, food processing, or related income-generating activity 12 months after first receiving support.

**Method.** Municipal participant registry and a short annual follow-up survey or telephone check. Follow-up can focus on participants who have reached 12 months rather than the full participant population.

**Formula.** `eligible supported participants still engaged at 12 months ÷ eligible supported participants assessed at 12 months × 100`

**Source.** `followup_survey` where `round = 'twelve_month'`, field `q37_still_engaged`. Numerator: values `main` or `secondary`. Denominator: all non-null.

**Disaggregation.** Sex; age group; refugee status; disability; type of support.

**Timing.** From month 12 after first support. Assessed annually as cohorts reach 12 months; reported at endline.

**Targets.** Baseline 0. Nothing until 28/Q4 = **70**. Final **70**.

---

# OBJECTIVE 1 — Agricultural technical skills and capacity building

**Result statement:** Target groups have improved access to practical agricultural knowledge and technical support.
Result-level target is `TBD` in the workbook. No method, no formula. See open question OQ-9.

## Activity A — Developing technical partnerships for applied agricultural training

### A1 · Applying knowledge gained

| | |
|---|---|
| Full code | `SHM-SO1-A1` |
| Type | Intermediate result |
| Unit | % |

**Name.** Percentage of training (short-term) participants who report applying knowledge gained.

**Definition.** Percentage of training participants who report using at least one skill or practice gained through the training **within six months of completion**.

**Method.** Short follow-up question through telephone contact or subsequent municipal contact.

**Formula.** `participants reporting application ÷ participants followed up × 100`

**Source.** `followup_survey.q08_applied_knowledge`. Numerator: `regularly` or `occasionally`. Denominator: all non-null.

**Note.** The denominator is *participants followed up*, not all participants. Never divide by the enrolment count.

**Disaggregation.** Sex; age; refugee status; disability; training topic.

**Timing.** Annual.

**Targets.** 27/Q4 = **60**, 28/Q4 = **60**. Final **60**.

---

### A1.2 · Technical partnerships for training

| | |
|---|---|
| Full code | `SHM-SO1-A1.2` |
| Type | Output |
| Unit | # |

**Name.** Number of technical partnerships established or activated for agricultural training and technical support.

**Definition.** Number of documented partnerships through which academic, technical, government or national initiative partners provide training, technical advice or related support under the Action Plan.

**Method.** Partnership records, agreements, meeting records and activity documentation.

**Formula.** Cumulative number of active partnerships contributing to the Plan.

**Source.** `partnership` where `partnership_type = 'training'` and `is_active = true`.

**Disaggregation.** Partner type.

**Timing.** Years 1–2, reviewed annually.

**Targets.** 27/Q2 = **2**, 28/Q2 = **2**. Final **4**.
Stated target text says "≥4 partnerships by June 2027", but half the target sits in 2028. See OQ-3.

---

### A1.3 · Unique participants completing a training

| | |
|---|---|
| Full code | `SHM-SO1-A1.3` |
| Type | Output |
| Unit | # |

**Name.** Number of unique participants completing at least one agricultural or food production training programme.

**Definition.** Number of unique participants meeting the completion criteria — criteria to be determined with the Municipality. See OQ-6.

**Method.** Attendance and completion records maintained by training providers and the Municipality.

**Formula.** Number of participants meeting completion criteria.

**Source.** `count(distinct person_id)` from `training_enrolment` where `met_criteria = true`.

**This is the classic double-count trap.** One person completing three courses is **one**. Never count enrolment rows.

**Disaggregation.** Sex; age; refugee status; disability; training topic.

**Timing.** Quarterly.

**Targets.** 15 in every quarter from 27/Q1 to 28/Q4. Final **120**.

---

## Activity B — Establishing a technical coordination office

### B1 · Farmers reporting benefit from advisory sessions

| | |
|---|---|
| Full code | `SHM-SO1-B1` |
| Type | Intermediate result |
| Unit | % |

**Name.** Percentage of farmers and productive households who report benefit from accessing the periodic training and advisory sessions delivered by the technical coordination office.

**Definition.** **Blank in the source workbook.**
**Method.** **Blank.**
**Formula.** **Blank.**
**Disaggregation.** **Blank.**
**Data source.** **Blank.**

**Proposed formula** — needs sign-off, see OQ-7:
`followup_survey` where `q14_used_office = true` as denominator; numerator where `q16_advice_useful` is `very` or `somewhat`. Both questions already exist in the follow-up instrument (Q14–Q16), so the indicator is measurable without any new question.

**Timing.** Six months after the set-up of the technical coordination office.

**Targets.** 27/Q4 = **70**, 28/Q4 = **70**. Final **70**.

---

### B1.1 · Technical office established

| | |
|---|---|
| Full code | `SHM-SO1-B1.1` |
| Type | Milestone |
| Unit | # |

**Name.** Technical agricultural coordination office established and operational.

**Definition.** A municipal venue or agreed partner facility is used to provide scheduled agricultural advisory and technical services under a defined pilot arrangement, with a published service schedule and at least one advisory or technical session delivered.

**Method.** Municipal decision, service schedule and record of sessions delivered.

**Formula.** Achieved / not achieved.

**Source.** `milestone` where `code = 'B1.1'`. Returns 1 when `is_achieved`, else 0. Requires an attachment.

**Disaggregation.** Not applicable.

**Timing.** Year 1.

**Targets.** 27/Q2 = **1**. Final **1**.
Stated target text says "by Q1 2027" but the value sits in Q2. See OQ-3.

---

### B1.2 · Farmers reaching office services

| | |
|---|---|
| Full code | `SHM-SO1-B1.2` |
| Type | Output |
| Unit | # |

**Name.** Number of farmers and productive households reaching technical office services.

**Definition.** Number of unique farmers and productive households receiving **at least one** advisory or technical service through the office.

**Method.** Simple service log maintained by the office.

**Formula.** Number of unique users recorded.

**Source.** `count(distinct person_id)` from `office_service`.

**Disaggregation.** Sex; age; refugee status; user type.

**Timing.** Quarterly after establishment.

**Targets.** 27/Q1 = 0, 27/Q2 = 10, 27/Q3 = 20, 27/Q4 = 20, 28/Q1 = 20, 28/Q2 = 10, 28/Q3 = 10, 28/Q4 = 10. Final **100**.

**Note.** The workbook's data source cell contains the placeholder text "How to count number of farmers". There is no form. `office_service` is the answer.

---

# OBJECTIVE 2 — Agricultural production and local food production

**Result statement:** Target groups and local producers are better able to engage in feasible agricultural and food production activities. Target `TBD`.

## Activity C — Small-scale and family-based agricultural initiatives

**Title conflict:** the narrative document calls this "…Linked to **Local Crops**". The workbook and the results framework call it "…Linked to **Market Opportunity**". Those are different strategies. See OQ-8.

### C1 · Production activities still operating at six months

| | |
|---|---|
| Full code | `SHM-SO2-C1` |
| Type | Intermediate result |
| Unit | % |

**Name.** Percentage of supported production activities still operating six months after support.

**Definition.** Percentage of supported production activities that remain active six months after receiving support.

**Method.** Short municipal follow-up through telephone contact or site visit where feasible.

**Formula.** `active activities at six months ÷ activities reaching six months × 100`

**Source.** `followup_survey.q17_activity_status`, restricted to people who have a `production_initiative` started at least six months earlier. Numerator: `expanded`, `same` or `reduced`. Denominator: all non-null.

**Note.** "Reduced" still counts as operating. Only `paused`, `stopped` and `never_started` fall out of the numerator.

**Disaggregation.** Activity type; crop or product; lead group.

**Timing.** Annual.

**Targets.** 27/Q4 = **70**, 28/Q4 = **70**. Final **70**.

---

### C1.1 · Production-support partnerships

| | |
|---|---|
| Full code | `SHM-SO2-C1.1` |
| Type | Output |
| Unit | # |

**Name.** Number of production-support partnerships established or activated.

**Definition.** Number of documented partnerships through which technical institutions, government entities, food processing facilities or private sector actors provide technical or commercial support to local producers.

**Method.** Partnership records and activity documentation.

**Formula.** Cumulative number of active partnerships.

**Source.** `partnership` where `partnership_type = 'production_support'` and `is_active = true`.

**Disaggregation.** Partner type.

**Timing.** Years 1–2.

**Targets.** 28/Q1 = **3**. Final **3**.
Stated target text says "≥3 by June 2027" but the value sits in 2028. See OQ-3.

---

### C1.2 · Pilot initiatives connected to market opportunity

| | |
|---|---|
| Full code | `SHM-SO2-C1.2` |
| Type | Output |
| Unit | # |

**Name.** Number of pilot agricultural initiatives launched and connected to wider market opportunity.

**Definition.** Number of individual or group production activities that receive documented municipal facilitation and technical support **and have started production or processing**.

**Method.** Activity profile and municipal follow-up record.

**Formula.** Cumulative number of supported activities.

**Source.** `count(distinct production_initiative.id)` where the initiative has at least one `market_linkage` with status `active` or `ended`.

**Note.** The name has two conditions — *launched* **and** *connected*. Both must be true. This is why `market_linkage` points at an initiative rather than only at a farmer.

**Disaggregation.** Activity type; crop or product; women-led; youth-led; refugee participation.

**Timing.** From Year 2, cumulative.

**Targets.** 27/Q4 = **3**, 28/Q4 = **3**. Final **6**.
Matches the budget exactly: JOD 3,000 × 6.

---

### C1.3 · Advisory mentorship sessions

| | |
|---|---|
| Full code | `SHM-SO2-C1.3` |
| Type | Output |
| Unit | # |

**Name.** Number of advisory mentorship sessions provided to the selected initiatives.

**Definition.** **Blank.** Method **blank.** Formula **blank.** Disaggregation **blank.** Data source **blank.** Target **TBD.** All quarterly targets **blank.**

**Source.** `count(*)` from `mentorship_session`.

**This indicator is an empty shell in the source workbook.** It appears in the framework with a code and a name and nothing else. See OQ-1. Seed it with a null target and display "not set", never 0.

---

## Activity D — Home-based and rural food processing

### D0.1 · Producers receiving guidance

| | |
|---|---|
| Full code | `SHM-SO2-D0.1` |
| Type | Output |
| Unit | # |

**Name.** Number of home-based and rural producers receiving guidance on food safety, licensing, packaging and related requirements.

**Definition.** Number of unique producers receiving municipal or partner guidance on requirements relevant to home-based and rural food production.

**Method.** Municipal guidance log.

**Formula.** Number of unique producers receiving guidance.

**Source.** `count(distinct person_id)` from `guidance_record`.

**Source conflict.** The workbook names `Completion_form (training title = food processing … etc.)` as the source. That measures *training completions*, not *guidance received*. They are different events. This schema gives the indicator its own log. See OQ-4.

**Disaggregation.** Sex; age; refugee status; disability; type of guidance.

**Timing.** Quarterly.

**Targets.** 5 in every quarter from 27/Q1 to 28/Q4. Final **40**.

---

### D0.2 · Training sessions on food processing

| | |
|---|---|
| Full code | `SHM-SO2-D0.2` |
| Type | Output |
| Unit | # |

**Name.** Number of training sessions delivered on food processing and related production requirements.

**Definition.** Number of training sessions delivered on food safety, food processing, packaging, pricing and marketing for home-based and rural producers.

**Method.** Attendance sheets and session records.

**Formula.** Number of sessions delivered.

**Source.** `count(*)` from `training_session` where `is_delivered = true` and `topic_id` is in the food-processing set.

**Note.** This counts **sessions**, not people. A1.3 counts people. Do not confuse them.

**Disaggregation.** Topic.

**Timing.** Quarterly.

**Targets.** 1 in every quarter from 27/Q1 to 28/Q4. Final **8**.

**Note.** The workbook source cell reads "registration Form" — a sheet that does not exist.

---

# OBJECTIVE 3 — Local marketing and rural markets

**Result statement:** Local producers have increased access to markets and commercial opportunities. Target `TBD`.

## Activity E — Open rural markets and seasonal exhibitions

### E0.1 · Markets and exhibitions organised

| | |
|---|---|
| Full code | `SHM-SO3-E0.1` |
| Type | Output |
| Unit | # |

**Name.** Number of rural markets and seasonal exhibitions organised or co-organised by the Municipality.

**Definition.** Number of documented rural markets, seasonal exhibitions or similar events organised or co-organised by the Municipality to provide local producers with opportunities to display and sell products.

**Method.** Event records, announcements and exhibitor lists.

**Formula.** Number of documented events.

**Source.** `count(*)` from `exhibition` where `end_date < current_date` and `is_cancelled = false`.

**Rule.** Only events **already held** count. An upcoming event is not an achievement.

**Disaggregation.** Event type; location.

**Timing.** Quarterly.

**Targets.** 27/Q1 = 0, then 2 in each quarter through 28/Q3, 28/Q4 = 0. Final **12**.

**Budget tension.** Pillar 3 funds six markets at JOD 2,000 each. The target is twelve. The other six must be externally hosted or co-organised at no cost. **No field records this distinction today**, so the reconciliation cannot be done from the data — adding one to `exhibition` is the recommended fix. See OQ-5.

---

### E0.2 · Unique producers participating

| | |
|---|---|
| Full code | `SHM-SO3-E0.2` |
| Type | Output |
| Unit | # |

**Name.** Number of unique local producers participating in supported markets and exhibitions.

**Definition.** Number of unique local producers participating in **at least one** market, exhibition or promotional platform supported by the Municipality.

**Method.** Exhibitor and participant lists **linked to the producer registry**.

**Formula.** Number of unique participating producers.

**Source.** `count(distinct person_id)` from `exhibition_registration` where `status = 'approved'`.

**Two rules.** Count people, not registrations — one producer at four markets is one. And only approved registrations count; pending and rejected do not.

The method line says "linked to the producer registry". That registry is `person`. This indicator is the reason the whole schema is built around a single person table.

**Disaggregation.** Sex; age; refugee status; disability; producer type.

**Timing.** Quarterly.

**Targets.** 27/Q1 blank, then 25 in each quarter through 28/Q3, 28/Q4 blank. Final **150**.

---

## Activity F — Promotion and marketing of local products

### F0.1 · Promotional actions

| | |
|---|---|
| Full code | `SHM-SO3-F0.1` |
| Type | Output |
| Unit | # |

**Name.** Number of promotional actions and campaigns disseminated through the Municipality's official channels — digital platforms, local partnerships and community events.

**Definition.** Number of documented promotional activities delivered through municipal communication channels, community events or product promotion days.

**Method.** Municipal communication and event records.

**Formula.** Number of documented actions.

**Source.** `count(*)` from `promotional_action`.

**Disaggregation.** Action type; communication channel.

**Timing.** Quarterly.

**Targets.** 27/Q1 = 0, 27/Q2 = 1, 27/Q3 = 2, 27/Q4 = 2, 28/Q1 = 1, 28/Q2 = 2, 28/Q3 = 2, 28/Q4 = 2. Final **12**.

**Note.** The workbook data source cell is empty. There is no form.

---

# OBJECTIVE 4 — Municipal planning, partnerships and institutional coordination

**Result statement:** The Municipality has a functioning coordination role that connects residents and producers with relevant programmes, services and partners. Target `TBD`.

## Institutional Activity G

### G0.1 · Coordination committee established

| | |
|---|---|
| Full code | `SHM-SO4-G0.1` |
| Type | Milestone |
| Unit | # |

**Name.** Local agriculture and food production coordination committee established.

**Definition.** A committee is formally established with defined membership and responsibilities and holds regular documented meetings.

**Method.** Formation decision, membership list, terms of reference and meeting minutes.

**Formula.** Achieved / not achieved.

**Source.** `milestone` where `code = 'G0.1'`. Requires attachments — the decision and the terms of reference.

**Disaggregation.** Stakeholder type.

**Timing.** First six months, quarterly thereafter.

**Targets.** 27/Q2 = **1**. Final **1**.

---

### G0.2 · Coordination meetings

| | |
|---|---|
| Full code | `SHM-SO4-G0.2` |
| Type | Output |
| Unit | # |

**Name.** Number of coordination meetings held with relevant partners.

**Definition.** Number of documented meetings convened by the Municipality with government, technical, academic, private sector, community and neighbouring municipal partners.

**Method.** Meeting minutes and attendance records.

**Formula.** Number of documented meetings.

**Source.** `count(*)` from `coordination_meeting`.

**Disaggregation.** Partner type — via `coordination_meeting_partner`.

**Timing.** Quarterly.

**Targets.** 27/Q1 = 0, then 2 in every quarter through 28/Q4. Sums to **14**.

**Arithmetic conflict.** The stated rule is "≥2 meetings per quarter". Eight quarters × 2 = 16, but the total says 14, because 27/Q1 is zero. See OQ-2.

---

### G0.3 · Case studies

| | |
|---|---|
| Full code | `SHM-SO4-G0.3` |
| Type | Output |
| Unit | # |

**Name.** Number of case studies that demonstrate positive change emerging from municipality activities.

**Definition in the workbook.** *"Number of unique residents and producers who receive a documented referral or connection to relevant government programmes, training, financing, technical services or other opportunities through the Municipality."*

**Method in the workbook.** Referral log.
**Formula in the workbook.** Number of unique people referred or connected.
**Disaggregation in the workbook.** Sex; age; refugee status; disability; service type.

**This indicator is broken.** The name says *case studies*. The definition, method, formula and disaggregation all describe a completely different indicator — *referrals*. Someone renamed it and did not update the rest of the row. As written it cannot be measured.

This schema follows the **name** and provides a `case_study` table. See OQ-10 — the M&E lead must confirm which one is intended, and if referrals are wanted, a `referral` table must be added.

**Timing.** Annual.

**Targets.** 27/Q4 = **2**, 28/Q4 = **2**. Final **4**.

---

### G0.4 · Active partnerships contributing

| | |
|---|---|
| Full code | `SHM-SO4-G0.4` |
| Type | Output |
| Unit | # |

**Name.** Number of active partnerships contributing to Action Plan activities.

**Definition.** Number of partners that have contributed to **at least one documented activity, service, referral, training, market opportunity or other agreed contribution during the reporting period**.

**Method.** Partnership and activity records.

**Formula.** Number of partners with at least one documented contribution.

**Source.** `count(distinct partner_id)` from `partner_contribution` joined through `partnership`, where `contributed_on` falls inside the reporting period.

**Two traps.**

1. **Not a count of partnership rows.** A partner with an agreement but no activity this period does **not** count. This is why `partner_contribution` exists — without it the indicator is unmeasurable, and the workbook has no such record anywhere.
2. **Not the sum of A1.2 and C1.1.** One organisation can hold both a training partnership and a production-support partnership. Count distinct **partners**, not partnerships.

**Disaggregation.** Partner type.

**Timing.** Semi-annually.

**Targets.** 27/Q4 = **3**, 28/Q4 = **3**. Final **6**.

---

# Quarterly target matrix

Seed exactly this. Blank means no target that quarter — store `null`, never `0`.

| Code | Unit | 27Q1 | 27Q2 | 27Q3 | 27Q4 | 28Q1 | 28Q2 | 28Q3 | 28Q4 | Final |
|---|---|---|---|---|---|---|---|---|---|---|
| IMP-0 | % | | | | | | | | 70 | 70 |
| A1 | % | | | | 60 | | | | 60 | 60 |
| A1.2 | # | 0 | 2 | 0 | 0 | 0 | 2 | 0 | 0 | 4 |
| A1.3 | # | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 15 | 120 |
| B1 | % | | | | 70 | | | | 70 | 70 |
| B1.1 | # | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| B1.2 | # | 0 | 10 | 20 | 20 | 20 | 10 | 10 | 10 | 100 |
| C1 | % | | | | 70 | | | | 70 | 70 |
| C1.1 | # | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 |
| C1.2 | # | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 6 |
| C1.3 | # | — | — | — | — | — | — | — | — | **not set** |
| D0.1 | # | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 40 |
| D0.2 | # | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 8 |
| E0.1 | # | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 0 | 12 |
| E0.2 | # | | 25 | 25 | 25 | 25 | 25 | 25 | | 150 |
| F0.1 | # | 0 | 1 | 2 | 2 | 1 | 2 | 2 | 2 | 12 |
| G0.1 | # | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| G0.2 | # | 0 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 14 |
| G0.3 | # | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 4 |
| G0.4 | # | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 3 | 6 |

**All targets stop at 28/Q4.** The plan runs to 1 September 2029. Create period rows for 26/Q3, 26/Q4, 29/Q1, 29/Q2 and 29/Q3 with null targets. See OQ-11.

---

# Which indicators count unique people

Memorise this list. Getting it wrong inflates the donor report.

| Indicator | Counts |
|---|---|
| A1.3 | distinct `person_id` with `met_criteria = true` |
| B1.2 | distinct `person_id` in `office_service` |
| D0.1 | distinct `person_id` in `guidance_record` |
| E0.2 | distinct `person_id` in approved `exhibition_registration` |
| G0.4 | distinct `partner_id` with a contribution in the period |
| C1.2 | distinct `production_initiative` with a linkage |

Everything else counts rows or computes a percentage.
