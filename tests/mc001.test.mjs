// MC-001: Seller Companion in MVP mode: Catalogue tab (stock stepper shared with the workspace), Order-free Inbox. Usage: node mc001.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const body = (page) => page.locator('body').innerText();
const nav = (page) => page.locator('nav').last();
const stockOf = async (page, name) => Number(await page.getByRole('listitem').filter({ hasText: name }).first().locator('[aria-live=polite]').innerText());
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Companion');
  const tabs = (await nav(page).getByRole('button').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
  h.ck('tabs: Alerts, Catalogue, Inbox, More (no Orders gate tab)', tabs.some(t => /Catalogue/.test(t)) && !tabs.some(t => /^Orders/.test(t)), tabs);
  await nav(page).getByRole('button', { name: /Catalogue/ }).click(); await h.settle(400);
  let t = await body(page);
  h.ck('Catalogue lists seeded Products with price and stock state', /Linen Overshirt/.test(t) && /ETB/.test(t) && /(Available|Low Stock|Out of Stock)/.test(t));
  const phoneText = t.slice(t.indexOf('PROTOTYPE v0.1') + 14); const hit = phoneText.split(String.fromCharCode(10)).filter(s => /paid|payment|Orders?/i.test(s));
  h.ck('no Order or payment wording in the Catalogue phone screen', hit.length === 0, hit);
  await h.shot(path.join(OUT, 'mc001-catalogue-1440.png'));
  const before = await stockOf(page, 'Linen Overshirt');
  await page.getByRole('button', { name: 'Decrease Linen Overshirt stock' }).click(); await h.settle(200);
  const after = await stockOf(page, 'Linen Overshirt');
  h.ck('stock stepper changes the quantity', after === before - 1, { before, after });
  // the change reaches the Seller Console
  await h.section('Seller Console');
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await h.settle(500);
  h.ck('Seller Console Products shows the new stock', new RegExp(`${after} available`).test(await page.locator('.seller-console-content').innerText()), (await page.locator('.seller-console-content').innerText()).slice(0, 400));
  // back to Companion: stepper to zero -> Out of Stock
  await h.section('Seller Companion'); await nav(page).getByRole('button', { name: /Catalogue/ }).click(); await h.settle(300);
  h.ck('the change persisted across surfaces', await stockOf(page, 'Linen Overshirt') === after);
  for (let i = 0; i < after; i++) await page.getByRole('button', { name: 'Decrease Linen Overshirt stock' }).click();
  await h.settle(200);
  t = await body(page);
  h.ck('at zero the Product shows Out of Stock and the decrease control is disabled', /Out of Stock/.test(t) && await page.getByRole('button', { name: 'Decrease Linen Overshirt stock' }).isDisabled());
  await page.getByRole('button', { name: 'Increase Linen Overshirt stock' }).click(); await h.settle(200);
  h.ck('restock works', await stockOf(page, 'Linen Overshirt') === 1);
  // Inbox
  await nav(page).getByRole('button', { name: /Inbox/ }).click(); await h.settle(400);
  t = await body(page);
  h.ck('Inbox has no Order-context chips', !/Talking about: Order/.test(t) && /Maya T\./.test(t), t.slice(0, 400));
  await page.getByRole('button', { name: /Maya/ }).first().click(); await h.settle(400);
  t = await body(page);
  h.ck('conversation shows Product and Scene context only, with neutral quick replies', !/ADU-2\d{4}/.test(t) && /Thank you/.test(t) && !/Courier assigned/.test(t), t.slice(0, 500));
  await h.shot(path.join(OUT, 'mc001-conversation-1440.png'));
  // 390px
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(500);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  h.ck('390px: no horizontal overflow in the Companion conversation', o <= 1, o);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
