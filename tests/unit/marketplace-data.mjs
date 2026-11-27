// DEMO-001: the marketplace source data, its generated copy, the validator and the dataset-aware data layer (no browser).
// `node tests/unit/marketplace-data.mjs`
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { validateMarketplace, EXPECTED_COUNTS, CANONICAL_ROLES } from '../../src/marketplace/validate.ts'
import { ANALYTICS_KEYS } from '../../src/marketplace/types.ts'
import { TAXONOMY } from '../../src/demo-data/taxonomy.ts'
import { SELLER_ROLES } from '../../src/demo-data/seller-roles.ts'
import * as D from '../../src/demo-data/index.ts'
import { MARKETPLACE as M } from '../../src/marketplace/adapt.ts'
import { DATASET, isLegacy, datasetKey } from '../../src/marketplace/registry.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 400)}`); ok ? pass++ : fail++ }
const read = f => readFileSync(new URL(`../../${f}`, import.meta.url))
const json = f => JSON.parse(read(f).toString('utf8'))
const sha = buf => createHash('sha256').update(buf).digest('hex')

// ---- sources and generated copy ----
const SRC = 'docs/references/marketplace/'
const baseBuf = read(SRC + 'Adulis_Demo_Data_Fixtures.json'), opsBuf = read(SRC + 'Adulis_Operations_Complete.json')
ck('catalogue source SHA-256 is the pinned one', sha(baseBuf) === '2061e01087484ca9d68b7ac8840c8bb2d970d09e1fb4fcba5c221f2d7563ab13')
ck('operations source SHA-256 is the pinned one', sha(opsBuf) === '6b5692850667efce3cf8417bab22e8fe47e923e89430350de517ab1ea9512cc6')
const base = JSON.parse(baseBuf.toString('utf8')), ops = JSON.parse(opsBuf.toString('utf8'))
ck('operations metadata.base_source_sha256 equals the catalogue hash', ops.metadata.base_source_sha256 === sha(baseBuf))
const gen = { catalogue: json('src/marketplace/data/catalogue.json'), operations: json('src/marketplace/data/operations.json'), analytics: json('src/marketplace/data/analytics.json'), manifest: json('src/marketplace/data/MANIFEST.json') }
ck('generated catalogue.json equals the source verbatim', JSON.stringify(gen.catalogue) === JSON.stringify(base))
ck('generated operations.json + analytics.json equal the source verbatim', JSON.stringify({ ...gen.operations, ...gen.analytics }) === JSON.stringify(ops) || Object.keys(ops).every(k => JSON.stringify((ANALYTICS_KEYS.includes(k) ? gen.analytics : gen.operations)[k]) === JSON.stringify(ops[k])))
ck('MANIFEST records both source hashes', gen.manifest.sources['Adulis_Demo_Data_Fixtures.json'].sha256 === sha(baseBuf) && gen.manifest.sources['Adulis_Operations_Complete.json'].sha256 === sha(opsBuf))
for (const [table, n] of Object.entries(EXPECTED_COUNTS)) ck(`count ${table} = ${n}`, (base[table] ?? ops[table])?.length === n, (base[table] ?? ops[table])?.length)
ck('MANIFEST record counts match the data', Object.entries(EXPECTED_COUNTS).every(([t, n]) => (gen.manifest.sources['Adulis_Demo_Data_Fixtures.json'].records[t] ?? gen.manifest.sources['Adulis_Operations_Complete.json'].records[t]) === n))

// ---- validator ----
const taxonomy = (major, category, sub) => {
  const m = TAXONOMY.find(x => x.name === major), c = m?.categories.find(x => x.name === category)
  return { major: !!m, category: !!c, sub: !!c?.subcategories.some(s => s.name === sub), subListed: !!c?.hasSubcategoryList }
}
const roles = SELLER_ROLES.map(r => r.role)
ck('seller-roles.ts defines exactly the six canonical roles', roles.length === 6 && CANONICAL_ROLES.every(r => roles.includes(r)), roles)
const run = (b = base, o = ops) => validateMarketplace({ base: b, ops: o }, { taxonomy, roles })
const issues = run()
ck('the real data has no validator errors', issues.filter(i => i.level === 'error').length === 0, issues.filter(i => i.level === 'error').slice(0, 5))
ck('the real data has no unregistered source conflicts', issues.filter(i => i.level === 'conflict').length === 0, issues.filter(i => i.level === 'conflict').slice(0, 5))
ck('71 category-only products are reported as taxonomy gaps, never filled', issues.filter(i => i.code === 'taxonomy-gap').length === 71)
ck('every product taxonomy path resolves against src/demo-data/taxonomy (no taxonomy conflicts)', !issues.some(i => i.code === 'taxonomy'))

