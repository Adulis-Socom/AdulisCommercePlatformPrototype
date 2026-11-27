// The ACTIVE dataset's base records (DEMO-001/002). Legacy mode returns the seeded records untouched (the same objects, the same order), so
// `?dataset=legacy` is exactly the old app. In marketplace mode the marketplace records come FIRST and the seeded ones stay reachable by id
// (the historical Orders, Claims, Couriers and Operator fixtures still name them) but never enter an id list, so no ordinary surface lists a
// legacy Seller, Product, Scene or Buyer. Everything that used to import records/sellers|products|posts|buyers|conversations|channels
// for these maps reads them from here.
import { isLegacy } from '../marketplace/registry.ts'
import { MARKETPLACE as M } from '../marketplace/adapt.ts'
import { SELLERS as L_SELLERS, SELLER_IDS as L_SELLER_IDS, STAFF as L_STAFF, SELLER_SESSIONS as L_SESSIONS } from './records/sellers.ts'
import type { SellerId, SellerRecord, StaffId, StaffRecord } from './records/sellers.ts'
import { PRODUCTS as L_PRODUCTS, PRODUCT_IDS as L_PRODUCT_IDS } from './records/products.ts'
import type { ProductId, ProductRecord } from './records/products.ts'
import { SHOPPABLE_POSTS as L_POSTS, SHOPPABLE_POST_IDS as L_POST_IDS } from './records/posts.ts'
import type { ShoppablePostId, ShoppablePostRecord } from './records/posts.ts'
import { BUYERS as L_BUYERS, BUYER_IDS as L_BUYER_IDS, COLLECTIONS as L_COLLECTIONS, COLLECTION_IDS as L_COLLECTION_IDS } from './records/buyers.ts'
import type { BuyerId, BuyerRecord, CollectionId, CollectionRecord } from './records/buyers.ts'
import { CONVERSATIONS as L_CONVERSATIONS, CONVERSATION_IDS as L_CONVERSATION_IDS } from './records/conversations.ts'
import type { ConversationId, ConversationRecord } from './records/conversations.ts'
import { FOR_YOU_ORDER as L_FOR_YOU, FOLLOWING_ORDER as L_FOLLOWING, NEARBY_PROXIMITY as L_NEARBY } from './records/channels.ts'
import type { SellerStory } from './stories.ts'
import type { ProductExtras } from '../marketplace/adapt.ts'

// Shortcut: marketplace ids are cast to the seeded id unions here, once; widen the unions to string when the legacy dataset is retired.
const merge = <R>(mp: Record<string, unknown>, legacy: R) => (isLegacy ? legacy : { ...mp, ...legacy }) as R
const list = <T>(mp: readonly string[], legacy: readonly T[]) => (isLegacy ? legacy : mp) as unknown as T[]

export const SELLERS: Readonly<Record<SellerId, SellerRecord>> = merge(M.sellers, L_SELLERS)
export const SELLER_IDS = list<SellerId>(M.sellerIds, L_SELLER_IDS)
export const PRODUCTS: Readonly<Record<ProductId, ProductRecord>> = merge(M.products, L_PRODUCTS)
export const PRODUCT_IDS = list<ProductId>(M.productIds, L_PRODUCT_IDS)
export const SHOPPABLE_POSTS: Readonly<Record<ShoppablePostId, ShoppablePostRecord>> = merge(M.posts, L_POSTS)
export const SHOPPABLE_POST_IDS = list<ShoppablePostId>(M.postIds, L_POST_IDS)
export const BUYERS: Readonly<Record<BuyerId, BuyerRecord>> = merge(M.buyers, L_BUYERS)
export const BUYER_IDS = list<BuyerId>(M.buyerIds, L_BUYER_IDS)
export const COLLECTIONS: Readonly<Record<CollectionId, CollectionRecord>> = merge(M.collections, L_COLLECTIONS)
export const COLLECTION_IDS = list<CollectionId>(Object.keys(M.collections), L_COLLECTION_IDS)
export const CONVERSATIONS: Readonly<Record<ConversationId, ConversationRecord>> = merge(M.conversations, L_CONVERSATIONS)
export const CONVERSATION_IDS = (isLegacy ? L_CONVERSATION_IDS : [...Object.keys(M.conversations), ...L_CONVERSATION_IDS]) as ConversationId[]
export const STAFF: Readonly<Record<StaffId, StaffRecord>> = merge(M.staff, L_STAFF)
export const SELLER_SESSIONS = (isLegacy ? L_SESSIONS : M.sessions) as typeof L_SESSIONS
export const FOR_YOU_ORDER = (isLegacy ? L_FOR_YOU : M.forYouOrder) as readonly ShoppablePostId[]
export const FOLLOWING_ORDER = (isLegacy ? L_FOLLOWING : M.followingOrder) as readonly ShoppablePostId[]
export const NEARBY_PROXIMITY = (isLegacy ? L_NEARBY : M.nearby) as Readonly<Record<string, readonly SellerId[]>>
/** Marketplace Stories (empty in legacy mode, which keeps its own prototype Stories). */
export const MARKETPLACE_STORIES: readonly SellerStory[] = isLegacy ? [] : M.stories
/** Marketplace-only live-layer extras (taxonomy id, exact Variant rows) read through liveProductDetails(); empty in legacy mode. */
export const BASE_EXTRAS: Readonly<Record<string, ProductExtras>> = isLegacy ? {} : M.extras
