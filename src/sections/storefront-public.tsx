// WEB-002 / WEB-003: the public web's own screens for the Seller Storefront (inline-style idiom, inside the Storefront's phone): the Install prompt, public link
// sharing, the "not available" state, the Sellers directory and Search across the public marketplace. They read the same public records the Buyer reads
// (buyerVisible*, the Buyer's search index and ranking) and hold NO account state: nothing here follows, saves, likes, chats, adds to a Cart or signs in.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { AdulisLogo } from '../App'
import { NO_FILTERS, facets, searchProducts, searchScenes, searchSellers, type ProductFilters } from '../buyer-search'
import { searchIndex } from './MobileBuyer'
import { buyerVisibleSellers, currentPrice, formatEtb, initials, type Moment, type ProductId, type SellerId, type ShoppablePostId } from '../demo-data'
import { LIVE_POSTS as SHOPPABLE_POSTS, LIVE_PRODUCTS as PRODUCTS, LIVE_SELLERS as SELLERS } from '../demo-data/live'

const SOFT: CSSProperties = { background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 12, cursor: 'pointer', color: 'var(--color-text-primary)' }
const BRAND: CSSProperties = { background: 'var(--color-brand)', color: 'var(--color-on-brand)', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700 }

/** Escape closes a sheet, as in the Buyer app. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}

/**
 * What a public page says when an action needs an account. The message names the action; the prompt states what did NOT happen and offers only "Not now":
 * no install, no download, no progress, and no store link (none is approved).
 */
export function InstallPrompt({ message, onClose }: { message: string; onClose: () => void }) {
  useEscape(onClose)
  return (
    <div role="dialog" aria-modal="true" aria-label="Install Adulis" data-install-prompt onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-ink) 50%, transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: '24px 24px 0 0', padding: '24px 20px 28px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border-strong)', borderRadius: 999, margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <AdulisLogo size={44} />
          <h3 data-install-message style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.25 }}>{message}</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>Adulis is available on the Adulis app.</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: '0 0 18px', lineHeight: 1.5 }}>This web page keeps no account: nothing was liked, saved, followed, added to a Cart or sent from here.</p>
        <button autoFocus onClick={onClose} style={{ ...SOFT, width: '100%', padding: 14, fontWeight: 700, fontSize: 14 }}>Not now</button>
      </div>
    </div>
  )
}

/**
 * The public link for what is open, to copy or hand to the device's own share sheet. The link is shown, so it can always be read and copied by hand.
 * "Link copied" appears only after the copy succeeded.
 */
export function PublicShareSheet({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  useEscape(onClose)
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const copy = async () => { try { await navigator.clipboard.writeText(url); setState('copied') } catch { setState('failed') } }
  const share = async () => { try { await navigator.share({ title, url }) } catch (error) { if ((error as DOMException)?.name !== 'AbortError') setState('failed') } }
  return (
    <div role="dialog" aria-modal="true" aria-label="Share" data-share-sheet onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-ink) 40%, transparent)', zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: '24px 24px 0 0', padding: '20px 18px 28px' }}>
        <div style={{ width: 36, height: 4, background: 'var(--color-border-strong)', borderRadius: 999, margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 10px' }}>Share {title}</p>
        <input readOnly aria-label="Public link" data-share-url value={url} onFocus={e => e.currentTarget.select()} style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface-raised)', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copy} style={{ ...BRAND, flex: 1, padding: 12, fontSize: 14 }}>Copy link</button>
          {canShare && <button onClick={share} style={{ ...SOFT, flex: 1, padding: 12, fontSize: 14, fontWeight: 700 }}>Share…</button>}
        </div>
        <p role="status" data-share-status style={{ fontSize: 12, margin: '10px 0 0', minHeight: 16, color: state === 'failed' ? 'var(--color-error, var(--color-text-secondary))' : 'var(--color-success)', fontWeight: 600 }}>
          {state === 'copied' ? 'Link copied' : state === 'failed' ? 'Could not copy automatically. Select the link above and copy it.' : ''}
        </p>
        <button onClick={onClose} style={{ ...SOFT, width: '100%', padding: 12, fontWeight: 600, fontSize: 14, marginTop: 6 }}>Close</button>
      </div>
    </div>
  )
}

/** A link that names nothing public: no hint of what it pointed at. */
export function UnavailableView({ onHome, onSellers }: { onHome: () => void; onSellers: () => void }) {
  return (
    <div data-unavailable style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 28px', textAlign: 'center' }}>
      <AdulisLogo size={44} />
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: '16px 0 6px', color: 'var(--color-text-primary)' }}>This page is not available</h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>The link does not open anything public on Adulis.</p>
      <button onClick={onSellers} style={{ ...BRAND, width: '100%', padding: 13, fontSize: 14, marginBottom: 8 }}>Browse Sellers</button>
      <button onClick={onHome} style={{ ...SOFT, width: '100%', padding: 13, fontSize: 14, fontWeight: 600 }}>Adulis Home</button>
    </div>
  )
}

function TopBar({ onBack, label, children }: { onBack: () => void; label: string; children?: ReactNode }) {
  return (
    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <button onClick={onBack} aria-label={label} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {children}
    </div>
  )
}

