import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Field, type FieldOption, type FieldSpec } from '../ui/Field'
import { BackLink, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { FormSkeleton, WriteError } from '../ui/states'
import { useToast } from '../ui/Toast'
import { constraintMessageKey } from '../data/errors'
import { refLabel, type RefRow } from '../data/refTables'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import {
  isCompleteId, khldRefQuery, normaliseIdNumber, useKhldPersonLookup, useKhldPicker, useKhldRecord,
  useRestoreKhldPerson, useSaveKhld, useSetKhldDeleted, useVolunteerParticipations,
  type KhldChecklistRow, type KhldCount, type KhldIdType, type KhldOption, type KhldRecord, type PersonLookup,
  type SavePayload, type SaveResult,
} from '../data/khld'
import { DERIVED_LISTS, useDerived } from './derived'
import { allFields, formDef, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldPartDef, KhldTable } from './types'
import { HOOK, REQUIRED, SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One screen renders all twenty-one Khalidiyah forms.
 *
 *  The definition (forms.generated.ts) says what each field IS; the sheet's
 *  words (khld.json) say what it is CALLED, in both languages; the database
 *  says whether it is RIGHT. This component only carries the answers from
 *  the controls to the save payload and back.
 *
 *  The person spine (plan §2): the identifier is a national ID or a UNHCR
 *  registration number, chosen explicitly, and looked up as soon as it is
 *  complete. On file → the name is shown and locked, the details are filled
 *  where known and editable where empty. Not on file → the person is created
 *  by the save. Soft-deleted → the lookup says so, names who deleted them,
 *  and a coordinator can restore from here; nothing is recreated.
 *
 *  Multi-selects and count cells are replaced whole on save: every question
 *  and count field the form shows is listed, so clearing every box clears
 *  the answer rather than leaving yesterday's rows behind. Participations
 *  are merged by volunteer and never removed by this screen.
 *
 *  Validation is computed on every render and `touched` only decides whether
 *  the messages are shown, for the reason RmthFormScreen spells out: the
 *  first click must stop on the same values the second one would.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Values = Record<string, string>
type Multi = Record<string, { ids: string[]; other: string }>
type Counts = Record<string, Record<string, string>>
type Checklist = Record<number, { status: string; detail: string; date: string; evidence: string }>
type Ratings = Record<string, string>
type Participant = { volunteer_id: string; hours: string; verified: boolean; existing: boolean }
type Person = { idType: KhldIdType; idNumber: string; name: string; phone: string; sex: string; dob: string; age: string }
type NewPartner = { name: string; typeId: string; typeOther: string; contact: string }

const EMPTY_PERSON: Person = { idType: 'national_id', idNumber: '', name: '', phone: '', sex: '', dob: '', age: '' }
const SINGLE = ['text', 'area', 'number', 'money', 'date', 'month', 'select', 'bool', 'record'] as const
type SingleType = (typeof SINGLE)[number]
const isSingle = (t: string): t is SingleType => (SINGLE as readonly string[]).includes(t)

function str(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  return String(v)
}

/** From a saved record to the form's flat values, keyed by column. */
function valuesFromRecord(rec: KhldRecord, fields: KhldFieldDef[]): Values {
  const v: Values = {}
  const take = (col: string, type?: string) => {
    v[col] = str(rec.row[col])
    if (type === 'month' && v[col]) v[col] = v[col]!.slice(0, 7)
  }
  for (const f of fields) {
    if (f.type === 'parts') {
      for (const p of f.parts ?? []) {
        if (p.type === 'multi' || p.type === 'person_phone') continue
        take(p.column)
        if (p.other) take(p.other)
      }
    } else if (isSingle(f.type) && f.column) {
      take(f.column, f.type)
      if (f.other) take(f.other)
    } else if (f.type === 'session' && f.column && f.dateColumn) {
      take(f.column); take(f.dateColumn)
    }
  }
  return v
}

export function KhldFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { form: fidParam, id } = useParams()
  const fid = fidParam as KhldFormId
  const def = formDef(fid)
  const fields = useMemo(() => allFields(def), [def])
  const L = useKhldLabels(fid)
  const { t } = useTranslation(['khld', 'forms'])
  const navigate = useNavigate()
  const toast = useToast()

  const rec = useKhldRecord(def.table, mode === 'edit' ? id : undefined)
  const save = useSaveKhld(def.table)

  const questions = useMemo(() => {
    const qs: string[] = []
    for (const f of fields) {
      if (f.type === 'multi' && f.question) qs.push(f.question)
      for (const p of f.parts ?? []) if (p.type === 'multi' && p.question) qs.push(p.question)
    }
    return qs
  }, [fields])
  const countFields = useMemo(() => fields.filter((f) => f.type === 'counts' && f.fieldCode).map((f) => f.fieldCode!), [fields])

  const [values, setValues] = useState<Values>({})
  const [multi, setMulti] = useState<Multi>({})
  const [counts, setCounts] = useState<Counts>({})
  const [checklist, setChecklist] = useState<Checklist>({})
  const [ratings, setRatings] = useState<Ratings>({})
  const [participants, setParticipants] = useState<Participant[]>([])
  const [person, setPerson] = useState<Person>(EMPTY_PERSON)
  const [newPartner, setNewPartner] = useState<NewPartner>({ name: '', typeId: '', typeOther: '', contact: '' })
  const [touched, setTouched] = useState(false)
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // ── hydrate once from the record in edit mode (during render, keyed on id) ──
  if (mode === 'edit' && id && rec.data && loadedId !== id) {
    setLoadedId(id)
    const r = rec.data
    setValues(valuesFromRecord(r, fields))
    const m: Multi = {}
    for (const q of questions) {
      const rows = r.options.filter((o) => o.question_code === q)
      m[q] = { ids: rows.map((o) => o.option_id), other: rows.find((o) => o.option_other)?.option_other ?? '' }
    }
    setMulti(m)
    const c: Counts = {}
    for (const row of r.counts) c[row.field_code] = { ...(c[row.field_code] ?? {}), [row.cell_id]: String(row.count) }
    setCounts(c)
    const cl: Checklist = {}
    for (const row of r.checklist) cl[row.item_no] = { status: row.status_id, detail: row.detail ?? '', date: row.status_date ?? '', evidence: row.evidence_ref ?? '' }
    setChecklist(cl)
    setRatings(Object.fromEntries(r.ratings.map((x) => [x.item_id, x.rating_id])))
    setParticipants(r.participations.map((p) => ({ volunteer_id: p.volunteer_id, hours: p.hours == null ? '' : String(p.hours), verified: p.verified, existing: true })))
    if (r.person) {
      setPerson({
        idType: r.person.national_id ? 'national_id' : 'unhcr_number',
        idNumber: r.person.national_id ?? r.person.unhcr_number ?? '',
        name: r.person.full_name, phone: r.person.phone ?? '', sex: r.person.sex ?? '',
        dob: r.person.date_of_birth ?? '', age: r.person.age_recorded == null ? '' : String(r.person.age_recorded),
      })
    }
  }

  const hasPerson = fields.some((f) => f.type === 'ident')
  const personLocked = mode === 'edit' && !!rec.data?.person
  const idNorm = normaliseIdNumber(person.idType, person.idNumber)
  const idComplete = isCompleteId(person.idType, idNorm)
  const lookup = useKhldPersonLookup(person.idType, hasPerson && !personLocked ? person.idNumber : '')
  const found: PersonLookup | null = lookup.data ?? null
  const onFile = !!found && !found.deleted_at
  const foundDeleted = !!found && !!found.deleted_at
  const phoneOnFile = personLocked ? !!rec.data?.person?.phone : onFile ? !!found?.phone : false
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null)

  // ── an identifier on file prefills identity and locks the name ─────────
  // Keyed on the identifier the lookup answered for, so a refetch does not
  // overwrite the enumerator's typing. Only the NAME is authoritative; the
  // rest fills empty controls only.
  if (found && !found.deleted_at && prefilledFrom !== `${person.idType}:${idNorm}`) {
    setPrefilledFrom(`${person.idType}:${idNorm}`)
    setPerson((p) => ({
      ...p,
      name: found.full_name,
      phone: p.phone || (found.phone ?? ''),
      sex: p.sex || (found.sex ?? ''),
      dob: p.dob || (found.date_of_birth ?? ''),
      age: p.age || (found.age_recorded == null ? '' : String(found.age_recorded)),
    }))
  }

  const setValue = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))
  const toggleMulti = (q: string, oid: string) =>
    setMulti((m) => {
      const cur = m[q] ?? { ids: [], other: '' }
      const ids = cur.ids.includes(oid) ? cur.ids.filter((x) => x !== oid) : [...cur.ids, oid]
      return { ...m, [q]: { ...cur, ids } }
    })

  const refs = useRefsFor(fields)

  /* ── validation ───────────────────────────────────────────────────────── */
  const errors: Record<string, string> = {}
  const req = t('khld:form.required')
  for (const f of fields) {
    const col = f.column ?? f.key
    switch (f.type) {
      case 'ident':
        if (!personLocked && !idComplete) errors[f.key] = person.idType === 'national_id' ? t('khld:form.nidInvalid') : t('khld:form.unhcrEmpty')
        break
      case 'person_name':
        if (!personLocked && !onFile && !person.name.trim()) errors[f.key] = req
        break
      case 'person_sex':
        if (f.required && !person.sex) errors[f.key] = req
        break
      case 'person_phone':
        if (f.required && !phoneOnFile && !person.phone.trim()) errors[f.key] = req
        break
      case 'dob':
        if (f.required && !person.dob) errors[f.key] = req
        break
      case 'dob_age':
        if (f.required && !person.dob && !person.age) errors[f.key] = t('khld:form.dobOrAge')
        break
      case 'select': {
        if (f.required && !values[col]) errors[f.key] = req
        const chosen = (refs[f.ref ?? ''] ?? []).find((r) => r.id === values[col])
        if (f.other && chosen?.allows_free_text && !values[f.other]?.trim()) errors[f.key] = t('khld:form.specify')
        break
      }
      case 'multi':
        if (f.required && !(multi[f.question ?? '']?.ids.length)) errors[f.key] = req
        break
      case 'record':
        // a partner may be new (typed below the picker); an enterprise on SO4-G1 is made from the owner
        if (f.required && !values[col]) {
          if (f.table === 'khld_partner' && f.create) { if (!newPartner.name.trim()) errors[f.key] = req }
          else if (!(f.table === 'khld_enterprise' && f.create && hasPerson)) errors[f.key] = req
        }
        break
      case 'counts':
        if (f.required && !Object.values(counts[f.fieldCode ?? ''] ?? {}).some((x) => x !== '')) errors[f.key] = req
        break
      case 'checklist': {
        const row = checklist[f.itemNo ?? -1]
        if (f.required && !row?.status) errors[f.key] = req
        const code = (refs[f.ref ?? ''] ?? []).find((r) => r.id === row?.status)?.code
        if (code && (f.detail ?? []).includes(code) && !row?.detail.trim()) errors[f.key] = t('khld:form.specify')
        break
      }
      case 'rating':
        if (f.required && (refs[f.items ?? ''] ?? []).some((i) => !ratings[i.id])) errors[f.key] = req
        break
      case 'session': {
        const st = (refs[f.ref ?? ''] ?? []).find((r) => r.id === values[f.column ?? ''])
        if (f.required && !st) errors[f.key] = req
        if (st?.code === 'attended' && !values[f.dateColumn ?? '']) errors[f.key] = t('khld:form.session.date')
        break
      }
      case 'participants':
        if (f.required && participants.length === 0) errors[f.key] = req
        if (participants.some((p) => !p.volunteer_id)) errors[f.key] = req
        break
      case 'parts':
        for (const p of f.parts ?? []) {
          if (p.required && !values[p.column]) errors[f.key] = req
          if (p.type === 'select' && p.other) {
            const chosen = (refs[p.ref ?? ''] ?? []).find((r) => r.id === values[p.column])
            if (chosen?.allows_free_text && !values[p.other]?.trim()) errors[f.key] = t('khld:form.specify')
          }
        }
        break
      default:
        if (f.required && isSingle(f.type) && !values[col]) errors[f.key] = req
    }
  }
  const invalid = Object.keys(errors).length > 0
  const shown = touched ? errors : {}

  /* ── the payload ──────────────────────────────────────────────────────── */
  function buildPayload(): SavePayload {
    const row: Record<string, unknown> = {}
    const put = (col: string, type: string, raw: string | undefined) => {
      const v = (raw ?? '').trim()
      if (type === 'number' || type === 'money') row[col] = v === '' ? null : Number(v)
      else if (type === 'bool') row[col] = v === '' ? null : v === 'true'
      else if (type === 'month') row[col] = v === '' ? null : `${v}-01`
      else row[col] = v === '' ? null : v
    }
    for (const f of fields) {
      if (f.type === 'parts') {
        for (const p of f.parts ?? []) {
          if (p.type === 'multi' || p.type === 'person_phone') continue
          put(p.column, p.type, values[p.column])
          if (p.other) put(p.other, 'text', values[p.other])
        }
      } else if (f.type === 'session' && f.column && f.dateColumn) {
        put(f.column, 'select', values[f.column])
        const st = (refs[f.ref ?? ''] ?? []).find((r) => r.id === values[f.column ?? ''])
        put(f.dateColumn, 'date', st?.code === 'attended' ? values[f.dateColumn] : '')
      } else if (isSingle(f.type) && f.column) {
        // the entity pickers are sent as their block, below, so the function can refuse a deleted one by name
        if (f.type === 'record' && (f.table === 'khld_partner' || f.table === 'khld_enterprise')) continue
        put(f.column, f.type, values[f.column])
        if (f.other) put(f.other, 'text', values[f.other])
      }
    }
    if (mode === 'new') for (const [k, v] of Object.entries(def.fixed)) row[k] = v

    const options: KhldOption[] = []
    for (const q of questions) {
      const m = multi[q]
      if (!m) continue
      const list = refs[listOfQuestion(fields, q)] ?? []
      for (const oid of m.ids) {
        const r = list.find((x) => x.id === oid)
        options.push({ question_code: q, option_id: oid, option_other: r?.allows_free_text ? m.other || null : null })
      }
    }
    const countRows: KhldCount[] = []
    for (const fc of countFields) {
      for (const [cell_id, n] of Object.entries(counts[fc] ?? {})) if (n !== '') countRows.push({ field_code: fc, cell_id, count: Number(n) })
    }

    const payload: SavePayload = { row, option_questions: questions, options }
    if (countFields.length) { payload.count_fields = countFields; payload.counts = countRows }
    if (mode === 'edit' && id) payload.id = id

    if (hasPerson && !personLocked) {
      payload.person = {
        id_type: person.idType, id_number: idNorm,
        ...(person.name.trim() ? { full_name: person.name.trim() } : {}),
        ...(person.phone.trim() ? { phone: person.phone.trim() } : {}),
        ...(person.sex ? { sex: person.sex } : {}),
        ...(person.dob ? { date_of_birth: person.dob } : {}),
        ...(person.age ? { age_years: Number(person.age) } : {}),
      }
    } else if (hasPerson && personLocked && rec.data?.person) {
      // The one thing an edit may add to a locked person: a phone where the record had none.
      const p = rec.data.person
      payload.person = {
        id_type: p.national_id ? 'national_id' : 'unhcr_number',
        id_number: p.national_id ?? p.unhcr_number ?? '',
        ...(!phoneOnFile && person.phone.trim() ? { phone: person.phone.trim() } : {}),
      }
    }
    const partnerField = fields.find((f) => f.type === 'record' && f.table === 'khld_partner')
    if (partnerField) {
      const picked = values[partnerField.column ?? '']
      if (picked) payload.partner = { id: picked }
      else if (newPartner.name.trim()) {
        payload.partner = {
          name: newPartner.name.trim(),
          ...(newPartner.typeId ? { partner_type_id: newPartner.typeId } : {}),
          ...(newPartner.typeOther.trim() ? { partner_type_other: newPartner.typeOther.trim() } : {}),
          ...(newPartner.contact.trim() ? { contact: newPartner.contact.trim() } : {}),
        }
      }
    }
    const enterpriseField = fields.find((f) => f.type === 'record' && f.table === 'khld_enterprise')
    if (enterpriseField) {
      const picked = values[enterpriseField.column ?? '']
      if (picked) payload.enterprise = { id: picked }
      else if (mode === 'edit' && rec.data?.enterprise) payload.enterprise = { id: rec.data.enterprise.id }
    }
    if (fields.some((f) => f.type === 'checklist')) {
      const rows: KhldChecklistRow[] = []
      for (const f of fields) {
        if (f.type !== 'checklist' || f.itemNo == null) continue
        const c = checklist[f.itemNo]
        if (!c?.status) continue
        rows.push({ item_no: f.itemNo, field_code: f.key, status_id: c.status, detail: c.detail.trim() || null, status_date: c.date || null, evidence_ref: c.evidence.trim() || null })
      }
      payload.checklist = rows
    }
    if (fields.some((f) => f.type === 'rating')) {
      payload.ratings = Object.entries(ratings).filter(([, r]) => r).map(([item_id, rating_id]) => ({ item_id, rating_id }))
    }
    if (fields.some((f) => f.type === 'participants') && participants.length) {
      payload.participations = participants
        .filter((p) => p.volunteer_id)
        .map((p) => ({ volunteer_id: p.volunteer_id, hours: p.hours === '' ? null : Number(p.hours), verified: p.verified }))
    }
    return payload
  }

  async function submit() {
    setTouched(true)
    setOutcome(null)
    if (invalid) return
    const res = await save.mutateAsync(buildPayload())
    setOutcome(res)
    if (res.ok) {
      toast.fire({
        tag: t('khld:form.saved'),
        title: res.reference ? t('khld:form.savedRef', { reference: res.reference }) : L.short,
        sub: L.code,
      })
      navigate(`/khld/${fid}/${res.id}`)
    }
  }

  const backTo = mode === 'edit' && id ? `/khld/${fid}/${id}` : `/khld/${fid}`

  if (mode === 'edit' && rec.isLoading) {
    return (
      <>
        <PageHead eyebrow={L.code} title={t('khld:form.editTitle', { title: L.short })} size="md" />
        <FormSkeleton />
      </>
    )
  }

  const personId = personLocked ? rec.data?.person?.id : onFile ? found?.id : undefined

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(backTo)}>{t('khld:form.back')}</BackLink>}
        eyebrow={L.code}
        title={mode === 'new' ? t('khld:form.newTitle', { title: L.title }) : t('khld:form.editTitle', { title: L.title })}
        size="md"
      />

      {/* The sheet's own header block, verbatim: who fills it, when, what one
          record is, and how the indicator is calculated from it. */}
      <div className="grid gap-x-6 gap-y-3 border-[1.5px] border-ink p-4 sm:grid-cols-[auto_1fr]">
        <Head k={t('khld:form.indicator')} v={L.indicator} />
        <Head k={t('khld:form.who')} v={L.who} />
        <Head k={t('khld:form.when')} v={L.when} />
        <Head k={t('khld:form.unit')} v={L.unit} />
        <Head k={t('khld:form.calcTitle')} v={L.calc} strong />
        <Head k={t('khld:form.evidenceToFile')} v={L.evidence} />
      </div>

      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} onRestored={() => setOutcome(null)} /> : null}
      {foundDeleted && found ? <DeletedPersonBand found={found} /> : null}

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
                setMultiOther={(q, v) => setMulti((m) => ({ ...m, [q]: { ids: m[q]?.ids ?? [], other: v } }))}
                counts={counts}
                setCount={(fc, cell, v) => setCounts((c) => ({ ...c, [fc]: { ...(c[fc] ?? {}), [cell]: v } }))}
                checklist={checklist}
                setChecklist={setChecklist}
                ratings={ratings}
                setRatings={setRatings}
                participants={participants}
                setParticipants={setParticipants}
                person={person}
                setPerson={setPerson}
                personLocked={personLocked}
                onFile={onFile}
                phoneOnFile={phoneOnFile}
                lookingUp={lookup.isFetching}
                hasPerson={hasPerson}
                personNew={!personLocked && idComplete && lookup.isFetched && !found}
                newPartner={newPartner}
                setNewPartner={setNewPartner}
                error={shown[f.key]}
                refs={refs}
                record={rec.data}
                personId={personId}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="mt-[34px] flex flex-col gap-4 border-t-[3px] border-ink pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{L.code}</span>
        <div className="flex gap-2.5">
          <SecondaryButton onClick={() => navigate(backTo)}>{t('khld:form.cancel')}</SecondaryButton>
          <PrimaryButton onClick={() => void submit()} disabled={save.isPending || foundDeleted}>
            {save.isPending ? t('khld:form.saving') : t('khld:form.save')}
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}

