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
import { isRole, type Role } from './permissions'
import { AUTH_BYPASS, BYPASS_USERS, bypassRoleFromUrl, warnIfBypassing } from '../dev/authBypass'

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
  const [expired, setExpired] = useState(false)

  // Guards against a slow role query landing after the user has signed out or
  // switched account, which would otherwise grant the previous role.
  const requestSeq = useRef(0)

  const loadRoleFor = useCallback(async (s: Session | null) => {
    const seq = ++requestSeq.current
    if (!s?.user) {
      setRole(null)
      setPersonId(null)
      setRoleResolved(true)
      return
    }
    const [{ data: appUser }, { data: person }] = await Promise.all([
      supabase.from('app_user').select('role, is_active').eq('id', s.user.id).maybeSingle(),
      supabase.from('person').select('id').eq('auth_user_id', s.user.id).maybeSingle(),
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
    setRoleResolved(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    /**
     * Development bypass. See src/dev/authBypass.ts -- set VITE_AUTH_BYPASS to
     * false in .env.local to turn all of this off.
     *
     * A REAL sign-in, not a stub. RLS gates every table, so a faked session
     * would return empty arrays everywhere and show nothing useful about what a
     * role can actually see. Signing in as the test user means `app_user.role`
     * is real and RLS behaves exactly as it will in production.
     *
     * If a session for a DIFFERENT test user is already open -- because the
     * `?as=` param just changed -- it is signed out first, so switching roles
     * is clean rather than leaving the previous role's token in place.
     */
    const bootstrapBypass = async (existing: Session | null): Promise<Session | null> => {
      const wanted = BYPASS_USERS[bypassRoleFromUrl()]
      if (existing?.user.email === wanted.email) return existing
      if (existing) await supabase.auth.signOut()
      const { data, error } = await supabase.auth.signInWithPassword(wanted)
      if (error) {
        console.error(
          `[auth-bypass] could not sign in as ${wanted.email}: ${error.message}. ` +
            'The test users come from migrations 0030 and 0031 -- check they are applied.',
        )
        return null
      }
      return data.session
    }

    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return

      if (AUTH_BYPASS) {
        warnIfBypassing()
        const s = await bootstrapBypass(data.session)
        if (cancelled) return
        setSession(s)
        setStatus(s ? 'signedIn' : 'signedOut')
        void loadRoleFor(s)
        return
      }

      setSession(data.session)
      setStatus(data.session ? 'signedIn' : 'signedOut')
      void loadRoleFor(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return
      setSession(s)
      setStatus(s ? 'signedIn' : 'signedOut')

      // A token that could not be refreshed ends the session on its own. Tell
      // the user why rather than bouncing them to a blank sign-in screen.
      if (event === 'TOKEN_REFRESHED') setExpired(false)
      if (event === 'SIGNED_OUT' && !s) {
        setRole(null)
        setPersonId(null)
        setRoleResolved(true)
        return
      }
      setRoleResolved(false)
      void loadRoleFor(s)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadRoleFor])

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    setExpired(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? error.message : null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRole(null)
    setPersonId(null)
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
      expired,
      signIn,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshRole,
    }),
    [
      status, session, role, roleResolved, personId, expired,
      signIn, signOut, requestPasswordReset, updatePassword, refreshRole,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
