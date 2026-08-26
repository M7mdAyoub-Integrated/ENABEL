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
const CONSTRAINT_MESSAGES: Record<string, string> = {
  partner_name_unique: 'errors:db.partnerDuplicate',
  partnership_partner_id_partnership_type_key: 'errors:db.partnershipDuplicate',
  person_national_id_key: 'errors:db.personDuplicate',
  // The real constraint names, read from the migrations. The two guesses that
  // were here before ("person_national_id_format", "training_enrolment_unique")
  // matched nothing, so both fell through to the generic message.
  national_id_format: 'errors:db.nationalIdFormat',
  age_or_dob: 'errors:db.ageOrDobRequired',
  training_enrolment_person_id_session_id_key: 'errors:db.enrolmentDuplicate',
  decision_needs_date: 'errors:db.decisionNeedsDate',
  exhibition_registration_unique: 'errors:db.registrationDuplicate',
  exhibition_booth_capacity_check: 'errors:db.boothCapacityPositive',
  exhibition_dates: 'errors:db.exhibitionDateOrder',
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
  { match: /national_id/i, key: 'errors:db.nationalIdImmutable' },
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
