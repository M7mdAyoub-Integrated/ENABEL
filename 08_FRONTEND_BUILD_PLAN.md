# 08 — Front-End Build Plan

The production front end for the SHM M&E Platform, in eight phases.

Read this before every phase. Sections 2 and 3 are **standards, not suggestions** — they apply to every phase, every component, every line. A phase is not done until it satisfies them.

---

## 1. What we are building, and from what

The current prototype is a **bundled artifact**: a packed React app whose source lives as a JSON-escaped string inside a `text/x-dc` script tag, with fonts base64-embedded. It has no build step, no environment variables, no routing, no dependency management. Editing it requires an extract-and-reinject cycle that has already corrupted the file once.

**It stays as the demo file.** The production app is a new codebase in `app/`.

The database is finished: 53 tables, 20 indicator views, RLS on everything, 29 migrations. The front end connects to it. It never duplicates its logic.

---

## 2. RESPONSIVE — the standard

Every screen, every component, every state, at every width. Not "works on mobile". **Correct on mobile.**

### Test at these widths, every phase

```
320   iPhone SE, smallest realistic
360   most Android
390   iPhone 14/15
412   Pixel
428   iPhone Pro Max
768   iPad portrait
820   iPad Air
1024  iPad landscape / small laptop
1280  laptop
1440  desktop
1920  large desktop
```

Also test: **landscape on a phone**, and **200% browser zoom** at 1280.

### Absolute rules

- **Mobile-first.** Base styles are the phone. Breakpoints add, never subtract.
- **No horizontal scroll at any width ≥320px.** Ever. Not on a table, not on a wizard, not on a chart.
- **Touch targets ≥44×44 CSS pixels**, with ≥8px between adjacent targets.
- **No fixed pixel widths** on containers. Percentages, `rem`, flex, grid.
- **Body text never below 14px** on mobile. 12px is the floor for metadata only.
- **Safe area insets** honoured — `env(safe-area-inset-bottom)` on sticky bars, `-top` on headers. iPhone notch and home indicator.
- **Sticky elements must never cover content.** Add matching padding to the scroll container.
- **`prefers-reduced-motion`** respected on every transition.
- Breakpoint `xs: 360px` added to Tailwind, since two of our target devices sit below `sm`.

### Component behaviour by width

