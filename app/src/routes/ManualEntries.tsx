import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useMilestones,
  useSetMilestone,
  usePromotionalActions,
  usePromotionalChannels,
  useCoordinationMeetings,
  useCaseStudies,
  useCreateManualRecord,
  useWithdrawManualRecord,
} from '../data/manualEntries'
import { formatShortDate } from '../lib/format'
import { AccentRule, PageHead, SectionRule } from '../ui/primitives'
import { EvidencePanel } from '../components/EvidencePanel'
import { usePartnershipOptions } from '../data/partnerships'
import { useInitiatives } from '../data/initiatives'
import { usePersonByNationalId, isCompleteNationalId } from '../data/completions'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The indicators with no data-collection form behind them.
 *
 *  ── WHY THERE IS NOT A COLUMN OF NUMBER FIELDS ──
 *
 *  Every indicator here counts ROWS. `v_ind_f0_1` counts promotional_action
 *  rows; `v_ind_g0_2` counts coordination_meeting rows. There is no override
 *  column in the schema, so a number field would either invent rows or store a
 *  figure nothing reads.
 *
 *  It would also discard what the donor return needs. "Five promotional
 *  actions" cannot be reported; five titled actions with dates and channels
 *  can. So each of these is a short record log.
 *
 *  ── THE ONES THAT ARE NOT ON THIS SCREEN ──
 *
 *  B1.2 and D0.1 count DISTINCT PEOPLE. A number field for either is a way to
 *  be wrong and never find out: enter 20 twice and the indicator reads 40 for
 *  what may be the same 20 people, and it cannot be de-duplicated later because
 *  the identities were never captured. Both need a national ID.
 *
 *  C1.3 and G0.4 are here for a different reason, and this comment used to give
 *  the wrong one -- it said C1.3 counted distinct people too. `v_ind_c1_3` is
 *  `count(ms.id)`: it counts SESSIONS. What keeps it off this screen is that
 *  `initiative_id` is NOT NULL, so there is a parent to choose before any field
 *  means anything. G0.4 is the same with a partnership.
 *
 *  They appear below as rows that say where they are entered instead, because
 *  omitting them silently would leave a coordinator hunting for them here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const INPUT =
  'block w-full min-h-11 border-[1.5px] border-border-strong bg-bg px-3 text-[15px] text-ink ' +
  'focus:border-ink focus:outline-none'

const today = () => new Date().toISOString().slice(0, 10)

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

function IndicatorTag({ code }: { code: string }) {
  return (
    <span className="inline-block bg-ink px-2 py-[2px] font-narrow text-[11px] font-bold tracking-[0.08em] text-bg">
      {code}
    </span>
  )
}

/* ── B1.1 and G0.1: the only genuine toggles ─────────────────────────────── */

function Milestones() {
  const { t, i18n } = useTranslation('indicators')
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = useMilestones()
  const set = useSetMilestone()
  const [dates, setDates] = useState<Record<string, string>>({})

  if (q.isLoading) return <div aria-hidden="true" className="h-24 animate-pulse bg-track" />
  if (q.isError)
    return (
      <p role="alert" className="border-[1.5px] border-error p-4 text-[15px]">
        {t('manual.loadFailed')}
      </p>
    )

  return (
    <div className="flex flex-col gap-3">
      {(q.data ?? []).map((m) => (
        <div key={m.id} className="border-[1.5px] border-border-strong p-4">
          <div className="flex flex-wrap items-center gap-2">
            <IndicatorTag code={m.code} />
            <span dir="auto" className="text-[15px] font-semibold text-ink">
              {m.name}
            </span>
          </div>

          {m.is_achieved ? (
            <div className="mt-3">
              <p className="m-0 text-[14px] text-body">
                {t('manual.achievedOn', {
                  date: m.achieved_on ? formatShortDate(m.achieved_on, locale) : '',
                })}
              </p>
              <button
                type="button"
                disabled={set.isPending}
                onClick={() => set.mutate({ id: m.id, achieved: false, achievedOn: null })}
                className="mt-2 min-h-10 border-[1.5px] border-border-strong px-3 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink"
              >
                {t('manual.notAchievedYet')}
              </button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              {/* The date decides which QUARTER the milestone lands in, so it is
                  asked for rather than assumed to be today. Achieved in March
                  and recorded in July still belongs to March. */}
              <div className="min-w-[190px]">
                <Field label={t('manual.achievedOnLabel')}>
                  <input
                    type="date"
                    dir="ltr"
                    className={INPUT}
                    max={today()}
                    value={dates[m.id] ?? ''}
                    onChange={(e) => setDates((d) => ({ ...d, [m.id]: e.target.value }))}
                  />
                </Field>
              </div>
              <button
                type="button"
                disabled={set.isPending || !dates[m.id]}
                onClick={() =>
                  set.mutate({ id: m.id, achieved: true, achievedOn: dates[m.id] ?? null })
                }
                className="min-h-11 bg-ink px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
              >
                {t('manual.markAchieved')}
              </button>
            </div>
          )}
          {/* OQ-43: evidence on the Sahel Horan side starts here, on the one
              record type whose figure is a single dated claim. `milestone` has
              been an admitted entity_type since 0128; this is the first
              screen to use it. */}
          <EvidencePanel entityType="milestone" entityId={m.id} compact />
        </div>
      ))}
    </div>
  )
}

