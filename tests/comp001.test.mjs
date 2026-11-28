// COMP-001 (FR-007 Alerts): the Companion's priority-ordered Alerts, built from the selected Seller's imported records.
// REAL app, marketplace dataset (tests/suites.json marks it), 390x844 (the phone) and 1440x900 (the phone frame). Expected values come from the generated dataset.
// Fixtures: the Buyer-waiting alert uses an escalated chat written into session storage (the Buyer chat flow itself is covered by bot006 on the legacy dataset).
import { suite } from './harness.mjs'
import { comp, ops, cat, dsProducts, lowOf, outOf, SESSION_KEY } from './comp-helpers.mjs'

const S01 = 'DS-01'
const out1 = outOf(S01)[0], low1 = lowOf(S01)[0]
const scene3 = cat.scenes.find(s => s.scene_id === 'DS-01-S03')

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  await suite('comp001', viewport, async (page, t) => {
    const c = comp(page, t, viewport)
    await c.open()

    // ---- 1. The tab bar and the hierarchy ----
    const tabs = await c.tabNames()
    t.ck('the Companion tabs are Alerts, Catalogue, Inbox, Team, Profile (More is gone)', JSON.stringify(tabs) === JSON.stringify(['Alerts', 'Catalogue', 'Inbox', 'Team', 'Profile']), tabs)
    t.ck('DS-01: the one out-of-stock Product is a prominent HIGH card (an article)', await page.locator(`article[data-alert="product:out:${out1.product_id}"][data-priority="high"]`).count() === 1, out1)
    t.eq('DS-01: out-of-stock cards equal the published Products with 0 units', await page.locator('article[data-alert^="product:out:"]').count(), outOf(S01).length)
    t.ck('DS-01: the low-stock Product is a compact ROUTINE row (a list item)', await page.locator(`li[data-alert="product:low:${low1.product_id}"][data-priority="routine"]`).count() === 1, low1)
    t.eq('DS-01: low-stock rows equal the published Products with 1-3 units', await page.locator('li[data-alert^="product:low:"]').count(), lowOf(S01).length)
    t.ck('DS-01: the auto-Private Scene (every tagged Product out of stock) is a HIGH card', scene3.visibility === 'PRIVATE' && await page.locator('article[data-alert="scene:private:DS-01-S03"][data-priority="high"]').count() === 1)
    t.ck('DS-01: the HIGH-priority team task due tomorrow is a HIGH card that names the assignee', await page.locator('article[data-alert="task:DS-01-TM01-TASK1"][data-priority="high"]').count() === 1 && /Task due tomorrow/.test(await c.alert('task:DS-01-TM01-TASK1').innerText()))
    t.ck('DS-01: a task due later (12 Dec) and a DONE task raise nothing', await c.alert('task:DS-01-TM04-TASK1').count() === 0 && await c.alert('task:DS-01-TM03-TASK1').count() === 0)
    const summary = ops.seller_summary.find(s => s.seller_id === S01)
    const activity = await page.locator('[data-alerts-activity]').innerText()
    t.ck('activity is its own section: followers and the response rate from seller_summary', new RegExp(summary.followers_snapshot.toLocaleString('en-US')).test(activity) && new RegExp(`${summary.current_responded} of ${summary.current_inquiries} answered`).test(activity), activity)
    t.ck('activity rows are not cards or routine rows', await page.locator('[data-alerts-activity] article, [data-alerts-activity] [data-priority="routine"]').count() === 0)
    const tops = await page.evaluate(() => ['article[data-alert]', 'li[data-priority="routine"]', '[data-alerts-activity]'].map(sel => document.querySelector(sel)?.getBoundingClientRect().top ?? -1))
    t.ck('order on the page: prominent cards, then routine rows, then activity', tops[0] > 0 && tops[0] < tops[1] && tops[1] < tops[2], tops)
    const headings = await c.text()
    t.ck('the current MVP shows no Order, paid, delivery, handoff or Courier alert', !/SIM-O-|paid Order|Delivery failed|Courier offer|handoff pending|Courier comment/i.test(headings))
    t.ck('the Alerts tab badge counts the unread critical, high and routine alerts', await (async () => { const n = await page.locator('article[data-alert]:not([data-read]), li[data-priority="routine"]:not([data-read])').count(); return (await c.nav().getByRole('button').first().innerText()).includes(String(n)) })())
    await c.overflow('Alerts')

    // ---- 2a. Mark as read (before anything is opened: opening an alert marks it read too) ----
    const outId = `product:out:${out1.product_id}`
    await page.getByRole('button', { name: /^Mark as read: Out of stock/ }).first().click(); await t.settle(300)
    t.ck('Mark as read keeps the alert, marks it read and lowers the badge', await c.alert(outId).getAttribute('data-read') === 'true')
    let store = await c.store(SESSION_KEY)
    t.ck('the read mark is stored per Seller, namespaced by dataset', store?.alerts?.[S01]?.read?.includes(outId) && !store?.alerts?.['DS-02'], store?.alerts)
    await c.tab('Inbox'); await c.tab('Alerts')
    t.ck('the read mark survives a tab change', await c.alert(outId).getAttribute('data-read') === 'true')
    // ---- 2. Each actionable alert opens its destination and Back returns to Alerts ----
    await c.click(page.locator(`[data-alert="product:out:${out1.product_id}"] button`).first())
    t.ck('Out of stock opens the Product (Catalogue row with its stock stepper)', await page.getByRole('button', { name: `Increase ${out1.name} stock` }).count() === 1 && /Product/.test(await c.text()))
    await c.backToAlerts()
    t.ck('Back to Alerts returns to Alerts', await c.alert(`product:out:${out1.product_id}`).count() === 1)
    await c.click(page.locator(`[data-alert="scene:private:DS-01-S03"] button`).first())
    t.ck('the Scene alert opens the Scene: Private, with every tagged Product unavailable', await page.locator('[data-scene-detail="DS-01-S03"]').count() === 1 && /Private/.test(await c.text()) && /Unavailable/.test(await c.text()))
    await c.backToAlerts()
    await c.click(page.locator(`[data-alert="task:DS-01-TM01-TASK1"] button`).first())
    t.ck('the task alert opens the Team task', await page.locator('[data-task-detail="DS-01-TM01-TASK1"]').count() === 1 && /Review pending operational alerts/.test(await c.text()))
    await c.backToAlerts()
    t.ck('Back to Alerts after the task returns to Alerts, and the opened alert is now read', await c.alert('task:DS-01-TM01-TASK1').count() === 1 && await c.alert('task:DS-01-TM01-TASK1').getAttribute('data-read') === 'true')
    await c.click(page.locator(`[data-alert="product:low:${low1.product_id}"] button`).first())
    t.ck('a routine low-stock row opens its Product as well', await page.getByRole('button', { name: `Increase ${low1.name} stock` }).count() === 1)
    await c.backToAlerts()

    // ---- 3. Read, dismiss and restore are kept per Seller in the session ----
    await page.getByRole('button', { name: /^Dismiss: Low stock/ }).first().click(); await t.settle(300)
    t.ck('Dismiss hides the alert and says how many are dismissed', await c.alert(`product:low:${low1.product_id}`).count() === 0 && /1 dismissed alert\b/.test(await c.text()))
    await page.getByRole('button', { name: 'Restore all' }).click(); await t.settle(300)
    t.ck('Restore all brings the dismissed alert back', await c.alert(`product:low:${low1.product_id}`).count() === 1)
    await c.open('DS-02')
    t.ck('another Seller starts with nothing read or dismissed', await page.locator('[data-read="true"]').count() === 0)
    t.ck('DS-02: the partly-unavailable Scene is a routine row, the out-of-stock Product a HIGH card', await page.locator('li[data-alert="scene:tags:DS-02-S03"][data-priority="routine"]').count() === 1 && await page.locator('article[data-alert^="product:out:"]').count() === outOf('DS-02').length)
    await c.open(S01)
    t.ck('DS-01 still has its read mark after switching Sellers and back (same session)', await c.alert(outId).getAttribute('data-read') === 'true')

    // ---- 4. Alerts follow the records: restocking clears the Scene and downgrades the Product ----
    await c.tab('Catalogue')
    await page.getByRole('button', { name: `Increase ${out1.name} stock` }).click(); await t.settle(300)
    await c.tab('Alerts')
    t.ck('after a restock to 1 the out-of-stock card and the Private-Scene card are gone', await c.alert(outId).count() === 0 && await c.alert('scene:private:DS-01-S03').count() === 0)
    t.ck('the restocked Product is now a routine low-stock row', await page.locator(`li[data-alert="product:low:${out1.product_id}"][data-priority="routine"]`).count() === 1)

    // ---- 5. Lifecycle states ----
    await c.open('DS-11')
    t.ck('DS-11 (Draft): "Store not live yet" is a HIGH card, there are no stock, Scene or Inbox alerts', await page.locator('article[data-alert="seller:draft"][data-priority="high"]').count() === 1 && await page.locator('[data-alert^="product:"], [data-alert^="scene:"], [data-alert^="inbox:"]').count() === 0)
    t.ck('DS-11 names its open setup steps', /setup steps? open/.test(await c.alert('seller:draft').innerText()))
    await c.click(page.locator('[data-alert="seller:draft"] button').first())
    t.ck('the lifecycle alert opens the Profile (Draft badge) and Back returns to Alerts', await page.locator('[data-lifecycle="DRAFT"]').count() === 1)
    await c.backToAlerts()
    await c.open('DS-23')
    t.ck('DS-23 (Suspended): "Store suspended" is a CRITICAL card first, nothing about stock or Scenes', await page.locator('article[data-alert="seller:suspended"][data-priority="critical"]').count() === 1 && await page.locator('[data-alert^="product:"], [data-alert^="scene:"]').count() === 0)
    t.ck('the critical card is the first card on the page', await page.evaluate(() => document.querySelector('article[data-alert]')?.getAttribute('data-alert')) === 'seller:suspended')

    // ---- 6. Inbox: a Buyer waiting for a reply (fixture) ----
    await page.addInitScript(() => {
      try {
        const key = 'adulis.seller-workspace.v1:marketplace'
        const saved = JSON.parse(sessionStorage.getItem(key) ?? '{}')
        const k = 'BY-01|DS-01|MKT-ET'
        if (saved.chats?.[k]) return
        const chat = { key: k, sellerId: 'DS-01', buyerId: 'BY-01', marketId: 'MKT-ET', mode: 'bot', pending: null, waiting: true, seq: 1, messages: [{ id: 'fx-1', seq: 1, from: 'buyer', text: 'Can you reserve the green dress until Friday?', escalated: true }] }
        sessionStorage.setItem(key, JSON.stringify({ ...saved, chats: { ...(saved.chats ?? {}), [k]: chat } }))
      } catch { /* fixture only */ }
    })
    await c.open(S01)
    t.ck('a waiting Buyer is a HIGH card with the Buyer and the message', await page.locator('article[data-alert^="inbox:"][data-priority="high"]').count() === 1 && /reserve the green dress/.test(await page.locator('article[data-alert^="inbox:"]').first().innerText()))
    await c.click(page.locator('article[data-alert^="inbox:"] button').first())
    t.ck('it opens the conversation thread', /reserve the green dress/.test(await c.text()) && await page.getByRole('button', { name: 'Back to Alerts' }).count() === 1)
    await c.backToAlerts()
    t.ck('Back to Alerts returns to Alerts', await page.locator('[data-alerts-hub]').count() === 1)

    // ---- 7. The internal simulation adds Order, delivery and moderation alerts, and only there ----
    const paid = ops.orders.find(o => o.status === 'READY_FOR_COLLECTION')   // DS-08: a Buyer Collection Order waiting for the Seller's handoff code
    await c.setMode(true)
    await c.companion('Alerts', 'DS-08')
    t.ck(`simulation: the ${paid.order_id} Order that needs DS-08 is a HIGH card that opens the Order`, await page.locator(`article[data-alert="order:${paid.order_id}"][data-priority="high"]`).count() === 1, paid.order_id)
    await c.click(page.locator(`[data-order-alert="${paid.order_id}"]`).first())
    t.ck('it opens the Order in the Orders tab, with a Back to Alerts', await page.locator(`[data-order-detail="${paid.order_id}"]`).count() === 1 && await page.getByRole('button', { name: 'Back to Alerts' }).count() === 1)
    await c.backToAlerts()
    t.ck('Back to Alerts returns to Alerts', await page.locator('[data-alerts-hub]').count() === 1)
    await c.companion('Alerts', 'DS-06')
    t.ck('simulation: DS-06\'s Scene restriction is a CRITICAL card', await page.locator('article[data-alert="scene:restricted:DS-06-S05"][data-priority="critical"]').count() === 1)
    t.ck('simulation: the held Courier comment (CC-009) is a CRITICAL moderation card', await page.locator('article[data-alert="moderation:CC-009"][data-priority="critical"]').count() === 1)
    await c.setMode(false)
    await c.companion('Alerts', 'DS-06')
    t.ck('back in the MVP the Scene restriction and the Courier comment are gone', await page.locator('[data-alert^="scene:restricted"], [data-alert^="moderation:"]').count() === 0 && !/SIM-O-/.test(await c.text()))
    t.ck('the simulation alerts never changed the MVP workspace (no stock or Order state written)', !(await c.store('adulis.simulation.v1:marketplace|mvp')))
    await c.overflow('Alerts (end)')
  })
}
