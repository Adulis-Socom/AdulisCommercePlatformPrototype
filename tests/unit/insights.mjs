// DESIGN-002 (FR-005): the pure Insights rules (src/marketplace/insights.ts) against the supplied analytics and operations rows, no browser.
// Reconciles every aggregate with its source for all 23 Sellers. `node tests/unit/insights.mjs`
import { readFileSync } from 'node:fs'
import {
  NOT_ENOUGH, FUNNEL_STEPS, OVERVIEW_KEYS, delta, fmtChange, fmtPct, fmtRange, fmtStars, funnel, hasHistory, median, openSources, overview, productRows, ratio, rankProducts, rankScenes,
  sceneAttribution, sceneRows, simulationOverview, simulationProducts, simulationScenes, starSummary, sum, trustView, windowsOf, followerTrend, sellerWeeks,
} from '../../src/marketplace/insights.ts'
import { MARKETPLACE as M } from '../../src/marketplace/adapt.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../src/marketplace/data/${f}.json`, import.meta.url), 'utf8'))
const A = json('analytics'), ops = json('operations'), cat = json('catalogue')
const SELLERS = ops.seller_summary.map(s => s.seller_id)
const W = windowsOf(A.seller_weekly)
const cur = W.current.weeks, pri = W.prior.weeks
const r2 = n => Math.round(n * 100) / 100
const all = (label, fn) => { const bad = SELLERS.filter(id => !fn(id)); ck(label, bad.length === 0, bad) }

// ================= windows =================
ck('eight weeks of seven days each, contiguous', W.weeks.length === 8 && W.weeks.every((w, i) => (Date.parse(w.end) - Date.parse(w.start)) / 864e5 === 6 && (i === 0 || (Date.parse(w.start) - Date.parse(W.weeks[i - 1].end)) / 864e5 === 1)), W.weeks)
ck('PRIOR is 2 Oct to 29 Oct 2026 and CURRENT is 30 Oct to 26 Nov 2026, 28 days each', W.prior.start === '2026-10-02' && W.prior.end === '2026-10-29' && W.current.start === '2026-10-30' && W.current.end === '2026-11-26' && W.prior.days === 28 && W.current.days === 28, [W.prior, W.current])
ck('the window labels read as dates', fmtRange(W.current.start, W.current.end) === '30 Oct to 26 Nov 2026' && fmtRange(W.prior.start, W.prior.end) === '2 Oct to 29 Oct 2026')
ck('every analytics table covers the same eight weeks', ['scene_weekly', 'product_weekly', 'simulation_weekly'].every(t => new Set(A[t].map(r => r.week_start)).size === 8 && A[t].every(r => W.weeks.some(w => w.start === r.week_start && w.end === r.week_end))))
let threw = false
try { windowsOf(A.seller_weekly.filter(r => r.week_start !== '2026-10-02')) } catch { threw = true }
ck('seven weeks is refused rather than guessed', threw)

// ================= arithmetic and blanks =================
ck('delta: change is fractional and null when the prior window had none', delta(110, 100).change === 0.1 && delta(5, 0).change === null && delta(0, 0).change === null && delta(0, 50).change === -1)
ck('fmtChange: signed percent, New, none', fmtChange(delta(112, 100)) === '+12.0%' && fmtChange(delta(91, 100)) === '−9.0%' && fmtChange(delta(100, 100)) === '0%' && /^New/.test(fmtChange(delta(5, 0))) && /^No activity/.test(fmtChange(delta(0, 0))))
ck('ratio of nothing is null, not 0; a blank renders as Not enough data', ratio(0, 0) === null && ratio(3, 0) === null && ratio(1, 4) === 0.25 && fmtPct(null) === NOT_ENOUGH && fmtStars(null) === NOT_ENOUGH && fmtPct(0) === '0.0%' && fmtStars(4.25) === '4.25')
ck('median: empty is null, even and odd', median([]) === null && median([3, 1, 2]) === 2 && median([4, 1, 2, 3]) === 2.5)
const ss = starSummary([5, 5, 4, 1, 9, 0, 2.5])
ck('starSummary counts only whole 1-5 stars; none gives a blank average', ss.count === 4 && ss.average === 3.75 && ss.counts.join() === '1,0,0,1,2' && starSummary([]).average === null && starSummary([]).count === 0)

