import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  PhoneFrame, BottomNav, IconMap, IconTruck, IconHistory, IconUser, IconChevronRight,
} from './ShellHelpers'
import { useStory, useStoryMoment } from '../StoryClock'
import {
  BUYERS, COURIERS, COURIER_RELATIONSHIPS, MARKET, ORDERS, ORDER_IDS, PRODUCTS, SELLERS, SURFACE_DEFAULTS,
  activeDeliveryAt, completedForSellerAt, courierAvailabilityAt, courierCompensationAt, courierHistoryAt, formatClock, formatClockShort, formatDate, formatDayMonth,
  formatEtb, happenedBefore, initials, minutesBetween, orderStateAt, orderTotals, paidAt, relationshipStatusAt, shortName, stateTime, totalCompletedAt,
  type CourierId, type Moment, type OrderId, type SellerId, type Timestamp,
} from '../demo-data'

type TabKey = 'assignments' | 'active' | 'history' | 'account'
type Availability = 'available' | 'busy' | 'unavailable'
type Screen = 'tabs' | 'offer' | 'opportunity' | 'relationships' | 'pickup-scan' | 'pickup-verified' | 'pickup-checkpoint' | 'delivery' | 'delivery-qr' | 'waiting' | 'delivery-verified' | 'delivery-checkpoint'
type ActiveStage = 'none' | 'accepted' | 'pickup-verified' | 'delivering' | 'waiting' | 'verified'
type CheckpointState = 'recorded' | 'unavailable'

const TABS = [
  { key: 'assignments' as TabKey, label: 'Assignments', icon: <IconMap size={22} /> },
  { key: 'active' as TabKey, label: 'Active', icon: <IconTruck size={22} /> },
  { key: 'history' as TabKey, label: 'History', icon: <IconHistory size={22} /> },
  { key: 'account' as TabKey, label: 'Account', icon: <IconUser size={22} /> },
]

/** The Courier's Delivery Offers waiting at the story moment: made, and not yet accepted (rule 6.3). */
function pendingOffers(courierId: CourierId, at: Moment): OrderId[] {
  return ORDER_IDS.filter(id => {
    const offer = ORDERS[id].offer
    const accepted = stateTime(id, 'Courier Assigned')
    return offer?.courier === courierId && happenedBefore(offer.offered, at) && !(accepted && happenedBefore(accepted, at))
  })
}

/** The active-delivery step for the Order's state at the story moment. */
function activeStage(orderId: OrderId | undefined, at: Moment): ActiveStage {
  switch (orderId && orderStateAt(orderId, at)) {
    case 'Courier Assigned': return 'accepted'
    case 'Pickup Verified': case 'Out for Delivery': return 'pickup-verified'
    case 'Delivery Handoff': return 'delivering'
    case 'Completed': return 'verified'
    default: return 'none'
  }
}

/** Who receives the Order: its authorized recipient once authorized (shown to Couriers as such), otherwise the Buyer. */
function recipientOf(orderId: OrderId, at: Moment) {
  const { recipient, buyer } = ORDERS[orderId]
  return recipient && happenedBefore(recipient.authorized, at)
    ? { name: `${shortName(recipient.name)} (authorized recipient)`, phone: recipient.phoneMasked }
    : { name: shortName(BUYERS[buyer].name), phone: BUYERS[buyer].phoneMasked ?? '—' }
}

/** The Buyer's delivery area, as the Courier sees it. */
function deliveryArea(orderId: OrderId) {
  return `${BUYERS[ORDERS[orderId].buyer].deliveryArea ?? '—'}, ${MARKET.city}`
}

function orderItems(orderId: OrderId) {
  return ORDERS[orderId].lines.map(line => PRODUCTS[line.product].name).join(', ')
}

/** The compensation for this delivery: the Seller's terms when the Delivery Offer was made (rule 6.8). */
function compensationFor(orderId: OrderId) {
  const order = ORDERS[orderId]
  const when = order.offer?.offered ?? stateTime(orderId, 'Courier Assigned') ?? stateTime(orderId, 'Completed') ?? paidAt(orderId)
  const amount = courierCompensationAt(order.seller, { at: when })
  return amount === undefined ? '—' : formatEtb(amount)
}

/** 'Today · HH:MM', 'Yesterday' or the day and month, relative to the story moment. */
function dayLabel(time: Timestamp, at: Moment) {
  const days = minutesBetween(time.slice(0, 10), at.at.slice(0, 10)) / (24 * 60)
  return days === 0 ? `Today · ${formatClock(time)}` : days === 1 ? 'Yesterday' : formatDayMonth(time)
}

