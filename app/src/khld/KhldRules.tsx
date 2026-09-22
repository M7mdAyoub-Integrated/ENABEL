import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useKhldMilestoneItems, useKhldMilestoneRules, useSetKhldMilestoneRule, type KhldMilestoneRule } from '../data/khld'
import { useIndicatorStatus } from '../data/indicators'
import { useCurrentMunicipality } from '../data/municipalities'
import { AccentRule, Card, PageHead, PrimaryButton, SecondaryButton, SectionRule } from '../ui/primitives'
import { ErrorState, WriteError } from '../ui/states'
import { useAuth } from '../auth/AuthProvider'
import { can } from '../auth/permissions'
import { formatShortDate } from '../lib/format'
import { COLON, SEP } from '../ui/glyphs'

/**
 * The four milestone rules (0147), as the screen where their critical items
 * are decided.
 *
 * Each sheet's rule names checklist items by number; two of the four name
 * items that are not checklist rows, so their status cannot be computed
 * until a coordinator writes the critical items here (OQ-56). The sheet's
 * rule is shown verbatim, the items it names are listed against what each
 * one actually is, and the decision is a row update the guard validates:
 * every number must be a checklist row of that milestone. The indicator
 * views read it on the next query; nothing else changes.
 *
 * Which indicators wait on a decision comes from v_khld_indicator_status
 * (the same view the dashboard reads), so this screen and the dashboard
 * cannot disagree about what is blocked.
 */
export function KhldRules() {
  const { t, i18n } = useTranslation('khld')
  const ar = i18n.language.startsWith('ar')
  const locale = i18n.resolvedLanguage ?? 'en'
  const { role } = useAuth()
  const municipality = useCurrentMunicipality()
  const rules = useKhldMilestoneRules()
  const items = useKhldMilestoneItems()
  const status = useIndicatorStatus(municipality?.id ?? null)
  const [editing, setEditing] = useState<string | null>(null)

  if (rules.isError) return <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />
  const blockedBy = (code: string) => (status.data ?? []).filter((s) => s.milestone_code === code && s.reason).map((s) => s.full_code)

  return (
    <div className="pb-16">
      <PageHead title={t('rules.title')} description={t('rules.intro')} />
      <AccentRule />
      <p className="mt-3 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{t('rules.boundary')}</p>
      {(rules.data ?? []).map((row) => {
        const its = (items.data ?? []).filter((i) => i.milestone_code === row.milestone_code)
        const decided = row.decided_on ? t('rules.decidedOn', { date: formatShortDate(row.decided_on, locale) }) : ''
        const blocked = blockedBy(row.milestone_code)
        const nameOf = (n: number) => {
          const it = its.find((i) => i.item_no === n)
          return it ? `${n} = ${ar ? it.label_ar : it.label_en} (${it.field_type})` : `${n} = ?`
        }
        return (
          <Card key={row.milestone_code} as="section" className="mt-[18px] p-5">
            <SectionRule title={`KHLD-${row.milestone_code}`} />
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('rules.sourceRule')}</span>
              <span className={`font-narrow text-[12.5px] font-bold uppercase tracking-[0.1em] ${row.critical_items ? 'text-success' : 'text-amber'}`}>
                {row.critical_items ? `${t('rules.critical')}${COLON} ${row.critical_items.join(', ')}` : t('rules.notDecided')}{decided ? ` ${SEP} ${decided}` : ''}
              </span>
            </div>
            <p className="mt-1 text-[15px] font-medium text-ink" style={{ textWrap: 'pretty' }}>{ar ? row.source_rule_ar : row.source_rule_en}</p>
            <p className="mt-2 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('rules.sourceItems')}</p>
            <ul className="m-0 mt-1 list-none p-0 text-[13.5px] text-body">
              {row.source_items.map((n) => {
                const it = its.find((i) => i.item_no === n)
                const ok = it?.field_type === 'checklist'
                return <li key={n} className={ok ? '' : 'text-attention-ink'}>{nameOf(n)}</li>
              })}
            </ul>
            {row.note_en ? (
              <p className="mt-2 text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>
                <span className="font-narrow text-[11px] font-bold uppercase tracking-[0.12em]">{t('rules.note')}{COLON} </span>
                {ar ? row.note_ar : row.note_en}
              </p>
            ) : null}
            {blocked.length > 0 ? (
              <p className="mt-1 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] text-attention-ink">
                {t('rules.blocks')}{COLON} {blocked.join(SEP)}
              </p>
            ) : null}
            {can(role, 'manual.write') ? (
              editing === row.milestone_code ? (
                <Editor row={row} items={its.filter((i) => i.field_type === 'checklist').map((i) => ({ no: i.item_no, label: ar ? i.label_ar : i.label_en }))} onDone={() => setEditing(null)} />
              ) : (
                <div className="mt-3"><SecondaryButton onClick={() => setEditing(row.milestone_code)}>{t('rules.decide')}</SecondaryButton></div>
              )
            ) : null}
          </Card>
        )
      })}
    </div>
  )
}

function Editor({ row, items, onDone }: { row: KhldMilestoneRule; items: { no: number; label: string }[]; onDone: () => void }) {
  const { t } = useTranslation('khld')
  const set = useSetKhldMilestoneRule()
  const [chosen, setChosen] = useState<number[]>(row.critical_items ?? [])
  const toggle = (n: number) => setChosen((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n].sort((a, b) => a - b)))
  const save = (clear: boolean) =>
    void set.mutateAsync({ municipalityId: row.municipality_id, code: row.milestone_code, items: clear ? null : chosen }).then(onDone).catch(() => {})
  return (
    <div className="mt-3 flex flex-col gap-2 border-s-[3px] border-ink ps-4">
      {set.error ? <WriteError error={set.error} onDismiss={set.reset} /> : null}
      <p className="m-0 text-[13.5px] text-muted">{t('rules.chooseItems')}</p>
      <p className="m-0 font-narrow text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('rules.items')}</p>
      <ul className="m-0 list-none p-0">
        {items.map((it) => (
          <li key={it.no}>
            <label className="flex items-center gap-2 py-1 text-[14px]">
              <input type="checkbox" checked={chosen.includes(it.no)} onChange={() => toggle(it.no)} />
              <span><span className="font-narrow font-bold" dir="ltr">{it.no}</span> {SEP} {it.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton onClick={onDone}>{t('rules.cancel')}</SecondaryButton>
        {row.critical_items ? <SecondaryButton onClick={() => save(true)} disabled={set.isPending}>{t('rules.clear')}</SecondaryButton> : null}
        <PrimaryButton onClick={() => save(false)} disabled={set.isPending || chosen.length === 0}>{t('rules.save')}</PrimaryButton>
      </div>
    </div>
  )
}

export default KhldRules
