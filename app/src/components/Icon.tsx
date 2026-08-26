import type { ReactNode } from 'react'
import { useDirection } from '../hooks/useDirection'

/**
 * Icons whose meaning is tied to reading direction. These mirror in RTL:
 * a "next" arrow must point left in Arabic, because "next" is leftward.
 */
export const DIRECTIONAL_ICONS = [
  'arrow',
  'arrow-start',
  'arrow-end',
  'chevron',
  'chevron-start',
  'chevron-end',
  'back',
  'next',
  'progress',
  'indent',
  'undo',
  'redo',
  'send',
] as const

/**
 * Icons whose meaning is NOT tied to direction. Mirroring these is a bug:
 * a mirrored clock reads as a broken clock, a mirrored checkmark looks wrong,
 * and a mirrored logo is simply the logo backwards.
 */
export const NON_DIRECTIONAL_ICONS = [
  'clock',
  'check',
  'search',
  'user',
  'logo',
  'calendar',
  'download',
  'upload',
  'settings',
  'warning',
  'info',
  'close',
  'plus',
  'minus',
  'trash',
  'lock',
] as const

export type DirectionalIconName = (typeof DIRECTIONAL_ICONS)[number]
export type NonDirectionalIconName = (typeof NON_DIRECTIONAL_ICONS)[number]
export type IconName = DirectionalIconName | NonDirectionalIconName

const DIRECTIONAL_SET: ReadonlySet<string> = new Set(DIRECTIONAL_ICONS)

export function isDirectionalIcon(name: string): boolean {
  return DIRECTIONAL_SET.has(name)
}

type IconProps = {
  /** Which icon this is. Decides whether it mirrors in RTL. */
  name: IconName
  children: ReactNode
  /**
   * Accessible label, already translated. Omit for decorative icons, which are
   * then hidden from assistive tech.
   */
  label?: string
  className?: string
}

/**
 * Wrapper that mirrors directional icons under RTL and leaves the rest alone.
 *
 * The decision is driven by the icon's NAME, not by the call site, so the same
 * icon behaves identically everywhere and nobody has to remember which ones
 * flip. Adding a new icon means adding it to one of the two lists above --
 * a name in neither list does not mirror, which is the safe default.
 */
export function Icon({ name, children, label, className }: IconProps) {
  const { direction } = useDirection()
  const mirror = direction === 'rtl' && isDirectionalIcon(name)

  return (
    <span
      data-icon={name}
      {...(label
        ? { role: 'img', 'aria-label': label }
        : { 'aria-hidden': true })}
      style={mirror ? { transform: 'scaleX(-1)', display: 'inline-flex' } : { display: 'inline-flex' }}
      {...(className ? { className } : {})}
    >
      {children}
    </span>
  )
}

export default Icon
