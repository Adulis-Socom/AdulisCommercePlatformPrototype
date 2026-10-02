import { useState, type ReactNode } from 'react'
import { AdulisLogo } from '../App'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Overlay'
import { SearchInput, Textarea, TextInput } from '../components/ui/Input'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  ConsoleTopBar, SidebarItem, SidebarSeparator,
  IconGrid, IconOrders, IconPackage, IconImage, IconInbox,
  IconChart, IconStore, IconBot, IconSettings, IconShield, IconFlag, IconTruck,
} from './ShellHelpers'

type NavKey = 'home' | 'orders' | 'products' | 'content' | 'inbox' | 'claims' | 'reviews' | 'trust' | 'insights' | 'store' | 'couriers' | 'automation' | 'settings'
type HomeMode = 'pre-publication' | 'active'
type OrderBucket = 'needs-action' | 'preparing' | 'ready' | 'delivery' | 'completed' | 'cancelled'
type DemoState = 'data' | 'loading' | 'empty' | 'conflict' | 'stale'

interface NavItem {
  key: NavKey
  label: string
  icon: ReactNode
  badge?: number
}

const PRIMARY_NAV: NavItem[] = [
  { key: 'home', label: 'Home', icon: <IconGrid size={14} /> },
  { key: 'orders', label: 'Orders', icon: <IconOrders size={14} />, badge: 3 },
  { key: 'products', label: 'Products', icon: <IconPackage size={14} /> },
  { key: 'content', label: 'Content', icon: <IconImage size={14} /> },
  { key: 'inbox', label: 'Inbox', icon: <IconInbox size={14} />, badge: 4 },
  { key: 'claims', label: 'Claims', icon: <IconFlag size={14} />, badge: 1 },
]

const SECONDARY_NAV: NavItem[] = [
  { key: 'insights', label: 'Insights', icon: <IconChart size={14} /> },
  { key: 'reviews', label: 'Reviews', icon: <IconChart size={14} /> },
  { key: 'trust', label: 'Trust', icon: <IconShield size={14} /> },
  { key: 'store', label: 'Store', icon: <IconStore size={14} /> },
  { key: 'couriers', label: 'Couriers', icon: <IconTruck size={14} /> },
  { key: 'automation', label: 'Automation', icon: <IconBot size={14} /> },
  { key: 'settings', label: 'Settings', icon: <IconSettings size={14} /> },
]

const BUCKETS: { key: OrderBucket; label: string; count: number }[] = [
  { key: 'needs-action', label: 'Needs Action', count: 3 },
  { key: 'preparing', label: 'Preparing', count: 4 },
  { key: 'ready', label: 'Ready / Awaiting Courier', count: 2 },
  { key: 'delivery', label: 'In Delivery', count: 5 },
  { key: 'completed', label: 'Completed', count: 128 },
  { key: 'cancelled', label: 'Cancelled / Refunded', count: 6 },
]

const ORDERS = [
  { id: 'ADU-24091', buyer: 'Maya T.', product: 'Habesha Kemis — Classic White', total: 'ETB 2,994', age: '2m', status: 'paid', bucket: 'needs-action' },
  { id: 'ADU-24092', buyer: 'Tigist A.', product: 'Tibeb Scarf × 2', total: 'ETB 1,494', age: '18m', status: 'paid', bucket: 'needs-action' },
  { id: 'ADU-24089', buyer: 'Hana G.', product: 'Ethiopian Cotton Dress', total: 'ETB 2,094', age: '1h', status: 'paid', bucket: 'needs-action' },
  { id: 'ADU-24087', buyer: 'Betty A.', product: 'Netela Wrap', total: 'ETB 674', age: '3h', status: 'preparing', bucket: 'preparing' },
  { id: 'ADU-24084', buyer: 'Selam B.', product: 'Gabi Blanket', total: 'ETB 1,394', age: '5h', status: 'ready', bucket: 'ready' },
  { id: 'ADU-24080', buyer: 'Mekdes T.', product: 'Cotton Day Dress', total: 'ETB 2,094', age: '1d', status: 'in-delivery', bucket: 'delivery' },
  { id: 'ADU-24071', buyer: 'Rahel K.', product: 'Tibeb Scarf', total: 'ETB 844', age: '2d', status: 'completed', bucket: 'completed' },
  { id: 'ADU-24064', buyer: 'Saron H.', product: 'Netela Wrap', total: 'ETB 674', age: '4d', status: 'refunded', bucket: 'cancelled' },
]

export default function SellerConsole({ demoTarget }: { demoTarget?: string }) {
  const initialNav = (demoTarget && ['home', 'orders', 'products', 'content', 'inbox', 'claims', 'reviews', 'trust', 'insights', 'store', 'couriers', 'automation', 'settings'].includes(demoTarget) ? demoTarget : 'home') as NavKey
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)

  const navigate = (key: NavKey) => {
    setActiveNav(key)
    setSelectedOrder(null)
  }

  return (
    <div className="seller-console flex" style={{ height: '100%', background: 'var(--color-background)' }}>
      <aside className="seller-console-sidebar flex flex-shrink-0 flex-col border-r transition-all duration-300" style={{ width: sidebarOpen ? 220 : 52, background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border px-3">
          <AdulisLogo size={24} />
          {sidebarOpen && <div className="seller-console-sidebar-copy min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text-primary">Seller Console</p><p className="truncate text-xs text-text-muted">Addis Atelier</p></div>}
          <button onClick={() => setSidebarOpen(open => !open)} aria-label={sidebarOpen ? 'Collapse Seller Console navigation' : 'Expand Seller Console navigation'} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-text-muted"><CollapseIcon open={sidebarOpen} /></button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          {PRIMARY_NAV.map(item => <SidebarItem key={item.key} label={sidebarOpen ? item.label : ''} icon={item.icon} active={activeNav === item.key} onClick={() => navigate(item.key)} badge={item.badge} />)}
          <SidebarSeparator />
          {SECONDARY_NAV.map(item => <SidebarItem key={item.key} label={sidebarOpen ? item.label : ''} icon={item.icon} active={activeNav === item.key} onClick={() => navigate(item.key)} />)}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleTopBar sellerName="Addis Atelier" sellerSelector />
        <div className="flex-1 overflow-y-auto">
          {activeNav === 'home' && <HomePanel onOpenOrder={id => { setActiveNav('orders'); setSelectedOrder(id) }} onOpenOrders={() => navigate('orders')} />}
          {activeNav === 'orders' && (selectedOrder ? <OrderDetail orderId={selectedOrder} onBack={() => setSelectedOrder(null)} /> : <OrdersPanel onOpenOrder={setSelectedOrder} />)}
          {activeNav === 'products' && <ProductsPanel />}
          {activeNav === 'content' && <ContentPanel />}
          {activeNav === 'inbox' && <InboxPanel />}
          {activeNav === 'claims' && <ClaimsPanel />}
          {activeNav === 'insights' && <InsightsPanel />}
          {activeNav === 'reviews' && <ReviewsPanel />}
          {activeNav === 'trust' && <TrustPanel />}
          {activeNav === 'store' && <StorePanel onOpenCouriers={() => navigate('couriers')} />}
          {activeNav === 'couriers' && <CouriersPanel />}
          {activeNav === 'automation' && <AutomationPanel />}
          {activeNav === 'settings' && <SettingsPanel />}
        </div>
      </div>
    </div>
  )
}

function HomePanel({ onOpenOrder, onOpenOrders }: { onOpenOrder: (id: string) => void; onOpenOrders: () => void }) {
  const [mode, setMode] = useState<HomeMode>('active')
  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div><h1 className="font-display text-3xl font-semibold text-text-primary">{mode === 'active' ? 'Good morning, Addis Atelier' : 'Prepare your store for publication'}</h1><p className="mt-1 text-sm text-text-muted">{mode === 'active' ? 'Wednesday, 30 Sep 2026 · Here is what needs attention today.' : 'Complete the required foundations before your store is published.'}</p></div>
        <Segmented options={[['pre-publication', 'Pre-publication'], ['active', 'Active Seller']]} active={mode} onChange={value => setMode(value as HomeMode)} />
      </div>
      {mode === 'pre-publication' ? <PublicationReadiness /> : <DailyOperations onOpenOrder={onOpenOrder} onOpenOrders={onOpenOrders} />}
    </div>
  )
}

function PublicationReadiness() {
  const cards = [
    { title: 'Social-commerce eligibility', detail: 'Business category and market eligibility complete.', status: 'complete', action: 'Review eligibility' },
    { title: 'Social account verification', detail: '@addisatelier connected and verified.', status: 'complete', action: 'View connection' },
    { title: 'Store profile', detail: 'Add a location, bio and customer-facing contact.', status: 'action', action: 'Complete profile' },
    { title: 'Fulfilment', detail: 'Choose collection, seller delivery or approved courier delivery.', status: 'action', action: 'Set fulfilment' },
    { title: 'First Product', detail: 'Create one available Product Post with price and variants.', status: 'action', action: 'Create Product' },
    { title: 'Payment-provider readiness', detail: 'Provider connection is checking final readiness.', status: 'checking', action: 'View provider status' },
  ]
  return (
    <>
      <div className="mb-5 rounded-2xl border border-brand/20 bg-brand-muted p-5">
        <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Publication Readiness Hub</div><div className="mt-1 font-display text-2xl font-semibold">2 of 6 foundations complete</div></div><div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface font-mono text-sm font-bold text-brand">33%</div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full w-1/3 rounded-full bg-brand" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(card => <ReadinessCard key={card.title} {...card} />)}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-info/20 bg-info-bg p-4"><InfoIcon /><div><div className="text-sm font-semibold text-info">Launch requirement</div><div className="mt-1 text-xs leading-relaxed text-text-secondary">A Shoppable Post is not required to publish your Store. Your first Product, fulfilment setup, store profile and payment-provider readiness are required foundations.</div></div></div>
    </>
  )
}

function ReadinessCard({ title, detail, status, action }: { title: string; detail: string; status: string; action: string }) {
  const [opened, setOpened] = useState(false)
  return (
    <div className="flex min-h-52 flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${status === 'complete' ? 'bg-success-bg text-success' : status === 'checking' ? 'bg-warning-bg text-warning' : 'bg-surface-raised text-text-muted'}`}>{status === 'complete' ? <CheckIcon /> : status === 'checking' ? <ClockIcon /> : <DotIcon />}</span>{status === 'complete' && <StatusBadge status="completed" size="sm" customLabel="Complete" />}{status === 'checking' && <StatusBadge status="reconciling" size="sm" customLabel="Checking" />}</div>
      <div className="mt-4 text-sm font-semibold">{title}</div><p className="mt-1 flex-1 text-xs leading-relaxed text-text-muted">{detail}</p>
      <button onClick={() => setOpened(true)} className="mt-4 text-left text-xs font-semibold text-brand">{opened ? 'Opened in prototype' : action} →</button>
    </div>
  )
}

