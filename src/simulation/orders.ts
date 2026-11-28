// SIM-001 / SIM-002: the internal-simulation Order state machine. Pure TypeScript (no React, no clock, no storage, no network) so it runs in
// Node for the unit tests. Everything here is INTERNAL_SIMULATION: synthetic credentials, a simulated clock, no payment, no stock, no Cart.
//
// The allowed transitions are exactly the ones present in operations.order_events (tests/unit/simulation.mjs proves the table equals the
// observed set). Nothing is invented: Order statuses, scenario statuses, cancellation and delivery-failure reasons, Handoff stages and
// methods are the dataset's own values.
import type { OperationsCore } from '../marketplace/types.ts'
import { SNAPSHOT, isoAt } from './clock.ts'
import { relationshipAction } from './relationships.ts'
import { commentAction, type SimComment } from './feedback.ts'
import { GRANT_DELAY_MIN, issueGrant, reviewAction, type SimGrant, type SimRating, type SimReview } from './reviews.ts'
export { SNAPSHOT, isoAt }

export type Mode = 'BUYER_COLLECTION' | 'COURIER_DELIVERY' | 'SELLER_DELIVERY'
export type Status = 'PAID' | 'PREPARING' | 'READY_FOR_COLLECTION' | 'READY_FOR_DELIVERY' | 'COURIER_ASSIGNED' | 'PICKUP_VERIFIED' | 'OUT_FOR_DELIVERY' | 'FINAL_DELIVERY_VERIFIED' | 'COMPLETED' | 'DELIVERY_FAILED' | 'RETURNED_TO_SELLER' | 'CANCELLED'
export type Stage = 'PICKUP' | 'DELIVERY' | 'RETURN'
export type Role = 'SELLER' | 'BUYER' | 'COURIER'
export interface Party { role: Role; id: string }
export type Availability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export const MODES: readonly Mode[] = ['BUYER_COLLECTION', 'COURIER_DELIVERY', 'SELLER_DELIVERY']
export const MODE_LABEL: Record<Mode, string> = { BUYER_COLLECTION: 'Buyer Collection', COURIER_DELIVERY: 'Courier Delivery', SELLER_DELIVERY: 'Seller Delivery' }
export const STATUS_LABEL: Record<Status, string> = {
  PAID: 'Paid (simulated)', PREPARING: 'Preparing', READY_FOR_COLLECTION: 'Ready for collection', READY_FOR_DELIVERY: 'Ready for delivery', COURIER_ASSIGNED: 'Courier assigned',
  PICKUP_VERIFIED: 'Pickup verified', OUT_FOR_DELIVERY: 'Out for delivery', FINAL_DELIVERY_VERIFIED: 'Final delivery verified', COMPLETED: 'Completed',
  DELIVERY_FAILED: 'Delivery failed', RETURNED_TO_SELLER: 'Returned to Seller', CANCELLED: 'Cancelled',
}
export const STAGE_LABEL: Record<Stage, string> = { PICKUP: 'Pickup', DELIVERY: 'Final delivery', RETURN: 'Return' }
export const FAIL_REASONS = ['BUYER_UNAVAILABLE', 'SELLER_NON_DELIVERY'] as const
export const CANCEL_REASON = 'SIMULATED_BUYER_REQUEST'
/** A credential lives this many SIMULATED minutes (advanced only by the explicit "Advance simulated time" control). */
export const CRED_TTL_MIN = 10
export const CREDENTIAL_LABEL = 'DEMO_ONLY_NON_REUSABLE'

/** The transitions present in the dataset, per fulfilment mode (START is the Order's creation as PAID). */
export const TRANSITIONS: Record<Mode, Partial<Record<Status, readonly Status[]>>> = {
  BUYER_COLLECTION: { PAID: ['PREPARING'], PREPARING: ['READY_FOR_COLLECTION', 'CANCELLED'], READY_FOR_COLLECTION: ['FINAL_DELIVERY_VERIFIED'], FINAL_DELIVERY_VERIFIED: ['COMPLETED'] },
  COURIER_DELIVERY: { PAID: ['PREPARING'], PREPARING: ['READY_FOR_DELIVERY'], READY_FOR_DELIVERY: ['COURIER_ASSIGNED'], COURIER_ASSIGNED: ['PICKUP_VERIFIED'], PICKUP_VERIFIED: ['OUT_FOR_DELIVERY'], OUT_FOR_DELIVERY: ['FINAL_DELIVERY_VERIFIED', 'DELIVERY_FAILED'], FINAL_DELIVERY_VERIFIED: ['COMPLETED'], DELIVERY_FAILED: ['RETURNED_TO_SELLER'] },
  SELLER_DELIVERY: { PAID: ['PREPARING'], PREPARING: ['READY_FOR_DELIVERY'], READY_FOR_DELIVERY: ['OUT_FOR_DELIVERY'], OUT_FOR_DELIVERY: ['FINAL_DELIVERY_VERIFIED', 'DELIVERY_FAILED'], FINAL_DELIVERY_VERIFIED: ['COMPLETED'] },
}
export const canMove = (mode: Mode, from: Status, to: Status) => !!TRANSITIONS[mode][from]?.includes(to)
export const TERMINAL: readonly Status[] = ['COMPLETED', 'CANCELLED', 'RETURNED_TO_SELLER']
export const isOpen = (o: { status: Status; mode: Mode }) => !(TERMINAL.includes(o.status) || (o.mode === 'SELLER_DELIVERY' && o.status === 'DELIVERY_FAILED'))
/** Who records each event, as the dataset does. */
const ACTOR: Partial<Record<Status, string>> = { PAID: 'SYSTEM_FIXTURE', PREPARING: 'SELLER', READY_FOR_COLLECTION: 'SELLER', READY_FOR_DELIVERY: 'SELLER', COURIER_ASSIGNED: 'COURIER', PICKUP_VERIFIED: 'COURIER', FINAL_DELIVERY_VERIFIED: 'BUYER', COMPLETED: 'SYSTEM_FIXTURE', DELIVERY_FAILED: 'SELLER', RETURNED_TO_SELLER: 'SELLER', CANCELLED: 'SELLER' }

