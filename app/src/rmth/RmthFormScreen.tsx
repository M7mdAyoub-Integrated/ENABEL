import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Field, type FieldOption, type FieldSpec } from '../ui/Field'
import { BackLink, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { FormSkeleton, WriteError } from '../ui/states'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import { usePersonByNationalId } from '../data/completions'
import { isCompleteNationalId, normaliseNationalId } from '../data/apply'
import { formatShortDate } from '../lib/format'
import {
  rmthRefQuery, useRmthPicker, useRmthRecord, useRmthRef, useSaveRmth, useCreateEnterprise,
  type RmthOption, type RmthRecord, type SavePayload, type SaveResult,
} from '../data/rmth'
import { useRmthThresholds } from '../data/rmthThresholds'
import { allFields, formDef, useRmthLabels } from './labels'
import type { RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthPartDef, RmthTable } from './types'
import { HOOK, EMDASH, REQUIRED, COLON } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One screen renders all seventeen Ramtha forms.
 *
 *  The definition (forms.generated.ts) says what each field IS; the sheet's
 *  words (rmth.json) say what it is CALLED; the database says whether it is
 *  RIGHT. This component only carries the answers from the controls to the
 *  save payload and back.
 *
 *  The person spine (plan §5.2): the national ID is looked up as soon as it
 *  is complete. On file → the name is shown and locked, sex and phone are
 *  filled where known and editable where empty. Not on file → the person is
 *  created by the save. Soft-deleted → the save refuses with person_deleted
 *  and the screen says so; nothing is recreated.
 *
 *  Multi-selects are replaced whole on save: every question the form shows
 *  is listed in option_questions, so unticking every box clears the answer
 *  rather than leaving yesterday's rows behind.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Values = Record<string, string>
type Multi = Record<string, { ids: string[]; other: string }>
type Support = Record<string, { rating: string; other: string }>
type Services = Record<string, { on: boolean; began: string }>

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

/** From a saved record to the form's flat values. */
function valuesFromRecord(rec: RmthRecord | undefined, fields: RmthFieldDef[]): Values {
  const v: Values = {}
  if (!rec) return v
  const take = (col: string) => {
    const raw = rec.row[col]
    // a month column is a date on the first of the month; the control wants YYYY-MM
    v[col] = str(raw)
  }
  for (const f of fields) {
    if (f.type === 'parts') for (const p of f.parts ?? []) take(p.column)
    else if (['text', 'area', 'number', 'date', 'month', 'phone', 'select', 'bool', 'record', 'age'].includes(f.type)) take(f.key)
    if (f.other) take(f.other)
    for (const p of f.parts ?? []) if (p.other) take(p.other)
  }
  for (const k of Object.keys(v)) {
    const f = fields.find((x) => x.key === k) ?? fields.flatMap((x) => x.parts ?? []).find((p) => p.column === k)
    if (f && (f as { type: string }).type === 'month' && v[k]) v[k] = v[k]!.slice(0, 7)
  }
  return v
}

function multiFromRecord(rec: RmthRecord | undefined, questions: string[], others: Record<string, string | undefined>): Multi {
  const m: Multi = {}
  for (const q of questions) {
    const rows = rec?.options.filter((o) => o.question_code === q) ?? []
    const otherRow = rows.find((o) => o.option_other)
    m[q] = { ids: rows.map((o) => o.option_id), other: otherRow?.option_other ?? '' }
  }
  void others
  return m
}

export function RmthFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { form: fidParam, id } = useParams()
  const fid = fidParam as RmthFormId
  const def = formDef(fid)
  const fields = useMemo(() => allFields(def), [def])
  const L = useRmthLabels(fid)
  const { t } = useTranslation(['rmth', 'common', 'forms'])
  const navigate = useNavigate()
  const toast = useToast()

  const rec = useRmthRecord(def.table, mode === 'edit' ? id : undefined)
  const save = useSaveRmth(def.table)

  const questions = useMemo(() => {
    const qs: string[] = []
    for (const f of fields) {
      if (f.type === 'multi' && f.question) qs.push(f.question)
      for (const p of f.parts ?? []) if (p.type === 'multi' && p.question) qs.push(p.question)
    }
    return qs
  }, [fields])

  const [values, setValues] = useState<Values>({})
  const [multi, setMulti] = useState<Multi>({})
  const [support, setSupport] = useState<Support>({})
  const [services, setServices] = useState<Services>({})
  const [proposalIds, setProposalIds] = useState<string[]>([])
  const [person, setPerson] = useState({ nid: '', nid2: '', name: '', phone: '', sex: '' })
  const [touched, setTouched] = useState(false)
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // ── hydrate once from the record in edit mode ────────────────────────────
  //
  // Adjusted during render rather than in an effect, which is the same shape
  // FormScreen uses for the same job. An effect here means React commits the
  // empty form first and then re-renders with the record -- a visible flash of
  // blank required fields, and `react-hooks/set-state-in-effect` refuses it.
  //
  // Keyed on the record id, not a boolean: a later refetch of the SAME record
  // must not wipe out edits the user has already typed, and navigating to a
  // different record must re-hydrate.
  if (mode === 'edit' && id && rec.data && loadedId !== id) {
    setLoadedId(id)
    setValues(valuesFromRecord(rec.data, fields))
    setMulti(multiFromRecord(rec.data, questions, {}))
    const sp: Support = {}
    for (const s of rec.data.support) sp[s.component_id] = { rating: s.rating_id, other: s.component_other ?? '' }
    setSupport(sp)
    const sv: Services = {}
    for (const s of rec.data.servicesLive) sv[s.service_id] = { on: true, began: s.began_on ?? '' }
    setServices(sv)
    setProposalIds(rec.data.proposalIds)
    if (rec.data.person) {
      setPerson({
        nid: rec.data.person.national_id, nid2: rec.data.person.national_id,
        name: rec.data.person.full_name, phone: rec.data.person.phone ?? '', sex: rec.data.person.sex ?? '',
      })
    }
  }

  const hasPerson = fields.some((f) => f.type === 'nid')
  const personLocked = mode === 'edit' && !!rec.data?.person
  const nidNorm = normaliseNationalId(person.nid)
  const lookup = usePersonByNationalId(hasPerson && !personLocked && isCompleteNationalId(nidNorm) ? nidNorm : '')
  const onFile = !!lookup.data
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null)

  // ── an existing national ID prefills identity and locks it (plan §5.2) ───
  //
  // Same during-render adjustment as the hydration above, keyed on the
  // national ID the lookup answered for. Keying on it rather than on
  // `lookup.data` identity matters: react-query returns a new object on every
  // refetch, so an effect keyed on the object would overwrite the enumerator's
  // typing each time the query refreshed.
  //
  // Only NAME is authoritative -- it is overwritten. Phone and sex fill only
  // where the enumerator has left them empty, and age only where it is unset,
  // because the person on the phone today may have a newer number than the
  // record does.
  if (lookup.data && prefilledFrom !== nidNorm) {
    const found = lookup.data
    setPrefilledFrom(nidNorm)
    setPerson((p) => ({
      ...p,
      name: found.fullName,
      phone: p.phone || (found.phone ?? ''),
      sex: p.sex || (found.sex ?? ''),
    }))
    setValues((v) => (v['age_years'] || found.ageRecorded == null ? v : { ...v, age_years: String(found.ageRecorded) }))
  }

  const setValue = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const toggleMulti = (q: string, id: string) =>
    setMulti((m) => {
      const cur = m[q] ?? { ids: [], other: '' }
      const ids = cur.ids.includes(id) ? cur.ids.filter((x) => x !== id) : [...cur.ids, id]
      return { ...m, [q]: { ...cur, ids } }
    })

  /* ── validation ───────────────────────────────────────────────────────── */
  //
  // Computed on every render, whether or not the form has been touched, and
  // `touched` only decides whether the messages are SHOWN. It used to be the
  // other way round -- nothing computed until touched -- and `submit()` set
  // touched and then read `invalid` from the same render, which had been
  // computed while touched was still false. So the first click on any
  // incomplete form went to the database with the blanks in it: the
  // not-null refusal came back as raw SQL, and "this field is required"
  // appeared beside it a render later. The second click stopped correctly,
  // which is why it looked like it worked.
  const errors: Record<string, string> = {}
  {
    for (const f of fields) {
      if (f.type === 'nid' && !personLocked) {
        if (!isCompleteNationalId(nidNorm)) errors[f.key] = t('rmth:form.nidInvalid')
      }
      if (f.type === 'nid_confirm' && !personLocked) {
        if (normaliseNationalId(person.nid2) !== nidNorm) errors[f.key] = t('rmth:form.nidMismatch')
      }
      if (f.type === 'person_name' && !personLocked && !onFile && !person.name.trim()) errors[f.key] = t('rmth:form.required')
      if (f.type === 'person_sex' && f.required && !person.sex) errors[f.key] = t('rmth:form.required')
      if (f.required && ['text', 'area', 'number', 'date', 'month', 'select', 'bool', 'record', 'age'].includes(f.type) && !values[f.key]) {
        errors[f.key] = t('rmth:form.required')
      }
      if (f.required && f.type === 'multi' && f.question && !(multi[f.question]?.ids.length)) errors[f.key] = t('rmth:form.required')
      if (f.required && f.type === 'records' && proposalIds.length === 0) errors[f.key] = t('rmth:form.required')
      for (const p of f.parts ?? []) {
        if (p.required && p.type !== 'multi' && !values[p.column]) errors[f.key] = t('rmth:form.required')
      }
    }
  }
  const invalid = Object.keys(errors).length > 0
  const shown = touched ? errors : {}

  /* ── the payload ──────────────────────────────────────────────────────── */
  function buildPayload(): SavePayload {
    const row: Record<string, unknown> = {}
    const put = (col: string, type: string, raw: string | undefined) => {
      const v = (raw ?? '').trim()
      if (type === 'number' || type === 'age') row[col] = v === '' ? null : Number(v)
      else if (type === 'bool') row[col] = v === '' ? null : v === 'true'
      else if (type === 'month') row[col] = v === '' ? null : `${v}-01`
      else row[col] = v === '' ? null : v
    }
    for (const f of fields) {
      if (f.type === 'parts') {
        for (const p of f.parts ?? []) {
          if (p.type === 'multi') continue
          put(p.column, p.type, values[p.column])
          if (p.other) put(p.other, 'text', values[p.other])
        }
        continue
      }
      if (['text', 'area', 'number', 'date', 'month', 'phone', 'select', 'bool', 'record', 'age'].includes(f.type)) {
        put(f.key, f.type, values[f.key])
        if (f.mirror) put(f.mirror, f.type, values[f.key])
        if (f.other) put(f.other, 'text', values[f.other])
      }
    }
    if (mode === 'new') for (const [k, v] of Object.entries(def.fixed)) row[k] = v

    const options: RmthOption[] = []
    for (const q of questions) {
      const m = multi[q]
      if (!m) continue
      for (const oid of m.ids) {
        const list = refs[q] ?? []
        const r = list.find((x) => x.id === oid)
        options.push({ question_code: q, option_id: oid, option_other: r?.allows_free_text ? m.other || null : null })
      }
    }

    const payload: SavePayload = { row, option_questions: questions, options }
    if (mode === 'edit' && id) payload.id = id
    if (hasPerson && !personLocked) {
      payload.person = {
        national_id: nidNorm,
        ...(person.name.trim() ? { full_name: person.name.trim() } : {}),
        ...(person.phone.trim() ? { phone: person.phone.trim() } : {}),
        ...(person.sex ? { sex: person.sex } : {}),
        ...(values['age_years'] ? { age_years: Number(values['age_years']) } : {}),
      }
    }
    if (fields.some((f) => f.type === 'grid')) {
      payload.support = Object.entries(support)
        .filter(([, s]) => s.rating)
        .map(([component_id, s]) => ({ component_id, rating_id: s.rating, component_other: s.other || null }))
    }
    if (fields.some((f) => f.type === 'services')) {
      payload.services_live = Object.entries(services)
        .filter(([, s]) => s.on)
        .map(([service_id, s]) => ({ service_id, began_on: s.began || null }))
    }
    if (fields.some((f) => f.type === 'records')) payload.proposal_ids = proposalIds
    return payload
  }

  /* ── reference lists the form needs ───────────────────────────────────── */
  const refs = useRefsFor(fields)

  async function submit() {
    setTouched(true)
    setOutcome(null)
    if (invalid) return
    const res = await save.mutateAsync(buildPayload())
    setOutcome(res)
    if (res.ok) {
      toast.fire({
        tag: t('rmth:form.saved'),
        title: res.reference ? t('rmth:form.savedRef', { reference: res.reference }) : L.title,
        sub: L.indicator,
      })
      navigate(`/rmth/${fid}/${res.id}`)
    }
  }

  if (mode === 'edit' && rec.isLoading) {
    return (
      <>
        <PageHead eyebrow={L.indicator} title={t('rmth:form.editTitle', { title: L.title })} size="md" />
        <FormSkeleton />
      </>
    )
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(mode === 'edit' && id ? `/rmth/${fid}/${id}` : `/rmth/${fid}`)}>{t('rmth:form.back')}</BackLink>}
        eyebrow={L.indicator}
        title={mode === 'new' ? t('rmth:form.newTitle', { title: L.title }) : t('rmth:form.editTitle', { title: L.title })}
        size="md"
      />

      {/* The specification, verbatim, above the form: who fills it, when, and
          how the indicator is calculated from it. It is what the enumerator is
          working towards, so it is not hidden in a help panel. */}
      <div className="grid gap-x-6 gap-y-3 border-[1.5px] border-ink p-4 sm:grid-cols-[auto_1fr]">
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('rmth:form.who')}</span>
        <span className="text-[14px] text-body">{L.who}</span>
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('rmth:form.when')}</span>
        <span className="text-[14px] text-body">{L.when}</span>
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('rmth:form.calcTitle')}</span>
        <span className="text-[14px] font-medium text-ink" style={{ textWrap: 'pretty' }}>{L.calc}</span>
      </div>

      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} /> : null}

      {def.sections.map((s) => (
        <section key={s.key} className="mt-[34px]">
          <SectionRule title={L.section(s.key)} />
          <div className="mt-5 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
            {s.fields.map((f) => (
              <FieldView
                key={f.key}
                f={f}
                fid={fid}
                mode={mode}
                values={values}
                setValue={setValue}
                multi={multi}
                toggleMulti={toggleMulti}
                setMultiOther={(q, v) => setMulti((m) => ({ ...m, [q]: { ...(m[q] ?? { ids: [] }), ids: m[q]?.ids ?? [], other: v } }))}
                support={support}
                setSupport={setSupport}
                services={services}
                setServices={setServices}
                proposalIds={proposalIds}
                setProposalIds={setProposalIds}
                person={person}
                setPerson={setPerson}
                personLocked={personLocked}
                onFile={onFile}
                lookingUp={lookup.isFetching}
                error={shown[f.key]}
                refs={refs}
                record={rec.data}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-[34px] flex flex-col gap-4 border-t-[3px] border-ink pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{L.indicator}</span>
        <div className="flex gap-2.5">
          <SecondaryButton onClick={() => navigate(mode === 'edit' && id ? `/rmth/${fid}/${id}` : `/rmth/${fid}`)}>
            {t('rmth:form.cancel')}
          </SecondaryButton>
          <PrimaryButton onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? t('rmth:form.saving') : t('rmth:form.save')}
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}

/** Loads every ref_rmth list the form reads, keyed by list name. */
/**
 * The lists a DERIVED (read-only) field renders through: the derived key
 * names a column on another record, and the list its value is a row of. Kept
 * here, next to the derivations DerivedField knows, so the form screen and
 * the detail screen load the same lists -- the form screen did not, and E0.3
 * showed "Not set" for a cycle's modules and deliverer the moment the cycle
 * was chosen, while the detail screen (which had them by hand) showed both.
 */
export const DERIVED_LISTS: Readonly<Record<string, string>> = {
  so10_threshold: 'so10_threshold',
  cycle_delivered_by: 'e03_delivered_by',
  cycle_modules: 'e03_module',
}

export function refListsOf(fields: RmthFieldDef[]): string[] {
  const s = new Set<string>()
  for (const f of fields) {
    for (const k of [f.ref, f.question, f.components, f.ratings, f.services]) if (k) s.add(k)
    for (const p of f.parts ?? []) for (const k of [p.ref, p.question]) if (k) s.add(k)
    if (f.derived && DERIVED_LISTS[f.derived]) s.add(DERIVED_LISTS[f.derived]!)
  }
  return Array.from(s)
}

function useRefsFor(fields: RmthFieldDef[]): Record<string, RefRow[]> {
  const names = useMemo(() => refListsOf(fields), [fields])
  // useQueries, not a loop of hooks: the same component serves every form,
  // and moving from one form to another changes how many lists it reads.
  const results = useQueries({ queries: names.map((n) => rmthRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  names.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

export function RefusalBand({ outcome }: { outcome: Exclude<SaveResult, { ok: true }> }) {
  const { t } = useTranslation(['rmth', 'errors'])
  const text =
    outcome.result === 'not_found' ? t('rmth:form.notFound')
    : outcome.result === 'person_deleted' ? t('rmth:form.personDeleted')
    : outcome.result === 'unknown_column' ? t('rmth:form.unknownColumn', { column: outcome.column ?? '?' })
    : t('rmth:form.invalid', { message: outcome.message ?? outcome.constraint ?? outcome.result })
  return (
    <div role="alert" className="mt-[18px] flex items-baseline gap-[14px] bg-error px-[18px] py-[14px] text-bg">
      <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('forms:notSaved', { defaultValue: 'Not saved' })}</span>
      <span className="text-[15px] font-medium">{text}</span>
    </div>
  )
}

/* ── one field ─────────────────────────────────────────────────────────── */

type FieldViewProps = {
  f: RmthFieldDef
  fid: RmthFormId
  mode: 'new' | 'edit'
  values: Values
  setValue: (k: string, v: string) => void
  multi: Multi
  toggleMulti: (q: string, id: string) => void
  setMultiOther: (q: string, v: string) => void
  support: Support
  setSupport: (u: (s: Support) => Support) => void
  services: Services
  setServices: (u: (s: Services) => Services) => void
  proposalIds: string[]
  setProposalIds: (u: (s: string[]) => string[]) => void
  person: { nid: string; nid2: string; name: string; phone: string; sex: string }
  setPerson: (u: (p: { nid: string; nid2: string; name: string; phone: string; sex: string }) => { nid: string; nid2: string; name: string; phone: string; sex: string }) => void
  personLocked: boolean
  onFile: boolean
  lookingUp: boolean
  // `| undefined` explicitly, because exactOptionalPropertyTypes is on and both
  // of these are passed from a possibly-absent source -- an index into `errors`
  // and a query that has not resolved. Same shape as data/errors.ts.
  error?: string | undefined
  refs: Record<string, RefRow[]>
  record?: RmthRecord | undefined
}

function FieldView(p: FieldViewProps) {
  const { f, fid } = p
  const L = useRmthLabels(fid)
  const { t } = useTranslation(['rmth', 'common'])
  const label = L.label(f)
  const help = L.help(f)
  const sub = L.sub(f)
  const base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'> = {
    key: f.key,
    label,
    ...(help ? { help } : {}),
    ...(f.required ? { required: true } : {}),
    ...(p.error ? { error: p.error } : {}),
    ...(f.counting ? { tag: t('rmth:form.countingField'), tagAccent: 'amber' as const } : {}),
  }
  const opts = (rows: RefRow[]): FieldOption[] => rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) }))
  const v = (k: string) => p.values[k] ?? ''

  /* the person spine */
  if (f.type === 'nid') {
    return (
      <Field
        spec={{ ...base, type: 'text', ltr: true, placeholder: '000000000', span: 6,
          ...(p.personLocked ? { disabled: true } : {}),
          ...(!p.personLocked && isCompleteNationalId(normaliseNationalId(p.person.nid))
            ? { match: { text: p.lookingUp ? t('rmth:form.lookingUp') : p.onFile ? t('rmth:form.onFile') : t('rmth:form.newPerson'), ok: true } }
            : {}) }}
        value={p.person.nid}
        onChange={(x) => p.setPerson((s) => ({ ...s, nid: x }))}
      />
    )
  }
  if (f.type === 'nid_confirm') {
    if (p.personLocked) return null
    return (
      <Field
        spec={{ ...base, type: 'text', ltr: true, placeholder: '000000000', span: 6 }}
        value={p.person.nid2}
        onChange={(x) => p.setPerson((s) => ({ ...s, nid2: x }))}
      />
    )
  }
  if (f.type === 'person_name') {
    const locked = p.personLocked || p.onFile
    return (
      <Field
        spec={{ ...base, type: locked ? 'readonly' : 'text', span: 6, ...(locked ? { text: p.person.name } : {}) }}
        value={p.person.name}
        onChange={(x) => p.setPerson((s) => ({ ...s, name: x }))}
      />
    )
  }
  if (f.type === 'person_phone') {
    return (
      <Field
        spec={{ ...base, type: 'tel', ltr: true, span: 6, placeholder: '07XXXXXXXX' }}
        value={p.person.phone}
        onChange={(x) => p.setPerson((s) => ({ ...s, phone: x }))}
      />
    )
  }
  if (f.type === 'person_sex') {
    const options = (f.options ?? []).map((val) => ({ value: val, label: L.opt(f, val) }))
    const locked = (p.personLocked || p.onFile) && !!p.person.sex
    return (
      <Field
        spec={{ ...base, type: locked ? 'readonly' : 'radio', span: 6, options,
          ...(locked ? { text: options.find((o) => o.value === p.person.sex)?.label ?? p.person.sex } : {}) }}
        value={p.person.sex}
        onChange={(x) => p.setPerson((s) => ({ ...s, sex: x }))}
      />
    )
  }
  if (f.type === 'age') {
    return <Field spec={{ ...base, type: 'number', span: 3 }} value={v('age_years')} onChange={(x) => p.setValue('age_years', x)} />
  }

  /* plain columns */
  if (f.type === 'text' || f.type === 'phone') {
    return <Field spec={{ ...base, type: f.type === 'phone' ? 'tel' : 'text', ...(sub ? { placeholder: sub } : {}), ...(f.type === 'phone' ? { ltr: true } : {}) }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
  }
  if (f.type === 'area') {
    return <Field spec={{ ...base, type: 'area', ...(sub ? { placeholder: sub } : {}) }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
  }
  if (f.type === 'number') {
    return <Field spec={{ ...base, type: 'number', span: 4, ...(sub ? { placeholder: sub } : {}) }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
  }
  if (f.type === 'date') {
    return <Field spec={{ ...base, type: 'date', span: 4 }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
  }
  if (f.type === 'month') {
    return <MonthField spec={{ ...base, span: 4 }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
  }
  if (f.type === 'select') {
    const rows = p.refs[f.ref ?? ''] ?? []
    const chosen = rows.find((r) => r.id === v(f.key))
    const empty = L.empty(f)
    return (
      <>
        <Field
          spec={{ ...base, type: 'select', span: 6, options: opts(rows), ...(empty ? { placeholder: empty } : {}) }}
          value={v(f.key)}
          onChange={(x) => p.setValue(f.key, x)}
        />
        {f.other && chosen?.allows_free_text ? (
          <Field spec={{ key: f.other, label: t('rmth:form.specify'), type: 'text', span: 6, required: true }} value={v(f.other)} onChange={(x) => p.setValue(f.other!, x)} />
        ) : null}
      </>
    )
  }
  if (f.type === 'multi') {
    const q = f.question ?? ''
    const rows = p.refs[q] ?? []
    const m = p.multi[q] ?? { ids: [], other: '' }
    const otherOn = rows.some((r) => r.allows_free_text && m.ids.includes(r.id))
    return (
      <>
        <Field spec={{ ...base, type: 'checks', twoCol: rows.length > 4, options: opts(rows) }} value={m.ids} onChange={() => {}} onToggle={(id) => p.toggleMulti(q, id)} />
        {otherOn ? (
          <Field spec={{ key: `${q}_other`, label: t('rmth:form.specify'), type: 'text', span: 6, required: true }} value={m.other} onChange={(x) => p.setMultiOther(q, x)} />
        ) : null}
      </>
    )
  }
  if (f.type === 'bool') {
    const options = (f.options ?? []).map((val) => ({ value: val, label: L.opt(f, val) }))
    return (
      <>
        <Field spec={{ ...base, type: 'radio', big: true, options }} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} />
        {f.rule ? <RuleNote ruleKey={f.rule} /> : null}
      </>
    )
  }
  if (f.type === 'record') {
    return <RecordPickerField base={base} f={f} value={v(f.key)} onChange={(x) => p.setValue(f.key, x)} sub={sub} empty={L.empty(f)} />
  }
  if (f.type === 'records') {
    return <RecordsField base={base} f={f} ids={p.proposalIds} setIds={p.setProposalIds} sub={sub} />
  }
  if (f.type === 'parts') {
    return (
      <div className="col-span-12">
        <div className="mb-[7px] flex flex-wrap items-baseline gap-2.5">
          <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            {label}{f.required ? <span className="text-error"> {REQUIRED}</span> : null}
          </span>
          {f.counting ? <span className="px-2 py-0.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-bg bg-amber"><span aria-hidden="true">{HOOK} </span>{t('rmth:form.countingField')}</span> : null}
        </div>
        {help ? <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{help}</p> : null}
        <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px] border-s-[3px] border-border-default ps-4">
          {(f.parts ?? []).map((part) => (
            <PartView key={part.column} f={f} part={part} fid={fid} p={p} />
          ))}
        </div>
        {p.error ? <div role="alert" className="mt-2 text-[13.5px] font-semibold text-error">{p.error}</div> : null}
      </div>
    )
  }
  if (f.type === 'grid') {
    const comps = p.refs[f.components ?? ''] ?? []
    const ratings = p.refs[f.ratings ?? ''] ?? []
    return (
      <div className="col-span-12">
        <div className="mb-[7px] font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">{label}</div>
        {help ? <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{help}</p> : null}
        <div className="overflow-x-auto border-[1.5px] border-ink">
          <table className="w-full min-w-[520px] text-[14px]">
            <thead>
              <tr className="border-b-[3px] border-ink font-narrow text-[11px] uppercase tracking-[0.12em]">
                <th className="px-3 py-2 text-start">{t('rmth:form.gridComponent')}</th>
                <th className="px-3 py-2 text-start">{t('rmth:form.gridRating')}</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c) => {
                const cur = p.support[c.id] ?? { rating: '', other: '' }
                return (
                  <tr key={c.id} className="border-b border-border-default">
                    <td className="px-3 py-2 align-top">
                      {refLabel(c, L.locale)}
                      {c.allows_free_text && cur.rating ? (
                        <input
                          type="text"
                          value={cur.other}
                          placeholder={t('rmth:form.specify')}
                          onChange={(e) => p.setSupport((s) => ({ ...s, [c.id]: { ...cur, other: e.target.value } }))}
                          className="mt-1 block w-full border-[1.5px] border-ink bg-input px-2 py-1 text-[14px]"
                        />
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={cur.rating}
                        onChange={(e) => p.setSupport((s) => ({ ...s, [c.id]: { ...cur, rating: e.target.value } }))}
                        className="w-full min-h-10 border-[1.5px] border-ink bg-input px-2 text-[14px]"
                      >
                        <option value="">{t('rmth:form.choose')}</option>
                        {ratings.map((r) => <option key={r.id} value={r.id}>{refLabel(r, L.locale)}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  if (f.type === 'services') {
    const rows = p.refs[f.services ?? ''] ?? []
    const live = Object.values(p.services).filter((s) => s.on).length
    const criterion = L.criterion(f)
    return (
      <div className="col-span-12">
        <div className="mb-[7px] font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">{label}</div>
        {sub ? <p className="mb-2 mt-0 text-[13.5px] text-muted">{sub}</p> : null}
        <div className="grid grid-cols-1 gap-[1.5px] border-[1.5px] border-ink bg-hairline sm:grid-cols-2">
          {rows.map((r) => {
            const cur = p.services[r.id] ?? { on: false, began: '' }
            return (
              <div key={r.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${cur.on ? 'bg-ink text-bg' : 'bg-input text-ink'}`}>
                <button type="button" aria-pressed={cur.on} onClick={() => p.setServices((s) => ({ ...s, [r.id]: { ...cur, on: !cur.on } }))} className="flex min-h-9 flex-1 items-center gap-2 text-start text-[14px]">
                  <span aria-hidden="true" className={`h-[14px] w-[14px] flex-none border-[1.5px] ${cur.on ? 'border-bg bg-bg' : 'border-ink'}`} />
                  {refLabel(r, L.locale)}
                </button>
                {cur.on ? (
                  <input type="date" aria-label={t('rmth:form.serviceBegan')} value={cur.began} onChange={(e) => p.setServices((s) => ({ ...s, [r.id]: { ...cur, began: e.target.value } }))} className="min-h-9 border-[1.5px] border-bg bg-input px-2 text-[13px] text-ink" />
                ) : null}
              </div>
            )
          })}
        </div>
        {criterion ? <p className={`mt-2 text-[13.5px] font-semibold ${live >= 2 ? 'text-success' : 'text-muted'}`}>{criterion} {EMDASH} {live}</p> : null}
        {help ? <p className="mt-2 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{help}</p> : null}
      </div>
    )
  }
  if (f.type === 'deliveries') {
    return (
      <Field spec={{ ...base, type: 'readonly', text: t('rmth:form.deliveriesSavedSeparately'), ...(sub ? { note: sub } : {}) }} value="" onChange={() => {}} />
    )
  }
  if (f.type === 'readonly') {
    return <DerivedField base={base} f={f} fid={fid} record={p.record} values={p.values} mode={p.mode} refs={p.refs} sub={sub} />
  }
  return null
}

/** A month is entered as YYYY-MM and stored as the first of the month. */
function MonthField({ spec, value, onChange }: { spec: Omit<FieldSpec, 'type'>; value: string; onChange: (v: string) => void }) {
  return (
    <div className={`min-w-0 ${spec.span === 4 ? 'col-span-12 sm:col-span-6 lg:col-span-4' : 'col-span-12'}`}>
      <label className="mb-[7px] block font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
        {spec.label}{spec.required ? <span className="text-error"> {REQUIRED}</span> : null}
      </label>
      <input type="month" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr"
        className={`w-full min-h-11 border-[1.5px] bg-input px-[13px] py-[11px] text-[15px] text-ink ${spec.error ? 'border-error' : 'border-ink'}`} />
      {spec.help ? <div className="mt-[7px] text-[13.5px] text-muted">{spec.help}</div> : null}
      {spec.error ? <div role="alert" className="mt-2 text-[13.5px] font-semibold text-error">{spec.error}</div> : null}
    </div>
  )
}

function PartView({ f, part, fid, p }: { f: RmthFieldDef; part: RmthPartDef; fid: RmthFormId; p: FieldViewProps }) {
  const L = useRmthLabels(fid)
  const { t } = useTranslation('rmth')
  const labelRaw = L.part(f, part.column)
  const label = labelRaw || L.label(f)
  const v = (k: string) => p.values[k] ?? ''
  const spec = { key: part.column, label, ...(part.required ? { required: true } : {}) }
  if (part.type === 'text' || part.type === 'phone') {
    return <Field spec={{ ...spec, type: part.type === 'phone' ? 'tel' : 'text', span: 6, ...(part.type === 'phone' ? { ltr: true } : {}) }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'number') {
    return <Field spec={{ ...spec, type: 'number', span: 4 }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'date') {
    return <Field spec={{ ...spec, type: 'date', span: 4 }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'month') {
    return <MonthField spec={{ ...spec, span: 4 }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'bool') {
    const options = (part.options ?? []).map((val) => ({ value: val, label: L.partOpt(f, part.column, val) }))
    return <Field spec={{ ...spec, type: 'radio', span: 6, options }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'select') {
    const rows = p.refs[part.ref ?? ''] ?? []
    const chosen = rows.find((r) => r.id === v(part.column))
    return (
      <>
        <Field spec={{ ...spec, type: 'select', span: 6, options: rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) })) }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
        {part.other && chosen?.allows_free_text ? (
          <Field spec={{ key: part.other, label: t('form.specify'), type: 'text', span: 6, required: true }} value={v(part.other)} onChange={(x) => p.setValue(part.other!, x)} />
        ) : null}
      </>
    )
  }
  if (part.type === 'multi') {
    const q = part.question ?? ''
    const rows = p.refs[q] ?? []
    const m = p.multi[q] ?? { ids: [], other: '' }
    return <Field spec={{ ...spec, type: 'checks', twoCol: rows.length > 4, options: rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) })) }} value={m.ids} onChange={() => {}} onToggle={(id) => p.toggleMulti(q, id)} />
  }
  if (part.type === 'record') {
    return <RecordPickerField base={{ key: part.column, label }} f={{ key: part.column, type: 'record', ...(part.table ? { table: part.table } : {}), ...(part.kind ? { kind: part.kind } : {}), ...(part.create ? { create: true } : {}) }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  return null
}

/** A select over another Ramtha table's live rows, by reference and title. */
function RecordPickerField({ base, f, value, onChange, sub, empty }: {
  base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'>
  f: Pick<RmthFieldDef, 'key' | 'type' | 'table' | 'kind' | 'create'>
  value: string
  onChange: (v: string) => void
  sub?: string | undefined
  empty?: string | undefined
}) {
  const { t } = useTranslation('rmth')
  const picks = useRmthPicker(f.table as RmthTable | undefined, f.kind)
  const [newName, setNewName] = useState('')
  const create = useCreateEnterprise()
  const options: FieldOption[] = (picks.data ?? []).map((r) => ({ value: r.id, label: r.date ? `${r.label} · ${r.date}` : r.label }))
  return (
    <>
      <Field
        spec={{ ...base, type: 'select', span: 6, options, placeholder: empty ?? t('form.recordPicker.none'), ...(sub && !base.help ? { help: sub } : {}) }}
        value={value}
        onChange={onChange}
      />
      {f.create && !value && f.table === 'rmth_training_cycle' ? (
        <NewIncubatorDesignCycle onCreated={onChange} />
      ) : null}
      {f.create && !value && f.table === 'rmth_enterprise' ? (
        <div className="col-span-12 flex flex-wrap items-end gap-2 sm:col-span-6">
          <div className="min-w-0 flex-1">
            <label className="mb-[7px] block font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">{t('form.enterpriseName')}</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full min-h-11 border-[1.5px] border-ink bg-input px-[13px] py-[11px] text-[15px]" />
          </div>
          <SecondaryButton
            disabled={!newName.trim() || create.isPending}
            onClick={() => {
              void create.mutateAsync({ row: { name: newName.trim() } }).then((res) => {
                if (res.ok) { onChange(res.id); setNewName('') }
              })
            }}
          >
            {t('form.createEnterprise')}
          </SecondaryButton>
        </div>
      ) : null}
    </>
  )
}

/**
 * An incubator-design cycle, added from the E0.3 form.
 *
 * No other form creates one: C1.1 makes employability cycles and F0.2's log
 * makes entrepreneurship deliveries, so without this the E0.3 picker had
 * nothing to pick and the form could never be saved -- CLAUDE.md's register,
 * a control with nothing behind it. The E0.3 sheet carries the cycle block
 * on the participant form itself (reference and title; dates and total
 * hours; delivered by; modules covered), which is what this asks for. Saved
 * through the same save function as every other record, so the RMTH-ID
 * reference is issued by the database (0124), then selected.
 */
function NewIncubatorDesignCycle({ onCreated }: { onCreated: (id: string) => void }) {
  const { t, i18n } = useTranslation('rmth')
  const locale = i18n.resolvedLanguage ?? 'en'
  const [open, setOpen] = useState(false)
  const [d, setD] = useState({ title: '', start: '', end: '', hours: '', deliveredBy: '', modules: [] as string[] })
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  const deliveredBy = useRmthRef('e03_delivered_by')
  const modules = useRmthRef('e03_module')
  const save = useSaveRmth('rmth_training_cycle')
  if (!open) {
    return (
      <div className="col-span-12 sm:col-span-6">
        <SecondaryButton onClick={() => setOpen(true)}>{t('form.cycleNew.open')}</SecondaryButton>
      </div>
    )
  }
  const ready = d.title.trim() && d.start && d.end && d.modules.length > 0
  return (
    <div className="col-span-12 border-s-[3px] border-border-default ps-4">
      <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{t('form.cycleNew.note')}</p>
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} /> : null}
      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px]">
        <Field spec={{ key: 'new_cycle_title', label: t('form.cycleNew.title'), type: 'text', span: 6, required: true }} value={d.title} onChange={(x) => setD({ ...d, title: x })} />
        <Field spec={{ key: 'new_cycle_start', label: t('form.cycleNew.start'), type: 'date', span: 4, required: true }} value={d.start} onChange={(x) => setD({ ...d, start: x })} />
        <Field spec={{ key: 'new_cycle_end', label: t('form.cycleNew.end'), type: 'date', span: 4, required: true }} value={d.end} onChange={(x) => setD({ ...d, end: x })} />
        <Field spec={{ key: 'new_cycle_hours', label: t('form.cycleNew.hours'), type: 'number', span: 4 }} value={d.hours} onChange={(x) => setD({ ...d, hours: x })} />
        <Field
          spec={{ key: 'new_cycle_delivered_by', label: t('form.cycleNew.deliveredBy'), type: 'select', span: 6, options: (deliveredBy.data ?? []).map((r) => ({ value: r.id, label: refLabel(r, locale) })) }}
          value={d.deliveredBy}
          onChange={(x) => setD({ ...d, deliveredBy: x })}
        />
        <Field
          spec={{ key: 'new_cycle_modules', label: t('form.cycleNew.modules'), type: 'checks', twoCol: true, required: true, options: (modules.data ?? []).map((r) => ({ value: r.id, label: refLabel(r, locale) })) }}
          value={d.modules}
          onChange={() => {}}
          onToggle={(id) => setD({ ...d, modules: d.modules.includes(id) ? d.modules.filter((x) => x !== id) : [...d.modules, id] })}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <SecondaryButton onClick={() => setOpen(false)}>{t('form.cycleNew.cancel')}</SecondaryButton>
        <PrimaryButton
          disabled={!ready || save.isPending}
          onClick={() => {
            setOutcome(null)
            void save.mutateAsync({
              row: {
                cycle_kind: 'incubator_design', title: d.title.trim(), start_date: d.start, end_date: d.end,
                contact_hours: d.hours === '' ? null : Number(d.hours),
                delivered_by_id: d.deliveredBy || null,
              },
              option_questions: ['e03_module'],
              options: d.modules.map((id) => ({ question_code: 'e03_module', option_id: id, option_other: null })),
            }).then((res) => {
              setOutcome(res)
              if (res.ok) { setOpen(false); onCreated(res.id) }
            })
          }}
        >
          {t('form.cycleNew.add')}
        </PrimaryButton>
      </div>
    </div>
  )
}

/** Several rows of another table (the proposal links), as a checkbox grid. */
function RecordsField({ base, f, ids, setIds, sub }: {
  base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error'>
  f: RmthFieldDef
  ids: string[]
  setIds: (u: (s: string[]) => string[]) => void
  sub?: string | undefined
}) {
  const picks = useRmthPicker(f.table as RmthTable | undefined, f.kind)
  const options: FieldOption[] = (picks.data ?? []).map((r) => ({ value: r.id, label: r.label }))
  return (
    <Field
      spec={{ ...base, type: 'checks', options, ...(sub && !base.help ? { help: sub } : {}) }}
      value={ids}
      onChange={() => {}}
      onToggle={(id) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
    />
  )
}

/** The agreed rule for a completion decision, or the open item it waits on. */
function RuleNote({ ruleKey }: { ruleKey: string }) {
  const { t } = useTranslation('rmth')
  const th = useRmthThresholds()
  const row = th.data?.find((r) => r.key === ruleKey)
  const rule = row?.value_text
  return (
    <div className={`col-span-12 border-s-[3px] px-4 py-2 text-[13.5px] ${rule ? 'border-success text-body' : 'border-amber bg-attention-bg text-attention-ink'}`}>
      <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em]">{t('form.ruleTitle')}{COLON} </span>
      {rule ?? t('form.ruleMissing')}
    </div>
  )
}

/** A column the database assigns or works out: shown, never typed. */
function DerivedField({ base, f, fid, record, values, mode, refs, sub }: {
  base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'>
  f: RmthFieldDef
  fid: RmthFormId
  record?: RmthRecord | undefined
  values: Values
  mode: 'new' | 'edit'
  refs: Record<string, RefRow[]>
  sub?: string | undefined
}) {
  const { t, i18n } = useTranslation('rmth')
  const L = useRmthLabels(fid)
  const locale = i18n.resolvedLanguage ?? 'en'
  const row = record?.row
  const cycleId = values['cycle_id'] || (typeof row?.['cycle_id'] === 'string' ? (row['cycle_id'] as string) : '')
  const eventId = values['event_id'] || (typeof row?.['event_id'] === 'string' ? (row['event_id'] as string) : '')
  const enterpriseId = values['enterprise_id'] || (typeof row?.['enterprise_id'] === 'string' ? (row['enterprise_id'] as string) : '')
  const needsCycle = ['cycle_end', 'cycle_dates', 'cycle_dates_hours', 'cycle_delivered_by', 'cycle_modules'].includes(f.derived ?? '')
  const cycle = useRmthRecord('rmth_training_cycle', needsCycle && cycleId ? cycleId : undefined)
  const event = useRmthRecord('rmth_event', f.derived === 'event_date' && eventId ? eventId : undefined)
  const enterprise = useRmthRecord('rmth_enterprise', f.derived === 'enterprise_name' && enterpriseId ? enterpriseId : undefined)
  const countedUnder = useRmthRecord(
    (record ? recordTableOf(record) : 'rmth_event') as RmthTable,
    f.derived === 'counted_under' && typeof row?.['counted_under_id'] === 'string' ? (row['counted_under_id'] as string) : undefined,
  )
  const th = useRmthThresholds()

  let text: string | undefined
  let note: string | undefined
  const d = f.derived
  if (d === 'reference') {
    text = typeof row?.['reference'] === 'string' ? (row['reference'] as string) : undefined
    note = mode === 'new' ? t('form.assignedOnSave') : undefined
  } else if (d === 'counted_under') {
    // The two answers are the SHEET's own for this form (three wordings
    // across the seven forms: "No - count this person", "No - this is a
    // first completion", and E0.2's inverted "Yes - count as a new unique
    // participant"), carried as the field's options. One shared string here
    // was wrong on E0.2, where null means "yes, first time".
    if (mode === 'new') note = t('form.derivedOnSave')
    else if (row?.['counted_under_id']) {
      const ref = countedUnder.data ? (typeof countedUnder.data.row['reference'] === 'string' ? (countedUnder.data.row['reference'] as string) : shortId(countedUnder.data.row.id)) : '…'
      text = L.opt(f, 'counted', { reference: ref })
    } else text = L.opt(f, 'first')
  } else if (d === 'so10_threshold') {
    if (mode === 'new') note = t('form.derivedOnSave')
    else {
      const r = (refs['so10_threshold'] ?? []).find((x) => x.id === row?.['so10_threshold_id'])
      text = r ? refLabel(r, locale) : undefined
    }
  } else if (d === 'three_month_reached' || d === 'enters_denominator' || d === 'received_any' || d === 'any_essential') {
    if (mode === 'new') note = t('form.derivedOnSave')
    else {
      const b = row?.[d]
      text = b == null ? undefined : b ? t('form.yes') : t('form.no')
    }
  } else if (d === 'event_date') {
    const e = event.data?.row
    text = e && typeof e['start_date'] === 'string' ? formatShortDate(e['start_date'] as string, locale) : undefined
  } else if (d === 'cycle_end') {
    const c = cycle.data?.row
    text = c && typeof c['end_date'] === 'string' ? formatShortDate(c['end_date'] as string, locale) : undefined
  } else if (d === 'cycle_dates' || d === 'cycle_dates_hours') {
    const c = cycle.data?.row
    if (c && typeof c['start_date'] === 'string' && typeof c['end_date'] === 'string') {
      text = `${formatShortDate(c['start_date'] as string, locale)} – ${formatShortDate(c['end_date'] as string, locale)}`
      if (d === 'cycle_dates_hours' && c['contact_hours'] != null) text += ` · ${String(c['contact_hours'])} h`
    }
  } else if (d === 'cycle_delivered_by') {
    const c = cycle.data?.row
    const r = (refs['e03_delivered_by'] ?? []).find((x) => x.id === c?.['delivered_by_id'])
    text = r ? refLabel(r, locale) : (typeof c?.['delivered_by_other'] === 'string' ? (c['delivered_by_other'] as string) : undefined)
  } else if (d === 'cycle_modules') {
    const rows = cycle.data?.options.filter((o) => o.question_code === 'e03_module') ?? []
    const list = refs['e03_module'] ?? []
    text = rows.map((o) => refLabel(list.find((x) => x.id === o.option_id), locale)).filter(Boolean).join(' · ') || undefined
  } else if (d === 'enterprise_name') {
    text = typeof enterprise.data?.row['name'] === 'string' ? (enterprise.data.row['name'] as string) : undefined
  } else if (d === 'short_term_intensive') {
    const w = th.data?.find((r) => r.key === 'c11_max_weeks')?.value_numeric
    const h = th.data?.find((r) => r.key === 'c11_min_hours_per_week')?.value_numeric
    note = w != null && h != null ? `≤ ${w} · ≥ ${h}` : t('detail.thresholdUndecided')
    text = mode === 'new' ? undefined : t('form.derivedOnSave')
  } else if (d === 'deliveries_total') {
    note = mode === 'new' ? t('form.notYet') : undefined
    text = mode === 'edit' ? t('detail.deliveries') : undefined
  }
  return (
    <Field
      spec={{ ...base, type: 'readonly', span: 6, ...(text ? { text } : {}), ...(note ?? sub ? { note: note ?? sub ?? '' } : {}), ...(d === 'reference' ? { ltr: true } : {}) }}
      value=""
      onChange={() => {}}
    />
  )
}

function recordTableOf(rec: RmthRecord): RmthTable {
  const r = rec.row
  if ('survey_kind' in r) return 'rmth_outcome_survey'
  if ('enrolment_kind' in r) return 'rmth_training_enrolment'
  if ('incubator_id' in r && 'admitted_on' in r) return 'rmth_incubation_service'
  return 'rmth_event'
}

function shortId(id: string): string {
  return id.slice(0, 8)
}
