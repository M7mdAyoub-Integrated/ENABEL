import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Field, type FieldOption, type FieldSpec } from '../ui/Field'
import { BackLink, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { FormSkeleton, WriteError } from '../ui/states'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import {
  normaliseNid, useRegisterPicker, useRestoreRmthPerson, useRmthPersonLookup, useRmthPicker, useRmthRecord,
  useRmthRefs, useSaveRmth, type PersonLookup, type RmthOption, type RmthRecord, type SavePayload, type SaveResult,
} from '../data/rmth'
import { EMPTY_ANSWERS, answersFromRecord, categoriesOf, codesOf, isOn, listsOf, type AnswerContext, type Answers } from './answers'
import { fieldOf, formDef, isRmthFormId, useRmthLabels } from './labels'
import { offered, pickLabel } from './picks'
import NotFound from '../routes/NotFound'
import type { RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthFormDef } from './types'
import { SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  One screen renders all seven Ramtha forms (RMTH_Forms_and_Calculations_v2.xlsx).
 *
 *  The definition (forms.generated.ts) says what each field IS; the sheet's
 *  words (rmth.json) say what it is CALLED, in both languages; the database
 *  says whether it is RIGHT. This component only carries the answers from the
 *  controls to the save payload and back.
 *
 *  FORM-01's person block: the national ID is looked up as soon as it has
 *  nine digits. On file -> the name is shown and locked, sex shown where
 *  known. Already in the register -> the screen says so and links to the
 *  registration; a registration that was deleted is RESTORED from its page,
 *  never entered again (CLAUDE.md). A deleted person -> who deleted them, and
 *  a coordinator's restore.
 *
 *  A field whose answer is not chosen (`when`) is dimmed and sent BLANK,
 *  whatever it held, and a multi-select's question is always listed, so its
 *  old ticks are cleared too. Validation is computed on every render and
 *  `touched` only decides whether the messages are shown: the first click
 *  must stop on the same values the second one would (CLAUDE.md's register,
 *  the required-field guard in the first RmthFormScreen).
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Person = { nid: string; name: string; sex: string }
const EMPTY_PERSON: Person = { nid: '', name: '', sex: '' }

/** Today, as the date columns hold it (the browser's calendar; the database checks Asia/Amman's). */
function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function RmthFormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { form, id } = useParams()
  // an unknown form id, whatever guards the route (RequireRamtha, or none in demo mode)
  if (!isRmthFormId(form)) return <NotFound />
  // keyed, so moving from one form to another starts from empty answers
  return <FormFor key={`${form}:${id ?? 'new'}`} mode={mode} fid={form} id={id} />
}

function FormFor({ mode, fid, id }: { mode: 'new' | 'edit'; fid: RmthFormId; id: string | undefined }) {
  const def = formDef(fid)
  const L = useRmthLabels(fid)
  const { t } = useTranslation('rmth')
  const navigate = useNavigate()
  const toast = useToast()

  const rec = useRmthRecord(def.table, mode === 'edit' ? id : undefined)
  const save = useSaveRmth(def.table)
  const refs = useRmthRefs(useMemo(() => listsOf(def), [def]))
  const usesActivity = def.fields.some((f) => f.table === 'rmth_activity')
  const usesProject = def.fields.some((f) => f.table === 'rmth_project')
  const activities = useRmthPicker(usesActivity ? 'rmth_activity' : undefined)
  const projects = useRmthPicker(usesProject ? 'rmth_project' : undefined)
  const ctx: AnswerContext = { refs, activityCategory: categoriesOf(activities.data, refs) }

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
    if (p && def.table === 'rmth_beneficiary') setPerson({ nid: p.national_id ?? '', name: p.full_name, sex: p.sex ?? '' })
  }

  const hasPerson = def.fields.some((f) => f.kind === 'ident')
  const personLocked = mode === 'edit' && !!rec.data?.person
  const nidNorm = normaliseNid(person.nid)
  const nidComplete = /^\d{9}$/.test(nidNorm)
  const lookup = useRmthPersonLookup(hasPerson && !personLocked ? person.nid : '')
  const found: PersonLookup | null = lookup.data ?? null
  const foundDeleted = !!found && !!found.deleted_at
  const foundRegistered = !!found && !found.deleted_at && !!found.beneficiary_id
  const onFile = !!found && !found.deleted_at
  const filed = personLocked ? rec.data?.person ?? null : onFile ? { full_name: found!.full_name, sex: found!.sex } : null

  const on = (f: RmthFieldDef) => isOn(def, f, answers, ctx)
  const setValue = (k: string, v: string) => setAnswers((a) => ({ ...a, values: { ...a.values, [k]: v } }))
  const labelOf = (fieldId: string) => L.label({ id: fieldId })

  /* ── validation ───────────────────────────────────────────────────────── */
  const errors: Record<string, string> = {}
  const req = t('form.required')
  const now = today()
  const thisYear = Number(now.slice(0, 4))
  for (const f of def.fields) {
    if (!on(f)) continue
    const v = (answers.values[f.column ?? ''] ?? '').trim()
    switch (f.kind) {
      case 'text': case 'date': case 'record': case 'person': case 'bool':
        if (f.required && !v) { errors[f.id] = req; break }
        if (f.kind === 'date' && v) {
          if (f.notFuture && v > now) errors[f.id] = t('form.future')
          const other = f.notBefore ? fieldOf(def, f.notBefore) : f.notAfter ? fieldOf(def, f.notAfter) : undefined
          const ov = other ? (answers.values[other.column ?? ''] ?? '').trim() : ''
          if (other && ov && f.notBefore && v < ov) errors[f.id] = t('form.notBefore', { label: labelOf(other.id) })
          if (other && ov && f.notAfter && v > ov) errors[f.id] = t('form.notAfter', { label: labelOf(other.id) })
        }
        break
      case 'int': case 'number': {
        if (f.required && !v) { errors[f.id] = req; break }
        if (!v) break
        const n = Number(v)
        if (!Number.isFinite(n)) { errors[f.id] = req; break }
        if (f.kind === 'int' && !Number.isInteger(n)) errors[f.id] = t('form.wholeNumber')
        else if (f.maxCurrentYear && (!/^\d{4}$/.test(v) || n > thisYear)) errors[f.id] = t('form.year', { year: thisYear })
        else if (f.max != null && (n < (f.min ?? 0) || n > f.max)) errors[f.id] = t('form.range', { min: f.min ?? 0, max: f.max })
        else if (f.positive && n <= 0) errors[f.id] = t('form.positive')
        break
      }
      case 'select': {
        if (f.required && !v) { errors[f.id] = req; break }
        const chosen = (refs[f.list ?? ''] ?? []).find((r) => r.id === v)
        if (f.other && chosen?.allows_free_text && !(answers.values[f.other] ?? '').trim()) errors[f.id] = t('form.specify')
        break
      }
      case 'multi': {
        const m = answers.multi[f.question ?? ''] ?? { ids: [], other: '' }
        if (f.required && m.ids.length === 0) { errors[f.id] = req; break }
        const free = (refs[f.list ?? ''] ?? []).some((r) => r.allows_free_text && m.ids.includes(r.id))
        if (free && !m.other.trim()) errors[f.id] = t('form.specify')
        if (f.exclusive && m.ids.length > 1 && codesOf(refs, f.list, m.ids).includes(f.exclusive)) errors[f.id] = t('form.noneExclusive')
        break
      }
      case 'ident':
        if (personLocked) break
        if (!nidComplete) errors[f.id] = t('form.nidInvalid')
        break
      case 'person_name':
        if (f.required && !personLocked && !onFile && !person.name.trim()) errors[f.id] = req
        break
      case 'person_sex':
        if (f.required && !filed?.sex && !person.sex) errors[f.id] = req
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
      if (kind === 'int' || kind === 'number') row[col] = v === '' ? null : Number(v)
      else if (kind === 'bool') row[col] = v === '' ? null : v === 'true'
      else row[col] = v === '' ? null : v
    }
    for (const f of def.fields) {
      if (!f.column || f.kind === 'calc' || f.kind === 'stamp' || f.kind === 'reference') continue
      const fieldOn = on(f)
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
      const options: RmthOption[] = []
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

    if (hasPerson && !personLocked) {
      payload.person = {
        national_id: nidNorm,
        ...(person.name.trim() && !onFile ? { full_name: person.name.trim() } : {}),
        ...(person.sex && !filed?.sex ? { sex: person.sex } : {}),
      }
    } else if (hasPerson && personLocked && rec.data?.person && !rec.data.person.sex && person.sex) {
      // what an edit may add to a locked person: the sex that was empty
      payload.person = { national_id: rec.data.person.national_id ?? '', sex: person.sex }
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
        tag: t('form.saved'),
        title: res.reference ? t('form.savedRef', { reference: res.reference }) : L.short,
        sub: L.sheet,
      })
      navigate(`/rmth/${fid}/${res.id}`)
    }
  }

  const backTo = mode === 'edit' && id ? `/rmth/${fid}/${id}` : `/rmth/${fid}`

  if (mode === 'edit' && rec.isLoading) {
    return (
      <>
        <PageHead eyebrow={L.sheet} title={t('form.editTitle', { title: L.short })} size="md" />
        <FormSkeleton />
      </>
    )
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(backTo)}>{t('form.back')}</BackLink>}
        eyebrow={L.sheet}
        title={mode === 'new' ? t('form.newTitle', { title: L.title }) : t('form.editTitle', { title: L.title })}
        description={def.indicators.join(` ${SEP} `)}
        size="md"
      />

      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} fid={fid} /> : null}
      {hasPerson && !personLocked && foundDeleted && found ? <DeletedPersonBand found={found} /> : null}
      {hasPerson && !personLocked && foundRegistered && found ? <RegisteredBand found={found} fid={fid} /> : null}

      <section className="mt-[34px]">
        <SectionRule title={L.title} />
        <div className="mt-5 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
          {def.fields.map((f) => (
            <FieldView
              key={f.id}
              f={f}
              def={def}
              fid={fid}
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
              nidComplete={nidComplete}
              onFile={onFile}
              activities={activities}
              projects={projects}
              thisYear={thisYear}
            />
          ))}
        </div>
      </section>

      <div className="mt-[34px] flex flex-col gap-4 border-t-[3px] border-ink pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">{L.sheet}</span>
        <div className="flex gap-2.5">
          <SecondaryButton onClick={() => navigate(backTo)}>{t('form.cancel')}</SecondaryButton>
          <PrimaryButton onClick={() => void submit()} disabled={save.isPending || (hasPerson && !personLocked && (foundDeleted || foundRegistered))}>
            {save.isPending ? t('form.saving') : t('form.save')}
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}

