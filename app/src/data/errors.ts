import type { PostgrestError } from '@supabase/supabase-js'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Turning a Postgres error into something a municipal officer can act on.
 *
 *  A raw PostgREST error is not a message for a user. "new row violates
 *  row-level security policy for table \"partnership\"" tells a coordinator
 *  nothing about what to do next, and worse, it leaks the schema.
 *
 *  The rule from the brief: an RLS rejection IS the answer, not a bug to route
 *  around. So these messages explain what the database decided and who can do
 *  the thing instead. They never suggest a workaround.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** What went wrong, in terms the UI can branch on. */
export type AppErrorKind =
  /** RLS refused the write. The user's role is not allowed to do this. */
  | 'forbidden'
  /** A unique constraint. The row already exists. */
  | 'duplicate'
  /** A check constraint or a trigger raised. The data is invalid. */
  | 'invalid'
  /** A foreign key points at something that is gone. */
  | 'missing_reference'
  /** No session, or it expired mid-request. */
  | 'unauthenticated'
  /** The device is offline. */
  | 'offline'
  /** Anything else. */
  | 'unknown'

export type AppError = {
  kind: AppErrorKind
  /** i18n key under the `errors` namespace. */
  messageKey: string
  /** Interpolation values for that key. */
  values?: Record<string, string> | undefined
  /** The original code, kept for the console and for bug reports. */
  code?: string | undefined
  /** The raw message. Logged, never rendered. */
  detail?: string | undefined
}

/**
 * Constraint names mapped to a human explanation.
 *
 * Keyed on the constraint name rather than the message text, because the text
 * is a Postgres implementation detail and the name is ours.
 */
/**
 * Constraint and index names, mapped to something a person can read.
 *
 * ── EVERY KEY HERE HAS BEEN CHECKED AGAINST THE DATABASE ──
 *
 * A name that matches nothing is worse than no entry at all: it looks handled,
 * it silently falls through to the generic message, and nobody finds out until
 * a user reports a useless error. Three have been caught this way so far —
 * `person_national_id_format`, `training_enrolment_unique` and
 * `exhibition_registration_unique`. All three were plausible. None existed.
 *
 * Before adding a key, read it from `pg_constraint.conname` or `pg_class.relname`,
 * not from memory and not from what the migration looks like it should have
 * called it.
 *
 * The `*_live` names are partial unique indexes added in 0059 — they replaced
 * constraints that did not exclude soft-deleted rows (OQ-24).
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  partner_name_unique: 'errors:db.partnerDuplicate',
  partnership_partner_type_live: 'errors:db.partnershipDuplicate',
  person_national_id_key: 'errors:db.personDuplicate',
  national_id_format: 'errors:db.nationalIdFormat',
  age_or_dob: 'errors:db.ageOrDobRequired',
  training_enrolment_person_session_live: 'errors:db.enrolmentDuplicate',
  advisory_enrolment_person_session_live: 'errors:db.advisoryEnrolmentDuplicate',
  decision_needs_date: 'errors:db.decisionNeedsDate',
  advisory_decision_needs_date: 'errors:db.decisionNeedsDate',
  exhibition_registration_exhibition_person_live: 'errors:db.registrationDuplicate',
  followup_survey_person_round_live: 'errors:db.followupDuplicate',
  exhibition_booth_capacity_check: 'errors:db.boothCapacityPositive',
  exhibition_dates: 'errors:db.exhibitionDateOrder',
  // The backstop behind review_followup's own reason_required check (0097).
  // The function refuses a blank reason first and names the field; this only
  // surfaces for a write that did not go through it.
  rejected_has_a_reason: 'errors:db.rejectionNeedsReason',
  // Khalidiyah (0145-0147). The names a form can hit through
  // save_khld_record, which answers {ok:false, constraint} rather than
  // throwing; KhldFormScreen's RefusalBand reads them through
  // constraintMessageKey below. Each read from `supabase/.constraint_names`.
  khld_volunteer_person_key: 'errors:db.khldVolunteerRegistered',
  khld_attendance_activity_live: 'errors:db.khldAttendanceExists',
  khld_enterprise_support_enterprise_live: 'errors:db.khldSupportLogExists',
  khld_guidance_completion_enterprise_year_live: 'errors:db.khldCompletionExists',
  khld_partner_name_key: 'errors:db.khldPartnerExists',
  khld_partner_survey_partner_round_live: 'errors:db.khldPartnerSurveyed',
  khld_vendor_registration_market_vendor_live: 'errors:db.khldVendorRegistered',
  khld_volunteer_consent_data_given: 'errors:db.khldConsentData',
  khld_volunteer_safety_commitment_given: 'errors:db.khldSafetyCommitment',
  khld_volunteer_participation_campaign_live: 'errors:db.khldParticipationExists',
  khld_volunteer_participation_action_day_live: 'errors:db.khldParticipationExists',
  khld_volunteer_participation_activity_live: 'errors:db.khldParticipationExists',
  khld_volunteer_participation_market_live: 'errors:db.khldParticipationExists',
}

/** The message key for a constraint a save function REPORTED (rather than threw), or null. */
export function constraintMessageKey(name: string | null | undefined): string | null {
  return name ? (CONSTRAINT_MESSAGES[name] ?? null) : null
}

