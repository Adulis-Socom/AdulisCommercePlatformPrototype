// MB-004: Buyer cart (Seller-separated), quantity, empty state, checkout review preview. Usage: node mb004.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const body = (page) => page.locator('body').innerText();
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Mobile — Buyer');
  await page.getByRole('button', { name: 'Explore as guest' }).click(); await h.settle(500);
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await h.settle(300);
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('linen'); await h.settle(300);
  const productBtn = page.locator('button', { hasText: /Linen Overshirt/ }).first();
  h.ck('Search finds the seeded Linen Overshirt', await productBtn.count() >= 1);
  await productBtn.click(); await h.settle(500);
  let t = await body(page);
  h.ck('Product detail offers Add to Cart and Quantity', /Add to Cart/.test(t) && /Quantity/i.test(t));
  await page.getByRole('button', { name: '+', exact: true }).click();
  await page.getByRole('button', { name: 'Add to Cart' }).click(); await h.settle(400);
  t = await body(page);
  h.ck('Add to Cart confirms with quantity 2', /Quantity 2/.test(t));
  await page.getByRole('button', { name: 'View cart', exact: true }).click(); await h.settle(500);
  t = await body(page);
  h.ck('Seller cart shows the line, and no surcharge or Seller Order wording', /Linen Overshirt/.test(t) && !/surcharge/i.test(t) && !/Seller Order/i.test(t), t.slice(0, 600));
  await page.getByRole('button', { name: /Increase Linen Overshirt quantity/ }).click(); await h.settle(200);
  const phone = () => page.locator('.phone-stage').innerText();
  h.ck('quantity increases to 3 and the subtotal is 3 x ETB 2,450', /\n3\n/.test(await phone()) && /Cart subtotal\nETB 7,350/.test(await phone()), (await phone()).slice(200, 600));
  await page.getByRole('button', { name: /Decrease Linen Overshirt quantity/ }).click(); await h.settle(200);
  h.ck('quantity decreases to 2 and the subtotal is 2 x ETB 2,450', /\n2\n/.test(await phone()) && /Cart subtotal\nETB 4,900/.test(await phone()), (await phone()).slice(200, 600));
  await h.shot(path.join(OUT, 'mb004-cart-1440.png'));
  const remove = page.getByRole('button', { name: /Remove/ }).first();
  h.ck('a line can be removed', await remove.count() >= 1);
  await remove.click(); await h.settle(300);
  const confirm = page.getByRole('button', { name: /^Remove$|Remove item|Confirm/ }); if (await confirm.count()) await confirm.first().click();
  await h.settle(300);
  t = await body(page);
  h.ck('empty cart state is explained', /cart is empty/i.test(t), t.slice(0, 400));
  await h.shot(path.join(OUT, 'mb004-cart-empty-1440.png'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
