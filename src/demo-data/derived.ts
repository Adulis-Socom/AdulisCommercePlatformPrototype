// Values derived from the canonical records, at a point on the story timeline. Each rule follows an approved source;
// where DEMO_DATA states a figure "as at 10:25", later values add only the documented events that follow.
import { adulisSurcharge, formatEtb } from './money.ts'
import type { Santim } from './money.ts'
import { DEFAULT_SNAPSHOT, addMinutes, happenedBefore } from './time.ts'
import type { CalendarDate, Moment, Timestamp } from './time.ts'
import { ORDER_TIMELINES } from './types.ts'
import type { ClaimState, CourierAvailability, FulfilmentMode, OrderState, TrustLevel } from './types.ts'
import { SELLERS, SELLER_SESSIONS, STAFF, VOLT_HOUSE_PREPUBLICATION } from './records/sellers.ts'
import type { SellerId, StaffId } from './records/sellers.ts'
import { PRODUCTS, PRODUCT_IDS } from './records/products.ts'
import type { ProductId, ProductRecord } from './records/products.ts'
import { SHOPPABLE_POSTS, SHOPPABLE_POST_IDS } from './records/posts.ts'
import type { ShoppablePostId } from './records/posts.ts'
import { BUYERS } from './records/buyers.ts'
import type { BuyerId } from './records/buyers.ts'
import { COURIERS, COURIER_RELATIONSHIPS } from './records/couriers.ts'
import type { CourierId, CourierRelationship } from './records/couriers.ts'
import { ORDERS, ORDER_IDS } from './records/orders.ts'
import type { AuthorizedRecipient, OrderId, OrderLine } from './records/orders.ts'
import { REVIEWS, REVIEW_IDS } from './records/reviews.ts'
import type { ReviewId } from './records/reviews.ts'
import { CLAIMS } from './records/claims.ts'
import type { ClaimId } from './records/claims.ts'
import { CONVERSATIONS, CONVERSATION_IDS } from './records/conversations.ts'
import type { ConversationId, MessageContext, MessageRecord } from './records/conversations.ts'
import { AUDIT_LOG, HANDOFF_REVIEWS, MODERATION_CASES, SOLO_COVERAGE } from './records/operations.ts'
import type { ModerationId, SoloCoverageId } from './records/operations.ts'
import { NOTIFICATIONS } from './records/notifications.ts'
import type { NotificationRecord } from './records/notifications.ts'
import { FOLLOWING_ORDER, FOR_YOU_ORDER, NEARBY_PROXIMITY } from './records/channels.ts'

const byId = <T extends string>(ids: readonly T[]) => [...ids].sort()

// ---------- Sellers ----------

/** The three primary showcase Sellers, the only ones with Seller surfaces (Nile Loom is operations-only). */
export function showcaseSellers(): SellerId[] {
  return (Object.keys(SELLERS) as SellerId[]).filter(id => SELLERS[id].showcase)
}

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

/** The Seller's Pre-publication Setup Snapshot, a historical replay; DEMO_DATA records one for Volt House only. */
export function prepublicationSnapshotFor(seller: SellerId): typeof VOLT_HOUSE_PREPUBLICATION | undefined {
  return VOLT_HOUSE_PREPUBLICATION.seller === seller ? VOLT_HOUSE_PREPUBLICATION : undefined
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

/** The Product's active demo discount (DEMO_DATA › Discounts). It applies to new Orders only, never retroactively. */
export function activeDiscount(product: ProductId): ProductRecord['discount'] {
  const discount = PRODUCTS[product].discount
  return discount?.status === 'Active' ? discount : undefined
}

/** The price a new Order pays now: the active discounted price, otherwise the regular price. */
export function currentPrice(product: ProductId): Santim {
  return activeDiscount(product)?.price ?? PRODUCTS[product].price
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

/**
 * The tag-availability rule (rules 1.7–1.8): at least one of these Products exists at `at` and isn't out of stock. Low
 * Stock counts as available. Posts apply it to their tags; the Seller Console's post editor applies it to its selection.
 */
export function hasAvailableProductAt(products: readonly ProductId[], at: Moment = DEFAULT_SNAPSHOT): boolean {
  return products.some(p => productExistsAt(p, at) && PRODUCTS[p].availability !== 'Out of Stock')
}

/** At least one tagged Product exists and isn't out of stock (rule 1.8). */
export function hasAvailableTagAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return hasAvailableProductAt(SHOPPABLE_POSTS[post].tags, at)
}

/** For You eligibility (rules 1.7–1.8, 2.1): published, not restricted, with at least one available tagged Product. */
export function isForYouEligibleAt(post: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return isPubliclyEligibleAt(post, at) && hasAvailableTagAt(post, at)
}

/**
 * Seller Console Home › Shoppable Posts needing action (specification §29): published, tagged, no tagged Product
 * available. A restricted or removed post is a moderation problem, listed only under Moderation issues.
 */
export function postsNeedingAttentionAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return sellerPostsAt(seller, at).filter(id => isPubliclyEligibleAt(id, at) && SHOPPABLE_POSTS[id].tags.length > 0 && !hasAvailableTagAt(id, at))
}

