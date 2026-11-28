// SIM-003: purchased reviews in the internal simulation: the Buyer's review composer on an Order, the review a Seller sees, the Seller Console Reviews
// page, and the internal reconciliation readout. Seller Service stars and received-Product Quality ratings are always separate things; neither is Trust,
// popularity or a blended score. Nothing here is reached in the Current MVP (SimulationGate / hidden by usePrototypeMode).
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { SimulationGate, usePrototypeMode } from '../prototype-mode'
import { Page, Card } from '../sections/console/kit'
import { SNAPSHOT } from './clock'
import { seed, useSim, WORLD } from './store'
import type { Action, Party, Result, SimOrder } from './orders'
import {
  fmtIso, grantOfOrder, grantStatus, isVisible, productQuality, ratingsOfProduct, ratingsOfReview, reconcile, reviewOfGrant, sellerService, visibleReviews, MAX_TEXT,
  type Agg, type SimReview,
} from './reviews'
import { Msg, Section, useRun, partyName } from './ui'

export const fmtAvg = (n: number | null) => (n === null ? '—' : String(Number(n.toFixed(2))))
const Stars = ({ n, label }: { n: number; label: string }) => <span role="img" aria-label={`${label} ${n} out of 5`} className="text-warning">{'★'.repeat(n)}<span className="text-border-strong">{'★'.repeat(5 - n)}</span></span>
const sel = 'mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm'
const SEPARATE = 'Seller Service rates the Seller\'s service. Product Quality rates a Product you received. They are separate: neither is Trust or a blended score.'

/** A small "review waiting" marker on a Buyer's Order row. */
export function ReviewChip({ orderId }: { orderId: string }) {
  const { simulation } = usePrototypeMode()
  const { sim } = useSim()
  const g = grantOfOrder(sim, orderId)
  if (!simulation || !g) return null
  const st = grantStatus(sim, g)
  return st === 'WRITE_NOW' ? <span data-review-chip="open" className="ml-1 rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Review open</span> : st === 'NOT_YET' ? <span data-review-chip="soon" className="ml-1 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-text-secondary">Review opens soon</span> : null
}

function ReviewBody({ review, who }: { review: SimReview; who: 'buyer' | 'seller' }) {
  const { sim } = useSim()
  const ratings = ratingsOfReview(sim, review.id)
  return (
    <div data-review={review.id} data-review-visibility={review.visibility}>
      {!isVisible(review) && who === 'buyer' && <p data-review-held className="mb-2 rounded-lg bg-warning-bg p-2 text-xs">This review is held by moderation: it is not shown to others and not counted in any rating.</p>}
      <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">Seller Service</span><Stars n={review.stars} label="Seller Service" />{review.basis === 'VERIFIED_ORDER_FAILURE' && <span data-review-basis="failure" className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-semibold">Verified failure: service only</span>}</div>
      {review.text && <p className="mt-1 text-sm leading-snug">{review.text}</p>}
      {ratings.length > 0 && <ul className="mt-2 flex flex-col gap-1.5">{ratings.map(p => <li key={p.id} data-rating={p.id} className="rounded-lg bg-surface-raised p-2 text-xs"><span className="font-semibold">Product Quality · {WORLD.products[p.productId]?.name ?? p.productId}</span> <Stars n={p.stars} label="Product Quality" />{p.text && <span className="mt-0.5 block text-text-secondary">{p.text}</span>}</li>)}</ul>}
      <p className="mt-2 text-[11px] text-text-muted">{who === 'seller' ? `${partyName(review.buyerId)} · ` : ''}Published {fmtIso(review.publishedAt)}{review.seeded ? '' : ' · written in this session: a simulation record, not a verified purchase'}</p>
    </div>
  )
}

/** The review on one Order: the Buyer's composer or published review, and the published review for the Order's Seller. */
export function OrderReview({ order: o, actor }: { order: SimOrder; actor: Party }) {
  const { simulation } = usePrototypeMode()
  const { sim } = useSim()
  const { msg, run } = useRun() // outside the composer, so the outcome stays visible after the review replaces it
  const g = grantOfOrder(sim, o.id)
  if (!simulation || !g) return null
  const review = reviewOfGrant(sim, g.id)
  if (actor.role === 'SELLER' && actor.id === g.sellerId) return review && isVisible(review) ? <Section title="Buyer review (simulation)"><ReviewBody review={review} who="seller" /></Section> : null
  if (actor.role !== 'BUYER' || actor.id !== g.buyerId) return null
  return <Section title="Your review (simulation)" hint={SEPARATE}>{review ? <ReviewBody review={review} who="buyer" /> : <Composer order={o} actor={actor} run={run} />}<Msg msg={msg} /></Section>
}

