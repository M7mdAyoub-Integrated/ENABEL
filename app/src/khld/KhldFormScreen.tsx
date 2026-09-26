import { useMemo, useState } from 'react'
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
import { EvidencePanel } from '../components/EvidencePanel'
import {
  identifierOf, isCompleteId, normaliseIdNumber, useConfirmedPartners, useKhldPersonLookup, useKhldPicker, useKhldRecord,
  useKhldRefs, usePersonPicker, useRestoreKhldPerson, useSaveKhld,
  type KhldIdType, type KhldOption, type KhldPick, type KhldRecord, type PersonLookup, type SavePayload, type SaveResult,
} from '../data/khld'
import { EMPTY_ANSWERS, answersFromRecord, codeOf, isOn, listsOf, type Answers } from './answers'
import { formDef, formOfTable, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldFormDef, KhldTable } from './types'
import { SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One screen renders all twenty-three Khalidiyah forms.
 *
 *  The definition (forms.generated.ts) says what each field IS; the sheet's
 *  words (khld.json) say what it is CALLED, in both languages; the database
 *  says whether it is RIGHT. This component only carries the answers from the
 *  controls to the save payload and back.
 *
 *  The person block (FORM-12, -15, -17): the ID type is chosen first, and
 *  the number is looked up as soon as it is complete. On file -> the name is
 *  shown and locked, the details are shown where known and editable where
 *  empty. Not on file -> the person is created by the save. Soft-deleted ->
 *  the lookup says so, names who deleted them, and a coordinator can restore
 *  from here; nothing is recreated.
 *
 *  A field whose answer is not chosen (`when`) is dimmed and sent BLANK,
 *  whatever it held, and a multi-select's question is always listed, so its
 *  old rows are cleared too. Validation is computed on every render and
 *  `touched` only decides whether the messages are shown, for the reason
 *  RmthFormScreen spells out: the first click must stop on the same values
 *  the second one would.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Person = { idNumber: string; name: string; phone: string; sex: string; dob: string }
const EMPTY_PERSON: Person = { idNumber: '', name: '', phone: '', sex: '', dob: '' }

export function KhldFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { form, id } = useParams()
  // keyed, so moving from one form to another starts from empty answers
  return <FormFor key={`${form ?? ''}:${id ?? 'new'}`} mode={mode} fid={form as KhldFormId} id={id} />
}

