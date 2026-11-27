// Browser test helper (QA-001A). Playwright drives the installed Microsoft Edge (no browser download); the version is pinned in
// pnpm-lock.yaml. A failed check, an unexpected page/console error or a crash makes the process exit non-zero.
import { chromium } from 'playwright-core'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

export const BASE = process.env.APP_URL || 'http://127.0.0.1:8443/'
const ALLOWED = new Set(['127.0.0.1', 'localhost', 'fonts.googleapis.com', 'fonts.gstatic.com', 'images.unsplash.com'])

// DEMO-001: the app boots on the marketplace dataset by default. The 36 earlier suites were written against the historical seeded ids, so every suite
// opens `?dataset=legacy` unless tests/suites.json marks it `{ "runs": n, "dataset": "marketplace" }` (TEST_DATASET overrides, for one-off runs).
const listed = (() => { try { return JSON.parse(readFileSync(new URL('./suites.json', import.meta.url), 'utf8'))[basename(process.argv[1] ?? '')] } catch { return undefined } })()
export const DATASET = process.env.TEST_DATASET || (typeof listed === 'object' && listed?.dataset) || 'legacy'
const withDataset = path => (DATASET === 'legacy' ? `${path}${path.includes('?') ? '&' : '?'}dataset=legacy` : path)

const git = a => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim()
export const TESTED_SHA = git(['rev-parse', 'HEAD'])
export const TESTED_DIRTY = git(['status', '--porcelain', '--', '.', ':!tests/results']) !== ''

// Lifecycle (QA-FIX-01). `suite()` NEVER terminates the process: it queues the run and returns its result. Runs are serialised in call
// order, so several un-awaited `run(...)` calls in one file all complete (and never interleave their output). The exit status is
// computed exactly once, in `beforeExit`, after every queued run has finished.
const results = []
let started = 0
let chain = Promise.resolve()
let finalised = false

/** Run one suite: `await suite('name', {width, height}, async (page, t) => { ... })`. Resolves to its result object. */
export function suite(name, viewport, fn) {
  started++
  const p = chain.then(() => runOne(name, viewport, fn))
  chain = p.catch(() => {})
  return p
}

async function runOne(name, viewport, fn) {
  const label = `${name} @${viewport.width}x${viewport.height}`
  console.log(`SUITE-START ${label} commit ${TESTED_SHA.slice(0, 12)}${TESTED_DIRTY ? ' (dirty tree)' : ''} base ${BASE} dataset ${DATASET}`)
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await (await browser.newContext({ viewport })).newPage()
  const errors = []
  const requests = []
  const expectedErrors = []
  await page.route('**/*', r => { const u = new URL(r.request().url()); requests.push(u.host); return ALLOWED.has(u.hostname) ? r.continue() : r.abort() })
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()) })
  let pass = 0, fail = 0, gaps = 0, crashed = false
  const t = {
    page, requests, errors,
    /** Declare a console error the test provokes on purpose; an unlisted error fails the suite. */
    expectError: pattern => expectedErrors.push(pattern),
    open: async (path = '') => { await page.goto(BASE + withDataset(path), { waitUntil: 'networkidle' }); await page.waitForTimeout(300) },
    section: async label => { await page.getByRole('button', { name: label }).first().click(); await page.waitForTimeout(350) },
    settle: (ms = 250) => page.waitForTimeout(ms),
    ck(label, ok, detail) {
      console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${!ok && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`)
      ok ? pass++ : fail++
    },
    /**
     * A limitation that is documented and not yet built. It is reported SEPARATELY from passed assertions. While the gap exists it
     * does not fail the suite; when the gap closes it FAILS, so the assertion is promoted to a real check.
     */
    knownGap(label, stillPresent, detail) {
      console.log(`${stillPresent ? 'KNOWN-GAP' : 'FAIL'} ${label}${stillPresent ? '' : ' — the gap is closed: replace this with a real check'}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 200) : ''}`)
      stillPresent ? gaps++ : fail++
    },
    /** Assert `actual === expected` and show both on failure. */
    eq: (label, actual, expected) => t.ck(label, Object.is(actual, expected), { actual, expected }),
  }
  try { await fn(page, t) } catch (e) { crashed = true; console.log(`CRASH ${name}: ${e?.stack || e}`) }
  const unexpected = errors.filter(e => !expectedErrors.some(p => (p instanceof RegExp ? p.test(e) : e.includes(p))))
  unexpected.slice(0, 5).forEach(e => console.log('  unexpected browser error:', e.slice(0, 240)))
  const zero = pass + fail === 0 // a suite that asserted nothing proves nothing
  if (zero) console.log(`FAIL ${label}: zero assertions ran`)
  await browser.close().catch(() => {})
  const ok = !fail && !unexpected.length && !crashed && !zero
  const r = { name, viewport, pass, fail, gaps, unexpected: unexpected.length, crashed, zero, ok }
  results.push(r)
  console.log(`SUITE-END ${label}: ${pass} passed, ${fail} failed, ${gaps} known gaps, ${unexpected.length} unexpected errors${crashed ? ', CRASHED' : ''}${zero ? ', ZERO ASSERTIONS' : ''} => ${ok ? 'OK' : 'FAILED'}`)
  return r
}

process.on('beforeExit', () => {
  if (finalised) return
  finalised = true
  const sum = k => results.reduce((a, r) => a + r[k], 0)
  const incomplete = started !== results.length || started === 0
  const failed = results.filter(r => !r.ok).length
  console.log(`RESULT commit ${TESTED_SHA}${TESTED_DIRTY ? ' (dirty tree)' : ''}: ${results.length}/${started} runs completed, ${results.length - failed} ok, ${failed} failed; ${sum('pass')} passed, ${sum('fail')} failed, ${sum('gaps')} known gaps, ${sum('unexpected')} unexpected errors${incomplete ? '; INCOMPLETE' : ''}`)
  process.exitCode = failed || incomplete ? 1 : 0
})
