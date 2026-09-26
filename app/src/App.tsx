import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { ToastProvider } from './ui/Toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { queryClient } from './data/queryClient'
import { DEMO_MODE } from './demo/demoMode'
import { useQueueSync } from './data/useOffline'
import { useDirection } from './hooks/useDirection'
import { MunicipalityGate, RequireCapability, RequireModule, RequireSession } from './auth/guards'
import { RETIRED_MODULE_IDS } from './modules'
import Landing from './routes/Landing'
import { ActingMunicipalityUrl } from './components/ActingMunicipalityUrl'
import ListScreen from './routes/ListScreen'
import FormScreen from './routes/FormScreen'
import DetailScreen from './routes/DetailScreen'
import ManualEntries from './routes/ManualEntries'
import { PlatformRoute } from './layout/PlatformRoute'
import { RMTH_FORM_IDS } from './rmth/forms.generated'
import { RequireRamtha } from './rmth/RequireRamtha'
import { RmthListScreen } from './rmth/RmthListScreen'
import { RmthFormScreen } from './rmth/RmthFormScreen'
import { RmthDetailScreen } from './rmth/RmthDetailScreen'
import { RmthThresholds } from './rmth/RmthThresholds'
import { RequireKhalidiyah } from './khld/RequireKhalidiyah'
import { KhldListScreen } from './khld/KhldListScreen'
import { KhldFormScreen } from './khld/KhldFormScreen'
import { KhldDetailScreen } from './khld/KhldDetailScreen'
import { KHLD_FORM_IDS } from './khld/forms.generated'
import Dashboard from './routes/Dashboard'
import NotFound from './routes/NotFound'
import PublicHome from './routes/public/PublicHome'
import { PublicChooser, PublicNotFound, PublicSite } from './routes/public/PublicSite'
import { LegacyPublicRedirect } from './routes/public/LegacyPublicRedirect'
import ApplyForm from './routes/public/ApplyForm'
import LinkageRequest from './routes/public/LinkageRequest'
import MyApplications from './routes/public/MyApplications'
import VolunteerRegister from './routes/public/VolunteerRegister'
import LinkageQueue from './routes/LinkageQueue'
import LinkageDirect from './routes/LinkageDirect'
import FollowupList from './routes/FollowupList'
import FollowupStart from './routes/FollowupStart'
import FollowupDetail from './routes/FollowupDetail'
import FollowupSectionA from './routes/FollowupSectionA'
import FollowupSectionB from './routes/FollowupSectionB'
import FollowupSectionC from './routes/FollowupSectionC'
import FollowupSectionD from './routes/FollowupSectionD'
import FollowupSectionE from './routes/FollowupSectionE'
import LinkageMatch from './routes/LinkageMatch'
import InitiativeList from './routes/InitiativeList'
import InitiativeDetail from './routes/InitiativeDetail'
import SessionList from './routes/SessionList'
import SessionNew from './routes/SessionNew'
import ExhibitionDetail from './routes/ExhibitionDetail'
import SessionDetail from './routes/SessionDetail'
import OpportunityDetail from './routes/public/OpportunityDetail'
import SignIn from './routes/auth/SignIn'
import ForgotPassword from './routes/auth/ForgotPassword'
import ResetPassword from './routes/auth/ResetPassword'

/**
 * Municipal screens.
 *
 * Demo mode drops the capability check -- there are no roles in the UI, so
 * there is nothing to check against. The guard component itself is untouched
 * and comes straight back when DEMO_MODE is false. See src/demo/demoMode.ts.
 */
