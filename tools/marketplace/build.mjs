// Marketplace data build (DEMO-001). `pnpm run data:build`
// Verifies both source files against their pinned SHA-256, runs the shared validator and writes the generated files under
// src/marketplace/data/: catalogue.json, operations.json, analytics.json (the weekly series, loaded on demand) and MANIFEST.json.
// Values are copied verbatim (minified). Nothing is repaired: validator `error`s stop the build, `conflict`s and `gap`s are printed
// and belong in DATASET_INTEGRATION_REGISTER.md. The Excel mirrors are never read.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateMarketplace, EXPECTED_COUNTS } from '../../src/marketplace/validate.ts'
import { ANALYTICS_KEYS } from '../../src/marketplace/types.ts'
import { TAXONOMY } from '../../src/demo-data/taxonomy.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = join(root, 'docs', 'references', 'marketplace')
const OUT = join(root, 'src', 'marketplace', 'data')
const PINNED = {
  'Adulis_Demo_Data_Fixtures.json': '2061e01087484ca9d68b7ac8840c8bb2d970d09e1fb4fcba5c221f2d7563ab13',
  'Adulis_Operations_Complete.json': '6b5692850667efce3cf8417bab22e8fe47e923e89430350de517ab1ea9512cc6',
}
const sha = buf => createHash('sha256').update(buf).digest('hex')
const die = msg => { console.error(`data:build FAILED: ${msg}`); process.exit(1) }

const raw = {}
for (const [file, want] of Object.entries(PINNED)) {
  const buf = readFileSync(join(SRC, file))
  const got = sha(buf)
  if (got !== want) die(`${file} SHA-256 is ${got}, pinned ${want}`)
  raw[file] = { hash: got, bytes: buf.length, json: JSON.parse(buf.toString('utf8')) }
}
const base = raw['Adulis_Demo_Data_Fixtures.json'].json
const ops = raw['Adulis_Operations_Complete.json'].json
if (ops.metadata.base_source_sha256 !== PINNED['Adulis_Demo_Data_Fixtures.json']) die('operations metadata.base_source_sha256 does not match the catalogue hash')

// The canonical Seller roles, read from src/demo-data/seller-roles.ts without importing it (it depends on the generated data this script writes).
const rolesSource = readFileSync(join(root, 'src', 'demo-data', 'seller-roles.ts'), 'utf8')
const roles = [...rolesSource.slice(rolesSource.indexOf('SELLER_ROLES: readonly RoleInfo[]'), rolesSource.indexOf('export const roleInfo')).matchAll(/role: '([A-Z_]+)'/g)].map(m => m[1])
const taxonomy = (major, category, sub) => {
  const m = TAXONOMY.find(x => x.name === major)
  const c = m?.categories.find(x => x.name === category)
  return { major: !!m, category: !!c, sub: !!c?.subcategories.some(s => s.name === sub), subListed: !!c?.hasSubcategoryList }
}
const issues = validateMarketplace({ base, ops }, { taxonomy, roles })
const by = level => issues.filter(i => i.level === level)
const tally = level => { const m = {}; for (const i of by(level)) m[i.code] = (m[i.code] ?? 0) + 1; return m }
console.log(`validator: ${by('error').length} errors, ${by('conflict').length} conflicts ${JSON.stringify(tally('conflict'))}, ${by('gap').length} gaps ${JSON.stringify(tally('gap'))}`)
if (process.argv.includes('--issues')) for (const i of issues) console.log(`  [${i.level}] ${i.code}: ${i.message}`)
if (by('error').length) { for (const i of by('error').slice(0, 20)) console.error(`  error ${i.code}: ${i.message}`); die('source data breaks an invariant the app relies on (see above)') }

mkdirSync(OUT, { recursive: true })
const analytics = Object.fromEntries(ANALYTICS_KEYS.map(k => [k, ops[k]]))
const opsCore = Object.fromEntries(Object.entries(ops).filter(([k]) => !ANALYTICS_KEYS.includes(k)))
const files = { 'catalogue.json': base, 'operations.json': opsCore, 'analytics.json': analytics }
const generated = {}
for (const [name, value] of Object.entries(files)) {
  const text = JSON.stringify(value)
  writeFileSync(join(OUT, name), text)
  generated[name] = { sha256: sha(Buffer.from(text)), bytes: Buffer.byteLength(text) }
}
const counts = o => Object.fromEntries(Object.entries(o).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]))
const manifest = {
  dataset_id: ops.metadata.dataset_id, snapshot: ops.metadata.snapshot,
  generated_by: 'tools/marketplace/build.mjs',
  sources: Object.fromEntries(Object.entries(raw).map(([file, r]) => [file, { sha256: r.hash, bytes: r.bytes, records: counts(r.json) }])),
  expected_counts: EXPECTED_COUNTS, generated,
  validator: { errors: by('error').length, conflicts: tally('conflict'), gaps: tally('gap') },
}
writeFileSync(join(OUT, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`data:build ok: ${Object.entries(generated).map(([n, g]) => `${n} ${g.bytes} B`).join(', ')}`)
