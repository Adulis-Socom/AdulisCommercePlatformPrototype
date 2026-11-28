// SIM-003 (FR-015): purchased reviews in the internal simulation. Pure TypeScript. A Review Grant belongs to one Buyer and one Order; it becomes a Review once
// (the grant is then CONSUMED). A Review has ONE Seller Service rating and, separately, Product Quality ratings anchored to received Order lines. A review
// from a verified failure (a qualifying simulated Claim) carries Seller Service only. Hidden or pending reviews are neither shown nor counted. Aggregates are
// recomputed from the visible records and reconciled against seller_reputation / product_reputation (reported, never edited). A review written in this
// session is a simulation record: it is not a verified purchase, creates no Trust and touches no MVP state.
import { reached } from './clock.ts'
import type { Action, Result, SimState, World } from './orders.ts'

export const GRANT_DELAY_MIN = 60 // a grant issued in this session opens this many simulated minutes after the final handoff (the dataset uses 60 to 150)
export const MAX_TEXT = 600
export type GrantBasis = 'FINAL_HANDOFF' | 'VERIFIED_ORDER_FAILURE'
export interface SimGrant { id: string; orderId: string; buyerId: string; sellerId: string; basis: GrantBasis; claimId: string | null; state: 'AVAILABLE' | 'CONSUMED'; eligibleAt: string; seeded: boolean }
export interface SimReview { id: string; grantId: string; orderId: string; buyerId: string; sellerId: string; basis: GrantBasis; stars: number; text: string; publishedAt: string; visibility: string; moderationNote: string | null; seeded: boolean }
export interface SimRating { id: string; reviewId: string; orderLineId: string; productId: string; stars: number; text: string }

export const isVisible = (r: SimReview) => r.visibility === 'PUBLISHED'
export const visibleReviews = (s: SimState) => Object.values(s.reviews).filter(isVisible)
export const reviewOfGrant = (s: SimState, grantId: string) => Object.values(s.reviews).find(r => r.grantId === grantId)
export const grantsOfBuyer = (s: SimState, buyerId: string) => Object.values(s.grants).filter(g => g.buyerId === buyerId)
export const grantOfOrder = (s: SimState, orderId: string) => Object.values(s.grants).find(g => g.orderId === orderId)
export type GrantStatus = 'WRITE_NOW' | 'NOT_YET' | 'REVIEWED'
export const grantStatus = (s: SimState, g: SimGrant): GrantStatus => (g.state === 'CONSUMED' || reviewOfGrant(s, g.id) ? 'REVIEWED' : reached(g.eligibleAt, s.now) ? 'WRITE_NOW' : 'NOT_YET')

/** A Review Grant for a newly completed Order (final handoff basis). Never replaces an existing grant. */
export function issueGrant(s: SimState, orderId: string, eligibleAt: string): SimState {
  const o = s.orders[orderId]
  if (!o || grantOfOrder(s, orderId)) return s
  const g: SimGrant = { id: `${orderId}-GR1`, orderId, buyerId: o.buyerId, sellerId: o.sellerId, basis: 'FINAL_HANDOFF', claimId: null, state: 'AVAILABLE', eligibleAt, seeded: false }
  return { ...s, grants: { ...s.grants, [g.id]: g } }
}

// ---------- aggregates: recomputed from visible records only ----------
export interface Agg { count: number; average: number | null }
const agg = (stars: number[]): Agg => ({ count: stars.length, average: stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : null })
/** Seller Service: the visible reviews of one Seller. Blank average = insufficient evidence. */
export const sellerService = (s: SimState, sellerId: string): Agg => agg(visibleReviews(s).filter(r => r.sellerId === sellerId).map(r => r.stars))
const visibleRatings = (s: SimState) => { const ok = new Set(visibleReviews(s).map(r => r.id)); return Object.values(s.ratings).filter(p => ok.has(p.reviewId)) }
/** Product Quality of one Product: its ratings inside visible reviews. */
export const productQuality = (s: SimState, productId: string): Agg => agg(visibleRatings(s).filter(p => p.productId === productId).map(p => p.stars))
/** Diagnostic only (never shown as a blended Trust score): count and mean of every Product rating of one Seller's Products. */
export const sellerProductQuality = (w: World, s: SimState, sellerId: string): Agg => agg(visibleRatings(s).filter(p => w.products[p.productId]?.sellerId === sellerId).map(p => p.stars))
export const ratingsOfProduct = (s: SimState, productId: string) => visibleRatings(s).filter(p => p.productId === productId)
export const ratingsOfReview = (s: SimState, reviewId: string) => Object.values(s.ratings).filter(p => p.reviewId === reviewId)

