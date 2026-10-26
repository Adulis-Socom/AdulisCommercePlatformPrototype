import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { PhoneInput, SearchInput, Textarea, TextInput } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Overlay'
import { VerificationFailed } from '../components/ui/Handoff'
import {
  PhoneFrame, BottomNav, IconHome, IconShop, IconHeart, IconOrders, IconUser,
  IconSearch, IconChevronDown, IconChevronRight,
} from './ShellHelpers'
import { useStory, useStoryMoment } from '../StoryClock'
import {
  BUYERS, CHATBOTS, CHECKOUT_TESTS, CLAIMS, COLLECTIONS, COLLECTION_IDS, CONTEXT_GROUPS, CONVERSATIONS, CONVERSATION_IDS, COURIERS, DEMO_CARTS, GENERAL_CONTEXT, GUEST_STATE,
  MARKET, MODERATION_CASES, ORDERS, ORDER_TIMELINES, PRODUCTS, REVIEWS, REVIEW_IDS, SELLERS, SHOPPABLE_POSTS, SURFACE_DEFAULTS,
  activeDiscount, buyerVisiblePostsAt, buyerVisibleProductsAt, buyerVisibleSellers, byMessageTime, checkoutTotalsAt, claimStateAt, claimSubmitted, claimsForOrder,
  contextChoicesAt, contextKey, contextSubject, conversationBetween, currentPrice, describeFulfilment, discountsAt, discoveryAreas, effectiveMessagesAt, finalHandoffAt, followingAt,
  forYouAt, formatAge, formatClock12, formatClockShort, formatCompactCount, formatDayMonth, formatEtb, formatMonthShortYear, formatMonthYear, fulfilmentOptionsAt, happenedBefore, initials, isBuyerVisibleAt,
  isContextChoiceAt, isPubliclyEligibleAt, isPurchasableAt, lineOptions, locallyMadeAt, nearbyAt, notificationTime, notificationsAt, onAdulisSince, ordersAt, orderStateAt, orderTotals, paidAt, paymentAttempts,
  productQualityAt, productsSubtotal, reviewEligibilityAt, reviewsAt, sameContext, sellerCompletedOrdersAt, sellerPostsAt, sellerProductsAt, sellerServiceAt, shortName, stateTime, storyGroupsAt, testPaymentRef, trustAt, trustLabel,
  type SellerStoryGroup, type StoryId,
  type CheckoutTest, type CheckoutTestId, type ClaimId, type CollectionId, type CollectionItem, type ConversationId, type FinalHandoff, type FulfilmentMode, type MessageContext,
  type MessageRecord, type ModerationId, type Moment, type NotificationRecord, type OrderId, type OrderLine, type OrderState, type OrderTotals, type ProductId,
  type SellerId, type ShoppablePostId, type Timestamp,
} from '../demo-data'

type TabKey = 'home' | 'shop' | 'saved' | 'orders' | 'you'
/** Buyer Home's discovery channels (rule 2.3, specification §7). For You is the FYP; the others aren't synonyms for it. */
type Channel = 'foryou' | 'following' | 'nearby' | 'discounts' | 'locally-made'
type SearchTab = 'top' | 'products' | 'posts' | 'sellers'
type Screen =
  | 'start' | 'feed' | 'post' | 'product' | 'seller' | 'seller-shop'
  | 'search' | 'saved' | 'collection' | 'seller-cart' | 'multi-cart'
  | 'checkout-coordinator' | 'seller-checkout' | 'payment-transition'
  | 'payment-processing' | 'payment-success' | 'payment-failed' | 'payment-checking'
  | 'orders' | 'order-detail' | 'delegated-recipient' | 'qr-scanner' | 'qr-camera'
  | 'qr-verifying' | 'qr-failed' | 'delivery-confirmed' | 'otp' | 'completed' | 'review'
  | 'claim-start' | 'claim-form' | 'claim-status' | 'chats' | 'conversation'
  | 'chatbot' | 'notifications' | 'you' | 'sign-in-phone' | 'sign-in-code' | 'cart-check'
/** A guest browses public content; signing in shows Maya's signed-in state (rules 3.1–3.12, specification §12). */
type Auth = 'guest' | 'signed-in'
/** A Save target: a Product Post or a whole Shoppable Post (rule 2.5), never one standing in for the other. */
type SaveKey = `product:${ProductId}` | `post:${ShoppablePostId}`
/**
 * Where the Buyer was heading when sign-in was required: it resumes after sign-in (rule 3.10, specification §7, §12),
 * including the Home channel and the intended Save or Not Interested.
 */
type Intent = { screen: Screen; tab?: TabKey; channel?: Channel; then?: 'checkout' | 'report' | 'save' | 'hide'; save?: SaveKey; hide?: ShoppablePostId }
/**
 * A sheet over Home, a Shoppable Post or a Product Post. "In this post" lists the selected post's Products, a hotspot's
 * own Product first. Share is about the selected post, or a Product Post when one is given.
 */
type DiscoverySheet = { kind: 'products'; featured?: ProductId } | { kind: 'more'; channel?: Channel } | { kind: 'share'; product?: ProductId }
/** A line of the temporary prototype Cart: transient session state, never a canonical record (rule 3.12). */
type CartLine = OrderLine
/**
 * The conversation Chat opens, by Seller (one per Buyer and Seller, rule 12.1); the context its composer starts on: the
 * entry point's own record, otherwise General / Seller; and where Back returns. The context is the composer's, never the
 * conversation's.
 */
type ChatEntry = { seller: SellerId; context: MessageContext; from: Screen }
/** A payment attempt made in this session, by its PAY- or TESTPAY- reference. Processing until the outcome shows. */
type Attempt = { ref: string; status: 'Processing' | 'Paid' | 'Failed' }
/**
 * A Seller Order this session's Checkout created (WO-006): one of DEMO_DATA's two Flow D Orders in Flows C and D, or a
 * Checkout test run's TEST- Order. It is created with its first payment attempt, once its Seller cart passes
 * revalidation, and keeps the lines, fulfilment and totals it was created with. A retry is another attempt on the same
 * Seller Order (rule 5.9). It is transient session state: DEMO_DATA never changes, and a reset removes it (rule 3.12).
 */
type CheckoutOrder = { ref: string; test: boolean; seller: SellerId; lines: readonly CartLine[]; mode: FulfilmentMode; totals: OrderTotals; attempts: readonly Attempt[] }
/** A Seller Order's own state in a coordinated checkout (WO-006 requirement 20). */
type OrderStatus = 'PAID' | 'PAYMENT FAILED' | 'NOT YET PAID'
/** A Seller Order a coordinated checkout covers: numbered in payment order, with its Order once created. */
type ProgressEntry = { number: number; seller: SellerId; order?: CheckoutOrder }
/** What Reset test restores: the Buyer's carts and checkout as they were before the first test run loaded. */
type BeforeTest = { cart: CartLine[]; screen: Screen; cartSeller: SellerId; checkoutSeller: SellerId; modes: Partial<Record<SellerId, FulfilmentMode>>; paying: string | null }
/** A Checkout test run (WO-006 requirements 12–24) and whether its availability race has happened. */
type TestRun = { test: CheckoutTest; raced: boolean; before: BeforeTest }

// The start screen's photograph illustrates no demo record, so it stays. Products and posts show neutral placeholders:
// DEMO_DATA defines no imagery, and the inherited photographs showed other items.
const PHOTOS = {
  group: 'https://images.unsplash.com/photo-1691826280718-b365d22809e3?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=900',
}

const BUYER = SURFACE_DEFAULTS.buyer

// Claim issues: the categories the approved documents use (DEMO_DATA › Claims). Report reasons: the prototype report
// categories (specification §7).
const CLAIM_ISSUES = ['Item damaged', 'Item not as described']
const REPORT_CATEGORIES = [
  'Misleading or inaccurate product information',
  'Prohibited or unsafe product',
  'Spam or scam',
  'Inappropriate or abusive content',
  'Intellectual-property concern',
  'Other',
]

const TABS = [
  { key: 'home' as TabKey, label: 'Home', icon: <IconHome size={22} /> },
  { key: 'shop' as TabKey, label: 'Shop', icon: <IconShop size={22} /> },
  { key: 'saved' as TabKey, label: 'Saved', icon: <IconHeart size={22} /> },
  { key: 'orders' as TabKey, label: 'Orders', icon: <IconOrders size={22} /> },
  { key: 'you' as TabKey, label: 'You', icon: <IconUser size={22} /> },
]

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'foryou', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'nearby', label: 'Nearby' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'locally-made', label: 'Locally Made' },
]

// Where a post's hotspot markers sit on its image, above the Seller and caption. DEMO_DATA gives each post a hotspot
// count and its tagged Products in order, but no positions, so these are illustrative only and never Product data:
// marker n opens the post's nth tag.
const HOTSPOT_SPOTS = [{ left: '57%', top: '30%' }, { left: '24%', top: '16%' }, { left: '70%', top: '42%' }]

// Controls on a post's photo: the keyboard focus outline uses the light inverse colour so it shows on the image (§57).
const ON_PHOTO = { outlineColor: 'var(--color-text-inverse)' }

// Where whatever lies outside a control is clipped (the sideways-scrolling channel bar, a post filling its unit), the
// keyboard focus outline is drawn inside the control instead of 2 px outside it, so it isn't cut off. 2 px in from the
// edge it stays clear of the selected channel's underline.
const INSET_FOCUS = { outlineOffset: '-5px' }

// The surcharge row's label names its basis: 0.5% of the Products subtotal, never of a delivery charge (rules 5.6–5.8).
// Non-breaking spaces keep "0.5% of products" together when a narrow phone wraps the label.
const SURCHARGE_LABEL = 'Adulis surcharge — 0.5% of products'

// How far the channel bar's overflow shadow reaches in from its right edge, in px. At 360 px the bar ends 11 px after the
// "Discounts" label, so 10 px covers no fully visible label at rest.
const CHANNEL_CUE_WIDTH = 10

// The screens that hold the signed-in Buyer's own data or actions (rules 3.2–3.4, 3.7). A guest sees the sign-in
// requirement on them instead; the cart screens stay public (rule 3.6).
const ORDER_SCREENS: readonly Screen[] = ['orders', 'order-detail', 'delegated-recipient', 'qr-scanner', 'qr-camera', 'qr-verifying', 'qr-failed', 'delivery-confirmed', 'otp', 'completed', 'review', 'claim-start', 'claim-form', 'claim-status']
const CHECKOUT_SCREENS: readonly Screen[] = ['cart-check', 'checkout-coordinator', 'seller-checkout', 'payment-transition', 'payment-processing', 'payment-success', 'payment-failed', 'payment-checking']
// A guided-flow step that opens on a cart or checkout screen starts with DEMO_DATA's Flow D carts.
const CART_SCREENS: readonly Screen[] = ['seller-cart', 'multi-cart', ...CHECKOUT_SCREENS]

/** The sign-in requirement a guest sees on an account-bound screen, with the approved Orders and You messages (rules 3.3–3.4). */
function signInGate(screen: Screen): { title: string; message: string; then?: 'checkout' } | null {
  if (screen === 'you') return { title: 'You', message: 'Sign in to see your profile.' }
  if (ORDER_SCREENS.includes(screen)) return { title: 'Orders', message: 'Sign in to start ordering and track your orders.' }
  if (screen === 'saved' || screen === 'collection') return { title: 'Saved', message: 'Sign in to save.' }
  if (screen === 'chats' || screen === 'conversation' || screen === 'chatbot') return { title: 'Messages', message: 'Sign in to chat with sellers.' }
  if (screen === 'notifications') return { title: 'Notifications', message: 'Sign in to see notifications.' }
  if (CHECKOUT_SCREENS.includes(screen)) return { title: 'Checkout', message: 'Sign in to check out.', then: 'checkout' }
  return null
}

/** The temporary Cart's Seller carts, in the order each Seller's first item was added: carts stay separated by Seller (rules 4.1–4.3). */
function sellerCarts(cart: readonly CartLine[]): { seller: SellerId; lines: CartLine[] }[] {
  const groups: { seller: SellerId; lines: CartLine[] }[] = []
  for (const line of cart) {
    const seller = PRODUCTS[line.product].seller
    const group = groups.find(item => item.seller === seller)
    if (group) group.lines.push(line)
    else groups.push({ seller, lines: [line] })
  }
  return groups
}

const sameLine = (a: CartLine, b: CartLine) => a.product === b.product && a.options.join('\u0000') === b.options.join('\u0000')

/** The cart without the given lines' quantities: a paid Seller Order's items leave the Cart (checked out). */
function withoutLines(cart: readonly CartLine[], lines: readonly CartLine[]): CartLine[] {
  return cart
    .map(item => ({ ...item, quantity: item.quantity - lines.filter(line => sameLine(line, item)).reduce((sum, line) => sum + line.quantity, 0) }))
    .filter(item => item.quantity > 0)
}

/**
 * The DEMO_DATA Order a Seller cart is, line for line, while that Order isn't paid yet at `at`: Flows C and D pay
 * DEMO_DATA's Flow D carts (DD › Seller Orders). Any other cart outside a Checkout test run creates no Seller Order.
 */
function canonicalOrderFor(seller: SellerId, lines: readonly CartLine[], at: Moment): OrderId | undefined {
  return DEMO_CARTS.find(id => {
    const order = ORDERS[id]
    return order.seller === seller && orderStateAt(id, at) === null && lines.length === order.lines.length && order.lines.every(line => lines.some(other => sameLine(line, other) && other.quantity === line.quantity))
  })
}

/** A Seller Order's state from its latest payment attempt (WO-006 requirement 20). */
function orderStatus(order?: CheckoutOrder): OrderStatus {
  const last = order?.attempts[order.attempts.length - 1]
  return last?.status === 'Paid' ? 'PAID' : last?.status === 'Failed' ? 'PAYMENT FAILED' : 'NOT YET PAID'
}

/**
 * The outcome of the Order's attempt `index` (from 0): DEMO_DATA's for an ADU- Order (Flow D's second Order fails its
 * first attempt, rule 5.9), the test run's for a TEST- Order. Outcomes are deterministic, so the prototype never invents or rewrites a payment.
 */
function scheduledOutcome(order: CheckoutOrder, test: CheckoutTest | undefined, index: number): 'Paid' | 'Failed' {
  if (!order.test) return paymentAttempts(order.ref as OrderId)[index]?.status ?? 'Paid'
  return test?.orders.find(item => item.ref === order.ref)?.attempts[index] === 'FAILED' ? 'Failed' : 'Paid'
}

/** The reference of the Order's attempt `index` (from 0): PAY-<order number>-<attempt> or TESTPAY-<scenario>-<order>-<attempt>. */
function attemptRef(order: CheckoutOrder, index: number): string {
  return order.test ? testPaymentRef(order.ref, index + 1) : paymentAttempts(order.ref as OrderId)[index].ref
}

/** DEMO_DATA's Order as this session's Checkout created it, with the given attempt outcomes so far. */
function demoOrder(id: OrderId, attempts: readonly Attempt['status'][]): CheckoutOrder {
  const order = ORDERS[id]
  return { ref: id, test: false, seller: order.seller, lines: order.lines, mode: order.fulfilment, totals: orderTotals(id), attempts: attempts.map((status, i) => ({ ref: paymentAttempts(id)[i].ref, status })) }
}

/**
 * Where a guided-flow step that opens on a cart, checkout or payment screen starts: DEMO_DATA's Flow D carts, and on a
 * payment screen that payment's Seller Order (Flow D's first, or the second one's failed attempt).
 */
function initialCheckout(screen: Screen): { cart: CartLine[]; orders: CheckoutOrder[]; paying: string | null } {
  const cart = CART_SCREENS.includes(screen) ? DEMO_CARTS.flatMap(id => ORDERS[id].lines) : []
  const [first, second] = DEMO_CARTS
  const start = (order: CheckoutOrder) => ({ cart: orderStatus(order) === 'PAID' ? withoutLines(cart, order.lines) : cart, orders: [order], paying: order.ref })
  if (screen === 'payment-success') return start(demoOrder(first, ['Paid']))
  if (screen === 'payment-processing' || screen === 'payment-checking') return start(demoOrder(first, ['Processing']))
  if (screen === 'payment-failed') return start(demoOrder(second, ['Failed']))
  return { cart, orders: [], paying: null }
}

/** The Order's DEMO_DATA Claim that hasn't been submitted at `at`: the Claim a claim step submits. Other claims are transient. */
function upcomingClaim(orderId: OrderId, at: Moment): ClaimId | undefined {
  return claimsForOrder(orderId).find(id => !happenedBefore(claimSubmitted(id), at))
}

/** A neutral stand-in for a Product or post image: DEMO_DATA defines no imagery, so it shows the record's initials. */
function Placeholder({ label, initialsOf, className, dark }: { label: string; initialsOf?: string; className: string; dark?: boolean }) {
  return <div role="img" aria-label={label} className={`flex items-center justify-center font-display font-bold ${dark ? 'text-white/20' : 'bg-surface-raised text-text-muted'} ${className}`}>{initials(initialsOf ?? label)}</div>
}

/** The Product's availability as Buyers see it: an out-of-stock Product is "Currently unavailable". */
function availabilityText(id: ProductId) {
  const availability = PRODUCTS[id].availability
  return availability === 'Out of Stock' ? 'Currently unavailable' : availability
}

/** A Collection item's Save key: a Product Post or a whole Shoppable Post. */
function saveKeyOf(item: CollectionItem): SaveKey {
  return 'product' in item ? `product:${item.product}` : `post:${item.post}`
}

function itemOf(key: SaveKey): CollectionItem {
  return key.startsWith('product:') ? { product: key.slice('product:'.length) as ProductId } : { post: key.slice('post:'.length) as ShoppablePostId }
}

