// COMP-001 / COMP-002: the pure Companion rules, no browser. Alert priority (src/marketplace/alerts.ts) and the team permission decision
// (src/marketplace/permissions.ts) over the dataset's teams, members, role grants and tasks (src/marketplace/seller-ops.ts).
// `node tests/unit/companion.mjs`
import { readFileSync } from 'node:fs'
import { LOW_STOCK_AT, STORY_EXPIRING_HOURS, TASK_DUE_SOON_DAYS, buildAlerts, stockLevel, unreadCount, daysUntil } from '../../src/marketplace/alerts.ts'
import { CONSOLE_ONLY, PERMISSION, TASK_NEXT, decide, decideMessage, decideTask, isConsoleOnly, isRead, isSimulationOnly } from '../../src/marketplace/permissions.ts'
import { CONFIGURATION_LABEL, ROLE_GRANTS, canAct, permissionsOfRoles, summaryOf, taskTargetSeller, teamOf } from '../../src/marketplace/seller-ops.ts'
import { MARKETPLACE as M } from '../../src/marketplace/adapt.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
const cat = json('src/marketplace/data/catalogue.json'), ops = json('src/marketplace/data/operations.json')

// ================= ALERTS =================
const base = { sellerId: 'DS-01', lifecycle: 'ACTIVE', simulation: false, today: '2026-11-27', products: [], scenes: [], inbox: [], stories: [], tasks: [] }
const kinds = alerts => alerts.map(a => `${a.priority}:${a.kind}`)
ck('LOW_STOCK_AT is the 3-unit threshold the app already uses', LOW_STOCK_AT === 3 && /export \{ LOW_STOCK_AT \}/.test(readFileSync(new URL('../../src/seller-workspace.tsx', import.meta.url), 'utf8')))
ck('stockLevel agrees with the dataset import (0 = out, 1-3 = low, else ok) for all 140 Products', cat.products.every(p => { const a = M.products[p.product_id].availability; return stockLevel(p.stock) === (a === 'Out of Stock' ? 'out' : a === 'Low Stock' ? 'low' : 'ok') }))
ck('stock boundaries: 0 out, 1 low, 3 low, 4 ok', stockLevel(0) === 'out' && stockLevel(1) === 'low' && stockLevel(3) === 'low' && stockLevel(4) === 'ok')

const stock = buildAlerts({ ...base, products: [
  { id: 'P1', name: 'Zero', stock: 0, published: true }, { id: 'P2', name: 'One', stock: 1, published: true }, { id: 'P3', name: 'Three', stock: 3, published: true },
  { id: 'P4', name: 'Four', stock: 4, published: true }, { id: 'P5', name: 'Draft zero', stock: 0, published: false },
] })
ck('out of stock is high, low stock is routine, plenty and drafts raise nothing', JSON.stringify(kinds(stock)) === JSON.stringify(['high:out_of_stock', 'routine:low_stock', 'routine:low_stock']), kinds(stock))
ck('every stock alert opens its Product', stock.every(a => a.dest.type === 'product'))

const scenes = buildAlerts({ ...base, scenes: [
  { id: 'S1', title: 'Private one', status: 'published', visibility: 'private', tags: 2, availableTags: 0 },
  { id: 'S2', title: 'Partly out', status: 'published', visibility: 'public', tags: 3, availableTags: 2 },
  { id: 'S3', title: 'Fine', status: 'published', visibility: 'public', tags: 2, availableTags: 2 },
  { id: 'S4', title: 'Draft', status: 'draft', visibility: 'draft', tags: 1, availableTags: 0 },
  { id: 'S5', title: 'Restricted', status: 'published', visibility: 'restricted', tags: 1, availableTags: 1, restrictedReason: 'moderation' },
] })
ck('an auto-Private Scene is high, a Scene with a missing tag is routine, drafts and healthy Scenes raise nothing', JSON.stringify(kinds(scenes)) === JSON.stringify(['high:scene_private', 'routine:scene_tags']), kinds(scenes))
ck('a moderation restriction is NOT an alert in the current MVP', !kinds(scenes).some(k => /restricted|moderation/.test(k)))
const simScenes = buildAlerts({ ...base, simulation: true, scenes: [{ id: 'S5', title: 'Restricted', status: 'published', visibility: 'restricted', tags: 1, availableTags: 1, restrictedReason: 'moderation' }] })
ck('in the internal simulation a restricted Scene is critical', JSON.stringify(kinds(simScenes)) === JSON.stringify(['critical:scene_restricted']), kinds(simScenes))

