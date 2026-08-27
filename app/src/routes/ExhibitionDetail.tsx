import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useExhibition,
  useExhibitionRegistrations,
  useDecideRegistration,
  usePublishExhibition,
  missingForExhibitionPublish,
  durationDays,
  type RegistrationRow,
} from '../data/exhibitions'
import { formatDateRange } from '../lib/format'
import { ARROW_START, SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One market, from the Municipality's side.
 *
 *  Same shape as the training session screen, with three differences that are
 *  not cosmetic.
 *
 *  ── 1. CAPACITY IS REAL ──
 *
 *  trg_exhibition_registration_check refuses a registration once approved
 *  registrations reach booth_capacity, and refuses one for a market that has
 *  ended. The screen shows booths taken against capacity live, and stops
 *  offering approval at the limit -- offering what the database will refuse
 *  teaches people the system is unreliable.
 *
 *  ── 2. APPROVAL IS WHAT COUNTS ──
 *
 *  v_ind_e0_2 counts DISTINCT people with status = 'approved'. A registration
 *  at 'submitted' counts for nothing. So approving is not tidying a queue, it
 *  is the moment a donor figure changes, and the screen says so.
 *
 *  Note it counts PEOPLE: approving the same producer on a second market does
 *  not move E0.2 again.
 *
 *  ── 3. is_first_time IS DERIVED, NEVER ASKED ──
 *
 *  A trigger sets it from prior approved registrations. Displayed only.
 *
 *  ── AND ONE THING ABOUT PUBLISHING ──
 *
 *  v_public_opportunity filters `end_date >= current_date`. So publishing a
 *  market that has already ended puts it NOWHERE -- the button would succeed
 *  and nothing would appear, which reads as a bug. Past markets are not offered
 *  the control at all, and the reason is stated.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function StatusPill({ status }: { status: RegistrationRow['status'] }) {
  const { t } = useTranslation('forms')
  const tone =
    status === 'approved'
      ? 'bg-success text-bg'
      : status === 'rejected'
        ? 'bg-error text-bg'
        : 'bg-track text-ink'
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${tone}`}
    >
      {t(`exhibitionAdmin.status.${status}`)}
    </span>
  )
}

export function ExhibitionDetail() {
  const { id } = useParams()
  const { t, i18n } = useTranslation('forms')
  const locale = i18n.resolvedLanguage ?? 'en'

  const eq = useExhibition(id)
  const rq = useExhibitionRegistrations(id, locale)
  const decide = useDecideRegistration()
  const publish = usePublishExhibition()

  const e = eq.data
  const rows = rq.data ?? []

  if (eq.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-8 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-40 animate-pulse bg-track" />
      </div>
    )
  }
  if (eq.isError || !e) {
    return (
      <div role="alert" className="mt-6 border-[1.5px] border-error p-5">
        <p className="m-0 text-[15px]">{t('exhibitionAdmin.loadFailed')}</p>
      </div>
    )
  }

  const approved = rows.filter((r) => r.status === 'approved').length
  const pending = rows.filter((r) => r.status === 'submitted').length
  const full = approved >= e.boothCapacity
  const gaps = missingForExhibitionPublish(e)

  return (
    <div className="pb-16">
      <Link
        to="/forms/ex"
        className="mt-4 inline-flex min-h-11 items-center font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted no-underline hover:text-ink"
      >
        <span aria-hidden="true" className="inline-block mirror-rtl">
          {ARROW_START}
        </span>
        <span className="ms-2">{t('exhibitionAdmin.backToList')}</span>
      </Link>

      <h1
        dir="auto"
        className="mt-1 text-[24px] font-black uppercase leading-[1.08] tracking-[-0.03em] sm:text-[30px]"
      >
        {e.name}
      </h1>
      <p className="mt-1 text-[14px] text-muted">
        {formatDateRange(e.startDate, e.endDate, locale)} {SEP}{' '}
        {t('exhibitionAdmin.days', { count: durationDays(e.startDate, e.endDate) })}
        {e.location ? (
          <span dir="auto">
            {' '}
            {SEP} {e.location}
          </span>
        ) : null}
      </p>

      {/* ── booths, live ───────────────────────────────────────────────── */}
      <section className="mt-5 border-[1.5px] border-ink p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('exhibitionAdmin.booths')}
          </h2>
          <span className="text-[15px] font-semibold tabular-nums text-ink">
            {t('exhibitionAdmin.boothsTaken', { taken: approved, capacity: e.boothCapacity })}
          </span>
        </div>
        <div className="mt-2 h-3 bg-track">
          <div
            className={full ? 'h-full bg-error' : 'h-full bg-amber'}
            style={{ width: `${Math.min(100, (approved / Math.max(1, e.boothCapacity)) * 100)}%` }}
          />
        </div>
        {full ? (
          <p className="mt-2 text-[14px] font-semibold text-error">
            {t('exhibitionAdmin.atCapacity')}
          </p>
        ) : null}
      </section>

      {/* ── the public site ────────────────────────────────────────────── */}
      <section className="mt-4 border-[1.5px] border-amber bg-sunken p-4">
        <h2 className="m-0 font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-amber">
          {t('exhibitionAdmin.publicHeading')}
        </h2>

        {e.hasEnded ? (
          // Publishing an ended market puts it nowhere: v_public_opportunity
          // only lists what is still to come. A control that succeeds and
          // changes nothing visible is worse than no control.
          <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-body">
            {t('exhibitionAdmin.endedNoPublish')}
          </p>
        ) : (
          <>
            <p className="mt-1 max-w-[62ch] text-[14px] leading-[1.5] text-body">
              {e.isPublished
                ? t('exhibitionAdmin.publishedBody')
                : t('exhibitionAdmin.notPublishedBody')}
            </p>
            {gaps.length > 0 ? (
              <div className="mt-2">
                <p className="m-0 text-[14px] font-semibold text-ink">
                  {t('exhibitionAdmin.cannotPublishYet')}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 ps-5 text-[14px] text-body">
                  {gaps.map((g) => (
                    <li key={g}>{t(`exhibitionAdmin.missing.${g}`)}</li>
                  ))}
                </ul>
                <Link
                  to={`/forms/ex/${e.id}/edit`}
                  className="mt-2 inline-flex min-h-11 items-center bg-ink px-4 font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
                >
                  {t('exhibitionAdmin.fillInDetails')}
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={publish.isPending || e.isCancelled}
                onClick={() => publish.mutate({ id: e.id, on: !e.isPublished })}
                className={`mt-3 inline-flex min-h-11 items-center justify-center px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] disabled:bg-track disabled:text-faint ${
                  e.isPublished ? 'border-[1.5px] border-border-strong text-ink' : 'bg-amber text-bg'
                }`}
              >
                {e.isPublished
                  ? t('exhibitionAdmin.unpublish')
                  : t('exhibitionAdmin.publish')}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── registrations ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-[3px] border-ink pb-2">
          <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em]">
            {t('exhibitionAdmin.registrations')}
          </h2>
          <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('exhibitionAdmin.pendingCount', { count: pending })}
          </span>
        </div>

        <p className="mt-2 max-w-[70ch] text-[13px] leading-[1.5] text-muted">
          {t('exhibitionAdmin.approvalNote')}
        </p>

        {decide.isError ? (
          <p role="alert" className="mt-3 border-[1.5px] border-error p-3 text-[14px] font-semibold text-error">
            {t('exhibitionAdmin.decisionRefused')}
          </p>
        ) : null}

        {rq.isLoading ? (
          <div aria-hidden="true" className="mt-4 h-32 animate-pulse bg-track" />
        ) : rows.length === 0 ? (
          <p className="mt-4 border-[1.5px] border-dashed border-border-muted p-5 text-center text-[15px] text-muted">
            {t('exhibitionAdmin.noRegistrations')}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b-[1.5px] border-ink">
                  <th className="py-2 pe-3 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('exhibitionAdmin.colProducer')}
                  </th>
                  <th className="py-2 pe-3 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
                    {t('exhibitionAdmin.colSells')}
                  </th>
                  <th className="py-2 text-start font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                    {t('exhibitionAdmin.colDecision')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border-default align-top">
                    <td className="py-3 pe-3">
                      <div dir="auto" className="font-semibold text-ink">
                        {r.fullName}
                      </div>
                      <div dir="ltr" className="text-[12px] text-muted">
                        {r.nationalId}
                      </div>
                      {/* Derived by a trigger from prior approved registrations,
                          never asked. */}
                      {r.isFirstTime ? (
                        <span className="mt-1 inline-block border border-border-strong px-1.5 py-[1px] font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
                          {t('exhibitionAdmin.firstTime')}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pe-3">
                      <div dir="auto" className="text-[13.5px] text-ink">
                        {r.producerType ?? '—'}
                      </div>
                      {r.products.length > 0 ? (
                        <div dir="auto" className="mt-0.5 text-[12.5px] text-muted">
                          {r.products.join(', ')}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3">
                      <StatusPill status={r.status} />
                      {r.status === 'submitted' ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={decide.isPending || full}
                            title={full ? t('exhibitionAdmin.atCapacity') : undefined}
                            onClick={() =>
                              decide.mutate({ id: r.id, exhibitionId: e.id, status: 'approved' })
                            }
                            className="min-h-9 bg-ink px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
                          >
                            {t('exhibitionAdmin.approve')}
                          </button>
                          <button
                            type="button"
                            disabled={decide.isPending}
                            onClick={() =>
                              decide.mutate({ id: r.id, exhibitionId: e.id, status: 'rejected' })
                            }
                            className="min-h-9 border-[1.5px] border-border-strong px-2.5 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink"
                          >
                            {t('exhibitionAdmin.reject')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={decide.isPending}
                          onClick={() =>
                            decide.mutate({ id: r.id, exhibitionId: e.id, status: 'submitted' })
                          }
                          className="mt-1 block text-[12px] text-muted underline hover:text-ink"
                        >
                          {t('exhibitionAdmin.undoDecision')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default ExhibitionDetail