// Negative cases: each mutation of a deep copy must be caught.
const clone = x => JSON.parse(JSON.stringify(x))
const mutate = (fn) => { const b = clone(base), o = clone(ops); fn(b, o); return run(b, o) }
const caught = (label, fn, code) => { const r = mutate(fn); ck(`validator catches: ${label}`, r.some(i => i.code === code && i.level !== 'gap'), r.slice(0, 3)) }
caught('duplicate product id', b => { b.products[1].product_id = b.products[0].product_id }, 'duplicate-id')
caught('dangling Scene tag', b => { b.scenes[0].product_ids[0] = 'DS-99-P01' }, 'ref')
caught('Scene tagging another Seller\'s Product', b => { b.scenes[0].product_ids[0] = 'DS-02-P01' }, 'ownership')
caught('order total not merchandise + delivery', (b, o) => { o.orders[0].total_etb += 1 }, 'order-total')
caught('order line not unit x quantity', (b, o) => { o.order_lines[0].line_etb += 1 }, 'order-total')
caught('order merchandise not the sum of lines', (b, o) => { o.orders[0].merchandise_etb += 10; o.orders[0].total_etb += 10 }, 'order-total')
caught('order line of another Seller\'s Product', (b, o) => { o.order_lines[0].product_id = 'DS-02-P01' }, 'ownership')
caught('final handoff that is not a DELIVERY handoff', (b, o) => { const h = o.handoffs.find(x => x.stage === 'DELIVERY'); h.stage = 'PICKUP' }, 'handoff')
caught('handoff presenter that is nobody', (b, o) => { o.handoffs[0].presenter_id = 'NOBODY' }, 'handoff')
caught('two review grants for one order', (b, o) => { o.review_grants[1].order_id = o.review_grants[0].order_id }, 'review')
caught('review whose buyer differs from its grant', (b, o) => { o.reviews[0].buyer_id = o.reviews[0].buyer_id === 'BY-01' ? 'BY-02' : 'BY-01' }, 'review')
caught('Product rating of a line that was not received', (b, o) => { o.order_lines.find(l => l.line_etb && o.product_ratings.some(p => p.order_line_id === l.order_line_id)).received = false }, 'review')
caught('role outside the canonical six', (b, o) => { o.team_members[1].roles = ['SUPER_ADMIN'] }, 'permission')
caught('OWNER assigned as a team role', (b, o) => { o.team_members.find(m => m.relationship_type === 'TEAM').roles.push('OWNER') }, 'permission')
caught('task assigned across Sellers', (b, o) => { o.tasks[0].assignee_id = o.team_members.find(m => m.seller_id !== o.tasks[0].seller_id).member_id }, 'ownership')
caught('Cart line owned by nobody', (b, o) => { o.cart_lines[0].buyer_id = 'BY-99' }, 'ref')
caught('Collection save into another Buyer\'s Collection', (b, o) => { o.saves[0].buyer_id = 'BY-11' }, 'ownership')
caught('Variant of the wrong Product', (b, o) => { o.order_lines.find(l => l.variant_id).product_id = 'DS-02-P01' }, 'ownership')
caught('Variant stock that no longer sums to the Product', b => { b.variants[0].stock += 1 }, 'variant-stock')
caught('draft Seller with a follower', (b, o) => { o.follows.push({ buyer_id: 'BY-01', seller_id: 'DS-11', followed_at: '2026-11-25', mode: 'MVP' }) }, 'lifecycle')
caught('mode outside MVP/DEMO/INTERNAL_SIMULATION', (b, o) => { o.cart_lines[0].mode = 'PRODUCTION' }, 'scope')
caught('count drift', b => { b.products.pop() }, 'count')
caught('current price that does not follow the discount', b => { b.products[0].current_etb += 1 }, 'price')