/** Trigger messages we recognise, matched on a distinctive fragment. */
const TRIGGER_MESSAGES: { match: RegExp; key: string }[] = [
  { match: /is not a valid role for a .* partnership/i, key: 'errors:db.roleWrongType' },
  { match: /is not a valid option for partnership_type/i, key: 'errors:db.typeWrongType' },
  { match: /role_other is required/i, key: 'errors:db.roleOtherRequired' },
  { match: /partner_type_other is required/i, key: 'errors:db.typeOtherRequired' },
  { match: /only a coordinator/i, key: 'errors:db.coordinatorOnly' },
  { match: /already held/i, key: 'errors:db.exhibitionHeld' },
  { match: /full|no booths/i, key: 'errors:db.exhibitionFull' },
  // BEFORE the national_id catch-all below, and that ordering is the whole
  // point. guard_reserved_demo_national_id refuses an INSERT in the
  // 300000000-300000099 range, and its message contains the words
  // "national_id" -- so the catch-all claimed it and told a coordinator
  // creating a record that "a national ID cannot be changed once the record is
  // saved". They had not changed anything, and nothing on screen said what was
  // actually wrong.
  { match: /reserved demo range/i, key: 'errors:db.nationalIdReserved' },
  // Deliberately last, and deliberately broad: any other national_id complaint
  // is more usefully reported as immutability than as a raw Postgres string.
  // Anything added after this line is unreachable.
  { match: /national_id/i, key: 'errors:db.nationalIdImmutable' },
]

/**
 * guard_app_user's refusals (0117). They arrive as 42501 like an RLS refusal,
 * but each names its rule, and the rule is what the person needs to read.
 */
const ACCOUNT_GUARD_MESSAGES: { match: RegExp; key: string }[] = [
  { match: /cannot change your own role/i, key: 'errors:db.ownRole' },
  { match: /cannot deactivate your own account/i, key: 'errors:db.ownAccount' },
  { match: /last active super admin/i, key: 'errors:db.lastSuperAdmin' },
  { match: /only a super admin may change a super admin account/i, key: 'errors:db.superAdminOnlyRow' },
  { match: /only a super admin may move an account/i, key: 'errors:db.superAdminOnlyMove' },
]

function constraintOf(e: PostgrestError): string | null {
  // PostgREST puts the constraint name in `details` or inside `message`.
  const haystack = `${e.message} ${e.details ?? ''}`
  for (const name of Object.keys(CONSTRAINT_MESSAGES)) {
    if (haystack.includes(name)) return name
  }
  return null
}

/**
 * Map a Supabase/PostgREST error onto an AppError.
 *
 * SQLSTATE codes, not message text, wherever a code exists:
 *   42501  insufficient_privilege  -> RLS said no
 *   23505  unique_violation        -> already exists
 *   23503  foreign_key_violation   -> points at something gone
 *   23514  check_violation         -> failed a constraint
 *   P0001  raise_exception         -> one of our own triggers
 *   PGRST301 / 401                 -> no valid session
 */
