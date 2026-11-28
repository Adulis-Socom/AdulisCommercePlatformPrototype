// DEMO-002: the Operator read model (Seller and Courier directories, work queues from the dataset's own states), Operator moderation of Courier comments and reviews,
// and the Seller-side Courier relationship actions with the permission model, on the supplied operations dataset (pure modules, no browser). `node tests/unit/operator.mjs`
import { readFileSync } from 'node:fs'
import { apply, buildWorld, canReceiveOffers, seedState } from '../../src/simulation/orders.ts'
import { classify, historyOf, inviteCandidates, opsFor, statusOf } from '../../src/simulation/relationships.ts'
import { commentsFor, summary } from '../../src/simulation/feedback.ts'
import { reconcile, sellerService, visibleReviews } from '../../src/simulation/reviews.ts'
import { courierDirectory, opCases, sellerDirectory, sessionDecisions } from '../../src/marketplace/operator.ts'
import { sellerBrief } from '../../src/simulation/brief.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
const cat = json('src/marketplace/data/catalogue.json'), ops = json('src/marketplace/data/operations.json')
const SRC = { catalogue: cat, operations: ops }
const W = buildWorld(ops, cat), seed = seedState(ops)
const S = (id) => ({ role: 'SELLER', id }), D = id => ({ role: 'COURIER', id }), OP = { role: 'OPERATOR', id: 'OPERATOR' }
const run = (s, a) => apply(W, s, a)
const ok = r => r.ok === true, code = r => (r.ok ? 'OK' : r.code)
const owner = sid => Object.values(W.members).find(m => m.sellerId === sid && m.status === 'OWNER_RELATIONSHIP').id
const member = (sid, role) => Object.values(W.members).find(m => m.sellerId === sid && m.roles.includes(role) && m.status === 'ACTIVE')?.id

// ================= Seller directory =================
const dir = sellerDirectory(SRC, seed)
ck('all 23 Sellers are listed, every lifecycle', dir.length === 23 && dir.filter(s => s.lifecycle === 'ACTIVE').length === 21 && dir.filter(s => s.lifecycle === 'DRAFT').length === 1 && dir.filter(s => s.lifecycle === 'SUSPENDED').length === 1)
ck('counts computed from rows equal every Seller\'s own count fields (products, published, scenes, public scenes)', cat.sellers.every(s => { const r = dir.find(d => d.id === s.seller_id); return r.products === s.product_count && r.published === s.published_product_count && r.scenes === s.scene_count && r.publicScenes === s.public_scene_count }), cat.sellers.filter(s => { const r = dir.find(d => d.id === s.seller_id); return r.products !== s.product_count || r.published !== s.published_product_count || r.scenes !== s.scene_count || r.publicScenes !== s.public_scene_count }).map(s => s.seller_id))
ck('category paths, Trust level, followers and verification are the source values for all 23', cat.sellers.every(s => { const r = dir.find(d => d.id === s.seller_id); return r.categories.join('|') === [...new Set(s.categories)].join('|') && r.trust === s.mvp_trust && r.followers === s.mvp_demo_followers && r.verification === s.verification_fixture }))
ck('the team summary adds up to the 83 supplied members and 23 owners', dir.reduce((n, s) => n + s.team.total, 0) === 83 && dir.every(s => s.team.owner === 1 && s.team.total === s.team.owner + s.team.active + s.team.invited + s.team.revoked + s.team.suspended))
ck('Stories per Seller come from the Story rows (11 in all); Live counts follow expected_state', dir.reduce((n, s) => n + s.stories, 0) === 11 && dir.reduce((n, s) => n + s.liveStories, 0) === cat.stories.filter(x => x.expected_state === 'Live').length)
ck('simulated Order counts per Seller add up to the 146 Orders (null without the simulation)', dir.reduce((n, s) => n + s.orders, 0) === 146 && sellerDirectory(SRC, null).every(s => s.orders === null))
ck('DS-11 (Draft) has no Products or Orders; DS-23 (Suspended) keeps its history', dir.find(s => s.id === 'DS-11').products === 0 && dir.find(s => s.id === 'DS-11').orders === 0 && dir.find(s => s.id === 'DS-23').orders === 4)

