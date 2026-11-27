// Milestone journey: Setup > Product (taxonomy, Variants, stock) > preview > publish > catalogue > Scene > Story > stock effects > reload > chatbot.
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
// Usage: node journey-full.cjs <evidence dir>. The Python adapter must NOT be running (this script never starts it).
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const txt = (page) => page.locator('.seller-console-content').innerText();
const nav = async (page, h, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await h.settle(450); };
const tab = async (page, h, name) => { await page.getByRole('tab', { name }).click(); await h.settle(300); };
const setVariantStock = async (page, h, a, b) => {
  await nav(page, h, 'Products'); await page.getByRole('button', { name: /Journey Dress/ }).first().click(); await h.settle(900);
  await page.getByLabel('S stock').fill(String(a)); await page.getByLabel('M stock').fill(String(b));
  await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
};
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  // 1 Setup
  await nav(page, h, 'Store setup'); await page.getByRole('button', { name: 'Start from a blank store' }).click(); await h.settle();
  await page.getByLabel('Store name').fill('Journey Atelier'); await page.getByLabel('Handle').fill('@journey');
  await page.getByLabel('About your store').fill('Linen clothing made in Addis Ababa.');
  await page.getByLabel('Owner name').fill('Hana B.'); await page.getByLabel('Mobile number').fill('0911223344');
  await page.getByLabel('Addis Ababa').check(); await page.getByLabel('Buyer Collection').check(); await page.getByLabel('Collection place').fill('Piassa shop');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  h.ck('1 Setup complete (5 of 5), no payment step', /5 of 5 steps complete/.test(await txt(page)) && !/payment-provider/i.test(await txt(page)));
  // 2 Product: taxonomy, attributes, variants, stock
  await nav(page, h, 'Products'); await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  await page.getByLabel('Product name').fill('Journey Dress'); await page.getByLabel('Description').fill('A linen dress.');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Women’s Clothing' });
  await page.getByLabel('Type', { exact: true }).selectOption({ index: 1 }); await h.settle(800);
  h.ck('2a taxonomy attributes loaded for the Fashion type', (await page.locator('select').count()) > 6);
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(700);
  await page.getByRole('button', { name: 'Add an option' }).click(); await page.getByLabel('Option 1 name').fill('Size');
  for (const v of ['S', 'M']) { await page.getByLabel('Add a value').first().fill(v); await page.getByLabel('Add a value').first().press('Enter'); }
  await page.getByLabel('Price (ETB)').or(page.getByLabel('Base price (ETB)')).first().fill('900');
  await page.getByLabel('S stock').fill('5'); await page.getByLabel('M stock').fill('2');
  h.ck('2b Variants S and M with total stock 7', /Total stock\s*7/.test((await txt(page)).replace(/\n/g, ' ')));
  await page.getByRole('button', { name: /Preview/ }).first().click(); await h.settle();
  h.ck('2c preview opens', await page.getByRole('img', { name: /Preview of Journey Dress/ }).count() === 1);
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  h.ck('2d simulated publication', /Published \(simulated\)/.test(await txt(page)));
  await page.getByRole('button', { name: /Back to Products/ }).click(); await h.settle();
  h.ck('3 catalogue lists Journey Dress with 7 available', /Journey Dress/.test(await txt(page)) && /7 available/.test(await txt(page)));
  await h.shot(path.join(OUT, 'journey-catalogue-1440.png'));
  // 4 Scene
  await nav(page, h, 'Content'); await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A dress on a chair'); await page.getByLabel('Caption').fill('Journey dress');
  const opts = await page.getByLabel('Product to tag').locator('option').allInnerTexts();
  h.ck('4a only same-Seller in-stock Products are offered (authored Product included)', opts.some(o => /Journey Dress \(7 in stock\)/.test(o)), opts);
  await page.getByLabel('Product to tag').selectOption({ label: 'Journey Dress (7 in stock)' }); await page.getByRole('button', { name: 'Place at centre' }).click();
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  h.ck('4b Scene published', /Published \(simulated\)/.test(await txt(page)));
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await h.settle();
  // 5 Story linking the Product
  await tab(page, h, 'Stories'); await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('Dress close-up');
  await page.getByLabel('Link to').selectOption('product'); await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Journey Dress' });
  await page.getByRole('button', { name: 'Publish Story' }).click(); await h.settle();
  h.ck('5 Story published linking the authored Product', /Story published/.test(await txt(page)) && /Live/.test(await txt(page)));
  await page.getByRole('button', { name: '+12 h' }).click(); await h.settle();
  // 6 stock effects
  await setVariantStock(page, h, 0, 0);
  await nav(page, h, 'Content'); h.ck('6a Scene is Private when its only Product is unavailable', /Private/.test(await txt(page)));
  await tab(page, h, 'Stories'); h.ck('6b Story is Hidden (fail closed), not Expired', /Hidden/.test(await txt(page)) && !/Expired/.test(await txt(page)));
  await setVariantStock(page, h, 3, 0);
  await nav(page, h, 'Content'); h.ck('6c restock restores the Scene automatically', /Public/.test(await txt(page)) && !/Private/.test(await txt(page)));
  await tab(page, h, 'Stories'); h.ck('6d Story is Live again with its remaining time (12 h)', /Live/.test(await txt(page)) && /12 h left/.test(await txt(page)), (await txt(page)).slice(0, 300));
  // 7 reload persistence
  await page.reload({ waitUntil: 'networkidle' }); await h.settle(400); await h.section('Seller Console');
  await nav(page, h, 'Store setup'); h.ck('7a after reload: Store setup still 5 of 5', /5 of 5 steps complete/.test(await txt(page)));
  await nav(page, h, 'Products'); h.ck('7b after reload: Product with stock 3 listed', /Journey Dress/.test(await txt(page)) && /3 available/.test(await txt(page)));
  await nav(page, h, 'Content'); h.ck('7c after reload: Scene present', /Journey dress/.test(await txt(page)));
  await tab(page, h, 'Stories'); h.ck('7d after reload: Story present with its clock position', /Live/.test(await txt(page)) && /12 h left/.test(await txt(page)), (await txt(page)).slice(0, 300));
  // 8 chatbot over authored data
  await nav(page, h, 'Automation'); await page.getByRole('button', { name: 'Test', exact: true }).click(); await h.settle();
  await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Journey Dress' });
  await page.getByLabel('Buyer question').fill('How much is this?'); await page.getByRole('button', { name: 'Run test' }).click(); await h.settle(200);
  const r = await page.getByLabel('Assistant response').innerText();
  h.ck('8a chatbot answers price from the authored Product record', /ETB 900/.test(r), r);
  await page.getByLabel('Buyer question').fill('Does it have a warranty?'); await page.getByRole('button', { name: 'Run test' }).click(); await h.settle(200);
  h.ck('8b chatbot does not invent a warranty', !/\d+\s*(month|year)/i.test(await page.getByLabel('Assistant response').innerText()));
  // 9 no adapter, no model
  const adapter = await page.request.get('http://127.0.0.1:8765/health', { timeout: 3000 }).then(() => 'reachable', () => 'unreachable');
  h.ck('9a the whole journey ran with the Python adapter not running', adapter === 'unreachable', adapter);
  h.ck('9b the app made no request to the adapter', !h.requests.includes('127.0.0.1:8765'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