const inbox = buildAlerts({ ...base, inbox: [{ id: 'CNV-1', buyer: 'Maya T.', text: 'Is it in stock?' }] })
ck('a waiting Buyer is a high alert that opens the thread', inbox[0].priority === 'high' && inbox[0].kind === 'buyer_waiting' && inbox[0].dest.type === 'inbox' && inbox[0].dest.id === 'CNV-1')

const stories = buildAlerts({ ...base, stories: [{ id: 'T1', text: 'A', hoursLeft: STORY_EXPIRING_HOURS }, { id: 'T2', text: 'B', hoursLeft: STORY_EXPIRING_HOURS + 0.5 }] })
ck('a Story with 6 h or fewer left is routine "expiring"; others only show as activity', kinds(stories).filter(k => k !== 'info:stories').join() === 'routine:story_expiring' && kinds(stories).includes('info:stories'), kinds(stories))

const task = (id, due, status, priority) => ({ id, title: 'T ' + id, due, status, priority, assignee: 'Ruth' })
const tasks = buildAlerts({ ...base, tasks: [
  task('A', '2026-11-26', 'OPEN', 'LOW'), task('B', '2026-11-27', 'OPEN', 'HIGH'), task('C', '2026-11-28', 'OPEN', 'HIGH'), task('D', '2026-11-28', 'IN_PROGRESS', 'MEDIUM'),
  task('E', '2026-11-29', 'OPEN', 'HIGH'), task('F', '2026-11-26', 'DONE', 'HIGH'),
] })
ck('overdue is high; due today or tomorrow is high when HIGH priority else routine; later and DONE tasks raise nothing',
  JSON.stringify(tasks.filter(a => a.dest.type === 'task').map(a => `${a.dest.id}:${a.priority}:${a.kind}`)) === JSON.stringify(['A:high:task_overdue', 'B:high:task_due', 'C:high:task_due', 'D:routine:task_due']), tasks.map(a => a.id))
ck('TASK_DUE_SOON_DAYS is 1 and daysUntil counts whole days', TASK_DUE_SOON_DAYS === 1 && daysUntil('2026-11-29', '2026-11-27') === 2 && daysUntil('2026-11-26', '2026-11-27') === -1)
ck('finished tasks are counted as activity', kinds(tasks).includes('info:tasks_done'))

const susp = buildAlerts({ ...base, lifecycle: 'SUSPENDED', products: [{ id: 'P1', name: 'Zero', stock: 0, published: true }], inbox: [{ id: 'C', buyer: 'B', text: 't' }], scenes: [{ id: 'S1', title: 'x', status: 'published', visibility: 'private', tags: 1, availableTags: 0 }], tasks: [task('A', '2026-11-26', 'OPEN', 'LOW')] })
ck('a SUSPENDED Seller: critical lifecycle alert first, no stock / Scene / Inbox alerts, tasks still listed', susp[0].priority === 'critical' && susp[0].kind === 'seller_suspended' && JSON.stringify(kinds(susp)) === JSON.stringify(['critical:seller_suspended', 'high:task_overdue']), kinds(susp))
const draft = buildAlerts({ ...base, lifecycle: 'DRAFT', setupOpen: ['Add a store description.', 'Publish your first Product.'], products: [{ id: 'P1', name: 'Zero', stock: 0, published: true }] })
ck('a DRAFT Seller: a high readiness alert naming the open steps, and no stock alerts', JSON.stringify(kinds(draft)) === JSON.stringify(['high:seller_draft']) && /2 setup steps open/.test(draft[0].detail), kinds(draft))