function Head({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <>
      <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{k}</span>
      <span className={strong ? 'text-[14px] font-medium text-ink' : 'text-[14px] text-body'} style={{ textWrap: 'pretty' }}>{v}</span>
    </>
  )
}

/** The list a multi question reads, found from the definition. */
function listOfQuestion(fields: KhldFieldDef[], q: string): string {
  for (const f of fields) {
    if (f.type === 'multi' && f.question === q) return f.ref ?? ''
    for (const p of f.parts ?? []) if (p.type === 'multi' && p.question === q) return p.ref ?? ''
  }
  return ''
}

/** Every ref_khld list the form reads, derived fields' lists included. */
export function refListsOf(fields: KhldFieldDef[]): string[] {
  const s = new Set<string>()
  for (const f of fields) {
    for (const k of [f.ref, f.items, f.ratings]) if (k) s.add(k)
    for (const p of f.parts ?? []) if (p.ref) s.add(p.ref)
    if (f.derived) for (const k of DERIVED_LISTS[f.derived] ?? []) s.add(k)
    if (f.type === 'record' && f.table === 'khld_partner' && f.create) s.add('partner_type')
  }
  return Array.from(s)
}

function useRefsFor(fields: KhldFieldDef[]): Record<string, RefRow[]> {
  const names = useMemo(() => refListsOf(fields), [fields])
  // useQueries, not a loop of hooks: one component serves every form
  const results = useQueries({ queries: names.map((n) => khldRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  names.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

/* ── refusals ─────────────────────────────────────────────────────────────── */

export function RefusalBand({ outcome, onRestored }: { outcome: Exclude<SaveResult, { ok: true }>; onRestored?: () => void }) {
  const { t } = useTranslation(['khld', 'forms', 'errors'])
  const r = outcome.result
  const known = r === 'invalid' ? constraintMessageKey(outcome.constraint) : null
  const entity: { table: KhldTable; id: string; key: 'partner' | 'enterprise' | 'vendor' } | null =
    r === 'partner_deleted' && outcome.partner_id ? { table: 'khld_partner', id: outcome.partner_id, key: 'partner' }
    : r === 'enterprise_deleted' && outcome.enterprise_id ? { table: 'khld_enterprise', id: outcome.enterprise_id, key: 'enterprise' }
    : r === 'vendor_deleted' && outcome.vendor_id ? { table: 'khld_vendor', id: outcome.vendor_id, key: 'vendor' }
    : null
  const text =
    r === 'not_found' ? t('khld:form.notFound')
    : r === 'person_deleted' ? t('khld:form.deleted.person')
    : entity ? t(`khld:form.deleted.${entity.key}`)
    : r === 'unknown_column' ? t('khld:form.unknownColumn', { column: outcome.column ?? '?' })
    : r === 'unknown_block' ? t('khld:form.unknownBlock', { block: outcome.block ?? '?' })
    : r === 'consent_refused' ? t('khld:form.consentRefused')
    : known ? t('khld:form.invalid', { message: t(known) })
    : t('khld:form.invalid', { message: outcome.message ?? outcome.constraint ?? r })
  return (
    <div role="alert" className="mt-[18px] bg-error px-[18px] py-[14px] text-bg">
      <div className="flex items-baseline gap-[14px]">
        <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('forms:notSaved', { defaultValue: 'Not saved' })}</span>
        <span className="text-[15px] font-medium">{text}</span>
      </div>
      {entity ? <RestoreEntity table={entity.table} id={entity.id} onRestored={onRestored} /> : null}
    </div>
  )
}

/** A coordinator's restore of a soft-deleted partner, enterprise or vendor the save refused on. */
function RestoreEntity({ table, id, onRestored }: { table: KhldTable; id: string; onRestored?: (() => void) | undefined }) {
  const { t } = useTranslation('khld')
  const { role } = useAuth()
  const restore = useSetKhldDeleted(table)
  const [done, setDone] = useState(false)
  if (!can(role, 'record.delete')) return <p className="mb-0 mt-2 text-[13.5px]">{t('form.deleted.coordinatorOnly')}</p>
  if (done) return <p className="mb-0 mt-2 text-[13.5px]">{t('form.deleted.restored')}</p>
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <span className="text-[13.5px]">{t('form.deleted.restoreNote')}</span>
      <SecondaryButton disabled={restore.isPending} onClick={() => void restore.mutateAsync({ id, deleted: false }).then(() => { setDone(true); onRestored?.() })}>
        {t('form.deleted.restore')}
      </SecondaryButton>
      {restore.error ? <WriteError error={restore.error} onDismiss={restore.reset} /> : null}
    </div>
  )
}

/** The identifier the enumerator typed belongs to a deleted person: who, when, by whom, and the way forward. */
function DeletedPersonBand({ found }: { found: PersonLookup }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const restore = useRestoreKhldPerson()
  const when = found.deleted_at ? formatShortDate(found.deleted_at, locale) : ''
  return (
    <div role="alert" className="mt-[18px] border-[1.5px] border-amber bg-attention-bg p-4 text-attention-ink">
      <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('form.deleted.person')}</p>
      <p className="mb-0 mt-1 text-[16px] font-bold text-ink">{found.full_name}</p>
      <p className="mb-0 mt-1 text-[13.5px]">{found.deleted_by ? t('form.deleted.who', { when, by: found.deleted_by }) : t('form.deleted.whoUnknown', { when })}</p>
      <p className="mb-0 mt-1 text-[13.5px]">{t('form.deleted.restoreNote')}</p>
      {restore.error ? <WriteError error={restore.error} onDismiss={restore.reset} /> : null}
      {can(role, 'record.delete') ? (
        <div className="mt-2"><SecondaryButton disabled={restore.isPending} onClick={() => void restore.mutateAsync(found.id)}>{t('form.deleted.restore')}</SecondaryButton></div>
      ) : <p className="mb-0 mt-2 text-[13.5px]">{t('form.deleted.coordinatorOnly')}</p>}
    </div>
  )
}

/* ── one field ─────────────────────────────────────────────────────────── */

type FieldViewProps = {
  f: KhldFieldDef
  fid: KhldFormId
  mode: 'new' | 'edit'
  values: Values
  setValue: (k: string, v: string) => void
  multi: Multi
  toggleMulti: (q: string, id: string) => void
  setMultiOther: (q: string, v: string) => void
  counts: Counts
  setCount: (fieldCode: string, cellId: string, v: string) => void
  checklist: Checklist
  setChecklist: (u: (s: Checklist) => Checklist) => void
  ratings: Ratings
  setRatings: (u: (s: Ratings) => Ratings) => void
  participants: Participant[]
  setParticipants: (u: (s: Participant[]) => Participant[]) => void
  person: Person
  setPerson: (u: (p: Person) => Person) => void
  personLocked: boolean
  onFile: boolean
  phoneOnFile: boolean
  lookingUp: boolean
  hasPerson: boolean
  /** The identifier is complete and nobody is on file under it. */
  personNew: boolean
  newPartner: NewPartner
  setNewPartner: (u: (s: NewPartner) => NewPartner) => void
  error?: string | undefined
  refs: Record<string, RefRow[]>
  record?: KhldRecord | undefined
  personId?: string | undefined
}

const INPUT = 'w-full min-h-10 border-[1.5px] border-ink bg-input px-2 text-[14px] text-ink'

function FieldView(p: FieldViewProps) {
  const { f, fid } = p
  const L = useKhldLabels(fid)
  const { t } = useTranslation('khld')
  const label = L.label(f)
  const help = L.help(f)
  const sub = L.sub(f)
  const base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'> = {
    key: f.key,
    label,
    ...(help ? { help } : {}),
    ...(f.required ? { required: true } : {}),
    ...(p.error ? { error: p.error } : {}),
    ...(f.counting ? { tag: t('form.countingField'), tagAccent: 'amber' as const } : {}),
  }
  const opts = (rows: RefRow[]): FieldOption[] => rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) }))
  const v = (k: string) => p.values[k] ?? ''
  const col = f.column ?? f.key

  /* the person spine */
  if (f.type === 'ident') {
    const typeOptions: FieldOption[] = (['national_id', 'unhcr_number'] as const).map((k) => ({ value: k, label: t(`form.idType.${k}`) }))
    return (
      <>
        <Field
          spec={{ key: `${f.key}_type`, label: t('form.idType.label'), type: 'radio', span: 6, required: true, ...(p.personLocked ? { disabled: true } : {}) , options: typeOptions }}
          value={p.person.idType}
          onChange={(x) => p.setPerson((s) => ({ ...s, idType: x as KhldIdType, idNumber: '' }))}
        />
        <Field
          spec={{ ...base, type: 'text', ltr: true, span: 6, placeholder: p.person.idType === 'national_id' ? '000000000' : (sub ?? ''),
            ...(p.personLocked ? { disabled: true } : {}),
            ...(!p.personLocked && isCompleteId(p.person.idType, normaliseIdNumber(p.person.idType, p.person.idNumber))
              ? { match: { text: p.lookingUp ? t('form.lookingUp') : p.onFile ? t('form.onFile') : t('form.newPerson'), ok: true } }
              : {}) }}
          value={p.person.idNumber}
          onChange={(x) => p.setPerson((s) => ({ ...s, idNumber: x }))}
        />
      </>
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
    if (p.phoneOnFile) {
      return <Field spec={{ ...base, type: 'readonly', span: 6, text: p.person.phone, note: t('form.phoneOnFile'), ltr: true }} value={p.person.phone} onChange={() => {}} />
    }
    return (
      <Field spec={{ ...base, type: 'tel', ltr: true, span: 6, placeholder: '07XXXXXXXX' }} value={p.person.phone} onChange={(x) => p.setPerson((s) => ({ ...s, phone: x }))} />
    )
  }
  if (f.type === 'person_sex') {
    const rows = p.refs[f.ref ?? 'sex'] ?? []
    const options = rows.map((r) => ({ value: r.code, label: refLabel(r, L.locale) }))
    const locked = (p.personLocked || p.onFile) && !!p.person.sex
    return (
      <Field
        spec={{ ...base, type: locked ? 'readonly' : 'radio', span: 6, options, ...(locked ? { text: options.find((o) => o.value === p.person.sex)?.label ?? p.person.sex } : {}) }}
        value={p.person.sex}
        onChange={(x) => p.setPerson((s) => ({ ...s, sex: x }))}
      />
    )
  }
  if (f.type === 'dob' || f.type === 'dob_age') {
    const dobLocked = (p.personLocked || p.onFile) && !!p.person.dob
    return (
      <>
        <Field
          spec={{ ...base, label: `${label} ${SEP} ${t('form.dob')}`, type: dobLocked ? 'readonly' : 'date', span: 4, ...(dobLocked ? { text: formatShortDate(p.person.dob, L.locale) } : {}) }}
          value={p.person.dob}
          onChange={(x) => p.setPerson((s) => ({ ...s, dob: x }))}
        />
        {f.type === 'dob_age' ? (
          <Field spec={{ key: `${f.key}_age`, label: t('form.age'), type: 'number', span: 3, ...(p.person.dob ? { dim: true } : {}) }} value={p.person.age} onChange={(x) => p.setPerson((s) => ({ ...s, age: x }))} />
        ) : null}
      </>
    )
  }

  /* plain columns */
  if (f.type === 'text') {
    return <Field spec={{ ...base, type: 'text', ...(sub ? { placeholder: sub } : {}) }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'area') {
    return <Field spec={{ ...base, type: 'area', ...(sub ? { placeholder: sub } : {}) }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'number' || f.type === 'money') {
    return <Field spec={{ ...base, type: 'number', span: 4, ...(sub ? { placeholder: sub } : {}) }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'date') {
    return <Field spec={{ ...base, type: 'date', span: 4 }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'month') {
    return <MonthField spec={{ ...base, span: 4 }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'select') {
    const rows = p.refs[f.ref ?? ''] ?? []
    const chosen = rows.find((r) => r.id === v(col))
    return (
      <>
        <Field spec={{ ...base, type: 'select', span: 6, options: opts(rows), ...(sub ? { placeholder: sub } : {}) }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
        {f.other && chosen?.allows_free_text ? (
          <Field spec={{ key: f.other, label: t('form.specify'), type: 'text', span: 6, required: true }} value={v(f.other)} onChange={(x) => p.setValue(f.other!, x)} />
        ) : null}
      </>
    )
  }
  if (f.type === 'multi') {
    const q = f.question ?? ''
    const rows = p.refs[f.ref ?? ''] ?? []
    const m = p.multi[q] ?? { ids: [], other: '' }
    const otherOn = rows.some((r) => r.allows_free_text && m.ids.includes(r.id))
    return (
      <>
        <Field spec={{ ...base, type: 'checks', twoCol: rows.length > 4, options: opts(rows) }} value={m.ids} onChange={() => {}} onToggle={(oid) => p.toggleMulti(q, oid)} />
        {otherOn ? (
          <Field spec={{ key: `${q}_other`, label: t('form.specify'), type: 'text', span: 6, required: true }} value={m.other} onChange={(x) => p.setMultiOther(q, x)} />
        ) : null}
      </>
    )
  }
  if (f.type === 'bool') {
    const options = (f.options ?? []).map((val) => ({ value: val, label: L.opt(f, val) }))
    return <Field spec={{ ...base, type: 'radio', big: true, options }} value={v(col)} onChange={(x) => p.setValue(col, x)} />
  }
  if (f.type === 'record') {
    return <RecordPickerField base={base} f={f} value={v(col)} onChange={(x) => p.setValue(col, x)} sub={sub} p={p} />
  }
  if (f.type === 'parts') {
    return (
      <div className="col-span-12">
        <div className="mb-[7px] flex flex-wrap items-baseline gap-2.5">
          <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
            {label}{f.required ? <span className="text-error"> {REQUIRED}</span> : null}
          </span>
          {f.counting ? <span className="bg-amber px-2 py-0.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-bg"><span aria-hidden="true">{HOOK} </span>{t('form.countingField')}</span> : null}
        </div>
        {help ? <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{help}</p> : null}
        <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px] border-s-[3px] border-border-default ps-4">
          {(f.parts ?? []).map((part) => <PartView key={part.column} f={f} part={part} p={p} />)}
        </div>
        {p.error ? <div role="alert" className="mt-2 text-[13.5px] font-semibold text-error">{p.error}</div> : null}
      </div>
    )
  }
  if (f.type === 'counts') {
    const cells = p.refs[f.ref ?? ''] ?? []
    const fc = f.fieldCode ?? ''
    const sum = cells.reduce((s, c) => s + (Number(p.counts[fc]?.[c.id] ?? '') || 0), 0)
    return (
      <Block label={label} required={!!f.required} help={help} error={p.error} counting={!!f.counting}>
        <div className="grid grid-cols-1 gap-[1.5px] border-[1.5px] border-ink bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {cells.map((c) => (
            <label key={c.id} className="flex items-center justify-between gap-3 bg-input px-3 py-2 text-[14px]">
              <span>{refLabel(c, L.locale)}</span>
              <input type="number" min={0} inputMode="numeric" dir="ltr" aria-label={refLabel(c, L.locale)} value={p.counts[fc]?.[c.id] ?? ''} onChange={(e) => p.setCount(fc, c.id, e.target.value)} className="min-h-9 w-24 border-[1.5px] border-ink bg-bg px-2 text-end" />
            </label>
          ))}
        </div>
        <p className="mb-0 mt-2 font-narrow text-[11.5px] uppercase tracking-[0.1em] text-muted">{t('form.counts.sum')}{SEP} {sum}</p>
      </Block>
    )
  }
  if (f.type === 'checklist') {
    const rows = p.refs[f.ref ?? ''] ?? []
    const no = f.itemNo ?? -1
    const cur = p.checklist[no] ?? { status: '', detail: '', date: '', evidence: '' }
    const set = (patch: Partial<typeof cur>) => p.setChecklist((s) => ({ ...s, [no]: { ...cur, ...patch } }))
    const code = rows.find((r) => r.id === cur.status)?.code
    const needsDetail = !!code && (f.detail ?? []).includes(code)
    return (
      <Block label={`${no}. ${label}`} required={!!f.required} help={help} error={p.error} counting={false}>
        <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px]">
          {/* the item number on the label, because every checklist row has a
              status control and a screen reader hears the group's name alone */}
          <Field spec={{ key: `${f.key}_status`, label: `${t('form.checklist.status')} ${SEP} ${no}`, type: 'radio', span: 12, options: opts(rows) }} value={cur.status} onChange={(x) => set({ status: x })} />
          {needsDetail ? <Field spec={{ key: `${f.key}_detail`, label: t('form.checklist.detail'), type: 'text', span: 6, required: true }} value={cur.detail} onChange={(x) => set({ detail: x })} /> : null}
          <Field spec={{ key: `${f.key}_date`, label: t('form.checklist.date'), type: 'date', span: 3 }} value={cur.date} onChange={(x) => set({ date: x })} />
          <Field spec={{ key: `${f.key}_evidence`, label: t('form.checklist.evidence'), type: 'text', span: needsDetail ? 3 : 6 }} value={cur.evidence} onChange={(x) => set({ evidence: x })} />
        </div>
      </Block>
    )
  }
  if (f.type === 'rating') {
    const items = p.refs[f.items ?? ''] ?? []
    const scale = p.refs[f.ratings ?? ''] ?? []
    return (
      <Block label={label} required={!!f.required} help={help} error={p.error} counting={false}>
        <div className="overflow-x-auto border-[1.5px] border-ink">
          <table className="w-full min-w-[420px] text-[14px]">
            <thead>
              <tr className="border-b-[3px] border-ink font-narrow text-[11px] uppercase tracking-[0.12em]">
                <th className="px-3 py-2 text-start">{t('form.rating.item')}</th>
                <th className="px-3 py-2 text-start">{t('form.rating.rating')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border-default">
                  <td className="px-3 py-2 align-top">{refLabel(it, L.locale)}</td>
                  <td className="px-3 py-2 align-top">
                    <select value={p.ratings[it.id] ?? ''} onChange={(e) => p.setRatings((s) => ({ ...s, [it.id]: e.target.value }))} className={INPUT} aria-label={refLabel(it, L.locale)}>
                      <option value="">{t('form.choose')}</option>
                      {scale.map((r) => <option key={r.id} value={r.id}>{refLabel(r, L.locale)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    )
  }
  if (f.type === 'session') {
    const rows = p.refs[f.ref ?? ''] ?? []
    const st = rows.find((r) => r.id === v(f.column ?? ''))
    return (
      <>
        <Field spec={{ ...base, type: 'radio', span: 6, options: opts(rows) }} value={v(f.column ?? '')} onChange={(x) => p.setValue(f.column ?? '', x)} />
        {st?.code === 'attended' ? (
          <Field spec={{ key: `${f.key}_date`, label: t('form.session.date'), type: 'date', span: 4, required: true }} value={v(f.dateColumn ?? '')} onChange={(x) => p.setValue(f.dateColumn ?? '', x)} />
        ) : null}
      </>
    )
  }
  if (f.type === 'participants') {
    return <ParticipantsField label={label} help={help} sub={sub} required={!!f.required} error={p.error} rows={p.participants} setRows={p.setParticipants} />
  }
  if (f.type === 'participation_log') {
    return <ParticipationLog label={label} help={help} sub={sub} volunteerId={v('volunteer_id')} />
  }
  if (f.type === 'readonly') {
    return <DerivedField base={base} f={f} p={p} sub={sub} />
  }
  return null
}

function Block({ label, required, help, error, counting, children }: { label: string; required: boolean; help?: string | undefined; error?: string | undefined; counting: boolean; children: React.ReactNode }) {
  const { t } = useTranslation('khld')
  return (
    <div className="col-span-12">
      <div className="mb-[7px] flex flex-wrap items-baseline gap-2.5">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
          {label}{required ? <span className="text-error"> {REQUIRED}</span> : null}
        </span>
        {counting ? <span className="bg-amber px-2 py-0.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-bg"><span aria-hidden="true">{HOOK} </span>{t('form.countingField')}</span> : null}
      </div>
      {help ? <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{help}</p> : null}
      {children}
      {error ? <div role="alert" className="mt-2 text-[13.5px] font-semibold text-error">{error}</div> : null}
    </div>
  )
}

/** A month is entered as YYYY-MM and stored as the first of the month. */
function MonthField({ spec, value, onChange }: { spec: Omit<FieldSpec, 'type'>; value: string; onChange: (v: string) => void }) {
  const id = `khld-month-${spec.key}`
  return (
    <div className="col-span-12 min-w-0 sm:col-span-6 lg:col-span-4">
      <label htmlFor={id} className="mb-[7px] block font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
        {spec.label}{spec.required ? <span className="text-error"> {REQUIRED}</span> : null}
      </label>
      <input id={id} type="month" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr"
        className={`w-full min-h-11 border-[1.5px] bg-input px-[13px] py-[11px] text-[15px] text-ink ${spec.error ? 'border-error' : 'border-ink'}`} />
      {spec.help ? <div className="mt-[7px] text-[13.5px] text-muted">{spec.help}</div> : null}
      {spec.error ? <div role="alert" className="mt-2 text-[13.5px] font-semibold text-error">{spec.error}</div> : null}
    </div>
  )
}

function PartView({ f, part, p }: { f: KhldFieldDef; part: KhldPartDef; p: FieldViewProps }) {
  const L = useKhldLabels(p.fid)
  const { t } = useTranslation('khld')
  const label = L.part(f, part.column) ?? L.label(f)
  const v = (k: string) => p.values[k] ?? ''
  const spec = { key: part.column, label, ...(part.required ? { required: true } : {}) }
  if (part.type === 'text' || part.type === 'phone') {
    return <Field spec={{ ...spec, type: part.type === 'phone' ? 'tel' : 'text', span: 6, ...(part.type === 'phone' ? { ltr: true } : {}) }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'person_phone') {
    if (p.phoneOnFile) return <Field spec={{ ...spec, type: 'readonly', span: 6, text: p.person.phone, note: t('form.phoneOnFile'), ltr: true }} value={p.person.phone} onChange={() => {}} />
    return <Field spec={{ ...spec, type: 'tel', ltr: true, span: 6, placeholder: '07XXXXXXXX' }} value={p.person.phone} onChange={(x) => p.setPerson((s) => ({ ...s, phone: x }))} />
  }
  if (part.type === 'number' || part.type === 'money') {
    return <Field spec={{ ...spec, type: 'number', span: 4 }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
  }
  if (part.type === 'date') {
    return <Field spec={{ ...spec, type: 'date', span: 4 }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} />
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
    const rows = p.refs[part.ref ?? ''] ?? []
    const m = p.multi[q] ?? { ids: [], other: '' }
    return <Field spec={{ ...spec, type: 'checks', twoCol: rows.length > 4, options: rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) })) }} value={m.ids} onChange={() => {}} onToggle={(oid) => p.toggleMulti(q, oid)} />
  }
  if (part.type === 'record') {
    return <RecordPickerField base={{ key: part.column, label }} f={{ key: part.column, type: 'record', column: part.column, ...(part.table ? { table: part.table } : {}) }} value={v(part.column)} onChange={(x) => p.setValue(part.column, x)} p={p} />
  }
  return null
}

/** A select over another Khalidiyah table's live rows, by reference and title; a partner or enterprise may be typed new. */
function RecordPickerField({ base, f, value, onChange, sub, p }: {
  base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'>
  f: Pick<KhldFieldDef, 'key' | 'type' | 'table' | 'create' | 'column'>
  value: string
  onChange: (v: string) => void
  sub?: string | undefined
  p: FieldViewProps
}) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const picks = useKhldPicker(f.table as KhldTable | undefined)
  const options: FieldOption[] = (picks.data ?? []).map((r) => ({ value: r.id, label: r.date ? `${r.label} ${SEP} ${formatShortDate(r.date, locale)}` : r.label }))
  const partnerNew = f.create && f.table === 'khld_partner' && !value
  // SO4-G1 registers the owner on the same sheet, so an enterprise left
  // unpicked is made from them by the save; SO4-G2 has no owner block, so
  // one is typed new here and saved first.
  const enterpriseFromOwner = f.create && f.table === 'khld_enterprise' && !value && p.hasPerson
  const enterpriseNew = f.create && f.table === 'khld_enterprise' && !value && !p.hasPerson
  const types = p.refs['partner_type'] ?? []
  const typeChosen = types.find((r) => r.id === p.newPartner.typeId)
  return (
    <>
      <Field
        spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.recordPicker.none'),
          ...(sub && !base.help ? { help: sub } : {}),
          ...(picks.isError ? { error: t('form.recordPicker.loadFailed') } : {}) }}
        value={value}
        onChange={onChange}
      />
      {enterpriseFromOwner ? <div className="col-span-12 text-[13.5px] text-muted sm:col-span-6" style={{ textWrap: 'pretty' }}>{t('form.enterprise.fromOwner')}</div> : null}
      {enterpriseNew ? <NewEnterprise onCreated={onChange} /> : null}
      {partnerNew ? (
        <div className="col-span-12 border-s-[3px] border-border-default ps-4">
          <p className="mb-3 mt-0 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{t('form.partner.note')}</p>
          <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px]">
            <Field spec={{ key: 'new_partner_name', label: t('form.partner.name'), type: 'text', span: 6 }} value={p.newPartner.name} onChange={(x) => p.setNewPartner((s) => ({ ...s, name: x }))} />
            <Field spec={{ key: 'new_partner_type', label: t('form.partner.type'), type: 'select', span: 6, options: types.map((r) => ({ value: r.id, label: refLabel(r, locale) })) }} value={p.newPartner.typeId} onChange={(x) => p.setNewPartner((s) => ({ ...s, typeId: x }))} />
            {typeChosen?.allows_free_text ? <Field spec={{ key: 'new_partner_type_other', label: t('form.specify'), type: 'text', span: 6, required: true }} value={p.newPartner.typeOther} onChange={(x) => p.setNewPartner((s) => ({ ...s, typeOther: x }))} /> : null}
            <Field spec={{ key: 'new_partner_contact', label: t('form.partner.contact'), type: 'text', span: 6 }} value={p.newPartner.contact} onChange={(x) => p.setNewPartner((s) => ({ ...s, contact: x }))} />
          </div>
        </div>
      ) : null}
    </>
  )
}

