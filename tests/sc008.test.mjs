// SC-007 / SC-008: Settings, Insights in MVP mode, integrated Seller journey, responsive overflow, keyboard checks. Usage: node sc008.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const content = (page) => page.locator('.seller-console-content').innerText();
const goto = async (page, h, name, phone) => {
  if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await h.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); }
  else await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click();
  await h.settle(500);
};
const overflow = (page) => page.evaluate(() => { const c = document.querySelector('.seller-console-content'); return { page: document.documentElement.scrollWidth - document.documentElement.clientWidth, content: c ? c.scrollWidth - c.clientWidth : 0 }; });

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  // SC-007 Settings
  await goto(page, h, 'Settings');
  let t = await content(page);
  h.ck('settings: Store profile, Courier relationships, Subscription tabs; no Provider status in MVP', /Store profile/.test(t) && /Courier relationships/.test(t) && /Subscription/.test(t) && !/Provider status/.test(t));
  await page.locator('.seller-console-content').getByRole('button', { name: 'Subscription', exact: true }).click(); await h.settle();
  t = await content(page);
  h.ck('subscription is read-only: no buy/upgrade/pay controls', /Read-only/.test(t) && !(await page.locator('.seller-console-content').getByRole('button', { name: /buy|upgrade|pay|purchase|subscribe/i }).count()));
  await page.locator('.seller-console-content').getByRole('button', { name: 'Notifications', exact: true }).click(); await h.settle();
  t = await content(page);
  h.ck('notifications: no Paid Orders/Claims/Courier toggles in MVP', !/New Paid Orders/.test(t) && !/Claims and deadlines/.test(t) && /Inventory risks/.test(t));
  await page.locator('.seller-console-content').getByRole('button', { name: 'Store profile', exact: true }).click(); await h.settle();
  await page.getByRole('button', { name: 'Edit in Store setup' }).click(); await h.settle();
  h.ck('Store profile links to Store setup', /steps complete/.test(await content(page)));
  // Insights
  await goto(page, h, 'Insights');
  t = await content(page);
  h.ck('insights: no Paid Orders / GMV in MVP, explained', !/GMV/.test(t.replace(/GMV, Claims/, '')) && /Order figures are not part of Release 1/.test(t));
  await h.shot(path.join(OUT, 'insights-mvp-1440.png'));
  // Integrated journey: setup -> product -> preview -> scene -> story -> inbox
  await goto(page, h, 'Store setup');
  await page.getByRole('button', { name: 'Start from a blank store' }).click(); await h.settle();
  await page.getByLabel('Store name').fill('Journey Atelier'); await page.getByLabel('Handle').fill('@journey');
  await page.getByLabel('About your store').fill('Linen clothing made in Addis Ababa.');
  await page.getByLabel('Owner name').fill('Hana B.'); await page.getByLabel('Mobile number').fill('0911223344');
  await page.getByLabel('Addis Ababa').check(); await page.getByLabel('Buyer Collection').check(); await page.getByLabel('Collection place').fill('Piassa shop');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  h.ck('journey 1/6 Store setup ready', /5 of 5 steps complete/.test(await content(page)));
  await goto(page, h, 'Products');
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  await page.getByLabel('Product name').fill('Journey Scarf');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Accessories' });
  h.ck('Fashion Accessories (no subcategory list submitted) shows the incomplete-taxonomy state', /Taxonomy incomplete for this category/i.test(await content(page)));
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(700);
  await page.getByLabel('Price (ETB)').fill('650'); await page.getByLabel('Available quantity').fill('8');
  await page.getByRole('button', { name: 'Preview' }).first().click(); await h.settle();
  h.ck('journey 2-3/6 Product created and previewed', await page.getByRole('img', { name: /Preview of Journey Scarf/ }).count() === 1);
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  h.ck('Product published', /Published \(simulated\)/.test(await content(page)));
  await goto(page, h, 'Content');
  await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A scarf on a chair'); await page.getByLabel('Caption').fill('Scarf season');
  const options = await page.getByLabel('Product to tag').locator('option').allInnerTexts();
  h.ck('the new Product is offered for tagging (shared Seller data)', options.some(o => /Journey Scarf \(8 in stock\)/.test(o)), options);
  await page.getByLabel('Product to tag').selectOption({ label: 'Journey Scarf (8 in stock)' });
  await page.getByRole('button', { name: 'Place at centre' }).click();
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  h.ck('journey 4/6 Scene published', /Published \(simulated\)/.test(await content(page)));
  await page.getByRole('button', { name: /Back to Scenes/ }).click();
  await page.getByRole('tab', { name: 'Stories' }).click(); await h.settle();
  await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('Scarf close-up');
  await page.getByLabel('Link to').selectOption('scene');
  await page.getByLabel('Scene', { exact: true }).selectOption({ label: 'Scarf season' });
  await page.getByRole('button', { name: 'Publish Story' }).click(); await h.settle();
  h.ck('journey 5/6 Story published linking the new Scene', /Story published/.test(await content(page)) && /links to Scarf season/.test(await content(page)));
  await goto(page, h, 'Inbox');
  t = await content(page);
  h.ck('journey 6/6 Inbox opens with a conversation and context', /Talking about|Product|Scene|General/i.test(t) && t.length > 200, t.slice(0, 300));
  const compose = page.getByRole('textbox').last();
  await compose.fill('Thank you, the scarf is in stock.');
  const sendBtn = page.getByRole('button', { name: /^Send/ }).first();
  if (await sendBtn.count()) { await sendBtn.click(); await h.settle(); h.ck('Seller reply is added to the thread', /Thank you, the scarf is in stock/.test(await content(page))); }
  await h.shot(path.join(OUT, 'inbox-1440.png'));
  // keyboard: Tab order reaches primary actions on a new screen
  await goto(page, h, 'Products');
  await page.getByRole('button', { name: 'Create Product' }).first().focus();
  await page.keyboard.press('Enter'); await h.settle();
  await page.getByLabel('Product name').focus();
  let reached = false; for (let i = 0; i < 40 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => document.activeElement && /Publish Product/.test(document.activeElement.textContent || '')); }
  h.ck('keyboard: Tab from the name field reaches Publish Product', reached);
  const outline = await page.evaluate(() => { const el = document.activeElement; return el ? getComputedStyle(el).outlineStyle + ' ' + getComputedStyle(el).outlineWidth : ''; });
  h.ck('keyboard focus shows an outline on the focused control', /solid/.test(outline) && !/ 0px/.test(outline), outline);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});

for (const [w, hgt, phone] of [[768, 1024, false], [390, 844, true]]) run({ width: w, height: hgt }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  for (const name of ['Store setup', 'Products', 'Content', 'Automation', 'Settings', 'Insights']) {
    await goto(page, h, name, phone);
    const o = await overflow(page);
    h.ck(`${w}px ${name}: no horizontal overflow`, o.page <= 1 && o.content <= 1, o);
    if (name === 'Store setup' || name === 'Content') await h.shot(path.join(OUT, `${name.replace(' ', '-')}-${w}.png`), { fullPage: false });
  }
  await goto(page, h, 'Products', phone);
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  const o2 = await overflow(page);
  h.ck(`${w}px Product editor: no horizontal overflow`, o2.page <= 1 && o2.content <= 1, o2);
  await h.shot(path.join(OUT, `product-editor-${w}.png`));
});
