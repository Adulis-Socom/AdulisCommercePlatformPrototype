// Seller engagement analytics (refinement PR-007): whether Scenes and Products lead to commerce, not only to social
// engagement. DEMO data for the prototype, over the Insights window (the 7 days to 10:25 on 2 October): no analytics
// pipeline. Figures DEMO_DATA already records are used as they are: a Scene's qualified views, Saves, hotspot taps,
// Product detail visits and Orders initiated are its Content performance impressions, saves, tag clicks, Product views
// and checkout starts, and a Product's views are its Product performance views. The other figures are the prototype
// fixtures below. Completed Orders are derived from the Orders, so they never contradict them.
import { DEFAULT_SNAPSHOT, happenedBefore, type Moment } from './time.ts'
import { CONTENT_PERFORMANCE_7D, INSIGHTS_7D, type SellerInsights } from './records/insights.ts'
import { PRODUCT_PERFORMANCE_7D, type ProductId } from './records/products.ts'
import { SHOPPABLE_POSTS, type ShoppablePostId } from './records/posts.ts'
import { ORDERS, ORDER_IDS, type OrderId } from './records/orders.ts'
import type { SellerId } from './records/sellers.ts'
import type { TrustLevel } from './types.ts'
import {
  isPrivateByAvailabilityAt, isPublishedAt, orderStateAt, paidAt, productQualityAt, restrictionAt, sellerCompletedOrdersAt,
  sellerProductsAt, sellerServiceAt, trustAt,
} from './derived.ts'

/** The analytics window: the Insights window, ending at the 10:25 snapshot. */
export const ANALYTICS_WINDOW = { from: '2026-09-25T10:25:00+03:00', to: DEFAULT_SNAPSHOT } as const

/** A Scene's prototype engagement beyond DEMO_DATA's Content performance (Seller-side only: Buyers never see Like counts). */
interface SceneFixture { readonly likes: number; readonly sharesInitiated: number; readonly exploreOpens: number; readonly sellerInquiries: number }

const SCENE_FIXTURES: Readonly<Partial<Record<ShoppablePostId, SceneFixture>>> = {
  'SHP-AA-001': { likes: 512, sharesInitiated: 64, exploreOpens: 690, sellerInquiries: 12 },
  'SHP-AA-002': { likes: 236, sharesInitiated: 27, exploreOpens: 310, sellerInquiries: 5 },
  'SHP-AA-003': { likes: 198, sharesInitiated: 22, exploreOpens: 254, sellerInquiries: 4 },
  'SHP-AA-004': { likes: 152, sharesInitiated: 18, exploreOpens: 96, sellerInquiries: 3 },
  'SHP-AA-005': { likes: 11, sharesInitiated: 0, exploreOpens: 18, sellerInquiries: 0 },
  'SHP-NG-001': { likes: 880, sharesInitiated: 140, exploreOpens: 1180, sellerInquiries: 18 },
  'SHP-NG-002': { likes: 700, sharesInitiated: 120, exploreOpens: 930, sellerInquiries: 15 },
  'SHP-NG-003': { likes: 410, sharesInitiated: 66, exploreOpens: 640, sellerInquiries: 11 },
  'SHP-NG-004': { likes: 350, sharesInitiated: 41, exploreOpens: 470, sellerInquiries: 6 },
  'SHP-VH-001': { likes: 96, sharesInitiated: 12, exploreOpens: 180, sellerInquiries: 4 },
  'SHP-VH-002': { likes: 71, sharesInitiated: 9, exploreOpens: 132, sellerInquiries: 3 },
  'SHP-VH-003': { likes: 48, sharesInitiated: 6, exploreOpens: 98, sellerInquiries: 4 },
  'SHP-VH-004': { likes: 35, sharesInitiated: 4, exploreOpens: 81, sellerInquiries: 2 },
  'SHP-VH-005': { likes: 26, sharesInitiated: 2, exploreOpens: 24, sellerInquiries: 1 },
}

