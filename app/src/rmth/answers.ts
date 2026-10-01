import type { RefRow } from '../data/refTables'
import type { RmthPick, RmthRecord } from '../data/rmth'
import type { RmthCond, RmthFieldDef, RmthFormDef } from './types'

/**
 * A form's answers as the screens hold them, and the one reading of `when`.
 *
 * The form screen edits these, the detail screen reads a saved record into
 * them, and both ask `isOn` whether a field belongs to the answers given --
 * so a field cannot be asked on one screen and shown as "not asked" on the
 * other. What REFUSES a wrong combination is the database (the guards of
 * 0177, the rules over ticks of 0178); this only decides what is dimmed and
 * what is sent blank.
 */
export type Answers = {
  /** One-column fields, by column: the text, the number, the ref id, 'true' / 'false', a record or person id. */
  values: Record<string, string>
  /** A multi-select, by question: the option ids ticked and the free text of its "Other". */
  multi: Record<string, { ids: string[]; other: string }>
}

export const EMPTY_ANSWERS: Answers = { values: {}, multi: {} }

/** What a condition may look at beyond the answers: the lists, and the activities a picker offers. */
export type AnswerContext = {
  refs: Record<string, RefRow[]>
  /** Activity id -> its category code (AC-02), for FORM-04's and FORM-05's conditions. */
  activityCategory: Record<string, string>
}

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

/** A saved record as answers. */
export function answersFromRecord(def: RmthFormDef, rec: RmthRecord): Answers {
  const a: Answers = { values: {}, multi: {} }
  for (const f of def.fields) {
    if (f.column) {
      a.values[f.column] = str(rec.row[f.column])
      if (f.other) a.values[f.other] = str(rec.row[f.other])
    }
    if (f.kind === 'multi' && f.question) {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      a.multi[f.question] = { ids: rows.map((o) => o.option_id), other: rows.find((o) => o.option_other)?.option_other ?? '' }
    }
  }
  return a
}

/** The option code a select holds, from its list. */
export function codeOf(refs: Record<string, RefRow[]>, list: string | undefined, id: string | undefined): string | undefined {
  if (!list || !id) return undefined
  return (refs[list] ?? []).find((r) => r.id === id)?.code
}

/** The codes a multi holds. */
export function codesOf(refs: Record<string, RefRow[]>, list: string | undefined, ids: readonly string[]): string[] {
  if (!list) return []
  const rows = refs[list] ?? []
  return ids.map((id) => rows.find((r) => r.id === id)?.code).filter((c): c is string => !!c)
}

function holds(def: RmthFormDef, c: RmthCond, a: Answers, ctx: AnswerContext, depth: number): boolean {
  const g = def.fields.find((x) => x.id === c.field)
  if (!g) return false
  // a governing field that is itself not asked holds no answer
  if (!isOnAt(def, g, a, ctx, depth + 1)) return false
  if (c.answered) return !!(a.values[g.column ?? ''] ?? '').trim()
  const values = c.values ?? []
  if (c.via === 'category') {
    const id = a.values[g.column ?? ''] ?? ''
    const cat = id ? ctx.activityCategory[id] : undefined
    return !!cat && values.includes(cat)
  }
  if (g.kind === 'select') {
    const code = codeOf(ctx.refs, g.list, a.values[g.column ?? ''])
    return !!code && values.includes(code)
  }
  if (g.kind === 'multi') {
    const ticked = codesOf(ctx.refs, g.list, a.multi[g.question ?? '']?.ids ?? [])
    return ticked.some((code) => values.includes(code))
  }
  return false
}

function isOnAt(def: RmthFormDef, f: RmthFieldDef, a: Answers, ctx: AnswerContext, depth: number): boolean {
  if (!f.when || f.when.length === 0) return true
  if (depth > 8) return false
  return f.when.every((c) => holds(def, c, a, ctx, depth))
}

/**
 * Does a field belong to the answers given? A field with no `when` always
 * does. An unanswered governing field means "not yet", which reads as not
 * asked: the field is dimmed until the answer that owns it is given.
 */
export function isOn(def: RmthFormDef, f: RmthFieldDef, a: Answers, ctx: AnswerContext): boolean {
  return isOnAt(def, f, a, ctx, 0)
}

/** Every ref_rmth list a form reads: its selects and multis, and the activity categories its conditions name. */
export function listsOf(def: RmthFormDef): string[] {
  const s = new Set<string>()
  for (const f of def.fields) {
    if (f.list) s.add(f.list)
    if (f.table === 'rmth_activity') { s.add('activity_category'); s.add('networking_type') }
    if (f.table === 'rmth_project') s.add('sector')
  }
  return Array.from(s)
}

/** Activity id -> category code, from a picker's rows and the category list. */
export function categoriesOf(picks: readonly RmthPick[] | undefined, refs: Record<string, RefRow[]>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of picks ?? []) {
    const code = codeOf(refs, 'activity_category', p.raw['category_id'] as string | undefined)
    if (code) out[p.id] = code
  }
  return out
}
