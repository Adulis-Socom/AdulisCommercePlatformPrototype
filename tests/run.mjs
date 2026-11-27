// Runs every tests/*.test.mjs against its own Vite server and writes raw logs plus a summary (tested SHA, exit codes).
// Usage: node tests/run.mjs [outDir] [filter]   (outDir defaults to tests/results/<timestamp>, which is gitignored)
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync, createWriteStream } from 'node:fs'
import { join } from 'node:path'

const git = a => spawnSync('git', a, { encoding: 'utf8' }).stdout.trim()
const outDir = process.argv[2] || join('tests', 'results', new Date().toISOString().replace(/[:.]/g, '-'))
const filter = process.argv[3] || ''
const PORT = process.env.TEST_PORT || '8450'
mkdirSync(outDir, { recursive: true })

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], { env: { ...process.env, PORT, FIGMA_DEV_SERVER_HOST: '127.0.0.1' }, stdio: 'ignore' })
const url = `http://127.0.0.1:${PORT}/`
for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) break } catch {} await new Promise(r => setTimeout(r, 500)) }

const results = []
const attempt = (file, tag) => new Promise(res => {
  const log = createWriteStream(join(outDir, file.replace('.mjs', `${tag}.log`)))
  const p = spawn(process.execPath, [join('tests', file)], { env: { ...process.env, APP_URL: url, TEST_EVIDENCE: join(outDir, 'evidence', file.replace('.test.mjs', '')) } })
  p.stdout.pipe(log, { end: false }); p.stderr.pipe(log, { end: false }); p.on('close', c => { log.end(); res(c) })
})
for (const file of readdirSync('tests').filter(f => f.endsWith('.test.mjs') && f.includes(filter)).sort()) {
  // A failure is retried once and BOTH attempts are recorded, so a flaky browser run is visible, never hidden.
  const first = await attempt(file, '')
  const retry = first === 0 ? null : await attempt(file, '.retry')
  results.push({ file, exit: retry ?? first, first_attempt_exit: first, retried: retry !== null })
  console.log(`${(retry ?? first) === 0 ? 'ok  ' : 'FAIL'} ${file} (exit ${retry ?? first}${retry !== null ? `; first attempt ${first}` : ''})`)
}
server.kill()
const summary = { sha: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain']) !== '', node: process.version, results }
writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2))
const failed = results.filter(r => r.exit !== 0).length
console.log(`${results.length - failed}/${results.length} suites passed; summary: ${join(outDir, 'summary.json')}`)
process.exit(failed ? 1 : 0)
