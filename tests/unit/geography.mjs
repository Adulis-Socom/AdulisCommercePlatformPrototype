// DEMO-003: the pure geography rules (Buyer city/area against Seller coverage and area) and the eleven Buyer accounts as the dataset states them (no browser).
// `node tests/unit/geography.mjs`
import { readFileSync } from 'node:fs'
import { deliveryTo, offersCollection, rankNearby } from '../../src/marketplace/geography.ts'
import { MARKETPLACE as M } from '../../src/marketplace/adapt.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const json = f => JSON.parse(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
const cat = json('src/marketplace/data/catalogue.json'), ops = json('src/marketplace/data/operations.json')

const bole = { city: 'Addis Ababa', area: 'Bole' }, hawassa = { city: 'Hawassa', area: 'Central Hawassa' }, kazanchis = { city: 'Addis Ababa', area: 'Kazanchis' }
// ---- deliveryTo ----
ck('a listed city reaches a Buyer in it', deliveryTo('Addis Ababa; Adama', bole) === 'yes')
ck('a second listed city reaches too', deliveryTo('Addis Ababa; Adama', { city: 'Adama', area: 'Central Adama' }) === 'yes')
ck('a Buyer in another city is not reached', deliveryTo('Addis Ababa; Adama', hawassa) === 'no')
ck('"Addis Ababa by arrangement" is arrangement, never a delivery', deliveryTo('Adama; Addis Ababa by arrangement', bole) === 'arrangement')
ck('the Seller\'s own city still reaches when another is by arrangement', deliveryTo('Adama; Addis Ababa by arrangement', { city: 'Adama', area: 'Central Adama' }) === 'yes')
ck('"Not configured" is unknown', deliveryTo('Not configured', bole) === 'unknown')
ck('blank, undefined and null are unknown', ['', '  ', undefined, null].every(c => deliveryTo(c, bole) === 'unknown'))
ck('a list of districts matches the Buyer\'s own area only', deliveryTo(['Bole'], bole) === 'yes' && deliveryTo(['Bole'], kazanchis) === 'no')
ck('nationwide shipping by arrangement is arrangement', deliveryTo(['Nationwide shipping by arrangement'], hawassa) === 'arrangement')
ck('legacy wording "within Addis Ababa" reaches Addis Ababa', deliveryTo('within Addis Ababa', bole) === 'yes')
ck('matching ignores case and spacing', deliveryTo(' addis ababa ;ADAMA', bole) === 'yes')
ck('collection is offered by the fulfilment text only', offersCollection('Collection; Seller Delivery') && offersCollection('Collection') && !offersCollection('Seller Delivery') && !offersCollection('Not configured') && !offersCollection(undefined))

// ---- rankNearby / the Nearby map ----
const active = cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => ({ id: s.seller_id, city: s.city, area: s.area }))
const inBole = rankNearby(active, bole)
const boleIds = active.filter(s => s.area === 'Bole').map(s => s.id)
ck('Nearby for Bole lists the Bole Sellers first', JSON.stringify(inBole.slice(0, boleIds.length)) === JSON.stringify(boleIds), inBole)
ck('Nearby for Bole then lists the rest of Addis Ababa, and no other city', inBole.length === active.filter(s => s.city === 'Addis Ababa').length && inBole.every(id => active.find(s => s.id === id).city === 'Addis Ababa'))
ck('Nearby for Central Hawassa is exactly the two Hawassa Sellers', JSON.stringify(rankNearby(active, hawassa)) === JSON.stringify(['DS-03', 'DS-13']), rankNearby(active, hawassa))
ck('the dataset\'s Nearby map has an entry for every Buyer\'s area', ops.buyers.every(b => b.area in M.nearby), Object.keys(M.nearby))
ck('Central Gondar (BY-10) has no active Seller: its Nearby is empty, not borrowed from another city', Array.isArray(M.nearby['Central Gondar']) && M.nearby['Central Gondar'].length === 0)
ck('every Nearby list stays inside the city of its own area', Object.entries(M.nearby).every(([area, ids]) => { const city = [...cat.sellers, ...ops.buyers].find(x => x.area === area).city; return ids.every(id => cat.sellers.find(s => s.seller_id === id).city === city) }))
ck('no Nearby list names a draft or suspended Seller', Object.values(M.nearby).flat().every(id => active.some(s => s.id === id)))

// ---- the eleven accounts ----
const ids = M.buyerIds
ck('eleven Buyer accounts BY-01..BY-11', ids.length === 11 && ids.join() === Array.from({ length: 11 }, (_, i) => `BY-${String(i + 1).padStart(2, '0')}`).join(), ids)
ck('each account has its own name, handle, city and area from the dataset', ids.every(id => { const b = M.buyers[id], s = ops.buyers.find(x => x.buyer_id === id); return b.name === s.display_name && b.handle === s.handle && b.city === s.city && b.deliveryArea === s.area && b.joined === s.joined_date }))
ck('names and handles are unique', new Set(ids.map(id => M.buyers[id].name)).size === 11 && new Set(ids.map(id => M.buyers[id].handle)).size === 11)
ck('Buyers span the dataset\'s eight cities', new Set(ids.map(id => M.buyers[id].city)).size === 8, [...new Set(ids.map(id => M.buyers[id].city))])
ck('each account\'s follows are its own rows', ids.every(id => JSON.stringify(M.buyers[id].follows) === JSON.stringify(ops.follows.filter(f => f.buyer_id === id).map(f => f.seller_id))))
ck('each account\'s Collections are its own rows (Saved plus the others)', ids.every(id => Object.values(M.collections).filter(c => c.owner === id).length === ops.collections.filter(c => c.buyer_id === id).length))
ck('BY-10 and BY-11 have no follows or Cart lines (the empty-state accounts)', ['BY-10', 'BY-11'].every(id => !M.buyers[id].follows.length && !ops.cart_lines.some(l => l.buyer_id === id)))
ck('every Cart line is the Buyer\'s own, on an existing Product of its Seller and a Variant of that Product', ops.cart_lines.every(l => { const p = cat.products.find(x => x.product_id === l.product_id); const v = l.variant_id && cat.variants.find(x => x.variant_id === l.variant_id); return p && p.seller_id === l.seller_id && (!l.variant_id || (v && v.product_id === l.product_id)) }))

console.log(`\ngeography: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
