// DESIGN-002 (FR-005): the pure analytics rules behind the Seller Console Insights (marketplace dataset). No React, no clock, no randomness: every number is
// a sum or ratio of the supplied analytics rows (analytics.json) and operations rows (seller_summary, seller_reputation, reviews, product_ratings), and the
// SAME functions feed every Insights screen, so tests/unit/insights.mjs can reconcile them with the source.
//
// Windows. The eight weekly rows give 4 weeks CURRENT (the last four) and 4 weeks PRIOR (the first four), each exactly 28 days from week_start to week_end.
// Data semantics (README): synthetic aggregate observations, not the full audience; Merchandise GMV is simulated paid merchandise subtotal, not revenue;
// order counts across Product rows are NOT additive over multi-line orders; current-day active orders are excluded from the historical weeks; a blank rate
// or rating means insufficient evidence, never 0.

export const NOT_ENOUGH = 'Not enough data'
export const NEW_SELLER_NOTE = 'No history yet'

export interface SellerWeek {
  seller_id: string; week_start: string; week_end: string; scene_impressions: number; explore_opens: number; scene_product_opens: number; scene_saves: number
  product_detail_opens: number; product_saves: number; cart_additions: number; checkout_review_starts: number; new_followers: number; inquiries: number
  responded_inquiries: number; median_response_minutes: number | null
}
export interface SceneWeek {
  seller_id: string; scene_id: string; week_start: string; qualified_impressions: number; explore_opens: number; product_detail_opens: number; hotspot_taps: number
  likes: number; saves: number; shares: number; seller_inquiries: number
}
export interface ProductWeek {
  seller_id: string; product_id: string; week_start: string; detail_opens: number; scene_attributed_opens: number; other_opens: number; saves: number
  cart_additions: number; checkout_review_starts: number; seller_inquiries: number
}
export interface SimWeek {
  seller_id: string; week_start: string; simulated_paid_orders: number; simulated_completed_orders: number; merchandise_gmv_etb: number; cancelled_orders: number
  failed_delivery_orders: number; published_reviews: number
}
export interface SimProductPeriod { period: 'PRIOR_28D' | 'CURRENT_28D'; seller_id: string; product_id: string; simulated_paid_orders: number; simulated_completed_orders: number; units: number; merchandise_gmv_etb: number }
export interface SimScenePeriod { period: 'PRIOR_28D' | 'CURRENT_28D'; seller_id: string; scene_id: string; simulated_attributed_paid_orders: number; simulated_attributed_completed_orders: number; attributed_merchandise_gmv_etb: number }
export interface AnalyticsData {
  seller_weekly: SellerWeek[]; scene_weekly: SceneWeek[]; product_weekly: ProductWeek[]; simulation_weekly: SimWeek[]
  simulation_product_period: SimProductPeriod[]; simulation_scene_period: SimScenePeriod[]
}

// ---------- windows ----------
export interface Win { key: 'prior' | 'current'; label: string; weeks: string[]; start: string; end: string; days: number }
export interface Windows { weeks: { start: string; end: string }[]; prior: Win; current: Win }
const DAY = 86_400_000
const dayNumber = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** '2026-10-30' as '30 Oct'. */
export const fmtDay = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
/** '30 Oct to 26 Nov 2026'. */
export const fmtRange = (start: string, end: string) => `${fmtDay(start)} to ${fmtDay(end)} ${end.slice(0, 4)}`

/** The two 28-day windows, defined from the weekly rows' week_start/week_end (the first four weeks are PRIOR, the last four CURRENT). */
export function windowsOf(rows: readonly { week_start: string; week_end: string }[]): Windows {
  const ends = new Map<string, string>()
  for (const r of rows) ends.set(r.week_start, r.week_end)
  const weeks = [...ends.keys()].sort().map(start => ({ start, end: ends.get(start)! }))
  if (weeks.length !== 8) throw new Error(`Insights expects eight weeks, got ${weeks.length}`)
  const make = (key: Win['key'], label: string, part: typeof weeks): Win => ({
    key, label, weeks: part.map(w => w.start), start: part[0].start, end: part[3].end, days: dayNumber(part[3].end) - dayNumber(part[0].start) + 1,
  })
  return { weeks, prior: make('prior', 'Prior 28 days', weeks.slice(0, 4)), current: make('current', 'Current 28 days', weeks.slice(4)) }
}

