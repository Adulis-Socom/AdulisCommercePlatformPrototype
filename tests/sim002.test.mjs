// SIM-002 (FR-015): interactive Handoffs on the marketplace dataset (internal simulation). Supplied evidence per Order, the three fulfilment modes end to end,
// pickup custody that never completes the Order, and every negative scan (incorrect, expired, repeated, wrong Order, wrong party, unauthorised Courier).
// A refused scan shows its reason and leaves the Order exactly as it was. REAL app, 1440x900 and 390x844. Synthetic credentials only (no camera, GPS or PSP).
import { suite } from './harness.mjs'
import { drivers, ops, sellerName } from './sim-helpers.mjs'

const handoffsOf = id => ops.handoffs.filter(h => h.order_id === id)
const stageLabel = { PICKUP: 'Pickup', DELIVERY: 'Final delivery', RETURN: 'Return' }

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('sim002', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const handoffCount = () => page.locator('[data-order-detail] [data-handoff]').count()
    const refuse = async (label, scanArgs, re) => {
      const before = [await d.status(), await handoffCount()]
      const r = await d.scan(scanArgs)
      t.ck(`${label}: refused with a clear reason`, r.kind === 'refused' && re.test(r.text), r)
      t.ck(`${label}: nothing changed (status ${before[0]}, ${before[1]} handoff(s))`, (await d.status()) === before[0] && (await handoffCount()) === before[1])
    }
    const success = async (label, scanArgs, expect) => {
      const r = await d.scan(scanArgs)
      t.ck(`${label}: accepted`, r.kind === 'ok' && expect.test(r.text), r)
    }
    // Open an Order in the Seller Console (default filter shows open Orders).
    const inConsole = async (seller, id) => { await d.consoleOrders(seller); await d.openOrder(id) }
    const create = async (seller, buyer, mode) => {
      await d.consoleOrders(seller)
      const r = await d.newOrder({ buyer, mode })
      await d.openOrder(r.id)
      return r.id
    }
    const ready = async () => { await d.act('Start preparing'); await d.act(/Mark ready/) }
    const asBuyer = async (id, order) => { await d.buyerOrders(id); await d.openOrder(order) }
    const asCourier = async (id, order) => { await d.courier(id, 'Active'); await d.openOrder(order) }

    await t.open()
    await d.setMode(true)

    // ---- 1. Supplied Handoff evidence ----
    await inConsole('DS-01', 'SIM-O-0138')
    let text = await d.detailText()
    t.ck('SIM-O-0138: the supplied PICKUP Handoff shows stage, presenter, scanner, method, verified time, result and credential', /Pickup · ACCEPTED_SIMULATED/.test(text) && /Presenter\s+Aster & Thread \(Seller\)/.test(text) && /Scanner\s+Daniel \(Courier\)/.test(text) && /Method\s+QR/.test(text) && /Verified\s+27 Nov, 07:00/.test(text) && /Credential\s+DEMO_ONLY_NON_REUSABLE/.test(text), text.slice(text.indexOf('Handoffs'), text.indexOf('Handoffs') + 400))
    t.ck('SIM-O-0138 has no final Handoff yet and says the code is synthetic', (await page.locator('[data-handoff="DELIVERY"]').count()) === 0 && /no real QR authority/.test(text))
    const done = ops.orders.find(o => o.fulfilment_mode === 'COURIER_DELIVERY' && o.status === 'COMPLETED')
    await d.consoleOrders(done.seller_id); await page.locator('#orders-filter').selectOption('COMPLETED'); await d.settle(250); await d.openOrder(done.order_id)
    t.eq(`${done.order_id} (completed Courier Delivery): both supplied Handoffs (pickup and final) are shown`, await handoffCount(), handoffsOf(done.order_id).length)
    t.ck('the final Handoff is Courier to Buyer', (await page.locator('[data-handoff="DELIVERY"]').innerText()).includes('(Courier)') && /Buyer\)/.test(await page.locator('[data-handoff="DELIVERY"]').innerText()))
    const ret = handoffsOf('SIM-O-0144').find(h => h.stage === 'RETURN')
    await d.consoleOrders('DS-17'); await page.locator('#orders-filter').selectOption('RETURNED_TO_SELLER'); await d.settle(250); await d.openOrder('SIM-O-0144')
    text = await d.detailText()
    t.ck('SIM-O-0144 (returned): the RETURN Handoff is shown with its method and the failed-attempt state', /Return · ACCEPTED_SIMULATED/.test(text) && text.includes(ret.method) && /Returned to Seller/.test(text))
    t.ck('SIM-O-0145 (Seller Delivery failed) shows its recorded reason', await (async () => { await d.consoleOrders('DS-04'); await page.locator('#orders-filter').selectOption('DELIVERY_FAILED'); await d.settle(250); await d.openOrder('SIM-O-0145'); return /SELLER_NON_DELIVERY/.test(await d.detailText()) })())

    // ---- 2. The supplied active Courier Delivery (SIM-O-0138): final QR, Buyer scans; every negative scan on the way ----
    await asCourier('CR-01', 'SIM-O-0138')
    await page.getByRole('button', { name: 'Display final delivery code' }).click(); await d.settle(300)
    const f1 = await d.token()
    t.ck('the Courier displays the final code: a synthetic token, 10 simulated minutes, single use, bound to the Order, DEMO_ONLY_NON_REUSABLE', /^ADU-SIM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(f1) && /10 of 10 simulated minutes left/.test(await d.detailText()) && /single use/.test(await d.detailText()) && /bound to SIM-O-0138/.test(await d.detailText()) && (await page.getByRole('img', { name: /Synthetic demonstration code/ }).count()) === 1)
    t.ck('no camera is requested (the scan is a button, not a viewfinder)', (await page.locator('video').count()) === 0)
    await asBuyer('BY-02', 'SIM-O-0138')
    await refuse('incorrect token (Buyer, final)', { stage: 'DELIVERY', token: 'ADU-SIM-AAAA-BBBB' }, /incorrect code/i)
    await refuse('Buyer scanning the pickup stage', { stage: 'PICKUP', token: f1 }, /buyer cannot scan the pickup/i)
    await refuse('Buyer scanning the return stage', { stage: 'RETURN', token: f1 }, /buyer cannot scan the return/i)
    await d.advance(15)
    await refuse('expired token (15 simulated minutes later)', { stage: 'DELIVERY', token: f1 }, /expired/i)
    await asCourier('CR-01', 'SIM-O-0138')
    t.ck('the Courier sees the code expired and can display a new one', /is expired/.test(await d.detailText()) && (await page.getByRole('button', { name: 'Display a new code' }).count()) === 1)
    await page.getByRole('button', { name: 'Display a new code' }).click(); await d.settle(300)
    const f2 = await d.token()
    t.ck('the new code is a different token', f2 !== f1)
    await asBuyer('BY-02', 'SIM-O-0138')
    await refuse('the superseded (expired) code is refused even though it is the right Order', { stage: 'DELIVERY', token: f1 }, /expired/i)
    await success('Buyer scans the final code with the field empty (reads the code on display)', { stage: 'DELIVERY' }, /completed/i)
    t.eq('SIM-O-0138 is Completed', await d.status(), 'COMPLETED')
    t.eq('the Order now has its pickup and final Handoffs', await handoffCount(), 2)
    t.ck('the lines are marked received and the timeline ends FINAL_DELIVERY_VERIFIED, COMPLETED', (await page.locator('[data-order-detail] [data-event]').evaluateAll(l => l.slice(-2).map(x => x.getAttribute('data-event')).join())) === 'FINAL_DELIVERY_VERIFIED,COMPLETED')
    await refuse('repeated scan of the used code', { stage: 'DELIVERY', token: f2 }, /already used/i)
    await d.courier('CR-01', 'Account')
    t.ck('the Courier is free again after the final handoff (simulation availability AVAILABLE)', /Simulation availability:\s*AVAILABLE/.test(await d.main()))

    // ---- 3. Buyer Collection end to end, the Seller presenting from the Companion ----
    const bc = await create('DS-04', 'BY-02', 'BUYER_COLLECTION')
    await ready()
    t.eq('Buyer Collection: ready for collection', await d.status(), 'READY_FOR_COLLECTION')
    await d.companion('Orders', 'DS-04'); await d.openOrder(bc)
    await page.getByRole('button', { name: 'Display collection code' }).click(); await d.settle(300)
    const c1 = await d.token()
    t.ck('the Seller presents the collection code from the Companion', /^ADU-SIM-/.test(c1) && /Only this final handoff completes the Order/.test(await d.detailText()))
    await asBuyer('BY-02', bc)
    await success('the Buyer scans the pasted collection code', { stage: 'DELIVERY', token: c1 }, /completed/i)
    t.eq('Buyer Collection is Completed after the Buyer\'s scan', await d.status(), 'COMPLETED')
    t.ck('its one Handoff is Seller to Buyer', await handoffCount() === 1 && /Presenter\s+Stride Avenue \(Seller\)/.test(await d.detailText()) && /Scanner\s+Hana \(Buyer\)/.test(await d.detailText()))

    // ---- 4. Seller Delivery end to end, and a failed attempt ----
    const sd = await create('DS-04', 'BY-02', 'SELLER_DELIVERY')
    await ready()
    t.eq('Seller Delivery: ready for delivery', await d.status(), 'READY_FOR_DELIVERY')
    await d.act('Start Seller Delivery'); t.eq('the Seller starts delivery: Out for delivery', await d.status(), 'OUT_FOR_DELIVERY')
    await page.getByRole('button', { name: 'Display final delivery code' }).click(); await d.settle(300)
    const s1 = await d.token()
    await asBuyer('BY-02', sd)
    await success('the Buyer scans the Seller\'s final code', { stage: 'DELIVERY', token: s1 }, /completed/i)
    t.eq('Seller Delivery is Completed', await d.status(), 'COMPLETED')
    const sf = await create('DS-04', 'BY-02', 'SELLER_DELIVERY')
    await ready(); await d.act('Start Seller Delivery')
    await page.getByRole('button', { name: 'Record failed attempt' }).click(); await d.settle(300)
    t.ck('a failed attempt records the reason and the Order reads Delivery failed', (await d.status()) === 'DELIVERY_FAILED' && /BUYER_UNAVAILABLE/.test(await d.detailText()))

    // ---- 5. Courier Delivery end to end: offer, acceptance, pickup custody, transport, final QR ----
    const cd = await create('DS-04', 'BY-02', 'COURIER_DELIVERY')
    const other = await (async () => { await d.consoleOrders('DS-04'); const r = await d.newOrder({ buyer: 'BY-02', mode: 'BUYER_COLLECTION' }); return r.id })()
    await d.consoleOrders('DS-04'); await d.openOrder(cd)
    await ready()
    t.eq('Courier Delivery: ready for delivery, no Courier yet', await d.status(), 'READY_FOR_DELIVERY')
    t.eq('after CR-01 finished, both CR-01 and CR-02 are eligible for DS-04', await page.locator('[data-courier-offer][data-eligible="true"]').evaluateAll(l => l.map(x => x.getAttribute('data-courier-offer')).join()), 'CR-01,CR-02')
    await page.locator('[data-courier-offer="CR-01"]').getByRole('button').click(); await d.settle(250)
    await page.locator('[data-courier-offer="CR-02"]').getByRole('button').click(); await d.settle(250)
    t.eq('offers went to both Couriers: two PENDING', await page.locator('[data-offer-status="PENDING"]').count(), 2)
    await d.courier('CR-01', 'Offers')
    await page.locator(`[data-offer="${cd}-OFF1"]`).getByRole('button', { name: 'Accept offer' }).click(); await d.settle(300)
    await d.courier('CR-02', 'Offers')
    t.ck('first acceptance wins: the other Courier\'s offer for this Order is gone', (await page.locator(`[data-offer="${cd}-OFF2"]`).count()) === 0)
    await inConsole('DS-04', cd)
    t.ck('the Console shows Courier assigned and CR-01 (Daniel) as the assigned Courier; the other offer is EXPIRED', (await d.status()) === 'COURIER_ASSIGNED' && /Daniel\s+CR-01/.test(await d.detailText()) && (await page.locator('[data-offer-status="EXPIRED"]').count()) === 1)
    await page.getByRole('button', { name: 'Display pickup code' }).click(); await d.settle(300)
    const p1 = await d.token()
    t.ck('the Seller presents the pickup code; it says pickup passes custody only', /passes custody to the Courier/.test(await d.detailText()))
    // Wrong Order token: another Order's code
    await inConsole('DS-04', other); await ready()
    await page.getByRole('button', { name: 'Display collection code' }).click(); await d.settle(300)
    const wrongOrderToken = await d.token()
    await asBuyer('BY-02', cd)
    await refuse('Buyer scanning the Courier pickup', { stage: 'PICKUP', token: p1 }, /buyer cannot scan the pickup/i)
    await asCourier('CR-01', cd)
    await refuse('another Order\'s code (wrong Order)', { stage: 'PICKUP', token: wrongOrderToken }, new RegExp(`wrong order.*${other}`, 'i'))
    await refuse('the Courier scanning the final stage', { stage: 'DELIVERY', token: p1 }, /courier cannot scan the final/i)
    await refuse('incorrect pickup token', { stage: 'PICKUP', token: 'ADU-SIM-ZZZZ-ZZZZ' }, /incorrect code/i)
    // An unauthorised Courier (CR-02 lost the offer) scans CR-01's Order
    await d.courier('CR-02', 'Active')
    t.ck('CR-02 does not see CR-01\'s Order among its active deliveries', (await d.row(cd).count()) === 0)
    const un = await d.scan({ order: cd, stage: 'PICKUP', token: p1 })
    t.ck('an unauthorised Courier (CR-02) scanning another Courier\'s pickup is refused', un.kind === 'refused' && /not the Courier assigned/i.test(un.text), un)
    await d.advance(15)
    await asCourier('CR-01', cd)
    await refuse('expired pickup token', { stage: 'PICKUP', token: p1 }, /expired/i)
    await inConsole('DS-04', cd)
    await page.getByRole('button', { name: 'Display a new code' }).click(); await d.settle(300)
    const p2 = await d.token()
    await asCourier('CR-01', cd)
    await success('CR-01 scans the new pickup code', { stage: 'PICKUP', token: p2 }, /custody passed to the courier/i)
    t.eq('pickup verified: custody only, the Order is Pickup verified and NOT completed', await d.status(), 'PICKUP_VERIFIED')
    t.ck('only the pickup Handoff exists and there is no final Handoff', (await handoffCount()) === 1 && (await page.locator('[data-handoff="DELIVERY"]').count()) === 0 && !/Completed/.test(await page.locator('[data-order-detail] [data-status]').first().innerText()))
    await refuse('repeated pickup scan', { stage: 'PICKUP', token: p2 }, /already used/i)
    await d.act('Start transport'); t.eq('the Courier starts transport: Out for delivery', await d.status(), 'OUT_FOR_DELIVERY')
    await page.getByRole('button', { name: 'Display final delivery code' }).click(); await d.settle(300)
    const f3 = await d.token()
    await asBuyer('BY-02', cd)
    await refuse('pickup code used on the final stage', { stage: 'DELIVERY', token: p2 }, /already used|pickup code, not the final/i)
    await success('the Buyer scans the Courier\'s final QR', { stage: 'DELIVERY', token: f3 }, /completed/i)
    t.eq('Courier Delivery is Completed by the final handoff only', await d.status(), 'COMPLETED')
    t.ck('both Handoffs are listed: pickup (Seller to Courier) then final (Courier to Buyer)', (await handoffCount()) === 2 && /Scanner\s+Hana \(Buyer\)/.test(await d.detailText()))

    // ---- 6. Failed attempt then return handoff (Courier presents, Seller scans) ----
    const fr = await create('DS-04', 'BY-02', 'COURIER_DELIVERY'); await ready()
    await page.locator('[data-courier-offer="CR-02"]').getByRole('button').click(); await d.settle(250)
    await d.courier('CR-02', 'Offers'); await page.locator(`[data-offer="${fr}-OFF1"]`).getByRole('button', { name: 'Accept offer' }).click(); await d.settle(300)
    await inConsole('DS-04', fr); await page.getByRole('button', { name: 'Display pickup code' }).click(); await d.settle(250)
    await asCourier('CR-02', fr); await success('CR-02 scans the pickup', { stage: 'PICKUP' }, /custody/i)
    await d.act('Start transport')
    await page.getByRole('button', { name: 'Record failed attempt' }).click(); await d.settle(300)
    t.eq('the Courier records a failed attempt: Delivery failed', await d.status(), 'DELIVERY_FAILED')
    await page.getByRole('button', { name: 'Display return code' }).click(); await d.settle(300)
    await inConsole('DS-04', fr)
    await success('the Seller scans the return code (Courier presents, Seller scans)', { stage: 'RETURN' }, /goods are back/i)
    t.eq('the Order is Returned to Seller', await d.status(), 'RETURNED_TO_SELLER')
    t.ck('a Return Handoff is recorded with the simulated-return-evidence method', (await page.locator('[data-handoff="RETURN"]').innerText()).includes('SIMULATED_RETURN_EVIDENCE'))

    // ---- 7. Layout and the MVP ----
    t.ck(`no horizontal page overflow at ${viewport.width}px`, await page.evaluate(() => { const m = document.querySelector('main.app-main'); return m.scrollWidth <= m.clientWidth + 1 }))
    await d.setMode(false)
    await d.courier('CR-01', 'Active')
    t.ck('back in the Current MVP the Courier app shows no Orders, codes or compensation', !/SIM-O-|ADU-SIM|compensation/i.test(await d.main()) && /Live Courier work is disabled/.test(await d.main()))
    await d.consoleOrders('DS-04')
    t.ck('and the Seller Console shows no Orders or codes', !/SIM-O-|ADU-SIM/.test(await d.main()))
  })
}
