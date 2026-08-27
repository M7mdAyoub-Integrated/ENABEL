import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useInitiativesForPerson,
  useLinkageRequest,
  useMatchLinkageRequest,
  useMatchablePartnerships,
  useSetLinkageStatus,
  useSetRequestStatus,
  useSiblingRequests,
  type InitiativeRow,
  type LinkStatus,
  type MatchOutcome,
} from '../data/linkage'
import {
  useIndicatorRows,
  useReportingPeriods,
  currentPeriodCode,
  actualText,
} from '../data/indicators'
import { BackLink, EmptyState, PageHead, SectionRule } from '../ui/primitives'
import { useToast } from '../ui/Toast'
import { formatShortDate } from '../lib/format'
import { SEP } from '../ui/glyphs'
import { StatusBadge } from './LinkageQueue'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Matching a linkage request.
 *
 *  ── THE ONE DECISION THIS SCREEN EXISTS FOR ──
 *
 *  Attach to an existing initiative, or create a new one.
 *
 *  C1.2 counts distinct initiatives that have a linkage. Attaching adds a
 *  linkage to something already counted; creating adds a new countable thing.
 *  Both are legitimate -- one person can genuinely run two ventures -- and
 *  nothing downstream can tell a real second venture from a coordinator who
 *  did not notice the first one.
 *
 *  So: attach is the DEFAULT wherever an initiative exists, and creating a new
 *  one is a deliberate click whose consequence is written next to it in plain
 *  words. The default is a convenience. The protection is `match_linkage_request`
 *  (0067), which refuses to create a second initiative unless it is told to in
 *  so many words -- and this screen surfaces that refusal rather than retrying
 *  with the flag set. If it ever did, the protection would be gone.
 *
 *  ── WHY THE LIVE C1.2 IS ON THIS SCREEN ──
 *
 *  A match creates a linkage at `proposed`, and C1.2 counts only `active` and
 *  `ended`. So matching moves nothing, and a coordinator who assumed otherwise
 *  would be wrong in a way nothing corrects.
 *
 *  Saying so in a sentence is the weak version -- it is a claim about a view
 *  this screen does not read, and CLAUDE.md has four instances of exactly that
 *  going stale. So the figure itself is read from `v_indicator_progress` and
 *  shown before and after. If the rule ever changes, the number moves and the
 *  screen is still right.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const NEW_INITIATIVE = '__new__'

const LINK_TONE: Record<LinkStatus, string> = {
  proposed: 'border-warning text-warning',
  under_review: 'border-warning text-warning',
  active: 'border-success text-success',
  ended: 'border-border-strong text-muted',
}

function LinkChip({ status }: { status: LinkStatus }) {
  const { t } = useTranslation('forms')
  return (
    <span
      className={`inline-block whitespace-nowrap border-[1.5px] px-2 py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] ${LINK_TONE[status]}`}
    >
      {t(`linkageAdmin.linkStatus.${status}`)}
    </span>
  )
}

/** One initiative in the attach list, with the linkages it already carries. */
function InitiativeOption({
  init,
  selected,
  onSelect,
  locale,
}: {
  init: InitiativeRow
  selected: boolean
  onSelect: () => void
  locale: string
}) {
  const { t } = useTranslation('forms')
  return (
    <label
      className={`mt-2 flex cursor-pointer gap-3 border-[1.5px] p-3 ${
        selected ? 'border-ink bg-sunken' : 'border-border-default hover:bg-sunken'
      }`}
    >
      <input
        type="radio"
        name="initiative"
        className="mt-1 h-4 w-4 flex-none accent-[currentColor]"
        checked={selected}
        onChange={onSelect}
      />
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block font-semibold text-ink">
          {init.title}
        </span>
        <span dir="auto" className="mt-0.5 block text-[13px] text-muted">
          {locale.startsWith('ar') ? init.activityLabelAr : init.activityLabelEn}
          {init.mainProduct ? ` · ${init.mainProduct}` : ''}
        </span>
        {init.linkages.length === 0 ? (
          <span className="mt-1.5 block text-[13px] text-muted">
            {t('linkageAdmin.noLinkagesYet')}
          </span>
        ) : (
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            {init.linkages.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5">
                <LinkChip status={l.status} />
                <span dir="auto" className="text-[13px] text-muted">
                  {l.partnerName}
                </span>
              </span>
            ))}
          </span>
        )}
      </span>
    </label>
  )
}

