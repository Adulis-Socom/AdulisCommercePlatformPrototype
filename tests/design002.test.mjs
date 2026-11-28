// DESIGN-002 (FR-005): the four Seller Console Insights tabs on the marketplace dataset. REAL app, 1440x900 and 390x844. The numbers the DOM shows are compared with the
// pure functions in src/marketplace/insights.ts (the same ones tests/unit/insights.mjs reconciles with the source rows), for DS-01 (large), the lowest-volume ACTIVE
// Seller, DS-03 (no inquiries: blank response figures), DS-11 (Draft: no history) and DS-23 (Suspended: internal only). Also: period and trend controls, the window dates on
// screen, MVP shows no simulation figure while the internal simulation shows them labelled, the four reputation measures stay separate, text equivalents, keyboard reach,
// no horizontal overflow, the CTO palette's text contrast on this screen (sampled), the Companion's Seller figures agreeing with Insights, and no page errors.
import { suite } from './harness.mjs'
import { drivers, cat, ops } from './sim-helpers.mjs'
import { readFileSync, mkdirSync } from 'node:fs'
import { NOT_ENOUGH, fmtPct, fmtRange, fmtStars, hasHistory, openSources, overview, productRows, rankProducts, rankScenes, sceneRows, simulationOverview, starSummary, windowsOf } from '../src/marketplace/insights.ts'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/design002'
mkdirSync(OUT, { recursive: true })
const A = JSON.parse(readFileSync(new URL('../src/marketplace/data/analytics.json', import.meta.url), 'utf8'))
const W = windowsOf(A.seller_weekly)
const summaryOf = id => ops.seller_summary.find(s => s.seller_id === id)
const repOf = id => ops.seller_reputation.find(s => s.seller_id === id)
const ov = id => overview(A, id, summaryOf(id).opening_followers_8w)
const f = n => n.toLocaleString('en-US')
const etb = n => `ETB ${f(n)}`
const medianText = v => (v === null ? NOT_ENOUGH : `${Number.isInteger(v) ? v : v.toFixed(1)} min`)
const sellerName = id => cat.sellers.find(s => s.seller_id === id).name
const ACTIVE = ops.seller_summary.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id)
const volume = id => ov(id).metrics.scene_impressions.total.current + ov(id).metrics.scene_impressions.total.prior
const LOW = [...ACTIVE].sort((a, b) => volume(a) - volume(b) || a.localeCompare(b)).find(id => id !== 'DS-03')
const published = ops.reviews.filter(r => r.visibility === 'PUBLISHED')
const productSeller = Object.fromEntries(cat.products.map(p => [p.product_id, p.seller_id]))