// ================= Overview: weekly totals, windows, source reconciliation =================
const summaryOf = id => ops.seller_summary.find(s => s.seller_id === id)
const repOf = id => ops.seller_reputation.find(r => r.seller_id === id)
const OV = Object.fromEntries(SELLERS.map(id => [id, overview(A, id, summaryOf(id).opening_followers_8w)]))
all('each Seller has eight weekly rows in order', id => { const w = sellerWeeks(A, id); return w.length === 8 && w.every((r, i) => r.week_start === W.weeks[i].start) })
all('each metric: current + prior totals = the sum of its eight weeks, and the series is those eight weeks', id => OVERVIEW_KEYS.every(k => {
  const m = OV[id].metrics[k], rows = A.seller_weekly.filter(r => r.seller_id === id)
  return m.series.length === 8 && m.total.current + m.total.prior === sum(rows, r => r[k]) && m.series.reduce((x, y) => x + y, 0) === sum(rows, r => r[k])
    && m.total.current === sum(rows.filter(r => cur.includes(r.week_start)), r => r[k]) && m.total.prior === sum(rows.filter(r => pri.includes(r.week_start)), r => r[k])
}))
const MAP = [['current_scene_impressions', 'scene_impressions', 'current'], ['prior_scene_impressions', 'scene_impressions', 'prior'], ['current_explore_opens', 'explore_opens', 'current'], ['current_product_views', 'product_detail_opens', 'current'], ['prior_product_views', 'product_detail_opens', 'prior'],
  ['current_scene_saves', 'scene_saves', 'current'], ['current_product_saves', 'product_saves', 'current'], ['current_cart_additions', 'cart_additions', 'current'], ['current_inquiries', 'inquiries', 'current'], ['current_responded', 'responded_inquiries', 'current'], ['current_new_followers', 'new_followers', 'current']]
all('seller_summary current/prior fields equal the weekly window sums (the source defines 11 such fields)', id => MAP.every(([field, key, w]) => summaryOf(id)[field] === OV[id].metrics[key].total[w]))
all('followers: opening + the eight weeks of new followers = the snapshot, and the series ends there', id => OV[id].followers.end === summaryOf(id).followers_snapshot && OV[id].followers.series.at(-1) === summaryOf(id).followers_snapshot && OV[id].followers.series[0] === summaryOf(id).opening_followers_8w + OV[id].weeks[0].new_followers)
all('the Buyer/Storefront Seller record shows the same follower count as the snapshot', id => M.sellers[id].followers === summaryOf(id).followers_snapshot)
ck('followerTrend adds week by week', followerTrend([{ new_followers: 2 }, { new_followers: 3 }], 10).series.join() === '12,15')
all('Companion summary (summaryOf) new followers, inquiries and responded agree with Insights', id => { const o = OV[id]; return summaryOf(id).current_new_followers === o.followers.newCurrent && summaryOf(id).current_inquiries === o.response.inquiries.current && summaryOf(id).current_responded === o.response.responded.current })
all('responded never exceeds inquiries; the rates are blank exactly when a window has no inquiries', id => { const o = OV[id]; return o.response.responded.current <= o.response.inquiries.current && o.response.responded.prior <= o.response.inquiries.prior
  && (o.response.rate.current === null) === (o.response.inquiries.current === 0) && (o.response.rate.prior === null) === (o.response.inquiries.prior === 0) })
