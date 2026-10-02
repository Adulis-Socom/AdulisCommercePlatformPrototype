import { useState } from 'react'
import { AdulisLogo } from '../App'

/* ─────────────────────────────────────
   DATA
───────────────────────────────────── */
const SELLER = {
  name: 'Addis Atelier',
  handle: '@addisatelier',
  category: 'Fashion',
  bio: 'Handcrafted Ethiopian fashion, made to order in Addis Ababa. Every piece carries the craft of a master tailor.',
  trustLevel: 'Established',
  location: 'Bole, Addis Ababa',
  fulfilment: 'Courier delivery within Addis Ababa · 1–3 business days',
  productCount: 42,
  postCount: 18,
  avgRating: 4.9,
  reviewCount: 214,
  social: { instagram: 'addisatelier', tiktok: 'addisatelier' },
}

interface Product {
  id: string
  name: string
  price: string
  priceNum: number
  availability: 'in-stock' | 'low-stock' | 'out-of-stock'
  rating: number
  reviewCount: number
  imgBg: string
  imgLabel: string
  description: string
  category: string
  variants: { label: string; options: string[] }[]
  attributes: { label: string; value: string }[]
  hasDemo: boolean
}

const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Habesha Kemis — Classic White',
    price: 'ETB 2,800',
    priceNum: 2800,
    availability: 'in-stock',
    rating: 4.9,
    reviewCount: 87,
    imgBg: 'linear-gradient(135deg, #F5EBE0 0%, #E8D5BE 100%)',
    imgLabel: 'HK',
    description: 'A traditional Habesha Kemis in premium white Ethiopian cotton with hand-embroidered Tibeb borders at the collar, hem, and cuffs. Made to order in Addis Ababa.',
    category: 'Traditional Wear',
    variants: [
      { label: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'Custom'] },
      { label: 'Border colour', options: ['Gold', 'Black', 'Silver', 'Red'] },
    ],
    attributes: [
      { label: 'Material', value: '100% Ethiopian cotton' },
      { label: 'Made in', value: 'Addis Ababa, Ethiopia' },
      { label: 'Lead time', value: '5–7 business days' },
      { label: 'Care', value: 'Hand wash cold, lay flat to dry' },
    ],
    hasDemo: true,
  },
  {
    id: 'p2',
    name: 'Tibeb Scarf — Gold Weave',
    price: 'ETB 650',
    priceNum: 650,
    availability: 'in-stock',
    rating: 4.8,
    reviewCount: 56,
    imgBg: 'linear-gradient(135deg, #F7E8C8 0%, #E8CC88 100%)',
    imgLabel: 'TS',
    description: 'A lightweight handwoven scarf featuring traditional Tibeb geometric patterns in gold and natural cotton. Versatile enough for everyday wear or formal occasions.',
    category: 'Accessories',
    variants: [
      { label: 'Length', options: ['Standard (180cm)', 'Long (220cm)'] },
      { label: 'Colour', options: ['Gold', 'Silver', 'Red & Gold', 'Black & Gold'] },
    ],
    attributes: [
      { label: 'Material', value: 'Handwoven cotton blend' },
      { label: 'Dimensions', value: '50cm × 180cm (standard)' },
      { label: 'Made in', value: 'Addis Ababa, Ethiopia' },
    ],
    hasDemo: false,
  },
  {
    id: 'p3',
    name: 'Ethiopian Cotton Dress',
    price: 'ETB 1,900',
    priceNum: 1900,
    availability: 'low-stock',
    rating: 4.7,
    reviewCount: 41,
    imgBg: 'linear-gradient(135deg, #E8F0E8 0%, #C8DCC8 100%)',
    imgLabel: 'EC',
    description: 'A contemporary silhouette using traditional Ethiopian cotton fabric. Structured A-line cut with hand-stitched collar detail. Limited stock of this design.',
    category: 'Dresses',
    variants: [
      { label: 'Size', options: ['XS', 'S', 'M', 'L', 'XL'] },
    ],
    attributes: [
      { label: 'Material', value: 'Ethiopian cotton (natural dye)' },
      { label: 'Stock', value: '3 remaining' },
      { label: 'Made in', value: 'Addis Ababa, Ethiopia' },
    ],
    hasDemo: false,
  },
  {
    id: 'p4',
    name: 'Netela Wrap',
    price: 'ETB 480',
    priceNum: 480,
    availability: 'in-stock',
    rating: 5.0,
    reviewCount: 30,
    imgBg: 'linear-gradient(135deg, #F0EDE8 0%, #E0D8CC 100%)',
    imgLabel: 'NW',
    description: 'A lightweight Ethiopian Netela — a traditional shawl worn draped over the shoulder at ceremonies and everyday occasions. Pure cotton, naturally processed.',
    category: 'Accessories',
    variants: [
      { label: 'Width', options: ['Narrow (70cm)', 'Standard (90cm)'] },
    ],
    attributes: [
      { label: 'Material', value: 'Pure Ethiopian cotton' },
      { label: 'Made in', value: 'Addis Ababa, Ethiopia' },
    ],
    hasDemo: false,
  },
  {
    id: 'p5',
    name: 'Gabi Blanket — Heritage Stripe',
    price: 'ETB 1,200',
    priceNum: 1200,
    availability: 'in-stock',
    rating: 4.8,
    reviewCount: 22,
    imgBg: 'linear-gradient(135deg, #EAE0F0 0%, #C8B8DC 100%)',
    imgLabel: 'GB',
    description: 'A thick handwoven Gabi blanket in the traditional heritage stripe pattern. Used throughout Ethiopian households for warmth and ceremony.',
    category: 'Home & Living',
    variants: [
      { label: 'Size', options: ['Single', 'Double', 'Large Double'] },
      { label: 'Pattern', options: ['Heritage Stripe', 'Solid Natural', 'Blue Stripe'] },
    ],
    attributes: [
      { label: 'Material', value: 'Handwoven cotton' },
      { label: 'Care', value: 'Dry clean or gentle hand wash' },
    ],
    hasDemo: false,
  },
  {
    id: 'p6',
    name: 'Habesha Ankle Boots',
    price: 'ETB 3,200',
    priceNum: 3200,
    availability: 'out-of-stock',
    rating: 4.6,
    reviewCount: 18,
    imgBg: 'linear-gradient(135deg, #E8E0D8 0%, #C8BEB4 100%)',
    imgLabel: 'AB',
    description: 'Hand-stitched Ethiopian leather ankle boots with traditional decorative embossing. Made by a master cobbler in the Merkato district.',
    category: 'Footwear',
    variants: [
      { label: 'Size', options: ['36', '37', '38', '39', '40', '41', '42'] },
    ],
    attributes: [
      { label: 'Material', value: 'Full-grain Ethiopian leather' },
      { label: 'Made in', value: 'Addis Ababa, Ethiopia' },
    ],
    hasDemo: false,
  },
]

