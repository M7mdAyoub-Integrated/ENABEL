import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInitiatives } from '../data/initiatives'
import { formatShortDate } from '../lib/format'
import { BidiIsolate } from '../components/BidiIsolate'
import { SEP } from '../ui/glyphs'

/**
 * Production initiatives, from the Municipality's side.
 *
 * The list exists so that mentorship sessions have a parent to hang off:
 * `mentorship_session.initiative_id` is NOT NULL. Before this screen an
 * initiative could only be created (by matching a linkage request) and never
 * opened again.
 *
 * The linkage marks are printed RAW — one chip per live linkage status. C1.2's
 * rule is "active or ended, distinct initiatives" and it lives in
 * `v_ind_c1_2`; deciding here which initiative "counts" would be a second copy
 * of that rule, free to drift from the one in the donor return.
 */
export function InitiativeList() {
  const { t, i18n } = useTranslation(['forms', 'nav'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = useInitiatives()
  const rows = q.data ?? []

  return (
    <div className="pb-16">
      <h1 className="mt-4 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]">
        {t('forms:initiative.listHeading')}
      </h1>
      <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-muted">
        {t('forms:initiative.listIntro')}
      </p>

      {q.isLoading ? (
        <ul className="mt-5 flex list-none flex-col gap-2 p-0" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-24 animate-pulse border-[1.5px] border-border-default bg-track"
            />
          ))}
        </ul>
      ) : q.isError ? (
        <p role="alert" className="mt-5 border-[1.5px] border-error p-4 text-[15px]">
          {t('forms:initiative.loadFailed')}
        </p>
      ) : rows.length === 0 ? (
        // No "create one" button. An initiative is created by matching a
        // linkage request or recording a direct linkage, and offering a second
        // creation path here would let one be made with no linkage behind it.
        <div className="mt-5 border-[1.5px] border-dashed border-border-muted p-6 text-center">
          <p className="m-0 text-[15px] text-muted">{t('forms:initiative.none')}</p>
          <Link
            to="/linkage-requests"
            className="mt-3 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('nav:linkageRequests')}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 flex list-none flex-col gap-2 p-0">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={`/initiatives/${r.id}`}
                className="block border-[1.5px] border-border-strong bg-bg p-4 text-ink no-underline hover:bg-sunken"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-border-strong px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                    {t(`forms:initiative.status.${r.status}`, {
                      defaultValue: r.status,
                    })}
                  </span>
                  {r.linkageStatuses.map((s, i) => (
                    <span
                      key={`${s}-${i}`}
                      className="border-[1.5px] border-dashed border-green px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-green"
                    >
                      {t(`forms:initiative.linkage.${s}`, { defaultValue: s })}
                    </span>
                  ))}
                  {r.mentorshipCount > 0 ? (
                    <span className="bg-green px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-bg">
                      {t('forms:initiative.sessionCount', { count: r.mentorshipCount })}
                    </span>
                  ) : null}
                </div>

                <h2
                  dir="auto"
                  className="mt-2 text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em]"
                >
                  {r.title}
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  <span dir="auto">{r.personName}</span>{' '}
                  {SEP} <BidiIsolate className="font-narrow tracking-wide">{r.nationalId}</BidiIsolate>
                  {r.startedOn ? (
                    <>
                      {' '}
                      {SEP} {formatShortDate(r.startedOn, locale)}
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default InitiativeList
