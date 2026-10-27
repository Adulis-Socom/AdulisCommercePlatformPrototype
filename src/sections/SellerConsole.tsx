import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AdulisLogo } from '../App'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Overlay'
import { SearchInput, Textarea, TextInput } from '../components/ui/Input'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  ConsoleTopBar, SidebarItem, SidebarSeparator, useDrawer,
  IconGrid, IconOrders, IconPackage, IconImage, IconInbox,
  IconChart, IconStore, IconBot, IconSettings, IconShield, IconFlag, IconTruck,
} from './ShellHelpers'
import { useStory, useStoryMoment } from '../StoryClock'
import {
  ACCESS_AREAS, BUYERS, CAPABILITIES, CHATBOTS, CLAIMS, CLAIM_IDS, CONTEXT_GROUPS, CONVERSATIONS, CONVERSATION_IDS, COURIERS, COURIER_RELATIONSHIPS, DEFAULT_SNAPSHOT,
  GENERAL_CONTEXT, HANDOFF_REVIEWS, INSIGHTS_7D, MARKET, NO_ROLE_CAN, ORDERS, ORDER_TIMELINES, POST_NEEDS_ATTENTION, PRODUCTS, PRODUCT_PERFORMANCE_7D, REVIEWS, SELLERS,
  SELLER_ROLES, SELLER_SESSIONS, SELLER_SETTINGS, SHOPPABLE_POSTS, STAFF, SURFACE_DEFAULTS, TEAM_ROLES, VOLT_HOUSE_PREPUBLICATION,
  activeDiscount, areaAccess, awaitingSellerReplyAt, byMessageTime, capabilitiesOf, claimStateAt, claimSubmitted, claimsForOrder, contextChoicesAt, contextKey,
  contextSubject, courierCardAt, courierCompensationAt, courierHistoryAt, courierListOrder, courierRelationship, currentPrice, deliveryOfferAt, effectiveMessagesAt, firstName, formatAge, formatCalendarDate, formatClock, formatDate, formatMonthShortYear,
  formatDayMonth, formatEtb, formatLongDate, formatPin, formatWeekday, fulfilmentOptionsAt, happenedBefore, hasAvailableProductAt, isForYouEligibleAt, lineOptions, memberRoles, messagesAt,
  moderationIssuesAt, onAdulisSince, orderCourierCompensation, orderStateAt, orderTotals, ordersAt, ordersRequiringPreparationAt, paidAt,
  paymentReference, postsNeedingAttentionAt, preparationAt, prepublicationCards, prepublicationSnapshotFor, productPerformance, productQualityAt, relationshipHistoryAt,
  restrictionAt, reviewsAt, roleInfo, scenePerformance, sceneStatusAt, sellerCompletedOrdersAt, sellerPostsAt, sellerProductsAt, sellerReputationAt, sellerServiceAt,
  sellerTeam, sessionStaffOn, shortName, showcaseSellers, stateTime, trustAt,
  type AccessArea, type CalendarDate, type Capability, type ClaimId, type CourierCard, type CourierRelationshipChange, type CourierRelationshipStatus, type ClaimState, type ConversationId, type CourierAvailability, type CourierId, type MemberStatus, type MessageContext, type MessageRecord, type Moment,
  type OrderId, type OrderState, type ProductId, type SceneStatus, type SellerId, type SellerRole, type ShoppablePostId, type StaffId, type TeamMember, type TeamRole, type Timestamp,
} from '../demo-data'

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
  { key: 'orders', label: 'Orders', icon: <IconOrders size={14} /> },
  { key: 'products', label: 'Products', icon: <IconPackage size={14} /> },
  { key: 'content', label: 'Content', icon: <IconImage size={14} /> },
  { key: 'inbox', label: 'Inbox', icon: <IconInbox size={14} /> },
  { key: 'claims', label: 'Claims', icon: <IconFlag size={14} /> },
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