// ---------- arithmetic ----------
export const sum = <T>(rows: readonly T[], pick: (row: T) => number | null | undefined): number => rows.reduce((total, row) => total + (pick(row) ?? 0), 0)
/** Part of a whole, or null when there is no whole (never 0: a blank rate is insufficient evidence). */
export const ratio = (part: number, whole: number): number | null => (whole > 0 ? part / whole : null)
export interface Delta { current: number; prior: number; /** Fractional change vs prior (0.12 = +12%); null when the prior window had none. */ change: number | null }
export const delta = (current: number, prior: number): Delta => ({ current, prior, change: prior > 0 ? (current - prior) / prior : null })
export interface RateDelta { current: number | null; prior: number | null; /** Percentage-point change, or null unless both windows have evidence. */ points: number | null }
export const rateDelta = (current: number | null, prior: number | null): RateDelta => ({ current, prior, points: current !== null && prior !== null ? (current - prior) * 100 : null })
export const median = (values: readonly number[]): number | null => {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b), mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
/** 0.1234 as '12.3%', null as 'Not enough data'. */
export const fmtPct = (v: number | null, digits = 1) => (v === null ? NOT_ENOUGH : `${(v * 100).toFixed(digits)}%`)
/** A change: '+12.4%', '−8.1%', '0%', or 'New' when the prior window had none and this one has. */
export function fmtChange(d: Delta): string {
  if (d.change === null) return d.current > 0 ? 'New (none in the prior 28 days)' : 'No activity in either window'
  const p = d.change * 100
  return Math.abs(p) < 0.05 ? '0%' : `${p > 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`
}

// ---------- the weekly slice of one Seller ----------
const byWeek = <T extends { week_start: string }>(rows: readonly T[]) => [...rows].sort((a, b) => a.week_start.localeCompare(b.week_start))
export const sellerWeeks = (a: AnalyticsData, sellerId: string) => byWeek(a.seller_weekly.filter(r => r.seller_id === sellerId))
export const simWeeks = (a: AnalyticsData, sellerId: string) => byWeek(a.simulation_weekly.filter(r => r.seller_id === sellerId))
const inWin = <T extends { week_start: string }>(rows: readonly T[], w: Win) => rows.filter(r => w.weeks.includes(r.week_start))

type NumKey<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T]
/** One metric of the Seller's weeks: its eight weekly values, both window totals and the change. */
export interface Metric { series: number[]; total: Delta }
const metric = <T extends { week_start: string }>(rows: readonly T[], w: Windows, key: NumKey<T>): Metric => ({
  series: rows.map(r => r[key] as number),
  total: delta(sum(inWin(rows, w.current), r => r[key] as number), sum(inWin(rows, w.prior), r => r[key] as number)),
})

/** Has the Seller any recorded activity in the eight weeks? A Draft Seller has none and gets an empty state, not a row of zeros. */
export const hasHistory = (a: AnalyticsData, sellerId: string) => sellerWeeks(a, sellerId).some(r =>
  r.scene_impressions + r.explore_opens + r.product_detail_opens + r.product_saves + r.cart_additions + r.inquiries + r.new_followers > 0)

// ---------- Overview ----------
/** The stepped view: discovery -> exploration -> Product interest -> Cart additions -> checkout review (review only) -> inquiries (a parallel route). */
export const FUNNEL_STEPS = [
  { key: 'scene_impressions', label: 'Scene impressions', stage: 'discovery' },
  { key: 'explore_opens', label: 'Explore opens', stage: 'exploration' },
  { key: 'product_detail_opens', label: 'Product detail opens', stage: 'interest' },
  { key: 'cart_additions', label: 'Cart additions', stage: 'interest' },
  { key: 'checkout_review_starts', label: 'Checkout-review starts (review only)', stage: 'interest' },
  { key: 'inquiries', label: 'Inquiries', stage: 'response' },
] as const satisfies readonly { key: keyof SellerWeek; label: string; stage: Stage }[]
export type Stage = 'discovery' | 'exploration' | 'interest' | 'response'

