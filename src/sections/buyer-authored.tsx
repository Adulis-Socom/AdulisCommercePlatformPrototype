import { useMemo, type ReactNode } from 'react'
import { buyerVisibleSellers, initials, type Moment, type SellerId, type SellerStory, type SellerStoryGroup } from '../demo-data'
import { LIVE_PRODUCTS as PRODUCTS, LIVE_SELLERS as SELLERS } from '../demo-data/live'
import { formatBirr, linkableProducts, productPrices, productStock, variantPrice, sceneVisibility, stockState, storyPhase, useWorkspace, type WsProduct, type WsScene, type WorkspaceState } from '../seller-workspace'
import { Button } from '../components/ui/Button'

/**
 * MB-001 / MB-003: what a Seller authored in the Seller Console (src/seller-workspace.tsx) as the Buyer sees it. Read-only and
 * derived on every render, so the Seller's stock, publication and Story-clock changes show here without any copying.
 * Seeded DEMO_DATA Products and Scenes keep the Buyer's existing screens; only authored ids (PRD-NEW-, SCN-NEW-) open these.
 */
export type AuthoredView = { kind: 'scene' | 'product'; id: string; fromScene?: string }

const isSeededProduct = (id: string) => id in PRODUCTS

export interface AuthoredTag { id: string; name: string; available: boolean; seeded: boolean; x: number; y: number }
export interface AuthoredSceneView { id: string; seller: SellerId; caption: string; image: string | null; alt: string; tags: AuthoredTag[] }

function sceneView(scene: WsScene, state: WorkspaceState, at: Moment): AuthoredSceneView {
  const live = new Set(linkableProducts(state, scene.seller, at).map(p => p.id))
  return {
    id: scene.id, seller: scene.seller, caption: scene.caption, image: scene.image, alt: scene.alt,
    tags: scene.tags.map(tag => ({
      id: tag.product, available: live.has(tag.product), seeded: isSeededProduct(tag.product), x: tag.x, y: tag.y,
      name: state.products[tag.product]?.name || (isSeededProduct(tag.product) ? PRODUCTS[tag.product as keyof typeof PRODUCTS].name : 'Product'),
    })),
  }
}

/** The Buyer-visible authored content at `at`: public Scenes (newest first) and live Stories from Sellers Buyers can see. */
export function useAuthoredBuyer(at: Moment) {
  const { state } = useWorkspace()
  return useMemo(() => {
    const visible = buyerVisibleSellers()
    const scenes = Object.values(state.scenes)
      .filter(scene => visible.includes(scene.seller) && sceneVisibility(scene, state, at) === 'public')
      .sort((a, b) => b.updated - a.updated).map(scene => sceneView(scene, state, at))
    const stories: SellerStory[] = Object.values(state.stories).flatMap(story => {
      const { phase, hoursLeft } = storyPhase(story, state, at)
      if (phase !== 'live' || !visible.includes(story.seller) || !story.image) return []
      const link = story.link
      const seeded = link && isSeededProduct(link.id)
      const label = link ? (state.products[link.id]?.name || (link.kind === 'scene' ? state.scenes[link.id]?.caption : undefined) || (seeded ? PRODUCTS[link.id as keyof typeof PRODUCTS].name : undefined) || 'this item') : undefined
      return [{
        id: story.id as SellerStory['id'], seller: story.seller, kind: 'update' as const, text: story.text, posted: at.at, expires: at.at,
        image: story.image, alt: story.alt, hoursLeft,
        ...(link && seeded ? { product: link.id as SellerStory['product'] } : {}),
        ...(link && !seeded ? { authoredLink: { kind: link.kind, id: link.id, label: label! } } : {}),
      }]
    })
    const mergeStoryGroups = (groups: readonly SellerStoryGroup[]): SellerStoryGroup[] => {
      const out = groups.map(g => ({ ...g, stories: [...g.stories] }))
      for (const story of stories) {
        const group = out.find(g => g.seller === story.seller)
        if (group) group.stories.push(story); else out.unshift({ seller: story.seller, stories: [story] })
      }
      return out
    }
    // Published authored Products (out-of-stock ones stay viewable, labelled) for Search.
    const products = Object.values(state.products).filter(p => !p.seeded && p.status === 'published' && visible.includes(p.seller))
      .map(p => ({ id: p.id, name: p.name, price: priceLabel(p), state: stockState(productStock(p)), seller: p.seller }))
    return { state, scenes, products, mergeStoryGroups }
  }, [state, at])
}