const orders = [{ id: 'SIM-O-1', kind: 'new_order', title: 'New paid Order', detail: 'x' }, { id: 'SIM-O-2', kind: 'delivery_failed', title: 'Delivery failed', detail: 'x' }, { id: 'SIM-O-3', kind: 'offer_pending', title: 'Offer pending', detail: 'x' }, { id: 'SIM-O-4', kind: 'handoff', title: 'Handoff', detail: 'x' }]
const moderation = [{ id: 'CC-009', title: 'Courier comment held', detail: 'x' }]
const mvpOrders = buildAlerts({ ...base, orders, moderation })
ck('the current MVP never produces an Order, delivery, handoff, offer or moderation alert, even if given the inputs', mvpOrders.length === 0, kinds(mvpOrders))
const simOrders = buildAlerts({ ...base, simulation: true, orders, moderation })
ck('the internal simulation: delivery failure and moderation critical, new Order and handoff high, pending offer routine',
  JSON.stringify(kinds(simOrders)) === JSON.stringify(['critical:delivery_failed', 'critical:moderation', 'high:new_order', 'high:handoff', 'routine:offer_pending']), kinds(simOrders))
ck('order alerts open the Order, others none', simOrders.filter(a => a.dest.type === 'order').length === 4 && simOrders.find(a => a.kind === 'moderation').dest.type === 'none')

const summary = buildAlerts({ ...base, summary: { followers: 1840, newFollowers: 46, inquiries: 292, responded: 193 } })
ck('activity (Followers, response rate) is info and sorted last', summary.every(a => a.priority === 'info') && /1,840/.test(summary[0].title) && /193 of 292/.test(summary[1].detail))
const mixed = buildAlerts({ ...base, summary: { followers: 1, newFollowers: 0, inquiries: 1, responded: 1 }, products: [{ id: 'P2', name: 'One', stock: 1, published: true }, { id: 'P1', name: 'Zero', stock: 0, published: true }], lifecycle: 'ACTIVE' })
ck('sorted critical, high, routine, info; stable within a priority', JSON.stringify(kinds(mixed)) === JSON.stringify(['high:out_of_stock', 'routine:low_stock', 'info:followers', 'info:response']), kinds(mixed))
ck('pure: the same input gives the same list', JSON.stringify(buildAlerts({ ...base, products: stock.length ? [{ id: 'P1', name: 'Zero', stock: 0, published: true }] : [] })) === JSON.stringify(buildAlerts({ ...base, products: [{ id: 'P1', name: 'Zero', stock: 0, published: true }] })))
ck('unreadCount skips info, read and dismissed', unreadCount(mixed, ['product:low:P2'], []) === 1 && unreadCount(mixed, [], ['product:out:P1', 'product:low:P2']) === 0 && unreadCount(mixed, [], []) === 2)

// Real records: low/out alerts per Seller equal the dataset's published stock figures; seller_summary's low_stock_products is the source's own count.
let lowMatches = 0, sellers = 0
for (const s of cat.sellers) {
  const published = cat.products.filter(p => p.seller_id === s.seller_id && p.publication === 'PUBLISHED')
  const a = buildAlerts({ ...base, sellerId: s.seller_id, lifecycle: s.lifecycle, products: published.map(p => ({ id: p.product_id, name: p.name, stock: p.stock, published: true })) })
  const expectedLow = published.filter(p => p.stock >= 1 && p.stock <= 3).length, expectedOut = published.filter(p => p.stock === 0).length
  const active = s.lifecycle === 'ACTIVE'
  sellers++
  if (a.filter(x => x.kind === 'low_stock').length === (active ? expectedLow : 0) && a.filter(x => x.kind === 'out_of_stock').length === (active ? expectedOut : 0)) lowMatches++
}
ck('for all 23 Sellers the low / out-of-stock alerts equal the published Products with 1-3 / 0 units (none for DRAFT or SUSPENDED)', lowMatches === sellers && sellers === 23, { lowMatches, sellers })
ck('seller_summary is read for every Seller', cat.sellers.every(s => summaryOf(s.seller_id) !== undefined) && summaryOf('DS-01').followers === 1840)