export default function MobileCourier({ demoTarget }: { demoTarget?: string }) {
  const initialTab: TabKey = ['active', 'pickup-scan', 'delivery', 'delivery-qr'].includes(demoTarget ?? '') ? 'active' : 'assignments'
  const initialScreen: Screen = demoTarget === 'pickup-scan'
    ? 'pickup-scan'
    : demoTarget === 'delivery'
      ? 'delivery'
      : demoTarget === 'delivery-qr'
        ? 'delivery-qr'
        : 'tabs'
  // The Courier, story moment and delivery of the guided-flow step: its focus Order, else the Courier's active
  // delivery. The moment moves on as the Courier verifies the pickup and the final handoff.
  const { focus } = useStory()
  const courierId = focus?.courier ?? SURFACE_DEFAULTS.courier
  const [at, advanceTo] = useStoryMoment()
  const [orderId, setOrderId] = useState<OrderId | undefined>(() => focus?.order ?? activeDeliveryAt(courierId, at))
  const [offerId, setOfferId] = useState<OrderId | undefined>()
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [availability, setAvailability] = useState<Availability>(courierAvailabilityAt(courierId, at).toLowerCase() as Availability)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [stage, setStage] = useState<ActiveStage>(activeStage(orderId, at))
  const [pickupCheckpoint, setPickupCheckpoint] = useState<CheckpointState>((orderId && ORDERS[orderId].pickup?.location) || 'recorded')
  const [deliveryCheckpoint, setDeliveryCheckpoint] = useState<CheckpointState>((orderId && ORDERS[orderId].finalHandoff?.location) || 'recorded')
  const offers = pendingOffers(courierId, at)
  // The Sellers whose pool the Courier has applied to, awaiting their decision.
  const opportunities = COURIER_RELATIONSHIPS.filter(r => r.courier === courierId && relationshipStatusAt(r, at) === 'Application pending').map(r => r.seller)
  const [opportunity, setOpportunity] = useState<SellerId | undefined>(opportunities[0])

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    setScreen('tabs')
  }
  const openOpportunity = (seller: SellerId) => { setOpportunity(seller); setScreen('opportunity') }

  return (
    <PhoneFrame label={`07 — COURIER MODE · ${COURIERS[courierId].name.toUpperCase()}`} clock={formatClockShort(at.at)}>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === 'tabs' && (
          <>
            <CourierHeader courierId={courierId} tab={activeTab} availability={availability} onAvailability={setAvailability} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'assignments' && <CourierHome activeOrder={stage !== 'none' && stage !== 'verified' ? orderId : undefined} offers={offers} opportunities={opportunities} availability={availability} onOffer={id => { setOfferId(id); setScreen('offer') }} onOpportunity={openOpportunity} />}
              {activeTab === 'active' && <ActiveAssignment orderId={orderId} at={at} stage={stage} onAssignments={() => selectTab('assignments')} onScan={() => setScreen('pickup-scan')} onDelivery={() => setScreen('delivery')} onWaiting={() => setScreen('waiting')} />}
              {activeTab === 'history' && <HistoryTab courierId={courierId} at={at} />}
              {activeTab === 'account' && <AccountTab courierId={courierId} at={at} availability={availability} onAvailability={setAvailability} onRelationships={() => setScreen('relationships')} opportunity={opportunities[0]} onOpportunity={openOpportunity} />}
            </div>
            <BottomNav items={TABS.map(tab => (tab.key === 'assignments' ? { ...tab, badge: offers.length } : tab))} active={activeTab} onSelect={key => selectTab(key as TabKey)} accent="var(--color-courier)" />
          </>
        )}
        {screen === 'offer' && offerId && <OfferDetail orderId={offerId} hasActive={stage !== 'none' && stage !== 'verified'} onBack={() => setScreen('tabs')} onAccept={() => { setOrderId(offerId); setStage('accepted'); setActiveTab('active'); setScreen('tabs') }} />}
        {orderId && <>
          {screen === 'pickup-scan' && <PickupScanner onBack={() => setScreen('tabs')} onScan={() => { const t = stateTime(orderId, 'Pickup Verified'); if (t) advanceTo(t); setScreen('pickup-verified') }} />}
          {screen === 'pickup-verified' && <PickupVerified orderId={orderId} at={at} onContinue={() => setScreen('pickup-checkpoint')} />}
          {screen === 'pickup-checkpoint' && <CheckpointStatus type="Pickup" state={pickupCheckpoint} setState={setPickupCheckpoint} onContinue={() => { const t = stateTime(orderId, 'Out for Delivery'); if (t) advanceTo(t); setStage('pickup-verified'); setScreen('delivery') }} />}
          {screen === 'delivery' && <DeliveryDetail orderId={orderId} at={at} pickupCheckpoint={pickupCheckpoint} onBack={() => setScreen('tabs')} onComplete={() => { const t = stateTime(orderId, 'Delivery Handoff'); if (t) advanceTo(t); setStage('delivering'); setScreen('delivery-qr') }} />}
          {screen === 'delivery-qr' && <DeliveryQr onBack={() => setScreen('delivery')} onDisplay={() => { setStage('waiting'); setScreen('waiting') }} />}
          {screen === 'waiting' && <WaitingForRecipient orderId={orderId} at={at} onBack={() => setScreen('tabs')} onVerified={() => {
            // The verified scan completes the Order; the Courier is then no longer busy with it (rule 6.3).
            const t = stateTime(orderId, 'Completed')
            if (t) { advanceTo(t); setAvailability(courierAvailabilityAt(courierId, { at: t, sequence: 1 }).toLowerCase() as Availability) }
            setScreen('delivery-verified')
          }} />}
          {screen === 'delivery-verified' && <DeliveryVerified orderId={orderId} at={at} onContinue={() => setScreen('delivery-checkpoint')} />}
        </>}
        {screen === 'opportunity' && opportunity && <CourierOpportunity sellerId={opportunity} courierId={courierId} at={at} onBack={() => setScreen('tabs')} />}
        {screen === 'relationships' && <SellerRelationships courierId={courierId} at={at} onBack={() => setScreen('tabs')} />}
        {screen === 'delivery-checkpoint' && <CheckpointStatus type="Delivery" state={deliveryCheckpoint} setState={setDeliveryCheckpoint} onContinue={() => { setStage('verified'); setActiveTab('history'); setScreen('tabs') }} />}
      </div>
    </PhoneFrame>
  )
}

