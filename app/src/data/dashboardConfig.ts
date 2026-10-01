import { RMTH_INDICATOR_FORMS } from '../rmth/forms.generated'
import { KHLD_INDICATOR_FORM } from '../khld/forms.generated'
import type { Translate } from '../i18n/tx'
import type { Dimension } from './disaggregation'
import type { IndicatorRow, IndicatorSource } from './indicators'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  What differs between the three municipalities' dashboards. Nothing else does.
 *
 *  One screen (routes/Dashboard.tsx) renders both programmes. The figures,
 *  the objectives, the statements and the reasons a figure is missing all
 *  come from the database, keyed by `municipality_id`. What the database does
 *  not hold is below: which four rows are the headline cards, the short
 *  label a card and a row carry, which app screen a source chip points at,
 *  and which breakdown fields a programme's forms never ask.
 *
 *  ── WHY THIS IS A REGISTRY AND NOT A BRANCH ──
 *
 *  `B1.2` is "farmers and productive households reaching the technical
 *  office" in Sahel Horan and "proposals approved for implementation" in
 *  Ramtha. A locale key built
 *  from a bare code -- `indicators:name.B1.2` -- is therefore right for one
 *  programme and wrong for the other, and a screen that reaches for it
 *  without asking whose code it holds will say the wrong thing with complete
 *  confidence. That is what happened when the advisory screens were
 *  parameterised: the logic was right and an advisory screen told a
 *  coordinator it counted towards A1.3.
 *
 *  So every string that names an indicator is resolved through the
 *  municipality's own entry here, and each entry reaches only its own
 *  programme's sources: Sahel Horan's short names are its `indicators:name.*`
 *  keys; Ramtha's and Khalidiyah's rows take the framework's own statement
 *  from the view, because their forms are operational and one form feeds
 *  many rows. Neither entry can see the other's keys, and a municipality with
 *  no entry gets the framework's statement too -- true, if long.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type KpiTone = 'teal' | 'raised' | 'amber' | 'green'
export type SourceLink = { to: string; labelKey: string }

/** What a label resolver may consult. `exists` is i18n.exists, so a missing key falls back rather than rendering raw. */
export type LabelContext = {
  t: Translate
  exists: (key: string) => boolean
  /** The interface is in Arabic. */
  ar: boolean
  /** The `indicator` row behind this code, when loaded. */
  source: IndicatorSource | undefined
}

export type DashboardConfig = {
  /**
   * The four headline cards, by code, in display order. Each IS one of the
   * rows below it, looked up from the same array -- never a second query and
   * never a derived total, so a card cannot disagree with the table.
   */
  kpi: readonly string[]
  /** The block colour of each card. The objective's colour, with the last card neutral, as the prototype draws it. */
  kpiTone: Record<string, KpiTone>
  /** The short label for an indicator, in the current language. */
  indicatorName: (row: IndicatorRow, ctx: LabelContext) => string
  /** The objective heading, in the current language. */
  objectiveTitle: (objectiveCode: string, row: IndicatorRow, ctx: LabelContext) => string
  /** Where the source chip points. [] means this app has no screen that enters it. */
  sourceLinks: (row: IndicatorRow, source: IndicatorSource | undefined) => SourceLink[]
  /**
   * Breakdown dimensions no form of this programme collects. Named here rather
   * than inferred from the data: inferring would mean "everything is
   * not_recorded, so probably nobody collects it", which stops being true the
   * moment one seeded row has a value -- which is exactly Sahel Horan's state.
   */
  uncollectedDimensions: readonly Dimension[]
  /** Where an undecided definition is decided, if this programme has any. */
  openItemsRoute?: string
  /** What that screen is called on the link; `indicators:openItems` when unset. */
  openItemsLabelKey?: string
  /** A locale key explaining why no target exists in any quarter, if there is something to say beyond the fact. */
  noTargetsNoteKey?: string
  /**
   * The words for a unique count beside a row's figure, when "unique people"
   * would be wrong: Khalidiyah's D2 counts distinct individuals out of an
   * estimated attendance and its H2 unique vendors out of participations,
   * and the plan says to label both so nobody sums them.
   */
  uniqueText?: (code: string, count: number, ctx: LabelContext) => string
}

/** The framework's own statement, from the view, in the reader's language. */
function statement(row: IndicatorRow, ar: boolean): string {
  return (ar ? row.name_ar : null) ?? row.name_en
}

function objectiveStatement(row: IndicatorRow, ar: boolean): string {
  return (ar ? row.objective_name_ar : null) ?? row.objective_name_en
}

