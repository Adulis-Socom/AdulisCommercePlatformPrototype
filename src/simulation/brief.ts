// DEMO-002: the Seller Console Home brief on the marketplace dataset (internal simulation). Pure TypeScript. The figures are counted from the same simulation state the Orders
// page and the Courier app read, so a transition made anywhere shows on Home. Nothing here is the MVP: the current MVP has no Orders, Claims or delivery exceptions.
import { isoAt } from './clock.ts'
import { ordersOfSeller, sortNewest, type SimOrder, type SimState, type World } from './orders.ts'

const DAY = 86_400_000
export interface SellerBrief {
  toPrepare: SimOrder[]; ready: SimOrder[]; exceptions: SimOrder[]
  claims: World['claims'][string][]
  /** The last seven simulated days, oldest first: simulated paid Orders per day and the total simulated value, from the Seller's own Orders. */
  week: { days: number[]; paid: number; gmv: number }
}

export function sellerBrief(w: World, s: SimState, sellerId: string): SellerBrief {
  const mine = ordersOfSeller(s, sellerId)
  const to = Date.parse(isoAt(s.now)), from = to - 7 * DAY
  const days = [0, 0, 0, 0, 0, 0, 0]
  let paid = 0, gmv = 0
  for (const o of mine) {
    const t = Date.parse(o.paidAt)
    if (t < from || t > to) continue
    days[Math.min(6, Math.floor((t - from) / DAY))]++; paid++; gmv += o.total
  }
  return {
    toPrepare: sortNewest(mine.filter(o => o.status === 'PAID' || o.status === 'PREPARING')),
    ready: mine.filter(o => o.status === 'READY_FOR_COLLECTION' || o.status === 'READY_FOR_DELIVERY'),
    exceptions: mine.filter(o => o.status === 'DELIVERY_FAILED'),
    claims: Object.values(w.claims).filter(c => c.sellerId === sellerId),
    week: { days, paid, gmv },
  }
}
