// SIM-001 / SIM-002: the marketplace-dataset Order surfaces for the Seller Console, the Seller Companion and the Courier app. They read the one
// simulation store (store.tsx), so a transition made on any surface shows on the others. The Buyer's Orders live in MobileBuyer.tsx (they need its Header).
import { useState } from 'react'
import { isLegacy } from '../marketplace/registry'
import { SimulationGate, usePrototypeMode } from '../prototype-mode'
import { Button } from '../components/ui/Button'
import { Page, Card } from '../sections/console/kit'
import { PhoneFrame, BottomNav, IconMap, IconTruck, IconHistory, IconUser, IconUsers, IconClipboard } from '../sections/ShellHelpers'
import { useSim, WORLD } from './store'
import {
  MODE_LABEL, STATUS_LABEL, isOpen, ordersOfCourier, ordersOfSeller, pendingOffers, sortNewest, type Availability, type Party, type SimOrder, type SimState, type Status,
} from './orders'
import { CourierFeedback, CourierPools } from './feedback-ui'
import { CourierOffers, Msg, NewOrderForm, OrderDetail, OrderRows, ScanPanel, SimBar, StatusPill, etb, fmtAt, itemsOf, partyName, useRun } from './ui'

/** What a Seller does next on an Order, or null when it is waiting on someone else. */
export function sellerNextStep(sim: SimState, o: SimOrder): string | null {
  switch (o.status) {
    case 'PAID': return 'New simulated paid Order: start preparing'
    case 'PREPARING': return 'Being prepared: mark it ready'
    case 'READY_FOR_COLLECTION': return 'Ready for collection: present the collection code to the Buyer'
    case 'COURIER_ASSIGNED': return 'Courier assigned: present the pickup code'
    case 'DELIVERY_FAILED': return o.mode === 'COURIER_DELIVERY' ? 'Delivery failed: take the goods back (scan the return code)' : null
    case 'READY_FOR_DELIVERY':
      if (o.mode === 'SELLER_DELIVERY') return 'Ready: start Seller Delivery'
      return pendingOffers(sim, o.id).length ? null : 'Ready: offer it to an eligible Courier'
    case 'OUT_FOR_DELIVERY': return o.mode === 'SELLER_DELIVERY' ? 'Out for delivery: present the final code to the Buyer' : null
    default: return null
  }
}
/** Orders that need the Seller now (the Companion's tab badge and Alerts rows). Zero on the legacy dataset, which has no simulation store. */
export function useSellerActions(sellerId: string): { order: SimOrder; text: string }[] {
  if (isLegacy) return []
  // eslint-disable-next-line react-hooks/rules-of-hooks -- isLegacy is a module constant, so the hook order never changes
  const { sim } = useSim()
  return sortNewest(ordersOfSeller(sim, sellerId)).flatMap(order => { const text = sellerNextStep(sim, order); return text ? [{ order, text }] : [] })
}

const FILTERS: [string, string][] = [['ACTIVE', 'Active'], ['ALL', 'All statuses'], ...(Object.keys(STATUS_LABEL) as Status[]).map(s => [s, STATUS_LABEL[s]] as [string, string])]
const pick = (orders: SimOrder[], filter: string) => (filter === 'ALL' ? orders : filter === 'ACTIVE' ? orders.filter(isOpen) : orders.filter(o => o.status === filter))

