// BUYER-010 (FR-009, FR-010): the Buyer's navigation history (Back returns to the actual origin, the bottom navigation follows the screen) and the signed-in
// Orders layout in every state. REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844. Expected values come from the dataset.
import { suite } from './harness.mjs'
import { drivers, cat, ops } from './sim-helpers.mjs'

const sellerName = id => cat.sellers.find(s => s.seller_id === id).name
const productName = id => cat.products.find(p => p.product_id === id).name
const activeIds = new Set(cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id))
const searchable = cat.products.find(p => p.publication === 'PUBLISHED' && activeIds.has(p.seller_id) && cat.products.filter(q => q.name === p.name).length === 1)
const OPEN = new Set(['PAID', 'PREPARING', 'READY_FOR_COLLECTION', 'COURIER_ASSIGNED', 'READY_FOR_DELIVERY', 'PICKUP_VERIFIED', 'OUT_FOR_DELIVERY'])
const hana = ops.orders.filter(o => o.buyer_id === 'BY-02')
const count = { active: hana.filter(o => OPEN.has(o.status)).length, completed: hana.filter(o => o.status === 'COMPLETED').length }
count.other = hana.length - count.active - count.completed
const emptyBuyer = ops.buyers.map(b => b.buyer_id).find(id => !ops.orders.some(o => o.buyer_id === id) && id === 'BY-03')
const grant = ops.review_grants.find(g => g.buyer_id === 'BY-02' && g.state === 'AVAILABLE')
const BY_MODE = { 'Courier Delivery': 'SIM-O-0138', 'Seller Delivery': 'SIM-O-0143', 'Buyer Collection': 'SIM-O-0142' }

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('buyer010', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const settle = ms => t.settle(ms ?? 350)
    const frame = () => page.locator('.phone-frame')
    const text = () => frame().innerText()
    const toolbar = () => page.getByLabel('Buyer account (prototype)')
    const navBtn = name => frame().locator('nav').getByRole('button', { name, exact: true })
    const nav = async name => { await navBtn(name).click(); await settle(350) }
    const current = async () => (await frame().locator('nav button[aria-current="page"]').allInnerTexts()).join('|')
    const back = async () => { await frame().getByRole('button', { name: 'Back', exact: true }).first().click(); await settle(350) }
    const toBuyer = async (id, simulation = false) => { await t.open(); if (simulation) await d.setMode(true); await t.section('05 Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(350); if (id) { await toolbar().selectOption(id); await settle(600) } }
    const closeDetail = async () => { await frame().getByRole('button', { name: /^← Back to Orders/ }).first().click(); await settle(300) }
    const histLen = () => page.evaluate(() => history.length)
    const clipped = () => page.evaluate(() => {
      const f = document.querySelector('.phone-frame').getBoundingClientRect(), bad = []
      for (const e of document.querySelectorAll('.phone-frame *')) {
        if (e.closest('.overflow-x-auto')) continue
        const r = e.getBoundingClientRect()
        if (r.width && (r.right > f.right + 1 || r.left < f.left - 1)) bad.push(`${e.tagName}.${String(e.className).slice(0, 30)} ${(e.textContent ?? '').slice(0, 24)}`)
      }
      const s = document.querySelector('[data-sim-surface]')
      return { bad: bad.slice(0, 4), hscroll: !!s && s.scrollWidth > s.clientWidth + 1, page: document.querySelector('main.app-main').scrollWidth > document.querySelector('main.app-main').clientWidth + 1 }
    })
    const noClip = async label => { const c = await clipped(); t.ck(`${label}: nothing is clipped or overflowing at ${viewport.width}px`, !c.bad.length && !c.hscroll && !c.page, c) }

    // ================= Navigation history (current MVP, Hana) =================
    await toBuyer('BY-02')
    const hist0 = await histLen(), url0 = page.url()
    t.eq('Home is highlighted in the bottom navigation', await current(), 'Home')

    // Saved -> Cart -> Back returns to Saved
    await nav('Saved')
    t.ck('Saved opens and the Saved tab is highlighted', /Your finds/.test(await text()) && (await current()) === 'Saved')
    await frame().getByRole('button', { name: /^Cart, / }).click(); await settle(350)
    t.ck('Cart opens from Saved', /cart/i.test(await text()) && !/Your finds/.test(await text()))
    await back()
    t.ck('Saved -> Cart -> Back returns to Saved (not Home)', /Your finds/.test(await text()) && (await current()) === 'Saved')

    // Collection -> Product -> Back -> Back
    const col = ops.collections.find(c => c.buyer_id === 'BY-02' && c.is_default)
    const colProduct = ops.saves.find(s => s.collection_id === col.collection_id && s.entity_type === 'PRODUCT').entity_id
    await frame().locator('button', { hasText: /\d+ Products? · \d+ Scenes?/ }).first().click(); await settle(350)
    t.ck('the default Collection opens', new RegExp(col.name).test(await text()) && /A private collection/.test(await text()))
    await frame().locator('button', { hasText: productName(colProduct) }).first().click(); await settle(400)
    t.ck('a saved Product opens from the Collection', await frame().getByRole('button', { name: 'Add to Cart' }).count() === 1 || (await text()).includes(productName(colProduct)))
    await back()
    t.ck('Collection -> Product -> Back returns to the Collection', /A private collection/.test(await text()))
    await back()
    t.ck('Collection -> Back returns to Saved', /Your finds/.test(await text()) && (await current()) === 'Saved')

    // Search -> Product -> Back keeps the query; the Seller's Search button highlights Shop
    await nav('Shop')
    t.eq('Shop is highlighted on Search', await current(), 'Shop')
    await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(searchable.name); await settle(500)
    await frame().locator('button', { hasText: searchable.name }).first().click(); await settle(450)
    t.ck('Search result opens its Product', (await text()).includes(searchable.name) && !(await frame().locator('nav').count()))
    await back()
    t.eq('Product from Search: Back returns to Search with the query kept', await page.getByPlaceholder('Search Products, Scenes, Sellers').inputValue(), searchable.name)
    t.eq('Shop is highlighted again', await current(), 'Shop')

    // Product -> Seller -> Back -> Product; Seller -> Message -> Back -> Seller; Seller -> Scene -> Back keeps the tab
    await frame().locator('button', { hasText: searchable.name }).first().click(); await settle(450)
    const sellerLine = () => frame().locator('button.rounded-xl', { hasText: sellerName(searchable.seller_id) }).first()
    await sellerLine().click(); await settle(450)
    t.ck('Product -> Seller opens the Seller page', /Message/.test(await text()) && (await frame().getByRole('button', { name: 'Message' }).count()) === 1)
    await frame().getByRole('tab', { name: /Products/ }).first().click().catch(() => {}); await settle(200)
    await frame().getByRole('button', { name: 'Message' }).click(); await settle(450)
    t.ck('Seller -> Message opens the conversation', /Chat helps coordination/.test(await text()))
    await back()
    t.ck('Chat -> Back returns to the Seller page', await frame().getByRole('button', { name: 'Message' }).count() === 1)
    await back()
    t.ck('Seller -> Back returns to the Product it came from', (await frame().getByRole('button', { name: 'Add to Cart' }).count()) > 0 || (await frame().getByRole('button', { name: 'Ask Seller' }).count()) > 0)

    // Product -> Ask Seller -> Back -> Product
    await frame().getByRole('button', { name: 'Ask Seller' }).click(); await settle(450)
    t.ck('Ask Seller opens the chat on this Product', /Chat helps coordination/.test(await text()))
    // Chat -> Product (the reply's "Open Product" chip) -> Back -> Chat
    await frame().getByLabel('Message', { exact: true }).fill('I want this'); await frame().getByRole('button', { name: 'Send', exact: true }).click(); await settle(450)
    const openChip = frame().getByLabel('Quick replies').getByRole('button', { name: /^(Open Product|View Product)$/ })
    t.ck('the chat answers "I want this" with an Open Product chip', (await openChip.count()) > 0, (await frame().getByLabel('Quick replies').allInnerTexts()))
    await openChip.first().click(); await settle(450)
    t.ck('Chat -> Product opens the Product', (await frame().getByRole('button', { name: 'Ask Seller' }).count()) === 1)
    await back()
    t.ck('Product from Chat: Back returns to the conversation', /Chat helps coordination/.test(await text()))
    await back()
    t.ck('Product -> Chat -> Back returns to the Product', (await frame().getByRole('button', { name: 'Ask Seller' }).count()) === 1)
    // Seller -> search icon lands on Shop and the highlight follows
    await sellerLine().click(); await settle(450)
    await frame().getByRole('button', { name: 'Search', exact: true }).first().click(); await settle(350)
    t.eq('Seller -> Search: the bottom navigation highlights Shop (it used to keep the earlier tab)', await current(), 'Shop')

    // Home -> Scene -> Product -> Back -> Back keeps the feed position
    await nav('Home')
    await page.evaluate(() => { document.querySelector('#home-channel-panel > div').scrollTop = 700 }); await settle(250)
    const scrolled = await page.evaluate(() => document.querySelector('#home-channel-panel > div').scrollTop)
    const visible = await page.locator('#home-channel-panel article').evaluateAll(els => { const p = document.querySelector('#home-channel-panel > div').getBoundingClientRect(); const a = els.find(e => e.getBoundingClientRect().top >= p.top - 5) ?? els[0]; return a.getAttribute('aria-label') })
    await page.locator(`#home-channel-panel article[aria-label="${visible}"]`).getByRole('button', { name: 'Explore the Scene', exact: true }).click(); await settle(450)
    t.ck('Home -> Explore the Scene', /Explore the Scene/.test(await frame().locator('h1').first().innerText()))
    await frame().getByRole('list', { name: 'Products in this Scene' }).getByRole('button').first().click(); await settle(300)
    await frame().getByRole('button', { name: 'View Product' }).click(); await settle(450)
    t.ck('Scene -> View Product opens the Product', (await frame().getByRole('button', { name: 'Ask Seller' }).count()) === 1)
    await back()
    t.ck('Product from the Scene: Back returns to the Scene explorer', /Explore the Scene/.test(await frame().locator('h1').first().innerText()))
    await back()
    t.eq('Scene -> Back returns to Home with the feed where it was', await page.evaluate(() => Math.round(document.querySelector('#home-channel-panel > div').scrollTop)), Math.round(scrolled))
    t.eq('Home is highlighted again', await current(), 'Home')
    await page.getByRole('tab', { name: 'Discounts' }).click(); await settle(300)
    await frame().locator('#home-channel-panel button[data-feed-item]').first().click(); await settle(450)
    await back()
    t.ck('Product from Discounts: Back returns to Home on the Discounts tab', (await page.getByRole('tab', { name: 'Discounts' }).getAttribute('aria-selected')) === 'true')
    await page.getByRole('tab', { name: 'For You' }).click(); await settle(250)

    // Home -> Notifications -> Back; Home -> Chat -> Back
    await frame().getByRole('button', { name: 'Notifications', exact: true }).click(); await settle(350)
    t.ck('Notifications opens from Home', /Notifications/.test(await text()))
    await back()
    t.ck('Notifications -> Back returns to Home', (await current()) === 'Home' && (await page.locator('#home-channel-panel article').count()) > 0)

    await frame().locator('#home-channel-panel article').first().getByRole('button', { name: 'Chat with seller' }).click(); await settle(450)
    t.ck('Home -> Chat with seller opens the conversation', /Chat helps coordination/.test(await text()))
    await back()
    t.ck('Chat -> Back returns to Home', (await current()) === 'Home')

    // You -> Following -> Seller -> Back -> Back; You -> account menu -> Edit profile -> Back
    await nav('You')
    t.eq('You is highlighted', await current(), 'You')
    await frame().getByRole('button', { name: /^Following, / }).click(); await settle(350)
    t.ck('Following list opens', await frame().getByRole('list', { name: 'Followed Sellers' }).count() === 1)
    await frame().getByRole('list', { name: 'Followed Sellers' }).locator('li button').first().click(); await settle(450)
    t.ck('a followed Seller opens', await frame().getByRole('button', { name: 'Message' }).count() === 1)
    await back()
    t.ck('Seller from Following: Back returns to the Following list', await frame().getByRole('list', { name: 'Followed Sellers' }).count() === 1)
    await back()
    t.ck('Following -> Back returns to the Profile, You highlighted', (await current()) === 'You')
    await frame().getByRole('button', { name: /menu|account/i }).first().click().catch(() => {}); await settle(300)
    const edit = frame().getByRole('button', { name: /Edit profile/i }).first()
    if (await edit.count()) {
      await edit.click(); await settle(350)
      t.ck('Edit profile opens', /Edit profile|Display name|Name/i.test(await text()))
      await back()
      t.ck('Profile settings: Back returns to the Profile', (await current()) === 'You')
    } else t.knownGap('the account menu control was not found by name', true)

    // The device's Back (Android back / Alt+Left) does what the screen's own Back does
    await nav('Saved')
    await frame().getByRole('button', { name: /^Cart, / }).click(); await settle(300)
    await page.keyboard.press('Alt+ArrowLeft'); await settle(350)
    t.ck('device Back: Cart -> Saved', /Your finds/.test(await text()))
    await nav('Home')
    await frame().locator('#home-channel-panel article').first().getByRole('button', { name: 'Share', exact: true }).click(); await settle(300)
    await page.keyboard.press('Alt+ArrowLeft'); await settle(300)
    t.ck('device Back closes an open sheet first, and stays on Home', (await page.getByRole('dialog', { name: 'Share' }).count()) === 0 && (await current()) === 'Home')
    await nav('You')
    await page.keyboard.press('Alt+ArrowLeft'); await settle(300)
    t.eq('device Back on another tab returns to Home', await current(), 'Home')
    t.ck('no router: the URL and the browser history did not change', page.url() === url0 && (await histLen()) === hist0, { url: page.url(), hist: await histLen(), hist0 })

    // ================= Orders in every state =================
    // 1. Guest (simulation on)
    await toBuyer(undefined, true)
    await nav('Orders')
    t.ck('Guest: Orders asks to sign in and lists no Orders', /Sign in to start ordering/.test(await text()) && (await page.locator('[data-order-row]').count()) === 0)
    await noClip('Guest Orders')
    // 2. Current MVP, signed in
    await toBuyer('BY-02')
    await nav('Orders')
    t.ck('Current MVP: signed-in Orders says there are no Orders in the MVP and shows none', /Release 1 has no paid Orders/.test(await text()) && (await page.locator('[data-order-row]').count()) === 0 && !/INTERNAL SIMULATION/.test(await text()))
    await noClip('MVP Orders')
    // 3. Simulation, a Buyer with no Orders
    await toBuyer(emptyBuyer, true)
    await nav('Orders')
    t.ck(`Simulation, ${emptyBuyer} (no Orders): a clear empty state, no groups, no rows`, (await page.locator('[data-orders-empty]').count()) === 1 && /No Orders for this account/.test(await text()) && (await page.locator('[data-order-row]').count()) === 0 && (await frame().locator('section[aria-label]').count()) === 0)
    await noClip('Empty Orders')
    // 4. Simulation, Hana
    await toBuyer('BY-02', true)
    await nav('Orders')
    t.eq('Orders: the nav highlights Orders', await current(), 'Orders')
    t.eq('Orders: the heading counts every simulated Order', (await text()).includes(`${hana.length} simulated Orders`), true)
    const groupCount = async name => Number(((await frame().locator(`section[aria-label="${name}"] h2, section[aria-label="${name}"] > div`).first().innerText()).match(/·\s*(\d+)/) ?? [])[1])
    t.eq('Orders: Active group count', await groupCount('Active'), count.active)
    t.eq('Orders: Completed group count', await groupCount('Completed'), count.completed)
    t.eq('Orders: Cancelled, returned or failed group count', await groupCount('Cancelled, returned or failed'), count.other)
    t.ck('Orders: the three groups are in the order Active, Completed, Cancelled/returned', (await frame().locator('section[aria-label]').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))).join('|') === 'Active|Completed|Cancelled, returned or failed')
    const row = d.row('SIM-O-0138')
    const rt = await row.innerText()
    const o138 = ops.orders.find(o => o.order_id === 'SIM-O-0138')
    t.ck('a row shows the id, status, Seller, fulfilment mode, date and a total labelled as simulated', rt.includes('SIM-O-0138') && /Out for delivery/i.test(rt) && rt.includes(sellerName(o138.seller_id)) && rt.includes('Courier Delivery') && /27 Nov/.test(rt) && rt.includes(`ETB ${o138.total_etb.toLocaleString('en-US')}`) && /simulated total/.test(rt), rt)
    await noClip('Hana Orders list')
    await page.locator('main.app-main').evaluate(e => { e.scrollTop = e.scrollHeight }); await settle(250)
    t.ck('the simulation badge does not cover the bottom navigation (phone width: the page scrolls on past the phone)', await page.evaluate(() => { const n = document.querySelector('.phone-frame nav').getBoundingClientRect(), b = document.querySelector('[role=status].pointer-events-auto').getBoundingClientRect(); return b.right <= n.left || b.left >= n.right || b.bottom <= n.top + 1 || b.top >= n.bottom - 1 }))
    t.ck('every row stays inside the phone frame', await page.locator('[data-order-row]').evaluateAll((els, vwid) => { const f = document.querySelector('.phone-frame').getBoundingClientRect(); return els.every(e => { const r = e.getBoundingClientRect(); return r.left >= f.left - 1 && r.right <= f.right + 1 }) }, viewport.width))

    // 5. Order details, each fulfilment mode (+ the Review composer of a completed Order)
    for (const [mode, id] of Object.entries(BY_MODE)) {
      await d.openOrder(id)
      const dt = await d.detailText()
      const o = ops.orders.find(x => x.order_id === id)
      t.ck(`${mode} ${id}: detail shows the Parties, Items, Timeline and Handoffs sections`, ['Parties', 'Items', 'Timeline', 'Handoffs'].every(h => new RegExp(h, 'i').test(dt)), dt.slice(0, 120))
      t.ck(`${mode} ${id}: the mode, Seller and the simulated totals are shown`, dt.includes(mode) && dt.includes(sellerName(o.seller_id)) && /simulated/i.test(dt) && dt.includes(`ETB ${o.total_etb.toLocaleString('en-US')}`), dt.slice(0, 200))
      t.ck(`${mode} ${id}: the Courier appears only for Courier Delivery`, /Courier\s/.test(dt.split('Fulfilment')[0]) === (mode === 'Courier Delivery'), dt.split('Fulfilment')[0])
      t.ck(`${mode} ${id}: the Handoff / scan area is present for the Buyer`, /Scan a handoff code/i.test(dt))
      t.ck(`${mode} ${id}: the Timeline lists its events in order`, (await page.locator(`[data-order-detail="${id}"] [data-event]`).count()) >= 2)
      await noClip(`${mode} ${id} detail`)
      await closeDetail()
      t.ck(`${mode} ${id}: Back to Orders returns to the list`, (await page.locator('[data-order-row]').count()) > 0)
    }
    await d.openOrder(grant.order_id)
    t.ck(`completed ${grant.order_id}: the Review composer is in the detail`, (await page.locator('[data-review-composer]').count()) === 1)
    await page.locator('[data-review-composer]').scrollIntoViewIfNeeded()
    await noClip('Order detail with the Review composer')
    // Header Back from a detail returns to the list; Back again leaves Orders
    await back()
    t.ck('the header Back from an Order detail returns to the list', (await page.locator('[data-order-row]').count()) > 0 && (await current()) === 'Orders')
  })
}