function CourierHeader({ courierId, tab, availability, onAvailability }: { courierId: CourierId; tab: TabKey; availability: Availability; onAvailability: (value: Availability) => void }) {
  const titles: Record<TabKey, string> = { assignments: 'Courier Home', active: 'Active Delivery', history: 'History', account: COURIERS[courierId].name }
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex h-13 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div><div className="font-display text-lg font-semibold">{titles[tab]}</div>{tab === 'assignments' && <div className="text-[10px] text-text-muted">{MARKET.city}</div>}</div>
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${availability === 'available' ? 'bg-courier-muted text-courier' : availability === 'busy' ? 'bg-warning-bg text-warning' : 'bg-surface-raised text-text-muted'}`}>
        <span className={`h-2 w-2 rounded-full ${availability === 'available' ? 'bg-courier' : availability === 'busy' ? 'bg-warning' : 'bg-text-muted'}`} />{availabilityLabel(availability)}⌄
      </button>
      {open && (
        <div className="absolute right-4 top-12 z-30 w-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {(['available', 'busy', 'unavailable'] as Availability[]).map(value => <button key={value} onClick={() => { onAvailability(value); setOpen(false) }} className="flex w-full items-center gap-2 border-b border-border px-3 py-3 text-left text-xs font-semibold last:border-b-0"><span className={`h-2 w-2 rounded-full ${value === 'available' ? 'bg-courier' : value === 'busy' ? 'bg-warning' : 'bg-text-muted'}`} />{availabilityLabel(value)}</button>)}
        </div>
      )}
    </div>
  )
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex h-13 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <button onClick={onBack} aria-label="Back" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xl text-text-secondary">‹</button>
      <div className="font-display text-lg font-semibold">{title}</div>
    </div>
  )
}

function CourierHome({ activeOrder, offers, opportunities, availability, onOffer, onOpportunity }: {
  activeOrder?: OrderId; offers: OrderId[]; opportunities: SellerId[]; availability: Availability; onOffer: (id: OrderId) => void; onOpportunity: (seller: SellerId) => void
}) {
  // DEMO_DATA records no Seller invitations for Couriers, so only the Courier's pending applications are opportunities.
  return (
    <div className="p-4">
      {activeOrder && <div className="mb-4 rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Active delivery</div><div className="mt-1 font-display text-lg font-semibold">{activeOrder} · {SELLERS[ORDERS[activeOrder].seller].name}</div><div className="mt-1 text-xs text-text-secondary">Only one accepted delivery can be active at a time.</div></div>}
      {availability !== 'available' && <div className="mb-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Set availability to Available to receive new delivery offers.</div>}
      <div className="flex items-center justify-between"><SectionTitle>Delivery offers</SectionTitle><span className="text-xs text-text-muted">{offers.length} available</span></div>
      {offers.length === 0 && <p className="text-sm text-text-muted">No delivery offers</p>}
      {offers.map(id => <OfferCard key={id} seller={SELLERS[ORDERS[id].seller].name} item={orderItems(id)} pickup={SELLERS[ORDERS[id].seller].area} delivery={BUYERS[ORDERS[id].buyer].deliveryArea ?? '—'} compensation={compensationFor(id)} disabled={!!activeOrder || availability !== 'available'} onClick={() => onOffer(id)} />)}
      <SectionTitle>Seller opportunities</SectionTitle>
      {opportunities.length === 0 && <p className="text-sm text-text-muted">No seller opportunities</p>}
      {opportunities.map((seller, index) => <button key={seller} onClick={() => onOpportunity(seller)} className={`${index ? 'mt-2 ' : ''}flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left`}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-courier-muted text-xs font-bold text-courier">OP</span><span className="flex-1"><span className="block text-sm font-semibold">Courier opportunity</span><span className="text-xs text-text-muted">Apply to deliver for {SELLERS[seller].name}</span></span><IconChevronRight size={16} /></button>)}
    </div>
  )
}

function OfferCard({ seller, item, pickup, delivery, compensation, disabled, onClick }: {
  seller: string; item: string; pickup: string; delivery: string; compensation: string; disabled: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`mb-3 w-full rounded-2xl border border-border p-4 text-left ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between"><span><span className="block text-sm font-semibold">{seller}</span><span className="text-xs text-text-muted">{item} · 1 package</span></span><span className="text-sm font-bold text-courier">{compensation}</span></div>
      <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary"><span className="h-2 w-2 rounded-full bg-brand" />Pickup · {pickup}<span className="h-px flex-1 bg-border-strong" /><span className="h-2 w-2 rounded-full bg-courier" />Deliver · {delivery}</div>
      <div className="mt-3 flex justify-between border-t border-border pt-3 text-xs"><span className="text-text-muted">{disabled ? 'Unavailable while another delivery is active' : 'Review offer details'}</span><IconChevronRight size={14} /></div>
    </button>
  )
}

