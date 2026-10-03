// Seller Insights and content performance over the 7 days to 10:25 on 2 October (docs/DEMO_DATA.md › Insights,
// specification §34). Screens show these figures and don't compute their own. Counts include Orders by Buyers who
// aren't modelled individually; Product-level figures are PRODUCT_PERFORMANCE_7D (records/products.ts).
import { etb } from '../money.ts'
import type { Santim } from '../money.ts'
import type { ShoppablePostId } from './posts.ts'
import type { SellerId } from './sellers.ts'

export interface SellerInsights {
  readonly paidOrders: number
  readonly completedOrders: number
  /** Product value of Paid Orders. */
  readonly gmv: Santim
  readonly productViews: number
  /** The sum of the post impressions below. */
  readonly qualifiedImpressions: number
  /** Tag clicks divided by the impressions of posts with purchasable tags, as DEMO_DATA shows it (one decimal). */
  readonly tagCtrPercent: number
  readonly storefrontVisits: number
  readonly claims: number
  readonly cancellationRatePercent: number
  readonly responseReliabilityPercent: number
  readonly fulfilmentReliabilityPercent: number
}

export const INSIGHTS_7D: Readonly<Partial<Record<SellerId, SellerInsights>>> = {
  'SEL-ADDIS-ATELIER': { paidOrders: 6, completedOrders: 5, gmv: etb('14,650.00'), productViews: 1180, qualifiedImpressions: 10050, tagCtrPercent: 5.1, storefrontVisits: 640, claims: 1, cancellationRatePercent: 0, responseReliabilityPercent: 96, fulfilmentReliabilityPercent: 98 },
  'SEL-NURA-GLOW': { paidOrders: 18, completedOrders: 17, gmv: etb('21,840.00'), productViews: 2960, qualifiedImpressions: 18400, tagCtrPercent: 6.2, storefrontVisits: 1120, claims: 0, cancellationRatePercent: 0, responseReliabilityPercent: 98, fulfilmentReliabilityPercent: 99 },
  'SEL-VOLT-HOUSE': { paidOrders: 3, completedOrders: 2, gmv: etb('5,900.00'), productViews: 420, qualifiedImpressions: 3940, tagCtrPercent: 5.3, storefrontVisits: 180, claims: 0, cancellationRatePercent: 0, responseReliabilityPercent: 92, fulfilmentReliabilityPercent: 100 },
}

/** A post's 7-day content performance. Posts with no tagged Products have impressions and saves only. */
export interface ContentPerformance {
  readonly impressions: number
  readonly saves: number
  readonly tagClicks?: number
  readonly productViews?: number
  readonly checkoutStarts?: number
  readonly paidOrdersInfluenced?: number
}

/** SHP-NG-005 is a Draft and has no figures. ADU-24093 came from Search, so no post counts it as influenced. */
export const CONTENT_PERFORMANCE_7D: Readonly<Partial<Record<ShoppablePostId, ContentPerformance>>> = {
  'SHP-AA-001': { impressions: 4210, saves: 318, tagClicks: 262, productViews: 214, checkoutStarts: 19, paidOrdersInfluenced: 4 },
  'SHP-AA-002': { impressions: 2480, saves: 141, tagClicks: 96, productViews: 77, checkoutStarts: 6, paidOrdersInfluenced: 1 },
  'SHP-AA-003': { impressions: 2010, saves: 120, tagClicks: 88, productViews: 70, checkoutStarts: 5, paidOrdersInfluenced: 1 },
  'SHP-AA-004': { impressions: 1140, saves: 64 },
  'SHP-AA-005': { impressions: 210, saves: 9 },
  'SHP-NG-001': { impressions: 6400, saves: 520, tagClicks: 410, productViews: 340, checkoutStarts: 22, paidOrdersInfluenced: 6 },
  'SHP-NG-002': { impressions: 5100, saves: 410, tagClicks: 330, productViews: 270, checkoutStarts: 18, paidOrdersInfluenced: 5 },
  'SHP-NG-003': { impressions: 3900, saves: 260, tagClicks: 240, productViews: 200, checkoutStarts: 9, paidOrdersInfluenced: 2 },
  'SHP-NG-004': { impressions: 3000, saves: 190, tagClicks: 160, productViews: 130, checkoutStarts: 6, paidOrdersInfluenced: 2 },
  'SHP-VH-001': { impressions: 1250, saves: 64, tagClicks: 70, productViews: 55, checkoutStarts: 4, paidOrdersInfluenced: 1 },
  'SHP-VH-002': { impressions: 980, saves: 41, tagClicks: 52, productViews: 44, checkoutStarts: 3, paidOrdersInfluenced: 1 },
  'SHP-VH-003': { impressions: 760, saves: 30, tagClicks: 38, productViews: 30, checkoutStarts: 2, paidOrdersInfluenced: 0 },
  'SHP-VH-004': { impressions: 640, saves: 22, tagClicks: 31, productViews: 25, checkoutStarts: 1, paidOrdersInfluenced: 0 },
  'SHP-VH-005': { impressions: 310, saves: 8 },
}
