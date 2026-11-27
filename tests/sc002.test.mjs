// SC-002/SC-003 browser checks: Product authoring. Usage: node sc002.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const txt = (page) => page.locator('body').innerText();
const toProducts = async (page, h) => { await h.section('Seller Console'); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await h.settle(); };

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await toProducts(page, h);
  let t = await txt(page);
  h.ck('list: seeded Products shown, no GMV/Performance column', /Linen Overshirt/.test(t) && !/GMV/.test(t), t.slice(0, 700));
  await h.shot(path.join(OUT, 'products-list-1440.png'));
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  // publish empty -> all blockers at once
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  const alert = page.getByRole('alert').first();
  t = await alert.innerText();
  h.ck('empty publish: summary lists name, category, photo, price, stock', /Product name/.test(t) && /category/i.test(t) && /photo/i.test(t) && /price/i.test(t) && /quantity/i.test(t), t);
  h.ck('empty publish: nothing saved (still draft, no id)', /New Product/.test(await txt(page)));
  await page.getByRole('button', { name: /Add a Product name/ }).click().catch(() => {});
  // save draft requires a name
  await page.getByRole('button', { name: 'Save draft' }).click(); await h.settle();
  h.ck('draft without name: field error', /Add a Product name/.test(await txt(page)));
  await page.getByLabel('Product name').fill('Test Linen Dress');
  await page.getByLabel('Description').fill('A light linen dress for warm days.');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Women’s Clothing' });
  const typeSel = page.getByLabel('Type', { exact: true });
  h.ck('category: type selector offered for Fashion category with list', await typeSel.count() === 1);
  const typeOptions = await typeSel.locator('option').allInnerTexts();
  await typeSel.selectOption({ index: 1 }); await h.settle(800);
  t = await txt(page);
  h.ck('attributes: category-dependent selects loaded', (await page.locator('select').count()) > 6, typeOptions.slice(0, 4));
  await h.shot(path.join(OUT, 'product-editor-attributes-1440.png'), { fullPage: true });
  // photo
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(800);
  // options -> variants
  await page.getByRole('button', { name: 'Add an option' }).click();
  await page.getByLabel('Option 1 name').fill('Size');
  await page.getByLabel('Add a value').first().fill('S'); await page.getByLabel('Add a value').first().press('Enter');
  await page.getByLabel('Add a value').first().fill('M'); await page.getByLabel('Add a value').first().press('Enter');
  await page.getByRole('button', { name: 'Add an option' }).click();
  await page.getByLabel('Option 2 name').fill('Colour');
  await page.getByLabel('Add a value').nth(1).fill('Red'); await page.getByLabel('Add a value').nth(1).press('Enter');
  h.ck('variants: 2 combinations generated', (await page.getByLabel(/price$/).count()) >= 2 && /S \/ Red/.test(await txt(page)) && /M \/ Red/.test(await txt(page)));
  await page.getByLabel('Price (ETB)').or(page.getByLabel('Base price (ETB)')).first().fill('1800');
  await page.getByLabel('S / Red stock').fill('5'); await page.getByLabel('M / Red stock').fill('x');
  h.ck('variant stock: invalid text flagged', /Whole number/.test(await txt(page)));
  await page.getByLabel('M / Red stock').fill('2');
  h.ck('total stock = 7 and availability Available', /Total stock\s*7/.test((await txt(page)).replace(/\n/g, ' ')) && /Available/.test(await txt(page)));
  await page.getByRole('button', { name: 'Save draft' }).click(); await h.settle();
  h.ck('draft saved with banner and id', /Draft saved/.test(await txt(page)) && /PRD-NEW-001/.test(await txt(page)));
  await page.getByRole('button', { name: /Preview/ }).first().click(); await h.settle();
  h.ck('preview shows photo, name and From price', await page.getByRole('img', { name: /Preview of Test Linen Dress/ }).count() === 1 && /From|ETB 1,800/.test(await txt(page)));
  await h.shot(path.join(OUT, 'product-editor-preview-1440.png'), { fullPage: true });
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  h.ck('publish: success banner (simulated), status published', /Published \(simulated\)/.test(await txt(page)) && await page.getByRole('button', { name: 'Save changes' }).count() === 1, (await txt(page)).slice(0, 300));
  // persistence: back to list shows it, then full reload keeps it
  await page.getByRole('button', { name: /Back to Products/ }).click(); await h.settle();
  t = await txt(page);
  h.ck('list: new Product published with price and stock', /Test Linen Dress/.test(t) && /7 available/.test(t));
  await page.reload({ waitUntil: 'networkidle' }); await toProducts(page, h);
  h.ck('persistence: Product survives reload (session)', /Test Linen Dress/.test(await txt(page)));
  // reopen: photo and variants restored
  await page.getByRole('button', { name: /Test Linen Dress/ }).click(); await h.settle(1000);
  h.ck('reopen: variants and photo restored', /S \/ Red/.test(await txt(page)) && (await page.locator('[role=group][aria-label^="Edit photo"], button[aria-label^="Edit photo"]').count()) >= 1);
  // out of stock
  await page.getByLabel('S / Red stock').fill('0'); await page.getByLabel('M / Red stock').fill('0'); await h.settle();
  h.ck('out of stock explained', /Out of stock: this Product stays viewable/.test(await txt(page)));
  await h.shot(path.join(OUT, 'product-editor-out-of-stock-1440.png'));
  await page.getByRole('button', { name: /Back to Products/ }).click(); await h.settle();
  h.ck('unsaved changes: leave confirmation', /Leave without saving/.test(await txt(page)));
  await page.getByRole('button', { name: 'Discard changes' }).click(); await h.settle();
  // seeded edit
  await page.getByRole('button', { name: /Linen Overshirt/ }).first().click(); await h.settle();
  h.ck('seeded edit opens prefilled, no category demanded', (await page.getByLabel('Product name').inputValue()) === 'Linen Overshirt' && !/Choose a category \(required/.test(await txt(page)));
  await page.getByLabel('Price (ETB)').fill('abc');
  await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
  h.ck('seeded edit: invalid price blocked', /price above zero/.test(await txt(page)));
  await page.getByLabel('Price (ETB)').fill('2900');
  await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
  await page.getByRole('button', { name: /Back to Products/ }).click(); await h.settle();
  h.ck('seeded override shows new price', /ETB 2,900/.test(await txt(page)));
  // Cosmetics gap
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Cosmetics' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Skincare' });
  t = await txt(page);
  h.ck('Cosmetics: taxonomy-incomplete notice, generic details offered', /Taxonomy incomplete for this category/i.test(t) && /Add a detail/.test(t));
  await h.shot(path.join(OUT, 'product-editor-cosmetics-gap-1440.png'));
  // keyboard: tab order reaches Publish
  h.ck('no page errors', h.errors.length === 0, h.errors);
});

run({ width: 390, height: 844 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  h.ck('390px: Seller Console opens without horizontal page overflow', (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1);
  h.ck('390px: Seller Console shows its sections', /Products/.test(await txt(page)));
});
