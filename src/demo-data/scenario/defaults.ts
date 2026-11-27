// Surface defaults: the canonical records each surface opens on outside a guided flow, so no screen hard-codes an
// identifier. They are DEMO_DATA's primary story records (Story at a glance). Prototype configuration, not business data.
import type { BuyerId } from '../records/buyers.ts'
import type { ClaimId } from '../records/claims.ts'
import type { ConversationId } from '../records/conversations.ts'
import type { CourierId } from '../records/couriers.ts'
import type { OrderId } from '../records/orders.ts'
import type { ShoppablePostId } from '../records/posts.ts'
import type { ProductId } from '../records/products.ts'
import type { SellerId } from '../records/sellers.ts'
import { isLegacy } from '../../marketplace/registry.ts'
import { MARKETPLACE } from '../../marketplace/adapt.ts'

type SurfaceDefaults = {
  /** The signed-in Buyer of the Buyer app. */
  readonly buyer: BuyerId
  /** The Seller of the Seller Console, the Seller Companion and the Storefront. */
  readonly seller: SellerId
  readonly courier: CourierId
  readonly product: ProductId
  readonly post: ShoppablePostId
  readonly order: OrderId
  readonly claim: ClaimId
  readonly conversation: ConversationId
}

const LEGACY_DEFAULTS: SurfaceDefaults = {
  buyer: 'BUY-MAYA-TESFAYE',
  seller: 'SEL-ADDIS-ATELIER',
  courier: 'COU-DANIEL-K',
  product: 'PRD-AA-001',
  post: 'SHP-AA-001',
  order: 'ADU-24091',
  claim: 'CLM-1002',
  conversation: 'CNV-MAYA-AA',
}

// Marketplace dataset (DEMO-001): Maya (BY-01) is the primary Buyer, DS-01 the primary Seller, and the Product and Scene are real DS-01 records.
// The order, claim and courier defaults stay the historical fixtures: those surfaces belong to later work orders (Orders, Courier, Reviews).
// Shortcut: ids are cast to the seeded unions at this boundary.
const MARKETPLACE_DEFAULTS: SurfaceDefaults = {
  ...LEGACY_DEFAULTS,
  buyer: 'BY-01' as BuyerId, seller: 'DS-01' as SellerId,
  product: MARKETPLACE.firstProduct('DS-01') as ProductId, post: MARKETPLACE.firstScene('DS-01') as ShoppablePostId,
  conversation: 'BY-01-DS-01-CHAT' as ConversationId,
}

/** The canonical records each surface opens on: the active dataset's primary story. */
export const SURFACE_DEFAULTS: SurfaceDefaults = isLegacy ? LEGACY_DEFAULTS : MARKETPLACE_DEFAULTS

/**
 * The Buyer app's Seller carts. Carts are transient session state (rule 3.12); these hold DEMO_DATA's Flow D carts,
 * whose lines become ADU-24091 (Addis Atelier, the checkout example) and ADU-24092 (Nura Glow).
 */
export const DEMO_CARTS: readonly OrderId[] = ['ADU-24091', 'ADU-24092']

/**
 * The Products the Foundations type scale names beyond the surface defaults, so the reference board hard-codes no
 * identifier. The other reference boards read the surface defaults and the records related to them.
 */
export const REFERENCE_SAMPLES: {
  /** Type scale › Title: a Product name. */
  readonly titleProduct: ProductId
  /** Type scale › Body: a Product name and its description. */
  readonly bodyProduct: ProductId
} = {
  titleProduct: 'PRD-NG-001',
  bodyProduct: 'PRD-AA-002',
}
