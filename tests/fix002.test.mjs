// FIX-002: Variant price, stock and option validation; an unresolved price is never shown as ETB 0.
import { suite } from './harness.mjs'

const nav = async (page, t, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await t.settle(450) }

await suite('fix002', { width: 1440, height: 900 }, async (page, t) => {
  await t.open(); await t.section('Seller Console'); await nav(page, t, 'Products')
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
  await page.getByLabel('Product name').fill('Variant Test Shirt')
  await page.getByRole('button', { name: 'Add an option' }).click(); await t.settle(150)
  await page.getByLabel('Option 1 name').fill('Size')
  for (const v of ['S', 'M']) { await page.getByLabel('Add a value').first().fill(v); await page.getByLabel('Add a value').first().press('Enter') }
  await t.settle(200)
  const publish = async () => { await page.getByRole('button', { name: 'Publish Product' }).click(); await t.settle(300); return page.locator('.seller-console-content').innerText() }

  let body = await publish()
  t.ck('Variants with no own price and no base price are blocked', /S: set a price here or a base price/.test(body) && /M: set a price here or a base price/.test(body), body.slice(0, 400))
  t.ck('Preview shows no price rather than ETB 0', !/ETB 0\b/.test(body))

  await page.getByLabel('S price').fill('99999999999'); await page.getByLabel('M price').fill('-5')
  await page.getByLabel('S stock').fill('100001'); await page.getByLabel('M stock').fill('abc')
  body = await publish()
  t.ck('huge price rejected', /S: price must be above zero and at most 1,000,000/.test(body))
  t.ck('negative price rejected', /M: price must be above zero and at most 1,000,000/.test(body))
  t.ck('stock above the limit rejected', /S: enter the quantity as a whole number from 0 to 100,000/.test(body))
  t.ck('non-numeric stock rejected', /M: enter the quantity as a whole number from 0 to 100,000/.test(body))

  for (const bad of ['1e3', 'Infinity', '0', '12.345', '1,2,3']) {
    await page.getByLabel('Base price (ETB)').fill(bad); await page.getByLabel('S price').fill(''); await page.getByLabel('M price').fill('')
    body = await publish()
    t.ck(`base price "${bad}" is not accepted (variants stay unresolved)`, /set a price here or a base price/.test(body), bad)
  }

  await page.getByRole('button', { name: 'Add an option' }).click(); await t.settle(150)
  await page.getByLabel('Option 2 name').fill(' size ')
  await page.getByLabel('Add a value').last().fill('X'); await page.getByLabel('Add a value').last().press('Enter'); await t.settle(200)
  body = await publish()
  t.ck('two options with the same name are rejected', /Two options are both called/.test(body), body.slice(0, 500))
  await page.getByLabel('Remove option 2').click(); await t.settle(150)

  await page.getByLabel('Option 1 name').fill('')
  body = await publish()
  t.ck('an option without a name is reported', /Option 1 needs a name and at least one value/.test(body))
  await page.getByLabel('Option 1 name').fill('Size')

  await page.getByLabel('Base price (ETB)').fill('1200'); await page.getByLabel('S stock').fill('3'); await page.getByLabel('M stock').fill('0')
  body = await publish()
  t.ck('valid base price resolves every Variant', !/set a price here or a base price/.test(body) && !/price must be above zero/.test(body), body.slice(0, 400))
})