export interface SimOrder {
  id: string; buyerId: string; sellerId: string; mode: Mode; status: Status; paidAt: string; city: string | null
  merchandise: number; delivery: number; total: number; sceneId: string | null
  assignedCourier: string | null; attemptReason: string | null; cancelReason: string | null; finalHandoffId: string | null; seeded: boolean
}
export interface SimLine { id: string; productId: string; variantId: string | null; variantLabel: string | null; name: string; quantity: number; unit: number; line: number; received: boolean }
export interface SimEvent { orderId: string; index: number; state: Status; at: string; actor: string }
export interface SimHandoff { id: string; orderId: string; stage: Stage; presenterId: string; scannerId: string; method: string; verifiedAt: string; result: string; credential: string }
export interface SimOffer { id: string; orderId: string; sellerId: string; courierId: string; relationshipId: string; offeredAt: string; status: OfferStatus; resolvedAt: string | null }
export interface SimCredential { token: string; orderId: string; stage: Stage; issue: number; presenterId: string; issuedAt: number; expiresAt: number; used: boolean }
/** One entry of a relationship's history: a supplied relationship_event, or a session action. */
export interface RelEvent { status: string; at: string; note: string; session: boolean }
export interface SimState {
  /** Relationship status per `${courier}|${seller}` (null = no relationship), and the history per relationship_id (COURIER-002). */
  relStatus: Record<string, string | null>; relEvents: Record<string, RelEvent[]>
  /** Shared Courier comments (COURIER-001) and the review chain grants -> reviews -> Product Quality ratings (SIM-003). */
  comments: Record<string, SimComment>; grants: Record<string, SimGrant>; reviews: Record<string, SimReview>; ratings: Record<string, SimRating>
  now: number; serial: number
  orders: Record<string, SimOrder>; lines: Record<string, SimLine[]>; events: Record<string, SimEvent[]>; handoffs: Record<string, SimHandoff[]>
  offers: Record<string, SimOffer>; credentials: Record<string, SimCredential>; issues: Record<string, number>; availability: Record<string, Availability>
}

// ---------- the world (static facts the rules read) ----------
export interface World {
  couriers: Record<string, { id: string; name: string; handle: string; baseCity: string; cities: string[]; vehicle: string; verification: string; mvpAvailability: string }>
  relationships: Record<string, { id: string; courierId: string; sellerId: string; status: string | null; canReceive: boolean | null; declared: boolean; note: string }> // key `${courier}|${seller}`; status is the seed's
  settings: Record<string, { enabled: boolean; approved: string[]; fee: number }>
  opportunities: Record<string, { compensation: number; terms: string }> // key `${courier}|${seller}`
  sellers: Record<string, { id: string; name: string; lifecycle: string; city: string }>
  products: Record<string, { id: string; sellerId: string; name: string; price: number; stock: number; published: boolean; variants: boolean }>
  buyers: Record<string, { id: string; name: string; city: string; area: string }>
  scenes: Record<string, { id: string; title: string }>
  claims: Record<string, { id: string; orderId: string; buyerId: string; sellerId: string; outcome: string; basis: string }>
  sellerRep: Record<string, { sellerId: string; published: number; rating: number | null; pqCount: number; pqMean: number | null }>
  productRep: Record<string, { productId: string; sellerId: string; count: number; average: number | null }>
}
type Row = Record<string, any> // source rows carry more columns than types.ts names; they are read here by name
export function buildWorld(ops: OperationsCore, cat: { sellers: Row[]; products: Row[]; variants: Row[]; scenes: Row[] }): World {
  const variantProducts = new Set(cat.variants.map(v => v.product_id as string))
  return {
    couriers: Object.fromEntries((ops.couriers as Row[]).map(c => [c.courier_id, { id: c.courier_id, name: c.name, handle: c.handle, baseCity: c.base_city, cities: c.service_cities, vehicle: c.vehicle, verification: c.verification, mvpAvailability: c.mvp_availability }])),
    relationships: Object.fromEntries((ops.relationships_and_eligibility as Row[]).map(r => [`${r.courier_id}|${r.seller_id}`, { id: r.relationship_id, courierId: r.courier_id, sellerId: r.seller_id, status: r.relationship_status, canReceive: r.can_receive_offer, note: r.current_note_private,
      // a Seller declared an opportunity for this Courier when the row says eligible, or an opportunities record exists (it stays declared after a withdrawal)
      declared: r.opportunity_state === 'ELIGIBLE_TO_APPLY' || (ops.opportunities as Row[]).some(o => o.relationship_id === r.relationship_id) }])),
    settings: Object.fromEntries((ops.simulation_courier_settings as Row[]).map(s => [s.seller_id, { enabled: !!s.courier_delivery_enabled, approved: s.approved_courier_ids, fee: s.example_fee_etb }])),
    opportunities: Object.fromEntries((ops.opportunities as Row[]).map(o => [`${o.courier_id}|${o.seller_id}`, { compensation: o.simulated_compensation_etb, terms: o.terms }])),
    sellers: Object.fromEntries(cat.sellers.map(s => [s.seller_id, { id: s.seller_id, name: s.name, lifecycle: s.lifecycle, city: s.city }])),
    products: Object.fromEntries(cat.products.map(p => [p.product_id, { id: p.product_id, sellerId: p.seller_id, name: p.name, price: p.current_etb, stock: p.stock, published: p.publication === 'PUBLISHED', variants: variantProducts.has(p.product_id) }])),
    buyers: Object.fromEntries((ops.buyers as Row[]).map(b => [b.buyer_id, { id: b.buyer_id, name: b.display_name, city: b.city, area: b.area }])),
    scenes: Object.fromEntries(cat.scenes.map(s => [s.scene_id, { id: s.scene_id, title: s.title }])),
    claims: Object.fromEntries((ops.claims as Row[]).map(c => [c.claim_id, { id: c.claim_id, orderId: c.order_id, buyerId: c.buyer_id, sellerId: c.seller_id, outcome: c.outcome, basis: c.basis }])),
    sellerRep: Object.fromEntries((ops.seller_reputation as Row[]).map(r => [r.seller_id, { sellerId: r.seller_id, published: r.published_service_reviews, rating: r.service_rating ?? null, pqCount: r.product_rating_count, pqMean: r.product_rating_mean ?? null }])),
    productRep: Object.fromEntries((ops.product_reputation as Row[]).map(r => [r.product_id, { productId: r.product_id, sellerId: r.seller_id, count: r.rating_count, average: r.average_stars ?? null }])),
  }
}