function DailyOperations({ onOpenOrder, onOpenOrders }: { onOpenOrder: (id: string) => void; onOpenOrders: () => void }) {
  const priorities = [
    { rank: 1, label: 'Paid Orders requiring preparation', count: 3, detail: 'Oldest waiting 1h', tone: 'brand', action: () => onOpenOrders() },
    { rank: 2, label: 'Claims', count: 1, detail: 'Response due today', tone: 'danger' },
    { rank: 3, label: 'Ready for Courier', count: 2, detail: 'Awaiting assignment', tone: 'info' },
    { rank: 4, label: 'Delivery exceptions', count: 1, detail: 'Recipient unreachable', tone: 'warning' },
    { rank: 5, label: 'Inventory risks', count: 2, detail: 'Below reorder threshold', tone: 'warning' },
    { rank: 6, label: 'Unanswered messages', count: 4, detail: 'Oldest waiting 3h', tone: 'brand' },
    { rank: 7, label: 'Content requiring action', count: 1, detail: 'Product unavailable', tone: 'warning' },
    { rank: 8, label: 'Moderation', count: 1, detail: 'Post review requested', tone: 'danger' },
  ]
  return (
    <div className="grid grid-cols-[1.45fr_1fr] gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between"><div><div className="font-display text-xl font-semibold">Daily Operations Brief</div><div className="text-xs text-text-muted">Ordered by operational priority</div></div><StatusBadge status="active" size="sm" customLabel="15 open" /></div>
        <div className="divide-y divide-border">
          {priorities.map(item => <PriorityRow key={item.rank} {...item} />)}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between"><div className="font-semibold">Next Paid Orders</div><button onClick={onOpenOrders} className="text-xs font-semibold text-brand">View all</button></div>
          {ORDERS.slice(0, 3).map(order => <button key={order.id} onClick={() => onOpenOrder(order.id)} className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-b-0"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted font-mono text-[9px] font-bold text-brand-dark">{order.id.slice(-3)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{order.product}</span><span className="text-[10px] text-text-muted">{order.buyer} · {order.age}</span></span><StatusBadge status="paid" size="sm" /></button>)}
        </div>
        <PerformanceCard />
      </div>
    </div>
  )
}

function PriorityRow({ rank, label, count, detail, tone, action }: { rank: number; label: string; count: number; detail: string; tone: string; action?: () => void }) {
  const colors: Record<string, string> = { brand: 'bg-brand', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }
  return <button onClick={action} className="flex w-full items-center gap-3 py-3 text-left"><span className="w-5 font-mono text-[10px] text-text-muted">{String(rank).padStart(2, '0')}</span><span className={`h-2 w-2 rounded-full ${colors[tone]}`} /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-text-muted">{detail}</span></span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-raised px-2 font-mono text-xs font-bold">{count}</span></button>
}

function PerformanceCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between"><div><div className="font-semibold">7-day performance</div><div className="text-xs text-text-muted">Paid Seller Orders only</div></div><span className="text-xs font-semibold text-success">On track</span></div>
      <div className="mt-5 grid grid-cols-3 gap-3"><Metric label="Paid Orders" value="31" /><Metric label="GMV" value="ETB 68k" /><Metric label="On-time prep" value="94%" /></div>
      <div className="mt-4 flex h-16 items-end gap-2">{[38, 52, 44, 64, 50, 72, 80].map((height, index) => <span key={index} className="flex-1 rounded-t bg-brand-muted" style={{ height: `${height}%` }}><span className="block h-1/3 rounded-t bg-brand" /></span>)}</div>
    </div>
  )
}

function OrdersPanel({ onOpenOrder }: { onOpenOrder: (id: string) => void }) {
  const [bucket, setBucket] = useState<OrderBucket>('needs-action')
  const [demo, setDemo] = useState<DemoState>('data')
  const rows = ORDERS.filter(order => order.bucket === bucket)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Seller Orders</h1><p className="mt-1 text-sm text-text-muted">Provider-verified Paid Orders and post-payment fulfilment.</p></div><Segmented options={[['data', 'Data'], ['loading', 'Loading'], ['empty', 'Empty'], ['conflict', 'Conflict'], ['stale', 'Stale']]} active={demo} onChange={value => setDemo(value as DemoState)} small /></div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-raised p-1">
        {BUCKETS.map(item => <button key={item.key} onClick={() => { setBucket(item.key); setDemo('data') }} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${bucket === item.key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{item.label}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] ${bucket === item.key ? 'bg-brand-muted text-brand-dark' : 'bg-border text-text-muted'}`}>{item.count}</span></button>)}
      </div>
      {demo === 'loading' && <OrdersLoading />}
      {demo === 'empty' && <OrdersEmpty bucket={BUCKETS.find(item => item.key === bucket)!.label} />}
      {(demo === 'conflict' || demo === 'stale') && <StateBanner type={demo} onRefresh={() => setDemo('data')} />}
      {demo !== 'loading' && demo !== 'empty' && <OrdersTable rows={rows.length ? rows : ORDERS.slice(0, 2)} onOpenOrder={onOpenOrder} />}
    </div>
  )
}

function OrdersTable({ rows, onOpenOrder }: { rows: typeof ORDERS; onOpenOrder: (id: string) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-[130px_1fr_160px_120px_110px_20px] gap-4 bg-surface-raised px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><span>Seller Order</span><span>Product / Buyer</span><span>Status</span><span>Total</span><span>Age</span><span /></div>
      {rows.map(order => <button key={order.id} onClick={() => onOpenOrder(order.id)} className="grid w-full grid-cols-[130px_1fr_160px_120px_110px_20px] items-center gap-4 border-t border-border px-5 py-4 text-left hover:bg-surface-raised"><span className="font-mono text-xs font-semibold">{order.id}</span><span><span className="block text-sm font-semibold">{order.product}</span><span className="text-xs text-text-muted">{order.buyer}</span></span><span><StatusBadge status={order.status} size="sm" /></span><span className="text-sm font-semibold">{order.total}</span><span className="text-xs text-text-muted">{order.age}</span><span>›</span></button>)}
    </div>
  )
}

function OrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [stage, setStage] = useState<'paid' | 'preparing' | 'ready' | 'assigned'>('paid')
  const [chatOpen, setChatOpen] = useState(false)
  const order = ORDERS.find(item => item.id === orderId) ?? ORDERS[0]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Orders</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{order.id}</h1><StatusBadge status={stage === 'paid' ? 'paid' : stage} /></div><p className="mt-1 text-sm text-text-muted">Seller Order · Created after provider-verified payment</p></div><div className="flex gap-2"><Button variant="tertiary" onClick={() => setChatOpen(!chatOpen)}>Chat with Buyer</Button>{stage === 'paid' && <Button onClick={() => setStage('preparing')}>Start Preparation</Button>}{stage === 'preparing' && <Button onClick={() => setStage('ready')}>Mark Ready</Button>}{stage === 'ready' && <Button onClick={() => setStage('assigned')}>Assign Approved Courier</Button>}</div></div>

      <div className="grid grid-cols-[1.45fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <DetailCard title="Order and Buyer">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4"><Field label="Seller Order reference" value={order.id} /><Field label="Buyer-safe identity" value={`${order.buyer} · Kazanchis, Addis Ababa`} /><Field label="Fulfilment" value="Courier Delivery · 1–3 business days" /><Field label="Total" value={order.total} /></div>
          </DetailCard>
          <DetailCard title="Provider-verified payment" trailing={<StatusBadge status="paid" customLabel="Paid · read-only" />}>
            <div className="grid grid-cols-3 gap-4"><Field label="Provider reference" value="PAY-8A41-0926" /><Field label="Confirmed" value="30 Sep 2026 · 09:42" /><Field label="Payment authority" value="Provider + Adulis backend" /></div>
            <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Payment truth is read-only. Seller actions cannot confirm, accept, reverse, or otherwise establish Paid status.</div>
          </DetailCard>
          <DetailCard title="Products">
            <div className="flex items-center gap-4"><div className="h-20 w-16 rounded-xl bg-brand-muted" /><div className="flex-1"><div className="font-semibold">{order.product}</div><div className="mt-1 text-xs text-text-muted">Size M · Gold border · Quantity 1</div><div className="mt-2 text-sm font-semibold">ETB 2,800</div></div></div>
            <div className="mt-4 border-t border-border pt-3"><PriceRow label="Products" value="ETB 2,800" /><PriceRow label="Courier Delivery" value="ETB 180" /><PriceRow label="Adulis surcharge — 0.5%" value="ETB 14" /><PriceRow label="Total" value="ETB 2,994" strong /></div>
          </DetailCard>
          <DetailCard title="Fulfilment evidence">
            <div className="grid grid-cols-2 gap-3">
              <Evidence title="Preparation" status={stage === 'paid' ? 'Not started' : stage === 'preparing' ? 'In progress' : 'Ready'} detail="Seller preparation checklist" />
              <Evidence title="Courier assignment" status={stage === 'assigned' ? 'Daniel K. assigned' : 'Awaiting assignment'} detail="Approved Seller Courier Pool" />
              <Evidence title="Pickup evidence" status="Not available" detail="Seller Pickup QR scan appears here" />
              <Evidence title="Delivery evidence" status="Not available" detail="Recipient Delivery QR scan appears here" />
              <Evidence title="Pickup checkpoint" status="Pending" detail="Location recorded or unavailable" />
              <Evidence title="Delivery checkpoint" status="Pending" detail="Location recorded or unavailable" />
            </div>
            <div className="mt-3 text-xs text-text-muted">Checkpoint evidence is limited to pickup and delivery. No continuous GPS or live map is available.</div>
          </DetailCard>
        </div>
        <div className="flex flex-col gap-5">
          <DetailCard title="Timeline"><OrderTimeline events={orderTimeline(stage)} /></DetailCard>
          <DetailCard title="Claim">
            <div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">No active claim</span><span className="text-xs text-text-muted">Claims linked to this Seller Order appear here.</span></span><StatusBadge status="resolved" size="sm" customLabel="None" /></div>
          </DetailCard>
          {chatOpen && <DetailCard title="Buyer chat"><div className="rounded-xl bg-surface-raised p-3 text-sm">Maya T.: Thank you. Please let me know when the courier is assigned.</div><div className="mt-3 rounded-xl bg-warning-bg p-3 text-xs text-text-secondary">Chat supports coordination but does not establish payment, pickup, delivery, or claim truth.</div></DetailCard>}
          <DetailCard title="State controls"><div className="text-xs text-text-muted">Prototype fulfilment state</div><div className="mt-3 flex flex-wrap gap-2">{(['paid', 'preparing', 'ready', 'assigned'] as const).map(value => <button key={value} onClick={() => setStage(value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${stage === value ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border text-text-muted'}`}>{value}</button>)}</div></DetailCard>
        </div>
      </div>
    </div>
  )
}

