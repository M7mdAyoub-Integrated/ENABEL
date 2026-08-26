/**
 * The seven form modules, and everything that is the same shape across them.
 *
 * Labels are NOT here -- they live in locale files, keyed by module id, so this
 * file stays free of user-visible strings.
 */
export const MODULE_IDS = ['tp', 'pp', 'tc', 'ln', 'ex', 'rg', 'fu'] as const
export type ModuleId = (typeof MODULE_IDS)[number]

export function isModuleId(value: string | undefined): value is ModuleId {
  return !!value && (MODULE_IDS as readonly string[]).includes(value)
}

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
  tp: { id: 'tp', accent: 'teal', indicators: ['A1.2', 'G0.4'], columnCount: 5, filterColumn: 1 },
  pp: { id: 'pp', accent: 'green', indicators: ['C1.1', 'G0.4'], columnCount: 5, filterColumn: 1 },
  tc: { id: 'tc', accent: 'teal', indicators: ['A1.3', 'D0.1'], columnCount: 7, filterColumn: 4 },
  ln: { id: 'ln', accent: 'green', indicators: ['C1.2'], columnCount: 4, filterColumn: 1 },
  ex: { id: 'ex', accent: 'amber', indicators: ['E0.1'], columnCount: 6, filterColumn: 5 },
  rg: { id: 'rg', accent: 'amber', indicators: ['E0.2'], columnCount: 6, filterColumn: 5 },
  fu: { id: 'fu', accent: 'ink', indicators: ['A1', 'B1', 'C1', 'IMP-0'], columnCount: 6, filterColumn: 2 },
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