// ================= Courier directory =================
const cd = courierDirectory(W, seed)
const total = k => cd.reduce((n, c) => n + c.relationships[k], 0)
ck('5 Couriers; relationship counts across Couriers are 13 approved, 2 invited, 1 applied, 1 rejected, 1 suspended, 1 removed', cd.length === 5 && ['APPROVED', 'INVITED', 'APPLIED', 'REJECTED', 'SUSPENDED', 'REMOVED'].map(total).join() === '13,2,1,1,1,1')
ck('only CR-05 is not VERIFIED, and it has no relationship', cd.filter(c => c.verification !== 'VERIFIED').map(c => c.id).join() === 'CR-05' && Object.values(cd.find(c => c.id === 'CR-05').relationships).every(n => n === 0))
ck('completed deliveries per Courier add up to the supplied assignments', cd.reduce((n, c) => n + c.orders, 0) === ops.orders.filter(o => o.assigned_courier_id).length)

// ================= work queues =================
const cases = opCases(SRC, W, seed)
const q = name => cases.filter(c => c.queue === name)
ck('Moderation: 1 pending Courier comment (CC-009), 4 held reviews, 1 restricted Scene, 1 Scene hidden by a suspended Seller', q('Moderation').map(c => c.kind).sort().join() === ['COURIER_COMMENT', 'REVIEW_HELD', 'REVIEW_HELD', 'REVIEW_HELD', 'REVIEW_HELD', 'SCENE_RESTRICTED', 'SCENE_SELLER_SUSPENDED'].sort().join() && q('Moderation').find(c => c.kind === 'COURIER_COMMENT').ref === 'CC-009')
ck('the restricted Scene is DS-06-S05 and the suspended-Seller Scene is DS-23-S01', q('Moderation').find(c => c.kind === 'SCENE_RESTRICTED').ref === 'DS-06-S05' && q('Moderation').find(c => c.kind === 'SCENE_SELLER_SUSPENDED').ref === 'DS-23-S01')
ck('held reviews are the four hidden by moderation', q('Moderation').filter(c => c.kind === 'REVIEW_HELD').map(c => c.ref).sort().join() === ops.reviews.filter(r => r.visibility !== 'PUBLISHED').map(r => r.review_id).sort().join())
ck('Claims: the one supplied Claim (simulation); Verification: CR-05 and DS-11 (not simulation); Manual Handoff: the failed Order SIM-O-0145 (simulation)', q('Claims').length === 1 && q('Claims')[0].ref === 'SIM-O-0145-CL1' && q('Claims')[0].simulation && q('Verification / Recovery').map(c => c.ref).sort().join() === 'CR-05,DS-11' && q('Verification / Recovery').every(c => !c.simulation) && q('Manual Handoff').map(c => c.ref).join() === 'SIM-O-0145')
ck('simulated cases are exactly the comment, the held reviews, the Claim and the failed handoff; Scenes and verification are dataset facts', cases.filter(c => c.simulation).length === 1 + 4 + 1 + 1 && cases.filter(c => !c.simulation).length === 4)
ck('there are no Support or Trust Appeal cases (no such records in the dataset)', !cases.some(c => /Support|Trust/.test(c.queue)))

