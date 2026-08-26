import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Shell } from './layout/Shell'
import { ToastProvider } from './ui/Toast'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { queryClient } from './data/queryClient'
import { useQueueSync } from './data/useOffline'
import { useDirection } from './hooks/useDirection'
import { RequireCapability, RequireModule, RequirePortal } from './auth/guards'
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

/** Municipal screens: shell + a capability check on every child route. */
function ShellLayout() {
  return (
    <RequireCapability capability="app.access">
      <Shell>
        <Outlet />
      </Shell>
    </RequireCapability>
  )
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
const router = createBrowserRouter([
  { path: '/signin', element: <SignIn /> },
  { path: '/forgot', element: <ForgotPassword /> },
  { path: '/reset', element: <ResetPassword /> },

  // Landing decides where a signed-in user belongs.
  { path: '/', element: <Landing /> },

  {
    path: '/portal',
    element: (
      <RequirePortal>
        <PortalDashboard />
      </RequirePortal>
    ),
  },
  {
    path: '/portal/register',
    element: (
      <RequirePortal>
        <PortalRegister />
      </RequirePortal>
    ),
  },

  {
    element: <ShellLayout />,
    children: [
      {
        path: '/dashboard',
        element: (
          <RequireCapability capability="dashboard.view">
            <Dashboard />
          </RequireCapability>
        ),
      },
      { path: '/forms/:module', element: <RequireModule><ListScreen /></RequireModule> },
      {
        path: '/forms/:module/new',
        element: (
          <RequireModule>
            <RequireCapability capability="record.create">
              <FormScreen mode="new" />
            </RequireCapability>
          </RequireModule>
        ),
      },
      { path: '/forms/:module/:id', element: <RequireModule><DetailScreen /></RequireModule> },
      {
        path: '/forms/:module/:id/edit',
        element: (
          <RequireModule>
            <RequireCapability capability="record.edit">
              <FormScreen mode="edit" />
            </RequireCapability>
          </RequireModule>
        ),
      },
      {
        path: '/manual-entries',
        element: (
          <RequireCapability capability="manual.view">
            <ManualEntries />
          </RequireCapability>
        ),
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
