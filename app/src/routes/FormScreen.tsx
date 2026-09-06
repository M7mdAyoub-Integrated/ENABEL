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
import { RestorePanel } from '../components/RestorePanel'
import { WithdrawnNotice } from '../components/WithdrawnNotice'
import {
  usePersonRestoreCandidate,
  usePartnerRestoreCandidate,
} from '../data/restore'
import { usePersonByNationalId, NEW_SESSION } from '../data/completions'
import { usePartners } from '../data/partnerships'
import { isAppError } from '../data/errors'

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

  /**
   * ── RESTORE, INSTEAD OF A CONSTRAINT ERROR WITH NO WAY FORWARD ──
   *
   * `person.national_id` and `partner (name, unit)` are GLOBALLY unique on
   * purpose -- 0059 deliberately left them so while making the event-shaped
   * indexes partial -- because recreating an entity moves a figure that has
   * already been reported. So a save for someone who was soft-deleted is
   * refused, correctly, and until now the coordinator was simply stuck: the
   * message named a row they could not see or reach, and the only remaining
   * move was to type a different national ID, which is the duplicate the
   * index exists to prevent.
   *
   * When the refusal is a DUPLICATE and the key belongs to a SOFT-DELETED row,
   * this offers to restore it. A duplicate against a LIVE row produces no
   * candidate and the ordinary constraint message stands, which is the right
   * answer there.
   *
   * Only for the two entity modules. Everything else in MODULE_IDS is
   * event-shaped, and 0059 made those indexes partial so a re-entry after a
   * delete is allowed rather than refused.
   */
  const isDuplicate = isAppError(write.error) && write.error.kind === 'duplicate'
  const personKeyModule = module === 'tc' || module === 'os' || module === 'gd'
  const personCandidate = usePersonRestoreCandidate(
    typeof values['nid'] === 'string' ? values['nid'] : '',
    isDuplicate && personKeyModule,
  )
  const partnerCandidate = usePartnerRestoreCandidate(
    typeof values['name'] === 'string' ? values['name'] : '',
    typeof values['unit'] === 'string' ? values['unit'] : '',
    isDuplicate && module === 'pn',
  )
  const restoreKind: 'person' | 'partner' | null = personCandidate.data
    ? 'person'
    : partnerCandidate.data
      ? 'partner'
      : null
  const restoreCandidate = personCandidate.data ?? partnerCandidate.data ?? null

  /**
   * The other direction — a key that PERMITS re-entry and would say nothing.
   *
   * `training_enrolment_person_session_live` and `partnership_partner_type_live`
   * are partial on purpose (0059), so re-entering the pair succeeds. Silently,
   * until 0110. See components/WithdrawnNotice.tsx.
   *
   * Both need the row's OWN id, which the form does not have while it is still
   * holding a national ID and an organisation name. So both are looked up here
   * on the same keys the form already resolves for its own duplicate check —
   * `usePersonByNationalId` for tc, and the partner lookup for pn. Neither is a
   * new query shape.
   *
   * Deliberately NOT gated on `isDuplicate`: nothing is going to be refused, so
   * waiting for an error would mean waiting for one that never comes. It has to
   * appear while the form is being filled in, which is the only moment it can
   * still change what somebody does.
   */
  const tcNid = module === 'tc' && typeof values['nid'] === 'string' ? values['nid'] : ''
  const tcPerson = usePersonByNationalId(tcNid)
  const tcSession = typeof values['session'] === 'string' ? values['session'] : ''

  // The LIVE partner behind the name being typed. `partner_name_unique` is on
  // (name, unit) NULLS NOT DISTINCT, so an empty unit is part of the key rather
  // than a wildcard -- matched the same way here.
  const pnPartners = usePartners(module === 'pn')
  const pnName = typeof values['name'] === 'string' ? values['name'].trim() : ''
  const pnUnit = typeof values['unit'] === 'string' ? values['unit'].trim() : ''
  const pnPartnerId =
    module === 'pn' && pnName
      ? ((pnPartners.data ?? []).find(
          (p) => p.name.trim() === pnName && (p.unit ?? '').trim() === pnUnit,
        )?.id ?? null)
      : null
  const pnType = typeof values['ptype'] === 'string' ? values['ptype'] : ''
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

  // A module whose write branch is still the mock IDLE one -- no save path at
  // all. Named here rather than tested inline, because the submit button and
  // the warning band must agree.
  //
  // ── CURRENTLY UNREACHABLE. DO NOT DELETE AS DEAD CODE. ──
  //
  // `useModuleWrite` returns a live branch for pn, ex, tc, os and gd, and IDLE
  // for the other five: tp, pp, ln, rg and fu. All five of those are retired,
  // and App.tsx redirects every `/forms/<id>` shape for them (built from
  // RETIRED_MODULE_IDS) before this component mounts. So `notConnected` cannot
  // be true today, and none of this band, the disabled submit or the changed
  // footer text can appear.
  //
  // It stays because it is the guard for the NEXT module. The failure it was
  // written for is one this project has already had: a form that fired
  // "Saved -- E0.2" and navigated away having written nothing, which is
  // indistinguishable from success and surfaces a quarter later as a wrong
  // donor figure. A module wired up with its save still on IDLE gets caught
  // here rather than shipping.
  //
  // If you are removing the last retired module, this is still not dead --
  // check `useModuleWrite` for an id that falls through to IDLE first.
  const notConnected = !write.isLive

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
      // Paging through the wizard is allowed -- it is how anyone reviews the
      // form -- but the terminal action is not, because there is nothing behind
      // it. Before this, it fired "Submitted - 43 questions" and navigated away
      // having written no survey at all, while the dashboard showed A1, B1, C1
      // and IMP-0 as empty.
      if (notConnected) return
      toast.fire({
        tag: t('common:toast.saved'),
        title: t('survey:submitted'),
        sub: t('survey:submittedSub', { count: 43 }),
      })
      backToList()
      return
    }

    if (notConnected) return

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

    // Only leave the screen once the database has accepted it -- navigating
    // away on optimism would tell the coordinator a partnership was registered
    // when RLS had refused it.
    //
    // There is deliberately NO else branch. It used to be a bare announce(),
    // which is what made a module with no save path claim it had saved. A
    // module without `save` is stopped above, and if one ever reaches here
    // without it, doing nothing is the right failure.
    if (write.save) {
      void write.save(values).then(announce, () => undefined)
    }
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

      {/* Withdrawn predecessor on a partial key — see 0110. Above the error
          band rather than below it, because it is not an error: nothing has
          been refused and nothing is going to be. NEW_SESSION is excluded
          because it is a sentinel meaning "create one", not a session id, and
          casting it would ask the database about a uuid that does not exist. */}
      {module === 'tc' && tcPerson.data && tcSession && tcSession !== NEW_SESSION ? (
        <WithdrawnNotice kind="training_enrolment" a={tcPerson.data.id} b={tcSession} />
      ) : null}
      {module === 'pn' && pnPartnerId && pnType ? (
        <WithdrawnNotice kind="partnership" a={pnPartnerId} b={pnType} />
      ) : null}

      {/* The restore offer REPLACES the raw duplicate message when the key
          belongs to a soft-deleted row. Showing both would put "someone is
          already on file with this national ID" directly above "restore
          them?", which reads as two unrelated problems. */}
      {write.error && !(restoreKind && restoreCandidate) ? (
        <WriteError error={write.error} onDismiss={write.reset} />
      ) : null}

      {restoreKind && restoreCandidate ? (
        <RestorePanel
          kind={restoreKind}
          candidate={restoreCandidate}
          onDismiss={() => write.reset()}
          onRestored={() => {
            write.reset()
            toast.fire({
              tag: t('common:toast.updated'),
              title: t('forms:restore.done'),
              sub: t('forms:restore.doneSub'),
            })
            // Straight to the restored record rather than back into a form
            // that would now be saving over it. The list is the honest
            // destination: the row is back in it, which is the thing the
            // coordinator just asked for.
            navigate(`/forms/${module}`)
          }}
        />
      ) : null}

      {/*
        A module whose write is not connected yet.

        `announce()` at the bottom of submit() used to run unconditionally, so a
        module with `save: null` fired a "Saved" toast naming the indicators it
        fed, and navigated away, having written nothing. Submit is now disabled
        for those modules and this band says so before anyone fills the form in.

        Not a tinted notice: the same solid red as a refused save, because the
        outcome is the same -- nothing is recorded.
      */}
      {notConnected ? (
        <div
          role="alert"
          className="mt-[18px] bg-error px-[18px] py-[14px] text-bg"
        >
          <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
            {t('forms:notConnectedTag')}
          </div>
          <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
            {t('forms:notConnectedBody', {
              name: t(`nav:module.${module}`),
              list: indicators,
            })}
          </p>
        </div>
      ) : null}

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
              ? notConnected
                ? t('forms:notConnectedFoot')
                : t('survey:footNoteSubmit')
              : t('survey:footNoteKeep')
            : notConnected
              ? t('forms:notConnectedFoot')
              : t('forms:footNoteSave', { list: indicators })}
        </span>
        <div className="flex gap-2.5">
          <SecondaryButton onClick={cancel}>
            {isWizard && step > 0 ? `← ${t('survey:back')}` : t('common:actions.cancel')}
          </SecondaryButton>
          {/* Disabled on the terminal action of a module with no save path, so
              the refusal is visible before the form is filled in rather than
              silent after. Stepping through the wizard stays enabled. */}
          <PrimaryButton
            onClick={submit}
            disabled={write.isSaving || (notConnected && (!isWizard || lastStep))}
          >
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
