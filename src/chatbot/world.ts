// The engine's view of the shared EFFECTIVE data (BOT-003, FIX-001): seeded DEMO_DATA with the Seller's overrides applied, authored Products
// and Scenes, the Seller's Store setup and the chatbot configuration. Nothing is copied or re-entered; every call reads current state.
import { LIVE_POSTS, LIVE_PRODUCTS, LIVE_SELLERS, liveProductDetails } from '../demo-data/live'
import {
  CHATBOTS, DEFAULT_SNAPSHOT, MARKET, PRODUCTS, SHOPPABLE_POSTS, buyerVisibleProductsAt, currentPrice, isBuyerVisiblePostAt,
  sellerPostsAt, type Moment, type ProductId, type SellerId, type ShoppablePostId,
} from '../demo-data'
import { COVERAGE_AREAS, exactVariants, linkableProducts, parseMoney, productPrices, productStock, sceneVisibility, type WorkspaceState } from '../seller-workspace'
import { cartFulfilment, sellerMethods } from '../fulfilment'
import { blankBotConfig, type BotConfig } from './config'
import type { LeafLabels } from './taxonomy-labels'
import type { ProductFacts, SceneFacts, SellerFacts, World } from './types'

export const botConfigOf = (state: WorkspaceState, seller: string): BotConfig => ({ ...blankBotConfig(), ...state.bot[seller as SellerId] })
const isSeededProduct = (id: string): id is ProductId => id in PRODUCTS
const isSeededSeller = (id: string): id is SellerId => id in LIVE_SELLERS

const variantRows = exactVariants

export function sellerFacts(state: WorkspaceState, id: string, at: Moment = DEFAULT_SNAPSHOT): SellerFacts | null {
  if (!isSeededSeller(id)) return null
  const seller = LIVE_SELLERS[id]
  const setup = state.setup[id]
  const config = botConfigOf(state, id)
  // DATA-FIX-02: the same effective methods the Buyer's Cart and checkout use. DEMO-003: Seller-level here (no Buyer place), because the assistant answers for the area
  // the Buyer names in the Message against the Seller's stated coverage, never from where the app thinks the Buyer is.
  const effective = sellerMethods(state, id, at, false, null).methods
  const methods: SellerFacts['methods'] = effective.map(m => m.mode)
  const sellerCharge = effective.find(m => m.mode === 'Seller Delivery')?.charge
  // A city counts as covered only where the Seller states it plainly ("Addis Ababa by arrangement" is not coverage).
  const coverage = setup && !setup.blank ? setup.coverage : COVERAGE_AREAS.filter(a => !/nationwide/i.test(a) && new RegExp(String.raw`\b${a}\b(?!\s+by arrangement)`, 'i').test(seller.sellerDelivery?.coverage ?? ''))
  const seededAnswers = (CHATBOTS[id]?.answers ?? []).map((a, i) => ({ id: `seed-${i}`, topic: a.topic, answer: a.answer }))
  const warranty = config.warrantyOffered === 'yes' && config.warranty.trim() ? { summary: config.warranty.trim() } : null
  return {
    id, name: seller.name, handle: seller.handle, bio: seller.bio ?? '',
    collectionPlace: setup && !setup.blank ? (setup.collection.on ? setup.collection.place : '') : seller.buyerCollection?.place ?? '',
    collectionHours: config.collectionHours.trim() || (setup && !setup.blank ? '' : seller.buyerCollection?.hours ?? ''),
    knownAreas: COVERAGE_AREAS.filter(a => !/nationwide/i.test(a)), methods, deliveryFee: setup && !setup.blank ? setup.sellerDelivery.fee : sellerCharge ? String(sellerCharge / 100) : '', coverage,
    returns: config.returns, warranty, sizeGuide: config.sizeGuide, botEnabled: config.enabled,
    supplementary: state.knowledge[id] ?? seededAnswers,
  }
}

