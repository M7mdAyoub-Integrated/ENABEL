import { useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { BackLink, DangerButton, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import {
  khldRefQuery, useKhldAttendanceFigures, useKhldMilestoneStatus, useKhldRecord, useSetKhldDeleted, useSetKhldPublished,
  type KhldRecord,
} from '../data/khld'
import { refListsOf, ParticipationLog } from './KhldFormScreen'
import { milestoneText, useDerived } from './derived'
import { EvidencePanel } from '../components/EvidencePanel'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { allFields, formDef, formFor, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldPartDef, KhldTable } from './types'
import { BidiIsolate } from '../components/BidiIsolate'
import { SEP, ELLIPSIS, COLON } from '../ui/glyphs'

/**
 * A saved record, field by field in the sheet's order and wording, with the
 * evidence files below it. Reads what the database holds; the only writes
 * here are soft delete / restore (a coordinator's) and evidence.
 *
 * The two figures shown beside a record -- a milestone's status and an
 * attendance sheet's reconciliation -- are the database's own answers
 * (khld_milestone_status, khld_attendance_figures, 0147), not worked out here.
 */
export function KhldDetailScreen() {
  const { form: fidParam, id } = useParams()
  const fid = fidParam as KhldFormId
  const def = formDef(fid)
  const fields = useMemo(() => allFields(def), [def])
  const L = useKhldLabels(fid)
  const { t, i18n } = useTranslation(['khld', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const rec = useKhldRecord(def.table, id)
  const setDeleted = useSetKhldDeleted(def.table)
  const [confirm, setConfirm] = useState(false)
  const refs = useRefsForDetail(fields)

  if (rec.isLoading) return (<><PageHead eyebrow={L.code} title={L.short} size="md" /><DetailSkeleton /></>)
  if (rec.isError || !rec.data) return <ErrorState error={rec.error} onRetry={() => void rec.refetch()} />
  const r = rec.data
  const deleted = !!r.row.deleted_at
  const reference = typeof r.row['reference'] === 'string' ? (r.row['reference'] as string) : r.vendor?.reference ?? null
  const titleCol = ['event_title', 'market_name', 'contributor_name', 'description'].find((c) => typeof r.row[c] === 'string' && r.row[c])
  const heading = titleCol ? (r.row[titleCol] as string) : r.person?.full_name ?? r.partner?.name ?? r.enterprise?.enterprise_name ?? L.short

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(`/khld/${fid}`)}>{t('khld:form.back')}</BackLink>}
        eyebrow={`${L.code}${reference ? ` ${SEP} ${reference}` : ''}`}
        title={heading}
        description={L.title}
        size="md"
        action={
          <div className="flex flex-wrap gap-2">
            {can(role, 'record.edit') && !deleted ? <PrimaryButton onClick={() => navigate(`/khld/${fid}/${id}/edit`)}>{t('khld:detail.edit')}</PrimaryButton> : null}
            {can(role, 'record.delete') && !deleted ? <DangerButton onClick={() => setConfirm(true)}>{t('khld:detail.delete')}</DangerButton> : null}
            {can(role, 'record.delete') && deleted ? (
              <SecondaryButton onClick={() => void setDeleted.mutateAsync({ id: id!, deleted: false }).then(() => toast.fire({ tag: t('common:toast.updated'), title: t('khld:detail.restore') }))}>
                {t('khld:detail.restore')}
              </SecondaryButton>
            ) : null}
          </div>
        }
      />
      {deleted ? <div role="status" className="mb-4 border-[1.5px] border-dashed border-error bg-sunken px-4 py-3 text-[14px] text-error">{t('khld:detail.deletedNote')}</div> : null}
      {setDeleted.error ? <WriteError error={setDeleted.error} onDismiss={setDeleted.reset} /> : null}

      {def.milestone ? <MilestonePanel id={id!} /> : null}
      {def.table === 'khld_attendance' ? <AttendancePanel id={id!} /> : null}
      {(def.table === 'khld_activity' || def.table === 'khld_market') && !deleted ? (
        <PublishPanel table={def.table} id={id!} published={r.row['is_published'] === true} />
      ) : null}

      {def.sections.map((s) => (
        <section key={s.key} className="mt-[26px]">
          <SectionRule title={L.section(s.key)} />
          <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {s.fields.map((f) => <Row key={f.key} f={f} rec={r} fid={fid} refs={refs} locale={locale} />)}
          </dl>
        </section>
      ))}

      <EvidencePanel entityType={def.table} entityId={id!} deleted={deleted} />

      <p className="mt-8 font-narrow text-[11.5px] uppercase tracking-[0.1em] text-faint">
        {t('khld:detail.created')} {formatShortDate(r.row.created_at, locale)} {SEP} {t('khld:detail.updated')} {formatShortDate(r.row.updated_at, locale)}
      </p>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t('khld:detail.deleteConfirm')}
        confirmLabel={t('khld:detail.delete')}
        cancelLabel={t('common:actions.cancel')}
        onConfirm={() => {
          setConfirm(false)
          void setDeleted.mutateAsync({ id: id!, deleted: true }).then(() => toast.fire({ tag: t('common:toast.updated'), title: t('khld:detail.delete') }))
        }}
      />
    </>
  )
}

