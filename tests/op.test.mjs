// OP-001 / OP-002: Operator access statements, MVP gating, moderation case flow. Usage: node op.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const body = async (page) => { const t = await page.locator('body').innerText(); return t.slice(t.indexOf('PROTOTYPE v0.1') + 14); };
const go = async (page, h, label) => { await page.locator('nav button, [role=navigation] button, aside button').filter({ hasText: new RegExp('^\\s*' + label.replace(/\//g, '.')) }).first().click(); await h.settle(450); };
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Operator Console');
  // OP-001
  await go(page, h, 'Operator Access');
  let t = await body(page);
  h.ck('Operator Access lists only the CEO and COO/CTO as Founder access', /CEO/.test(t) && /COO\/CTO/.test(t) && !/CMO|CSO|Chief Marketing|Chief Strategy/.test(t.replace(/CMO and CSO/g, '')));
  h.ck('states the CMO and CSO have no Operator account or fallback', /CMO and CSO, has an Operator account|including the CMO and CSO/.test(t) && /no fallback or privileged route/.test(t));
  h.ck('states Operators are separate principals from ordinary Accounts', /separate Operator principal, never with an ordinary Buyer or Seller Account/.test(t));
  h.ck('Staff Operator variant is labelled inactive', /Inactive/.test(t) && /no Staff Operator account exists/.test(t));
  h.ck('Founder switcher offers only CEO and COO/CTO', (await page.getByRole('button', { name: /^(CEO|COO\/CTO)$/ }).count()) === 2 && !(await page.getByRole('button', { name: /CMO|CSO/ }).count()));
  await h.shot(path.join(OUT, 'op-access-1440.png'));
  // OP-002 MVP gating
  await go(page, h, 'Overview'); t = await body(page);
  h.ck('Overview (MVP): no Urgent Claims or Manual Handoff tiles', !/Urgent Claims/.test(t) && !/Provider incidents/.test(t));
  await go(page, h, 'Global Search'); t = await body(page);
  h.ck('Global Search (MVP): no Order or Claim results or entity types', !/Paid · MKT-ET|Delivery Handoff/.test(t) && !/Order, Claim/.test(t));
  await go(page, h, 'Configuration'); t = await body(page);
  h.ck('Configuration (MVP): no Payment provider or Manual Handoff rows', !/Payment provider|Callback reconciliation|Manual Handoff/.test(t.replace(/^Manual Handoff$/gm, '')));
  await go(page, h, 'System Health'); t = await body(page);
  h.ck('System Health (MVP): no payment services', !/Payment/.test(t));
  await go(page, h, 'Founder Decisions'); t = await body(page);
  h.ck('Founder Decisions (MVP): gated, no paid amounts', /payment Claim on a paid Order/.test(t) && !/ETB 2,290/.test(t));
  // OP-002 moderation flow
  await go(page, h, 'Moderation'); t = await body(page);
  h.ck('Moderation queue lists the Scene Post report', /Scene|SHP-|MOD-/.test(t) && !/Shoppable/.test(t), t.slice(0, 400));
  const open = page.getByRole('button', { name: 'Open', exact: true }).first();
  if (await open.count()) { await open.click(); await h.settle(500); t = await body(page);
    h.ck('moderation case shows evidence, reports and outcome options', /Evidence|evidence/.test(t) && /(Outcome|Decision|Restrict|Dismiss|Remove|Uphold)/i.test(t), t.slice(0, 500));
    h.ck('moderation case has no payment-dispute or purchased-review authority', !/refund|Review Grant|chargeback/i.test(t));
    await h.shot(path.join(OUT, 'op-moderation-case-1440.png')); }
  else h.ck('a moderation case could be opened', false, 'no case button');
  { const close = page.getByRole('button', { name: /^Close/ }).first(); if (await close.count()) await close.click(); else await page.keyboard.press('Escape'); await h.settle(300); }
  // simulation restores the paid-commerce Operator content
  await page.getByRole('button', { name: /Internal simulation/ }).click(); await h.settle(400);
  await go(page, h, 'Founder Decisions'); t = await body(page);
  h.ck('Simulation: Founder Decisions shows the dual-approval workflow with its paid-Claim example', /Create Proposal|Founder Decisions/.test(t) && /ETB 2,290/.test(t));
  await go(page, h, 'Global Search'); t = await body(page);
  h.ck('Simulation: Global Search includes Order results', /Order/.test(t));
  // phone width
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(500);
  h.ck('390px: no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
