// Executes all 114 scenario groups against the real engine (Node strips the TypeScript types; no browser). Exits non-zero on any failure.
// Fixture facts are synthetic: this proves the scripted behaviour, not any real Product or Seller.
import { readFileSync } from 'node:fs'
import { runCoverage, summary, makeFixture, FIXTURE_SELLER } from '../../src/chatbot/coverage.ts'
import { respond } from '../../src/chatbot/engine.ts'
import { feedbackWorkflowChecks } from '../../src/chatbot/feedback.ts'

const all = JSON.parse(readFileSync('src/demo-data/taxonomy-attributes.json', 'utf8'))
const labels = Object.fromEntries(Object.entries(all).map(([leaf, attrs]) => [leaf, attrs.map(a => a.name)]))
const rows = runCoverage(labels)
let bad = 0
for (const r of rows) {
  const ok = r.how === 'ui' || (!r.failures.length && r.passed === r.steps)
  if (!ok) { bad++; console.log(`FAIL ${r.id} ${r.title} (p.${r.page}): ${r.passed}/${r.steps}`); r.failures.slice(0, 4).forEach(f => console.log('   ' + f.slice(0, 600))) }
}
const s = summary(rows)
console.log(`COVERAGE ${s.engine} engine-run groups: ${s.passing} passing, ${s.failing} failing; ${s.stepsPassed}/${s.steps} steps (the 114th group, C-22, is the feedback workflow below)`)
const sample = respond({ messageId: 'wf', conversationSellerId: FIXTURE_SELLER, text: 'How much is this one?', subject: { sellerId: FIXTURE_SELLER, productId: 'PA' } }, { mode: 'bot' }, makeFixture(labels).world)
const wf = feedbackWorkflowChecks(sample)
wf.failures.forEach(f => console.log('FAIL C-22 ' + f))
console.log(`C-22 FEEDBACK WORKFLOW (separate from the engine groups): ${wf.passed}/${wf.steps} checks`)
process.exitCode = bad || wf.failures.length || s.groups !== 114 || s.engine !== 113 ? 1 : 0