// ================= moderation actions =================
{
  const cc = seed.comments['CC-009'], cid = cc.courierId
  const before = summary(commentsFor(seed, { role: 'COURIER', id: cid }, cid))
  let r = run(seed, { type: 'MODERATE', actor: OP, kind: 'COMMENT', id: 'CC-009', decision: 'APPROVE' })
  ck('an Operator approves the pending comment: it becomes visible, counted and shared; it leaves the queue', ok(r) && summary(commentsFor(r.state, { role: 'COURIER', id: cid }, cid)).total === before.total + 1 && summary(commentsFor(r.state, { role: 'COURIER', id: cid }, cid)).pending === 0 && !opCases(SRC, W, r.state).some(c => c.ref === 'CC-009'))
  ck('the seed is not mutated; the decision appears in the session decisions', seed.comments['CC-009'].moderation === 'PENDING_REVIEW' && sessionDecisions(seed, r.state).some(d => d.id === 'CC-009'))
  const h = run(r.state, { type: 'MODERATE', actor: OP, kind: 'COMMENT', id: 'CC-009', decision: 'HIDE' })
  ck('hiding it removes it from the Courier and from the count; the author still sees it marked hidden', ok(h) && summary(commentsFor(h.state, { role: 'COURIER', id: cid }, cid)).total === before.total && !commentsFor(h.state, { role: 'COURIER', id: cid }, cid).some(c => c.id === 'CC-009') && commentsFor(h.state, { role: 'SELLER', id: cc.sellerId }, cid).some(c => c.id === 'CC-009'))
  ck('approving what is already visible, or hiding what is hidden, is refused (ALREADY)', code(run(r.state, { type: 'MODERATE', actor: OP, kind: 'COMMENT', id: 'CC-009', decision: 'APPROVE' })) === 'ALREADY' && code(run(h.state, { type: 'MODERATE', actor: OP, kind: 'COMMENT', id: 'CC-009', decision: 'HIDE' })) === 'ALREADY')
  const seller = ops.reviews.find(x => x.visibility !== 'PUBLISHED').seller_id, rid = ops.reviews.find(x => x.visibility !== 'PUBLISHED').review_id
  const svc = sellerService(seed, seller)
  const a = run(seed, { type: 'MODERATE', actor: OP, kind: 'REVIEW', id: rid, decision: 'APPROVE' })
  ck('approving a held review publishes it: the Seller Service count rises by one; the source figures still reconcile at seed (Live only)', ok(a) && sellerService(a.state, seller).count === svc.count + 1 && visibleReviews(a.state).length === visibleReviews(seed).length + 1 && reconcile(W, seed).sellers.every(x => x.ok))
  const b = run(a.state, { type: 'MODERATE', actor: OP, kind: 'REVIEW', id: rid, decision: 'HIDE' })
  ck('hiding it again excludes it from every rating and leaves a note', ok(b) && sellerService(b.state, seller).count === svc.count && /Operator/.test(b.state.reviews[rid].moderationNote))
  ck('only an Operator moderates (a Seller, Buyer or Courier is refused); an unknown record is refused', ['SELLER', 'BUYER', 'COURIER'].every(role => code(run(seed, { type: 'MODERATE', actor: { role, id: 'X' }, kind: 'COMMENT', id: 'CC-009', decision: 'APPROVE' })) === 'WRONG_PARTY') && code(run(seed, { type: 'MODERATE', actor: OP, kind: 'REVIEW', id: 'NOPE', decision: 'HIDE' })) === 'NO_RECORD')
  ck('moderation touches no Order, stock or relationship', JSON.stringify(a.state.orders) === JSON.stringify(seed.orders) && JSON.stringify(a.state.relStatus) === JSON.stringify(seed.relStatus))
}

