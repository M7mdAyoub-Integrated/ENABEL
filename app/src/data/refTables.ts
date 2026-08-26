import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrapList } from './errors'
import { qk } from './queryClient'

/**
 * Reference tables.
 *
 * Every `ref_*` table has the same shape, so one hook serves all of them. They
 * are read-mostly and tiny, so they get a long staleTime -- refetching the list
 * of partner types on every screen change is pure waste on a field connection.
 *
 * `allows_free_text` matters: it is what makes an "Other (please specify)"
 * option require its companion `*_other` column, enforced by a trigger. The UI
 * reads it so the free-text box appears at the right moment rather than the
 * database refusing the save afterwards.
 */
export type RefRow = {
  id: string
  code: string
  label_en: string
  label_ar: string | null
  sort_order: number
  allows_free_text: boolean
}

/** The 18 reference tables, verified against the live schema. */
export type RefTableName =
  | 'ref_activity_type'
  | 'ref_agri_involvement'
  | 'ref_buyer_type'
  | 'ref_disability_type'
  | 'ref_guidance_type'
  | 'ref_nationality'
  | 'ref_office_service_type'
  | 'ref_partner_role_production'
  | 'ref_partner_role_training'
  | 'ref_partner_type_production'
  | 'ref_partner_type_training'
  | 'ref_producer_type'
  | 'ref_product'
  | 'ref_promotional_channel'
  | 'ref_safety_item'
  | 'ref_sales_channel'
  | 'ref_stakeholder_type'
  | 'ref_training_topic'

export function useRefTable(table: RefTableName) {
  return useQuery({
    queryKey: qk.ref(table),
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<RefRow[]> => {
      // `from()` with a union of 18 table names produces a union of 18 row
      // types that the query builder cannot narrow, so the chain is built on a
      // loosely-typed handle. All 18 tables share an identical column set --
      // verified against the live schema, not assumed -- so the shape below is
      // correct for every one of them.
      const db = supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            is: (c: string, v: null) => {
              eq: (c: string, v: boolean) => {
                order: (c: string) => Promise<{ data: RefRow[] | null; error: unknown }>
              }
            }
          }
        }
      }
      const res = await db
        .from(table)
        .select('id, code, label_en, label_ar, sort_order, allows_free_text')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order')
      return unwrapList(res)
    },
  })
}

/**
 * The label for the active locale.
 *
 * Falls back to English when `label_ar` is missing and says so in the console,
 * because a blank option in a dropdown is worse than an untranslated one --
 * see the missing-key handler in i18n/index.ts for the same reasoning.
 */
export function refLabel(row: Pick<RefRow, 'label_en' | 'label_ar' | 'code'> | undefined, locale: string): string {
  if (!row) return ''
  if (locale.startsWith('ar')) {
    if (row.label_ar) return row.label_ar
    console.warn(`[i18n] ref label_ar missing for "${row.code}" — falling back to English.`)
  }
  return row.label_en
}

/** Options ready for a `select` or a `checks` group. */
export function refOptions(rows: RefRow[] | undefined, locale: string) {
  return (rows ?? []).map((r) => ({ value: r.id, label: refLabel(r, locale) }))
}

/**
 * Short aliases.
 *
 * The screens ask for `product`, not `ref_product` -- the `ref_` prefix is a
 * database convention, not something a form schema should care about. This map
 * is the one place the two vocabularies meet.
 */
export const REF_ALIAS = {
  activity_type: 'ref_activity_type',
  agri_involvement: 'ref_agri_involvement',
  buyer_type: 'ref_buyer_type',
  disability_type: 'ref_disability_type',
  guidance_type: 'ref_guidance_type',
  nationality: 'ref_nationality',
  office_service_type: 'ref_office_service_type',
  partner_role_production: 'ref_partner_role_production',
  partner_role_training: 'ref_partner_role_training',
  partner_type_production: 'ref_partner_type_production',
  partner_type_training: 'ref_partner_type_training',
  producer_type: 'ref_producer_type',
  product: 'ref_product',
  promotional_channel: 'ref_promotional_channel',
  safety_item: 'ref_safety_item',
  sales_channel: 'ref_sales_channel',
  stakeholder_type: 'ref_stakeholder_type',
  training_topic: 'ref_training_topic',
} as const satisfies Record<string, RefTableName>

export type RefAlias = keyof typeof REF_ALIAS

/**
 * Reference rows by short name, already unwrapped to an array.
 *
 * Returns `[]` while loading. A form section that renders with no options for
 * a moment is correct here: the section itself is still visible, the select is
 * simply empty until the tiny cached list arrives. Blocking the whole form on a
 * lookup table would be worse.
 */
export function useRef(alias: RefAlias): RefRow[] {
  return useRefTable(REF_ALIAS[alias]).data ?? []
}
