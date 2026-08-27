/**
 * ═════════════════════════════════════════════════════════════════════════════
 *  DEMO MODE — how to put sign-in and roles back
 * ═════════════════════════════════════════════════════════════════════════════
 *
 *  Set DEMO_MODE_REQUESTED to false, below. That is the whole reversal.
 *
 *  Everything this mode changes is a conditional on the exported DEMO_MODE. No
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
 *  coordinator on load: invisible, automatic, never offered as a choice.
 *
 *  This is a REAL session, not a stub. `app_user.role` is real and RLS behaves
 *  exactly as it does in production -- the demo simply never shows it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  ⚠ DEVELOPMENT ONLY — AND WHY THAT IS NOT NEGOTIABLE
 *
 *  A password compiled into a client bundle is not a secret. Anyone who opens
 *  the deployed JavaScript can read it, and with it they hold a real session
 *  against a database containing national ID numbers. Rotating the password
 *  does not help: whatever it is rotated to would be equally readable.
 *
 *  So demo mode is bound to `import.meta.env.DEV`, which Vite replaces with
 *  `false` in a production build, and the credential is read from the
 *  environment rather than written here. `scripts/check-no-demo-credential.mjs`
 *  fails `npm run build` if a demo credential is present in a production build.
 *
 *  ⚠ CONSEQUENCE, FLAGGED DELIBERATELY:
 *
 *  DEMO MODE WILL NOT WORK IN A DEPLOYED BUILD. It is a `npm run dev` feature.
 *  If a live demo URL is ever needed -- a link to send someone, a hosted
 *  preview -- this approach cannot provide it, and the answer is a SEPARATE
 *  SUPABASE PROJECT holding only synthetic data. That costs two projects and
 *  keeping 42 migrations in sync, which is why it was not done now. It is the
 *  only safe way to have a public demo, because at that point the credential
 *  being public costs nothing: there is no real personal data behind it.
 *
 *  Do not "fix" a broken deployed demo by hardcoding the password again.
 * ═════════════════════════════════════════════════════════════════════════════
 */

/**
 * The switch. `false` restores sign-in and roles.
 *
 * Named "requested" because it is only half the condition -- see DEMO_MODE.
 */
const DEMO_MODE_REQUESTED = true

/**
 * Is demo mode actually on?
 *
 * BOTH conditions, always together. `DEV` is a build-time constant that Vite
 * replaces with `false` in a production bundle, so this whole branch is
 * dead-code-eliminated from a real build no matter what the flag above says.
 */
export const DEMO_MODE: boolean = DEMO_MODE_REQUESTED && import.meta.env.DEV

/**
 * The account demo mode signs in as.
 *
 * The password comes from `VITE_DEMO_PASSWORD` in `.env.local`, which is
 * gitignored. It is NOT written here and NOT in any migration -- migrations are
 * committed by design, so a password in one is a password in the repository,
 * permanently.
 *
 * The six test accounts are created and rotated OUT OF BAND. Migrations 0030
 * and 0031 no longer create them.
 */
export const DEMO_ACCOUNT = {
  email: 'coordinator@shm.test',
  password: import.meta.env['VITE_DEMO_PASSWORD'] ?? '',
} as const

/** True when demo mode is on but nobody set the password. */
export const DEMO_CREDENTIAL_MISSING = DEMO_MODE && DEMO_ACCOUNT.password === ''

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
  if (DEMO_CREDENTIAL_MISSING) {
    console.error(
      '[demo-mode] VITE_DEMO_PASSWORD is not set in app/.env.local, so the ' +
        'silent sign-in cannot run and every query will come back empty. ' +
        'The test accounts are created and rotated out of band -- see ' +
        'src/demo/demoMode.ts.',
    )
    return
  }
  console.warn(
    '%c[demo-mode] ACTIVE — signed in automatically, roles and guards are off. ' +
      'Development only; it is disabled in any production build.',
    'background:#A66A17;color:#FBFAF7;padding:2px 6px;font-weight:bold',
  )
}

/**
 * ── THE PARTICIPANT PORTAL IS RETIRED ─────────────────────────────────────
 *
 * `/portal` and `/portal/register` were removed from the router when `/` became
 * a GLOBAL home page. The requirement is one page everyone sees: no accounts,
 * no sign-in for the public, no tailored personal page.
 *
 * PortalDashboard, PortalRegister and PortalShell are still on disk and still
 * compile. They are simply not routed. DEMO_PORTAL_NATIONAL_ID below is kept
 * for the same reason -- it costs nothing and it is the only record of which
 * demo identity the portal used.
 *
 * Looking up your own applications is NOT the portal returning: that is a
 * public lookup keyed on national ID plus date of birth, with no session and no
 * account behind it.
 */
