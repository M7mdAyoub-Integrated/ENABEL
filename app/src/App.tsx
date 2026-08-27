import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { ToastProvider } from './ui/Toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { queryClient } from './data/queryClient'
import { DEMO_MODE } from './demo/demoMode'
import { useQueueSync } from './data/useOffline'
import { useDirection } from './hooks/useDirection'
import { RequireCapability, RequireModule, RequireSession } from './auth/guards'
import Landing from './routes/Landing'
import Dashboard from './routes/Dashboard'
import ListScreen from './routes/ListScreen'
import FormScreen from './routes/FormScreen'
import DetailScreen from './routes/DetailScreen'
import ManualEntries from './routes/ManualEntries'
import Settings from './routes/Settings'
import NotFound from './routes/NotFound'
import PublicHome from './routes/public/PublicHome'
import ApplyForm from './routes/public/ApplyForm'
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
  const inner = (
    <Shell>
      <Outlet />
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
 * The unauthenticated routes.
 *
 * Demo mode removes them from routing entirely -- they redirect to the root --
 * but the components stay imported and the paths stay declared, so restoring
 * them is a one-line change. See src/demo/demoMode.ts.
 */
const authRoutes = DEMO_MODE
  ? [
      { path: '/signin', element: <Navigate to="/" replace /> },
      { path: '/forgot', element: <Navigate to="/" replace /> },
      { path: '/reset', element: <Navigate to="/" replace /> },
    ]
  : [
      { path: '/signin', element: <SignIn /> },
      { path: '/forgot', element: <ForgotPassword /> },
      { path: '/reset', element: <ResetPassword /> },
    ]

const router = createBrowserRouter([
  ...authRoutes,

  // Landing decides where a signed-in user belongs.
  // ── The public site ──────────────────────────────────────────────────────
  // No session, no guard, no Shell. `/` is now the PUBLIC home page: this is a
  // programme about participation, so the front door belongs to the public
  // rather than to staff. Municipal screens keep their own paths below.
  //
  // These must stay OUTSIDE RequireSession. They read v_public_opportunity,
  // which anon is granted, and a farmer has no account to wait for.
  { path: '/', element: <PublicHome /> },
  { path: '/opportunity/:id', element: <OpportunityDetail /> },
  { path: '/apply/:id', element: <ApplyForm /> },

  // Where staff used to land. Kept so an existing bookmark still works.
  { path: '/home', element: <Landing /> },

  // THE PARTICIPANT PORTAL IS RETIRED. `/` is a global home page now, so there
  // is no tailored personal page and no account to sign in to. PortalDashboard,
  // PortalRegister and PortalShell stay on disk, dormant and unimported, the
  // same treatment the auth screens get -- restoring them is adding the routes
  // back. See src/demo/demoMode.ts.

  {
    element: <ShellLayout />,
    children: [
      {
        path: '/dashboard',
        element: guard(<Dashboard />, (n) => (
          <RequireCapability capability="dashboard.view">{n}</RequireCapability>
        )),
      },
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
      {
        path: '/manual-entries',
        element: guard(<ManualEntries />, (n) => (
          <RequireCapability capability="manual.view">{n}</RequireCapability>
        )),
      },
      { path: '/settings', element: <Settings /> },
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
