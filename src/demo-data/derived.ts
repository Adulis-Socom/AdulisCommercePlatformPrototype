// Values derived from the canonical records, at a point on the story timeline. Each rule follows an approved source;
// where DEMO_DATA states a figure "as at 10:25", later values add only the documented events that follow.
import { adulisSurcharge, formatEtb } from './money.ts'
import type { Santim } from './money.ts'
import { DEFAULT_SNAPSHOT, happenedBefore } from './time.ts'
import type { CalendarDate, Moment, Timestamp } from './time.ts'
import { ORDER_TIMELINES } from './types.ts'
import type { ClaimState, CourierAvailability, FulfilmentMode, OrderState, TrustLevel } from './types.ts'
import { SELLERS, VOLT_HOUSE_PREPUBLICATION } from './records/sellers.ts'
import type { SellerId } from './records/sellers.ts'
import { PRODUCTS, PRODUCT_IDS } from './records/products.ts'
import type { ProductId } from './records/products.ts'
import { SHOPPABLE_POSTS, SHOPPABLE_POST_IDS } from './records/posts.ts'
import type { ShoppablePostId } from './records/posts.ts'
import { BUYERS } from './records/buyers.ts'
import type { BuyerId } from './records/buyers.ts'
import { COURIERS, COURIER_RELATIONSHIPS } from './records/couriers.ts'
import type { CourierId, CourierRelationship } from './records/couriers.ts'
import { ORDERS, ORDER_IDS } from './records/orders.ts'
import type { OrderId, OrderLine } from './records/orders.ts'
import { REVIEWS, REVIEW_IDS } from './records/reviews.ts'
import type { ReviewId } from './records/reviews.ts'
import { CLAIMS } from './records/claims.ts'
import type { ClaimId } from './records/claims.ts'
import { CONVERSATIONS } from './records/conversations.ts'
import type { ConversationId, MessageRecord } from './records/conversations.ts'
import { HANDOFF_REVIEWS, MODERATION_CASES } from './records/operations.ts'
import type { ModerationId } from './records/operations.ts'
import { NOTIFICATIONS } from './records/notifications.ts'
import type { NotificationRecord } from './records/notifications.ts'
import { FOLLOWING_ORDER, FOR_YOU_ORDER, NEARBY_PROXIMITY } from './records/channels.ts'

const byId = <T extends string>(ids: readonly T[]) => [...ids].sort()

// ---------- Sellers ----------

/** The Seller's Trust level at `at` (the last change before it), or undefined before it was admitted. */
export function trustAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): TrustLevel | undefined {
  return SELLERS[seller].trustHistory.filter(change => happenedBefore(change.since, at)).pop()?.level
}

/** When the Seller joined Adulis: its first Trust entry. */
export function onAdulisSince(seller: SellerId): CalendarDate {
  return SELLERS[seller].trustHistory[0].since
}

/** The Seller's Courier compensation per delivery at `at`; it is also its Courier Delivery charge (specification §52). */
export function courierCompensationAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): Santim | undefined {
  const terms = SELLERS[seller].courierCompensation
  return terms && happenedBefore(terms.from, at) ? terms.amount : undefined
}

export interface FulfilmentOption {
  readonly mode: FulfilmentMode
  readonly charge: Santim
  readonly place?: string
  readonly hours?: string
  readonly coverage?: string
}

/** The Seller's fulfilment options at `at`, in the order Buyer Collection, Seller Delivery, Courier Delivery. */
export function fulfilmentOptionsAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): FulfilmentOption[] {
  const s = SELLERS[seller]
  const options: FulfilmentOption[] = []
  if (s.buyerCollection) options.push({ mode: 'Buyer Collection', charge: 0, place: s.buyerCollection.place, hours: s.buyerCollection.hours })
  if (s.sellerDelivery) options.push({ mode: 'Seller Delivery', charge: s.sellerDelivery.charge, coverage: s.sellerDelivery.coverage })
  const courier = courierCompensationAt(seller, at)
  if (courier !== undefined) options.push({ mode: 'Courier Delivery', charge: courier })
  return options
}

