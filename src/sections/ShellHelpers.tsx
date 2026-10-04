/** Shared structural primitives for Adulis product shell prototypes. */

import { useRef, useState, ReactNode } from 'react'
import { initials } from '../demo-data'

/* ─── Phone Frame ─── */
/** `clock` is the status-bar time: the story moment the surface shows ('10:25'). */
export function PhoneFrame({ children, label, clock, toolbar }: { children: ReactNode; label?: string; clock: string; toolbar?: ReactNode }) {
  return (
    <div className="phone-stage flex flex-col items-center py-10" style={{ background: 'var(--color-background)', minHeight: '100%' }}>
      {label && (
        <p className="mb-4 text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </p>
      )}
      {/* A prototype-only control above the phone, outside the product UI (specification §61). */}
      {toolbar}
      <div
        className="phone-frame relative flex flex-col overflow-hidden"
        style={{
          width: 390,
          height: 844,
          borderRadius: 44,
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border-strong)',
          background: 'var(--color-surface)',
        }}
      >
        {/* Status bar */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{ height: 44, background: 'inherit' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{clock}</span>
          <div className="flex items-center gap-1">
            <StatusSignal />
            <StatusWifi />
            <StatusBattery />
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ─── Phone status icons ─── */
function StatusSignal() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" style={{ color: 'var(--color-text-primary)' }}>
      <rect x="0" y="8" width="3" height="4" rx="1" opacity="1" />
      <rect x="4.5" y="5.5" width="3" height="6.5" rx="1" opacity="1" />
      <rect x="9" y="3" width="3" height="9" rx="1" opacity="1" />
      <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3" />
    </svg>
  )
}
function StatusWifi() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" style={{ color: 'var(--color-text-primary)' }}>
      <path d="M8 10a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/>
      <path d="M4.93 7.07a4.5 4.5 0 016.14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M2.34 4.66a8 8 0 0111.32 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}
function StatusBattery() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" style={{ color: 'var(--color-text-primary)' }}>
      <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
      <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
      <path d="M23 4v4a2 2 0 000-4z" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  )
}

/* ─── Bottom Nav ─── */
export interface BottomNavItem {
  key: string
  label: string
  icon: ReactNode
  badge?: number
}

