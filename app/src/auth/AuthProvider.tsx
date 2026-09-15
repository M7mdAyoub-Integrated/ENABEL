import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { queryClient } from '../data/queryClient'
import { isRole, type Role } from './permissions'
import { DEMO_MODE, DEMO_ACCOUNT, DEMO_PORTAL_NATIONAL_ID, warnIfDemo } from '../demo/demoMode'

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

export type AuthState = {
  status: AuthStatus
  session: Session | null
  userId: string | null
  email: string | null
  /** From app_user.role. Null until resolved, or if the row is missing/inactive. */
  role: Role | null
  /** True once the role lookup has settled, successfully or not. */
  roleResolved: boolean
  /** person.id for a linked participant. Null when no person row is linked. */
  personId: string | null
  /**
   * The municipality this account works in: `app_user.municipality_id` for a
   * municipal account, the acting municipality for a super admin who has
   * switched into one, null for a super admin who has not (and for a
   * participant, who has none). Mirrors `my_municipality()` in the database,
   * which is what every scoped policy and column default actually reads —
   * this value is for the screens, never for authorisation.
   */
  municipalityId: string | null
  /** True for `super_admin`. Convenience over `role === 'super_admin'`. */
  isSuperAdmin: boolean
  /**
   * Super admin only: switch into a municipality (or out of all of them with
   * null). Writes `app_user.acting_municipality_id` through
   * `set_acting_municipality`, then clears every cached query — the same rule
   * as a change of identity, because every scoped read now answers
   * differently.
   */
  setActingMunicipality: (id: string | null) => Promise<{ error: string | null }>
  /** Set when the session ended on its own (expiry), so the UI can explain. */
  expired: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  /** Re-read the role from the database. Never trust a cached value. */
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * The routes where nobody is signed in on purpose. A cold load of one of
 * these never runs the silent demo sign-in: /signin exists to choose an
 * account, and demo mode choosing one first is exactly how a signed-out
 * developer typing /signin or /admin arrived at the Ramtha dashboard with
 * no form in between (15 September 2026). Read once, at bootstrap, from
 * the address the tab was opened at -- the provider sits above the router.
 */
const AUTH_ROUTES = new Set(['/signin', '/admin', '/forgot', '/reset'])
function openedOnAuthRoute(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return AUTH_ROUTES.has(path)
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** Convenience: the role alone. */
export function useRole(): Role | null {
  return useAuth().role
}

/**
 * Session and role.
 *
 * Two things are deliberately separate:
 *   - the SESSION, owned by Supabase Auth, which persists it and refreshes the
 *     token on its own;
 *   - the ROLE, which is read from `app_user` on every session change and is
 *     never persisted anywhere by us.
 *
 * Nothing sensitive is written to localStorage by this app. Supabase Auth keeps
 * its own session there, which section 6 of the build plan explicitly allows;
 * the role, the person link and everything derived from them live in memory
 * only, so a stale tab cannot resurrect an old permission set.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [roleResolved, setRoleResolved] = useState(false)
  const [personId, setPersonId] = useState<string | null>(null)
  const [municipalityId, setMunicipalityId] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)

  // Guards against a slow role query landing after the user has signed out or
  // switched account, which would otherwise grant the previous role.
  const requestSeq = useRef(0)
  // Demo mode: true until the silent sign-in has settled. While it is, the
  // auth listener stays quiet -- it fires INITIAL_SESSION with no session
  // before the sign-in, and SIGNED_OUT when the stored session belongs to a
  // different demo account, and either would read as "signed out" for a
  // moment. RequireSession sends a signed-out demo session to the public
  // home page (sign-out is real in demo mode), so a moment is enough to
  // bounce a cold load of /dashboard to /.
  const demoBootstrapping = useRef(DEMO_MODE)

  /**
   * ── THE CACHE MUST NOT OUTLIVE THE IDENTITY THAT FILLED IT ──
   *
   * Every query key in this app describes WHAT is being read and nothing about
   * WHO is reading it, and `staleTime` is 30 seconds. So a result fetched
   * under one identity is served to the next one for up to half a minute.
   *
   * That is not only a staleness problem, it is the RLS trap from CLAUDE.md
   * wearing new clothes. **RLS does not raise on a read it will not permit —
   * it filters the rows.** An unauthenticated request to PostgREST comes back
   * `200 []`, not an error, so `unwrapList` returns an empty array, the query
   * succeeds, and the screen renders its EMPTY STATE. "None recorded" is what
   * a coordinator sees when the truth is "your session is not established
   * yet" or "your session expired".
   *
   * Observed, on /manual-entries: F0.1, G0.2 and G0.3 all read "NONE
   * RECORDED" and the milestones section rendered nothing, while the database
   * held two promotional actions, a meeting, a case study and two milestones.
   * No error anywhere — the auth request had 401'd, the queries went out
   * unauthenticated, and the empty results sat in the cache.
   *
   * Clearing on any change of identity fixes all three shapes of it: the demo
   * bootstrap (anon then coordinator), a real session expiring and being
   * refreshed, and one user signing out while another signs in on the same
   * tab — which in a database holding national ID numbers would otherwise
   * leave the first user's rows on screen.
   */
  const lastIdentity = useRef<string | null | undefined>(undefined)
  const clearCacheIfIdentityChanged = useCallback((s: Session | null) => {
    const id = s?.user.id ?? null
    if (lastIdentity.current === undefined) {
      lastIdentity.current = id
      return
    }
    if (lastIdentity.current === id) return
    lastIdentity.current = id
    queryClient.clear()
  }, [])

  const loadRoleFor = useCallback(async (s: Session | null) => {
    const seq = ++requestSeq.current
    if (!s?.user) {
      setRole(null)
      setPersonId(null)
      setMunicipalityId(null)
      setRoleResolved(true)
      return
    }
    const [{ data: appUser }, { data: person }] = await Promise.all([
      supabase
        .from('app_user')
        .select('role, is_active, municipality_id, acting_municipality_id')
        .eq('id', s.user.id)
        .maybeSingle(),
      // Demo mode: the coordinator is not a participant, so `auth_user_id`
      // matches nobody and `my_person_id()` returns null. Look the demo person
      // up by national ID instead so the portal has someone to represent.
      // One constant, in src/demo/demoMode.ts.
      DEMO_MODE
        ? supabase
            .from('person')
            .select('id')
            .eq('national_id', DEMO_PORTAL_NATIONAL_ID)
            .is('deleted_at', null)
            .maybeSingle()
        : supabase.from('person').select('id').eq('auth_user_id', s.user.id).maybeSingle(),
    ])
    if (seq !== requestSeq.current) return // superseded

    // is_active is checked here as well as in the database. Migration 0032
    // restored the `and is_active` filter to current_role(), so RLS now revokes
    // a deactivated user on its own -- this check is what makes the UI say so
    // instead of showing empty screens. Keep both: this one is cosmetic and
    // 0032 is the boundary.
    const active = appUser?.is_active !== false
    setRole(active && isRole(appUser?.role) ? appUser.role : null)
    setPersonId(person?.id ?? null)
    // coalesce(municipality_id, acting_municipality_id): the same expression
    // as my_municipality() in 0117, so the header and the database agree.
    setMunicipalityId(
      active ? (appUser?.municipality_id ?? appUser?.acting_municipality_id ?? null) : null,
    )
    setRoleResolved(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    /**
     * Demo mode signs in silently as the demo account. See
     * src/demo/demoMode.ts -- set DEMO_MODE to false there to restore normal
     * sign-in.
     *
     * A REAL sign-in, not a stub: RLS gates every table, so without a session
     * every read is empty and every write refused. It runs only when there is
     * NO session and the tab was not opened on a sign-in screen. An existing
     * session is kept whoever it belongs to: an account chosen on /signin has
     * to survive a reload, or the choice was never real. (It used to replace
     * any other account's session with the demo account's; to change the
     * demo account now, sign out and reload.)
     */
    const demoSignIn = async (): Promise<Session | null> => {
      const { data, error } = await supabase.auth.signInWithPassword(DEMO_ACCOUNT)
      if (error) {
        console.error(
          `[demo-mode] could not sign in as ${DEMO_ACCOUNT.email}: ${error.message}. ` +
            'That account comes from migrations 0030/0031 -- check they are applied.',
        )
        return null
      }
      return data.session
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return

      if (DEMO_MODE) warnIfDemo()
      if (DEMO_MODE && !data.session && !openedOnAuthRoute()) {
        const s = await demoSignIn()
        if (cancelled) return
        clearCacheIfIdentityChanged(s)
        setSession(s)
        setStatus(s ? 'signedIn' : 'signedOut')
        demoBootstrapping.current = false
        void loadRoleFor(s)
        return
      }

      // Either not demo mode, or a session already exists, or the tab was
      // opened on a sign-in screen. The listener takes over from here.
      demoBootstrapping.current = false
      clearCacheIfIdentityChanged(data.session)
      setSession(data.session)
      setStatus(data.session ? 'signedIn' : 'signedOut')
      void loadRoleFor(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return
      if (demoBootstrapping.current) return
      // Read before clearCacheIfIdentityChanged moves the marker.
      const identityChanged = lastIdentity.current !== (s?.user.id ?? null)
      // Before setSession, so anything this render reads is fetched fresh.
      // TOKEN_REFRESHED keeps the same user id, so it does not clear.
      clearCacheIfIdentityChanged(s)
      setSession(s)
      setStatus(s ? 'signedIn' : 'signedOut')

      // A token that could not be refreshed ends the session on its own. Tell
      // the user why rather than bouncing them to a blank sign-in screen.
      if (event === 'TOKEN_REFRESHED') setExpired(false)
      if (event === 'SIGNED_OUT' && !s) {
        setRole(null)
        setPersonId(null)
        setMunicipalityId(null)
        setRoleResolved(true)
        return
      }
      // The same identity again -- INITIAL_SESSION or SIGNED_IN landing after
      // the bootstrap has already settled, or a token refresh -- re-reads the
      // role without putting the screen back to "checking". That reset showed
      // the dashboard skeleton under the municipality chooser, and "Checking
      // your access" over the sign-in screen, for a moment on every cold load.
      if (identityChanged) setRoleResolved(false)
      void loadRoleFor(s)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadRoleFor, clearCacheIfIdentityChanged])

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    setExpired(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRole(null)
    setPersonId(null)
    setMunicipalityId(null)
    setExpired(false)
  }, [])

  const requestPasswordReset = useCallback<AuthState['requestPasswordReset']>(
    async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`,
      })
      return { error: error ? error.message : null }
    },
    [],
  )

  const updatePassword = useCallback<AuthState['updatePassword']>(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    return { error: error ? error.message : null }
  }, [])

  const refreshRole = useCallback(async () => {
    setRoleResolved(false)
    await loadRoleFor(session)
  }, [loadRoleFor, session])

  const setActingMunicipality = useCallback<AuthState['setActingMunicipality']>(
    async (id) => {
      // The generated type reads the parameter as non-null; the function accepts null (0117).
      const { data, error } = await supabase.rpc('set_acting_municipality', {
        p_municipality_id: id as unknown as string,
      })
      if (error) return { error: error.message }
      const res = data as { ok?: boolean; result?: string } | null
      if (!res?.ok) return { error: res?.result ?? 'failed' }
      // Every scoped read answers differently now. Same treatment as a change
      // of identity — see clearCacheIfIdentityChanged above.
      queryClient.clear()
      await loadRoleFor(session)
      return { error: null }
    },
    [loadRoleFor, session],
  )

  // A role change made by a coordinator mid-session must take effect without a
  // reload. Re-read on focus and on a timer rather than trusting the cached
  // value for the life of the tab.
  useEffect(() => {
    if (!session) return
    const onFocus = () => void loadRoleFor(session)
    window.addEventListener('focus', onFocus)
    const id = window.setInterval(onFocus, 5 * 60 * 1000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [session, loadRoleFor])

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      role,
      roleResolved,
      personId,
      municipalityId,
      isSuperAdmin: role === 'super_admin',
      expired,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshRole,
      setActingMunicipality,
    }),
    [
      status, session, role, roleResolved, personId, municipalityId, expired,
      signIn, signOut, requestPasswordReset, updatePassword, refreshRole, setActingMunicipality,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