/** Seller Console > Orders on the marketplace dataset (internal simulation only; the MVP shows the gate). */
export function SellerOrders({ sellerId }: { sellerId: string }) {
  const { simulation } = usePrototypeMode()
  if (!simulation) return <SimulationGate title="Orders">Release 1 has no paid Orders: Buyers review a checkout preview and no Order is placed, so there is nothing to prepare, confirm or fulfil here.</SimulationGate>
  return <SellerOrdersBody sellerId={sellerId} />
}
function SellerOrdersBody({ sellerId }: { sellerId: string }) {
  const { sim } = useSim()
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState('ACTIVE')
  const actor: Party = { role: 'SELLER', id: sellerId }
  const all = sortNewest(ordersOfSeller(sim, sellerId))
  const rows = pick(all, filter)
  return (
    <div data-sim-surface="seller-orders">
      <SimBar />
      <Page title="Orders" subtitle={`${partyName(sellerId)} · ${all.length} simulated Orders. Prepare, mark ready, offer to Couriers, present handoff codes. All commerce here is an internal simulation.`}>
        {open ? (
          <Card title="Order"><OrderDetail orderId={open} actor={actor} onBack={() => setOpen(null)} /></Card>
        ) : (
          <div className="flex flex-col gap-4">
            <NewOrderForm sellerId={sellerId} />
            <div className="flex flex-wrap items-end gap-3">
              <div><label htmlFor="orders-filter" className="mb-1 block text-xs font-semibold text-text-secondary">Status</label>
                <select id="orders-filter" value={filter} onChange={e => setFilter(e.target.value)} className="block h-11 rounded-lg border border-border bg-surface px-3 text-sm">{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
              <p data-order-count className="pb-3 text-xs text-text-muted">{rows.length} of {all.length} Orders</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface"><OrderRows orders={rows} who="seller" onOpen={setOpen} /></div>
          </div>
        )}
      </Page>
    </div>
  )
}

/** Companion > Orders tab (simulation). `open` is lifted so an Alert can open an Order here. */
export function CompanionOrders({ sellerId, open, setOpen }: { sellerId: string; open: string | null; setOpen: (id: string | null) => void }) {
  const { sim } = useSim()
  const [filter, setFilter] = useState('ACTIVE')
  const actor: Party = { role: 'SELLER', id: sellerId }
  const all = sortNewest(ordersOfSeller(sim, sellerId))
  return (
    <div data-sim-surface="companion-orders">
      <SimBar />
      {open && sim.orders[open] ? <OrderDetail orderId={open} actor={actor} onBack={() => setOpen(null)} /> : (
        <>
          <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
            {FILTERS.slice(0, 2).map(([v, l]) => <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className={`min-h-9 flex-shrink-0 rounded-full px-3 text-xs font-semibold ${filter === v ? 'bg-brand text-on-brand' : 'bg-surface-raised text-text-secondary'}`}>{l} {pick(all, v).length}</button>)}
          </div>
          <OrderRows orders={pick(all, filter)} who="seller" onOpen={setOpen} />
        </>
      )}
    </div>
  )
}

/** Companion > Alerts: the Orders that need the Seller now, from the same store. */
export function CompanionOrderAlerts({ sellerId, onOpen }: { sellerId: string; onOpen: (orderId: string) => void }) {
  const actions = useSellerActions(sellerId)
  if (!actions.length) return null
  return (
    <div data-sim-alerts>
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Orders (internal simulation)</span><span className="text-xs text-text-muted">{actions.length} need you</span></div>
      {actions.map(({ order, text }) => (
        <button key={order.id} type="button" onClick={() => onOpen(order.id)} data-order-alert={order.id} className="flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left">
          <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-brand" />
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{text}</span><span className="mt-0.5 block text-xs text-text-secondary">{order.id} · {MODE_LABEL[order.mode]} · {partyName(order.buyerId)}</span></span>
          <span className="text-xs font-semibold text-brand-text">Open</span>
        </button>
      ))}
    </div>
  )
}

// ---------- Courier ----------
type Tab = 'offers' | 'active' | 'history' | 'pools' | 'feedback' | 'account'
const TABS = [
  { key: 'offers', label: 'Offers', icon: <IconMap size={22} /> },
  { key: 'active', label: 'Active', icon: <IconTruck size={22} /> },
  { key: 'history', label: 'History', icon: <IconHistory size={22} /> },
  { key: 'pools', label: 'Pools', icon: <IconUsers size={22} /> },
  { key: 'feedback', label: 'Feedback', icon: <IconClipboard size={22} /> },
  { key: 'account', label: 'Account', icon: <IconUser size={22} /> },
]
const AVAIL: Availability[] = ['AVAILABLE', 'BUSY', 'UNAVAILABLE']

/** The Courier app on the marketplace dataset: five Courier accounts with independent offers and deliveries. Live Courier work stays disabled in the current MVP. */
export function MarketplaceCourier() {
  const { simulation } = usePrototypeMode()
  const [courierId, setCourier] = useState('CR-01')
  const [tab, setTab] = useState<Tab>('offers')
  const [open, setOpen] = useState<string | null>(null)
  const c = WORLD.couriers[courierId]
  const pick = (t: Tab) => { setTab(t); setOpen(null) }
  const Gate = ({ title, children }: { title: string; children: string }) => <SimulationGate title={title} compact>{children}</SimulationGate>
  return (
    <PhoneFrame label={`07 — COURIER MODE · ${c.name.toUpperCase()}`} clock="10:00">
      <div className="relative flex flex-1 flex-col overflow-hidden" data-surface="marketplace-courier">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2">
          <div className="font-display text-lg font-semibold">{{ offers: 'Offers', active: 'Active delivery', history: 'History', pools: 'Seller pools', feedback: 'Feedback', account: 'Account' }[tab]}</div>
          <div><label htmlFor="courier-account" className="sr-only">Courier account</label>
            <select id="courier-account" value={courierId} onChange={e => { setCourier(e.target.value); setOpen(null) }} className="h-9 rounded-lg border border-border bg-surface px-2 text-xs font-semibold">{Object.values(WORLD.couriers).map(x => <option key={x.id} value={x.id}>{x.name} ({x.id})</option>)}</select></div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tab === 'account' && <>{simulation && <SimBar />}<CourierAccount courierId={courierId} simulation={simulation} /></>}
          {tab === 'offers' && (simulation ? <><SimBar /><CourierOffers courierId={courierId} onOpen={id => { setOpen(id); setTab('active') }} /></> : <Gate title="Delivery offers">Live Courier work is disabled in the current MVP. Offers belong to the internal simulation.</Gate>)}
          {tab === 'active' && (simulation ? <><SimBar /><CourierActive courierId={courierId} open={open} setOpen={setOpen} /></> : <Gate title="Active delivery">Live Courier work is disabled in the current MVP.</Gate>)}
          {tab === 'pools' && <>{simulation && <SimBar />}<CourierPools courierId={courierId} /></>}
          {tab === 'feedback' && <>{simulation && <SimBar />}<CourierFeedback courierId={courierId} onOpenOrder={id => { setOpen(id); setTab('active') }} /></>}
          {tab === 'history' && (simulation ? <><SimBar /><CourierHistory courierId={courierId} /></> : <Gate title="Delivery history">There are no deliveries in the current MVP, so there is no delivery history to show.</Gate>)}
        </div>
        <BottomNav items={TABS} active={tab} onSelect={k => pick(k as Tab)} accent="var(--color-courier-brand)" onAccent="var(--color-on-courier-brand)" />
      </div>
    </PhoneFrame>
  )
}

