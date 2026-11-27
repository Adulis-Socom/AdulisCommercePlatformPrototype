// BGR-017/018: the Background Removal Lab.
// Part 1 runs against NO adapter (the real situation today): every model is visible, none can run.
// Part 2 runs against a MOCKED adapter (Playwright answers http://127.0.0.1:8765): it proves the Lab's own behaviour (sequential runs,
// settings, failure isolation, cancel, inspection, scoring, export). It says nothing about any model's quality, and these runs are NOT inference.
import { suite } from './harness.mjs'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'

const CATALOGUE = JSON.parse(readFileSync('src/lab/model-catalogue.json', 'utf8'))
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]) }
function makePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 4 + 1); raw[o] = 0; rgba(x, y).forEach((v, i) => { raw[o + 1 + x * 4 + i] = v }) }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const photoPath = join(mkdtempSync(join(tmpdir(), 'lab-')), 'shirt.png')
writeFileSync(photoPath, makePng(60, 40, () => [180, 90, 40, 255]))
const cutout = makePng(60, 40, (x) => (x < 30 ? [180, 90, 40, 255] : [180, 90, 40, 0])) // left half opaque, right half transparent

await suite('lab', { width: 1440, height: 900 }, async (page, t) => {
  const openLab = async () => { await t.open(); await t.section('Prototype Guide'); await page.getByRole('button', { name: 'Open the Background Removal Lab' }).click(); await t.settle(600) }
  const body = () => page.locator('body').innerText()

  // ---------- Part 1: no adapter ----------
  await openLab()
  let text = await body()
  t.ck('Lab opens from the Prototype Guide', /Background Removal Lab/i.test(text) && /Experimental tool/i.test(text))
  for (const g of ['General', 'Lightweight', 'High detail', 'Specialised', 'Interactive', 'Custom checkpoint', 'External service']) t.ck(`group "${g}" is listed`, new RegExp(g).test(text))
  t.eq('all 23 registered sessions are shown', await page.getByRole('listitem').filter({ has: page.getByRole('checkbox', { name: /^Select / }) }).count(), CATALOGUE.models.length)
  t.eq('no model can be selected', await page.getByRole('checkbox', { name: /^Select / }).evaluateAll(els => els.filter(e => !e.disabled).length), 0)
  t.ck('the page says nothing can be executed', /No model is cleared to run/.test(text))
  t.ck('a blocked model shows its reason and licence evidence', /Cannot run: Not admitted/.test(text) && (await page.locator('details summary').count()) === 23)
  t.ck('Bria is shown as restricted and the remote services as inactive', /BRIA RMBG 2.0[\s\S]*Blocked: licence restricted/.test(text) && /External: inactive/.test(text))
  t.eq('Run is disabled', await page.getByRole('button', { name: /^Run / }).count() === 0 || await page.getByRole('button', { name: /^Run / }).isDisabled(), true)
  const lanHosts = [...new Set(t.requests)].filter(h => !/^(127\.0\.0\.1|localhost)/.test(h) && !/fonts\.(googleapis|gstatic)\.com|images\.unsplash\.com/.test(h))
  t.eq('no request left this computer', lanHosts.length, 0)

  // ---------- Part 2: MOCKED adapter ----------
  const state = { inflight: 0, maxInflight: 0, calls: [], failOn: null, delay: 0, unloads: 0, loaded: new Set() }
  const admitted = new Set(['birefnet-general-lite', 'silueta', 'sam', 'u2net_cloth_seg'])
  const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-Model, X-Inference-Ms, X-Load-Ms, X-Peak-Rss-Mb, X-Rss-Mb, X-Provider, X-Input-Size, X-Cold, X-Input-Sha256, X-Output-Sha256, X-Output-Size, X-Checkpoint-Sha256, X-Load-Delta-Mb', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST' }
  await page.route('http://127.0.0.1:8765/**', async route => {
    const req = route.request(); const url = new URL(req.url())
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === '/catalogue') {
      const models = CATALOGUE.models.map(m => ({ ...m, status: admitted.has(m.id) ? 'admitted' : m.status, admitted: admitted.has(m.id), installed: admitted.has(m.id), loaded: false, ready: admitted.has(m.id), preflight: m.kind === 'local' ? { ok: true, freeRamMb: 9000, needRamMb: 1000 } : null }))
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ maxSessions: 1, models }) })
    }
    if (url.pathname === '/unload') { state.unloads++; return route.fulfill({ status: 200, headers: cors, body: '{}' }) }
    if (url.pathname === '/remove') {
      const model = url.searchParams.get('model'); state.calls.push(url.search); state.inflight++; state.maxInflight = Math.max(state.maxInflight, state.inflight)
      if (state.delay) await new Promise(r => setTimeout(r, state.delay))
      state.inflight--
      const cold = !state.loaded.has(model); state.loaded.add(model)
      if (state.failOn === model) return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Background removal failed.' }) })
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png', 'x-model': model, 'x-inference-ms': '123', 'x-load-ms': '456', 'x-peak-rss-mb': '789', 'x-rss-mb': '700', 'x-provider': 'CPUExecutionProvider', 'x-input-size': '60x40', 'x-cold': cold ? '1' : '0', 'x-input-sha256': createHash('sha256').update(req.postDataBuffer() ?? Buffer.alloc(0)).digest('hex'), 'x-output-sha256': createHash('sha256').update(cutout).digest('hex'), 'x-output-size': '60x40', 'x-checkpoint-sha256': 'ab'.repeat(32), 'x-load-delta-mb': cold ? '321' : '' }, body: cutout })
    }
    return route.fulfill({ status: 404, headers: cors, body: '{}' })
  })
  await page.getByRole('button', { name: 'check again' }).click(); await t.settle(600)
  text = await body()
  t.ck('[mock] connected adapter: 4 models selectable, the rest still blocked', await page.getByRole('checkbox', { name: /^Select / }).evaluateAll(els => els.filter(e => !e.disabled).length) === 4)
  t.ck('[mock] a model the adapter does not admit stays blocked', await page.getByRole('checkbox', { name: 'Select BRIA RMBG 2.0' }).isDisabled())
  await page.locator('input[type=file]').first().setInputFiles(photoPath); await t.settle(500)
  t.ck('photo added with its dimensions', /shirt\.png/.test(await body()) && /60×40/.test(await body()))
  // image validation (BGR-FIX-03): bad files are refused with a reason and never added
  await page.locator('input[type=file]').first().setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }); await t.settle(300)
  t.ck('an empty file is refused', /That file is empty/.test(await body()))
  await page.locator('input[type=file]').first().setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') }); await t.settle(300)
  t.ck('an unsupported type is refused', /Choose a JPEG, PNG or WebP photo/.test(await body()))
  await page.locator('input[type=file]').first().setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not really a png') }); await t.settle(500)
  t.ck('a file that is not an image is refused', /could not be read as an image/.test(await body()))
  t.ck('none of them was added as a photograph', !/empty.png|a.gif|broken.png/.test(await page.getByRole('region', { name: /Photos/ }).innerText().catch(() => '')) )
  await page.getByPlaceholder('Paste the token the adapter printed').fill('test-token')
  await page.getByRole('checkbox', { name: 'Select BiRefNet general lite (Swin-tiny)' }).check()
  await page.getByRole('checkbox', { name: 'Select Silueta' }).check()

  // settings: matting and mask-only are never combined
  await page.getByLabel(/Alpha matting/).check()
  t.eq('mask-only is disabled while alpha matting is on', await page.getByLabel(/Mask only/).isDisabled(), true)
  await page.getByLabel(/Alpha matting/).uncheck(); await page.getByLabel(/Mask only/).check()
  t.eq('alpha matting is disabled while mask-only is on', await page.getByLabel(/Alpha matting/).isDisabled(), true)
  await page.getByLabel(/Mask only/).uncheck()
  await page.getByLabel(/Alpha matting/).check()

  await page.getByRole('button', { name: /^Run comparison/ }).click(); await t.settle(1500)
  text = await body()
  t.eq('[mock] two runs finished', (text.match(/\nDone\n|Done/g) || []).length >= 2, true)
  t.eq('[mock] runs were sequential (never two requests at once)', state.maxInflight, 1)
  t.ck('[mock] each request names its own model and carries the compatible settings', state.calls.length === 2 && state.calls.every(c => c.includes('alpha_matting=1')) && state.calls[0].includes('model=') && new Set(state.calls.map(c => new URL('http://x/' + c).searchParams.get('model'))).size === 2, state.calls)
  t.ck('[mock] timings and memory are shown', /123 ms/.test(text) && /load 456 ms/.test(text) && /peak 789 MB/.test(text) && /cold/.test(text))

  // inspection
  await page.getByRole('button', { name: 'Compare' }).first().click(); await t.settle(300)
  t.eq('original and result are shown side by side', await page.getByRole('img', { name: /^Original: shirt\.png/ }).count() >= 1 && await page.getByRole('img', { name: /result for shirt\.png/ }).count() >= 1, true)
  for (const b of ['Transparent', 'White', 'Grey', 'Black', 'Edge check']) await page.getByRole('radio', { name: b, exact: true }).click()
  t.eq('backdrop choice applies', await page.getByRole('radio', { name: 'Edge check', exact: true }).getAttribute('aria-checked'), 'true')
  const frame = page.locator('figure').nth(1).locator('div').first()
  t.ck('the result sits on the chosen backdrop', /255, 0, 255/.test(await frame.evaluate(el => getComputedStyle(el).backgroundColor)))
  await page.getByLabel('Zoom percent').fill('200'); await t.settle(150)
  t.ck('zoom changes the image width', (await page.getByRole('img', { name: /result for shirt\.png/ }).first().evaluate(el => el.style.width)) === '200%')
  await page.getByLabel('Original resolution').check(); await t.settle(150)
  t.ck('original resolution shows the pixels 1:1', (await page.getByRole('img', { name: /result for shirt\.png/ }).first().evaluate(el => el.style.width)) === '' && /1:1/.test(await body()))
  await page.getByLabel('Original resolution').uncheck()
  await page.getByLabel(/Show mask/).check(); await t.settle(2000)
  const maskPixels = await page.getByRole('img', { name: /, mask$/ }).first().evaluate(async img => { await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return [Array.from(x.getImageData(5, 20, 1, 1).data), Array.from(x.getImageData(55, 20, 1, 1).data)] })
  t.ck('the mask is the real alpha channel (opaque side white, transparent side black)', maskPixels[0][0] === 255 && maskPixels[1][0] === 0, maskPixels)
  await page.getByLabel(/Show mask/).uncheck()
  const download = page.waitForEvent('download'); await page.getByRole('link', { name: 'Download processed image' }).click(); const file = await download
  t.ck('the processed image downloads as a PNG', /\.png$/.test(file.suggestedFilename()), file.suggestedFilename())

  // scoring: a critical misrepresentation overrides the score
  const selects = page.getByRole('group', { name: /Manual quality score/ }).locator('select')
  for (let i = 0; i < 7; i++) await selects.nth(i).selectOption('4')
  t.ck('overall is the mean of the ratings', /Overall 4 \/ 5/.test(await body()))
  await page.getByRole('radio', { name: 'Accept commercially' }).click()
  await page.getByLabel(/Critical misrepresentation/).check()
  t.ck('critical misrepresentation overrides the score', /Overridden: rejected for critical misrepresentation \(no score\)/.test(await body()))
  await page.getByLabel(/Critical misrepresentation/).uncheck()

  // export
  const jsonDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export JSON' }).click()
  const exported = JSON.parse(readFileSync(await (await jsonDownload).path(), 'utf8'))
  t.ck('JSON export records model, checkpoint, settings, hash, metrics and scores', exported.rows.length === 2 && exported.rows.every(r => r.inputSha256?.length === 64 && r.model && r.checkpoint && r.settings.alphaMatting === true && r.inferenceMs === 123 && r.processPeakMemoryMb === 789) && exported.rows.some(r => r.overall === 4), exported.rows[0])
  const csvDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export CSV' }).click()
  const csv = readFileSync(await (await csvDownload).path(), 'utf8').split('\n')
  t.ck('CSV has a header and one line per run', csv.length === 3 && /inputSha256/.test(csv[0]) && /inferenceMs/.test(csv[0]), csv.length)
  // BGR-FIX-02: the export carries input/output hashes, checkpoint hash, dimensions, provider, effective settings and honest memory labels
  const row0 = exported.rows[0]
  t.ck('[mock] export: input and output SHA-256, dimensions, checkpoint hash and provider', row0.inputSha256.length === 64 && row0.outputSha256.length === 64 && row0.inputDimensions === '60x40' && row0.outputDimensions === '60x40' && row0.checkpointSha256 === 'ab'.repeat(32) && row0.provider === 'CPUExecutionProvider', row0)
  t.ck('[mock] export: the browser and the adapter agree on the input hash', exported.rows.every(r => r.adapterAgreesOnInput === true))
  t.ck('[mock] export: model load memory and process peak are separate fields with the scope written down', row0.modelLoadDeltaMb === 321 && row0.processPeakMemoryMb === 789 && exported.notes.some(n => /process high-water mark/.test(n) && /not one model/.test(n)))
  t.ck('[mock] export: cold timing is recorded; warm timing is null unless measured', row0.coldMs === 579 && row0.warmInferenceMs === null, row0)
  t.ck('[mock] export: effective matting settings are recorded, not just flags', row0.settings.matting?.foregroundThreshold === 240 && row0.settings.matting?.erodeSize === 10, row0.settings)

  // decontamination and compatible matting parameters
  await page.getByLabel(/Alpha matting/).uncheck()
  t.eq('decontamination can be chosen once matting is off', await page.getByLabel(/Colour decontamination/).isDisabled(), false)
  await page.getByLabel(/Colour decontamination/).check()
  state.calls.length = 0; state.loaded.clear()
  await page.getByLabel(/Time a warm run/).check()
  await page.getByRole('button', { name: /^Run comparison/ }).click(); await t.settle(2200)
  t.ck('[mock] decontaminate=1 is sent and matting parameters are not', state.calls.length >= 2 && state.calls.every(c => c.includes('decontaminate=1') && !c.includes('alpha_matting')), state.calls)
  t.ck('[mock] a warm run repeats the request once per cold model', state.calls.length === 4, state.calls.length)
  await page.getByLabel(/Time a warm run/).uncheck(); await page.getByLabel(/Colour decontamination/).uncheck()
  await page.getByLabel(/Alpha matting/).check()
  await page.getByLabel('Foreground threshold (1-255)').fill('5'); await page.getByLabel('Background threshold (0-254)').fill('20'); await t.settle(150)
  t.ck('foreground below background is refused with a reason and Run is disabled', /foreground threshold must be higher/.test(await body()) && await page.getByRole('button', { name: /^Run/ }).isDisabled())
  await page.getByLabel('Foreground threshold (1-255)').fill('240'); await page.getByLabel('Background threshold (0-254)').fill('10')

  // failure isolation, retry, cancel
  state.calls.length = 0; state.failOn = 'silueta'
  await page.getByRole('button', { name: /^Run comparison/ }).click(); await t.settle(1500)
  text = await body()
  t.ck('[mock] one model failing does not stop the other', /Failed/.test(text) && state.calls.length === 2)
  state.failOn = null
  await page.getByRole('button', { name: 'Retry' }).first().click(); await t.settle(1000)
  t.ck('[mock] Retry re-runs only that row', state.calls.length === 3)
  state.delay = 4000; state.calls.length = 0
  await page.getByRole('button', { name: /^Run comparison/ }).click(); await t.settle(500)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await t.settle(600)
  text = await body()
  t.ck('[mock] Cancel stops the queue; the original photo is untouched', /Cancelled/.test(text) && state.calls.length === 1 && await page.getByRole('img', { name: 'shirt.png' }).count() >= 1)
  state.delay = 0

  // SAM and cloth regions are explicit, never defaulted
  await page.waitForTimeout(4200)
  await page.getByRole('checkbox', { name: 'Select BiRefNet general lite (Swin-tiny)' }).uncheck(); await page.getByRole('checkbox', { name: 'Select Silueta' }).uncheck()
  await page.getByRole('checkbox', { name: /^Select Segment Anything/ }).check()
  t.eq('SAM cannot run without a point', await page.getByRole('button', { name: /^Run/ }).isDisabled(), true)
  t.ck('SAM says it is interactive', /does not find the subject by itself/.test(await body()))
  await page.getByRole('img', { name: /^Place points on/ }).click({ position: { x: 20, y: 15 } }); await t.settle(200)
  t.eq('a foreground point enables the run', await page.getByRole('button', { name: /^Run/ }).isDisabled(), false)
  state.calls.length = 0; await page.getByRole('button', { name: /^Run/ }).click(); await t.settle(1200)
  t.ck('[mock] the request carries the point as x,y,1', /points=\d+%2C\d+%2C1/.test(state.calls[0] ?? ''), state.calls)
  // BGR-FIX-02: SAM points belong to ONE photograph. A second photo starts with none and never inherits the first photo's coordinates.
  await page.locator('input[type=file]').first().setInputFiles(photoPath); await t.settle(500)
  t.ck('a second photograph starts with no points of its own', /0 placed here/.test(await body()), (await body()).slice(0, 200))
  t.ck('the photo without a foreground point is flagged', /no foreground point yet, so SAM will skip it/.test(await body()))
  state.calls.length = 0
  await page.getByRole('button', { name: /^Run/ }).click(); await t.settle(1800)
  t.eq('[mock] only the photograph with a point reaches the adapter', state.calls.length, 1)
  t.ck('the photograph without points fails on its own row without a request', /Click this photograph to add at least one foreground point/.test(await body()))
  await page.getByRole('checkbox', { name: /^Select Segment Anything/ }).uncheck()
  await page.getByRole('checkbox', { name: /^Select U²-Net cloth segmentation/ }).check()
  t.eq('cloth model cannot run without a region', await page.getByRole('button', { name: /^Run/ }).isDisabled(), true)
  await page.getByLabel('Clothing region').selectOption('upper')
  t.eq('choosing a region enables the run', await page.getByRole('button', { name: /^Run/ }).isDisabled(), false)
})