// ---------- Home feed unit ----------
export function AuthoredSceneCard({ scene, onExplore, onSeller }: { scene: AuthoredSceneView; onExplore: () => void; onSeller: () => void }) {
  const seller = SELLERS[scene.seller]
  return (
    <article aria-label={`${scene.caption}, by ${seller.name}`} className="h-[calc(100%-20px)] min-h-[360px] snap-start px-3 pt-2.5">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-shrink-0 items-center gap-2 px-3 py-1 text-xs">
          <button onClick={onSeller} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">{initials(seller.name)}</span>
            <span className="truncate text-sm font-semibold text-text-primary">{seller.name}</span>
          </button>
          <span className="flex-shrink-0 rounded-full bg-info-bg px-2 py-0.5 text-[10px] font-semibold text-info">New from your Seller session</span>
        </div>
        <div className="relative min-h-0 flex-1 bg-surface-raised">
          {scene.image && <img src={scene.image} alt={scene.alt} className="absolute inset-0 h-full w-full object-cover" />}
          <button onClick={onExplore} aria-label={`Explore the Scene: ${scene.caption}, by ${seller.name}`} style={{ outlineColor: 'var(--color-text-inverse)', outlineOffset: '-5px' }} className="absolute inset-0 h-full w-full" />
        </div>
        <div className="flex flex-shrink-0 items-center gap-3 px-3 py-2.5">
          <p className="min-w-0 flex-1 truncate text-sm text-text-primary">{scene.caption}</p>
          <Button size="sm" onClick={onExplore}>Explore the Scene</Button>
        </div>
      </div>
    </article>
  )
}

// ---------- Search ----------
/** Authored Products and Scenes whose name or caption contains the query (case-insensitive). Nothing shows when nothing matches. */
export function AuthoredSearchResults({ query, content, onOpen }: { query: string; content: ReturnType<typeof useAuthoredBuyer>; onOpen: (v: AuthoredView) => void }) {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const products = content.products.filter(p => p.name.toLowerCase().includes(q))
  const scenes = content.scenes.filter(s => s.caption.toLowerCase().includes(q))
  if (!products.length && !scenes.length) return null
  return (
    <section aria-label="Results from Sellers' new content" className="mb-4 rounded-xl border border-border bg-surface p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">New from Sellers</h2>
      <ul className="flex flex-col gap-2">
        {products.map(p => <li key={p.id}><button onClick={() => onOpen({ kind: 'product', id: p.id })} className="flex w-full items-center justify-between rounded-lg bg-surface-raised p-3 text-left text-sm"><span><span className="block font-semibold text-text-primary">{p.name}</span><span className="text-xs text-text-secondary">{SELLERS[p.seller].name} · {p.price}</span></span><span className="text-xs font-semibold text-text-muted">{p.state}</span></button></li>)}
        {scenes.map(s => <li key={s.id}><button onClick={() => onOpen({ kind: 'scene', id: s.id })} className="flex w-full items-center justify-between rounded-lg bg-surface-raised p-3 text-left text-sm"><span><span className="block font-semibold text-text-primary">{s.caption}</span><span className="text-xs text-text-secondary">Scene · {SELLERS[s.seller].name}</span></span><span aria-hidden="true">›</span></button></li>)}
      </ul>
    </section>
  )
}

// ---------- Screens ----------
function Bar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex h-13 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <button onClick={onBack} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-text-primary">‹</button>
      <div className="flex-1 truncate font-display text-lg font-semibold text-text-primary">{title}</div>
    </div>
  )
}
function Unavailable({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <Bar title={title} onBack={onBack} />
      <div role="status" className="m-6 rounded-2xl border border-border bg-surface p-6 text-center"><div className="font-display text-lg font-semibold text-text-primary">Not available right now</div><p className="mt-1 text-sm text-text-secondary">{children}</p></div>
    </div>
  )
}

export function priceLabel(p: WsProduct): string {
  const prices = productPrices(p)
  if (!prices.length) return 'Price not set'
  const low = Math.min(...prices)
  return prices.some(x => x !== low) ? `From ${formatBirr(low)}` : formatBirr(low)
}

