import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSurveyDetail, useSaveSectionB } from '../data/followups'
import { useRef } from '../data/refTables'
import { BackLink, EmptyState, PageHead } from '../ui/primitives'
import {
  CARD,
  NOTE,
  STEM,
  Choice,
  MultiChoice,
  NumberBox,
  SafetyChecklist,
  type TriStatus,
} from '../ui/surveyControls'
import { useToast } from '../ui/Toast'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section B — Production and market readiness (Q17–Q26). The third of six.
 *
 *  ── Q17 IS C1 ──
 *
 *  v_ind_c1 is the share of respondents still carrying out the activity:
 *  'expanded', 'same' or 'reduced' over everyone who answered Q17 at all. A
 *  percentage, so one wrong answer drags it rather than nudging it. Nothing
 *  here computes it -- the answer is written and the view reads it, and the
 *  survey must reach 'submitted' before the view sees it (0072).
 *
 *  Note which side of the line 'reduced' falls on: someone producing less is
 *  still producing, and C1 counts them. 'paused' does not count, even though a
 *  paused activity often resumes -- the indicator asks about now.
 *
 *  ── THE CONDITIONAL BRANCHES ──
 *
 *  Q19 appears when the activity is paused or stopped. Q24 appears when at
 *  least one Q23 item is not done.
 *
 *  Hiding them is not enough, and the server does not trust this screen: 0084
 *  clears Q19 when the activity is running and re-reads Q23 from the rows it
 *  just wrote before deciding whether Q24 survives. A stale tab cannot attach
 *  obstacles to a checklist that is now complete.
 *
 *  ── Q25 IS DELIBERATELY ABSENT ──
 *
 *  Its answer options have never been supplied. A guess would be stored, look
 *  like data, and not match the real list when it arrives -- so the question is
 *  shown as a visible gap rather than quietly skipped, and 0084 has no
 *  parameter that could carry a guess. See OQ-31.
 *
 *  ── PHONE FIRST ──
 *
 *  One question per card. Q23's nine tri-state items are the hard part and the
 *  reasoning lives with the control, in ui/surveyControls.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Answer code to its label key. The codes are the database's, verbatim. */
const Q17 = [
  ['expanded', 'expanded'],
  ['same', 'same'],
  ['reduced', 'reduced'],
  ['paused', 'paused'],
  ['stopped', 'stopped'],
  ['never_started', 'neverStarted'],
] as const

const Q18 = [
  ['after', 'startedAfter'],
  ['before_strengthened', 'beforeStrengthened'],
  ['before_no_change', 'beforeNoChange'],
] as const

const Q22 = [
  ['much_more', 'muchMore'],
  ['somewhat_more', 'somewhatMore'],
  ['about_same', 'aboutSame'],
  ['less', 'less'],
  ['not_producing', 'notProducing'],
] as const