| Component | Phone (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| **Sidebar** | Bottom tab bar, 5 destinations max, plus a "More" sheet | Collapsible drawer with overlay | Fixed 260px rail |
| **Data tables** | Card list — 3 key fields visible, tap to expand | Table, fewer columns | Full table |
| **Forms** | Single column, sticky save bar at bottom | 2 columns | 2 columns, wider |
| **Follow-up wizard** | "Step 3 of 6" text + progress bar, one section per screen, sticky Back/Next | Compact stepper | Full stepper |
| **Modals** | Full-screen sheet, slides up | Centred dialog | Centred dialog |
| **KPI cards** | 1 column | 2 columns | 4 columns |
| **Indicator table** | Accordion grouped by objective | Table, key columns | Full table |
| **Charts** | Full width, min-height 240px, legend below | Same | Legend beside |
| **Toasts** | Bottom, full width minus margin | Top-right | Top-right |
| **Filters** | Bottom sheet, "Filters (3)" trigger button | Inline row, wraps | Inline row |

### The hard ones

**The 43-question survey on a 320px phone.** This is the screen that will break. Enumerators use it standing in a field. One section per screen, large tap targets, the repeatable buyer block must work, Section D must stay conditional. Test this one first, not last.

**The indicator table.** Twenty rows, seven columns, on a phone. It becomes an accordion: tap an objective, see its indicators as cards with a progress bar. Do not shrink the font until it fits.

---

## 3. TRANSLATION — the standard

Every user-visible string in English and Arabic. **Zero exceptions.**

### Zero hardcoded strings

Not one. If a user can see it, it comes from a translation file:

labels · placeholders · helper text · validation messages · error messages · toasts · empty states · button text · confirmation dialogs · status chips · tooltips · `aria-label` · `document.title` · page headings · table column headers · chart axis labels · legend text · option lists · the 43 survey questions and every answer option · indicator names and definitions · month names · relative times ("2 days ago") · pluralised counts

Add an ESLint rule that fails the build on a literal string inside JSX.

### Two sources of translation

| Source | Where the Arabic lives |
|---|---|
| UI chrome, labels, messages | `app/src/locales/{en,ar}/*.json` |
| Option lists, indicator names | The database — every `ref_*` table has `label_ar` |

The `label_ar` columns exist and are **empty**. Someone has to fill them. Until then the app falls back to `label_en` and logs a missing-translation warning — it must never render a blank.

### RTL

- `dir` on `<html>`, flips with locale. Not on a wrapper div.
- **Logical properties only.** `ms-4` `me-4` `ps-2` `pe-2` `text-start` `text-end` `border-s` `rounded-s-lg`. Never `ml` `mr` `pl` `pr` `left` `right` `text-left`.
- **Directional icons mirror** — arrows, chevrons, back, next, progress. **Non-directional do not** — clock, check, search, logo, user.
- Progress bars fill from the right.
- Chart axes and bar direction flip.
- Table column order flips.

### The bidi trap

National IDs, phone numbers, emails and URLs are LTR data. Inside RTL text they mangle — a nine-digit ID renders with the digits reordered.

Every such field gets `dir="ltr"` and `unicode-bidi: isolate`. Applies to display **and** input. This is the single most common Arabic-app bug.

### Fonts

**Archivo has no Arabic glyphs.** Pair it with an Arabic typeface of similar tone — IBM Plex Sans Arabic or Noto Sans Arabic. Load per-locale, subset, `font-display: swap`.

### Formatting

- Dates via `date-fns` with the `ar` locale. Gregorian.
- Numbers via `Intl.NumberFormat`.
- **Currency: JOD has three decimal places**, not two. 1 dinar = 1000 fils. `12.500 JOD`, not `12.50`.
- Percentages via `Intl.NumberFormat` percent style.
- Pluralisation via ICU rules. **Arabic has six plural forms** — zero, one, two, few, many, other. `count === 1 ? 'item' : 'items'` is wrong in Arabic and will read as broken.

---

## 4. Decisions needed before Phase 6

Do not guess these.

| # | Question | Recommendation |
|---|---|---|
| D-1 | Western digits `1234` or Arabic-Indic `١٢٣٤`? | **Western.** Jordan uses Western digits in official and administrative contexts. Arabic-Indic would make the dashboard harder for municipal staff, not easier. Confirm with the coordinator. |
| D-2 | Gregorian or Hijri calendar? | **Gregorian**, since the plan's quarters are Gregorian. Optionally show Hijri underneath on participant-facing screens. |
| D-3 | Who writes and reviews the Arabic? | Claude Code can draft, but a native speaker must review — especially M&E terms like *indicator*, *disaggregation*, *baseline*, *milestone*. Machine-translated M&E vocabulary reads wrong to a Jordanian civil servant. |
| D-4 | Default language on first load? | **Arabic**, with an English toggle. The users are Jordanian. |
| D-5 | Does the participant portal need English at all? | Probably not. Municipal staff may want it; producers will not. |

---

## 5. The eight phases

### Phase 1 — Scaffold and foundations
Import the clean source from the design project. Set up Vite + React + TypeScript + Tailwind + React Router + TanStack Query. Install the Supabase client, **make no queries**. Set up i18next with both locales and the RTL rig. Design tokens into Tailwind config. Generate database types.
**Done when:** a single placeholder screen renders, switches EN↔AR, flips direction, and has no hardcoded strings.

### Phase 2 — Port every screen
All eight screen types, on mock data, responsive and translated from the first line. Not a redesign — it must look identical to the prototype at desktop width.
**Done when:** every screen works at all eleven test widths in both languages, and the mock data lives in one file behind hooks.

### Phase 3 — Auth and roles
Supabase Auth, five roles, protected routes, role-based navigation, session handling, the participant link to `person`.
**Done when:** each of the five roles sees exactly what `05_ROLES_AND_RLS.md` says they should, and an unauthenticated user reaches nothing.

### Phase 4 — Connect the data
Replace mocks with real queries, module by module. Optimistic updates, error and loading states, the national ID lookup, the approval flow, offline queueing for enumerators.
**Done when:** every form reads and writes real rows, and RLS is doing the gating.

### Phase 5 — The dashboard
Filters by period, objective, village, sex, age band, refugee status, disability. Drill-down from an indicator to its records. Export. Charts. All reading `v_indicator_actual` and `v_indicator_disaggregated`.
**Done when:** the numbers match the database exactly and nothing is computed in the browser.

### Phase 6 — Arabic and RTL completion
Fill every translation file. Populate `label_ar` across all `ref_*` tables. Translate the 43 survey questions. Full RTL audit.
**Done when:** a native speaker reviews it and finds nothing untranslated.

### Phase 7 — Responsive audit
Every screen, every state, every one of the eleven widths, both directions, landscape, 200% zoom. Fix what breaks.
**Done when:** no horizontal scroll anywhere, every target ≥44px, and the 43-question survey is usable one-handed on a 320px phone.

### Phase 8 — Security and production readiness
Security review, error boundaries, monitoring, accessibility, performance budget, go-live cleanup, deployment, handover documentation.
**Done when:** it is safe to put real participant data in it.

---

## 6. Never, in any phase

- **Never compute an indicator in the front end.** They come from `v_indicator_actual`. The counting rules were tested in the database; duplicating them guarantees drift.
- **Never put `service_role` anywhere near this codebase.** It bypasses RLS. The anon key is public by design and is fine.
- **Never hardcode a user-visible string.**
- **Never use `ml` `mr` `pl` `pr` `left` `right` `text-left` `text-right`.**
- **Never use `localStorage` or `sessionStorage`** except what Supabase Auth manages itself.
- **Never change the palette or the visual design** without asking.
- **Never let a missing translation render blank.** Fall back and warn.
