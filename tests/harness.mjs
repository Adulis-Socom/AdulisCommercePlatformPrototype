// Browser test helper (QA-001A). Playwright drives the installed Microsoft Edge (no browser download); the version is pinned in
// pnpm-lock.yaml. A failed check, an unexpected page/console error or a crash makes the process exit non-zero.
import { chromium } from 'playwright-core'

export const BASE = process.env.APP_URL || 'http://127.0.0.1:8443/'
const ALLOWED = new Set(['127.0.0.1', 'localhost', 'fonts.googleapis.com', 'fonts.gstatic.com', 'images.unsplash.com'])

/** Run one suite: `await suite('name', {width, height}, async (page, t) => { ... })`. */
export async function suite(name, viewport, fn) {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await (await browser.newContext({ viewport })).newPage()
  const errors = []
  const requests = []
  const expectedErrors = []
  await page.route('**/*', r => { const u = new URL(r.request().url()); requests.push(u.host); return ALLOWED.has(u.hostname) ? r.continue() : r.abort() })
  page.on('pageerror', e => errors.push(String(e)))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()) })
  let pass = 0, fail = 0, crashed = false
  const t = {
    page, requests, errors,
    /** Declare a console error the test provokes on purpose; an unlisted error fails the suite. */
    expectError: pattern => expectedErrors.push(pattern),
    open: async (path = '') => { await page.goto(BASE + path, { waitUntil: 'networkidle' }); await page.waitForTimeout(300) },
    section: async label => { await page.getByRole('button', { name: label }).first().click(); await page.waitForTimeout(350) },
    settle: (ms = 250) => page.waitForTimeout(ms),
    ck(label, ok, detail) {
      console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${!ok && detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : ''}`)
      ok ? pass++ : fail++
    },
    /**
     * A limitation that is documented and not yet built. It passes while the gap exists; when the gap closes it FAILS, so the
     * assertion is promoted to a real check instead of silently accepting absence forever.
     */
    knownGap(label, stillPresent, detail) {
      console.log(`${stillPresent ? 'KNOWN-GAP' : 'FAIL'} ${label}${stillPresent ? '' : ' — the gap is closed: replace this with a real check'}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 200) : ''}`)
      stillPresent ? pass++ : fail++
    },
    /** Assert `actual === expected` and show both on failure. */
    eq: (label, actual, expected) => t.ck(label, Object.is(actual, expected), { actual, expected }),
  }
  try { await fn(page, t) } catch (e) { crashed = true; console.log(`CRASH ${name}: ${e?.stack || e}`) }
  const unexpected = errors.filter(e => !expectedErrors.some(p => (p instanceof RegExp ? p.test(e) : e.includes(p))))
  unexpected.slice(0, 5).forEach(e => console.log('  unexpected browser error:', e.slice(0, 240)))
  console.log(`SUITE ${name}: ${pass} passed, ${fail} failed, ${unexpected.length} unexpected errors${crashed ? ', CRASHED' : ''}`)
  await browser.close()
  process.exit(fail || unexpected.length || crashed ? 1 : 0)
}
