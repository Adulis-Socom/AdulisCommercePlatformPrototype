// DEMO-003 / BUYER-011 (FR-011, FR-016): the eleven Buyer accounts and Guest, per-Buyer namespaced state, real city/area geography and the Buyer Profile.
// REAL app, marketplace dataset (tests/suites.json marks it), 1440x900 and 390x844. Expected values are read from the generated dataset, never retyped.
import { suite } from './harness.mjs'
import { readFileSync } from 'node:fs'

const read = f => JSON.parse(readFileSync(new URL(`../src/marketplace/data/${f}.json`, import.meta.url), 'utf8'))
const cat = read('catalogue'), ops = read('operations')
const KEY = 'adulis.seller-workspace.v1:marketplace'
const sellerName = id => cat.sellers.find(s => s.seller_id === id).name
const buyerOf = id => ops.buyers.find(b => b.buyer_id === id)
const followsOf = id => ops.follows.filter(f => f.buyer_id === id).map(f => f.seller_id)
const collectionsOf = id => ops.collections.filter(c => c.buyer_id === id)
const cartOf = id => ops.cart_lines.filter(l => l.buyer_id === id)
const ordersOf = id => ops.orders.filter(o => o.buyer_id === id)
const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`
const IDS = ops.buyers.map(b => b.buyer_id)
const main = page => page.locator('main.app-main').innerText()

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('demo003', viewport, async (page, t) => {
    const toolbar = () => page.getByLabel('Buyer account (prototype)')
    const settle = ms => t.settle(ms ?? 450)
    const tab = async name => { await page.getByRole('button', { name, exact: true }).last().click(); await settle(350) }
    const toBuyer = async () => { await t.open(); await t.section('Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(400) }
    const as = async id => { await toolbar().selectOption(id); await settle(600) }
    const profileSwitch = async id => { await page.getByLabel('Switch Buyer account').selectOption(id); await settle(600) }
    const you = async () => { await tab('You') }
    const back = async () => { await page.getByRole('button', { name: 'Back', exact: true }).first().click(); await settle(350) }
    const onProfile = async () => /PROTOTYPE ACCOUNT/.test(await main(page))
    const followingCount = async () => Number((await page.getByRole('button', { name: /^Following, / }).getAttribute('aria-label')).match(/Following, (\d+)/)[1])
    const cartCount = async () => { await tab('Saved'); const n = Number((await page.getByRole('button', { name: /^Cart, / }).getAttribute('aria-label')).match(/Cart, (\d+)/)[1]); return n }
    const followedNames = async () => { await page.getByRole('button', { name: /^Following, / }).click(); await settle(350); const rows = await page.getByRole('list', { name: 'Followed Sellers' }).locator('li').allInnerTexts().catch(() => []); await back(); return rows.map(r => cat.sellers.find(x => r.includes(x.name))?.name ?? r) }

    await toBuyer()
    t.ck('the app boots on the marketplace dataset', !page.url().includes('dataset=legacy'))
    t.eq('the toolbar selector offers Guest and all eleven Buyer accounts', await toolbar().locator('option').count(), 12)

    // ---- 1. Eleven accounts: distinct identity, follows, Collections, Cart ----
    await as('BY-01')
    t.ck('Maya (BY-01) signs in and the app is labelled with her', /MOBILE BUYER · MAYA/.test(await main(page)))
    await you()
    const seen = {}
    for (const id of IDS) {
      if (id !== 'BY-01') await profileSwitch(id)
      const b = buyerOf(id), text = await main(page)
      const follows = followsOf(id), cols = collectionsOf(id), cart = cartOf(id)
      t.ck(`${id} ${b.display_name}: the Profile stays open and shows the name, @handle, area and city, and joined date`, text.includes(b.display_name) && text.includes(b.handle) && text.includes(`${b.area}, ${b.city}`) && /Joined \d{1,2} \w{3} 2026/.test(text), text.slice(0, 400))
      t.eq(`${id}: Following count is its own ${follows.length}`, await followingCount(), follows.length)
      const names = await followedNames()
      t.ck(`${id}: the Following list names exactly its followed Sellers`, JSON.stringify([...names].sort()) === JSON.stringify(follows.map(sellerName).sort()), names)
      t.ck(`${id}: its ${cols.length} Collections are listed by name and nothing else`, cols.every(c => text.includes(c.name)) && new RegExp(`${cols.length}\\s+Collections`).test(text.replace(/\n/g, ' ')), cols.map(c => c.name))
      t.eq(`${id}: the Cart seeded from cart_lines has ${cart.length} lines`, await cartCount(), cart.length)
      seen[id] = { follows: follows.join(), cols: cols.map(c => c.name).join(), cart: cart.map(l => l.product_id + l.variant_id).join() }
      await you()
    }
    t.ck('the accounts differ: eleven distinct city/area pairs-or-follow sets, not one shared profile', new Set(IDS.map(id => `${buyerOf(id).area}|${seen[id].follows}`)).size === 11)
    t.ck('the selector showed each account in turn (Nardos last)', /Nardos/.test(await main(page)))
    t.ck('Eden (BY-10, Gondar) and Nardos (BY-11) have no follows and no Cart', !seen['BY-10'].follows && !seen['BY-11'].follows && !seen['BY-10'].cart && !seen['BY-11'].cart)

    // ---- 2. No leakage A -> B -> A (state returns exactly) ----
    await profileSwitch('BY-01'); await settle(300)
    const mayaFollows = followsOf('BY-01'), hanaFollows = followsOf('BY-02')
    const gone = mayaFollows[0]
    // Maya: unfollow one Seller, create a Collection, add a Product to her Cart.
    await page.getByRole('button', { name: /^Following, / }).click(); await settle(300)
    await page.getByRole('button', { name: `Unfollow ${sellerName(gone)}` }).click(); await settle(300)
    await back()
    t.eq('Maya: unfollowing in the list lowers her Following count', await followingCount(), mayaFollows.length - 1)
    await tab('Saved')
    await page.getByRole('button', { name: /New/ }).first().click(); await settle(300)
    await page.getByRole('textbox').last().fill('Leak test'); await page.getByRole('button', { name: 'Create' }).click(); await settle(400)
    t.ck('Maya: her new Collection exists on Saved', /Leak test/.test(await main(page)))
    const taken = new Set(ops.cart_lines.map(l => l.product_id))
    const withVariants = new Set(cat.variants.map(v => v.product_id))
    const activeIds = new Set(cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id))
    const extra = cat.products.find(p => p.publication === 'PUBLISHED' && p.stock > 0 && activeIds.has(p.seller_id) && !taken.has(p.product_id) && !withVariants.has(p.product_id) && cat.products.filter(q => q.name === p.name).length === 1)
    await tab('Shop')
    await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(extra.name); await settle(500)
    await page.locator('button', { hasText: extra.name }).first().click(); await settle(500)
    await page.getByRole('button', { name: 'Add to Cart' }).click(); await settle(400)
    await page.getByRole('button', { name: 'Keep browsing' }).click(); await settle(250)
    await back()
    await you()
    t.eq('Maya: her Cart now has one more line', await cartCount(), cartOf('BY-01').length + 1)
    // Hana: her own state, untouched by Maya's changes.
    await you(); await profileSwitch('BY-02')
    t.eq('Hana (B): her follows are her own, not Maya\'s edited set', await followingCount(), hanaFollows.length)
    t.eq('Hana (B): her Cart is her own seeded lines', await cartCount(), cartOf('BY-02').length)
    await you()
    t.ck('Hana (B): Maya\'s Collection is not visible', !/Leak test/.test(await main(page)))
    const hanaNot = cat.sellers.find(s => s.lifecycle === 'ACTIVE' && !hanaFollows.includes(s.seller_id) && !mayaFollows.includes(s.seller_id))
    await tab('Shop')
    await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(hanaNot.name); await settle(500)
    await page.getByRole('tab', { name: /sellers/i }).click(); await settle(300)
    await page.locator('button', { hasText: hanaNot.name }).first().click(); await settle(500)
    await page.getByRole('button', { name: 'Follow', exact: true }).click(); await settle(300)
    await back(); await you()
    t.eq('Hana (B): following one more Seller raises her own count', await followingCount(), hanaFollows.length + 1)
    // Back to Maya (A): exactly as she was left.
    await profileSwitch('BY-01')
    t.eq('Maya (A) again: her edited follow count returns exactly', await followingCount(), mayaFollows.length - 1)
    const namesA = await followedNames()
    t.ck('Maya (A) again: the Seller she unfollowed is still gone and Hana\'s new follow is not hers', !namesA.includes(sellerName(gone)) && !namesA.includes(hanaNot.name), namesA)
    t.ck('Maya (A) again: her new Collection is still there', /Leak test/.test(await main(page)))
    t.eq('Maya (A) again: her Cart still has the extra line', await cartCount(), cartOf('BY-01').length + 1)
    await you(); await profileSwitch('BY-02')
    t.eq('Hana (B) again: her follow is kept', await followingCount(), hanaFollows.length + 1)
    t.ck('Hana (B) again: she still has none of Maya\'s Collections', !/Leak test/.test(await main(page)))
    t.ck('the store keeps one session per Buyer under dataset|mode|Buyer', await page.evaluate(k => { const b = JSON.parse(sessionStorage.getItem(k)).buyers; return Object.keys(b).every(x => /^marketplace\|mvp\|BY-\d\d$/.test(x)) && 'marketplace|mvp|BY-01' in b && 'marketplace|mvp|BY-02' in b && !('marketplace|mvp|BY-03' in b) }, KEY))

    // ---- 3. Guest has none ----
    await toolbar().selectOption('guest'); await settle(500)
    t.ck('Guest: the app is labelled Guest', /MOBILE BUYER · GUEST/.test(await main(page)))
    await tab('You')
    t.ck('Guest: the profile asks to sign in and shows no Buyer data', /Sign in to see your profile/.test(await main(page)) && !/Hana|Maya|@/.test((await main(page)).split('PROTOTYPE NAVIGATION')[1]?.split('10:00')[1] ?? ''))
    await tab('Saved')
    t.ck('Guest: Saved asks to sign in', /Sign in to save/.test(await main(page)))
    await tab('Shop')
    await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(extra.name); await settle(500)
    await page.locator('button', { hasText: extra.name }).first().click(); await settle(500)
    await page.getByRole('button', { name: 'Add to Cart' }).click(); await settle(400)
    await page.getByRole('button', { name: 'View cart', exact: true }).click(); await settle(500)
    const guestCart = await main(page)
    t.ck('Guest: the cart holds only the guest\'s own line, none of Hana\'s seeded lines', guestCart.includes(extra.name) && !cartOf('BY-02').some(l => guestCart.includes(cat.products.find(p => p.product_id === l.product_id).name)), guestCart.slice(0, 300))
    await toolbar().selectOption('BY-02'); await settle(700)
    await back(); await back()
    await tab('Saved')
    t.eq('Signing back in as Hana keeps the guest\'s temporary line with her own', Number((await page.getByRole('button', { name: /^Cart, / }).getAttribute('aria-label')).match(/Cart, (\d+)/)[1]), cartOf('BY-02').length + 1)

    // ---- 4. Nearby by real city and area ----
    const nearbyNames = async () => { await tab('Home'); await page.getByRole('tab', { name: 'Nearby' }).click(); await settle(450); return page.locator('#home-channel-panel').innerText() }
    const activeNames = cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.name)
    const inPanel = (text, ids) => activeNames.filter(n => text.includes(n)).every(n => ids.map(sellerName).includes(n))
    const scenesOf = id => cat.scenes.some(s => s.seller_id === id && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC')
    await as('BY-04')
    let panel = await nearbyNames()
    t.ck('Sara (Hawassa): Nearby starts from Central Hawassa', /Sellers near Central Hawassa, your saved discovery area/.test(panel), panel.slice(0, 200))
    t.ck('Sara: Nearby shows only the Hawassa Sellers\' Scenes (DS-03, DS-13), none from Addis Ababa', inPanel(panel, ['DS-03', 'DS-13']) && ['DS-03', 'DS-13'].filter(scenesOf).every(id => panel.includes(sellerName(id))), panel.slice(0, 400))
    await as('BY-01')
    panel = await nearbyNames()
    const bole = cat.sellers.filter(s => s.lifecycle === 'ACTIVE' && s.area === 'Bole').map(s => s.seller_id)
    t.ck('Maya (Bole): Nearby starts from Bole, then the rest of Addis Ababa, never Hawassa', /Sellers near Bole, your saved discovery area/.test(panel) && !panel.includes(sellerName('DS-03')) && !panel.includes(sellerName('DS-13')), panel.slice(0, 200))
    const firstSeller = activeNames.map(n => [panel.indexOf(n), n]).filter(([i]) => i >= 0).sort((a, b) => a[0] - b[0])[0]?.[1]
    t.ck('Maya: the first Seller shown is a Bole Seller', bole.map(sellerName).includes(firstSeller), firstSeller)
    await as('BY-10')
    panel = await nearbyNames()
    t.ck('Eden (Gondar, no active local Seller): Nearby is empty, never another city\'s Sellers', activeNames.every(n => !panel.includes(n)) && /Central Gondar/.test(panel), panel.slice(0, 300))
    const choose = await page.locator('#home-channel-panel [aria-pressed]').allInnerTexts()
    t.ck('the discovery-area list starts with the Buyer\'s own city (Gondar first)', choose[0] === 'Central Gondar', choose.slice(0, 3))

    // ---- 5. Fulfilment from the Seller's city, coverage and fulfilment fields ----
    const aboutRows = async name => {
      await tab('Shop'); await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(name); await settle(450)
      await page.getByRole('tab', { name: /sellers/i }).click(); await settle(250)
      await page.locator('button', { hasText: name }).first().click(); await settle(450)
      await page.getByRole('tab', { name: 'About' }).click(); await settle(300)
      const text = (await main(page)).replace(/\n/g, ' ')
      await back()
      return text
    }
    const ds01 = cat.sellers.find(s => s.seller_id === 'DS-01'), ds05 = cat.sellers.find(s => s.coverage === 'Adama; Addis Ababa by arrangement')
    await as('BY-01')
    let about = await aboutRows(ds01.name)
    t.ck('Maya (Addis Ababa) on a Seller covering Addis Ababa; Adama: Seller Delivery is offered with the fee not set (no invented ETB 80)', /Seller Delivery \(fee not set\)/.test(about) && !/Delivery to you/.test(about) && !/ETB 80/.test(about), about.slice(about.indexOf('Fulfilment') - 20, about.indexOf('Fulfilment') + 200))
    t.ck('collection comes from the Seller\'s fulfilment field (Collection listed): Buyer Collection (free)', /Buyer Collection \(free\)/.test(about))
    about = await aboutRows(ds05.name)
    t.ck('Maya on a Seller delivering to Addis Ababa only by arrangement: no delivery is promised, and it says so', /by arrangement with the Seller only, so no delivery is promised/.test(about) && !/Seller Delivery \(/.test(about), about.slice(about.indexOf('Fulfilment') - 20, about.indexOf('Fulfilment') + 300))
    await as('BY-04')
    about = await aboutRows(ds01.name)
    t.ck('Sara (Hawassa) on the Addis Ababa Seller: no Seller Delivery promised, the reason names Hawassa, collection still offered', !/Seller Delivery \(/.test(about) && /Addis Ababa; Adama, not to Hawassa/.test(about) && /Buyer Collection \(free\)/.test(about), about.slice(about.indexOf('Fulfilment') - 20, about.indexOf('Fulfilment') + 300))
    await as('BY-05')
    about = await aboutRows(ds05.name)
    t.ck('Liya (Adama) on that Seller (Adama; Addis Ababa by arrangement): Seller Delivery is offered', /Seller Delivery \(fee not set\)/.test(about) && !/Delivery to you/.test(about), about.slice(about.indexOf('Fulfilment') - 20, about.indexOf('Fulfilment') + 200))

    // ---- 6. Follow / unfollow is one state (Profile, Following list, Seller page, Home Following, Scene cards) ----
    await as('BY-01'); await you()
    const f0 = followsOf('BY-01').filter(x => x !== gone), target = f0[0] // Maya unfollowed `gone` earlier; that edit is still hers
    await page.getByRole('button', { name: /^Following, / }).click(); await settle(300)
    await page.getByRole('list', { name: 'Followed Sellers' }).locator('li button', { hasText: sellerName(target) }).first().click(); await settle(450)
    t.ck('the Seller page opened from the Following list shows Following', await page.getByRole('button', { name: 'Following', exact: true }).first().isVisible())
    await back()
    t.ck('Back from that Seller page returns to the Following list (not Home)', /Unfollowing here also changes Home/.test(await main(page)))
    await page.getByRole('button', { name: `Unfollow ${sellerName(target)}` }).click(); await settle(300)
    t.ck('the Following list drops the Seller at once', !(await page.getByRole('list', { name: 'Followed Sellers' }).innerText()).includes(sellerName(target)))
    await back()
    t.eq('the Profile count agrees', await followingCount(), f0.length - 1)
    await tab('Home'); await page.getByRole('tab', { name: 'Following' }).click(); await settle(450)
    t.ck('Home Following no longer shows the unfollowed Seller\'s Scenes', !(await page.locator('#home-channel-panel').innerText()).includes(sellerName(target)))
    await tab('Shop'); await page.getByPlaceholder('Search Products, Scenes, Sellers').fill(sellerName(target)); await settle(450)
    await page.getByRole('tab', { name: /sellers/i }).click(); await settle(250)
    await page.locator('button', { hasText: sellerName(target) }).first().click(); await settle(450)
    t.ck('the Seller page now offers Follow', await page.getByRole('button', { name: 'Follow', exact: true }).first().isVisible())
    await page.getByRole('button', { name: 'Follow', exact: true }).first().click(); await settle(300)
    await back(); await you()
    t.eq('following again from the Seller page restores the Profile count', await followingCount(), f0.length)
    t.ck('and the Following list names the Seller again', (await followedNames()).includes(sellerName(target)))

    // ---- 7. Profile Back routes ----
    await you()
    const row = async label => { await page.getByRole('button', { name: new RegExp(`^${label}`) }).first().click(); await settle(350) }
    const menu = async item => { await page.getByRole('button', { name: 'Account and settings' }).click(); await settle(250); await page.getByRole('button', { name: new RegExp(`^${item}`) }).last().click(); await settle(350) }
    const routes = [
      ['Edit Profile', () => menu('Edit Profile'), /Display name/],
      ['Appearance', () => menu('Appearance'), /Light backgrounds/],
      ['Notification settings', () => menu('Notifications'), /notify me about/i],
      ['Privacy & Security', () => menu('Privacy'), /Sign-in method/],
      ['Help & Support', () => menu('Help'), /Message a Seller/],
      ['Delete Account', () => menu('Delete'), /delet/i],
      ['Purchased Products (menu)', () => menu('Purchased Products'), /Release 1 has no paid Orders/],
      ['Following list', () => row('Following,'), /Unfollowing here/],
      ['Collection', () => row(collectionsOf('BY-01')[0].name), /private collection/i],
      ['Orders', () => row('Orders'), /Release 1 has no paid Orders/],
      ['Purchased Products (row)', () => row('Purchased Products'), /Release 1 has no paid Orders/],
      ['Messages', () => row('Messages'), /Buyer.Seller threads/i],
      ['Notifications', () => row('Notifications'), /notification|No /i],
    ]
    for (const [name, open, shows] of routes) {
      await open()
      t.ck(`${name}: opens its own screen`, shows.test(await main(page)) && !(await onProfile()), (await main(page)).slice(0, 200))
      await back()
      t.ck(`${name}: Back returns to the Profile (its origin, not Home)`, await onProfile(), (await main(page)).slice(0, 160))
    }
    // Nested origins: each Back goes one step, to where it came from.
    await menu('Notifications'); await page.getByRole('button', { name: /^Your notifications/ }).click(); await settle(300)
    await back(); t.ck('Notification inbox: Back returns to Notification settings', /notify me about/i.test(await main(page)))
    await back(); t.ck('then Back returns to the Profile', await onProfile())
    await menu('Privacy'); await page.getByRole('button', { name: /^Delete Account/ }).click(); await settle(300)
    await back(); t.ck('Delete Account opened from Privacy & Security: Back returns to Privacy & Security', /Sign-in method/.test(await main(page)))
    await back(); t.ck('then Back returns to the Profile', await onProfile())
    await menu('Help'); await page.getByRole('button', { name: /^Message a Seller/ }).click(); await settle(300)
    await back(); t.ck('Messages opened from Help & Support: Back returns to Help & Support', /Message a Seller/.test(await main(page)))
    await back(); t.ck('then Back returns to the Profile', await onProfile())
    const followed = sellerName(followsOf('BY-01')[1] ?? followsOf('BY-01')[0])
    await page.getByRole('button', { name: new RegExp(followed) }).first().click(); await settle(450)
    await back(); t.ck('a followed Seller opened from the Profile: Back returns to the Profile', await onProfile())

    // ---- 8. Orders per Buyer: simulation only ----
    await toolbar().selectOption('BY-02'); await settle(600); await you()
    t.ck('Current MVP: the Profile\'s Orders shows no invented Orders for Hana', (await (async () => { await row('Orders'); return main(page) })()).indexOf('SIM-O-') === -1)
    await back()
    // The prototype-mode switch lives in the section sidebar, which phone widths hide: widen the window just for the switch, then come back.
    if (viewport.width <= 640) await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: 'Internal simulation', exact: true }).click(); await settle(600)
    if (viewport.width <= 640) { await page.setViewportSize(viewport); await settle(400) }
    await t.section('Mobile — Buyer')
    await as('BY-02'); await you(); await row('Orders'); await settle(300)
    const hana = ordersOf('BY-02')
    const listed = async () => (await page.locator('section[aria-label] li').allInnerTexts()).map(x => (x.match(/SIM-O-\d+/) ?? [])[0])
    const ids = await listed()
    t.ck(`Internal simulation: Hana's ${hana.length} dataset Orders are listed, all hers`, ids.length === hana.length && ids.every(id => hana.some(o => o.order_id === id)), [ids.length, hana.length])
    t.ck('the newest Order comes first', ids[0] === [...hana].sort((a, b) => b.paid_at.localeCompare(a.paid_at))[0].order_id, ids[0])
    await as('BY-03'); await you(); await row('Orders')
    t.ck('Abel (BY-03) has no Orders: the list says so', /No Orders for this account/.test(await main(page)))
    await as('BY-01'); await you(); await row('Orders'); await settle(300)
    const mids = await listed()
    t.ck(`Maya's own ${ordersOf('BY-01').length} Orders are listed, none of Hana's`, mids.length === ordersOf('BY-01').length && mids.every(id => ordersOf('BY-01').some(o => o.order_id === id)), mids.length)
    await back()
    t.ck('Orders opened from the Profile in the simulation: Back returns to the Profile', await onProfile())
    // ---- 8b. Conversations are per Buyer: seeded history is that Buyer's own, and a new message stays in its own thread ----
    const chatsOf = id => [...new Set(ops.chat_messages.filter(m => m.buyer_id === id).map(m => m.seller_id))]
    const firstText = id => ops.chat_messages.find(m => m.buyer_id === id && m.sender === 'BUYER').text
    const openChat = async id => {
      await as(id); await you(); await page.getByRole('button', { name: /^Messages/ }).first().click(); await settle(350)
      await page.getByRole('button', { name: new RegExp(sellerName(chatsOf(id)[0])) }).first().click(); await settle(450)
      return main(page)
    }
    let chat = await openChat('BY-01')
    t.ck('Maya\'s Messages thread is her own seeded conversation with her Seller', chat.includes(firstText('BY-01')), chat.slice(0, 300))
    const note = 'Do you deliver to Hawassa? (Maya)'
    await page.getByLabel('Message', { exact: true }).fill(note); await page.getByRole('button', { name: 'Send' }).click(); await settle(500)
    t.ck('Maya\'s new message is in her thread', (await main(page)).includes(note))
    chat = await openChat('BY-02')
    t.ck('Hana\'s thread with the same Seller is her own conversation, without Maya\'s message', chat.includes(firstText('BY-02')) && !chat.includes(note), chat.slice(0, 300))
    await back(); await back()
    await as('BY-01'); await you(); await page.getByRole('button', { name: /^Messages/ }).first().click(); await settle(300)
    await page.getByRole('button', { name: new RegExp(sellerName(chatsOf('BY-01')[0])) }).first().click(); await settle(450)
    t.ck('back on Maya: her message is still there', (await main(page)).includes(note))
    await as('BY-10'); await you(); await page.getByRole('button', { name: /^Messages/ }).first().click(); await settle(300)
    const edenMessages = await main(page)
    t.ck('Eden (BY-10) has no conversations: no Seller thread is listed', /Messages/.test(edenMessages) && activeNames.every(n => !edenMessages.includes(n)), edenMessages.slice(0, 300))

    // ---- 9. The checkout review: Maya's seeded Cart, coverage that is not stated, and no invented charge ----
    await page.evaluate(() => sessionStorage.clear()); await t.open(); await t.section('Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(300)
    await as('BY-01')
    await tab('Saved'); await page.getByRole('button', { name: /^Cart, / }).click(); await settle(450)
    const seeded = await main(page)
    t.ck('Maya\'s seeded Cart is the DS-01 lines of cart_lines, one Seller cart', /Aster & Thread cart/.test(seeded) && cartOf('BY-01').every(l => seeded.includes(cat.products.find(p => p.product_id === l.product_id).name)), seeded.slice(0, 300))
    await page.getByRole('button', { name: 'Checkout this Seller cart' }).click(); await settle(400)
    await page.getByRole('button', { name: /^Continue with / }).click(); await settle(450)
    const review = await main(page)
    t.ck('the checkout review offers Buyer Collection and Seller Delivery with the fee not set, and no invented ETB 80 or Courier fee', /Seller Delivery/.test(review) && /Fee not set/.test(review) && !/ETB 80\b/.test(review) && !/Courier Delivery/.test(review), review.slice(review.indexOf('FULFILMENT'), review.indexOf('FULFILMENT') + 300))
    t.ck('the delivery details use Maya\'s own area and city', new RegExp(`${buyerOf('BY-01').area}, ${buyerOf('BY-01').city}`).test(review))
    // A Seller who set up delivery but names no coverage: nothing is promised, and the Buyer is told why.
    await page.evaluate(k => {
      const st = JSON.parse(sessionStorage.getItem(k))
      st.setup = { 'DS-01': { storeName: 'Aster & Thread', handle: '@asterandthread', about: '', contactPhone: '', ownerName: '', coverage: [], collection: { on: true, place: 'Bole' }, sellerDelivery: { on: true, fee: '90' }, courier: false, blank: false } }
      sessionStorage.setItem(k, JSON.stringify(st))
    }, KEY)
    await t.open(); await t.section('Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(300)
    await as('BY-01')
    about = await aboutRows(ds01.name)
    t.ck('coverage the Seller never stated: no Seller Delivery is promised and the page says it has not said whether it delivers to Addis Ababa', !/Seller Delivery \(/.test(about) && /has not said whether it delivers to Addis Ababa, so no delivery is promised/.test(about), about.slice(about.indexOf('Fulfilment') - 20, about.indexOf('Fulfilment') + 300))
  })
}
