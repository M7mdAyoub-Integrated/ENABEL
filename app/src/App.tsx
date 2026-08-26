import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { ToastProvider } from './ui/Toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { queryClient } from './data/queryClient'
import { DEMO_MODE } from './demo/demoMode'
import { useQueueSync } from './data/useOffline'
import { useDirection } from './hooks/useDirection'
import { RequireCapability, RequireModule, RequirePortal, RequireSession } from './auth/guards'
import Landing from './routes/Landing'
import Dashboard from './routes/Dashboard'
import ListScreen from './routes/ListScreen'
import FormScreen from './routes/FormScreen'
import DetailScreen from './routes/DetailScreen'
import ManualEntries from './routes/ManualEntries'
import Settings from './routes/Settings'
import NotFound from './routes/NotFound'
import PortalDashboard from './routes/portal/PortalDashboard'
import PortalRegister from './routes/portal/PortalRegister'
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
  { path: '/', element: <Landing /> },

  {
    path: '/portal',
    element: guard(<PortalDashboard />, (n) => <RequirePortal>{n}</RequirePortal>),
  },
  {
    path: '/portal/register',
    element: guard(<PortalRegister />, (n) => <RequirePortal>{n}</RequirePortal>),
  },

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
