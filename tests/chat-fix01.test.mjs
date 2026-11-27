// CHAT-FIX-01 (IR-053..055): chips act on the response that offered them, Scene reopening validates the Product, out-of-stock Scene tags are
// labelled, a named Variant stays with its response, and a Seller reply can name a Product and a Scene together. REAL app and engine.
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/chat-fix01'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC'
const S = 'SEL-ADDIS-ATELIER'
const ALL = ['Buyer Collection', 'Seller Delivery', 'Courier Delivery']
const product = (id, name, extra = {}) => ({ id, seller: S, status: 'published', name, description: `${name} description`, category: 'fashion/womens-clothing/dresses', attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [img], fulfilment: ALL, locallyMade: false, updated: 1, ...extra })
const scene = (id, caption, tags, updated) => ({ id, seller: S, status: 'published', caption, image: img, alt: caption, tags: tags.map((p, i) => ({ product: p, x: 30 + i * 20, y: 50, n: i + 1 })), updated })
const botMsg = (seq, text, chips) => ({ id: `BUY-MAYA-TESFAYE|${S}|MKT-ET#${seq}`, seq, from: 'bot', text, chips, kind: 'clarify', intent: 'C02' })
const state = chats => ({
  products: {
    'PRD-NEW-001': product('PRD-NEW-001', 'Test Kettle'),
    'PRD-NEW-002': product('PRD-NEW-002', 'Empty Mug', { stock: '0', price: '300' }),
    'PRD-NEW-003': product('PRD-NEW-003', 'Swap Dress', { price: '1000', stock: '', options: [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red', 'Blue'] }],
      variants: [{ key: '1', values: ['S', 'Red'], label: 'S / Red', price: '1000', stock: '3' }, { key: '2', values: ['M', 'Red'], label: 'M / Red', price: '1200', stock: '2' }, { key: '3', values: ['M', 'Blue'], label: 'M / Blue', price: '1200', stock: '5' }] }),
  },
  scenes: { 'SCN-NEW-001': scene('SCN-NEW-001', 'Kettle corner', ['PRD-NEW-001', 'PRD-NEW-002'], 7), 'SCN-NEW-002': scene('SCN-NEW-002', 'Dress rail', ['PRD-NEW-003'], 9) },
  stories: {}, setup: {}, knowledge: {}, bot: {}, chats: chats ?? {}, botFeedback: [], buyerSaved: null, buyerCart: null, clockHours: 0,
})
const CHAT_KEY = `BUY-MAYA-TESFAYE|${S}|MKT-ET`
const stale = {
  [CHAT_KEY]: { key: CHAT_KEY, sellerId: S, buyerId: 'BUY-MAYA-TESFAYE', marketId: 'MKT-ET', mode: 'bot', pending: null, waiting: false, seq: 2, messages: [
    { id: `${CHAT_KEY}#1`, seq: 1, from: 'buyer', text: 'How much is it?', subject: { sellerId: S, scene: { id: 'SCN-NEW-002', revision: 3 }, productId: 'PRD-NEW-001' }, subjectLabel: 'Test Kettle · Dress rail Scene' },
    botMsg(2, 'This Scene has changed since you opened it. Reopen it to see the current version.', [{ id: 'reopen-scene', label: 'Reopen the Scene', subject: { sellerId: S, scene: { id: 'SCN-NEW-002', revision: 3 }, productId: 'PRD-NEW-001', variant: { Size: 'XL' } } }]),
  ] },
}

const body = page => page.locator('body').innerText()
const toBuyer = async (page, t) => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500) }
const openChatOn = async (page, t, name) => {
  await page.getByRole('button', { name: 'Shop', exact: true }).last().click().catch(async () => { await page.getByRole('button', { name: 'Search', exact: true }).first().click() }); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(name.toLowerCase()); await t.settle(450)
  await page.locator('button', { hasText: name }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(700)
}
const ask = async (page, t, text) => { await page.getByLabel('Message', { exact: true }).fill(text); await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300) }
const seed = (page, st) => page.addInitScript(([k, s]) => { if (!sessionStorage.getItem(k)) sessionStorage.setItem(k, JSON.stringify(s)) }, [KEY, st])
const sceneSel = page => page.getByLabel('Scene (optional)')
const productSel = page => page.getByLabel('Product', { exact: true })
const chips = page => page.getByLabel('Quick replies').getByRole('button')

