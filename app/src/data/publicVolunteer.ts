import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toAppError, unwrapList } from './errors'
import type { RefRow } from './refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The public volunteer registration (FORM-12, Khalidiyah).
 *
 *  Three objects, all granted to anon for this and nothing else:
 *
 *    v_public_khld_volunteer_option   the nine option lists the form asks
 *                                     (0164): ids, codes, labels, order
 *    v_public_khld_volunteer_partner  the partners a CSO volunteer may name
 *                                     (F215, 0166): id and name, the ones
 *                                     who answered yes to F214
 *    khld_register_volunteer          the write (0161): security definer,
 *                                     throttled, a person on file proves who
 *                                     they are, the row arrives 'submitted'
 *                                     and counts once staff approve it
 *
 *  NOTHING HERE DECIDES ANYTHING. Every check the page makes -- nine digits,
 *  a date of birth, the resident question -- the function makes again, and
 *  its answer is the one shown. It answers the same `cannot_verify` for every
 *  identity failure and for the rate limiter, so the page cannot be used to
 *  learn who is registered, and the page's wording does not pretend to know
 *  which of those it was (CLAUDE.md's register: `cannot_verify` on the three
 *  public screens).
 * ─────────────────────────────────────────────────────────────────────────────
 */

type OptionRow = RefRow & { list: string }

type Loose = {
  from: (t: string) => {
    select: (c: string) => {
      order: (c: string) => Promise<{ data: unknown; error: unknown }>
      eq: (c: string, v: string) => { order: (c: string) => Promise<{ data: unknown; error: unknown }> }
    }
  }
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}
const db = supabase as unknown as Loose

/** The nine lists, by name, each in its order. */
export function usePublicVolunteerOptions() {
  return useQuery({
    queryKey: ['public', 'khldVolunteerOptions'],
    staleTime: 60 * 60_000,
    queryFn: async (): Promise<Record<string, RefRow[]>> => {
      const res = await db.from('v_public_khld_volunteer_option').select('list, id, code, label_en, label_ar, sort_order, allows_free_text').order('sort_order')
      const rows = unwrapList(res as unknown as { data: OptionRow[] | null; error: unknown })
      const out: Record<string, RefRow[]> = {}
      for (const r of rows) (out[r.list] ??= []).push(r)
      return out
    },
  })
}

/** A partner a CSO volunteer may name (F215): live, provides volunteers, of this municipality. */
export type PublicVolunteerPartner = { id: string; name: string }

export function usePublicVolunteerPartners(slug: string) {
  return useQuery({
    queryKey: ['public', 'khldVolunteerPartners', slug],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PublicVolunteerPartner[]> => {
      const res = await db.from('v_public_khld_volunteer_partner').select('id, name').eq('municipality_slug', slug).order('name')
      return unwrapList(res as unknown as { data: PublicVolunteerPartner[] | null; error: unknown })
    },
  })
}

export type VolunteerRegistration = {
  municipality_slug: string
  id_number: string
  full_name: string
  sex: string
  date_of_birth: string
  phone: string
  row: Record<string, unknown>
  options: { question_code: string; option_id: string; option_other: string | null }[]
  client_uuid: string
}

export type RegisterResult =
  | 'registered' | 'already_registered' | 'withdrawn' | 'not_eligible' | 'not_open' | 'cannot_verify' | 'invalid'

export function useRegisterVolunteer() {
  return useMutation({
    mutationKey: ['public', 'khldRegisterVolunteer'],
    retry: false,
    mutationFn: async (p: VolunteerRegistration): Promise<{ result: RegisterResult; reference?: string }> => {
      const { data, error } = await db.rpc('khld_register_volunteer', { p })
      if (error) throw toAppError(error)
      const d = data as { ok: boolean; result: RegisterResult; reference?: string }
      return { result: d.result, ...(d.reference ? { reference: d.reference } : {}) }
    },
  })
}
