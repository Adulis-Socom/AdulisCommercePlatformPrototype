import { type ReactNode } from 'react'
import { AdulisLogo } from '../../App'

/* ═══════════════════════════════════════════════
   NAVIGATION COMPONENTS
═══════════════════════════════════════════════ */

/* ── Mobile Bottom Navigation ── */
export interface BottomNavItem {
  key: string
  label: string
  icon: ReactNode
  badge?: number
}

export function MobileBottomNav({
  items,
  active,
  onChange,
}: {
  items: BottomNavItem[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 50,
      }}
    >
      {items.map(item => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
              minWidth: 44,
              minHeight: 44,
              position: 'relative',
            }}
          >
            <span style={{ fontSize: 20, display: 'flex', position: 'relative' }}>
              {item.icon}
              {item.badge !== undefined && item.badge > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  background: 'var(--color-danger)', color: '#fff',
                  borderRadius: 'var(--radius-full)', minWidth: 16, height: 16,
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, lineHeight: 1 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Website Header ── */
export function WebsiteHeader({
  onNavigate,
  currentPath = '/',
}: {
  onNavigate?: (path: string) => void
  currentPath?: string
}) {
  const navItems = [
    { label: 'How It Works', path: '/how-it-works' },
    { label: 'For Sellers', path: '/for-sellers' },
    { label: 'For Buyers', path: '/for-buyers' },
    { label: 'Trust & Safety', path: '/trust' },
    { label: 'Availability', path: '/availability' },
    { label: 'About', path: '/about' },
  ]

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'rgba(250, 248, 245, 0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      height: 64,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', width: '100%', display: 'flex', alignItems: 'center', gap: 32 }}>
        {/* Logo */}
        <button onClick={() => onNavigate?.('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <AdulisLogo size={28} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, color: 'var(--color-text-primary)' }}>Adulis</span>
        </button>

        {/* Nav links */}
        <nav style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => onNavigate?.(item.path)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 10px', borderRadius: 'var(--radius-md)',
                fontSize: 14, fontWeight: currentPath === item.path ? 600 : 400,
                color: currentPath === item.path ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontFamily: 'var(--font-body)',
                transition: 'color 0.1s, background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-raised)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)', background: 'var(--color-surface)',
              fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Explore Adulis
          </button>
          <button
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-brand)', border: 'none',
              fontSize: 13, fontWeight: 600, color: '#fff',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            Join Seller Waitlist
          </button>
        </div>
      </div>
    </header>
  )
}

/* ── Storefront Tabs ── */
export function StorefrontTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
      {tabs.map(tab => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: '12px 16px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderBottom: isActive ? '2px solid var(--color-brand)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'color 0.1s',
              fontFamily: 'var(--font-body)',
              marginBottom: -1,
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: isActive ? 'var(--color-brand)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-brand-muted)' : 'var(--color-surface-raised)',
                padding: '1px 5px', borderRadius: 'var(--radius-full)',
              }}>{tab.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Generic Tabs ── */
export function Tabs({ tabs, active, onChange, size = 'md' }: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
  size?: 'sm' | 'md'
}) {
  const isSm = size === 'sm'
  return (
    <div style={{
      display: 'inline-flex', gap: 2, padding: 4,
      background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-lg)',
    }}>
      {tabs.map(tab => {
        const isActive = tab.key === active
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: isSm ? '5px 10px' : '7px 14px',
              border: 'none', cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
              fontSize: isSm ? 12 : 13,
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-body)',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              background: isActive ? 'var(--color-surface)' : 'none',
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              transition: 'all 0.12s',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Breadcrumbs ── */
export function Breadcrumbs({ items, onNavigate }: {
  items: { label: string; path?: string }[]
  onNavigate?: (path: string) => void
}) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: 'var(--color-border-strong)', fontSize: 12 }}>/</span>}
          {item.path && i < items.length - 1 ? (
            <button
              onClick={() => onNavigate?.(item.path!)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--color-text-muted)', padding: 0,
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-brand)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              {item.label}
            </button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-primary)', fontWeight: i === items.length - 1 ? 600 : 400, fontFamily: 'var(--font-body)' }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

/* ── Filter Chips ── */
export function FilterChips({ filters, active, onChange }: {
  filters: { key: string; label: string }[]
  active: string[]
  onChange: (active: string[]) => void
}) {
  function toggle(key: string) {
    onChange(active.includes(key) ? active.filter(k => k !== key) : [...active, key])
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {filters.map(f => {
        const isActive = active.includes(f.key)
        return (
          <button
            key={f.key}
            onClick={() => toggle(f.key)}
            style={{
              padding: '5px 12px', borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${isActive ? 'var(--color-brand)' : 'var(--color-border)'}`,
              background: isActive ? 'var(--color-brand-muted)' : 'var(--color-surface)',
              color: isActive ? 'var(--color-brand-dark)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
              fontFamily: 'var(--font-body)', transition: 'all 0.12s',
            }}
          >
            {isActive && '✓ '}
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Pagination ── */
export function Pagination({ page, total, pageSize = 20, onChange }: {
  page: number; total: number; pageSize?: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        onClick={() => onChange(page - 1)} disabled={page <= 1}
        style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', cursor: page <= 1 ? 'not-allowed' : 'pointer',
          color: page <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}
      >‹</button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        const p = i + 1
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              border: page === p ? '1.5px solid var(--color-brand)' : '1px solid var(--color-border)',
              background: page === p ? 'var(--color-brand)' : 'var(--color-surface)',
              color: page === p ? '#fff' : 'var(--color-text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 600 : 400,
              fontFamily: 'var(--font-mono)',
            }}
          >{p}</button>
        )
      })}
      <button
        onClick={() => onChange(page + 1)} disabled={page >= totalPages}
        style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
          background: 'var(--color-surface)', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          color: page >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}
      >›</button>
    </div>
  )
}
