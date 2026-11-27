// The engine's view of the shared EFFECTIVE data (BOT-003, FIX-001): seeded DEMO_DATA with the Seller's overrides applied, authored Products
// and Scenes, the Seller's Store setup and the chatbot configuration. Nothing is copied or re-entered; every call reads current state.
import { LIVE_PRODUCTS, LIVE_SELLERS } from '../demo-data/live'
import {
  CHATBOTS, MARKET, SHOPPABLE_POSTS, buyerVisibleProductsAt, buyerVisibleSellers, currentPrice, isBuyerVisiblePostAt,
  sellerPostsAt, type Moment, type ProductId, type SellerId, type ShoppablePostId,
} from '../demo-data'
import { COVERAGE_AREAS, linkableProducts, parseCount, parseMoney, productPrices, productStock, sceneVisibility, variantPrice, type WorkspaceState, type WsProduct } from '../seller-workspace'
import { blankBotConfig, type BotConfig } from './config'
import type { LeafLabels } from './taxonomy-labels'
import type { ProductFacts, SceneFacts, SellerFacts, World } from './types'

export const botConfigOf = (state: WorkspaceState, seller: string): BotConfig => ({ ...blankBotConfig(), ...state.bot[seller as SellerId] })
const isSeededProduct = (id: string): id is ProductId => id in LIVE_PRODUCTS
const isSeededSeller = (id: string): id is SellerId => id in LIVE_SELLERS

/** Variant rows of an authored or overridden Product, keyed by option name (labels are "S / Black" in option order). */
function variantRows(p: WsProduct): ProductFacts['variants'] {
  if (!p.options.length || !p.variants.length) return null
  return p.variants.map(v => {
    const parts = v.label.split(' / ')
    const values = Object.fromEntries(p.options.map((o, i) => [o.name, parts[i] ?? '']))
    return { label: v.label, values, price: variantPrice(p, v), stock: parseCount(v.stock) ?? 0 }
  })
}

export function sellerFacts(state: WorkspaceState, id: string): SellerFacts | null {
  if (!isSeededSeller(id)) return null
  const seller = LIVE_SELLERS[id]
  const setup = state.setup[id]
  const config = botConfigOf(state, id)
  const methods: SellerFacts['methods'] = setup && !setup.blank
    ? [setup.collection.on && 'Buyer Collection', setup.sellerDelivery.on && 'Seller Delivery', setup.courier && 'Courier Delivery'].filter(Boolean) as SellerFacts['methods']
    : [seller.buyerCollection && 'Buyer Collection', seller.sellerDelivery && 'Seller Delivery', seller.courierCompensation && 'Courier Delivery'].filter(Boolean) as SellerFacts['methods']
  const coverage = setup && !setup.blank ? setup.coverage : (seller.sellerDelivery?.coverage ?? '').includes('Addis Ababa') ? ['Addis Ababa'] : []
  const seededAnswers = (CHATBOTS[id]?.answers ?? []).map((a, i) => ({ id: `seed-${i}`, topic: a.topic, answer: a.answer }))
  const warranty = config.warrantyOffered === 'yes' && config.warranty.trim() ? { summary: config.warranty.trim() } : null
  return {
    id, name: seller.name, handle: seller.handle, bio: seller.bio ?? '',
    collectionPlace: setup && !setup.blank ? (setup.collection.on ? setup.collection.place : '') : seller.buyerCollection?.place ?? '',
    collectionHours: config.collectionHours.trim() || (setup && !setup.blank ? '' : seller.buyerCollection?.hours ?? ''),
    knownAreas: COVERAGE_AREAS.filter(a => !/nationwide/i.test(a)), methods, deliveryFee: setup?.sellerDelivery.fee ?? '', coverage,
    returns: config.returns, warranty, sizeGuide: config.sizeGuide, botEnabled: config.enabled,
    supplementary: state.knowledge[id] ?? seededAnswers,
  }
}

