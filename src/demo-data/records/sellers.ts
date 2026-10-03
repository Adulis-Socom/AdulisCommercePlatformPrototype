// Sellers, their teams and Settings states, Store map pins and the Volt House Pre-publication Setup Snapshot
// (docs/DEMO_DATA.md › Sellers, › Supporting operations-only Seller).
import { etb } from '../money.ts'
import type { Santim } from '../money.ts'
import type { CalendarDate, Moment } from '../time.ts'
import type { SellerCode, TrustLevel } from '../types.ts'
import type { ProductId } from './products.ts'

export interface SellerRecord {
  readonly code: SellerCode
  readonly name: string
  readonly handle: string
  readonly category: string
  /** One of the three primary showcase Sellers (false: the supporting operations-only Seller). */
  readonly showcase: boolean
  /** Neighbourhood in Addis Ababa. */
  readonly area: string
  /** Oldest first; the last entry is the current Trust level. The first entry is when the Seller joined Adulis. */
  readonly trustHistory: readonly { readonly level: TrustLevel; readonly since: CalendarDate }[]
  readonly followers?: number
  readonly bio?: string
  readonly storeOpen?: boolean
  /** Social accounts held under the Seller's handle. */
  readonly socialAccounts?: readonly string[]
  readonly buyerCollection?: { readonly place: string; readonly hours: string }
  readonly sellerDelivery?: { readonly charge: Santim; readonly coverage?: string }
  /** Current Courier compensation per delivery. It is also the Seller's Courier Delivery charge (specification §52). */
  readonly courierCompensation?: { readonly amount: Santim; readonly from?: Moment }
  /** Totals as at the 10:25 snapshot. */
  readonly totals?: { readonly completedOrders: number; readonly sellerService: { readonly average: number; readonly ratings: number } }
  /** Fictional neighbourhood-level pin, about 1 km precision; never a street address. */
  readonly mapPin?: { readonly lat: number; readonly lon: number }
  readonly paymentProvider?: { readonly status: 'Ready'; readonly confirmed?: CalendarDate }
}

const SELLER_RECORDS = {
  'SEL-ADDIS-ATELIER': {
    code: 'AA',
    name: 'Addis Atelier',
    handle: '@addisatelier',
    category: 'Fashion',
    showcase: true,
    area: 'Bole',
    trustHistory: [{ level: 'NEW', since: '2026-03' }, { level: 'ESTABLISHED', since: '2026-08-01' }],
    followers: 1240,
    bio: 'Contemporary clothing and accessories, designed and finished in Addis Ababa.',
    storeOpen: true,
    socialAccounts: ['Instagram', 'TikTok'],
    buyerCollection: { place: 'Bole studio', hours: 'Monday–Saturday 10:00–18:00' },
    courierCompensation: { amount: etb('180.00') },
    totals: { completedOrders: 128, sellerService: { average: 4.8, ratings: 96 } },
    mapPin: { lat: 8.99, lon: 38.79 },
    paymentProvider: { status: 'Ready' },
  },
  'SEL-NURA-GLOW': {
    code: 'NG',
    name: 'Nura Glow',
    handle: '@nuraglow',
    category: 'Cosmetics',
    showcase: true,
    area: 'Kazanchis',
    trustHistory: [{ level: 'NEW', since: '2026-01' }, { level: 'ESTABLISHED', since: '2026-04' }, { level: 'TRUSTED', since: '2026-08-15' }],
    followers: 3860,
    bio: 'Gentle skincare and colour for everyday routines.',
    storeOpen: true,
    socialAccounts: ['Instagram', 'TikTok'],
    sellerDelivery: { charge: etb('120.00'), coverage: 'within Addis Ababa' },
    courierCompensation: { amount: etb('150.00') },
    totals: { completedOrders: 412, sellerService: { average: 4.9, ratings: 262 } },
    mapPin: { lat: 9.02, lon: 38.77 },
    paymentProvider: { status: 'Ready' },
  },
  'SEL-VOLT-HOUSE': {
    code: 'VH',
    name: 'Volt House',
    handle: '@volthouse',
    category: 'Electronics',
    showcase: true,
    area: 'Megenagna',
    trustHistory: [{ level: 'NEW', since: '2026-09-10' }],
    followers: 210,
    bio: 'Everyday tech accessories, checked before they ship.',
    storeOpen: true,
    socialAccounts: ['Instagram', 'TikTok'],
    buyerCollection: { place: 'Megenagna shop', hours: 'Monday–Saturday 09:00–19:00' },
    sellerDelivery: { charge: etb('100.00') },
    // Volt House approves Daniel K. and sets this in Flow F; before that it has no approved Courier.
    courierCompensation: { amount: etb('200.00'), from: { at: '2026-10-02T16:30:00+03:00' } },
    totals: { completedOrders: 9, sellerService: { average: 4.6, ratings: 7 } },
    mapPin: { lat: 9.02, lon: 38.8 },
    paymentProvider: { status: 'Ready', confirmed: '2026-09-10' },
  },
  // Supporting operations-only Seller: Operator Console records only, never a Buyer-facing surface or guided flow.
  'SEL-NILE-LOOM': {
    code: 'NL',
    name: 'Nile Loom',
    handle: '@nileloom',
    category: 'Home textiles',
    showcase: false,
    area: 'Piassa',
    trustHistory: [{ level: 'NEW', since: '2026-02' }, { level: 'ESTABLISHED', since: '2026-05' }, { level: 'REBUILDING', since: '2026-09-16' }],
    courierCompensation: { amount: etb('160.00') },
  },
} satisfies Record<string, SellerRecord>