function orderTimeline(stage: 'paid' | 'preparing' | 'ready' | 'assigned'): TimelineEvent[] {
  const stages = ['paid', 'preparing', 'ready', 'assigned'] as const
  const current = stages.indexOf(stage)
  return [
    { id: 'paid', label: 'Provider-verified Paid', timestamp: '09:42', status: current > 0 ? 'completed' : 'active', detail: 'Read-only payment state' },
    { id: 'preparing', label: 'Preparation', status: current > 1 ? 'completed' : current === 1 ? 'active' : 'pending' },
    { id: 'ready', label: 'Ready for Courier', status: current > 2 ? 'completed' : current === 2 ? 'active' : 'pending' },
    { id: 'assigned', label: 'Courier Assignment', status: current === 3 ? 'active' : 'pending' },
    { id: 'pickup', label: 'Pickup Verified', status: 'pending' },
    { id: 'delivery', label: 'Delivery Verified', status: 'pending' },
    { id: 'completed', label: 'Completed', status: 'pending' },
  ]
}

type ProductScreen = 'list' | 'detail' | 'editor'
type ContentScreen = 'list' | 'detail' | 'editor'
type ContentBucket = 'drafts' | 'published' | 'restricted'

const PRODUCTS = [
  { id: 'PRD-001', name: 'Habesha Kemis — Classic White', category: 'Traditional Wear', price: 'ETB 2,800', stock: 'Made to order', variants: 6, status: 'published' },
  { id: 'PRD-002', name: 'Tibeb Scarf — Gold Weave', category: 'Accessories', price: 'ETB 650', stock: '18 available', variants: 4, status: 'published' },
  { id: 'PRD-003', name: 'Ethiopian Cotton Dress', category: 'Dresses', price: 'ETB 1,900', stock: '2 available', variants: 5, status: 'published' },
  { id: 'PRD-004', name: 'Netela Wrap', category: 'Accessories', price: 'ETB 480', stock: '24 available', variants: 2, status: 'draft' },
]

function ProductsPanel() {
  const [screen, setScreen] = useState<ProductScreen>('list')
  const [selectedId, setSelectedId] = useState('PRD-001')
  const openProduct = (id: string) => { setSelectedId(id); setScreen('detail') }
  if (screen === 'detail') return <ProductDetailPanel productId={selectedId} onBack={() => setScreen('list')} onEdit={() => setScreen('editor')} />
  if (screen === 'editor') return <ProductEditor productId={selectedId} onBack={() => setScreen(selectedId ? 'detail' : 'list')} />
  return <ProductsList onOpen={openProduct} onCreate={() => { setSelectedId(''); setScreen('editor') }} />
}

function ProductsList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const rows = PRODUCTS.filter(product => (status === 'all' || product.status === status) && product.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Products</h1><p className="mt-1 text-sm text-text-muted">Manage canonical Products and their single-Product commerce posts.</p></div><Button onClick={onCreate}>Create Product</Button></div>
      <div className="mb-5 flex items-center gap-3"><div className="w-80"><SearchInput value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} placeholder="Search Products" /></div><Segmented options={[['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']]} active={status} onChange={setStatus} small /></div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="grid grid-cols-[72px_1.5fr_1fr_120px_130px_100px_90px_20px] gap-4 bg-surface-raised px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><span>Media</span><span>Product</span><span>Category</span><span>Price</span><span>Inventory</span><span>Variants</span><span>Status</span><span /></div>
        {rows.map((product, index) => <button key={product.id} onClick={() => onOpen(product.id)} className="grid w-full grid-cols-[72px_1.5fr_1fr_120px_130px_100px_90px_20px] items-center gap-4 border-t border-border px-5 py-4 text-left hover:bg-surface-raised"><ProductThumb index={index} /><span><span className="block text-sm font-semibold">{product.name}</span><span className="font-mono text-[10px] text-text-muted">{product.id}</span></span><span className="text-xs text-text-secondary">{product.category}</span><span className="text-sm font-semibold">{product.price}</span><span className={product.stock.startsWith('2 ') ? 'text-xs font-semibold text-warning' : 'text-xs text-text-secondary'}>{product.stock}</span><span className="text-xs text-text-secondary">{product.variants}</span><StatusBadge status={product.status} size="sm" /><span>›</span></button>)}
      </div>
      <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Each Product Post represents exactly one Product. Product Posts are commerce detail surfaces and are never For You feed units.</div>
    </div>
  )
}

function ProductDetailPanel({ productId, onBack, onEdit }: { productId: string; onBack: () => void; onEdit: () => void }) {
  const product = PRODUCTS.find(item => item.id === productId) ?? PRODUCTS[0]
  return (
    <div className="mx-auto max-w-6xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Products</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{product.name}</h1><StatusBadge status={product.status} /></div><p className="mt-1 font-mono text-xs text-text-muted">{product.id} · Product Post</p></div><div className="flex gap-2"><Button variant="tertiary">Preview</Button><Button onClick={onEdit}>Edit Product</Button></div></div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <DetailCard title="Media"><div className="grid grid-cols-3 gap-3"><ProductMedia large /><ProductMedia /><ProductMedia muted /></div></DetailCard>
          <DetailCard title="Product information"><div className="grid grid-cols-2 gap-5"><Field label="Name" value={product.name} /><Field label="Category" value={product.category} /><Field label="Description" value="Premium Ethiopian cotton with hand-embroidered Tibeb borders, made to order in Addis Ababa." /><Field label="Fulfilment" value="Courier Delivery · Buyer Collection" /></div></DetailCard>
          <DetailCard title="Structured attributes"><div className="grid grid-cols-3 gap-4"><Field label="Material" value="100% Ethiopian cotton" /><Field label="Made in" value="Addis Ababa" /><Field label="Care" value="Hand wash cold" /><Field label="Lead time" value="5–7 business days" /></div></DetailCard>
        </div>
        <div className="flex flex-col gap-5">
          <DetailCard title="Price and inventory"><InfoGrid rows={[['Price', product.price], ['Inventory', product.stock], ['Inventory policy', 'Track by variant'], ['Availability', 'Available']]} /></DetailCard>
          <DetailCard title="Variants"><VariantTable /></DetailCard>
          <DetailCard title="Product demo embed"><InfoGrid rows={[['Configuration', 'Enabled'], ['Provider', 'YouTube'], ['Placement', 'Product Post gallery']]} /></DetailCard>
          <DetailCard title="Concept boundary"><p className="text-sm leading-relaxed text-text-secondary">This Product Post contains exactly one canonical Product and its commerce information. It is not a Shoppable Post and cannot be used as a top-level For You unit.</p></DetailCard>
        </div>
      </div>
    </div>
  )
}