export default function MobileBuyer({ demoTarget }: { demoTarget?: string }) {
  const initialScreen = (demoTarget && ['start', 'feed', 'post', 'product', 'seller', 'seller-shop', 'search', 'saved', 'collection', 'seller-cart', 'multi-cart', 'checkout-coordinator', 'seller-checkout', 'payment-transition', 'payment-processing', 'payment-success', 'payment-failed', 'payment-checking', 'orders', 'order-detail', 'delegated-recipient', 'qr-scanner', 'qr-camera', 'qr-verifying', 'delivery-confirmed', 'otp', 'completed', 'review', 'claim-start', 'claim-form', 'claim-status', 'chats', 'conversation', 'chatbot', 'notifications'].includes(demoTarget) ? demoTarget : 'start') as Screen
  const initialTab: TabKey = initialScreen === 'orders' ? 'orders' : initialScreen === 'saved' ? 'saved' : initialScreen === 'search' ? 'shop' : 'home'
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  // Home discovery state: transient session state, as is the rest of this app's; a reset remounts it at the baseline.
  const [channel, setChannel] = useState<Channel>('foryou')
  // The Nearby area the Buyer chose. Without one, Maya starts from her saved discovery area; a guest has none (rule 2.14).
  // Switching to a guest clears a choice made while signed in.
  const [chosenArea, setChosenArea] = useState<string | null>(null)
  // Saves and removals made in this session, on top of the canonical default Saved Collection; DEMO_DATA never changes.
  const [savedChanges, setSavedChanges] = useState<Partial<Record<SaveKey, boolean>>>({})
  // Posts hidden from For You with Not Interested, for this session only (rule 3.9, specification §7). They're Maya's
  // personalization, so a guest's For You never applies them.
  const [hidden, setHidden] = useState<ShoppablePostId[]>([])
  const [discoverySheet, setDiscoverySheet] = useState<DiscoverySheet | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // Where an opened post or Product returns to, and each channel's scroll position, so discovery picks up where it was.
  const [postFrom, setPostFrom] = useState<Screen>('feed')
  const [productFrom, setProductFrom] = useState<Screen>('post')
  const feedScroll = useRef<Partial<Record<Channel, number>>>({})
  const [searchTab, setSearchTab] = useState<SearchTab>('top')
  const [query, setQuery] = useState('')
  const [addedToCart, setAddedToCart] = useState<{ product: ProductId; options: readonly string[]; quantity: number } | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  // Seller Stories (PR-003): the Seller whose Stories are open, and the Stories seen in this session (transient).
  const [storySeller, setStorySeller] = useState<SellerId | null>(null)
  const [seenStories, setSeenStories] = useState<readonly StoryId[]>([])
  // The records the screens show: a guided-flow step starts on its DEMO_DATA records, and opening an item selects it.
  const story = useStory()
  const focus = story.focus
  // The step's story moment; it moves on as the Buyer performs the step's documented events (payment, scan, review).
  const [at, advanceTo] = useStoryMoment()
  const [postId, setPostId] = useState<ShoppablePostId>(focus?.post ?? SURFACE_DEFAULTS.post)
  const [productId, setProductId] = useState<ProductId>(focus?.product ?? SURFACE_DEFAULTS.product)
  const [sellerId, setSellerId] = useState<SellerId>(SHOPPABLE_POSTS[focus?.post ?? SURFACE_DEFAULTS.post].seller)
  // The Seller profile's tab: Scenes when a Seller is opened (PR-002); kept while its Scenes, Products or chat are open.
  const [sellerTab, setSellerTab] = useState<SellerTab>(initialScreen === 'seller-shop' ? 'products' : 'scenes')
  const [orderId, setOrderId] = useState<OrderId>(focus?.order ?? SURFACE_DEFAULTS.order)
  const [collectionId, setCollectionId] = useState<CollectionId>(COLLECTION_IDS.find(id => COLLECTIONS[id].owner === BUYER)!)
  const [chat, setChat] = useState<ChatEntry>({ seller: CONVERSATIONS[focus?.conversation ?? SURFACE_DEFAULTS.conversation].seller, context: GENERAL_CONTEXT, from: 'chats' })
  // The messages Maya sends in this session, per conversation, each with the context it was sent with (rule 12.3). They
  // are transient: DEMO_DATA never changes, and a reset remounts the app without them.
  const [sentMessages, setSentMessages] = useState<Partial<Record<ConversationId, readonly MessageRecord[]>>>({})
  const [claimIssue, setClaimIssue] = useState('')
  const [claimId, setClaimId] = useState<ClaimId | undefined>(upcomingClaim(focus?.order ?? SURFACE_DEFAULTS.order, story.moment))
  const [orderStage, setOrderStage] = useState<OrderState>(orderStateAt(focus?.order ?? SURFACE_DEFAULTS.order, story.moment) ?? 'Paid')
  // The public entry screen starts anonymous; every guided-flow step shows Maya, signed in throughout the story (DEMO_DATA › Buyer).
  const [auth, setAuth] = useState<Auth>(initialScreen === 'start' ? 'guest' : 'signed-in')
  const signedIn = auth === 'signed-in'
  const [signInPrompt, setSignInPrompt] = useState<{ title: string; intent: Intent } | null>(null)
  const [intent, setIntent] = useState<Intent>({ screen: 'feed', tab: 'home' })
  const [signInFrom, setSignInFrom] = useState<Screen>('start')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  // The temporary Cart is this session's own state, so signing in keeps it (rules 3.10, 3.12); a reset remounts the app.
  const [initial] = useState(() => initialCheckout(initialScreen))
  const [cart, setCart] = useState<CartLine[]>(initial.cart)
  const [cartSeller, setCartSeller] = useState<SellerId>(ORDERS[DEMO_CARTS[0]].seller)
  const [checkoutSeller, setCheckoutSeller] = useState<SellerId>(ORDERS[DEMO_CARTS[0]].seller)
  // Checkout (WO-006), all transient session state that a reset removes (rule 3.12): each Seller cart's own fulfilment
  // choice (rule 4.3); the Seller Orders this session's Checkout created, with their payment attempts; the Order being
  // paid (none yet: the checkout Seller's cart, before its Order exists); and the Checkout test run, if one is loaded.
  const [modeChoice, setModeChoice] = useState<Partial<Record<SellerId, FulfilmentMode>>>({})
  const [orders, setOrders] = useState<CheckoutOrder[]>(initial.orders)
  const [payingRef, setPayingRef] = useState<string | null>(initial.paying)
  const [run, setRun] = useState<TestRun | null>(null)
  // Whether the Cart check followed sign-in (rule 3.11) or the start of a checkout (WO-006 requirement 24).
  const [checkAfterSignIn, setCheckAfterSignIn] = useState(false)
  const [notificationsFrom, setNotificationsFrom] = useState<Screen>('orders')
  // The final Handoff this session verified (WO-006A): by which method, and whether a later attempt found it already
  // verified. Transient: DEMO_DATA's record of the Handoff never changes.
  const [handoffMethod, setHandoffMethod] = useState<HandoffMethod>()
  const [repeatScan, setRepeatScan] = useState(false)
  const [codeFrom, setCodeFrom] = useState<Screen>('qr-scanner')
  const openPost = (id: ShoppablePostId) => { setDiscoverySheet(null); setPostId(id); setSellerId(SHOPPABLE_POSTS[id].seller); if (screen !== 'post') setPostFrom(screen); setScreen('post') }
  const openProduct = (id: ProductId) => { setDiscoverySheet(null); setProductId(id); setSellerId(PRODUCTS[id].seller); if (screen !== 'product') setProductFrom(screen); setScreen('product') }
  const openSeller = (id: SellerId) => { setSellerId(id); setSellerTab('scenes'); setScreen('seller') }
  const openOrder = (id: OrderId) => { setOrderId(id); setOrderStage(orderStateAt(id, at) ?? 'Paid'); setScreen('order-detail') }
  const openConversation = (entry: ChatEntry) => { setChat(entry); setScreen('conversation') }
  const openClaim = () => { setClaimId(upcomingClaim(orderId, at)); setScreen('claim-start') }
  // A verified scan or code completes the Order at DEMO_DATA's time for it, once: the open Handoff is accepted, an
  // already verified one is only confirmed again, and one that isn't open yet can't be verified (WO-006A).
  const handoffVerified = (method: HandoffMethod) => {
    const phase = finalHandoffAt(orderId, at).phase
    if (phase === 'open') { const done = stateTime(orderId, 'Completed'); if (done) advanceTo(done); setOrderStage('Completed'); setHandoffMethod(method); setRepeatScan(false); setScreen('delivery-confirmed') }
    else if (phase === 'verified') { setRepeatScan(true); setScreen('delivery-confirmed') }
    else setScreen('qr-scanner')
  }
  // Order Detail's prototype status: choosing a later state moves the story moment to DEMO_DATA's time for it, so the
  // Handoff it shows still follows story time; an earlier or untimed state is only previewed.
  const selectStage = (state: OrderState) => { const time = stateTime(orderId, state); if (time && !happenedBefore(time, at)) advanceTo(time); setOrderStage(state) }
  const openCode = (from: Screen) => { setCodeFrom(from); setScreen('otp') }

  // Account-bound actions ask a guest to sign in instead of acting (rules 3.5, 3.7, 3.9); a signed-in Buyer just acts.
  const requireSignIn = (title: string, next: Intent, act: () => void) => (signedIn ? act() : setSignInPrompt({ title, intent: next }))
  const startSignIn = (next: Intent) => { setSignInPrompt(null); setIntent(next); setSignInFrom(screen); setPhone(''); setCode(''); setScreen('sign-in-phone') }
  // Once a test run's availability race has happened (WO-006 requirement 24), its Product can't be bought in that run.
  // DEMO_DATA's Product, and every other run, keep their canonical availability.
  const raced = run?.raced ? run.test.race : undefined
  const purchasable = (id: ProductId) => id !== raced && isPurchasableAt(id, at)
  const availabilityOf = (id: ProductId) => (id === raced ? 'Currently unavailable' : availabilityText(id))
  const carts = sellerCarts(cart)
  const checkoutLines = carts.find(item => item.seller === checkoutSeller)?.lines ?? []
  // Checkout continues only once the Cart is revalidated against current availability (rule 3.11). `racedNow` is a race
  // that happened as this checkout started, before its state update.
  const unavailable = cart.filter(line => !purchasable(line.product))
  const continueCheckout = (racedNow?: ProductId, afterSignIn = false) => {
    setCheckAfterSignIn(afterSignIn)
    setScreen(cart.some(line => line.product === racedNow || !purchasable(line.product)) ? 'cart-check' : 'checkout-coordinator')
  }
  // The Seller Orders of this session's Checkout that count now: the test run's while one is loaded, otherwise DEMO_DATA's.
  const sessionOrders = orders.filter(order => order.test === !!run)
  const openOrderFor = (seller: SellerId) => sessionOrders.find(order => order.seller === seller && orderStatus(order) !== 'PAID')
  const payingOrder = payingRef ? orders.find(order => order.ref === payingRef) : undefined
  // The Seller Order the next payment attempt is for: the one being retried, or the checkout Seller's Order still waiting
  // for payment. Without one, opening secure payment creates the checkout Seller cart's Order.
  const retrying = (payingOrder && orderStatus(payingOrder) === 'PAYMENT FAILED' ? payingOrder : undefined) ?? openOrderFor(checkoutSeller)
  // Each Seller cart's own fulfilment choice (rule 4.3). Until the Buyer chooses, Checkout preselects the mode of the
  // Seller Order it creates (the test run's or DEMO_DATA's), otherwise Courier Delivery where the Seller offers it.
  const modeFor = (seller: SellerId, lines: readonly CartLine[]): FulfilmentMode => {
    const options = fulfilmentOptionsAt(seller, at)
    const offered = (mode?: FulfilmentMode) => (mode && options.some(option => option.mode === mode) ? mode : undefined)
    const canonical = canonicalOrderFor(seller, lines, at)
    const planned = run ? run.test.orders.find(order => order.seller === seller)?.mode : canonical && ORDERS[canonical].fulfilment
    return offered(modeChoice[seller]) ?? offered(planned) ?? offered('Courier Delivery') ?? options[0].mode
  }
  // The Seller Order a Seller cart's Checkout creates: the test run's TEST- Order for that Seller, or DEMO_DATA's Order in
  // Flows C and D, with its own fulfilment mode. Otherwise why no Seller Order is created.
  const orderPlanFor = (seller: SellerId, lines: readonly CartLine[], mode: FulfilmentMode): { ref: string; test: boolean } | { note: string } => {
    const name = SELLERS[seller].name
    if (run) {
      if (run.test.race) return { note: 'The availability-race test stops before payment. No Seller Order is created.' }
      const planned = run.test.orders.find(order => order.seller === seller)
      if (!planned) return { note: `${run.test.label} has no Seller Order for ${name}. No Seller Order is created.` }
      const existing = orders.find(order => order.ref === planned.ref)
      if (existing && orderStatus(existing) === 'PAID') return { note: `${planned.ref} is already paid in this test run. No other Seller Order is created.` }
      return { ref: planned.ref, test: true }
    }
    const canonical = canonicalOrderFor(seller, lines, at)
    if (!canonical) return { note: "Payment runs only for the demo story's Seller Orders and the Checkout test runs. No Seller Order is created." }
    const required = ORDERS[canonical].fulfilment
    if (mode !== required) return { note: `In the demo story, ${canonical} is paid with ${required}. Choose ${required} to continue. No Seller Order is created.` }
    return { ref: canonical, test: false }
  }
  // Paying a Seller Order that is waiting for payment again: another attempt on the same Order (rule 5.9).
  const retryPayment = (order: CheckoutOrder) => {
    setPayingRef(order.ref)
    setCheckoutSeller(order.seller)
    requireSignIn('Sign in to check out', { screen: 'payment-transition' }, () => setScreen('payment-transition'))
  }
  const startCheckout = (seller: SellerId) => {
    const open = openOrderFor(seller)
    if (open) return retryPayment(open)
    setCheckoutSeller(seller)
    // Requirement 24's race: the run makes its Product unavailable once it is in this Seller cart, as checkout starts.
    const race = run && !run.raced && run.test.race && PRODUCTS[run.test.race].seller === seller && cart.some(line => line.product === run.test.race) ? run.test.race : undefined
    if (race && run) setRun({ ...run, raced: true })
    requireSignIn('Sign in to check out', { screen: 'checkout-coordinator', then: 'checkout' }, () => continueCheckout(race))
  }
  // Open secure payment: the Seller cart is revalidated once more, then its Seller Order is created with its first
  // payment attempt, or a retry adds the next attempt to the same Order. No attempt is created for an invalid cart.
  const openPayment = () => {
    const seller = retrying?.seller ?? checkoutSeller
    const lines = retrying?.lines ?? checkoutLines
    if (lines.some(line => !purchasable(line.product))) return continueCheckout()
    let order = retrying
    if (!order) {
      const mode = modeFor(seller, lines)
      const plan = orderPlanFor(seller, lines, mode)
      if ('note' in plan) return setScreen('seller-checkout')
      order = { ref: plan.ref, test: plan.test, seller, lines, mode, totals: checkoutTotalsAt(seller, lines, mode, at), attempts: [] }
    }
    const next: CheckoutOrder = { ...order, attempts: [...order.attempts, { ref: attemptRef(order, order.attempts.length), status: 'Processing' }] }
    setOrders(all => (all.some(item => item.ref === next.ref) ? all.map(item => (item.ref === next.ref ? next : item)) : [...all, next]))
    setPayingRef(next.ref)
    setScreen('payment-processing')
  }
  // The Seller Orders this coordinated checkout covers, in payment order (WO-006 requirements 19–20): the test run's, or
  // DEMO_DATA's Flow D Orders. Each keeps its own state; the count is coordination only, never one cross-Seller Order.
  const progress: ProgressEntry[] = (run ? run.test.orders.map(order => ({ ref: order.ref, seller: order.seller })) : DEMO_CARTS.map(id => ({ ref: id as string, seller: ORDERS[id].seller })))
    .flatMap(({ ref, seller }, i) => {
      const order = sessionOrders.find(item => item.ref === ref)
      if (order) return [{ number: i + 1, seller, order }]
      const lines = carts.find(item => item.seller === seller)?.lines
      return lines && (run || canonicalOrderFor(seller, lines, at) === ref) ? [{ number: i + 1, seller }] : []
    })
  const nextUp = progress.find(entry => orderStatus(entry.order) !== 'PAID' && carts.some(item => item.seller === entry.seller))
  const checkoutMode = modeFor(checkoutSeller, checkoutLines)
  const checkoutPlan = orderPlanFor(checkoutSeller, checkoutLines, checkoutMode)
  // The outcome of the attempt in progress, as the provider and backend establish it (rules 5.1–5.5): DEMO_DATA's
  // attempts move the story to their times (10:05, 10:06, 10:07); a test run moves no story time. A paid Order's items
  // leave the Cart.
  const resolvePayment = () => {
    const order = payingOrder
    if (!order) return
    const index = order.attempts.length - 1
    const status = scheduledOutcome(order, run?.test, index)
    if (!order.test) advanceTo(paymentAttempts(order.ref as OrderId)[index].at)
    setOrders(all => all.map(item => (item.ref === order.ref ? { ...item, attempts: item.attempts.map((attempt, i) => (i === index ? { ...attempt, status } : attempt)) } : item)))
    if (status === 'Failed') return setScreen('payment-failed')
    const rest = withoutLines(cart, order.lines)
    const remaining = sellerCarts(rest).map(item => item.seller)
    const following = progress.find(entry => entry.order?.ref !== order.ref && orderStatus(entry.order) !== 'PAID' && remaining.includes(entry.seller))?.seller ?? remaining[0]
    setCart(rest)
    if (following) setCartSeller(following)
    setScreen('payment-success')
  }
  // The prototype-only Checkout test control (WO-006 requirement 23). Loading a run replaces the Buyer's carts with the
  // run's; Reset test removes its TEST- Orders, TESTPAY- attempts, race and progress and restores what it replaced.
  const loadTest = (id: CheckoutTestId) => {
    const test = CHECKOUT_TESTS.find(item => item.id === id)
    if (!test) return
    const first = PRODUCTS[test.cart[0].product].seller
    setRun({ test, raced: false, before: run?.before ?? { cart, screen, cartSeller, checkoutSeller, modes: modeChoice, paying: payingRef } })
    setOrders(all => all.filter(order => !order.test))
    setModeChoice({})
    setPayingRef(null)
    setCart([...test.cart])
    setCartSeller(first)
    setCheckoutSeller(first)
    setDiscoverySheet(null)
    setAddedToCart(null)
    setReportOpen(false)
    setSignInPrompt(null)
    if (!test.race) return setScreen(test.orders.length > 1 ? 'multi-cart' : 'seller-cart')
    // The race starts on its Product's Product Post, where it is still purchasable.
    setProductId(test.race)
    setSellerId(PRODUCTS[test.race].seller)
    setProductFrom('multi-cart')
    setScreen('product')
  }
  const resetTest = () => {
    if (!run) return
    const { before } = run
    setRun(null)
    setOrders(all => all.filter(order => !order.test))
    setModeChoice(before.modes)
    setPayingRef(before.paying)
    setCart(before.cart)
    setCartSeller(before.cartSeller)
    setCheckoutSeller(before.checkoutSeller)
    setDiscoverySheet(null)
    setAddedToCart(null)
    setScreen(before.screen)
  }
  // Save adds to Maya's default Saved Collection (WO-004 requirement 11): its canonical items plus this session's changes.
  const defaultCollection = COLLECTION_IDS.find(id => COLLECTIONS[id].owner === BUYER && COLLECTIONS[id].isDefault)!
  const inSaved = (key: SaveKey) => savedChanges[key] ?? COLLECTIONS[defaultCollection].items.some(item => saveKeyOf(item) === key)
  const isSaved = (key: SaveKey) => signedIn && inSaved(key)
  const setSavedTo = (key: SaveKey, value: boolean) => setSavedChanges(changes => { const next = { ...changes }; delete next[key]; next[key] = value; return next })
  const save = (key: SaveKey) => { if (inSaved(key)) return setToast('Already in Saved'); setSavedTo(key, true); setToast('Added to Saved') }
  const toggleSave = (key: SaveKey, from: Intent) => requireSignIn('Sign in to save', { ...from, then: 'save', save: key }, () => {
    if (!inSaved(key)) return save(key)
    setSavedTo(key, false)
    setToast('Removed from Saved')
  })
  // Not Interested hides the post from this session's For You only: no recommendation model, Seller or other channel changes.
  const hidePost = (post: ShoppablePostId) => { setHidden(posts => (posts.includes(post) ? posts : [...posts, post])); setToast('Hidden from For You for this session') }
  const notInterested = (post: ShoppablePostId) => requireSignIn("Sign in to hide content you're not interested in", { screen: 'feed', tab: 'home', channel: 'foryou', then: 'hide', hide: post }, () => hidePost(post))
  // Follows come from DEMO_DATA (WO-004 requirement 11), so the prototype doesn't change them; a guest is asked to sign in.
  const follow = (from: Intent) => requireSignIn('Sign in to follow sellers', from, () => setToast('Prototype: follows stay as in the demo data'))
  const report = (post: ShoppablePostId, from: Intent) => { setPostId(post); requireSignIn('Sign in to report this post', { ...from, then: 'report' }, () => setReportOpen(true)) }
  const follows: readonly SellerId[] = signedIn ? BUYERS[BUYER].follows ?? [] : []
  const area = chosenArea ?? (signedIn ? BUYERS[BUYER].discoveryArea ?? null : null)
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])
  const signIn = (next: Intent = intent) => {
    setAuth('signed-in')
    if (next.tab) setActiveTab(next.tab)
    if (next.channel) setChannel(next.channel)
    if (next.then === 'checkout') return continueCheckout(undefined, true)
    setScreen(next.screen)
    if (next.then === 'report') setReportOpen(true)
    if (next.then === 'save' && next.save) save(next.save)
    if (next.then === 'hide' && next.hide) hidePost(next.hide)
  }
  // The prototype switch signs in at once. During a sign-in request it continues where the guest was heading, as sign-in does.
  const switchSignedIn = () => {
    if (signInPrompt) { setSignInPrompt(null); return signIn(signInPrompt.intent) }
    if (screen === 'sign-in-phone' || screen === 'sign-in-code') return signIn()
    setAuth('signed-in')
  }
  const addToCart = (line: CartLine) => {
    setCart(lines => (lines.some(item => sameLine(item, line)) ? lines.map(item => (sameLine(item, line) ? { ...item, quantity: item.quantity + line.quantity } : item)) : [...lines, line]))
    setCartSeller(PRODUCTS[line.product].seller)
  }

  const goTab = (key: TabKey) => {
    setActiveTab(key)
    if (key === 'home') setScreen('feed')
    if (key === 'shop') setScreen('search')
    if (key === 'saved') setScreen('saved')
    if (key === 'orders') setScreen('orders')
    if (key === 'you') setScreen('you')
  }

  const showNav = ['feed', 'search', 'saved', 'orders', 'you'].includes(screen)
  const gate = signedIn ? null : signInGate(screen)
  const shown: Screen | 'gated' = gate ? 'gated' : screen

  return (
    <PhoneFrame
      label={`05 — MOBILE BUYER · ${signedIn ? shortName(BUYERS[BUYER].name).toUpperCase() : 'GUEST'}`}
      clock={formatClockShort(at.at)}
      toolbar={
        <PrototypeSignInSwitch signedIn={signedIn} onGuest={() => { setAuth('guest'); setSignInPrompt(null); setReportOpen(false); setDiscoverySheet(null); setChosenArea(null) }} onSignedIn={switchSignedIn}>
          <CheckoutTestControl active={run?.test ?? null} onLoad={loadTest} onReset={resetTest} />
        </PrototypeSignInSwitch>
      }
    >
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {run && <TestRunBanner label={run.test.label} />}
        {gate && <SignInRequired title={gate.title} message={gate.message} onSignIn={() => startSignIn({ screen, tab: activeTab, then: gate.then })} />}
        {shown === 'start' && <AppStart onExplore={() => { setAuth('guest'); setActiveTab('home'); setScreen('feed') }} onSignIn={() => startSignIn({ screen: 'feed', tab: 'home' })} />}
        {shown === 'sign-in-phone' && <SignInPhone phone={phone} setPhone={setPhone} onBack={() => setScreen(signInFrom)} onContinue={() => setScreen('sign-in-code')} />}
        {shown === 'sign-in-code' && <SignInCode phone={phone} code={code} setCode={setCode} onBack={() => setScreen('sign-in-phone')} onVerify={signIn} />}
        {shown === 'feed' && (
          <Home
            at={at}
            guest={!signedIn}
            channel={channel}
            onChannel={setChannel}
            area={area}
            areaChosen={chosenArea !== null}
            onArea={setChosenArea}
            hidden={signedIn ? hidden : []}
            follows={follows}
            isSaved={isSaved}
            scroll={feedScroll.current}
            onScrolled={(scrolled, top) => { feedScroll.current[scrolled] = top }}
            onSignIn={() => startSignIn({ screen: 'feed', tab: 'home', channel })}
            onSignInFollowing={() => startSignIn({ screen: 'feed', tab: 'home', channel: 'following' })}
            onNotifications={() => { setNotificationsFrom('feed'); requireSignIn('Sign in to see notifications', { screen: 'notifications' }, () => setScreen('notifications')) }}
            onSearch={() => { setScreen('search'); setActiveTab('shop') }}
            onPost={openPost}
            onProduct={openProduct}
            onHotspot={(post, product) => { setPostId(post); setDiscoverySheet({ kind: 'products', featured: product }) }}
            onProducts={post => { setPostId(post); setDiscoverySheet({ kind: 'products' }) }}
            onSeller={openSeller}
            onFollow={() => follow({ screen: 'feed', tab: 'home', channel })}
            onSave={post => toggleSave(`post:${post}`, { screen: 'feed', tab: 'home', channel })}
            onShare={post => { setPostId(post); setDiscoverySheet({ kind: 'share' }) }}
            onMore={post => { setPostId(post); setDiscoverySheet({ kind: 'more', channel }) }}
            stories={storyGroupsAt(at)}
            seenStories={seenStories}
            onStory={group => { setStorySeller(group.seller); setSeenStories(seen => [...new Set([...seen, ...group.stories.map(story => story.id)])]) }}
          />
        )}
        {shown === 'post' && (
          <ExpandedPost
            postId={postId}
            at={at}
            onBack={() => setScreen(postFrom)}
            onHotspot={product => setDiscoverySheet({ kind: 'products', featured: product })}
            onProducts={() => setDiscoverySheet({ kind: 'products' })}
            onSeller={() => openSeller(SHOPPABLE_POSTS[postId].seller)}
            onReport={() => requireSignIn('Sign in to report this post', { screen: 'post', then: 'report' }, () => setReportOpen(true))}
          />
        )}
        {shown === 'product' && (
          <ProductDetail
            productId={productId}
            at={at}
            withdrawn={productId === raced}
            saved={isSaved(`product:${productId}`)}
            onSave={() => toggleSave(`product:${productId}`, { screen: 'product' })}
            onShare={() => setDiscoverySheet({ kind: 'share', product: productId })}
            onBack={() => setScreen(productFrom)}
            onSeller={() => openSeller(PRODUCTS[productId].seller)}
            onAddToCart={(options, quantity) => { addToCart({ product: productId, options, quantity }); setAddedToCart({ product: productId, options, quantity }) }}
            // Only a Seller with a chatbot has one to ask; otherwise Chat opens the conversation with the Seller, its
            // composer on this Product Post (WO-005). A guest signs in first and then arrives there.
            onChat={() => {
              const seller = PRODUCTS[productId].seller
              const next: Screen = CHATBOTS[seller] ? 'chatbot' : 'conversation'
              setChat({ seller, context: { product: productId }, from: 'product' })
              requireSignIn('Sign in to chat with sellers', { screen: next }, () => setScreen(next))
            }}
          />
        )}
        {/* The Seller profile; 'seller-shop' is the same profile opened on its Products (PR-002). Message opens the general
            conversation with the Seller; a guest signs in first and then arrives there. */}
        {(shown === 'seller' || shown === 'seller-shop') && (
          <SellerProfile
            sellerId={sellerId}
            at={at}
            signedIn={signedIn}
            tab={sellerTab}
            onTab={setSellerTab}
            onFollow={() => follow({ screen: shown })}
            onMessage={() => {
              setChat({ seller: sellerId, context: GENERAL_CONTEXT, from: shown })
              requireSignIn('Sign in to chat with sellers', { screen: 'conversation' }, () => setScreen('conversation'))
            }}
            onBack={() => setScreen('feed')}
            onSearch={() => setScreen('search')}
            onPost={openPost}
            onProduct={openProduct}
          />
        )}
        {shown === 'search' && (
          <Search
            at={at}
            recent={signedIn ? BUYERS[BUYER].recentSearches ?? [] : []}
            query={query}
            setQuery={setQuery}
            tab={searchTab}
            setTab={setSearchTab}
            onProduct={openProduct}
            onPost={openPost}
            onSeller={openSeller}
          />
        )}
        {shown === 'saved' && <Saved changes={savedChanges} onCollection={id => { setCollectionId(id); setScreen('collection') }} onProduct={openProduct} onPost={openPost} />}
        {shown === 'collection' && <Collection collectionId={collectionId} changes={savedChanges} onBack={() => setScreen('saved')} onProduct={openProduct} onPost={openPost} />}
        {shown === 'seller-cart' && (
          <SellerCart
            seller={cartSeller}
            lines={carts.find(item => item.seller === cartSeller)?.lines ?? []}
            isAvailable={signedIn ? purchasable : null}
            availabilityOf={availabilityOf}
            held={openOrderFor(cartSeller)}
            onBack={() => setScreen('product')}
            onAllCarts={() => setScreen('multi-cart')}
            onCheckout={() => startCheckout(cartSeller)}
            onQuantity={(line, quantity) => setCart(lines => lines.map(item => (sameLine(item, line) ? { ...item, quantity } : item)))}
            onRemove={line => setCart(lines => lines.filter(item => !sameLine(item, line)))}
          />
        )}
        {shown === 'multi-cart' && <MultiCart carts={carts} first={cartSeller} isAvailable={signedIn ? purchasable : null} openOrderFor={openOrderFor} progress={progress} onBack={() => setScreen('seller-cart')} onCheckout={startCheckout} />}
        {shown === 'cart-check' && <CartCheck unavailable={unavailable} availabilityOf={availabilityOf} afterSignIn={checkAfterSignIn} seller={checkoutSeller} sellerReady={checkoutLines.length > 0 && checkoutLines.every(line => purchasable(line.product))} onContinue={() => setScreen('checkout-coordinator')} onReview={seller => { setCartSeller(seller); setScreen('seller-cart') }} onAllCarts={() => setScreen('multi-cart')} />}
        {shown === 'checkout-coordinator' && <CheckoutCoordinator seller={checkoutSeller} lines={checkoutLines} others={carts.filter(item => item.seller !== checkoutSeller).map(item => item.seller)} onBack={() => setScreen('multi-cart')} onContinue={() => setScreen('seller-checkout')} />}
        {shown === 'seller-checkout' && <SellerCheckout at={at} seller={checkoutSeller} lines={checkoutLines} mode={checkoutMode} onMode={mode => setModeChoice(choices => ({ ...choices, [checkoutSeller]: mode }))} note={'note' in checkoutPlan ? checkoutPlan.note : undefined} onBack={() => setScreen('checkout-coordinator')} onPay={() => { setPayingRef(null); setScreen('payment-transition') }} />}
        {shown === 'payment-transition' && <PaymentTransition seller={retrying?.seller ?? checkoutSeller} amount={retrying?.totals.total ?? checkoutTotalsAt(checkoutSeller, checkoutLines, checkoutMode, at).total} retrying={retrying} onBack={() => { if (!retrying) return setScreen('seller-checkout'); setPayingRef(retrying.ref); setScreen('payment-failed') }} onContinue={openPayment} />}
        {shown === 'payment-processing' && payingOrder && <PaymentProcessing order={payingOrder} source={run ? run.test.label : 'Demo data'} outcome={scheduledOutcome(payingOrder, run?.test, payingOrder.attempts.length - 1)} onOutcome={resolvePayment} onChecking={() => setScreen('payment-checking')} />}
        {shown === 'payment-success' && payingOrder && <PaymentSuccess order={payingOrder} progress={progress} next={nextUp && SELLERS[nextUp.seller].name} onNext={() => nextUp && startCheckout(nextUp.seller)} onDone={() => { setActiveTab('orders'); setScreen('orders') }} />}
        {shown === 'payment-failed' && payingOrder && <PaymentFailed order={payingOrder} progress={progress} onRetry={() => retryPayment(payingOrder)} onCart={() => { setCartSeller(payingOrder.seller); setScreen('seller-cart') }} />}
        {shown === 'payment-checking' && <PaymentChecking onRefresh={() => setScreen('payment-processing')} onDone={resolvePayment} />}
        {shown === 'orders' && <OrdersList at={at} onOrder={openOrder} onChats={() => setScreen('chats')} onNotifications={() => { setNotificationsFrom('orders'); setScreen('notifications') }} />}
        {shown === 'order-detail' && <OrderDetail orderId={orderId} at={at} stage={orderStage} setStage={selectStage} onBack={() => setScreen('orders')} onDelegate={() => setScreen('delegated-recipient')} onScan={() => setScreen('qr-scanner')} onOtp={() => openCode('order-detail')} onCompleted={() => setScreen('completed')} onClaim={openClaim} onChat={() => openConversation({ seller: ORDERS[orderId].seller, context: { order: orderId }, from: 'order-detail' })} />}
        {shown === 'delegated-recipient' && <DelegatedRecipient handoff={finalHandoffAt(orderId, at)} onBack={() => setScreen('order-detail')} onSave={() => setScreen('order-detail')} />}
        {shown === 'qr-scanner' && <DeliveryScanner handoff={finalHandoffAt(orderId, at)} at={at} onBack={() => setScreen('order-detail')} onCamera={() => setScreen('qr-camera')} onOtp={() => openCode('qr-scanner')} onCompleted={() => setScreen('completed')} />}
        {shown === 'qr-camera' && <ScannerCamera handoff={finalHandoffAt(orderId, at)} onBack={() => setScreen('qr-scanner')} onScan={() => setScreen('qr-verifying')} onUnreadable={() => setScreen('qr-failed')} />}
        {shown === 'qr-verifying' && <QrVerifying handoff={finalHandoffAt(orderId, at)} onVerified={() => handoffVerified('QR')} />}
        {shown === 'qr-failed' && <ScanFailed handoff={finalHandoffAt(orderId, at)} at={at} onBack={() => setScreen('order-detail')} onRetry={() => setScreen('qr-camera')} onCode={() => openCode('qr-failed')} />}
        {shown === 'delivery-confirmed' && <DeliveryConfirmed handoff={finalHandoffAt(orderId, at)} at={at} method={handoffMethod} repeat={repeatScan} onContinue={() => setScreen('completed')} />}
        {shown === 'otp' && <OtpFallback handoff={finalHandoffAt(orderId, at)} at={at} onBack={() => setScreen(codeFrom)} onVerify={() => handoffVerified('OTP')} onCompleted={() => setScreen('completed')} />}
        {shown === 'completed' && <CompletedOrder orderId={orderId} at={at} onBack={() => setScreen('orders')} onReview={() => setScreen('review')} onClaim={openClaim} />}
        {shown === 'review' && <ReviewOrder orderId={orderId} onBack={() => setScreen('completed')} onSubmit={() => { const review = REVIEW_IDS.find(id => REVIEWS[id].order === orderId); if (review) advanceTo(REVIEWS[review].written); setScreen('completed') }} />}
        {shown === 'claim-start' && <ClaimStart orderId={orderId} issue={claimIssue} setIssue={setClaimIssue} onBack={() => setScreen('order-detail')} onContinue={() => setScreen('claim-form')} />}
        {shown === 'claim-form' && <ClaimForm claimId={claimId} issue={claimIssue} onBack={() => setScreen('claim-start')} onSubmit={() => { if (claimId) advanceTo(claimSubmitted(claimId)); setScreen('claim-status') }} />}
        {shown === 'claim-status' && <ClaimStatus orderId={orderId} claimId={claimId} at={at} onDone={() => setScreen('order-detail')} />}
        {shown === 'chats' && <ChatList at={at} sent={sentMessages} onBack={() => setScreen('orders')} onConversation={seller => openConversation({ seller, context: GENERAL_CONTEXT, from: 'chats' })} />}
        {shown === 'conversation' && <Conversation sellerId={chat.seller} startContext={chat.context} at={at} sent={sentMessages} onSend={(conversation, message) => setSentMessages(all => ({ ...all, [conversation]: [...(all[conversation] ?? []), { ...message, sequence: Object.values(all).reduce((n, list) => n + (list?.length ?? 0), 0) + 1 }] }))} onBack={() => setScreen(chat.from)} />}
        {shown === 'chatbot' && <Chatbot productId={productId} onBack={() => setScreen('product')} onEscalate={advanceTo} />}
        {shown === 'notifications' && <Notifications at={at} onBack={() => setScreen(notificationsFrom)} onOrder={openOrder} />}
        {shown === 'you' && <YouProfile at={at} onSeller={openSeller} />}

        {showNav && (
          <BottomNav items={TABS} active={activeTab} onSelect={k => goTab(k as TabKey)} />
        )}

        {discoverySheet?.kind === 'products' && <ProductSheet postId={postId} featured={discoverySheet.featured} at={at} onClose={() => setDiscoverySheet(null)} onDetail={openProduct} />}
        {discoverySheet?.kind === 'more' && (
          <MoreSheet
            postId={postId}
            notInterested={discoverySheet.channel === 'foryou'}
            onClose={() => setDiscoverySheet(null)}
            onNotInterested={() => { setDiscoverySheet(null); notInterested(postId) }}
            onReport={() => { setDiscoverySheet(null); report(postId, { screen, tab: activeTab, channel: discoverySheet.channel }) }}
          />
        )}
        {discoverySheet?.kind === 'share' && (discoverySheet.product
          ? <ShareSheet title={PRODUCTS[discoverySheet.product].name} sellerId={PRODUCTS[discoverySheet.product].seller} onClose={() => setDiscoverySheet(null)} />
          : <ShareSheet title={SHOPPABLE_POSTS[postId].title} sellerId={SHOPPABLE_POSTS[postId].seller} onClose={() => setDiscoverySheet(null)} />)}
        <Toast message={toast} />
        {addedToCart && (
          <AddToCartConfirmation
            {...addedToCart}
            onClose={() => setAddedToCart(null)}
            onCart={() => { setAddedToCart(null); setScreen('seller-cart') }}
          />
        )}
        {reportOpen && <ReportPostSheet postId={postId} onClose={() => setReportOpen(false)} />}
        {shown === 'feed' && storySeller && (() => {
          const group = storyGroupsAt(at).find(g => g.seller === storySeller)
          return group && (
            <StoryViewer
              group={group}
              at={at}
              onClose={() => setStorySeller(null)}
              onProduct={id => { setStorySeller(null); openProduct(id) }}
              onPost={id => { setStorySeller(null); openPost(id) }}
            />
          )
        })()}
        {signInPrompt && <SignInSheet title={signInPrompt.title} onSignIn={() => startSignIn(signInPrompt.intent)} onClose={() => setSignInPrompt(null)} />}
      </div>
    </PhoneFrame>
  )
}

