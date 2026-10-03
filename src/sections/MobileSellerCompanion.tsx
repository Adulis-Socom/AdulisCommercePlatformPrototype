import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  PhoneFrame, BottomNav, IconAlerts, IconOrders, IconInbox, IconMore, IconChevronRight,
} from './ShellHelpers'
import { useStory, useStoryMoment } from '../StoryClock'
import {
  BUYERS, CLAIMS, CLAIM_IDS, CONVERSATIONS, CONVERSATION_IDS, COURIERS, COURIER_RELATIONSHIPS, MARKET, ORDERS, ORDER_TIMELINES, PRODUCTS, SELLERS,
  SHOPPABLE_POSTS, SURFACE_DEFAULTS,
  awaitingSellerReplyAt, claimStateAt, completedForSellerAt, courierAvailabilityAt, courierCompensationAt, formatAge, formatClock, formatClockShort, formatDate,
  formatDayMonth, formatEtb, happenedBefore, initials, lineOptions, messagesAt, notificationTime, notificationsAt, ordersAt, orderStateAt,
  orderTotals, paidAt, relationshipStatusAt, sellerProductsAt, shortName, stateTime,
  type ClaimId, type ConversationId, type CourierId, type MessageContext, type Moment, type NotificationRecord, type OrderId, type OrderState,
  type SellerId,
} from '../demo-data'

type TabKey = 'alerts' | 'orders' | 'inbox' | 'more'
type Screen = 'tabs' | 'order' | 'prepare' | 'couriers' | 'offer' | 'pickup-qr' | 'pickup-verified' | 'delivery' | 'conversation' | 'claim'
type OrderStage = 'paid' | 'preparing' | 'ready' | 'offer' | 'assigned' | 'pickup' | 'delivery'
type Tone = 'brand' | 'danger' | 'warning' | 'info' | 'success'

const TABS = [
  { key: 'alerts' as TabKey, label: 'Alerts', icon: <IconAlerts size={22} /> },
  { key: 'orders' as TabKey, label: 'Orders', icon: <IconOrders size={22} /> },
  { key: 'inbox' as TabKey, label: 'Inbox', icon: <IconInbox size={22} /> },
  { key: 'more' as TabKey, label: 'More', icon: <IconMore size={22} /> },
]

// Active Order states the Seller still has to act on: preparation, then handing over.
const NEEDS_PREP: readonly OrderState[] = ['Paid', 'Preparing']
const READY: readonly OrderState[] = ['Ready for Courier', 'Ready for Seller Delivery', 'Ready for Collection', 'Courier Assigned']

/** The Companion's step for the Order's state at the story moment; a sent Delivery Offer is its own step. */
function companionStage(orderId: OrderId, at: Moment): OrderStage {
  const offer = ORDERS[orderId].offer
  switch (orderStateAt(orderId, at)) {
    case 'Preparing': return 'preparing'
    case 'Ready for Courier': case 'Ready for Seller Delivery': case 'Ready for Collection': return offer && happenedBefore(offer.offered, at) ? 'offer' : 'ready'
    case 'Courier Assigned': return 'assigned'
    case 'Pickup Verified': return 'pickup'
    case 'Out for Delivery': case 'Out for Seller Delivery': case 'Delivery Handoff': case 'Collection Handoff': case 'Completed': return 'delivery'
    default: return 'paid'
  }
}

/** 'Product name × 1': an Order's Products and quantities. */
function orderItems(orderId: OrderId) {
  return ORDERS[orderId].lines.map(line => `${PRODUCTS[line.product].name} × ${line.quantity}`).join(', ')
}

/** The Seller's active Orders at the story moment, most recently paid first. */
function activeOrders(sellerId: SellerId, at: Moment) {
  return ordersAt({ seller: sellerId }, at).filter(id => orderStateAt(id, at) !== 'Completed').sort((a, b) => paidAt(b).localeCompare(paidAt(a)))
}

/** The Seller's Claims awaiting its response at the story moment: submitted and not yet resolved. */
function openClaims(sellerId: SellerId, at: Moment) {
  return CLAIM_IDS.filter(id => ORDERS[CLAIMS[id].order].seller === sellerId && [ 'Open', 'Under Review' ].includes(claimStateAt(id, at) ?? ''))
}

/** The Seller's conversations with messages by the story moment, latest message first. */
function sellerThreads(sellerId: SellerId, at: Moment) {
  return CONVERSATION_IDS.filter(id => CONVERSATIONS[id].seller === sellerId)
    .flatMap(id => { const last = messagesAt(id, at).pop(); return last ? [{ id, last }] : [] })
    .sort((a, b) => b.last.at.localeCompare(a.last.at))
}

