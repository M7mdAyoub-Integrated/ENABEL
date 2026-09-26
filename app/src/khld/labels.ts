import { useTranslation } from 'react-i18next'
import { KHLD_FORMS, KHLD_FORM_IDS, type KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldFormDef } from './types'

/**
 * Label lookups for a Khalidiyah form.
 *
 * Every key here is generated with the form (gen_forms.py writes the
 * definition and both locale files from the same catalogue and workbook), and
 * scripts/check-khld-forms.mjs fails the build when a key the screens will
 * ask for is missing in either language -- the check a dynamic key needs
 * (CLAUDE.md's register, rows ten and eleven).
 *
 * `help` and `extra` test `i18n.exists` first and treat an empty resource as
 * absent, for the reason labels.ts in ../rmth spells out: the missing-key
 * handler answers the KEY when there is no defaultValue, and
 * `returnEmptyString: false` makes t() answer the key for an empty string
 * too, so a bare t() is always truthy and nothing could ever fall back.
 */
export function useKhldLabels(fid: KhldFormId) {
  const { t, i18n } = useTranslation('khld')
  const base = `forms.${fid}`
  const locale = i18n.resolvedLanguage ?? 'en'
  const maybe = (key: string) => {
    if (!i18n.exists(`khld:${key}`)) return undefined
    const v = t(key)
    return v && v !== key ? v : undefined
  }
  return {
    locale,
    t,
    title: t(`${base}.title`),
    short: t(`${base}.short`),
    /** The Form ID(s) of the sheet, a code in both languages: `FORM-05`, `FORM-03 + FORM-04`. */
    sheet: formDef(fid).sheets.join(' + '),
    label: (f: Pick<KhldFieldDef, 'id'>) => t(`${base}.fields.${f.id}.label`),
    help: (f: Pick<KhldFieldDef, 'id'>) => maybe(`${base}.fields.${f.id}.help`),
    /** A bool's two answers ('true', 'false') and a likert's five ('1'..'5'). */
    opt: (f: Pick<KhldFieldDef, 'id'>, value: string) => t(`${base}.fields.${f.id}.opts.${value}`),
    /** A record picker's added option ("Other", "General park visit"). */
    extra: (f: Pick<KhldFieldDef, 'id'>) => maybe(`${base}.fields.${f.id}.extra`),
  }
}

export function formDef(fid: KhldFormId): KhldFormDef {
  return KHLD_FORMS[fid] as unknown as KhldFormDef
}

export function isKhldFormId(x: string | undefined): x is KhldFormId {
  return !!x && (KHLD_FORM_IDS as string[]).includes(x)
}

/** Which form a table belongs to: one table per form. */
export function formOfTable(table: string): KhldFormId | undefined {
  return KHLD_FORM_IDS.find((id) => formDef(id).table === table)
}

/** A field of a form by its Field ID. */
export function fieldOf(def: KhldFormDef, id: string): KhldFieldDef | undefined {
  return def.fields.find((f) => f.id === id)
}
