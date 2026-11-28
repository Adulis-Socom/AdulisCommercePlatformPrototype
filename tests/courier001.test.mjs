// COURIER-001 (FR-004): shared Courier comments with Seller, Courier and simulated Order provenance. Positive, neutral, negative and pending-moderation feedback in
// the Courier app (the Courier's own page, grouped and filterable) and in the Seller Console (the Couriers page and the Order detail). Pending comments are visibly
// pending and never counted; only visibility-allowed comments reach other Sellers; shared comments stay separate from private relationship notes; every surface carries
// the "Prototype experiment" label; there are no ratings. REAL app, marketplace dataset, 1440x900 and 390x844. Expected values are computed from the dataset.
import { suite } from './harness.mjs'
import { drivers, ops, sellerName } from './sim-helpers.mjs'

const LABEL = 'Prototype experiment, not approved production reputation policy'
const about = c => ops.courier_comments.filter(x => x.courier_id === c)
const shared = rows => rows.filter(x => x.visibility === 'PROPOSED_SHARED_ELIGIBLE_SELLERS' && x.moderation_state === 'VISIBLE_FIXTURE')
const served = (c, s) => ops.orders.some(o => o.assigned_courier_id === c && o.seller_id === s)
const tally = rows => ({ positive: rows.filter(x => x.sentiment === 'POSITIVE').length, neutral: rows.filter(x => x.sentiment === 'NEUTRAL').length, negative: rows.filter(x => x.sentiment === 'NEGATIVE').length })

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('courier001', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const noOverflow = async label => t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, (await d.noOverflow(label)).ok)
    const sellerCouriers = async seller => {
      await d.consoleOrders(seller)
      if (viewport.width <= 640) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await d.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Couriers/ }).first().click() } else await page.getByRole('button', { name: /^Couriers/ }).first().click()
      await d.settle(400)
    }
    const summaryText = () => page.locator('[data-comment-summary]').first().innerText()
    await t.open()

    // ---- 1. Current MVP: no comments anywhere ----
    await d.courier('CR-01', 'Feedback')
    t.ck('MVP: the Courier Feedback tab is the simulation gate, no comment is shown', /internal-simulation experiment/i.test(await d.main()) && (await page.locator('[data-comment]').count()) === 0)
    await sellerCouriers('DS-17')
    t.ck('MVP: the Seller Console Couriers page shows no comments and says they are part of the internal simulation', (await page.locator('[data-comment]').count()) === 0 && /part of the internal simulation/.test(await d.main()))

    // ---- 2. The Courier's own feedback page ----
    await d.setMode(true)
    await d.courier('CR-01', 'Feedback')
    const dan = about('CR-01'), danShared = shared(dan), tl = tally(danShared)
    t.eq('Daniel sees all 12 comments about him, one of them pending moderation', await page.locator('[data-comment]').count(), dan.length)
    t.ck('the experiment label is on the page', (await page.locator('[data-experiment-label]').first().innerText()).includes(LABEL))
    const sum = await summaryText()
    t.ck(`the summary counts only visible comments: Positive ${tl.positive}, Neutral ${tl.neutral}, Negative ${tl.negative}, and reports the pending one beside the counts`, new RegExp(`Positive ${tl.positive}`).test(sum) && new RegExp(`Neutral ${tl.neutral}`).test(sum) && new RegExp(`Negative ${tl.negative}`).test(sum) && /11 visible comments/.test(sum) && /1 pending moderation, not counted/.test(sum), sum)
    t.ck('the pending comment CC-009 is visibly pending ("Pending moderation · not counted") and not marked visible', /Pending moderation · not counted/.test(await page.locator('[data-comment="CC-009"]').innerText()) && (await page.locator('[data-comment="CC-009"]').getAttribute('data-comment-moderation')) === 'PENDING_REVIEW')
    const bySent = {}; for (const s of ['POSITIVE', 'NEUTRAL', 'NEGATIVE']) bySent[s] = await page.locator(`[data-comment-sentiment="${s}"]`).count()
    t.ck('positive, neutral and negative comments all appear, each with its sentiment', ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].every(s => bySent[s] === dan.filter(x => x.sentiment === s).length && bySent[s] > 0), bySent)
    let provenanceOk = true
    for (const c of dan) { const txt = await page.locator(`[data-comment="${c.comment_id}"]`).innerText(); if (!(txt.includes(c.seller_id) && txt.includes(`Order ${c.order_id}`) && txt.includes(sellerName(c.seller_id)) && txt.includes(c.text))) provenanceOk = false }
    t.ck('every comment shows its Seller (name and id), its Order and its text, as supplied', provenanceOk)
    t.ck('no ratings are shown: no stars, no score', (await page.locator('[data-courier-feedback]').innerText()).search(/★|out of 5|rating:/i) === -1)
    // filters
    await page.locator('#fb-sentiment').selectOption('NEGATIVE'); await d.settle(200)
    t.eq('filter Negative: the negative comments only', await page.locator('[data-comment]').count(), dan.filter(x => x.sentiment === 'NEGATIVE').length)
    await page.locator('#fb-sentiment').selectOption('PENDING'); await d.settle(200)
    t.ck('filter Pending moderation: exactly CC-009', (await page.locator('[data-comment]').count()) === 1 && (await page.locator('[data-comment="CC-009"]').count()) === 1)
    await page.locator('#fb-sentiment').selectOption('ALL'); await page.locator('#fb-topic').selectOption('DELAY'); await d.settle(200)
    t.eq('filter topic Delay', await page.locator('[data-comment]').count(), dan.filter(x => x.topic === 'DELAY').length)
    t.ck('the count line says "n of 12 comments"', new RegExp(`${dan.filter(x => x.topic === 'DELAY').length} of 12 comments`).test(await page.locator('[data-comment-count]').innerText()))
    await page.locator('#fb-topic').selectOption('ALL'); await d.settle(150)
    await noOverflow('Courier Feedback')
    // order link
    await page.locator('[data-comment-order="SIM-O-0136"]').click(); await d.settle(400)
    t.ck('the Order link opens the supplied Order SIM-O-0136 (Completed, Daniel is its Courier)', (await page.locator('[data-order-detail="SIM-O-0136"]').count()) === 1 && /Daniel\s+CR-01/.test(await d.detailText()) && (await d.status()) === 'COMPLETED')
    // separation from private relationship notes
    await d.courier('CR-01', 'Feedback')
    t.ck('the feedback page has no private relationship note and no relationship status', (await page.locator('[data-private-note], [data-pool-status]').count()) === 0 && /separate from your private relationship notes/.test(await d.main()))
    await d.courier('CR-01', 'Pools')
    t.ck('the Pools page has the private notes and no shared comment', (await page.locator('[data-private-note]').count()) > 0 && (await page.locator('[data-comment]').count()) === 0)
    await d.courier('CR-05', 'Feedback')
    t.ck('Bethel (CR-05) has no comments: an empty state, no counts invented', (await page.locator('[data-comment]').count()) === 0 && /No comments match/.test(await d.main()) && /Positive 0/.test(await summaryText()))
    await d.courier('CR-03', 'Feedback'); t.eq('Mekdes sees her 3 comments, one of them negative', `${await page.locator('[data-comment]').count()},${await page.locator('[data-comment-sentiment="NEGATIVE"]').count()}`, '3,1')

    // ---- 3. The Seller Console: only comments about Couriers that served the Seller ----
    for (const [seller, courier] of [['DS-17', 'CR-01'], ['DS-17', 'CR-02']]) {
      await sellerCouriers(seller)
      const exp = shared(about(courier))
      t.ck(`${seller} (served by ${courier}) sees the ${exp.length} shared comments about ${courier}, none pending`, (await page.locator(`[data-feedback-courier="${courier}"] [data-comment]`).count()) === exp.length && (await page.locator(`[data-feedback-courier="${courier}"] [data-pending]`).count()) === 0, await page.locator(`[data-feedback-courier="${courier}"] [data-comment]`).count())
    }
    t.ck('the Seller page carries the experiment label and the sentiment counts', (await page.locator('[data-seller-feedback] [data-experiment-label]').first().innerText()).includes(LABEL) && /Positive \d+/.test(await page.locator('[data-feedback-courier="CR-01"] [data-comment-summary]').innerText()))
    const ds17 = await page.locator('[data-feedback-courier="CR-01"]').innerText()
    t.ck('other Sellers\' comments are labelled "Another Seller" with no Order id; its own shows "Your comment" and its Order', /Another Seller/.test(ds17) && !/SIM-O-0136/.test(ds17) && /Your comment/.test(ds17) && /Order SIM-O-0101/.test(ds17))
    await noOverflow('Seller Console feedback')
    await sellerCouriers('DS-06')
    t.ck('DS-06 (author of the pending CC-009) sees it flagged pending, plus the 11 visible ones', (await page.locator('[data-feedback-courier="CR-01"] [data-comment]').count()) === 12 && (await page.locator('[data-feedback-courier="CR-01"] [data-comment="CC-009"] [data-pending]').count()) === 1 && /1 pending moderation, not counted/.test(await page.locator('[data-feedback-courier="CR-01"] [data-comment-summary]').innerText()))
    await sellerCouriers('DS-08')
    t.ck('another Seller served by Daniel (DS-08) does not see the pending CC-009', (await page.locator('[data-comment="CC-009"]').count()) === 0 && (await page.locator('[data-feedback-courier="CR-01"] [data-comment]').count()) === 11)
    await sellerCouriers('DS-16')
    t.ck('DS-16 has never been served by a Courier: no feedback, and it says so', (await page.locator('[data-no-served]').count()) === 1 && (await page.locator('[data-comment]').count()) === 0)
    t.ck('every Seller seeing a Courier has an Order that Courier served (the eligibility rule)', served('CR-01', 'DS-17') && !served('CR-01', 'DS-16'))
    await sellerCouriers('DS-01')
    t.ck('the Seller Console Couriers page keeps the relationship status (private) apart from the feedback section', (await page.locator('[data-seller-pool-row]').count()) === 2 && (await page.locator('[data-seller-feedback]').count()) === 1)

    // ---- 4. Order detail: the Seller's comment on a supplied Order, and a new comment with evidence ----
    await d.consoleOrders('DS-05'); await page.locator('#orders-filter').selectOption('COMPLETED'); await d.settle(250); await d.openOrder('SIM-O-0136')
    t.ck('SIM-O-0136 (DS-05): the Order detail shows its comment as "Your comment", with the label, and no composer (already commented)', (await page.locator('[data-order-comment] [data-comment="CC-001"]').count()) === 1 && /Your comment/.test(await d.detailText()) && (await page.locator('[data-comment-composer]').count()) === 0 && (await d.detailText()).includes(LABEL))
    await d.consoleOrders('DS-01'); await d.openOrder('SIM-O-0138')
    t.ck('SIM-O-0138 is still out for delivery: no comment composer (a finished Order served by the Courier is required)', (await page.locator('[data-comment-composer]').count()) === 0)
    const done = await d.finishDelivery0138()
    t.ck('Daniel delivers SIM-O-0138 to Hana: the Order is completed (comment evidence now exists)', done.kind === 'ok' && (await d.status()) === 'COMPLETED', done)
    await d.consoleOrders('DS-01'); await page.locator('#orders-filter').selectOption('COMPLETED'); await d.settle(250); await d.openOrder('SIM-O-0138')
    t.eq('the Seller now has the comment composer on the finished Order', await page.locator('[data-comment-composer]').count(), 1)
    await page.getByRole('button', { name: 'Add comment' }).click(); await d.settle(300)
    let r = await d.lastResult()
    t.ck('an empty comment is refused with a reason and nothing is recorded', r.kind === 'refused' && /short factual comment/.test(r.text) && (await page.locator('[data-order-comment]').count()) === 0, r)
    await page.locator('select[id^="cc-s-"]').selectOption('NEGATIVE'); await page.locator('select[id^="cc-t-"]').selectOption('DELAY')
    await page.locator('textarea[id^="cc-x-"]').fill('Pickup started 20 minutes after the agreed time.'); await page.getByRole('button', { name: 'Add comment' }).click(); await d.settle(300)
    r = await d.lastResult()
    t.ck('the comment is recorded pending moderation: shown to the Seller as pending, not counted, composer gone', r.kind === 'ok' && /pending moderation/.test(r.text) && (await page.locator('[data-order-comment] [data-pending]').count()) === 1 && (await page.locator('[data-comment-composer]').count()) === 0, r)
    await d.courier('CR-01', 'Feedback')
    t.ck('Daniel sees the new comment as pending (2 pending), and the visible counts are unchanged', (await page.locator('[data-comment]').count()) === 13 && /2 pending moderation, not counted/.test(await summaryText()) && /11 visible comments/.test(await summaryText()))
    await sellerCouriers('DS-17')
    t.ck('another Seller does not see the new pending comment about Daniel', (await page.locator('[data-feedback-courier="CR-01"] [data-comment]').count()) === 11)
    await sellerCouriers('DS-01')
    t.ck('the author (DS-01) sees its own pending comment on the Couriers page, flagged', (await page.locator('[data-feedback-courier="CR-01"] [data-comment] [data-pending]').count()) === 1)
    await noOverflow('Seller Console feedback after a comment')
  })
}