/* ── the three record logs ───────────────────────────────────────────────── */

function RecordLog({
  code,
  table,
  rows,
  isLoading,
  isError,
  form,
  evidenceEntity,
}: {
  code: string
  table: 'promotional_action' | 'coordination_meeting' | 'case_study'
  rows: { id: string; date: string; primary: string; secondary?: string }[]
  isLoading: boolean
  isError: boolean
  form: React.ReactNode
  /**
   * OQ-43: G0.2 and G0.3 require evidence (minutes and attendance; the case
   * study itself). Both entity types have been admitted since 0128; until 16
   * September 2026 these rows had nowhere to hang the panel. Each row now
   * opens its own.
   */
  evidenceEntity?: 'coordination_meeting' | 'case_study'
}) {
  const { t, i18n } = useTranslation('indicators')
  const locale = i18n.resolvedLanguage ?? 'en'
  const withdraw = useWithdrawManualRecord()
  const [openEvidence, setOpenEvidence] = useState<string | null>(null)

  return (
    <div className="border-[1.5px] border-border-strong p-4">
      <div className="flex flex-wrap items-center gap-2">
        <IndicatorTag code={code} />
        <span className="text-[15px] font-semibold text-ink">{t(`manual.log.${code}.title`)}</span>
        <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {t('manual.countThisFar', { count: rows.length })}
        </span>
      </div>
      <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.5] text-muted">
        {t(`manual.log.${code}.hint`)}
      </p>

      {isLoading ? (
        <div aria-hidden="true" className="mt-3 h-16 animate-pulse bg-track" />
      ) : isError ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-error">
          {t('manual.loadFailed')}
        </p>
      ) : rows.length > 0 ? (
        <ul className="mt-3 flex list-none flex-col gap-1 p-0">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-default py-2"
            >
              <span className="min-w-0">
                <span dir="auto" className="text-[14px] font-medium text-ink">
                  {r.primary}
                </span>
                {r.secondary ? (
                  <span dir="auto" className="ms-2 text-[13px] text-muted">
                    {r.secondary}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-3">
                <span className="font-narrow text-[12px] tabular-nums text-muted">
                  {formatShortDate(r.date, locale)}
                </span>
                {evidenceEntity ? (
                  <button
                    type="button"
                    aria-expanded={openEvidence === r.id}
                    onClick={() => setOpenEvidence(openEvidence === r.id ? null : r.id)}
                    className="text-[12.5px] text-muted underline hover:text-ink"
                  >
                    {openEvidence === r.id ? t('manual.hideEvidence') : t('manual.evidence')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={withdraw.isPending}
                  onClick={() => withdraw.mutate({ table, id: r.id })}
                  className="text-[12.5px] text-muted underline hover:text-error"
                >
                  {t('manual.withdraw')}
                </button>
              </span>
              {evidenceEntity && openEvidence === r.id ? (
                <div className="basis-full pt-2">
                  <EvidencePanel entityType={evidenceEntity} entityId={r.id} compact />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[14px] text-muted">{t('manual.noneYet')}</p>
      )}

      <div className="mt-4 border-t border-border-default pt-3">{form}</div>
    </div>
  )
}

function PromotionalForm() {
  const { t, i18n } = useTranslation('indicators')
  const locale = i18n.resolvedLanguage ?? 'en'
  const channels = usePromotionalChannels()
  const create = useCreateManualRecord()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [channelId, setChannelId] = useState('')
  const [reach, setReach] = useState('')
  const [description, setDescription] = useState('')

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || !channelId) return
        create.mutate(
          {
            kind: 'promotional',
            title,
            date,
            channelId,
            reach: reach.trim() === '' ? null : Number(reach),
            description: description.trim() || null,
          },
          {
            onSuccess: () => {
              setTitle('')
              setReach('')
              setDescription('')
            },
          },
        )
      }}
    >
      <div className="min-w-[200px] flex-1">
        <Field label={t('manual.fieldTitle')}>
          <input dir="auto" className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-[170px]">
        <Field label={t('manual.fieldChannel')}>
          <select className={INPUT} value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            <option value="">{t('manual.choose')}</option>
            {(channels.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {locale.startsWith('ar') ? c.label_ar || c.label_en : c.label_en}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="min-w-[160px]">
        <Field label={t('manual.fieldDate')}>
          <input type="date" dir="ltr" className={INPUT} value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-[160px]">
        <Field label={t('manual.fieldReach')}>
          <input type="number" min={0} dir="ltr" className={INPUT} value={reach} onChange={(e) => setReach(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-0 basis-full">
        <Field label={t('manual.fieldDescription')}>
          <textarea dir="auto" rows={2} className={INPUT} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>
      <button
        type="submit"
        disabled={create.isPending || !title.trim() || !channelId}
        className="min-h-11 bg-ink px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
      >
        {t('manual.add')}
      </button>
    </form>
  )
}

function MeetingForm() {
  const { t } = useTranslation(['indicators', 'forms'])
  const create = useCreateManualRecord()
  const partnerships = usePartnershipOptions()
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState(today())
  const [minutesRef, setMinutesRef] = useState('')
  const [partnershipIds, setPartnershipIds] = useState<string[]>([])
  const toggle = (id: string) =>
    setPartnershipIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!subject.trim()) return
        create.mutate(
          { kind: 'meeting', date, subject, minutesRef: minutesRef.trim() || null, partnershipIds },
          {
            onSuccess: () => {
              setSubject('')
              setMinutesRef('')
              setPartnershipIds([])
            },
          },
        )
      }}
    >
      <div className="min-w-[220px] flex-1">
        <Field label={t('indicators:manual.fieldSubject')}>
          <input dir="auto" className={INPUT} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-[160px]">
        <Field label={t('indicators:manual.fieldDate')}>
          <input type="date" dir="ltr" className={INPUT} value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-[200px]">
        <Field label={t('indicators:manual.fieldMinutesRef')}>
          <input dir="auto" className={INPUT} value={minutesRef} onChange={(e) => setMinutesRef(e.target.value)} />
        </Field>
      </div>
      <div className="min-w-0 basis-full">
        <div className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
          {t('indicators:manual.fieldPartners')}
        </div>
        <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.5] text-muted">{t('indicators:manual.fieldPartnersHelp')}</p>
        <div role="group" aria-label={t('indicators:manual.fieldPartners')} className="mt-2 flex flex-wrap gap-[7px]">
          {partnerships.options.map((o) => {
            const on = partnershipIds.includes(o.partnershipId)
            return (
              <button
                key={o.partnershipId}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(o.partnershipId)}
                className={`min-h-10 border-[1.5px] px-3 text-start text-[13.5px] ${on ? 'border-ink bg-ink text-bg' : 'border-border-strong bg-bg text-ink'}`}
              >
                <span dir="auto">{[o.name, o.unit].filter(Boolean).join(' · ')}</span>
                <span className="ms-2 font-narrow text-[11px] uppercase tracking-[0.1em] opacity-80">
                  {t(`forms:linkageAdmin.partnershipType.${o.type}`)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <button
        type="submit"
        disabled={create.isPending || !subject.trim()}
        className="min-h-11 bg-ink px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
      >
        {t('indicators:manual.add')}
      </button>
    </form>
  )
}

function CaseStudyForm() {
  const { t } = useTranslation('indicators')
  const create = useCreateManualRecord()
  const initiatives = useInitiatives()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [change, setChange] = useState('')
  const [date, setDate] = useState(today())
  const [nid, setNid] = useState('')
  const [initiativeId, setInitiativeId] = useState('')
  // The person a case study is about, looked up by national ID so the link
  // points at one row of `person` -- never a retyped name.
  const nidClean = nid.replace(/\D/g, '').slice(0, 9)
  const person = usePersonByNationalId(nidClean)
  const nidDangling = isCompleteNationalId(nidClean) && !person.isFetching && !person.data
  const ready = title.trim() && summary.trim() && change.trim() && !nidDangling && (nidClean === '' || isCompleteNationalId(nidClean))

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        create.mutate(
          {
            kind: 'caseStudy',
            title,
            date,
            summary,
            change,
            personId: person.data?.id ?? null,
            initiativeId: initiativeId || null,
          },
          {
            onSuccess: () => {
              setTitle('')
              setSummary('')
              setChange('')
              setNid('')
              setInitiativeId('')
            },
          },
        )
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Field label={t('manual.fieldTitle')}>
            <input dir="auto" className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </div>
        <div className="min-w-[160px]">
          <Field label={t('manual.fieldDate')}>
            <input type="date" dir="ltr" className={INPUT} value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </div>
      <Field label={t('manual.fieldSummary')}>
        <textarea dir="auto" rows={2} className={INPUT} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label={t('manual.fieldChange')}>
        <textarea dir="auto" rows={2} className={INPUT} value={change} onChange={(e) => setChange(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Field label={t('manual.fieldAboutNid')}>
            <input dir="ltr" inputMode="numeric" className={INPUT} value={nid} onChange={(e) => setNid(e.target.value)} />
          </Field>
          {person.data ? (
            <p className="mt-1 text-[13px] text-success">{t('manual.aboutFound', { name: person.data.fullName })}</p>
          ) : nidDangling ? (
            <p role="alert" className="mt-1 text-[13px] font-semibold text-error">{t('manual.aboutNotFound')}</p>
          ) : null}
        </div>
        <div className="min-w-[220px] flex-1">
          <Field label={t('manual.fieldAboutInitiative')}>
            <select className={INPUT} value={initiativeId} onChange={(e) => setInitiativeId(e.target.value)}>
              <option value="">{t('manual.aboutNone')}</option>
              {(initiatives.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {[i.title, i.personName].join(' · ')}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div>
        <button
          type="submit"
          disabled={create.isPending || !ready}
          className="min-h-11 bg-ink px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-bg disabled:bg-track disabled:text-faint"
        >
          {t('manual.add')}
        </button>
      </div>
    </form>
  )
}

/* ── the three that belong elsewhere ─────────────────────────────────────── */

/**
 * ── WHY THIS SHAPE, AND NOT `to: string | null` ────────────────────────────
 *
 * "Not built yet" is a claim about the REST of the app, made on a screen that
 * cannot see the rest of the app. It goes stale in silence and nothing tests
 * copy. It has now gone stale twice:
 *
 *  - B1.2 said "not built yet" for the whole of the session in which the
 *    coordination office was built, while its own description on the same line
 *    already said "in the coordination office module".
 *  - D0.1, C1.3 and G0.4 said it the day after /forms/gd, /initiatives/:id and
 *    the contribution log on /forms/pn/:id all went live. Three of five rows
 *    were false, and the descriptions beside them were already right — someone
 *    updated the prose and not the map.
 *
 * A comment warning about this sat directly above the old array. It drifted
 * anyway, within a day. A warning is not a check.
 *
 * So the state is no longer hand-maintained. Every row names the route it
 * belongs to. A row may ALSO say `unbuilt: true` — and `check-elsewhere-routes`
 * (run by `npm run build`) fails if that claim disagrees with App.tsx:
 *
 *   - `to` that is not a declared route      → build fails
 *   - `to: '/forms/<m>'` for a retired module → build fails
 *   - `unbuilt: true` on a route that EXISTS  → build fails  ← the drift above
 *
 * The last line is the one that matters. It cannot pass while the label is
 * wrong, which is the whole point.
 */
type ElsewhereRow = { code: string; to: string; unbuilt?: true }

const ELSEWHERE: ElsewhereRow[] = [
  { code: 'B1.2', to: '/forms/os' },
  { code: 'D0.1', to: '/forms/gd' },
  // The mentorship form lives on /initiatives/:id, which needs an initiative
  // chosen first. The list is the entry point, so that is what is linked.
  { code: 'C1.3', to: '/initiatives' },
  // Same shape: the contribution log is on /forms/pn/:id, against one partner.
  { code: 'G0.4', to: '/forms/pn' },
  { code: 'D0.2', to: '/sessions' },
]

function EnteredElsewhere() {
  const { t } = useTranslation('indicators')
  return (
    <div className="flex flex-col gap-2">
      {ELSEWHERE.map(({ code, to, unbuilt }) => (
        <div
          key={code}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-s-[3px] border-attention-border bg-sunken p-3"
        >
          <IndicatorTag code={code} />
          <span className="min-w-0 flex-1 text-[14px] leading-[1.5] text-body">
            {t(`manual.elsewhere.${code}`)}
          </span>
          {unbuilt ? (
            <span className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-amber">
              {t('manual.notBuiltYet')}
            </span>
          ) : (
            <Link
              to={to}
              className="font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-ink"
            >
              {t('manual.goThere')}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── the screen ──────────────────────────────────────────────────────────── */

export function ManualEntries() {
  const { t, i18n } = useTranslation('indicators')
  const locale = i18n.resolvedLanguage ?? 'en'

  const promo = usePromotionalActions()
  const channels = usePromotionalChannels()
  const meetings = useCoordinationMeetings()
  const studies = useCaseStudies()

  const channelName = (id: string) => {
    const c = (channels.data ?? []).find((x) => x.id === id)
    if (!c) return undefined
    return locale.startsWith('ar') ? c.label_ar || c.label_en : c.label_en
  }

  return (
    <div className="pb-16">
      <PageHead title={t('manual.title')} />
      <AccentRule />
      <p className="mt-3 max-w-[68ch] text-[15px] leading-[1.55] text-body">{t('manual.intro')}</p>

      <section className="mt-8">
        <SectionRule title={t('manual.milestonesHeading')} />
        <div className="mt-3">
          <Milestones />
        </div>
      </section>

      <section className="mt-8">
        <SectionRule title={t('manual.logsHeading')} />
        <div className="mt-3 flex flex-col gap-4">
          <RecordLog
            code="F0.1"
            table="promotional_action"
            isLoading={promo.isLoading}
            isError={promo.isError}
            rows={(promo.data ?? []).map((r) => ({
              id: r.id,
              date: r.action_date,
              primary: r.title,
              ...(channelName(r.channel_id) ? { secondary: channelName(r.channel_id)! } : {}),
            }))}
            form={<PromotionalForm />}
          />
          <RecordLog
            code="G0.2"
            table="coordination_meeting"
            isLoading={meetings.isLoading}
            isError={meetings.isError}
            rows={(meetings.data ?? []).map((r) => ({
              id: r.id,
              date: r.meeting_date,
              primary: r.subject,
              secondary: [
                t('manual.partnersPresent', { count: r.partners.length }),
                ...(r.minutes_ref ? [r.minutes_ref] : []),
              ].join(' · '),
            }))}
            form={<MeetingForm />}
            evidenceEntity="coordination_meeting"
          />
          <RecordLog
            code="G0.3"
            table="case_study"
            isLoading={studies.isLoading}
            isError={studies.isError}
            rows={(studies.data ?? []).map((r) => ({
              id: r.id,
              date: r.documented_on,
              primary: r.title,
              secondary: r.summary,
            }))}
            form={<CaseStudyForm />}
            evidenceEntity="case_study"
          />
        </div>
      </section>

      <section className="mt-8">
        <SectionRule title={t('manual.elsewhereHeading')} />
        <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.5] text-muted">
          {t('manual.elsewhereIntro')}
        </p>
        <div className="mt-3">
          <EnteredElsewhere />
        </div>
      </section>
    </div>
  )
}

export default ManualEntries
