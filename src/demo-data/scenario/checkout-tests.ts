// Checkout test runs (WO-006 requirements 12–24): deterministic, session-only Checkout scenarios on DEMO_DATA's
// Products, variants, prices and Sellers. This is prototype orchestration, not business data: a run's carts, Seller
// Orders and payment attempts live only in the Buyer app's session state and never become DEMO_DATA records, stock,
// totals or metrics (rule 3.12). Nothing here states an amount: Checkout computes every total with the module's money
// rules (checkoutTotalsAt in derived.ts).
import type { FulfilmentMode } from '../types.ts'
import type { OrderLine } from '../records/orders.ts'
import type { ProductId } from '../records/products.ts'
import type { SellerId } from '../records/sellers.ts'

export type CheckoutTestId = 'A' | 'B2' | 'B3' | 'B3-ORDER-2-FAILS' | 'AVAILABILITY-RACE'

/** A test payment attempt's outcome (requirement 15). */
export type TestPaymentOutcome = 'SUCCESS' | 'FAILED'

export interface CheckoutTestOrder {
  /** The scenario-scoped transient reference of a prototype test Order: never an `ADU-` number (requirement 14). */
  readonly ref: string
  readonly seller: SellerId
  /**
   * The fulfilment mode the scenario checks out with (requirements 16–18, 21). Checkout preselects it; the Buyer may
   * still choose another of the Seller's own options, as Scenario A's Buyer Collection test does.
   */
  readonly mode: FulfilmentMode
  /** Each payment attempt's outcome, in order. A retry is another attempt on the same Seller Order (rule 5.9). */
  readonly attempts: readonly TestPaymentOutcome[]
}

export interface CheckoutTest {
  readonly id: CheckoutTestId
  /** The scenario's name, as the prototype-only control and the test-run banner show it. */
  readonly label: string
  /** The Buyer's carts when the run loads: Seller carts in Seller order, each Seller's lines together (rules 4.1–4.3). */
  readonly cart: readonly OrderLine[]
  /** One Seller Order per Seller, in payment order. A Seller cart without one isn't paid in this run. */
  readonly orders: readonly CheckoutTestOrder[]
  /**
   * Requirement 24: the Product the run makes unavailable once it is already in the Cart, when the checkout of its
   * Seller cart starts. The change is the run's own transient state, never Inventory truth, and a reset removes it.
   */
  readonly race?: ProductId
}

const AA: SellerId = 'SEL-ADDIS-ATELIER'
const NG: SellerId = 'SEL-NURA-GLOW'
const VH: SellerId = 'SEL-VOLT-HOUSE'

// The approved canonical variants (requirements 16–18).
const LINEN_OVERSHIRT: OrderLine = { product: 'PRD-AA-001', options: ['M', 'Natural'], quantity: 1 }
const WIDE_LEG_TROUSERS: OrderLine = { product: 'PRD-AA-002', options: ['M', 'Charcoal'], quantity: 1 }
const FACE_CREAM: OrderLine = { product: 'PRD-NG-001', options: ['50 ml'], quantity: 1 }
const LIP_TINT: OrderLine = { product: 'PRD-NG-002', options: ['Rose'], quantity: 1 }
const PHONE_STAND: OrderLine = { product: 'PRD-VH-003', options: ['Grey'], quantity: 1 }

const B3_ORDERS = (nuraGlow: readonly TestPaymentOutcome[]): readonly CheckoutTestOrder[] => [
  { ref: 'TEST-B3-01', seller: AA, mode: 'Courier Delivery', attempts: ['SUCCESS'] },
  { ref: 'TEST-B3-02', seller: NG, mode: 'Seller Delivery', attempts: nuraGlow },
  { ref: 'TEST-B3-03', seller: VH, mode: 'Seller Delivery', attempts: ['SUCCESS'] },
]

/** The runs the prototype-only Checkout test control loads (requirement 23), and requirement 24's availability race. */
export const CHECKOUT_TESTS: readonly CheckoutTest[] = [
  {
    id: 'A',
    label: 'Scenario A · One Seller',
    cart: [LINEN_OVERSHIRT, WIDE_LEG_TROUSERS],
    orders: [{ ref: 'TEST-A-01', seller: AA, mode: 'Courier Delivery', attempts: ['SUCCESS'] }],
  },
  {
    id: 'B2',
    label: 'Scenario B2 · Two Sellers',
    cart: [LINEN_OVERSHIRT, FACE_CREAM, LIP_TINT],
    orders: [
      { ref: 'TEST-B2-01', seller: AA, mode: 'Courier Delivery', attempts: ['SUCCESS'] },
      { ref: 'TEST-B2-02', seller: NG, mode: 'Seller Delivery', attempts: ['SUCCESS'] },
    ],
  },
  {
    id: 'B3',
    label: 'Scenario B3 · All payments succeed',
    cart: [LINEN_OVERSHIRT, FACE_CREAM, LIP_TINT, PHONE_STAND],
    orders: B3_ORDERS(['SUCCESS']),
  },
  {
    id: 'B3-ORDER-2-FAILS',
    label: 'Scenario B3 · Order 2 payment fails',
    cart: [LINEN_OVERSHIRT, FACE_CREAM, LIP_TINT, PHONE_STAND],
    orders: B3_ORDERS(['FAILED', 'SUCCESS']),
  },
  {
    // The Buyer adds the Lip Tint from its Product Post while it is purchasable; the other Seller cart stays valid.
    id: 'AVAILABILITY-RACE',
    label: 'Availability race',
    cart: [LINEN_OVERSHIRT, FACE_CREAM],
    orders: [],
    race: 'PRD-NG-002',
  },
]

/** A test payment attempt's reference: TESTPAY-, its Order's scenario and number, then the attempt (requirement 15). */
export function testPaymentRef(order: string, attempt: number): string {
  if (!order.startsWith('TEST-')) throw new Error(`Not a test Seller Order: ${order}`)
  return `TESTPAY-${order.slice('TEST-'.length)}-${String(attempt).padStart(2, '0')}`
}