function useRefsForDetail(fields: KhldFieldDef[]): Record<string, RefRow[]> {
  const names = useMemo(() => refListsOf(fields), [fields])
  const results = useQueries({ queries: names.map((n) => khldRefQuery(n)) })
  const out: Record<string, RefRow[]> = {}
  names.forEach((n, i) => { out[n] = (results[i]?.data as RefRow[] | undefined) ?? [] })
  return out
}

/** The milestone's status from khld_milestone_status, above the checklist it is computed from. */
function MilestonePanel({ id }: { id: string }) {
  const { t } = useTranslation('khld')
  const status = useKhldMilestoneStatus(id)
  const d = milestoneText(status.data, (k, v) => t(k, v ?? {}), 'detail')
  const tone = d.tone === 'ok' ? 'border-success' : d.tone === 'warn' ? 'border-amber bg-attention-bg' : 'border-border-default'
  return (
    <div className={`mt-2 border-s-[3px] px-4 py-3 ${tone}`}>
      <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('detail.milestone.title')}{COLON} </span>
      <span className="text-[15px] font-semibold text-ink">{d.text ?? ELLIPSIS}</span>
      {d.note ? <p className="mb-0 mt-1 text-[13.5px] text-body" style={{ textWrap: 'pretty' }}>{d.note}</p> : null}
      <p className="mb-0 mt-1 text-[12.5px] text-muted"><Link to="/khld/rules" className="underline">{t('nav.rules')}</Link></p>
    </div>
  )
}

/**
 * Whether this activity or market day is on the public page (0152). A
 * coordinator's switch; the public view also requires the date to be today
 * or later, which is said here so a published past event is not looked for.
 */
function PublishPanel({ table, id, published }: { table: 'khld_activity' | 'khld_market'; id: string; published: boolean }) {
  const { t } = useTranslation('khld')
  const { role } = useAuth()
  const set = useSetKhldPublished(table)
  return (
    <div className={`mt-2 flex flex-wrap items-center justify-between gap-3 border-s-[3px] px-4 py-3 ${published ? 'border-success' : 'border-border-default'}`}>
      <div>
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('detail.publish.title')}{COLON} </span>
        <span className="text-[15px] font-semibold text-ink">{published ? t('detail.publish.on') : t('detail.publish.off')}</span>
        <p className="mb-0 mt-1 text-[13px] text-muted" style={{ textWrap: 'pretty' }}>{t('detail.publish.note')}</p>
        {set.error ? <WriteError error={set.error} onDismiss={set.reset} /> : null}
      </div>
      {can(role, 'record.edit') ? (
        <SecondaryButton disabled={set.isPending} onClick={() => void set.mutateAsync({ id, published: !published })}>
          {published ? t('detail.publish.unpublish') : t('detail.publish.publish')}
        </SecondaryButton>
      ) : null}
    </div>
  )
}

