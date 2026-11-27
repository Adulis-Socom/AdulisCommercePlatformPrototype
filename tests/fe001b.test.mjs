// FE-001 follow-up checks: Guide, simulation flows enable the mode, phone width. Usage: node fe001b.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path');
const OUT = EVIDENCE;
const txt = (page) => page.locator('body').innerText();

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open();
  await h.section('Prototype Guide');
  let t = await txt(page);
  h.ck('Guide: release scope section', /Release scope: current MVP and internal simulation/i.test(t) && /Deferred/.test(t));
  h.ck('Guide: no Shoppable wording', !/Shoppable/.test(t));
  await h.shot(path.join(OUT, 'guide-top-1440.png'));
  // A simulation flow turns the simulation on and reaches its payment screens
  await h.section('ADULIS MASTER DEMO');
  await page.getByRole('button', { name: /Discovery to Paid Order/ }).first().click(); await h.settle(700);
  h.ck('Flow C: simulation badge on', /INTERNAL SIMULATION . DEMO/.test(await txt(page)));
  await page.getByRole('button', { name: 'Close guided flow' }).click(); await h.settle();
  await h.section('ADULIS MASTER DEMO');
  await page.getByRole('button', { name: /Historical full-commerce demo/ }).first().click(); await h.settle(700);
  h.ck('Historical demo: starts in simulation', /INTERNAL SIMULATION . DEMO/.test(await txt(page)));
  await page.getByRole('button', { name: 'Close guided flow' }).click(); await h.settle();
  await page.getByRole('button', { name: 'Current MVP', exact: true }).click(); await h.settle();
  await h.section('ADULIS MASTER DEMO');
  await page.getByRole('button', { name: 'Start master demo' }).click(); await h.settle(700);
  h.ck('MVP master demo: no badge', !(await page.getByRole('status').filter({ hasText: 'INTERNAL SIMULATION' }).count()));
  t = await txt(page);
  h.ck('MVP master demo: step 1 of 11', /Step 1 of 11/i.test(t));
  for (let i = 0; i < 10; i++) { await page.getByRole('button', { name: /Next frame/ }).click(); await h.settle(450); }
  h.ck('MVP master demo: last step reached (Operator moderation)', /Step 11 of 11/i.test(await txt(page)));
  h.ck('MVP master demo: no page errors so far', h.errors.length === 0, h.errors);
  await h.shot(path.join(OUT, 'mvp-master-last-step-1440.png'));
});

run({ width: 390, height: 844 }, async (page, h) => {
  await h.open();
  await h.shot(path.join(OUT, 'landing-390.png'), { fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  h.ck('390: landing has no horizontal page overflow', !overflow);
  await page.getByRole('button', { name: /Cart and Checkout Review/ }).first().click(); await h.settle(700);
  await page.getByRole('button', { name: /Next frame/ }).click(); await h.settle(700);
  const t = await txt(page);
  h.ck('390: checkout review disclosure', /Checkout preview only\. No Order will be placed/.test(t));
  await h.shot(path.join(OUT, 'mvp-checkout-review-390.png'));
  await page.getByRole('button', { name: 'Close guided flow' }).click().catch(() => {});
});