all('the funnel steps are the totals of the overview metrics, in order', id => { const f = funnel(OV[id]); return f.map(s => s.key).join() === FUNNEL_STEPS.map(s => s.key).join() && f.every(s => s.total === OV[id].metrics[s.key].total) })
all('explore rate, Cart per Product open and review per Cart are real ratios (never above 1)', id => { const r = OV[id].rates; return [r.explore, r.cartPerOpen, r.reviewPerCart, r.scenePerOpen].every(x => [x.current, x.prior].every(v => v === null || (v >= 0 && v <= 1))) })

// blanks
ck('DS-03 has no inquiries: its weekly medians are all blank, so the response median is blank in both windows (not 0)', OV['DS-03'].response.medianMinutes.current === null && OV['DS-03'].response.medianMinutes.prior === null && OV['DS-03'].response.medianMinutes.series.every(v => v === null) && OV['DS-03'].response.rate.current === null)
ck('a median exists exactly when some week of the window has one (DS-05: weeks with an unanswered inquiry have none)', SELLERS.every(id => { const rows = OV[id].weeks; const c = rows.filter(r => cur.includes(r.week_start)).filter(r => r.median_response_minutes !== null); return (OV[id].response.medianMinutes.current === null) === (c.length === 0) }))
ck('the Draft Seller DS-11 and the suspended Seller DS-23 have no recorded MVP activity (all eight weeks are zero); every other Seller has', !hasHistory(A, 'DS-11') && !hasHistory(A, 'DS-23') && SELLERS.filter(id => id !== 'DS-11' && id !== 'DS-23').every(id => hasHistory(A, id)))
ck('the suspended Seller DS-23 keeps internal simulated history (4 Orders, 4 reviews) though it has no MVP activity', summaryOf('DS-23').lifecycle === 'SUSPENDED' && repOf('DS-23').simulation_paid_orders === 4 && repOf('DS-23').published_service_reviews === 4)

// ================= Scenes =================
all('Scene attribution reconciles: Scenes\' Product opens = the Seller\'s Scene-attributed opens = the Products\' Scene-attributed opens, every week', id => sceneAttribution(A, id).every(w => w.scenes === w.sellerSceneOpens && w.scenes === w.productAttributed))
all('Scene-attributed + other Product opens = all Product opens, every week', id => sceneAttribution(A, id).every(w => w.productAttributed + w.productOther === w.allOpens))
const SC = Object.fromEntries(SELLERS.map(id => [id, sceneRows(A, id)]))
all('the Seller\'s Scenes are exactly the catalogue\'s Scenes', id => SC[id].map(s => s.sceneId).join() === cat.scenes.filter(s => s.seller_id === id).map(s => s.scene_id).sort().join())
all('Scenes sum to the Seller: impressions, Explore opens, saves and Product opens, per window', id => ['current', 'prior'].every(w => {
  const sc = key => SC[id].reduce((t, s) => t + s[key].total[w], 0)
  return sc('impressions') === OV[id].metrics.scene_impressions.total[w] && sc('explore') === OV[id].metrics.explore_opens.total[w] && sc('saves') === OV[id].metrics.scene_saves.total[w] && sc('productOpens') === OV[id].metrics.scene_product_opens.total[w]
}))
all('Scene inquiries are a subset of the Seller\'s inquiries in each window (not every inquiry starts from a Scene)', id => ['current', 'prior'].every(w => SC[id].reduce((t, s) => t + s.inquiries.total[w], 0) <= OV[id].metrics.inquiries.total[w]))
all('open sources: Scene + other = all Product opens', id => { const s = openSources(OV[id]); return s.scene.current + s.other.current === s.all.current && s.scene.prior + s.other.prior === s.all.prior && s.other.current >= 0 && s.other.prior >= 0 })
all('rankScenes orders by current Product opens, descending, and keeps every Scene', id => { const r = rankScenes(SC[id]); return r.length === SC[id].length && r.every((s, i) => i === 0 || r[i - 1].productOpens.total.current >= s.productOpens.total.current) })
ck('ranking is stable: same input, same order, ties by Explore opens then id', rankScenes(SC['DS-01']).map(s => s.sceneId).join() === rankScenes([...SC['DS-01']].reverse()).map(s => s.sceneId).join())

