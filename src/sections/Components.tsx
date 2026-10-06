import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { StatusBadge, TrustBadge, AvailabilityBadge, type TrustLevel } from '../components/ui/Badge'
import {
  TextInput, PhoneInput, SearchInput, Textarea,
  Select, QuantityInput, PriceInput, OTPInput,
  MultiSelect, LocationInput,
} from '../components/ui/Input'
import {
  ProductCard, ShoppablePostCard, SellerCard, OrderCard,
  CourierCard, ReviewCard, TrustCard, ClaimCard,
  NotificationCard, StarRating, Price,
  type ProductCardData, type ShoppablePostCardData, type SellerCardData, type OrderCardData, type CourierCardData,
  type ReviewCardData, type ClaimCardData, type NotificationData,
} from '../components/ui/Card'
import {
  MobileBottomNav, Tabs, StorefrontTabs, Breadcrumbs,
  FilterChips, Pagination, WebsiteHeader,
} from '../components/ui/Navigation'
import {
  Modal, BottomSheet, Confirmation, Toast, Banner,
  EmptyState, ErrorState, PermissionDenied, Skeleton,
  Tooltip, ContextMenu,
} from '../components/ui/Overlay'
import {
  QRDisplay, QRScannerFrame, VerifyingState,
  VerificationSuccess, VerificationFailed,
} from '../components/ui/Handoff'
import {
  DataTable, MetricCard, OrderTimeline, AuditEntry,
  WorkQueueRow, ApprovalBlock, EvidenceBlock,
  type AuditEntryData, type TimelineEvent, type WorkQueueItem,
} from '../components/ui/Operational'
import {
  AUDIT_LOG, BUYERS, CLAIMS, CLAIM_IDS, CONVERSATIONS, COURIERS, DECISIONS, DEFAULT_SNAPSHOT, HANDOFF_REVIEWS, INSIGHTS_7D, MARKET,
  MODERATION_CASES, OPERATORS, ORDERS, ORDER_TIMELINES, PRODUCTS, REVIEWS, SELLERS, SHOPPABLE_POSTS, SUPPORT_CASES, SURFACE_DEFAULTS,
  TRUST_APPEALS, VERIFICATION_CASES,
  buyerVisibleSellers, claimStateAt, claimSubmitted, courierCardAt, formatAge, formatClock, formatClock12, formatDate, formatDayMonth,
  formatEtb, happenedBefore, isForYouEligibleAt, isPubliclyEligibleAt, notificationTime, notificationsAt, ordersAt, orderStateAt,
  orderTotals, paidAt, productQualityAt, restrictionAt, reviewsAt, sellerCompletedOrdersAt, sellerPostsAt, sellerProductsAt,
  sellerServiceAt, shortName, stateTime, trustAt,
  type ClaimId, type ClaimState, type Moment, type NotificationRecord, type OrderId, type OrderState, type ProductId, type ReviewId,
  type SellerId, type ShoppablePostId, type Timestamp,
} from '../demo-data'

/* ─── Canonical samples ───
   The showcase illustrates its components with DEMO_DATA records read from the canonical module (WO-001): the surface
   defaults and the records related to them, as they are at the 10:25 snapshot. A component state that no record has at
   10:25 (a restricted post, a pending Founder decision) shows the canonical record that reaches it, at its documented
   time. Toasts, banners and handoff results report canonical events. */
const AT = DEFAULT_SNAPSHOT
const SELLER = SURFACE_DEFAULTS.seller
const ORDER = SURFACE_DEFAULTS.order
const COURIER = COURIERS[SURFACE_DEFAULTS.courier].name
/** The default Seller's card for the default Courier: completed for this Seller and the current terms. */
const COURIER_CARD = courierCardAt(SELLER, SURFACE_DEFAULTS.courier, AT)
/** The default Buyer's Orders, and the ones she pays for on the story day. */
const BUYER_ORDERS = ordersAt({ buyer: SURFACE_DEFAULTS.buyer }, AT)
const TODAYS_ORDERS = BUYER_ORDERS.filter(id => paidAt(id).slice(0, 10) === AT.at.slice(0, 10))
/** The default Shoppable Post's tagged Products, and the default Seller's low-stock Product. */
const POST_PRODUCTS = SHOPPABLE_POSTS[SURFACE_DEFAULTS.post].tags
const LOW_STOCK = sellerProductsAt(SELLER, AT).find(id => PRODUCTS[id].availability === 'Low Stock')!
const CLAIM_DEADLINE = CLAIMS[SURFACE_DEFAULTS.claim].responseDeadline!
const DELIVERED = stateTime(ORDER, 'Completed')!

const keysOf = <T extends string>(record: Readonly<Record<T, unknown>>) => Object.keys(record) as T[]

const CLAIM_BADGE: Record<ClaimState, string> = { 'Open': 'open', 'Under Review': 'under-review', 'Resolved': 'resolved' }

/** The existing badge variant for an Order state, labelled with the state's own name. */
function stateBadge(state: OrderState): { status: string; customLabel?: string } {
  const variant: Partial<Record<OrderState, string>> = { 'Paid': 'paid', 'Preparing': 'preparing', 'Courier Assigned': 'assigned', 'Pickup Verified': 'pickup-verified', 'Completed': 'completed' }
  if (variant[state]) return { status: variant[state]! }
  return { status: state.startsWith('Ready') ? 'ready' : 'in-delivery', customLabel: state }
}

/** The Trust badge variant for the Seller's Trust level. */
function trustBadge(seller: SellerId): TrustLevel {
  return trustAt(seller, AT)!.toLowerCase() as TrustLevel
}

function itemCount(order: OrderId) {
  return ORDERS[order].lines.reduce((sum, line) => sum + line.quantity, 0)
}