/** Whether a recomputed average equals the supplied one at the supplied precision (the source rounds every average to 2 decimals). */
export function avgMatches(avg: number | null, supplied: number | null): boolean {
  if (supplied === null || supplied === undefined) return avg === null
  if (avg === null) return false
  return Number(avg.toFixed(2)) === supplied // the source rounds every average to at most 2 decimals
}
export interface SellerRecon { sellerId: string; name: string; service: Agg; supplied: { count: number; average: number | null; pqCount: number; pqMean: number | null }; pq: Agg; ok: boolean }
export interface ProductRecon { productId: string; sellerId: string; name: string; quality: Agg; supplied: { count: number; average: number | null }; ok: boolean }
/** Recompute every Seller's and Product's aggregates from the visible records of `s` and compare them with the supplied reputation tables. */
export function reconcile(w: World, s: SimState): { sellers: SellerRecon[]; products: ProductRecon[] } {
  const sellers = Object.values(w.sellerRep).map(r => {
    const service = sellerService(s, r.sellerId), pq = sellerProductQuality(w, s, r.sellerId)
    return { sellerId: r.sellerId, name: w.sellers[r.sellerId]?.name ?? r.sellerId, service, pq, supplied: { count: r.published, average: r.rating, pqCount: r.pqCount, pqMean: r.pqMean },
      ok: service.count === r.published && avgMatches(service.average, r.rating) && pq.count === r.pqCount && avgMatches(pq.average, r.pqMean) }
  })
  const products = Object.values(w.productRep).map(r => {
    const quality = productQuality(s, r.productId)
    return { productId: r.productId, sellerId: r.sellerId, name: w.products[r.productId]?.name ?? r.productId, quality, supplied: { count: r.count, average: r.average }, ok: quality.count === r.count && avgMatches(quality.average, r.average) }
  })
  return { sellers, products }
}

// ---------- the submit action ----------
const fail = (code: string, reason: string): Result => ({ ok: false, code, reason })
type ReviewAction = Extract<Action, { type: 'SUBMIT_REVIEW' }>
const goodStars = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5
export const fmtIso = (iso: string) => `${Number(iso.slice(8, 10))} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(iso.slice(5, 7)) - 1]}, ${iso.slice(11, 16)}`

export function reviewAction(w: World, s: SimState, a: ReviewAction, publishedAt: string): Result {
  const g = s.grants[a.grantId]
  if (!g) return fail('NO_GRANT', 'There is no Review Grant for this Order')
  if (a.actor.role !== 'BUYER' || a.actor.id !== g.buyerId) return fail('WRONG_PARTY', 'Only the Buyer this grant was issued to can write the review')
  if (g.state === 'CONSUMED' || reviewOfGrant(s, g.id)) return fail('ALREADY_REVIEWED', 'This Order has already been reviewed: one review per grant, and a used grant cannot be reused')
  if (!reached(g.eligibleAt, s.now)) return fail('NOT_YET_ELIGIBLE', `Too early: this review opens at ${fmtIso(g.eligibleAt)} (simulated time)`)
  const o = s.orders[g.orderId]
  if (g.basis === 'FINAL_HANDOFF') {
    if (!o || o.status !== 'COMPLETED' || !o.finalHandoffId) return fail('NO_FINAL_HANDOFF', 'A purchased review needs a verified final handoff on the Order')
  } else {
    const cl = g.claimId ? w.claims[g.claimId] : undefined
    if (!cl || cl.orderId !== g.orderId || cl.buyerId !== g.buyerId || cl.basis === 'FINAL_HANDOFF') return fail('NO_QUALIFYING_CLAIM', 'A failure-only review needs the qualifying simulated Claim on this Order')
    if (a.ratings.length) return fail('FAILURE_NO_PRODUCT_QUALITY', 'A review based on a verified failure rates the Seller\'s service only: the goods were not received, so there is no Product Quality')
  }
  if (!goodStars(a.serviceStars)) return fail('BAD_STARS', 'Choose Seller Service stars from 1 to 5')
  const text = a.serviceText.trim()
  if (text.length > MAX_TEXT) return fail('TEXT_TOO_LONG', `Keep the review to ${MAX_TEXT} characters`)
  const lines = s.lines[g.orderId] ?? [], seen = new Set<string>()
  for (const r of a.ratings) {
    const line = lines.find(l => l.id === r.orderLineId)
    if (!line) return fail('NOT_ORDER_LINE', `${r.orderLineId} is not a line of this Order`)
    if (!line.received) return fail('LINE_NOT_RECEIVED', `${line.name} was not received, so it cannot be rated for Product Quality`)
    if (seen.has(line.id)) return fail('DUPLICATE_LINE', `${line.name} is rated twice`)
    if (!goodStars(r.stars)) return fail('BAD_STARS', `Choose Product Quality stars from 1 to 5 for ${line.name}`)
    if (r.text.trim().length > MAX_TEXT) return fail('TEXT_TOO_LONG', `Keep the review to ${MAX_TEXT} characters`)
    seen.add(line.id)
  }
  const rid = `${g.orderId}-REV1`
  const review: SimReview = { id: rid, grantId: g.id, orderId: g.orderId, buyerId: g.buyerId, sellerId: g.sellerId, basis: g.basis, stars: a.serviceStars, text, publishedAt, visibility: 'PUBLISHED', moderationNote: null, seeded: false }
  const added: Record<string, SimRating> = {}
  a.ratings.forEach((r, i) => { const line = lines.find(l => l.id === r.orderLineId)!; const id = `${rid}-L${String(i + 1).padStart(2, '0')}`; added[id] = { id, reviewId: rid, orderLineId: line.id, productId: line.productId, stars: r.stars, text: r.text.trim() } })
  return { ok: true, state: { ...s, grants: { ...s.grants, [g.id]: { ...g, state: 'CONSUMED' } }, reviews: { ...s.reviews, [rid]: review }, ratings: { ...s.ratings, ...added } }, note: `Review ${rid} published (simulation: not a verified purchase, no Trust effect).` }
}