function FormFor({ mode, fid, id }: { mode: 'new' | 'edit'; fid: KhldFormId; id: string | undefined }) {
  const def = formDef(fid)
  const L = useKhldLabels(fid)
  const { t } = useTranslation(['khld', 'forms'])
  const navigate = useNavigate()
  const toast = useToast()

  const rec = useKhldRecord(def.table, mode === 'edit' ? id : undefined)
  const save = useSaveKhld(def.table)
  const refs = useKhldRefs(useMemo(() => listsOf(def), [def]))

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [person, setPerson] = useState<Person>(EMPTY_PERSON)
  const [touched, setTouched] = useState(false)
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // ── hydrate once from the record in edit mode (during render, keyed on id) ──
  if (mode === 'edit' && id && rec.data && loadedId !== id) {
    setLoadedId(id)
    setAnswers(answersFromRecord(def, rec.data))
    const p = rec.data.person
    if (p) {
      setPerson({ idNumber: identifierOf(p)?.value ?? '', name: p.full_name, phone: p.phone ?? '', sex: p.sex ?? '', dob: p.date_of_birth ?? '' })
    }
  }

  const idTypeField = def.fields.find((f) => f.kind === 'id_type')
  const hasPerson = !!idTypeField
  const personLocked = mode === 'edit' && !!rec.data?.person
  const idType = (codeOf(refs, idTypeField?.list, answers.values[idTypeField?.column ?? '']) ?? '') as KhldIdType | ''
  const idNorm = normaliseIdNumber(idType, person.idNumber)
  const idComplete = isCompleteId(idType, idNorm)
  const lookup = useKhldPersonLookup(idType, hasPerson && !personLocked ? person.idNumber : '')
  const found: PersonLookup | null = lookup.data ?? null
  const onFile = !!found && !found.deleted_at
  const foundDeleted = !!found && !!found.deleted_at
  const filed = personLocked ? rec.data?.person ?? null : onFile ? found : null
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null)

  // ── an identifier on file prefills identity and locks the name ─────────
  // Keyed on the identifier the lookup answered for, so a refetch does not
  // overwrite the typing. Only the NAME is authoritative; the rest fills
  // empty controls only, as khld_ensure_person fills empty columns only.
  if (found && !found.deleted_at && prefilledFrom !== `${idType}:${idNorm}`) {
    setPrefilledFrom(`${idType}:${idNorm}`)
    setPerson((p) => ({
      ...p,
      name: found.full_name,
      phone: p.phone || (found.phone ?? ''),
      sex: p.sex || (found.sex ?? ''),
      dob: p.dob || (found.date_of_birth ?? ''),
    }))
  }

  const on = (f: KhldFieldDef) => isOn(def, f, answers, refs)
  const setValue = (k: string, v: string) => setAnswers((a) => ({ ...a, values: { ...a.values, [k]: v } }))

  /* ── validation ───────────────────────────────────────────────────────── */
  const errors: Record<string, string> = {}
  const req = t('khld:form.required')
  for (const f of def.fields) {
    if (!on(f)) continue
    const v = (answers.values[f.column ?? ''] ?? '').trim()
    switch (f.kind) {
      case 'text': case 'area': case 'date': case 'likert': case 'person_ref':
        if (f.required && !v) errors[f.id] = req
        break
      case 'int': case 'money': case 'percent': {
        if (f.required && !v) { errors[f.id] = req; break }
        if (!v) break
        const n = Number(v)
        if (!Number.isFinite(n) || (f.kind === 'int' && !Number.isInteger(n))) errors[f.id] = req
        else if (f.max != null && (n < (f.min ?? 0) || n > f.max)) errors[f.id] = t('khld:form.range', { min: f.min ?? 0, max: f.max })
        else if (f.min != null && n < f.min) errors[f.id] = t('khld:form.min', { min: f.min })
        break
      }
      case 'bool':
        if (f.required && !v) errors[f.id] = req
        else if (f.mustBeTrue && v === 'false') errors[f.id] = t('khld:volunteer.not_eligible')
        break
      case 'select': case 'id_type': {
        if (f.required && !v) { errors[f.id] = req; break }
        const chosen = (refs[f.list ?? ''] ?? []).find((r) => r.id === v)
        if (f.other && chosen?.allows_free_text && !(answers.values[f.other] ?? '').trim()) errors[f.id] = t('khld:form.specify')
        break
      }
      case 'multi': {
        const m = answers.multi[f.question ?? ''] ?? { ids: [], other: '' }
        if (f.required && m.ids.length === 0) { errors[f.id] = req; break }
        const free = (refs[f.list ?? ''] ?? []).some((r) => r.allows_free_text && m.ids.includes(r.id))
        if (free && !m.other.trim()) errors[f.id] = t('khld:form.specify')
        break
      }
      case 'record':
        if (f.required && !v && !answers.extras[f.id]) errors[f.id] = req
        break
      case 'records':
        if (f.required && answers.partners.length === 0) errors[f.id] = req
        break
      case 'occasion':
        if (f.required && !answers.occasion) errors[f.id] = req
        break
      case 'ident':
        if (personLocked) break
        if (!idType) errors[f.id] = t('khld:form.idTypeFirst')
        else if (!idComplete) errors[f.id] = idType === 'national_id' ? t('khld:form.nidInvalid') : t('khld:form.idEmpty')
        break
      case 'person_name':
        if (f.required && !personLocked && !onFile && !person.name.trim()) errors[f.id] = req
        break
      case 'person_sex':
        if (f.required && !person.sex) errors[f.id] = req
        break
      case 'dob':
        if (f.required && !person.dob) errors[f.id] = req
        break
      case 'person_phone':
        if (f.required && !filed?.phone && !person.phone.trim()) errors[f.id] = req
        break
      default:
        break
    }
  }
  const invalid = Object.keys(errors).length > 0
  const shown = touched ? errors : {}

  /* ── the payload ──────────────────────────────────────────────────────── */
  function buildPayload(): SavePayload {
    const row: Record<string, unknown> = {}
    const put = (col: string, kind: string, raw: string | undefined) => {
      const v = (raw ?? '').trim()
      if (kind === 'int' || kind === 'money' || kind === 'percent' || kind === 'likert') row[col] = v === '' ? null : Number(v)
      else if (kind === 'bool') row[col] = v === '' ? null : v === 'true'
      else row[col] = v === '' ? null : v
    }
    for (const f of def.fields) {
      const fieldOn = on(f)
      if (f.kind === 'id_type') {
        // the ID type is fixed with the person once saved
        if (!personLocked) put(f.column!, 'select', answers.values[f.column!])
        continue
      }
      if (f.kind === 'occasion') {
        const [kind, oid] = (fieldOn ? answers.occasion : '').split(':')
        row['campaign_id'] = kind === 'campaign' ? oid : null
        row['activity_id'] = kind === 'activity' ? oid : null
        continue
      }
      if (f.kind === 'record' && f.extra) {
        const extra = fieldOn && !!answers.extras[f.id]
        row[f.column!] = fieldOn && !extra ? answers.values[f.column!] || null : null
        if (f.extra.column) row[f.extra.column] = extra
        continue
      }
      if (!f.column || f.kind === 'stamp' || f.kind === 'reference') continue
      put(f.column, f.kind, fieldOn ? answers.values[f.column] : '')
      if (f.other) {
        const chosen = (refs[f.list ?? ''] ?? []).find((r) => r.id === answers.values[f.column!])
        put(f.other, 'text', fieldOn && chosen?.allows_free_text ? answers.values[f.other] : '')
      }
    }

    const payload: SavePayload = { row }
    if (mode === 'edit' && id) payload.id = id

    const multis = def.fields.filter((f) => f.kind === 'multi' && f.question)
    if (multis.length) {
      const options: KhldOption[] = []
      for (const f of multis) {
        if (!on(f)) continue
        const m = answers.multi[f.question!]
        if (!m) continue
        for (const oid of m.ids) {
          const r = (refs[f.list ?? ''] ?? []).find((x) => x.id === oid)
          options.push({ question_code: f.question!, option_id: oid, option_other: r?.allows_free_text ? m.other.trim() || null : null })
        }
      }
      payload.option_questions = multis.map((f) => f.question!)
      payload.options = options
    }
    const records = def.fields.find((f) => f.kind === 'records')
    if (records) payload.partners = on(records) ? answers.partners : []

    if (hasPerson && !personLocked) {
      payload.person = {
        id_number: idNorm,
        ...(person.name.trim() ? { full_name: person.name.trim() } : {}),
        ...(person.phone.trim() ? { phone: person.phone.trim() } : {}),
        ...(person.sex ? { sex: person.sex } : {}),
        ...(person.dob ? { date_of_birth: person.dob } : {}),
      }
    } else if (hasPerson && personLocked && rec.data?.person) {
      // What an edit may add to a locked person: the details that were empty.
      const p = rec.data.person
      const fill = {
        ...(!p.phone && person.phone.trim() ? { phone: person.phone.trim() } : {}),
        ...(!p.sex && person.sex ? { sex: person.sex } : {}),
        ...(!p.date_of_birth && person.dob ? { date_of_birth: person.dob } : {}),
      }
      if (Object.keys(fill).length) payload.person = { id_number: identifierOf(p)?.value ?? '', ...fill }
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
        sub: L.sheet,
      })
      navigate(`/khld/${fid}/${res.id}`)
    }
  }

  const backTo = mode === 'edit' && id ? `/khld/${fid}/${id}` : `/khld/${fid}`

  if (mode === 'edit' && rec.isLoading) {
    return (
      <>
        <PageHead eyebrow={L.sheet} title={t('khld:form.editTitle', { title: L.short })} size="md" />
        <FormSkeleton />
      </>
    )
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(backTo)}>{t('khld:form.back')}</BackLink>}
        eyebrow={L.sheet}
        title={mode === 'new' ? t('khld:form.newTitle', { title: L.title }) : t('khld:form.editTitle', { title: L.title })}
        description={def.indicators.join(` ${SEP} `)}
        size="md"
      />

      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} fid={fid} /> : null}
      {foundDeleted && found ? <DeletedPersonBand found={found} /> : null}

      <section className="mt-[34px]">
        <SectionRule title={L.title} />
        <div className="mt-5 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
          {def.fields.map((f) => (
            <FieldView
              key={f.id}
              f={f}
              def={def}
              fid={fid}
              mode={mode}
              recordId={mode === 'edit' ? id : undefined}
              record={rec.data}
              answers={answers}
              setAnswers={setAnswers}
              setValue={setValue}
              refs={refs}
              off={!on(f)}
              error={shown[f.id]}
              person={person}
              setPerson={setPerson}
              personLocked={personLocked}
              filed={filed}
              lookingUp={lookup.isFetching}
              idType={idType}
              idComplete={idComplete}
              onFile={onFile}
            />
          ))}
        </div>
      </section>

      <div className="mt-[34px] flex flex-col gap-4 border-t-[3px] border-ink pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{L.sheet}</span>
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