/* ═══════════════════════════════════════════════
   02 — COMPONENT SYSTEM SHOWCASE
═══════════════════════════════════════════════ */

const SECTIONS = [
  { key: 'buttons',      label: 'Buttons' },
  { key: 'inputs',       label: 'Inputs' },
  { key: 'badges',       label: 'Status Badges' },
  { key: 'cards',        label: 'Commerce Cards' },
  { key: 'navigation',   label: 'Navigation' },
  { key: 'overlays',     label: 'Overlays & Feedback' },
  { key: 'handoff',      label: 'Handoff' },
  { key: 'operational',  label: 'Operational' },
]

export default function Components() {
  const [active, setActive] = useState('buttons')

  return (
    <div className="components-showcase" style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
      {/* Left nav */}
      <aside className="components-nav" style={{
        width: 200, flexShrink: 0, overflowY: 'auto',
        borderRight: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '20px 0',
      }}>
        <div style={{ padding: '0 16px 16px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          02 — Components
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '9px 16px', border: 'none',
              background: active === s.key ? 'var(--color-brand-muted)' : 'none',
              color: active === s.key ? 'var(--color-brand-dark)' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-body)', fontSize: 13,
              fontWeight: active === s.key ? 600 : 400,
              cursor: 'pointer', borderLeft: active === s.key ? '2px solid var(--color-brand)' : '2px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {/* Content */}
      <main className="components-main" style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: 'var(--color-background)' }}>
        {active === 'buttons'     && <ButtonShowcase />}
        {active === 'inputs'      && <InputShowcase />}
        {active === 'badges'      && <BadgeShowcase />}
        {active === 'cards'       && <CardShowcase />}
        {active === 'navigation'  && <NavigationShowcase />}
        {active === 'overlays'    && <OverlayShowcase />}
        {active === 'handoff'     && <HandoffShowcase />}
        {active === 'operational' && <OperationalShowcase />}
      </main>
    </div>
  )
}

/* ─── Showcase section wrapper ─── */
function ShowSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: '0 0 20px', color: 'var(--color-text-primary)', paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ShowHeader({ title }: { title: string }) {
  return (
    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: '0 0 32px', color: 'var(--color-text-primary)' }}>{title}</h1>
  )
}

function Row({ children, gap = 12, wrap = true }: { children: React.ReactNode; gap?: number; wrap?: boolean }) {
  return <div style={{ display: 'flex', gap, alignItems: 'flex-start', flexWrap: wrap ? 'wrap' : 'nowrap' }}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, marginTop: 16 }}>{children}</div>
}

/* ═══════════════════════════════════════════════
   BUTTONS
═══════════════════════════════════════════════ */