function CourierAccount({ courierId, simulation }: { courierId: string; simulation: boolean }) {
  const c = WORLD.couriers[courierId]
  return (
    <div className="p-4" data-courier-account={courierId}>
      <h2 className="font-display text-xl font-semibold">{c.name}</h2>
      <p className="text-xs text-text-muted">{c.handle} · {c.vehicle} · based in {c.baseCity}</p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-text-muted">Verification</dt><dd className="font-semibold">{c.verification}</dd>
        <dt className="text-text-muted">Service cities</dt><dd>{c.cities.join(', ')}</dd>
        <dt className="text-text-muted">Availability (MVP)</dt><dd>{c.mvpAvailability.toLowerCase()}</dd>
      </dl>
      <p className="mt-4 rounded-xl bg-surface-raised p-3 text-xs text-text-secondary">{simulation ? 'Simulation availability controls who can receive offers. Your Seller pools are under Pools and the comments Sellers shared about you are under Feedback.' : 'Live Courier work is disabled in the current MVP. Switch to the internal simulation to see offers and deliveries.'}</p>
      {simulation && <SimAvailability courierId={courierId} />}
    </div>
  )
}
function SimAvailability({ courierId }: { courierId: string }) {
  const { sim } = useSim()
  const { msg, run } = useRun()
  const actor: Party = { role: 'COURIER', id: courierId }
  return (
    <div className="mt-3" data-sim-availability>
      <div className="text-xs font-semibold">Simulation availability: <span data-availability>{sim.availability[courierId]}</span></div>
      <div className="mt-2 flex flex-wrap gap-2">{AVAIL.map(v => <Button key={v} variant={sim.availability[courierId] === v ? 'primary' : 'secondary'} size="sm" onClick={() => run({ type: 'SET_AVAILABILITY', actor, value: v })}>{v.charAt(0) + v.slice(1).toLowerCase()}</Button>)}</div>
      <Msg msg={msg} />
    </div>
  )
}

function CourierActive({ courierId, open, setOpen }: { courierId: string; open: string | null; setOpen: (id: string | null) => void }) {
  const { sim } = useSim()
  const actor: Party = { role: 'COURIER', id: courierId }
  const mine = sortNewest(ordersOfCourier(sim, courierId)).filter(isOpen)
  if (open && sim.orders[open]) return <OrderDetail orderId={open} actor={actor} onBack={() => setOpen(null)} backLabel="Back to active deliveries" />
  const probe = mine[0] ?? Object.values(sim.orders).find(isOpen)!
  return (
    <div data-courier-active>
      {mine.length === 0 ? <p data-no-active className="px-4 pt-8 text-center text-sm text-text-muted">{WORLD.couriers[courierId].name} has no active delivery.</p> : (
        <ul className="divide-y divide-border">{mine.map(o => (
          <li key={o.id}><button type="button" onClick={() => setOpen(o.id)} data-order-row={o.id} className="flex w-full items-start gap-3 px-4 py-3 text-left">
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{o.id}</span><StatusPill status={o.status} /></span><span className="mt-1 block text-sm font-semibold">{partyName(o.sellerId)} → {o.city}</span><span className="block text-xs text-text-muted">{itemsOf(o.id, sim.lines)} · {partyName(o.buyerId)}</span></span>
          </button></li>))}</ul>
      )}
      <div className="p-4"><ScanPanel order={probe} actor={actor} editableOrder /></div>
    </div>
  )
}

function CourierHistory({ courierId }: { courierId: string }) {
  const { sim } = useSim()
  const rows = sortNewest(ordersOfCourier(sim, courierId)).filter(o => !isOpen(o))
  if (!rows.length) return <p className="px-4 py-10 text-center text-sm text-text-muted">No finished deliveries for {WORLD.couriers[courierId].name}.</p>
  return (
    <ul className="divide-y divide-border" data-courier-history>
      {rows.map(o => (
        <li key={o.id} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{o.id}</span><StatusPill status={o.status} /></div>
          <div className="mt-1 text-sm font-semibold">{partyName(o.sellerId)} → {o.city}</div>
          <div className="text-xs text-text-muted">{fmtAt(o.paidAt)} · simulated compensation {etb(WORLD.opportunities[`${courierId}|${o.sellerId}`]?.compensation ?? WORLD.settings[o.sellerId]?.fee ?? 0)} (simulation only)</div>
        </li>
      ))}
    </ul>
  )
}
