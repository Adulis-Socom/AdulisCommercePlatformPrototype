import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { PhoneInput, SearchInput, Textarea, TextInput } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Overlay'
import {
  PhoneFrame, BottomNav, IconHome, IconShop, IconHeart, IconOrders, IconUser,
  IconSearch, IconChevronRight,
} from './ShellHelpers'

type TabKey = 'foryou' | 'shop' | 'saved' | 'orders' | 'you'
type SearchTab = 'top' | 'products' | 'posts' | 'sellers'
type Screen =
  | 'start' | 'feed' | 'post' | 'product' | 'seller' | 'seller-shop'
  | 'search' | 'saved' | 'collection' | 'seller-cart' | 'multi-cart'
  | 'checkout-coordinator' | 'seller-checkout' | 'payment-transition'
  | 'payment-processing' | 'payment-success' | 'payment-failed' | 'payment-checking'
  | 'orders' | 'order-detail' | 'delegated-recipient' | 'qr-scanner' | 'qr-camera'
  | 'qr-verifying' | 'delivery-confirmed' | 'otp' | 'completed' | 'review'
  | 'claim-start' | 'claim-form' | 'claim-status' | 'chats' | 'conversation'
  | 'chatbot' | 'notifications'
type Fulfilment = 'collection' | 'seller' | 'courier'
type OrderStage = 'paid' | 'preparing' | 'ready' | 'assigned' | 'pickup' | 'out'

const PHOTOS = {
  hero: 'https://images.unsplash.com/photo-1604267624174-4e939059d6ea?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  blue: 'https://images.unsplash.com/photo-1662894310975-bce268199aec?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  field: 'https://images.unsplash.com/photo-1598122666068-59b41e0a3193?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
  group: 'https://images.unsplash.com/photo-1691826280718-b365d22809e3?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
}

const TABS = [
  { key: 'foryou' as TabKey, label: 'For You', icon: <IconHome size={22} /> },
  { key: 'shop' as TabKey, label: 'Shop', icon: <IconShop size={22} /> },
  { key: 'saved' as TabKey, label: 'Saved', icon: <IconHeart size={22} /> },
  { key: 'orders' as TabKey, label: 'Orders', icon: <IconOrders size={22} /> },
  { key: 'you' as TabKey, label: 'You', icon: <IconUser size={22} /> },
]

const PRODUCT = {
  name: 'Habesha Kemis — Classic White',
  price: 'ETB 2,800',
  seller: 'Addis Atelier',
  description: 'Premium Ethiopian cotton with hand-embroidered Tibeb borders, made to order by master tailors in Addis Ababa.',
}

export default function MobileBuyer({ demoTarget }: { demoTarget?: string }) {
  const initialScreen = (demoTarget && ['start', 'feed', 'post', 'product', 'seller', 'seller-shop', 'search', 'saved', 'collection', 'seller-cart', 'multi-cart', 'checkout-coordinator', 'seller-checkout', 'payment-transition', 'payment-processing', 'payment-success', 'payment-failed', 'payment-checking', 'orders', 'order-detail', 'delegated-recipient', 'qr-scanner', 'qr-camera', 'qr-verifying', 'delivery-confirmed', 'otp', 'completed', 'review', 'claim-start', 'claim-form', 'claim-status', 'chats', 'conversation', 'chatbot', 'notifications'].includes(demoTarget) ? demoTarget : 'start') as Screen
  const initialTab: TabKey = initialScreen === 'orders' ? 'orders' : initialScreen === 'saved' ? 'saved' : initialScreen === 'search' ? 'shop' : 'foryou'
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [searchTab, setSearchTab] = useState<SearchTab>('top')
  const [query, setQuery] = useState('')
  const [cartConfirmation, setCartConfirmation] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [fulfilment, setFulfilment] = useState<Fulfilment>('courier')
  const [orderStage, setOrderStage] = useState<OrderStage>('paid')
  const paymentTotal = 2814 + (fulfilment === 'courier' ? 180 : fulfilment === 'seller' ? 120 : 0)

  const goTab = (key: TabKey) => {
    setActiveTab(key)
    if (key === 'foryou') setScreen('feed')
    if (key === 'shop') setScreen('search')
    if (key === 'saved') setScreen('saved')
    if (key === 'orders') setScreen('orders')
  }

  const showNav = ['feed', 'search', 'saved', 'orders'].includes(screen)

  return (
    <PhoneFrame label="05 — MOBILE BUYER · MAYA T.">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {screen === 'start' && <AppStart onExplore={() => setScreen('feed')} />}
        {screen === 'feed' && (
          <Feed
            onSearch={() => { setScreen('search'); setActiveTab('shop') }}
            onPost={() => setScreen('post')}
            onHotspot={() => setSheetOpen(true)}
            onSeller={() => setScreen('seller')}
          />
        )}
        {screen === 'post' && (
          <ExpandedPost
            onBack={() => setScreen('feed')}
            onHotspot={() => setSheetOpen(true)}
            onSeller={() => setScreen('seller')}
            onReport={() => setReportOpen(true)}
          />
        )}
        {screen === 'product' && (
          <ProductDetail
            saved={saved}
            onSave={() => setSaved(!saved)}
            onBack={() => setScreen('post')}
            onSeller={() => setScreen('seller')}
            onAddToCart={() => setCartConfirmation(true)}
            onChat={() => setScreen('chatbot')}
          />
        )}
        {screen === 'seller' && <SellerProfile onBack={() => setScreen('feed')} onShop={() => setScreen('seller-shop')} />}
        {screen === 'seller-shop' && <SellerShop onBack={() => setScreen('seller')} onProduct={() => setScreen('product')} onSearch={() => setScreen('search')} />}
        {screen === 'search' && (
          <Search
            query={query}
            setQuery={setQuery}
            tab={searchTab}
            setTab={setSearchTab}
            onProduct={() => setScreen('product')}
            onPost={() => setScreen('post')}
            onSeller={() => setScreen('seller')}
          />
        )}
        {screen === 'saved' && <Saved onCollection={() => setScreen('collection')} onProduct={() => setScreen('product')} onPost={() => setScreen('post')} />}
        {screen === 'collection' && <Collection onBack={() => setScreen('saved')} onProduct={() => setScreen('product')} onPost={() => setScreen('post')} />}
        {screen === 'seller-cart' && <SellerCart onBack={() => setScreen('product')} onAllCarts={() => setScreen('multi-cart')} onCheckout={() => setScreen('checkout-coordinator')} />}
        {screen === 'multi-cart' && <MultiCart onBack={() => setScreen('seller-cart')} onCheckout={() => setScreen('checkout-coordinator')} />}
        {screen === 'checkout-coordinator' && <CheckoutCoordinator onBack={() => setScreen('multi-cart')} onContinue={() => setScreen('seller-checkout')} />}
        {screen === 'seller-checkout' && <SellerCheckout fulfilment={fulfilment} setFulfilment={setFulfilment} onBack={() => setScreen('checkout-coordinator')} onPay={() => setScreen('payment-transition')} />}
        {screen === 'payment-transition' && <PaymentTransition amount={paymentTotal} onBack={() => setScreen('seller-checkout')} onContinue={() => setScreen('payment-processing')} />}
        {screen === 'payment-processing' && <PaymentProcessing amount={paymentTotal} onPaid={() => setScreen('payment-success')} onFailed={() => setScreen('payment-failed')} onChecking={() => setScreen('payment-checking')} />}
        {screen === 'payment-success' && <PaymentSuccess amount={paymentTotal} onDone={() => { setActiveTab('orders'); setScreen('orders') }} />}
        {screen === 'payment-failed' && <PaymentFailed onRetry={() => setScreen('payment-transition')} onCart={() => setScreen('seller-cart')} />}
        {screen === 'payment-checking' && <PaymentChecking onRefresh={() => setScreen('payment-processing')} onDone={() => setScreen('payment-success')} />}
        {screen === 'orders' && <OrdersList onOrder={() => setScreen('order-detail')} onChats={() => setScreen('chats')} onNotifications={() => setScreen('notifications')} />}
        {screen === 'order-detail' && <OrderDetail stage={orderStage} setStage={setOrderStage} onBack={() => setScreen('orders')} onDelegate={() => setScreen('delegated-recipient')} onScan={() => setScreen('qr-scanner')} onOtp={() => setScreen('otp')} onClaim={() => setScreen('claim-start')} onChat={() => setScreen('conversation')} />}
        {screen === 'delegated-recipient' && <DelegatedRecipient onBack={() => setScreen('order-detail')} onSave={() => setScreen('order-detail')} />}
        {screen === 'qr-scanner' && <DeliveryScanner onBack={() => setScreen('order-detail')} onCamera={() => setScreen('qr-camera')} onOtp={() => setScreen('otp')} />}
        {screen === 'qr-camera' && <ScannerCamera onBack={() => setScreen('qr-scanner')} onScan={() => setScreen('qr-verifying')} />}
        {screen === 'qr-verifying' && <QrVerifying onVerified={() => setScreen('delivery-confirmed')} />}
        {screen === 'delivery-confirmed' && <DeliveryConfirmed onContinue={() => setScreen('completed')} />}
        {screen === 'otp' && <OtpFallback onBack={() => setScreen('qr-scanner')} onVerify={() => setScreen('delivery-confirmed')} />}
        {screen === 'completed' && <CompletedOrder onBack={() => setScreen('orders')} onReview={() => setScreen('review')} onClaim={() => setScreen('claim-start')} />}
        {screen === 'review' && <ReviewOrder onBack={() => setScreen('completed')} onSubmit={() => setScreen('completed')} />}
        {screen === 'claim-start' && <ClaimStart onBack={() => setScreen('order-detail')} onContinue={() => setScreen('claim-form')} />}
        {screen === 'claim-form' && <ClaimForm onBack={() => setScreen('claim-start')} onSubmit={() => setScreen('claim-status')} />}
        {screen === 'claim-status' && <ClaimStatus onDone={() => setScreen('order-detail')} />}
        {screen === 'chats' && <ChatList onBack={() => setScreen('orders')} onConversation={() => setScreen('conversation')} onBot={() => setScreen('chatbot')} />}
        {screen === 'conversation' && <Conversation onBack={() => setScreen('chats')} />}
        {screen === 'chatbot' && <Chatbot onBack={() => setScreen('product')} />}
        {screen === 'notifications' && <Notifications onBack={() => setScreen('orders')} onOrder={() => setScreen('order-detail')} onChat={() => setScreen('conversation')} />}

        {showNav && (
          <BottomNav items={TABS} active={activeTab} onSelect={k => goTab(k as TabKey)} />
        )}

        {sheetOpen && (
          <ProductSheet
            onClose={() => setSheetOpen(false)}
            onDetail={() => { setSheetOpen(false); setScreen('product') }}
          />
        )}
        {cartConfirmation && (
          <AddToCartConfirmation
            onClose={() => setCartConfirmation(false)}
            onCart={() => { setCartConfirmation(false); setScreen('seller-cart') }}
          />
        )}
        {reportOpen && <ReportPostSheet onClose={() => setReportOpen(false)} />}
      </div>
    </PhoneFrame>
  )
}