function ButtonShowcase() {
  const [loading, setLoading] = useState(false)
  const Icon = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h10M8 3l5 5-5 5"/></svg>

  return (
    <div>
      <ShowHeader title="Buttons" />

      <ShowSection title="Primary">
        <Label>Sizes</Label>
        <Row><Button variant="primary" size="sm">Small</Button><Button variant="primary" size="md">Medium</Button><Button variant="primary" size="lg">Large</Button></Row>
        <Label>States</Label>
        <Row>
          <Button variant="primary">Default</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" icon={<Icon />}>With icon</Button>
          <Button variant="primary" icon={<Icon />} iconPosition="right">Icon right</Button>
        </Row>
      </ShowSection>

      <ShowSection title="Secondary">
        <Row>
          <Button variant="secondary">Default</Button>
          <Button variant="secondary" loading>Loading</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="secondary" icon={<Icon />}>With icon</Button>
        </Row>
      </ShowSection>

      <ShowSection title="Tertiary">
        <Row>
          <Button variant="tertiary">Default</Button>
          <Button variant="tertiary" loading>Loading</Button>
          <Button variant="tertiary" disabled>Disabled</Button>
        </Row>
      </ShowSection>

      <ShowSection title="Text">
        <Row>
          <Button variant="text">View all</Button>
          <Button variant="text" icon={<Icon />}>With icon</Button>
          <Button variant="text" disabled>Disabled</Button>
        </Row>
      </ShowSection>

      <ShowSection title="Destructive">
        <Row>
          <Button variant="destructive">Delete</Button>
          <Button variant="destructive" loading>Deleting…</Button>
          <Button variant="destructive" disabled>Disabled</Button>
        </Row>
      </ShowSection>

      <ShowSection title="Icon">
        <Row>
          <Button variant="icon" size="sm"><Icon /></Button>
          <Button variant="icon" size="md"><Icon /></Button>
          <Button variant="icon" size="lg"><Icon /></Button>
          <Button variant="icon" disabled><Icon /></Button>
        </Row>
      </ShowSection>

      <ShowSection title="Commerce contexts">
        <Label>Product page</Label>
        <Row>
          <Button variant="primary" size="lg">Add to Cart</Button>
          <Button variant="secondary" size="lg">Save</Button>
          <Button variant="icon" size="lg">💬</Button>
        </Row>
        <Label>Checkout</Label>
        <Row>
          <Button variant="primary" size="lg">Pay {formatEtb(orderTotals(ORDER).total)}</Button>
          <Button variant="tertiary">Back</Button>
        </Row>
        <Label>Order actions</Label>
        <Row>
          <Button variant="primary">Mark Ready</Button>
          <Button variant="secondary">Assign Courier</Button>
          <Button variant="text">View Timeline</Button>
        </Row>
        <Label>Operator actions</Label>
        <Row>
          <Button variant="destructive">Restrict Content</Button>
          <Button variant="secondary">Return for Revision</Button>
          <Button variant="primary">Approve</Button>
        </Row>
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   INPUTS
═══════════════════════════════════════════════ */

function InputShowcase() {
  const [qty, setQty] = useState(1)
  const [otp, setOtp] = useState<string[]>([])
  const [multiVal, setMultiVal] = useState<string[]>(['fashion'])
  const [searchVal, setSearchVal] = useState('Linen shirt')

  return (
    <div>
      <ShowHeader title="Input Components" />

      <div className="components-columns" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <ShowSection title="Text Input">
          <TextInput label="Business name" placeholder={`e.g. ${SELLERS[SELLER].name}`} />
          <div style={{ marginTop: 16 }}>
            <TextInput label="Filled" value={SELLERS[SELLER].name} onChange={() => {}} />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="With error" value="bad" error="Business name must be at least 3 characters" />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="Disabled" value={SELLERS[SELLER].name} state="disabled" />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="Read-only" value={ORDER} state="readonly" />
          </div>
        </ShowSection>

        <ShowSection title="Phone Input">
          <PhoneInput label="Phone number" />
          <div style={{ marginTop: 16 }}>
            <PhoneInput label="Filled" value="911234567" onChange={() => {}} />
          </div>
          <div style={{ marginTop: 16 }}>
            <PhoneInput label="Disabled" state="disabled" />
          </div>
        </ShowSection>

        <ShowSection title="Search">
          <SearchInput
            label="Search"
            placeholder="Search products, posts, sellers…"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onClear={() => setSearchVal('')}
          />
        </ShowSection>

        <ShowSection title="Textarea">
          <Textarea label="Product description" placeholder="Describe your product…" rows={3} />
          <div style={{ marginTop: 16 }}>
            <Textarea label="Claim description" placeholder="Describe the issue…" error="Please provide more detail" rows={3} />
          </div>
        </ShowSection>

        <ShowSection title="Select">
          <Select
            label="Category"
            placeholder="Select a category"
            options={[
              { value: 'fashion', label: 'Fashion' },
              { value: 'cosmetics', label: 'Cosmetics' },
              { value: 'electronics', label: 'Electronics' },
              { value: 'food', label: 'Food & Beverage' },
            ]}
          />
        </ShowSection>

        <ShowSection title="Quantity Stepper">
          <QuantityInput label="Quantity" value={qty} onChange={setQty} min={1} max={10} />
        </ShowSection>

        <ShowSection title="Price">
          <PriceInput label="Product price" />
          <div style={{ marginTop: 16 }}>
            <PriceInput label="Filled" value="2450" onChange={() => {}} />
          </div>
        </ShowSection>

        <ShowSection title="Multi-select Chips">
          <MultiSelect
            label="Fulfilment options"
            options={[
              { value: 'collection', label: 'Buyer Collection' },
              { value: 'seller-delivery', label: 'Seller Delivery' },
              { value: 'courier', label: 'Courier Delivery' },
            ]}
            value={multiVal}
            onChange={setMultiVal}
          />
        </ShowSection>

        <ShowSection title="OTP Entry">
          <OTPInput label="Verification code" length={6} value={otp} onChange={setOtp} />
          <div style={{ marginTop: 16 }}>
            <OTPInput label="Error state" length={6} value={['1','2','3','','','']} onChange={() => {}} error="Incorrect code. Please try again." />
          </div>
        </ShowSection>

        <ShowSection title="Location">
          <LocationInput label="Store location" />
        </ShowSection>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   STATUS BADGES
═══════════════════════════════════════════════ */

const ALL_STATUSES = [
  { group: 'Order Status', items: ['paid','processing','preparing','ready','assigned','pickup-verified','in-delivery','delivery-verified','completed','cancelled','refunded'] },
  { group: 'Payment', items: ['paid','processing','failed','reconciling'] },
  { group: 'Content', items: ['published','draft','restricted','unavailable','fyp-ineligible'] },
  { group: 'Trust Levels', items: ['new','rebuilding','established','trusted'] },
  { group: 'Claim', items: ['open','evidence-required','under-review','resolved'] },
  { group: 'Courier', items: ['available','busy','unavailable'] },
  { group: 'General', items: ['pending','active','suspended'] },
]

function BadgeShowcase() {
  return (
    <div>
      <ShowHeader title="Status Badges" />
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Sizes:</span>
          <StatusBadge status="paid" size="sm" />
          <StatusBadge status="paid" size="md" />
          <StatusBadge status="paid" size="lg" />
        </div>
      </div>

      {ALL_STATUSES.map(group => (
        <ShowSection key={group.group} title={group.group}>
          <Row gap={8}>
            {group.items.map(s => <StatusBadge key={s} status={s} size="md" />)}
          </Row>
        </ShowSection>
      ))}

      <ShowSection title="Availability">
        <Row>
          <AvailabilityBadge available={true} />
          <AvailabilityBadge available={true} lowStock />
          <AvailabilityBadge available={false} />
        </Row>
      </ShowSection>

      <ShowSection title="Trust Badges (full size)">
        <Row>
          {(['new','rebuilding','established','trusted'] as const).map(l => <TrustBadge key={l} level={l} />)}
        </Row>
      </ShowSection>

      <ShowSection title="In context — Order row">
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          {BUYER_ORDERS.map((id, i) => (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < BUYER_ORDERS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{id}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 10 }}>{BUYERS[ORDERS[id].buyer].name} · {itemCount(id)} item{itemCount(id) === 1 ? '' : 's'}</span>
              </div>
              <StatusBadge {...stateBadge(orderStateAt(id, AT)!)} size="md" showDot />
            </div>
          ))}
        </div>
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   CARDS
═══════════════════════════════════════════════ */

function CardShowcase() {
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null)

  const productCard = (id: ProductId, imageColor: string): ProductCardData => {
    const product = PRODUCTS[id], quality = productQualityAt(id, AT)
    return {
      id, name: product.name, price: product.price / 100, imageColor,
      seller: SELLERS[product.seller].name, sellerTrust: trustBadge(product.seller),
      available: product.availability !== 'Out of Stock', lowStock: product.availability === 'Low Stock',
      rating: quality?.average, reviewCount: quality?.ratings,
    }
  }
  const [lead, second, third] = POST_PRODUCTS

  // The default post; the default Seller's post without a tagged Product (not For You eligible); and the reported post,
  // just after its restriction.
  const postCard = (id: ShoppablePostId, imageColor: string, at: Moment = AT): ShoppablePostCardData => {
    const post = SHOPPABLE_POSTS[id]
    return {
      id, caption: post.caption, imageColor, seller: SELLERS[post.seller].name, taggedProductCount: post.tags.length,
      status: restrictionAt(id, at) ? 'restricted' : isForYouEligibleAt(id, at) ? 'published' : 'fyp-ineligible',
    }
  }
  const untaggedPost = sellerPostsAt(SELLER, AT).find(id => SHOPPABLE_POSTS[id].tags.length === 0)!
  const restriction = Object.values(MODERATION_CASES).find(m => m.action.kind === 'Restrict')!

  const sellerCard = (id: SellerId, imageColor: string): SellerCardData => {
    const seller = SELLERS[id]
    return {
      id, name: seller.name, category: seller.category, trust: trustBadge(id), location: MARKET.city, imageColor,
      productCount: sellerProductsAt(id, AT).length, rating: sellerServiceAt(id, AT)?.average, bio: seller.bio,
    }
  }
  const sellerColors = ['#C2622D', '#E8A090', '#6090C0']

  const orderCard = (id: OrderId): OrderCardData => ({
    ref: id, status: stateBadge(orderStateAt(id, AT)!).status, sellerName: SELLERS[ORDERS[id].seller].name,
    itemCount: itemCount(id), total: orderTotals(id).total / 100, fulfilment: ORDERS[id].fulfilment,
    timestamp: `Today ${formatClock12(paidAt(id))}`,
  })

  const courier: CourierCardData = {
    name: COURIER_CARD.name, status: COURIER_CARD.availability.toLowerCase() as CourierCardData['status'],
    deliveries: COURIER_CARD.completedForSeller,
    compensation: COURIER_CARD.compensation === undefined ? undefined : COURIER_CARD.compensation / 100,
  }

  // Every review belongs to a completed Seller Order (rule 11.1).
  const reviewCard = (id: ReviewId): ReviewCardData => {
    const review = REVIEWS[id], [quality] = review.productQuality, written = review.written
    return {
      reviewer: shortName(BUYERS[ORDERS[review.order].buyer].name), sellerServiceRating: review.sellerService,
      productQualityRating: quality.rating, text: review.text, productName: PRODUCTS[quality.product].name,
      date: formatDate(typeof written === 'string' ? written : written.at), verified: true,
    }
  }

  const claims = CLAIM_IDS.filter(id => claimStateAt(id, AT) !== null).sort((a, b) => claimSubmitted(b).localeCompare(claimSubmitted(a)))
  const claimCard = (id: ClaimId): ClaimCardData => {
    const claim = CLAIMS[id], order = ORDERS[claim.order]
    return {
      id, orderRef: claim.order, issue: claim.issue, status: CLAIM_BADGE[claimStateAt(id, AT)!],
      sellerName: SELLERS[order.seller].name, buyerName: BUYERS[order.buyer].name, date: formatDate(claimSubmitted(id)),
    }
  }
  const unresolved = claims.filter(id => ORDERS[CLAIMS[id].order].seller === SELLER && claimStateAt(id, AT) !== 'Resolved').length
  const newSeller = buyerVisibleSellers().find(id => trustAt(id, AT) === 'NEW')!
  const completedOrders = sellerCompletedOrdersAt(SELLER, AT)

  // The default Seller's notifications. DEMO_DATA records no read state.
  const notificationCard = (n: NotificationRecord): NotificationData => {
    const time = notificationTime(n)
    const age = time ? formatAge(time, AT.at) : '—'
    const e = n.event
    switch (e.kind) {
      case 'New Paid Order': {
        const items = itemCount(e.order)
        return { type: 'order', title: 'New paid order', body: `${e.order} · ${SELLERS[ORDERS[e.order].seller].name} — ${items} item${items === 1 ? '' : 's'} · ${formatEtb(orderTotals(e.order).total)}`, time: age, action: 'View order' }
      }
      case 'Claim': return { type: 'claim', title: 'Claim opened', body: `${BUYERS[ORDERS[CLAIMS[e.claim].order].buyer].name} opened a claim on order ${CLAIMS[e.claim].order}.`, time: age, action: 'View claim' }
      case 'Buyer message': {
        const conversation = CONVERSATIONS[e.conversation]
        return { type: 'message', title: 'Buyer message', body: `${shortName(BUYERS[conversation.buyer].name)} · ${conversation.messages[e.messageIndex].text}`, time: age, action: 'Reply' }
      }
      case 'Low stock': return { type: 'stock', title: 'Low-stock alert', body: `${PRODUCTS[e.product].name} · ${PRODUCTS[e.product].stock} remaining`, time: age, action: 'Review' }
      default: return { type: 'system', title: e.kind, body: '', time: age }
    }
  }

  return (
    <div>
      <ShowHeader title="Commerce Cards" />

      <ShowSection title="Product Card">
        <Row gap={16}>
          <ProductCard product={productCard(lead, '#D4C5B0')} onSave={() => {}} />
          <ProductCard product={productCard(second, '#A8958A')} onSave={() => {}} />
          <ProductCard product={productCard(third, '#8A7A6A')} />
          <ProductCard product={productCard(lead, '#D4C5B0')} compact />
        </Row>
      </ShowSection>

      <ShowSection title="Shoppable Post Card">
        <Row gap={16}>
          <ShoppablePostCard post={postCard(SURFACE_DEFAULTS.post, '#C8B89A')} />
          <ShoppablePostCard post={postCard(untaggedPost, '#B8A898')} />
          <ShoppablePostCard post={postCard(restriction.post, '#C0B0A0', { at: restriction.action.at, sequence: 1 })} />
        </Row>
      </ShowSection>

      <ShowSection title="Seller Card">
        <Row gap={16}>
          {buyerVisibleSellers().map((id, i) => <SellerCard key={id} seller={sellerCard(id, sellerColors[i])} />)}
        </Row>
      </ShowSection>

      <ShowSection title="Order Card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {TODAYS_ORDERS.map(id => <OrderCard key={id} order={orderCard(id)} />)}
        </div>
      </ShowSection>

      <ShowSection title="Courier Card">
        <Row gap={12}>
          <CourierCard courier={courier} selected={selectedCourier === courier.name} onSelect={() => setSelectedCourier(courier.name)} />
        </Row>
      </ShowSection>

      <ShowSection title="Review Card">
        <Row gap={12}>
          {reviewsAt({ seller: SELLER }, AT).map(id => <ReviewCard key={id} review={reviewCard(id)} />)}
        </Row>
      </ShowSection>

      <ShowSection title="Trust Card">
        <Row gap={12}>
          <TrustCard level={trustBadge(SELLER)} sellerName={SELLERS[SELLER].name} summary={`${completedOrders} completed order${completedOrders === 1 ? '' : 's'} · ${sellerServiceAt(SELLER, AT)?.average} seller rating · ${unresolved} unresolved claim${unresolved === 1 ? '' : 's'}`} />
          <TrustCard level={trustBadge(newSeller)} sellerName={SELLERS[newSeller].name} summary="New seller. Building first track record." />
        </Row>
      </ShowSection>

      <ShowSection title="Claim Card">
        <Row gap={12}>
          {claims.map(id => <ClaimCard key={id} claim={claimCard(id)} />)}
        </Row>
      </ShowSection>

      <ShowSection title="Notification Cards">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', maxWidth: 400 }}>
          {notificationsAt(SELLER, AT).map((n, i) => <NotificationCard key={i} notif={notificationCard(n)} />)}
        </div>
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */

function NavigationShowcase() {
  const [bottomActive, setBottomActive] = useState('home')
  const [tabActive, setTabActive] = useState('shop')
  const [storeTab, setStoreTab] = useState('shop')
  const [filterActive, setFilterActive] = useState<string[]>(['fashion'])
  const [page, setPage] = useState(1)

  const bottomItems = [
    { key: 'home',   label: 'For You', icon: '✨' },
    { key: 'shop',   label: 'Shop',    icon: '🛍️', badge: 0 },
    { key: 'saved',  label: 'Saved',   icon: '🔖' },
    { key: 'orders', label: 'Orders',  icon: '📦', badge: 3 },
    { key: 'you',    label: 'You',     icon: '👤' },
  ]

  return (
    <div>
      <ShowHeader title="Navigation" />

      <ShowSection title="Mobile Bottom Navigation">
        <div style={{ maxWidth: 390, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: 20, background: 'var(--color-surface-raised)', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
            Active: <strong>{bottomActive}</strong>
          </div>
          <MobileBottomNav items={bottomItems} active={bottomActive} onChange={setBottomActive} />
        </div>
      </ShowSection>

      <ShowSection title="Website Header">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <WebsiteHeader currentPath="/for-sellers" />
        </div>
      </ShowSection>

      <ShowSection title="Storefront Tabs">
        <div className="components-scroll">
          <StorefrontTabs
            tabs={[
              { key: 'shop', label: 'Shop', count: sellerProductsAt(SELLER, AT).length },
              { key: 'posts', label: 'Posts', count: sellerPostsAt(SELLER, AT).filter(id => isPubliclyEligibleAt(id, AT)).length },
              { key: 'reviews', label: 'Reviews', count: sellerServiceAt(SELLER, AT)?.ratings },
              { key: 'about', label: 'About' },
            ]}
            active={storeTab}
            onChange={setStoreTab}
          />
        </div>
      </ShowSection>

      <ShowSection title="Tabs (segmented)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tabs size="sm" tabs={[{ key: 'top', label: 'Top' }, { key: 'products', label: 'Products' }, { key: 'posts', label: 'Posts' }, { key: 'sellers', label: 'Sellers' }]} active={tabActive} onChange={setTabActive} />
          <Tabs size="md" tabs={[{ key: 'top', label: 'Top' }, { key: 'products', label: 'Products' }, { key: 'posts', label: 'Posts' }, { key: 'sellers', label: 'Sellers' }]} active={tabActive} onChange={setTabActive} />
        </div>
      </ShowSection>

      <ShowSection title="Breadcrumbs">
        <Breadcrumbs items={[{ label: 'Seller Console', path: '/' }, { label: 'Products', path: '/products' }, { label: PRODUCTS[SURFACE_DEFAULTS.product].name }]} />
      </ShowSection>

      <ShowSection title="Filter Chips">
        <FilterChips
          filters={[{ key: 'fashion', label: 'Fashion' }, { key: 'cosmetics', label: 'Cosmetics' }, { key: 'electronics', label: 'Electronics' }, { key: 'trusted', label: 'Trusted sellers' }, { key: 'in-stock', label: 'In stock' }]}
          active={filterActive}
          onChange={setFilterActive}
        />
      </ShowSection>

      <ShowSection title="Pagination">
        <Pagination page={page} total={98} pageSize={20} onChange={setPage} />
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   OVERLAYS
═══════════════════════════════════════════════ */

function OverlayShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div>
      <ShowHeader title="Overlays & Feedback" />

      <ShowSection title="Toasts">
        <Row gap={12} wrap>
          <Toast message={`Order ${ORDER} marked as ready.`} variant="success" />
          <Toast message="Payment failed. Please try again." variant="error" onDismiss={() => {}} />
          <Toast message={`${COURIER} has been assigned to this order.`} variant="info" />
          <Toast message={`Low stock: ${PRODUCTS[LOW_STOCK].name} has ${PRODUCTS[LOW_STOCK].stock} remaining.`} variant="warning" />
        </Row>
      </ShowSection>

      <ShowSection title="Banners">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Banner variant="info">Seller Console may be slower than usual. We're investigating.</Banner>
          <Banner variant="warning" onDismiss={() => {}}>Your store profile is incomplete. <strong>Complete your profile</strong> to enable all features.</Banner>
          <Banner variant="error">Claim {SURFACE_DEFAULTS.claim} requires your response by {formatDayMonth(CLAIM_DEADLINE)} {formatClock(CLAIM_DEADLINE)}.</Banner>
          <Banner variant="success">Pickup verified. {COURIER} has collected order {ORDER}.</Banner>
        </div>
      </ShowSection>

      <ShowSection title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Courier"
          footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary">Confirm Assignment</Button></>}
        >
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Assigning {COURIER} to order {ORDER}. He will receive a delivery offer notification.</p>
          <div style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{COURIER}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Compensation: {COURIER_CARD.compensation === undefined ? '—' : formatEtb(COURIER_CARD.compensation)} · {COURIER_CARD.completedForSeller} completed {COURIER_CARD.completedForSeller === 1 ? 'delivery' : 'deliveries'}</div>
          </div>
        </Modal>
      </ShowSection>

      <ShowSection title="Bottom Sheet">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Bottom Sheet</Button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Products in this post" snapPoint="half">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {POST_PRODUCTS.map(id => `${PRODUCTS[id].name} — ${formatEtb(PRODUCTS[id].price)}`).map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-raised)' }} />
                <div style={{ flex: 1, fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 500 }}>{p}</div>
                <Button variant="primary" size="sm">Add</Button>
              </div>
            ))}
          </div>
        </BottomSheet>
      </ShowSection>

      <ShowSection title="Confirmation">
        <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Delete product</Button>
        <Confirmation
          open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => {}}
          title={`Delete ${PRODUCTS[SURFACE_DEFAULTS.product].name}?`}
          message="This product will be removed from your catalogue. Any published Shoppable Posts that reference it will become tag-less for this product. This action cannot be undone."
          confirmLabel="Delete product" variant="destructive"
        />
      </ShowSection>

      <ShowSection title="Context Menu">
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Button variant="tertiary" onClick={() => setMenuOpen(!menuOpen)}>Open Menu ▾</Button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4 }}>
              <ContextMenu
                onClose={() => setMenuOpen(false)}
                items={[
                  { label: 'Edit product', icon: '✏️', onClick: () => {} },
                  { label: 'Duplicate', icon: '📋', onClick: () => {} },
                  { label: 'View on storefront', icon: '🔗', onClick: () => {} },
                  { label: 'Archive', icon: '📁', onClick: () => {}, destructive: false },
                  { label: 'Delete product', icon: '🗑️', onClick: () => {}, destructive: true },
                ]}
              />
            </div>
          )}
        </div>
      </ShowSection>

      <ShowSection title="Empty, Error & Permission States">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}>
            <EmptyState icon="📦" title="No orders yet" description="When buyers place orders, they'll appear here." action={<Button variant="secondary" size="sm">Share your store</Button>} />
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}>
            <ErrorState description="We couldn't load this page. Check your connection and try again." onRetry={() => {}} />
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)' }}>
            <PermissionDenied reason="You need admin permissions to view this section. Contact your store owner." />
          </div>
        </div>
      </ShowSection>

      <ShowSection title="Skeleton Loading">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
          <Skeleton height={20} width={200} />
          <Skeleton height={14} count={3} />
          <Skeleton height={44} radius="var(--radius-md)" />
        </div>
      </ShowSection>

      <ShowSection title="Tooltip">
        <Row>
          <Tooltip content="Product rating from verified buyers"><Button variant="tertiary">Hover me</Button></Tooltip>
          <Tooltip content="Trust level is read-only and cannot be edited"><StatusBadge status="established" /></Tooltip>
        </Row>
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   HANDOFF
═══════════════════════════════════════════════ */