function OfferDetail({ orderId, hasActive, onBack, onAccept }: { orderId: OrderId; hasActive: boolean; onBack: () => void; onAccept: () => void }) {
  // DEMO_DATA gives Orders no pickup window, so that row isn't shown.
  return (
    <>
      <ScreenHeader title="Delivery Offer" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Compensation</div><div className="mt-1 font-display text-3xl font-semibold">{compensationFor(orderId)}</div><div className="mt-1 text-xs text-text-secondary">Fixed for this delivery</div></div>
        <SectionTitle>Assignment</SectionTitle>
        <InfoCard rows={[['Seller Order', orderId], ['Payment status', 'Paid · provider confirmed'], ['Seller', SELLERS[ORDERS[orderId].seller].name], ['Package', `${orderItems(orderId)} · sealed`], ['Delivery area', BUYERS[ORDERS[orderId].buyer].deliveryArea ?? '—'], ['Expected work', 'One pickup · one handoff']]} />
        <SectionTitle>Pickup instructions</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm leading-relaxed text-text-secondary">Ask the seller to display the Seller Pickup QR after they hand you the sealed package. Scan it before leaving.</div>
        <SectionTitle>Delivery instructions</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm leading-relaxed text-text-secondary">At the recipient, display your Delivery QR. The buyer or delegated recipient scans it to verify handoff.</div>
        <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Adulis supports one active accepted delivery at a time. Finish it before accepting another offer.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={hasActive} onClick={onAccept} style={{ width: '100%' }}>{hasActive ? 'Finish Active Delivery First' : 'Accept Delivery'}</Button></div>
    </>
  )
}

