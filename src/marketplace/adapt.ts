// Maps the marketplace source rows onto the EXISTING record shapes (SellerRecord, ProductRecord, ShoppablePostRecord, BuyerRecord, StaffRecord),
// so every surface keeps working on one shape. Source numbers are never changed (ETB x 100 is a unit change into santim, not a new value).
// Nothing is invented: no descriptions, photos, coordinates, exact inventory from `variant_idea`, taxonomy leaves or map pins.
// Ids are cast to the seeded id unions at this ONE boundary (shortcut: the unions stay seeded-only in the type system; upgrade to string ids
// when the legacy dataset is retired).
import { TAXONOMY } from '../demo-data/taxonomy.ts'
import type { SellerRecord, StaffRecord } from '../demo-data/records/sellers.ts'
import type { ProductRecord, VariantGroup } from '../demo-data/records/products.ts'
import type { ShoppablePostRecord } from '../demo-data/records/posts.ts'
import type { BuyerRecord, CollectionRecord } from '../demo-data/records/buyers.ts'
import type { SellerStory } from '../demo-data/stories.ts'
import type { ConversationRecord, MessageContext, MessageRecord } from '../demo-data/records/conversations.ts'
import { CATALOGUE, INDEX, OPERATIONS } from './import.ts'
import type { SrcProduct, SrcScene, SrcSeller } from './types.ts'

const santim = (etb: number) => etb * 100
/** The prototype's low-stock threshold (the same figure as seller-workspace's LOW_STOCK_AT; duplicated because that module imports this layer). */
const LOW_STOCK_AT = 3
const availabilityOf = (stock: number) => (stock <= 0 ? 'Out of Stock' : stock <= LOW_STOCK_AT ? 'Low Stock' : 'Available')

/** The marketplace snapshot's day, from which each Seller's joined date is counted back (demo_tenure_days). */
const SNAPSHOT_DAY = Date.UTC(2026, 10, 27)
const dayBefore = (days: number) => new Date(SNAPSHOT_DAY - days * 86400000).toISOString().slice(0, 10)
const initials = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

function sellerRecord(s: SrcSeller): SellerRecord {
  const majors = [...new Set(s.categories.map(c => c.split(' > ')[0]))]
  const collects = /Collection/.test(s.fulfilment)
  const delivers = /Seller Delivery/.test(s.fulfilment)
  // The Seller Delivery charge is not a Seller field in the source: it is the one charge every simulated Seller Delivery Order of this Seller carries (ETB 80, all of them).
  const fees = [...new Set(OPERATIONS.orders.filter(o => o.seller_id === s.seller_id && o.fulfilment_mode === 'SELLER_DELIVERY').map(o => o.delivery_etb))]
  return {
    code: initials(s.name) as SellerRecord['code'], name: s.name, handle: s.handle, category: majors.join(' / '), showcase: true, area: s.area,
    trustHistory: [{ level: s.mvp_trust, since: dayBefore(s.demo_tenure_days) }],
    followers: s.mvp_demo_followers, bio: s.profile, storeOpen: s.lifecycle === 'ACTIVE',
    socialAccounts: s.verification_fixture.split('+').map(x => x.trim()).filter(x => x && !/pending/i.test(x)),
    ...(collects ? { buyerCollection: { place: s.area, hours: s.hours } } : {}),
    ...(delivers && fees.length === 1 ? { sellerDelivery: { charge: santim(fees[0]), coverage: s.coverage } } : {}),
    // No `totals`: completed Orders and Seller Service ratings are internal-simulation history (seller_reputation), never shown as an MVP rating; they arrive with the Reviews work order.
    lifecycle: s.lifecycle,
  }
}

/** Source taxonomy path -> the taxonomy id the app uses ('fashion/womens-clothing/dresses'); null where the names do not resolve (never guessed). */
function taxonomyId(p: SrcProduct): string | null {
  const major = TAXONOMY.find(m => m.name === p.major)
  const category = major?.categories.find(c => c.name === p.category)
  if (!category) return null
  if (!p.subcategory) return category.id
  return category.subcategories.find(s => s.name === p.subcategory)?.id ?? category.id
}

export interface ProductExtras {
  record: ProductRecord; photos: readonly string[]; category: string | null
  rows: readonly { values: Record<string, string>; label: string; price: number | null; stock: number }[] | null
  details: readonly { label: string; value: string }[]
}

