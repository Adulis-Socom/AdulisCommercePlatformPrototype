// SIM-003 (FR-015): purchased reviews in the internal simulation, on the marketplace dataset. Review Grants, Seller Service stars and received-Product Quality
// ratings kept separate, the failure-only review (Seller Service only), moderation (hidden reviews neither shown nor counted), premature and duplicate reviews
// refused, aggregates recomputed from the visible records and reconciled against the supplied reputation tables, and nothing shown in the Current MVP.
// REAL app, 1440x900 and 390x844. Expected values are computed from the generated dataset.
import { suite } from './harness.mjs'
import { drivers, ops } from './sim-helpers.mjs'

const repOf = s => ops.seller_reputation.find(r => r.seller_id === s)
const fmt = n => (n === null || n === undefined ? '—' : String(Number(n.toFixed(2))))
const visible = ops.reviews.filter(r => r.visibility === 'PUBLISHED')
const hidden = ops.reviews.filter(r => r.visibility !== 'PUBLISHED')
const visRatings = ops.product_ratings.filter(p => visible.some(r => r.review_id === p.review_id))
const linesOf = o => ops.order_lines.filter(l => l.order_id === o)

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('sim003', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const phone = viewport.width <= 640
    const noOverflow = async label => t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, (await d.noOverflow(label)).ok)
    const consoleNav = async (seller, label) => {
      await d.consoleOrders(seller)
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await d.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + label) }).first().click() } else await page.getByRole('button', { name: new RegExp('^' + label) }).first().click()
      await d.settle(450)
    }
    const operatorReadout = async () => {
      await t.section('Operator Console'); await d.settle(400)
      if (phone) { await page.getByRole('button', { name: 'Open Operator navigation' }).click(); await d.settle(300) }
      await page.getByRole('button', { name: 'Reputation reconciliation' }).first().click(); await d.settle(500)
    }
    const storefrontReviews = async () => { await t.section('04 Seller Storefront'); await d.settle(400); await page.getByRole('tab', { name: 'Reviews' }).click(); await d.settle(400); return d.main() }
    const reviewResult = async () => { const m = page.locator('section:has(h3:text("Your review (simulation)")) [data-sim-result]').last(); return { kind: await m.getAttribute('data-sim-result'), text: (await m.innerText()).trim() } }
    await t.open()
    const wsBefore = await d.wsState()

    // ---- 1. Current MVP: no purchased reviews, no Product Quality, nothing to reconcile ----
    await consoleNav('DS-01', 'Reviews')
    let text = await d.main()
    t.ck('MVP: Seller Console Reviews is the simulation gate: no ratings, no review text, no simulation bar', /not in the current mvp/i.test(text) && !/INTERNAL SIMULATION/.test(text) && !/Everything was ready when promised/.test(text) && (await page.locator('[data-service-review]').count()) === 0, text.slice(0, 200))
    text = await storefrontReviews()
    t.ck('MVP: the public Storefront shows no purchased review and no rating (blank average)', !/Everything was ready when promised/.test(text) && !/4\.25/.test(text) && (await page.locator('[role="tabpanel"]').innerText()).includes('—'))
    await operatorReadout(); t.ck('MVP: the Operator reconciliation readout is the simulation gate', /not in the current mvp/i.test(await page.locator('body').innerText()) && (await page.locator('[data-reputation-readout]').count()) === 0)
    await d.buyerOrders('BY-02'); t.ck('MVP: Hana\'s Orders are the gate, no review chip', /not in the current mvp/i.test(await d.main()) && (await page.locator('[data-review-chip]').count()) === 0)

    // ---- 2. The simulation: Seller Console Reviews recompute from the visible records ----
    await d.setMode(true)
    for (const s of ['DS-01', 'DS-04', 'DS-09', 'DS-15']) {
      await consoleNav(s, 'Reviews')
      const rep = repOf(s)
      t.ck(`${s}: Seller Service ${fmt(rep.service_rating)} from ${rep.published_service_reviews} visible reviews, equal to the supplied summary`, (await page.locator('[data-service-average]').innerText()).trim() === fmt(rep.service_rating) && new RegExp(`${rep.published_service_reviews} visible reviews?`).test(await page.locator('[data-service-count]').innerText()) && (await page.locator('[data-service-review]').count()) === rep.published_service_reviews, await page.locator('[data-service-average]').innerText())
    }
    await consoleNav('DS-04', 'Reviews')
    t.ck('moderation: DS-04\'s review held by moderation (SIM-O-0021-REV1) is neither listed nor counted', (await page.locator('[data-service-review="SIM-O-0021-REV1"]').count()) === 0 && hidden.some(r => r.review_id === 'SIM-O-0021-REV1' && r.seller_id === 'DS-04'))
    t.ck('DS-04 lists the failure-basis review as "Verified failure: service only" with one star and no Product Quality', await (async () => { const c = page.locator('[data-service-review="SIM-O-0145-REV1"]'); return (await c.count()) === 1 && /Verified failure: service only/.test(await c.innerText()) && (await c.locator('[data-rating]').count()) === 0 })())
    const t1 = (await d.main())
    t.ck('the page says Seller Service and Product Quality are separate and that Trust and popularity are separate again', /They are separate/.test(t1) && /Popularity and Trust are separate again/.test(t1))
    await noOverflow('Seller Reviews')
    // Product Quality tab
    await consoleNav('DS-01', 'Reviews')
    await page.getByRole('tab', { name: 'Product Quality' }).click(); await d.settle(300)
    const pr = ops.product_reputation.find(p => p.seller_id === 'DS-01' && p.rating_count > 0), none = ops.product_reputation.find(p => p.seller_id === 'DS-01' && p.rating_count === 0)
    t.ck(`Product Quality per Product: ${pr.product_id} ★ ${fmt(pr.average_stars)} from ${pr.rating_count}`, (await page.locator(`[data-product-quality="${pr.product_id}"] [data-pq-summary]`).innerText()).includes(`★ ${fmt(pr.average_stars)} · ${pr.rating_count}`))
    const nonePublished = await page.locator(`[data-product-quality="${none.product_id}"]`).count()
    t.ck(`a Product with no ratings (${none.product_id}) says "No ratings yet": no zero average`, nonePublished === 0 || /No ratings yet/.test(await page.locator(`[data-product-quality="${none.product_id}"]`).innerText()))
    await page.locator(`[data-product-quality="${pr.product_id}"] button`).click(); await d.settle(250)
    t.eq('opening the Product lists its individual ratings with the Buyer and Order', await page.locator(`[data-product-quality="${pr.product_id}"] [data-pq-rating]`).count(), visRatings.filter(p => p.product_id === pr.product_id).length)
    await noOverflow('Product Quality tab')
    await consoleNav('DS-23', 'Reviews'); t.ck('DS-23 (Suspended): its history is internal and the page says it is never public', /suspended: its review history is internal/.test(await d.main()) && (await page.locator('[data-service-review]').count()) === repOf('DS-23').published_service_reviews)
    text = await storefrontReviews()
    t.ck(`public Storefront (DS-01, simulation): Seller Service ${fmt(repOf('DS-01').service_rating)} from ${repOf('DS-01').published_service_reviews} ratings`, text.includes(fmt(repOf('DS-01').service_rating)) && new RegExp(`${repOf('DS-01').published_service_reviews} verified buyer ratings`).test(text) && /Everything was ready when promised/.test(text))

    // ---- 3. The Operator-style reconciliation readout ----
    await operatorReadout()
    text = await page.locator('[data-reputation-readout]').innerText()
    t.ck('readout: 23 of 23 Sellers and 140 of 140 Products reconcile with the supplied reputation tables', /Sellers reconciled\s+23 of 23/.test(text) && /Products reconciled\s+140 of 140/.test(text) && (await page.locator('[data-recon-ok="true"]').count()) === 23 && (await page.locator('[data-recon-ok="false"]').count()) === 0, text.slice(0, 300))
    t.ck('readout: it states agreement and lists the 4 reviews held by moderation, excluded from every count', /agree for every Seller and Product/.test(await page.locator('[data-recon-status]').innerText()) && hidden.every(r => text.includes(r.review_id)) && new RegExp(`${visible.length} / ${hidden.length}`).test(text))
    t.ck('readout: a Seller row shows supplied, recomputed and live figures (DS-01)', await (async () => { const r = await page.locator('[data-recon-seller="DS-01"]').innerText(); return r.includes(`${repOf('DS-01').published_service_reviews} · ${fmt(repOf('DS-01').service_rating)}`) && /Reconciled/.test(r) })())
    t.ck('readout: Grants — 19 available, 119 used', /19 \/ 119/.test(text))
    await page.getByRole('button', { name: /Show the 140 Product rows/ }).evaluate(b => b.click()); await d.settle(300)
    t.eq('readout: the Product rows list every Product with ratings', await page.locator('[data-recon-product]').count(), ops.product_reputation.filter(p => p.rating_count > 0).length)
    await noOverflow('Operator readout')

    // ---- 4. Buyer: Hana writes a review with a Review Grant ----
    await d.buyerOrders('BY-02')
    const mine = ops.review_grants.filter(g => g.buyer_id === 'BY-02' && g.state === 'AVAILABLE')
    t.eq('Hana has the supplied open Review Grants flagged on her Orders', await page.locator('[data-review-chip="open"]').count(), mine.length)
    const ord = 'SIM-O-0054', ls = linesOf(ord), ds = ops.orders.find(o => o.order_id === ord).seller_id
    const before = ops.reviews.filter(r => r.seller_id === ds && r.visibility === 'PUBLISHED')
    await d.openOrder(ord)
    t.ck('the Order detail has a Review composer with Seller Service stars and a separate Product Quality control per received line', (await page.locator('[data-review-composer]').count()) === 1 && (await page.locator('[data-pq-line]').count()) === ls.length && /They are separate/.test(await d.detailText()))
    await page.getByRole('button', { name: 'Submit review' }).click(); await d.settle(300)
    let r = await d.lastResult()
    t.ck('submitting with no Seller Service stars is refused with a reason and nothing is published', r.kind === 'refused' && /Seller Service stars from 1 to 5/.test(r.text) && (await page.locator('[data-review]').count()) === 0, r)
    await page.locator(`#rv-s-${ord}`).selectOption('4'); await page.locator(`#rv-t-${ord}`).fill('Collected on time, clear communication.')
    await page.locator(`#rv-q-${ls[0].order_line_id}`).selectOption('5'); await d.settle(150)
    await page.getByRole('button', { name: 'Submit review' }).click(); await d.settle(350)
    r = await d.lastResult()
    t.ck('the review is published with Seller Service 4 and one Product Quality rating of 5', r.kind === 'ok' && (await page.locator(`[data-review="${ord}-REV1"]`).count()) === 1 && (await page.locator('[data-rating]').count()) === 1, r)
    t.ck('it is labelled a simulation record, not a verified purchase, and the composer is gone: one review per grant', /not a verified purchase/.test(await d.detailText()) && (await page.locator('[data-review-composer]').count()) === 0 && (await page.getByRole('button', { name: 'Submit review' }).count()) === 0)
    await noOverflow('Buyer review')
    await d.click(/Back to Orders/)
    t.eq('the Order\'s "Review open" chip is gone', await page.locator('[data-review-chip="open"]').count(), mine.length - 1)
    // supplied review: read-only
    const rv = visible.find(x => x.buyer_id === 'BY-02' && x.basis === 'FINAL_HANDOFF')
    await d.openOrder(rv.order_id)
    t.ck(`a reviewed Order (${rv.order_id}) shows the supplied review read-only: stars, text, its ratings; no composer`, (await page.locator(`[data-review="${rv.review_id}"]`).count()) === 1 && (await d.detailText()).includes(rv.seller_service_text) && (await page.locator('[data-rating]').count()) === ops.product_ratings.filter(p => p.review_id === rv.review_id).length && (await page.locator('[data-review-composer]').count()) === 0)
    await d.click(/Back to Orders/)
    await d.openOrder('SIM-O-0021')
    t.ck('a review held by moderation is shown to its own Buyer as held: not shown to others and not counted', (await page.locator('[data-review-held]').count()) === 1)
    await d.click(/Back to Orders/)
    await d.openOrder('SIM-O-0145')
    const fr = await d.detailText()
    t.ck('the failure-only review (supplied Claim) is Seller Service only: 1 star, "Verified failure: service only", no Product Quality', (await page.locator('[data-review-basis="failure"]').count()) === 1 && (await page.locator('[data-rating]').count()) === 0 && (await page.locator('[data-review="SIM-O-0145-REV1"] [role="img"]').first().getAttribute('aria-label')) === 'Seller Service 1 out of 5')
    t.ck('the Claim is the supplied one: the Order is the Seller-fault non-delivery (Seller Delivery failed)', /SELLER_NON_DELIVERY/.test(fr) && ops.claims[0].order_id === 'SIM-O-0145')

    // ---- 5. The new review reaches the Seller, the aggregates and the readout ----
    await consoleNav(ds, 'Reviews')
    const svcSum = before.reduce((a, x) => a + x.seller_service_stars, 0) + 4, n = before.length + 1
    t.ck(`${ds} Seller Service moves to ${fmt(svcSum / n)} from ${n} visible reviews (the new one included)`, (await page.locator('[data-service-average]').innerText()).trim() === fmt(svcSum / n) && new RegExp(`${n} visible reviews`).test(await page.locator('[data-service-count]').innerText()) && (await page.locator(`[data-service-review="${ord}-REV1"]`).count()) === 1)
    await page.getByRole('tab', { name: 'Product Quality' }).click(); await d.settle(250)
    const rated = visRatings.filter(p => p.product_id === ls[0].product_id), sum2 = rated.reduce((a, p) => a + p.product_quality_stars, 0) + 5
    t.ck(`the rated Product's Product Quality moves to ${fmt(sum2 / (rated.length + 1))} from ${rated.length + 1} (separately from Seller Service)`, (await page.locator(`[data-product-quality="${ls[0].product_id}"] [data-pq-summary]`).innerText()).includes(`★ ${fmt(sum2 / (rated.length + 1))} · ${rated.length + 1}`))
    await d.consoleOrders(ds); await page.locator('#orders-filter').selectOption('COMPLETED'); await d.settle(250); await d.openOrder(ord)
    t.ck('the Seller\'s Order detail shows the Buyer review (simulation)', /Buyer review \(simulation\)/i.test(await d.detailText()) && (await page.locator(`[data-review="${ord}-REV1"]`).count()) === 1)
    await operatorReadout(); text = await page.locator('[data-reputation-readout]').innerText()
    t.ck('readout: the supplied figures still reconcile, the live column gains the session review, and it says so', /Sellers reconciled\s+23 of 23/.test(text) && /1 review written in this session is included in the Live columns only/.test(text) && (await page.locator(`[data-recon-seller="${ds}"]`).innerText()).includes(`${n} · ${fmt(svcSum / n)}`))

    // ---- 6. Premature reviews: a grant opens 60 simulated minutes after the final handoff ----
    const done = await d.finishDelivery0138()
    t.ck('Daniel delivers SIM-O-0138 to Hana: completed, which issues Hana a Review Grant', done.kind === 'ok' && (await d.status()) === 'COMPLETED', done)
    t.ck('the grant is not open yet: the composer says when it opens and the chip reads "Review opens soon"', (await page.locator('[data-review-composer][data-grant-state="soon"]').count()) === 1 && /opens at 27 Nov, 11:00/.test(await d.detailText()))
    await page.locator('#rv-s-SIM-O-0138').selectOption('5'); await page.getByRole('button', { name: 'Submit review' }).click(); await d.settle(300)
    r = await reviewResult()
    t.ck('a premature review is refused ("Too early") and nothing is published', r.kind === 'refused' && /Too early/.test(r.text) && (await page.locator('[data-review]').count()) === 0, r)
    await d.advance(15); await d.advance(15); await d.advance(15)
    await page.getByRole('button', { name: 'Submit review' }).click(); await d.settle(300)
    t.ck('still refused at 45 simulated minutes', (await reviewResult()).kind === 'refused')
    await d.advance(15)
    t.eq('at 60 simulated minutes the grant is open', await page.locator('[data-review-composer]').getAttribute('data-grant-state'), 'open')
    await page.locator('#rv-s-SIM-O-0138').selectOption('5'); await page.getByRole('button', { name: 'Submit review' }).click(); await d.settle(350)
    t.ck('the review is accepted once the clock has reached eligible_at (service only: no Product Quality chosen)', (await reviewResult()).kind === 'ok' && (await page.locator('[data-review="SIM-O-0138-REV1"]').count()) === 1 && (await page.locator('[data-rating]').count()) === 0)

    // ---- 7. Reset, isolation ----
    await page.getByRole('button', { name: 'Reset simulation' }).first().click(); await d.settle(400)
    await d.click(/Back to Orders/)
    t.eq('Reset restores the supplied grants and removes the session reviews', await page.locator('[data-review-chip="open"]').count(), mine.length)
    t.eq('the MVP Seller workspace (stock, Trust, Cart) was never written by any review action', await d.wsState(), wsBefore)
    await consoleNav('DS-01', 'Reviews'); t.ck('after Reset the DS-01 figures are the supplied ones again', (await page.locator('[data-service-average]').innerText()).trim() === fmt(repOf('DS-01').service_rating))
  })
}
