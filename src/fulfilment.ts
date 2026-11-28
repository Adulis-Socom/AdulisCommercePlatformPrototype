// DATA-FIX-02: ONE effective fulfilment for every surface (Buyer Product page, Seller page, Storefront, Cart, checkout review, chatbot).
// A Seller's methods come from its CURRENT Store setup (the Seller Console) when it has one, else from the seeded record; a Product may
// narrow them further. Nothing here invents a commercial policy: where the Seller set no delivery charge the charge is `null` ("not set"),
// and the historical Courier compensation (a payout to a Courier, DEMO_DATA) is never shown as an MVP delivery charge.
import { activeGeo, fulfilmentOptionsAt, formatEtb, SELLERS, type Geo, type Moment, type SellerId } from './demo-data'
import { COVERAGE_AREAS, parseMoney, type Fulfilment, type WorkspaceState } from './seller-workspace'
import { isLegacy } from './marketplace/registry'
import { CATALOGUE } from './marketplace/import'
import { deliveryTo, type Reach } from './marketplace/geography'

export interface Method { mode: Fulfilment; charge: number | null; place?: string; hours?: string; coverage?: string }
export const MODES: readonly Fulfilment[] = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']

/** Santim for a Seller-entered delivery charge: 0 for "0" (free), null while blank or invalid. */
export const chargeOf = (text: string): number | null => (/^0+(\.0{1,2})?$/.test(text.trim()) ? 0 : parseMoney(text))

/**
 * Whether a Seller's stated coverage (a list of places, or the dataset's coverage text) reaches the Buyer's city and area (DEMO-003).
 * No Buyer place (a guest, the Storefront): nothing to check, so the Seller's offer is described as listed. On the marketplace dataset coverage that
 * is blank, "Not configured" or "X by arrangement" never reaches anyone. The legacy dataset keeps its old rule: only an explicit list of cities can
 * exclude, anything unspecified is unrestricted.
 */
export function reach(coverage: string | readonly string[] | undefined, geo: Geo | null = activeGeo()): Reach {
  if (!geo) return 'yes'
  if (!isLegacy) return deliveryTo(coverage, geo)
  if (typeof coverage === 'string') return !coverage || new RegExp(geo.city, 'i').test(coverage) ? 'yes' : 'no'
  const list = coverage ?? []
  const cities = list.filter(c => (COVERAGE_AREAS as readonly string[]).includes(c) && !/nationwide/i.test(c))
  const nationwide = list.some(c => /nationwide/i.test(c))
  if (!cities.length && !nationwide) return 'yes'
  return nationwide || cities.some(c => c.toLowerCase() === geo.city.toLowerCase()) ? 'yes' : 'no'
}
export const coversBuyer = (coverage: readonly string[], geo: Geo | null = activeGeo()): boolean => reach(coverage, geo) === 'yes'

/** Why a delivery method does not reach the Buyer: never a promise where the data states none. */
function whyNot(result: Reach, geo: Geo, coverage?: string): string {
  if (result === 'arrangement') return `Delivery to ${geo.city} is by arrangement with the Seller only, so no delivery is promised.`
  if (result === 'unknown') return `This Seller has not said whether it delivers to ${geo.city}, so no delivery is promised.`
  return coverage && isLegacy ? `Delivery is ${coverage}.` : coverage ? `This Seller delivers to ${coverage}, not to ${geo.city}.` : `The Seller does not currently deliver to ${geo.city}.`
}

/** The Seller's methods now, with the reason each delivery method that is configured but cannot serve this Buyer is left out. */
export function sellerMethods(state: WorkspaceState, seller: SellerId, at: Moment, simulation = false, geo: Geo | null = activeGeo()): { methods: Method[]; unavailable: { mode: Fulfilment; reason: string }[] } {
  const setup = state.setup[seller]
  const methods: Method[] = []
  const unavailable: { mode: Fulfilment; reason: string }[] = []
  if (simulation || !setup || setup.blank) {
    // The seeded record (and the historical simulation, which always uses it). Courier Delivery's seeded amount is the Courier's compensation: MVP shows no charge for it.
    for (const o of fulfilmentOptionsAt(seller, at)) {
      // Marketplace dataset: its Seller Delivery charge is the one carried by simulated Orders (assumption A2), not a charge the Seller set, so the MVP shows "fee not set".
      const charge = !simulation && (o.mode === 'Courier Delivery' || (o.mode === 'Seller Delivery' && !isLegacy)) ? null : o.charge
      const result = o.mode === 'Seller Delivery' && !simulation && geo ? reach(o.coverage, geo) : 'yes'
      if (result !== 'yes' && geo) { unavailable.push({ mode: o.mode, reason: whyNot(result, geo, o.coverage) }); continue }
      methods.push({ mode: o.mode, charge, place: o.place, hours: o.hours, coverage: o.coverage })
    }
    return { methods, unavailable }
  }
  const result = reach(setup.coverage, geo)
  const delivers = result === 'yes'
  const why = geo ? whyNot(result, geo) : ''
  if (setup.collection.on) methods.push({ mode: 'Buyer Collection', charge: 0, place: setup.collection.place.trim() || undefined })
  if (setup.sellerDelivery.on) {
    if (delivers) methods.push({ mode: 'Seller Delivery', charge: chargeOf(setup.sellerDelivery.fee) })
    else unavailable.push({ mode: 'Seller Delivery', reason: why })
  }
  if (setup.courier) {
    if (delivers) methods.push({ mode: 'Courier Delivery', charge: null })
    else unavailable.push({ mode: 'Courier Delivery', reason: why })
  }
  return { methods, unavailable }
}

