// DEMO-001/002 (marketplace dataset is the default): the app boots with no page errors, every one of the 12 sections opens, the Seller Console lists
// all 23 Sellers, the public Buyer and Storefront show only ACTIVE Sellers' published records, DS-11 (draft) and DS-23 (suspended) are absent from the
// public surfaces but inspectable in the Seller Console and the Operator, no legacy Seller leaks into an ordinary surface, and `?dataset=legacy` is the old app.
// Runs against the marketplace dataset (tests/suites.json marks it); the earlier suites run against ?dataset=legacy.
import { suite, DATASET } from './harness.mjs'
import { readFileSync } from 'node:fs'

const cat = JSON.parse(readFileSync(new URL('../src/marketplace/data/catalogue.json', import.meta.url), 'utf8'))
const LEGACY = /Addis Atelier|Nura Glow|Volt House|Nile Loom/
const active = new Set(cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id))
const publicNames = new Set(cat.products.filter(p => active.has(p.seller_id) && p.publication === 'PUBLISHED').map(p => p.name))
// Names that exist ONLY on non-public records (DS-23's Products and the draft Products): they must never be found by a Buyer.
const hiddenOnly = cat.products.filter(p => (!active.has(p.seller_id) || p.publication === 'DRAFT') && !publicNames.has(p.name)).map(p => p.name)
const main = page => page.locator('main.app-main').innerText()
const SECTIONS = ['00 Prototype Guide', '01 Foundations', '02 Components', '03 Company Website', '04 Seller Storefront', '05 Mobile — Buyer', '06 Mobile — Seller Companion', '07 Mobile — Courier', '08 Seller Console', '09 Operator Console', '10 ADULIS MASTER DEMO', '11 System States']

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('marketplace-boot', viewport, async (page, t) => {
    const desktop = viewport.width > 640
    t.ck('this suite runs on the marketplace dataset', DATASET === 'marketplace', DATASET)
    await t.open()
    t.ck('the default boot is the marketplace dataset (no ?dataset=legacy in the address)', !page.url().includes('dataset=legacy'))
    const sections = await page.locator('nav[aria-label="Prototype sections"] button').evaluateAll(b => b.map(x => x.getAttribute('aria-label')))
    t.eq('the shell offers all 12 sections', sections.length, 12)
    t.ck('the default section is the Master Demo and it offers no historical flow, only a labelled pointer to ?dataset=legacy', await (async () => {
      const text = await main(page)
      return /dataset=legacy/.test(text) && /not offered on this dataset/i.test(text) && (await page.getByRole('button', { name: 'Start master demo' }).count()) === 0 && !LEGACY.test(text)
    })())
    t.ck('the marketplace dataset has its own Seller-workspace session key', await page.evaluate(() => Object.keys(sessionStorage).includes('adulis.seller-workspace.v1:marketplace') && !Object.keys(sessionStorage).includes('adulis.seller-workspace.v1')))

    // Every section opens without an error, and the ordinary surfaces name no legacy Seller.
    for (const label of SECTIONS) {
      await t.section(label); await t.settle(400)
      const text = await main(page)
      t.ck(`${label} renders`, text.trim().length > 50, text.length)
      if (/^0[3-6]|^08/.test(label)) t.ck(`${label} names no legacy Seller`, !LEGACY.test(text), text.match(LEGACY)?.[0])
      // DEMO-002: the Operator Console and System States read the marketplace dataset now, so the historical-fixture note is gone and no historical identity may appear.
      if (/^09|^11/.test(label)) t.ck(`${label} reads the marketplace dataset: no historical-fixture note, no legacy Seller`, !/MARKETPLACE DATASET/.test(text) && !LEGACY.test(text))
    }

    // Public Storefront: ACTIVE Sellers only.
    await t.section('04 Seller Storefront'); await t.settle(400)
    const sellerNames = new Set(cat.sellers.map(s => s.name))
    const picker = (await page.locator('.storefront-toolbar button').allInnerTexts()).map(x => x.trim()).filter(x => sellerNames.has(x))
    t.eq('the Storefront switcher lists the 21 ACTIVE Sellers', picker.length, 21)
    t.ck('the Storefront lists neither the draft (First Fold Studio) nor the suspended (Echo Wardrobe) Seller', !picker.includes('First Fold Studio') && !picker.includes('Echo Wardrobe'), picker)

    // Public Buyer: For You and Search.
    await t.section('05 Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500)
    const feed = await main(page)
    t.ck('For You shows ACTIVE Sellers\' Scenes (Aster & Thread first)', /Aster & Thread/.test(feed) && /Monday capsule/.test(feed))
    t.ck('For You shows no legacy, draft or suspended Seller', !LEGACY.test(feed) && !/First Fold Studio|Echo Wardrobe/.test(feed))
    await page.getByRole('button', { name: 'Shop' }).first().click(); await t.settle(400)
    const search = page.locator('input[type=search]').first()
    const find = async q => { await search.fill(q); await t.settle(450); return main(page) }
    for (const name of ['Olive linen midi dress', 'Small gold-tone hoops'].filter(n => publicNames.has(n))) t.ck(`Search finds the published Product "${name}"`, (await find(name)).includes(name))
    for (const name of hiddenOnly.slice(0, 5)) t.ck(`Search never finds the non-public Product "${name}"`, /No results for/.test(await find(name)))
    t.ck('a legacy Seller or Product is not searchable', /No results for/.test(await find('Atelier')) && /No results for/.test(await find('Volt')) && /No results for/.test(await find('Nura')))
    t.ck('the zero-result example really has no result', /No results for/.test(await find('harp')))

    // Marketplace facts through the Buyer: discount, exact Variants, Variant stock, taxonomy, Seller fulfilment.
    await search.fill(''); await t.settle(200)
    await page.getByRole('button', { name: 'Home' }).first().click(); await t.settle(400)
    await page.getByRole('button', { name: 'Explore the Scene: Monday capsule, by Aster & Thread' }).click(); await t.settle(500)
    t.ck('the Scene explorer is an explicit photo-pending placeholder with its tagged Products listed (no invented hotspot)', await (async () => {
      const text = await main(page)
      return /Photo pending/.test(text) && /Olive linen midi dress/.test(text) && /Sand tailored blazer/.test(text) && (await page.locator('button[aria-pressed]').filter({ hasText: /^\d$/ }).count()) === 0
    })())
    await page.getByRole('button', { name: /^Olive linen midi dress, ETB 1,960/ }).click(); await t.settle(300)
    await page.getByRole('button', { name: 'View Product' }).click(); await t.settle(500)
    let product = await main(page)
    t.ck('Product page: discounted price, regular price struck beside it, Variants and category from the source', /ETB 1,960/.test(product) && /ETB 2,450/.test(product) && /−20%/.test(product) && /S \/ Olive/.test(product) && /Women’s Clothing › Dresses|Fashion › Women’s Clothing › Dresses/.test(product), product.slice(0, 400))
    t.ck('Product page: fulfilment is the Seller\'s own (collection free, Seller Delivery with the fee not set: the ETB 80 is a simulated-Order charge, DEMO-003), no Courier fee', /Buyer Collection \(free\)/.test(product) && /Seller Delivery \(fee not set\)/.test(product) && !/ETB 80/.test(product) && !/Courier Delivery/.test(product))
    t.ck('Product page: no invented description or rating (Seller Service shows no simulation rating)', /Description\s*—/.test(product) && !/4\.25/.test(product))
    await page.getByRole('button', { name: 'M / Olive' }).click(); await t.settle(250)
    t.ck('the exact Variant with zero stock is reported out of stock', /out of stock/i.test(await main(page)))
    await page.getByRole('button', { name: 'S / Olive' }).click(); await page.getByRole('button', { name: 'Add to Cart' }).click(); await t.settle(500)
    await page.getByRole('button', { name: 'View cart' }).click(); await t.settle(500)
    t.ck('the Cart holds the exact Variant at the Variant\'s price from the Seller\'s own cart', await (async () => { const c = await main(page); return /Aster & Thread/.test(c) && /ETB 1,960/.test(c) && /S \/ Olive/.test(c) })())

    // Seller Console and Operator inspect everything, including the draft and suspended Sellers.
    if (desktop) {
      await t.section('08 Seller Console'); await t.settle(400)
      await page.getByRole('button', { name: /Switch Seller/ }).click(); await t.settle(300)
      const names = await page.getByRole('menuitemradio').allInnerTexts()
      t.eq('the Seller Console lists all 23 Sellers', names.length, 23)
      t.ck('the Seller Console lists the draft and the suspended Seller', names.some(n => n.includes('First Fold Studio')) && names.some(n => n.includes('Echo Wardrobe')))
      await page.getByRole('menuitemradio', { name: /Echo Wardrobe/ }).click(); await t.settle(500)
      t.ck('the suspended Seller is inspectable internally (its Console opens on its own name)', /Echo Wardrobe/.test(await main(page)))
      await t.section('09 Operator Console'); await t.settle(400)
      await page.getByRole('button', { name: 'Seller Search' }).first().click(); await t.settle(400)
      const box = page.locator('input[placeholder^="Search name"]').first()
      for (const name of ['First Fold Studio', 'Echo Wardrobe']) { await box.fill(name.split(' ')[0]); await t.settle(400); t.ck(`the Operator finds ${name}`, (await main(page)).includes(name)) }
    }
  })
}

// `?dataset=legacy` boots exactly the old seeded app.
await suite('marketplace-boot', { width: 1440, height: 900 }, async (page, t) => {
  await t.open('?dataset=legacy')
  t.ck('legacy keeps its 10:25 story clock and the Master Demo flows', /Start master demo/.test(await main(page)))
  await t.section('08 Seller Console'); await t.settle(400)
  const text = await main(page)
  t.ck('legacy Seller Console is Addis Atelier', /Addis Atelier/.test(text) && !/Aster & Thread/.test(text))
  await page.getByRole('button', { name: /Switch Seller/ }).click(); await t.settle(300)
  t.eq('legacy lists its three showcase Sellers', await page.getByRole('menuitemradio').count(), 3)
  t.ck('legacy uses its own workspace key', await page.evaluate(() => Object.keys(sessionStorage).includes('adulis.seller-workspace.v1')))
})
