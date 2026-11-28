import { useState } from 'react'
import { AdulisLogo } from '../App'
import { StoryProvider, useStory } from '../StoryClock'
import { linkableProducts, productStock, sceneVisibility, stockState, useWorkspace } from '../seller-workspace'
import { describeMethods, sellerMethods } from '../fulfilment'
import { usePrototypeMode } from '../prototype-mode'
import { isLegacy } from '../marketplace/registry'
import { getSelectedSeller, setSelectedSeller } from '../selected-seller'
import { useSim } from '../simulation/store'
import { REPUTATION } from '../demo-data/reputation'
import { priceLabel, taxonomyOf } from './buyer-authored'
import { SceneExplorer } from './MobileBuyer'
import { InstallPrompt, PublicSearch, PublicShareSheet, SellersView, UnavailableView } from './storefront-public'
import { installMessage, publicUrl, type PublicLink } from '../public-web'
import {
  BUYERS, MARKET, ORDERS, REVIEWS, SURFACE_DEFAULTS,
  activeDiscount, currentPrice, describeFulfilment, formatClockShort, formatCompactCount, formatDate, formatEtb, formatMonthShortYear, formatMonthYear,
  fulfilmentOptionsAt, initials, isBuyerVisiblePostAt, onAdulisSince, productQualityAt, reviewsAt, sellerCompletedOrdersAt, sellerPostsAt,
  sellerProductsAt, sellerServiceAt, shortName, buyerVisibleSellers, trustAt, trustLabel,
  type Availability, type Moment, type ProductId, type SellerId, type ShoppablePostId,
} from '../demo-data'
import { LIVE_POSTS as SHOPPABLE_POSTS, LIVE_PRODUCTS as PRODUCTS, LIVE_SELLERS as SELLERS, isUnpublishedSeeded } from '../demo-data/live'

/* ─────────────────────────────────────
   DATA — read from the canonical demo data (src/demo-data) at the story moment
───────────────────────────────────── */
// Placeholder tile backgrounds, assigned by position. They depict no Product or post.
const TILE_BACKGROUNDS = [
  'linear-gradient(135deg, #F5EBE0 0%, #E8D5BE 100%)',
  'linear-gradient(135deg, #F7E8C8 0%, #E8CC88 100%)',
  'linear-gradient(135deg, #E8F0E8 0%, #C8DCC8 100%)',
  'linear-gradient(135deg, #F0EDE8 0%, #E0D8CC 100%)',
  'linear-gradient(135deg, #EAE0F0 0%, #C8B8DC 100%)',
  'linear-gradient(135deg, #E8E0D8 0%, #C8BEB4 100%)',
]
const POST_BACKGROUNDS = [
  'linear-gradient(135deg, #C2622D 0%, #943F1A 100%)',
  'linear-gradient(135deg, #4A7C59 0%, #2D5940 100%)',
  'linear-gradient(135deg, #7A5C3A 0%, #4A3420 100%)',
]

interface Product {
  id: ProductId
  name: string
  /** The price a new Order pays now: the active discounted price, otherwise the regular price. */
  price: string
  /** The regular price, while an active demo discount applies. */
  regularPrice?: string
  discount?: { percent: number; ends?: string }
  locallyMade: boolean
  availability: Availability
  quality: { average: number; ratings: number } | null | undefined
  imgBg: string
  imgLabel: string
  description?: string
  variants: { label: string; options: readonly string[] }[]
  attributes: { label: string; value: string }[]
}

interface ShoppablePost {
  id: ShoppablePostId
  imgBg: string
  title: string
  caption: string
  taggedProducts: ProductId[]
  hasHotspot: boolean
  zeroProduct: boolean
  /** No photograph yet (the marketplace dataset has none): the tile says so. */
  pending: boolean
}

interface Review {
  buyer: string
  products: { id: ProductId; name: string; rating: number }[]
  ss: number
  date: string
  text: string
}