await suite('chat-fix01', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, state())
  await toBuyer(page, t); await openChatOn(page, t, 'Test Kettle')
  // ---- IR-055: available Scene tags vs out-of-stock context ----
  await sceneSel(page).selectOption('SCN-NEW-001'); await t.settle(200)
  const labels = await productSel(page).locator('option').allInnerTexts()
  t.ck('IR-055: the Scene’s Product choices label an out-of-stock tag, and not an available one', labels.includes('Empty Mug (out of stock)') && labels.includes('Test Kettle'), labels)
  await productSel(page).selectOption(''); await t.settle(100)
  await ask(page, t, 'How much is it?')
  const offered = await chips(page).allInnerTexts()
  t.ck('IR-055: the "which Product?" quick replies carry the same labels', offered.includes('Empty Mug (out of stock)') && offered.includes('Test Kettle'), offered)

  // ---- IR-054: a quick reply restores the composer to the response that offered it ----
  await sceneSel(page).selectOption(''); await productSel(page).selectOption('PRD-NEW-003'); await t.settle(200)
  await chips(page).filter({ hasText: 'Empty Mug (out of stock)' }).click(); await t.settle(300)
  t.ck('IR-054: tapping a Product chip puts the composer back on the Scene it came from and selects that Product', await sceneSel(page).inputValue() === 'SCN-NEW-001' && await productSel(page).inputValue() === 'PRD-NEW-002', { scene: await sceneSel(page).inputValue(), product: await productSel(page).inputValue() })
  await sceneSel(page).selectOption(''); await productSel(page).selectOption('PRD-NEW-003'); await t.settle(200)
  await ask(page, t, 'Is it in stock?')
  const opt = await chips(page).allInnerTexts()
  t.ck('the stock question for an option Product asks for the options', opt.some(o => /size/i.test(o)) && opt.some(o => /colour/i.test(o)), opt)
  await productSel(page).selectOption('PRD-NEW-001'); await t.settle(200)
  await chips(page).filter({ hasText: /size/i }).first().click(); await t.settle(300)
  t.ck('IR-054: an option chip restores the Product it was about, then focuses that option', await productSel(page).inputValue() === 'PRD-NEW-003' && await page.evaluate(() => document.activeElement?.id) === 'opt-Size', { product: await productSel(page).inputValue(), active: await page.evaluate(() => document.activeElement?.id) })

  // ---- IR-053: a Variant named in the text stays with that response ----
  await productSel(page).selectOption('PRD-NEW-003'); await t.settle(100)
  await ask(page, t, 'How much, and is it in stock for Size M Red?')
  await productSel(page).selectOption('PRD-NEW-001'); await t.settle(200)
  const intentChips = await chips(page).allInnerTexts()
  await chips(page).filter({ hasText: /stock|availab/i }).first().click(); await t.settle(400)
  const text = await body(page)
  t.ck('IR-053: tapping a chip after the composer moved answers for the named Variant of that Product (M / Red has 2)', /Size M, Red is currently available/.test(text) && /Swap Dress/.test(text), intentChips.join(' | ') + ' // ' + text.slice(-400))
  await page.screenshot({ path: `${OUT}/chips-1440.png` })
})