function productRecord(p: SrcProduct): { record: ProductRecord; extras: ProductExtras } {
  const vs = INDEX.variantsByProduct.get(p.product_id) ?? []
  // The source names no option dimensions ("S / Olive", "128 GB"), so each Product with exact Variants has ONE group whose options are the source labels.
  const variants: VariantGroup[] = vs.length ? [{ name: 'Variant', options: vs.map(v => v.variant_label) }] : []
  const regular = vs.length ? Math.min(...vs.map(v => v.regular_etb)) : p.regular_etb
  const current = vs.length ? Math.min(...vs.map(v => v.current_etb)) : p.current_etb
  const record: ProductRecord = {
    seller: p.seller_id as ProductRecord['seller'], name: p.name, price: santim(regular), variants, stock: p.stock, availability: availabilityOf(p.stock),
    // Source ratings are internal-simulation history, never a genuine MVP rating: none is shown here.
    quality: null, locallyMade: p.locally_made === 'Yes', attributes: [], publication: p.publication === 'PUBLISHED' ? 'Published' : 'Draft',
    ...(p.discount_pct > 0 ? { discount: { price: santim(current), percent: p.discount_pct, status: 'Active' as const } } : {}),
  }
  const rows = vs.length ? vs.map(v => ({ values: { Variant: v.variant_label }, label: v.variant_label, price: santim(v.current_etb), stock: v.stock })) : null
  return { record, extras: { record, photos: [], category: taxonomyId(p), rows, details: [] } }
}

function postRecord(s: SrcScene): ShoppablePostRecord {
  const restriction = s.visibility === 'PRIVATE' && s.publication === 'PUBLISHED' && /moderation restriction/i.test(s.reason)
  return {
    seller: s.seller_id as ShoppablePostRecord['seller'], title: s.title, tags: s.product_ids as unknown as ShoppablePostRecord['tags'],
    // The source gives no photo and no hotspot coordinates: the tags are listed, never positioned.
    hotspots: 0, positioned: false, caption: s.caption,
    publication: s.publication === 'PUBLISHED' ? 'Published' : s.publication === 'ARCHIVED' ? 'Archived' : 'Draft',
    ...(restriction ? { restricted: { reason: s.reason } } : {}),
  }
}

function buyerRecord(id: string): BuyerRecord {
  const b = INDEX.buyer.get(id)!
  return {
    name: b.display_name, primary: id === 'BY-01', signedIn: id === 'BY-01', deliveryArea: b.area, discoveryArea: b.area,
    // The zero-result example is a query the unit test proves matches no Product or Scene.
    ...(id === 'BY-01' ? { zeroResultQuery: 'harp' } : {}),
    follows: (INDEX.followsByBuyer.get(id) ?? []).map(f => f.seller_id as never),
  }
}

/** For You / Following order: each ACTIVE Seller's published Scenes in id order, taken in turn by Seller (the legacy rule); eligibility is still derived from stock. */
function turnOrder(): string[] {
  const queues = CATALOGUE.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => (INDEX.scenesBySeller.get(s.seller_id) ?? []).filter(x => x.publication === 'PUBLISHED').map(x => x.scene_id).sort())
  const out: string[] = []
  for (let i = 0; queues.some(q => i < q.length); i++) for (const q of queues) if (i < q.length) out.push(q[i])
  return out
}

/** Nearby: for each Seller area, the ACTIVE Sellers in that area first, then the others of its city. Geography (district matching) arrives with DEMO-003. */
function nearby(): Record<string, string[]> {
  const active = CATALOGUE.sellers.filter(s => s.lifecycle === 'ACTIVE')
  const out: Record<string, string[]> = {}
  for (const area of [...new Set(active.map(s => s.area))].sort()) {
    const city = active.find(s => s.area === area)!.city
    out[area] = [...active.filter(s => s.area === area), ...active.filter(s => s.area !== area && s.city === city)].map(s => s.seller_id)
  }
  return out
}

/**
 * Source Stories become Seller Stories at the snapshot: posted = snapshot - age_hours, 24 hours long. Only Live ones are kept (an expired,
 * withdrawn, draft or hidden-link Story has no public representation); the link rules in storiesAt hide a Live Story whose target is unavailable.
 */
function stories(): SellerStory[] {
  const snapshotMs = Date.parse(OPERATIONS.metadata.snapshot)
  const stamp = (ms: number) => new Date(ms + 3 * 3600000).toISOString().slice(0, 16) + ':00+03:00'
  return CATALOGUE.stories.filter(s => s.age_hours !== null && s.age_hours < 24 && !/Withdrawn|Draft|Expired/i.test(s.expected_state)).map(s => {
    const posted = snapshotMs - (s.age_hours as number) * 3600000
    const product = s.link_id && INDEX.product.has(s.link_id) ? s.link_id : undefined
    const post = s.link_id && INDEX.scene.has(s.link_id) ? s.link_id : undefined
    const discounted = product && (INDEX.product.get(product)!.discount_pct > 0)
    return {
      id: s.story_id as SellerStory['id'], seller: s.seller_id as SellerStory['seller'], kind: discounted ? 'discount' : product ? 'promotion' : 'update', text: s.text,
      posted: stamp(posted), expires: stamp(posted + 24 * 3600000),
      ...(product ? { product: product as SellerStory['product'] } : {}), ...(post ? { post: post as SellerStory['post'] } : {}),
    }
  })
}