/** Seller Console Home › Moderation issues (specification §29): the Seller's posts restricted by a moderation action. */
export function moderationIssuesAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return sellerPostsAt(seller, at).filter(id => restrictionAt(id, at))
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

/** The discovery areas a Buyer can choose for Nearby: those in the demo proximity metadata (rules 2.9, 2.14). */
export function discoveryAreas(): string[] {
  return Object.keys(NEARBY_PROXIMITY)
}

/** The Sellers Buyers can see: the primary showcase Sellers (Nile Loom is operations-only). */
export function buyerVisibleSellers(): SellerId[] {
  return showcaseSellers()
}

/** The Products Buyers can see at `at`, in ID order. */
export function buyerVisibleProductsAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  return buyerVisibleSellers().flatMap(seller => sellerProductsAt(seller, at))
}

/** Whether Buyers can see the Product at `at`, and so open its Product Post. It may still be out of stock (rule 1.8). */
export function isBuyerVisibleAt(product: ProductId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return buyerVisibleProductsAt(at).includes(product)
}

/** Whether a Buyer can buy the Product at `at`: Buyers can see it and it isn't out of stock (rule 3.11 revalidates a Cart with this). */
export function isPurchasableAt(product: ProductId, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return isBuyerVisibleAt(product, at) && PRODUCTS[product].availability !== 'Out of Stock'
}

/** The Shoppable Posts Buyers can see at `at` (published, not restricted), in ID order. */
export function buyerVisiblePostsAt(at: Moment = DEFAULT_SNAPSHOT): ShoppablePostId[] {
  return buyerVisibleSellers().flatMap(seller => sellerPostsAt(seller, at).filter(id => isPubliclyEligibleAt(id, at)))
}

/** Discounts (rule 2.11): Buyer-visible Products with an active discount, largest discount first, then the larger ETB saving. */
export function discountsAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  const saving = (id: ProductId) => PRODUCTS[id].price - currentPrice(id)
  return byId(buyerVisibleProductsAt(at).filter(id => activeDiscount(id)))
    .sort((a, b) => (activeDiscount(b)?.percent ?? 0) - (activeDiscount(a)?.percent ?? 0) || saving(b) - saving(a))
}

