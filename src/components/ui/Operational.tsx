import { type ReactNode } from 'react'
import { StatusBadge } from './Badge'

/* ═══════════════════════════════════════════════
   OPERATIONAL COMPONENTS
   Tables, Metrics, Timeline, Audit, Work Queue
═══════════════════════════════════════════════ */

/* ── Data Table ── */
export interface TableColumn<T> {
  key: string
  header: string
  width?: number | string
  render: (row: T) => ReactNode
  sortable?: boolean
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, emptyMessage = 'No records found',
}: {
  columns: TableColumn<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
}) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'grid', gridTemplateColumns: columns.map(c => c.width ?? '1fr').join(' '),
        padding: '10px 16px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-raised)',
      }}>
        {columns.map(col => (
          <div
            key={col.key}
            style={{
              fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {col.header}
            {col.sortable && <span style={{ opacity: 0.5 }}>↕</span>}
          </div>
        ))}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14 }}>
          {emptyMessage}
        </div>
      ) : (
        rows.map((row, i) => (
          <div
            key={row.id}
            onClick={() => onRowClick?.(row)}
            style={{
              display: 'grid', gridTemplateColumns: columns.map(c => c.width ?? '1fr').join(' '),
              padding: '12px 16px',
              borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background 0.1s',
              alignItems: 'center',
            }}
            onMouseEnter={e => { if (onRowClick) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-raised)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            {columns.map(col => (
              <div key={col.key} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {col.render(row)}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

/* ── Metric Card ── */
export interface MetricCardData {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  color?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({ metric }: { metric: MetricCardData }) {
  const trendColor = metric.trend === 'up' ? 'var(--color-success)' : metric.trend === 'down' ? 'var(--color-danger)' : 'var(--color-text-muted)'
  const trendIcon = metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '16px 18px',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', lineHeight: 1.3 }}>{metric.label}</div>
        {metric.icon && <span style={{ fontSize: 18 }}>{metric.icon}</span>}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
        color: metric.color ?? 'var(--color-text-primary)',
        lineHeight: 1, marginBottom: 6,
      }}>
        {metric.value}
      </div>
      {(metric.change !== undefined || metric.changeLabel) && (
        <div style={{ fontSize: 11, color: trendColor, display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>{trendIcon}</span>
          {metric.change !== undefined && <span>{Math.abs(metric.change)}%</span>}
          {metric.changeLabel && <span style={{ color: 'var(--color-text-muted)' }}>{metric.changeLabel}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Order Timeline ── */
export interface TimelineEvent {
  id: string
  label: string
  timestamp?: string
  status: 'completed' | 'active' | 'pending' | 'failed'
  detail?: string
}

export function OrderTimeline({ events }: { events: TimelineEvent[] }) {
  const statusColor = {
    completed: 'var(--color-success)',
    active: 'var(--color-brand)',
    pending: 'var(--color-border-strong)',
    failed: 'var(--color-danger)',
  }
  const statusIcon = {
    completed: '✓',
    active: '●',
    pending: '○',
    failed: '✕',
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Spine */}
      <div style={{
        position: 'absolute', top: 12, bottom: 12, left: 11,
        width: 2, background: 'var(--color-border)',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {events.map((event, i) => {
          const color = statusColor[event.status]
          return (
            <div key={event.id} style={{ display: 'flex', gap: 14, paddingBottom: i < events.length - 1 ? 16 : 0, position: 'relative' }}>
              {/* Node */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: event.status === 'pending' ? 'var(--color-surface)' : color,
                border: `2px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: event.status === 'pending' ? color : '#fff',
                fontWeight: 700, zIndex: 1,
              }}>
                {statusIcon[event.status]}
              </div>
              <div style={{ flex: 1, paddingTop: 2 }}>
                <div style={{
                  fontSize: 13, fontWeight: event.status === 'active' ? 600 : 400,
                  color: event.status === 'pending' ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                  marginBottom: 2,
                }}>
                  {event.label}
                </div>
                {event.timestamp && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {event.timestamp}
                  </div>
                )}
                {event.detail && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{event.detail}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Audit Entry ── */
export interface AuditEntryData {
  id: string
  actor: string
  action: string
  target: string
  reason?: string
  timestamp: string
  result: 'success' | 'failure' | 'pending'
  market?: string
}

export function AuditEntry({ entry }: { entry: AuditEntryData }) {
  const resultColor = entry.result === 'success' ? 'var(--color-success)' : entry.result === 'failure' ? 'var(--color-danger)' : 'var(--color-warning)'

  return (
    <div style={{
      display: 'grid', gap: '8px 16px',
      gridTemplateColumns: '1fr auto',
      padding: '12px 16px',
      borderBottom: '1px solid var(--color-operator-border, var(--color-border))',
      fontSize: 12,
    }}>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {entry.actor}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>{entry.action}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>on</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-brand)' }}>{entry.target}</span>
        </div>
        {entry.reason && (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 11, fontStyle: 'italic' }}>"{entry.reason}"</div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 4 }}>{entry.timestamp}</div>
        <span style={{
          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
          background: resultColor + '20', color: resultColor,
        }}>
          {entry.result.toUpperCase()}
        </span>
      </div>
    </div>
  )
}

/* ── Work Queue Row ── */
export interface WorkQueueItem {
  id: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  queue: string
  caseRef: string
  subject: string
  market: string
  age: string
  assignedTo?: string
  state: string
}

const PRIORITY_STYLES = {
  urgent: { color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', dot: 'var(--color-danger)' },
  high:   { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', dot: 'var(--color-warning)' },
  normal: { color: 'var(--color-info)', bg: 'var(--color-info-bg)', dot: 'var(--color-info)' },
  low:    { color: 'var(--color-text-muted)', bg: 'var(--color-surface-raised)', dot: 'var(--color-text-muted)' },
}

export function WorkQueueRow({ item, onClaim, onOpen }: {
  item: WorkQueueItem; onClaim?: (id: string) => void; onOpen?: (id: string) => void
}) {
  const ps = PRIORITY_STYLES[item.priority]
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 100px 120px 1fr 80px 80px 120px 80px 80px',
      padding: '10px 16px',
      borderBottom: '1px solid var(--color-operator-border, var(--color-border))',
      alignItems: 'center', gap: 8,
      cursor: 'pointer', transition: 'background 0.1s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-raised)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Priority */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: ps.dot, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 600, color: ps.color, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{item.priority}</span>
      </div>
      {/* Queue */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.queue}</div>
      {/* Case ref */}
      <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)', fontWeight: 600 }}>{item.caseRef}</div>
      {/* Subject */}
      <div style={{ fontSize: 13, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subject}</div>
      {/* Market */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.market}</div>
      {/* Age */}
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{item.age}</div>
      {/* Assigned */}
      <div style={{ fontSize: 12, color: item.assignedTo ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
        {item.assignedTo ?? '—'}
      </div>
      {/* State */}
      <StatusBadge status={item.state} size="sm" />
      {/* Actions */}
      <div style={{ display: 'flex', gap: 4 }}>
        {!item.assignedTo && onClaim && (
          <button
            onClick={e => { e.stopPropagation(); onClaim(item.id) }}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
          >
            Claim
          </button>
        )}
        {onOpen && (
          <button
            onClick={e => { e.stopPropagation(); onOpen(item.id) }}
            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
          >
            Open
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Approval Block ── */
export function ApprovalBlock({
  title, description, proposedBy, proposedAt, status,
  onApprove, onReturn,
}: {
  title: string; description: string; proposedBy: string; proposedAt: string
  status: 'pending' | 'approved' | 'returned'
  onApprove?: () => void; onReturn?: () => void
}) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Proposed by {proposedBy} · {proposedAt}</div>
        </div>
        <StatusBadge status={status} size="md" />
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>{description}</p>
        {status === 'pending' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onReturn && (
              <button onClick={onReturn} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Return for revision
              </button>
            )}
            {onApprove && (
              <button onClick={onApprove} style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-success)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Approve
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Evidence Block ── */
export function EvidenceBlock({ items }: {
  items: { type: string; description: string; source: string; timestamp: string; verified?: boolean }[]
}) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-raised)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Evidence ({items.length})
        </span>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none', alignItems: 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            {item.type === 'qr' ? '📷' : item.type === 'location' ? '📍' : item.type === 'chat' ? '💬' : '📎'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{item.description}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.source} · {item.timestamp}</div>
          </div>
          {item.verified !== undefined && (
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: item.verified ? 'var(--color-success)' : 'var(--color-text-muted)', flexShrink: 0 }}>
              {item.verified ? '✓ Verified' : 'Unverified'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
