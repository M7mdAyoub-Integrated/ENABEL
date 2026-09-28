import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { formatNumber } from '../lib/format'
import { useKhldLabels } from './labels'
import type { KhldFormId } from './forms.generated'
import type { KhldFieldDef } from './types'

/**
 * FORM-09 F039 from 0168: the participants of an activity, counted from
 * tickets, as one table -- nationality down the side, men / women / children
 * across -- with a total for every row, every column and the whole.
 *
 * The totals on screen are arithmetic for the person typing. The figure that
 * counts is total_participants, which the database sums from the same six
 * columns on every save (set_khld_attendance_from_tickets) and holds to them
 * with a CHECK; the screen never sends it.
 *
 * `values` is keyed by column, as the form's answers are. Without `onChange`
 * the table is read-only (the record's page).
 */
export function TicketsTable({
  f,
  fid,
  values,
  onChange,
  required,
  error,
}: {
  f: KhldFieldDef
  fid: KhldFormId
  values: Record<string, string | number | null | undefined>
  onChange?: (column: string, value: string) => void
  required?: boolean
  error?: string | undefined
}) {
  const L = useKhldLabels(fid)
  const { t } = useTranslation(['khld', 'forms'])
  const id = useId()
  const rows = f.rows ?? []
  const cols = f.cols ?? []
  const cells = f.cells ?? []
  const editable = !!onChange

  const raw = (col: string) => {
    const v = values[col]
    return v == null ? '' : String(v)
  }
  const num = (col: string) => {
    const v = raw(col).trim()
    return /^\d+$/.test(v) ? Number(v) : 0
  }
  const bad = (col: string) => !!error && !/^\d+$/.test(raw(col).trim())
  const rowTotal = (r: number) => (cells[r] ?? []).reduce((s, c) => s + num(c), 0)
  const colTotal = (c: number) => cells.reduce((s, row) => s + (row[c] ? num(row[c]) : 0), 0)
  const grand = cells.flat().reduce((s, c) => s + num(c), 0)
  const n = (x: number) => formatNumber(x, L.locale)

  const head = 'px-2 py-2.5 text-center font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted'
  const sum = 'bg-raised px-2 py-2.5 text-center text-[16px] font-bold tabular-nums text-ink'

  return (
    <div className="col-span-12 min-w-0">
      <div className="mb-[9px] flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span id={`${id}-label`} className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
          {L.label(f)}
          {required ? <span className="text-error">{t('forms:requiredMark')}</span> : null}
        </span>
        <span className="inline-flex items-stretch border-[1.5px] border-ink font-narrow text-[11px] font-bold uppercase tracking-[0.12em]">
          <span className="px-2.5 py-[5px] text-muted">{t('khld:form.tickets.method')}</span>
          <span className="inline-flex items-center gap-1.5 bg-ink px-2.5 py-[5px] text-bg">
            <TicketGlyph />
            {L.ticketMethod(f)}
          </span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table
          aria-labelledby={`${id}-label`}
          aria-describedby={[editable ? `${id}-note` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') || undefined}
          className={`w-full min-w-[300px] table-fixed border-collapse border-[1.5px] ${error ? 'border-error' : 'border-ink'}`}
        >
          <colgroup>
            <col className="w-[29%]" />
            {cols.map((c) => <col key={c} />)}
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className="border-b-[1.5px] border-ink">
              <th scope="col" className={head}><span className="sr-only">{L.label(f)}</span></th>
              {cols.map((c) => <th key={c} scope="col" className={head}>{L.ticketCol(f, c)}</th>)}
              <th scope="col" className={`${head} bg-raised text-ink`}>{t('khld:form.tickets.total')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r} className="border-b border-border-default">
                <th scope="row" className="px-3 py-2 text-start text-[15px] font-semibold text-ink">{L.ticketRow(f, r)}</th>
                {cols.map((c, ci) => {
                  const col = cells[ri]?.[ci] ?? ''
                  return (
                    <td key={c} className="p-1.5">
                      {editable ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          dir="ltr"
                          aria-label={t('khld:form.tickets.cell', { row: L.ticketRow(f, r), col: L.ticketCol(f, c) })}
                          aria-invalid={bad(col) || undefined}
                          placeholder={n(0)}
                          value={raw(col)}
                          onChange={(e) => onChange(col, digitsOnly(e.target.value))}
                          className={`min-h-11 w-full border-[1.5px] bg-input px-1 py-2 text-center text-[18px] font-semibold tabular-nums text-ink placeholder:text-ghost ${bad(col) ? 'border-error' : 'border-ink'}`}
                        />
                      ) : (
                        <span className="block py-1.5 text-center text-[17px] font-semibold tabular-nums text-ink">
                          {raw(col) === '' ? '—' : n(num(col))}
                        </span>
                      )}
                    </td>
                  )
                })}
                <td className={sum}>{n(rowTotal(ri))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5px] border-ink">
              <th scope="row" className="bg-raised px-3 py-2.5 text-start font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
                {t('khld:form.tickets.total')}
              </th>
              {cols.map((c, ci) => <td key={c} className={sum}>{n(colTotal(ci))}</td>)}
              <td className="bg-ink px-2 py-2.5 text-center text-[22px] font-bold tabular-nums text-bg" aria-live="polite">
                {n(grand)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {editable ? (
        <p id={`${id}-note`} className="mb-0 mt-[7px] text-[13.5px] text-muted" style={{ textWrap: 'pretty' }}>{t('khld:form.tickets.note')}</p>
      ) : null}
      {error ? (
        <div id={`${id}-err`} role="alert" className="mt-2 flex items-start gap-[9px]">
          <span className="mt-1 h-[11px] w-[11px] flex-none bg-error" aria-hidden="true" />
          <span className="text-[13.5px] font-semibold leading-[1.4] text-error">{error}</span>
        </div>
      ) : null}
    </div>
  )
}

/** A count is typed on any keyboard: Arabic-Indic and Persian digits become 0-9, anything else is dropped. */
function digitsOnly(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 6)
}

function TicketGlyph() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true" className="flex-none">
      <path
        d="M.75.75h12.5v2.5a1.75 1.75 0 0 0 0 3.5v2.5H.75v-2.5a1.75 1.75 0 0 0 0-3.5z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 1.5v7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 1.3" />
    </svg>
  )
}