export const OVERVIEW_KEYS = ['scene_impressions', 'explore_opens', 'scene_product_opens', 'scene_saves', 'product_detail_opens', 'product_saves', 'cart_additions', 'checkout_review_starts', 'new_followers', 'inquiries', 'responded_inquiries'] as const
export type OverviewKey = (typeof OVERVIEW_KEYS)[number]

export interface Response { inquiries: Delta; responded: Delta; rate: RateDelta; /** Median of the weekly medians (weeks without a median excluded): weekly medians cannot be pooled exactly. */ medianMinutes: { current: number | null; prior: number | null; series: (number | null)[] }; rateSeries: (number | null)[] }
export interface Followers { opening: number; series: number[]; end: number; newCurrent: number; newPrior: number }
export interface Overview {
  windows: Windows; weeks: SellerWeek[]; metrics: Record<OverviewKey, Metric>
  rates: { explore: RateDelta; cartPerOpen: RateDelta; reviewPerCart: RateDelta; scenePerOpen: RateDelta }
  response: Response; followers: Followers
}

const rateOf = (rows: readonly SellerWeek[], part: keyof SellerWeek, whole: keyof SellerWeek) => ratio(sum(rows, r => r[part] as number), sum(rows, r => r[whole] as number))
export function followerTrend(weeks: readonly SellerWeek[], opening: number): Followers {
  let running = opening
  const series = weeks.map(w => (running += w.new_followers))
  return { opening, series, end: running, newCurrent: sum(weeks.slice(4), w => w.new_followers), newPrior: sum(weeks.slice(0, 4), w => w.new_followers) }
}

export function overview(a: AnalyticsData, sellerId: string, openingFollowers: number): Overview {
  const weeks = sellerWeeks(a, sellerId), windows = windowsOf(a.seller_weekly)
  const metrics = Object.fromEntries(OVERVIEW_KEYS.map(k => [k, metric(weeks, windows, k)])) as Record<OverviewKey, Metric>
  const cur = inWin(weeks, windows.current), pri = inWin(weeks, windows.prior)
  const medianOf = (rows: readonly SellerWeek[]) => median(rows.flatMap(r => (r.median_response_minutes === null ? [] : [r.median_response_minutes])))
  return {
    windows, weeks, metrics,
    rates: {
      explore: rateDelta(rateOf(cur, 'explore_opens', 'scene_impressions'), rateOf(pri, 'explore_opens', 'scene_impressions')),
      cartPerOpen: rateDelta(rateOf(cur, 'cart_additions', 'product_detail_opens'), rateOf(pri, 'cart_additions', 'product_detail_opens')),
      reviewPerCart: rateDelta(rateOf(cur, 'checkout_review_starts', 'cart_additions'), rateOf(pri, 'checkout_review_starts', 'cart_additions')),
      scenePerOpen: rateDelta(rateOf(cur, 'scene_product_opens', 'product_detail_opens'), rateOf(pri, 'scene_product_opens', 'product_detail_opens')),
    },
    response: {
      inquiries: metrics.inquiries.total, responded: metrics.responded_inquiries.total,
      rate: rateDelta(ratio(metrics.responded_inquiries.total.current, metrics.inquiries.total.current), ratio(metrics.responded_inquiries.total.prior, metrics.inquiries.total.prior)),
      medianMinutes: { current: medianOf(cur), prior: medianOf(pri), series: weeks.map(w => w.median_response_minutes) },
      rateSeries: weeks.map(w => ratio(w.responded_inquiries, w.inquiries)),
    },
    followers: followerTrend(weeks, openingFollowers),
  }
}

/** The stepped bars' rows: both windows' totals per step. */
export const funnel = (o: Overview) => FUNNEL_STEPS.map(s => ({ ...s, total: o.metrics[s.key as OverviewKey].total, series: o.metrics[s.key as OverviewKey].series }))

