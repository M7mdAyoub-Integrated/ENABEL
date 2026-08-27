import type { ReactNode } from 'react'
import type { ChipKind } from '../modules'
import { ARROW_START } from './glyphs'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Shared parts, drawn to the prototype.
 *
 *  The design is FLAT AND RULED. Three border weights carry all the structure:
 *    1.5px  a control or a card edge
 *    2px    a shell boundary (rail, header)
 *    3px    a section underline
 *    6px    the accent bar under a page head
 *  There are no radii and no shadows anywhere. `--radius-card` is 0 for this
 *  reason; do not reintroduce one here.
 *
 *  Typography is two families doing two jobs: Archivo for content, Archivo
 *  Narrow — always uppercase, always letterspaced — for every label, chip,
 *  button and column head. If a string is a label, it is Narrow and uppercase.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ── page furniture ──────────────────────────────────────────────────────── */

/** The 6px accent bar that sits under every page head. */
export function AccentRule({ className = 'bg-ink' }: { className?: string }) {
  return <div className={`h-1.5 ${className}`} />
}

const HEAD_SIZE = {
  /** Dashboard. */
  xl: 'text-[34px] leading-[0.93] sm:text-[46px]',
  /** List, manual entries, settings. */
  lg: 'text-[30px] leading-[0.95] sm:text-[40px]',
  /** Form, detail. */
  md: 'text-[28px] leading-[0.97] sm:text-[38px]',
} as const

/**
 * The page head: eyebrow, uppercase display title, optional action at the end.
 *
 * The title is `text-wrap: balance` rather than the prototype's hard `<br/>`,
 * because the same string in Arabic breaks in a different place.
 */
export function PageHead({
  eyebrow,
  chips,
  title,
  description,
  action,
  size = 'lg',
  back,
}: {
  eyebrow?: ReactNode
  chips?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  size?: keyof typeof HEAD_SIZE
  back?: ReactNode
}) {
  return (
    <>
      {back}
      <div
        className={`flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end sm:gap-9 ${
          back ? 'pb-4 pt-[10px]' : 'pb-4 pt-[30px]'
        }`}
      >
        <div className="min-w-0">
          {eyebrow ? (
            <div className="font-narrow text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
              {eyebrow}
            </div>
          ) : null}
          {chips ? <div className="mb-[9px] flex flex-wrap items-center gap-3">{chips}</div> : null}
          <h1
            className={`m-0 font-black uppercase tracking-[-0.038em] ${HEAD_SIZE[size]} ${
              eyebrow ? 'mt-2.5' : ''
            }`}
            style={{ textWrap: 'balance' }}
          >
            {title}
          </h1>
          {description ? (
            <p
              className="mt-[9px] max-w-[640px] text-[15px] text-body"
              style={{ textWrap: 'pretty' }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="flex flex-none gap-2.5">{action}</div> : null}
      </div>
    </>
  )
}

/** A section underline: 3px rule, uppercase title, optional right-hand slot. */
export function SectionRule({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-[30px] gap-y-2 border-b-[3px] border-ink pb-2">
      <h2 className="m-0 text-[15px] font-extrabold uppercase tracking-[0.1em]">{title}</h2>
      {right}
    </div>
  )
}

/** The "← Back to X" link above a form or detail head. */
export function BackLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer pt-[26px] font-narrow text-[12px] font-bold uppercase tracking-[0.14em] text-muted hover:text-ink"
    >
      <span aria-hidden="true" className="inline-block mirror-rtl">{ARROW_START}</span> {children}
    </button>
  )
}

/* ── chips ───────────────────────────────────────────────────────────────── */

const CHIP_TONE: Record<ChipKind, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  err: 'text-error',
  mute: 'text-faint',
  pending: 'text-warning',
}

/**
 * A status mark: a filled square then the label.
 *
 * The square is what carries the status, not the colour alone -- these appear
 * in dense tables and colour on its own is not an accessible signal.
 */
