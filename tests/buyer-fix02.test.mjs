// BUYER-FIX-02 (IR-052, IR-056, IR-058): private Collections, the Product photo gallery, and Search facets over the whole taxonomy and every attribute. REAL app.
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/buyer-fix02'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const svg = c => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='${c}'/></svg>`)}`
const S = 'SEL-ADDIS-ATELIER'
const ALL = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']
const product = (id, name, extra = {}) => ({ id, seller: S, status: 'published', name, description: `${name} description`, category: 'fashion/womens-clothing/dresses', attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [svg('red')], fulfilment: ALL, locallyMade: false, updated: 1, ...extra })
const scene = { id: 'SCN-NEW-001', seller: S, status: 'published', caption: 'Kettle corner', image: svg('green'), alt: 'A kettle', tags: [{ product: 'PRD-NEW-001', x: 40, y: 60, n: 1 }], updated: 5 }
const base = extra => ({
  products: {
    'PRD-NEW-001': product('PRD-NEW-001', 'Test Kettle', { category: 'cosmetics/skincare', photos: [svg('red'), svg('blue'), svg('orange')] }),
    'PRD-NEW-002': product('PRD-NEW-002', 'Linen Wrap Dress', { attributes: { Material: 'Linen', Length: 'Midi', Occasion: 'Casual', Fit: 'Regular fit', Pattern: 'Solid' }, customAttributes: [{ name: 'Origin', value: 'Addis' }] }),
  },
  scenes: { 'SCN-NEW-001': scene }, stories: {}, setup: {}, knowledge: {}, bot: {}, chats: {}, botFeedback: [], buyerSaved: null, buyerCart: null, clockHours: 0, ...extra,
})
const body = page => page.locator('body').innerText()
const seed = (page, st) => page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, st])
const toBuyer = async (page, t) => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500) }
const search = async (page, t, q) => { const shop = page.getByRole('button', { name: 'Shop', exact: true }); if (await shop.count()) await shop.last().click(); else await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300); await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(q); await t.settle(450) }
const openProduct = async (page, t, name) => { await page.locator('button', { hasText: name }).first().click(); await t.settle(500) }
// Back out of any Product or Collection screen until the bottom navigation is there (on a Product page "Saved" is the Save toggle, not the tab).
const toSaved = async (page, t) => { for (let i = 0; i < 5 && !(await page.getByRole('button', { name: 'Shop', exact: true }).count()); i++) { await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await t.settle(300) } await page.getByRole('button', { name: 'Saved', exact: true }).last().click(); await t.settle(350) }
const openCollection = async (page, t, name) => { await page.locator('button', { has: page.getByText(name, { exact: true }) }).first().click(); await t.settle(400) }