// The Storefront's Seller, Products, published posts and Reviews at the current story moment.
function useStorefront() {
  const story = useStory()
  const at = story.moment
  const sellerId = story.seller ?? SURFACE_DEFAULTS.seller
  const seller = SELLERS[sellerId]
  const { state: workspace } = useWorkspace()
  const { simulation } = usePrototypeMode()
  if (!isLegacy) useSim() // eslint-disable-line react-hooks/rules-of-hooks -- isLegacy is a module constant. SIM-003: re-render when a simulated review lands
  const seededProducts: Product[] = sellerProductsAt(sellerId, at).filter(id => !isUnpublishedSeeded(id)).map((id, index) => {
    const p = PRODUCTS[id]
    const discount = activeDiscount(id)
    return {
      id, name: p.name, price: formatEtb(currentPrice(id)), availability: p.availability, quality: productQualityAt(id, at),
      regularPrice: discount && formatEtb(p.price), discount: discount && { percent: discount.percent, ends: discount.ends && formatDate(discount.ends) },
      locallyMade: p.locallyMade,
      imgBg: TILE_BACKGROUNDS[index % TILE_BACKGROUNDS.length], imgLabel: initials(p.name), description: p.description,
      // DEMO_DATA gives attributes without labels, and some variant groups without a name.
      variants: p.variants.map(group => ({ label: group.name ?? '—', options: group.options })),
      attributes: p.attributes.map(value => ({ label: '—', value })),
    }
  })
  // SF-001: Products and Scenes this Seller authored in the Seller Console. The photo is the tile's background image.
  const cover = (src: string | undefined, fallback: string) => (src ? `url("${src}") center / cover no-repeat` : fallback)
  const authoredProducts: Product[] = Object.values(workspace.products).filter(p => !p.seeded && p.status === 'published' && p.seller === sellerId).map((p, index) => ({
    id: p.id as ProductId, name: p.name, price: priceLabel(p), availability: stockState(productStock(p)), quality: null, locallyMade: p.locallyMade,
    imgBg: cover(p.photos[0], TILE_BACKGROUNDS[index % TILE_BACKGROUNDS.length]), imgLabel: p.photos[0] ? '' : initials(p.name), description: p.description,
    variants: p.options.map(o => ({ label: o.name, options: o.values })),
    attributes: [...(taxonomyOf(p) ? [{ label: 'Category', value: taxonomyOf(p)!.label }] : []), ...Object.entries(p.attributes).filter(([, v]) => v).map(([label, value]) => ({ label, value })), ...p.customAttributes.filter(a => a.value).map(a => ({ label: a.name || '—', value: a.value }))],
  }))
  const products: Product[] = [...authoredProducts, ...seededProducts]
  const live = new Set(linkableProducts(workspace, sellerId, at).map(p => p.id))
  const authoredPosts: ShoppablePost[] = Object.values(workspace.scenes).filter(scene => scene.seller === sellerId && sceneVisibility(scene, workspace, at) === 'public').sort((a, b) => b.updated - a.updated).map((scene, index) => ({
    id: scene.id as ShoppablePostId, imgBg: cover(scene.image ?? undefined, POST_BACKGROUNDS[index % POST_BACKGROUNDS.length]), title: scene.caption, caption: scene.caption,
    taggedProducts: scene.tags.map(tag => tag.product as ProductId).filter(id => live.has(id)), hasHotspot: scene.tags.length > 0, zeroProduct: false, pending: !scene.image,
  }))
  // Its public Scenes: a Scene whose tagged Products are all unavailable is Private and not shown (isBuyerVisiblePostAt).
  const seededPosts: ShoppablePost[] = sellerPostsAt(sellerId, at).filter(id => isBuyerVisiblePostAt(id, at)).map((id, index) => {
    const post = SHOPPABLE_POSTS[id]
    return { id, imgBg: POST_BACKGROUNDS[index % POST_BACKGROUNDS.length], title: post.title, caption: post.caption, taggedProducts: [...post.tags], hasHotspot: post.hotspots > 0, zeroProduct: post.tags.length === 0, pending: !isLegacy && post.positioned === false }
  })
  const posts: ShoppablePost[] = [...authoredPosts, ...seededPosts]
  // SIM-003: on the marketplace dataset the Seller's reviews are the simulation's visible ones (none in the current MVP, where the feed is not published).
  const feed = REPUTATION.current
  const reviews: Review[] = isLegacy ? reviewsAt({ seller: sellerId }, at).map(id => {
    const review = REVIEWS[id]
    const written = review.written
    return {
      buyer: shortName(BUYERS[ORDERS[review.order].buyer].name),
      products: review.productQuality.map(q => ({ id: q.product, name: PRODUCTS[q.product].name, rating: q.rating })),
      ss: review.sellerService,
      date: formatMonthShortYear(typeof written === 'string' ? written : written.at),
      text: review.text,
    }
  }) : feed ? feed.sellerReviews(sellerId).map(r => ({
    buyer: shortName(BUYERS[r.buyer as keyof typeof BUYERS].name), products: (r.products ?? []).map(id => ({ id: id as ProductId, name: PRODUCTS[id as ProductId].name, rating: 0 })),
    ss: r.rating, date: formatMonthShortYear(r.written), text: r.simulated ? `${r.text} (Simulated review, not a verified purchase)` : r.text,
  })) : []
  return {
    story, sellerId, seller, products, posts, reviews,
    trust: trustLabel(trustAt(sellerId, at)),
    service: sellerServiceAt(sellerId, at),
    completed: sellerCompletedOrdersAt(sellerId, at),
    fulfilment: describeMethods(sellerMethods(workspace, sellerId, at, simulation).methods),
    location: `${seller.area}, ${MARKET.city}`,
    // A physical place only where the Seller gives Buyers one (Buyer Collection); a physical storefront isn't required.
    collectionPoint: seller.buyerCollection && `${seller.buyerCollection.place} · ${seller.buyerCollection.hours}`,
    since: formatMonthYear(onAdulisSince(sellerId)),
  }
}

/* ─────────────────────────────────────
   ROUTING TYPES
───────────────────────────────────── */
// The Seller profile's tabs, Scenes first and by default (PR-002); the Buyer app's Seller profile uses the same ones.
type TabKey = 'scenes' | 'products' | 'reviews' | 'about'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'scenes', label: 'Scenes' },
  { key: 'products', label: 'Products' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'about', label: 'About' },
]
type EntryMode = 'bio-link' | 'product-link' | 'shoppable-link'
type Screen =
  | { type: 'storefront'; tab: TabKey }
  /** `from`: the Scene a Product was opened from, so Back returns to it. */
  | { type: 'product-detail'; productId: ProductId; from?: ShoppablePostId }
  /** `product`: the Product selected in the Scene (Explore the Scene). */
  | { type: 'post-detail'; postId: ShoppablePostId; product?: ProductId | null }
  | { type: 'search' }
  | { type: 'sellers' }
  | { type: 'unavailable' }
