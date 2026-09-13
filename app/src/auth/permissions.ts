import type { ModuleId } from '../modules'
import { DEMO_MODE } from '../demo/demoMode'

/**
 * The six application roles, from `app_role_t`.
 *
 * The role ALWAYS comes from `app_user.role`, read from the database for the
 * signed-in user. Never from a JWT claim, a query string, localStorage, or
 * anything else the client can set.
 *
 * `super_admin` arrived with the second municipality (migration 0116). It is
 * a coordinator in whichever municipality it is switched into, plus the one
 * thing no coordinator has: it manages accounts and sees both programmes.
 * `data_entry`, `enumerator`, `partner_viewer` and `participant` are still
 * here, still have every policy they had, and are simply not assigned to
 * anyone at the moment — RAMTHA_IMPLEMENTATION_PLAN.md §2.1.
 */
export const ROLES = [
  'coordinator',
  'data_entry',
  'enumerator',
  'partner_viewer',
  'participant',
  'super_admin',
] as const
export type Role = (typeof ROLES)[number]

export function isRole(v: string | null | undefined): v is Role {
  return !!v && (ROLES as readonly string[]).includes(v)
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  THE UI IS A CONVENIENCE. RLS IS THE SECURITY BOUNDARY.
 *
 *  Everything in this file exists so a user is not shown a control that will
 *  fail, and so the navigation reflects the job. None of it protects data. A
 *  user who defeats all of it reaches exactly what their RLS policies allow and
 *  nothing more. Do not add a check here and treat the matching database policy
 *  as optional.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Source of truth for these tables is 05_ROLES_AND_RLS.md section 3. Where the
 * deployed database currently disagrees with that document, the disagreement is
 * noted inline and the DOCUMENT is followed, per the build instruction.
 */

/** Capabilities a screen asks about. Deliberately coarse. */
export type Capability =
  /** See municipal (non-portal) screens at all. */
  | 'app.access'
  /** See the indicator dashboard. */
  | 'dashboard.view'
  /** See the manual-entry screen. */
  | 'manual.view'
  /** Write a manual indicator figure. */
  | 'manual.write'
  /** Create or edit operational records. */
  | 'record.create'
  | 'record.edit'
  /** Soft-delete a record. Coordinator only -- 05 section 4. */
  | 'record.delete'
  /** Approve or reject an exhibition registration. Coordinator only -- 05 section 5. */
  | 'registration.review'
  /**
   * Approve, reject or reopen a follow-up survey. Coordinator only -- 05
   * section 7, and enforced by fu_update plus guard_followup_review (0093,
   * 0097). Separate from registration.review because they are different
   * decisions on different records: one admits a producer to a market, the
   * other stands behind forty-three answers about a household.
   */
  | 'survey.review'
  /** Use the participant portal. */
  | 'portal.access'
  /**
   * Create, deactivate and re-assign staff accounts, and create other super
   * admins. Super admin only — plan §2.5. The database is the boundary:
   * `au_*` (0118) and `guard_app_user` (0117).
   */
  | 'accounts.manage'

const CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  coordinator: new Set<Capability>([
    'app.access',
    'dashboard.view',
    'manual.view',
    'manual.write',
    'record.create',
    'record.edit',
    'record.delete',
    'registration.review',
    'survey.review',
  ]),
  data_entry: new Set<Capability>([
    'app.access',
    'dashboard.view',
    'manual.view',
    // No manual.write: manual figures feed indicators directly and 05 gives
    // only the coordinator authority over reported numbers.
    'record.create',
    'record.edit',
    // No record.delete -- 05 section 4: "Only a coordinator may delete or
    // restore a record."
    // No registration.review -- 05 section 5.
  ]),
  enumerator: new Set<Capability>([
    'app.access',
    // Follow-up surveys only, plus read on person. No dashboard: the matrix
    // gives read on indicator tables, but the enumerator's job is fieldwork and
    // the prototype dashboard is a municipal management screen.
    'record.create',
    'record.edit',
    // No survey.review. An enumerator fills a survey in and submits it once;
    // approving their own work is the thing 0093 was written to stop.
  ]),
  partner_viewer: new Set<Capability>([
    'app.access',
    'dashboard.view',
    // Read-only. No create, edit, delete, review, or manual entry.
  ]),
  participant: new Set<Capability>(['portal.access']),
  super_admin: new Set<Capability>([
    'app.access',
    'dashboard.view',
    'manual.view',
    'manual.write',
    'record.create',
    'record.edit',
    'record.delete',
    'registration.review',
    'survey.review',
    'accounts.manage',
  ]),
}