export function BottomNav({
  items,
  active,
  onSelect,
  accent = 'var(--color-brand)',
}: {
  items: BottomNavItem[]
  active: string
  onSelect: (k: string) => void
  accent?: string
}) {
  return (
    <nav
      className="flex-shrink-0 flex items-center border-t"
      style={{
        height: 83,
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        paddingBottom: 20,
      }}
    >
      {items.map(item => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className="flex-1 flex min-h-11 flex-col items-center justify-center gap-1 relative"
            aria-current={isActive ? 'page' : undefined}
          >
            {item.badge ? (
              <span
                className="absolute top-1 right-1/4 flex items-center justify-center text-white text-xs font-bold rounded-full"
                style={{ width: 16, height: 16, background: accent, fontSize: 9, fontFamily: 'var(--font-mono)' }}
              >
                {item.badge}
              </span>
            ) : null}
            <span style={{ color: isActive ? accent : 'var(--color-text-muted)' }}>{item.icon}</span>
            <span
              className="text-xs font-medium"
              style={{ color: isActive ? accent : 'var(--color-text-muted)', fontSize: 10 }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

/* ─── Tab Bar (horizontal, top-level) ─── */
export function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onSelect: (k: string) => void
}) {
  return (
    <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      {tabs.map(t => {
        const isActive = active === t.key
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className="flex-1 py-3 text-xs font-semibold transition-colors relative"
            style={{ color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)' }}
          >
            {t.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-4 right-4 rounded-t-full"
                style={{ height: 2, background: 'var(--color-brand)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Desktop top-bar ─── */
export interface SellerOption<T extends string> {
  id: T
  name: string
  detail: string
}

/** With `sellerOptions` and `onSelectSeller`, the Seller selector's chevron opens a menu of those Sellers. */
export function ConsoleTopBar<T extends string>({
  sellerName,
  sellerSelector,
  dark,
  sellerOptions,
  selectedSeller,
  onSelectSeller,
}: {
  sellerName?: string
  sellerSelector?: boolean
  dark?: boolean
  sellerOptions?: readonly SellerOption<T>[]
  selectedSeller?: T
  onSelectSeller?: (id: T) => void
}) {
  const bg = dark ? 'var(--color-operator-surface)' : 'var(--color-surface)'
  const border = dark ? 'var(--color-operator-border)' : 'var(--color-border)'
  const text = dark ? 'var(--color-operator-text)' : 'var(--color-text-primary)'
  const muted = dark ? 'var(--color-operator-muted)' : 'var(--color-text-muted)'
  const raised = dark ? 'var(--color-operator-raised)' : 'var(--color-surface-raised)'
  const accent = dark ? 'var(--color-operator-accent)' : 'var(--color-brand)'

  return (
    <header
      className="flex-shrink-0 flex items-center gap-3 px-5 border-b"
      style={{ height: 56, background: bg, borderColor: border }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 flex-1 max-w-sm rounded-lg px-3"
        style={{ height: 34, background: raised, color: muted }}
      >
        <IconSearch size={14} />
        <span className="text-xs" style={{ color: muted }}>Search…</span>
      </div>

      <div className="flex-1" />

      {/* Seller name + selector */}
      {sellerName && sellerSelector && sellerOptions && onSelectSeller && (
        <SellerMenu sellerName={sellerName} options={sellerOptions} selected={selectedSeller} onSelect={onSelectSeller} accent={accent} text={text} muted={muted} />
      )}
      {sellerName && !(sellerSelector && sellerOptions && onSelectSeller) && (
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: accent, color: '#fff' }}
          >
            {initials(sellerName)}
          </div>
          <span className="text-sm font-medium" style={{ color: text }}>{sellerName}</span>
          {sellerSelector && (
            <button style={{ color: muted }}>
              <IconChevronDown size={14} />
            </button>
          )}
        </div>
      )}

      {/* Icon cluster */}
      <div className="flex items-center gap-1">
        <TopBarIcon dark={dark}><IconBell size={16} /></TopBarIcon>
        <TopBarIcon dark={dark}><IconHelp size={16} /></TopBarIcon>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ml-1"
          style={{ background: dark ? 'var(--color-operator-raised)' : 'var(--color-brand-muted)', color: dark ? 'var(--color-operator-accent)' : 'var(--color-brand-dark)' }}
        >
          {dark ? 'OP' : sellerName ? initials(sellerName) : ''}
        </div>
      </div>
    </header>
  )
}

/** The top bar's Seller name and avatar as one button, opening the menu of Sellers to switch between. */
function SellerMenu<T extends string>({ sellerName, options, selected, onSelect, accent, text, muted }: {
  sellerName: string
  options: readonly SellerOption<T>[]
  selected?: T
  onSelect: (id: T) => void
  accent: string
  text: string
  muted: string
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const choose = (id: T) => { setOpen(false); onSelect(id) }
  return (
    <div className="relative" onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus() } }}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Seller: ${sellerName}. Switch Seller`}
        className="flex items-center gap-2"
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: accent, color: '#fff' }}
        >
          {initials(sellerName)}
        </span>
        <span className="text-sm font-medium" style={{ color: text }}>{sellerName}</span>
        <span style={{ color: muted }}>
          <IconChevronDown size={14} />
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Switch Seller"
            className="absolute right-0 z-50 mt-2 rounded-xl border p-1.5"
            style={{ top: '100%', width: 264, background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
          >
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>Prototype · Switch Seller</p>
            {options.map(option => {
              const current = option.id === selected
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  autoFocus={current}
                  onClick={() => choose(option.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left"
                  style={{ minHeight: 44, background: current ? 'var(--color-brand-muted)' : 'transparent' }}
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: current ? accent : 'var(--color-surface-raised)', color: current ? '#fff' : 'var(--color-text-secondary)' }}>{initials(option.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{option.name}</span>
                    <span className="block truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>{option.detail}</span>
                  </span>
                  {current && <span className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>Current</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function TopBarIcon({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <button
      className="flex items-center justify-center rounded-lg transition-colors"
      style={{ width: 32, height: 32, color: dark ? 'var(--color-operator-muted)' : 'var(--color-text-muted)' }}
    >
      {children}
    </button>
  )
}

/* ─── Icon set ─── */
export function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
export function IconBell({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2a4.5 4.5 0 00-4.5 4.5V9L2 11h12l-1.5-2V6.5A4.5 4.5 0 008 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6.5 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
export function IconHelp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 6.5a2 2 0 113.5 1.5c-.5.5-1.5 1-1.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="12" r="0.75" fill="currentColor"/>
    </svg>
  )
}
export function IconChevronDown({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
export function IconChevronRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ─── Nav icons for bottom bars ─── */
export function IconHome({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 10.5L12 3l9 7.5V21H15v-5h-6v5H3V10.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
}
export function IconShop({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
export function IconHeart({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 019-0 4.5 4.5 0 019 0C21 14.5 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
}
export function IconOrders({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
export function IconUser({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
export function IconAlerts({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 3a7 7 0 00-7 7v4L3 17h18l-2-3v-4a7 7 0 00-7-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M10 20a2 2 0 004 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
export function IconInbox({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M3 10h4l2 3h6l2-3h4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
}
export function IconMore({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>
}
export function IconMap({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 4v13M15 7v13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}
export function IconTruck({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="1" y="7" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.7"/><path d="M15 11h4l2 4v3h-6V11z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="6" cy="19.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="18" cy="19.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/></svg>
}
export function IconHistory({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 109-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M3 7v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
}

/* ─── Sidebar nav item ─── */
export function SidebarItem({
  label,
  icon,
  active,
  onClick,
  dark,
  indent,
  badge,
}: {
  label: string
  icon?: ReactNode
  active?: boolean
  onClick?: () => void
  dark?: boolean
  indent?: boolean
  badge?: string | number
}) {
  const activeBg = dark ? 'rgba(232,135,74,0.12)' : 'var(--color-brand-muted)'
  const activeText = dark ? 'var(--color-operator-accent)' : 'var(--color-brand-dark)'
  const inactiveText = dark ? 'var(--color-operator-text)' : 'var(--color-text-secondary)'
  const hoverBg = dark ? 'rgba(255,255,255,0.04)' : 'var(--color-surface-raised)'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-lg transition-colors text-left"
      style={{
        padding: indent ? '6px 12px 6px 28px' : '6px 12px',
        background: active ? activeBg : 'transparent',
        color: active ? activeText : inactiveText,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        margin: '1px 4px',
        width: 'calc(100% - 8px)',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = hoverBg }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {icon && <span className="flex-shrink-0" style={{ width: 16, height: 16, display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span
          className="flex-shrink-0 text-xs font-bold rounded-full px-1.5 py-0.5"
          style={{ background: dark ? 'rgba(232,135,74,0.2)' : 'var(--color-brand-muted)', color: dark ? 'var(--color-operator-accent)' : 'var(--color-brand)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function SidebarSeparator({ dark }: { dark?: boolean }) {
  return <div className="mx-4 my-2" style={{ height: 1, background: dark ? 'var(--color-operator-border)' : 'var(--color-border)' }} />
}

export function SidebarGroupLabel({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <div
      className="px-4 pt-3 pb-1 text-xs font-semibold tracking-widest uppercase"
      style={{ color: dark ? 'var(--color-operator-muted)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 9 }}
    >
      {label}
    </div>
  )
}

/* ─── Console sidebar icons ─── */
export function IconGrid({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>
}
export function IconPackage({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 1.5l6 3v6l-6 3-6-3v-6l6-3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 4.5l6 3 6-3M8 7.5V14.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
export function IconImage({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 10.5l4-3.5 3 3 2-1.5 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
}
export function IconChart({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1 14h14M3 10v4M6 7v7M9 4v10M12 1v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
export function IconStore({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1 6l1-4h12l1 4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 6c0 1.1.9 2 2 2s2-.9 2-2 .9 2 2 2 2-.9 2-2 .9 2 2 2 2-.9 2-2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 8v7h10V8" stroke="currentColor" strokeWidth="1.4"/><rect x="6" y="10" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
}
export function IconBot({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="5.5" cy="9.5" r="1" fill="currentColor"/><circle cx="10.5" cy="9.5" r="1" fill="currentColor"/><path d="M6 13h4M8 5V2M6 2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
export function IconSettings({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
export function IconShield({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M8 1.5L2 4v4.5C2 12 5 14.5 8 15.5c3-1 6-3.5 6-7V4L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
}
export function IconKey({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="5.5" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8.5 8.5l6 6M12 11l-1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
export function IconFlag({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 1v14M3 2h9l-2 4 2 4H3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
export function IconUsers({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M15 14c0-2.21-1.34-4-3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
}
export function IconClipboard({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
export function IconActivity({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1 8h2.5l2-5 3 10 2-5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
export function IconGlobe({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 2c-2 2-2 10 0 12M8 2c2 2 2 10 0 12M2 8h12" stroke="currentColor" strokeWidth="1.2"/></svg>
}
export function IconCheck({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M2.5 8l4 4 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
