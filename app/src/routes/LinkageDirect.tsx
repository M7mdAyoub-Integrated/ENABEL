import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePersonByNationalId } from '../data/completions'
import { useActivityTypes, labelOf, normaliseNationalId, isCompleteNationalId } from '../data/apply'
import {
  useCreateDirectLinkage,
  useInitiativesForPerson,
  useMatchablePartnerships,
  type DirectOutcome,
} from '../data/linkage'
import { BackLink, PageHead, SectionRule } from '../ui/primitives'
import { useToast } from '../ui/Toast'
import { SEP } from '../ui/glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Record a linkage the Municipality brokered in person.
 *
 *  ── WHY THIS EXISTS ──
 *
 *  Until 0073 the only way into C1.2 was: a producer finds the public website,
 *  submits a linkage request, and a coordinator matches it. Every other way a
 *  linkage actually happens -- a partner mentions a buyer at a meeting, someone
 *  makes an introduction at a market -- had nowhere to go.
 *
 *  That is most of them, and it means the indicator under-reports exactly the
 *  work staff do well.
 *
 *  ── IT IS THE SAME RULES, NOT SIMILAR ONES ──
 *
 *  `create_direct_linkage` and `match_linkage_request` both call
 *  `attach_or_create_linkage`, so the refusal that protects C1.2 from a
 *  duplicate initiative is one rule in one place. This screen therefore behaves
 *  exactly like the match screen on the choice that matters: attach is the
 *  default wherever an initiative exists, creating a new one is a deliberate
 *  click with its consequence written next to it, and the refusal is surfaced
 *  rather than retried with the flag set.
 *
 *  ── NO ADVISORY GATE HERE, DELIBERATELY ──
 *
 *  A public REQUEST requires a completed advisory -- that trigger is about who
 *  may ask. This is a record of something that already happened, and refusing
 *  to write it down because the paperwork ran the other way would lose real
 *  programme activity. The screen says so, so nobody reads its absence as a
 *  bug.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const NEW_INITIATIVE = '__new__'

const INPUT =
  'mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] ' +
  'text-ink focus:border-ink focus:outline-none'

const LABEL = 'font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted'

