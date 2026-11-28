// COURIER-001 (FR-004): shared Courier comments on the supplied courier_comments. Pure TypeScript. A comment is evidence-based: it is written by the
// Seller of a simulated Order about the Courier that served that Order, so order_id, seller_id and courier_id must agree with the Order. There are no
// ratings and no score: only sentiment, topic and text. Shared comments are a founder-requested experiment, not production reputation policy.
// They are strictly separate from the private relationship notes (relationships.ts): different data, different sections, different viewers.
import { isoAt } from './clock.ts'
import type { Action, Result, SimState, World } from './orders.ts'
import type { Viewer } from './relationships.ts'

export const EXPERIMENT_LABEL = 'Prototype experiment, not approved production reputation policy'
export const SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const
export const TOPICS = ['RELIABILITY', 'HANDLING', 'DELAY', 'COMMUNICATION', 'IMPROVEMENT', 'COORDINATION', 'FAILED_ATTEMPT'] as const
export const SENTIMENT_LABEL: Record<string, string> = { POSITIVE: 'Positive', NEUTRAL: 'Neutral', NEGATIVE: 'Negative' }
export const TOPIC_LABEL: Record<string, string> = { RELIABILITY: 'Reliability', HANDLING: 'Handling', DELAY: 'Delay', COMMUNICATION: 'Communication', IMPROVEMENT: 'Improvement', COORDINATION: 'Coordination', FAILED_ATTEMPT: 'Failed attempt' }
export const MAX_TEXT = 300
const SHARED = 'PROPOSED_SHARED_ELIGIBLE_SELLERS', VISIBLE = 'VISIBLE_FIXTURE', PENDING = 'PENDING_REVIEW'

export interface SimComment { id: string; courierId: string; sellerId: string; orderId: string; sentiment: string; topic: string; text: string; createdAt: string; visibility: string; moderation: string; seeded: boolean }

/** Visibility-allowed: shared with eligible Sellers and cleared by moderation. Only these count in any aggregate and only these reach other Sellers. */
export const isShared = (c: SimComment) => c.visibility === SHARED && c.moderation === VISIBLE
export const isPending = (c: SimComment) => c.moderation === PENDING

/** Why a comment's provenance is invalid, or null when it matches a simulated Order that this Courier served for this Seller. */
export function provenanceError(s: SimState, c: Pick<SimComment, 'courierId' | 'sellerId' | 'orderId'>): string | null {
  const o = s.orders[c.orderId]
  if (!o) return `Unknown Order ${c.orderId}`
  if (o.sellerId !== c.sellerId) return `Order ${o.id} belongs to ${o.sellerId}, not ${c.sellerId}`
  if (!o.assignedCourier || o.assignedCourier !== c.courierId) return `Order ${o.id} was not served by ${c.courierId}`
  if (o.status !== 'COMPLETED' && o.status !== 'RETURNED_TO_SELLER') return `Order ${o.id} has not finished (${o.status.toLowerCase()})`
  return null
}

/** Sellers a Courier has served: at least one Order assigned to that Courier. Only these Sellers see other Sellers' shared comments about the Courier. */
export const servedSellers = (s: SimState, courierId: string) => new Set(Object.values(s.orders).filter(o => o.assignedCourier === courierId).map(o => o.sellerId))

/**
 * The comments about one Courier that a viewer may see. The Courier sees every comment about them, pending ones included (marked pending). A Seller the
 * Courier served sees the shared ones plus their own pending ones. Any other Seller, a Buyer or the public sees nothing.
 */
export function commentsFor(s: SimState, viewer: Viewer, courierId: string): SimComment[] {
  const all = Object.values(s.comments).filter(c => c.courierId === courierId)
  const rows = viewer.role === 'COURIER' ? (viewer.id === courierId ? all : [])
    : viewer.role === 'SELLER' ? (servedSellers(s, courierId).has(viewer.id) ? all.filter(c => isShared(c) || (isPending(c) && c.sellerId === viewer.id)) : [])
    : []
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
}

/** Counts by sentiment over visibility-allowed comments only. `pending` is reported beside the counts, never inside them. */
export function summary(rows: SimComment[]) {
  const shared = rows.filter(isShared)
  return { positive: shared.filter(c => c.sentiment === 'POSITIVE').length, neutral: shared.filter(c => c.sentiment === 'NEUTRAL').length, negative: shared.filter(c => c.sentiment === 'NEGATIVE').length, total: shared.length, pending: rows.filter(isPending).length }
}

/** The Seller's own Orders a comment may be written on: served by a Courier, finished, and with no comment of this Seller on it yet. */
export const commentableOrders = (s: SimState, sellerId: string) => Object.values(s.orders).filter(o => o.sellerId === sellerId && !provenanceError(s, { courierId: o.assignedCourier ?? '', sellerId, orderId: o.id }) && !Object.values(s.comments).some(c => c.orderId === o.id))

const fail = (code: string, reason: string): Result => ({ ok: false, code, reason })
type CommentAction = Extract<Action, { type: 'COMMENT' }>
/** A new shared comment starts pending moderation: it shows to its author and the Courier as pending and counts nowhere until cleared. */
export function commentAction(w: World, s: SimState, a: CommentAction): Result {
  const o = s.orders[a.orderId]
  if (!o) return fail('NO_ORDER', 'Unknown Order')
  if (a.actor.role !== 'SELLER' || a.actor.id !== o.sellerId) return fail('WRONG_PARTY', 'Only the Order\'s Seller can comment on the Courier that served it')
  if (!o.assignedCourier) return fail('NO_COURIER', 'No Courier served this Order, so there is nothing to comment on')
  const bad = provenanceError(s, { courierId: o.assignedCourier, sellerId: o.sellerId, orderId: o.id })
  if (bad) return fail('NO_EVIDENCE', `A comment needs a finished Order served by the Courier: ${bad}`)
  if (Object.values(s.comments).some(c => c.orderId === o.id)) return fail('DUPLICATE_COMMENT', 'This Order already has a comment about its Courier')
  if (!(SENTIMENTS as readonly string[]).includes(a.sentiment)) return fail('BAD_SENTIMENT', 'Choose positive, neutral or negative')
  if (!(TOPICS as readonly string[]).includes(a.topic)) return fail('BAD_TOPIC', 'Choose a topic')
  const text = a.text.trim()
  if (!text) return fail('EMPTY_TEXT', 'Write a short factual comment')
  if (text.length > MAX_TEXT) return fail('TEXT_TOO_LONG', `Keep the comment to ${MAX_TEXT} characters`)
  const id = `CC-S${String(Object.values(s.comments).filter(c => !c.seeded).length + 1).padStart(3, '0')}`
  const c: SimComment = { id, courierId: o.assignedCourier, sellerId: o.sellerId, orderId: o.id, sentiment: a.sentiment, topic: a.topic, text, createdAt: isoAt(s.now), visibility: 'REVIEW_REQUIRED', moderation: PENDING, seeded: false }
  return { ok: true, state: { ...s, comments: { ...s.comments, [id]: c } }, note: `Comment ${id} recorded. It is pending moderation and is not counted or shown to other Sellers.` }
}
