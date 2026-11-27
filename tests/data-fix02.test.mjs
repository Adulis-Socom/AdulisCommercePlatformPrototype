// DATA-FIX-02 (IR-049): ONE effective fulfilment across Product page, Seller page, Cart, checkout review and the chatbot. REAL app; the Seller's Store
// setup and the Products' own fulfilment are written to the session store before load (what the Seller Console writes when saving).
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/data-fix02'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const product = (id, name, fulfilment, extra = {}) => ({ id, seller: S, status: 'published', name, description: `${name} description`, category: 'fashion/womens-clothing/dresses', attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment, locallyMade: false, updated: 1, ...extra })
const setup = over => ({ storeName: 'Addis Atelier', handle: '@addisatelier', about: '', contactPhone: '', ownerName: '', coverage: ['Addis Ababa'], collection: { on: true, place: 'Bole studio' }, sellerDelivery: { on: true, fee: '120' }, courier: false, blank: false, ...over })
const ALL = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']
const state = (setupOver, cart, courier) => ({
  products: {
    'PRD-NEW-001': product('PRD-NEW-001', 'Test Kettle', ALL),
    'PRD-NEW-002': product('PRD-NEW-002', 'Pickup Lamp', ['Buyer Collection'], { price: '500' }),
    'PRD-NEW-003': product('PRD-NEW-003', 'Courier Shirt', ['Seller Delivery', 'Courier Delivery'], { price: '1000' }),
  },
  scenes: {}, stories: {}, setup: { [S]: setup({ ...setupOver, ...(courier ? { courier: true } : {}) }) }, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerSaved: null,
  buyerCart: cart, clockHours: 0,
})
const line = (product, name, seen) => ({ product, options: [], quantity: 1, seen, seller: S, name })
const KETTLE = line('PRD-NEW-001', 'Test Kettle', 75000), LAMP = line('PRD-NEW-002', 'Pickup Lamp', 50000), SHIRT = line('PRD-NEW-003', 'Courier Shirt', 100000)

const body = page => page.locator('body').innerText()
const toBuyer = async (page, t) => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500) }
const openCart = async (page, t) => { await page.getByRole('button', { name: 'Saved', exact: true }).last().click(); await t.settle(300); await page.getByRole('button', { name: /^Cart/ }).click(); await t.settle(400) }
const toCheckout = async (page, t) => { await openCart(page, t); await page.getByRole('button', { name: 'Checkout this Seller cart' }).click(); await t.settle(400); await page.getByRole('button', { name: /Continue with/ }).click(); await t.settle(500); return body(page) }
const run = async (name, st, fn) => suite(name, { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, st])
  await toBuyer(page, t); await fn(page, t)
})

await run('data-fix02-common', state({}, [KETTLE]), async (page, t) => {
  let text = await toCheckout(page, t)
  t.ck('both configured methods are offered, with the Seller’s own charge', /Buyer Collection/.test(text) && /Seller Delivery/.test(text) && /ETB 120/.test(text) && /No delivery fee/.test(text), text.slice(0, 700))
  t.ck('Courier Delivery is not offered: the Seller has not enabled it', !/Courier Delivery/.test(text))
  t.ck('the historical Courier compensation (ETB 180) is never shown as a delivery charge', !/ETB 180|180/.test(text))
  await page.screenshot({ path: `${OUT}/checkout-common-1440.png` })
  await page.getByRole('button', { name: /Seller Delivery/ }).click(); await t.settle(250)
  text = await body(page)
  t.ck('choosing Seller Delivery adds the Seller’s charge: estimated total ETB 870', /Estimated total[^\n]*\n?[^\n]*870/.test(text.replace(/\n/g, ' ')) || /ETB 870/.test(text), text.slice(-500))
  t.ck('still a review: no payment, no surcharge', /Checkout preview only/.test(text) && !/surcharge/i.test(text) && !/Pay now|Continue to payment/i.test(text))
})

