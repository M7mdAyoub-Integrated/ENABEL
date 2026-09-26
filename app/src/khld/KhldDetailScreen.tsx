import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackLink, DangerButton, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import {
  identifierOf, useKhldPicker, useKhldRecord, useKhldRefs, usePersonNames, useSetKhldDeleted, useSetKhldPublished,
  useSetVolunteerStatus, type KhldRecord, type VolunteerStatus,
} from '../data/khld'
import { useAttachments } from '../data/evidence'
import { EvidencePanel } from '../components/EvidencePanel'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { answersFromRecord, isOn, listsOf, type Answers } from './answers'
import { formDef, formOfTable, useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef, KhldFormDef, KhldTable } from './types'
import { BidiIsolate } from '../components/BidiIsolate'
import { SEP, ELLIPSIS, COLON } from '../ui/glyphs'

/**
 * A saved record, field by field in the sheet's order and wording, with the
 * files of each file-upload field below the answers. Reads what the database
 * holds; the writes here are the coordinator's: delete / restore, publishing
 * an activity or a market, and reviewing a volunteer's registration. Every
 * one is read back (data/khld.ts), because RLS filters an UPDATE it will not
 * permit instead of refusing it.
 *
 * A field whose answer was not chosen reads "not asked", from the same
 * reading of `when` the form used (answers.ts), so the two screens agree.
 */
export function KhldDetailScreen() {
  const { form } = useParams()
  return <Detail key={form} fid={form as KhldFormId} />
}

