import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSaveSectionD, useSurveyDetail } from '../data/followups'
import { useRef } from '../data/refTables'
import { BackLink, EmptyState, PageHead } from '../ui/primitives'
import { CARD, NOTE, STEM, Choice, MultiChoice, TextBox } from '../ui/surveyControls'
import { useToast } from '../ui/Toast'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section D — Continued engagement (Q37–Q40). The fifth of six, and the only
 *  one that does not exist for every survey.
 *
 *  ── THIS IS WHERE IMP-0 COMES FROM ──
 *
 *  Q37 is the whole of it. `v_ind_imp_0` counts twelve-month surveys with a
 *  non-null `q37_still_engaged` as its denominator and `main` or `secondary` as
 *  its numerator. It is the Action Plan's impact indicator -- baseline 0, no
 *  target until 28/Q4, then 70 -- and it is a percentage, so a single wrong
 *  answer drags the figure rather than nudging it.
 *
 *  Four screens in this survey feed an indicator. This is the one where the
 *  answer is the indicator, with nothing in between.
 *
 *  Nothing here computes it. The answer is written; the view reads it; and the
 *  survey must reach `submitted` before the view sees it at all (0072). That
 *  was confirmed in both directions rather than assumed: a saved twelve-month
 *  answer on a draft leaves IMP-0 at a null actual over a denominator of zero,
 *  and flipping the status to `submitted` makes it appear.
 *
 *  ── WHY 'no' IS NOT THE OPPOSITE OF 'yes' HERE ──
 *
 *  Q37 has three answers, not two: the activity is their MAIN work, a
 *  SECONDARY activity, or gone. IMP-0's numerator takes the first two, so
 *  someone who kept the activity alongside a job counts as still engaged --
 *  which is the honest reading of "remains engaged in an economic activity",
 *  and the reason the question is not a yes/no.
 *
 *  ── Q38 IS NOT NARROWED BY Q37 ──
 *
 *  `not_engaged` is one of Q38's own six options, so the sheet expects the
 *  question answered either way and all six stay on offer. A contradictory pair
 *  is therefore possible and is left possible: no indicator reads Q38, so it
 *  moves no figure, and hiding options to enforce a rule the sheet does not
 *  state would be inventing one. OQ-34.
 *
 *  ── Q39 IS Q19 AT TWELVE MONTHS ──
 *
 *  Same shape, same list -- `ref_stop_reason`, shared deliberately (0075). It
 *  appears when Q37 is 'no'. Hiding it is not enough and the server does not
 *  trust this screen: 0092 clears both the month and the reasons whenever Q37
 *  is anything else, so correcting Q37 after ticking reasons cannot leave "why
 *  did you stop" on someone who did not stop.
 *
 *  ── THE ROUND GATE, TWICE ──
 *
 *  Section D exists only at twelve months, and `section_d_only_at_12m` enforces
 *  it in the database. This screen refuses to render a form for any other
 *  round, and 0092 refuses to write one -- returning `not_twelve_month` by name
 *  rather than a constraint violation, because the round is not something an
 *  enumerator can fix from this screen.
 *
 *  The survey list already shows D as locked with the reason on a six-month
 *  survey, so arriving here at all means a direct link or a stale tab. It still
 *  gets an explanation rather than an empty form.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Answer codes are the database's, verbatim. */
const Q37 = ['main', 'secondary', 'no'] as const

const Q38 = [
  'own_land',
  'rented_land',
  'own_business',
  'employed',
  'family_activity',
  'not_engaged',
] as const

const Q40 = ['higher', 'about_same', 'lower', 'no_income'] as const