/** The attendance sheet's reconciliation and distinct-individual figure, from khld_attendance_figures. */
function AttendancePanel({ id }: { id: string }) {
  const { t } = useTranslation('khld')
  const g = useKhldAttendanceFigures(id)
  const f = g.data
  if (!f) return null
  return (
    <div className={`mt-2 border-s-[3px] px-4 py-3 ${f.agrees ? 'border-success' : 'border-amber bg-attention-bg'}`}>
      <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('detail.attendance.title')}{COLON} </span>
      <span className="text-[15px] font-semibold text-ink">{f.agrees ? t('detail.attendance.agrees') : t('detail.attendance.disagrees')}</span>
      <dl className="mb-0 mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-4">
        <Fig k={t('detail.attendance.total')} v={String(f.total)} />
        <Fig k={t('detail.attendance.bySex')} v={String(f.by_sex_sum)} />
        <Fig k={t('detail.attendance.byAgeSex')} v={f.by_age_sex_sum == null ? t('detail.notSet') : String(f.by_age_sex_sum)} />
        <Fig k={t('detail.attendance.distinct')} v={f.distinct_individuals == null ? t(`detail.attendance.reason_${f.distinct_reason ?? 'not_checked'}`) : String(f.distinct_individuals)} />
      </dl>
    </div>
  )
}

function Fig({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-narrow text-[10.5px] uppercase tracking-[0.1em] text-faint">{k}</dt>
      <dd className="m-0 text-ink">{v}</dd>
    </div>
  )
}