// ================= TEAM DATA =================
const teams = cat.sellers.map(s => teamOf(s.seller_id))
ck('23 teams: 6 full, 11 partial, 6 owner-only', teams.length === 23 && teams.filter(t => t.configuration === 'FULL_ROLE_COVERAGE').length === 6 && teams.filter(t => t.configuration === 'PARTIAL_ROLE_COVERAGE').length === 11 && teams.filter(t => t.configuration === 'OWNER_ONLY').length === 6)
ck('83 members, 71 tasks, 50 team messages across the teams', teams.reduce((n, t) => n + t.members.length, 0) === 83 && teams.reduce((n, t) => n + t.tasks.length, 0) === 71 && teams.reduce((n, t) => n + t.messages.length, 0) === 50)
const all = teams.flatMap(t => t.members)
ck('membership statuses as the dataset has them: 23 owner, 50 active, 3 invited, 5 revoked, 2 suspended', ['OWNER_RELATIONSHIP', 'ACTIVE', 'INVITED', 'REVOKED', 'SUSPENDED'].map(st => all.filter(m => m.status === st).length).join() === '23,50,3,5,2')
ck('exactly one derived Owner per Seller; OWNER is never a team role', teams.every(t => t.members.filter(m => m.owner).length === 1) && all.filter(m => !m.owner).every(m => !m.roles.includes('OWNER')))
const CANON = ['OWNER', 'ADMIN', 'SALES_SUPPORT', 'INVENTORY', 'ANALYST', 'CAMPAIGN_MANAGER']
ck('only the six canonical roles exist, in members and in grants', all.every(m => m.roles.every(r => CANON.includes(r))) && Object.keys(ROLE_GRANTS).every(r => CANON.includes(r)))
ck('members with several roles exist and their permissions are the union', all.some(m => m.roles.length > 1) && (() => { const m = all.find(x => x.roles.length > 1); return permissionsOfRoles(m.roles).size === new Set(m.roles.flatMap(r => [...ROLE_GRANTS[r]])).size })())
ck('role grants count 197 and per role 68/66/13/23/7/20', Object.values(ROLE_GRANTS).reduce((n, g) => n + g.size, 0) === 197 && ['OWNER', 'ADMIN', 'SALES_SUPPORT', 'INVENTORY', 'ANALYST', 'CAMPAIGN_MANAGER'].map(r => ROLE_GRANTS[r].size).join() === '68,66,13,23,7,20')
ck('Seller lifecycles reach the team (DS-11 draft, DS-23 suspended)', teamOf('DS-11').lifecycle === 'DRAFT' && teamOf('DS-23').lifecycle === 'SUSPENDED' && teamOf('DS-23').members.filter(m => m.status === 'SUSPENDED').length === 2)
ck('revoked / invited / suspended members cannot act, active and owner can', canAct('ACTIVE') && canAct('OWNER_RELATIONSHIP') && !canAct('INVITED') && !canAct('REVOKED') && !canAct('SUSPENDED'))
ck('every task target belongs to the task\'s own Seller', teams.every(t => t.tasks.every(x => taskTargetSeller(x) === t.sellerId)))
ck('the legacy ids have no team records', teamOf('SEL-ADDIS-ATELIER') === undefined && CONFIGURATION_LABEL.OWNER_ONLY === 'Owner only')

// ================= PERMISSIONS =================
const ctx = (over = {}) => ({ sellerId: 'DS-01', lifecycle: 'ACTIVE', surface: 'COMPANION', mode: 'MVP', ...over })
const actor = (roles, over = {}) => ({ id: 'DS-01-TMXX', sellerId: 'DS-01', roles, status: 'ACTIVE', ...over })
const verdict = (a, p, c = ctx()) => { const d = decide(a, p, c); return d.allowed ? 'allow' : d.code }

