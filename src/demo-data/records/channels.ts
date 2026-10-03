// Buyer Home channel data (docs/DEMO_DATA.md › Buyer Home channels). Each channel has its own source and a fixed demo
// order. The lists at a given time are derived (derived.ts) by filtering these orders with the channel's eligibility.
import type { ShoppablePostId } from './posts.ts'
import type { SellerId } from './sellers.ts'

/**
 * For You (rules 2.1, 1.7): SHP-AA-001 first (Flow C), then the eligible posts in turn by Seller, each Seller's in ID
 * order. SHP-VH-004 drops out when restricted at 11:05; SHP-AA-006 is added last when published at 12:30.
 */
export const FOR_YOU_ORDER: readonly ShoppablePostId[] = [
  'SHP-AA-001', 'SHP-NG-001', 'SHP-VH-001', 'SHP-AA-002', 'SHP-NG-002', 'SHP-VH-002', 'SHP-AA-003', 'SHP-NG-003', 'SHP-VH-003', 'SHP-NG-004', 'SHP-VH-004',
  'SHP-AA-006',
]

/**
 * Following (rules 2.7–2.8): published, publicly eligible posts of the Sellers Maya follows, in turn by Seller, each
 * Seller's in ID order, not limited by For You eligibility. After Flow E, SHP-AA-006 and then SHP-AA-007 appear first.
 */
export const FOLLOWING_ORDER: readonly ShoppablePostId[] = [
  'SHP-AA-006', 'SHP-AA-007',
  'SHP-AA-001', 'SHP-NG-001', 'SHP-AA-002', 'SHP-NG-002', 'SHP-AA-003', 'SHP-NG-003', 'SHP-AA-004', 'SHP-NG-004', 'SHP-AA-005',
]

/** Nearby (rules 2.9–2.10): explicit demo proximity order for each discovery area, not a measured distance. */
export const NEARBY_PROXIMITY: Readonly<Record<string, readonly SellerId[]>> = {
  Kazanchis: ['SEL-NURA-GLOW', 'SEL-VOLT-HOUSE', 'SEL-ADDIS-ATELIER'],
  Bole: ['SEL-ADDIS-ATELIER', 'SEL-NURA-GLOW', 'SEL-VOLT-HOUSE'],
  Megenagna: ['SEL-VOLT-HOUSE', 'SEL-NURA-GLOW', 'SEL-ADDIS-ATELIER'],
}