function Composer({ order: o, actor, run }: { order: SimOrder; actor: Party; run: (a: Action) => Result }) {
  const { sim } = useSim()
  const g = grantOfOrder(sim, o.id)!
  const [stars, setStars] = useState(''), [text, setText] = useState('')
  const [pq, setPq] = useState<Record<string, { stars: string; text: string }>>({})
  const failure = g.basis === 'VERIFIED_ORDER_FAILURE'
  const lines = sim.lines[o.id] ?? []
  const wait = Math.round((Date.parse(g.eligibleAt) - Date.parse(SNAPSHOT)) / 60000 - sim.now)
  const open = grantStatus(sim, g) === 'WRITE_NOW'
  return (
    <div data-review-composer={g.id} data-grant-state={open ? 'open' : 'soon'} className="grid gap-2">
      <p data-grant-note className="text-xs text-text-muted">{open ? 'Your Review Grant for this Order is open: one review per grant.' : `Your Review Grant opens at ${fmtIso(g.eligibleAt)} (simulated time), in ${wait} simulated minute${wait === 1 ? '' : 's'}. Use Advance simulated time.`}{failure ? ' This grant rests on a verified failure, so it rates the Seller\'s service only.' : ''}</p>
      <div><label htmlFor={`rv-s-${o.id}`} className="text-xs font-semibold text-text-secondary">Seller Service stars</label><select id={`rv-s-${o.id}`} value={stars} onChange={e => setStars(e.target.value)} className={sel}><option value="">Choose 1 to 5</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}</select></div>
      <div><label htmlFor={`rv-t-${o.id}`} className="text-xs font-semibold text-text-secondary">About the Seller's service ({text.length}/{MAX_TEXT})</label><textarea id={`rv-t-${o.id}`} value={text} onChange={e => setText(e.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" /></div>
      {!failure && lines.map(l => (
        <div key={l.id} data-pq-line={l.id} className="rounded-lg bg-surface-raised p-2">
          <label htmlFor={`rv-q-${l.id}`} className="text-xs font-semibold text-text-secondary">Product Quality · {l.name}{l.variantLabel ? ` (${l.variantLabel})` : ''}</label>
          {l.received ? (
            <>
              <select id={`rv-q-${l.id}`} value={pq[l.id]?.stars ?? ''} onChange={e => setPq({ ...pq, [l.id]: { stars: e.target.value, text: pq[l.id]?.text ?? '' } })} className={sel}><option value="">No rating</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n === 1 ? '' : 's'}</option>)}</select>
              {pq[l.id]?.stars && <input aria-label={`Product Quality comment for ${l.name}`} value={pq[l.id]?.text ?? ''} onChange={e => setPq({ ...pq, [l.id]: { stars: pq[l.id].stars, text: e.target.value } })} placeholder="Optional comment" className="mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm" />}
            </>
          ) : <p className="mt-1 text-xs text-text-muted">Not received, so it cannot be rated.</p>}
        </div>
      ))}
      <div><Button variant="primary" size="md" onClick={() => run({ type: 'SUBMIT_REVIEW', actor, grantId: g.id, serviceStars: Number(stars), serviceText: text, ratings: failure ? [] : lines.filter(l => l.received && pq[l.id]?.stars).map(l => ({ orderLineId: l.id, stars: Number(pq[l.id].stars), text: pq[l.id].text ?? '' })) })}>Submit review</Button></div>
    </div>
  )
}

