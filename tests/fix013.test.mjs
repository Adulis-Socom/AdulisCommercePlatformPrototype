// FIX-013 (FR-001, FR-002), marketplace dataset (tests/suites.json marks it).
// FR-001: Scene tags keep an immutable id; the number shown is the tag's place in the composition. Delete compacts, delete-all restarts at 1, a stock change
// never renumbers, Replace Product keeps id / position / number; works for authored (positioned) and dataset (unpositioned) tags; the Buyer's Explore the Scene
// shows the same numbers. Old saved Scenes (tags with `n`, counter `nextN`) migrate on load.
// FR-002: the Inbox "Talking about" selector is a combobox + listbox: opens where there is room (never clipped), animated chevron (reduced motion respected),
// check mark + highlight on the chosen option, search on a long list, Arrow/Home/End/Enter/Escape/Tab, outside click closes; all four contexts keep working.
import { suite, DATASET } from './harness.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { ctx, ctxOptions } from './ctx-helpers.mjs'
import { drivers } from './sim-helpers.mjs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/fix013'
mkdirSync(OUT, { recursive: true })
const png = `${OUT}/fixture.png`
writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'))
const WS = 'adulis.seller-workspace.v1:marketplace'

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const phone = viewport.width <= 640
  const w = viewport.width
  await suite('fix013', viewport, async (page, t) => {
    t.ck('this suite runs on the marketplace dataset', DATASET === 'marketplace', DATASET)
    const content = () => page.locator('.seller-console-content')
    const nav = async name => {
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300) }
      await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(500)
    }
    const tab = async name => { await page.getByRole('tab', { name }).click(); await t.settle(300) }
    const toConsole = async () => { await t.open(); await t.section('08 Seller Console'); await t.settle(500) }
    // numbers and names of the tag list, in order
    const tagRows = async () => page.locator('li[data-tag-id]').evaluateAll(rows => rows.map(r => ({ id: r.getAttribute('data-tag-id'), n: r.querySelector('[data-tag-number]').textContent.trim(), name: r.querySelector('span.flex-1').childNodes[0].textContent.trim() })))
    const summary = rows => rows.map(r => `${r.n}:${r.name}`).join(' | ')
    const tagSelect = () => page.getByLabel('Product to tag')
    const optionLabel = async re => { const labels = await tagSelect().locator('option').allInnerTexts(); return labels.find(l => re.test(l)) }
    const place = async re => { await tagSelect().selectOption({ label: await optionLabel(re) }); await page.getByRole('button', { name: /Place at centre|Add tag/ }).click(); await t.settle(150) }
    const setStock = async (name, value) => {
      await nav('Products')
      await page.getByRole('button', { name: new RegExp(name) }).first().click(); await t.settle(400)
      await page.getByLabel('Available quantity').fill(String(value))
      await page.getByRole('button', { name: 'Save changes' }).click(); await t.settle(400)
      await page.getByRole('button', { name: /Back to Products/ }).click(); await t.settle(300)
    }

    // ================= FR-001: an authored (positioned) Scene =================
    await toConsole(); await nav('Content')
    await page.getByRole('button', { name: 'Create Scene' }).click(); await t.settle()
    await page.locator('input[type=file]').setInputFiles(png); await t.settle(600)
    await page.getByLabel(/Photo description/).fill('Three pieces on a rail'); await page.getByLabel('Caption').fill('Rail of favourites.')
    await place(/^Ivory ribbed knit top/); await place(/^Black wide-leg trousers/); await place(/^Sand tailored blazer/)
    let rows = await tagRows()
    t.eq('three tags are numbered 1, 2, 3', summary(rows), '1:Ivory ribbed knit top | 2:Black wide-leg trousers | 3:Sand tailored blazer')
    t.ck('each tag has its own immutable id', new Set(rows.map(r => r.id)).size === 3 && rows.every(r => /^T\d+$/.test(r.id)), rows)
    const before = rows
    t.ck('the photo hotspots show the same numbers as the list', JSON.stringify(await page.locator('button[data-tag-number]').evaluateAll(b => b.map(x => x.textContent.trim()))) === JSON.stringify(['1', '2', '3']))
    await page.getByRole('button', { name: 'Remove tag 2' }).click(); await t.settle(200)
    rows = await tagRows()
    t.eq('deleting the middle tag compacts the numbers (1, 2, no gap)', summary(rows), '1:Ivory ribbed knit top | 2:Sand tailored blazer')
    t.ck('the remaining tags keep their ids', rows[0].id === before[0].id && rows[1].id === before[2].id, rows)
    t.ck('the hotspots on the photo were renumbered too', JSON.stringify(await page.locator('button[data-tag-number]').evaluateAll(b => b.map(x => x.textContent.trim()))) === JSON.stringify(['1', '2']))
    await place(/^Straight-leg blue jeans/)
    rows = await tagRows()
    t.ck('a tag added afterwards is number 3 with an id never used before', rows[2].n === '3' && !before.some(b => b.id === rows[2].id), rows)

    // Replace Product: keeps id, position, number.
    const xBefore = await page.getByLabel('Hotspot 2 horizontal position, percent').inputValue(), yBefore = await page.getByLabel('Hotspot 2 vertical position, percent').inputValue()
    const idBefore = (await tagRows())[1].id
    await page.getByRole('button', { name: 'Replace Product on tag 2' }).click(); await t.settle(150)
    const choices = await page.getByLabel('Replacement for tag 2').locator('option').allInnerTexts()
    t.ck('the replacement list offers the Seller’s other in-stock Products, never one already tagged here', choices.length > 3 && !choices.some(c => /^(Ivory ribbed knit top|Sand tailored blazer|Straight-leg blue jeans)/.test(c)) && choices.some(c => /^Chocolate shoulder bag/.test(c)) && !choices.some(c => /Black satin slip dress/.test(c)), choices)
    await page.getByLabel('Replacement for tag 2').selectOption({ label: choices.find(c => /^Chocolate shoulder bag/.test(c)) }); await t.settle(200)
    rows = await tagRows()
    t.ck('replacing swaps the Product and keeps the tag’s id and number', rows[1].name === 'Chocolate shoulder bag' && rows[1].id === idBefore && rows[1].n === '2', rows)
    t.ck('...and keeps its position', (await page.getByLabel('Hotspot 2 horizontal position, percent').inputValue()) === xBefore && (await page.getByLabel('Hotspot 2 vertical position, percent').inputValue()) === yBefore)
    t.ck('...and the hotspot on the photo names the new Product', await page.getByRole('button', { name: /^Hotspot 2: Chocolate shoulder bag/ }).count() === 1)
    t.eq('the list is unchanged otherwise', summary(rows), '1:Ivory ribbed knit top | 2:Chocolate shoulder bag | 3:Straight-leg blue jeans')

    // Delete all, add again: numbering restarts at 1, ids are never reused.
    const usedIds = new Set([...before.map(b => b.id), ...(await tagRows()).map(r => r.id)])
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Remove tag/ }).first().click()
    await t.settle(200)
    t.eq('deleting every tag leaves none', (await tagRows()).length, 0)
    await place(/^Cropped denim jacket/)
    rows = await tagRows()
    t.ck('after deleting all, the next tag is number 1 (a fresh id)', rows.length === 1 && rows[0].n === '1' && !usedIds.has(rows[0].id), rows)
    // Rebuild a 3-tag composition and publish for the Buyer and the stock checks.
    await place(/^Chocolate shoulder bag/); await place(/^Navy belted jumpsuit/)
    await page.getByRole('button', { name: 'Publish Scene' }).click(); await t.settle(400)
    t.ck('published (simulated)', /Published \(simulated\)/.test(await content().innerText()))
    await page.screenshot({ path: `${OUT}/authored-editor-${w}.png`, fullPage: true })

    // Stock change: the second tagged Product (Chocolate shoulder bag) goes out of stock: nothing is renumbered, it is shown unavailable in place.
    await setStock('Chocolate shoulder bag', 0)
    await nav('Content'); await t.settle(300)
    await page.getByRole('button', { name: /Rail of favourites/ }).click(); await t.settle(400)
    rows = await tagRows()
    t.eq('a Product going out of stock does not renumber the Scene', summary(rows), '1:Cropped denim jacket | 2:Chocolate shoulder bag | 3:Navy belted jumpsuit')
    t.ck('...it stays in place, shown unavailable', /Unavailable now/.test(await page.locator('li[data-tag-id]').nth(1).innerText()))
    await page.screenshot({ path: `${OUT}/authored-stock-${w}.png`, fullPage: true })
    await page.getByRole('button', { name: /Back to Scenes/ }).click(); await t.settle(300)

    // The Buyer's Explore the Scene shows the same numbers (the unavailable Product keeps its number).
    await t.section('05 Mobile — Buyer')
    const guest = page.getByRole('button', { name: 'Explore as guest' }); if (await guest.count()) { await guest.click(); await t.settle(500) }
    await page.getByRole('button', { name: /Explore the Scene: Rail of favourites/ }).first().click(); await t.settle(500)
    const marker = async name => (await page.getByRole('button', { name, exact: true }).first().innerText()).trim()
    t.eq('Buyer: Cropped denim jacket is hotspot 1', await marker('Cropped denim jacket'), '1')
    t.eq('Buyer: the out-of-stock Chocolate shoulder bag keeps number 2', await marker('Chocolate shoulder bag'), '2')
    t.eq('Buyer: Navy belted jumpsuit is hotspot 3', await marker('Navy belted jumpsuit'), '3')
    await page.screenshot({ path: `${OUT}/buyer-explore-authored-${w}.png` })
    await setStock('Chocolate shoulder bag', 6).catch(() => {})
  })

  // ================= FR-001: a dataset (unpositioned) Scene, and migration =================
  await suite('fix013-dataset', viewport, async (page, t) => {
    const content = () => page.locator('.seller-console-content')
    const nav = async name => {
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300) }
      await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(500)
    }
    const tagRows = async () => page.locator('li[data-tag-id]').evaluateAll(rows => rows.map(r => ({ id: r.getAttribute('data-tag-id'), n: r.querySelector('[data-tag-number]').textContent.trim(), name: r.querySelector('span.flex-1').childNodes[0].textContent.trim(), text: r.innerText })))
    const summary = rows => rows.map(r => `${r.n}:${r.name}`).join(' | ')
    const place = async re => { const labels = await page.getByLabel('Product to tag').locator('option').allInnerTexts(); await page.getByLabel('Product to tag').selectOption({ label: labels.find(l => re.test(l)) }); await page.getByRole('button', { name: 'Add tag' }).click(); await t.settle(150) }
    await t.open(); await t.section('08 Seller Console'); await t.settle(500)
    await nav('Content'); await t.settle(300)
    const body = await content().innerText()
    t.ck('the Seller’s 7 catalogue Scenes are listed, unpositioned', (await page.getByLabel('Dataset Scenes').getByRole('button').count()) === 7 && /unpositioned/.test(body), body.slice(0, 300))
    await page.getByRole('button', { name: /\(DS-01-S01\)/ }).click(); await t.settle(400)
    let rows = await tagRows()
    t.eq('a dataset Scene lists its tagged Products as 1, 2, 3, unpositioned', summary(rows), '1:Olive linen midi dress | 2:Sand tailored blazer | 3:Chocolate shoulder bag')
    t.ck('...with no coordinates and no position fields (none are invented)', rows.every(r => /Unpositioned/.test(r.text)) && (await page.getByLabel(/horizontal position/).count()) === 0)
    await page.getByRole('button', { name: 'Remove tag 2' }).click(); await t.settle(200)
    t.eq('deleting the middle tag compacts the numbers', summary(await tagRows()), '1:Olive linen midi dress | 2:Chocolate shoulder bag')
    const keep = (await tagRows())[1].id
    await page.getByRole('button', { name: 'Replace Product on tag 2' }).click(); await t.settle(150)
    const choices = await page.getByLabel('Replacement for tag 2').locator('option').allInnerTexts()
    t.ck('replacements are the Seller’s own in-stock Products not already tagged here', choices.some(c => /^Black wide-leg trousers/.test(c)) && !choices.some(c => /^(Olive linen midi dress|Chocolate shoulder bag)/.test(c)) && !choices.some(c => /Black satin slip dress/.test(c)), choices)
    await page.getByLabel('Replacement for tag 2').selectOption({ label: choices.find(c => /^Black wide-leg trousers/.test(c)) }); await t.settle(200)
    rows = await tagRows()
    t.ck('replacing keeps the tag’s id and number and stays unpositioned', rows[1].name === 'Black wide-leg trousers' && rows[1].id === keep && rows[1].n === '2' && /Unpositioned/.test(rows[1].text), rows)
    await place(/^Mocha two-piece set/)
    t.eq('adding appends number 3', summary(await tagRows()), '1:Olive linen midi dress | 2:Black wide-leg trousers | 3:Mocha two-piece set')
    await page.screenshot({ path: `${OUT}/dataset-editor-${w}.png`, fullPage: true })
    await page.getByRole('button', { name: /Back to Scenes/ }).click(); await t.settle(300)
    t.ck('the list shows the new tag count', /DS-01-S01 · 3 tags · unpositioned/.test(await content().innerText()))

    // Delete all in another Scene, then add: numbering restarts at 1.
    await page.getByRole('button', { name: /\(DS-01-S04\)/ }).click(); await t.settle(400)
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: /^Remove tag/ }).first().click()
    await t.settle(200)
    t.eq('removing all leaves no tag', (await tagRows()).length, 0)
    await place(/^Ivory ribbed knit top/)
    t.eq('re-adding after deleting all starts at 1', summary(await tagRows()), '1:Ivory ribbed knit top')
    await page.getByRole('button', { name: /Back to Scenes/ }).click(); await t.settle(300)

    // The Buyer reads the same tags (S01 is a public Scene of DS-01).
    await t.section('05 Mobile — Buyer')
    const guest = page.getByRole('button', { name: 'Explore as guest' }); if (await guest.count()) { await guest.click(); await t.settle(500) }
    const opened = await (async () => {
      const link = page.getByRole('button', { name: /Explore the Scene: .*(Monday capsule)/ }).first()
      for (let i = 0; i < 6 && !(await link.count()); i++) { await page.mouse.wheel(0, 900); await t.settle(250) }
      if (!(await link.count())) return false
      await link.click(); await t.settle(500); return true
    })()
    if (opened) {
      const numbers = await page.locator('[data-scene-number]').evaluateAll(els => els.map(e => e.textContent.trim()))
      t.ck('Buyer: Explore the Scene lists the Seller’s edited tags numbered 1, 2, 3', JSON.stringify(numbers) === JSON.stringify(['1', '2', '3']) && (await page.getByRole('button', { name: /^Black wide-leg trousers/ }).count()) >= 1 && (await page.getByRole('button', { name: /^Sand tailored blazer/ }).count()) === 0, numbers)
      await page.screenshot({ path: `${OUT}/buyer-explore-dataset-${w}.png` })
    } else t.ck('Buyer: the edited dataset Scene could be opened from the feed', false)

    // Migration: a Scene saved before tag ids existed (tags with a never-reused `n`, counter `nextN`).
    await page.evaluate(key => {
      const saved = JSON.parse(sessionStorage.getItem(key) || '{}')
      saved.scenes = { 'SCN-NEW-001': { id: 'SCN-NEW-001', seller: 'DS-01', status: 'draft', caption: 'Old Scene', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', alt: '', updated: 1, nextN: 4, tags: [{ product: 'DS-01-P02', x: 10, y: 20, n: 1 }, { product: 'DS-01-P03', x: 30, y: 40, n: 3 }] } }
      sessionStorage.setItem(key, JSON.stringify(saved))
    }, WS)
    await page.reload({ waitUntil: 'networkidle' }); await t.settle(400)
    await t.section('08 Seller Console'); await t.settle(400); await nav('Content'); await t.settle(300)
    t.ck('an old saved Scene still opens and lists its tags', /Old Scene/.test(await content().innerText()) && /2 tags/.test(await content().innerText()))
    await page.getByRole('button', { name: /Old Scene/ }).first().click(); await t.settle(400)
    rows = await tagRows()
    t.ck('its tags get ids and compact to 1, 2 (positions kept)', summary(rows) === '1:Ivory ribbed knit top | 2:Black wide-leg trousers' && rows.every(r => /^T\d+$/.test(r.id)) && (await page.getByLabel('Hotspot 2 horizontal position, percent').inputValue()) === '30', rows)
    t.ck('adding to it works and takes a new id above the old counter', await (async () => { const labels = await page.getByLabel('Product to tag').locator('option').allInnerTexts(); await page.getByLabel('Product to tag').selectOption({ label: labels.find(l => /^Sand tailored blazer/.test(l)) }); await page.getByRole('button', { name: 'Place at centre' }).click().catch(() => {}); await t.settle(150); const r = await tagRows(); return r.length === 3 && r[2].n === '3' && r[2].id === 'T4' })(), await tagRows())
  })
}

