// MC-002: Courier in MVP mode: relationships, opportunities, invitations; delivery screens isolated. Usage: node mc002.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const body = (page) => page.locator('body').innerText();
const phoneText = async (page) => { const t = await body(page); return t.slice(t.indexOf('PROTOTYPE v0.1') + 14); };
const RX = /paid|payment|handoff|OTP|\bQR\b|earnings|payout|\bOrders?\b|checkout/i;
const nav = (page) => page.locator('nav').last();
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Mobile — Courier');
  await nav(page).getByRole('button', { name: /^Account/ }).click(); await h.settle(300);
  await page.getByRole('button', { name: /Approved Seller Relationships/ }).click(); await h.settle(400);
  let t = await phoneText(page);
  h.ck('Approved Seller Relationships lists Sellers with relationship status', /Addis Atelier|Nura Glow|Volt House/.test(t) && /(Approved|approved)/.test(t), t.slice(0, 400));
  h.ck('relationship screen has no payment/Order/handoff wording', !RX.test(t), t.split(String.fromCharCode(10)).filter(s => RX.test(s)));
  await h.shot(path.join(OUT, 'mc002-relationships-1440.png'));
  await page.getByRole('button', { name: /Back/ }).first().click().catch(() => {}); await h.settle(300);
  await nav(page).getByRole('button', { name: /^Account/ }).click(); await h.settle(300);
  await page.getByRole('button', { name: /^Opportunities/ }).click(); await h.settle(400);
  t = await phoneText(page);
  h.ck('Opportunities lists Seller Pools to apply to', /Apply|apply/.test(t), t.slice(0, 400));
  h.ck('opportunities screen has no payment/Order/handoff wording', !RX.test(t), t.split(String.fromCharCode(10)).filter(s => RX.test(s)));
  const apply = page.getByRole('button', { name: /Apply/ }).first();
  if (await apply.count()) { await apply.click(); await h.settle(400); h.ck('an application can be started or submitted', /appl|Pending|pending|request/i.test(await phoneText(page)), (await phoneText(page)).slice(0, 300)); }
  await h.shot(path.join(OUT, 'mc002-opportunities-1440.png'));
  for (let i = 0; i < 4 && !(await nav(page).getByRole('button', { name: /^Active/ }).count()); i++) { const b = page.getByRole('button', { name: /^Back/ }).first(); if (!(await b.count())) break; await b.click(); await h.settle(300); }
  // delivery screens are isolated
  for (const tab of ['Active', 'History']) {
    await nav(page).getByRole('button', { name: new RegExp('^' + tab) }).click(); await h.settle(300);
    t = await phoneText(page);
    h.ck(`${tab}: explains that live delivery is not part of Release 1`, /not part of Release 1|simulation/i.test(t), t.slice(0, 300));
  }
  // account availability controls work
  await nav(page).getByRole('button', { name: /^Account/ }).click(); await h.settle(300);
  await page.getByRole('button', { name: 'Busy', exact: true }).click(); await h.settle(200);
  h.ck('availability can be set to Busy', /Busy/.test(await phoneText(page)));
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(400);
  h.ck('390px: no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
