// MB-001 / MB-003: authored Seller content as the Buyer sees it. Usage: node mb-authored.cjs <evidence dir>
import { createRequire } from 'node:module'
import { run, EVIDENCE } from './legacy.mjs'
const require = createRequire(import.meta.url)
const path = require('path'); const fs = require('fs');
const OUT = EVIDENCE; fs.mkdirSync(OUT, { recursive: true });
const png = path.join(OUT, 'fixture.png');
fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC', 'base64'));
const txt = (page) => page.locator('.seller-console-content').innerText();
const nav = async (page, h, name) => { await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + name) }).first().click(); await h.settle(450); };
const tab = async (page, h, name) => { await page.getByRole('tab', { name }).click(); await h.settle(300); };
const storyButtons = (page) => page.getByRole('list', { name: 'Seller Stories' }).getByRole('button');
// Opens each Seller's Stories in turn; leaves the viewer open on the authored Story and returns true when found.
const openAuthoredStory = async (page, h, close) => {
  const n = await storyButtons(page).count();
  for (let i = 0; i < n; i++) {
    await storyButtons(page).nth(i).click(); await h.settle(250);
    for (let k = 0; k < 5; k++) {
      if (/Fresh linen this week/.test(await page.locator('[role=dialog]').innerText())) { if (close) await page.getByRole('button', { name: 'Close story' }).click(); return true; }
      const nx = page.getByRole('button', { name: 'Next' }); if (await nx.count()) await nx.click(); else break;
    }
    await page.getByRole('button', { name: 'Close story' }).click(); await h.settle(150);
  }
  return false;
};
const toBuyer = async (page, h) => { await h.section('Mobile — Buyer'); const b = page.getByRole('button', { name: 'Explore as guest' }); if (await b.count()) { await b.click(); await h.settle(500); } };
const setStock = async (page, h, v) => {
  await h.section('Seller Console'); await nav(page, h, 'Products'); await page.getByRole('button', { name: /Buyer Dress/ }).first().click(); await h.settle(900);
  await page.getByLabel('Available quantity').fill(String(v)); await page.getByRole('button', { name: 'Save changes' }).click(); await h.settle();
};
run({ width: 1440, height: 900 }, async (page, h) => {
  await h.open(); await toBuyer(page, h);
  let body = await page.locator('body').innerText();
  h.ck('before authoring: no authored Scene card in For You', !/New from your Seller session/.test(body));
  // Author: setup, Product, Scene, Story
  await h.section('Seller Console');
  await nav(page, h, 'Store setup'); await page.getByRole('button', { name: 'Start from a blank store' }).click(); await h.settle();
  await page.getByLabel('Store name').fill('Buyer Atelier'); await page.getByLabel('Handle').fill('@buyeratelier');
  await page.getByLabel('About your store').fill('Linen clothing made in Addis Ababa.');
  await page.getByLabel('Owner name').fill('Hana B.'); await page.getByLabel('Mobile number').fill('0911223344');
  await page.getByLabel('Addis Ababa').check(); await page.getByLabel('Buyer Collection').check(); await page.getByLabel('Collection place').fill('Piassa shop');
  await page.getByRole('button', { name: 'Save setup' }).click(); await h.settle();
  await nav(page, h, 'Products'); await page.getByRole('button', { name: 'Create Product' }).first().click(); await h.settle();
  await page.getByLabel('Product name').fill('Buyer Dress'); await page.getByLabel('Description').fill('A light linen dress for warm days.');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Fashion' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Women’s Clothing' });
  await page.getByLabel('Type', { exact: true }).selectOption({ index: 1 }); await h.settle(600);
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(700);
  await page.getByLabel('Price (ETB)').fill('1200'); await page.getByLabel('Available quantity').fill('6');
  await page.getByRole('button', { name: 'Publish Product' }).click(); await h.settle();
  h.ck('Product published in the Console', /Published \(simulated\)/.test(await txt(page)), (await txt(page)).slice(0, 600));
  await nav(page, h, 'Content'); await page.getByRole('button', { name: 'Create Scene' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('A linen dress on a chair'); await page.getByLabel('Caption').fill('Buyer scene caption');
  await page.getByLabel('Product to tag').selectOption({ label: 'Buyer Dress (6 in stock)' }); await page.getByRole('button', { name: 'Place at centre' }).click();
  await page.getByRole('button', { name: 'Publish Scene' }).click(); await h.settle();
  await page.getByRole('button', { name: /Back to Scenes/ }).click(); await h.settle();
  await tab(page, h, 'Stories'); await page.getByRole('button', { name: 'Create Story' }).click(); await h.settle();
  await page.locator('input[type=file]').setInputFiles(png); await h.settle(600);
  await page.getByLabel(/Photo description/).fill('Dress close-up'); await page.getByLabel('Text').fill('Fresh linen this week');
  await page.getByLabel('Link to').selectOption('product'); await page.getByLabel('Product', { exact: true }).selectOption({ label: 'Buyer Dress' });
  await page.getByRole('button', { name: 'Publish Story' }).click(); await h.settle();
  h.ck('authored in the Seller Console', /Story published/.test(await txt(page)));
  // Buyer sees it
  await toBuyer(page, h);
  body = await page.locator('body').innerText();
  h.eq('For You leads with the authored Scene card', /Buyer scene caption, by/.test((await page.getByRole('article').first().getAttribute('aria-label')) ?? ''), true);
  await h.shot(path.join(OUT, 'buyer-authored-feed-1440.png'));
  h.ck('Stories row has a Seller Story', await storyButtons(page).count() >= 1);
  const found = await openAuthoredStory(page, h, false);
  h.ck('authored Story opens with its text, 24 h clock and photo', found && /24 h left/.test(await page.locator('[role=dialog]').innerText()) && await page.locator('[role=dialog] img').count() === 1);
  h.ck('Story has no reaction, reply or comment controls', !/react|reply|comment/i.test(await page.locator('[role=dialog]').innerText()));
  await h.shot(path.join(OUT, 'buyer-authored-story-1440.png'));
  await page.getByRole('button', { name: 'View Product' }).click(); await h.settle(400);
  body = await page.locator('body').innerText();
  h.ck('Story link opens the authored Product with price and stock state', /Buyer Dress/.test(body) && /ETB 1,200/.test(body) && /Available/.test(body));
  h.knownGap('authored Products cannot be added to the Cart yet (FIX-006)', !(await page.getByRole('button', { name: /^(Add to Cart)/i }).count()));
  await h.shot(path.join(OUT, 'buyer-authored-product-1440.png'));
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await h.settle(300);
  // Scene -> hotspot -> Product -> back to Scene
  await page.getByRole('button', { name: /Explore the Scene: Buyer scene caption/ }).click(); await h.settle(400);
  h.ck('Explore the Scene lists the tagged Product with a numbered hotspot', await page.getByRole('button', { name: /Product 1: Buyer Dress/ }).count() === 1 && /Products in this Scene/i.test(await page.locator('body').innerText()));
  await h.shot(path.join(OUT, 'buyer-authored-scene-1440.png'));
  await page.getByRole('button', { name: /Product 1: Buyer Dress/ }).click(); await h.settle(300);
  await page.getByRole('button', { name: 'Back to the Scene' }).click(); await h.settle(300);
  h.ck('Back to the Scene returns to Explore the Scene', /Products in this Scene/i.test(await page.locator('body').innerText()));
  // MB-002: Search finds the authored Product and Scene
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await h.settle(300);
  await page.getByRole('button', { name: 'Search', exact: true }).first().click(); await h.settle(400);
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('buyer dress'); await h.settle(300);
  const sr = page.getByRole('region', { name: /Results from Sellers/ });
  h.ck('Search: authored Product matches by name (case-insensitive) with Seller, price and stock state', await sr.count() === 1 && /Buyer Dress/.test(await sr.innerText()) && /ETB 1,200/.test(await sr.innerText()) && /Available/.test(await sr.innerText()), await sr.count() ? await sr.innerText() : 'no section');
  await h.shot(path.join(OUT, 'buyer-authored-search-1440.png'));
  await sr.getByRole('button', { name: /Buyer Dress/ }).click(); await h.settle(300);
  h.ck('Search result opens the authored Product', /Sold by/.test(await page.locator('body').innerText()));
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await h.settle(300);
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('buyer scene'); await h.settle(300);
  h.ck('Search: authored Scene matches by caption', /Scene ·/.test(await page.getByRole('region', { name: /Results from Sellers/ }).innerText()));
  await page.getByPlaceholder('Search Products, Scenes, Sellers').fill('nothing like this'); await h.settle(300);
  h.ck('Search: no authored section when nothing matches', await page.getByRole('region', { name: /Results from Sellers/ }).count() === 0);
  // Out of stock: Scene private -> leaves feed, Story gone
  await setStock(page, h, 0);
  await toBuyer(page, h);
  h.ck('all tagged Products unavailable: the Scene leaves For You', await page.getByRole('article', { name: /Buyer scene caption, by/ }).count() === 0);
  const stillThere = await openAuthoredStory(page, h, true);
  h.ck('the Story whose Product is unavailable is not shown to the Buyer', !stillThere);
  await setStock(page, h, 4);
  await toBuyer(page, h);
  h.ck('restock: the Scene returns to For You automatically', await page.getByRole('article', { name: /Buyer scene caption, by/ }).count() === 1);
  // 390px
  await page.setViewportSize({ width: 390, height: 844 }); await h.settle(500);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  h.ck('390px: no horizontal overflow on the Buyer feed with authored content', o <= 1, o);
  await h.shot(path.join(OUT, 'buyer-authored-feed-390.png'));
  h.ck('no page errors', h.errors.length === 0, h.errors);
});
