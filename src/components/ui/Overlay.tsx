import { type ReactNode, useEffect } from 'react'
import { Button } from './Button'

/* ═══════════════════════════════════════════════
   OVERLAY & FEEDBACK COMPONENTS
═══════════════════════════════════════════════ */

/* ── Modal ── */
function useEscapeDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [open, onClose])
}

export function Modal({
  open, onClose, title, children, footer, size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEscapeDismiss(open, onClose)
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const widths = { sm: 400, md: 520, lg: 720 }

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--color-surface-overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Dialog'}
        style={{
          width: '100%', maxWidth: widths[size],
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
        {/* Header */}
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                width: 32, height: 32, borderRadius: 'var(--radius-full)',
                border: 'none', background: 'var(--color-surface-raised)',
                cursor: 'pointer', fontSize: 16, color: 'var(--color-text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >✕</button>
          </div>
        )}
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', flexShrink: 0, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Bottom Sheet (mobile) ── */
export function BottomSheet({
  open, onClose, title, children, snapPoint = 'auto',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  snapPoint?: 'auto' | 'half' | 'full'
}) {
  useEscapeDismiss(open, onClose)
  if (!open) return null
  const heights = { auto: 'auto', half: '50vh', full: '92vh' }

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--color-surface-overlay)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Bottom sheet'}
        style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          maxHeight: heights[snapPoint], overflowY: 'auto',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-2xl) var(--radius-2xl) 0 0',
          boxShadow: 'var(--shadow-xl)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 'var(--radius-full)', background: 'var(--color-border)' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 0', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
            <button onClick={onClose} aria-label="Close bottom sheet" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-muted)', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        )}
        <div style={{ padding: '0 20px 20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── Confirmation Dialog ── */
export function Confirmation({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'primary',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  variant?: 'primary' | 'destructive'
}) {
  useEscapeDismiss(open, onClose)
  if (!open) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--color-surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title} style={{ width: '100%', maxWidth: 400, background: 'var(--color-surface)', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-xl)', padding: '28px 28px 24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 10px', color: 'var(--color-text-primary)' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            style={{
              padding: '9px 18px', borderRadius: 'var(--radius-md)', border: 'none',
              background: variant === 'destructive' ? 'var(--color-danger)' : 'var(--color-brand)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Toast ── */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export function Toast({ message, variant = 'info', onDismiss }: {
  message: string; variant?: ToastVariant; onDismiss?: () => void
}) {
  const configs: Record<ToastVariant, { icon: string; bg: string; color: string; border: string }> = {
    success: { icon: '✓', bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success)' },
    error:   { icon: '✕', bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  border: 'var(--color-danger)' },
    info:    { icon: 'ℹ', bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    border: 'var(--color-info)' },
    warning: { icon: '⚠', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning)' },
  }
  const cfg = configs[variant]

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '12px 16px',
      background: cfg.bg,
      border: `1.5px solid ${cfg.border}30`,
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      minWidth: 240, maxWidth: 360,
    }}>
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {cfg.icon}
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: cfg.color, lineHeight: 1.4 }}>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss notification" style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, fontSize: 14, opacity: 0.6, padding: 0, display: 'flex' }}>✕</button>
      )}
    </div>
  )
}

