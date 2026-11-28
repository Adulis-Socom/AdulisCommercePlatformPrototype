// DEMO-002: the identities of the historical seeded dataset (names, handles and ids), minus anything the marketplace dataset also contains. On the marketplace dataset none
// of them may appear on a surface except in the labelled "?dataset=legacy" pointer text. Not a suite itself (no .test.mjs suffix).
import { readFileSync } from 'node:fs'
const mp = ['catalogue', 'operations'].map(f => readFileSync(new URL(`../src/marketplace/data/${f}.json`, import.meta.url), 'utf8')).join('')
const rec = f => import(`../src/demo-data/records/${f}.ts`)
const [S, B, P, C, PO, ...rest] = await Promise.all(['sellers', 'buyers', 'products', 'couriers', 'posts', 'orders', 'claims', 'operations', 'conversations', 'reviews', 'notifications', 'insights', 'channels'].map(rec))
const out = new Set()
const add = v => { if (typeof v === 'string' && v.length >= 4 && !mp.includes(v)) out.add(v) }
for (const id of S.SELLER_IDS) { add(S.SELLERS[id].name); add(S.SELLERS[id].handle) }
for (const id of B.BUYER_IDS) add(B.BUYERS[id].name)
for (const id of P.PRODUCT_IDS) add(P.PRODUCTS[id].name)
for (const id of C.COURIER_IDS) add(C.COURIERS[id].name)
for (const id of PO.SHOPPABLE_POST_IDS) add(PO.SHOPPABLE_POSTS[id].title)
// Ids: any id-shaped string or key in the record modules, except the Operator's own access fixtures (OPR-, DEC-, SCV-: Founder roles, not dataset identities).
const ID = /^[A-Z]{2,5}(-[A-Z0-9]+){1,4}$/
const walk = (v, d = 0) => { if (d > 7 || v == null) return; if (typeof v === 'string') { if (ID.test(v) && !/^(OPR|DEC|SCV)-/.test(v)) add(v); return } if (typeof v !== 'object') return; for (const [k, x] of Object.entries(v)) { if (ID.test(k) && !/^(OPR|DEC|SCV)-/.test(k)) add(k); walk(x, d + 1) } }
for (const m of [S, B, P, C, PO, ...rest]) walk(m)
export const LEGACY_MARKERS = [...out]
/** Legacy identities found in `text`, ignoring the labelled pointer sentence that names the legacy dataset. */
export const legacyHits = text => LEGACY_MARKERS.filter(k => text.includes(k))
