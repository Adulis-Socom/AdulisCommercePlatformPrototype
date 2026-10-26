import { Fragment, useEffect, useId, useRef, useState, FormEvent } from 'react'
import { AdulisLogo } from '../App'
import { useStory } from '../StoryClock'
import { BUYERS, PRODUCTS, SELLERS, SHOPPABLE_POSTS, SURFACE_DEFAULTS, accountDeletionPreviewAt, formatClockShort, formatEtb, forYouAt, initials, issueAccountDeletionCapability, issueReportSubmissionCapability, requestAccountDeletionAt, sellerProductsAt, submitContentReport, trustAt, trustLabel, type AccountDeletionCapability, type DeletionBlocker, type ReportSubmissionCapability } from '../demo-data'

/* ─── Page routing ─── */
type PageKey =
  | 'home'
  | 'how-it-works'
  | 'for-sellers'
  | 'for-buyers'
  | 'trust'
  | 'availability'
  | 'ethiopia'
  | 'pricing'
  | 'about'
  | 'waitlist'
  | 'help'
  | 'contact'
  | 'legal-terms'
  | 'legal-privacy'
  | 'legal-seller-terms'
  | 'legal-prohibited'
  | 'account-deletion'
  | 'report-content'

const NAV_LINKS: { key: PageKey; label: string }[] = [
  { key: 'how-it-works', label: 'How It Works' },
  { key: 'for-sellers',  label: 'For Sellers'  },
  { key: 'for-buyers',   label: 'For Buyers'   },
  { key: 'trust',        label: 'Trust & Safety' },
  { key: 'availability', label: 'Availability' },
  { key: 'about',        label: 'About'        },
]

/* pages with a dedicated mobile design; every other page reflows its desktop content in the 390 px view (WO-007) */
const MOBILE_PAGES: PageKey[] = ['home', 'how-it-works', 'for-sellers', 'waitlist', 'trust']