/* ── refusals ─────────────────────────────────────────────────────────────── */

export function RefusalBand({ outcome, fid }: { outcome: Exclude<SaveResult, { ok: true }>; fid: KhldFormId }) {
  const { t } = useTranslation(['khld', 'errors'])
  const L = useKhldLabels(fid)
  const r = outcome.result
  const known = r === 'invalid' ? constraintMessageKey(outcome.constraint) : null
  // A rule between fields (khld_field_rule, 0158) names the field it refused:
  // khld_f015_required, khld_f030_not_applicable. Worded from the field's label.
  const rule = r === 'invalid' ? /^khld_f(\d{3})_(required|not_applicable)$/.exec(outcome.constraint ?? '') : null
  const text =
    rule ? t(rule[2] === 'required' ? 'khld:form.ruleRequired' : 'khld:form.ruleNotApplicable', { label: L.label({ id: `F${rule[1]}` }) })
    : r === 'not_found' ? t('khld:form.notFound')
    : r === 'person_deleted' ? t('khld:form.deleted.person')
    : r === 'unknown_column' ? t('khld:form.unknownColumn', { column: outcome.column ?? '?' })
    : r === 'unknown_block' ? t('khld:form.unknownBlock', { block: outcome.block ?? '?' })
    : known ? t('khld:form.invalid', { message: t(known) })
    : t('khld:form.invalid', { message: outcome.message ?? outcome.constraint ?? r })
  return (
    <div role="alert" className="mt-[18px] bg-error px-[18px] py-[14px] text-bg">
      <div className="flex items-baseline gap-[14px]">
        <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('khld:form.notSaved')}</span>
        <span className="text-[15px] font-medium">{text}</span>
      </div>
    </div>
  )
}