interface ShoppablePost {
  id: string
  imgBg: string
  caption: string
  taggedProducts: string[] // product IDs
  hasHotspot: boolean
  zeroProduct: boolean
}

const POSTS: ShoppablePost[] = [
  {
    id: 'sp1',
    imgBg: 'linear-gradient(135deg, #C2622D 0%, #943F1A 100%)',
    caption: 'Spring styling at the Addis Ababa Botanical Garden 🌿 New collection, every piece made to order.',
    taggedProducts: ['p1', 'p2'],
    hasHotspot: true,
    zeroProduct: false,
  },
  {
    id: 'sp2',
    imgBg: 'linear-gradient(135deg, #4A7C59 0%, #2D5940 100%)',
    caption: 'The Netela Project — a three-week documentation of how one piece of Ethiopian cotton travels from loom to wearer.',
    taggedProducts: [],
    hasHotspot: false,
    zeroProduct: true,
  },
  {
    id: 'sp3',
    imgBg: 'linear-gradient(135deg, #7A5C3A 0%, #4A3420 100%)',
    caption: 'Heritage textures. The Gabi blanket in every Ethiopian home has a story. Here\'s ours. 🤎',
    taggedProducts: ['p5'],
    hasHotspot: true,
    zeroProduct: false,
  },
]

const REVIEWS = [
  { buyer: 'Maya T.', product: 'Habesha Kemis', pq: 5, ss: 5, date: 'Sep 2026', text: 'Absolutely stunning quality. The embroidery is even more beautiful in person. Arrived exactly as described — custom size was perfect.' },
  { buyer: 'Tigist A.', product: 'Tibeb Scarf', pq: 5, ss: 4, date: 'Aug 2026', text: 'Beautiful scarf, the gold weave is gorgeous. Seller communication was excellent. Delivery took a day longer than expected but no complaints.' },
  { buyer: 'Hana G.', product: 'Ethiopian Cotton Dress', pq: 4, ss: 5, date: 'Aug 2026', text: 'Great dress. The fabric quality is high. Seller was super responsive when I asked about sizing.' },
  { buyer: 'Selamawit B.', product: 'Netela Wrap', pq: 5, ss: 5, date: 'Jul 2026', text: 'Perfect Netela. Exactly what I was looking for for our family ceremony. The courier was on time and the QR handoff was seamless.' },
]