function ProductEditor({ productId, onBack }: { productId: string; onBack: () => void }) {
  const existing = PRODUCTS.find(item => item.id === productId)
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [description, setDescription] = useState(existing ? 'Premium Ethiopian cotton with hand-embroidered Tibeb borders, made to order in Addis Ababa.' : '')
  const [price, setPrice] = useState(existing ? '2800' : '')
  const [inventory, setInventory] = useState(existing ? '18' : '')
  const [demoEmbed, setDemoEmbed] = useState(true)
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const [mediaCount, setMediaCount] = useState(existing ? 3 : 1)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back</button>
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">{existing ? 'Edit Product' : 'Create Product'}</h1><p className="mt-1 text-sm text-text-muted">One Product Editor creates one Product Post.</p></div><div className="flex gap-2"><Button variant="tertiary" onClick={() => setPreview(!preview)}>{preview ? 'Close Preview' : 'Preview'}</Button><Button disabled={!name || !price} onClick={() => setPublished(true)}>Publish Product</Button></div></div>
      {published && <SuccessBanner title="Product published" detail={`${name} now has one published Product Post.`} />}
      <div className={`grid gap-5 ${preview ? 'grid-cols-[1.3fr_.7fr]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-5">
          <EditorSection step="01" title="Media">
            <div className="grid grid-cols-5 gap-3">{Array.from({ length: mediaCount }).map((_, index) => <ProductMedia key={index} large={index === 0} />)}<button onClick={() => setMediaCount(count => Math.min(5, count + 1))} className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised text-sm font-semibold text-text-muted">+ Add media</button></div>
          </EditorSection>
          <EditorSection step="02" title="Core information"><div className="grid grid-cols-2 gap-4"><TextInput label="Product name" value={name} onChange={event => setName(event.target.value)} placeholder="Product name" /><TextInput label="Category" value={category} onChange={event => setCategory(event.target.value)} placeholder="Category" /><div className="col-span-2"><Textarea label="Description" value={description} onChange={event => setDescription(event.target.value)} rows={4} placeholder="Describe this Product" /></div></div></EditorSection>
          <EditorSection step="03" title="Structured attributes"><div className="grid grid-cols-3 gap-4"><TextInput label="Material" defaultValue="100% Ethiopian cotton" /><TextInput label="Made in" defaultValue="Addis Ababa" /><TextInput label="Care" defaultValue="Hand wash cold" /></div></EditorSection>
          <EditorSection step="04" title="Variants"><VariantEditor /></EditorSection>
          <EditorSection step="05" title="Price and inventory"><div className="grid grid-cols-3 gap-4"><TextInput label="Price (ETB)" value={price} onChange={event => setPrice(event.target.value)} placeholder="0" /><TextInput label="Available inventory" value={inventory} onChange={event => setInventory(event.target.value)} placeholder="0" /><TextInput label="Inventory policy" defaultValue="Track by variant" /></div></EditorSection>
          <EditorSection step="06" title="Fulfilment"><div className="flex gap-3"><CheckOption label="Buyer Collection" checked /><CheckOption label="Seller Delivery" /><CheckOption label="Courier Delivery" checked /></div></EditorSection>
          <EditorSection step="07" title="Product demo embed">
            <div className="flex items-start justify-between"><div><div className="text-sm font-semibold">Demo media</div><div className="text-xs text-text-muted">Optional embed shown in this Product Post gallery.</div></div><Toggle checked={demoEmbed} onChange={() => setDemoEmbed(!demoEmbed)} /></div>
            {demoEmbed && <div className="mt-4"><TextInput label="Demo URL" defaultValue="https://youtube.com/watch?v=product-demo" hint="Supported provider embeds are rendered in the Product Post." /></div>}
          </EditorSection>
        </div>
        {preview && <ProductPreview name={name || 'Untitled Product'} category={category || 'Category'} price={price ? `ETB ${price}` : 'Price not set'} description={description} />}
      </div>
    </div>
  )
}

function ContentPanel() {
  const [screen, setScreen] = useState<ContentScreen>('list')
  const [selectedPost, setSelectedPost] = useState('SHP-018')
  if (screen === 'detail') return <ShoppablePostDetail postId={selectedPost} onBack={() => setScreen('list')} onEdit={() => setScreen('editor')} />
  if (screen === 'editor') return <ShoppablePostEditor onBack={() => setScreen('list')} />
  return <ShoppablePostsList onOpen={id => { setSelectedPost(id); setScreen('detail') }} onCreate={() => setScreen('editor')} />
}

function ShoppablePostsList({ onOpen, onCreate }: { onOpen: (id: string) => void; onCreate: () => void }) {
  const [bucket, setBucket] = useState<ContentBucket>('published')
  const posts = {
    drafts: [{ id: 'SHP-020', caption: 'Studio details from this week...', products: 1, publication: 'draft', eligible: false }],
    published: [
      { id: 'SHP-018', caption: 'Spring styling in Addis Ababa — every piece made slowly.', products: 2, publication: 'published', eligible: true },
      { id: 'SHP-017', caption: 'The Netela Project: from loom to wearer.', products: 0, publication: 'published', eligible: false },
    ],
    restricted: [{ id: 'SHP-012', caption: 'Archive campaign image', products: 1, publication: 'restricted', eligible: false }],
  }[bucket]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Shoppable Posts</h1><p className="mt-1 text-sm text-text-muted">Image-led content with optional same-Seller Product tags and hotspots.</p></div><Button onClick={onCreate}>Create Shoppable Post</Button></div>
      <div className="mb-5 flex gap-2"><Pill active={bucket === 'drafts'} onClick={() => setBucket('drafts')}>Drafts · 1</Pill><Pill active={bucket === 'published'} onClick={() => setBucket('published')}>Published · 18</Pill><Pill active={bucket === 'restricted'} onClick={() => setBucket('restricted')}>Restricted / Removed · 1</Pill></div>
      <div className="grid grid-cols-3 gap-4">
        {posts.map((post, index) => <button key={post.id} onClick={() => onOpen(post.id)} className="overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm"><ContentMedia index={index} /><div className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-text-muted">{post.id}</span><StatusBadge status={post.publication} size="sm" /></div><p className="mt-3 line-clamp-2 text-sm font-semibold">{post.caption}</p><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="text-xs text-text-secondary">{post.products ? `${post.products} tagged Products` : 'No Product tags'}</span><EligibilityBadge eligible={post.eligible} /></div></div></button>)}
      </div>
      <div className="mt-5 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Publication and For You eligibility are separate states. A Shoppable Post can be Published with zero Products and remain ineligible for For You.</div>
    </div>
  )
}

function ShoppablePostDetail({ postId, onBack, onEdit }: { postId: string; onBack: () => void; onEdit: () => void }) {
  const zeroProduct = postId === 'SHP-017'
  const publication = postId === 'SHP-020' ? 'draft' : postId === 'SHP-012' ? 'restricted' : 'published'
  const eligible = postId === 'SHP-018'
  return (
    <div className="mx-auto max-w-6xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Shoppable Posts</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{postId}</h1><StatusBadge status={publication} /><EligibilityBadge eligible={eligible} /></div><p className="mt-1 text-sm text-text-muted">Shoppable Post · Addis Atelier</p></div><div className="flex gap-2"><Button variant="tertiary">Preview</Button><Button onClick={onEdit}>Edit Post</Button></div></div>
      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <DetailCard title="Media and hotspots"><div className="relative"><ContentMedia index={zeroProduct ? 1 : 0} large />{!zeroProduct && <><span className="absolute left-[42%] top-[35%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span><span className="absolute right-[20%] top-[58%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span></>}</div></DetailCard>
        <div className="flex flex-col gap-5">
          <DetailCard title="Caption"><p className="text-sm leading-relaxed text-text-secondary">{zeroProduct ? 'The Netela Project — a three-week documentation of how Ethiopian cotton travels from loom to wearer.' : 'Spring styling in Addis Ababa. New collection, every piece made slowly.'}</p></DetailCard>
          <DetailCard title="Product selection">{zeroProduct ? <div><div className="text-sm font-semibold">No Products selected</div><p className="mt-1 text-xs text-text-muted">This is valid and does not block publication.</p></div> : <div className="space-y-2"><SelectedProduct name="Habesha Kemis — Classic White" /><SelectedProduct name="Tibeb Scarf — Gold Weave" /></div>}</DetailCard>
          <DetailCard title="Distribution"><div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">Publication</span><span className="text-xs text-text-muted">{publication === 'published' ? 'Visible on Store and direct links' : publication === 'draft' ? 'Not yet published' : 'Restricted from public surfaces'}</span></span><StatusBadge status={publication} /></div><div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span><span className="block text-sm font-semibold">For You eligibility</span><span className="text-xs text-text-muted">{eligible ? 'Eligible as a Shoppable Post' : zeroProduct ? 'Requires at least one Product tag' : 'Not currently eligible'}</span></span><EligibilityBadge eligible={eligible} /></div></DetailCard>
        </div>
      </div>
    </div>
  )
}

function ShoppablePostEditor({ onBack }: { onBack: () => void }) {
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState<string[]>(['PRD-001'])
  const [hotspots, setHotspots] = useState(true)
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const toggleProduct = (id: string) => setSelected(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id])
  const eligible = selected.length > 0
  return (
    <div className="mx-auto max-w-7xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Shoppable Posts</button>
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Create Shoppable Post</h1><p className="mt-1 text-sm text-text-muted">Product selection and hotspots are optional.</p></div><div className="flex gap-2"><Button variant="tertiary" onClick={() => setPreview(!preview)}>{preview ? 'Close Preview' : 'Preview'}</Button><Button onClick={() => setPublished(true)}>Publish</Button></div></div>
      {published && <div className="mb-5 rounded-xl border border-success/20 bg-success-bg p-4"><div className="flex items-center gap-3"><CheckIcon /><div className="flex-1"><div className="text-sm font-semibold text-success">Shoppable Post published</div><div className="mt-1 text-xs text-text-secondary">{eligible ? 'Published · FYP Eligible' : 'Published · Not eligible for For You because no Products are tagged.'}</div></div><StatusBadge status="published" /><EligibilityBadge eligible={eligible} /></div></div>}
      <div className={`grid gap-5 ${preview ? 'grid-cols-[1.25fr_.75fr]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-5">
          <EditorSection step="01" title="Media"><div className="grid grid-cols-[220px_1fr] gap-4"><ContentMedia index={0} large /><button className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised text-sm font-semibold text-text-muted">Replace media</button></div></EditorSection>
          <EditorSection step="02" title="Caption"><Textarea label="Caption" value={caption} onChange={event => setCaption(event.target.value)} placeholder="Tell the story behind this post..." rows={4} /></EditorSection>
          <EditorSection step="03" title="Optional Product selection">
            <div className="mb-3 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Only Products owned by Addis Atelier can be tagged. Leave every Product unselected to publish a zero-product post.</div>
            <div className="grid grid-cols-3 gap-3">{PRODUCTS.slice(0, 3).map(product => <button key={product.id} onClick={() => toggleProduct(product.id)} className={`rounded-xl border p-3 text-left ${selected.includes(product.id) ? 'border-brand bg-brand-muted' : 'border-border'}`}><div className="flex items-start justify-between"><ProductThumb index={PRODUCTS.indexOf(product)} /><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected.includes(product.id) ? 'border-brand bg-brand text-white' : 'border-border-strong'}`}>{selected.includes(product.id) && '✓'}</span></div><div className="mt-3 text-xs font-semibold">{product.name}</div><div className="mt-1 text-[10px] text-text-muted">Addis Atelier · {product.id}</div></button>)}</div>
          </EditorSection>
          <EditorSection step="04" title="Optional hotspots">
            <div className="flex items-start justify-between"><div><div className="text-sm font-semibold">Product hotspots</div><div className="text-xs text-text-muted">{selected.length ? 'Place visual entry points for selected Products.' : 'Unavailable because no Products are selected.'}</div></div><Toggle checked={hotspots && eligible} onChange={() => eligible && setHotspots(!hotspots)} disabled={!eligible} /></div>
            {eligible && hotspots && <div className="relative mt-4 max-w-sm"><ContentMedia index={0} large /><span className="absolute left-[42%] top-[35%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span></div>}
          </EditorSection>
          <EditorSection step="05" title="Preview and eligibility"><div className="grid grid-cols-2 gap-4"><div className="rounded-xl bg-surface-raised p-4"><div className="text-xs text-text-muted">Publication state</div><div className="mt-2"><StatusBadge status="published" customLabel="Will publish" /></div></div><div className="rounded-xl bg-surface-raised p-4"><div className="text-xs text-text-muted">For You eligibility</div><div className="mt-2"><EligibilityBadge eligible={eligible} /></div></div></div><p className="mt-3 text-xs text-text-muted">Publishing is allowed with {selected.length} tagged Product{selected.length === 1 ? '' : 's'}. Eligibility does not control publication.</p></EditorSection>
        </div>
        {preview && <ShoppablePreview caption={caption || 'Your caption will appear here.'} productCount={selected.length} hotspots={hotspots} />}
      </div>
    </div>
  )
}

function EditorSection({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5"><div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-muted font-mono text-[10px] font-bold text-brand-dark">{step}</span><h2 className="font-display text-lg font-semibold">{title}</h2></div>{children}</section>
}

function ProductPreview({ name, category, price, description }: { name: string; category: string; price: string; description: string }) {
  return <aside className="sticky top-4 h-fit rounded-3xl border border-border bg-surface p-4 shadow-lg"><div className="text-center font-mono text-[10px] uppercase tracking-wider text-text-muted">Product Post Preview</div><div className="mt-4 h-80 rounded-2xl bg-gradient-to-br from-brand-muted to-warning-bg" /><div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-brand">{category}</div><div className="mt-1 font-display text-xl font-semibold">{name}</div><div className="mt-2 font-bold text-brand">{price}</div><p className="mt-3 text-xs leading-relaxed text-text-secondary">{description || 'Product description'}</p><Button style={{ width: '100%', marginTop: 16 }}>Add to Cart</Button><div className="mt-3 text-center text-[10px] text-text-muted">Exactly one Product · Commerce detail surface</div></aside>
}

function ShoppablePreview({ caption, productCount, hotspots }: { caption: string; productCount: number; hotspots: boolean }) {
  return <aside className="sticky top-4 h-fit rounded-3xl border border-border bg-text-primary p-3 text-white shadow-lg"><div className="text-center font-mono text-[10px] uppercase tracking-wider text-white/60">Shoppable Post Preview</div><div className="relative mt-3 h-[460px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark">{hotspots && productCount > 0 && <span className="absolute left-[45%] top-[38%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white">+</span>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-20"><div className="text-sm font-semibold">Addis Atelier</div><p className="mt-2 text-sm leading-relaxed text-white/80">{caption}</p>{productCount > 0 && <div className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-text-primary">In this post · {productCount} Product{productCount > 1 ? 's' : ''}</div>}</div></div><div className="mt-3 text-center text-[10px] text-white/60">{productCount ? 'Published · FYP Eligible' : 'Published · Not eligible for For You'}</div></aside>
}

function VariantEditor() {
  return <div className="overflow-hidden rounded-xl border border-border"><div className="grid grid-cols-[1fr_1.5fr_120px_100px] gap-3 bg-surface-raised px-4 py-2 text-[10px] font-semibold uppercase text-text-muted"><span>Option</span><span>Values</span><span>Price impact</span><span>Inventory</span></div><div className="grid grid-cols-[1fr_1.5fr_120px_100px] gap-3 border-t border-border px-4 py-3 text-xs"><span>Size</span><span>XS, S, M, L, XL, Custom</span><span>None</span><span>Tracked</span></div><div className="grid grid-cols-[1fr_1.5fr_120px_100px] gap-3 border-t border-border px-4 py-3 text-xs"><span>Border colour</span><span>Gold, Black, Silver, Red</span><span>None</span><span>Tracked</span></div><button className="w-full border-t border-border px-4 py-3 text-left text-xs font-semibold text-brand">+ Add variant option</button></div>
}

function VariantTable() {
  return <div className="space-y-2">{['Size · XS, S, M, L, XL, Custom', 'Border colour · Gold, Black, Silver, Red'].map(value => <div key={value} className="rounded-lg bg-surface-raised p-3 text-xs font-medium">{value}</div>)}</div>
}

function CheckOption({ label, checked }: { label: string; checked?: boolean }) {
  const [selected, setSelected] = useState(!!checked)
  return <button onClick={() => setSelected(!selected)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${selected ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border'}`}><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-brand bg-brand text-white' : 'border-border-strong'}`}>{selected && '✓'}</span>{label}</button>
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return <button onClick={onChange} disabled={disabled} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-border-strong'} ${disabled ? 'opacity-50' : ''}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} /></button>
}

function ProductThumb({ index }: { index: number }) {
  const colors = ['from-brand-muted to-warning-bg', 'from-warning-bg to-brand-muted', 'from-success-bg to-courier-muted', 'from-surface-raised to-border']
  return <span className={`block h-12 w-12 rounded-lg bg-gradient-to-br ${colors[index % colors.length]}`} />
}

function ProductMedia({ large, muted }: { large?: boolean; muted?: boolean }) {
  return <div className={`${large ? 'h-56' : 'h-32'} rounded-xl bg-gradient-to-br ${muted ? 'from-surface-raised to-border' : 'from-brand-muted to-warning-bg'}`} />
}

function ContentMedia({ index, large }: { index: number; large?: boolean }) {
  const colors = ['from-brand to-brand-dark', 'from-success to-courier', 'from-warning to-brand']
  return <div className={`${large ? 'h-[480px]' : 'h-56'} w-full bg-gradient-to-br ${colors[index % colors.length]}`} />
}

function SelectedProduct({ name }: { name: string }) {
  return <div className="flex items-center gap-3 rounded-xl bg-surface-raised p-3"><ProductThumb index={0} /><span className="flex-1 text-xs font-semibold">{name}</span><span className="text-[10px] text-success">Same Seller</span></div>
}

function EligibilityBadge({ eligible }: { eligible: boolean }) {
  return <span className={`inline-flex rounded-full px-2 py-1 font-mono text-[10px] font-semibold ${eligible ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{eligible ? 'FYP Eligible' : 'Not FYP Eligible'}</span>
}

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return <div className="grid grid-cols-2 gap-4">{rows.map(([label, value]) => <Field key={label} label={label} value={value} />)}</div>
}

function SuccessBanner({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-5 flex items-center gap-3 rounded-xl bg-success-bg p-4 text-success"><CheckIcon /><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-secondary">{detail}</span></span></div>
}

function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{children}</button>
}

function InboxPanel() {
  const [selected, setSelected] = useState('Maya T.')
  const [context, setContext] = useState('Order')
  const [reply, setReply] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [escalated, setEscalated] = useState(true)
  const conversations = [
    { name: 'Maya T.', detail: 'Thanks, I’ll be available for delivery.', context: 'ADU-24091', unread: true, time: '2m' },
    { name: 'Tigist A.', detail: 'Does this scarf come in silver?', context: 'PRD-002', unread: true, time: '18m' },
    { name: 'Selam B.', detail: 'The assistant asked me to contact you.', context: 'Escalated', unread: true, time: '1h' },
    { name: 'Hana G.', detail: 'Thank you for the update.', context: 'ADU-24080', unread: false, time: '1d' },
  ]
  const send = () => {
    if (!reply.trim()) return
    setSent(messages => [...messages, reply])
    setReply('')
  }
  return (
    <div className="flex h-full min-h-[680px]">
      <div className="w-80 flex-shrink-0 border-r border-border bg-surface">
        <div className="border-b border-border p-4"><div className="font-display text-xl font-semibold">Inbox</div><div className="mt-3"><SearchInput placeholder="Search conversations" /></div></div>
        {conversations.map(conversation => <button key={conversation.name} onClick={() => { setSelected(conversation.name); setEscalated(conversation.context === 'Escalated') }} className={`flex w-full gap-3 border-b border-border p-4 text-left ${selected === conversation.name ? 'bg-brand-muted' : ''}`}><AvatarText name={conversation.name} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="text-sm font-semibold">{conversation.name}</span><span className="text-[10px] text-text-muted">{conversation.time}</span></span><span className="mt-1 block truncate text-xs text-text-muted">{conversation.detail}</span><span className="mt-2 inline-flex rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[9px] text-text-secondary">{conversation.context}</span></span>{conversation.unread && <span className="mt-1 h-2 w-2 rounded-full bg-brand" />}</button>)}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3"><div className="flex items-center gap-3"><AvatarText name={selected} /><span><span className="block text-sm font-semibold">{selected}</span><span className="text-xs text-text-muted">Buyer–Seller relationship thread</span></span></div>{escalated && <StatusBadge status="open" customLabel="Chatbot escalated" />}</div>
        <div className="flex gap-2 border-b border-border bg-surface px-5 py-3">{['Product', 'Post', 'Order'].map(value => <Pill key={value} active={context === value} onClick={() => setContext(value)}>{value === 'Product' ? 'Product · PRD-001' : value === 'Post' ? 'Post · SHP-018' : 'Order · ADU-24091'}</Pill>)}</div>
        {escalated && <div className="flex items-center gap-3 bg-warning-bg px-5 py-3 text-xs text-text-secondary"><span className="font-semibold text-warning">Chatbot escalation</span><span>The assistant could not answer a sizing question. A human Seller reply is requested.</span><button onClick={() => setEscalated(false)} className="ml-auto font-semibold text-brand">Mark handled</button></div>}
        <div className="flex-1 overflow-y-auto bg-surface-raised p-5">
          <ChatBubble>Hi, is the custom size available for the white Habesha Kemis?</ChatBubble>
          <ChatBubble mine>Yes. Choose Custom and add your measurements after checkout.</ChatBubble>
          <ChatBubble>Thanks. How long does it take?</ChatBubble>
          {sent.map((message, index) => <ChatBubble key={index} mine>{message}</ChatBubble>)}
        </div>
        <div className="border-t border-border bg-surface p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto"><span className="text-xs font-semibold text-text-muted">Quick Replies</span>{['Ready in 5–7 days', 'Courier assigned', 'Please check your Order'].map(value => <button key={value} onClick={() => setReply(value)} className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary">{value}</button>)}</div>
          <div className="flex gap-2"><div className="flex-1"><TextInput value={reply} onChange={event => setReply(event.target.value)} placeholder={`Reply as Addis Atelier about this ${context}`} /></div><Button onClick={send}>Send Reply</Button></div>
          <div className="mt-2 text-[10px] text-text-muted">Human Seller reply · Chat does not establish payment, fulfilment, handoff, or claim truth.</div>
        </div>
      </div>
    </div>
  )
}

function InsightsPanel() {
  const [tab, setTab] = useState<'overview' | 'content'>('overview')
  const overview = [
    ['Paid Orders', '31', '+12%'], ['Completed Orders', '27', '+8%'], ['GMV', 'ETB 68,420', '+14%'],
    ['Product views', '4,820', '+21%'], ['Shoppable impressions', '18,440', '+16%'], ['Product-tag CTR', '6.8%', '+0.7pp'],
    ['Storefront visits', '3,240', '+9%'], ['Claims', '2', 'Stable'], ['Cancellation', '1.4%', '-0.3pp'],
    ['Response reliability', '94%', '+2pp'], ['Fulfilment reliability', '97%', '+1pp'],
  ]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Insights" description="Store, content and fulfilment performance." trailing={<Segmented options={[['overview', 'Overview'], ['content', 'Content Performance']]} active={tab} onChange={value => setTab(value as 'overview' | 'content')} />} />
      {tab === 'overview' ? (
        <>
          <div className="grid grid-cols-4 gap-4">{overview.map(([label, value, change]) => <InsightCard key={label} label={label} value={value} change={change} />)}</div>
          <div className="mt-5 grid grid-cols-[1.5fr_1fr] gap-5"><TrendPanel title="Paid Orders and GMV · 7 days" /><ReliabilityPanel /></div>
        </>
      ) : <ContentPerformance />}
      <div className="mt-5 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Insights report observable outcomes only. Recommendation algorithms, ranking weights and internal eligibility calculations are not exposed.</div>
    </div>
  )
}

function ContentPerformance() {
  const rows = [
    { post: 'Spring styling in Addis Ababa', status: 'FYP Eligible', impressions: '8,420', saves: '612', clicks: '580', views: '422', checkout: '68', paid: '21' },
    { post: 'Heritage textures · Gabi story', status: 'FYP Eligible', impressions: '6,210', saves: '404', clicks: '361', views: '294', checkout: '41', paid: '12' },
    { post: 'The Netela Project', status: 'Not FYP Eligible', impressions: '1,840', saves: '188', clicks: '—', views: '—', checkout: '—', paid: '—' },
  ]
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-[1.6fr_130px_repeat(6,1fr)] gap-3 bg-surface-raised px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-text-muted"><span>Shoppable Post</span><span>Eligibility</span><span>Impressions</span><span>Saves</span><span>Tag clicks</span><span>Product views</span><span>Checkout starts</span><span>Paid Orders influenced</span></div>
      {rows.map(row => <div key={row.post} className="grid grid-cols-[1.6fr_130px_repeat(6,1fr)] items-center gap-3 border-t border-border px-5 py-4 text-xs"><span className="font-semibold">{row.post}</span><EligibilityBadge eligible={row.status === 'FYP Eligible'} /><span>{row.impressions}</span><span>{row.saves}</span><span>{row.clicks}</span><span>{row.views}</span><span>{row.checkout}</span><span className="font-semibold text-brand">{row.paid}</span></div>)}
    </div>
  )
}

function TrustPanel() {
  const levels = [
    { name: 'NEW', detail: 'New Seller relationship and limited operating history.' },
    { name: 'REBUILDING', detail: 'Trust is recovering after reliability or policy issues.' },
    { name: 'ESTABLISHED', detail: 'Consistent commerce and fulfilment history.', current: true },
    { name: 'TRUSTED', detail: 'Sustained high reliability across key Seller outcomes.' },
  ]
  return (
    <div className="mx-auto max-w-5xl p-8">
      <ModuleHeader title="Seller Trust" description="Read-only view of Addis Atelier’s current Trust level." trailing={<span className="rounded-full bg-info-bg px-3 py-2 font-mono text-xs font-semibold text-info">READ-ONLY</span>} />
      <div className="rounded-2xl border border-info/20 bg-info-bg p-6"><div className="text-xs font-semibold uppercase tracking-wider text-info">Current Trust level</div><div className="mt-2 font-display text-4xl font-semibold">ESTABLISHED</div><p className="mt-2 text-sm text-text-secondary">Based on observed commerce, service, claims and fulfilment outcomes. Sellers cannot edit or select Trust.</p></div>
      <div className="mt-5 grid grid-cols-4 gap-4">{levels.map(level => <div key={level.name} className={`rounded-2xl border p-5 ${level.current ? 'border-info bg-info-bg' : 'border-border bg-surface'}`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold">{level.name}</span>{level.current && <StatusBadge status="active" size="sm" customLabel="Current" />}</div><p className="mt-3 text-xs leading-relaxed text-text-muted">{level.detail}</p></div>)}</div>
      <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">Trust changes are system-managed and auditable. This Console intentionally contains no edit, override, or level-selection controls.</div>
    </div>
  )
}

function ReviewsPanel() {
  const [dimension, setDimension] = useState<'quality' | 'service'>('quality')
  const reviews = dimension === 'quality'
    ? [{ buyer: 'Maya T.', score: 5, product: 'Habesha Kemis', text: 'Beautiful embroidery and excellent fabric quality.' }, { buyer: 'Tigist A.', score: 4, product: 'Tibeb Scarf', text: 'The weave is gorgeous and matched the description.' }]
    : [{ buyer: 'Maya T.', score: 5, product: 'Order ADU-24091', text: 'Clear communication and preparation was on time.' }, { buyer: 'Hana G.', score: 4, product: 'Order ADU-24080', text: 'Helpful response when I asked about delivery.' }]
  return (
    <div className="mx-auto max-w-6xl p-8">
      <ModuleHeader title="Reviews" description="Product Quality and Seller Service are measured separately." trailing={<Segmented options={[['quality', 'Product Quality'], ['service', 'Seller Service']]} active={dimension} onChange={value => setDimension(value as 'quality' | 'service')} />} />
      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center"><div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{dimension === 'quality' ? 'Product Quality' : 'Seller Service'}</div><div className="mt-3 font-display text-5xl font-semibold">{dimension === 'quality' ? '4.8' : '4.9'}</div><div className="mt-2 text-xl text-warning">★★★★★</div><div className="mt-2 text-xs text-text-muted">{dimension === 'quality' ? '214 product ratings' : '198 service ratings'}</div><div className="mt-6 space-y-2">{[5, 4, 3, 2, 1].map(star => <div key={star} className="flex items-center gap-2 text-xs"><span>{star}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-warning" style={{ width: `${star === 5 ? 78 : star === 4 ? 16 : 2}%` }} /></div></div>)}</div></div>
        <div className="space-y-3">{reviews.map(review => <div key={review.buyer} className="rounded-2xl border border-border bg-surface p-5"><div className="flex justify-between"><span><span className="block text-sm font-semibold">{review.buyer}</span><span className="text-xs text-text-muted">{review.product}</span></span><span className="text-warning">{'★'.repeat(review.score)}</span></div><p className="mt-3 text-sm leading-relaxed text-text-secondary">{review.text}</p><div className="mt-3 text-[10px] font-semibold uppercase text-text-muted">{dimension === 'quality' ? 'Product Quality review' : 'Seller Service review'}</div></div>)}</div>
      </div>
    </div>
  )
}

function ClaimsPanel() {
  const [selected, setSelected] = useState('CLM-2041')
  const claims = [
    { id: 'CLM-2041', order: 'ADU-24086', buyer: 'Selam B.', issue: 'Item not as described', status: 'evidence-required' },
    { id: 'CLM-2038', order: 'ADU-24072', buyer: 'Rahel K.', issue: 'Item damaged', status: 'under-review' },
    { id: 'CLM-2029', order: 'ADU-24054', buyer: 'Mekdes T.', issue: 'Missing item', status: 'resolved' },
  ]
  const claim = claims.find(item => item.id === selected)!
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Claims" description="Respond with Order-specific information and evidence." />
      <div className="grid grid-cols-[360px_1fr] gap-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">{claims.map(item => <button key={item.id} onClick={() => { setSelected(item.id); setSubmitted(false) }} className={`w-full border-b border-border p-4 text-left last:border-b-0 ${selected === item.id ? 'bg-brand-muted' : ''}`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{item.id}</span><StatusBadge status={item.status} size="sm" /></div><div className="mt-2 text-sm font-semibold">{item.issue}</div><div className="mt-1 text-xs text-text-muted">{item.order} · {item.buyer}</div></button>)}</div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between"><div><div className="font-display text-2xl font-semibold">{claim.issue}</div><div className="mt-1 text-xs text-text-muted">{claim.id} · Seller Order {claim.order}</div></div><StatusBadge status={claim.status} /></div>
          <div className="mt-5 grid grid-cols-2 gap-4"><Field label="Buyer-safe identity" value={claim.buyer} /><Field label="Submitted" value="Today · 08:14" /></div>
          <SectionLabelInline>Buyer statement</SectionLabelInline><div className="rounded-xl bg-surface-raised p-4 text-sm leading-relaxed text-text-secondary">“The embroidery colour differs from the Product Post. I selected gold but received silver.”</div>
          <SectionLabelInline>Evidence</SectionLabelInline><div className="grid grid-cols-3 gap-3"><EvidenceTile label="Buyer photo" /><EvidenceTile label="Product Post snapshot" /><EvidenceTile label="Verified handoff" /></div>
          <div className="mt-5"><Textarea label="Seller response" value={response} onChange={event => setResponse(event.target.value)} placeholder="Add preparation details or evidence relevant to this claim." rows={4} /></div>
          <div className="mt-4 flex justify-end"><Button disabled={!response || submitted} onClick={() => setSubmitted(true)}>{submitted ? 'Response Submitted' : 'Submit Response'}</Button></div>
          {submitted && <div className="mt-4 rounded-xl bg-success-bg p-3 text-xs font-semibold text-success">Response added · Claim remains under review</div>}
        </div>
      </div>
    </div>
  )
}

function StorePanel({ onOpenCouriers }: { onOpenCouriers: () => void }) {
  const [tab, setTab] = useState<'profile' | 'fulfilment' | 'verification'>('profile')
  const [available, setAvailable] = useState(true)
  const [saved, setSaved] = useState(false)
  return (
    <div className="mx-auto max-w-6xl p-8">
      <ModuleHeader title="Store" description="Customer-facing profile, availability and fulfilment." trailing={<Segmented options={[['profile', 'Store Profile'], ['fulfilment', 'Fulfilment'], ['verification', 'Verification']]} active={tab} onChange={value => setTab(value as typeof tab)} />} />
      {saved && <SuccessBanner title="Store settings saved" detail="Your latest Store configuration is now reflected in the prototype." />}
      {tab === 'profile' && (
        <div className="grid grid-cols-[1.4fr_.6fr] gap-5">
          <DetailCard title="Store Profile"><div className="grid grid-cols-2 gap-4"><TextInput label="Store name" defaultValue="Addis Atelier" /><TextInput label="Handle" defaultValue="@addisatelier" hint="Public and unique." /><div className="col-span-2"><Textarea label="Bio" defaultValue="Handcrafted Ethiopian fashion, made to order in Addis Ababa." rows={3} /></div><TextInput label="Physical Location" defaultValue="Bole, Addis Ababa" /><TextInput label="Customer-facing contact" defaultValue="+251 91 234 5678" /></div><div className="mt-5 flex justify-end"><Button onClick={() => setSaved(true)}>Save Profile</Button></div></DetailCard>
          <div className="flex flex-col gap-5"><DetailCard title="Availability"><div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">{available ? 'Store available' : 'Store unavailable'}</span><span className="text-xs text-text-muted">Controls new ordering availability.</span></span><Toggle checked={available} onChange={() => setAvailable(!available)} /></div></DetailCard><DetailCard title="Public handle"><div className="font-mono text-sm font-semibold text-brand">adulis.app/addisatelier</div><div className="mt-2 text-xs text-text-muted">Handle changes affect future shared links.</div></DetailCard></div>
        </div>
      )}
      {tab === 'fulfilment' && (
        <div className="grid grid-cols-2 gap-5">
          <DetailCard title="Buyer Collection"><FulfilmentSetting title="Enabled" detail="Bole showroom · Mon–Sat, 9:00–17:00" checked /></DetailCard>
          <DetailCard title="Seller Delivery"><FulfilmentSetting title="Enabled" detail="Addis Ababa · ETB 120 fixed delivery" checked /></DetailCard>
          <DetailCard title="Courier Delivery"><FulfilmentSetting title="Enabled" detail="Approved Seller Courier Pool · price shown before payment" checked /><Button variant="tertiary" onClick={onOpenCouriers} style={{ marginTop: 16 }}>Manage Couriers</Button></DetailCard>
          <DetailCard title="Preparation settings"><InfoGrid rows={[['Default lead time', '1–3 business days'], ['Made-to-order lead time', '5–7 business days'], ['Ready reminder', 'After 24 hours']]} /></DetailCard>
        </div>
      )}
      {tab === 'verification' && (
        <div className="grid grid-cols-2 gap-5"><DetailCard title="Social account"><VerificationRow label="@addisatelier" detail="Connected social-commerce account" status="Verified" /></DetailCard><DetailCard title="Store details"><VerificationRow label="Addis Atelier" detail="Store profile and contact information" status="Verified" /></DetailCard><DetailCard title="Payment provider"><VerificationRow label="Provider connection" detail="Provider establishes payment truth" status="Ready" /></DetailCard><DetailCard title="Fulfilment"><VerificationRow label="Courier and collection" detail="At least one fulfilment method is active" status="Verified" /></DetailCard></div>
      )}
    </div>
  )
}

function CouriersPanel() {
  const [tab, setTab] = useState<'approved' | 'applications' | 'invitations' | 'suspended'>('approved')
  const [selected, setSelected] = useState('Daniel K.')
  const [action, setAction] = useState('')
  const [compensation, setCompensation] = useState('180')
  const couriers = {
    approved: [{ name: 'Daniel K.', availability: 'Available', meta: 'Approved · 8 months' }, { name: 'Rahel M.', availability: 'Busy', meta: 'Approved · 4 months' }],
    applications: [{ name: 'Daniel K.', availability: 'Available', meta: 'Application · 2 days ago' }],
    invitations: [{ name: 'Meron A.', availability: 'Unknown', meta: 'Invitation sent · 1 day ago' }],
    suspended: [{ name: 'Samuel B.', availability: 'Unavailable', meta: 'Suspended · review pending' }],
  }[tab]
  const courier = couriers.find(item => item.name === selected) ?? couriers[0]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Couriers" description="Private courier relationships for Addis Atelier only." trailing={<Button onClick={() => { setTab('invitations'); setAction('Invitation composer opened') }}>Invite Courier</Button>} />
      <div className="mb-5 flex gap-2"><Pill active={tab === 'approved'} onClick={() => { setTab('approved'); setSelected('Daniel K.') }}>Approved · 2</Pill><Pill active={tab === 'applications'} onClick={() => { setTab('applications'); setSelected('Daniel K.') }}>Applications · 1</Pill><Pill active={tab === 'invitations'} onClick={() => { setTab('invitations'); setSelected('Meron A.') }}>Invitations · 1</Pill><Pill active={tab === 'suspended'} onClick={() => { setTab('suspended'); setSelected('Samuel B.') }}>Suspended · 1</Pill></div>
      {action && <div className="mb-4 rounded-xl bg-info-bg p-3 text-xs font-semibold text-info">{action}</div>}
      <div className="grid grid-cols-[340px_1fr] gap-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">{couriers.map(item => <button key={item.name} onClick={() => setSelected(item.name)} className={`flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0 ${courier.name === item.name ? 'bg-brand-muted' : ''}`}><AvatarText name={item.name} /><span className="flex-1"><span className="block text-sm font-semibold">{item.name}</span><span className="text-xs text-text-muted">{item.meta}</span></span><span className="text-xs font-semibold text-success">{item.availability}</span></button>)}</div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between"><div className="flex items-center gap-4"><AvatarText name={courier.name} large /><span><span className="block font-display text-2xl font-semibold">{courier.name}</span><span className="text-xs text-text-muted">Seller Courier relationship · Addis Atelier</span></span></div><StatusBadge status={tab === 'approved' ? 'active' : tab === 'suspended' ? 'suspended' : 'pending'} customLabel={tab === 'approved' ? 'Approved' : tab === 'suspended' ? 'Suspended' : tab === 'applications' ? 'Application' : 'Invited'} /></div>
          <div className="mt-6 grid grid-cols-3 gap-4"><Field label="Availability" value={courier.availability} /><Field label="Seller relationship" value={courier.meta} /><Field label="Terms" value="Per accepted delivery" /></div>
          <SectionLabelInline>Compensation</SectionLabelInline>
          <div className="flex items-end gap-3"><div className="w-56"><TextInput label="Future delivery compensation (ETB)" value={compensation} onChange={event => setCompensation(event.target.value)} hint="Applies only to future offers." /></div><Button variant="tertiary" onClick={() => setAction(`Future compensation updated to ETB ${compensation}`)}>Update Future Compensation</Button></div>
          <SectionLabelInline>Seller-relevant history</SectionLabelInline>
          <div className="grid grid-cols-3 gap-3"><MetricBlock label="Completed for Addis Atelier" value="126" /><MetricBlock label="Verified pickup" value="100%" /><MetricBlock label="On-time handoff" value="98%" /></div>
          <div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Only this Seller relationship and work completed for Addis Atelier are visible. Relationships with other Sellers are private and not shown.</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {tab === 'applications' && <><Button onClick={() => setAction(`${courier.name} approved`)}>Approve</Button><Button variant="destructive" onClick={() => setAction(`${courier.name} rejected`)}>Reject</Button></>}
            {tab === 'approved' && <><Button variant="tertiary" onClick={() => setAction(`${courier.name} suspended`)}>Suspend</Button><Button variant="destructive" onClick={() => setAction(`${courier.name} removed from Addis Atelier pool`)}>Remove</Button></>}
            {tab === 'invitations' && <Button variant="tertiary" onClick={() => setAction(`Invitation resent to ${courier.name}`)}>Resend Invitation</Button>}
            {tab === 'suspended' && <Button onClick={() => setAction(`${courier.name} restored to approved pool`)}>Restore Relationship</Button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function AutomationPanel() {
  const [tab, setTab] = useState<'overview' | 'answers' | 'testing' | 'insights'>('overview')
  const [testAnswer, setTestAnswer] = useState(false)
  const [answerSaved, setAnswerSaved] = useState(false)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Chatbot Automation" description="Manage automated answers and human escalation." trailing={<Segmented options={[['overview', 'Overview'], ['answers', 'Answers'], ['testing', 'Testing'], ['insights', 'Insights']]} active={tab} onChange={value => setTab(value as typeof tab)} />} />
      {tab === 'overview' && <div className="grid grid-cols-4 gap-4"><InsightCard label="Questions answered" value="184" change="+18%" /><InsightCard label="Resolution rate" value="72%" change="+4pp" /><InsightCard label="Human escalations" value="31" change="-3%" /><InsightCard label="Unmatched questions" value="12" change="Needs review" /><div className="col-span-4 rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">Escalation health</div><p className="mt-2 text-sm text-text-secondary">Questions about payment disputes, claims, custom promises, or unmatched topics escalate to a human Seller. Automation does not modify commerce records.</p></div></div>}
      {tab === 'answers' && <div className="grid grid-cols-[1fr_1fr] gap-5"><DetailCard title="Saved answers"><AnswerRow question="How long does custom sizing take?" answer="Custom sizing takes 5–7 business days." /><AnswerRow question="Do you offer Buyer Collection?" answer="Yes, from our Bole location." /><AnswerRow question="How do I track delivery?" answer="Use the verified status timeline in your Order." /></DetailCard><DetailCard title="Edit answer"><TextInput label="Customer question" defaultValue="How long does custom sizing take?" /><div className="mt-4"><Textarea label="Approved answer" defaultValue="Custom sizing takes 5–7 business days." rows={5} /></div><Button onClick={() => setAnswerSaved(true)} style={{ marginTop: 16 }}>{answerSaved ? 'Answer Saved' : 'Save Answer'}</Button></DetailCard></div>}
      {tab === 'testing' && <div className="grid grid-cols-[1fr_1fr] gap-5"><DetailCard title="Test a buyer question"><TextInput label="Question" defaultValue="Can I get this dress in a custom size?" /><Button onClick={() => setTestAnswer(true)} style={{ marginTop: 16 }}>Run Test</Button></DetailCard><DetailCard title="Assistant response">{testAnswer ? <div><div className="rounded-xl bg-surface-raised p-4 text-sm">Yes. Select Custom on the Product Post. Addis Atelier’s current lead time is 5–7 business days.</div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-text-muted">Matched: Custom sizing answer</span><StatusBadge status="active" customLabel="Answered" /></div></div> : <div className="py-12 text-center text-sm text-text-muted">Run a test to preview the buyer-facing answer.</div>}</DetailCard></div>}
      {tab === 'insights' && <div className="grid grid-cols-3 gap-4"><InsightCard label="Top topic" value="Sizing" change="42 questions" /><InsightCard label="Highest escalation" value="Claims" change="11 escalations" /><InsightCard label="Answer gap" value="Care instructions" change="8 unmatched" /><div className="col-span-3"><DetailCard title="Unmatched questions"><AnswerRow question="Can you gift wrap for a wedding?" answer="No approved answer · add or escalate" /><AnswerRow question="Can the embroidery be navy?" answer="No approved answer · add or escalate" /></DetailCard></div></div>}
    </div>
  )
}

function SettingsPanel() {
  const [tab, setTab] = useState('team')
  const tabs = [['team', 'Team'], ['roles', 'Roles & Permissions'], ['sessions', 'Sessions'], ['security', 'Security'], ['ownership', 'Ownership'], ['lifecycle', 'Account lifecycle'], ['notifications', 'Notifications'], ['provider', 'Provider status']]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Settings" description="People, access, security and account administration." />
      <div className="grid grid-cols-[240px_1fr] gap-5">
        <div className="h-fit rounded-2xl border border-border bg-surface p-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${tab === key ? 'bg-brand-muted text-brand-dark' : 'text-text-secondary'}`}>{label}</button>)}</div>
        <div>
          {tab === 'team' && <TeamSettings />}
          {tab === 'roles' && <RolesSettings />}
          {tab === 'sessions' && <SessionsSettings />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'ownership' && <OwnershipSettings />}
          {tab === 'lifecycle' && <LifecycleSettings />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'provider' && <ProviderSettings />}
        </div>
      </div>
    </div>
  )
}