await run('data-fix02-collection-only', state({}, [KETTLE, LAMP]), async (page, t) => {
  const text = await toCheckout(page, t)
  t.ck('a collection-only Product narrows the cart to Buyer Collection', /Buyer Collection/.test(text) && !/ETB 120/.test(text.split('Estimated')[0] ?? ''), text.slice(0, 600))
  t.ck('the excluded method is named with the reason', /Not available for this cart: Seller Delivery \(Pickup Lamp is not offered for Seller Delivery\./.test(text), text.slice(0, 900))
})

await run('data-fix02-none', state({}, [LAMP, SHIRT]), async (page, t) => {
  await openCart(page, t)
  const text = await body(page)
  t.ck('Products with no fulfilment method in common block checkout with the reason', /no fulfilment method in common/.test(text) && await page.getByRole('button', { name: 'Checkout this Seller cart' }).isDisabled(), text.slice(-600))
  await page.screenshot({ path: `${OUT}/no-common-method-1440.png` })
  await page.getByRole('button', { name: 'Remove Courier Shirt' }).click(); await t.settle(250)
  t.ck('removing one Product reopens checkout', await page.getByRole('button', { name: 'Checkout this Seller cart' }).isEnabled())
})

await run('data-fix02-disabled-delivery', state({ sellerDelivery: { on: false, fee: '' } }, [KETTLE]), async (page, t) => {
  const text = await toCheckout(page, t)
  t.ck('with delivery switched off only Buyer Collection remains', /Buyer Collection/.test(text) && !/Seller Delivery/.test(text) && !/Courier Delivery/.test(text), text.slice(0, 500))
})

await run('data-fix02-coverage', state({ coverage: ['Adama'] }, [KETTLE]), async (page, t) => {
  const text = await toCheckout(page, t)
  t.ck('changed coverage removes delivery for this Buyer and says why', /Buyer Collection/.test(text) && /Seller Delivery \(The Seller does not currently deliver to Addis Ababa\./.test(text), text.slice(0, 700))
})

await run('data-fix02-fee-changed', state({ sellerDelivery: { on: true, fee: '150' } }, [KETTLE]), async (page, t) => {
  const text = await toCheckout(page, t)
  t.ck('a changed delivery charge is the one shown (ETB 150)', /ETB 150/.test(text) && !/ETB 120/.test(text), text.slice(0, 500))
})

await run('data-fix02-courier-fee-unset', state({}, [KETTLE], true), async (page, t) => {
  let text = await toCheckout(page, t)
  t.ck('Courier Delivery is offered with its fee NOT set (no invented or historical amount)', /Courier Delivery/.test(text) && /Fee not set/.test(text) && !/ETB 180/.test(text), text.slice(0, 700))
  await page.getByRole('button', { name: /Courier Delivery/ }).click(); await t.settle(250)
  text = await body(page)
  t.ck('the estimate says it excludes the unset delivery fee', /Estimated total \(excluding delivery\)/.test(text) && /ETB 750/.test(text), text.slice(-500))
})

await run('data-fix02-surfaces', state({}, [LAMP]), async (page, t) => {
  // Product page and Seller page read the same effective methods.
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('pickup lamp'); await t.settle(450)
  await page.locator('button', { hasText: 'Pickup Lamp' }).first().click(); await t.settle(500)
  let text = await body(page)
  t.ck('the Product page lists only the methods this Product allows: Buyer Collection (free)', /Fulfilment\s*\n?\s*Buyer Collection \(free\)/.test(text) && !/Seller Delivery/.test(text.split('Fulfilment')[1]?.slice(0, 120) ?? ''), text.slice(text.indexOf('Fulfilment'), text.indexOf('Fulfilment') + 160))
  // The chatbot answers from the same methods.
  await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(700)
  const ask = async q => { await page.getByLabel('Message', { exact: true }).fill(q); await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300); return (await body(page)).split(q).pop() ?? '' }
  text = await ask('Do you deliver this?')
  t.ck('the chatbot does not offer delivery for a collection-only Product', !/Seller Delivery|Courier Delivery/.test(text.split('Talk to seller')[0] ?? text) , text.slice(0, 400))
  await page.screenshot({ path: `${OUT}/chat-collection-only-1440.png` })
})
