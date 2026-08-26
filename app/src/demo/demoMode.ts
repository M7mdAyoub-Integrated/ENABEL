/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  DEMO MODE — how to put sign-in and roles back
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  Set DEMO_MODE to false, below. That is the whole reversal.
 *
 *  Everything this mode changes is a conditional on that one constant. No
 *  component was deleted, no route was removed from the codebase, no guard was
 *  unpicked. Turning it off restores:
 *
 *    • the /signin, /forgot and /reset routes                (App.tsx)
 *    • RequireAuth / RequireCapability / RequireModule /
 *      RequirePortal around every route                      (App.tsx, guards.tsx)
 *    • role-based navigation filtering                       (Shell.tsx)
 *    • the account chip and sign-out in the sidebar          (Shell.tsx)
 *    • the sign-out button in the producer portal            (PortalShell.tsx)
 *    • capability gating on create / edit / delete / approve (permissions.ts)
 *    • the Municipality/Participant toggle disappears again  (Shell.tsx)
 *
 *  Grep for DEMO_MODE to find all of them. Every site carries a comment
 *  pointing back here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  WHAT THIS MODE IS
 *
 *  The app behaves like the standalone prototype: no accounts, no roles, no
 *  sign-in. Just forms that save, and one button switching between the
 *  municipality view and the participant view.
 *
 *  WHY IT STILL SIGNS IN
 *
 *  The database is unchanged. RLS gates every table, `anon` holds zero grants,
 *  and none of that is being unwound. Without a session every read returns an
 *  empty array and every write is refused. So the app signs in silently as the
 *  coordinator on load: invisible, automatic, never offered as a choice. The
 *  coordinator can read and write everything, so nothing in the UI is blocked.
 *
 *  This is a REAL session, not a stub. `app_user.role` is real and RLS behaves
 *  exactly as it does in production -- the demo simply never shows it.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/** The one switch. `false` restores sign-in and roles. */
export const DEMO_MODE = true

/**
 * The account the app signs in as, silently, on every load.
 *
 * From migration 0030, credentials repaired in 0031. Coordinator because it is
 * the only role that can read and write every table -- anything narrower would
 * make parts of the prototype look broken for reasons the demo deliberately
 * hides.
 */
export const DEMO_ACCOUNT = {
  email: 'coordinator@shm.test',
  password: 'REDACTED-ROTATED-CREDENTIAL',
} as const

/**
 * Who the producer portal represents.
 *
 * `my_person_id()` returns null for the coordinator account -- that function
 * matches `person.auth_user_id` against the signed-in user, and the coordinator
 * is not a participant. So the portal is pointed at one demo person by national
 * ID instead.
 *
 * CHANGE THIS ONE LINE to show a different producer. Demo Person One is used
 * because they already have an exhibition registration and a completed
 * training, so the portal has something to display.
 */
export const DEMO_PORTAL_NATIONAL_ID = '300000001'

/** Shouted once at startup so a demo session is never mistaken for a real one. */
export function warnIfDemo(): void {
  if (!DEMO_MODE) return
  console.warn(
    '%c[demo-mode] ACTIVE — signed in automatically, roles and guards are off. ' +
      'Set DEMO_MODE=false in src/demo/demoMode.ts to restore sign-in.',
    'background:#A66A17;color:#FBFAF7;padding:2px 6px;font-weight:bold',
  )
}
