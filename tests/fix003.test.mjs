// FIX-003: Scene states and gates, stable hotspot numbers, Story drafts, and permanent Story expiry.
import { suite } from './harness.mjs'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const png = join(mkdtempSync(join(tmpdir(), 'fx3-')), 'fixture.png')
writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'))
const KEY = 'adulis.seller-workspace.v1'

await suite('fix003', { width: 1440, height: 900 }, async (page, t) => {
  const nav = async name => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(450) }
  const content = () => page.locator('.seller-console-content').innerText()
  const setStock = async (product, qty) => { await nav('Products'); const back = page.getByRole('button', { name: /Back to Products/ }); if (await back.count()) { await back.click(); await t.settle(300) } await page.getByRole('button', { name: new RegExp(product) }).first().click(); await t.settle(800); await page.getByLabel('Available quantity').fill(String(qty)); await page.getByRole('button', { name: 'Save changes' }).click(); await t.settle() }
  const toScenes = async () => { await nav('Content'); await page.getByRole('tab', { name: 'Scenes' }).click(); await t.settle(300) }
  const toStories = async () => { await nav('Content'); await page.getByRole('tab', { name: 'Stories' }).click(); await t.settle(300) }
  const buyer = async () => { await t.section('Mobile — Buyer'); const g = page.getByRole('button', { name: 'Explore as guest' }); if (await g.count()) { await g.click(); await t.settle(500) } }
  const patchScenes = async fn => {
    const stored = await page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), KEY)
    Object.values(stored.scenes).forEach(fn)
    await page.evaluate(([k, v]) => sessionStorage.setItem(k, JSON.stringify(v)), [KEY, stored])
    await page.reload({ waitUntil: 'networkidle' }); await t.section('Seller Console'); await toScenes()
  }

  await t.open(); await t.section('Seller Console'); await toScenes()
  await page.getByRole('button', { name: 'Create Scene' }).click(); await t.settle()
  await page.locator('input[type=file]').setInputFiles(png); await t.settle(600)
  await page.getByLabel(/Photo description/).fill('Two garments on a rail'); await page.getByLabel('Caption').fill('Rail of the week')
  const options = await page.getByLabel('Product to tag').locator('option').allInnerTexts()
  const pick = name => options.find(o => o.startsWith(name))
  await page.getByLabel('Product to tag').selectOption({ label: pick('Linen Overshirt') }); await page.getByRole('button', { name: 'Place at centre' }).click()
  await page.getByLabel('Product to tag').selectOption({ label: pick('Cotton Shirt Dress') }); await page.getByRole('button', { name: 'Place at centre' }).click()
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await t.settle()
  t.ck('Scene published with hotspots 1 and 2', /Published \(simulated\)/.test(await content()) && await page.getByRole('button', { name: /^Hotspot 2:/ }).count() === 1)

  // Stable numbering: the first tagged Product goes out of stock; the second keeps number 2 in the Buyer's Scene.
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await t.settle()
  await setStock('Linen Overshirt', 0)
  await buyer()
  await page.getByRole('button', { name: /Explore the Scene: Rail of the week/ }).first().click(); await t.settle(400)
  t.eq('Buyer: the remaining hotspot is still numbered 2', await page.getByRole('button', { name: 'Cotton Shirt Dress', exact: true }).filter({ hasText: '2' }).count(), 1)
  t.eq('Buyer: no hotspot is renumbered to 1', await page.getByRole('button', { name: /^Product 1:/ }).count(), 0)

  // Private: every gate failure gives a reason; restock brings the Scene back on its own.
  await t.section('Seller Console'); await setStock('Cotton Shirt Dress', 0); await toScenes()
  let body = await content()
  t.ck('Private with a Seller-visible reason', /Private/.test(body) && /out of stock or unpublished/.test(body), body.slice(0, 300))
  await setStock('Linen Overshirt', 5); await toScenes(); body = await content()
  t.ck('Public again after restock', /Public/.test(body) && !/Private/.test(body))

  // Restricted (simulated moderation) survives a restock cycle.
  await patchScenes(s => { s.restricted = { reason: 'Simulated moderation test' } })
  body = await content()
  t.ck('Restricted shown with the moderation reason', /Restricted/.test(body) && /Simulated moderation test/.test(body), body.slice(0, 300))
  await setStock('Linen Overshirt', 0); await setStock('Linen Overshirt', 7); await toScenes(); body = await content()
  t.ck('A restock does not lift the restriction', /Restricted/.test(body) && !/Public/.test(body))
  await buyer()
  t.eq('Buyer does not see the Restricted Scene', await page.getByRole('button', { name: /Explore the Scene: Rail of the week/ }).count(), 0)
  await t.section('Seller Console'); await toScenes()
  await patchScenes(s => { s.restricted = null })

  // Archive: not public, and a restock does not bring it back.
  await page.getByRole('button', { name: /Rail of the week/ }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Archive' }).click(); await t.settle()
  t.ck('Archived notice shown', /Archived/.test(await content()))
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await t.settle()
  await setStock('Linen Overshirt', 0); await setStock('Linen Overshirt', 9); await toScenes()
  t.ck('Archived stays archived after a restock', /Archived/.test(await content()) && !/Public/.test(await content()))

  // Story drafts: save, reopen, edit, publish.
  await toStories(); await page.getByRole('button', { name: 'Create Story' }).click(); await t.settle()
  await page.locator('input[type=file]').setInputFiles(png); await t.settle(600)
  await page.getByLabel(/Photo description/).fill('Overshirt close-up'); await page.getByLabel('Text').fill('First draft text')
  await page.getByRole('button', { name: 'Save draft' }).click(); await t.settle()
  t.ck('Draft saved and listed', /Draft saved/.test(await content()) && /First draft text/.test(await content()))
  await page.getByRole('button', { name: /^Edit draft/ }).click(); await t.settle(400)
  t.eq('Reopened draft keeps its text', await page.getByLabel('Text').inputValue(), 'First draft text')
  await page.getByLabel('Text').fill('Edited draft text')
  await page.getByRole('button', { name: 'Publish Story' }).click(); await t.settle()
  body = await content()
  t.ck('Edited draft published as the same Story, text updated', /Edited draft text/.test(body) && !/First draft text/.test(body) && /Live/.test(body), body.slice(0, 400))
  t.eq('Publishing a draft did not create a second Story', (body.match(/STY-NEW-/g) || []).length, 1)

  // Expiry is permanent; a rewind keeps remaining time.
  await page.getByRole('button', { name: '+12 h' }).click(); await t.settle(200)
  await page.getByRole('button', { name: 'Reset clock' }).click(); await t.settle(300)
  body = await content()
  t.ck('After +12 h and a clock rewind the live Story still has 12 h left', /12 h left/.test(body), body.slice(0, 400))
  await page.getByRole('button', { name: '+24 h' }).click(); await t.settle(200)
  t.ck('Expired after 24 h', /Expired/.test(await content()))
  await page.getByRole('button', { name: 'Reset clock' }).click(); await t.settle(300)
  t.ck('Expired Story stays expired after a clock reset', /Expired/.test(await content()) && !/Live/.test(await content()))
  await setStock('Linen Overshirt', 0); await setStock('Linen Overshirt', 4); await toStories()
  t.ck('Expired Story stays expired after a restock', /Expired/.test(await content()) && !/Live/.test(await content()))
})
