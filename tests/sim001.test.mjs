// SIM-001 (FR-015): shared internal-simulation Orders across Seller Console, Seller Companion, Buyer and Courier on the marketplace dataset.
// REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844. Expected values come from the generated dataset.
// The MVP mode shows none of it, and the simulation never touches the MVP workspace (stock, Cart, Trust), proven by comparing its stored state.
import { suite } from './harness.mjs'
import { drivers, ops, sellerName, SIM_KEY } from './sim-helpers.mjs'

const mine = id => ops.orders.filter(o => o.seller_id === id)
const byStatus = (rows, s) => rows.filter(o => o.status === s).length

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('sim001', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const noOverflow = async label => t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, await page.evaluate(() => { const m = document.querySelector('main.app-main'); return m.scrollWidth <= m.clientWidth + 1 }))
    await t.open()

    // ---- 1. Current MVP shows none of it ----
    await d.consoleOrders()
    let text = await d.main()
    t.ck('MVP: Seller Console Orders is the "Not in the current MVP" gate, no Orders, no simulation bar', /not in the current mvp/i.test(text) && !/SIM-O-/.test(text) && !/INTERNAL SIMULATION/.test(text), text.slice(0, 200))
    await d.companion()
    t.ck('MVP: the Companion has a Catalogue tab, no Orders tab and no order alerts', (await page.getByRole('button', { name: /^Catalogue/ }).count()) > 0 && !/SIM-O-/.test(await d.main()))
    await d.courier('CR-02', 'Offers')
    text = await d.main()
    t.ck('MVP: Courier offers are disabled ("Live Courier work is disabled"), no compensation, no Orders', /Live Courier work is disabled/.test(text) && !/SIM-O-|compensation/i.test(text), text.slice(0, 200))
    await d.courier('CR-02', 'Active'); t.ck('MVP: Courier Active delivery is disabled too', /Live Courier work is disabled/.test(await d.main()))
    await d.courier('CR-02', 'Account'); text = await d.main()
    t.ck('MVP: the Courier Account shows the profile and MVP availability only', /Samuel/.test(text) && /Availability \(MVP\)/.test(text) && !/Simulation availability/.test(text) && !/SIM-O-/.test(text))
    await d.buyerOrders('BY-02'); text = await d.main()
    t.ck('MVP: Buyer Orders is the gate, none of Hana\'s Orders appear', /not in the current mvp/i.test(text) && !/SIM-O-/.test(text), text.slice(0, 200))
    t.ck('MVP: no simulation store is written', (await d.simState()) === null)

    // ---- 2. The simulation: counts load from the dataset ----
    await d.setMode(true)
    const counts = await page.evaluate(async () => {
      const o = await import('/src/simulation/orders.ts'), m = await import('/src/marketplace/import.ts')
      const s = o.seedState(m.OPERATIONS)
      return { orders: Object.keys(s.orders).length, lines: Object.values(s.lines).flat().length, events: Object.values(s.events).flat().length, handoffs: Object.values(s.handoffs).flat().length, offers: Object.keys(s.offers).length, couriers: Object.keys((await import('/src/simulation/store.tsx')).WORLD.couriers).length }
    })
    t.ck('the app loads 146 Orders, 192 lines, 848 timeline events, 164 Handoffs, 33 offers and 5 Couriers', JSON.stringify(counts) === JSON.stringify({ orders: 146, lines: 192, events: 848, handoffs: 164, offers: 33, couriers: 5 }), counts)
    const stockBefore = await page.evaluate(async () => { const b = await import('/src/demo-data/base.ts'); const l = await import('/src/demo-data/live.ts'); return JSON.stringify(b.PRODUCT_IDS.filter(i => /^DS-0[14]-/.test(i)).map(i => [i, l.LIVE_PRODUCTS[i].stock])) })

    // ---- 3. Seller Console: list, filter, detail ----
    await d.consoleOrders('DS-01')
    t.ck('the simulation label is persistent on the Orders screen', /INTERNAL SIMULATION/.test(await d.main()) && await page.getByRole('region', { name: 'Internal simulation' }).isVisible())
    const ds01 = mine('DS-01')
    t.ck(`DS-01 lists its ${ds01.length} dataset Orders`, new RegExp(`${ds01.length} simulated Orders`).test(await d.main()))
    await page.locator('#orders-filter').selectOption('ALL'); await d.settle(300)
    t.eq('status filter All: every DS-01 Order is a row', await page.locator('[data-order-row]').count(), ds01.length)
    for (const s of ['COMPLETED', 'OUT_FOR_DELIVERY', 'READY_FOR_DELIVERY']) {
      await page.locator('#orders-filter').selectOption(s); await d.settle(200)
      t.eq(`status filter ${s}: ${byStatus(ds01, s)} row(s)`, await page.locator('[data-order-row]').count(), byStatus(ds01, s))
    }
    await page.locator('#orders-filter').selectOption('ACTIVE'); await d.settle(200)
    t.ck('the default filter is the open Orders (SIM-O-0138 is open, completed ones are not)', (await d.row('SIM-O-0138').count()) === 1 && (await page.locator('[data-order-row]').count()) === ds01.filter(o => !['COMPLETED', 'CANCELLED', 'RETURNED_TO_SELLER'].includes(o.status)).length)
    await d.openOrder('SIM-O-0138')
    text = await d.detailText()
    t.ck('SIM-O-0138 detail: Courier Delivery, Courier Daniel (CR-01) assigned, Hana, one line, total ETB 2,070 simulated paid', /Courier Delivery/.test(text) && /Daniel\s+CR-01/.test(text) && /Hana/.test(text) && /Olive linen midi dress/.test(text) && /ETB 2,070/.test(text) && /simulated paid/i.test(text), text.slice(0, 300))
    t.eq('SIM-O-0138 timeline shows its 6 supplied events', await page.locator('[data-order-detail] [data-event]').count(), 6)
    t.ck('SIM-O-0138 shows its supplied PICKUP Handoff (Seller presenter, Courier scanner)', (await page.locator('[data-handoff="PICKUP"]').count()) === 1 && /Aster & Thread \(Seller\)/.test(text) && /Daniel \(Courier\)/.test(text))
    await noOverflow('Order detail')
    await d.click(/Back to Orders/)

    // ---- 4. A demonstration Order, shared across all four surfaces ----
    const cr = await d.newOrder({ buyer: 'BY-02', mode: 'COURIER_DELIVERY' })
    t.ck('a demonstration Order is recorded as SIM-O-D001, PAID, with a plain confirmation', cr.kind === 'ok' && cr.id === 'SIM-O-D001', cr)
    await d.openOrder('SIM-O-D001')
    t.eq('the new Order is Paid (simulated)', await d.status(), 'PAID')
    await d.act('Start preparing'); t.eq('Seller starts preparing: Preparing', await d.status(), 'PREPARING')
    await d.companion('Alerts')
    t.ck('Companion Alerts show the Order that needs the Seller (read from the same store)', (await page.locator('[data-order-alert="SIM-O-D001"]').count()) === 1 && /Being prepared/.test(await d.main()))
    await page.locator('[data-order-alert="SIM-O-D001"]').click(); await d.settle(400)
    t.ck('the alert opens the Order in the Companion Orders tab', (await page.locator('[data-order-detail="SIM-O-D001"]').count()) === 1)
    await d.act('Mark ready for delivery'); t.eq('Companion marks it ready: Ready for delivery', await d.status(), 'READY_FOR_DELIVERY')
    await noOverflow('Companion Order detail')
    await d.buyerOrders('BY-02')
    t.ck('Buyer Hana sees the Order as Active, Ready for delivery', /active/i.test(await d.main()) && (await d.row('SIM-O-D001').innerText()).includes('Ready for delivery'))
    await d.openOrder('SIM-O-D001')
    t.ck('Buyer detail: Courier not assigned yet, timeline has 3 events', /Not assigned yet/.test(await d.detailText()) && (await page.locator('[data-order-detail] [data-event]').count()) === 3)
    await noOverflow('Buyer Order detail')

    // ---- 5. Offers: eligibility and refusals ----
    await d.consoleOrders('DS-01'); await d.openOrder('SIM-O-D001')
    t.eq('the Console sees Ready for delivery too (shared state)', await d.status(), 'READY_FOR_DELIVERY')
    const offerBtn = c => page.locator(`[data-courier-offer="${c}"]`).getByRole('button')
    const before = await d.simState()
    for (const [c, re, label] of [['CR-01', /busy/i, 'a busy Courier'], ['CR-03', /not an approved member/i, 'a Courier outside the pool'], ['CR-04', /not an approved member/i, 'a Courier outside the pool (unavailable)'], ['CR-05', /not an approved member/i, 'the unverified Courier (Bethel, PENDING)']]) {
      await offerBtn(c).click(); await d.settle(250)
      const r = await d.lastResult()
      t.ck(`offer to ${c}: ${label} is refused with a reason`, r.kind === 'refused' && re.test(r.text), r)
    }
    t.ck('refused offers changed nothing (the stored log is identical)', (await d.simState()) === before)
    t.eq('only the eligible Courier is marked eligible (CR-02)', await page.locator('[data-courier-offer][data-eligible="true"]').evaluateAll(l => l.map(x => x.getAttribute('data-courier-offer')).join()), 'CR-02')
    t.ck('the offer panel states the compensation is simulated and not a delivery charge', /simulated, simulation only/.test(await d.detailText()) && /never a delivery charge/.test(await d.detailText()))
    await offerBtn('CR-02').click(); await d.settle(300)
    t.ck('offer sent to CR-02: the Order lists a PENDING offer and reads OFFER_PENDING', (await page.locator('[data-offer-status="PENDING"]').count()) === 1 && /OFFER_PENDING/.test(await d.detailText()))
    // Courier switching
    await d.courier('CR-01', 'Offers')
    t.ck('CR-01 (Daniel) does NOT see the offer made to CR-02 (pending offer recipients are not assigned Couriers)', (await page.locator('[data-offer="SIM-O-D001-OFF1"]').count()) === 0 && (await page.locator('[data-offer="SIM-O-0141-OFF1"]').count()) === 1)
    await d.courier('CR-02', 'Offers')
    t.ck('CR-02 (Samuel) sees it, with simulated compensation, plus the two supplied pending offers', (await page.locator('[data-offer]').count()) === 3 && /Simulated compensation ETB 110/.test(await d.main()) && /simulation only, not a delivery charge/.test(await d.main()))
    await noOverflow('Courier offers')
    await page.locator('[data-offer="SIM-O-D001-OFF1"]').getByRole('button', { name: 'Reject offer' }).click(); await d.settle(300)
    t.ck('CR-02 rejects: the offer leaves the list, the others stay', (await page.locator('[data-offer="SIM-O-D001-OFF1"]').count()) === 0 && (await page.locator('[data-offer]').count()) === 2)
    await d.consoleOrders('DS-01'); await d.openOrder('SIM-O-D001')
    t.ck('the rejection re-opened the Order: REJECTED offer, still Ready for delivery, CR-02 eligible again', (await page.locator('[data-offer-status="REJECTED"]').count()) === 1 && (await d.status()) === 'READY_FOR_DELIVERY' && (await page.locator('[data-courier-offer="CR-02"][data-eligible="true"]').count()) === 1)
    await offerBtn('CR-02').click(); await d.settle(300)
    await d.courier('CR-02', 'Offers')
    await page.locator('[data-offer="SIM-O-D001-OFF2"]').getByRole('button', { name: 'Accept offer' }).click(); await d.settle(300)
    await d.courier('CR-02', 'Active')
    t.ck('CR-02 accepts: SIM-O-D001 is its active delivery, Courier assigned', (await d.row('SIM-O-D001').innerText()).includes('Courier assigned'))
    await d.courier('CR-01', 'Active')
    t.ck('CR-01 has its own, independent active delivery (SIM-O-0138) and not CR-02\'s', (await d.row('SIM-O-0138').count()) === 1 && (await d.row('SIM-O-D001').count()) === 0)
    await d.courier('CR-02', 'Account')
    t.ck('CR-02 is now busy (simulation availability)', /Simulation availability:\s*BUSY/.test(await d.main()))
    await d.courier('CR-01', 'Offers'); await page.locator('[data-offer="SIM-O-0141-OFF1"]').getByRole('button', { name: 'Accept offer' }).click(); await d.settle(300)
    const busy = await d.lastResult()
    t.ck('CR-01 (busy) cannot accept the supplied pending offer for SIM-O-0141: refused with a reason, offer still pending', busy.kind === 'refused' && /busy/i.test(busy.text) && (await page.locator('[data-offer="SIM-O-0141-OFF1"]').count()) === 1, busy)
    await d.courier('CR-03', 'Offers'); t.ck('CR-03 (Mekdes) has no offers', (await page.locator('[data-no-offers]').count()) === 1)
    await d.courier('CR-05', 'Offers'); t.ck('CR-05 (Bethel, unverified) has no offers', (await page.locator('[data-no-offers]').count()) === 1)
    await d.courier('CR-04', 'Active'); t.ck('CR-04 (Yared) has no active delivery', (await page.locator('[data-no-active]').count()) === 1)
    const fiveCouriers = await page.locator('#courier-account option').count()
    t.eq('the Courier switcher offers all five Couriers', fiveCouriers, 5)
    await d.courier('CR-01', 'History'); t.ck('CR-01 history lists finished deliveries with simulated compensation', (await page.locator('[data-courier-history] li').count()) > 0 && /simulated compensation ETB 110/.test(await d.main()))

    // ---- 6. Cancellation and failed attempt through the UI, on other Sellers' supplied Orders ----
    await d.consoleOrders('DS-01')
    await page.locator('#orders-filter').selectOption('ALL'); await d.settle(200)
    t.ck('a Seller sees a completed Order as Completed (no further steps offered)', (await d.row(ds01.find(o => o.status === 'COMPLETED').order_id).innerText()).includes('Completed'))
    const bc = await d.newOrder({ buyer: 'BY-01', mode: 'BUYER_COLLECTION' })
    await page.locator('#orders-filter').selectOption('ACTIVE'); await d.settle(200)
    await d.openOrder(bc.id); await d.act('Start preparing'); await d.act('Cancel Order')
    t.eq('a Buyer Collection Order is cancelled while preparing', await d.status(), 'CANCELLED')
    t.ck('the cancellation reason is shown (SIMULATED_BUYER_REQUEST)', /SIMULATED_BUYER_REQUEST/.test(await d.detailText()))
    await d.click(/Back to Orders/)

    // ---- 7. The MVP workspace, stock, Cart and Trust are untouched; Reset restores the seed ----
    const stockAfter = await page.evaluate(async () => { const b = await import('/src/demo-data/base.ts'); const l = await import('/src/demo-data/live.ts'); return JSON.stringify(b.PRODUCT_IDS.filter(i => /^DS-0[14]-/.test(i)).map(i => [i, l.LIVE_PRODUCTS[i].stock])) })
    t.ck('Product stock is unchanged by every simulation action (DS-01 and DS-04 Products compared)', stockBefore === stockAfter && JSON.parse(stockBefore).length > 10, stockBefore.slice(0, 80))
    t.ck('the simulation store is separate, namespaced by dataset and simulation', JSON.parse((await d.simState()) ?? '[]').length > 5 && (await page.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith('adulis.simulation')))).join() === SIM_KEY)
    const ws = await d.wsState()
    t.ck('the simulation wrote nothing into the MVP workspace (no SIM- ids, no Orders in Cart, Collections or follows)', !/SIM-O-/.test(ws ?? ''))
    await page.reload({ waitUntil: 'networkidle' }); await d.setMode(true); await d.consoleOrders('DS-01')
    t.ck('the simulation survives a reload (sessionStorage), SIM-O-D001 is still there', (await d.row('SIM-O-D001').count()) === 1)
    await page.getByRole('button', { name: 'Reset simulation' }).click(); await d.settle(400)
    t.ck('Reset simulation restores the seed: the demonstration Orders are gone and the dataset count is back', (await d.row('SIM-O-D001').count()) === 0 && new RegExp(`${ds01.length} simulated Orders`).test(await d.main()) && (await d.simState()) === null)
    await d.courier('CR-02', 'Offers'); t.ck('Reset also restores the offers (CR-02 has its two supplied offers again)', (await page.locator('[data-offer]').count()) === 2)
    await d.setMode(false); await d.consoleOrders()
    t.ck('back in the Current MVP the Orders screen is the gate again', /not in the current mvp/i.test(await d.main()))
  })
}