const groupBy = <T>(rows: readonly T[], key: (r: T) => string) => { const m: Record<string, T[]> = {}; for (const r of rows) (m[key(r)] ??= []).push(r); return m }

/** The seed: the supplied Orders, lines, timeline events, Handoffs and offers exactly as the dataset has them. */
export function seedState(ops: OperationsCore): SimState {
  const orders: Record<string, SimOrder> = {}
  for (const r of ops.orders as Row[]) {
    orders[r.order_id] = { id: r.order_id, buyerId: r.buyer_id, sellerId: r.seller_id, mode: r.fulfilment_mode, status: r.status, paidAt: r.paid_at, city: r.delivery_city ?? null, merchandise: r.merchandise_etb, delivery: r.delivery_etb, total: r.total_etb, sceneId: r.source_scene_id ?? null, assignedCourier: r.assigned_courier_id ?? null, attemptReason: r.delivery_attempt_reason ?? null, cancelReason: r.cancellation_reason ?? null, finalHandoffId: r.final_handoff_id ?? null, seeded: true }
  }
  const lines = groupBy(ops.order_lines as Row[], r => r.order_id)
  const events = groupBy(ops.order_events as Row[], r => r.order_id)
  const handoffs = groupBy(ops.handoffs as Row[], r => r.order_id)
  const offers: Record<string, SimOffer> = {}
  for (const r of ops.delivery_offers as Row[]) offers[r.offer_id] = { id: r.offer_id, orderId: r.order_id, sellerId: r.seller_id, courierId: r.courier_id, relationshipId: r.relationship_id, offeredAt: r.offered_at, status: r.status, resolvedAt: r.resolved_at ?? null }
  const byRel = groupBy(ops.relationship_events as Row[], r => r.relationship_id)
  return {
    relStatus: Object.fromEntries((ops.relationships_and_eligibility as Row[]).map(r => [`${r.courier_id}|${r.seller_id}`, r.relationship_status ?? null])),
    relEvents: Object.fromEntries(Object.entries(byRel).map(([k, v]) => [k, v.sort((a, b) => a.event_index - b.event_index).map(e => ({ status: e.status, at: e.at, note: e.note, session: false }))])),
    comments: Object.fromEntries((ops.courier_comments as Row[]).map(c => [c.comment_id, { id: c.comment_id, courierId: c.courier_id, sellerId: c.seller_id, orderId: c.order_id, sentiment: c.sentiment, topic: c.topic, text: c.text, createdAt: c.created_at, visibility: c.visibility, moderation: c.moderation_state, seeded: true }])),
    grants: Object.fromEntries((ops.review_grants as Row[]).map(g => [g.grant_id, { id: g.grant_id, orderId: g.order_id, buyerId: g.buyer_id, sellerId: g.seller_id, basis: g.basis, claimId: g.claim_id ?? null, state: g.state, eligibleAt: g.eligible_at, seeded: true }])),
    reviews: Object.fromEntries((ops.reviews as Row[]).map(r => [r.review_id, { id: r.review_id, grantId: r.grant_id, orderId: r.order_id, buyerId: r.buyer_id, sellerId: r.seller_id, basis: r.basis, stars: r.seller_service_stars, text: r.seller_service_text, publishedAt: r.published_at, visibility: r.visibility, moderationNote: r.moderation_note ?? null, seeded: true }])),
    ratings: Object.fromEntries((ops.product_ratings as Row[]).map(p => [p.item_review_id, { id: p.item_review_id, reviewId: p.review_id, orderLineId: p.order_line_id, productId: p.product_id, stars: p.product_quality_stars, text: p.product_quality_text }])),
    now: 0, serial: 0, orders,
    lines: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, v.map(l => ({ id: l.order_line_id, productId: l.product_id, variantId: l.variant_id ?? null, variantLabel: l.variant_label ?? null, name: l.product_name_snapshot, quantity: l.quantity, unit: l.unit_etb, line: l.line_etb, received: !!l.received }))])),
    events: Object.fromEntries(Object.entries(events).map(([k, v]) => [k, v.sort((a, b) => a.event_index - b.event_index).map(e => ({ orderId: e.order_id, index: e.event_index, state: e.state, at: e.at, actor: e.actor }))])),
    handoffs: Object.fromEntries(Object.entries(handoffs).map(([k, v]) => [k, v.map(h => ({ id: h.handoff_id, orderId: h.order_id, stage: h.stage, presenterId: h.presenter_id, scannerId: h.scanner_id, method: h.method, verifiedAt: h.verified_at, result: h.result, credential: h.credential }))])),
    offers, credentials: {}, issues: {},
    availability: Object.fromEntries((ops.couriers as Row[]).map(c => [c.courier_id, c.simulation_availability])),
  }
}