/** A Seller notification as an alert row: DEMO_DATA's event in the row's existing title and detail form. */
function alertFor(n: NotificationRecord): { tone: Tone; title: string; detail: string; action?: string; attention: boolean } {
  const e = n.event
  switch (e.kind) {
    case 'New Paid Order': return { tone: 'brand', title: 'New Paid Order', detail: `${e.order} · ${orderItems(e.order)}`, action: 'Prepare', attention: true }
    case 'Claim': return { tone: 'danger', title: 'Claim response due', detail: `${CLAIMS[e.claim].order} · ${CLAIMS[e.claim].issue}`, action: 'Respond', attention: true }
    case 'Low stock': return { tone: 'warning', title: 'Low-stock alert', detail: `${PRODUCTS[e.product].name} · ${PRODUCTS[e.product].stock} remaining`, action: 'Review', attention: true }
    case 'Buyer message': {
      const conversation = CONVERSATIONS[e.conversation]
      return { tone: 'info', title: 'Buyer message', detail: `${shortName(BUYERS[conversation.buyer].name)} · ${conversation.messages[e.messageIndex].text}`, action: 'Reply', attention: true }
    }
    case 'Pickup verified': return { tone: 'success', title: 'Pickup verified', detail: `${e.order} · Scanned at ${formatClock(stateTime(e.order, 'Pickup Verified') ?? '')}`, attention: false }
    // DEMO_DATA: the Courier can't accept the offer while on an active delivery (rule 6.3).
    case 'Courier offer issue': return { tone: 'warning', title: 'Courier offer issue', detail: `${ORDERS[e.order].offer ? COURIERS[ORDERS[e.order].offer!.courier].name : 'Courier'} can't accept the ${e.order} offer during an active delivery`, attention: true }
    default: return { tone: 'info', title: e.kind, detail: '', attention: false }
  }
}

/** The message's context, as the conversation chip shows it. */
function contextLabel(context: MessageContext) {
  if ('order' in context) return `Order · ${context.order}`
  if ('product' in context) return `Product Post · ${PRODUCTS[context.product].name}`
  return `Shoppable Post · ${SHOPPABLE_POSTS[context.post].title}`
}

