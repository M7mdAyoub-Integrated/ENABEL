import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, MODULES, ACCENT_BG, ACCENT_BORDER } from '../modules'
import { useModuleWrite } from '../data/moduleWrites'
import { FormSkeleton, WriteError } from '../ui/states'
import {
  useFormSchema,
  useWizardSteps,
  nationalIdError,
  WIZARD_STEP_COUNT,
  type FormSection,
  type FormValues,
} from '../forms/useFormSchema'
import { Field } from '../ui/Field'
import {
  AccentRule,
  BackLink,
  PageHead,
  Pill,
  PrimaryButton,
  SecondaryButton,
  SectionRule,
  SegmentBar,
} from '../ui/primitives'
import { useToast } from '../ui/Toast'
import { NotFound } from './NotFound'
import { SEP } from '../ui/glyphs'

/**
 * One form section, copied from the prototype.
 *
 * A 3px rule under the section title, an optional pill on the accent, an
 * optional note indented behind a 4px accent bar, then a 12-column field grid
 * with 22px/18px gutters.
 */
function SectionView({
  section,
  values,
  setValue,
  toggleValue,
}: {
  section: FormSection
  values: FormValues
  setValue: (k: string, v: string) => void
  toggleValue: (k: string, v: string) => void
}) {
  const { t } = useTranslation('forms')
  return (
    <section className="mt-[34px]">
      <SectionRule
        title={section.title}
        right={
          section.pill ? (
            <Pill className={ACCENT_BG[section.pillAccent ?? 'ink']}>{section.pill}</Pill>
          ) : undefined
        }
      />

      {section.note ? (
        <p
          className={`mt-3 max-w-[720px] border-s-4 ps-[14px] text-[15px] text-body ${ACCENT_BORDER[section.pillAccent ?? 'ink']}`}
          style={{ textWrap: 'pretty' }}
        >
          {section.note}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-12 gap-x-[18px] gap-y-[22px]">
        {section.fields.map((f) => (
          <Field
            key={f.key}
            spec={f}
            value={values[f.key]}
            onChange={(v) => setValue(f.key, v)}
            onToggle={(v) => toggleValue(f.key, v)}
          />
        ))}
      </div>

      {/* Booth availability: one block per booth, on the amber panel. */}
      {section.booths ? (
        <div className="mt-5 bg-amber px-5 py-[18px] text-bg">
          <div className="flex items-baseline justify-between gap-[14px]">
            <span className="text-[19px] font-extrabold tracking-[-0.025em]">
              {section.booths.name}
            </span>
            <span className="font-narrow text-[12.5px] font-bold uppercase tracking-[0.1em] tabular-nums">
              {t('registration.boothsTaken', {
                taken: section.booths.taken,
                capacity: section.booths.capacity,
              })}
            </span>
          </div>
          <div className="mt-[14px]">
            <SegmentBar
              segments={section.booths.capacity}
              filled={section.booths.taken}
              label={t('registration.boothProgress')}
            />
          </div>
          <div className="mt-2.5 font-narrow text-[12px] font-semibold uppercase tracking-[0.08em] opacity-85">
            {section.booths.dates} {SEP} {section.booths.location}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function FormScreen({ mode }: { mode: 'new' | 'edit' }) {
  const { module, id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['forms', 'common', 'survey', 'nav'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const toast = useToast()

  const write = useModuleWrite(
    isModuleId(module) ? module : 'tp',
    mode === 'edit' ? id : undefined,
    locale,
  )
  const [values, setValues] = useState<FormValues>(
    () =>
      write.initialValues ??
      (module === 'fu' ? { round: 'six_month', mode: 'telephone', respondent: 'participant' } : {}),
  )
  const [loadedId, setLoadedId] = useState<string | null>(null)

  // An edit form opens before the record has arrived. When it does, load it
  // once -- keyed on the id so a later refetch cannot wipe out edits the user
  // has already typed into the form.
  if (mode === 'edit' && id && write.initialValues && loadedId !== id) {
    setLoadedId(id)
    setValues(write.initialValues)
  }
  const [touched, setTouched] = useState(false)
  const [step, setStep] = useState(0)
  const [formError, setFormError] = useState('')

  const valid = isModuleId(module)
  const activeModule = valid ? module : 'tp'
  const sections = useFormSchema(activeModule, values, touched)
  const wizardSections = useWizardSteps(values, step)

  if (!valid) return <NotFound />
  const meta = MODULES[module]
  const isWizard = module === 'fu'
  const shown = isWizard ? wizardSections : sections
  const indicators = meta.indicators.join(` ${SEP} `)
  const lastStep = step === WIZARD_STEP_COUNT - 1

  const setValue = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }))
  const toggleValue = (k: string, v: string) =>
    setValues((cur) => {
      const arr = Array.isArray(cur[k]) ? (cur[k] as string[]) : []
      return { ...cur, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] }
    })

  const backToList = () => navigate(`/forms/${module}`)

  const submit = () => {
    setTouched(true)
    setFormError('')
    write.reset()

    if (isWizard) {
      if (!lastStep) {
        setStep(step + 1)
        return
      }
      toast.fire({
        tag: t('common:toast.saved'),
        title: t('survey:submitted'),
        sub: t('survey:submittedSub', { count: 43 }),
      })
      backToList()
      return
    }

    if (module === 'tc' || module === 'rg') {
      const a = typeof values['nid'] === 'string' ? values['nid'] : ''
      const b = typeof values['nid2'] === 'string' ? values['nid2'] : ''
      const err = nationalIdError(a, true, makeTranslate(t))
      if (err) {
        setFormError(err)
        return
      }
      if (a !== b) {
        setFormError(t('forms:validation.nidMismatch'))
        return
      }
    }

    const announce = () => {
      toast.fire({
        tag: t('common:toast.saved'),
        title: mode === 'edit' ? t('forms:toast.updated') : t('forms:toast.saved'),
        sub: t('forms:toast.feeds', { name: t(`nav:module.${module}`), list: indicators }),
      })
      backToList()
    }

    if (write.save) {
      // Live module. Only leave the screen once the database has accepted it --
      // navigating away on optimism would tell the coordinator a partnership
      // was registered when RLS had refused it.
      void write.save(values).then(announce, () => undefined)
      return
    }
    announce()
  }

  const cancel = () => {
    if (isWizard && step > 0) {
      setStep(step - 1)
      return
    }
    backToList()
  }

  return (
    <>
      <PageHead
        back={<BackLink onClick={backToList}>{t(`nav:module.${module}`)}</BackLink>}
        chips={
          <>
            <Pill className={ACCENT_BG[meta.accent]}>{t(`nav:objective.${module}`)}</Pill>
            <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              {t('forms:feeds', { list: indicators })}
            </span>
          </>
        }
        title={
          isWizard
            ? t('survey:title')
            : mode === 'edit'
              ? t('forms:editRecord')
              : t(`forms:cta.${module}`)
        }
        description={
          isWizard
            ? t('survey:desc')
            : mode === 'edit'
              ? t('forms:editingNote')
              : t(`forms:description.${module}`)
        }
        size="md"
        action={
          <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
            {t('forms:requiredNote')}
          </span>
        }
      />
      <AccentRule className={ACCENT_BG[meta.accent]} />

      {/* Wizard stepper: six equal cells in one frame, current one filled. */}
      {isWizard ? (
        <>
          <ol className="mt-[18px] grid grid-cols-2 border-[1.5px] border-ink sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: WIZARD_STEP_COUNT }, (_, i) => {
              const done = i < step
              const now = i === step
              return (
                <li key={i} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    aria-current={now ? 'step' : undefined}
                    className={`min-h-11 w-full cursor-pointer px-3 pb-3 pt-[11px] text-start ${
                      i > 0 ? 'border-s-[1.5px] border-ink' : ''
                    } ${now ? 'bg-ink text-bg' : done ? 'bg-track text-ink' : 'bg-bg text-ghost'}`}
                  >
                    <span className="flex items-baseline justify-between gap-1.5">
                      <span className="text-[19px] font-black tracking-[-0.03em] tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-narrow text-[11px] font-bold tracking-[0.08em] opacity-70">
                        {done ? t('survey:stepMark.done') : now ? t('survey:stepMark.now') : ''}
                      </span>
                    </span>
                    <span className="mt-[5px] block font-narrow text-[11.5px] font-bold uppercase leading-[1.25] tracking-[0.09em]">
                      {t(`survey:stepName.${i}`)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-[7px] flex justify-between font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
            <span>
              {t('survey:stepOf', { current: step + 1, total: WIZARD_STEP_COUNT })} {SEP}{' '}
              {t(`survey:stepName.${step}`)}
            </span>
            <span>{t(`survey:qRange.${step}`)}</span>
          </div>
        </>
      ) : null}

      {write.error ? <WriteError error={write.error} onDismiss={write.reset} /> : null}

      {/* A save that did not happen. Solid red band, not a tinted box. */}
      {formError ? (
        <div
          role="alert"
          className="mt-[18px] flex items-baseline gap-[14px] bg-error px-[18px] py-[14px] text-bg"
        >
          <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
            {t('forms:notSaved')}
          </span>
          <span className="text-[15px] font-medium">{formError}</span>
        </div>
      ) : null}

      {mode === 'edit' && write.isLoadingInitial ? (
        <FormSkeleton />
      ) : null}

      {shown.map((s) => (
        <SectionView
          key={s.id}
          section={s}
          values={values}
          setValue={setValue}
          toggleValue={toggleValue}
        />
      ))}

      <div className="mt-[34px] flex flex-col gap-4 border-t-[3px] border-ink pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <span className="font-narrow text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          {isWizard
            ? lastStep
              ? t('survey:footNoteSubmit')
              : t('survey:footNoteKeep')
            : t('forms:footNoteSave', { list: indicators })}
        </span>
        <div className="flex gap-2.5">
          <SecondaryButton onClick={cancel}>
            {isWizard && step > 0 ? `← ${t('survey:back')}` : t('common:actions.cancel')}
          </SecondaryButton>
          <PrimaryButton onClick={submit} disabled={write.isSaving}>
            {isWizard
              ? lastStep
                ? t('survey:submit')
                : `${t('survey:next')} →`
              : mode === 'edit'
                ? t('forms:saveChanges')
                : t('forms:saveRecord')}
          </PrimaryButton>
        </div>
      </div>
    </>
  )
}

export default FormScreen
