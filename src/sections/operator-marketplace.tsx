// DEMO-002: the Operator Console on the marketplace dataset: the Seller directory (all 23 Sellers, every lifecycle, inspectable), the Courier directory, simulated Orders and
// Handoff evidence, and the work queues built from the dataset's own states. Reads the shared simulation store; the only state change an Operator makes here is approving or
// hiding a moderated Courier comment or purchased review, a namespaced, resettable session action (src/simulation/moderation.ts). Orders, Claims, Handoffs, comments and
// reviews are INTERNAL SIMULATION and are hidden in the current MVP. The legacy dataset never renders this file's panels (OperatorConsole.tsx keeps its own fixtures).
import { useState, type CSSProperties, type ReactNode } from 'react'
import { SearchInput } from '../components/ui/Input'
import { CATALOGUE, OPERATIONS } from '../marketplace/import'
import { SimulationGate, usePrototypeMode } from '../prototype-mode'
import { seed, useSimOrNull, WORLD } from '../simulation/store'
import { MODE_LABEL, STATUS_LABEL, canReceiveOffers, sortNewest, type SimOrder, type Status } from '../simulation/orders'
import { GROUP_LABEL, STATUS_LABEL as REL_LABEL, historyOf, poolsOf, type PoolStatus } from '../simulation/relationships'
import { isHidden, isPending } from '../simulation/feedback'
import { isVisible } from '../simulation/reviews'
import { courierDirectory, opCases, sellerDirectory, sessionDecisions, type OpCase, type Source } from '../marketplace/operator'
import { fmtAt, partyName, SimBar, StatusPill, useRun, Msg, etb } from '../simulation/ui'
import { minutesBetween, formatAge, MARKET } from '../demo-data'
import type { Moment } from '../demo-data'
import { ACCENT, BG, BORDER, DarkField, MUTED, OperatorButton, OperatorHeader, OperatorState, RAISED, SURFACE, TEXT, type WorkItem } from './OperatorConsole'

const SRC = { catalogue: CATALOGUE, operations: OPERATIONS } as unknown as Source
const LIFECYCLE_TONE = { ACTIVE: 'success', DRAFT: 'warning', SUSPENDED: 'danger' } as const
const pretty = (s: string) => s.replace(/_/g, ' ').toLowerCase()

/** Open Operator work from the dataset and the shared simulation (empty on legacy). `simulation` cases are hidden by the caller in the current MVP. */
export function useMarketplaceWork(at: Moment): (WorkItem & { simulation: boolean })[] {
  const sim = useSimOrNull()
  if (!sim) return []
  return opCases(SRC, WORLD, sim).map(c => ({
    priority: '—', queue: c.queue, caseRef: c.ref, subject: c.subject, market: MARKET.id, age: c.at ? formatAge(c.at, at.at) : '—', minutes: c.at ? minutesBetween(c.at, at.at) : 0, assigned: 'Unassigned', state: c.state, simulation: c.simulation,
  }))
}