export function productFacts(state: WorkspaceState, labels: LeafLabels | null, at: Moment, sellerId: string, id: string): ProductFacts | null {
  const knowledge = botConfigOf(state, sellerId).products[id] ?? {}
  const own = state.products[id]
  // DATA-FIX-01: one effective-fact path. "Seeded" means the id is in the seeded DEMO_DATA (never "is in the live registry", which also
  // holds the Products a Seller authored). The live record gives price, stock and discount; the Seller's workspace record gives taxonomy,
  // attributes and Variants for seeded edits and authored Products alike.
  const seeded = isSeededProduct(id)
  if (seeded ? LIVE_PRODUCTS[id].seller !== sellerId : !own || own.seller !== sellerId || own.seeded) return null
  const rec = id in LIVE_PRODUCTS ? LIVE_PRODUCTS[id as ProductId] : null
  const prices = own ? productPrices(own) : []
  const baseRows = seeded ? liveProductDetails(id)?.rows : undefined
  const price = rec ? currentPrice(id as ProductId) : prices.length ? Math.min(...prices) : own ? parseMoney(own.price) : null
  const tax = own?.category ? (labels?.[own.category] ?? []) : []
  const options = own && own.options.length ? own.options.map(o => ({ name: o.name, values: [...o.values] })) : (rec?.variants ?? []).map(v => ({ name: v.name ?? 'Option', values: [...v.options] }))
  return {
    id, sellerId, name: rec?.name ?? own!.name, description: rec?.description ?? own?.description ?? '',
    // A marketplace Product the Seller has not edited carries its taxonomy id and exact Variant rows from the dataset (liveProductDetails); legacy seeded Products have none.
    categoryId: own?.category ?? (seeded ? liveProductDetails(id)?.category : null) ?? null, categoryPath: own?.category ?? (seeded ? liveProductDetails(id)?.category : null) ?? '', taxonomyLabels: tax,
    attributes: own ? [...Object.entries(own.attributes).filter(([, v]) => v.trim()).map(([label, value]) => ({ label, value })), ...own.customAttributes.filter(a => a.name.trim() && a.value.trim()).map(a => ({ label: a.name, value: a.value }))] : [],
    listedDetails: !seeded ? [] : own ? own.customAttributes.filter(a => !a.name.trim() && a.value.trim()).map(a => a.value) : [...(rec?.attributes ?? [])], options, variants: own ? variantRows(own) : baseRows ? [...baseRows] : null,
    price: price !== null && Number.isFinite(price) ? price : null, regularPrice: seeded && rec ? rec.price : null,
    stock: rec ? rec.stock : own ? productStock(own) : 0,
    fulfilment: cartFulfilment(state, sellerId as SellerId, [{ id, name: rec?.name ?? own?.name ?? id }], at, false, null).methods.map(m => m.mode), knowledge,
    viewable: !!rec && buyerVisibleProductsAt(at).includes(id as ProductId) && (!own || own.status === 'published'),
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
      const post = LIVE_POSTS[id as ShoppablePostId]
      out.push({ id, revision: 1, viewable: true, summary: config.scenes[id] ?? '', products: dedupe([...post.tags]).filter(viewable).map(t => ({ id: t, name: LIVE_PRODUCTS[t as ProductId].name, available: LIVE_PRODUCTS[t as ProductId].stock > 0 })) })
    }
  }
  for (const scene of Object.values(state.scenes)) {
    if (scene.seller !== sellerId) continue
    if (sceneVisibility(scene, state, at) !== 'public') continue
    const ordered = scene.tags.map(t => t.product) // composition order (FR-001)
    out.push({ id: scene.id, revision: scene.updated, viewable: true, summary: config.scenes[scene.id] ?? '', products: dedupe(ordered).filter(viewable).map(id => { const f = productFacts(state, null, at, sellerId, id)!; return { id, name: f.name, available: f.stock > 0 } }) })
  }
  return out
}
export const sceneTitle = (state: WorkspaceState, id: string) => (id in SHOPPABLE_POSTS ? SHOPPABLE_POSTS[id as ShoppablePostId].title : state.scenes[id]?.caption || id)

export function buildWorld(state: WorkspaceState, labels: LeafLabels | null, at: Moment): World {
  return {
    seller: id => sellerFacts(state, id, at),
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
