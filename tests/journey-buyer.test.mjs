// FIX-008: the complete Buyer journey on authored content, in one session: Scene discovery -> Product -> exact Variant -> chat -> Save ->
// Collection -> Cart -> checkout review. Every surface must state the SAME current price and availability. REAL app, no mocks.
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/journey-buyer'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const state = {
  products: {
    'PRD-NEW-001': { id: 'PRD-NEW-001', seller: S, status: 'published', name: 'Test Kettle', description: 'A small steel kettle.', category: null, attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment: ['Buyer Collection'], locallyMade: false, updated: 1 },
    'PRD-NEW-002': { id: 'PRD-NEW-002', seller: S, status: 'published', name: 'Linen Wrap Dress', description: 'A wrap dress in washed linen.', category: 'fashion/womens-clothing/dresses', attributes: { Material: 'Linen', Length: 'Midi' }, customAttributes: [],
      options: [{ name: 'Size', values: ['S', 'M', 'L'] }, { name: 'Colour', values: ['Black', 'Navy'] }], price: '1200', stock: '', photos: [img], fulfilment: ['Buyer Collection'], locallyMade: true, updated: 1,
      variants: [{ key: 'v1', label: 'S / Black', price: '1200', stock: '3' }, { key: 'v2', label: 'M / Black', price: '1200', stock: '0' }, { key: 'v3', label: 'M / Navy', price: '1500', stock: '2' }] },
  },
  scenes: { 'SCN-NEW-001': { id: 'SCN-NEW-001', seller: S, status: 'published', caption: 'Kettle corner', image: img, alt: 'A kettle and a dress on a table', tags: [{ product: 'PRD-NEW-001', x: 40, y: 60, n: 1 }, { product: 'PRD-NEW-002', x: 70, y: 30, n: 2 }], updated: 5 } },
  stories: {}, setup: {}, knowledge: {}, bot: { [S]: { enabled: true, returns: { eligibility: '', window: '', condition: '', process: '' }, warrantyOffered: '', warranty: '', sizeGuide: '', collectionHours: '', handoffRoute: '', products: {}, scenes: {} } },
  chats: {}, botFeedback: [], buyerSaved: null, buyerCart: null, clockHours: 0,
}

await suite('journey-buyer', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, state])
  const body = () => page.locator('body').innerText()
  const msgs = () => page.getByRole('list', { name: 'Messages' }).innerText()
  const btn = (name, exact = true) => page.getByRole('button', { name, exact })
  await t.open(); await t.section('Mobile — Buyer')
  await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)

  // 1. Scene discovery
  t.ck('1. For You leads with the Seller’s Scene', ((await page.getByRole('article').first().getAttribute('aria-label')) ?? '').startsWith('Kettle corner, by'))
  await page.getByRole('button', { name: /Explore the Scene: Kettle corner/ }).click(); await t.settle(500)
  await btn('Linen Wrap Dress').click(); await t.settle(250)
  t.ck('2. the hotspot selects the Product and previews it with its price', /Linen Wrap Dress/.test(await body()) && /ETB 1,200/.test(await body()))
  await btn(/View Product/, false).click(); await t.settle(500)

  // 2. Product, exact Variant
  await btn('M').click(); await btn('Navy').click()
  let text = await body()
  const pagePrice = /Price for this option: (ETB [\d,]+)/.exec(text)?.[1]
  t.eq('3. the Product page states the exact Variant’s price', pagePrice, 'ETB 1,500')
  await page.getByRole('button', { name: /^Save$/ }).click(); await t.settle(200)
  t.ck('4. Save works on the authored Product', await page.getByRole('button', { name: 'Saved' }).count() === 1)

  // 3. Chat about the same Product and Variant: the assistant states the same facts
  await btn('Ask Seller', false).click(); await t.settle(600)
  await page.getByLabel('Size', { exact: true }).selectOption('M'); await page.getByLabel('Colour', { exact: true }).selectOption('Navy')
  await page.getByLabel('Message', { exact: true }).fill('Is it available?')
  await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
  const chatAnswer = await msgs()
  t.ck('5. the assistant states the same price and availability for the same exact Variant', /Size M, Navy is currently available\. The listed price is ETB 1,500\./.test(chatAnswer), chatAnswer.slice(-300))
  await page.getByLabel('Message', { exact: true }).fill('Can I get 3?')
  await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
  t.ck('6. the quantity answer follows the Variant’s stock (2): three is refused', /That quantity is not currently available/.test(await msgs()))
  await page.getByLabel('Message', { exact: true }).fill('I want to buy this one.')
  await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300)
  t.ck('7. "I want this" only offers navigation', await btn('Open Cart review').count() === 1 && /Payment and live order placement are not available yet/.test(await msgs()))
  await page.screenshot({ path: `${OUT}/journey-chat-1440.png` })
  await btn('Open Cart review').click(); await t.settle(600)
  const emptyCart = await body()
  t.ck('8. nothing was added to the Cart by the chat (the Cart is empty)', /cart is empty/i.test(emptyCart) || !/Linen Wrap Dress/.test(emptyCart), emptyCart.slice(380, 700))

  // 4. Cart: add the exact Variant from the Product page
  for (let i = 0; i < 6 && !(await page.getByRole('button', { name: 'Search', exact: true }).count()); i++) { await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await t.settle(300) }
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('wrap dress'); await t.settle(400)
  t.ck('9. Search shows the same Product (authored, found by name)', /Linen Wrap Dress/.test(await body()))
  await page.locator('button', { hasText: 'Linen Wrap Dress' }).first().click(); await t.settle(500)
  await btn('M').click(); await btn('Navy').click()
  await page.getByRole('button', { name: '+', exact: true }).click(); await t.settle(150)
  await btn('Add to Cart').click(); await t.settle(400)
  await btn('View cart').click(); await t.settle(500)
  text = await body()
  t.ck('10. the Cart holds the exact Variant at the same price, quantity 2, subtotal ETB 3,000', /Linen Wrap Dress/.test(text) && /M, Navy|Navy/.test(text) && /ETB 1,500/.test(text) && /ETB 3,000/.test(text), text.slice(380, 900))
  await page.screenshot({ path: `${OUT}/journey-cart-1440.png` })

  // 5. Collections, then checkout review
  await page.getByRole('button', { name: 'Checkout this Seller cart' }).click(); await t.settle(500)
  await page.getByRole('button', { name: /Continue with/ }).click(); await t.settle(500)
  text = await body()
  t.ck('11. checkout review shows the same product subtotal and is a preview only', /Products\s*\n?\s*ETB 3,000/.test(text) && /Checkout preview only\. No Order will be placed and no money will be collected\./.test(text) && !/surcharge/i.test(text), text.slice(380, 1100))
  await page.screenshot({ path: `${OUT}/journey-checkout-1440.png` })
  t.ck('12. no external request', ![...new Set(t.requests)].some(h => !/^(127\.0\.0\.1|localhost|fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com)/.test(h)))
})