/** Completed Orders at `at`: DEMO_DATA's 10:25 total plus each of the Seller's Orders completed since. */
export function sellerCompletedOrdersAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): number | undefined {
  const base = SELLERS[seller].totals?.completedOrders
  return base === undefined ? undefined : base + ORDER_IDS.filter(id => ORDERS[id].seller === seller && completedAfterSnapshot(id, at)).length
}

/** Seller Service at `at`: the 10:25 rating count plus Reviews written since; the rounded average stays the same. */
export function sellerServiceAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): { average: number; ratings: number } | undefined {
  const base = SELLERS[seller].totals?.sellerService
  return base && { average: base.average, ratings: base.ratings + REVIEW_IDS.filter(id => ORDERS[REVIEWS[id].order].seller === seller && writtenAfterSnapshot(id, at)).length }
}

/** The Seller's Products that exist at `at`, in ID order. */
export function sellerProductsAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  return byId(PRODUCT_IDS.filter(id => PRODUCTS[id].seller === seller && productExistsAt(id, at)))
}

/** The Seller's Shoppable Posts that exist at `at` (Drafts included), in ID order. */
export function sellerPostsAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return byId(SHOPPABLE_POST_IDS.filter(id => SHOPPABLE_POSTS[id].seller === seller && happenedBefore(SHOPPABLE_POSTS[id].created, at)))
}

/** The Volt House Pre-publication Setup Snapshot's cards, with their details composed from the records. */
export function prepublicationCards(): { card: string; state: string; detail: string }[] {
  const seller = SELLERS[VOLT_HOUSE_PREPUBLICATION.seller]
  const at = VOLT_HOUSE_PREPUBLICATION.replay
  return VOLT_HOUSE_PREPUBLICATION.cards.map(card => {
    let detail = card.detail ?? ''
    if (card.card === 'Social-commerce eligibility') detail = `${seller.handle} on ${(seller.socialAccounts ?? []).join(' and ')}, with social account control verified`
    if (card.card === 'Store setup') detail = `Store profile, handle ${seller.handle} and the ${seller.buyerCollection?.place ?? seller.area} location`
    if (card.card === 'Fulfilment setup') detail = fulfilmentOptionsAt(VOLT_HOUSE_PREPUBLICATION.seller, at).map(o => (o.charge ? `${o.mode} (${formatEtb(o.charge)})` : `${o.mode} (free)`)).join(' and ') + (courierCompensationAt(VOLT_HOUSE_PREPUBLICATION.seller, at) === undefined ? '; no Courier yet' : '')
    if (card.product) detail = `${card.product} ${PRODUCTS[card.product].name} is a complete draft, ready to publish`
    return { card: card.card, state: card.state, detail }
  })
}

// ---------- Products ----------

export function productExistsAt(product: ProductId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return happenedBefore(PRODUCTS[product].created, at)
}

/** Product Quality at `at`: the 10:25 count plus Reviews written since; null when the Product has no ratings yet. */
export function productQualityAt(product: ProductId, at: Moment = DEFAULT_SNAPSHOT): { average: number; ratings: number } | null | undefined {
  const base = PRODUCTS[product].quality
  if (!base) return base
  return { average: base.average, ratings: base.ratings + REVIEW_IDS.filter(id => writtenAfterSnapshot(id, at) && REVIEWS[id].productQuality.some(q => q.product === product)).length }
}

// ---------- Shoppable Posts and Buyer Home channels ----------

export function isPublishedAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  const p = SHOPPABLE_POSTS[post]
  return p.publication === 'Published' && happenedBefore(p.created, at)
}

/** The moderation case that has restricted the post by `at`, if any. */
export function restrictionAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): ModerationId | undefined {
  return (Object.keys(MODERATION_CASES) as ModerationId[]).find(id => MODERATION_CASES[id].post === post && happenedBefore(MODERATION_CASES[id].action.at, at))
}

