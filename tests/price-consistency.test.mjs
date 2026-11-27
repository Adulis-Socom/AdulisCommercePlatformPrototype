// SYS-001: the discounted Cotton Shirt Dress shows the same current price (ETB 2,200) on the Console list, the Companion catalogue and the Storefront.
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await h.settle(500);
  const row = page.locator('.seller-console-content li', { hasText: 'Cotton Shirt Dress' }).first();
  const t = await row.innerText();
  h.ck('Console list: current price ETB 2,200 with the regular price and discount shown', /ETB 2,200/.test(t) && /2,750/.test(t) && /20% off/.test(t), t);
  await h.section('Seller Companion'); await page.locator('nav').last().getByRole('button', { name: /Catalogue/ }).click(); await h.settle(400);
  const c = await page.getByRole('listitem').filter({ hasText: 'Cotton Shirt Dress' }).first().innerText();
  h.ck('Companion catalogue: ETB 2,200', /ETB 2,200/.test(c), c);
  await h.section('Seller Storefront'); await page.getByRole('tab', { name: 'Products' }).click(); await h.settle(400);
  const s = await page.locator('body').innerText();
  h.ck('Storefront: Cotton Shirt Dress at ETB 2,200', /Cotton Shirt Dress/.test(s) && /ETB 2,200/.test(s));
});
