// Runs every tests/*.test.mjs against its own Vite server and writes raw logs plus a summary (tested SHA, exit codes).
// Usage: node tests/run.mjs [outDir] [filter]   (outDir defaults to tests/results/<timestamp>, which is gitignored)
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync, readFileSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'

const git = a => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim()
const outDir = process.argv[2] || join('tests', 'results', new Date().toISOString().replace(/[:.]/g, '-'))
const filter = process.argv[3] || ''
const PORT = process.env.TEST_PORT || '8450'
mkdirSync(outDir, { recursive: true })

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { env: { ...process.env, PORT, FIGMA_DEV_SERVER_HOST: '127.0.0.1' }, stdio: 'ignore' })
const url = `http://127.0.0.1:${PORT}/`
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await new Promise(r => setTimeout(r, 500)) }

// tests/suites.json: how many viewport runs each file must complete. A file that stops early (or silently skips a run) fails.
const EXPECTED = JSON.parse(readFileSync(join('tests', 'suites.json'), 'utf8'))
const results = []
const count = (log, re) => [...log.matchAll(re)].reduce((a, m) => a + Number(m[1]), 0)
function inspect(file, code) {
  const log = readFileSync(join(outDir, file.replace('.mjs', code.tag + '.log')), 'utf8')
  const ends = (log.match(/^SUITE-END /gm) || []).length
  const want = typeof EXPECTED[file] === 'object' ? EXPECTED[file].runs : EXPECTED[file]
  return { exit: code.exit, runs: ends, expected_runs: want ?? null, passed: count(log, /^SUITE-END .*?: (\d+) passed/gm), failed: count(log, /^SUITE-END .*?, (\d+) failed/gm), known_gaps: count(log, /^SUITE-END .*?, (\d+) known gaps/gm),
    problem: want === undefined ? 'not listed in tests/suites.json' : ends !== want ? `completed ${ends} of ${want} expected runs` : null }
}
const attempt = (file, tag) => new Promise(res => {
  const log = createWriteStream(join(outDir, file.replace('.mjs', `${tag}.log`)))
  const p = spawn(process.execPath, [join('tests', file)], { env: { ...process.env, APP_URL: url, TEST_EVIDENCE: join(outDir, 'evidence', file.replace('.test.mjs', '')) } })
  p.stdout.pipe(log, { end: false }); p.stderr.pipe(log, { end: false }); p.on('close', c => { log.end(); res(c) })
})
for (const file of readdirSync('tests').filter(f => f.endsWith('.test.mjs') && filter.split(',').some(x => f.includes(x))).sort()) {
  // A failure is retried once and BOTH attempts are recorded, so a flaky browser run is visible, never hidden.
  const good = i => i.exit === 0 && !i.problem
  const first = inspect(file, { exit: await attempt(file, ''), tag: '' })
  const retry = good(first) ? null : inspect(file, { exit: await attempt(file, '.retry'), tag: '.retry' })
  const fin = retry ?? first
  results.push({ file, ok: good(fin), ...fin, first_attempt: retry ? first : undefined, retried: retry !== null })
  console.log(`${good(fin) ? 'ok  ' : 'FAIL'} ${file} (exit ${fin.exit}; ${fin.runs}/${fin.expected_runs} runs; ${fin.passed} passed, ${fin.failed} failed, ${fin.known_gaps} known gaps${fin.problem ? '; ' + fin.problem : ''}${retry ? '; first attempt failed' : ''})`)
}
server.kill()
const failed = results.filter(r => !r.ok).length
const sum = k => results.reduce((a, r) => a + r[k], 0)
const summary = { sha: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain', '--', '.', ':!tests/results']) !== '', node: process.version, totals: { suites: results.length, failed, runs: sum('runs'), passed: sum('passed'), failed_checks: sum('failed'), known_gaps: sum('known_gaps') }, results }
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(`${results.length - failed}/${results.length} suites ok; ${sum('runs')} viewport runs, ${sum('passed')} checks passed, ${sum('failed')} failed, ${sum('known_gaps')} known gaps; summary: ${join(outDir, 'summary.json')}`)
process.exit(failed ? 1 : 0)