function TeamSettings() {
  const [invited, setInvited] = useState(false)
  return <DetailCard title="Team"><div className="mb-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Every team member uses individual human credentials. Shared team passwords are not supported.</div><TeamRow name="Aster Alemu" email="aster@addisatelier.et" role="Owner" status="Active" /><TeamRow name="Miki Tesfaye" email="miki@addisatelier.et" role="Operations" status="Active" /><TeamRow name="Hana Girma" email="hana@addisatelier.et" role="Content Editor" status="Invited" /><Button onClick={() => setInvited(true)} style={{ marginTop: 16 }}>{invited ? 'Invitation Sent' : 'Invite Team Member'}</Button></DetailCard>
}

function RolesSettings() {
  return <DetailCard title="Roles & Permissions"><PermissionRow role="Owner" detail="Full Seller administration and ownership controls" /><PermissionRow role="Operations" detail="Orders, fulfilment, couriers, inbox and claims" /><PermissionRow role="Content Editor" detail="Products, Shoppable Posts and media" /><PermissionRow role="Analyst" detail="Read-only Insights and Reviews" /></DetailCard>
}

function SessionsSettings() {
  return <DetailCard title="Sessions & Devices"><SessionRow device="Chrome · macOS" person="Aster Alemu" detail="Current session · Addis Ababa" current /><SessionRow device="Seller Companion · iPhone" person="Miki Tesfaye" detail="Active 18 minutes ago" /><SessionRow device="Chrome · Windows" person="Hana Girma" detail="Active yesterday" /></DetailCard>
}