export function toAppError(error: unknown): AppError {
  if (!navigator.onLine) {
    return { kind: 'offline', messageKey: 'errors:offline.write' }
  }

  const e = error as Partial<PostgrestError> & { status?: number; name?: string }
  const code = e?.code ?? (e?.status != null ? String(e.status) : undefined)
  const message = e?.message ?? ''

  // A fetch that never reached the server.
  if (e?.name === 'TypeError' || /fetch|network/i.test(message)) {
    return { kind: 'offline', messageKey: 'errors:offline.write', code, detail: message }
  }

  if (code === '42501') {
    // guard_app_user (0117) raises insufficient_privilege with a reason of
    // its own -- your own role, your own account, the last super admin. A
    // generic "your role does not allow this" would be true and useless:
    // the super admin's role allows everything, and what refused them was the
    // rule, which the message names. Found on /accounts by deactivating
    // oneself and reading "ask the Coordinator" as a super admin.
    for (const t of ACCOUNT_GUARD_MESSAGES) {
      if (t.match.test(message)) {
        return { kind: 'forbidden', messageKey: t.key, code, detail: message }
      }
    }
    return { kind: 'forbidden', messageKey: 'errors:db.forbidden', code, detail: message }
  }

  if (code === 'PGRST301' || code === '401') {
    return { kind: 'unauthenticated', messageKey: 'errors:db.sessionExpired', code, detail: message }
  }

  if (code === '23505') {
    const name = constraintOf(e as PostgrestError)
    return {
      kind: 'duplicate',
      messageKey: name ? CONSTRAINT_MESSAGES[name]! : 'errors:db.duplicate',
      code,
      detail: message,
    }
  }

  if (code === '23503') {
    return { kind: 'missing_reference', messageKey: 'errors:db.missingReference', code, detail: message }
  }

  if (code === '23514') {
    const name = constraintOf(e as PostgrestError)
    return {
      kind: 'invalid',
      messageKey: name ? CONSTRAINT_MESSAGES[name]! : 'errors:db.checkFailed',
      code,
      detail: message,
    }
  }

  // Our own triggers raise P0001 with a written-out message.
  if (code === 'P0001' || code === '23502') {
    for (const t of TRIGGER_MESSAGES) {
      if (t.match.test(message)) {
        return { kind: 'invalid', messageKey: t.key, code, detail: message }
      }
    }
    if (code === '23502') {
      return { kind: 'invalid', messageKey: 'errors:db.missingRequired', code, detail: message }
    }
    return { kind: 'invalid', messageKey: 'errors:db.rejected', code, detail: message }
  }

  // An RLS SELECT that returns nothing looks like "no rows" on .single().
  if (code === 'PGRST116') {
    return { kind: 'forbidden', messageKey: 'errors:db.notVisible', code, detail: message }
  }

  return { kind: 'unknown', messageKey: 'errors:db.unknown', code, detail: message }
}

/**
 * Throw-site helper.
 *
 * Supabase returns `{ data, error }` rather than throwing, which makes it easy
 * to forget the error branch. Every query in `data/` goes through this, so a
 * missed check is a compile error rather than a silent empty screen.
 */
export function unwrap<T>(result: { data: T | null; error: unknown }): NonNullable<T> {
  if (result.error) throw toAppError(result.error)
  if (result.data == null) throw toAppError({ code: 'PGRST116', message: 'no rows' })
  return result.data as NonNullable<T>
}

/** Same, for queries where zero rows is a legitimate answer. */
export function unwrapList<T>(result: { data: T[] | null; error: unknown }): T[] {
  if (result.error) throw toAppError(result.error)
  return result.data ?? []
}

/** Type guard so components can branch on `kind` without casting. */
export function isAppError(e: unknown): e is AppError {
  return typeof e === 'object' && e !== null && 'kind' in e && 'messageKey' in e
}
