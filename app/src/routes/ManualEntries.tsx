import { useTranslation } from 'react-i18next'
import { useManualIndicators, useManualValues, useMutations } from '../hooks/useData'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { AccentRule, OutlinePill, PageHead } from '../ui/primitives'
import { useToast } from '../ui/Toast'

/**
 * The eight indicators with no data-collection form, copied from the prototype.
 *
 * Two columns of bordered cards. Each carries the code and target, the
 * indicator name, one input (a number, or Yes/No for a milestone), the figure
 * currently on record, a dashed evidence strip and a save action.
 *
 * The evidence strip is deliberately loud: a figure typed by hand with nothing
 * attached cannot be traced back to anything, and that is the whole reason this
 * screen exists.
 */
export function ManualEntries() {
  const { t } = useTranslation(['indicators', 'common'])
  const rows = useManualIndicators()
  const values = useManualValues()
  const mutations = useMutations()
  const toast = useToast()
  const { role } = useAuth()
  const writable = can(role, 'manual.write')

  return (
    <>
      <PageHead
        chips={
          <>
            <OutlinePill tone="amber">{t('indicators:noSourceForm')}</OutlinePill>
            <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('indicators:indicatorCount', { count: rows.length })}
            </span>
          </>
        }
        title={t('indicators:manualEntries')}
        description={t('indicators:manualBody')}
      />
      <AccentRule className="bg-amber" />

      <div className="mt-[22px] grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((row) => {
          const value = values[row.code] ?? ''
          return (
            <section key={row.code} className="border-[1.5px] border-ink px-5 pb-5 pt-[18px]">
              <div className="flex items-baseline justify-between gap-[14px]">
                <span className="text-[19px] font-black tracking-[-0.03em] tabular-nums">
                  {row.code}
                </span>
                <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
                  {t('indicators:targetIs', { target: row.target })}
                </span>
              </div>

              <div
                className="mt-1.5 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em]"
                style={{ textWrap: 'pretty' }}
              >
                {t(`indicators:name.${row.code}`)}
              </div>

              <div className="mt-4 flex items-end gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {row.isBool ? t('indicators:milestoneReached') : t('indicators:thisQuarter')}
                  </div>

                  {row.isBool ? (
                    <div
                      role="radiogroup"
                      aria-label={t('indicators:milestoneReached')}
                      className="flex border-[1.5px] border-ink"
                    >
                      {['yes', 'no'].map((opt, i) => (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={value === opt}
                          disabled={!writable}
                          onClick={() => mutations.setManualValue(row.code, opt)}
                          className={`min-h-11 flex-1 cursor-pointer px-1.5 py-2.5 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-60 ${
                            i > 0 ? 'border-s-[1.5px] border-ink' : ''
                          } ${value === opt ? 'bg-amber text-bg' : 'bg-input text-ink'}`}
                        >
                          {t(`common:${opt}`)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="number"
                      value={value}
                      disabled={!writable}
                      placeholder={t('indicators:zeroPlaceholder')}
                      onChange={(e) => mutations.setManualValue(row.code, e.target.value)}
                      aria-label={t('indicators:thisQuarter')}
                      className="min-h-11 w-full border-[1.5px] border-ink bg-input px-[13px] py-2.5 text-[16px] font-bold text-ink"
                    />
                  )}
                </div>

                <div className="flex-none text-end">
                  <div className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t('indicators:onRecordLabel')}
                  </div>
                  <div className="text-[24px] font-black leading-[1.1] tracking-[-0.03em] tabular-nums">
                    {row.current}
                  </div>
                </div>
              </div>

              <div className="mt-[14px] flex items-center justify-between gap-3 border-[1.5px] border-dashed border-border-muted bg-sunken px-[13px] py-[11px]">
                <span className="font-narrow text-[11.5px] font-semibold uppercase tracking-[0.08em] text-faint">
                  {t(`indicators:evidence.${row.isBool ? 'milestone' : 'count'}`)}
                </span>
                <button
                  type="button"
                  disabled={!writable}
                  aria-label={t('indicators:attachEvidence')}
                  className="cursor-pointer font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ghost hover:text-ink disabled:cursor-not-allowed"
                >
                  {t('indicators:attach')}
                </button>
              </div>

              <button
                type="button"
                disabled={!writable}
                onClick={() =>
                  toast.fire({
                    tag: t('common:toast.saved'),
                    title: t('indicators:entrySaved', { code: row.code }),
                    sub: t('indicators:exportSub'),
                  })
                }
                className="mt-[14px] w-full cursor-pointer bg-ink px-4 py-[11px] font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('indicators:saveEntry')}
              </button>
            </section>
          )
        })}
      </div>
    </>
  )
}

export default ManualEntries