// Mode-neutral buckets (specification §30); each Order row shows its own fulfilment-specific state.
const BUCKETS: { key: OrderBucket; label: string }[] = [
  { key: 'needs-action', label: 'Needs Action' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready / Awaiting Fulfilment' },
  { key: 'delivery', label: 'In Fulfilment' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled / Refunded' },
]

/** The Orders bucket for an Order state (rules 4.4–4.6); DEMO_DATA has no cancelled or refunded Order. */
function bucketOf(state: OrderState): OrderBucket {
  if (state === 'Paid') return 'needs-action'
  if (state === 'Preparing') return 'preparing'
  if (state === 'Completed') return 'completed'
  if (['Ready for Courier', 'Ready for Seller Delivery', 'Ready for Collection', 'Courier Assigned'].includes(state)) return 'ready'
  return 'delivery'
}

/** The existing badge variant for an Order state, labelled with the state's own name. */
function stateBadge(state: OrderState): { status: string; customLabel?: string } {
  const variant: Partial<Record<OrderState, string>> = { 'Paid': 'paid', 'Preparing': 'preparing', 'Courier Assigned': 'assigned', 'Pickup Verified': 'pickup-verified', 'Completed': 'completed' }
  if (variant[state]) return { status: variant[state]! }
  return { status: bucketOf(state) === 'ready' ? 'ready' : 'in-delivery', customLabel: state }
}

const CLAIM_BADGE: Record<ClaimState, string> = { 'Open': 'open', 'Under Review': 'under-review', 'Resolved': 'resolved' }

/** 'Product name × 2': an Order's Products, with quantities above one. */
function orderItems(orderId: OrderId) {
  return ORDERS[orderId].lines.map(line => `${PRODUCTS[line.product].name}${line.quantity > 1 ? ` × ${line.quantity}` : ''}`).join(', ')
}

/** The Seller's Orders at the story moment, most recently paid first. */
function sellerOrders(sellerId: SellerId, at: Moment) {
  return ordersAt({ seller: sellerId }, at).sort((a, b) => paidAt(b).localeCompare(paidAt(a)))
}

/** The Seller's Claims submitted by the story moment, most recent first. */
function sellerClaims(sellerId: SellerId, at: Moment) {
  return CLAIM_IDS.filter(id => ORDERS[CLAIMS[id].order].seller === sellerId && claimStateAt(id, at) !== null).sort((a, b) => claimSubmitted(b).localeCompare(claimSubmitted(a)))
}

/** The Seller's conversations with messages by the story moment, latest first. */
function sellerThreads(sellerId: SellerId, at: Moment) {
  return CONVERSATION_IDS.filter(id => CONVERSATIONS[id].seller === sellerId)
    .flatMap(id => { const last = messagesAt(id, at).pop(); return last ? [{ id, last }] : [] })
    .sort((a, b) => b.last.at.localeCompare(a.last.at))
}

/** 'Today · HH:MM' on the story day, otherwise the day and month with the time. */
function whenLabel(time: string, at: Moment) {
  return `${time.slice(0, 10) === at.at.slice(0, 10) ? 'Today' : formatDayMonth(time)} · ${formatClock(time)}`
}

/** '2 Oct 16:00': a record-specific deadline. */
function dueLabel(time: string) {
  return `${formatDayMonth(time)} ${formatClock(time)}`
}

/** 'Prepare by 2 Oct 16:00', then '· met' once the Order is Ready in time: the Order's own deadline, never a policy. */
function prepareByLabel(orderId: OrderId, at: Moment) {
  const preparation = preparationAt(orderId, at)
  return preparation && `Prepare by ${dueLabel(preparation.due)}${preparation.met ? ' · met' : ''}`
}

/** The greeting for the story moment's time of day. */
function greeting(at: Moment) {
  const hour = Number(formatClock(at.at).slice(0, 2))
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

export default function SellerConsole({ demoTarget }: { demoTarget?: string }) {
  const initialNav = (demoTarget && ['home', 'orders', 'products', 'content', 'inbox', 'claims', 'reviews', 'trust', 'insights', 'store', 'couriers', 'automation', 'settings'].includes(demoTarget) ? demoTarget : 'home') as NavKey
  // The story moment of the guided-flow step (the 10:25 snapshot otherwise); it moves past a documented event the Seller
  // performs here (a Courier approval). The console opens on the step's Seller (the default Seller otherwise); the
  // top-bar Seller selector switches between the primary showcase Sellers.
  const { seller: storySeller } = useStory()
  const [at, advanceTo] = useStoryMoment()
  const [sellerId, setSellerId] = useState<SellerId>(storySeller ?? SURFACE_DEFAULTS.seller)
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<OrderId | null>(null)
  // Team changes made in Settings (PR-007): each member's new role set or standing, for this session only. DEMO_DATA's
  // team never changes, and a reset removes them.
  const [teamChanges, setTeamChanges] = useState<TeamChanges>({})
  // Courier relationship changes made in Couriers (PR-008): approvals, suspensions and future compensation, for this
  // session only. The Order's Courier selection reads the same changes.
  const [courierChanges, setCourierChanges] = useState<CourierChanges>({})
  const changeCourier = (key: CourierKey, change: CourierRelationshipChange) => setCourierChanges(changes => ({ ...changes, [key]: { ...changes[key], ...change } }))
  // The top bar's menu button opens the navigation as a drawer: on a phone the only navigation, on a tablet the full,
  // labelled navigation beside the icon rail (index.css; spec §4).
  const drawer = useDrawer()

  const navigate = (key: NavKey) => {
    setActiveNav(key)
    setSelectedOrder(null)
    drawer.close()
  }
  // Switching Seller keeps the section and drops everything chosen for the previous Seller.
  const switchSeller = (id: SellerId) => {
    setSellerId(id)
    setSelectedOrder(null)
  }
  const sellerOptions = showcaseSellers().map(id => ({ id, name: SELLERS[id].name, detail: `${SELLERS[id].category} · ${SELLERS[id].handle}` }))

  // Sidebar counts: Paid Orders needing action, conversations awaiting a reply, and open Claims.
  const badges: Partial<Record<NavKey, number>> = {
    orders: sellerOrders(sellerId, at).filter(id => bucketOf(orderStateAt(id, at)!) === 'needs-action').length,
    inbox: sellerThreads(sellerId, at).filter(({ id }) => awaitingSellerReplyAt(id, at)).length,
    claims: sellerClaims(sellerId, at).filter(id => claimStateAt(id, at) !== 'Resolved').length,
  }

  return (
    <div className="seller-console flex" style={{ height: '100%', background: 'var(--color-background)' }}>
      <aside id={drawer.id} {...drawer.panelProps('Seller Console navigation')} className={`seller-console-sidebar flex flex-shrink-0 flex-col border-r transition-all duration-300${drawer.open ? ' is-open' : ''}`} style={{ width: sidebarOpen ? 220 : 52, background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b border-border px-3">
          <AdulisLogo size={24} />
          {(sidebarOpen || drawer.open) && <div className="seller-console-sidebar-copy min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text-primary">Seller Console</p><p className="truncate text-xs text-text-muted">{SELLERS[sellerId].name}</p></div>}
          <button onClick={() => setSidebarOpen(open => !open)} aria-label={sidebarOpen ? 'Collapse Seller Console navigation' : 'Expand Seller Console navigation'} className="console-collapse-button flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-text-muted"><CollapseIcon open={sidebarOpen} /></button>
          <button ref={drawer.closeRef} onClick={drawer.close} aria-label="Close Seller Console navigation" className="console-drawer-close flex-shrink-0 items-center justify-center rounded-lg text-lg text-text-muted">×</button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          {PRIMARY_NAV.map(item => <SidebarItem key={item.key} label={item.label} labelHidden={!sidebarOpen && !drawer.open} icon={item.icon} active={activeNav === item.key} onClick={() => navigate(item.key)} badge={badges[item.key]} />)}
          <SidebarSeparator />
          {SECONDARY_NAV.map(item => <SidebarItem key={item.key} label={item.label} labelHidden={!sidebarOpen && !drawer.open} icon={item.icon} active={activeNav === item.key} onClick={() => navigate(item.key)} />)}
        </nav>
      </aside>
      {drawer.open && <div className="console-drawer-backdrop" aria-hidden="true" onClick={drawer.close} />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleTopBar sellerName={SELLERS[sellerId].name} sellerSelector sellerOptions={sellerOptions} selectedSeller={sellerId} onSelectSeller={switchSeller} menu={drawer.menu('Open Seller Console navigation')} />
        {/* Keyed by Seller: each panel starts again from the selected Seller's records. */}
        <div key={sellerId} className="seller-console-content flex-1 overflow-y-auto">
          {activeNav === 'home' && <HomePanel sellerId={sellerId} at={at} onOpenOrder={id => { setActiveNav('orders'); setSelectedOrder(id) }} onOpenOrders={() => navigate('orders')} onOpenContent={() => navigate('content')} />}
          {activeNav === 'orders' && (selectedOrder ? <OrderDetail orderId={selectedOrder} at={at} courierChanges={courierChanges} onBack={() => setSelectedOrder(null)} /> : <OrdersPanel sellerId={sellerId} at={at} onOpenOrder={setSelectedOrder} />)}
          {activeNav === 'products' && <ProductsPanel sellerId={sellerId} at={at} />}
          {activeNav === 'content' && <ContentPanel sellerId={sellerId} at={at} />}
          {activeNav === 'inbox' && <InboxPanel sellerId={sellerId} at={at} />}
          {activeNav === 'claims' && <ClaimsPanel sellerId={sellerId} at={at} />}
          {activeNav === 'insights' && <InsightsPanel sellerId={sellerId} at={at} />}
          {activeNav === 'reviews' && <ReviewsPanel sellerId={sellerId} at={at} />}
          {activeNav === 'trust' && <TrustPanel sellerId={sellerId} at={at} />}
          {activeNav === 'store' && <StorePanel sellerId={sellerId} at={at} onOpenCouriers={() => navigate('couriers')} />}
          {activeNav === 'couriers' && <CouriersPanel sellerId={sellerId} at={at} advanceTo={advanceTo} changes={courierChanges} onChange={changeCourier} />}
          {activeNav === 'automation' && <AutomationPanel sellerId={sellerId} at={at} />}
          {activeNav === 'settings' && <SettingsPanel sellerId={sellerId} at={at} team={teamWith(sellerId, teamChanges)} onTeamChange={(staff, change) => setTeamChanges(changes => ({ ...changes, [staff]: { ...changes[staff], ...change } }))} />}
        </div>
      </div>
    </div>
  )
}

function HomePanel({ sellerId, at, onOpenOrder, onOpenOrders, onOpenContent }: { sellerId: SellerId; at: Moment; onOpenOrder: (id: OrderId) => void; onOpenOrders: () => void; onOpenContent: () => void }) {
  // The Seller's current Home is the Daily Operations Brief. The pre-publication Home is offered only where DEMO_DATA
  // records a Pre-publication Setup Snapshot: a historical replay that leaves the Seller's current state unchanged.
  const snapshot = prepublicationSnapshotFor(sellerId)
  const [mode, setMode] = useState<HomeMode>('active')
  const showing: HomeMode = snapshot ? mode : 'active'
  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-start justify-between">
        <div><h1 className="font-display text-3xl font-semibold text-text-primary">{showing === 'active' ? `${greeting(at)}, ${SELLERS[sellerId].name}` : 'Prepare your store for publication'}</h1><p className="mt-1 text-sm text-text-muted">{showing === 'active' ? `${formatWeekday(at.at)}, ${formatDate(at.at)} · Here is what needs attention today.` : 'Complete the required foundations before your store is published.'}</p></div>
        {snapshot && <Segmented options={[['pre-publication', 'Pre-publication'], ['active', 'Active Seller']]} active={showing} onChange={value => setMode(value as HomeMode)} />}
      </div>
      {showing === 'pre-publication' ? <PublicationReadiness /> : <DailyOperations sellerId={sellerId} at={at} onOpenOrder={onOpenOrder} onOpenOrders={onOpenOrders} onOpenContent={onOpenContent} />}
    </div>
  )
}

function PublicationReadiness() {
  // The pre-publication state is DEMO_DATA's historical setup snapshot of a Seller, labelled with its Seller and time.
  const ACTION: Record<string, string> = { 'Social-commerce eligibility': 'Review eligibility', 'Store setup': 'Review store setup', 'Fulfilment setup': 'Review fulfilment', 'First Product readiness': 'Review Product', 'Payment-provider readiness': 'View provider status' }
  const cards = prepublicationCards().map(card => ({ title: card.card, detail: card.detail.charAt(0).toUpperCase() + card.detail.slice(1), status: card.state === 'Complete' ? 'complete' : card.state === 'In progress' ? 'checking' : 'ready', state: card.state, action: ACTION[card.card] ?? 'Review' }))
  const complete = cards.filter(card => card.status === 'complete').length
  const percent = Math.round((complete / cards.length) * 100)
  const snapshot = VOLT_HOUSE_PREPUBLICATION
  return (
    <>
      <div className="mb-5 rounded-2xl border border-brand/20 bg-brand-muted p-5">
        <div className="flex items-center justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Publication Readiness Hub · Setup snapshot · {SELLERS[snapshot.seller].name} · {formatLongDate(snapshot.replay.at)}, {formatClock(snapshot.replay.at)}</div><div className="mt-1 font-display text-2xl font-semibold">{complete} of {cards.length} foundations complete</div></div><div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface font-mono text-sm font-bold text-brand">{percent}%</div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map(card => <ReadinessCard key={card.title} {...card} />)}
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-info/20 bg-info-bg p-4"><InfoIcon /><div><div className="text-sm font-semibold text-info">Launch requirement</div><div className="mt-1 text-xs leading-relaxed text-text-secondary">A Shoppable Post is not required to publish your Store. Your first Product, fulfilment setup, store profile and payment-provider readiness are required foundations.</div></div></div>
    </>
  )
}

function ReadinessCard({ title, detail, status, state, action }: { title: string; detail: string; status: string; state: string; action: string }) {
  const [opened, setOpened] = useState(false)
  return (
    <div className="flex min-h-52 flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${status === 'complete' ? 'bg-success-bg text-success' : status === 'checking' ? 'bg-warning-bg text-warning' : 'bg-surface-raised text-text-muted'}`}>{status === 'complete' ? <CheckIcon /> : status === 'checking' ? <ClockIcon /> : <DotIcon />}</span>{status === 'complete' && <StatusBadge status="completed" size="sm" customLabel={state} />}{status === 'checking' && <StatusBadge status="reconciling" size="sm" customLabel={state} />}{status === 'ready' && <StatusBadge status="ready" size="sm" customLabel={state} />}</div>
      <div className="mt-4 text-sm font-semibold">{title}</div><p className="mt-1 flex-1 text-xs leading-relaxed text-text-muted">{detail}</p>
      <button onClick={() => setOpened(true)} className="mt-4 text-left text-xs font-semibold text-brand">{opened ? 'Opened in prototype' : action} →</button>
    </div>
  )
}

function DailyOperations({ sellerId, at, onOpenOrder, onOpenOrders, onOpenContent }: { sellerId: SellerId; at: Moment; onOpenOrder: (id: OrderId) => void; onOpenOrders: () => void; onOpenContent: () => void }) {
  // The specification §29 priorities, counted from the Seller's records at the story moment. Deadlines are each
  // record's own demo timestamps, not Adulis-wide preparation or Claim policy.
  const orders = sellerOrders(sellerId, at)
  // Paid or Preparing: an Order requires preparation until it reaches its mode's Ready state. Most recently paid first.
  const toPrepare = ordersRequiringPreparationAt(sellerId, at).sort((a, b) => paidAt(b).localeCompare(paidAt(a)))
  const prepareBy = toPrepare.map(id => ORDERS[id].prepareBy).filter((d): d is string => !!d).sort()[0]
  const claims = sellerClaims(sellerId, at).filter(id => claimStateAt(id, at) !== 'Resolved')
  const dueClaim = claims.filter(id => CLAIMS[id].responseDeadline).sort((a, b) => CLAIMS[a].responseDeadline!.localeCompare(CLAIMS[b].responseDeadline!))[0]
  // Ready / Awaiting Fulfilment, in any mode; the detail names each Order's own state.
  const ready = orders.filter(id => bucketOf(orderStateAt(id, at)!) === 'ready')
  const awaiting = sellerThreads(sellerId, at).filter(({ id }) => awaitingSellerReplyAt(id, at))
  const stockRisks = sellerProductsAt(sellerId, at).filter(id => PRODUCTS[id].availability !== 'Available')
  const posts = postsNeedingAttentionAt(sellerId, at)
  const restricted = moderationIssuesAt(sellerId, at)
  // A delivery exception is a failed final handoff escalated to Handoff Manual Review.
  const exceptions = Object.values(HANDOFF_REVIEWS).filter(review => ORDERS[review.order].seller === sellerId && happenedBefore(review.escalated.at, at))
  const oldest = (time?: string) => (time ? `Oldest waiting ${formatAge(time, at.at)}` : '—')
  const priorities = [
    { rank: 1, label: 'Orders requiring preparation', count: toPrepare.length, detail: `${oldest(toPrepare.map(paidAt).sort()[0])}${prepareBy ? ` · prepare by ${dueLabel(prepareBy)}` : ''}`, tone: 'brand', action: () => onOpenOrders() },
    { rank: 2, label: 'Claims', count: claims.length, detail: dueClaim ? `${dueClaim} · response due ${dueLabel(CLAIMS[dueClaim].responseDeadline!)}` : '—', tone: 'danger' },
    { rank: 3, label: 'Orders ready for fulfilment', count: ready.length, detail: [...new Set(ready.map(id => orderStateAt(id, at)!))].join(' · ') || '—', tone: 'info' },
    { rank: 4, label: 'Delivery exceptions', count: exceptions.length, detail: exceptions.length ? 'Handoff manual review' : '—', tone: 'warning' },
    { rank: 5, label: 'Inventory risks', count: stockRisks.length, detail: stockRisks.map(id => PRODUCTS[id].name).join(' · ') || '—', tone: 'warning' },
    { rank: 6, label: 'Unanswered messages', count: awaiting.length, detail: oldest(awaiting.map(t => t.last.at).sort()[0]), tone: 'brand' },
    { rank: 7, label: 'Shoppable Posts needing action', count: posts.length, detail: posts.map(id => SHOPPABLE_POSTS[id].title).join(' · ') || '—', tone: 'warning', action: posts.length ? onOpenContent : undefined },
    { rank: 8, label: 'Moderation issues', count: restricted.length, detail: restricted.length ? `Restricted · ${restricted.map(id => SHOPPABLE_POSTS[id].title).join(' · ')}` : '—', tone: 'danger' },
  ]
  return (
    <div className="grid grid-cols-[1.45fr_1fr] gap-5">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between"><div><div className="font-display text-xl font-semibold">Daily Operations Brief</div><div className="text-xs text-text-muted">Ordered by operational priority</div></div><StatusBadge status="active" size="sm" customLabel={`${priorities.reduce((sum, item) => sum + item.count, 0)} open`} /></div>
        <div className="divide-y divide-border">
          {priorities.map(item => <div key={item.rank}><PriorityRow {...item} />{item.rank === 7 && posts.map(id => <PostNeedingAction key={id} postId={id} />)}</div>)}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between"><div className="font-semibold">Next Paid Orders</div><button onClick={onOpenOrders} className="text-xs font-semibold text-brand">View all</button></div>
          {toPrepare.slice(0, 3).map(id => <button key={id} onClick={() => onOpenOrder(id)} className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-b-0"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted font-mono text-[9px] font-bold text-brand-dark">{id.slice(-3)}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{orderItems(id)}</span><span className="text-[10px] text-text-muted">{shortName(BUYERS[ORDERS[id].buyer].name)} · {formatAge(paidAt(id), at.at)}</span></span><StatusBadge {...stateBadge(orderStateAt(id, at)!)} size="sm" /></button>)}
          {toPrepare.length === 0 && <p className="py-2 text-xs text-text-muted">No Orders requiring preparation.</p>}
        </div>
        <PerformanceCard sellerId={sellerId} />
      </div>
    </div>
  )
}

/** DEMO_DATA's "Needs attention" record for a post under Shoppable Posts needing action. The post stays published (rule 1.8). */
function PostNeedingAction({ postId }: { postId: ShoppablePostId }) {
  return (
    <div className="mb-3 ml-[52px] rounded-xl border border-warning/20 bg-warning-bg p-3">
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-warning">{POST_NEEDS_ATTENTION.title}</span><StatusBadge status="published" size="sm" /></div>
      <div className="mt-1 text-sm font-semibold">{SHOPPABLE_POSTS[postId].title} <span className="font-mono text-[10px] font-normal text-text-muted">{postId}</span></div>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">{POST_NEEDS_ATTENTION.message}</p>
    </div>
  )
}

function PriorityRow({ rank, label, count, detail, tone, action }: { rank: number; label: string; count: number; detail: string; tone: string; action?: () => void }) {
  const colors: Record<string, string> = { brand: 'bg-brand', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info' }
  return <button onClick={action} className="flex w-full items-center gap-3 py-3 text-left"><span className="w-5 font-mono text-[10px] text-text-muted">{String(rank).padStart(2, '0')}</span><span className={`h-2 w-2 rounded-full ${colors[tone]}`} /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-text-muted">{detail}</span></span><span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-surface-raised px-2 font-mono text-xs font-bold">{count}</span></button>
}

function PerformanceCard({ sellerId }: { sellerId: SellerId }) {
  // DEMO_DATA's 7-day Insights; it defines no on-time preparation rate.
  const insights = INSIGHTS_7D[sellerId]
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between"><div><div className="font-semibold">7-day performance</div><div className="text-xs text-text-muted">Paid Seller Orders only</div></div></div>
      <div className="mt-5 grid grid-cols-3 gap-3"><Metric label="Paid Orders" value={insights ? String(insights.paidOrders) : '—'} /><Metric label="GMV" value={insights ? formatEtb(insights.gmv) : '—'} /><Metric label="On-time prep" value="—" /></div>
      <div className="mt-4 flex h-16 items-end gap-2">{[38, 52, 44, 64, 50, 72, 80].map((height, index) => <span key={index} className="flex-1 rounded-t bg-brand-muted" style={{ height: `${height}%` }}><span className="block h-1/3 rounded-t bg-brand" /></span>)}</div>
    </div>
  )
}

function OrdersPanel({ sellerId, at, onOpenOrder }: { sellerId: SellerId; at: Moment; onOpenOrder: (id: OrderId) => void }) {
  const [bucket, setBucket] = useState<OrderBucket>('needs-action')
  const [demo, setDemo] = useState<DemoState>('data')
  // The Seller's DEMO_DATA Orders by state. The Completed count is the Seller's completed total, which includes
  // Orders DEMO_DATA doesn't record individually.
  const orders = sellerOrders(sellerId, at)
  const rows = orders.filter(id => bucketOf(orderStateAt(id, at)!) === bucket)
  const count = (key: OrderBucket) => (key === 'completed' ? sellerCompletedOrdersAt(sellerId, at) ?? 0 : orders.filter(id => bucketOf(orderStateAt(id, at)!) === key).length)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Seller Orders</h1><p className="mt-1 text-sm text-text-muted">Provider-verified Paid Orders and post-payment fulfilment.</p></div><Segmented options={[['data', 'Data'], ['loading', 'Loading'], ['empty', 'Empty'], ['conflict', 'Conflict'], ['stale', 'Stale']]} active={demo} onChange={value => setDemo(value as DemoState)} small /></div>
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-raised p-1">
        {BUCKETS.map(item => <button key={item.key} onClick={() => { setBucket(item.key); setDemo('data') }} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${bucket === item.key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{item.label}<span className={`rounded-full px-1.5 py-0.5 font-mono text-[9px] ${bucket === item.key ? 'bg-brand-muted text-brand-dark' : 'bg-border text-text-muted'}`}>{count(item.key)}</span></button>)}
      </div>
      {demo === 'loading' && <OrdersLoading />}
      {(demo === 'empty' || (demo !== 'loading' && rows.length === 0)) && <OrdersEmpty bucket={BUCKETS.find(item => item.key === bucket)!.label} />}
      {(demo === 'conflict' || demo === 'stale') && <StateBanner type={demo} onRefresh={() => setDemo('data')} />}
      {demo !== 'loading' && demo !== 'empty' && rows.length > 0 && <OrdersTable rows={rows} at={at} onOpenOrder={onOpenOrder} />}
    </div>
  )
}

function OrdersTable({ rows, at, onOpenOrder }: { rows: OrderId[]; at: Moment; onOpenOrder: (id: OrderId) => void }) {
  return (
    <div className="rtable rtable-scroll overflow-hidden rounded-2xl border border-border bg-surface" style={{ '--rtable-min': '720px' } as CSSProperties}>
      <div className="rtable-head grid grid-cols-[130px_1fr_160px_120px_110px_20px] gap-4 bg-surface-raised px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><span>Seller Order</span><span>Product / Buyer</span><span>Status</span><span>Total</span><span>Age</span><span /></div>
      {rows.map(id => <button key={id} onClick={() => onOpenOrder(id)} className="rtable-row grid w-full grid-cols-[130px_1fr_160px_120px_110px_20px] items-center gap-4 border-t border-border px-5 py-4 text-left hover:bg-surface-raised"><span className="rtable-primary font-mono text-xs font-semibold">{id}</span><span data-label="Product / Buyer"><span className="block text-sm font-semibold">{orderItems(id)}</span><span className="text-xs text-text-muted">{shortName(BUYERS[ORDERS[id].buyer].name)}</span></span><span data-label="Status"><StatusBadge {...stateBadge(orderStateAt(id, at)!)} size="sm" />{prepareByLabel(id, at) && <span className="mt-1 block text-[10px] text-text-muted">{prepareByLabel(id, at)}</span>}</span><span data-label="Total" className="text-sm font-semibold">{formatEtb(orderTotals(id).total)}</span><span data-label="Age" className="text-xs text-text-muted">{formatAge(paidAt(id), at.at)}</span><span className="rtable-end">›</span></button>)}
    </div>
  )
}

function OrderDetail({ orderId, at, courierChanges, onBack }: { orderId: OrderId; at: Moment; courierChanges: CourierChanges; onBack: () => void }) {
  // The Order's mode-specific timeline (rules 4.4–4.7) at the story moment. The prototype controls step through the
  // states the Seller reaches by its own actions, each named as the Order's own fulfilment mode names it: for a Courier
  // Delivery Order Paid, Preparing and Ready for Courier, never Courier Assigned, which only the Courier's acceptance
  // gives (rule 6.10); for the other modes, their first four states.
  const order = ORDERS[orderId]
  const timeline = ORDER_TIMELINES[order.fulfilment]
  const courierMode = order.fulfilment === 'Courier Delivery'
  const controls = timeline.slice(0, courierMode ? 3 : 4)
  const canonical = Math.max(0, timeline.indexOf(orderStateAt(orderId, at) ?? 'Paid'))
  const [override, setOverride] = useState<number | null>(null)
  const current = override ?? canonical
  const state = timeline[current]
  const control = Math.min(current, controls.length - 1)
  const [chatOpen, setChatOpen] = useState(false)
  // The Delivery Offer (rules 6.10–6.11, 6.3, 6.8): at DEMO_DATA's moments the shared module's, awaiting the Courier's
  // acceptance until it comes; one the Seller sends in this session at another moment is transient prototype state that
  // stays awaiting. Nothing here accepts it on the Courier's behalf: only the Courier's acceptance makes the Order
  // Courier Assigned, and an offer is sent only once the Order is Ready for Courier (rule 6.11).
  const [offerTo, setOfferTo] = useState<CourierId | null>(null)
  const [choice, setChoice] = useState<CourierId | null>(null)
  const selectionRef = useRef<HTMLDivElement>(null)
  // The Seller's approved Couriers (PR-008), with this session's relationship changes: who can receive the offer now
  // first, then the approved Couriers who can't, each with why. Applicants, invitations and suspended or removed
  // relationships aren't approved, so they aren't offered here.
  const pool = courierMode ? COURIER_RELATIONSHIPS.filter(r => r.seller === order.seller).map(r => courierCardAt(order.seller, r.courier, at, courierChanges[courierKey(order.seller, r.courier)])).filter(card => card.status === 'Approved').sort(courierListOrder) : []
  const chosen = pool.find(card => card.courier === offerTo)
  const recorded = courierMode && override === null ? deliveryOfferAt(orderId, at) : undefined
  // The Order's Courier compensation is the Buyer-paid Courier Delivery charge, fixed at Checkout: every Courier is offered
  // this amount, whoever is chosen (specification §52).
  const compensation = courierMode ? orderCourierCompensation(orderId) : undefined
  const offer = recorded ?? (courierMode && current === 2 && chosen ? { courier: chosen.courier, compensation, busy: chosen.availability === 'Busy' } : undefined)
  const step = (index: number) => { setOverride(index); if (index < 2) { setOfferTo(null); setChoice(null) } }
  const toSelection = () => (selectionRef.current?.querySelector<HTMLElement>('[role="radio"]') ?? selectionRef.current)?.focus()
  const buyer = BUYERS[order.buyer]
  const totals = orderTotals(orderId)
  const paid = paidAt(orderId)
  const preparation = preparationAt(orderId, at)
  const happened = (s: OrderState) => current >= timeline.indexOf(s) && timeline.includes(s)
  const claim = claimsForOrder(orderId).find(id => claimStateAt(id, at) !== null)
  const conversation = CONVERSATION_IDS.find(id => CONVERSATIONS[id].seller === order.seller && CONVERSATIONS[id].buyer === order.buyer)
  const lastBuyerMessage = conversation && messagesAt(conversation, at).filter(m => m.from === 'buyer').pop()
  const location = (evidence?: { location?: string }) => (evidence?.location ? `Location ${evidence.location}` : '—')
  const verified = (evidence?: { method: string }) => (!evidence ? 'Not available' : evidence.method === 'Not verified' ? 'Not verified' : `${evidence.method} verified`)
  const collection = order.fulfilment === 'Buyer Collection'
  return (
    <div className="mx-auto max-w-7xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Orders</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{orderId}</h1><StatusBadge {...stateBadge(state)} /></div><p className="mt-1 text-sm text-text-muted">Seller Order · Created after provider-verified payment</p></div><div className="flex gap-2"><Button variant="tertiary" onClick={() => setChatOpen(!chatOpen)}>Chat with Buyer</Button>{current === 0 && <Button onClick={() => setOverride(1)}>Start Preparation</Button>}{current === 1 && <Button onClick={() => setOverride(2)}>Mark Ready</Button>}{current === 2 && courierMode && !offer && <Button onClick={toSelection}>Select Courier</Button>}</div></div>

      <div className="grid grid-cols-[1.45fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <DetailCard title="Order and Buyer">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4"><Field label="Seller Order reference" value={orderId} /><Field label="Buyer-safe identity" value={`${shortName(buyer.name)} · ${buyer.deliveryArea ?? '—'}, ${MARKET.city}`} /><Field label="Fulfilment" value={order.fulfilment} /><Field label="Total" value={formatEtb(totals.total)} /><Field label="Prepare by" value={preparation ? `${formatDate(preparation.due)} · ${formatClock(preparation.due)}${preparation.ready ? ` · ${preparation.met ? 'met' : 'missed'}: ${preparation.ready.state} ${formatClock(preparation.ready.at)}` : ''}` : '—'} />{order.fulfilment === 'Seller Delivery' && <Field label="Delivery detail" value={[buyer.deliveryDetail, buyer.phoneMasked?.replace(/ /g, '\u00a0')].filter(Boolean).join(' · ') || '—'} />}</div>
          </DetailCard>
          <DetailCard title="Provider-verified payment" trailing={<StatusBadge status="paid" customLabel="Paid · read-only" />}>
            <div className="grid grid-cols-3 gap-4"><Field label="Provider reference" value={paymentReference(orderId)} /><Field label="Confirmed" value={`${formatDate(paid)} · ${formatClock(paid)}`} /><Field label="Payment authority" value="Provider + Adulis backend" /></div>
            <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Payment truth is read-only. Seller actions cannot confirm, accept, reverse, or otherwise establish Paid status.</div>
          </DetailCard>
          <DetailCard title="Products">
            {order.lines.map(line => <div key={line.product} className="flex items-center gap-4"><div className="h-20 w-16 rounded-xl bg-brand-muted" /><div className="flex-1"><div className="font-semibold">{PRODUCTS[line.product].name}</div><div className="mt-1 text-xs text-text-muted">{lineOptions(line)} · Quantity {line.quantity}</div><div className="mt-2 text-sm font-semibold">{formatEtb(PRODUCTS[line.product].price)}</div></div></div>)}
            <div className="mt-4 border-t border-border pt-3"><PriceRow label="Products" value={formatEtb(totals.products)} /><PriceRow label={order.fulfilment} value={formatEtb(totals.delivery)} /><PriceRow label="Adulis surcharge — 0.5%" value={formatEtb(totals.surcharge)} /><PriceRow label="Total" value={formatEtb(totals.total)} strong /></div>
          </DetailCard>
          <DetailCard title="Fulfilment evidence">
            {/* Courier assignment, pickup and location checkpoints belong to Courier Delivery only (rules 4.7, 9.6). */}
            {courierMode ? (<>
              {/* At Ready for Courier: the Seller selects one of its approved Couriers and sends the Delivery Offer, then
                  waits for the Courier's acceptance (rules 6.10, 6.3, 6.8; WO-008's card: completed for this Seller first). */}
              {current === 2 && (offer ? (
                <div role="status" className="mb-4 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Delivery Offer sent to {COURIERS[offer.courier].name}</span><StatusBadge status="pending" customLabel="Awaiting Courier acceptance" size="sm" /></div>
                  <div className="mt-1 text-xs text-text-muted">{offer.compensation === undefined ? 'Compensation —' : `${formatEtb(offer.compensation)} for this delivery`}{recorded ? ` · sent ${formatClock(recorded.offered)}` : ''}</div>
                  <p className="mt-2 text-xs leading-relaxed text-text-secondary">{offer.busy ? `${COURIERS[offer.courier].name} is on an active delivery and can accept once it is complete.` : `${COURIERS[offer.courier].name} accepts or declines in the Courier app.`} The Order stays Ready for Courier until the Courier accepts.</p>
                </div>
              ) : (
                <div ref={selectionRef} tabIndex={-1} className="mb-4 rounded-xl border border-border p-4">
                  <div className="text-sm font-semibold">Send a Delivery Offer</div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">Choose one of {SELLERS[order.seller].name}'s approved Couriers. The Courier accepts or declines; the Order is Courier Assigned only when they accept.</p>
                  <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-surface-raised p-3"><span className="text-xs font-semibold">Courier compensation for this Order</span><span className="text-sm font-bold">{compensation === undefined ? '—' : formatEtb(compensation)}</span><span className="w-full text-xs text-text-muted">The Courier Delivery charge the Buyer paid. It’s the same whichever Courier you choose.</span></div>
                  {pool.length > 0 && <p className="mt-2 text-xs text-text-secondary">{pool.filter(card => card.selectable).length} of {pool.length} approved Couriers are available for a Delivery Offer now.</p>}
                  {pool.length ? <div role="radiogroup" aria-label="Approved Couriers" className="mt-3 flex flex-col gap-2">{pool.map(card => (
                    <button key={card.courier} role="radio" aria-checked={choice === card.courier} disabled={!card.selectable} onClick={() => setChoice(card.courier)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:bg-surface-raised ${choice === card.courier ? 'border-brand bg-brand-muted' : 'border-border'}`}>
                      <AvatarText name={card.name} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{card.name}</span><AvailabilityStatus availability={card.availability} className="text-xs font-semibold" /></span>
                        <CourierFacts card={card} sellerId={order.seller} />
                        {card.note && <span className="mt-1.5 block text-xs font-semibold text-text-secondary">Can’t receive this offer · {card.note}</span>}
                      </span>
                    </button>
                  ))}</div> : <div className="mt-3 rounded-xl bg-surface-raised p-3 text-xs text-text-muted">No approved Couriers yet. Approve a Courier in Couriers to send a Delivery Offer.</div>}
                  <div className="mt-3"><Button disabled={!choice || !pool.find(card => card.courier === choice)?.selectable} onClick={() => choice && setOfferTo(choice)}>Send Delivery Offer</Button></div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <Evidence title="Preparation" status={control === 0 ? 'Not started' : control === 1 ? 'In progress' : 'Ready'} detail="Seller preparation checklist" />
                <Evidence title="Courier assignment" status={happened('Courier Assigned') && order.courier ? `${COURIERS[order.courier].name} accepted${stateTime(orderId, 'Courier Assigned') ? ` ${formatClock(stateTime(orderId, 'Courier Assigned')!)}` : ''}` : offer ? 'Awaiting Courier acceptance' : current === 2 ? 'Select an approved Courier' : 'After Mark Ready'} detail="Approved Seller Courier Pool" />
                <Evidence title="Pickup evidence" status={happened('Pickup Verified') ? verified(order.pickup) : 'Not available'} detail="Seller Pickup QR scan appears here" />
                <Evidence title="Delivery evidence" status={happened('Completed') ? verified(order.finalHandoff) : 'Not available'} detail="Recipient Delivery QR scan appears here" />
                <Evidence title="Pickup checkpoint" status={happened('Pickup Verified') ? location(order.pickup) : 'Pending'} detail="Location recorded or unavailable" />
                <Evidence title="Delivery checkpoint" status={happened('Completed') ? location(order.finalHandoff) : 'Pending'} detail="Location recorded or unavailable" />
              </div>
            </>) : (
              <div className="grid grid-cols-2 gap-3">
                <Evidence title="Preparation" status={control === 0 ? 'Not started' : control === 1 ? 'In progress' : 'Ready'} detail="Seller preparation checklist" />
                <Evidence title={collection ? 'Collection evidence' : 'Delivery evidence'} status={happened('Completed') ? verified(order.finalHandoff) : 'Not available'} detail={collection ? 'Buyer scans your Collection QR' : 'Buyer scans your Delivery QR'} />
              </div>
            )}
            <div className="mt-3 text-xs text-text-muted">{courierMode ? 'Checkpoint evidence is limited to pickup and delivery. No continuous GPS or live map is available.' : 'QR is the primary handoff method and OTP the fallback. Location checkpoints apply to Courier Delivery only.'}</div>
          </DetailCard>
        </div>
        <div className="flex flex-col gap-5">
          <DetailCard title="Timeline"><OrderTimeline events={timelineEvents(orderId, current, at)} /></DetailCard>
          <DetailCard title="Claim">
            {claim
              ? <div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">{claim} · {CLAIMS[claim].issue}</span><span className="text-xs text-text-muted">Claims linked to this Seller Order appear here.</span></span><StatusBadge status={CLAIM_BADGE[claimStateAt(claim, at)!]} size="sm" /></div>
              : <div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">No active claim</span><span className="text-xs text-text-muted">Claims linked to this Seller Order appear here.</span></span><StatusBadge status="resolved" size="sm" customLabel="None" /></div>}
          </DetailCard>
          {chatOpen && <DetailCard title="Buyer chat"><div className="rounded-xl bg-surface-raised p-3 text-sm">{lastBuyerMessage ? `${shortName(buyer.name)}: ${lastBuyerMessage.text}` : '—'}</div><div className="mt-3 rounded-xl bg-warning-bg p-3 text-xs text-text-secondary">Chat supports coordination but does not establish payment, pickup, delivery, or claim truth.</div></DetailCard>}
          <DetailCard title="State controls"><div className="text-xs text-text-muted">Prototype fulfilment state</div><div className="mt-3 flex flex-wrap gap-2">{controls.map((value, index) => <button key={value} onClick={() => step(index)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${control === index ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border text-text-muted'}`}>{value}</button>)}</div></DetailCard>
        </div>
      </div>
    </div>
  )
}

/** The Order's mode-specific states up to `current`, with DEMO_DATA's times for those reached by the story moment. */
function timelineEvents(orderId: OrderId, current: number, at: Moment): TimelineEvent[] {
  return ORDER_TIMELINES[ORDERS[orderId].fulfilment].map((state, index) => {
    const time = stateTime(orderId, state)
    return {
      id: state,
      label: state,
      timestamp: time && index <= current && happenedBefore(time, at) ? formatClock(time) : undefined,
      status: index < current || (index === current && state === 'Completed') ? 'completed' : index === current ? 'active' : 'pending',
      detail: state === 'Paid' ? 'Read-only payment state' : undefined,
    }
  })
}

type ProductScreen = 'list' | 'detail' | 'editor'
type ContentScreen = 'list' | 'detail' | 'editor'
type ContentBucket = 'drafts' | 'published' | 'restricted'

/** The number of variant combinations a Product offers. */
function variantCount(id: ProductId) {
  return PRODUCTS[id].variants.reduce((count, group) => count * group.options.length, 1)
}

/** 'Out of Stock since 24 Sep': the Product's availability, with the date it sold out where DEMO_DATA records one. */
function availabilityLabel(id: ProductId) {
  const since = PRODUCTS[id].outOfStockSince
  return `${PRODUCTS[id].availability}${since ? ` since ${formatDayMonth(since)}` : ''}`
}

/** The Product's active demo discount (percent, discounted price and end date), or undefined. */
function discountLabel(id: ProductId) {
  const discount = activeDiscount(id)
  return discount && `${discount.percent}% · ${formatEtb(discount.price)} ${discount.ends ? `until ${formatDate(discount.ends)}` : '· no end date'}`
}

function ProductsPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const [screen, setScreen] = useState<ProductScreen>('list')
  const [selectedId, setSelectedId] = useState<ProductId | null>(sellerProductsAt(sellerId, at)[0] ?? null)
  const openProduct = (id: ProductId) => { setSelectedId(id); setScreen('detail') }
  if (screen === 'detail' && selectedId) return <ProductDetailPanel sellerId={sellerId} at={at} productId={selectedId} onBack={() => setScreen('list')} onEdit={() => setScreen('editor')} />
  if (screen === 'editor') return <ProductEditor sellerId={sellerId} at={at} productId={selectedId} onBack={() => setScreen(selectedId ? 'detail' : 'list')} />
  return <ProductsList sellerId={sellerId} at={at} onOpen={openProduct} onCreate={() => { setSelectedId(null); setScreen('editor') }} />
}

function ProductsList({ sellerId, at, onOpen, onCreate }: { sellerId: SellerId; at: Moment; onOpen: (id: ProductId) => void; onCreate: () => void }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  // The Seller's Products at the story moment; every DEMO_DATA Product is published. The Performance summary is
  // DEMO_DATA's 7-day figures (specification §31); no figure is computed here.
  const rows = sellerProductsAt(sellerId, at).filter(id => (status === 'all' || status === 'published') && PRODUCTS[id].name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Products</h1><p className="mt-1 text-sm text-text-muted">Manage canonical Products and their single-Product commerce posts.</p></div><Button onClick={onCreate}>Create Product</Button></div>
      <div className="mb-5 flex items-center gap-3"><div className="w-80"><SearchInput value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} placeholder="Search Products" /></div><Segmented options={[['all', 'All'], ['published', 'Published'], ['draft', 'Drafts']]} active={status} onChange={setStatus} small /></div>
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border border-border bg-surface" style={{ '--rtable-min': '780px' } as CSSProperties}>
        <div className="rtable-head grid grid-cols-[72px_1.5fr_1fr_120px_130px_100px_90px_20px] gap-4 bg-surface-raised px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted"><span>Media</span><span>Product</span><span>Performance</span><span>Price</span><span>Inventory</span><span>Variants</span><span>Status</span><span /></div>
        {rows.map((id, index) => {
          const performance = PRODUCT_PERFORMANCE_7D[id]
          const discount = activeDiscount(id)
          return <button key={id} onClick={() => onOpen(id)} className="rtable-row grid w-full grid-cols-[72px_1.5fr_1fr_120px_130px_100px_90px_20px] items-center gap-4 border-t border-border px-5 py-4 text-left hover:bg-surface-raised"><ProductThumb index={index} className="rtable-media" /><span className="rtable-primary"><span className="block text-sm font-semibold">{PRODUCTS[id].name}</span><span className="font-mono text-[10px] text-text-muted">{id}</span></span>{performance ? <span data-label="Performance"><span className="block text-xs font-semibold">{formatEtb(performance.gmv)}</span><span className="text-[10px] text-text-muted"><span className="whitespace-nowrap">{performance.views.toLocaleString('en-US')} views</span> · <span className="whitespace-nowrap">{performance.unitsSold} sold</span></span></span> : <span data-label="Performance" className="text-xs text-text-secondary">—</span>}<span data-label="Price"><span className="block text-sm font-semibold">{formatEtb(currentPrice(id))}</span>{discount && <span className="text-[10px] text-text-muted"><s>{formatEtb(PRODUCTS[id].price)}</s> · {discount.percent}% off</span>}</span><span data-label="Inventory"><span className={PRODUCTS[id].availability !== 'Available' ? 'block text-xs font-semibold text-warning' : 'block text-xs text-text-secondary'}>{PRODUCTS[id].stock} available</span><span className="text-[10px] text-text-muted">{availabilityLabel(id)}</span></span><span data-label="Variants" className="text-xs text-text-secondary">{variantCount(id)}</span><span className="rtable-cell" data-label="Status"><StatusBadge status="published" size="sm" /></span><span className="rtable-end">›</span></button>
        })}
        {rows.length === 0 && <div className="border-t border-border px-5 py-8 text-center text-sm text-text-muted">No Products in this view</div>}
      </div>
      {/* The 7-day window ends at the default snapshot, 10:25 on the story day. */}
      <p className="mt-3 text-[10px] text-text-muted">Performance covers product views, units sold and GMV over the 7 days to {formatDayMonth(DEFAULT_SNAPSHOT.at)} {formatClock(DEFAULT_SNAPSHOT.at)}. GMV counts each unit at the price paid; a current discount applies only to new Orders.</p>
      <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Each Product Post represents exactly one Product. Product Posts are commerce detail surfaces and are never For You feed units.</div>
    </div>
  )
}

function ProductDetailPanel({ sellerId, at, productId, onBack, onEdit }: { sellerId: SellerId; at: Moment; productId: ProductId; onBack: () => void; onEdit: () => void }) {
  // DEMO_DATA gives Products unlabelled attributes, no category, no inventory policy and no demo embed.
  const product = PRODUCTS[productId]
  const quality = productQualityAt(productId, at)
  const discount = discountLabel(productId)
  return (
    <div className="mx-auto max-w-6xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Products</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{product.name}</h1><StatusBadge status="published" /></div><p className="mt-1 font-mono text-xs text-text-muted">{productId} · Product Post</p></div><div className="flex gap-2"><Button variant="tertiary">Preview</Button><Button onClick={onEdit}>Edit Product</Button></div></div>
      <div className="grid grid-cols-[1.2fr_1fr] gap-5">
        <div className="flex flex-col gap-5">
          <DetailCard title="Media"><div className="grid grid-cols-3 gap-3"><ProductMedia large /><ProductMedia /><ProductMedia muted /></div></DetailCard>
          <DetailCard title="Product information"><div className="grid grid-cols-2 gap-5"><Field label="Name" value={product.name} /><Field label="Category" value="—" /><Field label="Description" value={product.description ?? '—'} /><Field label="Fulfilment" value={fulfilmentOptionsAt(sellerId, at).map(option => option.mode).join(' · ') || '—'} /><Field label="Product Quality" value={quality ? `${quality.average} (${quality.ratings} rating${quality.ratings === 1 ? '' : 's'})` : quality === null ? 'No ratings yet' : '—'} /><Field label="Locally made" value={product.locallyMade ? 'Yes' : 'No'} /></div></DetailCard>
          <DetailCard title="Structured attributes"><div className="grid grid-cols-3 gap-4">{(product.attributes.length ? product.attributes : ['—']).map(attribute => <Field key={attribute} label="—" value={attribute} />)}</div></DetailCard>
        </div>
        <div className="flex flex-col gap-5">
          <DetailCard title="Price and inventory"><InfoGrid rows={[[discount ? 'Regular price' : 'Price', formatEtb(product.price)], ...(discount ? [['Active discount', discount] as [string, string]] : []), ['Inventory', `${product.stock} available`], ['Inventory policy', '—'], ['Availability', availabilityLabel(productId)]]} /></DetailCard>
          <DetailCard title="Variants"><VariantTable productId={productId} /></DetailCard>
          <DetailCard title="Product demo embed"><InfoGrid rows={[['Configuration', '—'], ['Provider', '—'], ['Placement', '—']]} /></DetailCard>
          <DetailCard title="Concept boundary"><p className="text-sm leading-relaxed text-text-secondary">This Product Post contains exactly one canonical Product and its commerce information. It is not a Shoppable Post and cannot be used as a top-level For You unit.</p></DetailCard>
        </div>
      </div>
    </div>
  )
}

function ProductEditor({ sellerId, at, productId, onBack }: { sellerId: SellerId; at: Moment; productId: ProductId | null; onBack: () => void }) {
  // An existing Product opens with its DEMO_DATA values; DEMO_DATA has no category, labelled attributes or demo media.
  const existing = productId ? PRODUCTS[productId] : undefined
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price / 100) : '')
  const [inventory, setInventory] = useState(existing ? String(existing.stock) : '')
  const [demoEmbed, setDemoEmbed] = useState(false)
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const [mediaCount, setMediaCount] = useState(existing ? 3 : 1)
  const offered = fulfilmentOptionsAt(sellerId, at).map(option => option.mode)
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
          <EditorSection step="03" title="Structured attributes"><div className="grid grid-cols-3 gap-4"><TextInput label="Material" defaultValue="" /><TextInput label="Made in" defaultValue="" /><TextInput label="Care" defaultValue="" /></div></EditorSection>
          <EditorSection step="04" title="Variants"><VariantEditor productId={productId} /></EditorSection>
          <EditorSection step="05" title="Price and inventory"><div className="grid grid-cols-3 gap-4"><TextInput label="Price (ETB)" value={price} onChange={event => setPrice(event.target.value)} placeholder="0" /><TextInput label="Available inventory" value={inventory} onChange={event => setInventory(event.target.value)} placeholder="0" /><TextInput label="Inventory policy" defaultValue="" /></div></EditorSection>
          <EditorSection step="06" title="Fulfilment"><div className="flex gap-3"><CheckOption label="Buyer Collection" checked={offered.includes('Buyer Collection')} /><CheckOption label="Seller Delivery" checked={offered.includes('Seller Delivery')} /><CheckOption label="Courier Delivery" checked={offered.includes('Courier Delivery')} /></div></EditorSection>
          <EditorSection step="07" title="Product demo embed">
            <div className="flex items-start justify-between"><div><div className="text-sm font-semibold">Demo media</div><div className="text-xs text-text-muted">Optional embed shown in this Product Post gallery.</div></div><Toggle label="Demo media" checked={demoEmbed} onChange={() => setDemoEmbed(!demoEmbed)} /></div>
            {demoEmbed && <div className="mt-4"><TextInput label="Demo URL" defaultValue="" hint="Supported provider embeds are rendered in the Product Post." /></div>}
          </EditorSection>
        </div>
        {preview && <ProductPreview name={name || 'Untitled Product'} category={category || 'Category'} price={price ? `ETB ${price}` : 'Price not set'} description={description} />}
      </div>
    </div>
  )
}

/** A Shoppable Post's publication at the story moment: Draft, Published, or Restricted after a moderation action. */
function publicationOf(postId: ShoppablePostId, at: Moment) {
  return SHOPPABLE_POSTS[postId].publication === 'Draft' ? 'draft' : restrictionAt(postId, at) ? 'restricted' : 'published'
}

function ContentPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { focus } = useStory()
  const [screen, setScreen] = useState<ContentScreen>('list')
  const [selectedPost, setSelectedPost] = useState<ShoppablePostId | undefined>(sellerPostsAt(sellerId, at).find(id => publicationOf(id, at) === 'published'))
  if (screen === 'detail' && selectedPost) return <ShoppablePostDetail sellerId={sellerId} at={at} postId={selectedPost} onBack={() => setScreen('list')} onEdit={() => setScreen('editor')} />
  if (screen === 'editor') return <ShoppablePostEditor sellerId={sellerId} at={at} initialProduct={focus?.product} onBack={() => setScreen('list')} />
  return <ShoppablePostsList sellerId={sellerId} at={at} onOpen={id => { setSelectedPost(id); setScreen('detail') }} onCreate={() => setScreen('editor')} />
}

function ShoppablePostsList({ sellerId, at, onOpen, onCreate }: { sellerId: SellerId; at: Moment; onOpen: (id: ShoppablePostId) => void; onCreate: () => void }) {
  const [bucket, setBucket] = useState<ContentBucket>('published')
  // The Seller's Shoppable Posts at the story moment, by publication; For You eligibility is derived (rules 1.7–1.8).
  const all = sellerPostsAt(sellerId, at)
  const inBucket = (key: ContentBucket) => all.filter(id => publicationOf(id, at) === { drafts: 'draft', published: 'published', restricted: 'restricted' }[key])
  const posts = inBucket(bucket)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Shoppable Posts</h1><p className="mt-1 text-sm text-text-muted">Image-led content with optional same-Seller Product tags and hotspots.</p></div><Button onClick={onCreate}>Create Shoppable Post</Button></div>
      <div className="mb-5 flex gap-2"><Pill active={bucket === 'drafts'} onClick={() => setBucket('drafts')}>Drafts · {inBucket('drafts').length}</Pill><Pill active={bucket === 'published'} onClick={() => setBucket('published')}>Published · {inBucket('published').length}</Pill><Pill active={bucket === 'restricted'} onClick={() => setBucket('restricted')}>Restricted / Removed · {inBucket('restricted').length}</Pill></div>
      <div className="grid grid-cols-3 gap-4">
        {posts.map((id, index) => <button key={id} onClick={() => onOpen(id)} className="overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-sm"><ContentMedia index={index} /><div className="p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-text-muted">{id}</span><StatusBadge status={publicationOf(id, at)} size="sm" /></div><p className="mt-3 line-clamp-2 text-sm font-semibold">{SHOPPABLE_POSTS[id].caption}</p><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span><span className="block text-xs text-text-secondary">{SHOPPABLE_POSTS[id].tags.length ? `${SHOPPABLE_POSTS[id].tags.length} tagged Product${SHOPPABLE_POSTS[id].tags.length === 1 ? '' : 's'}` : 'No Product tags'}</span><span className="text-[10px] text-text-muted">{SHOPPABLE_POSTS[id].hotspots ? `${SHOPPABLE_POSTS[id].hotspots} hotspot${SHOPPABLE_POSTS[id].hotspots === 1 ? '' : 's'}` : 'No hotspots'}</span></span><EligibilityBadge eligible={isForYouEligibleAt(id, at)} /></div></div></button>)}
        {posts.length === 0 && <div className="col-span-3 rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-text-muted">No Shoppable Posts in this list</div>}
      </div>
      <div className="mt-5 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Publication and For You eligibility are separate states. A Shoppable Post can be Published with zero Products and remain ineligible for For You.</div>
    </div>
  )
}

function ShoppablePostDetail({ sellerId, at, postId, onBack, onEdit }: { sellerId: SellerId; at: Moment; postId: ShoppablePostId; onBack: () => void; onEdit: () => void }) {
  const post = SHOPPABLE_POSTS[postId]
  const zeroProduct = post.tags.length === 0
  const publication = publicationOf(postId, at)
  const eligible = isForYouEligibleAt(postId, at)
  return (
    <div className="mx-auto max-w-6xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Shoppable Posts</button>
      <div className="mb-6 flex items-start justify-between"><div><div className="flex items-center gap-3"><h1 className="font-display text-3xl font-semibold">{postId}</h1><StatusBadge status={publication} /><EligibilityBadge eligible={eligible} /></div><p className="mt-1 text-sm text-text-muted">Shoppable Post · {SELLERS[sellerId].name}</p></div><div className="flex gap-2"><Button variant="tertiary">Preview</Button><Button onClick={onEdit}>Edit Post</Button></div></div>
      <div className="grid grid-cols-[1fr_1fr] gap-5">
        <DetailCard title="Media and hotspots"><div className="relative"><ContentMedia index={zeroProduct ? 1 : 0} large />{!zeroProduct && <><span className="absolute left-[42%] top-[35%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span><span className="absolute right-[20%] top-[58%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span></>}</div></DetailCard>
        <div className="flex flex-col gap-5">
          <DetailCard title="Caption"><p className="text-sm leading-relaxed text-text-secondary">{post.caption}</p></DetailCard>
          <DetailCard title="Product selection">{zeroProduct ? <div><div className="text-sm font-semibold">No Products selected</div><p className="mt-1 text-xs text-text-muted">This is valid and does not block publication.</p></div> : <div className="space-y-2">{post.tags.map(id => <SelectedProduct key={id} name={PRODUCTS[id].name} />)}</div>}</DetailCard>
          <DetailCard title="Distribution"><div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">Publication</span><span className="text-xs text-text-muted">{publication === 'published' ? 'Visible on Store and direct links' : publication === 'draft' ? 'Not yet published' : 'Restricted from public surfaces'}</span></span><StatusBadge status={publication} /></div><div className="mt-4 flex items-center justify-between border-t border-border pt-4"><span><span className="block text-sm font-semibold">For You eligibility</span><span className="text-xs text-text-muted">{eligible ? 'Eligible as a Shoppable Post' : zeroProduct ? 'Requires at least one Product tag' : 'Not currently eligible'}</span></span><EligibilityBadge eligible={eligible} /></div></DetailCard>
        </div>
      </div>
    </div>
  )
}

function ShoppablePostEditor({ sellerId, at, initialProduct, onBack }: { sellerId: SellerId; at: Moment; initialProduct?: ProductId; onBack: () => void }) {
  // Any of the Seller's Products can be tagged (rule 1.5); the step's Product, else the first, starts selected.
  const products = sellerProductsAt(sellerId, at)
  const [caption, setCaption] = useState('')
  const [selected, setSelected] = useState<ProductId[]>(() => { const first = initialProduct && products.includes(initialProduct) ? initialProduct : products[0]; return first ? [first] : [] })
  const [hotspots, setHotspots] = useState(true)
  const [preview, setPreview] = useState(false)
  const [published, setPublished] = useState(false)
  const toggleProduct = (id: ProductId) => setSelected(values => values.includes(id) ? values.filter(value => value !== id) : [...values, id])
  const seller = SELLERS[sellerId].name
  // Hotspots need a selected Product; For You eligibility needs a selected Product that is available now. One result
  // drives the eligibility step, the Preview and the publish confirmation, so they can't disagree.
  const tagged = selected.length > 0
  const eligibility = editorEligibility(selected, at)
  const eligible = eligibility === 'eligible'
  return (
    <div className="mx-auto max-w-7xl p-8">
      <button onClick={onBack} className="mb-5 text-sm font-semibold text-brand">← Back to Shoppable Posts</button>
      <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">Create Shoppable Post</h1><p className="mt-1 text-sm text-text-muted">Product selection and hotspots are optional.</p></div><div className="flex gap-2"><Button variant="tertiary" onClick={() => setPreview(!preview)}>{preview ? 'Close Preview' : 'Preview'}</Button><Button onClick={() => setPublished(true)}>Publish</Button></div></div>
      {published && <div className="mb-5 rounded-xl border border-success/20 bg-success-bg p-4"><div className="flex items-center gap-3"><CheckIcon /><div className="min-w-60 flex-1"><div className="text-sm font-semibold text-success">Shoppable Post published</div><div className="mt-1 text-xs text-text-secondary">{eligibility === 'eligible' ? 'Published · FYP Eligible' : eligibility === 'unavailable' ? NOT_ELIGIBLE.publication : 'Published · Not eligible for For You because no Products are tagged.'}</div>{eligibility === 'unavailable' && <div className="mt-1 text-xs text-text-secondary">{NOT_ELIGIBLE.sentence}</div>}</div><div className="flex items-center gap-3"><StatusBadge status="published" /><EligibilityBadge eligible={eligible} /></div></div></div>}
      <div className={`grid gap-5 ${preview ? 'grid-cols-[1.25fr_.75fr]' : 'grid-cols-1'}`}>
        <div className="flex flex-col gap-5">
          <EditorSection step="01" title="Media"><div className="grid grid-cols-[220px_1fr] gap-4"><ContentMedia index={0} large /><button className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised text-sm font-semibold text-text-muted">Replace media</button></div></EditorSection>
          <EditorSection step="02" title="Caption"><Textarea label="Caption" value={caption} onChange={event => setCaption(event.target.value)} placeholder="Tell the story behind this post..." rows={4} /></EditorSection>
          <EditorSection step="03" title="Optional Product selection">
            <div className="mb-3 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Only Products owned by {seller} can be tagged. Leave every Product unselected to publish a zero-product post.</div>
            <div className="grid grid-cols-3 gap-3">{products.map((id, index) => <button key={id} onClick={() => toggleProduct(id)} className={`rounded-xl border p-3 text-left ${selected.includes(id) ? 'border-brand bg-brand-muted' : 'border-border'}`}><div className="flex items-start justify-between"><ProductThumb index={index} /><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected.includes(id) ? 'border-brand bg-brand text-white' : 'border-border-strong'}`}>{selected.includes(id) && '✓'}</span></div><div className="mt-3 text-xs font-semibold">{PRODUCTS[id].name}</div><div className="mt-1 text-[10px] text-text-muted">{seller} · {id}</div></button>)}</div>
          </EditorSection>
          <EditorSection step="04" title="Optional hotspots">
            <div className="flex items-start justify-between"><div><div className="text-sm font-semibold">Product hotspots</div><div className="text-xs text-text-muted">{selected.length ? 'Place visual entry points for selected Products.' : 'Unavailable because no Products are selected.'}</div></div><Toggle label="Product hotspots" checked={hotspots && tagged} onChange={() => tagged && setHotspots(!hotspots)} disabled={!tagged} /></div>
            {tagged && hotspots && <div className="relative mt-4 max-w-sm"><ContentMedia index={0} large /><span className="absolute left-[42%] top-[35%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-brand text-white shadow">+</span></div>}
          </EditorSection>
          <EditorSection step="05" title="Preview and eligibility"><div className="grid grid-cols-2 gap-4"><div className="rounded-xl bg-surface-raised p-4"><div className="text-xs text-text-muted">Publication state</div><div className="mt-2"><StatusBadge status="published" customLabel="Will publish" /></div></div><div className="rounded-xl bg-surface-raised p-4"><div className="text-xs text-text-muted">For You eligibility</div><div className="mt-2"><EligibilityBadge eligible={eligible} /></div></div></div>{eligibility === 'unavailable' && <NotEligibleNote />}<p className="mt-3 text-xs text-text-muted">Publishing is allowed with {selected.length} tagged Product{selected.length === 1 ? '' : 's'}. Eligibility does not control publication.</p></EditorSection>
        </div>
        {preview && <ShoppablePreview seller={seller} caption={caption || 'Your caption will appear here.'} productCount={selected.length} hotspots={hotspots} eligibility={eligibility} />}
      </div>
    </div>
  )
}

// The post editor's For You eligibility (rules 1.6–1.8): no selected Product, or none available at the story moment by
// the module's tag-availability rule, or eligible. The editor applies the module's rule; it keeps no copy of it.
type EditorEligibility = 'eligible' | 'no-tags' | 'unavailable'

function editorEligibility(selected: ProductId[], at: Moment): EditorEligibility {
  return selected.length === 0 ? 'no-tags' : hasAvailableProductAt(selected, at) ? 'eligible' : 'unavailable'
}

// The approved wording for a post whose tagged Products are all unavailable: the full reason, and the publication line.
const NOT_ELIGIBLE = {
  label: 'For You eligibility:',
  reason: 'Not eligible — no tagged Product is currently available.',
  sentence: 'For You eligibility: Not eligible — no tagged Product is currently available.',
  publication: 'Published · Not eligible for For You',
}

/** Why a tagged post isn't eligible for For You, in the pattern Home uses for Shoppable Posts needing action. */
function NotEligibleNote() {
  return <p className="mt-3 rounded-xl border border-warning/20 bg-warning-bg px-4 py-3 text-xs leading-relaxed text-text-secondary"><span className="font-semibold text-warning">{NOT_ELIGIBLE.label}</span> {NOT_ELIGIBLE.reason}</p>
}

function EditorSection({ step, title, children }: { step: string; title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5"><div className="mb-5 flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-muted font-mono text-[10px] font-bold text-brand-dark">{step}</span><h2 className="font-display text-lg font-semibold">{title}</h2></div>{children}</section>
}

function ProductPreview({ name, category, price, description }: { name: string; category: string; price: string; description: string }) {
  return <aside className="sticky top-4 h-fit rounded-3xl border border-border bg-surface p-4 shadow-lg"><div className="text-center font-mono text-[10px] uppercase tracking-wider text-text-muted">Product Post Preview</div><div className="mt-4 h-80 rounded-2xl bg-gradient-to-br from-brand-muted to-warning-bg" /><div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-brand">{category}</div><div className="mt-1 font-display text-xl font-semibold">{name}</div><div className="mt-2 font-bold text-brand">{price}</div><p className="mt-3 text-xs leading-relaxed text-text-secondary">{description || 'Product description'}</p><Button style={{ width: '100%', marginTop: 16 }}>Add to Cart</Button><div className="mt-3 text-center text-[10px] text-text-muted">Exactly one Product · Commerce detail surface</div></aside>
}

function ShoppablePreview({ seller, caption, productCount, hotspots, eligibility }: { seller: string; caption: string; productCount: number; hotspots: boolean; eligibility: EditorEligibility }) {
  return <aside className="sticky top-4 h-fit rounded-3xl border border-border bg-text-primary p-3 text-white shadow-lg"><div className="text-center font-mono text-[10px] uppercase tracking-wider text-white/60">Shoppable Post Preview</div><div className="relative mt-3 h-[460px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark">{hotspots && productCount > 0 && <span className="absolute left-[45%] top-[38%] flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand text-white">+</span>}<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 pt-20"><div className="text-sm font-semibold">{seller}</div><p className="mt-2 text-sm leading-relaxed text-white/80">{caption}</p>{productCount > 0 && <div className="mt-3 inline-flex rounded-full bg-white px-3 py-2 text-xs font-semibold text-text-primary">In this post · {productCount} Product{productCount > 1 ? 's' : ''}</div>}</div></div><div className="mt-3 text-center text-[10px] text-white/60">{eligibility === 'eligible' ? 'Published · FYP Eligible' : NOT_ELIGIBLE.publication}</div>{eligibility === 'unavailable' && <p className="mx-2 mt-1 text-center text-[10px] leading-relaxed text-white/60">{NOT_ELIGIBLE.sentence}</p>}</aside>
}

// A Product's variant groups as DEMO_DATA gives them: one price per Product, with no inventory tracking defined.
function VariantEditor({ productId }: { productId: ProductId | null }) {
  return <div className="rtable overflow-hidden rounded-xl border border-border"><div className="rtable-head grid grid-cols-[1fr_1.5fr_120px_100px] gap-3 bg-surface-raised px-4 py-2 text-[10px] font-semibold uppercase text-text-muted"><span>Option</span><span>Values</span><span>Price impact</span><span>Inventory</span></div>{(productId ? PRODUCTS[productId].variants : []).map((group, index) => <div key={index} className="rtable-row grid grid-cols-[1fr_1.5fr_120px_100px] gap-3 border-t border-border px-4 py-3 text-xs"><span data-label="Option">{group.name ?? '—'}</span><span data-label="Values">{group.options.join(', ')}</span><span data-label="Price impact">None</span><span data-label="Inventory">—</span></div>)}<button className="w-full border-t border-border px-4 py-3 text-left text-xs font-semibold text-brand">+ Add variant option</button></div>
}

function VariantTable({ productId }: { productId: ProductId }) {
  return <div className="space-y-2">{PRODUCTS[productId].variants.map((group, index) => <div key={index} className="rounded-lg bg-surface-raised p-3 text-xs font-medium">{group.name ?? '—'} · {group.options.join(', ')}</div>)}</div>
}

function CheckOption({ label, checked }: { label: string; checked?: boolean }) {
  const [selected, setSelected] = useState(!!checked)
  return <button onClick={() => setSelected(!selected)} className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${selected ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border'}`}><span className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'border-brand bg-brand text-white' : 'border-border-strong'}`}>{selected && '✓'}</span>{label}</button>
}

/** An on/off switch: named by the setting it controls, which doesn't change with its state, and exposing that state (§57). */
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return <button role="switch" aria-checked={checked} aria-label={label} onClick={onChange} disabled={disabled} className={`console-toggle relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-border-strong'} ${disabled ? 'opacity-50' : ''}`}><span className={`console-toggle-knob absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`} /></button>
}

function ProductThumb({ index, className }: { index: number; className?: string }) {
  const colors = ['from-brand-muted to-warning-bg', 'from-warning-bg to-brand-muted', 'from-success-bg to-courier-muted', 'from-surface-raised to-border']
  return <span className={`block h-12 w-12 rounded-lg bg-gradient-to-br ${colors[index % colors.length]}${className ? ` ${className}` : ''}`} />
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

function InboxPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  // The Seller's conversations at the story moment, marked while the Buyer awaits a reply.
  const threads = sellerThreads(sellerId, at)
  const [selected, setSelected] = useState<ConversationId | undefined>(threads[0]?.id)
  // The reply's context is the composer's, never the conversation's. It starts on General / Seller in each conversation,
  // so one Buyer's Order is never carried into another Buyer's conversation (rule 12.6).
  const [context, setContext] = useState<MessageContext>(GENERAL_CONTEXT)
  const [reply, setReply] = useState('')
  // Replies sent in this session, per conversation, each with its context and the team member with the Seller Console
  // session (DEMO_DATA › Seller Console Settings). They are transient: a reset remounts the Console without them.
  const [sent, setSent] = useState<Partial<Record<ConversationId, readonly MessageRecord[]>>>({})
  const staff = sessionStaffOn(sellerId, 'Seller Console')
  const selectId = useId()
  // A chatbot escalation is the Buyer's unmatched question to the Seller's chatbot, still awaiting the Seller's reply.
  const escalationOf = (id?: ConversationId) => { const last = id && messagesAt(id, at).pop(); return last && last.from === 'buyer' && last.escalatedFromChatbot ? last : undefined }
  const [escalated, setEscalated] = useState(!!escalationOf(selected))
  // On a phone the Inbox drills in: the list, then the chosen conversation with a way back (index.css; spec §4).
  const [phoneView, setPhoneView] = useState<'list' | 'conversation'>('list')
  const open = (id: ConversationId) => { setSelected(id); setContext(GENERAL_CONTEXT); setEscalated(!!escalationOf(id)); setPhoneView('conversation') }
  const send = () => {
    const text = reply.trim()
    if (!text || !selected || !staff) return
    setSent(all => ({ ...all, [selected]: [...(all[selected] ?? []), { at: at.at, sequence: Object.values(all).reduce((n, list) => n + (list?.length ?? 0), 0) + 1, from: staff, context, text }] }))
    setReply('')
  }
  const name = (id: ConversationId) => shortName(BUYERS[CONVERSATIONS[id].buyer].name)
  const choices = selected ? contextChoicesAt(selected, at) : []
  const question = escalationOf(selected)
  // DEMO_DATA's messages so far, then this session's replies, in time order.
  const messages = selected ? effectiveMessagesAt(selected, at, sent[selected]) : []
  // Each row previews its conversation's newest message, a reply sent in this session included, so its text and chip come
  // from the same message. Latest first.
  const rows = threads.flatMap(({ id }) => { const last = effectiveMessagesAt(id, at, sent[id]).pop(); return last ? [{ id, last }] : [] })
    .sort((a, b) => byMessageTime(b.last, a.last))
  // A reply just sent comes into view; opening a conversation keeps its place.
  const list = useRef<HTMLDivElement>(null)
  const shown = useRef({ conversation: selected, count: messages.length })
  useEffect(() => {
    if (shown.current.conversation === selected && messages.length > shown.current.count) list.current?.scrollTo({ top: list.current.scrollHeight })
    shown.current = { conversation: selected, count: messages.length }
  }, [selected, messages.length])
  return (
    <div className="seller-inbox flex h-full min-h-[680px]" data-phone-view={phoneView}>
      <div className="seller-inbox-list w-80 flex-shrink-0 border-r border-border bg-surface">
        <div className="border-b border-border p-4"><div className="font-display text-xl font-semibold">Inbox</div><div className="mt-3"><SearchInput placeholder="Search conversations" /></div></div>
        {threads.length === 0 && <p className="p-6 text-center text-sm text-text-muted">No conversations</p>}
        {rows.map(({ id, last }) => <button key={id} onClick={() => open(id)} className={`flex w-full gap-3 border-b border-border p-4 text-left ${selected === id ? 'bg-brand-muted' : ''}`}><AvatarText name={name(id)} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="text-sm font-semibold">{name(id)}</span><span className="text-[10px] text-text-muted">{formatAge(last.at, at.at)}</span></span><span className="mt-1 block truncate text-xs text-text-muted">{last.text}</span><span className="mt-2 inline-flex rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-text-secondary">Talking about: {contextSubject(last.context)}</span></span>{awaitingSellerReplyAt(id, at) && <span role="img" aria-label="Needs reply" title="Needs reply" className="mt-1 h-2 w-2 rounded-full bg-brand" />}</button>)}
      </div>
      {selected && <div className="seller-inbox-thread flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3"><div className="flex items-center gap-3"><button onClick={() => setPhoneView('list')} aria-label="Back to conversations" className="seller-inbox-back flex-shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-brand">←</button><AvatarText name={name(selected)} /><span><span className="block text-sm font-semibold">{name(selected)}</span><span className="text-xs text-text-muted">Buyer–Seller relationship thread</span></span></div>{escalated && <StatusBadge status="open" customLabel="Chatbot escalated" />}</div>
        {escalated && question && <div className="flex items-center gap-3 bg-warning-bg px-5 py-3 text-xs text-text-secondary"><span className="font-semibold text-warning">Chatbot escalation</span><span>The chatbot had no approved answer for “{question.text}” A human Seller reply is requested.</span><button onClick={() => setEscalated(false)} className="ml-auto font-semibold text-brand">Mark handled</button></div>}
        <div ref={list} role="list" aria-label="Messages" className="flex-1 overflow-y-auto bg-surface-raised p-5">
          {messages.map((m, index) => <ChatBubble key={index} mine={m.from !== 'buyer'} context={m.context} author={m.from === 'buyer' ? undefined : shortName(STAFF[m.from].name)}>{m.text}</ChatBubble>)}
        </div>
        <div className="border-t border-border bg-surface p-4">
          {/* DEMO_DATA defines no preparation lead time, so no quick reply quotes one. */}
          <div className="mb-3 flex gap-2 overflow-x-auto"><span className="text-xs font-semibold text-text-muted">Quick Replies</span>{['Courier assigned', 'Please check your Order'].map(value => <button key={value} onClick={() => setReply(value)} className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary">{value}</button>)}</div>
          {/* The reply's context: exactly this conversation's choices at the story moment (rules 12.5–12.6). */}
          <div className="mb-3 flex items-center gap-3">
            <label htmlFor={selectId} className="text-xs font-semibold text-text-secondary">Talking about</label>
            <select id={selectId} value={contextKey(context)} onChange={event => setContext(choices.find(choice => contextKey(choice) === event.target.value) ?? GENERAL_CONTEXT)} className="h-11 min-w-0 max-w-md flex-1 rounded-lg border border-border bg-surface px-3 text-sm font-normal text-text-primary">
              {CONTEXT_GROUPS.map(group => {
                const options = choices.filter(choice => group.kind in choice).map(choice => <option key={contextKey(choice)} value={contextKey(choice)}>{contextSubject(choice)}</option>)
                if (!options.length) return null
                return 'label' in group ? <optgroup key={group.kind} label={group.label}>{options}</optgroup> : options
              })}
            </select>
          </div>
          <div className="flex gap-2"><div className="flex-1"><TextInput aria-label="Reply" value={reply} onChange={event => setReply(event.target.value)} placeholder={'general' in context ? `Reply as ${SELLERS[sellerId].name}` : `Reply as ${SELLERS[sellerId].name} about ${contextSubject(context)}`} /></div><Button onClick={send}>Send Reply</Button></div>
          <div className="mt-2 text-[10px] text-text-muted">Human Seller reply · Chat does not establish payment, fulfilment, handoff, or claim truth.</div>
        </div>
      </div>}
      {!selected && <div className="flex flex-1 items-center justify-center bg-surface-raised p-8"><div className="max-w-sm text-center"><div className="font-display text-xl font-semibold">No Buyer conversations yet</div><p className="mt-1 text-sm text-text-muted">Conversations with Buyers about your Products, posts and Orders appear here.</p></div></div>}
    </div>
  )
}

type InsightsTab = 'overview' | 'scenes' | 'products' | 'reputation'

// Each Insights view and the Analytics capability that gives access to it (PR-007): who sees a view comes from the
// role model, never from a separate list.
const INSIGHTS_TABS: { key: InsightsTab; label: string; capability: string }[] = [
  { key: 'overview', label: 'Overview', capability: 'Seller performance overview' },
  { key: 'scenes', label: 'Scene Performance', capability: 'Scene performance and content-to-commerce' },
  { key: 'products', label: 'Product Performance', capability: 'Product performance' },
  { key: 'reputation', label: 'Seller Reputation', capability: 'Claim, cancellation and response-quality summaries' },
]

/** 'Owner, Admin, Analyst and Campaign Manager': the roles a capability belongs to, in catalogue order. */
function rolesWith(label: string) {
  const roles = CAPABILITIES.find(capability => capability.label === label)?.roles ?? []
  const names = SELLER_ROLES.filter(info => roles.includes(info.role)).map(info => info.label)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names.join('')
}

function InsightsPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const [tab, setTab] = useState<InsightsTab>('overview')
  // DEMO_DATA's 7-day figures; it records no week-on-week changes.
  const i = INSIGHTS_7D[sellerId]
  const overview: [string, string, string][] = i ? [
    ['Paid Orders', String(i.paidOrders), '—'], ['Completed Orders', String(i.completedOrders), '—'], ['GMV', formatEtb(i.gmv), '—'],
    ['Product views', i.productViews.toLocaleString('en-US'), '—'], ['Shoppable impressions', i.qualifiedImpressions.toLocaleString('en-US'), '—'], ['Product-tag CTR', `${i.tagCtrPercent}%`, '—'],
    ['Storefront visits', i.storefrontVisits.toLocaleString('en-US'), '—'], ['Claims', String(i.claims), '—'], ['Cancellation', `${i.cancellationRatePercent}%`, '—'],
    ['Response reliability', `${i.responseReliabilityPercent}%`, '—'], ['Fulfilment reliability', `${i.fulfilmentReliabilityPercent}%`, '—'],
  ] : []
  const current = INSIGHTS_TABS.find(item => item.key === tab)!
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Insights" description="Store, Scene, Product and reputation performance." />
      <div className="mb-5"><Segmented options={INSIGHTS_TABS.map(item => [item.key, item.label])} active={tab} onChange={value => setTab(value as InsightsTab)} /></div>
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-4 gap-4">{overview.map(([label, value, change]) => <InsightCard key={label} label={label} value={value} change={change} />)}</div>
          <div className="mt-5 grid grid-cols-[1.5fr_1fr] gap-5"><TrendPanel title="Paid Orders and GMV · 7 days" /><ReliabilityPanel sellerId={sellerId} /></div>
        </>
      )}
      {tab === 'scenes' && <ScenePerformanceView sellerId={sellerId} at={at} />}
      {tab === 'products' && <ProductPerformanceView sellerId={sellerId} at={at} />}
      {tab === 'reputation' && <SellerReputationView sellerId={sellerId} at={at} />}
      <p className="mt-5 text-xs text-text-muted">Who sees this view: {rolesWith(current.capability)}. Every Insights view is read-only.</p>
      <div className="mt-3 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Insights report observable outcomes only. Recommendation algorithms, ranking weights and internal eligibility calculations are not exposed.</div>
    </div>
  )
}

const count = (value?: number) => (value === undefined ? '—' : value.toLocaleString('en-US'))

// A Scene's status beside its figures. Private is a Buyer-visibility state: the Scene and its history stay.
const SCENE_STATUS: Record<SceneStatus, { label: string; detail?: string; tone: string }> = {
  'Public': { label: 'Public', tone: 'bg-success-bg text-success' },
  'No Products tagged': { label: 'Public', detail: 'No Products tagged', tone: 'bg-success-bg text-success' },
  'Private': { label: 'Private', detail: 'Its tagged Products are all unavailable, so Buyers don’t see it. Its history stays.', tone: 'bg-warning-bg text-warning' },
  'Restricted': { label: 'Restricted', detail: 'Restricted after moderation', tone: 'bg-danger-bg text-danger' },
  'Draft': { label: 'Draft', detail: 'Not yet published', tone: 'bg-surface-raised text-text-secondary' },
}

/** The 7-day window's label: 'DEMO data · 7 days to 2 Oct, 10:25'. */
const WINDOW_LABEL = `DEMO data · 7 days to ${formatDayMonth(DEFAULT_SNAPSHOT.at)}, ${formatClock(DEFAULT_SNAPSHOT.at)}`

/**
 * Scene Performance (PR-007): what each of the Seller's Scenes led to. Commerce and discovery outcomes lead; views,
 * hotspot taps, Likes, Saves and Shares are supporting signals. A Private Scene keeps its history, with its status.
 */
function ScenePerformanceView({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const scenes = sellerPostsAt(sellerId, at)
  return (
    <section aria-label="Scene Performance">
      <p className="mb-4 text-sm text-text-secondary">What each Scene led to: Explore the Scene, Product visits, questions and Orders. Likes, Saves and Shares support the picture; they aren’t the measure. <span className="text-text-muted">{WINDOW_LABEL}.</span></p>
      <div className="space-y-4">
        {scenes.map(id => {
          const figures = scenePerformance(id)
          const status = SCENE_STATUS[sceneStatusAt(id, at)]
          const tags = SHOPPABLE_POSTS[id].tags.length
          return (
            <article key={id} aria-label={SHOPPABLE_POSTS[id].title} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold">{SHOPPABLE_POSTS[id].title}</h2>
                  <p className="text-xs text-text-muted">{tags ? `${tags} tagged Product${tags === 1 ? '' : 's'}` : 'No Products tagged'}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
              </div>
              {status.detail && status.label !== 'Public' && <p className="mt-2 text-xs text-text-secondary">{status.detail}</p>}
              {figures ? (
                <>
                  <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Outcomes</div>
                  <dl className="mt-2 flex flex-wrap gap-3">
                    <Outcome label="Explore the Scene opens" value={count(figures.exploreOpens)} />
                    <Outcome label="Product detail visits" value={count(figures.productDetailVisits)} />
                    <Outcome label="Seller inquiries" value={count(figures.sellerInquiries)} />
                    <Outcome label="Orders initiated" value={count(figures.ordersInitiated)} />
                    <Outcome label="Verified completed Orders" value={count(figures.completedOrders)} strong />
                  </dl>
                  <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Discovery and engagement</div>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-secondary">
                    <Signal label="Qualified views" value={count(figures.qualifiedViews)} />
                    <Signal label="Hotspot taps" value={count(figures.hotspotTaps)} />
                    <Signal label="Likes" value={count(figures.likes)} />
                    <Signal label="Saves" value={count(figures.saves)} />
                    <Signal label="Shares initiated" value={count(figures.sharesInitiated)} />
                  </dl>
                </>
              ) : <p className="mt-4 text-sm text-text-muted">No activity in this period.</p>}
            </article>
          )
        })}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-text-muted">Attributed to the Scene: inquiries and Orders that started from it. Verified completed Orders are those a verified final handoff completed. Buyers never see Like counts.</p>
    </section>
  )
}

function Outcome({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="min-w-[8.5rem] flex-1 rounded-xl bg-surface-raised p-3"><dd className={`font-display text-2xl font-semibold ${strong ? 'text-brand' : ''}`}>{value}</dd><dt className="mt-1 text-[11px] text-text-muted">{label}</dt></div>
}

function Signal({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-1.5"><dt>{label}</dt><dd className="font-semibold text-text-primary">{value}</dd></div>
}

/**
 * Product Performance (PR-007): each Product's views and Saves, its own Product rating, and what it led to. The Product
 * rating is the Product's, never the Seller's.
 */
function ProductPerformanceView({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const products = sellerProductsAt(sellerId, at)
  const cols = 'grid-cols-[1.7fr_repeat(4,1fr)_1.1fr_1.1fr]'
  return (
    <section aria-label="Product Performance">
      <p className="mb-4 text-sm text-text-secondary">Each Product’s views and Saves, its Product rating, and the questions and Orders it led to. <span className="text-text-muted">{WINDOW_LABEL}; ratings are all-time.</span></p>
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border border-border bg-surface" style={{ '--rtable-min': '820px' } as CSSProperties}>
        <div className={`rtable-head grid ${cols} gap-3 bg-surface-raised px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-text-muted`}><span>Product</span><span>Product views</span><span>Saves</span><span>Product rating</span><span>Seller inquiries</span><span>Orders initiated</span><span>Verified completed Orders</span></div>
        {products.map(id => {
          const figures = productPerformance(id, at)
          const rating = figures?.rating
          return (
            <div key={id} className={`rtable-row grid ${cols} items-center gap-3 border-t border-border px-5 py-4 text-xs`}>
              <span className="rtable-primary"><span className="block font-semibold">{PRODUCTS[id].name}</span><span className="text-text-muted">{availabilityLabel(id)}</span></span>
              <span data-label="Product views">{count(figures?.views)}</span>
              <span data-label="Saves">{count(figures?.saves)}</span>
              <span data-label="Product rating">{rating ? `${rating.average} ★ · ${rating.ratings} review${rating.ratings === 1 ? '' : 's'}` : rating === null ? 'No ratings yet' : '—'}</span>
              <span data-label="Seller inquiries">{count(figures?.sellerInquiries)}</span>
              <span data-label="Orders initiated" className="font-semibold">{count(figures?.ordersInitiated)}</span>
              <span data-label="Verified completed Orders" className="font-semibold text-brand">{count(figures?.completedOrders)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Seller Reputation (PR-007): the Seller rating, each Product's rating, verified completed Orders, service quality and
 * Trust, each on its own. Nothing combines them, and Likes play no part.
 */
function SellerReputationView({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const reputation = sellerReputationAt(sellerId, at)
  const service = reputation.serviceQuality
  return (
    <section aria-label="Seller Reputation" className="space-y-5">
      <p className="text-sm text-text-secondary">Each measure stands on its own: the Seller rating is about your service, each Product rating is about that Product, and Trust is set by Adulis. No score combines them.</p>
      {/* Three cards that wrap rather than squeeze: "ESTABLISHED" needs a wider card than a third of a tablet's width. */}
      <div className="flex flex-wrap gap-4 [&>*]:min-w-[16rem] [&>*]:flex-1">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs font-semibold text-text-muted">Seller rating</div>
          <div className="mt-3 font-display text-3xl font-semibold">{reputation.sellerRating ? `${reputation.sellerRating.average} ★` : '—'}</div>
          <div className="mt-2 text-xs text-text-muted">{reputation.sellerRating ? `From ${reputation.sellerRating.ratings} Seller Reviews by verified Buyers` : '—'}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs font-semibold text-text-muted">Verified completed Orders</div>
          <div className="mt-3 font-display text-3xl font-semibold">{count(reputation.completedOrders)}</div>
          <div className="mt-2 text-xs text-text-muted">All time, each completed by a verified final handoff</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs font-semibold text-text-muted">Trust level</div>
          <div className="mt-3 font-display text-3xl font-semibold">{reputation.trust ?? '—'}</div>
          <div className="mt-2 text-xs text-text-muted">Read-only. Set by Adulis from platform evidence</div>
        </div>
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        <DetailCard title="Product ratings">
          <ul aria-label="Product ratings" className="divide-y divide-border">
            {reputation.productRatings.map(({ product, rating }) => (
              <li key={product} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">{PRODUCTS[product].name}</span>
                <span className="flex-shrink-0 text-xs text-text-secondary">{rating ? `${rating.average} ★ · ${rating.ratings} review${rating.ratings === 1 ? '' : 's'}` : rating === null ? 'No ratings yet' : '—'}</span>
              </li>
            ))}
          </ul>
        </DetailCard>
        <DetailCard title="Service quality · 7 days">
          <div className="space-y-4">
            <ReliabilityBar label="Response reliability" value={service?.responseReliabilityPercent} />
            <ReliabilityBar label="Fulfilment reliability" value={service?.fulfilmentReliabilityPercent} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3"><MetricBlock label="Claims" value={count(service?.claims)} /><MetricBlock label="Cancellation rate" value={service ? `${service.cancellationRatePercent}%` : '—'} /></div>
        </DetailCard>
      </div>
    </section>
  )
}

function TrustPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  // The Seller's current Trust level (rules 14.1–14.6), read-only.
  const current = trustAt(sellerId, at)
  const levels = [
    { name: 'NEW', detail: 'New Seller relationship and limited operating history.' },
    { name: 'REBUILDING', detail: 'Trust is recovering after reliability or policy issues.' },
    { name: 'ESTABLISHED', detail: 'Consistent commerce and fulfilment history.' },
    { name: 'TRUSTED', detail: 'Sustained high reliability across key Seller outcomes.' },
  ].map(level => ({ ...level, current: level.name === current }))
  return (
    <div className="mx-auto max-w-5xl p-8">
      <ModuleHeader title="Seller Trust" description={`Read-only view of ${SELLERS[sellerId].name}’s current Trust level.`} trailing={<span className="rounded-full bg-info-bg px-3 py-2 font-mono text-xs font-semibold text-info">READ-ONLY</span>} />
      <div className="rounded-2xl border border-info/20 bg-info-bg p-6"><div className="text-xs font-semibold uppercase tracking-wider text-info">Current Trust level</div><div className="mt-2 font-display text-4xl font-semibold">{current ?? '—'}</div><p className="mt-2 text-sm text-text-secondary">Based on observed commerce, service, claims and fulfilment outcomes. Sellers cannot edit or select Trust.</p></div>
      <div className="mt-5 grid grid-cols-4 gap-4">{levels.map(level => <div key={level.name} className={`rounded-2xl border p-5 ${level.current ? 'border-info bg-info-bg' : 'border-border bg-surface'}`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold">{level.name}</span>{level.current && <StatusBadge status="active" size="sm" customLabel="Current" />}</div><p className="mt-3 text-xs leading-relaxed text-text-muted">{level.detail}</p></div>)}</div>
      <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">Trust changes are system-managed and auditable. This Console intentionally contains no edit, override, or level-selection controls.</div>
    </div>
  )
}

function ReviewsPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const [dimension, setDimension] = useState<'quality' | 'service'>('quality')
  // The Seller's reviews at the story moment. Seller Service has a DEMO_DATA aggregate; Product Quality is rated per
  // Product, so there is no Seller-level figure, and DEMO_DATA gives no star distribution.
  const ids = reviewsAt({ seller: sellerId }, at)
  const service = sellerServiceAt(sellerId, at)
  const reviews = dimension === 'quality'
    ? ids.flatMap(id => REVIEWS[id].productQuality.map(q => ({ key: `${id}-${q.product}`, buyer: shortName(BUYERS[ORDERS[REVIEWS[id].order].buyer].name), score: q.rating, product: PRODUCTS[q.product].name, text: REVIEWS[id].text })))
    : ids.map(id => ({ key: id, buyer: shortName(BUYERS[ORDERS[REVIEWS[id].order].buyer].name), score: REVIEWS[id].sellerService, product: `Order ${REVIEWS[id].order}`, text: REVIEWS[id].text }))
  return (
    <div className="mx-auto max-w-6xl p-8">
      <ModuleHeader title="Reviews" description="Product Quality and Seller Service are measured separately." trailing={<Segmented options={[['quality', 'Product Quality'], ['service', 'Seller Service']]} active={dimension} onChange={value => setDimension(value as 'quality' | 'service')} />} />
      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center"><div className="text-xs font-semibold uppercase tracking-wider text-text-muted">{dimension === 'quality' ? 'Product Quality' : 'Seller Service'}</div><div className="mt-3 font-display text-5xl font-semibold">{dimension === 'quality' || !service ? '—' : service.average}</div><div className="mt-2 text-xl text-warning">★★★★★</div><div className="mt-2 text-xs text-text-muted">{dimension === 'quality' || !service ? '—' : `${service.ratings} service rating${service.ratings === 1 ? '' : 's'}`}</div><div className="mt-6 space-y-2">{[5, 4, 3, 2, 1].map(star => <div key={star} className="flex items-center gap-2 text-xs"><span>{star}</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-warning" style={{ width: '0%' }} /></div></div>)}</div></div>
        <div className="space-y-3">{reviews.map(review => <div key={review.key} className="rounded-2xl border border-border bg-surface p-5"><div className="flex justify-between"><span><span className="block text-sm font-semibold">{review.buyer}</span><span className="text-xs text-text-muted">{review.product}</span></span><span className="text-warning">{'★'.repeat(review.score)}</span></div><p className="mt-3 text-sm leading-relaxed text-text-secondary">{review.text}</p><div className="mt-3 text-[10px] font-semibold uppercase text-text-muted">{dimension === 'quality' ? 'Product Quality review' : 'Seller Service review'}</div></div>)}</div>
      </div>
    </div>
  )
}

function ClaimsPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  // The Seller's Claims submitted by the story moment, with each one's state then.
  const claims = sellerClaims(sellerId, at)
  const [selected, setSelected] = useState<ClaimId | undefined>(claims[0])
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const claim = selected && CLAIMS[selected]
  const state = selected ? claimStateAt(selected, at) ?? 'Open' : 'Open'
  const handoff = claim && ORDERS[claim.order].finalHandoff
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Claims" description="Respond with Order-specific information and evidence." />
      {claims.length === 0 && <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-text-muted">No Claims</div>}
      {selected && claim && <div className="grid grid-cols-[360px_1fr] gap-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">{claims.map(id => <button key={id} onClick={() => { setSelected(id); setSubmitted(false) }} className={`w-full border-b border-border p-4 text-left last:border-b-0 ${selected === id ? 'bg-brand-muted' : ''}`}><div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold">{id}</span><StatusBadge status={CLAIM_BADGE[claimStateAt(id, at)!]} size="sm" /></div><div className="mt-2 text-sm font-semibold">{CLAIMS[id].issue}</div><div className="mt-1 text-xs text-text-muted">{CLAIMS[id].order} · {shortName(BUYERS[ORDERS[CLAIMS[id].order].buyer].name)}</div></button>)}</div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-start justify-between"><div><div className="font-display text-2xl font-semibold">{claim.issue}</div><div className="mt-1 text-xs text-text-muted">{selected} · Seller Order {claim.order}</div></div><StatusBadge status={CLAIM_BADGE[state]} /></div>
          <div className="mt-5 grid grid-cols-2 gap-4"><Field label="Buyer-safe identity" value={shortName(BUYERS[ORDERS[claim.order].buyer].name)} /><Field label="Submitted" value={whenLabel(claimSubmitted(selected), at)} /><Field label="Response due" value={claim.responseDeadline ? whenLabel(claim.responseDeadline, at) : '—'} /></div>
          <SectionLabelInline>Buyer statement</SectionLabelInline><div className="rounded-xl bg-surface-raised p-4 text-sm leading-relaxed text-text-secondary">“{claim.statement}”</div>
          <SectionLabelInline>Evidence</SectionLabelInline><div className="grid grid-cols-3 gap-3">{Array.from({ length: claim.evidencePhotos }, (_, index) => <EvidenceTile key={index} label={`Buyer photo ${index + 1}`} />)}{handoff && handoff.method !== 'Not verified' && <EvidenceTile label="Verified handoff" />}</div>
          <div className="mt-5"><Textarea label="Seller response" value={response} onChange={event => setResponse(event.target.value)} placeholder="Add preparation details or evidence relevant to this claim." rows={4} /></div>
          <div className="mt-4 flex justify-end"><Button disabled={!response || submitted} onClick={() => setSubmitted(true)}>{submitted ? 'Response Submitted' : 'Submit Response'}</Button></div>
          {submitted && <div className="mt-4 rounded-xl bg-success-bg p-3 text-xs font-semibold text-success">Response added · Claim {state.toLowerCase()}</div>}
        </div>
      </div>}
    </div>
  )
}

function StorePanel({ sellerId, at, onOpenCouriers }: { sellerId: SellerId; at: Moment; onOpenCouriers: () => void }) {
  const [tab, setTab] = useState<'profile' | 'fulfilment' | 'verification'>('profile')
  // The Seller's DEMO_DATA profile and fulfilment. DEMO_DATA has no customer contact, Storefront domain or
  // preparation lead times.
  const seller = SELLERS[sellerId]
  const [available, setAvailable] = useState(!!seller.storeOpen)
  const [saved, setSaved] = useState(false)
  const options = fulfilmentOptionsAt(sellerId, at)
  const option = (mode: string) => options.find(o => o.mode === mode)
  const collection = option('Buyer Collection'), delivery = option('Seller Delivery'), courier = option('Courier Delivery')
  return (
    <div className="mx-auto max-w-6xl p-8">
      <ModuleHeader title="Store" description="Customer-facing profile, availability and fulfilment." trailing={<Segmented options={[['profile', 'Store Profile'], ['fulfilment', 'Fulfilment'], ['verification', 'Verification']]} active={tab} onChange={value => setTab(value as typeof tab)} />} />
      {saved && <SuccessBanner title="Store settings saved" detail="Your latest Store configuration is now reflected in the prototype." />}
      {tab === 'profile' && (
        <div className="grid grid-cols-[1.4fr_.6fr] gap-5">
          <div className="flex flex-col gap-5">
            <DetailCard title="Store Profile"><div className="grid grid-cols-2 gap-4"><TextInput label="Store name" defaultValue={seller.name} /><TextInput label="Handle" defaultValue={seller.handle} hint="Public and unique." /><div className="col-span-2"><Textarea label="Bio" defaultValue={seller.bio ?? ''} rows={3} /></div><TextInput label="Physical Location" defaultValue={`${seller.area}, ${MARKET.city}`} /><TextInput label="Customer-facing contact" defaultValue="" /></div><div className="mt-5 flex justify-end"><Button onClick={() => setSaved(true)}>Save Profile</Button></div></DetailCard>
            <DetailCard title="Physical Location"><StoreMap sellerId={sellerId} /></DetailCard>
          </div>
          <div className="flex flex-col gap-5"><DetailCard title="Availability"><div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">{available ? 'Store available' : 'Store unavailable'}</span><span className="text-xs text-text-muted">Controls new ordering availability.</span></span><Toggle label="Store availability" checked={available} onChange={() => setAvailable(!available)} /></div></DetailCard><DetailCard title="Public handle"><div className="font-mono text-sm font-semibold text-brand">{seller.handle}</div><div className="mt-2 text-xs text-text-muted">Handle changes affect future shared links.</div></DetailCard></div>
        </div>
      )}
      {tab === 'fulfilment' && (
        <div className="grid grid-cols-2 gap-5">
          <DetailCard title="Buyer Collection"><FulfilmentSetting label="Buyer Collection" title={collection ? 'Enabled' : 'Disabled'} detail={collection ? `${collection.place} · ${collection.hours}` : '—'} checked={!!collection} /></DetailCard>
          <DetailCard title="Seller Delivery"><FulfilmentSetting label="Seller Delivery" title={delivery ? 'Enabled' : 'Disabled'} detail={delivery ? [formatEtb(delivery.charge), delivery.coverage].filter(Boolean).join(' · ') : '—'} checked={!!delivery} /></DetailCard>
          <DetailCard title="Courier Delivery"><FulfilmentSetting label="Courier Delivery" title={courier ? 'Enabled' : 'Disabled'} detail={courier ? `${formatEtb(courier.charge)} · Approved Seller Courier Pool · price shown before payment` : '—'} checked={!!courier} /><Button variant="tertiary" onClick={onOpenCouriers} style={{ marginTop: 16 }}>Manage Couriers</Button></DetailCard>
          <DetailCard title="Preparation settings"><InfoGrid rows={[['Default lead time', '—'], ['Made-to-order lead time', '—'], ['Ready reminder', '—']]} /></DetailCard>
        </div>
      )}
      {tab === 'verification' && (
        <div className="grid grid-cols-2 gap-5"><DetailCard title="Social account"><VerificationRow label={seller.handle} detail={`${(seller.socialAccounts ?? []).join(' and ') || '—'} · social account control verified`} status="Verified" /></DetailCard><DetailCard title="Store details"><VerificationRow label={seller.name} detail="Store profile and contact information" status="Verified" /></DetailCard><DetailCard title="Payment provider"><VerificationRow label="Provider connection" detail="Provider establishes payment truth" status={seller.paymentProvider?.status ?? '—'} /></DetailCard><DetailCard title="Fulfilment"><VerificationRow label={options.map(o => o.mode).join(' · ') || '—'} detail="At least one fulfilment method is active" status="Verified" /></DetailCard></div>
      )}
    </div>
  )
}

/**
 * The Store's physical location (specification §36): the approved area and DEMO_DATA's fictional neighborhood-level
 * pin on a local illustration. No map service, no street address and no live location.
 */
function StoreMap({ sellerId }: { sellerId: SellerId }) {
  const seller = SELLERS[sellerId]
  const area = `${seller.area}, ${MARKET.city}`
  return (
    <div>
      <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-surface-raised" role="img" aria-label={`Illustrative map: fictional pin in ${area}`}>
        <svg viewBox="0 0 480 192" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <g fill="var(--color-border)">
            <rect x="24" y="18" width="92" height="54" rx="6" /><rect x="132" y="18" width="70" height="54" rx="6" /><rect x="318" y="18" width="84" height="40" rx="6" /><rect x="418" y="18" width="48" height="74" rx="6" />
            <rect x="24" y="92" width="58" height="80" rx="6" /><rect x="98" y="122" width="104" height="50" rx="6" /><rect x="318" y="76" width="84" height="54" rx="6" /><rect x="292" y="146" width="110" height="34" rx="6" /><rect x="418" y="110" width="48" height="70" rx="6" />
          </g>
          <g stroke="var(--color-surface)" strokeWidth="10" strokeLinecap="round" fill="none">
            <path d="M0 84 H480" /><path d="M218 0 V192" /><path d="M0 108 C120 100 180 140 300 136 S420 96 480 100" />
          </g>
          <circle cx="240" cy="96" r="54" fill="var(--color-brand)" fillOpacity="0.08" stroke="var(--color-brand)" strokeOpacity="0.4" strokeDasharray="5 5" />
        </svg>
        <svg width="28" height="36" viewBox="0 0 28 36" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" aria-hidden="true">
          <path d="M14 35C14 35 26 21.5 26 13A12 12 0 0 0 2 13C2 21.5 14 35 14 35Z" fill="var(--color-brand)" stroke="white" strokeWidth="2" />
          <circle cx="14" cy="13" r="4.5" fill="white" />
        </svg>
        <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-[10px] font-semibold shadow-sm">{area}</span>
        <span className="absolute bottom-3 right-3 rounded-full bg-surface px-2.5 py-1 font-mono text-[10px] text-text-muted shadow-sm">Illustrative map</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4"><Field label="Area" value={area} /><Field label="Fictional map pin" value={seller.mapPin ? formatPin(seller.mapPin) : '—'} /></div>
      <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">A fictional prototype pin at neighborhood level, rounded to about 1 km. It isn't a street address or a verified business location.</div>
    </div>
  )
}

/** A Seller–Courier relationship in this session's changes: one key per Seller and Courier. */
type CourierKey = `${SellerId}|${CourierId}`
const courierKey = (seller: SellerId, courier: CourierId): CourierKey => `${seller}|${courier}`
/** Courier relationship changes the Seller makes in this session (PR-008). DEMO_DATA and the fixtures never change. */
type CourierChanges = Partial<Record<CourierKey, CourierRelationshipChange>>

/** A calendar date or a story moment as a timestamp. */
const whenOf = (value: CalendarDate | Moment) => (typeof value === 'string' ? value : value.at)

/**
 * A Courier's comparison facts (PR-008), in the same order on every Seller-facing card: vehicle and service areas
 * (whether they cover the Seller's area), completed for this Seller (primary, rule 7.4), the total across Sellers
 * (secondary), and how long the Courier has worked with the Seller. Nothing about other Sellers. Compensation is the
 * Seller's or the Order's, the same for every Courier, so it's shown once, not on each card.
 */
function CourierFacts({ card, sellerId }: { card: CourierCard; sellerId: SellerId }) {
  const area = SELLERS[sellerId].area
  return (
    <span className="mt-1 block text-xs">
      <span className="block text-text-secondary">{card.vehicle} · {card.areas.join(', ')} · <span className={`font-semibold ${card.coversSellerArea ? 'text-success' : 'text-warning'}`}>{card.coversSellerArea ? `covers ${area}` : `outside ${area}`}</span></span>
      <span className="mt-1.5 block text-sm font-semibold text-text-primary">{card.completedForSeller} completed for your store</span>
      <span className="block text-text-muted">{card.totalCompleted} total completed deliveries</span>
      {card.since && <span className="mt-1 block text-text-secondary">With you since {formatMonthShortYear(whenOf(card.since))}</span>}
    </span>
  )
}

// The Couriers lists (specification §36): Approved, Applications, Invitations, and suspended or removed relationships.
type CourierTab = 'approved' | 'applications' | 'invitations' | 'inactive'
const COURIER_TABS: { key: CourierTab; label: string; statuses: readonly CourierRelationshipStatus[] }[] = [
  { key: 'approved', label: 'Approved', statuses: ['Approved'] },
  { key: 'applications', label: 'Applications', statuses: ['Application pending'] },
  { key: 'invitations', label: 'Invitations', statuses: ['Invited'] },
  { key: 'inactive', label: 'Suspended & removed', statuses: ['Suspended', 'Removed', 'Rejected'] },
]

const VERIFICATION_TEXT = { 'Verified': 'Verified by Adulis', 'Pending': 'Verification pending with Adulis', 'Suspended': 'Suspended by Adulis', 'Blocked': 'Blocked by Adulis' } as const

function CouriersPanel({ sellerId, at, advanceTo, changes, onChange }: {
  sellerId: SellerId; at: Moment; advanceTo: (event: Moment | Timestamp) => void
  changes: CourierChanges; onChange: (key: CourierKey, change: CourierRelationshipChange) => void
}) {
  // The Seller's own Courier relationships at the story moment, with this session's changes (rules 6.2, 7.3; PR-008).
  // Each Courier shows completed for this Seller first and the total across Sellers second, as context (rules
  // 7.1–7.4), from the shared module, and nothing about other Sellers.
  const seller = SELLERS[sellerId].name
  const cards = COURIER_RELATIONSHIPS.filter(r => r.seller === sellerId)
    .map(r => courierCardAt(sellerId, r.courier, at, changes[courierKey(sellerId, r.courier)]))
    .filter(card => card.status !== null)
    .sort(courierListOrder)
  const inTab = (tab: CourierTab) => cards.filter(card => COURIER_TABS.find(t => t.key === tab)!.statuses.includes(card.status!))
  const [tab, setTab] = useState<CourierTab>('approved')
  const [selected, setSelected] = useState<CourierId>()
  const [action, setAction] = useState('')
  const list = inTab(tab)
  const card = list.find(item => item.courier === selected) ?? list[0]
  const relationship = card && courierRelationship(sellerId, card.courier)
  const key = card && courierKey(sellerId, card.courier)
  // The Seller's Courier Delivery terms (rule 6.8; specification §52): one amount for every Courier, the Courier
  // Delivery charge for future Checkouts. A change here is this session's, and paid Orders keep the amount they were paid
  // with. The field shows the current terms until the Seller edits it.
  const terms = courierCompensationAt(sellerId, at)
  const [future, setFuture] = useState<number>()
  const [edited, setEdited] = useState<string>()
  const compensation = edited ?? (terms === undefined ? '' : String(terms / 100))
  const approved = inTab('approved')
  const openTab = (next: CourierTab) => { setTab(next); setSelected(undefined) }
  const act = (change: CourierRelationshipChange, message: string, next?: CourierTab) => {
    if (!card || !key) return
    onChange(key, change)
    setAction(message)
    if (next) { setTab(next); setSelected(card.courier) }
  }
  // Approve: Volt House's approval of Daniel K. is DEMO_DATA's (Flow F), so the story moves to just after it and the
  // Courier is approved on the terms from then. Any other approval is this session's own.
  const approve = () => {
    if (!card || !relationship) return
    if (relationship.approved && typeof relationship.approved !== 'string' && !changes[key!]?.status) { advanceTo(relationship.approved); setTab('approved'); setSelected(card.courier); setAction(`${card.name} approved`); return }
    act({ status: 'Approved', since: at }, `${card.name} approved and added to your approved Couriers`, 'approved')
  }
  const history = relationship ? relationshipHistoryAt(relationship, at) : []
  const sessionStatus = key && changes[key]?.status
  const recent = card ? courierHistoryAt(card.courier, at).filter(id => ORDERS[id].seller === sellerId).slice(0, 3) : []
  return (
    <div className="couriers-panel mx-auto max-w-7xl p-8">
      <ModuleHeader title="Couriers" description={`Private courier relationships for ${seller} only.`} trailing={<Button onClick={() => { openTab('invitations'); setAction('Invitation composer opened') }}>Invite Courier</Button>} />
      <div className="mb-3 flex flex-wrap gap-2">{COURIER_TABS.map(t => <Pill key={t.key} active={tab === t.key} onClick={() => openTab(t.key)}>{t.label} · {inTab(t.key).length}</Pill>)}</div>
      {/* The Seller's Courier Delivery terms: one amount for every Courier, used for future Checkouts only. */}
      <section aria-label="Courier Delivery compensation" className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text-muted">Current Courier Delivery compensation</div>
          <div className="mt-1 font-display text-xl font-semibold">{terms === undefined ? 'Not set yet' : `${formatEtb(terms)} per Courier Delivery Order`}</div>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">The same for every Courier. It’s the Courier Delivery charge at Checkout, and paid Orders keep the amount they were paid with.{future !== undefined && ` Future Checkouts: ${formatEtb(future)} (this session).`}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3"><div className="w-56"><TextInput label="Future Courier Delivery compensation (ETB)" value={compensation} onChange={event => setEdited(event.target.value)} hint="Applies only to future Checkout." /></div><Button variant="tertiary" onClick={() => { const amount = Math.round(Number(compensation) * 100); if (amount > 0) { setFuture(amount); setAction(`Future Courier Delivery compensation set to ${formatEtb(amount)}. Paid Orders keep the amount they were paid with.`) } }}>Update Future Compensation</Button></div>
      </section>
      {tab === 'approved' && approved.length > 0 && <p className="mb-4 text-xs text-text-secondary">{approved.filter(c => c.selectable).length} available for a Delivery Offer now · {approved.filter(c => c.availability === 'Busy').length} busy · {approved.filter(c => !c.selectable && c.availability !== 'Busy').length} unavailable or restricted. Listed by who can take a delivery now, then by name.</p>}
      {action && <div role="status" className="mb-4 rounded-xl bg-info-bg p-3 text-xs font-semibold text-info">{action}</div>}
      {!card && <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center text-sm text-text-muted">No Couriers in this list</div>}
      {card && relationship && <div className="grid grid-cols-[360px_1fr] gap-5">
        <div className="h-fit overflow-hidden rounded-2xl border border-border bg-surface">{list.map(item => (
          <button key={item.courier} onClick={() => setSelected(item.courier)} aria-pressed={card.courier === item.courier} className={`flex w-full items-start gap-3 border-b border-border p-4 text-left last:border-b-0 ${card.courier === item.courier ? 'bg-brand-muted' : ''}`}>
            <AvatarText name={item.name} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{item.name}</span><AvailabilityStatus availability={item.availability} className="text-xs font-semibold" /></span>
              <CourierFacts card={item} sellerId={sellerId} />
              {item.note && item.status === 'Approved' && <span className="mt-1.5 block text-xs font-semibold text-text-secondary">{item.note}</span>}
              {item.status !== 'Approved' && <span className="mt-1.5 block text-xs font-semibold text-text-secondary">{item.status}</span>}
            </span>
          </button>
        ))}</div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4"><AvatarText name={card.name} large /><span><span className="block font-display text-2xl font-semibold">{card.name}</span><span className="text-xs text-text-muted">{VERIFICATION_TEXT[card.verification]}{COURIERS[card.courier].memberSince ? ` · Courier since ${formatMonthShortYear(COURIERS[card.courier].memberSince!)}` : ''}</span></span></div>
            <StatusBadge status={card.status === 'Approved' ? 'active' : 'pending'} customLabel={card.status ?? undefined} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <Field label="Availability" value={<AvailabilityStatus availability={card.availability} />} />
            <Field label="Vehicle" value={card.vehicle} />
            <Field label="Service areas" value={`${card.areas.join(', ')} (${card.coversSellerArea ? 'covers' : 'outside'} ${SELLERS[sellerId].area})`} />
            <Field label="Seller relationship" value={card.status === 'Approved' && card.since ? `Approved · ${formatDate(whenOf(card.since))}` : card.status ?? '—'} />
            <Field label="Delivery Offers" value={card.selectable ? 'Can receive now' : 'Can’t receive now'} />
          </div>
          {card.note && <p className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">{card.note}.{card.verification !== 'Verified' && ' Adulis’s verification applies across every Seller; an approval here doesn’t override it.'}</p>}
          <SectionLabelInline>Seller-relevant history</SectionLabelInline>
          {/* Completed for this Seller is the primary figure; the total across Sellers is secondary context beside it. */}
          <div className="grid grid-cols-2 gap-3"><MetricBlock label={`Completed for ${seller}`} value={String(card.completedForSeller)} /><MetricBlock label="Total completed deliveries across Sellers" value={String(card.totalCompleted)} secondary /></div>
          <div className="mt-3 text-xs text-text-secondary">{recent.length ? <>Recent deliveries for {seller}: {recent.map(id => `${id} (${formatDayMonth(stateTime(id, 'Completed')!)})`).join(', ')}</> : 'No individual deliveries for you are recorded in this prototype.'}</div>
          <SectionLabelInline>Relationship history</SectionLabelInline>
          <div className="overflow-hidden rounded-xl border border-border">
            {history.map(entry => <div key={entry.event} className="flex justify-between gap-3 border-b border-border px-4 py-3 text-sm last:border-b-0"><span className="font-medium">{entry.event}</span><span className="text-text-muted">{formatDate(whenOf(entry.at))}</span></div>)}
            {sessionStatus && <div className="flex justify-between gap-3 px-4 py-3 text-sm"><span className="font-medium">{sessionStatus}</span><span className="text-text-muted">This session</span></div>}
          </div>
          <div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Only this Seller relationship and work completed for {seller} are visible. Relationships with other Sellers are private and not shown.</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {card.status === 'Application pending' && <><Button onClick={approve}>Approve</Button><Button variant="destructive" onClick={() => act({ status: 'Rejected' }, `${card.name}’s application rejected`, 'inactive')}>Reject</Button></>}
            {card.status === 'Approved' && <><Button variant="tertiary" onClick={() => act({ status: 'Suspended' }, `${card.name} suspended: no Delivery Offers from ${seller}`, 'inactive')}>Suspend</Button><Button variant="destructive" onClick={() => act({ status: 'Removed' }, `${card.name} removed from ${seller}’s Couriers`, 'inactive')}>Remove</Button></>}
            {card.status === 'Invited' && <Button variant="tertiary" onClick={() => setAction(`Invitation resent to ${card.name}`)}>Resend Invitation</Button>}
            {card.status === 'Suspended' && <Button onClick={() => act({ status: 'Approved' }, `${card.name} restored to your approved Couriers`, 'approved')}>Restore Relationship</Button>}
          </div>
        </div>
      </div>}
    </div>
  )
}

function AutomationPanel({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const [tab, setTab] = useState<'overview' | 'answers' | 'testing' | 'insights'>('overview')
  const [testAnswer, setTestAnswer] = useState(false)
  const [answerSaved, setAnswerSaved] = useState(false)
  // The Seller's chatbot as DEMO_DATA configures it: its answers by topic, and the questions it couldn't match by the
  // story moment. DEMO_DATA records no usage totals or rates.
  const chatbot = CHATBOTS[sellerId]
  const answers = chatbot?.answers ?? []
  const unmatched = CONVERSATION_IDS.filter(id => CONVERSATIONS[id].seller === sellerId).flatMap(id => messagesAt(id, at).filter(m => m.escalatedFromChatbot))
  const first = answers[0]
  // DEMO_DATA records no chatbot for this Seller: the empty state (specification §56).
  if (!chatbot) return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Chatbot Automation" description="Manage automated answers and human escalation." />
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface p-8 text-center"><div className="font-display text-xl font-semibold">No chatbot set up</div><p className="mt-1 max-w-sm text-sm text-text-muted">{SELLERS[sellerId].name} has no configured chatbot answers.</p></div>
    </div>
  )
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Chatbot Automation" description="Manage automated answers and human escalation." trailing={<Segmented options={[['overview', 'Overview'], ['answers', 'Answers'], ['testing', 'Testing'], ['insights', 'Insights']]} active={tab} onChange={value => setTab(value as typeof tab)} />} />
      {tab === 'overview' && <div className="grid grid-cols-4 gap-4"><InsightCard label="Questions answered" value="—" change="—" /><InsightCard label="Resolution rate" value="—" change="—" /><InsightCard label="Human escalations" value="—" change="—" /><InsightCard label="Unmatched questions" value="—" change="—" /><div className="col-span-4 rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">Escalation health</div><p className="mt-2 text-sm text-text-secondary">Questions about payment disputes, claims, custom promises, or unmatched topics escalate to a human Seller. Automation does not modify commerce records.</p></div></div>}
      {tab === 'answers' && <div className="grid grid-cols-[1fr_1fr] gap-5"><DetailCard title="Saved answers">{answers.map(a => <AnswerRow key={a.topic} question={a.topic} answer={a.answer} />)}</DetailCard><DetailCard title="Edit answer"><TextInput label="Customer question" defaultValue={first?.topic ?? ''} /><div className="mt-4"><Textarea label="Approved answer" defaultValue={first?.answer ?? ''} rows={5} /></div><Button onClick={() => setAnswerSaved(true)} style={{ marginTop: 16 }}>{answerSaved ? 'Answer Saved' : 'Save Answer'}</Button></DetailCard></div>}
      {tab === 'testing' && <div className="grid grid-cols-[1fr_1fr] gap-5"><DetailCard title="Test a buyer question"><TextInput label="Question" defaultValue={first?.topic ?? ''} /><Button onClick={() => setTestAnswer(true)} style={{ marginTop: 16 }}>Run Test</Button></DetailCard><DetailCard title="Assistant response">{testAnswer && first ? <div><div className="rounded-xl bg-surface-raised p-4 text-sm">{first.answer}</div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-text-muted">Matched: {first.topic} answer</span><StatusBadge status="active" customLabel="Answered" /></div></div> : <div className="py-12 text-center text-sm text-text-muted">Run a test to preview the buyer-facing answer.</div>}</DetailCard></div>}
      {tab === 'insights' && <div className="grid grid-cols-3 gap-4"><InsightCard label="Top topic" value="—" change="—" /><InsightCard label="Highest escalation" value="—" change="—" /><InsightCard label="Answer gap" value="—" change="—" /><div className="col-span-3"><DetailCard title="Unmatched questions">{unmatched.map(m => <AnswerRow key={m.at} question={m.text} answer="No approved answer · add or escalate" />)}</DetailCard></div></div>}
    </div>
  )
}

/** Session-local team changes (PR-007): a member's new role set or standing. DEMO_DATA's team never changes. */
type TeamChanges = Partial<Record<StaffId, { roles?: readonly TeamRole[]; status?: MemberStatus }>>

/** The Seller's team with this session's changes. The Owner's ownership never changes here. */
function teamWith(sellerId: SellerId, changes: TeamChanges): TeamMember[] {
  return sellerTeam(sellerId).map(member => (member.owner ? member : { ...member, roles: changes[member.staff]?.roles ?? member.roles, status: changes[member.staff]?.status ?? member.status }))
}

// Settings show DEMO_DATA's prototype states for the Seller (specification §38), and the Seller team's six canonical
// roles (PR-007). The Owner is the primary member; no security policies, team emails or provider facts beyond DEMO_DATA
// are shown.
function SettingsPanel({ sellerId, at, team, onTeamChange }: { sellerId: SellerId; at: Moment; team: readonly TeamMember[]; onTeamChange: (staff: StaffId, change: TeamChanges[StaffId]) => void }) {
  const [tab, setTab] = useState('team')
  const tabs = [['team', 'Team'], ['roles', 'Roles & Permissions'], ['sessions', 'Sessions'], ['security', 'Security'], ['ownership', 'Ownership'], ['lifecycle', 'Account lifecycle'], ['notifications', 'Notifications'], ['provider', 'Provider status']]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <ModuleHeader title="Settings" description="People, access, security and account administration." />
      <div className="grid grid-cols-[240px_1fr] gap-5">
        <div className="h-fit rounded-2xl border border-border bg-surface p-2">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} aria-current={tab === key ? 'page' : undefined} className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${tab === key ? 'bg-brand-muted text-brand-dark' : 'text-text-secondary'}`}>{label}</button>)}</div>
        <div className="min-w-0">
          {tab === 'team' && <TeamSettings sellerId={sellerId} team={team} onChange={onTeamChange} onOpenRoles={() => setTab('roles')} />}
          {tab === 'roles' && <RolesSettings />}
          {tab === 'sessions' && <SessionsSettings sellerId={sellerId} />}
          {tab === 'security' && <SecuritySettings />}
          {tab === 'ownership' && <OwnershipSettings sellerId={sellerId} />}
          {tab === 'lifecycle' && <LifecycleSettings sellerId={sellerId} at={at} />}
          {tab === 'notifications' && <NotificationSettings />}
          {tab === 'provider' && <ProviderSettings sellerId={sellerId} />}
        </div>
      </div>
    </div>
  )
}

/** The Seller's team (DEMO_DATA › Seller Console Settings); the Owner is the primary member. */
function teamOf(sellerId: SellerId) {
  return (Object.keys(STAFF) as (keyof typeof STAFF)[]).filter(id => STAFF[id].seller === sellerId)
}

const ROLES_SENTENCE = 'A team member can have more than one role. Their access combines the permissions of those roles. Ownership remains separate.'
const roleLabel = (role: SellerRole) => roleInfo(role).label

/**
 * Team (PR-007): each member, their standing and their roles. The Owner holds ownership, not a team role. Owner and
 * Admin can give a member any set of team roles, never Owner; an active member keeps at least one role, and to take
 * away all access the membership is suspended or removed instead. Changes are this session's only.
 */
function TeamSettings({ sellerId, team, onChange, onOpenRoles }: { sellerId: SellerId; team: readonly TeamMember[]; onChange: (staff: StaffId, change: TeamChanges[StaffId]) => void; onOpenRoles: () => void }) {
  const [invited, setInvited] = useState(false)
  // The Console's signed-in team member (DEMO_DATA's Seller Console session). Managing roles needs Team & Security.
  const you = team.find(member => member.staff === sessionStaffOn(sellerId, 'Seller Console'))
  const canManage = !!you && areaAccess(memberRoles(you), 'Team & Security').level === 'manage'
  // DEMO_DATA records no team email addresses.
  return (
    <DetailCard title="Team" trailing={you && <span className="text-xs text-text-muted">Signed in as {you.name} · {you.owner ? 'Owner' : you.roles.map(roleLabel).join(' + ')}</span>}>
      <div className="mb-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Every team member uses individual human credentials. Shared team passwords are not supported.</div>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">{ROLES_SENTENCE}</p>
      <div className="space-y-3">{team.map(member => <TeamMemberCard key={member.staff} member={member} you={member.staff === you?.staff} canManage={canManage} onChange={change => onChange(member.staff, change)} />)}</div>
      {team.length === 1 && <p className="mt-4 text-sm text-text-secondary">Only the Owner is on this team so far. Every role, and what it can do, is in <button onClick={onOpenRoles} className="font-semibold text-brand underline">Roles &amp; Permissions</button>.</p>}
      <Button onClick={() => setInvited(true)} style={{ marginTop: 16 }}>{invited ? 'Invitation Sent' : 'Invite Team Member'}</Button>
    </DetailCard>
  )
}

function TeamMemberCard({ member, you, canManage, onChange }: { member: TeamMember; you: boolean; canManage: boolean; onChange: (change: TeamChanges[StaffId]) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<readonly TeamRole[]>(member.roles)
  const legend = useId()
  const toggle = (role: TeamRole) => setDraft(roles => (roles.includes(role) ? roles.filter(r => r !== role) : TEAM_ROLES.filter(r => r === role || roles.includes(r))))
  const changed = draft.length !== member.roles.length || draft.some(role => !member.roles.includes(role))
  const roles: readonly SellerRole[] = member.owner ? ['OWNER'] : editing ? draft : member.roles
  return (
    <article aria-label={member.name} className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center gap-3">
        <AvatarText name={member.name} />
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{member.name}{you && <span className="font-normal text-text-muted"> · You</span>}</span><span className="text-xs text-text-muted">{member.owner ? 'Primary member' : 'Team member'}</span></span>
        <StatusBadge status={member.status === 'Active' ? 'active' : 'pending'} customLabel={member.status} size="sm" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {roles.length ? roles.map(role => <RoleChip key={role} role={role} />) : <span className="text-xs font-semibold text-danger">No roles selected</span>}
        {member.owner && <span className="text-xs text-text-muted">From Seller ownership, not a team role</span>}
      </div>
      {member.owner && <p className="mt-2 text-xs leading-relaxed text-text-secondary">Ownership changes only through an ownership transfer, which only the Owner can start. It can’t be given as a team role.</p>}
      {!member.owner && member.status !== 'Active' && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-raised p-3 text-xs text-text-secondary">
          <span>{member.status === 'Suspended' ? 'Suspended: keeps their place on the team but has no access.' : 'Removed from the team: no access.'}</span>
          {canManage && <Button size="sm" variant="tertiary" onClick={() => onChange({ status: 'Active' })}>{member.status === 'Suspended' ? 'Reactivate' : 'Undo removal'}</Button>}
        </div>
      )}
      {!member.owner && member.status === 'Active' && canManage && !editing && <Button size="sm" variant="tertiary" onClick={() => { setDraft(member.roles); setEditing(true) }} style={{ marginTop: 12 }}>Edit roles</Button>}
      {editing && (
        <fieldset aria-labelledby={legend} className="mt-4 rounded-xl bg-surface-raised p-4">
          <legend id={legend} className="sr-only">Roles for {member.name}</legend>
          <div className="text-sm font-semibold">Roles for {member.name}</div>
          <p className="mt-1 text-xs text-text-muted">Choose one or more. Owner isn’t a team role, so it isn’t offered.</p>
          <div className="mt-3 space-y-2">
            <RoleCheckbox role="ADMIN" checked={draft.includes('ADMIN')} onChange={() => toggle('ADMIN')} />
            <div className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Specialist roles · peers</div>
            <div className="grid grid-cols-2 gap-2">{TEAM_ROLES.filter(role => role !== 'ADMIN').map(role => <RoleCheckbox key={role} role={role} checked={draft.includes(role)} onChange={() => toggle(role)} />)}</div>
          </div>
          {!draft.length && <p role="alert" className="mt-3 rounded-lg bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">An active team member needs at least one role. To take away all of {firstName(member.name)}’s access, suspend or remove the membership instead.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={!draft.length || !changed} onClick={() => { onChange({ roles: draft }); setEditing(false) }}>Save roles</Button>
            <Button size="sm" variant="tertiary" onClick={() => setEditing(false)}>Cancel</Button>
            <span className="flex-1" />
            <Button size="sm" variant="tertiary" onClick={() => { onChange({ status: 'Suspended' }); setEditing(false) }}>Suspend membership</Button>
            <Button size="sm" variant="tertiary" onClick={() => { onChange({ status: 'Removed' }); setEditing(false) }}>Remove team member</Button>
          </div>
        </fieldset>
      )}
      {!member.owner && member.status === 'Active' && <EffectiveAccess name={firstName(member.name)} roles={roles} preview={editing} />}
    </article>
  )
}

function RoleChip({ role }: { role: SellerRole }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role === 'OWNER' ? 'bg-warning-bg text-warning' : 'bg-brand-muted text-brand-dark'}`}>{roleLabel(role)}</span>
}

function RoleCheckbox({ role, checked, onChange }: { role: TeamRole; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--color-brand)]" />
      <span className="min-w-0"><span className="block text-sm font-semibold">{roleLabel(role)}</span><span className="block text-xs leading-relaxed text-text-muted">{roleInfo(role).summary}</span></span>
    </label>
  )
}

/**
 * What a member's roles let them do: the union of their roles' capabilities, by business area, each capability tagged
 * with the roles that give it. Owner-only authority never comes from team roles.
 */
function EffectiveAccess({ name, roles, preview }: { name: string; roles: readonly SellerRole[]; preview: boolean }) {
  const held = capabilitiesOf(roles)
  const areas = ACCESS_AREAS.filter(area => held.some(capability => capability.area === area))
  const without = ACCESS_AREAS.filter(area => !areas.includes(area))
  return (
    <section aria-label={`What ${name} can do`} className="mt-4 border-t border-border pt-4">
      <div className="text-sm font-semibold">What {name} can do{preview && <span className="font-normal text-text-muted"> · with the roles selected above</span>}</div>
      {roles.length > 1 && <p className="mt-1 text-xs text-text-muted">Combined from {roles.map(roleLabel).join(' and ')}.</p>}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {areas.map(area => (
          <div key={area} className="rounded-xl bg-surface-raised p-3">
            <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{area}</span><AccessBadge roles={roles} area={area} /></div>
            <ul className="mt-2 space-y-1">{held.filter(capability => capability.area === area).map(capability => <li key={capability.label} className="text-xs leading-relaxed text-text-secondary">{capability.label}{roles.length > 1 && <span className="text-text-muted"> · {grantedBy(capability, roles)}</span>}</li>)}</ul>
          </div>
        ))}
      </div>
      {without.length > 0 && <p className="mt-3 text-xs leading-relaxed text-text-muted">No access: {without.filter(area => area !== 'Seller Lifecycle').join(', ')}{without.includes('Seller Lifecycle') && <>. Seller Lifecycle: <span className="font-semibold">Owner only</span></>}.</p>}
    </section>
  )
}

/** 'Inventory' or 'Inventory, Sales Support': which of the member's roles give a capability. */
function grantedBy(capability: Capability, roles: readonly SellerRole[]) {
  return roles.filter(role => capability.roles.includes(role)).map(roleLabel).join(', ')
}

const ACCESS_TEXT = { 'manage': 'Manage', 'operate': 'Operate', 'read': 'Read', 'none': 'No access', 'owner-only': 'Owner only', 'not-permitted': 'Not permitted' } as const
const ACCESS_TONE = { 'manage': 'bg-brand-muted text-brand-dark', 'operate': 'bg-info-bg text-info', 'read': 'bg-surface text-text-secondary border border-border', 'none': 'text-text-muted', 'owner-only': 'bg-warning-bg text-warning', 'not-permitted': 'text-text-muted' } as const

/** A role set's access to an area as text, never colour alone: Manage, Operate, Read, No access, Owner only or Not permitted. */
function AccessBadge({ roles, area }: { roles: readonly SellerRole[]; area: AccessArea }) {
  const { level, scope } = areaAccess(roles, area)
  return <span className={`inline-flex flex-col rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${ACCESS_TONE[level]}`}>{ACCESS_TEXT[level]}{scope && <span className="font-normal">{scope}</span>}</span>
}

/**
 * Roles & Permissions (PR-007): the six roles (Owner from ownership, Admin, and four peer specialists), access by business
 * area for each, what each role can do in detail, and what no role can do.
 */
function RolesSettings() {
  const [focus, setFocus] = useState<SellerRole>('INVENTORY')
  const info = roleInfo(focus)
  const held = capabilitiesOf([focus])
  const cols = 'grid-cols-[1.2fr_repeat(6,minmax(0,1fr))]'
  return (
    <div className="space-y-5">
      <DetailCard title="Roles & Permissions">
        <p className="text-sm leading-relaxed text-text-secondary">{ROLES_SENTENCE}</p>
        <SectionLabelInline>Ownership and administration</SectionLabelInline>
        <div className="grid grid-cols-2 gap-3">{SELLER_ROLES.filter(role => role.kind !== 'specialist').map(role => <RoleCard key={role.role} role={role.role} />)}</div>
        <SectionLabelInline>Specialist roles · peers, listed alphabetically</SectionLabelInline>
        <div className="grid grid-cols-2 gap-3">{SELLER_ROLES.filter(role => role.kind === 'specialist').map(role => <RoleCard key={role.role} role={role.role} />)}</div>
      </DetailCard>
      <DetailCard title="Access by business area">
        <p className="mb-4 text-xs leading-relaxed text-text-muted"><span className="font-semibold text-text-secondary">Manage</span>: create, change and configure. <span className="font-semibold text-text-secondary">Operate</span>: carry out day-to-day work. <span className="font-semibold text-text-secondary">Read</span>: view only. A member with several roles gets the higher access in each area.</p>
        <div role="table" aria-label="Access by business area" className="rtable rtable-scroll overflow-hidden rounded-xl border border-border" style={{ '--rtable-min': '520px' } as CSSProperties}>
          <div role="row" className={`rtable-head grid ${cols} gap-1.5 bg-surface-raised px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-text-muted`}><span role="columnheader">Business area</span>{SELLER_ROLES.map(role => <span key={role.role} role="columnheader">{role.label}</span>)}</div>
          {ACCESS_AREAS.map(area => (
            <div key={area} role="row" className={`rtable-row grid ${cols} items-center gap-1.5 border-t border-border px-3 py-3 text-xs`}>
              <span role="rowheader" className="rtable-primary font-semibold">{area}</span>
              {SELLER_ROLES.map(role => <span key={role.role} role="cell" data-label={role.label}><AccessBadge roles={[role.role]} area={area} /></span>)}
            </div>
          ))}
        </div>
      </DetailCard>
      <DetailCard title="What each role can do">
        <Segmented small options={SELLER_ROLES.map(role => [role.role, role.label])} active={focus} onChange={value => setFocus(value as SellerRole)} />
        <section aria-label={`What ${info.label} can do`} className="mt-4">
          <p className="text-sm leading-relaxed text-text-secondary">{info.summary}</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ACCESS_AREAS.filter(area => held.some(capability => capability.area === area)).map(area => (
              <div key={area} className="rounded-xl bg-surface-raised p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{area}</span><AccessBadge roles={[focus]} area={area} /></div>
                <ul className="mt-2 space-y-1">{held.filter(capability => capability.area === area).map(capability => <li key={capability.label} className="text-xs leading-relaxed text-text-secondary">{capability.label}{capability.ownerOnly && <span className="font-semibold text-warning"> · Owner only</span>}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-xl border border-border p-3 text-xs leading-relaxed text-text-secondary"><span className="font-semibold text-text-primary">Limits.</span> {info.limits}</p>
        </section>
      </DetailCard>
      <DetailCard title="What no role can do">
        <p className="mb-3 text-xs text-text-muted">Not the Owner, not any combination of roles. These stay with the payment provider and Adulis.</p>
        <ul className="space-y-2">{NO_ROLE_CAN.map(item => <li key={item} className="flex gap-2 text-sm text-text-secondary"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-text-muted" />{item}</li>)}</ul>
      </DetailCard>
    </div>
  )
}

function RoleCard({ role }: { role: SellerRole }) {
  const info = roleInfo(role)
  return (
    <article aria-label={info.label} className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{info.label}</span><span className="font-mono text-[10px] text-text-muted">{role}</span></div>
      <div className="mt-1 text-[11px] font-semibold text-text-muted">{role === 'OWNER' ? 'From Seller ownership · not assignable' : 'Assignable team role'}</div>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{info.summary}</p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted"><span className="font-semibold">{role === 'OWNER' ? 'Owner only: ' : 'Limits: '}</span>{role === 'OWNER' ? 'transfer ownership and close the Seller.' : info.limits}</p>
    </article>
  )
}

function SessionsSettings({ sellerId }: { sellerId: SellerId }) {
  const team: readonly string[] = teamOf(sellerId)
  return <DetailCard title="Sessions & Devices">{SELLER_SESSIONS.filter(session => team.includes(session.staff)).map((session, index) => <SessionRow key={index} device={`${session.surface} · ${session.device}`} person={shortName(STAFF[session.staff].name)} detail="—" current={index === 0} />)}<div className="mt-4 flex items-center gap-2 rounded-xl bg-success-bg p-3 text-xs font-semibold text-success"><CheckIcon />{SELLER_SETTINGS.unrecognisedDevices === 0 ? 'No unrecognised devices' : `${SELLER_SETTINGS.unrecognisedDevices} unrecognised devices`}</div></DetailCard>
}

function SecuritySettings() {
  // DEMO_DATA's Security state; it approves no sign-in or session policy.
  return <div className="space-y-5"><DetailCard title="Security"><InfoGrid rows={[['Credentials', 'Individual credentials for each member'], ['Shared team password', 'None'], ['Security alerts', 'No open security alerts']]} /></DetailCard><DetailCard title="Credential policy"><p className="text-sm leading-relaxed text-text-secondary">Credentials belong to one identifiable human. Team access is granted through invitations, roles and individual sessions—never through a shared password.</p></DetailCard></div>
}

function OwnershipSettings({ sellerId }: { sellerId: SellerId }) {
  const owner = teamOf(sellerId).find(id => STAFF[id].role === 'Owner')
  return <DetailCard title="Store Ownership" trailing={<OwnerOnlyBadge />}><InfoGrid rows={[['Current Owner', owner ? STAFF[owner].name : '—'], ['Owner email', '—'], ['Store', SELLERS[sellerId].name], ['Ownership transfer', SELLER_SETTINGS.ownershipTransferPending ? 'Transfer pending' : 'No transfer pending']]} /><div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs text-text-secondary">Ownership transfer requires acceptance by another individually authenticated human account. Only the Owner can start it; Admins and other team roles can’t.</div><Button variant="tertiary" style={{ marginTop: 16 }}>Start Ownership Transfer</Button></DetailCard>
}

function LifecycleSettings({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  // The Seller's lifecycle state: published and open, since the Seller joined Adulis.
  const seller = SELLERS[sellerId]
  return <div className="space-y-5"><DetailCard title="Seller lifecycle"><InfoGrid rows={[['Status', trustAt(sellerId, at) && seller.storeOpen ? 'Published and open' : '—'], ['On Adulis since', formatCalendarDate(onAdulisSince(sellerId))]]} /></DetailCard><DetailCard title="Account lifecycle"><SettingRow title="Pause Store" detail="Stop new Orders while preserving Store data." action="Review pause" /><SettingRow title="Export Store data" detail="Request an export of Seller-controlled records." action="Request export" /></DetailCard><DetailCard title="Close Seller account" trailing={<OwnerOnlyBadge />}><p className="text-sm text-text-secondary">Closing requires all active Seller Orders, claims and fulfilment obligations to be resolved. Only the Owner can close the Seller; Admins and other team roles can’t.</p><Button variant="destructive" style={{ marginTop: 16 }}>Review Account Closure</Button></DetailCard></div>
}

/** Ownership transfer and Seller closure are the Owner's alone (PR-007). */
function OwnerOnlyBadge() {
  return <span className="rounded-full bg-warning-bg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-warning">Owner only</span>
}

function NotificationSettings() {
  // Every Seller notification type in specification §54 is on by default (DEMO_DATA).
  return <DetailCard title="Notifications"><div className="mb-2 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">{SELLER_SETTINGS.notifications}.</div><SettingToggle title="New Paid Orders" detail="Immediate Console and Seller Companion alert." defaultChecked /><SettingToggle title="Claims and deadlines" detail="Urgent alerts for claim actions." defaultChecked /><SettingToggle title="Courier updates" detail="Offer, assignment and verified handoff events." defaultChecked /><SettingToggle title="Inventory risks" detail="Low-stock and unavailable Products." defaultChecked /><SettingToggle title="Unanswered messages" detail="Buyer conversations awaiting a human reply." defaultChecked /><SettingToggle title="Trust changes" detail="Changes to your store's Trust level." defaultChecked /></DetailCard>
}

function ProviderSettings({ sellerId }: { sellerId: SellerId }) {
  // DEMO_DATA records the provider status and, for one Seller, its confirmation date; payment is labelled
  // "Secure payment" and no provider is named.
  const provider = SELLERS[sellerId].paymentProvider
  return <DetailCard title="Payment-provider status"><div className="flex items-center justify-between rounded-xl bg-success-bg p-4"><span><span className="block text-sm font-semibold">Secure payment</span><span className="text-xs text-text-muted">{provider?.confirmed ? `Confirmed ${formatLongDate(provider.confirmed)}` : '—'}</span></span><StatusBadge status="active" customLabel={provider?.status ?? '—'} /></div><div className="mt-4 grid grid-cols-2 gap-4"><Field label="Payment authority" value="Provider + Adulis backend" /><Field label="Seller control" value="Read-only" /><Field label="Reconciliation" value="—" /><Field label="Settlement profile" value="—" /></div></DetailCard>
}

function ModuleHeader({ title, description, trailing }: { title: string; description: string; trailing?: ReactNode }) {
  return <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold">{title}</h1><p className="mt-1 text-sm text-text-muted">{description}</p></div>{trailing}</div>
}

function AvatarText({ name, large }: { name: string; large?: boolean }) {
  const initials = name.split(' ').map(part => part[0]).join('').slice(0, 2)
  return <span className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark ${large ? 'h-14 w-14 text-base' : 'h-10 w-10 text-xs'}`}>{initials}</span>
}

/** A message with the chip of the context it was sent with (specification §22), and the team member who sent the Seller's. */
function ChatBubble({ children, mine, context, author }: { children: ReactNode; mine?: boolean; context: MessageContext; author?: string }) {
  return (
    <div role="listitem" className={`mb-3 flex max-w-[70%] flex-col ${mine ? 'ml-auto items-end' : 'items-start'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">{author && <span className="font-semibold text-text-secondary">{author}</span>}<span className="rounded-full border border-border bg-surface px-2 py-0.5 text-text-secondary">Talking about: {contextSubject(context)}</span></div>
      <div className={`rounded-2xl p-3 text-sm shadow-sm ${mine ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-surface'}`}>{children}</div>
    </div>
  )
}

function InsightCard({ label, value, change }: { label: string; value: string; change: string }) {
  const positive = change.startsWith('+') || change.startsWith('-0.')
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="text-xs font-semibold text-text-muted">{label}</div><div className="mt-3 font-display text-3xl font-semibold">{value}</div><div className={`mt-2 text-xs font-semibold ${positive ? 'text-success' : 'text-text-muted'}`}>{change}</div></div>
}

function TrendPanel({ title }: { title: string }) {
  // The axis is the seven days to the story day; the bars are an illustration, not DEMO_DATA figures.
  const { moment } = useStory()
  const [y, m, d] = moment.at.slice(0, 10).split('-').map(Number)
  const days = Array.from({ length: 7 }, (_, index) => formatWeekday(new Date(Date.UTC(y, m - 1, d - 6 + index)).toISOString().slice(0, 10))[0])
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">{title}</div><div className="mt-5 flex h-44 items-end gap-3">{[44, 58, 50, 72, 61, 82, 92].map((height, index) => <div key={index} className="flex flex-1 flex-col items-center gap-2"><div className="relative w-full flex-1"><span className="absolute bottom-0 w-full rounded-t bg-brand-muted" style={{ height: `${height}%` }}><span className="block h-1/3 rounded-t bg-brand" /></span></div><span className="text-[9px] text-text-muted">{days[index]}</span></div>)}</div></div>
}

function ReliabilityPanel({ sellerId }: { sellerId: SellerId }) {
  // DEMO_DATA's reliability figures; it defines no low-cancellation or claim-free rate.
  const insights = INSIGHTS_7D[sellerId]
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="font-display text-lg font-semibold">Reliability</div><div className="mt-5 space-y-5"><ReliabilityBar label="Response reliability" value={insights?.responseReliabilityPercent} /><ReliabilityBar label="Fulfilment reliability" value={insights?.fulfilmentReliabilityPercent} /><ReliabilityBar label="Low cancellation" /><ReliabilityBar label="Claim-free Orders" /></div></div>
}

function ReliabilityBar({ label, value }: { label: string; value?: number }) {
  return <div><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{label}</span><span>{value === undefined ? '—' : `${value}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-success" style={{ width: `${value ?? 0}%` }} /></div></div>
}

function SectionLabelInline({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function EvidenceTile({ label }: { label: string }) {
  return <div className="flex h-24 items-end rounded-xl bg-gradient-to-br from-surface-raised to-border p-3 text-xs font-semibold text-text-secondary">{label}</div>
}

// The switch is named by its card's fulfilment mode (`label`); the row's title is the mode's Enabled or Disabled state.
function FulfilmentSetting({ label, title, detail, checked }: { label: string; title: string; detail: string; checked?: boolean }) {
  const [enabled, setEnabled] = useState(!!checked)
  return <div className="flex items-center justify-between"><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span><Toggle label={label} checked={enabled} onChange={() => setEnabled(!enabled)} /></div>
}

function VerificationRow({ label, detail, status }: { label: string; detail: string; status: string }) {
  return <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-text-muted">{detail}</span></span><StatusBadge status="active" customLabel={status} /></div>
}

function MetricBlock({ label, value, secondary }: { label: string; value: string; secondary?: boolean }) {
  // A secondary figure is context for the primary one beside it (rule 7.4), so it reads smaller and quieter.
  return <div className="rounded-xl bg-surface-raised p-4"><div className={`font-display font-semibold ${secondary ? 'text-base text-text-secondary' : 'text-xl'}`}>{value}</div><div className="mt-1 text-[10px] text-text-muted">{label}</div></div>
}

/** A Courier's availability as text plus icon (specification §57), not by colour alone. */
function AvailabilityStatus({ availability, className = '' }: { availability: CourierAvailability; className?: string }) {
  const tone = availability === 'Available' ? 'text-success' : availability === 'Busy' ? 'text-warning' : 'text-text-muted'
  return <span className={`inline-flex items-center gap-1 ${tone} ${className}`}>{availability === 'Available' ? <StatusCheckIcon /> : availability === 'Busy' ? <StatusClockIcon /> : <DotIcon />}{availability}</span>
}

function AnswerRow({ question, answer }: { question: string; answer: string }) {
  return <div className="border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0"><div className="text-sm font-semibold">{question}</div><div className="mt-1 text-xs leading-relaxed text-text-muted">{answer}</div></div>
}

function SessionRow({ device, person, detail, current }: { device: string; person: string; detail: string; current?: boolean }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{device}</span><span className="text-xs text-text-muted">{person} · {detail}</span></span>{current ? <StatusBadge status="active" customLabel="Current" /> : <Button variant="tertiary" size="sm">End session</Button>}</div>
}

function SettingToggle({ title, detail, defaultChecked }: { title: string; detail: string; defaultChecked?: boolean }) {
  const [enabled, setEnabled] = useState(!!defaultChecked)
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span><Toggle label={title} checked={enabled} onChange={() => setEnabled(!enabled)} /></div>
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

function Field({ label, value }: { label: string; value: ReactNode }) {
  return <div><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`mb-2 flex justify-between text-sm ${strong ? 'font-bold' : 'text-text-secondary'}`}><span>{label}</span><span>{value}</span></div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div className="font-display text-xl font-semibold">{value}</div><div className="text-[10px] text-text-muted">{label}</div></div>
}

function Segmented({ options, active, onChange, small }: { options: [string, string][]; active: string; onChange: (value: string) => void; small?: boolean }) {
  return <div className="console-segmented flex rounded-xl bg-surface-raised p-1">{options.map(([value, label]) => <button key={value} onClick={() => onChange(value)} className={`rounded-lg font-semibold ${small ? 'px-2.5 py-1.5 text-[10px]' : 'px-4 py-2 text-xs'} ${active === value ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted'}`}>{label}</button>)}</div>
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

// Status icons beside their text (specification §57): available, and busy.
function StatusCheckIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function StatusClockIcon() {
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.6"/><path d="M8 4.6V8l2.3 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
}

function InfoIcon() {
  return <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-info text-xs font-bold text-white">i</span>
}
