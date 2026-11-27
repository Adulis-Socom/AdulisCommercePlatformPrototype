// BUG-008: Components and System States boards carry a design-record note in MVP mode, none in the simulation. Usage: node boards.cjs
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const NOTE = /Design-system reference\. Some (states|examples) /;
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open();
  await h.section('System States'); h.ck('System States (MVP): design-record note', NOTE.test(await page.locator('body').innerText()));
  await h.section('Components'); h.ck('Components (MVP): design-record note', NOTE.test(await page.locator('body').innerText()));
  await page.getByRole('button', { name: /Internal simulation/ }).click(); await h.settle(300);
  h.ck('Components (simulation): no note', !NOTE.test(await page.locator('body').innerText()));
  await h.section('System States'); h.ck('System States (simulation): no note', !NOTE.test(await page.locator('body').innerText()));
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(400);
  h.ck('390px System States: no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 1);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
