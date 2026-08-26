/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  TO TURN THIS OFF: set VITE_AUTH_BYPASS=false in app/.env.local.
 *  That is the whole reversal. Nothing else needs editing, nothing was deleted.
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  Development sign-in bypass.
 *
 *  WHAT IT DOES. When on, the app signs itself in as one of the test users from
 *  migration 0030 (credentials repaired in 0031) and skips the sign-in screen.
 *  The role comes from the URL: `?as=coordinator`, `?as=data_entry`,
 *  `?as=enumerator`, `?as=partner_viewer`, `?as=participant`. No param means
 *  coordinator.
 *
 *  WHAT IT DELIBERATELY DOES NOT DO. It does not stub auth, fake a session, or
 *  hand the UI a pretend role. RLS gates every table in this database, so a
 *  faked session returns empty arrays from every query and the app looks broken
 *  while telling you nothing. Signing in for real means `app_user.role` is real,
 *  RLS behaves exactly as it will in production, and what you see walking
 *  through the roles is genuinely what that role sees. That is the entire point.
 *
 *  ─── WHY THIS CANNOT SHIP ──────────────────────────────────────────────────
 *
 *  Three independent locks, because one is not enough for a flag that hands out
 *  a working session to anyone who loads the page:
 *
 *    1. `import.meta.env.DEV` must also be true. A production build has DEV
 *       false, so the flag is ignored there no matter what it is set to.
 *    2. `npm run build` FAILS if VITE_AUTH_BYPASS is true — see
 *       scripts/check-no-bypass.mjs, which runs before tsc.
 *    3. It lives only in .env.local, which is gitignored. .env.example ships it
 *       as false, and it must never appear in .env.production.
 *
 *  Any one of these failing still leaves two standing.
 */

import type { Role } from '../auth/permissions'

/** The test accounts from migration 0030. Development fixtures, not real users. */
export const BYPASS_USERS: Record<Role, { email: string; password: string }> = {
  coordinator: { email: 'coordinator@shm.test', password: 'REDACTED-ROTATED-CREDENTIAL' },
  data_entry: { email: 'dataentry@shm.test', password: 'REDACTED-ROTATED-CREDENTIAL' },
  enumerator: { email: 'enumerator@shm.test', password: 'REDACTED-ROTATED-CREDENTIAL' },
  partner_viewer: { email: 'viewer@shm.test', password: 'REDACTED-ROTATED-CREDENTIAL' },
  participant: { email: 'producer@shm.test', password: 'REDACTED-ROTATED-CREDENTIAL' },
}

/**
 * Is the bypass live right now?
 *
 * BOTH conditions, always together. `DEV` is a build-time constant that Vite
 * replaces with `false` in a production bundle, so this whole branch is
 * dead-code-eliminated from a real build.
 */
export const AUTH_BYPASS: boolean =
  import.meta.env.DEV && import.meta.env['VITE_AUTH_BYPASS'] === 'true'

/**
 * Which role the URL is asking for.
 *
 * Read from `window.location` rather than a router hook so it is available to
 * AuthProvider, which sits above the router. An unrecognised value falls back
 * to coordinator rather than erroring — this is a demo aid, and a typo in a URL
 * should not produce a broken screen.
 */
export function bypassRoleFromUrl(): Role {
  if (!AUTH_BYPASS) return 'coordinator'
  const raw = new URLSearchParams(window.location.search).get('as')
  if (raw && raw in BYPASS_USERS) return raw as Role
  if (raw) {
    console.warn(
      `[auth-bypass] "?as=${raw}" is not a role. Expected one of: ${Object.keys(BYPASS_USERS).join(', ')}. Falling back to coordinator.`,
    )
  }
  return 'coordinator'
}

/** Shouted once at startup so nobody mistakes a bypassed session for a real one. */
export function warnIfBypassing(): void {
  if (!AUTH_BYPASS) return
  console.warn(
    '%c[auth-bypass] ACTIVE — signed in automatically as a test user. ' +
      'Set VITE_AUTH_BYPASS=false in app/.env.local to restore normal sign-in.',
    'background:#A66A17;color:#FBFAF7;padding:2px 6px;font-weight:bold',
  )
}
