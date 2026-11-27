// SF-001: public Storefront shows authored Products and Scenes, no web Cart/checkout, unavailable content, mobile layout. Usage: node sf001.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const txt = (page) => page.locator('.seller-console-content').innerText();
const nav = async (page, h, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await h.settle(450); };
const body = (page) => page.locator('body').innerText();
const RX = /Add to Cart|Buy now|Checkout|Place order|pay now|payment|surcharge/i;
const setStock = async (page, h, v) => {
  await h.section('Seller Console'); await nav(page, h, 'Products'); await page.getByRole('button', { name: /Store Dress/ }).first().click(); await h.settle(900);
  await page.getByLabel('Available quantity').fill(String(v)); await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
};
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open();
  await h.section('Seller Console');
  await nav(page, h, 'Products'); await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  await page.getByLabel('Product name').fill('Store Dress'); await page.getByLabel('Description').fill('A dress for the storefront test.');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Women’s Clothing' });
  await page.getByLabel('Type', { exact: true }).selectOption({ index: 1 }); await h.settle(600);
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(700);
  await page.getByLabel('Price (ETB)').fill('1500'); await page.getByLabel('Available quantity').fill('5');
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  h.ck('Product published in the Console', /Published \(simulated\)/.test(await txt(page)), (await txt(page)).slice(0, 400));
  await nav(page, h, 'Content'); await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A dress'); await page.getByLabel('Caption').fill('Storefront scene caption');
  await page.getByLabel('Product to tag').selectOption({ label: 'Store Dress (5 in stock)' }); await page.getByRole('button', { name: 'Place at centre' }).click();
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  h.ck('Scene published in the Console', /Published \(simulated\)/.test(await txt(page)));
  // Storefront
  await h.section('Seller Storefront'); await h.settle(500);
  let t = await body(page);
  h.ck('Scenes tab shows the authored Scene', /Storefront scene caption/.test(t));
  await page.getByRole('button', { name: /Storefront scene caption/ }).first().click(); await h.settle(400);
  t = await body(page);
  h.ck('Scene detail lists the tagged authored Product', /Store Dress/.test(t));
  await h.shot(path.join(OUT, 'sf001-scene-1440.png'));
  await page.getByRole('button', { name: 'Scenes' }).first().click(); await h.settle(300);
  await page.getByRole('tab', { name: 'Products' }).click(); await h.settle(400);
  t = await body(page);
  h.ck('Products tab lists the authored Product with its price', /Store Dress/.test(t) && /ETB 1,500/.test(t));
  await h.shot(path.join(OUT, 'sf001-products-1440.png'));
  await page.getByRole('button', { name: /Store Dress/ }).first().click(); await h.settle(400);
  t = await body(page);
  h.ck('Product detail shows description and Available', /A dress for the storefront test/.test(t) && /Available/.test(t));
  h.ck('no web Cart, checkout or payment control; the page says ordering is not available', (await page.getByRole('button', { name: /^(Add to Cart|Buy now|Checkout|Place order|Pay)/i }).count()) === 0 && /Ordering is not available yet/.test(t));
  h.ck('app handoff is offered', /Open in Adulis/i.test(t));
  await h.shot(path.join(OUT, 'sf001-product-1440.png'));
  // unavailable: stock 0 -> Product still listed as Out of Stock, Scene no longer shown
  await setStock(page, h, 0);
  await h.section('Seller Storefront'); await h.settle(500);
  h.ck('all tagged Products unavailable: the Scene is not shown on the Storefront', !/Storefront scene caption/.test(await body(page)));
  await page.getByRole('tab', { name: 'Products' }).click(); await h.settle(400);
  h.ck('the Product stays listed and is marked Out of Stock', /Store Dress/.test(await body(page)) && /Out of Stock/.test(await body(page)));
  await setStock(page, h, 4);
  await h.section('Seller Storefront'); await h.settle(500);
  h.ck('restock: the Scene returns automatically', /Storefront scene caption/.test(await body(page)));
  // phone width
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(500);
  h.ck('390px: no horizontal overflow on the Storefront', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await h.shot(path.join(OUT, 'sf001-390.png'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
