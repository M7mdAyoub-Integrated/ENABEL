import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useFollowupPrefill,
  useSaveSectionC,
  useSurveyDetail,
  type BuyerInput,
} from '../data/followups'
import { useRef } from '../data/refTables'
import { BackLink, EmptyState, PageHead } from '../ui/primitives'
import {
  CARD,
  NOTE,
  STEM,
  BuyerBlocks,
  Choice,
  EMPTY_BUYER,
  MultiChoice,
  NumberBox,
  buyerIsEmpty,
  buyerMissing,
  type BuyerDraft,
} from '../ui/surveyControls'
import { useToast } from '../ui/Toast'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Section C — Market access (Q27–Q36). The fourth of six.
 *
 *  ── NOTHING HERE IS AN INDICATOR, AND THAT IS WORTH SAYING OUT LOUD ──
 *
 *  A1 reads Q08, C1 reads Q17, IMP-0 reads Q37. Section C feeds none of them.
 *  It is the section that describes what market access actually looks like for
 *  one producer, and it is read by a coordinator rather than counted by a view.
 *
 *  Q30 sits next to E0.2 without being it. E0.2 counts distinct *people* with an
 *  approved registration; Q30 counts distinct *markets* for one person. What
 *  they share is the definition of having participated -- approved registration,
 *  live market -- which is why 0086 put that rule in `count_markets_attended`
 *  and had both the prefill and the save call it. This screen must never count
 *  anything itself.
 *
 *  ── Q30 SHOWS BOTH NUMBERS, ALWAYS ──
 *
 *  The box is prefilled from the records and the enumerator may correct it. When
 *  they do, the derived figure stays on screen beside theirs rather than being
 *  replaced by it.
 *
 *  The gap is the finding. "The records say 2 and the respondent says 4" is a
 *  registration that was never approved, a market someone attended without
 *  registering, or a respondent counting something else -- all three are worth a
 *  coordinator's attention, and none of them survives if the screen quietly
 *  swaps one number for the other.
 *
 *  `q30_is_overridden` is decided inside the transaction by recomputing the
 *  count (0088), never by this screen. What is rendered here is a description of
 *  a decision made elsewhere; it is not the decision.
 *
 *  ── Q28 IS CONSTRAINED HERE AND REFUSED THERE ──
 *
 *  Q28 offers only the channels Q27 has, so the contradiction cannot be entered.
 *  The server refuses it anyway, and both are necessary: the client stops an
 *  enumerator hitting a refusal in the middle of an interview, and the server is
 *  what makes the rule true. Unticking a channel in Q27 drops it from Q28 in the
 *  same tap, because leaving it would send exactly the state the server rejects.
 *
 *  ── Q34 DECIDES WHETHER Q35 EXISTS, AND 'connection_no_sale' IS NOT 'no' ──
 *
 *  'no' means no connection and 0088 clears the buyer rows. 'yes' and
 *  'connection_no_sale' both mean a connection was made and both keep them.
 *
 *  A connection that has not yet produced a sale is still a connection, and it
 *  is arguably the more interesting one: a linkage the Municipality brokered
 *  that has not converted yet is a programme result in progress, not a failure.
 *  Collapsing it into 'no' would delete the buyer rows that say how it came
 *  about, which is the whole of what Q35 measures.
 *
 *  ── PHONE FIRST ──
 *
 *  One question per card. Q35 is the hard part and the reasoning lives with the
 *  control, in ui/surveyControls.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Answer codes are the database's, verbatim. Labels come from the option lists. */
const Q29 = [
  ['much_more', 'muchMore'],
  ['somewhat_more', 'somewhatMore'],
  ['about_same', 'aboutSame'],
  ['less', 'less'],
  ['not_selling', 'notSelling'],
] as const

const Q31 = ['under_50', '50_150', '151_300', '301_500', 'over_500', 'prefer_not_to_say'] as const

const Q32 = ['none', 'one_to_two', 'three_to_five', 'more_than_five'] as const

const Q34 = ['yes', 'connection_no_sale', 'no'] as const

