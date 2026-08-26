import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, MODULES, ACCENT_BG } from '../modules'
import { useAuth } from '../auth/AuthProvider'
import { can, canWriteModule } from '../auth/permissions'
import { useMutations } from '../hooks/useData'
import { useModuleDetail } from '../data/moduleDetail'
import { useDeletePartnership } from '../data/partnerships'
import { useDeleteExhibition } from '../data/exhibitions'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { BidiIsolate } from '../components/BidiIsolate'
import {
  AccentRule,
  BackLink,
  Card,
  OutlinePill,
  PageHead,
  Pill,
  PrimaryButton,
  SecondaryButton,
} from '../ui/primitives'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { NotFound } from './NotFound'
import { formatDate } from '../lib/format'
import { EMPTY } from '../ui/glyphs'

/**
 * A single record, copied from the prototype.
 *
 * Two columns of key/value rows, each a 1px-ruled line with the label in
 * Narrow uppercase on the start edge and the value bold on the end edge. The
 * status value takes its own colour; everything else stays ink.
 */
export function DetailScreen() {
  const { module, id } = useParams()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation(['forms', 'common', 'nav'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const toast = useToast()
  const mutations = useMutations()
  const { role } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const valid = isModuleId(module)
  const tx = makeTranslate(t)
  const detail = useModuleDetail(valid ? module : 'tp', id ?? '', tx, locale)
  const record = detail.record

  // Live soft delete for module 1. Both are created unconditionally so the
  // hook order is stable when the route's :module param changes.
  // One hook per live module, all called unconditionally so hook order cannot
  // shift when the :module route param changes. A module with no entry here
  // still falls through to the session-local mock remove -- which is why a
  // delete that looked like it worked did nothing before Exhibitions was added.
  const delTraining = useDeletePartnership('training')
  const delProduction = useDeletePartnership('production_support')
  const delExhibition = useDeleteExhibition()
  const liveDelete =
    module === 'tp'
      ? delTraining
      : module === 'pp'
        ? delProduction
        : module === 'ex'
          ? delExhibition
          : null

  if (!valid) return <NotFound />
  if (detail.isLoading) {
    return (
      <>
        <AccentRule className="bg-ink" />
        <DetailSkeleton />
      </>
    )
  }
  if (detail.isError) return <ErrorState error={detail.error} onRetry={detail.refetch} />
  if (!record) return <NotFound />

  const meta = MODULES[module]
  const isRegistration = module === 'rg'
  const pending = record.status?.tone === 'pending'
  const statusColour =
    record.status?.tone === 'ok'
      ? 'text-success'
      : record.status?.tone === 'err'
        ? 'text-error'
        : record.status?.tone === 'pending' || record.status?.tone === 'warn'
          ? 'text-warning'
          : 'text-faint'

  return (
    <>
      <PageHead
        back={
          <BackLink onClick={() => navigate(`/forms/${module}`)}>
            {t(`nav:module.${module}`)}
          </BackLink>
        }
        chips={
          <>
            <Pill className={ACCENT_BG[meta.accent]}>{t(`nav:objective.${module}`)}</Pill>
            <OutlinePill>{t('forms:readOnly')}</OutlinePill>
          </>
        }
        title={record.title}
        size="md"
        action={
          <>
            {can(role, 'record.delete') ? (
              <SecondaryButton tone="danger" onClick={() => setConfirmDelete(true)}>
                {t('common:actions.delete')}
              </SecondaryButton>
            ) : null}
            {canWriteModule(role, module) ? (
              <PrimaryButton onClick={() => navigate(`/forms/${module}/${record.id}/edit`)}>
                {t('forms:editRecord')}
              </PrimaryButton>
            ) : null}
          </>
        }
      />
      {record.subtitle ? (
        <p className="-mt-2 mb-4 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-muted">
          <BidiIsolate>{record.subtitle}</BidiIsolate>
        </p>
      ) : null}
      <AccentRule className={ACCENT_BG[meta.accent]} />

      {/* Coordinator approve / reject, registrations only, pending only. */}
      {isRegistration && pending && can(role, 'registration.review') ? (
        <Card
          dashed
          className="mt-[26px] flex flex-col gap-3 border-attention-border bg-attention-bg p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[15px] font-semibold text-attention-ink">
            {t('forms:registration.awaitingApproval')}
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <SecondaryButton
              tone="danger"
              onClick={() => {
                mutations.setRegistrationStatus(record.id, 'rejected')
                toast.fire({
                  tag: t('common:toast.updated'),
                  title: t('forms:registration.rejected'),
                })
              }}
            >
              {t('forms:registration.reject')}
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                mutations.setRegistrationStatus(record.id, 'approved')
                toast.fire({
                  tag: t('common:toast.updated'),
                  title: t('forms:registration.approved'),
                  sub: t('forms:registration.approvedSub'),
                })
              }}
            >
              {t('forms:registration.approve')}
            </PrimaryButton>
          </div>
        </Card>
      ) : null}

      <dl className="mt-[26px] grid grid-cols-1 gap-x-11 sm:grid-cols-2">
        {record.fields.map((f) => (
          <div
            key={f.labelKey}
            className="flex justify-between gap-6 border-b border-border-default py-3"
          >
            <dt className="flex-none basis-[42%] font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {t(`forms:${f.labelKey}`)}
            </dt>
            <dd
              className="text-[15px] font-semibold text-ink"
              style={{ textAlign: 'end', textWrap: 'pretty' }}
            >
              {f.value ? (
                f.ltr ? (
                  <BidiIsolate className="font-narrow tracking-wide">{f.value}</BidiIsolate>
                ) : (
                  f.value
                )
              ) : (
                <span className="text-ghost">{EMPTY}</span>
              )}
            </dd>
          </div>
        ))}
        {record.status ? (
          <div className="flex justify-between gap-6 border-b border-border-default py-3">
            <dt className="flex-none basis-[42%] font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
              {t('forms:detail.recordStatus')}
            </dt>
            <dd className={`text-end text-[15px] font-semibold ${statusColour}`}>
              {record.status.text}
            </dd>
          </div>
        ) : null}
      </dl>

      {liveDelete?.error ? (
        <WriteError error={liveDelete.error} onDismiss={() => liveDelete.reset()} />
      ) : null}

      <p className="mt-5 font-narrow text-[11.5px] font-semibold uppercase tracking-[0.1em] text-faint">
        {t('forms:enteredBy', {
          by: record.by,
          at: record.at ? formatDate(new Date(record.at), locale) : EMPTY,
        })}
      </p>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t('forms:deleteTitle')}
        description={t('forms:deleteBody', {
          name: record.title,
          module: t(`nav:module.${module}`),
        })}
        note={t(`forms:deleteNote.${module}`)}
        confirmLabel={t('forms:deleteConfirm')}
        cancelLabel={t('forms:deleteCancel')}
        onConfirm={() => {
          const done = () => {
            setConfirmDelete(false)
            toast.fire({
              tone: 'destructive',
              tag: t('common:toast.deleted'),
              title: t('forms:toast.deleted'),
              sub: t(`nav:module.${module}`),
            })
            navigate(`/forms/${module}`)
          }
          if (liveDelete) {
            // The database has the final say. If RLS refuses -- 05 section 4
            // gives delete to the coordinator alone -- the dialog stays open
            // and says so, rather than closing as though it had worked.
            liveDelete.mutate(record.id, {
              onSuccess: done,
              onError: () => setConfirmDelete(false),
            })
            return
          }
          mutations.remove(module, record.id)
          done()
        }}
      />
    </>
  )
}

export default DetailScreen
