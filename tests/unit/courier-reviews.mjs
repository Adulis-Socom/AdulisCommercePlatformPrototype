// COURIER-001 / COURIER-002 / SIM-003: relationship classification, comment provenance and visibility, review eligibility and aggregation on the supplied
// operations dataset (pure modules, no browser). `node tests/unit/courier-reviews.mjs`
import { readFileSync } from 'node:fs'
import { apply, buildWorld, seedState } from '../../src/simulation/orders.ts'
import { classify, canApply, poolsOf, privateNote, visibleRelationships, historyOf } from '../../src/simulation/relationships.ts'
import { commentsFor, summary, provenanceError, isShared, isPending, commentableOrders, servedSellers } from '../../src/simulation/feedback.ts'
import { reconcile, sellerService, productQuality, grantStatus, visibleReviews, avgMatches } from '../../src/simulation/reviews.ts'
import { canReceiveOffers } from '../../src/simulation/orders.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
const cat = json('src/marketplace/data/catalogue.json'), ops = json('src/marketplace/data/operations.json')
const W = buildWorld(ops, cat), seed = seedState(ops)
const D = id => ({ role: 'COURIER', id }), S = id => ({ role: 'SELLER', id }), B = id => ({ role: 'BUYER', id })
const ok = r => r.ok === true, code = r => (r.ok ? 'OK' : r.code)

