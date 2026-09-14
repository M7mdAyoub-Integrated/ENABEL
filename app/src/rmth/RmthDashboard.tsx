import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReportingPeriods, currentPeriodCode } from '../data/indicators'
import { useRmthProgress, useRmthStatus, useRmthUnique, RMTH_KPI_CODES, type RmthProgressRow, type RmthStatusRow } from '../data/rmthDashboard'
import { useRmthThresholds } from '../data/rmthThresholds'
import { AccentRule, PageHead, SectionRule } from '../ui/primitives'
import { ACCENT_BG } from '../modules'
import { OBJECTIVE_ACCENT } from '../data/indicators'
import { RMTH_FORMS, RMTH_FORM_IDS, type RmthFormId } from './forms.generated'
import { SEP } from '../ui/glyphs'
import { makeTranslate, type Translate } from '../i18n/tx'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Ramtha's dashboard. Plain, as the plan asks; every number from the
 *  database; three states an indicator can be in, each said in words:
 *
 *    a figure         actual from v_indicator_progress, "of" a target that is
 *                     always "not set" today (0131 seeded every target null)
 *    not computable   the view returned null because a definition in
 *                     rmth_threshold is null (0132); the row names the
 *                     definition, in the reader's language, from the
 *                     threshold row's own label
 *    no statement     RMTH-SO1-A1, a code with no indicator text
 *
 *  Nothing here decides which state a row is in: `v_rmth_indicator_status`
 *  does, from the same rows the views read. The screen only chooses words.
 *
 *  Each code links to its form's list, because the form IS the source: the
 *  plan's "which form feeds this" is RMTH_FORMS[fid].indicator, derived,
 *  not a second map.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function formFor(code: string): RmthFormId | undefined {
  const full = `RMTH-${code}`
  return RMTH_FORM_IDS.find((fid) => {
    const ind = (RMTH_FORMS[fid] as { indicator: string }).indicator
    // 'RMTH-SO1-A1.2' ends with '-A1.2'; 'RMTH-SO1-0' ends with '-SO1-0'; 'RMTH-IMP-0' is 'RMTH-IMP-0'
    return ind === full || ind.endsWith(`-${code}`)
  })
}

function useNames() {
  const { i18n } = useTranslation()
  const ar = i18n.language.startsWith('ar')
  return {
    ar,
    name: (r: RmthProgressRow) => (ar ? r.name_ar : null) ?? r.name_en,
    objective: (r: RmthProgressRow) => (ar ? r.objective_name_ar : null) ?? r.objective_name_en,
  }
}

function figure(row: RmthProgressRow, t: Translate): string {
  if (row.actual === null) return t('rmth:dashboard.noValue')
  return row.unit === '%' ? t('rmth:dashboard.percent', { value: row.actual }) : String(row.actual)
}

/** "of 40", or "target not set" on its own -- never "of target not set", and never "of 0". */
function targetText(row: RmthProgressRow, t: Translate): string {
  return row.target === null ? t('rmth:dashboard.targetNotSet') : t('rmth:dashboard.ofTarget', { target: String(row.target) })
}

