import type { ModuleId } from '../modules'
import { DEMO_MODE } from '../demo/demoMode'

/**
 * The five application roles, from `app_role_t`.
 *
 * The role ALWAYS comes from `app_user.role`, read from the database for the
 * signed-in user. Never from a JWT claim, a query string, localStorage, or
 * anything else the client can set.
 */
export const ROLES = [
  'coordinator',
  'data_entry',
  'enumerator',
  'partner_viewer',
  'participant',
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
  /** Use the participant portal. */
  | 'portal.access'

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
  ]),
  partner_viewer: new Set<Capability>([
    'app.access',
    'dashboard.view',
    // Read-only. No create, edit, delete, review, or manual entry.
  ]),
  participant: new Set<Capability>(['portal.access']),
}

export function can(role: Role | null, capability: Capability): boolean {
  // Demo mode: no roles exist in the UI, so every capability is granted and
  // nothing is hidden. RLS is unchanged underneath -- the session is the
  // coordinator, which really can do all of this. See src/demo/demoMode.ts.
  if (DEMO_MODE) return true
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
  coordinator: ['tp', 'pp', 'tc', 'ln', 'ex', 'rg', 'fu'],
  data_entry: ['tp', 'pp', 'tc', 'ln', 'ex', 'rg', 'fu'],
  enumerator: ['fu'],
  partner_viewer: [],
  participant: [],
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
  if (module === 'fu') return role === 'coordinator' || role === 'enumerator'
  return role === 'coordinator' || role === 'data_entry'
}

/** Where a role lands after signing in. */
export function homeRouteFor(role: Role | null): string {
  // Demo mode always opens on the municipality view.
  if (DEMO_MODE) return '/dashboard'
  if (!role) return '/signin'
  if (role === 'participant') return '/portal'
  if (role === 'enumerator') return '/forms/fu'
  return '/dashboard'
}