/**
 * The modelled Orders attributed to a Scene. Flow C's ADU-24091 came from Autumn Layers. DEMO_DATA records no Scene for
 * the other modelled Orders in the window (ADU-24093 came from Search); the rest of each Scene's attributed Orders are
 * by Buyers who aren't modelled individually.
 */
const SCENE_ORDERS: Readonly<Partial<Record<ShoppablePostId, readonly OrderId[]>>> = { 'SHP-AA-001': ['ADU-24091'] }

/** A Product's prototype engagement beyond DEMO_DATA's Product performance, and its Paid Orders in the window. */
interface ProductFixture { readonly saves: number; readonly sellerInquiries: number; readonly ordersInitiated: number; readonly paidOrders: number }

// Paid Orders match DEMO_DATA: each Seller's sum is its Paid Orders (6, 18 and 3), and each is at most the units sold.
const PRODUCT_FIXTURES: Readonly<Partial<Record<ProductId, ProductFixture>>> = {
  'PRD-AA-001': { saves: 96, sellerInquiries: 14, ordersInitiated: 20, paidOrders: 4 },
  'PRD-AA-002': { saves: 54, sellerInquiries: 6, ordersInitiated: 7, paidOrders: 1 },
  'PRD-AA-003': { saves: 61, sellerInquiries: 5, ordersInitiated: 3, paidOrders: 0 },
  'PRD-AA-004': { saves: 38, sellerInquiries: 4, ordersInitiated: 4, paidOrders: 1 },
  'PRD-AA-005': { saves: 7, sellerInquiries: 2, ordersInitiated: 0, paidOrders: 0 },
  'PRD-NG-001': { saves: 160, sellerInquiries: 12, ordersInitiated: 18, paidOrders: 5 },
  'PRD-NG-002': { saves: 210, sellerInquiries: 16, ordersInitiated: 24, paidOrders: 8 },
  'PRD-NG-003': { saves: 88, sellerInquiries: 7, ordersInitiated: 9, paidOrders: 3 },
  'PRD-NG-004': { saves: 74, sellerInquiries: 9, ordersInitiated: 7, paidOrders: 2 },
  'PRD-NG-005': { saves: 41, sellerInquiries: 3, ordersInitiated: 2, paidOrders: 0 },
  'PRD-VH-001': { saves: 22, sellerInquiries: 5, ordersInitiated: 4, paidOrders: 1 },
  'PRD-VH-002': { saves: 3, sellerInquiries: 1, ordersInitiated: 0, paidOrders: 0 },
  'PRD-VH-003': { saves: 12, sellerInquiries: 3, ordersInitiated: 3, paidOrders: 1 },
  'PRD-VH-004': { saves: 15, sellerInquiries: 4, ordersInitiated: 4, paidOrders: 1 },
  'PRD-VH-005': { saves: 6, sellerInquiries: 1, ordersInitiated: 1, paidOrders: 0 },
}

/** The modelled Orders Paid in the window that weren't Completed by its end. */
function openAtWindowEnd(orders: readonly OrderId[]): number {
  const { from, to } = ANALYTICS_WINDOW
  return orders.filter(id => paidAt(id) >= from && happenedBefore(paidAt(id), to) && orderStateAt(id, to) !== 'Completed').length
}

/** A Scene's status now, as its Seller sees it: Private is a Buyer-visibility state, never a deletion. */
export type SceneStatus = 'Public' | 'No Products tagged' | 'Private' | 'Restricted' | 'Draft'

export function sceneStatusAt(scene: ShoppablePostId, at: Moment = DEFAULT_SNAPSHOT): SceneStatus {
  if (!isPublishedAt(scene, at)) return 'Draft'
  if (restrictionAt(scene, at)) return 'Restricted'
  if (isPrivateByAvailabilityAt(scene, at)) return 'Private'
  return SHOPPABLE_POSTS[scene].tags.length ? 'Public' : 'No Products tagged'
}

