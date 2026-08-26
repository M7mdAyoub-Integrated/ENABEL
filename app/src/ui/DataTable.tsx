import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BidiIsolate } from '../components/BidiIsolate'
import { ActionButton, ActionGroup, Chip } from './primitives'
import type { Cell, ListRow } from '../hooks/useData'

export type RowAction = {
  id: string
  label: string
  tone?: 'ink' | 'danger' | 'ok'
  onSelect: (rowId: string) => void
}

function CellView({ cell }: { cell: Cell }) {
  if (cell.kind === 'chip') return <Chip tone={cell.tone}>{cell.text}</Chip>
  if (cell.kind === 'ltr')
    return <BidiIsolate className="font-narrow tracking-wide">{cell.text}</BidiIsolate>
  return (
    <>
      <span>{cell.text}</span>
      {cell.sub ? (
        <span className="mt-px block font-narrow text-[12.5px] font-semibold tracking-[0.06em] text-faint">
          {cell.sub}
        </span>
      ) : null}
    </>
  )
}

/**
 * The list table, copied from the prototype.
 *
 * Two renderings of ONE `rows` array, so a column added to the table cannot be
 * forgotten on mobile:
 *   • 768+  a real <table>. 3px rule under the head, 1px between rows, the
 *           first column heavier (16px/700) than the rest (14.5px/400).
 *   • <768  a card list. The prototype is desktop-only; 320px is a hard
 *           requirement of the build plan, so the same data is stacked here in
 *           the same flat, ruled language.
 *
 * Column order mirrors under RTL for free, because this is a real table and the
 * browser reverses cell order when `dir="rtl"` sits on <html>.
 */
export function DataTable({
  columns,
  rows,
  actions,
  recordLabel,
}: {
  columns: string[]
  rows: ListRow[]
  actions: (row: ListRow) => RowAction[]
  recordLabel: string
}) {
  const { t } = useTranslation('common')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <>
      {/* Phone: card list */}
      <ul className="mt-[18px] flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const isOpen = expanded === row.id
          const head = row.cells.slice(0, 3)
          const rest = row.cells.slice(3)
          return (
            <li key={row.id} className="border-[1.5px] border-ink bg-bg">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : row.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-3 p-4 text-start"
              >
                <span className="flex min-w-0 flex-col gap-1.5">
                  {head.map((cell, i) => (
                    <span
                      key={i}
                      className={
                        i === 0
                          ? 'text-base font-bold tracking-[-0.015em] text-ink'
                          : 'text-[14.5px] text-body'
                      }
                    >
                      <CellView cell={cell} />
                    </span>
                  ))}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-none pt-1 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-muted"
                >
                  {isOpen ? t('actions.collapse') : t('actions.expand')}
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-border-default px-4 py-3">
                  <dl className="flex flex-col gap-2">
                    {rest.map((cell, i) => (
                      <div key={i} className="flex flex-wrap items-baseline justify-between gap-2">
                        <dt className="font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                          {columns[i + 3] ?? ''}
                        </dt>
                        <dd className="text-[14.5px] text-ink">
                          <CellView cell={cell} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {actions(row).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => a.onSelect(row.id)}
                        className={`min-h-11 flex-1 border-[1.5px] border-ink px-4 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] ${
                          a.tone === 'danger'
                            ? 'text-error'
                            : a.tone === 'ok'
                              ? 'bg-success text-bg'
                              : 'text-ink'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {/* Tablet and up: the prototype's table */}
      <div className="mt-[18px] hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  scope="col"
                  className="whitespace-nowrap border-b-[3px] border-ink pb-[7px] pe-[14px] text-start font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted"
                >
                  {c}
                </th>
              ))}
              <th
                scope="col"
                className="w-[172px] border-b-[3px] border-ink pb-[7px] ps-[14px] text-end font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-muted"
              >
                {recordLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={`border-b border-border-default py-3 pe-[14px] align-top text-ink ${
                      i === 0
                        ? 'text-[16px] font-bold tracking-[-0.015em]'
                        : 'text-[14.5px] font-normal'
                    }`}
                    style={{ textWrap: 'pretty' }}
                  >
                    <CellView cell={cell} />
                  </td>
                ))}
                <td className="whitespace-nowrap border-b border-border-default py-3 ps-[14px] text-end align-top">
                  <ActionGroup>
                    {actions(row).map((a, i) => (
                      <ActionButton
                        key={a.id}
                        tone={a.tone ?? 'ink'}
                        first={i === 0}
                        onClick={() => a.onSelect(row.id)}
                      >
                        {a.label}
                      </ActionButton>
                    ))}
                  </ActionGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