// ================= FR-002: the Inbox context selector =================
const CASES = [{ width: 1440, height: 900 }, { width: 1280, height: 520 }, { width: 390, height: 844 }]
for (const viewport of CASES) {
  await suite('fix013-selector', viewport, async (page, t) => {
    const phone = viewport.width <= 640
    const w = `${viewport.width}x${viewport.height}`
    await t.open(); await t.section('08 Seller Console'); await t.settle(500)
    if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await t.settle(300) }
    await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Inbox/ }).first().click(); await t.settle(500)
    await page.getByRole('button', { name: /Maya/ }).first().click(); await t.settle(400)
    const trigger = ctx(page)
    const chevron = () => trigger.locator('[data-chevron]')
    const listbox = () => page.getByRole('listbox', { name: 'Talking about' })
    const activeId = () => page.evaluate(() => (document.activeElement?.getAttribute('aria-activedescendant')))

    t.eq('closed: aria-expanded is false', await trigger.getAttribute('aria-expanded'), 'false')
    t.eq('closed: the chevron points down', await chevron().getAttribute('data-chevron'), 'down')
    const triggerBox = await trigger.boundingBox()
    t.ck('the trigger has the console field height and rounded styling', triggerBox.height >= 43 && (await trigger.evaluate(e => parseFloat(getComputedStyle(e).borderRadius))) >= 8, triggerBox)
    await page.screenshot({ path: `${OUT}/selector-closed-${w}.png` })

    const info = await ctxOptions(page)
    await trigger.click(); await t.settle(350)
    t.eq('open: aria-expanded is true', await trigger.getAttribute('aria-expanded'), 'true')
    t.eq('open: the chevron points up', await chevron().getAttribute('data-chevron'), 'up')
    t.ck('open: the chevron is rotated (animated, not swapped)', (await chevron().evaluate(e => getComputedStyle(e).rotate)) !== 'none' && (await chevron().evaluate(e => getComputedStyle(e).transitionProperty)).includes('rotate'))
    const box = await page.locator('[data-placement]').boundingBox()
    const vp = page.viewportSize()
    t.ck('open: the list is fully inside the window (never clipped by the panel edge)', box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height, { box, vp })
    const placement = await page.locator('[data-placement]').getAttribute('data-placement')
    t.ck('open: it sits on a side of the trigger that has room', placement === 'above' ? box.y + box.height <= triggerBox.y + 1 : box.y >= triggerBox.y + triggerBox.height - 1, { placement, box, triggerBox })
    await page.screenshot({ path: `${OUT}/selector-open-${w}.png` })
    const optionTexts = await page.getByRole('option').allInnerTexts()
    t.ck('a Seller with many Products and Scenes gets a long list', optionTexts.length >= 20, optionTexts.length)
    t.ck('all four contexts are offered: General, Product, Scene and Product-within-Scene', optionTexts.some(o => /^General \/ Seller/.test(o)) && optionTexts.some(o => /^Olive linen midi dress$/.test(o.trim())) && optionTexts.some(o => / Scene Post$/.test(o.trim()) && !/ in /.test(o)) && optionTexts.some(o => / in .* Scene Post$/.test(o.trim())), optionTexts.slice(0, 30))
    t.ck('the options are grouped (Product Posts, Scene Posts)', ['Product Posts', 'Scene Posts'].every(g => info?.groups.some(([l]) => l === g)), info?.groups.map(g => g[0]))
    t.ck('a search field appears for the long list', await page.getByRole('searchbox', { name: /Search talking about choices/i }).count() === 1)
    const selected = page.getByRole('option', { selected: true })
    t.eq('exactly one option is selected (General)', await selected.count(), 1)
    t.ck('the selected option has a check mark and a highlight', (await selected.locator('svg').count()) === 1 && /bg-brand-muted/.test((await selected.getAttribute('class')) ?? ''))
    t.ck('the list scrolls (it is taller than its window)', await listbox().evaluate(l => l.scrollHeight > l.clientHeight))

    // keyboard
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
    const second = await activeId()
    await page.keyboard.press('End'); const last = await activeId()
    await page.keyboard.press('Home'); const first = await activeId()
    t.ck('Arrow keys, End and Home move the active option', !!second && !!last && !!first && new Set([second, last, first]).size === 3 && /o0$/.test(first), { second, last, first })
    t.ck('End scrolls the last option into view', await (async () => { await page.keyboard.press('End'); const r = await page.evaluate(() => { const o = document.getElementById(document.activeElement.getAttribute('aria-activedescendant')); const l = o.closest('[role=listbox]').getBoundingClientRect(); const b = o.getBoundingClientRect(); return b.top >= l.top - 1 && b.bottom <= l.bottom + 1 }); await page.keyboard.press('Home'); return r })())
    await page.keyboard.type('belted'); await t.settle(250)
    const filtered = await page.getByRole('option').allInnerTexts()
    t.ck('typing searches: the list narrows to matches', filtered.length >= 1 && filtered.length < optionTexts.length && filtered.every(o => /belted/i.test(o)), filtered)
    await page.keyboard.press('Enter'); await t.settle(300)
    t.ck('Enter chooses the active option, closes the list and returns focus to the trigger', (await trigger.innerText()).includes('Navy belted jumpsuit') && (await trigger.getAttribute('aria-expanded')) === 'false' && (await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'combobox', await trigger.innerText())
    await trigger.focus(); await page.keyboard.press('ArrowDown'); await t.settle(250)
    t.eq('ArrowDown on the trigger opens it', await trigger.getAttribute('aria-expanded'), 'true')
    t.ck('the current choice is the selected one when reopened', /Navy belted jumpsuit/.test(await page.getByRole('option', { selected: true }).innerText()))
    await page.keyboard.press('Escape'); await t.settle(200)
    t.ck('Escape closes without changing the choice and returns focus to the trigger', (await trigger.getAttribute('aria-expanded')) === 'false' && (await trigger.innerText()).includes('Navy belted jumpsuit') && (await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'combobox')
    t.eq('closed again: the chevron points down', await chevron().getAttribute('data-chevron'), 'down')
    await trigger.click(); await t.settle(200)
    await page.keyboard.press('Tab'); await t.settle(200)
    t.eq('Tab closes the list', await trigger.getAttribute('aria-expanded'), 'false')
    await trigger.click(); await t.settle(200)
    await page.getByRole('list', { name: 'Messages' }).last().click({ position: { x: 4, y: 4 } }); await t.settle(200)
    t.eq('a click outside closes it', await trigger.getAttribute('aria-expanded'), 'false')

    // reduced motion: the chevron does not animate
    await page.emulateMedia({ reducedMotion: 'reduce' })
    t.ck('prefers-reduced-motion: the chevron’s transition is effectively instant', (await chevron().evaluate(e => parseFloat(getComputedStyle(e).transitionDuration))) < 0.001)
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    // data flow: a Product-in-Scene reply reaches the thread with both named
    await trigger.click(); await t.settle(200)
    const combined = (await page.getByRole('option').allInnerTexts()).find(o => / in .* Scene Post$/.test(o.trim()))?.trim()
    await page.keyboard.press('Escape')
    const { ctxPick } = await import('./ctx-helpers.mjs')
    await ctxPick(page, combined); await t.settle(250)
    await page.getByLabel('Reply', { exact: true }).fill('Both are on the rail this week.'); await page.getByRole('button', { name: 'Send Reply' }).click(); await t.settle(400)
    const thread = await page.locator('.seller-console-content').innerText()
    t.ck('the reply carries the chosen context into the thread', thread.includes('Both are on the rail this week.') && thread.includes(combined), combined)
  })
}