// ---- adapter ----
ck('default dataset in Node is marketplace', DATASET === 'marketplace' && !isLegacy)
ck('dataset-scoped storage keys: marketplace is namespaced, legacy keeps its key', datasetKey('k') === 'k:marketplace')
ck('adapter yields 23 Sellers, 140 Products, 66 Scenes, 11 Buyers', M.sellerIds.length === 23 && M.productIds.length === 140 && M.postIds.length === 66 && M.buyerIds.length === 11)
const p01 = base.products.find(p => p.product_id === 'DS-01-P01')
ck('price maps to santim without changing the source numbers', M.products['DS-01-P01'].price === p01.regular_etb * 100 && M.products['DS-01-P01'].discount.price === p01.current_etb * 100 && M.products['DS-01-P01'].discount.percent === p01.discount_pct)
ck('a Product with no discount has no discount record and keeps its price', !M.products['DS-01-P06'].discount && M.products['DS-01-P06'].price === 280000)
const withRows = M.productIds.filter(id => M.extras[id].rows)
ck('exact Variant rows exist only for the 15 source Variants of 6 Products (never from variant_idea)', withRows.length === 6 && withRows.reduce((n, id) => n + M.extras[id].rows.length, 0) === 15, withRows)
ck('Variant row price and stock are the source numbers', M.extras['DS-15-P01'].rows.map(r => [r.label, r.price, r.stock].join()).join('|') === '30 mL,320000,3|50 mL,440000,1')
ck('Product stock is the source figure; availability follows the prototype threshold (0 out, 1-3 low)', M.products['DS-01-P06'].availability === 'Out of Stock' && M.products['DS-01-P09'].availability === 'Low Stock' && M.products['DS-01-P01'].stock === 8 && M.products['DS-01-P01'].availability === 'Available')
ck('no Product description or detail line is invented', M.productIds.every(id => !M.products[id].description && M.extras[id].details.length === 0 && M.products[id].attributes.length === 0))
ck('no photo is invented', M.productIds.every(id => M.extras[id].photos.length === 0))
ck('every Scene is explicitly unpositioned with no coordinates', M.postIds.every(id => M.posts[id].positioned === false && M.posts[id].hotspots === 0 && !('x' in M.posts[id])))
ck('Scene tags are the source product_ids, in order', base.scenes.every(s => JSON.stringify(M.posts[s.scene_id].tags) === JSON.stringify(s.product_ids)))
ck('draft Products are marked Draft', M.productIds.filter(id => M.products[id].publication === 'Draft').length === 2)
ck('the moderation-restricted Scene is restricted; the archived one is Archived; the draft one is Draft', !!M.posts['DS-06-S05'].restricted && M.posts['DS-10-S06'].publication === 'Archived' && M.posts['DS-01-S07'].publication === 'Draft')
ck('Seller lifecycle is carried', M.sellers['DS-11'].lifecycle === 'DRAFT' && M.sellers['DS-23'].lifecycle === 'SUSPENDED' && M.sellers['DS-01'].lifecycle === 'ACTIVE')
ck('Seller Delivery charge is the Seller\'s one simulated charge (ETB 80); Collection-only Sellers have none', M.sellers['DS-01'].sellerDelivery.charge === 8000 && !M.sellers['DS-07'].sellerDelivery && !M.sellers['DS-07'].courierCompensation)
ck('no Seller carries simulation reputation totals or a map pin', M.sellerIds.every(id => !M.sellers[id].totals && !M.sellers[id].mapPin))
ck('Buyer BY-01 is the primary signed-in Buyer; follows come from the source', M.buyers['BY-01'].primary && M.buyers['BY-01'].follows.length === ops.follows.filter(f => f.buyer_id === 'BY-01').length)
ck('the zero-result example query matches no Product, Scene or Seller', !JSON.stringify([base.products.map(p => [p.name, p.category, p.subcategory]), base.scenes.map(s => [s.title, s.caption, s.tag_names]), base.sellers.map(s => [s.name, s.profile])]).toLowerCase().includes(M.buyers['BY-01'].zeroResultQuery))
ck('team members become staff with their source roles; every Owner has a Console session', Object.keys(M.staff).length === 83 && M.sessions.length === 46 && M.staff['DS-01-TM02'].roles.length > 0)
ck('chat messages become one thread per Buyer and Seller', Object.keys(M.conversations).length === 5 && M.conversations['BY-01-DS-01-CHAT'].messages.length === 2)

