import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSurveyDetail, useSaveSectionA } from '../data/followups'
import { useRef } from '../data/refTables'
import { BackLink, EmptyState, PageHead } from '../ui/primitives'
import { CARD, NOTE, STEM, Choice, MultiChoice } from '../ui/surveyControls'
import { useToast } from '../ui/Toast'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section A — Technical capacity (Q7–Q16). The second of six.
 *
 *  ── TWO OF THESE TEN QUESTIONS ARE INDICATORS ──
 *
 *  Q8 is A1. Q14 is B1's denominator and Q16 is its numerator. All three are
 *  percentages, so one wrong answer does not nudge them -- it drags the whole
 *  figure. Nothing on this screen computes any of them; they are written as
 *  answers and read back from v_indicator_progress like every other figure.
 *
 *  ── THE CONDITIONAL BRANCHES ──
 *
 *  Q9 appears only when Q8 is "no". Q11 only when Q10 is not "no". Q15 and Q16
 *  only when Q14 is "yes".
 *
 *  Hiding them is not enough. An enumerator who ticks three reasons under Q9
 *  and then corrects Q8 to "regularly" would leave three reasons attached to a
 *  survey saying the knowledge WAS applied -- a contradiction nothing
 *  downstream would notice. `save_followup_section_a` deletes the unreachable
 *  branch in the same transaction (0079). This screen hides; the database
 *  forgets.
 *
 *  ── Q14 HAS THREE ANSWERS, NOT TWO ──
 *
 *  "I was not aware it exists" is its own answer, and it was a boolean until
 *  0077 folded it into false. It is the most useful of the three: B1.1 and G0.1
 *  exist to establish that office, and whether people know it is there is what
 *  year one is for.
 *
 *  ── PHONE FIRST ──
 *
 *  One question per card, full-width stacked answers. A select on a phone opens
 *  a picker that covers the question just read aloud.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function FollowupSectionA() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useSurveyDetail(id)
  const save = useSaveSectionA()

  const reasons = useRef('nonapply_reason')
  const changes = useRef('practice_change')
  const services = useRef('office_service_type')

  const [loaded, setLoaded] = useState<string | null>(null)
  const [q7, setQ7] = useState<string>()
  const [q8, setQ8] = useState<string>()
  const [q9, setQ9] = useState<string[]>([])
  const [q9Other, setQ9Other] = useState('')
  const [q10, setQ10] = useState<string>()
  const [q11, setQ11] = useState<string[]>([])
  const [q11Other, setQ11Other] = useState('')
  const [q12, setQ12] = useState<string>()
  const [q13, setQ13] = useState<string>()
  const [q14, setQ14] = useState<string>()
  const [q15Count, setQ15Count] = useState('')
  const [q15, setQ15] = useState<string[]>([])
  const [q15Other, setQ15Other] = useState('')
  const [q16, setQ16] = useState<string>()
  const [refusal, setRefusal] = useState<string | null>(null)

  // Load once, keyed on the id, so a refetch cannot wipe answers already typed.
  const d = q.data
  if (d && loaded !== d.id) {
    setLoaded(d.id)
    setQ7(d.answers['Q7']?.text ?? undefined)
    setQ8(d.q08 ?? undefined)
    setQ9(d.options['Q9'] ?? [])
    setQ9Other(d.optionOther['Q9'] ?? '')
    setQ10(d.answers['Q10']?.text ?? undefined)
    setQ11(d.options['Q11'] ?? [])
    setQ11Other(d.optionOther['Q11'] ?? '')
    setQ12(d.answers['Q12']?.text ?? undefined)
    setQ13(d.answers['Q13']?.text ?? undefined)
    setQ14(d.q14 ?? undefined)
    setQ15Count(d.answers['Q15']?.number == null ? '' : String(d.answers['Q15']?.number))
    setQ15(d.options['Q15'] ?? [])
    setQ15Other(d.optionOther['Q15'] ?? '')
    setQ16(d.q16 ?? undefined)
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

  const showQ9 = q8 === 'no'
  const showQ11 = !!q10 && q10 !== 'no'
  const showOffice = q14 === 'yes'
  // An "Other" ticked with nothing typed is refused by the database (0082),
  // so it is caught here rather than sent and bounced.
  const otherMissing =
    (showQ9 && q9.some((x) => reasons.find((r) => r.id === x)?.allows_free_text) &&
      q9Other.trim() === '') ||
    (showQ11 && q11.some((x) => changes.find((r) => r.id === x)?.allows_free_text) &&
      q11Other.trim() === '') ||
    (showOffice && q15.some((x) => services.find((r) => r.id === x)?.allows_free_text) &&
      q15Other.trim() === '')

  async function submit() {
    if (!id || otherMissing) return
    setRefusal(null)
    const res = await save.mutateAsync({
      surveyId: id,
      ...(q7 ? { q7 } : {}),
      ...(q8 ? { q8 } : {}),
      ...(showQ9 && q9.length ? { q9Options: q9 } : {}),
      ...(showQ9 && q9Other.trim() ? { q9Other: q9Other.trim() } : {}),
      ...(q10 ? { q10 } : {}),
      ...(showQ11 && q11.length ? { q11Options: q11 } : {}),
      ...(showQ11 && q11Other.trim() ? { q11Other: q11Other.trim() } : {}),
      ...(q12 ? { q12 } : {}),
      ...(q13 ? { q13 } : {}),
      ...(q14 ? { q14 } : {}),
      ...(showOffice && q15Count !== '' ? { q15Count: Number(q15Count) } : {}),
      ...(showOffice && q15.length ? { q15Options: q15 } : {}),
      ...(showOffice && q15Other.trim() ? { q15Other: q15Other.trim() } : {}),
      ...(showOffice && q16 ? { q16 } : {}),
    })
    if (res.result === 'saved') {
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:sectionA.saved'),
        sub: t('survey:sectionA.savedSub'),
        tone: 'ok',
      })
      navigate(`/followups/${id}`)
      return
    }
    setRefusal(res.result)
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
        title={t('survey:sectionA.title')}
        description={t('survey:sectionA.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={CARD}>
          <p className={STEM}>{t('survey:q.7')}</p>
          {/* The sheet asks "how useful" and offers relevance options. The
              dictionary says to fix the wording when the form is built, so the
              stem asks what the answers actually answer. */}
          <p className={NOTE}>{t('survey:sectionA.q7Note')}</p>
          <Choice
            value={q7}
            onChange={setQ7}
            options={(
              ['very_relevant', 'somewhat_relevant', 'not_very_relevant', 'not_at_all_relevant'] as const
            ).map((v) => ({ value: v, label: t(`survey:a.q7.${v}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.8')}</p>
          <p className={NOTE}>{t('survey:sectionA.feedsA1')}</p>
          <Choice
            value={q8}
            onChange={setQ8}
            options={(['regularly', 'occasionally', 'no'] as const).map((v) => ({
              value: v,
              label: t(`survey:a.q8.${v}`),
            }))}
          />
        </div>

        {showQ9 ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:q.9')}</p>
            <p className={NOTE}>{t('survey:selectAll')}</p>
            <MultiChoice
              rows={reasons}
              selected={q9}
              other={q9Other}
              onToggle={(x) => setQ9((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))}
              onOther={setQ9Other}
              locale={locale}
            />
          </div>
        ) : null}

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.10')}</p>
          <Choice
            value={q10}
            onChange={setQ10}
            options={(['yes_significantly', 'yes_some_extent', 'no'] as const).map((v) => ({
              value: v,
              label: t(`survey:a.q10.${v}`),
            }))}
          />
        </div>

        {showQ11 ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:q.11')}</p>
            <p className={NOTE}>{t('survey:selectAll')}</p>
            <MultiChoice
              rows={changes}
              selected={q11}
              other={q11Other}
              onToggle={(x) => setQ11((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))}
              onOther={setQ11Other}
              locale={locale}
            />
          </div>
        ) : null}

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.12')}</p>
          <Choice
            value={q12}
            onChange={setQ12}
            options={(['much_better', 'somewhat_better', 'no_change', 'worse'] as const).map((v) => ({
              value: v,
              label: t(`survey:a.q12.${v}`),
            }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.13')}</p>
          {/* Counts how many people were taught, not whether anyone was. */}
          <p className={NOTE}>{t('survey:sectionA.q13Note')}</p>
          <Choice
            value={q13}
            onChange={setQ13}
            options={(['more_than_three', 'one_to_three', 'no'] as const).map((v) => ({
              value: v,
              label: t(`survey:a.q13.${v}`),
            }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.14')}</p>
          <p className={NOTE}>{t('survey:sectionA.feedsB1')}</p>
          <Choice
            value={q14}
            onChange={setQ14}
            options={(['yes', 'no', 'not_aware'] as const).map((v) => ({
              value: v,
              label: t(`survey:a.q14.${v}`),
            }))}
          />
          {q14 === 'not_aware' ? (
            <p className="mt-3 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.55] text-body">
              {t('survey:sectionA.notAwareNote')}
            </p>
          ) : null}
        </div>

        {showOffice ? (
          <>
            <div className={CARD}>
              <p className={STEM}>{t('survey:q.15')}</p>
              <label className="mt-3 block">
                <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('survey:sectionA.q15Count')}
                </span>
                <input
                  className="mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  dir="ltr"
                  value={q15Count}
                  onChange={(e) => setQ15Count(e.target.value)}
                />
              </label>
              <p className={`${NOTE} mt-4`}>{t('survey:sectionA.q15Services')}</p>
              <MultiChoice
                rows={services}
                selected={q15}
                other={q15Other}
                onToggle={(x) =>
                  setQ15((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))
                }
                onOther={setQ15Other}
                locale={locale}
              />
            </div>

            <div className={CARD}>
              <p className={STEM}>{t('survey:q.16')}</p>
              <p className={NOTE}>{t('survey:sectionA.feedsB1Num')}</p>
              <Choice
                value={q16}
                onChange={setQ16}
                options={(['very', 'somewhat', 'not_very', 'not_at_all'] as const).map((v) => ({
                  value: v,
                  label: t(`survey:a.q16.${v}`),
                }))}
              />
            </div>
          </>
        ) : null}

        {refusal ? (
          <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
            <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('survey:sectionA.notSaved')}
            </div>
            <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
              {t(`survey:sectionA.refused.${refusal}`, { defaultValue: refusal })}
            </p>
          </div>
        ) : null}

        {save.isError ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
            {t('survey:sectionA.saveFailed')}
          </p>
        ) : null}

        <div className="mt-6 border-t-[3px] border-ink pt-4">
          <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
            {t('survey:sectionA.savesNote')}
          </p>
          <button
            type="submit"
            disabled={save.isPending || otherMissing}
            className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {save.isPending ? t('survey:sectionA.saving') : t('survey:sectionA.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export default FollowupSectionA