/** Locally Made (rules 2.12–2.13): Buyer-visible marked Products, the available ones in ID order, then those out of stock. */
export function locallyMadeAt(at: Moment = DEFAULT_SNAPSHOT): ProductId[] {
  const marked = byId(buyerVisibleProductsAt(at).filter(id => PRODUCTS[id].locallyMade))
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

/**
 * A Seller cart's Products subtotal at the prices a new Order pays now: an active discount applies (WO-006
 * requirement 10). Recorded Orders keep their own totals (orderTotals).
 */
export function productsSubtotal(lines: readonly OrderLine[]): Santim {
  return lines.reduce((sum, line) => sum + currentPrice(line.product) * line.quantity, 0)
}

/**
 * A new Seller Order's totals at Checkout: the Products at current prices, the Seller's own charge for the fulfilment
 * mode at `at`, and the 0.5% surcharge on the Products subtotal only, excluding the delivery charge (rules 5.6–5.8).
 */
export function checkoutTotalsAt(seller: SellerId, lines: readonly OrderLine[], mode: FulfilmentMode, at: Moment = DEFAULT_SNAPSHOT): OrderTotals {
  if (lines.some(line => PRODUCTS[line.product].seller !== seller)) throw new Error(`A ${SELLERS[seller].name} cart holds only its own Products`)
  const delivery = fulfilmentOptionsAt(seller, at).find(option => option.mode === mode)?.charge
  if (delivery === undefined) throw new Error(`${SELLERS[seller].name} offers no ${mode} at ${at.at}`)
  const products = productsSubtotal(lines)
  const surcharge = adulisSurcharge(products)
  return { products, delivery, surcharge, total: products + delivery + surcharge }
}

/** When the Order was Paid: the provider/backend confirmation of its successful payment attempt. */
export function paidAt(order: OrderId): Timestamp {
  const paid = ORDERS[order].history[0]
  if (paid.state !== 'Paid' || !paid.at) throw new Error(`${order} has no Paid time`)
  return paid.at
}

/** The fulfilment mode's Ready state: Ready for Courier, Ready for Seller Delivery or Ready for Collection. */
export function readyStateFor(mode: FulfilmentMode): OrderState {
  const ready = ORDER_TIMELINES[mode].find(state => state.startsWith('Ready'))
  if (!ready) throw new Error(`${mode} has no Ready state`)
  return ready
}

/**
 * The Order's preparation deadline, a fictional record-specific demo timestamp (never Adulis-wide policy), with the
 * Ready time once the Order reached its mode's Ready state by `at`, and whether that met the deadline.
 */
export function preparationAt(order: OrderId, at: Moment = DEFAULT_SNAPSHOT): { due: Timestamp; ready?: { state: OrderState; at: Timestamp }; met?: boolean } | undefined {
  const due = ORDERS[order].prepareBy
  if (!due) return undefined
  const state = readyStateFor(ORDERS[order].fulfilment)
  const readyAt = stateTime(order, state)
  if (!readyAt || !happenedBefore(readyAt, at)) return { due }
  return { due, ready: { state, at: readyAt }, met: !happenedBefore(due, { at: readyAt }) }
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

/**
 * Seller Console Home › Orders requiring preparation (specification §29): the Seller's Orders that are Paid or
 * Preparing at `at`. An Order needs preparation until it reaches its mode's Ready state.
 */
export function ordersRequiringPreparationAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): OrderId[] {
  return ordersAt({ seller }, at).filter(id => { const state = orderStateAt(id, at); return state === 'Paid' || state === 'Preparing' })
}

function completedAfterSnapshot(order: OrderId, at: Moment): boolean {
  const done = stateTime(order, 'Completed')
  return !!done && !happenedBefore(done, DEFAULT_SNAPSHOT) && happenedBefore(done, at)
}

// ---------- Final Handoff (rules 8.2, 8.7–8.10, 10.1–10.2, 11.1; specification §19) ----------

/** The fulfilment mode's final Handoff state: Delivery Handoff, or Collection Handoff for Buyer Collection. */
export function handoffStateFor(mode: FulfilmentMode): OrderState {
  return mode === 'Buyer Collection' ? 'Collection Handoff' : 'Delivery Handoff'
}

/**
 * Where an Order's final Handoff stands for its recipient:
 * - 'upcoming' before it can start;
 * - 'approaching' while the Courier or the Seller is on the way, or while the Order waits for collection;
 * - 'open' once the giver has opened the Handoff and displays the final QR;
 * - 'verified' once the recipient's verified scan, or the verification code, has completed the Order;
 * - 'manual-review' once a failed Handoff was escalated to Operator-only Manual Verification (rules 8.5–8.6).
 */
export type FinalHandoffPhase = 'upcoming' | 'approaching' | 'open' | 'verified' | 'manual-review'

export interface FinalHandoff {
  readonly order: OrderId
  readonly mode: FulfilmentMode
  /** The Order state of the final Handoff. */
  readonly state: OrderState
  /** The final QR the giver displays (rules 8.2, 8.8, 8.9). */
  readonly qr: 'Delivery QR' | 'Collection QR'
  /** The giver, who displays the final QR: the assigned Courier, or the Seller and the team member DEMO_DATA names. */
  readonly presenter: { readonly courier: CourierId } | { readonly seller: SellerId; readonly staff?: StaffId }
  /** The receiver, who scans it: the Order Buyer, or the authorized recipient once the Buyer has authorized one. */
  readonly recipient: { readonly buyer: BuyerId; readonly delegate?: AuthorizedRecipient }
  readonly phase: FinalHandoffPhase
  /** When the verified final Handoff completed the Order, and by which method DEMO_DATA records. */
  readonly verifiedAt?: Timestamp
  readonly method?: 'QR' | 'OTP fallback'
}

/**
 * The Order's final Handoff at `at`, from its state history (DEMO_DATA › Seller Orders). A final Handoff DEMO_DATA
 * doesn't time (ADU-24092's) is open at the moment of the scan that completes the Order, just before it.
 */
export function finalHandoffAt(order: OrderId, at: Moment = DEFAULT_SNAPSHOT): FinalHandoff {
  const o = ORDERS[order]
  const timeline = ORDER_TIMELINES[o.fulfilment]
  const state = handoffStateFor(o.fulfilment)
  const before = timeline[timeline.indexOf(state) - 1]
  const reached = orderStateAt(order, at)
  const completed = stateTime(order, 'Completed')
  const escalated = Object.values(HANDOFF_REVIEWS).some(r => r.order === order && happenedBefore(r.escalated.at, at))
  const phase: FinalHandoffPhase = reached === 'Completed' ? 'verified'
    : escalated ? 'manual-review'
    : reached === state || (reached === before && !stateTime(order, state) && completed === at.at) ? 'open'
    : reached === before ? 'approaching'
    : 'upcoming'
  const method = o.finalHandoff?.method
  return {
    order,
    mode: o.fulfilment,
    state,
    qr: o.fulfilment === 'Buyer Collection' ? 'Collection QR' : 'Delivery QR',
    presenter: o.fulfilment === 'Courier Delivery' && o.courier ? { courier: o.courier } : { seller: o.seller, staff: o.finalHandoff?.displayedBy },
    recipient: { buyer: o.buyer, delegate: o.recipient && happenedBefore(o.recipient.authorized, at) ? o.recipient : undefined },
    phase,
    verifiedAt: phase === 'verified' ? completed : undefined,
    method: phase === 'verified' && method !== 'Not verified' ? method : undefined,
  }
}

/**
 * Review eligibility (rule 11.1; specification §20): the Order Buyer's, from the verified final Handoff that completed
 * the Order, never an authorized recipient's (rule 10.2). It is the dataset's one Review Grant per Order; `review` is
 * the Review written for the Order by `at`, if any.
 */
export function reviewEligibilityAt(order: OrderId, at: Moment = DEFAULT_SNAPSHOT): { eligible: boolean; from?: Timestamp; buyer: BuyerId; review?: ReviewId } {
  const handoff = finalHandoffAt(order, at)
  const eligible = handoff.phase === 'verified' && handoff.method !== undefined
  return {
    eligible,
    from: eligible ? handoff.verifiedAt : undefined,
    buyer: ORDERS[order].buyer,
    review: REVIEW_IDS.find(id => REVIEWS[id].order === order && happenedBefore(REVIEWS[id].written, at)),
  }
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

/**
 * The Order's Delivery Offer as the Seller sees it at `at` (rules 6.10–6.11, 6.3, 6.8): sent after the Seller marked the
 * Order Ready for Courier, with the Seller's terms when it was made, then awaiting the Courier's acceptance until
 * DEMO_DATA's Courier Assigned time, which is that acceptance. While the Courier holds another accepted delivery, he
 * can't accept it yet (busy). Undefined before the offer is made.
 */
export function deliveryOfferAt(order: OrderId, at: Moment = DEFAULT_SNAPSHOT): { courier: CourierId; offered: Timestamp; compensation?: Santim; accepted?: Timestamp; busy: boolean } | undefined {
  const offer = ORDERS[order].offer
  if (!offer || !happenedBefore(offer.offered, at)) return undefined
  const assigned = stateTime(order, 'Courier Assigned')
  const accepted = assigned && happenedBefore(assigned, at) ? assigned : undefined
  const other = activeDeliveryAt(offer.courier, at)
  return { courier: offer.courier, offered: offer.offered, compensation: courierCompensationAt(ORDERS[order].seller, { at: offer.offered }), accepted, busy: !accepted && other !== undefined && other !== order }
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

/**
 * A Seller–Courier relationship's history by `at` (specification §36), oldest first: DEMO_DATA's dated events only,
 * the application where one is recorded and the approval.
 */
export function relationshipHistoryAt(relationship: CourierRelationship, at: Moment = DEFAULT_SNAPSHOT): { event: 'Application submitted' | 'Approved'; at: CalendarDate | Moment }[] {
  const history: { event: 'Application submitted' | 'Approved'; at: CalendarDate | Moment }[] = []
  if (relationship.applied && happenedBefore(relationship.applied, at)) history.push({ event: 'Application submitted', at: relationship.applied })
  if (happenedBefore(relationship.approved, at)) history.push({ event: 'Approved', at: relationship.approved })
  return history
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

/** The Buyer's conversation with the Seller, if they have one: never more than one per Buyer and Seller (rule 12.1). */
export function conversationBetween(buyer: BuyerId, seller: SellerId): ConversationId | undefined {
  return CONVERSATION_IDS.find(id => CONVERSATIONS[id].buyer === buyer && CONVERSATIONS[id].seller === seller)
}

export function messagesAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT): MessageRecord[] {
  return CONVERSATIONS[conversation].messages.filter(message => happenedBefore(message.at, at))
}

/** Time order for messages: by `at`, then by `sequence`, so DEMO_DATA's (which have none) come first when times tie. */
export function byMessageTime(a: MessageRecord, b: MessageRecord): number {
  return a.at.localeCompare(b.at) || (a.sequence ?? 0) - (b.sequence ?? 0)
}

/**
 * What a conversation shows on a surface: DEMO_DATA's messages so far, then the messages that surface sent in this
 * prototype session, in time order. Its newest message is the one the conversation's list row previews, body and
 * context alike. The session's messages are the surface's own; DEMO_DATA never changes.
 */
export function effectiveMessagesAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT, session: readonly MessageRecord[] = []): MessageRecord[] {
  return [...messagesAt(conversation, at), ...session].sort(byMessageTime)
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

/** General / Seller: a message about the Buyer–Seller relationship, naming no Product Post, Shoppable Post or Order. */
export const GENERAL_CONTEXT: MessageContext = { general: true }

/** The record a context names, as one value: 'general', or the record's kind and identifier ('order:…'). */
export function contextKey(context: MessageContext): string {
  if ('product' in context) return `product:${context.product}`
  if ('post' in context) return `post:${context.post}`
  if ('order' in context) return `order:${context.order}`
  return 'general'
}

export function sameContext(a: MessageContext, b: MessageContext): boolean {
  return contextKey(a) === contextKey(b)
}

/**
 * The context selector's choices for the conversation at `at`, in DEMO_DATA's order: General / Seller, then the Product
 * Posts, the Shoppable Posts and the Orders of contextOptionsAt (rules 12.5–12.6).
 */
export function contextChoicesAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT): MessageContext[] {
  const { products, posts, orders } = contextOptionsAt(conversation, at)
  return [GENERAL_CONTEXT, ...products.map(product => ({ product })), ...posts.map(post => ({ post })), ...orders.map(order => ({ order }))]
}

/** Whether the conversation's selector offers the context at `at`: another Seller's record or another Buyer's Order never is. */
export function isContextChoiceAt(conversation: ConversationId, context: MessageContext, at: Moment = DEFAULT_SNAPSHOT): boolean {
  return contextChoicesAt(conversation, at).some(choice => sameContext(choice, context))
}

/** What a context chip names, in the specification §22 form: the Product's name, '<title> Shoppable Post' or 'Order <reference>'. */
export function contextSubject(context: MessageContext): string {
  if ('product' in context) return PRODUCTS[context.product].name
  if ('post' in context) return `${SHOPPABLE_POSTS[context.post].title} Shoppable Post`
  if ('order' in context) return `Order ${context.order}`
  return 'General / Seller'
}

/** The team member with a session on the Seller's Console or Companion (DEMO_DATA › Seller Console Settings › Sessions & Devices). */
export function sessionStaffOn(seller: SellerId, surface: 'Seller Console' | 'Seller Companion'): StaffId | undefined {
  return SELLER_SESSIONS.find(session => session.surface === surface && STAFF[session.staff].seller === seller)?.staff
}

/**
 * The Seller team's documented reply due at `at`: the conversation's next message, when it is a reply and `at` is its own
 * time. A guided-flow step stops just before its first documented event (scenario/flows.ts), so this is the reply that
 * step's Seller sends, such as Flow L's at 11:48. None is due at any other moment, so sending one never moves the story
 * past another event.
 */
export function sellerReplyDueAt(conversation: ConversationId, at: Moment = DEFAULT_SNAPSHOT): MessageRecord | undefined {
  const next = CONVERSATIONS[conversation].messages.find(message => !happenedBefore(message.at, at))
  return next && next.from !== 'buyer' && next.at === at.at ? next : undefined
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

// ---------- Solo Coverage (rules 16.3–16.9; specification §49–§50) ----------

const SOLO_COVERAGE_IDS = Object.keys(SOLO_COVERAGE) as SoloCoverageId[]

/**
 * The Solo Coverage period active at `at`, if any: activated before it and not yet expired. At its expiry it becomes
 * inactive by itself (rule 16.6); nothing else ends or extends it in DEMO_DATA.
 */
export function soloCoverageAt(at: Moment = DEFAULT_SNAPSHOT): SoloCoverageId | undefined {
  return SOLO_COVERAGE_IDS.find(id => happenedBefore(SOLO_COVERAGE[id].activated, at) && !happenedBefore(SOLO_COVERAGE[id].expires, at))
}

/** The Solo Coverage periods that had expired by `at`, oldest first. */
export function soloCoverageEndedBefore(at: Moment = DEFAULT_SNAPSHOT): SoloCoverageId[] {
  return SOLO_COVERAGE_IDS.filter(id => happenedBefore(SOLO_COVERAGE[id].expires, at))
    .sort((a, b) => SOLO_COVERAGE[a].expires.localeCompare(SOLO_COVERAGE[b].expires))
}

/**
 * The current configured maximum continuous Solo Coverage duration, in days (rule 16.4; specification §50). It runs from
 * the original activation: neither the Custom expected return nor an extension may go past it, and an extension never
 * restarts it.
 */
export const SOLO_COVERAGE_MAX_DAYS = 28

/** The latest expected return for Solo Coverage activated at `activated`: the original activation plus the maximum. */
export function soloCoverageMaxEnd(activated: Timestamp): Timestamp {
  return addMinutes(activated, SOLO_COVERAGE_MAX_DAYS * 24 * 60)
}

/** The audit records written before `at`, oldest first. */
export function auditLogAt(at: Moment = DEFAULT_SNAPSHOT): typeof AUDIT_LOG {
  return AUDIT_LOG.filter(entry => happenedBefore(entry.at, at))
}

// ---------- Company Website Account Deletion (specification §12) ----------

/**
 * A short-lived capability for one Company Website Account Deletion flow. The Platform issues it when the deletion
 * verification (phone number, then the 6-digit code) succeeds, and only that flow uses it: its preview, its explicit
 * confirmation and its request. It is no Website login or session, Report Content doesn't accept it, it authorizes no
 * Buyer or Seller commerce action, and it ends with its flow. It isn't a record.
 */
export interface AccountDeletionCapability {
  readonly purpose: 'account-deletion'
  readonly account: BuyerId
}

/**
 * The deletion verification succeeded, so the Platform issues the capability. In the prototype it resolves
 * deterministically to the demo Buyer, Maya Tesfaye, with no Website Account record: the visitor never names an Account.
 */
export function issueAccountDeletionCapability(): AccountDeletionCapability {
  return { purpose: 'account-deletion', account: (Object.keys(BUYERS) as BuyerId[]).find(id => BUYERS[id].primary)! }
}

/** An active Order that blocks an Account's deletion, with its state. */
export interface DeletionBlocker {
  readonly order: OrderId
  readonly state: OrderState
}

/**
 * The Platform's preview of the capability's Account deletion at `at`: the Account's active Orders (paid, not yet
 * Completed) block it for now. They are the one blocker the approved documents name (WO-012 owner decision): at the
 * 10:25 snapshot Maya's are ADU-24091 and ADU-24093 (Paid) and ADU-24092 (Preparing). Null without a deletion
 * capability. The Company Website renders it and calculates no blocker itself.
 */
export function accountDeletionPreviewAt(capability: AccountDeletionCapability | null | undefined, at: Moment = DEFAULT_SNAPSHOT): { readonly account: BuyerId; readonly blockedBy: readonly DeletionBlocker[] } | null {
  if (capability?.purpose !== 'account-deletion') return null
  const blockedBy = ordersAt({ buyer: capability.account }, at)
    .map(order => ({ order, state: orderStateAt(order, at)! }))
    .filter(({ state }) => state !== 'Completed')
  return { account: capability.account, blockedBy }
}

/**
 * The Platform's result of an explicitly confirmed deletion request at `at`: "deletion requested" or, while the Account
 * has active Orders, "deletion requested, but currently blocked by active Orders". It deletes nothing and gives no
 * deletion date. Null, with nothing requested, without a deletion capability.
 */
export function requestAccountDeletionAt(capability: AccountDeletionCapability | null | undefined, at: Moment = DEFAULT_SNAPSHOT): { readonly account: BuyerId; readonly result: 'requested' | 'blocked'; readonly blockedBy: readonly DeletionBlocker[] } | null {
  const preview = accountDeletionPreviewAt(capability, at)
  return preview && { ...preview, result: preview.blockedBy.length ? 'blocked' : 'requested' }
}
