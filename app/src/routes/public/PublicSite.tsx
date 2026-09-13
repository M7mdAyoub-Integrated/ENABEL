import { createContext, useContext } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePublicMunicipalities, type PublicMunicipality } from '../../data/publicMunicipalities'
import { useMunicipalityName, useProgrammeLine } from '../../data/municipalities'
import { PublicShell } from './PublicShell'
import { PrimaryButton } from '../../ui/primitives'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One public site per municipality, under a path prefix.
 *
 *    /sahel-horan                  Sahel Horan's public home
 *    /sahel-horan/opportunity/:id
 *    /sahel-horan/apply/:id
 *    /ramtha                       Ramtha's
 *
 *  A path prefix rather than a subdomain: one link on a poster, no DNS, and
 *  the URL itself says whose page it is (plan §3.1). The prefix is the slug of
 *  a row in `municipality`, read through `v_public_municipality`, so a slug
 *  that is not an active municipality is not a page -- not a Sahel Horan page
 *  with a different address bar, and not a blank one.
 *
 *  Everything under the prefix reads the municipality from this context and
 *  passes its slug to every RPC. Identity is shared between the two
 *  programmes (one `person` table); history is not, and the database scopes
 *  it on the slug (0120). The pages pass the slug; they never filter.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type PublicSiteContext = {
  slug: string
  municipality: PublicMunicipality
  /** A path under this municipality's public site: `path('/apply/x')` → `/ramtha/apply/x`, `path()` → `/ramtha`. */
  path: (sub?: string) => string
}

const Ctx = createContext<PublicSiteContext | null>(null)

/** The municipality whose public site this page is part of. Throws outside one. */
export function usePublicSite(): PublicSiteContext {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePublicSite outside a /:slug route')
  return v
}

/** Same, for the shell -- which also frames the chooser and the not-found page, where there is none. */
export function usePublicSiteOptional(): PublicSiteContext | null {
  return useContext(Ctx)
}

/**
 * Which public journeys a programme runs.
 *
 * The market-linkage request is Sahel Horan's: C1.2, a producer who has
 * completed a market advisory asks to be connected with a buyer. Ramtha's
 * forms have no public journey of their own -- its residents are recorded by
 * staff at events, in training cycles and in incubators -- so its public page
 * lists what its staff publish and lets a person check an application, and
 * nothing more. `request_linkage` answers `ineligible` on a Ramtha page
 * regardless (0120); this only decides whether the page is offered.
 */
export function hasLinkageJourney(code: string): boolean {
  return code === 'SHM'
}

/**
 * The plain-language programme line under the municipality's name on the
 * public masthead. Sahel Horan's public page has always read "Agriculture and
 * Food Production Programme" rather than the Action Plan's full donor line,
 * because a farmer is reading it; Ramtha's is its plan's own description. A
 * third municipality reads its row's programme line until someone writes it
 * copy.
 */
export function usePublicProgrammeLine() {
  const { t } = useTranslation('public')
  const programme = useProgrammeLine()
  return (m: PublicMunicipality): string => {
    if (m.code === 'SHM') return t('programmeSHM')
    if (m.code === 'RMTH') return t('programmeRMTH')
    return programme(m)
  }
}

/**
 * The public site's own not-found page. No sidebar, no sign-in redirect: a
 * visitor who mistyped a poster's link is told so and offered the list.
 */
export function PublicNotFound() {
  const { t } = useTranslation('public')
  return (
    <PublicShell>
      <div className="mt-8 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
        <p className="m-0 text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
          {t('notFound.title')}
        </p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-[1.55] text-body">
          {t('notFound.body')}
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-11 items-center bg-ink px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
        >
          {t('notFound.action')}
        </Link>
      </div>
    </PublicShell>
  )
}