// ================= COURIER-002: relationships =================
const rows = ops.relationships_and_eligibility
const expectedGroup = { RELATIONSHIP_EXISTS: 'RELATIONSHIP', INVITATION: 'RELATIONSHIP', ELIGIBLE_TO_APPLY: 'ELIGIBLE', OUTSIDE_COVERAGE: 'OUTSIDE_COVERAGE', VERIFICATION_REQUIRED: 'VERIFICATION_REQUIRED', SELLER_INELIGIBLE: 'SELLER_INELIGIBLE', NO_DECLARED_OPPORTUNITY: 'NO_OPPORTUNITY' }
ck('the world carries all 115 relationship rows and 37 events', Object.keys(W.relationships).length === 115 && Object.values(seed.relEvents).flat().length === 37)
ck('classification reproduces opportunity_state for all 115 rows at seed', rows.every(r => classify(W, seed, r.courier_id, r.seller_id).group === expectedGroup[r.opportunity_state]), rows.filter(r => classify(W, seed, r.courier_id, r.seller_id).group !== expectedGroup[r.opportunity_state]).map(r => r.relationship_id))
ck('canApply reproduces can_apply for all 115 rows (exactly 2 true)', rows.every(r => canApply(W, seed, r.courier_id, r.seller_id) === r.can_apply) && rows.filter(r => r.can_apply).length === 2)
ck('a null relationship_status is never a pool relationship (96 pairs), the 19 with a status are', rows.filter(r => r.relationship_status === null).every(r => classify(W, seed, r.courier_id, r.seller_id).group !== 'RELATIONSHIP') && rows.filter(r => r.relationship_status !== null).length === 19)
{
  const p = poolsOf(W, seed, 'CR-01')
  ck('Daniel: 6 approved, 1 invited, 1 applied, 1 rejected, 1 suspended, 1 removed relationships', ['APPROVED', 'INVITED', 'APPLIED', 'REJECTED', 'SUSPENDED', 'REMOVED'].map(st => p.byStatus(st).length).join() === '6,1,1,1,1,1')
  ck('Daniel: 1 eligible to apply (DS-16), Draft and Suspended Sellers are ineligible, no verification restriction', p.byGroup('ELIGIBLE').map(r => r.sellerId).join() === 'DS-16' && p.byGroup('SELLER_INELIGIBLE').length === 2 && p.byGroup('VERIFICATION_REQUIRED').length === 0)
  const b = poolsOf(W, seed, 'CR-05')
  ck('Bethel (PENDING): no relationship at all, verification required for the in-coverage Sellers, none eligible', b.rows.filter(r => r.group === 'RELATIONSHIP').length === 0 && b.byGroup('VERIFICATION_REQUIRED').length === 11 && b.byGroup('ELIGIBLE').length === 0)
}
ck('relationship history is the supplied events in order (CR-01 x DS-19: applied, approved, suspended)', historyOf(W, seed, 'CR-01', 'DS-19').map(e => e.status).join() === 'APPLIED,APPROVED,SUSPENDED' && historyOf(W, seed, 'CR-01', 'DS-19').every(e => !e.session))
// actions
const run = (s, a) => apply(W, s, a)
{
  let r = run(seed, { type: 'APPLY', actor: D('CR-01'), sellerId: 'DS-16' })
  ck('Daniel applies to DS-16 (can_apply): APPLIED, event recorded as a session action', ok(r) && classify(W, r.state, 'CR-01', 'DS-16').status === 'APPLIED' && historyOf(W, r.state, 'CR-01', 'DS-16').at(-1).session)
  ck('the seed is never mutated by an action', seed.relStatus['CR-01|DS-16'] === null && !(seed.relEvents['CR-01-DS-16'] ?? []).length)
  ck('an application is not pool membership: APPLIED cannot receive offers', canReceiveOffers(W, r.state, 'CR-01', 'DS-16').code === 'NOT_POOL_MEMBER')
  ck('a second application is refused (ALREADY_RELATED)', code(run(r.state, { type: 'APPLY', actor: D('CR-01'), sellerId: 'DS-16' })) === 'ALREADY_RELATED')
  const w = run(r.state, { type: 'WITHDRAW', actor: D('CR-01'), sellerId: 'DS-16' })
  ck('withdrawing returns the pair to eligible-to-apply (no membership) and may apply again', ok(w) && classify(W, w.state, 'CR-01', 'DS-16').group === 'ELIGIBLE' && ok(run(w.state, { type: 'APPLY', actor: D('CR-01'), sellerId: 'DS-16' })))
  ck('withdraw needs a pending application (an INVITED or APPROVED pair is refused)', code(run(seed, { type: 'WITHDRAW', actor: D('CR-01'), sellerId: 'DS-12' })) === 'NOT_APPLIED' && code(run(seed, { type: 'WITHDRAW', actor: D('CR-01'), sellerId: 'DS-01' })) === 'NOT_APPLIED')
  const wd = run(seed, { type: 'WITHDRAW', actor: D('CR-01'), sellerId: 'DS-14' })
  ck('Daniel withdraws his supplied application to DS-14 (declared opportunity, so eligible again)', ok(wd) && classify(W, wd.state, 'CR-01', 'DS-14').group === 'ELIGIBLE')
  const a = run(seed, { type: 'ACCEPT_INVITATION', actor: D('CR-02'), sellerId: 'DS-06' })
  ck('Samuel accepts the DS-06 invitation: APPROVED and now eligible for DS-06 offers (he is available and verified)', ok(a) && classify(W, a.state, 'CR-02', 'DS-06').status === 'APPROVED' && canReceiveOffers(W, a.state, 'CR-02', 'DS-06').ok)
  ck('accepting without an invitation is refused (NOT_INVITED)', code(run(seed, { type: 'ACCEPT_INVITATION', actor: D('CR-01'), sellerId: 'DS-14' })) === 'NOT_INVITED')
  ck('apply is refused outside coverage, for a Draft Seller, for a Suspended Seller and when there is no declared opportunity, each with its group', [['CR-01', 'DS-03', 'OUTSIDE_COVERAGE'], ['CR-01', 'DS-11', 'SELLER_INELIGIBLE'], ['CR-01', 'DS-23', 'SELLER_INELIGIBLE'], ['CR-01', 'DS-21', 'NO_OPPORTUNITY']].every(([c, s, g]) => classify(W, seed, c, s).group === g && code(run(seed, { type: 'APPLY', actor: D(c), sellerId: s })) === g))
  ck('Bethel (PENDING verification) cannot apply anywhere: VERIFICATION_REQUIRED', code(run(seed, { type: 'APPLY', actor: D('CR-05'), sellerId: 'DS-01' })) === 'VERIFICATION_REQUIRED')
  ck('REJECTED, SUSPENDED and REMOVED relationships cannot apply again', ['DS-10', 'DS-19', 'DS-05'].every(s => code(run(seed, { type: 'APPLY', actor: D('CR-01'), sellerId: s })) === 'ALREADY_RELATED'))
  ck('a Courier changes only their own relationships (a Seller or another Courier is refused)', code(run(seed, { type: 'APPLY', actor: S('DS-16'), sellerId: 'DS-16' })) === 'WRONG_PARTY')
  const x = run(seed, { type: 'ACCEPT_INVITATION', actor: D('CR-01'), sellerId: 'DS-12' })
  ck('state is independent per Courier: Daniel accepting DS-12 leaves Samuel\'s pairs untouched', ok(x) && Object.keys(x.state.relStatus).filter(k => x.state.relStatus[k] !== seed.relStatus[k]).join() === 'CR-01|DS-12')
}
// privacy of the private relationship notes
{
  const note = privateNote(W, { role: 'COURIER', id: 'CR-01' }, 'CR-01', 'DS-01')
  ck('the private note is visible to the Courier it concerns only', !!note && privateNote(W, { role: 'COURIER', id: 'CR-02' }, 'CR-01', 'DS-01') === null && privateNote(W, { role: 'SELLER', id: 'DS-01' }, 'CR-01', 'DS-01') === null && privateNote(W, { role: 'BUYER', id: 'BY-01' }, 'CR-01', 'DS-01') === null && privateNote(W, { role: 'PUBLIC', id: '' }, 'CR-01', 'DS-01') === null)
  const own = visibleRelationships(W, seed, { role: 'COURIER', id: 'CR-01' })
  ck('a Courier sees all 23 pairs of their own and nobody else\'s', own.length === 23 && own.every(r => r.courierId === 'CR-01'))
  const ds01 = visibleRelationships(W, seed, { role: 'SELLER', id: 'DS-01' })
  ck('a Seller sees only its own pool rows (a status), never other Sellers\' relationships', ds01.every(r => r.sellerId === 'DS-01' && r.status) && ds01.length === rows.filter(r => r.seller_id === 'DS-01' && r.relationship_status).length)
  ck('a Buyer, the public and an Operator-less viewer see no relationship row', ['BUYER', 'PUBLIC'].every(role => visibleRelationships(W, seed, { role, id: 'BY-01' }).length === 0))
}