export default function MobileSellerCompanion({ demoTarget }: { demoTarget?: string }) {
  const initialTab: TabKey = demoTarget === 'inbox' ? 'inbox' : demoTarget === 'order' ? 'orders' : 'alerts'
  const initialScreen: Screen = demoTarget === 'order'
    ? 'order'
    : demoTarget === 'pickup-qr'
      ? 'pickup-qr'
      : 'tabs'
  // The Seller, story moment and records of the guided-flow step (the 10:25 snapshot and surface defaults otherwise).
  // The moment moves past each documented event the Seller performs here.
  const { seller: storySeller, focus } = useStory()
  const [at, advanceTo] = useStoryMoment()
  const sellerId = storySeller ?? SURFACE_DEFAULTS.seller
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [orderId, setOrderId] = useState<OrderId>(focus?.order ?? SURFACE_DEFAULTS.order)
  const advance = (state: OrderState | undefined) => { const t = state && stateTime(orderId, state); if (t) advanceTo(t) }
  const readyState = ORDER_TIMELINES[ORDERS[orderId].fulfilment].find(state => state.startsWith('Ready'))
  const [stage, setStage] = useState<OrderStage>(companionStage(focus?.order ?? SURFACE_DEFAULTS.order, at))
  const [courierId, setCourierId] = useState<CourierId>(ORDERS[focus?.order ?? SURFACE_DEFAULTS.order].courier ?? SURFACE_DEFAULTS.courier)
  const [conversationId, setConversationId] = useState<ConversationId>(focus?.conversation ?? SURFACE_DEFAULTS.conversation)
  const [claimId, setClaimId] = useState<ClaimId | undefined>(openClaims(sellerId, at)[0])
  const [consoleNotice, setConsoleNotice] = useState(false)

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    setScreen('tabs')
  }

  const backToOrder = () => setScreen('order')
  const openOrder = (id: OrderId) => { setOrderId(id); setStage(companionStage(id, at)); setCourierId(ORDERS[id].courier ?? SURFACE_DEFAULTS.courier); setScreen('order') }
  const openConversation = (id: ConversationId) => { setConversationId(id); setScreen('conversation') }
  const openClaim = (id: ClaimId) => { setClaimId(id); setScreen('claim') }
  // The Order's conversation, when the Buyer has one with this Seller.
  const orderConversation = CONVERSATION_IDS.find(id => CONVERSATIONS[id].seller === ORDERS[orderId].seller && CONVERSATIONS[id].buyer === ORDERS[orderId].buyer)

  // Tab badges: alerts needing attention, active Orders awaiting the Seller, and conversations and Claims awaiting a reply.
  const active = activeOrders(sellerId, at)
  const badges: Partial<Record<TabKey, number>> = {
    alerts: notificationsAt(sellerId, at).filter(n => alertFor(n).attention).length,
    orders: active.filter(id => [...NEEDS_PREP, ...READY].includes(orderStateAt(id, at)!)).length,
    inbox: sellerThreads(sellerId, at).filter(({ id }) => awaitingSellerReplyAt(id, at)).length + openClaims(sellerId, at).length,
  }

  return (
    <PhoneFrame label={`06 — SELLER COMPANION · ${SELLERS[sellerId].name.toUpperCase()}`} clock={formatClockShort(at.at)}>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === 'tabs' && (
          <>
            <CompanionHeader tab={activeTab} sellerId={sellerId} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'alerts' && <AlertsTab sellerId={sellerId} at={at} onOrder={openOrder} onClaim={openClaim} onConversation={openConversation} onLowStock={() => selectTab('more')} />}
              {activeTab === 'orders' && <OrdersTab sellerId={sellerId} at={at} onOrder={openOrder} />}
              {activeTab === 'inbox' && <InboxTab sellerId={sellerId} at={at} onConversation={openConversation} onClaim={openClaim} />}
              {activeTab === 'more' && <MoreTab sellerId={sellerId} at={at} notice={consoleNotice} onConsole={() => setConsoleNotice(true)} />}
            </div>
            <BottomNav items={TABS.map(tab => ({ ...tab, badge: badges[tab.key] }))} active={activeTab} onSelect={key => selectTab(key as TabKey)} accent="var(--color-brand)" />
          </>
        )}
        {screen === 'order' && (
          <OrderDetail
            orderId={orderId}
            stage={stage}
            onBack={() => { setActiveTab('orders'); setScreen('tabs') }}
            onPrepare={() => { advance('Preparing'); setStage('preparing'); setScreen('prepare') }}
            onCouriers={() => setScreen(stage === 'offer' ? 'offer' : 'couriers')}
            onPickupQr={() => setScreen('pickup-qr')}
            onDelivery={() => setScreen('delivery')}
            onChat={() => (orderConversation ? openConversation(orderConversation) : undefined)}
          />
        )}
        {screen === 'prepare' && <PrepareOrder orderId={orderId} onBack={backToOrder} onReady={() => { advance(readyState); setStage('ready'); setScreen('couriers') }} />}
        {screen === 'couriers' && <CourierSelection sellerId={sellerId} at={at} onBack={backToOrder} onSelect={id => { const offered = ORDERS[orderId].offer?.offered; if (offered) advanceTo(offered); setCourierId(id); setStage('offer'); setScreen('offer') }} />}
        {screen === 'offer' && <DeliveryOffer orderId={orderId} courierId={courierId} at={at} onBack={() => setScreen('couriers')} assigned={stage === 'assigned'} onAssigned={() => { advance('Courier Assigned'); setStage('assigned') }} onContinue={backToOrder} />}
        {screen === 'pickup-qr' && <SellerPickupQr courierId={courierId} onBack={backToOrder} onVerified={() => { advance('Pickup Verified'); setScreen('pickup-verified') }} />}
        {screen === 'pickup-verified' && <PickupVerified orderId={orderId} courierId={courierId} at={at} onContinue={() => { setStage('pickup'); setScreen('delivery') }} />}
        {screen === 'delivery' && <DeliveryStatus orderId={orderId} courierId={courierId} stage={stage} onBack={backToOrder} onAdvance={() => { advance('Out for Delivery'); setStage('delivery') }} />}
        {screen === 'conversation' && <BuyerConversation conversationId={conversationId} at={at} onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
        {screen === 'claim' && claimId && <ClaimResponse claimId={claimId} at={at} onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
      </div>
    </PhoneFrame>
  )
}

function CompanionHeader({ tab, sellerId }: { tab: TabKey; sellerId: SellerId }) {
  const titles: Record<TabKey, string> = { alerts: 'Alerts', orders: 'Paid Orders', inbox: 'Inbox', more: 'More' }
  const seller = SELLERS[sellerId]
  return (
    <div className="flex h-13 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</div>
        <div><div className="font-display text-base font-semibold">{titles[tab]}</div><div className="text-[10px] text-text-muted">{seller.name}</div></div>
      </div>
      {seller.storeOpen && <span className="rounded-full bg-success-bg px-2 py-1 text-[10px] font-semibold text-success">Store open</span>}
    </div>
  )
}

function ScreenHeader({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return (
    <div className="flex h-13 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <button onClick={onBack} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xl text-text-secondary">‹</button>
      <div className="flex-1 truncate font-display text-lg font-semibold">{title}</div>
      {trailing}
    </div>
  )
}

function AlertsTab({ sellerId, at, onOrder, onClaim, onConversation, onLowStock }: {
  sellerId: SellerId; at: Moment; onOrder: (id: OrderId) => void; onClaim: (id: ClaimId) => void; onConversation: (id: ConversationId) => void; onLowStock: () => void
}) {
  // The Seller's notifications at the story moment: the actionable ones need attention, the rest are updates.
  const rows = notificationsAt(sellerId, at).map(n => {
    const e = n.event
    const time = notificationTime(n)
    const open = () => {
      if (e.kind === 'Claim') onClaim(e.claim)
      else if (e.kind === 'Low stock') onLowStock()
      else if (e.kind === 'Buyer message') onConversation(e.conversation)
      else if ('order' in e) onOrder(e.order)
    }
    return { ...alertFor(n), time: time ? formatAge(time, at.at) : '—', open }
  })
  const attention = rows.filter(row => row.attention)
  const updates = rows.filter(row => !row.attention)
  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Needs attention</span><span className="text-xs text-text-muted">{attention.length} open</span></div>
      {attention.map((row, index) => <AlertRow key={index} tone={row.tone} title={row.title} detail={row.detail} time={row.time} action={row.action} onClick={row.open} />)}
      <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Operational updates</div>
      {updates.length === 0 && <p className="px-4 text-sm text-text-muted">No operational updates</p>}
      {updates.map((row, index) => <AlertRow key={index} tone={row.tone} title={row.title} detail={row.detail} time={row.time} onClick={row.open} />)}
    </div>
  )
}

