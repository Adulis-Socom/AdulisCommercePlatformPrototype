// SC-006 browser checks: chatbot answers and deterministic test. Usage: node sc006.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const panel = (page) => page.locator('.seller-console-content').innerText();
const nav = async (page, h, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await h.settle(400); };
const ask = async (page, h, q) => { await page.getByLabel('Buyer question').fill(q); await page.getByRole('button', { name: 'Run test' }).click(); await h.settle(200); return (await page.getByLabel('Assistant response').innerText()); };

run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await h.section('Seller Console');
  // a public Scene to test Scene context
  await nav(page, h, 'Content');
  await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('Two garments on a rail');
  await page.getByLabel('Caption').fill('Linen rail');
  for (const label of ['Linen Overshirt (14 in stock)', 'Wide-Leg Trousers (9 in stock)']) { await page.getByLabel('Product to tag').selectOption({ label }); await page.getByRole('button', { name: 'Place at centre' }).click(); }
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();

  await nav(page, h, 'Automation');
  await page.getByRole('button', { name: 'Answers' }).click(); await h.settle();
  let t = await panel(page);
  h.ck('answers: seeded approved answers listed with Edit/Delete', /Edit answer:/.test(await page.locator('body').innerHTML()) || /Approved answers/.test(t));
  await page.getByRole('button', { name: 'Add an answer' }).click();
  await page.getByRole('button', { name: 'Save answer' }).click();
  h.ck('answer validation messages', /at least 3 characters/.test(await panel(page)));
  await page.getByLabel('Buyer question or topic').fill('gift wrapping');
  await page.getByLabel('Approved answer').fill('Yes, we wrap gifts for free.');
  await page.getByRole('button', { name: 'Save answer' }).click(); await h.settle();
  h.ck('answer saved and listed', /gift wrapping/.test(await panel(page)));

  await page.getByRole('button', { name: 'Test', exact: true }).click(); await h.settle();
  await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Linen Overshirt' });
  let r = await ask(page, h, 'How much is this?');
  h.ck('price answered from the Product record', /ETB 2,450/.test(r) && /Product record: price/.test(r), r);
  r = await ask(page, h, 'Is it in stock?');
  h.ck('stock answered without quantity', /in stock/.test(r) && !/14/.test(r), r);
  r = await ask(page, h, 'Can I pay with Telebirr?');
  h.ck('payment question is handed to a human (UNSUPPORTED_COMMERCE)', /UNSUPPORTED_COMMERCE/.test(r) && /Human handoff/.test(r), r);
  r = await ask(page, h, 'Do you have a lifetime warranty?');
  h.ck('warranty is not invented: NO_APPROVED_ANSWER', /NO_APPROVED_ANSWER/.test(r) && !/year|lifetime warranty (is|covers)/i.test(r.replace(/Do you have a lifetime warranty\?/, '')), r);
  r = await ask(page, h, 'Do you deliver?');
  h.ck('delivery with nothing configured: missing information', /MISSING_INFORMATION/.test(r), r);
  r = await ask(page, h, 'Can you do gift wrapping?');
  h.ck('Seller-approved answer is used', /we wrap gifts for free/.test(r) && /Seller-approved answer/.test(r), r);
  r = await ask(page, h, '');
  h.ck('empty question asks for input', /Type a Buyer question/.test(r), r);
  await h.shot(path.join(OUT, 'chatbot-test-1440.png'), { fullPage: true });
  // Scene context: do not guess the Product
  await page.getByRole('radio', { name: 'A Scene' }).click(); await h.settle();
  await page.getByLabel('Scene', { exact: true }).selectOption({ label: 'Linen rail' });
  r = await ask(page, h, 'How much is it?');
  h.ck('Scene with no Product chosen: asks which Product, lists tagged Products only', /Needs a Product/.test(r) && /Linen Overshirt/.test(r) && /Wide-Leg Trousers/.test(r) && !/ETB/.test(r), r);
  await page.getByLabel(/Product in this Scene/).selectOption({ label: 'Wide-Leg Trousers' });
  r = await ask(page, h, 'How much is it?');
  h.ck('Scene provenance kept, Product is the subject, answer from its record', /ETB 2,100/.test(r) && /from Scene “Linen rail”/.test(r), r);
  await page.getByRole('radio', { name: 'The Seller' }).click();
  r = await ask(page, h, 'What sizes?');
  h.ck('general subject cannot answer Product facts', /Needs a Product/.test(r), r);
  // Store setup feeds delivery answers
  await nav(page, h, 'Store setup');
  await page.getByRole('button', { name: 'Start from a blank store' }).click(); await h.settle();
  await page.getByLabel('Buyer Collection').check(); await page.getByLabel('Collection place').fill('Bole studio');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  await nav(page, h, 'Automation'); await page.getByRole('button', { name: 'Test', exact: true }).click(); await h.settle();
  await page.getByRole('radio', { name: 'The Seller' }).click();
  r = await ask(page, h, 'Can I collect it from you?');
  h.ck('fulfilment answered only from Store setup, no delivery time invented', /Buyer Collection \(Bole studio\)/.test(r) && /Delivery times are not stated/.test(r), r);
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
