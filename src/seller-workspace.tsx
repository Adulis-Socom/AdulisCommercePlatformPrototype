import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { DEFAULT_SNAPSHOT, MARKET, PRODUCTS, SELLERS, buyerVisibleSellers, sellerProductsAt, type Moment, type ProductId, type Santim, type SellerId } from './demo-data'
import { setLiveOverlay, type AuthoredLive, type AuthoredProductLive, type AuthoredSceneLive, type ProductOverlay, type SellerOverlay } from './demo-data/live'
import { findTaxonomy } from './demo-data/taxonomy'
import type { Knowledge } from './sections/console/chatbot-engine'
import type { BotConfig } from './chatbot/config'
import type { ChatMsg, Conversation } from './chatbot/chat'
import type { Pending } from './chatbot/types'
import type { BotFeedback } from './chatbot/feedback'

/**
 * Seller workspace (SC-001..SC-006): what a Seller authors in the Seller Console during a session (store setup, Products,
 * Scenes, Stories), shared by every surface that needs it. Prototype persistence only: sessionStorage, images kept as small
 * thumbnails, nothing uploaded. Seeded DEMO_DATA records are never mutated: editing one stores an override under its id.
 */
export type Fulfilment = 'Buyer Collection' | 'Seller Delivery' | 'Courier Delivery'
export interface WsVariant { key: string; label: string; price: string; stock: string }
export interface WsProduct {
  id: string; seller: SellerId; seeded?: boolean; status: 'draft' | 'published'
  name: string; description: string; category: string | null
  attributes: Record<string, string>; customAttributes: { name: string; value: string }[]
  options: { name: string; values: string[] }[]; variants: WsVariant[]
  price: string; stock: string; photos: string[]; fulfilment: Fulfilment[]; locallyMade: boolean; updated: number
}
/** `n` is the hotspot's number: assigned once and never reused, so removing or losing a tag never renumbers the others. */
export interface WsHotspot { product: string; x: number; y: number; n?: number }
export interface WsScene {
  id: string; seller: SellerId; status: 'draft' | 'published' | 'archived'; caption: string; image: string | null; alt: string; tags: WsHotspot[]; updated: number
  /** Next hotspot number to hand out. */
  nextN?: number
  /** Set by Operator moderation (simulated). Only the Operator lifts it; stock changes never do. */
  restricted?: { reason: string } | null
}
/** The number shown on a hotspot. */
export const hotspotNumber = (scene: Pick<WsScene, 'tags'>, index: number) => scene.tags[index].n ?? index + 1
export interface WsStory { id: string; seller: SellerId; image: string | null; alt: string; text: string; link: { kind: 'product' | 'scene'; id: string } | null; status: 'draft' | 'published' | 'withdrawn' | 'expired'; publishedAt: number | null }
export interface WsSetup {
  storeName: string; handle: string; about: string; contactPhone: string; ownerName: string
  coverage: string[]; collection: { on: boolean; place: string }; sellerDelivery: { on: boolean; fee: string }; courier: boolean; blank: boolean
}
export interface WorkspaceState {
  products: Record<string, WsProduct>; scenes: Record<string, WsScene>; stories: Record<string, WsStory>
  setup: Partial<Record<SellerId, WsSetup>>
  /** The Seller's approved chatbot answers once edited; absent means the DEMO_DATA answers. */
  knowledge: Partial<Record<SellerId, Knowledge[]>>
  /** BOT-004: structured chatbot policy and knowledge per Seller (absent = nothing configured). */
  bot: Partial<Record<SellerId, BotConfig>>
  /** BOT-006: conversations keyed by Buyer|Seller|Market, shared by the Buyer app and the Seller Inbox. */
  chats: Record<string, Conversation>
  /** BOT-FIX-03: Seller feedback on assistant answers, reviewed by an Operator. Never edits a template. */
  botFeedback: BotFeedback[]
  /** The Buyer's temporary Cart once the Buyer has edited it this session (so it survives switching surfaces); null until then. Never a record. */
  /** The Buyer's Saves and unsaves this session (keyed "product:ID" / "post:ID"), kept so they survive switching surfaces; null until the Buyer saves something. */
  buyerSaved: Record<string, boolean> | null
  buyerCart: { product: string; options: string[]; quantity: number; seen?: number }[] | null
  /** Prototype hours since the session began; Story lifetimes read it, so expiry is deterministic and demonstrable. */
  clockHours: number
}
type Action =
  | { type: 'product'; item: WsProduct } | { type: 'scene'; item: WsScene } | { type: 'story'; item: WsStory }
  | { type: 'remove'; collection: 'products' | 'scenes' | 'stories'; id: string }
  | { type: 'restrict'; scene: string; reason: string | null }
  | { type: 'bot'; seller: SellerId; config: BotConfig }
  | { type: 'saved'; changes: Record<string, boolean> }
  | { type: 'cart'; lines: { product: string; options: readonly string[]; quantity: number; seen?: number }[] }
  | { type: 'feedback-add'; item: BotFeedback }
  | { type: 'feedback-review'; id: string; review: NonNullable<BotFeedback['review']> }
  | { type: 'chat-exchange'; conversation: Conversation; messages: ChatMsg[]; pending: Pending | null; escalate?: string; waiting?: boolean }
  | { type: 'chat-seller'; key: string; message: ChatMsg }
  | { type: 'chat-mode'; key: string; mode: Conversation['mode'] }
  | { type: 'setup'; seller: SellerId; setup: WsSetup } | { type: 'knowledge'; seller: SellerId; entries: Knowledge[] } | { type: 'clock'; hours: number } | { type: 'reset' }

