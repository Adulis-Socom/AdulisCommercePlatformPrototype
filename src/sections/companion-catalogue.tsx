import { currentPrice, type Moment, type ProductId, type SellerId } from '../demo-data'
import { LIVE_PRODUCTS as PRODUCTS, LIVE_SELLERS as SELLERS } from '../demo-data/live'
import { formatBirr, linkableProducts, productStock, stockState, useWorkspace } from '../seller-workspace'
import { fromSeed } from './console/ProductAuthoring'
import { priceLabel } from './buyer-authored'

/**
 * MC-001: the Seller Companion's lightweight catalogue (current MVP). Every Product the Seller can sell with its stock state and a
 * quick stock stepper, over the same workspace the Seller Console, Scenes, Stories and the Buyer read. Options, photos and
 * publishing stay in the Seller Console. A Product with Variants has stock per Variant, so it is not edited here.
 */
export function CatalogueTab({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state, dispatch } = useWorkspace()
  const rows = linkableProducts(state, sellerId, at, true)
  const setStock = (id: string, next: number) => {
    const seeded = id in PRODUCTS
    const base = seeded ? fromSeed(id as ProductId, sellerId, state, at) : state.products[id]
    if (!base || base.variants.length) return
    dispatch({ type: 'product', item: { ...base, stock: String(Math.max(0, next)), updated: Date.now() } })
  }
  return (
    <div className="p-4">
      <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold text-text-primary">Catalogue</h2><span className="text-xs text-text-muted">{rows.length} Products · {SELLERS[sellerId].name}</span></div>
      {rows.length === 0 && <p role="status" className="rounded-xl border border-border bg-surface p-4 text-sm text-text-secondary">No published Products yet. Create and publish a Product in the Seller Console.</p>}
      <ul aria-label="Products" className="flex flex-col gap-2">
        {rows.map(row => {
          const authored = state.products[row.id]
          const hasVariants = !!authored?.variants.length
          const price = authored && !authored.seeded ? priceLabel(authored) : formatBirr(currentPrice(row.id as ProductId))
          const label = stockState(row.stock)
          const tone = label === 'Out of Stock' ? 'bg-danger-bg text-danger' : label === 'Low Stock' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'
          return (
            <li key={row.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-sm font-semibold text-text-primary">{row.name}</div><div className="text-xs text-text-secondary">{price}</div></div><span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span></div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-text-muted">{hasVariants ? `${productStock(authored)} in stock across options` : `${row.stock} in stock`}</span>
                {hasVariants
                  ? <span className="text-[11px] text-text-muted">Edit options in Seller Console</span>
                  : <span className="flex items-center rounded-lg border border-border">
                      <button onClick={() => setStock(row.id, row.stock - 1)} disabled={row.stock <= 0} aria-label={`Decrease ${row.name} stock`} className="h-10 w-10 text-lg disabled:opacity-40">−</button>
                      <span aria-live="polite" className="w-9 text-center text-sm font-semibold">{row.stock}</span>
                      <button onClick={() => setStock(row.id, row.stock + 1)} aria-label={`Increase ${row.name} stock`} className="h-10 w-10 text-lg">+</button>
                    </span>}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">A stock change here reaches your Scenes, Stories and Buyers straight away. Photos, options and publishing stay in the Seller Console.</p>
    </div>
  )
}