function SecuritySettings() {
  return <div className="space-y-5"><DetailCard title="Security"><SettingToggle title="Two-step verification" detail="Required for Owners and administrators." defaultChecked /><SettingToggle title="New device alerts" detail="Notify each person when their credentials are used on a new device." defaultChecked /><SettingToggle title="Session timeout" detail="Require reauthentication after extended inactivity." defaultChecked /></DetailCard><DetailCard title="Credential policy"><p className="text-sm leading-relaxed text-text-secondary">Credentials belong to one identifiable human. Team access is granted through invitations, roles and individual sessions—never through a shared password.</p></DetailCard></div>
}

function OwnershipSettings() {
  return <DetailCard title="Store Ownership"><InfoGrid rows={[['Current Owner', 'Aster Alemu'], ['Owner email', 'aster@addisatelier.et'], ['Store', 'Addis Atelier'], ['Ownership status', 'Active']]} /><div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs text-text-secondary">Ownership transfer requires acceptance by another individually authenticated human account.</div><Button variant="tertiary" style={{ marginTop: 16 }}>Start Ownership Transfer</Button></DetailCard>
}

function LifecycleSettings() {
  return <div className="space-y-5"><DetailCard title="Account lifecycle"><SettingRow title="Pause Store" detail="Stop new Orders while preserving Store data." action="Review pause" /><SettingRow title="Export Store data" detail="Request an export of Seller-controlled records." action="Request export" /></DetailCard><DetailCard title="Close Seller account"><p className="text-sm text-text-secondary">Closing requires all active Seller Orders, claims and fulfilment obligations to be resolved.</p><Button variant="destructive" style={{ marginTop: 16 }}>Review Account Closure</Button></DetailCard></div>
}

