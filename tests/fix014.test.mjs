// FIX-014 (FR-003), marketplace dataset (tests/suites.json marks it): Seller Console Settings.
// 1. Responsive master-detail: at 390 and 820 px choosing a setting reveals its detail at once, with a Back control; at 1440 px both columns show and the chosen
//    setting is highlighted. No state where the user chooses and nothing visible changes.
// 2. Store profile reads the Seller's EFFECTIVE configuration (src/fulfilment.ts: methods, charge or "Fee not set", collection place and hours, coverage),
//    for full-delivery, collection-only, delivery-only, multi-city and not-configured Sellers, and follows the Seller's own Store setup once saved.
import { suite, DATASET } from './harness.mjs'
import { mkdirSync } from 'node:fs'
import { cat, sellerName } from './sim-helpers.mjs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/fix014'
mkdirSync(OUT, { recursive: true })
const TABS = ['Team', 'Roles & Permissions', 'Store profile', 'Courier relationships', 'Subscription', 'Sessions', 'Security', 'Ownership', 'Account lifecycle', 'Notifications']

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 820, height: 1180 }]) {
  const narrow = viewport.width <= 900
  const phone = viewport.width <= 640
  const w = viewport.width
  await suite('fix014', viewport, async (page, t) => {
    t.ck('this suite runs on the marketplace dataset', DATASET === 'marketplace', DATASET)
    const nav = async name => {
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300) }
      await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(500)
    }
    const switchSeller = async id => { await page.getByRole('button', { name: /Switch Seller/ }).first().click(); await t.settle(300); await page.getByRole('menuitemradio', { name: new RegExp(sellerName(id)) }).click(); await t.settle(600) }
    const master = () => page.locator('.settings-master'), detail = () => page.locator('.settings-detail')
    const vis = async loc => (await loc.count()) > 0 && (await loc.first().isVisible())
    const inView = async loc => { const b = await loc.first().boundingBox(); return !!b && b.width > 0 && b.height > 0 }
    const choose = async name => { if (!(await vis(master()))) { await page.getByRole('button', { name: 'Back to Settings' }).click(); await t.settle(250) }; await master().getByRole('button', { name: new RegExp('^' + name.replace(/[&]/g, '\\$&')) }).click(); await t.settle(350) }
    const detailText = () => detail().innerText()
    const rows = async () => Object.fromEntries((await page.locator('.settings-detail .grid > div').evaluateAll(els => els.map(e => [e.children[0]?.textContent?.trim(), e.children[1]?.textContent?.trim()]))).filter(([k]) => k))

    await t.open(); await t.section('08 Seller Console'); await t.settle(500)
    await nav('Settings')
    await page.screenshot({ path: `${OUT}/settings-${w}.png` })

    // ---- master-detail ----
    if (narrow) {
      t.ck('narrow: Settings opens on the list of settings', await vis(master()) && !(await vis(detail())))
      t.ck('narrow: no Back control while the list shows', !(await page.getByRole('button', { name: 'Back to Settings' }).isVisible()))
      for (const name of TABS) {
        await choose(name)
        t.ck(`narrow: choosing "${name}" reveals its detail at once (the list gives way)`, await vis(detail()) && !(await vis(master())) && (await detailText()).trim().length > 20 && await inView(detail()), name)
        const back = page.getByRole('button', { name: 'Back to Settings' })
        if (name === 'Team') { const b = await back.boundingBox(); t.ck('narrow: the Back control is visible and at least 44 px tall', await back.isVisible() && b.height >= 43, b) }
        await back.click(); await t.settle(250)
        t.ck(`narrow: Back from "${name}" returns to the list`, await vis(master()) && !(await vis(detail())))
      }
      await choose('Store profile')
      await page.screenshot({ path: `${OUT}/settings-detail-${w}.png` })
      t.ck('narrow: the chosen detail is the Store profile with its fulfilment lines', /Seller Delivery/.test(await detailText()) && /Buyer Collection/.test(await detailText()))
    } else {
      t.ck('wide: the list and the detail show together', await vis(master()) && await vis(detail()))
      t.ck('wide: no Back control', !(await page.getByRole('button', { name: 'Back to Settings' }).isVisible()))
      t.ck('wide: the chosen setting is highlighted (Team) and exposed as current', (await master().getByRole('button', { name: /^Team/ }).getAttribute('aria-current')) === 'page' && /bg-brand-muted/.test(await master().getByRole('button', { name: /^Team/ }).getAttribute('class')))
      for (const name of TABS.slice(1)) {
        const before = await detailText()
        await choose(name)
        const current = await master().locator('[aria-current=page]').allInnerTexts()
        t.ck(`wide: choosing "${name}" changes the detail and moves the highlight`, (await detailText()) !== before && current.length === 1 && current[0].replace('›', '').trim() === name, { name, current })
      }
      await choose('Store profile'); await page.screenshot({ path: `${OUT}/settings-detail-${w}.png` })
    }

    // ---- Store profile reads the effective configuration ----
    const expected = id => {
      const s = cat.sellers.find(x => x.seller_id === id)
      return { collects: /Collection/.test(s.fulfilment), delivers: /Seller Delivery/.test(s.fulfilment), area: s.area, hours: s.hours, coverage: s.coverage }
    }
    for (const id of ['DS-01', 'DS-07', 'DS-10', 'DS-04', 'DS-11']) {
      await nav('Settings'); if (narrow) await t.settle(100)
      await switchSeller(id); await nav('Settings')
      await choose('Store profile')
      const r = await rows(); const e = expected(id)
      const label = `${id} ${sellerName(id)}`
      t.ck(`${label}: the store name is the Seller's own`, r['Store name'] === sellerName(id), r)
      // Buyer Collection: the place and hours the Buyer sees (src/fulfilment.ts), or not offered
      t.ck(`${label}: Buyer Collection ${e.collects ? 'shows its place and hours' : 'is not offered'}`, e.collects ? (r['Buyer Collection'] ?? '').includes(e.area) && (r['Buyer Collection'] ?? '').includes(e.hours) : r['Buyer Collection'] === 'Not offered', r['Buyer Collection'])
      // Seller Delivery: offered to Buyers only with a known charge; the MVP states "Fee not set", never an invented price
      const sd = r['Seller Delivery'] ?? ''
      t.ck(`${label}: Seller Delivery ${e.delivers ? 'reads "Fee not set" with the Seller’s coverage' : 'is not offered'}`, e.delivers ? /^Fee not set/.test(sd) && sd.includes(e.coverage) : sd === 'Not offered', sd)
      t.ck(`${label}: Courier Delivery never shows a Courier's compensation as a charge`, !/ETB/.test(r['Courier Delivery'] ?? ''), r['Courier Delivery'])
      t.ck(`${label}: Areas you serve is the Seller's own coverage (${e.coverage})`, r['Areas you serve'] === (/not configured/i.test(e.coverage) ? 'Not stated' : e.coverage), r['Areas you serve'])
      t.ck(`${label}: the Fulfilment line lists exactly the offered methods`, (r['Fulfilment'] ?? '').includes('Buyer Collection') === e.collects && (r['Fulfilment'] ?? '').includes('Seller Delivery') === e.delivers, r['Fulfilment'])
      if (id === 'DS-04') t.ck('DS-04: coverage with several cities is shown whole', /Addis Ababa; Adama; Bishoftu/.test(r['Areas you serve']))
    }

    // ---- the Seller's own Store setup is what Settings then states ----
    await nav('Settings'); await switchSeller('DS-07'); await nav('Store setup')
    await page.getByLabel('Store name').fill('Form & Finish'); await page.getByLabel('Handle').fill('@formfinish')
    await page.getByLabel('About your store').fill('Handmade home pieces from Bahir Dar.'); await page.getByLabel('Owner name').fill('Selam T.'); await page.getByLabel('Mobile number').fill('0912 345 678')
    t.ck('Store setup starts from the Seller’s effective methods (collection only, Bahir Dar)', await page.getByLabel('Buyer Collection').isChecked() && !(await page.getByLabel('Seller Delivery').isChecked()))
    await page.getByLabel('Seller Delivery').check(); await page.getByLabel('Delivery charge (ETB)').fill('95')
    await page.getByRole('button', { name: 'Save setup' }).click(); await t.settle(500)
    await nav('Settings'); await choose('Store profile')
    const saved = await rows()
    t.ck('after saving, Settings states the Seller’s own delivery charge', /^ETB 95/.test(saved['Seller Delivery'] ?? '') && /Seller Delivery/.test(saved['Fulfilment'] ?? '') && /Bahir Dar/.test(saved['Areas you serve'] ?? ''), saved)
    t.ck('...and the collection place from the setup', /Central Bahir Dar/.test(saved['Buyer Collection'] ?? ''), saved['Buyer Collection'])
    await page.screenshot({ path: `${OUT}/settings-store-saved-${w}.png`, fullPage: true })
  })
}
