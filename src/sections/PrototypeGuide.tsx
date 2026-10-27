import { useState } from 'react'
import { AdulisLogo } from '../App'
import { BUYERS, CANONICAL_FLOW_STAGES, COURIERS, DEMO_CARTS, GUEST_STATE, ORDERS, ORDER_TIMELINES, SELLERS, SURFACE_DEFAULTS, buyerVisibleSellers, firstName, paymentAttempts, stageFor } from '../demo-data'

// Demo personas and record names are read from the canonical module (WO-001).
const BUYER_NAME = BUYERS[SURFACE_DEFAULTS.buyer].name
const SELLER_NAME = SELLERS[SURFACE_DEFAULTS.seller].name
const COURIER_NAME = COURIERS[SURFACE_DEFAULTS.courier].name
const [CART_SELLER, SECOND_CART_SELLER] = DEMO_CARTS.map(order => SELLERS[ORDERS[order].seller].name)
// Flow D's two Seller Orders, and the second one's failed attempt and its retry (DEMO_DATA › Seller Orders).
const [CART_ORDER, SECOND_CART_ORDER] = DEMO_CARTS
const [FAILED_ATTEMPT, RETRY_ATTEMPT] = paymentAttempts(SECOND_CART_ORDER).map(attempt => attempt.ref)
// Flow M's Buyer, who collects the Buyer Collection Order and scans its final QR (WO-006A).
const COLLECTOR = firstName(BUYERS[ORDERS[stageFor('M', 0).focus!.order!].buyer].name)
// The canonical demo flows, A–M (DEMO_DATA › Demo flows and the records they use). The Master Demo and the auxiliary E2
// run are presentation paths, not among them.
const CANONICAL_FLOWS = Object.keys(CANONICAL_FLOW_STAGES)

// The Guide's categorical colours (actors, objects, flows, roles). The brand and ink entries follow Theme Lab; as text in
// Dark mode every one is lifted toward the text colour so it reads (unchanged in Light: the lift is 0%).
const categoryText = (color: string) => (color === 'var(--color-brand)' ? 'var(--color-brand-text)' : color === 'var(--color-ink)' ? 'var(--color-text-primary)' : `color-mix(in srgb, ${color}, var(--color-text-primary) var(--adulis-dark-lift))`)
const onCategory = (color: string) => (color === 'var(--color-brand)' ? 'var(--color-on-brand)' : '#fff')

/* ═══════════════════════════════════════════════
   00 — PROTOTYPE GUIDE
   Adulis Commerce Platform Ecosystem
═══════════════════════════════════════════════ */

interface PrototypeGuideProps {
  onNavigate?: (section: string) => void
}

export default function PrototypeGuide({ onNavigate }: PrototypeGuideProps) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
      <GuideHeader />
      <div className="max-w-6xl mx-auto px-8 pb-24 space-y-16">
        <EcosystemMap />
        <PrimaryActors />
        <CanonicalObjects />
        <CommerceJourney />
        <DemoFlowsList />
        <RoleLauncher onNavigate={onNavigate} />
      </div>
    </div>
  )
}

/* ─── Guide Header ─── */

