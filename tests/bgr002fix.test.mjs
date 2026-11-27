import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path');
const OUT = EVIDENCE;
const png = path.join(OUT, 'fixture.png');
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  // a small synthetic gradient PNG (no real photo)
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC';
  require('fs').writeFileSync(png, Buffer.from(b64, 'base64'));
  for (const [w, hgt] of [[1440, 900], [390, 844]]) await run({ width: w, height: hgt }, async (page, h) => {
    await h.open();
    await h.section('Seller Console');
    if (w < 700) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await h.settle(300); } // phone: navigation is a drawer
    await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await h.settle();
    await page.getByRole('button', { name: 'Create Product' }).click(); await h.settle();
    await page.locator('input[type=file]').setInputFiles(png); await h.settle();
    await page.getByRole('button', { name: /^Edit photo/ }).first().click(); await h.settle(500);
    const text = await page.locator('[role=group][aria-label^="Edit photo"]').innerText();
    h.ck(`${w}: unavailable message shown`, /This model is unavailable/.test(text), text.slice(0, 200));
    h.ck(`${w}: option labelled unavailable`, /\(unavailable\)/.test(await page.locator('select').first().innerText()));
    const btn = page.getByRole('button', { name: /Remove background|Retry/ }).first();
    h.ck(`${w}: Remove background disabled`, await btn.isDisabled());
    h.ck(`${w}: original preview present`, await page.getByRole('img', { name: /^Original:/ }).isVisible());
    h.ck(`${w}: token input disabled`, await page.getByLabel('Adapter token').isDisabled());
    h.ck(`${w}: no request to adapter port`, !h.requests.some(x => x.endsWith(':8765')) , h.requests);
    await h.shot(path.join(OUT, `after-unavailable-${w}.png`), { fullPage: true });
  });
})();
