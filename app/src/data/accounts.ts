import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList, type AppError } from './errors'
import type { Role } from '../auth/permissions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Staff accounts. Super admin only (plan §2.5).
 *
 *  Two kinds of write, in two places, and the split is the point:
 *
 *    - CREATING a login and SETTING a password need the Auth admin API, which
 *      needs the service-role key, which never reaches a browser. Both go
 *      through the `manage-account` Edge Function, which checks the caller is
 *      a super admin against `app_user` and not against anything the browser
 *      sent.
 *
 *    - Everything else about an account — role, municipality, active or not —
 *      is a plain UPDATE on `app_user`, under RLS (0118) and `guard_app_user`
 *      (0117). The refusals are the database's: you cannot change your own
 *      role, you cannot deactivate yourself, you cannot remove the last super
 *      admin. This file does not re-implement any of them; it renders what
 *      comes back.
 *
 *  Every mutation counts what came back. An UPDATE that RLS filters reports
 *  success having changed nothing (CLAUDE.md, the seventh failure), so
 *  `.select()` is on every update and a zero-row result is an error.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type Account = {
  id: string
  email: string | null
  full_name: string
  role: Role
  municipality_id: string | null
  acting_municipality_id: string | null
  is_active: boolean
  created_at: string
}

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async (): Promise<Account[]> => {
      const res = await supabase
        .from('app_user')
        .select('id, email, full_name, role, municipality_id, acting_municipality_id, is_active, created_at')
        .order('created_at', { ascending: true })
      return unwrapList(res as unknown as { data: Account[] | null; error: unknown })
    },
  })
}

export type CreateAccountInput = {
  email: string
  password: string
  full_name: string
  role: Role
  municipality_id: string | null
}

/** What the Edge Function answers. `result` is the key the screen renders. */
export type ManageResult = { ok: boolean; result: string; user_id?: string; detail?: string }

async function invokeManageAccount(body: Record<string, unknown>): Promise<ManageResult> {
  const { data, error } = await supabase.functions.invoke<ManageResult>('manage-account', { body })
  if (error) {
    // A non-2xx answer still carries the function's JSON in `context`; read
    // it, because `result` is the only thing that says what was refused.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = (await ctx.json()) as ManageResult
        if (parsed && typeof parsed.result === 'string') return parsed
      } catch {
        /* fall through */
      }
    }
    throw toAppError(error)
  }
  if (!data || typeof data.result !== 'string') {
    throw { kind: 'unknown', messageKey: 'errors:db.unknown', detail: 'empty answer' } satisfies AppError
  }
  return data
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) => invokeManageAccount({ action: 'create', ...input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export function useSetAccountPassword() {
  return useMutation({
    mutationFn: (input: { user_id: string; password: string }) =>
      invokeManageAccount({ action: 'set_password', ...input }),
  })
}

export type UpdateAccountInput = {
  id: string
  role?: Role
  municipality_id?: string | null
  is_active?: boolean
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateAccountInput): Promise<Account> => {
      const { id, ...patch } = input
      const res = await supabase
        .from('app_user')
        .update(patch)
        .eq('id', id)
        .select('id, email, full_name, role, municipality_id, acting_municipality_id, is_active, created_at')
      if (res.error) throw toAppError(res.error)
      const rows = (res.data ?? []) as Account[]
      // Zero rows back means RLS filtered the update: "not yours" dressed as
      // success. Say so rather than showing an unchanged row with a green toast.
      if (rows.length !== 1) {
        throw { kind: 'forbidden', messageKey: 'errors:db.forbidden', detail: `update touched ${rows.length} rows` } satisfies AppError
      }
      return rows[0]!
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

/**
 * An initial password an admin hands over out of band. 20 characters from an
 * unambiguous alphabet (no 0/O, 1/l/I), generated in the browser with the Web
 * Crypto API. Shown once, never stored by this app.
 */
export function generateInitialPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
