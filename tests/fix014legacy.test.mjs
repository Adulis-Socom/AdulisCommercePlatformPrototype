// FIX-014 (FR-003) on the legacy dataset (?dataset=legacy; the harness opens it because suites.json lists this file without a dataset):
// Settings > Store profile reads the Seller's effective fulfilment (Bole studio, hours, ETB 120 within Addis Ababa, Courier "Fee not set", never the
// historical Courier compensation), the narrow master-detail works, and the Seller's own Store setup is what Settings then states.
import { suite, DATASET } from './harness.mjs'

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const phone = viewport.width <= 640
  await suite('fix014-legacy', viewport, async (page, t) => {
    t.ck('this suite runs on the legacy dataset', DATASET === 'legacy', DATASET)
    const nav = async name => {
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300) }
      await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(500)
    }
    const rows = async () => Object.fromEntries((await page.locator('.settings-detail .grid > div').evaluateAll(els => els.map(e => [e.children[0]?.textContent?.trim(), e.children[1]?.textContent?.trim()]))).filter(([k]) => k))
    await t.open(); await t.section('08 Seller Console'); await t.settle(500)
    await nav('Settings')
    await page.locator('.settings-master').getByRole('button', { name: /^Store profile/ }).click(); await t.settle(350)
    t.ck('choosing Store profile shows it (at every width)', await page.locator('.settings-detail').isVisible() && /Store profile/.test(await page.locator('.settings-detail').innerText()))
    const settingsOf = async () => { await nav('Settings'); const back = page.getByRole('button', { name: 'Back to Settings' }); if (await back.isVisible()) { await back.click(); await t.settle(250) }; await page.locator('.settings-master').getByRole('button', { name: /^Store profile/ }).click(); await t.settle(350); return rows() }
    const switchSeller = async name => { await page.getByRole('button', { name: /Switch Seller/ }).first().click(); await t.settle(300); await page.getByRole('menuitemradio', { name: new RegExp(name) }).click(); await t.settle(600) }
    const r = await rows()
    t.ck('Addis Atelier: Buyer Collection with the seeded place and hours', /Bole studio/.test(r['Buyer Collection']) && /Monday–Saturday 10:00–18:00/.test(r['Buyer Collection']), r)
    t.ck('Addis Atelier: no Seller Delivery is offered', r['Seller Delivery'] === 'Not offered', r)
    t.ck('Addis Atelier: Courier Delivery is "Fee not set", never the Courier compensation (ETB 180)', r['Courier Delivery'] === 'Fee not set', r)
    t.ck('Addis Atelier: the Fulfilment line lists exactly the offered methods and coverage is not stated', r['Fulfilment'] === 'Buyer Collection, Courier Delivery' && r['Areas you serve'] === 'Not stated', r)
    await page.screenshot({ path: `tests/results/evidence/fix014/legacy-settings-${viewport.width}.png` }).catch(() => {})
    await switchSeller('Nura Glow')
    const n = await settingsOf()
    t.ck('Nura Glow: Seller Delivery ETB 120 within Addis Ababa, no collection', /^ETB 120/.test(n['Seller Delivery']) && /within Addis Ababa/.test(n['Seller Delivery']) && n['Buyer Collection'] === 'Not offered' && n['Areas you serve'] === 'within Addis Ababa', n)
    await switchSeller('Volt House')
    const v = await settingsOf()
    t.ck('Volt House: collection at Megenagna shop and Seller Delivery ETB 100', /Megenagna shop/.test(v['Buyer Collection']) && /^ETB 100/.test(v['Seller Delivery']), v)
    await switchSeller('Addis Atelier'); await settingsOf()

    // Store setup (legacy default: collection on, delivery off) is what Settings then states.
    await nav('Store setup')
    await page.getByRole('button', { name: 'Start from a blank store' }).click(); await t.settle(300)
    await page.getByLabel('Store name').fill('Test Atelier'); await page.getByLabel('Handle').fill('@testatelier')
    await page.getByLabel('About your store').fill('Handmade linen clothing from Addis Ababa.'); await page.getByLabel('Owner name').fill('Selam T.'); await page.getByLabel('Mobile number').fill('0912 345 678')
    await page.getByLabel('Addis Ababa').check(); await page.getByLabel('Buyer Collection').check(); await page.getByLabel('Collection place').fill('Bole studio')
    await page.getByLabel('Seller Delivery').check(); await page.getByLabel('Delivery charge (ETB)').fill('120')
    await page.getByRole('button', { name: 'Save setup' }).click(); await t.settle(500)
    await nav('Settings')
    const back = page.getByRole('button', { name: 'Back to Settings' }); if (await back.isVisible()) { await back.click(); await t.settle(250) }
    await page.locator('.settings-master').getByRole('button', { name: /^Store profile/ }).click(); await t.settle(350)
    const s = await rows()
    t.ck('after saving a setup, Settings states it (charge, collection place, areas)', /^ETB 120/.test(s['Seller Delivery']) && /Bole studio/.test(s['Buyer Collection']) && s['Areas you serve'] === 'Addis Ababa' && s['Courier Delivery'] === 'Not offered', s)
  })
}
