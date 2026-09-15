import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useReportingPeriods,
  useIndicatorRows,
  useIndicatorSources,
  useIndicatorStatus,
  useIndicatorUnique,
  useAnyTarget,
  currentPeriodCode,
  groupByObjective,
  targetText,
  actualText,
  barWidth,
  hasTarget,
  type IndicatorRow,
  type IndicatorSource,
  type IndicatorStatusRow,
} from '../data/indicators'
import { dashboardConfigFor, type DashboardConfig, type LabelContext } from '../data/dashboardConfig'
import { useCurrentMunicipality, useMunicipalityName } from '../data/municipalities'
import { useRmthThresholds } from '../data/rmthThresholds'
import { makeTranslate } from '../i18n/tx'
import { AccentRule, PageHead, SectionRule } from '../ui/primitives'
import { DisaggregationPanel } from '../components/DisaggregationPanel'
import { ACCENT_BG } from '../modules'
import { SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The municipality dashboard. One screen for both programmes; every number
 *  comes from v_indicator_progress for the municipality the account is
 *  working in.
 *
 *  The layout is the prototype's: 46px headline, 6px rule, four edge-to-edge
 *  KPI blocks with no gutters, then the indicators in objective groups, then
 *  the breakdowns. What changed is where the figures come from — this screen
 *  used to render literals, including "A1.3 = 47" when the real figure was 3.
 *
 *  ── THREE THINGS THIS SCREEN MUST NEVER DO ──
 *
 *  1. Show a number when it does not have one. No fallback, no last-known
 *     value, no zero standing in for an unknown. If the query fails the screen
 *     says so and shows nothing.
 *
 *  2. Print 0 for an absent target. CLAUDE.md rule 1 — a zero reads as a real
 *     target in a donor report. It says "not set", in words. Both when there
 *     is no target row and when the row holds a stored zero (0037).
 *
 *  3. Let a headline disagree with the detail. Each KPI card IS one of the
 *     rows below it, looked up by code from the same array. Not a second
 *     query, not a derived total.
 *
 *  ── AND ONE THING IT MUST NEVER DECIDE ──
 *
 *  Whether a figure can be computed. `v_rmth_indicator_status` says why a
 *  row has no figure — a definition still null in rmth_threshold, or a code
 *  the framework gave no statement — from the same rows the views read. The
 *  screen only chooses words: "not computable until decided", naming the
 *  definition in the reader's language from the threshold row's own label.
 *  Never zero. A blocked row is a fact about the plan, not a low number.
 *
 *  ── WHOSE WORDS ──
 *
 *  Sahel Horan's `A1.2` is technical partnerships; Ramtha's is networking
 *  events. Every string that names an indicator, an objective or a source
 *  form is resolved through data/dashboardConfig.ts by the municipality's
 *  code, and the municipality's name in any sentence is its row's own. There
 *  is no `t('indicators:name.' + code)` in this file, because that key is
 *  right for one programme and wrong for the other.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── shared label context ────────────────────────────────────────────────── */

function useLabels(config: DashboardConfig, sourceOf: Map<string, IndicatorSource>) {
  const { t, i18n } = useTranslation(['indicators', 'nav', 'rmth'])
  const tr = makeTranslate(t)
  const ar = i18n.language.startsWith('ar')
  const ctx = (row: IndicatorRow): LabelContext => ({
    t: tr,
    exists: (key) => i18n.exists(key),
    ar,
    source: sourceOf.get(row.code),
  })
  return {
    ar,
    name: (row: IndicatorRow) => config.indicatorName(row, ctx(row)),
    objective: (code: string, row: IndicatorRow) => config.objectiveTitle(code, row, ctx(row)),
  }
}

/* ── the words for a row that has no figure ──────────────────────────────── */

/**
 * The threshold labels are read only when some row is blocked: for a
 * programme with no open definitions the query never runs.
 */
function useMissingDefinitionLabels(enabled: boolean, ar: boolean) {
  const thresholds = useRmthThresholds(enabled)
  return (keys: string[] | null): string[] =>
    (keys ?? [])
      .map((k) => thresholds.data?.find((x) => x.key === k))
      .map((x) => (x ? (ar ? x.label_ar : x.label_en) : ''))
      .filter(Boolean)
}

/* ── KPI band ────────────────────────────────────────────────────────────── */

const TONE: Record<string, { block: string; ink: string; track: string; fill: string }> = {
  teal: { block: 'bg-teal', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  raised: { block: 'bg-raised', ink: 'text-ink', track: 'bg-hairline', fill: 'bg-ink' },
  amber: { block: 'bg-amber', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  green: { block: 'bg-green', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
}

function KpiBlock({
  row,
  label,
  tone: toneName,
  status,
}: {
  row: IndicatorRow
  label: string
  tone: string
  status: IndicatorStatusRow | undefined
}) {
  const { t } = useTranslation('indicators')
  const tone = TONE[toneName] ?? TONE.raised!
  const width = barWidth(row)
  const blocked = !!status?.reason

  return (
    <div
      className={`flex min-h-[190px] flex-col justify-between px-5 pb-[18px] pt-5 ${tone.block} ${tone.ink}`}
    >
      <div className="font-narrow text-[11.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] opacity-85">
        {label}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[58px] font-black leading-[0.8] tracking-[-0.05em] tabular-nums">
            {actualText(row, t('noValue'))}
          </span>
          <span className="font-narrow text-[15px] font-semibold tabular-nums opacity-75">
            {t('slashTarget', { target: targetText(row, t('targetNotSet')) })}
          </span>
        </div>

        {/* No target means no bar. An empty track would read as "0% of
            something"; a full one would be a lie. The track is simply absent. */}
        {width === null ? (
          <div className="mt-[15px] h-2 border border-dashed border-current opacity-40" />
        ) : (
          <div className={`mt-[15px] h-2 ${tone.track}`}>
            <div className={`h-full ${tone.fill}`} style={{ width: `${width}%` }} />
          </div>
        )}

        <div className="mt-2 flex justify-end font-narrow text-[11.5px] font-bold uppercase tracking-[0.09em] opacity-88">
          <span>
            {blocked
              ? status?.reason === 'no_statement'
                ? t('noStatementShort')
                : t('notComputableShort')
              : !hasTarget(row)
                ? t('targetNotSet')
                : width !== null && width >= 100
                  ? t('targetMet')
                  : t('pctOfTarget', { pct: Math.round(width ?? 0) })}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── one indicator ───────────────────────────────────────────────────────── */

function Row({
  row,
  name,
  accent,
  links,
  status,
  missing,
  unique,
  openItemsRoute,
}: {
  row: IndicatorRow
  name: string
  accent: string
  links: { to: string; labelKey: string }[]
  status: IndicatorStatusRow | undefined
  missing: string[]
  unique: number | undefined
  openItemsRoute: string | undefined
}) {
  const { t } = useTranslation(['indicators', 'nav', 'rmth'])
  const width = barWidth(row)
  const reason = status?.reason ?? null
  // Greyed for the same reason a manual row is: the figure is not something a
  // form moved. A blocked row additionally says why, under its name.
  const faint = row.is_manual || !!reason

  // A "3 unique people" beside a completion count, only while the count is
  // real: the unique view counts completers whatever the rule says, and a
  // count beside a dash would read as the figure the rule has not produced.
  const uniqueText = unique === undefined || reason ? '' : t('indicators:ofWhomUnique', { count: unique })
  // The denominator of a percentage, only once there is a percentage. "— of 0"
  // is the reading this screen exists to avoid.
  const denominatorText =
    row.unit === '%' && row.actual !== null && row.denominator !== null
      ? t('indicators:denominator', { count: row.denominator })
      : ''
  const subline = uniqueText || denominatorText

  const figure = (
    <span className="flex items-baseline justify-end gap-[7px]">
      <span
        className={`text-[17px] font-extrabold tracking-[-0.025em] tabular-nums ${
          faint ? 'text-faint' : 'text-ink'
        }`}
      >
        {actualText(row, t('indicators:noValue'))}
      </span>
      <span className="font-narrow text-[12px] font-semibold tabular-nums text-faint">
        {t('indicators:ofTarget', { target: targetText(row, t('indicators:targetNotSet')) })}
      </span>
    </span>
  )

  return (
    <div
      className={`grid grid-cols-[68px_minmax(180px,1fr)_minmax(0,172px)_96px_128px] items-center gap-[14px] border-b border-border-default px-4 py-[10px] ${
        faint ? 'bg-sunken' : ''
      }`}
    >
      <span
        className={`text-[15px] font-extrabold tracking-[-0.01em] tabular-nums ${
          faint ? 'text-faint' : 'text-ink'
        }`}
      >
        {row.code}
      </span>
      <span
        className={`text-[15px] leading-[1.3] ${faint ? 'font-normal text-faint' : 'font-medium text-ink'}`}
        style={{ textWrap: 'pretty' }}
      >
        {name}
        {reason === 'threshold_unset' ? (
          <span className="mt-1 block text-[12.5px] leading-[1.35] text-attention-ink">
            {t('indicators:notComputable', { definition: missing.join(` ${SEP} `) })}
          </span>
        ) : null}
        {reason === 'no_statement' ? (
          <span className="mt-1 block text-[12.5px] leading-[1.35] text-attention-ink">
            {t('indicators:noStatement')}
          </span>
        ) : null}
      </span>

      <span className="flex flex-wrap gap-x-2 gap-y-[5px]">
        {links.length === 0 ? (
          reason === 'no_statement' ? null : (
            // Genuinely nowhere in this app to enter this.
            <span className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber">
              {t('indicators:noEntryPath')}
            </span>
          )
        ) : (
          links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="border-b-[1.5px] border-solid border-border-strong font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink"
            >
              {t(l.labelKey)}
            </Link>
          ))
        )}
        {reason === 'threshold_unset' && openItemsRoute ? (
          <Link
            to={openItemsRoute}
            className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber"
          >
            {t('indicators:openItems')}
          </Link>
        ) : null}
      </span>

      {width === null ? (
        <span
          className="h-3 border border-dashed border-border-muted"
          role="img"
          aria-label={t('indicators:noTargetLabel', { code: row.code })}
        />
      ) : (
        <span
          className="h-3 bg-track"
          role="img"
          aria-label={t('indicators:progressLabel', { code: row.code })}
        >
          <span
            className={`block h-full ${faint ? 'bg-border-strong' : accent}`}
            style={{ width: `${width}%` }}
          />
        </span>
      )}

      {/* The figure. Wrapped only when there is a second line under it, so a
          row with nothing to add renders exactly the markup it always has. */}
      {subline ? (
        <span className="flex flex-col items-end">
          {figure}
          <span className="font-narrow text-[11.5px] font-semibold tabular-nums text-faint">{subline}</span>
        </span>
      ) : (
        figure
      )}
    </div>
  )
}

/* ── the screen ──────────────────────────────────────────────────────────── */

export function Dashboard() {
  const { t } = useTranslation(['indicators', 'nav', 'rmth'])

  // Whose dashboard. From the account (or the super admin's switch), never
  // from the URL -- the same rule as the sidebar. MunicipalityGate holds a
  // super admin who has not chosen one before this renders, so null here is
  // only ever "still loading".
  const municipality = useCurrentMunicipality()
  const municipalityId = municipality?.id ?? null
  const municipalityName = useMunicipalityName()(municipality)
  const config = dashboardConfigFor(municipality?.code ?? '')

  const periodsQ = useReportingPeriods(municipalityId)
  const periods = periodsQ.data ?? []
  const periodCode = currentPeriodCode(periods)
  const rowsQ = useIndicatorRows(periodCode, municipalityId)
  const sourcesQ = useIndicatorSources(municipalityId)
  const statusQ = useIndicatorStatus(municipalityId)
  const uniqueQ = useIndicatorUnique(periodCode, municipalityId)
  const anyTargetQ = useAnyTarget(municipalityId)

  const rows = rowsQ.data ?? []
  const sourceOf = new Map((sourcesQ.data ?? []).map((s) => [s.code, s]))
  const statusOf = new Map((statusQ.data ?? []).map((s) => [s.code, s]))
  const uniqueOf = new Map((uniqueQ.data ?? []).map((u) => [u.code, Number(u.unique_actual)]))
  const labels = useLabels(config, sourceOf)
  const blockedRows = rows.filter((r) => statusOf.get(r.code)?.reason === 'threshold_unset')
  const noStatementRows = rows.filter((r) => statusOf.get(r.code)?.reason === 'no_statement')
  const missingFor = useMissingDefinitionLabels(blockedRows.length > 0, labels.ar)
  const groups = groupByObjective(rows)
  const period = periods.find((p) => p.code === periodCode)

  const failed = periodsQ.isError || rowsQ.isError || statusQ.isError || anyTargetQ.isError
  const loading =
    !municipality || periodsQ.isLoading || rowsQ.isLoading || statusQ.isLoading || anyTargetQ.isLoading

  // Every target absent for this quarter is a fact about the plan, not a fault.
  // Which fact depends on the whole matrix: none anywhere (Ramtha, OQ-48), or
  // none this quarter (Sahel Horan's first, which the framework leaves blank).
  const noTargetsAtAll = rows.length > 0 && !rows.some(hasTarget)
  const noTargetsAnywhere = noTargetsAtAll && anyTargetQ.data === false
  const firstPeriod = periods.length > 0 && periods[0]?.code === periodCode
  const noPathCount = rows.filter(
    (r) => !statusOf.get(r.code)?.reason && config.sourceLinks(r, sourceOf.get(r.code)).length === 0,
  ).length
  const disaggregable = rows.filter((r) => r.is_disaggregable).map((r) => r.code)

  return (
    <div className="pb-16">
      <PageHead title={t('indicators:dashboardTitle')} />
      <AccentRule />

      {period ? (
        <p className="mt-3 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t('indicators:showingPeriod', { code: period.code })}
        </p>
      ) : null}

      {/* A failed query shows nothing at all. There is no partial dashboard:
          half a set of indicator figures is not a smaller truth. */}
      {failed ? (
        <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
          <p className="m-0 text-[15px] font-semibold">{t('indicators:loadFailedTitle')}</p>
          <p className="mt-1 max-w-[60ch] text-[14px] text-body">
            {t('indicators:loadFailedBody')}
          </p>
        </div>
      ) : loading ? (
        <div aria-hidden="true" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="min-h-[190px] animate-pulse bg-track" />
            ))}
          </div>
          <div className="mt-8 h-64 animate-pulse bg-track" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {config.kpi.map((code) => {
              const row = rows.find((r) => r.code === code)
              if (!row) return null
              return (
                <KpiBlock
                  key={code}
                  row={row}
                  label={labels.name(row)}
                  tone={config.kpiTone[code] ?? 'raised'}
                  status={statusOf.get(code)}
                />
              )
            })}
          </div>

          {noTargetsAnywhere ? (
            <p className="mt-5 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {t('indicators:noTargetsAnywhere', { municipality: municipalityName })}
              {config.noTargetsNoteKey ? ` ${t(config.noTargetsNoteKey)}` : ''}
            </p>
          ) : noTargetsAtAll ? (
            <p className="mt-5 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {firstPeriod
                ? t('indicators:firstQuarterNoTargets', { code: periodCode ?? '' })
                : t('indicators:periodNoTargets', { code: periodCode ?? '' })}
            </p>
          ) : null}

          {blockedRows.length > 0 ? (
            <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {t('indicators:blockedNotice', { count: blockedRows.length })}
              {config.openItemsRoute ? (
                <Link to={config.openItemsRoute} className="ms-2 underline">
                  {t('indicators:openItems')}
                </Link>
              ) : null}
            </p>
          ) : null}

          {noStatementRows.map((r) => (
            <p
              key={r.code}
              className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body"
            >
              {t('indicators:noStatementNotice', {
                code: statusOf.get(r.code)?.full_code ?? r.code,
              })}
            </p>
          ))}

          {noPathCount > 0 ? (
            <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {t('indicators:noPathNotice', { count: noPathCount })}
            </p>
          ) : null}

          {groups.map((g) => (
            <section key={g.objectiveCode} className="mt-8">
              <SectionRule
                title={labels.objective(g.objectiveCode, g.rows[0]!)}
                right={
                  g.withoutForm > 0
                    ? t('indicators:withoutForm', { count: g.withoutForm })
                    : undefined
                }
              />
              <div className="mt-1 overflow-x-auto">
                <div className="min-w-[720px]">
                  {g.rows.map((r) => {
                    const status = statusOf.get(r.code)
                    return (
                      <Row
                        key={r.code}
                        row={r}
                        name={labels.name(r)}
                        accent={ACCENT_BG[g.accent]}
                        links={config.sourceLinks(r, sourceOf.get(r.code))}
                        status={status}
                        missing={missingFor(status?.missing_keys ?? null)}
                        unique={uniqueOf.get(r.code)}
                        openItemsRoute={config.openItemsRoute}
                      />
                    )
                  })}
                </div>
              </div>
            </section>
          ))}

          {/* The breakdowns the framework asks for. BELOW the indicator table:
              the indicators are what the dashboard is opened for, and the
              panel is a second reading of a few of them. Its OQ-12 warning
              still sits at the top of the panel itself, ahead of any figure. */}
          <DisaggregationPanel
            periodCode={periodCode}
            municipalityId={municipalityId}
            municipalityName={municipalityName}
            codes={disaggregable}
            uncollected={config.uncollectedDimensions}
          />
        </>
      )}
    </div>
  )
}

export default Dashboard
