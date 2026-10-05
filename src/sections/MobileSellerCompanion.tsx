import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Textarea, TextInput } from '../components/ui/Input'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  PhoneFrame, BottomNav, IconAlerts, IconOrders, IconInbox, IconMore, IconChevronDown, IconChevronRight,
} from './ShellHelpers'
import { useStory, useStoryMoment } from '../StoryClock'
import {
  BUYERS, CLAIMS, CLAIM_IDS, CONTEXT_GROUPS, CONVERSATIONS, CONVERSATION_IDS, COURIERS, COURIER_RELATIONSHIPS, GENERAL_CONTEXT, MARKET, ORDERS, ORDER_TIMELINES,
  PRODUCTS, SELLERS, STAFF, SURFACE_DEFAULTS,
  awaitingSellerReplyAt, byMessageTime, claimStateAt, completedForSellerAt, contextChoicesAt, contextKey, contextSubject, courierAvailabilityAt,
  courierCompensationAt, effectiveMessagesAt, formatAge, formatClock, formatClockShort, formatDate, formatDayMonth, formatEtb, happenedBefore, initials,
  lineOptions, messagesAt, notificationTime, notificationsAt, ordersAt, orderStateAt, orderTotals, paidAt, preparationAt, readyStateFor, relationshipStatusAt,
  sameContext, sellerProductsAt, sellerReplyDueAt, sessionStaffOn, shortName, showcaseSellers, stateTime,
  type ClaimId, type ConversationId, type CourierId, type MessageContext, type MessageRecord, type Moment, type NotificationRecord, type OrderId,
  type OrderState, type SellerId, type Timestamp,
} from '../demo-data'

type TabKey = 'alerts' | 'orders' | 'inbox' | 'more'
type Screen = 'tabs' | 'order' | 'prepare' | 'couriers' | 'offer' | 'pickup-qr' | 'pickup-verified' | 'delivery' | 'handoff-qr' | 'handoff-otp' | 'handoff-verified' | 'conversation' | 'claim'
type HandoffMethod = 'QR' | 'OTP fallback'
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

export default function MobileSellerCompanion({ demoTarget }: { demoTarget?: string }) {
  // The story moment of the guided-flow step (the 10:25 snapshot otherwise); it moves past each documented event the
  // Seller performs here. The Companion opens on the step's Seller (the default Seller otherwise), and the Seller
  // context selector (specification §23) switches between the primary showcase Sellers.
  const { seller: storySeller } = useStory()
  const [at, advanceTo] = useStoryMoment()
  const initialSeller = storySeller ?? SURFACE_DEFAULTS.seller
  const [sellerId, setSellerId] = useState<SellerId>(initialSeller)
  return (
    <PhoneFrame label={`06 — SELLER COMPANION · ${SELLERS[sellerId].name.toUpperCase()}`} clock={formatClockShort(at.at)}>
      {/* Keyed by Seller: switching starts again from the selected Seller's records, on its Alerts. */}
      <SellerCompanionApp key={sellerId} sellerId={sellerId} at={at} advanceTo={advanceTo} demoTarget={sellerId === initialSeller ? demoTarget : undefined} onSwitchSeller={setSellerId} />
    </PhoneFrame>
  )
}

