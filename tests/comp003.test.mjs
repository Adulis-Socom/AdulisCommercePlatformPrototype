// COMP-003 (FR-007 Profile): Profile replaces More. Identity, Followers, Products and Scenes (public of total), Trust and readiness, the team summary, the three-dot
// menu (quick settings, profile customisation, switch Seller), and the Console / Storefront shortcuts that keep the selected Seller.
// REAL app, marketplace dataset (tests/suites.json marks it), 390x844 (the phone) and 1440x900 (the phone frame). Expected values come from the generated dataset.
// Fixture: the Buyer-follow counts use follows written into session storage (the Buyer Follow flow itself is covered by demo003).
import { suite } from './harness.mjs'
import { comp, ops, cat, SESSION_KEY, WS_KEY, SELLER_KEY, cap } from './comp-helpers.mjs'

const seller = id => cat.sellers.find(s => s.seller_id === id)
const summary = id => ops.seller_summary.find(s => s.seller_id === id)
const members = id => ops.team_members.filter(m => m.seller_id === id)
const byRole = (id, role) => members(id).find(m => m.relationship_type === 'TEAM' && m.membership_status === 'ACTIVE' && m.roles.length === 1 && m.roles[0] === role)
const stat = (page, name) => page.locator(`[data-stat="${name}"]`).innerText()
const S01 = 'DS-01'
const follower = ops.buyers.find(b => !ops.follows.some(f => f.buyer_id === b.buyer_id && f.seller_id === S01))
const leaver = ops.follows.find(f => f.seller_id === 'DS-02')

