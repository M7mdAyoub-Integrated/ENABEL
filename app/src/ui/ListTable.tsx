import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { DataTable, type RowAction } from './DataTable'
import { EmptyState, SecondaryButton } from './primitives'
import { ErrorState, TableSkeleton } from './states'
import type { ListRow } from '../hooks/useData'

/**
 * The one list layout, for every municipality's records (the owner, 29
 * September 2026: "follow one layout for the tables for every municipality,
 * with filtering for every field in the table").
 *
 * Under the page head, in this order and nowhere else:
 *   1. one framed strip -- search · the screen's switches (show deleted, …)
 *      · "N of M" · clear filters
 *   2. the table, with a filter under every column heading: the column's
 *      own values, searchable (DataTable, ColumnFilters)
 *   3. when nothing is recorded, the empty state; when records exist but
 *      the search or a filter hides them all, the table stays -- so the
 *      filters stay reachable -- with a line saying so under it.
 *
 * Filtering compares what the cell SHOWS, in the screen's language, so a
 * filter reads exactly like the column it sits under.
 */

export type ListToggle = { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }

const PLACEHOLDERS = new Set(['', '—', '…'])

export function ListTable({
  columns,
  rows,
  actions,
  recordLabel,
  isLoading,
  isError,
  error,
  onRetry,
  toggles,
  searchPlaceholder,
  empty,
}: {
  columns: string[]
  rows: ListRow[]
  actions: (row: ListRow) => RowAction[]
  recordLabel: string
  isLoading?: boolean | undefined
  isError?: boolean | undefined
  error?: unknown
  onRetry?: (() => void) | undefined
  toggles?: ListToggle[] | undefined
  searchPlaceholder?: string | undefined
  empty: { title: string; description: string; action?: ReactNode }
}) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.resolvedLanguage ?? 'en'
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const options = useMemo(
    () =>
      columns.map((_, i) =>
        Array.from(new Set(rows.map((r) => r.cells[i]?.text ?? '').filter((v) => !PLACEHOLDERS.has(v)))).sort((a, b) =>
          a.localeCompare(b, locale, { numeric: true }),
        ),
      ),
    [columns, rows, locale],
  )

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (q) {
        const hay = [r.search, ...r.cells.map((c) => `${c.text} ${'sub' in c && c.sub ? c.sub : ''}`)].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return selected.every((v, i) => !v || (r.cells[i]?.text ?? '') === v)
    })
  }, [rows, query, selected])

  const filtering = !!query.trim() || selected.some(Boolean)
  const clear = () => {
    setQuery('')
    setSelected([])
  }

  return (
    <>
      {/* 1. search · switches · count · clear, in one frame */}
      <div className="mt-5 flex flex-col border-[1.5px] border-ink sm:flex-row sm:items-stretch">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('table.search')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? t('table.search')}
            className="w-full min-w-0 border-0 bg-bg px-[14px] py-[11px] text-[15px] text-ink placeholder:text-ghost"
          />
        </label>
        {(toggles ?? []).map((tg) => (
          <label
            key={tg.id}
            className="flex flex-none cursor-pointer items-center gap-2 border-t-[1.5px] border-ink bg-raised px-[14px] py-2 font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-ink sm:border-s-[1.5px] sm:border-t-0"
          >
            <input type="checkbox" checked={tg.checked} onChange={(e) => tg.onChange(e.target.checked)} className="h-4 w-4 accent-ink" />
            {tg.label}
          </label>
        ))}
        <span className="flex flex-none items-center whitespace-nowrap border-t-[1.5px] border-ink px-[14px] py-2 font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-muted sm:border-s-[1.5px] sm:border-t-0 sm:py-0">
          {t('table.count', { shown: shown.length, total: rows.length })}
        </span>
        {filtering ? (
          <button
            type="button"
            onClick={clear}
            className="flex-none border-t-[1.5px] border-ink bg-ink px-[14px] py-2 font-narrow text-[12px] font-bold uppercase tracking-[0.08em] text-bg sm:border-s-[1.5px] sm:border-t-0"
          >
            {t('table.clear')}
          </button>
        ) : null}
      </div>

      {/* 2. the table, or 3. the empty state */}
      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : isError ? (
        <ErrorState error={error} {...(onRetry ? { onRetry } : {})} />
      ) : rows.length === 0 ? (
        <div className="mt-[18px]">
          <EmptyState title={empty.title} description={empty.description} actions={empty.action} />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={shown}
            actions={actions}
            recordLabel={recordLabel}
            filters={{
              options,
              selected,
              onChange: (i, v) =>
                setSelected((cur) => {
                  const next = columns.map((_, j) => cur[j] ?? '')
                  next[i] = v
                  return next
                }),
            }}
          />
          {shown.length === 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-[1.5px] border-dashed border-border-muted bg-sunken px-4 py-3">
              <span className="text-[14.5px] text-body">{t('table.noneMatch', { total: rows.length })}</span>
              <SecondaryButton onClick={clear}>{t('table.clear')}</SecondaryButton>
            </div>
          ) : null}
        </>
      )}
    </>
  )
}

export default ListTable