function SellerCompanionApp({ sellerId, at, advanceTo, demoTarget, onSwitchSeller }: {
  sellerId: SellerId; at: Moment; advanceTo: (event: Moment | string) => void; demoTarget?: string; onSwitchSeller: (id: SellerId) => void
}) {
  const initialTab: TabKey = demoTarget === 'inbox' ? 'inbox' : demoTarget === 'order' ? 'orders' : 'alerts'
  const initialScreen: Screen = demoTarget === 'order'
    ? 'order'
    : demoTarget === 'pickup-qr'
      ? 'pickup-qr'
      : 'tabs'
  // The step's records (the surface defaults otherwise) when they belong to this Seller; else the Seller's own.
  const { focus } = useStory()
  const initialOrder = [focus?.order, SURFACE_DEFAULTS.order].find(id => id && ORDERS[id].seller === sellerId) ?? activeOrders(sellerId, at)[0] ?? ordersAt({ seller: sellerId }, at)[0]
  const initialConversation = [focus?.conversation, SURFACE_DEFAULTS.conversation].find(id => id && CONVERSATIONS[id].seller === sellerId) ?? sellerThreads(sellerId, at)[0]?.id
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [orderId, setOrderId] = useState<OrderId | undefined>(initialOrder)
  const advance = (state: OrderState | undefined) => { const t = orderId && state && stateTime(orderId, state); if (t) advanceTo(t) }
  const fulfilment = orderId && ORDERS[orderId].fulfilment
  const readyState = fulfilment ? readyStateFor(fulfilment) : undefined
  const [stage, setStage] = useState<OrderStage>(initialOrder ? companionStage(initialOrder, at) : 'paid')
  const [courierId, setCourierId] = useState<CourierId>((initialOrder && ORDERS[initialOrder].courier) ?? SURFACE_DEFAULTS.courier)
  const [conversationId, setConversationId] = useState<ConversationId | undefined>(initialConversation)
  // Replies sent from the Companion in this session, per conversation, each with the context it was sent with. They are
  // transient: a reset remounts the Companion without them.
  const [sentReplies, setSentReplies] = useState<Partial<Record<ConversationId, readonly MessageRecord[]>>>({})
  const [claimId, setClaimId] = useState<ClaimId | undefined>(openClaims(sellerId, at)[0])
  const [consoleNotice, setConsoleNotice] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [handoffMethod, setHandoffMethod] = useState<HandoffMethod>('QR')
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    setScreen('tabs')
  }

  const backToOrder = () => setScreen('order')
  const openOrder = (id: OrderId) => { setOrderId(id); setStage(companionStage(id, at)); setCourierId(ORDERS[id].courier ?? SURFACE_DEFAULTS.courier); setNotice(undefined); setScreen('order') }
  const openConversation = (id: ConversationId) => { setConversationId(id); setScreen('conversation') }
  const openClaim = (id: ClaimId) => { setClaimId(id); setScreen('claim') }
  // Mark Ready: Courier Delivery continues to the approved Courier Pool (rule 6.11); Seller Delivery and Buyer
  // Collection have no Courier step (rule 4.7), so the Order shows its new state with a confirmation.
  const markReady = () => {
    advance(readyState)
    setStage('ready')
    if (fulfilment === 'Courier Delivery') setScreen('couriers')
    else { setNotice(`Marked ${readyState}`); setScreen('order') }
  }
  // Seller Delivery after Ready (rules 4.5, 8.8, 8.10): the Seller sets out, then opens the final handoff by displaying
  // the Delivery QR; the Buyer's verified scan, or the OTP fallback, completes the Order. There is no Courier step
  // and no location checkpoint (rules 4.7, 9.6). Each step moves the story moment to DEMO_DATA's time for it.
  const startSellerDelivery = () => { advance('Out for Seller Delivery'); setStage('delivery'); setNotice('Seller Delivery started') }
  const openHandoff = () => { advance('Delivery Handoff'); setNotice(undefined); setScreen('handoff-qr') }
  const completeHandoff = (method: HandoffMethod) => { advance('Completed'); setHandoffMethod(method); setScreen('handoff-verified') }
  // The Order's conversation, when the Buyer has one with this Seller.
  const orderConversation = orderId && CONVERSATION_IDS.find(id => CONVERSATIONS[id].seller === ORDERS[orderId].seller && CONVERSATIONS[id].buyer === ORDERS[orderId].buyer)

  // Tab badges: alerts needing attention, active Orders awaiting the Seller, and conversations and Claims awaiting a reply.
  const active = activeOrders(sellerId, at)
  const badges: Partial<Record<TabKey, number>> = {
    alerts: notificationsAt(sellerId, at).filter(n => alertFor(n).attention).length,
    orders: active.filter(id => [...NEEDS_PREP, ...READY].includes(orderStateAt(id, at)!)).length,
    inbox: sellerThreads(sellerId, at).filter(({ id }) => awaitingSellerReplyAt(id, at)).length + openClaims(sellerId, at).length,
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {screen === 'tabs' && (
        <>
          <CompanionHeader tab={activeTab} sellerId={sellerId} onSwitchSeller={() => setSwitcherOpen(true)} />
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'alerts' && <AlertsTab sellerId={sellerId} at={at} onOrder={openOrder} onClaim={openClaim} onConversation={openConversation} onLowStock={() => selectTab('more')} />}
            {activeTab === 'orders' && <OrdersTab sellerId={sellerId} at={at} onOrder={openOrder} />}
            {activeTab === 'inbox' && <InboxTab sellerId={sellerId} at={at} sent={sentReplies} onConversation={openConversation} onClaim={openClaim} />}
            {activeTab === 'more' && <MoreTab sellerId={sellerId} at={at} notice={consoleNotice} onConsole={() => setConsoleNotice(true)} />}
          </div>
          <BottomNav items={TABS.map(tab => ({ ...tab, badge: badges[tab.key] }))} active={activeTab} onSelect={key => selectTab(key as TabKey)} accent="var(--color-brand)" />
        </>
      )}
      {screen === 'order' && orderId && (
        <OrderDetail
          orderId={orderId}
          stage={stage}
          at={at}
          notice={notice}
          onBack={() => { setActiveTab('orders'); setScreen('tabs') }}
          onPrepare={() => { advance('Preparing'); setStage('preparing'); setScreen('prepare') }}
          onCouriers={() => setScreen(stage === 'offer' ? 'offer' : 'couriers')}
          onPickupQr={() => setScreen('pickup-qr')}
          onDelivery={() => setScreen('delivery')}
          onStartSellerDelivery={startSellerDelivery}
          onHandoff={openHandoff}
          onChat={() => (orderConversation ? openConversation(orderConversation) : undefined)}
        />
      )}
      {screen === 'handoff-qr' && orderId && <SellerDeliveryQr orderId={orderId} onBack={backToOrder} onScanned={() => completeHandoff('QR')} onOtp={() => setScreen('handoff-otp')} />}
      {screen === 'handoff-otp' && orderId && <HandoffOtp orderId={orderId} onBack={() => setScreen('handoff-qr')} onVerified={() => completeHandoff('OTP fallback')} />}
      {screen === 'handoff-verified' && orderId && <HandoffVerified orderId={orderId} at={at} method={handoffMethod} onContinue={() => { setNotice('Delivery verified · Order Completed'); setScreen('order') }} />}
      {screen === 'prepare' && orderId && <PrepareOrder orderId={orderId} onBack={backToOrder} onReady={markReady} />}
      {screen === 'couriers' && orderId && <CourierSelection sellerId={sellerId} at={at} onBack={backToOrder} onSelect={id => { const offered = ORDERS[orderId].offer?.offered; if (offered) advanceTo(offered); setCourierId(id); setStage('offer'); setScreen('offer') }} />}
      {screen === 'offer' && orderId && <DeliveryOffer orderId={orderId} courierId={courierId} at={at} onBack={() => setScreen('couriers')} assigned={stage === 'assigned'} onAssigned={() => { advance('Courier Assigned'); setStage('assigned') }} onContinue={backToOrder} />}
      {screen === 'pickup-qr' && <SellerPickupQr courierId={courierId} onBack={backToOrder} onVerified={() => { advance('Pickup Verified'); setScreen('pickup-verified') }} />}
      {screen === 'pickup-verified' && orderId && <PickupVerified orderId={orderId} courierId={courierId} at={at} onContinue={() => { setStage('pickup'); setScreen('delivery') }} />}
      {screen === 'delivery' && orderId && <DeliveryStatus orderId={orderId} courierId={courierId} stage={stage} onBack={backToOrder} onAdvance={() => { advance('Out for Delivery'); setStage('delivery') }} />}
      {screen === 'conversation' && conversationId && <BuyerConversation conversationId={conversationId} at={at} sent={sentReplies[conversationId] ?? []} onSend={message => setSentReplies(all => ({ ...all, [conversationId]: [...(all[conversationId] ?? []), { ...message, sequence: Object.values(all).reduce((n, list) => n + (list?.length ?? 0), 0) + 1 }] }))} onDocumentedReply={advanceTo} onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
      {screen === 'claim' && claimId && <ClaimResponse claimId={claimId} at={at} onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
      {switcherOpen && <SellerSwitcher current={sellerId} onClose={() => setSwitcherOpen(false)} onSelect={id => { setSwitcherOpen(false); if (id !== sellerId) onSwitchSeller(id) }} />}
    </div>
  )
}

