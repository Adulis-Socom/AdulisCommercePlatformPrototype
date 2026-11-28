// COURIER-001 / COURIER-002: the Courier's pool pages and shared feedback, the Seller's Courier pool and shared-feedback view, and the Order-level comment
// piece. Tailwind classes, as the mobile apps and consoles use. Everything reads the one simulation store (store.tsx); the rules live in
// relationships.ts and feedback.ts. Shared comments and private relationship notes are different data in different sections with different labels.
import { useState, type HTMLAttributes, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { SimulationGate, usePrototypeMode } from '../prototype-mode'
import { useSim, WORLD } from './store'
import { canReceiveOffers, ordersOfCourier, type Party, type SimOrder } from './orders'
import { GROUP_LABEL, STATUS_LABEL, historyOf, poolsOf, privateNote, visibleRelationships, type PoolGroup, type PoolStatus } from './relationships'
import { EXPERIMENT_LABEL, MAX_TEXT, SENTIMENTS, SENTIMENT_LABEL, TOPICS, TOPIC_LABEL, commentableOrders, commentsFor, isPending, servedSellers, summary, type SimComment } from './feedback'
import { Page } from '../sections/console/kit'
import { Msg, Section, etb, fmtAt, partyName, useRun } from './ui'

const SENTIMENT_TONE: Record<string, string> = { POSITIVE: 'bg-success-bg text-text-primary', NEUTRAL: 'bg-surface-raised text-text-secondary', NEGATIVE: 'bg-danger-bg text-text-primary' }
const STATUS_TONE: Record<string, string> = { APPROVED: 'bg-success-bg text-text-primary', INVITED: 'bg-info-bg text-info', APPLIED: 'bg-brand-muted text-brand-dark', REJECTED: 'bg-danger-bg text-text-primary', SUSPENDED: 'bg-warning-bg text-text-primary', REMOVED: 'bg-danger-bg text-text-primary' }
const Pill = ({ tone, children, ...rest }: { tone: string; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) => <span {...rest} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{children}</span>
/** The label every shared-feedback surface carries. */
export const ExperimentNote = () => <p data-experiment-label className="rounded-lg bg-warning-bg px-3 py-2 text-[11px] font-semibold leading-snug text-text-primary">{EXPERIMENT_LABEL}</p>

function History({ courierId, sellerId }: { courierId: string; sellerId: string }) {
  const { sim } = useSim()
  const events = historyOf(WORLD, sim, courierId, sellerId)
  if (!events.length) return <p className="mt-1 text-[11px] text-text-muted">No relationship events recorded.</p>
  return <ol data-rel-history className="mt-1 flex flex-col gap-0.5">{events.map((e, i) => <li key={i} className="text-[11px] text-text-secondary"><span className="font-semibold">{e.status === 'WITHDRAWN' ? 'Withdrawn' : STATUS_LABEL[e.status as PoolStatus] ?? e.status}</span> · {fmtAt(e.at)}{e.session && <span className="text-text-muted"> · this session</span>}</li>)}</ol>
}

// ---------- Courier app: Pools ----------
const REL_GROUPS: { key: string; label: string; statuses: PoolStatus[] }[] = [
  { key: 'approved', label: 'Approved pools', statuses: ['APPROVED'] },
  { key: 'invited', label: 'Invitations', statuses: ['INVITED'] },
  { key: 'applied', label: 'Applications', statuses: ['APPLIED'] },
  { key: 'closed', label: 'Suspended, removed or rejected', statuses: ['SUSPENDED', 'REMOVED', 'REJECTED'] },
]
const NOT_AVAILABLE: PoolGroup[] = ['OUTSIDE_COVERAGE', 'VERIFICATION_REQUIRED', 'SELLER_INELIGIBLE', 'NO_OPPORTUNITY']

/** The Courier's Seller pools: real relationships (a status), opportunities, and the pairs that are not available with the reason. */
export function CourierPools({ courierId }: { courierId: string }) {
  const { sim } = useSim()
  const { simulation } = usePrototypeMode()
  const { msg, run } = useRun()
  const actor: Party = { role: 'COURIER', id: courierId }
  const c = WORLD.couriers[courierId]
  const pools = poolsOf(WORLD, sim, courierId)
  const viewer = { role: 'COURIER' as const, id: courierId }
  const members = pools.rows.filter(r => r.group === 'RELATIONSHIP')
  return (
    <div data-courier-pools={courierId} className="flex flex-col gap-3 p-4">
      <p className="text-xs text-text-muted">{c.name} ({courierId}) · {c.verification === 'VERIFIED' ? 'Verified' : `Verification ${c.verification.toLowerCase()}`} · {members.length} Seller relationship{members.length === 1 ? '' : 's'}. A Seller without a status is not a pool: it is an opportunity or a reason below. {simulation ? '' : 'Relationship records are prototype data; delivery offers and compensation belong to the internal simulation.'}</p>
      <Msg msg={msg} />
      {c.verification !== 'VERIFIED' && <div data-verification-restriction className="rounded-xl border border-warning bg-warning-bg p-3 text-xs"><span className="font-semibold">Verification {c.verification.toLowerCase()}.</span> You cannot apply to a Seller, accept an invitation or receive a Delivery Offer until Adulis verifies you.</div>}
      {REL_GROUPS.map(g => {
        const rows = members.filter(r => g.statuses.includes(r.status!))
        return (
          <Section key={g.key} title={`${g.label} · ${rows.length}`}>
            {rows.length === 0 ? <p className="text-xs text-text-muted">None.</p> : (
              <ul className="flex flex-col gap-2">{rows.map(r => {
                const s = WORLD.sellers[r.sellerId], offers = canReceiveOffers(WORLD, sim, courierId, r.sellerId), comp = WORLD.opportunities[`${courierId}|${r.sellerId}`]?.compensation
                const note = privateNote(WORLD, viewer, courierId, r.sellerId)
                return (
                  <li key={r.sellerId} data-pool-row={r.sellerId} data-pool-group={g.key} data-pool-status={r.status} className="rounded-lg bg-surface-raised p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{s.name}</span><span className="font-mono text-text-muted">{r.sellerId}</span><Pill tone={STATUS_TONE[r.status!]} data-status-pill>{STATUS_LABEL[r.status!]}</Pill></div>
                    <div className="mt-0.5 text-text-muted">{s.city}{simulation && comp ? ` · simulated compensation ${etb(comp)} (simulation only)` : ''}</div>
                    {r.status === 'APPROVED' && simulation && <div data-can-receive={offers.ok} className="mt-1">{offers.ok ? 'Can receive this Seller\'s offers now.' : `Cannot receive offers now: ${offers.reason}.`}</div>}
                    {r.status === 'INVITED' && <div className="mt-1.5"><Button variant="primary" size="sm" onClick={() => run({ type: 'ACCEPT_INVITATION', actor, sellerId: r.sellerId })}>Accept invitation</Button></div>}
                    {r.status === 'APPLIED' && <div className="mt-1.5"><Button variant="secondary" size="sm" onClick={() => run({ type: 'WITHDRAW', actor, sellerId: r.sellerId })}>Withdraw application</Button></div>}
                    <details className="mt-1.5"><summary className="cursor-pointer font-semibold text-brand-text">Relationship history</summary><History courierId={courierId} sellerId={r.sellerId} /></details>
                    {note && <p data-private-note className="mt-1.5 rounded bg-surface p-1.5 text-[11px] text-text-secondary"><span className="font-semibold">Private relationship note</span> (visible to you only, not to other Sellers or Buyers): {note}</p>}
                  </li>
                )
              })}</ul>
            )}
          </Section>
        )
      })}
      <Section title={`Eligible opportunities · ${pools.byGroup('ELIGIBLE').length}`} hint="Sellers that declared an opportunity you qualify for (active Seller, your coverage, verified). Applying is a session action.">
        {pools.byGroup('ELIGIBLE').length === 0 ? <p className="text-xs text-text-muted">No open opportunity right now.</p> : (
          <ul className="flex flex-col gap-2">{pools.byGroup('ELIGIBLE').map(r => {
            const comp = WORLD.opportunities[`${courierId}|${r.sellerId}`]?.compensation
            return (
              <li key={r.sellerId} data-pool-row={r.sellerId} data-pool-group="eligible" className="rounded-lg bg-surface-raised p-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{WORLD.sellers[r.sellerId].name}</span><span className="font-mono text-text-muted">{r.sellerId}</span><Pill tone="bg-brand-muted text-brand-dark">Can apply</Pill></div>
                <div className="mt-0.5 text-text-muted">{r.detail}{simulation && comp ? ` · simulated compensation ${etb(comp)} (simulation only)` : ''}</div>
                <div className="mt-1.5"><Button variant="primary" size="sm" onClick={() => run({ type: 'APPLY', actor, sellerId: r.sellerId })}>Apply to {WORLD.sellers[r.sellerId].name}</Button></div>
              </li>
            )
          })}</ul>
        )}
      </Section>
      <Section title="Not available to you" hint="No pool relationship exists for these Sellers. Each states why, so none is mistaken for a membership.">
        {NOT_AVAILABLE.map(g => {
          const rows = pools.byGroup(g)
          return (
            <details key={g} data-not-available={g} className="border-b border-border py-2 last:border-b-0">
              <summary className="cursor-pointer text-xs font-semibold">{GROUP_LABEL[g]} · {rows.length}</summary>
              {rows.length === 0 ? <p className="mt-1 text-[11px] text-text-muted">None.</p> : <ul className="mt-1 flex flex-col gap-0.5">{rows.map(r => <li key={r.sellerId} data-pool-row={r.sellerId} data-pool-group={g} className="text-[11px] text-text-secondary"><span className="font-semibold">{WORLD.sellers[r.sellerId].name}</span> <span className="font-mono text-text-muted">{r.sellerId}</span> · {r.detail}</li>)}</ul>}
            </details>
          )
        })}
      </Section>
    </div>
  )
}

// ---------- shared comments ----------
function CommentCard({ c, seller, own, children }: { c: SimComment; seller: boolean; own: boolean; children?: ReactNode }) {
  const pending = isPending(c)
  return (
    <li data-comment={c.id} data-comment-sentiment={c.sentiment} data-comment-moderation={c.moderation} className="rounded-lg bg-surface-raised p-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone={SENTIMENT_TONE[c.sentiment]}>{SENTIMENT_LABEL[c.sentiment]}</Pill>
        <span className="font-semibold">{TOPIC_LABEL[c.topic] ?? c.topic}</span>
        {pending ? <Pill tone="bg-warning-bg text-text-primary" data-pending>Pending moderation · not counted</Pill> : <Pill tone="bg-success-bg text-text-primary">Visible</Pill>}
      </div>
      <p className="mt-1 text-sm leading-snug">{c.text}</p>
      <p className="mt-1 text-[11px] text-text-muted">{seller ? (own ? 'Your comment' : 'Another Seller') : `${partyName(c.sellerId)} (${c.sellerId})`}{!seller || own ? ` · Order ${c.orderId}` : ''} · {fmtAt(c.createdAt)}{!seller && ` · ${pending ? 'Not shared yet' : 'Shared with eligible Sellers'}`}</p>
      {children}
    </li>
  )
}
function Summary({ rows }: { rows: SimComment[] }) {
  const sum = summary(rows)
  return (
    <div data-comment-summary className="flex flex-wrap items-center gap-1.5 text-[11px]">
      <Pill tone={SENTIMENT_TONE.POSITIVE}>Positive {sum.positive}</Pill><Pill tone={SENTIMENT_TONE.NEUTRAL}>Neutral {sum.neutral}</Pill><Pill tone={SENTIMENT_TONE.NEGATIVE}>Negative {sum.negative}</Pill>
      <span className="text-text-muted">{sum.total} visible comment{sum.total === 1 ? '' : 's'}{sum.pending ? ` · ${sum.pending} pending moderation, not counted` : ''}</span>
    </div>
  )
}

/** The Courier's own shared feedback: grouped counts, filters, each comment with its Seller, Order link and moderation state. Simulation only. */
export function CourierFeedback({ courierId, onOpenOrder }: { courierId: string; onOpenOrder: (orderId: string) => void }) {
  const { simulation } = usePrototypeMode()
  if (!simulation) return <SimulationGate title="Courier feedback" compact>Shared Courier feedback is an internal-simulation experiment: it comes from simulated Orders, so there is none in the current MVP.</SimulationGate>
  return <CourierFeedbackBody courierId={courierId} onOpenOrder={onOpenOrder} />
}
function CourierFeedbackBody({ courierId, onOpenOrder }: { courierId: string; onOpenOrder: (orderId: string) => void }) {
  const { sim } = useSim()
  const [sentiment, setSentiment] = useState('ALL'), [topic, setTopic] = useState('ALL')
  const all = commentsFor(sim, { role: 'COURIER', id: courierId }, courierId)
  const shown = all.filter(c => (sentiment === 'ALL' || (sentiment === 'PENDING' ? isPending(c) : c.sentiment === sentiment && !isPending(c))) && (topic === 'ALL' || c.topic === topic))
  const sel = 'block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm'
  return (
    <div data-courier-feedback={courierId} className="flex flex-col gap-3 p-4">
      <ExperimentNote />
      <p className="text-xs text-text-muted">Comments Sellers wrote about deliveries you made, each tied to its simulated Order. There are no ratings. They are separate from your private relationship notes, which are in Pools.</p>
      <Summary rows={all} />
      <div className="grid grid-cols-2 gap-2">
        <div><label htmlFor="fb-sentiment" className="mb-1 block text-xs font-semibold text-text-secondary">Sentiment</label><select id="fb-sentiment" value={sentiment} onChange={e => setSentiment(e.target.value)} className={sel}><option value="ALL">All</option>{SENTIMENTS.map(s => <option key={s} value={s}>{SENTIMENT_LABEL[s]}</option>)}<option value="PENDING">Pending moderation</option></select></div>
        <div><label htmlFor="fb-topic" className="mb-1 block text-xs font-semibold text-text-secondary">Topic</label><select id="fb-topic" value={topic} onChange={e => setTopic(e.target.value)} className={sel}><option value="ALL">All topics</option>{TOPICS.map(t => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}</select></div>
      </div>
      <p data-comment-count className="text-xs text-text-muted">{shown.length} of {all.length} comments</p>
      {shown.length === 0 ? <p className="py-6 text-center text-sm text-text-muted">No comments match.</p> : (
        <ul className="flex flex-col gap-2">{shown.map(c => <CommentCard key={c.id} c={c} seller={false} own={false}><button type="button" onClick={() => onOpenOrder(c.orderId)} data-comment-order={c.orderId} className="mt-1 min-h-7 text-[11px] font-semibold text-brand-text">Open Order {c.orderId}</button></CommentCard>)}</ul>
      )}
    </div>
  )
}

// ---------- the Order-level comment (Seller composer, Seller and Courier view) ----------
export function OrderFeedback({ order: o, actor }: { order: SimOrder; actor: Party }) {
  const { simulation } = usePrototypeMode()
  const { sim } = useSim()
  const { msg, run } = useRun()
  const [sentiment, setSentiment] = useState<string>('POSITIVE'), [topic, setTopic] = useState<string>('RELIABILITY'), [text, setText] = useState('')
  if (!simulation || !o.assignedCourier || (actor.role !== 'SELLER' && actor.role !== 'COURIER')) return null
  const comment = Object.values(sim.comments).find(c => c.orderId === o.id)
  const visible = comment && commentsFor(sim, actor, o.assignedCourier).some(c => c.id === comment.id)
  const canWrite = actor.role === 'SELLER' && actor.id === o.sellerId && commentableOrders(sim, o.sellerId).some(x => x.id === o.id)
  if (!visible && !canWrite) return null
  const sel = 'mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm'
  return (
    <Section title="Courier feedback (shared)" hint={EXPERIMENT_LABEL}>
      {visible && <ul data-order-comment><CommentCard c={comment!} seller={actor.role === 'SELLER'} own={comment!.sellerId === actor.id} /></ul>}
      {canWrite && (
        <div data-comment-composer className="grid gap-2">
          <p className="text-xs text-text-muted">The Courier served this finished Order, so you can leave one short factual comment about {partyName(o.assignedCourier)}. It starts pending moderation. No stars, no rating.</p>
          <div><label htmlFor={`cc-s-${o.id}`} className="text-xs font-semibold text-text-secondary">Sentiment</label><select id={`cc-s-${o.id}`} value={sentiment} onChange={e => setSentiment(e.target.value)} className={sel}>{SENTIMENTS.map(s => <option key={s} value={s}>{SENTIMENT_LABEL[s]}</option>)}</select></div>
          <div><label htmlFor={`cc-t-${o.id}`} className="text-xs font-semibold text-text-secondary">Topic</label><select id={`cc-t-${o.id}`} value={topic} onChange={e => setTopic(e.target.value)} className={sel}>{TOPICS.map(t => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}</select></div>
          <div><label htmlFor={`cc-x-${o.id}`} className="text-xs font-semibold text-text-secondary">Comment ({text.length}/{MAX_TEXT})</label><textarea id={`cc-x-${o.id}`} value={text} onChange={e => setText(e.target.value)} maxLength={MAX_TEXT + 50} rows={3} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" /></div>
          <div><Button variant="secondary" size="md" onClick={() => { const r = run({ type: 'COMMENT', actor, orderId: o.id, sentiment, topic, text }); if (r.ok) setText('') }}>Add comment</Button></div>
        </div>
      )}
      <Msg msg={msg} />
    </Section>
  )
}

// ---------- Seller Console: Couriers page on the marketplace dataset ----------
const SELLER_GROUPS: { label: string; statuses: PoolStatus[] }[] = [
  { label: 'Approved', statuses: ['APPROVED'] }, { label: 'Applications', statuses: ['APPLIED'] }, { label: 'Invitations', statuses: ['INVITED'] }, { label: 'Suspended, removed or rejected', statuses: ['SUSPENDED', 'REMOVED', 'REJECTED'] },
]
export function SellerCouriers({ sellerId }: { sellerId: string }) {
  const { sim } = useSim()
  const { simulation } = usePrototypeMode()
  const viewer = { role: 'SELLER' as const, id: sellerId }
  const mine = visibleRelationships(WORLD, sim, viewer)
  const seller = WORLD.sellers[sellerId]
  const served = Object.values(WORLD.couriers).filter(c => servedSellers(sim, c.id).has(sellerId))
  return (
    <div data-seller-couriers={sellerId}>
      <Page title="Couriers" subtitle={`Private Courier relationships for ${seller.name} only. No other Seller's relationships appear here. Approving, inviting and removing Couriers is not part of this prototype.`}>
      <div className="grid gap-4">
        {mine.length === 0 && <p data-no-pool className="rounded-2xl border border-dashed border-border-strong bg-surface p-6 text-center text-sm text-text-muted">{seller.name} has no Courier relationships{seller.lifecycle !== 'ACTIVE' ? ` (the Seller is ${seller.lifecycle.toLowerCase()})` : ''}.</p>}
        {SELLER_GROUPS.map(g => {
          const rows = mine.filter(r => g.statuses.includes(r.status!))
          if (!rows.length) return null
          return (
            <section key={g.label} className="rounded-2xl border border-border bg-surface p-4"><h2 className="font-display text-lg font-semibold">{g.label} · {rows.length}</h2>
              <ul className="mt-2 divide-y divide-border">{rows.map(r => {
                const c = WORLD.couriers[r.courierId], offers = canReceiveOffers(WORLD, sim, r.courierId, sellerId), last = historyOf(WORLD, sim, r.courierId, sellerId).at(-1)
                return (
                  <li key={r.courierId} data-seller-pool-row={r.courierId} data-pool-status={r.status} className="py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.name}</span><span className="font-mono text-xs text-text-muted">{c.id}</span><Pill tone={STATUS_TONE[r.status!]}>{STATUS_LABEL[r.status!]}</Pill></div>
                    <div className="text-xs text-text-muted">{c.vehicle} · {c.verification === 'VERIFIED' ? 'Verified' : `Verification ${c.verification.toLowerCase()}`} · covers {c.cities.join(', ')}{last ? ` · ${STATUS_LABEL[last.status as PoolStatus] ?? last.status} ${fmtAt(last.at)}` : ''}</div>
                    {r.status === 'APPROVED' && simulation && <div className="text-xs text-text-secondary">{offers.ok ? 'Can receive an offer now.' : `Cannot receive an offer now: ${offers.reason}.`}</div>}
                  </li>
                )
              })}</ul>
            </section>
          )
        })}
        <section className="rounded-2xl border border-border bg-surface p-4" data-seller-feedback>
          <h2 className="font-display text-lg font-semibold">Shared Courier feedback</h2>
          {!simulation ? <p className="mt-2 text-sm text-text-muted">Shared Courier feedback comes from simulated Orders, so it is part of the internal simulation. There is none in the current MVP.</p> : (
            <div className="mt-2 flex flex-col gap-3">
              <ExperimentNote />
              <p className="text-xs text-text-muted">Comments about Couriers that served {seller.name}. You see shared comments that moderation has cleared, plus your own pending ones. A new comment is written on the Order it is about. These are separate from the relationship status above, which stays private.</p>
              {served.length === 0 && <p data-no-served className="text-sm text-text-muted">No Courier has served {seller.name} yet, so there is no shared feedback to show.</p>}
              {served.map(c => {
                const rows = commentsFor(sim, viewer, c.id), nOrders = ordersOfCourier(sim, c.id).filter(o => o.sellerId === sellerId).length
                return (
                  <div key={c.id} data-feedback-courier={c.id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{c.name}</span><span className="font-mono text-xs text-text-muted">{c.id}</span><span className="text-xs text-text-muted">served {nOrders} of your Order{nOrders === 1 ? '' : 's'}</span></div>
                    <div className="mt-2"><Summary rows={rows} /></div>
                    {rows.length === 0 ? <p className="mt-2 text-xs text-text-muted">No shared comments yet.</p> : <ul className="mt-2 flex flex-col gap-2">{rows.map(x => <CommentCard key={x.id} c={x} seller own={x.sellerId === sellerId} />)}</ul>}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
      </Page>
    </div>
  )
}