function Row({ f, rec, fid, refs, locale }: { f: KhldFieldDef; rec: KhldRecord; fid: KhldFormId; refs: Record<string, RefRow[]>; locale: string }) {
  const L = useKhldLabels(fid)
  const { t } = useTranslation('khld')
  const row = rec.row
  const wide = ['parts', 'multi', 'area', 'counts', 'checklist', 'rating', 'participants', 'participation_log'].includes(f.type)
  const label = f.type === 'checklist' && f.itemNo != null ? `${f.itemNo}. ${L.label(f)}` : L.label(f)
  const col = f.column ?? f.key

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
  const plain = (c: string, type: string): React.ReactNode => {
    const v = row[c]
    if (v == null || v === '') return notSet
    if (type === 'date') return formatShortDate(String(v), locale)
    if (type === 'month') return String(v).slice(0, 7)
    if (type === 'bool') return v ? t('form.yes') : t('form.no')
    return String(v)
  }
  const stampOf = (c: string) => {
    const s = row[`${c}_recorded_on`]
    return typeof s === 'string' ? <span className="ms-2 text-[12px] text-muted">{t('form.recordedOn', { when: formatShortDate(s, locale) })}</span> : null
  }

  switch (f.type) {
    case 'ident': return show(rec.person ? `${t(`form.idType.${rec.person.national_id ? 'national_id' : 'unhcr_number'}`)}${COLON} ${rec.person.national_id ?? rec.person.unhcr_number ?? ''}` : notSet, true)
    case 'person_name': return show(rec.person?.full_name ?? notSet)
    case 'person_phone': return show(rec.person?.phone ?? notSet, true)
    case 'person_sex': return show(rec.person?.sex ? refText('sex', (refs['sex'] ?? []).find((x) => x.code === rec.person?.sex)?.id) ?? rec.person.sex : notSet)
    case 'dob': case 'dob_age': {
      const p = rec.person
      if (!p) return show(notSet)
      const parts = [p.date_of_birth ? formatShortDate(p.date_of_birth, locale) : null, p.age_recorded != null ? `${t('form.age')}${COLON} ${p.age_recorded}` : null].filter(Boolean)
      return show(parts.length ? parts.join(` ${SEP} `) : notSet)
    }
    case 'text': case 'area': case 'number': case 'money': case 'date': case 'month':
      return show(plain(col, f.type))
    case 'select': return show(<>{refText(f.ref, row[col], f.other ? row[f.other] : undefined) ?? notSet}{f.stamp ? stampOf(col) : null}</>)
    case 'bool': {
      const v = row[col]
      return show(v == null ? <span className="text-ghost">{t('form.undecided')}</span> : <>{L.opt(f, v ? 'true' : 'false')}{f.stamp ? stampOf(col) : null}</>)
    }
    case 'multi': {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      if (rows.length === 0) return show(<span className="text-ghost">{t('form.noneSelected')}</span>)
      return show(<ul className="m-0 list-none p-0">{rows.map((o) => <li key={o.option_id}>{refText(f.ref, o.option_id, o.option_other) ?? ELLIPSIS}</li>)}</ul>)
    }
    case 'record': return show(<RecordLink table={f.table as KhldTable | undefined} id={row[col]} />)
    case 'parts':
      return show(
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {(f.parts ?? []).map((p: KhldPartDef) => (
            <div key={p.column} className="min-w-0">
              <dt className="font-narrow text-[10.5px] uppercase tracking-[0.1em] text-faint">{L.part(f, p.column) ?? label}</dt>
              <dd className="m-0">
                {p.type === 'select' ? (refText(p.ref, row[p.column], p.other ? row[p.other] : undefined) ?? notSet)
                : p.type === 'multi' ? (rec.options.filter((o) => o.question_code === p.question).map((o) => refText(p.ref, o.option_id, o.option_other)).join(` ${SEP} `) || notSet)
                : p.type === 'bool' ? (row[p.column] == null ? notSet : L.partOpt(f, p.column, row[p.column] ? 'true' : 'false'))
                : p.type === 'record' ? <RecordLink table={p.table as KhldTable | undefined} id={row[p.column]} />
                : p.type === 'person_phone' ? (rec.person?.phone ?? notSet)
                : plain(p.column, p.type)}
              </dd>
            </div>
          ))}
        </dl>,
      )
    case 'counts': {
      const cells = refs[f.ref ?? ''] ?? []
      const rows = rec.counts.filter((c) => c.field_code === f.fieldCode)
      if (rows.length === 0) return show(notSet)
      return show(
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {cells.map((c) => {
            const n = rows.find((x) => x.cell_id === c.id)
            return (
              <div key={c.id} className="flex items-baseline justify-between gap-2 border-b border-dotted border-border-default">
                <dt className="text-[13.5px] text-body">{refLabel(c, locale)}</dt>
                <dd className="m-0 font-semibold" dir="ltr">{n ? String(n.count) : '—'}</dd>
              </div>
            )
          })}
        </dl>,
      )
    }
    case 'checklist': {
      const c = rec.checklist.find((x) => x.item_no === f.itemNo)
      if (!c) return show(notSet)
      // The status's blank ("In place — decision no. and date: ____") is what
      // the detail fills, so the blank goes and the detail takes its place.
      const status = (refText(f.ref, c.status_id) ?? ELLIPSIS).replace(/:?\s*_{2,}\s*$/, '')
      return show(
        <>
          <span className="font-semibold">{status}</span>
          {c.detail ? <span>{COLON} {c.detail}</span> : null}
          {c.status_date || c.evidence_ref ? (
            <span className="ms-2 text-[12.5px] text-muted">
              {' '}{[c.status_date ? formatShortDate(c.status_date, locale) : null, c.evidence_ref].filter(Boolean).join(` ${SEP} `)}
            </span>
          ) : null}
        </>,
      )
    }
    case 'rating': {
      const items = refs[f.items ?? ''] ?? []
      const scale = refs[f.ratings ?? ''] ?? []
      if (rec.ratings.length === 0) return show(notSet)
      return show(
        <ul className="m-0 list-none p-0">
          {items.map((it) => {
            const r = rec.ratings.find((x) => x.item_id === it.id)
            return <li key={it.id}>{refLabel(it, locale)} {SEP} <strong>{r ? refLabel(scale.find((x) => x.id === r.rating_id), locale) : '—'}</strong></li>
          })}
        </ul>,
      )
    }
    case 'session': {
      // "Attended — date: ____": the blank is the date column beside it
      const st = refText(f.ref, row[f.column ?? ''])?.replace(/:?\s*_{2,}\s*$/, '')
      const d = row[f.dateColumn ?? '']
      return show(st ? <>{st}{typeof d === 'string' ? <span className="ms-2 text-[12.5px] text-muted">{' '}{formatShortDate(d, locale)}</span> : null}</> : notSet)
    }
    case 'participants': return show(<ParticipantsList rec={rec} locale={locale} />)
    case 'participation_log': return (
      <div className="min-w-0 sm:col-span-2">
        <ParticipationLog label={label} volunteerId={typeof row['volunteer_id'] === 'string' ? (row['volunteer_id'] as string) : ''} />
      </div>
    )
    case 'readonly': return show(<Derived f={f} rec={rec} refs={refs} />, f.derived === 'reference' || f.derived === 'vendor_reference')
    default: return null
  }
}