/** Where a Seller's Storefront opens: a shared link's Scene and Product, or a link that names nothing public. */
type Landing = { scene?: string; product?: string; bad?: boolean }

/* ─────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────── */
/** The Seller a record belongs to, when it exists at all (its being public is decided separately). */
const own = (record: object, id: string) => Object.prototype.hasOwnProperty.call(record, id)
const ownerOf = (link: PublicLink): string | undefined => (link.scene && own(SHOPPABLE_POSTS, link.scene) ? SHOPPABLE_POSTS[link.scene as ShoppablePostId].seller : link.product && own(PRODUCTS, link.product) ? PRODUCTS[link.product as ProductId].seller : undefined)

export default function SellerStorefront({ demoTarget, link, onHome }: { demoTarget?: string; link?: PublicLink; onHome?: () => void }) {
  // The prototype toolbar chooses the social entry and the public Storefront shown: the step's Seller first (the
  // default Seller otherwise), then any primary showcase Seller. The phone reads the chosen Seller from the story.
  const story = useStory()
  const initialEntry: EntryMode = demoTarget === 'product' ? 'product-link' : demoTarget === 'shoppable' ? 'shoppable-link' : 'bio-link'
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntry)
  // Choosing an entry, even the current one, opens it again from its first screen.
  const [entryCount, setEntryCount] = useState(0)
  // COMP-003: the Seller chosen on another surface, when it has a public Storefront (a draft or suspended store has none) and no guided step names one.
  const picked = getSelectedSeller() as SellerId | undefined
  // WEB-002: a shared public link. Its Seller must be a public one (Active); Scene and Product are checked against that Storefront's own public lists, so a crafted link
  // reaches nothing hidden (Draft or Suspended Seller, Draft Product, Private or Archived Scene) and says only "not available".
  const [entry] = useState(() => {
    if (!link || link.surface !== 'storefront') return undefined
    const named = link.seller ?? ownerOf(link)
    const bad = !!link.bad || (!!(link.seller || link.scene || link.product) && !(named && buyerVisibleSellers().includes(named as SellerId)))
    return { seller: bad ? undefined : (named as SellerId | undefined), landing: { scene: link.scene, product: link.product, bad } satisfies Landing }
  })
  const [landing, setLanding] = useState<Landing | undefined>(entry?.landing)
  const [sellerId, setSellerId] = useState<SellerId>(story.seller ?? entry?.seller ?? (picked && buyerVisibleSellers().includes(picked) ? picked : SURFACE_DEFAULTS.seller))
  const chooseSeller = (id: SellerId) => { setSelectedSeller(id); setSellerId(id); setLanding(undefined) }
  // From a Search result or the Sellers directory: another public Storefront, opened on that Scene or Product.
  const openSeller = (id: SellerId, to?: Landing) => { chooseSeller(id); setLanding(to); setEntryMode('bio-link'); setEntryCount(count => count + 1) }
  const handleEntryChange = (mode: EntryMode) => {
    setEntryMode(mode)
    setLanding(undefined)
    setEntryCount(count => count + 1)
  }
  const pillStyle = (active: boolean) => ({
    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: active ? 'var(--color-brand)' : 'var(--color-surface-raised)',
    color: active ? 'var(--color-on-brand)' : 'var(--color-text-muted)',
  })

  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Prototype toolbar ── */}
      <div className="storefront-toolbar" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>04 — SELLER STOREFRONT · SOCIAL ENTRY</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {([
            { mode: 'bio-link' as EntryMode,       label: 'Bio Link → Storefront' },
            { mode: 'product-link' as EntryMode,   label: 'Product Link → Direct' },
            { mode: 'shoppable-link' as EntryMode, label: 'Scene Link → Direct' },
          ]).map(opt => (
            <button
              key={opt.mode}
              onClick={() => handleEntryChange(opt.mode)}
              style={pillStyle(entryMode === opt.mode)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="storefront-toolbar" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>PROTOTYPE · STOREFRONT SELLER</span>
        <div className="storefront-seller-pills" style={{ display: 'flex', gap: 6, marginLeft: 8, flexWrap: 'wrap', minWidth: 0 }}>
          {buyerVisibleSellers().map(id => (
            <button key={id} onClick={() => chooseSeller(id)} aria-pressed={sellerId === id} style={pillStyle(sellerId === id)}>
              {SELLERS[id].name}
            </button>
          ))}
        </div>
      </div>

      {/* Keyed by Seller and entry: the phone opens the chosen Storefront from the chosen entry's first screen. */}
      <StoryProvider stage={{ ...story, seller: sellerId }}>
        <StorefrontStage key={`${sellerId}:${entryMode}:${entryCount}`} entryMode={entryMode} landing={landing} onOpenSeller={openSeller} onHome={onHome} />
      </StoryProvider>
    </div>
  )
}

/* ─────────────────────────────────────
   STOREFRONT STAGE — the 390px phone, for the chosen Seller
───────────────────────────────────── */
function StorefrontStage({ entryMode, landing, onOpenSeller, onHome }: { entryMode: EntryMode; landing?: Landing; onOpenSeller: (id: SellerId, to?: Landing) => void; onHome?: () => void }) {
  const { story, seller, sellerId, products, posts } = useStorefront()
  // The step's Product and post when they belong to this Seller's Storefront (the surface defaults otherwise),
  // else the Seller's first Product and first published post.
  const linkedProduct = [story.focus?.product, SURFACE_DEFAULTS.product].find(id => products.some(p => p.id === id)) ?? products[0]?.id
  const linkedPost = [story.focus?.post, SURFACE_DEFAULTS.post].find(id => posts.some(p => p.id === id)) ?? posts[0]?.id
  // A shared link's Scene and Product, checked against what this Storefront shows publicly: anything else is "not available".
  const fromLanding = (to: Landing): Screen => {
    const unavailable: Screen = { type: 'unavailable' }
    if (to.bad) return unavailable
    const post = to.scene ? posts.find(p => p.id === to.scene) : undefined
    const product = to.product ? products.find(p => p.id === to.product) : undefined
    if ((to.scene && !post) || (to.product && !product)) return unavailable
    if (post) return product && !post.taggedProducts.includes(product.id) ? unavailable : { type: 'post-detail', postId: post.id, product: product?.id ?? null }
    if (product) return { type: 'product-detail', productId: product.id }
    return { type: 'storefront', tab: 'scenes' }
  }
  const initialScreen: Screen = landing ? fromLanding(landing) : entryMode === 'product-link' && linkedProduct ? { type: 'product-detail', productId: linkedProduct } : entryMode === 'shoppable-link' && linkedPost ? { type: 'post-detail', postId: linkedPost } : { type: 'storefront', tab: 'scenes' }
  const [screen, setScreen] = useState<Screen>(initialScreen)
  // WEB-002: the Install prompt's headline (null while closed) and the share sheet. Neither touches any account or Buyer state.
  const [prompt, setPrompt] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const openInAdulis = (note = 'Open this in the Adulis app') => setPrompt(note)
  const shareLink = { surface: 'storefront' as const, seller: sellerId, ...(screen.type === 'post-detail' ? { scene: screen.postId, ...(screen.product ? { product: screen.product } : {}) } : screen.type === 'product-detail' ? { product: screen.productId } : {}) }
  const shareTitle = screen.type === 'post-detail' ? (posts.find(p => p.id === screen.postId)?.title ?? seller.name) : screen.type === 'product-detail' ? (products.find(p => p.id === screen.productId)?.name ?? seller.name) : seller.name

  const navigate = (s: Screen) => setScreen(s)
  const toStorefront = (tab: TabKey = 'scenes') => setScreen({ type: 'storefront', tab })
  const goBack = () => {
    if (screen.type === 'product-detail') setScreen(screen.from ? { type: 'post-detail', postId: screen.from, product: screen.productId } : { type: 'storefront', tab: 'products' })
    else if (screen.type !== 'storefront') toStorefront(screen.type === 'post-detail' ? 'scenes' : screen.type === 'search' || screen.type === 'sellers' ? 'scenes' : 'products')
  }
  // The same Storefront's own record opens in place; another Seller's opens that Storefront on it.
  const product = screen.type === 'product-detail' ? products.find(p => p.id === screen.productId) : undefined
  const post = screen.type === 'post-detail' ? posts.find(p => p.id === screen.postId) : undefined

  return (
    <>
      {/* ── Phone frame ── */}
      <div className="storefront-stage" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '32px 24px', background: 'var(--color-background)' }}>
        <div>
          <p style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            {seller.name} Storefront · 390px
          </p>
          <div className="storefront-phone" style={{ width: 390, height: 844, borderRadius: 44, boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border-strong)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* status bar */}
            <StatusBar clock={formatClockShort(story.moment.at)} />

            {/* content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {screen.type === 'storefront' && (
                <StorefrontView
                  tab={screen.tab}
                  setTab={t => setScreen({ type: 'storefront', tab: t })}
                  navigate={navigate}
                  onOpenAdulisApp={openInAdulis}
                  onHome={onHome}
                  onSellers={() => setScreen({ type: 'sellers' })}
                  onShare={() => setSharing(true)}
                />
              )}
              {screen.type === 'product-detail' && product && (
                <ProductDetailView
                  product={product}
                  onBack={goBack}
                  onOpenAdulisApp={openInAdulis}
                  onSeller={() => toStorefront()}
                  onShare={() => setSharing(true)}
                />
              )}
              {screen.type === 'post-detail' && post && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* WEB-003: Explore the Scene is the Buyer's own explorer, read-only here (no Reviews, no More): same numbers, availability and selection. */}
                  <SceneExplorer
                    postId={post.id}
                    at={story.moment}
                    selected={screen.product ?? null}
                    linkSeller
                    onSelect={id => setScreen({ type: 'post-detail', postId: post.id, product: id })}
                    onBack={goBack}
                    onSeller={() => toStorefront()}
                    onShare={() => setSharing(true)}
                    onView={id => setScreen({ type: 'product-detail', productId: id, from: post.id })}
                  />
                  <div data-scene-actions style={{ display: 'flex', gap: 8, padding: '8px 12px 10px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
                    {([['like', 'Like', 'this Scene'], ['save', 'Save', 'this Scene'], ['chat', 'Chat', seller.name]] as const).map(([action, label, what]) => (
                      <button key={action} onClick={() => openInAdulis(installMessage(action, what))} aria-label={action === 'chat' ? `Chat with ${seller.name}` : `${label} this Scene`} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {screen.type === 'search' && (
                <PublicSearch
                  at={story.moment}
                  onBack={goBack}
                  onProduct={(owner, id) => (owner === sellerId ? setScreen({ type: 'product-detail', productId: id }) : onOpenSeller(owner, { product: id }))}
                  onScene={(owner, id) => (owner === sellerId ? setScreen({ type: 'post-detail', postId: id, product: null }) : onOpenSeller(owner, { scene: id }))}
                  onSeller={id => (id === sellerId ? toStorefront() : onOpenSeller(id))}
                />
              )}
              {screen.type === 'sellers' && <SellersView current={sellerId} onBack={goBack} onOpen={id => (id === sellerId ? toStorefront() : onOpenSeller(id))} />}
              {(screen.type === 'unavailable' || (screen.type === 'product-detail' && !product) || (screen.type === 'post-detail' && !post)) && (
                <UnavailableView onHome={() => (onHome ? onHome() : toStorefront())} onSellers={() => setScreen({ type: 'sellers' })} />
              )}
            </div>

            {/* The Install prompt and the share sheet, over the phone. */}
            {prompt !== null && <InstallPrompt message={prompt} onClose={() => setPrompt(null)} />}
            {sharing && <PublicShareSheet title={shareTitle} url={publicUrl(shareLink, location)} onClose={() => setSharing(false)} />}
          </div>
        </div>
      </div>
    </>
  )
}

/* ─────────────────────────────────────
   STATUS BAR
───────────────────────────────────── */
function StatusBar({ clock }: { clock: string }) {
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, background: 'var(--color-surface)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{clock}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none"><rect x="0" y="7" width="3" height="4" rx="0.8" fill="var(--color-text-primary)"/><rect x="4.5" y="5" width="3" height="6" rx="0.8" fill="var(--color-text-primary)"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.8" fill="var(--color-text-primary)"/><rect x="13.5" y="0" width="3" height="11" rx="0.8" fill="var(--color-text-primary)" opacity="0.3"/></svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none"><path d="M7.5 9a1 1 0 100-2 1 1 0 000 2z" fill="var(--color-text-primary)"/><path d="M4.3 6.2a4.5 4.5 0 016.4 0" stroke="var(--color-text-primary)" strokeWidth="1.4" strokeLinecap="round"/><path d="M1.6 3.8a8.2 8.2 0 0111.8 0" stroke="var(--color-text-primary)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/></svg>
        <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="var(--color-text-primary)" strokeOpacity="0.35"/><rect x="2" y="2" width="16" height="7" rx="1.5" fill="var(--color-text-primary)"/><path d="M22 3.5v4a2 2 0 000-4z" fill="var(--color-text-primary)" fillOpacity="0.4"/></svg>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   STOREFRONT VIEW
───────────────────────────────────── */
function StorefrontView({ tab, setTab, navigate, onOpenAdulisApp, onHome, onSellers, onShare }: {
  tab: TabKey
  setTab: (t: TabKey) => void
  navigate: (s: Screen) => void
  onOpenAdulisApp: (note?: string) => void
  onHome?: () => void
  onSellers: () => void
  onShare: () => void
}) {
  const { seller } = useStorefront()
  return (
    <>
      <StorefrontHeader onSearch={() => navigate({ type: 'search' })} onOpenAdulisApp={onOpenAdulisApp} onHome={onHome} onSellers={onSellers} onShare={onShare} />
      <div role="tablist" aria-label={`${seller.name} Storefront`} style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 0', fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? 'var(--color-brand-text)' : 'var(--color-text-muted)',
              background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative',
            }}
          >
            {t.label}
            {tab === t.key && <span style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: 'var(--color-brand)', borderRadius: 999 }} />}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={TABS.find(t => t.key === tab)?.label} style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'scenes'   && <ScenesTab navigate={navigate} />}
        {tab === 'products' && <ProductsTab navigate={navigate} />}
        {tab === 'reviews'  && <ReviewsTab />}
        {tab === 'about'    && <AboutTab onOpenAdulisApp={() => onOpenAdulisApp()} />}
      </div>
    </>
  )
}

function StorefrontHeader({ onSearch, onOpenAdulisApp, onHome, onSellers, onShare }: { onSearch: () => void; onOpenAdulisApp: (note?: string) => void; onHome?: () => void; onSellers: () => void; onShare: () => void }) {
  const { seller, trust, products, posts, service } = useStorefront()
  return (
    <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '14px 18px 12px', flexShrink: 0 }}>
      {/* WEB-002: the Adulis logo opens the public Adulis Home (a link on the real web; here the shell's section switch). Nothing private goes with it. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button onClick={onHome} disabled={!onHome} aria-label="Adulis Home" data-adulis-home style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: onHome ? 'pointer' : 'default', color: 'var(--color-text-primary)' }}>
          <AdulisLogo size={22} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Adulis</span>
        </button>
        <button onClick={onSellers} data-open-sellers style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-brand-text)', fontSize: 12, fontWeight: 700 }}>Sellers</button>
      </div>
      {/* top row: identity + actions */}
      <div className="storefront-identity-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div className="storefront-identity" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-brand-text)', flexShrink: 0 }}>
            {initials(seller.name)}
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>{seller.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <TrustBadge level={trust} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{seller.handle} · {seller.category}</p>
          </div>
        </div>

        <div className="storefront-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexShrink: 0 }}>
          {/* Search */}
          <CircleBtn label="Search" onClick={onSearch}>
            <IcoSearch />
          </CircleBtn>
          {/* Share */}
          <CircleBtn label="Share" onClick={onShare}>
            <IcoShare />
          </CircleBtn>
          {/* Open Adulis */}
          <button
            onClick={() => onOpenAdulisApp()}
            className="storefront-open-adulis"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999, background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
          >
            <AdulisLogo size={12} />
            <span>Open Adulis</span>
          </button>
        </div>
      </div>

      {/* bio */}
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '10px 0 0', lineHeight: 1.55 }}>
        {seller.bio ?? '—'}
      </p>

      {/* Follow and Message happen in the Adulis app: on this public page they open it. */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => onOpenAdulisApp(installMessage('follow', seller.name))} style={{ flex: 1, padding: '8px 0', borderRadius: 999, background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          Follow
        </button>
        <button onClick={() => onOpenAdulisApp(installMessage('chat', seller.name))} style={{ flex: 1, padding: '8px 0', borderRadius: 999, background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          Chat
        </button>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
        {[
          { value: String(posts.length), label: 'Scenes' },
          { value: String(products.length), label: 'Products' },
          { value: service ? `${service.average} ★` : '—', label: 'Seller Service' },
          { value: seller.followers === undefined ? '—' : formatCompactCount(seller.followers), label: 'Followers' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   SCENES TAB — the Seller's public Scenes, first and by default (PR-002)
───────────────────────────────────── */
function ScenesTab({ navigate }: { navigate: (s: Screen) => void }) {
  const { posts } = useStorefront()
  if (posts.length === 0) {
    return <p style={{ padding: '40px 24px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>No Scenes published yet.</p>
  }
  const [featured, ...rest] = posts
  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <SceneCard post={featured} height={280} withCaption onOpen={() => navigate({ type: 'post-detail', postId: featured.id })} />
      {rest.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {rest.map(post => <SceneCard key={post.id} post={post} height={230} onOpen={() => navigate({ type: 'post-detail', postId: post.id })} />)}
        </div>
      )}
    </div>
  )
}

function SceneCard({ post, height, withCaption, onOpen }: { post: ShoppablePost; height: number; withCaption?: boolean; onOpen: () => void }) {
  const tagged = post.taggedProducts.length
  return (
    <button
      onClick={onOpen}
      aria-label={`Scene: ${post.title}`}
      style={{ display: 'block', width: '100%', height, background: post.imgBg, borderRadius: 16, border: 'none', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', padding: 0, position: 'relative' }}
    >
      <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: post.zeroProduct ? 'rgba(0,0,0,0.45)' : 'var(--color-brand)', color: post.zeroProduct ? '#fff' : 'var(--color-on-brand)', padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
        {post.zeroProduct ? 'Scene' : `${tagged} product${tagged === 1 ? '' : 's'} tagged`}
      </span>
      {post.pending && <span style={{ position: 'absolute', top: '45%', left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Photo pending</span>}
      {post.hasHotspot && (
        <span aria-hidden="true" style={{ position: 'absolute', top: '38%', right: '25%', width: 22, height: 22, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          <span style={{ width: 8, height: 8, background: 'var(--color-brand)', borderRadius: '50%' }} />
        </span>
      )}
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '28px 12px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <span style={{ display: 'block', fontSize: withCaption ? 15 : 12, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{post.title}</span>
        {withCaption && <span style={{ display: '-webkit-box', marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.caption}</span>}
      </span>
    </button>
  )
}

/* ─────────────────────────────────────
   PRODUCTS TAB — the Seller's catalogue, available first
───────────────────────────────────── */
function ProductsTab({ navigate }: { navigate: (s: Screen) => void }) {
  const { products } = useStorefront()
  const sorted = [...products.filter(p => p.availability !== 'Out of Stock'), ...products.filter(p => p.availability === 'Out of Stock')]
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {sorted.map(p => (
        <button
          key={p.id}
          onClick={() => navigate({ type: 'product-detail', productId: p.id })}
          style={{ background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        >
          {/* image */}
          <div style={{ height: 130, background: p.imgBg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{p.imgLabel}</span>
            {p.discount && (
              <span style={{ position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, background: 'var(--color-brand)', color: 'var(--color-on-brand)', padding: '2px 7px', borderRadius: 999 }}>−{p.discount.percent}%</span>
            )}
            {p.availability === 'Out of Stock' && (
              <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-surface) 55%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '3px 8px', borderRadius: 999 }}>Out of Stock</span>
              </div>
            )}
          </div>
          {/* info */}
          <div style={{ padding: '10px 10px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 3px', lineHeight: 1.3 }}>{p.name}</p>
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-brand-text)', margin: '0 0 5px' }}>{p.price}{p.regularPrice && <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{p.regularPrice}</span>}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AvailBadge avail={p.availability} />
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>★ {qualityText(p.quality)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────
   REVIEWS TAB
───────────────────────────────────── */
function ReviewsTab() {
  // The Seller profile's Reviews are Seller Reviews: the Seller Service aggregate (the approved figure, never an average
  // of the visible reviews) and the reviews of this Seller's Orders. Product Quality belongs to each Product (PR-002).
  const { reviews, service } = useStorefront()

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>Seller Reviews</h2>
      {/* Summary */}
      <div style={{ background: 'var(--color-surface-raised)', borderRadius: 14, padding: 14, marginBottom: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Seller Service</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 2px', fontFamily: 'var(--font-display)' }}>{service ? service.average : '—'}</p>
        {service && <StarRow rating={service.average} />}
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
          {service ? service.ratings : '—'} verified buyer ratings
        </p>
      </div>

      {reviews.map((r, i) => (
        <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-brand-text)' }}>
                {r.buyer[0]}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{r.buyer}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>Bought {r.products.map(p => p.name).join(' · ')}</p>
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.date}</span>
          </div>
          <div aria-label={`Seller Service ${r.ss} out of 5`} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Seller Service</span>
            <span aria-hidden="true" style={{ display: 'flex', gap: 2 }}>{Array.from({ length: 5 }).map((_, j) => <span key={j} style={{ fontSize: 11, color: j < r.ss ? '#E8874A' : 'var(--color-border-strong)' }}>★</span>)}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{r.text}</p>
        </div>
      ))}
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>Product Quality ratings are shown on each Product.</p>
    </div>
  )
}

/* ─────────────────────────────────────
   ABOUT TAB
───────────────────────────────────── */
function AboutTab({ onOpenAdulisApp }: { onOpenAdulisApp: () => void }) {
  const { seller, trust, service, completed, fulfilment, location, collectionPoint, since } = useStorefront()
  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>About {seller.name}</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>{seller.bio ?? '—'}</p>

      {/* Trust card */}
      <div style={{ background: 'var(--color-success-bg)', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #c8e6d4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v5c0 4 3 6.5 6 7.5 3-1 6-3.5 6-7.5V4L8 1z" fill="var(--color-success)"/></svg>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-success)' }}>{trust} Seller</span>
        </div>
        {/* Level-neutral: the Seller's actual Trust level shows, whatever it is (rule 14.6). */}
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.55 }}>
          Trust level based on fulfilment, verified buyer reviews and claims outcomes. Updated by Adulis based on seller performance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {/* DEMO_DATA defines no Seller-level Product Quality and no claim rate. */}
          {[
            { label: 'Avg Product Quality', value: '—' },
            { label: 'Avg Seller Service', value: service ? `${service.average} ★` : '—' },
            { label: 'Orders Fulfilled', value: completed === undefined ? '—' : String(completed) },
            { label: 'Claim Rate', value: '—' },
          ].map(s => (
            <div key={s.label} style={{ background: 'color-mix(in srgb, var(--color-surface) 65%, transparent)', borderRadius: 8, padding: '7px 9px' }}>
              <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info rows */}
      {[
        { label: 'Category', value: seller.category },
        { label: 'Based in', value: location },
        ...(collectionPoint ? [{ label: 'Collection point', value: collectionPoint }] : []),
        { label: 'Fulfilment', value: fulfilment },
        { label: 'Member since', value: since },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>{row.label}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}

      {/* Social */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Social</p>
        {(seller.socialAccounts ?? []).map(label => ({ icon: label === 'Instagram' ? '📸' : '🎵', label, handle: seller.handle })).map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: 'var(--color-brand-text)', margin: 0 }}>{s.handle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Open Adulis CTA */}
      <button
        onClick={onOpenAdulisApp}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 14, background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
      >
        <AdulisLogo size={18} />
        Open in Adulis App
      </button>
    </div>
  )
}

/* ─────────────────────────────────────
   PRODUCT DETAIL VIEW
───────────────────────────────────── */
function ProductDetailView({ product, onBack, onOpenAdulisApp, onSeller, onShare }: {
  product: Product
  onBack: () => void
  onOpenAdulisApp: (note?: string) => void
  onSeller: () => void
  onShare: () => void
}) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const { seller, trust, reviews, fulfilment } = useStorefront()
  // Reviews are matched to this Product by identifier.
  const productReviews = reviews.filter(review => review.products.some(p => p.id === product.id))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <IcoBack /> {seller.name}
        </button>
        <div style={{ flex: 1 }} />
        <CircleBtn label="Share" onClick={onShare}>
          <IcoShare />
        </CircleBtn>
      </div>

      {/* scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* product image */}
        <div style={{ height: 260, background: product.imgBg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{product.imgLabel}</span>
          {/* image dots */}
          <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: i === 0 ? 16 : 6, height: 6, borderRadius: 999, background: i === 0 ? '#fff' : 'rgba(255,255,255,0.45)' }} />)}
          </div>
        </div>

        {/* main info — DEMO_DATA records no product demo videos and no Product categories, so neither is shown. */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.2 }}>{product.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand-text)', margin: 0 }}>{product.price}</p>
                {product.quality && <StarRow rating={product.quality.average} small />}
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({product.quality ? product.quality.ratings : qualityText(product.quality)})</span>
              </div>
              {product.regularPrice && product.discount && (
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  <span style={{ textDecoration: 'line-through' }}>{product.regularPrice}</span> · {product.discount.percent}% off{product.discount.ends ? ` until ${product.discount.ends}` : ''}
                </p>
              )}
            </div>
            <AvailBadge avail={product.availability} />
          </div>

          {/* Seller trust row */}
          <button onClick={onSeller} data-seller-link aria-label={`Seller: ${seller.name}, open Storefront`} style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', background: 'var(--color-surface-raised)', borderRadius: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-brand-text)' }}>{initials(seller.name)}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{seller.name}</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>{seller.handle}</p>
            </div>
            <TrustBadge level={trust} small />
          </button>
          {/* Like, Save and Chat need an account: on this public page each opens the Install prompt and changes nothing. */}
          <div data-product-actions style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {([['like', 'Like', 'this Product'], ['save', 'Save', 'this Product'], ['chat', 'Chat', seller.name]] as const).map(([action, label, what]) => (
              <button key={action} onClick={() => onOpenAdulisApp(installMessage(action, what))} aria-label={action === 'chat' ? `Chat with ${seller.name}` : `${label} this Product`} style={{ flex: 1, padding: '9px 0', borderRadius: 999, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
        </div>

        {/* variants */}
        <div style={{ padding: '14px 16px 0' }}>
          {product.variants.map(v => (
            <div key={v.label} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{v.label}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {v.options.map(opt => {
                  const isSelected = selectedVariants[v.label] === opt
                  return (
                    <button
                      key={opt}
                      onClick={() => setSelectedVariants(sv => ({ ...sv, [v.label]: opt }))}
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: isSelected ? 700 : 400, border: `1.5px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`, background: isSelected ? 'var(--color-brand-muted)' : 'transparent', color: isSelected ? 'var(--color-brand-text)' : 'var(--color-text-secondary)', cursor: 'pointer' }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* description */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 6px' }}>Description</p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>{product.description ?? '—'}</p>
        </div>

        {/* attributes */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Details</p>
          {/* Explicit Locally made metadata only (rule 2.12). */}
          {product.locallyMade && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Locally made</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', maxWidth: '60%' }}>Yes</span>
            </div>
          )}
          {product.attributes.map(a => (
            <div key={a.value} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', maxWidth: '60%' }}>{a.value}</span>
            </div>
          ))}
        </div>

        {/* fulfilment */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Fulfilment</p>
          <div style={{ background: 'var(--color-surface-raised)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>🚴 {fulfilment}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>QR-verified pickup and delivery · Adulis Handoff system</p>
          </div>
        </div>

        {/* mini reviews */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>Reviews</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>PQ: <strong>★ {qualityText(product.quality)}</strong></span>
            </div>
          </div>
          {productReviews.slice(0, 2).map((r, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px', background: 'var(--color-surface-raised)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-brand-text)' }}>{r.buyer[0]}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.buyer}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>{r.date}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>{r.text}</p>
            </div>
          ))}
          {productReviews.length === 0 && (
            <div style={{ padding: '14px', background: 'var(--color-surface-raised)', borderRadius: 10, color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'center' }}>
              No verified reviews for this Product yet.
            </div>
          )}
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* sticky bottom CTA */}
      <div style={{ padding: '12px 16px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        {product.availability === 'Out of Stock' ? (
          <button disabled style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-border)', color: 'var(--color-text-muted)', border: 'none', fontWeight: 700, fontSize: 15 }}>
            Out of Stock
          </button>
        ) : (
          <button
            onClick={() => onOpenAdulisApp(installMessage('cart', 'this Product'))}
            style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <AdulisLogo size={18} />
            Add to Cart
          </button>
        )}
        <button onClick={() => onOpenAdulisApp()} style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: 'var(--color-brand-text)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginTop: 6, padding: 6 }}>Open in Adulis</button>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', margin: '2px 0 0' }}>
          No checkout on the web storefront · Ordering is not available yet; see the product in the Adulis app
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   MICRO COMPONENTS
───────────────────────────────────── */
function TrustBadge({ level, small }: { level: string; small?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: small ? '2px 6px' : '3px 8px', borderRadius: 999, fontSize: small ? 9 : 10, fontWeight: 700 }}>
      <svg width={small ? 8 : 10} height={small ? 8 : 10} viewBox="0 0 10 10" fill="currentColor">
        <path d="M5 1L1.5 2.5v3C1.5 7.5 3 9 5 9.5 7 9 8.5 7.5 8.5 5.5v-3L5 1z" />
      </svg>
      {level}
    </span>
  )
}

function AvailBadge({ avail }: { avail: Availability }) {
  const map: Record<Availability, { bg: string; color: string }> = {
    'Available':    { bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
    'Low Stock':    { bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
    'Out of Stock': { bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' },
  }
  const s = map[avail]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {avail}
    </span>
  )
}

/** A Product Quality average; 'No ratings yet' when DEMO_DATA says so, '—' when it records none. */
function qualityText(quality: Product['quality']) {
  return quality ? String(quality.average) : quality === null ? 'No ratings yet' : '—'
}

function StarRow({ rating, small }: { rating: number; small?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ fontSize: small ? 10 : 12, color: i < Math.round(rating) ? '#E8874A' : 'var(--color-border-strong)' }}>★</span>
      ))}
    </div>
  )
}

function CircleBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', flexShrink: 0 }}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────
   ICONS
───────────────────────────────────── */
function IcoBack() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IcoShare() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="11" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="3" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M4.5 6.2L9.5 3.8M4.5 7.8l5 2.4" stroke="currentColor" strokeWidth="1.3"/></svg>
}
function IcoSearch() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/><path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
}
