// The generated marketplace data (tools/marketplace/build.mjs) with the indexes the adapter and the surfaces join on. Source rows are
// returned exactly as supplied; nothing is renamed or repaired here. `pnpm run data:build` regenerates src/marketplace/data/*.
import catalogueJson from './data/catalogue.json' with { type: 'json' }
import operationsJson from './data/operations.json' with { type: 'json' }
import type { Analytics, Catalogue, OperationsCore } from './types.ts'

export const CATALOGUE = catalogueJson as unknown as Catalogue
export const OPERATIONS = operationsJson as unknown as OperationsCore

function group<T>(rows: readonly T[], key: (row: T) => string | null | undefined): ReadonlyMap<string, readonly T[]> {
  const out = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (k == null) continue
    const list = out.get(k)
    if (list) list.push(row)
    else out.set(k, [row])
  }
  return out
}
const unique = <T>(rows: readonly T[], key: (row: T) => string): ReadonlyMap<string, T> => new Map(rows.map(r => [key(r), r]))

export const INDEX = {
  seller: unique(CATALOGUE.sellers, r => r.seller_id),
  product: unique(CATALOGUE.products, r => r.product_id),
  variant: unique(CATALOGUE.variants, r => r.variant_id),
  scene: unique(CATALOGUE.scenes, r => r.scene_id),
  buyer: unique(OPERATIONS.buyers, r => r.buyer_id),
  courier: unique(OPERATIONS.couriers, r => r.courier_id),
  member: unique(OPERATIONS.team_members, r => r.member_id),
  order: unique(OPERATIONS.orders, r => r.order_id),
  productsBySeller: group(CATALOGUE.products, r => r.seller_id),
  scenesBySeller: group(CATALOGUE.scenes, r => r.seller_id),
  storiesBySeller: group(CATALOGUE.stories, r => r.seller_id),
  variantsByProduct: group(CATALOGUE.variants, r => r.product_id),
  membersBySeller: group(OPERATIONS.team_members, r => r.seller_id),
  tasksBySeller: group(OPERATIONS.tasks, r => r.seller_id),
  ordersBySeller: group(OPERATIONS.orders, r => r.seller_id),
  ordersByBuyer: group(OPERATIONS.orders, r => r.buyer_id),
  linesByOrder: group(OPERATIONS.order_lines, r => r.order_id),
  eventsByOrder: group(OPERATIONS.order_events, r => r.order_id),
  handoffsByOrder: group(OPERATIONS.handoffs, r => r.order_id),
  followsByBuyer: group(OPERATIONS.follows, r => r.buyer_id),
  collectionsByBuyer: group(OPERATIONS.collections, r => r.buyer_id),
  savesByBuyer: group(OPERATIONS.saves, r => r.buyer_id),
  cartByBuyer: group(OPERATIONS.cart_lines, r => r.buyer_id),
  chatByBuyer: group(OPERATIONS.chat_messages, r => r.buyer_id),
} as const

/** The weekly analytics series, loaded only when a surface asks for them (a separate chunk). No import attribute: Vite's dev server serves JSON as a script module and rejects one. */
export const loadAnalytics = async (): Promise<Analytics> => (await import('./data/analytics.json')).default as unknown as Analytics