const KEY = 'adulis.seller-workspace.v1'
const EMPTY: WorkspaceState = { products: {}, scenes: {}, stories: {}, setup: {}, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerCart: null, buyerSaved: null, clockHours: 0 }

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'product': return { ...state, products: { ...state.products, [action.item.id]: action.item } }
    case 'scene': return { ...state, scenes: { ...state.scenes, [action.item.id]: action.item } }
    case 'story': return { ...state, stories: { ...state.stories, [action.item.id]: action.item } }
    case 'remove': { const next = { ...state[action.collection] }; delete next[action.id]; return { ...state, [action.collection]: next } }
    case 'setup': return { ...state, setup: { ...state.setup, [action.seller]: action.setup } }
    case 'saved': return { ...state, buyerSaved: { ...action.changes } }
    case 'cart': return { ...state, buyerCart: action.lines.map(l => ({ product: l.product, options: [...l.options], quantity: l.quantity, seen: l.seen })) }
    case 'feedback-add': return { ...state, botFeedback: [...state.botFeedback, action.item] }
    case 'feedback-review': return { ...state, botFeedback: state.botFeedback.map(f => (f.id === action.id ? { ...f, status: 'reviewed' as const, review: action.review } : f)) }
    case 'bot': return { ...state, bot: { ...state.bot, [action.seller]: action.config } }
    case 'chat-exchange': {
      const base = state.chats[action.conversation.key] ?? action.conversation
      const messages = base.messages.map(m => (action.escalate && m.id === action.escalate ? { ...m, escalated: true } : m)).concat(action.messages)
      return { ...state, chats: { ...state.chats, [base.key]: { ...base, messages, pending: action.pending, waiting: action.escalate ? true : action.waiting ?? base.waiting, seq: base.seq + action.messages.length } } }
    }
    case 'chat-seller': {
      const c = state.chats[action.key]
      return c ? { ...state, chats: { ...state.chats, [c.key]: { ...c, messages: [...c.messages, action.message], mode: 'human_takeover', waiting: false, pending: null, seq: c.seq + 1 } } } : state
    }
    case 'chat-mode': { const c = state.chats[action.key]; return c ? { ...state, chats: { ...state.chats, [c.key]: { ...c, mode: action.mode, waiting: action.mode === 'bot' ? c.waiting : false } } } : state }
    case 'knowledge': return { ...state, knowledge: { ...state.knowledge, [action.seller]: action.entries } }
    case 'restrict': { const scene = state.scenes[action.scene]; return scene ? { ...state, scenes: { ...state.scenes, [scene.id]: { ...scene, restricted: action.reason ? { reason: action.reason } : null } } } : state }
    case 'clock': return moveClock(state, action.hours)
    case 'reset': return EMPTY
  }
}