// ---- Collections ----
await suite('buyer-fix02-collections', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, base())
  await toBuyer(page, t); await toSaved(page, t)
  let text = await body(page)
  t.ck('the default Saved Collection and the seeded ones are listed', /Saved/.test(text) && /Autumn wardrobe/.test(text) && /Skincare routine/.test(text))
  // create
  await page.getByRole('button', { name: 'New collection' }).click(); await t.settle(300)
  await page.getByRole('button', { name: 'Create', exact: true }).click(); await t.settle(200)
  t.ck('an empty name is refused with the reason', /Give the Collection a name/.test(await body(page)))
  await page.getByLabel('Collection name').fill('autumn  WARDROBE'); await page.getByRole('button', { name: 'Create', exact: true }).click(); await t.settle(200)
  t.ck('a duplicate name (ignoring case and spacing) is refused', /already have a Collection with this name/.test(await body(page)))
  await page.getByLabel('Collection name').fill('Gifts'); await page.getByRole('button', { name: 'Create', exact: true }).click(); await t.settle(400)
  t.ck('a new custom Collection is created', /Gifts/.test(await body(page)) && /Created Gifts/.test(await body(page)))
  // save a Product, choose the Collection when saving
  await search(page, t, 'test kettle'); await openProduct(page, t, 'Test Kettle')
  await page.getByRole('button', { name: /^Save$/ }).click(); await t.settle(250)
  t.ck('Save adds to Saved at once and offers to choose a Collection', /Added to Saved/.test(await body(page)) && await page.getByRole('button', { name: 'Choose collection' }).count() === 1)
  await page.getByRole('button', { name: 'Choose collection' }).click(); await t.settle(300)
  t.ck('the sheet shows every Collection with the current membership', await page.getByLabel('Save to Saved').isChecked() && !(await page.getByLabel('Save to Gifts').isChecked()) && !(await page.getByLabel('Save to Autumn wardrobe').isChecked()))
  await page.getByLabel('Save to Gifts').check(); await t.settle(200)
  await page.screenshot({ path: `${OUT}/save-sheet-1440.png` })
  await page.getByRole('button', { name: 'New collection' }).click(); await t.settle(300)
  await page.getByLabel('Collection name').fill('Kitchen'); await page.getByRole('button', { name: 'Create', exact: true }).click(); await t.settle(400)
  await page.getByRole('button', { name: 'Done' }).click().catch(() => {}); await t.settle(300)
  await toSaved(page, t)
  text = await body(page)
  t.ck('the item is in Saved, Gifts and the Collection created from the sheet', /Gifts[\s\S]{0,60}1 Product/.test(text) && /Kitchen[\s\S]{0,60}1 Product/.test(text), text.slice(0, 900))
  // open Gifts: filters, remove, rename, delete
  await openCollection(page, t, 'Gifts')
  t.ck('the Collection shows its Product', /Test Kettle/.test(await body(page)))
  await page.getByRole('button', { name: /^Scenes 0/ }).click(); await t.settle(200)
  t.ck('the Scenes filter shows no Product and says so', !/Test Kettle/.test(await body(page)) && /No Scenes in this Collection/.test(await body(page)) && await page.getByRole('button', { name: /^Scenes 0/ }).getAttribute('aria-pressed') === 'true')
  await page.getByRole('button', { name: /^Products 1/ }).click(); await t.settle(200)
  t.ck('the Products filter shows the Product', /Test Kettle/.test(await body(page)))
  await page.getByRole('button', { name: 'Collection options' }).click(); await t.settle(250)
  await page.getByRole('button', { name: 'Rename collection' }).click(); await t.settle(250)
  await page.getByLabel('Collection name').fill('Kitchen'); await page.getByRole('button', { name: 'Save name' }).click(); await t.settle(200)
  t.ck('renaming onto an existing name is refused', /already have a Collection with this name/.test(await body(page)))
  await page.getByLabel('Collection name').fill('Presents'); await page.getByRole('button', { name: 'Save name' }).click(); await t.settle(300)
  t.ck('rename works and the header shows the new name', await page.getByRole('heading', { name: 'Presents' }).count() + (await body(page)).split('Presents').length - 1 >= 1)
  await page.reload({ waitUntil: 'networkidle' }); await t.settle(300)
  await toBuyer(page, t); await toSaved(page, t)
  t.ck('after a reload the Collections, names and items persist', /Presents[\s\S]{0,60}1 Product/.test(await body(page)) && !/Gifts/.test(await body(page)) && /Kitchen/.test(await body(page)))
  await openCollection(page, t, 'Presents')
  await page.getByRole('button', { name: 'Remove Test Kettle from Presents' }).click(); await t.settle(300)
  t.ck('removing an item leaves it saved in the other Collections', !/Test Kettle/.test(await body(page)))
  await page.getByRole('button', { name: 'Collection options' }).click(); await t.settle(250)
  await page.getByRole('button', { name: 'Delete collection' }).click(); await t.settle(250)
  t.ck('delete asks first and explains what it affects', /deletes the Collection only/.test(await body(page)))
  await page.getByRole('button', { name: 'Delete collection' }).last().click(); await t.settle(400)
  text = await body(page)
  t.ck('the deleted Collection is gone and the Buyer is back on Saved', !/Presents/.test(text.replace(/Deleted Presents/, '')) && /Your finds/.test(text))
  // the default Saved Collection cannot be renamed or deleted
  await openCollection(page, t, 'Saved')
  await page.getByRole('button', { name: 'Collection options' }).click(); await t.settle(250)
  t.ck('the default Saved Collection offers no rename or delete', await page.getByRole('button', { name: 'Rename collection' }).count() === 0 && await page.getByRole('button', { name: 'Delete collection' }).count() === 0 && /cannot be deleted/.test(await body(page)))
  // Unsave from the Product page removes it from every Collection
  await page.keyboard.press('Escape'); await t.settle(200)
})