function AlertRow({ tone, title, detail, time, action, onClick }: {
  tone: Tone; title: string; detail: string; time: string; action?: string; onClick: () => void
}) {
  const colors = {
    brand: 'bg-brand', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-info', success: 'bg-success',
  }
  return (
    <button onClick={onClick} className="flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left">
      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${colors[tone]}`} />
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-text-secondary">{detail}</span></span>
      <span className="text-right"><span className="block text-[10px] text-text-muted">{time}</span>{action && <span className="mt-1 block text-xs font-semibold text-brand">{action}</span>}</span>
    </button>
  )
}

function OrdersTab({ sellerId, at, onOrder }: { sellerId: SellerId; at: Moment; onOrder: (id: OrderId) => void }) {
  // The Seller's active Orders at the story moment, with each one's state as DEMO_DATA's timeline gives it.
  const orders = activeOrders(sellerId, at).map(id => {
    const state = orderStateAt(id, at)!
    const order = ORDERS[id]
    const tone = state === 'Paid' ? 'brand' : NEEDS_PREP.includes(state) ? 'warning' : READY.includes(state) ? 'success' : 'info'
    return { id, buyer: shortName(BUYERS[order.buyer].name), item: orderItems(id), status: state === 'Paid' ? 'Paid · Needs prep' : state, state, tone }
  })
  const count = (states: readonly OrderState[]) => orders.filter(order => states.includes(order.state)).length
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
        <Pill active>Active {orders.length}</Pill><Pill>Needs prep {count(NEEDS_PREP)}</Pill><Pill>Ready {count(READY)}</Pill><Pill>Delivery {orders.length - count(NEEDS_PREP) - count(READY)}</Pill>
      </div>
      {orders.map(order => (
        <button key={order.id} onClick={() => onOrder(order.id)} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted font-mono text-[10px] font-bold text-brand-dark">{order.id.slice(-3)}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{order.item}</span><span className="text-xs text-text-muted">{order.buyer} · {order.id}</span><StatusText tone={order.tone}>{order.status}</StatusText></span>
          <IconChevronRight size={16} />
        </button>
      ))}
    </div>
  )
}

function OrderDetail({ orderId, stage, onBack, onPrepare, onCouriers, onPickupQr, onDelivery, onChat }: {
  orderId: OrderId; stage: OrderStage; onBack: () => void; onPrepare: () => void; onCouriers: () => void; onPickupQr: () => void; onDelivery: () => void; onChat: () => void
}) {
  const stageLabels: Record<OrderStage, string> = {
    paid: 'Paid · Needs Preparation', preparing: 'Preparing', ready: 'Ready for Courier',
    offer: 'Delivery Offer Sent', assigned: 'Courier Assigned', pickup: 'Pickup Verified', delivery: 'Out for Delivery',
  }
  const order = ORDERS[orderId]
  const buyer = BUYERS[order.buyer]
  return (
    <>
      <ScreenHeader title={orderId} onBack={onBack} trailing={<button onClick={onChat} className="rounded-lg bg-surface-raised px-3 py-2 text-xs font-semibold text-brand">Chat</button>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-brand-muted p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark">Current status</div>
          <div className="mt-1 font-display text-xl font-semibold">{stageLabels[stage]}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary"><span className="rounded-full bg-success-bg px-2 py-1 font-semibold text-success">Paid · read-only</span><span>Provider confirmed</span></div>
        </div>

        <SectionTitle>Products</SectionTitle>
        <div className="rounded-xl border border-border p-3">
          {order.lines.map(line => <div key={line.product}><div className="text-sm font-semibold">{PRODUCTS[line.product].name}</div><div className="mt-1 text-xs text-text-muted">{lineOptions(line)} · Quantity {line.quantity}</div></div>)}
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span className="text-text-secondary">Paid total</span><span className="font-bold">{formatEtb(orderTotals(orderId).total)}</span></div>
        </div>

        <SectionTitle>Buyer-safe fulfilment info</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm"><div className="font-semibold">{shortName(buyer.name)}</div><div className="mt-1 text-xs text-text-secondary">{order.fulfilment} · {buyer.deliveryArea ?? '—'}, {MARKET.city}</div><div className="mt-1 text-xs text-text-muted">Phone details are shared only with the assigned approved courier.</div></div>

        <SectionTitle>Operational progress</SectionTitle>
        <OrderTimeline events={sellerTimeline(stage)} />

        <SectionTitle>Allowed actions</SectionTitle>
        <div className="flex flex-col gap-2">
          {stage === 'paid' && <Button onClick={onPrepare}>Prepare Order</Button>}
          {stage === 'preparing' && <Button onClick={onPrepare}>Continue Preparation</Button>}
          {stage === 'ready' && <Button onClick={onCouriers}>Select Approved Courier</Button>}
          {stage === 'offer' && <Button onClick={onCouriers}>View Delivery Offer</Button>}
          {stage === 'assigned' && <Button onClick={onPickupQr}>Display Seller Pickup QR</Button>}
          {(stage === 'pickup' || stage === 'delivery') && <Button onClick={onDelivery}>View Delivery Status</Button>}
          <Button variant="tertiary" onClick={onChat}>Chat with Buyer</Button>
        </div>
        <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Payment status is read-only and established by the provider and Adulis backend. Seller actions cannot change it.</div>
      </div>
    </>
  )
}

function sellerTimeline(stage: OrderStage): TimelineEvent[] {
  const order: OrderStage[] = ['paid', 'preparing', 'ready', 'offer', 'assigned', 'pickup', 'delivery']
  const current = order.indexOf(stage)
  // The Order states' own names (rule 4.4); the Delivery Offer is the step between them.
  const labels: Record<OrderStage, string> = {
    paid: 'Paid', preparing: 'Preparing', ready: 'Ready for Courier', offer: 'Delivery Offer',
    assigned: 'Courier Assigned', pickup: 'Pickup Verified', delivery: 'Out for Delivery',
  }
  return order.map((key, index) => ({
    id: key,
    label: labels[key],
    status: index < current ? 'completed' : index === current ? 'active' : 'pending',
    detail: key === 'paid' ? 'Read-only provider confirmation' : key === 'pickup' ? 'Courier scans Seller Pickup QR' : undefined,
  }))
}

function PrepareOrder({ orderId, onBack, onReady }: { orderId: OrderId; onBack: () => void; onReady: () => void }) {
  const [checks, setChecks] = useState([false, false, false])
  const labels = ['Product and variant checked', 'Item quality inspected', `Package labelled for ${orderId}`]
  const toggle = (index: number) => setChecks(values => values.map((value, i) => i === index ? !value : value))
  const lines = ORDERS[orderId].lines
  return (
    <>
      <ScreenHeader title="Prepare Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-surface-raised p-3"><div className="text-xs text-text-muted">{orderId}</div><div className="mt-1 text-sm font-semibold">{lines.map(line => PRODUCTS[line.product].name).join(', ')}</div><div className="text-xs text-text-muted">{lines.map(lineOptions).join(' · ')}</div></div>
        <SectionTitle>Preparation checklist</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border">
          {labels.map((label, index) => <button key={label} onClick={() => toggle(index)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0"><span className={`flex h-6 w-6 items-center justify-center rounded-md border ${checks[index] ? 'border-success bg-success text-white' : 'border-border-strong'}`}>{checks[index] && '✓'}</span><span className="text-sm font-medium">{label}</span></button>)}
        </div>
        <div className="mt-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Mark Ready only after the package is physically prepared for courier pickup.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!checks.every(Boolean)} onClick={onReady} style={{ width: '100%' }}>Mark Ready</Button></div>
    </>
  )
}

function CourierSelection({ sellerId, at, onBack, onSelect }: { sellerId: SellerId; at: Moment; onBack: () => void; onSelect: (id: CourierId) => void }) {
  // The Seller's approved Couriers at the story moment. The card shows this Seller's own figures only (rule 7.3);
  // its total-deliveries figure is WO-008's. DEMO_DATA defines no on-time rate.
  const pool = COURIER_RELATIONSHIPS.filter(r => r.seller === sellerId && relationshipStatusAt(r, at) === 'Approved')
  const compensation = courierCompensationAt(sellerId, at)
  return (
    <>
      <ScreenHeader title="Approved Courier Pool" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm leading-relaxed text-text-secondary">Select from couriers approved by {SELLERS[sellerId].name}. Compensation is visible before an offer is sent.</p>
        {pool.map(r => {
          const availability = courierAvailabilityAt(r.courier, at)
          const approved = typeof r.approved === 'string' ? r.approved : r.approved.at
          return <CourierCard key={r.courier} name={COURIERS[r.courier].name} initials={initials(COURIERS[r.courier].name)} availability={availability} relationship={`Approved · ${formatDate(approved)}`} compensation={compensation === undefined ? '—' : formatEtb(compensation)} work={`${completedForSellerAt(r.courier, sellerId, at)} completed`} disabled={availability !== 'Available'} onSelect={() => onSelect(r.courier)} />
        })}
      </div>
    </>
  )
}

function CourierCard({ name, initials, availability, relationship, compensation, work, onSelect, disabled }: {
  name: string; initials: string; availability: string; relationship: string; compensation: string; work: string; onSelect: () => void; disabled?: boolean
}) {
  return (
    <div className={`mt-4 rounded-2xl border border-border p-4 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-bg font-bold text-info">{initials}</span><span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className={`text-xs ${disabled ? 'text-text-muted' : 'text-success'}`}>{availability}</span></span><span className="text-sm font-bold text-brand">{compensation}</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-raised p-3 text-xs"><span><span className="block text-text-muted">Relationship</span><span className="font-medium">{relationship}</span></span><span><span className="block text-text-muted">Relevant work</span><span className="font-medium">{work}</span></span></div>
      <Button size="sm" variant="secondary" disabled={disabled} onClick={onSelect} style={{ width: '100%', marginTop: 12 }}>Send Delivery Offer</Button>
    </div>
  )
}

