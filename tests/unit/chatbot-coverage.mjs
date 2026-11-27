// Executes all 114 scenario groups against the real engine (Node strips the TypeScript types; no browser). Exits non-zero on any failure.
// Fixture facts are synthetic: this proves the scripted behaviour, not any real Product or Seller.
import { readFileSync } from 'node:fs'
import { runCoverage, summary } from '../../src/chatbot/coverage.ts'

const all = JSON.parse(readFileSync('src/demo-data/taxonomy-attributes.json', 'utf8'))
const labels = Object.fromEntries(Object.entries(all).map(([leaf, attrs]) => [leaf, attrs.map(a => a.name)]))
const rows = runCoverage(labels)
let bad = 0
for (const r of rows) {
  const ok = r.how === 'ui' || (!r.failures.length && r.passed === r.steps)
  if (!ok) { bad++; console.log(`FAIL ${r.id} ${r.title} (p.${r.page}): ${r.passed}/${r.steps}`); r.failures.slice(0, 4).forEach(f => console.log('   ' + f.slice(0, 600))) }
}
const s = summary(rows)
console.log(`COVERAGE ${s.groups} groups (${s.engine} executed by the engine, ${s.ui} verified in the browser): ${s.passing} passing, ${s.failing} failing; ${s.stepsPassed}/${s.steps} steps`)
process.exitCode = bad || s.groups !== 114 ? 1 : 0