function AppStart({ onExplore, onSignIn }: { onExplore: () => void; onSignIn: () => void }) {
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
        {/* On the dark photo the keyboard focus outline uses the light inverse colour, so it stays visible (§57). */}
        <div className="mt-7 flex flex-col gap-2.5">
          <Button size="lg" onClick={onExplore} style={{ width: '100%', outlineColor: 'var(--color-text-inverse)' }}>Explore as guest</Button>
          <Button size="lg" variant="tertiary" onClick={onSignIn} style={{ width: '100%', background: 'rgba(255,255,255,.14)', color: 'white', borderColor: 'rgba(255,255,255,.35)', outlineColor: 'var(--color-text-inverse)' }}>Sign in</Button>
        </div>
        <p className="mt-4 text-center text-xs text-white/60">No account needed to browse</p>
      </div>
    </div>
  )
}

/**
 * The prototype-only controls above the Buyer phone (specification §2, §61): the switch between the guest and signed-in
 * Buyer states (WO-003), and the controls after it under the same label (the Checkout test control, WO-006).
 */
function PrototypeSignInSwitch({ signedIn, onGuest, onSignedIn, children }: { signedIn: boolean; onGuest: () => void; onSignedIn: () => void; children?: ReactNode }) {
  const option = (active: boolean) => `rounded-md px-3 py-1.5 text-xs font-semibold ${active ? 'bg-brand text-white' : 'text-text-secondary'}`
  return (
    <div className="prototype-switch mb-3 flex max-w-full flex-wrap items-center justify-center gap-2" role="group" aria-label="Prototype navigation, not production UI">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">PROTOTYPE NAVIGATION — NOT PRODUCTION UI</span>
      <span className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Buyer sign-in state">
        <button onClick={onGuest} aria-pressed={!signedIn} className={option(!signedIn)}>Guest</button>
        <button onClick={onSignedIn} aria-pressed={signedIn} className={option(signedIn)}>Signed in</button>
      </span>
      {children}
    </div>
  )
}

/**
 * The prototype-only Checkout test control (WO-006 requirement 23): it loads a session-only Checkout test run or resets
 * it. It is never a Buyer feature. Loading waits for Load, so choosing a run never changes the screen by itself.
 */
function CheckoutTestControl({ active, onLoad, onReset }: { active: CheckoutTest | null; onLoad: (id: CheckoutTestId) => void; onReset: () => void }) {
  const [chosen, setChosen] = useState<CheckoutTestId | ''>('')
  // What a screen reader hears after Load or Reset: the phone's content changes without moving focus.
  const [announced, setAnnounced] = useState('')
  // Compact enough to share one row at phone widths: "B3 · Order 2 payment fails" for Scenario B3's failure run.
  const control = 'rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-text-secondary disabled:opacity-50'
  const load = () => {
    const test = CHECKOUT_TESTS.find(item => item.id === chosen)
    if (!test) return
    onLoad(test.id)
    setAnnounced(`Checkout test run loaded: ${test.label}`)
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1" role="group" aria-label="Checkout test runs">
      <select aria-label="Checkout test run" value={chosen} onChange={e => setChosen(e.target.value as CheckoutTestId)} className={control}>
        <option value="" disabled>Checkout test…</option>
        {CHECKOUT_TESTS.map(test => <option key={test.id} value={test.id}>{test.label.replace(/^Scenario /, '')}</option>)}
      </select>
      <button onClick={load} disabled={!chosen} className={control}>Load</button>
      <button onClick={() => { onReset(); setAnnounced('Checkout test run reset') }} disabled={!active} aria-label="Reset test" className={control}>Reset</button>
      <span className="sr-only" aria-live="polite">{announced}</span>
    </span>
  )
}

/** Inside the phone while a Checkout test run is loaded: everything in it is session-only prototype test state. */
function TestRunBanner({ label }: { label: string }) {
  return <div className="flex-shrink-0 border-b border-border bg-surface-raised px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype test · {label}</div>
}

/** What a guest sees on an account-bound screen: the sign-in requirement, never the signed-in Buyer's data (rules 3.2–3.7). */
function SignInRequired({ title, message, onSignIn }: { title: string; message: string; onSignIn: () => void }) {
  return (
    <>
      <Header title={title} />
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-text-muted"><IconUser size={24} /></span>
        <div className="mt-4 font-display text-xl font-semibold">{message}</div>
        <Button onClick={onSignIn} style={{ marginTop: 20 }}>Sign in / Create account</Button>
      </div>
    </>
  )
}

/** The sign-in requirement for an account-bound action: nothing happens until the guest signs in (rules 3.5, 3.7, 3.9). */
function SignInSheet({ title, onSignIn, onClose }: { title: string; onSignIn: () => void; onClose: () => void }) {
  // Keyboard use (§57): focus starts on the sheet's action and Escape closes it, as in the library overlays. Dismissing
  // the sheet returns focus to the control that asked for sign-in.
  const [trigger] = useState(() => document.activeElement)
  const dismiss = () => {
    onClose()
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div onClick={dismiss} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45" role="presentation">
      <div onClick={e => e.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="sign-in-sheet-title">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-strong" />
        <div className="flex items-center justify-between"><div id="sign-in-sheet-title" className="font-display text-xl font-semibold">{title}</div><IconButton label="Close" onClick={dismiss}>×</IconButton></div>
        <p className="mt-1 text-sm text-text-muted">Use your phone number to sign in or create an account.</p>
        <Button size="lg" autoFocus onClick={onSignIn} style={{ width: '100%', marginTop: 20 }}>Sign in / Create account</Button>
        <Button size="lg" variant="tertiary" onClick={dismiss} style={{ width: '100%', marginTop: 8 }}>Not now</Button>
      </div>
    </div>
  )
}

const PHONE_DIGITS = 9

/** Prototype sign-in, step 1: phone number, then Continue (specification §12). Sign in and Create account share it. */
function SignInPhone({ phone, setPhone, onBack, onContinue }: { phone: string; setPhone: (value: string) => void; onBack: () => void; onContinue: () => void }) {
  const [error, setError] = useState<string>()
  const digits = phone.replace(/\D/g, '')
  return (
    <>
      <Header title="Sign in" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Sign in / Create account</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Enter your phone number. We’ll send a {GUEST_STATE.otpDigits}-digit code to continue.</p>
        <div className="mt-6">
          <PhoneInput
            label="Phone number"
            value={phone}
            onChange={value => { setPhone(value.replace(/[^\d ]/g, '').slice(0, PHONE_DIGITS + 4)); setError(undefined) }}
            error={error}
          />
        </div>
      </div>
      <div className="border-t border-border p-4 pb-6">
        <Button size="lg" onClick={() => (digits.length === PHONE_DIGITS ? onContinue() : setError('Enter a complete phone number.'))} style={{ width: '100%' }}>Continue</Button>
      </div>
    </>
  )
}

/** Prototype sign-in, step 2: the 6-digit account sign-in code. It isn't a handoff OTP (specification §12, §19). */
function SignInCode({ phone, code, setCode, onBack, onVerify }: { phone: string; code: string; setCode: (value: string) => void; onBack: () => void; onVerify: () => void }) {
  const [error, setError] = useState<string>()
  const digits = GUEST_STATE.otpDigits
  return (
    <>
      <Header title="Sign in" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Enter the {digits}-digit code</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">We sent a sign-in code to {phone.trim()}.</p>
        <div className="mt-6">
          <TextInput
            label={`${digits}-digit sign-in code`}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, digits)); setError(undefined) }}
            placeholder={'0'.repeat(digits)}
            inputMode="numeric"
            autoComplete="one-time-code"
            error={error}
          />
        </div>
        <div className="mt-5 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary"><span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype</span>No code is sent. Any {digits} digits sign in to the demo Buyer account.</div>
      </div>
      <div className="border-t border-border p-4 pb-6">
        <Button size="lg" onClick={() => (code.length === digits ? onVerify() : setError(`Enter all ${digits} digits.`))} style={{ width: '100%' }}>Sign in</Button>
      </div>
    </>
  )
}

/**
 * Before Checkout continues (after sign-in, or as a checkout starts): what changed in the Cart, so nothing invalid is
 * ordered silently (rule 3.11; WO-006 requirement 24).
 */
