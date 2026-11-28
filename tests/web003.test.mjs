// WEB-003 (FR-014): Storefront Scene exploration is the Buyer's "Explore the Scene", read-only. Same image presentation (a labelled "Photo pending" placeholder), no invented hotspot
// positions, stable tag numbers (an unavailable tag keeps its number and shows unavailable in place), Product cards, selected Product highlight with its preview, availability, and
// Seller attribution that links to that Seller's Storefront; the Buyer's explorer shows exactly the same for the same Scene. Account actions stay Install prompts.
// REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844. Expected values come from the generated dataset.
import { suite } from './harness.mjs'
import { web, P, S, SC, availability, money } from './web-helpers.mjs'

// All tags available; one unavailable tag (second); low stock and an unavailable tag (third)
const SCENES = ['DS-01-S01', 'DS-02-S03', 'DS-09-S01']
const unavailableText = p => (p.stock === 0 ? 'Currently unavailable' : availability(p))

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('web003', viewport, async (page, t) => {
    const w = web(page, t, viewport)
    const { sf, text, click } = w
    const link = id => `?surface=storefront&seller=${SC[id].seller_id}&scene=${id}`
    const list = () => sf().getByRole('list', { name: 'Products in this Scene' })
    /** What a Scene explorer shows, read from whichever phone it is in: the numbered list with its labels, the marker count and the photo note. */
    const signature = async root => ({
      numbers: await root.locator('[data-scene-number]').evaluateAll(els => els.map(e => e.textContent.trim())),
      labels: await root.getByRole('list', { name: 'Products in this Scene' }).getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label'))),
      markers: await root.evaluate(el => [...el.querySelectorAll('button[aria-pressed]')].filter(b => !b.closest('[role=list]')).length),
      pending: /Photo pending/.test(await root.innerText()),
    })
    const expectedLabels = id => SC[id].product_ids.map(pid => { const p = P[pid]; return `${p.name}, ${money(p.current_etb)}${p.stock === 0 ? ', Currently unavailable' : ''}` })

    const mine = {}
    for (const id of SCENES) {
      const scene = SC[id], seller = S[scene.seller_id]
      await w.openStorefront(link(id))
      t.ck(`${id}: the Scene opens in Explore the Scene with its title and Seller`, (await sf().locator('h1').first().innerText()) === 'Explore the Scene' && (await text()).includes(scene.title) && (await text()).includes(seller.name))
      mine[id] = await signature(sf())
      t.eq(`${id}: tag numbers are the tag order 1..${scene.product_ids.length} (an unavailable tag keeps its number)`, mine[id].numbers.join(','), scene.product_ids.map((_, i) => i + 1).join(','))
      t.eq(`${id}: Product cards in tag order with name, current price and "Currently unavailable" where out of stock`, mine[id].labels.join(' | '), expectedLabels(id).join(' | '))
      t.eq(`${id}: the dataset has no hotspot coordinates, so no marker is drawn on the photo`, mine[id].markers, 0)
      t.ck(`${id}: the photo placeholder is labelled "Photo pending"`, mine[id].pending && (await sf().getByRole('img', { name: new RegExp(scene.title) }).count()) >= 1)
      t.ck(`${id}: Seller name and handle are a link`, (await sf().locator('[data-seller-link]').innerText()).trim() === `${seller.name} ${seller.handle}`)
      await w.overflow(`${id} explorer`)
    }

    // ---- Selection, preview, availability, View Product and back ----
    for (const id of ['DS-02-S03', 'DS-09-S01']) {
      const scene = SC[id]
      await w.openStorefront(link(id))
      t.ck(`${id}: nothing is selected at first and the preview asks to choose`, (await list().getByRole('button', { pressed: true }).count()) === 0 && /Choose a hotspot or a product to preview it/.test(await text()))
      const unavailable = scene.product_ids.map(pid => P[pid]).findIndex(p => p.stock === 0)
      const low = scene.product_ids.map(pid => P[pid]).findIndex(p => p.stock >= 1 && p.stock <= 3)
      for (const index of [unavailable, ...(low >= 0 ? [low] : [])]) {
        const p = P[scene.product_ids[index]]
        await click(list().getByRole('button').nth(index), 300)
        const preview = await sf().getByRole('region', { name: 'Product preview' }).innerText()
        t.ck(`${id}: selecting tag ${index + 1} highlights it and previews ${p.name}, ${money(p.current_etb)}, ${unavailableText(p)}`, (await list().getByRole('button', { pressed: true }).count()) === 1 && (await list().getByRole('button').nth(index).getAttribute('aria-pressed')) === 'true' && preview.includes(p.name) && preview.includes(money(p.current_etb)) && preview.includes(unavailableText(p)), preview)
        t.eq(`${id}: the selected tag keeps number ${index + 1}`, (await list().getByRole('button').nth(index).locator('[data-scene-number]').innerText()).trim(), String(index + 1))
      }
      // The unavailable tag: View Product shows the Product unavailable, with no Cart action, and Back returns to the same selection
      await click(list().getByRole('button').nth(unavailable), 300)
      await click(sf().getByRole('button', { name: 'View Product' }), 450)
      const page1 = await text()
      t.ck(`${id}: View Product opens the unavailable Product, shown Out of Stock, with no way to add it to a Cart`, page1.includes(P[scene.product_ids[unavailable]].name) && /Out of Stock/.test(page1) && (await sf().getByRole('button', { name: 'Add to Cart' }).count()) === 0)
      await w.openStorefront(`?surface=storefront&seller=${scene.seller_id}&scene=${id}&product=${scene.product_ids[unavailable]}`)
      t.ck(`${id}: a link with scene and product reopens with that tag selected`, (await list().getByRole('button', { name: new RegExp(P[scene.product_ids[unavailable]].name), pressed: true }).count()) === 1)
      await click(sf().getByRole('button', { name: 'View Product' }), 450)
    }

    // ---- Back from a Product returns to the Scene with the same selection ----
    await w.openStorefront(link('DS-02-S03'))
    await click(list().getByRole('button').nth(0), 250)
    await click(sf().getByRole('button', { name: 'View Product' }), 450)
    t.ck('a Product opened from the Scene shows its Seller and has no checkout', (await text()).includes(P[SC['DS-02-S03'].product_ids[0]].name) && (await sf().getByRole('button', { name: /checkout|buy now|place order|pay\b/i }).count()) === 0)
    await click(sf().getByRole('button', { name: S['DS-02'].name, exact: true }), 400)
    t.ck('Back from the Product returns to the Scene with the same tag selected', (await text()).includes('Explore the Scene') && (await list().getByRole('button', { pressed: true }).count()) === 1 && (await sf().getByRole('region', { name: 'Product preview' }).innerText()).includes(P[SC['DS-02-S03'].product_ids[0]].name))

    // ---- Seller attribution: the link opens that Seller's Storefront ----
    await w.openStorefront(link('DS-09-S01'))
    await click(sf().locator('[data-seller-link]'), 450)
    t.ck('the Seller link opens that Seller\'s Storefront (profile, Scenes first)', (await sf().locator('h1').first().innerText()) === S['DS-09'].name && (await sf().getByRole('tab', { name: 'Scenes', selected: true }).count()) === 1)
    t.ck('...and the Scene is on it', await sf().locator(`[role=tabpanel] button[aria-label="Scene: ${SC['DS-09-S01'].title}"]`).count() === 1)

    // ---- Scene tiles on the Storefront say "Photo pending" ----
    await w.openStorefront(link('DS-01-S01')); await click(sf().locator('[data-seller-link]'), 450)
    t.ck('Storefront Scene tiles are labelled "Photo pending" while the dataset has no photographs', /photo pending/i.test(await sf().locator('[role=tabpanel]').innerText()))

    // ---- Public-web restrictions inside the explorer ----
    await w.openStorefront(link('DS-02-S03'))
    const before = await w.storage()
    for (const [name, message] of [['Like this Scene', 'Install Adulis to like this Scene'], ['Save this Scene', 'Install Adulis to save this Scene'], [`Chat with ${S['DS-02'].name}`, `Install Adulis to chat with ${S['DS-02'].name}`]]) {
      await click(sf().getByRole('button', { name }), 300)
      t.ck(`${name}: the Install prompt, no state change`, (await w.dialog('Install Adulis').count()) === 1 && (await w.dialog('Install Adulis').locator('[data-install-message]').innerText()) === message && (await w.storage()) === before)
      await click(w.dialog('Install Adulis').getByRole('button', { name: 'Not now' }), 250)
    }
    t.ck('the explorer has no Reviews, More or Buyer-only controls on the public page', (await sf().getByRole('button', { name: /^Reviews$|More options/ }).count()) === 0)
    t.ck('Share is offered and shows a link that names the Scene', await (async () => { await click(sf().getByRole('button', { name: 'Share', exact: true }), 300); const u = await sf().locator('[data-share-url]').inputValue(); await page.keyboard.press('Escape'); await w.settle(200); return new URL(u).searchParams.get('scene') === 'DS-02-S03' })())
    t.ck('no checkout control on the Scene explorer', await sf().getByRole('button', { name: /checkout|buy now|place order|pay\b/i }).count() === 0)

    // ---- Parity with the Buyer's Explore the Scene ----
    const buyer = async id => {
      const scene = SC[id]
      await t.open(); await t.section('05 Mobile — Buyer')
      const guest = page.getByRole('button', { name: 'Explore as guest' }); if (await guest.count()) { await guest.click(); await w.settle(500) }
      await page.getByRole('button', { name: 'Shop' }).first().click(); await w.settle(400)
      await page.locator('input[type=search]').first().fill(scene.title); await w.settle(500)
      await page.getByRole('tab', { name: /^Scenes/ }).click(); await w.settle(300)
      await page.getByRole('button', { name: new RegExp(`Scene: ${scene.title}`) }).first().click(); await w.settle(500)
      const root = page.locator('.phone-frame')
      return { sig: await signature(root), title: (await root.locator('h1').first().innerText()), line: await root.locator('h1 + p').first().innerText() }
    }
    for (const id of SCENES) {
      const b = await buyer(id)
      t.eq(`${id}: the Buyer's explorer has the same tag numbers`, b.sig.numbers.join(','), mine[id].numbers.join(','))
      t.eq(`${id}: the Buyer's explorer has the same Product cards (name, price, availability)`, b.sig.labels.join(' | '), mine[id].labels.join(' | '))
      t.eq(`${id}: the Buyer's explorer draws the same markers (none) and the same Photo pending note`, `${b.sig.markers}:${b.sig.pending}`, `${mine[id].markers}:${mine[id].pending}`)
      t.ck(`${id}: and the same title and Seller`, b.title === 'Explore the Scene' && b.line.includes(SC[id].title) && b.line.includes(S[SC[id].seller_id].name))
    }
    await w.overflow('Buyer explorer')
  })
}
