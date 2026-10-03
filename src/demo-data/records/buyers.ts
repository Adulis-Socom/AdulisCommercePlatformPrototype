// Buyers, Maya's Collections and the guest state (docs/DEMO_DATA.md › Buyer, › Secondary Buyers).
// Liya Tesfaye isn't a Buyer: she is the authorized recipient recorded on ADU-24092 (records/orders.ts).
import type { ProductId } from './products.ts'
import type { ShoppablePostId } from './posts.ts'
import type { SellerId } from './sellers.ts'

export interface BuyerRecord {
  readonly name: string
  /** Maya is the primary Buyer; the secondary Buyers support Seller and Operator surfaces only. */
  readonly primary: boolean
  /** Delivery area in Addis Ababa, where DEMO_DATA records one. */
  readonly deliveryArea?: string
  /** The address detail the assigned Courier (or, for Seller Delivery, the Seller) receives. */
  readonly deliveryDetail?: string
  readonly phoneMasked?: string
  readonly collectsInPerson?: boolean
  readonly signedIn?: boolean
  readonly follows?: readonly SellerId[]
  /** Saved discovery area for Nearby. */
  readonly discoveryArea?: string
  readonly recentSearches?: readonly string[]
  /** The zero-result example query. */
  readonly zeroResultQuery?: string
}

const BUYER_RECORDS = {
  'BUY-MAYA-TESFAYE': {
    name: 'Maya Tesfaye', primary: true, signedIn: true,
    deliveryArea: 'Kazanchis', deliveryDetail: 'Building 7, Apartment 12', phoneMasked: '+251 9•• ••• •12',
    follows: ['SEL-ADDIS-ATELIER', 'SEL-NURA-GLOW'],
    discoveryArea: 'Kazanchis', recentSearches: ['linen', 'lip tint'], zeroResultQuery: 'tripod',
  },
  'BUY-SAMUEL-ALEMU': { name: 'Samuel Alemu', primary: false, collectsInPerson: true },
  'BUY-SELAM-KEBEDE': { name: 'Selam Kebede', primary: false, deliveryArea: 'Gerji' },
  'BUY-HANA-GIRMA': { name: 'Hana Girma', primary: false, deliveryArea: 'Arat Kilo' },
} satisfies Record<string, BuyerRecord>

export type BuyerId = keyof typeof BUYER_RECORDS
export const BUYERS: Readonly<Record<BuyerId, BuyerRecord>> = BUYER_RECORDS
export const BUYER_IDS = Object.keys(BUYER_RECORDS) as BuyerId[]

export type CollectionItem = { readonly product: ProductId } | { readonly post: ShoppablePostId }

export interface CollectionRecord {
  readonly owner: BuyerId
  readonly name: string
  /** The default Collection. Every Collection is private (rule 2.6). */
  readonly isDefault?: boolean
  readonly items: readonly CollectionItem[]
}

const COLLECTION_RECORDS = {
  'COL-MAYA-SAVED': { owner: 'BUY-MAYA-TESFAYE', name: 'Saved', isDefault: true, items: [{ product: 'PRD-NG-004' }, { product: 'PRD-VH-002' }, { post: 'SHP-VH-001' }] },
  'COL-MAYA-AUTUMN': { owner: 'BUY-MAYA-TESFAYE', name: 'Autumn wardrobe', items: [{ product: 'PRD-AA-001' }, { product: 'PRD-AA-002' }, { post: 'SHP-AA-001' }] },
  'COL-MAYA-SKINCARE': { owner: 'BUY-MAYA-TESFAYE', name: 'Skincare routine', items: [{ product: 'PRD-NG-001' }, { product: 'PRD-NG-003' }, { post: 'SHP-NG-001' }] },
} satisfies Record<string, CollectionRecord>

export type CollectionId = keyof typeof COLLECTION_RECORDS
export const COLLECTIONS: Readonly<Record<CollectionId, CollectionRecord>> = COLLECTION_RECORDS
export const COLLECTION_IDS = Object.keys(COLLECTION_RECORDS) as CollectionId[]

/**
 * The prototype-only guest state (rules 3.1–3.12). A guest has no Buyer data. For You, Discounts and Locally Made use
 * the Guest/default discovery ranking: the same records in the same order as Maya's lists. A guest's temporary Cart
 * is transient session state, never a canonical record.
 */
export const GUEST_STATE = {
  orders: 0,
  collections: 0,
  conversations: 0,
  notifications: 0,
  savedDiscoveryArea: null,
  followingRequiresSignIn: true,
  reportRequiresSignIn: true,
  otpDigits: 6,
} as const
