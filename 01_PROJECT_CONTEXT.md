# 01 — Project Context

Read this to understand *why* the schema is shaped the way it is. Most of the unusual constraints come from things stated in the Action Plan.

---

## 1. The programme

| | |
|---|---|
| Owner | Sahel Horan Municipality, Irbid Governorate, Jordan |
| Document | Action Plan for Enhancing Local Economic Participation Through Agriculture and Food Production |
| Dated | June 2026 |
| Implementation period | 1 August 2026 — 1 September 2029 |
| Funding | European Union |
| Implemented with | Enabel, supported by Expectation State and INTEGRATED |
| Status | Presented to the Municipal Council for approval; decision number and approval date still blank |

The Plan is the practical translation of an assessment study on **the inclusion of Syrian refugees in municipal services**. That origin is why refugee status appears in the disaggregation of almost every indicator — and why its absence from the current forms is a serious gap rather than a nice-to-have.

---

## 2. The core principle

> The Municipality is a **facilitator and coordinator**, not a direct implementer of economic projects.

This is stated repeatedly in the Plan. It has a direct consequence for the database: almost nothing is delivered by the Municipality alone. Trainings are delivered by partners. Production support comes through partners. Market linkages connect a producer to a partner. This is why `partner` and `partnership` sit near the centre of the schema, and why `partner_contribution` exists.

---

## 3. Two constraints that shape everything

The assessment found:

1. The Municipality **owns very little agricultural land**.
2. Most privately owned land is under **common or shared ownership** — many people hold undivided shares with no formal demarcation.

So the Plan cannot do large-scale cultivation. It works through greenhouses, hydroponics, cooperative agreements with landowners, small plots serving processing facilities, and home-based food processing. This is why the production side of the schema is built around small **initiatives** rather than farms or land parcels.

---

## 4. The distinction the Plan insists on

| Term | Meaning | In scope? |
|---|---|---|
| **Economic participation** | Individuals engaging directly — employment, training, small enterprise, immediate opportunities | Yes, this Plan |
| **Economic development** | Long-term structural growth, large investment, revenue generation | No |

Keep this in mind when someone proposes a feature. Anything that measures municipal revenue or regional GDP is out of scope.

---

## 5. Geography and people

**Villages covered:** Al Turra, Al Shajara, Amrawa, Al Thnaibeh.
Store these in `person.village`.

**Target groups:** youth, women, low-income households, refugees, people with disabilities, small-scale farmers, productive households.

**"Productive households"** has a specific definition in the Plan: household members already engaged, formally or informally, in small-scale agricultural, food processing or home-based production — or who have the basic interest, skills, resources or local opportunity to do so.

**Market reach extends outside the municipality**, into Irbid Governorate: the permanent agricultural exhibition at King Abdullah II Gardens, the Irbid Chamber of Commerce, the Chamber of Industry, Al Hassan Youth City, shopping centres, and Jordan University of Science and Technology.

---

## 6. Named partners in the Plan

Seed these as realistic examples if demo data is needed:

- Faculty of Agriculture, Jordan University of Science and Technology
- National Agricultural Research Centre, and its Agricultural Innovation and Entrepreneurship Incubator
- Ramtha Agricultural Research Centre
- Ministry of Agriculture — Agricultural Extension Directorates
- Cities and Villages Development Bank (CVDB)
- Vocational Training Corporation, ILO, FAO, JEDCO-IFAD, Advance Consulting
- National initiatives: **Zikra** and **Rawabi Farah**

---

## 7. The four pillars

The narrative document says "Pillar". The M&E workbook says "Specific Objective". They are the same thing. There is no crosswalk anywhere in the source documents, so this table is it:

| Pillar | Objective | Colour | Theme |
|---|---|---|---|
| Pillar One | SO1 | teal `#1B5E75` | Agricultural technical skills and capacity building |
| Pillar Two | SO2 | green `#2A7F62` | Agricultural production and local food production |
| Pillar Three | SO3 | amber `#B0742A` | Local marketing and rural markets |
| Pillar Four | SO4 | slate `#4B5A6B` | Municipal planning, partnerships and institutional coordination |

Seven activities sit under them: **A** and **B** under SO1; **C** and **D** under SO2; **E** and **F** under SO3; **G** under SO4.

---

## 8. The theory of change

SO1 → SO2 → SO3 run as a **sequential chain**. SO4 is the operational layer running underneath all three.

> If the Municipality improves access to training, target groups are better prepared to produce.
> If it connects trained participants to production support, they have a pathway from learning to economic activity.
> If it strengthens links between producers and markets, they have somewhere to sell.
> SO4 makes all three possible by coordinating partners.

This chain is why the schema has an ordering rule: **production support normally follows training completion**. Enforce it as a warning, not a hard block — the municipality must still be able to record an exception and explain it.

---

## 9. Budget

From Annexe 1, total explicit budget **JOD 30,000**:

| Pillar | Cost | Timeframe |
|---|---|---|
| 1 — Training | Low to medium, depends on in-kind support | Jun 2026 – Jun 2027 |
| 2 — Production initiatives | JOD 3,000 × 6 = **18,000** | Jun 2026 – Jun 2027 |
| 3 — Rural markets | JOD 2,000 × 6 = **12,000** | Jun 2026 – Jul 2029 |
| 4 — Coordination | No direct cost | Jun 2026 – Jul 2029 |

Note the tension: Pillar 3 funds six markets but indicator **E0.1 targets twelve events**. The other six are presumably co-organised at external venues at no cost. `exhibition` therefore needs to distinguish *organised* from *co-organised*, or the budget and the indicator will never reconcile.

Pillar 2 funds exactly six initiatives and **C1.2 targets six**. That one is consistent — use it as the model.

---

## 10. Governance and risk

A **Municipal Action Plan Coordinator** is assigned on approval and is accountable for progress reports. That person is the `coordinator` role in the system.

Risk handling from the Plan, which the system should support:

- **High risks** — reviewed quarterly by the Mayor with the Coordinator
- **Medium risks** — continuous improvement plans and periodic review
- **Low risks** — routine follow-up

Four risks are rated High probability *and* High impact:

1. Weak or irregular coordination between the Municipality and local partners
2. Inability to establish large-scale production because of land ownership
3. Limited land access for people interested in agricultural entrepreneurship
4. Limited producer access to local markets

Risks 1 and 4 are exactly what `G0.2`, `G0.4`, `E0.1` and `E0.2` measure. That is not a coincidence — those indicators exist to detect these risks early.

---

## 11. The five implementation layers

From Annex 2. Useful when deciding who a screen is for:

1. **Strategic oversight** — the Municipality adopts the Plan, reviews progress reports
2. **Municipal coordination** — the Coordinator and the Local Agriculture and Food Production Coordination Committee
3. **Community engagement** — local associations, youth networks, educational institutions
4. **Technical and market support** — the Technical Coordination Office connects producers to services
5. **Community accountability** — feedback from residents and target groups informs adjustments

---

## 12. What the source documents do not contain

Do not go looking for these; they do not exist:

- **Annex 3, the Assessment Study** — marked "to be inserted"
- **Targets after 28/Q4** — the workbook stops eight quarters short of the plan end
- **A refugee status or disability question** on any form
- **Any form at all** for eight of the twenty indicators

The last two are the reason `06_OPEN_QUESTIONS.md` exists.
