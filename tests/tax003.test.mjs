// TAX-003: taxonomy reaches Buyer Search and Product details, the Storefront, the Companion and the Operator review.
import { suite } from './harness.mjs'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const png = join(mkdtempSync(join(tmpdir(), 'tx3-')), 'fixture.png')
writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'))

await suite('tax003', { width: 1440, height: 900 }, async (page, t) => {
  const content = () => page.locator('.seller-console-content').innerText()
  const phone = () => page.locator('.phone-stage').innerText()
  const pick = async (label, text) => { await page.getByLabel(label, { exact: true }).selectOption({ label: text }); await t.settle(500) }
  const create = async (name, steps) => {
    await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle(450)
    const back = page.getByRole('button', { name: /Back to Products/ }); if (await back.count()) { await back.click(); await t.settle(300) }
    await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
    await page.getByLabel('Product name').fill(name)
    await steps()
    await page.locator('input[type=file]').setInputFiles(png); await t.settle(700)
    await page.getByLabel('Price (ETB)').fill('900'); await page.getByLabel('Available quantity').fill('4')
    await page.getByRole('button', { name: 'Publish Product' }).click(); await t.settle()
    t.ck(`${name} published`, /Published \(simulated\)/.test(await content()), (await content()).slice(0, 300))
  }
  await t.open(); await t.section('Seller Console')
  await create('Charm Test Bracelet', async () => {
    await pick('Category', 'Fashion'); await pick('Subcategory', 'Jewellery'); await pick('Type', 'Charms & Beads')
    const field = page.getByLabel('Charm & Bead Type', { exact: true })
    await field.selectOption({ index: 1 }); await t.settle(200)
  })
  await create('Lip Colour Test', async () => { await pick('Category', 'Cosmetics'); await pick('Subcategory', 'Makeup') })

  // Buyer: Search matches the taxonomy path, and Product details show it (with an incomplete state where nothing was submitted).
  await t.section('Mobile — Buyer'); const g = page.getByRole('button', { name: 'Explore as guest' }); if (await g.count()) { await g.click(); await t.settle(500) }
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('charms & beads'); await t.settle(400)
  t.ck('Search finds the Product by its taxonomy path', /Charm Test Bracelet/.test(await phone()) && /Fashion › Jewellery › Charms & Beads/.test(await phone()), (await phone()).slice(100, 500))
  await page.locator('button', { hasText: /Charm Test Bracelet/ }).first().click(); await t.settle(500)
  let body = await phone()
  t.ck('Product details show the category path and chosen attribute', /Fashion › Jewellery › Charms & Beads/.test(body) && /Charm & Bead Type/.test(body) && !/not defined yet/.test(body), body.slice(100, 700))
  await page.getByRole('button', { name: 'Back' }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('lip colour'); await t.settle(400)
  await page.locator('button', { hasText: /Lip Colour Test/ }).first().click(); await t.settle(500)
  body = await phone()
  t.ck('Cosmetics (no definitions submitted): incomplete-definition state, navigation intact', /Cosmetics › Makeup/.test(body) && /not defined yet/.test(body), body.slice(100, 700))

  // Storefront and Companion.
  await t.section('Seller Storefront'); await page.getByRole('tab', { name: 'Products' }).click(); await t.settle(400)
  await page.getByRole('button', { name: /Charm Test Bracelet/ }).first().click(); await t.settle(400)
  t.ck('Storefront Product shows its category', /Charms & Beads/.test(await page.locator('body').innerText()))
  await t.section('Seller Companion'); await page.locator('nav').last().getByRole('button', { name: /Catalogue/ }).click(); await t.settle(400)
  t.ck('Companion Catalogue shows the taxonomy path', /Fashion › Jewellery › Charms & Beads/.test(await page.locator('body').innerText()))

  // Operator review.
  await t.section('Operator Console'); await page.getByRole('button', { name: /Taxonomy review/ }).first().click(); await t.settle(400)
  body = await page.locator('body').innerText()
  t.ck('Operator Taxonomy review: gaps, missing workbooks and the Product using one', /Missing workbook/.test(body) && /Lip Colour Test/.test(body) && /SUBMITTED, UNRATIFIED/i.test(body), body.slice(0, 300))
})