export function LinkageMatch() {
  const { id } = useParams()
  const { t, i18n } = useTranslation(['forms', 'indicators'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const q = useLinkageRequest(id)
  const req = q.data

  const initiatives = useInitiativesForPerson(req?.personId)
  const siblings = useSiblingRequests(req?.personId, id)
  const partnerships = useMatchablePartnerships()

  const periods = useReportingPeriods()
  const periodCode = currentPeriodCode(periods.data ?? [])
  const indicators = useIndicatorRows(periodCode)
  const c12 = (indicators.data ?? []).find((r) => r.code === 'C1.2')

  const match = useMatchLinkageRequest()
  const setStatus = useSetRequestStatus()
  const setLinkStatus = useSetLinkageStatus()

  const [initiativeChoice, setInitiativeChoice] = useState<string | null>(null)
  const [partnershipId, setPartnershipId] = useState('')
  const [scope, setScope] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [closing, setClosing] = useState(false)
  const [closedReason, setClosedReason] = useState('')
  const [refusal, setRefusal] = useState<MatchOutcome | null>(null)

  if (q.isLoading) {
    return (
      <div aria-hidden="true" className="pt-6">
        <div className="h-10 w-72 animate-pulse bg-track" />
        <div className="mt-6 h-72 animate-pulse bg-track" />
      </div>
    )
  }

  if (q.isError || !req) {
    return (
      <EmptyState
        heading
        title={t('forms:linkageAdmin.notFoundTitle')}
        description={t('forms:linkageAdmin.notFoundBody')}
      />
    )
  }

  const existing = initiatives.data ?? []
  // Attach is the default the moment there is anything to attach to. The
  // selection is only defaulted once the list has actually arrived -- defaulting
  // to "create new" while it loads would make the safe option the one a fast
  // click misses.
  const choice =
    initiativeChoice ?? (existing.length > 0 ? (existing[0]?.id ?? NEW_INITIATIVE) : NEW_INITIATIVE)
  const creatingNew = choice === NEW_INITIATIVE
  const canMatch = !!partnershipId && !!scope.trim() && !match.isPending
  const open = req.status === 'submitted' || req.status === 'under_review'

  async function runMatch() {
    if (!req) return
    setRefusal(null)
    const res = await match.mutateAsync({
      requestId: req.id,
      partnershipId,
      scope,
      // Exactly one of these two is ever sent. `createNewInitiative` is set
      // only because a coordinator selected "a new initiative" above -- it is
      // never passed to get past a refusal.
      ...(creatingNew ? { createNewInitiative: true } : { initiativeId: choice }),
      ...(reviewNote.trim() ? { reviewNote } : {}),
    })
    if (res.result === 'matched') {
      toast.fire({
        tag: t('forms:linkageAdmin.eyebrow'),
        title: res.initiative_created
          ? t('forms:linkageAdmin.toastMatchedNew')
          : t('forms:linkageAdmin.toastMatchedAttached'),
        sub: t('forms:linkageAdmin.toastProposed'),
        tone: 'ok',
      })
    } else {
      // The database refused. Say what it said -- never retry it differently.
      setRefusal(res.result)
    }
  }

  const matchedLinkage = existing
    .flatMap((i) => i.linkages)
    .find((l) => l.id === req.matchedLinkageId)

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate('/linkage-requests')}>{t('forms:linkageAdmin.backToQueue')}</BackLink>}
        eyebrow={t('forms:linkageAdmin.eyebrow')}
        chips={<StatusBadge status={req.status} />}
        title={req.initiativeTitle}
        size="md"
      />

      {/* ── who asked, and for what ─────────────────────────────────────── */}
      <div className="border-[1.5px] border-ink p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span dir="auto" className="text-[19px] font-extrabold tracking-[-0.02em]">
            {req.personName}
          </span>
          <span dir="ltr" className="font-narrow text-[13px] tracking-[0.08em] text-muted">
            {req.nationalId}
          </span>
          {req.village ? (
            <span dir="auto" className="text-[14px] text-muted">
              {req.village}
            </span>
          ) : null}
          {req.phone ? (
            <span dir="ltr" className="text-[14px] text-muted">
              {req.phone}
            </span>
          ) : null}
        </div>

        <dl className="mt-4 border-t border-border-default pt-3">
          <div className="py-1">
            <dt className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('forms:linkageAdmin.theyProduce')}
            </dt>
            <dd dir="auto" className="mt-0.5 text-[15px] text-ink">
              {locale.startsWith('ar') ? req.activityLabelAr : req.activityLabelEn}
              {req.mainProduct ? ` · ${req.mainProduct}` : ''}
            </dd>
          </div>
          <div className="py-1">
            <dt className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('forms:linkageAdmin.theyAskedFor')}
            </dt>
            <dd dir="auto" className="mt-0.5 whitespace-pre-line text-[15px] leading-[1.55] text-body">
              {req.request}
            </dd>
          </div>
          <div className="py-1">
            <dt className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
              {t('forms:linkageAdmin.asked')}
            </dt>
            <dd className="mt-0.5 text-[15px] text-ink">
              {formatShortDate(req.requestedOn, locale)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ── their other requests, so the same need is not matched twice ── */}
      {(siblings.data ?? []).length > 0 ? (
        <div className="mt-4 border-s-[3px] border-warning bg-sunken p-3">
          <p className="m-0 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-warning">
            {t('forms:linkageAdmin.otherRequests', { count: (siblings.data ?? []).length })}
          </p>
          <ul className="mt-2 list-none p-0">
            {(siblings.data ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-1">
                <StatusBadge status={s.status} />
                <button
                  type="button"
                  dir="auto"
                  onClick={() => navigate(`/linkage-requests/${s.id}`)}
                  className="text-[14px] text-ink underline hover:text-muted"
                >
                  {s.initiativeTitle}
                </button>
                <span className="text-[13px] text-muted">
                  {formatShortDate(s.requestedOn, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── already matched ─────────────────────────────────────────────── */}
      {req.status === 'matched' ? (
        <section className="mt-8">
          <SectionRule title={t('forms:linkageAdmin.theMatch')} />
          <div className="mt-4 border-[1.5px] border-ink p-4 sm:p-5">
            <p className="m-0 text-[15px] leading-[1.55] text-body">
              {req.matchedInitiativeId && existing.some((i) => i.id === req.matchedInitiativeId)
                ? t('forms:linkageAdmin.matchedInto', {
                    title: existing.find((i) => i.id === req.matchedInitiativeId)?.title ?? '',
                  })
                : t('forms:linkageAdmin.matchedPlain')}
            </p>

            {matchedLinkage ? (
              <div className="mt-4 border-t border-border-default pt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <LinkChip status={matchedLinkage.status} />
                  <span dir="auto" className="text-[15px] font-semibold text-ink">
                    {matchedLinkage.partnerName}
                  </span>
                  <span dir="auto" className="text-[14px] text-muted">
                    {matchedLinkage.scope}
                  </span>
                </div>

                {/* The status move that actually changes the indicator. It is
                    here because this is where a coordinator is standing when
                    the introduction becomes a trading relationship. */}
                <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.55] text-muted">
                  {t('forms:linkageAdmin.advanceExplain')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['proposed', 'under_review', 'active', 'ended'] as LinkStatus[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={s === matchedLinkage.status || setLinkStatus.isPending}
                      onClick={() =>
                        setLinkStatus.mutate(
                          { id: matchedLinkage.id, status: s },
                          {
                            onSuccess: () =>
                              toast.fire({
                                tag: t('forms:linkageAdmin.eyebrow'),
                                title: t('forms:linkageAdmin.toastLinkStatus', {
                                  status: t(`forms:linkageAdmin.linkStatus.${s}`),
                                }),
                                tone: 'ok',
                              }),
                          },
                        )
                      }
                      className="min-h-11 border-[1.5px] border-border-strong px-3 font-narrow text-[12px] font-bold uppercase tracking-[0.1em] text-ink hover:bg-sunken disabled:border-ink disabled:bg-ink disabled:text-bg"
                    >
                      {t(`forms:linkageAdmin.linkStatus.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* The live figure, not a claim about it. */}
            <p className="mt-4 border-t border-border-default pt-3 text-[14px] text-muted">
              {t('forms:linkageAdmin.c12Live', {
                period: periodCode ?? '',
                value: c12 ? actualText(c12, t('indicators:noValue')) : '—',
              })}
            </p>
          </div>
        </section>
      ) : null}

      {/* ── the match form ──────────────────────────────────────────────── */}
      {open ? (
        <section className="mt-8">
          <SectionRule title={t('forms:linkageAdmin.matchIt')} />

          <form
            className="mt-4 border-[1.5px] border-ink p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (canMatch) void runMatch()
            }}
          >
            {/* ── the initiative choice ─────────────────────────────────── */}
            <fieldset className="border-0 p-0">
              <legend className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:linkageAdmin.whichInitiative')}
              </legend>

              {initiatives.isLoading ? (
                <div aria-hidden="true" className="mt-2 h-20 animate-pulse bg-track" />
              ) : existing.length === 0 ? (
                <p className="mt-2 text-[14px] leading-[1.55] text-muted">
                  {t('forms:linkageAdmin.noInitiativeYet')}
                </p>
              ) : (
                <>
                  <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
                    {t('forms:linkageAdmin.attachExplain')}
                  </p>
                  {existing.map((init) => (
                    <InitiativeOption
                      key={init.id}
                      init={init}
                      locale={locale}
                      selected={choice === init.id}
                      onSelect={() => setInitiativeChoice(init.id)}
                    />
                  ))}

                  {/* The deliberate choice, with its consequence stated on it
                      rather than in a tooltip or a confirmation nobody reads. */}
                  <label
                    className={`mt-2 flex cursor-pointer gap-3 border-[1.5px] p-3 ${
                      creatingNew ? 'border-warning bg-sunken' : 'border-dashed border-border-strong hover:bg-sunken'
                    }`}
                  >
                    <input
                      type="radio"
                      name="initiative"
                      className="mt-1 h-4 w-4 flex-none"
                      checked={creatingNew}
                      onChange={() => setInitiativeChoice(NEW_INITIATIVE)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {t('forms:linkageAdmin.createNew')}
                      </span>
                      <span dir="auto" className="mt-0.5 block text-[13px] text-muted">
                        {t('forms:linkageAdmin.createNewFrom', { title: req.initiativeTitle })}
                      </span>
                      <span className="mt-1.5 block text-[13.5px] font-semibold leading-[1.5] text-warning">
                        {t('forms:linkageAdmin.createNewConsequence')}
                      </span>
                    </span>
                  </label>
                </>
              )}
            </fieldset>

            {/* ── the partner ───────────────────────────────────────────── */}
            <label className="mt-5 block">
              <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:linkageAdmin.partner')}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                {t('forms:linkageAdmin.partnerHint')}
              </span>
              <select
                className="mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
                value={partnershipId}
                disabled={partnerships.isLoading}
                onChange={(e) => setPartnershipId(e.target.value)}
              >
                <option value="">{t('forms:linkageAdmin.choosePartner')}</option>
                {(partnerships.data ?? []).map((p) => (
                  // Built as one string rather than as JSX children: an
                  // <option> renders text only, and the type is part of the
                  // label rather than decoration -- a coordinator choosing a
                  // training partner for a market linkage should be able to
                  // see that is what they are doing. See OQ-29.
                  <option key={p.id} value={p.id}>
                    {[
                      p.unit ? `${p.partnerName} — ${p.unit}` : p.partnerName,
                      t(`linkageAdmin.partnershipType.${p.partnershipType}`, { ns: 'forms' }),
                      ...(p.isActive ? [] : [t('forms:linkageAdmin.partnershipEnded')]),
                    ].join(` ${SEP} `)}
                  </option>
                ))}
              </select>
            </label>

            {/* ── what the linkage covers ───────────────────────────────── */}
            <label className="mt-4 block">
              <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:linkageAdmin.scope')}
              </span>
              <span className="mt-0.5 block text-[13px] text-muted">
                {t('forms:linkageAdmin.scopeHint')}
              </span>
              <input
                dir="auto"
                className="mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              />
            </label>

            <label className="mt-4 block">
              <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                {t('forms:linkageAdmin.reviewNote')}
              </span>
              <textarea
                dir="auto"
                rows={3}
                className="mt-1.5 block min-h-24 w-full border-[1.5px] border-border-strong bg-bg px-3 py-2 text-[16px] leading-[1.5] text-ink focus:border-ink focus:outline-none"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </label>

            {/* What matching does and does not do, with the real number. */}
            <p className="mt-4 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.55] text-body">
              {t('forms:linkageAdmin.proposedExplain')}{' '}
              <strong>
                {t('forms:linkageAdmin.c12Live', {
                  period: periodCode ?? '',
                  value: c12 ? actualText(c12, t('indicators:noValue')) : '—',
                })}
              </strong>
            </p>

            {refusal ? (
              <p
                role="alert"
                className="mt-3 border-[1.5px] border-error bg-sunken p-3 text-[14px] font-semibold leading-[1.55] text-error"
              >
                {t(`forms:linkageAdmin.refused.${refusal}`)}
              </p>
            ) : null}

            {match.isError ? (
              <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
                {t('forms:linkageAdmin.matchFailed')}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={!canMatch}
                className="inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
              >
                {match.isPending ? t('forms:linkageAdmin.matching') : t('forms:linkageAdmin.match')}
              </button>

              {req.status === 'submitted' ? (
                <button
                  type="button"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ id: req.id, status: 'under_review' })}
                  className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink"
                >
                  {t('forms:linkageAdmin.markUnderReview')}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setClosing((v) => !v)}
                className="inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-muted px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-muted"
              >
                {t('forms:linkageAdmin.closeIt')}
              </button>
            </div>
          </form>

          {/* ── closing, which is an outcome and not a delete ───────────── */}
          {closing ? (
            <div className="mt-4 border-[1.5px] border-border-strong p-4 sm:p-5">
              <p className="m-0 text-[15px] font-extrabold tracking-[-0.02em]">
                {t('forms:linkageAdmin.closeTitle')}
              </p>
              <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.55] text-body">
                {t('forms:linkageAdmin.closeBody')}
              </p>
              <label className="mt-4 block">
                <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                  {t('forms:linkageAdmin.closedReason')}
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t('forms:linkageAdmin.closedReasonHint')}
                </span>
                <textarea
                  dir="auto"
                  rows={3}
                  className="mt-1.5 block min-h-24 w-full border-[1.5px] border-border-strong bg-bg px-3 py-2 text-[16px] leading-[1.5] text-ink focus:border-ink focus:outline-none"
                  value={closedReason}
                  onChange={(e) => setClosedReason(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={!closedReason.trim() || setStatus.isPending}
                onClick={() =>
                  setStatus.mutate(
                    { id: req.id, status: 'closed', closedReason },
                    {
                      onSuccess: () => {
                        setClosing(false)
                        toast.fire({
                          tag: t('forms:linkageAdmin.eyebrow'),
                          title: t('forms:linkageAdmin.toastClosed'),
                          tone: 'ok',
                        })
                      },
                    },
                  )
                }
                className="mt-4 inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
              >
                {t('forms:linkageAdmin.confirmClose')}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── closed ──────────────────────────────────────────────────────── */}
      {req.status === 'closed' ? (
        <section className="mt-8">
          <SectionRule title={t('forms:linkageAdmin.closedTitle')} />
          <div className="mt-4 border-[1.5px] border-border-strong p-4 sm:p-5">
            <p dir="auto" className="m-0 whitespace-pre-line text-[15px] leading-[1.55] text-body">
              {req.closedReason}
            </p>
            <p className="mt-3 text-[14px] text-muted">{t('forms:linkageAdmin.closedNote')}</p>
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate({ id: req.id, status: 'submitted' })}
              className="mt-4 inline-flex min-h-12 items-center justify-center border-[1.5px] border-border-strong px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-ink"
            >
              {t('forms:linkageAdmin.reopen')}
            </button>
          </div>
        </section>
      ) : null}

      {req.reviewNote ? (
        <p dir="auto" className="mt-6 max-w-[62ch] whitespace-pre-line text-[14px] leading-[1.55] text-muted">
          <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em]">
            {t('forms:linkageAdmin.reviewNote')}
          </span>
          <br />
          {req.reviewNote}
        </p>
      ) : null}
    </>
  )
}

export default LinkageMatch
