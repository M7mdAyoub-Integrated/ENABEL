import { refLabel, type RefRow } from '../data/refTables'
import type { RmthPick } from '../data/rmth'
import { formatShortDate } from '../lib/format'
import { SEP } from '../ui/glyphs'
import { codeOf } from './answers'

/**
 * How a picked project or activity is named, wherever one is shown: the
 * pickers of AC-07, PA-01, FB-01 and IS-01, the list columns, the detail
 * rows. The sheet gives neither a name: a project is its ID and sub-sector
 * (PJ-01, PJ-04), an activity its ID, category, type and date (AC-01 to
 * AC-04) -- the fields the sheet has, nothing typed for the purpose.
 */
export function pickLabel(table: string | undefined, p: RmthPick, refs: Record<string, RefRow[]>, locale: string): string {
  const r = p.raw
  const parts: string[] = []
  if (p.reference) parts.push(p.reference)
  if (table === 'rmth_project') {
    if (typeof r['sub_sector'] === 'string' && r['sub_sector']) parts.push(r['sub_sector'] as string)
  } else if (table === 'rmth_activity') {
    const cat = (refs['activity_category'] ?? []).find((x) => x.id === r['category_id'])
    if (cat) parts.push(refLabel(cat, locale))
    const nt = (refs['networking_type'] ?? []).find((x) => x.id === r['networking_type_id'])
    if (nt) parts.push(refLabel(nt, locale))
    if (typeof r['start_date'] === 'string') parts.push(formatShortDate(r['start_date'] as string, locale))
  }
  return parts.join(` ${SEP} `) || p.id.slice(0, 8)
}

/** The picks a record field offers: live rows, narrowed to the categories it names; the saved choice always stays. */
export function offered(picks: readonly RmthPick[] | undefined, categories: readonly string[] | undefined,
  refs: Record<string, RefRow[]>, current: string): RmthPick[] {
  return (picks ?? []).filter((p) => {
    if (p.id === current || !categories) return true
    const code = codeOf(refs, 'activity_category', p.raw['category_id'] as string | undefined)
    return !!code && categories.includes(code)
  })
}