function ActiveAssignment({ orderId, at, stage, onAssignments, onScan, onDelivery, onWaiting }: {
  orderId?: OrderId; at: Moment; stage: ActiveStage; onAssignments: () => void; onScan: () => void; onDelivery: () => void; onWaiting: () => void
}) {
  if (!orderId || stage === 'none' || stage === 'verified') {
    return <EmptyActive onAssignments={onAssignments} completed={stage === 'verified'} />
  }
  const status = stage === 'accepted' ? 'Go to Pickup' : stage === 'pickup-verified' ? 'Pickup Verified' : stage === 'waiting' ? 'Waiting for Recipient' : 'Delivering'
  const order = ORDERS[orderId]
  const seller = SELLERS[order.seller]
  const packages = order.lines.reduce((sum, line) => sum + line.quantity, 0)
  return (
    <div className="p-4">
      <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">One active delivery</div><div className="mt-1 font-display text-xl font-semibold">{status}</div><div className="mt-1 text-xs text-text-secondary">{orderId} · {compensationFor(orderId)}</div></div>
      <SectionTitle>{stage === 'accepted' ? 'Pickup instructions' : 'Delivery detail'}</SectionTitle>
      {stage === 'accepted' ? (
        <>
          <InfoCard rows={[['Seller', seller.name], ['Pickup area', `${seller.area}, ${MARKET.city}`], ['Package', `${packages} sealed item${packages === 1 ? '' : 's'}`]]} />
          <div className="mt-3 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Receive the package, then scan the Pickup QR displayed by the seller.</div>
          <Button onClick={onScan} style={{ width: '100%', marginTop: 16 }}>Scan Seller Pickup QR</Button>
        </>
      ) : (
        <>
          <InfoCard rows={[['Seller Order', orderId], ['Recipient', recipientOf(orderId, at).name], ['Delivery area', deliveryArea(orderId)], ['Handoff', 'Buyer or delegated recipient'], ['Package', orderItems(orderId)], ['Paid total', formatEtb(orderTotals(orderId).total)]]} />
          <div className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">Delivery progress uses checkpoints only. No continuous GPS or live route is shown.</div>
          <Button onClick={stage === 'waiting' ? onWaiting : onDelivery} style={{ width: '100%', marginTop: 16 }}>{stage === 'waiting' ? 'Return to Waiting Screen' : 'Open Delivery Detail'}</Button>
        </>
      )}
    </div>
  )
}

function EmptyActive({ onAssignments, completed }: { onAssignments: () => void; completed: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-courier-muted text-courier"><IconTruck size={26} /></span>
      <div className="mt-4 font-display text-xl font-semibold">{completed ? 'Delivery completed' : 'No active delivery'}</div>
      <p className="mt-2 text-sm text-text-muted">{completed ? 'The verified delivery has moved to History.' : 'Accept one delivery offer to begin.'}</p>
      <Button variant="secondary" onClick={onAssignments} style={{ marginTop: 20 }}>View Assignments</Button>
    </div>
  )
}

// On the dark scanner the keyboard focus outline uses the light inverse colour, so it stays visible (§57).
const ON_SCANNER = { outlineColor: 'var(--color-text-inverse)' }

function PickupScanner({ onBack, onScan }: { onBack: () => void; onScan: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-text-primary text-white">
      <div className="flex items-center gap-3 p-4"><button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xl" style={ON_SCANNER}>×</button><div className="font-display text-lg font-semibold">Scan Seller Pickup QR</div></div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <ScanFrame />
        <p className="mt-6 px-8 text-center text-sm text-white/70">The seller displays the Pickup QR. Position it inside the frame.</p>
      </div>
      <div className="p-5 pb-8"><Button size="lg" onClick={onScan} style={{ width: '100%', ...ON_SCANNER }}>Simulate QR detected</Button></div>
    </div>
  )
}

function PickupVerified({ orderId, at, onContinue }: { orderId: OrderId; at: Moment; onContinue: () => void }) {
  const verified = stateTime(orderId, 'Pickup Verified')
  return (
    <StatusScreen title="Pickup Verified" description={`The Seller Pickup QR matched ${orderId}. Package custody is now assigned to you.`}>
      <div className="w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Seller" value={SELLERS[ORDERS[orderId].seller].name} /><InfoRow label="Verified" value={verified ? dayLabel(verified, at) : '—'} /><InfoRow label="Package" value={orderItems(orderId)} /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue to Pickup Checkpoint</Button>
    </StatusScreen>
  )
}