/**
 * A Scene's performance in the window. Commerce outcomes (Explore the Scene opens, Product detail visits, Seller
 * inquiries, Orders initiated and verified completed Orders) come first; Likes, Saves and Shares are supporting signals.
 * Product figures are absent where DEMO_DATA records none (a Scene with no purchasable tagged Product). Null where the
 * Scene has no figures (a Draft, or a Scene created after the window).
 */
export interface ScenePerformance {
  readonly scene: ShoppablePostId
  readonly qualifiedViews: number
  readonly likes: number
  readonly saves: number
  readonly sharesInitiated: number
  readonly exploreOpens: number
  readonly hotspotTaps?: number
  readonly productDetailVisits?: number
  readonly sellerInquiries: number
  readonly ordersInitiated?: number
  /** Attributed Paid Orders whose verified final Handoff completed them by the window's end. */
  readonly completedOrders?: number
}

export function scenePerformance(scene: ShoppablePostId): ScenePerformance | null {
  const content = CONTENT_PERFORMANCE_7D[scene]
  const fixture = SCENE_FIXTURES[scene]
  if (!content || !fixture) return null
  return {
    scene,
    qualifiedViews: content.impressions,
    likes: fixture.likes,
    saves: content.saves,
    sharesInitiated: fixture.sharesInitiated,
    exploreOpens: fixture.exploreOpens,
    hotspotTaps: content.tagClicks,
    productDetailVisits: content.productViews,
    sellerInquiries: fixture.sellerInquiries,
    ordersInitiated: content.checkoutStarts,
    completedOrders: content.paidOrdersInfluenced === undefined ? undefined : content.paidOrdersInfluenced - openAtWindowEnd(SCENE_ORDERS[scene] ?? []),
  }
}

/** A Product's performance in the window, and its Product rating (all time, at the story moment). */
export interface ProductPerformance {
  readonly product: ProductId
  readonly views: number
  readonly saves: number
  readonly sellerInquiries: number
  readonly ordersInitiated: number
  /** Paid Orders with the Product, less the modelled ones not Completed by the window's end. */
  readonly completedOrders: number
  /** Product Quality: its own rating, never blended with the Seller's. Null before its first rating. */
  readonly rating: { readonly average: number; readonly ratings: number } | null | undefined
}

export function productPerformance(product: ProductId, at: Moment = DEFAULT_SNAPSHOT): ProductPerformance | null {
  const views = PRODUCT_PERFORMANCE_7D[product]?.views
  const fixture = PRODUCT_FIXTURES[product]
  if (views === undefined || !fixture) return null
  const modelled = ORDER_IDS.filter(id => ORDERS[id].lines.some(line => line.product === product))
  return {
    product, views, saves: fixture.saves, sellerInquiries: fixture.sellerInquiries, ordersInitiated: fixture.ordersInitiated,
    completedOrders: fixture.paidOrders - openAtWindowEnd(modelled),
    rating: productQualityAt(product, at),
  }
}

/**
 * The Seller's reputation, its parts kept apart: Seller rating (Seller Service), each Product's rating, verified
 * completed Orders, the window's service-quality indicators, and the Trust level, which Adulis sets. No combined score.
 */
export interface SellerReputation {
  readonly sellerRating: { readonly average: number; readonly ratings: number } | undefined
  readonly productRatings: readonly { readonly product: ProductId; readonly rating: { readonly average: number; readonly ratings: number } | null | undefined }[]
  readonly completedOrders: number | undefined
  readonly serviceQuality: SellerInsights | undefined
  readonly trust: TrustLevel | undefined
}

export function sellerReputationAt(seller: SellerId, at: Moment = DEFAULT_SNAPSHOT): SellerReputation {
  return {
    sellerRating: sellerServiceAt(seller, at),
    productRatings: sellerProductsAt(seller, at).map(product => ({ product, rating: productQualityAt(product, at) })),
    completedOrders: sellerCompletedOrdersAt(seller, at),
    serviceQuality: INSIGHTS_7D[seller],
    trust: trustAt(seller, at),
  }
}