/**
 * An enterprise added from the SO4-G2 log, which has no owner block of its
 * own (the owner is shown from the enterprise). Saved through the same save
 * function as every other record, so KHLD-ENT is issued by the database
 * (0145), then selected.
 */
function NewEnterprise({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useTranslation('khld')
  const [open, setOpen] = useState(false)
  const [d, setD] = useState({ name: '', owner: '', phone: '' })
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  const save = useSaveKhld('khld_enterprise')
  if (!open) return <div className="col-span-12 sm:col-span-6"><SecondaryButton onClick={() => setOpen(true)}>{t('form.enterprise.open')}</SecondaryButton></div>
  const ready = d.name.trim() || d.owner.trim()
  return (
    <div className="col-span-12 border-s-[3px] border-border-default ps-4">
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} /> : null}
      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      <div className="grid grid-cols-12 gap-x-[18px] gap-y-[14px]">
        <Field spec={{ key: 'new_ent_name', label: t('form.enterprise.name'), type: 'text', span: 6 }} value={d.name} onChange={(x) => setD({ ...d, name: x })} />
        <Field spec={{ key: 'new_ent_owner', label: t('form.enterprise.owner'), type: 'text', span: 6 }} value={d.owner} onChange={(x) => setD({ ...d, owner: x })} />
        <Field spec={{ key: 'new_ent_phone', label: t('form.enterprise.phone'), type: 'tel', ltr: true, span: 6 }} value={d.phone} onChange={(x) => setD({ ...d, phone: x })} />
      </div>
      <div className="mt-3 flex gap-2">
        <SecondaryButton onClick={() => setOpen(false)}>{t('form.enterprise.cancel')}</SecondaryButton>
        <PrimaryButton disabled={!ready || save.isPending} onClick={() => {
          setOutcome(null)
          void save.mutateAsync({ row: { enterprise_name: d.name.trim() || null, owner_name: d.owner.trim() || null, owner_phone: d.phone.trim() || null } })
            .then((res) => { setOutcome(res); if (res.ok) { setOpen(false); onCreated(res.id) } })
        }}>
          {t('form.enterprise.add')}
        </PrimaryButton>
      </div>
    </div>
  )
}