export function can(role: Role | null, capability: Capability): boolean {
  // Demo mode: no roles exist in the UI, so every capability is granted and
  // nothing is hidden. RLS is unchanged underneath -- the session is the
  // coordinator, which really can do all of this. See src/demo/demoMode.ts.
  //
  // Except account management. The demo coordinator really cannot do that
  // -- manage-account refuses anyone but a super admin -- so showing the
  // link would be the placeholder shape from CLAUDE.md: a control that
  // exists and cannot work. `node scripts/demo-as.mjs superadmin@shm.test`
  // is how to see it in development.
  if (DEMO_MODE && capability !== 'accounts.manage') return true
  if (!role) return false
  return CAPABILITIES[role].has(capability)
}

/**
 * Which form modules each role may open.
 *
 * `enumerator` gets `fu` only -- 05 section 1: "Follow-up surveys only, plus
 * read access to person so they can find the respondent."
 *
 * `partner_viewer` gets NOTHING here. The permission matrix grants them `R` on
 * the operational tables, but section 6 is emphatic that they must never see a
 * national ID, and several list screens (Training completion, Registrations)
 * show it as a column. Sending a donor to a screen whose first column is a
 * national ID would contradict the stronger rule. They get the dashboard, which
 * reads the aggregate views. See the divergence note in the Phase 3 report.
 */
const MODULE_ACCESS: Record<Role, readonly ModuleId[]> = {
  // `os` is coordinator-only for now, as specified. The office-staff role does
  // not exist yet; when it does, adding it is a line here plus a policy, because
  // office_service already uses the same is_staff() shape as everything else.
  //
  // `rg`, `ln` and `fu` are DELIBERATELY ABSENT. Both were Phase 4 mock screens that
  // duplicated newer live ones -- registrations are decided on /exhibitions/:id
  // and linkages on /linkage-requests -- and both fired a "Saved" toast naming
  // the indicator they fed while writing nothing. They stay in MODULE_IDS so
  // the redirects in App.tsx keep working and nothing else has to be unpicked.
  //
  // `gd` (the guidance log) goes to BOTH, unlike `os`. `guidance_record`'s
  // policies are the standard operational four -- is_staff() to read,
  // coordinator-or-data_entry to write -- and nothing about giving a producer
  // licensing advice is a coordinator-only act. `os` is narrower only because
  // an office-staff role is expected to own it later.
  coordinator: ['pn', 'tc', 'ex', 'os', 'gd'],
  data_entry: ['pn', 'tc', 'ex', 'gd'],
  enumerator: [],
  partner_viewer: [],
  participant: [],
  // The same list as a coordinator: a super admin switched into a
  // municipality works its forms as that municipality's coordinator would.
  super_admin: ['pn', 'tc', 'ex', 'os', 'gd'],
}

export function modulesFor(role: Role | null): readonly ModuleId[] {
  // Demo mode: one navigation, everything visible. See src/demo/demoMode.ts.
  if (DEMO_MODE) return MODULE_ACCESS.coordinator
  if (!role) return []
  return MODULE_ACCESS[role]
}

export function canAccessModule(role: Role | null, module: ModuleId): boolean {
  return modulesFor(role).includes(module)
}

/**
 * Whether the role may write to a specific module.
 *
 * `data_entry` may not write follow-up surveys: the matrix gives them `R` only
 * on `followup_survey`, and the deployed `fu_insert` / `fu_update` policies
 * restrict writes to coordinator and enumerator. Document and database agree
 * here, so the UI matches both.
 */
export function canWriteModule(role: Role | null, module: ModuleId): boolean {
  if (DEMO_MODE) return true
  if (!role) return false
  if (!canAccessModule(role, module)) return false
  if (module === 'fu') return role === 'coordinator' || role === 'enumerator' || role === 'super_admin'
  return role === 'coordinator' || role === 'data_entry' || role === 'super_admin'
}

/**
 * Where a role lands after signing in.
 *
 * Two of these were pointing at paths that no longer exist as screens:
 *
 *  - `participant` went to `/portal`. The participant portal was RETIRED when
 *    `/` became the public home page, and `/portal` is not declared in
 *    App.tsx — so a participant signing in landed on the ShellLayout splat
 *    route behind a capability they do not hold. Whatever that rendered, it
 *    was not a page anyone had designed. A participant has no municipal
 *    screens at all now; the public home page is genuinely where they belong,
 *    and looking up an application there needs no account.
 *
 *  - `enumerator` went to `/forms/fu`, which only works because App.tsx
 *    redirects it. Pointing at the destination is not a behaviour change, it
 *    just stops the landing depending on a redirect that exists for old
 *    bookmarks.
 */
export function homeRouteFor(role: Role | null): string {
  // Demo mode always opens on the municipality view.
  if (DEMO_MODE) return '/dashboard'
  if (!role) return '/signin'
  if (role === 'participant') return '/'
  if (role === 'enumerator') return '/followups'
  return '/dashboard'
}