/** Published and not restricted or removed. */
export function isPubliclyEligibleAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return isPublishedAt(post, at) && !restrictionAt(post, at)
}

/** At least one tagged Product exists and isn't out of stock (rule 1.8). */
export function hasAvailableTagAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return SHOPPABLE_POSTS[post].tags.some(p => productExistsAt(p, at) && PRODUCTS[p].availability !== 'Out of Stock')
}

/** For You eligibility (rules 1.7–1.8, 2.1): published, not restricted, with at least one available tagged Product. */
export function isForYouEligibleAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return isPubliclyEligibleAt(post, at) && hasAvailableTagAt(post, at)
}

/** Seller Console Home › Shoppable Posts needing action (specification §29): published, tagged, no tagged Product available. */
export function postsNeedingAttentionAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return sellerPostsAt(seller, at).filter(id => isPublishedAt(id, at) && SHOPPABLE_POSTS[id].tags.length > 0 && !hasAvailableTagAt(id, at))
}

export function forYouAt(at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return FOR_YOU_ORDER.filter(id => isForYouEligibleAt(id, at))
}

export function followingAt(buyer: BuyerId, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  const follows: readonly SellerId[] = BUYERS[buyer].follows ?? []
  return FOLLOWING_ORDER.filter(id => follows.includes(SHOPPABLE_POSTS[id].seller) && isPubliclyEligibleAt(id, at))
}

/** Nearby for a discovery area: Sellers in demo proximity order, each one's eligible posts with an available Product. */
export function nearbyAt(area: string, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return (NEARBY_PROXIMITY[area] ?? []).flatMap(seller => sellerPostsAt(seller, at).filter(id => isPubliclyEligibleAt(id, at) && hasAvailableTagAt(id, at)))
}

/** The Sellers Buyers can see: the primary showcase Sellers (Nile Loom is operations-only). */
export function buyerVisibleSellers(): SellerId[] {
  return (Object.keys(SELLERS) as SellerId[]).filter(id => SELLERS[id].showcase)
}

/** The Products Buyers can see at `at`, in ID order. */
export function buyerVisibleProductsAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  return buyerVisibleSellers().flatMap(seller => sellerProductsAt(seller, at))
}

/** The Shoppable Posts Buyers can see at `at` (published, not restricted), in ID order. */
export function buyerVisiblePostsAt(at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return buyerVisibleSellers().flatMap(seller => sellerPostsAt(seller, at).filter(id => isPubliclyEligibleAt(id, at)))
}

/** Discounts (rule 2.11): Products with an active discount, largest discount first, then the larger ETB saving. */
export function discountsAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  const saving = (id: ProductId) => PRODUCTS[id].price - (PRODUCTS[id].discount?.price ?? PRODUCTS[id].price)
  return byId(PRODUCT_IDS.filter(id => PRODUCTS[id].discount?.status === 'Active' && productExistsAt(id, at)))
    .sort((a, b) => (PRODUCTS[b].discount?.percent ?? 0) - (PRODUCTS[a].discount?.percent ?? 0) || saving(b) - saving(a))
}

/** Locally Made (rules 2.12–2.13): marked Products, the available ones in ID order, then those out of stock. */
export function locallyMadeAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  const marked = byId(PRODUCT_IDS.filter(id => PRODUCTS[id].locallyMade && productExistsAt(id, at)))
  return [...marked.filter(id => PRODUCTS[id].availability !== 'Out of Stock'), ...marked.filter(id => PRODUCTS[id].availability === 'Out of Stock')]
}

// ---------- Orders ----------

export interface OrderTotals {
  readonly products: Santim
  readonly delivery: Santim
  readonly surcharge: Santim
  readonly total: Santim
}

/** Products subtotal at the Products' regular prices, the Seller's delivery charge, the 0.5% surcharge and the total. */
export function orderTotals(order: OrderId): OrderTotals {
  const o = ORDERS[order]
  const products = o.lines.reduce((sum, line) => sum + PRODUCTS[line.product].price * line.quantity, 0)
  const delivery = fulfilmentOptionsAt(o.seller, { at: paidAt(order) }).find(option => option.mode === o.fulfilment)?.charge
  if (delivery === undefined) throw new Error(`${order}: ${SELLERS[o.seller].name} offers no ${o.fulfilment}`)
  const surcharge = adulisSurcharge(products)
  return { products, delivery, surcharge, total: products + delivery + surcharge }
}

