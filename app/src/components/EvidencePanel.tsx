import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Chip, SectionRule, SecondaryButton } from '../ui/primitives'
import { WriteError } from '../ui/states'
import { BidiIsolate } from './BidiIsolate'
import { formatNumber, formatShortDate } from '../lib/format'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import {
  evidenceUrl, isEvidenceRefusal, useAttachments, useRemoveEvidence, useUploadEvidence,
  type Attachment,
} from '../data/evidence'
import { guessKind, type EvidenceKind } from '../lib/evidence/compress'
import { SEP } from '../ui/glyphs'

/**
 * The evidence files of one record: the list, a way to add one, a way to
 * open one, and (a coordinator's) a way to remove one.
 *
 * The kind chooser is what decides the compression (lib/evidence/compress):
 * a photograph becomes a 1600 px JPEG, a scanned document a grey 150 DPI
 * PDF, anything else goes as it is. The default is guessed from the file's
 * type and can be changed before the upload starts, because a photograph of
 * an attendance sheet is a document, and only the person holding it knows.
 *
 * Refusals are named. "Too large" says the sizes and the limit; "not
 * configured" says which secrets are missing, because the person reading it
 * on the first day is the administrator.
 */

/**
 * A byte count as a translated string, in decimal units (1 MB = 1 000 000
 * bytes) so the store's "10 GB" and the 9 GB stop read as those figures and
 * not as 9.31 GB. Zero is "0 KB"; anything else is at least "1 KB", so a
 * 300-byte file does not read as a failed upload.
 */
export function fileSize(bytes: number, t: TFunction, locale: string): string {
  const one = (n: number) => formatNumber(Math.round(n * 10) / 10, locale, { maximumFractionDigits: 1 })
  if (bytes >= 1_000_000_000) return t('common:evidence.sizeGb', { size: one(bytes / 1_000_000_000) })
  if (bytes >= 1_000_000) return t('common:evidence.sizeMb', { size: one(bytes / 1_000_000) })
  const kb = bytes === 0 ? 0 : Math.max(1, Math.round(bytes / 1000))
  return t('common:evidence.sizeKb', { size: formatNumber(kb, locale) })
}

function RefusalNote({ error, onDismiss, t, locale }: { error: unknown; onDismiss: () => void; t: TFunction; locale: string }) {
  if (!error) return null
  if (!isEvidenceRefusal(error)) return <WriteError error={error} onDismiss={onDismiss} />
  const v = error.values
  const num = (k: string) => (typeof v[k] === 'number' ? fileSize(v[k] as number, t, locale) : '')
  const values: Record<string, string> = {
    name: String(v['name'] ?? ''),
    type: String(v['type'] ?? ''),
    original: num('original'),
    compressed: num('compressed'),
    limit: num('limit') || num('file_limit_bytes'),
    used: num('used_bytes'),
    quota: num('quota_bytes'),
    missing: String(v['missing'] ?? ''),
    message: String(v['message'] ?? ''),
    // upload_failed carries the HTTP status as `code`, or `message: 'network'`
    // when the PUT never got an answer -- which is what a missing CORS rule
    // on the bucket looks like from here. The wording names {code}; it read
    // "({code})" literally on the first upload ever attempted.
    code: String(v['code'] ?? v['message'] ?? ''),
  }
  return (
    <div role="alert" className="mt-[14px] flex flex-wrap items-baseline gap-x-[14px] gap-y-2 bg-error px-[18px] py-[14px] text-bg">
      <span className="flex-none font-narrow text-[11.5px] font-bold uppercase tracking-[0.14em]">{t('common:evidence.notAdded')}</span>
      <span className="text-[15px] font-medium">{t(`common:evidence.refusal.${error.result}`, { ...values, defaultValue: t('common:evidence.refusal.unknown', values) })}</span>
      <button type="button" onClick={onDismiss} className="ms-auto cursor-pointer font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] underline">
        {t('common:actions.dismiss')}
      </button>
    </div>
  )
}

/**
 * `compact` is for a panel inside a card that sits in a list -- the
 * milestones on /manual-entries -- where four copies of the explanatory
 * paragraph would drown four short cards. The list, the add button and the
 * refusals are the same; only the margin and the paragraph go.
 */