// ================= Seller-side Courier relationship actions =================
const act = (s, sid, who, courier, op) => run(s, { type: 'SELLER_COURIER', actor: S(sid), member: who, courierId: courier, op })
{
  // DS-14: Daniel's application is pending (the one APPLIED pair).
  const applied = Object.entries(seed.relStatus).find(([, v]) => v === 'APPLIED')[0].split('|')
  const [apc, aps] = applied
  ck('the one pending application is CR-01 to DS-14', apc === 'CR-01' && aps === 'DS-14')
  const r = act(seed, aps, owner(aps), apc, 'APPROVE')
  ck('the Owner approves an application: APPLIED to APPROVED, recorded as a session action, offered nothing else', ok(r) && statusOf(r.state, apc, aps) === 'APPROVED' && historyOf(W, r.state, apc, aps).at(-1).session === true && historyOf(W, r.state, apc, aps).at(-1).status === 'APPROVED')
  ck('the seed is never mutated by a Seller decision', statusOf(seed, apc, aps) === 'APPLIED')
  const j = act(seed, aps, owner(aps), apc, 'REJECT')
  ck('rejecting gives REJECTED, and the Courier can be invited again afterwards', ok(j) && statusOf(j.state, apc, aps) === 'REJECTED' && opsFor('REJECTED').join() === 'INVITE' && ok(act(j.state, aps, owner(aps), apc, 'INVITE')) && statusOf(act(j.state, aps, owner(aps), apc, 'INVITE').state, apc, aps) === 'INVITED')
  ck('approving a pair that has no pending application is refused (NOT_APPLIED)', code(act(seed, 'DS-01', owner('DS-01'), 'CR-02', 'APPROVE')) === 'NOT_APPLIED')

  // eligibility follows the state at once: Samuel (CR-02, verified, available) and an ACTIVE Addis Ababa Seller he has no relationship with.
  const pair = ['DS-01', ...Object.keys(W.sellers)].find(sid => W.sellers[sid].lifecycle === 'ACTIVE' && W.sellers[sid].city === 'Addis Ababa' && statusOf(seed, 'CR-02', sid) === null)
  const o = owner(pair)
  ck('before any decision the Courier is not an approved pool member', canReceiveOffers(W, seed, 'CR-02', pair).code === 'NOT_POOL_MEMBER')
  let s = act(seed, pair, o, 'CR-02', 'INVITE'); ck('INVITE: no relationship becomes INVITED (still cannot receive offers)', ok(s) && statusOf(s.state, 'CR-02', pair) === 'INVITED' && !canReceiveOffers(W, s.state, 'CR-02', pair).ok)
  s = run(s.state, { type: 'ACCEPT_INVITATION', actor: D('CR-02'), sellerId: pair }); ck('the Courier accepts in their app: APPROVED, and now eligible for offers at once', ok(s) && statusOf(s.state, 'CR-02', pair) === 'APPROVED' && canReceiveOffers(W, s.state, 'CR-02', pair).ok)
  const sus = act(s.state, pair, o, 'CR-02', 'SUSPEND'); ck('SUSPEND: eligibility ends at once (RELATIONSHIP_SUSPENDED)', ok(sus) && canReceiveOffers(W, sus.state, 'CR-02', pair).code === 'RELATIONSHIP_SUSPENDED')
  const rei = act(sus.state, pair, o, 'CR-02', 'REINSTATE'); ck('REINSTATE: eligible again', ok(rei) && canReceiveOffers(W, rei.state, 'CR-02', pair).ok)
  const rem = act(rei.state, pair, o, 'CR-02', 'REMOVE'); ck('REMOVE: REMOVED and not eligible; the Courier\'s Pools classification is a closed relationship', ok(rem) && canReceiveOffers(W, rem.state, 'CR-02', pair).code === 'RELATIONSHIP_REMOVED' && classify(W, rem.state, 'CR-02', pair).status === 'REMOVED')
  ck('history shows each step in order (invited, approved, suspended, approved, removed)', historyOf(W, rem.state, 'CR-02', pair).filter(e => e.session).map(e => e.status).join() === 'INVITED,APPROVED,SUSPENDED,APPROVED,REMOVED')
  ck('invalid moves are refused: suspend a non-approved, reinstate a non-suspended, remove with no relationship, invite an existing member', code(act(seed, pair, o, 'CR-02', 'SUSPEND')) === 'NOT_APPROVED' && code(act(s.state, pair, o, 'CR-02', 'REINSTATE')) === 'NOT_SUSPENDED' && code(act(seed, pair, o, 'CR-02', 'REMOVE')) === 'NOT_IN_POOL' && code(act(s.state, pair, o, 'CR-02', 'INVITE')) === 'ALREADY_RELATED')

  // permission model
  const adminId = member('DS-01', 'ADMIN'), supportId = member('DS-01', 'SALES_SUPPORT'), inviteeId = Object.values(W.members).find(m => m.sellerId === 'DS-01' && m.status === 'INVITED').id
  ck('an Admin may suspend an approved Courier (same rights as the Owner)', statusOf(seed, 'CR-02', 'DS-01') === 'APPROVED' && ok(act(seed, 'DS-01', adminId, 'CR-02', 'SUSPEND')))
  ck('a Sales Support member cannot invite, approve, suspend or remove: DENIED_ROLE naming the missing permission', ['INVITE', 'APPROVE', 'SUSPEND', 'REMOVE'].every(op => { const x = act(seed, 'DS-01', supportId, 'CR-02', op); return code(x) === 'DENIED_ROLE' && /seller\.couriers:/.test(x.reason) }))
  ck('an Inventory member (read-only for Couriers) cannot invite', code(act(seed, 'DS-01', member('DS-01', 'INVENTORY'), 'CR-02', 'INVITE')) === 'DENIED_ROLE')
  ck('an invited (not yet joined) member cannot act (DENIED_MEMBERSHIP)', code(act(seed, 'DS-01', inviteeId, 'CR-02', 'INVITE')) === 'DENIED_MEMBERSHIP')
  ck('another Seller\'s Owner cannot act on this Seller (DENIED_SELLER)', code(act(seed, 'DS-01', owner('DS-02'), 'CR-02', 'INVITE')) === 'DENIED_SELLER')
  ck('a Draft Seller (DS-11) and a Suspended Seller (DS-23) cannot invite or approve: DENIED_LIFECYCLE', ['DS-11', 'DS-23'].every(sid => ['INVITE', 'APPROVE', 'REJECT'].every(op => code(act(seed, sid, owner(sid), 'CR-02', op)) === 'DENIED_LIFECYCLE')))
  ck('an unknown member or Courier is refused; only a Seller identity acts', code(run(seed, { type: 'SELLER_COURIER', actor: S('DS-01'), member: 'NOPE', courierId: 'CR-02', op: 'INVITE' })) === 'NO_MEMBER' && code(act(seed, 'DS-01', owner('DS-01'), 'CR-99', 'INVITE')) === 'NO_COURIER' && code(run(seed, { type: 'SELLER_COURIER', actor: D('CR-01'), member: owner('DS-01'), courierId: 'CR-02', op: 'INVITE' })) === 'WRONG_PARTY')
  // the Courier's own rules still apply
  ck('an unverified Courier (CR-05) cannot be invited; a Courier outside the Seller\'s city cannot be invited (CR-04, Bahir Dar, to an Addis Ababa Seller)', code(act(seed, pair, o, 'CR-05', 'INVITE')) === 'NOT_VERIFIED' && code(act(seed, pair, o, 'CR-04', 'INVITE')) === 'OUTSIDE_COVERAGE')
  const cand = inviteCandidates(W, seed, 'DS-01')
  ck('the invite list names a blocker for CR-05 (verification) and CR-04 (coverage) and none for an eligible Courier', cand.find(c => c.courierId === 'CR-05').blocker?.startsWith('Verification') && cand.find(c => c.courierId === 'CR-04').blocker?.startsWith('Covers') && cand.every(c => c.status !== 'APPROVED'))
}