// ================= COURIER-001: comments =================
const all = Object.values(seed.comments)
ck('25 comments load with provenance: order, seller and Courier all match the Order', all.length === 25 && all.every(c => provenanceError(seed, c) === null), all.filter(c => provenanceError(seed, c)).map(c => [c.id, provenanceError(seed, c)]))
ck('provenance is refused for a wrong Seller, a wrong Courier, an unfinished Order and an unknown Order', provenanceError(seed, { ...all[0], sellerId: 'DS-01' }) !== null && provenanceError(seed, { ...all[0], courierId: 'CR-02' }) !== null && provenanceError(seed, { courierId: 'CR-01', sellerId: 'DS-01', orderId: 'SIM-O-0138' }) !== null && provenanceError(seed, { ...all[0], orderId: 'NOPE' }) !== null)
ck('24 are shared and visible, 1 (CC-009) is pending moderation', all.filter(isShared).length === 24 && all.filter(isPending).map(c => c.id).join() === 'CC-009')
{
  const daniel = commentsFor(seed, { role: 'COURIER', id: 'CR-01' }, 'CR-01'), sum = summary(daniel)
  ck('Daniel sees all 12 comments about him, the pending one included', daniel.length === 12 && daniel.some(c => c.id === 'CC-009'))
  ck('the aggregate counts the 11 visible comments only: the pending one is reported beside it', sum.total === 11 && sum.pending === 1 && sum.positive + sum.neutral + sum.negative === 11, sum)
  ck('a Courier sees no comments about another Courier', commentsFor(seed, { role: 'COURIER', id: 'CR-02' }, 'CR-01').length === 0)
  const ds17 = commentsFor(seed, { role: 'SELLER', id: 'DS-17' }, 'CR-01')
  ck('a Seller Daniel served sees the shared comments about him (also those other Sellers wrote), never the pending one', ds17.length === 11 && !ds17.some(isPending) && ds17.some(c => c.sellerId !== 'DS-17'))
  ck('DS-06 (author of the pending CC-009, served by Daniel) sees its own pending comment, flagged', commentsFor(seed, { role: 'SELLER', id: 'DS-06' }, 'CR-01').some(c => c.id === 'CC-009' && isPending(c)))
  ck('another Seller that Daniel served does not see CC-009', !commentsFor(seed, { role: 'SELLER', id: 'DS-08' }, 'CR-01').some(c => c.id === 'CC-009'))
  ck('a Seller Daniel never served sees none (DS-16), nor does a Buyer or the public', commentsFor(seed, { role: 'SELLER', id: 'DS-16' }, 'CR-01').length === 0 && commentsFor(seed, { role: 'BUYER', id: 'BY-01' }, 'CR-01').length === 0 && commentsFor(seed, { role: 'PUBLIC', id: '' }, 'CR-01').length === 0 && !servedSellers(seed, 'CR-01').has('DS-16'))
  ck('comments carry no rating field (sentiment, topic and text only)', all.every(c => !('stars' in c) && !('rating' in c)))
}
{
  const without = { ...seed, comments: Object.fromEntries(Object.entries(seed.comments).filter(([k]) => k !== 'CC-001')) }
  ck('commentable Orders: finished, served by a Courier, not yet commented (SIM-O-0136 once its comment is removed)', commentableOrders(without, 'DS-05').map(o => o.id).join() === 'SIM-O-0136' && commentableOrders(seed, 'DS-05').length === 0)
  const a = { type: 'COMMENT', actor: S('DS-05'), orderId: 'SIM-O-0136', sentiment: 'POSITIVE', topic: 'RELIABILITY', text: ' On time, checked the pickup reference. ' }
  const r = apply(W, without, a)
  ck('a Seller comments on a finished Order its Courier served: recorded PENDING moderation, trimmed', ok(r) && Object.values(r.state.comments).find(c => !c.seeded).moderation === 'PENDING_REVIEW' && Object.values(r.state.comments).find(c => !c.seeded).text.startsWith('On time'))
  const after = commentsFor(r.state, { role: 'SELLER', id: 'DS-05' }, 'CR-01')
  ck('the new comment shows to its author as pending, is not counted, and is hidden from another Seller', after.some(c => !c.seeded && isPending(c)) && summary(after).pending === 1 && !commentsFor(r.state, { role: 'SELLER', id: 'DS-17' }, 'CR-01').some(c => !c.seeded))
  ck('a duplicate comment on the same Order is refused', code(apply(W, r.state, a)) === 'DUPLICATE_COMMENT')
  ck('only the Order\'s Seller can comment (another Seller, the Courier, a Buyer: WRONG_PARTY)', [S('DS-01'), D('CR-01'), B('BY-01')].every(actor => code(apply(W, without, { ...a, actor })) === 'WRONG_PARTY'))
  ck('no comment without evidence: an open Order, an Order with no Courier, an empty or over-long text', code(apply(W, seed, { ...a, actor: S('DS-01'), orderId: 'SIM-O-0138' })) === 'NO_EVIDENCE' && code(apply(W, seed, { ...a, actor: S('DS-01'), orderId: 'SIM-O-0001' })) === 'NO_COURIER' && code(apply(W, without, { ...a, text: '  ' })) === 'EMPTY_TEXT' && code(apply(W, without, { ...a, text: 'x'.repeat(301) })) === 'TEXT_TOO_LONG')
  ck('sentiment and topic must be the dataset\'s values', code(apply(W, without, { ...a, sentiment: 'FIVE_STARS' })) === 'BAD_SENTIMENT' && code(apply(W, without, { ...a, topic: 'PRICE' })) === 'BAD_TOPIC')
}

