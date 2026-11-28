// DEMO-002 (FR-016): the Operator Console on the marketplace dataset. All 23 Sellers inspectable with their lifecycle, the five Couriers, simulated Orders and Handoff evidence, and the work
// queues built from the dataset's own states (Courier comments pending moderation, reviews held by moderation, Scenes restricted or hidden, the one Claim, verification, the failed
// handoff). Moderation decisions act on the namespaced, resettable simulation store and reach the Courier app and the reputation readout. The current MVP hides simulated commerce.
// No historical identity appears. REAL app, marketplace dataset, 1440x900 and 390x844 (drawer navigation). Expected values are computed from the generated dataset.
import { suite, DATASET } from './harness.mjs'
import { drivers, cat, ops, SIM_KEY, sellerName } from './sim-helpers.mjs'
import { legacyHits } from './legacy-markers.mjs'

const lifecycle = l => cat.sellers.filter(s => s.lifecycle === l).length
const heldReviews = ops.reviews.filter(r => r.visibility !== 'PUBLISHED')
const pendingComment = ops.courier_comments.find(c => c.moderation_state === 'PENDING_REVIEW')
const pretty = s => s.replace(/_/g, ' ').toLowerCase()

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  await suite('op-marketplace', viewport, async (page, t) => {
    const d = drivers(page, t, viewport)
    const phone = d.phone
    const main = () => page.locator('main.app-main').innerText()
    const goOp = async label => {
      if (phone) { await page.getByRole('button', { name: 'Open Operator navigation' }).click(); await d.settle(250) }
      await page.locator('.operator-console-sidebar nav').getByRole('button', { name: new RegExp('^' + label) }).first().click(); await d.settle(450)
    }
    const noLegacy = async label => { const hits = legacyHits(await main()); t.ck(`${label}: no historical identity`, hits.length === 0, hits) }
    const noOverflow = async label => { const r = await d.noOverflow(label); t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, r.ok) }
    const closeDrawer = async () => { await page.locator('[data-op-drawer]').getByRole('button', { name: /^Close/ }).click(); await d.settle(250) }
    const rows = sel => page.locator(sel)
    t.ck('this suite runs on the marketplace dataset', DATASET === 'marketplace', DATASET)
    await t.open(); await t.section('09 Operator Console'); await d.settle(400)

    // ---- 1. MVP: the Seller directory, all 23, every lifecycle ----
    await goOp('Sellers'); let text = await main()
    t.eq('MVP: the directory lists all 23 Sellers', await rows('[data-op-seller]').count(), 23)
    t.ck('MVP: the header counts 21 active, 1 draft and 1 suspended', /23 Sellers · 21 active · 1 draft · 1 suspended/.test(text), text.slice(0, 300))
    t.eq('MVP: DS-11 is DRAFT and DS-23 is SUSPENDED in the list', `${await rows('[data-op-seller="DS-11"]').getAttribute('data-lifecycle')},${await rows('[data-op-seller="DS-23"]').getAttribute('data-lifecycle')}`, 'DRAFT,SUSPENDED')
    for (const [name, n] of [['draft', 1], ['suspended', 1], ['active', 21]]) { await page.getByRole('group', { name: 'Lifecycle' }).getByRole('button', { name, exact: true }).click(); await d.settle(200); t.eq(`MVP: the ${name} filter shows ${n}`, await rows('[data-op-seller]').count(), n) }
    await page.getByRole('group', { name: 'Lifecycle' }).getByRole('button', { name: 'All', exact: true }).click(); await d.settle(200)
    await page.getByPlaceholder(/Search Seller/).fill('aster'); await d.settle(250)
    t.eq('MVP: searching "aster" finds the one Seller', await rows('[data-op-seller]').count(), 1)
    await page.getByPlaceholder(/Search Seller/).fill(''); await d.settle(250)
    await noOverflow('Sellers directory'); await noLegacy('Sellers directory')

    // Every Seller opens and states the dataset's own facts (all 23 on desktop, a spread on the phone).
    const ids = phone ? ['DS-01', 'DS-11', 'DS-23', 'DS-16'] : cat.sellers.map(s => s.seller_id)
    let bad = []
    for (const id of ids) {
      const s = cat.sellers.find(x => x.seller_id === id)
      await rows(`[data-op-seller="${id}"]`).getByRole('button', { name: 'Inspect' }).click(); await d.settle(200)
      const tx = await page.locator('[data-op-drawer]').innerText()
      const products = cat.products.filter(p => p.seller_id === id), scenes = cat.scenes.filter(x => x.seller_id === id)
      const ok = tx.includes(s.name) && tx.includes(s.handle) && tx.includes(s.lifecycle) && tx.includes(s.mvp_trust) && tx.includes(s.mvp_demo_followers.toLocaleString('en-US')) && s.categories.every(c => tx.includes(c)) && tx.includes(`${products.filter(p => p.publication === 'PUBLISHED').length} published of ${products.length}`) && tx.includes(`${scenes.filter(x => x.visibility === 'PUBLIC').length} public of ${scenes.length}`) && tx.toLowerCase().includes(`team · ${ops.team_members.filter(m => m.seller_id === id).length} members`) && (s.lifecycle === 'ACTIVE' ? /Publicly visible/.test(tx) : /Publicly hidden/.test(tx))
      if (!ok) bad.push(id)
      await closeDrawer()
    }
    t.ck(`MVP: ${ids.length} Seller${ids.length === 1 ? '' : 's'} inspected: name, handle, lifecycle, Trust level, followers, category paths, product, Scene and team counts match the dataset; Draft and Suspended say publicly hidden`, bad.length === 0, bad)
    await rows('[data-op-seller="DS-23"]').getByRole('button', { name: 'Inspect' }).click(); await d.settle(200)
    t.ck('MVP: the Suspended Seller\'s inspect view carries no simulated Orders (simulation hidden)', !/Simulated Orders/.test(await page.locator('[data-op-drawer]').innerText()))
    await noOverflow('Seller inspect drawer'); await closeDrawer()

    // ---- 2. MVP: Couriers ----
    await goOp('Couriers'); text = await main()
    t.eq('MVP: the directory lists the 5 Couriers', await rows('[data-op-courier]').count(), 5)
    t.eq('MVP: only CR-05 is not VERIFIED (PENDING)', await rows('[data-op-courier][data-verification="PENDING"]').count(), 1)
    t.ck('MVP: availability is the MVP figure, no "(simulation)" label', !/\(simulation\)/.test(text))
    await rows('[data-op-courier="CR-01"]').getByRole('button', { name: 'Inspect' }).click(); await d.settle(250)
    const approved = ops.relationships_and_eligibility.filter(r => r.courier_id === 'CR-01' && r.relationship_status === 'APPROVED').length
    t.ck(`MVP: Daniel\'s inspect view lists his ${ops.relationships_and_eligibility.filter(r => r.courier_id === 'CR-01' && r.relationship_status).length} Seller relationships; no offer eligibility in the MVP`, (await page.locator('[data-op-relationship]').count()) === ops.relationships_and_eligibility.filter(r => r.courier_id === 'CR-01' && r.relationship_status).length && !/Can receive offers|Cannot receive offers/.test(await page.locator('[data-op-drawer]').innerText()) && approved === 6)
    await closeDrawer()
    await rows('[data-op-courier="CR-05"]').getByRole('button', { name: 'Inspect' }).click(); await d.settle(250)
    t.ck('MVP: Bethel\'s inspect view says she is not verified and cannot apply, accept or receive offers', /Not verified/.test(await page.locator('[data-op-drawer]').innerText()))
    await closeDrawer(); await noOverflow('Couriers directory'); await noLegacy('Couriers directory')

    // ---- 3. MVP: the queues hide simulated commerce ----
    await goOp('Orders and Handoffs'); text = await main()
    t.ck('MVP: Orders and Handoffs is the simulation gate, no Order rows', /Release 1 has no paid Orders/.test(text) && (await rows('[data-op-order]').count()) === 0)
    await goOp('Moderation'); text = await main()
    t.eq('MVP: Moderation shows only the 2 Scene cases (restricted DS-06-S05, hidden DS-23-S01)', (await page.locator('.rtable-row').allInnerTexts()).filter(r => /DS-06-S05|DS-23-S01/.test(r)).length, 2)
    t.ck('MVP: no Courier comment, held review, Claim or handoff in the queue', !/CC-009|SIM-O-\d/.test(text) && !/Decisions this session/.test(text))
    await goOp('Verification / Recovery'); text = await main()
    t.ck('MVP: Verification lists Courier CR-05 and Seller DS-11 from the dataset', /CR-05/.test(text) && /DS-11/.test(text) && /Bethel/.test(text) && /Pending social control/i.test(text), text.slice(0, 400))
    await goOp('Claims'); t.ck('MVP: Claims is gated', /Payment and refund Claims are deferred/.test(await main()))
    await goOp('Manual Handoff'); t.ck('MVP: Manual Handoff is gated', /Manual Handoff review needs live delivery handoff/.test(await main()))
    await goOp('Support'); t.ck('Support has no cases in the dataset: an honest empty queue, never a historical case', /No open cases in this queue in the supplied dataset/.test(await main()))
    await goOp('Trust Appeals'); t.ck('Trust Appeals has no cases in the dataset', /No open cases in this queue in the supplied dataset/.test(await main()))
    await goOp('Overview'); text = await main(); t.ck('MVP: the Overview shows no Claims or Manual Handoff tile', !/Urgent Claims|Manual Handoff/.test(text.slice(text.indexOf('Core Operations'))))
    await goOp('Founder Decisions'); t.ck('MVP: Founder Decisions is gated and names no historical Claim', /payment Claim on a paid Order/.test(await main())); await noLegacy('Founder Decisions (MVP)')
    await noOverflow('Operator queues')

    // ---- 4. Internal simulation: the dataset's states ----
    await d.setMode(true); await t.section('09 Operator Console'); await d.settle(400)
    await goOp('Moderation'); text = await main()
    t.eq('Simulation: Moderation lists 7 cases (1 comment, 4 held reviews, 2 Scenes)', (await page.locator('.rtable-row').count()), 7)
    t.ck('Simulation: it carries the INTERNAL SIMULATION bar with Reset', (await page.getByRole('region', { name: 'Internal simulation' }).count()) === 1)
    await goOp('Claims'); t.eq('Simulation: Claims lists the one supplied Claim', await page.locator('.rtable-row').filter({ hasText: 'SIM-O-0145-CL1' }).count(), 1)
    await goOp('Manual Handoff'); t.eq('Simulation: Manual Handoff lists the failed Order SIM-O-0145', await page.locator('.rtable-row').filter({ hasText: 'SIM-O-0145' }).count(), 1)
    await goOp('Overview'); text = await main(); t.ck('Simulation: the Overview counts Moderation backlog 7 and one Claim', /Moderation backlog\s*7/.test(text) && /Urgent Claims\s*1/.test(text), text.slice(text.indexOf('Core Operations'), text.indexOf('Core Operations') + 400))

    // Orders and Handoff evidence
    await goOp('Orders and Handoffs'); text = await main()
    t.eq('Simulation: all 146 Orders are listed, read-only', await rows('[data-op-order]').count(), 146)
    t.ck('Simulation: labelled internal simulation, and no action button on an Order', /INTERNAL SIMULATION/.test(text) && (await page.getByRole('button', { name: /^(Cancel|Mark ready|Start preparing)/ }).count()) === 0)
    await page.locator('select[aria-label="Order status"]').selectOption('DELIVERY_FAILED'); await d.settle(250)
    t.eq('Simulation: the status filter finds the one failed Order', await rows('[data-op-order]').count(), 1)
    await page.locator('select[aria-label="Order status"]').selectOption('ALL'); await page.getByPlaceholder(/Search Order id/).fill('SIM-O-0002'); await d.settle(250)
    await rows('[data-op-order="SIM-O-0002"]').click(); await d.settle(300)
    const ev = await page.locator('[data-op-drawer]').innerText()
    const o2 = ops.orders.find(o => o.order_id === 'SIM-O-0002'), hand = ops.handoffs.filter(h => h.order_id === 'SIM-O-0002')
    t.ck('Simulation: SIM-O-0002 evidence: seller, buyer, total, 8 timeline events and its two Handoffs with the DEMO_ONLY credential label', ev.includes(sellerName(o2.seller_id)) && ev.includes(`ETB ${o2.total_etb.toLocaleString('en-US')}`) && (ev.match(/^\d+\. /gm) ?? []).length === 8 && (await page.locator('[data-op-handoff]').count()) === hand.length && hand.length === 2 && ev.includes('DEMO_ONLY_NON_REUSABLE') && /INTERNAL SIMULATION/.test(ev), ev.slice(0, 500))
    await noOverflow('Order evidence drawer'); await closeDrawer()
    await page.getByPlaceholder(/Search Order id/).fill('SIM-O-0145'); await d.settle(250)
    await rows('[data-op-order="SIM-O-0145"]').click(); await d.settle(300)
    t.ck('Simulation: SIM-O-0145 shows its failed delivery, its Claim and no completed handoff', /Delivery failed/.test(await page.locator('[data-op-drawer]').innerText()) && /SIM-O-0145-CL1/.test(await page.locator('[data-op-drawer]').innerText()))
    await closeDrawer()
    await noLegacy('Orders and Handoffs'); await noOverflow('Orders and Handoffs')

    // Couriers: simulation labels and eligibility
    await goOp('Couriers'); text = await main(); t.ck('Simulation: availability carries the (simulation) label', /\(simulation\)/.test(text))
    await rows('[data-op-courier="CR-02"]').getByRole('button', { name: 'Inspect' }).click(); await d.settle(250)
    t.ck('Simulation: Samuel\'s approved relationships state whether they can receive offers now', /Can receive offers now|Cannot receive offers now/.test(await page.locator('[data-op-drawer]').innerText()))
    await closeDrawer()
    await goOp('Founder Decisions'); text = await main()
    t.ck('Simulation: Founder Decisions shows the dataset\'s one Claim, read-only, with the labelled legacy pointer', /SIM-O-0145-CL1/.test(text) && /\?dataset=legacy/.test(text) && (await page.getByRole('button', { name: /Approve/ }).count()) === 0)
    const pointerless = text.replace(/The dual-Founder approval walkthrough uses the historical fixtures: open the app with \?dataset=legacy to see it\./, '')
    t.ck('Simulation: Founder Decisions names no historical identity beyond the pointer', legacyHits(pointerless).length === 0, legacyHits(pointerless))

    // ---- 5. Moderation actions act on the simulation store ----
    await goOp('Moderation')
    const log0 = JSON.parse((await d.simState()) ?? '[]')
    await page.locator('.rtable-row').filter({ hasText: 'DS-06-S05' }).getByRole('button', { name: 'Open' }).click(); await d.settle(300)
    t.ck('a restricted Scene case is read-only: it states the restriction and offers no Scene action', /no Scene moderation action/.test(await page.locator('[data-op-drawer]').innerText()) && (await page.locator('[data-op-drawer]').getByRole('button', { name: /Approve|Hide|Restore/ }).count()) === 0)
    await closeDrawer()
    await page.locator('.rtable-row').filter({ hasText: pendingComment.comment_id }).getByRole('button', { name: 'Open' }).click(); await d.settle(300)
    const dr = await page.locator('[data-op-drawer]').innerText()
    t.ck('the pending Courier comment case shows its text, Order and Courier and the simulation label', dr.includes(pendingComment.text) && dr.includes(pendingComment.order_id) && /INTERNAL SIMULATION/.test(dr) && /Pending moderation/.test(dr))
    await page.locator('[data-op-drawer]').getByRole('button', { name: 'Approve comment' }).click(); await d.settle(350)
    t.ck('approving states the outcome and the case now reads Visible', /approved: shared with eligible Sellers and counted/.test(await page.locator('[data-op-drawer]').innerText()) && /Visible/.test(await page.locator('[data-op-case]').innerText()))
    await closeDrawer()
    t.eq('the queue now lists 6 cases, and the decision is recorded for this session', `${await page.locator('.rtable-row').count()},${await page.locator('[data-op-decisions]').count()}`, '6,1')
    const log1 = JSON.parse((await d.simState()) ?? '[]')
    t.ck('the action is in the namespaced simulation log, not the MVP Seller workspace', log1.length === log0.length + 1 && log1.at(-1).type === 'MODERATE' && log1.at(-1).decision === 'APPROVE')
    // The Courier app reads the same store.
    await d.courier(pendingComment.courier_id, 'Feedback')
    t.eq('the Courier app shows that comment as visible now (moderation cleared)', await page.locator(`[data-comment="${pendingComment.comment_id}"]`).getAttribute('data-comment-moderation'), 'VISIBLE_FIXTURE')
    // A held review: approve it, then it counts in the live reputation columns only.
    await t.section('09 Operator Console'); await goOp('Moderation')
    const held = heldReviews[0]
    await page.locator('.rtable-row').filter({ hasText: held.review_id }).getByRole('button', { name: 'Open' }).click(); await d.settle(300)
    t.ck('a held review case states its moderation note, with approve and keep-hidden choices', (await page.locator('[data-op-drawer]').innerText()).includes(held.moderation_note) && (await page.getByRole('button', { name: 'Approve and publish review' }).count()) === 1)
    await page.getByRole('button', { name: 'Approve and publish review' }).click(); await d.settle(300); await closeDrawer()
    t.eq('the queue lists 5 cases after the review is published', await page.locator('.rtable-row').count(), 5)
    await goOp('Reputation reconciliation'); text = await main()
    t.ck('the reconciliation readout still reconciles 23 of 23 Sellers from the source rows and counts one more visible review live', /Sellers reconciled\s*23 of 23/.test(text) && new RegExp(`Reviews visible / held by moderation\\s*${ops.reviews.length - heldReviews.length + 1} / ${heldReviews.length - 1}`).test(text), text.slice(text.indexOf('Sellers reconciled'), text.indexOf('Sellers reconciled') + 200))
    // Reset clears both decisions.
    await goOp('Moderation'); await page.getByRole('button', { name: 'Reset simulation' }).click(); await d.settle(350)
    t.eq('Reset simulation restores all 7 cases and clears the decisions', `${await page.locator('.rtable-row').count()},${await page.locator('[data-op-decisions]').count()}`, '7,0')
    t.ck('the simulation log is empty again', ((await d.simState()) ?? '[]') === '[]' || JSON.parse((await d.simState()) ?? '[]').length === 0)
    // Hiding a visible comment removes it from the Courier; the MVP view never changes the store.
    const logBefore = await d.simState()
    await d.setMode(false); await t.section('09 Operator Console'); await goOp('Moderation')
    t.ck('switching to the current MVP leaves the store untouched and shows only the 2 Scene cases', (await d.simState()) === logBefore && (await page.locator('.rtable-row').count()) === 2)

    // ---- 6. Search is dataset-driven ----
    await d.setMode(true); await t.section('09 Operator Console'); await goOp('Global Search')
    await page.getByPlaceholder(/Search name, handle/).fill('SIM-O-0145'); await d.settle(300)
    text = await main(); t.ck('Simulation: Global Search finds the Order and its Claim by id', text.includes('SIM-O-0145') && text.includes('SIM-O-0145-CL1') && /Claim/.test(text) && /Order/.test(text), text.slice(0, 200))
    await page.getByPlaceholder(/Search name, handle/).fill('Aster'); await d.settle(300)
    t.ck('Global Search finds the Seller from the dataset', (await main()).includes('DS-01'))
    await goOp('Seller Search'); text = await main()
    t.ck('Seller Search opens on the dataset\'s default Seller, not a historical one', text.includes('DS-01') && legacyHits(text).length === 0)
    for (const label of ['Overview', 'Unified Work Queue', 'Account Search', 'Configuration', 'Audit', 'Operator Access', 'System Health']) { await goOp(label); await noLegacy(`Operator ${label} (simulation)`) }
  })
}
