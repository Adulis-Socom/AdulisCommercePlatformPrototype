// SIM-001 / SIM-002: the shared Order, Handoff and Courier-offer pieces every marketplace surface renders from the one simulation store
// (Seller Console, Seller Companion, Buyer, Courier). Tailwind classes, as the mobile apps and consoles use. Everything here sits inside the
// "Internal simulation" label (SimBar) and is reached only when the prototype mode is the simulation.
import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { useSim, WORLD } from './store'
import { OrderFeedback } from './feedback-ui'
import { OrderReview, ReviewChip } from './reviews-ui'
import {
  CRED_TTL_MIN, FAIL_REASONS, MODES, MODE_LABEL, STAGE_LABEL, STATUS_LABEL, courierEligibility, credentialState, currentCredential, expectedHandoff, isoAt,
  offersOf, scenarioStatus, type Action, type Party, type SimOrder, type Stage, type Status,
} from './orders'

export const etb = (n: number) => `ETB ${n.toLocaleString('en-US')}`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtAt = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}, ${iso.slice(11, 16)}`
export const partyName = (id: string) => WORLD.sellers[id]?.name ?? WORLD.buyers[id]?.name ?? WORLD.couriers[id]?.name ?? id
const roleOf = (id: string) => (id.startsWith('DS-') ? 'Seller' : id.startsWith('BY-') ? 'Buyer' : 'Courier')

/** Runs a simulation action and keeps the outcome (accepted or refused, with the reason) to show beside the control. */
export function useRun() {
  const { act } = useSim()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  return { msg, run: (a: Action) => { const r = act(a); setMsg(r.ok ? { ok: true, text: r.note } : { ok: false, text: r.reason }); return r } }
}
export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return <div role={msg.ok ? 'status' : 'alert'} data-sim-result={msg.ok ? 'ok' : 'refused'} className={`mt-2 rounded-lg px-3 py-2 text-xs leading-snug ${msg.ok ? 'bg-success-bg text-text-primary' : 'bg-danger-bg text-text-primary'}`}>{msg.ok ? '' : 'Refused: '}{msg.text}</div>
}

/** The persistent label, the simulated clock (advanced only by the buttons here) and the Reset control. Rendered above the scrolling area, so it never scrolls away. */
export function SimBar() {
  const { sim, act, reset } = useSim()
  return (
    <div role="region" aria-label="Internal simulation" className="sticky top-0 z-20 flex-shrink-0 border-b border-warning bg-warning-bg px-3 py-2 text-[11px] leading-snug text-text-primary">
      <div><span className="font-mono font-bold">INTERNAL SIMULATION</span> <span className="text-text-secondary">Orders, paid labels, offers and Courier compensation are simulated. No payment, stock or Cart effect.</span></div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span data-sim-clock className="font-mono">Simulated time {fmtAt(isoAt(sim.now))} (+{sim.now} min)</span>
        <span className="font-semibold">Advance simulated time</span>
        {[5, 15].map(m => <button key={m} type="button" aria-label={`Advance simulated time by ${m} minutes`} onClick={() => act({ type: 'ADVANCE_TIME', minutes: m })} className="min-h-7 rounded-full bg-surface px-2.5 font-semibold text-brand-text">+{m} min</button>)}
        <button type="button" onClick={reset} className="min-h-7 rounded-full bg-surface px-2.5 font-semibold text-danger">Reset simulation</button>
      </div>
    </div>
  )
}

const TONE: Partial<Record<Status, string>> = { COMPLETED: 'bg-success-bg text-text-primary', CANCELLED: 'bg-danger-bg text-text-primary', DELIVERY_FAILED: 'bg-danger-bg text-text-primary', RETURNED_TO_SELLER: 'bg-warning-bg text-text-primary', PAID: 'bg-brand-muted text-brand-dark', PREPARING: 'bg-brand-muted text-brand-dark' }
export function StatusPill({ status }: { status: Status }) {
  return <span data-status={status} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[status] ?? 'bg-info-bg text-info'}`}>{STATUS_LABEL[status]}</span>
}

export const itemsOf = (orderId: string, lines: Record<string, { name: string; quantity: number }[]>) => (lines[orderId] ?? []).map(l => `${l.name}${l.quantity > 1 ? ` × ${l.quantity}` : ''}`).join(', ')

