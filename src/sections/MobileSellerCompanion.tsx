import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Input'
import { OrderTimeline, type TimelineEvent } from '../components/ui/Operational'
import {
  PhoneFrame, BottomNav, IconAlerts, IconOrders, IconInbox, IconMore, IconChevronRight,
} from './ShellHelpers'

type TabKey = 'alerts' | 'orders' | 'inbox' | 'more'
type Screen = 'tabs' | 'order' | 'prepare' | 'couriers' | 'offer' | 'pickup-qr' | 'pickup-verified' | 'delivery' | 'conversation' | 'claim'
type OrderStage = 'paid' | 'preparing' | 'ready' | 'offer' | 'assigned' | 'pickup' | 'delivery'

const TABS = [
  { key: 'alerts' as TabKey, label: 'Alerts', icon: <IconAlerts size={22} />, badge: 3 },
  { key: 'orders' as TabKey, label: 'Orders', icon: <IconOrders size={22} />, badge: 2 },
  { key: 'inbox' as TabKey, label: 'Inbox', icon: <IconInbox size={22} />, badge: 2 },
  { key: 'more' as TabKey, label: 'More', icon: <IconMore size={22} /> },
]

const ORDER = {
  id: 'ADU-24091',
  buyer: 'Maya T.',
  product: 'Habesha Kemis — Classic White',
  variant: 'Size M · Gold border',
  amount: 'ETB 2,994',
}

export default function MobileSellerCompanion({ demoTarget }: { demoTarget?: string }) {
  const initialTab: TabKey = demoTarget === 'inbox' ? 'inbox' : demoTarget === 'order' ? 'orders' : 'alerts'
  const initialScreen: Screen = demoTarget === 'order'
    ? 'order'
    : demoTarget === 'pickup-qr'
      ? 'pickup-qr'
      : 'tabs'
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [stage, setStage] = useState<OrderStage>(demoTarget === 'pickup-qr' ? 'assigned' : 'paid')
  const [consoleNotice, setConsoleNotice] = useState(false)

  const selectTab = (tab: TabKey) => {
    setActiveTab(tab)
    setScreen('tabs')
  }

  const backToOrder = () => setScreen('order')

  return (
    <PhoneFrame label="06 — SELLER COMPANION · ADDIS ATELIER">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === 'tabs' && (
          <>
            <CompanionHeader tab={activeTab} />
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'alerts' && <AlertsTab onOrder={() => setScreen('order')} onClaim={() => setScreen('claim')} onLowStock={() => selectTab('more')} />}
              {activeTab === 'orders' && <OrdersTab onOrder={() => setScreen('order')} />}
              {activeTab === 'inbox' && <InboxTab onConversation={() => setScreen('conversation')} onClaim={() => setScreen('claim')} />}
              {activeTab === 'more' && <MoreTab notice={consoleNotice} onConsole={() => setConsoleNotice(true)} />}
            </div>
            <BottomNav items={TABS} active={activeTab} onSelect={key => selectTab(key as TabKey)} accent="var(--color-brand)" />
          </>
        )}
        {screen === 'order' && (
          <OrderDetail
            stage={stage}
            onBack={() => { setActiveTab('orders'); setScreen('tabs') }}
            onPrepare={() => { setStage('preparing'); setScreen('prepare') }}
            onCouriers={() => setScreen(stage === 'offer' ? 'offer' : 'couriers')}
            onPickupQr={() => setScreen('pickup-qr')}
            onDelivery={() => setScreen('delivery')}
            onChat={() => setScreen('conversation')}
          />
        )}
        {screen === 'prepare' && <PrepareOrder onBack={backToOrder} onReady={() => { setStage('ready'); setScreen('couriers') }} />}
        {screen === 'couriers' && <CourierSelection onBack={backToOrder} onSelect={() => { setStage('offer'); setScreen('offer') }} />}
        {screen === 'offer' && <DeliveryOffer onBack={() => setScreen('couriers')} assigned={stage === 'assigned'} onAssigned={() => setStage('assigned')} onContinue={backToOrder} />}
        {screen === 'pickup-qr' && <SellerPickupQr onBack={backToOrder} onVerified={() => setScreen('pickup-verified')} />}
        {screen === 'pickup-verified' && <PickupVerified onContinue={() => { setStage('pickup'); setScreen('delivery') }} />}
        {screen === 'delivery' && <DeliveryStatus stage={stage} onBack={backToOrder} onAdvance={() => setStage('delivery')} />}
        {screen === 'conversation' && <BuyerConversation onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
        {screen === 'claim' && <ClaimResponse onBack={() => { setActiveTab('inbox'); setScreen('tabs') }} />}
      </div>
    </PhoneFrame>
  )
}