function AppStart({ onExplore }: { onExplore: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <img src={PHOTOS.group} alt="Ethiopian makers wearing traditional dress" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/90" />
      <div className="relative mt-auto p-7 pb-9 text-white">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-brand font-display text-xl font-bold">A</div>
        <div className="font-display text-4xl font-semibold leading-tight">Find what moves you.</div>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          Discover Ethiopian products through the people, craft and stories behind them.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Button size="lg" onClick={onExplore} style={{ width: '100%' }}>Explore as guest</Button>
          <Button size="lg" variant="tertiary" style={{ width: '100%', background: 'rgba(255,255,255,.14)', color: 'white', borderColor: 'rgba(255,255,255,.35)' }}>Sign in</Button>
        </div>
        <p className="mt-4 text-center text-xs text-white/60">No account needed to browse</p>
      </div>
    </div>
  )
}

function Header({ title, onBack, onSearch, trailing }: {
  title: string; onBack?: () => void; onSearch?: () => void; trailing?: ReactNode
}) {
  return (
    <div className="flex h-13 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      {onBack && <IconButton label="Back" onClick={onBack}>‹</IconButton>}
      <div className="flex-1 truncate font-display text-lg font-semibold text-text-primary">{title}</div>
      {onSearch && <IconButton label="Search" onClick={onSearch}><IconSearch size={17} /></IconButton>}
      {trailing}
    </div>
  )
}

function GuestStrip() {
  return (
    <div className="flex items-center justify-between bg-brand-muted px-4 py-2 text-xs text-brand-dark">
      <span>Browsing as guest</span>
      <span className="font-semibold">Sign in to save</span>
    </div>
  )
}

function Feed({ onSearch, onPost, onHotspot, onSeller }: {
  onSearch: () => void; onPost: () => void; onHotspot: () => void; onSeller: () => void
}) {
  return (
    <>
      <Header title="For You" onSearch={onSearch} trailing={<IconButton label="Notifications">○</IconButton>} />
      <GuestStrip />
      <div className="flex-1 snap-y snap-mandatory overflow-y-auto bg-text-primary">
        <ShoppablePost image={PHOTOS.hero} seller="Addis Atelier" caption="A modern take on the Habesha Kemis, made slowly in Addis Ababa." count={2} onOpen={onPost} onHotspot={onHotspot} onSeller={onSeller} />
        <ShoppablePost image={PHOTOS.blue} seller="Nile Loom" caption="Indigo, hand finishing, and a silhouette made for warm afternoons." count={3} onOpen={onPost} onHotspot={onHotspot} onSeller={onSeller} />
        <div className="h-48 bg-surface p-5">
          <div className="mb-3 text-xs font-semibold text-text-muted">Finding more stories for you</div>
          <Skeleton height={112} radius="var(--radius-xl)" />
        </div>
      </div>
    </>
  )
}

function ShoppablePost({ image, seller, caption, count, onOpen, onHotspot, onSeller }: {
  image: string; seller: string; caption: string; count: number; onOpen: () => void; onHotspot: () => void; onSeller: () => void
}) {
  return (
    <div className="relative h-full min-h-[632px] snap-start overflow-hidden">
      <button onClick={onOpen} className="absolute inset-0 h-full w-full">
        <img src={image} alt={`${seller} shoppable post`} className="h-full w-full object-cover" />
      </button>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
      <button onClick={onHotspot} aria-label="View tagged product" className="absolute left-[57%] top-[42%] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand text-sm font-bold text-white shadow-lg">
        +
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
        <button onClick={onSeller} className="mb-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted font-bold text-brand-dark">AA</span>
          <span className="text-sm font-semibold">{seller}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">Established</span>
        </button>
        <p className="text-sm leading-relaxed text-white/90">{caption}</p>
        <button onClick={onHotspot} className="mt-3 flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-text-primary shadow-md">
          <TagIcon /> In this post · {count} products
        </button>
      </div>
    </div>
  )
}

function ExpandedPost({ onBack, onHotspot, onSeller, onReport }: { onBack: () => void; onHotspot: () => void; onSeller: () => void; onReport: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-text-primary">
      <img src={PHOTOS.hero} alt="Habesha Kemis scene" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      <div className="relative flex items-center gap-3 p-4 text-white">
        <IconButton label="Back" onClick={onBack} dark>‹</IconButton>
        <button onClick={onSeller} className="flex flex-1 items-center gap-2 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">AA</span>
          <span className="text-sm font-semibold">Addis Atelier</span>
        </button>
        <button onClick={onReport} className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold text-white">Report</button>
      </div>
      <button onClick={onHotspot} className="absolute left-[55%] top-[39%] flex items-center gap-2 rounded-full bg-white p-1.5 pr-3 text-xs font-semibold text-text-primary shadow-lg">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">+</span>
        ETB 2,800
      </button>
      <button onClick={onHotspot} className="absolute right-[12%] top-[59%] h-8 w-8 rounded-full border-2 border-white bg-brand text-white shadow-lg">+</button>
      <div className="relative mt-auto p-4 text-white">
        <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">Scene explorer</span>
        <div className="mt-3 font-display text-2xl font-semibold">Heritage, in a new frame.</div>
        <p className="mt-1 text-sm text-white/80">Tap a product hotspot to explore the pieces in this scene.</p>
        <button onClick={onHotspot} className="mt-4 flex w-full items-center justify-between rounded-xl bg-white p-3 text-sm font-semibold text-text-primary">
          <span className="flex items-center gap-2"><TagIcon /> In this post</span>
          <span>2 products</span>
        </button>
      </div>
    </div>
  )
}