/* ── Sahel Horan ─────────────────────────────────────────────────────────── */

/**
 * `indicator.data_source` names a table; the sidebar names a module. Two of
 * them need the indicator code as well, because `partnership` feeds both the
 * training partnerships form (A1.2) and the production one (C1.1).
 */
const SHM_BY_CODE: Record<string, string[]> = {
  // One module now. A1.2 and C1.1 still count different partnership TYPES --
  // the type moved onto the form, it did not stop doing work.
  'A1.2': ['pn'],
  'C1.1': ['pn'],
  'G0.4': ['pn'],
}

const SHM_BY_SOURCE: Record<string, string[]> = {
  followup_survey: ['fu'],
  training_enrolment: ['tc'],
  market_linkage: ['ln'],
  exhibition: ['ex'],
  exhibition_registration: ['rg'],
  // `office_service` was missing here for as long as /forms/os has existed, so
  // B1.2 carried a "no entry path yet" tag beside an indicator that had one.
  // The stale claim is the defect, not the missing screen.
  office_service: ['os'],
  guidance_record: ['gd'],
}

/**
 * Entry paths that are not one of the seven form modules.
 *
 * D0.2 counts training_session rows with is_delivered and a food-processing
 * topic. The sessions screen sets exactly that flag, so this indicator HAS an
 * entry path -- it just is not a /forms/ module. Without this it would carry a
 * "no entry path yet" tag that stopped being true the moment /sessions landed.
 *
 * The five on the manual-entries screen point there for the same reason.
 */
const SHM_BY_CODE_PATH: Record<string, SourceLink[]> = {
  'D0.2': [{ to: '/sessions', labelKey: 'nav:sessions' }],
  'B1.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'F0.1': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.2': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  'G0.3': [{ to: '/manual-entries', labelKey: 'nav:manualEntries' }],
  // C1.3 hangs off an initiative -- `mentorship_session.initiative_id` is NOT
  // NULL -- so its entry path is the initiative list, not a form of its own.
  'C1.3': [{ to: '/initiatives', labelKey: 'nav:initiatives' }],
}

const SHM: DashboardConfig = {
  kpi: ['A1.3', 'C1.2', 'E0.1', 'G0.4'],
  kpiTone: { 'A1.3': 'teal', 'C1.2': 'green', 'E0.1': 'amber', 'G0.4': 'raised' },
  // The 20 short names in `indicators:name.*` are Sahel Horan's statements
  // shortened for a 190px card. A 21st indicator seeded without a key gets the
  // framework statement rather than a raw key on a coordinator's screen.
  indicatorName: (row, { t, exists, ar }) =>
    exists(`indicators:name.${row.code}`) ? t(`indicators:name.${row.code}`) : statement(row, ar),
  objectiveTitle: (code, row, { t, exists, ar }) =>
    exists(`indicators:objective.${code}`) ? t(`indicators:objective.${code}`) : objectiveStatement(row, ar),
  sourceLinks: (row, source) => {
    const byPath = SHM_BY_CODE_PATH[row.code]
    if (byPath) return byPath
    const mods = SHM_BY_CODE[row.code] ?? SHM_BY_SOURCE[source?.data_source ?? ''] ?? []
    return mods.map((m) => ({ to: `/forms/${m}`, labelKey: `nav:module.${m}` }))
  },
  // OQ-12. Fields for both were built onto the completion and registration
  // forms on 2026-08-24 and removed the same day; nothing has asked since.
  uncollectedDimensions: ['refugee_status', 'disability_status'],
}

/* ── Ramtha ──────────────────────────────────────────────────────────────── */