/** The identifier typed belongs to a deleted person: who, when, by whom, and the way forward. */
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
      {restore.isSuccess ? <p className="mb-0 mt-2 text-[13.5px]">{t('form.deleted.restored')}</p> : null}
      {can(role, 'record.delete') ? (
        restore.isSuccess ? null : <div className="mt-2"><SecondaryButton disabled={restore.isPending} onClick={() => void restore.mutateAsync(found.id)}>{t('form.deleted.restore')}</SecondaryButton></div>
      ) : <p className="mb-0 mt-2 text-[13.5px]">{t('form.deleted.coordinatorOnly')}</p>}
    </div>
  )
}

/* ── one field ─────────────────────────────────────────────────────────── */

type FieldViewProps = {
  f: KhldFieldDef
  def: KhldFormDef
  fid: KhldFormId
  mode: 'new' | 'edit'
  recordId?: string | undefined
  record?: KhldRecord | undefined
  answers: Answers
  setAnswers: (u: (a: Answers) => Answers) => void
  setValue: (k: string, v: string) => void
  refs: Record<string, RefRow[]>
  /** The field's answer is not chosen: present, dimmed, not answerable. */
  off: boolean
  error?: string | undefined
  person: Person
  setPerson: (u: (p: Person) => Person) => void
  personLocked: boolean
  /** The person as the database holds them: the saved one on edit, the one found on new. */
  filed: { full_name: string; phone: string | null; sex: string | null; date_of_birth: string | null } | null
  lookingUp: boolean
  idType: KhldIdType | ''
  idComplete: boolean
  onFile: boolean
}