export function FollowupSectionB() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useSurveyDetail(id)
  const save = useSaveSectionB()

  const stopReasons = useRef('stop_reason')
  const activities = useRef('survey_activity')
  const products = useRef('product')
  const obstacles = useRef('compliance_obstacle')
  const safetyItems = useRef('safety_item')

  const [loaded, setLoaded] = useState<string | null>(null)
  const [q17, setQ17] = useState<string>()
  const [q18, setQ18] = useState<string>()
  const [q19When, setQ19When] = useState('')
  const [q19, setQ19] = useState<string[]>([])
  const [q19Other, setQ19Other] = useState('')
  const [q20, setQ20] = useState<string[]>([])
  const [q20Other, setQ20Other] = useState('')
  const [q21, setQ21] = useState<string[]>([])
  const [q22, setQ22] = useState<string>()
  const [q23, setQ23] = useState<Record<string, TriStatus>>({})
  const [q24, setQ24] = useState<string[]>([])
  const [q24Other, setQ24Other] = useState('')
  const [q26Total, setQ26Total] = useState('')
  const [q26Women, setQ26Women] = useState('')
  const [q26Under30, setQ26Under30] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)

  // Load once, keyed on the id, so a refetch cannot wipe answers already typed.
  const d = q.data
  if (d && loaded !== d.id) {
    setLoaded(d.id)
    setQ17(d.q17 ?? undefined)
    setQ18(d.q18 ?? undefined)
    setQ19When(d.answers['Q19']?.text ?? '')
    setQ19(d.options['Q19'] ?? [])
    setQ19Other(d.optionOther['Q19'] ?? '')
    setQ20(d.options['Q20'] ?? [])
    setQ20Other(d.optionOther['Q20'] ?? '')
    setQ21(d.options['Q21'] ?? [])
    setQ22(d.q22 ?? undefined)
    setQ23(d.safety)
    setQ24(d.options['Q24'] ?? [])
    setQ24Other(d.optionOther['Q24'] ?? '')
    setQ26Total(d.q26Total == null ? '' : String(d.q26Total))
    setQ26Women(d.q26Women == null ? '' : String(d.q26Women))
    setQ26Under30(d.q26Under30 == null ? '' : String(d.q26Under30))
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

  const showQ19 = q17 === 'paused' || q17 === 'stopped'
  const anyUndone = Object.values(q23).some((s) => s !== 'done')

  const toggle =
    (set: (f: (c: string[]) => string[]) => void) =>
    (x: string): void =>
      set((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))

  const num = (v: string): number | null => (v.trim() === '' ? null : Number(v))
  const total = num(q26Total)
  const women = num(q26Women)
  const under30 = num(q26Under30)
  const womenOver = total != null && women != null && women > total
  const under30Over = total != null && under30 != null && under30 > total

  // An "Other" ticked with nothing typed is refused by the database (0082), so
  // it is caught here rather than sent and bounced. The inline warning under the
  // box says which one; this only decides whether the button can be pressed.
  const otherMissing =
    (showQ19 && q19.some((x) => stopReasons.find((r) => r.id === x)?.allows_free_text) &&
      q19Other.trim() === '') ||
    (q20.some((x) => activities.find((r) => r.id === x)?.allows_free_text) &&
      q20Other.trim() === '') ||
    (anyUndone &&
      q24.some((x) => obstacles.find((r) => r.id === x)?.allows_free_text) &&
      q24Other.trim() === '')

  const blocked = womenOver || under30Over || otherMissing

  async function submit() {
    if (!id || blocked) return
    setRefusal(null)
    const res = await save.mutateAsync({
      surveyId: id,
      ...(q17 ? { q17 } : {}),
      ...(q18 ? { q18 } : {}),
      ...(showQ19 && q19When.trim() ? { q19When: q19When.trim() } : {}),
      ...(showQ19 && q19.length ? { q19Options: q19 } : {}),
      ...(showQ19 && q19Other.trim() ? { q19Other: q19Other.trim() } : {}),
      ...(q20.length ? { q20Options: q20 } : {}),
      ...(q20Other.trim() ? { q20Other: q20Other.trim() } : {}),
      ...(q21.length ? { q21Options: q21 } : {}),
      ...(q22 ? { q22 } : {}),
      // Only the items actually answered. An absent item is unanswered, which
      // is not the same finding as 'not_started'.
      ...(Object.keys(q23).length
        ? {
            q23: Object.entries(q23).map(([item_id, status]) => ({ item_id, status })),
          }
        : {}),
      ...(anyUndone && q24.length ? { q24Options: q24 } : {}),
      ...(anyUndone && q24Other.trim() ? { q24Other: q24Other.trim() } : {}),
      ...(total != null ? { q26Total: total } : {}),
      ...(women != null ? { q26Women: women } : {}),
      ...(under30 != null ? { q26Under30: under30 } : {}),
    })
    if (res.result === 'saved') {
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:b.saved'),
        sub: t('survey:b.savedSub'),
        tone: 'ok',
      })
      navigate(`/followups/${id}`)
      return
    }
    // 'invalid' names the constraint that refused, so the message can point at
    // the box rather than saying something went wrong.
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
        title={t('survey:b.title')}
        description={t('survey:b.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={CARD}>
          <p className={STEM}>{t('survey:q17')}</p>
          <p className={NOTE}>{t('survey:b.feedsC1')}</p>
          <Choice
            value={q17}
            onChange={setQ17}
            options={Q17.map(([v, k]) => ({ value: v, label: t(`survey:opt.${k}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q18')}</p>
          <Choice
            value={q18}
            onChange={setQ18}
            options={Q18.map(([v, k]) => ({ value: v, label: t(`survey:opt.${k}`) }))}
          />
        </div>

        {showQ19 ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:q.19')}</p>
            <label className="mt-3 block">
              <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('survey:b.q19When')}
              </span>
              <input
                className="mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
                value={q19When}
                onChange={(e) => setQ19When(e.target.value)}
                maxLength={100}
              />
            </label>
            <p className={`${NOTE} mt-4`}>{t('survey:b.q19Why')}</p>
            <MultiChoice
              rows={stopReasons}
              selected={q19}
              other={q19Other}
              onToggle={toggle(setQ19)}
              onOther={setQ19Other}
              locale={locale}
            />
          </div>
        ) : null}

        <div className={CARD}>
          <p className={STEM}>{t('survey:q20')}</p>
          <p className={NOTE}>{t('survey:selectAll')}</p>
          <MultiChoice
            rows={activities}
            selected={q20}
            other={q20Other}
            onToggle={toggle(setQ20)}
            onOther={setQ20Other}
            locale={locale}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.21')}</p>
          <p className={NOTE}>{t('survey:b.q21Note')}</p>
          {/* ref_product is the only one of the eight lists with no free-text
              option, so MultiChoice renders no specification box here. */}
          <MultiChoice
            rows={products}
            selected={q21}
            other=""
            onToggle={toggle(setQ21)}
            onOther={() => undefined}
            locale={locale}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q22')}</p>
          <Choice
            value={q22}
            onChange={setQ22}
            options={Q22.map(([v, k]) => ({ value: v, label: t(`survey:opt.${k}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.23')}</p>
          <p className={NOTE}>{t('survey:b.q23Intro')}</p>
          <SafetyChecklist
            rows={safetyItems}
            value={q23}
            onSet={(itemId, status) => setQ23((c) => ({ ...c, [itemId]: status }))}
            locale={locale}
          />
        </div>

        {anyUndone ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:q.24')}</p>
            <p className={NOTE}>{t('survey:b.q24Note')}</p>
            <MultiChoice
              rows={obstacles}
              selected={q24}
              other={q24Other}
              onToggle={toggle(setQ24)}
              onOther={setQ24Other}
              locale={locale}
            />
          </div>
        ) : null}

        {/* Q25. Shown as a gap on purpose -- an enumerator who cannot see it
            would assume the form covers the sheet, and it does not. */}
        <div className="mt-4 border-[1.5px] border-dashed border-border-strong bg-sunken p-4 sm:p-5">
          <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em] text-muted">
            {t('survey:b.q25PendingTitle')}
          </p>
          <p className="m-0 mt-2 text-[15px] font-semibold leading-[1.35] text-ink">
            {t('survey:q.25')}
          </p>
          <p className="m-0 mt-2 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
            {t('survey:b.q25PendingBody')}
          </p>
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:q.26')}</p>
          <p className={NOTE}>{t('survey:b.q26Note')}</p>
          <div className="mt-3 flex flex-col gap-3">
            <NumberBox label={t('survey:q26total')} value={q26Total} onChange={setQ26Total} />
            <NumberBox
              label={t('survey:q26women')}
              value={q26Women}
              onChange={setQ26Women}
              invalid={womenOver}
            />
            <NumberBox
              label={t('survey:q26under30')}
              value={q26Under30}
              onChange={setQ26Under30}
              invalid={under30Over}
            />
          </div>
          {womenOver ? (
            <p role="alert" className="mt-2 text-[13.5px] font-semibold text-error">
              {t('survey:b.refused.workers_women_lte_total')}
            </p>
          ) : null}
          {under30Over ? (
            <p role="alert" className="mt-2 text-[13.5px] font-semibold text-error">
              {t('survey:b.refused.workers_under30_lte_total')}
            </p>
          ) : null}
        </div>

        {refusal ? (
          <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
            <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('survey:b.notSaved')}
            </div>
            <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
              {t(`survey:b.refused.${refusal}`, { defaultValue: t('survey:b.refused.invalid') })}
            </p>
          </div>
        ) : null}

        {save.isError ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
            {t('survey:b.saveFailed')}
          </p>
        ) : null}

        <div className="mt-6 border-t-[3px] border-ink pt-4">
          <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
            {t('survey:b.savesNote')}
          </p>
          <button
            type="submit"
            disabled={save.isPending || blocked}
            className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {save.isPending ? t('survey:b.saving') : t('survey:b.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export default FollowupSectionB
