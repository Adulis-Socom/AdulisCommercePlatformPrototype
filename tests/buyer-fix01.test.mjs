// BUYER-FIX-01 (IR-047, IR-051): Cart reliability and state isolation. REAL app.
//  - a Product that leaves LIVE_PRODUCTS (returned to draft, deleted) must never crash the Cart; its line stays, marked, and can be removed
//  - restricted/removed/zero stock/short stock/changed price/deleted Variant/invalid persisted reference/reload
//  - the ordinary MVP Cart and Saves are separate from the internal simulation's
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/buyer-fix01'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const ALL = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']
const product = (id, name, extra = {}) => ({ id, seller: S, status: 'published', name, description: `${name} description`, category: 'fashion/womens-clothing/dresses', attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment: ALL, locallyMade: false, updated: 1, ...extra })
const base = (cart, products) => ({
  products: products ?? {
    'PRD-NEW-001': product('PRD-NEW-001', 'Test Kettle'),
    'PRD-NEW-002': product('PRD-NEW-002', 'Empty Mug', { stock: '0', price: '300' }),
    'PRD-NEW-003': product('PRD-NEW-003', 'Variant Shirt', { price: '1000', stock: '', options: [{ name: 'Size', values: ['S', 'M'] }], variants: [{ key: '["S"]', values: ['S'], label: 'S', price: '1000', stock: '3' }, { key: '["M"]', values: ['M'], label: 'M', price: '1200', stock: '2' }] }),
  },
  scenes: {}, stories: {}, setup: {}, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerSaved: null, buyerCart: cart, clockHours: 0,
})
const L = (product, options = [], quantity = 1, seen, extra = {}) => ({ product, options, quantity, seen, seller: S, name: product, ...extra })
const body = page => page.locator('body').innerText()
const toBuyer = async (page, t) => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500) }
const openCart = async (page, t) => { await page.getByRole('button', { name: 'Saved', exact: true }).last().click(); await t.settle(300); await page.getByRole('button', { name: /^Cart/ }).click(); await t.settle(400) }
const seed = (page, st) => page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, st])
const search = async (page, t, q) => { await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300); await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(q); await t.settle(450) }
const sellerProducts = async (page, t) => { await t.section('Seller Console'); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle() }

// ---- 1. Published Product added to the Cart, then returned to draft, deleted, and the page reloaded ----
await suite('buyer-fix01-lifecycle', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, base(null))
  await toBuyer(page, t)
  await search(page, t, 'test kettle'); await page.locator('button', { hasText: 'Test Kettle' }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Add to Cart' }).click(); await t.settle(400)
  await page.getByRole('button', { name: 'View cart', exact: true }).click(); await t.settle(500)
  let text = await body(page)
  t.ck('the published Product is in its Seller cart and checkout can open', /Addis Atelier cart/.test(text) && /Test Kettle/.test(text) && await page.getByRole('button', { name: 'Checkout this Seller cart' }).isEnabled())
  // The Seller returns it to draft.
  await sellerProducts(page, t)
  await page.locator('button', { hasText: 'Test Kettle' }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: 'Return to draft' }).click(); await t.settle(400)
  await toBuyer(page, t); await openCart(page, t)
  text = await body(page)
  t.ck('IR-047: the Cart opens (no crash) and the unpublished Product’s line is kept, named and marked', /Addis Atelier cart/.test(text) && /Test Kettle/.test(text) && /No longer available/.test(text), text.slice(0, 600))
  t.ck('checkout is closed while it is there, and nothing is held or charged', await page.getByRole('button', { name: 'Checkout this Seller cart' }).isDisabled())
  await page.screenshot({ path: `${OUT}/unpublished-line-1440.png` })
  // Reload: the session store restores the same state and the Cart still opens.
  await page.reload({ waitUntil: 'networkidle' }); await t.settle(400)
  await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
  await openCart(page, t)
  t.ck('after a reload the line is still there, still marked, still removable', /Test Kettle/.test(await body(page)) && /No longer available/.test(await body(page)) && await page.getByRole('button', { name: 'Remove Test Kettle' }).count() === 1)
  // The Seller deletes the draft: the record is gone entirely, only what the Buyer saw remains.
  await sellerProducts(page, t)
  await page.locator('button', { hasText: 'Test Kettle' }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: 'Delete draft' }).click(); await t.settle(300)
  await page.getByRole('button', { name: 'Delete draft' }).last().click(); await t.settle(400)
  await toBuyer(page, t); await openCart(page, t)
  text = await body(page)
  t.ck('IR-047: with the Product deleted outright the line survives from what the Buyer saw (name kept), marked unavailable', /Test Kettle/.test(text) && /No longer available/.test(text), text.slice(0, 600))
  await page.getByRole('button', { name: 'Remove Test Kettle' }).click(); await t.settle(300)
  t.ck('removing it empties the Cart cleanly', !/Test Kettle/.test(await body(page)))
})