/* ── refusals ─────────────────────────────────────────────────────────────── */

const RULES = ['required', 'not_applicable', 'not_registered', 'deleted', 'future', 'in_use', 'none_exclusive',
  'not_surveyed', 'specify', 'locked', 'person_deleted'] as const

/**
 * What the database said, in the reader's language. A rule between fields
 * names the field it refused -- rmth_ac03_required, rmth_pa02_not_registered
 * (0177, 0178) -- and is worded from that field's label; a table constraint
 * is worded by its name; anything else shows the database's message rather
 * than nothing.
 */
export function RefusalBand({ outcome, fid }: { outcome: Exclude<SaveResult, { ok: true }>; fid: RmthFormId }) {
  const { t, i18n } = useTranslation('rmth')
  const L = useRmthLabels(fid)
  const r = outcome.result
  const c = outcome.constraint ?? ''
  const rule = /^rmth_([a-z]{2})(\d{2})_([a-z_]+)$/.exec(c)
  const named = rule && (RULES as readonly string[]).includes(rule[3]!) ? rule : null
  const text =
    named ? t(`form.rule.${named[3]}`, { label: `${named[1]!.toUpperCase()}-${named[2]} ${L.label({ id: `${named[1]!.toUpperCase()}-${named[2]}` })}` })
    : c && i18n.exists(`rmth:form.constraint.${c}`) ? t(`form.constraint.${c}`)
    : r === 'not_found' ? t('form.notFound')
    : r === 'person_deleted' ? t('form.personDeleted')
    : r === 'already_registered' ? t('form.alreadyRegistered')
    : r === 'registration_deleted' ? t('form.registrationDeleted')
    : r === 'unknown_column' ? t('form.unknownColumn', { column: outcome.column ?? '?' })
    : r === 'unknown_block' ? t('form.unknownBlock', { block: outcome.block ?? '?' })
    : t('form.invalid', { message: outcome.message ?? (c || r) })
  const link = (r === 'already_registered' || r === 'registration_deleted') && outcome.id ? `/rmth/${fid}/${outcome.id}` : null
  return (
    <div role="alert" className="mt-[18px] bg-error px-[18px] py-[14px] text-bg">
      <div className="flex flex-wrap items-baseline gap-[14px]">
        <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('form.notSaved')}</span>
        <span className="text-[15px] font-medium">{text}</span>
        {link ? (
          <Link to={link} className="font-semibold text-bg underline">
            {r === 'already_registered' ? t('form.openRegistration') : t('form.openDeleted')}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

/** The national ID typed is already in the register: open it, never enter it twice. */
function RegisteredBand({ found, fid }: { found: PersonLookup; fid: RmthFormId }) {
  const { t } = useTranslation('rmth')
  const deleted = !!found.beneficiary_deleted_at
  return (
    <div role="status" className="mt-[18px] border-[1.5px] border-amber bg-attention-bg p-4 text-attention-ink">
      <p className="m-0 text-[15px] font-semibold text-ink">{found.full_name}</p>
      <p className="mb-0 mt-1 text-[13.5px]">{deleted ? t('form.registrationDeleted') : t('form.alreadyRegistered')}</p>
      <Link to={`/rmth/${fid}/${found.beneficiary_id}`} className="mt-2 inline-block text-[14px] font-semibold text-ink underline">
        {deleted ? t('form.openDeleted') : t('form.openRegistration')}
      </Link>
    </div>
  )
}

/** The national ID typed belongs to a deleted person: who, when, by whom, and the way forward. */
function DeletedPersonBand({ found }: { found: PersonLookup }) {
  const { t, i18n } = useTranslation('rmth')
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const restore = useRestoreRmthPerson()
  const when = found.deleted_at ? formatShortDate(found.deleted_at, locale) : ''
  return (
    <div role="alert" className="mt-[18px] border-[1.5px] border-amber bg-attention-bg p-4 text-attention-ink">
      <p className="m-0 text-[15px] font-semibold text-ink">{found.full_name}</p>
      <p className="mb-0 mt-1 text-[13.5px]">{t('form.personDeleted')}</p>
      <p className="mb-0 mt-1 text-[13.5px]">{found.deleted_by ? t('form.deletedBy', { when, by: found.deleted_by }) : t('form.deletedWhen', { when })}</p>
      {restore.error ? <WriteError error={restore.error} onDismiss={restore.reset} /> : null}
      {restore.isSuccess ? <p className="mb-0 mt-2 text-[13.5px]">{t('form.restored')}</p> : null}
      {can(role, 'record.delete') ? (
        restore.isSuccess ? null : <div className="mt-2"><SecondaryButton disabled={restore.isPending} onClick={() => void restore.mutateAsync(found.id)}>{t('form.restore')}</SecondaryButton></div>
      ) : <p className="mb-0 mt-2 text-[13.5px]">{t('form.coordinatorOnly')}</p>}
    </div>
  )
}

/* ── one field ─────────────────────────────────────────────────────────── */

type Picks = { data?: { id: string; reference: string | null; raw: Record<string, unknown> }[] | undefined; isError: boolean }

type FieldViewProps = {
  f: RmthFieldDef
  def: RmthFormDef
  fid: RmthFormId
  record?: RmthRecord | undefined
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
  filed: { full_name: string; sex: string | null } | null
  lookingUp: boolean
  nidComplete: boolean
  onFile: boolean
  activities: Picks
  projects: Picks
  thisYear: number
}

type Base = Pick<FieldSpec, 'key' | 'label' | 'help' | 'required' | 'error' | 'dim' | 'disabled'>

function FieldView(p: FieldViewProps) {
  const { f, fid } = p
  const L = useRmthLabels(fid)
  const { t } = useTranslation('rmth')
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
    /* FORM-01's person block */
    case 'ident': {
      const match = !p.personLocked && p.nidComplete
        ? { match: { text: p.lookingUp ? t('form.lookingUp') : p.onFile ? t('form.onFile') : t('form.newPerson'), ok: true } }
        : {}
      return (
        <Field
          spec={{ ...base, type: 'text', ltr: true, span: 6, placeholder: '000000000',
            ...(p.personLocked ? { disabled: true, note: t('form.personLocked') } : {}), ...match }}
          value={p.person.nid}
          onChange={(x) => p.setPerson((s) => ({ ...s, nid: x }))}
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
    case 'person_sex': {
      // person.sex is sex_t ('male' / 'female'), the list's codes
      const rows = p.refs[f.list ?? 'sex'] ?? []
      const options = rows.map((r) => ({ value: r.code, label: refLabel(r, L.locale) }))
      if (p.filed?.sex) return <Field spec={{ ...base, type: 'readonly', span: 6, text: options.find((o) => o.value === p.filed!.sex)?.label ?? p.filed.sex }} value="" onChange={() => {}} />
      return <Field spec={{ ...base, type: 'radio', span: 6, options }} value={p.person.sex} onChange={(x) => p.setPerson((s) => ({ ...s, sex: x }))} />
    }
    case 'calc': {
      // PR-04: the band the database will work out, shown from the year of birth typed
      const saved = (p.refs[f.list ?? ''] ?? []).find((r) => r.id === v)
      const yob = Number(p.answers.values['year_of_birth'] ?? '')
      const age = Number.isInteger(yob) && yob > 999 && yob <= p.thisYear ? p.thisYear - yob : null
      const band = age == null ? undefined
        : age < 18 ? 'under_18' : age <= 24 ? 'age_18_24' : age <= 35 ? 'age_25_35' : age <= 45 ? 'age_36_45' : 'over_45'
      const shown = saved ?? (p.refs[f.list ?? ''] ?? []).find((r) => r.code === band)
      return <Field spec={{ ...base, type: 'readonly', span: 6, ...(shown ? { text: refLabel(shown, L.locale) } : {}), note: t('form.calcOnSave') }} value="" onChange={() => {}} />
    }

    /* one column */
    case 'text':
      return <Field spec={{ ...base, type: 'text', span: 6 }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'int': case 'number':
      return <Field spec={{ ...base, type: 'number', span: 4 }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'date':
      return <Field spec={{ ...base, type: 'date', span: 4 }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'bool': {
      const options = (['true', 'false'] as const).map((val) => ({ value: val, label: L.opt(f, val) }))
      return <Field spec={{ ...base, type: 'radio', span: 6, options }} value={v} onChange={(x) => p.setValue(col, x)} />
    }
    case 'select': {
      const rows = p.refs[f.list ?? ''] ?? []
      const chosen = rows.find((r) => r.id === v)
      return (
        <>
          <Field spec={{ ...base, type: 'select', span: 6, options: opts(rows), placeholder: t('form.picker.none') }} value={v} onChange={(x) => p.setValue(col, x)} />
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
    case 'person':
      return <PersonPicker base={base} f={f} p={p} />

    /* what the database sets */
    case 'reference': {
      const ref = p.record && typeof p.record.row['reference'] === 'string' ? (p.record.row['reference'] as string) : ''
      return <Field spec={{ ...base, type: 'readonly', span: 6, ltr: true, ...(ref ? { text: ref } : { note: t('form.assignedOnSave') }) }} value="" onChange={() => {}} />
    }
    case 'stamp': {
      const s = p.record && typeof p.record.row[col] === 'string' ? (p.record.row[col] as string) : ''
      return <Field spec={{ ...base, type: 'readonly', span: 6, ...(s ? { text: formatShortDate(s, L.locale) } : { note: t('form.stampedOnSave') }) }} value="" onChange={() => {}} />
    }
    default:
      return null
  }
}

/** AC-07, PA-01, FB-01, IS-01: a project or an activity, narrowed as the field says; the saved choice always stays. */
function RecordPicker({ base, f, p }: { base: Base; f: RmthFieldDef; p: FieldViewProps }) {
  const { t } = useTranslation('rmth')
  const L = useRmthLabels(p.fid)
  const col = f.column ?? ''
  const current = p.answers.values[col] ?? ''
  const picks = f.table === 'rmth_activity' ? p.activities : p.projects
  const rows = offered(picks.data, f.categories, p.refs, current)
  const options: FieldOption[] = rows.map((r) => ({ value: r.id, label: pickLabel(f.table, r, p.refs, L.locale) }))
  // the forms whose questions hang on the activity's category say so under the picker
  const governs = p.def.fields.some((x) => x.when?.some((c) => c.field === f.id && c.via === 'category'))
  const note = f.categories ? t('form.picker.surveyed') : governs ? t('form.activityFirst') : undefined
  return (
    <Field
      spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.picker.none'),
        ...(note && !base.help ? { help: note } : {}),
        ...(picks.isError ? { error: t('form.picker.loadFailed') } : picks.data && !picks.data.length ? { help: t('form.picker.empty') } : {}) }}
      value={current}
      onChange={(x) => p.setValue(col, x)}
    />
  )
}

/** PA-02, FB-02, FU-01: "prepopulated <PR-01>", a person in the register, named and identified. */
function PersonPicker({ base, f, p }: { base: Base; f: RmthFieldDef; p: FieldViewProps }) {
  const { t } = useTranslation('rmth')
  const people = useRegisterPicker()
  const col = f.column ?? ''
  const current = p.answers.values[col] ?? ''
  const options: FieldOption[] = (people.data ?? []).map((r) => ({ value: r.id, label: r.nid ? `${r.name} ${SEP} ${r.nid}` : r.name }))
  if (current && !options.some((o) => o.value === current) && p.record?.person) {
    // a person since deregistered keeps their name on a record made before
    options.unshift({ value: current, label: p.record.person.full_name })
  }
  return (
    <Field
      spec={{ ...base, type: 'select', span: 6, options, placeholder: t('form.picker.none'),
        ...(!base.help ? { help: t('form.picker.register') } : {}),
        ...(people.isError ? { error: t('form.picker.loadFailed') } : people.data && !people.data.length ? { help: t('form.picker.empty') } : {}) }}
      value={current}
      onChange={(x) => p.setValue(col, x)}
    />
  )
}

export default RmthFormScreen