// ================= Products =================
const PR = Object.fromEntries(SELLERS.map(id => [id, productRows(A, id)]))
all('the Seller\'s Products are exactly the catalogue\'s Products', id => PR[id].map(p => p.productId).join() === cat.products.filter(p => p.seller_id === id).map(p => p.product_id).sort().join())
all('Products sum to the Seller: opens, saves, Cart additions, review starts, per window', id => ['current', 'prior'].every(w => {
  const pr = key => PR[id].reduce((t, p) => t + p[key].total[w], 0)
  return pr('opens') === OV[id].metrics.product_detail_opens.total[w] && pr('saves') === OV[id].metrics.product_saves.total[w] && pr('cart') === OV[id].metrics.cart_additions.total[w]
    && pr('review') === OV[id].metrics.checkout_review_starts.total[w] && pr('sceneOpens') === OV[id].metrics.scene_product_opens.total[w]
}))
all('each Product: Scene-attributed + other opens = opens, every week', id => PR[id].every(p => p.opens.series.every((v, i) => v === p.sceneOpens.series[i] + p.otherOpens.series[i])))
all('rankProducts orders by current opens, descending, and keeps every Product', id => { const r = rankProducts(PR[id]); return r.length === PR[id].length && r.every((p, i) => i === 0 || r[i - 1].opens.total.current >= p.opens.total.current) })
ck('a Product with no opens has a blank Cart rate, not 0', PR['DS-01'].concat(...SELLERS.map(id => PR[id])).every(p => (p.cartPerOpen.current === null) === (p.opens.total.current === 0)))

// ================= internal simulation =================
const SIM = Object.fromEntries(SELLERS.map(id => [id, simulationOverview(A, id)]))
const lastEnd = W.current.end
const active = id => ops.orders.filter(o => o.seller_id === id && o.paid_at.slice(0, 10) > lastEnd)
all('simulated paid Orders: the weekly sum + the Orders paid after 26 Nov (current-day active, excluded from historical weeks) = seller_reputation', id => SIM[id].paid.total.current + SIM[id].paid.total.prior + active(id).length === repOf(id).simulation_paid_orders)
all('simulated completed Orders and published reviews equal seller_reputation exactly', id => SIM[id].completed.total.current + SIM[id].completed.total.prior === repOf(id).simulation_completed_orders && SIM[id].reviews.total.current + SIM[id].reviews.total.prior === repOf(id).published_service_reviews)
ck('exactly five Sellers have a current-day active Order excluded (DS-01, DS-04, DS-08, DS-12, DS-17), none of them completed', SELLERS.filter(id => active(id).length).join() === 'DS-01,DS-04,DS-08,DS-12,DS-17' && SELLERS.every(id => active(id).every(o => o.status !== 'COMPLETED')))
all('GMV: product period rows sum to the weekly GMV in each window (merchandise GMV is additive), scene GMV never exceeds it', id => [['current', 'CURRENT_28D'], ['prior', 'PRIOR_28D']].every(([w, p]) => {
  const prod = sum(A.simulation_product_period.filter(r => r.seller_id === id && r.period === p), r => r.merchandise_gmv_etb)
  const scene = sum(A.simulation_scene_period.filter(r => r.seller_id === id && r.period === p), r => r.attributed_merchandise_gmv_etb)
  return prod === SIM[id].gmv.total[w] && scene <= prod
}))
all('order counts are NOT additive across Products: the Product rows count each multi-line Order once per Product, so they are at least the Seller\'s Orders', id => [['current', 'CURRENT_28D'], ['prior', 'PRIOR_28D']].every(([w, p]) =>
  sum(A.simulation_product_period.filter(r => r.seller_id === id && r.period === p), r => r.simulated_paid_orders) >= SIM[id].paid.total[w]))
