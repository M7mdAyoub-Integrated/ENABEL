import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { makeTranslate } from '../i18n/tx'
import { isModuleId, isRetiredModule, MODULES, ACCENT_BG, type LiveModuleId } from '../modules'
import { useAuth } from '../auth/AuthProvider'
import { can, canWriteModule } from '../auth/permissions'
import { useModuleDetail } from '../data/moduleDetail'
import { usePartner, useDeletePartner } from '../data/partnerships'
import { useDeleteExhibition } from '../data/exhibitions'
import { useDeleteCompletion } from '../data/completions'
import { useDeleteOfficeService } from '../data/officeServices'
import { useDeleteGuidanceRecord } from '../data/guidance'
import { DetailSkeleton, ErrorState, WriteError } from '../ui/states'
import { BidiIsolate } from '../components/BidiIsolate'
import { ContributionLog } from '../components/ContributionLog'
import { PartnershipsPanel } from '../components/PartnershipsPanel'
import {
  AccentRule,
  BackLink,
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
 * What every live module's delete hook has in common. Deliberately structural
 * rather than the full useMutation type: this screen only ever calls `mutate`
 * with an id, reads `error`, and calls `reset()`.
 */
type DeleteMutation = {
  mutate: (id: string, opts?: { onSuccess?: () => void; onError?: () => void }) => void
  error: unknown
  reset: () => void
}

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
  const { role } = useAuth()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const valid = isModuleId(module)
  const tx = makeTranslate(t)
  const detail = useModuleDetail(valid ? module : 'tp', id ?? '', tx, locale)
  const record = detail.record

  // One hook per live module, all called unconditionally so hook order cannot
  // shift when the :module route param changes.
  //
  // ── WHY THIS IS A Record<LiveModuleId, …> AND NOT A CHAIN OF TERNARIES ──
  //
  // It was a chain ending in `: null`, and twice a live module was added
  // without an entry. `ex` first, then `os` -- and the symptom both times was
  // the worst kind: the delete fell through to the session-local MOCK remove,
  // the dialog closed, a "Deleted" toast fired, the row vanished from the
  // screen, and the database was untouched. B1.2 did not move and nothing
  // anywhere said so. The old comment above this map warned about exactly that
  // and did not prevent the second one.
  //
  // Keying on LiveModuleId makes `tsc` the check: adding a module to
  // MODULE_IDS without adding it to RETIRED_MODULE_IDS makes this object fail
  // to compile until a real delete is wired in. Confirmed by removing the `gd`
  // line -- "Property 'gd' is missing in type" -- and restoring it.
  const delPartner = useDeletePartner()
  // The agreements this organisation holds, so the contributions log knows
  // whether it has to ASK which one a hand-entered contribution belongs to.
  const partnerQ = usePartner(module === 'pn' ? id : undefined, module === 'pn')
  const heldPartnerships = (partnerQ.data?.partnerships ?? []).map((ps) => ({
    id: ps.id,
    type: ps.type as string,
  }))
  const delExhibition = useDeleteExhibition()
  const delCompletion = useDeleteCompletion()
  const delOffice = useDeleteOfficeService()
  const delGuidance = useDeleteGuidanceRecord()
  const LIVE_DELETES: Record<LiveModuleId, DeleteMutation> = {
    pn: delPartner,
    tc: delCompletion,
    ex: delExhibition,
    os: delOffice,
    gd: delGuidance,
  }
  // A retired module has no screen -- App.tsx redirects every /forms/<id>
  // shape for it before this component mounts -- so there is nothing to
  // delete and nothing to fall through to.
  const liveDelete: DeleteMutation | null = isRetiredModule(module ?? '')
    ? null
    : (LIVE_DELETES[module as LiveModuleId] ?? null)

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

      {/* Publishing and the booth decisions live on their own screen, the way
          training sessions do. Without this link it is reachable only by
          typing the URL -- which is exactly how /sessions was missed. */}
      {module === 'ex' && can(role, 'record.edit') ? (
        <Link
          to={`/exhibitions/${id}`}
          className="mt-4 inline-flex min-h-11 items-center bg-amber px-5 font-narrow text-[12.5px] font-bold uppercase tracking-[0.12em] text-bg no-underline hover:text-bg"
        >
          {t('forms:exhibitionAdmin.manageThisMarket')}
        </Link>
      ) : null}

      {/* ── THE REGISTRATION APPROVE / REJECT PANEL WAS REMOVED HERE ──
          It rendered on `module === 'rg'`, which has been retired and
          redirected to /forms/ex since 2f8edff, so it was unreachable. Worse
          than unreachable: its buttons called `mutations.setRegistrationStatus`
          — the SESSION-LOCAL MOCK — and then fired an "Approved" toast naming
          E0.2. Nothing was written. Had the redirect ever been removed, a
          coordinator would have approved a producer into a market and watched
          E0.2 stay where it was.

          The real decision lives on /exhibitions/:id, which calls
          `useDecideRegistration` against `exhibition_registration.status` and
          is where the E0.2 wording now sits. One screen, one write. */}

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

      {/* The agreements this organisation holds, and then G0.4's log across all
          of them. `id` here is a PARTNER — the module is keyed on the
          organisation since the merge, which is also what G0.4 counts. */}
      {module === 'pn' && id ? <PartnershipsPanel partnerId={id} /> : null}
      {module === 'pn' && id ? (
        <ContributionLog partnerId={id} partnerships={heldPartnerships} />
      ) : null}

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
          // No live delete means a retired module, which cannot be reached --
          // App.tsx redirects it. There is deliberately NO fallback: the
          // fallback used to be the session-local mock remove, and it is what
          // made two deletes look exactly like success while writing nothing.
          // Closing the dialog and doing nothing is the honest outcome if this
          // is ever reached, and the delete button is only rendered for a
          // record that loaded, so it cannot be reached silently in practice.
          setConfirmDelete(false)
        }}
      />
    </>
  )
}

export default DetailScreen
