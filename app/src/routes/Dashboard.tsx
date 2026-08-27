import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useReportingPeriods,
  useIndicatorRows,
  useIndicatorSources,
  currentPeriodCode,
  groupByObjective,
  sourceModules,
  targetText,
  actualText,
  barWidth,
  KPI_CODES,
  KPI_TONE,
  hasTarget,
  type IndicatorRow,
} from '../data/indicators'
import { AccentRule, PageHead, SectionRule } from '../ui/primitives'
import { ACCENT_BG } from '../modules'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The municipality dashboard. Every number comes from v_indicator_progress.
 *
 *  The layout is the prototype's: 46px headline, 6px rule, four edge-to-edge
 *  KPI blocks with no gutters, then the twenty indicators in objective groups.
 *  What changed is where the figures come from — this screen used to render
 *  literals, including "A1.3 = 47" when the real figure was 3.
 *
 *  ── THREE THINGS THIS SCREEN MUST NEVER DO ──
 *
 *  1. Show a number when it does not have one. No fallback, no last-known
 *     value, no zero standing in for an unknown. If the query fails the screen
 *     says so and shows nothing.
 *
 *  2. Print 0 for an absent target. CLAUDE.md rule 1 — a zero reads as a real
 *     target in a donor report. It says "not set", in words.
 *
 *  3. Let a headline disagree with the detail. Each KPI card IS one of the rows
 *     below it, looked up by code from the same array. Not a second query, not
 *     a derived total.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── KPI band ────────────────────────────────────────────────────────────── */

const TONE: Record<string, { block: string; ink: string; track: string; fill: string }> = {
  teal: { block: 'bg-teal', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  raised: { block: 'bg-raised', ink: 'text-ink', track: 'bg-hairline', fill: 'bg-ink' },
  amber: { block: 'bg-amber', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  green: { block: 'bg-green', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
}

function KpiBlock({ row }: { row: IndicatorRow }) {
  const { t } = useTranslation('indicators')
  const tone = TONE[KPI_TONE[row.code as (typeof KPI_CODES)[number]]] ?? TONE.raised!
  const width = barWidth(row)

  return (
    <div
      className={`flex min-h-[190px] flex-col justify-between px-5 pb-[18px] pt-5 ${tone.block} ${tone.ink}`}
    >
      <div className="font-narrow text-[11.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] opacity-85">
        {t(`name.${row.code}`)}
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
            {!hasTarget(row)
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
  accent,
  dataSource,
}: {
  row: IndicatorRow
  accent: string
  dataSource: string | undefined
}) {
  const { t } = useTranslation(['indicators', 'nav'])
  const mods = dataSource ? sourceModules(row.code, dataSource) : []
  const width = barWidth(row)

  return (
    <div
      className={`grid grid-cols-[68px_minmax(180px,1fr)_minmax(0,172px)_96px_128px] items-center gap-[14px] border-b border-border-default px-4 py-[10px] ${
        row.is_manual ? 'bg-sunken' : ''
      }`}
    >
      <span
        className={`text-[15px] font-extrabold tracking-[-0.01em] tabular-nums ${
          row.is_manual ? 'text-faint' : 'text-ink'
        }`}
      >
        {row.code}
      </span>
      <span
        className={`text-[15px] leading-[1.3] ${row.is_manual ? 'font-normal text-faint' : 'font-medium text-ink'}`}
        style={{ textWrap: 'pretty' }}
      >
        {t(`indicators:name.${row.code}`)}
      </span>

      <span className="flex flex-wrap gap-x-2 gap-y-[5px]">
        {mods.length === 0 ? (
          // No form feeds this indicator, and the Manual entries screen that is
          // meant to is still reading mock data. Saying "no entry path yet" is
          // the honest label -- linking to a screen that cannot save would be
          // worse than saying nothing.
          <span className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber">
            {t('indicators:noEntryPath')}
          </span>
        ) : (
          mods.map((m) => (
            <Link
              key={m}
              to={`/forms/${m}`}
              className="border-b-[1.5px] border-solid border-border-strong font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink"
            >
              {t(`nav:module.${m}`)}
            </Link>
          ))
        )}
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
            className={`block h-full ${row.is_manual ? 'bg-border-strong' : accent}`}
            style={{ width: `${width}%` }}
          />
        </span>
      )}

      <span className="flex items-baseline justify-end gap-[7px]">
        <span
          className={`text-[17px] font-extrabold tracking-[-0.025em] tabular-nums ${
            row.is_manual ? 'text-faint' : 'text-ink'
          }`}
        >
          {actualText(row, t('indicators:noValue'))}
        </span>
        <span className="font-narrow text-[12px] font-semibold tabular-nums text-faint">
          {t('indicators:ofTarget', { target: targetText(row, t('indicators:targetNotSet')) })}
        </span>
      </span>
    </div>
  )
}

/* ── the screen ──────────────────────────────────────────────────────────── */

export function Dashboard() {
  const { t } = useTranslation(['indicators', 'nav'])

  const periodsQ = useReportingPeriods()
  const periods = periodsQ.data ?? []
  const periodCode = currentPeriodCode(periods)
  const rowsQ = useIndicatorRows(periodCode)
  const sourcesQ = useIndicatorSources()

  const rows = rowsQ.data ?? []
  const sourceOf = new Map((sourcesQ.data ?? []).map((s) => [s.code, s.data_source]))
  const groups = groupByObjective(rows)
  const period = periods.find((p) => p.code === periodCode)

  const failed = periodsQ.isError || rowsQ.isError
  const loading = periodsQ.isLoading || rowsQ.isLoading

  // Every target absent for this quarter is a fact about the plan, not a fault.
  const noTargetsAtAll = rows.length > 0 && !rows.some(hasTarget)
  const firstPeriod = periods.length > 0 && periods[0]?.code === periodCode
  const manualCount = rows.filter((r) => r.is_manual).length

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
            {KPI_CODES.map((code) => {
              const row = rows.find((r) => r.code === code)
              return row ? <KpiBlock key={code} row={row} /> : null
            })}
          </div>

          {noTargetsAtAll ? (
            <p className="mt-5 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {firstPeriod
                ? t('indicators:firstQuarterNoTargets', { code: periodCode ?? '' })
                : t('indicators:periodNoTargets', { code: periodCode ?? '' })}
            </p>
          ) : null}

          {manualCount > 0 ? (
            <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {t('indicators:manualNotice', { count: manualCount })}
            </p>
          ) : null}

          {groups.map((g) => (
            <section key={g.objectiveCode} className="mt-8">
              <SectionRule
                title={t(`indicators:objective.${g.objectiveCode}`)}
                right={
                  g.withoutForm > 0
                    ? t('indicators:withoutForm', { count: g.withoutForm })
                    : undefined
                }
              />
              <div className="mt-1 overflow-x-auto">
                <div className="min-w-[720px]">
                  {g.rows.map((r) => (
                    <Row
                      key={r.code}
                      row={r}
                      accent={ACCENT_BG[g.accent]}
                      dataSource={sourceOf.get(r.code)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}

export default Dashboard