function GuideHeader() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1A1512 0%, #2E1F15 50%, #3D2A1A 100%)',
        paddingTop: 64,
        paddingBottom: 64,
        marginBottom: 64,
      }}
    >
      {/* Decorative grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }}
      />
      <div className="max-w-6xl mx-auto px-8 relative">
        <div className="flex items-center gap-4 mb-8">
          <AdulisLogo size={48} />
          <div>
            <div
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--adulis-accent-on-dark)', letterSpacing: '0.12em', marginBottom: 4 }}
            >
              ADULIS MASTER PROTOTYPE
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 36,
                fontWeight: 600,
                color: '#FAF8F5',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Adulis
            </h1>
          </div>
        </div>
        <p style={{ color: '#C8BDB5', fontSize: 16, maxWidth: 640, lineHeight: 1.65, margin: '0 0 32px' }}>
          A commerce platform ecosystem connecting buyers, sellers, and couriers through structured
          product discovery, verified fulfilment, and trust-based commerce. This prototype demonstrates
          seven product surfaces and {CANONICAL_FLOWS.length} end-to-end demo flows.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            'Company Website',
            'Seller Storefront',
            'Mobile — Buyer',
            'Mobile — Seller Companion',
            'Mobile — Courier',
            'Seller Console',
            'Operator Console',
          ].map(s => (
            <span
              key={s}
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(194, 98, 45, 0.2)', color: 'var(--adulis-accent-on-dark)', border: '1px solid rgba(194, 98, 45, 0.3)' }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Section wrapper ─── */

function GuideSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-4 mb-8">
        <span
          className="flex-shrink-0 flex items-center justify-center rounded-lg font-mono text-xs font-semibold"
          style={{
            width: 36,
            height: 36,
            background: 'var(--color-brand)',
            color: 'var(--color-on-brand)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {number}
        </span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/* ═══════════════════════════════════════════════
   1. ECOSYSTEM MAP
═══════════════════════════════════════════════ */

const SURFACES = [
  {
    id: 'website',
    label: 'Company Website',
    icon: '🌐',
    color: '#2D5CC2',
    bg: '#EBF0FC',
    desc: 'Public discovery, seller acquisition, trust education, and market information.',
    actors: ['Anonymous visitor', 'Seller prospect', 'Investor'],
  },
  {
    id: 'storefront',
    label: 'Seller Storefront',
    icon: '🏪',
    color: '#2D7A4F',
    bg: '#EAF5EE',
    desc: 'Public seller-scoped page. Products, posts, reviews, and about. Social bio link destination.',
    actors: ['Anonymous visitor', 'Buyer'],
  },
  {
    id: 'buyer',
    label: 'Mobile — Buyer',
    icon: '📱',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-muted)',
    desc: 'For You discovery, search, cart, checkout, orders, handoff, reviews, and claims.',
    actors: ['Buyer', 'Delegated Recipient'],
  },
  {
    id: 'companion',
    label: 'Mobile — Seller Companion',
    icon: '🔔',
    color: '#B87C20',
    bg: '#FDF3E1',
    desc: 'Lightweight operational alerts, order management, courier assignment, and inbox.',
    actors: ['Seller Owner', 'Seller Team Member'],
  },
  {
    id: 'courier',
    label: 'Mobile — Courier',
    icon: '🚴',
    color: '#5B3FAF',
    bg: '#F0ECFA',
    desc: 'Delivery offers, assignments, pickup QR scan, delivery QR display, and history.',
    actors: ['Courier'],
  },
  {
    id: 'seller-console',
    label: 'Seller Console',
    icon: '⚙️',
    color: 'var(--color-ink)',
    bg: '#F5F2ED',
    desc: 'Full seller administration: products, content, orders, inbox, insights, store, automation, and settings.',
    actors: ['Seller Owner', 'Seller Team Member'],
  },
  {
    id: 'operator',
    label: 'Operator Console',
    icon: '🔒',
    color: '#C2372D',
    bg: '#FDECEA',
    desc: 'Privileged control plane: support, moderation, claims, trust appeals, handoff review, and governance.',
    actors: ['Operator', 'Founder'],
  },
]

const CONNECTIONS = [
  { from: 'website', to: 'storefront', label: 'Public link / SEO' },
  { from: 'website', to: 'buyer', label: 'Download app' },
  { from: 'storefront', to: 'buyer', label: 'Open in Adulis' },
  { from: 'buyer', to: 'companion', label: 'Paid order → alert' },
  { from: 'buyer', to: 'courier', label: 'Order → delivery offer' },
  { from: 'companion', to: 'seller-console', label: 'Open full console' },
  { from: 'seller-console', to: 'companion', label: 'Mobile operations' },
  { from: 'operator', to: 'buyer', label: 'Claim resolution' },
  { from: 'operator', to: 'seller-console', label: 'Moderation / trust' },
]

function EcosystemMap() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <GuideSection number="1" title="Adulis Product Ecosystem Map">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
        {SURFACES.map(s => (
          <div
            key={s.id}
            className="rounded-xl p-5 border cursor-pointer transition-all"
            style={{
              background: hovered === s.id ? s.bg : 'var(--color-surface)',
              borderColor: hovered === s.id ? s.color : 'var(--color-border)',
              boxShadow: hovered === s.id ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              transform: hovered === s.id ? 'translateY(-2px)' : 'none',
            }}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-start gap-3 mb-3">
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div className="font-semibold text-sm" style={{ color: categoryText(s.color) }}>{s.label}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {s.actors.join(' · ')}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Connection legend */}
      <div
        className="mt-6 rounded-xl p-5 border"
        style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="font-semibold mb-4 text-xs uppercase tracking-widest"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          Cross-Surface Relationships
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}>
          {CONNECTIONS.map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-medium text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {SURFACES.find(s => s.id === c.from)?.icon}
              </span>
              <span style={{ color: 'var(--color-border-strong)' }}>→</span>
              <span className="font-medium text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {SURFACES.find(s => s.id === c.to)?.icon}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </GuideSection>
  )
}

/* ═══════════════════════════════════════════════
   2. PRIMARY ACTORS
═══════════════════════════════════════════════ */

const ACTORS = [
  {
    name: 'Buyer',
    emoji: '🛍️',
    demo: BUYER_NAME,
    description: 'Discovers products through Shoppable Posts and the For You Page. Adds to cart, checks out via gateway payment, receives deliveries, reviews, and raises claims. The primary consumer of the Adulis mobile experience.',
    surfaces: ['Mobile — Buyer'],
    permissions: ['Browse', 'Cart & Checkout', 'Order management', 'Review', 'Claim', 'Chat'],
  },
  {
    name: 'Seller Owner',
    emoji: '🏷️',
    demo: buyerVisibleSellers().map(id => SELLERS[id].name).join(' / '),
    description: 'Creates and manages product posts and shoppable content. Administers orders, fulfilment, couriers, insights, and store settings via Seller Console. Handles urgent operations via the Seller Companion mobile app.',
    surfaces: ['Seller Console', 'Mobile — Seller Companion', 'Seller Storefront'],
    permissions: ['Full console access', 'Product publishing', 'Order management', 'Courier pool', 'Insights', 'Settings'],
  },
  {
    name: 'Seller Team Member',
    emoji: '👤',
    demo: `Staff at ${SELLER_NAME}`,
    description: 'Operates within the seller context under defined role permissions. May handle orders, inbox, content or operations depending on assigned permissions. Uses individual credentials — no shared passwords.',
    surfaces: ['Seller Console', 'Mobile — Seller Companion'],
    permissions: ['Role-scoped access', 'Individual credentials'],
  },
  {
    name: 'Courier',
    emoji: '🚴',
    demo: COURIER_NAME,
    description: 'An approved operational actor who delivers orders on behalf of sellers. Accepts delivery offers, scans seller pickup QR, displays delivery QR to buyer, and collects one-checkpoint location evidence. May be in multiple seller pools.',
    surfaces: ['Mobile — Courier'],
    permissions: ['Delivery offers', 'Pickup verification', 'Delivery verification', 'History'],
  },
  {
    name: 'Operator',
    emoji: '🔒',
    demo: 'CEO / COO / CTO',
    description: 'Privileged platform actor with access to the Operator Console. Handles support cases, moderation, claim resolution, verification and recovery, trust appeals, and governance. All actions are audited.',
    surfaces: ['Operator Console'],
    permissions: ['Support', 'Moderation', 'Claims', 'Trust appeals', 'Governance', 'Audit'],
  },
  {
    name: 'Delegated Recipient',
    emoji: '🤝',
    demo: `Authorized by ${BUYER_NAME}`,
    description: 'A person authorized by the buyer to receive a specific order. Can scan the courier delivery QR to verify handoff. Does not gain order ownership, refund rights, claim ownership, review rights, or payment information.',
    surfaces: ['Mobile — Buyer (limited)'],
    permissions: ['Receive delivery on behalf of buyer'],
  },
]

function PrimaryActors() {
  return (
    <GuideSection number="2" title="Primary Actors">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
        {ACTORS.map(a => (
          <div
            key={a.name}
            className="rounded-xl p-5 border"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl flex-shrink-0">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{a.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Demo: {a.demo}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
              {a.description}
            </p>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {a.surfaces.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'var(--color-brand-muted)', color: 'var(--color-brand-dark)' }}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {a.permissions.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GuideSection>
  )
}

/* ═══════════════════════════════════════════════
   3. CANONICAL OBJECTS
═══════════════════════════════════════════════ */

const OBJECTS = [
  {
    name: 'Product Post',
    color: '#2D5CC2',
    bg: '#EBF0FC',
    icon: '📦',
    definition: 'Represents exactly ONE sellable product. The canonical commerce object.',
    fields: ['Product name', 'Images (gallery)', 'Variants', 'Current price', 'Availability', 'Seller', 'Trust info', 'Description', 'Structured attributes', 'Fulfilment info', 'Reviews', 'Add to Cart'],
    rules: ['One product only — never a collection', 'Owns price and stock', 'Variants belong here', 'FYP eligibility: NEVER as standalone feed item'],
  },
  {
    name: 'Shoppable Post',
    color: '#2D7A4F',
    bg: '#EAF5EE',
    icon: '✨',
    definition: 'Creative merchandising/discovery content. May tag 0..N same-seller Product Posts.',
    fields: ['Primary image(s)', 'Caption', 'Seller', 'Product tags (optional)', 'Hotspots (optional)', 'Publication state'],
    rules: ['May publish with zero product tags', 'Zero-tag post: NOT FYP eligible', 'Does not own price or stock', 'Cross-seller product tags: NOT SUPPORTED in MVP', 'A Lifestyle Scene is a presentation pattern of a Shoppable Post — not a separate entity'],
  },
  {
    name: 'Seller',
    color: '#B87C20',
    bg: '#FDF3E1',
    icon: '🏷️',
    definition: 'A verified business entity operating on Adulis. Has a public Storefront.',
    fields: ['Handle', 'Display name', 'Category', 'Trust Level', 'Location', 'Availability', 'Fulfilment options', 'Courier Pool'],
    rules: ['Trust: NEW / REBUILDING / ESTABLISHED / TRUSTED', 'Trust is read-only — cannot be purchased or manually typed', 'Admission via social-commerce presence — NO government ID'],
  },
  {
    name: 'Cart',
    color: 'var(--color-brand)',
    bg: 'var(--color-brand-muted)',
    icon: '🛒',
    definition: 'A buyer holds separate carts per seller. Multi-seller checkout coordinates multiple carts.',
    fields: ['Seller', 'Cart items', 'Quantities', 'Variants', 'Subtotal', 'Fulfilment option'],
    rules: ['Never cross-seller in a single Order', 'Each seller cart = one Seller Order at checkout', 'UI must never imply one cross-seller order'],
  },
  {
    name: 'Checkout',
    color: '#5B3FAF',
    bg: '#F0ECFA',
    icon: '💳',
    definition: 'Gateway-mediated payment flow. Buyer-side 0.5% Adulis surcharge applies.',
    fields: ['Products subtotal', 'Courier Delivery charge (separate)', 'Adulis surcharge 0.5%', 'Total', 'Fulfilment selection', 'Gateway redirect'],
    rules: ['Backend/provider establishes PAID — never seller', 'Surcharge calculated on products only — not delivery', 'Courier charge shown before payment'],
  },
  {
    name: 'Seller Order',
    color: 'var(--color-ink)',
    bg: '#F5F2ED',
    icon: '📋',
    definition: 'A paid order from a single seller. Created after successful payment verification.',
    fields: ['Order reference (ADU-XXXXX)', 'Status', 'Buyer-safe identity', 'Products snapshot', 'Payment summary', 'Fulfilment', 'Courier', 'Timeline'],
    // Each fulfilment mode's timeline, with the Order states' canonical names (rules 4.4–4.6).
    rules: ['Reference format: ADU-XXXXX (never internal UUID)', 'PAID established by backend only', 'Seller cannot confirm/accept payment', ...Object.entries(ORDER_TIMELINES).map(([mode, states]) => `${mode}: ${states.join(' → ')}`)],
  },
  {
    name: 'Courier Assignment',
    color: '#5B3FAF',
    bg: '#F0ECFA',
    icon: '🚴',
    definition: 'A delivery offer from seller to an approved courier in their pool.',
    fields: ['Order reference', 'Seller', 'Compensation (shown before acceptance)', 'Status', 'Pickup QR', 'Delivery QR'],
    rules: ['Courier must see compensation BEFORE accepting', 'MVP: one active delivery at a time per courier', 'No bidding marketplace', 'No route optimization', 'No Courier wallet'],
  },
  {
    name: 'Handoff',
    color: '#2D7A4F',
    bg: '#EAF5EE',
    icon: '🤝',
    definition: 'Physical verification event. Two types: Pickup (seller→courier) and Delivery (courier→buyer).',
    fields: ['Type (Pickup / Delivery)', 'QR code', 'Timestamp', 'Location checkpoint (best-effort)', 'Verification state'],
    rules: ['PICKUP: Seller displays QR → Courier scans', 'DELIVERY: Courier displays QR → Buyer/delegate scans', 'Location checkpoint is evidence only — not proof', 'Location failure does NOT reverse successful QR verification', 'OTP is fallback (not primary)', 'Manual verification is OPERATOR emergency only'],
  },
  {
    name: 'Review',
    color: '#C2622D',
    bg: '#F0DDD1',
    icon: '⭐',
    definition: 'Post-delivery buyer rating. Requires verified final handoff. Two separate ratings.',
    fields: ['Seller Service rating (1–5)', 'Product Quality rating (1–5, per product)', 'Optional review text'],
    rules: ['Requires verified Delivery Handoff', 'Two separate ratings — never combined', 'Review ownership: buyer only — delegated recipient cannot review', 'No open product comments'],
  },
  {
    name: 'Claim',
    color: '#C2372D',
    bg: '#FDECEA',
    icon: '⚠️',
    definition: 'A buyer-initiated dispute against a completed or in-progress order.',
    fields: ['Issue type', 'Description', 'Evidence (allowed types)', 'Status', 'Operator decision'],
    rules: ['Statuses: Open → Evidence Required → Under Review → Resolved', 'Buyer cannot modify payment, order state, or Trust', 'Operator resolves according to governance', 'Operator cannot manually mark unpaid order as Paid'],
  },
  {
    name: 'Trust',
    color: '#5B3FAF',
    bg: '#F0ECFA',
    icon: '🛡️',
    definition: 'A seller reputation level computed from factual evidence. Strictly read-only.',
    fields: ['Level: NEW / REBUILDING / ESTABLISHED / TRUSTED', 'Evidence summary', 'History'],
    rules: ['Cannot be purchased', 'Cannot be purchased with ads or subscriptions', 'Seller cannot edit directly', 'Operator cannot type a level manually', 'Trust appeals handled via governance process'],
  },
]

function CanonicalObjects() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <GuideSection number="3" title="Canonical Objects">
      <div className="grid gap-3">
        {OBJECTS.map(obj => {
          const isExpanded = expanded === obj.name
          return (
            <div
              key={obj.name}
              className="rounded-xl border overflow-hidden"
              style={{
                background: 'var(--color-surface)',
                borderColor: isExpanded ? obj.color : 'var(--color-border)',
                boxShadow: isExpanded ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              }}
            >
              <button
                className="w-full flex items-start gap-4 p-5 text-left transition-colors"
                style={{ background: isExpanded ? obj.bg : 'transparent' }}
                onClick={() => setExpanded(isExpanded ? null : obj.name)}
              >
                <span className="flex-shrink-0 text-xl mt-0.5">{obj.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm" style={{ color: categoryText(obj.color) }}>{obj.name}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                    {obj.definition}
                  </p>
                </div>
              </button>
              {isExpanded && (
                <div className="px-5 pb-5 grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Key Fields
                    </div>
                    <ul className="space-y-1">
                      {obj.fields.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: categoryText(obj.color) }}>·</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Product Rules
                    </div>
                    <ul className="space-y-1">
                      {obj.rules.map(r => (
                        <li key={r} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          <span className="flex-shrink-0 mt-0.5" style={{ color: '#C2372D' }}>!</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </GuideSection>
  )
}

/* ═══════════════════════════════════════════════
   4. HIGH-LEVEL COMMERCE JOURNEY
═══════════════════════════════════════════════ */

const JOURNEY_STEPS = [
  {
    step: 1,
    label: 'Discovery',
    detail: 'Buyer browses the For You Page (Shoppable Posts only) or uses Search',
    actors: ['Buyer'],
    surface: 'Mobile — Buyer',
    color: '#2D5CC2',
  },
  {
    step: 2,
    label: 'Product',
    detail: 'Buyer taps a product hotspot → lightweight preview → full Product Post Detail',
    actors: ['Buyer'],
    surface: 'Mobile — Buyer',
    color: '#2D7A4F',
  },
  {
    step: 3,
    label: 'Cart',
    detail: 'Buyer selects variant, quantity → Add to Cart. Multiple sellers = multiple carts',
    actors: ['Buyer'],
    surface: 'Mobile — Buyer',
    color: 'var(--color-brand)',
  },
  {
    step: 4,
    label: 'Checkout',
    detail: 'Buyer reviews products + courier delivery charge + Adulis 0.5% surcharge → Proceed to Payment',
    actors: ['Buyer'],
    surface: 'Mobile — Buyer',
    color: '#B87C20',
  },
  {
    step: 5,
    label: 'Provider Payment',
    detail: 'Gateway payment provider processes transaction. Backend verifies. PAID state established.',
    actors: ['Buyer', 'PSP'],
    surface: 'Gateway / Backend',
    color: '#5B3FAF',
  },
  {
    step: 6,
    label: 'Paid Seller Order',
    detail: 'Seller receives PAID order notification. Seller never confirms or accepts payment.',
    actors: ['Seller'],
    surface: 'Seller Console / Seller Companion',
    color: '#1A1512',
  },
  {
    step: 7,
    label: 'Fulfilment',
    detail: 'Seller prepares the order → marks it Ready for Courier → sends a Delivery Offer to an approved Courier from their pool → the Courier accepts the Delivery Offer → Courier Assigned',
    actors: ['Seller', 'Seller Team', 'Courier'],
    surface: 'Seller Console / Seller Companion',
    color: '#2D7A4F',
  },
  {
    step: 8,
    label: 'Pickup',
    detail: 'Courier arrives. Seller displays Pickup QR → Courier scans → Pickup Verified. Location checkpoint attempted.',
    actors: ['Seller', 'Courier'],
    surface: 'Seller Companion + Courier Mobile',
    color: 'var(--color-brand)',
  },
  {
    step: 9,
    label: 'Delivery',
    detail: 'Courier travels to buyer. No continuous GPS. Delivery checkpoint location is attempted at final handoff.',
    actors: ['Courier'],
    surface: 'Mobile — Courier',
    color: '#B87C20',
  },
  {
    step: 10,
    label: 'Handoff',
    detail: 'Courier displays Delivery QR → Buyer/delegate scans → server verifies → Delivery Verified. OTP is fallback.',
    actors: ['Courier', 'Buyer', 'Delegated Recipient'],
    surface: 'Courier Mobile + Buyer Mobile',
    color: '#5B3FAF',
  },
  {
    step: 11,
    label: 'Review / Claim',
    detail: 'Verified delivery unlocks Review (Seller Service + Product Quality rated separately). Problem → Claim flow.',
    actors: ['Buyer'],
    surface: 'Mobile — Buyer',
    color: '#C2622D',
  },
  {
    step: 12,
    label: 'Trust & Operations',
    detail: 'Factual evidence updates seller Trust. Operator handles claims, moderation, and governance.',
    actors: ['Operator'],
    surface: 'Operator Console',
    color: '#C2372D',
  },
]

function CommerceJourney() {
  return (
    <GuideSection number="4" title="High-Level Commerce Journey">
      <div className="relative">
        {/* Timeline spine */}
        <div
          className="absolute top-8 left-8 bottom-8 w-px"
          style={{ background: 'var(--color-border)' }}
        />
        <div className="space-y-3 pl-2">
          {JOURNEY_STEPS.map((step, i) => (
            <div key={step.step} className="flex items-start gap-5">
              {/* Step number */}
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full font-mono text-xs font-semibold z-10"
                style={{
                  width: 32,
                  height: 32,
                  background: step.color,
                  color: onCategory(step.color),
                  fontFamily: 'var(--font-mono)',
                  border: '3px solid var(--color-background)',
                }}
              >
                {step.step}
              </div>
              {/* Content */}
              <div
                className="flex-1 rounded-xl p-4 border mb-0"
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-xs)',
                  marginBottom: i < JOURNEY_STEPS.length - 1 ? 0 : 0,
                }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-sm" style={{ color: categoryText(step.color) }}>{step.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {step.surface}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{step.detail}</p>
                <div className="flex gap-1 mt-2">
                  {step.actors.map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GuideSection>
  )
}

/* ═══════════════════════════════════════════════
   5. PROTOTYPE DEMO FLOWS
═══════════════════════════════════════════════ */

const DEMO_FLOWS = [
  {
    id: 'A',
    label: 'Seller Acquisition',
    path: 'Company Website → For Sellers → How It Works → Seller Waitlist → Success',
    screens: 5,
    color: '#2D5CC2',
  },
  {
    id: 'B',
    label: 'Social Entry',
    path: `External social link → ${SELLER_NAME} Storefront → Product → Open in Adulis → Native Product Detail`,
    screens: 5,
    color: '#2D7A4F',
  },
  {
    id: 'C',
    label: 'Discovery to Purchase',
    path: 'For You → Shoppable Post → Product hotspot → Product Detail → Variant → Add to Cart → Checkout → Courier Delivery → Price breakdown → Payment → Paid Order',
    screens: 11,
    color: 'var(--color-brand)',
  },
  {
    id: 'D',
    label: 'Multi-Seller Cart',
    path: `Add Product from ${CART_SELLER} + Product from ${SECOND_CART_SELLER} → Two seller carts → Checkout ${CART_SELLER} on its own: ${CART_ORDER} Paid → Checkout ${SECOND_CART_SELLER}, a separate Seller Order: ${SECOND_CART_ORDER} → ${FAILED_ATTEMPT} fails → Retry: payment attempt 2 on the same ${SECOND_CART_ORDER} → ${RETRY_ATTEMPT} Paid → ${CART_ORDER} stays Paid, never rolled back`,
    screens: 9,
    color: '#B87C20',
  },
  {
    id: 'E',
    label: 'Seller Publishing',
    path: 'Seller Console → Products → Create Product Post → Publish → Content → Create Shoppable Post → Tag Product → Add hotspot → Preview → Publish. Also: publish with zero products → Not FYP eligible status.',
    screens: 12,
    color: '#5B3FAF',
  },
  {
    id: 'F',
    label: 'Courier Pool',
    path: `Seller Console → Store → Couriers → Application → ${COURIER_NAME} → Approve → Set Compensation`,
    screens: 6,
    color: '#1A1512',
  },
  {
    id: 'G',
    label: 'Fulfilment',
    path: `Paid Order → Seller Companion → Prepare → Mark Ready → Assign / Offer to ${firstName(COURIER_NAME)} → Seller displays Pickup QR → Courier scans → Pickup Verified → checkpoint location attempted → Courier delivers → Courier displays Delivery QR → Buyer scans → Delivery Verified → checkpoint attempted → Completed.`,
    screens: 14,
    color: '#2D7A4F',
    critical: true,
  },
  {
    id: 'H',
    label: 'Delegated Recipient',
    path: "Buyer Order → Someone Else Will Receive → Recipient Name + Phone → Authorized → Courier displays QR → Delegate scans → Completed → Review remains Buyer-owned",
    screens: 8,
    color: 'var(--color-brand)',
  },
  {
    id: 'I',
    label: 'Review',
    path: 'Completed Order → Review Available → Seller Service → Product Quality → Submit',
    screens: 4,
    color: '#B87C20',
  },
  {
    id: 'J',
    label: 'Claim',
    path: 'Order → Problem with Order → Claim → Submit → Operator Claims Queue → Case → Review → Resolution',
    screens: 8,
    color: '#C2372D',
  },
  {
    id: 'K',
    label: 'Moderation',
    path: 'Buyer Reports Shoppable Post → Operator Moderation Queue → Open Case → Restrict → remove from FYP → remove from Search → remove from Storefront',
    screens: 7,
    color: '#C2622D',
  },
  {
    id: 'L',
    label: 'Chatbot Escalation',
    path: 'Product Detail → Chat → Chatbot → unanswered → Talk to Seller → Seller Companion Inbox',
    screens: 6,
    color: '#5B3FAF',
  },
  {
    id: 'M',
    label: 'Buyer Collection Final Handoff',
    path: `Ready for Collection → Seller displays final Collection QR → ${COLLECTOR} scans → final Handoff Verified → Order Completed → ${COLLECTOR} eligible to review`,
    screens: 7,
    color: '#2D7A4F',
  },
]

function DemoFlowsList() {
  return (
    <GuideSection number="5" title="Prototype Demo Flows">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(420px, 100%), 1fr))' }}>
        {DEMO_FLOWS.map(flow => (
          <div
            key={flow.id}
            className="rounded-xl p-5 border"
            style={{
              background: 'var(--color-surface)',
              borderColor: flow.critical ? flow.color : 'var(--color-border)',
              boxShadow: flow.critical ? 'var(--shadow-sm)' : 'var(--shadow-xs)',
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-lg font-mono font-semibold text-sm"
                style={{ width: 36, height: 36, background: flow.color, color: onCategory(flow.color), fontFamily: 'var(--font-mono)' }}
              >
                {flow.id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    Flow {flow.id} — {flow.label}
                  </span>
                  {flow.critical && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FDECEA', color: '#C2372D' }}>
                      Critical
                    </span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {flow.screens} screens
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
              {flow.path}
            </p>
          </div>
        ))}
      </div>
    </GuideSection>
  )
}

/* ═══════════════════════════════════════════════
   6. PROTOTYPE-ONLY ROLE LAUNCHER
═══════════════════════════════════════════════ */

// Each entry's action is §61's launcher entry: View as Buyer, View as Seller Companion, View as Courier, Open Seller
// Console, Open Operator Console.
const ROLE_ENTRIES = [
  {
    role: 'Buyer',
    action: 'View as Buyer',
    persona: BUYER_NAME,
    description: 'Browse For You, search, cart, checkout, orders, handoff, reviews, and claims.',
    section: '05-buyer' as const,
    icon: '🛍️',
    bg: 'var(--color-brand-muted)',
    accent: 'var(--color-brand)',
    dark: 'var(--color-brand-dark)',
  },
  {
    role: 'Seller',
    action: 'View as Seller Companion',
    persona: SELLER_NAME,
    description: 'Seller Companion mobile — alerts, orders, inbox, and quick operations.',
    section: '06-seller-companion' as const,
    icon: '🔔',
    bg: '#FDF3E1',
    accent: '#B87C20',
    dark: '#7A5010',
  },
  {
    role: 'Courier',
    action: 'View as Courier',
    persona: COURIER_NAME,
    description: 'Delivery assignments, pickup QR scanner, delivery QR display.',
    section: '07-courier' as const,
    icon: '🚴',
    bg: '#F0ECFA',
    accent: '#5B3FAF',
    dark: '#3B2080',
  },
  {
    role: 'Seller Console',
    action: 'Open Seller Console',
    persona: `${SELLER_NAME} — Full Admin`,
    description: 'Products, content, orders, inbox, insights, store, automation, and settings.',
    section: '08-seller-console' as const,
    icon: '⚙️',
    bg: '#F5F2ED',
    accent: 'var(--color-ink)',
    dark: '#000',
  },
  {
    role: 'Operator Console',
    action: 'Open Operator Console',
    persona: 'CEO / COO',
    description: 'Support, moderation, claims, trust appeals, handoff review, and governance.',
    section: '09-operator-console' as const,
    icon: '🔒',
    bg: '#FDECEA',
    accent: '#C2372D',
    dark: '#8B1A15',
  },
]

interface RoleLauncherProps {
  onNavigate?: (section: string) => void
}

function RoleLauncher({ onNavigate }: RoleLauncherProps) {
  return (
    <GuideSection number="6" title="Prototype-Only Role Launcher">
      {/* Warning banner */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 mb-6 border"
        style={{ background: '#FFF9E6', borderColor: '#E8C84A' }}
      >
        <span className="text-lg flex-shrink-0">⚠️</span>
        <div>
          <div className="font-semibold text-sm mb-1" style={{ color: '#6B5000', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
            PROTOTYPE NAVIGATION — NOT PRODUCTION UI
          </div>
          <p className="text-sm" style={{ color: '#7A5F00', margin: 0 }}>
            This launcher allows prototype reviewers to switch between product surfaces for demonstration purposes.
            It does not represent a production account architecture. The question of whether one person holds one
            multi-relationship account or separate role-purpose accounts is deliberately unresolved in this prototype.
            Do not use this to infer a commitment to any account model.
          </p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))' }}>
        {ROLE_ENTRIES.map(entry => (
          <LauncherCard key={entry.role} entry={entry} onNavigate={onNavigate} />
        ))}
      </div>

      {/* Prototype-only controls inside the product surfaces (specification §2) */}
      <div
        className="mt-6 rounded-xl p-5 border"
        style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
      >
        <div className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Prototype-Only Controls
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Buyer guest switch.</strong> Above the Buyer phone, labelled
          PROTOTYPE NAVIGATION — NOT PRODUCTION UI. It shows the Buyer app as a guest or as the signed-in demo Buyer, for
          demonstration only. Inside the app, Sign in / Create account runs the prototype sign-in: phone number, Continue,
          then a {GUEST_STATE.otpDigits}-digit code.
        </p>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', margin: '12px 0 0', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Checkout test control.</strong> Beside the Buyer guest switch,
          under the same PROTOTYPE NAVIGATION — NOT PRODUCTION UI label. Choose a run and Load: Scenario A (one Seller),
          Scenario B2 (two Sellers), Scenario B3 with All payments succeed or Order 2 payment fails, or the availability
          race. A run's TEST- Seller Orders and TESTPAY- payment attempts exist only inside it, never in Orders, the Seller
          surfaces or the demo data; Reset or a prototype reset removes them. It is never a Buyer feature.
        </p>
      </div>

      {/* Additional navigation note */}
      <div
        className="mt-6 rounded-xl p-5 border"
        style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
      >
        <div className="font-semibold text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          Additional Surfaces
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))' }}>
          {[
            { icon: '🌐', label: 'Company Website', section: '03-website' },
            { icon: '🏪', label: 'Seller Storefront', section: '04-storefront' },
            { icon: '🗺️', label: 'End-to-End Demo Flows', section: '10-demo-flows' },
            { icon: '11', label: 'System States', section: '11-system-states' },
          ].map(item => (
            <button
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:opacity-80"
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
              onClick={() => onNavigate?.(item.section)}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </GuideSection>
  )
}

function LauncherCard({ entry, onNavigate }: { entry: typeof ROLE_ENTRIES[0]; onNavigate?: (section: string) => void }) {
  const [pressed, setPressed] = useState(false)

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: pressed ? 'none' : 'var(--shadow-sm)',
        transform: pressed ? 'scale(0.99)' : 'scale(1)',
      }}
    >
      {/* Card header */}
      <div className="p-5 pb-4" style={{ background: entry.bg }}>
        <div className="text-3xl mb-3">{entry.icon}</div>
        <div className="font-semibold text-base" style={{ color: entry.dark, fontFamily: 'var(--font-display)' }}>
          {entry.role}
        </div>
        <div className="text-xs mt-1" style={{ color: categoryText(entry.accent), fontFamily: 'var(--font-mono)' }}>
          {entry.persona}
        </div>
      </div>
      {/* Card body */}
      <div className="p-5 pt-4">
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
          {entry.description}
        </p>
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all"
          style={{
            background: entry.accent,
            color: onCategory(entry.accent),
          }}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onClick={() => onNavigate?.(entry.section)}
        >
          {entry.action}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
