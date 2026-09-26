import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Field, type FieldOption } from '../../ui/Field'
import { PrimaryButton, SecondaryButton } from '../../ui/primitives'
import { refLabel, type RefRow } from '../../data/refTables'
import { usePublicVolunteerOptions, useRegisterVolunteer, type RegisterResult } from '../../data/publicVolunteer'
import { KHLD_FORMS } from '../../khld/forms.generated'
import { isOn, type Answers } from '../../khld/answers'
import { useKhldLabels } from '../../khld/labels'
import type { KhldFieldDef, KhldFormDef } from '../../khld/types'
import { PublicShell } from './PublicShell'
import { PublicNotFound, hasVolunteerJourney, usePublicSite } from './PublicSite'
import { ARROW_START } from '../../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  FORM-12, filled in by the volunteer.
 *
 *  The municipality's owner decided on 26 September 2026 that volunteers
 *  register themselves (0159). The page asks exactly the sheet's questions,
 *  in the sheet's words -- it renders the same generated definition the staff
 *  screen does, so the two cannot ask different things -- and sends them to
 *  khld_register_volunteer (0161), which decides. A registration arrives
 *  waiting for review and counts nowhere until staff approve it.
 *
 *  Every refusal is the function's, in its own words. `cannot_verify` is the
 *  answer to every identity failure AND to the rate limiter, so the page says
 *  what may have happened and does not claim to know which.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const def = KHLD_FORMS.form12 as unknown as KhldFormDef
type Person = { idNumber: string; name: string; sex: string; dob: string; phone: string }

export function VolunteerRegister() {
  const site = usePublicSite()
  if (!hasVolunteerJourney(site.municipality.code)) return <PublicNotFound />
  return <Register />
}