/** Every public Seller (Active only: a Draft or Suspended Seller is never listed), to open its Storefront. */
export function SellersView({ current, onBack, onOpen }: { current: SellerId; onBack: () => void; onOpen: (id: SellerId) => void }) {
  const ids = buyerVisibleSellers()
  return (
    <div data-sellers-directory style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar onBack={onBack} label="Back to the Storefront"><h1 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0 }}>Sellers on Adulis</h1></TopBar>
      <div role="list" aria-label="Sellers" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ids.map(id => (
          <div key={id} role="listitem">
            <button onClick={() => onOpen(id)} data-seller-row={id} aria-current={id === current ? 'true' : undefined} style={{ ...SOFT, width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', textAlign: 'left' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--color-brand-muted)', color: 'var(--color-brand-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{initials(SELLERS[id].name)}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{SELLERS[id].name}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>{SELLERS[id].handle} · {SELLERS[id].category}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'products' | 'scenes' | 'sellers'

/** Search across the whole public marketplace: the Buyer's index and ranking, its query and category facets, with no Buyer state (no recent searches). */
export function PublicSearch({ at, onBack, onProduct, onScene, onSeller }: {
  at: Moment; onBack: () => void
  onProduct: (seller: SellerId, id: ProductId) => void; onScene: (seller: SellerId, id: ShoppablePostId) => void; onSeller: (id: SellerId) => void
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('products')
  const [filters, setFilters] = useState<ProductFilters>(NO_FILTERS)
  const index = searchIndex(at)
  const matched = searchProducts(index.products, query)
  const products = searchProducts(index.products, query, filters)
  const scenes = searchScenes(index.scenes, query)
  const sellers = searchSellers(index.sellers, query)
  const active = query.trim().length > 0
  const facet = facets(matched)
  const counts: Record<Tab, number> = { products: matched.length, scenes: scenes.length, sellers: sellers.length }
  const chip = (on: boolean): CSSProperties => ({ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? 'var(--color-brand)' : 'var(--color-border)'}`, background: on ? 'var(--color-brand-muted)' : 'var(--color-surface)', color: on ? 'var(--color-brand-text)' : 'var(--color-text-secondary)' })
  const empty = (what: string) => <div role="status" style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>No {what} match “{query}”.</div>
  return (
    <div data-public-search style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar onBack={onBack} label="Back to the Storefront">
        <input autoFocus aria-label="Search Adulis" type="search" value={query} onChange={e => { setQuery(e.target.value); setFilters(NO_FILTERS) }} placeholder="Search Products, Scenes, Sellers" style={{ flex: 1, minWidth: 0, border: 'none', borderRadius: 10, background: 'var(--color-surface-raised)', padding: '9px 12px', fontSize: 13, color: 'var(--color-text-primary)' }} />
      </TopBar>
      {!active ? (
        <div style={{ padding: '24px 18px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0 }}>What are you looking for?</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>Search the Products, Scenes and Sellers anyone can see on Adulis.</p>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Result types" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', flexShrink: 0 }}>
            {(['products', 'scenes', 'sellers'] as Tab[]).map(t => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} style={{ flex: 1, padding: '11px 0', fontSize: 12, fontWeight: tab === t ? 700 : 500, textTransform: 'capitalize', background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t ? 'var(--color-brand-text)' : 'var(--color-text-muted)', borderBottom: tab === t ? '2px solid var(--color-brand)' : '2px solid transparent' }}>{t} {counts[t]}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {tab === 'products' && (
              <>
                <div role="group" aria-label="Product filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                  <button aria-pressed={filters.availableOnly} onClick={() => setFilters(f => ({ ...f, availableOnly: !f.availableOnly }))} style={chip(filters.availableOnly)}>Available</button>
                  <button aria-pressed={filters.locallyMade} onClick={() => setFilters(f => ({ ...f, locallyMade: !f.locallyMade }))} style={chip(filters.locallyMade)}>Locally made</button>
                  {facet.categories.map(c => <button key={c.name} aria-pressed={filters.category === c.name} onClick={() => setFilters(f => ({ ...f, category: f.category === c.name ? '' : c.name }))} style={chip(filters.category === c.name)}>{c.name} ({c.count})</button>)}
                </div>
                {products.length === 0 ? empty('Products') : (
                  <div role="list" aria-label="Products" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {products.map(d => {
                      const id = d.id as ProductId
                      return (
                        <div key={id} role="listitem">
                          <button onClick={() => onProduct(d.sellerId as SellerId, id)} data-result-product={id} style={{ ...SOFT, width: '100%', padding: '10px 12px', textAlign: 'left' }}>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{PRODUCTS[id].name}</span>
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--color-brand-text)', fontFamily: 'var(--font-mono)' }}>{formatEtb(currentPrice(id))}{d.available ? '' : ' · Currently unavailable'}</span>
                            <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>{d.sellerName}</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
            {tab === 'scenes' && (scenes.length === 0 ? empty('Scenes') : (
              <div role="list" aria-label="Scenes" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scenes.map(d => (
                  <div key={d.id} role="listitem">
                    <button onClick={() => onScene(d.sellerId as SellerId, d.id as ShoppablePostId)} data-result-scene={d.id} style={{ ...SOFT, width: '100%', padding: '10px 12px', textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{d.title}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>{d.sellerName} · {SHOPPABLE_POSTS[d.id as ShoppablePostId].tags.length} Products tagged</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
            {tab === 'sellers' && (sellers.length === 0 ? empty('Sellers') : (
              <div role="list" aria-label="Sellers" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sellers.map(d => (
                  <div key={d.id} role="listitem">
                    <button onClick={() => onSeller(d.id as SellerId)} data-result-seller={d.id} style={{ ...SOFT, width: '100%', padding: '10px 12px', textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{d.name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)' }}>{d.handle} · {d.category}</span>
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
