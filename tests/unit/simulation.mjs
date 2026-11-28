// SIM-001 / SIM-002: the pure internal-simulation Order rules (src/simulation/orders.ts), against the supplied operations dataset (no browser).
// `node tests/unit/simulation.mjs`
import { readFileSync } from 'node:fs'
import { TRANSITIONS, apply, buildWorld, canReceiveOffers, courierEligibility, credentialToken, currentCredential, expectedHandoff, scenarioStatus, seedState, CRED_TTL_MIN, isoAt } from '../../src/simulation/orders.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
const cat = json('src/marketplace/data/catalogue.json'), ops = json('src/marketplace/data/operations.json')
const W = buildWorld(ops, cat), seed = seedState(ops)

// ---- seed ----
ck('seed loads 146 Orders, 192 lines, 848 events, 164 Handoffs, 33 offers', Object.keys(seed.orders).length === 146 && Object.values(seed.lines).flat().length === 192 && Object.values(seed.events).flat().length === 848 && Object.values(seed.handoffs).flat().length === 164 && Object.keys(seed.offers).length === 33)
ck('every seeded status equals its last timeline event', Object.values(seed.orders).every(o => seed.events[o.id].at(-1).state === o.status))
ck('derived scenario status reproduces scenario_status for all 146 Orders', ops.orders.every(r => scenarioStatus(seed, seed.orders[r.order_id]) === r.scenario_status), ops.orders.filter(r => scenarioStatus(seed, seed.orders[r.order_id]) !== r.scenario_status).map(r => r.order_id))

// ---- state machine: the table is exactly what the dataset does ----
const observed = {}
for (const o of ops.orders) {
  const ev = seed.events[o.order_id]
  for (let i = 1; i < ev.length; i++) (observed[o.fulfilment_mode] ??= new Set()).add(`${ev[i - 1].state}>${ev[i].state}`)
  if (ev[0].state !== 'PAID') ck('every Order starts as PAID', false, o.order_id)
}
const table = Object.fromEntries(Object.entries(TRANSITIONS).map(([m, t]) => [m, new Set(Object.entries(t).flatMap(([f, tos]) => tos.map(x => `${f}>${x}`)))]))
ck('allowed transitions equal the observed transitions per fulfilment mode (nothing invented, nothing unused)', Object.keys(table).every(m => [...table[m]].sort().join() === [...observed[m]].sort().join()), Object.keys(table).map(m => [m, [...table[m]].filter(x => !observed[m].has(x)), [...observed[m]].filter(x => !table[m].has(x))]))
ck('only Buyer Collection can be cancelled, only from PREPARING; Seller Delivery has no return', TRANSITIONS.BUYER_COLLECTION.PREPARING.includes('CANCELLED') && !TRANSITIONS.COURIER_DELIVERY.PREPARING.includes('CANCELLED') && !TRANSITIONS.SELLER_DELIVERY.DELIVERY_FAILED)

// ---- eligibility ----
const rel = ops.relationships_and_eligibility
ck('the relationship-level rule reproduces can_receive_offer for all 115 rows', rel.every(r => canReceiveOffers(W, seed, r.courier_id, r.seller_id).ok === (r.can_receive_offer === true)), rel.filter(r => canReceiveOffers(W, seed, r.courier_id, r.seller_id).ok !== (r.can_receive_offer === true)).map(r => r.relationship_id))
const code = (c, s) => canReceiveOffers(W, seed, c, s).code
ck('a SUSPENDED relationship is refused (CR-01 x DS-19)', code('CR-01', 'DS-19') === 'RELATIONSHIP_SUSPENDED')
ck('a REMOVED relationship is refused (CR-01 x DS-05)', code('CR-01', 'DS-05') === 'RELATIONSHIP_REMOVED')
ck('INVITED, APPLIED, REJECTED and no relationship are not pool membership', ['CR-01|DS-12', 'CR-01|DS-14', 'CR-01|DS-10', 'CR-03|DS-01'].every(k => code(...k.split('|')) === 'NOT_POOL_MEMBER'))
ck('a PENDING (unverified) Courier cannot receive offers', code('CR-05', 'DS-01') === 'NOT_POOL_MEMBER' && W.couriers['CR-05'].verification === 'PENDING')
const unverified = { ...seed, availability: { ...seed.availability } }
// COURIER-002: the relationship status now lives in the simulation state (so a session action can change it), not in the static world
ck('even an approved, available PENDING Courier is refused as not verified', canReceiveOffers(W, { ...unverified, relStatus: { ...unverified.relStatus, 'CR-05|DS-01': 'APPROVED' }, availability: { ...unverified.availability, 'CR-05': 'AVAILABLE' } }, 'CR-05', 'DS-01').code === 'NOT_VERIFIED')
ck('an UNAVAILABLE and a BUSY Courier are refused (CR-04 x DS-15, CR-01 x DS-01)', code('CR-04', 'DS-15') === 'UNAVAILABLE' && code('CR-01', 'DS-01') === 'UNAVAILABLE')
ck('an AVAILABLE approved verified Courier is eligible (CR-02 x DS-04)', canReceiveOffers(W, seed, 'CR-02', 'DS-04').ok)

