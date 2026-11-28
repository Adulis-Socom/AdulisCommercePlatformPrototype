// COURIER-002 (FR-006): the Courier showcase and the 115 relationship / eligibility records, in the Courier app (five Courier accounts with independent, namespaced
// state) and the Seller Console. Real pool memberships (a status) are told apart from opportunities, outside-coverage pairs, verification requirements and ineligible
// Sellers; a null status is never a membership. Apply, Accept invitation and Withdraw are session actions in the simulation store. REAL app, marketplace dataset,
// 1440x900 and 390x844. Expected values are computed from the generated dataset.
import { suite } from './harness.mjs'
import { drivers, ops, SIM_KEY } from './sim-helpers.mjs'

const rel = ops.relationships_and_eligibility
const of = (c, f) => rel.filter(r => r.courier_id === c && f(r))
const count = (c, state) => of(c, r => r.opportunity_state === state).length
const heading = (text, label) => Number((text.match(new RegExp(`${label} · (\\d+)`)) ?? [])[1])

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('courier002', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const noOverflow = async label => { const r = await d.noOverflow(label); t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, r.ok) }
    const pools = (id) => d.courier(id, 'Pools')
    const openAll = async () => { await page.locator('details').evaluateAll(l => l.forEach(x => (x.open = true))); await d.settle(150) }
    const group = g => d.pools(g)
    await t.open()

    // ---- 1. Current MVP: relationship records are DEMO rows (shown), compensation and offers are simulation (hidden) ----
    const wsBefore = await d.wsState()
    await pools('CR-01')
    let text = await d.main()
    t.ck('MVP: the Courier app has six tabs: Offers, Active, History, Pools, Feedback, Account, all inside the phone frame', await page.evaluate(() => { const nav = document.querySelector('[data-surface="marketplace-courier"] nav'); const f = nav.getBoundingClientRect(); return [...nav.querySelectorAll('button')].length === 6 && [...nav.querySelectorAll('button')].every(b => { const r = b.getBoundingClientRect(); return r.left >= f.left - 1 && r.right <= f.right + 1 }) }))
    t.ck('MVP: Daniel\'s Pools tab opens with no simulation bar, no compensation amount and no Order ids', !/INTERNAL SIMULATION/.test(text) && !/simulated compensation|ETB \d/i.test(text) && !/SIM-O-/.test(text) && /Seller pools/.test(text), text.slice(0, 200))
    t.eq('MVP: Daniel has 6 approved pool relationships', await group('approved').count(), 6)
    t.eq('MVP: 1 invitation (DS-12) and 1 application (DS-14)', `${await group('invited').count()},${await group('applied').count()}`, '1,1')
    t.eq('MVP: suspended, removed and rejected are listed together (DS-05, DS-10, DS-19)', await group('closed').count(), 3)
    t.eq('MVP: 1 eligible opportunity (DS-16, can_apply)', await group('eligible').count(), 1)
    t.ck('MVP: no "can receive offers" claim (offers are simulation only)', (await page.locator('[data-can-receive]').count()) === 0)
    await noOverflow('Pools')
    await d.courier('CR-01', 'Feedback'); t.ck('MVP: Feedback is the simulation gate, no comments', /internal-simulation experiment/i.test(await d.main()) && (await page.locator('[data-comment]').count()) === 0)

    // ---- 2. Five Courier accounts, each with its own relationships ----
    const expectApproved = { 'CR-01': 6, 'CR-02': 4, 'CR-03': 2, 'CR-04': 1, 'CR-05': 0 }
    for (const [id, n] of Object.entries(expectApproved)) {
      await pools(id)
      t.eq(`${id}: ${n} approved pool relationship(s), from the dataset`, await group('approved').count(), n)
      t.eq(`${id}: ${of(id, r => r.relationship_status !== null).length} real relationships in all, never counting a null status`, await page.locator('[data-pool-row][data-pool-status]').count(), of(id, r => r.relationship_status !== null).length)
    }
    await pools('CR-02')
    t.ck('Samuel (CR-02): 1 invitation (DS-06) and 1 eligible opportunity (DS-19), his own list not Daniel\'s', (await group('invited').count()) === 1 && (await page.locator('[data-pool-row="DS-06"][data-pool-group="invited"]').count()) === 1 && (await page.locator('[data-pool-row="DS-19"][data-pool-group="eligible"]').count()) === 1)

    // ---- 3. Not available: outside coverage, verification, ineligible Sellers, no declared opportunity ----
    await pools('CR-01'); await openAll(); text = await d.main()
    t.eq('Daniel: outside-coverage heading matches the dataset', heading(text, 'Outside your coverage'), count('CR-01', 'OUTSIDE_COVERAGE'))
    t.eq('Daniel: Seller-ineligible heading matches the dataset (a Draft and a Suspended Seller)', heading(text, 'Seller not accepting Couriers'), count('CR-01', 'SELLER_INELIGIBLE'))
    t.ck('Daniel: DS-11 (Draft) and DS-23 (Suspended) are named as not accepting Couriers, not as pools', (await page.locator('[data-pool-row="DS-11"][data-pool-group="SELLER_INELIGIBLE"]').count()) === 1 && (await page.locator('[data-pool-row="DS-23"][data-pool-group="SELLER_INELIGIBLE"]').innerText()).includes('suspended'))
    t.ck('Daniel: DS-21 has no declared opportunity, listed separately', (await page.locator('[data-pool-row="DS-21"][data-pool-group="NO_OPPORTUNITY"]').count()) === 1)
    t.ck('a null relationship_status is never listed as a pool: DS-03 (outside coverage) has no status pill', (await page.locator('[data-pool-row="DS-03"] [data-status-pill]').count()) === 0 && (await page.locator('[data-pool-row="DS-03"][data-pool-group="OUTSIDE_COVERAGE"]').count()) === 1)
    await pools('CR-05'); await openAll(); text = await d.main()
    t.ck('Bethel (CR-05, PENDING): a verification banner states what she cannot do', (await page.locator('[data-verification-restriction]').count()) === 1 && /cannot apply to a Seller, accept an invitation or receive a Delivery Offer/.test(text))
    t.eq('Bethel: verification-required heading matches the dataset (11)', heading(text, 'Verification required'), count('CR-05', 'VERIFICATION_REQUIRED'))
    t.ck('Bethel: no approved, invited or applied relationship and nothing eligible to apply to', (await page.locator('[data-pool-row][data-pool-status]').count()) === 0 && (await group('eligible').count()) === 0 && (await page.getByRole('button', { name: /^Apply to/ }).count()) === 0)
    await noOverflow('Bethel Pools')

    // ---- 4. The private note and the relationship history ----
    await pools('CR-01')
    t.ck('Daniel sees the private relationship note on his own pool rows, labelled as visible to him only', (await page.locator('[data-private-note]').count()) === 11 && /visible to you only/.test(await page.locator('[data-private-note]').first().innerText()))
    await page.locator('[data-pool-row="DS-19"] details summary').click(); await d.settle(150)
    t.ck('history from relationship_events: DS-19 applied, approved, then suspended', /Application pending[\s\S]*Approved[\s\S]*Suspended/.test(await page.locator('[data-pool-row="DS-19"] [data-rel-history]').innerText()))
    t.ck('history carries real dates from the dataset', /13 Oct|23 Oct|25 Oct|27 Oct/.test(await page.locator('[data-pool-row="DS-19"] [data-rel-history]').innerText()))

    // ---- 5. The internal simulation: availability, compensation, session actions ----
    await d.setMode(true)
    await pools('CR-01'); text = await d.main()
    t.ck('simulation: the label and simulated clock are present on Pools', await page.getByRole('region', { name: 'Internal simulation' }).isVisible())
    t.ck('Daniel (busy, active delivery SIM-O-0138) cannot receive offers from his approved Sellers, and the page says why', (await page.locator('[data-can-receive="false"]').count()) === 6 && /Courier is busy right now/.test(text))
    t.ck('simulated compensation appears for the eligible DS-16 (ETB 110, simulation only)', /simulated compensation ETB 110 \(simulation only\)/.test(await page.locator('[data-pool-row="DS-16"]').innerText()))
    await d.courier('CR-01', 'Active'); t.ck('Daniel\'s active delivery SIM-O-0138 is listed on his Active tab', (await page.locator('[data-order-row="SIM-O-0138"]').count()) === 1)
    await pools('CR-04'); t.ck('Yared (CR-04, unavailable): approved with DS-15 but cannot receive offers: unavailable', /Cannot receive offers now: Courier is unavailable/.test(await page.locator('[data-pool-row="DS-15"]').innerText()))
    await pools('CR-03'); t.ck('Mekdes (CR-03, available): can receive offers from both approved Sellers', (await page.locator('[data-can-receive="true"]').count()) === 2)

    // Apply / Withdraw
    await pools('CR-01')
    await page.getByRole('button', { name: 'Apply to Wollo Weave' }).or(page.getByRole('button', { name: /^Apply to/ })).first().click(); await d.settle(300)
    let r = await d.lastResult()
    t.ck('Daniel applies to DS-16: accepted with a plain note, the row is now an application', r.kind === 'ok' && /Application sent/.test(r.text) && (await page.locator('[data-pool-row="DS-16"][data-pool-group="applied"]').count()) === 1 && (await group('eligible').count()) === 0, r)
    t.eq('the application is not an approved pool: approved stays at 6', await group('approved').count(), 6)
    await page.locator('[data-pool-row="DS-16"]').getByRole('button', { name: 'Withdraw application' }).click(); await d.settle(300)
    t.ck('Daniel withdraws it: back to an eligible opportunity (no membership)', (await page.locator('[data-pool-row="DS-16"][data-pool-group="eligible"]').count()) === 1 && (await group('applied').count()) === 1)
    await page.locator('[data-pool-row="DS-14"]').getByRole('button', { name: 'Withdraw application' }).click(); await d.settle(300)
    t.ck('he can also withdraw the supplied application to DS-14: it returns to eligible', (await page.locator('[data-pool-row="DS-14"][data-pool-group="eligible"]').count()) === 1 && (await group('applied').count()) === 0)
    await page.locator('[data-pool-row="DS-12"]').getByRole('button', { name: 'Accept invitation' }).click(); await d.settle(300)
    t.ck('Daniel accepts the DS-12 invitation: an approved pool, history gains a session event', (await page.locator('[data-pool-row="DS-12"][data-pool-group="approved"]').count()) === 1 && (await group('approved').count()) === 7)
    await page.locator('[data-pool-row="DS-12"] details summary').click(); await d.settle(150)
    t.ck('the DS-12 history lists the supplied invitation and the session approval', /Invited[\s\S]*Approved[\s\S]*this session/.test(await page.locator('[data-pool-row="DS-12"] [data-rel-history]').innerText()))
    const log = await d.simState()
    t.ck('the actions are kept in the namespaced simulation store as a replayable log', /"APPLY"/.test(log) && /"WITHDRAW"/.test(log) && /"ACCEPT_INVITATION"/.test(log) && SIM_KEY.includes('marketplace'))
    await pools('CR-02')
    t.ck('state is independent per Courier: Samuel still has his own invitation to DS-06 and no DS-12 row', (await page.locator('[data-pool-row="DS-06"][data-pool-group="invited"]').count()) === 1 && (await page.locator('[data-pool-row="DS-12"][data-pool-group="approved"]').count()) === 1 && (await group('approved').count()) === 4)
    await pools('CR-01'); t.ck('switching back: Daniel\'s changes are kept for Daniel', (await group('approved').count()) === 7)
    t.eq('the MVP Seller workspace store was never written by any relationship action', await d.wsState(), wsBefore)

    // ---- 6. Samuel's alternative assignment: invitation, offer, acceptance on the Seller's Order SIM-O-0141 ----
    await d.consoleOrders('DS-06'); await d.openOrder('SIM-O-0141')
    t.ck('DS-06 Order SIM-O-0141: Samuel cannot receive the offer yet (not an approved pool member), with the reason', /Cannot receive this offer: Not an approved member/.test(await page.locator('[data-courier-offer="CR-02"]').innerText()))
    await pools('CR-02')
    await page.locator('[data-pool-row="DS-06"]').getByRole('button', { name: 'Accept invitation' }).click(); await d.settle(300)
    t.ck('Samuel accepts the DS-06 invitation: approved, and he can receive DS-06 offers now', (await page.locator('[data-pool-row="DS-06"][data-pool-group="approved"]').count()) === 1 && /Can receive this Seller's offers now/.test(await page.locator('[data-pool-row="DS-06"]').innerText()))
    await d.consoleOrders('DS-06'); await d.openOrder('SIM-O-0141')
    t.eq('SIM-O-0141: Samuel is now eligible for the offer', await page.locator('[data-courier-offer="CR-02"]').getAttribute('data-eligible'), 'true')
    await page.locator('[data-courier-offer="CR-02"]').getByRole('button', { name: 'Offer to Samuel' }).click(); await d.settle(300)
    t.ck('the DS-06 Seller offers SIM-O-0141 to Samuel', (await d.lastResult()).kind === 'ok')
    await d.courier('CR-02', 'Offers')
    t.ck('Samuel sees the offer', (await page.locator('[data-offer="SIM-O-0141-OFF2"]').count()) === 1)
    await page.locator('[data-offer="SIM-O-0141-OFF2"]').getByRole('button', { name: 'Accept offer' }).click(); await d.settle(300)
    t.ck('Samuel accepts it as the alternative to the busy Daniel: Courier assigned', (await d.lastResult()).kind === 'ok')
    await d.courier('CR-01', 'Offers'); await page.locator('[data-offer="SIM-O-0141-OFF1"]').count().then(n => t.eq('Daniel\'s offer for SIM-O-0141 is no longer pending (the first acceptance wins)', n, 0))
    await d.courier('CR-02', 'Active'); t.ck('Samuel\'s Active tab lists SIM-O-0141 as Courier assigned', (await page.locator('[data-order-row="SIM-O-0141"]').count()) === 1 && /Courier assigned/.test(await d.row('SIM-O-0141').innerText()))
    await noOverflow('Samuel Active')

    // ---- 7. Offers are refused with reasons when the rules fail ----
    await d.courier('CR-01', 'Offers')
    t.ck('Daniel has no pending offer left after the first acceptance', (await page.locator('[data-no-offers]').count()) === 1)
    // Reset restores the supplied relationships
    await page.getByRole('button', { name: 'Reset simulation' }).first().click(); await d.settle(400)
    await pools('CR-01')
    t.ck('Reset simulation restores the supplied relationships (DS-12 invited again, 6 approved)', (await page.locator('[data-pool-row="DS-12"][data-pool-group="invited"]').count()) === 1 && (await group('approved').count()) === 6)
    t.eq('after reset the store holds no log', await d.simState(), null)
    await noOverflow('Daniel Pools')

    // ---- 8. The Seller Console shows only that Seller's own relationships ----
    await d.consoleOrders('DS-01')
    if (viewport.width <= 640) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await d.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Couriers/ }).first().click() } else await page.getByRole('button', { name: /^Couriers/ }).first().click()
    await d.settle(400); text = await d.main()
    const ds01 = rel.filter(r => r.seller_id === 'DS-01' && r.relationship_status)
    t.eq('DS-01 Couriers lists its own pool rows (Approved: Daniel and Samuel)', await page.locator('[data-seller-pool-row]').count(), ds01.length)
    t.ck('the Seller sees relationship status, and no other Seller\'s name or relationships', ds01.every(r => (r.courier_id === 'CR-01' ? /Daniel/ : /Samuel/).test(text)) && !/DS-06|DS-12/.test(text) && /Private Courier relationships for Aster & Thread only/.test(text))
    t.ck('the private note text is not shown to the Seller', !/Relationship-specific status is private/.test(text) && (await page.locator('[data-private-note]').count()) === 0)
    await noOverflow('Seller Console Couriers')
    // a Seller with a suspended / Draft status has no pool
    await d.consoleOrders('DS-11'); if (viewport.width <= 640) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await d.settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Couriers/ }).first().click() } else await page.getByRole('button', { name: /^Couriers/ }).first().click()
    await d.settle(400); t.ck('DS-11 (Draft): no Courier relationships, and it says the Seller is draft', (await page.locator('[data-no-pool]').count()) === 1 && /draft/i.test(await d.main()))
  })
}