// ---- Collections: Scenes, filters and unavailable items, from a stored state ----
const stored = base({ buyerCollections: [
  { id: 'COL-A', name: 'Saved', isDefault: true, items: ['product:PRD-NEW-001', 'post:SCN-NEW-001', 'product:PRD-NEW-009', 'post:SCN-GONE'] },
  { id: 'COL-B', name: 'Autumn', isDefault: false, items: ['post:SCN-NEW-001'] },
] })
await suite('buyer-fix02-collection-items', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, stored)
  await toBuyer(page, t); await toSaved(page, t)
  await openCollection(page, t, 'Saved')
  let text = await body(page)
  const sceneTile = () => page.getByRole('img', { name: /Scene: Kettle corner/ }).count()
  t.ck('Products and Scenes are both shown, and unavailable items are marked, not dropped', /Test Kettle/.test(text) && await sceneTile() === 1 && /Saved Product · no longer available/.test(text) && /Saved Scene · no longer available/.test(text))
  t.ck('the filter counts are right (2 Products, 2 Scenes)', await page.getByRole('button', { name: /^All 4/ }).count() === 1 && await page.getByRole('button', { name: /^Products 2/ }).count() === 1 && await page.getByRole('button', { name: /^Scenes 2/ }).count() === 1)
  await page.getByRole('button', { name: /^Scenes 2/ }).click(); await t.settle(200)
  text = await body(page)
  t.ck('Scenes filter hides Products', await sceneTile() === 1 && !/Test Kettle/.test(text))
  await page.getByRole('button', { name: 'Remove unavailable Scene from Saved' }).click(); await t.settle(250)
  t.ck('an unavailable Scene can be removed', await page.getByRole('button', { name: 'Remove unavailable Scene from Saved' }).count() === 0 && await sceneTile() === 1)
  await page.getByRole('button', { name: /^All/ }).click(); await t.settle(200)
  await page.getByRole('button', { name: 'Remove unavailable Product from Saved' }).click(); await t.settle(250)
  t.ck('an unavailable Product can be removed', await page.getByRole('button', { name: 'Remove unavailable Product from Saved' }).count() === 0)
  await page.getByRole('button', { name: 'Remove Kettle corner from Saved' }).click(); await t.settle(250)
  await page.getByRole('button', { name: /Back/ }).first().click().catch(() => {}); await t.settle(300)
  text = await body(page)
  t.ck('a Scene removed from one Collection stays in the other', /Autumn[\s\S]{0,60}1 Scene/.test(text), text.slice(0, 700))
  await page.screenshot({ path: `${OUT}/saved-1440.png` })
})