function Register() {
  const site = usePublicSite()
  const L = useKhldLabels('form12')
  const { t } = useTranslation(['khld', 'public'])
  const options = usePublicVolunteerOptions()
  const refs = useMemo(() => options.data ?? {}, [options.data])
  const register = useRegisterVolunteer()
  const [clientUuid, setClientUuid] = useState(() => crypto.randomUUID())
  const [answers, setAnswers] = useState<Answers>({ values: {}, extras: {}, multi: {}, partners: [], occasion: '' })
  const [person, setPerson] = useState<Person>({ idNumber: '', name: '', sex: '', dob: '', phone: '' })
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState<{ result: RegisterResult; reference?: string } | null>(null)

  const idTypeField = def.fields.find((f) => f.kind === 'id_type')!
  const idType = (refs['id_type'] ?? []).find((r) => r.id === answers.values[idTypeField.column!])?.code ?? ''
  const idNorm = idType === 'national_id' ? person.idNumber.replace(/\D/g, '') : person.idNumber.trim().replace(/\s+/g, ' ').toUpperCase()
  const on = (f: KhldFieldDef) => isOn(def, f, answers, refs)
  const setValue = (k: string, v: string) => setAnswers((a) => ({ ...a, values: { ...a.values, [k]: v } }))

  // ── what the page can check before sending; the function checks it all again ──
  const errors: Record<string, string> = {}
  const req = t('khld:form.required')
  for (const f of def.fields) {
    if (!on(f)) continue
    const v = (answers.values[f.column ?? ''] ?? '').trim()
    if (f.kind === 'ident') {
      if (!idType) errors[f.id] = t('khld:form.idTypeFirst')
      else if (idType === 'national_id' ? !/^\d{9}$/.test(idNorm) : !idNorm) errors[f.id] = idType === 'national_id' ? t('khld:form.nidInvalid') : t('khld:form.idEmpty')
    } else if (f.kind === 'person_name') {
      if (!person.name.trim()) errors[f.id] = req
    } else if (f.kind === 'person_sex') {
      if (!person.sex) errors[f.id] = req
    } else if (f.kind === 'dob') {
      if (!person.dob) errors[f.id] = req
    } else if (f.kind === 'person_phone') {
      if (person.phone.replace(/\D/g, '').length < 9) errors[f.id] = req
    } else if (f.kind === 'multi') {
      const m = answers.multi[f.question ?? ''] ?? { ids: [], other: '' }
      if (f.required && m.ids.length === 0) errors[f.id] = req
      else if ((refs[f.list ?? ''] ?? []).some((r) => r.allows_free_text && m.ids.includes(r.id)) && !m.other.trim()) errors[f.id] = t('khld:form.specify')
    } else if (f.kind === 'select' || f.kind === 'id_type') {
      if (f.required && !v) errors[f.id] = req
      else if (f.other && (refs[f.list ?? ''] ?? []).find((r) => r.id === v)?.allows_free_text && !(answers.values[f.other] ?? '').trim()) errors[f.id] = t('khld:form.specify')
    } else if (f.kind === 'bool') {
      if (f.required && !v) errors[f.id] = req
      else if (f.mustBeTrue && v === 'false') errors[f.id] = t('khld:volunteer.not_eligible')
    } else if (f.required && !v) {
      errors[f.id] = req
    }
  }
  const invalid = Object.keys(errors).length > 0
  const shown = touched ? errors : {}

  async function submit() {
    setTouched(true)
    if (invalid) return
    const row: Record<string, unknown> = {}
    for (const f of def.fields) {
      if (!f.column) continue
      const v = on(f) ? (answers.values[f.column] ?? '').trim() : ''
      row[f.column] = f.kind === 'bool' ? (v === '' ? null : v === 'true') : v || null
      if (f.other) {
        const free = (refs[f.list ?? ''] ?? []).find((r) => r.id === answers.values[f.column!])?.allows_free_text
        row[f.other] = on(f) && free ? (answers.values[f.other] ?? '').trim() || null : null
      }
    }
    const opts: { question_code: string; option_id: string; option_other: string | null }[] = []
    for (const f of def.fields) {
      if (f.kind !== 'multi' || !f.question) continue
      const m = answers.multi[f.question] ?? { ids: [], other: '' }
      for (const oid of m.ids) {
        const free = (refs[f.list ?? ''] ?? []).find((r) => r.id === oid)?.allows_free_text
        opts.push({ question_code: f.question, option_id: oid, option_other: free ? m.other.trim() || null : null })
      }
    }
    const res = await register.mutateAsync({
      municipality_slug: site.slug,
      id_number: idNorm,
      full_name: person.name.trim(),
      sex: person.sex,
      date_of_birth: person.dob,
      phone: person.phone.trim(),
      row,
      options: opts,
      client_uuid: clientUuid,
    })
    setDone(res)
  }

  function again() {
    setAnswers({ values: {}, extras: {}, multi: {}, partners: [], occasion: '' })
    setPerson({ idNumber: '', name: '', sex: '', dob: '', phone: '' })
    setTouched(false)
    setDone(null)
    setClientUuid(crypto.randomUUID())
    register.reset()
  }

  const accepted = done && (done.result === 'registered' || done.result === 'already_registered')

  return (
    <PublicShell>
      <p className="pt-6 text-[14px]">
        <Link to={site.path()} className="text-muted underline hover:text-ink">{ARROW_START} {t('public:whatsOn.heading')}</Link>
      </p>
      <section className="pt-3 sm:pt-5">
        <h1 className="text-[26px] font-black uppercase leading-[1.05] tracking-[-0.03em] sm:text-[38px]" style={{ textWrap: 'balance' }}>
          {t('khld:volunteer.title')}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.55] text-body sm:text-[16px]">{t('khld:volunteer.intro')}</p>
      </section>

      {accepted ? (
        <div role="status" className="mt-8 border-[1.5px] border-success bg-sunken p-5 sm:p-6">
          <p className="m-0 text-[17px] font-bold text-ink">
            {done.result === 'registered' ? t('khld:volunteer.registered', { reference: done.reference ?? '' }) : t('khld:volunteer.already_registered')}
          </p>
          <div className="mt-4"><SecondaryButton onClick={again}>{t('khld:volunteer.again')}</SecondaryButton></div>
        </div>
      ) : (
        <>
          {done ? (
            <div role="alert" className="mt-6 bg-error px-[18px] py-[14px] text-[15px] font-medium text-bg">{t(`khld:volunteer.${done.result}`)}</div>
          ) : null}
          {register.isError ? (
            <div role="alert" className="mt-6 bg-error px-[18px] py-[14px] text-[15px] font-medium text-bg">{t('khld:volunteer.failed')}</div>
          ) : null}
          {options.isError ? (
            <div role="alert" className="mt-6 border-[1.5px] border-dashed border-error bg-sunken p-5 text-center">
              <p className="m-0 text-[15px] text-body">{t('public:home.loadFailed')}</p>
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
            {def.fields.map((f) => (
              <PublicField
                key={f.id}
                f={f}
                refs={refs}
                locale={L.locale}
                label={L.label(f)}
                help={L.help(f)}
                opt={(v) => L.opt(f, v)}
                off={!on(f)}
                error={shown[f.id]}
                answers={answers}
                setAnswers={setAnswers}
                setValue={setValue}
                person={person}
                setPerson={setPerson}
                idType={idType}
              />
            ))}
          </div>

          <p className="mt-6 text-[13px] text-muted">{t('khld:volunteer.privacy')}</p>
          <div className="mt-4 flex border-t-[3px] border-ink pt-4">
            <PrimaryButton onClick={() => void submit()} disabled={register.isPending || !options.isSuccess}>
              {register.isPending ? t('khld:volunteer.submitting') : t('khld:volunteer.submit')}
            </PrimaryButton>
          </div>
        </>
      )}
    </PublicShell>
  )
}

function PublicField(p: {
  f: KhldFieldDef
  refs: Record<string, RefRow[]>
  locale: string
  label: string
  help: string | undefined
  opt: (v: string) => string
  off: boolean
  error: string | undefined
  answers: Answers
  setAnswers: (u: (a: Answers) => Answers) => void
  setValue: (k: string, v: string) => void
  person: Person
  setPerson: (u: (s: Person) => Person) => void
  idType: string
}) {
  const { t } = useTranslation('khld')
  const { f } = p
  const base = {
    key: f.id,
    label: p.label,
    ...(p.help ? { help: p.help } : {}),
    ...(f.required ? { required: true } : {}),
    ...(p.error ? { error: p.error } : {}),
    ...(p.off ? { dim: true, disabled: true } : {}),
  }
  const rows = p.refs[f.list ?? ''] ?? []
  const opts: FieldOption[] = rows.map((r) => ({ value: r.id, label: refLabel(r, p.locale) }))
  const col = f.column ?? ''
  const v = p.answers.values[col] ?? ''
  switch (f.kind) {
    case 'id_type':
      return <Field spec={{ ...base, type: 'radio', span: 12, options: opts }} value={v} onChange={(x) => { p.setValue(col, x); p.setPerson((s) => ({ ...s, idNumber: '' })) }} />
    case 'ident':
      return <Field spec={{ ...base, type: 'text', ltr: true, span: 6, ...(p.idType === 'national_id' ? { placeholder: '000000000' } : {}) }} value={p.person.idNumber} onChange={(x) => p.setPerson((s) => ({ ...s, idNumber: x }))} />
    case 'person_name':
      return <Field spec={{ ...base, type: 'text', span: 6 }} value={p.person.name} onChange={(x) => p.setPerson((s) => ({ ...s, name: x }))} />
    case 'person_sex':
      return <Field spec={{ ...base, type: 'radio', span: 6, options: rows.map((r) => ({ value: r.code, label: refLabel(r, p.locale) })) }} value={p.person.sex} onChange={(x) => p.setPerson((s) => ({ ...s, sex: x }))} />
    case 'dob':
      return <Field spec={{ ...base, type: 'date', span: 4 }} value={p.person.dob} onChange={(x) => p.setPerson((s) => ({ ...s, dob: x }))} />
    case 'person_phone':
      return <Field spec={{ ...base, type: 'tel', ltr: true, span: 6, placeholder: '07XXXXXXXX' }} value={p.person.phone} onChange={(x) => p.setPerson((s) => ({ ...s, phone: x }))} />
    case 'bool':
      return <Field spec={{ ...base, type: 'radio', span: 6, options: [{ value: 'true', label: p.opt('true') }, { value: 'false', label: p.opt('false') }] }} value={v} onChange={(x) => p.setValue(col, x)} />
    case 'select': {
      const chosen = rows.find((r) => r.id === v)
      return (
        <>
          <Field spec={{ ...base, type: 'select', span: 6, options: opts }} value={v} onChange={(x) => p.setValue(col, x)} />
          {f.other && chosen?.allows_free_text && !p.off ? (
            <Field spec={{ key: f.other, label: t('form.specify'), type: 'text', span: 6, required: true }} value={p.answers.values[f.other] ?? ''} onChange={(x) => p.setValue(f.other!, x)} />
          ) : null}
        </>
      )
    }
    case 'multi': {
      const q = f.question ?? ''
      const m = p.answers.multi[q] ?? { ids: [], other: '' }
      const otherOn = rows.some((r) => r.allows_free_text && m.ids.includes(r.id))
      return (
        <>
          <Field
            spec={{ ...base, type: 'checks', twoCol: rows.length > 4, options: opts }}
            value={m.ids}
            onChange={() => {}}
            onToggle={(oid) => p.setAnswers((a) => {
              const cur = a.multi[q] ?? { ids: [], other: '' }
              const ids = cur.ids.includes(oid) ? cur.ids.filter((x) => x !== oid) : [...cur.ids, oid]
              return { ...a, multi: { ...a.multi, [q]: { ...cur, ids } } }
            })}
          />
          {otherOn ? (
            <Field
              spec={{ key: `${q}_other`, label: t('form.specify'), type: 'text', span: 6, required: true }}
              value={m.other}
              onChange={(x) => p.setAnswers((a) => ({ ...a, multi: { ...a.multi, [q]: { ids: a.multi[q]?.ids ?? [], other: x } } }))}
            />
          ) : null}
        </>
      )
    }
    case 'text':
      return <Field spec={{ ...base, type: 'text', span: 6 }} value={v} onChange={(x) => p.setValue(col, x)} />
    default:
      return null
  }
}

export default VolunteerRegister
