import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRmthThresholds, useSetThreshold, type RmthThreshold } from '../data/rmthThresholds'
import { useRmthStatus } from '../data/rmthDashboard'
import { AccentRule, Card, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { ErrorState, WriteError } from '../ui/states'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { formatShortDate } from '../lib/format'
import { COLON, SEP } from '../ui/glyphs'
import { makeTranslate, type Translate } from '../i18n/tx'

/**
 * The seven open items (OQ-47), as the screen where they are answered.
 *
 * Each row is one value in rmth_threshold (0123): the question in the
 * reader's language, the note that says what the sheet proposed, the current
 * answer or "not decided", and which indicators wait on it (from
 * v_rmth_indicator_status, the same view the dashboard reads -- so this
 * screen and the dashboard cannot disagree about what is blocked).
 *
 * A coordinator of Ramtha writes the answer here; RLS decides who that is.
 * Writing it is a data change, not a migration: the indicator views read the
 * value on the next query.
 */

const CHOICES: Record<string, readonly string[]> = {
  f02_counting_reading: ['programmes', 'sessions'],
  so10_employability_threshold: ['form_rule', 'placement_only'],
}
const BOOL_KEYS = new Set(['so20_self_employment_counts'])
/** Plan §5.4 lists the seven in this order; the rows come back by key. */
const ITEM_ORDER = [
  'sustained_engagement', 'short_term_intensive', 'regular_income', 'completion_criteria',
  'self_employment_as_placement', 'programmes_or_sessions', 'employability_threshold',
]
const TEXT_KEYS = new Set(['c12_completion_rule', 'e03_completion_rule', 'f01_completion_rule'])

function kindOf(t: RmthThreshold): 'choice' | 'bool' | 'text' | 'numeric' {
  if (CHOICES[t.key]) return 'choice'
  if (BOOL_KEYS.has(t.key)) return 'bool'
  if (TEXT_KEYS.has(t.key)) return 'text'
  return 'numeric'
}

function currentText(t: RmthThreshold, tr: Translate): string {
  const kind = kindOf(t)
  if (kind === 'numeric') return t.value_numeric == null ? tr('rmth:thresholds.notDecided') : t.unit ? `${t.value_numeric} ${t.unit}` : String(t.value_numeric)
  if (kind === 'bool') return t.value_bool == null ? tr('rmth:thresholds.notDecided') : t.value_bool ? tr('rmth:thresholds.yes') : tr('rmth:thresholds.no')
  if (kind === 'choice') return t.value_text ? tr(`rmth:thresholds.choice.${t.key}.${t.value_text}`) : tr('rmth:thresholds.notDecided')
  return t.value_text ?? tr('rmth:thresholds.notDecided')
}

function Editor({ row, onDone }: { row: RmthThreshold; onDone: () => void }) {
  const { t } = useTranslation('rmth')
  const { userId } = useAuth()
  const set = useSetThreshold()
  const kind = kindOf(row)
  const [num, setNum] = useState(row.value_numeric == null ? '' : String(row.value_numeric))
  const [text, setText] = useState(row.value_text ?? '')
  const [bool, setBool] = useState(row.value_bool == null ? '' : row.value_bool ? 'true' : 'false')
  const save = () => {
    void set
      .mutateAsync({
        id: row.id,
        userId,
        value:
          kind === 'numeric' ? { numeric: num === '' ? null : Number(num) }
          : kind === 'bool' ? { bool: bool === '' ? null : bool === 'true' }
          : { text: text.trim() || null },
      })
      .then(onDone)
      .catch(() => {})
  }
  const inputClass = 'min-h-10 w-full border-[1.5px] border-ink bg-input px-2 text-[14px]'
  return (
    <div className="mt-3 flex flex-col gap-2 border-s-[3px] border-ink ps-4">
      {set.error ? <WriteError error={set.error} onDismiss={set.reset} /> : null}
      {kind === 'numeric' ? (
        <label className="text-[12px] font-narrow uppercase tracking-[0.1em]">
          {t('thresholds.value')}{row.unit ? ` (${row.unit})` : ''}
          <input type="number" step="any" value={num} onChange={(e) => setNum(e.target.value)} className={inputClass} dir="ltr" />
        </label>
      ) : null}
      {kind === 'text' ? (
        <label className="text-[12px] font-narrow uppercase tracking-[0.1em]">
          {t('thresholds.rule')}
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${inputClass} py-2 normal-case tracking-normal`} />
        </label>
      ) : null}
      {kind === 'choice' ? (
        <label className="text-[12px] font-narrow uppercase tracking-[0.1em]">
          {t('thresholds.value')}
          <select value={text} onChange={(e) => setText(e.target.value)} className={`${inputClass} normal-case tracking-normal`}>
            <option value="">{t('thresholds.notDecided')}</option>
            {(CHOICES[row.key] ?? []).map((c) => <option key={c} value={c}>{t(`thresholds.choice.${row.key}.${c}`)}</option>)}
          </select>
        </label>
      ) : null}
      {kind === 'bool' ? (
        <label className="text-[12px] font-narrow uppercase tracking-[0.1em]">
          {t('thresholds.value')}
          <select value={bool} onChange={(e) => setBool(e.target.value)} className={`${inputClass} normal-case tracking-normal`}>
            <option value="">{t('thresholds.notDecided')}</option>
            <option value="true">{t('thresholds.yes')}</option>
            <option value="false">{t('thresholds.no')}</option>
          </select>
        </label>
      ) : null}
      <div className="flex gap-2">
        <SecondaryButton onClick={onDone}>{t('form.cancel')}</SecondaryButton>
        <PrimaryButton onClick={save} disabled={set.isPending}>{t('thresholds.save')}</PrimaryButton>
      </div>
    </div>
  )
}

export function RmthThresholds() {
  const { t, i18n } = useTranslation(['rmth'])
  const tx = makeTranslate(t)
  const ar = i18n.language.startsWith('ar')
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const rows = useRmthThresholds()
  const status = useRmthStatus()
  const [editing, setEditing] = useState<string | null>(null)

  if (rows.isError) return <ErrorState error={rows.error} onRetry={() => void rows.refetch()} />
  const items = new Map<string, RmthThreshold[]>()
  for (const r of rows.data ?? []) items.set(r.open_item, [...(items.get(r.open_item) ?? []), r])
  const rank = (k: string) => (ITEM_ORDER.includes(k) ? ITEM_ORDER.indexOf(k) : ITEM_ORDER.length)
  const sections = [...items.entries()].sort((a, b) => rank(a[0]) - rank(b[0]))
  const blockedBy = (key: string) => (status.data ?? []).filter((s) => (s.missing_keys ?? []).includes(key)).map((s) => s.full_code)

  return (
    <div className="pb-16">
      <PageHead title={t('rmth:thresholds.title')} description={t('rmth:thresholds.intro')} />
      <AccentRule />
      {sections.map(([item, list]) => (
        <Card key={item} as="section" className="mt-[18px] p-5">
          <SectionRule title={t(`rmth:thresholds.item.${item}`)} />
          {list.map((row) => {
            const blocked = blockedBy(row.key)
            const decided = row.decided_on ? t('rmth:thresholds.decidedOn', { date: formatShortDate(row.decided_on, locale) }) : ''
            return (
              <div key={row.id} className="mt-4 border-b border-border-default pb-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[15px] font-medium text-ink" style={{ textWrap: 'pretty' }}>{ar ? row.label_ar : row.label_en}</span>
                  <span className={`font-narrow text-[12.5px] font-bold uppercase tracking-[0.1em] ${row.decided_on ? 'text-success' : 'text-amber'}`}>
                    {currentText(row, tx)}{decided ? ` ${SEP} ${decided}` : ''}
                  </span>
                </div>
                <p className="mt-1 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{ar ? row.note_ar : row.note_en}</p>
                {blocked.length > 0 ? (
                  <p className="mt-1 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-attention-ink">
                    {t('rmth:thresholds.blocks')}{COLON} {blocked.join(SEP)}
                  </p>
                ) : null}
                {can(role, 'manual.write') ? (
                  editing === row.id ? (
                    <Editor row={row} onDone={() => setEditing(null)} />
                  ) : (
                    <div className="mt-2"><SecondaryButton onClick={() => setEditing(row.id)}>{t('rmth:thresholds.decide')}</SecondaryButton></div>
                  )
                ) : null}
              </div>
            )
          })}
        </Card>
      ))}
    </div>
  )
}

export default RmthThresholds