function ShellLayout() {
  const { municipalityId } = useAuth()
  const inner = (
    <Shell>
      <ActingMunicipalityUrl />
      <MunicipalityGate>
        {/* Keyed on the acting municipality, so a switch REMOUNTS the screen
            and every query it holds is asked again under the new one.
            setActingMunicipality clears the query cache, but a mounted
            screen that reads no auth context never re-renders, and its
            observer keeps the answer it already had -- /manual-entries
            opened with ?m=sahel-horan while the database still said Ramtha
            showed no milestones at all, from a query RLS had answered for
            Ramtha. The old switcher hid this by always navigating to
            /dashboard; a switch made by the URL happens in place. */}
        <Outlet key={municipalityId ?? 'none'} />
      </MunicipalityGate>
    </Shell>
  )
  // Demo mode drops the capability check but still waits for the silent
  // sign-in, or the first queries go out unauthenticated. See RequireSession.
  if (DEMO_MODE) return <RequireSession>{inner}</RequireSession>
  return <RequireCapability capability="app.access">{inner}</RequireCapability>
}

/** Wraps a route in a guard, or passes it through untouched in demo mode. */
function guard(node: React.ReactElement, wrap: (n: React.ReactElement) => React.ReactElement) {
  // In demo mode the role guard goes, but the session wait stays.
  return DEMO_MODE ? <RequireSession>{node}</RequireSession> : wrap(node)
}

/**
 * Routing.
 *
 * Only `/signin`, `/forgot` and `/reset` are reachable without a session.
 * Everything else sits behind a guard, and each guard renders the sign-in
 * redirect itself rather than relying on a link being hidden.
 *
 * The participant portal is a SEPARATE layout with no sidebar -- 05 section 1
 * gives a participant their own record and registrations and nothing else, so
 * municipal navigation would be misleading as well as useless.
 */
/**
 * The unauthenticated routes, in every mode.
 *
 * Demo mode used to replace them with redirects to `/`, which together with
 * the silent sign-in meant a signed-out developer had no way to choose an
 * account: /signin bounced to the public home and /admin to whichever
 * dashboard the demo account implied. The screens are routed regardless of
 * the mode now, and the provider never signs in silently on them.
 */
const authRoutes = [
  { path: '/signin', element: <SignIn /> },
  { path: '/forgot', element: <ForgotPassword /> },
  { path: '/reset', element: <ResetPassword /> },
]

