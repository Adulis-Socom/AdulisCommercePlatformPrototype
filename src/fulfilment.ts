// DATA-FIX-02: ONE effective fulfilment for every surface (Buyer Product page, Seller page, Storefront, Cart, checkout review, chatbot).
// A Seller's methods come from its CURRENT Store setup (the Seller Console) when it has one, else from the seeded record; a Product may
// narrow them further. Nothing here invents a commercial policy: where the Seller set no delivery charge the charge is `null` ("not set"),
// and the historical Courier compensation (a payout to a Courier, DEMO_DATA) is never shown as an MVP delivery charge.
import { MARKET, fulfilmentOptionsAt, formatEtb, type Moment, type SellerId } from './demo-data'
import { COVERAGE_AREAS, parseMoney, type Fulfilment, type WorkspaceState } from './seller-workspace'

export interface Method { mode: Fulfilment; charge: number | null; place?: string; hours?: string; coverage?: string }
export const MODES: readonly Fulfilment[] = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']

/** Santim for a Seller-entered delivery charge: 0 for "0" (free), null while blank or invalid. */
export const chargeOf = (text: string): number | null => (/^0+(\.0{1,2})?$/.test(text.trim()) ? 0 : parseMoney(text))

/**
 * Whether a delivery method reaches the Buyer's Market city. Only an explicit list of cities can exclude: no list (or only places inside a
 * city) leaves coverage unspecified, which is treated as unrestricted, exactly as before. Shortcut: a Buyer's own district is not matched; upgrade
 * when the marketplace dataset carries Buyer districts.
 */
export function coversBuyer(coverage: readonly string[]): boolean {
  const cities = coverage.filter(c => (COVERAGE_AREAS as readonly string[]).includes(c) && !/nationwide/i.test(c))
  const nationwide = coverage.some(c => /nationwide/i.test(c))
  if (!cities.length && !nationwide) return true
  return nationwide || cities.some(c => c.toLowerCase() === MARKET.city.toLowerCase())
}

/** The Seller's methods now, with the reason each delivery method that is configured but cannot serve this Buyer is left out. */
export function sellerMethods(state: WorkspaceState, seller: SellerId, at: Moment, simulation = false): { methods: Method[]; unavailable: { mode: Fulfilment; reason: string }[] } {
  const setup = state.setup[seller]
  const methods: Method[] = []
  const unavailable: { mode: Fulfilment; reason: string }[] = []
  if (simulation || !setup || setup.blank) {
    // The seeded record (and the historical simulation, which always uses it). Courier Delivery's seeded amount is the Courier's compensation: MVP shows no charge for it.
    for (const o of fulfilmentOptionsAt(seller, at)) {
      const charge = o.mode === 'Courier Delivery' && !simulation ? null : o.charge
      if (!simulation && o.mode === 'Seller Delivery' && o.coverage && !new RegExp(MARKET.city, 'i').test(o.coverage)) { unavailable.push({ mode: o.mode, reason: `Delivery is ${o.coverage}.` }); continue }
      methods.push({ mode: o.mode, charge, place: o.place, hours: o.hours, coverage: o.coverage })
    }
    return { methods, unavailable }
  }
  const delivers = coversBuyer(setup.coverage)
  if (setup.collection.on) methods.push({ mode: 'Buyer Collection', charge: 0, place: setup.collection.place.trim() || undefined })
  if (setup.sellerDelivery.on) {
    if (delivers) methods.push({ mode: 'Seller Delivery', charge: chargeOf(setup.sellerDelivery.fee) })
    else unavailable.push({ mode: 'Seller Delivery', reason: `The Seller does not currently deliver to ${MARKET.city}.` })
  }
  if (setup.courier) {
    if (delivers) methods.push({ mode: 'Courier Delivery', charge: null })
    else unavailable.push({ mode: 'Courier Delivery', reason: `The Seller does not currently deliver to ${MARKET.city}.` })
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
export function cartFulfilment(state: WorkspaceState, seller: SellerId, products: readonly { id: string; name: string }[], at: Moment, simulation = false): CartFulfilment {
  const base = sellerMethods(state, seller, at, simulation)
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