// ---------- time and credentials ----------
/** Deterministic synthetic credential for one Order, Stage and issue number: FNV-1a over the three, rendered as `ADU-SIM-XXXX-XXXX`. Not a secret, not a real QR payload. */
export function credentialToken(orderId: string, stage: Stage, issue: number): string {
  let h = 0x811c9dc5
  const text = `${orderId}|${stage}|${issue}`
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  let g = Math.imul(h ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 4; i++) { out += A[h & 31]; h >>>= 5 }
  out += '-'
  for (let i = 0; i < 4; i++) { out += A[g & 31]; g >>>= 5 }
  return `ADU-SIM-${out}`
}
/** The credential currently on display for an Order and Stage (the latest issue), whether valid or not. */
export function currentCredential(s: SimState, orderId: string, stage: Stage): SimCredential | undefined {
  const n = s.issues[`${orderId}|${stage}`]
  return n ? s.credentials[credentialToken(orderId, stage, n)] : undefined
}
export const credentialState = (s: SimState, c: SimCredential): 'ACTIVE' | 'USED' | 'EXPIRED' => (c.used ? 'USED' : s.now >= c.expiresAt ? 'EXPIRED' : 'ACTIVE')

// ---------- derived facts ----------
export interface Expected { stage: Stage; presenter: Party; scanner: Party }
/** The Handoff that is open for an Order now, if any: who presents the code and who scans it. */
export function expectedHandoff(o: SimOrder): Expected | null {
  const seller: Party = { role: 'SELLER', id: o.sellerId }, buyer: Party = { role: 'BUYER', id: o.buyerId }
  const courier: Party | null = o.assignedCourier ? { role: 'COURIER', id: o.assignedCourier } : null
  if (o.mode === 'BUYER_COLLECTION' && o.status === 'READY_FOR_COLLECTION') return { stage: 'DELIVERY', presenter: seller, scanner: buyer }
  if (o.mode === 'SELLER_DELIVERY' && o.status === 'OUT_FOR_DELIVERY') return { stage: 'DELIVERY', presenter: seller, scanner: buyer }
  if (o.mode === 'COURIER_DELIVERY' && courier) {
    if (o.status === 'COURIER_ASSIGNED') return { stage: 'PICKUP', presenter: seller, scanner: courier }
    if (o.status === 'OUT_FOR_DELIVERY') return { stage: 'DELIVERY', presenter: courier, scanner: buyer }
    if (o.status === 'DELIVERY_FAILED') return { stage: 'RETURN', presenter: courier, scanner: seller }
  }
  return null
}
export const offersOf = (s: SimState, orderId: string) => Object.values(s.offers).filter(o => o.orderId === orderId)
export const pendingOffers = (s: SimState, orderId: string) => offersOf(s, orderId).filter(o => o.status === 'PENDING')
/** The dataset's scenario_status: an Order ready for a Courier with an offer out reads OFFER_PENDING; a returned Order reads DELIVERY_FAILED. */
export function scenarioStatus(s: SimState, o: SimOrder): string {
  if (o.status === 'READY_FOR_DELIVERY' && o.mode === 'COURIER_DELIVERY' && pendingOffers(s, o.id).length) return 'OFFER_PENDING'
  return o.status === 'RETURNED_TO_SELLER' ? 'DELIVERY_FAILED' : o.status
}
export const ordersOfSeller = (s: SimState, sellerId: string) => Object.values(s.orders).filter(o => o.sellerId === sellerId)
export const ordersOfBuyer = (s: SimState, buyerId: string) => Object.values(s.orders).filter(o => o.buyerId === buyerId)
export const ordersOfCourier = (s: SimState, courierId: string) => Object.values(s.orders).filter(o => o.assignedCourier === courierId)
/** Newest paid first; Orders recorded in this session come before seeded ones paid at the same minute; otherwise the dataset's order is kept. */
export const sortNewest = (rows: SimOrder[]) => [...rows].sort((a, b) => b.paidAt.localeCompare(a.paidAt) || Number(a.seeded) - Number(b.seeded))

// ---------- eligibility ----------
export interface Verdict { ok: boolean; code: string; reason: string }
const yes: Verdict = { ok: true, code: 'ELIGIBLE', reason: 'Eligible' }
const no = (code: string, reason: string): Verdict => ({ ok: false, code, reason })