// ---------- Scenes ----------
export interface SceneRow {
  sceneId: string
  /** Product detail opens that started in this Scene (hotspot to Product). */
  productOpens: Metric; impressions: Metric; explore: Metric; hotspotTaps: Metric; likes: Metric; saves: Metric; shares: Metric; inquiries: Metric
  exploreRate: RateDelta
}
export const sceneIds = (a: AnalyticsData, sellerId: string) => [...new Set(a.scene_weekly.filter(r => r.seller_id === sellerId).map(r => r.scene_id))].sort()
export function sceneRows(a: AnalyticsData, sellerId: string): SceneRow[] {
  const w = windowsOf(a.seller_weekly)
  return sceneIds(a, sellerId).map(id => {
    const rows = byWeek(a.scene_weekly.filter(r => r.scene_id === id)), cur = inWin(rows, w.current), pri = inWin(rows, w.prior)
    const rate = (rs: typeof rows) => ratio(sum(rs, r => r.explore_opens), sum(rs, r => r.qualified_impressions))
    return {
      sceneId: id, productOpens: metric(rows, w, 'product_detail_opens'), impressions: metric(rows, w, 'qualified_impressions'), explore: metric(rows, w, 'explore_opens'),
      hotspotTaps: metric(rows, w, 'hotspot_taps'), likes: metric(rows, w, 'likes'), saves: metric(rows, w, 'saves'), shares: metric(rows, w, 'shares'), inquiries: metric(rows, w, 'seller_inquiries'),
      exploreRate: rateDelta(rate(cur), rate(pri)),
    }
  })
}
/** Ranked by current-window Product opens, then Explore opens, then id (a stable order). */
export const rankScenes = (rows: readonly SceneRow[]) => [...rows].sort((x, y) =>
  y.productOpens.total.current - x.productOpens.total.current || y.explore.total.current - x.explore.total.current || x.sceneId.localeCompare(y.sceneId))

/** Scene attribution per week: the Scenes' Product opens, the Seller's Scene-attributed Product opens (product_weekly), and every Product open. README: they reconcile. */
export function sceneAttribution(a: AnalyticsData, sellerId: string) {
  return sellerWeeks(a, sellerId).map(w => {
    const scenes = sum(a.scene_weekly.filter(r => r.seller_id === sellerId && r.week_start === w.week_start), r => r.product_detail_opens)
    const products = a.product_weekly.filter(r => r.seller_id === sellerId && r.week_start === w.week_start)
    return { weekStart: w.week_start, scenes, sellerSceneOpens: w.scene_product_opens, productAttributed: sum(products, r => r.scene_attributed_opens), productOther: sum(products, r => r.other_opens), allOpens: w.product_detail_opens }
  })
}
/** Where the current and prior windows' Product opens came from: Scenes or elsewhere (Storefront, search, Follows ...). */
export function openSources(o: Overview) {
  const scene = o.metrics.scene_product_opens.total, all = o.metrics.product_detail_opens.total
  return { scene, other: delta(all.current - scene.current, all.prior - scene.prior), all }
}

// ---------- Products ----------
export interface ProductRow {
  productId: string; opens: Metric; sceneOpens: Metric; otherOpens: Metric; saves: Metric; cart: Metric; review: Metric; inquiries: Metric
  cartPerOpen: RateDelta
}
export const productIds = (a: AnalyticsData, sellerId: string) => [...new Set(a.product_weekly.filter(r => r.seller_id === sellerId).map(r => r.product_id))].sort()
export function productRows(a: AnalyticsData, sellerId: string): ProductRow[] {
  const w = windowsOf(a.seller_weekly)
  return productIds(a, sellerId).map(id => {
    const rows = byWeek(a.product_weekly.filter(r => r.product_id === id)), cur = inWin(rows, w.current), pri = inWin(rows, w.prior)
    const rate = (rs: typeof rows) => ratio(sum(rs, r => r.cart_additions), sum(rs, r => r.detail_opens))
    return {
      productId: id, opens: metric(rows, w, 'detail_opens'), sceneOpens: metric(rows, w, 'scene_attributed_opens'), otherOpens: metric(rows, w, 'other_opens'), saves: metric(rows, w, 'saves'),
      cart: metric(rows, w, 'cart_additions'), review: metric(rows, w, 'checkout_review_starts'), inquiries: metric(rows, w, 'seller_inquiries'), cartPerOpen: rateDelta(rate(cur), rate(pri)),
    }
  })
}
/** Ranked by current-window Product detail opens, then Cart additions, then id. */
export const rankProducts = (rows: readonly ProductRow[]) => [...rows].sort((x, y) =>
  y.opens.total.current - x.opens.total.current || y.cart.total.current - x.cart.total.current || x.productId.localeCompare(y.productId))

