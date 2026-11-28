// PROTO-BGR-RESEARCH-001: the Background Removal Lab driven against the REAL local adapter and the REAL admitted models. NO mock of any kind.
//
// NOT part of `pnpm test` and deliberately NOT listed in tests/suites.json: it needs a running adapter, admitted checkpoints promoted on this
// machine, and several GB of free RAM, so it cannot run in the unattended suite. It SKIPS with a message (exit 0) when the adapter, the token or
// a ready model is missing. Never use it as proof of quality: it asserts the Lab's behaviour (selection, sequential comparison, inspection,
// manual scoring controls, downloads, CSV/JSON exports, 30-photo run) with genuine model output; it computes no quality score.
//
// How to run (three terminals, repo root; see tools/bg-removal/README.md):
//   1.  cd tools/bg-removal && set ADAPTER_TOKEN=<any token you choose>  &&  .venv\Scripts\python adapter.py      (or let it print its own token)
//   2.  set FIGMA_DEV_SERVER_HOST=127.0.0.1 && set PORT=8443 && pnpm dev       (the adapter only accepts the ports 8443, 5173 and 4173)
//   3.  set BGR_ADAPTER_TOKEN=<that token> && set APP_URL=http://127.0.0.1:8443/ && node tests/bgr-real.test.mjs
// Optional: BGR_EVIDENCE_DIR (where screenshots, downloads and exports are kept, default a temp folder), BGR_ADAPTER_URL, BGR_SKIP_30=1.
import { suite, BASE } from './harness.mjs'
import { readFileSync, mkdirSync, copyFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

const ADAPTER = process.env.BGR_ADAPTER_URL ?? 'http://127.0.0.1:8765'
const TOKEN = process.env.BGR_ADAPTER_TOKEN
const EVIDENCE = process.env.BGR_EVIDENCE_DIR ?? mkdtempSync(join(tmpdir(), 'bgr-real-'))
const FIXTURES = 'tools/bg-removal/fixtures/synthetic'
const REGISTRY = JSON.parse(readFileSync('tools/bg-removal/models.json', 'utf8')).models
const sha = buf => createHash('sha256').update(buf).digest('hex')
const skip = why => { console.log(`SKIP bgr-real: ${why}`); process.exit(0) }

if (!TOKEN) skip('set BGR_ADAPTER_TOKEN to the token the adapter printed (or to the ADAPTER_TOKEN you started it with)')
let catalogue
try { catalogue = await (await fetch(`${ADAPTER}/catalogue`)).json() } catch { skip(`no adapter is answering at ${ADAPTER} (start it first; see the header of this file)`) }
const ready = catalogue.models.filter(m => m.ready && !m.custom)
if (!ready.length) skip(`the adapter is running but no admitted model is installed and ready (free RAM ${catalogue.runtime?.freeRamMb} MB). Promote one from quarantine (README).`)
mkdirSync(EVIDENCE, { recursive: true })
const autos = ready.filter(m => m.id !== 'sam')
const sam = ready.find(m => m.id === 'sam')
const pair = [autos[0], sam ?? autos[1]].filter(Boolean)
const index = JSON.parse(readFileSync(`${FIXTURES}/index.json`, 'utf8'))
const bottle = index.find(i => i.name === 'bottle'), mug = index.find(i => i.name === 'mug')
console.log(`bgr-real: adapter ${ADAPTER}, ready models: ${ready.map(m => m.id).join(', ')}; comparison pair: ${pair.map(m => m.id).join(' vs ')}; evidence -> ${EVIDENCE}`)

const openLab = async (page, t) => {
  await t.open(); await t.section('Prototype Guide'); await page.getByRole('button', { name: 'Open the Background Removal Lab' }).click(); await t.settle(600)
  await page.getByPlaceholder('Paste the token the adapter printed').fill(TOKEN)
  await page.getByRole('button', { name: 'check again' }).click({ timeout: 2000 }).catch(() => {})
  await page.waitForFunction(() => /Local adapter connected/.test(document.body.innerText), null, { timeout: 30000 })
}
const doneCount = page => page.getByRole('listitem').filter({ hasText: /Done/ }).filter({ has: page.getByRole('button', { name: 'Compare' }) }).count()
const waitRows = (page, n, ms) => page.waitForFunction(n => {
  const rows = [...document.querySelectorAll('section[aria-label="Results"] ul li')].filter(li => /Done|Failed/.test(li.innerText))
  return rows.length >= n && !/Running…|Queued/.test(document.querySelector('section[aria-label="Results"] ul')?.innerText ?? '')
}, n, { timeout: ms })
const rowsText = page => page.locator('section[aria-label="Results"] ul li').allInnerTexts()
const download = async (page, click, name) => { const d = page.waitForEvent('download'); await click(); const file = await d; const target = join(EVIDENCE, name); await file.saveAs(target); return target }

await suite('bgr-real: compare two admitted models on the same photographs, inspect, score, download, export', { width: 1440, height: 900 }, async (page, t) => {
  await openLab(page, t)
  t.eq('the adapter admits exactly the models the registry admits', catalogue.models.filter(m => m.admitted).map(m => m.id).sort().join(','), Object.entries(REGISTRY).filter(([, e]) => e.status === 'admitted').map(([k]) => k).sort().join(','))
  // The adapter re-checks free RAM for every catalogue read; a model is selectable only while the machine can load it. Re-read it a few times before judging.
  const selectable = async m => {
    for (let attempt = 0; attempt < 18; attempt++) {
      if (await page.getByRole('checkbox', { name: `Select ${m.label}` }).isEnabled()) return true
      console.log(`  waiting for free RAM (attempt ${attempt + 1}): ${m.id} is not selectable`)
      await t.settle(10000); await page.getByRole('button', { name: 'Unload models' }).click().catch(() => {}); await t.settle(1500)
    }
    return false
  }
  t.eq(`model selection: ${pair[0].label} can be selected`, await selectable(pair[0]), true)
  t.ck('an unadmitted model (BRIA RMBG 2.0) stays disabled with the real adapter connected', await page.getByRole('checkbox', { name: 'Select BRIA RMBG 2.0' }).isDisabled())
  t.ck('no request left this computer', [...new Set(t.requests)].every(h => /^(127\.0\.0\.1|localhost)/.test(h) || /fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com/.test(h)))
  t.ck('at least two models are ready, so a comparison is possible (free RAM decides)', pair.length === 2, { ready: ready.map(m => m.id), freeRamMb: catalogue.runtime?.freeRamMb })
  if (pair.length < 2) return

  const files = [bottle, mug].map(i => `${FIXTURES}/${i.file}`)
  await page.locator('input[type=file]').first().setInputFiles(files); await t.settle(900)
  t.ck('both synthetic photographs were added with their dimensions', /bottle\.jpg/.test(await page.locator('body').innerText()) && /1024×1024/.test(await page.locator('body').innerText()) && /1600×1200/.test(await page.locator('body').innerText()))
  const placePoints = async () => {
    for (const i of [bottle, mug]) {  // the foreground point is the generator's subject centre, never a model's output
      await page.getByRole('button', { name: `Show original: ${i.file}` }).click(); await t.settle(200)
      const img = page.getByRole('img', { name: /^Place points on/ }); const box = await img.boundingBox()
      await img.click({ position: { x: (i.subjectCentre[0] / i.width) * box.width, y: (i.subjectCentre[1] / i.height) * box.height } }); await t.settle(200)
    }
  }
  await page.getByRole('checkbox', { name: `Select ${pair[0].label}` }).check()
  if (pair[0].id === 'sam') await placePoints()
  await page.getByLabel(/Time a warm run/).check()
  await page.screenshot({ path: join(EVIDENCE, '01-lab-ready-to-run.png') })
  const start = Date.now()
  await page.getByRole('button', { name: /^Run/ }).click()
  await waitRows(page, 2, 1_200_000)
  // Second model on the SAME photographs. Selecting both in one run is refused for RAM while the first stays loaded (the adapter checks free RAM before it
  // evicts the resident model; finding recorded in BUG_REGISTER / FOUNDER_DECISION_REGISTER, not changed here), so the Lab's own "Unload models" is used between.
  await page.getByRole('button', { name: 'Unload models' }).click(); await t.settle(2000)
  await page.getByRole('checkbox', { name: `Select ${pair[0].label}` }).uncheck()
  t.eq(`model selection: ${pair[1].label} can be selected after the first model was unloaded`, await selectable(pair[1]), true)
  await page.getByRole('checkbox', { name: `Select ${pair[1].label}` }).check()
  if (pair[1].id === 'sam') await placePoints()
  await page.getByRole('button', { name: /^Run/ }).click()
  await waitRows(page, 4, 1_200_000)
  const rows = await rowsText(page)
  const seconds = Math.round((Date.now() - start) / 1000)
  t.eq('four real runs finished (2 photographs x 2 models)', rows.filter(r => /Done/.test(r)).length, 4)
  console.log(`  4 runs took ${seconds} s wall clock including model swaps and warm repeats`)
  rows.filter(r => /Failed/.test(r)).forEach(r => console.log('  FAILED ROW:', r.replace(/\n/g, ' | ')))
  t.ck('runs were sequential and every row shows real timings and memory', rows.every(r => /ms/.test(r) && /peak \d+ MB/.test(r)), rows)
  await page.screenshot({ path: join(EVIDENCE, '02-lab-four-runs-done.png'), fullPage: true })

  // inspection of each model's result on the first photograph
  await page.getByRole('button', { name: 'Compare' }).first().click(); await t.settle(400)
  t.ck('original and the model result are shown side by side', await page.getByRole('img', { name: /^Original: bottle\.jpg/ }).count() >= 1 && await page.getByRole('img', { name: /result for bottle\.jpg/ }).count() >= 1)
  for (const b of ['Transparent', 'White', 'Grey', 'Black', 'Edge check']) { await page.getByRole('radio', { name: b, exact: true }).click(); await t.settle(100) }
  t.eq('backdrop choice applies', await page.getByRole('radio', { name: 'Edge check', exact: true }).getAttribute('aria-checked'), 'true')
  await page.screenshot({ path: join(EVIDENCE, '03-inspect-edge-check.png') })
  await page.getByLabel('Zoom percent').fill('200'); await t.settle(150)
  await page.getByLabel('Original resolution').check(); await t.settle(200)
  t.ck('original resolution shows the pixels 1:1', /1:1/.test(await page.locator('body').innerText()))
  await page.getByLabel('Original resolution').uncheck()
  await page.getByLabel(/Show mask/).check(); await t.settle(2500)
  const maskStats = await page.getByRole('img', { name: /, mask$/ }).first().evaluate(async img => {
    await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data; let lo = 255, hi = 0; for (let i = 0; i < d.length; i += 4) { lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]) } return { lo, hi, w: c.width, h: c.height }
  })
  t.ck('the mask view is the real alpha channel: it contains both transparent and opaque pixels', maskStats.lo === 0 && maskStats.hi === 255, maskStats)
  await page.screenshot({ path: join(EVIDENCE, '04-inspect-mask.png') })
  await page.getByLabel(/Show mask/).uncheck()

  // download of the cut-out PNG: a genuine RGBA image of the input's size with a non-trivial alpha (raw facts, not a score)
  const cutPath = await download(page, () => page.getByRole('link', { name: 'Download processed image' }).click(), 'lab-download-cutout-first-row.png')
  const bytes = readFileSync(cutPath)
  t.ck('the download is a PNG file', bytes.subarray(1, 4).toString() === 'PNG', cutPath)
  const png = await page.evaluate(async b64 => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob(); const bm = await createImageBitmap(blob)
    const c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; const x = c.getContext('2d'); x.drawImage(bm, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data; let lo = 255, hi = 0, sum = 0; for (let i = 3; i < d.length; i += 4) { lo = Math.min(lo, d[i]); hi = Math.max(hi, d[i]); sum += d[i] }
    return { w: c.width, h: c.height, alphaMin: lo, alphaMax: hi, coverage: sum / 255 / (d.length / 4) }
  }, bytes.toString('base64'))
  t.ck('the downloaded cut-out has the input size (1024x1024) and a non-trivial alpha channel (alpha coverage is a raw measurement, not a quality score)', png.w === 1024 && png.h === 1024 && png.alphaMin === 0 && png.alphaMax === 255, png)
  t.ck('the PNG header declares colour type 6 (RGBA)', bytes[25] === 6, bytes[25])

  // manual scoring controls (a HUMAN score; the Lab never computes one). Values below are test inputs, not an evaluation.
  const selects = page.getByRole('group', { name: /Manual quality score/ }).locator('select')
  for (let i = 0; i < 7; i++) await selects.nth(i).selectOption('4')
  t.ck('the manual rating controls set an overall that is the mean of the ratings', /Overall 4 \/ 5/.test(await page.locator('body').innerText()))
  await page.getByRole('radio', { name: 'Accept commercially' }).click()
  await page.getByRole('button', { name: 'Compare' }).nth(2).click(); await t.settle(300)
  for (let i = 0; i < 7; i++) await selects.nth(i).selectOption('2')
  await page.getByRole('radio', { name: 'Reject commercially' }).click()
  await page.screenshot({ path: join(EVIDENCE, '05-manual-scoring-controls.png') })

  // exports
  const jsonPath = await download(page, () => page.getByRole('button', { name: 'Export JSON' }).click(), 'lab-export.json')
  const csvPath = await download(page, () => page.getByRole('button', { name: 'Export CSV' }).click(), 'lab-export.csv')
  const exported = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const csv = readFileSync(csvPath, 'utf8').split('\n')
  const expectSha = id => REGISTRY[id].assets.map(a => a.pinnedSha256).join(' + ')
  t.eq('JSON export: one row per (photograph, model)', exported.rows.length, 4)
  t.eq('JSON export: the (photograph, model) pairs are unique', new Set(exported.rows.map(r => `${r.photo}|${r.model}`)).size, 4)
  t.ck('JSON export: input SHA-256 equals the file on disk, adapter agrees, output size equals input size',
    exported.rows.every(r => r.inputSha256 === sha(readFileSync(`${FIXTURES}/${r.photo}`)) && r.adapterAgreesOnInput === true && r.outputDimensions === r.inputDimensions && r.outputSha256?.length === 64), exported.rows.map(r => [r.photo, r.model, r.inputDimensions, r.outputDimensions]))
  t.ck('JSON export: checkpoint SHA-256 equals the pinned hash in the registry (real values, not placeholders)', exported.rows.every(r => r.checkpointSha256 === expectSha(r.model)), exported.rows.map(r => [r.model, r.checkpointSha256]))
  t.ck('JSON export: provider is the CPU', exported.rows.every(r => r.provider === 'CPUExecutionProvider'))
  const cold = exported.rows.filter(r => r.cold)
  t.ck('JSON export: cold rows carry cold load seconds, approximate model memory and the first-inference time as separate fields', cold.length >= 1 && cold.every(r => r.coldLoadSeconds > 0 && Number.isFinite(r.approxModelMemoryMb) && r.firstInferenceAfterLoadSeconds > 0 && r.warmInferenceSeconds > 0), cold.map(r => [r.model, r.coldLoadSeconds, r.approxModelMemoryMb, r.firstInferenceAfterLoadSeconds, r.warmInferenceSeconds]))
  t.ck('JSON export: the cumulative process peak and per-inference RSS change are present and labelled as cumulative', exported.rows.every(r => r.cumulativeProcessPeakMb > 0 && Number.isFinite(r.perInferenceRssDeltaMb) && /cumulative/.test(r.cumulativePeakScope)), exported.rows[0])
  t.ck('JSON export: the manual ratings are exported as entered and nothing else is a score', exported.rows.some(r => r.overall === 4) && exported.rows.some(r => r.overall === 2) && exported.rows.every(r => !Object.keys(r).some(k => /^(quality|qualityScore|score|autoScore)$/i.test(k))))
  t.ck('exports never contain the adapter token', !readFileSync(jsonPath, 'utf8').includes(TOKEN) && !readFileSync(csvPath, 'utf8').includes(TOKEN))
  t.eq('CSV export: a header and one line per (photograph, model)', csv.filter(Boolean).length, 5)
  const header = csv[0].split(',')
  t.ck('CSV export: the separated columns and the checkpoint hash are present', ['coldLoadSeconds', 'firstInferenceAfterLoadSeconds', 'warmInferenceSeconds', 'approxModelMemoryMb', 'perInferenceRssDeltaMb', 'cumulativeProcessPeakMb', 'checkpointSha256', 'inputSha256'].every(c => header.includes(c)), header)
  writeFileSync(join(EVIDENCE, 'lab-real-run-summary.json'), JSON.stringify({ pair: pair.map(m => m.id), wallSeconds: seconds, rows: exported.rows.map(r => ({ photo: r.photo, model: r.model, cold: r.cold, coldLoadSeconds: r.coldLoadSeconds, firstInferenceAfterLoadSeconds: r.firstInferenceAfterLoadSeconds, warmInferenceSeconds: r.warmInferenceSeconds, approxModelMemoryMb: r.approxModelMemoryMb, perInferenceRssDeltaMb: r.perInferenceRssDeltaMb, cumulativeProcessPeakMb: r.cumulativeProcessPeakMb, rssAfterRunMb: r.rssAfterRunMb })) }, null, 2))
})

