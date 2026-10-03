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

export const SURFACE_DEFAULTS: {
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
} = {
  buyer: 'BUY-MAYA-TESFAYE',
  seller: 'SEL-ADDIS-ATELIER',
  courier: 'COU-DANIEL-K',
  product: 'PRD-AA-001',
  post: 'SHP-AA-001',
  order: 'ADU-24091',
  claim: 'CLM-1002',
  conversation: 'CNV-MAYA-AA',
}

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
