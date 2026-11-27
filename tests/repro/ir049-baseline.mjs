// Reproduction of IR-049 and IR-049 against the reviewed baseline (run with the working tree stashed to 739f231; NOT part of `pnpm test`).
// Each reports what the baseline does with the same fixtures the new tests use.
import { suite } from '../harness.mjs'
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const p = (id, name, status = 'published') => ({ id, seller: S, status, name, description: 'd', category: 'fashion/womens-clothing/dresses', attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment: ['Buyer Collection', 'Seller Delivery', 'Courier Delivery'], locallyMade: false, updated: 1 })
const state = {
  products: { 'PRD-NEW-001': p('PRD-NEW-001', 'Test Kettle', 'draft'), 'PRD-NEW-002': p('PRD-NEW-002', 'Live Lamp') },
  scenes: {}, stories: {}, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerSaved: null, clockHours: 0,
  setup: { [S]: { storeName: 'Addis Atelier', handle: '@addisatelier', about: '', contactPhone: '', ownerName: '', coverage: ['Addis Ababa'], collection: { on: true, place: 'Bole' }, sellerDelivery: { on: false, fee: '' }, courier: false, blank: false } },
  buyerCart: null,
}
const body = page => page.locator('body').innerText()
await suite('repro-baseline', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, state])
  await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('live lamp'); await t.settle(450)
  await page.locator('button', { hasText: 'Live Lamp' }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Add to Cart' }).click(); await t.settle(400)
  await page.getByRole('button', { name: 'View cart', exact: true }).click(); await t.settle(600)
  await page.getByRole('button', { name: 'Checkout this Seller cart' }).click(); await t.settle(400)
  await page.getByRole('button', { name: /Continue with/ }).click(); await t.settle(500)
  const text = await body(page)
  console.log('CHECKOUT-TEXT', JSON.stringify(text.slice(text.indexOf('Fulfilment'), text.indexOf('Fulfilment') + 420)))
  t.ck('IR-049 baseline: delivery was switched OFF in the Seller setup, yet checkout still offers Seller Delivery or Courier Delivery', /Seller Delivery|Courier Delivery/.test(text), text.slice(0, 200))
})