function Derived({ f, rec, refs }: { f: KhldFieldDef; rec: KhldRecord; refs: Record<string, RefRow[]> }) {
  const { t } = useTranslation('khld')
  const d = useDerived(f, { record: rec, values: {}, mode: 'detail', refs, person: rec.person, duplicateOf: typeof rec.row['person_id'] === 'string' ? 'person' : 'enterprise' })
  const tone = d.tone === 'ok' ? 'text-success' : d.tone === 'warn' ? 'text-attention-ink' : ''
  return (
    <>
      <span className={tone}>{d.text ?? <span className="text-ghost">{t('detail.notSet')}</span>}</span>
      {d.note ? <span className="ms-2 text-[12.5px] text-muted">{d.note}</span> : null}
    </>
  )
}

/** The occasion's participations, by volunteer. */
function ParticipantsList({ rec, locale }: { rec: KhldRecord; locale: string }) {
  const { t } = useTranslation('khld')
  if (rec.participations.length === 0) return <span className="text-ghost">{t('form.participants.none')}</span>
  return (
    <ul className="m-0 list-none p-0">
      {rec.participations.map((p) => (
        <li key={p.id} className="flex flex-wrap gap-x-3">
          <RecordLink table="khld_volunteer" id={p.volunteer_id} />
          <span className="text-muted">{formatShortDate(p.participated_on, locale)}</span>
          {p.hours != null ? <span className="text-muted" dir="ltr">{t('form.log.hours')}{COLON} {String(p.hours)}</span> : null}
          <span className={p.verified ? 'text-success' : 'text-muted'}>{p.verified ? t('form.participants.verified') : t('form.participants.unverified')}</span>
        </li>
      ))}
    </ul>
  )
}

/** A link to another Khalidiyah record, named by reference and title (or the person, for a volunteer or vendor). */
function RecordLink({ table, id }: { table: KhldTable | undefined; id: unknown }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const rid = typeof id === 'string' ? id : undefined
  const rec = useKhldRecord(table ?? 'khld_activity', table ? rid : undefined)
  if (!rid) return <span className="text-ghost">{t('detail.notSet')}</span>
  if (!rec.data) return <>{ELLIPSIS}</>
  const row = rec.data.row
  const ref = typeof row['reference'] === 'string' ? (row['reference'] as string) : null
  const title = ['name', 'enterprise_name', 'event_title', 'market_name', 'description'].map((c) => row[c]).find((v) => typeof v === 'string' && v) as string | undefined
  const who = rec.data.person?.full_name
  const date = ['event_date', 'market_date', 'campaign_date', 'date', 'meeting_date', 'reg_date'].map((c) => row[c]).find((v) => typeof v === 'string') as string | undefined
  const text = [ref, who ?? title, date ? formatShortDate(date, locale) : null].filter(Boolean).join(` ${SEP} `) || rid.slice(0, 8)
  const fidOf = table ? formFor(table, row) : undefined
  return fidOf ? <Link to={`/khld/${fidOf}/${rid}`} className="text-ink underline">{text}</Link> : <>{text}</>
}

export default KhldDetailScreen