// ---------- internal simulation (never shown in the current MVP) ----------
export interface SimOverview { paid: Metric; completed: Metric; gmv: Metric; cancelled: Metric; failed: Metric; reviews: Metric; completionRate: RateDelta }
export function simulationOverview(a: AnalyticsData, sellerId: string): SimOverview {
  const w = windowsOf(a.seller_weekly), rows = simWeeks(a, sellerId), cur = inWin(rows, w.current), pri = inWin(rows, w.prior)
  const rate = (rs: typeof rows) => ratio(sum(rs, r => r.simulated_completed_orders), sum(rs, r => r.simulated_paid_orders))
  return {
    paid: metric(rows, w, 'simulated_paid_orders'), completed: metric(rows, w, 'simulated_completed_orders'), gmv: metric(rows, w, 'merchandise_gmv_etb'),
    cancelled: metric(rows, w, 'cancelled_orders'), failed: metric(rows, w, 'failed_delivery_orders'), reviews: metric(rows, w, 'published_reviews'), completionRate: rateDelta(rate(cur), rate(pri)),
  }
}
const periodOf = <T extends { period: string }>(rows: readonly T[], p: 'PRIOR_28D' | 'CURRENT_28D'): T[] => rows.filter(r => r.period === p)
export interface SimProductRow { productId: string; current: SimProductPeriod | null; prior: SimProductPeriod | null }
/** Per Product, the period rows as supplied. Order counts here are order LINES' orders per Product: never add them across Products. */
export function simulationProducts(a: AnalyticsData, sellerId: string): SimProductRow[] {
  const rows = a.simulation_product_period.filter(r => r.seller_id === sellerId)
  return [...new Set(rows.map(r => r.product_id))].sort().map(id => ({
    productId: id, current: periodOf(rows.filter(r => r.product_id === id), 'CURRENT_28D')[0] ?? null, prior: periodOf(rows.filter(r => r.product_id === id), 'PRIOR_28D')[0] ?? null,
  }))
}
export interface SimSceneRow { sceneId: string; current: SimScenePeriod | null; prior: SimScenePeriod | null }
export function simulationScenes(a: AnalyticsData, sellerId: string): SimSceneRow[] {
  const rows = a.simulation_scene_period.filter(r => r.seller_id === sellerId)
  return [...new Set(rows.map(r => r.scene_id))].sort().map(id => ({
    sceneId: id, current: periodOf(rows.filter(r => r.scene_id === id), 'CURRENT_28D')[0] ?? null, prior: periodOf(rows.filter(r => r.scene_id === id), 'PRIOR_28D')[0] ?? null,
  }))
}

// ---------- reputation ----------
export interface StarSummary { count: number; average: number | null; /** counts[0] is the number of 1-star ratings ... counts[4] the 5-star ones. */ counts: [number, number, number, number, number] }
/** The distribution of 1-5 star ratings; a blank average means no ratings. */
export function starSummary(stars: readonly number[]): StarSummary {
  const counts: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (const s of stars) if (Number.isInteger(s) && s >= 1 && s <= 5) counts[s - 1]++
  const count = counts.reduce((x, y) => x + y, 0)
  return { count, average: count ? counts.reduce((t, n, i) => t + n * (i + 1), 0) / count : null, counts }
}
/** '4.25' (the source rounds every average to at most 2 decimals), or 'Not enough data'. */
export const fmtStars = (average: number | null) => (average === null ? NOT_ENOUGH : String(Number(average.toFixed(2))))

export type Lifecycle = 'ACTIVE' | 'DRAFT' | 'SUSPENDED'
export interface TrustView { mvp: string; showcase: string | null; note: string | null }
/** Trust: the MVP level is the NEW baseline (label as supplied, with the lifecycle's meaning); the historical showcase level exists in the simulation only. */
export function trustView(rep: { mvp_trust: string; historical_trust_showcase: string }, lifecycle: Lifecycle): TrustView {
  const showcase = rep.historical_trust_showcase && rep.historical_trust_showcase !== '—' ? rep.historical_trust_showcase : null
  return {
    mvp: rep.mvp_trust,
    showcase,
    note: lifecycle === 'DRAFT' ? 'Draft Seller: not admitted, so there is no Trust history.' : lifecycle === 'SUSPENDED' ? 'Suspended Seller: historical records are internal only and never shown to Buyers.' : null,
  }
}