function DeliveryOffer({ orderId, courierId, at, onBack, assigned, onAssigned, onContinue }: { orderId: OrderId; courierId: CourierId; at: Moment; onBack: () => void; assigned: boolean; onAssigned: () => void; onContinue: () => void }) {
  const courier = COURIERS[courierId].name
  const firstName = courier.split(' ')[0]
  const compensation = courierCompensationAt(ORDERS[orderId].seller, at)
  return (
    <>
      <ScreenHeader title="Delivery Offer" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${assigned ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{assigned ? <CheckIcon /> : <OfferIcon />}</span>
        <div className="mt-5 font-display text-2xl font-semibold">{assigned ? 'Courier Assigned' : `Offer sent to ${courier}`}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{assigned ? `${firstName} accepted the delivery. Prepare to display the Seller Pickup QR when they arrive.` : `Waiting for ${firstName} to accept or decline. The order remains Ready for Courier.`}</p>
        <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left"><InfoRow label="Order" value={orderId} /><InfoRow label="Compensation" value={compensation === undefined ? '—' : formatEtb(compensation)} /><InfoRow label="Courier" value={courier} /></div>
        {!assigned ? <Button onClick={onAssigned} style={{ width: '100%', marginTop: 24 }}>Simulate courier acceptance</Button> : <Button onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue to Order</Button>}
      </div>
    </>
  )
}

function SellerPickupQr({ courierId, onBack, onVerified }: { courierId: CourierId; onBack: () => void; onVerified: () => void }) {
  return (
    <>
      <ScreenHeader title="Seller Pickup QR" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl bg-surface p-5 shadow-lg ring-1 ring-border"><QrPattern /></div>
        <div className="mt-5 font-display text-2xl font-semibold">Display this QR to the courier</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{COURIERS[courierId].name} scans this Seller Pickup QR after receiving the sealed package.</p>
        <div className="mt-5 w-full rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Keep the package until the courier scan is verified. This QR is for pickup only.</div>
      </div>
      <div className="p-4 pb-6"><Button onClick={onVerified} size="lg" style={{ width: '100%' }}>Simulate courier scan</Button></div>
    </>
  )
}

function PickupVerified({ orderId, courierId, at, onContinue }: { orderId: OrderId; courierId: CourierId; at: Moment; onContinue: () => void }) {
  // DEMO_DATA's pickup scan time for the Order.
  const verified = stateTime(orderId, 'Pickup Verified')
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Pickup Verified</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{COURIERS[courierId].name} scanned the Seller Pickup QR. The package is now in courier custody.</p>
      <div className="mt-6 w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Order" value={orderId} /><InfoRow label="Verified" value={verified ? `${verified.slice(0, 10) === at.at.slice(0, 10) ? 'Today' : formatDayMonth(verified)} · ${formatClock(verified)}` : '—'} /><InfoRow label="Courier" value={COURIERS[courierId].name} /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>View Delivery Status</Button>
    </div>
  )
}

