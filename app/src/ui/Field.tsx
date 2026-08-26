import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import type { Accent } from '../modules'
import { HOOK } from './glyphs'

export type FieldOption = { value: string; label: string; disabled?: boolean }

/** 12-column grid spans, as the prototype's `span` values. */
export type FieldSpan = 3 | 4 | 6 | 12

export type FieldSpec = {
  key: string
  /** Already-translated label. */
  label: string
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'number'
    | 'date'
    | 'select'
    | 'area'
    | 'readonly'
    | 'checks'
    | 'chips'
    | 'radio'
    /** Three-way segmented control. Food-safety items in the survey. */
    | 'tri'
    /** A named but unbuilt question: a dashed rule and a stub label. */
    | 'compact'
  required?: boolean
  /** Grid span out of 12. `half` is kept as a shorthand for 6. */
  span?: FieldSpan
  half?: boolean
  placeholder?: string
  help?: string
  options?: FieldOption[]
  accent?: Accent
  /** LTR data: national ID, phone, email, URL. Gets dir + bidi isolation. */
  ltr?: boolean
  /** Read-only display text. */
  text?: string
  note?: string
  /** Two-column option grid for checks. */
  twoCol?: boolean
  /** Larger radio targets, used for the completion decision. */
  big?: boolean
  disabled?: boolean
  /** Dim the whole field: present but not answerable yet. */
  dim?: boolean
  /** Provenance tag, e.g. "from Training Completion". Already translated. */
  tag?: string
  tagAccent?: Accent
  warn?: string
  error?: string
  /** Confirmation feedback under a paired field, e.g. the two national IDs. */
  match?: { text: string; ok: boolean }
  /** Stub text for a `compact` field. */
  stub?: string
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Form fields, copied from the prototype.
 *
 *  Controls are square, 1.5px black, on PURE WHITE -- not on the page cream.
 *  That single contrast step is what makes a field read as a field in a design
 *  with no shadows and no radii.
 *
 *  Selected options invert to the section's accent with cream text. Checkboxes
 *  are a grid of blocks separated by 1.5px hairlines over a grey ground, so the
 *  set reads as one control rather than a scatter of buttons.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ACCENT_FILL: Record<Accent, string> = {
  teal: 'bg-teal text-bg border-teal',
  green: 'bg-green text-bg border-green',
  amber: 'bg-amber text-bg border-amber',
  slate: 'bg-slate text-bg border-slate',
  ink: 'bg-ink text-bg border-ink',
}

const ACCENT_BG: Record<Accent, string> = {
  teal: 'bg-teal',
  green: 'bg-green',
  amber: 'bg-amber',
  slate: 'bg-slate',
  ink: 'bg-ink',
}

/** 11px/13px padding, 15px text, square, white ground. */
const INPUT_BASE =
  'w-full min-h-11 border-[1.5px] bg-input px-[13px] py-[11px] text-[15px] text-ink placeholder:text-ghost'

/** Tailwind needs whole class names, so the spans are spelled out. */
const SPAN_CLASS: Record<FieldSpan, string> = {
  3: 'col-span-12 sm:col-span-6 lg:col-span-3',
  4: 'col-span-12 sm:col-span-6 lg:col-span-4',
  6: 'col-span-12 sm:col-span-6',
  12: 'col-span-12',
}

export type FieldValue = string | string[] | undefined

export function Field({
  spec,
  value,
  onChange,
  onToggle,
}: {
  spec: FieldSpec
  value: FieldValue
  onChange: (v: string) => void
  onToggle?: (v: string) => void
}) {
  const { t } = useTranslation('forms')
  const id = useId()
  const accent: Accent = spec.accent ?? 'ink'
  const invalid = !!spec.error
  const borderClass = invalid ? 'border-error' : 'border-ink'
  const span: FieldSpan = spec.span ?? (spec.half ? 6 : 12)
  const describedBy = [spec.help ? `${id}-help` : null, spec.error ? `${id}-err` : null]
    .filter(Boolean)
    .join(' ')
  const grouped = spec.type === 'checks' || spec.type === 'chips' || spec.type === 'radio' || spec.type === 'tri'

  const labelBlock = (
    <div className="mb-[7px] flex flex-wrap items-baseline gap-2.5">
      <label
        htmlFor={grouped ? undefined : id}
        className={`font-narrow text-[12px] font-bold uppercase tracking-[0.12em] ${
          spec.type === 'compact' ? 'text-faint' : 'text-ink'
        }`}
      >
        {spec.label}
        {spec.required ? <span className="text-error">{t('requiredMark')}</span> : null}
      </label>
      {spec.tag ? (
        <span
          className={`whitespace-nowrap px-2 py-0.5 font-narrow text-[10.5px] font-bold uppercase tracking-[0.1em] text-bg ${ACCENT_BG[spec.tagAccent ?? 'ink']}`}
        >
          <span aria-hidden="true">{HOOK} </span>
          {spec.tag}
        </span>
      ) : null}
    </div>
  )

  const helpBlock = (
    <>
      {spec.help ? (
        <div
          id={`${id}-help`}
          className="mt-[7px] text-[13.5px] text-muted"
          style={{ textWrap: 'pretty' }}
        >
          {spec.help}
        </div>
      ) : null}
      {spec.match ? (
        <div
          className={`mt-2 inline-flex items-center gap-2 px-2.5 py-[3px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.12em] text-bg ${
            spec.match.ok ? 'bg-success' : 'bg-error'
          }`}
        >
          {spec.match.text}
        </div>
      ) : null}
      {spec.warn ? (
        <div className="mt-[9px] flex items-start gap-[11px] border-[1.5px] border-dashed border-attention-border bg-attention-bg px-[13px] py-2.5">
          <span className="mt-1 h-[11px] w-[11px] flex-none bg-amber" aria-hidden="true" />
          <span
            className="text-[13.5px] leading-[1.45] text-attention-ink"
            style={{ textWrap: 'pretty' }}
          >
            {spec.warn}
          </span>
        </div>
      ) : null}
      {spec.error ? (
        <div id={`${id}-err`} role="alert" className="mt-2 flex items-start gap-[9px]">
          <span className="mt-1 h-[11px] w-[11px] flex-none bg-error" aria-hidden="true" />
          <span className="text-[13.5px] font-semibold leading-[1.4] text-error">{spec.error}</span>
        </div>
      ) : null}
    </>
  )

  const wrap = (inner: React.ReactNode) => (
    <div className={`min-w-0 ${SPAN_CLASS[span]}`} style={spec.dim ? { opacity: 0.55 } : undefined}>
      {labelBlock}
      {inner}
      {helpBlock}
    </div>
  )

  const str = typeof value === 'string' ? value : ''
  const arr = Array.isArray(value) ? value : []

  /* ── a question that exists on paper but has no control yet ── */
  if (spec.type === 'compact') {
    return wrap(
      <div className="border-b-[1.5px] border-dashed border-border-muted py-2 font-narrow text-[12.5px] font-semibold uppercase tracking-[0.08em] text-ghost">
        {spec.stub ?? ''}
      </div>,
    )
  }

  /* ── auto-filled, not editable ── */
  if (spec.type === 'readonly') {
    const shown = spec.text && spec.text.length > 0 ? spec.text : undefined
    return wrap(
      <div className="flex w-full justify-between gap-3 border-[1.5px] border-dashed border-border-muted bg-raised px-[13px] py-[11px]">
        <span
          className={`text-[15px] font-semibold ${shown ? 'text-ink' : 'text-ghost'}`}
          {...(spec.ltr && shown ? { dir: 'ltr' as const, style: { unicodeBidi: 'isolate' } } : {})}
        >
          {shown ?? t('notSet')}
        </span>
        {spec.note ? (
          <span className="whitespace-nowrap pt-[3px] font-narrow text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
            {spec.note}
          </span>
        ) : null}
      </div>,
    )
  }

  if (spec.type === 'select') {
    return wrap(
      <select
        id={id}
        value={str}
        disabled={spec.disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        className={`${INPUT_BASE} cursor-pointer ${borderClass}`}
      >
        <option value="">{spec.placeholder ?? t('selectOption')}</option>
        {(spec.options ?? []).map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>,
    )
  }

  if (spec.type === 'area') {
    return wrap(
      <textarea
        id={id}
        value={str}
        rows={3}
        disabled={spec.disabled}
        onChange={(e) => onChange(e.target.value)}
        {...(spec.placeholder ? { placeholder: spec.placeholder } : {})}
        aria-invalid={invalid}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        className={`${INPUT_BASE} resize-y leading-[1.5] ${borderClass}`}
      />,
    )
  }

  /* ── checkbox grid: blocks over a hairline ground ── */
  if (spec.type === 'checks') {
    const cols = spec.twoCol ? 'sm:grid-cols-2' : 'grid-cols-1'
    return wrap(
      <div
        role="group"
        aria-label={spec.label}
        className={`grid grid-cols-1 gap-[1.5px] border-[1.5px] bg-hairline ${cols} ${
          spec.disabled ? 'border-border-muted' : 'border-ink'
        }`}
      >
        {(spec.options ?? []).map((o) => {
          const on = arr.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={spec.disabled}
              onClick={() => onToggle?.(o.value)}
              className={`flex min-h-11 items-center gap-[11px] px-3 py-[9px] text-start ${
                on
                  ? spec.disabled
                    ? 'bg-border-muted text-bg'
                    : `${ACCENT_FILL[accent]}`
                  : spec.disabled
                    ? 'bg-input text-ghost'
                    : 'bg-input text-ink'
              } ${spec.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                aria-hidden="true"
                className={`h-[14px] w-[14px] flex-none border-[1.5px] ${
                  on ? 'border-bg bg-bg' : spec.disabled ? 'border-border-muted' : 'border-ink'
                }`}
              />
              <span className={`text-[14px] leading-[1.3] ${on ? 'font-bold' : 'font-medium'}`}>
                {o.label}
              </span>
            </button>
          )
        })}
      </div>,
    )
  }

  /* ── chips: free-flowing outlined pills ── */
  if (spec.type === 'chips') {
    return wrap(
      <div role="group" aria-label={spec.label} className="flex flex-wrap gap-[7px]">
        {(spec.options ?? []).map((o) => {
          const on = arr.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              disabled={spec.disabled}
              onClick={() => onToggle?.(o.value)}
              className={`min-h-11 cursor-pointer border-[1.5px] px-[13px] py-[7px] text-[14px] ${
                on ? `${ACCENT_FILL[accent]} font-bold` : 'border-ink bg-input font-medium text-ink'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>,
    )
  }

  /* ── three-way segmented control ── */
  if (spec.type === 'tri') {
    return wrap(
      <div role="radiogroup" aria-label={spec.label} className="flex border-[1.5px] border-ink">
        {(spec.options ?? []).map((o, i) => {
          const on = str === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`min-h-11 flex-1 cursor-pointer whitespace-nowrap px-1.5 py-[7px] font-narrow text-[11.5px] font-bold uppercase tracking-[0.08em] ${
                i > 0 ? 'border-s-[1.5px] border-ink' : ''
              } ${on ? ACCENT_FILL[accent] : 'bg-input text-ink'}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>,
    )
  }

  if (spec.type === 'radio') {
    return wrap(
      <div role="radiogroup" aria-label={spec.label} className="flex flex-wrap gap-[1.5px]">
        {(spec.options ?? []).map((o) => {
          const on = str === o.value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={spec.disabled}
              onClick={() => onChange(o.value)}
              className={`cursor-pointer border-[1.5px] text-start ${
                spec.big
                  ? 'min-h-14 min-w-[150px] px-[22px] py-4 text-[17px]'
                  : 'min-h-11 px-[15px] py-2.5 text-[14px]'
              } ${on ? `${ACCENT_FILL[accent]} font-extrabold` : 'border-ink bg-input font-medium text-ink'}`}
            >
              {o.label}
            </button>
          )
        })}
      </div>,
    )
  }

  // text / email / tel / number / date
  return wrap(
    <input
      id={id}
      type={spec.type}
      value={str}
      disabled={spec.disabled}
      inputMode={spec.type === 'number' || spec.ltr ? 'numeric' : undefined}
      onChange={(e) => onChange(e.target.value)}
      {...(spec.placeholder ? { placeholder: spec.placeholder } : {})}
      aria-invalid={invalid}
      {...(describedBy ? { 'aria-describedby': describedBy } : {})}
      // LTR data inside an RTL form: the value must not reorder against the
      // surrounding Arabic. Applies to input, not just display.
      {...(spec.ltr ? { dir: 'ltr' as const, style: { unicodeBidi: 'isolate' } } : {})}
      className={`${INPUT_BASE} ${borderClass}`}
    />,
  )
}