// ================= FR-002: the Companion's selector sheet =================
await suite('fix013-companion', { width: 1440, height: 900 }, async (page, t) => {
  const d = drivers(page, t, { width: 1440, height: 900 })
  await t.open()
  await d.companion()
  const nav = page.locator('main.app-main nav').last()
  const labels = await nav.getByRole('button').allInnerTexts()
  const inbox = labels.find(l => /Inbox|Chats|Messages/i.test(l))
  t.ck('the Companion has an Inbox tab', !!inbox, labels)
  await nav.getByRole('button', { name: new RegExp(inbox.trim().split('\n').pop()) }).click(); await t.settle(400)
  await page.getByRole('button', { name: /Maya/ }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: /^Talking about:/ }).click(); await t.settle(400)
  const dialog = page.getByRole('dialog', { name: 'Talking about' })
  t.ck('the sheet shows the same listbox with a search field and a chosen option with a check mark', await dialog.getByRole('listbox').count() === 1 && await dialog.getByRole('searchbox').count() === 1 && (await dialog.getByRole('option', { selected: true }).locator('svg').count()) === 1)
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await t.settle(400)
  t.ck('Arrow keys and Enter choose a context and close the sheet', (await dialog.count()) === 0 && !/Talking about: General/.test(await page.getByRole('button', { name: /^Talking about:/ }).innerText()))
  await page.getByRole('button', { name: /^Talking about:/ }).click(); await t.settle(300)
  await page.keyboard.press('Escape'); await t.settle(300)
  t.ck('Escape closes the sheet and returns focus to its opener', (await dialog.count()) === 0 && (await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')).startsWith('Talking about:'))
})
