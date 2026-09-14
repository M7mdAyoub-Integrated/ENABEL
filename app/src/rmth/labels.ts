import { useTranslation } from 'react-i18next'
import { RMTH_FORMS, type RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthFormDef } from './types'

/**
 * Label lookups for a Ramtha form.
 *
 * Every key here is generated with the form (gen_forms.py writes the
 * definition and both locale files from the same catalogue), and
 * scripts/check-rmth-forms.mjs fails the build if a field's label is missing
 * in either language -- so these dynamic keys are covered by a check, which
 * CLAUDE.md's register says a dynamic key must be.
 */
export function useRmthLabels(fid: RmthFormId) {
  const { t, i18n } = useTranslation('rmth')
  const base = `forms.${fid}`
  const locale = i18n.resolvedLanguage ?? 'en'
  return {
    locale,
    t,
    title: t(`${base}.title`),
    indicator: t(`${base}.indicator`),
    who: t(`${base}.who`),
    when: t(`${base}.when`),
    calc: t(`${base}.calc`),
    disaggregation: t(`${base}.disaggregation`),
    section: (key: string) => t(`${base}.sections.${key}`),
    label: (f: RmthFieldDef) => t(`${base}.fields.${f.key}.label`),
    help: (f: RmthFieldDef) => (i18n.exists(`rmth:${base}.fields.${f.key}.help`) ? t(`${base}.fields.${f.key}.help`) : undefined),
    sub: (f: RmthFieldDef) => (i18n.exists(`rmth:${base}.fields.${f.key}.sub`) ? t(`${base}.fields.${f.key}.sub`) : undefined),
    empty: (f: RmthFieldDef) => (i18n.exists(`rmth:${base}.fields.${f.key}.empty`) ? t(`${base}.fields.${f.key}.empty`) : undefined),
    criterion: (f: RmthFieldDef) => (i18n.exists(`rmth:${base}.fields.${f.key}.criterion`) ? t(`${base}.fields.${f.key}.criterion`) : undefined),
    opt: (f: RmthFieldDef, value: string, values?: Record<string, string>) =>
      t(`${base}.fields.${f.key}.opts.${value}`, values ?? {}),
    // `i18n.exists` first, like help/sub/empty/criterion above, because
    // parseMissingKeyHandler returns the KEY when there is no defaultValue --
    // so a plain t() here is always truthy and `part(...) || label(f)` in
    // PartView could never fall back. The generator omits the heading for the
    // FIRST part of a `parts` field on purpose: that part carries the field's
    // own label. Without this, nine of those rendered the raw key instead.
    // CLAUDE.md's tenth register row, in a fresh place.
    //
    // And `exists` is not enough on its own. The generator writes the first
    // part's heading as an EMPTY string (the part carries the field's own
    // label), `exists` is true for an empty resource, and i18next is
    // configured with `returnEmptyString: false` -- so t() answered the KEY
    // for those nine parts, and `labelRaw || label(f)` never fell back. It
    // reached the screen as the aria-label of E0.1's "first cohort admitted"
    // radio group, and was missed by a sweep that searched innerText
    // case-sensitively under a `text-transform: uppercase` label. Empty is
    // absent, here, explicitly.
    part: (f: RmthFieldDef, column: string) => {
      const key = `${base}.fields.${f.key}.parts.${column}`
      if (!i18n.exists(`rmth:${key}`)) return undefined
      const v = t(key)
      return v && v !== key ? v : undefined
    },
    partOpt: (f: RmthFieldDef, column: string, value: string) => t(`${base}.fields.${f.key}.partOpts.${column}.${value}`),
  }
}

export function formDef(fid: RmthFormId): RmthFormDef {
  return RMTH_FORMS[fid] as unknown as RmthFormDef
}

/** The fields of a form, flattened. */
export function allFields(def: RmthFormDef): RmthFieldDef[] {
  return def.sections.flatMap((s) => [...s.fields])
}

/** Which form a table+kind belongs to (for links from a record to its form). */
export function formFor(table: string, row: Record<string, unknown>): RmthFormId | undefined {
  for (const id of Object.keys(RMTH_FORMS) as RmthFormId[]) {
    const d = RMTH_FORMS[id] as unknown as RmthFormDef
    if (d.table !== table) continue
    if (Object.entries(d.filter).every(([k, v]) => row[k] === v)) return id
  }
  return undefined
}