// ---------- Seller Console: Reviews on the marketplace dataset ----------
export function SellerReviews({ sellerId }: { sellerId: string }) {
  const { simulation } = usePrototypeMode()
  if (!simulation) return <SimulationGate title="Reviews">Purchased reviews come from simulated paid Orders, so there are none in the current MVP. Product Quality and Seller Service are shown in the internal simulation.</SimulationGate>
  return <SellerReviewsBody sellerId={sellerId} />
}
function SellerReviewsBody({ sellerId }: { sellerId: string }) {
  const { sim } = useSim()
  const [tab, setTab] = useState<'service' | 'quality'>('service')
  const [open, setOpen] = useState<string | null>(null)
  const svc = sellerService(sim, sellerId)
  const reviews = visibleReviews(sim).filter(r => r.sellerId === sellerId).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const products = Object.values(WORLD.products).filter(p => p.sellerId === sellerId && p.published)
  const lifecycle = WORLD.sellers[sellerId].lifecycle
  const Tab = ({ k, label }: { k: 'service' | 'quality'; label: string }) => <button type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 rounded-full px-4 text-sm font-semibold ${tab === k ? 'bg-brand text-on-brand' : 'bg-surface-raised text-text-secondary'}`}>{label}</button>
  return (
    <div data-sim-surface="seller-reviews">
      <Page title="Reviews" subtitle={`${partyName(sellerId)} · purchased reviews from simulated Orders (internal simulation). ${SEPARATE} Popularity and Trust are separate again.`}>
        {lifecycle !== 'ACTIVE' && <p className="mb-3 rounded-lg bg-warning-bg px-3 py-2 text-xs">{partyName(sellerId)} is {lifecycle.toLowerCase()}: its review history is internal and never shown publicly.</p>}
        <div role="tablist" aria-label="Review type" className="mb-4 flex gap-2"><Tab k="service" label="Seller Service" /><Tab k="quality" label="Product Quality" /></div>
        {tab === 'service' ? (
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <Card title="Seller Service"><div data-service-average className="font-display text-4xl font-semibold">{fmtAvg(svc.average)}</div><div data-service-count className="mt-1 text-xs text-text-muted">{svc.count === 0 ? 'No reviews yet: not enough evidence for an average' : `${svc.count} visible review${svc.count === 1 ? '' : 's'}`}</div></Card>
            <div className="flex flex-col gap-3">{reviews.length === 0 ? <p className="text-sm text-text-muted">No visible Seller Service reviews.</p> : reviews.map(r => (
              <section key={r.id} data-service-review={r.id} className="rounded-2xl border border-border bg-surface p-4"><ReviewBody review={r} who="seller" /><p className="mt-1 text-[11px] font-mono text-text-muted">{r.orderId}</p></section>
            ))}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">Per Product, from ratings on received Order lines only. A Product with no rating shows no average.</p>
            {products.map(p => {
              const q: Agg = productQuality(sim, p.id), rs = ratingsOfProduct(sim, p.id)
              return (
                <section key={p.id} data-product-quality={p.id} className="rounded-2xl border border-border bg-surface p-4">
                  <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block text-sm font-semibold">{p.name}</span><span className="font-mono text-[11px] text-text-muted">{p.id}</span></span><span data-pq-summary className="text-sm font-semibold">{q.count === 0 ? 'No ratings yet' : `★ ${fmtAvg(q.average)} · ${q.count}`}</span></button>
                  {open === p.id && <ul className="mt-2 flex flex-col gap-2">{rs.map(r => { const rev = sim.reviews[r.reviewId]; return <li key={r.id} data-pq-rating={r.id} className="rounded-lg bg-surface-raised p-2 text-xs"><Stars n={r.stars} label="Product Quality" /> <span className="font-semibold">{partyName(rev.buyerId)}</span> <span className="font-mono text-text-muted">{rev.orderId}</span>{r.text && <span className="block text-text-secondary">{r.text}</span>}</li> })}</ul>}
                </section>
              )
            })}
          </div>
        )}
      </Page>
    </div>
  )
}

// ---------- Operator-style reconciliation readout ----------
export function ReputationReadout() {
  const { simulation } = usePrototypeMode()
  const { sim } = useSim()
  const [showProducts, setShowProducts] = useState(false)
  if (!simulation) return <div className="mx-auto my-8 max-w-lg rounded-2xl border border-border bg-surface"><SimulationGate title="Reputation reconciliation" compact>Reviews and ratings come from simulated Orders, so there is nothing to reconcile in the current MVP.</SimulationGate></div>
  const base = reconcile(WORLD, seed()), live = reconcile(WORLD, sim)
  const liveBy = Object.fromEntries(live.sellers.map(r => [r.sellerId, r])), liveProd = Object.fromEntries(live.products.map(r => [r.productId, r]))
  const mismatches = [...base.sellers.filter(r => !r.ok).map(r => r.sellerId), ...base.products.filter(r => !r.ok).map(r => r.productId)]
  const hidden = Object.values(sim.reviews).filter(r => !isVisible(r))
  const added = Object.values(sim.reviews).filter(r => !r.seeded).length
  const grants = Object.values(sim.grants)
  const cell = (n: number, a: number | null) => `${n} · ${fmtAvg(a)}`
  return (
    <div data-reputation-readout className="mx-auto my-6 max-w-6xl rounded-2xl bg-background p-8 text-text-primary max-sm:my-0 max-sm:rounded-none max-sm:p-4">
      <h1 className="font-display text-2xl font-semibold">Reputation reconciliation</h1>
      <p className="mt-1 max-w-3xl text-sm text-text-muted">Internal simulation readout. Seller Service and Product Quality are recomputed from the visible review records and compared with the supplied seller_reputation and product_reputation. Source numbers are never changed; a mismatch would be reported, not repaired. A blank average means insufficient evidence.</p>
      <div data-recon-summary className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3"><div className="text-xs text-text-muted">Sellers reconciled</div><div className="font-semibold">{base.sellers.filter(r => r.ok).length} of {base.sellers.length}</div></div>
        <div className="rounded-xl border border-border bg-surface p-3"><div className="text-xs text-text-muted">Products reconciled</div><div className="font-semibold">{base.products.filter(r => r.ok).length} of {base.products.length}</div></div>
        <div className="rounded-xl border border-border bg-surface p-3"><div className="text-xs text-text-muted">Reviews visible / held by moderation</div><div className="font-semibold">{visibleReviews(sim).length} / {hidden.length}</div></div>
        <div className="rounded-xl border border-border bg-surface p-3"><div className="text-xs text-text-muted">Review Grants available / used</div><div className="font-semibold">{grants.filter(g => g.state === 'AVAILABLE').length} / {grants.filter(g => g.state === 'CONSUMED').length}</div></div>
      </div>
      <p data-recon-status className="mt-3 rounded-lg bg-surface-raised px-3 py-2 text-sm">{mismatches.length === 0 ? 'Source and recomputed figures agree for every Seller and Product at the dataset snapshot.' : `Source mismatch: ${mismatches.join(', ')}`}{added ? ` ${added} review${added === 1 ? '' : 's'} written in this session ${added === 1 ? 'is' : 'are'} included in the Live columns only.` : ''}</p>
      {hidden.length > 0 && <p data-recon-hidden className="mt-2 text-xs text-text-muted">Held by moderation and excluded from every count: {hidden.map(r => r.id).join(', ')}.</p>}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-surface-raised text-text-muted"><tr><th className="p-2">Seller</th><th className="p-2">Supplied service (n · avg)</th><th className="p-2">Recomputed service</th><th className="p-2">Supplied Product Quality (n · mean)</th><th className="p-2">Recomputed</th><th className="p-2">Live service</th><th className="p-2">Status</th></tr></thead>
          <tbody>{base.sellers.map(r => (
            <tr key={r.sellerId} data-recon-seller={r.sellerId} data-recon-ok={r.ok} className="border-t border-border">
              <td className="p-2 font-semibold">{r.name} <span className="font-mono text-text-muted">{r.sellerId}</span></td><td className="p-2">{cell(r.supplied.count, r.supplied.average)}</td><td className="p-2">{cell(r.service.count, r.service.average)}</td>
              <td className="p-2">{cell(r.supplied.pqCount, r.supplied.pqMean)}</td><td className="p-2">{cell(r.pq.count, r.pq.average)}</td><td className="p-2">{cell(liveBy[r.sellerId].service.count, liveBy[r.sellerId].service.average)}</td><td className="p-2 font-semibold">{r.ok ? 'Reconciled' : 'Mismatch'}</td>
            </tr>))}</tbody>
        </table>
      </div>
      <button type="button" onClick={() => setShowProducts(!showProducts)} aria-expanded={showProducts} className="mt-3 text-sm font-semibold text-brand-text">{showProducts ? 'Hide' : 'Show'} the {base.products.length} Product rows</button>
      {showProducts && (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-surface-raised text-text-muted"><tr><th className="p-2">Product</th><th className="p-2">Supplied</th><th className="p-2">Recomputed</th><th className="p-2">Live</th><th className="p-2">Status</th></tr></thead>
          <tbody>{base.products.filter(p => p.supplied.count > 0 || liveProd[p.productId].quality.count > 0).map(r => <tr key={r.productId} data-recon-product={r.productId} className="border-t border-border"><td className="p-2">{r.name} <span className="font-mono text-text-muted">{r.productId}</span></td><td className="p-2">{cell(r.supplied.count, r.supplied.average)}</td><td className="p-2">{cell(r.quality.count, r.quality.average)}</td><td className="p-2">{cell(liveProd[r.productId].quality.count, liveProd[r.productId].quality.average)}</td><td className="p-2 font-semibold">{r.ok ? 'Reconciled' : 'Mismatch'}</td></tr>)}</tbody></table>
          <p className="p-2 text-[11px] text-text-muted">Products with no ratings (blank average) are not listed.</p></div>
      )}
    </div>
  )
}