// Role x permission matrix on the Companion, MVP, active Seller. The expectation is computed from the grants and the three documented gates only.
const PERMS = ['seller.inventory:write', 'seller.inventory:read', 'seller.products:read', 'seller.products:write', 'seller.inbox:read', 'seller.inbox:reply', 'seller.orders:prepare', 'seller.claims:respond',
  'seller.analytics:business_read', 'seller.store:read', 'seller.store:profile_update', 'seller.store:availability_update', 'seller.team:read', 'seller.team:invite', 'seller.scene_posts:read', 'seller.scene_posts:write', 'seller.ownership:transfer']
let matrix = 0, matrixOk = 0
for (const role of CANON) for (const p of PERMS) {
  const granted = ROLE_GRANTS[role].has(p)
  const expected = !granted ? 'role' : isConsoleOnly(p) ? 'surface' : isSimulationOnly(p) ? 'mode' : 'allow'
  matrix++; if (verdict(actor([role]), p) === expected) matrixOk++; else console.log('  matrix mismatch', role, p, verdict(actor([role]), p), expected)
}
ck(`matrix: ${CANON.length} roles x ${PERMS.length} permissions follow grants, surface and mode`, matrixOk === matrix, { matrixOk, matrix })
ck('INVENTORY can change stock; ANALYST cannot (role, naming the missing permission)', verdict(actor(['INVENTORY']), PERMISSION.writeStock) === 'allow' && verdict(actor(['ANALYST']), PERMISSION.writeStock) === 'role'
  && decide(actor(['ANALYST']), PERMISSION.writeStock, ctx()).permission === 'seller.inventory:write' && /Not permitted for your role/.test(decide(actor(['ANALYST']), PERMISSION.writeStock, ctx()).message))
ck('SALES_SUPPORT replies to Buyers; INVENTORY has no Inbox access; CAMPAIGN_MANAGER cannot change stock', verdict(actor(['SALES_SUPPORT']), PERMISSION.replyInbox) === 'allow' && verdict(actor(['INVENTORY']), PERMISSION.readInbox) === 'role' && verdict(actor(['CAMPAIGN_MANAGER']), PERMISSION.writeStock) === 'role')
ck('OWNER and ADMIN can do the Companion operations; no role set adds OWNER-only authority', verdict(actor(['OWNER']), PERMISSION.writeStock) === 'allow' && verdict(actor(['ADMIN']), PERMISSION.updateProfile) === 'allow' && verdict(actor(['ADMIN']), 'seller.ownership:transfer') === 'role' && verdict(actor(['ADMIN', 'INVENTORY', 'SALES_SUPPORT']), 'seller.ownership:transfer') === 'role')
ck('several roles combine: INVENTORY + SALES_SUPPORT can both change stock and reply', verdict(actor(['INVENTORY', 'SALES_SUPPORT']), PERMISSION.writeStock) === 'allow' && verdict(actor(['INVENTORY', 'SALES_SUPPORT']), PERMISSION.replyInbox) === 'allow')
ck('no roles grants nothing', verdict(actor([]), PERMISSION.viewProducts) === 'role')

for (const status of ['INVITED', 'REVOKED', 'SUSPENDED']) ck(`a ${status} membership cannot act, whatever its roles`, verdict(actor(['ADMIN'], { status }), PERMISSION.writeStock) === 'membership')
ck('the Owner relationship and an ACTIVE member can act', verdict(actor(['OWNER'], { status: 'OWNER_RELATIONSHIP' }), PERMISSION.writeStock) === 'allow')
ck('a member of another Seller is refused', verdict(actor(['OWNER'], { sellerId: 'DS-02' }), PERMISSION.writeStock) === 'seller')

ck('surface: administration is Console-only, authoring stays in the Console, the Companion is operations', verdict(actor(['INVENTORY']), 'seller.products:write') === 'surface' && verdict(actor(['INVENTORY']), 'seller.products:write', ctx({ surface: 'CONSOLE' })) === 'allow'
  && verdict(actor(['OWNER']), 'seller.team:invite') === 'surface' && verdict(actor(['OWNER']), 'seller.team:invite', ctx({ surface: 'CONSOLE' })) === 'allow')
