import {
  Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent, type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'
import { CHECK } from './glyphs'

/**
 * Every dropdown in the app, with a search box (the owner, 29 September
 * 2026: "search bar in every ddl in the system").
 *
 * A drop-in for a native <select>: the same value / onChange / className /
 * disabled / id / aria props, and either `options` or <option> children, so
 * a <select> becomes a <SearchSelect> without its call site changing shape.
 * `onChange` receives `{ target: { value } }` for that reason.
 *
 * The list is positioned `fixed` against the trigger, so a table or a
 * dialog with `overflow: hidden` cannot clip it, and it opens upward when
 * there is no room below. It mirrors under RTL: its inline-start edge sits
 * on the trigger's. The search matches anywhere in the label, ignoring case
 * and Arabic diacritics, so "زيت" finds «زيت الزيتون / الزيتون».
 */

export type SearchOption = { value: string; label: string; disabled?: boolean }

type Props = {
  id?: string | undefined
  value: string
  onChange?: ((e: { target: { value: string } }) => unknown) | undefined
  onValueChange?: ((value: string) => unknown) | undefined
  options?: SearchOption[] | undefined
  children?: ReactNode | undefined
  disabled?: boolean | undefined
  className?: string | undefined
  placeholder?: string | undefined
  'aria-invalid'?: boolean | 'true' | 'false' | undefined
  'aria-describedby'?: string | undefined
  'aria-label'?: string | undefined
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

function optionsFrom(children: ReactNode): SearchOption[] {
  const out: SearchOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode; disabled?: boolean }>(child)) return
    if (child.type === Fragment) {
      out.push(...optionsFrom(child.props.children))
      return
    }
    if (child.type === 'option') {
      out.push({
        value: child.props.value == null ? textOf(child.props.children) : String(child.props.value),
        label: textOf(child.props.children),
        ...(child.props.disabled ? { disabled: true } : {}),
      })
    }
  })
  return out
}

/** Lower case, no Arabic diacritics or tatweel, alef forms folded: what a search compares. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
}

const PANEL_MAX = 300

export function SearchSelect(props: Props) {
  const { t } = useTranslation('common')
  const autoId = useId()
  const listId = `${autoId}-list`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [place, setPlace] = useState<{ top: number; left: number; width: number; up: boolean } | null>(null)

  const all = useMemo(() => props.options ?? optionsFrom(props.children), [props.options, props.children])
  // The empty-value option is the placeholder ("Choose…", "All …"): shown on
  // the trigger when nothing is chosen, and first in the list so it can be
  // chosen again to clear.
  const current = all.find((o) => o.value === props.value)
  const shownLabel = current?.label ?? all.find((o) => o.value === '')?.label ?? props.placeholder ?? t('picker.choose')
  const empty = !props.value

  const filtered = useMemo(() => {
    const q = fold(query.trim())
    return q ? all.filter((o) => fold(o.label).includes(q)) : all
  }, [all, query])

  const measure = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = Math.max(r.width, 240)
    const rtl = getComputedStyle(el).direction === 'rtl'
    const left = Math.min(Math.max(8, rtl ? r.right - width : r.left), window.innerWidth - width - 8)
    const below = window.innerHeight - r.bottom
    const up = below < PANEL_MAX + 12 && r.top > below
    setPlace({ top: up ? r.top : r.bottom, left, width, up })
  }

  useLayoutEffect(() => {
    if (!open) return
    measure()
    const on = () => measure()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  function openList() {
    if (props.disabled) return
    setQuery('')
    const i = all.findIndex((o) => o.value === props.value)
    setActive(i >= 0 ? i : 0)
    setOpen(true)
  }

  function choose(o: SearchOption) {
    if (o.disabled) return
    setOpen(false)
    triggerRef.current?.focus()
    if (o.value === props.value) return
    props.onChange?.({ target: { value: o.value } })
    props.onValueChange?.(o.value)
  }

  function step(from: number, dir: 1 | -1): number {
    for (let i = from + dir; i >= 0 && i < filtered.length; i += dir) if (!filtered[i]!.disabled) return i
    return from
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => step(Math.min(a, filtered.length - 1), 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => step(Math.min(a, filtered.length), -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) choose(o) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  const cls = props.className ?? ''
  const block = /(^|\s)(w-full|block|flex-1)(\s|$)/.test(cls)

  return (
    <span className={`relative ${block ? 'block w-full' : 'inline-block'}`}>
      <button
        ref={triggerRef}
        type="button"
        {...(props.id ? { id: props.id } : {})}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        {...(props['aria-invalid'] != null ? { 'aria-invalid': props['aria-invalid'] } : {})}
        {...(props['aria-describedby'] ? { 'aria-describedby': props['aria-describedby'] } : {})}
        {...(props['aria-label'] ? { 'aria-label': props['aria-label'] } : {})}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() }
        }}
        className={`${cls} flex items-center justify-between gap-2 text-start disabled:cursor-not-allowed disabled:opacity-60 ${block ? 'w-full' : ''}`}
      >
        <span className={`min-w-0 flex-1 truncate ${empty ? 'text-ghost' : ''}`}>{shownLabel}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" className={`flex-none transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      {open && place ? (
        <div
          ref={panelRef}
          className="fixed z-[80] flex flex-col border-[1.5px] border-ink bg-bg text-ink shadow-[0_8px_24px_rgba(17,17,16,0.18)]"
          style={{
            left: place.left,
            width: place.width,
            maxHeight: PANEL_MAX,
            ...(place.up ? { bottom: window.innerHeight - place.top + 4 } : { top: place.top + 4 }),
          }}
        >
          <div className="flex-none border-b-[1.5px] border-ink p-1.5">
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              {...(filtered[active] ? { 'aria-activedescendant': `${listId}-${active}` } : {})}
              aria-label={t('picker.search')}
              placeholder={t('picker.search')}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
              onKeyDown={onSearchKey}
              className="w-full border-[1.5px] border-border-strong bg-input px-2.5 py-2 text-[14px] normal-case tracking-normal text-ink placeholder:text-ghost focus:border-ink focus:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-[14px] normal-case tracking-normal text-muted">{t('picker.noMatch')}</li>
            ) : null}
            {filtered.map((o, i) => {
              const selected = o.value === props.value
              return (
                <li
                  key={`${o.value}-${i}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={o.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-start text-[14.5px] normal-case leading-[1.35] tracking-normal ${
                    o.disabled ? 'cursor-not-allowed text-ghost' : i === active ? 'bg-sunken' : ''
                  } ${selected ? 'font-bold' : 'font-normal'} ${o.value === '' ? 'text-muted' : ''}`}
                >
                  <span aria-hidden="true" className="w-3 flex-none pt-px">{selected ? CHECK : ''}</span>
                  <span className="min-w-0 flex-1">{o.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </span>
  )
}

export default SearchSelect
