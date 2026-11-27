// DEMO-003: where the active Buyer is, for every surface that decides what reaches them (delivery, Nearby, the chatbot's answers).
// The legacy dataset has one city (the Market's) and no Buyer districts, so it behaves exactly as before.
import { isLegacy } from '../marketplace/registry.ts'
import type { Geo } from '../marketplace/geography.ts'
import { BUYERS, BUYER_IDS, SELLERS, SELLER_IDS } from './base.ts'
import { MARKET } from './records/market.ts'

export type { Geo }
/** A Buyer's own city and area (the legacy Buyers: the Market city and their delivery area, if any). */
export function buyerGeo(buyer: string): Geo {
  const b = (BUYERS as Record<string, { city?: string; deliveryArea?: string } | undefined>)[buyer]
  return { city: b?.city ?? MARKET.city, area: b?.deliveryArea ?? null }
}

const LEGACY_GEO: Geo = { city: MARKET.city, area: null }
// Shortcut: one module-level value, published by the Buyer app while it is mounted (the same pattern as setLiveOverlay), so the chatbot world and
// the fulfilment rules need no Buyer parameter. null = no Buyer identity (a guest, the Storefront, the Test Lab): what a Seller offers is described
// without claiming it reaches anyone. Upgrade to an explicit parameter if a second Buyer surface is ever mounted at once.
let active: Geo | null = isLegacy ? LEGACY_GEO : null
export const setActiveGeo = (geo: Geo | null) => { active = isLegacy ? LEGACY_GEO : geo }
export const activeGeo = (): Geo | null => active

/** The city an area belongs to (a Seller's or a Buyer's), when the dataset says. */
export function cityOfArea(area: string): string | undefined {
  for (const id of SELLER_IDS) if (SELLERS[id].area === area && SELLERS[id].city) return SELLERS[id].city
  for (const id of BUYER_IDS) if (BUYERS[id].deliveryArea === area && BUYERS[id].city) return BUYERS[id].city
  return undefined
}
