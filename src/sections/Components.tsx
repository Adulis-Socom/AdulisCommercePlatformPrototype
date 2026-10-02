import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { StatusBadge, TrustBadge, AvailabilityBadge } from '../components/ui/Badge'
import {
  TextInput, PhoneInput, SearchInput, Textarea,
  Select, QuantityInput, PriceInput, OTPInput,
  MultiSelect, LocationInput,
} from '../components/ui/Input'
import {
  ProductCard, ShoppablePostCard, SellerCard, OrderCard,
  CourierCard, ReviewCard, TrustCard, ClaimCard,
  NotificationCard, StarRating, Price,
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
} from '../components/ui/Operational'

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
      {/* Left nav */}
      <aside style={{
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
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: 'var(--color-background)' }}>
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
          <Button variant="primary" size="lg">Pay ETB 2,642.25</Button>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <ShowSection title="Text Input">
          <TextInput label="Business name" placeholder="e.g. Addis Atelier" />
          <div style={{ marginTop: 16 }}>
            <TextInput label="Filled" value="Addis Atelier" onChange={() => {}} />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="With error" value="bad" error="Business name must be at least 3 characters" />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="Disabled" value="Addis Atelier" state="disabled" />
          </div>
          <div style={{ marginTop: 16 }}>
            <TextInput label="Read-only" value="ADU-24091" state="readonly" />
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
          {['paid','preparing','pickup-verified','in-delivery','completed','cancelled'].map((status, i) => (
            <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < 5 ? '1px solid var(--color-border)' : 'none' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>ADU-2409{i + 1}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 10 }}>Maya Tesfaye · 2 items</span>
              </div>
              <StatusBadge status={status} size="md" showDot />
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

  const product = {
    id: '1', name: 'Linen Overshirt', price: 2450, imageColor: '#D4C5B0',
    seller: 'Addis Atelier', sellerTrust: 'established' as const,
    available: true, rating: 4, reviewCount: 23,
  }

  const post = {
    id: '1', caption: 'Autumn Layers — a curated look built around this season\'s essential linen pieces.', imageColor: '#C8B89A',
    seller: 'Addis Atelier', taggedProductCount: 3, status: 'published' as const,
  }

  const postNoProducts = {
    id: '2', caption: 'Behind the scenes at our new collection shoot. More soon.', imageColor: '#B8A898',
    seller: 'Addis Atelier', taggedProductCount: 0, status: 'fyp-ineligible' as const,
  }

  const seller = {
    id: '1', name: 'Addis Atelier', category: 'Fashion', trust: 'established' as const,
    location: 'Addis Ababa', imageColor: '#C2622D', productCount: 12, rating: 4,
    bio: 'Contemporary Ethiopian fashion. Clean lines, natural fibres.',
  }

  const order = { ref: 'ADU-24091', status: 'preparing', sellerName: 'Addis Atelier', itemCount: 2, total: 4550, fulfilment: 'Courier Delivery', timestamp: 'Today 10:23 AM' }

  const couriers = [
    { name: 'Daniel K.', status: 'available' as const, deliveries: 142, compensation: 180 },
    { name: 'Biruk T.', status: 'busy' as const, deliveries: 89, compensation: 160 },
    { name: 'Hana M.', status: 'unavailable' as const, deliveries: 57, compensation: 150 },
  ]

  const review = { reviewer: 'Maya T.', sellerServiceRating: 5, productQualityRating: 4, text: 'Fast delivery, exactly as described. Will order again.', productName: 'Linen Overshirt', date: 'Sep 28, 2024', verified: true }

  const claim = { id: '1', orderRef: 'ADU-24091', issue: 'Item not received', status: 'under-review', sellerName: 'Addis Atelier', buyerName: 'Maya Tesfaye', date: 'Sep 30, 2024', urgent: true }

  const notifs = [
    { type: 'order' as const, title: 'New paid order', body: 'ADU-24093 · Nura Glow — 1 item · ETB 1,350', time: '2 min ago', unread: true, action: 'View order' },
    { type: 'delivery' as const, title: 'Pickup verified', body: 'Daniel K. collected order ADU-24091 from you.', time: '1h ago' },
    { type: 'claim' as const, title: 'Claim opened', body: 'Maya Tesfaye opened a claim on order ADU-24091.', time: '3h ago', unread: true, action: 'View claim' },
  ]

  return (
    <div>
      <ShowHeader title="Commerce Cards" />

      <ShowSection title="Product Card">
        <Row gap={16}>
          <ProductCard product={product} onSave={() => {}} />
          <ProductCard product={{ ...product, name: 'Wide-Leg Trousers', price: 2100, available: true, lowStock: true, imageColor: '#A8958A' }} onSave={() => {}} />
          <ProductCard product={{ ...product, name: 'Structured Shoulder Bag', price: 3150, available: false, imageColor: '#8A7A6A' }} />
          <ProductCard product={product} compact />
        </Row>
      </ShowSection>

      <ShowSection title="Shoppable Post Card">
        <Row gap={16}>
          <ShoppablePostCard post={post} />
          <ShoppablePostCard post={postNoProducts} />
          <ShoppablePostCard post={{ ...post, id: '3', status: 'restricted', taggedProductCount: 2, imageColor: '#C0B0A0', caption: 'Restricted content.' }} />
        </Row>
      </ShowSection>

      <ShowSection title="Seller Card">
        <Row gap={16}>
          <SellerCard seller={seller} />
          <SellerCard seller={{ ...seller, id: '2', name: 'Nura Glow', category: 'Cosmetics', trust: 'trusted', imageColor: '#E8A090', bio: 'Skin-first Ethiopian beauty.' }} />
          <SellerCard seller={{ ...seller, id: '3', name: 'Volt House', category: 'Electronics', trust: 'new', imageColor: '#6090C0', bio: 'Tech essentials.' }} />
        </Row>
      </ShowSection>

      <ShowSection title="Order Card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          <OrderCard order={order} />
          <OrderCard order={{ ...order, ref: 'ADU-24092', status: 'in-delivery', total: 980, sellerName: 'Nura Glow', itemCount: 1, fulfilment: 'Courier Delivery' }} />
          <OrderCard order={{ ...order, ref: 'ADU-24093', status: 'completed', total: 3800, sellerName: 'Volt House', itemCount: 1 }} />
        </div>
      </ShowSection>

      <ShowSection title="Courier Card">
        <Row gap={12}>
          {couriers.map(c => (
            <CourierCard key={c.name} courier={c} selected={selectedCourier === c.name} onSelect={() => setSelectedCourier(c.name)} />
          ))}
        </Row>
      </ShowSection>

      <ShowSection title="Review Card">
        <Row gap={12}>
          <ReviewCard review={review} />
          <ReviewCard review={{ ...review, reviewer: 'Ayana K.', sellerServiceRating: 3, productQualityRating: 4, text: 'Good product, delivery took longer than expected.', verified: false }} />
        </Row>
      </ShowSection>

      <ShowSection title="Trust Card">
        <Row gap={12}>
          <TrustCard level="trusted" sellerName="Addis Atelier" summary="180 completed orders · 4.8 seller rating · 0 unresolved claims" />
          <TrustCard level="new" sellerName="Volt House" summary="New seller. Building first track record." />
        </Row>
      </ShowSection>

      <ShowSection title="Claim Card">
        <Row gap={12}>
          <ClaimCard claim={claim} />
          <ClaimCard claim={{ ...claim, id: '2', issue: 'Wrong item received', status: 'open', urgent: false, orderRef: 'ADU-24092' }} />
        </Row>
      </ShowSection>

      <ShowSection title="Notification Cards">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', maxWidth: 400 }}>
          {notifs.map((n, i) => <NotificationCard key={i} notif={n} />)}
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
        <StorefrontTabs
          tabs={[
            { key: 'shop', label: 'Shop', count: 12 },
            { key: 'posts', label: 'Posts', count: 7 },
            { key: 'reviews', label: 'Reviews', count: 34 },
            { key: 'about', label: 'About' },
          ]}
          active={storeTab}
          onChange={setStoreTab}
        />
      </ShowSection>

      <ShowSection title="Tabs (segmented)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tabs size="sm" tabs={[{ key: 'top', label: 'Top' }, { key: 'products', label: 'Products' }, { key: 'posts', label: 'Posts' }, { key: 'sellers', label: 'Sellers' }]} active={tabActive} onChange={setTabActive} />
          <Tabs size="md" tabs={[{ key: 'top', label: 'Top' }, { key: 'products', label: 'Products' }, { key: 'posts', label: 'Posts' }, { key: 'sellers', label: 'Sellers' }]} active={tabActive} onChange={setTabActive} />
        </div>
      </ShowSection>

      <ShowSection title="Breadcrumbs">
        <Breadcrumbs items={[{ label: 'Seller Console', path: '/' }, { label: 'Products', path: '/products' }, { label: 'Linen Overshirt' }]} />
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
          <Toast message="Order ADU-24091 marked as ready." variant="success" />
          <Toast message="Payment failed. Please try again." variant="error" onDismiss={() => {}} />
          <Toast message="Daniel K. has been assigned to this order." variant="info" />
          <Toast message="Low stock: Linen Overshirt has 2 remaining." variant="warning" />
        </Row>
      </ShowSection>

      <ShowSection title="Banners">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Banner variant="info">Seller Console may be slower than usual. We're investigating.</Banner>
          <Banner variant="warning" onDismiss={() => {}}>Your store profile is incomplete. <strong>Complete your profile</strong> to enable all features.</Banner>
          <Banner variant="error">Claim ADU-C-0024 requires your response within 24 hours.</Banner>
          <Banner variant="success">Pickup verified. Daniel K. has collected order ADU-24091.</Banner>
        </div>
      </ShowSection>

      <ShowSection title="Modal">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal
          open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Courier"
          footer={<><Button variant="tertiary" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary">Confirm Assignment</Button></>}
        >
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>Assigning Daniel K. to order ADU-24091. He will receive a delivery offer notification.</p>
          <div style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Daniel K.</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Compensation: ETB 180 · 142 completed deliveries</div>
          </div>
        </Modal>
      </ShowSection>

      <ShowSection title="Bottom Sheet">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>Open Bottom Sheet</Button>
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Products in this post" snapPoint="half">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Linen Overshirt — ETB 2,450', 'Wide-Leg Trousers — ETB 2,100', 'Structured Shoulder Bag — ETB 3,150'].map((p, i) => (
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
          title="Delete Linen Overshirt?"
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
            context="Pickup — ADU-24091"
            expiresIn={90}
          />
          <QRDisplay
            title="Delivery QR"
            subtitle="Show this to the buyer or delegated recipient to complete delivery."
            context="Delivery — ADU-24091"
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
          {handoffState === 'qr' && <QRDisplay title="Delivery QR" subtitle="Show to buyer to confirm delivery." context="Delivery — ADU-24091" expiresIn={90} />}
          {handoffState === 'verifying' && <VerifyingState message="Verifying delivery…" />}
          {handoffState === 'success' && <VerificationSuccess title="Delivery Confirmed" subtitle="Order ADU-24091 has been delivered to Maya Tesfaye." detail="Verified 10:34 AM · 30 Sep 2024" onContinue={() => setHandoffState('qr')} />}
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
  const tableRows = [
    { id: '1', ref: 'ADU-24091', buyer: 'Maya T.', status: 'preparing', total: 'ETB 4,550', fulfilment: 'Courier', time: '10:23 AM' },
    { id: '2', ref: 'ADU-24092', buyer: 'Ayana K.', status: 'paid', total: 'ETB 980', fulfilment: 'Collection', time: '09:14 AM' },
    { id: '3', ref: 'ADU-24093', buyer: 'Biruk L.', status: 'completed', total: 'ETB 3,800', fulfilment: 'Courier', time: 'Yesterday' },
  ]

  const columns = [
    { key: 'ref', header: 'Order', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--color-brand)' }}>{r.ref}</span> },
    { key: 'buyer', header: 'Buyer', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontSize: 13 }}>{r.buyer}</span> },
    { key: 'status', header: 'Status', width: '140px', render: (r: typeof tableRows[0]) => <StatusBadge status={r.status} size="sm" /> },
    { key: 'total', header: 'Total', width: '120px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{r.total}</span> },
    { key: 'fulfilment', header: 'Fulfilment', render: (r: typeof tableRows[0]) => <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.fulfilment}</span> },
    { key: 'time', header: 'Time', width: '100px', render: (r: typeof tableRows[0]) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{r.time}</span> },
  ]

  const metrics = [
    { label: 'Paid Orders (today)', value: '24', change: 12, trend: 'up' as const, icon: '📦', color: 'var(--color-success)' },
    { label: 'GMV (7 days)', value: 'ETB 142K', change: 8, trend: 'up' as const, icon: '💰' },
    { label: 'Avg. Fulfilment Time', value: '3.2h', change: 5, trend: 'down' as const, icon: '⏱️' },
    { label: 'Open Claims', value: '3', changeLabel: '1 urgent', trend: 'neutral' as const, icon: '⚠️', color: 'var(--color-warning)' },
  ]

  const timeline = [
    { id: '1', label: 'Paid', timestamp: '10:14 AM', status: 'completed' as const },
    { id: '2', label: 'Preparing', timestamp: '10:23 AM', status: 'completed' as const, detail: 'Addis Atelier confirmed preparation' },
    { id: '3', label: 'Ready for Courier', timestamp: '11:05 AM', status: 'active' as const },
    { id: '4', label: 'Courier Assigned', status: 'pending' as const },
    { id: '5', label: 'Pickup Verified', status: 'pending' as const },
    { id: '6', label: 'Out for Delivery', status: 'pending' as const },
    { id: '7', label: 'Delivery Verified', status: 'pending' as const },
    { id: '8', label: 'Completed', status: 'pending' as const },
  ]

  const auditEntries = [
    { id: '1', actor: 'admin@adulis.com', action: 'Restricted Shoppable Post', target: 'POST-8847', reason: 'Prohibited product category', timestamp: '30 Sep 2024, 10:14 AM', result: 'success' as const, market: 'ETH' },
    { id: '2', actor: 'ops@adulis.com', action: 'Approved Manual Verification', target: 'ADU-24088', reason: 'QR scan failed, evidence confirmed', timestamp: '30 Sep 2024, 09:52 AM', result: 'success' as const, market: 'ETH' },
  ]

  const workItems = [
    { id: '1', priority: 'urgent' as const, queue: 'Claims', caseRef: 'CLM-0044', subject: 'ADU-24091 — Item not received', market: 'ETH', age: '14h', state: 'open' },
    { id: '2', priority: 'high' as const, queue: 'Moderation', caseRef: 'MOD-0192', subject: 'Shoppable Post reported — POST-8847', market: 'ETH', age: '2h', assignedTo: 'ops@adulis', state: 'under-review' },
    { id: '3', priority: 'normal' as const, queue: 'Verification', caseRef: 'VER-0088', subject: 'Account recovery — Volt House', market: 'ETH', age: '1h', state: 'pending' },
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
        <DataTable columns={columns} rows={tableRows} onRowClick={r => console.log('row', r)} />
      </ShowSection>

      <ShowSection title="Order Timeline">
        <div style={{ maxWidth: 420, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '20px 24px' }}>
          <OrderTimeline events={timeline} />
        </div>
      </ShowSection>

      <ShowSection title="Work Queue">
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-surface)' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', display: 'grid', gridTemplateColumns: '80px 100px 120px 1fr 80px 80px 120px 80px 80px', gap: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {['Priority','Queue','Case','Subject','Market','Age','Assigned','State',''].map((h,i) => <div key={i}>{h}</div>)}
          </div>
          {workItems.map(item => <WorkQueueRow key={item.id} item={item} onClaim={id => {}} onOpen={id => {}} />)}
        </div>
      </ShowSection>

      <ShowSection title="Approval Block">
        <div style={{ maxWidth: 560 }}>
          <ApprovalBlock
            title="Remove Seller — Volt House"
            description="Proposal to remove Volt House from the platform following 3 unresolved claims and repeated policy violations. Requires second founder approval."
            proposedBy="CEO" proposedAt="30 Sep 2024 · 09:48 AM"
            status="pending"
            onApprove={() => {}} onReturn={() => {}}
          />
        </div>
      </ShowSection>

      <ShowSection title="Evidence Block">
        <div style={{ maxWidth: 560 }}>
          <EvidenceBlock items={[
            { type: 'qr', description: 'Pickup QR scan', source: 'Courier App — Daniel K.', timestamp: '30 Sep, 11:05 AM', verified: true },
            { type: 'location', description: 'Pickup location checkpoint', source: 'Courier App', timestamp: '30 Sep, 11:06 AM', verified: true },
            { type: 'chat', description: 'Buyer chat — "package looks fine"', source: 'Adulis Chat', timestamp: '30 Sep, 12:14 PM', verified: undefined },
            { type: 'attachment', description: 'Buyer submitted photo', source: 'Claim evidence', timestamp: '30 Sep, 2:30 PM', verified: false },
          ]} />
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