function NotificationSettings() {
  return <DetailCard title="Notifications"><SettingToggle title="New Paid Orders" detail="Immediate Console and Seller Companion alert." defaultChecked /><SettingToggle title="Claims and deadlines" detail="Urgent alerts for claim actions." defaultChecked /><SettingToggle title="Courier updates" detail="Offer, assignment and verified handoff events." defaultChecked /><SettingToggle title="Inventory risks" detail="Low-stock and unavailable Products." defaultChecked /><SettingToggle title="Unanswered messages" detail="Buyer conversations awaiting a human reply." defaultChecked /></DetailCard>
}

function ProviderSettings() {
  return <DetailCard title="Payment-provider status"><div className="flex items-center justify-between rounded-xl bg-success-bg p-4"><span><span className="block text-sm font-semibold">Provider connected</span><span className="text-xs text-text-muted">Last verified today · 09:42</span></span><StatusBadge status="active" customLabel="Ready" /></div><div className="mt-4 grid grid-cols-2 gap-4"><Field label="Payment authority" value="Provider + Adulis backend" /><Field label="Seller control" value="Read-only" /><Field label="Reconciliation" value="Automatic provider checks" /><Field label="Settlement profile" value="Configured at provider" /></div></DetailCard>
}

function ModuleHeader({ title, description, trailing }: { title: string; description: string; trailing?: ReactNode }) {
  return <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">{title}</h1><p className="mt-1 text-sm text-text-muted">{description}</p></div>{trailing}</div>
}