const RMTH: DashboardConfig = {
  // Four rows with a form each and no open definition -- networking events,
  // proposals approved, incubators established, participants in incubation
  // (09_MULTI_MUNICIPALITY.md Part 14). Two are SO1 and two SO3.
  kpi: ['A0.1', 'B1.2', 'E0.1', 'E0.2'],
  kpiTone: { 'A0.1': 'teal', 'B1.2': 'teal', 'E0.1': 'amber', 'E0.2': 'raised' },
  // The framework's own statement, in the reader's language. The forms of
  // RMTH_Forms_and_Calculations_v2.xlsx are operational, not one per
  // indicator: the Activity Register feeds eleven rows, so a form's name
  // would name eleven rows the same way.
  indicatorName: (row, { ar }) => statement(row, ar),
  // `CODE · name`, the same form as Sahel Horan's `indicators:objective.*`,
  // so the two dashboards head their groups alike. The workbook's own
  // objective name from the view if a code arrives that has no key.
  objectiveTitle: (code, row, { t, exists, ar }) => {
    const key = `rmth:objective.${code.toLowerCase()}`
    return exists(key) ? t(key) : objectiveStatement(row, ar)
  },
  // The forms the Calculation Method sheet's "Required Field(s)" names for
  // the indicator (catalogue.indicator_forms), generated with the forms. The
  // bare code is safe here: this entry is reached only for Ramtha's rows.
  sourceLinks: (row) =>
    (RMTH_INDICATOR_FORMS[row.code] ?? []).map((fid) => ({ to: `/rmth/${fid}`, labelKey: `rmth:forms.${fid}.short` })),
  // FORM-01 collects sex, the age group, nationality and, since the owner
  // added PR-06, disability -- the "vulnerability PR-06" of the sheet. What is
  // missing is a breakdown VIEW, which the panel states from
  // `is_disaggregable`.
  uncollectedDimensions: [],
  openItemsRoute: '/rmth/thresholds',
  noTargetsNoteKey: 'indicators:noTargetsNote.RMTH',
  // C1.2's "Cumulative total = COUNT(DISTINCT PA-02) across all periods"
  // beside the quarter's figure (v_rmth_indicator_unique, 0180).
  uniqueText: (code, count, { t, exists }) => (exists(`rmth:dashboard.unique.${code}`) ? t(`rmth:dashboard.unique.${code}`, { count }) : ''),
}

/* ── Khalidiyah ──────────────────────────────────────────────────────────── */

const KHLD: DashboardConfig = {
  // Four rows with a form each, one per page of the workbook -- coordination
  // meetings, community activities, volunteers recruited, market days.
  kpi: ['A2', 'D1', 'F2', 'H1'],
  kpiTone: { A2: 'teal', D1: 'green', F2: 'amber', H1: 'raised' },
  // The framework's own statement, in the reader's language. The forms of
  // Khaldia_2_reviewed.xlsx are operational, not one per indicator: FORM-22
  // feeds A1, B1 and F1 alike, so a form's name would name three rows the
  // same way.
  indicatorName: (row, { ar }) => statement(row, ar),
  objectiveTitle: (code, row, { t, exists, ar }) => {
    const key = `khld:objective.${code.toLowerCase()}`
    return exists(key) ? t(key) : objectiveStatement(row, ar)
  },
  // The form carrying the indicator's main source, from the Calculation
  // formulas sheet (catalogue.INDICATOR_FORM). The bare code is safe here:
  // this entry is reached only for Khalidiyah's rows.
  sourceLinks: (row) => {
    const fid = KHLD_INDICATOR_FORM[row.code]
    return fid ? [{ to: `/khld/${fid}`, labelKey: `khld:forms.${fid}.short` }] : []
  },
  // FORM-12, -15 and -17 collect sex, date of birth, the ID type (refugee
  // status) and the Washington Group disability question; FORM-09 counts
  // from tickets, Jordanians / Other by men / women / children (0168, OQ-74).
  // What is missing is a breakdown VIEW, which the panel states from
  // `is_disaggregable`.
  uncollectedDimensions: [],
  noTargetsNoteKey: 'khld:dashboard.planTargetNote',
  // A3's number of contributions beside its value, H1's markets beside its
  // days, H2's unique vendors beside its participations (v_khld_indicator_unique).
  uniqueText: (code, count, { t, exists }) => (exists(`khld:dashboard.unique.${code}`) ? t(`khld:dashboard.unique.${code}`, { count }) : ''),
}

/* ── the registry ────────────────────────────────────────────────────────── */

/**
 * A municipality this file has no entry for: everything from the database,
 * nothing from a locale key, no headline cards and no source chips. The
 * screen still renders every row with the framework's own statement, and the
 * empty source column reads "no entry path yet" -- which, for a programme
 * this app has no screens for, is the truth.
 */
const DATA_ONLY: DashboardConfig = {
  kpi: [],
  kpiTone: {},
  indicatorName: (row, { ar }) => statement(row, ar),
  objectiveTitle: (_code, row, { ar }) => objectiveStatement(row, ar),
  sourceLinks: () => [],
  uncollectedDimensions: [],
}

const CONFIGS: Record<string, DashboardConfig> = { SHM, RMTH, KHLD }

export function dashboardConfigFor(municipalityCode: string): DashboardConfig {
  return CONFIGS[municipalityCode] ?? DATA_ONLY
}
