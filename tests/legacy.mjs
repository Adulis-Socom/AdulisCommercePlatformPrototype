// Adapter for the PROTO-OVERNIGHT-001 suites (ported to tests/*.test.mjs): the old `run(viewport, (page, h) => ...)` API on top of
// the strict harness, so a failed check, an unexpected browser error or a crash now exits non-zero.
import { suite, BASE } from './harness.mjs'
import { mkdirSync } from 'node:fs'

export const EVIDENCE = process.env.TEST_EVIDENCE || process.argv[2] || 'tests/results/evidence'
mkdirSync(EVIDENCE, { recursive: true })
export const run = (viewport, fn) =>
  suite(process.argv[1].split(/[\\/]/).pop().replace('.test.mjs', ''), viewport, (page, t) =>
    fn(page, { BASE, requests: t.requests, errors: t.errors, open: t.open, section: t.section, settle: t.settle, ck: t.ck, eq: t.eq, knownGap: t.knownGap, shot: (file, opts = {}) => page.screenshot({ path: file, ...opts }) }))