/** When the Order was Paid: the provider/backend confirmation of its successful payment attempt. */
export function paidAt(order: OrderId): Timestamp {
  const paid = ORDERS[order].history[0]
  if (paid.state !== 'Paid' || !paid.at) throw new Error(`${order} has no Paid time`)
  return paid.at
}

/** The time the Order reached `state`, when DEMO_DATA records one. */
export function stateTime(order: OrderId, state: OrderState): Timestamp | undefined {
  return ORDERS[order].history.find(entry => entry.state === state)?.at
}

/**
 * The Order's state just before `at`, or null when it hadn't been paid yet. A state without a recorded time counts as
 * passed once a later timed state is reached.
 */
export function orderStateAt(order: OrderId, at: Moment = DEFAULT_SNAPSHOT): OrderState | null {
  let state: OrderState | null = null
  for (const entry of ORDERS[order].history) if (entry.at && happenedBefore(entry.at, at)) state = entry.state
  return state
}

/** The Order's mode-specific timeline (rules 4.4–4.6), with each state's recorded time where there is one. */
export function orderTimeline(order: OrderId): { state: OrderState; at?: Timestamp }[] {
  return ORDER_TIMELINES[ORDERS[order].fulfilment].map(state => ({ state, at: stateTime(order, state) }))
}

/** Payment attempts with their references, PAY-<order number>-<attempt> (rule 5.9: all belong to this Order). */
export function paymentAttempts(order: OrderId): { ref: string; status: 'Paid' | 'Failed'; at: Timestamp; failure?: 'transient' }[] {
  const number = order.slice('ADU-'.length)
  return ORDERS[order].payments.map((attempt, i) => {
    const at = attempt.status === 'Paid' ? paidAt(order) : attempt.at
    if (!at) throw new Error(`${order}: payment attempt ${i + 1} has no time`)
    return { ref: `PAY-${number}-${String(i + 1).padStart(2, '0')}`, status: attempt.status, at, failure: attempt.failure }
  })
}

/** The reference of the successful payment attempt. */
export function paymentReference(order: OrderId): string {
  const paid = paymentAttempts(order).find(attempt => attempt.status === 'Paid')
  if (!paid) throw new Error(`${order} has no successful payment attempt`)
  return paid.ref
}

/** 'M, Natural': the line's chosen options. */
export function lineOptions(line: OrderLine): string {
  return line.options.join(', ')
}

/** The Buyer's or Seller's Orders that exist (have been paid) at `at`, in ID order. */
export function ordersAt(filter: { buyer?: BuyerId; seller?: SellerId }, at: Moment = DEFAULT_SNAPSHOT): OrderId[] {
  return byId(ORDER_IDS.filter(id => (!filter.buyer || ORDERS[id].buyer === filter.buyer) && (!filter.seller || ORDERS[id].seller === filter.seller) && orderStateAt(id, at) !== null))
}

function completedAfterSnapshot(order: OrderId, at: Moment): boolean {
  const done = stateTime(order, 'Completed')
  return !!done && !happenedBefore(done, DEFAULT_SNAPSHOT) && happenedBefore(done, at)
}

// ---------- Couriers ----------

const ACTIVE_DELIVERY: readonly OrderState[] = ['Courier Assigned', 'Pickup Verified', 'Out for Delivery', 'Delivery Handoff']

/**
 * The Courier's accepted, uncompleted delivery at `at` (rule 6.3). An Order whose failed handoff was escalated to
 * Handoff Manual Review isn't an active delivery (Bereket M. has none on 2 October while HMR-1001 is open).
 */
