// Seller Orders, their payment attempts, state histories, deadlines, recipients and handoff evidence
// (docs/DEMO_DATA.md › Seller Orders). Every Order is Paid by payment-provider confirmation (rules 5.1–5.5).
// Totals are derived (derived.ts): the Products subtotal from the Products' regular prices (no recorded Order contains
// a discounted Product), the delivery charge from the Seller, and the 0.5% surcharge from the subtotal.
import type { Moment, Timestamp } from '../time.ts'
import type { FulfilmentMode, OrderState } from '../types.ts'
import type { BuyerId } from './buyers.ts'
import type { CourierId } from './couriers.ts'
import type { ProductId } from './products.ts'
import type { SellerId, StaffId } from './sellers.ts'

export interface OrderLine {
  readonly product: ProductId
  /** The chosen variant options, in the Product's variant order ('M', 'Natural'). */
  readonly options: readonly string[]
  readonly quantity: number
}

/** One state in the Order's fulfilment-mode timeline. A state without `at` happened but isn't timed in DEMO_DATA. */
export interface StateEntry {
  readonly state: OrderState
  readonly at?: Timestamp
  readonly by?: StaffId
}

/**
 * A payment attempt. Its reference is PAY-<order number>-<attempt>. The successful attempt's time is the Order's Paid
 * time; a failed attempt belongs to its Order and never creates another (rule 5.9).
 */
export interface PaymentAttempt {
  readonly status: 'Paid' | 'Failed'
  readonly at?: Timestamp
  readonly failure?: 'transient'
}

/** Someone the Buyer authorized to receive this Order's package only (rule 10.2). Not a Buyer. */
export interface AuthorizedRecipient {
  readonly name: string
  readonly relationship: string
  readonly phoneMasked: string
  readonly authorizedBy: BuyerId
  readonly authorized: Moment
}

/**
 * The Delivery Offer to the Courier. Its acceptance is the Order's Courier Assigned time. While the Courier holds
 * another accepted delivery, he can't accept it (rule 6.3); that is derived, not stored.
 */
export interface DeliveryOffer {
  readonly courier: CourierId
  readonly offered: Timestamp
}

export interface HandoffEvidence {
  readonly method: 'QR' | 'OTP fallback' | 'Not verified'
  /** Courier Delivery only (rule 9.6). */
  readonly location?: 'recorded' | 'unavailable'
  /** Seller team member who displayed the Delivery or Collection QR (Seller Delivery and Buyer Collection). */
  readonly displayedBy?: StaffId
  /** Who scanned, when it wasn't the Buyer. */
  readonly scannedBy?: 'authorized recipient'
  readonly note?: string
}

export interface OrderRecord {
  readonly buyer: BuyerId
  readonly seller: SellerId
  readonly lines: readonly OrderLine[]
  readonly fulfilment: FulfilmentMode
  readonly courier?: CourierId
  readonly offer?: DeliveryOffer
  readonly payments: readonly PaymentAttempt[]
  readonly history: readonly StateEntry[]
  /** Fictional record-specific preparation deadline; not Adulis-wide policy. */
  readonly prepareBy?: Timestamp
  readonly recipient?: AuthorizedRecipient
  readonly discoveredVia?: 'Search'
  readonly pickup?: HandoffEvidence
  readonly finalHandoff?: HandoffEvidence
}

const paidOnce: readonly PaymentAttempt[] = [{ status: 'Paid' }]