ck('at least one Seller really has more Product-row orders than Orders (so a sum across Products would overcount)', SELLERS.some(id => ['CURRENT_28D', 'PRIOR_28D'].some((p, i) => sum(A.simulation_product_period.filter(r => r.seller_id === id && r.period === p), r => r.simulated_paid_orders) > SIM[id].paid.total[i ? 'prior' : 'current'])))
all('the completion rate is blank exactly when nothing was paid in the window', id => SIM[id].completionRate.current === null === (SIM[id].paid.total.current === 0))
all('simulationProducts / simulationScenes return each row once per period', id => simulationProducts(A, id).every(r => r.current || r.prior) && simulationScenes(A, id).every(r => r.current || r.prior))
ck('DS-11 (Draft) has no simulated history at all', SIM['DS-11'].paid.total.current + SIM['DS-11'].paid.total.prior + SIM['DS-11'].gmv.total.current === 0 && simulationProducts(A, 'DS-11').length === 0)

// ================= reputation: Seller Service, Product Quality, Trust =================
const published = ops.reviews.filter(r => r.visibility === 'PUBLISHED')
const productSeller = Object.fromEntries(cat.products.map(p => [p.product_id, p.seller_id]))
all('Seller Service: the distribution of PUBLISHED review stars reproduces the published count and the rounded average (blank when none)', id => {
  const s = starSummary(published.filter(r => r.seller_id === id).map(r => r.seller_service_stars)), rep = repOf(id)
  return s.count === rep.published_service_reviews && (rep.service_rating === null ? s.average === null : r2(s.average) === rep.service_rating)
})
all('Product Quality: the distribution of ratings on PUBLISHED reviews reproduces the Seller\'s rating count and mean (blank when none)', id => {
  const ok = new Set(published.map(r => r.review_id))
  const s = starSummary(ops.product_ratings.filter(p => ok.has(p.review_id) && productSeller[p.product_id] === id).map(p => p.product_quality_stars)), rep = repOf(id)
  return s.count === rep.product_rating_count && (rep.product_rating_mean === null ? s.average === null : r2(s.average) === rep.product_rating_mean)
})
ck('the Draft Seller\'s ratings are blank, not zero', repOf('DS-11').service_rating === null && starSummary([]).average === null && fmtStars(starSummary([]).average) === NOT_ENOUGH)
const T = id => trustView(repOf(id), summaryOf(id).lifecycle)
ck('Trust: the MVP level is the NEW baseline for active Sellers, and the historical showcase is separate', SELLERS.filter(id => summaryOf(id).lifecycle === 'ACTIVE').every(id => T(id).mvp === 'NEW' && T(id).note === null) && T('DS-01').showcase === 'TRUSTED')
ck('Trust: the Draft Seller is not admitted with no showcase; the suspended Seller\'s record is flagged internal only', T('DS-11').mvp === 'Not admitted' && T('DS-11').showcase === null && /no Trust history/.test(T('DS-11').note) && /internal only/.test(T('DS-23').note) && T('DS-23').mvp === 'NEW (hidden)')

// ================= MVP / simulation separation =================
const SIM_WORDS = /order|gmv|paid|complet|cancel|fail|review|rating|trust/i
ck('the MVP weekly columns and the overview metrics carry no simulation field', OVERVIEW_KEYS.every(k => !SIM_WORDS.test(k.replace('checkout_review_starts', '').replace('responded_inquiries', ''))) && Object.keys(A.seller_weekly[0]).every(k => !/order|gmv|paid|complet|cancel/i.test(k)))
ck('every MVP source row says MVP; every simulation row says INTERNAL_SIMULATION', ['seller_weekly', 'scene_weekly', 'product_weekly'].every(t => A[t].every(r => r.mode === 'MVP')) && ['simulation_weekly', 'simulation_product_period', 'simulation_scene_period'].every(t => A[t].every(r => r.mode === 'INTERNAL_SIMULATION')))
ck('overview() output contains no simulation key', !/simulat|gmv|paid/i.test(JSON.stringify(Object.keys(OV['DS-01']).concat(Object.keys(OV['DS-01'].metrics), Object.keys(OV['DS-01'].response)))))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
