// Verifies commit 6598fb2: release-scope cards on the Prototype Guide at 1440/768/390.
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path');
const OUT = path.join(EVIDENCE, '.');
for (const [w, hgt] of [[1440, 900], [768, 1024], [390, 844]]) run({ width: w, height: hgt }, async (page, h) => {
  await h.open();
  if (w <= 768) { const m = page.getByRole('button', { name: /menu|navigation/i }).first(); if (await m.count()) { await m.click(); await h.settle(300); } }
  await page.getByRole('button', { name: /Prototype Guide/ }).first().click(); await h.settle(500);
  const heading = page.getByRole('heading', { name: /Release scope/ });
  h.ck(`${w}: Release scope section present`, await heading.count() === 1);
  await heading.scrollIntoViewIfNeeded(); await h.settle(200);
  const info = await page.evaluate(() => {
    const hd = [...document.querySelectorAll('h2')].find(e => /Release scope/.test(e.textContent));
    const sec = hd.closest('section'); const cards = [...sec.querySelectorAll('.grid > div')];
    return {
      n: cards.length,
      sides: cards.map(c => { const s = getComputedStyle(c); return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].join('/'); }),
      dots: cards.map(c => { const d = c.querySelector('span[aria-hidden]'); if (!d) return null; const r = d.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), getComputedStyle(d).borderRadius]; }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      clipped: cards.filter(c => c.scrollWidth > c.clientWidth + 1).length,
    };
  });
  h.ck(`${w}: four cards`, info.n === 4, info);
  h.ck(`${w}: uniform 1px border on all four sides (no side-tab)`, info.sides.every(s => s === '1px/1px/1px/1px'), info.sides);
  h.ck(`${w}: each card has a 10px round colour dot`, info.dots.every(d => d && d[0] === 10 && d[1] === 10), info.dots);
  h.ck(`${w}: no horizontal page overflow, no clipped card`, info.overflow <= 1 && info.clipped === 0, info);
  await heading.locator('xpath=ancestor::section').screenshot({ path: path.join(OUT, `release-scope-${w}.png`) });
  h.ck(`${w}: no page errors`, h.errors.length === 0, h.errors);
});