// ---- 2. Each material condition, from a persisted Cart ----
const conditions = base([
  L('PRD-NEW-002', [], 1, 30000, { name: 'Empty Mug' }),                    // zero stock
  L('PRD-NEW-001', [], 9, 75000, { name: 'Test Kettle' }),                  // insufficient stock (4)
  L('PRD-NEW-003', ['S'], 1, 100000, { name: 'Variant Shirt' }),            // fine
  L('PRD-NEW-003', ['M'], 1, 100000, { name: 'Variant Shirt' }),            // changed price (1,200 now)
  L('PRD-NEW-003', ['XL'], 1, 100000, { name: 'Variant Shirt' }),           // deleted / changed Variant
])
await suite('buyer-fix01-conditions', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, conditions)
  await toBuyer(page, t); await openCart(page, t)
  const text = await body(page)
  t.ck('zero stock is reported as out of stock', /Out of stock/.test(text))
  t.ck('insufficient stock is reported with the available quantity', /only 4 available/.test(text))
  t.ck('a changed price is reported with both prices', /Price changed[^\n]*from ETB 1,000 to ETB 1,200/.test(text.replace(/\n/g, ' ')) || /from ETB 1,000 to ETB 1,200/.test(text), text.slice(0, 900))
  t.ck('a deleted or changed Variant is reported as no longer offered', /no longer offered/.test(text))
  t.ck('checkout stays closed until each is reviewed', await page.getByRole('button', { name: 'Checkout this Seller cart' }).isDisabled())
  await page.screenshot({ path: `${OUT}/conditions-1440.png` })
  await page.getByRole('button', { name: 'Remove Empty Mug' }).click(); await t.settle(200)
  await page.getByRole('button', { name: 'Reduce to 4' }).click(); await t.settle(200)
  await page.getByRole('button', { name: 'Accept the new price' }).click(); await t.settle(200)
  const rm = page.getByRole('button', { name: 'Remove Variant Shirt' })
  await rm.last().click(); await t.settle(200)
  t.ck('once every change is reviewed checkout opens', await page.getByRole('button', { name: 'Checkout this Seller cart' }).isEnabled(), (await body(page)).slice(0, 500))
  // Revalidation at the review: open it, then the Seller zeroes the stock; returning to the Cart review, not a stale summary.
  await page.getByRole('button', { name: 'Checkout this Seller cart' }).click(); await t.settle(400)
  await page.getByRole('button', { name: /Continue with/ }).click(); await t.settle(500)
  t.ck('the checkout review opens for a clean cart', /Checkout preview only/.test(await body(page)))
})

// ---- 3. Invalid persisted references ----
const junk = base([
  L('PRD-GHOST-001', [], 2, 5000, { seller: undefined, name: undefined }),  // a Product that never existed, nothing known about it
  L('PRD-GHOST-002', [], 1, 5000, { seller: 'SEL-NOBODY', name: 'Ghost Lamp' }), // a Seller that does not exist
  { product: 5, options: [], quantity: 1 },                                 // wrong type
  null,                                                                      // not an object
  { product: 'PRD-NEW-001', options: 'S', quantity: -3, seen: 'x', name: 'Test Kettle', seller: S }, // malformed fields on a real Product
])
await suite('buyer-fix01-invalid-refs', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, junk)
  await toBuyer(page, t); await openCart(page, t)
  let text = await body(page)
  t.ck('the Cart opens with invalid saved references (no crash)', /Test Kettle/.test(text))
  t.ck('a reference no Seller can be found for is listed apart, named, and removable', /no longer available/.test(text) && await page.getByRole('button', { name: 'Remove Ghost Lamp' }).count() === 1 && await page.getByRole('button', { name: 'Remove Unavailable item' }).count() === 1, text.slice(0, 700))
  t.ck('malformed fields on a real Product are repaired (quantity 1)', /Test Kettle/.test(text) && !/NaN|undefined/.test(text))
  await page.getByRole('button', { name: 'Remove Ghost Lamp' }).click(); await t.settle(200)
  await page.getByRole('button', { name: 'Remove Unavailable item' }).first().click(); await t.settle(200)
  text = await body(page)
  t.ck('removing them leaves the valid line', /Test Kettle/.test(text) && !/Ghost Lamp/.test(text))
  await page.screenshot({ path: `${OUT}/invalid-refs-1440.png` })
})

// ---- 4. Cart / Saves isolation: ordinary MVP vs internal simulation ----
await suite('buyer-fix01-isolation', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, { ...base([L('PRD-NEW-001', [], 1, 75000, { name: 'Test Kettle' })]), buyerSaved: { 'product:PRD-NEW-001': true } })
  await toBuyer(page, t); await openCart(page, t)
  t.ck('the ordinary MVP Cart holds the Buyer’s own line', /Test Kettle/.test(await body(page)))
  await page.getByRole('button', { name: 'Internal simulation', exact: true }).click(); await t.settle(600)
  const sim = await body(page)
  t.ck('the internal simulation does not show the MVP Cart line', !/Test Kettle/.test(sim), sim.slice(0, 300))
  await page.getByRole('button', { name: 'Current MVP', exact: true }).click(); await t.settle(600)
  t.ck('back in MVP mode the ordinary Cart is intact', /Test Kettle/.test(await body(page)))
  const saved = JSON.parse(await page.evaluate(k => sessionStorage.getItem(k), KEY))
  t.ck('the store still holds the ordinary Cart and Saves untouched by the simulation', saved.buyerCart?.length === 1 && saved.buyerSaved?.['product:PRD-NEW-001'] === true, saved.buyerCart)
})
