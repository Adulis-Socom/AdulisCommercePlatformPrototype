// DATA-FIX-01 (IR-046, IR-048, IR-050): the REAL path Seller authoring -> live registry -> Buyer -> chatbot, with swapped and repeated option values.
// The Product is authored through the Seller Console UI (category, attributes, photo, two options that share values, a price and stock per Variant),
// published, then read by the Buyer's Product page, Cart and the scripted chatbot. No synthetic ProductFacts.
import { suite } from './harness.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.env.TEST_EVIDENCE || 'tests/results/evidence/data-fix01'
mkdirSync(OUT, { recursive: true })
const png = join(OUT, 'fixture.png')
writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'))
const body = page => page.locator('body').innerText()

await suite('data-fix01', { width: 1440, height: 900 }, async (page, t) => {
  await t.open(); await t.section('Seller Console')
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle()
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
  await page.getByLabel('Product name').fill('Swap Dress')
  await page.getByLabel('Description').fill('A dress used to test exact Variants.')
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' })
  await page.getByLabel('Subcategory').selectOption({ label: 'Women’s Clothing' })
  await page.getByLabel('Type', { exact: true }).selectOption({ label: 'Dresses' }); await t.settle(500)
  await page.getByLabel('Material', { exact: true }).selectOption({ label: 'Linen' })
  await page.getByLabel('Care', { exact: true }).selectOption({ label: 'Machine wash' })
  await page.locator('input[type=file]').setInputFiles(png); await t.settle(800)
  // Two options that share the values "Plain" and "Fancy", listed in swapped order.
  await page.getByRole('button', { name: 'Add an option' }).click()
  await page.getByLabel('Option 1 name').fill('Tier')
  for (const v of ['Plain', 'Fancy']) { await page.getByLabel('Add a value').first().fill(v); await page.getByLabel('Add a value').first().press('Enter') }
  await page.getByRole('button', { name: 'Add an option' }).click()
  await page.getByLabel('Option 2 name').fill('Grade')
  for (const v of ['Fancy', 'Plain']) { await page.getByLabel('Add a value').nth(1).fill(v); await page.getByLabel('Add a value').nth(1).press('Enter') }
  t.ck('four combinations, none dropped', (await page.getByLabel(/ price$/).count()) === 4)
  await page.getByLabel('Price (ETB)').or(page.getByLabel('Base price (ETB)')).first().fill('900')
  const rows = { 'Plain / Fancy': ['1100', '1'], 'Plain / Plain': ['1000', '2'], 'Fancy / Fancy': ['1300', '0'], 'Fancy / Plain': ['1200', '4'] }
  for (const [label, [price, stock]] of Object.entries(rows)) { await page.getByLabel(`${label} price`).fill(price); await page.getByLabel(`${label} stock`).fill(stock) }
  await page.getByRole('button', { name: 'Publish Product' }).click(); await t.settle()
  t.ck('published through the Seller Console', /Published \(simulated\)/.test(await body(page)), (await body(page)).slice(0, 300))

  // ---- IR-050: the option-count limit never truncates silently ----
  await page.getByRole('button', { name: 'Add an option' }).click()
  await page.getByLabel('Option 3 name').fill('Extra')
  let refused = ''
  for (let i = 0; i < 20; i++) {
    await page.getByLabel('Add a value').nth(2).fill(`e${i}`); await page.getByLabel('Add a value').nth(2).press('Enter')
    if (/combinations\. A Product can list at most 60/.test(await body(page))) { refused = `e${i}`; break }
  }
  const listed = await page.getByLabel(/ price$/).count()
  t.ck('adding a value that would exceed 60 combinations is refused with the reason', refused !== '' && /at most 60/.test(await body(page)), refused)
  t.ck('the Variants already listed are all kept (15 values x 4 = 60, nothing truncated)', listed === 60 && refused === 'e15', { listed, refused })
  await page.getByRole('button', { name: /Remove option 3/ }).click(); await t.settle(300)
  t.ck('removing the option restores the four combinations', (await page.getByLabel(/ price$/).count()) === 4)
  await page.getByRole('button', { name: /Back to Products/ }).click().catch(() => {}); await t.settle(300)
  await page.getByRole('button', { name: 'Discard changes' }).click().catch(() => {}); await t.settle(300)

  // ---- Buyer: the exact Variant by option NAME and position ----
  await t.section('Mobile — Buyer')
  await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('swap dress'); await t.settle(450)
  await page.locator('button', { hasText: 'Swap Dress' }).first().click(); await t.settle(500)
  const pick = async (group, value) => page.getByText(`Choose ${group}`, { exact: true }).locator('xpath=following-sibling::div[1]').getByRole('button', { name: value, exact: true }).click()
  await pick('tier', 'Fancy'); await pick('grade', 'Plain'); await t.settle(200)
  t.ck('Tier Fancy + Grade Plain is its own Variant (ETB 1,200), not Plain/Fancy', /Price for this option: ETB 1,200/.test(await body(page)), (await body(page)).match(/Price for this option[^\n]*/)?.[0])
  await pick('tier', 'Plain'); await pick('grade', 'Fancy'); await t.settle(200)
  t.ck('Tier Plain + Grade Fancy is ETB 1,100', /Price for this option: ETB 1,100/.test(await body(page)))
  await pick('tier', 'Fancy'); await t.settle(200)
  t.ck('Tier Fancy + Grade Fancy has no stock and cannot be added', /This option is out of stock/.test(await body(page)) && await page.getByRole('button', { name: 'Add to Cart' }).isDisabled())
  await pick('grade', 'Plain'); await pick('tier', 'Plain'); await t.settle(200)
  t.ck('Tier Plain + Grade Plain is offered (its ETB 1,000 is the lowest price of the Product, so no separate note)', !/not offered|out of stock/.test(await body(page)) && await page.getByRole('button', { name: 'Add to Cart' }).isEnabled())
  await pick('tier', 'Fancy'); await t.settle(200)
  await page.getByRole('button', { name: 'Add to Cart' }).click(); await t.settle(400)
  await page.screenshot({ path: `${OUT}/variant-added-1440.png` })
  t.ck('the Cart line carries the exact Variant price (ETB 1,200)', /1,200/.test(await body(page)))

  // ---- Chatbot: authored taxonomy and exact Variant data survive the shared-data path ----
  await t.section('Seller Console'); await t.section('Mobile — Buyer')
  await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Signed in', exact: true }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await t.settle(300)
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('swap dress'); await t.settle(450)
  await page.locator('button', { hasText: 'Swap Dress' }).first().click(); await t.settle(500)
  await page.getByRole('button', { name: 'Ask Seller' }).click(); await t.settle(700)
  const ask = async text => { await page.getByLabel('Message', { exact: true }).fill(text); await page.getByRole('button', { name: 'Send', exact: true }).click(); await t.settle(300); return body(page) }
  let text = await ask('What is the material?')
  t.ck('IR-046: the authored Material (Linen) is answered from the Product record', /Linen/.test(text), text.slice(-400))
  text = await ask('How do I care for it?')
  t.ck('IR-046: the authored Care attribute (Machine wash) is answered', /Machine wash/.test(text), text.slice(-400))
  text = await ask('What neckline does it have?')
  t.ck('a taxonomy field the Seller left unset (Neckline) is reported as not listed, never invented', /not listed/.test(text.split('What neckline does it have?').pop() ?? ''))
  text = await ask('How much is the Tier Fancy Grade Plain?')
  t.ck('IR-048: the chatbot prices the exact Variant (ETB 1,200)', /1,200/.test(text.split('How much is the Tier Fancy Grade Plain?').pop() ?? ''), text.slice(-400))
  text = await ask('Is the Tier Fancy Grade Fancy in stock?')
  t.ck('the chatbot reports the zero-stock Variant as out of stock', /out of stock|not available|unavailable/i.test(text.split('Is the Tier Fancy Grade Fancy in stock?').pop() ?? ''), text.slice(-400))
  text = await ask('Is Fancy in stock?')
  const tail = text.split('Is Fancy in stock?').pop() ?? ''
  t.ck('a value that two options share is not guessed: the Buyer is asked which option', /tier|grade|option/i.test(tail) && !/in stock\./i.test(tail.split('\n')[0] ?? ''), tail.slice(0, 300))
  await page.screenshot({ path: `${OUT}/chat-1440.png` })
})