function staff(): { staff: Record<string, StaffRecord>; sessions: { staff: string; surface: 'Seller Console' | 'Seller Companion'; device: string }[] } {
  const out: Record<string, StaffRecord> = {}
  const sessions: { staff: string; surface: 'Seller Console' | 'Seller Companion'; device: string }[] = []
  for (const m of OPERATIONS.team_members) {
    out[m.member_id] = { seller: m.seller_id as StaffRecord['seller'], name: m.display_name, role: m.relationship_type === 'OWNERSHIP' ? 'Owner' : 'Operations', ...(m.relationship_type === 'TEAM' ? { roles: m.roles } : {}) }
    // Each Owner has a Console and a Companion session on the shared prototype devices, as the legacy Owners do.
    if (m.relationship_type === 'OWNERSHIP') sessions.push({ staff: m.member_id, surface: 'Seller Console', device: 'desktop browser' }, { staff: m.member_id, surface: 'Seller Companion', device: 'phone' })
  }
  return { staff: out, sessions }
}

/** Source chat_messages as the seeded one-thread-per-Buyer-and-Seller conversations (Seller messages come from the Seller's Owner, the only identity the source gives). */
function conversations(): Record<string, ConversationRecord> {
  const out: Record<string, { buyer: string; seller: string; messages: MessageRecord[] }> = {}
  for (const m of OPERATIONS.chat_messages) {
    const owner = (INDEX.membersBySeller.get(m.seller_id) ?? []).find(x => x.relationship_type === 'OWNERSHIP')!.member_id
    const context = m.product_id && m.scene_id ? { product: m.product_id, post: m.scene_id } : m.product_id ? { product: m.product_id } : m.scene_id ? { post: m.scene_id } : { general: true as const }
    const c = (out[m.conversation_id] ??= { buyer: m.buyer_id, seller: m.seller_id, messages: [] })
    c.messages.push({ at: m.sent_at, from: (m.sender === 'BUYER' ? 'buyer' : owner) as MessageRecord['from'], context: context as MessageContext, text: m.text })
  }
  for (const c of Object.values(out)) c.messages.sort((a, b) => a.at.localeCompare(b.at))
  return out as unknown as Record<string, ConversationRecord>
}

/** Source Collections with their saves, buyer-owned and private; the default one is "Saved". */
function collections(): Record<string, CollectionRecord> {
  return Object.fromEntries(OPERATIONS.collections.map(c => [c.collection_id, {
    owner: c.buyer_id as CollectionRecord['owner'], name: c.name, ...(c.is_default ? { isDefault: true } : {}),
    items: OPERATIONS.saves.filter(s => s.collection_id === c.collection_id).map(s => (s.entity_type === 'PRODUCT' ? { product: s.entity_id } : { post: s.entity_id })) as unknown as CollectionRecord['items'],
  }]))
}

const products = CATALOGUE.products.map(productRecord)
const team = staff()

export const MARKETPLACE = {
  sellers: Object.fromEntries(CATALOGUE.sellers.map(s => [s.seller_id, sellerRecord(s)])) as Record<string, SellerRecord>,
  sellerIds: CATALOGUE.sellers.map(s => s.seller_id),
  products: Object.fromEntries(products.map((p, i) => [CATALOGUE.products[i].product_id, p.record])) as Record<string, ProductRecord>,
  productIds: CATALOGUE.products.map(p => p.product_id),
  /** Live-layer extras read through liveProductDetails(): taxonomy id, exact Variant rows, detail lines (none are supplied) and photos (none exist yet). */
  extras: Object.fromEntries(products.map((p, i) => [CATALOGUE.products[i].product_id, p.extras])) as Record<string, ProductExtras>,
  posts: Object.fromEntries(CATALOGUE.scenes.map(s => [s.scene_id, postRecord(s)])) as Record<string, ShoppablePostRecord>,
  postIds: CATALOGUE.scenes.map(s => s.scene_id),
  forYouOrder: turnOrder(), followingOrder: turnOrder(), nearby: nearby(),
  buyers: Object.fromEntries(OPERATIONS.buyers.map(b => [b.buyer_id, buyerRecord(b.buyer_id)])) as Record<string, BuyerRecord>,
  buyerIds: OPERATIONS.buyers.map(b => b.buyer_id),
  staff: team.staff, sessions: team.sessions,
  stories: stories(), conversations: conversations(), collections: collections(),
  /** The first real record of the primary Seller, for the surface defaults. */
  firstProduct: (sellerId: string) => CATALOGUE.products.find(p => p.seller_id === sellerId && p.publication === 'PUBLISHED' && p.stock > 0)?.product_id,
  firstScene: (sellerId: string) => CATALOGUE.scenes.find(s => s.seller_id === sellerId && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC')?.scene_id,
}