// ---- helpers over apply ----
const step = (s, a) => { const r = apply(W, s, a); if (!r.ok) throw new Error(`${a.type} refused: ${r.reason}`); return r.state }
const refused = (label, s, a, wantCode) => { const r = apply(W, s, a); const same = !r.ok; ck(label, !r.ok && (!wantCode || r.code === wantCode) && same, r.ok ? 'accepted' : r.code + ': ' + r.reason); return r }
const P = { seller: id => ({ role: 'SELLER', id }), buyer: id => ({ role: 'BUYER', id }), courier: id => ({ role: 'COURIER', id }) }
const firstProduct = sid => Object.values(W.products).find(p => p.sellerId === sid && p.published && p.stock > 0 && !p.variants).id
const create = (s, sid, buyer, mode) => { const before = Object.keys(s.orders).length; const n = step(s, { type: 'CREATE_ORDER', actor: P.seller(sid), buyerId: buyer, mode, productId: firstProduct(sid) }); const id = Object.keys(n.orders).find(k => !s.orders[k]); ck(`a ${mode} demonstration Order is created PAID (${id})`, n.orders[id].status === 'PAID' && Object.keys(n.orders).length === before + 1 && n.events[id].length === 1); return [n, id] }
const status = (s, id) => s.orders[id].status