// ---- IR-055: reopening a changed Scene validates the Product selection ----
await suite('chat-fix01-reopen', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, state(stale))
  await toBuyer(page, t); await openChatOn(page, t, 'Test Kettle')
  t.ck('the stored stale-Scene reply offers "Reopen the Scene"', await chips(page).filter({ hasText: 'Reopen the Scene' }).count() === 1)
  t.ck('the composer starts on the Product the Buyer came from', await productSel(page).inputValue() === 'PRD-NEW-001')
  await chips(page).filter({ hasText: 'Reopen the Scene' }).click(); await t.settle(300)
  t.ck('IR-055: reopening a Scene that no longer tags the selected Product clears the Product and says so', await sceneSel(page).inputValue() === 'SCN-NEW-002' && await productSel(page).inputValue() === '' && /no longer tagged in it, so choose one again/.test(await body(page)), { scene: await sceneSel(page).inputValue(), product: await productSel(page).inputValue() })
  // The same chip against a Scene that still tags the Product keeps it.
  const keep = JSON.parse(JSON.stringify(stale)); keep[CHAT_KEY].messages[1].chips[0].subject = { sellerId: S, scene: { id: 'SCN-NEW-001', revision: 3 }, productId: 'PRD-NEW-001' }
  await page.evaluate(([k, s]) => { const st = JSON.parse(sessionStorage.getItem(k)); st.chats = s; sessionStorage.setItem(k, JSON.stringify(st)) }, [KEY, keep])
  await page.reload({ waitUntil: 'networkidle' }); await t.settle(300)
  await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500); await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
  await openChatOn(page, t, 'Test Kettle')
  await chips(page).filter({ hasText: 'Reopen the Scene' }).click(); await t.settle(300)
  t.ck('IR-055: reopening a Scene that still tags it keeps the Product', await sceneSel(page).inputValue() === 'SCN-NEW-001' && await productSel(page).inputValue() === 'PRD-NEW-001' && !/choose one again/.test(await body(page)))
})

// ---- A Seller reply naming a Product AND a Scene ----
await suite('chat-fix01-reply', { width: 1440, height: 900 }, async (page, t) => {
  await seed(page, state())
  await t.open(); await t.section('Seller Console')
  await page.locator('.seller-console-sidebar nav button').filter({ has: page.locator('text="Inbox"') }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: /Maya T\./ }).first().click(); await t.settle(400)
  const opts = await page.getByLabel('Talking about').locator('option').allInnerTexts()
  const combined = opts.find(o => /Test Kettle in Kettle corner Scene Post/.test(o))
  t.ck('the reply’s "Talking about" offers a Product as shown in a Scene (both, explicit)', !!combined, opts)
  const groups = await page.getByLabel('Talking about').locator('optgroup').evaluateAll(gs => gs.map(g => [g.label, [...g.querySelectorAll('option')].map(o => o.textContent)]))
  t.ck('it is listed with the Scene Posts, once', groups.find(([l]) => l === 'Scene Posts')?.[1].filter(o => /Test Kettle in Kettle corner/.test(o)).length === 1 && !groups.find(([l]) => l === 'Product Posts')?.[1].some(o => / in .* Scene Post/.test(o)), groups)
  await page.getByLabel('Talking about').selectOption({ label: combined })
  await page.getByLabel('Reply', { exact: true }).fill('Both are on the shelf now.'); await page.getByRole('button', { name: 'Send Reply' }).click(); await t.settle(400)
  t.ck('the reply is sent with both named', /Both are on the shelf now\./.test(await page.locator('.seller-console-content').innerText()) && /Test Kettle in Kettle corner Scene Post/.test(await page.locator('.seller-console-content').innerText()))
  await page.screenshot({ path: `${OUT}/seller-reply-1440.png` })
  await toBuyer(page, t)
  await page.getByRole('button', { name: 'Shop', exact: true }).last().click().catch(() => {}); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('test kettle'); await t.settle(450)
  await page.locator('button', { hasText: 'Test Kettle' }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(700)
  t.ck('the Buyer sees the reply attributed to the Product and the Scene together', /about Test Kettle in Kettle corner Scene Post/.test(await body(page)), (await body(page)).slice(-500))
})
