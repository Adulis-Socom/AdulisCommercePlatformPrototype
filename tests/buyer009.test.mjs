// BUYER-009 (FR-008): Home is a continuous, photo-first feed. REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844.
// Expected values are read from the generated dataset, never retyped. No photographs exist, so every Scene shows a labelled placeholder.
import { suite } from './harness.mjs'
import { readFileSync } from 'node:fs'

const read = f => JSON.parse(readFileSync(new URL(`../src/marketplace/data/${f}.json`, import.meta.url), 'utf8'))
const cat = read('catalogue'), ops = read('operations')
const sellerName = id => cat.sellers.find(s => s.seller_id === id).name
const followsOf = id => ops.follows.filter(f => f.buyer_id === id).map(f => sellerName(f.seller_id))
const published = new Set(cat.scenes.filter(s => s.publication === 'PUBLISHED').map(s => `${s.title}, by ${s.seller}`))
const unpublished = cat.scenes.filter(s => s.publication !== 'PUBLISHED').map(s => `${s.title}, by ${s.seller}`)

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('buyer009', viewport, async (page, t) => {
    const settle = ms => t.settle(ms ?? 350)
    const frame = () => page.locator('.phone-frame')
    const panel = () => page.locator('#home-channel-panel > div')
    const articles = () => page.locator('#home-channel-panel article')
    const tab = async name => { await page.getByRole('tab', { name, exact: true }).click(); await settle(350) }
    const labels = async () => articles().evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
    const box = async loc => loc.boundingBox()
    await t.open(); await t.section('Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(400)

    // ---- Guest ----
    t.ck('the guest Home loads on the marketplace dataset and shows Scenes in For You', !page.url().includes('dataset=legacy') && (await articles().count()) > 0)
    await tab('Following')
    t.ck('Guest: Following asks to sign in (no Scenes)', (await articles().count()) === 0 && /Sign in to see Scenes from Sellers you follow/.test(await page.locator('#home-channel-panel').innerText()))
    await tab('For You')

    await page.getByLabel('Buyer account (prototype)').selectOption('BY-02'); await settle(600)

    // ---- Five tabs, no horizontal scrolling ----
    const f = await box(frame()), vw = viewport.width
    const tabs = page.getByRole('tab')
    t.eq('five Home tabs', await tabs.count(), 5)
    t.eq('the tabs are For You, Following, Nearby, Discounts, Locally Made', (await tabs.allInnerTexts()).join('|'), 'For You|Following|Nearby|Discounts|Locally Made')
    for (let i = 0; i < 5; i++) {
      const b = await box(tabs.nth(i)), name = (await tabs.nth(i).innerText())
      t.ck(`tab "${name}" is fully inside the phone frame and the viewport`, b.x >= f.x - 0.5 && b.x + b.width <= f.x + f.width + 0.5 && b.x + b.width <= vw + 0.5 && b.x >= 0, { b, f })
      t.ck(`tab "${name}" label is not clipped`, await tabs.nth(i).evaluate(e => e.scrollWidth <= e.clientWidth + 1))
    }
    const bar = page.getByRole('tablist', { name: 'Home channels' })
    t.ck('the tab bar does not scroll sideways', await bar.evaluate(e => e.scrollWidth <= e.clientWidth + 1 && !/auto|scroll/.test(getComputedStyle(e).overflowX)))

    // ---- No snap, no viewport-height cards, no card borders or shadows ----
    const snap = await page.locator('#home-channel-panel').evaluate(root => [root, ...root.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return s.scrollSnapType !== 'none' || s.scrollSnapAlign !== 'none' }).length)
    t.eq('no element in the feed uses scroll snapping', snap, 0)
    const n = await articles().count()
    t.ck('For You lists several Scenes', n >= 3, n)
    const ph = await panel().evaluate(e => e.clientHeight)
    const sized = await articles().evaluateAll(els => els.map(e => ({ h: e.getBoundingClientRect().height, content: e.lastElementChild.getBoundingClientRect().bottom - e.getBoundingClientRect().top + parseFloat(getComputedStyle(e.lastElementChild).marginBottom) + parseFloat(getComputedStyle(e).paddingBottom) })))
    t.ck('every Scene is as tall as its own content (no viewport-height card, no fixed height)', sized.every(x => Math.abs(x.h - x.content) < 1.5) && (await articles().evaluateAll(els => els.every(e => getComputedStyle(e).minHeight === '0px' || getComputedStyle(e).minHeight === 'auto'))), { ph, first: sized[0] })
    const chrome = await articles().evaluateAll(els => els.map(e => { const nodes = [e, ...e.children]; return nodes.every(x => { const s = getComputedStyle(x); return ['Top', 'Right', 'Bottom', 'Left'].every(side => parseFloat(s[`border${side}Width`]) === 0 || s[`border${side}Style`] === 'none') && s.boxShadow === 'none' && parseFloat(s.borderTopLeftRadius) === 0 }) }))
    t.ck('no feed item (or its sections) has a border, a shadow or rounded card corners', chrome.every(Boolean), chrome)
    t.ck('the feed container itself has no border or shadow around the items', await panel().evaluate(e => { const s = getComputedStyle(e); return s.boxShadow === 'none' && parseFloat(s.borderTopWidth) === 0 }))

    // ---- Natural proportions, labelled placeholders ----
    const media = await articles().first().locator('[role="img"]').first()
    const mb = await box(media)
    t.ck('the pending photo takes a natural 4:5 aspect ratio', Math.abs(mb.width / mb.height - 0.8) < 0.01, mb)
    t.ck('the pending photo spans the feed width (photo-first, no inset card)', Math.abs(mb.width - f.width) < 1.5, { mb, f })
    t.ck('the placeholder is labelled "Photo pending"', /photo pending/i.test(await media.innerText()))
    const gaps = await articles().evaluateAll(els => els.slice(0, 4).map((e, i, a) => i ? Math.round(e.getBoundingClientRect().top - a[i - 1].getBoundingClientRect().bottom) : 0).slice(1))
    t.ck('items follow one another at one consistent, small spacing (seamless)', new Set(gaps).size === 1 && gaps[0] >= 0 && gaps[0] <= 8, gaps)
    t.ck('no image in the feed has a fixed height that distorts it', await articles().evaluateAll(els => els.every(e => [...e.querySelectorAll('img')].every(i => getComputedStyle(i).objectFit !== 'fill' || (i.naturalHeight && Math.abs(i.clientWidth / i.clientHeight - i.naturalWidth / i.naturalHeight) < 0.02)))))

    // ---- Scene-only For You, dataset Scenes only ----
    const forYou = await labels()
    t.ck('every For You item is a published Scene of the active dataset', forYou.every(l => published.has(l)), forYou.filter(l => !published.has(l)))
    t.ck('no draft or archived Scene is in For You', forYou.every(l => !unpublished.includes(l)), unpublished)
    t.eq('For You has no Product-only items', await page.locator('#home-channel-panel button[data-feed-item]').count(), 0)
    t.eq('every For You item is a Scene article', await page.locator('#home-channel-panel [data-feed-item]').evaluateAll(els => els.filter(e => e.tagName !== 'ARTICLE').length), 0)

    // ---- Search and Notifications stay beside the scrolling Stories strip ----
    const strip = page.getByRole('list', { name: 'Seller Stories' })
    const region = page.locator('[data-home-actions]')
    t.ck('the Stories strip scrolls sideways', await strip.evaluate(e => e.scrollWidth > e.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(e).overflowX)), await strip.evaluate(e => [e.scrollWidth, e.clientWidth]))
    const sb = await box(strip), rb0 = await box(region)
    t.ck('Search and Notifications sit in a fixed region beside (to the right of) the Stories strip, on the same row', rb0.x >= sb.x + sb.width - 1 && Math.abs((rb0.y + rb0.height / 2) - (sb.y + sb.height / 2)) < 30, { sb, rb0 })
    t.eq('the region holds Search and Notifications', await region.getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).join('|')), 'Search|Notifications')
    await strip.evaluate(e => { e.scrollLeft = e.scrollWidth }); await settle(250)
    const rb1 = await box(region)
    t.ck('the strip scrolled, the region did not move', (await strip.evaluate(e => e.scrollLeft)) > 0 && rb1.x === rb0.x && rb1.y === rb0.y, { rb0, rb1 })
    t.ck('Search and Notifications remain inside the phone frame', rb1.x + rb1.width <= f.x + f.width + 0.5)
    await strip.evaluate(e => { e.scrollLeft = 0 })
    await page.evaluate(() => { document.querySelector('#home-channel-panel > div').scrollTop = 900 }); await settle(250)
    const rb2 = await box(region)
    t.ck('the region stays put while the feed scrolls', rb2.x === rb0.x && rb2.y === rb0.y, { rb0, rb2 })
    await page.evaluate(() => { document.querySelector('#home-channel-panel > div').scrollTop = 0 }); await settle(150)

    // ---- Share: the standard glyph, labelled ----
    const share = articles().first().getByRole('button', { name: 'Share', exact: true })
    t.eq('the Share button has its accessible label', await share.getAttribute('aria-label'), 'Share')
    t.eq('the Share icon is the standard three-node share glyph (3 circles, 2 links)', await share.evaluate(e => `${e.querySelectorAll('svg circle').length} circles, ${(e.querySelector('svg path')?.getAttribute('d') ?? '').split(/(?=[mM])/).length} links`), '3 circles, 2 links')
    await share.click(); await settle(300)
    t.ck('Share opens the Share sheet', await page.getByRole('dialog', { name: 'Share' }).isVisible())
    await page.getByRole('button', { name: 'Done' }).click(); await settle(250)

    // ---- Engagement actions ----
    const first = articles().first()
    const title = (await first.getAttribute('aria-label')).split(', by ')[0]
    const like = first.getByRole('button', { name: 'Like', exact: true })
    await like.click(); await settle(250)
    t.eq('Like toggles on', await first.getByRole('button', { name: 'Like', exact: true }).getAttribute('aria-pressed'), 'true')
    const save = first.getByRole('button', { name: 'Save', exact: true })
    const savedBefore = await save.getAttribute('aria-pressed')
    await save.click(); await settle(250)
    t.ck('Save toggles', (await first.getByRole('button', { name: 'Save', exact: true }).getAttribute('aria-pressed')) !== savedBefore)
    const followBtn = first.getByRole('button', { name: /^(Follow|Following)$/ })
    const was = await followBtn.innerText()
    await followBtn.click(); await settle(250)
    t.ck('Follow toggles', (await first.getByRole('button', { name: /^(Follow|Following)$/ }).innerText()) !== was)
    await first.getByRole('button', { name: /^(Follow|Following)$/ }).click(); await settle(200) // restore
    // per-Buyer state: Hana's Like is not Maya's
    await page.getByLabel('Buyer account (prototype)').selectOption('BY-01'); await settle(700)
    t.ck('Maya (BY-01) does not inherit Hana\'s Like on the same Scene', (await page.locator(`#home-channel-panel article[aria-label^="${title}, by"]`).first().getByRole('button', { name: 'Like', exact: true }).getAttribute('aria-pressed').catch(() => 'false')) !== 'true')
    await page.getByLabel('Buyer account (prototype)').selectOption('BY-02'); await settle(700)
    t.eq('Hana (BY-02) still has her Like when she comes back', await articles().first().getByRole('button', { name: 'Like', exact: true }).getAttribute('aria-pressed'), 'true')
    await articles().first().getByRole('button', { name: 'Like', exact: true }).click(); await settle(200)
    await articles().first().getByRole('button', { name: 'Chat with seller' }).click(); await settle(400)
    t.ck('Chat opens the Seller conversation', await page.getByRole('heading', { name: /./ }).count() >= 0 && /Chat helps coordination/.test(await page.locator('.phone-frame').innerText()))
    await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await settle(350)
    t.ck('Back from Chat returns to the Home feed', (await articles().count()) > 0 && (await page.getByRole('tab', { name: 'For You' }).getAttribute('aria-selected')) === 'true')
    await articles().first().getByRole('button', { name: 'Explore the Scene', exact: true }).click(); await settle(400)
    t.ck('Explore the Scene opens the Scene explorer', /Explore the Scene/.test(await page.locator('.phone-frame h1').first().innerText()))
    await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await settle(350)

    // ---- Channel rules ----
    await tab('Following')
    const followNames = followsOf('BY-02')
    const fl = await labels()
    t.ck('Hana\'s Following feed has Scenes and they are all from Sellers she follows', fl.length > 0 && fl.every(l => followNames.some(nm => l.endsWith(`, by ${nm}`))), { fl: fl.slice(0, 5), followNames })
    t.ck('Following keeps the same continuous layout (no snap, no card)', await page.locator('#home-channel-panel').evaluate(root => [root, ...root.querySelectorAll('*')].every(e => getComputedStyle(e).scrollSnapType === 'none') && [...root.querySelectorAll('article')].every(a => getComputedStyle(a).boxShadow === 'none' && parseFloat(getComputedStyle(a).borderTopWidth) === 0)))
    await tab('Nearby')
    t.ck('Nearby shows the discovery-area picker (no device location)', /Discovery area/.test(await page.locator('#home-channel-panel').innerText()) && /device location isn't used/i.test(await page.locator('#home-channel-panel').innerText()))
    const near = await articles().count()
    t.ck('Nearby Scenes (if any) are Scene articles', near === 0 || (await page.locator('#home-channel-panel button[data-feed-item]').count()) === 0)
    await tab('Discounts')
    const disc = page.locator('#home-channel-panel button[data-feed-item]')
    t.ck('Discounts lists discounted Products (price struck through, percentage off)', (await disc.count()) > 0 && (await disc.first().innerText()).includes('%') && (await page.locator('#home-channel-panel article').count()) === 0)
    t.ck('Discount items are borderless rows with a 4:5 "Photo pending" placeholder', await disc.first().evaluate(e => { const s = getComputedStyle(e); const im = e.querySelector('[role="img"]').getBoundingClientRect(); return s.boxShadow === 'none' && parseFloat(s.borderTopWidth) === 0 && Math.abs(im.width / im.height - 0.8) < 0.01 && /photo pending/i.test(e.innerText) }))
    await tab('Locally Made')
    const lm = page.locator('#home-channel-panel button[data-feed-item]')
    t.ck('Locally Made lists Products (no Scene articles)', (await lm.count()) > 0 && (await page.locator('#home-channel-panel article').count()) === 0)
    t.ck('each Home tab is still fully visible after switching channels', await tabs.evaluateAll((els, vwid) => els.every(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= vwid + 0.5 }), vw))
    await tab('For You')

    // ---- Page-level layout ----
    t.ck(`no horizontal page overflow at ${viewport.width}px`, await page.evaluate(() => { const m = document.querySelector('main.app-main'); return m.scrollWidth <= m.clientWidth + 1 }))
  })
}