function CompanionHeader({ tab }: { tab: TabKey }) {
  const titles: Record<TabKey, string> = { alerts: 'Alerts', orders: 'Paid Orders', inbox: 'Inbox', more: 'More' }
  return (
    <div className="flex h-13 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">AA</div>
        <div><div className="font-display text-base font-semibold">{titles[tab]}</div><div className="text-[10px] text-text-muted">Addis Atelier</div></div>
      </div>
      <span className="rounded-full bg-success-bg px-2 py-1 text-[10px] font-semibold text-success">Store open</span>
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

function AlertsTab({ onOrder, onClaim, onLowStock }: { onOrder: () => void; onClaim: () => void; onLowStock: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Needs attention</span><span className="text-xs text-text-muted">3 open</span></div>
      <AlertRow tone="brand" title="New Paid Order" detail="ADU-24091 · Habesha Kemis — Classic White × 1" time="2m" action="Prepare" onClick={onOrder} />
      <AlertRow tone="danger" title="Claim response due" detail="ADU-24086 · Item not as described" time="42m" action="Respond" onClick={onClaim} />
      <AlertRow tone="warning" title="Low-stock alert" detail="Ethiopian Cotton Dress · 2 remaining" time="1h" action="Review" onClick={onLowStock} />
      <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Operational updates</div>
      <AlertRow tone="info" title="Courier accepted offer" detail="Daniel K. · ADU-24088" time="3h" onClick={onOrder} />
      <AlertRow tone="success" title="Pickup verified" detail="ADU-24083 · Scanned at 10:14" time="5h" onClick={onOrder} />
    </div>
  )
}

function AlertRow({ tone, title, detail, time, action, onClick }: {
  tone: 'brand' | 'danger' | 'warning' | 'info' | 'success'; title: string; detail: string; time: string; action?: string; onClick: () => void
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

function OrdersTab({ onOrder }: { onOrder: () => void }) {
  const orders = [
    { id: 'ADU-24091', buyer: 'Maya T.', item: 'Habesha Kemis — Classic White', status: 'Paid · Needs prep', tone: 'brand' },
    { id: 'ADU-24092', buyer: 'Tigist A.', item: 'Tibeb Scarf × 2', status: 'Preparing', tone: 'warning' },
    { id: 'ADU-24090', buyer: 'Selamawit B.', item: 'Netela Wrap', status: 'Ready for Courier', tone: 'success' },
    { id: 'ADU-24088', buyer: 'Hana G.', item: 'Cotton Dress', status: 'Out for Delivery', tone: 'info' },
  ]
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
        <Pill active>Active 4</Pill><Pill>Needs prep 1</Pill><Pill>Ready 1</Pill><Pill>Delivery 1</Pill>
      </div>
      {orders.map(order => (
        <button key={order.id} onClick={onOrder} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted font-mono text-[10px] font-bold text-brand-dark">{order.id.slice(-3)}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{order.item}</span><span className="text-xs text-text-muted">{order.buyer} · {order.id}</span><StatusText tone={order.tone}>{order.status}</StatusText></span>
          <IconChevronRight size={16} />
        </button>
      ))}
    </div>
  )
}

function OrderDetail({ stage, onBack, onPrepare, onCouriers, onPickupQr, onDelivery, onChat }: {
  stage: OrderStage; onBack: () => void; onPrepare: () => void; onCouriers: () => void; onPickupQr: () => void; onDelivery: () => void; onChat: () => void
}) {
  const stageLabels: Record<OrderStage, string> = {
    paid: 'Paid · Needs Preparation', preparing: 'Preparing', ready: 'Ready for Courier',
    offer: 'Delivery Offer Sent', assigned: 'Courier Assigned', pickup: 'Pickup Verified', delivery: 'Out for Delivery',
  }
  return (
    <>
      <ScreenHeader title={ORDER.id} onBack={onBack} trailing={<button onClick={onChat} className="rounded-lg bg-surface-raised px-3 py-2 text-xs font-semibold text-brand">Chat</button>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-brand-muted p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark">Current status</div>
          <div className="mt-1 font-display text-xl font-semibold">{stageLabels[stage]}</div>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary"><span className="rounded-full bg-success-bg px-2 py-1 font-semibold text-success">Paid · read-only</span><span>Provider confirmed</span></div>
        </div>

        <SectionTitle>Products</SectionTitle>
        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-semibold">{ORDER.product}</div><div className="mt-1 text-xs text-text-muted">{ORDER.variant} · Quantity 1</div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm"><span className="text-text-secondary">Paid total</span><span className="font-bold">{ORDER.amount}</span></div>
        </div>

        <SectionTitle>Buyer-safe fulfilment info</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm"><div className="font-semibold">{ORDER.buyer}</div><div className="mt-1 text-xs text-text-secondary">Courier Delivery · Kazanchis, Addis Ababa</div><div className="mt-1 text-xs text-text-muted">Phone details are shared only with the assigned approved courier.</div></div>

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
  const labels: Record<OrderStage, string> = {
    paid: 'Paid', preparing: 'Preparation', ready: 'Ready for Courier', offer: 'Delivery Offer',
    assigned: 'Courier Assigned', pickup: 'Pickup Verified', delivery: 'Delivery in Progress',
  }
  return order.map((key, index) => ({
    id: key,
    label: labels[key],
    status: index < current ? 'completed' : index === current ? 'active' : 'pending',
    detail: key === 'paid' ? 'Read-only provider confirmation' : key === 'pickup' ? 'Courier scans Seller Pickup QR' : undefined,
  }))
}

function PrepareOrder({ onBack, onReady }: { onBack: () => void; onReady: () => void }) {
  const [checks, setChecks] = useState([false, false, false])
  const labels = ['Product and variant checked', 'Item quality inspected', 'Package labelled for ADU-24091']
  const toggle = (index: number) => setChecks(values => values.map((value, i) => i === index ? !value : value))
  return (
    <>
      <ScreenHeader title="Prepare Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-surface-raised p-3"><div className="text-xs text-text-muted">{ORDER.id}</div><div className="mt-1 text-sm font-semibold">{ORDER.product}</div><div className="text-xs text-text-muted">{ORDER.variant}</div></div>
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

function CourierSelection({ onBack, onSelect }: { onBack: () => void; onSelect: () => void }) {
  return (
    <>
      <ScreenHeader title="Approved Courier Pool" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm leading-relaxed text-text-secondary">Select from couriers approved by Addis Atelier. Compensation is visible before an offer is sent.</p>
        <CourierCard name="Daniel K." initials="DK" availability="Available now" relationship="Approved · 8 months" compensation="ETB 180" work="126 completed · 98% on-time" onSelect={onSelect} />
        <CourierCard name="Rahel M." initials="RM" availability="Available in 20 min" relationship="Approved · 4 months" compensation="ETB 195" work="58 completed · 97% on-time" onSelect={onSelect} />
        <CourierCard name="Yonas T." initials="YT" availability="Busy" relationship="Approved · 1 year" compensation="ETB 175" work="211 completed · 99% handoff" disabled onSelect={onSelect} />
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

function DeliveryOffer({ onBack, assigned, onAssigned, onContinue }: { onBack: () => void; assigned: boolean; onAssigned: () => void; onContinue: () => void }) {
  return (
    <>
      <ScreenHeader title="Delivery Offer" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full ${assigned ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{assigned ? <CheckIcon /> : <OfferIcon />}</span>
        <div className="mt-5 font-display text-2xl font-semibold">{assigned ? 'Courier Assigned' : 'Offer sent to Daniel K.'}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{assigned ? 'Daniel accepted the delivery. Prepare to display the Seller Pickup QR when they arrive.' : 'Waiting for Daniel to accept or decline. The order remains Ready for Courier.'}</p>
        <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left"><InfoRow label="Order" value={ORDER.id} /><InfoRow label="Compensation" value="ETB 180" /><InfoRow label="Courier" value="Daniel K." /></div>
        {!assigned ? <Button onClick={onAssigned} style={{ width: '100%', marginTop: 24 }}>Simulate courier acceptance</Button> : <Button onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue to Order</Button>}
      </div>
    </>
  )
}

function SellerPickupQr({ onBack, onVerified }: { onBack: () => void; onVerified: () => void }) {
  return (
    <>
      <ScreenHeader title="Seller Pickup QR" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl bg-surface p-5 shadow-lg ring-1 ring-border"><QrPattern /></div>
        <div className="mt-5 font-display text-2xl font-semibold">Display this QR to the courier</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Daniel K. scans this Seller Pickup QR after receiving the sealed package.</p>
        <div className="mt-5 w-full rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Keep the package until the courier scan is verified. This QR is for pickup only.</div>
      </div>
      <div className="p-4 pb-6"><Button onClick={onVerified} size="lg" style={{ width: '100%' }}>Simulate courier scan</Button></div>
    </>
  )
}

function PickupVerified({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Pickup Verified</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">Daniel K. scanned the Seller Pickup QR. The package is now in courier custody.</p>
      <div className="mt-6 w-full rounded-xl bg-success-bg p-4 text-left"><InfoRow label="Order" value={ORDER.id} /><InfoRow label="Verified" value="Today · 10:14" /><InfoRow label="Courier" value="Daniel K." /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>View Delivery Status</Button>
    </div>
  )
}

function DeliveryStatus({ stage, onBack, onAdvance }: { stage: OrderStage; onBack: () => void; onAdvance: () => void }) {
  const out = stage === 'delivery'
  const events: TimelineEvent[] = [
    { id: 'pickup', label: 'Pickup Verified', status: 'completed', timestamp: '10:14', detail: 'Seller Pickup QR scanned' },
    { id: 'route', label: 'Out for Delivery', status: out ? 'completed' : 'active', timestamp: out ? '10:32' : undefined, detail: 'Operational status update' },
    { id: 'handoff', label: 'Buyer Handoff', status: out ? 'active' : 'pending', detail: 'Courier displays Delivery QR; buyer scans' },
    { id: 'done', label: 'Delivery Verified', status: 'pending' },
  ]
  return (
    <>
      <ScreenHeader title="Delivery Status" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-info-bg p-4"><div className="text-xs font-semibold uppercase tracking-wider text-info">Operational progress</div><div className="mt-1 font-display text-xl font-semibold">{out ? 'Out for Delivery' : 'Pickup Verified'}</div><div className="mt-1 text-xs text-text-secondary">Courier: Daniel K. · {ORDER.id}</div></div>
        <SectionTitle>Timeline</SectionTitle>
        <OrderTimeline events={events} />
        <div className="mt-5 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">Delivery is shown through verified statuses and checkpoints. No live courier map is available.</div>
        {!out && <Button onClick={onAdvance} variant="tertiary" style={{ width: '100%', marginTop: 16 }}>Preview Out for Delivery</Button>}
      </div>
    </>
  )
}

function InboxTab({ onConversation, onClaim }: { onConversation: () => void; onClaim: () => void }) {
  return (
    <div>
      <button onClick={onConversation} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials="MT" /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">Maya T.</span><span className="text-[10px] text-text-muted">2m</span></span><span className="block truncate text-xs text-text-muted">Thanks, I’ll be available for delivery.</span><span className="mt-1 inline-block rounded-full bg-brand-muted px-2 py-0.5 text-[10px] text-brand-dark">Order · ADU-24091</span></span><span className="h-2 w-2 rounded-full bg-brand" /></button>
      <button onClick={onClaim} className="flex w-full items-center gap-3 border-b border-border p-4 text-left"><Avatar initials="SB" /><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">Selamawit B.</span><span className="text-[10px] text-danger">Due today</span></span><span className="block truncate text-xs text-text-muted">Claim response requested</span><span className="mt-1 inline-block rounded-full bg-danger-bg px-2 py-0.5 text-[10px] text-danger">Claim · CLM-2041</span></span></button>
      <div className="flex items-center gap-3 border-b border-border p-4 opacity-70"><Avatar initials="TA" /><span><span className="block font-semibold">Tigist A.</span><span className="text-xs text-text-muted">Does this scarf come in silver?</span></span></div>
    </div>
  )
}

function BuyerConversation({ onBack }: { onBack: () => void }) {
  const [context, setContext] = useState('Order')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <>
      <ScreenHeader title="Maya T." onBack={onBack} />
      <div className="border-b border-border bg-warning-bg px-4 py-2 text-[10px] leading-relaxed text-text-secondary">Chat supports coordination. It does not change payment, pickup, delivery, claim, or Order truth.</div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">{['Product', 'Post', 'Order'].map(item => <Pill key={item} active={context === item} onClick={() => setContext(item)}>{item === 'Order' ? ORDER.id : item}</Pill>)}</div>
      <div className="flex-1 overflow-y-auto bg-surface-raised p-4">
        <Bubble>Hi Maya, we’ve received your paid Order and started preparation.</Bubble>
        <Bubble mine>Your order timeline will update when it is ready.</Bubble>
        <Bubble>Thanks, I’ll be available for delivery.</Bubble>
        {sent && <Bubble mine>{message || 'Thank you.'}</Bubble>}
      </div>
      <div className="border-t border-border bg-surface p-3 pb-5">
        <div className="mb-2 flex gap-2 overflow-x-auto"><Pill onClick={() => setMessage('Your order is ready for courier pickup.')}>Order ready</Pill><Pill onClick={() => setMessage('A courier has been assigned.')}>Courier assigned</Pill></div>
        <div className="flex gap-2"><div className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-text-secondary">{message || `Message about ${context.toLowerCase()}`}</div><Button size="sm" onClick={() => setSent(true)}>Send</Button></div>
      </div>
    </>
  )
}

function ClaimResponse({ onBack }: { onBack: () => void }) {
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <>
      <ScreenHeader title="Claim Response" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-danger-bg p-4"><div className="text-xs font-semibold uppercase tracking-wider text-danger">Response due today</div><div className="mt-1 font-display text-xl font-semibold">Item not as described</div><div className="mt-1 text-xs text-text-secondary">CLM-2041 · Order ADU-24086</div></div>
        <SectionTitle>Buyer report</SectionTitle>
        <div className="rounded-xl bg-surface-raised p-3 text-sm leading-relaxed text-text-secondary">“The embroidery colour differs from the product images. I ordered gold, but received silver.”</div>
        <SectionTitle>Submitted evidence</SectionTitle>
        <div className="flex h-24 items-center justify-center rounded-xl border border-border bg-surface-raised text-xs text-text-muted">Buyer photo · product detail</div>
        <div className="mt-5"><Textarea label="Seller response" value={response} onChange={event => setResponse(event.target.value)} placeholder="Respond with relevant preparation and product details." rows={5} /></div>
        {submitted && <div className="mt-4 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Response submitted · Claim under review</div>}
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!response || submitted} onClick={() => setSubmitted(true)} style={{ width: '100%' }}>{submitted ? 'Response Submitted' : 'Submit Claim Response'}</Button></div>
    </>
  )
}

function MoreTab({ notice, onConsole }: { notice: boolean; onConsole: () => void }) {
  return (
    <div className="p-4">
      <div className="rounded-2xl bg-warning-bg p-4"><div className="text-xs font-semibold uppercase tracking-wider text-warning">Low stock</div><div className="mt-1 font-display text-lg font-semibold">Ethiopian Cotton Dress</div><div className="mt-1 text-sm text-text-secondary">2 remaining · Review inventory in Seller Console</div></div>
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
