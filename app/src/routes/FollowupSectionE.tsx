import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSaveSectionE, useSurveyDetail } from '../data/followups'
import { useRef } from '../data/refTables'
import { BackLink, EmptyState, PageHead } from '../ui/primitives'
import { CARD, NOTE, STEM, Choice, MultiChoice, NotesBox } from '../ui/surveyControls'
import { useToast } from '../ui/Toast'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section E — Closing (Q41–Q43). The sixth of six, and asked in every round.
 *
 *  ── IT FEEDS NOTHING, AND IT SITS NEXT TO THE THING THAT FEEDS EVERYTHING ──
 *
 *  A1 reads Q08, B1 reads Q14 and Q16, C1 reads Q17, IMP-0 reads Q37. Q41, Q42
 *  and Q43 are read by a coordinator looking at one producer and by no view at
 *  all. Nothing on this screen moves a figure.
 *
 *  What is next to it does. Submitting puts the survey into all four at once,
 *  and it is deliberately NOT on this screen: saving here leaves the survey a
 *  draft, and the submit lives on the survey's own page with a confirmation
 *  that names what will happen. A last section that submits itself makes the
 *  largest act in the survey a side effect of pressing Save.
 *
 *  ── UNLIKE SECTION D, THERE IS NO ROUND GATE ──
 *
 *  Section D exists only at twelve months and this screen's sibling refuses to
 *  render for any other round. Q41–Q43 are put in all three rounds, so there is
 *  nothing to refuse here.
 *
 *  ── Q42 IS A REAL FALSE ──
 *
 *  "No, do not contact me again" is the answer that has to survive, because it
 *  is the reason the next round does not ring this person. It is held as
 *  `boolean | undefined` — undefined is unanswered, false is a No — and sent
 *  whenever it is not undefined. A truthiness test would silently drop every
 *  refusal to be contacted again.
 *
 *  ── Q41'S FREE TEXT ──
 *
 *  `ref_support_need` carries one `allows_free_text` option and 0082 made an
 *  empty specification a refusal rather than a silent loss. So the box appears
 *  with the tick and the save is blocked while it is empty — caught here so the
 *  enumerator sees it beside the question, rather than sent and bounced.
 *
 *  ── 320px ──
 *
 *  Nine options stacked, a two-way choice, a four-row notes box. Nothing here
 *  needs more than the ~256px a 320px phone leaves inside the card padding.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function FollowupSectionE() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useSurveyDetail(id)
  const save = useSaveSectionE()

  const supportNeeds = useRef('support_need')

  const [loaded, setLoaded] = useState<string | null>(null)
  const [q41, setQ41] = useState<string[]>([])
  const [q41Other, setQ41Other] = useState('')
  const [q42, setQ42] = useState<boolean>()
  const [q43, setQ43] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)

  const d = q.data

  // Load once, keyed on the id, so a refetch cannot wipe answers already typed.
  if (d && loaded !== d.id) {
    setLoaded(d.id)
    setQ41(d.options['Q41'] ?? [])
    setQ41Other(d.optionOther['Q41'] ?? '')
    setQ42(d.answers['Q42']?.bool ?? undefined)
    setQ43(d.q43 ?? '')
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

  const toggleQ41 = (x: string): void =>
    setQ41((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))

  // An "Other" ticked with nothing typed is refused by the database (0082), so
  // it is caught here rather than sent and bounced.
  const otherMissing =
    q41.some((x) => supportNeeds.find((r) => r.id === x)?.allows_free_text) &&
    q41Other.trim() === ''

  const blocked = otherMissing

  async function submit() {
    if (!id || blocked) return
    setRefusal(null)
    const res = await save.mutateAsync({
      surveyId: id,
      ...(q41.length ? { q41Options: q41 } : {}),
      ...(q41Other.trim() ? { q41Other: q41Other.trim() } : {}),
      // `!= null`, not a truthiness test: false is "do not contact me again".
      ...(q42 != null ? { q42 } : {}),
      ...(q43.trim() ? { q43: q43.trim() } : {}),
    })
    if (res.result === 'saved') {
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:e.saved'),
        sub: t('survey:e.savedSub'),
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
        title={t('survey:e.title')}
        description={t('survey:e.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={CARD}>
          <p className={STEM}>{t('survey:e.q41')}</p>
          <p className={NOTE}>{t('survey:selectAll')}</p>
          <MultiChoice
            rows={supportNeeds}
            selected={q41}
            other={q41Other}
            onToggle={toggleQ41}
            onOther={setQ41Other}
            locale={locale}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:e.q42')}</p>
          <p className={NOTE}>{t('survey:e.q42Note')}</p>
          {/* Held as a boolean, offered as two answers. `value` is undefined
              until one is chosen, so "not asked" and "No" stay distinguishable
              all the way to the database. */}
          <Choice
            value={q42 == null ? undefined : q42 ? 'yes' : 'no'}
            onChange={(v) => setQ42(v === 'yes')}
            options={[
              { value: 'yes', label: t('survey:e.q42opt.yes') },
              { value: 'no', label: t('survey:e.q42opt.no') },
            ]}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:e.q43')}</p>
          <p className={NOTE}>{t('survey:e.q43Note')}</p>
          <div className="mt-3">
            <NotesBox
              label={t('survey:e.q43Label')}
              value={q43}
              onChange={setQ43}
              placeholder={t('survey:e.q43Ph')}
            />
          </div>
        </div>

        {refusal ? (
          <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
            <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('survey:e.notSaved')}
            </div>
            <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
              {t(`survey:e.refused.${refusal}`, { defaultValue: t('survey:e.refused.invalid') })}
            </p>
          </div>
        ) : null}

        {save.isError ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
            {t('survey:e.saveFailed')}
          </p>
        ) : null}

        <div className="mt-6 border-t-[3px] border-ink pt-4">
          {/* Said on the screen, not only in the migration: this button stores
              three answers and does not submit anything. */}
          <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
            {t('survey:e.savesNote')}
          </p>
          <button
            type="submit"
            disabled={save.isPending || blocked}
            className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {save.isPending ? t('survey:e.saving') : t('survey:e.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export default FollowupSectionE
