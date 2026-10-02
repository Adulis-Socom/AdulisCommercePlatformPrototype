import { type ReactNode } from 'react'

/* ═══════════════════════════════════════════════
   STATUS BADGES — All Adulis status types
═══════════════════════════════════════════════ */

export type OrderStatus =
  | 'paid' | 'processing' | 'preparing' | 'ready' | 'assigned'
  | 'pickup-verified' | 'in-delivery' | 'delivery-verified'
  | 'completed' | 'cancelled' | 'refunded'

export type ContentStatus = 'draft' | 'published' | 'restricted' | 'unavailable' | 'fyp-ineligible'

export type TrustLevel = 'new' | 'rebuilding' | 'established' | 'trusted'

export type ClaimStatus = 'open' | 'evidence-required' | 'under-review' | 'resolved'

export type PaymentStatus = 'paid' | 'processing' | 'failed' | 'reconciling'

export type CourierStatus = 'available' | 'busy' | 'unavailable'

export type AnyStatus =
  | OrderStatus | ContentStatus | TrustLevel | ClaimStatus
  | PaymentStatus | CourierStatus | 'pending' | 'active' | 'suspended'

interface StatusConfig {
  label: string
  bg: string
  color: string
  dot?: string
  icon?: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  /* ── Order statuses ── */
  paid:              { label: 'Paid',             bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  dot: 'var(--color-success)' },
  processing:        { label: 'Processing',       bg: 'var(--color-info-bg)',     color: 'var(--color-info)',     dot: 'var(--color-info)' },
  preparing:         { label: 'Preparing',        bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  dot: 'var(--color-warning)' },
  ready:             { label: 'Ready',            bg: '#EBF0FC',                  color: '#2D5CC2',               dot: '#2D5CC2' },
  assigned:          { label: 'Courier Assigned', bg: '#F0ECFA',                  color: '#5B3FAF',               dot: '#5B3FAF' },
  'pickup-verified': { label: 'Pickup Verified',  bg: '#EAF5EE',                  color: 'var(--color-success)',  dot: 'var(--color-success)' },
  'in-delivery':     { label: 'In Delivery',      bg: '#F0ECFA',                  color: '#5B3FAF',               dot: '#5B3FAF' },
  'delivery-verified':{ label: 'Delivery Verified', bg: 'var(--color-success-bg)', color: 'var(--color-success)', dot: 'var(--color-success)' },
  completed:         { label: 'Completed',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
  cancelled:         { label: 'Cancelled',        bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' },
  refunded:          { label: 'Refunded',         bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },

  /* ── Payment ── */
  failed:            { label: 'Failed',           bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   dot: 'var(--color-danger)' },
  reconciling:       { label: 'Reconciling',      bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  dot: 'var(--color-warning)' },

  /* ── Content ── */
  draft:             { label: 'Draft',            bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' },
  published:         { label: 'Published',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
  restricted:        { label: 'Restricted',       bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)' },
  unavailable:       { label: 'Unavailable',      bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' },
  'fyp-ineligible':  { label: 'Not FYP Eligible', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },

  /* ── Trust ── */
  new:               { label: 'NEW',              bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',   icon: '🌱' },
  rebuilding:        { label: 'REBUILDING',        bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',    icon: '🔄' },
  established:       { label: 'ESTABLISHED',       bg: 'var(--color-info-bg)',     color: 'var(--color-info)',      icon: '🛡️' },
  trusted:           { label: 'TRUSTED',           bg: 'var(--color-success-bg)',  color: 'var(--color-success)',   icon: '✓' },

  /* ── Claim ── */
  open:              { label: 'Open',             bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  dot: 'var(--color-warning)' },
  'evidence-required':{ label: 'Evidence Required', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
  'under-review':    { label: 'Under Review',     bg: 'var(--color-info-bg)',     color: 'var(--color-info)' },
  resolved:          { label: 'Resolved',         bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },

  /* ── Courier ── */
  available:         { label: 'Available',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  dot: 'var(--color-success)' },
  busy:              { label: 'Busy',             bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  dot: 'var(--color-warning)' },

  /* ── General ── */
  pending:           { label: 'Pending',          bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
  active:            { label: 'Active',           bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  dot: 'var(--color-success)' },
  suspended:         { label: 'Suspended',        bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)' },
}

export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  status: string
  size?: BadgeSize
  showDot?: boolean
  customLabel?: string
}

const BADGE_SIZE: Record<BadgeSize, { fontSize: number; px: number; py: number; gap: number; dot: number }> = {
  sm: { fontSize: 10, px: 6,  py: 2,  gap: 3,  dot: 5 },
  md: { fontSize: 12, px: 8,  py: 3,  gap: 4,  dot: 6 },
  lg: { fontSize: 13, px: 10, py: 4,  gap: 5,  dot: 7 },
}

export function StatusBadge({ status, size = 'md', showDot, customLabel }: BadgeProps) {
  const cfg = STATUS_MAP[status] ?? { label: status, bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }
  const sz = BADGE_SIZE[size]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.gap,
        paddingLeft: sz.px,
        paddingRight: sz.px,
        paddingTop: sz.py,
        paddingBottom: sz.py,
        borderRadius: 'var(--radius-full)',
        background: cfg.bg,
        color: cfg.color,
        fontSize: sz.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.icon && <span style={{ fontSize: sz.fontSize + 1 }}>{cfg.icon}</span>}
      {(showDot ?? !!cfg.dot) && !cfg.icon && (
        <span
          style={{
            display: 'inline-block',
            width: sz.dot,
            height: sz.dot,
            borderRadius: '50%',
            background: cfg.dot ?? cfg.color,
            flexShrink: 0,
          }}
        />
      )}
      {customLabel ?? cfg.label}
    </span>
  )
}

/* ── Low-stock / availability inline indicator ── */
export function AvailabilityBadge({ available, lowStock }: { available: boolean; lowStock?: boolean }) {
  if (!available) return <StatusBadge status="unavailable" size="sm" />
  if (lowStock) return (
    <span style={{ fontSize: 11, color: 'var(--color-warning)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
      Low stock
    </span>
  )
  return (
    <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
      In stock
    </span>
  )
}

/* ── Trust badge (larger, used in Product Post / Storefront header) ── */
export function TrustBadge({ level }: { level: TrustLevel }) {
  return <StatusBadge status={level} size="md" />
}