// ---- Buyer Collection: prepare -> ready -> QR -> completed ----
{
  let [s, id] = create(seed, 'DS-01', 'BY-02', 'BUYER_COLLECTION')
  const S = P.seller('DS-01'), B = P.buyer('BY-02')
  refused('only the Order\'s Seller starts preparing', s, { type: 'START_PREPARING', actor: P.seller('DS-02'), orderId: id }, 'WRONG_PARTY')
  s = step(s, { type: 'START_PREPARING', actor: S, orderId: id }); s = step(s, { type: 'MARK_READY', actor: S, orderId: id })
  ck('Buyer Collection is ready for collection', status(s, id) === 'READY_FOR_COLLECTION')
  refused('scanning before a code is displayed is refused', s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY' }, 'NOT_PRESENTED')
  refused('the Buyer cannot present the Seller\'s code', s, { type: 'PRESENT', actor: B, orderId: id, stage: 'DELIVERY' }, 'WRONG_PARTY')
  s = step(s, { type: 'PRESENT', actor: S, orderId: id, stage: 'DELIVERY' })
  const tok = currentCredential(s, id, 'DELIVERY').token
  ck('the credential is the deterministic token for Order + Stage + issue 1, expiring in 10 simulated minutes', tok === credentialToken(id, 'DELIVERY', 1) && currentCredential(s, id, 'DELIVERY').expiresAt === s.now + CRED_TTL_MIN, tok)
  refused('a Seller cannot scan the final code', s, { type: 'SCAN', actor: S, orderId: id, stage: 'DELIVERY' }, 'WRONG_PARTY')
  refused('another Buyer cannot scan this Order', s, { type: 'SCAN', actor: P.buyer('BY-01'), orderId: id, stage: 'DELIVERY', token: tok }, 'NOT_YOUR_ORDER')
  refused('an incorrect token is refused', s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: 'ADU-SIM-AAAA-BBBB' }, 'INCORRECT_TOKEN')
  refused('a Buyer scanning the pickup stage is refused (wrong party)', s, { type: 'SCAN', actor: B, orderId: id, stage: 'PICKUP', token: tok }, 'WRONG_PARTY')
  const s2 = step(s, { type: 'ADVANCE_TIME', minutes: CRED_TTL_MIN })
  refused('an expired token is refused (simulated time)', s2, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: tok }, 'EXPIRED')
  const s3 = step(s2, { type: 'PRESENT', actor: S, orderId: id, stage: 'DELIVERY' })
  ck('a new code after expiry is a new issue, and the old one is superseded', currentCredential(s3, id, 'DELIVERY').token !== tok)
  refused('the superseded code no longer works', s3, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: tok }, 'EXPIRED')
  const done = step(s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: tok })
  ck('the Buyer\'s scan verifies the final handoff and completes the Order', status(done, id) === 'COMPLETED' && done.orders[id].finalHandoffId === `${id}-H-DELIVERY` && done.lines[id].every(l => l.received))
  ck('the timeline gained FINAL_DELIVERY_VERIFIED then COMPLETED', done.events[id].slice(-2).map(e => e.state).join() === 'FINAL_DELIVERY_VERIFIED,COMPLETED')
  ck('the Handoff evidence is recorded (presenter Seller, scanner Buyer, QR, ACCEPTED_SIMULATED, DEMO_ONLY_NON_REUSABLE)', JSON.stringify(done.handoffs[id].map(h => [h.stage, h.presenterId, h.scannerId, h.method, h.result, h.credential])) === JSON.stringify([['DELIVERY', 'DS-01', 'BY-02', 'QR', 'ACCEPTED_SIMULATED', 'DEMO_ONLY_NON_REUSABLE']]))
  refused('a repeated scan of a used token is refused and changes nothing', done, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: tok }, 'ALREADY_USED')
  // wrong-Order token: the token of another Order
  const [s4, id2] = create(step(step(s, { type: 'PRESENT', actor: S, orderId: id, stage: 'DELIVERY' }), { type: 'ADVANCE_TIME', minutes: 1 }), 'DS-01', 'BY-02', 'BUYER_COLLECTION')
  let t = step(step(s4, { type: 'START_PREPARING', actor: S, orderId: id2 }), { type: 'MARK_READY', actor: S, orderId: id2 })
  t = step(t, { type: 'PRESENT', actor: S, orderId: id2, stage: 'DELIVERY' })
  refused('another Order\'s token is refused (wrong Order)', t, { type: 'SCAN', actor: B, orderId: id2, stage: 'DELIVERY', token: tok }, 'WRONG_ORDER')
  // cancellation
  let [c, cid] = create(seed, 'DS-01', 'BY-02', 'BUYER_COLLECTION'); c = step(c, { type: 'START_PREPARING', actor: S, orderId: cid })
  c = step(c, { type: 'CANCEL', actor: S, orderId: cid })
  ck('a Buyer Collection Order is cancelled while preparing, with the dataset\'s reason', c.orders[cid].status === 'CANCELLED' && c.orders[cid].cancelReason === 'SIMULATED_BUYER_REQUEST')
  refused('a cancelled Order cannot start again', c, { type: 'MARK_READY', actor: S, orderId: cid }, 'BAD_STATE')
}