/** The relationship-level rule behind relationships_and_eligibility.can_receive_offer: approved pool member, VERIFIED, AVAILABLE, not suspended or removed. */
export function canReceiveOffers(w: World, s: SimState, courierId: string, sellerId: string): Verdict {
  const c = w.couriers[courierId]
  if (!c) return no('UNKNOWN_COURIER', 'Unknown Courier')
  const status = s.relStatus[`${courierId}|${sellerId}`] ?? null
  if (status === 'SUSPENDED') return no('RELATIONSHIP_SUSPENDED', 'The relationship with this Seller is suspended')
  if (status === 'REMOVED') return no('RELATIONSHIP_REMOVED', 'The Courier was removed from this Seller\'s pool')
  if (status !== 'APPROVED') return no('NOT_POOL_MEMBER', 'Not an approved member of this Seller\'s Courier pool')
  if (c.verification !== 'VERIFIED') return no('NOT_VERIFIED', `Courier verification is ${c.verification}: only VERIFIED Couriers can receive offers`)
  const a = s.availability[courierId]
  if (a !== 'AVAILABLE') return no('UNAVAILABLE', `Courier is ${a === 'BUSY' ? 'busy' : 'unavailable'} right now`)
  return yes
}
/** Whether this Courier may be offered, and later accept, this Order. Rechecked at acceptance. */
export function courierEligibility(w: World, s: SimState, orderId: string, courierId: string): Verdict {
  const o = s.orders[orderId]
  if (!o) return no('NO_ORDER', 'Unknown Order')
  if (o.mode !== 'COURIER_DELIVERY') return no('NOT_COURIER_MODE', 'This Order is not a Courier Delivery')
  if (o.assignedCourier) return no('ALREADY_ASSIGNED', 'A Courier is already assigned to this Order')
  if (o.status !== 'READY_FOR_DELIVERY') return no('NOT_READY', 'The Order is not ready for a Courier')
  const base = canReceiveOffers(w, s, courierId, o.sellerId)
  if (!base.ok) return base
  const c = w.couriers[courierId]
  if (!o.city || !c.cities.includes(o.city)) return no('OUT_OF_COVERAGE', `${c.name} does not cover ${o.city ?? 'this delivery city'} (covers ${c.cities.join(', ')})`)
  return yes
}

// ---------- actions ----------
export type Action =
  | { type: 'ADVANCE_TIME'; minutes: number }
  | { type: 'CREATE_ORDER'; actor: Party; buyerId: string; mode: Mode; productId: string }
  | { type: 'START_PREPARING'; actor: Party; orderId: string }
  | { type: 'MARK_READY'; actor: Party; orderId: string }
  | { type: 'CANCEL'; actor: Party; orderId: string }
  | { type: 'OFFER'; actor: Party; orderId: string; courierId: string }
  | { type: 'ACCEPT_OFFER'; actor: Party; offerId: string }
  | { type: 'REJECT_OFFER'; actor: Party; offerId: string }
  | { type: 'SET_AVAILABILITY'; actor: Party; value: Availability }
  | { type: 'START_DELIVERY'; actor: Party; orderId: string }
  | { type: 'START_TRANSPORT'; actor: Party; orderId: string }
  | { type: 'FAIL_DELIVERY'; actor: Party; orderId: string; reason: string }
  | { type: 'PRESENT'; actor: Party; orderId: string; stage: Stage }
  | { type: 'SCAN'; actor: Party; orderId: string; stage: Stage; token?: string }
  | { type: 'APPLY'; actor: Party; sellerId: string }
  | { type: 'ACCEPT_INVITATION'; actor: Party; sellerId: string }
  | { type: 'WITHDRAW'; actor: Party; sellerId: string }
  | { type: 'COMMENT'; actor: Party; orderId: string; sentiment: string; topic: string; text: string }
  | { type: 'SUBMIT_REVIEW'; actor: Party; grantId: string; serviceStars: number; serviceText: string; ratings: { orderLineId: string; stars: number; text: string }[] }
export type Result = { ok: true; state: SimState; note: string } | { ok: false; code: string; reason: string }
const fail = (code: string, reason: string): Result => ({ ok: false, code, reason })