if (!process.env.BGR_SKIP_30) {
  const model = [...ready].filter(m => m.id !== 'sam').sort((a, b) => (REGISTRY[a.id].resources?.diskMb ?? 1e9) - (REGISTRY[b.id].resources?.diskMb ?? 1e9))[0]
  const py = 'tools/bg-removal/.venv/Scripts/python.exe'
  const small = mkdtempSync(join(tmpdir(), 'bgr-small30-'))
  const made = existsSync(py) ? spawnSync(py, ['-I', 'tools/bg-removal/make_synthetic.py', '--out', join(small, 'big'), '--small30', small]) : { status: 1 }
  const photos = made.status === 0 ? readdirSync(small).filter(f => f.endsWith('.jpg')).sort() : []
  await suite(`bgr-real: 30 photographs, one admitted model (${model?.id}), sequentially, no leak`, { width: 1440, height: 900 }, async (page, t) => {
    t.eq('30 small synthetic photographs were generated locally', photos.length, 30)
    if (photos.length !== 30 || !model) return
    const unloadAdapter = () => fetch(`${ADAPTER}/unload`, { method: 'POST', headers: { 'X-Adulis-Token': TOKEN } }).catch(() => {})
    await unloadAdapter(); await t.settle(2000)  // the previous suite leaves a model resident; the Lab must read a catalogue taken after it was freed
    await openLab(page, t)
    const cdp = await page.context().newCDPSession(page)
    const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return Math.round((await cdp.send('Runtime.getHeapUsage')).usedSize / 1048576) }
    const adapterRss = async () => (await (await fetch(`${ADAPTER}/measurements`)).json())
    const before = { js: await heap(), adapter: await adapterRss() }
    await page.locator('input[type=file]').first().setInputFiles(photos.map(f => join(small, f))); await t.settle(2000)
    t.eq('all 30 photographs were accepted by the Lab', await page.getByRole('button', { name: /^Show original: small-/ }).count(), 30)
    for (let attempt = 0; attempt < 18 && !(await page.getByRole('checkbox', { name: `Select ${model.label}` }).isEnabled()); attempt++) {
      console.log(`  waiting for free RAM (attempt ${attempt + 1})`); await t.settle(10000); await page.getByRole('button', { name: 'Unload models' }).click().catch(() => {}); await t.settle(1500)
    }
    await page.getByRole('checkbox', { name: `Select ${model.label}` }).check()
    const start = Date.now()
    await page.getByRole('button', { name: /^Run/ }).click()
    await waitRows(page, 30, 1_800_000)
    const seconds = Math.round((Date.now() - start) / 1000)
    const rows = await rowsText(page)
    t.eq('30 runs finished, none failed', rows.filter(r => /Done/.test(r)).length, 30)
    rows.filter(r => /Failed/.test(r)).slice(0, 3).forEach(r => console.log('  FAILED ROW:', r.replace(/\n/g, ' | ')))
    const after = { js: await heap(), adapter: await adapterRss() }
    const jsonPath = await download(page, () => page.getByRole('button', { name: 'Export JSON' }).click(), 'lab-30-export.json')
    const csvPath = await download(page, () => page.getByRole('button', { name: 'Export CSV' }).click(), 'lab-30-export.csv')
    const exported = JSON.parse(readFileSync(jsonPath, 'utf8'))
    t.eq('JSON export: exactly one row per (image, model): 30 rows', exported.rows.length, 30)
    t.eq('JSON export: 30 distinct images, one model', [new Set(exported.rows.map(r => r.photo)).size, new Set(exported.rows.map(r => r.model)).size].join('/'), '30/1')
    t.eq('JSON export: the (image, model) pairs are unique', new Set(exported.rows.map(r => `${r.photo}|${r.model}`)).size, 30)
    t.eq('CSV export: a header and 30 lines', readFileSync(csvPath, 'utf8').split('\n').filter(Boolean).length, 31)
    t.ck('every row was inferred by the real model on the CPU with the pinned checkpoint hash', exported.rows.every(r => r.provider === 'CPUExecutionProvider' && r.checkpointSha256 === REGISTRY[model.id].assets.map(a => a.pinnedSha256).join(' + ') && r.outputDimensions === r.inputDimensions))
    // leak checks: the adapter's resident memory after run 5 vs after run 30 (same model, same input sizes), and the tab's JS heap
    const rss = exported.rows.map(r => r.rssAfterRunMb)
    const settled = rss[4], last = rss[29]
    t.ck('adapter memory does not climb run after run (RSS after run 30 within 400 MB of RSS after run 5)', last - settled < 400, { rssAfterRun5: settled, rssAfterRun30: last, all: rss })
    t.ck('the browser tab JS heap does not balloon (growth under 150 MB over the 30 runs)', after.js - before.js < 150, { before: before.js, after: after.js })
    t.ck('inference counter on the adapter advanced once per run', exported.rows[29].inferenceIndexSinceLoad === 30, exported.rows.map(r => r.inferenceIndexSinceLoad))
    writeFileSync(join(EVIDENCE, 'lab-30-summary.json'), JSON.stringify({ model: model.id, wallSeconds: seconds, secondsPerImage: +(seconds / 30).toFixed(1), jsHeapMb: { before: before.js, after: after.js }, adapterBefore: before.adapter, adapterAfter: after.adapter, rssAfterRunMb: rss, perInferenceRssDeltaMb: exported.rows.map(r => r.perInferenceRssDeltaMb) }, null, 2))
    console.log(`  30 images: ${seconds} s; adapter RSS before ${before.adapter.rssMb} MB, after ${after.adapter.rssMb} MB; JS heap ${before.js} -> ${after.js} MB`)
    await page.screenshot({ path: join(EVIDENCE, '06-lab-30-photographs-done.png') })
  })
}
