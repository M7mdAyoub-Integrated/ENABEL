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

All of it lives in `app/src/lib/format.ts`. Nothing formats a date or a number anywhere else.

- **Dates via `Intl.DateTimeFormat`. Gregorian, pinned.** *(date-fns was removed — see below.)*
- Numbers via `Intl.NumberFormat`.
- **Currency: JOD has three decimal places**, not two. 1 dinar = 1000 fils. `12.500 JOD`, not `12.50`.
- Percentages via `Intl.NumberFormat` percent style.
- Pluralisation via ICU rules. **Arabic has six plural forms** — zero, one, two, few, many, other. `count === 1 ? 'item' : 'items'` is wrong in Arabic and will read as broken.
- Digits: Western, both languages. See D-1 in section 4a.

#### Three things found the hard way

**1. `en-JO` looks supported and is not.**

`Intl.DateTimeFormat.supportedLocalesOf(['en-JO'])` returns `['en-JO']`, which
reads as confirmation. It is not: it only means ICU recognises the *tag*.
`resolvedOptions().locale` collapses it to bare `en`, which formats US-style —
`Sep 5, 2026`, month first. Jordan writes day first.

So the English tag is **`en-GB`** (`5 Sept 2026`), chosen for its formatting
conventions rather than its country. `ar-JO` does have real data and resolves to
itself.

> **Check `resolvedOptions().locale`, never `supportedLocalesOf`.** This is the
> kind of defect that ships and is found by a user, not a test: nothing throws,
> nothing logs, the date is simply wrong in a way only a local reader notices.

**2. Removing a dependency improved the Arabic.**

date-fns's `ar` locale produces Egyptian month names — سبتمبر، أكتوبر. `ar-JO`
through `Intl` produces the **Levantine** ones — أيلول، تشرين الأول — which is
what a Jordanian municipality actually writes.

That was not the reason for the change (date-fns had no numbering-system option,
which is why D-1 could not be implemented through it), but it is the more
valuable outcome. Worth remembering that the platform's own i18n data was better
than the library wrapped around it.

**3. LTR text inside an RTL page needs `dir="auto"`.**

An English description on the Arabic page rendered as `.anyone who makes food to
sell` — the full stop resolved to the wrong end, because a neutral character at
the boundary takes the *paragraph's* direction, not the sentence's.

This affects **every free-text field the municipality types**: titles,
descriptions, venues, contact names, and later participant names and initiative
titles. Staff will mix languages; there is no setting that prevents it.

> **Rule: any element rendering user-entered text gets `dir="auto"`.** It
> resolves direction from the first strong character in that specific value, so
> each field is correct independently. Do not set `dir` to a fixed value on
> content — only on the document.
>
> This does *not* apply to translated UI strings, which are known-direction and
> already match the page.

---

## 4. Decisions needed before Phase 6

Do not guess these.

| # | Question | Recommendation |
|---|---|---|
| D-1 | Western digits `1234` or Arabic-Indic `١٢٣٤`? | **RESOLVED 26 Aug 2026 — Western.** See section 4a below. |
| D-2 | Gregorian or Hijri calendar? | **Gregorian**, since the plan's quarters are Gregorian. Optionally show Hijri underneath on participant-facing screens. |
| D-3 | Who writes and reviews the Arabic? | Claude Code can draft, but a native speaker must review — especially M&E terms like *indicator*, *disaggregation*, *baseline*, *milestone*. Machine-translated M&E vocabulary reads wrong to a Jordanian civil servant. |
| D-4 | Default language on first load? | **Arabic**, with an English toggle. The users are Jordanian. |
| D-5 | Does the participant portal need English at all? | Probably not. Municipal staff may want it; producers will not. |

### 4a. D-1 resolved — Western digits

**Decision: Western digits (`1234`), both languages, everywhere.** Taken 26 August 2026.

**Why**

1. **Jordan's own convention.** Western digits are what Jordan uses on road signs,
   price tags and government forms. Arabic-Indic is the Egyptian and Gulf
   convention. Jordanians read both, so neither choice excludes anyone — but the
   local convention is the one that makes a municipal system read as local rather
   than imported.
2. **The digits sit next to Latin codes that cannot change.** Reporting periods
   are `27/Q4` and indicators are `A1.3`. Those are fixed identifiers in the donor
   framework. Arabic-Indic figures beside them in the same table would look like
   two systems glued together, and a reader would reasonably wonder which one is
   broken.
3. **National IDs are nine Western digits** in the source data and on the card
   itself. A participant checking a screen against their own ID card should be
   comparing like with like.

**What it took to actually implement**

The decision was already written above as a recommendation, and `format.ts`
carried a `latn` constant that *looked* like it implemented it. It did not.
Three code paths rendered digits and the constant reached only one:

| path | before | after |
|---|---|---|
| `formatNumber` / `formatJOD` / `formatPercent` | `Intl.NumberFormat` with `ar-JO-u-nu-latn` — **Western** | unchanged |
| `formatDate` / `formatShortDate` / `formatDateRange` | **date-fns** with the `ar` locale, which ignored the constant entirely — **Arabic-Indic** | `Intl.DateTimeFormat` with the same locale tag — **Western** |
| ICU plurals, e.g. `{count, plural, ...}` with `#` | `i18next-icu` with bare `ar` — **Arabic-Indic** | `latnDigits` post-processor in `i18n/index.ts` — **Western** |

date-fns was dropped rather than worked around: it has no numbering-system
option, which is precisely why it was the odd one out, and it was imported in
exactly one file. Dates and numbers now go through the same `INTL_LOCALE`
constant.

ICU is the exception. `i18next-icu` gives no way to pass a numbering system
down to `intl-messageformat`, so plural output is rewritten on the way out by a
global post-processor that maps U+0660–U+0669 only. Arabic letters, punctuation
and anything a user typed into a free-text field are untouched.

**How to reverse it.** Change `NUMBERING_SYSTEM` in `app/src/lib/format.ts` from
`'latn'` to `'arab'`. Both paths read that one constant — Intl through the locale
tag, ICU through the post-processor's early return.

**Still open:** this was decided on Jordanian convention, not confirmed by the
coordinator. If they prefer Arabic-Indic on participant-facing screens
specifically, that is a split between public and staff pages, not a flip of this
constant, and it needs a fresh decision.

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