const isParty = (a: Party, role: Role, id: string) => a.role === role && a.id === id
function setOrder(s: SimState, o: SimOrder, patch: Partial<SimOrder>): SimState { return { ...s, orders: { ...s.orders, [o.id]: { ...o, ...patch } } } }
function addEvent(s: SimState, orderId: string, state: Status, actor?: string): SimState {
  const list = s.events[orderId] ?? []
  const e: SimEvent = { orderId, index: list.length + 1, state, at: isoAt(s.now), actor: actor ?? ACTOR[state] ?? 'SELLER' }
  return { ...s, events: { ...s.events, [orderId]: [...list, e] } }
}
/** Move an Order along an allowed transition and record the event; the caller has already validated the actor. */
function move(s: SimState, orderId: string, to: Status, patch: Partial<SimOrder> = {}): SimState {
  const o = s.orders[orderId]
  return addEvent(setOrder(s, o, { status: to, ...patch }), orderId, to)
}
const busyOthers = (s: SimState, courierId: string, except: string) => Object.values(s.orders).some(o => o.id !== except && o.assignedCourier === courierId && ['COURIER_ASSIGNED', 'PICKUP_VERIFIED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(o.status))
function freeCourier(s: SimState, courierId: string | null, orderId: string): SimState {
  if (!courierId || busyOthers(s, courierId, orderId)) return s
  return { ...s, availability: { ...s.availability, [courierId]: 'AVAILABLE' } }
}

export function apply(w: World, s: SimState, a: Action): Result {
  if (a.type === 'APPLY' || a.type === 'ACCEPT_INVITATION' || a.type === 'WITHDRAW') return relationshipAction(w, s, a)
  if (a.type === 'COMMENT') return commentAction(w, s, a)
  if (a.type === 'SUBMIT_REVIEW') return reviewAction(w, s, a, isoAt(s.now))
  if (a.type === 'ADVANCE_TIME') {
    if (!Number.isInteger(a.minutes) || a.minutes < 1 || a.minutes > 24 * 60) return fail('BAD_TIME', 'Advance by a whole number of minutes between 1 and 1440')
    return { ok: true, state: { ...s, now: s.now + a.minutes }, note: `Simulated time advanced by ${a.minutes} min` }
  }
  if (a.type === 'SET_AVAILABILITY') {
    if (a.actor.role !== 'COURIER' || !w.couriers[a.actor.id]) return fail('WRONG_PARTY', 'Only a Courier sets their own availability')
    if (s.availability[a.actor.id] === a.value) return { ok: true, state: s, note: `Already ${a.value.toLowerCase()}` }
    if (a.value === 'AVAILABLE' && busyOthers(s, a.actor.id, '')) return fail('ACTIVE_DELIVERY', 'Finish the active delivery first')
    return { ok: true, state: { ...s, availability: { ...s.availability, [a.actor.id]: a.value } }, note: `Availability set to ${a.value.toLowerCase()} (simulation only)` }
  }
  if (a.type === 'CREATE_ORDER') {
    const sellerId = a.actor.id, seller = w.sellers[sellerId], buyer = w.buyers[a.buyerId], p = w.products[a.productId]
    if (a.actor.role !== 'SELLER' || !seller) return fail('WRONG_PARTY', 'Only a Seller records a demonstration Order')
    if (seller.lifecycle !== 'ACTIVE') return fail('SELLER_NOT_ACTIVE', `${seller.name} is ${seller.lifecycle.toLowerCase()} and cannot receive Orders`)
    if (!buyer) return fail('NO_BUYER', 'Choose a Buyer')
    if (!p || p.sellerId !== sellerId || !p.published || p.stock < 1 || p.variants) return fail('NO_PRODUCT', 'Choose one of this Seller\'s published, in-stock Products without Variants')
    if (a.mode === 'COURIER_DELIVERY' && !w.settings[sellerId]?.enabled) return fail('COURIER_NOT_ENABLED', 'Courier Delivery is not enabled for this Seller in the simulation')
    const id = `SIM-O-D${String(s.serial + 1).padStart(3, '0')}`
    const delivery = a.mode === 'BUYER_COLLECTION' ? 0 : a.mode === 'SELLER_DELIVERY' ? 80 : (w.settings[sellerId]?.fee ?? 110)
    const order: SimOrder = { id, buyerId: a.buyerId, sellerId, mode: a.mode, status: 'PAID', paidAt: isoAt(s.now), city: a.mode === 'BUYER_COLLECTION' ? null : buyer.city, merchandise: p.price, delivery, total: p.price + delivery, sceneId: null, assignedCourier: null, attemptReason: null, cancelReason: null, finalHandoffId: null, seeded: false }
    let n: SimState = { ...s, serial: s.serial + 1, orders: { ...s.orders, [id]: order }, lines: { ...s.lines, [id]: [{ id: `${id}-L01`, productId: p.id, variantId: null, variantLabel: null, name: p.name, quantity: 1, unit: p.price, line: p.price, received: false }] } }
    n = addEvent(n, id, 'PAID')
    return { ok: true, state: n, note: `Demonstration Order ${id} recorded as simulated paid (no payment, stock or Cart effect)` }
  }
  if (a.type === 'OFFER' || a.type === 'ACCEPT_OFFER' || a.type === 'REJECT_OFFER') return offerAction(w, s, a)
  const o = s.orders[a.orderId]
  if (!o) return fail('NO_ORDER', 'Unknown Order')
  const seller = isParty(a.actor, 'SELLER', o.sellerId)
  const need = (cond: boolean, who: string) => (cond ? null : fail('WRONG_PARTY', `Only ${who} can do this`))
  switch (a.type) {
    case 'START_PREPARING': {
      const bad = need(seller, 'the Order\'s Seller'); if (bad) return bad
      if (!canMove(o.mode, o.status, 'PREPARING')) return fail('BAD_STATE', `An Order that is ${STATUS_LABEL[o.status].toLowerCase()} cannot start preparing`)
      return { ok: true, state: move(s, o.id, 'PREPARING'), note: 'Preparing' }
    }
    case 'MARK_READY': {
      const bad = need(seller, 'the Order\'s Seller'); if (bad) return bad
      const to: Status = o.mode === 'BUYER_COLLECTION' ? 'READY_FOR_COLLECTION' : 'READY_FOR_DELIVERY'
      if (o.status !== 'PREPARING' || !canMove(o.mode, o.status, to)) return fail('BAD_STATE', `An Order that is ${STATUS_LABEL[o.status].toLowerCase()} cannot be marked ready`)
      return { ok: true, state: move(s, o.id, to), note: STATUS_LABEL[to] }
    }
    case 'CANCEL': {
      const bad = need(seller, 'the Order\'s Seller'); if (bad) return bad
      if (!canMove(o.mode, o.status, 'CANCELLED')) return fail('BAD_STATE', 'Only a Buyer Collection Order that is still being prepared can be cancelled in the simulation')
      return { ok: true, state: move(s, o.id, 'CANCELLED', { cancelReason: CANCEL_REASON }), note: 'Order cancelled' }
    }
    case 'START_DELIVERY': {
      const bad = need(seller, 'the Order\'s Seller'); if (bad) return bad
      if (o.mode !== 'SELLER_DELIVERY' || !canMove(o.mode, o.status, 'OUT_FOR_DELIVERY')) return fail('BAD_STATE', 'Only a Seller Delivery Order that is ready for delivery can start delivery')
      return { ok: true, state: move(s, o.id, 'OUT_FOR_DELIVERY', { }), note: 'Out for delivery' }
    }
    case 'START_TRANSPORT': {
      if (!o.assignedCourier || !isParty(a.actor, 'COURIER', o.assignedCourier)) return fail('NOT_ASSIGNED', 'Only the Courier assigned to this Order can start transport')
      if (!canMove(o.mode, o.status, 'OUT_FOR_DELIVERY')) return fail('BAD_STATE', 'Transport starts after the pickup is verified')
      return { ok: true, state: addEvent(setOrder(s, o, { status: 'OUT_FOR_DELIVERY' }), o.id, 'OUT_FOR_DELIVERY', 'COURIER'), note: 'Out for delivery' }
    }
    case 'FAIL_DELIVERY': {
      const courierOk = !!o.assignedCourier && isParty(a.actor, 'COURIER', o.assignedCourier)
      if (!seller && !courierOk) return fail('WRONG_PARTY', 'Only the Seller or the assigned Courier can record a failed attempt')
      if (!(FAIL_REASONS as readonly string[]).includes(a.reason)) return fail('BAD_REASON', 'Choose a recorded reason')
      if (!canMove(o.mode, o.status, 'DELIVERY_FAILED')) return fail('BAD_STATE', 'A delivery attempt can fail only while the Order is out for delivery')
      return { ok: true, state: move(s, o.id, 'DELIVERY_FAILED', { attemptReason: a.reason }), note: 'Delivery attempt failed' }
    }
    case 'PRESENT': return present(s, o, a)
    case 'SCAN': return scan(s, o, a)
  }
}

function offerAction(w: World, s: SimState, a: Extract<Action, { type: 'OFFER' | 'ACCEPT_OFFER' | 'REJECT_OFFER' }>): Result {
  if (a.type === 'OFFER') {
    const o = s.orders[a.orderId]
    if (!o) return fail('NO_ORDER', 'Unknown Order')
    if (!isParty(a.actor, 'SELLER', o.sellerId)) return fail('WRONG_PARTY', 'Only the Order\'s Seller can offer it to a Courier')
    const v = courierEligibility(w, s, o.id, a.courierId)
    if (!v.ok) return fail(v.code, v.reason)
    if (pendingOffers(s, o.id).some(p => p.courierId === a.courierId)) return fail('DUPLICATE_OFFER', `${w.couriers[a.courierId].name} already has a pending offer for this Order`)
    const id = `${o.id}-OFF${offersOf(s, o.id).length + 1}`
    const offer: SimOffer = { id, orderId: o.id, sellerId: o.sellerId, courierId: a.courierId, relationshipId: w.relationships[`${a.courierId}|${o.sellerId}`].id, offeredAt: isoAt(s.now), status: 'PENDING', resolvedAt: null }
    return { ok: true, state: { ...s, offers: { ...s.offers, [id]: offer } }, note: `Offer sent to ${w.couriers[a.courierId].name}` }
  }
  const offer = s.offers[a.offerId]
  if (!offer) return fail('NO_OFFER', 'Unknown offer')
  if (!isParty(a.actor, 'COURIER', offer.courierId)) return fail('WRONG_PARTY', 'This offer was not made to you')
  if (offer.status !== 'PENDING') return fail('OFFER_CLOSED', `This offer is ${offer.status.toLowerCase()} and can no longer be answered`)
  const o = s.orders[offer.orderId]
  const resolve = (st: SimState, status: OfferStatus, id: string): SimState => ({ ...st, offers: { ...st.offers, [id]: { ...st.offers[id], status, resolvedAt: isoAt(st.now) } } })
  if (a.type === 'REJECT_OFFER') return { ok: true, state: resolve(s, 'REJECTED', offer.id), note: 'Offer declined. The Order is open to other eligible Couriers.' }
  if (o.assignedCourier) return { ok: false, code: 'ALREADY_ASSIGNED', reason: 'Another Courier already accepted this Order' }
  const v = courierEligibility(w, s, o.id, offer.courierId)
  if (!v.ok) return fail(v.code, v.reason)
  let n = s
  for (const p of pendingOffers(s, o.id)) n = resolve(n, p.id === offer.id ? 'ACCEPTED' : 'EXPIRED', p.id)
  n = { ...n, availability: { ...n.availability, [offer.courierId]: 'BUSY' } }
  n = move(n, o.id, 'COURIER_ASSIGNED', { assignedCourier: offer.courierId })
  return { ok: true, state: n, note: 'Offer accepted. The Seller now presents the pickup code.' }
}

function present(s: SimState, o: SimOrder, a: Extract<Action, { type: 'PRESENT' }>): Result {
  const exp = expectedHandoff(o)
  if (!exp || exp.stage !== a.stage) return fail('NO_HANDOFF_OPEN', `No ${STAGE_LABEL[a.stage].toLowerCase()} handoff is open for this Order (${STATUS_LABEL[o.status].toLowerCase()})`)
  if (a.actor.role !== exp.presenter.role) return fail('WRONG_PARTY', `Only the ${exp.presenter.role === 'SELLER' ? 'Seller' : 'Courier'} presents the ${STAGE_LABEL[a.stage].toLowerCase()} code`)
  if (a.actor.id !== exp.presenter.id) return fail(a.actor.role === 'COURIER' ? 'NOT_ASSIGNED' : 'NOT_YOUR_ORDER', a.actor.role === 'COURIER' ? 'You are not the Courier assigned to this Order' : 'This is not your Order')
  const live = currentCredential(s, o.id, a.stage)
  if (live && credentialState(s, live) === 'ACTIVE') return { ok: true, state: s, note: 'The code is already on display' }
  const issue = (s.issues[`${o.id}|${a.stage}`] ?? 0) + 1
  const token = credentialToken(o.id, a.stage, issue)
  const cred: SimCredential = { token, orderId: o.id, stage: a.stage, issue, presenterId: a.actor.id, issuedAt: s.now, expiresAt: s.now + CRED_TTL_MIN, used: false }
  return { ok: true, state: { ...s, credentials: { ...s.credentials, [token]: cred }, issues: { ...s.issues, [`${o.id}|${a.stage}`]: issue } }, note: `${STAGE_LABEL[a.stage]} code displayed (valid ${CRED_TTL_MIN} simulated minutes, single use)` }
}

const normalise = (t: string) => t.trim().toUpperCase().replace(/\s+/g, '')
function scan(s: SimState, o: SimOrder, a: Extract<Action, { type: 'SCAN' }>): Result {
  const exp = expectedHandoff(o)
  // 1. Who may scan this Stage of this Order at all.
  const scannerRole: Role = a.stage === 'PICKUP' ? 'COURIER' : a.stage === 'RETURN' ? 'SELLER' : 'BUYER'
  if (a.actor.role !== scannerRole) return fail('WRONG_PARTY', `${a.actor.role === 'BUYER' ? 'A Buyer' : a.actor.role === 'COURIER' ? 'A Courier' : 'A Seller'} cannot scan the ${STAGE_LABEL[a.stage].toLowerCase()} code: it is scanned by the ${scannerRole === 'COURIER' ? 'Courier' : scannerRole === 'SELLER' ? 'Seller' : 'Buyer'}`)
  const mine = scannerRole === 'BUYER' ? o.buyerId : scannerRole === 'SELLER' ? o.sellerId : o.assignedCourier
  if (a.actor.id !== mine) return fail(scannerRole === 'COURIER' ? 'NOT_ASSIGNED' : 'NOT_YOUR_ORDER', scannerRole === 'COURIER' ? 'You are not the Courier assigned to this Order: an unauthorised Courier cannot scan it' : 'This is not your Order')
  // 2. The credential.
  const cred = currentCredential(s, o.id, a.stage)
  const token = a.token === undefined || a.token.trim() === '' ? cred?.token : normalise(a.token)
  if (!token) return fail('NOT_PRESENTED', 'No code is on display for this handoff yet. Ask the presenting party to display it.')
  const found = s.credentials[token]
  if (!found) return fail('INCORRECT_TOKEN', 'Incorrect code: it does not match any code issued in this simulation')
  if (found.orderId !== o.id) return fail('WRONG_ORDER', `Wrong Order: this code belongs to ${found.orderId}, not ${o.id}`)
  if (found.stage !== a.stage) return fail('WRONG_STAGE_TOKEN', `This is the ${STAGE_LABEL[found.stage].toLowerCase()} code, not the ${STAGE_LABEL[a.stage].toLowerCase()} code`)
  if (found.used) return fail('ALREADY_USED', 'This code was already used. Each code works once; nothing changed.')
  if (s.now >= found.expiresAt) return fail('EXPIRED', 'This code has expired (simulated time). Ask the presenting party to display a new one.')
  if (cred && cred.token !== found.token) return fail('SUPERSEDED', 'A newer code has been displayed; this one no longer works')
  if (!exp || exp.stage !== a.stage) return fail('NO_HANDOFF_OPEN', `No ${STAGE_LABEL[a.stage].toLowerCase()} handoff is open for this Order (${STATUS_LABEL[o.status].toLowerCase()})`)
  // 3. Success: single use, record the evidence, then the transition. Pickup moves custody only; only the final handoff completes the Order.
  let n: SimState = { ...s, credentials: { ...s.credentials, [token]: { ...found, used: true } } }
  const hid = `${o.id}-H-${a.stage}`
  const h: SimHandoff = { id: hid, orderId: o.id, stage: a.stage, presenterId: exp.presenter.id, scannerId: exp.scanner.id, method: a.stage === 'RETURN' ? 'SIMULATED_RETURN_EVIDENCE' : 'QR', verifiedAt: isoAt(s.now), result: 'ACCEPTED_SIMULATED', credential: CREDENTIAL_LABEL }
  n = { ...n, handoffs: { ...n.handoffs, [o.id]: [...(n.handoffs[o.id] ?? []), h] } }
  if (a.stage === 'PICKUP') return { ok: true, state: move(n, o.id, 'PICKUP_VERIFIED'), note: 'Pickup verified: custody passed to the Courier. The Order is not complete.' }
  if (a.stage === 'RETURN') return { ok: true, state: freeCourier(move(n, o.id, 'RETURNED_TO_SELLER'), o.assignedCourier, o.id), note: 'Return verified: the goods are back with the Seller' }
  n = move(n, o.id, 'FINAL_DELIVERY_VERIFIED', { finalHandoffId: hid, })
  n = { ...n, lines: { ...n.lines, [o.id]: (n.lines[o.id] ?? []).map(l => ({ ...l, received: true })) } }
  n = move(n, o.id, 'COMPLETED')
  n = issueGrant(n, o.id, isoAt(s.now + GRANT_DELAY_MIN)) // SIM-003: the Buyer's Review Grant for this Order
  return { ok: true, state: freeCourier(n, o.assignedCourier, o.id), note: 'Final delivery verified. The Order is completed.' }
}
