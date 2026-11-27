// SC-001 / SC-004 / SC-005 browser checks: Store setup, Scene authoring, Story authoring, and their shared rules. Usage: node sc145.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const txt = (page) => page.locator('.seller-console-content').innerText();
const nav = async (page, h, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await h.settle(400); };
const tab = async (page, h, name) => { await page.getByRole('tab', { name }).click(); await h.settle(300); };

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');

  // ---- SC-001 Store setup
  await nav(page, h, 'Store setup');
  let t = await txt(page);
  h.ck('setup: hub with 5 steps, Ethiopia Market, no payment/government-ID requirement', /steps complete/.test(t) && /Market: Ethiopia/.test(t) && /Adulis does not ask for a government ID/.test(t) && !/payment-provider/i.test(t));
  await page.getByRole('button', { name: 'Start from a blank store' }).click(); await h.settle();
  t = await txt(page);
  h.ck('blank store: readiness incomplete with next actions', /Needs attention/.test(t) && /Add a store name/.test(t));
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  h.ck('save incomplete: per-section problems and counts', /still need attention/.test(await txt(page)) && (await page.getByRole('alert').count()) >= 3);
  await h.shot(path.join(OUT, 'setup-incomplete-1440.png'), { fullPage: true });
  // invalid inputs
  await page.getByLabel('Store name').fill('Test Atelier');
  await page.getByLabel('Handle').fill('no spaces!');
  await page.getByLabel('About your store').fill('too short');
  await page.getByLabel('Owner name').fill('Selam T.');
  await page.getByLabel('Mobile number').fill('12345');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  t = await txt(page);
  h.ck('validation: handle, about, phone, coverage, fulfilment messages', /handle of 3 to 30/.test(t) && /at least 20 characters/.test(t) && /Ethiopian mobile number/.test(t) && /at least one area/.test(t) && /fulfilment method/.test(t));
  // stories blocked while incomplete (checked later); now complete it
  await page.getByLabel('Handle').fill('@testatelier');
  await page.getByLabel('About your store').fill('Handmade linen clothing from Addis Ababa.');
  await page.getByLabel('Mobile number').fill('0912 345 678');
  await page.getByLabel('Addis Ababa').check();
  await page.getByLabel('Buyer Collection').check();
  await page.getByLabel('Collection place').fill('Bole studio');
  await page.getByLabel('Seller Delivery').check();
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  t = await txt(page);
  h.ck('delivery fee required when Seller Delivery is on', /delivery charge in birr/.test(t));

  // ---- SC-005 Story blocked while setup incomplete
  await nav(page, h, 'Content'); await tab(page, h, 'Stories');
  await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  h.ck('story: incomplete setup warns', /Store setup is incomplete/.test(await txt(page)));
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A linen shirt on a hanger');
  await page.getByRole('button', { name: 'Publish Story' }).click(); await h.settle();
  h.ck('story: publish blocked until setup complete', /Complete your Store setup/.test(await txt(page)));
  await page.getByRole('button', { name: /Back to Stories/ }).click(); await h.settle();
  await nav(page, h, 'Store setup');
  await page.getByLabel('Delivery charge (ETB)').fill('120');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  t = await txt(page);
  h.ck('setup complete: 5 of 5 steps, ready to publish (simulated)', /5 of 5 steps complete/.test(t) && /ready to publish/i.test(t), t.slice(0, 300));
  await h.shot(path.join(OUT, 'setup-ready-1440.png'), { fullPage: true });

  // ---- SC-004 Scenes
  await nav(page, h, 'Content');
  h.ck('content hub: Scenes, Stories and demonstration tabs', (await page.getByRole('tab').count()) === 3 && /No Scenes yet/.test(await txt(page)));
  await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  t = await txt(page);
  h.ck('scene: empty publish lists photo, caption, tag blockers', /Choose a photo/.test(t) && /short caption/.test(t) && /Tag at least one/.test(t));
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('Linen shirt on a hanger');
  await page.getByLabel('Caption').fill('Easy linen for warm days.');
  await page.getByLabel('Product to tag').selectOption({ label: 'Linen Overshirt (14 in stock)' });
  await page.getByRole('img', { name: 'Linen shirt on a hanger' }).first().click({ position: { x: 5, y: 5 } });
  h.ck('hotspot placed by clicking the photo (geometry from the image box)', await page.getByRole('button', { name: /Hotspot 1: Linen Overshirt/ }).count() === 1);
  const pos = await page.getByLabel('Hotspot 1 horizontal position, percent').inputValue();
  h.ck('hotspot near the clicked corner, accessible numeric position fields', Number(pos) <= 100, pos);
  await page.getByLabel('Hotspot 1 horizontal position, percent').fill('40');
  await page.getByRole('button', { name: /Hotspot 1/ }).focus(); await page.keyboard.press('ArrowRight');
  h.ck('keyboard moves the hotspot', Number(await page.getByLabel('Hotspot 1 horizontal position, percent').inputValue()) === 42);
  await page.getByLabel('Product to tag').selectOption({ label: 'Wide-Leg Trousers (9 in stock)' });
  await page.getByRole('button', { name: 'Place at centre' }).click();
  h.ck('second tag via accessible button', await page.getByRole('button', { name: /Hotspot 2: Wide-Leg Trousers/ }).count() === 1);
  h.ck('out-of-stock Product is not offered for tagging', !(await page.getByLabel('Product to tag').innerHTML()).includes('Woven Leather Belt'));
  await h.shot(path.join(OUT, 'scene-editor-1440.png'), { fullPage: true });
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  h.ck('scene published (simulated), public', /Published \(simulated\)/.test(await txt(page)));
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await h.settle();
  h.ck('scene list shows Public with 2 tags', /Public/.test(await txt(page)) && /2 tags/.test(await txt(page)));

  // Stories with Product link and Scene link
  await tab(page, h, 'Stories');
  await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A linen shirt on a hanger');
  await page.getByLabel('Text').fill('New this week');
  await page.getByLabel('Link to').selectOption('product');
  await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Linen Overshirt' });
  h.ck('story preview shows text and link chip', /View Product: Linen Overshirt/.test(await txt(page)));
  await h.shot(path.join(OUT, 'story-editor-1440.png'), { fullPage: true });
  await page.getByRole('button', { name: 'Publish Story' }).click(); await h.settle();
  t = await txt(page);
  h.ck('story published, Live, 24 h left, no reactions/replies controls', /Story published/.test(t) && /Live/.test(t) && /24 h left/.test(t) && !/reply|react/i.test(t.replace(/cannot reply, react or comment/i, '')));
  await page.getByRole('button', { name: '+12 h' }).click(); await h.settle();
  h.ck('clock +12h: 12 h left', /12 h left/.test(await txt(page)));
  // Scene link when the Scene is public
  await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  await page.getByLabel('Link to').selectOption('scene');
  h.ck('scene link offered for the public Scene', (await page.getByLabel('Scene', { exact: true }).innerText()).includes('Easy linen'));
  await page.getByRole('button', { name: /Back to Stories/ }).click(); await h.settle();

  // Shared rules: out-of-stock Product -> Scene still public (other tag) ; both out -> Private ; Story link hidden
  await nav(page, h, 'Products');
  const setStock = async (name, value) => {
    await page.getByRole('button', { name: new RegExp(name) }).first().click(); await h.settle();
    await page.getByLabel('Available quantity').fill(String(value));
    await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
    await page.getByRole('button', { name: /Back to Products/ }).click(); await h.settle();
  };
  await setStock('Linen Overshirt', 0);
  await nav(page, h, 'Content'); await tab(page, h, 'Stories');
  t = await txt(page);
  h.ck('story whose linked Product is out of stock is Hidden (fail closed)', /Hidden/.test(t) && /not available right now/.test(t));
  await tab(page, h, 'Scenes');
  h.ck('scene stays Public while one tagged Product is in stock', /Public/.test(await txt(page)));
  await nav(page, h, 'Products'); await setStock('Wide-Leg Trousers', 0);
  await nav(page, h, 'Content');
  h.ck('all tagged Products unavailable: Scene is Private', /Private/.test(await txt(page)));
  await page.getByRole('button', { name: /Easy linen/ }).click(); await h.settle();
  h.ck('private Scene explains automatic restoration', /becomes public again on its own/.test(await txt(page)));
  await h.shot(path.join(OUT, 'scene-private-1440.png'));
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await h.settle();
  await nav(page, h, 'Products'); await setStock('Wide-Leg Trousers', 4);
  await nav(page, h, 'Content');
  h.ck('restock restores the Scene to Public automatically', /Public/.test(await txt(page)) && !/Private/.test(await txt(page)));
  await tab(page, h, 'Stories');
  await page.getByRole('button', { name: '+24 h' }).click(); await h.settle();
  h.ck('after 24 more hours the Story is Expired and cannot return', /Expired/.test(await txt(page)) && !/Hidden/.test(await txt(page)));
  await nav(page, h, 'Products'); await setStock('Linen Overshirt', 10);
  await nav(page, h, 'Content'); await tab(page, h, 'Stories');
  h.ck('restock does not resurrect an expired Story', /Expired/.test(await txt(page)) && !/Live/.test(await txt(page)));
  await h.shot(path.join(OUT, 'stories-list-1440.png'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
