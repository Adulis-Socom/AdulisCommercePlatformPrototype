// FIX-004 / FIX-005 / FIX-006: seeded and authored Products and Scenes through ONE Buyer experience (Scene explorer, Product page, exact Variants,
// Search, Collections, Cart, checkout preview). REAL app. Authored content is written to the session store before load (what publishing would write).
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/buyer-unified'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const product = (id, name, extra) => ({ id, seller: S, status: 'published', name, description: '', category: null, attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment: ['Buyer Collection'], locallyMade: false, updated: 1, ...extra })
const base = {
  products: {
    'PRD-NEW-001': product('PRD-NEW-001', 'Test Kettle', { description: 'A small steel kettle.' }),
    'PRD-NEW-002': product('PRD-NEW-002', 'Linen Wrap Dress', {
      description: 'A wrap dress in washed linen.', category: 'fashion/womens-clothing/dresses', attributes: { Material: 'Linen', Length: 'Midi' }, price: '1200', stock: '',
      options: [{ name: 'Size', values: ['S', 'M', 'L'] }, { name: 'Colour', values: ['Black', 'Navy'] }],
      variants: [{ key: 'v1', label: 'S / Black', price: '1200', stock: '3' }, { key: 'v2', label: 'M / Black', price: '1200', stock: '0' }, { key: 'v3', label: 'M / Navy', price: '1500', stock: '2' }],
    }),
    'PRD-NEW-003': product('PRD-NEW-003', 'Hidden Draft Lamp', { status: 'draft' }),
    'PRD-NEW-004': product('PRD-NEW-004', 'ቡና ማፍያ', { description: 'የቡና ማፍያ', price: '900' }),
    // a seeded Product the Seller gave a photo: its photo must reach the Buyer
    'PRD-AA-001': product('PRD-AA-001', 'Linen Overshirt', { seeded: true, description: 'A relaxed overshirt in washed linen, cut to layer over a tee or under a coat.', options: [{ name: 'Size', values: ['S', 'M', 'L', 'XL'] }, { name: 'Colour', values: ['Natural', 'Olive'] }], price: '2450', stock: '14', locallyMade: true }),
  },
  scenes: {
    'SCN-NEW-001': { id: 'SCN-NEW-001', seller: S, status: 'published', caption: 'Kettle corner', image: img, alt: 'A kettle and a dress on a table', tags: [{ product: 'PRD-NEW-001', x: 40, y: 60, n: 1 }, { product: 'PRD-NEW-002', x: 70, y: 30, n: 2 }], updated: 5 },
    'SCN-NEW-002': { id: 'SCN-NEW-002', seller: S, status: 'published', caption: 'Restricted corner', image: img, alt: 'Restricted scene photo', tags: [{ product: 'PRD-NEW-001', x: 50, y: 50, n: 1 }], updated: 6, restricted: { reason: 'Moderation' } },
  },
  stories: {}, setup: {}, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerSaved: null, buyerCart: null, clockHours: 0,
}
const toBuyer = async (page, t) => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(600); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500) }
const body = page => page.locator('body').innerText()
const search = async (page, t, q) => { await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300); await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(q); await t.settle(450) }
const openProduct = async (page, t, name) => { await page.locator('button', { hasText: name }).first().click(); await t.settle(500) }

