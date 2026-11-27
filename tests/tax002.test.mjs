// TAX-002: taxonomy selectors, searchable long value lists, and safe category change in Product authoring.
import { suite } from './harness.mjs'

await suite('tax002', { width: 1440, height: 900 }, async (page, t) => {
  await t.open(); await t.section('Seller Console')
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle(450)
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
  const pick = async (label, text) => { await page.getByLabel(label, { exact: true }).selectOption({ label: text }); await t.settle(500) }
  await pick('Category', 'Fashion'); await pick('Subcategory', 'Jewellery')
  const typeOptions = await page.getByLabel('Type', { exact: true }).locator('option').allInnerTexts()
  t.ck('Type list comes from the taxonomy (several jewellery types)', typeOptions.length > 5, typeOptions.length)
  await pick('Type', 'Traditional & Cultural Jewellery')

  // A long attribute list gets a search box and filters.
  const search = page.getByLabel('Search Traditional & Cultural Jewellery Type')
  t.eq('80-value list has a search box', await search.count(), 1)
  const select = page.getByLabel('Traditional & Cultural Jewellery Type', { exact: true })
  const all = await select.locator('option').count()
  await search.fill('cross')
  const filtered = await select.locator('option').count()
  t.ck('search narrows the list', filtered > 1 && filtered < all, { all, filtered })
  const first = (await select.locator('option').allInnerTexts())[1]
  await select.selectOption({ label: first })
  await search.fill('')
  t.eq('chosen value kept after clearing the search', await select.inputValue(), first)

  // Category change keeps the value for the way back and warns about it.
  await pick('Subcategory', 'Bags')
  const body = await page.locator('.seller-console-content').innerText()
  t.ck('values that do not fit the new category are reported, not silently wiped', /do not fit this category/.test(body) && body.includes(first), body.slice(0, 200))
  await pick('Subcategory', 'Jewellery'); await pick('Type', 'Traditional & Cultural Jewellery')
  t.eq('choosing the previous category brings the value back', await page.getByLabel('Traditional & Cultural Jewellery Type', { exact: true }).inputValue(), first)
  t.ck('notice gone when the values fit again', !/do not fit this category/.test(await page.locator('.seller-console-content').innerText()))
})
