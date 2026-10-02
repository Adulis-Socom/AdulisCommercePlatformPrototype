import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  PhoneFrame, BottomNav, IconMap, IconTruck, IconHistory, IconUser, IconChevronRight,
} from './ShellHelpers'

type TabKey = 'assignments' | 'active' | 'history' | 'account'
type Availability = 'available' | 'busy' | 'unavailable'
type Screen = 'tabs' | 'offer' | 'invitation' | 'opportunity' | 'relationships' | 'pickup-scan' | 'pickup-verified' | 'pickup-checkpoint' | 'delivery' | 'delivery-qr' | 'waiting' | 'delivery-verified' | 'delivery-checkpoint'
type ActiveStage = 'none' | 'accepted' | 'pickup-verified' | 'delivering' | 'waiting' | 'verified'
type CheckpointState = 'recorded' | 'unavailable'

const TABS = [
  { key: 'assignments' as TabKey, label: 'Assignments', icon: <IconMap size={22} />, badge: 2 },
  { key: 'active' as TabKey, label: 'Active', icon: <IconTruck size={22} /> },
  { key: 'history' as TabKey, label: 'History', icon: <IconHistory size={22} /> },
  { key: 'account' as TabKey, label: 'Account', icon: <IconUser size={22} /> },
]

const DELIVERY = {
  id: 'DLV-24091',
  orderId: 'ADU-24091',
  seller: 'Addis Atelier',
  buyer: 'Maya T.',
  sellerZone: 'Bole, Addis Ababa',
  buyerZone: 'Kazanchis, Addis Ababa',
  item: 'Habesha Kemis — Classic White',
  total: 'ETB 2,994',
  compensation: 'ETB 180',
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
  const initialStage: ActiveStage = demoTarget === 'delivery' || demoTarget === 'delivery-qr'
    ? 'delivering'
    : demoTarget === 'active' || demoTarget === 'pickup-scan'
      ? 'accepted'
      : 'none'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [availability, setAvailability] = useState<Availability>('available')
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [stage, setStage] = useState<ActiveStage>(initialStage)
  const [pickupCheckpoint, setPickupCheckpoint] = useState<CheckpointState>('recorded')
  const [deliveryCheckpoint, setDeliveryCheckpoint] = useState<CheckpointState>('recorded')

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    setScreen('tabs')
  }

  return (
    <PhoneFrame label="07 — COURIER MODE · DANIEL K.">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === 'tabs' && (
          <>
            <CourierHeader tab={activeTab} availability={availability} onAvailability={setAvailability} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'assignments' && <CourierHome hasActive={stage !== 'none' && stage !== 'verified'} availability={availability} onOffer={() => setScreen('offer')} onInvitation={() => setScreen('invitation')} onOpportunity={() => setScreen('opportunity')} />}
              {activeTab === 'active' && <ActiveAssignment stage={stage} onAssignments={() => selectTab('assignments')} onScan={() => setScreen('pickup-scan')} onDelivery={() => setScreen('delivery')} onWaiting={() => setScreen('waiting')} />}
              {activeTab === 'history' && <HistoryTab />}
              {activeTab === 'account' && <AccountTab availability={availability} onAvailability={setAvailability} onRelationships={() => setScreen('relationships')} onInvitation={() => setScreen('invitation')} onOpportunity={() => setScreen('opportunity')} />}
            </div>
            <BottomNav items={TABS} active={activeTab} onSelect={key => selectTab(key as TabKey)} accent="var(--color-courier)" />
          </>
        )}
        {screen === 'offer' && <OfferDetail hasActive={stage !== 'none' && stage !== 'verified'} onBack={() => setScreen('tabs')} onAccept={() => { setStage('accepted'); setActiveTab('active'); setScreen('tabs') }} />}
        {screen === 'invitation' && <SellerInvitation onBack={() => setScreen('tabs')} />}
        {screen === 'opportunity' && <CourierOpportunity onBack={() => setScreen('tabs')} />}
        {screen === 'relationships' && <SellerRelationships onBack={() => setScreen('tabs')} />}
        {screen === 'pickup-scan' && <PickupScanner onBack={() => setScreen('tabs')} onScan={() => setScreen('pickup-verified')} />}
        {screen === 'pickup-verified' && <PickupVerified onContinue={() => setScreen('pickup-checkpoint')} />}
        {screen === 'pickup-checkpoint' && <CheckpointStatus type="Pickup" state={pickupCheckpoint} setState={setPickupCheckpoint} onContinue={() => { setStage('pickup-verified'); setScreen('delivery') }} />}
        {screen === 'delivery' && <DeliveryDetail onBack={() => setScreen('tabs')} onComplete={() => { setStage('delivering'); setScreen('delivery-qr') }} />}
        {screen === 'delivery-qr' && <DeliveryQr onBack={() => setScreen('delivery')} onDisplay={() => { setStage('waiting'); setScreen('waiting') }} />}
        {screen === 'waiting' && <WaitingForRecipient onBack={() => setScreen('tabs')} onVerified={() => setScreen('delivery-verified')} />}
        {screen === 'delivery-verified' && <DeliveryVerified onContinue={() => setScreen('delivery-checkpoint')} />}
        {screen === 'delivery-checkpoint' && <CheckpointStatus type="Delivery" state={deliveryCheckpoint} setState={setDeliveryCheckpoint} onContinue={() => { setStage('verified'); setActiveTab('history'); setScreen('tabs') }} />}
      </div>
    </PhoneFrame>
  )
}

