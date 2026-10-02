import { type ReactNode } from 'react'
import { StatusBadge, TrustBadge, AvailabilityBadge, type TrustLevel } from './Badge'

/* ═══════════════════════════════════════════════
   COMMERCE CARDS — All Adulis card types
═══════════════════════════════════════════════ */

/* ── Card shell ── */
function CardShell({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xs)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.1s',
        ...style,
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (onClick) { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-xs)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' } }}
    >
      {children}
    </div>
  )
}

/* ── Image placeholder ── */
function ImgPlaceholder({ src, alt, aspectRatio = '4/3', color = 'var(--color-surface-raised)' }: {
  src?: string; alt: string; aspectRatio?: string; color?: string
}) {
  return (
    <div style={{ aspectRatio, background: color, overflow: 'hidden', position: 'relative' }}>
      {src ? (
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-border-strong)', fontSize: 28 }}>
          📷
        </div>
      )}
    </div>
  )
}

/* ── Star rating ── */
function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 1 }}>
        {[1,2,3,4,5].map(i => (
          <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill={i <= rating ? '#C2622D' : 'var(--color-border)'}>
            <path d="M6 1l1.4 3 3.1.4-2.3 2.2.6 3.2L6 8.3l-2.8 1.5.6-3.2L1.5 4.4 4.6 4 6 1Z"/>
          </svg>
        ))}
      </div>
      {count !== undefined && (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>({count})</span>
      )}
    </div>
  )
}

