// DEMO-002: the shared asset manifest (src/marketplace/assets.ts): 391 supplied references, unique ids and filenames, all pending founder supply, counts per
// role / priority / wave, and a labelled placeholder for every asset. `node tests/unit/assets.mjs`
import { ASSETS, ASSET_MANIFEST, assetCounts, assetFor, assetsOf, placeholderFor } from '../../src/marketplace/assets.ts'

let pass = 0, fail = 0
const ck = (label, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ' — ' + JSON.stringify(detail)?.slice(0, 300)}`); ok ? pass++ : fail++ }
const c = assetCounts()
ck('391 supplied asset references', ASSETS.length === 391 && c.total === 391, ASSETS.length)
ck('asset_id and filename are unique', new Set(ASSETS.map(a => a.assetId)).size === 391 && new Set(ASSETS.map(a => a.filename)).size === 391)
ck('every asset is pending founder supply', ASSETS.every(a => a.status === 'pending founder supply'))
ck('roles: 23 logos, 22 covers, 140 Product covers, 140 Product details, 66 Scene stills', JSON.stringify(c.role) === JSON.stringify({ logo: 23, cover: 22, 'Product cover': 140, 'Product detail': 140, 'Scene still': 66 }), c.role)
ck('priorities P0 197, P1 56, P2 138', c.priority.P0 === 197 && c.priority.P1 === 56 && c.priority.P2 === 138, c.priority)
ck('waves 146 / 235 / 10', Object.values(c.wave).sort((a, b) => a - b).join() === '10,146,235', c.wave)
ck('lookup by id and by entity', assetFor('DS-01-LOGO')?.filename === 'ds-01_logo.png' && assetsOf('DS-01').length >= 2)
ck('the placeholder is labelled and carries the supplied filename; an unknown id still gets one', placeholderFor('DS-01-LOGO').label === 'Photo pending' && placeholderFor('DS-01-LOGO').filename === 'ds-01_logo.png' && placeholderFor('nope').role === null)
ck('no asset carries a URL or a bundled file path', ASSETS.every(a => !/^https?:|\//.test(a.filename)) && Object.keys(ASSET_MANIFEST).length === 391)
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