await suite('buyer-unified', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, base])
  await toBuyer(page, t)

  // ---- FIX-004: one experience for seeded and authored ----
  t.ck('For You leads with the authored Scene, in the same feed unit as a seeded one', ((await page.getByRole('article').first().getAttribute('aria-label')) ?? '').startsWith('Kettle corner, by'))
  t.ck('the Scene photo the Seller uploaded is the feed media', await page.getByRole('article').first().locator('img').count() === 1)
  t.ck('a restricted authored Scene is not offered', await page.getByRole('article', { name: /Restricted corner/ }).count() === 0)
  await page.getByRole('button', { name: /Explore the Scene: Kettle corner/ }).click(); await t.settle(500)
  const spot = page.getByRole('button', { name: 'Linen Wrap Dress', exact: true })
  t.ck('hotspots sit where the Seller placed them and keep their numbers', await spot.count() === 1 && (await spot.evaluate(el => el.style.left)) === '70%' && (await spot.evaluate(el => el.style.top)) === '30%' && (await spot.textContent()) === '2', await spot.evaluate(el => el.getAttribute('style')))
  t.ck('the Scene explorer lists every tagged viewable Product', await page.getByRole('list', { name: 'Products in this Scene' }).getByRole('button').count() === 2)
  await page.screenshot({ path: `${OUT}/scene-explorer-authored-1440.png` })
  await spot.click(); await t.settle(250)
  await page.getByRole('button', { name: /View Product/ }).click(); await t.settle(500)
  let text = await body(page)
  t.ck('the Product page is the ordinary one: details, price, availability, Seller, Reviews', /Linen Wrap Dress/.test(text) && /ETB 1,200/.test(text) && /Description/.test(text) && /Reviews/.test(text) && /Addis Atelier/.test(text))
  t.ck('its details come through (Material, Length)', /Material: Linen/.test(text) && /Length: Midi/.test(text))
  t.ck('the Product photo is shown', await page.locator('img[alt="Linen Wrap Dress"]').count() === 1)
  const size = n => page.getByRole('button', { name: n, exact: true })
  t.ck('every Size and Colour value is offered: nothing is truncated', await Promise.all(['S', 'M', 'L', 'Black', 'Navy'].map(n => size(n).count())).then(c => c.every(x => x === 1)))
  await size('M').click(); await size('Black').click()
  t.ck('an exact Variant with no stock says so and cannot be added', /This option is out of stock/.test(await body(page)) && await page.getByRole('button', { name: 'Add to Cart' }).isDisabled())
  await size('S').click(); await size('Navy').click()
  t.ck('a combination the Seller did not list is not offered (never defaulted)', /This combination is not offered/.test(await body(page)) && await page.getByRole('button', { name: 'Add to Cart' }).isDisabled())
  await size('M').click()
  t.ck('M / Navy shows its own price', /Price for this option: ETB 1,500/.test(await body(page)) && await page.getByRole('button', { name: 'Add to Cart' }).isEnabled())
  const plus = page.getByRole('button', { name: '+', exact: true })
  await plus.click(); await t.settle(150)
  t.ck('quantity stops at the exact Variant’s stock (2) and says why', (await page.locator('span.w-10').first().innerText()) === '2' && /most currently available for this option/.test(await body(page)) && await plus.isDisabled())
  await page.getByRole('button', { name: /^Save$/ }).click(); await t.settle(200)
  t.ck('Save toggles on an authored Product', await page.getByRole('button', { name: 'Saved' }).count() === 1)
  await page.getByRole('button', { name: 'Share', exact: true }).click(); await t.settle(300)
  t.ck('Share opens the same sheet', /Copy link|Share/.test(await body(page)))
  await page.keyboard.press('Escape'); await t.settle(200)
  await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Not now' }).click().catch(() => {})
  await page.screenshot({ path: `${OUT}/authored-product-1440.png` })

  // seeded Product with a Seller-added photo
  await toBuyer(page, t)
  await search(page, t, 'overshirt'); await openProduct(page, t, 'Linen Overshirt')
  t.ck('a photo the Seller added to a SEEDED Product reaches the Buyer', await page.locator('img[alt="Linen Overshirt"]').count() >= 1)

  // ---- FIX-005: real search ----
  await toBuyer(page, t); await search(page, t, 'linen')
  text = await body(page)
  t.ck('Search matches seeded and authored Products by name or description', /Linen Overshirt/.test(text) && /Linen Wrap Dress/.test(text))
  t.ck('result types are tabs with live counts', /Products \d/.test(text) && /Scenes \d/.test(text) && /Sellers \d/.test(text))
  await page.getByRole('tab', { name: /^products/i }).click(); await t.settle(300)
  await page.getByRole('button', { name: /Fashion › Women’s Clothing/ }).click(); await t.settle(300)
  text = await body(page)
  t.ck('a category filter applies (only the authored dress is Women’s Clothing)', /Linen Wrap Dress/.test(text) && !/Linen Overshirt/.test(text))
  await page.getByLabel('Detail').selectOption({ label: 'Material: Linen (1)' }); await t.settle(300)
  t.ck('an applicable attribute filter applies', /Linen Wrap Dress/.test(await body(page)))
  await page.getByRole('button', { name: /Fashion › Women’s Clothing/ }).click(); await t.settle(200)
  await page.getByLabel('Detail').selectOption(''); await t.settle(200)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('ቡና'); await t.settle(400)
  t.ck('Unicode (Amharic) queries work', /ቡና ማፍያ/.test(await body(page)))
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('kettle'); await t.settle(400)
  await page.getByRole('tab', { name: /^scenes/i }).click(); await t.settle(300)
  t.ck('Scenes are searched by their Products and caption', await page.getByRole('img', { name: 'Scene: Kettle corner' }).count() === 1)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('hidden draft lamp'); await t.settle(400)
  t.ck('an unpublished Product is never found', /No results for/.test(await body(page)))
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('restricted corner'); await t.settle(400)
  t.ck('a restricted Scene is never found', /No results for/.test(await body(page)))
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('zzzzqq'); await t.settle(400)
  t.ck('no match gives a meaningful empty state with a way out', /No results for “zzzzqq”/.test(await body(page)) && await page.getByRole('button', { name: 'Clear search' }).count() >= 1)

  // ---- Collections: seeded and authored Products and Scenes, unavailable states kept ----
  await toBuyer(page, t)
  await page.getByRole('button', { name: 'Save', exact: true }).first().click(); await t.settle(250) // the authored Scene leads the feed
  await search(page, t, 'kettle'); await openProduct(page, t, 'Test Kettle')
  await page.getByRole('button', { name: /^Save$/ }).click(); await t.settle(250)
  await toBuyer(page, t)
  await page.getByRole('button', { name: 'Saved', exact: true }).last().click(); await t.settle(400)
  await page.locator('button', { hasText: /Saved[\s\S]*\d+ Products/ }).first().click(); await t.settle(400)
  text = await body(page)
  t.ck('Saves of authored Products and Scenes survive switching surfaces and sit in the Collection beside seeded ones', /Test Kettle/.test(text) && /Linen Wrap Dress/.test(text) && await page.getByRole('img', { name: 'Scene: Kettle corner' }).count() === 1, text.slice(380, 900))
  await page.screenshot({ path: `${OUT}/collection-1440.png` })
  t.ck('no external request, no page error', ![...new Set(t.requests)].some(h => !/^(127\.0\.0\.1|localhost|fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com)/.test(h)))
})