function HandoffShowcase() {
  const [handoffState, setHandoffState] = useState<'qr'|'verifying'|'success'|'failed'>('qr')

  return (
    <div>
      <ShowHeader title="Handoff Components" />

      <ShowSection title="QR Display — Seller (Pickup) / Courier (Delivery)">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <QRDisplay
            title="Pickup QR"
            subtitle="Show this to the courier when they arrive to collect the order."
            context={`Pickup — ${ORDER}`}
            expiresIn={90}
          />
          <QRDisplay
            title="Delivery QR"
            subtitle="Show this to the buyer or delegated recipient to complete delivery."
            context={`Delivery — ${ORDER}`}
            expiresIn={120}
          />
        </div>
      </ShowSection>

      <ShowSection title="QR Scanner — Courier (Pickup) / Buyer (Delivery)">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)', overflow: 'hidden', width: 320 }}>
            <QRScannerFrame label="Scan Seller Pickup QR" hint="Ask the seller to show their pickup code, then scan it to verify collection." scanning />
          </div>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)', overflow: 'hidden', width: 320 }}>
            <QRScannerFrame label="Scan Delivery QR" hint="Ask the courier to show their delivery code, then scan it to confirm receipt." scanning />
          </div>
        </div>
      </ShowSection>

      <ShowSection title="Verification States (interactive)">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['qr','verifying','success','failed'] as const).map(s => (
            <Button key={s} size="sm" variant={handoffState === s ? 'primary' : 'tertiary'} onClick={() => setHandoffState(s)}>
              {s}
            </Button>
          ))}
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', background: 'var(--color-surface)', maxWidth: 380, overflow: 'hidden' }}>
          {handoffState === 'qr' && <QRDisplay title="Delivery QR" subtitle="Show to buyer to confirm delivery." context={`Delivery — ${ORDER}`} expiresIn={90} />}
          {handoffState === 'verifying' && <VerifyingState message="Verifying delivery…" />}
          {handoffState === 'success' && <VerificationSuccess title="Delivery Confirmed" subtitle={`Order ${ORDER} has been delivered to ${BUYERS[ORDERS[ORDER].buyer].name}.`} detail={`Verified ${formatClock12(DELIVERED)} · ${formatDate(DELIVERED)}`} onContinue={() => setHandoffState('qr')} />}
          {handoffState === 'failed' && <VerificationFailed message="The QR code could not be verified. Please try again or use the verification code." onRetry={() => setHandoffState('verifying')} onFallback={() => {}} />}
        </div>
      </ShowSection>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   OPERATIONAL