const router = createBrowserRouter([
  ...authRoutes,

  // ── The public site ──────────────────────────────────────────────────────
  // No session, no guard, no Shell. The front door belongs to the public: this
  // is a programme about participation. Municipal screens keep their own
  // paths below.
  //
  // One public site PER MUNICIPALITY, under a path prefix (plan §3.1):
  // /sahel-horan, /ramtha. `/` is the chooser, which redirects when only one
  // municipality is active. PublicSite resolves the slug against
  // v_public_municipality and renders the not-found page for anything else --
  // so a mistyped single-segment path lands on the public 404 rather than on
  // the staff sign-in, which is the right answer for a visitor.
  //
  // These must stay OUTSIDE RequireSession. They read the public views, which
  // anon is granted, and a farmer has no account to wait for.
  { path: '/', element: <PublicChooser /> },
  {
    path: '/:slug',
    element: <PublicSite />,
    children: [
      { index: true, element: <PublicHome /> },
      { path: 'opportunity/:id', element: <OpportunityDetail /> },
      { path: 'apply/:id', element: <ApplyForm /> },
      // Linkage has no opportunity to hang off -- it is not something the
      // Municipality publishes and people apply to, it is a standing offer to
      // anyone who has finished an advisory. So it is a page, not an
      // apply/:id. Only where the journey exists; see hasLinkageJourney.
      { path: 'linkage', element: <LinkageRequest /> },
      // No session, by design: someone who applied through the public site
      // has no account to sign in to. Identity is the same national ID plus
      // date of birth check as everywhere else, in its own RPC. See 0070.
      { path: 'my-applications', element: <MyApplications /> },
      // Khalidiyah's FORM-12, filled in by the volunteer (0161). Only where
      // the journey exists; see hasVolunteerJourney.
      { path: 'volunteer', element: <VolunteerRegister /> },
      { path: '*', element: <PublicNotFound /> },
    ],
  },
  // The paths the public site had before 0120, kept for every poster and
  // WhatsApp link that carries one. All of them predate Ramtha, so all of
  // them are Sahel Horan's.
  { path: '/opportunity/:id', element: <LegacyPublicRedirect to="opportunity" /> },
  { path: '/apply/:id', element: <LegacyPublicRedirect to="apply" /> },
  { path: '/linkage', element: <LegacyPublicRedirect to="linkage" /> },
  { path: '/my-applications', element: <LegacyPublicRedirect to="my-applications" /> },

  // Where staff used to land. Kept so an existing bookmark still works.
  { path: '/home', element: <Landing /> },
  // The staff entrance. `/` is the public home page and says nothing about
  // accounts, so this is the address a coordinator types. It is the sign-in
  // screen itself: signed out, the form; signed in, who that is, with
  // "continue" and "someone else" -- never a silent redirect, which is what
  // hid the demo sign-in firing here.
  { path: '/admin', element: <SignIn /> },

  // THE PARTICIPANT PORTAL IS RETIRED. `/` is a global home page now, so there
  // is no tailored personal page and no account to sign in to. PortalDashboard,
  // PortalRegister and PortalShell stay on disk, dormant and unimported, the
  // same treatment the auth screens get -- restoring them is adding the routes
  // back. See src/demo/demoMode.ts.

  {
    element: <ShellLayout />,
    children: [
      // One URL, one screen: Dashboard reads the acting municipality (0117)
      // and renders that programme's framework -- Sahel Horan's twenty rows
      // or Ramtha's eighteen -- from the same components. Which programme is
      // never decided by the URL, the same rule as the sidebar.
      {
        path: '/dashboard',
        element: guard(<Dashboard />, (n) => (
          <RequireCapability capability="dashboard.view">{n}</RequireCapability>
        )),
      },
      // rg, ln, tp and pp are retired. A link removed from the sidebar is still
      // a live URL in someone's bookmarks, so they redirect to the screen that
      // actually does the work rather than 404.
      //
      // tp and pp go to the merged Partners LIST rather than to a record,
      // because their `:id` was a PARTNERSHIP and `/forms/pn/:id` is a PARTNER.
      // Carrying the id across would open the wrong organisation, or none.
      //
      // Each concrete shape is spelled out rather than using `/forms/rg/*`. A
      // splat scores LOWER than a route ending in a static segment, so
      // `/forms/:module/new` beat `/forms/rg/*` and the retired form kept
      // rendering. Verified by following the URL, not by reading the config.
      ...RETIRED_MODULE_IDS.flatMap((m) => {
        const to =
          m === 'rg'
            ? '/forms/ex'
            : m === 'ln'
              ? '/linkage-requests'
              : m === 'fu'
                ? '/followups'
                : '/forms/pn'
        return [`/forms/${m}`, `/forms/${m}/new`, `/forms/${m}/:id`, `/forms/${m}/:id/edit`].map(
          (path) => ({ path, element: <Navigate to={to} replace /> }),
        )
      }),
      {
        path: '/forms/:module',
        element: guard(<ListScreen />, (n) => <RequireModule>{n}</RequireModule>),
      },
      {
        path: '/forms/:module/new',
        element: guard(<FormScreen mode="new" />, (n) => (
          <RequireModule>
            <RequireCapability capability="record.create">{n}</RequireCapability>
          </RequireModule>
        )),
      },
      {
        path: '/forms/:module/:id',
        element: guard(<DetailScreen />, (n) => <RequireModule>{n}</RequireModule>),
      },
      {
        path: '/forms/:module/:id/edit',
        element: guard(<FormScreen mode="edit" />, (n) => (
          <RequireModule>
            <RequireCapability capability="record.edit">{n}</RequireCapability>
          </RequireModule>
        )),
      },
      // Municipality side of the public flow: publish an opportunity, then
      // decide who took part. Kept out of /forms/:module because a participant
      // list is a different shape from the seven record forms.
      // The market equivalent of /sessions/:id -- publishing and the
      // registration decisions, which are a different shape from the generic
      // record detail screen.
      {
        path: '/exhibitions/:id',
        element: guard(<ExhibitionDetail />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      // Advisory reuses the session screens with kind="advisory": one publish
      // gate, one completion decision, one set of rules. See data/sessions.ts.
      {
        path: '/advisory',
        element: guard(<SessionList kind="advisory" />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/advisory/new',
        element: guard(<SessionNew kind="advisory" />, (n) => (
          <RequireCapability capability="record.create">{n}</RequireCapability>
        )),
      },
      {
        path: '/advisory/:id/edit',
        element: guard(<SessionNew mode="edit" kind="advisory" />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/advisory/:id',
        element: guard(<SessionDetail kind="advisory" />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      // The municipal end of the public linkage request. Matching creates a
      // production_initiative and a market_linkage together, which is why it
      // is not part of the generic /forms/ln editor.
      {
        path: '/linkage-requests',
        element: guard(<LinkageQueue />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      // A linkage brokered in person, with no public request behind it. Before
      // 0073 the website was the only way into C1.2.
      {
        path: '/linkage-requests/new',
        element: guard(<LinkageDirect />, (n) => (
          <RequireCapability capability="record.create">{n}</RequireCapability>
        )),
      },
      {
        path: '/linkage-requests/:id',
        element: guard(<LinkageMatch />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      // Production initiatives. They existed in the database from 0009 and
      // could be CREATED by matching a linkage request, but never opened
      // again -- so C1.3, whose rows hang off one, had nowhere to be entered.
      // There is no /initiatives/new: an initiative comes from a linkage, and
      // a second creation path would let one exist with no linkage behind it.
      {
        path: '/initiatives',
        element: guard(<InitiativeList />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/initiatives/:id',
        element: guard(<InitiativeDetail />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/sessions/new',
        element: guard(<SessionNew />, (n) => (
          <RequireCapability capability="record.create">{n}</RequireCapability>
        )),
      },
      {
        path: '/sessions',
        element: guard(<SessionList />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/sessions/:id/edit',
        element: guard(<SessionNew mode="edit" />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/sessions/:id',
        element: guard(<SessionDetail />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      // The follow-up survey. Its own screens rather than the generic form
      // wizard: an enumerator uses this standing in a field on a phone, and the
      // module shell is built for someone at a desk.
      {
        path: '/followups',
        element: guard(<FollowupList />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/new',
        element: guard(<FollowupStart />, (n) => (
          <RequireCapability capability="record.create">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id/a',
        element: guard(<FollowupSectionA />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id/b',
        element: guard(<FollowupSectionB />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id/c',
        element: guard(<FollowupSectionC />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id/d',
        element: guard(<FollowupSectionD />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id/e',
        element: guard(<FollowupSectionE />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/followups/:id',
        element: guard(<FollowupDetail />, (n) => (
          <RequireCapability capability="record.edit">{n}</RequireCapability>
        )),
      },
      {
        path: '/manual-entries',
        element: guard(<ManualEntries />, (n) => (
          <RequireCapability capability="manual.view">{n}</RequireCapability>
        )),
      },
      // Staff accounts. Super admin only; the guard renders the refusal for
      // everyone else, and the database refuses the writes regardless. Not a
      // page: the address opens the platform panel at its Accounts tab over
      // the role's home (layout/PlatformRoute.tsx).
      {
        path: '/accounts',
        element: guard(<PlatformRoute section="accounts" />, (n) => (
          <RequireCapability capability="accounts.manage">{n}</RequireCapability>
        )),
      },

      // ── Ramtha's seventeen forms ──────────────────────────────────────────
      //
      // One set of routes for all seventeen: `:form` is the form id and the
      // screens read their structure from RMTH_FORMS. RequireRamtha refuses an
      // id that is not one of the seventeen (a 404, not an empty screen) and
      // refuses an account whose municipality is not Ramtha, saying why --
      // RLS would answer an empty list, which looks like a bug.
      //
      // The municipality comes from the account, never from the URL (plan
      // §3.4), so there is no slug here as there is on the public side.
      //
      // `/rmth/:form/new` is spelled out ahead of `/rmth/:form/:id`. React
      // Router ranks a static segment above a dynamic one so the order in this
      // array does not decide it -- but `/forms/:module/new` beat a splat once
      // in this file already, so it was confirmed by following the URL rather
      // than by trusting the ranking.
      { path: '/rmth', element: <Navigate to={`/rmth/${RMTH_FORM_IDS[0]}`} replace /> },
      // The seven open items (plan §5.4), read by every Ramtha role and
      // answered by a coordinator. A static segment, so it outranks
      // `/rmth/:form` -- and RequireRamtha would 404 'thresholds' as a form id
      // if it did not.
      {
        path: '/rmth/thresholds',
        element: guard(<RmthThresholds />, (n) => (
          <RequireCapability capability="dashboard.view">
            <RequireRamtha>{n}</RequireRamtha>
          </RequireCapability>
        )),
      },
      {
        path: '/rmth/:form',
        element: guard(<RmthListScreen />, (n) => (
          <RequireCapability capability="dashboard.view">
            <RequireRamtha>{n}</RequireRamtha>
          </RequireCapability>
        )),
      },
      {
        path: '/rmth/:form/new',
        element: guard(<RmthFormScreen mode="new" />, (n) => (
          <RequireCapability capability="record.create">
            <RequireRamtha>{n}</RequireRamtha>
          </RequireCapability>
        )),
      },
      {
        path: '/rmth/:form/:id',
        element: guard(<RmthDetailScreen />, (n) => (
          <RequireCapability capability="dashboard.view">
            <RequireRamtha>{n}</RequireRamtha>
          </RequireCapability>
        )),
      },
      {
        path: '/rmth/:form/:id/edit',
        element: guard(<RmthFormScreen mode="edit" />, (n) => (
          <RequireCapability capability="record.edit">
            <RequireRamtha>{n}</RequireRamtha>
          </RequireCapability>
        )),
      },

      // ── Khalidiyah's twenty-three forms ───────────────────────────────────
      //
      // The same shape as Ramtha's: `:form` is the form id, the screens read
      // their structure from KHLD_FORMS (Khaldia_2_reviewed.xlsx), and
      // RequireKhalidiyah refuses an id that is not one of the twenty-three
      // and an account whose municipality is not Khalidiyah.
      { path: '/khld', element: <Navigate to={`/khld/${KHLD_FORM_IDS[0]}`} replace /> },
      {
        path: '/khld/:form',
        element: guard(<KhldListScreen />, (n) => (
          <RequireCapability capability="dashboard.view">
            <RequireKhalidiyah>{n}</RequireKhalidiyah>
          </RequireCapability>
        )),
      },
      {
        path: '/khld/:form/new',
        element: guard(<KhldFormScreen mode="new" />, (n) => (
          <RequireCapability capability="record.create">
            <RequireKhalidiyah>{n}</RequireKhalidiyah>
          </RequireCapability>
        )),
      },
      {
        path: '/khld/:form/:id',
        element: guard(<KhldDetailScreen />, (n) => (
          <RequireCapability capability="dashboard.view">
            <RequireKhalidiyah>{n}</RequireKhalidiyah>
          </RequireCapability>
        )),
      },
      {
        path: '/khld/:form/:id/edit',
        element: guard(<KhldFormScreen mode="edit" />, (n) => (
          <RequireCapability capability="record.edit">
            <RequireKhalidiyah>{n}</RequireKhalidiyah>
          </RequireCapability>
        )),
      },

      // Settings, likewise an address that opens the panel.
      { path: '/settings', element: <PlatformRoute section="settings" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

/** Lives inside the provider tree so it can reach the query client. */
function QueueSync() {
  useQueueSync()
  return null
}

export function App() {
  // Sets `dir` and `lang` on <html>. It has to be called at the root, not in a
  // leaf: until Phase 3 the only caller was Icon, so the attributes were being
  // set as a side effect of some icon happening to be on screen. The auth
  // screens render no icons, so Arabic sign-in came up inside dir="ltr" with
  // the Latin font stack. Anything above the router must not depend on which
  // route is mounted.
  useDirection()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <QueueSync />
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
