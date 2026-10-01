import { useTranslation } from 'react-i18next'
import { RMTH_FORMS, RMTH_FORM_IDS, type RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthFormDef } from './types'

/**
 * Label lookups for a Ramtha form.
 *
 * Every key here is generated with the form (supabase/ramtha/gen_forms.py
 * writes the definition and both locale files from the same catalogue and
 * workbook), and scripts/check-rmth-forms.mjs fails the build when a key the
 * screens will ask for is missing in either language -- the check a dynamic
 * key needs (CLAUDE.md's register, rows ten and eleven).
 *
 * `help` tests `i18n.exists` first and treats an empty resource as absent:
 * the missing-key handler answers the KEY when there is no defaultValue, and
 * `returnEmptyString: false` makes t() answer the key for an empty string
 * too, so a bare t() is always truthy and nothing could ever fall back (the
 * register's `L.part()` row).
 */
export function useRmthLabels(fid: RmthFormId) {
  const { t, i18n } = useTranslation('rmth')
  const base = `forms.${fid}`
  const locale = i18n.resolvedLanguage ?? 'en'
  const maybe = (key: string) => {
    if (!i18n.exists(`rmth:${key}`)) return undefined
    const v = t(key)
    return v && v !== key ? v : undefined
  }
  return {
    locale,
    t,
    title: t(`${base}.title`),
    short: t(`${base}.short`),
    /** The sheet's Form ID, a code in both languages: `FORM-03`. */
    sheet: formDef(fid).sheet,
    label: (f: Pick<RmthFieldDef, 'id'>) => t(`${base}.fields.${f.id}.label`),
    help: (f: Pick<RmthFieldDef, 'id'>) => maybe(`${base}.fields.${f.id}.help`),
    /** A Yes - No field's two answers ('true', 'false'), the sheet's words. */
    opt: (f: Pick<RmthFieldDef, 'id'>, value: 'true' | 'false') => t(`${base}.fields.${f.id}.opts.${value}`),
  }
}

export function formDef(fid: RmthFormId): RmthFormDef {
  return RMTH_FORMS[fid] as unknown as RmthFormDef
}

export function isRmthFormId(x: string | undefined): x is RmthFormId {
  return !!x && (RMTH_FORM_IDS as string[]).includes(x)
}

/** Which form a table belongs to: one table per form. */
export function formOfTable(table: string): RmthFormId | undefined {
  return RMTH_FORM_IDS.find((id) => formDef(id).table === table)
}

/** A field of a form by its Field ID. */
export function fieldOf(def: RmthFormDef, id: string): RmthFieldDef | undefined {
  return def.fields.find((f) => f.id === id)
}