═══════════════════════════════════════════════ */

function OperationalShowcase() {
  // The default Buyer's Orders of the story day.
  const tableRows = TODAYS_ORDERS.map(id => ({
    id, ref: id, buyer: shortName(BUYERS[ORDERS[id].buyer].name), state: orderStateAt(id, AT)!,
    total: formatEtb(orderTotals(id).total), fulfilment: ORDERS[id].fulfilment, time: formatClock12(paidAt(id)),
  }))

  const columns = [
    { key: 'ref', header: 'Order', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-brand)' }}>{r.ref}</span> },
    { key: 'buyer', header: 'Buyer', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontSize: 13 }}>{r.buyer}</span> },
    { key: 'status', header: 'Status', width: '140px', render: (r: typeof tableRows[0]) => <StatusBadge {...stateBadge(r.state)} size="sm" /> },
    { key: 'total', header: 'Total', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{r.total}</span> },
    { key: 'fulfilment', header: 'Fulfilment', render: (r: typeof tableRows[0]) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.fulfilment}</span> },
    { key: 'time', header: 'Time', width: '100px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{r.time}</span> },
  ]

  // The default Seller's figures. DEMO_DATA gives no fulfilment-time average and no period-on-period changes.
  const today = AT.at.slice(0, 10)
  const openClaims = CLAIM_IDS.filter(id => ORDERS[CLAIMS[id].order].seller === SELLER && ['Open', 'Under Review'].includes(claimStateAt(id, AT) ?? '')).length
  const gmv = INSIGHTS_7D[SELLER]?.gmv
  const metrics = [
    { label: 'Paid Orders (today)', value: String(ordersAt({ seller: SELLER }, AT).filter(id => paidAt(id).slice(0, 10) === today).length), changeLabel: '—', trend: 'neutral' as const, icon: '📦', color: 'var(--color-success)' },
    { label: 'GMV (7 days)', value: gmv === undefined ? '—' : formatEtb(gmv), changeLabel: '—', trend: 'neutral' as const, icon: '💰' },
    { label: 'Avg. Fulfilment Time', value: '—', changeLabel: '—', trend: 'neutral' as const, icon: '⏱️' },
    { label: 'Open Claims', value: String(openClaims), changeLabel: '—', trend: 'neutral' as const, icon: '⚠️', color: 'var(--color-warning)' },
  ]

  // The default Order's timeline.
  const states = ORDER_TIMELINES[ORDERS[ORDER].fulfilment]
  const current = states.indexOf(orderStateAt(ORDER, AT)!)
  const timeline: TimelineEvent[] = states.map((state, index) => {
    const time = stateTime(ORDER, state)
    return {
      id: state, label: state, timestamp: time && index <= current ? formatClock12(time) : undefined,
      status: index < current || (index === current && state === 'Completed') ? 'completed' : index === current ? 'active' : 'pending',
    }
  })

  // The audit log, newest first.
  const auditEntries: AuditEntryData[] = AUDIT_LOG.filter(entry => happenedBefore(entry.at, AT)).reverse().map((entry, i) => ({
    id: String(i + 1), actor: entry.actor, action: entry.action, target: entry.target, reason: entry.reason,
    timestamp: `${formatDate(entry.at)}, ${formatClock12(entry.at)}`, result: entry.result === 'Succeeded' ? 'success' : 'failure', market: MARKET.id,
  }))

  // The Operator queue, in DEMO_DATA's order. DEMO_DATA gives the cases no priority, and none is assigned at 10:25.
  const open = (opened: Timestamp, closed?: Timestamp) => happenedBefore(opened, AT) && !(closed && happenedBefore(closed, AT))
  const item = (queue: string, caseRef: string, subject: string, opened: Timestamp, state: string): WorkQueueItem =>
    ({ id: caseRef, queue, caseRef, subject, market: MARKET.id, age: formatAge(opened, AT.at), state })
  const workItems: WorkQueueItem[] = [
    ...CLAIM_IDS.filter(id => claimStateAt(id, AT) && claimStateAt(id, AT) !== 'Resolved').map(id => item('Claims', id, `${CLAIMS[id].issue} · ${CLAIMS[id].order}`, claimSubmitted(id), CLAIM_BADGE[claimStateAt(id, AT)!])),
    ...keysOf(MODERATION_CASES).filter(id => open(MODERATION_CASES[id].reported, MODERATION_CASES[id].action.at)).map(id => item('Moderation', id, `Reported Shoppable Post · ${MODERATION_CASES[id].post}`, MODERATION_CASES[id].reported, 'open')),
    ...keysOf(SUPPORT_CASES).filter(id => open(SUPPORT_CASES[id].raised, SUPPORT_CASES[id].resolved.at)).map(id => item('Support', id, `Seller support request · ${SUPPORT_CASES[id].order}`, SUPPORT_CASES[id].raised, 'open')),
    ...keysOf(VERIFICATION_CASES).filter(id => open(VERIFICATION_CASES[id].submitted)).map(id => item('Verification', id, `${VERIFICATION_CASES[id].kind} · ${shortName(BUYERS[VERIFICATION_CASES[id].buyer].name)}`, VERIFICATION_CASES[id].submitted, 'open')),
    ...keysOf(TRUST_APPEALS).filter(id => open(TRUST_APPEALS[id].submitted)).map(id => item('Trust Appeals', id, `Seller Trust appeal · ${SELLERS[TRUST_APPEALS[id].seller].handle}`, TRUST_APPEALS[id].submitted, 'open')),
    ...keysOf(HANDOFF_REVIEWS).filter(id => open(HANDOFF_REVIEWS[id].escalated.at)).map(id => item('Manual Handoff', id, `Failed final handoff · ${HANDOFF_REVIEWS[id].order}`, HANDOFF_REVIEWS[id].escalated.at, 'open')),
  ]

  // The Founder decision as proposed: no decision is pending at 10:25.
  const [decisionId] = keysOf(DECISIONS)
  const decision = DECISIONS[decisionId]

  // The default Claim's evidence: its Order's handoff records and the Buyer's photos.
  const claim = CLAIMS[SURFACE_DEFAULTS.claim], claimOrder = ORDERS[claim.order]
  const pickedUp = stateTime(claim.order, 'Pickup Verified'), delivered = stateTime(claim.order, 'Completed')
  const when = (time: Timestamp) => `${formatDayMonth(time)}, ${formatClock12(time)}`
  const evidence = [
    ...(claimOrder.pickup?.method === 'QR' && pickedUp ? [{ type: 'qr', description: 'Pickup QR scan', source: `Courier App — ${claimOrder.courier ? COURIERS[claimOrder.courier].name : '—'}`, timestamp: when(pickedUp), verified: true }] : []),
    ...(claimOrder.pickup?.location === 'recorded' && pickedUp ? [{ type: 'location', description: 'Pickup location checkpoint', source: 'Courier App', timestamp: when(pickedUp), verified: true }] : []),
    ...(claimOrder.finalHandoff?.method === 'QR' && delivered ? [{ type: 'qr', description: 'Delivery QR scan', source: `Buyer App — ${shortName(BUYERS[claimOrder.buyer].name)}`, timestamp: when(delivered), verified: true }] : []),
    ...(claimOrder.finalHandoff?.location && delivered ? [{ type: 'location', description: claimOrder.finalHandoff.location === 'recorded' ? 'Delivery location checkpoint' : 'Delivery location unavailable', source: 'Courier App', timestamp: when(delivered), verified: claimOrder.finalHandoff.location === 'recorded' ? true : undefined }] : []),
    ...Array.from({ length: claim.evidencePhotos }, () => ({ type: 'attachment', description: 'Buyer submitted photo', source: 'Claim evidence', timestamp: when(claimSubmitted(SURFACE_DEFAULTS.claim)) })),
  ]

  return (
    <div>
      <ShowHeader title="Operational Components" />

      <ShowSection title="Metric Cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {metrics.map((m, i) => <MetricCard key={i} metric={m} />)}
        </div>
      </ShowSection>

      <ShowSection title="Data Table">
        <div className="components-data-table">
          <DataTable columns={columns} rows={tableRows} onRowClick={r => console.log('row', r)} />
        </div>
      </ShowSection>

      <ShowSection title="Order Timeline">
        <div style={{ maxWidth: 420, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '20px 24px' }}>
          <OrderTimeline events={timeline} />
        </div>
      </ShowSection>

      <ShowSection title="Work Queue">
        <div className="components-work-queue" style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-surface)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', display: 'grid', gridTemplateColumns: '80px 100px 120px 1fr 80px 80px 120px 80px 80px', gap: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {['Priority','Queue','Case','Subject','Market','Age','Assigned','State',''].map((h,i) => <div key={i}>{h}</div>)}
          </div>
          {workItems.map(item => <WorkQueueRow key={item.id} item={item} onClaim={id => {}} onOpen={id => {}} />)}
        </div>
      </ShowSection>

      <ShowSection title="Approval Block">
        <div style={{ maxWidth: 560 }}>
          <ApprovalBlock
            title={decisionId}
            description={decision.text}
            proposedBy={OPERATORS[decision.proposedBy].role} proposedAt={`${formatDate(decision.proposed)} · ${formatClock12(decision.proposed)}`}
            status="pending"
            onApprove={() => {}} onReturn={() => {}}
          />
        </div>
      </ShowSection>

      <ShowSection title="Evidence Block">
        <div style={{ maxWidth: 560 }}>
          <EvidenceBlock items={evidence} />
        </div>
      </ShowSection>

      <ShowSection title="Audit Log">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          {auditEntries.map(e => <AuditEntry key={e.id} entry={e} />)}
        </div>
      </ShowSection>
    </div>
  )
}