export function activeDeliveryAt(courier: CourierId, at: Moment = DEFAULT_SNAPSHOT): OrderId | undefined {
  const escalated = new Set(Object.values(HANDOFF_REVIEWS).filter(r => happenedBefore(r.escalated.at, at)).map(r => r.order))
  return ORDER_IDS.find(id => ORDERS[id].courier === courier && !escalated.has(id) && ACTIVE_DELIVERY.includes(orderStateAt(id, at) as OrderState))
}

/** The other delivery that stopped the Courier accepting this Order's offer when it was made (rule 6.3), if any. */
export function offerBlockedBy(order: OrderId): OrderId | undefined {
  const offer = ORDERS[order].offer
  if (!offer) return undefined
  const other = activeDeliveryAt(offer.courier, { at: offer.offered })
  return other !== order ? other : undefined
}

export function courierAvailabilityAt(courier: CourierId, at: Moment = DEFAULT_SNAPSHOT): CourierAvailability {
  return activeDeliveryAt(courier, at) ? 'Busy' : COURIERS[courier].availability
}

export function courierRelationship(seller: SellerId, courier: CourierId): CourierRelationship | undefined {
  return COURIER_RELATIONSHIPS.find(r => r.seller === seller && r.courier === courier)
}

/** 'Approved', 'Application pending', or null when there is no relationship yet at `at`. */
export function relationshipStatusAt(relationship: CourierRelationship, at: Moment = DEFAULT_SNAPSHOT): 'Approved' | 'Application pending' | null {
  if (happenedBefore(relationship.approved, at)) return 'Approved'
  return relationship.applied && happenedBefore(relationship.applied, at) ? 'Application pending' : null
}

/** Completed for this Seller (rule 7.1): the 10:25 figure plus this Seller's Orders the Courier completed since. */
export function completedForSellerAt(courier: CourierId, seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): number {
  const base = courierRelationship(seller, courier)?.completedAt1025 ?? 0
  return base + ORDER_IDS.filter(id => ORDERS[id].courier === courier && ORDERS[id].seller === seller && completedAfterSnapshot(id, at)).length
}

/** Total completed deliveries across Sellers (rule 7.2): the 10:25 total plus the Courier's Orders completed since. */
export function totalCompletedAt(courier: CourierId, at: Moment = DEFAULT_SNAPSHOT): number {
  return COURIERS[courier].totalCompletedAt1025 + ORDER_IDS.filter(id => ORDERS[id].courier === courier && completedAfterSnapshot(id, at)).length
}

/** The Courier's completed deliveries, most recent first. */
export function courierHistoryAt(courier: CourierId, at: Moment = DEFAULT_SNAPSHOT): OrderId[] {
  return ORDER_IDS.filter(id => ORDERS[id].courier === courier && orderStateAt(id, at) === 'Completed')
    .sort((a, b) => (stateTime(b, 'Completed') ?? '').localeCompare(stateTime(a, 'Completed') ?? ''))
}

/**
 * A Seller-facing Courier card (specification §23; rules 7.1–7.3): completed for this Seller first, the total across
 * Sellers second, and the Seller's own compensation. It names no other Seller.
 */
export function courierCardAt(seller: SellerId, courier: CourierId, at: Moment = DEFAULT_SNAPSHOT) {
  return {
    name: COURIERS[courier].name,
    availability: courierAvailabilityAt(courier, at),
    completedForSeller: completedForSellerAt(courier, seller, at),
    totalCompleted: totalCompletedAt(courier, at),
    compensation: courierCompensationAt(seller, at),
  }
}

// ---------- Reviews and Claims ----------

function writtenAfterSnapshot(review: ReviewId, at: Moment): boolean {
  const written = REVIEWS[review].written
  return !happenedBefore(written, DEFAULT_SNAPSHOT) && happenedBefore(written, at)
}