export function EvidencePanel({
  entityType,
  entityId,
  compact = false,
  deleted = false,
}: {
  entityType: string
  entityId: string
  compact?: boolean
  /** The record is soft-deleted: its files stay listed, nothing can be added. */
  deleted?: boolean
}) {
  const { t, i18n } = useTranslation(['common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const files = useAttachments(entityType, entityId)
  const upload = useUploadEvidence(entityType, entityId)
  const remove = useRemoveEvidence(entityType, entityId)
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ file: File; kind: EvidenceKind } | null>(null)
  const [openError, setOpenError] = useState<unknown>(null)
  // The function answers a remove with whether the OBJECT went too. The row
  // is gone either way; a file left in the store costs storage and appears
  // in no figure, so a "no" is shown rather than swallowed.
  const [objectKept, setObjectKept] = useState(false)

  const start = () => {
    if (!pending) return
    const chosen = pending
    setPending(null)
    void upload.mutateAsync(chosen).catch(() => {
      /* rendered by RefusalNote from upload.error */
    })
  }

  const open = (a: Attachment) => {
    setOpenError(null)
    void evidenceUrl(a.id)
      .then((u) => window.open(u, '_blank', 'noopener'))
      .catch((e: unknown) => setOpenError(e))
  }

  return (
    <section className={compact ? 'mt-4' : 'mt-[26px]'}>
      <SectionRule
        title={t('common:evidence.title')}
        right={can(role, 'record.edit') && !deleted ? (
          <>
            <input
              ref={input}
              type="file"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setPending({ file: f, kind: guessKind(f) })
                e.target.value = ''
              }}
            />
            <SecondaryButton disabled={upload.isPending} onClick={() => input.current?.click()}>
              {upload.isPending ? t('common:evidence.uploading') : t('common:evidence.add')}
            </SecondaryButton>
          </>
        ) : undefined}
      />
      {compact ? null : (
        <p className="mt-2 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{t('common:evidence.rule')}</p>
      )}

      {pending ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-[1.5px] border-ink bg-sunken p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium"><BidiIsolate>{pending.file.name}</BidiIsolate></div>
            <div className="text-[12.5px] text-muted">{fileSize(pending.file.size, t, locale)}</div>
          </div>
          <label className="text-[12px] font-narrow uppercase tracking-[0.1em]">
            {t('common:evidence.kind.label')}
            <select
              value={pending.kind}
              onChange={(e) => setPending({ ...pending, kind: e.target.value as EvidenceKind })}
              className="mt-1 block min-h-10 border-[1.5px] border-ink bg-input px-2 text-[14px] normal-case tracking-normal"
            >
              <option value="photo">{t('common:evidence.kind.photo')}</option>
              <option value="document">{t('common:evidence.kind.document')}</option>
              <option value="other">{t('common:evidence.kind.other')}</option>
            </select>
          </label>
          <SecondaryButton onClick={() => setPending(null)}>{t('common:actions.cancel')}</SecondaryButton>
          <SecondaryButton onClick={start}>{t('common:evidence.upload')}</SecondaryButton>
        </div>
      ) : null}

      <RefusalNote error={upload.error} onDismiss={upload.reset} t={t} locale={locale} />
      <RefusalNote error={remove.error} onDismiss={remove.reset} t={t} locale={locale} />
      <RefusalNote error={openError} onDismiss={() => setOpenError(null)} t={t} locale={locale} />
      {objectKept ? (
        <p role="status" className="mt-3 border-[1.5px] border-attention-border bg-attention-bg px-3 py-2 text-[14px] text-attention-ink">
          {t('common:evidence.objectKept')}
        </p>
      ) : null}

      {files.data && files.data.length === 0 ? <p className="mt-3 text-[14px] text-muted">{t('common:evidence.none')}</p> : null}
      {files.data && files.data.length > 0 ? (
        <ul className="mt-3 divide-y divide-border-default border-[1.5px] border-ink">
          {files.data.map((a) => {
            // Built outside the JSX: jsx-no-literals refuses a template
            // literal as a child, and rightly -- it cannot tell a glyph from
            // a sentence.
            const stored = fileSize(a.size_bytes, t, locale)
            const sizeText = a.original_size_bytes > a.size_bytes
              ? stored + ' ' + SEP + ' ' + t('common:evidence.from', { size: fileSize(a.original_size_bytes, t, locale) })
              : stored
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[14px]">
                <span className="min-w-0 flex-1 truncate"><BidiIsolate>{a.file_name}</BidiIsolate></span>
                <span className="text-muted">{formatShortDate(a.uploaded_at, locale)}</span>
                <Chip tone="mute">{t(`common:evidence.kind.${a.content_kind}`)}</Chip>
                <span className="text-[13px] text-muted">{sizeText}</span>
                <button type="button" className="underline" onClick={() => open(a)}>{t('common:evidence.open')}</button>
                {can(role, 'record.delete') ? (
                  <button
                    type="button"
                    className="text-error underline"
                    disabled={remove.isPending}
                    onClick={() => void remove.mutateAsync(a.id).then((r) => setObjectKept(!r.objectDeleted)).catch(() => {})}
                  >
                    {t('common:evidence.remove')}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
