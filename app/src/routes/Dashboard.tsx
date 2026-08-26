import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useKpis,
  useIndicatorGroups,
  useDisaggregation,
  useGapCodes,
  type Kpi,
} from '../hooks/useData'
import { useToast } from '../ui/Toast'
import { ACCENT_BG } from '../modules'
import { AccentRule, PageHead, SectionRule } from '../ui/primitives'

/**
 * The municipality dashboard, copied from the prototype.
 *
 * Layout landmarks, in the prototype's own order:
 *   46px uppercase headline · 6px black rule · four edge-to-edge KPI blocks ·
 *   the 20 indicators in five coloured groups · disaggregation bars beside the
 *   dark "gap" panel.
 *
 * The KPI blocks deliberately have NO gap between them and no radius: they read
 * as one four-colour band across the page. Adding gutters breaks the band.
 */

/* ── KPI band ────────────────────────────────────────────────────────────── */

/** The four tones, exactly as the prototype's K table. */
const KPI_TONE: Record<Kpi['tone'], { block: string; ink: string; track: string; fill: string }> = {
  teal: { block: 'bg-teal', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  raised: { block: 'bg-raised', ink: 'text-ink', track: 'bg-hairline', fill: 'bg-ink' },
  amber: { block: 'bg-amber', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
  green: { block: 'bg-green', ink: 'text-bg', track: 'bg-bg/28', fill: 'bg-bg' },
}

function KpiBlock({ kpi }: { kpi: Kpi }) {
  const { t } = useTranslation('indicators')
  const tone = KPI_TONE[kpi.tone]
  // "Target met" replaces the percentage once a target is reached -- a donor
  // reading "100%" and "Target met" should not have to work out they differ.
  const right =
    kpi.pct >= 100 ? t('targetMet') : t('pctOfTarget', { pct: Math.round(kpi.pct) })

  return (
    <div
      className={`flex min-h-[190px] flex-col justify-between px-5 pb-[18px] pt-5 ${tone.block} ${tone.ink}`}
    >
      <div className="font-narrow text-[11.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] opacity-85">
        {t(`kpi.${kpi.id}`)}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[58px] font-black leading-[0.8] tracking-[-0.05em] tabular-nums">
            {kpi.value}
          </span>
          <span className="font-narrow text-[15px] font-semibold tabular-nums opacity-75">
            {t('slashTarget', { target: kpi.target })}
          </span>
        </div>
        <div className={`mt-[15px] h-2 ${tone.track}`}>
          <div className={`h-full ${tone.fill}`} style={{ width: `${kpi.pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between font-narrow text-[11.5px] font-bold uppercase tracking-[0.09em] opacity-88">
          <span>{t('deltaThisQuarter', { count: kpi.deltaCount })}</span>
          <span>{right}</span>
        </div>
      </div>
    </div>
  )
}

/* ── indicator table ─────────────────────────────────────────────────────── */

/** Where a row's source-form chip points. `both` is G0.4, which has two. */
function sourceLinks(sourceModule: string | null): { to: string; key: string }[] {
  if (sourceModule === null) return []
  if (sourceModule === 'both') {
    return [
      { to: '/forms/tp', key: 'nav:module.tp' },
      { to: '/forms/pp', key: 'nav:module.pp' },
    ]
  }
  return [{ to: `/forms/${sourceModule}`, key: `nav:module.${sourceModule}` }]
}

function IndicatorRow({
  row,
  accent,
}: {
  row: ReturnType<typeof useIndicatorGroups>[number]['rows'][number]
  accent: string
}) {
  const { t } = useTranslation(['indicators', 'nav'])
  const links = sourceLinks(row.sourceModule)

  return (
    <div
      className={`grid grid-cols-[68px_minmax(180px,1fr)_minmax(0,172px)_96px_116px] items-center gap-[14px] border-b border-border-default px-4 py-[10px] ${
        row.manual ? 'bg-sunken' : ''
      }`}
    >
      <span
        className={`text-[15px] font-extrabold tracking-[-0.01em] tabular-nums ${
          row.manual ? 'text-faint' : 'text-ink'
        }`}
      >
        {row.code}
      </span>
      <span
        className={`text-[15px] leading-[1.3] ${row.manual ? 'font-normal text-faint' : 'font-medium text-ink'}`}
        style={{ textWrap: 'pretty' }}
      >
        {t(`indicators:name.${row.code}`)}
      </span>

      <span className="flex flex-wrap gap-x-2 gap-y-[5px]">
        {links.length === 0 ? (
          <Link
            to="/manual-entries"
            className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber"
          >
            {t('indicators:noFormYet')}
          </Link>
        ) : (
          links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="border-b-[1.5px] border-solid border-border-strong font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink"
            >
              {t(l.key)}
            </Link>
          ))
        )}
      </span>

      <span
        className={`h-3 bg-track ${row.manual ? 'border border-dashed border-border-muted' : ''}`}
        role="img"
        aria-label={t('indicators:progressLabel', { code: row.code })}
      >
        <span
          className={`block h-full ${row.manual ? 'bg-border-strong' : accent}`}
          style={{ width: `${row.pct}%` }}
        />
      </span>

      <span className="flex items-baseline justify-end gap-[7px]">
        <span
          className={`text-[17px] font-extrabold tracking-[-0.025em] tabular-nums ${
            row.manual ? 'text-faint' : 'text-ink'
          }`}
        >
          {row.actual}
        </span>
        <span className="font-narrow text-[12px] font-semibold tabular-nums text-faint">
          {t('indicators:ofTarget', { target: row.target })}
        </span>
      </span>
    </div>
  )
}

/* ── who is in the data ──────────────────────────────────────────────────── */

/** Bar shades, in fill order. Only the first two carry cream text. */
const SHADES = ['', 'bg-faint', 'bg-shade', 'bg-border-muted']

function Disaggregation() {
  const { t } = useTranslation('indicators')
  const disag = useDisaggregation()

  return (
    <>
      {disag.map((d) => {
        const total = d.bars.reduce((sum, b) => sum + b.v, 0)
        const shade = (i: number) => (i === 0 ? ACCENT_BG[d.accent] : (SHADES[i % 4] ?? 'bg-faint'))
        return (
          <div key={d.id} className="mb-[19px]">
            <div className="mb-1.5 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
              {t(`disag.${d.id}`)}
            </div>
            <div className="flex h-[30px]">
              {d.bars.map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center overflow-hidden whitespace-nowrap px-[9px] font-narrow text-[12px] font-bold tracking-[0.04em] tabular-nums ${shade(i)} ${
                    i <= 1 ? 'text-bg' : 'text-ink'
                  }`}
                  style={{ width: `${Math.round((b.v / total) * 100)}%` }}
                >
                  {b.v}
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-[14px]">
              {d.bars.map((b, i) => (
                <span key={b.id} className="flex items-center gap-1.5 text-[12.5px] text-body">
                  <span className={`h-[9px] w-[9px] ${shade(i)}`} />
                  {t(`disagLabel.${d.id}.${b.id}`)}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

/* ── screen ──────────────────────────────────────────────────────────────── */

export function Dashboard() {
  const { t } = useTranslation(['indicators', 'common', 'nav'])
  const kpis = useKpis()
  const groups = useIndicatorGroups()
  const gapCodes = useGapCodes()
  const toast = useToast()

  const withForm = groups.reduce((n, g) => n + g.rows.filter((r) => !r.manual).length, 0)
  const byHand = groups.reduce((n, g) => n + g.rows.filter((r) => r.manual).length, 0)

  return (
    <>
      <PageHead
        eyebrow={t('indicators:quarterLine')}
        title={t('indicators:whereThePlanStands')}
        size="xl"
        action={
          <button
            type="button"
            onClick={() =>
              toast.fire({
                tag: t('common:toast.exported'),
                title: t('indicators:exportDone'),
                sub: t('indicators:exportSub'),
              })
            }
            className="flex-none cursor-pointer bg-ink px-5 py-3 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg"
          >
            {t('indicators:exportReturn')}
          </button>
        }
      />
      <AccentRule className="bg-ink" />

      <section aria-label={t('indicators:kpiLandmark')} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <KpiBlock key={k.id} kpi={k} />
        ))}
      </section>

      <div className="mt-11">
        <SectionRule
          title={t('indicators:theTwentyIndicators')}
          right={
            <div className="flex gap-[18px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em]">
              <span className="flex items-center gap-[7px]">
                <span className="h-[13px] w-[13px] bg-ink" />
                {t('indicators:haveAForm', { count: withForm })}
              </span>
              <span className="flex items-center gap-[7px] text-muted">
                <span className="h-[13px] w-[13px] border-[1.5px] border-dashed border-amber" />
                {t('indicators:enteredByHand', { count: byHand })}
              </span>
            </div>
          }
        />
      </div>

      <div className="overflow-x-auto" aria-label={t('indicators:tableLandmark')}>
        {groups.map((g) => (
          <div key={g.num} className="mt-6 min-w-[780px]">
            <div className={`flex items-center gap-[14px] px-4 py-[9px] text-bg ${ACCENT_BG[g.accent]}`}>
              <span className="text-[19px] font-black tracking-[-0.03em] tabular-nums">{g.num}</span>
              <span className="font-narrow text-[13px] font-bold uppercase tracking-[0.14em]">
                {t(`indicators:group.${g.num}`)}
              </span>
              <span className="ms-auto font-narrow text-[11.5px] font-semibold uppercase tracking-[0.1em] opacity-85">
                {t('indicators:groupMeta', { indicators: g.indicatorCount, without: g.withoutForm })}
              </span>
            </div>
            {g.rows.map((r) => (
              <IndicatorRow key={r.code} row={r} accent={ACCENT_BG[g.accent]} />
            ))}
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.55fr_1fr]">
        <div>
          <SectionRule title={t('indicators:whoIsInTheData', { count: 47 })} />
          <p className="mb-[18px] mt-2 font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            {t('indicators:participantsOnly')}
          </p>
          <Disaggregation />

          {/* The two fields the forms do not yet collect. Flagged, not faked --
              a donor breakdown that silently omits a dimension is worse than
              one that says the question is missing. */}
          <div className="mt-[22px] grid grid-cols-1 gap-[14px] sm:grid-cols-2">
            {(['refugee', 'disability'] as const).map((f) => (
              <div
                key={f}
                className="border-[1.5px] border-dashed border-attention-border bg-attention-bg px-4 pb-[18px] pt-4"
              >
                <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-amber">
                  {t(`indicators:disag.${f}`)}
                </div>
                <div className="mt-[9px] text-[15px] font-bold tracking-[-0.015em]">
                  {t('indicators:fieldNotCollected')}
                </div>
                <p className="mt-1.5 text-[13.5px] leading-[1.45] text-attention-ink">
                  {t('indicators:fieldNotCollectedDesc', {
                    field: t(`indicators:disag.${f}`).toLowerCase(),
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="self-start bg-invert-bg px-[26px] pb-7 pt-[26px] text-invert-ink">
          <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.16em] text-invert-accent">
            {t('indicators:theGap')}
          </div>
          <div className="mt-3 text-[23px] font-extrabold leading-[1.2] tracking-[-0.025em]">
            {t('indicators:gapHeadline', { count: gapCodes.length })}
          </div>
          <p className="mt-3 text-[14.5px] leading-[1.55] text-invert-body">
            {t('indicators:gapBody')}
          </p>
          <div className="mt-[18px] flex flex-wrap gap-1.5">
            {gapCodes.map((c) => (
              <span
                key={c}
                className="border-[1.5px] border-dashed border-invert-rule px-[9px] py-[3px] font-narrow text-[12px] font-bold tracking-[0.06em] tabular-nums text-invert-chip"
              >
                {c}
              </span>
            ))}
          </div>
          <Link
            to="/manual-entries"
            className="mt-[18px] block w-full cursor-pointer bg-bg px-4 py-[11px] text-center font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink"
          >
            {t('indicators:openManualEntries')}
          </Link>
        </div>
      </div>
    </>
  )
}

export default Dashboard