/** The volunteers present at an occasion: one participation row each, merged by volunteer on save. */
function ParticipantsField({ label, help, sub, required, error, rows, setRows }: {
  label: string; help?: string | undefined; sub?: string | undefined; required: boolean; error?: string | undefined
  rows: Participant[]; setRows: (u: (s: Participant[]) => Participant[]) => void
}) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const picks = useKhldPicker('khld_volunteer')
  const options = (picks.data ?? []).map((r) => ({ value: r.id, label: r.date ? `${r.label} ${SEP} ${formatShortDate(r.date, locale)}` : r.label }))
  const upd = (i: number, patch: Partial<Participant>) => setRows((s) => s.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  return (
    <Block label={label} required={required} help={help ?? sub} error={error} counting={false}>
      {picks.isError ? <p className="m-0 text-[13.5px] text-error">{t('form.participants.loadFailed')}</p> : null}
      {rows.length === 0 ? <p className="m-0 text-[13.5px] text-muted">{t('form.participants.none')}</p> : null}
      {rows.length > 0 ? (
        <ul className="m-0 list-none divide-y divide-border-default border-[1.5px] border-ink p-0">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
              <select value={r.volunteer_id} disabled={r.existing} onChange={(e) => upd(i, { volunteer_id: e.target.value })} className={`${INPUT} col-span-12 sm:col-span-6`} aria-label={t('form.participants.volunteer')}>
                <option value="">{t('form.choose')}</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="number" min={0} step="0.5" dir="ltr" value={r.hours} placeholder={t('form.participants.hours')} onChange={(e) => upd(i, { hours: e.target.value })} className={`${INPUT} col-span-5 sm:col-span-2`} aria-label={t('form.participants.hours')} />
              <label className="col-span-7 flex items-center gap-2 text-[13px] sm:col-span-3">
                <input type="checkbox" checked={r.verified} onChange={(e) => upd(i, { verified: e.target.checked })} />
                {t('form.participants.verified')}
              </label>
              {!r.existing ? (
                <button type="button" onClick={() => setRows((s) => s.filter((_, j) => j !== i))} className="col-span-12 text-start font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted underline sm:col-span-1">{t('form.participants.remove')}</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <SecondaryButton onClick={() => setRows((s) => [...s, { volunteer_id: '', hours: '', verified: false, existing: false }])}>{t('form.participants.add')}</SecondaryButton>
        {rows.some((r) => r.existing) ? <span className="text-[13px] text-muted">{t('form.participants.kept')}</span> : null}
      </div>
    </Block>
  )
}

/** SO3-0's log of one volunteer's participations: read from the register, never typed here. */
export function ParticipationLog({ label, help, sub, volunteerId }: { label: string; help?: string | undefined; sub?: string | undefined; volunteerId: string }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const log = useVolunteerParticipations(volunteerId || undefined)
  return (
    <Block label={label} required={false} help={help ?? sub} counting={false}>
      {!volunteerId ? <p className="m-0 text-[13.5px] text-muted">{t('form.log.chooseVolunteer')}</p> : null}
      {volunteerId && log.data && log.data.length === 0 ? <p className="m-0 text-[13.5px] text-muted">{t('form.log.none')}</p> : null}
      {log.data && log.data.length > 0 ? (
        <div className="overflow-x-auto border-[1.5px] border-ink">
          <table className="w-full min-w-[480px] text-[14px]">
            <thead>
              <tr className="border-b-[3px] border-ink font-narrow text-[11px] uppercase tracking-[0.12em]">
                <th className="px-3 py-2 text-start">{t('form.log.date')}</th>
                <th className="px-3 py-2 text-start">{t('form.log.kind')}</th>
                <th className="px-3 py-2 text-start">{t('form.log.reference')}</th>
                <th className="px-3 py-2 text-end">{t('form.log.hours')}</th>
                <th className="px-3 py-2 text-start">{t('form.log.verified')}</th>
              </tr>
            </thead>
            <tbody>
              {log.data.map((r) => (
                <tr key={r.id} className="border-b border-border-default">
                  <td className="px-3 py-2">{formatShortDate(r.participated_on, locale)}</td>
                  <td className="px-3 py-2">{t(`form.log.kind_${r.kind}`)}</td>
                  <td className="px-3 py-2"><OccasionRef p={r} /></td>
                  <td className="px-3 py-2 text-end" dir="ltr">{r.hours == null ? '' : String(r.hours)}</td>
                  <td className="px-3 py-2">{r.verified ? t('form.yes') : t('form.no')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Block>
  )
}

function OccasionRef({ p }: { p: { kind: string; campaign_id: string | null; action_day_id: string | null; activity_id: string | null; market_id: string | null; reference_text: string | null } }) {
  const table: KhldTable | undefined =
    p.campaign_id ? 'khld_campaign' : p.action_day_id ? 'khld_action_day' : p.activity_id ? 'khld_activity' : p.market_id ? 'khld_market' : undefined
  const id = p.campaign_id ?? p.action_day_id ?? p.activity_id ?? p.market_id ?? undefined
  const rec = useKhldRecord(table ?? 'khld_activity', table ? id : undefined)
  if (!table) return <>{p.reference_text ?? ''}</>
  const ref = rec.data && typeof rec.data.row['reference'] === 'string' ? (rec.data.row['reference'] as string) : '…'
  return <span dir="ltr">{ref}</span>
}

/** A column the database assigns or works out: shown, never typed. */
function DerivedField({ base, f, p, sub }: {
  base: Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'tag' | 'tagAccent'>
  f: KhldFieldDef
  p: FieldViewProps
  sub?: string | undefined
}) {
  const d = useDerived(f, {
    record: p.record, values: p.values, mode: p.mode, refs: p.refs,
    personId: p.personId,
    enterpriseId: p.values['enterprise_id'] || undefined,
    duplicateOf: p.hasPerson ? 'person' : 'enterprise',
    personNew: p.personNew,
  })
  // the sheet's option cell is a hint for an empty field, not a caption for a value
  const note = d.note ?? (d.text ? undefined : sub)
  return (
    <Field
      spec={{ ...base, type: 'readonly', span: 6, ...(d.text ? { text: d.text } : {}), ...(note ? { note } : {}), ...(f.derived === 'reference' || f.derived === 'vendor_reference' ? { ltr: true } : {}) }}
      value=""
      onChange={() => {}}
    />
  )
}