type Base = Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'dim' | 'disabled'>

function FieldView(p: FieldViewProps) {
  const { f, fid } = p
  const L = useKhldLabels(fid)
  const { t } = useTranslation('khld')
  const label = L.label(f)
  const help = L.help(f)
  const base: Base = {
    key: f.id,
    label,
    ...(help ? { help } : {}),
    ...(f.required ? { required: true } : {}),
    ...(p.error ? { error: p.error } : {}),
    ...(p.off ? { dim: true, disabled: true } : {}),
  }
  const opts = (rows: RefRow[]): FieldOption[] => rows.map((r) => ({ value: r.id, label: refLabel(r, L.locale) }))
  const col = f.column ?? ''
  const v = p.answers.values[col] ?? ''

  switch (f.kind) {
    /* the person block */
    case 'id_type': {
      const rows = p.refs[f.list ?? ''] ?? []
      return (
        <Field
          spec={{ ...base, type: 'radio', span: 12, options: opts(rows), ...(p.personLocked ? { disabled: true } : {}) }}
          value={v}
          onChange={(x) => { p.setValue(col, x); p.setPerson((s) => ({ ...s, idNumber: '' })) }}
        />
      )
    }
    case 'ident': {
      const match = !p.personLocked && p.idComplete
        ? { match: { text: p.lookingUp ? t('form.lookingUp') : p.onFile ? t('form.onFile') : t('form.newPerson'), ok: true } }
        : {}
      return (
        <Field
          spec={{ ...base, type: 'text', ltr: true, span: 6, ...(p.idType === 'national_id' ? { placeholder: '000000000' } : {}),
            ...(p.personLocked ? { disabled: true, note: t('form.personLocked') } : {}), ...match }}
          value={p.person.idNumber}
          onChange={(x) => p.setPerson((s) => ({ ...s, idNumber: x }))}
        />
      )
    }
    case 'person_name': {
      const locked = !!p.filed
      return (
        <Field
          spec={{ ...base, type: locked ? 'readonly' : 'text', span: 6, ...(locked ? { text: p.filed!.full_name } : {}) }}
          value={p.person.name}
          onChange={(x) => p.setPerson((s) => ({ ...s, name: x }))}
        />
      )
    }
    case 'person_phone':
      if (p.filed?.phone) {
        return <Field spec={{ ...base, type: 'readonly', span: 6, text: p.filed.phone, note: t('form.phoneOnFile'), ltr: true }} value={p.filed.phone} onChange={() => {}} />
      }
      return <Field spec={{ ...base, type: 'tel', ltr: true, span: 6, placeholder: '07XXXXXXXX' }} value={p.person.phone} onChange={(x) => p.setPerson((s) => ({ ...s, phone: x }))} />
    case 'person_sex': {
      // person.sex is sex_t ('male' / 'female'), the list's codes
      const rows = p.refs[f.list ?? 'sex'] ?? []
      const options = rows.map((r) => ({ value: r.code, label: refLabel(r, L.locale) }))
      if (p.filed?.sex) return <Field spec={{ ...base, type: 'readonly', span: 6, text: options.find((o) => o.value === p.filed!.sex)?.label ?? p.filed.sex }} value="" onChange={() => {}} />
      return <Field spec={{ ...base, type: 'radio', span: 6, options }} value={p.person.sex} onChange={(x) => p.setPerson((s) => ({ ...s, sex: x }))} />
    }
    case 'dob':
      if (p.filed?.date_of_birth) return <Field spec={{ ...base, type: 'readonly', span: 4, text: formatShortDate(p.filed.date_of_birth, L.locale) }} value="" onChange={() => {}} />
      return <Field spec={{ ...base, type: 'date', span: 4 }} value={p.person.dob} onChange={(x) => p.setPerson((s) => ({ ...s, dob: x }))} />

    /* one column */
    case 'text':
      return <Field spec={{ ...base, type: 'text', span: 6, ...(f.ltr ? { ltr: true } : {}) }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'area':
      return <Field spec={{ ...base, type: 'area' }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'int': case 'money': case 'percent':
      return <Field spec={{ ...base, type: 'number', span: 4 }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'date':
      return <Field spec={{ ...base, type: 'date', span: 4 }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'bool': {
      const options = (['true', 'false'] as const).map((val) => ({ value: val, label: L.opt(f, val) }))
      return <Field spec={{ ...base, type: 'radio', span: 6, options }} value={v} onChange={(x) => p.setValue(col, x)} />
    }
    case 'likert': {
      const options = ['1', '2', '3', '4', '5'].map((val) => ({ value: val, label: L.opt(f, val) }))
      return <Field spec={{ ...base, type: 'radio', span: 12, options }} value={v} onChange={(x) => p.setValue(col, x)} />
    }
    case 'select': {
      const rows = p.refs[f.list ?? ''] ?? []
      const chosen = rows.find((r) => r.id === v)
      return (
        <>
          <Field spec={{ ...base, type: 'select', span: 6, options: opts(rows) }} value={v} onChange={(x) => p.setValue(col, x)} />
          {f.other && chosen?.allows_free_text && !p.off ? (
            <Field spec={{ key: f.other, label: t('form.specify'), type: 'text', span: 6, required: true }} value={p.answers.values[f.other] ?? ''} onChange={(x) => p.setValue(f.other!, x)} />
          ) : null}
        </>
      )
    }
    case 'multi': {
      const q = f.question ?? ''
      const rows = p.refs[f.list ?? ''] ?? []
      const m = p.answers.multi[q] ?? { ids: [], other: '' }
      const otherOn = rows.some((r) => r.allows_free_text && m.ids.includes(r.id))
      const toggle = (oid: string) => p.setAnswers((a) => {
        const cur = a.multi[q] ?? { ids: [], other: '' }
        const ids = cur.ids.includes(oid) ? cur.ids.filter((x) => x !== oid) : [...cur.ids, oid]
        return { ...a, multi: { ...a.multi, [q]: { ...cur, ids } } }
      })
      return (
        <>
          <Field spec={{ ...base, type: 'checks', twoCol: rows.length > 4, options: opts(rows) }} value={m.ids} onChange={() => {}} onToggle={(oid) => { if (!p.off) toggle(oid) }} />
          {otherOn && !p.off ? (
            <Field
              spec={{ key: `${q}_other`, label: t('form.specify'), type: 'text', span: 6, required: true }}
              value={m.other}
              onChange={(x) => p.setAnswers((a) => ({ ...a, multi: { ...a.multi, [q]: { ids: a.multi[q]?.ids ?? [], other: x } } }))}
            />
          ) : null}
        </>
      )
    }

    /* links to other records */
    case 'record':
      return <RecordPicker base={base} f={f} p={p} />
    case 'records':
      return <PartnersPicker base={base} p={p} />
    case 'occasion':
      return <OccasionPicker base={base} p={p} />
    case 'person_ref':
      return <PersonRefPicker base={base} f={f} p={p} />
    case 'shown':
      return <Shown base={base} f={f} p={p} />

    /* what the database sets */
    case 'reference': {
      const ref = p.record && typeof p.record.row['reference'] === 'string' ? (p.record.row['reference'] as string) : ''
      return <Field spec={{ ...base, type: 'readonly', span: 6, ltr: true, ...(ref ? { text: ref } : { note: t('form.assignedOnSave') }) }} value="" onChange={() => {}} />
    }
    case 'stamp': {
      const s = p.record && typeof p.record.row[col] === 'string' ? (p.record.row[col] as string) : ''
      return <Field spec={{ ...base, type: 'readonly', span: 6, ...(s ? { text: formatShortDate(s, L.locale) } : { note: t('form.stampedOnSave') }) }} value="" onChange={() => {}} />
    }
    case 'file':
      if (!p.recordId) return <Field spec={{ ...base, type: 'readonly', note: t('form.filesAfterSave') }} value="" onChange={() => {}} />
      return (
        <div className="col-span-12">
          <EvidencePanel
            entityType={p.def.table}
            entityId={p.recordId}
            fieldCode={f.id}
            title={label}
            maxFiles={f.maxFiles}
            note={t('detail.files.max', { max: f.maxFiles ?? 5 })}
            compact
          />
        </div>
      )
    default:
      return null
  }
}

/** Today, as the date columns hold it. */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pickLabel(r: KhldPick, locale: string): string {
  return r.date ? `${r.label} ${SEP} ${formatShortDate(r.date, locale)}` : r.label
}

/** The picks a record field offers: the table's live rows, narrowed as the field says; the saved choice always stays. */
function usePicks(f: KhldFieldDef, current: string, refs: Record<string, RefRow[]>) {
  const picks = useKhldPicker(f.table as KhldTable | undefined)
  const confirmed = useConfirmedPartners(!!f.confirmed)
  const heldId = (refs['event_status'] ?? []).find((r) => r.code === 'held')?.id
  const now = today()
  const rows = (picks.data ?? []).filter((r) => {
    if (r.id === current) return true
    if (f.window && f.window.length === 2) {
      const from = r.raw[f.window[0]!]
      const to = r.raw[f.window[1]!]
      if (typeof from !== 'string' || typeof to !== 'string' || now < from || now > to) return false
    }
    if (f.confirmed && !confirmed.data?.has(r.id)) return false
    if (f.held && r.raw['status_id'] !== heldId) return false
    if (f.table === 'khld_volunteer' && r.raw['application_status'] === 'rejected') return false
    return true
  })
  return { rows, isError: picks.isError || confirmed.isError, isLoading: picks.isLoading }
}

function RecordPicker({ base, f, p }: { base: Base; f: KhldFieldDef; p: FieldViewProps }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const L = useKhldLabels(p.fid)
  const col = f.column ?? ''
  const current = p.answers.values[col] ?? ''
  const { rows, isError } = usePicks(f, current, p.refs)
  const options: FieldOption[] = rows.map((r) => ({ value: r.id, label: pickLabel(r, locale) }))
  const extraLabel = f.extra ? L.extra(f) : undefined
  if (f.extra && extraLabel) options.push({ value: '__extra__', label: extraLabel })
  const value = p.answers.extras[f.id] ? '__extra__' : current
  const note = f.window ? t('form.picker.window') : f.confirmed ? t('form.picker.confirmed') : f.held ? t('form.picker.held') : undefined
  return (
    <Field
      spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.picker.none'),
        ...(note && !base.help ? { help: note } : {}),
        ...(isError ? { error: t('form.picker.loadFailed') } : {}) }}
      value={value}
      onChange={(x) => p.setAnswers((a) => ({
        ...a,
        values: { ...a.values, [col]: x === '__extra__' ? '' : x },
        extras: { ...a.extras, [f.id]: x === '__extra__' },
      }))}
    />
  )
}

function PartnersPicker({ base, p }: { base: Base; p: FieldViewProps }) {
  const { t } = useTranslation('khld')
  const picks = useKhldPicker('khld_partner')
  const options: FieldOption[] = (picks.data ?? []).map((r) => ({ value: r.id, label: r.label }))
  const toggle = (id: string) => p.setAnswers((a) => ({
    ...a,
    partners: a.partners.includes(id) ? a.partners.filter((x) => x !== id) : [...a.partners, id],
  }))
  return (
    <Field
      spec={{ ...base, type: 'checks', twoCol: options.length > 4, options,
        ...(picks.isError ? { error: t('form.picker.loadFailed') } : picks.data && !picks.data.length ? { help: t('form.picker.noneToChoose') } : {}) }}
      value={p.answers.partners}
      onChange={() => {}}
      onToggle={(id) => { if (!p.off) toggle(id) }}
    />
  )
}

/** F147: one campaign (FORM-07) or one activity (FORM-08). */
function OccasionPicker({ base, p }: { base: Base; p: FieldViewProps }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const campaigns = useKhldPicker('khld_campaign')
  const activities = useKhldPicker('khld_activity')
  const options: FieldOption[] = [
    ...(campaigns.data ?? []).map((r) => ({ value: `campaign:${r.id}`, label: `${t('form.occasion.campaign')} ${SEP} ${pickLabel(r, locale)}` })),
    ...(activities.data ?? []).map((r) => ({ value: `activity:${r.id}`, label: `${t('form.occasion.activity')} ${SEP} ${pickLabel(r, locale)}` })),
  ]
  return (
    <Field
      spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.picker.none'),
        ...(campaigns.isError || activities.isError ? { error: t('form.picker.loadFailed') } : {}) }}
      value={p.answers.occasion}
      onChange={(x) => p.setAnswers((a) => ({ ...a, occasion: x }))}
    />
  )
}

