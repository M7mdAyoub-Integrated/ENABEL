import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIMENSIONS,
  tally,
  totalFor,
  useDisaggregation,
  type Dimension,
} from '../data/disaggregation'
import { SectionRule } from '../ui/primitives'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The disaggregation panel.
 *
 *  ── THE WARNING IS NOT A FOOTNOTE, IT IS THE FIRST THING ──
 *
 *  `v_indicator_disaggregated` will happily render "1 refugee, 2 non-refugee"
 *  today, and every one of those values comes from a SEEDED demo row. No
 *  Sahel Horan form collects refugee status or disability — the fields were
 *  built on 2026-08-24 and removed the same day, and nothing has asked since
 *  (OQ-12).
 *
 *  A breakdown that looks complete and is made of seed data is worse than no
 *  breakdown, because it invites a coordinator to read an inclusion story out
 *  of it — and refugee inclusion is the reason this Action Plan exists. So the
 *  notice sits ABOVE the figures, not under them, and the two uncollected
 *  dimensions carry their own mark on every row.
 *
 *  ── WHICH INDICATORS, AND WHOSE FORMS ──
 *
 *  Both come from the caller, and neither is a literal here. The codes on
 *  offer are the rows whose `is_disaggregable` the view set, so a programme
 *  the view does not cover (Ramtha, today) gets a panel that says so instead
 *  of four Sahel Horan codes. The uncollected dimensions are the programme's
 *  own entry in data/dashboardConfig.ts, and the warning names the
 *  municipality from its row rather than saying "this platform" — which
 *  stopped being true the day a second programme's forms started asking.
 *
 *  ── WHY not_recorded IS NEVER HIDDEN OR SORTED IN ──
 *
 *  The view buckets nulls rather than dropping those people, so the breakdown
 *  always adds up to the headline figure. That is the property that makes it
 *  trustworthy, and it only works if the bucket is shown. It sorts last
 *  everywhere, because it is the absence of an answer rather than a kind of
 *  person.
 *
 *  ── WHAT THIS DOES NOT DO ──
 *
 *  It computes no indicator. Every number is the view's own
 *  count(distinct person_id) per combination; the only arithmetic is summing
 *  disjoint combinations to collapse the cross-product to one dimension. See
 *  data/disaggregation.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function DisaggregationPanel({
  periodCode,
  municipalityId,
  municipalityName,
  codes,
  uncollected,
}: {
  periodCode: string | undefined
  municipalityId: string | null
  /** The municipality's display name, from its row, for the sentences that name whose forms. */
  municipalityName: string
  /** The indicators the view can break down, from the rows' own `is_disaggregable`. */
  codes: readonly string[]
  /** Dimensions no form of this programme collects. */
  uncollected: readonly Dimension[]
}) {
  const { t } = useTranslation(['indicators', 'common'])
  const q = useDisaggregation(periodCode, codes.length > 0 ? municipalityId : null)
  const [chosen, setChosen] = useState<string | null>(null)
  // The rows arrive after the first render, so the choice is validated
  // against the list each time rather than fixed at mount.
  const code = chosen && codes.includes(chosen) ? chosen : (codes[0] ?? null)
  const rows = q.data ?? []
  const total = code ? totalFor(rows, code) : 0

  return (
    <section className="mt-8">
      <SectionRule title={t('indicators:disagg.heading')} />

      {/* ── OQ-12, stated before any figure is shown -- for the programme whose
             forms do not ask. ── */}
      {uncollected.length > 0 ? (
        <div role="note" className="mt-3 border-s-[3px] border-amber bg-attention-bg p-4">
          <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-amber">
            {t('indicators:disagg.warnTag')}
          </p>
          <p className="mt-1.5 max-w-[74ch] text-[14.5px] leading-[1.55] text-body">
            {t('indicators:disagg.warnBody', { municipality: municipalityName })}
          </p>
          <p className="mt-2 max-w-[74ch] text-[14.5px] leading-[1.55] text-body">
            {t('indicators:disagg.warnSeed')}
          </p>
        </div>
      ) : null}

      {codes.length === 0 ? (
        // Derived from the rows, not written: no row of this municipality's
        // carries is_disaggregable, so the view covers none of its indicators.
        <p className="mt-3 border-[1.5px] border-dashed border-border-muted bg-sunken p-4 text-[14px] leading-[1.5] text-muted">
          {t('indicators:disagg.noneDisaggregable', { municipality: municipalityName })}
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-[74ch] text-[14px] leading-[1.5] text-muted">
            {t('indicators:disagg.intro', { count: codes.length })}
          </p>

          {/* Which of them. Only these have a person behind every unit. */}
          <div className="mt-4 flex flex-wrap gap-2">
            {codes.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChosen(c)}
                aria-pressed={c === code}
                className={`min-h-10 px-3 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] ${
                  c === code
                    ? 'bg-ink text-bg'
                    : 'border-[1.5px] border-border-strong bg-bg text-ink hover:bg-sunken'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {q.isLoading ? (
            <div aria-hidden="true" className="mt-4 h-40 animate-pulse bg-track" />
          ) : q.isError ? (
            <p role="alert" className="mt-4 border-[1.5px] border-error p-4 text-[15px]">
              {t('indicators:disagg.loadFailed')}
            </p>
          ) : total === 0 ? (
            <p className="mt-4 border-[1.5px] border-dashed border-border-muted bg-sunken p-4 text-[14px] leading-[1.5] text-muted">
              {t('indicators:disagg.noneInPeriod', { code: code ?? '', period: periodCode ?? '' })}
            </p>
          ) : (
            <>
              <p className="mt-4 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
                {t('indicators:disagg.totalLine', { code: code ?? '', count: total })}
              </p>
              <div className="mt-2 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                {DIMENSIONS.map((dim) => (
                  <DimensionBlock
                    key={dim}
                    dim={dim}
                    rows={tally(rows, code ?? '', dim)}
                    total={total}
                    uncollected={uncollected.includes(dim)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}

function DimensionBlock({
  dim,
  rows,
  total,
  uncollected,
}: {
  dim: Dimension
  rows: { bucket: string; value: number }[]
  total: number
  uncollected: boolean
}) {
  const { t } = useTranslation(['indicators'])

  return (
    <div>
      <h3 className="m-0 flex flex-wrap items-baseline gap-2 border-b-[1.5px] border-ink pb-1">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
          {t(`indicators:disagg.dim.${dim}`)}
        </span>
        {/* On every uncollected dimension, on every render. The panel-level
            notice explains it once; this makes it impossible to read one of
            these two blocks without seeing that no form asks. */}
        {uncollected ? (
          <span className="border-[1.5px] border-amber px-1.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-amber">
            {t('indicators:disagg.noFormCollects')}
          </span>
        ) : null}
      </h3>
      <ul className="mt-2 flex list-none flex-col gap-1.5 p-0">
        {rows.map((r) => {
          const pct = total > 0 ? Math.round((r.value / total) * 100) : 0
          const missing = r.bucket === 'not_recorded'
          return (
            <li key={r.bucket} className="grid grid-cols-[1fr_auto] items-baseline gap-x-3">
              <span
                className={`text-[14px] ${missing ? 'italic text-muted' : 'text-ink'}`}
                dir="auto"
              >
                {missing
                  ? t('indicators:disagg.notRecorded')
                  : t(`indicators:disagg.bucket.${r.bucket}`, { defaultValue: r.bucket })}
              </span>
              {/* ONE string, not a count beside a percentage. Rendered as two
                  adjacent inline spans they read as "250%" to a screen reader,
                  to innerText, and to anyone copying the row -- the margin
                  between them is CSS, and CSS is not a separator. */}
              <span className="font-narrow text-[13px] font-bold tabular-nums text-ink">
                {t('indicators:disagg.countAndShare', { count: r.value, pct })}
              </span>
              <span
                className="col-span-2 h-[7px] bg-track"
                role="img"
                aria-label={t('indicators:disagg.barLabel', { count: r.value })}
              >
                <span
                  className={`block h-full ${missing ? 'bg-border-strong' : 'bg-ink'}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