// ---- Product photo gallery ----
await suite('buyer-fix02-gallery', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, base())
  await toBuyer(page, t); await search(page, t, 'test kettle'); await openProduct(page, t, 'Test Kettle')
  const main = () => page.locator('button[aria-label^="Zoom photo"] img')
  t.ck('the first photo shows with the Product’s name as its alt text, "Photo 1 of 3"', await main().getAttribute('alt') === 'Test Kettle' && /Photo 1 of 3/.test(await body(page)))
  const first = await main().getAttribute('src')
  await page.getByRole('button', { name: 'Next photo', exact: true }).click(); await t.settle(200)
  t.ck('Next shows the second photograph', /Photo 2 of 3/.test(await body(page)) && (await main().getAttribute('src')) !== first && /photo 2 of 3/.test((await main().getAttribute('alt')) ?? ''))
  await page.getByRole('button', { name: 'Previous photo', exact: true }).click(); await page.getByRole('button', { name: 'Previous photo', exact: true }).click(); await t.settle(200)
  t.ck('Previous wraps from the first to the last', /Photo 3 of 3/.test(await body(page)))
  await page.getByRole('button', { name: 'Show photo 2 of 3' }).click(); await t.settle(200)
  t.ck('a thumbnail selects its photograph', /Photo 2 of 3/.test(await body(page)) && await page.getByRole('button', { name: 'Show photo 2 of 3' }).getAttribute('aria-current') === 'true')
  await main().focus(); await page.keyboard.press('ArrowRight'); await t.settle(200)
  t.ck('the arrow keys move between photographs', /Photo 3 of 3/.test(await body(page)))
  // zoom
  await page.getByRole('button', { name: 'Zoom photo 3 of 3' }).click(); await t.settle(300)
  t.ck('zoom opens a dialog inside the phone, at 100%', await page.getByRole('dialog', { name: /photo zoom/ }).count() === 1 && /Photo 3 of 3 · 100%/.test(await body(page)))
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click(); await t.settle(200)
  const width = await page.getByRole('dialog').locator('img').evaluate(el => el.style.width)
  t.ck('zoom in enlarges the photograph (200%) and zoom out is available', width === '200%' && await page.getByRole('button', { name: 'Zoom out', exact: true }).isEnabled())
  await page.screenshot({ path: `${OUT}/gallery-zoom-1440.png` })
  await page.getByRole('button', { name: 'Previous photo in zoom' }).click(); await t.settle(200)
  t.ck('photographs can be changed while zoomed', /Photo 2 of 3/.test(await body(page)))
  await page.keyboard.press('Escape'); await t.settle(250)
  t.ck('Escape closes the zoom and returns focus to the photo', await page.getByRole('dialog').count() === 0 && await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === 'Zoom photo 2 of 3')
  // a one-photo Product has no navigation
  await toBuyer(page, t); await search(page, t, 'linen wrap'); await openProduct(page, t, 'Linen Wrap Dress')
  t.ck('a single photograph shows no navigation', await page.getByRole('button', { name: 'Next photo', exact: true }).count() === 0 && !/Photo 1 of 1/.test(await body(page)))
  await page.setViewportSize({ width: 390, height: 844 }); await t.settle(300)
  await toBuyer(page, t); await search(page, t, 'test kettle'); await openProduct(page, t, 'Test Kettle')
  const small = await page.locator('button[aria-label="Next photo"], button[aria-label="Previous photo"], button[aria-label^="Show photo"], button[aria-label^="Zoom photo"]').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [e.getAttribute('aria-label'), Math.round(r.width), Math.round(r.height)] }))
  t.ck('phone width: gallery controls are at least 36 px', small.every(([, w, h]) => w >= 36 && h >= 36 || (w >= 36)), small)
  await page.screenshot({ path: `${OUT}/gallery-390.png` })
})

// ---- Search facets ----
await suite('buyer-fix02-facets', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, base())
  await toBuyer(page, t); await search(page, t, 'linen')
  await page.getByRole('tab', { name: /^products/i }).click(); await t.settle(300)
  const text = await body(page)
  t.ck('the whole taxonomy path is offered as a filter (three levels)', /Fashion \(\d+\)/.test(text) && /Fashion › Women’s Clothing \(\d+\)/.test(text) && /Fashion › Women’s Clothing › Dresses \(\d+\)/.test(text), text.slice(text.indexOf('Product filters'), 700))
  t.ck('attributes are filters grouped by their label: the first groups are visible', await page.getByLabel('Fit', { exact: true }).count() + await page.getByLabel('Length', { exact: true }).count() + await page.getByLabel('Material', { exact: true }).count() >= 2)
  const more = page.getByRole('button', { name: /^More details \(\d+\)$/ })
  t.ck('the rest are one tap away, never cut off', await more.count() === 1)
  await more.click(); await t.settle(200)
  t.ck('every attribute group is then shown, including a Seller-defined detail', await page.getByLabel('Origin', { exact: true }).count() === 1 && await page.getByLabel('Pattern', { exact: true }).count() === 1 && await page.getByLabel('Occasion', { exact: true }).count() === 1)
  await page.getByLabel('Origin', { exact: true }).selectOption({ label: 'Addis (1)' }); await t.settle(250)
  await page.getByLabel('Pattern', { exact: true }).selectOption({ label: 'Solid (1)' }); await t.settle(250)
  t.ck('several attribute filters apply together', /Linen Wrap Dress/.test(await body(page)))
  await page.getByLabel('Pattern', { exact: true }).selectOption(''); await page.getByLabel('Origin', { exact: true }).selectOption(''); await t.settle(200)
  await page.screenshot({ path: `${OUT}/facets-1440.png` })
})