function ProductSheet({ onClose, onDetail }: { onClose: () => void; onDetail: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45" role="presentation">
      <div onClick={e => e.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl" role="dialog" aria-modal="true" aria-label="Products in this post">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-lg font-semibold">In this post</div>
          <IconButton label="Close" onClick={onClose}>×</IconButton>
        </div>
        <div role="list" aria-label="Shoppable products in this post">
        <div role="listitem">
        <button onClick={onDetail} className="flex w-full gap-3 text-left">
          <img src={PHOTOS.hero} alt={PRODUCT.name} className="h-24 w-20 rounded-xl object-cover" />
          <span className="flex flex-1 flex-col">
            <span className="text-xs text-text-muted">{PRODUCT.seller}</span>
            <span className="mt-1 text-sm font-semibold leading-snug text-text-primary">{PRODUCT.name}</span>
            <span className="mt-2 text-sm font-bold text-brand">{PRODUCT.price}</span>
            <span className="mt-1 text-xs text-success">Made to order · Available</span>
          </span>
          <IconChevronRight size={16} />
        </button>
        </div>
        <div className="my-4 h-px bg-border" />
        <div role="listitem">
        <button disabled className="flex w-full items-center gap-3 text-left opacity-70">
          <img src={PHOTOS.field} alt="Tibeb scarf" className="h-16 w-16 rounded-xl object-cover" />
          <span className="flex-1"><span className="block text-sm font-semibold">Tibeb Scarf — Gold Weave</span><span className="text-xs text-text-muted">ETB 650 · Low stock</span></span>
          <IconChevronRight size={16} />
        </button>
        </div>
        </div>
      </div>
    </div>
  )
}

function ProductDetail({ onBack, onSeller, saved, onSave, onAddToCart, onChat }: { onBack: () => void; onSeller: () => void; saved: boolean; onSave: () => void; onAddToCart: () => void; onChat: () => void }) {
  const [variant, setVariant] = useState('M')
  const [quantity, setQuantity] = useState(1)
  return (
    <>
      <Header title="Product" onBack={onBack} trailing={<IconButton label="Share">↗</IconButton>} />
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="relative">
          <img src={PHOTOS.hero} alt={PRODUCT.name} className="h-80 w-full object-cover" />
          <div className="absolute bottom-3 left-1/2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white">1 / 3</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Traditional wear</div>
          <div className="mt-1 font-display text-2xl font-semibold leading-tight">{PRODUCT.name}</div>
          <div className="mt-2 text-xl font-bold text-brand">{PRODUCT.price}</div>
          <div className="mt-2 flex items-center gap-2 text-xs"><span className="text-success">● Available</span><span className="text-text-muted">Made to order · 5–7 days</span></div>

          <SectionLabel>Choose size</SectionLabel>
          <div className="flex gap-2">{['S', 'M', 'L', 'XL', 'Custom'].map(v => <Choice key={v} active={variant === v} onClick={() => setVariant(v)}>{v}</Choice>)}</div>
          <SectionLabel>Quantity</SectionLabel>
          <div className="inline-flex items-center rounded-lg border border-border">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-10 text-lg">−</button>
            <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="h-9 w-10 text-lg">+</button>
          </div>

          <button onClick={onSeller} className="mt-6 flex w-full items-center gap-3 rounded-xl bg-surface-raised p-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">AA</span>
            <span className="flex-1"><span className="block text-sm font-semibold">Addis Atelier</span><span className="text-xs text-text-muted">Established seller · 4.9 rating</span></span>
            <IconChevronRight size={16} />
          </button>

          <InfoBlock title="Trust">Purchase protection · Seller identity and business details reviewed by Adulis.</InfoBlock>
          <InfoBlock title="Description">{PRODUCT.description}</InfoBlock>
          <InfoBlock title="Specifications">100% Ethiopian cotton · Hand embroidery · Made in Addis Ababa · Hand wash cold</InfoBlock>
          <InfoBlock title="Fulfilment">Courier delivery in Addis Ababa · Estimated 1–3 business days after production.</InfoBlock>
          <InfoBlock title="Reviews · 4.9 (87)">“The embroidery is even more beautiful in person. Custom sizing was perfect.” — Maya T.</InfoBlock>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-border bg-surface p-3 pb-5">
        <Button variant="tertiary" size="lg" onClick={onSave}>{saved ? 'Saved' : 'Save'}</Button>
        <Button variant="tertiary" size="lg" onClick={onChat}>Chat</Button>
        <Button size="lg" style={{ flex: 1 }} onClick={onAddToCart}>Add to Cart</Button>
      </div>
    </>
  )
}

function SellerProfile({ onBack, onShop }: { onBack: () => void; onShop: () => void }) {
  return (
    <>
      <Header title="Seller" onBack={onBack} trailing={<IconButton label="Share">↗</IconButton>} />
      <div className="flex-1 overflow-y-auto">
        <div className="h-28 bg-gradient-to-br from-brand-muted to-warning-bg" />
        <div className="-mt-10 px-5">
          <div className="flex items-end justify-between">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-surface bg-brand-muted font-display text-2xl font-bold text-brand-dark">AA</div>
            <Button size="sm" variant="secondary">Follow</Button>
          </div>
          <div className="mt-3 font-display text-2xl font-semibold">Addis Atelier</div>
          <div className="text-sm text-text-muted">@addisatelier · Bole, Addis Ababa</div>
          <div className="mt-2 inline-flex rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">Established seller</div>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">Handcrafted Ethiopian fashion, made to order in Addis Ababa. Every piece carries the craft of a master tailor.</p>
          <div className="my-5 grid grid-cols-3 divide-x divide-border rounded-xl bg-surface-raised p-3 text-center">
            <Stat value="4.9" label="Rating" /><Stat value="42" label="Products" /><Stat value="1.2k" label="Followers" />
          </div>
          <Button onClick={onShop} style={{ width: '100%' }}>Shop Addis Atelier</Button>
          <SectionLabel>Recent shoppable posts</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <img src={PHOTOS.hero} alt="Recent post" className="h-44 w-full rounded-xl object-cover" />
            <img src={PHOTOS.field} alt="Recent post" className="h-44 w-full rounded-xl object-cover" />
          </div>
        </div>
      </div>
    </>
  )
}

function SellerShop({ onBack, onProduct, onSearch }: { onBack: () => void; onProduct: () => void; onSearch: () => void }) {
  return (
    <>
      <Header title="Addis Atelier" onBack={onBack} onSearch={onSearch} />
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border px-4 py-3">
        <Choice active>All</Choice><Choice>Traditional</Choice><Choice>Accessories</Choice><Choice>Dresses</Choice>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-end justify-between"><div><div className="font-display text-xl font-semibold">Shop</div><div className="text-xs text-text-muted">42 products</div></div><span className="text-xs font-semibold text-text-muted">Available first</span></div>
        <div className="grid grid-cols-2 gap-3">
          <ProductCard image={PHOTOS.hero} name={PRODUCT.name} price={PRODUCT.price} onClick={onProduct} />
          <ProductCard image={PHOTOS.field} name="Tibeb Scarf — Gold Weave" price="ETB 650" onClick={onProduct} />
          <ProductCard image={PHOTOS.blue} name="Ethiopian Cotton Dress" price="ETB 1,900" onClick={onProduct} />
          <div className="opacity-60"><ProductCard image={PHOTOS.group} name="Habesha Ankle Boots" price="Unavailable" onClick={onProduct} /></div>
        </div>
      </div>
    </>
  )
}

function Search({ query, setQuery, tab, setTab, onProduct, onPost, onSeller }: {
  query: string; setQuery: (q: string) => void; tab: SearchTab; setTab: (t: SearchTab) => void
  onProduct: () => void; onPost: () => void; onSeller: () => void
}) {
  const zero = query.toLowerCase() === 'camera'
  const active = query.length > 0
  return (
    <>
      <div className="border-b border-border bg-surface p-3">
        <SearchInput
          value={query}
          onChange={e => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder="Search products, posts, sellers"
        />
      </div>
      {!active ? <SearchLanding onQuery={setQuery} /> : zero ? <ZeroSearch onClear={() => setQuery('')} /> : (
        <>
          <div className="flex border-b border-border bg-surface">
            {(['top', 'products', 'posts', 'sellers'] as SearchTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-semibold capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-text-muted'}`}>{t}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'top' && <TopResults onProduct={onProduct} onPost={onPost} onSeller={onSeller} />}
            {tab === 'products' && <ProductResults onProduct={onProduct} />}
            {tab === 'posts' && <PostResults onPost={onPost} />}
            {tab === 'sellers' && <SellerResults onSeller={onSeller} />}
          </div>
        </>
      )}
    </>
  )
}

function SearchLanding({ onQuery }: { onQuery: (q: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="font-display text-2xl font-semibold">What are you looking for?</div>
      <p className="mt-1 text-sm text-text-muted">Search intentionally across Products, Posts and Sellers.</p>
      <SectionLabel>Recent</SectionLabel>
      {['Habesha kemis', 'Handwoven coffee sets'].map(q => <button key={q} onClick={() => onQuery(q)} className="flex w-full items-center justify-between border-b border-border py-3 text-sm"><span>↗ &nbsp;{q}</span><span className="text-text-muted">×</span></button>)}
      <SectionLabel>Explore categories</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        {['Traditional wear', 'Home & living', 'Coffee & tea', 'Artisan gifts'].map(c => <button key={c} onClick={() => onQuery(c)} className="rounded-xl bg-surface-raised p-4 text-left text-sm font-semibold">{c}</button>)}
      </div>
      <button onClick={() => onQuery('camera')} className="mt-6 text-xs font-semibold text-text-muted underline">Preview zero-results example</button>
    </div>
  )
}

function TopResults({ onProduct, onPost, onSeller }: { onProduct: () => void; onPost: () => void; onSeller: () => void }) {
  return (
    <div>
      <ResultHeading title="Products" count="24" /><ProductRow onClick={onProduct} />
      <ResultHeading title="Posts" count="18" /><PostRow onClick={onPost} />
      <ResultHeading title="Sellers" count="6" /><SellerRow onClick={onSeller} />
    </div>
  )
}

function ProductResults({ onProduct }: { onProduct: () => void }) {
  return <div><div className="mb-3 flex gap-2"><Choice active>Available</Choice><Choice>Price</Choice><Choice>Category</Choice></div><div className="grid grid-cols-2 gap-3"><ProductCard image={PHOTOS.hero} name={PRODUCT.name} price={PRODUCT.price} onClick={onProduct} /><ProductCard image={PHOTOS.field} name="Tibeb Scarf — Gold Weave" price="ETB 650" onClick={onProduct} /><ProductCard image={PHOTOS.blue} name="Cotton Day Dress" price="ETB 1,900" onClick={onProduct} /></div></div>
}

function PostResults({ onPost }: { onPost: () => void }) {
  return <div className="grid grid-cols-2 gap-2"><PostTile image={PHOTOS.hero} onClick={onPost} /><PostTile image={PHOTOS.blue} onClick={onPost} /><PostTile image={PHOTOS.field} onClick={onPost} /></div>
}

function SellerResults({ onSeller }: { onSeller: () => void }) {
  return <div className="flex flex-col gap-2"><SellerRow onClick={onSeller} /><SellerRow onClick={onSeller} name="Nile Loom" initials="NL" category="Textiles · ESTABLISHED" /><SellerRow onClick={onSeller} name="Buna Market" initials="BM" category="Coffee · NEW" /></div>
}

function ZeroSearch({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-2xl">⌕</div>
      <div className="mt-4 font-display text-xl font-semibold">No results for “camera”</div>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">Try a broader term, check the spelling, or browse a category instead.</p>
      <Button onClick={onClear} variant="secondary" style={{ marginTop: 20 }}>Clear search</Button>
    </div>
  )
}

function Saved({ onCollection, onProduct, onPost }: { onCollection: () => void; onProduct: () => void; onPost: () => void }) {
  return (
    <>
      <Header title="Saved" />
      <GuestStrip />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-end justify-between"><div><div className="font-display text-2xl font-semibold">Your finds</div><div className="text-xs text-text-muted">Private to you</div></div><Button size="sm">New collection</Button></div>
        <button onClick={onCollection} className="w-full rounded-2xl border border-border bg-surface p-3 text-left shadow-sm">
          <div className="grid h-44 grid-cols-2 gap-1 overflow-hidden rounded-xl">
            <img src={PHOTOS.hero} alt="" className="h-full w-full object-cover" />
            <div className="grid gap-1"><img src={PHOTOS.field} alt="" className="h-full min-h-0 w-full object-cover" /><img src={PHOTOS.blue} alt="" className="h-full min-h-0 w-full object-cover" /></div>
          </div>
          <div className="mt-3 flex items-center justify-between"><span><span className="block font-semibold">Ceremony looks</span><span className="text-xs text-text-muted">4 Product Posts · 2 Shoppable Posts</span></span><IconChevronRight size={16} /></div>
        </button>
        <SectionLabel>Recently saved</SectionLabel>
        <div className="grid grid-cols-2 gap-2"><ProductCard image={PHOTOS.hero} name={PRODUCT.name} price={PRODUCT.price} onClick={onProduct} /><PostTile image={PHOTOS.blue} onClick={onPost} label="Shoppable post" /></div>
      </div>
    </>
  )
}

function Collection({ onBack, onProduct, onPost }: { onBack: () => void; onProduct: () => void; onPost: () => void }) {
  return (
    <>
      <Header title="Ceremony looks" onBack={onBack} trailing={<IconButton label="More">•••</IconButton>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-text-muted">A private collection · 6 saved items</div>
        <div className="mt-4 flex gap-2"><Choice active>All 6</Choice><Choice>Product Posts 4</Choice><Choice>Shoppable Posts 2</Choice></div>
        <SectionLabel>Product Posts</SectionLabel>
        <div className="grid grid-cols-2 gap-2"><ProductCard image={PHOTOS.hero} name={PRODUCT.name} price={PRODUCT.price} onClick={onProduct} /><ProductCard image={PHOTOS.field} name="Tibeb Scarf" price="ETB 650" onClick={onProduct} /></div>
        <SectionLabel>Whole Shoppable Posts</SectionLabel>
        <div className="grid grid-cols-2 gap-2"><PostTile image={PHOTOS.blue} onClick={onPost} label="3 products" /><PostTile image={PHOTOS.group} onClick={onPost} label="2 products" /></div>
        <div className="mt-5 rounded-xl border border-warning/30 bg-warning-bg p-3"><div className="text-sm font-semibold text-warning">1 saved Product Post is unavailable</div><div className="mt-1 text-xs text-text-secondary">It remains in this Collection so you can find it again if it returns.</div></div>
      </div>
    </>
  )
}

const ORDER_STAGES: { key: OrderStage; label: string; detail: string }[] = [
  { key: 'paid', label: 'Paid', detail: 'Payment confirmed by provider' },
  { key: 'preparing', label: 'Preparing', detail: 'Addis Atelier is preparing your item' },
  { key: 'ready', label: 'Ready for Courier', detail: 'Package is ready for collection' },
  { key: 'assigned', label: 'Courier Assigned', detail: 'A seller-approved courier is assigned' },
  { key: 'pickup', label: 'Pickup Verified', detail: 'Courier pickup was verified at the seller' },
  { key: 'out', label: 'Out for Delivery', detail: 'Your package is on its way' },
]

function OrdersList({ onOrder, onChats, onNotifications }: { onOrder: () => void; onChats: () => void; onNotifications: () => void }) {
  return (
    <>
      <Header title="Orders" trailing={<div className="flex gap-1"><IconButton label="Chats" onClick={onChats}><ChatIcon /></IconButton><IconButton label="Notifications" onClick={onNotifications}><BellIcon /></IconButton></div>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="font-display text-2xl font-semibold">Your Seller Orders</div>
        <p className="mt-1 text-sm text-text-muted">Track preparation and verified handoff progress.</p>
        <SectionLabel>Active</SectionLabel>
        <button onClick={onOrder} className="w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-sm">
          <SellerIdentity initials="AA" name="Addis Atelier" meta="Order ADU-24091 · Paid" />
          <div className="my-4 flex gap-3">
            <img src={PHOTOS.hero} alt={PRODUCT.name} className="h-20 w-16 rounded-lg object-cover" />
            <span className="flex-1"><span className="block text-sm font-semibold">{PRODUCT.name}</span><span className="mt-1 block text-xs text-text-muted">Size M · Quantity 1</span><span className="mt-2 block text-sm font-bold">ETB 2,994</span></span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-success-bg px-3 py-2 text-xs"><span className="font-semibold text-success">Paid</span><span className="text-text-secondary">View progress ›</span></div>
        </button>
        <SectionLabel>Completed</SectionLabel>
        <div className="rounded-2xl border border-border p-4 opacity-80">
          <SellerIdentity initials="NG" name="Nura Glow" meta="Order ADL-NG-0984 · Completed" />
          <div className="mt-3 flex items-center justify-between text-xs"><span className="text-text-secondary">Honey & Black Seed Skin Set</span><span className="font-semibold">ETB 1,112</span></div>
        </div>
      </div>
    </>
  )
}

function OrderDetail({ stage, setStage, onBack, onDelegate, onScan, onOtp, onClaim, onChat }: {
  stage: OrderStage; setStage: (stage: OrderStage) => void; onBack: () => void; onDelegate: () => void
  onScan: () => void; onOtp: () => void; onClaim: () => void; onChat: () => void
}) {
  const currentIndex = ORDER_STAGES.findIndex(item => item.key === stage)
  const current = ORDER_STAGES[currentIndex]
  return (
    <>
      <Header title="Order ADU-24091" onBack={onBack} trailing={<IconButton label="Chat with seller" onClick={onChat}><ChatIcon /></IconButton>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-brand-muted p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Current status</div>
          <div className="mt-1 font-display text-2xl font-semibold">{current.label}</div>
          <div className="mt-1 text-sm text-text-secondary">{current.detail}</div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype status</div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {ORDER_STAGES.map(item => <Choice key={item.key} active={item.key === stage} onClick={() => setStage(item.key)}>{item.label}</Choice>)}
          </div>
        </div>

        <SectionLabel>Progress</SectionLabel>
        <div className="ml-2">
          {ORDER_STAGES.map((item, index) => (
            <TimelineItem key={item.key} label={item.label} detail={item.detail} done={index <= currentIndex} current={index === currentIndex} last={index === ORDER_STAGES.length - 1} />
          ))}
        </div>

        {stage === 'out' && (
          <div className="mt-2 rounded-2xl border border-brand/20 p-4">
            <div className="font-display text-lg font-semibold">Prepare for handoff</div>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">When the courier arrives, they display the Delivery QR. You or your delegate scans it.</p>
            <Button onClick={onScan} style={{ width: '100%', marginTop: 14 }}>Scan Delivery QR</Button>
            <Button variant="tertiary" onClick={onDelegate} style={{ width: '100%', marginTop: 8 }}>Someone else will receive this</Button>
            <button onClick={onOtp} className="mt-3 w-full text-center text-xs font-semibold text-brand">Use OTP fallback</button>
          </div>
        )}

        <SectionLabel>Order summary</SectionLabel>
        <div className="rounded-xl bg-surface-raised p-4">
          <PriceRow label="Buyer" value="Maya T." />
          <PriceRow label="Seller" value="Addis Atelier" />
          <PriceRow label="Courier" value={currentIndex >= ORDER_STAGES.findIndex(item => item.key === 'assigned') ? 'Daniel K.' : 'Not assigned'} />
          <PriceRow label="Product" value="ETB 2,800" />
          <PriceRow label="Courier Delivery" value="ETB 180" />
          <PriceRow label="Adulis surcharge — 0.5%" value="ETB 14" />
          <div className="mt-2 border-t border-border pt-3"><PriceRow label="Paid total" value="ETB 2,994" strong /></div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="tertiary" size="sm" onClick={onChat} style={{ flex: 1 }}>Chat with seller</Button>
          <Button variant="tertiary" size="sm" onClick={onClaim} style={{ flex: 1 }}>Problem with this Order?</Button>
        </div>
      </div>
    </>
  )
}

function TimelineItem({ label, detail, done, current, last }: { label: string; detail: string; done: boolean; current: boolean; last: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${done ? 'border-brand bg-brand text-white' : 'border-border-strong bg-surface text-text-muted'}`}>{done ? <CheckIconSmall /> : ''}</span>
        {!last && <span className={`h-12 w-0.5 ${done && !current ? 'bg-brand' : 'bg-border'}`} />}
      </div>
      <div className="pb-5"><div className={`text-sm font-semibold ${current ? 'text-brand' : done ? 'text-text-primary' : 'text-text-muted'}`}>{label}</div><div className="text-xs text-text-muted">{detail}</div></div>
    </div>
  )
}

function DelegatedRecipient({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <>
      <Header title="Delegated recipient" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Someone else will receive this</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Add a trusted person who can scan the courier’s Delivery QR or use the fallback OTP at handoff.</p>
        <div className="mt-6 flex flex-col gap-4">
          <TextInput label="Recipient name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
          <PhoneInput label="Recipient phone" value={phone} onChange={setPhone} />
        </div>
        <div className="mt-6 rounded-xl bg-warning-bg p-4">
          <div className="text-sm font-semibold text-warning">Receiving permission only</div>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">The delegated recipient can receive this package, but does not gain:</p>
          <ul className="mt-3 space-y-2 text-xs text-text-secondary">
            <li>• Review rights</li><li>• Claim ownership</li><li>• Refund rights</li><li>• Order ownership</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!name || !phone} onClick={onSave} style={{ width: '100%' }}>Save delegated recipient</Button></div>
    </>
  )
}

function DeliveryScanner({ onBack, onCamera, onOtp }: { onBack: () => void; onCamera: () => void; onOtp: () => void }) {
  return (
    <>
      <Header title="Final handoff" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted text-brand"><ScanIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Scan Delivery QR</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Ask the courier to display the Delivery QR, then scan it with your camera to verify handoff.</p>
        <div className="mt-5 w-full rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">You scan the courier’s QR. You never need to display a delivery QR.</div>
      </div>
      <div className="p-4 pb-6">
        <Button size="lg" onClick={onCamera} style={{ width: '100%' }}>Open camera</Button>
        <button onClick={onOtp} className="mt-4 w-full text-center text-xs font-semibold text-brand">Camera not working? Use OTP fallback</button>
      </div>
    </>
  )
}

function ScannerCamera({ onBack, onScan }: { onBack: () => void; onScan: () => void }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-text-primary text-white">
      <div className="relative z-10 flex items-center gap-3 p-4"><IconButton label="Close camera" onClick={onBack} dark>×</IconButton><div className="font-display text-lg font-semibold">Scan courier’s Delivery QR</div></div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative h-60 w-60 rounded-3xl border-2 border-white/80">
          <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-brand shadow-lg" />
          <span className="absolute inset-10 grid grid-cols-4 gap-2 opacity-30">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={`${i % 3 === 0 ? 'bg-white' : 'border border-white'} rounded-sm`} />)}</span>
        </div>
        <p className="mt-6 px-8 text-center text-sm text-white/70">Position the QR shown on the courier’s device inside the frame.</p>
      </div>
      <div className="p-5 pb-8"><Button onClick={onScan} size="lg" style={{ width: '100%' }}>Simulate QR detected</Button></div>
    </div>
  )
}

function QrVerifying({ onVerified }: { onVerified: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-info-bg text-info"><ProcessingIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Verifying delivery</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">Adulis is verifying the Delivery QR against Order ADU-24091.</p>
      <Button onClick={onVerified} variant="tertiary" style={{ marginTop: 32 }}>Complete verification</Button>
    </div>
  )
}

function DeliveryConfirmed({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Delivery confirmed</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">Final handoff is verified. The Delivery QR was scanned successfully at 4:18 PM.</p>
      <div className="mt-6 w-full rounded-xl bg-success-bg p-4 text-left"><PriceRow label="Seller Order" value="ADU-24091" /><PriceRow label="Handoff" value="Verified" strong /></div>
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue</Button>
    </div>
  )
}

function OtpFallback({ onBack, onVerify }: { onBack: () => void; onVerify: () => void }) {
  const [otp, setOtp] = useState('')
  return (
    <>
      <Header title="OTP fallback" onBack={onBack} />
      <div className="flex-1 p-5">
        <div className="font-display text-2xl font-semibold">Enter courier OTP</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">If QR scanning is unavailable, ask the courier for the one-time delivery code shown in their app.</p>
        <div className="mt-7"><TextInput label="6-digit delivery OTP" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" /></div>
        <div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Only use this while you or your delegate is physically receiving the package.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={otp.length !== 6} onClick={onVerify} style={{ width: '100%' }}>Verify handoff</Button></div>
    </>
  )
}

function CompletedOrder({ onBack, onReview, onClaim }: { onBack: () => void; onReview: () => void; onClaim: () => void }) {
  return (
    <>
      <Header title="Completed Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-2xl bg-success-bg p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white"><CheckIcon /></span><div className="mt-3 font-display text-2xl font-semibold">Completed</div><div className="mt-1 text-sm text-text-secondary">Delivery verified · Order ADU-24091</div></div>
        <SectionLabel>Your order</SectionLabel>
        <div className="flex gap-3"><img src={PHOTOS.hero} alt={PRODUCT.name} className="h-24 w-20 rounded-xl object-cover" /><div><div className="text-sm font-semibold">{PRODUCT.name}</div><div className="mt-1 text-xs text-text-muted">Addis Atelier · Size M</div><div className="mt-2 text-sm font-bold">ETB 2,994 paid</div></div></div>
        <div className="mt-6 rounded-xl border border-brand/20 p-4"><div className="font-display text-lg font-semibold">How was your order?</div><p className="mt-1 text-xs text-text-muted">Your verified handoff means this order now qualifies for a review.</p><Button onClick={onReview} style={{ width: '100%', marginTop: 14 }}>Review Order</Button></div>
        <button onClick={onClaim} className="mt-5 w-full text-center text-xs font-semibold text-brand">Problem with this Order?</button>
      </div>
    </>
  )
}

function ReviewOrder({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const [service, setService] = useState(0)
  const [quality, setQuality] = useState(0)
  const [comment, setComment] = useState('')
  return (
    <>
      <Header title="Review Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <SellerIdentity initials="AA" name="Addis Atelier" meta="Order ADU-24091 · Verified completion" />
        <RatingField label="Seller Service" description="Communication, preparation and seller support" value={service} onChange={setService} />
        <RatingField label="Product Quality" description="Materials, workmanship and description accuracy" value={quality} onChange={setQuality} />
        <div className="mt-6"><Textarea label="Share your experience (optional)" value={comment} onChange={e => setComment(e.target.value)} placeholder="What should other buyers know?" rows={4} /></div>
        <div className="mt-4 rounded-xl bg-surface-raised p-3 text-xs text-text-muted">Seller Service and Product Quality are recorded as separate review scores.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!service || !quality} onClick={onSubmit} style={{ width: '100%' }}>Submit review</Button></div>
    </>
  )
}

function RatingField({ label, description, value, onChange }: { label: string; description: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="mt-7 border-b border-border pb-6">
      <div className="font-display text-lg font-semibold">{label}</div><div className="text-xs text-text-muted">{description}</div>
      <div className="mt-3 flex justify-between">{[1, 2, 3, 4, 5].map(rating => <button key={rating} onClick={() => onChange(rating)} aria-label={`${rating} stars`} className={`text-3xl ${rating <= value ? 'text-warning' : 'text-border-strong'}`}>★</button>)}</div>
    </div>
  )
}

function ClaimStart({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const [issue, setIssue] = useState('')
  return (
    <>
      <Header title="Problem with this Order?" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">What happened?</div>
        <p className="mt-1 text-sm text-text-muted">Select the issue that best describes your problem with Order ADU-24091.</p>
        <div className="mt-5 flex flex-col gap-2">
          {['Item damaged', 'Item not as described', 'Missing item or parts', 'Delivery or handoff issue', 'Something else'].map(option => <button key={option} onClick={() => setIssue(option)} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold ${issue === option ? 'border-brand bg-brand-muted' : 'border-border'}`}><span className={`h-4 w-4 rounded-full border ${issue === option ? 'border-4 border-brand' : 'border-border-strong'}`} />{option}</button>)}
        </div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!issue} onClick={onContinue} style={{ width: '100%' }}>Continue</Button></div>
    </>
  )
}

function ClaimForm({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const [details, setDetails] = useState('')
  const [evidence, setEvidence] = useState(false)
  return (
    <>
      <Header title="Claim details" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl bg-surface-raised p-3 text-sm"><span className="font-semibold">Issue:</span> Item damaged</div>
        <div className="mt-5"><Textarea label="Describe the problem" value={details} onChange={e => setDetails(e.target.value)} placeholder="Tell us what happened and what part of the order is affected." rows={5} /></div>
        <SectionLabel>Evidence</SectionLabel>
        <button onClick={() => setEvidence(true)} className={`flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left ${evidence ? 'border-success bg-success-bg' : 'border-border-strong'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-lg">{evidence ? <CheckIconSmall /> : '+'}</span>
          <span><span className="block text-sm font-semibold">{evidence ? 'damage-photo.jpg added' : 'Add photos or video'}</span><span className="text-xs text-text-muted">Show the item, packaging and affected area</span></span>
        </button>
        <p className="mt-4 text-xs leading-relaxed text-text-muted">Your claim and evidence are evaluated against the order and verified handoff record.</p>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!details || !evidence} onClick={onSubmit} style={{ width: '100%' }}>Submit claim</Button></div>
    </>
  )
}

function ClaimStatus({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-info-bg text-info"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Claim submitted</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">We received your issue and evidence. You’ll be notified when the review status changes.</p>
      <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left"><PriceRow label="Claim" value="CLM-2041" /><PriceRow label="Status" value="Under review" strong /><PriceRow label="Seller Order" value="ADU-24091" /></div>
      <Button size="lg" onClick={onDone} style={{ width: '100%', marginTop: 24 }}>Return to Order</Button>
    </div>
  )
}

function ChatList({ onBack, onConversation, onBot }: { onBack: () => void; onConversation: () => void; onBot: () => void }) {
  return (
    <>
      <Header title="Messages" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <button onClick={onBot} className="mb-4 flex w-full items-center gap-3 rounded-xl bg-brand-muted p-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">A</span><span className="flex-1"><span className="block text-sm font-semibold">Adulis Assistant</span><span className="text-xs text-text-muted">Help with orders and using Adulis</span></span><IconChevronRight size={16} /></button>
        <SectionLabel>Buyer–Seller threads</SectionLabel>
        <button onClick={onConversation} className="flex w-full items-center gap-3 border-b border-border py-4 text-left"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">AA</span><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">Addis Atelier</span><span className="text-[10px] text-text-muted">2m</span></span><span className="block truncate text-xs text-text-muted">Your order is ready for courier pickup.</span></span><span className="h-2 w-2 rounded-full bg-brand" /></button>
        <div className="flex items-center gap-3 border-b border-border py-4 opacity-70"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">NG</span><span><span className="block font-semibold">Nura Glow</span><span className="text-xs text-text-muted">Thanks for your message.</span></span></div>
      </div>
    </>
  )
}

function Conversation({ onBack }: { onBack: () => void }) {
  const [context, setContext] = useState('Order')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <>
      <Header title="Addis Atelier" onBack={onBack} />
      <div className="border-b border-border bg-warning-bg px-4 py-2 text-[10px] leading-relaxed text-text-secondary">Chat helps coordination, but messages do not change payment, order, fulfilment or handoff truth.</div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
        {['Product', 'Post', 'Order'].map(item => <Choice key={item} active={context === item} onClick={() => setContext(item)}>{item === 'Order' ? 'Order ADU-24091' : item}</Choice>)}
      </div>
      <div className="flex-1 overflow-y-auto bg-surface-raised p-4">
        <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-surface p-3 text-sm shadow-sm">Hello Maya, your Kemis is ready. A courier will be assigned shortly.</div>
        <div className="ml-auto mt-3 max-w-[78%] rounded-2xl rounded-tr-sm bg-brand p-3 text-sm text-white">Thank you. Please message me when pickup is verified.</div>
        <div className="mt-3 max-w-[78%] rounded-2xl rounded-tl-sm bg-surface p-3 text-sm shadow-sm">Of course. The Order timeline will show the verified status.</div>
        {sent && <div className="ml-auto mt-3 max-w-[78%] rounded-2xl rounded-tr-sm bg-brand p-3 text-sm text-white">{message || 'Thanks for the update.'}</div>}
      </div>
      <div className="flex items-center gap-2 border-t border-border bg-surface p-3 pb-5">
        <div className="flex-1"><TextInput value={message} onChange={e => setMessage(e.target.value)} placeholder={`Message about ${context.toLowerCase()}`} /></div>
        <Button size="md" onClick={() => setSent(true)}>Send</Button>
      </div>
    </>
  )
}

function Chatbot({ onBack }: { onBack: () => void }) {
  const [answer, setAnswer] = useState(false)
  const [escalated, setEscalated] = useState(false)
  return (
    <>
      <Header title="Adulis Assistant" onBack={onBack} />
      <div className="flex-1 overflow-y-auto bg-surface-raised p-4">
        <div className="max-w-[84%] rounded-2xl rounded-tl-sm bg-surface p-3 text-sm shadow-sm">Hi Maya. I can explain order statuses, QR handoff, claims, and how to contact a seller. What do you need?</div>
        {answer && <div className="mt-3 max-w-[84%] rounded-2xl rounded-tl-sm bg-surface p-3 text-sm shadow-sm">I don’t have an approved answer for custom navy embroidery. A human Seller can confirm what is available.</div>}
        {escalated && <div className="mt-3 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Escalated to Addis Atelier · Seller Companion Inbox</div>}
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6">
        <div className="mb-3 text-xs font-semibold text-text-muted">Suggested question</div>
        <button onClick={() => setAnswer(true)} className="w-full rounded-xl border border-border p-3 text-left text-sm font-semibold">Can the embroidery be navy?</button>
        {answer && <Button onClick={() => setEscalated(true)} disabled={escalated} style={{ width: '100%', marginTop: 10 }}>{escalated ? 'Sent to Seller' : 'Talk to Seller'}</Button>}
      </div>
    </>
  )
}

function Notifications({ onBack, onOrder, onChat }: { onBack: () => void; onOrder: () => void; onChat: () => void }) {
  return (
    <>
      <Header title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        <NotificationItem unread title="Pickup verified" detail="Your Addis Atelier order was collected by the assigned courier." time="Now" onClick={onOrder} />
        <NotificationItem unread title="New message from Addis Atelier" detail="Your order is ready for courier pickup." time="8m" onClick={onChat} />
        <NotificationItem title="Payment confirmed" detail="Order ADU-24091 was created after provider confirmation." time="Yesterday" onClick={onOrder} />
        <NotificationItem title="Nura Glow order completed" detail="Your verified order is ready for review." time="3d" onClick={onOrder} />
      </div>
    </>
  )
}

function NotificationItem({ unread, title, detail, time, onClick }: { unread?: boolean; title: string; detail: string; time: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full gap-3 border-b border-border p-4 text-left ${unread ? 'bg-brand-muted/40' : 'bg-surface'}`}><span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${unread ? 'bg-brand' : 'bg-transparent'}`} /><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-text-muted">{detail}</span></span><span className="text-[10px] text-text-muted">{time}</span></button>
}

function ReportPostSheet({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <div onClick={onClose} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45">
      <div onClick={event => event.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-strong" />
        {!submitted ? <>
          <div className="flex items-center justify-between"><div className="font-display text-xl font-semibold">Report Shoppable Post</div><IconButton label="Close" onClick={onClose}>×</IconButton></div>
          <p className="mt-1 text-xs text-text-muted">Select the reason that best describes the issue.</p>
          <div className="mt-4 flex flex-col gap-2">{['Misleading product information', 'Unsafe or prohibited content', 'Spam or impersonation'].map(value => <button key={value} onClick={() => setReason(value)} className={`rounded-xl border p-3 text-left text-sm font-semibold ${reason === value ? 'border-brand bg-brand-muted' : 'border-border'}`}>{value}</button>)}</div>
          <Button disabled={!reason} onClick={() => setSubmitted(true)} style={{ width: '100%', marginTop: 16 }}>Submit Report</Button>
        </> : <div className="py-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><div className="mt-4 font-display text-xl font-semibold">Report submitted</div><p className="mt-1 text-sm text-text-muted">Moderation case MOD-1208 is ready for review.</p><Button variant="tertiary" onClick={onClose} style={{ marginTop: 16 }}>Done</Button></div>}
      </div>
    </div>
  )
}

function AddToCartConfirmation({ onClose, onCart }: { onClose: () => void; onCart: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45">
      <div onClick={e => e.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-strong" />
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
          <span className="flex-1">
            <span className="block font-display text-xl font-semibold">Added to Addis Atelier cart</span>
            <span className="mt-1 block text-sm text-text-muted">Size M · Quantity 1</span>
          </span>
          <IconButton label="Close" onClick={onClose}>×</IconButton>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="tertiary" size="lg" onClick={onClose} style={{ flex: 1 }}>Keep browsing</Button>
          <Button size="lg" onClick={onCart} style={{ flex: 1 }}>View cart</Button>
        </div>
        <p className="mt-4 text-center text-xs text-text-muted">Items from each seller stay in a separate cart.</p>
      </div>
    </div>
  )
}

function SellerCart({ onBack, onAllCarts, onCheckout }: { onBack: () => void; onAllCarts: () => void; onCheckout: () => void }) {
  const [quantity, setQuantity] = useState(1)
  const [removed, setRemoved] = useState(false)
  return (
    <>
      <Header title="Addis Atelier cart" onBack={onBack} trailing={<button onClick={onAllCarts} className="text-xs font-semibold text-brand">All carts</button>} />
      {removed ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-text-muted"><IconShop size={24} /></span>
          <div className="mt-4 font-display text-xl font-semibold">Addis Atelier cart is empty</div>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">The Product was removed. Your other Seller carts are unchanged.</p>
          <Button variant="secondary" onClick={onBack} style={{ marginTop: 20 }}>Return to Product</Button>
        </div>
      ) : <div className="flex-1 overflow-y-auto p-4">
        <SellerIdentity initials="AA" name="Addis Atelier" meta="1 item · Seller-specific cart" />
        <div className="mt-4 flex gap-3 border-b border-border pb-5">
          <img src={PHOTOS.hero} alt={PRODUCT.name} className="h-28 w-24 rounded-xl object-cover" />
          <div className="flex flex-1 flex-col">
            <div className="text-sm font-semibold leading-snug">{PRODUCT.name}</div>
            <div className="mt-1 text-xs text-text-muted">Size M · Gold border</div>
            <div className="mt-2 text-sm font-bold text-brand">{PRODUCT.price}</div>
            <div className="mt-auto flex items-center justify-between">
              <div className="inline-flex items-center rounded-lg border border-border">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-8 w-8">−</button>
                <span className="w-7 text-center text-xs font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="h-8 w-8">+</button>
              </div>
              <button onClick={() => setRemoved(true)} className="text-xs text-danger">Remove</button>
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-xl bg-surface-raised p-4">
          <PriceRow label="Products" value={`ETB ${quantity * 2800}`} />
          <div className="mt-3 border-t border-border pt-3"><PriceRow label="Cart subtotal" value={`ETB ${quantity * 2800}`} strong /></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">Fulfilment and applicable fees are selected during checkout. This checkout creates an order with Addis Atelier only.</p>
      </div>}
      {!removed && <div className="border-t border-border bg-surface p-4 pb-6">
        <Button size="lg" onClick={onCheckout} style={{ width: '100%' }}>Checkout this Seller cart</Button>
      </div>}
    </>
  )
}

function MultiCart({ onBack, onCheckout }: { onBack: () => void; onCheckout: () => void }) {
  const [nuraNotice, setNuraNotice] = useState(false)
  return (
    <>
      <Header title="Your carts" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="font-display text-2xl font-semibold">2 Seller carts</div>
        <p className="mt-1 text-sm text-text-muted">Each seller is checked out and confirmed separately.</p>
        <CartSummary initials="AA" seller="Addis Atelier" item="Habesha Kemis — Classic White" amount="ETB 2,800" image={PHOTOS.hero} onCheckout={onCheckout} />
        <CartSummary initials="NG" seller="Nura Glow" item="Honey & Black Seed Skin Set" amount="ETB 980" image={PHOTOS.field} onCheckout={() => setNuraNotice(true)} actionLabel="Review separately" />
        {nuraNotice && <div className="mt-3 rounded-xl bg-brand-muted p-3 text-xs leading-relaxed text-brand-dark">Nura Glow remains a separate Seller cart. Finish or leave the Addis Atelier checkout before starting this one.</div>}
        <div className="mt-5 rounded-xl border border-info/20 bg-info-bg p-3 text-xs leading-relaxed text-info">
          Adulis coordinates your carts, but each checkout creates one distinct Seller Order. Amounts, fulfilment and payment status are never combined across sellers.
        </div>
      </div>
    </>
  )
}

function CartSummary({ initials, seller, item, amount, image, onCheckout, actionLabel }: {
  initials: string; seller: string; item: string; amount: string; image: string; onCheckout: () => void; actionLabel?: string
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <SellerIdentity initials={initials} name={seller} meta="1 item" />
      <div className="my-4 flex items-center gap-3">
        <img src={image} alt={item} className="h-16 w-16 rounded-lg object-cover" />
        <div className="flex-1"><div className="text-sm font-semibold">{item}</div><div className="mt-1 text-xs text-text-muted">Quantity 1</div></div>
        <div className="text-sm font-bold">{amount}</div>
      </div>
      <Button size="sm" variant="secondary" onClick={onCheckout} style={{ width: '100%' }}>{actionLabel ?? `Checkout ${seller}`}</Button>
    </div>
  )
}

function CheckoutCoordinator({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <Header title="Checkout" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted font-display text-lg font-bold text-brand-dark">AA</div>
        <div className="mt-4 font-display text-2xl font-semibold">Checkout Addis Atelier</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">You are starting one checkout for one Seller cart. Your Nura Glow cart stays saved and unchanged.</p>
        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-muted p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Seller Order</div>
          <div className="mt-2 flex items-center justify-between"><span className="font-semibold">Addis Atelier</span><span className="font-bold">ETB 2,800</span></div>
          <div className="mt-1 text-xs text-text-secondary">1 product · Fulfilment selected next</div>
        </div>
        <div className="mt-4 rounded-2xl border border-border p-4 opacity-70">
          <div className="flex items-center justify-between"><span className="font-semibold">Nura Glow</span><span className="text-xs text-text-muted">Stays in cart</span></div>
          <div className="mt-1 text-xs text-text-muted">Not part of this checkout</div>
        </div>
        <div className="mt-6 flex gap-3 text-xs text-text-muted">
          <StepDot active label="Seller" /><StepLine /><StepDot label="Fulfilment" /><StepLine /><StepDot label="Payment" />
        </div>
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6"><Button size="lg" onClick={onContinue} style={{ width: '100%' }}>Continue with Addis Atelier</Button></div>
    </>
  )
}

function SellerCheckout({ fulfilment, setFulfilment, onBack, onPay }: {
  fulfilment: Fulfilment; setFulfilment: (value: Fulfilment) => void; onBack: () => void; onPay: () => void
}) {
  const fee = fulfilment === 'courier' ? 180 : fulfilment === 'seller' ? 120 : 0
  const surcharge = 14
  const total = 2800 + fee + surcharge
  return (
    <>
      <Header title="Addis Atelier checkout" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-surface-raised p-3"><SellerIdentity initials="AA" name="Addis Atelier" meta="Seller Order · 1 product" /></div>
        <SectionLabel>Fulfilment</SectionLabel>
        <FulfilmentOption active={fulfilment === 'collection'} onClick={() => setFulfilment('collection')} title="Buyer Collection" detail="Collect from Addis Atelier in Bole" price="No delivery fee" />
        <FulfilmentOption active={fulfilment === 'seller'} onClick={() => setFulfilment('seller')} title="Seller Delivery" detail="Arranged and delivered by the seller" price="ETB 120" />
        <FulfilmentOption active={fulfilment === 'courier'} onClick={() => setFulfilment('courier')} title="Courier Delivery" detail="Seller-approved courier · 1–3 business days" price="ETB 180" />
        {fulfilment === 'courier' && (
          <div className="mt-2 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">
            The ETB 180 Courier Delivery fee is shown now and is separate from the Adulis surcharge.
          </div>
        )}
        <SectionLabel>Delivery details</SectionLabel>
        <div className="rounded-xl border border-border p-3 text-sm">
          <div className="font-semibold">Maya Tesfaye</div>
          <div className="mt-1 text-text-secondary">Bole Medhanialem, Addis Ababa · +251 91 234 5678</div>
          <div className="mt-2 text-xs font-semibold text-text-muted">Saved delivery details</div>
        </div>
        <SectionLabel>Payment breakdown</SectionLabel>
        <div className="rounded-xl bg-surface-raised p-4">
          <PriceRow label="Products" value="ETB 2,800" />
          <PriceRow label={fulfilment === 'courier' ? 'Courier Delivery' : fulfilment === 'seller' ? 'Seller Delivery' : 'Buyer Collection'} value={fee ? `ETB ${fee}` : 'ETB 0'} />
          <PriceRow label="Adulis surcharge — 0.5%" value="ETB 14" />
          <div className="mt-3 border-t border-border pt-3"><PriceRow label="Total" value={`ETB ${total.toLocaleString()}`} strong /></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">Payment status is established by the payment provider and Adulis backend. The seller does not confirm payment.</p>
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6">
        <Button size="lg" onClick={onPay} style={{ width: '100%' }}>Continue to payment · ETB {total.toLocaleString()}</Button>
      </div>
    </>
  )
}

function FulfilmentOption({ active, onClick, title, detail, price }: {
  active: boolean; onClick: () => void; title: string; detail: string; price: string
}) {
  return (
    <button onClick={onClick} className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-brand bg-brand-muted' : 'border-border bg-surface'}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-brand' : 'border-border-strong'}`}>{active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}</span>
      <span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span>
      <span className="text-xs font-semibold">{price}</span>
    </button>
  )
}

function PaymentTransition({ amount, onBack, onContinue }: { amount: number; onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <Header title="Secure payment" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-info-bg text-info"><LockIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Continue with payment provider</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">You’ll complete payment on the provider’s secure page, then return to Adulis for confirmation.</p>
        <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left">
          <PriceRow label="Paying" value="Addis Atelier" />
          <PriceRow label="Seller Order total" value={`ETB ${amount.toLocaleString()}`} strong />
        </div>
        <div className="mt-4 text-xs text-text-muted">Adulis does not ask for payment screenshots. Payment truth comes from the provider and backend.</div>
      </div>
      <div className="p-4 pb-6"><Button size="lg" onClick={onContinue} style={{ width: '100%' }}>Open secure payment</Button></div>
    </>
  )
}

function PaymentProcessing({ amount, onPaid, onFailed, onChecking }: { amount: number; onPaid: () => void; onFailed: () => void; onChecking: () => void }) {
  return (
    <PaymentStateShell
      tone="info"
      title="Processing payment"
      description="The payment provider is processing your payment. Keep this screen open and do not pay again."
    >
      <div className="w-full rounded-xl bg-surface-raised p-4 text-left"><PriceRow label="Seller" value="Addis Atelier" /><PriceRow label="Amount" value={`ETB ${amount.toLocaleString()}`} strong /></div>
      <div className="mt-8 w-full border-t border-border pt-4">
        <div className="mb-2 text-xs font-semibold text-text-muted">Prototype payment outcome</div>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" onClick={onPaid}>Paid</Button>
          <Button size="sm" variant="tertiary" onClick={onFailed}>Failed</Button>
          <Button size="sm" variant="tertiary" onClick={onChecking}>Checking</Button>
        </div>
      </div>
    </PaymentStateShell>
  )
}

function PaymentSuccess({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <PaymentStateShell tone="success" title="Payment confirmed" description="The provider confirmed your payment. Your Seller Order has now been created.">
      <div className="w-full rounded-2xl border border-success/20 bg-success-bg p-4 text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-success">Seller Order confirmed</div>
        <div className="mt-2 font-display text-xl font-semibold">Addis Atelier</div>
        <div className="mt-1 text-sm text-text-secondary">Order ADU-24091 · Paid</div>
        <div className="mt-4 border-t border-success/20 pt-3"><PriceRow label="Paid total" value={`ETB ${amount.toLocaleString()}`} strong /></div>
      </div>
      <Button size="lg" onClick={onDone} style={{ width: '100%', marginTop: 24 }}>Done</Button>
    </PaymentStateShell>
  )
}

function PaymentFailed({ onRetry, onCart }: { onRetry: () => void; onCart: () => void }) {
  return (
    <PaymentStateShell tone="danger" title="Payment failed" description="The provider could not complete this payment. No Seller Order was created and your cart is still saved.">
      <div className="w-full rounded-xl bg-danger-bg p-4 text-left text-sm text-danger">No charge was confirmed by the payment provider.</div>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button size="lg" onClick={onRetry}>Try payment again</Button>
        <Button size="lg" variant="tertiary" onClick={onCart}>Return to Addis Atelier cart</Button>
      </div>
    </PaymentStateShell>
  )
}

function PaymentChecking({ onRefresh, onDone }: { onRefresh: () => void; onDone: () => void }) {
  return (
    <PaymentStateShell tone="warning" title="Checking payment" description="The provider response is delayed. Adulis is reconciling with the provider before creating a Seller Order.">
      <div className="w-full rounded-xl bg-warning-bg p-4 text-left">
        <div className="text-sm font-semibold text-warning">Do not pay again</div>
        <div className="mt-1 text-xs leading-relaxed text-text-secondary">We’ll use the provider and backend result as the source of truth. A seller cannot mark this payment as paid.</div>
      </div>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button size="lg" onClick={onRefresh}>Check again</Button>
        <Button size="lg" variant="tertiary" onClick={onDone}>Preview reconciled payment</Button>
      </div>
    </PaymentStateShell>
  )
}

function PaymentStateShell({ tone, title, description, children }: {
  tone: 'info' | 'success' | 'danger' | 'warning'; title: string; description: string; children: ReactNode
}) {
  const toneClass = {
    info: 'bg-info-bg text-info',
    success: 'bg-success-bg text-success',
    danger: 'bg-danger-bg text-danger',
    warning: 'bg-warning-bg text-warning',
  }[tone]
  return (
    <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-8 text-center">
      <span className={`flex h-16 w-16 items-center justify-center rounded-full ${toneClass}`}>{tone === 'success' ? <CheckIcon /> : tone === 'danger' ? '×' : <ProcessingIcon />}</span>
      <div className="mt-5 font-display text-2xl font-semibold">{title}</div>
      <p className="mb-7 mt-2 text-sm leading-relaxed text-text-secondary">{description}</p>
      {children}
    </div>
  )
}

function SellerIdentity({ initials, name, meta }: { initials: string; name: string; meta: string }) {
  return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">{initials}</span><span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className="text-xs text-text-muted">{meta}</span></span></div>
}

function PriceRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`mb-2 flex items-center justify-between gap-4 text-sm ${strong ? 'font-bold text-text-primary' : 'text-text-secondary'}`}><span>{label}</span><span className="whitespace-nowrap">{value}</span></div>
}

function StepDot({ active, label }: { active?: boolean; label: string }) {
  return <span className={`flex flex-col items-center gap-1 ${active ? 'text-brand' : 'text-text-muted'}`}><span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-brand' : 'bg-border-strong'}`} /><span>{label}</span></span>
}

function StepLine() {
  return <span className="mt-1 h-px flex-1 bg-border-strong" />
}

function CheckIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function LockIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>
}

function ProcessingIcon() {
  return <svg className="animate-spin" width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity=".25"/><path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

function ResultHeading({ title, count }: { title: string; count: string }) {
  return <div className="mb-2 mt-4 flex items-center justify-between"><span className="font-display text-lg font-semibold">{title}</span><span className="text-xs text-text-muted">{count} results</span></div>
}

function ProductRow({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full gap-3 rounded-xl bg-surface-raised p-2 text-left"><img src={PHOTOS.hero} alt={PRODUCT.name} className="h-20 w-20 rounded-lg object-cover" /><span className="flex-1 py-1"><span className="block text-sm font-semibold">{PRODUCT.name}</span><span className="block text-xs text-text-muted">{PRODUCT.seller}</span><span className="mt-2 block text-sm font-bold text-brand">{PRODUCT.price}</span></span></button>
}

function PostRow({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="flex w-full gap-3 rounded-xl bg-surface-raised p-2 text-left"><img src={PHOTOS.blue} alt="Shoppable post" className="h-20 w-20 rounded-lg object-cover" /><span className="py-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-brand">Shoppable post</span><span className="mt-1 block text-sm font-semibold">Indigo, hand finishing, and warm afternoons</span><span className="text-xs text-text-muted">Nile Loom · 3 products</span></span></button>
}

function SellerRow({ onClick, name = 'Addis Atelier', initials = 'AA', category = 'Fashion · Established' }: { onClick: () => void; name?: string; initials?: string; category?: string }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl bg-surface-raised p-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">{initials}</span><span className="flex-1"><span className="block text-sm font-semibold">{name}</span><span className="text-xs text-text-muted">{category}</span></span><span className="text-xs font-semibold text-brand">View</span></button>
}

function ProductCard({ image, name, price, onClick }: { image: string; name: string; price: string; onClick: () => void }) {
  return <button onClick={onClick} className="overflow-hidden rounded-xl bg-surface text-left"><img src={image} alt={name} className="h-44 w-full rounded-xl object-cover" /><span className="mt-2 block text-xs font-semibold leading-snug">{name}</span><span className="mt-1 block text-xs font-bold text-brand">{price}</span></button>
}

function PostTile({ image, onClick, label = '2 products' }: { image: string; onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="relative overflow-hidden rounded-xl text-left"><img src={image} alt="Shoppable post" className="h-52 w-full object-cover" /><span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white"><TagIcon /> <span className="ml-1">{label}</span></span></button>
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-b border-border py-5"><div className="mb-2 font-display text-lg font-semibold">{title}</div><div className="text-sm leading-relaxed text-text-secondary">{children}</div></div>
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function Choice({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{children}</button>
}

function IconButton({ children, label, onClick, dark }: { children: ReactNode; label: string; onClick?: () => void; dark?: boolean }) {
  return <button aria-label={label} onClick={onClick} className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg ${dark ? 'bg-black/35 text-white' : 'bg-surface-raised text-text-secondary'}`}>{children}</button>
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div><div className="font-semibold">{value}</div><div className="text-[10px] text-text-muted">{label}</div></div>
}

function TagIcon() {
  return <svg className="inline" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 2.5v3.2L6.8 11 11 6.8 5.7 1.5H2.5a1 1 0 00-1 1z" stroke="currentColor" strokeWidth="1.3"/><circle cx="4" cy="4" r=".8" fill="currentColor"/></svg>
}

function ChatIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2.5h12v8H7l-3.5 3v-3H2v-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
}

function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 00-4 4v3l-1.5 2h11L12 9V6a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M6.5 12.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4"/></svg>
}

function ScanIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.6"/></svg>
}

function CheckIconSmall() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