function AvatarText({ name, large }: { name: string; large?: boolean }) {
  const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2)
  return <span className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark ${large ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs'}`}>{initials}</span>
}

function ChatBubble({ children, mine }: { children: ReactNode; mine?: boolean }) {
  return <div className={`mb-3 max-w-[70%] rounded-2xl p-3 text-sm shadow-sm ${mine ? 'ml-auto rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-surface'}`}>{children}</div>
}

function InsightCard({ label, value, change }: { label: string; value: string; change: string }) {
  const positive = change.startsWith('+') || change.startsWith('-0.')
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="text-xs font-semibold text-text-muted">{label}</div><div className="mt-3 font-display text-3xl font-semibold">{value}</div><div className={`mt-2 text-xs font-semibold ${positive ? 'text-success' : 'text-text-muted'}`}>{change}</div></div>
}

function TrendPanel({ title }: { title: string }) {
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">{title}</div><div className="mt-5 flex h-44 items-end gap-3">{[44, 58, 50, 72, 61, 82, 92].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="relative w-full flex-1"><span className="absolute bottom-0 w-full rounded-t bg-brand-muted" style={{ height: `${height}%` }}><span className="block h-1/3 rounded-t bg-brand" /></span></div><span className="text-[9px] text-text-muted">{['W', 'T', 'F', 'S', 'S', 'M', 'T'][index]}</span></div>)}</div></div>
}

function ReliabilityPanel() {
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">Reliability</div><div className="mt-5 space-y-5"><ReliabilityBar label="Response reliability" value={94} /><ReliabilityBar label="Fulfilment reliability" value={97} /><ReliabilityBar label="Low cancellation" value={99} /><ReliabilityBar label="Claim-free Orders" value={96} /></div></div>
}

function ReliabilityBar({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{label}</span><span>{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-success" style={{ width: `${value}%` }} /></div></div>
}

function SectionLabelInline({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function EvidenceTile({ label }: { label: string }) {
  return <div className="flex h-24 items-end rounded-xl bg-gradient-to-br from-surface-raised to-border p-3 text-xs font-semibold text-text-secondary">{label}</div>
}

function FulfilmentSetting({ title, detail, checked }: { title: string; detail: string; checked?: boolean }) {
  const [enabled, setEnabled] = useState(!!checked)
  return <div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span><Toggle checked={enabled} onChange={() => setEnabled(!enabled)} /></div>
}

function VerificationRow({ label, detail, status }: { label: string; detail: string; status: string }) {
  return <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-text-muted">{detail}</span></span><StatusBadge status="active" customLabel={status} /></div>
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-raised p-4"><div className="font-display text-xl font-semibold">{value}</div><div className="mt-1 text-[10px] text-text-muted">{label}</div></div>
}

function AnswerRow({ question, answer }: { question: string; answer: string }) {
  return <div className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"><div className="text-sm font-semibold">{question}</div><div className="mt-1 text-xs leading-relaxed text-text-muted">{answer}</div></div>
}

function TeamRow({ name, email, role, status }: { name: string; email: string; role: string; status: string }) {
  return <div className="grid grid-cols-[1.4fr_1.5fr_1fr_100px] items-center gap-4 border-b border-border py-4"><div className="flex items-center gap-3"><AvatarText name={name} /><span className="text-sm font-semibold">{name}</span></div><span className="text-xs text-text-secondary">{email}</span><span className="text-xs font-semibold">{role}</span><StatusBadge status={status === 'Active' ? 'active' : 'pending'} customLabel={status} size="sm" /></div>
}

function PermissionRow({ role, detail }: { role: string; detail: string }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{role}</span><span className="text-xs text-text-muted">{detail}</span></span><Button variant="tertiary" size="sm">View permissions</Button></div>
}

function SessionRow({ device, person, detail, current }: { device: string; person: string; detail: string; current?: boolean }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{device}</span><span className="text-xs text-text-muted">{person} · {detail}</span></span>{current ? <StatusBadge status="active" customLabel="Current" /> : <Button variant="tertiary" size="sm">End session</Button>}</div>
}

function SettingToggle({ title, detail, defaultChecked }: { title: string; detail: string; defaultChecked?: boolean }) {
  const [enabled, setEnabled] = useState(!!defaultChecked)
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span><Toggle checked={enabled} onChange={() => setEnabled(!enabled)} /></div>
}

function SettingRow({ title, detail, action }: { title: string; detail: string; action: string }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span><Button variant="tertiary" size="sm">{action}</Button></div>
}

function OrdersLoading() {
  return <div className="rounded-2xl border border-border bg-surface p-5"><Skeleton height={40} radius="var(--radius-lg)" /><div className="mt-3"><Skeleton height={56} count={5} radius="var(--radius-lg)" /></div></div>
}

function OrdersEmpty({ bucket }: { bucket: string }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><div className="mt-4 font-display text-xl font-semibold">No Orders in {bucket}</div><p className="mt-1 max-w-sm text-sm text-text-muted">There are no Seller Orders requiring attention in this bucket.</p></div>
}

function StateBanner({ type, onRefresh }: { type: 'conflict' | 'stale'; onRefresh: () => void }) {
  return <div className={`mb-4 flex items-center gap-3 rounded-xl p-4 ${type === 'conflict' ? 'bg-danger-bg text-danger' : 'bg-warning-bg text-warning'}`}><span className="flex-1 text-sm"><strong>{type === 'conflict' ? 'Order state conflict.' : 'Order data may be stale.'}</strong> {type === 'conflict' ? 'This Order changed in another session. Refresh before taking an operational action.' : 'Last synchronized 8 minutes ago. Refresh to retrieve the latest provider and fulfilment states.'}</span><Button size="sm" variant="tertiary" onClick={onRefresh}>Refresh</Button></div>
}

function DetailCard({ title, trailing, children }: { title: string; trailing?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">{title}</h2>{trailing}</div>{children}</section>
}

function Evidence({ title, status, detail }: { title: string; status: string; detail: string }) {
  return <div className="rounded-xl bg-surface-raised p-3"><div className="text-xs font-semibold">{title}</div><div className="mt-1 text-sm font-semibold text-brand">{status}</div><div className="mt-1 text-[10px] text-text-muted">{detail}</div></div>
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`mb-2 flex justify-between text-sm ${strong ? 'font-bold' : 'text-text-secondary'}`}><span>{label}</span><span>{value}</span></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="font-display text-xl font-semibold">{value}</div><div className="text-[10px] text-text-muted">{label}</div></div>
}

function Segmented({ options, active, onChange, small }: { options: [string, string][]; active: string; onChange: (value: string) => void; small?: boolean }) {
  return <div className="flex rounded-xl bg-surface-raised p-1">{options.map(([value, label]) => <button key={value} onClick={() => onChange(value)} className={`rounded-lg font-semibold ${small ? 'px-2.5 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'} ${active === value ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{label}</button>)}</div>
}

function CollapseIcon({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d={open ? 'M9 3L5 7L9 11' : 'M5 3L9 7L5 11'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3.5 9.5l3.2 3.2 7.5-7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function ClockIcon() {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M9 5.5V9l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
}

function DotIcon() {
  return <span className="h-2 w-2 rounded-full bg-border-strong" />
}

function InfoIcon() {
  return <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-white">i</span>
}
