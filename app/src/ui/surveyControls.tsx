import { useTranslation } from 'react-i18next'
import { refLabel, type RefRow } from '../data/refTables'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The follow-up survey's controls.
 *
 *  Shared by all six sections because they must behave identically: an
 *  enumerator learns one interaction on Q7 and uses it forty-three times, in a
 *  field, on a phone, while someone waits for the next question.
 *
 *  ── PHONE FIRST MEANS 320px, NOT "RESPONSIVE" ──
 *
 *  Every measurement here is taken at 320px, the narrowest phone still in use.
 *  Inside the page and card padding that leaves about 256px of usable width.
 *  A control that needs more than that does not exist on this screen.
 *
 *  No native `select` anywhere. On a phone it opens a picker that covers the
 *  question just read aloud, and the enumerator loses their place.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CARD = 'mt-4 border-[1.5px] border-ink p-4 sm:p-5'
export const STEM = 'm-0 text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]'
export const NOTE = 'mt-1 text-[13.5px] leading-[1.5] text-muted'

/** One answer from a short fixed list. Full-width, stacked. */
export function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-12 border-[1.5px] px-4 text-start text-[15px] ${
            value === o.value
              ? 'border-ink bg-ink font-semibold text-bg'
              : 'border-border-strong bg-bg text-ink hover:bg-sunken'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Any number of answers, plus the specification when one of them is "Other".
 *
 * ── WHY THE FREE-TEXT BOX IS PART OF THIS CONTROL ──
 *
 * Seven of the survey's eight option lists carry one `allows_free_text` option.
 * Until 0082 nothing collected the text and nothing missed it: the tick was
 * stored, "something else" was recorded, and what it actually was went in the
 * bin. 0082 made that a refusal rather than a silent loss, so the box has to be
 * here or the save fails.
 *
 * It appears only while that option is ticked, and unticking clears it —
 * otherwise text from a corrected answer would ride along with the save.
 */
export function MultiChoice({
  rows,
  selected,
  other,
  onToggle,
  onOther,
  locale,
}: {
  rows: RefRow[]
  selected: string[]
  other: string
  onToggle: (id: string) => void
  onOther: (v: string) => void
  locale: string
}) {
  const { t } = useTranslation(['survey'])
  const freeRow = rows.find((r) => r.allows_free_text)
  const freeOn = !!freeRow && selected.includes(freeRow.id)

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rows.map((r) => {
        const on = selected.includes(r.id)
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(r.id)}
            className={`flex min-h-12 items-center gap-3 border-[1.5px] px-4 py-2 text-start text-[15px] ${
              on
                ? 'border-ink bg-sunken font-semibold text-ink'
                : 'border-border-strong bg-bg text-ink'
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-4 w-4 flex-none border-[1.5px] ${
                on ? 'border-ink bg-ink' : 'border-border-strong'
              }`}
            />
            {refLabel(r, locale)}
          </button>
        )
      })}

      {freeOn ? (
        <label className="mt-1 block">
          <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
            {t('survey:otherPlease')}
          </span>
          <input
            className="mt-1.5 block min-h-12 w-full border-[1.5px] border-border-strong bg-bg px-3 text-[16px] text-ink focus:border-ink focus:outline-none"
            value={other}
            onChange={(e) => onOther(e.target.value)}
            maxLength={200}
          />
          {other.trim() === '' ? (
            <span className="mt-1 block text-[13px] leading-[1.45] text-warning">
              {t('survey:otherRequired')}
            </span>
          ) : null}
        </label>
      ) : null}
    </div>
  )
}