// ================= Seller Console brief =================
{
  const b = sellerBrief(W, seed, 'DS-04')
  ck('DS-04 brief: its Claim is counted, its failed Order is the exception, the week\'s paid Orders are counted from its own Orders', b.claims.length === 1 && b.exceptions.length === 1 && b.exceptions[0].id === 'SIM-O-0145' && b.week.paid === b.week.days.reduce((a, c) => a + c, 0) && b.week.gmv === Object.values(seed.orders).filter(x => x.sellerId === 'DS-04' && Date.parse(x.paidAt) >= Date.parse('2026-11-27T10:00:00+03:00') - 7 * 86400000).reduce((a, x) => a + x.total, 0))
  const mk = run(seed, { type: 'CREATE_ORDER', actor: S('DS-01'), buyerId: 'BY-02', mode: 'BUYER_COLLECTION', productId: ops.orders.length ? Object.values(W.products).find(p => p.sellerId === 'DS-01' && p.published && p.stock > 0 && !p.variants).id : '' })
  ck('a new simulated Order shows in the Seller\'s brief at once as needing preparation, and in no other Seller\'s', ok(mk) && sellerBrief(W, mk.state, 'DS-01').toPrepare.length === sellerBrief(W, seed, 'DS-01').toPrepare.length + 1 && sellerBrief(W, mk.state, 'DS-02').toPrepare.length === sellerBrief(W, seed, 'DS-02').toPrepare.length)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
