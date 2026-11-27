// FIX-001: the effective Product and Seller records. DEMO_DATA stays immutable; the Seller workspace publishes what a Seller
// changed (name, price, stock, media, store identity) here, and LIVE_PRODUCTS / LIVE_SELLERS return the seeded record with
// those changes applied. Public surfaces (Buyer, Storefront, Companion) and the derived visibility rules read these, so one
// edit reaches all of them. Historical Orders, Claims and Reviews keep reading the seeded records.
import type { Santim } from './money.ts'
import { PRODUCTS, PRODUCT_IDS } from './records/products.ts'
import type { ProductId, ProductRecord, VariantGroup } from './records/products.ts'
import { SHOPPABLE_POSTS, SHOPPABLE_POST_IDS } from './records/posts.ts'
import type { ShoppablePostId, ShoppablePostRecord } from './records/posts.ts'
import { SELLERS } from './records/sellers.ts'
import type { SellerId, SellerRecord } from './records/sellers.ts'
import type { Availability } from './types.ts'

export interface ProductOverlay {
  published: boolean; name: string; description: string
  /** Regular price in santim; null while no valid price is set (the seeded price then stays, never 0). */
  price: Santim | null
  stock: number; availability: Availability; locallyMade: boolean
  variants?: readonly VariantGroup[]; attributes?: readonly string[]; photos: readonly string[]
}
export interface SellerOverlay { name?: string; handle?: string; bio?: string; area?: string; collectionPlace?: string }

/**
 * FIX-004: Products and Scenes a Seller authored are first-class records here, exactly like the seeded ones, so every Buyer surface
 * (feed, Scene explorer, Product page, Search, Collections, Cart, chat) reads one shape. Ids are cast to the seeded id types at this
 * boundary only (shortcut: the ProductId/ShoppablePostId unions stay seeded-only in the type system; upgrade when the marketplace
 * dataset replaces the seeds).
 */
export interface AuthoredProductLive {
  record: ProductRecord; photos: readonly string[]; category: string | null
  /** Exact Variants the Seller listed (price and stock each); null when the Product has no options. Combinations not listed here are NOT offered. */
  rows: readonly { values: Record<string, string>; label: string; price: number | null; stock: number }[] | null
  details: readonly { label: string; value: string }[]
}
export interface AuthoredSceneLive { record: ShoppablePostRecord; image: string | null; alt: string; spots: readonly { product: string; x: number; y: number; n: number }[]; revision: number }
export interface AuthoredLive { products: Readonly<Record<string, AuthoredProductLive>>; scenes: Readonly<Record<string, AuthoredSceneLive>> }
const NONE: AuthoredLive = { products: {}, scenes: {} }
let authored: AuthoredLive = NONE
/** Live id lists: seeded ids, then authored ones. Mutated in place so existing readers of the exported arrays always see current ids. */
export const LIVE_PRODUCT_IDS: ProductId[] = [...PRODUCT_IDS]
export const LIVE_POST_IDS: ShoppablePostId[] = [...SHOPPABLE_POST_IDS]
/** Authored Scene ids only, newest edit first: they lead For You. */
export const authoredPostIds = (): ShoppablePostId[] => Object.keys(authored.scenes).sort((a, b) => authored.scenes[b].revision - authored.scenes[a].revision) as ShoppablePostId[]
export const liveProductDetails = (id: string) => authored.products[id]
export const liveSceneMedia = (id: string) => authored.scenes[id]

let products: Readonly<Record<string, ProductOverlay>> = {}
let sellers: Readonly<Record<string, SellerOverlay>> = {}
const productCache = new Map<string, ProductRecord>()
const sellerCache = new Map<string, SellerRecord>()

/** Called by the workspace provider whenever its state changes. */
export function setLiveOverlay(p: Readonly<Record<string, ProductOverlay>>, s: Readonly<Record<string, SellerOverlay>>, a: AuthoredLive = NONE) {
  if (p === products && s === sellers && a === authored) return
  products = p; sellers = s; authored = a; productCache.clear(); sellerCache.clear()
  LIVE_PRODUCT_IDS.length = 0; LIVE_PRODUCT_IDS.push(...PRODUCT_IDS, ...(Object.keys(a.products) as ProductId[]))
  LIVE_POST_IDS.length = 0; LIVE_POST_IDS.push(...SHOPPABLE_POST_IDS, ...(Object.keys(a.scenes) as ShoppablePostId[]))
}

function liveProduct(id: ProductId): ProductRecord {
  const own = authored.products[id]
  if (own) return own.record
  const seed = PRODUCTS[id]
  const o = products[id]
  if (!o) return seed
  let rec = productCache.get(id)
  if (!rec) {
    const price = o.price ?? seed.price
    // The seeded discount keeps its percentage when the Seller changes the regular price.
    const discount = seed.discount && { ...seed.discount, price: Math.round(price * (100 - seed.discount.percent) / 100) as Santim }
    rec = {
      ...seed, name: o.name || seed.name, description: o.description || seed.description, price, stock: o.stock, availability: o.availability,
      locallyMade: o.locallyMade, discount, variants: o.variants ?? seed.variants, attributes: o.attributes ?? seed.attributes,
    }
    productCache.set(id, rec)
  }
  return rec
}

function liveSeller(id: SellerId): SellerRecord {
  const seed = SELLERS[id]
  const o = sellers[id]
  if (!o) return seed
  let rec = sellerCache.get(id)
  if (!rec) {
    rec = {
      ...seed, name: o.name || seed.name, handle: o.handle || seed.handle, bio: o.bio || seed.bio, area: o.area || seed.area,
      buyerCollection: seed.buyerCollection && o.collectionPlace ? { ...seed.buyerCollection, place: o.collectionPlace } : seed.buyerCollection,
    }
    sellerCache.set(id, rec)
  }
  return rec
}

const proxy = <K extends string, V extends object>(seed: Readonly<Record<K, V>>, resolve: (id: K) => V, extra?: (id: string) => boolean) =>
  new Proxy(seed, {
    get: (target, key) => (typeof key === 'string' && (key in target || extra?.(key)) ? resolve(key as K) : Reflect.get(target, key)),
    has: (target, key) => key in target || (typeof key === 'string' && !!extra?.(key)),
  }) as Readonly<Record<K, V>>

export const LIVE_PRODUCTS = proxy<ProductId, ProductRecord>(PRODUCTS, liveProduct, id => id in authored.products)
export const LIVE_POSTS = proxy<ShoppablePostId, ShoppablePostRecord>(SHOPPABLE_POSTS, id => authored.scenes[id]?.record ?? SHOPPABLE_POSTS[id], id => id in authored.scenes)
export const LIVE_SELLERS = proxy<SellerId, SellerRecord>(SELLERS, liveSeller)
/** The first photo the Seller added to a seeded Product, if any. */
export const livePhoto = (id: ProductId) => authored.products[id]?.photos[0] ?? products[id]?.photos[0]
/** The Scene's own photo (authored Scenes), if any. */
export const liveScenePhoto = (id: ShoppablePostId) => authored.scenes[id]?.image ?? undefined
/** The exact price (santim) of the chosen options, from the Variants the Seller listed; null when the Product keeps no such row. */
export function liveVariantRow(id: string, options: readonly string[]) {
  const rows = authored.products[id]?.rows
  if (!rows) return null
  return rows.find(r => Object.values(r.values).length === options.length && Object.values(r.values).every(v => options.includes(v))) ?? null
}
/** Seeded Products the Seller returned to draft: Buyers cannot see them. */
export const isUnpublishedSeeded = (id: ProductId) => products[id]?.published === false