export function OrderRows({ orders, onOpen, who }: { orders: SimOrder[]; onOpen: (id: string) => void; who: 'buyer' | 'seller' }) {
  const { sim } = useSim()
  if (!orders.length) return <p className="px-4 py-10 text-center text-sm text-text-muted">No Orders here.</p>
  return (
    <ul className="divide-y divide-border">
      {orders.map(o => (
        <li key={o.id}>
          <button type="button" onClick={() => onOpen(o.id)} data-order-row={o.id} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-raised">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{o.id}</span><StatusPill status={o.status} />{who === 'buyer' && <ReviewChip orderId={o.id} />}</span>
              <span className="mt-1 block truncate text-sm font-semibold">{itemsOf(o.id, sim.lines)}</span>
              <span className="block text-xs text-text-muted">{who === 'seller' ? partyName(o.buyerId) : partyName(o.sellerId)} · {MODE_LABEL[o.mode]} · {fmtAt(o.paidAt)}</span>
            </span>
            {/* BUYER-010: the Buyer's total says it is simulated; the Seller Console's rows keep their own wording. */}
            <span className="flex-shrink-0 text-right"><span className="block text-sm font-semibold">{etb(o.total)}</span>{who === 'buyer' && <span className="block text-[10px] text-text-muted">simulated total</span>}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return <section className="rounded-xl border border-border bg-surface p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</h3>{hint && <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p>}<div className="mt-2">{children}</div></section>
}

/** Order detail for one actor. Every action offered is the actor's own; the rules in orders.ts refuse anything else with a reason. */
export function OrderDetail({ orderId, actor, onBack, backLabel = 'Back to Orders' }: { orderId: string; actor: Party; onBack: () => void; backLabel?: string }) {
  const { sim } = useSim()
  const o = sim.orders[orderId]
  if (!o) return <div className="p-4 text-sm">Unknown Order. <button type="button" onClick={onBack} className="font-semibold text-brand-text">{backLabel}</button></div>
  const events = sim.events[o.id] ?? [], handoffs = sim.handoffs[o.id] ?? [], lines = sim.lines[o.id] ?? []
  const status = scenarioStatus(sim, o)
  return (
    <div data-order-detail={o.id} className="flex flex-col gap-3 p-4">
      <button type="button" onClick={onBack} className="self-start text-sm font-semibold text-brand-text">← {backLabel}</button>
      <div>
        <div className="flex flex-wrap items-center gap-2"><h2 className="font-mono text-base font-semibold">{o.id}</h2><StatusPill status={o.status} />{status !== o.status && <span className="rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[10px] font-semibold text-text-secondary">{status}</span>}</div>
        <p className="mt-1 text-xs text-text-muted">{MODE_LABEL[o.mode]} · simulated paid {fmtAt(o.paidAt)}{o.city ? ` · delivery to ${o.city}` : ''}{o.seeded ? '' : ' · demonstration Order'}</p>
      </div>
      <Section title="Parties">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-text-muted">Buyer</dt><dd>{partyName(o.buyerId)} <span className="font-mono text-text-muted">{o.buyerId}</span></dd>
          <dt className="text-text-muted">Seller</dt><dd>{partyName(o.sellerId)} <span className="font-mono text-text-muted">{o.sellerId}</span></dd>
          {o.mode === 'COURIER_DELIVERY' && <><dt className="text-text-muted">Courier</dt><dd>{o.assignedCourier ? <>{partyName(o.assignedCourier)} <span className="font-mono text-text-muted">{o.assignedCourier}</span></> : 'Not assigned yet'}</dd></>}
          <dt className="text-text-muted">Fulfilment</dt><dd>{MODE_LABEL[o.mode]}</dd>
        </dl>
      </Section>
      <Section title="Items">
        <ul className="text-sm">{lines.map(l => <li key={l.id} className="flex justify-between gap-2 py-0.5"><span>{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ''} × {l.quantity}</span><span>{etb(l.line)}</span></li>)}</ul>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 border-t border-border pt-2 text-xs"><dt className="text-text-muted">Merchandise</dt><dd>{etb(o.merchandise)}</dd><dt className="text-text-muted">{o.mode === 'COURIER_DELIVERY' ? 'Courier Delivery' : o.mode === 'SELLER_DELIVERY' ? 'Seller Delivery' : 'Delivery'} (simulated)</dt><dd>{etb(o.delivery)}</dd><dt className="font-semibold">Total (simulated paid)</dt><dd className="font-semibold">{etb(o.total)}</dd></dl>
        {(o.attemptReason || o.cancelReason) && <p className="mt-2 text-xs"><span className="font-semibold">Recorded reason:</span> <span className="font-mono">{o.attemptReason ?? o.cancelReason}</span></p>}
      </Section>
      <Section title="Timeline">
        <ol className="flex flex-col gap-1.5">{events.map(e => <li key={e.index} data-event={e.state} className="flex items-baseline gap-2 text-xs"><span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand" /><span className="font-semibold">{STATUS_LABEL[e.state]}</span><span className="text-text-muted">{fmtAt(e.at)} · {e.actor.replace('_FIXTURE', '').toLowerCase()}</span></li>)}</ol>
      </Section>
      {actor.role === 'SELLER' && o.mode === 'COURIER_DELIVERY' && offersOf(sim, o.id).length > 0 && (
        <Section title="Courier offers" hint="Pending offers go to Couriers who are not yet assigned. The first acceptance assigns the Order.">
          <ul className="flex flex-col gap-1">{offersOf(sim, o.id).map(f => <li key={f.id} data-offer={f.id} data-offer-status={f.status} className="text-xs"><span className="font-mono">{f.id}</span> · {partyName(f.courierId)} · <span className="font-semibold">{f.status}</span> · offered {fmtAt(f.offeredAt)}{f.resolvedAt ? ` · resolved ${fmtAt(f.resolvedAt)}` : ''}</li>)}</ul>
        </Section>
      )}
      <OrderReview order={o} actor={actor} />
      <OrderFeedback order={o} actor={actor} />
      <Section title="Handoffs" hint="Evidence supplied with the Order. Synthetic credentials only: DEMO_ONLY_NON_REUSABLE, no real QR authority.">
        {handoffs.length === 0 ? <p className="text-xs text-text-muted">No Handoff has been verified yet.</p> : (
          <ul className="flex flex-col gap-2">{handoffs.map(h => (
            <li key={h.id} data-handoff={h.stage} className="rounded-lg bg-surface-raised p-2 text-xs">
              <div className="font-semibold">{STAGE_LABEL[h.stage]} · {h.result}</div>
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <dt className="text-text-muted">Presenter</dt><dd>{partyName(h.presenterId)} ({roleOf(h.presenterId)})</dd>
                <dt className="text-text-muted">Scanner</dt><dd>{partyName(h.scannerId)} ({roleOf(h.scannerId)})</dd>
                <dt className="text-text-muted">Method</dt><dd>{h.method}</dd>
                <dt className="text-text-muted">Verified</dt><dd>{fmtAt(h.verifiedAt)}</dd>
                <dt className="text-text-muted">Credential</dt><dd className="font-mono">{h.credential}</dd>
              </dl>
            </li>))}</ul>
        )}
      </Section>
      <OrderActions order={o} actor={actor} />
    </div>
  )
}

function OrderActions({ order: o, actor }: { order: SimOrder; actor: Party }) {
  const { msg, run } = useRun()
  const fr = useRun()
  const [reason, setReason] = useState<string>(FAIL_REASONS[0])
  const seller = actor.role === 'SELLER'
  const mine = (id: string | null) => !!id && actor.id === id
  const go = (type: 'START_PREPARING' | 'MARK_READY' | 'CANCEL' | 'START_DELIVERY' | 'START_TRANSPORT', label: string, variant: 'primary' | 'secondary' | 'destructive' = 'primary') => <Button key={type} variant={variant} size="md" onClick={() => run({ type, actor, orderId: o.id })}>{label}</Button>
  const buttons: ReactNode[] = []
  if (seller && mine(o.sellerId)) {
    if (o.status === 'PAID') buttons.push(go('START_PREPARING', 'Start preparing'))
    if (o.status === 'PREPARING') { buttons.push(go('MARK_READY', o.mode === 'BUYER_COLLECTION' ? 'Mark ready for collection' : 'Mark ready for delivery')); if (o.mode === 'BUYER_COLLECTION') buttons.push(go('CANCEL', 'Cancel Order', 'destructive')) }
    if (o.mode === 'SELLER_DELIVERY' && o.status === 'READY_FOR_DELIVERY') buttons.push(go('START_DELIVERY', 'Start Seller Delivery'))
  }
  if (actor.role === 'COURIER' && mine(o.assignedCourier) && o.status === 'PICKUP_VERIFIED') buttons.push(go('START_TRANSPORT', 'Start transport'))
  const canFail = o.status === 'OUT_FOR_DELIVERY' && ((seller && mine(o.sellerId)) || (actor.role === 'COURIER' && mine(o.assignedCourier)))
  return (
    <div className="flex flex-col gap-3" data-sim-actions>
      {buttons.length > 0 && <Section title="Next step"><div className="flex flex-wrap gap-2">{buttons}</div><Msg msg={msg} /></Section>}
      {seller && mine(o.sellerId) && o.status === 'READY_FOR_DELIVERY' && o.mode === 'COURIER_DELIVERY' && <OfferPanel order={o} actor={actor} />}
      <PresentPanel order={o} actor={actor} />
      <ScanPanel order={o} actor={actor} />
      {canFail && (
        <Section title="Record a failed delivery attempt">
          <label className="block text-xs font-semibold text-text-secondary" htmlFor={`fail-${o.id}-${actor.role}`}>Reason</label>
          <select id={`fail-${o.id}-${actor.role}`} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">{FAIL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
          <Button variant="secondary" size="md" style={{ marginTop: 8 }} onClick={() => fr.run({ type: 'FAIL_DELIVERY', actor, orderId: o.id, reason })}>Record failed attempt</Button>
          <Msg msg={fr.msg} />
        </Section>
      )}
    </div>
  )
}

/** The Seller's offer controls: every Courier with the rule's verdict. A Courier who cannot receive the offer is refused with the reason. */
function OfferPanel({ order: o, actor }: { order: SimOrder; actor: Party }) {
  const { sim } = useSim()
  const { msg, run } = useRun()
  const fee = WORLD.settings[o.sellerId]?.fee
  return (
    <Section title="Offer to a Courier" hint={`Courier compensation (simulated, simulation only${fee ? `: ${etb(fee)}` : ''}). It is never a delivery charge in the current MVP.`}>
      <ul className="flex flex-col gap-2">
        {Object.values(WORLD.couriers).map(c => {
          const v = courierEligibility(WORLD, sim, o.id, c.id)
          return (
            <li key={c.id} data-courier-offer={c.id} data-eligible={v.ok} className="flex items-center gap-2 rounded-lg bg-surface-raised p-2 text-xs">
              <span className="min-w-0 flex-1"><span className="block font-semibold">{c.name} <span className="font-mono text-text-muted">{c.id}</span></span><span className="block text-text-muted">{v.ok ? 'Eligible: approved, verified, available, covers the city' : `Cannot receive this offer: ${v.reason}`}</span></span>
              <Button variant={v.ok ? 'primary' : 'secondary'} size="sm" onClick={() => run({ type: 'OFFER', actor, orderId: o.id, courierId: c.id })}>Offer to {c.name}</Button>
            </li>
          )
        })}
      </ul>
      <Msg msg={msg} />
    </Section>
  )
}

/** A deterministic synthetic pattern drawn from the token: it looks like a code and is not one (no payload, nothing to scan with a camera). */
function SyntheticCode({ token }: { token: string }) {
  let h = 2166136261
  for (const ch of token) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  const N = 11, cells: ReactNode[] = []
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const finder = (x < 3 && y < 3) || (x > N - 4 && y < 3) || (x < 3 && y > N - 4)
    h = Math.imul(h ^ (x * 31 + y), 1103515245) + 12345 >>> 0
    if (finder || (h >> 16) & 1) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
  }
  return <svg role="img" aria-label="Synthetic demonstration code, not a real QR" viewBox={`0 0 ${N} ${N}`} width="132" height="132" fill="currentColor" shapeRendering="crispEdges">{cells}</svg>
}

/** The presenting party's side of a Handoff: display the single-use synthetic code. */
function PresentPanel({ order: o, actor }: { order: SimOrder; actor: Party }) {
  const { sim } = useSim()
  const { msg, run } = useRun()
  const exp = expectedHandoff(o)
  if (!exp || exp.presenter.role !== actor.role || exp.presenter.id !== actor.id) return null
  const cred = currentCredential(sim, o.id, exp.stage)
  const state = cred ? credentialState(sim, cred) : null
  const title = exp.stage === 'DELIVERY' && o.mode === 'BUYER_COLLECTION' ? 'Collection code' : `${STAGE_LABEL[exp.stage]} code`
  return (
    <Section title={`Present the ${title.toLowerCase()}`} hint={exp.stage === 'PICKUP' ? 'Scanning this code passes custody to the Courier. It never completes the Order.' : exp.stage === 'RETURN' ? 'Scanned by the Seller to take the goods back.' : 'Scanned by the Buyer. Only this final handoff completes the Order.'}>
      {cred && state === 'ACTIVE' && (
        <div data-credential={cred.token} data-credential-state="ACTIVE" className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised p-3 text-text-primary">
          <SyntheticCode token={cred.token} />
          <div className="font-mono text-sm font-bold tracking-wider" data-token>{cred.token}</div>
          <div className="text-[11px] text-text-muted" data-minutes-left>{cred.expiresAt - sim.now} of {CRED_TTL_MIN} simulated minutes left · single use · bound to {o.id} · DEMO_ONLY_NON_REUSABLE</div>
        </div>
      )}
      {cred && state !== 'ACTIVE' && <p data-credential-state={state} className="mb-2 text-xs text-text-muted">The last code ({cred.token}) is {state === 'USED' ? 'used' : 'expired'}.</p>}
      {(!cred || state !== 'ACTIVE') && <Button variant="primary" size="md" onClick={() => run({ type: 'PRESENT', actor, orderId: o.id, stage: exp.stage })}>{state ? 'Display a new code' : `Display ${title.toLowerCase()}`}</Button>}
      <Msg msg={msg} />
    </Section>
  )
}

const DEFAULT_STAGE = { BUYER: 'DELIVERY', COURIER: 'PICKUP', SELLER: 'RETURN' } as const
/** The scanning party's side: a simulated scan. With the field empty it reads the code on display for that Stage; a pasted token is validated as typed. No camera. */
export function ScanPanel({ order, actor, editableOrder }: { order: SimOrder; actor: Party; editableOrder?: boolean }) {
  const { msg, run } = useRun()
  const exp = expectedHandoff(order)
  const natural: Stage = !editableOrder && exp && exp.scanner.role === actor.role ? exp.stage : DEFAULT_STAGE[actor.role as keyof typeof DEFAULT_STAGE]
  const [stage, setStage] = useState<Stage>(natural)
  const [token, setToken] = useState('')
  const [target, setTarget] = useState(order.id)
  const id = `scan-${actor.role}-${order.id}`
  return (
    <Section title="Scan a handoff code" hint="A simulated scan: leave the field empty to scan the code on display, or paste a code. No camera is used.">
      <div className="grid gap-2">
        {editableOrder && <div><label htmlFor={`${id}-order`} className="mb-1 block text-xs font-semibold text-text-secondary">Order</label><input id={`${id}-order`} value={target} onChange={e => setTarget(e.target.value)} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm" /></div>}
        <div><label htmlFor={`${id}-stage`} className="mb-1 block text-xs font-semibold text-text-secondary">Handoff</label>
          <select id={`${id}-stage`} value={stage} onChange={e => setStage(e.target.value as Stage)} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">{(['PICKUP', 'DELIVERY', 'RETURN'] as Stage[]).map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select></div>
        <div><label htmlFor={`${id}-token`} className="mb-1 block text-xs font-semibold text-text-secondary">Code (optional)</label><input id={`${id}-token`} value={token} onChange={e => setToken(e.target.value)} placeholder="ADU-SIM-XXXX-XXXX" autoCapitalize="characters" spellCheck={false} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm" /></div>
        <Button variant="primary" size="md" onClick={() => { const r = run({ type: 'SCAN', actor, orderId: editableOrder ? target.trim() : order.id, stage, token: token.trim() === '' ? undefined : token }); if (r.ok) setToken('') }}>Scan</Button>
      </div>
      <Msg msg={msg} />
    </Section>
  )
}

/** The Seller's "new demonstration Order": the simulation's stand-in for a paid checkout (there is none in the MVP), so the preparation steps can be exercised. */
export function NewOrderForm({ sellerId }: { sellerId: string }) {
  const { msg, run } = useRun()
  const products = Object.values(WORLD.products).filter(p => p.sellerId === sellerId && p.published && p.stock > 0 && !p.variants)
  const [buyerId, setBuyer] = useState('BY-02')
  const [mode, setMode] = useState(MODES[0])
  const [productId, setProduct] = useState(products[0]?.id ?? '')
  const actor: Party = { role: 'SELLER', id: sellerId }
  return (
    <Section title="Record a demonstration Order" hint="The simulation's stand-in for a paid checkout, so preparation and handoff can be exercised. It changes no stock and no Cart.">
      <div className="grid gap-2 sm:grid-cols-3">
        <div><label htmlFor="neworder-buyer" className="mb-1 block text-xs font-semibold text-text-secondary">Buyer</label><select id="neworder-buyer" value={buyerId} onChange={e => setBuyer(e.target.value)} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">{Object.values(WORLD.buyers).map(b => <option key={b.id} value={b.id}>{b.name} · {b.city} ({b.id})</option>)}</select></div>
        <div><label htmlFor="neworder-mode" className="mb-1 block text-xs font-semibold text-text-secondary">Fulfilment</label><select id="neworder-mode" value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">{MODES.map(m => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select></div>
        <div><label htmlFor="neworder-product" className="mb-1 block text-xs font-semibold text-text-secondary">Product</label><select id="neworder-product" value={productId} onChange={e => setProduct(e.target.value)} className="block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm">{products.map(p => <option key={p.id} value={p.id}>{p.name} · {etb(p.price)}</option>)}</select></div>
      </div>
      <Button variant="secondary" size="md" style={{ marginTop: 10 }} onClick={() => run({ type: 'CREATE_ORDER', actor, buyerId, mode, productId })}>Record demonstration Order</Button>
      <Msg msg={msg} />
    </Section>
  )
}

/** A Courier's pending offers: accept or reject. Acceptance rechecks eligibility; a refusal leaves the offer pending. */
export function CourierOffers({ courierId, onOpen }: { courierId: string; onOpen: (orderId: string) => void }) {
  const { sim } = useSim()
  const { msg, run } = useRun()
  const actor: Party = { role: 'COURIER', id: courierId }
  const offers = Object.values(sim.offers).filter(f => f.courierId === courierId && f.status === 'PENDING' && sim.orders[f.orderId]?.status === 'READY_FOR_DELIVERY')
  if (!offers.length) return <p data-no-offers className="px-4 py-10 text-center text-sm text-text-muted">No offers for {WORLD.couriers[courierId].name} right now.</p>
  return (
    <ul className="flex flex-col gap-3 p-4">
      {offers.map(f => {
        const o = sim.orders[f.orderId]
        const fee = WORLD.opportunities[`${courierId}|${o.sellerId}`]?.compensation ?? WORLD.settings[o.sellerId]?.fee
        return (
          <li key={f.id} data-offer={f.id} className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold">{o.id}</span><span className="text-[11px] text-text-muted">offered {fmtAt(f.offeredAt)}</span></div>
            <div className="mt-1 text-sm font-semibold">{partyName(o.sellerId)} → {o.city}</div>
            <div className="text-xs text-text-muted">{itemsOf(o.id, sim.lines)}</div>
            <div className="mt-1 text-xs"><span className="rounded bg-warning-bg px-1.5 py-0.5 font-semibold">Simulated compensation {fee ? etb(fee) : 'n/a'}</span> <span className="text-text-muted">simulation only, not a delivery charge</span></div>
            <div className="mt-3 flex gap-2"><Button variant="primary" size="md" onClick={() => run({ type: 'ACCEPT_OFFER', actor, offerId: f.id })}>Accept offer</Button><Button variant="secondary" size="md" onClick={() => run({ type: 'REJECT_OFFER', actor, offerId: f.id })}>Reject offer</Button><button type="button" onClick={() => onOpen(o.id)} className="text-xs font-semibold text-brand-text">Details</button></div>
          </li>
        )
      })}
      <li><Msg msg={msg} /></li>
    </ul>
  )
}
