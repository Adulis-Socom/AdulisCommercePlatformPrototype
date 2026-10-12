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

/** A status's semantic family (specification §57, text + icon status). Each family has one icon, shown beside the text
 * in place of a dot; the text stays the label. */
export type StatusFamily = 'success' | 'pending' | 'warning' | 'failure' | 'info'

/** Every status names its family. The Trust levels keep their own icons instead: they are Trust displays, not part of
 * the status families. */
type StatusConfig = { label: string; bg: string; color: string } & ({ family: StatusFamily; icon?: never } | { family?: never; icon: string })

const STATUS_MAP: Record<string, StatusConfig> = {
  /* ── Order statuses ── */
  paid:              { label: 'Paid',             bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },
  processing:        { label: 'Processing',       bg: 'var(--color-info-bg)',     color: 'var(--color-info)',     family: 'pending' },
  preparing:         { label: 'Preparing',        bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'pending' },
  ready:             { label: 'Ready',            bg: '#EBF0FC',                  color: '#2D5CC2',               family: 'pending' },
  assigned:          { label: 'Courier Assigned', bg: '#F0ECFA',                  color: '#5B3FAF',               family: 'pending' },
  'pickup-verified': { label: 'Pickup Verified',  bg: '#EAF5EE',                  color: 'var(--color-success)',  family: 'success' },
  'in-delivery':     { label: 'In Delivery',      bg: '#F0ECFA',                  color: '#5B3FAF',               family: 'pending' },
  'delivery-verified':{ label: 'Delivery Verified', bg: 'var(--color-success-bg)', color: 'var(--color-success)', family: 'success' },
  completed:         { label: 'Completed',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },
  cancelled:         { label: 'Cancelled',        bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', family: 'failure' },
  refunded:          { label: 'Refunded',         bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'warning' },

  /* ── Payment ── */
  failed:            { label: 'Failed',           bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   family: 'failure' },
  reconciling:       { label: 'Reconciling',      bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'pending' },

  /* ── Content ── */
  draft:             { label: 'Draft',            bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', family: 'info' },
  published:         { label: 'Published',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },
  restricted:        { label: 'Restricted',       bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   family: 'failure' },
  unavailable:       { label: 'Unavailable',      bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', family: 'info' },
  'fyp-ineligible':  { label: 'Not FYP Eligible', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)',  family: 'warning' },

  /* ── Trust ── */
  new:               { label: 'NEW',              bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',   icon: '🌱' },
  rebuilding:        { label: 'REBUILDING',        bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',    icon: '🔄' },
  established:       { label: 'ESTABLISHED',       bg: 'var(--color-info-bg)',     color: 'var(--color-info)',      icon: '🛡️' },
  trusted:           { label: 'TRUSTED',           bg: 'var(--color-success-bg)',  color: 'var(--color-success)',   icon: '✓' },

  /* ── Claim ── */
  open:              { label: 'Open',             bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'warning' },
  'evidence-required':{ label: 'Evidence Required', bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', family: 'warning' },
  'under-review':    { label: 'Under Review',     bg: 'var(--color-info-bg)',     color: 'var(--color-info)',     family: 'pending' },
  resolved:          { label: 'Resolved',         bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },

  /* ── Courier ── */
  available:         { label: 'Available',        bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },
  busy:              { label: 'Busy',             bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'pending' },

  /* ── General ── */
  pending:           { label: 'Pending',          bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)',  family: 'pending' },
  active:            { label: 'Active',           bg: 'var(--color-success-bg)',  color: 'var(--color-success)',  family: 'success' },
  suspended:         { label: 'Suspended',        bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)',   family: 'failure' },
}

/** Custom labels whose meaning differs from their variant's family, by variant and label ("#" stands for a count).
 * Every other custom label takes its variant's family. */
const LABEL_FAMILY: Record<string, StatusFamily> = {
  'active · Current':         'info',    // the current Trust level; the current session
  'active · # open':          'info',    // the Daily Operations Brief's count of open priorities ("6 open")
  'published · Will publish': 'pending', // the Shoppable Post editor's preview: not yet published
  'resolved · None':          'info',    // Order Detail with no active claim
}
const labelKey = (status: string, label: string) => `${status} · ${label.replace(/^\d+(?= open$)/, '#')}`

/** Each family's icon, drawn on a 16-unit grid in the badge's own colour: shapes the prototype already uses (the Seller
 * Console's status check and clock, the System States warning triangle, the Handoff failure cross, the information "i"). */
const FAMILY_ICON: Record<StatusFamily, ReactNode> = {
  success: <path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  pending: <><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" /><path d="M8 4.6V8l2.3 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  warning: <><path d="M8 2.2L1.6 13.4h12.8L8 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 6.4v3.2M8 11.6v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  failure: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  info:    <><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6" /><path d="M8 7.4v3.8M8 4.9v.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
}

export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  status: string
  size?: BadgeSize
  customLabel?: string
}

// The icon is as tall as the label's text.
const BADGE_SIZE: Record<BadgeSize, { fontSize: number; px: number; py: number; gap: number; icon: number }> = {
  sm: { fontSize: 10, px: 6,  py: 2,  gap: 3,  icon: 10 },
  md: { fontSize: 12, px: 8,  py: 3,  gap: 4,  icon: 12 },
  lg: { fontSize: 13, px: 10, py: 4,  gap: 5,  icon: 13 },
}

/** A status reads as its text plus its family's icon (specification §57). The icon is decorative: the text is the label,
 * for assistive technology too. */
export function StatusBadge({ status, size = 'md', customLabel }: BadgeProps) {
  // A status missing from the map shows its own name, as neutral information.
  const cfg: StatusConfig = STATUS_MAP[status] ?? { label: status, bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', family: 'info' }
  const sz = BADGE_SIZE[size]
  const label = customLabel ?? cfg.label

  // A family badge's items align on the label's baseline, so in a line of text the badge sits where its label did (the
  // icon, coming first, would otherwise set the badge's baseline); the icon itself stays centred. A Trust badge keeps
  // its centred alignment.
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: cfg.family ? 'baseline' : 'center',
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
      {cfg.family
        ? <svg width={sz.icon} height={sz.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, alignSelf: 'center' }}>{FAMILY_ICON[LABEL_FAMILY[labelKey(status, label)] ?? cfg.family]}</svg>
        : <span style={{ fontSize: sz.fontSize + 1 }}>{cfg.icon}</span>}
      {label}
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