// ---- the dataset-aware data layer (marketplace) ----
const AT = D.DEFAULT_SNAPSHOT
ck('the default story moment is the marketplace snapshot', AT.at === '2026-11-27T10:00:00+03:00')
ck('Seller Console / Companion / Operator can inspect all 23 Sellers', D.showcaseSellers().length === 23 && D.SELLER_IDS.length === 23)
ck('Buyers see only the 21 ACTIVE Sellers (no DS-11, no DS-23)', D.buyerVisibleSellers().length === 21 && !D.buyerVisibleSellers().includes('DS-11') && !D.buyerVisibleSellers().includes('DS-23'))
ck('no legacy Seller, Product, Scene or Buyer is in any list', !D.SELLER_IDS.some(id => id.startsWith('SEL-')) && !D.PRODUCT_IDS.some(id => id.startsWith('PRD-')) && !D.SHOPPABLE_POST_IDS.some(id => id.startsWith('SHP-')) && !D.BUYER_IDS.some(id => id.startsWith('BUY-')))
const activeIds = new Set(base.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id))
const expectedProducts = base.products.filter(p => activeIds.has(p.seller_id) && p.publication === 'PUBLISHED').map(p => p.product_id).sort()
ck('public Products = PUBLISHED Products of ACTIVE Sellers (135), nothing else', JSON.stringify([...D.buyerVisibleProductsAt(AT)].sort()) === JSON.stringify(expectedProducts) && expectedProducts.length === 135, D.buyerVisibleProductsAt(AT).length)
ck('DS-23 Products and DS-02 draft Products are not public but are inspectable by the Seller', D.sellerProductsAt('DS-23', AT).length === 3 && !D.buyerVisibleProductsAt(AT).some(id => id.startsWith('DS-23')))
const expectedScenes = base.scenes.filter(s => activeIds.has(s.seller_id) && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC').map(s => s.scene_id).sort()
ck('the derived Scene visibility reproduces the source for all 66 Scenes (PUBLISHED+PUBLIC of an ACTIVE Seller only)', JSON.stringify([...D.buyerVisiblePostsAt(AT)].sort()) === JSON.stringify(expectedScenes), { app: D.buyerVisiblePostsAt(AT).length, source: expectedScenes.length })
ck('an out-of-stock Scene tag is unavailable, a restricted Scene stays private despite stock', !D.buyerVisiblePostsAt(AT).includes('DS-01-S03') && !D.buyerVisiblePostsAt(AT).includes('DS-06-S05') && D.buyerVisiblePostsAt(AT).includes('DS-01-S01'))
ck('For You has only eligible public Scenes, led by DS-01', D.forYouAt(AT).every(id => D.buyerVisiblePostsAt(AT).includes(id)) && D.forYouAt(AT)[0] === 'DS-01-S01', D.forYouAt(AT).slice(0, 3))
ck('Following shows only followed Sellers\' public Scenes', D.followingAt('BY-01', AT).length > 0 && D.followingAt('BY-01', AT).every(id => D.BUYERS['BY-01'].follows.includes(D.SHOPPABLE_POSTS[id].seller)))
ck('Stories: the 5 Live Stories with an available link; hidden-link, private-link, suspended, expired, withdrawn and draft ones are not shown', JSON.stringify(D.storiesAt(AT).map(s => s.id).sort()) === JSON.stringify(['DS-01-T01', 'DS-06-T01', 'DS-10-T01', 'DS-12-T01', 'DS-17-T01']), D.storiesAt(AT).map(s => s.id))
const sd = D.SURFACE_DEFAULTS
ck('surface defaults: Buyer BY-01, Seller DS-01, a real in-stock DS-01 Product and public DS-01 Scene, the DS-01 thread', sd.buyer === 'BY-01' && sd.seller === 'DS-01' && D.PRODUCTS[sd.product].seller === 'DS-01' && D.PRODUCTS[sd.product].stock > 0 && D.buyerVisiblePostsAt(AT).includes(sd.post) && D.SHOPPABLE_POSTS[sd.post].seller === 'DS-01' && sd.conversation === 'BY-01-DS-01-CHAT', sd)
ck('the effective price is the discounted price; an exact Variant row prices its own unit', D.currentPrice('DS-01-P01') === 196000 && D.unitPriceFor({ product: 'DS-15-P01', options: ['50 mL'] }) === 440000)
ck('the Seller\'s fulfilment comes from its own record (DS-01: collection free, Seller Delivery ETB 80, no courier)', JSON.stringify(D.fulfilmentOptionsAt('DS-01', AT).map(o => [o.mode, o.charge])) === JSON.stringify([['Buyer Collection', 0], ['Seller Delivery', 8000]]))
ck('Seller team roles come from the source (DS-01-TM02 is a team member, never OWNER)', (() => { const t = D.sellerTeam('DS-01'); return t[0].owner && t.length === ops.team_members.filter(m => m.seller_id === 'DS-01').length && t.slice(1).every(m => !m.owner && !m.roles.includes('OWNER')) })())
ck('Trust is the source MVP label, from the joined date (480 days before the snapshot)', D.trustAt('DS-01', AT) === 'NEW' && D.onAdulisSince('DS-01') === '2025-08-04', D.onAdulisSince('DS-01'))

// ---- legacy mode in a fresh process: exactly the old dataset ----
const probe = `globalThis.location = { search: '?dataset=legacy' }
const d = await import('./src/demo-data/index.ts'); const r = await import('./src/marketplace/registry.ts')
console.log(JSON.stringify({ ds: r.DATASET, key: r.datasetKey('k'), snap: d.DEFAULT_SNAPSHOT.at, sellers: d.SELLER_IDS, show: d.showcaseSellers(), vis: d.buyerVisibleSellers(), products: d.PRODUCT_IDS.length, posts: d.SHOPPABLE_POST_IDS.length, buyers: d.BUYER_IDS, defaults: d.SURFACE_DEFAULTS,
  forYou: d.forYouAt(d.DEFAULT_SNAPSHOT).length, following: d.followingAt('BUY-MAYA-TESFAYE', d.DEFAULT_SNAPSHOT).length, stories: d.storiesAt(d.DEFAULT_SNAPSHOT).map(s => s.id), visProducts: d.buyerVisibleProductsAt(d.DEFAULT_SNAPSHOT).length, visPosts: d.buyerVisiblePostsAt(d.DEFAULT_SNAPSHOT).length, nearby: d.discoveryAreas(), team: d.sellerTeam('SEL-ADDIS-ATELIER').map(m => m.roles.join('+')) }))`
const child = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' })
let L = null
try { L = JSON.parse(child.stdout.trim().split('\n').pop()) } catch { /* reported below */ }
ck('legacy probe ran', !!L, child.stderr.slice(0, 300))
if (L) {
  ck('?dataset=legacy selects legacy, keeps the original storage key and the 10:25 snapshot', L.ds === 'legacy' && L.key === 'k' && L.snap === '2026-10-02T10:25:00+03:00')
  ck('legacy lists are the four seeded Sellers (three showcase and visible), 17 Products, 17 Scenes, 4 Buyers', JSON.stringify(L.sellers) === JSON.stringify(['SEL-ADDIS-ATELIER', 'SEL-NURA-GLOW', 'SEL-VOLT-HOUSE', 'SEL-NILE-LOOM']) && L.show.length === 3 && L.vis.length === 3 && L.products === 17 && L.posts === 17 && L.buyers.length === 4, { products: L.products, posts: L.posts, buyers: L.buyers })
  ck('legacy surface defaults are the historical story', L.defaults.buyer === 'BUY-MAYA-TESFAYE' && L.defaults.seller === 'SEL-ADDIS-ATELIER' && L.defaults.product === 'PRD-AA-001' && L.defaults.post === 'SHP-AA-001' && L.defaults.order === 'ADU-24091' && L.defaults.conversation === 'CNV-MAYA-AA')
  ck('legacy keeps its three Stories and its Nearby areas', JSON.stringify(L.stories.sort()) === JSON.stringify(['STY-AA-01', 'STY-NG-01', 'STY-VH-01']) && JSON.stringify(L.nearby) === JSON.stringify(['Kazanchis', 'Bole', 'Megenagna']), { stories: L.stories, nearby: L.nearby })
  ck('legacy team roles still come from the seeded mapping (Operations = Inventory + Sales Support)', L.team.includes('INVENTORY+SALES_SUPPORT'), L.team)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
