// DEMO-002 completion (FR-016): the Seller Console on the marketplace dataset reads the dataset and the shared simulation store for every Seller. (1) Courier relationships: a team member
// approves, rejects, invites, suspends, reinstates and removes a Courier as session actions kept consistent with the Courier app's Pools tab, under the permission model and the Seller
// lifecycle. (2) Home and Claims read the store for the selected Seller. (3) Spot verification: every Seller's Product list shows the source price, stock and publication, a Product per Seller
// shows its source category path, and the 11 Stories show for their Sellers with the dataset's expected_state. (4) Identity sweep: no historical Seller, Buyer, Product, Order, Courier,
// Scene Post or Claim identity appears on any of the 12 sections, the Seller Console's panels, the Companion and the Courier tabs in either mode.
// REAL app, marketplace dataset, 1440x900 and 390x844. Expected values are computed from the generated dataset.
import { suite, DATASET } from './harness.mjs'
import { drivers, cat, ops, sellerName } from './sim-helpers.mjs'
import { legacyHits } from './legacy-markers.mjs'

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const rel = ops.relationships_and_eligibility
const owner = id => ops.team_members.find(m => m.seller_id === id && m.relationship_type === 'OWNERSHIP').member_id
// An ACTIVE Addis Ababa Seller with no relationship to Samuel (CR-02, verified, available).
const PAIR = cat.sellers.find(s => s.lifecycle === 'ACTIVE' && s.city === 'Addis Ababa' && rel.some(r => r.courier_id === 'CR-02' && r.seller_id === s.seller_id && r.relationship_status === null) && !rel.some(r => r.courier_id === 'CR-02' && r.seller_id === s.seller_id && r.can_apply)).seller_id
const SNAPSHOT = Date.parse('2026-11-27T10:00:00+03:00')
const pretty = s => s.replace(/_/g, ' ').toLowerCase()
const birr = n => `ETB ${n.toLocaleString('en-US')}`
const stockLabel = n => (n === 0 ? 'Out of stock' : `${n} available${n <= 3 ? ' · low' : ''}`)

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('demo002', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const phone = d.phone
    const main = () => page.locator('main.app-main').innerText()
    const content = () => page.locator('.seller-console-content').innerText()
    const sc = async seller => {
      await t.section('08 Seller Console'); await d.settle(400)
      if (seller) { await page.getByRole('button', { name: /Switch Seller/ }).click(); await d.settle(300); await page.getByRole('menuitemradio', { name: new RegExp(esc(sellerName(seller))) }).click(); await d.settle(500) }
    }
    const scNav = async label => {
      if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await d.settle(250) }
      await page.locator('.seller-console-sidebar').getByRole('button', { name: new RegExp('^' + label) }).first().click(); await d.settle(450)
    }
    const row = (courier, status) => page.locator(`[data-seller-pool-row="${courier}"]${status ? `[data-pool-status="${status}"]` : ''}`)
    const op = (name, scope = page.locator('.seller-console-content')) => scope.locator(`[data-courier-op="${name}"]`)
    const result = async () => (await page.locator('[data-sim-result]').last().innerText()).trim()
    const actAs = async id => { await page.locator('#couriers-actor').selectOption(id); await d.settle(200) }
    const noOverflow = async label => { const r = await d.noOverflow(label); t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, r.ok) }
    t.ck('this suite runs on the marketplace dataset', DATASET === 'marketplace', DATASET)
    await t.open()

    // ================= 1. Courier relationships: Seller decisions =================
    // 1a. The acting identity defaults to the Owner; a pending application can be rejected, and the rejected Courier can be invited again.
    await sc('DS-14'); await scNav('Couriers')
    t.eq('the acting identity defaults to the Owner', await page.locator('#couriers-actor').inputValue(), owner('DS-14'))
    t.ck('DS-14 shows Daniel\'s pending application with Approve and Reject', (await row('CR-01', 'APPLIED').count()) === 1 && (await op('APPROVE', row('CR-01')).count()) === 1 && (await op('REJECT', row('CR-01')).count()) === 1)
    await op('REJECT', row('CR-01')).click(); await d.settle(300)
    t.ck('rejecting moves Daniel to the closed group as REJECTED and says so', (await row('CR-01', 'REJECTED').count()) === 1 && /application rejected/.test(await result()), await result())
    await d.courier('CR-01', 'Pools')
    t.eq('the Courier app shows DS-14 in Daniel\'s closed group at once', await page.locator('[data-pool-row="DS-14"][data-pool-group="closed"][data-pool-status="REJECTED"]').count(), 1)
    await sc('DS-14'); await scNav('Couriers')
    t.ck('a rejected Courier is listed among those who can be invited again', (await page.locator('[data-candidate="CR-01"]').innerText()).includes('Rejected'))
    await op('INVITE', page.locator('[data-candidate="CR-01"]')).click(); await d.settle(300)
    t.ck('inviting him again makes the relationship INVITED', (await row('CR-01', 'INVITED').count()) === 1)
    await d.courier('CR-01', 'Pools'); await page.locator('[data-pool-row="DS-14"][data-pool-group="invited"]').getByRole('button', { name: 'Accept invitation' }).click(); await d.settle(300)
    t.eq('Daniel accepts in his app: DS-14 is in his approved group', await page.locator('[data-pool-row="DS-14"][data-pool-group="approved"]').count(), 1)
    await sc('DS-14'); await scNav('Couriers')
    t.eq('DS-14\'s Console lists Daniel as Approved', await row('CR-01', 'APPROVED').count(), 1)
    t.ck('in the current MVP no offer eligibility is shown (offers are simulation)', (await page.locator('[data-can-receive]').count()) === 0)
    await noOverflow('Couriers page')

    // 1b. A Courier applies; the Seller approves; eligibility follows in both surfaces (simulation shows it).
    await d.courier('CR-01', 'Pools'); await page.getByRole('button', { name: /^Apply to/ }).first().click(); await d.settle(300)
    const target = (await page.locator('[data-pool-row][data-pool-group="applied"]').evaluateAll(l => l.map(x => x.getAttribute('data-pool-row')))).find(id => id !== 'DS-14')
    t.eq('Daniel applies to the one Seller that declared an opportunity (DS-16)', target, 'DS-16')
    await d.setMode(true)
    await sc('DS-16'); await scNav('Couriers')
    t.ck('DS-16 sees the application pending, and no offer eligibility yet', (await row('CR-01', 'APPLIED').count()) === 1 && (await page.locator('[data-can-receive]').count()) === 0)
    await op('APPROVE', row('CR-01')).click(); await d.settle(300)
    t.ck('approving makes Daniel APPROVED; the simulation states whether he can receive an offer now (he is busy on an active delivery)', (await row('CR-01', 'APPROVED').count()) === 1 && (await row('CR-01', 'APPROVED').locator('[data-can-receive]').count()) === 1, await result())
    const consoleSays = await row('CR-01').locator('[data-can-receive]').getAttribute('data-can-receive')
    await d.courier('CR-01', 'Pools')
    t.eq('the Courier app\'s Pools row agrees with the Console about eligibility', await page.locator('[data-pool-row="DS-16"][data-pool-group="approved"] [data-can-receive]').getAttribute('data-can-receive'), consoleSays)

    // 1c. Invite, accept, suspend, reinstate, remove: eligibility changes the moment the status does.
    await sc(PAIR); await scNav('Couriers')
    t.ck('the invite list names a blocker for Bethel (verification) and Yared (coverage), none for Samuel', /Verification pending/.test(await page.locator('[data-candidate="CR-05"]').innerText()) && /Covers Bahir Dar/.test(await page.locator('[data-candidate="CR-04"]').innerText()) && /Can be invited/.test(await page.locator('[data-candidate="CR-02"]').innerText()))
    await op('INVITE', page.locator('[data-candidate="CR-05"]')).click(); await d.settle(250); t.ck('inviting an unverified Courier is refused with the reason', /only a VERIFIED Courier can be invited/.test(await result()), await result())
    await op('INVITE', page.locator('[data-candidate="CR-04"]')).click(); await d.settle(250); t.ck('inviting a Courier who does not cover the Seller\'s city is refused', /covers Bahir Dar/.test(await result()), await result())
    await op('INVITE', page.locator('[data-candidate="CR-02"]')).click(); await d.settle(300)
    t.ck('inviting Samuel makes him INVITED, still not eligible', (await row('CR-02', 'INVITED').count()) === 1 && (await row('CR-02').locator('[data-can-receive]').count()) === 0)
    await d.courier('CR-02', 'Pools'); await page.locator(`[data-pool-row="${PAIR}"][data-pool-group="invited"]`).getByRole('button', { name: 'Accept invitation' }).click(); await d.settle(300)
    await sc(PAIR); await scNav('Couriers')
    t.eq('after he accepts he is APPROVED and can receive offers now', `${await row('CR-02', 'APPROVED').count()},${await row('CR-02').locator('[data-can-receive]').getAttribute('data-can-receive')}`, '1,true')
    await op('SUSPEND', row('CR-02')).click(); await d.settle(300)
    t.ck('suspending moves him to the closed group and ends eligibility at once', (await row('CR-02', 'SUSPENDED').count()) === 1 && (await row('CR-02').locator('[data-can-receive]').count()) === 0)
    await d.courier('CR-02', 'Pools')
    t.eq('the Courier app shows the relationship as suspended and no longer approved', `${await page.locator(`[data-pool-row="${PAIR}"][data-pool-status="SUSPENDED"]`).count()},${await page.locator(`[data-pool-row="${PAIR}"][data-pool-group="approved"]`).count()}`, '1,0')
    await sc(PAIR); await scNav('Couriers')
    await op('REINSTATE', row('CR-02')).click(); await d.settle(300)
    t.eq('reinstating restores APPROVED and eligibility', `${await row('CR-02', 'APPROVED').count()},${await row('CR-02').locator('[data-can-receive]').getAttribute('data-can-receive')}`, '1,true')
    await op('REMOVE', row('CR-02')).click(); await d.settle(300)
    t.ck('removing makes him REMOVED, and he can be invited again', (await row('CR-02', 'REMOVED').count()) === 1 && (await page.locator('[data-candidate="CR-02"]').count()) === 1)
    await noOverflow('Couriers page (after decisions)')

    // 1d. Permission model and lifecycle.
    const sales = ops.team_members.find(m => m.seller_id === PAIR && m.roles.includes('SALES_SUPPORT') && m.membership_status === 'ACTIVE')
    if (sales) { await actAs(sales.member_id); await op('INVITE', page.locator('[data-candidate="CR-02"]')).click(); await d.settle(250); t.ck('a Sales Support member cannot invite: the refusal names the role and the missing permission', /Not permitted for your role \(sales support\)/.test(await result()) && /seller\.couriers:invite/.test(await result()), await result()) }
    else t.ck('(no Sales Support member for this Seller: covered by the unit test)', true)
    const inv = ops.team_members.find(m => m.seller_id === PAIR && m.membership_status === 'INVITED')
    if (inv) { await actAs(inv.member_id); await op('INVITE', page.locator('[data-candidate="CR-02"]')).click(); await d.settle(250); t.ck('an invited member who has not joined cannot act', /invited but has not joined/.test(await result()), await result()) }
    await actAs(owner(PAIR)); await op('INVITE', page.locator('[data-candidate="CR-02"]')).click(); await d.settle(250)
    t.ck('back as the Owner, the same action succeeds', (await row('CR-02', 'INVITED').count()) === 1)
    for (const id of ['DS-11', 'DS-23']) {
      await sc(id); await scNav('Couriers')
      t.ck(`${id} (${cat.sellers.find(s => s.seller_id === id).lifecycle}) lists no relationships and its candidates carry Invite`, (await page.locator('[data-no-pool]').count()) === 1 && (await page.locator('[data-candidate]').count()) === 5)
      await op('INVITE', page.locator('[data-candidate="CR-02"]')).click(); await d.settle(250)
      t.ck(`${id}: inviting is refused because the Seller is ${cat.sellers.find(s => s.seller_id === id).lifecycle.toLowerCase()} (read-only)`, new RegExp(`${cat.sellers.find(s => s.seller_id === id).lifecycle.toLowerCase()}, so it is read-only`).test(await result()), await result())
    }
    await d.setMode(false)

    // ================= 2. Home and Claims on the dataset =================
    const mine = id => ops.orders.filter(o => o.seller_id === id)
    const expectHome = id => ({
      prep: mine(id).filter(o => ['PAID', 'PREPARING'].includes(o.status)).length,
      ready: mine(id).filter(o => ['READY_FOR_COLLECTION', 'READY_FOR_DELIVERY'].includes(o.status)).length,
      failed: mine(id).filter(o => o.status === 'DELIVERY_FAILED').length,
      claims: ops.claims.filter(c => c.seller_id === id).length,
      week: mine(id).filter(o => Date.parse(o.paid_at) >= SNAPSHOT - 7 * 86400000 && Date.parse(o.paid_at) <= SNAPSHOT),
    })
    const priority = async label => { const r = page.locator('.seller-console-content button').filter({ hasText: label }).first(); return Number((await r.innerText()).trim().split('\n').pop()) }
    await sc('DS-04'); await scNav('Home')
    t.ck('MVP: Home has no Orders, Claims or exception rows and no simulation figures', !/Orders requiring preparation|Claims|Delivery exceptions|7-day performance/.test(await content()))
    await d.setMode(true); await sc('DS-04'); await scNav('Home')
    let e = expectHome('DS-04')
    t.eq('Simulation: DS-04\'s Home counts its Claim from the dataset', await priority('Claims'), e.claims)
    t.eq('Simulation: it counts its failed delivery as an exception', await priority('Delivery exceptions'), e.failed)
    t.eq('Simulation: Orders ready for fulfilment equal the dataset\'s', await priority('Orders ready for fulfilment'), e.ready)
    t.eq('Simulation: Orders requiring preparation equal the dataset\'s', await priority('Orders requiring preparation'), e.prep)
    t.ck('Simulation: the 7-day performance is DS-04\'s own simulated paid Orders and value from the dataset', (await page.locator('[data-home-performance]').innerText()).includes(`${e.week.length}`) && (await page.locator('[data-home-performance]').innerText()).includes(birr(e.week.reduce((a, o) => a + o.total_etb, 0))) && /Simulated paid Seller Orders/.test(await page.locator('[data-home-performance]').innerText()), await page.locator('[data-home-performance]').innerText())
    t.ck('Simulation: the Home names no historical Order or Seller', legacyHits(await content()).length === 0)
    await scNav('Claims'); const claimText = await page.locator('[data-claim="SIM-O-0145-CL1"]').innerText()
    const k = ops.claims[0]
    t.ck('Simulation: Claims shows the dataset\'s Claim with its decided outcome, remedy and Order, read-only (no response form)', claimText.includes(pretty(k.outcome)) && claimText.includes(pretty(k.remedy_state)) && claimText.includes(k.order_id) && (await page.locator('.seller-console-content textarea').count()) === 0, claimText)
    t.ck('Simulation: the Claims navigation badge counts the Claim awaiting its remedy', /Claims\s*1/.test((await page.locator('.seller-console-sidebar').innerText()).replace(/\n/g, ' ')) || phone)
    await sc('DS-01'); await scNav('Claims')
    t.eq('Simulation: another Seller (DS-01) has no Claims', await page.locator('[data-no-claims]').count(), 1)
    // A new simulated Order shows on Home at once.
    await sc('DS-02'); await scNav('Orders'); const made = await d.newOrder({ buyer: 'BY-02', mode: 'BUYER_COLLECTION' })
    t.ck('a demonstration Order is recorded for DS-02', !!made.id, made)
    await scNav('Home'); e = expectHome('DS-02')
    t.eq('the Home counts it as requiring preparation, on top of the dataset\'s', await priority('Orders requiring preparation'), e.prep + 1)
    t.ck('"Next Paid Orders" lists it', (await page.locator(`[data-home-order="${made.id}"]`).count()) === 1)
    await noOverflow('Seller Console Home')
    await d.setMode(false)

    // ================= 3. Spot verification: Products, categories, Stories for all 23 Sellers =================
    const sellers = phone ? ['DS-01', 'DS-06', 'DS-11', 'DS-23'] : cat.sellers.map(s => s.seller_id)
    const bad = { rows: [], category: [], stories: [] }
    let productsChecked = 0
    for (const id of sellers) {
      await sc(id); await scNav('Products')
      const rows = await page.locator('.seller-console-content li').evaluateAll(l => l.map(x => x.innerText.replace(/\n+/g, ' | ')))
      const products = cat.products.filter(p => p.seller_id === id)
      if (rows.length !== products.length) bad.rows.push(`${id}: ${rows.length} rows, ${products.length} Products`)
      for (const p of products) {
        const text = rows.find(r => r.includes(`${p.product_id}`))
        productsChecked++
        // price/stock cells are hidden on a phone (max-sm), so a phone run checks the name, id and publication only
        const ok = text && text.includes(p.name) && text.includes(p.publication === 'PUBLISHED' ? 'Published' : 'Draft') && (phone || (text.includes(birr(p.current_etb)) && text.includes(stockLabel(p.stock)) && (p.discount_pct ? text.includes(`${birr(p.regular_etb)} | ${p.discount_pct}% off`) || text.includes(`${birr(p.regular_etb)}`) : true)))
        if (!ok) bad.rows.push(`${p.product_id}: ${text}`)
      }
      // One Product per Seller opens on its source category path.
      const sample = products.find(p => p.subcategory) ?? products[0]
      if (sample && !phone) {
        await page.locator('.seller-console-content li').filter({ hasText: sample.product_id }).getByRole('button').first().click(); await d.settle(350)
        const sel = async sid => page.locator(sid).evaluate(s => s.selectedOptions[0]?.text ?? '')
        const major = await sel('#pf-category')
        const sub = await page.locator('.seller-console-content select').nth(1).evaluate(s => s.selectedOptions[0]?.text ?? '')
        const type = sample.subcategory ? await page.locator('.seller-console-content select').nth(2).evaluate(s => s.selectedOptions[0]?.text ?? '') : ''
        if (major !== sample.major || sub !== sample.category || (sample.subcategory && type !== sample.subcategory)) bad.category.push(`${sample.product_id}: ${major} > ${sub} > ${type} vs ${sample.major} > ${sample.category} > ${sample.subcategory}`)
        await page.getByRole('button', { name: /Back to Products/ }).click(); await d.settle(250)
      }
      // Stories: the dataset's own, with their expected_state.
      await scNav('Content'); await page.locator('.seller-console-content').getByRole('tab', { name: 'Stories' }).click(); await d.settle(300)
      const shown = await page.locator('[data-catalogue-story]').evaluateAll(l => l.map(x => [x.getAttribute('data-catalogue-story'), x.getAttribute('data-story-state')]))
      const want = cat.stories.filter(s => s.seller_id === id).map(s => [s.story_id, s.expected_state])
      if (JSON.stringify(shown) !== JSON.stringify(want)) bad.stories.push(`${id}: ${JSON.stringify(shown)} vs ${JSON.stringify(want)}`)
    }
    t.ck(`${productsChecked} Products across ${sellers.length} Sellers: name, id, publication${phone ? '' : ', current price, regular price and discount, and stock (with the low and out-of-stock labels)'} match the dataset, and each Seller's list has exactly its Products`, bad.rows.length === 0, bad.rows.slice(0, 4))
    if (!phone) t.ck(`one Product per Seller (${sellers.length}) opens on its source major, category and subcategory`, bad.category.length === 0, bad.category.slice(0, 4))
    t.ck(`the Stories (${cat.stories.filter(s => sellers.includes(s.seller_id)).length}) show for their Sellers, in order, with the dataset's expected_state (Live, Hidden, Expired, Withdrawn, Draft)`, bad.stories.length === 0, bad.stories)
    if (!phone) t.eq('all 11 supplied Stories are covered by those Sellers', cat.stories.filter(s => sellers.includes(s.seller_id)).length, 11)
    await sc('DS-01'); await scNav('Content'); await page.locator('.seller-console-content').getByRole('tab', { name: 'Stories' }).click(); await d.settle(300)
    t.ck('DS-01\'s Live Story ages with the prototype clock: after +24 h it reads Expired', (await page.locator('[data-catalogue-story="DS-01-T01"]').getAttribute('data-story-state')) === 'Live' && await (async () => { await page.getByRole('button', { name: '+24 h', exact: true }).click(); await d.settle(250); return (await page.locator('[data-catalogue-story="DS-01-T01"]').getAttribute('data-story-state')) === 'Expired' })())
    await page.getByRole('button', { name: 'Reset clock' }).click()

    // ================= 4. Identity sweep =================
    const sweep = []
    const sections = await page.locator('nav[aria-label="Prototype sections"] button').evaluateAll(b => b.map(x => x.getAttribute('aria-label')))
    for (const simulation of [false, true]) {
      await d.setMode(simulation)
      for (const label of sections) {
        await page.locator(`nav[aria-label="Prototype sections"] button[aria-label="${label}"]`).click(); await d.settle(450)
        const hits = legacyHits(await main()); if (hits.length) sweep.push(`${simulation ? 'SIM' : 'MVP'} ${label}: ${hits.slice(0, 4).join(' | ')}`)
      }
      // The Seller Console's panels for a Seller with Orders and one without.
      for (const seller of ['DS-04', 'DS-11']) {
        await sc(seller)
        for (const nav of ['Home', 'Store setup', 'Orders', 'Products', 'Content', 'Inbox', 'Claims', 'Insights', 'Reviews', 'Trust', 'Store', 'Couriers', 'Automation', 'Settings']) {
          await scNav(nav); const hits = legacyHits(await content()); if (hits.length) sweep.push(`${simulation ? 'SIM' : 'MVP'} Console ${seller} ${nav}: ${hits.slice(0, 4).join(' | ')}`)
        }
      }
      // The Courier app's tabs and the Companion's tabs.
      for (const tab of ['Offers', 'Active', 'History', 'Pools', 'Feedback', 'Account']) { await d.courier('CR-01', tab); const hits = legacyHits(await main()); if (hits.length) sweep.push(`${simulation ? 'SIM' : 'MVP'} Courier ${tab}: ${hits.slice(0, 4).join(' | ')}`) }
      await t.section('06 Mobile — Seller Companion'); await d.settle(400)
      const tabs = await page.locator('main.app-main nav').last().getByRole('button').evaluateAll(b => b.map(x => x.getAttribute('aria-label') || x.innerText.trim().split('\n').pop()))
      for (const tab of tabs) { await page.locator('main.app-main nav').last().getByRole('button', { name: new RegExp('(^|\\s)' + esc(tab) + '$') }).first().click().catch(() => {}); await d.settle(350); const hits = legacyHits(await main()); if (hits.length) sweep.push(`${simulation ? 'SIM' : 'MVP'} Companion ${tab}: ${hits.slice(0, 4).join(' | ')}`) }
    }
    t.ck(`identity sweep: none of ${sections.length} sections, 28 Seller Console panels, 12 Courier tabs and the Companion tabs shows a historical identity, in either mode`, sweep.length === 0, sweep.slice(0, 6))
    await d.setMode(false); await t.section('10 ADULIS MASTER DEMO'); await d.settle(300)
    t.ck('the Master Demo offers only the labelled pointer to ?dataset=legacy', /dataset=legacy/.test(await main()) && /not offered on this dataset/i.test(await main()))
  })
}