/** The methods a Product itself allows: its own fulfilment list once the Seller has authored or edited it; null = no Product-level limit (seeded, never edited). */
export const productModes = (state: WorkspaceState, productId: string): readonly Fulfilment[] | null => state.products[productId]?.fulfilment ?? null

export interface CartFulfilment {
  /** Methods the Seller offers now AND every Product in the cart allows, in Seller order. */
  methods: Method[]
  /** Methods the Seller offers now that some Product rules out (named), or that cannot serve this Buyer. */
  excluded: { mode: Fulfilment; reason: string }[]
  /** Why there is nothing to choose, when `methods` is empty. */
  none: string | null
}

/** What a Seller cart may choose now: Seller configuration ∩ every Product's own methods. */
export function cartFulfilment(state: WorkspaceState, seller: SellerId, products: readonly { id: string; name: string }[], at: Moment, simulation = false, geo: Geo | null = activeGeo()): CartFulfilment {
  const base = sellerMethods(state, seller, at, simulation, geo)
  if (simulation) return { methods: base.methods, excluded: [], none: base.methods.length ? null : 'This Seller offers no fulfilment method.' }
  const excluded = [...base.unavailable]
  const methods = base.methods.filter(m => {
    const blockers = products.filter(p => { const modes = productModes(state, p.id); return modes && !modes.includes(m.mode) })
    if (blockers.length) excluded.push({ mode: m.mode, reason: `${blockers.map(p => p.name).join(' and ')} ${blockers.length === 1 ? 'is' : 'are'} not offered for ${m.mode}.` })
    return !blockers.length
  })
  const none = methods.length ? null
    : !base.methods.length ? `${excluded.length ? excluded.map(e => e.reason).join(' ') : 'This Seller has no fulfilment method set up.'}`
    : `The Products in this cart have no fulfilment method in common. ${excluded.map(e => e.reason).join(' ')} Remove one to continue.`
  return { methods, excluded, none }
}

/** 'Buyer Collection (free) · Seller Delivery ETB 120 · Courier Delivery (fee not set)': one line for a Seller's or Product's methods. */
export const describeMethods = (methods: readonly Method[]): string =>
  methods.length ? methods.map(m => (m.charge === null ? `${m.mode} (fee not set)` : m.charge ? `${m.mode} ${formatEtb(m.charge as never)}` : `${m.mode} (free)`)).join(' · ') : 'No fulfilment method is currently offered'

/** 'Fee not set', 'Free' or 'ETB 120': a method's delivery charge as Settings states it (never a Courier's compensation). */
export const chargeText = (m: Method): string => (m.charge === null ? 'Fee not set' : m.charge === 0 ? 'Free' : formatEtb(m.charge as never))

/**
 * FR-003: the areas a Seller serves, as the Buyer-side rules read them: the Store setup's own list once saved, else the Seller record's
 * statement (the dataset's coverage text, or the legacy Seller Delivery coverage, or the Seller's area). Never a literal of the screen's own.
 */
export function effectiveCoverage(state: WorkspaceState, seller: SellerId): string {
  const setup = state.setup[seller]
  if (setup && !setup.blank) return setup.coverage.join(', ') || 'None chosen'
  const record = SELLERS[seller]
  const stated = isLegacy ? record.sellerDelivery?.coverage : CATALOGUE.sellers.find(s => s.seller_id === seller)?.coverage
  return stated && !/^not configured$/i.test(stated.trim()) ? stated : 'Not stated'
}