export function AuthoredScreen({ view, state, at, onBack, onOpen, onSeededProduct, onSeller }: {
  view: AuthoredView; state: WorkspaceState; at: Moment; onBack: () => void
  onOpen: (v: AuthoredView) => void; onSeededProduct: (id: string) => void; onSeller: (id: SellerId) => void
}) {
  if (view.kind === 'scene') {
    const scene = state.scenes[view.id]
    if (!scene || sceneVisibility(scene, state, at) !== 'public') return <Unavailable title="Scene" onBack={onBack}>This Scene is private or no longer published. It comes back on its own when its Products are available again.</Unavailable>
    const v = sceneView(scene, state, at)
    const seller = SELLERS[v.seller]
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-background">
        <Bar title="Explore the Scene" onBack={onBack} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative bg-surface-raised">
            {v.image && <img src={v.image} alt={v.alt} className="block w-full" />}
            {v.tags.filter(t => t.available).map((t, i) => (
              <button key={t.id + i} onClick={() => t.seeded ? onSeededProduct(t.id) : onOpen({ kind: 'product', id: t.id, fromScene: v.id })} aria-label={`Product ${i + 1}: ${t.name}`}
                style={{ left: `${t.x}%`, top: `${t.y}%`, outlineColor: 'var(--color-text-inverse)' }}
                className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand text-xs font-bold text-white shadow">{i + 1}</button>
            ))}
          </div>
          <div className="p-4">
            <button onClick={() => onSeller(v.seller)} className="text-sm font-semibold text-brand-text">{seller.name}</button>
            <p className="mt-1 text-base text-text-primary">{v.caption}</p>
            <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">Products in this Scene</h2>
            <ul className="flex flex-col gap-2">
              {v.tags.map((t, i) => (
                <li key={t.id + i}>
                  {t.available
                    ? <button onClick={() => t.seeded ? onSeededProduct(t.id) : onOpen({ kind: 'product', id: t.id, fromScene: v.id })} className="flex w-full items-center justify-between rounded-xl border border-border bg-surface p-3 text-left text-sm font-semibold text-text-primary"><span>{i + 1}. {t.name}</span><span aria-hidden="true">›</span></button>
                    : <div className="flex items-center justify-between rounded-xl border border-border bg-surface-raised p-3 text-sm text-text-muted"><span>{i + 1}. {t.name}</span><span>Not available right now</span></div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }
  const product = state.products[view.id]
  const live = !!product && !product.seeded && product.status === 'published'
  if (!live) return <Unavailable title="Product" onBack={onBack}>This Product is not published.</Unavailable>
  const seller = SELLERS[product.seller]
  const stock = productStock(product)
  const state_ = stockState(stock)
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <Bar title="Product" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div role="list" aria-label="Product photos" className="flex snap-x gap-2 overflow-x-auto bg-surface-raised p-3">
          {product.photos.map((src, i) => <img role="listitem" key={i} src={src} alt={`${product.name}, photo ${i + 1}`} className="h-64 w-64 flex-shrink-0 snap-center rounded-xl object-cover" />)}
        </div>
        <div className="p-4">
          <h1 className="font-display text-xl font-semibold text-text-primary">{product.name}</h1>
          <div className="mt-1 text-lg font-semibold text-text-primary">{priceLabel(product)}</div>
          <div className="mt-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${state_ === 'Out of Stock' ? 'bg-danger-bg text-danger' : state_ === 'Low Stock' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>{state_}</span></div>
          {product.description && <p className="mt-3 text-sm leading-relaxed text-text-secondary">{product.description}</p>}
          {product.variants.length > 0 && (
            <section aria-label="Options" className="mt-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Options</h2>
              <ul className="flex flex-col gap-1.5">{product.variants.map(v => {
                const n = Number(v.stock) || 0
                return <li key={v.key} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm"><span className="text-text-primary">{v.label}</span><span className={n > 0 ? 'text-text-secondary' : 'text-text-muted'}>{n > 0 ? (variantPrice(product, v) === null ? 'Price not set' : formatBirr(variantPrice(product, v)!)) : 'Out of Stock'}</span></li>
              })}</ul>
            </section>
          )}
          {(Object.keys(product.attributes).length > 0 || product.customAttributes.length > 0) && (
            <section aria-label="Details" className="mt-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Details</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                {[...Object.entries(product.attributes), ...product.customAttributes.map(a => [a.name, a.value] as [string, string])].filter(([, value]) => value).map(([name, value]) => <div key={name} className="contents"><dt className="text-text-muted">{name}</dt><dd className="text-text-primary">{value}</dd></div>)}
              </dl>
            </section>
          )}
          <p className="mt-4 text-xs text-text-muted">Sold by <button onClick={() => onSeller(product.seller)} className="font-semibold text-brand-text">{seller.name}</button>. Ordering is not available yet: Release 1 shows Products, Scenes and Stories only.</p>
          {view.fromScene && <div className="mt-4"><Button variant="secondary" onClick={() => onOpen({ kind: 'scene', id: view.fromScene! })}>Back to the Scene</Button></div>}
        </div>
      </div>
    </div>
  )
}