export function FollowupSectionC() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['survey', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useSurveyDetail(id)
  const save = useSaveSectionC()

  const channels = useRef('sales_channel')
  const improvements = useRef('market_improvement')
  const barriers = useRef('selling_barrier')
  const buyerTypes = useRef('buyer_type')

  const [loaded, setLoaded] = useState<string | null>(null)
  const [q27, setQ27] = useState<string[]>([])
  const [q27Other, setQ27Other] = useState('')
  const [q28, setQ28] = useState<string[]>([])
  const [q28Other, setQ28Other] = useState('')
  const [q29, setQ29] = useState<string>()
  const [q30, setQ30] = useState('')
  const [q30Seeded, setQ30Seeded] = useState(false)
  const [q31, setQ31] = useState<string>()
  const [q32, setQ32] = useState<string>()
  const [q33, setQ33] = useState<string[]>([])
  const [q33Other, setQ33Other] = useState('')
  const [q34, setQ34] = useState<string>()
  const [buyers, setBuyers] = useState<BuyerDraft[]>([])
  const [q36, setQ36] = useState<string[]>([])
  const [q36Other, setQ36Other] = useState('')
  const [refusal, setRefusal] = useState<string | null>(null)

  const d = q.data

  // What the records count, from the one function that counts (0086). Asked of
  // the same RPC section 0 uses, so the number here and the number the save
  // compares against come from the same rule.
  const prefill = useFollowupPrefill(d?.nationalId ?? '')
  const derived =
    prefill.data && prefill.data.found ? prefill.data.events_attended : null

  // Load once, keyed on the id, so a refetch cannot wipe answers already typed.
  if (d && loaded !== d.id) {
    setLoaded(d.id)
    setQ27(d.options['Q27'] ?? [])
    setQ27Other(d.optionOther['Q27'] ?? '')
    setQ28(d.options['Q28'] ?? [])
    setQ28Other(d.optionOther['Q28'] ?? '')
    setQ29(d.q29 ?? undefined)
    setQ30(d.q30 == null ? '' : String(d.q30))
    // A stored answer wins over the prefill. Seeding over it would overwrite an
    // override the enumerator already recorded with the figure they rejected.
    setQ30Seeded(d.q30 != null)
    setQ31(d.q31 ?? undefined)
    setQ32(d.answers['Q32']?.text ?? undefined)
    setQ33(d.options['Q33'] ?? [])
    setQ33Other(d.optionOther['Q33'] ?? '')
    setQ34(d.q34 ?? undefined)
    setBuyers(
      d.buyers.map((b) => ({
        name: b.buyerName,
        typeId: b.buyerTypeId,
        typeOther: b.buyerTypeOther ?? '',
        how: b.howConnected,
        howOther: b.howConnectedOther ?? '',
        arrangement: b.arrangement,
        stillActive: b.stillActive,
      })),
    )
    setQ36(d.options['Q36'] ?? [])
    setQ36Other(d.optionOther['Q36'] ?? '')
  }

  // The prefill lands after the survey, so the box is seeded in a second pass
  // rather than in the block above. Only ever onto an unanswered Q30.
  if (!q30Seeded && derived != null) {
    setQ30Seeded(true)
    setQ30(String(derived))
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

  const toggle =
    (set: (f: (c: string[]) => string[]) => void) =>
    (x: string): void =>
      set((c) => (c.includes(x) ? c.filter((y) => y !== x) : [...c, x]))

  // Unticking a channel in Q27 takes it out of Q28 in the same tap. Q28 is a
  // subset by definition, and leaving a stale id there would send precisely the
  // state 0088 refuses as q28_not_in_q27.
  const toggleQ27 = (x: string): void => {
    const removing = q27.includes(x)
    setQ27((c) => (removing ? c.filter((y) => y !== x) : [...c, x]))
    if (removing) setQ28((c) => c.filter((y) => y !== x))
  }

  // Q28's options ARE Q27's answers. Not a filter applied to a longer list --
  // the question is "which of these are new", so the list is the answer to Q27.
  const q28Rows = channels.filter((r) => q27.includes(r.id))

  const typed = q30.trim() === '' ? null : Number(q30)
  const q30Bad = typed != null && (!Number.isInteger(typed) || typed < 0)
  const q30Differs = derived != null && typed != null && typed !== derived

  const connected = q34 === 'yes' || q34 === 'connection_no_sale'
  const started = buyers.filter((b) => !buyerIsEmpty(b))
  const incompleteBuyers = connected
    ? started.filter((b) => buyerMissing(b, buyerTypes).length > 0).length
    : 0

  // An "Other" ticked with nothing typed is refused by the database (0082), so
  // it is caught here rather than sent and bounced. The inline warning under the
  // box says which one; this only decides whether the button can be pressed.
  const freeTextMissing = (rows: typeof channels, picked: string[], text: string): boolean =>
    picked.some((x) => rows.find((r) => r.id === x)?.allows_free_text) && text.trim() === ''

  const otherMissing =
    freeTextMissing(channels, q27, q27Other) ||
    freeTextMissing(channels, q28, q28Other) ||
    freeTextMissing(improvements, q33, q33Other) ||
    freeTextMissing(barriers, q36, q36Other)

  const blocked = q30Bad || otherMissing || incompleteBuyers > 0

  async function submit() {
    if (!id || blocked) return
    setRefusal(null)

    // Only buyers that are actually filled in, and only while Q34 says there is
    // a connection. Blocked above if any of them is half-answered, so nothing
    // typed is dropped here -- the save simply does not run until they are whole.
    const q35: BuyerInput[] = started.map((b) => ({
      buyer_name: b.name.trim(),
      buyer_type_id: b.typeId,
      ...(b.typeOther.trim() ? { buyer_type_other: b.typeOther.trim() } : {}),
      how_connected: b.how,
      ...(b.howOther.trim() ? { how_connected_other: b.howOther.trim() } : {}),
      arrangement: b.arrangement,
      still_active: b.stillActive,
    }))

    const res = await save.mutateAsync({
      surveyId: id,
      ...(q27.length ? { q27Options: q27 } : {}),
      ...(q27Other.trim() ? { q27Other: q27Other.trim() } : {}),
      ...(q28.length ? { q28Options: q28 } : {}),
      ...(q28Other.trim() ? { q28Other: q28Other.trim() } : {}),
      ...(q29 ? { q29 } : {}),
      // Sent even when it matches the prefill: the server decides whether that
      // is an override by counting again, and an omitted Q30 would store the
      // count as though nobody had looked at it.
      ...(typed != null ? { q30: typed } : {}),
      ...(q31 ? { q31 } : {}),
      ...(q32 ? { q32 } : {}),
      ...(q33.length ? { q33Options: q33 } : {}),
      ...(q33Other.trim() ? { q33Other: q33Other.trim() } : {}),
      ...(q34 ? { q34 } : {}),
      // Only when connected. Q34 = 'no' sends nothing and 0088 clears the rows.
      ...(connected ? { q35 } : {}),
      ...(q36.length ? { q36Options: q36 } : {}),
      ...(q36Other.trim() ? { q36Other: q36Other.trim() } : {}),
    })

    if (res.result === 'saved') {
      toast.fire({
        tag: t('survey:eyebrow'),
        title: t('survey:c.saved'),
        sub: t('survey:c.savedSub'),
        tone: 'ok',
      })
      navigate(`/followups/${id}`)
      return
    }
    setRefusal(
      res.result === 'invalid' || res.result === 'buyer_invalid'
        ? (res.constraint ?? res.result)
        : res.result,
    )
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
        title={t('survey:c.title')}
        description={t('survey:c.intro')}
        size="md"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q27')}</p>
          <p className={NOTE}>{t('survey:selectAll')}</p>
          <MultiChoice
            rows={channels}
            selected={q27}
            other={q27Other}
            onToggle={toggleQ27}
            onOther={setQ27Other}
            locale={locale}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q28')}</p>
          {q27.length === 0 ? (
            // Not disabled and not hidden. An empty question with no explanation
            // reads as a screen that has broken; this says what to do about it.
            <p className={NOTE}>{t('survey:c.q28Empty')}</p>
          ) : (
            <>
              <p className={NOTE}>{t('survey:c.q28Note')}</p>
              <MultiChoice
                rows={q28Rows}
                selected={q28}
                other={q28Other}
                onToggle={toggle(setQ28)}
                onOther={setQ28Other}
                locale={locale}
              />
            </>
          )}
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q29')}</p>
          <Choice
            value={q29}
            onChange={setQ29}
            options={Q29.map(([v, k]) => ({ value: v, label: t(`survey:opt.${k}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q30')}</p>
          <p className={NOTE}>{t('survey:c.q30Note')}</p>

          {/* The derived figure sits above the box and stays there whatever is
              typed. It is what the Municipality's own records count, and a
              coordinator reading this later needs both numbers to see the gap. */}
          <div className="mt-3 border-[1.5px] border-border-strong bg-sunken px-3 py-2">
            <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('survey:c.q30Records')}
            </span>
            <span className="ms-2 text-[15px] font-semibold text-ink" dir="ltr">
              {/* Null is "we could not count", not zero. A zero here would be a
                  claim that this person attended no markets. */}
              {derived == null
                ? prefill.isLoading
                  ? t('survey:c.q30Counting')
                  : t('survey:c.q30Unknown')
                : derived}
            </span>
          </div>

          <div className="mt-3">
            <NumberBox
              label={t('survey:c.q30Box')}
              value={q30}
              onChange={setQ30}
              invalid={q30Bad}
            />
          </div>

          {q30Bad ? (
            <p role="alert" className="mt-2 text-[13.5px] font-semibold text-error">
              {t('survey:c.q30Invalid')}
            </p>
          ) : null}

          {q30Differs ? (
            <div className="mt-3 border-s-[3px] border-warning ps-3">
              <p className="m-0 text-[13.5px] font-semibold leading-[1.45] text-ink">
                {t('survey:c.q30Gap', { records: derived, entered: typed })}
              </p>
              <p className="m-0 mt-1 text-[13px] leading-[1.45] text-muted">
                {t('survey:c.q30GapNote')}
              </p>
            </div>
          ) : null}
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q31')}</p>
          <Choice
            value={q31}
            onChange={setQ31}
            options={Q31.map((v) => ({ value: v, label: t(`survey:c.band.${v}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q32')}</p>
          <Choice
            value={q32}
            onChange={setQ32}
            options={Q32.map((v) => ({ value: v, label: t(`survey:c.q32opt.${v}`) }))}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q33')}</p>
          <p className={NOTE}>{t('survey:selectAll')}</p>
          <MultiChoice
            rows={improvements}
            selected={q33}
            other={q33Other}
            onToggle={toggle(setQ33)}
            onOther={setQ33Other}
            locale={locale}
          />
        </div>

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q34')}</p>
          <p className={NOTE}>{t('survey:c.q34Note')}</p>
          <Choice
            value={q34}
            onChange={setQ34}
            options={Q34.map((v) => ({ value: v, label: t(`survey:c.q34opt.${v}`) }))}
          />
        </div>

        {connected ? (
          <div className={CARD}>
            <p className={STEM}>{t('survey:c.q35')}</p>
            <p className={NOTE}>{t('survey:c.q35Note')}</p>
            <BuyerBlocks
              buyers={buyers}
              types={buyerTypes}
              onSet={(i, patch) =>
                setBuyers((c) => c.map((b, j) => (j === i ? { ...b, ...patch } : b)))
              }
              onAdd={() => setBuyers((c) => [...c, { ...EMPTY_BUYER }])}
              onRemove={(i) => setBuyers((c) => c.filter((_, j) => j !== i))}
              locale={locale}
            />
            {incompleteBuyers > 0 ? (
              <p role="alert" className="mt-3 text-[13.5px] font-semibold text-warning">
                {t('survey:c.q35Incomplete', { count: incompleteBuyers })}
              </p>
            ) : null}
          </div>
        ) : q34 === 'no' && d.buyers.length > 0 ? (
          // Saying 'no' after buyers were recorded deletes them. Said before the
          // save, not after, because after it there is nothing left to warn about.
          <div className={CARD}>
            <p role="alert" className="m-0 text-[13.5px] font-semibold leading-[1.5] text-warning">
              {t('survey:c.q35WillClear', { count: d.buyers.length })}
            </p>
          </div>
        ) : null}

        <div className={CARD}>
          <p className={STEM}>{t('survey:c.q36')}</p>
          <p className={NOTE}>{t('survey:selectAll')}</p>
          <MultiChoice
            rows={barriers}
            selected={q36}
            other={q36Other}
            onToggle={toggle(setQ36)}
            onOther={setQ36Other}
            locale={locale}
          />
        </div>

        {refusal ? (
          <div role="alert" className="mt-4 bg-error px-[18px] py-[14px] text-bg">
            <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">
              {t('survey:c.notSaved')}
            </div>
            <p className="m-0 mt-1 max-w-[62ch] text-[15px] font-medium leading-[1.5]">
              {t(`survey:c.refused.${refusal}`, { defaultValue: t('survey:c.refused.invalid') })}
            </p>
          </div>
        ) : null}

        {save.isError ? (
          <p role="alert" className="mt-4 text-[14px] font-semibold text-error">
            {t('survey:c.saveFailed')}
          </p>
        ) : null}

        <div className="mt-6 border-t-[3px] border-ink pt-4">
          <p className="m-0 mb-3 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
            {t('survey:c.savesNote')}
          </p>
          <button
            type="submit"
            disabled={save.isPending || blocked}
            className="inline-flex min-h-12 w-full items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint sm:w-auto"
          >
            {save.isPending ? t('survey:c.saving') : t('survey:c.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export default FollowupSectionC
