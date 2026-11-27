// DEMO-003: the Buyer's real city and area against a Seller's city, area, coverage and fulfilment. Pure TypeScript (no React, safe in Node).
// Nothing here invents a promise: coverage the data does not state is `unknown`, "X by arrangement" is `arrangement`, and neither is a delivery.

export interface Geo { city: string; area: string | null }
/** `yes` the Seller states it delivers there; `arrangement` only by agreement with the Seller; `no` it states other places; `unknown` it states nothing usable. */
export type Reach = 'yes' | 'arrangement' | 'no' | 'unknown'

const norm = (text: string) => text.trim().toLowerCase()
const ARRANGEMENT = /\s+by arrangement$/i

/** Coverage text ("Addis Ababa; Adama", "Adama; Addis Ababa by arrangement") or a list of places, against the Buyer's city and area. */
export function deliveryTo(coverage: string | readonly string[] | null | undefined, geo: Geo): Reach {
  const entries = (Array.isArray(coverage) ? coverage : String(coverage ?? '').split(/[;,]/)).map((e: string) => e.trim()).filter(e => e && !/^not configured$/i.test(e))
  if (!entries.length) return 'unknown'
  let arrangement = false
  for (const entry of entries) {
    const byArrangement = ARRANGEMENT.test(entry)
    const place = norm(entry.replace(ARRANGEMENT, '')).replace(/^within\s+/, '')
    if (!(place.includes('nationwide') || place === norm(geo.city) || (geo.area !== null && place === norm(geo.area)))) continue
    if (byArrangement) arrangement = true
    else return 'yes'
  }
  return arrangement ? 'arrangement' : 'no'
}

/** Whether a Seller's fulfilment text (sellers[].fulfilment, "Collection; Seller Delivery") offers Buyer Collection. "Not configured" offers nothing. */
export const offersCollection = (fulfilment: string | null | undefined) => /\bCollection\b/.test(fulfilment ?? '')

/** Sellers near a place: the same area first, then the rest of the same city, each in the given order. Other cities are not near. */
export function rankNearby<T extends { id: string; city: string; area: string }>(sellers: readonly T[], place: Geo): string[] {
  const sameCity = sellers.filter(s => norm(s.city) === norm(place.city))
  const sameArea = sameCity.filter(s => place.area !== null && norm(s.area) === norm(place.area))
  return [...sameArea, ...sameCity.filter(s => !sameArea.includes(s))].map(s => s.id)
}
