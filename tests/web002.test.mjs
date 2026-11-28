// WEB-002 (FR-012): public Storefront browsing. The Adulis logo opens Adulis Home; Scenes, Products, Sellers and Search work for any public Seller with public content only;
// Like, Save, Follow, Chat and Cart show the Install prompt and change nothing (browser storage byte-identical); no fake install, no store link; ordinary link sharing that
// reopens the same content; crafted links never reach Draft / Suspended / hidden content; no checkout.
// REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844. Expected values come from the generated dataset.
import { suite } from './harness.mjs'
import { web, cat, P, S, SC, publicSellers, publicScenes, publishedProducts, hiddenScenes, draftProducts, money } from './web-helpers.mjs'

const HOME_TEXT = /Discover products through the way people actually like to see them used/
const FAKE = /app store|google play|play store|apple|download|installing|progress|get adulis|redirecting|opening adulis/i
const BUYER = 'BY-02'

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('web002', viewport, async (page, t) => {
    // A Buyer's persisted state, so "byte-identical" proves something: one follow written the way the Buyer app writes it.
    await page.addInitScript(({ buyer }) => {
      try {
        const key = 'adulis.seller-workspace.v1:marketplace'
        const saved = JSON.parse(sessionStorage.getItem(key) ?? '{}')
        const buyers = { ...(saved.buyers ?? {}) }
        buyers[`marketplace|mvp|${buyer}`] = { ...(buyers[`marketplace|mvp|${buyer}`] ?? {}), follows: { 'DS-02': true } }
        if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ ...saved, buyers }))
      } catch { /* fixture only */ }
      // The device's clipboard and share sheet are replaced by recorders (a headless browser has neither).
      window.__copied = []
      Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: undefined })
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async v => { window.__copied.push(v) } } })
    }, { buyer: BUYER })
    const w = web(page, t, viewport)
    const { sf, text, click } = w
    await w.openStorefront()

    // ---- 1. The logo opens Adulis Home ----
    t.ck('the Storefront header has the Adulis logo as a button named "Adulis Home"', await sf().getByRole('button', { name: 'Adulis Home' }).count() === 1)
    await click(sf().getByRole('button', { name: 'Adulis Home' }), 500)
    t.ck('clicking it opens the public Adulis Home (the Company Website landing)', (await page.locator('main.app-main').getAttribute('data-section')) === '03-website' && HOME_TEXT.test(await page.locator('main.app-main').innerText()))
    t.ck('no Storefront or private surface is left open behind it', await page.locator('.storefront-phone').count() === 0)
    await w.openStorefront()

    // ---- 2. Public browsing for every public Seller: Scenes, Products ----
    const pills = await page.locator('.storefront-toolbar button[aria-pressed]').allInnerTexts()
    t.eq('the Seller picker lists exactly the 21 public Sellers', pills.length, publicSellers.length)
    t.ck('the Draft Seller (DS-11) and the Suspended Seller (DS-23) are not offered', !pills.includes(S['DS-11'].name) && !pills.includes(S['DS-23'].name))
    let sellersOk = 0
    for (const id of publicSellers) {
      await w.pick(id)
      const scenes = await sf().locator('[role=tabpanel] button[aria-label^="Scene: "]').count()
      await w.tab('Products')
      const products = await sf().locator('[role=tabpanel] > div > button').count()
      const names = await sf().locator('[role=tabpanel]').innerText()
      const leaked = draftProducts.some(p => p.seller_id === id && names.includes(p.name))
      if (scenes === publicScenes(id).length && products === publishedProducts(id).length && !leaked && (await sf().locator('h1').first().innerText()) === S[id].name) sellersOk++
      else console.log('  Seller mismatch', id, { scenes, expectedScenes: publicScenes(id).length, products, expectedProducts: publishedProducts(id).length, leaked })
    }
    t.eq('every public Seller shows exactly its public Scenes and its published Products (no Draft Product)', sellersOk, publicSellers.length)

    // The Scenes tab never shows a hidden Scene's title
    let hiddenLeak = 0
    for (const sc of hiddenScenes.filter(s => publicSellers.includes(s.seller_id))) {
      await w.pick(sc.seller_id); await w.tab('Scenes')
      const unique = !publicScenes(sc.seller_id).some(s => s.title === sc.title)
      if (unique && (await sf().innerText()).includes(sc.title)) hiddenLeak++
    }
    t.eq('Private, Draft and Archived Scenes of public Sellers are not listed on their Storefronts', hiddenLeak, 0)

    // ---- 3. Product page and Scene, Seller attribution ----
    await w.pick('DS-01'); await w.tab('Products')
    const p1 = P['DS-01-P01']
    await click(sf().locator('[role=tabpanel] > div > button', { hasText: p1.name }), 400)
    const productText = await text()
    t.ck('Product page: name, price and availability from the dataset', productText.includes(p1.name) && productText.includes(money(p1.current_etb)) && /Available|Low Stock/.test(productText))
    t.ck('Product page: the Seller name and handle link back to that Storefront', await sf().locator('[data-seller-link]').count() === 1 && (await sf().locator('[data-seller-link]').innerText()).includes(S['DS-01'].name))
    t.ck('no checkout, pay or buy-now control anywhere on the Product page', await sf().getByRole('button', { name: /checkout|buy now|place order|pay\b/i }).count() === 0)
    t.ck('the Cart action is "Add to Cart" and there is no Checkout', await sf().getByRole('button', { name: 'Add to Cart' }).count() === 1)
    await w.overflow('Product page')

    // ---- 4. Install prompts: each account action names itself and changes nothing ----
    const before = await w.storage()
    const expectPrompt = async (label, button, message, scope = sf()) => {
      const pre = await w.storage()
      await click(button, 300)
      const dlg = w.dialog('Install Adulis')
      const shown = await dlg.count() === 1
      const msg = shown ? (await dlg.locator('[data-install-message]').innerText()).trim() : ''
      const body = shown ? await dlg.innerText() : ''
      const clean = shown && (await dlg.locator('a, [href]').count()) === 0 && !FAKE.test(body.replace(/Adulis is available on the Adulis app\./, '')) && (await dlg.getByRole('progressbar').count()) === 0
      const dismissOnly = shown && (await dlg.getByRole('button').allInnerTexts()).join('|') === 'Not now'
      t.ck(`${label}: the prompt says "${message}", with only "Not now", no store link, no download, no progress`, shown && msg === message && clean && dismissOnly, { msg, body })
      await click(dlg.getByRole('button', { name: 'Not now' }), 250)
      t.ck(`${label}: dismissing closes it and the persisted state is byte-identical`, await dlg.count() === 0 && (await w.storage()) === pre)
    }
    await expectPrompt('Product Like', sf().getByRole('button', { name: 'Like this Product' }), 'Install Adulis to like this Product')
    await expectPrompt('Product Save', sf().getByRole('button', { name: 'Save this Product' }), 'Install Adulis to save this Product')
    await expectPrompt('Product Chat', sf().getByRole('button', { name: `Chat with ${S['DS-01'].name}` }), `Install Adulis to chat with ${S['DS-01'].name}`)
    await expectPrompt('Product Cart', sf().getByRole('button', { name: 'Add to Cart' }), 'Install Adulis to add this Product to your Cart')
    await expectPrompt('Open in Adulis', sf().getByRole('button', { name: 'Open in Adulis', exact: true }), 'Open this in the Adulis app')
    // Escape closes the prompt too
    await click(sf().getByRole('button', { name: 'Add to Cart' }), 250); await page.keyboard.press('Escape'); await w.settle(250)
    t.ck('Escape closes the prompt', await w.dialog('Install Adulis').count() === 0)
    // Storefront header: Follow, Chat
    await click(sf().getByRole('button', { name: 'Seller: ' + S['DS-01'].name + ', open Storefront' }), 400)
    await expectPrompt('Follow', sf().getByRole('button', { name: 'Follow', exact: true }), `Install Adulis to follow ${S['DS-01'].name}`)
    await expectPrompt('Chat', sf().getByRole('button', { name: 'Chat', exact: true }), `Install Adulis to chat with ${S['DS-01'].name}`)
    // Scene: Like, Save, Chat
    await click(sf().locator('[role=tabpanel] button[aria-label^="Scene: "]', ), 450)
    await expectPrompt('Scene Like', sf().getByRole('button', { name: 'Like this Scene' }), 'Install Adulis to like this Scene')
    await expectPrompt('Scene Save', sf().getByRole('button', { name: 'Save this Scene' }), 'Install Adulis to save this Scene')
    await expectPrompt('Scene Chat', sf().getByRole('button', { name: `Chat with ${S['DS-01'].name}` }), `Install Adulis to chat with ${S['DS-01'].name}`)
    t.ck('across every prompt the browser storage is byte-identical to what it was before the first one', (await w.storage()) === before)
    t.ck('the Buyer fixture is still in the persisted workspace (follows untouched)', (await page.evaluate(() => sessionStorage.getItem('adulis.seller-workspace.v1:marketplace') ?? '')).includes('DS-02'))
    t.ck('no Cart, like, save, follow or chat was created: no request left the app', t.requests.every(h => ['127.0.0.1', 'localhost', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(h.split(':')[0])))
    await w.overflow('Scene with prompts closed')

    // ---- 5. Sellers directory and Search ----
    await w.pick('DS-01')
    await click(sf().getByRole('button', { name: 'Sellers', exact: true }), 400)
    const rows = await sf().locator('[data-seller-row]').evaluateAll(els => els.map(e => e.getAttribute('data-seller-row')))
    t.ck('the Sellers directory lists the 21 public Sellers only (no DS-11, no DS-23)', rows.length === 21 && rows.every(id => publicSellers.includes(id)) && !rows.includes('DS-11') && !rows.includes('DS-23'), rows)
    await click(sf().locator('[data-seller-row="DS-12"]'), 450)
    t.ck('opening a Seller from the directory opens that Storefront', (await sf().locator('h1').first().innerText()) === S['DS-12'].name)
    await w.overflow('Sellers directory flow')

    await click(sf().getByRole('button', { name: 'Search', exact: true }), 350)
    const input = sf().getByLabel('Search Adulis')
    await input.fill('dress'); await w.settle(400)
    const owners = await sf().locator('[data-result-product]').evaluateAll(els => els.map(e => e.getAttribute('data-result-product').slice(0, 5)))
    t.ck('Search "dress" spans the public marketplace: results from several Sellers', new Set(owners).size >= 3, [...new Set(owners)])
    t.ck('category facets are offered with counts', (await sf().getByRole('group', { name: 'Product filters' }).getByRole('button').count()) > 2)
    const chips = await sf().getByRole('group', { name: 'Product filters' }).getByRole('button').allInnerTexts()
    const category = chips.find(c => /\(\d+\)/.test(c))
    const all = await sf().locator('[data-result-product]').count()
    await click(sf().getByRole('group', { name: 'Product filters' }).getByRole('button', { name: category }), 300)
    t.ck(`choosing the facet "${category}" narrows the Products (and can be cleared)`, (await sf().locator('[data-result-product]').count()) <= all && (await sf().getByRole('button', { name: category, pressed: true }).count()) === 1)
    await click(sf().getByRole('button', { name: category, pressed: true }), 300)
    // hidden content never appears
    const draft = draftProducts[0]
    await input.fill(draft.name); await w.settle(350)
    t.ck(`a Draft Product's exact name finds nothing (${draft.name})`, await sf().locator(`[data-result-product="${draft.product_id}"]`).count() === 0)
    await input.fill(S['DS-23'].name); await w.settle(350); await w.tab(/^sellers/i)
    t.ck('the Suspended Seller cannot be found by name', await sf().locator('[data-result-seller="DS-23"]').count() === 0)
    await input.fill(S['DS-11'].name); await w.settle(350); await w.tab(/^sellers/i)
    t.ck('the Draft Seller cannot be found by name', await sf().locator('[data-result-seller="DS-11"]').count() === 0)
    const pName = P['DS-23-P01'].name
    await input.fill(pName); await w.settle(350); await w.tab(/^products/i)
    t.ck('a Suspended Seller\'s Product cannot be found', await sf().locator('[data-result-product="DS-23-P01"]').count() === 0)
    const hidden = SC['DS-01-S03']
    await input.fill(hidden.title); await w.settle(350); await w.tab(/^scenes/i)
    t.ck('a Private Scene cannot be found by its title', await sf().locator('[data-result-scene="DS-01-S03"]').count() === 0)
    // a result opens its record on that Seller's Storefront
    await input.fill('dress'); await w.settle(350); await w.tab(/^products/i)
    const foreign = await sf().locator('[data-result-product]').evaluateAll(els => els.map(e => e.getAttribute('data-result-product')).find(id => !id.startsWith('DS-12')))
    await click(sf().locator(`[data-result-product="${foreign}"]`), 500)
    t.ck('a Product result opens that Product on its own Seller\'s Storefront', (await text()).includes(P[foreign].name) && (await text()).includes(S[P[foreign].seller_id].name), foreign)
    await w.overflow('Search flow')

    // ---- 6. Sharing: the link reopens the same content ----
    const opened = async (label, urlText, expect) => {
      const u = new URL(urlText)
      t.ck(`${label}: a link on this origin with surface=storefront`, u.origin === new URL(page.url()).origin && u.searchParams.get('surface') === 'storefront', urlText)
      await t.open(u.search); await w.settle(500)
      await expect(label)
    }
    await w.pick('DS-02'); await w.tab('Products')
    const prod = P['DS-02-P01']
    await click(sf().locator('[role=tabpanel] > div > button', { hasText: prod.name }), 400)
    await click(sf().getByRole('button', { name: 'Share', exact: true }), 300)
    const urlP = await sf().locator('[data-share-url]').inputValue()
    t.ck('Product share URL names the Seller and Product', new URL(urlP).searchParams.get('seller') === 'DS-02' && new URL(urlP).searchParams.get('product') === 'DS-02-P01', urlP)
    await click(sf().getByRole('button', { name: 'Copy link' }), 250)
    t.ck('Copy link shows "Link copied" and wrote exactly that URL', /Link copied/.test(await sf().locator('[data-share-status]').innerText()) && (await page.evaluate(() => window.__copied.at(-1))) === urlP)
    t.ck('no native share control when the device has none', await sf().getByRole('button', { name: 'Share…' }).count() === 0)
    await page.keyboard.press('Escape'); await w.settle(200)
    await page.evaluate(() => { navigator.share = async d => { window.__shared = d } })
    await click(sf().getByRole('button', { name: 'Share', exact: true }), 300)
    await click(sf().getByRole('button', { name: 'Share…' }), 250)
    t.ck('with navigator.share the device share sheet gets the title and the same URL', (await page.evaluate(() => window.__shared?.url)) === urlP)
    await opened('Product link', urlP, async label => t.ck(`${label}: reopening shows the same Product`, (await text()).includes(prod.name) && (await text()).includes(S['DS-02'].name) && (await page.locator('main.app-main').getAttribute('data-section')) === '04-storefront'))

    await w.openStorefront(); await w.pick('DS-02')
    await click(sf().locator('[role=tabpanel] button[aria-label="Scene: ' + SC['DS-02-S03'].title + '"]'), 450)
    await click(sf().getByRole('list', { name: 'Products in this Scene' }).getByRole('button').nth(1), 300)
    await click(sf().getByRole('button', { name: 'Share', exact: true }), 300)
    const urlS = await sf().locator('[data-share-url]').inputValue()
    const qs = new URL(urlS).searchParams
    t.ck('Scene share URL names the Seller, Scene and the selected Product', qs.get('seller') === 'DS-02' && qs.get('scene') === 'DS-02-S03' && qs.get('product') === SC['DS-02-S03'].product_ids[1], urlS)
    await opened('Scene link', urlS, async label => {
      t.ck(`${label}: reopening shows the Scene explorer with the same Product selected`, (await text()).includes('Explore the Scene') && (await text()).includes(SC['DS-02-S03'].title) && (await sf().getByRole('list', { name: 'Products in this Scene' }).getByRole('button', { pressed: true }).count()) === 1 && (await sf().getByRole('region', { name: 'Product preview' }).innerText()).includes(P[SC['DS-02-S03'].product_ids[1]].name))
    })
    await w.openStorefront(); await w.pick('DS-02')
    await click(sf().getByRole('button', { name: 'Share', exact: true }), 300)
    const urlSeller = await sf().locator('[data-share-url]').inputValue()
    await opened('Storefront link', urlSeller, async label => t.ck(`${label}: reopening shows that Seller`, (await sf().locator('h1').first().innerText()) === S['DS-02'].name))

    // ---- 7. Crafted links: nothing hidden is reachable; the page says only "not available" ----
    const crafted = [
      ['Suspended Seller', '?surface=storefront&seller=DS-23', S['DS-23'].name],
      ['Draft Seller', '?surface=storefront&seller=DS-11', S['DS-11'].name],
      ['Suspended Seller Product, no Seller named', '?surface=storefront&product=DS-23-P01', P['DS-23-P01'].name],
      ['Draft Product', `?surface=storefront&seller=${draft.seller_id}&product=${draft.product_id}`, draft.name],
      ['Private Scene', '?surface=storefront&seller=DS-01&scene=DS-01-S03', SC['DS-01-S03'].title],
      ['Draft Scene', '?surface=storefront&seller=DS-01&scene=DS-01-S07', SC['DS-01-S07'].title],
      ['Archived Scene', '?surface=storefront&seller=DS-10&scene=DS-10-S06', SC['DS-10-S06'].title],
      ['Moderation-restricted Scene', '?surface=storefront&seller=DS-06&scene=DS-06-S05', SC['DS-06-S05'].title],
      ['Suspended Seller Scene', '?surface=storefront&seller=DS-23&scene=DS-23-S01', SC['DS-23-S01'].title],
      ['a Scene of another Seller', '?surface=storefront&seller=DS-01&scene=DS-02-S03', SC['DS-02-S03'].title],
      ['an unknown Seller', '?surface=storefront&seller=DS-99', 'DS-99'],
      ['a malformed id', '?surface=storefront&seller=..%2F..%2Fetc&product=%3Cscript%3E', 'script'],
      ['a Product that is not in the Scene', '?surface=storefront&seller=DS-02&scene=DS-02-S03&product=DS-02-P01', ''],
    ]
    for (const [label, query, name] of crafted) {
      await t.open(query); await w.settle(450)
      const body = await page.locator('main.app-main').innerText()
      const noName = !name || label === 'a Scene of another Seller' || !body.includes(name)
      t.ck(`crafted link, ${label}: "This page is not available" and nothing of the record shows`, (await sf().locator('[data-unavailable]').count()) === 1 && /This page is not available/.test(body) && noName, body.slice(0, 200))
    }
    await t.open('?surface=storefront&seller=DS-12'); await w.settle(400)
    t.ck('a valid public Seller link opens that Seller', (await sf().locator('h1').first().innerText()) === S['DS-12'].name)
    await t.open('?surface=storefront&seller=DS-23'); await w.settle(400)
    await click(sf().getByRole('button', { name: 'Browse Sellers' }), 350)
    t.ck('from "not available", Browse Sellers lists public Sellers only', await sf().locator('[data-seller-row]').count() === 21 && await sf().locator('[data-seller-row="DS-23"]').count() === 0)
    await t.open('?surface=storefront&seller=DS-23'); await w.settle(400)
    await click(sf().getByRole('button', { name: 'Adulis Home' }), 400)
    t.ck('from "not available", Adulis Home opens the website', HOME_TEXT.test(await page.locator('main.app-main').innerText()))
    await t.open('?surface=home'); await w.settle(400)
    t.ck('?surface=home opens Adulis Home', (await page.locator('main.app-main').getAttribute('data-section')) === '03-website' && HOME_TEXT.test(await page.locator('main.app-main').innerText()))
    await page.evaluate(() => sessionStorage.removeItem('adulis.selected-seller.v1:marketplace'))
    await t.open('?surface=storefront&seller=DS-12'); await w.settle(400)
    await t.section('05 Mobile — Buyer'); await t.section('04 Seller Storefront'); await w.settle(400)
    t.ck('leaving the linked page and coming back drops the link (the normal Storefront: DS-01)', (await sf().locator('h1').first().innerText()) === S['DS-01'].name)
    await w.overflow('Crafted link flow')
  })
}