/* ─── Main component ─── */
export default function CompanyWebsite({ demoTarget }: { demoTarget?: string }) {
  const [page, setPage]           = useState<PageKey>((demoTarget as PageKey) || 'home')
  const [view, setView]           = useState<'desktop' | 'mobile'>(() => typeof window !== 'undefined' && window.innerWidth <= 640 ? 'mobile' : 'desktop')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Every page has a 390 px layout, so moving between pages keeps the current view.
  const navigate = (p: PageKey) => {
    setPage(p)
    setMobileMenuOpen(false)
  }

  return (
    <div style={{ background: 'var(--color-background)', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── Prototype toolbar ── */}
      <div
        className="website-toolbar flex items-center justify-between px-6 py-2 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          03 — COMPANY WEBSITE · {page.replace(/-/g, ' ').toUpperCase()}
        </span>
        {/* Offered where a page has a dedicated mobile design, and always while the 390 px view is showing, so it can
            be left again. A phone shows the 390 px layout only (index.css). */}
        {(MOBILE_PAGES.includes(page) || view === 'mobile') && (
          <div className="website-view-toggle flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
            {(['desktop', 'mobile'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={{ background: view === v ? 'var(--color-brand)' : 'var(--color-surface)', color: view === v ? '#fff' : 'var(--color-text-muted)' }}
              >
                {v === 'desktop' ? '↔ Desktop' : '📱 390px'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Website chrome ── */}
      {view === 'mobile' ? (
        <MobileFrame page={page} navigate={navigate} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)' }}>
          <WebHeader activePage={page} navigate={navigate} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          <main style={{ flex: 1 }}>
            <PageRouter page={page} navigate={navigate} />
          </main>
          <WebFooter navigate={navigate} />
        </div>
      )}
    </div>
  )
}

/* ─── Desktop Header ─── */
function WebHeader({ activePage, navigate, mobileMenuOpen, setMobileMenuOpen }: {
  activePage: PageKey
  navigate: (p: PageKey) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void
}) {
  return (
    <header
      className="website-header flex items-center gap-6 px-10 border-b sticky top-0 z-30"
      style={{ height: 64, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', borderColor: 'var(--color-border)' }}
    >
      <button onClick={() => navigate('home')} className="flex items-center gap-2 flex-shrink-0">
        <AdulisLogo size={28} />
        <span className="font-display font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>Adulis</span>
      </button>

      <nav className="flex items-center gap-1 flex-1 justify-center">
        {NAV_LINKS.map(item => (
          <button
            key={item.key}
            onClick={() => navigate(item.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: activePage === item.key ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              background: activePage === item.key ? 'var(--color-brand-muted)' : 'transparent',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('waitlist')}
          className="px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-brand)', color: '#fff' }}
        >
          Join Seller Waitlist
        </button>
      </div>
    </header>
  )
}

/* ─── Desktop Footer ─── */
function WebFooter({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--color-border)', background: '#FAF8F5' }}>
      <div className="max-w-6xl mx-auto px-10 py-14 grid grid-cols-5 gap-8">
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AdulisLogo size={24} />
            <span className="font-display font-semibold" style={{ color: 'var(--color-text-primary)' }}>Adulis</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)', maxWidth: 280 }}>
            Trusted commerce infrastructure connecting independent sellers with buyers through verified storefronts and accountable fulfilment.
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>© 2026 Adulis. All rights reserved.</p>
        </div>
        {[
          { heading: 'Platform', items: [
            { label: 'How It Works', page: 'how-it-works' as PageKey },
            { label: 'For Sellers',  page: 'for-sellers'  as PageKey },
            { label: 'For Buyers',   page: 'for-buyers'   as PageKey },
            { label: 'Pricing',      page: 'pricing'      as PageKey },
          ]},
          { heading: 'Company', items: [
            { label: 'About',        page: 'about'        as PageKey },
            { label: 'Availability', page: 'availability' as PageKey },
            { label: 'Help',         page: 'help'         as PageKey },
            { label: 'Contact',      page: 'contact'      as PageKey },
          ]},
          { heading: 'Legal', items: [
            { label: 'Terms of Service',   page: 'legal-terms'        as PageKey },
            { label: 'Privacy Policy',     page: 'legal-privacy'      as PageKey },
            { label: 'Seller Terms',       page: 'legal-seller-terms' as PageKey },
            { label: 'Prohibited Items',   page: 'legal-prohibited'   as PageKey },
            { label: 'Report Content',     page: 'report-content'     as PageKey },
            { label: 'Account Deletion',   page: 'account-deletion'   as PageKey },
          ]},
        ].map(col => (
          <div key={col.heading} className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {col.heading}
            </h4>
            {col.items.map(it => (
              <button key={it.page} onClick={() => navigate(it.page)} className="text-sm text-left transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </footer>
  )
}

/* ─── Mobile phone-frame wrapper ─── */
function MobileFrame({ page, navigate }: { page: PageKey; navigate: (p: PageKey) => void }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const { moment } = useStory()

  return (
    <div className="website-phone-stage flex justify-center items-start py-8" style={{ background: 'var(--color-background)', flex: 1 }}>
      <div
        className="website-phone-frame"
        style={{
          width: 390, minHeight: 844, borderRadius: 44,
          boxShadow: 'var(--shadow-xl), 0 0 0 1px var(--color-border-strong)',
          background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* status bar */}
        <div className="flex items-center justify-between px-6 flex-shrink-0" style={{ height: 44 }}>
          <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatClockShort(moment.at)}</span>
        </div>

        {/* mobile header */}
        <div
          className="flex items-center justify-between px-5 border-b flex-shrink-0"
          style={{ height: 56, background: 'rgba(255,255,255,0.97)', borderColor: 'var(--color-border)' }}
        >
          <button onClick={() => navigate('home')} className="flex items-center gap-2">
            <AdulisLogo size={22} />
            <span className="font-display font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Adulis</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('waitlist')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'var(--color-brand)', color: '#fff' }}
            >
              Join Waitlist
            </button>
            <button onClick={() => setMobileMenu(o => !o)} aria-label={mobileMenu ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenu} className="w-8 h-8 flex flex-col items-center justify-center gap-1.5">
              <span style={{ width: 18, height: 1.5, background: 'var(--color-text-primary)', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 18, height: 1.5, background: 'var(--color-text-primary)', borderRadius: 2, display: 'block' }} />
              <span style={{ width: 12, height: 1.5, background: 'var(--color-text-primary)', borderRadius: 2, display: 'block' }} />
            </button>
          </div>
        </div>

        {/* nav drawer */}
        {mobileMenu && (
          <div className="absolute inset-x-0 z-20 border-b" style={{ top: 100, background: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
            {NAV_LINKS.map(item => (
              <button
                key={item.key}
                onClick={() => { navigate(item.key); setMobileMenu(false) }}
                className="w-full text-left px-6 py-4 text-sm font-medium border-b"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* scrollable content: a page's dedicated mobile design, or its desktop content reflowed for 390 px
            (index.css `.website-compact`), then the site footer, which reaches every page */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {MOBILE_PAGES.includes(page) ? <MobilePageContent page={page} navigate={navigate} /> : <div className="website-compact"><PageRouter page={page} navigate={navigate} /></div>}
          <div className="website-compact"><WebFooter navigate={navigate} /></div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page router ─── */
function PageRouter({ page, navigate }: { page: PageKey; navigate: (p: PageKey) => void }) {
  switch (page) {
    case 'home':            return <HomePage navigate={navigate} />
    case 'how-it-works':   return <HowItWorksPage navigate={navigate} />
    case 'for-sellers':    return <ForSellersPage navigate={navigate} />
    case 'for-buyers':     return <ForBuyersPage navigate={navigate} />
    case 'trust':          return <TrustPage navigate={navigate} />
    case 'availability':   return <AvailabilityPage navigate={navigate} />
    case 'ethiopia':       return <EthiopiaPage navigate={navigate} />
    case 'pricing':        return <PricingPage navigate={navigate} />
    case 'about':          return <AboutPage navigate={navigate} />
    case 'waitlist':       return <WaitlistPage navigate={navigate} />
    case 'help':           return <HelpPage navigate={navigate} />
    case 'contact':        return <ContactPage />
    case 'legal-terms':    return <LegalPage title="Terms of Service" />
    case 'legal-privacy':  return <LegalPage title="Privacy Policy" />
    case 'legal-seller-terms': return <LegalPage title="Seller Terms" />
    case 'legal-prohibited':   return <LegalPage title="Prohibited Products" />
    case 'account-deletion':   return <AccountDeletionPage />
    case 'report-content':     return <ReportContentPage />
  }
}

function MobilePageContent({ page, navigate }: { page: PageKey; navigate: (p: PageKey) => void }) {
  switch (page) {
    case 'home':        return <MobileHomePage navigate={navigate} />
    case 'how-it-works': return <MobileHowItWorks navigate={navigate} />
    case 'for-sellers': return <MobileForSellers navigate={navigate} />
    case 'waitlist':    return <MobileWaitlist />
    case 'trust':       return <MobileTrust navigate={navigate} />
    default:            return <div className="p-6"><p style={{ color: 'var(--color-text-muted)' }}>Select a page</p></div>
  }
}

/* ══════════════════════════════════
   HOMEPAGE
══════════════════════════════════ */
function HomePage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(170deg, #F7F0E8 0%, #FAF8F5 60%, var(--color-surface) 100%)', padding: '96px 0 80px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <span style={{ display: 'inline-block', background: 'var(--color-brand-muted)', color: 'var(--color-brand)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 999, fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
                Now in development · Ethiopia
              </span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 600, lineHeight: 1.12, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
                Discover products through the way people actually like to see them used.
              </h1>
              <p style={{ fontSize: 18, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: '0 0 36px', maxWidth: 460 }}>
                Adulis is a commerce platform built around Products and Scenes — content where the product is the subject, not an afterthought. Browse, trust, buy, receive.
              </p>
              <div style={{ display: 'flex', gap: 14 }}>
                <button
                  onClick={() => navigate('waitlist')}
                  style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                >
                  Join Seller Waitlist
                </button>
                <button
                  onClick={() => navigate('how-it-works')}
                  style={{ background: 'transparent', color: 'var(--color-text-secondary)', border: '1.5px solid var(--color-border-strong)', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                >
                  See How It Works
                </button>
              </div>
            </div>

            {/* The hero photograph, shown as a Scene: its tagged product */}
            <HeroScene />
          </div>
        </div>
      </section>

      {/* Problem */}
      <Section bg="var(--color-surface)" id="problem">
        <SectionLabel>The Problem</SectionLabel>
        <SectionTitle>Commerce without context doesn't build trust.</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, marginTop: 48 }}>
          {[
            { heading: 'Sellers struggle to be believed', body: 'Listing a product with a photo isn\'t enough. Buyers need to see how it looks, how it\'s used, and who stands behind it.' },
            { heading: 'Buyers can\'t tell what\'s real', body: 'Generic marketplaces mix genuine sellers with poor-quality listings. There\'s no accountability and no way to verify a seller\'s record.' },
            { heading: 'Fulfilment falls apart at handoff', body: 'Cash on delivery creates disputes. No evidence. No accountability. Sellers and buyers have no recourse when things go wrong.' },
          ].map(c => (
            <div key={c.heading} style={{ padding: 28, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>{c.heading}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Adulis Model */}
      <Section bg="var(--color-brand-muted)" id="model">
        <SectionLabel>The Adulis Model</SectionLabel>
        <SectionTitle>Content that is commerce. Commerce that is trustworthy.</SectionTitle>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-text-secondary)', maxWidth: 640, margin: '16px auto 0', textAlign: 'center' }}>
          Adulis separates the discovery layer from the transaction layer — without losing connection between them. Sellers publish rich content. Buyers act on what they see. Every transaction flows through a gateway. Every delivery generates verifiable evidence.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginTop: 48 }}>
          {[
            {
              title: 'Products',
              desc: 'A dedicated page for a single product — gallery, specs, variants, price, availability, seller identity. The product is the subject.',
            },
            {
              title: 'Scenes',
              desc: 'Creative scenes where products appear in context. Viewers can tap a tag, see the product, and move directly to purchase without leaving the content.',
            },
            {
              title: 'Verified Storefronts',
              desc: 'Every seller has a public storefront showing their full catalogue, Trust level, and review history. Accessible without an account.',
            },
            {
              title: 'Gateway Payments',
              desc: 'Adulis never holds funds. All transactions flow through established payment infrastructure, and payment is confirmed before the seller prepares the order.',
            },
          ].map(c => (
            <div key={c.title} style={{ padding: 28, background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{c.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* For You Discovery */}
      <Section bg="var(--color-surface)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <SectionLabel align="left">For You Discovery</SectionLabel>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
              Products discovered in context, not in a grid.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
              The For You feed surfaces Scenes from sellers you've engaged with and sellers whose work matches your interests. Image-led. Not video-dependent.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
              Tap a tagged product to see the full Product — price, variants, availability, seller. Add to cart directly from within the Scene.
            </p>
            <button onClick={() => navigate('for-buyers')} style={{ background: 'transparent', color: 'var(--color-brand)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}>
              Learn more about the buyer experience →
            </button>
          </div>
          <FeedIllustration />
        </div>
      </Section>

      {/* Seller Storefronts */}
      <Section bg="var(--color-surface-raised)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <StorefrontIllustration />
          <div>
            <SectionLabel align="left">Seller Storefronts</SectionLabel>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text-primary)', margin: '0 0 20px' }}>
              Every seller has a public home — no app required to browse.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
              Storefronts are publicly accessible on the web. Share your link on Instagram, TikTok, or anywhere else. Buyers see your catalogue, Trust level, and reviews before they ever open the Adulis app.
            </p>
            <button onClick={() => navigate('for-sellers')} style={{ background: 'transparent', color: 'var(--color-brand)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}>
              Learn more for sellers →
            </button>
          </div>
        </div>
      </Section>

      {/* Trust & Safety section */}
      <Section bg="var(--color-surface)">
        <SectionLabel>Trust & Safety</SectionLabel>
        <SectionTitle>Accountability at every step, not just at checkout.</SectionTitle>
        <PhotoSlot brief="A courier handing a delivery to a buyer" tone="stone" style={{ marginTop: 48, aspectRatio: '12 / 5', minHeight: 220 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 24 }}>
          {[
            { label: 'Seller Admission', desc: 'Sellers are admitted, not self-served. Social presence, business intent, and seller history are reviewed.' },
            { label: 'Trust Ladder', desc: 'Every seller has a verified Trust level based on their fulfilment record, reviews, and claims history.' },
            { label: 'Gateway Payment', desc: 'No cash on delivery. Payments flow through established providers and are confirmed before the seller prepares the order.' },
            { label: 'Handoff Evidence', desc: 'Pickup QR and Delivery QR create verifiable evidence at both ends of every delivery.' },
          ].map(c => (
            <div key={c.label} style={{ padding: 22, background: 'var(--color-surface-raised)', borderRadius: 14 }}>
              <h4 style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>{c.label}</h4>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button onClick={() => navigate('trust')} style={{ background: 'transparent', color: 'var(--color-brand)', border: '1.5px solid var(--color-brand)', borderRadius: 999, padding: '10px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Read our Trust & Safety approach
          </button>
        </div>
      </Section>

      {/* How Commerce Works */}
      <Section bg="var(--color-brand-muted)">
        <SectionLabel>How Commerce Works</SectionLabel>
        <SectionTitle>Nine steps. Complete accountability.</SectionTitle>
        <HowCommerceWorksMini navigate={navigate} />
      </Section>

      {/* Global Availability */}
      <Section bg="var(--color-surface)">
        <SectionLabel>Availability</SectionLabel>
        <SectionTitle>Starting in Ethiopia. Built to expand.</SectionTitle>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-text-secondary)', maxWidth: 580, margin: '16px auto 0', textAlign: 'center' }}>
          Adulis is being developed with a focus on the Ethiopian market — particularly Addis Ababa. The architecture is designed for international expansion, but we won't claim coverage we haven't built.
        </p>
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <button onClick={() => navigate('availability')} style={{ background: 'transparent', color: 'var(--color-brand)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            View availability details →
          </button>
        </div>
      </Section>

      {/* Seller CTA */}
      <CtaBand
        title="Ready to sell the right way?"
        body="Join the seller waitlist and be among the first to launch on Adulis. We'll notify you when applications open."
        brief="An independent seller preparing orders"
        onAction={() => navigate('waitlist')}
      />
    </div>
  )
}

/* ── Photography slots (PR-001) ──
   The Website is laid out for professional photography to come. Until it arrives, each slot is a quiet tonal panel
   carrying its shot's brief, sized by its place in the layout. No stock or external images. A slot inside a product
   illustration is decorative and has no brief. */
const PHOTO_TONES = {
  sand:  ['#F1E8DE', '#E3D5C6'],
  clay:  ['#EFE0D4', '#DCC3AF'],
  sage:  ['#E6ECE3', '#D0DCCD'],
  stone: ['#EDEBE7', '#DAD6CF'],
} as const

function PhotoSlot({ brief, tone = 'sand', radius = 24, framed = true, style }: {
  brief?: string; tone?: keyof typeof PHOTO_TONES; radius?: number; framed?: boolean; style?: React.CSSProperties
}) {
  const [from, to] = PHOTO_TONES[tone]
  return (
    <div
      role={brief ? 'img' : undefined}
      aria-label={brief ? `Photograph to come: ${brief}` : undefined}
      aria-hidden={brief ? undefined : true}
      style={{
        position: 'relative', width: '100%', borderRadius: radius, overflow: 'hidden',
        background: `linear-gradient(160deg, ${from} 0%, ${to} 100%)`,
        border: framed ? '1px solid var(--color-border)' : 'none',
        ...style,
      }}
    >
      {brief && (
        <span style={{ position: 'absolute', top: 16, left: 18, right: 18, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
          Photography · {brief}
        </span>
      )}
    </div>
  )
}

/* A closing call to action, with its photograph beside it. */
function CtaBand({ title, body, brief, onAction }: { title: string; body: string; brief: string; onAction: () => void }) {
  return (
    <section style={{ background: 'var(--color-brand)', padding: '72px 48px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: '#fff', margin: '0 0 16px', lineHeight: 1.2 }}>{title}</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.82)', lineHeight: 1.65, margin: '0 0 32px', maxWidth: 480 }}>{body}</p>
          <button
            onClick={onAction}
            style={{ background: '#fff', color: 'var(--color-brand)', border: 'none', borderRadius: 999, padding: '16px 36px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
          >
            Join Seller Waitlist
          </button>
        </div>
        <PhotoSlot brief={brief} framed={false} style={{ height: 320 }} />
      </div>
    </section>
  )
}

/* ── Illustrations — canonical demo records (src/demo-data), with photography slots in place of pictures ── */
/* The hero photograph is itself a Scene: one tagged product, as a buyer would see it. */
function HeroScene() {
  const { moment } = useStory()
  const post = SHOPPABLE_POSTS[SURFACE_DEFAULTS.post]
  const tagged = PRODUCTS[post.tags[0]]
  return (
    <div style={{ position: 'relative' }}>
      <PhotoSlot brief="A Scene: products styled in a real home" tone="clay" radius={28} style={{ height: 500 }} />
      {/* the tag's hotspot */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '40%', left: '58%', width: 24, height: 24, background: 'rgba(255,255,255,0.95)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 8, height: 8, background: 'var(--color-brand)', borderRadius: '50%' }} />
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20, maxWidth: 320, background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)', padding: 14 }}>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: '0 0 10px' }}>{SELLERS[post.seller].name} · {post.title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PhotoSlot tone="sand" radius={10} framed={false} style={{ width: 52, height: 52, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 2px' }}>{tagged.name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-brand)', fontFamily: 'var(--font-mono)', margin: '0 0 6px' }}>{formatEtb(tagged.price)}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <span style={{ fontSize: 10, background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{tagged.availability}</span>
              <span style={{ fontSize: 10, background: 'var(--color-brand-muted)', color: 'var(--color-brand)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{trustLabel(trustAt(tagged.seller, moment))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeedIllustration() {
  // The first two Scenes of For You at the story moment.
  const { moment } = useStory()
  const tones = ['clay', 'sage'] as const
  const posts = forYouAt(moment).slice(0, 2).map((id, i) => {
    const post = SHOPPABLE_POSTS[id]
    return { tone: tones[i], label: post.title, seller: SELLERS[post.seller].name, tags: post.tags.length }
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      {posts.map((p, i) => (
        <div key={i} style={{ width: 280, maxWidth: '100%', background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <PhotoSlot tone={p.tone} radius={0} framed={false} style={{ height: 180 }} />
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 22, height: 22, background: 'var(--color-brand-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-brand)' }}>
                {p.seller[0]}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.seller}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>{p.label}</p>
            <div style={{ height: 28, background: 'var(--color-brand)', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{p.tags} tagged product{p.tags === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StorefrontIllustration() {
  // A Storefront header and its first four Products at the story moment.
  const { moment } = useStory()
  const seller = SELLERS[SURFACE_DEFAULTS.seller]
  const backgrounds = ['#F0DDD1', '#E8D5C8', '#D8C9BE', '#EDE5DE']
  const products = sellerProductsAt(SURFACE_DEFAULTS.seller, moment).slice(0, 4).map((id, i) => ({ label: PRODUCTS[id].name, price: formatEtb(PRODUCTS[id].price), bg: backgrounds[i] }))
  return (
    <div style={{ width: 300, background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', overflow: 'hidden' }}>
      {/* header */}
      <div style={{ background: 'var(--color-brand-muted)', padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, background: 'var(--color-brand)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{initials(seller.name)}</div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{seller.name}</p>
            <span style={{ fontSize: 10, background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{trustLabel(trustAt(SURFACE_DEFAULTS.seller, moment))}</span>
          </div>
        </div>
      </div>
      {/* products */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {products.map(p => (
          <div key={p.label} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ height: 70, background: p.bg }} />
            <div style={{ padding: '8px 8px 6px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 2px', lineHeight: 1.3 }}>{p.label}</p>
              <p style={{ fontSize: 10, color: 'var(--color-brand)', fontFamily: 'var(--font-mono)', margin: 0 }}>{p.price}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HowCommerceWorksMini({ navigate }: { navigate: (p: PageKey) => void }) {
  const steps = [
    { n: 1, label: 'Discover' },
    { n: 2, label: 'Product' },
    { n: 3, label: 'Cart' },
    { n: 4, label: 'Checkout' },
    { n: 5, label: 'Gateway' },
    { n: 6, label: 'Seller Preps' },
    { n: 7, label: 'Courier Picks Up' },
    { n: 8, label: 'Handoff + QR' },
    { n: 9, label: 'Review' },
  ]
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 44, overflowX: 'auto', justifyContent: 'center' }}>
        {steps.map((s, i) => (
          <Fragment key={s.n}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 52, height: 52, background: 'var(--color-surface)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--color-brand)', boxShadow: 'var(--shadow-sm)' }}>
                {String(s.n).padStart(2, '0')}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', maxWidth: 60 }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 20, height: 2, background: 'var(--color-border-strong)', flexShrink: 0, marginBottom: 24 }} />
            )}
          </Fragment>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button onClick={() => navigate('how-it-works')} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 28px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          See the full journey
        </button>
      </div>
    </>
  )
}

/* ══════════════════════════════════
   HOW IT WORKS
══════════════════════════════════ */
function HowItWorksPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const steps = [
    { n: '01', title: 'Discover', color: '#F0DDD1',
      body: 'Open Adulis and scroll your For You feed — a curated stream of Scenes from sellers and categories you\'ve engaged with. Image-led content, not endless video.',
      detail: null },
    { n: '02', title: 'Product', color: '#EAF0E8',
      body: 'Tap a tagged product in a Scene, or visit a seller\'s storefront directly. The Product page shows a full gallery, accurate variants, live inventory, and the seller\'s Trust level.',
      detail: null },
    { n: '03', title: 'Cart', color: '#E8EFF0',
      body: 'Add to your cart. Each seller has a separate cart — your carts are clearly separated so you know exactly what you\'re ordering from whom.',
      detail: null },
    { n: '04', title: 'Checkout', color: '#EDE8F0',
      body: 'Review your order before you pay: every charge is itemised, including the delivery charge for your fulfilment choice. Select your fulfilment preference. Proceed to payment.',
      detail: null },
    { n: '05', title: 'Gateway Payment', color: '#F0EAE8',
      body: 'Adulis routes your payment through an established gateway. Adulis never holds your funds. Payment is confirmed before the seller is notified.',
      detail: 'No cash on delivery. No "pay when it arrives." Gateway confirmation happens before the seller begins preparation.' },
    { n: '06', title: 'Seller Preparation', color: '#EAF0E8',
      body: 'The seller is notified of your paid order. They prepare it and mark it ready. A Pickup QR is generated for the courier.',
      detail: null },
    { n: '07', title: 'Courier Fulfilment', color: '#E8EAF0',
      body: 'A seller-approved courier accepts the delivery. They scan the Pickup QR at the seller to verify collection — this creates verifiable pickup evidence.',
      detail: 'No continuous GPS tracking. Location checkpoints are attempted at pickup and delivery but a failure doesn\'t reverse verification.' },
    { n: '08', title: 'Handoff', color: '#EAEAF0',
      body: 'The courier arrives and displays a Delivery QR. You scan it with your Adulis app to confirm receipt. If someone else is receiving, you can pre-authorise a delegated recipient.',
      detail: 'This QR exchange is the core of Adulis\'s handoff evidence system. It replaces the "I never received it" and "they said it wasn\'t delivered" disputes.' },
    { n: '09', title: 'Review', color: '#F0EDE8',
      body: 'Leave a review for Product Quality and Seller Service separately. Both scores are public and contribute to the seller\'s Trust level over time.',
      detail: 'You can also raise a Claim if the order didn\'t match what was described. Claims are reviewed by Adulis Operators against documented evidence.' },
  ]

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'linear-gradient(170deg, var(--color-brand-muted) 0%, var(--color-surface) 100%)', padding: '72px 48px 56px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>How It Works</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Nine steps. Every one accountable.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: '0 0 32px' }}>
            Adulis is designed so that every step of the buyer journey has a clear owner, verifiable evidence, and a path to resolution if something goes wrong.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button onClick={() => navigate('for-buyers')} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>For Buyers</button>
            <button onClick={() => navigate('for-sellers')} style={{ background: 'transparent', color: 'var(--color-brand)', border: '1.5px solid var(--color-brand)', borderRadius: 999, padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>For Sellers</button>
          </div>
        </div>
        <div style={{ maxWidth: 1024, margin: '48px auto 0' }}>
          <PhotoSlot brief="A buyer discovering products on their phone" tone="sand" style={{ aspectRatio: '12 / 5', minHeight: 220 }} />
        </div>
      </section>

      {/* Steps */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 48px' }}>
        {steps.map((step, i) => (
          <div key={step.n} style={{ display: 'flex', gap: 32, marginBottom: 48, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 64, height: 64, background: step.color, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {step.n}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, height: 32, background: 'var(--color-border)', margin: '8px auto 0' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>{step.title}</h2>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: '0 0 10px' }}>{step.body}</p>
              {step.detail && (
                <div style={{ background: 'var(--color-surface-raised)', borderLeft: '3px solid var(--color-border-strong)', borderRadius: 4, padding: '10px 14px' }}>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--color-text-muted)', margin: 0 }}>{step.detail}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   FOR SELLERS
══════════════════════════════════ */
function ForSellersPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const features = [
    { title: 'Products', body: 'Publish each product on its own page: multi-image gallery, name, category, description, attributes, variants, price, and live inventory. Your product is always shown in full context.' },
    { title: 'Scenes', body: 'Publish creative content — room scenes, outfit photos, lifestyle images — and tag products within them. Viewers tap a hotspot and go directly to the product. Scenes without tagged products are allowed and still published to your storefront.' },
    { title: 'Public Storefront', body: 'Every seller gets a public web page showing their full catalogue, Trust level, and reviews. Share your link on social media. Buyers can browse without installing the app.' },
    { title: 'Orders', body: 'A clear order management workflow: Needs Action → Preparing → Ready → In Delivery → Completed. Mark orders ready when packed. Generate a Pickup QR for your courier.' },
    { title: 'Inventory Management', body: 'Set stock levels per variant. Receive low-stock alerts before you run out. Orders are rejected automatically when stock hits zero — no overselling.' },
    { title: 'Buyer Chat', body: 'Answer buyer questions before and after purchase. Chatbot handles your FAQs so you don\'t have to be online 24/7. Escalate to manual when needed.' },
    { title: 'Courier Fulfilment', body: 'Build your own courier pool. Approve couriers, set compensation, and invite them to your orders. A Pickup QR verifies collection. At final Courier delivery, the Courier displays the Delivery QR and the Buyer or authorized delegate scans it.' },
    { title: 'Analytics', body: 'Track paid orders, GMV, product views, Scene impressions, product-tag click-through rate, storefront visits, claims rate, and fulfilment reliability. Content performance per Scene.' },
    { title: 'Trust', body: 'Your Trust level is built through your fulfilment record, review scores, and claims history. Visible on your storefront. Increases as you earn it. Cannot be purchased.' },
  ]

  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, var(--color-brand-muted) 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>For Sellers</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Everything you need to sell with confidence.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: '0 0 36px' }}>
            Adulis gives independent sellers the tools, structure, and trust infrastructure that used to only be available to large retailers.
          </p>
          <button
            onClick={() => navigate('waitlist')}
            style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
          >
            Join Seller Waitlist
          </button>
        </div>
        <div style={{ maxWidth: 1024, margin: '48px auto 0' }}>
          <PhotoSlot brief="A seller photographing a product for a Scene" tone="clay" style={{ aspectRatio: '12 / 5', minHeight: 220 }} />
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map(f => (
            <div key={f.title} style={{ padding: 26, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Seller Console is waiting for you."
        body="Apply for early access. We review every application."
        brief="A seller packing an order for courier collection"
        onAction={() => navigate('waitlist')}
      />
    </div>
  )
}

/* ══════════════════════════════════
   FOR BUYERS
══════════════════════════════════ */
function ForBuyersPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const features = [
    { title: 'For You Feed', body: 'A curated feed of Scenes from sellers whose work you\'ve engaged with. Image-led. Scroll at your own pace. No aggressive video autoplay.' },
    { title: 'Product Truth', body: 'Every Product shows exactly what you\'re buying: full gallery, accurate variants, real inventory, and clearly stated fulfilment options. No phantom stock.' },
    { title: 'Search', body: 'Search across Products, Scenes, and sellers. Filter by category. Browse top results, Products, Scenes, and seller profiles from one query.' },
    { title: 'Collections', body: 'Save Products and Scenes into private Collections and come back to them later.' },
    { title: 'Seller Trust', body: 'Every seller has a public Trust level built from their fulfilment record and review scores. Read it before you buy. It\'s earned, not purchased.' },
    { title: 'Chat', body: 'Ask the seller a question before buying. A chatbot handles common queries instantly. Escalate to a real conversation when needed.' },
    { title: 'Checkout', body: 'Separate carts per seller. Every charge is itemised before you pay, including the delivery charge. Gateway payment — not cash on delivery.' },
    { title: 'Verified Handoff', body: 'Your courier arrives and shows you a Delivery QR. You scan it to confirm receipt. This creates verifiable evidence that you received your order.' },
    { title: 'Reviews', body: 'Rate Product Quality and Seller Service separately. Your review contributes to the seller\'s public Trust level. You can also raise a Claim if something isn\'t right.' },
  ]

  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, #EAF0E8 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>For Buyers</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Discover. Trust. Receive. Review.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            Adulis is designed for buyers who want to know what they\'re actually buying — from a real seller with a real record — before they pay.
          </p>
        </div>
        <div style={{ maxWidth: 1024, margin: '48px auto 0' }}>
          <PhotoSlot brief="A buyer browsing Scenes at home" tone="sage" style={{ aspectRatio: '12 / 5', minHeight: 220 }} />
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {features.map(f => (
            <div key={f.title} style={{ padding: 26, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════
   TRUST & SAFETY
══════════════════════════════════ */
function TrustPage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, var(--color-brand-muted) 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>Trust & Safety</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Accountability built in, not bolted on.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            Trust on Adulis is earned through behaviour, not declared through documents. Every seller's record is visible. Every delivery generates evidence.
          </p>
        </div>
        <div style={{ maxWidth: 1024, margin: '48px auto 0' }}>
          <PhotoSlot brief="A seller and a buyer: social commerce built on trust" tone="stone" style={{ aspectRatio: '12 / 5', minHeight: 220 }} />
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <TrustSection title="Seller Admission">
            <p>Adulis does not allow anyone to sign up and immediately start selling. Sellers are admitted based on a review of:</p>
            <ul>
              <li>A verified social media presence demonstrating a legitimate business identity</li>
              <li>Stated business intent and product category</li>
              <li>A completed store profile describing the business and its fulfilment capability</li>
            </ul>
            <p>A physical shop is not required. A Seller may add a verifiable business or store location where one applies, and no Seller is asked to publish a home or residential address.</p>
            <p>Adulis does not require government-issued ID for Seller admission. Payment-provider KYC, where required, is separate.</p>
          </TrustSection>

          <TrustSection title="The Trust Ladder">
            <p>Every seller on Adulis has a publicly visible Trust level. It is built over time through:</p>
            <ul>
              <li>Fulfilment reliability — orders prepared on time and couriered correctly</li>
              <li>Review scores — Product Quality and Seller Service rated separately by buyers</li>
              <li>Claims record — frequency, outcome, and pattern of buyer complaints</li>
              <li>Handoff evidence — consistent QR-verified pickup and delivery</li>
            </ul>
            <p>Trust levels are read-only for sellers. Operators cannot manually assign a Trust level — it is the product of the seller's record.</p>
          </TrustSection>

          <TrustSection title="Gateway Payments">
            <p>Adulis uses established payment gateway infrastructure for all transactions. This means:</p>
            <ul>
              <li>Buyers pay before the seller is notified — no cash on delivery</li>
              <li>Adulis never holds funds — money flows through the gateway</li>
              <li>Every charge is itemised at checkout before payment</li>
              <li>Failed payments are handled by the gateway; Adulis cannot manually mark an unpaid order as paid</li>
            </ul>
          </TrustSection>

          <TrustSection title="Handoff Evidence">
            <p>Every Adulis delivery uses a two-QR evidence system:</p>
            <ul>
              <li><strong>Pickup QR:</strong> Displayed by the seller. Scanned by the courier at collection. Creates a verifiable pickup record.</li>
              <li><strong>Delivery QR:</strong> Displayed by the courier. Scanned by the buyer (or delegated recipient) at receipt. Creates a verifiable delivery record.</li>
            </ul>
            <p>Location checkpoints are attempted at both events. A checkpoint failure does not reverse a verified handoff — but the pattern is visible to Operators.</p>
          </TrustSection>

          <TrustSection title="Verified Reviews">
            <p>Reviews on Adulis can only be submitted by buyers who have completed a transaction with that seller. There are no anonymous or unverified reviews.</p>
            <p>Ratings cover two dimensions separately: <strong>Product Quality</strong> (did the product match what was described?) and <strong>Seller Service</strong> (was the fulfilment and communication professional?).</p>
          </TrustSection>

          <TrustSection title="Claims">
            <p>If something goes wrong, buyers can raise a Claim through the app. Claims are reviewed by Adulis Operators against:</p>
            <ul>
              <li>The original product listing at time of sale</li>
              <li>Payment gateway confirmation records</li>
              <li>Handoff QR evidence (pickup and delivery)</li>
              <li>Buyer-submitted evidence (photos, description)</li>
              <li>Seller response and chat history</li>
            </ul>
            <p>Claim outcomes follow documented governance — Operators follow policy, not discretion.</p>
          </TrustSection>

        </div>
      </Section>
    </div>
  )
}

function TrustSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid var(--color-border)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>{title}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--color-text-secondary)' }}>
        {children}
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   AVAILABILITY
══════════════════════════════════ */
function AvailabilityPage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, #EAF0E8 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>Availability</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Starting in Ethiopia. Honest about where.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            We won't claim to operate where we don't. Adulis is in active development focused on the Ethiopian market.
          </p>
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
            <div style={{ padding: 28, background: 'var(--color-success-bg)', borderRadius: 18, border: '1px solid #c8e6d4' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--color-success)', margin: '0 0 12px' }}>In Development</h3>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Ethiopia — Addis Ababa</p>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
                Our primary focus market. Sellers, buyers, and couriers operating in Addis Ababa. Local fulfilment, local payment integration.
              </p>
              <button onClick={() => navigate('ethiopia')} style={{ marginTop: 14, background: 'transparent', color: 'var(--color-success)', border: '1px solid var(--color-success)', borderRadius: 999, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Ethiopia Market Details
              </button>
            </div>
            <div style={{ padding: 28, background: 'var(--color-surface-raised)', borderRadius: 18, border: '1px solid var(--color-border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--color-text-muted)', margin: '0 0 12px' }}>Architecture Ready</h3>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>International Expansion</p>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
                Adulis is built with multi-market architecture: market-level configuration, localised payment provider support, and policy governance per market. No timeline is committed.
              </p>
            </div>
          </div>
          <div style={{ padding: 24, background: 'var(--color-warning-bg)', borderRadius: 14, border: '1px solid #f0d898' }}>
            <p style={{ fontSize: 14, color: 'var(--color-warning)', margin: 0, lineHeight: 1.65 }}>
              <strong>Important:</strong> We will not claim availability in markets we haven't built for. If Adulis isn't available in your country, that means it isn't yet — not that it won't eventually be. We'll update this page as our coverage expands.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}

function EthiopiaPage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, #EAF5EE 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>Ethiopia Market</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Adulis in Ethiopia
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            Adulis is being built with Ethiopia as its founding market — the commerce infrastructure, payment integration, and courier network are designed for this context.
          </p>
        </div>
        <div style={{ maxWidth: 1024, margin: '48px auto 0' }}>
          <PhotoSlot brief="Addis Ababa: sellers and couriers in the city" tone="sand" style={{ aspectRatio: '12 / 5', minHeight: 220 }} />
        </div>
      </section>
      <Section bg="var(--color-surface)">
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            { title: 'Focus City: Addis Ababa', body: 'Our initial seller and courier network is concentrated in Addis Ababa. Sellers need the ability to prepare orders for courier collection. A physical storefront is not required: a Seller may add a verifiable business or store location where one applies, and no Seller is asked to publish a home or residential address.' },
            { title: 'Payment Infrastructure', body: 'Adulis integrates with locally available payment gateway infrastructure appropriate for the Ethiopian market. No specific provider is announced here.' },
            { title: 'Courier Network', body: 'Sellers build their own approved courier relationships. Couriers are onboarded through seller invitation, not a central marketplace. Compensation is set by the seller.' },
            { title: 'Language', body: 'Adulis supports Amharic and English in the buyer and seller experiences. Additional language support will follow market need.' },
          ].map(s => (
            <div key={s.title} style={{ padding: 26, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{s.body}</p>
            </div>
          ))}
          <button onClick={() => navigate('availability')} style={{ alignSelf: 'flex-start', background: 'transparent', color: 'var(--color-brand)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: 0 }}>
            ← Back to Availability
          </button>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════
   PRICING
══════════════════════════════════ */
/* No pricing, fee or surcharge figure is presented: Adulis's commercial terms are not decided (PR-001). */
function PricingPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const tools = [
    { title: 'Products and Scenes', body: 'Publish each product on its own page, and tag your products in Scenes that show them in use.' },
    { title: 'Public Storefront', body: 'A public web page with your full catalogue, Trust level, and reviews, ready to share anywhere.' },
    { title: 'Orders and Inventory', body: 'A clear order workflow and stock levels per variant, so you never oversell.' },
    { title: 'Courier Fulfilment', body: 'Your own approved couriers, with QR-verified pickup and delivery.' },
    { title: 'Buyer Chat', body: 'Answer buyer questions before and after purchase.' },
    { title: 'Analytics', body: 'Paid orders, product views, Scene performance, and fulfilment reliability in one place.' },
  ]
  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, var(--color-brand-muted) 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <SectionLabel>Pricing</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 24px' }}>
            Pricing is coming soon.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            We're not ready to publish seller plan pricing yet. When we do, it will be published here — with no hidden fees, no invented tiers, and no asterisks.
          </p>
          <button onClick={() => navigate('waitlist')} style={{ marginTop: 32, background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
            Join Waitlist to be notified
          </button>
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <SectionLabel>For Sellers</SectionLabel>
        <SectionTitle>The tools Adulis is building for Sellers.</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 48 }}>
          {tools.map(t => (
            <div key={t.title} style={{ padding: 26, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{t.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>{t.body}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <button onClick={() => navigate('for-sellers')} style={{ background: 'transparent', color: 'var(--color-brand)', border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Explore the Seller tools →
          </button>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════
   ABOUT
══════════════════════════════════ */
function AboutPage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, var(--color-brand-muted) 0%, var(--color-surface) 100%)', padding: '72px 48px 64px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <SectionLabel>About Adulis</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.15, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            Building the commerce infrastructure independent sellers deserve.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: 0 }}>
            Adulis is named after an ancient trading port in the Horn of Africa — a place where commerce and trust made distant trade possible for centuries.
          </p>
        </div>
      </section>

      <Section bg="var(--color-surface)">
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 40 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Our Mission</h2>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
              Independent sellers — whether they make furniture, fashion, food, or art — deserve commerce infrastructure that works in their favour. Not infrastructure that extracts fees without building trust. Not platforms that hide seller identity behind a marketplace brand.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: 0 }}>
              Adulis is designed to make the seller's identity, product truth, and delivery reliability the foundation of commerce — not an afterthought.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            {[
              { label: 'Press', href: '#', note: 'Media inquiries and press kit' },
              { label: 'Help Centre', href: '#', note: 'Documentation and support', action: () => navigate('help') },
              { label: 'Contact', href: '#', note: 'Get in touch with our team', action: () => navigate('contact') },
            ].map(link => (
              <button
                key={link.label}
                onClick={link.action}
                style={{ padding: 22, background: 'var(--color-surface-raised)', borderRadius: 14, textAlign: 'left', border: 'none', cursor: 'pointer' }}
              >
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>{link.label}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>{link.note}</p>
              </button>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════
   WAITLIST
══════════════════════════════════ */
function WaitlistPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    businessName: '', category: '', socialHandle: '', location: '',
  })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required'
    if (!form.businessName.trim()) e.businessName = 'Required'
    if (!form.category) e.category = 'Required'
    if (!form.socialHandle.trim()) e.socialHandle = 'Required'
    if (!form.location.trim()) e.location = 'Required'
    return e
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length > 0) { setErrors(e2); return }
    setSubmitted(true)
  }

  const set = (k: keyof typeof form, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(er => ({ ...er, [k]: undefined }))
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>You're on the list.</h1>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 12px' }}>
            Thank you, <strong>{form.firstName}</strong>. We've received your application for <strong>{form.businessName}</strong>.
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 28px' }}>
            We review every seller application individually. We'll be in touch at <strong>{form.email}</strong> when your application progresses.
          </p>
          <div style={{ padding: 20, background: 'var(--color-surface-raised)', borderRadius: 14, textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.65 }}>
              While you wait, review the way Adulis protects buyers and Sellers, and make sure your social presence reflects your business clearly — we’ll look.
            </p>
            <button onClick={() => navigate('trust')} style={{ marginTop: 12, background: 'transparent', border: 'none', padding: 0, color: 'var(--color-brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Read Trust &amp; Safety
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '64px 48px' }}>
      <div style={{ marginBottom: 40 }}>
        <SectionLabel align="left">Seller Waitlist</SectionLabel>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--color-text-primary)', margin: '12px 0 16px', lineHeight: 1.2 }}>
          Apply to sell on Adulis.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: 0 }}>
          We review every application. Having an active social presence that reflects your real business helps your application significantly.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="First Name" value={form.firstName} onChange={v => set('firstName', v)} error={errors.firstName} required />
          <Field label="Last Name"  value={form.lastName}  onChange={v => set('lastName',  v)} error={errors.lastName}  required />
        </div>
        <Field label="Email Address" value={form.email} onChange={v => set('email', v)} error={errors.email} required type="email" />
        <Field label="Phone Number (optional)" value={form.phone} onChange={v => set('phone', v)} type="tel" />
        <Field label="Business Name" value={form.businessName} onChange={v => set('businessName', v)} error={errors.businessName} required />
        <SelectField
          label="Primary Category"
          value={form.category}
          onChange={v => set('category', v)}
          error={errors.category}
          required
          options={['Fashion & Clothing', 'Home & Living', 'Food & Beverage', 'Beauty & Personal Care', 'Art & Crafts', 'Electronics', 'Books & Education', 'Health & Wellness', 'Other']}
        />
        <Field label="Social Handle (Instagram, TikTok, or similar)" value={form.socialHandle} onChange={v => set('socialHandle', v)} error={errors.socialHandle} required placeholder="@yourbusiness" />
        <Field label="Business Location (City, Country)" value={form.location} onChange={v => set('location', v)} error={errors.location} required placeholder="Addis Ababa, Ethiopia" />

        <div style={{ padding: 16, background: 'var(--color-surface-raised)', borderRadius: 12, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
          By submitting this form you agree that Adulis may review your public social presence and contact you about your application. We will not share your details with third parties.
        </div>

        <button
          type="submit"
          style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '16px 32px', fontWeight: 700, fontSize: 16, cursor: 'pointer', width: '100%' }}
        >
          Submit Application
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, error, required, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; required?: boolean; type?: string; placeholder?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {label}{required && <span style={{ color: 'var(--color-brand)', marginLeft: 3 }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 14,
          border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          background: 'var(--color-surface)', color: 'var(--color-text-primary)',
          width: '100%', boxSizing: 'border-box',
        }}
      />
      {error && <p id={errorId} role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>Error: {error}</p>}
    </div>
  )
}

function SelectField({ label, value, onChange, error, required, options }: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; required?: boolean; options: string[]
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {label}{required && <span style={{ color: 'var(--color-brand)', marginLeft: 3 }}>*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 14,
          border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
          background: 'var(--color-surface)', color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          width: '100%', cursor: 'pointer',
        }}
      >
        <option value="">Select a category…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p id={errorId} role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>Error: {error}</p>}
    </div>
  )
}

/* ══════════════════════════════════
   HELP
══════════════════════════════════ */
function HelpPage({ navigate }: { navigate: (p: PageKey) => void }) {
  const topics = [
    { label: 'Orders & Checkout', questions: ['How do I pay for an order?', 'Can I cancel an order after paying?', 'What charges will I see at checkout?', 'Why are carts separate per seller?'] },
    { label: 'Delivery & Handoff', questions: ['How does QR handoff work?', 'What if my courier can\'t reach me?', 'Can someone else receive my order?', 'What if the Delivery QR scan fails?'] },
    { label: 'Reviews & Claims', questions: ['How do I leave a review?', 'What is a Claim?', 'How long does a Claim take?', 'Can I appeal a Claim decision?'] },
    { label: 'For Sellers', questions: ['How do I apply to sell on Adulis?', 'What is the Trust Ladder?', 'How do I add couriers to my pool?', 'What is a Scene?'] },
  ]

  return (
    <div>
      <section style={{ background: 'linear-gradient(170deg, var(--color-surface-raised) 0%, var(--color-surface) 100%)', padding: '72px 48px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <SectionLabel>Help Centre</SectionLabel>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 600, color: 'var(--color-text-primary)', margin: '16px 0 20px' }}>
            How can we help?
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 14, padding: '12px 18px', maxWidth: 420, margin: '0 auto' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4" stroke="var(--color-text-muted)" strokeWidth="1.5"/><path d="M11 11L14 14" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input aria-label="Search help articles" placeholder="Search help articles…" style={{ border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, color: 'var(--color-text-primary)', background: 'transparent', flex: 1 }} />
          </div>
        </div>
      </section>
      <Section bg="var(--color-surface)">
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {topics.map(t => (
            <div key={t.label} style={{ padding: 26, background: 'var(--color-surface-raised)', borderRadius: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>{t.label}</h3>
              {t.questions.map(q => (
                <div key={q} style={{ padding: '8px 0', fontSize: 14, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  {q}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 36 }}>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>
            Can't find your answer?{' '}
            <button onClick={() => navigate('contact')} style={{ background: 'transparent', border: 'none', color: 'var(--color-brand)', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
              Contact us
            </button>
          </p>
        </div>
      </Section>
    </div>
  )
}

/* ══════════════════════════════════
   CONTACT
══════════════════════════════════ */
function ContactPage() {
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState({ name: '', email: '', subject: '', message: '' })

  if (sent) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>Message received.</h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)' }}>We'll reply to <strong>{msg.email}</strong> within 2 business days.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '64px 48px' }}>
      <SectionLabel align="left">Contact</SectionLabel>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, color: 'var(--color-text-primary)', margin: '12px 0 32px', lineHeight: 1.2 }}>Get in touch</h1>
      <form onSubmit={e => { e.preventDefault(); setSent(true) }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Your Name" value={msg.name} onChange={v => setMsg(m => ({ ...m, name: v }))} required />
          <Field label="Email" value={msg.email} onChange={v => setMsg(m => ({ ...m, email: v }))} required type="email" />
        </div>
        <Field label="Subject" value={msg.subject} onChange={v => setMsg(m => ({ ...m, subject: v }))} required />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="contact-message" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Message <span style={{ color: 'var(--color-brand)' }}>*</span></label>
          <textarea
            id="contact-message"
            value={msg.message}
            onChange={e => setMsg(m => ({ ...m, message: e.target.value }))}
            rows={5}
            style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button type="submit" style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Send Message
        </button>
      </form>
    </div>
  )
}

/* ══════════════════════════════════
   LEGAL PAGES
══════════════════════════════════ */
function LegalPage({ title }: { title: string }) {
  const sections: Record<string, { heading: string; body: string }[]> = {
    'Terms of Service': [
      { heading: '1. Acceptance', body: 'By using Adulis you agree to these terms. If you do not agree, do not use the platform.' },
      { heading: '2. Platform Role', body: 'Adulis provides commerce infrastructure. Adulis is not a party to transactions between buyers and sellers. Adulis does not hold funds on behalf of any party.' },
      { heading: '3. Seller Obligations', body: 'Sellers must maintain accurate product listings, fulfil paid orders in a timely manner, and maintain their courier pool in good standing.' },
      { heading: '4. Buyer Obligations', body: 'Buyers must not raise fraudulent Claims, must scan the Delivery QR at time of receipt, and must not circumvent the QR handoff process.' },
      { heading: '5. Prohibited Conduct', body: 'See Prohibited Products policy. Additionally: no account sharing, no impersonation, no market manipulation.' },
      { heading: '6. Dispute Resolution', body: 'Claims are resolved through the Adulis Claims process. Adulis Operator decisions are final subject to the Trust Appeals process.' },
    ],
    'Privacy Policy': [
      { heading: '1. Data We Collect', body: 'Account information, transaction records, delivery evidence (QR events and location checkpoints), chat content, and usage patterns.' },
      { heading: '2. Data We Do Not Collect', body: 'We do not collect or store continuous GPS data. Location checkpoints are point-in-time attempts — not ongoing tracking.' },
      { heading: '3. How We Use Data', body: 'To operate the platform, resolve Claims, enforce policy, and improve the service. We do not sell personal data to third parties.' },
      { heading: '4. Retention', body: 'Transaction records are retained for 7 years for regulatory compliance. Account data is deleted on verified Account Deletion request.' },
      { heading: '5. Your Rights', body: 'You may request access to your data, correction of inaccuracies, and deletion of your account at any time through the app.' },
    ],
    'Seller Terms': [
      { heading: '1. Seller Admission', body: 'Seller status is granted by Adulis following review. Adulis may reject or revoke seller status for any reason consistent with platform policy.' },
      { heading: '2. Product Listings', body: 'All listings must accurately represent the product, its condition, variants, and availability. Phantom stock, false discounts, and misleading descriptions are prohibited.' },
      { heading: '3. Fulfilment', body: 'Sellers must fulfil paid orders promptly. Repeated cancellations, fulfilment failures, or courier assignment delays affect Trust level and may result in platform restrictions.' },
      { heading: '4. Courier Pool', body: 'Sellers are responsible for the behaviour of couriers they admit to their pool. Courier disputes are resolved through the Seller.' },
      { heading: '5. Trust & Safety', body: 'Sellers are bound by the Adulis Trust & Safety policy. Content moderation decisions by Adulis Operators are final subject to the appeal process.' },
    ],
    'Prohibited Products': [
      { heading: 'Absolutely Prohibited', body: 'Weapons, firearms, and ammunition. Drugs and controlled substances. Counterfeit goods. Stolen property. Adult content involving minors. Anything illegal in the seller\'s jurisdiction.' },
      { heading: 'Restricted — Approval Required', body: 'Alcohol and tobacco products. Prescription medication or health products with specific regulatory status. Animals and animal products subject to CITES controls.' },
      { heading: 'Seller Responsibility', body: 'It is the seller\'s responsibility to ensure their products comply with applicable law in both the seller\'s and buyer\'s jurisdiction. Adulis is not the importer of record.' },
      { heading: 'Reporting', body: 'Any user may report a product listing they believe violates this policy. Reports are reviewed by Adulis Operators.' },
    ],
  }

  const items = sections[title] ?? [{ heading: 'Document pending', body: 'This legal document is in preparation. It will be published before any seller or buyer is bound by it.' }]

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '64px 48px' }}>
      <span style={{ display: 'inline-block', background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
        Legal
      </span>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px', lineHeight: 1.2 }}>{title}</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 40px', fontFamily: 'var(--font-mono)' }}>Prototype draft — not final legal text</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {items.map(s => (
          <div key={s.heading} style={{ paddingBottom: 32, borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>{s.heading}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-text-secondary)', margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ══════════════════════════════════
   ACCOUNT DELETION
══════════════════════════════════ */
/* The deletion verification (specification §12): the phone number, then the 6-digit code. Only then does the Platform
   issue a capability for this deletion flow, which its preview, its explicit confirmation and its request require. The
   flow is this page's state alone, not a Website login or session: cancelling, leaving the page, reloading or resetting
   the prototype ends it, as finishing it does, with nothing further requested. */
type DeletionFlow =
  | { step: 'explain' }
  | { step: 'phone' }
  | { step: 'code'; phone: string }
  | { step: 'preview' | 'confirm'; capability: AccountDeletionCapability }
  | { step: 'result'; request: NonNullable<ReturnType<typeof requestAccountDeletionAt>> }

const DELETION_CONSEQUENCES = ['Any open orders will need to be resolved before deletion can proceed.', 'Your transaction history will be retained for 7 years as required by our data retention policy.', 'Your seller storefront, if active, will be unpublished immediately.', 'You will lose access to your order history, reviews, and saved content.']

function AccountDeletionPage() {
  const { moment } = useStory()
  const [flow, setFlow] = useState<DeletionFlow>({ step: 'explain' })
  const [reason, setReason] = useState('')
  // Each transition checks the step it leaves, so no control reaches a later step out of order. Only a complete code
  // gets the capability, and the preview, the confirmation and the request each require it.
  const restart = () => { setFlow({ step: 'explain' }); setReason('') }
  const sendCode = (phone: string) => setFlow(f => (f.step === 'phone' && phoneComplete(phone) ? { step: 'code', phone } : f))
  const verify = (code: string) => setFlow(f => (f.step === 'code' && codeComplete(code) ? { step: 'preview', capability: issueAccountDeletionCapability() } : f))
  const review = () => setFlow(f => (f.step === 'preview' ? { step: 'confirm', capability: f.capability } : f))
  const request = () => setFlow(f => {
    if (f.step !== 'confirm') return f
    const result = requestAccountDeletionAt(f.capability, moment)
    return result ? { step: 'result', request: result } : { step: 'explain' }
  })
  // A new step moves keyboard focus to its heading (opening the page doesn't).
  const page = useRef<HTMLDivElement>(null)
  const shown = useRef(flow.step)
  useEffect(() => {
    if (shown.current !== flow.step) page.current?.querySelector<HTMLElement>('h1')?.focus()
    shown.current = flow.step
  }, [flow.step])

  return (
    <div ref={page} style={{ maxWidth: 520, margin: '0 auto', padding: '64px 48px' }}>
      {flow.step === 'explain' && (
        <>
          <h1 tabIndex={-1} style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>Delete your Adulis account</h1>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
            Account deletion is permanent and cannot be undone. Before you delete:
          </p>
          <DeletionConsequences />
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
            To request deletion, first verify your account with its phone number and a 6-digit code. The verification is for this deletion only.
          </p>
          <button onClick={() => setFlow({ step: 'phone' })} style={{ background: 'var(--color-danger)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%' }}>
            Verify your account
          </button>
        </>
      )}
      {flow.step === 'phone' && <VerifyPhoneStep title="Verify your account" intro="Enter the phone number of the Adulis account you want to delete. We'll send a 6-digit code to it." onSendCode={sendCode} onCancel={restart} />}
      {flow.step === 'code' && <VerifyCodeStep phone={flow.phone} onVerify={verify} onCancel={restart} />}
      {flow.step === 'preview' && <DeletionPreview preview={accountDeletionPreviewAt(flow.capability, moment)} onContinue={review} onCancel={restart} />}
      {flow.step === 'confirm' && (
        <>
          <h1 tabIndex={-1} style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--color-danger)', margin: '0 0 16px' }}>Confirm deletion</h1>
          <div style={{ marginBottom: 24 }}>
            <label htmlFor="deletion-reason" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 8 }}>
              Why are you deleting your account? (optional)
            </label>
            <select id="deletion-reason" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: reason ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
              <option value="">Select a reason…</option>
              <option>I'm not using the platform</option>
              <option>I have privacy concerns</option>
              <option>I had a bad experience</option>
              <option>I'm switching to another platform</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 28px' }}>
            This action is permanent. Type <strong>DELETE</strong> to confirm.
          </p>
          <ConfirmDeleteForm onConfirm={request} onCancel={restart} />
        </>
      )}
      {flow.step === 'result' && <DeletionResult request={flow.request} onDone={restart} />}
    </div>
  )
}

/* The Website verification's phone and code screens (specification §12). They grant nothing: the flow that uses them
   gets its own capability after the code step, so Report Content (WO-013) can reuse them without sharing one. As in the
   Buyer app's prototype sign-in, a phone number is 9 digits after +251, and no code is sent: any 6 digits verify. */
const PHONE_DIGITS = 9
const CODE_DIGITS = 6
const phoneComplete = (phone: string) => phone.replace(/\D/g, '').length === PHONE_DIGITS
const codeComplete = (code: string) => /^\d+$/.test(code) && code.length === CODE_DIGITS

const stepHeading = { fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 14px' } as const
const stepText = { fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 24px' } as const
const stepLabel = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 } as const
const primaryButton = { background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 28px', fontWeight: 600, fontSize: 15, cursor: 'pointer', width: '100%' } as const
const quietButton = { background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', fontSize: 14, cursor: 'pointer', padding: '12px', minHeight: 44 } as const

function VerifyPhoneStep({ title, intro, onSendCode, onCancel }: { title: string; intro: string; onSendCode: (phone: string) => void; onCancel: () => void }) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string>()
  const submit = () => (phoneComplete(phone) ? onSendCode(phone) : setError('Enter a complete phone number.'))
  return (
    <form onSubmit={e => { e.preventDefault(); submit() }} noValidate>
      <h1 tabIndex={-1} style={stepHeading}>{title}</h1>
      <p style={stepText}>{intro}</p>
      <VerifyField label="Phone number" prefix="+251" value={phone} onChange={v => { setPhone(v.replace(/[^\d ]/g, '').slice(0, PHONE_DIGITS + 4)); setError(undefined) }} error={error} type="tel" placeholder="9 XX XX XX XX" autoComplete="tel-national" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        <button type="submit" style={primaryButton}>Send code</button>
        <button type="button" onClick={onCancel} style={quietButton}>Cancel</button>
      </div>
    </form>
  )
}

function VerifyCodeStep({ phone, onVerify, onCancel }: { phone: string; onVerify: (code: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const submit = () => (codeComplete(code) ? onVerify(code) : setError(`Enter all ${CODE_DIGITS} digits.`))
  return (
    <form onSubmit={e => { e.preventDefault(); submit() }} noValidate>
      <h1 tabIndex={-1} style={stepHeading}>Enter the {CODE_DIGITS}-digit code</h1>
      <p style={stepText}>We sent a verification code to +251 {phone.trim()}.</p>
      <VerifyField label={`${CODE_DIGITS}-digit verification code`} value={code} onChange={v => { setCode(v.replace(/\D/g, '').slice(0, CODE_DIGITS)); setError(undefined) }} error={error} inputMode="numeric" placeholder={'0'.repeat(CODE_DIGITS)} autoComplete="one-time-code" />
      <div style={{ marginTop: 16, padding: 14, background: 'var(--color-surface-raised)', borderRadius: 12, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
        <span style={stepLabel}>Prototype</span>
        No code is sent. Any {CODE_DIGITS} digits verify the demo account.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        <button type="submit" style={primaryButton}>Verify</button>
        <button type="button" onClick={onCancel} style={quietButton}>Cancel</button>
      </div>
    </form>
  )
}

/** A verification field: the Website's field style at the 44 px touch height (§57), with an optional prefix. */
function VerifyField({ label, value, onChange, error, prefix, type = 'text', inputMode, placeholder, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; prefix?: string
  type?: string; inputMode?: 'numeric'; placeholder?: string; autoComplete?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const box = { minHeight: 44, borderRadius: 10, fontSize: 15, border: '1.5px solid var(--color-border)', boxSizing: 'border-box' } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {prefix && <span style={{ ...box, display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--color-surface-raised)', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{prefix}</span>}
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={{ ...box, flex: 1, minWidth: 0, padding: '10px 14px', border: `1.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`, background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </div>
      {error && <p id={errorId} role="alert" style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>Error: {error}</p>}
    </div>
  )
}

function DeletionConsequences() {
  return (
    <ul style={{ listStyle: 'none', margin: '0 0 28px', padding: '2px 0 2px 16px', borderLeft: '3px solid var(--color-danger)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {DELETION_CONSEQUENCES.map(w => (
        <li key={w} style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{w}</li>
      ))}
    </ul>
  )
}

function BlockingOrders({ orders }: { orders: readonly DeletionBlocker[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {orders.map(o => <li key={o.order} style={{ fontSize: 14, color: 'var(--color-text-primary)' }}><span style={{ fontFamily: 'var(--font-mono)' }}>{o.order}</span> · {o.state}</li>)}
    </ul>
  )
}

/**
 * The preview of the consequences, after verification: the verified account, what deleting it means, and the Platform's
 * current status. It renders the Platform's preview (its active Orders block deletion for now) and judges nothing.
 */
function DeletionPreview({ preview, onContinue, onCancel }: { preview: ReturnType<typeof accountDeletionPreviewAt>; onContinue: () => void; onCancel: () => void }) {
  if (!preview) return null
  const blocked = preview.blockedBy.length > 0
  return (
    <>
      <h1 tabIndex={-1} style={stepHeading}>Review before you delete</h1>
      <div style={{ padding: '14px 18px', background: 'var(--color-surface-raised)', borderRadius: 12, marginBottom: 24 }}>
        <span style={stepLabel}>Verified account</span>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{BUYERS[preview.account].name}</p>
      </div>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>If you delete this account:</p>
      <DeletionConsequences />
      <div style={{ padding: '14px 18px', background: blocked ? 'var(--color-warning-bg)' : 'var(--color-surface-raised)', borderRadius: 12, marginBottom: 28 }}>
        <span style={stepLabel}>Current status from Adulis</span>
        {blocked ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 6px', fontWeight: 600 }}>Active Orders:</p>
            <BlockingOrders orders={preview.blockedBy} />
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>Deletion can't complete while Orders are active.</p>
          </>
        ) : <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>No active Orders.</p>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onContinue} style={{ ...primaryButton, background: 'var(--color-danger)' }}>Continue to confirmation</button>
        <button onClick={onCancel} style={quietButton}>Cancel</button>
      </div>
    </>
  )
}

/** The Platform's result, as it gives it: deletion requested, or requested but currently blocked. No deletion date. */
function DeletionResult({ request, onDone }: { request: NonNullable<ReturnType<typeof requestAccountDeletionAt>>; onDone: () => void }) {
  const blocked = request.result === 'blocked'
  return (
    <div style={{ textAlign: 'center' }}>
      <div role="status">
        <h1 tabIndex={-1} style={{ ...stepHeading, fontSize: 28 }}>{blocked ? 'Deletion requested, but currently blocked by active Orders.' : 'Deletion requested.'}</h1>
        <p style={{ ...stepText, margin: '0 0 12px' }}>
          Adulis has received the deletion request for {BUYERS[request.account].name}'s account.{blocked && " It can't complete while these Orders are active:"}
        </p>
        {blocked && <div style={{ display: 'inline-block', textAlign: 'left' }}><BlockingOrders orders={request.blockedBy} /></div>}
      </div>
      <button onClick={onDone} style={{ ...primaryButton, marginTop: 20 }}>Done</button>
    </div>
  )
}

function ConfirmDeleteForm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const [val, setVal] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input
        aria-label="Type DELETE to confirm account deletion"
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Type DELETE"
        style={{ padding: '12px 16px', borderRadius: 10, fontSize: 15, border: '2px solid var(--color-danger)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
      />
      <button
        onClick={onConfirm}
        disabled={val !== 'DELETE'}
        style={{ background: val === 'DELETE' ? 'var(--color-danger)' : 'var(--color-border)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px', fontWeight: 700, fontSize: 15, cursor: val === 'DELETE' ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
      >
        Delete My Account
      </button>
      <button onClick={onCancel} style={{ background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', fontSize: 14, cursor: 'pointer', padding: '8px' }}>
        Cancel — keep my account
      </button>
    </div>
  )
}

/* ══════════════════════════════════
   REPORT CONTENT
══════════════════════════════════ */
/* The report verification (specification §12): a guest can view and fill in the form, but Submit Report starts the
   verification (the phone number, then the 6-digit code) instead of submitting. Only then does the Platform issue a
   capability for submitting this Report, separate from Account Deletion's; the visitor is back at the form with the
   entries kept, and submits it. The flow is this page's state alone, not a Website login or session: submitting,
   cancelling, leaving the page, reloading or resetting the prototype ends it, so another Report is verified again. */
type ReportFlow =
  | { step: 'form' }
  | { step: 'phone' }
  | { step: 'code'; phone: string }
  | { step: 'verified'; capability: ReportSubmissionCapability }
  | { step: 'submitted' }

function ReportContentPage() {
  const [flow, setFlow] = useState<ReportFlow>({ step: 'form' })
  const [form, setForm] = useState({ contentType: '', contentUrl: '', reason: '', detail: '', contact: '' })
  // Each transition checks the step it leaves. Without a capability Submit Report starts the verification; only a
  // complete code gets the capability, and only Submit Report with it submits the Report. The entries stay as they are.
  const toForm = () => setFlow({ step: 'form' })
  const sendCode = (phone: string) => setFlow(f => (f.step === 'phone' && phoneComplete(phone) ? { step: 'code', phone } : f))
  const verify = (code: string) => setFlow(f => (f.step === 'code' && codeComplete(code) ? { step: 'verified', capability: issueReportSubmissionCapability() } : f))
  const submit = () => setFlow(f => {
    if (f.step === 'form') return { step: 'phone' }
    if (f.step !== 'verified') return f
    const result = submitContentReport(f.capability, { contentType: form.contentType, content: form.contentUrl, reason: form.reason, detail: form.detail, contact: form.contact })
    return result ? { step: 'submitted' } : { step: 'form' }
  })
  // A new step moves keyboard focus to its heading, or, back at the form after verification, to the verified account.
  const page = useRef<HTMLDivElement>(null)
  const shown = useRef(flow.step)
  useEffect(() => {
    if (shown.current !== flow.step) page.current?.querySelector<HTMLElement>(flow.step === 'verified' ? '#report-verified' : 'h1, h2')?.focus()
    shown.current = flow.step
  }, [flow.step])

  if (flow.step === 'phone' || flow.step === 'code') {
    return (
      <div ref={page} style={{ maxWidth: 560, margin: '0 auto', padding: '64px 48px' }}>
        {flow.step === 'phone'
          ? <VerifyPhoneStep title="Verify your account" intro="To submit your report, enter the phone number of your Adulis account. We'll send a 6-digit code to it. Your report is kept as you wrote it." onSendCode={sendCode} onCancel={toForm} />
          : <VerifyCodeStep phone={flow.phone} onVerify={verify} onCancel={toForm} />}
      </div>
    )
  }

  if (flow.step === 'submitted') {
    return (
      <div ref={page} style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <div role="status" style={{ textAlign: 'center', maxWidth: 420 }}>
          <h2 tabIndex={-1} style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>Report submitted.</h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            Our moderation team will review this report. If you provided contact details, we may follow up. Reports are reviewed in order of severity.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={page} style={{ maxWidth: 560, margin: '0 auto', padding: '64px 48px' }}>
      <span style={{ display: 'inline-block', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--font-mono)', marginBottom: 20 }}>
        Trust & Safety
      </span>
      <h1 tabIndex={-1} style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>Report Content</h1>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 32px' }}>
        If you've seen content on Adulis that violates our policies, report it here. Reports are reviewed by our moderation team.
      </p>
      <form onSubmit={e => { e.preventDefault(); submit() }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <SelectField
          label="Content Type"
          value={form.contentType}
          onChange={v => setForm(f => ({ ...f, contentType: v }))}
          required
          options={['Product Listing', 'Scene', 'Seller Profile', 'Review', 'Other']}
        />
        <Field
          label="Link or description of the content"
          value={form.contentUrl}
          onChange={v => setForm(f => ({ ...f, contentUrl: v }))}
          required
          placeholder="e.g. @sellername or product name"
        />
        <SelectField
          label="Reason for Report"
          value={form.reason}
          onChange={v => setForm(f => ({ ...f, reason: v }))}
          required
          options={['Prohibited product', 'Misleading or false information', 'Counterfeit goods', 'Hate speech or harassment', 'Spam', 'Other policy violation']}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="report-detail" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>Additional detail (optional)</label>
          <textarea
            id="report-detail"
            value={form.detail}
            onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
            rows={3}
            placeholder="Any additional context that will help our team…"
            style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, border: '1.5px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <Field
          label="Your email (optional — for follow-up)"
          value={form.contact}
          onChange={v => setForm(f => ({ ...f, contact: v }))}
          type="email"
        />
        {flow.step === 'verified' ? (
          <div id="report-verified" tabIndex={-1} role="status" style={{ padding: '14px 18px', background: 'var(--color-surface-raised)', borderRadius: 12 }}>
            <span style={stepLabel}>Verified account</span>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{BUYERS[flow.capability.account].name}</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>Check your report, then submit it. The verification is for this report only.</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>
            To submit a report, you'll first verify your Adulis account with its phone number and a 6-digit code.
          </p>
        )}
        <button type="submit" style={{ background: 'var(--color-warning)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Submit Report
        </button>
      </form>
    </div>
  )
}

/* ══════════════════════════════════
   MOBILE PAGE CONTENT
══════════════════════════════════ */
function MobileHomePage({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div>
      {/* hero */}
      <section style={{ background: 'linear-gradient(170deg, #F7F0E8 0%, var(--color-surface) 100%)', padding: '40px 24px 32px' }}>
        <span style={{ display: 'inline-block', background: 'var(--color-brand-muted)', color: 'var(--color-brand)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, fontFamily: 'var(--font-mono)', marginBottom: 18 }}>
          Now in development · Ethiopia
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, lineHeight: 1.2, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
          Discover products through the way people actually like to see them used.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Browse Products and Scenes from verified sellers. Trust is built in.
        </p>
        <button onClick={() => navigate('waitlist')} style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', width: '100%' }}>
          Join Seller Waitlist
        </button>
      </section>

      <div style={{ padding: '0 20px' }}>
        <PhotoSlot brief="A Scene: products styled in a real home" tone="clay" radius={20} style={{ height: 240 }} />
      </div>

      {/* mini cards */}
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[
          { title: 'Products', desc: 'Every product shown in full context — gallery, specs, price, stock, seller.' },
          { title: 'Scenes', desc: 'Tap a product tag in a Scene and go straight to the product. No hunting.' },
          { title: 'Trust Built In', desc: 'Sellers earn Trust through their record. Buyers see it before they pay.' },
          { title: 'Verified Handoff', desc: 'QR at pickup and delivery. No "I never got it" disputes.' },
        ].map(c => (
          <div key={c.title} style={{ padding: '16px 18px', background: 'var(--color-surface-raised)', borderRadius: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>{c.title}</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.55 }}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* cta */}
      <div style={{ padding: '0 20px 32px' }}>
        <button onClick={() => navigate('how-it-works')} style={{ background: 'transparent', color: 'var(--color-brand)', border: '1.5px solid var(--color-brand)', borderRadius: 999, padding: '13px', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%' }}>
          See How It Works
        </button>
      </div>
    </div>
  )
}

function MobileHowItWorks({ navigate }: { navigate: (p: PageKey) => void }) {
  const steps = [
    ['01', 'Discover in context', 'Browse Products and Scenes that show what is sold, who sells it, and how it is used.'],
    ['02', 'Review before buying', 'See price, availability, fulfilment, seller Trust, and verified reviews before you continue.'],
    ['03', 'Pay per Seller Order', 'Each seller has a distinct checkout and Seller Order, with provider-verified payment status.'],
    ['04', 'Track accountable fulfilment', 'Follow preparation and delivery, then use QR or the documented OTP fallback at handoff.'],
  ]
  return (
    <div style={{ padding: '32px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>How Adulis works</h1>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>From discovery to verified handoff, every step keeps the product, seller, payment, and fulfilment record connected.</p>
      <PhotoSlot brief="A buyer discovering products on their phone" tone="sand" radius={20} style={{ height: 200, marginBottom: 8 }} />
      <ol aria-label="How Adulis works" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {steps.map(([number, title, description]) => (
          <li key={number} style={{ display: 'flex', gap: 14, padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span aria-hidden="true" style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--color-brand)' }}>{number}</span>
            <span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{title}</span>
              <span style={{ display: 'block', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{description}</span>
            </span>
          </li>
        ))}
      </ol>
      <button onClick={() => navigate('for-sellers')} style={{ marginTop: 28, background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
        Explore selling on Adulis
      </button>
    </div>
  )
}

function MobileForSellers({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div style={{ padding: '32px 20px' }}>
      <SectionLabel align="left" small />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 14px' }}>
        Everything you need to sell with confidence.
      </h1>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
        Adulis gives independent sellers the tools, structure, and trust infrastructure that used to only be available to large retailers.
      </p>
      <PhotoSlot brief="A seller photographing a product for a Scene" tone="clay" radius={20} style={{ height: 200, marginBottom: 8 }} />
      {['Products', 'Scenes', 'Public Storefront', 'Order Management', 'Courier Pool', 'Analytics', 'Trust Ladder'].map(title => (
        <div key={title} style={{ padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{title}</span>
        </div>
      ))}
      <button onClick={() => navigate('waitlist')} style={{ marginTop: 28, background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
        Join Seller Waitlist
      </button>
    </div>
  )
}

function MobileWaitlist() {
  const [submitted, setSubmitted] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [business, setBusiness] = useState('')

  if (submitted) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>You're on the list.</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65 }}>We'll be in touch at <strong>{email}</strong> when your application progresses.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Join the Seller Waitlist</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.65 }}>We review every application. Full application on desktop.</p>
      <form onSubmit={e => { e.preventDefault(); setSubmitted(true) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Your Name" value={name} onChange={setName} required />
        <Field label="Email" value={email} onChange={setEmail} required type="email" />
        <Field label="Business Name" value={business} onChange={setBusiness} required />
        <button type="submit" style={{ background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 999, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>
          Submit Application
        </button>
      </form>
    </div>
  )
}

function MobileTrust({ navigate }: { navigate: (p: PageKey) => void }) {
  return (
    <div style={{ padding: '32px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>Trust & Safety</h1>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
        Accountability built in, not bolted on.
      </p>
      <PhotoSlot brief="A courier handing a delivery to a buyer" tone="stone" radius={20} style={{ height: 200, marginBottom: 8 }} />
      {[
        { title: 'Seller Admission',   desc: 'Sellers are admitted following review of their social presence and business intent. Not open self-registration. A physical shop is not required.' },
        { title: 'Trust Ladder',        desc: 'Every seller has a public Trust level built from fulfilment record, reviews, and claims history.' },
        { title: 'Gateway Payment',     desc: 'No cash on delivery. All payments flow through an established gateway, and every charge is itemised at checkout.' },
        { title: 'Handoff Evidence',    desc: 'Pickup QR and Delivery QR create verifiable evidence at both ends of every delivery.' },
        { title: 'Verified Reviews',    desc: 'Only buyers who completed a transaction can leave a review. Product Quality and Seller Service rated separately.' },
        { title: 'Claims',              desc: 'Raise a Claim if an order doesn\'t match what was described. Reviewed by Operators against documented evidence.' },
      ].map(s => (
        <div key={s.title} style={{ padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>{s.title}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
        </div>
      ))}
      <div style={{ marginTop: 24, padding: 16, background: 'var(--color-surface-raised)', borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.65, fontStyle: 'italic' }}>
          Adulis does not require government-issued ID for Seller admission. Payment-provider KYC, where required, is separate.
        </p>
      </div>
    </div>
  )
}

/* ─── Layout helpers ─── */
function Section({ children, bg, id }: { children: React.ReactNode; bg: string; id?: string }) {
  return (
    <section id={id} style={{ background: bg, padding: '72px 0' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 48px' }}>
        {children}
      </div>
    </section>
  )
}

function SectionLabel({ children, align = 'center', small }: { children?: React.ReactNode; align?: 'left' | 'center'; small?: boolean }) {
  return (
    <div style={{ textAlign: align, marginBottom: children ? 12 : 0 }}>
      {children && (
        <span style={{
          display: 'inline-block',
          background: 'var(--color-brand-muted)',
          color: 'var(--color-brand)',
          fontSize: small ? 9 : 11,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: 999,
          fontFamily: 'var(--font-mono)',
        }}>
          {children}
        </span>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      fontWeight: 600,
      lineHeight: 1.2,
      color: 'var(--color-text-primary)',
      margin: '12px 0 0',
      textAlign: 'center',
    }}>
      {children}
    </h2>
  )
}
