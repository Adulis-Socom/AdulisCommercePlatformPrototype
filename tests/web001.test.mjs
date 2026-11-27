// WEB-001: Company Website in MVP mode has no claims about payment, handoff, Courier delivery, paid Orders, Claims; the simulation keeps them. Usage: node web001.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
// What Release 1 must not claim (copy that describes unavailable capabilities). Explanatory "not available yet" sentences are excluded below.
const BAD = /every delivery|delivery generates|verifiable evidence|gateway pay|gateway confirm|cash on delivery|pay when|\bQR\b|delivery qr|pickup qr|handoff evidence|verified handoff|paid orders?|\bGMV\b|you pay|before you pay|pay before|raise a claim|claims? (record|history|rate)|courier pool|courier fulfilment|order management|seller preps|courier picks up/i;
const ALLOW = /not available yet|do not apply yet|Release 1 (preview|has no)/i;
const PAGES = [['How It Works', 'how-it-works'], ['For Sellers', 'for-sellers'], ['For Buyers', 'for-buyers'], ['Trust & Safety', 'trust'], ['Availability', 'availability'], ['About', 'about'], ['Pricing', 'pricing'], ['Help', 'help']];
const LEGAL = ['Terms of Service', 'Seller Terms'];
const body = async (page) => { const t = await page.locator('body').innerText(); return t.slice(t.indexOf('PROTOTYPE v0.1') + 14); };
const hits = (t) => t.split(String.fromCharCode(10)).map(s => s.trim()).filter(s => BAD.test(s) && !ALLOW.test(s));
const goto = async (page, h, label) => {
  const link = page.getByRole('button', { name: label, exact: true }); const alt = page.getByRole('link', { name: label, exact: true });
  const el = (await link.count()) ? link.first() : alt.first(); await el.click(); await h.settle(500);
};
const sweep = async (page, h, tag, expectClean) => {
  await goto(page, h, 'How It Works').catch(() => {});
  let all = [];
  for (const [label] of PAGES) {
    try { await goto(page, h, label); } catch { console.log(`  (no link for ${label})`); continue; }
    const t = await body(page); const bad = hits(t); all = all.concat(bad.map(s => `${label}: ${s.slice(0, 110)}`));
  }
  await page.getByRole('button', { name: /Adulis/ }).first().click().catch(() => {}); await h.settle(400);
  const bh = hits(await body(page)); all = all.concat(bh.map(s => `Home: ${s.slice(0, 110)}`));
  if (expectClean) h.ck(`${tag}: no obsolete claim on any page`, all.length === 0, all);
  else h.ck(`${tag}: historical claims are kept (copy preserved)`, all.length >= 5, all.length);
};
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Company Website'); await h.settle(500);
  let t = await body(page);
  h.ck('MVP: Release 1 banner is shown', /Release 1 preview/.test(t));
  await h.shot(path.join(OUT, 'web-home-mvp-1440.png'));
  await sweep(page, h, 'MVP desktop', true);
  await goto(page, h, 'Trust & Safety'); t = await body(page);
  h.ck('MVP Trust page still shows Seller Admission and the Trust Ladder', /Seller Admission/i.test(t) && /Trust Ladder/i.test(t));
  await h.shot(path.join(OUT, 'web-trust-mvp-1440.png'));
  await goto(page, h, 'How It Works'); t = await body(page);
  h.ck('MVP How it works keeps Discover, Product and Cart steps and ends before ordering', /Discover/.test(t) && /Cart/.test(t) && !/Gateway Payment|Handoff/.test(t));
  await h.shot(path.join(OUT, 'web-how-mvp-1440.png'));
  for (const label of LEGAL) { await goto(page, h, label); h.ck(`MVP ${label}: legal draft is unedited but carries the Release 1 notice`, /do not apply yet/.test(await body(page))); }
  // simulation keeps the historical copy
  await page.getByRole('button', { name: /Internal simulation/ }).click(); await h.settle(400);
  h.ck('Simulation: no Release 1 banner', !/Release 1 preview/.test(await body(page)));
  await sweep(page, h, 'Simulation desktop', false);
  await page.getByRole('button', { name: /Current MVP/ }).click(); await h.settle(300);
  // phone width
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(500);
  h.ck('390px: no horizontal overflow on the Website', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  await h.shot(path.join(OUT, 'web-home-mvp-390.png'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