const ORDER_RECORDS = {
  'ADU-23864': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-NURA-GLOW', fulfilment: 'Courier Delivery', courier: 'COU-DANIEL-K',
    lines: [{ product: 'PRD-NG-003', options: ['150 ml'], quantity: 1 }, { product: 'PRD-NG-002', options: ['Rose'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-11T18:20:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Courier' }, { state: 'Courier Assigned' },
      { state: 'Pickup Verified', at: '2026-09-12T10:55:00+03:00' }, { state: 'Out for Delivery' }, { state: 'Delivery Handoff' },
      { state: 'Completed', at: '2026-09-12T11:40:00+03:00' },
    ],
    pickup: { method: 'QR', location: 'recorded' },
    finalHandoff: { method: 'QR', location: 'recorded' },
  },
  'ADU-23921': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-ADDIS-ATELIER', fulfilment: 'Courier Delivery', courier: 'COU-DANIEL-K',
    lines: [{ product: 'PRD-AA-003', options: ['Tan'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-18T08:50:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Courier' }, { state: 'Courier Assigned' },
      { state: 'Pickup Verified', at: '2026-09-19T11:20:00+03:00' }, { state: 'Out for Delivery' }, { state: 'Delivery Handoff' },
      { state: 'Completed', at: '2026-09-19T12:10:00+03:00' },
    ],
    pickup: { method: 'QR', location: 'recorded' },
    finalHandoff: { method: 'OTP fallback', location: 'recorded', note: "Maya's camera permission was off, so the delivery QR scan failed." },
  },
  'ADU-23952': {
    buyer: 'BUY-SAMUEL-ALEMU', seller: 'SEL-VOLT-HOUSE', fulfilment: 'Buyer Collection',
    lines: [{ product: 'PRD-VH-001', options: ['Black'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-22T12:40:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Collection', at: '2026-09-22T15:00:00+03:00' },
      { state: 'Collection Handoff' }, { state: 'Completed', at: '2026-09-22T17:30:00+03:00' },
    ],
    finalHandoff: { method: 'QR', displayedBy: 'STF-VH-01' },
  },
  'ADU-23978': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-ADDIS-ATELIER', fulfilment: 'Courier Delivery', courier: 'COU-DANIEL-K',
    lines: [{ product: 'PRD-AA-002', options: ['M', 'Sand'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-25T17:30:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Courier' }, { state: 'Courier Assigned' },
      { state: 'Pickup Verified', at: '2026-09-26T10:35:00+03:00' }, { state: 'Out for Delivery' }, { state: 'Delivery Handoff' },
      { state: 'Completed', at: '2026-09-26T11:20:00+03:00' },
    ],
    pickup: { method: 'QR' },
    finalHandoff: { method: 'QR', location: 'unavailable', note: 'The delivery location was unavailable, but the handoff remains verified (rule 9.5).' },
  },
  'ADU-24007': {
    buyer: 'BUY-SELAM-KEBEDE', seller: 'SEL-NURA-GLOW', fulfilment: 'Seller Delivery',
    lines: [{ product: 'PRD-NG-003', options: ['150 ml'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-27T11:00:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Seller Delivery', at: '2026-09-27T15:30:00+03:00' },
      { state: 'Out for Seller Delivery', at: '2026-09-28T10:30:00+03:00' }, { state: 'Delivery Handoff' }, { state: 'Completed', at: '2026-09-28T11:15:00+03:00' },
    ],
    finalHandoff: { method: 'QR', displayedBy: 'STF-NG-01' },
  },
  'ADU-24041': {
    buyer: 'BUY-SAMUEL-ALEMU', seller: 'SEL-ADDIS-ATELIER', fulfilment: 'Buyer Collection',
    lines: [{ product: 'PRD-AA-001', options: ['L', 'Olive'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-09-29T13:10:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Collection', at: '2026-09-30T11:00:00+03:00' },
      { state: 'Collection Handoff' }, { state: 'Completed', at: '2026-09-30T16:20:00+03:00' },
    ],
    finalHandoff: { method: 'QR', displayedBy: 'STF-AA-02' },
  },
  // Nile Loom's failed final handoff: HMR-1001 is open, so it stays at Delivery Handoff, unverified.
  'ADU-24074': {
    buyer: 'BUY-HANA-GIRMA', seller: 'SEL-NILE-LOOM', fulfilment: 'Courier Delivery', courier: 'COU-BEREKET-M',
    lines: [{ product: 'PRD-NL-001', options: ['Natural'], quantity: 1 }],
    offer: { courier: 'COU-BEREKET-M', offered: '2026-10-01T17:25:00+03:00' },
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-10-01T14:05:00+03:00' }, { state: 'Preparing' }, { state: 'Ready for Courier', at: '2026-10-01T17:20:00+03:00' },
      { state: 'Courier Assigned', at: '2026-10-01T17:28:00+03:00' }, { state: 'Pickup Verified', at: '2026-10-01T17:55:00+03:00' },
      { state: 'Out for Delivery', at: '2026-10-01T17:56:00+03:00' }, { state: 'Delivery Handoff', at: '2026-10-01T19:40:00+03:00' },
    ],
    pickup: { method: 'QR', location: 'recorded' },
    finalHandoff: { method: 'Not verified' },
  },
  // The specification's checkout example (Flows C, D, G and I).
  'ADU-24091': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-ADDIS-ATELIER', fulfilment: 'Courier Delivery', courier: 'COU-DANIEL-K',
    lines: [{ product: 'PRD-AA-001', options: ['M', 'Natural'], quantity: 1 }],
    offer: { courier: 'COU-DANIEL-K', offered: '2026-10-02T13:35:00+03:00' },
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-10-02T10:05:00+03:00' }, { state: 'Preparing', at: '2026-10-02T10:40:00+03:00', by: 'STF-AA-02' },
      { state: 'Ready for Courier', at: '2026-10-02T13:30:00+03:00' }, { state: 'Courier Assigned', at: '2026-10-02T13:37:00+03:00' },
      { state: 'Pickup Verified', at: '2026-10-02T14:14:00+03:00' }, { state: 'Out for Delivery', at: '2026-10-02T14:16:00+03:00' },
      { state: 'Delivery Handoff', at: '2026-10-02T14:48:00+03:00' }, { state: 'Completed', at: '2026-10-02T14:52:00+03:00' },
    ],
    prepareBy: '2026-10-02T16:00:00+03:00',
    pickup: { method: 'QR', location: 'recorded' },
    finalHandoff: { method: 'QR', location: 'recorded' },
  },
  // Flow D's second Seller Order; Flow H's delegated delivery. Nura Glow offers it to Daniel K. at 14:53, the first moment
  // he is Available after completing ADU-24091 at 14:52: a direct offer goes only to an Available Courier (rule 6.3;
  // refinement PR-008). DEMO_DATA's 13:50, while he was busy, is the pre-refinement timeline; PR-010 reconciles it.
  'ADU-24092': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-NURA-GLOW', fulfilment: 'Courier Delivery', courier: 'COU-DANIEL-K',
    lines: [{ product: 'PRD-NG-001', options: ['50 ml'], quantity: 1 }],
    offer: { courier: 'COU-DANIEL-K', offered: '2026-10-02T14:53:00+03:00' },
    payments: [{ status: 'Failed', at: '2026-10-02T10:06:00+03:00', failure: 'transient' }, { status: 'Paid' }],
    history: [
      { state: 'Paid', at: '2026-10-02T10:07:00+03:00' }, { state: 'Preparing', at: '2026-10-02T10:20:00+03:00' },
      { state: 'Ready for Courier', at: '2026-10-02T13:45:00+03:00' }, { state: 'Courier Assigned', at: '2026-10-02T14:58:00+03:00' },
      { state: 'Pickup Verified', at: '2026-10-02T15:24:00+03:00' }, { state: 'Out for Delivery', at: '2026-10-02T15:26:00+03:00' },
      { state: 'Delivery Handoff' }, { state: 'Completed', at: '2026-10-02T16:05:00+03:00' },
    ],
    prepareBy: '2026-10-02T16:00:00+03:00',
    recipient: { name: 'Liya Tesfaye', relationship: "Maya's sister", phoneMasked: '+251 9•• ••• •47', authorizedBy: 'BUY-MAYA-TESFAYE', authorized: { at: '2026-10-02T12:10:00+03:00' } },
    pickup: { method: 'QR', location: 'unavailable', note: 'The pickup location was unavailable, but the verification stands (rule 9.5).' },
    finalHandoff: { method: 'QR', location: 'recorded', scannedBy: 'authorized recipient' },
  },
  // Maya found the Phone Stand through Search; Volt House delivers it itself.
  'ADU-24093': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-VOLT-HOUSE', fulfilment: 'Seller Delivery',
    lines: [{ product: 'PRD-VH-003', options: ['Grey'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-10-02T10:15:00+03:00' }, { state: 'Preparing', at: '2026-10-02T11:30:00+03:00' },
      { state: 'Ready for Seller Delivery', at: '2026-10-02T16:00:00+03:00' }, { state: 'Out for Seller Delivery', at: '2026-10-02T16:40:00+03:00', by: 'STF-VH-01' },
      { state: 'Delivery Handoff', at: '2026-10-02T17:03:00+03:00', by: 'STF-VH-01' }, { state: 'Completed', at: '2026-10-02T17:05:00+03:00' },
    ],
    prepareBy: '2026-10-02T18:00:00+03:00',
    discoveredVia: 'Search',
    finalHandoff: { method: 'QR', displayedBy: 'STF-VH-01' },
  },
  // Maya's Buyer Collection Order (Flow M): at the Bole studio Abel T. displays the Collection QR and Maya scans it.
  'ADU-24094': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-ADDIS-ATELIER', fulfilment: 'Buyer Collection',
    lines: [{ product: 'PRD-AA-002', options: ['M', 'Charcoal'], quantity: 1 }],
    payments: paidOnce,
    history: [
      { state: 'Paid', at: '2026-10-02T17:30:00+03:00' }, { state: 'Preparing', at: '2026-10-02T17:40:00+03:00' },
      { state: 'Ready for Collection', at: '2026-10-02T17:50:00+03:00' }, { state: 'Collection Handoff', at: '2026-10-02T17:55:00+03:00', by: 'STF-AA-02' },
      { state: 'Completed', at: '2026-10-02T17:56:00+03:00' },
    ],
    finalHandoff: { method: 'QR', displayedBy: 'STF-AA-02' },
  },
} satisfies Record<string, OrderRecord>

export type OrderId = keyof typeof ORDER_RECORDS
export const ORDERS: Readonly<Record<OrderId, OrderRecord>> = ORDER_RECORDS
export const ORDER_IDS = Object.keys(ORDER_RECORDS) as OrderId[]
