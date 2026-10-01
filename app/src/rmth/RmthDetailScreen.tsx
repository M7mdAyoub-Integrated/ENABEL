import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BackLink, DangerButton, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { refLabel, type RefRow } from '../data/refTables'
import {
  usePersonNames, useRmthPicker, useRmthRecord, useRmthRefs, useSetRmthDeleted, useSetRmthPublished, type RmthRecord,
} from '../data/rmth'
import { formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { answersFromRecord, categoriesOf, isOn, listsOf, type AnswerContext, type Answers } from './answers'
import { formDef, formOfTable, isRmthFormId, useRmthLabels } from './labels'
import { pickLabel } from './picks'
import NotFound from '../routes/NotFound'
import type { RmthFormId } from './forms.generated'
import type { RmthFieldDef, RmthFormDef } from './types'
import { BidiIsolate } from '../components/BidiIsolate'
import { PublishPanel as SharedPublishPanel } from '../ui/PublishPanel'
import { SEP, ELLIPSIS, COLON } from '../ui/glyphs'

/**
 * A saved record, field by field in the sheet's order and wording, each with
 * its Field ID. Reads what the database holds; the writes here are the
 * coordinator's: delete / restore, and on an activity (FORM-03) whether it is
 * on the public page. Every one is read back (data/rmth.ts), because RLS
 * filters an UPDATE it will not permit instead of refusing it.
 *
 * A field whose answer was not chosen reads "not asked", from the same
 * reading of `when` the form used (answers.ts), so the two screens agree.
 */
export function RmthDetailScreen() {
  const { form } = useParams()
  // an unknown form id, whatever guards the route (RmthListScreen)
  if (!isRmthFormId(form)) return <NotFound />
  return <Detail key={form} fid={form} />
}

function Detail({ fid }: { fid: RmthFormId }) {
  const { id } = useParams()
  const def = formDef(fid)
  const L = useRmthLabels(fid)
  const { t, i18n } = useTranslation(['rmth', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const toast = useToast()
  const { role } = useAuth()
  const rec = useRmthRecord(def.table, id)
  const setDeleted = useSetRmthDeleted(def.table)
  const [confirm, setConfirm] = useState(false)
  const refs = useRmthRefs(useMemo(() => listsOf(def), [def]))
  const activities = useRmthPicker(def.fields.some((f) => f.table === 'rmth_activity') ? 'rmth_activity' : undefined)
  const ctx: AnswerContext = { refs, activityCategory: categoriesOf(activities.data, refs) }
  const answers = useMemo(() => (rec.data ? answersFromRecord(def, rec.data) : null), [def, rec.data])

  if (rec.isLoading) return (<><PageHead eyebrow={L.sheet} title={L.short} size="md" /><DetailSkeleton /></>)
  if (rec.isError || !rec.data || !answers) return <ErrorState error={rec.error} onRetry={() => void rec.refetch()} />
  const r = rec.data
  const deleted = !!r.row.deleted_at
  const reference = typeof r.row['reference'] === 'string' ? (r.row['reference'] as string) : null
  const heading = r.person?.full_name ?? reference ?? L.short

  return (
    <>
      <PageHead
        back={<BackLink onClick={() => navigate(`/rmth/${fid}`)}>{t('rmth:form.back')}</BackLink>}
        eyebrow={`${L.sheet}${reference && heading !== reference ? ` ${SEP} ${reference}` : ''}`}
        title={heading}
        {...(heading === L.short ? {} : { description: L.title })}
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

      {def.published && !deleted ? <PublishPanel id={id!} published={r.row['is_published'] === true} /> : null}

      <section className="mt-[26px]">
        <SectionRule title={L.title} />
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {def.fields.map((f) => (
            <Row key={f.id} f={f} def={def} rec={r} fid={fid} refs={refs} answers={answers} ctx={ctx} locale={locale} />
          ))}
        </dl>
        <p className="mb-0 mt-3 text-[12.5px] text-muted">{t('rmth:detail.feeds')}{COLON} <span dir="ltr">{def.indicators.join(` ${SEP} `)}</span></p>
      </section>

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

/**
 * Whether this activity is on Ramtha's public page: the owner's button of
 * 1 October 2026. A coordinator's switch; the public view also requires the
 * activity not to have ended (a business incubator has no end), which is
 * said here so a published past activity is not looked for.
 */
function PublishPanel({ id, published }: { id: string; published: boolean }) {
  const { t } = useTranslation('rmth')
  const { role } = useAuth()
  const set = useSetRmthPublished()
  return (
    <SharedPublishPanel
      published={published}
      pending={set.isPending}
      canToggle={can(role, 'record.edit')}
      onToggle={() => void set.mutateAsync({ id, published: !published })}
      body={t('detail.publish.note')}
      error={set.error ? <WriteError error={set.error} onDismiss={set.reset} /> : undefined}
    />
  )
}

function Row({ f, def, rec, fid, refs, answers, ctx, locale }: {
  f: RmthFieldDef; def: RmthFormDef; rec: RmthRecord; fid: RmthFormId; refs: Record<string, RefRow[]>; answers: Answers; ctx: AnswerContext; locale: string
}) {
  const L = useRmthLabels(fid)
  const { t } = useTranslation('rmth')
  const row = rec.row
  const col = f.column ?? ''
  const wide = f.kind === 'multi'
  const show = (content: React.ReactNode, ltr = false) => (
    <div className={`min-w-0 border-b border-border-default pb-2 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
        <span className="me-1.5 text-faint" dir="ltr">{f.id}</span>{L.label(f)}
      </dt>
      <dd className="mt-1 text-[15px] text-ink">{ltr ? <BidiIsolate>{content}</BidiIsolate> : content}</dd>
    </div>
  )
  const notSet = <span className="text-ghost">{t('detail.notSet')}</span>
  if (!isOn(def, f, answers, ctx)) return show(<span className="text-ghost">{t('detail.notAsked')}</span>)
  const refText = (list: string | undefined, id: unknown, other?: unknown) => {
    const r = (refs[list ?? ''] ?? []).find((x) => x.id === id)
    if (!r) return undefined
    const base = refLabel(r, locale)
    return r.allows_free_text && typeof other === 'string' && other ? `${base}${COLON} ${other}` : base
  }
  const v = row[col]

  switch (f.kind) {
    case 'ident': return show(rec.person?.national_id ?? notSet, true)
    case 'person_name': return show(rec.person?.full_name ?? notSet)
    case 'person_sex': {
      const s = rec.person?.sex
      const r = (refs[f.list ?? 'sex'] ?? []).find((x) => x.code === s)
      return show(s ? (r ? refLabel(r, locale) : s) : notSet)
    }
    case 'text': return show(v == null || v === '' ? notSet : String(v))
    case 'int': case 'number': return show(v == null ? notSet : String(v), true)
    case 'date': case 'stamp': return show(typeof v === 'string' ? formatShortDate(v, locale) : notSet)
    case 'reference': return show(typeof row['reference'] === 'string' ? (row['reference'] as string) : notSet, true)
    case 'bool': return show(v == null ? notSet : L.opt(f, v ? 'true' : 'false'))
    case 'select': case 'calc': return show(refText(f.list, v, f.other ? row[f.other] : undefined) ?? notSet)
    case 'multi': {
      const rows = rec.options.filter((o) => o.question_code === f.question)
      if (rows.length === 0) return show(notSet)
      return show(<ul className="m-0 list-none p-0">{rows.map((o) => <li key={o.option_id}>{refText(f.list, o.option_id, o.option_other) ?? ELLIPSIS}</li>)}</ul>)
    }
    case 'record': return show(<RecordLink table={f.table} id={v} refs={refs} />)
    case 'person': return show(<PersonName id={v} />)
    default: return null
  }
}

function PersonName({ id }: { id: unknown }) {
  const { t } = useTranslation('rmth')
  const pid = typeof id === 'string' ? id : ''
  const people = usePersonNames(pid ? [pid] : [])
  if (!pid) return <span className="text-ghost">{t('detail.notSet')}</span>
  const p = people.data?.[pid]
  if (!p) return <>{ELLIPSIS}</>
  return <>{p.full_name}{p.national_id ? <span className="ms-2 text-[13px] text-muted" dir="ltr">{p.national_id}</span> : null}</>
}

/** A link to the project or activity a field names, by its ID and what the sheet records of it. */
function RecordLink({ table, id, refs }: { table: string | undefined; id: unknown; refs: Record<string, RefRow[]> }) {
  const { t, i18n } = useTranslation('rmth')
  const locale = i18n.resolvedLanguage ?? 'en'
  const rid = typeof id === 'string' ? id : undefined
  const picks = useRmthPicker(table === 'rmth_activity' || table === 'rmth_project' ? table : undefined)
  if (!rid || !table) return <span className="text-ghost">{t('detail.notSet')}</span>
  const p = picks.data?.find((x) => x.id === rid)
  const text = p ? pickLabel(table, p, refs, locale) : picks.isLoading ? ELLIPSIS : rid.slice(0, 8)
  const fidOf = formOfTable(table)
  return fidOf ? <Link to={`/rmth/${fidOf}/${rid}`} className="text-ink underline">{text}</Link> : <>{text}</>
}

export default RmthDetailScreen