function Detail({ fid }: { fid: KhldFormId }) {
  const { id } = useParams()
  const def = formDef(fid)
  const L = useKhldLabels(fid)
  const { t, i18n } = useTranslation(['khld', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const rec = useKhldRecord(def.table, id)
  const setDeleted = useSetKhldDeleted(def.table)
  const [confirm, setConfirm] = useState(false)
  const refs = useKhldRefs(useMemo(() => listsOf(def), [def]))
  const answers = useMemo(() => (rec.data ? answersFromRecord(def, rec.data) : null), [def, rec.data])

  if (rec.isLoading) return (<><PageHead eyebrow={L.sheet} title={L.short} size="md" /><DetailSkeleton /></>)
  if (rec.isError || !rec.data || !answers) return <ErrorState error={rec.error} onRetry={() => void rec.refetch()} />
  const r = rec.data
  const deleted = !!r.row.deleted_at
  const reference = typeof r.row['reference'] === 'string' ? (r.row['reference'] as string) : null
  const titleCol = ['activity_name', 'campaign_name', 'name', 'title', 'focal_point_name', 'member_name', 'contributor_name'].find((c) => typeof r.row[c] === 'string' && r.row[c])
  const heading = titleCol ? (r.row[titleCol] as string) : r.person?.full_name ?? L.short
  const files = def.fields.filter((f) => f.kind === 'file')

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(`/khld/${fid}`)}>{t('khld:form.back')}</BackLink>}
        eyebrow={`${L.sheet}${reference ? ` ${SEP} ${reference}` : ''}`}
        title={heading}
        {...(heading.toLowerCase() === L.title.toLowerCase() || heading === L.short ? {} : { description: L.title })}
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

      {def.public ? <ReviewPanel id={id!} row={r.row} locale={locale} /> : null}
      {def.published && !deleted ? (
        <PublishPanel table={def.table as 'khld_activity' | 'khld_market'} id={id!} published={r.row['is_published'] === true} />
      ) : null}

      <section className="mt-[26px]">
        <SectionRule title={L.title} />
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {def.fields.filter((f) => f.kind !== 'file').map((f) => (
            <Row key={f.id} f={f} def={def} rec={r} fid={fid} refs={refs} answers={answers} locale={locale} />
          ))}
        </dl>
        <p className="mb-0 mt-3 text-[12.5px] text-muted">{t('khld:detail.feeds')}{COLON} <span dir="ltr">{def.indicators.join(` ${SEP} `)}</span></p>
      </section>

      {files.map((f) => (
        <FileField key={f.id} f={f} def={def} fid={fid} id={id!} deleted={deleted} on={isOn(def, f, answers, refs)} />
      ))}

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

/** A file-upload field: its files, under its own label, and a note when the form asks for one and none is there. */
function FileField({ f, def, fid, id, deleted, on }: { f: KhldFieldDef; def: KhldFormDef; fid: KhldFormId; id: string; deleted: boolean; on: boolean }) {
  const L = useKhldLabels(fid)
  const { t } = useTranslation('khld')
  const files = useAttachments(def.table, id, f.id)
  const missing = on && !!f.required && files.data !== undefined && files.data.length === 0
  return (
    <div>
      <EvidencePanel
        entityType={def.table}
        entityId={id}
        fieldCode={f.id}
        title={L.label(f)}
        maxFiles={f.maxFiles}
        note={on ? t('detail.files.max', { max: f.maxFiles ?? 5 }) : t('form.notApplicable')}
        deleted={deleted || !on}
      />
      {missing ? (
        <p role="status" className="mt-2 border-s-[3px] border-amber bg-attention-bg px-3 py-2 text-[13.5px] text-attention-ink">{t('detail.files.requiredMissing')}</p>
      ) : null}
    </div>
  )
}

/**
 * A volunteer's registration (0159): who entered it, where it stands, and the
 * coordinator's decision. Only an approved registration counts (F2, SO3-0).
 */
function ReviewPanel({ id, row, locale }: { id: string; row: Record<string, unknown>; locale: string }) {
  const { t } = useTranslation('khld')
  const { role } = useAuth()
  const set = useSetVolunteerStatus()
  const status = (row['application_status'] as VolunteerStatus | undefined) ?? 'approved'
  const reviewed = typeof row['reviewed_on'] === 'string' ? formatShortDate(row['reviewed_on'] as string, locale) : null
  const tone = status === 'approved' ? 'border-success' : status === 'rejected' ? 'border-error' : 'border-amber bg-attention-bg'
  const actions: VolunteerStatus[] = status === 'submitted' ? ['approved', 'rejected'] : ['submitted']
  return (
    <div className={`mt-2 flex flex-wrap items-center justify-between gap-3 border-s-[3px] px-4 py-3 ${tone}`}>
      <div>
        <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('detail.review.title')}{COLON} </span>
        <span className="text-[15px] font-semibold text-ink">{t(`detail.review.${status}`)}</span>
        <p className="mb-0 mt-1 text-[13px] text-muted">
          {row['submitted_publicly'] === true ? t('detail.review.public') : t('detail.review.staff')}
          {reviewed ? ` ${SEP} ${t('detail.review.reviewedOn', { when: reviewed })}` : ''}
        </p>
        <p className="mb-0 mt-1 text-[13px] text-muted" style={{ textWrap: 'pretty' }}>{t('detail.review.note')}</p>
        {set.error ? <WriteError error={set.error} onDismiss={set.reset} /> : null}
      </div>
      {can(role, 'record.edit') ? (
        <div className="flex gap-2">
          {actions.map((a) => (
            <SecondaryButton key={a} disabled={set.isPending} onClick={() => void set.mutateAsync({ id, status: a })}>
              {a === 'approved' ? t('detail.review.approve') : a === 'rejected' ? t('detail.review.reject') : t('detail.review.reopen')}
            </SecondaryButton>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Whether this activity or market is on the public page. A coordinator's
 * switch; the public view also requires the end date to be today or later,
 * which is said here so a published past event is not looked for.
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

function Row({ f, def, rec, fid, refs, answers, locale }: {
  f: KhldFieldDef; def: KhldFormDef; rec: KhldRecord; fid: KhldFormId; refs: Record<string, RefRow[]>; answers: Answers; locale: string
}) {
  const L = useKhldLabels(fid)
  const { t } = useTranslation('khld')
  const row = rec.row
  const col = f.column ?? ''
  const wide = f.kind === 'multi' || f.kind === 'area' || f.kind === 'records' || f.kind === 'likert'
  const show = (content: React.ReactNode, ltr = false) => (
    <div className={`min-w-0 border-b border-border-default pb-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <span className="me-1.5 text-faint" dir="ltr">{f.id}</span>{L.label(f)}
      </dt>
      <dd className="mt-1 text-[15px] text-ink">{ltr ? <BidiIsolate>{content}</BidiIsolate> : content}</dd>
    </div>
  )
  const notSet = <span className="text-ghost">{t('detail.notSet')}</span>
  if (!isOn(def, f, answers, refs)) return show(<span className="text-ghost">{t('form.notApplicable')}</span>)
  const refText = (list: string | undefined, id: unknown, other?: unknown) => {
    const r = (refs[list ?? ''] ?? []).find((x) => x.id === id)
    if (!r) return undefined
    const base = refLabel(r, locale)
    return r.allows_free_text && typeof other === 'string' && other ? `${base}${COLON} ${other}` : base
  }
  const v = row[col]

  switch (f.kind) {
    case 'id_type': return show(refText(f.list, v) ?? notSet)
    case 'ident': {
      const i = rec.person ? identifierOf(rec.person) : null
      return show(i?.value ?? notSet, true)
    }
    case 'person_name': return show(rec.person?.full_name ?? notSet)
    case 'person_phone': return show(rec.person?.phone ?? notSet, true)
    case 'person_sex': {
      const s = rec.person?.sex
      const r = (refs[f.list ?? 'sex'] ?? []).find((x) => x.code === s)
      return show(s ? (r ? refLabel(r, locale) : s) : notSet)
    }
    case 'dob': return show(rec.person?.date_of_birth ? formatShortDate(rec.person.date_of_birth, locale) : notSet)
    case 'text': return show(v == null || v === '' ? notSet : String(v), !!f.ltr)
    case 'area': return show(v == null || v === '' ? notSet : <span className="whitespace-pre-wrap">{String(v)}</span>)
    case 'int': case 'money': return show(v == null ? notSet : String(v), true)
    case 'percent': return show(v == null ? notSet : `${String(v)}%`, true)
    case 'date': return show(typeof v === 'string' ? formatShortDate(v, locale) : notSet)
    case 'stamp': return show(typeof v === 'string' ? formatShortDate(v, locale) : notSet)
    case 'reference': return show(typeof row['reference'] === 'string' ? (row['reference'] as string) : notSet, true)
    case 'bool': return show(v == null ? notSet : L.opt(f, v ? 'true' : 'false'))
    case 'likert': return show(v == null ? notSet : L.opt(f, String(v)))
    case 'select': return show(refText(f.list, v, f.other ? row[f.other] : undefined) ?? notSet)
    case 'multi': {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      if (rows.length === 0) return show(notSet)
      return show(<ul className="m-0 list-none p-0">{rows.map((o) => <li key={o.option_id}>{refText(f.list, o.option_id, o.option_other) ?? ELLIPSIS}</li>)}</ul>)
    }
    case 'record':
      if (answers.extras[f.id]) return show(L.extra(f) ?? notSet)
      return show(<RecordLink table={f.table as KhldTable | undefined} id={v} />)
    case 'records':
      if (rec.partners.length === 0) return show(notSet)
      return show(<ul className="m-0 list-none p-0">{rec.partners.map((pid) => <li key={pid}><RecordLink table="khld_partner" id={pid} /></li>)}</ul>)
    case 'occasion': {
      const [kind, oid] = answers.occasion.split(':')
      if (!oid) return show(notSet)
      return show(<>{t(`form.occasion.${kind === 'campaign' ? 'campaign' : 'activity'}`)} {SEP} <RecordLink table={kind === 'campaign' ? 'khld_campaign' : 'khld_activity'} id={oid} /></>)
    }
    case 'person_ref': return show(<PersonName id={v} />)
    case 'shown': {
      const of = def.fields.find((x) => x.id === f.of)
      const ofId = of?.column ? row[of.column] : undefined
      if (of?.kind === 'person_ref') return show(<PersonName id={ofId} nameOnly />)
      return show(<VolunteerName id={ofId} />)
    }
    default: return null
  }
}

function PersonName({ id, nameOnly }: { id: unknown; nameOnly?: boolean }) {
  const { t } = useTranslation('khld')
  const pid = typeof id === 'string' ? id : ''
  const people = usePersonNames(pid ? [pid] : [])
  if (!pid) return <span className="text-ghost">{t('detail.notSet')}</span>
  const p = people.data?.[pid]
  if (!p) return <>{ELLIPSIS}</>
  const i = identifierOf(p)
  return <>{p.full_name}{!nameOnly && i ? <span className="ms-2 text-[13px] text-muted" dir="ltr">{i.value}</span> : null}</>
}

function VolunteerName({ id }: { id: unknown }) {
  const { t } = useTranslation('khld')
  const picks = useKhldPicker('khld_volunteer')
  if (typeof id !== 'string') return <span className="text-ghost">{t('detail.notSet')}</span>
  const r = picks.data?.find((x) => x.id === id)
  return <>{r ? r.name : ELLIPSIS}</>
}

/** A link to another Khalidiyah record, named by reference, title and date. */
function RecordLink({ table, id }: { table: KhldTable | undefined; id: unknown }) {
  const { t, i18n } = useTranslation('khld')
  const locale = i18n.resolvedLanguage ?? 'en'
  const rid = typeof id === 'string' ? id : undefined
  const picks = useKhldPicker(table)
  if (!rid || !table) return <span className="text-ghost">{t('detail.notSet')}</span>
  const r = picks.data?.find((x) => x.id === rid)
  const text = r ? [r.label, r.date ? formatShortDate(r.date, locale) : null].filter(Boolean).join(` ${SEP} `) : picks.isLoading ? ELLIPSIS : rid.slice(0, 8)
  const fidOf = formOfTable(table)
  return fidOf ? <Link to={`/khld/${fidOf}/${rid}`} className="text-ink underline">{text}</Link> : <>{text}</>
}

export default KhldDetailScreen