/** Reviews written before `at`, newest first. */
export function reviewsAt(filter: { seller?: SellerId; product?: ProductId }, at: Moment = DEFAULT_SNAPSHOT): ReviewId[] {
  const when = (id: ReviewId) => { const w = REVIEWS[id].written; return typeof w === 'string' ? w : w.at }
  return REVIEW_IDS.filter(id => happenedBefore(REVIEWS[id].written, at)
    && (!filter.seller || ORDERS[REVIEWS[id].order].seller === filter.seller)
    && (!filter.product || REVIEWS[id].productQuality.some(q => q.product === filter.product)))
    .sort((a, b) => when(b).localeCompare(when(a)))
}

/** The Claims raised on an Order. */
export function claimsForOrder(order: OrderId): ClaimId[] {
  return (Object.keys(CLAIMS) as ClaimId[]).filter(id => CLAIMS[id].order === order)
}

/** The Claim's state just before `at`, or null before it was submitted. */
export function claimStateAt(claim: ClaimId, at: Moment = DEFAULT_SNAPSHOT): ClaimState | null {
  return CLAIMS[claim].history.filter(entry => happenedBefore(entry.at, at)).pop()?.state ?? null
}

export function claimSubmitted(claim: ClaimId): Timestamp {
  return CLAIMS[claim].history[0].at
}

/** The Order line the Claim is about. */
export function claimLine(claim: ClaimId): OrderLine {
  const line = ORDERS[CLAIMS[claim].order].lines.find(l => l.product === CLAIMS[claim].product)
  if (!line) throw new Error(`${claim}: its Product isn't on its Order`)
  return line
}

// ---------- Conversations ----------

export function messagesAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT): MessageRecord[] {
  return CONVERSATIONS[conversation].messages.filter(message => happenedBefore(message.at, at))
}

/** The conversation's latest message is the Buyer's: it is waiting for the Seller's reply. */
export function awaitingSellerReplyAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return messagesAt(conversation, at).pop()?.from === 'buyer'
}

/**
 * Context selector options (rules 12.5–12.6): General / Seller, the Seller's Product Posts and publicly eligible
 * Shoppable Posts, and the Orders that belong to both this Buyer and this Seller.
 */
export function contextOptionsAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT) {
  const { buyer, seller } = CONVERSATIONS[conversation]
  return {
    products: sellerProductsAt(seller, at),
    posts: sellerPostsAt(seller, at).filter(id => isPubliclyEligibleAt(id, at)),
    orders: ordersAt({ buyer, seller }, at),
  }
}

// ---------- Notifications ----------

/** The notification's event time, or undefined for the two notifications DEMO_DATA records without one. */
export function notificationTime(n: NotificationRecord): Timestamp | undefined {
  const e = n.event
  switch (e.kind) {
    case 'Order Paid':
    case 'New Paid Order': return paidAt(e.order)
    case 'Order status': return stateTime(e.order, e.state)
    case 'Delivery action': return stateTime(e.order, 'Delivery Handoff')
    case 'Pickup verified': return stateTime(e.order, 'Pickup Verified')
    case 'Claim status': return CLAIMS[e.claim].history.find(entry => entry.state === e.state)?.at
    case 'Claim': return claimSubmitted(e.claim)
    case 'Buyer message': return CONVERSATIONS[e.conversation].messages[e.messageIndex].at
    case 'Delivery Offer':
    case 'Courier offer issue': return ORDERS[e.order].offer?.offered
    case 'Application approved': { const approved = courierRelationship(e.seller, e.courier)?.approved; return typeof approved === 'object' ? approved.at : approved }
    case 'Low stock':
    case 'Review reminder': return undefined
  }
}

/** The recipient's notifications at `at`: timed ones newest first, then the untimed ones. */
export function notificationsAt(recipient: NotificationRecord['recipient'], at: Moment = DEFAULT_SNAPSHOT): NotificationRecord[] {
  const mine = NOTIFICATIONS.filter(n => n.recipient === recipient)
  const timed = mine.filter(n => { const t = notificationTime(n); return t !== undefined && happenedBefore(t, at) })
    .sort((a, b) => (notificationTime(b) ?? '').localeCompare(notificationTime(a) ?? ''))
  return [...timed, ...mine.filter(n => notificationTime(n) === undefined)]
}
