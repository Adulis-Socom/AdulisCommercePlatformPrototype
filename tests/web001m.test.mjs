// WEB-001 mobile pages (390px): no obsolete claims in MVP mode. Usage: node web001m.cjs
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const BAD = /every delivery|delivery generates|verifiable evidence|gateway|cash on delivery|pay when|\bQR\b|handoff|paid orders?|\bGMV\b|before you pay|raise a claim|claims? (record|history)|courier pool|order management|pay per seller|seller order/i;
const ALLOW = /not available yet|do not apply yet|Release 1 (preview|has no)/i;
const body = async (page) => { const t = await page.locator('body').innerText(); return t.slice(t.indexOf('PROTOTYPE v0.1') + 14); };
const hits = (t) => t.split(String.fromCharCode(10)).map(s => s.trim()).filter(s => BAD.test(s) && !ALLOW.test(s));
run({ width: 390, height: 844 }, async (page, h) => {
  await h.open(); await h.section('Company Website'); await h.settle(500);
  const menu = page.getByRole('button', { name: /menu/i }).first();
  const open = async (label) => { if (await menu.count()) { await menu.click(); await h.settle(250); } await page.getByRole('button', { name: label, exact: true }).first().click(); await h.settle(450); };
  let all = hits(await body(page)).map(s => 'Home: ' + s.slice(0, 100));
  for (const label of ['How It Works', 'For Sellers', 'Trust & Safety']) {
    try { await open(label); } catch (e) { h.ck(`open ${label}`, false, String(e).slice(0, 120)); continue; }
    all = all.concat(hits(await body(page)).map(s => `${label}: ${s.slice(0, 100)}`));
  }
  h.ck('390px MVP: no obsolete claims on the mobile Website pages', all.length === 0, all);
  h.ck('390px MVP: Release 1 banner shown', /Release 1 preview/.test(await body(page)));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