/* ─────────────────────────────────────
   ROUTING TYPES
───────────────────────────────────── */
type TabKey = 'shop' | 'posts' | 'reviews' | 'about'
type EntryMode = 'bio-link' | 'product-link' | 'shoppable-link'
type Screen =
  | { type: 'storefront'; tab: TabKey }
  | { type: 'product-detail'; productId: string }
  | { type: 'post-detail'; postId: string }
  | { type: 'search' }

/* ─────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────── */
export default function SellerStorefront({ demoTarget }: { demoTarget?: string }) {
  const initialEntry: EntryMode = demoTarget === 'product' ? 'product-link' : demoTarget === 'shoppable' ? 'shoppable-link' : 'bio-link'
  const initialScreen: Screen = demoTarget === 'product' ? { type: 'product-detail', productId: 'p1' } : demoTarget === 'shoppable' ? { type: 'post-detail', postId: 'sp1' } : { type: 'storefront', tab: 'shop' }
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntry)
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [openInAdulisOverlay, setOpenInAdulisOverlay] = useState(false)

  const navigate = (s: Screen) => setScreen(s)
  const goBack = () => {
    const cur = screen.type
    if (cur === 'product-detail' || cur === 'post-detail' || cur === 'search') {
      setScreen({ type: 'storefront', tab: cur === 'search' ? 'shop' : (cur === 'post-detail' ? 'posts' : 'shop') })
    }
  }

  /* entry mode → initial screen */
  const handleEntryChange = (mode: EntryMode) => {
    setEntryMode(mode)
    setOpenInAdulisOverlay(false)
    if (mode === 'bio-link') setScreen({ type: 'storefront', tab: 'shop' })
    if (mode === 'product-link') setScreen({ type: 'product-detail', productId: 'p1' })
    if (mode === 'shoppable-link') setScreen({ type: 'post-detail', postId: 'sp1' })
  }

  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Prototype toolbar ── */}
      <div className="storefront-toolbar" style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>04 — SELLER STOREFRONT · SOCIAL ENTRY</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
          {([
            { mode: 'bio-link' as EntryMode,       label: 'Bio Link → Storefront' },
            { mode: 'product-link' as EntryMode,   label: 'Product Link → Direct' },
            { mode: 'shoppable-link' as EntryMode, label: 'Shoppable Link → Direct' },
          ]).map(opt => (
            <button
              key={opt.mode}
              onClick={() => handleEntryChange(opt.mode)}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: entryMode === opt.mode ? 'var(--color-brand)' : 'var(--color-surface-raised)',
                color: entryMode === opt.mode ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Phone frame ── */}
      <div className="storefront-stage" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '32px 24px', background: 'var(--color-background)' }}>
        <div>
          <p style={{ textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Addis Atelier Storefront · 390px
          </p>
          <div className="storefront-phone" style={{ width: 390, height: 844, borderRadius: 44, boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border-strong)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
            {/* status bar */}
            <StatusBar />

            {/* content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {screen.type === 'storefront' && (
                <StorefrontView
                  tab={screen.tab}
                  setTab={t => setScreen({ type: 'storefront', tab: t })}
                  navigate={navigate}
                  onOpenAdulisApp={() => setOpenInAdulisOverlay(true)}
                />
              )}
              {screen.type === 'product-detail' && (
                <ProductDetailView
                  product={PRODUCTS.find(p => p.id === screen.productId)!}
                  onBack={goBack}
                  onOpenAdulisApp={() => setOpenInAdulisOverlay(true)}
                />
              )}
              {screen.type === 'post-detail' && (
                <PostDetailView
                  post={POSTS.find(p => p.id === screen.postId)!}
                  onBack={goBack}
                  navigate={navigate}
                  onOpenAdulisApp={() => setOpenInAdulisOverlay(true)}
                />
              )}
              {screen.type === 'search' && (
                <SearchView onBack={goBack} navigate={navigate} />
              )}
            </div>

            {/* Open in Adulis overlay */}
            {openInAdulisOverlay && (
              <OpenInAdulisSheet onClose={() => setOpenInAdulisOverlay(false)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   STATUS BAR
───────────────────────────────────── */
function StatusBar() {
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, background: 'var(--color-surface)' }}>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>9:41</span>
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
function StorefrontView({ tab, setTab, navigate, onOpenAdulisApp }: {
  tab: TabKey
  setTab: (t: TabKey) => void
  navigate: (s: Screen) => void
  onOpenAdulisApp: () => void
}) {
  return (
    <>
      <StorefrontHeader onSearch={() => navigate({ type: 'search' })} onOpenAdulisApp={onOpenAdulisApp} />
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        {(['shop', 'posts', 'reviews', 'about'] as TabKey[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px 0', fontSize: 12, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--color-brand)' : 'var(--color-text-muted)',
              background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', textTransform: 'capitalize',
            }}
          >
            {t === 'shop' ? 'Shop' : t === 'posts' ? 'Posts' : t === 'reviews' ? 'Reviews' : 'About'}
            {tab === t && <span style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, background: 'var(--color-brand)', borderRadius: 999 }} />}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'shop'    && <ShopTab navigate={navigate} />}
        {tab === 'posts'   && <PostsTab navigate={navigate} />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'about'   && <AboutTab onOpenAdulisApp={onOpenAdulisApp} />}
      </div>
    </>
  )
}

function StorefrontHeader({ onSearch, onOpenAdulisApp }: { onSearch: () => void; onOpenAdulisApp: () => void }) {
  const [shareShown, setShareShown] = useState(false)
  return (
    <div style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '14px 18px 12px', flexShrink: 0 }}>
      {/* top row: identity + actions */}
      <div className="storefront-identity-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div className="storefront-identity" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--color-brand)', flexShrink: 0 }}>
            AA
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2 }}>Addis Atelier</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
              <TrustBadge level="Established" />
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '2px 0 0' }}>@addisatelier · Fashion</p>
          </div>
        </div>

        <div className="storefront-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexShrink: 0 }}>
          {/* Search */}
          <CircleBtn label="Search" onClick={onSearch}>
            <IcoSearch />
          </CircleBtn>
          {/* Share */}
          <CircleBtn label="Share" onClick={() => setShareShown(s => !s)}>
            <IcoShare />
          </CircleBtn>
          {/* Open Adulis */}
          <button
            onClick={onOpenAdulisApp}
            className="storefront-open-adulis"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 999, background: 'var(--color-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
          >
            <AdulisLogo size={12} />
            <span>Open Adulis</span>
          </button>
        </div>
      </div>

      {/* share tooltip */}
      {shareShown && (
        <ShareSheet onClose={() => setShareShown(false)} url="adulis.com/store/addisatelier" />
      )}

      {/* bio */}
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '10px 0 0', lineHeight: 1.55 }}>
        {SELLER.bio}
      </p>

      {/* stats */}
      <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
        {[
          { value: '42', label: 'Products' },
          { value: '18', label: 'Posts' },
          { value: '4.9 ★', label: `${SELLER.reviewCount} reviews` },
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
   SHOP TAB
───────────────────────────────────── */
function ShopTab({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {PRODUCTS.map(p => (
        <button
          key={p.id}
          onClick={() => navigate({ type: 'product-detail', productId: p.id })}
          style={{ background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        >
          {/* image */}
          <div style={{ height: 130, background: p.imgBg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{p.imgLabel}</span>
            {p.availability === 'out-of-stock' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', background: 'white', padding: '3px 8px', borderRadius: 999 }}>Out of Stock</span>
              </div>
            )}
          </div>
          {/* info */}
          <div style={{ padding: '10px 10px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 3px', lineHeight: 1.3 }}>{p.name}</p>
            <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)', margin: '0 0 5px' }}>{p.price}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <AvailBadge avail={p.availability} />
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>★ {p.rating}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────
   POSTS TAB
───────────────────────────────────── */
function PostsTab({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {POSTS.map(post => (
        <button
          key={post.id}
          onClick={() => navigate({ type: 'post-detail', postId: post.id })}
          style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        >
          <div style={{ height: 200, background: post.imgBg, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
            {/* Post type badge */}
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              {post.zeroProduct ? (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'rgba(0,0,0,0.45)', color: '#fff', padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  Shoppable Post
                </span>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', background: 'var(--color-brand)', color: '#fff', padding: '3px 8px', borderRadius: 999, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                  {post.taggedProducts.length} products tagged
                </span>
              )}
            </div>
            {/* hotspot dot */}
            {post.hasHotspot && (
              <div style={{ position: 'absolute', top: '38%', right: '25%', width: 22, height: 22, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                <div style={{ width: 8, height: 8, background: 'var(--color-brand)', borderRadius: '50%' }} />
              </div>
            )}
            {/* caption preview */}
            <div style={{ padding: '8px 12px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)', width: '100%' }}>
              <p style={{ fontSize: 12, color: '#fff', margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.caption}</p>
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
  const avgPQ = (REVIEWS.reduce((a, r) => a + r.pq, 0) / REVIEWS.length).toFixed(1)
  const avgSS = (REVIEWS.reduce((a, r) => a + r.ss, 0) / REVIEWS.length).toFixed(1)

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      {/* Summary */}
      <div style={{ background: 'var(--color-surface-raised)', borderRadius: 14, padding: 14, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ textAlign: 'center', padding: '8px 0', borderRight: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Product Quality</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 2px', fontFamily: 'var(--font-display)' }}>{avgPQ}</p>
          <StarRow rating={parseFloat(avgPQ)} />
        </div>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Seller Service</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 2px', fontFamily: 'var(--font-display)' }}>{avgSS}</p>
          <StarRow rating={parseFloat(avgSS)} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 14px', fontFamily: 'var(--font-mono)' }}>
        {SELLER.reviewCount} verified buyer reviews
      </p>

      {REVIEWS.map((r, i) => (
        <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < REVIEWS.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-brand)' }}>
                {r.buyer[0]}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{r.buyer}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>{r.product}</p>
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{r.date}</span>
          </div>
          {/* separate PQ / SS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
            <div style={{ background: 'var(--color-surface-raised)', borderRadius: 8, padding: '5px 8px' }}>
              <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Product Quality</p>
              <div style={{ display: 'flex', gap: 2 }}>{Array.from({ length: 5 }).map((_, j) => <span key={j} style={{ fontSize: 10, color: j < r.pq ? '#E8874A' : 'var(--color-border-strong)' }}>★</span>)}</div>
            </div>
            <div style={{ background: 'var(--color-surface-raised)', borderRadius: 8, padding: '5px 8px' }}>
              <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Seller Service</p>
              <div style={{ display: 'flex', gap: 2 }}>{Array.from({ length: 5 }).map((_, j) => <span key={j} style={{ fontSize: 10, color: j < r.ss ? '#E8874A' : 'var(--color-border-strong)' }}>★</span>)}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{r.text}</p>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────
   ABOUT TAB
───────────────────────────────────── */
function AboutTab({ onOpenAdulisApp }: { onOpenAdulisApp: () => void }) {
  return (
    <div style={{ padding: '16px 16px 32px' }}>
      {/* Trust card */}
      <div style={{ background: 'var(--color-success-bg)', borderRadius: 14, padding: 14, marginBottom: 14, border: '1px solid #c8e6d4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L2 4v5c0 4 3 6.5 6 7.5 3-1 6-3.5 6-7.5V4L8 1z" fill="var(--color-success)"/></svg>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-success)' }}>Established Seller</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px', lineHeight: 1.55 }}>
          Trust level earned through consistent fulfilment, verified buyer reviews, and a clean claims record. Updated by Adulis based on seller performance.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { label: 'Avg Product Quality', value: '4.9 ★' },
            { label: 'Avg Seller Service', value: '4.8 ★' },
            { label: 'Orders Fulfilled', value: '200+' },
            { label: 'Claim Rate', value: '< 1%' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.65)', borderRadius: 8, padding: '7px 9px' }}>
              <p style={{ fontSize: 9, color: 'var(--color-text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{s.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info rows */}
      {[
        { label: 'Category', value: SELLER.category },
        { label: 'Location', value: SELLER.location },
        { label: 'Fulfilment', value: SELLER.fulfilment },
        { label: 'Member since', value: 'January 2026' },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-border)', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>{row.label}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right' }}>{row.value}</span>
        </div>
      ))}

      {/* Social */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Social</p>
        {[{ icon: '📸', label: 'Instagram', handle: '@addisatelier' }, { icon: '🎵', label: 'TikTok', handle: '@addisatelier' }].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 11, color: 'var(--color-brand)', margin: 0 }}>{s.handle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Open Adulis CTA */}
      <button
        onClick={onOpenAdulisApp}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 14, background: 'var(--color-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
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
function ProductDetailView({ product, onBack, onOpenAdulisApp }: {
  product: Product
  onBack: () => void
  onOpenAdulisApp: () => void
}) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  const [demoShown, setDemoShown] = useState(false)
  const [shareShown, setShareShown] = useState(false)
  const productReviews = REVIEWS.filter(review => product.name.includes(review.product))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <IcoBack /> Addis Atelier
        </button>
        <div style={{ flex: 1 }} />
        <CircleBtn label="Share" onClick={() => setShareShown(true)}>
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

        {/* Watch Product Demo — click to load */}
        {product.hasDemo && !demoShown && (
          <button
            onClick={() => setDemoShown(true)}
            style={{ width: '100%', background: 'var(--color-surface-raised)', border: 'none', borderBottom: '1px solid var(--color-border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16 }}>▶️</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Watch Product Demo</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Tap to load · 2 min</p>
            </div>
          </button>
        )}
        {demoShown && (
          <div style={{ background: '#111', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16, color: '#fff' }}>⏸</span>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>Product Demo Playing</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>1:24 remaining</p>
            </div>
          </div>
        )}

        {/* main info */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 11, color: 'var(--color-brand)', margin: '0 0 2px', fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{product.category}</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.2 }}>{product.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 20, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand)', margin: 0 }}>{product.price}</p>
                <StarRow rating={product.rating} small />
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>({product.reviewCount})</span>
              </div>
            </div>
            <AvailBadge avail={product.availability} />
          </div>

          {/* Seller trust row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '10px 12px', background: 'var(--color-surface-raised)', borderRadius: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-brand)' }}>AA</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Addis Atelier</p>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0 }}>@addisatelier</p>
            </div>
            <TrustBadge level="Established" small />
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
                      style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: isSelected ? 700 : 400, border: `1.5px solid ${isSelected ? 'var(--color-brand)' : 'var(--color-border)'}`, background: isSelected ? 'var(--color-brand-muted)' : 'transparent', color: isSelected ? 'var(--color-brand)' : 'var(--color-text-secondary)', cursor: 'pointer' }}
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
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>{product.description}</p>
        </div>

        {/* attributes */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Details</p>
          {product.attributes.map(a => (
            <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{a.label}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'right', maxWidth: '60%' }}>{a.value}</span>
            </div>
          ))}
        </div>

        {/* fulfilment */}
        <div style={{ padding: '14px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 8px' }}>Fulfilment</p>
          <div style={{ background: 'var(--color-surface-raised)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>🚴 {SELLER.fulfilment}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>QR-verified pickup and delivery · Adulis Handoff system</p>
          </div>
        </div>

        {/* mini reviews */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: 0 }}>Reviews</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>PQ: <strong>★ {product.rating}</strong></span>
            </div>
          </div>
          {productReviews.slice(0, 2).map((r, i) => (
            <div key={i} style={{ marginBottom: 10, padding: '10px', background: 'var(--color-surface-raised)', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-brand)' }}>{r.buyer[0]}</div>
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
        {product.availability === 'out-of-stock' ? (
          <button disabled style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-border)', color: 'var(--color-text-muted)', border: 'none', fontWeight: 700, fontSize: 15 }}>
            Out of Stock
          </button>
        ) : (
          <button
            onClick={onOpenAdulisApp}
            style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <AdulisLogo size={18} />
            Open in Adulis to Order
          </button>
        )}
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', margin: '6px 0 0' }}>
          No checkout on the web storefront · Orders placed in the Adulis app
        </p>
      </div>
      {shareShown && <ShareSheet onClose={() => setShareShown(false)} url={`adulis.com/store/addisatelier/products/${product.id}`} />}
    </div>
  )
}

/* ─────────────────────────────────────
   POST DETAIL VIEW
───────────────────────────────────── */
function PostDetailView({ post, onBack, navigate, onOpenAdulisApp }: {
  post: ShoppablePost
  onBack: () => void
  navigate: (s: Screen) => void
  onOpenAdulisApp: () => void
}) {
  const [hotspotActive, setHotspotActive] = useState<string | null>(null)
  const [shareShown, setShareShown] = useState(false)
  const taggedProducts = PRODUCTS.filter(p => post.taggedProducts.includes(p.id))

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}>
          <IcoBack /> Posts
        </button>
        <div style={{ flex: 1 }} />
        <CircleBtn label="Share" onClick={() => setShareShown(true)}>
          <IcoShare />
        </CircleBtn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* post image with optional hotspot */}
        <div style={{ height: 300, background: post.imgBg, position: 'relative' }}>
          {/* zero-product notice */}
          {post.zeroProduct && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: '4px 10px' }}>
              <span style={{ fontSize: 10, color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em' }}>SHOPPABLE POST</span>
            </div>
          )}
          {!post.zeroProduct && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'var(--color-brand)', borderRadius: 999, padding: '4px 10px' }}>
              <span style={{ fontSize: 10, color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em' }}>{post.taggedProducts.length} PRODUCTS</span>
            </div>
          )}
          {/* hotspot */}
          {post.hasHotspot && post.taggedProducts[0] && (
            <button
              onClick={() => setHotspotActive(hotspotActive ? null : post.taggedProducts[0])}
              aria-label={hotspotActive ? 'Close product hotspot' : 'Open product hotspot'}
              aria-expanded={Boolean(hotspotActive)}
              style={{ position: 'absolute', top: '40%', right: '28%', width: 26, height: 26, background: hotspotActive ? 'var(--color-brand)' : 'rgba(255,255,255,0.92)', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', transition: 'all 0.15s' }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: hotspotActive ? '#fff' : 'var(--color-brand)' }} />
            </button>
          )}
          {/* hotspot product card */}
          {hotspotActive && (
            <button
              onClick={() => navigate({ type: 'product-detail', productId: hotspotActive })}
              style={{ position: 'absolute', top: '28%', right: '5%', background: 'rgba(255,255,255,0.97)', borderRadius: 12, padding: '10px 12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-md)', width: 160 }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: PRODUCTS.find(p => p.id === hotspotActive)?.imgBg || 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{PRODUCTS.find(p => p.id === hotspotActive)?.imgLabel}</span>
              </div>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {PRODUCTS.find(p => p.id === hotspotActive)?.name}
                </p>
                <p style={{ fontSize: 10, color: 'var(--color-brand)', margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>
                  {PRODUCTS.find(p => p.id === hotspotActive)?.price}
                </p>
              </div>
            </button>
          )}
        </div>

        {/* seller row */}
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--color-brand-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-brand)', flexShrink: 0 }}>AA</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Addis Atelier</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>@addisatelier</p>
          </div>
          <TrustBadge level="Established" small />
        </div>

        {/* caption */}
        <div style={{ padding: '10px 16px 0' }}>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-primary)', margin: 0 }}>{post.caption}</p>
        </div>

        {/* zero-product notice */}
        {post.zeroProduct && (
          <div style={{ margin: '14px 16px 0', padding: '12px 14px', background: 'var(--color-surface-raised)', borderRadius: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>
              This post has no tagged products. It is published on the seller's storefront but is not eligible for the For You feed.
            </p>
          </div>
        )}

        {/* tagged products */}
        {!post.zeroProduct && taggedProducts.length > 0 && (
          <div aria-label="Shoppable products in this post" style={{ padding: '14px 16px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 10px' }}>
              {taggedProducts.length} tagged product{taggedProducts.length !== 1 ? 's' : ''}
            </p>
            {taggedProducts.map(p => (
              <button
                key={p.id}
                onClick={() => navigate({ type: 'product-detail', productId: p.id })}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-surface-raised)', borderRadius: 12, border: '1px solid var(--color-border)', cursor: 'pointer', marginBottom: 8, textAlign: 'left' }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: p.imgBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>{p.imgLabel}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)', fontWeight: 600 }}>{p.price}</span>
                    <AvailBadge avail={p.availability} />
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            ))}
          </div>
        )}

        <div style={{ height: 100 }} />
      </div>

      {/* sticky bottom */}
      <div style={{ padding: '12px 16px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', flexShrink: 0 }}>
        <button
          onClick={onOpenAdulisApp}
          style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <AdulisLogo size={18} />
          Open in Adulis
        </button>
      </div>
      {shareShown && <ShareSheet onClose={() => setShareShown(false)} url={`adulis.com/store/addisatelier/posts/${post.id}`} />}
    </div>
  )
}

/* ─────────────────────────────────────
   SEARCH VIEW
───────────────────────────────────── */
function SearchView({ onBack, navigate }: { onBack: () => void; navigate: (s: Screen) => void }) {
  const [query, setQuery] = useState('')
  const results = query.length >= 2
    ? PRODUCTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* search bar */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <IcoBack />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-surface-raised)', borderRadius: 10, padding: '8px 12px' }}>
          <IcoSearch />
          <input
            autoFocus
            aria-label="Search this storefront"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Addis Atelier…"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {query.length === 0 && (
          <div style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', margin: '0 0 10px' }}>Categories</p>
            {['Traditional Wear', 'Accessories', 'Dresses', 'Home & Living', 'Footwear'].map(c => (
              <button
                key={c}
                onClick={() => setQuery(c)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '10px 0', fontSize: 14, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>No products matching "{query}"</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>Try a different search within this store.</p>
          </div>
        )}
        {results.length > 0 && (
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => navigate({ type: 'product-detail', productId: p.id })}
                style={{ background: 'var(--color-surface)', borderRadius: 14, border: '1px solid var(--color-border)', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              >
                <div style={{ height: 110, background: p.imgBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{p.imgLabel}</span>
                </div>
                <div style={{ padding: '8px 10px 10px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px', lineHeight: 1.3 }}>{p.name}</p>
                  <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)', margin: 0 }}>{p.price}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   OPEN IN ADULIS SHEET
───────────────────────────────────── */
function OpenInAdulisSheet({ onClose }: { onClose: () => void }) {
  const [installed, setInstalled] = useState<'unknown' | 'open' | 'install'>('unknown')

  return (
    <div role="dialog" aria-modal="true" aria-label="Open in Adulis" style={{ position: 'absolute', inset: 0, background: 'rgba(26,21,18,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 50 }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border-strong)', borderRadius: 999, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <AdulisLogo size={44} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 3px' }}>Open in Adulis</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Browse, order, and track in the app.</p>
          </div>
        </div>

        {installed === 'unknown' && (
          <>
            <button
              onClick={() => setInstalled('open')}
              style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15, marginBottom: 10 }}
            >
              Open Adulis App
            </button>
            <button
              onClick={() => setInstalled('install')}
              style={{ width: '100%', padding: '15px', borderRadius: 14, background: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginBottom: 10 }}
            >
              Get Adulis — Free
            </button>
          </>
        )}

        {installed === 'open' && (
          <div style={{ background: 'var(--color-success-bg)', borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-success)', margin: '0 0 4px' }}>Opening Adulis…</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>If the app doesn't open, try installing it first.</p>
          </div>
        )}
        {installed === 'install' && (
          <div style={{ background: 'var(--color-brand-muted)', borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-brand)', margin: '0 0 4px' }}>Redirecting to App Store…</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>Search for "Adulis" to find us.</p>
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', margin: '4px 0 0' }}>
          Purchases are made in the Adulis app — not on this web page.
        </p>

        <button onClick={onClose} style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: 13, cursor: 'pointer', marginTop: 16, padding: '8px' }}>
          Continue browsing on web
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────
   SHARE SHEET
───────────────────────────────────── */
function ShareSheet({ onClose, url }: { onClose: () => void; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div role="dialog" aria-modal="true" aria-label="Share storefront" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, background: 'rgba(26,21,18,0.4)', zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: '24px 24px 0 0', padding: '20px 18px 36px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border-strong)', borderRadius: 999, margin: '0 auto 18px' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 14px' }}>Share Addis Atelier</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[{ icon: '💬', label: 'Message' }, { icon: '📸', label: 'Instagram' }, { icon: '🎵', label: 'TikTok' }, { icon: '📋', label: 'Copy Link' }].map(s => (
            <button
              key={s.label}
              onClick={() => { if (s.label === 'Copy Link') { setCopied(true); setTimeout(() => setCopied(false), 2000) } }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'var(--color-surface-raised)', border: 'none', borderRadius: 12, padding: '12px 6px', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{s.label === 'Copy Link' && copied ? '✓ Copied' : s.label}</span>
            </button>
          ))}
        </div>
        <div style={{ background: 'var(--color-surface-raised)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{url}</span>
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Close
        </button>
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

function AvailBadge({ avail }: { avail: Product['availability'] }) {
  const map = {
    'in-stock':    { label: 'In Stock',    bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
    'low-stock':   { label: 'Low Stock',   bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
    'out-of-stock':{ label: 'Out of Stock',bg: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' },
  }
  const s = map[avail]
  return (
    <span style={{ fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, padding: '2px 6px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
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
