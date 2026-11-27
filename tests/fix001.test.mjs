// FIX-001: a Seller's edits to a SEEDED Product and to the store identity reach Storefront, Companion and Buyer.
import { suite } from './harness.mjs'

const nav = async (page, t, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(450) }

await suite('fix001', { width: 1440, height: 900 }, async (page, t) => {
  await t.open(); await t.section('Seller Console')
  await nav(page, t, 'Products')
  await page.getByRole('button', { name: /Linen Overshirt/ }).first().click(); await t.settle(900)
  await page.getByLabel('Product name').fill('Linen Overshirt Reworked')
  await page.getByLabel('Price (ETB)').fill('2600')
  await page.getByLabel('Available quantity').fill('2')
  await page.getByRole('button', { name: 'Save changes' }).click(); await t.settle()
  await nav(page, t, 'Store setup')
  await page.getByLabel('Store name').fill('Atelier Renamed')
  await page.getByRole('button', { name: 'Save setup' }).click(); await t.settle()

  await t.section('Seller Storefront'); await page.getByRole('tab', { name: 'Products' }).click(); await t.settle(400)
  let body = await page.locator('body').innerText()
  t.ck('Storefront: renamed Product', /Linen Overshirt Reworked/.test(body))
  t.ck('Storefront: new price ETB 2,600', /ETB 2,600/.test(body))
  t.ck('Storefront: store name Atelier Renamed', /Atelier Renamed/.test(body))
  t.ck('Storefront: low stock shown for 2 left', /Low Stock/i.test(body))

  await t.section('Seller Companion'); await page.locator('nav').last().getByRole('button', { name: /Catalogue/ }).click(); await t.settle(400)
  body = await page.locator('body').innerText()
  t.ck('Companion Catalogue: renamed Product and price', /Linen Overshirt Reworked/.test(body) && /ETB 2,600/.test(body))

  await t.section('Mobile — Buyer'); const g = page.getByRole('button', { name: 'Explore as guest' }); if (await g.count()) { await g.click(); await t.settle(500) }
  await page.getByRole('button', { name: /Search/ }).first().click(); await t.settle(400)
  const box = page.getByPlaceholder(/Search/).or(page.getByRole('searchbox')).first(); await box.fill('shirt'); await box.press('Enter'); await t.settle(500)
  body = await page.locator('.phone-stage').innerText()
  t.ck('Buyer Search: renamed Product with new price, old name and price gone', /Linen Overshirt Reworked/.test(body) && /ETB 2,600/.test(body) && !/Linen Overshirt(?! Reworked)/.test(body) && !/ETB 2,450/.test(body), body.slice(150, 500))
  t.ck('Buyer Search: renamed store', /Atelier Renamed/.test(body) && !/Addis Atelier/.test(body), body.slice(150, 500))
  // Stock 0 on the seeded Product: it reads Out of Stock on the Storefront.
  await t.section('Seller Console'); await nav(page, t, 'Products')
  await page.getByRole('button', { name: /Linen Overshirt Reworked/ }).first().click(); await t.settle(900)
  await page.getByLabel('Available quantity').fill('0'); await page.getByRole('button', { name: 'Save changes' }).click(); await t.settle()
  await t.section('Seller Storefront'); await page.getByRole('tab', { name: 'Products' }).click(); await t.settle(400)
  t.ck('Storefront: Out of Stock after stock 0', /Out of Stock/i.test(await page.locator('body').innerText()))
})