ck('every Console-only pattern matches at least one granted permission (no dead rule)', CONSOLE_ONLY.every(re => Object.values(ROLE_GRANTS).some(g => [...g].some(p => re.test(p)))))
ck('mode: Order, Claim, payment and finance permissions are refused in the MVP and allowed in the internal simulation', verdict(actor(['INVENTORY']), 'seller.orders:prepare') === 'mode' && verdict(actor(['INVENTORY']), 'seller.orders:prepare', ctx({ mode: 'INTERNAL_SIMULATION' })) === 'allow'
  && verdict(actor(['SALES_SUPPORT']), 'seller.claims:respond') === 'mode' && verdict(actor(['SALES_SUPPORT']), 'seller.claims:respond', ctx({ mode: 'INTERNAL_SIMULATION' })) === 'allow')
for (const lifecycle of ['DRAFT', 'SUSPENDED']) ck(`lifecycle: a ${lifecycle} Seller is read-only (reads pass, writes refused)`, verdict(actor(['OWNER']), PERMISSION.writeStock, ctx({ lifecycle })) === 'lifecycle' && verdict(actor(['OWNER']), PERMISSION.viewProducts, ctx({ lifecycle })) === 'allow' && verdict(actor(['OWNER']), PERMISSION.updateProfile, ctx({ lifecycle })) === 'lifecycle')
ck('read detection', isRead('seller.analytics:business_read') && isRead('seller.store:read') && !isRead('seller.inventory:write') && !isRead('seller.reviews:readonly'))
ck('gate order: membership before role, role before surface', verdict(actor(['ANALYST'], { status: 'REVOKED' }), PERMISSION.writeStock) === 'membership' && verdict(actor(['ANALYST']), 'seller.team:invite') === 'role')

// ---- Tasks ----
const teamOne = teamOf('DS-01')
const member = id => teamOne.members.find(m => m.id === id)
const asActor = m => ({ id: m.id, sellerId: m.sellerId, roles: m.owner ? ['OWNER'] : m.roles, status: m.status })
const t = (over = {}) => ({ ...teamOne.tasks.find(x => x.id === 'DS-01-TM04-TASK1'), ...over }) // OPEN, COMPANION, seller.inventory:read, assignee TM04 (INVENTORY)
const inv = asActor(member('DS-01-TM04')), analyst = asActor(member('DS-01-TM05')), admin = asActor(member('DS-01-TM02')), owner = asActor(member('DS-01-TM01'))
const tv = (a, task, to, c = ctx()) => { const d = decideTask(a, task, to, c); return d.allowed ? 'allow' : d.code }
ck('the assignee with the permission moves their own task OPEN -> IN_PROGRESS -> DONE', tv(inv, t(), 'IN_PROGRESS') === 'allow' && tv(inv, t({ status: 'IN_PROGRESS' }), 'DONE') === 'allow')
ck('status flow: OPEN -> IN_PROGRESS; IN_PROGRESS -> DONE or back to OPEN; DONE is final; no skipping', tv(inv, t(), 'DONE') === 'transition' && tv(inv, t({ status: 'IN_PROGRESS' }), 'OPEN') === 'allow' && tv(inv, t({ status: 'DONE' }), 'OPEN') === 'transition' && TASK_NEXT.DONE.length === 0)
ck('assignment does not grant permission: an assignee without the required permission is refused (role, naming it)', (() => { const d = decideTask(analyst, t({ assignee: analyst.id }), 'IN_PROGRESS', ctx()); return !d.allowed && d.code === 'role' && d.permission === 'seller.inventory:read' })())
ck('only the assignee, an Admin or the Owner can update; a peer cannot', tv(asActor(member('DS-01-TM03')), t(), 'IN_PROGRESS') === 'role' && tv(owner, t(), 'IN_PROGRESS') === 'allow' && tv(admin, t(), 'IN_PROGRESS') === 'allow'
  && tv({ ...inv, id: 'DS-01-TM99' }, t(), 'IN_PROGRESS') === 'assignee')
