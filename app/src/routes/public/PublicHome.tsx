import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicOpportunities } from '../../data/publicOpportunities'
import { PublicShell } from './PublicShell'
import { OpportunityCard } from './OpportunityCard'
import { PrimaryButton } from '../../ui/primitives'
import { hasLinkageJourney, usePublicSite } from './PublicSite'

/**
 * The public home page.
 *
 * Reading order, for someone who arrived from a WhatsApp link and does not know
 * what this is:
 *
 *   1. What this is, in one sentence of plain language. Not "M&E platform",
 *      not "opportunities portal" -- free training courses and rural markets,
 *      for people who farm or make food.
 *   2. What is open, as cards, soonest first.
 *   3. Nothing else. No statistics, no indicators, no programme branding beyond
 *      the masthead. None of it helps them decide whether to apply.
 *
 * Single column at every width. It gets more comfortable as the screen grows,
 * it does not become a different layout -- a farmer on a 320px phone and a
 * coordinator on a laptop are reading the same thing for the same reason.
 *
 * One page, two programmes. The list is the municipality's own (the view is
 * filtered on the slug). The three sentences that describe the programme are
 * Sahel Horan's for Sahel Horan -- unchanged -- and a plainer set for any
 * other municipality, because "people who farm, keep livestock, or make and
 * sell food" is a description of one action plan, not of the platform. The
 * linkage panel is offered only where the journey exists.
 */
export function PublicHome() {
  const { t } = useTranslation('public')
  const site = usePublicSite()
  const shm = site.municipality.code === 'SHM'
  const q = usePublicOpportunities(site.slug)
  const items = q.data ?? []

  return (
    <PublicShell>
      <section className="pt-7 sm:pt-10">
        <h1
          className="text-[26px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[38px]"
          style={{ textWrap: 'balance' }}
        >
          {t(shm ? 'home.heading' : 'home.headingGeneric')}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.55] text-body sm:text-[16px]">
          {t(shm ? 'home.intro' : 'home.introGeneric')}
        </p>
      </section>

      <section className="mt-8 sm:mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-[3px] border-ink pb-2">
          <h2 className="m-0 text-[14px] font-extrabold uppercase tracking-[0.1em] sm:text-[15px]">
            {t('home.openNow')}
          </h2>
          {!q.isLoading && !q.isError ? (
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('home.count', { count: items.length })}
            </span>
          ) : null}
        </div>

        {q.isLoading ? (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="h-[150px] animate-pulse border-[1.5px] border-border-default bg-track" />
            ))}
          </ul>
        ) : q.isError ? (
          // No error codes, no "42501", no retry jargon. One sentence and a
          // button -- this reader cannot act on anything more technical.
          <div
            role="alert"
            className="mt-4 border-[1.5px] border-dashed border-error bg-sunken p-5 text-center"
          >
            <p className="m-0 text-[15px] text-body">{t('home.loadFailed')}</p>
            <div className="mt-4 flex justify-center">
              <PrimaryButton onClick={() => void q.refetch()}>{t('detail.back')}</PrimaryButton>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-4 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
            <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
              {t('home.emptyTitle')}
            </p>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-body">
              {t(shm ? 'home.emptyBody' : 'home.emptyBodyGeneric')}
            </p>
          </div>
        ) : (
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {items.map((o) => (
              <OpportunityCard key={o.id} o={o} />
            ))}
          </ul>
        )}
      </section>

      {/* Market linkage, which is not an opportunity and cannot be a card.
          A course or a market is a thing with dates that opens and closes;
          linkage is a standing offer to anyone who has finished an advisory,
          so it sits below the list with its condition stated rather than
          pretending to be another item in it. It stays visible when the list
          is empty -- that is exactly when someone still has a reason to be
          here. Only where the journey exists: see hasLinkageJourney. */}
      {hasLinkageJourney(site.municipality.code) ? (
        <section className="mt-8 border-[1.5px] border-ink p-5 sm:mt-10 sm:p-6">
          <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
            {t('home.linkageCta')}
          </h2>
          <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-body">
            {t('home.linkageCtaBody')}
          </p>
          <Link
            to={site.path('/linkage')}
            className="mt-4 inline-flex min-h-12 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
          >
            {t('home.linkageCtaAction')}
          </Link>
        </section>
      ) : null}

      {/* Last, and quieter than the rest. Someone arriving to apply should not
          have to step past a "check your existing application" panel to reach
          the thing they came for. */}
      <section className="mt-4 border-[1.5px] border-border-default p-5 sm:p-6">
        <h2 className="m-0 text-[17px] font-extrabold tracking-[-0.02em]">{t('home.mineCta')}</h2>
        <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-body">
          {t('home.mineCtaBody')}
        </p>
        <Link
          to={site.path('/my-applications')}
          className="mt-4 inline-flex min-h-12 items-center border-[1.5px] border-border-strong px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-ink no-underline hover:bg-sunken"
        >
          {t('home.mineCtaAction')}
        </Link>
      </section>

      {/* The other door. Someone sent a Sahel Horan link who lives in Ramtha
          has no other way to the right page than the address bar. */}
      <p className="mt-8 text-[13px] text-muted">
        <Link to="/" className="text-muted underline hover:text-ink">
          {t('home.otherMunicipality')}
        </Link>
      </p>
    </PublicShell>
  )
}

export default PublicHome