export function productFacts(state: WorkspaceState, labels: LeafLabels | null, at: Moment, sellerId: string, id: string): ProductFacts | null {
  const knowledge = botConfigOf(state, sellerId).products[id] ?? {}
  const own = state.products[id]
  if (isSeededProduct(id)) {
    const rec = LIVE_PRODUCTS[id]
    if (rec.seller !== sellerId) return null
    const rows = own ? variantRows(own) : null
    const viewable = buyerVisibleProductsAt(at).includes(id) && (!own || own.status === 'published')
    const price = own && own.variants.length ? Math.min(...productPrices(own)) : currentPrice(id)
    return {
      id, sellerId, name: rec.name, description: rec.description ?? '', categoryId: null, categoryPath: '', taxonomyLabels: [], attributes: [], listedDetails: [...rec.attributes],
      options: rec.variants.map(v => ({ name: v.name ?? 'Option', values: [...v.options] })), variants: rows,
      price: Number.isFinite(price) ? price : null, regularPrice: rec.price, stock: own ? productStock(own) : rec.stock,
      fulfilment: sellerFacts(state, sellerId)?.methods ?? [], knowledge, viewable,
    }
  }
  if (!own || own.seller !== sellerId || own.seeded) return null
  const prices = productPrices(own)
  const tax = own.category ? (labels?.[own.category] ?? []) : []
  return {
    id, sellerId, name: own.name, description: own.description, categoryId: own.category, categoryPath: own.category ?? '', taxonomyLabels: tax,
    attributes: [...Object.entries(own.attributes).filter(([, v]) => v.trim()).map(([label, value]) => ({ label, value })), ...own.customAttributes.filter(a => a.name.trim() && a.value.trim()).map(a => ({ label: a.name, value: a.value }))],
    listedDetails: [], options: own.options.map(o => ({ name: o.name, values: [...o.values] })), variants: variantRows(own),
    price: prices.length ? Math.min(...prices) : parseMoney(own.price), regularPrice: null, stock: productStock(own), fulfilment: [...own.fulfilment], knowledge,
    viewable: own.status === 'published' && buyerVisibleSellers().includes(sellerId as SellerId),
  }
}

/** Public Scenes of a Seller (seeded and authored) with their eligible tagged Products, as the Buyer sees them now. */
export function publicScenes(state: WorkspaceState, at: Moment, sellerId: string): SceneFacts[] {
  const config = botConfigOf(state, sellerId)
  // A tagged Product is projected only while it is viewable (published, Seller visible), once, in hotspot order; out-of-stock stays viewable.
  const viewable = (id: string) => !!productFacts(state, null, at, sellerId, id)?.viewable
  const dedupe = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) === i)
  const out: SceneFacts[] = []
  if (isSeededSeller(sellerId)) {
    for (const id of sellerPostsAt(sellerId, at)) {
      if (!isBuyerVisiblePostAt(id, at)) continue
      const post = SHOPPABLE_POSTS[id as ShoppablePostId]
      out.push({ id, revision: 1, viewable: true, summary: config.scenes[id] ?? '', products: dedupe([...post.tags]).filter(viewable).map(t => ({ id: t, name: LIVE_PRODUCTS[t as ProductId].name })) })
    }
  }
  for (const scene of Object.values(state.scenes)) {
    if (scene.seller !== sellerId) continue
    if (sceneVisibility(scene, state, at) !== 'public') continue
    const ordered = scene.tags.map((t, i) => ({ id: t.product, n: t.n ?? i + 1 })).sort((a, b) => a.n - b.n).map(t => t.id)
    out.push({ id: scene.id, revision: scene.updated, viewable: true, summary: config.scenes[scene.id] ?? '', products: dedupe(ordered).filter(viewable).map(id => ({ id, name: productFacts(state, null, at, sellerId, id)!.name })) })
  }
  return out
}
export const sceneTitle = (state: WorkspaceState, id: string) => (id in SHOPPABLE_POSTS ? SHOPPABLE_POSTS[id as ShoppablePostId].title : state.scenes[id]?.caption || id)

export function buildWorld(state: WorkspaceState, labels: LeafLabels | null, at: Moment): World {
  return {
    seller: id => sellerFacts(state, id),
    product: (sellerId, id) => productFacts(state, labels, at, sellerId, id),
    scene: (sellerId, id) => {
      const live = publicScenes(state, at, sellerId).find(s => s.id === id)
      if (live) return live
      // Known to this Seller but not public now (private, archived, restricted, draft): reported as unavailable, without detail.
      const known = id in SHOPPABLE_POSTS ? SHOPPABLE_POSTS[id as ShoppablePostId].seller === sellerId : state.scenes[id]?.seller === sellerId
      return known ? { id, revision: 0, viewable: false, summary: '', products: [] } : null
    },
    eligibleProducts: sellerId => linkableProducts(state, sellerId as SellerId, at, true),
  }
}
export { MARKET }