export function Chip({ children, tone = 'mute' }: { children: ReactNode; tone?: ChipKind }) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap font-narrow text-[12px] font-bold uppercase tracking-[0.1em] ${CHIP_TONE[tone]}`}
    >
      <span className="h-2.5 w-2.5 flex-none bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

/** A solid pill on an accent, used for objectives and section markers. */
export function Pill({ children, className = 'bg-ink' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`px-[9px] py-[3px] font-narrow text-[11px] font-bold uppercase tracking-[0.14em] text-bg ${className}`}
    >
      {children}
    </span>
  )
}

/** An outlined pill: dashed amber for "no form", solid black for "read only". */
export function OutlinePill({
  children,
  tone = 'ink',
}: {
  children: ReactNode
  tone?: 'ink' | 'amber'
}) {
  const cls =
    tone === 'amber'
      ? 'border-dashed border-amber text-amber'
      : 'border-solid border-ink text-ink'
  return (
    <span
      className={`border-[1.5px] px-[9px] py-[2px] font-narrow text-[11px] font-bold uppercase tracking-[0.14em] ${cls}`}
    >
      {children}
    </span>
  )
}

/* ── progress ────────────────────────────────────────────────────────────── */

export function ProgressBar({
  pct,
  label,
  className = 'bg-ink',
  height = 'h-3',
}: {
  pct: number
  label: string
  className?: string
  height?: string
}) {
  return (
    <span className={`block bg-track ${height}`} role="img" aria-label={label}>
      <span className={`block h-full ${className}`} style={{ width: `${pct}%` }} />
    </span>
  )
}

/**
 * Booth availability: one segment per booth, not a percentage bar.
 *
 * The prototype draws every booth because "18 of 30 taken" is a countable fact
 * a producer checks before registering -- a smooth bar hides whether two or
 * twelve are left.
 */
export function SegmentBar({
  segments,
  filled,
  label,
  height = 'h-[22px]',
}: {
  segments: number
  filled: number
  label: string
  height?: string
}) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={label}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={`flex-1 ${height} ${i < filled ? 'bg-bg' : 'bg-bg/28'}`} />
      ))}
    </div>
  )
}

/* ── surfaces ────────────────────────────────────────────────────────────── */

/** A bordered panel. 1.5px black by default; dashed grey when it is a stub. */
export function Card({
  children,
  className = '',
  as: Tag = 'div',
  dashed = false,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
  dashed?: boolean
}) {
  return (
    <Tag
      className={`${
        dashed ? 'border-[1.5px] border-dashed border-border-muted bg-sunken' : 'border-[1.5px] border-ink bg-bg'
      } ${className}`}
    >
      {children}
    </Tag>
  )
}

/** Legacy alias kept so Settings does not need a second heading component. */
export function SectionHeading({ title, right }: { title: string; right?: ReactNode }) {
  return <SectionRule title={title} right={right} />
}

/**
 * The empty / not-found state: a dashed panel with a display-size title.
 *
 * `title` renders as an <h1> when the panel IS the page (an empty list, a 404,
 * a refusal) and as a <p> when something else on the screen already owns the
 * page heading.
 */
export function EmptyState({
  title,
  description,
  actions,
  heading = false,
}: {
  title: string
  description: string
  actions?: ReactNode
  heading?: boolean
}) {
  const Title = heading ? 'h1' : 'p'
  return (
    <div className="border-[1.5px] border-dashed border-border-muted bg-sunken px-[34px] py-16 text-center">
      <Title className="m-0 text-[26px] font-black uppercase tracking-[-0.03em]">{title}</Title>
      <p
        className="mx-auto mb-[22px] mt-2.5 max-w-[430px] text-[15px] text-body"
        style={{ textWrap: 'pretty' }}
      >
        {description}
      </p>
      {actions ? <div className="flex flex-wrap justify-center gap-2.5">{actions}</div> : null}
    </div>
  )
}

/* ── buttons ─────────────────────────────────────────────────────────────────
   Uppercase Archivo Narrow, square, no radius. Sizes come straight from the
   prototype: 13px/22px for a page action, 12px/20px for a dialog action.      */

const BTN =
  'inline-flex cursor-pointer items-center justify-center gap-2 font-narrow font-bold uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal'

export function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  full,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  full?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${BTN} bg-ink px-[22px] py-[13px] text-[12.5px] text-bg ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled,
  full,
  ariaLabel,
  tone = 'ink',
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  full?: boolean
  ariaLabel?: string
  tone?: 'ink' | 'danger'
}) {
  const cls =
    tone === 'danger'
      ? 'border-error text-error hover:bg-error hover:text-bg'
      : 'border-ink text-ink hover:bg-sunken'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${BTN} border-[1.5px] bg-bg px-[22px] py-[13px] text-[12.5px] ${cls} ${full ? 'w-full' : ''}`}
    >
      {children}
    </button>
  )
}

/** A destructive confirm. Solid red, only inside the delete dialog. */
export function DangerButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${BTN} bg-error px-5 py-3 text-[12.5px] text-bg`}
    >
      {children}
    </button>
  )
}

/**
 * The row of small square actions at the end of a table row.
 *
 * One 1.5px frame around the set, hairlines between -- so three buttons read as
 * one control, which is what keeps a dense table from looking like confetti.
 */
export function ActionGroup({ children }: { children: ReactNode }) {
  return <span className="inline-flex border-[1.5px] border-ink">{children}</span>
}

export function ActionButton({
  children,
  onClick,
  tone = 'ink',
  first = false,
}: {
  children: ReactNode
  onClick?: () => void
  tone?: 'ink' | 'danger' | 'ok'
  first?: boolean
}) {
  const cls =
    tone === 'danger'
      ? 'bg-bg text-error'
      : tone === 'ok'
        ? 'bg-success text-bg'
        : 'bg-bg text-ink'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer px-[9px] py-1 font-narrow text-[11.5px] font-bold uppercase tracking-[0.1em] ${cls} ${
        first ? '' : 'border-s-[1.5px] border-ink'
      }`}
    >
      {children}
    </button>
  )
}