function DeliveryStatus({ orderId, courierId, stage, onBack, onAdvance }: { orderId: OrderId; courierId: CourierId; stage: OrderStage; onBack: () => void; onAdvance: () => void }) {
  const out = stage === 'delivery'
  const time = (state: OrderState) => { const t = stateTime(orderId, state); return t && formatClock(t) }
  // The timeline's steps are the Order's remaining states (rule 4.4), with DEMO_DATA's times.
  const events: TimelineEvent[] = [
    { id: 'pickup', label: 'Pickup Verified', status: 'completed', timestamp: time('Pickup Verified'), detail: 'Seller Pickup QR scanned' },
    { id: 'route', label: 'Out for Delivery', status: out ? 'completed' : 'active', timestamp: out ? time('Out for Delivery') : undefined, detail: 'Operational status update' },
    { id: 'handoff', label: 'Delivery Handoff', status: out ? 'active' : 'pending', detail: 'Courier displays Delivery QR; buyer scans' },
    { id: 'done', label: 'Completed', status: 'pending' },
  ]
  return (
    <>
      <ScreenHeader title="Delivery Status" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-info-bg p-4"><div className="text-xs font-semibold uppercase tracking-wider text-info">Operational progress</div><div className="mt-1 font-display text-xl font-semibold">{out ? 'Out for Delivery' : 'Pickup Verified'}</div><div className="mt-1 text-xs text-text-secondary">Courier: {COURIERS[courierId].name} · {orderId}</div></div>
        <SectionTitle>Timeline</SectionTitle>
        <OrderTimeline events={events} />
        <div className="mt-5 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">Delivery is shown through verified statuses and checkpoints. No live courier map is available.</div>
        {!out && <Button onClick={onAdvance} variant="tertiary" style={{ width: '100%', marginTop: 16 }}>Preview Out for Delivery</Button>}
      </div>
    </>
  )
}

