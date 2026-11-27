// FIX-001: the effective Product and Seller records. DEMO_DATA stays immutable; the Seller workspace publishes what a Seller
// changed (name, price, stock, media, store identity) here, and LIVE_PRODUCTS / LIVE_SELLERS return the seeded record with
// those changes applied. Public surfaces (Buyer, Storefront, Companion) and the derived visibility rules read these, so one
// edit reaches all of them. Historical Orders, Claims and Reviews keep reading the seeded records.
import type { Santim } from './money.ts'
import { PRODUCTS } from './records/products.ts'
import type { ProductId, ProductRecord, VariantGroup } from './records/products.ts'
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

let products: Readonly<Record<string, ProductOverlay>> = {}
let sellers: Readonly<Record<string, SellerOverlay>> = {}
const productCache = new Map<string, ProductRecord>()
const sellerCache = new Map<string, SellerRecord>()

/** Called by the workspace provider whenever its state changes. */
export function setLiveOverlay(p: Readonly<Record<string, ProductOverlay>>, s: Readonly<Record<string, SellerOverlay>>) {
  if (p === products && s === sellers) return
  products = p; sellers = s; productCache.clear(); sellerCache.clear()
}

function liveProduct(id: ProductId): ProductRecord {
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

const proxy = <K extends string, V extends object>(seed: Readonly<Record<K, V>>, resolve: (id: K) => V) =>
  new Proxy(seed, { get: (target, key) => (typeof key === 'string' && key in target ? resolve(key as K) : Reflect.get(target, key)) }) as Readonly<Record<K, V>>

export const LIVE_PRODUCTS = proxy<ProductId, ProductRecord>(PRODUCTS, liveProduct)
export const LIVE_SELLERS = proxy<SellerId, SellerRecord>(SELLERS, liveSeller)
/** The first photo the Seller added to a seeded Product, if any. */
export const livePhoto = (id: ProductId) => products[id]?.photos[0]
/** Seeded Products the Seller returned to draft: Buyers cannot see them. */
export const isUnpublishedSeeded = (id: ProductId) => products[id]?.published === false
