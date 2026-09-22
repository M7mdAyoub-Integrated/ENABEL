import { RMTH_FORMS, RMTH_FORM_IDS, type RmthFormId } from '../rmth/forms.generated'
import { KHLD_FORMS, KHLD_FORM_IDS, type KhldFormId } from '../khld/forms.generated'
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
 *  `A1.2` is "technical partnerships established" in Sahel Horan and
 *  "networking events including job fairs" in Ramtha. A locale key built
 *  from a bare code -- `indicators:name.A1.2` -- is therefore right for one
 *  programme and wrong for the other, and a screen that reaches for it
 *  without asking whose code it holds will say the wrong thing with complete
 *  confidence. That is what happened when the advisory screens were
 *  parameterised: the logic was right and an advisory screen told a
 *  coordinator it counted towards A1.3.
 *
 *  So every string that names an indicator is resolved through the
 *  municipality's own entry here, and each entry reaches only its own
 *  programme's sources: Sahel Horan's short names are its `indicators:name.*`
 *  keys; Ramtha's are the short names of its form catalogue, found from the
 *  indicator's FULL code (`RMTH-SO1-A1.2`), which cannot collide. Neither
 *  entry can see the other's keys, and a municipality with no entry gets the
 *  framework's own statement from the view -- true, if long.
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

/**
 * The form that feeds an indicator, from the catalogue's own `indicator`
 * field. An exact match on the FULL code: `RMTH-SO1-A1.2` can never be read
 * as Sahel Horan's A1.2, and RMTH-SO1-A1 -- a code with no statement and
 * therefore no form -- is simply not found.
 */
function rmthFormFor(fullCode: string | undefined): RmthFormId | undefined {
  if (!fullCode) return undefined
  return RMTH_FORM_IDS.find((fid) => (RMTH_FORMS[fid] as { indicator: string }).indicator === fullCode)
}

const RMTH: DashboardConfig = {
  // Four rows with a form each and no open item -- events held, proposals
  // approved, incubators established, participants in incubation
  // (09_MULTI_MUNICIPALITY.md Part 6). Two are SO1 and two SO3, because every
  // SO2 output waits on a definition (OQ-47).
  kpi: ['A1.2', 'B1.2', 'E0.1', 'E0.2'],
  kpiTone: { 'A1.2': 'teal', 'B1.2': 'teal', 'E0.1': 'amber', 'E0.2': 'raised' },
  // The form's short name, as in the sidebar, not the sheet's full statement:
  // E0.1's statement is 26 words. Found by the full code, so `A1.2` here can
  // only ever be Ramtha's. A row with no form -- SO1-A1 -- keeps the
  // statement the framework gave it, which says in words that there is none.
  indicatorName: (row, { t, exists, ar, source }) => {
    const fid = rmthFormFor(source?.full_code)
    const key = fid ? `rmth:forms.${fid}.short` : ''
    return fid && exists(key) ? t(key) : statement(row, ar)
  },
  // `CODE · name`, the same form as Sahel Horan's `indicators:objective.*`,
  // so the two dashboards head their groups alike -- SO1 is the code in
  // RMTH-SO1-A1.2 and in the rows beneath. (It used to borrow the sidebar's
  // "Objective 1 · Job opportunities", which named the same group a second
  // way.) The workbook's own objective name from the view if a code arrives
  // that has no key.
  objectiveTitle: (code, row, { t, exists, ar }) => {
    const key = `rmth:objective.${code.toLowerCase()}`
    return exists(key) ? t(key) : objectiveStatement(row, ar)
  },
  // The form IS the source. `RMTH_FORMS[fid].indicator` is the plan's "which
  // form feeds this", derived, not a second map.
  sourceLinks: (_row, source) => {
    const fid = rmthFormFor(source?.full_code)
    return fid ? [{ to: `/rmth/${fid}`, labelKey: `rmth:forms.${fid}.short` }] : []
  },
  // Nine of the seventeen forms collect gender, age, nationality and a
  // vulnerability list that includes refugee status and disability
  // (0122, ref_rmth_vulnerability). Nothing is uncollected by design; what is
  // missing is a breakdown VIEW, which the panel states from the data.
  uncollectedDimensions: [],
  openItemsRoute: '/rmth/thresholds',
  noTargetsNoteKey: 'indicators:noTargetsNote.RMTH',
}

/* ── Khalidiyah ──────────────────────────────────────────────────────────── */

/** The form that feeds an indicator, from the catalogue's own `code`, matched on the FULL code. */
function khldFormFor(fullCode: string | undefined): KhldFormId | undefined {
  if (!fullCode) return undefined
  return KHLD_FORM_IDS.find((fid) => (KHLD_FORMS[fid] as { code: string }).code === fullCode)
}

const KHLD: DashboardConfig = {
  // Four rows with a form each and a rule that computes -- coordination
  // meetings, community activities, volunteers recruited, market days. One
  // per objective; the milestones are left out because two of the four wait
  // on a decision (OQ-56).
  kpi: ['A2', 'D1', 'F2', 'H1'],
  kpiTone: { A2: 'teal', D1: 'green', F2: 'amber', H1: 'raised' },
  // The form's short name, as in the sidebar. Found by the full code
  // (`KHLD-SO1-A2`), so `A2` here can only ever be Khalidiyah's.
  indicatorName: (row, { t, exists, ar, source }) => {
    const fid = khldFormFor(source?.full_code)
    const key = fid ? `khld:forms.${fid}.short` : ''
    return fid && exists(key) ? t(key) : statement(row, ar)
  },
  objectiveTitle: (code, row, { t, exists, ar }) => {
    const key = `khld:objective.${code.toLowerCase()}`
    return exists(key) ? t(key) : objectiveStatement(row, ar)
  },
  sourceLinks: (_row, source) => {
    const fid = khldFormFor(source?.full_code)
    return fid ? [{ to: `/khld/${fid}`, labelKey: `khld:forms.${fid}.short` }] : []
  },
  // The person-level forms collect sex, the seven age bands, nationality and
  // status, the Washington Group disability question and the neighbourhood
  // (0141). Nothing is uncollected by design; what is missing is a breakdown
  // VIEW, which the panel states from `is_disaggregable`.
  uncollectedDimensions: [],
  openItemsRoute: '/khld/rules',
  openItemsLabelKey: 'khld:nav.rules',
  noTargetsNoteKey: 'khld:dashboard.planTargetNote',
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