/** A whole number typed into a box. `dir="ltr"` so digits read the same in Arabic. */
export function NumberBox({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  invalid?: boolean
}) {
  return (
    <label className="block">
      <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <input
        className={`mt-1.5 block min-h-12 w-full border-[1.5px] bg-bg px-3 text-[16px] text-ink focus:outline-none ${
          invalid ? 'border-error' : 'border-border-strong focus:border-ink'
        }`}
        type="number"
        min={0}
        inputMode="numeric"
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export type TriStatus = 'done' | 'in_progress' | 'not_started'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Q23 — nine items, three states each, on a 320px screen.
 *
 *  ── WHY THIS IS NOT A MATRIX ──
 *
 *  The obvious transcription of a paper checklist is a 9 x 3 grid with Done /
 *  In progress / Not started as column headings. It is wrong here twice over.
 *
 *  It does not fit. 256px split three ways is ~80px a column, and the item
 *  label — "Product label showing name, ingredients, weight, production and
 *  expiry dates" — gets whatever is left over, which is nothing.
 *
 *  More importantly it is the wrong shape for the interaction. A matrix is for
 *  comparing rows. Nobody compares these. The enumerator reads item one aloud,
 *  hears an answer, taps, reads item two. The work is sequential, so the layout
 *  is sequential: the label gets the full width, and the three choices sit
 *  underneath it.
 *
 *  ── WHY ANSWERED ITEMS DO NOT COLLAPSE ──
 *
 *  Nine stacked blocks is a long scroll, and collapsing each one on answer
 *  would halve it. It would also move the next item up under a finger that has
 *  just tapped — and the tap after that lands on the wrong row. In a field,
 *  with one hand, that is a wrong answer nobody notices.
 *
 *  Stable geometry beats a shorter page. Nothing on this control ever moves.
 *
 *  ── SO THE PROBLEM BECOMES LOSING YOUR PLACE, AND THAT IS WHAT THE HEADER IS ──
 *
 *  A count of what is answered, and a jump to the first item that is not. An
 *  unanswered item nine screens down is otherwise invisible.
 *
 *  ── AN UNANSWERED ITEM IS NOT "NOT STARTED" ──
 *
 *  Three buttons and none pressed is the fourth state, and it is the one the
 *  database stores as no row at all. Defaulting the nine to `not_started` would
 *  turn every half-finished interview into nine findings the respondent never
 *  gave. That is why the count exists rather than a tidy pre-filled grid.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SafetyChecklist({
  rows,
  value,
  onSet,
  locale,
}: {
  rows: RefRow[]
  value: Record<string, TriStatus>
  onSet: (itemId: string, status: TriStatus) => void
  locale: string
}) {
  const { t } = useTranslation(['survey'])
  const answered = rows.filter((r) => value[r.id]).length
  const firstUnanswered = rows.find((r) => !value[r.id])

  const STATES: TriStatus[] = ['done', 'in_progress', 'not_started']

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-[1.5px] border-ink bg-sunken px-3 py-2">
        <span className="font-narrow text-[12px] font-bold uppercase tracking-[0.12em] text-ink">
          {t('survey:b.q23Progress', { done: answered, total: rows.length })}
        </span>
        {firstUnanswered ? (
          <button
            type="button"
            onClick={() =>
              document
                .getElementById(`q23-${firstUnanswered.id}`)
                ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }
            className="ms-auto border-[1.5px] border-ink px-2.5 py-1 font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-ink"
          >
            {t('survey:b.q23Jump')}
          </button>
        ) : (
          <span className="ms-auto font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-success">
            {t('survey:b.q23Complete')}
          </span>
        )}
      </div>

      <ol className="m-0 mt-2 list-none p-0">
        {rows.map((r, i) => {
          const picked = value[r.id]
          return (
            <li
              key={r.id}
              id={`q23-${r.id}`}
              className="border-[1.5px] border-t-0 border-border-strong p-3 first:border-t-[1.5px]"
            >
              <div className="flex gap-2.5">
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center font-narrow text-[12px] font-bold ${
                    picked ? 'bg-ink text-bg' : 'border-[1.5px] border-border-strong text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-[1.4] text-ink">
                  {refLabel(r, locale)}
                </span>
              </div>
              {/* Three equal columns. Labels wrap to two lines at 320px rather
                  than being shortened -- "In progress" is the answer, and a
                  snappier word would be a different one. */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={picked === s}
                    onClick={() => onSet(r.id, s)}
                    className={`min-h-14 border-[1.5px] px-1 text-[13px] leading-[1.25] ${
                      picked === s
                        ? 'border-ink bg-ink font-semibold text-bg'
                        : 'border-border-strong bg-bg text-ink'
                    }`}
                  >
                    {t(`survey:b.tri.${s}`)}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
