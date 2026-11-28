// FR-001: the pure Scene tag identity and numbering rules (no browser). `node tests/unit/scene-tags.mjs`
import { addTag, removeTag, replaceTagProduct, migrateTags, tagsFromProducts, tagNumber, isPlaced } from '../../src/scene-tags.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const numbers = s => s.tags.map((t, i) => `${tagNumber(i)}:${t.product}`).join(',')
const add = (s, p, extra = { x: 50, y: 50 }) => addTag(s, p, extra)

let s = { tags: [], next: 1 }
s = add(add(add(s, 'A'), 'B'), 'C')
ck('three tags are numbered 1, 2, 3 in order', numbers(s) === '1:A,2:B,3:C', numbers(s))
ck('ids are T1..T3 and distinct', s.tags.map(t => t.id).join() === 'T1,T2,T3')
const ids = s.tags.map(t => t.id)

const mid = removeTag(s, 'T2')
ck('deleting the middle tag compacts the numbers to 1, 2 (no gap)', numbers(mid) === '1:A,2:C', numbers(mid))
ck('the remaining tags keep their ids', mid.tags.map(t => t.id).join() === 'T1,T3')
const again = add(mid, 'D')
ck('a tag added afterwards is number 3 with a NEW id (T4), never the freed T2', numbers(again) === '1:A,2:C,3:D' && again.tags[2].id === 'T4', again.tags.map(t => t.id))

const none = removeTag(removeTag(removeTag(again, 'T1'), 'T3'), 'T4')
ck('deleting every tag leaves no tags', none.tags.length === 0)
const fresh = add(none, 'E')
ck('after deleting all, the next tag is number 1', numbers(fresh) === '1:E', numbers(fresh))
ck('...but its id is still never reused (T5)', fresh.tags[0].id === 'T5' && !ids.includes(fresh.tags[0].id), fresh.tags[0].id)
ck('the same Product cannot be tagged twice in a Scene', add(s, 'B').tags.length === 3)
ck('removing an unknown id changes nothing', numbers(removeTag(s, 'T99')) === numbers(s))

// Replace Product: id, position and number stay.
const placed = { tags: [{ id: 'T1', product: 'A', x: 12, y: 34 }, { id: 'T2', product: 'B', x: 56, y: 78 }], next: 3 }
const r = replaceTagProduct(placed, 'T2', 'Z', ['A', 'B', 'Z'])
ck('replacing swaps the Product and keeps id, x, y and number', r.ok && r.state.tags[1].id === 'T2' && r.state.tags[1].product === 'Z' && r.state.tags[1].x === 56 && r.state.tags[1].y === 78 && numbers(r.state) === '1:A,2:Z', r)
ck('replacing leaves the other tag and the counter alone', r.ok && r.state.tags[0].product === 'A' && r.state.next === 3)
ck('a replacement already tagged in the Scene is refused', !replaceTagProduct(placed, 'T2', 'A', ['A', 'B']).ok)
ck('a replacement outside the allowed (same-Seller, in-stock) set is refused', !replaceTagProduct(placed, 'T2', 'Q', ['A', 'B']).ok)
ck('replacing a tag with its own Product is refused', !replaceTagProduct(placed, 'T2', 'B', ['A', 'B']).ok)
ck('replacing an unknown tag is refused', !replaceTagProduct(placed, 'T9', 'Z', ['Z']).ok)

// Unpositioned (dataset) tags.
const ds = tagsFromProducts(['P1', 'P2', 'P3'])
ck('dataset tags get T1..T3, counter 4, and no coordinates', ds.tags.map(t => t.id).join() === 'T1,T2,T3' && ds.next === 4 && ds.tags.every(t => !isPlaced(t)), ds)
const dr = replaceTagProduct(ds, 'T2', 'P9', ['P9'])
ck('replacing on an unpositioned tag stays unpositioned (no coordinates invented)', dr.ok && !isPlaced(dr.state.tags[1]) && !('x' in dr.state.tags[1]) && numbers(dr.state) === '1:P1,2:P9,3:P3', dr)
const dd = add(removeTag(ds, 'T1'), 'P4', {})
ck('adding to an unpositioned Scene adds an unpositioned tag', numbers(dd) === '1:P2,2:P3,3:P4' && !isPlaced(dd.tags[2]), dd)

// Migration of documents saved before tag ids existed.
const old = migrateTags([{ product: 'A', x: 1, y: 2, n: 1 }, { product: 'C', x: 3, y: 4, n: 3 }], 4)
ck('an old document gets ids from its numbers, keeps order and positions, and drops `n`', old.tags.map(t => t.id).join() === 'T1,T3' && old.tags[1].x === 3 && !('n' in old.tags[0]), old)
ck('...its display numbers compact to 1, 2 and the counter stays ahead (4)', numbers(old) === '1:A,2:C' && old.next === 4, old)
ck('an old document with no `n` and no counter is numbered by position', migrateTags([{ product: 'A' }, { product: 'B' }]).tags.map(t => t.id).join() === 'T1,T2')
ck('a counter below the highest id is raised above it', migrateTags([{ product: 'A', n: 7 }], 2).next === 8)
const idempotent = migrateTags(old.tags, old.next)
ck('migrating already migrated tags changes nothing', JSON.stringify(idempotent) === JSON.stringify(old))
ck('duplicate ids in a corrupt document are made unique', new Set(migrateTags([{ product: 'A', id: 'T1' }, { product: 'B', id: 'T1' }]).tags.map(t => t.id)).size === 2)

// Availability never renumbers: the numbering functions take no availability at all, so a stock change cannot move a number.
ck('numbering depends only on the composition (no availability input exists)', tagNumber.length === 1)

console.log(`scene-tags: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
