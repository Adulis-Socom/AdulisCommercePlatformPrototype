// FE-001 browser checks: current-MVP mode vs internal simulation. Usage: node fe001.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path');
const OUT = EVIDENCE;
require('fs').mkdirSync(OUT, { recursive: true });
const txt = (page) => page.locator('body').innerText();
const flow = async (page, h, title) => { await h.section('ADULIS MASTER DEMO'); await page.getByRole('button', { name: new RegExp(title) }).first().click(); await h.settle(600); };

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open();
  // 1. Master Demo page
  let t = await txt(page);
  h.ck('landing: current MVP headline + start button', /Start master demo/.test(t) && /\d+ STEPS/.test(t));
  h.ck('landing: simulation group is labelled', /Internal simulation . DEMO/i.test(t) && /Historical paid-commerce design/.test(t));
  h.ck('landing: Scene Post wording, no "Shoppable"', !/Shoppable/.test(t), t.match(/.{20}Shoppable.{20}/));
  await h.shot(path.join(OUT, 'landing-1440.png'), { fullPage: true });

  // 2. Checkout review flow (CR): cart then review, in MVP mode
  await flow(page, h, 'Cart and Checkout Review');
  t = await txt(page);
  h.ck('CR step1: Seller-separated cart note is MVP wording', /Checkout is a preview: no Order is placed/.test(t), t.slice(0, 300));
  h.ck('CR step1: no Seller Order wording', !/each checkout creates one distinct Seller Order/.test(t));
  await h.shot(path.join(OUT, 'mvp-cart-1440.png'));
  await page.getByRole('button', { name: /Next frame/ }).click(); await h.settle(600);
  t = await txt(page);
  h.ck('CR step2: disclosure shown', /Checkout preview only\. No Order will be placed and no money will be collected\./.test(t));
  h.ck('CR step2: no surcharge / provider wording', !/surcharge/i.test(t) && !/payment provider/i.test(t), t.match(/.{30}surcharge.{30}/i));
  h.ck('CR step2: submission disabled', await page.getByRole('button', { name: 'Order submission unavailable' }).isDisabled());
  h.ck('CR step2: estimated costs section', /Estimated costs/i.test(t) && /Estimated total/i.test(t));
  await h.shot(path.join(OUT, 'mvp-checkout-review-1440.png'));
  await page.getByRole('button', { name: 'Close guided flow' }).click(); await h.settle();

  // 3. Buyer Orders tab gated in MVP, and simulation via sidebar toggle shows real screens
  await h.section('Mobile — Buyer');
  await page.getByRole('button', { name: /Explore|Continue as guest|Browse/i }).first().click().catch(() => {}); await h.settle(500);
  const ordersTab = page.getByRole('button', { name: /^Orders/ }).first();
  if (await ordersTab.count()) {
    await ordersTab.click(); await h.settle(500);
    t = await txt(page);
    h.ck('Buyer: Orders tab shows MVP gate (or sign-in) not an Order list', /Not in the current MVP|Sign in/i.test(t) && !/ADU-2409/.test(t), t.slice(0, 200));
  } else h.ck('Buyer: orders tab reachable', false);

  // 4. Simulation toggle
  await page.getByRole('button', { name: 'Internal simulation', exact: true }).click(); await h.settle(500);
  t = await txt(page);
  h.ck('Simulation: persistent badge visible', /INTERNAL SIMULATION . DEMO/.test(t));
  await h.shot(path.join(OUT, 'simulation-badge-1440.png'));
  await page.getByRole('button', { name: 'Current MVP', exact: true }).click(); await h.settle(300);
  h.ck('Back to MVP removes badge', !(await page.getByRole('status').filter({ hasText: 'INTERNAL SIMULATION' }).count()));

  // 5. Seller Console
  await h.section('Seller Console');
  t = await txt(page);
  h.ck('Console home: Start here, no Paid Orders card', /Start here/.test(t) && !/Next Paid Orders/.test(t) && !/Paid Seller Orders only/.test(t));
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Orders/ }).first().click(); await h.settle();
  t = await txt(page);
  h.ck('Console Orders: gate', /Not in the current MVP/i.test(t) && /no paid Orders/.test(t));
  await h.shot(path.join(OUT, 'console-orders-gate-1440.png'));
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Claims/ }).first().click(); await h.settle();
  h.ck('Console Claims: gate', /Payment and refund Claims are deferred/.test(await txt(page)));
  // simulation restores historical Orders
  await page.getByRole('button', { name: 'Internal simulation', exact: true }).click(); await h.settle();
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Orders/ }).first().click(); await h.settle();
  h.ck('Console Orders in simulation: Seller Orders list', /Seller Orders/.test(await txt(page)));
  await page.getByRole('button', { name: 'Current MVP', exact: true }).click(); await h.settle();

  // 6. Companion / Courier / Operator
  await h.section('Mobile — Seller Companion');
  await page.getByRole('button', { name: /^Catalogue/ }).first().click(); await h.settle();
  h.ck('Companion MVP: the Orders tab is a Catalogue, with no Orders gate and no Paid Orders title', /Catalogue/.test(await txt(page)) && !/Paid Orders/.test(await txt(page)) && !/Not in the current MVP/i.test(await txt(page)));
  await h.section('Mobile — Courier');
  await page.getByRole('button', { name: /^Active/ }).first().click(); await h.settle();
  h.ck('Courier Active: gate', /Not in the current MVP/i.test(await txt(page)));
  await h.shot(path.join(OUT, 'courier-gate-1440.png'));
  await h.section('Operator Console');
  await page.getByRole('button', { name: /^Claims/ }).first().click(); await h.settle();
  h.ck('Operator Claims: gate', /Claims queue/i.test(await txt(page)) && /Not in the current MVP/i.test(await txt(page)));
  await h.section('Seller Storefront');
  t = await txt(page);
  h.ck('Storefront: no "order, and track" promise', !/Browse, order, and track/.test(t));
});