/* ── Banner ── */
export function Banner({ children, variant = 'info', onDismiss }: {
  children: ReactNode; variant?: 'info' | 'warning' | 'error' | 'success'; onDismiss?: () => void
}) {
  const configs = {
    info:    { icon: 'ℹ', bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    border: 'var(--color-info)' },
    warning: { icon: '⚠', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', border: 'var(--color-warning)' },
    error:   { icon: '⚠', bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  border: 'var(--color-danger)' },
    success: { icon: '✓', bg: 'var(--color-success-bg)', color: 'var(--color-success)', border: 'var(--color-success)' },
  }
  const cfg = configs[variant]

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
      background: cfg.bg, borderLeft: `4px solid ${cfg.border}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <span style={{ color: cfg.color, flexShrink: 0, fontSize: 14, marginTop: 1 }}>{cfg.icon}</span>
      <div style={{ flex: 1, fontSize: 13, color: cfg.color, lineHeight: 1.5 }}>{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss message" style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, opacity: 0.6, fontSize: 14, flexShrink: 0 }}>✕</button>
      )}
    </div>
  )
}

/* ── Tooltip ── */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={e => {
        const tip = e.currentTarget.querySelector<HTMLDivElement>('[data-tooltip]')
        if (tip) tip.style.opacity = '1'
      }}
      onMouseLeave={e => {
        const tip = e.currentTarget.querySelector<HTMLDivElement>('[data-tooltip]')
        if (tip) tip.style.opacity = '0'
      }}
    >
      {children}
      <div
        data-tooltip
        style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, padding: '5px 10px',
          background: 'var(--color-text-primary)', color: '#fff',
          borderRadius: 'var(--radius-md)', fontSize: 11, fontFamily: 'var(--font-body)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
          opacity: 0, transition: 'opacity 0.15s',
          zIndex: 100,
        }}
      >
        {content}
      </div>
    </span>
  )
}

/* ── Skeleton ── */
export function Skeleton({ width, height = 16, radius = 'var(--radius-sm)', count = 1 }: {
  width?: number | string; height?: number; radius?: string; count?: number
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width: width ?? '100%', height,
            borderRadius: radius,
            background: 'linear-gradient(90deg, var(--color-surface-raised) 25%, var(--color-border) 50%, var(--color-surface-raised) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
            marginBottom: count > 1 && i < count - 1 ? 6 : 0,
          }}
        />
      ))}
      <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </>
  )
}

/* ── Empty State ── */
export function EmptyState({ icon = '📭', title, description, action }: {
  icon?: string; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
      {description && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.5 }}>{description}</p>}
      {action}
    </div>
  )
}

/* ── Error State ── */
export function ErrorState({ title = 'Something went wrong', description, onRetry }: {
  title?: string; description?: string; onRetry?: () => void
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 40 }}>⚠️</span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>{title}</h3>
      {description && <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.5 }}>{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          style={{ marginTop: 8, padding: '9px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-brand)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          Try again
        </button>
      )}
    </div>
  )
}

/* ── Permission Denied ── */
export function PermissionDenied({ reason = "You don't have permission to access this." }: { reason?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 40 }}>🔒</span>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Access Restricted</h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 320, lineHeight: 1.5 }}>{reason}</p>
    </div>
  )
}

/* ── Reusable system state ── */
export type SystemStateKind =
  | 'loading'
  | 'empty'
  | 'stale'
  | 'validation'
  | 'permission'
  | 'entitlement'
  | 'network'
  | 'conflict'
  | 'processing'
  | 'failed'
  | 'success'
  | 'terminal'

const systemStateConfig: Record<SystemStateKind, { label: string; tone: string; background: string }> = {
  loading: { label: 'Loading', tone: 'var(--color-info)', background: 'var(--color-info-bg)' },
  empty: { label: 'Empty', tone: 'var(--color-text-secondary)', background: 'var(--color-surface-raised)' },
  stale: { label: 'Stale', tone: 'var(--color-warning)', background: 'var(--color-warning-bg)' },
  validation: { label: 'Validation error', tone: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  permission: { label: 'No permission', tone: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  entitlement: { label: 'No entitlement', tone: 'var(--color-warning)', background: 'var(--color-warning-bg)' },
  network: { label: 'Network error', tone: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  conflict: { label: 'Conflict', tone: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  processing: { label: 'Processing', tone: 'var(--color-info)', background: 'var(--color-info-bg)' },
  failed: { label: 'Failed', tone: 'var(--color-danger)', background: 'var(--color-danger-bg)' },
  success: { label: 'Success', tone: 'var(--color-success)', background: 'var(--color-success-bg)' },
  terminal: { label: 'Terminal', tone: 'var(--color-text-secondary)', background: 'var(--color-surface-raised)' },
}

export function SystemStatePanel({
  kind,
  title,
  description,
  detail,
  actionLabel,
  onAction,
}: {
  kind: SystemStateKind
  title: string
  description: string
  detail?: string
  actionLabel?: string
  onAction?: () => void
}) {
  const config = systemStateConfig[kind]
  const isBusy = kind === 'loading' || kind === 'processing'
  const isAlert = ['validation', 'permission', 'network', 'conflict', 'failed'].includes(kind)

  return (
    <div
      className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm"
      role={isAlert ? 'alert' : isBusy ? 'status' : undefined}
      aria-live={isBusy ? 'polite' : undefined}
      aria-busy={isBusy || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
          style={{ background: config.background, color: config.tone }}
        >
          <SystemStateIcon kind={kind} />
        </span>
        <span
          className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: config.background, color: config.tone }}
        >
          {config.label}
        </span>
      </div>
      <div className="mt-5 font-display text-xl font-semibold text-text-primary">{title}</div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">{description}</p>
      {detail && (
        <div className="mt-4 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">
          {detail}
        </div>
      )}
      {actionLabel && onAction && (
        <Button variant="tertiary" size="sm" onClick={onAction} style={{ marginTop: 16, alignSelf: 'flex-start' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

function SystemStateIcon({ kind }: { kind: SystemStateKind }) {
  if (kind === 'loading' || kind === 'processing') {
    return (
      <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".25" />
        <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (kind === 'success') {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  }
  if (kind === 'empty') {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  }
  if (kind === 'permission' || kind === 'entitlement') {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" /></svg>
  }
  if (kind === 'terminal') {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><path d="M8.5 8.5l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4L3.5 19h17L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 9v4.5M12 16.5v.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

/* ── Context Menu ── */
export function ContextMenu({ items, onClose }: {
  items: { label: string; icon?: string; onClick: () => void; destructive?: boolean; disabled?: boolean }[]
  onClose: () => void
}) {
  return (
    <div style={{
      background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)',
      overflow: 'hidden', minWidth: 180,
    }}>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { if (!item.disabled) { item.onClick(); onClose() } }}
          disabled={item.disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '10px 14px', border: 'none', background: 'none', cursor: item.disabled ? 'not-allowed' : 'pointer',
            fontSize: 13, textAlign: 'left', fontFamily: 'var(--font-body)',
            color: item.destructive ? 'var(--color-danger)' : item.disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
            borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
          }}
          onMouseEnter={e => { if (!item.disabled) (e.currentTarget.style.background = 'var(--color-surface-raised)') }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'none') }}
        >
          {item.icon && <span>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  )
}
