import { useTranslation } from 'react-i18next'
import { Card, ProgressBar, SectionRule } from '../ui/primitives'
import { ErrorState } from '../ui/states'
import { useEvidenceUsage } from '../data/evidence'
import { fileSize } from './EvidencePanel'
import { formatNumber, formatPercent } from '../lib/format'
import { BidiIsolate } from './BidiIsolate'
import { SEP } from '../ui/glyphs'

/**
 * Evidence storage on the settings screen: the total against the 10 GB the
 * store includes, as a figure and a percentage, the 9 GB stop, and the
 * largest consumers by table and by record.
 *
 * The total is the platform's for every staff role -- it is the number the
 * stop is about -- and the breakdowns are of the rows the caller may see.
 * All of it comes from evidence_usage() (0128); nothing is summed here.
 *
 * The bar is against the INCLUDED 10 GB, with the stop marked at 9, so that
 * "the platform refuses at 90%" is visible rather than a surprise.
 */
function recordLabel(entityType: string, entityId: string): string {
  return entityType + ' ' + entityId.slice(0, 8)
}

export function EvidenceStorageCard() {
  const { t, i18n } = useTranslation(['common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const usage = useEvidenceUsage()

  if (usage.isError) return <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
  const u = usage.data
  const pct = u ? Math.min(1, u.used_bytes / u.included_bytes) : 0
  const stopPct = u ? u.quota_bytes / u.included_bytes : 0.9
  const saved = u && u.original_bytes > u.used_bytes ? u.original_bytes - u.used_bytes : 0
  // Strings are assembled here, not in the JSX: jsx-no-literals refuses a
  // literal child, including a bare ' ', and rightly.
  const pctText = u ? formatPercent(pct, locale, pct > 0 && pct < 0.01 ? 2 : 0) + ' ' + SEP + ' ' + t('common:evidence.storage.files', { count: u.files }) : ''
  const stopText = u
    ? t('common:evidence.storage.stop', { stop: fileSize(u.quota_bytes, t, locale), perFile: fileSize(u.file_limit_bytes, t, locale) })
      + (saved > 0 ? ' ' + t('common:evidence.storage.saved', { saved: fileSize(saved, t, locale) }) : '')
    : ''
  const sizeAndFiles = (bytes: number, files: number) => fileSize(bytes, t, locale) + ' ' + SEP + ' ' + formatNumber(files, locale)

  return (
    <Card as="section" className="mt-[18px] p-5">
      <SectionRule title={t('common:evidence.storage.title')} />
      {u ? (
        <>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div className="text-[28px] font-bold leading-none text-ink">
              {t('common:evidence.storage.used', { used: fileSize(u.used_bytes, t, locale), included: fileSize(u.included_bytes, t, locale) })}
            </div>
            <div className="font-narrow text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">{pctText}</div>
          </div>
          <div className="relative mt-3">
            <ProgressBar pct={pct * 100} label={t('common:evidence.storage.barLabel')} className={pct >= stopPct ? 'bg-error' : pct >= stopPct * 0.8 ? 'bg-amber' : 'bg-ink'} />
            <span aria-hidden="true" className="absolute top-0 h-3 w-[2px] bg-error" style={{ insetInlineStart: `${stopPct * 100}%` }} />
          </div>
          <p className="mt-2 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{stopText}</p>

          {u.by_municipality.length > 1 ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[14px] sm:grid-cols-4">
              {u.by_municipality.map((m) => (
                <div key={m.code}>
                  <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{m.code}</dt>
                  <dd className="m-0">{sizeAndFiles(m.bytes, m.files)}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="m-0 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('common:evidence.storage.byTable')}</h3>
              {u.by_table.length === 0 ? <p className="mt-2 text-[14px] text-muted">{t('common:evidence.storage.nothingVisible')}</p> : (
                <ul className="mt-2 divide-y divide-border-default border-t border-border-default text-[14px]">
                  {u.by_table.map((r) => (
                    <li key={r.entity_type} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate"><BidiIsolate>{r.entity_type}</BidiIsolate></span>
                      <span className="text-muted">{sizeAndFiles(r.bytes, r.files)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="m-0 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('common:evidence.storage.byRecord')}</h3>
              {u.by_record.length === 0 ? <p className="mt-2 text-[14px] text-muted">{t('common:evidence.storage.nothingVisible')}</p> : (
                <ul className="mt-2 divide-y divide-border-default border-t border-border-default text-[14px]">
                  {u.by_record.map((r) => (
                    <li key={`${r.entity_type}/${r.entity_id}`} className="flex justify-between gap-3 py-1.5">
                      <span className="truncate"><BidiIsolate>{recordLabel(r.entity_type, r.entity_id)}</BidiIsolate></span>
                      <span className="text-muted">{sizeAndFiles(r.bytes, r.files)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </Card>
  )
}
