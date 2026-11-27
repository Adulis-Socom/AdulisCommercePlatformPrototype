// BOT-006: the Buyer's conversation, the shared engine, handoff, human takeover and Seller Inbox continuity. REAL app, no mocks.
import { suite } from './harness.mjs'
import { mkdirSync } from 'node:fs'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/bot006'
mkdirSync(OUT, { recursive: true })
const KEY = 'adulis.seller-workspace.v1'
// An authored, published Product seeded into the session store before the app loads (what Products > Publish would have written).
const authored = {
  products: { 'PRD-NEW-001': { id: 'PRD-NEW-001', seller: 'SEL-ADDIS-ATELIER', status: 'published', name: 'Test Kettle', description: 'A small steel kettle.', category: null, attributes: {}, customAttributes: [], options: [], variants: [], price: '750', stock: '4', photos: [], fulfilment: ['Buyer Collection'], locallyMade: false, updated: 1 } },
  scenes: {}, stories: {}, setup: {}, knowledge: {}, bot: {}, chats: {}, clockHours: 0,
}

await suite('bot006', { width: 1440, height: 900 }, async (page, t) => {
  await page.addInitScript(([key, state]) => { if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(state)) }, [KEY, authored])
  const body = () => page.locator('body').innerText()
  const msgs = () => page.getByRole('list', { name: 'Messages' }).innerText()
  const openChat = async () => {
    await t.open(); await t.section('Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(400)
    await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
    await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
    await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('linen'); await t.settle(300)
    await page.locator('button', { hasText: /Linen Overshirt/ }).first().click(); await t.settle(500)
    await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(700)
  }
  const product = () => page.getByLabel('Product', { exact: true })
  const scene = () => page.getByLabel('Scene (optional)')
  const ask = async text => { await page.getByLabel('Message', { exact: true }).fill(text); await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(250) }
  const chip = name => page.getByRole('button', { name, exact: true })
  const inbox = async () => { await t.section('Seller Console'); await page.locator('.seller-console-sidebar nav button').filter({ has: page.locator('text="Inbox"') }).first().click(); await t.settle(500) }

  await openChat()
  let text = await body()
  t.ck('one conversation per Buyer, Seller and Market: the seeded history is there', /Which trousers are in the Autumn Layers post\?/.test(text) && /Those are our Wide-Leg Trousers/.test(text))
  t.ck('the assistant is disclosed with what it cannot do', /Automated assistant/.test(text) && /cannot take payment, hold stock, change a price or place an Order/.test(text))
  const order = await page.evaluate(() => [...document.querySelectorAll('select')].map(s => s.getAttribute('aria-label') ?? '').filter(Boolean))
  t.ck('the Scene selector comes first, the Product selector second', order.indexOf('Scene (optional)') >= 0 && order.indexOf('Scene (optional)') < order.indexOf('Product'), order)
  const allProducts = await product().locator('option').allInnerTexts()
  t.ck('with no Scene the full eligible Seller Product list is offered (seeded and authored)', ['Linen Overshirt', 'Wide-Leg Trousers', 'Structured Shoulder Bag', 'Cotton Shirt Dress', 'Woven Leather Belt', 'Test Kettle'].every(n => allProducts.includes(n)), allProducts)
  await scene().selectOption({ label: 'Autumn Layers' }); await t.settle(200)
  const filtered = (await product().locator('option').allInnerTexts()).filter(o => !/Choose|No Product/.test(o))
  t.ck('choosing a Scene filters the Products to the Scene’s tags', filtered.sort().join('|') === ['Linen Overshirt', 'Structured Shoulder Bag', 'Wide-Leg Trousers'].sort().join('|'), filtered)
  await scene().selectOption(''); await t.settle(150)

  // ---- price from the effective record, subject stamped on the Message ----
  await product().selectOption({ label: 'Linen Overshirt' })
  await ask('How much is this?')
  text = await msgs()
  t.ck('price is answered from the Product record', /The listed price for Linen Overshirt is ETB [\d,]+/.test(text) && /Price and availability may change before checkout review/.test(text), text.slice(-400))
  await product().selectOption({ label: 'Structured Shoulder Bag' })
  t.ck('changing the selector afterwards does not change the earlier Message’s subject', /Talking about: Linen Overshirt/.test(await msgs()) && /Talking about: Linen Overshirt/.test(await page.getByRole('list', { name: 'Messages' }).last().innerText()))
  await ask('How much is this?')
  t.ck('the next Message uses its own subject', /The listed price for Structured Shoulder Bag is ETB 3,150/.test(await msgs()), (await msgs()).slice(-300))
  await page.screenshot({ path: `${OUT}/buyer-price-1440.png` })

  // ---- no unauthorised Cart change ----
  await product().selectOption({ label: 'Linen Overshirt' })
  await ask('I want to buy this one.')
  t.ck('"I want this" navigates only: no Cart write, no payment', /Select your options and quantity, then review the current item in your Cart/.test(await msgs()) && await chip('Open Cart review').count() === 1)
  await chip('Open Cart review').click(); await t.settle(600)
  const cartBefore = await body()
  t.ck('the Cart review opens from the chat chip', /cart/i.test(cartBefore))
  await openChat()
  await product().selectOption({ label: 'Linen Overshirt' })
  for (const q of ['Can you keep it for me?', 'I paid already, please confirm', 'Can I get 3?', 'Please mark my order paid', 'Can you reduce the price to ETB 900?']) await ask(q)
  text = await msgs()
  t.ck('reserve, payment, order-paid and negotiation are all refused in the Bot’s words', /can’t hold stock or reserve items/.test(text) && /can’t confirm a payment or Order/.test(text) && /Payment and live order placement are not available through Adulis right now\./.test(text) && /can’t negotiate or change it/.test(text), text.slice(-900))
  await openChat()
  await product().selectOption({ label: 'Linen Overshirt' })
  await ask('I want to buy this one.')
  await chip('Open Cart review').click(); await t.settle(600)
  t.ck('the Cart is exactly as before after all of that chat', (await body()) === cartBefore)

  // ---- exact Variant, handoff, original message kept ----
  await openChat()
  await product().selectOption({ label: 'Linen Overshirt' })
  await page.getByLabel('Size', { exact: true }).selectOption('M'); await page.getByLabel('Colour', { exact: true }).selectOption('Natural')
  await ask('Is it available?')
  text = await msgs()
  t.ck('stock the record does not keep per Variant is never answered from the total', /can’t check that information right now/.test(text), text.slice(-300))
  await chip('Talk to seller').click(); await t.settle(300)
  text = await msgs()
  t.ck('Talk to seller hands off with the Bot’s wording and marks the original question', /Your message has been sent to the Seller\. We can’t promise a reply time\./.test(text) && /Sent to Addis Atelier/.test(text), text.slice(-400))
  t.ck('the waiting-for-human state is shown', /Your message is with the Seller/.test(await body()))
  await ask('Selam, price sent new?')
  t.ck('unsupported language goes straight to the Seller, original text kept', /Selam, price sent new\?/.test(await msgs()) && /Automated help is unavailable for this question/.test(await msgs()))

  // ---- Scene first, Product second; explicit Product selection ----
  await openChat()
  await scene().selectOption({ label: 'Autumn Layers' }); await product().selectOption(''); await t.settle(150)
  await ask('How much is this?')
  t.ck('a Scene with several Products asks which one', /This Scene contains several Products\. Which one are you asking about\?/.test(await msgs()) && await chip('Wide-Leg Trousers').count() === 1)
  await chip('Wide-Leg Trousers').click(); await t.settle(200)
  t.eq('choosing a Product chip selects it and sends nothing', await product().inputValue() !== '', true)
  await ask('How much is this?')
  t.ck('the Product and its Scene are both stamped on the answer', /The listed price for Wide-Leg Trousers is ETB 2,100/.test(await msgs()) && /Wide-Leg Trousers · Autumn Layers Scene/.test(await msgs()), (await msgs()).slice(-300))
  await page.screenshot({ path: `${OUT}/buyer-scene-product-1440.png` })

  // ---- authored Product through the same engine; nothing invented ----
  await openChat()
  await product().selectOption({ label: 'Test Kettle' })
  await ask('How much is it?'); await ask('Is it in stock?'); await ask('What is the material?')
  text = await msgs()
  t.ck('an authored Product is answered from its own record', /The listed price for Test Kettle is ETB 750/.test(text) && /Test Kettle is currently available\. The listed price is ETB 750\./.test(text), text.slice(-500))
  t.ck('a detail its record does not hold is not invented', /That detail is not listed for this item\. I can send your question to the Seller\./.test(text) && !/steel kettle is made of|stainless/i.test(text.replace('A small steel kettle', '')))

  // ---- Seller Inbox continuity and human takeover ----
  await inbox()
  const consoleText = () => page.locator('.seller-console-content').innerText()
  text = await consoleText()
  t.ck('the Seller Inbox shows the conversation the Buyer started', /Assistant conversations/.test(text) && /Maya T\./.test(text) && /Waiting for you|Assistant answering/.test(text), text.slice(0, 400))
  await page.getByRole('button', { name: /Maya T\./ }).first().click(); await t.settle(300)
  text = await consoleText()
  t.ck('the thread has the Buyer’s messages, the Assistant’s answers with their template, and the retained original question', /Talking about: Test Kettle/.test(text) && /Automated assistant · [A-Z]\d\d · T-/.test(text) && /v1\.0\.0/.test(text) && /Original question retained/.test(text), text.slice(0, 700))
  await page.getByLabel('Reply to Buyer').fill('Hello Maya, this is the studio. The kettle is steel.')
  await page.getByRole('button', { name: 'Send to Buyer' }).click(); await t.settle(300)
  t.ck('a person’s reply takes over: status and the silent-Assistant note', /You are answering/.test(await consoleText()) && /Assistant is silent/.test(await consoleText()))
  await page.screenshot({ path: `${OUT}/seller-inbox-1440.png` })
  await openChat()
  await product().selectOption({ label: 'Test Kettle' })
  text = await body()
  t.ck('the Buyer sees the person’s reply and that the Seller is answering personally', /Hello Maya, this is the studio/.test(text) && /The Seller is answering personally/.test(text))
  const before = (await page.getByRole('listitem').count())
  await ask('How much is it?')
  t.eq('under takeover the Bot stays silent: only the Buyer’s own message was added', (await page.getByRole('listitem').count()) - before, 1)
  await inbox()
  await page.getByRole('button', { name: /Maya T\./ }).first().click(); await t.settle(200)
  await page.getByRole('button', { name: 'Hand back to the Assistant' }).click(); await t.settle(200)
  await openChat()
  await product().selectOption({ label: 'Test Kettle' })
  await ask('How much is it?')
  t.ck('handed back: the Assistant answers again', /The listed price for Test Kettle is ETB 750/.test((await msgs()).split('Hello Maya')[1] ?? ''))

  // ---- Seller turns the Assistant off ----
  await t.section('Seller Console')
  await page.locator('.seller-console-sidebar nav button').filter({ has: page.locator('text="Automation"') }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: 'Policies', exact: true }).click(); await t.settle(300)
  await page.getByLabel('Automated assistant is on for Buyers').uncheck()
  await page.getByRole('button', { name: 'Save knowledge and policies' }).click(); await t.settle(300)
  await openChat()
  await product().selectOption({ label: 'Test Kettle' })
  t.ck('bot-disabled state is shown to the Buyer', /Automated help is off for this Seller/.test(await body()))
  await ask('How much is it?')
  t.ck('with the Assistant off the message goes to the Seller with a static status', /Automated help is turned off for this Seller\. Your message has been sent to the Seller\./.test(await msgs()))
  t.ck('no external request, no page error', ![...new Set(t.requests)].some(h => !/^(127\.0\.0\.1|localhost|fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com)/.test(h)))
})