export type SellerId = keyof typeof SELLER_RECORDS
export const SELLERS: Readonly<Record<SellerId, SellerRecord>> = SELLER_RECORDS
export const SELLER_IDS = Object.keys(SELLER_RECORDS) as SellerId[]

export interface StaffRecord {
  readonly seller: SellerId
  readonly name: string
  /** Each Seller's Owner is its primary member. Roles use their default permission sets; none is itemised. */
  readonly role: 'Owner' | 'Operations'
}

const STAFF_RECORDS = {
  'STF-AA-01': { seller: 'SEL-ADDIS-ATELIER', name: 'Hiwot Haile', role: 'Owner' },
  'STF-AA-02': { seller: 'SEL-ADDIS-ATELIER', name: 'Abel Tadesse', role: 'Operations' },
  'STF-NG-01': { seller: 'SEL-NURA-GLOW', name: 'Nardos Ayele', role: 'Owner' },
  'STF-VH-01': { seller: 'SEL-VOLT-HOUSE', name: 'Ermias Bekele', role: 'Owner' },
} satisfies Record<string, StaffRecord>

export type StaffId = keyof typeof STAFF_RECORDS
export const STAFF: Readonly<Record<StaffId, StaffRecord>> = STAFF_RECORDS

/** Seller Console Settings › Sessions & Devices (specification §38). No Seller has an unrecognised device. */
export const SELLER_SESSIONS: readonly { readonly staff: StaffId; readonly surface: 'Seller Console' | 'Seller Companion'; readonly device: string }[] = [
  { staff: 'STF-AA-01', surface: 'Seller Console', device: 'desktop browser' },
  { staff: 'STF-AA-02', surface: 'Seller Companion', device: 'phone' },
  { staff: 'STF-NG-01', surface: 'Seller Console', device: 'desktop browser' },
  { staff: 'STF-NG-01', surface: 'Seller Companion', device: 'phone' },
  { staff: 'STF-VH-01', surface: 'Seller Console', device: 'desktop browser' },
  { staff: 'STF-VH-01', surface: 'Seller Companion', device: 'phone' },
]

/** Seller Console Settings states shared by the three primary Sellers (specification §38). */
export const SELLER_SETTINGS = {
  unrecognisedDevices: 0,
  security: 'Individual credentials for each member; no shared team password. No open security alerts.',
  ownershipTransferPending: false,
  notifications: 'Default: every Seller notification type on',
} as const

/**
 * Volt House's Seller Console Home before publication: the Publication Readiness Hub as it stood on
 * Wednesday 9 September 2026 at 16:00. A historical snapshot; Volt House's current state is published, NEW and open.
 */
export const VOLT_HOUSE_PREPUBLICATION: {
  readonly seller: SellerId
  readonly replay: Moment
  readonly cards: readonly { readonly card: string; readonly state: 'Complete' | 'Ready' | 'In progress'; readonly product?: ProductId; readonly detail?: string }[]
} = {
  seller: 'SEL-VOLT-HOUSE',
  replay: { at: '2026-09-09T16:00:00+03:00' },
  cards: [
    { card: 'Social-commerce eligibility', state: 'Complete' },
    { card: 'Store setup', state: 'Complete' },
    { card: 'Fulfilment setup', state: 'Complete' },
    { card: 'First Product readiness', state: 'Ready', product: 'PRD-VH-001' },
    { card: 'Payment-provider readiness', state: 'In progress', detail: "provider onboarding submitted, awaiting the provider's confirmation" },
  ],
}
