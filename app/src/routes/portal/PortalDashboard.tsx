import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePortalPerson, refLabel, useRefTable, useExhibitionOptions } from '../../hooks/useData'
import { makeTranslate } from '../../i18n/tx'
import { BidiIsolate } from '../../components/BidiIsolate'
import { PortalShell } from './PortalShell'
import { formatDateRange } from '../../lib/format'
import { SEP } from '../../ui/glyphs'

/**
 * The producer's own screen, copied from the prototype.
 *
 * A huge uppercase welcome on the teal ground, then white panels: the markets
 * they have registered for and how each one stands. Status is a solid chip, not
 * a tint -- "pending approval" has to be unmistakable on a cheap phone screen
 * in daylight.
 */
export function PortalDashboard() {
  const { t, i18n } = useTranslation(['portal', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { person, registrations } = usePortalPerson()
  const products = useRefTable('product')
  const exhibitions = useExhibitionOptions(makeTranslate(t), locale)

  const openCount = exhibitions.filter((e) => !e.disabled).length
  const anyPending = registrations.some((r) => r.status === 'submitted')
  const firstName = person.full_name.split(' ')[0] ?? person.full_name

  const chip = (status: string) =>
    status === 'submitted'
      ? { cls: 'bg-amber', key: 'submitted' }
      : status === 'rejected'
        ? { cls: 'bg-error', key: 'rejected' }
        : { cls: 'bg-success', key: 'approved' }

  return (
    <PortalShell>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-[70px] pt-9 sm:px-8 sm:pt-[52px]">
        <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.2em] opacity-75">
          {t('portal:yourRecord')}
        </div>
        <h1
          className="mt-3 text-[38px] font-black uppercase leading-[0.9] tracking-[-0.045em] sm:text-[52px]"
          style={{ textWrap: 'balance' }}
        >
          {t('portal:welcomeBack', { name: firstName })}
        </h1>
        <p className="mt-4 max-w-[520px] text-[17px] opacity-88">
          {anyPending ? t('portal:introPending') : t('portal:introCalm')}
        </p>

        <section className="mt-9 bg-bg px-6 py-[22px] text-ink">
          <div className="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-[7px]">
            <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em]">
              {t('portal:myRegistrations')}
            </h2>
            <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('portal:regCount', { count: registrations.length })}
            </span>
          </div>

          {registrations.length === 0 ? (
            <p className="mt-4 text-[15px] text-body">{t('portal:emptyBody')}</p>
          ) : (
            registrations.map((r, i) => {
              const c = chip(r.status)
              return (
                <article
                  key={r.id}
                  className={`mt-4 ${i > 0 ? 'border-t border-border-default pt-4' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[23px] font-extrabold leading-[1.15] tracking-[-0.028em]">
                        {r.exhibition.name}
                      </div>
                      <div className="mt-[7px] font-narrow text-[13px] font-bold uppercase tracking-[0.1em] text-amber">
                        <BidiIsolate>
                          {formatDateRange(r.exhibition.start_date, r.exhibition.end_date, locale)}
                        </BidiIsolate>{' '}
                        {SEP} {r.exhibition.location}
                      </div>
                    </div>
                    <span
                      className={`flex-none whitespace-nowrap px-[11px] py-1 font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-bg ${c.cls}`}
                    >
                      {t(`common:chips.status.${c.key}`)}
                    </span>
                  </div>
                  {r.productIds.length > 0 ? (
                    <div className="mt-[14px] flex flex-wrap gap-[7px]">
                      {r.productIds.slice(0, 3).map((id) => (
                        <span
                          key={id}
                          className="border-[1.5px] border-ink px-[11px] py-1 text-[13.5px] font-semibold"
                        >
                          {refLabel(
                            products.find((p) => p.id === id),
                            locale,
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </section>

        <Link
          to="/portal/register"
          className="mt-[26px] block w-full bg-ink px-6 py-6 text-center text-[22px] font-black uppercase tracking-[-0.02em] text-bg"
        >
          {t('portal:registerCta')}
        </Link>
        <p className="mt-3 text-center font-narrow text-[12px] font-semibold uppercase tracking-[0.1em] opacity-75">
          {t('portal:openNote', { count: openCount })}
        </p>
      </main>
    </PortalShell>
  )
}

export default PortalDashboard
