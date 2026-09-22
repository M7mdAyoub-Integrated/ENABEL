import { useTranslation } from 'react-i18next'
import { KHLD_FORMS, type KhldFormId } from './forms.generated'
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
 * The optional lookups test `i18n.exists` first and treat an empty resource
 * as absent, for the reason labels.ts in ../rmth spells out: the missing-key
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
    code: t(`${base}.code`),
    indicator: t(`${base}.indicator`),
    who: t(`${base}.who`),
    when: t(`${base}.when`),
    calc: t(`${base}.calc`),
    disaggregation: t(`${base}.disaggregation`),
    definition: t(`${base}.definition`),
    measures: t(`${base}.measures`),
    unit: t(`${base}.unit`),
    source: t(`${base}.source`),
    evidence: t(`${base}.evidence`),
    section: (key: string) => t(`${base}.sections.${key}`),
    label: (f: KhldFieldDef) => t(`${base}.fields.${f.key}.label`),
    help: (f: KhldFieldDef) => maybe(`${base}.fields.${f.key}.help`),
    sub: (f: KhldFieldDef) => maybe(`${base}.fields.${f.key}.sub`),
    opt: (f: KhldFieldDef, value: string) => t(`${base}.fields.${f.key}.opts.${value}`),
    part: (f: KhldFieldDef, column: string) => maybe(`${base}.fields.${f.key}.parts.${column}`),
    partOpt: (f: KhldFieldDef, column: string, value: string) => t(`${base}.fields.${f.key}.partOpts.${column}.${value}`),
  }
}

export function formDef(fid: KhldFormId): KhldFormDef {
  return KHLD_FORMS[fid] as unknown as KhldFormDef
}

/** The fields of a form, flattened. */
export function allFields(def: KhldFormDef): KhldFieldDef[] {
  return def.sections.flatMap((s) => [...s.fields])
}

/**
 * Which form a table's row belongs to. Four forms share
 * khld_milestone_verification and are told apart by milestone_code; every
 * other table has one form, so the row's other columns do not matter.
 */
export function formFor(table: string, row: Record<string, unknown>): KhldFormId | undefined {
  for (const id of Object.keys(KHLD_FORMS) as KhldFormId[]) {
    const d = KHLD_FORMS[id] as unknown as KhldFormDef
    if (d.table !== table) continue
    if (Object.entries(d.filter).every(([k, v]) => row[k] === v)) return id
  }
  return undefined
}

/** `KHLD-SO1-A2` -> `so1`; `KHLD-IMP-0` -> `impact`. Derived, never listed. */
export function khldGroupOf(fid: KhldFormId): 'impact' | 'so1' | 'so2' | 'so3' | 'so4' | undefined {
  const code = (KHLD_FORMS[fid] as { code: string }).code
  const part = code.split('-')[1]
  if (part === 'IMP') return 'impact'
  if (part === 'SO1') return 'so1'
  if (part === 'SO2') return 'so2'
  if (part === 'SO3') return 'so3'
  if (part === 'SO4') return 'so4'
  return undefined
}
