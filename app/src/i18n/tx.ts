import type { TFunction } from 'i18next'

/**
 * A plain translate signature that hooks can accept without depending on
 * i18next's overloads.
 *
 * Hooks build already-translated view-models, so they need `t` passed in. But
 * i18next's `TFunction` is heavily overloaded, and under
 * `exactOptionalPropertyTypes` you cannot forward a `Record | undefined` into
 * its optional options parameter. `makeTranslate` adapts once, here, instead of
 * every call site working around it.
 */
export type Translate = (key: string, opts?: Record<string, unknown>) => string

export function makeTranslate(t: TFunction<string[], undefined>): Translate {
  return (key, opts) => (opts === undefined ? String(t(key)) : String(t(key, opts)))
}
