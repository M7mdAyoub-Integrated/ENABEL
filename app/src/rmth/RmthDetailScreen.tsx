import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { BackLink, Card, DangerButton, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import {
  rmthRefQuery, useRmthList, useRmthRecord, useSaveRmth, useSetRmthDeleted, type RmthRecord, type SaveResult,
} from '../data/rmth'
import { RefusalBand, refListsOf } from './RmthFormScreen'
import { EvidencePanel } from '../components/EvidencePanel'
import { useRmthThresholds } from '../data/rmthThresholds'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { allFields, formDef, useRmthLabels } from './labels'
import type { RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthPartDef, RmthTable } from './types'
import { BidiIsolate } from '../components/BidiIsolate'
import { SEP, EMDASH, EMPTY, RANGE, ELLIPSIS, COLON, HASH, LTE, GTE, PAREN_OPEN, PAREN_CLOSE } from '../ui/glyphs'

/**
 * A saved record, field by field in the sheet's order and wording, with the
 * evidence files below it. Reads what the database holds; the only writes
 * here are soft delete / restore (a coordinator's), evidence, and a
 * programme's deliveries.
 */
export function RmthDetailScreen() {
  const { form: fidParam, id } = useParams()
  const fid = fidParam as RmthFormId
  const def = formDef(fid)
  const fields = useMemo(() => allFields(def), [def])
  const L = useRmthLabels(fid)
  const { t, i18n } = useTranslation(['rmth', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const rec = useRmthRecord(def.table, id)
  const setDeleted = useSetRmthDeleted(def.table)
  const [confirm, setConfirm] = useState(false)
  const refs = useRefsForDetail(fields)

  if (rec.isLoading) return (<><PageHead eyebrow={L.indicator} title={L.title} size="md" /><DetailSkeleton /></>)
  if (rec.isError || !rec.data) return <ErrorState error={rec.error} onRetry={() => void rec.refetch()} />
  const r = rec.data
  const deleted = !!r.row.deleted_at
  const reference = typeof r.row['reference'] === 'string' ? (r.row['reference'] as string) : null
  const titleCol = ['title', 'name', 'entity_name'].find((c) => typeof r.row[c] === 'string')
  const heading = titleCol ? (r.row[titleCol] as string) : r.person?.full_name ?? L.title

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(`/rmth/${fid}`)}>{t('rmth:form.back')}</BackLink>}
        eyebrow={`${L.indicator}${reference ? ` · ${reference}` : ''}`}
        title={heading}
        description={L.title}
        size="md"
        action={
          <div className="flex flex-wrap gap-2">
            {can(role, 'record.edit') && !deleted ? <PrimaryButton onClick={() => navigate(`/rmth/${fid}/${id}/edit`)}>{t('rmth:detail.edit')}</PrimaryButton> : null}
            {can(role, 'record.delete') && !deleted ? <DangerButton onClick={() => setConfirm(true)}>{t('rmth:detail.delete')}</DangerButton> : null}
            {can(role, 'record.delete') && deleted ? (
              <SecondaryButton onClick={() => void setDeleted.mutateAsync({ id: id!, deleted: false }).then(() => toast.fire({ tag: t('common:toast.updated'), title: t('rmth:detail.restore') }))}>
                {t('rmth:detail.restore')}
              </SecondaryButton>
            ) : null}
          </div>
        }
      />
      {deleted ? <div role="status" className="mb-4 border-[1.5px] border-dashed border-error bg-sunken px-4 py-3 text-[14px] text-error">{t('rmth:detail.deletedNote')}</div> : null}
      {setDeleted.error ? <WriteError error={setDeleted.error} onDismiss={setDeleted.reset} /> : null}

      {def.sections.map((s) => (
        <section key={s.key} className="mt-[26px]">
          <SectionRule title={L.section(s.key)} />
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {s.fields.map((f) => (
              <Row key={f.key} f={f} rec={r} fid={fid} refs={refs} locale={locale} />
            ))}
          </dl>
        </section>
      ))}

      {def.table === 'rmth_training_programme' && r.row['programme_type'] === 'entrepreneurship' ? (
        <DeliveriesPanel programmeId={id!} />
      ) : null}

      <EvidencePanel entityType={def.table} entityId={id!} deleted={deleted} />

      <p className="mt-8 font-narrow text-[11.5px] uppercase tracking-[0.1em] text-faint">
        {t('rmth:detail.created')} {formatShortDate(r.row.created_at, locale)} {SEP} {t('rmth:detail.updated')} {formatShortDate(r.row.updated_at, locale)}
      </p>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('rmth:detail.deleteConfirm')}
        confirmLabel={t('rmth:detail.delete')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setConfirm(false)
          void setDeleted.mutateAsync({ id: id!, deleted: true }).then(() => toast.fire({ tag: t('common:toast.updated'), title: t('rmth:detail.delete') }))
        }}
      />
    </>
  )
}