function CourierHeader({ tab, availability, onAvailability }: { tab: TabKey; availability: Availability; onAvailability: (value: Availability) => void }) {
  const titles: Record<TabKey, string> = { assignments: 'Courier Home', active: 'Active Delivery', history: 'History', account: 'Daniel K.' }
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex h-13 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div><div className="font-display text-lg font-semibold">{titles[tab]}</div>{tab === 'assignments' && <div className="text-[10px] text-text-muted">Addis Ababa</div>}</div>
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

function CourierHome({ hasActive, availability, onOffer, onInvitation, onOpportunity }: {
  hasActive: boolean; availability: Availability; onOffer: () => void; onInvitation: () => void; onOpportunity: () => void
}) {
  return (
    <div className="p-4">
      {hasActive && <div className="mb-4 rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Active delivery</div><div className="mt-1 font-display text-lg font-semibold">{DELIVERY.id} · {DELIVERY.seller}</div><div className="mt-1 text-xs text-text-secondary">Only one accepted delivery can be active at a time.</div></div>}
      {availability !== 'available' && <div className="mb-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Set availability to Available to receive new delivery offers.</div>}
      <div className="flex items-center justify-between"><SectionTitle>Delivery offers</SectionTitle><span className="text-xs text-text-muted">1 available</span></div>
      <OfferCard seller={DELIVERY.seller} item={DELIVERY.item} pickup="Bole" delivery="Kazanchis" compensation={DELIVERY.compensation} disabled={hasActive || availability !== 'available'} onClick={onOffer} />
      <SectionTitle>Seller opportunities</SectionTitle>
      <button onClick={onInvitation} className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">BL</span><span className="flex-1"><span className="block text-sm font-semibold">Buna Lane invited you</span><span className="text-xs text-text-muted">Seller Pool invitation · Coffee deliveries</span></span><IconChevronRight size={16} /></button>
      <button onClick={onOpportunity} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-courier-muted text-xs font-bold text-courier">OP</span><span className="flex-1"><span className="block text-sm font-semibold">Courier opportunity</span><span className="text-xs text-text-muted">Apply to deliver for Nura Glow</span></span><IconChevronRight size={16} /></button>
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

function OfferDetail({ hasActive, onBack, onAccept }: { hasActive: boolean; onBack: () => void; onAccept: () => void }) {
  return (
    <>
      <ScreenHeader title="Delivery Offer" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Compensation</div><div className="mt-1 font-display text-3xl font-semibold">ETB 180</div><div className="mt-1 text-xs text-text-secondary">Fixed for this delivery</div></div>
        <SectionTitle>Assignment</SectionTitle>
        <InfoCard rows={[['Seller Order', DELIVERY.orderId], ['Payment status', 'Paid · provider confirmed'], ['Seller', DELIVERY.seller], ['Package', `${DELIVERY.item} · sealed`], ['Pickup window', 'Today · 10:00–11:00'], ['Delivery area', 'Kazanchis'], ['Expected work', 'One pickup · one handoff']]} />
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

function ActiveAssignment({ stage, onAssignments, onScan, onDelivery, onWaiting }: {
  stage: ActiveStage; onAssignments: () => void; onScan: () => void; onDelivery: () => void; onWaiting: () => void
}) {
  if (stage === 'none' || stage === 'verified') {
    return <EmptyActive onAssignments={onAssignments} completed={stage === 'verified'} />
  }
  const status = stage === 'accepted' ? 'Go to Pickup' : stage === 'pickup-verified' ? 'Pickup Verified' : stage === 'waiting' ? 'Waiting for Recipient' : 'Delivering'
  return (
    <div className="p-4">
      <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">One active delivery</div><div className="mt-1 font-display text-xl font-semibold">{status}</div><div className="mt-1 text-xs text-text-secondary">{DELIVERY.orderId} · {DELIVERY.id} · {DELIVERY.compensation}</div></div>
      <SectionTitle>{stage === 'accepted' ? 'Pickup instructions' : 'Delivery detail'}</SectionTitle>
      {stage === 'accepted' ? (
        <>
          <InfoCard rows={[['Seller', DELIVERY.seller], ['Pickup area', DELIVERY.sellerZone], ['Package', '1 sealed item'], ['Pickup window', '10:00–11:00']]} />
          <div className="mt-3 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Receive the package, then scan the Pickup QR displayed by the seller.</div>
          <Button onClick={onScan} style={{ width: '100%', marginTop: 16 }}>Scan Seller Pickup QR</Button>
        </>
      ) : (
        <>
          <InfoCard rows={[['Seller Order', DELIVERY.orderId], ['Recipient', DELIVERY.buyer], ['Delivery area', DELIVERY.buyerZone], ['Handoff', 'Buyer or delegated recipient'], ['Package', DELIVERY.item], ['Paid total', DELIVERY.total]]} />
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

function PickupScanner({ onBack, onScan }: { onBack: () => void; onScan: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-text-primary text-white">
      <div className="flex items-center gap-3 p-4"><button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xl">×</button><div className="font-display text-lg font-semibold">Scan Seller Pickup QR</div></div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <ScanFrame />
        <p className="mt-6 px-8 text-center text-sm text-white/70">The seller displays the Pickup QR. Position it inside the frame.</p>
      </div>
      <div className="p-5 pb-8"><Button size="lg" onClick={onScan} style={{ width: '100%' }}>Simulate QR detected</Button></div>
    </div>
  )
}

function PickupVerified({ onContinue }: { onContinue: () => void }) {
  return (
    <StatusScreen title="Pickup Verified" description={`The Seller Pickup QR matched ${DELIVERY.orderId}. Package custody is now assigned to you.`}>
      <div className="w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Seller" value={DELIVERY.seller} /><InfoRow label="Verified" value="Today · 10:14" /><InfoRow label="Package" value={DELIVERY.item} /></div>
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

function DeliveryDetail({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  const events: TimelineEvent[] = [
    { id: 'accepted', label: 'Delivery Accepted', status: 'completed', timestamp: '09:42' },
    { id: 'pickup', label: 'Pickup Verified', status: 'completed', timestamp: '10:14' },
    { id: 'checkpoint', label: 'Pickup Checkpoint', status: 'completed', timestamp: '10:14', detail: 'Location recorded' },
    { id: 'delivery', label: 'Delivery in Progress', status: 'active' },
    { id: 'handoff', label: 'Recipient Handoff', status: 'pending' },
  ]
  return (
    <>
      <ScreenHeader title="Delivery Detail" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-courier-muted p-4"><div className="text-xs font-semibold uppercase tracking-wider text-courier">Active assignment</div><div className="mt-1 font-display text-xl font-semibold">{DELIVERY.id}</div><div className="mt-1 text-xs text-text-secondary">{DELIVERY.buyerZone} · {DELIVERY.compensation}</div></div>
        <SectionTitle>Recipient</SectionTitle>
        <InfoCard rows={[['Seller Order', DELIVERY.orderId], ['Name', DELIVERY.buyer], ['Handoff', 'Buyer or delegated recipient'], ['Area', DELIVERY.buyerZone], ['Contact', '+251 91 ••• ••78']]} />
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

function WaitingForRecipient({ onBack, onVerified }: { onBack: () => void; onVerified: () => void }) {
  return (
    <>
      <ScreenHeader title="Waiting for Recipient" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-courier-muted text-courier"><WaitingIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Waiting for recipient scan</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Keep the Delivery QR visible. Maya or the delegated recipient scans it from their Adulis app.</p>
        <div className="mt-5 w-full rounded-xl bg-surface-raised p-4 text-left"><InfoRow label="Seller Order" value={DELIVERY.orderId} /><InfoRow label="Delivery" value={DELIVERY.id} /><InfoRow label="Recipient" value={DELIVERY.buyer} /><InfoRow label="Status" value="Awaiting scan" /></div>
      </div>
      <div className="p-4 pb-6"><Button onClick={onVerified} size="lg" style={{ width: '100%' }}>Simulate Recipient Scan</Button></div>
    </>
  )
}

function DeliveryVerified({ onContinue }: { onContinue: () => void }) {
  return (
    <StatusScreen title="Delivery Verified" description="The recipient scanned your Delivery QR. Final handoff is successful.">
      <div className="w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Seller Order" value={DELIVERY.orderId} /><InfoRow label="Recipient" value={DELIVERY.buyer} /><InfoRow label="Verified" value="Today · 11:06" /><InfoRow label="Compensation" value={DELIVERY.compensation} /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue to Delivery Checkpoint</Button>
    </StatusScreen>
  )
}

function SellerInvitation({ onBack }: { onBack: () => void }) {
  const [accepted, setAccepted] = useState(false)
  return (
    <>
      <ScreenHeader title="Seller Pool Invitation" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted font-display text-xl font-bold text-brand-dark">BL</div>
        <div className="mt-4 font-display text-2xl font-semibold">Buna Lane invited you</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Join Buna Lane’s approved Seller Courier Pool to receive delivery offers when you are available.</p>
        <SectionTitle>Relationship details</SectionTitle>
        <InfoCard rows={[['Seller', 'Buna Lane'], ['Typical area', 'Bole · Kazanchis'], ['Package type', 'Coffee and small goods'], ['Typical compensation', 'ETB 110–160'], ['Relationship', 'Invitation pending']]} />
        <div className="mt-4 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">Joining a pool does not guarantee work. Each delivery is a separate fixed offer that you may accept or decline.</div>
        {accepted && <div className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Invitation accepted · Relationship approved</div>}
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={accepted} onClick={() => setAccepted(true)} style={{ width: '100%' }}>{accepted ? 'Added to Seller Pool' : 'Accept Invitation'}</Button></div>
    </>
  )
}

function CourierOpportunity({ onBack }: { onBack: () => void }) {
  const [applied, setApplied] = useState(false)
  return (
    <>
      <ScreenHeader title="Courier Opportunity" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Deliver for Nura Glow</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Apply to join Nura Glow’s approved courier pool for small beauty and personal-care deliveries.</p>
        <SectionTitle>Opportunity</SectionTitle>
        <InfoCard rows={[['Seller area', 'Sar Bet'], ['Common delivery areas', 'Old Airport · Mexico'], ['Package size', 'Small'], ['Typical completed work', '2–4 deliveries weekly'], ['Typical compensation', 'ETB 120–170 per offer']]} />
        <div className="mt-4 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Compensation is shown as a fixed amount on every delivery offer before acceptance.</div>
        {applied && <div className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Application sent · Seller review pending</div>}
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={applied} onClick={() => setApplied(true)} style={{ width: '100%' }}>{applied ? 'Application Sent' : 'Apply to Seller Pool'}</Button></div>
    </>
  )
}

function SellerRelationships({ onBack }: { onBack: () => void }) {
  return (
    <>
      <ScreenHeader title="Seller Relationships" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-text-secondary">You can belong to multiple approved Seller Courier Pools.</p>
        <Relationship seller="Addis Atelier" initials="AA" since="Approved · 8 months" work="126 completed deliveries" />
        <Relationship seller="Lalibela Craft" initials="LC" since="Approved · 3 months" work="34 completed deliveries" />
        <Relationship seller="Buna Lane" initials="BL" since="Approved today" work="No completed work yet" />
      </div>
    </>
  )
}

function Relationship({ seller, initials, since, work }: { seller: string; initials: string; since: string; work: string }) {
  return <div className="mt-4 flex items-center gap-3 rounded-xl border border-border p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-xs font-bold text-brand-dark">{initials}</span><span><span className="block text-sm font-semibold">{seller}</span><span className="text-xs text-success">{since}</span><span className="mt-1 block text-xs text-text-muted">{work}</span></span></div>
}

function HistoryTab() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3"><Metric label="Completed" value="218" /><Metric label="Verified handoff" value="99%" /></div>
      <SectionTitle>Recent deliveries</SectionTitle>
      <HistoryRow id="DLV-24083" seller="Addis Atelier" date="Today · 08:52" amount="ETB 160" />
      <HistoryRow id="DLV-24079" seller="Lalibela Craft" date="Yesterday" amount="ETB 145" />
      <HistoryRow id="DLV-24072" seller="Addis Atelier" date="12 Sep" amount="ETB 180" />
      <p className="mt-5 text-xs leading-relaxed text-text-muted">History shows completed work and the compensation attached to each delivery.</p>
    </div>
  )
}

function HistoryRow({ id, seller, date, amount }: { id: string; seller: string; date: string; amount: string }) {
  return <div className="flex items-center justify-between border-b border-border py-4"><span><span className="block text-sm font-semibold">{seller}</span><span className="text-xs text-text-muted">{id} · {date}</span></span><span className="text-sm font-bold text-courier">{amount}</span></div>
}

function AccountTab({ availability, onAvailability, onRelationships, onInvitation, onOpportunity }: {
  availability: Availability; onAvailability: (value: Availability) => void; onRelationships: () => void; onInvitation: () => void; onOpportunity: () => void
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-3"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-courier-muted font-display text-xl font-bold text-courier">DK</span><span><span className="block font-display text-xl font-semibold">Daniel K.</span><span className="text-xs text-text-muted">Courier profile · Addis Ababa</span><span className="mt-1 block text-xs font-semibold text-success">Approved</span></span></div>
      <SectionTitle>Availability</SectionTitle>
      <div className="grid grid-cols-3 gap-2">{(['available', 'busy', 'unavailable'] as Availability[]).map(value => <button key={value} onClick={() => onAvailability(value)} className={`rounded-xl border px-2 py-3 text-xs font-semibold ${availability === value ? 'border-courier bg-courier-muted text-courier' : 'border-border text-text-muted'}`}>{availabilityLabel(value)}</button>)}</div>
      <SectionTitle>Profile</SectionTitle>
      <InfoCard rows={[['Completed work', '218 deliveries'], ['Verified handoff', '99%'], ['Primary area', 'Central Addis Ababa'], ['Vehicle', 'Motorcycle']]} />
      <SectionTitle>Seller network</SectionTitle>
      <MenuButton label="Approved Seller Relationships" detail="3 approved pools" onClick={onRelationships} />
      <MenuButton label="Seller Invitations" detail="1 pending invitation" onClick={onInvitation} />
      <MenuButton label="Opportunities" detail="Apply to approved Seller Pools" onClick={onOpportunity} />
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