/* ── Price display ── */
function Price({ amount, currency = 'ETB', size = 'md' }: { amount: number | string; currency?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 13, md: 17, lg: 22 }
  return (
    <span style={{ fontFamily: 'var(--font-display)', fontSize: sizes[size], fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
      {currency} {typeof amount === 'number' ? amount.toLocaleString() : amount}
    </span>
  )
}

/* ═══ PRODUCT POST CARD ═══ */
export interface ProductCardData {
  id: string
  name: string
  price: number
  currency?: string
  image?: string
  imageColor?: string
  seller: string
  sellerTrust: TrustLevel
  available: boolean
  lowStock?: boolean
  rating?: number
  reviewCount?: number
  variants?: string[]
}

export function ProductCard({ product, onOpen, onSave, compact = false }: {
  product: ProductCardData
  onOpen?: () => void
  onSave?: () => void
  compact?: boolean
}) {
  return (
    <CardShell onClick={onOpen} style={{ maxWidth: compact ? 160 : 220 }}>
      <ImgPlaceholder src={product.image} alt={product.name} aspectRatio={compact ? '1/1' : '4/5'} color={product.imageColor ?? 'var(--color-surface-raised)'} />
      <div style={{ padding: compact ? '8px 10px' : '12px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
          <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3, flex: 1 }}>
            {product.name}
          </div>
          {onSave && (
            <button onClick={e => { e.stopPropagation(); onSave?.() }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-muted)', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h10a1 1 0 0 1 1 1v11l-6-3-6 3V3a1 1 0 0 1 1-1Z"/></svg>
            </button>
          )}
        </div>
        <div style={{ marginBottom: 4 }}>
          <Price amount={product.price} currency={product.currency ?? 'ETB'} size={compact ? 'sm' : 'md'} />
        </div>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <AvailabilityBadge available={product.available} lowStock={product.lowStock} />
            {product.rating && <StarRating rating={product.rating} count={product.reviewCount} />}
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* ═══ SHOPPABLE POST CARD ═══ */
export interface ShoppablePostCardData {
  id: string
  image?: string
  imageColor?: string
  caption: string
  seller: string
  sellerAvatar?: string
  taggedProductCount: number
  saves?: number
  status: 'published' | 'draft' | 'restricted' | 'fyp-ineligible'
}

export function ShoppablePostCard({ post, onOpen }: { post: ShoppablePostCardData; onOpen?: () => void }) {
  return (
    <CardShell onClick={onOpen} style={{ maxWidth: 260 }}>
      <div style={{ position: 'relative' }}>
        <ImgPlaceholder src={post.image} alt={post.caption} aspectRatio="3/4" color={post.imageColor ?? '#E8E0D8'} />
        {/* Product hotspot indicator */}
        {post.taggedProductCount > 0 && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10,
            background: 'rgba(26,21,18,0.7)', backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-full)', padding: '3px 8px',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="white"><circle cx="5" cy="5" r="3"/><circle cx="5" cy="5" r="5" fill="none" stroke="white" strokeWidth="1.5"/></svg>
            <span style={{ color: 'white', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{post.taggedProductCount} product{post.taggedProductCount !== 1 ? 's' : ''}</span>
          </div>
        )}
        <StatusBadge status={post.status} size="sm" />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🏷️</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{post.seller}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.caption}
        </p>
        {post.status === 'fyp-ineligible' && (
          <div style={{ fontSize: 10, color: 'var(--color-warning)', fontFamily: 'var(--font-mono)', background: 'var(--color-warning-bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
            Not eligible for For You
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* ═══ SELLER CARD ═══ */
export interface SellerCardData {
  id: string
  name: string
  category: string
  trust: TrustLevel
  location: string
  rating?: number
  productCount?: number
  image?: string
  imageColor?: string
  bio?: string
}

export function SellerCard({ seller, onOpen }: { seller: SellerCardData; onOpen?: () => void }) {
  return (
    <CardShell onClick={onOpen} style={{ maxWidth: 280 }}>
      <div style={{ height: 72, background: seller.imageColor ?? 'var(--color-brand-muted)' }} />
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: -28, marginBottom: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: seller.imageColor ?? 'var(--color-brand)', border: '3px solid var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
            🏷️
          </div>
          <div style={{ paddingBottom: 4 }}>
            <TrustBadge level={seller.trust} />
          </div>
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 2, fontFamily: 'var(--font-display)' }}>{seller.name}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>{seller.category} · {seller.location}</div>
        {seller.bio && <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.4 }}>{seller.bio}</p>}
        <div style={{ display: 'flex', gap: 12 }}>
          {seller.productCount !== undefined && (
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}><strong style={{ color: 'var(--color-text-primary)' }}>{seller.productCount}</strong> products</div>
          )}
          {seller.rating && <StarRating rating={seller.rating} />}
        </div>
      </div>
    </CardShell>
  )
}

/* ═══ ORDER CARD ═══ */
export interface OrderCardData {
  ref: string
  status: string
  sellerName: string
  itemCount: number
  total: number
  currency?: string
  fulfilment: string
  timestamp: string
}

export function OrderCard({ order, onOpen }: { order: OrderCardData; onOpen?: () => void }) {
  return (
    <CardShell onClick={onOpen}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{order.ref}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{order.sellerName} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</div>
          </div>
          <StatusBadge status={order.status} size="sm" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Price amount={order.total} currency={order.currency ?? 'ETB'} size="md" />
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{order.timestamp}</div>
        </div>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5"><circle cx="6" cy="6" r="5"/><path d="M6 3.5v3L8 8"/></svg>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{order.fulfilment}</span>
        </div>
      </div>
    </CardShell>
  )
}

/* ═══ COURIER CARD ═══ */
export interface CourierCardData {
  name: string
  status: 'available' | 'busy' | 'unavailable'
  deliveries: number
  relationship?: string
  compensation?: number
  currency?: string
}

export function CourierCard({ courier, onSelect, selected = false }: {
  courier: CourierCardData; onSelect?: () => void; selected?: boolean
}) {
  return (
    <CardShell
      onClick={onSelect}
      style={{ border: selected ? '2px solid var(--color-brand)' : '1px solid var(--color-border)', background: selected ? 'var(--color-brand-muted)' : 'var(--color-surface)' }}
    >
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚴</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{courier.name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{courier.deliveries} deliveries</div>
            </div>
          </div>
          <StatusBadge status={courier.status} size="sm" showDot />
        </div>
        {courier.compensation !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Compensation</span>
            <Price amount={courier.compensation} currency={courier.currency ?? 'ETB'} size="sm" />
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* ═══ REVIEW CARD ═══ */
export interface ReviewCardData {
  reviewer: string
  sellerServiceRating: number
  productQualityRating: number
  text?: string
  productName?: string
  date: string
  verified: boolean
}

export function ReviewCard({ review }: { review: ReviewCardData }) {
  return (
    <CardShell>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)' }}>{review.reviewer}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{review.date}</div>
          </div>
          {review.verified && (
            <span style={{ fontSize: 10, color: 'var(--color-success)', fontFamily: 'var(--font-mono)', background: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
              ✓ Verified
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Seller Service</div>
            <StarRating rating={review.sellerServiceRating} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginBottom: 3, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Product Quality</div>
            <StarRating rating={review.productQualityRating} />
          </div>
        </div>
        {review.productName && (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Re: {review.productName}</div>
        )}
        {review.text && (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{review.text}</p>
        )}
      </div>
    </CardShell>
  )
}

/* ═══ TRUST CARD ═══ */
export function TrustCard({ level, sellerName, summary }: {
  level: TrustLevel; sellerName: string; summary: string
}) {
  const configs: Record<TrustLevel, { emoji: string; detail: string }> = {
    new:         { emoji: '🌱', detail: 'Recently admitted. Building track record.' },
    rebuilding:  { emoji: '🔄', detail: 'Recovering from negative signals.' },
    established: { emoji: '🛡️', detail: 'Consistent positive performance.' },
    trusted:     { emoji: '✅', detail: 'Highest tier. Expanded permissions.' },
  }
  const cfg = configs[level]

  return (
    <CardShell>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 28 }}>{cfg.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)' }}>{sellerName}</div>
            <TrustBadge level={level} />
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>{cfg.detail}</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, fontStyle: 'italic' }}>{summary}</p>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Trust is read-only. Cannot be purchased or manually set.
        </div>
      </div>
    </CardShell>
  )
}

/* ═══ CLAIM CARD ═══ */
export interface ClaimCardData {
  id: string
  orderRef: string
  issue: string
  status: string
  sellerName: string
  buyerName: string
  date: string
  urgent?: boolean
}

export function ClaimCard({ claim, onOpen }: { claim: ClaimCardData; onOpen?: () => void }) {
  return (
    <CardShell onClick={onOpen} style={{ borderLeft: claim.urgent ? '3px solid var(--color-danger)' : undefined }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{claim.orderRef}</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', marginTop: 2 }}>{claim.issue}</div>
          </div>
          <StatusBadge status={claim.status} size="sm" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          {claim.buyerName} → {claim.sellerName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{claim.date}</div>
        {claim.urgent && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-danger-bg)', fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>
            ⚠ Requires urgent attention
          </div>
        )}
      </div>
    </CardShell>
  )
}

/* ═══ NOTIFICATION CARD ═══ */
export interface NotificationData {
  type: 'order' | 'claim' | 'delivery' | 'message' | 'stock' | 'trust' | 'system'
  title: string
  body: string
  time: string
  unread?: boolean
  action?: string
}

const NOTIF_ICONS: Record<NotificationData['type'], string> = {
  order: '📦', claim: '⚠️', delivery: '🚴', message: '💬', stock: '📉', trust: '🛡️', system: '🔔'
}
const NOTIF_COLORS: Record<NotificationData['type'], string> = {
  order: '#2D7A4F', claim: '#C2372D', delivery: '#5B3FAF', message: '#2D5CC2', stock: '#B87C20', trust: '#5B3FAF', system: '#9C8E85'
}

export function NotificationCard({ notif, onDismiss }: { notif: NotificationData; onDismiss?: () => void }) {
  return (
    <div
      style={{
        display: 'flex', gap: 12, padding: '14px 16px',
        background: notif.unread ? 'var(--color-brand-muted)' : 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-lg)', flexShrink: 0,
        background: NOTIF_COLORS[notif.type] + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {NOTIF_ICONS[notif.type]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text-primary)', marginBottom: 2 }}>{notif.title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{notif.body}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>{notif.time}</div>
        {notif.action && (
          <button style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-brand)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            {notif.action} →
          </button>
        )}
      </div>
      {notif.unread && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand)', flexShrink: 0, marginTop: 4 }} />
      )}
    </div>
  )
}

/* ── Export helpers ── */
export { StarRating, Price, ImgPlaceholder }