export function FollowupSectionD() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useSurveyDetail(id)
  const save = useSaveSectionD()

  const stopReasons = useRef('stop_reason')

  const [loaded, setLoaded] = useState<string | null>(null)
  const [q37, setQ37] = useState<string>()
  const [q38, setQ38] = useState<string>()
  const [q39When, setQ39When] = useState('')
  const [q39, setQ39] = useState<string[]>([])
  const [q39Other, setQ39Other] = useState('')
  const [q40, setQ40] = useState<string>()
  const [refusal, setRefusal] = useState<string | null>(null)

  const d = q.data

  // Load once, keyed on the id, so a refetch cannot wipe answers already typed.
  if (d && loaded !== d.id) {
    setLoaded(d.id)
    setQ37(d.q37 ?? undefined)
    setQ38(d.q38 ?? undefined)
    setQ39When(d.answers['Q39']?.text ?? '')
    setQ39(d.options['Q39'] ?? [])
    setQ39Other(d.optionOther['Q39'] ?? '')
    setQ40(d.q40 ?? undefined)
  }

  if (q.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-10 w-64 animate-pulse bg-track" />
        <div className="mt-6 h-72 animate-pulse bg-track" />
      </div>
    )
  }
  if (q.isError || !d) {
    return (
      <EmptyState heading title={t('survey:notFoundTitle')} description={t('survey:notFoundBody')} />
    )
  }

  // Said plainly, with the reason, rather than rendering a form whose every
  // answer the database is going to refuse.
  if (d.round !== 'twelve_month') {
    return (
      <>
        <PageHead
          back={
            <BackLink onClick={() => navigate(`/followups/${d.id}`)}>
              {t('survey:backToSurvey')}
            </BackLink>
          }
          eyebrow={`${t('survey:eyebrow')} · ${d.personName}`}
          title={t('survey:d.title')}
          size="md"
        />
        <EmptyState
          heading
          title={t('survey:d.wrongRoundTitle')}
          description={t('survey:d.wrongRoundBody', { round: t(`survey:round.${d.round}`) })}
        />
      </>
    )
  }

  const showQ39 = q37 === 'no'

  const toggleQ39 = (x: string): void =>
    setQ39((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))

  // An "Other" ticked with nothing typed is refused by the database (0082), so
  // it is caught here rather than sent and bounced.
  const otherMissing =
    showQ39 &&
    q39.some((x) => stopReasons.find((r) => r.id === x)?.allows_free_text) &&
    q39Other.trim() === ''

  const blocked = otherMissing

  async function submit() {
    if (!id || blocked) return
    setRefusal(null)
    const res = await save.mutateAsync({
      surveyId: id,
      ...(q37 ? { q37 } : {}),
      ...(q38 ? { q38 } : {}),
      // Sent only while Q37 says the activity stopped. 0092 clears them anyway
      // if it disagrees, which is the half that actually enforces it.
      ...(showQ39 && q39When.trim() ? { q39When: q39When.trim() } : {}),
      ...(showQ39 && q39.length ? { q39Options: q39 } : {}),
      ...(showQ39 && q39Other.trim() ? { q39Other: q39Other.trim() } : {}),
      ...(q40 ? { q40 } : {}),
    })
    if (res.result === 'saved') {
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:d.saved'),
        sub: t('survey:d.savedSub'),
        tone: 'ok',
      })
      navigate(`/followups/${id}`)
      return
    }
    setRefusal(res.result === 'invalid' ? (res.constraint ?? 'invalid') : res.result)
  }

  return (
    <>
      <PageHead
        back={
          <BackLink onClick={() => navigate(`/followups/${d.id}`)}>
            {t('survey:backToSurvey')}
          </BackLink>
        }
        eyebrow={`${t('survey:eyebrow')} · ${d.personName}`}
        title={t('survey:d.title')}
        description={t('survey:d.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={CARD}>
          <p className={STEM}>{t('survey:d.q37')}</p>
          <p className={NOTE}>{t('survey:d.feedsImp0')}</p>
          <Choice
            value={q37}
            onChange={setQ37}
            options={Q37.map((v) => ({ value: v, label: t(`survey:d.q37opt.${v}`) }))}
          />
          {/* Which side of the line each answer falls on, stated on the screen
              rather than only in the indicator document. An enumerator choosing
              between "main" and "secondary" is not changing the figure; one
              choosing between "secondary" and "no" is. */}
          <p className={`${NOTE} mt-3`}>{t('survey:d.q37Note')}</p>
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:d.q38')}</p>
          <p className={NOTE}>{t('survey:d.q38Note')}</p>
          <Choice
            value={q38}
            onChange={setQ38}
            options={Q38.map((v) => ({ value: v, label: t(`survey:d.q38opt.${v}`) }))}
          />
        </div>

        {showQ39 ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:d.q39')}</p>
            <div className="mt-3">
              <TextBox
                label={t('survey:d.q39When')}
                value={q39When}
                onChange={setQ39When}
                maxLength={100}
              />
            </div>
            <p className={`${NOTE} mt-4`}>{t('survey:d.q39Why')}</p>
            {/* The same list Q19 uses. One table, because the sheet says it is
                one list and two copies drift apart. See 0075. */}
            <MultiChoice
              rows={stopReasons}
              selected={q39}
              other={q39Other}
              onToggle={toggleQ39}
              onOther={setQ39Other}
              locale={locale}
            />
          </div>
        ) : null}

        <div className={CARD}>
          <p className={STEM}>{t('survey:d.q40')}</p>
          <Choice
            value={q40}
            onChange={setQ40}
            options={Q40.map((v) => ({ value: v, label: t(`survey:d.q40opt.${v}`) }))}
          />
        </div>

        {refusal ? (
          <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
            <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('survey:d.notSaved')}
            </div>
            <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
              {t(`survey:d.refused.${refusal}`, { defaultValue: t('survey:d.refused.invalid') })}
            </p>
          </div>
        ) : null}

        {save.isError ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
            {t('survey:d.saveFailed')}
          </p>
        ) : null}

        <div className="mt-6 border-t-[3px] border-ink pt-4">
          <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
            {t('survey:d.savesNote')}
          </p>
          <button
            type="submit"
            disabled={save.isPending || blocked}
            className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {save.isPending ? t('survey:d.saving') : t('survey:d.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export default FollowupSectionD