function CheckpointStatus({ type, state, setState, onContinue }: { type: 'Pickup' | 'Delivery'; state: CheckpointState; setState: (state: CheckpointState) => void; onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto p-5">
        <div className={`flex h-14 w-14 items-center justify-center rounded-full ${state === 'recorded' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{state === 'recorded' ? <CheckIcon /> : <LocationOffIcon />}</div>
        <div className="mt-4 font-display text-2xl font-semibold">{type} checkpoint</div>
        <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${state === 'recorded' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>Location {state}</div>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">{state === 'recorded' ? `${type} checkpoint location was recorded at the time of verified handoff.` : `Location was unavailable for this checkpoint. The verified QR handoff remains valid.`}</p>
        <SectionTitle>Prototype checkpoint state</SectionTitle>
        <div className="flex gap-2"><Pill active={state === 'recorded'} onClick={() => setState('recorded')}>Location recorded</Pill><Pill active={state === 'unavailable'} onClick={() => setState('unavailable')}>Location unavailable</Pill></div>
        <div className="mt-6 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Location is attempted only at Pickup and Delivery checkpoints. Location failure cannot invalidate a successful QR handoff.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" onClick={onContinue} style={{ width: '100%' }}>{type === 'Pickup' ? 'Continue to Delivery' : 'Finish Delivery'}</Button></div>
    </div>
  )
}

function DeliveryDetail({ orderId, at, pickupCheckpoint, onBack, onComplete }: { orderId: OrderId; at: Moment; pickupCheckpoint: CheckpointState; onBack: () => void; onComplete: () => void }) {
  // The Order's states so far (rule 4.4) with DEMO_DATA's times; the checkpoint shows the pickup's location result.
  const time = (state: 'Courier Assigned' | 'Pickup Verified') => { const t = stateTime(orderId, state); return t && formatClock(t) }
  const events: TimelineEvent[] = [
    { id: 'accepted', label: 'Courier Assigned', status: 'completed', timestamp: time('Courier Assigned') },
    { id: 'pickup', label: 'Pickup Verified', status: 'completed', timestamp: time('Pickup Verified') },
    { id: 'checkpoint', label: 'Pickup Checkpoint', status: 'completed', timestamp: time('Pickup Verified'), detail: `Location ${pickupCheckpoint}` },
    { id: 'delivery', label: 'Out for Delivery', status: 'active' },
    { id: 'handoff', label: 'Delivery Handoff', status: 'pending' },
  ]
  const recipient = recipientOf(orderId, at)
  return (
    <>
      <ScreenHeader title="Delivery Detail" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Active assignment</div><div className="mt-1 font-display text-xl font-semibold">{orderId}</div><div className="mt-1 text-xs text-text-secondary">{deliveryArea(orderId)} · {compensationFor(orderId)}</div></div>
        <SectionTitle>Recipient</SectionTitle>
        <InfoCard rows={[['Seller Order', orderId], ['Name', recipient.name], ['Handoff', 'Buyer or delegated recipient'], ['Area', deliveryArea(orderId)], ['Contact', recipient.phone]]} />
        <SectionTitle>Operational progress</SectionTitle>
        <OrderTimeline events={events} />
        <div className="mt-4 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">Use the recipient details and checkpoint statuses to complete this single delivery. No live map is provided.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" onClick={onComplete} style={{ width: '100%' }}>Complete Delivery</Button></div>
    </>
  )
}

function DeliveryQr({ onBack, onDisplay }: { onBack: () => void; onDisplay: () => void }) {
  return (
    <>
      <ScreenHeader title="Delivery QR" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl bg-surface p-5 shadow-lg ring-1 ring-border"><QrPattern /></div>
        <div className="mt-5 font-display text-2xl font-semibold">Display this QR to the recipient</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">The buyer or delegated recipient scans your Delivery QR to confirm final handoff.</p>
        <div className="mt-5 w-full rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Do not hand over the package until the recipient is ready to scan.</div>
      </div>
      <div className="p-4 pb-6"><Button size="lg" onClick={onDisplay} style={{ width: '100%' }}>QR displayed · Wait for scan</Button></div>
    </>
  )
}

function WaitingForRecipient({ orderId, at, onBack, onVerified }: { orderId: OrderId; at: Moment; onBack: () => void; onVerified: () => void }) {
  return (
    <>
      <ScreenHeader title="Waiting for Recipient" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-courier-muted text-courier"><WaitingIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Waiting for recipient scan</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Keep the Delivery QR visible. {BUYERS[ORDERS[orderId].buyer].name.split(' ')[0]} or the delegated recipient scans it from their Adulis app.</p>
        <div className="mt-5 w-full rounded-xl bg-surface-raised p-4 text-left"><InfoRow label="Seller Order" value={orderId} /><InfoRow label="Recipient" value={recipientOf(orderId, at).name} /><InfoRow label="Status" value="Awaiting scan" /></div>
      </div>
      <div className="p-4 pb-6"><Button onClick={onVerified} size="lg" style={{ width: '100%' }}>Simulate Recipient Scan</Button></div>
    </>
  )
}

function DeliveryVerified({ orderId, at, onContinue }: { orderId: OrderId; at: Moment; onContinue: () => void }) {
  // The verified final scan completes the Order: DEMO_DATA's Completed time.
  const verified = stateTime(orderId, 'Completed')
  return (
    <StatusScreen title="Delivery Verified" description="The recipient scanned your Delivery QR. Final handoff is successful.">
      <div className="w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Seller Order" value={orderId} /><InfoRow label="Recipient" value={recipientOf(orderId, at).name} /><InfoRow label="Verified" value={verified ? dayLabel(verified, at) : '—'} /><InfoRow label="Compensation" value={compensationFor(orderId)} /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue to Delivery Checkpoint</Button>
    </StatusScreen>
  )
}

function CourierOpportunity({ sellerId, courierId, at, onBack }: { sellerId: SellerId; courierId: CourierId; at: Moment; onBack: () => void }) {
  // The Courier's application to this Seller's pool; DEMO_DATA records only the Seller's area for it.
  const relationship = COURIER_RELATIONSHIPS.find(r => r.seller === sellerId && r.courier === courierId)
  const [applied, setApplied] = useState(!!relationship && relationshipStatusAt(relationship, at) === 'Application pending')
  const seller = SELLERS[sellerId].name
  return (
    <>
      <ScreenHeader title="Courier Opportunity" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Deliver for {seller}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Apply to join {seller}’s approved courier pool.</p>
        <SectionTitle>Opportunity</SectionTitle>
        <InfoCard rows={[['Seller area', SELLERS[sellerId].area]]} />
        <div className="mt-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Compensation is shown as a fixed amount on every delivery offer before acceptance.</div>
        {applied && <div className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Application sent · Seller review pending</div>}
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={applied} onClick={() => setApplied(true)} style={{ width: '100%' }}>{applied ? 'Application Sent' : 'Apply to Seller Pool'}</Button></div>
    </>
  )
}

/** The Courier's approved Seller relationships at the story moment. */
function approvedRelationships(courierId: CourierId, at: Moment) {
  return COURIER_RELATIONSHIPS.filter(r => r.courier === courierId && relationshipStatusAt(r, at) === 'Approved')
}

function SellerRelationships({ courierId, at, onBack }: { courierId: CourierId; at: Moment; onBack: () => void }) {
  return (
    <>
      <ScreenHeader title="Seller Relationships" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-text-secondary">You can belong to multiple approved Seller Courier Pools.</p>
        {approvedRelationships(courierId, at).map(r => {
          const completed = completedForSellerAt(courierId, r.seller, at)
          // An approved relationship always records its approval.
          const approved = r.approved!
          return <Relationship key={r.seller} seller={SELLERS[r.seller].name} initials={initials(SELLERS[r.seller].name)} since={`Approved · ${formatDate(typeof approved === 'string' ? approved : approved.at)}`} work={completed ? `${completed} completed ${completed === 1 ? 'delivery' : 'deliveries'}` : 'No completed work yet'} />
        })}
      </div>
    </>
  )
}

function Relationship({ seller, initials, since, work }: { seller: string; initials: string; since: string; work: string }) {
  return <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-xs font-bold text-brand-dark">{initials}</span><span><span className="block text-sm font-semibold">{seller}</span><span className="text-xs text-success">{since}</span><span className="mt-1 block text-xs text-text-muted">{work}</span></span></div>
}

function HistoryTab({ courierId, at }: { courierId: CourierId; at: Moment }) {
  // Total completed deliveries across Sellers (rule 7.2) and DEMO_DATA's recorded deliveries, most recent first.
  // DEMO_DATA defines no verified-handoff rate, so none is shown.
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3"><Metric label="Completed" value={String(totalCompletedAt(courierId, at))} /></div>
      <SectionTitle>Recent deliveries</SectionTitle>
      {courierHistoryAt(courierId, at).map(id => <HistoryRow key={id} id={id} seller={SELLERS[ORDERS[id].seller].name} date={dayLabel(stateTime(id, 'Completed')!, at)} amount={compensationFor(id)} />)}
      <p className="mt-5 text-xs leading-relaxed text-text-muted">History shows completed work and the compensation attached to each delivery.</p>
    </div>
  )
}

function HistoryRow({ id, seller, date, amount }: { id: string; seller: string; date: string; amount: string }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{seller}</span><span className="text-xs text-text-muted">{id} · {date}</span></span><span className="text-sm font-bold text-courier">{amount}</span></div>
}

function AccountTab({ courierId, at, availability, onAvailability, onRelationships, opportunity, onOpportunity }: {
  courierId: CourierId; at: Moment; availability: Availability; onAvailability: (value: Availability) => void; onRelationships: () => void; opportunity?: SellerId; onOpportunity: (seller: SellerId) => void
}) {
  // DEMO_DATA records no verified-handoff rate or Seller invitations for Daniel K., so none is shown. Platform
  // verification is the shared Courier profile's (PR-008), the same fact Sellers see.
  const courier = COURIERS[courierId]
  const completed = totalCompletedAt(courierId, at)
  const pools = approvedRelationships(courierId, at).length
  return (
    <div className="p-4">
      <div className="flex items-center gap-3"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-courier-muted font-display text-xl font-bold text-courier">{initials(courier.name)}</span><span><span className="block font-display text-xl font-semibold">{courier.name}</span><span className="text-xs text-text-muted">Courier profile · {MARKET.city}</span></span></div>
      <SectionTitle>Availability</SectionTitle>
      <div className="grid grid-cols-3 gap-2">{(['available', 'busy', 'unavailable'] as Availability[]).map(value => <button key={value} onClick={() => onAvailability(value)} className={`rounded-xl border px-2 py-3 text-xs font-semibold ${availability === value ? 'border-courier bg-courier-muted text-courier' : 'border-border text-text-muted'}`}>{availabilityLabel(value)}</button>)}</div>
      <SectionTitle>Profile</SectionTitle>
      <InfoCard rows={[['Completed work', `${completed} ${completed === 1 ? 'delivery' : 'deliveries'}`], ['Primary area', courier.usualAreas.join(' · ')], ['Vehicle', courier.vehicle], ['Verification', courier.verification ?? 'Verified']]} />
      <SectionTitle>Seller network</SectionTitle>
      <MenuButton label="Approved Seller Relationships" detail={`${pools} approved pool${pools === 1 ? '' : 's'}`} onClick={onRelationships} />
      {opportunity && <MenuButton label="Opportunities" detail="Apply to approved Seller Pools" onClick={() => onOpportunity(opportunity)} />}
    </div>
  )
}

function MenuButton({ label, detail, onClick }: { label: string; detail: string; onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center justify-between border-b border-border py-4 text-left"><span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-text-muted">{detail}</span></span><IconChevronRight size={16} /></button>
}

function StatusScreen({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><div className="mt-5 font-display text-2xl font-semibold">{title}</div><p className="mb-6 mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>{children}</div>
}

function InfoCard({ rows }: { rows: [string, string][] }) {
  return <div className="rounded-xl border border-border p-3">{rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</div>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 flex items-start justify-between gap-4 text-sm last:mb-0"><span className="text-text-muted">{label}</span><span className="text-right font-semibold">{value}</span></div>
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-courier bg-courier-muted text-courier' : 'border-border bg-surface text-text-secondary'}`}>{children}</button>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-surface-raised p-4"><div className="text-xs text-text-muted">{label}</div><div className="mt-1 font-display text-2xl font-semibold">{value}</div></div>
}

function ScanFrame() {
  return <div className="relative h-60 w-60 rounded-3xl border-2 border-white/80"><span className="absolute left-3 right-3 top-1/2 h-0.5 bg-courier" /><span className="absolute inset-10 grid grid-cols-4 gap-2 opacity-30">{Array.from({ length: 16 }).map((_, index) => <span key={index} className={`${index % 3 === 0 ? 'bg-white' : 'border border-white'} rounded-sm`} />)}</span></div>
}

function QrPattern() {
  const modules = Array.from({ length: 70 }, (_, index) => ({ x: 72 + (index % 7) * 14, y: 8 + Math.floor(index / 7) * 14, on: (index * 7 + Math.floor(index / 7)) % 4 !== 1 }))
  return (
    <svg width="190" height="190" viewBox="0 0 190 190" aria-label="Courier Delivery QR">
      <rect width="190" height="190" rx="12" fill="white" />
      {[[10, 10], [120, 10], [10, 120]].map(([x, y]) => <g key={`${x}-${y}`}><rect x={x} y={y} width="60" height="60" rx="4" fill="var(--color-text-primary)"/><rect x={x + 10} y={y + 10} width="40" height="40" fill="white"/><rect x={x + 20} y={y + 20} width="20" height="20" fill="var(--color-text-primary)"/></g>)}
      {modules.map((module, index) => module.on && <rect key={index} x={module.x} y={module.y} width="10" height="10" rx="1" fill="var(--color-text-primary)"/>)}
    </svg>
  )
}

function CheckIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function WaitingIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

function LocationOffIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M8.5 4.2A7 7 0 0119 10c0 4.8-7 11-7 11s-2.2-2-4.1-4.4M5 13.2A8.6 8.6 0 015 10c0-.7.1-1.4.3-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}

function availabilityLabel(value: Availability) {
  return value === 'available' ? 'Available' : value === 'busy' ? 'Busy' : 'Unavailable'
}