// ================= SIM-003: reviews =================
ck('the world loads 138 grants, 119 reviews, 147 Product Quality ratings; 115 reviews are visible', Object.keys(seed.grants).length === 138 && Object.keys(seed.reviews).length === 119 && Object.keys(seed.ratings).length === 147 && visibleReviews(seed).length === 115)
{
  const rc = reconcile(W, seed)
  ck('Seller Service and Product Quality recomputed from visible records reconcile with seller_reputation for all 23 Sellers', rc.sellers.length === 23 && rc.sellers.every(r => r.ok), rc.sellers.filter(r => !r.ok).map(r => [r.sellerId, r.service, r.supplied]))
  ck('and with product_reputation for all 140 Products', rc.products.length === 140 && rc.products.every(r => r.ok), rc.products.filter(r => !r.ok).slice(0, 3))
  ck('DS-01: 8 service reviews averaging 4.25; DS-11 (Draft) has none and a blank average', sellerService(seed, 'DS-01').count === 8 && sellerService(seed, 'DS-01').average === 4.25 && sellerService(seed, 'DS-11').count === 0 && sellerService(seed, 'DS-11').average === null)
  ck('a Product with no rating has a blank average (DS-01-P05), never zero', productQuality(seed, 'DS-01-P05').count === 0 && productQuality(seed, 'DS-01-P05').average === null)
  const hidden = Object.values(seed.reviews).filter(r => !r.visibility.startsWith('PUBLISHED'))
  ck('the 4 reviews hidden by moderation are excluded from every aggregate (DS-04 counts only its visible reviews)', hidden.length === 4 && sellerService(seed, 'DS-04').count === ops.seller_reputation.find(r => r.seller_id === 'DS-04').published_service_reviews && sellerService(seed, 'DS-04').count === Object.values(seed.reviews).filter(r => r.sellerId === 'DS-04').length - hidden.filter(r => r.sellerId === 'DS-04').length)
  ck('rounding check: averages compare at 2 decimals (4.2499 = 4.25, 4.3333 = 4.33, 3.96 is not 4), blank never matches a number', avgMatches(4.2499999, 4.25) && avgMatches(4.3333, 4.33) && !avgMatches(3.96, 4) && avgMatches(null, null) && !avgMatches(null, 4) && !avgMatches(4, null))
}
ck('exactly one grant per Order: 138 grants over 138 Orders, 137 final-handoff and 1 failure basis (the supplied Claim)', new Set(Object.values(seed.grants).map(g => g.orderId)).size === 138 && Object.values(seed.grants).filter(g => g.basis === 'VERIFIED_ORDER_FAILURE').map(g => g.claimId).join() === 'SIM-O-0145-CL1')
ck('19 grants are available, 119 consumed; every available grant has no review', Object.values(seed.grants).filter(g => g.state === 'AVAILABLE').length === 19 && Object.values(seed.grants).filter(g => g.state === 'AVAILABLE').every(g => grantStatus(seed, g) === 'WRITE_NOW'))
{
  const g = seed.grants['SIM-O-0005-GR1'], lines = seed.lines['SIM-O-0005']
  const submit = (st, over = {}) => apply(W, st, { type: 'SUBMIT_REVIEW', actor: B(g.buyerId), grantId: g.id, serviceStars: 4, serviceText: ' Clear and quick. ', ratings: [{ orderLineId: lines[0].id, stars: 5, text: 'Matched the listing' }], ...over })
  const r = submit(seed)
  ck('Maya (BY-01) submits a review on an eligible grant: Seller Service and a Product Quality rating, grant consumed', ok(r) && r.state.grants[g.id].state === 'CONSUMED' && r.state.reviews['SIM-O-0005-REV1'].stars === 4 && Object.values(r.state.ratings).filter(p => p.reviewId === 'SIM-O-0005-REV1').length === 1, r)
  ck('the two ratings stay separate records: service stars on the review, Product Quality on the received line\'s Product', r.state.ratings['SIM-O-0005-REV1-L01'].productId === lines[0].productId && r.state.ratings['SIM-O-0005-REV1-L01'].orderLineId === lines[0].id && !('productId' in r.state.reviews['SIM-O-0005-REV1']))
  ck('aggregates move by exactly this review, the seed is untouched', sellerService(r.state, 'DS-01').count === 9 && productQuality(r.state, lines[0].productId).count === productQuality(seed, lines[0].productId).count + 1 && sellerService(seed, 'DS-01').count === 8 && seed.grants[g.id].state === 'AVAILABLE')
  ck('a session review changes no Order, line, Handoff, offer, availability or relationship state (no verified purchase, no Trust)', r.state.orders === seed.orders && r.state.lines === seed.lines && r.state.handoffs === seed.handoffs && r.state.offers === seed.offers && r.state.relStatus === seed.relStatus)
  ck('a second review on the used grant is refused: one review per grant', code(submit(r.state)) === 'ALREADY_REVIEWED')
  ck('a consumed seeded grant cannot be reused (SIM-O-0001-GR1)', code(apply(W, seed, { type: 'SUBMIT_REVIEW', actor: B('BY-01'), grantId: 'SIM-O-0001-GR1', serviceStars: 5, serviceText: '', ratings: [] })) === 'ALREADY_REVIEWED')
  ck('another Buyer cannot use the grant; a Seller or Courier cannot either', [B('BY-02'), S('DS-01'), D('CR-01')].every(actor => code(submit(seed, { actor })) === 'WRONG_PARTY'))
  ck('premature: a grant whose eligible_at the simulated clock has not reached is refused with the time', code(submit({ ...seed, grants: { ...seed.grants, [g.id]: { ...g, eligibleAt: '2026-11-27T11:00:00+03:00' } } })) === 'NOT_YET_ELIGIBLE' && !submit({ ...seed, grants: { ...seed.grants, [g.id]: { ...g, eligibleAt: '2026-11-27T11:00:00+03:00' } } }).reason.includes('undefined') && ok(submit({ ...seed, now: 60, grants: { ...seed.grants, [g.id]: { ...g, eligibleAt: '2026-11-27T11:00:00+03:00' } } })))
  ck('bad stars (0, 6, 2.5) and an over-long text are refused', [0, 6, 2.5].every(n => code(submit(seed, { serviceStars: n })) === 'BAD_STARS') && code(submit(seed, { serviceText: 'x'.repeat(601) })) === 'TEXT_TOO_LONG' && code(submit(seed, { ratings: [{ orderLineId: lines[0].id, stars: 9, text: '' }] })) === 'BAD_STARS')
  ck('a rating on a line of another Order is refused (NOT_ORDER_LINE), a duplicate line is refused', code(submit(seed, { ratings: [{ orderLineId: 'SIM-O-0001-L01', stars: 3, text: '' }] })) === 'NOT_ORDER_LINE' && code(submit(seed, { ratings: [{ orderLineId: lines[0].id, stars: 3, text: '' }, { orderLineId: lines[0].id, stars: 4, text: '' }] })) === 'DUPLICATE_LINE')
  ck('Product Quality is never accepted for a line that was not received', code(submit({ ...seed, lines: { ...seed.lines, 'SIM-O-0005': lines.map(l => ({ ...l, received: false })) } })) === 'LINE_NOT_RECEIVED')
  ck('a review with no Product Quality is valid (service only)', ok(submit(seed, { ratings: [] })))
  ck('FINAL_HANDOFF reviews need a completed Order with a final handoff', code(submit({ ...seed, orders: { ...seed.orders, 'SIM-O-0005': { ...seed.orders['SIM-O-0005'], status: 'OUT_FOR_DELIVERY' } } })) === 'NO_FINAL_HANDOFF')
}
{
  // the failure-only path: the supplied grant is consumed, so reopen it in a copy of the state to exercise the rule
  const g = seed.grants['SIM-O-0145-GR1']
  const open = { ...seed, grants: { ...seed.grants, [g.id]: { ...g, state: 'AVAILABLE' } }, reviews: Object.fromEntries(Object.entries(seed.reviews).filter(([k]) => k !== 'SIM-O-0145-REV1')) }
  const line = seed.lines['SIM-O-0145'][0]
  const sub = (st, over = {}) => apply(W, st, { type: 'SUBMIT_REVIEW', actor: B('BY-02'), grantId: g.id, serviceStars: 1, serviceText: 'Not received.', ratings: [], ...over })
  ck('the supplied failure review is service only (1 star) and has no Product Quality rating', seed.reviews['SIM-O-0145-REV1'].stars === 1 && Object.values(seed.ratings).filter(p => p.reviewId === 'SIM-O-0145-REV1').length === 0)
  ck('a failure-only review needs the qualifying Claim and is accepted for service only', ok(sub(open)))
  ck('a failure-only review can NEVER include Product Quality, even for a line', code(sub(open, { ratings: [{ orderLineId: line.id, stars: 1, text: '' }] })) === 'FAILURE_NO_PRODUCT_QUALITY')
  ck('without the qualifying Claim the failure review is refused', code(sub({ ...open, grants: { ...open.grants, [g.id]: { ...open.grants[g.id], claimId: null } } })) === 'NO_QUALIFYING_CLAIM' && code(apply({ ...W, claims: {} }, open, { type: 'SUBMIT_REVIEW', actor: B('BY-02'), grantId: g.id, serviceStars: 1, serviceText: '', ratings: [] })) === 'NO_QUALIFYING_CLAIM')
  ck('a Claim whose basis is FINAL_HANDOFF does not qualify', code(apply({ ...W, claims: { [g.claimId]: { ...W.claims[g.claimId], basis: 'FINAL_HANDOFF' } } }, open, { type: 'SUBMIT_REVIEW', actor: B('BY-02'), grantId: g.id, serviceStars: 1, serviceText: '', ratings: [] })) === 'NO_QUALIFYING_CLAIM')
}
{
  // a grant is issued when an Order completes in the session, and opens 60 simulated minutes later
  const maker = Object.values(W.products).find(p => p.sellerId === 'DS-01' && p.published && p.stock > 0 && !p.variants)
  let st = seed
  const step = a => { const r = apply(W, st, a); if (!r.ok) throw new Error(`${a.type}: ${r.reason}`); st = r.state }
  step({ type: 'CREATE_ORDER', actor: S('DS-01'), buyerId: 'BY-02', mode: 'BUYER_COLLECTION', productId: maker.id })
  const id = 'SIM-O-D001'
  step({ type: 'START_PREPARING', actor: S('DS-01'), orderId: id }); step({ type: 'MARK_READY', actor: S('DS-01'), orderId: id })
  ck('no grant exists until the Order completes', !st.grants[`${id}-GR1`])
  step({ type: 'PRESENT', actor: S('DS-01'), orderId: id, stage: 'DELIVERY' }); step({ type: 'SCAN', actor: B('BY-02'), orderId: id, stage: 'DELIVERY' })
  const g = st.grants[`${id}-GR1`]
  ck('completing the Order issues exactly one grant to that Buyer and Seller, available but not yet open', !!g && g.buyerId === 'BY-02' && g.sellerId === 'DS-01' && g.basis === 'FINAL_HANDOFF' && g.state === 'AVAILABLE' && grantStatus(st, g) === 'NOT_YET' && g.eligibleAt === '2026-11-27T11:00:00+03:00', g)
  const sub = () => apply(W, st, { type: 'SUBMIT_REVIEW', actor: B('BY-02'), grantId: g.id, serviceStars: 5, serviceText: 'Easy collection.', ratings: [{ orderLineId: `${id}-L01`, stars: 4, text: '' }] })
  ck('a review before eligible_at is refused', code(sub()) === 'NOT_YET_ELIGIBLE')
  step({ type: 'ADVANCE_TIME', minutes: 59 }); ck('still refused 59 simulated minutes later', code(sub()) === 'NOT_YET_ELIGIBLE')
  step({ type: 'ADVANCE_TIME', minutes: 1 }); ck('accepted at eligible_at; the line is received, so it may be rated', ok(sub()) && grantStatus(st, g) === 'WRITE_NOW')
}
ck('session grants never exist for Orders that did not complete (no grant for the failed, cancelled or open Orders in the seed)', Object.values(seed.grants).every(g => seed.orders[g.orderId].status === 'COMPLETED' || g.basis === 'VERIFIED_ORDER_FAILURE'))

console.log(`\ncourier-reviews: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