function InboxTab({ sellerId, at, onConversation, onClaim }: { sellerId: SellerId; at: Moment; onConversation: (id: ConversationId) => void; onClaim: (id: ClaimId) => void }) {
  // The Seller's conversations, latest first, marked while the Buyer awaits a reply; then Claims awaiting a response.
  return (
    <div>
      {sellerThreads(sellerId, at).map(({ id, last }) => {
        const buyer = BUYERS[CONVERSATIONS[id].buyer].name
        return <button key={id} onClick={() => onConversation(id)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials={initials(buyer)} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">{shortName(buyer)}</span><span className="text-[10px] text-text-muted">{formatAge(last.at, at.at)}</span></span><span className="block truncate text-xs text-text-muted">{last.text}</span><span className="mt-1 inline-block rounded-full bg-brand-muted px-2 py-0.5 text-[10px] text-brand-dark">{contextLabel(last.context)}</span></span>{awaitingSellerReplyAt(id, at) && <span role="img" aria-label="Needs reply" title="Needs reply" className="h-2 w-2 rounded-full bg-brand" />}</button>
      })}
      {openClaims(sellerId, at).map(id => {
        const buyer = BUYERS[ORDERS[CLAIMS[id].order].buyer].name
        const deadline = CLAIMS[id].responseDeadline
        return <button key={id} onClick={() => onClaim(id)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials={initials(buyer)} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">{shortName(buyer)}</span><span className="text-[10px] text-danger">{deadline ? `Due ${formatDayMonth(deadline)}` : '—'}</span></span><span className="block truncate text-xs text-text-muted">Claim response requested</span><span className="mt-1 inline-block rounded-full bg-danger-bg px-2 py-0.5 text-[10px] text-danger">Claim · {id}</span></span></button>
      })}
    </div>
  )
}

function BuyerConversation({ conversationId, at, onBack }: { conversationId: ConversationId; at: Moment; onBack: () => void }) {
  const [context, setContext] = useState('Order')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  // The messages so far: the Seller team's are this side's. The Order chip names the pair's most recent Order.
  const { buyer, seller } = CONVERSATIONS[conversationId]
  const latestOrder = ordersAt({ buyer, seller }, at).sort((a, b) => paidAt(b).localeCompare(paidAt(a)))[0]
  return (
    <>
      <ScreenHeader title={shortName(BUYERS[buyer].name)} onBack={onBack} />
      <div className="border-b border-border bg-warning-bg px-4 py-2 text-[10px] leading-relaxed text-text-secondary">Chat supports coordination. It does not change payment, pickup, delivery, claim, or Order truth.</div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">{['Product', 'Post', 'Order'].map(item => <Pill key={item} active={context === item} onClick={() => setContext(item)}>{item === 'Order' && latestOrder ? latestOrder : item}</Pill>)}</div>
      <div className="flex-1 overflow-y-auto bg-surface-raised p-4">
        {messagesAt(conversationId, at).map((m, index) => <Bubble key={index} mine={m.from !== 'buyer'}>{m.text}</Bubble>)}
        {sent && <Bubble mine>{message || 'Thank you.'}</Bubble>}
      </div>
      <div className="border-t border-border bg-surface p-3 pb-5">
        <div className="mb-2 flex gap-2 overflow-x-auto"><Pill onClick={() => setMessage('Your order is ready for courier pickup.')}>Order ready</Pill><Pill onClick={() => setMessage('A courier has been assigned.')}>Courier assigned</Pill></div>
        <div className="flex gap-2"><div className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary">{message || `Message about ${context.toLowerCase()}`}</div><Button size="sm" onClick={() => setSent(true)}>Send</Button></div>
      </div>
    </>
  )
}

function ClaimResponse({ claimId, at, onBack }: { claimId: ClaimId; at: Moment; onBack: () => void }) {
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const claim = CLAIMS[claimId]
  const deadline = claim.responseDeadline
  // The Claim's own state: a Seller response doesn't change it (an Operator takes the Claim into review).
  const state = claimStateAt(claimId, at) ?? 'Open'
  return (
    <>
      <ScreenHeader title="Claim Response" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-danger-bg p-4"><div className="text-xs font-semibold uppercase tracking-wider text-danger">{deadline ? `Response due ${formatDayMonth(deadline)} ${formatClock(deadline)}` : 'Response due —'}</div><div className="mt-1 font-display text-xl font-semibold">{claim.issue}</div><div className="mt-1 text-xs text-text-secondary">{claimId} · Order {claim.order}</div></div>
        <SectionTitle>Buyer report</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm leading-relaxed text-text-secondary">“{claim.statement}”</div>
        <SectionTitle>Submitted evidence</SectionTitle>
        <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-surface-raised text-xs text-text-muted">{claim.evidencePhotos} Buyer photo{claim.evidencePhotos === 1 ? '' : 's'}</div>
        <div className="mt-5"><Textarea label="Seller response" value={response} onChange={event => setResponse(event.target.value)} placeholder="Respond with relevant preparation and product details." rows={5} /></div>
        {submitted && <div className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Response submitted · Claim {state.toLowerCase()}</div>}
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!response || submitted} onClick={() => setSubmitted(true)} style={{ width: '100%' }}>{submitted ? 'Response Submitted' : 'Submit Claim Response'}</Button></div>
    </>
  )
}

function MoreTab({ sellerId, at, notice, onConsole }: { sellerId: SellerId; at: Moment; notice: boolean; onConsole: () => void }) {
  // The Seller's low-stock Products (the inventory warning).
  const lowStock = sellerProductsAt(sellerId, at).filter(id => PRODUCTS[id].availability === 'Low Stock')
  return (
    <div className="p-4">
      {lowStock.map((id, index) => <div key={id} className={`${index ? 'mt-3 ' : ''}rounded-2xl bg-warning-bg p-4`}><div className="text-xs font-semibold uppercase tracking-wider text-warning">Low stock</div><div className="mt-1 font-display text-lg font-semibold">{PRODUCTS[id].name}</div><div className="mt-1 text-sm text-text-secondary">{PRODUCTS[id].stock} remaining · Review inventory in Seller Console</div></div>)}
      <SectionTitle>Seller tools</SectionTitle>
      <button onClick={onConsole} className="flex w-full items-center gap-3 rounded-xl border border-border p-4 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted font-bold text-brand-dark">SC</span><span className="flex-1"><span className="block text-sm font-semibold">Open Seller Console</span><span className="text-xs text-text-muted">Products, content, team and full administration</span></span><IconChevronRight size={16} /></button>
      {notice && <div className="mt-3 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Seller Console would open in your browser. Full administration is intentionally not included in Seller Companion.</div>}
      <p className="mt-6 text-center text-xs leading-relaxed text-text-muted">Seller Companion is for urgent operations only. Product, content and team administration remain in Seller Console.</p>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{children}</button>
}

function StatusText({ children, tone }: { children: ReactNode; tone: string }) {
  const classes: Record<string, string> = { brand: 'text-brand', warning: 'text-warning', success: 'text-success', info: 'text-info' }
  return <span className={`mt-1 block text-[10px] font-semibold ${classes[tone]}`}>{children}</span>
}

function Avatar({ initials }: { initials: string }) {
  return <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand-muted text-xs font-bold text-brand-dark">{initials}</span>
}

function Bubble({ children, mine }: { children: ReactNode; mine?: boolean }) {
  return <div className={`mb-3 max-w-[82%] rounded-2xl p-3 text-sm shadow-sm ${mine ? 'ml-auto rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-surface'}`}>{children}</div>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 flex items-center justify-between gap-3 text-sm last:mb-0"><span className="text-text-muted">{label}</span><span className="font-semibold">{value}</span></div>
}

function QrPattern() {
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" aria-label="Seller Pickup QR">
      <rect width="190" height="190" rx="12" fill="white" />
      {[12, 122].map(x => [12, 122].map(y => <g key={`${x}-${y}`}><rect x={x} y={y} width="56" height="56" rx="4" fill="var(--color-text-primary)"/><rect x={x + 10} y={y + 10} width="36" height="36" rx="2" fill="white"/><rect x={x + 19} y={y + 19} width="18" height="18" fill="var(--color-text-primary)"/></g>))}
      <rect x="12" y="12" width="56" height="56" rx="4" fill="var(--color-text-primary)"/><rect x="22" y="22" width="36" height="36" rx="2" fill="white"/><rect x="31" y="31" width="18" height="18" fill="var(--color-text-primary)"/>
      {[78, 94, 110, 126, 142, 158].flatMap((x, i) => [16, 32, 48, 78, 94, 110, 142, 158].map((y, j) => (i + j) % 3 !== 1 && <rect key={`${x}-${y}`} x={x} y={y} width="10" height="10" rx="1" fill="var(--color-text-primary)"/>))}
    </svg>
  )
}

function CheckIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function OfferIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 7h11v10H4zM15 10h3l2 3v4h-5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="1.7"/><circle cx="17" cy="18" r="2" stroke="currentColor" strokeWidth="1.7"/></svg>
}