for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  await suite('comp003', viewport, async (page, t) => {
    const c = comp(page, t, viewport)
    const phone = viewport.width <= 640
    const openMenu = async () => { await c.click(page.locator('[data-profile-menu]')); }
    const closeSheet = async () => { await page.keyboard.press('Escape'); await t.settle(300) }
    const consoleName = () => page.locator('.seller-console-sidebar').innerText()
    await c.open(S01, 'Profile')

    // ---- 1. Identity and figures ----
    const s1 = seller(S01)
    const tabs = await c.tabNames()
    t.ck('Profile replaces More in the tab bar', tabs.includes('Profile') && !tabs.includes('More'), tabs)
    t.ck('identity: name, handle, area and city from the dataset', (await page.locator('[data-profile-name]').innerText()) === s1.name && (await page.locator('[data-profile-handle]').innerText()) === s1.handle && (await page.locator('[data-profile-area]').innerText()) === `${s1.area}, ${s1.city}`)
    t.ck('a logo placeholder with the initials, and the lifecycle badge (Active)', /^A/.test(await page.locator('[data-logo-placeholder]').innerText()) && await page.locator('[data-lifecycle="ACTIVE"]').count() === 1)
    t.ck('the store bio from the dataset', (await page.locator('[data-profile-bio]').innerText()) === s1.profile)
    t.ck('Followers: the dataset snapshot (seller_summary.followers_snapshot)', (await stat(page, 'Followers')) === summary(S01).followers_snapshot.toLocaleString('en-US'), await stat(page, 'Followers'))
    const total = cat.products.filter(p => p.seller_id === S01).length, published = cat.products.filter(p => p.seller_id === S01 && p.publication === 'PUBLISHED').length
    t.ck('Products: public of total (12 of 12)', (await stat(page, 'Products')) === `${published} of ${total}`, await stat(page, 'Products'))
    const sceneTotal = cat.scenes.filter(x => x.seller_id === S01).length
    t.ck('Scenes: public of total, the public count equal to seller_summary.public_scenes (Private and Draft are not public)', (await stat(page, 'Scenes')) === `${summary(S01).public_scenes} of ${sceneTotal}`, await stat(page, 'Scenes'))
    t.ck('Trust level is the dataset\'s MVP trust; no historical Trust showcase in the current MVP', (await page.locator('[data-trust-level]').innerText()) === cap(s1.mvp_trust) && await page.locator('[data-trust-showcase]').count() === 0)
    t.ck('readiness: "n of 5 complete" from the setup rules', /^\d of 5 complete$/.test(await page.locator('[data-readiness]').innerText()))
    const teamCard = await page.locator('[data-team-summary-card]').innerText()
    t.ck('team summary: configuration, active members (6 of 7), roles and open tasks (4)', /Full team/.test(teamCard) && /6 of 7/.test(teamCard) && /admin, sales support, inventory, analyst, campaign manager/i.test(teamCard) && /Open tasks\s*4/.test(teamCard), teamCard)
    await c.overflow('Profile')

    // Other lifecycles and Sellers
    await c.open('DS-06', 'Profile')
    t.ck('DS-06: Products public of total shows the draft (8 of 9)', (await stat(page, 'Products')) === '8 of 9', await stat(page, 'Products'))
    await c.open('DS-11', 'Profile')
    t.ck('DS-11 (Draft): the badge, a note, no public Products or Scenes, and the Storefront shortcut is disabled', await page.locator('[data-lifecycle="DRAFT"]').count() === 1 && await page.locator('[data-lifecycle-note]').count() === 1 && (await stat(page, 'Products')) === '0 of 0' && await page.locator('[data-open-storefront]').isDisabled())
    await c.open('DS-23', 'Profile')
    t.ck('DS-23 (Suspended): the badge, a note, nothing public even though it has Products, Storefront disabled', await page.locator('[data-lifecycle="SUSPENDED"]').count() === 1 && /^0 of 3$/.test(await stat(page, 'Products')) && await page.locator('[data-open-storefront]').isDisabled())
    await c.open('DS-07', 'Profile')
    t.ck('DS-07 (owner-only): the team summary says Owner only with 1 of 1', /Owner only/.test(await page.locator('[data-team-summary-card]').innerText()) && /1 of 1/.test(await page.locator('[data-team-summary-card]').innerText()))

    // ---- 2. The three-dot menu: quick settings ----
    await c.open(S01, 'Profile')
    await openMenu()
    t.ck('the menu opens as a dialog with the store switch, notification switches, edit, switch Seller and shortcuts', await page.getByRole('dialog', { name: 'Profile menu' }).count() === 1 && await page.locator('[data-toggle-store]').count() === 1 && await page.locator('[data-notification-prefs] [role="switch"]').count() === 4 && /Edit profile/.test(await body()))
    await c.overflow('Profile menu')
    t.ck('the current MVP offers no Order or delivery notification', !/Order and delivery/.test(await page.getByRole('dialog', { name: 'Profile menu' }).innerText()))
    await page.locator('[data-toggle-store]').click(); await t.settle(300)
    t.ck('Store open off: the switch reads Off', (await page.locator('[data-toggle-store]').getAttribute('aria-checked')) === 'false')
    await closeSheet()
    t.ck('the profile and header now say the store is closed', await page.locator('[data-store-open="false"]').count() === 1 && !/Store open/.test(await page.locator('main.app-main').innerText()))
    t.ck('the setting is stored per Seller in the session (namespaced)', (await c.store(SESSION_KEY)).storeOpen[S01] === false)
    await openMenu()
    await page.getByRole('switch', { name: /Buyer messages/ }).click(); await t.settle(300)
    t.ck('a notification preference switches off and is stored for this member only', (await page.getByRole('switch', { name: /Buyer messages/ }).getAttribute('aria-checked')) === 'false' && Object.entries((await c.store(SESSION_KEY)).prefs).some(([k, v]) => k.startsWith(`${S01}|`) && v.messages === false))
    await page.locator('[data-toggle-store]').click(); await closeSheet()   // reopen the store
    await openMenu()
    await page.getByRole('button', { name: 'Switch Seller', exact: true }).click(); await t.settle(300)
    t.ck('Switch Seller opens the Seller switcher', await page.getByRole('dialog', { name: 'Switch Seller' }).count() === 1)
    await page.getByRole('dialog', { name: 'Switch Seller' }).getByRole('button', { name: new RegExp(seller('DS-02').name) }).click(); await t.settle(500)
    t.ck('choosing a Seller switches the Companion and the shared selected Seller', new RegExp(seller('DS-02').name).test(await page.locator('main.app-main').innerText()) && (await page.evaluate(k => sessionStorage.getItem(k), SELLER_KEY)) === 'DS-02')
    await page.locator('main.app-main nav').last().getByRole('button', { name: /Profile$/ }).click(); await t.settle(300)
    t.ck('the notification preference of DS-01 does not leak to DS-02', !Object.keys((await c.store(SESSION_KEY)).prefs).some(k => k.startsWith('DS-02|')))

    // ---- 3. Edit profile through the Seller overlay: Buyer, Storefront and Console see it ----
    await c.open(S01, 'Profile')
    await openMenu(); await c.click(page.locator('[data-edit-profile]'))
    t.ck('Edit profile opens a form with the current values', await page.getByRole('dialog', { name: 'Edit profile' }).count() === 1 && (await page.getByLabel('Store name').inputValue()) === s1.name && (await page.getByLabel('Handle').inputValue()) === s1.handle)
    await page.getByLabel('Store name').fill(''); await page.getByLabel('Handle').fill('no'); await page.getByLabel('Bio').fill('short'); await page.getByLabel('Area').fill('')
    await page.getByRole('button', { name: 'Save profile' }).click(); await t.settle(300)
    t.ck('invalid entries are refused with a message under each field', (await page.getByRole('dialog', { name: 'Edit profile' }).getByRole('alert').count()) === 4 && await page.locator('[data-profile-saved]').count() === 0)
    await page.getByLabel('Store name').fill('Aster Atelier QA'); await page.getByLabel('Handle').fill('asteratelierqa'); await page.getByLabel('Area').fill('Kazanchis'); await page.getByLabel('Bio').fill('A quality-assured boutique with a new description for the demo.')
    await page.getByRole('button', { name: 'Save profile' }).click(); await t.settle(400)
    t.ck('a valid save reports it', await page.locator('[data-profile-saved]').count() === 1)
    await closeSheet()
    t.ck('the Profile shows the new name, handle (@ added), area and bio', (await page.locator('[data-profile-name]').innerText()) === 'Aster Atelier QA' && (await page.locator('[data-profile-handle]').innerText()) === '@asteratelierqa' && /^Kazanchis/.test(await page.locator('[data-profile-area]').innerText()) && /new description for the demo/.test(await page.locator('[data-profile-bio]').innerText()))
    t.ck('it is the Store setup overlay: the workspace holds it for DS-01', (await c.store(WS_KEY)).setup[S01].storeName === 'Aster Atelier QA' && (await c.store(WS_KEY)).setup[S01].area === 'Kazanchis')
    await t.section('04 Seller Storefront'); await t.settle(500)
    const storefront = await page.locator('main.app-main').innerText()
    t.ck('the Storefront shows the new name on the same Seller (DS-01)', storefront.includes('Aster Atelier QA') && (await page.locator('.storefront-toolbar button[aria-pressed="true"]').innerText()) === 'Aster Atelier QA')
    await t.section('05 Mobile — Buyer')
    await page.getByRole('button', { name: 'Explore as guest' }).click(); await t.settle(400)
    await page.getByRole('button', { name: 'Shop' }).first().click(); await t.settle(400)
    await page.locator('input[type=search]').first().fill('Aster Atelier QA'); await t.settle(500)
    t.ck('the Buyer finds the Seller under the new name', /Aster Atelier QA/.test(await page.locator('main.app-main').innerText()))
    await page.evaluate(() => sessionStorage.clear())   // the later checks look Sellers up by their dataset names
    // Not permitted for the Analyst, and for a suspended Seller
    await c.open(S01, 'Team')
    await c.actAs(byRole(S01, 'ANALYST').member_id)
    await c.tab('Profile'); await openMenu()
    await page.locator('[data-edit-profile]').click(); await t.settle(300)
    t.ck('the Analyst cannot edit the profile: not permitted for the role, naming seller.store:profile_update', /seller\.store:profile_update/.test(await page.locator('[data-not-permitted="role"]').first().innerText().catch(() => '')) && await page.getByRole('dialog', { name: 'Edit profile' }).count() === 0)
    await page.locator('[data-toggle-store]').click(); await t.settle(300)
    t.ck('the Analyst cannot open or close the store (seller.store:availability_update)', /seller\.store:availability_update/.test(await page.locator('[data-not-permitted="role"]').first().innerText().catch(() => '')) && (await page.locator('[data-toggle-store]').getAttribute('aria-checked')) === 'true')
    await closeSheet()
    await c.open('DS-23', 'Profile'); await openMenu()
    await page.locator('[data-toggle-store]').click(); await t.settle(300)
    t.ck('DS-23 (Suspended): changing the store is refused as read-only (lifecycle)', await page.locator('[data-not-permitted="lifecycle"]').count() === 1)
    await closeSheet()

    // ---- 4. The selected Seller is kept between surfaces ----
    await c.open('DS-03', 'Profile')
    await c.click(page.locator('[data-open-console]'))
    t.ck('Companion -> Seller Console opens on the same Seller (DS-03)', /Little Juniper/.test(await consoleName()))
    t.ck('the selected Seller is stored once for every surface', (await page.evaluate(k => sessionStorage.getItem(k), SELLER_KEY)) === 'DS-03')
    await t.section('06 Mobile — Seller Companion'); await t.settle(400)
    t.ck('Seller Console -> Companion keeps the Seller', /Little Juniper/.test(await page.locator('main.app-main').innerText()))
    await c.tab('Profile'); await c.click(page.locator('[data-open-storefront]'))
    t.ck('Companion -> Storefront opens on the same Seller', (await page.locator('.storefront-toolbar button[aria-pressed="true"]').innerText()) === 'Little Juniper')
    await page.locator('.storefront-toolbar button', { hasText: seller('DS-06').name }).click(); await t.settle(400)
    await t.section('08 Seller Console'); await t.settle(400)
    t.ck('choosing a Seller in the Storefront carries to the Console', new RegExp(seller('DS-06').name).test(await consoleName()))
    // Console picker -> Companion
    if (phone) { await page.getByRole('button', { name: /Switch Seller/ }).first().click() } else await page.getByRole('button', { name: /Switch Seller/ }).first().click()
    await t.settle(300)
    await page.getByRole('menuitemradio', { name: new RegExp(seller('DS-05').name) }).click(); await t.settle(500)
    await t.section('06 Mobile — Seller Companion'); await t.settle(400)
    t.ck('choosing a Seller in the Console picker carries to the Companion', new RegExp(seller('DS-05').name).test(await page.locator('main.app-main').innerText()))
    await c.open('DS-11', 'Profile')
    await c.click(page.locator('[data-open-console]'))
    t.ck('a draft Seller opens in the Console (inspectable internally)', /First Fold Studio/.test(await consoleName()))
    await t.section('04 Seller Storefront'); await t.settle(500)
    t.ck('the Storefront does not list or open the draft Seller (no public Storefront)', (await page.locator('.storefront-toolbar button', { hasText: 'First Fold Studio' }).count()) === 0 && (await page.locator('.storefront-toolbar button[aria-pressed="true"]').count()) === 1)
    await c.open('DS-23', 'Profile')
    await c.click(page.locator('[data-open-console]'))
    t.ck('a suspended Seller opens in the Console', /Echo Wardrobe/.test(await consoleName()))
    await t.section('06 Mobile — Seller Companion'); await t.settle(400)
    t.ck('and returning to the Companion keeps it', /Echo Wardrobe/.test(await page.locator('main.app-main').innerText()))

    // ---- 5. The historical Trust showcase, only in the internal simulation ----
    await c.setMode(true)
    await c.companion('Profile', S01)
    const showcase = await page.locator('[data-trust-showcase]').innerText().catch(() => '')
    t.ck('simulation: the Trust showcase is shown, clearly labelled, with the dataset\'s text', /historical trust showcase · internal simulation/i.test(showcase) && showcase.toLowerCase().includes(s1.trust_showcase.toLowerCase()), showcase.slice(0, 200))
    await openMenu()
    t.ck('simulation: the menu adds the Order and delivery notification', /Order and delivery/.test(await page.getByRole('dialog', { name: 'Profile menu' }).innerText()))
    await closeSheet()
    await c.setMode(false)

    // ---- 6. Followers include this session's Buyer follows (fixture) ----
    await page.addInitScript(({ follower, leaver }) => {
      try {
        const key = 'adulis.seller-workspace.v1:marketplace'
        const saved = JSON.parse(sessionStorage.getItem(key) ?? '{}')
        const buyers = { ...(saved.buyers ?? {}) }
        buyers[`marketplace|mvp|${follower}`] = { ...(buyers[`marketplace|mvp|${follower}`] ?? {}), follows: { ...(buyers[`marketplace|mvp|${follower}`]?.follows ?? {}), 'DS-01': true } }
        buyers[`marketplace|mvp|${leaver}`] = { ...(buyers[`marketplace|mvp|${leaver}`] ?? {}), follows: { ...(buyers[`marketplace|mvp|${leaver}`]?.follows ?? {}), 'DS-02': false } }
        sessionStorage.setItem(key, JSON.stringify({ ...saved, buyers }))
      } catch { /* fixture only */ }
    }, { follower: follower.buyer_id, leaver: leaver.buyer_id })
    await c.open(S01, 'Profile')
    t.ck(`a new Buyer follow (${follower.buyer_id}) adds one: 1,841 and "+1 this session"`, (await stat(page, 'Followers')) === (summary(S01).followers_snapshot + 1).toLocaleString('en-US') && /\+1 this session/.test(await page.locator('[data-profile-tab]').innerText()))
    await c.open('DS-02', 'Profile')
    t.ck(`an unfollow of a seeded follow (${leaver.buyer_id}) removes one: ${summary('DS-02').followers_snapshot - 1}`, (await stat(page, 'Followers')) === (summary('DS-02').followers_snapshot - 1).toLocaleString('en-US') && /-1 this session/.test(await page.locator('[data-profile-tab]').innerText()))
    await c.overflow('Profile (end)')
    function body() { return page.locator('main.app-main').innerText() }
  })
}