/** The layout route for `/:slug`. Resolves the slug or renders the not-found page. */
export function PublicSite() {
  const { slug } = useParams()
  const { t } = useTranslation('public')
  const q = usePublicMunicipalities()

  if (q.isLoading) {
    return (
      <PublicShell>
        <div aria-hidden="true" className="pt-7">
          <div className="h-10 w-3/4 animate-pulse bg-track" />
          <div className="mt-4 h-6 w-1/2 animate-pulse bg-track" />
          <div className="mt-8 h-40 animate-pulse bg-track" />
        </div>
      </PublicShell>
    )
  }

  if (q.isError) {
    return (
      <PublicShell>
        <div role="alert" className="mt-8 border-[1.5px] border-dashed border-error bg-sunken p-5 text-center">
          <p className="m-0 text-[15px] text-body">{t('home.loadFailed')}</p>
          <div className="mt-4 flex justify-center">
            <PrimaryButton onClick={() => void q.refetch()}>{t('apply.tryAgain')}</PrimaryButton>
          </div>
        </div>
      </PublicShell>
    )
  }

  const municipality = slug ? q.data?.find((m) => m.slug === slug) : undefined
  if (!slug || !municipality) return <PublicNotFound />

  const site: PublicSiteContext = {
    slug,
    municipality,
    path: (sub = '') => `/${slug}${sub}`,
  }
  return (
    <Ctx.Provider value={site}>
      <Outlet />
    </Ctx.Provider>
  )
}

/**
 * `/` -- the front door, which now has two doors behind it.
 *
 * Lists the active municipalities and sends the visitor to one. When only
 * one is active there is nothing to choose, so it redirects (plan §3.1).
 */
export function PublicChooser() {
  const { t } = useTranslation('public')
  const q = usePublicMunicipalities()
  const name = useMunicipalityName()
  const programme = usePublicProgrammeLine()

  if (q.isLoading) {
    return (
      <PublicShell>
        <div aria-hidden="true" className="pt-7">
          <div className="h-10 w-3/4 animate-pulse bg-track" />
          <div className="mt-6 h-24 animate-pulse bg-track" />
          <div className="mt-3 h-24 animate-pulse bg-track" />
        </div>
      </PublicShell>
    )
  }

  if (q.isError || !q.data) {
    return (
      <PublicShell>
        <div role="alert" className="mt-8 border-[1.5px] border-dashed border-error bg-sunken p-5 text-center">
          <p className="m-0 text-[15px] text-body">{t('chooser.loadFailed')}</p>
          <div className="mt-4 flex justify-center">
            <PrimaryButton onClick={() => void q.refetch()}>{t('apply.tryAgain')}</PrimaryButton>
          </div>
        </div>
      </PublicShell>
    )
  }

  const items = q.data
  if (items.length === 1) return <Navigate to={`/${items[0]!.slug}`} replace />

  return (
    <PublicShell>
      <section className="pt-7 sm:pt-10">
        <h1
          className="text-[26px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[38px]"
          style={{ textWrap: 'balance' }}
        >
          {t('chooser.heading')}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.55] text-body sm:text-[16px]">
          {t('chooser.intro')}
        </p>
      </section>

      {items.length === 0 ? (
        <div className="mt-8 border-[1.5px] border-dashed border-border-muted bg-sunken p-6 text-center sm:p-8">
          <p className="m-0 text-[15px] leading-[1.55] text-body">{t('chooser.empty')}</p>
        </div>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-3 p-0">
          {items.map((m) => (
            <li key={m.slug}>
              <Link
                to={`/${m.slug}`}
                className="block border-[1.5px] border-ink p-5 text-ink no-underline hover:bg-sunken sm:p-6"
              >
                <span className="block text-[19px] font-extrabold tracking-[-0.02em] sm:text-[22px]">
                  {name(m)}
                </span>
                <span className="mt-1 block text-[14px] leading-[1.5] text-muted">{programme(m)}</span>
                <span className="mt-3 inline-block font-narrow text-[12px] font-bold uppercase tracking-[0.14em]">
                  {t('chooser.open')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicShell>
  )
}