function CompanionHeader({ tab, sellerId, onSwitchSeller }: { tab: TabKey; sellerId: SellerId; onSwitchSeller: () => void }) {
  const titles: Record<TabKey, string> = { alerts: 'Alerts', orders: 'Paid Orders', inbox: 'Inbox', more: 'More' }
  const seller = SELLERS[sellerId]
  return (
    <div className="flex h-13 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <button onClick={onSwitchSeller} aria-haspopup="dialog" aria-label={`${titles[tab]} · ${seller.name}. Switch Seller`} className="flex items-center gap-2 text-left">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</div>
        <div><div className="font-display text-base font-semibold">{titles[tab]}</div><div className="flex items-center gap-1 text-[10px] text-text-muted">{seller.name}<IconChevronDown size={10} /></div></div>
      </button>
      {seller.storeOpen && <span className="rounded-full bg-success-bg px-2 py-1 text-[10px] font-semibold text-success">Store open</span>}
    </div>
  )
}

/** The Seller context selector (specification §23), as a sheet inside the phone. */
function SellerSwitcher({ current, onClose, onSelect }: { current: SellerId; onClose: () => void; onSelect: (id: SellerId) => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Switch Seller" className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="rounded-t-3xl bg-surface px-4 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="font-display text-lg font-semibold">Switch Seller</div>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">Prototype · demo Sellers</div>
        {showcaseSellers().map(id => (
          <button key={id} autoFocus={id === current} onClick={() => onSelect(id)} aria-current={id === current ? 'true' : undefined} className={`mb-2 flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left ${id === current ? 'border-brand bg-brand-muted' : 'border-border'}`}>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">{initials(SELLERS[id].name)}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{SELLERS[id].name}</span><span className="text-xs text-text-muted">{SELLERS[id].category} · {SELLERS[id].handle}</span></span>
            {id === current && <span className="text-xs font-semibold text-brand">Current</span>}
          </button>
        ))}
      </div>
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
      {orders.length === 0 && <p className="px-6 py-12 text-center text-sm text-text-muted">No active Paid Orders</p>}
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

/** The Order's state as the Companion step names it: the Order's own mode-specific state (rules 4.4–4.7). */
function stageLabel(orderId: OrderId, stage: OrderStage, at: Moment): string {
  const order = ORDERS[orderId]
  const courierMode = order.fulfilment === 'Courier Delivery'
  const states = ORDER_TIMELINES[order.fulfilment]
  // Past Ready, Seller Delivery sets out (Out for Seller Delivery) and Buyer Collection goes to its handoff.
  const afterReady = states[states.indexOf(readyStateFor(order.fulfilment)) + 1]
  const labels: Record<OrderStage, string> = {
    paid: 'Paid · Needs Preparation', preparing: 'Preparing', ready: readyStateFor(order.fulfilment),
    offer: 'Delivery Offer Sent', assigned: 'Courier Assigned', pickup: 'Pickup Verified', delivery: courierMode ? 'Out for Delivery' : afterReady,
  }
  // A Seller Delivery or Buyer Collection Order further along shows the state it has actually reached.
  const reached = orderStateAt(orderId, at)
  return stage === 'delivery' && !courierMode && reached && states.indexOf(reached) > states.indexOf(afterReady) ? reached : labels[stage]
}

function OrderDetail({ orderId, stage, at, notice, onBack, onPrepare, onCouriers, onPickupQr, onDelivery, onStartSellerDelivery, onHandoff, onChat }: {
  orderId: OrderId; stage: OrderStage; at: Moment; notice?: string; onBack: () => void; onPrepare: () => void; onCouriers: () => void; onPickupQr: () => void; onDelivery: () => void
  onStartSellerDelivery: () => void; onHandoff: () => void; onChat: () => void
}) {
  const order = ORDERS[orderId]
  const buyer = BUYERS[order.buyer]
  const courierMode = order.fulfilment === 'Courier Delivery'
  const sellerDelivery = order.fulfilment === 'Seller Delivery'
  const reached = orderStateAt(orderId, at)
  // The Order's own preparation deadline: a record-specific demo timestamp, not a preparation policy.
  const preparation = preparationAt(orderId, at)
  return (
    <>
      <ScreenHeader title={orderId} onBack={onBack} trailing={<button onClick={onChat} className="rounded-lg bg-surface-raised px-3 py-2 text-xs font-semibold text-brand">Chat</button>} />
      <div className="flex-1 overflow-y-auto p-4">
        {notice && <div className="mb-3 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">{notice}</div>}
        <div className="rounded-2xl bg-brand-muted p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark">Current status</div>
          <div className="mt-1 font-display text-xl font-semibold">{stageLabel(orderId, stage, at)}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary"><span className="rounded-full bg-success-bg px-2 py-1 font-semibold text-success">Paid · read-only</span><span>Provider confirmed</span></div>
          {preparation && (stage === 'paid' || stage === 'preparing') && <div className="mt-2 text-xs font-semibold text-brand-dark">Prepare by {formatDayMonth(preparation.due)} {formatClock(preparation.due)}</div>}
        </div>

        <SectionTitle>Products</SectionTitle>
        <div className="rounded-xl border border-border p-3">
          {order.lines.map(line => <div key={line.product}><div className="text-sm font-semibold">{PRODUCTS[line.product].name}</div><div className="mt-1 text-xs text-text-muted">{lineOptions(line)} · Quantity {line.quantity}</div></div>)}
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span className="text-text-secondary">Paid total</span><span className="font-bold">{formatEtb(orderTotals(orderId).total)}</span></div>
        </div>

        <SectionTitle>Buyer-safe fulfilment info</SectionTitle>
        {/* The assigned Courier receives the delivery detail; for Seller Delivery the Seller does (DEMO_DATA › Buyer). */}
        <div className="rounded-xl bg-surface-raised p-3 text-sm"><div className="font-semibold">{shortName(buyer.name)}</div>
          {order.fulfilment === 'Buyer Collection'
            ? <div className="mt-1 text-xs text-text-secondary">{order.fulfilment} · {SELLERS[order.seller].buyerCollection?.place ?? '—'}</div>
            : <div className="mt-1 text-xs text-text-secondary">{order.fulfilment} · {buyer.deliveryArea ?? '—'}, {MARKET.city}</div>}
          {order.fulfilment === 'Seller Delivery' && <div className="mt-1 text-xs text-text-secondary">{[buyer.deliveryDetail, buyer.phoneMasked].filter(Boolean).join(' · ') || '—'}</div>}
          {courierMode && <div className="mt-1 text-xs text-text-muted">Phone details are shared only with the assigned approved courier.</div>}
          {order.fulfilment === 'Seller Delivery' && <div className="mt-1 text-xs text-text-muted">You deliver this Order, so the delivery detail is shared with you.</div>}
        </div>

        <SectionTitle>Operational progress</SectionTitle>
        <OrderTimeline events={sellerTimeline(orderId, stage, at)} />

        <SectionTitle>Allowed actions</SectionTitle>
        <div className="flex flex-col gap-2">
          {stage === 'paid' && <Button onClick={onPrepare}>Prepare Order</Button>}
          {stage === 'preparing' && <Button onClick={onPrepare}>Continue Preparation</Button>}
          {stage === 'ready' && courierMode && <Button onClick={onCouriers}>Select Approved Courier</Button>}
          {stage === 'ready' && sellerDelivery && <Button onClick={onStartSellerDelivery}>Start Seller Delivery</Button>}
          {stage === 'offer' && <Button onClick={onCouriers}>View Delivery Offer</Button>}
          {stage === 'assigned' && <Button onClick={onPickupQr}>Display Seller Pickup QR</Button>}
          {(stage === 'pickup' || stage === 'delivery') && courierMode && <Button onClick={onDelivery}>View Delivery Status</Button>}
          {stage === 'delivery' && sellerDelivery && reached !== 'Completed' && <Button onClick={onHandoff}>Display Delivery QR</Button>}
          <Button variant="tertiary" onClick={onChat}>Chat with Buyer</Button>
        </div>
        {/* The final handoff for Seller Delivery and Buyer Collection (rules 8.8–8.10). */}
        {!courierMode && <div className="mt-4 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">{order.fulfilment === 'Buyer Collection' ? 'At collection, you display the Collection QR and the Buyer scans it.' : 'At delivery, you display the Delivery QR and the Buyer scans it.'} OTP is the fallback.</div>}
        <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Payment status is read-only and established by the provider and Adulis backend. Seller actions cannot change it.</div>
      </div>
    </>
  )
}

function sellerTimeline(orderId: OrderId, stage: OrderStage, at: Moment): TimelineEvent[] {
  const mode = ORDERS[orderId].fulfilment
  const status = (index: number, current: number, last: boolean): TimelineEvent['status'] => index < current || (index === current && last) ? 'completed' : index === current ? 'active' : 'pending'
  if (mode === 'Courier Delivery') {
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
  // Seller Delivery and Buyer Collection pass only through their own states (rules 4.5–4.7).
  const states = ORDER_TIMELINES[mode]
  const reached = orderStateAt(orderId, at)
  const current = stage === 'paid' ? 0 : stage === 'preparing' ? 1 : stage === 'ready' ? 2 : Math.max(3, reached ? states.indexOf(reached) : 3)
  return states.map((state, index) => ({
    id: state,
    label: state,
    status: status(index, current, state === 'Completed'),
    detail: state === 'Paid' ? 'Read-only provider confirmation' : state === 'Delivery Handoff' ? 'You display the Delivery QR; the Buyer scans it' : state === 'Collection Handoff' ? 'You display the Collection QR; the Buyer scans it' : undefined,
  }))
}

function PrepareOrder({ orderId, onBack, onReady }: { orderId: OrderId; onBack: () => void; onReady: () => void }) {
  const [checks, setChecks] = useState([false, false, false])
  const labels = ['Product and variant checked', 'Item quality inspected', `Package labelled for ${orderId}`]
  const toggle = (index: number) => setChecks(values => values.map((value, i) => i === index ? !value : value))
  const order = ORDERS[orderId]
  const lines = order.lines
  // The handover the package is prepared for, in the Order's own fulfilment mode.
  const handover = order.fulfilment === 'Courier Delivery' ? 'courier pickup' : order.fulfilment === 'Seller Delivery' ? 'your Seller Delivery' : 'Buyer Collection'
  return (
    <>
      <ScreenHeader title="Prepare Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-surface-raised p-3"><div className="text-xs text-text-muted">{orderId}</div><div className="mt-1 text-sm font-semibold">{lines.map(line => PRODUCTS[line.product].name).join(', ')}</div><div className="text-xs text-text-muted">{lines.map(lineOptions).join(' · ')}</div>{order.prepareBy && <div className="mt-1 text-xs font-semibold text-text-secondary">Prepare by {formatDayMonth(order.prepareBy)} {formatClock(order.prepareBy)}</div>}</div>
        <SectionTitle>Preparation checklist</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-border">
          {labels.map((label, index) => <button key={label} onClick={() => toggle(index)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left last:border-b-0"><span className={`flex h-6 w-6 items-center justify-center rounded-md border ${checks[index] ? 'border-success bg-success text-white' : 'border-border-strong'}`}>{checks[index] && '✓'}</span><span className="text-sm font-medium">{label}</span></button>)}
        </div>
        <div className="mt-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Mark Ready only after the package is physically prepared for {handover}.</div>
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

/** Seller Delivery's final handoff (rule 8.8): the Seller displays the Delivery QR and the Buyer or their delegate scans it. */
function SellerDeliveryQr({ orderId, onBack, onScanned, onOtp }: { orderId: OrderId; onBack: () => void; onScanned: () => void; onOtp: () => void }) {
  const buyer = shortName(BUYERS[ORDERS[orderId].buyer].name)
  return (
    <>
      <ScreenHeader title="Delivery QR" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl bg-surface p-5 shadow-lg ring-1 ring-border"><QrPattern label="Seller Delivery QR" /></div>
        <div className="mt-5 font-display text-2xl font-semibold">Display this QR to the Buyer</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{buyer} or an authorized delegate scans your Delivery QR in the Adulis app to verify the handoff.</p>
        {/* QR first, OTP as the fallback; Manual Verification is Operator-only emergency recovery (rules 8.5–8.6, 8.10). */}
        <div className="mt-5 w-full rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Hand over the package once the scan is verified. If QR and OTP both fail, only Adulis Operators can verify the handoff manually.</div>
      </div>
      <div className="p-4 pb-6">
        <Button onClick={onScanned} size="lg" style={{ width: '100%' }}>Simulate Buyer scan</Button>
        <button onClick={onOtp} className="mt-4 w-full text-center text-xs font-semibold text-brand">Buyer can't scan? Use OTP fallback</button>
      </div>
    </>
  )
}

/** The OTP fallback (rules 8.4, 8.10): a one-time code sent to the Buyer's registered phone, entered by the Seller. */
function HandoffOtp({ orderId, onBack, onVerified }: { orderId: OrderId; onBack: () => void; onVerified: () => void }) {
  const [code, setCode] = useState('')
  const phone = BUYERS[ORDERS[orderId].buyer].phoneMasked
  return (
    <>
      <ScreenHeader title="OTP fallback" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Verify with a one-time code</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">If the Buyer can't scan, Adulis sends a one-time code to their registered phone{phone ? ` (${phone})` : ''}. Enter the code they give you.</p>
        <div className="mt-6"><TextInput label="6-digit code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" /></div>
        <div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Use the code only while you hand the package to the Buyer or their authorized delegate.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={code.length !== 6} onClick={onVerified} style={{ width: '100%' }}>Verify handoff</Button></div>
    </>
  )
}

/** The verified final handoff completes the Order at DEMO_DATA's time; Seller Delivery records no location checkpoint (rule 9.6). */
function HandoffVerified({ orderId, at, method, onContinue }: { orderId: OrderId; at: Moment; method: HandoffMethod; onContinue: () => void }) {
  const completed = stateTime(orderId, 'Completed')
  const buyer = shortName(BUYERS[ORDERS[orderId].buyer].name)
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Delivery Verified</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{method === 'QR' ? `${buyer} scanned your Delivery QR.` : 'The one-time code was verified.'} The Order is Completed.</p>
      <div className="mt-6 w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Order" value={orderId} /><InfoRow label="Verified" value={completed ? `${completed.slice(0, 10) === at.at.slice(0, 10) ? 'Today' : formatDayMonth(completed)} · ${formatClock(completed)}` : '—'} /><InfoRow label="Method" value={method} /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Back to Order</Button>
    </div>
  )
}

function InboxTab({ sellerId, at, sent, onConversation, onClaim }: {
  sellerId: SellerId; at: Moment; sent: Partial<Record<ConversationId, readonly MessageRecord[]>>; onConversation: (id: ConversationId) => void; onClaim: (id: ClaimId) => void
}) {
  // The Seller's conversations, latest first, marked while the Buyer awaits a reply; then Claims awaiting a response. Each
  // row previews its conversation's newest message, a reply sent in this session included, so its text and chip come from
  // the same message.
  const threads = sellerThreads(sellerId, at)
  const rows = threads.flatMap(({ id }) => { const last = effectiveMessagesAt(id, at, sent[id]).pop(); return last ? [{ id, last }] : [] })
    .sort((a, b) => byMessageTime(b.last, a.last))
  const claims = openClaims(sellerId, at)
  if (threads.length === 0 && claims.length === 0) return (
    <div className="px-6 py-16 text-center"><div className="font-display text-lg font-semibold">Inbox is empty</div><p className="mt-1 text-sm text-text-muted">Buyer conversations and Claims that need your response appear here.</p></div>
  )
  return (
    <div>
      {rows.map(({ id, last }) => {
        const buyer = BUYERS[CONVERSATIONS[id].buyer].name
        return <button key={id} onClick={() => onConversation(id)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials={initials(buyer)} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">{shortName(buyer)}</span><span className="text-[10px] text-text-muted">{formatAge(last.at, at.at)}</span></span><span className="block truncate text-xs text-text-muted">{last.text}</span><span className="mt-1 inline-block rounded-full bg-brand-muted px-2 py-0.5 text-[10px] text-brand-dark">Talking about: {contextSubject(last.context)}</span></span>{awaitingSellerReplyAt(id, at) && <span role="img" aria-label="Needs reply" title="Needs reply" className="h-2 w-2 rounded-full bg-brand" />}</button>
      })}
      {claims.map(id => {
        const buyer = BUYERS[ORDERS[CLAIMS[id].order].buyer].name
        const deadline = CLAIMS[id].responseDeadline
        return <button key={id} onClick={() => onClaim(id)} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials={initials(buyer)} /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">{shortName(buyer)}</span><span className="text-[10px] text-danger">{deadline ? `Due ${formatDayMonth(deadline)}` : '—'}</span></span><span className="block truncate text-xs text-text-muted">Claim response requested</span><span className="mt-1 inline-block rounded-full bg-danger-bg px-2 py-0.5 text-[10px] text-danger">Claim · {id}</span></span></button>
      })}
    </div>
  )
}

function BuyerConversation({ conversationId, at, sent, onSend, onDocumentedReply, onBack }: {
  conversationId: ConversationId; at: Moment; sent: readonly MessageRecord[]; onSend: (message: MessageRecord) => void
  onDocumentedReply: (at: Timestamp) => void; onBack: () => void
}) {
  const { buyer, seller } = CONVERSATIONS[conversationId]
  // The team member with the Companion session replies (DEMO_DATA › Seller Console Settings). When a guided-flow step
  // stops just before that member's documented reply (Flow L at 11:48), the composer holds it with its context, and
  // sending it is that event; any other reply is this session's own.
  const staff = sessionStaffOn(seller, 'Seller Companion')
  const due = sellerReplyDueAt(conversationId, at)
  const documented = due && due.from === staff ? due : undefined
  // The composer's context is this screen's state, never the conversation's: General / Seller unless a reply is due.
  const [context, setContext] = useState<MessageContext>(documented?.context ?? GENERAL_CONTEXT)
  const [message, setMessage] = useState(documented?.text ?? '')
  const [choosing, setChoosing] = useState(false)
  // DEMO_DATA's messages so far, then this session's replies, in time order. The Seller team's are this side's.
  const messages = effectiveMessagesAt(conversationId, at, sent)
  const send = () => {
    if (!message || !staff) return
    if (documented && message === documented.text && sameContext(context, documented.context)) onDocumentedReply(documented.at)
    else onSend({ at: at.at, from: staff, context, text: message })
    setMessage('')
  }
  // A reply just sent comes into view; opening the conversation keeps its place.
  const list = useRef<HTMLDivElement>(null)
  const shown = useRef(messages.length)
  useEffect(() => {
    if (messages.length > shown.current) list.current?.scrollTo({ top: list.current.scrollHeight })
    shown.current = messages.length
  }, [messages.length])
  return (
    <>
      <ScreenHeader title={shortName(BUYERS[buyer].name)} onBack={onBack} />
      <div className="border-b border-border bg-warning-bg px-4 py-2 text-[10px] leading-relaxed text-text-secondary">Chat supports coordination. It does not change payment, pickup, delivery, claim, or Order truth.</div>
      <div ref={list} role="list" aria-label="Messages" className="flex-1 overflow-y-auto bg-surface-raised p-4">
        {messages.map((m, index) => <Bubble key={index} mine={m.from !== 'buyer'} context={m.context} author={m.from === 'buyer' ? undefined : shortName(STAFF[m.from].name)}>{m.text}</Bubble>)}
      </div>
      <div className="border-t border-border bg-surface p-3 pb-5">
        <button onClick={() => setChoosing(true)} aria-haspopup="dialog" aria-label={`Talking about: ${contextSubject(context)}. Change`} className="mb-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-brand bg-brand-muted px-3 py-1 text-left text-xs font-semibold text-brand-dark"><span>Talking about: {contextSubject(context)}</span><IconChevronDown size={12} /></button>
        <div className="mb-2 flex gap-2 overflow-x-auto"><Pill onClick={() => setMessage('Your order is ready for courier pickup.')}>Order ready</Pill><Pill onClick={() => setMessage('A courier has been assigned.')}>Courier assigned</Pill></div>
        <div className="flex gap-2"><div className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary">{message || ('general' in context ? `Message ${shortName(BUYERS[buyer].name)}` : `Message about ${contextSubject(context)}`)}</div><Button size="sm" onClick={send}>Send</Button></div>
      </div>
      {choosing && <ContextSheet choices={contextChoicesAt(conversationId, at)} selected={context} onSelect={setContext} onClose={() => setChoosing(false)} />}
    </>
  )
}

/**
 * "Talking about", as a sheet inside the phone: the reply's context choices, exactly the conversation's at the story
 * moment (rules 12.5–12.6). Escape closes it, and closing returns focus to its opener.
 */
function ContextSheet({ choices, selected, onSelect, onClose }: { choices: readonly MessageContext[]; selected: MessageContext; onSelect: (context: MessageContext) => void; onClose: () => void }) {
  const [trigger] = useState(() => document.activeElement)
  const dismiss = () => {
    onClose()
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Talking about" className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onKeyDown={event => { if (event.key === 'Escape') dismiss() }}>
      <button aria-label="Close" className="flex-1" onClick={dismiss} />
      <div className="max-h-[85%] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="mb-2 font-display text-lg font-semibold">Talking about</div>
        {CONTEXT_GROUPS.map(group => {
          const options = choices.filter(choice => group.kind in choice).map(choice => {
            const current = sameContext(choice, selected)
            return (
              <button key={contextKey(choice)} autoFocus={current} aria-current={current ? 'true' : undefined} onClick={() => { onSelect(choice); dismiss() }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${current ? 'bg-brand-muted font-semibold text-brand-dark' : 'text-text-primary'}`}>
                {contextSubject(choice)}
                {current && <span className="text-xs font-semibold text-brand">Current</span>}
              </button>
            )
          })
          if (!options.length) return null
          return 'label' in group
            ? <div key={group.kind} role="group" aria-labelledby={`reply-context-${group.kind}`} className="mt-4"><div id={`reply-context-${group.kind}`} className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>{options}</div>
            : <div key={group.kind}>{options}</div>
        })}
      </div>
    </div>
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

/** A message with the chip of the context it was sent with (specification §22), and the team member who sent the Seller's. */
function Bubble({ children, mine, context, author }: { children: ReactNode; mine?: boolean; context: MessageContext; author?: string }) {
  return (
    <div role="listitem" className={`mb-3 flex max-w-[82%] flex-col ${mine ? 'ml-auto items-end' : 'items-start'}`}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px]">{author && <span className="font-semibold text-text-secondary">{author}</span>}<span className="rounded-full border border-border bg-surface px-2 py-0.5 text-text-secondary">Talking about: {contextSubject(context)}</span></div>
      <div className={`rounded-2xl p-3 text-sm shadow-sm ${mine ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-surface'}`}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 flex items-center justify-between gap-3 text-sm last:mb-0"><span className="text-text-muted">{label}</span><span className="font-semibold">{value}</span></div>
}

function QrPattern({ label = 'Seller Pickup QR' }: { label?: string }) {
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" aria-label={label}>
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