/** F112, F197, F206: a person registered on another form. */
function PersonRefPicker({ base, f, p }: { base: Base; f: KhldFieldDef; p: FieldViewProps }) {
  const { t } = useTranslation('khld')
  const people = usePersonPicker(f.table as KhldTable | undefined)
  const col = f.column ?? ''
  const current = p.answers.values[col] ?? ''
  const options: FieldOption[] = (people.data ?? []).map((r) => ({ value: r.id, label: r.identifier ? `${r.label} ${SEP} ${r.identifier}` : r.label }))
  if (current && !options.some((o) => o.value === current) && p.record?.person) {
    options.unshift({ value: current, label: p.record.person.full_name })
  }
  const source = formOfTable(f.table ?? '')
  const sourceName = source ? t(`forms.${source}.short`) : ''
  return (
    <Field
      spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.picker.none'),
        ...(!base.help && sourceName ? { help: t('form.picker.fromSource', { form: sourceName }) } : {}),
        ...(people.isError ? { error: t('form.picker.loadFailed') } : {}) }}
      value={current}
      onChange={(x) => p.setValue(col, x)}
    />
  )
}

/** F069, F111: the name of the person the other field picked. */
function Shown({ base, f, p }: { base: Base; f: KhldFieldDef; p: FieldViewProps }) {
  const { t } = useTranslation('khld')
  const of = p.def.fields.find((x) => x.id === f.of)
  const id = p.answers.values[of?.column ?? ''] ?? ''
  const volunteers = useKhldPicker(of?.kind === 'record' ? (of.table as KhldTable) : undefined)
  const people = usePersonPicker(of?.kind === 'person_ref' ? (of.table as KhldTable) : undefined)
  const name = !id ? ''
    : of?.kind === 'record' ? volunteers.data?.find((r) => r.id === id)?.name ?? ''
    : people.data?.find((r) => r.id === id)?.label ?? p.record?.person?.full_name ?? ''
  return <Field spec={{ ...base, type: 'readonly', span: 6, ...(name ? { text: name } : { note: t('form.shownFrom') }) }} value="" onChange={() => {}} />
}

export default KhldFormScreen