ck('surface: a CONSOLE task is refused in the Companion and allowed in the Console', tv(owner, t({ surface: 'CONSOLE' }), 'IN_PROGRESS') === 'surface' && tv(owner, t({ surface: 'CONSOLE' }), 'IN_PROGRESS', ctx({ surface: 'CONSOLE' })) === 'allow')
ck('mode: an INTERNAL_SIMULATION task is refused in the MVP, allowed in the simulation', tv(inv, t({ mode: 'INTERNAL_SIMULATION' }), 'IN_PROGRESS') === 'mode' && tv(inv, t({ mode: 'INTERNAL_SIMULATION' }), 'IN_PROGRESS', ctx({ mode: 'INTERNAL_SIMULATION' })) === 'allow')
ck('membership: invited, revoked and suspended assignees cannot update', ['INVITED', 'REVOKED', 'SUSPENDED'].every(status => tv({ ...inv, status }, t(), 'IN_PROGRESS') === 'membership'))
ck('lifecycle: tasks of a DRAFT or SUSPENDED Seller are read-only', tv(owner, t(), 'IN_PROGRESS', ctx({ lifecycle: 'SUSPENDED' })) === 'lifecycle' && tv(owner, t(), 'IN_PROGRESS', ctx({ lifecycle: 'DRAFT' })) === 'lifecycle')
ck('resource restriction: another Seller\'s task, or a target outside the Seller, is refused', tv(owner, t({ sellerId: 'DS-02' }), 'IN_PROGRESS') === 'seller' && tv(owner, t({ targetType: 'PRODUCT', targetId: 'DS-02-P01' }), 'IN_PROGRESS') === 'target' && tv(owner, t({ targetType: 'SCENE', targetId: 'NOPE' }), 'IN_PROGRESS') === 'target')
ck('an actor from another Seller cannot update this Seller\'s task', tv({ ...owner, sellerId: 'DS-02' }, t(), 'IN_PROGRESS') === 'seller')

// Every real task: its assignee may take the next step on the task's own surface (the dataset's assignees hold the required permission), nothing else leaks.
let taskOk = 0, taskTotal = 0, denied = 0
for (const team of teams) for (const task of team.tasks) {
  const assignee = team.members.find(m => m.id === task.assignee)
  const c = ctx({ sellerId: team.sellerId, lifecycle: team.lifecycle, surface: task.surface })
  const next = TASK_NEXT[task.status][0]
  taskTotal++
  if (!next) { if (tv(asActor(assignee), task, 'DONE', c) === 'transition') taskOk++; continue }
  if (tv(asActor(assignee), task, next, c) === 'allow') taskOk++
  const other = task.surface === 'COMPANION' ? 'CONSOLE' : 'COMPANION'
  if (tv(asActor(assignee), task, next, { ...c, surface: other }) === 'surface') denied++
}
ck('all 71 dataset tasks: the assignee may take the next step on its own surface (DONE ones are final)', taskOk === taskTotal && taskTotal === 71, { taskOk, taskTotal })
ck('the same step on the other surface is always refused', denied === teams.flatMap(x => x.tasks).filter(x => x.status !== 'DONE').length, denied)

// ---- Team messages ----
ck('any member who can act may post to the team thread on an active Seller', decideMessage(owner, ctx()).allowed && decideMessage(inv, ctx()).allowed)
ck('revoked / invited / suspended members cannot post; nor can anyone on a DRAFT or SUSPENDED Seller', ['INVITED', 'REVOKED', 'SUSPENDED'].every(status => decideMessage({ ...inv, status }, ctx()).code === 'membership') && decideMessage(owner, ctx({ lifecycle: 'SUSPENDED' })).code === 'lifecycle' && decideMessage({ ...owner, sellerId: 'DS-02' }, ctx()).code === 'seller')
ck('team messages come only from members of the same Seller', teams.every(x => x.messages.every(m => x.members.some(mm => mm.id === m.sender))))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
