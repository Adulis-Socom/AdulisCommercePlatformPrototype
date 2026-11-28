// WEB-002: the pure public-link rules (no browser). `node tests/unit/public-web.mjs`
import { parsePublicLink, publicUrl, installMessage } from '../../src/public-web.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const here = { origin: 'https://demo.example', pathname: '/', search: '' }

ck('no surface, no link', parsePublicLink('') === undefined && parsePublicLink('?dataset=legacy') === undefined && parsePublicLink('?surface=buyer') === undefined)
ck('a Seller link', JSON.stringify(parsePublicLink('?surface=storefront&seller=DS-01')) === '{"surface":"storefront","seller":"DS-01"}')
ck('Seller, Scene and Product', JSON.stringify(parsePublicLink('?surface=storefront&seller=DS-02&scene=DS-02-S03&product=DS-02-P01')) === '{"surface":"storefront","seller":"DS-02","scene":"DS-02-S03","product":"DS-02-P01"}')
ck('the home surface', parsePublicLink('?surface=home')?.surface === 'home')
ck('?dataset= does not interfere', parsePublicLink('?dataset=legacy&surface=storefront&seller=SEL-1')?.seller === 'SEL-1')
for (const bad of ['../x', '<script>', 'a b', '', 'x'.repeat(41), '-lead']) ck(`an id shaped "${bad.slice(0, 12)}" is marked bad and never kept`, parsePublicLink(`?surface=storefront&seller=${encodeURIComponent(bad)}`)?.bad === true && parsePublicLink(`?surface=storefront&seller=${encodeURIComponent(bad)}`)?.seller === undefined, parsePublicLink(`?surface=storefront&seller=${encodeURIComponent(bad)}`))

const url = publicUrl({ surface: 'storefront', seller: 'DS-01', scene: 'DS-01-S01' }, here)
ck('a link is the origin, the path and the record names', url === 'https://demo.example/?surface=storefront&seller=DS-01&scene=DS-01-S01', url)
ck('it round-trips through the parser', JSON.stringify(parsePublicLink(new URL(url).search)) === '{"surface":"storefront","seller":"DS-01","scene":"DS-01-S01"}')
ck('the dataset query is kept', publicUrl({ surface: 'storefront', seller: 'DS-01' }, { ...here, search: '?dataset=legacy&x=1' }) === 'https://demo.example/?dataset=legacy&surface=storefront&seller=DS-01')
ck('nothing else in the page query leaks into a shared link', !publicUrl({ surface: 'storefront' }, { ...here, search: '?token=secret' }).includes('secret'))

ck('Install messages name the action', installMessage('save', 'this Product') === 'Install Adulis to save this Product' && installMessage('chat', 'Noor Edit') === 'Install Adulis to chat with Noor Edit' && installMessage('cart', 'this Product') === 'Install Adulis to add this Product to your Cart' && installMessage('follow', 'Noor Edit') === 'Install Adulis to follow Noor Edit' && installMessage('like', 'this Scene') === 'Install Adulis to like this Scene')

console.log(`public-web: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
