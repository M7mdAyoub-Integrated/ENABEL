import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useManagedSessions, missingForPublish } from '../data/sessions'
import { formatDateRange } from '../lib/format'
import { SEP } from '../ui/glyphs'

/**
 * Training sessions, from the Municipality's side.
 *
 * The two flags are shown as separate, differently-shaped marks rather than a
 * pair of matching badges — PUBLIC is about the website, DELIVERED is about the
 * donor return, and a coordinator scanning this list should never have to work
 * out which is which. See the longer note in SessionDetail.
 */
export function SessionList() {
  const { t, i18n } = useTranslation('forms')
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = useManagedSessions()
  const rows = q.data ?? []

  return (
    <div className="pb-16">
      <h1 className="mt-4 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]">
        {t('session.listHeading')}
      </h1>
      <p className="mt-1 max-w-[60ch] text-[14px] text-muted">{t('session.listIntro')}</p>

      <Link
        to="/sessions/new"
        className="mt-4 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
      >
        {t('session.newSession')}
      </Link>

      {q.isLoading ? (
        <ul className="mt-5 flex list-none flex-col gap-2 p-0" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-24 animate-pulse border-[1.5px] border-border-default bg-track" />
          ))}
        </ul>
      ) : q.isError ? (
        <p role="alert" className="mt-5 border-[1.5px] border-error p-4 text-[15px]">
          {t('session.loadFailed')}
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-5 border-[1.5px] border-dashed border-border-muted p-6 text-center text-[15px] text-muted">
          {t('session.noSessions')}
        </p>
      ) : (
        <ul className="mt-5 flex list-none flex-col gap-2 p-0">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                to={`/sessions/${s.id}`}
                className="block border-[1.5px] border-border-strong bg-bg p-4 text-ink no-underline hover:bg-sunken"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Solid teal chip: it is on the public site right now. */}
                  {s.is_published ? (
                    <span className="bg-teal px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-bg">
                      {t('session.public')}
                    </span>
                  ) : (
                    <span className="border border-border-strong px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
                      {t('session.draft')}
                    </span>
                  )}
                  {/* Outlined, different shape and wording: it happened. */}
                  {s.is_delivered ? (
                    <span className="border-[1.5px] border-dashed border-ink px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink">
                      {t('session.delivered')}
                    </span>
                  ) : null}
                  {s.is_cancelled ? (
                    <span className="bg-error px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-bg">
                      {t('session.cancelled')}
                    </span>
                  ) : null}
                  {/* A direct statement about the row, not a guess about where
                      it came from -- see missingForPublish. */}
                  {missingForPublish(s).length > 0 ? (
                    <span className="border-[1.5px] border-dashed border-amber px-2 py-[2px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber">
                      {t('session.needsDetails')}
                    </span>
                  ) : null}
                </div>

                <h2
                  dir="auto"
                  className="mt-2 text-[18px] font-extrabold leading-[1.2] tracking-[-0.02em]"
                >
                  {s.title}
                </h2>
                <p className="mt-1 text-[13.5px] text-muted">
                  {formatDateRange(s.start_date, s.end_date, locale)}
                  {s.venue ? (
                    <span dir="auto">
                      {' '}
                      {SEP} {s.venue}
                    </span>
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

export default SessionList