function CartCheck({ unavailable, availabilityOf, afterSignIn, seller, sellerReady, onContinue, onReview, onAllCarts }: {
  unavailable: readonly CartLine[]; availabilityOf: (id: ProductId) => string; afterSignIn: boolean; seller: SellerId; sellerReady: boolean
  onContinue: () => void; onReview: (seller: SellerId) => void; onAllCarts: () => void
}) {
  return (
    <>
      <Header title="Cart check" />
      <div className="flex-1 overflow-y-auto p-5">
        <div role="alert">
          <div className="font-display text-2xl font-semibold">Some items are no longer available</div>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">We checked your cart {afterSignIn ? 'after you signed in' : 'before checkout'}. No Seller Order was created.</p>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {unavailable.map(line => (
            <div key={`${line.product}-${line.options.join('-')}`} className="flex gap-3 rounded-xl border border-danger/20 bg-danger-bg p-3">
              <Placeholder label={PRODUCTS[line.product].name} className="h-16 w-14 rounded-lg" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{PRODUCTS[line.product].name}</span>
                <span className="mt-1 block text-xs text-text-muted">{SELLERS[PRODUCTS[line.product].seller].name} · {[lineOptions(line), `Quantity ${line.quantity}`].filter(Boolean).join(' · ')}</span>
                <span className="mt-1 block text-xs font-semibold text-danger">{availabilityOf(line.product)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-4 pb-6">
        {sellerReady
          ? <><Button size="lg" onClick={onContinue}>Continue to {SELLERS[seller].name} checkout</Button><Button size="lg" variant="tertiary" onClick={onAllCarts}>Review your carts</Button></>
          : <Button size="lg" onClick={() => onReview(seller)}>Review {SELLERS[seller].name} cart</Button>}
      </div>
    </>
  )
}

/** The signed-in Buyer's profile: DEMO_DATA's facts only. Account Settings and deletion aren't defined, so they aren't shown. */
function YouProfile({ at, onSeller }: { at: Moment; onSeller: (id: SellerId) => void }) {
  const buyer = BUYERS[BUYER]
  return (
    <>
      <Header title="You" />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted font-display text-xl font-bold text-brand-dark">{initials(buyer.name)}</span>
          <span><span className="block font-display text-2xl font-semibold">{buyer.name}</span><span className="text-sm text-text-muted">{buyer.phoneMasked ?? '—'}</span></span>
        </div>
        <SectionLabel>Profile</SectionLabel>
        <div className="rounded-xl bg-surface-raised p-4">
          <PriceRow label="Market" value={MARKET.country} />
          <PriceRow label="Saved discovery area" value={buyer.discoveryArea ?? '—'} />
        </div>
        <SectionLabel>Following</SectionLabel>
        <div className="flex flex-col gap-2">{(buyer.follows ?? []).map(id => <SellerRow key={id} sellerId={id} at={at} onClick={() => onSeller(id)} />)}</div>
      </div>
    </>
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

function GuestStrip({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex items-center justify-between bg-brand-muted px-4 py-2 text-xs text-brand-dark">
      <span>Browsing as guest</span>
      <button onClick={onSignIn} className="font-semibold">Sign in to save</button>
    </div>
  )
}

function Home({ at, guest, channel, onChannel, area, areaChosen, onArea, hidden, follows, isSaved, scroll, onScrolled, onSignIn, onSignInFollowing, onNotifications, onSearch, onPost, onProduct, onHotspot, onProducts, onSeller, onFollow, onSave, onShare, onMore, stories, seenStories, onStory }: {
  at: Moment; guest: boolean; channel: Channel; onChannel: (channel: Channel) => void
  area: string | null; areaChosen: boolean; onArea: (area: string) => void
  hidden: readonly ShoppablePostId[]; follows: readonly SellerId[]; isSaved: (key: SaveKey) => boolean
  scroll: Partial<Record<Channel, number>>; onScrolled: (channel: Channel, top: number) => void
  onSignIn: () => void; onSignInFollowing: () => void; onNotifications: () => void; onSearch: () => void
  onPost: (id: ShoppablePostId) => void; onProduct: (id: ProductId) => void
  onHotspot: (post: ShoppablePostId, product: ProductId) => void; onProducts: (post: ShoppablePostId) => void
  onSeller: (id: SellerId) => void; onFollow: () => void; onSave: (post: ShoppablePostId) => void
  onShare: (post: ShoppablePostId) => void; onMore: (post: ShoppablePostId) => void
  stories: readonly SellerStoryGroup[]; seenStories: readonly StoryId[]; onStory: (group: SellerStoryGroup) => void
}) {
  // Each channel shows its own canonical list (DEMO_DATA › Buyer Home channels); no screen computes its own. A guest sees
  // the Guest/default discovery ranking: the same records, in the same order, never described as Maya's personal feed.
  const posts = channel === 'foryou' ? forYouAt(at).filter(id => !hidden.includes(id))
    : channel === 'following' ? (guest ? null : followingAt(BUYER, at))
    : channel === 'nearby' ? (area ? nearbyAt(area, at) : null)
    : null
  const products = channel === 'discounts' ? discountsAt(at) : channel === 'locally-made' ? locallyMadeAt(at) : null
  // Coming back to Home, or to a channel, picks up where the Buyer left it.
  const panel = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = scroll[channel] ?? 0
  }, [channel, scroll])
  // The discovery layout (PR-003): a compact top area (the channels, Search and Notifications, then Seller Stories), the
  // Scene as a structured card that leads the screen without filling it, and a short caption under it.
  return (
    <>
      <h1 className="sr-only">Home</h1>
      <div className="flex-shrink-0 border-b border-border bg-surface">
        <div className="flex items-center gap-1 pr-2">
          <div className="min-w-0 flex-1"><ChannelBar channel={channel} onSelect={onChannel} /></div>
          <IconButton label="Search" onClick={onSearch}><IconSearch size={17} /></IconButton>
          <IconButton label="Notifications" onClick={onNotifications}><BellIcon /></IconButton>
        </div>
        {stories.length > 0 && <StoriesRow groups={stories} seen={seenStories} onOpen={onStory} />}
      </div>
      {guest && <GuestStrip onSignIn={onSignIn} />}
      <div id="home-channel-panel" role="tabpanel" aria-labelledby={`home-channel-${channel}`} className="flex min-h-0 flex-1 flex-col">
        <div ref={panel} onScroll={event => onScrolled(channel, event.currentTarget.scrollTop)} className={`min-h-0 flex-1 overflow-y-auto bg-background ${posts ? 'snap-y snap-mandatory' : ''}`}>
          {channel === 'nearby' && <div className="snap-start"><NearbyAreas area={area} chosen={areaChosen} onArea={onArea} /></div>}
          {posts?.map(id => (
            <ShoppablePostUnit
              key={id}
              postId={id}
              at={at}
              following={follows.includes(SHOPPABLE_POSTS[id].seller)}
              saved={isSaved(`post:${id}`)}
              onOpen={() => onPost(id)}
              onHotspot={product => onHotspot(id, product)}
              onProducts={() => onProducts(id)}
              onSeller={() => onSeller(SHOPPABLE_POSTS[id].seller)}
              onFollow={onFollow}
              onSave={() => onSave(id)}
              onShare={() => onShare(id)}
              onMore={() => onMore(id)}
            />
          ))}
          {channel === 'foryou' && (
            <div className="h-48 snap-start p-5">
              <div className="mb-3 text-xs font-semibold text-text-muted">Finding more Scenes for you</div>
              <Skeleton height={112} radius="var(--radius-xl)" />
            </div>
          )}
          {channel === 'following' && guest && <ChannelMessage message="Sign in to see posts from Sellers you follow." action="Sign in / Create account" onAction={onSignInFollowing} />}
          {products && (
            <div className="p-4">
              <p className="mb-3 text-xs text-text-muted">{channel === 'discounts' ? 'Active discounts, the largest first.' : 'Products their Sellers mark as locally made.'}</p>
              <div role="list" className="flex flex-col gap-3">
                {products.map(id => <div key={id} role="listitem"><ProductPostCard productId={id} at={at} ends={channel === 'discounts'} onOpen={() => onProduct(id)} /></div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/** Home's channel tabs: For You first and selected by default (rule 2.3). Arrow keys move between them (WAI-ARIA tabs). */
function ChannelBar({ channel, onSelect }: { channel: Channel; onSelect: (channel: Channel) => void }) {
  const list = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = CHANNELS.findIndex(c => c.key === channel)
  // While channels continue past the bar's right edge, a narrow shadow there says so (decorative: hidden from assistive
  // technology, and taps pass through it). It goes once the bar is scrolled to its end.
  const [more, setMore] = useState(false)
  const measure = () => {
    const bar = list.current
    if (bar) setMore(bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1)
  }
  useEffect(() => {
    const bar = list.current
    if (!bar) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])
  // Bring a tab fully into view, clear of the shadow, so the shadow never lies over a selected or focused tab. The first
  // and last tabs take the row to its ends, padding included; at the end the shadow goes.
  const reveal = (index: number) => {
    const bar = list.current, tab = tabs.current[index]
    if (!bar || !tab) return
    const left = index === 0 ? 0 : tab.offsetLeft
    const right = index === CHANNELS.length - 1 ? bar.scrollWidth : tab.offsetLeft + tab.offsetWidth + CHANNEL_CUE_WIDTH
    if (left < bar.scrollLeft) bar.scrollLeft = left
    else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = right - bar.clientWidth
  }
  useEffect(() => reveal(selected), [selected])
  const move = (index: number) => {
    const next = (index + CHANNELS.length) % CHANNELS.length
    onSelect(CHANNELS[next].key)
    tabs.current[next]?.focus()
  }
  return (
    <div className="relative flex-shrink-0">
      <div ref={list} role="tablist" aria-label="Home channels" onScroll={measure} className="flex overflow-x-auto bg-surface px-2">
        {CHANNELS.map((c, i) => (
          <button
            key={c.key}
            ref={el => { tabs.current[i] = el }}
            id={`home-channel-${c.key}`}
            role="tab"
            aria-selected={i === selected}
            aria-controls="home-channel-panel"
            tabIndex={i === selected ? 0 : -1}
            style={INSET_FOCUS}
            onClick={() => onSelect(c.key)}
            onFocus={() => reveal(i)}
            onKeyDown={event => {
              const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: CHANNELS.length - 1 }[event.key]
              if (to === undefined) return
              event.preventDefault()
              move(to)
            }}
            className={`flex-shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${i === selected ? 'border-brand font-semibold text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {more && <div aria-hidden="true" style={{ width: CHANNEL_CUE_WIDTH }} className="pointer-events-none absolute bottom-px right-0 top-0 bg-gradient-to-l from-text-primary/25 to-transparent" />}
    </div>
  )
}

/** Nearby's discovery area: chosen by hand from the demo proximity areas. No live or simulated location (rules 2.10, 2.14). */
function NearbyAreas({ area, chosen, onArea }: { area: string | null; chosen: boolean; onArea: (area: string) => void }) {
  return (
    <div className="flex-shrink-0 border-b border-border bg-surface px-4 py-3">
      <div id="nearby-area-label" className="text-xs font-semibold text-text-secondary">Discovery area</div>
      <div role="group" aria-labelledby="nearby-area-label" className="mt-2 flex flex-wrap gap-2">
        {discoveryAreas().map(name => (
          <button key={name} aria-pressed={name === area} onClick={() => onArea(name)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${name === area ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>
            {name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {area === null ? 'Choose an area to see Shoppable Posts from Sellers near it.' : chosen ? `Sellers near ${area}.` : `Sellers near ${area}, your saved discovery area.`} Your device location isn't used.
      </p>
    </div>
  )
}

function ChannelMessage({ message, action, onAction }: { message: string; action: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-text-muted"><IconUser size={24} /></span>
      <div className="mt-4 font-display text-xl font-semibold">{message}</div>
      <Button onClick={onAction} style={{ marginTop: 20 }}>{action}</Button>
    </div>
  )
}

/** Home's Seller Stories row (PR-003): one avatar per Seller with live Stories, ringed until its Stories are seen. */
function StoriesRow({ groups, seen, onOpen }: { groups: readonly SellerStoryGroup[]; seen: readonly StoryId[]; onOpen: (group: SellerStoryGroup) => void }) {
  return (
    <div role="list" aria-label="Seller Stories" className="flex gap-1 overflow-x-auto px-3 pb-1.5">
      {groups.map(group => {
        const seller = SELLERS[group.seller]
        const unseen = group.stories.some(story => !seen.includes(story.id))
        return (
          <div key={group.seller} role="listitem" className="flex-shrink-0">
            <button onClick={() => onOpen(group)} aria-label={`${seller.name} story${unseen ? ', new' : ''}`} className="flex w-16 flex-col items-center gap-0.5">
              <span className={`rounded-full p-[2px] ${unseen ? 'bg-gradient-to-tr from-brand to-[#E8874A]' : 'bg-border-strong'}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface bg-brand-muted text-[11px] font-bold text-brand-dark">{initials(seller.name)}</span>
              </span>
              <span className="w-full truncate text-center text-[10px] text-text-secondary">{seller.name}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

/**
 * A Seller's Stories (PR-003): lightweight and view-only. The Seller, the Story's media, its text, the Product's active
 * discount where it is a discount Story, and its linked Product or Scene. No replies, reactions or comments.
 */
function StoryViewer({ group, at, onClose, onProduct, onPost }: {
  group: SellerStoryGroup; at: Moment; onClose: () => void; onProduct: (id: ProductId) => void; onPost: (id: ShoppablePostId) => void
}) {
  const [index, setIndex] = useState(0)
  const story = group.stories[Math.min(index, group.stories.length - 1)]
  const seller = SELLERS[group.seller]
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus() }, [])
  const kind = { discount: 'Discount', update: 'Update', promotion: 'Promotion' }[story.kind]
  return (
    <div role="dialog" aria-modal="true" aria-label={`${seller.name} story`} onKeyDown={event => { if (event.key === 'Escape') onClose() }} className="absolute inset-0 z-40 flex flex-col bg-text-primary text-white">
      {group.stories.length > 1 && (
        <div aria-hidden="true" className="flex gap-1 px-4 pt-3">{group.stories.map((s, i) => <span key={s.id} className={`h-0.5 flex-1 rounded-full ${i <= index ? 'bg-white' : 'bg-white/30'}`} />)}</div>
      )}
      <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{seller.name}</div>
          <div className="text-xs text-white/70">{trustLabel(trustAt(group.seller, at))} seller · {formatAge(story.posted, at.at)}</div>
        </div>
        <button ref={close} onClick={onClose} aria-label="Close story" style={ON_PHOTO} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-lg">×</button>
      </div>
      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(160deg, #6B5444 0%, #2E2520 100%)' }}>
        <Placeholder label={`${seller.name} story media`} initialsOf={seller.name} dark className="h-full w-full text-5xl" />
        <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">{kind}</span>
      </div>
      <div className="flex-shrink-0 px-4 pb-5 pt-4">
        <p className="text-base leading-snug">{story.text}</p>
        {story.product && (
          <div className="mt-3 rounded-xl bg-surface p-3 text-text-primary">
            <div className="text-sm font-semibold">{PRODUCTS[story.product].name}</div>
            <PriceTag productId={story.product} ends={story.kind === 'discount'} className="mt-1" />
          </div>
        )}
        <div className="mt-3 flex gap-2">
          {story.product && <Button style={{ flex: 1 }} onClick={() => onProduct(story.product!)}>View Product</Button>}
          {!story.product && story.post && <Button style={{ flex: 1 }} onClick={() => onPost(story.post!)}>View Scene</Button>}
          {index < group.stories.length - 1 && <Button variant="secondary" onClick={() => setIndex(i => i + 1)}>Next</Button>}
        </div>
      </div>
    </div>
  )
}

/**
 * A Scene as a For You unit (specification §7; PR-003): a structured card that leads the screen without filling it.
 * The Seller and actual public Trust level (rule 14.6) with Follow and More above the photo; on the photo, only its
 * product hotspots; under it, Save, Share and the Scene's products, then a short caption. Prices, stock and variants
 * stay with the Products. PR-004 adds its engagement controls to the action row.
 */
function ShoppablePostUnit({ postId, at, following, saved, onOpen, onHotspot, onProducts, onSeller, onFollow, onSave, onShare, onMore }: {
  postId: ShoppablePostId; at: Moment; following: boolean; saved: boolean
  onOpen: () => void; onHotspot: (product: ProductId) => void; onProducts: () => void; onSeller: () => void
  onFollow: () => void; onSave: () => void; onShare: () => void; onMore: () => void
}) {
  const post = SHOPPABLE_POSTS[postId]
  const seller = SELLERS[post.seller]
  // The canonical hotspot count, each marker tied to the tagged Product in the same position; never more markers than tags.
  const markers = post.tags.slice(0, post.hotspots)
  const count = post.tags.length
  // A little shorter than the feed, so the next Scene's card shows below it: a feed of Scenes, not one full-screen video.
  return (
    <article aria-label={`${post.title}, by ${seller.name}`} className="h-[calc(100%-20px)] min-h-[360px] snap-start px-3 pt-2.5">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {/* Buttons take their text size from their row (index.css sets `font: inherit` on buttons). */}
        <div className="flex flex-shrink-0 items-center gap-2 px-3 py-1 text-xs">
          <button onClick={onSeller} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</span>
            <span className="truncate text-sm font-semibold text-text-primary">{seller.name}</span>
            <span className="flex-shrink-0 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold text-success">{trustLabel(trustAt(post.seller, at))}</span>
          </button>
          <button onClick={onFollow} className="flex-shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-semibold text-text-primary">{following ? 'Following' : 'Follow'}</button>
          <button onClick={onMore} aria-label="More options" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-text-secondary">•••</button>
        </div>
        <div className="relative min-h-0 flex-1" style={{ background: 'linear-gradient(160deg, #6B5444 0%, #2E2520 100%)' }}>
          <div aria-hidden="true" className="absolute inset-0">
            <Placeholder label={`${seller.name} Scene: ${post.title}`} initialsOf={post.title} dark className="h-full w-full text-6xl" />
          </div>
          {/* The photo opens the Scene. Its focus outline is drawn inside the edge, because the card clips anything outside. */}
          <button onClick={onOpen} aria-label={`${seller.name} Scene: ${post.title}`} style={{ ...ON_PHOTO, ...INSET_FOCUS }} className="absolute inset-0 h-full w-full" />
          {markers.map((product, i) => (
            <button key={product} onClick={() => onHotspot(product)} aria-label={`${PRODUCTS[product].name}. Open product.`} style={{ ...HOTSPOT_SPOTS[i], ...ON_PHOTO }} className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand text-sm font-bold text-white shadow-lg">
              +
            </button>
          ))}
        </div>
        {/* The action row; PR-004 adds the Scene's engagement controls here. */}
        <div className="flex flex-shrink-0 items-center gap-2 px-3 pt-1.5 text-xs font-semibold">
          <button onClick={onSave} className="rounded-full bg-surface-raised px-3 py-1.5 text-text-primary">{saved ? 'Saved' : 'Save'}</button>
          <button onClick={onShare} className="rounded-full bg-surface-raised px-3 py-1.5 text-text-primary">Share</button>
          <span className="flex-1" />
          {count > 0 && (
            <button onClick={onProducts} className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brand-muted px-3 py-1.5 text-brand-dark">
              <TagIcon /> In this Scene · {count} product{count === 1 ? '' : 's'}
            </button>
          )}
        </div>
        {/* One line of caption: the whole caption is on the Scene itself. Margins, not padding, around it: a clamped line
            would show through padding. */}
        <p className="mx-3 mb-2.5 mt-1 line-clamp-1 flex-shrink-0 text-[13px] leading-snug text-text-secondary">{post.caption}</p>
      </div>
    </article>
  )
}

/** A Product Post as a Discounts or Locally Made unit (rules 2.11–2.13), with its Seller's actual public Trust level. */
function ProductPostCard({ productId, at, ends, onOpen }: { productId: ProductId; at: Moment; ends?: boolean; onOpen: () => void }) {
  const product = PRODUCTS[productId]
  const available = isPurchasableAt(productId, at)
  const body = (
    <>
      <Placeholder label={product.name} className="h-24 w-20 flex-shrink-0 rounded-xl text-lg" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-text-muted">{SELLERS[product.seller].name} · {trustLabel(trustAt(product.seller, at))}</span>
        <span className="mt-1 text-sm font-semibold leading-snug text-text-primary">{product.name}</span>
        {available ? <PriceTag productId={productId} ends={ends} className="mt-2" /> : <span className="mt-2 text-sm font-semibold text-text-muted">Currently unavailable</span>}
      </span>
    </>
  )
  // An unavailable Product stays visible and clearly marked, with no price (rules 1.8, 2.13). It still opens its Product
  // Post, which offers nothing for purchase: not purchasable doesn't mean not viewable. The scroll margin leaves room for
  // the keyboard focus outline when focus scrolls a card into view at the edge of the list.
  return (
    <button onClick={onOpen} className={`flex w-full scroll-my-2 items-center gap-3 rounded-2xl border border-border p-3 text-left ${available ? 'bg-surface shadow-sm' : 'bg-surface-raised'}`}>
      {body}<IconChevronRight size={16} />
    </button>
  )
}

/**
 * The Product's current price. With an active discount (DEMO_DATA › Discounts) it shows the discounted price, the
 * regular price struck through and the saving, and the end date where set. Cart and Checkout charge the same current
 * price (WO-006 requirement 10).
 */
function PriceTag({ productId, size = 'sm', ends, className = '' }: { productId: ProductId; size?: 'sm' | 'lg'; ends?: boolean; className?: string }) {
  const product = PRODUCTS[productId]
  const discount = activeDiscount(productId)
  const main = size === 'lg' ? 'text-xl' : 'text-sm'
  if (!discount) return <span className={`block ${main} font-bold text-brand ${className}`}>{formatEtb(product.price)}</span>
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${className}`}>
      <span className={`${main} font-bold text-brand`}>{formatEtb(currentPrice(productId))}</span>
      <span className="text-xs text-text-muted line-through"><span className="sr-only">Regular price </span>{formatEtb(product.price)}</span>
      <span className="rounded-full bg-brand-muted px-1.5 py-0.5 text-[10px] font-bold text-brand-dark">−{discount.percent}%</span>
      {ends && discount.ends && <span className="text-xs text-text-muted">Ends {formatDayMonth(discount.ends)}</span>}
    </span>
  )
}

/** The Product's current price within a line of text: with an active discount, the regular price follows struck through. */
function InlinePrice({ productId }: { productId: ProductId }) {
  if (!activeDiscount(productId)) return <>{formatEtb(PRODUCTS[productId].price)}</>
  return <>{formatEtb(currentPrice(productId))} <span className="font-normal text-text-muted line-through"><span className="sr-only">Regular price </span>{formatEtb(PRODUCTS[productId].price)}</span></>
}

// Where the expanded view's markers sit, as before: the first is a price label. Illustrative, like HOTSPOT_SPOTS.
const EXPANDED_SPOTS = [{ left: '55%', top: '39%' }, { right: '12%', top: '59%' }, { left: '16%', top: '64%' }]

function ExpandedPost({ postId, at, onBack, onHotspot, onProducts, onSeller, onReport }: { postId: ShoppablePostId; at: Moment; onBack: () => void; onHotspot: (product: ProductId) => void; onProducts: () => void; onSeller: () => void; onReport: () => void }) {
  const post = SHOPPABLE_POSTS[postId]
  const seller = SELLERS[post.seller]
  // The canonical hotspot count, each tied to the tagged Product in the same position.
  const markers = post.tags.slice(0, post.hotspots)
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-text-primary">
      <Placeholder label={`${seller.name} shoppable post: ${post.title}`} initialsOf={post.title} dark className="absolute inset-0 h-full w-full text-6xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
      <div className="relative flex items-center gap-3 p-4 text-white">
        <IconButton label="Back" onClick={onBack} dark>‹</IconButton>
        <button onClick={onSeller} style={ON_PHOTO} className="flex flex-1 items-center gap-2 text-left">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</span>
          <span className="text-sm font-semibold">{seller.name}</span>
        </button>
        <button onClick={onReport} style={ON_PHOTO} className="rounded-full bg-black/35 px-3 py-2 text-xs font-semibold text-white">Report</button>
      </div>
      {markers.map((product, i) => (i === 0
        ? (
          <button key={product} onClick={() => onHotspot(product)} aria-label={`${PRODUCTS[product].name}. Open product.`} style={{ ...EXPANDED_SPOTS[0], ...ON_PHOTO }} className="absolute flex items-center gap-2 rounded-full bg-white p-1.5 pr-3 text-xs font-semibold text-text-primary shadow-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">+</span>
            {isPurchasableAt(product, at) ? formatEtb(currentPrice(product)) : availabilityText(product)}
          </button>
        )
        : <button key={product} onClick={() => onHotspot(product)} aria-label={`${PRODUCTS[product].name}. Open product.`} style={{ ...EXPANDED_SPOTS[i], ...ON_PHOTO }} className="absolute h-8 w-8 rounded-full border-2 border-white bg-brand text-white shadow-lg">+</button>
      ))}
      <div className="relative mt-auto p-4 text-white">
        <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">Scene explorer</span>
        <div className="mt-3 font-display text-2xl font-semibold">{post.title}</div>
        {post.tags.length > 0 && <>
          <p className="mt-1 text-sm text-white/80">Tap a product hotspot to explore the pieces in this scene.</p>
          <button onClick={onProducts} style={ON_PHOTO} className="mt-4 flex w-full items-center justify-between rounded-xl bg-white p-3 text-sm font-semibold text-text-primary">
            <span className="flex items-center gap-2"><TagIcon /> In this post</span>
            <span>{post.tags.length} product{post.tags.length === 1 ? '' : 's'}</span>
          </button>
        </>}
      </div>
    </div>
  )
}

/** A bottom sheet inside the phone. Escape closes it, as in the sign-in request, and closing returns focus to its opener. */
function BottomSheet({ title, label, onClose, children }: { title: string; label?: string; onClose: () => void; children: (dismiss: () => void) => ReactNode }) {
  const titleId = useId()
  const [trigger] = useState(() => document.activeElement)
  const dismiss = () => {
    onClose()
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div onClick={dismiss} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45" role="presentation">
      <div onClick={e => e.stopPropagation()} className="max-h-[85%] overflow-y-auto rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl" role="dialog" aria-modal="true" aria-label={label} aria-labelledby={label ? undefined : titleId}>
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div id={titleId} className="font-display text-lg font-semibold">{title}</div>
          <IconButton label="Close" onClick={dismiss}>×</IconButton>
        </div>
        {children(dismiss)}
      </div>
    </div>
  )
}

/**
 * "In this post": every tagged Product, the list that hotspots are never the only way to (§57). It keeps the post's tag
 * order; opened from a hotspot (specification §7: a Product list bottom sheet), that hotspot's Product comes first.
 */
function ProductSheet({ postId, featured, at, onClose, onDetail }: { postId: ShoppablePostId; featured?: ProductId; at: Moment; onClose: () => void; onDetail: (id: ProductId) => void }) {
  const tags = SHOPPABLE_POSTS[postId].tags
  const [first, ...others] = featured ? [featured, ...tags.filter(id => id !== featured)] : tags
  // An out-of-stock Product is marked, with no price, and still opens its Product Post (rule 1.8): not purchasable
  // doesn't mean not viewable. Only a Product Buyers can't see doesn't open.
  const viewable = (id: ProductId) => isBuyerVisibleAt(id, at)
  const purchasable = (id: ProductId) => isPurchasableAt(id, at)
  return (
    <BottomSheet title="In this post" label="Products in this post" onClose={onClose}>
      {() => (
        <div role="list" aria-label="Shoppable products in this post">
          {first && <div role="listitem">
            <button onClick={() => onDetail(first)} disabled={!viewable(first)} autoFocus={viewable(first)} className="flex w-full gap-3 text-left">
              <Placeholder label={PRODUCTS[first].name} className="h-24 w-20 rounded-xl text-lg" />
              <span className="flex flex-1 flex-col">
                <span className="text-xs text-text-muted">{SELLERS[PRODUCTS[first].seller].name}</span>
                <span className="mt-1 text-sm font-semibold leading-snug text-text-primary">{PRODUCTS[first].name}</span>
                {purchasable(first) && <PriceTag productId={first} className="mt-2" />}
                <span className={`mt-1 text-xs ${purchasable(first) ? 'text-success' : 'font-semibold text-text-muted'}`}>{availabilityText(first)}</span>
              </span>
              {viewable(first) && <IconChevronRight size={16} />}
            </button>
          </div>}
          {others.map(id => (
            <div key={id}>
              <div className="my-4 h-px bg-border" />
              <div role="listitem">
                <button onClick={() => onDetail(id)} disabled={!viewable(id)} className={`flex w-full items-center gap-3 text-left ${purchasable(id) ? '' : 'opacity-70'}`}>
                  <Placeholder label={PRODUCTS[id].name} className="h-16 w-16 rounded-xl" />
                  <span className="flex-1"><span className="block text-sm font-semibold">{PRODUCTS[id].name}</span><span className="text-xs text-text-muted">{purchasable(id) && <><InlinePrice productId={id} /> · </>}{availabilityText(id)}</span></span>
                  {viewable(id) && <IconChevronRight size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}

/** More (specification §7): Not Interested where it applies, and Report. No other actions. */
function MoreSheet({ postId, notInterested, onClose, onNotInterested, onReport }: { postId: ShoppablePostId; notInterested: boolean; onClose: () => void; onNotInterested: () => void; onReport: () => void }) {
  return (
    <BottomSheet title="More options" onClose={onClose}>
      {() => (
        <>
          <p className="-mt-1 mb-3 text-xs text-text-muted">{SHOPPABLE_POSTS[postId].title}</p>
          <div className="flex flex-col gap-2">
            {notInterested && <Button size="lg" variant="tertiary" autoFocus onClick={onNotInterested} style={{ width: '100%' }}>Not interested in this content</Button>}
            <Button size="lg" variant="tertiary" autoFocus={!notInterested} onClick={onReport} style={{ width: '100%' }}>Report</Button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}

/**
 * Share names the Shoppable Post or Product Post, its Seller and the Seller's handle, never a URL: no Adulis web address
 * is approved (DEMO_DATA › Sellers). It's public, so no sign-in.
 */
function ShareSheet({ title, sellerId, onClose }: { title: string; sellerId: SellerId; onClose: () => void }) {
  const seller = SELLERS[sellerId]
  return (
    <BottomSheet title="Share" onClose={onClose}>
      {dismiss => (
        <>
          <div className="rounded-xl bg-surface-raised p-4">
            <div className="font-semibold">{title}</div>
            <div className="mt-1 text-sm text-text-secondary">{seller.name} · {seller.handle} on Adulis</div>
          </div>
          <div className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">
            <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype</span>
            No share link: Adulis has no approved web address yet, so sharing names the Seller's handle.
          </div>
          <Button size="lg" autoFocus onClick={dismiss} style={{ width: '100%', marginTop: 16 }}>Done</Button>
        </>
      )}
    </BottomSheet>
  )
}

/** A brief confirmation. The live region stays mounted so each new message is announced. */
function Toast({ message }: { message: string | null }) {
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute bottom-20 left-4 right-4 z-[60] flex justify-center">
      {message && <div className="rounded-xl bg-text-primary px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{message}</div>}
    </div>
  )
}

function ProductDetail({ productId, at, withdrawn, onBack, onSeller, saved, onSave, onShare, onAddToCart, onChat }: {
  productId: ProductId; at: Moment
  /** The Checkout test run's availability race made it unavailable (WO-006 requirement 24): in that run only. */
  withdrawn?: boolean
  onBack: () => void; onSeller: () => void; saved: boolean; onSave: () => void; onShare: () => void; onAddToCart: (options: readonly string[], quantity: number) => void; onChat: () => void
}) {
  const product = PRODUCTS[productId]
  // A Product that is out of stock stays viewable, but nothing offers it for purchase (rule 1.8; DEMO_DATA › Shoppable Posts).
  const purchasable = !withdrawn && isPurchasableAt(productId, at)
  const availability = withdrawn ? 'Out of Stock' : product.availability
  const seller = SELLERS[product.seller]
  const service = sellerServiceAt(product.seller, at)
  const quality = productQualityAt(productId, at)
  const latestReview = reviewsAt({ product: productId }, at)[0]
  // One choice per variant group; a Size group starts on M, as before, and other groups on their first option.
  const [choices, setChoices] = useState<string[]>(product.variants.map(group => (group.name === 'Size' && group.options.includes('M') ? 'M' : group.options[0])))
  const [quantity, setQuantity] = useState(1)
  return (
    <>
      <Header title="Product" onBack={onBack} trailing={<IconButton label="Share" onClick={onShare}>↗</IconButton>} />
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="relative">
          <Placeholder label={product.name} className="h-80 w-full text-5xl" />
        </div>
        <div className="p-5">
          <div className="mt-1 font-display text-2xl font-semibold leading-tight">{product.name}</div>
          <PriceTag productId={productId} size="lg" ends className="mt-2" />
          <div className="mt-2 flex items-center gap-2 text-xs"><span className={availability === 'Available' ? 'text-success' : availability === 'Low Stock' ? 'text-warning' : 'text-text-muted'}>● {withdrawn ? 'Currently unavailable' : availabilityText(productId)}</span></div>

          {product.variants.map((group, index) => (
            <div key={index}>
              <SectionLabel>Choose {(group.name ?? 'option').toLowerCase()}</SectionLabel>
              <div className="flex gap-2">{group.options.map(v => <Choice key={v} active={choices[index] === v} onClick={() => setChoices(values => values.map((value, i) => (i === index ? v : value)))}>{v}</Choice>)}</div>
            </div>
          ))}
          <SectionLabel>Quantity</SectionLabel>
          <div className="inline-flex items-center rounded-lg border border-border">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-10 text-lg">−</button>
            <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="h-9 w-10 text-lg">+</button>
          </div>

          <button onClick={onSeller} className="mt-6 flex w-full items-center gap-3 rounded-xl bg-surface-raised p-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">{initials(seller.name)}</span>
            <span className="flex-1"><span className="block text-sm font-semibold">{seller.name}</span><span className="text-xs text-text-muted">{trustLabel(trustAt(product.seller, at))} seller · {service ? service.average : '—'} rating</span></span>
            <IconChevronRight size={16} />
          </button>

          <InfoBlock title="Trust">Purchase protection · Seller identity and business details reviewed by Adulis.</InfoBlock>
          <InfoBlock title="Description">{product.description ?? '—'}</InfoBlock>
          <InfoBlock title="Specifications">{product.attributes.join(' · ') || '—'}</InfoBlock>
          <InfoBlock title="Fulfilment">{describeFulfilment(fulfilmentOptionsAt(product.seller, at))}</InfoBlock>
          <InfoBlock title={`Reviews · ${quality ? `${quality.average} (${quality.ratings})` : quality === null ? 'No ratings yet' : '—'}`}>{latestReview ? <>“{REVIEWS[latestReview].text}” — {shortName(BUYERS[ORDERS[REVIEWS[latestReview].order].buyer].name)}</> : '—'}</InfoBlock>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex gap-2 border-t border-border bg-surface p-3 pb-5">
        <Button variant="tertiary" size="lg" onClick={onSave}>{saved ? 'Saved' : 'Save'}</Button>
        <Button variant="tertiary" size="lg" onClick={onChat}>Chat</Button>
        <Button size="lg" style={{ flex: 1 }} disabled={!purchasable} onClick={() => onAddToCart(choices, quantity)}>Add to Cart</Button>
      </div>
    </>
  )
}

// The Seller profile's tabs, Scenes first and by default (PR-002): the same tabs, in the same order, as the public Storefront.
type SellerTab = 'scenes' | 'products' | 'reviews' | 'about'
const SELLER_TABS: { key: SellerTab; label: string }[] = [
  { key: 'scenes', label: 'Scenes' }, { key: 'products', label: 'Products' }, { key: 'reviews', label: 'Reviews' }, { key: 'about', label: 'About' },
]

/** The Seller profile (PR-002): the same Seller identity as its public Storefront, from the same records: its public
 * Scenes, its Products, its Seller Reviews and its About facts. */
function SellerProfile({ sellerId, at, signedIn, tab, onTab, onFollow, onMessage, onBack, onSearch, onPost, onProduct }: {
  sellerId: SellerId; at: Moment; signedIn: boolean; tab: SellerTab; onTab: (tab: SellerTab) => void
  onFollow: () => void; onMessage: () => void; onBack: () => void; onSearch: () => void
  onPost: (id: ShoppablePostId) => void; onProduct: (id: ProductId) => void
}) {
  const seller = SELLERS[sellerId]
  const service = sellerServiceAt(sellerId, at)
  // Follows are Maya's relationships: a guest has none (DEMO_DATA › Buyer).
  const following = signedIn && (BUYERS[BUYER].follows ?? []).includes(sellerId)
  // The Seller's Scenes that are public now: published and not restricted, as on the Storefront.
  const scenes = sellerPostsAt(sellerId, at).filter(id => isPubliclyEligibleAt(id, at))
  const products = sellerProductsAt(sellerId, at)
  return (
    <>
      <Header title="Seller" onBack={onBack} onSearch={onSearch} trailing={<IconButton label="Share">↗</IconButton>} />
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-muted font-display text-xl font-bold text-brand-dark">{initials(seller.name)}</div>
            <div className="min-w-0">
              <div className="font-display text-2xl font-semibold leading-tight">{seller.name}</div>
              <div className="text-sm text-text-muted">{seller.handle} · {seller.category}</div>
              <div className="mt-1.5 inline-flex rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">{trustLabel(trustAt(sellerId, at))} seller</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">{seller.bio ?? '—'}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant={following ? 'secondary' : undefined} style={{ flex: 1 }} onClick={onFollow}>{following ? 'Following' : 'Follow'}</Button>
            <Button size="sm" variant="secondary" style={{ flex: 1 }} onClick={onMessage}>Message</Button>
          </div>
          <div className="my-4 grid grid-cols-4 divide-x divide-border rounded-xl bg-surface-raised p-3 text-center">
            <Stat value={String(scenes.length)} label="Scenes" />
            <Stat value={String(products.length)} label="Products" />
            <Stat value={service ? `${service.average} ★` : '—'} label="Seller Service" />
            <Stat value={seller.followers === undefined ? '—' : formatCompactCount(seller.followers)} label="Followers" />
          </div>
        </div>
        <div role="tablist" aria-label={`${seller.name} profile`} className="sticky top-0 z-10 flex border-b border-border bg-surface">
          {SELLER_TABS.map(t => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => onTab(t.key)} className={`flex-1 py-3 text-xs font-semibold ${tab === t.key ? 'border-b-2 border-brand text-brand' : 'text-text-muted'}`}>{t.label}</button>
          ))}
        </div>
        <div role="tabpanel" aria-label={SELLER_TABS.find(t => t.key === tab)?.label} className="p-4">
          {tab === 'scenes' && <SellerScenes scenes={scenes} onPost={onPost} />}
          {tab === 'products' && <SellerProducts products={products} onProduct={onProduct} />}
          {tab === 'reviews' && <SellerReviews sellerId={sellerId} at={at} />}
          {tab === 'about' && <SellerAbout sellerId={sellerId} at={at} />}
        </div>
      </div>
    </>
  )
}

// Scenes lead the profile: the first one featured, the rest in a grid. Only the Seller's own public Scenes, never repeated.
function SellerScenes({ scenes, onPost }: { scenes: readonly ShoppablePostId[]; onPost: (id: ShoppablePostId) => void }) {
  if (scenes.length === 0) return <p className="py-10 text-center text-sm text-text-muted">No Scenes published yet.</p>
  const [featured, ...rest] = scenes
  return (
    <div className="flex flex-col gap-2">
      <SceneTile postId={featured} featured onClick={() => onPost(featured)} />
      {rest.length > 0 && <div className="grid grid-cols-2 gap-2">{rest.map(id => <SceneTile key={id} postId={id} onClick={() => onPost(id)} />)}</div>}
    </div>
  )
}

function SceneTile({ postId, featured, onClick }: { postId: ShoppablePostId; featured?: boolean; onClick: () => void }) {
  const post = SHOPPABLE_POSTS[postId]
  const tagged = post.tags.length
  return (
    <button onClick={onClick} aria-label={`Scene: ${post.title}`} className="relative block w-full overflow-hidden rounded-xl text-left">
      <Placeholder label={`Scene: ${post.title}`} initialsOf={post.title} className={`${featured ? 'h-72 text-4xl' : 'h-56 text-2xl'} w-full`} />
      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">{tagged === 0 ? 'Scene' : `${tagged} product${tagged === 1 ? '' : 's'} tagged`}</span>
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8">
        <span className="block text-sm font-semibold text-white">{post.title}</span>
        {featured && <span className="mt-1 line-clamp-2 block text-xs text-white/85">{post.caption}</span>}
      </span>
    </button>
  )
}

function SellerProducts({ products, onProduct }: { products: readonly ProductId[]; onProduct: (id: ProductId) => void }) {
  // Available first, as on the Storefront; DEMO_DATA gives Products no category, so there's no category filter.
  const sorted = [...products.filter(id => PRODUCTS[id].availability !== 'Out of Stock'), ...products.filter(id => PRODUCTS[id].availability === 'Out of Stock')]
  return (
    <>
      <div className="mb-3 flex items-end justify-between"><span className="text-xs text-text-muted">{products.length} product{products.length === 1 ? '' : 's'}</span><span className="text-xs font-semibold text-text-muted">Available first</span></div>
      <div className="grid grid-cols-2 gap-3">
        {sorted.map(id => PRODUCTS[id].availability === 'Out of Stock'
          ? <div key={id} className="opacity-60"><ProductCard name={PRODUCTS[id].name} price={availabilityText(id)} onClick={() => onProduct(id)} /></div>
          : <ProductCard key={id} name={PRODUCTS[id].name} price={<InlinePrice productId={id} />} onClick={() => onProduct(id)} />)}
      </div>
    </>
  )
}

// The Seller profile's Reviews are Seller Reviews: the Seller Service aggregate and the reviews of this Seller's Orders.
// Product Quality belongs to each Product (PR-002).
function SellerReviews({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const service = sellerServiceAt(sellerId, at)
  return (
    <>
      <div className="font-display text-lg font-semibold">Seller Reviews</div>
      <div className="mt-3 rounded-xl bg-surface-raised p-4 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Seller Service</div>
        <div className="mt-1 font-display text-3xl font-semibold">{service ? service.average : '—'}</div>
        {service && <Stars rating={Math.round(service.average)} label={`Seller Service ${service.average} out of 5`} />}
        <div className="mt-1 text-xs text-text-muted">{service ? service.ratings : '—'} verified buyer ratings</div>
      </div>
      {reviewsAt({ seller: sellerId }, at).map(id => {
        const review = REVIEWS[id]
        const written = typeof review.written === 'string' ? review.written : review.written.at
        return (
          <div key={id} className="border-b border-border py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{shortName(BUYERS[ORDERS[review.order].buyer].name)}</div>
                <div className="text-xs text-text-muted">Bought {review.productQuality.map(q => PRODUCTS[q.product].name).join(' · ')}</div>
              </div>
              <span className="flex-shrink-0 text-xs text-text-muted">{formatMonthShortYear(written)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Seller Service</span><Stars rating={review.sellerService} label={`Seller Service ${review.sellerService} out of 5`} /></div>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{review.text}</p>
          </div>
        )
      })}
      <p className="mt-4 text-xs text-text-muted">Product Quality ratings are shown on each Product.</p>
    </>
  )
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return <span role="img" aria-label={label} className="text-sm tracking-wide"><span className="text-[#E8874A]">{'★'.repeat(rating)}</span><span className="text-border-strong">{'★'.repeat(5 - rating)}</span></span>
}

// The Seller's public facts, as on the Storefront's About. A physical place shows only where the Seller gives Buyers one
// (Buyer Collection); a physical storefront isn't required, and no home address is ever shown.
function SellerAbout({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const seller = SELLERS[sellerId]
  const service = sellerServiceAt(sellerId, at)
  const completed = sellerCompletedOrdersAt(sellerId, at)
  const rows: [string, string][] = [
    ['Category', seller.category],
    ['Based in', `${seller.area}, ${MARKET.city}`],
    ...(seller.buyerCollection ? [['Collection point', `${seller.buyerCollection.place} · ${seller.buyerCollection.hours}`] as [string, string]] : []),
    ['Fulfilment', describeFulfilment(fulfilmentOptionsAt(sellerId, at))],
    ['Member since', formatMonthYear(onAdulisSince(sellerId))],
  ]
  // DEMO_DATA defines no Seller-level Product Quality and no claim rate.
  const facts: [string, string][] = [
    ['Avg Product Quality', '—'],
    ['Avg Seller Service', service ? `${service.average} ★` : '—'],
    ['Orders Fulfilled', completed === undefined ? '—' : String(completed)],
    ['Claim Rate', '—'],
  ]
  return (
    <>
      <div className="font-display text-lg font-semibold">About {seller.name}</div>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{seller.bio ?? '—'}</p>
      <div className="mt-4 rounded-xl bg-success-bg p-4">
        <div className="text-sm font-semibold text-success">{trustLabel(trustAt(sellerId, at))} Seller</div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">Trust level based on fulfilment, verified buyer reviews and claims outcomes. Updated by Adulis based on seller performance.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {facts.map(([label, value]) => <div key={label} className="rounded-lg bg-white/65 px-2.5 py-2"><div className="text-[9px] font-semibold uppercase text-text-muted">{label}</div><div className="text-sm font-bold text-success">{value}</div></div>)}
        </div>
      </div>
      <dl className="mt-4">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border py-2.5 text-sm"><dt className="flex-shrink-0 text-text-muted">{label}</dt><dd className="text-right text-text-secondary">{value}</dd></div>)}
      </dl>
      {(seller.socialAccounts ?? []).length > 0 && (
        <>
          <SectionLabel>Social</SectionLabel>
          {(seller.socialAccounts ?? []).map(label => <div key={label} className="border-b border-border py-2.5 text-sm"><div className="font-semibold">{label}</div><div className="text-brand">{seller.handle}</div></div>)}
        </>
      )}
    </>
  )
}

function Search({ at, recent, query, setQuery, tab, setTab, onProduct, onPost, onSeller }: {
  at: Moment; recent: readonly string[]; query: string; setQuery: (q: string) => void; tab: SearchTab; setTab: (t: SearchTab) => void
  onProduct: (id: ProductId) => void; onPost: (id: ShoppablePostId) => void; onSeller: (id: SellerId) => void
}) {
  // Search behaves as before: any query other than the zero-result example shows the same results, which are the
  // canonical Products, Shoppable Posts and Sellers that Buyers can see.
  const zero = query.toLowerCase() === BUYERS[BUYER].zeroResultQuery
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
      {!active ? <SearchLanding recent={recent} onQuery={setQuery} /> : zero ? <ZeroSearch query={query} onClear={() => setQuery('')} /> : (
        <>
          <div className="flex border-b border-border bg-surface">
            {(['top', 'products', 'posts', 'sellers'] as SearchTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-semibold capitalize ${tab === t ? 'border-b-2 border-brand text-brand' : 'text-text-muted'}`}>{t}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'top' && <TopResults at={at} onProduct={onProduct} onPost={onPost} onSeller={onSeller} />}
            {tab === 'products' && <ProductResults at={at} onProduct={onProduct} />}
            {tab === 'posts' && <PostResults at={at} onPost={onPost} />}
            {tab === 'sellers' && <SellerResults at={at} onSeller={onSeller} />}
          </div>
        </>
      )}
    </>
  )
}

function SearchLanding({ recent, onQuery }: { recent: readonly string[]; onQuery: (q: string) => void }) {
  // DEMO_DATA defines no browse categories, so the category tiles aren't shown. Recent searches are the signed-in Buyer's own.
  const buyer = BUYERS[BUYER]
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="font-display text-2xl font-semibold">What are you looking for?</div>
      <p className="mt-1 text-sm text-text-muted">Search intentionally across Products, Posts and Sellers.</p>
      {recent.length > 0 && <SectionLabel>Recent</SectionLabel>}
      {recent.map(q => <button key={q} onClick={() => onQuery(q)} className="flex w-full items-center justify-between border-b border-border py-3 text-sm"><span>↗ &nbsp;{q}</span><span className="text-text-muted">×</span></button>)}
      <button onClick={() => onQuery(buyer.zeroResultQuery ?? '')} className="mt-6 text-xs font-semibold text-text-muted underline">Preview zero-results example</button>
    </div>
  )
}

// A Product as a Search result (§8): whether a Buyer can buy it now, by the module's rule at the story moment.
type SearchProduct = { id: ProductId; available: boolean }

/** Search's Product results (§8): the Products Buyers can see, currently available ones first, each group in its current
 * order. With the availability filter on, only the available ones. Top's Products preview and the Products tab read it. */
function searchProducts(at: Moment, availableOnly: boolean): SearchProduct[] {
  const all = buyerVisibleProductsAt(at).map(id => ({ id, available: isPurchasableAt(id, at) }))
  return [...all.filter(p => p.available), ...(availableOnly ? [] : all.filter(p => !p.available))]
}

function TopResults({ at, onProduct, onPost, onSeller }: { at: Moment; onProduct: (id: ProductId) => void; onPost: (id: ShoppablePostId) => void; onSeller: (id: SellerId) => void }) {
  const products = buyerVisibleProductsAt(at), posts = buyerVisiblePostsAt(at), sellers = buyerVisibleSellers()
  // The Products preview is the first of Search's Product results, ranked as the Products tab ranks them (§8).
  const first = searchProducts(at, false)[0].id
  return (
    <div>
      <ResultHeading title="Products" count={String(products.length)} /><ProductRow productId={first} onClick={() => onProduct(first)} />
      <ResultHeading title="Posts" count={String(posts.length)} /><PostRow postId={posts[0]} onClick={() => onPost(posts[0])} />
      <ResultHeading title="Sellers" count={String(sellers.length)} /><SellerRow sellerId={sellers[0]} at={at} onClick={() => onSeller(sellers[0])} />
    </div>
  )
}

function ProductResults({ at, onProduct }: { at: Moment; onProduct: (id: ProductId) => void }) {
  // §8's availability filter: off by default, and with it on, unavailable Products are excluded. Its state shows as a
  // check mark and as the pressed state, not by colour alone (§57). An unavailable Product shows "Currently unavailable"
  // where the price would be, as the discovery lists present it (WO-004), and still opens its Product Post.
  const [availableOnly, setAvailableOnly] = useState(false)
  return <div><div className="mb-3 flex gap-2"><Choice active={availableOnly} pressed={availableOnly} onClick={() => setAvailableOnly(on => !on)}>{availableOnly && <span aria-hidden="true">✓ </span>}Available</Choice><Choice>Price</Choice><Choice>Category</Choice></div><div className="grid grid-cols-2 gap-3">{searchProducts(at, availableOnly).map(({ id, available }) => <ProductCard key={id} name={PRODUCTS[id].name} price={available ? <InlinePrice productId={id} /> : <span className="font-semibold text-text-muted">{availabilityText(id)}</span>} onClick={() => onProduct(id)} />)}</div></div>
}

function PostResults({ at, onPost }: { at: Moment; onPost: (id: ShoppablePostId) => void }) {
  return <div className="grid grid-cols-2 gap-2">{buyerVisiblePostsAt(at).map(id => <PostTile key={id} title={SHOPPABLE_POSTS[id].title} label={`${SHOPPABLE_POSTS[id].tags.length} product${SHOPPABLE_POSTS[id].tags.length === 1 ? '' : 's'}`} onClick={() => onPost(id)} />)}</div>
}

function SellerResults({ at, onSeller }: { at: Moment; onSeller: (id: SellerId) => void }) {
  return <div className="flex flex-col gap-2">{buyerVisibleSellers().map(id => <SellerRow key={id} sellerId={id} at={at} onClick={() => onSeller(id)} />)}</div>
}

function ZeroSearch({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-raised text-2xl">⌕</div>
      <div className="mt-4 font-display text-xl font-semibold">No results for “{query}”</div>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">Try a broader term, check the spelling, or browse a category instead.</p>
      <Button onClick={onClear} variant="secondary" style={{ marginTop: 20 }}>Clear search</Button>
    </div>
  )
}

/** A Collection's items. The default Saved Collection also shows this session's Saves and removals (WO-004 requirement 11). */
function collectionContents(id: CollectionId, changes: Partial<Record<SaveKey, boolean>> = {}) {
  const canonical = COLLECTIONS[id].items
  const added = (Object.keys(changes) as SaveKey[]).filter(key => changes[key] && !canonical.some(item => saveKeyOf(item) === key)).map(itemOf)
  const items = COLLECTIONS[id].isDefault ? [...canonical.filter(item => changes[saveKeyOf(item)] !== false), ...added] : canonical
  const products = items.flatMap(item => ('product' in item ? [item.product] : []))
  const posts = items.flatMap(item => ('post' in item ? [item.post] : []))
  return { products, posts, unavailable: products.filter(p => PRODUCTS[p].availability === 'Out of Stock').length }
}

function Saved({ changes, onCollection, onProduct, onPost }: { changes: Partial<Record<SaveKey, boolean>>; onCollection: (id: CollectionId) => void; onProduct: (id: ProductId) => void; onPost: (id: ShoppablePostId) => void }) {
  const collections = COLLECTION_IDS.filter(id => COLLECTIONS[id].owner === BUYER)
  // "Recently saved" shows the latest Product Post and whole Shoppable Post saved this session, otherwise the default
  // Collection's first of each.
  const recent = collectionContents(collections.find(id => COLLECTIONS[id].isDefault) ?? collections[0], changes)
  const latest = (prefix: 'product:' | 'post:') => (Object.keys(changes) as SaveKey[]).filter(key => changes[key] && key.startsWith(prefix)).map(itemOf).pop()
  const recentProduct = (latest('product:') as { product: ProductId } | undefined)?.product ?? recent.products[0]
  const recentPost = (latest('post:') as { post: ShoppablePostId } | undefined)?.post ?? recent.posts[0]
  return (
    <>
      <Header title="Saved" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-end justify-between"><div><div className="font-display text-2xl font-semibold">Your finds</div><div className="text-xs text-text-muted">Private to you</div></div><Button size="sm">New collection</Button></div>
        {collections.map(id => {
          const { products, posts } = collectionContents(id, changes)
          const tiles = [...products.map(p => PRODUCTS[p].name), ...posts.map(p => SHOPPABLE_POSTS[p].title)]
          return (
            <button key={id} onClick={() => onCollection(id)} className="mb-3 w-full rounded-2xl border border-border bg-surface p-3 text-left shadow-sm">
              <div className="grid h-44 grid-cols-2 gap-1 overflow-hidden rounded-xl">
                <Placeholder label={tiles[0]} className="h-full w-full text-2xl" />
                <div className="grid gap-1"><Placeholder label={tiles[1]} className="h-full min-h-0 w-full" /><Placeholder label={tiles[2]} className="h-full min-h-0 w-full" /></div>
              </div>
              <div className="mt-3 flex items-center justify-between"><span><span className="block font-semibold">{COLLECTIONS[id].name}</span><span className="text-xs text-text-muted">{products.length} Product Post{products.length === 1 ? '' : 's'} · {posts.length} Shoppable Post{posts.length === 1 ? '' : 's'}</span></span><IconChevronRight size={16} /></div>
            </button>
          )
        })}
        <SectionLabel>Recently saved</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {recentProduct && <ProductCard name={PRODUCTS[recentProduct].name} price={PRODUCTS[recentProduct].availability === 'Out of Stock' ? availabilityText(recentProduct) : <InlinePrice productId={recentProduct} />} onClick={() => onProduct(recentProduct)} />}
          {recentPost && <PostTile title={SHOPPABLE_POSTS[recentPost].title} onClick={() => onPost(recentPost)} label="Shoppable post" />}
        </div>
      </div>
    </>
  )
}

function Collection({ collectionId, changes, onBack, onProduct, onPost }: { collectionId: CollectionId; changes: Partial<Record<SaveKey, boolean>>; onBack: () => void; onProduct: (id: ProductId) => void; onPost: (id: ShoppablePostId) => void }) {
  const { products, posts, unavailable } = collectionContents(collectionId, changes)
  const total = products.length + posts.length
  return (
    <>
      <Header title={COLLECTIONS[collectionId].name} onBack={onBack} trailing={<IconButton label="More">•••</IconButton>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-text-muted">A private collection · {total} saved item{total === 1 ? '' : 's'}</div>
        <div className="mt-4 flex gap-2"><Choice active>All {total}</Choice><Choice>Product Posts {products.length}</Choice><Choice>Shoppable Posts {posts.length}</Choice></div>
        <SectionLabel>Product Posts</SectionLabel>
        <div className="grid grid-cols-2 gap-2">{products.map(id => <ProductCard key={id} name={PRODUCTS[id].name} price={PRODUCTS[id].availability === 'Out of Stock' ? availabilityText(id) : <InlinePrice productId={id} />} onClick={() => onProduct(id)} />)}</div>
        <SectionLabel>Whole Shoppable Posts</SectionLabel>
        <div className="grid grid-cols-2 gap-2">{posts.map(id => <PostTile key={id} title={SHOPPABLE_POSTS[id].title} onClick={() => onPost(id)} label={`${SHOPPABLE_POSTS[id].tags.length} product${SHOPPABLE_POSTS[id].tags.length === 1 ? '' : 's'}`} />)}</div>
        {unavailable > 0 && <div className="mt-5 rounded-xl border border-warning/30 bg-warning-bg p-3"><div className="text-sm font-semibold text-warning">{unavailable} saved Product Post{unavailable === 1 ? ' is' : 's are'} unavailable</div><div className="mt-1 text-xs text-text-secondary">It remains in this Collection so you can find it again if it returns.</div></div>}
      </div>
    </>
  )
}

/**
 * The explanatory line for each state, in the Order's own mode (rules 4.4–4.7): the Courier's states name the courier,
 * Seller Delivery's and Buyer Collection's name the Seller, and each final Handoff says who displays the QR and who
 * scans it (WO-006A requirements 1–3). A courier pickup is custody only; it completes nothing.
 */
function stageDetail(state: OrderState, orderId: OrderId): string {
  const order = ORDERS[orderId]
  const seller = SELLERS[order.seller]
  const scanner = order.recipient ? `${shortName(order.recipient.name)} scans it` : 'you scan it'
  switch (state) {
    case 'Paid': return 'Payment confirmed by provider'
    case 'Preparing': return `${seller.name} is preparing your item`
    case 'Ready for Courier': return 'Package is ready for collection'
    case 'Courier Assigned': return 'A seller-approved courier is assigned'
    case 'Pickup Verified': return 'Courier pickup was verified at the seller'
    case 'Out for Delivery': return 'Your package is on its way'
    case 'Ready for Seller Delivery': return `${seller.name} will deliver your Order`
    case 'Out for Seller Delivery': return `${seller.name} is on the way with your Order`
    case 'Ready for Collection': return `Collect from ${seller.name} in ${seller.area}`
    case 'Delivery Handoff': return `${order.fulfilment === 'Courier Delivery' ? 'The courier' : seller.name} displays the Delivery QR; ${scanner}`
    case 'Collection Handoff': return `${seller.name} displays the Collection QR; ${scanner}`
    case 'Completed': return order.fulfilment === 'Buyer Collection' ? 'Collection verified' : 'Delivery verified'
  }
}

/** An Order's stages, in its own fulfilment mode's timeline (rules 4.4–4.7). */
function orderStages(orderId: OrderId) {
  return ORDER_TIMELINES[ORDERS[orderId].fulfilment].map(state => ({ key: state, label: state, detail: stageDetail(state, orderId) }))
}

function OrdersList({ at, onOrder, onChats, onNotifications }: { at: Moment; onOrder: (id: OrderId) => void; onChats: () => void; onNotifications: () => void }) {
  // The Buyer's Orders at the story moment, most recently paid first.
  const orders = ordersAt({ buyer: BUYER }, at).sort((a, b) => paidAt(b).localeCompare(paidAt(a)))
  const active = orders.filter(id => orderStateAt(id, at) !== 'Completed')
  const completed = orders.filter(id => orderStateAt(id, at) === 'Completed')
  return (
    <>
      <Header title="Orders" trailing={<div className="flex gap-1"><IconButton label="Chats" onClick={onChats}><ChatIcon /></IconButton><IconButton label="Notifications" onClick={onNotifications}><BellIcon /></IconButton></div>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="font-display text-2xl font-semibold">Your Seller Orders</div>
        <p className="mt-1 text-sm text-text-muted">Track preparation and verified handoff progress.</p>
        <SectionLabel>Active</SectionLabel>
        {active.length === 0 && <p className="text-sm text-text-muted">No active Seller Orders</p>}
        {active.map(id => {
          const order = ORDERS[id]
          const seller = SELLERS[order.seller].name
          const state = orderStateAt(id, at)
          return (
            <button key={id} onClick={() => onOrder(id)} className="mb-3 w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-sm">
              <SellerIdentity initials={initials(seller)} name={seller} meta={`Order ${id} · ${state}`} />
              <div className="my-4 flex gap-3">
                <Placeholder label={PRODUCTS[order.lines[0].product].name} className="h-20 w-16 rounded-lg" />
                <span className="flex-1"><span className="block text-sm font-semibold">{order.lines.map(line => PRODUCTS[line.product].name).join(' · ')}</span><span className="mt-1 block text-xs text-text-muted">{order.lines.map(line => `${lineOptions(line)} · Quantity ${line.quantity}`).join(' · ')}</span><span className="mt-2 block text-sm font-bold">{formatEtb(orderTotals(id).total)}</span></span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-success-bg px-3 py-2 text-xs"><span className="font-semibold text-success">{state}</span><span className="text-text-secondary">View progress ›</span></div>
            </button>
          )
        })}
        <SectionLabel>Completed</SectionLabel>
        {completed.map(id => {
          const seller = SELLERS[ORDERS[id].seller].name
          return (
            <div key={id} className="mb-3 rounded-2xl border border-border p-4 opacity-80">
              <SellerIdentity initials={initials(seller)} name={seller} meta={`Order ${id} · Completed`} />
              <div className="mt-3 flex items-center justify-between text-xs"><span className="text-text-secondary">{ORDERS[id].lines.map(line => PRODUCTS[line.product].name).join(' · ')}</span><span className="font-semibold">{formatEtb(orderTotals(id).total)}</span></div>
            </div>
          )
        })}
      </div>
    </>
  )
}

function OrderDetail({ orderId, at, stage, setStage, onBack, onDelegate, onScan, onOtp, onCompleted, onClaim, onChat }: {
  orderId: OrderId; at: Moment; stage: OrderState; setStage: (stage: OrderState) => void; onBack: () => void; onDelegate: () => void
  onScan: () => void; onOtp: () => void; onCompleted: () => void; onClaim: () => void; onChat: () => void
}) {
  const order = ORDERS[orderId]
  const stages = orderStages(orderId)
  const totals = orderTotals(orderId)
  const currentIndex = Math.max(0, stages.findIndex(item => item.key === stage))
  const current = stages[currentIndex]
  const courierMode = order.fulfilment === 'Courier Delivery'
  // The final Handoff as it stands at the story moment; a previewed earlier state shows none.
  const previewing = stage !== orderStateAt(orderId, at)
  return (
    <>
      <Header title={`Order ${orderId}`} onBack={onBack} trailing={<IconButton label="Chat with seller" onClick={onChat}><ChatIcon /></IconButton>} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-brand-muted p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Current status</div>
          <div className="mt-1 font-display text-2xl font-semibold">{current.label}</div>
          <div className="mt-1 text-sm text-text-secondary">{current.detail}</div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype status</div>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {stages.map(item => <Choice key={item.key} active={item.key === stage} onClick={() => setStage(item.key)}>{item.label}</Choice>)}
          </div>
        </div>

        <SectionLabel>Progress</SectionLabel>
        <div className="ml-2">
          {stages.map((item, index) => (
            <TimelineItem key={item.key} label={item.label} detail={item.detail} done={index <= currentIndex} current={index === currentIndex} last={index === stages.length - 1} />
          ))}
        </div>

        {!previewing && <FinalHandoffCard handoff={finalHandoffAt(orderId, at)} at={at} onDelegate={onDelegate} onScan={onScan} onOtp={onOtp} onCompleted={onCompleted} />}

        <SectionLabel>Order summary</SectionLabel>
        <div className="rounded-xl bg-surface-raised p-4">
          <PriceRow label="Buyer" value={shortName(BUYERS[order.buyer].name)} />
          <PriceRow label="Seller" value={SELLERS[order.seller].name} />
          {/* Courier details belong to Courier Delivery Orders only (rule 4.7). */}
          {courierMode && order.courier && <PriceRow label="Courier" value={currentIndex >= stages.findIndex(item => item.key === 'Courier Assigned') ? COURIERS[order.courier].name : 'Not assigned'} />}
          <PriceRow label="Product" value={formatEtb(totals.products)} />
          <PriceRow label={order.fulfilment} value={formatEtb(totals.delivery)} />
          <PriceRow label={SURCHARGE_LABEL} value={formatEtb(totals.surcharge)} />
          <div className="mt-2 border-t border-border pt-3"><PriceRow label="Paid total" value={formatEtb(totals.total)} strong /></div>
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

function DelegatedRecipient({ handoff, onBack, onSave }: { handoff: FinalHandoff; onBack: () => void; onSave: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  // What the recipient will scan, in the Order's own mode (WO-006A requirements 1–3): the courier's Delivery QR, or the
  // Seller's Delivery or Collection QR.
  const scans = handoff.mode === 'Courier Delivery'
    ? 'the courier’s Delivery QR or use the fallback OTP'
    : `${presenterName(handoff)}’s ${handoff.qr} or use the verification code`
  return (
    <>
      <Header title="Delegated recipient" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">Someone else will receive this</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{`Add a trusted person who can scan ${scans} at handoff.`}</p>
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

// ---------- The final Handoff (WO-006A; rules 8.2, 8.7–8.10, 10.1–10.2; specification §19, §56) ----------
// The giver displays the final QR and the receiver scans it: the assigned Courier gives a Courier Delivery, the Seller a
// Seller Delivery or a Buyer Collection. The Buyer, or the authorized recipient, never displays a QR. QR is primary, the
// verification code is the fallback, and Manual Verification stays Operator-only emergency recovery. Every screen reads
// the Handoff from DEMO_DATA at the story moment, so it's offered only while open and accepted only once.

type HandoffMethod = 'QR' | 'OTP'

/** The giver as the Buyer sees them: the assigned Courier, or the Seller (its team member shows on Seller surfaces). */
function presenterName(handoff: FinalHandoff): string {
  return 'courier' in handoff.presenter ? COURIERS[handoff.presenter.courier].name : SELLERS[handoff.presenter.seller].name
}

/** The authorized recipient who receives and scans instead of the Buyer, by short name, if there is one (rule 10.1). */
function recipientName(handoff: FinalHandoff): string | undefined {
  return handoff.recipient.delegate && shortName(handoff.recipient.delegate.name)
}

/** Collection for Buyer Collection, Delivery for the two delivery modes. */
function handoffKind(handoff: FinalHandoff): 'Collection' | 'Delivery' {
  return handoff.mode === 'Buyer Collection' ? 'Collection' : 'Delivery'
}

/** Where a Buyer Collection Order is collected, as precisely as DEMO_DATA records it: the Seller's place, else its area. */
function collectionPlace(handoff: FinalHandoff): string {
  const seller = SELLERS[ORDERS[handoff.order].seller]
  return seller.buyerCollection?.place ?? seller.area ?? '—'
}

/** '5:56 PM' on the story moment's day, '26 Sep, 11:20 AM' on another. */
function handoffTime(time: Timestamp | undefined, at: Moment): string {
  if (!time) return '—'
  return time.slice(0, 10) === at.at.slice(0, 10) ? formatClock12(time) : `${formatDayMonth(time)}, ${formatClock12(time)}`
}

/** The final Handoff on Order Detail as it stands at the story moment (WO-006A requirements 1–4). */
function FinalHandoffCard({ handoff, at, onDelegate, onScan, onOtp, onCompleted }: {
  handoff: FinalHandoff; at: Moment; onDelegate: () => void; onScan: () => void; onOtp: () => void; onCompleted: () => void
}) {
  const giver = presenterName(handoff)
  const delegate = recipientName(handoff)
  const seller = SELLERS[ORDERS[handoff.order].seller]
  if (handoff.phase === 'approaching') {
    // On the way, or waiting for collection: no final QR exists yet, so there is nothing to scan.
    const plan = handoff.mode === 'Buyer Collection'
      ? `Collect from ${giver} in ${seller.area}, at the ${collectionPlace(handoff)}${seller.buyerCollection ? ` (${seller.buyerCollection.hours})` : ''}. When you’re together, ${giver} displays the Collection QR and ${delegate ? `${delegate}, your authorized recipient, scans it.` : 'you scan it.'}`
      : `When ${giver}${handoff.mode === 'Courier Delivery' ? ', your courier,' : ''} arrives${handoff.mode === 'Seller Delivery' ? ' with your Order' : ''}, they display the Delivery QR. ${delegate ? `${delegate}, your authorized recipient, scans it.` : 'You or your delegate scans it.'}`
    return (
      <div className="mt-2 rounded-2xl border border-brand/20 p-4">
        <div className="font-display text-lg font-semibold">{handoff.mode === 'Buyer Collection' ? 'Ready for collection' : 'Prepare for handoff'}</div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{plan}</p>
        {delegate
          ? <div className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary">Recipient authorized · {delegate}</div>
          : <Button variant="tertiary" onClick={onDelegate} style={{ width: '100%', marginTop: 14 }}>Someone else will receive this</Button>}
      </div>
    )
  }
  if (handoff.phase === 'open') {
    // The giver displays the final QR now. The recipient is fixed while the Handoff is open, so it can't be changed here.
    const title = handoff.mode === 'Courier Delivery' ? 'Courier is ready to complete delivery' : handoff.mode === 'Seller Delivery' ? `${giver} is ready to complete delivery` : `${giver} is ready to hand over your Order`
    return (
      <div className="mt-2 rounded-2xl border border-brand/20 p-4">
        <div className="font-display text-lg font-semibold">{title}</div>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{`${giver} displays the ${handoff.qr}${handoff.mode === 'Buyer Collection' ? ` at the ${collectionPlace(handoff)}` : ''}. ${delegate ? `${delegate}, your authorized recipient, scans it to confirm receipt.` : 'Scan it to confirm you received your Order.'}`}</p>
        <Button onClick={onScan} style={{ width: '100%', marginTop: 14 }}>{`Scan ${handoff.qr}`}</Button>
        <button onClick={onOtp} className="mt-3 w-full text-center text-xs font-semibold text-brand">Having trouble scanning? Use verification code</button>
      </div>
    )
  }
  if (handoff.phase === 'verified') {
    return (
      <div className="mt-2 rounded-2xl bg-success-bg p-4">
        <div className="font-display text-lg font-semibold">{handoffKind(handoff)} verified</div>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{`Final handoff verified at ${handoffTime(handoff.verifiedAt, at)}${delegate ? ` by ${delegate}, your authorized recipient` : ''}. Order ${handoff.order} is Completed.`}</p>
        <Button variant="tertiary" onClick={onCompleted} style={{ width: '100%', marginTop: 14 }}>View completed Order</Button>
      </div>
    )
  }
  return null
}

/** The scanner or code screen while the Handoff isn't open: no final QR exists yet, so nothing can be verified. */
function HandoffNotOpen({ handoff, onBack }: { handoff: FinalHandoff; onBack: () => void }) {
  const giver = presenterName(handoff)
  return (
    <>
      <Header title="Final handoff" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised text-text-muted"><ScanIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">{handoff.qr} not available yet</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{handoff.mode === 'Buyer Collection' ? `${giver} displays the Collection QR only when you’re together at the ${collectionPlace(handoff)}.` : `${giver} displays the Delivery QR when they hand over your Order.`} There’s nothing to scan before then.</p>
      </div>
      <div className="p-4 pb-6"><Button size="lg" variant="tertiary" onClick={onBack} style={{ width: '100%' }}>Back to Order</Button></div>
    </>
  )
}

/** A scan or code after the Handoff was verified: it was accepted once, and nothing changes (WO-006A). */
function HandoffDone({ handoff, at, onBack, onCompleted }: { handoff: FinalHandoff; at: Moment; onBack: () => void; onCompleted: () => void }) {
  return (
    <>
      <Header title="Final handoff" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
        <div role="status" className="mt-5">
          <div className="font-display text-2xl font-semibold">{handoffKind(handoff)} already verified</div>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">{`Order ${handoff.order} was completed at ${handoffTime(handoff.verifiedAt, at)}. Its final handoff is verified once, so there’s nothing more to scan.`}</p>
        </div>
      </div>
      <div className="p-4 pb-6"><Button size="lg" onClick={onCompleted} style={{ width: '100%' }}>View completed Order</Button></div>
    </>
  )
}

function DeliveryScanner({ handoff, at, onBack, onCamera, onOtp, onCompleted }: {
  handoff: FinalHandoff; at: Moment; onBack: () => void; onCamera: () => void; onOtp: () => void; onCompleted: () => void
}) {
  if (handoff.phase === 'verified') return <HandoffDone handoff={handoff} at={at} onBack={onBack} onCompleted={onCompleted} />
  if (handoff.phase !== 'open') return <HandoffNotOpen handoff={handoff} onBack={onBack} />
  const giver = presenterName(handoff)
  const delegate = recipientName(handoff)
  // Each mode's own instruction: the Courier for Courier Delivery, the Seller for Seller Delivery and Buyer Collection.
  const instruction = delegate
    ? `${delegate}, your authorized recipient, receives this Order and scans the ${handoff.qr} ${giver} displays.`
    : handoff.mode === 'Courier Delivery'
      ? `Ask ${giver}, your courier, to display the Delivery QR, then scan it with your camera to verify handoff.`
      : handoff.mode === 'Seller Delivery'
        ? `${giver} displays the Delivery QR when they hand over your Order. Scan it with your camera to verify handoff.`
        : `At the ${collectionPlace(handoff)}, ${giver} displays the Collection QR when they hand over your Order. Scan it with your camera to verify handoff.`
  return (
    <>
      <Header title="Final handoff" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-muted text-brand"><ScanIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Scan {handoff.qr}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{instruction}</p>
        <div className="mt-5 w-full rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">{delegate ? `${delegate} scans ${giver}’s QR. Nobody receiving an Order displays a QR.` : `You scan ${giver}’s QR. You never need to display a QR.`}</div>
      </div>
      <div className="p-4 pb-6">
        <Button size="lg" onClick={onCamera} style={{ width: '100%' }}>Open camera</Button>
        <button onClick={onOtp} className="mt-4 w-full text-center text-xs font-semibold text-brand">Having trouble scanning? Use verification code</button>
      </div>
    </>
  )
}

function ScannerCamera({ handoff, onBack, onScan, onUnreadable }: { handoff: FinalHandoff; onBack: () => void; onScan: () => void; onUnreadable: () => void }) {
  const giver = presenterName(handoff)
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-text-primary text-white">
      <div className="relative z-10 flex items-center gap-3 p-4"><IconButton label="Close camera" onClick={onBack} dark>×</IconButton><div className="font-display text-lg font-semibold">Scan {giver}’s {handoff.qr}</div></div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div role="img" aria-label={`Simulated camera frame for scanning ${giver}’s ${handoff.qr}`} className="relative h-60 w-60 rounded-3xl border-2 border-white/80">
          <span className="absolute left-3 right-3 top-1/2 h-0.5 bg-brand shadow-lg" />
          <span className="absolute inset-10 grid grid-cols-4 gap-2 opacity-30">{Array.from({ length: 16 }).map((_, i) => <span key={i} className={`${i % 3 === 0 ? 'bg-white' : 'border border-white'} rounded-sm`} />)}</span>
        </div>
        <p className="mt-6 px-8 text-center text-sm text-white/70">Position the {handoff.qr} shown on {giver}’s device inside the frame.</p>
      </div>
      <div className="p-5 pb-8">
        <Button onClick={onScan} size="lg" style={{ width: '100%' }}>Simulate QR detected</Button>
        {/* The §56 Failed state, deterministically: the scan doesn't verify and nothing changes. */}
        <button onClick={onUnreadable} className="mt-4 w-full text-center text-xs font-semibold text-white/80" style={{ outlineColor: 'var(--color-text-inverse)' }}>Simulate unreadable QR</button>
      </div>
    </div>
  )
}

function QrVerifying({ handoff, onVerified }: { handoff: FinalHandoff; onVerified: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-info-bg text-info"><ProcessingIcon /></span>
      <div role="status" className="mt-5">
        <div className="font-display text-2xl font-semibold">Verifying {handoffKind(handoff).toLowerCase()}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">Adulis is verifying the {handoff.qr} against Order {handoff.order}.</p>
      </div>
      <Button onClick={onVerified} variant="tertiary" style={{ marginTop: 32 }}>Complete verification</Button>
    </div>
  )
}

/** The §56 Failed state: the QR didn't verify, so nothing changed; try again, or use the verification code (§19). */
function ScanFailed({ handoff, at, onBack, onRetry, onCode }: { handoff: FinalHandoff; at: Moment; onBack: () => void; onRetry: () => void; onCode: () => void }) {
  const message = `The ${handoff.qr} couldn’t be read, so nothing changed: Order ${handoff.order} is still at ${orderStateAt(handoff.order, at) ?? '—'}.`
  return (
    <>
      <Header title="Final handoff" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center">
        <p role="alert" className="sr-only">{`${handoff.qr} not verified. ${message}`}</p>
        <VerificationFailed title={`${handoff.qr} not verified`} message={message} onRetry={onRetry} onFallback={onCode} />
      </div>
    </>
  )
}

function DeliveryConfirmed({ handoff, at, method, repeat, onContinue }: { handoff: FinalHandoff; at: Moment; method?: HandoffMethod; repeat: boolean; onContinue: () => void }) {
  // The verified final scan completes the Order, so its time is the Order's Completed time (DEMO_DATA).
  const time = handoffTime(handoff.verifiedAt, at)
  const giver = presenterName(handoff)
  const delegate = recipientName(handoff)
  // This session's method, or DEMO_DATA's when the Handoff was verified before this session.
  const used = method ?? (handoff.method === 'OTP fallback' ? 'OTP' : 'QR')
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
      <div role="status" className="mt-5">
        <div className="font-display text-2xl font-semibold">{handoffKind(handoff)} {repeat ? 'already verified' : 'confirmed'}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{repeat ? `This handoff was verified once, at ${time}. Nothing changed.` : used === 'QR' ? `Final handoff is verified. ${delegate ?? 'You'} scanned ${giver}’s ${handoff.qr} at ${time}.` : `Final handoff is verified with the verification code at ${time}.`}</p>
      </div>
      <div className="mt-6 w-full rounded-xl bg-success-bg p-4 text-left">
        <PriceRow label="Seller Order" value={handoff.order} />
        <PriceRow label="Handoff" value="Verified" strong />
        <PriceRow label="Method" value={used === 'QR' ? 'QR' : 'Verification code'} />
        <PriceRow label="Received by" value={delegate ? `${delegate} (authorized recipient)` : shortName(BUYERS[handoff.recipient.buyer].name)} />
      </div>
      {delegate && <p className="mt-3 text-xs leading-relaxed text-text-muted">Order ownership, Claim, refund and Review rights stay with you.</p>}
      <Button size="lg" onClick={onContinue} style={{ width: '100%', marginTop: 24 }}>Continue</Button>
    </div>
  )
}

function OtpFallback({ handoff, at, onBack, onVerify, onCompleted }: { handoff: FinalHandoff; at: Moment; onBack: () => void; onVerify: () => void; onCompleted: () => void }) {
  const [otp, setOtp] = useState('')
  if (handoff.phase === 'verified') return <HandoffDone handoff={handoff} at={at} onBack={onBack} onCompleted={onCompleted} />
  if (handoff.phase !== 'open') return <HandoffNotOpen handoff={handoff} onBack={onBack} />
  const delegate = handoff.recipient.delegate
  // The code goes to the recipient's phone as DEMO_DATA records it (WO-006A requirement 5), never via the Courier.
  const phone = delegate?.phoneMasked ?? BUYERS[handoff.recipient.buyer].phoneMasked
  return (
    <>
      <Header title="Verification code" onBack={onBack} />
      <div className="flex-1 p-5">
        <div className="font-display text-2xl font-semibold">Enter verification code</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{delegate
          ? `If the QR can’t be scanned, Adulis sends a one-time verification code to ${shortName(delegate.name)}’s phone (${phone}). Enter the verification code sent to that phone once the Order is received.`
          : `If the QR can’t be scanned, Adulis sends a one-time verification code to your phone${phone ? ` (${phone})` : ''}. Enter the verification code sent to your phone once you’ve received your Order.`}</p>
        <div className="mt-7"><TextInput label="6-digit verification code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" inputMode="numeric" /></div>
        <div className="mt-5 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">Only use it while the Order is handed over in person. The code works once, for this handoff only.</div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={otp.length !== 6} onClick={onVerify} style={{ width: '100%' }}>Verify handoff</Button></div>
    </>
  )
}

function CompletedOrder({ orderId, at, onBack, onReview, onClaim }: { orderId: OrderId; at: Moment; onBack: () => void; onReview: () => void; onClaim: () => void }) {
  const order = ORDERS[orderId]
  const names = order.lines.map(line => PRODUCTS[line.product].name).join(' · ')
  const handoff = finalHandoffAt(orderId, at)
  const delegate = recipientName(handoff)
  // The review right is the Order Buyer's, from the verified final Handoff, never the recipient's (rules 10.2, 11.1).
  const eligibility = reviewEligibilityAt(orderId, at)
  return (
    <>
      <Header title="Completed Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-2xl bg-success-bg p-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white"><CheckIcon /></span><div className="mt-3 font-display text-2xl font-semibold">Completed</div><div className="mt-1 text-sm text-text-secondary">{handoffKind(handoff)} verified · Order {orderId}</div>{delegate && <div className="mt-1 text-xs text-text-muted">Received by {delegate}, your authorized recipient</div>}</div>
        <SectionLabel>Your order</SectionLabel>
        <div className="flex gap-3"><Placeholder label={names} className="h-24 w-20 rounded-xl" /><div><div className="text-sm font-semibold">{names}</div><div className="mt-1 text-xs text-text-muted">{SELLERS[order.seller].name} · {order.lines.map(lineOptions).join(' · ')}</div><div className="mt-2 text-sm font-bold">{formatEtb(orderTotals(orderId).total)} paid</div></div></div>
        {eligibility.eligible && !eligibility.review && <div className="mt-6 rounded-xl border border-brand/20 p-4"><div className="font-display text-lg font-semibold">How was your order?</div><p className="mt-1 text-xs text-text-muted">Your verified handoff means this order now qualifies for a review.</p><p className="mt-1 text-xs font-semibold text-text-secondary">Eligible for review from {handoffTime(eligibility.from, at)} · Not reviewed yet</p><Button onClick={onReview} style={{ width: '100%', marginTop: 14 }}>Review Order</Button></div>}
        {eligibility.review && <div className="mt-6 rounded-xl bg-surface-raised p-4 text-sm text-text-secondary">You reviewed this Order.</div>}
        <button onClick={onClaim} className="mt-5 w-full text-center text-xs font-semibold text-brand">Problem with this Order?</button>
      </div>
    </>
  )
}

function ReviewOrder({ orderId, onBack, onSubmit }: { orderId: OrderId; onBack: () => void; onSubmit: () => void }) {
  const [service, setService] = useState(0)
  const [quality, setQuality] = useState(0)
  const [comment, setComment] = useState('')
  const seller = SELLERS[ORDERS[orderId].seller].name
  return (
    <>
      <Header title="Review Order" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <SellerIdentity initials={initials(seller)} name={seller} meta={`Order ${orderId} · Verified completion`} />
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
      <div className="mt-3 flex justify-between">{[1, 2, 3, 4, 5].map(rating => <button key={rating} onClick={() => onChange(rating)} aria-label={`${rating} star${rating === 1 ? '' : 's'}`} className={`text-3xl ${rating <= value ? 'text-warning' : 'text-border-strong'}`}>★</button>)}</div>
    </div>
  )
}

function ClaimStart({ orderId, issue, setIssue, onBack, onContinue }: { orderId: OrderId; issue: string; setIssue: (issue: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <Header title="Problem with this Order?" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="font-display text-2xl font-semibold">What happened?</div>
        <p className="mt-1 text-sm text-text-muted">Select the issue that best describes your problem with Order {orderId}.</p>
        <div className="mt-5 flex flex-col gap-2">
          {CLAIM_ISSUES.map(option => <button key={option} onClick={() => setIssue(option)} className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm font-semibold ${issue === option ? 'border-brand bg-brand-muted' : 'border-border'}`}><span className={`h-4 w-4 rounded-full border ${issue === option ? 'border-4 border-brand' : 'border-border-strong'}`} />{option}</button>)}
        </div>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!issue} onClick={onContinue} style={{ width: '100%' }}>Continue</Button></div>
    </>
  )
}

function ClaimForm({ claimId, issue, onBack, onSubmit }: { claimId?: ClaimId; issue: string; onBack: () => void; onSubmit: () => void }) {
  const [details, setDetails] = useState('')
  const [evidence, setEvidence] = useState(false)
  // A DEMO_DATA Claim adds its recorded evidence photos; a transient claim adds the one simulated photo.
  const photos = claimId ? CLAIMS[claimId].evidencePhotos : 1
  return (
    <>
      <Header title="Claim details" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="rounded-xl bg-surface-raised p-3 text-sm"><span className="font-semibold">Issue:</span> {issue}</div>
        <div className="mt-5"><Textarea label="Describe the problem" value={details} onChange={e => setDetails(e.target.value)} placeholder="Tell us what happened and what part of the order is affected." rows={5} /></div>
        <SectionLabel>Evidence</SectionLabel>
        <button onClick={() => setEvidence(true)} className={`flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left ${evidence ? 'border-success bg-success-bg' : 'border-border-strong'}`}>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-raised text-lg">{evidence ? <CheckIconSmall /> : '+'}</span>
          <span><span className="block text-sm font-semibold">{evidence ? `${photos} photo${photos === 1 ? '' : 's'} added` : 'Add photos or video'}</span><span className="text-xs text-text-muted">Show the item, packaging and affected area</span></span>
        </button>
        <p className="mt-4 text-xs leading-relaxed text-text-muted">Your claim and evidence are evaluated against the order and verified handoff record.</p>
      </div>
      <div className="border-t border-border p-4 pb-6"><Button size="lg" disabled={!details || !evidence} onClick={onSubmit} style={{ width: '100%' }}>Submit claim</Button></div>
    </>
  )
}

function ClaimStatus({ orderId, claimId, at, onDone }: { orderId: OrderId; claimId?: ClaimId; at: Moment; onDone: () => void }) {
  // A submitted Claim is Open until an Operator takes it (Claims). A transient claim has no DEMO_DATA identifier.
  const state = (claimId && claimStateAt(claimId, at)) || 'Open'
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-info-bg text-info"><CheckIcon /></span>
      <div className="mt-5 font-display text-2xl font-semibold">Claim submitted</div>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">We received your issue and evidence. You’ll be notified when the review status changes.</p>
      <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left">{claimId && <PriceRow label="Claim" value={claimId} />}<PriceRow label="Status" value={state} strong /><PriceRow label="Seller Order" value={orderId} /></div>
      <Button size="lg" onClick={onDone} style={{ width: '100%', marginTop: 24 }}>Return to Order</Button>
    </div>
  )
}

function ChatList({ at, sent, onBack, onConversation }: { at: Moment; sent: Partial<Record<ConversationId, readonly MessageRecord[]>>; onBack: () => void; onConversation: (seller: SellerId) => void }) {
  // The Buyer's conversations with messages by the story moment, latest first. Each previews its newest message: one
  // Maya sent in this session, if she has, otherwise DEMO_DATA's last. DEMO_DATA records no read state.
  const threads = CONVERSATION_IDS.filter(id => CONVERSATIONS[id].buyer === BUYER)
    .flatMap(id => { const last = effectiveMessagesAt(id, at, sent[id]).pop(); return last ? [{ id, last }] : [] })
    .sort((a, b) => byMessageTime(b.last, a.last))
  return (
    <>
      <Header title="Messages" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <SectionLabel>Buyer–Seller threads</SectionLabel>
        {threads.map(({ id, last }) => {
          const seller = SELLERS[CONVERSATIONS[id].seller].name
          return <button key={id} onClick={() => onConversation(CONVERSATIONS[id].seller)} className="flex w-full items-center gap-3 border-b border-border py-4 text-left"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">{initials(seller)}</span><span className="min-w-0 flex-1"><span className="flex justify-between"><span className="font-semibold">{seller}</span><span className="text-[10px] text-text-muted">{formatAge(last.at, at.at)}</span></span><span className="block truncate text-xs text-text-muted">{last.text}</span></span></button>
        })}
      </div>
    </>
  )
}

/**
 * Maya's one conversation with the Seller (rule 12.1). Every message shows the context it was sent with (specification
 * §22). The composer's context is this screen's state, never the conversation's, and changing it changes no message
 * (rule 12.3).
 */
function Conversation({ sellerId, startContext, at, sent, onSend, onBack }: {
  sellerId: SellerId; startContext: MessageContext; at: Moment; sent: Partial<Record<ConversationId, readonly MessageRecord[]>>
  onSend: (conversation: ConversationId, message: MessageRecord) => void; onBack: () => void
}) {
  // Maya has no conversation with some Sellers (DEMO_DATA › Conversations), and the prototype starts none.
  const conversation = conversationBetween(BUYER, sellerId)
  // The composer starts on the entry point's record when the selector offers it (rules 12.5–12.6), else on General / Seller.
  const [context, setContext] = useState<MessageContext>(() => (conversation && isContextChoiceAt(conversation, startContext, at) ? startContext : GENERAL_CONTEXT))
  const [text, setText] = useState('')
  const [choosing, setChoosing] = useState(false)
  const seller = SELLERS[sellerId].name
  // DEMO_DATA's messages so far, then this session's, in time order.
  const messages = conversation ? effectiveMessagesAt(conversation, at, sent[conversation]) : []
  const send = () => {
    const body = text.trim()
    if (!conversation || !body) return
    onSend(conversation, { at: at.at, from: 'buyer', context, text: body })
    setText('')
  }
  // A message just sent comes into view; opening the conversation keeps its place.
  const list = useRef<HTMLDivElement>(null)
  const shown = useRef(messages.length)
  useEffect(() => {
    if (messages.length > shown.current) list.current?.scrollTo({ top: list.current.scrollHeight })
    shown.current = messages.length
  }, [messages.length])
  return (
    <>
      <Header title={seller} onBack={onBack} />
      <div className="border-b border-border bg-warning-bg px-4 py-2 text-[10px] leading-relaxed text-text-secondary">Chat helps coordination, but messages do not change payment, order, fulfilment or handoff truth.</div>
      {conversation ? <>
        <div ref={list} role="list" aria-label="Messages" className="flex-1 overflow-y-auto bg-surface-raised p-4">
          {messages.map((m, index) => <ChatMessage key={index} message={m} spaced={index > 0} />)}
        </div>
        <div className="border-t border-border bg-surface p-3 pb-5">
          <button onClick={() => setChoosing(true)} aria-haspopup="dialog" aria-label={`Talking about: ${contextSubject(context)}. Change`} className="mb-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-brand bg-brand-muted px-3 py-1 text-left text-xs font-semibold text-brand-dark">
            <span>Talking about: {contextSubject(context)}</span>
            <IconChevronDown size={12} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1"><TextInput aria-label="Message" value={text} onChange={e => setText(e.target.value)} placeholder={'general' in context ? `Message ${seller}` : `Message about ${contextSubject(context)}`} /></div>
            <Button size="md" onClick={send}>Send</Button>
          </div>
        </div>
        {choosing && <ContextSheet choices={contextChoicesAt(conversation, at)} selected={context} onSelect={setContext} onClose={() => setChoosing(false)} />}
      </> : (
        <div className="flex-1 bg-surface-raised p-4">
          <div className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-text-secondary">
            <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype</span>
            {shortName(BUYERS[BUYER].name)} has no conversation with {seller} in the demo data, so the prototype doesn't start one.
          </div>
        </div>
      )}
    </>
  )
}

/** A message with the chip of the context it was sent with (specification §22). Maya sees the Seller, never the team member. */
function ChatMessage({ message, spaced }: { message: MessageRecord; spaced?: boolean }) {
  const mine = message.from === 'buyer'
  return (
    <div role="listitem" className={`${mine ? 'ml-auto items-end' : 'items-start'} ${spaced ? 'mt-3' : ''} flex max-w-[78%] flex-col`}>
      <span className="mb-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">Talking about: {contextSubject(message.context)}</span>
      <div className={`${mine ? 'rounded-tr-sm bg-brand text-white' : 'rounded-tl-sm bg-surface shadow-sm'} rounded-2xl p-3 text-sm`}>{message.text}</div>
    </div>
  )
}

/** "Talking about": the composer's context choices, exactly the conversation's at the story moment (rules 12.5–12.6). */
function ContextSheet({ choices, selected, onSelect, onClose }: { choices: readonly MessageContext[]; selected: MessageContext; onSelect: (context: MessageContext) => void; onClose: () => void }) {
  return (
    <BottomSheet title="Talking about" onClose={onClose}>
      {dismiss => CONTEXT_GROUPS.map(group => {
        const options = choices.filter(choice => group.kind in choice).map(choice => {
          const current = sameContext(choice, selected)
          return (
            <button key={contextKey(choice)} autoFocus={current} aria-current={current ? 'true' : undefined} onClick={() => { onSelect(choice); dismiss() }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm ${current ? 'bg-brand-muted font-semibold text-brand-dark' : 'text-text-primary'}`}>
              {contextSubject(choice)}
              {current && <CheckIconSmall />}
            </button>
          )
        })
        if (!options.length) return null
        return 'label' in group
          ? <div key={group.kind} role="group" aria-labelledby={`context-group-${group.kind}`} className="mt-4"><div id={`context-group-${group.kind}`} className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">{group.label}</div>{options}</div>
          : <div key={group.kind}>{options}</div>
      })}
    </BottomSheet>
  )
}

function Chatbot({ productId, onBack, onEscalate }: { productId: ProductId; onBack: () => void; onEscalate: (at: Timestamp) => void }) {
  const [asked, setAsked] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const seller = SELLERS[PRODUCTS[productId].seller].name
  // The Seller's chatbot answers only its configured answers. DEMO_DATA's question to it is unmatched, so the Buyer
  // is offered Talk to Seller; the question then continues in the conversation with the Seller, with its own context.
  const conversation = conversationBetween(BUYER, PRODUCTS[productId].seller)
  const question = conversation && CONVERSATIONS[conversation].messages.find(m => m.escalatedFromChatbot)
  return (
    <>
      <Header title={`${seller} chatbot`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto bg-surface-raised p-4">
        {asked && question && <div role="list" aria-label="Messages"><ChatMessage message={question} /></div>}
        {escalated && <div className="mt-3 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Escalated to {seller} · Seller Companion Inbox</div>}
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6">
        {question && <>
          <div className="mb-3 text-xs font-semibold text-text-muted">Suggested question</div>
          <button onClick={() => setAsked(true)} className="w-full rounded-xl border border-border p-3 text-left text-sm font-semibold">{question.text}</button>
        </>}
        {asked && question && <Button onClick={() => { setEscalated(true); onEscalate(question.at) }} disabled={escalated} style={{ width: '100%', marginTop: 10 }}>{escalated ? 'Sent to Seller' : 'Talk to Seller'}</Button>}
      </div>
    </>
  )
}

/** A Buyer notification in the list's title and detail form, from its DEMO_DATA event, and the Order it opens. */
function notificationText(n: NotificationRecord): { title: string; detail: string; order?: OrderId } {
  const e = n.event
  const about = (order: OrderId) => `${SELLERS[ORDERS[order].seller].name} · Order ${order}`
  switch (e.kind) {
    case 'Order Paid': return { title: 'Payment confirmed', detail: `Order ${e.order} was created after provider confirmation.`, order: e.order }
    case 'Order status': return { title: e.state, detail: about(e.order), order: e.order }
    // DEMO_DATA's wording: the Courier, or for Seller Delivery the Seller, is ready to complete delivery.
    case 'Delivery action': return { title: `${ORDERS[e.order].fulfilment === 'Courier Delivery' ? 'Courier' : SELLERS[ORDERS[e.order].seller].name} is ready to complete delivery`, detail: about(e.order), order: e.order }
    case 'Claim status': return { title: `Claim ${e.state}`, detail: `Claim ${e.claim} · Order ${CLAIMS[e.claim].order}`, order: CLAIMS[e.claim].order }
    case 'Review reminder': return { title: 'Review reminder', detail: about(e.order), order: e.order }
    default: return { title: e.kind, detail: '' }
  }
}

function Notifications({ at, onBack, onOrder }: { at: Moment; onBack: () => void; onOrder: (id: OrderId) => void }) {
  // The Buyer's notifications at the story moment. DEMO_DATA records no read state, so none is marked unread.
  return (
    <>
      <Header title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto">
        {notificationsAt(BUYER, at).map((n, index) => {
          const { title, detail, order } = notificationText(n)
          const time = notificationTime(n)
          return <NotificationItem key={index} title={title} detail={detail} time={time ? formatAge(time, at.at) : '—'} onClick={() => order && onOrder(order)} />
        })}
      </div>
    </>
  )
}

function NotificationItem({ unread, title, detail, time, onClick }: { unread?: boolean; title: string; detail: string; time: string; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full gap-3 border-b border-border p-4 text-left ${unread ? 'bg-brand-muted/40' : 'bg-surface'}`}><span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${unread ? 'bg-brand' : 'bg-transparent'}`} /><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-text-muted">{detail}</span></span><span className="text-[10px] text-text-muted">{time}</span></button>
}

function ReportPostSheet({ postId, onClose }: { postId: ShoppablePostId; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // The moderation case DEMO_DATA records for this post's report; a report on another post is transient.
  const caseId = (Object.keys(MODERATION_CASES) as ModerationId[]).find(id => MODERATION_CASES[id].post === postId)
  return (
    <div onClick={onClose} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45">
      <div onClick={event => event.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-strong" />
        {!submitted ? <>
          <div className="flex items-center justify-between"><div className="font-display text-xl font-semibold">Report Shoppable Post</div><IconButton label="Close" onClick={onClose}>×</IconButton></div>
          <p className="mt-1 text-xs text-text-muted">Select the reason that best describes the issue.</p>
          <div className="mt-4 flex flex-col gap-2">{REPORT_CATEGORIES.map(value => <button key={value} onClick={() => setReason(value)} className={`rounded-xl border p-3 text-left text-sm font-semibold ${reason === value ? 'border-brand bg-brand-muted' : 'border-border'}`}>{value}</button>)}</div>
          <Button disabled={!reason} onClick={() => setSubmitted(true)} style={{ width: '100%', marginTop: 16 }}>Submit Report</Button>
        </> : <div className="py-5 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span><div className="mt-4 font-display text-xl font-semibold">Report submitted</div>{caseId && <p className="mt-1 text-sm text-text-muted">Moderation case {caseId} is ready for review.</p>}<Button variant="tertiary" onClick={onClose} style={{ marginTop: 16 }}>Done</Button></div>}
      </div>
    </div>
  )
}

function AddToCartConfirmation({ product, options, quantity, onClose, onCart }: { product: ProductId; options: readonly string[]; quantity: number; onClose: () => void; onCart: () => void }) {
  return (
    <div onClick={onClose} className="absolute inset-0 z-50 flex flex-col justify-end bg-black/45">
      <div onClick={e => e.stopPropagation()} className="rounded-t-3xl bg-surface px-5 pb-7 pt-3 shadow-xl">
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border-strong" />
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success"><CheckIcon /></span>
          <span className="flex-1">
            <span className="block font-display text-xl font-semibold">Added to {SELLERS[PRODUCTS[product].seller].name} cart</span>
            <span className="mt-1 block text-sm text-text-muted">{[options.join(', '), `Quantity ${quantity}`].filter(Boolean).join(' · ')}</span>
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

function SellerCart({ seller: sellerId, lines, isAvailable, availabilityOf, held, onBack, onAllCarts, onCheckout, onQuantity, onRemove }: {
  seller: SellerId; lines: readonly CartLine[]
  /** Whether the signed-in Buyer can buy a Product now; a guest's Cart is checked after sign-in instead (rule 3.11). */
  isAvailable: ((id: ProductId) => boolean) | null
  availabilityOf: (id: ProductId) => string
  /** This Seller's Order waiting for payment again: it holds its items until a retry pays it (rule 5.9). */
  held?: CheckoutOrder
  onBack: () => void; onAllCarts: () => void; onCheckout: () => void; onQuantity: (line: CartLine, quantity: number) => void; onRemove: (line: CartLine) => void
}) {
  // A Seller's own cart, as the Buyer built it in this session (rules 3.10, 4.1–4.3), at the prices a new Order pays now.
  const seller = SELLERS[sellerId].name
  const subtotal = productsSubtotal(lines)
  const unavailable = isAvailable ? lines.filter(line => !isAvailable(line.product)) : []
  const isHeld = (line: CartLine) => !!held && held.lines.some(item => sameLine(item, line))
  return (
    <>
      <Header title={`${seller} cart`} onBack={onBack} trailing={<button onClick={onAllCarts} className="text-xs font-semibold text-brand">All carts</button>} />
      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised text-text-muted"><IconShop size={24} /></span>
          <div className="mt-4 font-display text-xl font-semibold">{seller} cart is empty</div>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">The Product was removed. Your other Seller carts are unchanged.</p>
          <Button variant="secondary" onClick={onBack} style={{ marginTop: 20 }}>Return to Product</Button>
        </div>
      ) : <div className="flex-1 overflow-y-auto p-4">
        <SellerIdentity initials={initials(seller)} name={seller} meta={`${lines.length} item${lines.length === 1 ? '' : 's'} · Seller-specific cart`} />
        {lines.map(line => {
          const product = PRODUCTS[line.product]
          const gone = unavailable.includes(line)
          // Items a Seller Order holds can't change while it waits for payment: its retry pays exactly what it holds.
          const locked = isHeld(line)
          return (
            <div key={`${line.product}-${line.options.join('-')}`} className="mt-4 flex gap-3 border-b border-border pb-5">
              <Placeholder label={product.name} className="h-28 w-24 rounded-xl" />
              <div className="flex flex-1 flex-col">
                <div className="text-sm font-semibold leading-snug">{product.name}</div>
                <div className="mt-1 text-xs text-text-muted">{lineOptions(line)}</div>
                <div className={`mt-2 text-sm font-bold ${gone ? 'text-danger' : 'text-brand'}`}>{gone ? availabilityOf(line.product) : <InlinePrice productId={line.product} />}</div>
                <div className="mt-auto flex items-center justify-between">
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button onClick={() => onQuantity(line, Math.max(1, line.quantity - 1))} disabled={locked} aria-label={`Decrease ${product.name} quantity`} className={`h-8 w-8${locked ? ' opacity-40' : ''}`}>−</button>
                    <span className="w-7 text-center text-xs font-semibold">{line.quantity}</span>
                    <button onClick={() => onQuantity(line, line.quantity + 1)} disabled={locked} aria-label={`Increase ${product.name} quantity`} className={`h-8 w-8${locked ? ' opacity-40' : ''}`}>+</button>
                  </div>
                  <button onClick={() => onRemove(line)} disabled={locked} aria-label={`Remove ${product.name}`} className={`text-xs text-danger${locked ? ' opacity-40' : ''}`}>Remove</button>
                </div>
              </div>
            </div>
          )
        })}
        <div className="mt-5 rounded-xl bg-surface-raised p-4">
          <PriceRow label="Products" value={formatEtb(subtotal)} />
          <div className="mt-3 border-t border-border pt-3"><PriceRow label="Cart subtotal" value={formatEtb(subtotal)} strong /></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">Fulfilment and applicable fees are selected during checkout. This checkout creates an order with {seller} only.</p>
      </div>}
      {lines.length > 0 && <div className="border-t border-border bg-surface p-4 pb-6">
        {held
          ? <>
              <p className="mb-3 text-xs leading-relaxed text-text-secondary">Seller Order {held.ref} holds {held.lines.length === 1 ? 'this item' : 'these items'} until its payment succeeds. A retry stays on the same Seller Order.</p>
              <Button size="lg" onClick={onCheckout} style={{ width: '100%' }}>Retry payment</Button>
            </>
          : <>
              {unavailable.length > 0 && <p role="alert" className="mb-3 text-xs leading-relaxed text-danger">Remove the unavailable item{unavailable.length === 1 ? '' : 's'} to check out this cart.</p>}
              <Button size="lg" onClick={onCheckout} disabled={unavailable.length > 0} style={{ width: '100%' }}>Checkout this Seller cart</Button>
            </>}
      </div>}
    </>
  )
}

function MultiCart({ carts, first, isAvailable, openOrderFor, progress, onBack, onCheckout }: {
  carts: readonly { seller: SellerId; lines: readonly CartLine[] }[]; first: SellerId; isAvailable: ((id: ProductId) => boolean) | null
  /** A Seller's Order waiting for payment again, if any: that Seller cart is paid by a retry (rule 5.9). */
  openOrderFor: (seller: SellerId) => CheckoutOrder | undefined
  progress: readonly ProgressEntry[]; onBack: () => void; onCheckout: (seller: SellerId) => void
}) {
  // The current Seller cart goes first; every other Seller cart is reviewed separately.
  const ordered = [...carts.filter(item => item.seller === first), ...carts.filter(item => item.seller !== first)]
  const [notice, setNotice] = useState<SellerId | null>(null)
  const status = (seller: SellerId) => { const open = openOrderFor(seller); return open && `${open.ref} · ${orderStatus(open)}` }
  return (
    <>
      <Header title="Your carts" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="font-display text-2xl font-semibold">{ordered.length} Seller cart{ordered.length === 1 ? '' : 's'}</div>
        <p className="mt-1 text-sm text-text-muted">Each seller is checked out and confirmed separately.</p>
        {/* Partial completion (WO-006 requirement 20): each Seller Order's own state once a coordinated checkout is under way. */}
        {progress.length > 1 && progress.some(entry => entry.order) && <CheckoutProgress entries={progress} className="mt-4" />}
        {ordered.map((item, index) => (index === 0
          ? <CartSummary key={item.seller} seller={item.seller} lines={item.lines} status={status(item.seller)} blocked={!openOrderFor(item.seller) && !!isAvailable && item.lines.some(line => !isAvailable(line.product))} onCheckout={() => onCheckout(item.seller)} actionLabel={openOrderFor(item.seller) ? 'Retry payment' : undefined} />
          : <CartSummary key={item.seller} seller={item.seller} lines={item.lines} status={status(item.seller)} onCheckout={() => setNotice(item.seller)} actionLabel="Review separately" />))}
        {notice && ordered[0] && <div className="mt-3 rounded-xl bg-brand-muted p-3 text-xs leading-relaxed text-brand-dark">{SELLERS[notice].name} remains a separate Seller cart. Finish or leave the {SELLERS[ordered[0].seller].name} checkout before starting this one.</div>}
        <div className="mt-5 rounded-xl border border-info/20 bg-info-bg p-3 text-xs leading-relaxed text-info">
          Adulis coordinates your carts, but each checkout creates one distinct Seller Order. Amounts, fulfilment and payment status are never combined across sellers.
        </div>
      </div>
    </>
  )
}

function CartSummary({ seller: sellerId, lines, status, blocked, onCheckout, actionLabel }: {
  seller: SellerId; lines: readonly CartLine[]
  /** The state of this Seller cart's Order waiting for payment again, if any. */
  status?: string
  blocked?: boolean; onCheckout: () => void; actionLabel?: string
}) {
  const seller = SELLERS[sellerId].name
  const item = lines.map(line => PRODUCTS[line.product].name).join(' · ')
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <SellerIdentity initials={initials(seller)} name={seller} meta={`${lines.length} item${lines.length === 1 ? '' : 's'}`} />
      <div className="my-4 flex items-center gap-3">
        <Placeholder label={item} className="h-16 w-16 rounded-lg" />
        <div className="flex-1"><div className="text-sm font-semibold">{item}</div><div className="mt-1 text-xs text-text-muted">Quantity {quantity}</div></div>
        <div className="text-sm font-bold">{formatEtb(productsSubtotal(lines))}</div>
      </div>
      {status && <p className="mb-3 text-xs font-semibold text-danger">Seller Order {status}</p>}
      {blocked && <p role="alert" className="mb-3 text-xs leading-relaxed text-danger">Remove the unavailable items in this cart before checkout.</p>}
      <Button size="sm" variant="secondary" onClick={onCheckout} disabled={blocked} style={{ width: '100%' }}>{actionLabel ?? `Checkout ${seller}`}</Button>
    </div>
  )
}

function CheckoutCoordinator({ seller: sellerId, lines, others, onBack, onContinue }: { seller: SellerId; lines: readonly CartLine[]; others: readonly SellerId[]; onBack: () => void; onContinue: () => void }) {
  // One checkout for one Seller cart; the Buyer's other Seller carts stay as they are (rules 4.1–4.3).
  const seller = SELLERS[sellerId].name
  return (
    <>
      <Header title="Checkout" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted font-display text-lg font-bold text-brand-dark">{initials(seller)}</div>
        <div className="mt-4 font-display text-2xl font-semibold">Checkout {seller}</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">You are starting one checkout for one Seller cart.{others.map(other => ` Your ${SELLERS[other].name} cart stays saved and unchanged.`)}</p>
        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-muted p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-dark">Seller Order</div>
          <div className="mt-2 flex items-center justify-between"><span className="font-semibold">{seller}</span><span className="font-bold">{formatEtb(productsSubtotal(lines))}</span></div>
          <div className="mt-1 text-xs text-text-secondary">{lines.length} product{lines.length === 1 ? '' : 's'} · Fulfilment selected next</div>
        </div>
        {others.map(other => (
          <div key={other} className="mt-4 rounded-2xl border border-border p-4 opacity-70">
            <div className="flex items-center justify-between"><span className="font-semibold">{SELLERS[other].name}</span><span className="text-xs text-text-muted">Stays in cart</span></div>
            <div className="mt-1 text-xs text-text-muted">Not part of this checkout</div>
          </div>
        ))}
        <div className="mt-6 flex gap-3 text-xs text-text-muted">
          <StepDot active label="Seller" /><StepLine /><StepDot label="Fulfilment" /><StepLine /><StepDot label="Payment" />
        </div>
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6"><Button size="lg" onClick={onContinue} style={{ width: '100%' }}>Continue with {seller}</Button></div>
    </>
  )
}

function SellerCheckout({ at, seller: sellerId, lines, mode, onMode, note, onBack, onPay }: {
  at: Moment; seller: SellerId; lines: readonly CartLine[]
  /** This Seller cart's own fulfilment choice, one the Seller offers at `at` (rule 4.3). */
  mode: FulfilmentMode; onMode: (mode: FulfilmentMode) => void
  /** Why payment doesn't continue from this cart, so no Seller Order is created; without one, payment continues. */
  note?: string
  onBack: () => void; onPay: () => void
}) {
  // The options the Seller offers at the story moment, with its own charges. DEMO_DATA quotes no delivery time.
  const seller = SELLERS[sellerId]
  const buyer = BUYERS[BUYER]
  const options = fulfilmentOptionsAt(sellerId, at)
  const courier = options.find(option => option.mode === 'Courier Delivery')
  // The Products at current prices, the Seller's charge for the mode, and the 0.5% surcharge on the Products alone (WO-006).
  const totals = checkoutTotalsAt(sellerId, lines, mode, at)
  const detail: Record<FulfilmentMode, string> = {
    'Buyer Collection': `Collect from ${seller.name} in ${seller.area}`,
    'Seller Delivery': 'Arranged and delivered by the seller',
    'Courier Delivery': 'Seller-approved courier',
  }
  return (
    <>
      <Header title={`${seller.name} checkout`} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-surface-raised p-3"><SellerIdentity initials={initials(seller.name)} name={seller.name} meta={`Seller Order · ${lines.length} product${lines.length === 1 ? '' : 's'}`} /></div>
        <SectionLabel>Fulfilment</SectionLabel>
        {options.map(option => <FulfilmentOption key={option.mode} active={mode === option.mode} onClick={() => onMode(option.mode)} title={option.mode} detail={detail[option.mode]} price={option.charge ? formatEtb(option.charge) : 'No delivery fee'} />)}
        {mode === 'Courier Delivery' && courier && (
          <div className="mt-2 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">
            The {formatEtb(courier.charge)} Courier Delivery fee is shown now and is separate from the Adulis surcharge.
          </div>
        )}
        {/* Buyer Collection isn't a delivery, so it shows no delivery address (WO-006 pre-commit correction 2). */}
        {mode !== 'Buyer Collection' && (
          <>
            <SectionLabel>Delivery details</SectionLabel>
            <div className="rounded-xl border border-border p-3 text-sm">
              <div className="font-semibold">{buyer.name}</div>
              <div className="mt-1 text-text-secondary">{buyer.deliveryArea ?? '—'}, {MARKET.city} · {buyer.phoneMasked ?? '—'}</div>
              <div className="mt-2 text-xs font-semibold text-text-muted">Saved delivery details</div>
            </div>
          </>
        )}
        <SectionLabel>Payment breakdown</SectionLabel>
        <div className="rounded-xl bg-surface-raised p-4">
          <PriceRow label="Products" value={formatEtb(totals.products)} />
          <PriceRow label={mode} value={formatEtb(totals.delivery)} />
          <PriceRow label={SURCHARGE_LABEL} value={formatEtb(totals.surcharge)} />
          <div className="mt-3 border-t border-border pt-3"><PriceRow label="Total" value={formatEtb(totals.total)} strong /></div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">Payment status is established by the payment provider and Adulis backend. The seller does not confirm payment.</p>
      </div>
      <div className="border-t border-border bg-surface p-4 pb-6">
        {note
          ? <div className="rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary"><span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Prototype</span>{note}</div>
          : <Button size="lg" onClick={onPay} style={{ width: '100%' }}>Continue to payment · {formatEtb(totals.total)}</Button>}
      </div>
    </>
  )
}

function FulfilmentOption({ active, onClick, title, detail, price }: {
  active: boolean; onClick: () => void; title: string; detail: string; price: string
}) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left ${active ? 'border-brand bg-brand-muted' : 'border-border bg-surface'}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-brand' : 'border-border-strong'}`}>{active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}</span>
      <span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="text-xs text-text-muted">{detail}</span></span>
      <span className="text-xs font-semibold">{price}</span>
    </button>
  )
}

function PaymentTransition({ seller, amount, retrying, onBack, onContinue }: {
  seller: SellerId; amount: number
  /** The Seller Order whose payment failed: opening secure payment adds its next attempt (rule 5.9). */
  retrying?: CheckoutOrder
  onBack: () => void; onContinue: () => void
}) {
  return (
    <>
      <Header title="Secure payment" onBack={onBack} />
      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-info-bg text-info"><LockIcon /></span>
        <div className="mt-5 font-display text-2xl font-semibold">Continue with payment provider</div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">You’ll complete payment on the provider’s secure page, then return to Adulis for confirmation.</p>
        <div className="mt-6 w-full rounded-xl bg-surface-raised p-4 text-left">
          <PriceRow label="Paying" value={SELLERS[seller].name} />
          {retrying && <PriceRow label="Seller Order" value={retrying.ref} />}
          <PriceRow label="Seller Order total" value={formatEtb(amount)} strong />
        </div>
        {retrying && <div className="mt-3 text-xs text-text-secondary">This retry is payment attempt {retrying.attempts.length + 1} for the same Seller Order.</div>}
        <div className="mt-4 text-xs text-text-muted">Adulis does not ask for payment screenshots. Payment truth comes from the provider and backend.</div>
      </div>
      <div className="p-4 pb-6"><Button size="lg" onClick={onContinue} style={{ width: '100%' }}>Open secure payment</Button></div>
    </>
  )
}

function PaymentProcessing({ order, source, outcome, onOutcome, onChecking }: {
  order: CheckoutOrder
  /** Where the attempt's deterministic outcome comes from: the demo data, or the test run. */
  source: string
  outcome: 'Paid' | 'Failed'; onOutcome: () => void; onChecking: () => void
}) {
  const attempt = order.attempts[order.attempts.length - 1]
  return (
    <PaymentStateShell
      tone="info"
      title="Processing payment"
      description="The payment provider is processing your payment. Keep this screen open and do not pay again."
    >
      <div className="w-full rounded-xl bg-surface-raised p-4 text-left"><PriceRow label="Seller" value={SELLERS[order.seller].name} /><PriceRow label="Seller Order" value={order.ref} /><PriceRow label="Payment attempt" value={attempt.ref} /><PriceRow label="Amount" value={formatEtb(order.totals.total)} strong /></div>
      <div className="mt-8 w-full border-t border-border pt-4">
        <div className="mb-2 text-xs font-semibold text-text-muted">Prototype payment outcome</div>
        <p className="mb-2 text-xs leading-relaxed text-text-muted">{source}: {attempt.ref} {outcome === 'Paid' ? 'succeeds' : 'fails'}.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onOutcome}>{outcome}</Button>
          <Button size="sm" variant="tertiary" onClick={onChecking}>Checking</Button>
        </div>
      </div>
    </PaymentStateShell>
  )
}

function PaymentSuccess({ order, progress, next, onNext, onDone }: {
  order: CheckoutOrder
  /** The coordinated checkout's Seller Orders, when it covers more than one (WO-006 requirement 19). */
  progress: readonly ProgressEntry[]
  /** The next Seller cart to check out, if any. */
  next?: string
  onNext: () => void; onDone: () => void
}) {
  const paid = order.attempts[order.attempts.length - 1]
  return (
    <PaymentStateShell tone="success" title="Payment confirmed" description="The provider confirmed your payment. Your Seller Order is now Paid.">
      <div className="w-full rounded-2xl border border-success/20 bg-success-bg p-4 text-left">
        <div className="text-xs font-semibold uppercase tracking-wider text-success">Seller Order confirmed</div>
        <div className="mt-2 font-display text-xl font-semibold">{SELLERS[order.seller].name}</div>
        <div className="mt-1 text-sm text-text-secondary">Order {order.ref} · Paid</div>
        {order.test && <div className="mt-1 text-xs text-text-muted">Prototype test Order · not a production ID</div>}
        <div className="mt-4 border-t border-success/20 pt-3"><PriceRow label="Payment attempt" value={paid.ref} /><PriceRow label="Paid total" value={formatEtb(order.totals.total)} strong /></div>
      </div>
      {progress.length > 1 && <CheckoutProgress entries={progress} className="mt-4" />}
      {next
        ? <div className="mt-6 flex w-full flex-col gap-2">
            <Button size="lg" onClick={onNext}>Continue with {next}</Button>
            <Button size="lg" variant="tertiary" onClick={onDone}>Done</Button>
          </div>
        : <Button size="lg" onClick={onDone} style={{ width: '100%', marginTop: 24 }}>Done</Button>}
    </PaymentStateShell>
  )
}

function PaymentFailed({ order, progress, onRetry, onCart }: { order: CheckoutOrder; progress: readonly ProgressEntry[]; onRetry: () => void; onCart: () => void }) {
  // The failed attempt belongs to its Seller Order, which isn't paid yet: a retry is its next attempt (rule 5.9).
  const failed = order.attempts[order.attempts.length - 1]
  const entry = progress.length > 1 ? progress.find(item => item.order?.ref === order.ref) : undefined
  return (
    <PaymentStateShell tone="danger" title="Payment failed" description={`The provider could not complete this payment. Seller Order ${order.ref} is not paid yet, and a retry stays on the same Seller Order.`}>
      <div role="alert" className="w-full rounded-xl bg-danger-bg p-4 text-left text-sm text-danger">Payment attempt {failed.ref} failed. No charge was confirmed by the payment provider.</div>
      {entry && <CheckoutProgress entries={progress} className="mt-4" />}
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button size="lg" onClick={onRetry}>{entry ? `Retry Order ${entry.number}` : 'Retry payment'}</Button>
        <Button size="lg" variant="tertiary" onClick={onCart}>Return to {SELLERS[order.seller].name} cart</Button>
      </div>
    </PaymentStateShell>
  )
}

/**
 * A coordinated checkout's progress (WO-006 requirements 19–20): each Seller Order with its own state, in words as well
 * as colour. The count is coordination only, never one cross-Seller Order's state.
 */
function CheckoutProgress({ entries, className = '' }: { entries: readonly ProgressEntry[]; className?: string }) {
  const paid = entries.filter(entry => orderStatus(entry.order) === 'PAID').length
  const tone: Record<OrderStatus, string> = { PAID: 'text-success', 'PAYMENT FAILED': 'text-danger', 'NOT YET PAID': 'text-text-muted' }
  const mark: Record<OrderStatus, string> = { PAID: '✓', 'PAYMENT FAILED': '×', 'NOT YET PAID': '○' }
  return (
    <div className={`w-full rounded-xl border border-border bg-surface p-3 text-left ${className}`}>
      <div role="status" className="text-sm font-semibold text-text-primary">{paid === entries.length ? 'Your orders are confirmed' : `${paid} of ${entries.length} orders paid`}</div>
      <ul className="mt-2 flex flex-col gap-2">
        {entries.map(entry => {
          const status = orderStatus(entry.order)
          return (
            <li key={entry.number} className="flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0">
                <span className="block font-semibold text-text-primary">Order {entry.number} · {SELLERS[entry.seller].name}</span>
                {entry.order && <span className="block font-mono text-[10px] text-text-muted">{entry.order.ref}</span>}
              </span>
              <span className={`whitespace-nowrap text-right font-bold ${tone[status]}`}>
                <span aria-hidden="true">{mark[status]} </span>{status}
                {status === 'PAID' && entry.order && <span className="block font-normal text-text-muted">{formatEtb(entry.order.totals.total)}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function PaymentChecking({ onRefresh, onDone }: { onRefresh: () => void; onDone: () => void }) {
  return (
    <PaymentStateShell tone="warning" title="Checking payment" description="The provider response is delayed. Adulis is reconciling with the provider before your Seller Order's payment is confirmed.">
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
  // Centred while it fits; once a coordinated checkout's progress makes it taller than the phone, it starts at the top
  // and scrolls, so nothing above the fold is cut off.
  return (
    <div className="flex flex-1 flex-col items-center justify-center-safe overflow-y-auto px-6 py-8 text-center">
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
  return <div className="mb-2 mt-4 flex items-center justify-between"><span className="font-display text-lg font-semibold">{title}</span><span className="text-xs text-text-muted">{count} result{count === '1' ? '' : 's'}</span></div>
}

function ProductRow({ productId, onClick }: { productId: ProductId; onClick: () => void }) {
  const product = PRODUCTS[productId]
  return <button onClick={onClick} className="flex w-full gap-3 rounded-xl bg-surface-raised p-2 text-left"><Placeholder label={product.name} className="h-20 w-20 rounded-lg" /><span className="flex-1 py-1"><span className="block text-sm font-semibold">{product.name}</span><span className="block text-xs text-text-muted">{SELLERS[product.seller].name}</span><span className="mt-2 block text-sm font-bold text-brand"><InlinePrice productId={productId} /></span></span></button>
}

function PostRow({ postId, onClick }: { postId: ShoppablePostId; onClick: () => void }) {
  const post = SHOPPABLE_POSTS[postId]
  return <button onClick={onClick} className="flex w-full gap-3 rounded-xl bg-surface-raised p-2 text-left"><Placeholder label={post.title} className="h-20 w-20 rounded-lg" /><span className="py-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-brand">Shoppable post</span><span className="mt-1 block text-sm font-semibold">{post.title}</span><span className="text-xs text-text-muted">{SELLERS[post.seller].name} · {post.tags.length} product{post.tags.length === 1 ? '' : 's'}</span></span></button>
}

function SellerRow({ sellerId, at, onClick }: { sellerId: SellerId; at: Moment; onClick: () => void }) {
  const seller = SELLERS[sellerId]
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl bg-surface-raised p-3 text-left"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted font-bold text-brand-dark">{initials(seller.name)}</span><span className="flex-1"><span className="block text-sm font-semibold">{seller.name}</span><span className="text-xs text-text-muted">{seller.category} · {trustLabel(trustAt(sellerId, at))}</span></span><span className="text-xs font-semibold text-brand">View</span></button>
}

function ProductCard({ name, price, onClick }: { name: string; price: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="overflow-hidden rounded-xl bg-surface text-left"><Placeholder label={name} className="h-44 w-full rounded-xl text-2xl" /><span className="mt-2 block text-xs font-semibold leading-snug">{name}</span><span className="mt-1 block text-xs font-bold text-brand">{price}</span></button>
}

function PostTile({ title, label, onClick }: { title: string; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="relative overflow-hidden rounded-xl text-left"><Placeholder label={`Shoppable post: ${title}`} initialsOf={title} className="h-52 w-full text-2xl" /><span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white"><TagIcon /> <span className="ml-1">{label}</span></span></button>
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-b border-border py-5"><div className="mb-2 font-display text-lg font-semibold">{title}</div><div className="text-sm leading-relaxed text-text-secondary">{children}</div></div>
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted">{children}</div>
}

function Choice({ children, active, pressed, onClick }: { children: ReactNode; active?: boolean; pressed?: boolean; onClick?: () => void }) {
  return <button onClick={onClick} aria-pressed={pressed} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{children}</button>
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
