import type { RefRow } from '../data/refTables'
import type { KhldRecord } from '../data/khld'
import type { KhldCond, KhldFieldDef, KhldFormDef } from './types'

/**
 * A form's answers as the screens hold them, and the one reading of `when`.
 *
 * The form screen edits these, the detail screen reads a saved record into
 * them, and both ask `isOn` whether a field belongs to the answers given --
 * so a field cannot be asked on one screen and shown as "not asked" on the
 * other. What REFUSES a wrong combination is the database (khld_field_rule,
 * 0158); this only decides what is dimmed and what is sent blank.
 */
export type Answers = {
  /** One-column fields, by column: the text, the number, the ref id, 'true' / 'false', a record id. */
  values: Record<string, string>
  /** A record picker's added option chosen, by Field ID (F160 "General park visit", F181 "Other"). */
  extras: Record<string, boolean>
  /** A multi-select, by question: the option ids ticked and the free text of its "Other". */
  multi: Record<string, { ids: string[]; other: string }>
  /** F118 / F131. */
  partners: string[]
  /** F147: 'campaign:<id>' or 'activity:<id>'. */
  occasion: string
}

export const EMPTY_ANSWERS: Answers = { values: {}, extras: {}, multi: {}, partners: [], occasion: '' }

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

/** A saved record as answers. */
export function answersFromRecord(def: KhldFormDef, rec: KhldRecord): Answers {
  const a: Answers = { values: {}, extras: {}, multi: {}, partners: [...rec.partners], occasion: '' }
  const row = rec.row
  for (const f of def.fields) {
    if (f.column) {
      a.values[f.column] = str(row[f.column])
      if (f.other) a.values[f.other] = str(row[f.other])
    }
    if (f.kind === 'record' && f.extra) {
      // "General park visit" has its own column; "Other" contributor is a
      // contribution with no partner (khld_contribution_one_contributor)
      a.extras[f.id] = f.extra.column ? row[f.extra.column] === true : !!f.column && row[f.column] == null
    }
    if (f.kind === 'multi' && f.question) {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      a.multi[f.question] = { ids: rows.map((o) => o.option_id), other: rows.find((o) => o.option_other)?.option_other ?? '' }
    }
    if (f.kind === 'occasion') {
      a.occasion = typeof row['campaign_id'] === 'string' ? `campaign:${row['campaign_id']}`
        : typeof row['activity_id'] === 'string' ? `activity:${row['activity_id']}` : ''
    }
  }
  return a
}

/** The option code a select holds, from its list. */
export function codeOf(refs: Record<string, RefRow[]>, list: string | undefined, id: string | undefined): string | undefined {
  if (!list || !id) return undefined
  return (refs[list] ?? []).find((r) => r.id === id)?.code
}

function holds(def: KhldFormDef, c: KhldCond, a: Answers, refs: Record<string, RefRow[]>, depth: number): boolean {
  const g = def.fields.find((x) => x.id === c.field)
  if (!g) return false
  // a governing field that is itself not asked holds no answer
  if (!isOnAt(def, g, a, refs, depth + 1)) return false
  if (g.kind === 'select' || g.kind === 'id_type') {
    const code = codeOf(refs, g.list, a.values[g.column ?? ''])
    return !!code && c.values.includes(code)
  }
  if (g.kind === 'bool') return c.values.includes(a.values[g.column ?? ''] ?? '')
  if (g.kind === 'record') {
    if (c.values.includes('__extra__') && a.extras[g.id]) return true
    if (c.values.includes('__record__') && !a.extras[g.id] && !!a.values[g.column ?? '']) return true
    return false
  }
  return false
}

function isOnAt(def: KhldFormDef, f: KhldFieldDef, a: Answers, refs: Record<string, RefRow[]>, depth: number): boolean {
  if (!f.when || f.when.length === 0) return true
  if (depth > 8) return false
  return f.when.every((c) => holds(def, c, a, refs, depth))
}

/**
 * Does a field belong to the answers given? A field with no `when` always
 * does. An unanswered governing field means "not yet", which reads as not
 * asked: the field is dimmed until the answer that owns it is given.
 */
export function isOn(def: KhldFormDef, f: KhldFieldDef, a: Answers, refs: Record<string, RefRow[]>): boolean {
  return isOnAt(def, f, a, refs, 0)
}

/** Every ref_khld list a form reads. */
export function listsOf(def: KhldFormDef): string[] {
  const s = new Set<string>()
  for (const f of def.fields) {
    if (f.list) s.add(f.list)
    if (f.held) s.add('event_status')
  }
  return Array.from(s)
}