// ---- Seller Delivery: prepare -> start delivery -> QR -> completed; failed attempt ----
{
  let [s, id] = create(seed, 'DS-12', 'BY-02', 'SELLER_DELIVERY')
  const S = P.seller('DS-12'), B = P.buyer('BY-02')
  s = step(step(s, { type: 'START_PREPARING', actor: S, orderId: id }), { type: 'MARK_READY', actor: S, orderId: id })
  refused('Seller Delivery cannot be started by someone else', s, { type: 'START_DELIVERY', actor: P.seller('DS-01'), orderId: id }, 'WRONG_PARTY')
  s = step(s, { type: 'START_DELIVERY', actor: S, orderId: id })
  s = step(s, { type: 'PRESENT', actor: S, orderId: id, stage: 'DELIVERY' })
  const f = step(s, { type: 'FAIL_DELIVERY', actor: S, orderId: id, reason: 'BUYER_UNAVAILABLE' })
  ck('a failed attempt records the reason and ends a Seller Delivery Order there', f.orders[id].status === 'DELIVERY_FAILED' && f.orders[id].attemptReason === 'BUYER_UNAVAILABLE' && !expectedHandoff(f.orders[id]))
  const done = step(s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY' })
  ck('scanning with the field empty reads the displayed code; the Order completes', status(done, id) === 'COMPLETED')
}

// ---- Courier Delivery: offer -> accept -> pickup (custody only) -> transport -> final QR -> completed ----
{
  let [s, id] = create(seed, 'DS-04', 'BY-02', 'COURIER_DELIVERY')
  const S = P.seller('DS-04'), B = P.buyer('BY-02'), C2 = P.courier('CR-02'), C1 = P.courier('CR-01')
  s = step(step(s, { type: 'START_PREPARING', actor: S, orderId: id }), { type: 'MARK_READY', actor: S, orderId: id })
  ck('ready for a Courier, no offer yet', status(s, id) === 'READY_FOR_DELIVERY' && scenarioStatus(s, s.orders[id]) === 'READY_FOR_DELIVERY')
  refused('a busy Courier is refused an offer with a reason (CR-01)', s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-01' }, 'UNAVAILABLE')
  refused('a Courier outside the pool is refused (CR-03)', s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-03' }, 'NOT_POOL_MEMBER')
  refused('an unverified Courier is refused (CR-05)', s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-05' }, 'NOT_POOL_MEMBER')
  refused('an unavailable Courier is refused (CR-04)', s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-04' }, 'NOT_POOL_MEMBER')
  refused('another Seller cannot offer this Order', s, { type: 'OFFER', actor: P.seller('DS-01'), orderId: id, courierId: 'CR-02' }, 'WRONG_PARTY')
  s = step(s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-02' })
  ck('a pending offer makes the scenario status OFFER_PENDING and CR-02 is NOT the assigned Courier', scenarioStatus(s, s.orders[id]) === 'OFFER_PENDING' && s.orders[id].assignedCourier === null)
  refused('a duplicate pending offer is refused', s, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-02' }, 'DUPLICATE_OFFER')
  const offerId = Object.values(s.offers).find(o => o.orderId === id).id
  refused('another Courier cannot answer the offer', s, { type: 'ACCEPT_OFFER', actor: C1, offerId }, 'WRONG_PARTY')
  // reject re-opens
  const rej = step(s, { type: 'REJECT_OFFER', actor: C2, offerId })
  ck('a rejected offer re-opens the Order: still ready, no assignment, can be offered again', status(rej, id) === 'READY_FOR_DELIVERY' && rej.offers[offerId].status === 'REJECTED' && courierEligibility(W, rej, id, 'CR-02').ok)
  // availability toggle makes a second Courier eligible; first accept wins and expires the other offer
  refused('a Courier with an active delivery cannot mark themselves available', s, { type: 'SET_AVAILABILITY', actor: C1, value: 'AVAILABLE' }, 'ACTIVE_DELIVERY')
  let m = step(step(s, { type: 'PRESENT', actor: C1, orderId: 'SIM-O-0138', stage: 'DELIVERY' }), { type: 'SCAN', actor: P.buyer('BY-02'), orderId: 'SIM-O-0138', stage: 'DELIVERY' })
  ck('completing the active delivery (SIM-O-0138) frees CR-01, who becomes eligible', m.availability['CR-01'] === 'AVAILABLE' && courierEligibility(W, m, id, 'CR-01').ok)
  m = step(m, { type: 'OFFER', actor: S, orderId: id, courierId: 'CR-01' })
  const o1 = Object.values(m.offers).find(o => o.orderId === id && o.courierId === 'CR-01').id
  const acc = step(m, { type: 'ACCEPT_OFFER', actor: C1, offerId: o1 })
  ck('the first acceptance assigns that Courier, marks them busy and expires the other pending offer', acc.orders[id].assignedCourier === 'CR-01' && acc.availability['CR-01'] === 'BUSY' && acc.offers[offerId].status === 'EXPIRED' && acc.offers[o1].status === 'ACCEPTED' && status(acc, id) === 'COURIER_ASSIGNED')
  refused('a second Courier cannot then accept the same Order', acc, { type: 'ACCEPT_OFFER', actor: C2, offerId }, 'OFFER_CLOSED')
  s = step(s, { type: 'ACCEPT_OFFER', actor: C2, offerId })
  ck('CR-02 accepted: assigned, COURIER_ASSIGNED, busy', status(s, id) === 'COURIER_ASSIGNED' && s.orders[id].assignedCourier === 'CR-02' && s.availability['CR-02'] === 'BUSY')
  // pickup
  refused('the Buyer cannot scan the pickup code', s, { type: 'SCAN', actor: B, orderId: id, stage: 'PICKUP' }, 'WRONG_PARTY')
  refused('the pickup code cannot be scanned before it is displayed', s, { type: 'SCAN', actor: C2, orderId: id, stage: 'PICKUP' }, 'NOT_PRESENTED')
  refused('a Courier who is not assigned cannot present the final code of this Order', s, { type: 'PRESENT', actor: C1, orderId: id, stage: 'PICKUP' }, 'WRONG_PARTY')
  s = step(s, { type: 'PRESENT', actor: S, orderId: id, stage: 'PICKUP' })
  const ptok = currentCredential(s, id, 'PICKUP').token
  refused('an unauthorised Courier (CR-01) cannot scan this pickup', s, { type: 'SCAN', actor: C1, orderId: id, stage: 'PICKUP', token: ptok }, 'NOT_ASSIGNED')
  refused('pickup tokens cannot complete the final stage (wrong stage token)', s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY', token: ptok }, 'WRONG_STAGE_TOKEN')
  s = step(s, { type: 'SCAN', actor: C2, orderId: id, stage: 'PICKUP', token: ptok })
  ck('pickup verification transfers custody ONLY: PICKUP_VERIFIED, not completed, no final handoff', status(s, id) === 'PICKUP_VERIFIED' && s.orders[id].finalHandoffId === null && s.handoffs[id].length === 1)
  refused('a repeated pickup scan is refused', s, { type: 'SCAN', actor: C2, orderId: id, stage: 'PICKUP', token: ptok }, 'ALREADY_USED')
  refused('only the assigned Courier starts transport', s, { type: 'START_TRANSPORT', actor: C1, orderId: id }, 'NOT_ASSIGNED')
  s = step(s, { type: 'START_TRANSPORT', actor: C2, orderId: id })
  ck('out for delivery', status(s, id) === 'OUT_FOR_DELIVERY')
  refused('an unauthorised Courier cannot present the final code', s, { type: 'PRESENT', actor: C1, orderId: id, stage: 'DELIVERY' }, 'NOT_ASSIGNED')
  s = step(s, { type: 'PRESENT', actor: C2, orderId: id, stage: 'DELIVERY' })
  refused('a Courier cannot scan the final code', s, { type: 'SCAN', actor: C2, orderId: id, stage: 'DELIVERY' }, 'WRONG_PARTY')
  const fin = step(s, { type: 'SCAN', actor: B, orderId: id, stage: 'DELIVERY' })
  ck('the Buyer\'s scan of the final QR completes the Order and frees the Courier', status(fin, id) === 'COMPLETED' && fin.availability['CR-02'] === 'AVAILABLE' && fin.handoffs[id].map(h => h.stage).join() === 'PICKUP,DELIVERY')
  // failed attempt -> return
  let fl = step(s, { type: 'FAIL_DELIVERY', actor: C2, orderId: id, reason: 'BUYER_UNAVAILABLE' })
  refused('a Buyer cannot record a failed attempt', s, { type: 'FAIL_DELIVERY', actor: B, orderId: id, reason: 'BUYER_UNAVAILABLE' }, 'WRONG_PARTY')
  refused('an unrecorded reason is refused', s, { type: 'FAIL_DELIVERY', actor: C2, orderId: id, reason: 'WHATEVER' }, 'BAD_REASON')
  fl = step(fl, { type: 'PRESENT', actor: C2, orderId: id, stage: 'RETURN' })
  refused('only the Seller scans the return', fl, { type: 'SCAN', actor: B, orderId: id, stage: 'RETURN' }, 'WRONG_PARTY')
  fl = step(fl, { type: 'SCAN', actor: S, orderId: id, stage: 'RETURN' })
  ck('the return handoff returns the Order to the Seller and frees the Courier', status(fl, id) === 'RETURNED_TO_SELLER' && scenarioStatus(fl, fl.orders[id]) === 'DELIVERY_FAILED' && fl.availability['CR-02'] === 'AVAILABLE' && fl.handoffs[id].at(-1).method === 'SIMULATED_RETURN_EVIDENCE')
}

// ---- the supplied open Orders behave as the dataset says ----
{
  const C1 = P.courier('CR-01'), C2 = P.courier('CR-02')
  const acc = r => r.ok
  ck('the three pending offers are CR-02, CR-02, CR-01 and none of those Couriers is assigned', ['SIM-O-0139', 'SIM-O-0140', 'SIM-O-0141'].every(id => seed.orders[id].assignedCourier === null) && ['SIM-O-0139-OFF1', 'SIM-O-0140-OFF1', 'SIM-O-0141-OFF1'].map(i => seed.offers[i].courierId).join() === 'CR-02,CR-02,CR-01')
  refused('CR-01 (busy) cannot accept its pending offer SIM-O-0141-OFF1', seed, { type: 'ACCEPT_OFFER', actor: C1, offerId: 'SIM-O-0141-OFF1' }, 'UNAVAILABLE')
  ck('a refused acceptance leaves the offer pending (the same state object is kept)', seed.offers['SIM-O-0141-OFF1'].status === 'PENDING')
  ck('CR-02 can accept SIM-O-0139-OFF1', acc(apply(W, seed, { type: 'ACCEPT_OFFER', actor: C2, offerId: 'SIM-O-0139-OFF1' })))
  refused('a closed (rejected) offer cannot be answered', seed, { type: 'ACCEPT_OFFER', actor: C2, offerId: 'SIM-O-0139-OFF2' }, 'OFFER_CLOSED')
  const active = expectedHandoff(seed.orders['SIM-O-0138'])
  ck('SIM-O-0138 (out for delivery, CR-01) awaits the Courier\'s final code, scanned by BY-02', active.stage === 'DELIVERY' && active.presenter.id === 'CR-01' && active.scanner.id === 'BY-02')
  ck('SIM-O-0142 awaits the Seller\'s collection code; SIM-O-0143 the Seller\'s final code', expectedHandoff(seed.orders['SIM-O-0142']).presenter.id === 'DS-08' && expectedHandoff(seed.orders['SIM-O-0143']).presenter.id === 'DS-12')
  ck('SIM-O-0144 (courier delivery returned) and SIM-O-0145/0146 have no open handoff', ['SIM-O-0144', 'SIM-O-0145', 'SIM-O-0146'].every(i => !expectedHandoff(seed.orders[i])))
  refused('a Courier cannot scan the final QR of an Order they are not assigned to', seed, { type: 'SCAN', actor: C2, orderId: 'SIM-O-0138', stage: 'DELIVERY' }, 'WRONG_PARTY')
  refused('a suspended-Seller Order cannot be created (DS-23)', seed, { type: 'CREATE_ORDER', actor: P.seller('DS-23'), buyerId: 'BY-02', mode: 'BUYER_COLLECTION', productId: Object.values(W.products).find(p => p.sellerId === 'DS-23').id }, 'SELLER_NOT_ACTIVE')
  refused('a Seller without Courier Delivery enabled cannot create a Courier Order (DS-05)', seed, { type: 'CREATE_ORDER', actor: P.seller('DS-05'), buyerId: 'BY-02', mode: 'COURIER_DELIVERY', productId: firstProduct('DS-05') }, 'COURIER_NOT_ENABLED')
}

// ---- credentials and clock ----
ck('credential tokens are deterministic and differ by Order, Stage and issue', credentialToken('SIM-O-0001', 'PICKUP', 1) === credentialToken('SIM-O-0001', 'PICKUP', 1) && new Set([credentialToken('SIM-O-0001', 'PICKUP', 1), credentialToken('SIM-O-0001', 'DELIVERY', 1), credentialToken('SIM-O-0002', 'PICKUP', 1), credentialToken('SIM-O-0001', 'PICKUP', 2)]).size === 4)
ck('tokens look like ADU-SIM-XXXX-XXXX', /^ADU-SIM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(credentialToken('SIM-O-0001', 'PICKUP', 1)))
ck('the simulated clock starts at the 2026-11-27 10:00 snapshot and advances only by minutes', isoAt(0) === '2026-11-27T10:00:00+03:00' && isoAt(75) === '2026-11-27T11:15:00+03:00')
refused('advancing time by zero or a fraction is refused', seed, { type: 'ADVANCE_TIME', minutes: 0 }, 'BAD_TIME')
{
  // replay: the same log from the seed gives the same state (what sessionStorage relies on)
  const log = [{ type: 'CREATE_ORDER', actor: P.seller('DS-01'), buyerId: 'BY-01', mode: 'BUYER_COLLECTION', productId: firstProduct('DS-01') }, { type: 'ADVANCE_TIME', minutes: 5 }]
  const run = () => log.reduce((s, a) => step(s, a), seed)
  ck('replaying a log from the seed is deterministic', JSON.stringify(run()) === JSON.stringify(run()))
  ck('the seed itself is never mutated by actions', Object.keys(seed.orders).length === 146 && seed.now === 0)
}

console.log(`\nsimulation: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
