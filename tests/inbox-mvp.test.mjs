import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
import { ctxOptions } from './ctx-helpers.mjs'
const require = createRequire(import.meta.url)
const path = require('path');
const OUT = path.join(EVIDENCE, '.');
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  await page.locator('.seller-console-sidebar nav button').filter({ has: page.locator('text="Inbox"') }).first().click(); await h.settle(500);
  const c = () => page.locator('.seller-console-content').innerText();
  let t = await c();
  h.ck('MVP inbox: no Order context anywhere', !/Order ADU|Courier assigned|Please check your Order/.test(t), t.slice(0, 500));
  h.ck('MVP inbox: a conversation is selected with Product/Scene messages', /Linen Overshirt|Autumn Layers|13-inch/i.test(t));
  const opts = (await ctxOptions(page)).texts;
  h.ck('MVP inbox: context choices exclude Orders', !opts.some(o => /ADU-/.test(o)) && opts.some(o => /General/i.test(o)), opts);
  h.ck('MVP inbox: neutral quick replies', await page.getByRole('button', { name: 'Thank you for your message' }).count() === 1);
  await page.getByRole('button', { name: 'Thank you for your message' }).click();
  await page.getByRole('button', { name: 'Send Reply' }).click(); await h.settle();
  h.ck('reply sent appears in the thread', /Thank you for your message/.test(await c()));
  await h.shot(path.join(OUT, 'inbox-mvp-1440.png'));
  // simulation still shows Orders
  await page.getByRole('button', { name: /Internal simulation/ }).click(); await h.settle(400);
  t = await c();
  h.ck('simulation inbox still shows Order context', /Order ADU-24091/.test(t) || (await ctxOptions(page)).texts.some(o => /ADU-/.test(o)));
});