function Drawer({ title, id, onClose, children, width = 560 }: { title: string; id: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title} data-op-drawer={id} style={{ background: 'rgba(0,0,0,.58)' }} onClick={onClose}>
      <div className="operator-panel flex h-full flex-col border-l shadow-xl" style={{ width, borderColor: BORDER, background: SURFACE }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b p-5" style={{ borderColor: BORDER }}><div><div className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{id}</div><div className="mt-1 font-display text-xl font-semibold" style={{ color: TEXT }}>{title}</div></div><button onClick={onClose} aria-label={`Close ${title}`} className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: RAISED, color: MUTED }}>×</button></div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
const Block = ({ title, children }: { title: string; children: ReactNode }) => <div className="mt-5 rounded-xl border p-4" style={{ borderColor: BORDER, background: RAISED }}><div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{title}</div>{children}</div>
const Line = ({ children }: { children: ReactNode }) => <p className="text-xs leading-relaxed" style={{ color: TEXT }}>{children}</p>
const SimNote = ({ children }: { children?: ReactNode }) => <p data-op-sim-label className="mb-3 rounded-lg px-3 py-2 text-[11px] font-semibold" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-text-primary)' }}>INTERNAL SIMULATION · {children ?? 'simulated commerce: no payment, stock or Cart effect'}</p>
const th = 'text-[9px] font-semibold uppercase tracking-wider'

// ---------- Seller directory ----------
export function SellerDirectoryPanel() {
  const { simulation } = usePrototypeMode()
  const sim = useSimOrNull()
  const [query, setQuery] = useState(''), [life, setLife] = useState('All'), [open, setOpen] = useState<string | null>(null)
  const all = sellerDirectory(SRC, simulation ? sim : null)
  const rows = all.filter(s => (life === 'All' || s.lifecycle === life) && (!query || `${s.id} ${s.name} ${s.handle} ${s.city} ${s.categories.join(' ')}`.toLowerCase().includes(query.toLowerCase())))
  const by = (l: string) => all.filter(s => s.lifecycle === l).length
  const cols = 'grid-cols-[64px_1.3fr_100px_1.4fr_80px_80px_70px_84px]'
  return (
    <div className="mx-auto max-w-[1500px] p-8" data-op-panel="sellers">
      <OperatorHeader title="Sellers" description={`${all.length} Sellers · ${by('ACTIVE')} active · ${by('DRAFT')} draft · ${by('SUSPENDED')} suspended · every lifecycle is inspectable here`} />
      <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-3">
        <SearchInput value={query} onChange={e => setQuery(e.target.value)} onClear={() => setQuery('')} placeholder="Search Seller, handle, city or category" />
        <div role="group" aria-label="Lifecycle" className="flex rounded-lg p-1" style={{ background: RAISED }}>{['All', 'ACTIVE', 'DRAFT', 'SUSPENDED'].map(v => <button key={v} type="button" aria-pressed={life === v} onClick={() => setLife(v)} className="rounded px-3 py-2 text-xs font-semibold" style={{ background: life === v ? SURFACE : 'transparent', color: life === v ? ACCENT : MUTED }}>{v === 'All' ? 'All' : pretty(v)}</button>)}</div>
      </div>
      <p data-op-count className="mb-2 text-xs" style={{ color: MUTED }}>{rows.length} of {all.length} Sellers</p>
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '820px' } as CSSProperties}>
        <div className={`rtable-head grid ${cols} gap-3 px-4 py-3 ${th}`} style={{ background: RAISED, color: MUTED }}><span>ID</span><span>Seller</span><span>Lifecycle</span><span>Categories</span><span>Products</span><span>Scenes</span><span>Trust</span><span>Inspect</span></div>
        {rows.map(s => (
          <div key={s.id} data-op-seller={s.id} data-lifecycle={s.lifecycle} className={`rtable-row grid ${cols} items-center gap-3 border-t px-4 py-3 text-xs`} style={{ borderColor: BORDER, color: TEXT }}>
            <span className="rtable-primary font-mono font-semibold" style={{ color: ACCENT }}>{s.id}</span>
            <span data-label="Seller" className="rtable-wide"><span className="block font-semibold">{s.name}</span><span style={{ color: MUTED }}>{s.handle}</span></span>
            <span data-label="Lifecycle"><OperatorState tone={LIFECYCLE_TONE[s.lifecycle as keyof typeof LIFECYCLE_TONE]}>{s.lifecycle}</OperatorState></span>
            <span data-label="Categories" className="rtable-wide truncate" title={s.categories.join(', ')}>{s.categories.join(', ')}</span>
            <span data-label="Products" className="font-mono">{s.published} / {s.products}</span>
            <span data-label="Scenes" className="font-mono">{s.publicScenes} / {s.scenes}</span>
            <span data-label="Trust" className="font-mono">{s.trust}</span>
            <span className="rtable-wide"><OperatorButton variant="secondary" onClick={() => setOpen(s.id)}>Inspect</OperatorButton></span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: MUTED }}>Products and Scenes read "public or published / all". Draft and suspended Sellers stay hidden from Buyers, the Storefront and Search; this directory is the internal view.</p>
      {open && <SellerInspect id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function SellerInspect({ id, onClose }: { id: string; onClose: () => void }) {
  const { simulation } = usePrototypeMode()
  const sim = useSimOrNull()
  const s = sellerDirectory(SRC, simulation ? sim : null).find(x => x.id === id)!
  const members = OPERATIONS.team_members.filter(m => m.seller_id === id) as unknown as { member_id: string; display_name: string; roles: string[]; membership_status: string }[]
  const rels = Object.keys(WORLD.couriers).flatMap(c => { const st = sim ? sim.relStatus[`${c}|${id}`] : seed().relStatus[`${c}|${id}`]; return st ? [{ c, st: st as PoolStatus }] : [] })
  return (
    <Drawer title={`${s.name} · inspect`} id={s.id} onClose={onClose}>
      <div className="grid grid-cols-2 gap-5" data-op-inspect={s.id}>
        <DarkField label="Handle" value={s.handle} /><DarkField label="Lifecycle" value={s.lifecycle} />
        <DarkField label="City · area" value={`${s.city} · ${s.area}`} /><DarkField label="Seller type" value={pretty(s.sellerType)} />
        <DarkField label="Trust (current MVP level)" value={s.trust} /><DarkField label="Followers (demonstration figure)" value={s.followers.toLocaleString('en-US')} />
        <DarkField label="Verification" value={s.verification} /><DarkField label="Demonstration tenure" value={`${s.tenureDays} days`} />
      </div>
      <p data-op-visibility className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: RAISED, color: TEXT }}>{s.lifecycle === 'ACTIVE' ? 'Publicly visible: Buyers, the Storefront and Search show its published Products and Scenes.' : `Publicly hidden: a ${pretty(s.lifecycle)} Seller never appears to Buyers, in the Storefront or in Search. It is inspectable here and in the Seller Console.`}</p>
      <Block title="Profile"><Line>{s.profile}</Line></Block>
      <Block title="Categories (actual paths)">{s.categories.map(c => <Line key={c}>{c}</Line>)}</Block>
      <Block title="Catalogue"><Line>Products: {s.published} published of {s.products}{s.drafts ? ` (${s.drafts} draft)` : ''}</Line><Line>Scenes: {s.publicScenes} public of {s.scenes}</Line><Line>Stories: {s.liveStories} live of {s.stories}</Line></Block>
      <Block title={`Team · ${s.team.total} members`}>
        <Line>{s.team.owner} owner · {s.team.active} active · {s.team.invited} invited · {s.team.revoked} revoked · {s.team.suspended} suspended</Line>
        <ul className="mt-2 flex flex-col gap-1">{members.map(m => <li key={m.member_id} className="text-[11px]" style={{ color: MUTED }}><span style={{ color: TEXT }}>{m.display_name}</span> · {m.roles.join(' + ').replace(/_/g, ' ').toLowerCase()} · {pretty(m.membership_status)}</li>)}</ul>
      </Block>
      <Block title="Courier relationships">{rels.length === 0 ? <Line>None.</Line> : rels.map(r => <Line key={r.c}>{WORLD.couriers[r.c].name} ({r.c}) · {REL_LABEL[r.st]}</Line>)}</Block>
      {simulation && sim && <Block title="Simulated Orders"><SimNote /><Line>{s.orders} simulated Orders on record (see Orders and Handoffs).</Line></Block>}
    </Drawer>
  )
}

// ---------- Courier directory ----------
export function CourierDirectoryPanel() {
  const { simulation } = usePrototypeMode()
  const sim = useSimOrNull()!
  const [open, setOpen] = useState<string | null>(null)
  const rows = courierDirectory(WORLD, sim)
  const cols = 'grid-cols-[64px_1fr_96px_1.2fr_120px_1.4fr_84px]'
  return (
    <div className="mx-auto max-w-[1400px] p-8" data-op-panel="couriers">
      <OperatorHeader title="Couriers" description={`${rows.length} Couriers · verification and Seller relationships · relationship changes made by Sellers and Couriers show here at once`} />
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '860px' } as CSSProperties}>
        <div className={`rtable-head grid ${cols} gap-3 px-4 py-3 ${th}`} style={{ background: RAISED, color: MUTED }}><span>ID</span><span>Courier</span><span>Verification</span><span>Coverage · vehicle</span><span>Availability</span><span>Seller relationships</span><span>Inspect</span></div>
        {rows.map(c => (
          <div key={c.id} data-op-courier={c.id} data-verification={c.verification} className={`rtable-row grid ${cols} items-center gap-3 border-t px-4 py-3 text-xs`} style={{ borderColor: BORDER, color: TEXT }}>
            <span className="rtable-primary font-mono font-semibold" style={{ color: ACCENT }}>{c.id}</span>
            <span data-label="Courier"><span className="block font-semibold">{c.name}</span><span style={{ color: MUTED }}>{c.handle}</span></span>
            <span data-label="Verification"><OperatorState tone={c.verification === 'VERIFIED' ? 'success' : 'warning'}>{c.verification}</OperatorState></span>
            <span data-label="Coverage" className="rtable-wide">{c.cities.join(', ')} · {c.vehicle}</span>
            <span data-label="Availability">{simulation ? `${pretty(c.availability)} (simulation)` : pretty(c.mvpAvailability)}</span>
            <span data-label="Relationships" className="rtable-wide">{(['APPROVED', 'INVITED', 'APPLIED', 'SUSPENDED', 'REMOVED', 'REJECTED'] as PoolStatus[]).filter(st => c.relationships[st]).map(st => `${c.relationships[st]} ${REL_LABEL[st].toLowerCase()}`).join(' · ') || 'No relationships'}</span>
            <span className="rtable-wide"><OperatorButton variant="secondary" onClick={() => setOpen(c.id)}>Inspect</OperatorButton></span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: MUTED }}>Relationship records are prototype data; availability, offers and compensation belong to the internal simulation and show only there.</p>
      {open && <CourierInspect id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function CourierInspect({ id, onClose }: { id: string; onClose: () => void }) {
  const { simulation } = usePrototypeMode()
  const sim = useSimOrNull()!
  const c = courierDirectory(WORLD, sim).find(x => x.id === id)!
  const rel = poolsOf(WORLD, sim, id).rows.filter(r => r.group === 'RELATIONSHIP')
  return (
    <Drawer title={`${c.name} · inspect`} id={c.id} onClose={onClose}>
      <div className="grid grid-cols-2 gap-5" data-op-inspect={c.id}>
        <DarkField label="Handle" value={c.handle} /><DarkField label="Verification" value={c.verification} />
        <DarkField label="Base city" value={c.baseCity} /><DarkField label="Vehicle" value={c.vehicle} />
        <DarkField label="Coverage" value={c.cities.join(', ')} /><DarkField label={simulation ? 'Availability (simulation)' : 'Availability'} value={pretty(simulation ? c.availability : c.mvpAvailability)} />
      </div>
      {c.verification !== 'VERIFIED' && <p className="mt-4 rounded-lg px-3 py-2 text-xs" style={{ background: RAISED, color: TEXT }}>Not verified: this Courier cannot apply, accept an invitation or receive an offer until Adulis verifies them.</p>}
      <Block title={`Seller relationships · ${rel.length}`}>
        {rel.length === 0 ? <Line>None.</Line> : rel.map(r => {
          const last = historyOf(WORLD, sim, id, r.sellerId).at(-1), offers = canReceiveOffers(WORLD, sim, id, r.sellerId)
          return <div key={r.sellerId} data-op-relationship={r.sellerId} className="mb-2"><Line>{WORLD.sellers[r.sellerId].name} ({r.sellerId}) · {REL_LABEL[r.status!]}{last ? ` · ${fmtAt(last.at)}${last.session ? ' (this session)' : ''}` : ''}</Line>{simulation && r.status === 'APPROVED' && <p className="text-[11px]" style={{ color: MUTED }}>{offers.ok ? 'Can receive offers now.' : `Cannot receive offers now: ${offers.reason}.`}</p>}</div>
        })}
      </Block>
      <Block title="Not a relationship">{(['OUTSIDE_COVERAGE', 'VERIFICATION_REQUIRED', 'SELLER_INELIGIBLE'] as const).map(g => <Line key={g}>{GROUP_LABEL[g]}: {poolsOf(WORLD, sim, id).byGroup(g).length}</Line>)}</Block>
      {simulation && <Block title="Simulated deliveries"><SimNote /><Line>{c.orders} Orders assigned · {c.completed} completed</Line></Block>}
    </Drawer>
  )
}

// ---------- Orders and Handoff evidence ----------
export function OrdersEvidencePanel() {
  const { simulation } = usePrototypeMode()
  if (!simulation) return <div className="mx-auto my-8 max-w-lg rounded-2xl border border-border bg-surface"><SimulationGate title="Orders and Handoffs" compact>Release 1 has no paid Orders, delivery handoff or Claims, so there is no Order or Handoff evidence to review. It is shown in the internal simulation.</SimulationGate></div>
  return <OrdersEvidenceBody />
}
function OrdersEvidenceBody() {
  const sim = useSimOrNull()!
  const [status, setStatus] = useState('ALL'), [query, setQuery] = useState(''), [open, setOpen] = useState<string | null>(null)
  const all = sortNewest(Object.values(sim.orders))
  const rows = all.filter(o => (status === 'ALL' || o.status === status) && (!query || `${o.id} ${partyName(o.sellerId)} ${partyName(o.buyerId)}`.toLowerCase().includes(query.toLowerCase())))
  const cols = 'grid-cols-[120px_1.1fr_1fr_120px_140px_90px_90px]'
  return (
    <div className="mx-auto max-w-[1400px] p-8" data-op-panel="orders">
      <OperatorHeader title="Orders and Handoffs" description={`${all.length} simulated Orders · read-only evidence · the Operator has no authority to change an Order here`} />
      <SimBar />
      <div className="my-4 grid grid-cols-[1fr_220px] items-center gap-3">
        <SearchInput value={query} onChange={e => setQuery(e.target.value)} onClear={() => setQuery('')} placeholder="Search Order id, Seller or Buyer" />
        <select aria-label="Order status" value={status} onChange={e => setStatus(e.target.value)} className="h-11 rounded-lg border px-3 text-xs font-semibold" style={{ borderColor: BORDER, background: SURFACE, color: TEXT }}><option value="ALL">All statuses</option>{(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
      </div>
      <p data-op-count className="mb-2 text-xs" style={{ color: MUTED }}>{rows.length} of {all.length} Orders</p>
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '860px' } as CSSProperties}>
        <div className={`rtable-head grid ${cols} gap-3 px-4 py-3 ${th}`} style={{ background: RAISED, color: MUTED }}><span>Order</span><span>Seller</span><span>Buyer</span><span>Mode</span><span>Status</span><span>Total</span><span>Evidence</span></div>
        {rows.map(o => (
          <button key={o.id} type="button" onClick={() => setOpen(o.id)} data-op-order={o.id} data-status={o.status} className={`rtable-row grid w-full ${cols} items-center gap-3 border-t px-4 py-3 text-left text-xs`} style={{ borderColor: BORDER, color: TEXT }}>
            <span className="rtable-primary font-mono font-semibold" style={{ color: ACCENT }}>{o.id}</span>
            <span data-label="Seller" className="rtable-wide">{partyName(o.sellerId)}</span><span data-label="Buyer" className="rtable-wide">{partyName(o.buyerId)}</span>
            <span data-label="Mode">{MODE_LABEL[o.mode]}</span><span data-label="Status"><StatusPill status={o.status} /></span>
            <span data-label="Total" className="font-mono">{etb(o.total)}</span><span data-label="Evidence" className="font-mono">{(sim.handoffs[o.id] ?? []).length} handoff{(sim.handoffs[o.id] ?? []).length === 1 ? '' : 's'}</span>
          </button>
        ))}
      </div>
      {open && <OrderEvidence order={sim.orders[open]} onClose={() => setOpen(null)} />}
    </div>
  )
}

function OrderEvidence({ order: o, onClose }: { order: SimOrder; onClose: () => void }) {
  const sim = useSimOrNull()!
  const lines = sim.lines[o.id] ?? [], events = sim.events[o.id] ?? [], handoffs = sim.handoffs[o.id] ?? [], offers = Object.values(sim.offers).filter(x => x.orderId === o.id)
  const claims = Object.values(WORLD.claims).filter(c => c.orderId === o.id)
  return (
    <Drawer title={`Order evidence · ${MODE_LABEL[o.mode]}`} id={o.id} onClose={onClose} width={640}>
      <SimNote />
      <div className="grid grid-cols-2 gap-5" data-op-inspect={o.id}>
        <DarkField label="Seller" value={`${partyName(o.sellerId)} (${o.sellerId})`} /><DarkField label="Buyer" value={`${partyName(o.buyerId)} (${o.buyerId})`} />
        <DarkField label="Status" value={STATUS_LABEL[o.status]} /><DarkField label="Total (simulated paid)" value={etb(o.total)} />
        <DarkField label="Courier" value={o.assignedCourier ? `${partyName(o.assignedCourier)} (${o.assignedCourier})` : 'None'} /><DarkField label="Delivery city" value={o.city ?? 'Collection'} />
      </div>
      <Block title="Lines">{lines.map(l => <Line key={l.id}>{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ''} × {l.quantity} · {etb(l.line)}</Line>)}</Block>
      <Block title="Timeline">{events.map(e => <Line key={e.index}>{e.index}. {STATUS_LABEL[e.state]} · {fmtAt(e.at)} · {pretty(e.actor)}</Line>)}</Block>
      <Block title={`Handoff evidence · ${handoffs.length}`}>{handoffs.length === 0 ? <Line>No handoff recorded yet.</Line> : handoffs.map(h => <div key={h.id} data-op-handoff={h.stage} className="mb-2"><Line>{pretty(h.stage)} · {partyName(h.presenterId)} presented, {partyName(h.scannerId)} scanned</Line><p className="text-[11px]" style={{ color: MUTED }}>{pretty(h.method)} · {pretty(h.result)} · {fmtAt(h.verifiedAt)} · {h.credential}</p></div>)}</Block>
      {offers.length > 0 && <Block title="Courier offers">{offers.map(x => <Line key={x.id}>{partyName(x.courierId)} · {pretty(x.status)} · offered {fmtAt(x.offeredAt)}</Line>)}</Block>}
      {claims.length > 0 && <Block title="Claim">{claims.map(c => <Line key={c.id}>{c.id} · {pretty(c.basis)} · {pretty(c.outcome)}</Line>)}</Block>}
    </Drawer>
  )
}

// ---------- case workspace for the dataset's queues ----------
export function MarketplaceCase({ item, onClose }: { item: WorkItem; onClose: () => void }) {
  const sim = useSimOrNull()!
  const { msg, run } = useRun()
  const c = opCases(SRC, WORLD, sim).find(x => x.ref === item.caseRef && x.queue === item.queue) as OpCase | undefined
  const comment = sim.comments[item.caseRef], review = sim.reviews[item.caseRef]
  const order = sim.orders[item.caseRef]
  const actor = { role: 'OPERATOR' as const, id: 'OPERATOR' }
  const decide = (kind: 'COMMENT' | 'REVIEW', decision: 'APPROVE' | 'HIDE') => run({ type: 'MODERATE', actor, kind, id: item.caseRef, decision })
  const subject = item.queue === 'Moderation' && comment ? 'COURIER_COMMENT' : item.queue === 'Moderation' && review ? 'REVIEW_HELD' : c?.kind
  const currentState = comment ? (isHidden(comment) ? 'Hidden by moderation' : isPending(comment) ? 'Pending moderation' : 'Visible') : review ? (isVisible(review) ? 'Published' : 'Hidden by moderation') : c?.state ?? item.state
  return (
    <Drawer title={`${item.queue} case`} id={item.caseRef} onClose={onClose} width={640}>
      {(c?.simulation ?? true) && <SimNote />}
      <p className="mb-4 text-sm font-semibold" style={{ color: TEXT }}>{item.subject}</p>
      <div className="grid grid-cols-2 gap-5" data-op-case={item.caseRef}>
        <DarkField label="Queue" value={item.queue} /><DarkField label="State" value={currentState} />
        <DarkField label="Seller" value={c?.sellerId ? `${partyName(c.sellerId)} (${c.sellerId})` : '—'} /><DarkField label="Opened" value={c?.at ? fmtAt(c.at) : '—'} />
      </div>
      {comment && (
        <Block title="Courier comment (shared experiment)">
          <Line>{comment.text}</Line><p className="mt-1 text-[11px]" style={{ color: MUTED }}>{pretty(comment.sentiment)} · {pretty(comment.topic)} · Order {comment.orderId} · about {partyName(comment.courierId)}</p>
        </Block>
      )}
      {review && (
        <Block title="Purchased review (simulation)">
          <Line>{review.stars} of 5 · {review.text || 'No text'}</Line><p className="mt-1 text-[11px]" style={{ color: MUTED }}>{partyName(review.buyerId)} · Order {review.orderId}{review.moderationNote ? ` · ${review.moderationNote}` : ''}</p>
        </Block>
      )}
      {(subject === 'COURIER_COMMENT' || subject === 'REVIEW_HELD') && (
        <div className="mt-5 flex flex-wrap gap-2">
          <OperatorButton onClick={() => decide(comment ? 'COMMENT' : 'REVIEW', 'APPROVE')}>{comment ? 'Approve comment' : 'Approve and publish review'}</OperatorButton>
          <OperatorButton variant="secondary" onClick={() => decide(comment ? 'COMMENT' : 'REVIEW', 'HIDE')}>{comment ? 'Hide comment' : 'Keep review hidden'}</OperatorButton>
        </div>
      )}
      <Msg msg={msg} />
      {(subject === 'SCENE_RESTRICTED' || subject === 'SCENE_SELLER_SUSPENDED') && <Block title="Scene"><Line>{c?.state === 'Restricted' ? 'This Scene is private because an independent moderation restriction applies to it.' : 'This Scene is hidden because its Seller is suspended.'} The restriction is a dataset fact: this prototype gives the Operator no Scene moderation action here.</Line></Block>}
      {subject === 'CLAIM' && <Block title="Claim (simulation)"><Line>Decided in the dataset: {c?.state}. There is no resolution workflow in this prototype: the Operator sees the record only.</Line></Block>}
      {subject === 'COURIER_VERIFICATION' && <Block title="Verification"><Line>Verification is not complete. Until Adulis verifies this Courier they cannot apply, accept an invitation or receive an offer. No approval action exists in this prototype.</Line></Block>}
      {subject === 'SELLER_VERIFICATION' && <Block title="Verification"><Line>The Seller's social-account control is still pending. No approval action exists in this prototype.</Line></Block>}
      {subject === 'FAILED_HANDOFF' && order && <Block title="Order"><Line>{MODE_LABEL[order.mode]} · {STATUS_LABEL[order.status]} · {etb(order.total)}</Line><p className="mt-1 text-[11px]" style={{ color: MUTED }}>Open Orders and Handoffs for the full timeline and handoff evidence. No manual handoff action exists in this prototype.</p></Block>}
    </Drawer>
  )
}

/** Moderation decisions made in this session (resettable with Reset simulation), shown above the Moderation queue. */
export function SessionDecisions() {
  const sim = useSimOrNull()
  const { simulation } = usePrototypeMode()
  if (!sim || !simulation) return null
  const rows = sessionDecisions(seed(), sim)
  return <><SimBar />{rows.length > 0 && <div data-op-decisions className="mb-4 rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, background: SURFACE, color: MUTED }}><span className="font-semibold" style={{ color: TEXT }}>Decisions this session (internal simulation):</span> {rows.map(r => `${r.kind.toLowerCase()} ${r.id} ${r.was.toLowerCase().replace(/_/g, ' ')} → ${r.now.toLowerCase()}`).join(' · ')}. Reset simulation clears them.</div>}</>
}

/** Founder Decisions on the marketplace dataset (internal simulation): the dataset's one Claim, read-only. The dual-Founder approval walkthrough runs on the historical fixtures. */
export function MarketplaceFounderDecisions() {
  const sim = useSimOrNull()!
  const claims = OPERATIONS.claims as unknown as { claim_id: string; order_id: string; buyer_id: string; seller_id: string; basis: string; outcome: string; decided_at: string; remedy_state: string }[]
  return (
    <div className="mx-auto max-w-5xl p-8" data-op-panel="founder-decisions">
      <OperatorHeader title="Founder Decisions" description="Material decisions require evidence, a proposal, and review by the other Founder." />
      <SimNote>the dataset's Claim is simulated commerce</SimNote>
      {claims.map(k => {
        const o = sim.orders[k.order_id], hs = sim.handoffs[k.order_id] ?? []
        return (
          <section key={k.claim_id} data-op-claim={k.claim_id} className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}>
            <div className="font-display text-xl font-semibold" style={{ color: TEXT }}>{k.claim_id} · {pretty(k.basis)}</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <DarkField label="Order" value={`${k.order_id} · ${o ? `${MODE_LABEL[o.mode]} · ${STATUS_LABEL[o.status]} · ${etb(o.total)}` : 'unknown'}`} /><DarkField label="Outcome (decided in the dataset)" value={`${pretty(k.outcome)} · ${fmtAt(k.decided_at)}`} />
              <DarkField label="Seller" value={`${partyName(k.seller_id)} (${k.seller_id})`} /><DarkField label="Buyer" value={`${partyName(k.buyer_id)} (${k.buyer_id})`} />
              <DarkField label="Remedy" value={pretty(k.remedy_state)} /><DarkField label="Handoff evidence" value={hs.length ? hs.map(h => pretty(h.stage)).join(', ') : 'None recorded: the delivery never completed'} />
            </div>
          </section>
        )
      })}
      <p className="mt-4 text-xs" style={{ color: MUTED }}>The supplied dataset records this decision as already made. No approval or proposal workflow runs on it in this prototype. The dual-Founder approval walkthrough uses the historical fixtures: open the app with ?dataset=legacy to see it.</p>
    </div>
  )
}
