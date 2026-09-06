import { useTranslation } from 'react-i18next'
import { useWithdrawnPredecessor, type WithdrawnKind } from '../data/restore'
import { formatDate } from '../lib/format'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  "This pair was entered before, and withdrawn."
 *
 *  The counterpart of RestorePanel, for the five `_live` indexes rather than
 *  the two global ones. RestorePanel appears AFTER a save is refused and offers
 *  a way forward. This appears BEFORE the save, because nothing is going to
 *  refuse: the index is partial on purpose and the re-entry will succeed.
 *
 *  ── IT IS NOT A WARNING AND MUST NOT READ LIKE ONE ──
 *
 *  Withdrawal is not a ban (OQ-24). Re-entering the pair is permitted, normal,
 *  and frequently the right thing to do. So this is a `note` in the neutral
 *  slate, not the amber a refusal gets — the copy states a fact and names no
 *  consequence, because there is none. Dressing a permitted action in a warning
 *  colour teaches people to click past warnings.
 *
 *  ── WHY IT RENDERS NOTHING RATHER THAN A SPINNER ──
 *
 *  The overwhelmingly common answer is "no predecessor", and a placeholder that
 *  flashes on every form load to say nothing happened is worse than a note that
 *  appears when there is something to say. So: no loading state, no empty
 *  state, and nothing at all on an error — a failed lookup must not put an
 *  alarming box on a form that is working perfectly well.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function WithdrawnNotice({
  kind,
  a,
  b,
}: {
  kind: WithdrawnKind
  a: string | null | undefined
  b: string | null | undefined
}) {
  const { t, i18n } = useTranslation(['forms', 'common'])
  const locale = i18n.resolvedLanguage ?? 'en'
  const q = useWithdrawnPredecessor(kind, a, b)

  const row = q.data
  if (!row) return null

  return (
    <div
      role="note"
      data-testid="withdrawn-notice"
      className="mt-3 border-l-[3px] border-border-strong bg-sunken px-3 py-2.5 text-[13px] leading-[1.5] text-ink"
    >
      <p className="m-0 font-semibold">{t(`forms:withdrawn.title.${kind}`)}</p>
      <p className="m-0 mt-1 text-muted">
        {row.withdrawn_by
          ? t('forms:withdrawn.onBy', {
              date: formatDate(row.withdrawn_at, locale),
              who: row.withdrawn_by,
            })
          : t('forms:withdrawn.on', { date: formatDate(row.withdrawn_at, locale) })}
        {row.how_many > 1 ? ` ${t('forms:withdrawn.more', { count: row.how_many })}` : ''}
      </p>
      <p className="m-0 mt-1.5 text-muted">{t('forms:withdrawn.body')}</p>
    </div>
  )
}