// What each tab's tiles must read, per period, from the pure functions.
const expected = (id, period) => {
  const o = ov(id), m = o.metrics, r = o.response, sc = sceneRows(A, id), pr = productRows(A, id)
  const t = k => m[k].total[period]
  const hotspot = sc.reduce((n, s) => n + s.hotspotTaps.total[period], 0)
  const common = { response_rate: [fmtPct(r.rate[period]), r.rate[period]], median_response_minutes: [medianText(r.medianMinutes[period]), r.medianMinutes[period]] }
  return {
    overview: { product_detail_opens: t('product_detail_opens'), scene_impressions: t('scene_impressions'), explore_opens: t('explore_opens'), cart_additions: t('cart_additions'), inquiries: t('inquiries'), responded_inquiries: t('responded_inquiries'), ...common },
    scenes: { scene_product_opens: t('scene_product_opens'), scene_impressions: t('scene_impressions'), explore_opens: t('explore_opens'), hotspot_taps: hotspot, scene_saves: t('scene_saves') },
    products: { cart_additions: t('cart_additions'), product_detail_opens: t('product_detail_opens'), product_saves: t('product_saves'), checkout_review_starts: t('checkout_review_starts'), cart_rate: [fmtPct(o.rates.cartPerOpen[period]), o.rates.cartPerOpen[period]] },
    reputation: { response_rate: common.response_rate, inquiries: t('inquiries'), responded_inquiries: t('responded_inquiries'), median_response_minutes: common.median_response_minutes, new_followers: t('new_followers') },
    sceneOrder: rankScenes(sc).map(s => [s.sceneId, s.productOpens.total[period]]), productOrder: rankProducts(pr).map(p => [p.productId, p.opens.total[period]]),
  }
}
const norm = v => (Array.isArray(v) ? v : [typeof v === 'number' ? f(v) : v, v])

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('design002', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const phone = d.phone
    const TABS = ['Overview', 'Scene Performance', 'Product Performance', 'Seller Reputation']
    const KEYS = ['overview', 'scenes', 'products', 'reputation']
    const sellers = phone ? ['DS-01', 'DS-11'] : ['DS-01', LOW, 'DS-03', 'DS-11', 'DS-23']

    const openInsights = async () => {
      await t.section('08 Seller Console'); await t.settle(400)
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Insights/ }).first().click() }
      else await page.getByRole('button', { name: /^Insights/ }).first().click()
      await t.settle(900)
    }
    const pickSeller = async id => { await page.getByRole('button', { name: /Switch Seller/ }).click(); await t.settle(300); await page.getByRole('menuitemradio', { name: new RegExp(sellerName(id).replace(/[.*+?^${}()|[\]\\&]/g, '\\$&')) }).click(); await t.settle(700) }
    const tab = async name => { await page.getByRole('tab', { name }).click(); await t.settle(500) }
    const tiles = () => page.$$eval('[data-metric]', els => els.map(e => ({ id: e.dataset.metric, raw: e.dataset.raw, text: e.querySelector('[data-metric-value]')?.textContent?.trim() ?? '', hero: e.hasAttribute('data-hero') })))
    const root = () => page.locator('[data-insights]')
    const overflow = () => page.evaluate(() => { const c = document.querySelector('.seller-console-content'); return { page: document.documentElement.scrollWidth - innerWidth, console: c.scrollWidth - c.clientWidth } })
    const simEls = () => page.locator('[data-sim-only], [data-sim-label]').count()

    await t.open()
    await openInsights()
    const errorsAtStart = t.errors.length

    // ============ MVP: every tab, every sampled Seller ============
    for (const id of sellers) {
      const lifecycle = summaryOf(id).lifecycle
      await pickSeller(id)
      const tag = `${id} ${lifecycle} @${viewport.width}`
      t.ck(`${tag}: Insights names the Seller and shows the four tabs`, (await root().innerText()).includes(sellerName(id)) && (await page.getByRole('tab').allInnerTexts()).join('|') === TABS.join('|'))
      for (const [i, name] of TABS.entries()) {
        await tab(name)
        const key = KEYS[i]
        const got = await tiles()
        const ids = got.map(g => g.id)
        t.ck(`${tag} ${name}: no metric appears twice`, new Set(ids).size === ids.length, ids)
        t.eq(`${tag} ${name}: MVP shows no simulation figure, label or section`, await simEls(), 0)
        const text = await root().innerText()
        t.ck(`${tag} ${name}: no GMV, simulated Order or paid wording in the MVP`, !/GMV|simulated paid|Merchandise/i.test(text), text.match(/GMV|simulated paid|Merchandise/i)?.[0])
        const o = await overflow()
        t.ck(`${tag} ${name}: no horizontal overflow (page ${o.page}, console ${o.console})`, o.page <= 0 && o.console <= 0, o)
        if (lifecycle === 'DRAFT') {
          t.ck(`${tag} ${name}: a clear empty state with no figures at all (no history, not zeros)`, (await page.locator('[data-empty-state]').count()) === 1 && got.length === 0 && /no history/i.test(await page.locator('[data-empty-state]').innerText()) && (await page.locator('[data-insights-controls]').count()) === 0)
          continue
        }
        if (lifecycle === 'SUSPENDED') t.ck(`${tag} ${name}: the labelled internal-only note`, /Suspended Seller: internal records only/.test(text) && /never visible to Buyers/.test(text))
        if (!hasHistory(A, id)) { t.ck(`${tag} ${name}: no recorded MVP activity is an empty state, not a grid of zeros`, got.length === 0 && (await page.locator('[data-empty-state]').count()) >= 1, got.length); if (key === 'reputation') t.eq(`${tag}: Trust level is still shown`, (await page.locator('[data-trust-level]').innerText()).trim(), repOf(id).mvp_trust); continue }
        // numbers equal the pure functions
        const exp = expected(id, 'current')[key]
        const bad = Object.entries(exp).filter(([k, v]) => { const g = got.find(x => x.id === k); const [txt, raw] = norm(v); return !g || g.text !== txt || (raw !== null && String(raw) !== g.raw) || (raw === null && g.raw !== '') })
        t.ck(`${tag} ${name}: ${Object.keys(exp).length} tile numbers equal the unit-computed values`, bad.length === 0, bad.map(([k, v]) => [k, v, got.find(x => x.id === k)]))
        t.eq(`${tag} ${name}: exactly one hero metric`, got.filter(g => g.hero).length, 1)
        t.ck(`${tag} ${name}: the window dates are on screen`, (await page.locator('[data-window-note]').innerText()).includes(fmtRange(W.current.start, W.current.end)) && (await page.locator('[data-window-note]').innerText()).includes(fmtRange(W.prior.start, W.prior.end)))
        // text equivalents
        const figs = await page.$$eval('[data-figure]', els => els.map(e => ({ table: !!e.querySelector('details[data-text-equivalent] table'), sr: !!e.querySelector('.sr-only')?.textContent?.trim(), rows: e.querySelectorAll('tbody tr').length })))
        t.ck(`${tag} ${name}: every chart (${figs.length}) has a table and a screen-reader summary`, figs.length > 0 && figs.every(x => x.table && x.sr && x.rows > 0), figs)
        t.ck(`${tag} ${name}: every SVG chart is labelled`, await page.$$eval('.ins-root svg', els => els.every(s => s.getAttribute('aria-label') || s.getAttribute('aria-hidden') === 'true')))
        if (key === 'scenes' || key === 'products') {
          const rows = await page.$$eval('[data-bar-row]', els => els.map(e => [e.dataset.barRow, e.querySelector('[data-bar-value]')?.textContent?.trim()]))
          const order = expected(id, 'current')[key === 'scenes' ? 'sceneOrder' : 'productOrder']
          t.ck(`${tag} ${name}: the ranked bars list every ${key === 'scenes' ? 'Scene' : 'Product'} in the unit-computed order with its value`, JSON.stringify(rows) === JSON.stringify(order.map(([k, v]) => [k, f(v)])), { rows: rows.slice(0, 3), order: order.slice(0, 3) })
        }
        if (key === 'overview') {
          const steps = await page.$$eval('[data-bar-row]', els => els.map(e => [e.dataset.barRow, e.querySelector('[data-bar-value]')?.textContent?.trim()]))
          const o = ov(id), m = o.metrics, src = openSources(o)
          t.ck(`${tag} ${name}: the stepped bars show the six steps (impressions, Explore, Product opens, Cart, review starts, inquiries)`, JSON.stringify(steps.slice(0, 6)) === JSON.stringify([['scene_impressions', 'scene_impressions'], ['explore_opens', 'explore_opens'], ['product_detail_opens', 'product_detail_opens'], ['cart_additions', 'cart_additions'], ['checkout_review_starts', 'checkout_review_starts'], ['inquiries', 'inquiries']].map(([k, v]) => [k, f(m[v].total.current)])) && steps.slice(6).every(([k]) => ['scene', 'other'].includes(k)), steps)
          t.ck(`${tag} ${name}: Scene + other Product opens = all Product opens (${f(src.scene.current)} + ${f(src.other.current)})`, steps.find(s => s[0] === 'scene')[1] === f(src.scene.current) && steps.find(s => s[0] === 'other')[1] === f(src.other.current) && src.scene.current + src.other.current === m.product_detail_opens.total.current)
          t.ck(`${tag} ${name}: both windows' values are stated beside the hero`, (await page.locator('[data-hero] [data-prior]').innerText()) === f(m.product_detail_opens.total.prior) && (await page.locator('[data-hero] [data-current]').innerText()) === f(m.product_detail_opens.total.current))
        }
        if (key === 'reputation') {
          t.eq(`${tag} ${name}: Trust level is the MVP label`, (await page.locator('[data-trust-level]').innerText()).trim(), repOf(id).mvp_trust)
          for (const part of ['popularity', 'trust']) t.eq(`${tag} ${name}: ${part} has its own labelled card`, await page.locator(`[data-reputation="${part}"]`).count(), 1)
          t.eq(`${tag} ${name}: Seller Service, Product Quality and the Trust showcase are not in the MVP`, await page.locator('[data-reputation="service"], [data-reputation="quality"], [data-reputation="showcase"]').count(), 0)
          if (id === 'DS-03') t.ck(`${tag} ${name}: blank rate and median render "${NOT_ENOUGH}", not 0`, got.find(g => g.id === 'response_rate').text === NOT_ENOUGH && got.find(g => g.id === 'median_response_minutes').text === NOT_ENOUGH)
        }
      }
    }

    // ============ controls: period and trend range ============
    await pickSeller('DS-01')
    await tab('Overview')
    const o1 = ov('DS-01')
    t.eq('the period starts on the Current 28 days', await page.locator('[data-insights]').getAttribute('data-insights-period'), 'current')
    t.eq('the trend starts at eight weeks (8 focusable points)', await page.locator('[data-hero] [data-point]').count(), 8)
    await page.getByRole('button', { name: 'Selected 28 days' }).click(); await t.settle(400)
    t.eq('"Selected 28 days" draws the four weeks of the window', await page.locator('[data-hero] [data-point]').count(), 4)
    await page.getByRole('button', { name: 'Prior 28 days', exact: true }).click(); await t.settle(400)
    let g = await tiles()
    t.eq('Prior 28 days: the hero reads the prior total', g.find(x => x.hero).text, f(o1.metrics.product_detail_opens.total.prior))
    t.eq('Prior 28 days: the other tiles read the prior totals', g.find(x => x.id === 'inquiries').text, f(o1.metrics.inquiries.total.prior))
    t.ck('Prior 28 days: it says there is nothing earlier to compare, instead of inventing a change', /nothing earlier to compare/.test(await page.locator('[data-hero]').innerText()))
    t.eq('Prior 28 days: the trend shows the prior four weeks', await page.locator('[data-hero] [data-point]').count(), 4)
    await page.getByRole('button', { name: 'Current 28 days', exact: true }).click(); await t.settle(300)
    await page.getByRole('button', { name: '8 weeks', exact: true }).click(); await t.settle(300)
    g = await tiles()
    t.eq('back to Current: the hero reads the current total', g.find(x => x.hero).text, f(o1.metrics.product_detail_opens.total.current))
    t.ck('the change vs the prior 28 days is stated with a sign and a glyph', /^[▲▼•]\s*(\+|−|0%|New|No activity)/.test((await page.locator('[data-hero] [data-change]').innerText()).replace(/\n/g, ' ').trim()), await page.locator('[data-hero] [data-change]').innerText())
    t.ck('the period and trend choices persist across the four tabs', await (async () => { await page.getByRole('button', { name: 'Prior 28 days', exact: true }).click(); await tab('Scene Performance'); const ok = (await page.locator('[data-insights]').getAttribute('data-insights-period')) === 'prior' && (await tiles()).find(x => x.id === 'scene_product_opens').text === f(ov('DS-01').metrics.scene_product_opens.total.prior); await page.getByRole('button', { name: 'Current 28 days', exact: true }).click(); await tab('Overview'); return ok })())

    // ============ keyboard ============
    const point = page.locator('[data-hero] [data-point]').nth(3)
    await point.focus(); await t.settle(150)
    const live = await page.locator('[data-hero] [aria-live]').innerText()
    t.ck('a chart point is keyboard-focusable and reads its week and value', (await point.getAttribute('tabindex')) === '0' && new RegExp(`week of ${'23 Oct'}: ${f(o1.metrics.product_detail_opens.series[3])}$`).test(live), live)
    const summary = page.locator('[data-hero] details[data-text-equivalent] summary')
    await summary.focus(); await page.keyboard.press('Enter'); await t.settle(200)
    t.ck('the table opens from the keyboard', await page.locator('[data-hero] details[data-text-equivalent]').evaluate(e => e.open))
    t.ck('tabs and period controls are real buttons reachable by Tab (a visible focus ring comes from the global rule)', await page.evaluate(() => [...document.querySelectorAll('[role=tab], [data-insights-controls] button')].every(b => b.tagName === 'BUTTON' && b.tabIndex >= 0)))
    await page.screenshot({ path: `${OUT}/overview-${viewport.width}.png` })

    // ============ the internal simulation ============
    await d.setMode(true); await t.settle(500)
    const so = simulationOverview(A, 'DS-01')
    await tab('Overview')
    g = await tiles()
    const simTiles = { sim_paid_orders: f(so.paid.total.current), sim_completed_orders: f(so.completed.total.current), sim_gmv: etb(so.gmv.total.current), sim_failed_cancelled: f(so.failed.total.current + so.cancelled.total.current) }
    t.ck('simulation Overview: paid Orders, completed Orders, GMV and failed/cancelled equal the unit-computed values', Object.entries(simTiles).every(([k, v]) => g.find(x => x.id === k)?.text === v), Object.entries(simTiles).map(([k, v]) => [k, v, g.find(x => x.id === k)?.text]))
    t.ck('simulation figures are all labelled "Internal simulation"', (await page.locator('[data-metric^="sim_"]').count()) === 4 && (await page.locator('[data-metric^="sim_"] [data-sim-label]').count()) === 4)
    t.ck('GMV is labelled simulated and "not revenue"', /Merchandise GMV \(simulated\)/.test(await page.locator('[data-metric="sim_gmv"]').innerText()) && /Not revenue/i.test(await page.locator('[data-metric="sim_gmv"]').innerText()))
    t.ck('the MVP figures are unchanged beside them', (await tiles()).find(x => x.id === 'product_detail_opens').text === f(o1.metrics.product_detail_opens.total.current))
    t.ck('no horizontal overflow in the simulation Overview', (await overflow()).page <= 0 && (await overflow()).console <= 0)

    await tab('Scene Performance')
    t.ck('simulation Scenes: a labelled attributed-GMV chart with a table', (await page.locator('[data-sim-only="scenes"] [data-sim-label]').count()) >= 1 && (await page.locator('[data-sim-only="scenes"] table').count()) === 1 && /not revenue/i.test(await page.locator('[data-sim-only="scenes"]').innerText()))
    await tab('Product Performance')
    t.ck('simulation Products: a labelled GMV chart; Order counts are marked not additive', (await page.locator('[data-sim-only="products"] [data-sim-label]').count()) >= 1 && /do not add them up/i.test(await page.locator('[data-sim-only="products"]').innerText()))
    await tab('Seller Reputation')
    const svc = starSummary(published.filter(r => r.seller_id === 'DS-01').map(r => r.seller_service_stars))
    const okIds = new Set(published.map(r => r.review_id))
    const pq = starSummary(ops.product_ratings.filter(p => okIds.has(p.review_id) && productSeller[p.product_id] === 'DS-01').map(p => p.product_quality_stars))
    const star = async id => ({ avg: (await page.locator(`[data-stars="${id}"] [data-stars-average]`).innerText()).trim(), count: (await page.locator(`[data-stars="${id}"] [data-stars-count]`).innerText()).trim(), dist: await page.$$eval(`[data-stars="${id}"] [data-star-count]`, els => els.map(e => Number(e.textContent)).reverse()) })
    const s1 = await star('service'), s2 = await star('quality')
    t.ck('Seller Service (DS-01): average, count and 1-5 star distribution equal the source reviews', s1.avg === fmtStars(svc.average) && s1.count === `${svc.count} reviews` && s1.dist.join() === svc.counts.join(), { s1, svc })
    t.ck('Product Quality (DS-01): average, count and distribution equal the source ratings', s2.avg === fmtStars(pq.average) && s2.count === `${pq.count} Product ratings` && s2.dist.join() === pq.counts.join(), { s2, pq })
    t.ck('the Seller Service and Product Quality cards each carry their own definition and the simulation label', await page.evaluate(() => ['service', 'quality', 'showcase'].every(k => { const c = document.querySelector(`[data-reputation="${k}"]`); return c && c.querySelector('[data-sim-label]') && c.querySelector('h2') && c.querySelector('p') })))
    t.ck('the Trust showcase (TRUSTED) is separate from the MVP Trust level (NEW)', (await page.locator('[data-showcase-level]').innerText()).trim() === repOf('DS-01').historical_trust_showcase && (await page.locator('[data-trust-level]').innerText()).trim() === repOf('DS-01').mvp_trust)
    t.ck('the four measures are four separate labelled cards (Popularity, Trust, Seller Service, Product Quality)', (await page.locator('[data-reputation]').count()) >= 5 && /No score combines them/.test(await root().innerText()))
    const perProduct = await page.$$eval('[data-pq-product]', els => els.map(e => [e.dataset.pqProduct, e.textContent.trim()]))
    t.ck('a Product with no rating reads "Not enough data" (never 0)', perProduct.length > 0 && perProduct.every(([id, text]) => /Not enough data$/.test(text) === !ops.product_ratings.some(p => p.product_id === id && okIds.has(p.review_id))), perProduct.slice(0, 3))
    await page.screenshot({ path: `${OUT}/reputation-sim-${viewport.width}.png` })

    // DS-11 (Draft) and DS-23 (Suspended) in the simulation.
    await pickSeller('DS-11'); await tab('Seller Reputation')
    t.ck('DS-11 (Draft), simulation: still the empty state, no history, no zero ratings', (await page.locator('[data-empty-state]').count()) === 1 && (await page.locator('[data-stars]').count()) === 0)
    if (!phone) {
      await pickSeller('DS-23')
      for (const [name, sel] of [['Overview', '[data-sim-only="overview"]'], ['Seller Reputation', '[data-sim-only="reputation"]']]) { await tab(name); t.ck(`DS-23 (Suspended), simulation, ${name}: its internal historical record is shown, labelled`, (await page.locator(sel).count()) === 1 && (await page.locator('[data-lifecycle-note]').count()) >= 1) }
      const s23 = simulationOverview(A, 'DS-23'); await tab('Overview')
      t.eq('DS-23 simulation Overview: paid Orders equal the unit-computed 4', (await tiles()).find(x => x.id === 'sim_paid_orders').text, f(s23.paid.total.current + 0))
      await tab('Seller Reputation')
      const ss23 = await star('service')
      t.ck('DS-23: its 4 published Seller Service reviews and 4.0 average from the source', ss23.avg === '4' && ss23.count === '4 reviews', ss23)
    }
    await d.setMode(false); await t.settle(400)
    await pickSeller('DS-01'); await tab('Overview')
    t.eq('back in the MVP the simulation figures are gone', await simEls(), 0)

    // ============ Companion agreement ============
    if (!phone) {
      await d.companion('Alerts', 'DS-01'); await t.settle(500)
      const sm = summaryOf('DS-01'), o = ov('DS-01')
      const cm = await page.locator('main.app-main').innerText()
      t.ck('the Companion Alerts show the same followers, new followers and answered inquiries as Insights', cm.includes(`${f(o.followers.end)} followers`) && cm.includes(`${o.followers.newCurrent} new this period`) && cm.includes(`${o.response.responded.current} of ${o.response.inquiries.current} answered this period`), { want: [o.followers.end, o.followers.newCurrent, o.response.responded.current, o.response.inquiries.current, sm.current_new_followers] })
    }

    // ============ CTO palette contrast on this screen ============
    await page.locator('.theme-lab-trigger').click(); await t.settle(150)
    await page.locator('.theme-lab-option').filter({ hasText: /^\d*CTO$/ }).locator('input').check(); await t.settle(250)
    await page.keyboard.press('Escape'); await t.settle(150)
    t.eq('CTO is applied', await page.evaluate(() => document.documentElement.dataset.adulisTheme), 'cto')
    await openInsights(); await pickSeller('DS-01')
    const sample = () => page.evaluate(() => {
      const parse = v => { let m = v.match(/^rgba?\(([^)]+)\)$/); if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] } m = v.match(/^color\(srgb ([^)]+)\)$/); if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1] } return null }
      const over = (top, under) => { const a = top[3] + under[3] * (1 - top[3]); return a === 0 ? [0, 0, 0, 0] : [0, 1, 2].map(i => (top[i] * top[3] + under[i] * under[3] * (1 - top[3])) / a).concat(a) }
      const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
      const out = []; let skipped = 0
      for (const el of document.querySelectorAll('.ins-root *')) {
        if (!el.checkVisibility?.({ visibilityProperty: true })) continue
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
        const cs = getComputedStyle(el); let bg = [0, 0, 0, 0], exempt = false
        for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' || Number(s.opacity) < 1) { exempt = true; break } const c = parse(s.backgroundColor); if (c && c[3] > 0) bg = over(bg, c); if (bg[3] >= 0.999) break }
        if (exempt || bg[3] < 0.999) { skipped++; continue }
        const fg = over(parse(cs.color), bg), px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700)
        out.push({ text: el.textContent.trim().slice(0, 40), ratio: ratio(fg, bg), need: large ? 3 : 4.5 })
      }
      return { out, skipped }
    })
    for (const name of TABS) {
      await tab(name)
      const { out, skipped } = await sample()
      const bad = out.filter(s => s.ratio < s.need)
      t.ck(`CTO ${name} @${viewport.width}: text contrast is AA (${out.length} sampled, ${skipped} skipped)`, out.length > 20 && bad.length === 0, bad.slice(0, 4))
      if (name === 'Overview' || name === 'Seller Reputation') await page.screenshot({ path: `${OUT}/cto-${name.replace(/\W+/g, '-').toLowerCase()}-${viewport.width}.png` })
    }
    t.ck('the CTO palette lines use theme tokens (discovery = info, interest = the CTO ink brand, not hard-coded)', await page.evaluate(() => (() => { const cs = getComputedStyle(document.querySelector('.ins-root')); return cs.getPropertyValue('--ins-discovery').trim() === cs.getPropertyValue('--color-info').trim() && cs.getPropertyValue('--ins-interest').trim() === cs.getPropertyValue('--color-brand-text').trim() && cs.getPropertyValue('--ins-interest').trim().toUpperCase() === '#111111' })()))

    t.eq('no page or console error during the run', t.errors.length - errorsAtStart, 0)
  })
}