// ---- FIX-006: Cart and checkout preview, with a synthetic changed-price fixture ----
const withCart = { ...base, buyerCart: [
  { product: 'PRD-NEW-002', options: ['S', 'Black'], quantity: 2, seen: 100000 },
  { product: 'PRD-NEW-002', options: ['M', 'Navy'], quantity: 3, seen: 150000 },
  { product: 'PRD-NEW-002', options: ['M', 'Black'], quantity: 1, seen: 120000 },
  { product: 'PRD-NEW-002', options: ['L', 'Navy'], quantity: 1, seen: 120000 },
] }
await suite('buyer-cart', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, withCart])
  await toBuyer(page, t)
  await search(page, t, 'kettle'); await openProduct(page, t, 'Test Kettle')
  await page.getByRole('button', { name: 'Add to Cart' }).click(); await t.settle(400)
  await page.getByRole('button', { name: 'View cart', exact: true }).click(); await t.settle(500)
  let text = await body(page)
  t.ck('the Cart is Seller-separated and holds authored Products, exact Variants and quantities', /Addis Atelier cart/.test(text) && /Test Kettle/.test(text) && /Linen Wrap Dress/.test(text))
  t.ck('a changed price is detected with both prices', /Price changed/.test(text) && /from ETB 1,000 to ETB 1,200/.test(text), text.slice(0, 900))
  t.ck('insufficient stock is detected for the exact Variant (3 wanted, 2 available)', /only 2 available for this option/.test(text))
  t.ck('an unavailable Variant is detected', /No longer available/.test(text))
  t.ck('a Variant the Seller no longer lists is detected', /no longer offered/.test(text))
  const checkout = page.getByRole('button', { name: 'Checkout this Seller cart' })
  t.ck('renewed review: checkout stays closed while anything has changed, and nothing is held or charged', await checkout.isDisabled() && /Nothing has been ordered, held or charged/.test(text))
  await page.screenshot({ path: `${OUT}/cart-review-1440.png`, fullPage: false })
  await page.getByRole('button', { name: 'Accept the new price' }).click(); await t.settle(200)
  t.ck('accepting the new price clears that change only', !/Price changed/.test(await body(page)) && await checkout.isDisabled())
  await page.getByRole('button', { name: 'Reduce to 2' }).click(); await t.settle(200)
  for (const name of ['Linen Wrap Dress']) {
    for (let i = 0; i < 2; i++) { const rm = page.getByRole('button', { name: `Remove ${name}` }); if (await rm.count()) { const n = await rm.count(); await rm.nth(n - 1).click(); await t.settle(200) } }
  }
  text = await body(page)
  t.ck('removing the unavailable lines leaves a reviewable Cart', !/No longer available|no longer offered|Not enough stock/.test(text))
  t.ck('the remaining Cart shows the exact-Variant price and subtotal', /ETB/.test(text) && /Cart subtotal/.test(text))
  t.ck('checkout opens once nothing is pending', await checkout.isEnabled(), (await body(page)).slice(0, 600))
  await checkout.click(); await t.settle(500)
  text = await body(page)
  await page.getByRole('button', { name: /Continue with/ }).click(); await t.settle(500)
  text = await body(page)
  t.ck('checkout is a REVIEW only: the preview notice, estimated costs, no surcharge, no payment, no Order', /Checkout preview only\. No Order will be placed and no money will be collected\./.test(text) && /Estimated/.test(text) && !/surcharge/i.test(text) && !/Pay now|Place order|Payment breakdown/i.test(text), text.slice(-1200))
  await page.screenshot({ path: `${OUT}/checkout-review-1440.png` })
  t.ck('no external request', ![...new Set(t.requests)].some(h => !/^(127\.0\.0\.1|localhost|fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com)/.test(h)))
})

// ---- Collections keep an item's unavailable state when its record is gone (unpublished authored Product, vanished Scene) ----
await suite('buyer-gone', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, st]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(st)) }, [KEY, { ...base, buyerSaved: { 'product:PRD-NEW-003': true, 'product:PRD-NEW-001': true, 'post:SCN-NEW-002': true } }])
  await toBuyer(page, t)
  await page.getByRole('button', { name: 'Saved', exact: true }).last().click(); await t.settle(400)
  await page.locator('button', { hasText: /Products/ }).first().click(); await t.settle(400)
  const text = await body(page)
  t.ck('a saved Product that is no longer published stays in the Collection, marked unavailable', /Saved Product · no longer available/.test(text) && /Test Kettle/.test(text), text.slice(380, 1000))
  t.ck('a saved Scene that is restricted stays, marked unavailable', /Saved Scene · no longer available/.test(text))
  t.ck('the Collection says how many saved items are unavailable', /unavailable/.test(text))
})