export function LinkageDirect() {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()

  const [nid, setNid] = useState('')
  const [partnershipId, setPartnershipId] = useState('')
  const [scope, setScope] = useState('')
  const [note, setNote] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [activityTypeId, setActivityTypeId] = useState('')
  const [mainProduct, setMainProduct] = useState('')
  const [refusal, setRefusal] = useState<DirectOutcome | null>(null)

  const person = usePersonByNationalId(nid)
  const initiatives = useInitiativesForPerson(person.data?.id)
  const partnerships = useMatchablePartnerships()
  const activityTypes = useActivityTypes(true)
  const create = useCreateDirectLinkage()

  const existing = initiatives.data ?? []
  // Attach is the default the moment there is something to attach to, and only
  // once the list has actually arrived -- defaulting while it loads would make
  // the safe option the one a fast click misses.
  const effective =
    choice ?? (existing.length > 0 ? (existing[0]?.id ?? NEW_INITIATIVE) : NEW_INITIATIVE)
  const creatingNew = effective === NEW_INITIATIVE

  const ready =
    !!person.data &&
    !!partnershipId &&
    !!scope.trim() &&
    (!creatingNew || (!!title.trim() && !!activityTypeId)) &&
    !create.isPending

  async function submit() {
    if (!person.data) return
    setRefusal(null)
    const res = await create.mutateAsync({
      nationalId: nid,
      partnershipId,
      scope,
      // Exactly one of these is ever sent, and createNewInitiative is set only
      // because someone selected it above -- never to get past a refusal.
      ...(creatingNew
        ? {
            createNewInitiative: true,
            initiativeTitle: title,
            activityTypeId,
            ...(mainProduct.trim() ? { mainProduct } : {}),
          }
        : { initiativeId: effective }),
      ...(note.trim() ? { note } : {}),
    })
    if (res.result === 'linked') {
      toast.fire({
        tag: t('forms:linkageAdmin.eyebrow'),
        title: res.initiative_created
          ? t('forms:linkageAdmin.toastMatchedNew')
          : t('forms:linkageAdmin.toastMatchedAttached'),
        sub: t('forms:linkageAdmin.toastProposed'),
        tone: 'ok',
      })
      navigate('/linkage-requests')
      return
    }
    setRefusal(res.result)
  }

  return (
    <>
      <PageHead
        back={
          <BackLink onClick={() => navigate('/linkage-requests')}>
            {t('forms:linkageAdmin.backToQueue')}
          </BackLink>
        }
        eyebrow={t('forms:linkageAdmin.eyebrow')}
        title={t('forms:linkageDirect.title')}
        description={t('forms:linkageDirect.intro')}
        size="md"
      />

      <p className="max-w-[62ch] border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.55] text-body">
        {t('forms:linkageDirect.noGateNote')}
      </p>

      <form
        className="mt-6 border-[1.5px] border-ink p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) void submit()
        }}
      >
        <label className="block">
          <span className={LABEL}>{t('forms:linkageDirect.nationalId')}</span>
          <span className="mt-0.5 block text-[13px] text-muted">
            {t('forms:linkageDirect.nationalIdHint')}
          </span>
          <input
            className={INPUT}
            inputMode="numeric"
            dir="ltr"
            autoComplete="off"
            value={nid}
            onChange={(e) => {
              setNid(normaliseNationalId(e.target.value))
              setChoice(null)
            }}
          />
        </label>

        {isCompleteNationalId(nid) ? (
          person.isLoading ? (
            <div aria-hidden="true" className="mt-3 h-12 animate-pulse bg-track" />
          ) : person.data ? (
            <p dir="auto" className="mt-3 border-s-[3px] border-success bg-sunken p-3 text-[15px] text-body">
              {person.data.fullName}
            </p>
          ) : (
            <p
              role="alert"
              className="mt-3 border-[1.5px] border-error bg-sunken p-3 text-[14px] font-semibold text-error"
            >
              {t('forms:linkageDirect.notFound')}
            </p>
          )
        ) : null}

        {person.data ? (
          <>
            <section className="mt-6">
              <SectionRule title={t('forms:linkageAdmin.whichInitiative')} />
              {existing.length === 0 ? (
                <p className="mt-3 text-[14px] leading-[1.55] text-muted">
                  {t('forms:linkageAdmin.noInitiativeYet')}
                </p>
              ) : (
                <>
                  <p className="mt-3 max-w-[62ch] text-[13.5px] leading-[1.55] text-muted">
                    {t('forms:linkageAdmin.attachExplain')}
                  </p>
                  {existing.map((init) => (
                    <label
                      key={init.id}
                      className={`mt-2 flex cursor-pointer gap-3 border-[1.5px] p-3 ${
                        effective === init.id
                          ? 'border-ink bg-sunken'
                          : 'border-border-default hover:bg-sunken'
                      }`}
                    >
                      <input
                        type="radio"
                        name="initiative"
                        className="mt-1 h-4 w-4 flex-none"
                        checked={effective === init.id}
                        onChange={() => setChoice(init.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span dir="auto" className="block font-semibold text-ink">
                          {init.title}
                        </span>
                        <span dir="auto" className="mt-0.5 block text-[13px] text-muted">
                          {locale.startsWith('ar') ? init.activityLabelAr : init.activityLabelEn}
                          {init.linkages.length
                            ? ` ${SEP} ${t('forms:linkageDirect.linkageCount', { count: init.linkages.length })}`
                            : ` ${SEP} ${t('forms:linkageAdmin.noLinkagesYet')}`}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label
                    className={`mt-2 flex cursor-pointer gap-3 border-[1.5px] p-3 ${
                      creatingNew
                        ? 'border-warning bg-sunken'
                        : 'border-dashed border-border-strong hover:bg-sunken'
                    }`}
                  >
                    <input
                      type="radio"
                      name="initiative"
                      className="mt-1 h-4 w-4 flex-none"
                      checked={creatingNew}
                      onChange={() => setChoice(NEW_INITIATIVE)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {t('forms:linkageAdmin.createNew')}
                      </span>
                      <span className="mt-1.5 block text-[13.5px] font-semibold leading-[1.5] text-warning">
                        {t('forms:linkageAdmin.createNewConsequence')}
                      </span>
                    </span>
                  </label>
                </>
              )}

              {creatingNew ? (
                <div className="mt-4 border-s-[3px] border-border-strong ps-4">
                  <label className="block">
                    <span className={LABEL}>{t('forms:linkageDirect.initiativeTitle')}</span>
                    <input
                      className={INPUT}
                      dir="auto"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </label>
                  <label className="mt-4 block">
                    <span className={LABEL}>{t('forms:linkageDirect.activityType')}</span>
                    <select
                      className={INPUT}
                      value={activityTypeId}
                      disabled={activityTypes.isLoading}
                      onChange={(e) => setActivityTypeId(e.target.value)}
                    >
                      <option value="">{t('forms:linkageAdmin.choosePartner')}</option>
                      {(activityTypes.data ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {labelOf(a, locale)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="mt-4 block">
                    <span className={LABEL}>{t('forms:linkageDirect.mainProduct')}</span>
                    <input
                      className={INPUT}
                      dir="auto"
                      value={mainProduct}
                      onChange={(e) => setMainProduct(e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </section>

            <section className="mt-6">
              <SectionRule title={t('forms:linkageDirect.theLinkage')} />
              <label className="mt-4 block">
                <span className={LABEL}>{t('forms:linkageAdmin.partner')}</span>
                <select
                  className={INPUT}
                  value={partnershipId}
                  disabled={partnerships.isLoading}
                  onChange={(e) => setPartnershipId(e.target.value)}
                >
                  <option value="">{t('forms:linkageAdmin.choosePartner')}</option>
                  {(partnerships.data ?? []).map((p) => (
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

              <label className="mt-4 block">
                <span className={LABEL}>{t('forms:linkageAdmin.scope')}</span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t('forms:linkageAdmin.scopeHint')}
                </span>
                <input
                  className={INPUT}
                  dir="auto"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </label>

              <label className="mt-4 block">
                <span className={LABEL}>{t('forms:linkageDirect.note')}</span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t('forms:linkageDirect.noteHint')}
                </span>
                <textarea
                  className={`${INPUT} min-h-24 py-2 leading-[1.5]`}
                  dir="auto"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </section>

            <p className="mt-5 border-s-[3px] border-ink bg-sunken p-3 text-[14px] leading-[1.55] text-body">
              {t('forms:linkageAdmin.proposedExplain')}
            </p>
          </>
        ) : null}

        {refusal ? (
          <p
            role="alert"
            className="mt-4 border-[1.5px] border-error bg-sunken p-3 text-[14px] font-semibold leading-[1.55] text-error"
          >
            {t(`forms:linkageDirect.refused.${refusal}`, {
              defaultValue: t(`forms:linkageAdmin.refused.${refusal}`, { defaultValue: refusal }),
            })}
          </p>
        ) : null}

        {create.isError ? (
          <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
            {t('forms:linkageAdmin.matchFailed')}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!ready}
          className="mt-6 inline-flex min-h-12 items-center justify-center bg-ink px-6 font-narrow text-[13px] font-bold uppercase tracking-[0.12em] text-bg disabled:cursor-not-allowed disabled:bg-track disabled:text-faint"
        >
          {create.isPending
            ? t('forms:linkageAdmin.matching')
            : t('forms:linkageDirect.record')}
        </button>
      </form>
    </>
  )
}

export default LinkageDirect
