// BUYER-FIX-02: pure rules for private Collections and the Search facets (no browser). `node tests/unit/buyer-collections.mjs`
import * as C from '../../src/buyer-collections.ts'
import { facets, searchProducts, NO_FILTERS } from '../../src/buyer-search.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)}`); ok ? pass++ : fail++ }
const seed = [{ id: 'COL-A', name: 'Saved', isDefault: true, items: ['product:P1', 'post:S1'] }, { id: 'COL-B', name: 'Autumn', isDefault: false, items: ['product:P1'] }]

// create / names
let r = C.create(seed, '  Gift   ideas ')
ck('create trims and collapses spaces', 'list' in r && r.list.at(-1).name === 'Gift ideas' && r.id === 'COL-NEW-001', r)
ck('create refuses an empty name', 'error' in C.create(seed, '   '))
ck('create refuses a duplicate name ignoring case and spacing', 'error' in C.create(seed, ' autumn '))
ck('create refuses a name over 40 characters', 'error' in C.create(seed, 'x'.repeat(41)))
ck('create accepts exactly 40', 'list' in C.create(seed, 'x'.repeat(40)))
ck('create refuses beyond the Collection limit', 'error' in C.create(Array.from({ length: C.MAX_COLLECTIONS }, (_, i) => ({ id: `COL-X-${i}`, name: `n${i}`, isDefault: i === 0, items: [] })), 'one more'))
ck('ids never reuse a deleted one', C.nextId([{ id: 'COL-NEW-004', name: 'a', isDefault: true, items: [] }]) === 'COL-NEW-005')
ck('amharic and emoji names are allowed', 'list' in C.create(seed, 'ስጦታ 🎁'))

// rename / delete
const withNew = r.list
ck('rename a custom Collection', 'list' in C.rename(withNew, 'COL-NEW-001', 'Presents') && C.rename(withNew, 'COL-NEW-001', 'Presents').list.find(c => c.id === 'COL-NEW-001').name === 'Presents')
ck('rename to its own name is allowed (case change)', 'list' in C.rename(withNew, 'COL-NEW-001', 'GIFT IDEAS'))
ck('rename onto another Collection’s name is refused', 'error' in C.rename(withNew, 'COL-NEW-001', 'autumn'))
ck('the default Saved Collection cannot be renamed', 'error' in C.rename(seed, 'COL-A', 'Mine'))
ck('the default Saved Collection cannot be deleted', 'error' in C.remove(seed, 'COL-A'))
ck('deleting a custom Collection keeps the others', C.remove(seed, 'COL-B').list.length === 1 && C.remove(seed, 'COL-B').list[0].id === 'COL-A')
ck('renaming or deleting a Collection that is gone reports it', 'error' in C.rename(seed, 'COL-NOPE', 'x') && 'error' in C.remove(seed, 'COL-NOPE'))

// add / duplicates / remove / unsave
let a = C.add(seed, 'COL-B', 'post:S1')
ck('add puts an item in a chosen Collection', a.added && a.list.find(c => c.id === 'COL-B').items.includes('post:S1'))
ck('adding the same item twice never duplicates it', !C.add(a.list, 'COL-B', 'post:S1').added && a.list.find(c => c.id === 'COL-B').items.filter(k => k === 'post:S1').length === 1)
ck('the same item may be in several Collections', C.collectionsOf(a.list, 'post:S1').length === 2)
ck('removing from one Collection leaves it in the other', C.isSaved(C.removeItem(a.list, 'COL-B', 'post:S1'), 'post:S1'))
ck('unsave removes it from every Collection', !C.isSaved(C.unsave(a.list, 'post:S1'), 'post:S1'))
ck('adding to a Collection that is gone is a no-op', !C.add(seed, 'COL-NOPE', 'product:P9').added)
ck('an unavailable (unknown) item key is kept and removable', C.removeItem(C.add(seed, 'COL-A', 'product:GONE').list, 'COL-A', 'product:GONE').find(c => c.id === 'COL-A').items.every(k => k !== 'product:GONE'))
ck('split separates Products and Scenes in saved order', JSON.stringify(C.split(seed[0])) === JSON.stringify({ products: ['P1'], posts: ['S1'] }))

// legacy and normalisation
const legacy = C.applyLegacySaves(seed, { 'product:P9': true, 'post:S1': false })
ck('earlier saved-changes map applies on top of the seed', C.isSaved(legacy, 'product:P9') && !C.isSaved(legacy, 'post:S1') && C.isSaved(legacy, 'product:P1'))
const n = C.normalize([{ id: 'X', name: '  ', isDefault: true, items: ['product:A', 'product:A', 5, 'junk'] }, null, { id: 'X' }, { id: 'Y', name: 'Two', isDefault: true, items: [] }])
ck('normalize repairs shapes, drops duplicates and junk, keeps one default', n.length === 2 && n[0].name === 'Collection' && n[0].items.length === 1 && n.filter(c => c.isDefault).length === 1, n)
ck('normalize of a non-list is null (use the seed)', C.normalize({}) === null)
ck('a missing default is recreated', C.ensureDefault([{ id: 'Z', name: 'Z', isDefault: false, items: [] }]).some(c => c.isDefault))

// ---- Search facets: whole hierarchy, every attribute, no cap ----
const doc = (i, category, attrs) => ({ id: `P${i}`, name: `Thing ${i}`, description: '', sellerId: 'S', sellerName: 'Seller', category, attributes: attrs, details: [], available: true, locallyMade: false })
const docs = Array.from({ length: 80 }, (_, i) => doc(i, i % 2 ? 'Fashion › Women’s Clothing › Dresses' : 'Electronics › Phones', [{ label: `Attr${i}`, value: `v${i}` }, { label: 'Colour', value: i % 3 ? 'Red' : 'Blue' }]))
const f = facets(docs)
ck('all three taxonomy levels are offered', f.categories.some(c => c.name === 'Fashion › Women’s Clothing › Dresses') && f.categories.some(c => c.name === 'Fashion') && f.categories.some(c => c.name === 'Electronics › Phones'), f.categories)
ck('no attribute is dropped by a first-30 cap (80 distinct labels + Colour)', f.attributeGroups.length === 81, f.attributeGroups.length)
ck('values are grouped under their label with counts', f.attributeGroups.find(g => g.label === 'Colour').values.reduce((s, v) => s + v.count, 0) === 80)
const hits = searchProducts(docs, 'thing', { ...NO_FILTERS, attributes: [{ label: 'Colour', value: 'Red' }, { label: 'Attr5', value: 'v5' }] })
ck('several attribute filters must all match', hits.length === 1 && hits[0].id === 'P5', hits.map(h => h.id))
ck('a category filter at the deepest level applies', searchProducts(docs, 'thing', { ...NO_FILTERS, category: 'Fashion › Women’s Clothing › Dresses' }).length === 40)
ck('attributes are searchable as text (exact word ranks first, prefixes follow)', searchProducts(docs, 'attr7')[0]?.id === 'P7' && searchProducts(docs, 'attr7').length === 11)

console.log(`UNIT buyer-collections: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
