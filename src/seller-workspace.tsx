import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { PRODUCTS, SELLERS, sellerProductsAt, type Moment, type SellerId } from './demo-data'
import { findTaxonomy } from './demo-data/taxonomy'

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
export interface WsHotspot { product: string; x: number; y: number }
export interface WsScene { id: string; seller: SellerId; status: 'draft' | 'published'; caption: string; image: string | null; alt: string; tags: WsHotspot[]; updated: number }
export interface WsStory { id: string; seller: SellerId; image: string | null; alt: string; text: string; link: { kind: 'product' | 'scene'; id: string } | null; status: 'draft' | 'published' | 'withdrawn'; publishedAt: number | null }
export interface WsSetup {
  storeName: string; handle: string; about: string; contactPhone: string; ownerName: string
  coverage: string[]; collection: { on: boolean; place: string }; sellerDelivery: { on: boolean; fee: string }; courier: boolean; blank: boolean
}
export interface WorkspaceState {
  products: Record<string, WsProduct>; scenes: Record<string, WsScene>; stories: Record<string, WsStory>
  setup: Partial<Record<SellerId, WsSetup>>
  /** Prototype hours since the session began; Story lifetimes read it, so expiry is deterministic and demonstrable. */
  clockHours: number
}
type Action =
  | { type: 'product'; item: WsProduct } | { type: 'scene'; item: WsScene } | { type: 'story'; item: WsStory }
  | { type: 'remove'; collection: 'products' | 'scenes' | 'stories'; id: string }
  | { type: 'setup'; seller: SellerId; setup: WsSetup } | { type: 'clock'; hours: number } | { type: 'reset' }

const KEY = 'adulis.seller-workspace.v1'
const EMPTY: WorkspaceState = { products: {}, scenes: {}, stories: {}, setup: {}, clockHours: 0 }

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'product': return { ...state, products: { ...state.products, [action.item.id]: action.item } }
    case 'scene': return { ...state, scenes: { ...state.scenes, [action.item.id]: action.item } }
    case 'story': return { ...state, stories: { ...state.stories, [action.item.id]: action.item } }
    case 'remove': { const next = { ...state[action.collection] }; delete next[action.id]; return { ...state, [action.collection]: next } }
    case 'setup': return { ...state, setup: { ...state.setup, [action.seller]: action.setup } }
    case 'clock': return { ...state, clockHours: Math.max(0, state.clockHours + action.hours) }
    case 'reset': return EMPTY
  }
}

const load = (): WorkspaceState => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? 'null') } } catch { return EMPTY } }

const Ctx = createContext<{ state: WorkspaceState; dispatch: Dispatch<Action>; next: (kind: 'product' | 'scene' | 'story') => string }>({ state: EMPTY, dispatch: () => {}, next: () => '' })

export function SellerWorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, load)
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota: the workspace still works until reload */ } }, [state])
  // Ids come from a counter in the state, so they are stable and readable (PRD-NEW-001), never random.
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

// ---------- Derived rules (no state of their own) ----------

export const parseMoney = (text: string): number | null => {
  const t = text.trim().replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null
  const value = Math.round(Number(t) * 100)
  return value > 0 ? value : null
}
export const parseCount = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null)
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
  if (!p.variants.length && parseMoney(p.price) === null) issues.push({ field: 'price', message: 'Enter a price above zero, such as 2450 or 2450.50.' })
  if (!p.variants.length && parseCount(p.stock) === null) issues.push({ field: 'stock', message: 'Enter the available quantity as a whole number (0 is allowed).' })
  p.variants.forEach(v => {
    if (v.price.trim() && parseMoney(v.price) === null) issues.push({ field: `variant:${v.key}`, message: `${v.label}: price must be above zero.` })
    if (parseCount(v.stock) === null) issues.push({ field: `variant:${v.key}`, message: `${v.label}: enter the quantity as a whole number.` })
  })
  if (p.variants.length && !p.variants.some(v => parseMoney(v.price || p.price) !== null)) issues.push({ field: 'price', message: 'Set a base price or a price on at least one Variant.' })
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

/** A Scene's effective Buyer visibility (rules 1.7, 1.9): Private while every tagged Product is unavailable; public again on its own. */
export function sceneVisibility(scene: WsScene, state: WorkspaceState, at: Moment): 'draft' | 'public' | 'private' {
  if (scene.status === 'draft') return 'draft'
  return scene.tags.some(tag => productAvailableNow(state, tag.product, scene.seller, at)) ? 'public' : 'private'
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
