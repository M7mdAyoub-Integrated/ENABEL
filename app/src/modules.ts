/**
 * The form modules, and everything that is the same shape across them.
 *
 * Seven of them are the seven forms of the Action Plan. `os` -- the
 * coordination office -- and `gd` -- the guidance log -- are the eighth and
 * ninth, and are deliberately not counted among them: CLAUDE.md describes seven
 * forms because the workbook does. Both are municipal records the workbook has
 * no sheet for, and they exist here because B1.2 and D0.1 cannot be computed
 * without them.
 *
 * Labels are NOT here -- they live in locale files, keyed by module id, so this
 * file stays free of user-visible strings.
 */
export const MODULE_IDS = ['pn', 'tp', 'pp', 'tc', 'ln', 'ex', 'rg', 'fu', 'os', 'gd'] as const
export type ModuleId = (typeof MODULE_IDS)[number]

/**
 * Modules that still exist as ids but no longer have a screen: every
 * `/forms/<id>` shape redirects somewhere else (see App.tsx).
 *
 * They stay in MODULE_IDS so the redirects keep type-checking and so
 * check-module-keys.mjs keeps demanding their locale entries — a redirect can
 * be removed later, and the keys should not have rotted by then.
 *
 * This list is the one place that knows. App.tsx builds its redirects from it,
 * and check-elsewhere-routes.mjs uses it to decide whether a `/forms/<id>`
 * link on the manual-entries screen actually lands anywhere.
 */
export const RETIRED_MODULE_IDS = ['rg', 'ln', 'fu', 'tp', 'pp'] as const
export type RetiredModuleId = (typeof RETIRED_MODULE_IDS)[number]

export function isModuleId(value: string | undefined): value is ModuleId {
  return !!value && (MODULE_IDS as readonly string[]).includes(value)
}

export function isRetiredModule(value: string): boolean {
  return (RETIRED_MODULE_IDS as readonly string[]).includes(value)
}

/**
 * The modules that still have a screen.
 *
 * Used as the key type of DetailScreen's delete map, so `tsc` refuses a live
 * module with no delete wired up. That is not a stylistic preference: a delete
 * with no live mutation behind it navigates away and fires a "Deleted" toast
 * having written nothing, which is indistinguishable from success and has
 * already shipped twice here — `ex` and then `os`.
 */
export type LiveModuleId = Exclude<ModuleId, RetiredModuleId>

export type Accent = 'teal' | 'green' | 'amber' | 'slate' | 'ink'

export type ModuleMeta = {
  id: ModuleId
  accent: Accent
  /** Indicator codes this module feeds. Codes are identifiers, not prose. */
  indicators: string[]
  /** Number of columns the list table renders. */
  columnCount: number
  /** Index of the column the filter dropdown targets. */
  filterColumn: number
}

export const MODULES: Record<ModuleId, ModuleMeta> = {
  // ONE organisation, ONE row. `tp` and `pp` below are retired and redirect
  // here: they listed PARTNERSHIPS, so a body holding both a training and a
  // production-support agreement appeared twice under two headings with no way
  // to tell it was the same organisation. G0.4 counts distinct PARTNERS, so
  // that presentation taught the opposite of what the indicator does.
  //
  // The type has not stopped doing work, it has moved onto the form:
  // `partnership_type` is still what separates A1.2 from C1.1.
  pn: { id: 'pn', accent: 'teal', indicators: ['A1.2', 'C1.1', 'G0.4'], columnCount: 5, filterColumn: 1 },
  tp: { id: 'tp', accent: 'teal', indicators: ['A1.2', 'G0.4'], columnCount: 5, filterColumn: 1 },
  pp: { id: 'pp', accent: 'green', indicators: ['C1.1', 'G0.4'], columnCount: 5, filterColumn: 1 },
  tc: { id: 'tc', accent: 'teal', indicators: ['A1.3', 'D0.1'], columnCount: 7, filterColumn: 4 },
  ln: { id: 'ln', accent: 'green', indicators: ['C1.2'], columnCount: 4, filterColumn: 1 },
  ex: { id: 'ex', accent: 'amber', indicators: ['E0.1'], columnCount: 6, filterColumn: 5 },
  rg: { id: 'rg', accent: 'amber', indicators: ['E0.2'], columnCount: 6, filterColumn: 5 },
  fu: { id: 'fu', accent: 'ink', indicators: ['A1', 'B1', 'C1', 'IMP-0'], columnCount: 6, filterColumn: 2 },
  // B1.2 counts distinct PEOPLE, not visits -- which is why this module is
  // national-ID-first. See data/officeServices.ts.
  os: { id: 'os', accent: 'teal', indicators: ['B1.2'], columnCount: 5, filterColumn: 2 },
  // D0.1 counts distinct PEOPLE receiving guidance, not sessions of it -- the
  // same reason `os` is national-ID-first. See data/guidance.ts.
  gd: { id: 'gd', accent: 'green', indicators: ['D0.1'], columnCount: 5, filterColumn: 2 },
}

/** Tailwind classes per accent. Kept here so no component hardcodes a colour. */
export const ACCENT_TEXT: Record<Accent, string> = {
  teal: 'text-teal',
  green: 'text-green',
  amber: 'text-amber',
  slate: 'text-slate',
  ink: 'text-ink',
}

export const ACCENT_BG: Record<Accent, string> = {
  teal: 'bg-teal',
  green: 'bg-green',
  amber: 'bg-amber',
  slate: 'bg-slate',
  ink: 'bg-ink',
}

export const ACCENT_BORDER: Record<Accent, string> = {
  teal: 'border-teal',
  green: 'border-green',
  amber: 'border-amber',
  slate: 'border-slate',
  ink: 'border-ink',
}

/** Status chip kinds, shared by every module. */
export type ChipKind = 'ok' | 'warn' | 'err' | 'mute' | 'pending'
