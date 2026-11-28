import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CONTEXT_GROUPS, contextGroupOf, contextKey, contextSubject, sameContext, type MessageContext } from '../../demo-data'
import { IconCheck, IconChevronDown } from '../ShellHelpers'

/**
 * FR-002: the reply's "Talking about" selector. Two parts share one listbox:
 *  - ContextListbox: the options (General, Product Posts, Scene Posts, Orders and the combined "Product in Scene" choices, exactly the
 *    conversation's), a search field once the list is long, Arrow / Home / End / Enter / Escape / Tab, type-ahead, a check mark and a
 *    highlight on the chosen one. The Companion's sheet uses it directly.
 *  - ContextPicker: the Seller Console's control. A trigger styled like the console's other fields, and the listbox in a popover that
 *    opens on whichever side of the trigger has room and is never clipped by the panel (it is placed against the window, not inside the panel).
 */
const SEARCH_FROM = 8 // a search field appears once there are more choices than this

export function ContextListbox({ choices, selected, onSelect, onClose, label = 'Talking about', maxHeight = 320 }: {
  choices: readonly MessageContext[]; selected: MessageContext; onSelect: (context: MessageContext) => void
  onClose: (reason: 'escape' | 'tab') => void; label?: string; maxHeight?: number
}) {
  const uid = useId()
  const searchable = choices.length > SEARCH_FROM
  const [query, setQuery] = useState('')
  const [typed, setTyped] = useState('')
  const q = query.trim().toLowerCase()
  const groups = useMemo(() => CONTEXT_GROUPS.map(group => ({ group, options: choices.filter(c => contextGroupOf(c) === group.kind && (!q || contextSubject(c).toLowerCase().includes(q))) })).filter(g => g.options.length), [choices, q])
  const flat = useMemo(() => groups.flatMap(g => g.options), [groups])
  const [active, setActive] = useState(() => Math.max(0, choices.findIndex(c => sameContext(c, selected))))
  const root = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const optionId = (i: number) => `${uid}-o${i}`
  const current = Math.min(active, Math.max(0, flat.length - 1))
  useEffect(() => { (search.current ?? list.current)?.focus() }, [])
  useEffect(() => { document.getElementById(optionId(current))?.scrollIntoView({ block: 'nearest' }) }, [current, flat.length])
  useEffect(() => { if (!typed) return; const timer = setTimeout(() => setTyped(''), 700); return () => clearTimeout(timer) }, [typed])
  const move = (i: number) => setActive(Math.max(0, Math.min(flat.length - 1, i)))
  const onKeyDown = (e: KeyboardEvent) => {
    const stop = () => { e.preventDefault(); e.stopPropagation() }
    if (e.key === 'ArrowDown') { stop(); move(current + 1) }
    else if (e.key === 'ArrowUp') { stop(); move(current - 1) }
    else if (e.key === 'Home') { stop(); move(0) }
    else if (e.key === 'End') { stop(); move(flat.length - 1) }
    else if (e.key === 'Enter') { stop(); if (flat[current]) onSelect(flat[current]) }
    else if (e.key === 'Escape') { stop(); onClose('escape') }
    else if (e.key === 'Tab') onClose('tab')
    else if (!searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      // Type-ahead on a short list: the first choice that starts with what was typed.
      const next = typed + e.key.toLowerCase()
      setTyped(next)
      const hit = flat.findIndex(c => contextSubject(c).toLowerCase().startsWith(next))
      if (hit >= 0) setActive(hit)
    }
  }
  let index = -1
  return (
    <div ref={root} onKeyDown={onKeyDown}>
      {searchable && (
        <div className="border-b border-border p-2">
          <input ref={search} type="search" aria-label={`Search ${label.toLowerCase()} choices`} aria-controls={`${uid}-list`} aria-activedescendant={flat.length ? optionId(current) : undefined}
            value={query} onChange={e => { setQuery(e.target.value); setActive(0) }} placeholder="Search Products, Scenes…" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text-primary" />
        </div>
      )}
      <div ref={list} id={`${uid}-list`} role="listbox" aria-label={label} tabIndex={searchable ? -1 : 0} aria-activedescendant={flat.length ? optionId(current) : undefined} style={{ maxHeight }} className="overflow-y-auto p-1 outline-none">
        {flat.length === 0 && <p role="status" className="px-3 py-4 text-center text-sm text-text-muted">No choice matches “{query}”.</p>}
        {groups.map(({ group, options }) => (
          <div key={group.kind} role="group" aria-label={'label' in group ? group.label : 'General'}>
            {'label' in group && <div aria-hidden="true" className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>}
            {options.map(choice => {
              const i = ++index
              const chosen = sameContext(choice, selected)
              return (
                <div key={contextKey(choice)} id={optionId(i)} role="option" aria-selected={chosen} onMouseMove={() => { if (active !== i) setActive(i) }} onClick={() => onSelect(choice)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${chosen ? 'bg-brand-muted font-semibold text-brand-dark' : 'text-text-primary'} ${i === current ? (chosen ? 'ring-2 ring-inset ring-brand' : 'bg-surface-raised ring-2 ring-inset ring-border-strong') : ''}`}>
                  <span className="min-w-0 break-words">{contextSubject(choice)}</span>
                  {chosen && <span aria-hidden="true" className="flex-shrink-0 text-brand-text"><IconCheck size={14} /></span>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

type Place = { style: CSSProperties; maxHeight: number; side: 'above' | 'below' }
const GAP = 4, EDGE = 8

/** Where the popover goes: below the trigger when it fits, else above, whichever has more room; always inside the window. */
function placeFor(trigger: DOMRect, wanted: number): Place {
  const below = window.innerHeight - trigger.bottom - EDGE - GAP
  const above = trigger.top - EDGE - GAP
  const side = below >= Math.min(wanted, 260) || below >= above ? 'below' : 'above'
  const room = Math.max(120, Math.floor(side === 'below' ? below : above))
  const width = Math.min(Math.max(trigger.width, 280), window.innerWidth - EDGE * 2)
  const left = Math.min(Math.max(trigger.left, EDGE), window.innerWidth - width - EDGE)
  return { side, maxHeight: room, style: { position: 'fixed', left, width, ...(side === 'below' ? { top: trigger.bottom + GAP } : { bottom: window.innerHeight - trigger.top + GAP }) } }
}

export function ContextPicker({ label = 'Talking about', choices, value, onChange }: { label?: string; choices: readonly MessageContext[]; value: MessageContext; onChange: (context: MessageContext) => void }) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<Place | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const reposition = () => { if (trigger.current) setPlace(placeFor(trigger.current.getBoundingClientRect(), 360)) }
  useLayoutEffect(() => { if (open) reposition() }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => { const t = e.target as Node; if (!popover.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true) }
  }, [open])
  const close = (refocus: boolean) => { setOpen(false); if (refocus) trigger.current?.focus() }
  return (
    <div className="flex min-w-0 max-w-md flex-1 items-center gap-3 max-sm:max-w-none">
      <label htmlFor={`${uid}-t`} className="flex-shrink-0 text-xs font-semibold text-text-secondary">{label}</label>
      <button ref={trigger} id={`${uid}-t`} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${uid}-p` : undefined}
        onClick={() => setOpen(o => !o)} onKeyDown={e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true) } }}
        className={`flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border bg-surface px-3 text-left text-sm font-normal text-text-primary ${open ? 'border-brand' : 'border-border'}`}>
        <span className="min-w-0 truncate">{contextSubject(value)}</span>
        <span aria-hidden="true" data-chevron={open ? 'up' : 'down'} className={`flex-shrink-0 text-text-secondary transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}><IconChevronDown size={16} /></span>
      </button>
      {open && place && createPortal(
        <div ref={popover} id={`${uid}-p`} data-placement={place.side} style={place.style} className="z-[70] overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          <ContextListbox choices={choices} selected={value} maxHeight={place.maxHeight - (choices.length > SEARCH_FROM ? 58 : 0)} label={label}
            onSelect={c => { onChange(c); close(true) }} onClose={() => close(true)} />
        </div>, document.body)}
    </div>
  )
}