/**
 * Moves the prototype clock. A Story that has run its 24 hours becomes `expired` for good, and a rewind keeps every live Story's
 * remaining time (publishedAt moves with the clock), so neither a restock nor a clock reset can bring a finished Story back.
 */
function moveClock(state: WorkspaceState, delta: number): WorkspaceState {
  const clockHours = Math.max(0, state.clockHours + delta)
  const applied = clockHours - state.clockHours
  const reach = Math.max(clockHours, state.clockHours)
  const stories = Object.fromEntries(Object.entries(state.stories).map(([id, s]) => {
    if (s.status !== 'published') return [id, s]
    if (STORY_LIFETIME_HOURS - (reach - (s.publishedAt ?? 0)) <= 0) return [id, { ...s, status: 'expired' as const }]
    return [id, applied < 0 ? { ...s, publishedAt: (s.publishedAt ?? 0) + applied } : s]
  }))
  return { ...state, clockHours, stories }
}

const load = (): WorkspaceState => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? 'null') } } catch { return EMPTY } }

const Ctx = createContext<{ state: WorkspaceState; dispatch: Dispatch<Action>; next: (kind: 'product' | 'scene' | 'story') => string }>({ state: EMPTY, dispatch: () => {}, next: () => '' })

export function SellerWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota: the workspace still works until reload */ } }, [state])
  // Ids come from a counter in the state, so they are stable and readable (PRD-NEW-001), never random.
  // FIX-001: publish the effective seeded Product/Seller values before children render (idempotent; keyed on the state).
  const overlay = useMemo(() => effectiveOverlay(state), [state])
  setLiveOverlay(overlay.products, overlay.sellers, overlay.authored)
  const value = useMemo(() => {
    const dispatch: Dispatch<Action> = rawDispatch
    const next = (kind: 'product' | 'scene' | 'story') => {
      const prefix = `${{ product: 'PRD', scene: 'SCN', story: 'STY' }[kind]}-NEW-`
      const pool = { product: state.products, scene: state.scenes, story: state.stories }[kind]
      const max = Object.keys(pool).reduce((m, id) => (id.startsWith(prefix) ? Math.max(m, Number(id.slice(prefix.length)) || 0) : m), 0)
      return `${prefix}${String(max + 1).padStart(3, '0')}`
    }
    return { state, dispatch, next }
  }, [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useWorkspace = () => useContext(Ctx)

/** What the Seller changed on seeded Products and Sellers, in the shape demo-data/live.ts applies over the seeded records. */
export function effectiveOverlay(state: WorkspaceState): { products: Record<string, ProductOverlay>; sellers: Record<string, SellerOverlay>; authored: AuthoredLive } {
  const products: Record<string, ProductOverlay> = {}
  for (const p of Object.values(state.products)) {
    if (!p.seeded) continue
    const stock = productStock(p)
    const prices = productPrices(p)
    products[p.id] = {
      published: p.status === 'published', name: p.name, description: p.description, price: prices.length ? Math.min(...prices) : null,
      stock, availability: stockState(stock), locallyMade: p.locallyMade, photos: p.photos,
      variants: p.options.length ? p.options.map(o => ({ name: o.name, options: o.values })) : undefined,
      attributes: [...Object.entries(p.attributes).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), ...p.customAttributes.filter(a => a.value).map(a => (a.name ? `${a.name}: ${a.value}` : a.value))],
    }
  }
  const sellers: Record<string, SellerOverlay> = {}
  for (const [id, s] of Object.entries(state.setup)) {
    if (!s || s.blank) continue
    const handle = s.handle.trim()
    sellers[id] = { name: s.storeName.trim(), handle: handle && !handle.startsWith('@') ? `@${handle}` : handle, bio: s.about.trim(), collectionPlace: s.collection.on ? s.collection.place.trim() : '' }
  }
  // FIX-004: published authored Products and public authored Scenes become first-class records (same shape as the seeded ones).
  const authoredProducts: Record<string, AuthoredProductLive> = {}
  for (const p of Object.values(state.products)) {
    if (p.seeded || p.status !== 'published' || !buyerVisibleSellers().includes(p.seller)) continue
    const prices = productPrices(p)
    if (!prices.length) continue
    const stock = productStock(p)
    const details = [...Object.entries(p.attributes).filter(([, v]) => v.trim()).map(([label, value]) => ({ label, value })), ...p.customAttributes.filter(a => a.name.trim() && a.value.trim()).map(a => ({ label: a.name, value: a.value }))]
    authoredProducts[p.id] = {
      record: { seller: p.seller, name: p.name, price: Math.min(...prices) as Santim, variants: p.options.map(o => ({ name: o.name, options: o.values })), stock, availability: stockState(stock), locallyMade: p.locallyMade, description: p.description, attributes: details.map(d => `${d.label}: ${d.value}`), quality: null },
      photos: p.photos, category: p.category, rows: exactVariants(p), details,
    }
  }
  const authoredScenes: Record<string, AuthoredSceneLive> = {}
  for (const scene of Object.values(state.scenes)) {
    if (scene.status !== 'published' || sceneVisibility(scene, state, DEFAULT_SNAPSHOT) !== 'public') continue
    const spots = scene.tags.map((t, i) => ({ product: t.product, x: t.x, y: t.y, n: t.n ?? i + 1 })).filter(t => t.product in PRODUCTS || t.product in authoredProducts).sort((a, b) => a.n - b.n)
    const ids = spots.map(t => t.product).filter((id, i, all) => all.indexOf(id) === i)
    authoredScenes[scene.id] = {
      record: { seller: scene.seller, title: scene.caption.trim() || 'Scene', tags: ids as ProductId[], hotspots: spots.length, publication: 'Published', caption: scene.caption },
      image: scene.image, alt: scene.alt, spots, revision: scene.updated,
    }
  }
  return { products, sellers, authored: { products: authoredProducts, scenes: authoredScenes } }
}

/** The exact Variants a Seller listed (labels are "S / Black" in option order); null when the Product has no options or no listed rows. */
export function exactVariants(p: WsProduct): { values: Record<string, string>; label: string; price: number | null; stock: number }[] | null {
  if (!p.options.length || !p.variants.length) return null
  return p.variants.map(v => {
    const parts = v.label.split(' / ')
    return { values: Object.fromEntries(p.options.map((o, i) => [o.name, parts[i] ?? ''])), label: v.label, price: variantPrice(p, v), stock: parseCount(v.stock) ?? 0 }
  })
}

// ---------- Derived rules (no state of their own) ----------

// Prototype placeholder limits (founder decision FD-005 still open): they only keep absurd input out of the workspace.
export const MAX_PRICE_BIRR = 1_000_000
export const MAX_STOCK = 100_000
/** Santim for a price such as "2,450" or "2450.50"; null for blank, zero, negative, non-numeric, exponent, infinite or above MAX_PRICE_BIRR. */
export const parseMoney = (text: string): number | null => {
  const raw = text.trim()
  // Thousands separators only where they belong ("2,450"), never "1,2,3".
  if (!/^(\d{1,3}(,\d{3})+|\d{1,9})(\.\d{1,2})?$/.test(raw)) return null
  const t = raw.replace(/,/g, '')
  const value = Math.round(Number(t) * 100)
  return value > 0 && value <= MAX_PRICE_BIRR * 100 ? value : null
}
/** A whole-number quantity from 0 to MAX_STOCK; null otherwise. */
export const parseCount = (text: string): number | null => {
  const t = text.trim()
  if (!/^\d{1,9}$/.test(t)) return null
  const n = Number(t)
  return n <= MAX_STOCK ? n : null
}
/** A Variant's effective price in santim: its own price when entered, else the Product's base price; null when neither is valid (never 0). */
export const variantPrice = (p: Pick<WsProduct, 'price'>, v: WsVariant): number | null => parseMoney(v.price.trim() ? v.price : p.price)
/** Every valid effective price of the Product (one per Variant, or the single price). */
export const productPrices = (p: Pick<WsProduct, 'price' | 'variants'>): number[] =>
  (p.variants.length ? p.variants.map(v => variantPrice(p, v)) : [parseMoney(p.price)]).filter((x): x is number => x !== null)
const norm = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()
export const formatBirr = (santim: number) => `ETB ${(santim / 100).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: santim % 100 ? 2 : 0 })}`

/** Total stock: the sum over Variants when there are any, else the Product's own figure. Unparseable counts as 0. */
export function productStock(p: Pick<WsProduct, 'variants' | 'stock'>): number {
  return p.variants.length ? p.variants.reduce((sum, v) => sum + (parseCount(v.stock) ?? 0), 0) : (parseCount(p.stock) ?? 0)
}
export type StockState = 'Available' | 'Low Stock' | 'Out of Stock'
export const LOW_STOCK_AT = 3 // prototype threshold only; the governing designs set no number
export const stockState = (stock: number): StockState => (stock <= 0 ? 'Out of Stock' : stock <= LOW_STOCK_AT ? 'Low Stock' : 'Available')

export interface Issue { field: string; message: string }
/** Every publication blocker at once (CATINV): each names its field. A draft may stay incomplete. */
export function publicationIssues(p: WsProduct): Issue[] {
  const issues: Issue[] = []
  if (p.name.trim().length < 2) issues.push({ field: 'name', message: 'Add a Product name.' })
  const taxonomy = findTaxonomy(p.category)
  if (!p.seeded && !taxonomy?.category) issues.push({ field: 'category', message: 'Choose a category (required before first publication).' })
  else if (!p.seeded && taxonomy?.category?.subcategories.length && !taxonomy.sub) issues.push({ field: 'category', message: 'Choose a subcategory.' })
  if (!p.seeded && p.photos.length === 0) issues.push({ field: 'photos', message: 'Add at least one photo.' })
  if (!p.variants.length && parseMoney(p.price) === null) issues.push({ field: 'price', message: `Enter a price above zero and at most ${MAX_PRICE_BIRR.toLocaleString('en-US')}, such as 2450 or 2450.50.` })
  if (!p.variants.length && parseCount(p.stock) === null) issues.push({ field: 'stock', message: `Enter the available quantity as a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.` })
  const names = new Set<string>()
  p.options.forEach((o, i) => {
    const key = norm(o.name)
    if (!key || !o.values.length) issues.push({ field: 'variants', message: `Option ${i + 1} needs a name and at least one value, or remove it.` })
    else if (names.has(key)) issues.push({ field: 'variants', message: `Two options are both called “${o.name.trim()}”.` })
    names.add(key)
    const seen = new Set<string>()
    o.values.forEach(value => { const k = norm(value); if (seen.has(k)) issues.push({ field: 'variants', message: `${o.name.trim() || `Option ${i + 1}`} lists “${value}” more than once.` }); seen.add(k) })
  })
  const combos = new Set<string>()
  p.variants.forEach(v => {
    const k = v.label.split(' / ').map(norm).join('|')
    if (combos.has(k)) issues.push({ field: `variant:${v.key}`, message: `${v.label}: this combination appears twice.` })
    combos.add(k)
    if (v.price.trim() && parseMoney(v.price) === null) issues.push({ field: `variant:${v.key}`, message: `${v.label}: price must be above zero and at most ${MAX_PRICE_BIRR.toLocaleString('en-US')}.` })
    else if (variantPrice(p, v) === null) issues.push({ field: `variant:${v.key}`, message: `${v.label}: set a price here or a base price.` })
    if (parseCount(v.stock) === null) issues.push({ field: `variant:${v.key}`, message: `${v.label}: enter the quantity as a whole number from 0 to ${MAX_STOCK.toLocaleString('en-US')}.` })
  })
  if (!p.seeded && p.fulfilment.length === 0) issues.push({ field: 'fulfilment', message: 'Choose at least one fulfilment method.' })
  return issues
}

/** A Product a Scene or Story may link right now: same Seller, published, in stock (seeded Products read DEMO_DATA, with overrides). */
export interface LinkableProduct { id: string; name: string; stock: number; cover: string | null }
export function linkableProducts(state: WorkspaceState, seller: SellerId, at: Moment, includeOutOfStock = false): LinkableProduct[] {
  const seeded = sellerProductsAt(seller, at).map((id): LinkableProduct & { published: boolean } => {
    const o = state.products[id]
    return { id, name: o?.name ?? PRODUCTS[id].name, stock: o ? productStock(o) : PRODUCTS[id].stock, cover: o?.photos[0] ?? null, published: !o || o.status === 'published' }
  })
  const authored = Object.values(state.products).filter(p => p.seller === seller && !p.seeded).map(p => ({ id: p.id, name: p.name || 'Untitled Product', stock: productStock(p), cover: p.photos[0] ?? null, published: p.status === 'published' }))
  return [...seeded, ...authored].filter(p => p.published && (includeOutOfStock || p.stock > 0)).map(({ published: _p, ...rest }) => rest)
}
export const productAvailableNow = (state: WorkspaceState, id: string, seller: SellerId, at: Moment) => linkableProducts(state, seller, at).some(p => p.id === id)

export type SceneVisibility = 'draft' | 'public' | 'private' | 'archived' | 'restricted'
export type SceneGate = 'product' | 'seller' | 'market' | 'media'
/** Every public-visibility gate a published Scene fails now, each with the reason shown to the Seller. Empty means every gate passes. */
export function sceneGateFailures(scene: WsScene, state: WorkspaceState, at: Moment): { gate: SceneGate; reason: string }[] {
  const out: { gate: SceneGate; reason: string }[] = []
  if (!scene.tags.some(tag => productAvailableNow(state, tag.product, scene.seller, at))) out.push({ gate: 'product', reason: 'Every tagged Product is out of stock or unpublished.' })
  if (!buyerVisibleSellers().includes(scene.seller)) out.push({ gate: 'seller', reason: 'This Seller’s store is not visible to Buyers.' })
  const setup = state.setup[scene.seller]
  if (setup && !setup.blank && setup.coverage.length === 0) out.push({ gate: 'market', reason: `The store serves no area in ${MARKET.country}. Choose a service area in Store setup.` })
  if (!scene.image || scene.alt.trim().length < 3) out.push({ gate: 'media', reason: 'The photo or its description is missing.' })
  return out
}
/**
 * A Scene's effective Buyer visibility (rules 1.7, 1.9). Draft, Archived and Restricted come from the Seller's or the Operator's
 * decision; Private is every other gate failing (tagged Products, Seller, Market, media). Public returns on its own, but never past
 * Archived or Restricted: a restock does not lift a moderation restriction.
 */
export function sceneVisibility(scene: WsScene, state: WorkspaceState, at: Moment): SceneVisibility {
  if (scene.status === 'draft') return 'draft'
  if (scene.status === 'archived') return 'archived'
  if (scene.restricted) return 'restricted'
  return sceneGateFailures(scene, state, at).length ? 'private' : 'public'
}
/** Why a Scene is not public, in words for the Seller; empty when it is public or only a draft. */
export function sceneReasons(scene: WsScene, state: WorkspaceState, at: Moment): string[] {
  const vis = sceneVisibility(scene, state, at)
  if (vis === 'archived') return ['You archived this Scene. Return it to draft to edit and publish it again.']
  if (vis === 'restricted') return [`Restricted by Adulis moderation: ${scene.restricted!.reason}. Restocking does not lift this.`]
  if (vis === 'private') return sceneGateFailures(scene, state, at).map(f => f.reason)
  return []
}
export function sceneIssues(scene: WsScene, state: WorkspaceState, at: Moment): Issue[] {
  const issues: Issue[] = []
  if (!scene.image) issues.push({ field: 'image', message: 'Choose a photo for the Scene.' })
  if (scene.image && scene.alt.trim().length < 3) issues.push({ field: 'alt', message: 'Describe the photo for people who cannot see it.' })
  if (scene.caption.trim().length < 3) issues.push({ field: 'caption', message: 'Write a short caption.' })
  if (!scene.tags.some(tag => productAvailableNow(state, tag.product, scene.seller, at))) issues.push({ field: 'tags', message: 'Tag at least one of your Products that is published and in stock.' })
  return issues
}

export const STORY_LIFETIME_HOURS = 24
export type StoryPhase = 'draft' | 'live' | 'expired' | 'withdrawn' | 'hidden'
/** Live for 24 prototype hours from publication; hidden while its linked Product or Scene is not publicly eligible (fail closed). */
export function storyPhase(story: WsStory, state: WorkspaceState, at: Moment): { phase: StoryPhase; hoursLeft: number } {
  if (story.status === 'draft') return { phase: 'draft', hoursLeft: STORY_LIFETIME_HOURS }
  if (story.status === 'withdrawn') return { phase: 'withdrawn', hoursLeft: 0 }
  if (story.status === 'expired') return { phase: 'expired', hoursLeft: 0 }
  const left = STORY_LIFETIME_HOURS - (state.clockHours - (story.publishedAt ?? 0))
  if (left <= 0) return { phase: 'expired', hoursLeft: 0 }
  const link = story.link
  if (link) {
    const linkOk = link.kind === 'product' ? productAvailableNow(state, link.id, story.seller, at) : (() => { const s = state.scenes[link.id]; return !!s && sceneVisibility(s, state, at) === 'public' })()
    if (!linkOk) return { phase: 'hidden', hoursLeft: left }
  }
  return { phase: 'live', hoursLeft: left }
}

// ---------- Setup readiness (SC-001) ----------
export const COVERAGE_AREAS = ['Addis Ababa', 'Adama', 'Bahir Dar', 'Hawassa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Jimma', 'Harar', 'Nationwide shipping by arrangement'] as const
export function defaultSetup(seller: SellerId): WsSetup {
  const s = SELLERS[seller]
  return { storeName: s.name, handle: s.handle, about: '', contactPhone: '', ownerName: '', coverage: s.area ? [s.area] : [], collection: { on: true, place: s.area ?? '' }, sellerDelivery: { on: false, fee: '' }, courier: false, blank: false }
}
export const blankSetup = (): WsSetup => ({ storeName: '', handle: '', about: '', contactPhone: '', ownerName: '', coverage: [], collection: { on: false, place: '' }, sellerDelivery: { on: false, fee: '' }, courier: false, blank: true })
export interface ReadinessItem { key: 'profile' | 'seller' | 'coverage' | 'fulfilment' | 'catalogue'; title: string; done: boolean; problems: string[]; action: string }
export function readiness(setup: WsSetup, publishedProducts: number): ReadinessItem[] {
  const profile: string[] = []
  if (setup.storeName.trim().length < 2) profile.push('Add a store name.')
  if (!/^@?[a-z0-9._]{3,30}$/i.test(setup.handle.trim())) profile.push('Choose a handle of 3 to 30 letters, numbers, dots or underscores.')
  if (setup.about.trim().length < 20) profile.push('Write a short store description (at least 20 characters).')
  const seller: string[] = []
  if (setup.ownerName.trim().length < 2) seller.push('Add the owner’s name.')
  if (!/^(\+251|0)?9\d{8}$/.test(setup.contactPhone.replace(/[\s-]/g, ''))) seller.push('Add an Ethiopian mobile number, for example 0912 345 678.')
  const coverage: string[] = setup.coverage.length ? [] : ['Choose at least one area you serve.']
  const fulfilment: string[] = []
  if (!setup.collection.on && !setup.sellerDelivery.on && !setup.courier) fulfilment.push('Turn on at least one fulfilment method.')
  if (setup.collection.on && setup.collection.place.trim().length < 3) fulfilment.push('Say where Buyers collect.')
  if (setup.sellerDelivery.on && (setup.sellerDelivery.fee.trim() === '' || !/^\d+(\.\d{1,2})?$/.test(setup.sellerDelivery.fee.trim()))) fulfilment.push('Enter your delivery charge in birr (0 for free).')
  const catalogue: string[] = publishedProducts > 0 ? [] : ['Publish your first Product.']
  return [
    { key: 'profile', title: 'Store profile', done: !profile.length, problems: profile, action: 'Complete profile' },
    { key: 'seller', title: 'Seller information', done: !seller.length, problems: seller, action: 'Add details' },
    { key: 'coverage', title: 'Service coverage', done: !coverage.length, problems: coverage, action: 'Choose areas' },
    { key: 'fulfilment', title: 'Fulfilment', done: !fulfilment.length, problems: fulfilment, action: 'Set up fulfilment' },
    { key: 'catalogue', title: 'Catalogue', done: !catalogue.length, problems: catalogue, action: 'Add a Product' },
  ]
}

/** A downsized preview kept in the workspace (thumbnails only: the prototype stores no originals). */
export async function toThumbnail(blob: Blob, maxSide = 640): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.8)
}