function KpiBlock({ row, status }: { row: RmthProgressRow; status: RmthStatusRow | undefined }) {
  const { t: tr } = useTranslation('rmth')
  const t = makeTranslate(tr)
  const names = useNames()
  const blocked = !!status?.reason
  // The form's short name, as in the sidebar, not the sheet's full statement:
  // E0.1's statement is 26 words, and this is a 170px card. The row below
  // carries the statement.
  const fid = formFor(row.code)
  const label = fid ? t(`forms.${fid}.short`) : names.name(row)
  return (
    <div className={`flex min-h-[170px] flex-col justify-between px-5 pb-[18px] pt-5 ${blocked ? 'bg-sunken text-ink' : 'bg-ink text-bg'}`}>
      <div className="font-narrow text-[11.5px] font-bold uppercase leading-[1.35] tracking-[0.12em] opacity-85">
        {row.code} {SEP} {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[58px] font-black leading-[0.8] tracking-[-0.05em] tabular-nums">{figure(row, t)}</span>
        <span className="font-narrow text-[15px] font-semibold tabular-nums opacity-75">{targetText(row, t)}</span>
      </div>
    </div>
  )
}

function Row({ row, status, unique, accent }: { row: RmthProgressRow; status: RmthStatusRow | undefined; unique: number | undefined; accent: string }) {
  const { t: tr } = useTranslation('rmth')
  const t = makeTranslate(tr)
  const names = useNames()
  const thresholds = useRmthThresholds()
  const fid = formFor(row.code)
  const reason = status?.reason ?? null
  const missing = (status?.missing_keys ?? [])
    .map((k) => thresholds.data?.find((x) => x.key === k))
    .map((x) => (x ? (names.ar ? x.label_ar : x.label_en) : ''))
    .filter(Boolean)
  // Assembled here rather than in the JSX: jsx-no-literals refuses a bare
  // ' ' or a template literal as a child.
  const actualText = figure(row, t)
  const target = targetText(row, t)
  // No "of whom unique" beside a figure that is not computable: the unique
  // view counts completers whatever the rule says, and a count beside a dash
  // would read as the figure the rule has not yet produced.
  const uniqueText = unique === undefined || reason ? '' : t('rmth:dashboard.ofWhomUnique', { count: unique })
  const denominatorText = row.unit === '%' && row.denominator !== null ? t('rmth:dashboard.denominator', { count: row.denominator }) : ''
  return (
    <div className={`grid grid-cols-[84px_minmax(220px,1fr)_minmax(0,220px)_140px] items-center gap-[14px] border-b border-border-default px-4 py-[10px] ${reason ? 'bg-sunken' : ''}`}>
      <span className={`text-[15px] font-extrabold tracking-[-0.01em] tabular-nums ${reason ? 'text-faint' : 'text-ink'}`}>{row.code}</span>
      <span className={`text-[15px] leading-[1.3] ${reason ? 'font-normal text-faint' : 'font-medium text-ink'}`} style={{ textWrap: 'pretty' }}>
        {names.name(row)}
        {reason === 'threshold_unset' ? (
          <span className="mt-1 block text-[12.5px] leading-[1.35] text-attention-ink">
            {t('rmth:dashboard.notComputable', { definition: missing.join(` ${SEP} `) })}
          </span>
        ) : null}
        {reason === 'no_statement' ? (
          <span className="mt-1 block text-[12.5px] leading-[1.35] text-attention-ink">{t('rmth:dashboard.noStatement')}</span>
        ) : null}
      </span>
      <span className="flex flex-wrap gap-x-2 gap-y-[5px]">
        {fid ? (
          <Link to={`/rmth/${fid}`} className="border-b-[1.5px] border-solid border-border-strong font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink">
            {t(`rmth:forms.${fid}.short`)}
          </Link>
        ) : (
          <span className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber">
            {t('rmth:dashboard.noForm')}
          </span>
        )}
        {reason === 'threshold_unset' ? (
          <Link to="/rmth/thresholds" className="border-b-[1.5px] border-dashed border-attention-border font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] text-amber">
            {t('rmth:dashboard.openItems')}
          </Link>
        ) : null}
      </span>
      <span className="flex flex-col items-end">
        <span className="flex items-baseline gap-[7px]">
          <span className={`text-[17px] font-extrabold tracking-[-0.025em] tabular-nums ${reason ? 'text-faint' : 'text-ink'}`}>{actualText}</span>
          <span className="font-narrow text-[12px] font-semibold tabular-nums text-faint">{target}</span>
        </span>
        {uniqueText || denominatorText ? (
          <span className="font-narrow text-[11.5px] font-semibold tabular-nums text-faint">{uniqueText || denominatorText}</span>
        ) : null}
        <span aria-hidden="true" className={`mt-1 h-2 w-full ${reason ? 'border border-dashed border-border-muted' : 'bg-track'}`}>
          {!reason && row.progress_pct !== null && row.target !== null ? (
            <span className={`block h-full ${ACCENT_BG[accent as keyof typeof ACCENT_BG] ?? 'bg-ink'}`} style={{ width: `${Math.max(0, Math.min(100, Number(row.progress_pct)))}%` }} />
          ) : null}
        </span>
      </span>
    </div>
  )
}

export function RmthDashboard() {
  const { t } = useTranslation(['rmth', 'indicators'])
  const names = useNames()
  const periodsQ = useReportingPeriods()
  const periods = periodsQ.data ?? []
  const periodCode = currentPeriodCode(periods)
  const rowsQ = useRmthProgress(periodCode)
  const statusQ = useRmthStatus()
  const uniqueQ = useRmthUnique(periodCode)

  const rows = rowsQ.data ?? []
  const statusOf = new Map((statusQ.data ?? []).map((s) => [s.code, s]))
  const uniqueOf = new Map((uniqueQ.data ?? []).map((u) => [u.code, Number(u.unique_actual)]))
  const failed = periodsQ.isError || rowsQ.isError || statusQ.isError
  const loading = periodsQ.isLoading || rowsQ.isLoading || statusQ.isLoading
  const blocked = rows.filter((r) => statusOf.get(r.code)?.reason === 'threshold_unset').length
  const noStatement = rows.filter((r) => statusOf.get(r.code)?.reason === 'no_statement').length

  const groups: { code: string; title: string; rows: RmthProgressRow[] }[] = []
  for (const r of rows) {
    let g = groups.find((x) => x.code === r.objective_code)
    if (!g) {
      g = { code: r.objective_code, title: names.objective(r), rows: [] }
      groups.push(g)
    }
    g.rows.push(r)
  }

  return (
    <div className="pb-16">
      <PageHead title={t('rmth:dashboard.title')} description={t('rmth:dashboard.intro')} />
      <AccentRule />
      {periodCode ? (
        <p className="mt-3 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t('indicators:showingPeriod', { code: periodCode })}
        </p>
      ) : null}

      {failed ? (
        <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
          <p className="m-0 text-[15px] font-semibold">{t('indicators:loadFailedTitle')}</p>
          <p className="mt-1 max-w-[60ch] text-[14px] text-body">{t('indicators:loadFailedBody')}</p>
        </div>
      ) : loading ? (
        <div aria-hidden="true" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="min-h-[170px] animate-pulse bg-track" />)}
          </div>
          <div className="mt-8 h-64 animate-pulse bg-track" />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {RMTH_KPI_CODES.map((code) => {
              const row = rows.find((r) => r.code === code)
              return row ? <KpiBlock key={code} row={row} status={statusOf.get(code)} /> : null
            })}
          </div>

          {/* Every target is null (0131): said once, at the top, not on each row. */}
          <p className="mt-5 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.5] text-body">{t('rmth:dashboard.targetsNotSet')}</p>
          {blocked > 0 ? (
            <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body">
              {t('rmth:dashboard.blockedNotice', { count: blocked })}
              <Link to="/rmth/thresholds" className="ms-2 underline">{t('rmth:dashboard.openItems')}</Link>
            </p>
          ) : null}
          {noStatement > 0 ? (
            <p className="mt-2 border-s-[3px] border-amber bg-sunken p-3 text-[14px] leading-[1.5] text-body">{t('rmth:dashboard.noStatementNotice')}</p>
          ) : null}

          {groups.map((g) => (
            <section key={g.code} className="mt-8">
              <SectionRule title={g.title} />
              <div className="mt-1 overflow-x-auto">
                <div className="min-w-[720px]">
                  {g.rows.map((r) => (
                    <Row key={r.code} row={r} status={statusOf.get(r.code)} unique={uniqueOf.get(r.code)} accent={OBJECTIVE_ACCENT[g.code] ?? 'ink'} />
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

export default RmthDashboard