function useRefsForDetail(fields: RmthFieldDef[]): Record<string, RefRow[]> {
  // The same lists as the form screen, derived ones included (refListsOf).
  const names = useMemo(() => refListsOf(fields), [fields])
  const results = useQueries({ queries: names.map((n) => rmthRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  names.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

function Row({ f, rec, fid, refs, locale }: { f: RmthFieldDef; rec: RmthRecord; fid: RmthFormId; refs: Record<string, RefRow[]>; locale: string }) {
  const L = useRmthLabels(fid)
  const { t } = useTranslation('rmth')
  const row = rec.row
  const wide = f.type === 'parts' || f.type === 'grid' || f.type === 'services' || f.type === 'multi' || f.type === 'records' || f.type === 'area'
  const label = L.label(f)

  const show = (content: React.ReactNode, ltr = false) => (
    <div className={`min-w-0 border-b border-border-default pb-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
        {f.counting ? <span className="ms-2 bg-amber px-1.5 py-px text-[10px] text-bg">{t('form.countingField')}</span> : null}
      </dt>
      <dd className="mt-1 text-[15px] text-ink">{ltr ? <BidiIsolate>{content}</BidiIsolate> : content}</dd>
    </div>
  )
  const notSet = <span className="text-ghost">{t('detail.notSet')}</span>
  const refText = (list: string | undefined, id: unknown, other?: unknown) => {
    const r = (refs[list ?? ''] ?? []).find((x) => x.id === id)
    if (!r) return undefined
    const base = refLabel(r, locale)
    return r.allows_free_text && typeof other === 'string' && other ? `${base}: ${other}` : base
  }
  const plain = (col: string, type: string): React.ReactNode => {
    const v = row[col]
    if (v == null || v === '') return notSet
    if (type === 'date') return formatShortDate(String(v), locale)
    if (type === 'month') return String(v).slice(0, 7)
    if (type === 'bool') return v ? t('form.yes') : t('form.no')
    return String(v)
  }

  switch (f.type) {
    case 'nid': return show(rec.person?.national_id ?? notSet, true)
    case 'nid_confirm': return null
    case 'person_name': return show(rec.person?.full_name ?? notSet)
    case 'person_phone': return show(rec.person?.phone ?? notSet, true)
    case 'person_sex': return show(rec.person?.sex ? L.opt(f, rec.person.sex) : notSet)
    case 'age': return show(plain('age_years', 'number'))
    case 'text': case 'area': case 'number': case 'date': case 'month': case 'phone':
      return show(plain(f.key, f.type), f.type === 'phone')
    case 'select': return show(refText(f.ref, row[f.key], f.other ? row[f.other] : undefined) ?? notSet)
    case 'bool': {
      const v = row[f.key]
      const stamp = row[`${f.key}_decided_on`]
      return show(
        v == null ? <span className="text-ghost">{t('form.undecided')}</span> : (
          <>
            {L.opt(f, v ? 'true' : 'false')}
            {typeof stamp === 'string' ? <span className="ms-2 text-[12px] text-muted">{t('form.decidedBy', { when: formatShortDate(stamp, locale) })}</span> : null}
          </>
        ),
      )
    }
    case 'multi': {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      if (rows.length === 0) return show(<span className="text-ghost">{t('form.noneSelected')}</span>)
      return show(
        <ul className="m-0 list-none p-0">
          {rows.map((o) => <li key={o.option_id}>{refText(f.question, o.option_id, o.option_other) ?? '…'}</li>)}
        </ul>,
      )
    }
    case 'record': return show(<RecordLink table={f.table as RmthTable | undefined} id={row[f.key]} empty={L.empty(f)} />)
    case 'records': return show(rec.proposalIds.length ? <ul className="m-0 list-none p-0">{rec.proposalIds.map((pid) => <li key={pid}><RecordLink table="rmth_proposal" id={pid} /></li>)}</ul> : notSet)
    case 'parts':
      return show(
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {(f.parts ?? []).map((p: RmthPartDef) => (
            <div key={p.column} className="min-w-0">
              <dt className="font-narrow text-[10.5px] uppercase tracking-[0.1em] text-faint">{L.part(f, p.column) || label}</dt>
              <dd className="m-0">
                {p.type === 'select' ? (refText(p.ref, row[p.column], p.other ? row[p.other] : undefined) ?? notSet)
                : p.type === 'multi' ? (rec.options.filter((o) => o.question_code === p.question).map((o) => refText(p.question, o.option_id, o.option_other)).join(' · ') || notSet)
                : p.type === 'bool' ? (row[p.column] == null ? notSet : L.partOpt(f, p.column, row[p.column] ? 'true' : 'false'))
                : p.type === 'record' ? <RecordLink table={p.table as RmthTable | undefined} id={row[p.column]} />
                : plain(p.column, p.type)}
              </dd>
            </div>
          ))}
        </dl>,
      )
    case 'grid': {
      const comps = refs[f.components ?? ''] ?? []
      const ratings = refs[f.ratings ?? ''] ?? []
      if (rec.support.length === 0) return show(notSet)
      return show(
        <ul className="m-0 list-none p-0">
          {rec.support.map((s) => {
            const c = comps.find((x) => x.id === s.component_id)
            const rt = ratings.find((x) => x.id === s.rating_id)
            return <li key={s.component_id}>{c ? refLabel(c, locale) : ELLIPSIS}{s.component_other ? ` (${s.component_other})` : ''} {EMDASH} <strong>{rt ? refLabel(rt, locale) : ELLIPSIS}</strong></li>
          })}
        </ul>,
      )
    }
    case 'services': {
      const list = refs[f.services ?? ''] ?? []
      if (rec.servicesLive.length === 0) return show(notSet)
      return show(
        <ul className="m-0 list-none p-0">
          {rec.servicesLive.map((s) => <li key={s.service_id}>{refLabel(list.find((x) => x.id === s.service_id), locale)}{s.began_on ? ` — ${formatShortDate(s.began_on, locale)}` : ''}</li>)}
        </ul>,
      )
    }
    case 'deliveries': return null
    case 'readonly': return show(<Derived f={f} rec={rec} refs={refs} locale={locale} fid={fid} />, f.derived === 'reference')
    default: return null
  }
}

function Derived({ f, rec, refs, locale, fid }: { f: RmthFieldDef; rec: RmthRecord; refs: Record<string, RefRow[]>; locale: string; fid: RmthFormId }) {
  const { t } = useTranslation('rmth')
  const L = useRmthLabels(fid)
  const row = rec.row
  const d = f.derived
  const table = formDef(fid).table
  const cycleId = typeof row['cycle_id'] === 'string' ? (row['cycle_id'] as string) : undefined
  const needsCycle = ['cycle_end', 'cycle_dates', 'cycle_dates_hours', 'cycle_delivered_by', 'cycle_modules'].includes(d ?? '')
  const cycle = useRmthRecord('rmth_training_cycle', needsCycle ? cycleId : undefined)
  const event = useRmthRecord('rmth_event', d === 'event_date' && typeof row['event_id'] === 'string' ? (row['event_id'] as string) : undefined)
  const enterprise = useRmthRecord('rmth_enterprise', d === 'enterprise_name' && typeof row['enterprise_id'] === 'string' ? (row['enterprise_id'] as string) : undefined)
  const under = useRmthRecord(table, d === 'counted_under' && typeof row['counted_under_id'] === 'string' ? (row['counted_under_id'] as string) : undefined)
  const th = useRmthThresholds()
  const deliveries = useRmthList('rmth_training_cycle', d === 'deliveries_total' ? { programme_id: row.id, cycle_kind: 'entrepreneurship' } : { id: '00000000-0000-0000-0000-000000000000' })
  const notSet = <span className="text-ghost">{t('detail.notSet')}</span>
  const yesNo = (v: unknown) => (v == null ? notSet : v ? t('form.yes') : t('form.no'))
  switch (d) {
    case 'reference': return <>{typeof row['reference'] === 'string' ? (row['reference'] as string) : notSet}</>
    case 'counted_under': {
      // The sheet's own two answers for this form (see DerivedField).
      if (!row['counted_under_id']) return <>{L.opt(f, 'first')}</>
      const ref = under.data ? (typeof under.data.row['reference'] === 'string' ? (under.data.row['reference'] as string) : under.data.row.id.slice(0, 8)) : '…'
      return <>{L.opt(f, 'counted', { reference: ref })}</>
    }
    case 'so10_threshold': { const r = (refs['so10_threshold'] ?? []).find((x) => x.id === row['so10_threshold_id']); return <>{r ? refLabel(r, locale) : notSet}</> }
    case 'three_month_reached': case 'enters_denominator': case 'received_any': case 'any_essential': return <>{yesNo(row[d])}</>
    case 'event_date': return <>{typeof event.data?.row['start_date'] === 'string' ? formatShortDate(event.data.row['start_date'] as string, locale) : notSet}</>
    case 'cycle_end': return <>{typeof cycle.data?.row['end_date'] === 'string' ? formatShortDate(cycle.data.row['end_date'] as string, locale) : notSet}</>
    case 'cycle_dates': case 'cycle_dates_hours': {
      const c = cycle.data?.row
      if (!c || typeof c['start_date'] !== 'string') return <>{notSet}</>
      return <>{formatShortDate(c['start_date'] as string, locale)} {RANGE} {formatShortDate(String(c['end_date']), locale)}{d === 'cycle_dates_hours' && c['contact_hours'] != null ? ` · ${String(c['contact_hours'])} h` : ''}</>
    }
    case 'cycle_delivered_by': { const c = cycle.data?.row; const r = (refs['e03_delivered_by'] ?? []).find((x) => x.id === c?.['delivered_by_id']); return <>{r ? refLabel(r, locale) : notSet}</> }
    case 'cycle_modules': {
      const rows = cycle.data?.options.filter((o) => o.question_code === 'e03_module') ?? []
      const list = refs['e03_module'] ?? []
      return <>{rows.length ? rows.map((o) => refLabel(list.find((x) => x.id === o.option_id), locale)).join(' · ') : notSet}</>
    }
    case 'enterprise_name': return <>{typeof enterprise.data?.row['name'] === 'string' ? (enterprise.data.row['name'] as string) : notSet}</>
    case 'short_term_intensive': {
      const w = th.data?.find((r) => r.key === 'c11_max_weeks')?.value_numeric
      const h = th.data?.find((r) => r.key === 'c11_min_hours_per_week')?.value_numeric
      if (w == null || h == null) return <span className="text-attention-ink">{t('detail.thresholdUndecided')}</span>
      const weeks = Number(row['weeks']); const hpw = Number(row['hours_per_week'])
      if (!row['weeks'] || !row['hours_per_week']) return <>{notSet}</>
      // Built outside the JSX: jsx-no-literals refuses a template literal as a
      // child too, and rightly -- it cannot tell a glyph from a sentence.
      const rule = PAREN_OPEN + LTE + ' ' + String(w) + ' ' + SEP + ' ' + GTE + ' ' + String(h) + PAREN_CLOSE
      return <>{weeks <= w && hpw >= h ? t('form.yes') : t('form.no')} <span className="text-muted">{rule}</span></>
    }
    case 'deliveries_total': return <>{deliveries.data ? String(deliveries.data.length) : ELLIPSIS}</>
    default: return <>{notSet}</>
  }
}

function RecordLink({ table, id, empty }: { table: RmthTable | undefined; id: unknown; empty?: string | undefined }) {
  const { t } = useTranslation('rmth')
  const rid = typeof id === 'string' ? id : undefined
  const rec = useRmthRecord(table ?? 'rmth_event', table ? rid : undefined)
  // An entrepreneurship delivery has no reference or title of its own: it is
  // named by its programme and cycle number, the way the picker names it.
  // Without this an F0.1 record showed the first eight characters of a uuid
  // where the sheet says "programme reference and title".
  const progId = typeof rec.data?.row['programme_id'] === 'string' ? (rec.data.row['programme_id'] as string) : undefined
  const prog = useRmthRecord('rmth_training_programme', progId)
  if (!rid) return <span className="text-ghost">{empty ?? t('detail.notSet')}</span>
  if (!rec.data) return <>{ELLIPSIS}</>
  const row = rec.data.row
  const ref = typeof row['reference'] === 'string' ? (row['reference'] as string) : null
  const title = ['title', 'name', 'entity_name'].map((c) => row[c]).find((v) => typeof v === 'string') as string | undefined
  const fidOf = formIdFor(table, row)
  let text = [ref, title].filter(Boolean).join(' · ') || rid.slice(0, 8)
  if (progId) {
    if (!prog.data) return <>{ELLIPSIS}</>
    const p = prog.data.row
    text = [typeof p['reference'] === 'string' ? p['reference'] : null, typeof p['title'] === 'string' ? p['title'] : null].filter(Boolean).join(' ') + ' ' + SEP + ' ' + HASH + String(row['cycle_no'] ?? '')
    return <Link to={`/rmth/f02/${progId}`} className="text-ink underline">{text}</Link>
  }
  return fidOf ? <Link to={`/rmth/${fidOf}/${rid}`} className="text-ink underline">{text}</Link> : <>{text}</>
}

function formIdFor(table: RmthTable | undefined, row: Record<string, unknown>): RmthFormId | undefined {
  if (!table) return undefined
  if (table === 'rmth_enterprise') return undefined
  // enrolments and surveys carry a kind; events/cycles/programmes too
  const map: Partial<Record<RmthTable, (r: Record<string, unknown>) => RmthFormId | undefined>> = {
    rmth_event: (r) => (r['event_kind'] === 'guidance' ? 'a13' : 'a12'),
    rmth_proposal: () => 'b12',
    rmth_training_programme: (r) => (r['programme_type'] === 'specialised' ? 'b11' : 'f02'),
    rmth_training_cycle: (r) => (r['cycle_kind'] === 'employability' ? 'c11' : undefined),
    rmth_incubator: () => 'e01',
    rmth_project_implementer: () => 'b1',
  }
  return map[table]?.(row)
}

/* ── the programme's deliveries (F0.2's log) ─────────────────────────────── */

function DeliveriesPanel({ programmeId }: { programmeId: string }) {
  const { t, i18n } = useTranslation('rmth')
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const list = useRmthList('rmth_training_cycle', { programme_id: programmeId, cycle_kind: 'entrepreneurship' })
  const save = useSaveRmth('rmth_training_cycle')
  const [draft, setDraft] = useState({ start: '', end: '', location: '', enrolled: '', completing: '' })
  const [open, setOpen] = useState(false)
  // The save function answers {ok:false, ...} rather than throwing for a
  // constraint refusal, so `save.error` never carries it. This panel used to
  // check only `res.ok` to close itself and showed nothing otherwise: a
  // delivery refused by 0125's constraint (fixed in 0129) left the form open,
  // filled in, with no message -- the register's seventh shape from the
  // screen side. The refusal is rendered now, like the form screen's.
  const [outcome, setOutcome] = useState<SaveResult | null>(null)
  return (
    <section className="mt-[26px]">
      <SectionRule title={t('detail.deliveries')} right={can(role, 'record.create') ? <SecondaryButton onClick={() => setOpen((o) => !o)}>{t('form.deliveryAdd')}</SecondaryButton> : undefined} />
      {save.error ? <WriteError error={save.error} onDismiss={save.reset} /> : null}
      {outcome && !outcome.ok ? <RefusalBand outcome={outcome} /> : null}
      {open ? (
        <Card>
          <div className="grid grid-cols-12 gap-3">
            <label className="col-span-6 sm:col-span-3 text-[12px] font-narrow uppercase tracking-[0.1em]">{t('form.deliveryStart')}<input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} className="mt-1 w-full min-h-10 border-[1.5px] border-ink bg-input px-2" /></label>
            <label className="col-span-6 sm:col-span-3 text-[12px] font-narrow uppercase tracking-[0.1em]">{t('form.deliveryEnd')}<input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} className="mt-1 w-full min-h-10 border-[1.5px] border-ink bg-input px-2" /></label>
            <label className="col-span-12 sm:col-span-6 text-[12px] font-narrow uppercase tracking-[0.1em]">{t('form.deliveryLocation')}<input type="text" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="mt-1 w-full min-h-10 border-[1.5px] border-ink bg-input px-2" /></label>
            <label className="col-span-6 sm:col-span-3 text-[12px] font-narrow uppercase tracking-[0.1em]">{t('form.deliveryEnrolled')}<input type="number" value={draft.enrolled} onChange={(e) => setDraft({ ...draft, enrolled: e.target.value })} className="mt-1 w-full min-h-10 border-[1.5px] border-ink bg-input px-2" /></label>
            <label className="col-span-6 sm:col-span-3 text-[12px] font-narrow uppercase tracking-[0.1em]">{t('form.deliveryCompleting')}<input type="number" value={draft.completing} onChange={(e) => setDraft({ ...draft, completing: e.target.value })} className="mt-1 w-full min-h-10 border-[1.5px] border-ink bg-input px-2" /></label>
          </div>
          <div className="mt-3 flex justify-end">
            <PrimaryButton
              disabled={!draft.start || !draft.end || save.isPending}
              onClick={() => {
                setOutcome(null)
                void save.mutateAsync({
                  row: {
                    cycle_kind: 'entrepreneurship', programme_id: programmeId, start_date: draft.start, end_date: draft.end,
                    location: draft.location || null,
                    enrolled_count: draft.enrolled === '' ? null : Number(draft.enrolled),
                    completed_count: draft.completing === '' ? null : Number(draft.completing),
                  },
                }).then((res) => {
                  setOutcome(res)
                  if (res.ok) { setOpen(false); setDraft({ start: '', end: '', location: '', enrolled: '', completing: '' }) }
                })
              }}
            >
              {t('form.save')}
            </PrimaryButton>
          </div>
        </Card>
      ) : null}
      {list.data && list.data.length === 0 ? <p className="mt-3 text-[14px] text-muted">{t('form.deliveryNone')}</p> : null}
      {list.data && list.data.length > 0 ? (
        <ul className="mt-3 divide-y divide-border-default border-[1.5px] border-ink">
          {list.data.map((c) => (
            <li key={c.id} className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[14px]">
              <span className="font-narrow font-bold">{HASH}{String(c['cycle_no'])}</span>
              <span>{formatShortDate(String(c['start_date']), locale)} {RANGE} {formatShortDate(String(c['end_date']), locale)}</span>
              {c['location'] ? <span className="text-muted">{String(c['location'])}</span> : null}
              <span className="text-muted">{t('form.deliveryEnrolled')}{COLON} {c['enrolled_count'] == null ? EMPTY : String(c['enrolled_count'])} {SEP} {t('form.deliveryCompleting')}{COLON} {c['completed_count'] == null ? EMPTY : String(c['completed_count'])}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export default RmthDetailScreen
