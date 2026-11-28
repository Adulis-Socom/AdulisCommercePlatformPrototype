// BGR-019: the Product Media Editor uses the same registry and adapter as the Lab.
// Adapter OFFLINE or model blocked (today's reality): the editor says why and Product authoring still works.
// Then a MOCKED adapter (Playwright answers http://127.0.0.1:8765; not real inference) proves select, run, use, undo, cancel and stale-result handling.
import { suite } from './harness.mjs'
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'

const CATALOGUE = JSON.parse(readFileSync('src/lab/model-catalogue.json', 'utf8'))
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, sum]) }
const png = (w, h, px) => { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px(x).forEach((v, i) => { raw[y * (w * 4 + 1) + 1 + x * 4 + i] = v }); const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]) }
const dir = mkdtempSync(join(tmpdir(), 'media-'))
const photoA = join(dir, 'a.png'); writeFileSync(photoA, png(60, 40, () => [180, 90, 40, 255]))
const photoB = join(dir, 'b.png'); writeFileSync(photoB, png(60, 40, () => [20, 90, 180, 255]))
const cutout = png(60, 40, x => (x < 30 ? [180, 90, 40, 255] : [180, 90, 40, 0]))

await suite('media-editor', { width: 1440, height: 900 }, async (page, t) => {
  const content = () => page.locator('.seller-console-content').innerText()
  await t.open(); await t.section('Seller Console')
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle(450)
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
  await page.locator('input[type=file]').first().setInputFiles(photoA); await t.settle(700)
  await page.getByRole('button', { name: /^Edit photo 1/ }).click(); await t.settle(500)
  let text = await content()
  // PROTO-BGR-RESEARCH-001: the registry now admits birefnet-general-lite (internal evaluation), so with no adapter the default model reports the adapter, not the licence.
  t.ck('no adapter: the admitted default model says the local adapter is not running', !/This model is unavailable/.test(text) && /The local adapter is not running/.test(text))
  await page.getByLabel('Model').selectOption('silueta'); await t.settle(300)
  text = await content()
  t.ck('a model the registry does not admit says it is unavailable and why', /This model is unavailable/.test(text) && /Background Removal Lab/.test(text))
  await page.getByLabel('Model').selectOption('birefnet-general-lite'); await t.settle(300)
  t.eq('Remove background is disabled', await page.getByRole('button', { name: 'Remove background' }).isDisabled(), true)
  t.ck('the model list comes from the registry (local automatic models only)', (await page.getByLabel('Model').locator('option').count()) > 10)
  await page.getByLabel('Product name').fill('Media Test Shirt')
  t.ck('authoring still works without the adapter', (await page.getByLabel('Product name').inputValue()) === 'Media Test Shirt')

  // MOCKED: the registry (shipped catalogue module) and the adapter both clear silueta. Only these test responses say so; only the registry module and the adapter are mocked here (the real admitted model is exercised by tests/bgr-real.test.mjs, outside pnpm test).
  const modified = JSON.parse(readFileSync('src/lab/model-catalogue.json', 'utf8'))
  modified.models.find(m => m.id === 'silueta').admitted = true
  await page.route('**/model-catalogue.json*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: `export default ${JSON.stringify(modified)}` }))
  await page.reload({ waitUntil: 'networkidle' }); await t.section('Seller Console')
  await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Products/ }).first().click(); await t.settle(450)
  await page.getByRole('button', { name: 'Create Product' }).first().click(); await t.settle()
  await page.locator('input[type=file]').first().setInputFiles(photoA); await t.settle(700)
  await page.getByRole('button', { name: /^Edit photo 1/ }).click(); await t.settle(500)
  const state = { calls: [], delay: 0, depsMissing: false }
  const base = CATALOGUE.models.find(m => m.id === 'u2net_custom')
  // a registered custom checkpoint the adapter has admitted: the Media Editor never offers it (custom checkpoints belong to the Lab)
  const custom = { ...base, id: 'custom:alpha', label: 'Custom: alpha', custom: true, name: 'alpha', customSession: 'u2net_custom', status: 'admitted', admitted: true, installed: true, ready: true, loaded: false, preflight: null, assets: [], customState: 'admitted', blocker: '' }
  const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'X-Model, X-Inference-Ms, X-Load-Ms, X-Peak-Rss-Mb, X-Rss-Mb, X-Provider, X-Input-Size, X-Cold', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST' }
  await page.route('http://127.0.0.1:8765/**', async route => {
    const req = route.request(); const url = new URL(req.url())
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (url.pathname === '/catalogue') {
      const deps = id => (id === 'silueta' && state.depsMissing ? { ok: false, required: ['skimage'], missing: ['skimage'], missingPackages: ['scikit-image'], features: {} } : { ok: true, required: [], missing: [], missingPackages: [], features: {} })
      const models = [...CATALOGUE.models.map(m => ({ ...m, status: m.id === 'silueta' ? 'admitted' : m.status, admitted: m.id === 'silueta', installed: m.id === 'silueta', loaded: false, ready: m.id === 'silueta' && !state.depsMissing, dependencies: deps(m.id), preflight: m.kind === 'local' ? { ok: true, freeRamMb: 9000, needRamMb: 1000 } : null })), custom]
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ maxSessions: 1, models }) })
    }
    if (url.pathname === '/remove') {
      state.calls.push(url.search)
      if (state.delay) await new Promise(r => setTimeout(r, state.delay))
      return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'image/png', 'x-model': 'silueta', 'x-inference-ms': '88', 'x-load-ms': '0', 'x-peak-rss-mb': '500', 'x-rss-mb': '480', 'x-provider': 'CPUExecutionProvider', 'x-input-size': '60x40', 'x-cold': '0' }, body: cutout })
    }
    return route.fulfill({ status: 404, headers: cors, body: '{}' })
  })
  const again = page.getByRole('button', { name: 'check again' }); if (await again.count()) { await again.click(); await t.settle(500) }
  await page.getByLabel('Model').selectOption('silueta'); await t.settle(700)
  t.eq('[mock] a registered custom checkpoint is not offered in the Media Editor selector', await page.getByLabel('Model').locator('option').evaluateAll(opts => opts.filter(o => /custom/i.test(o.value) && o.value.startsWith('custom:')).length), 0)
  t.ck('[mock] the adapter clears the model: the editor offers to run it', await page.getByRole('button', { name: 'Remove background' }).count() === 1 && /Local adapter connected/.test(await content()))
  await page.getByPlaceholder('Paste the token the adapter printed').fill('test-token')
  await page.getByLabel('Alpha matting').check()
  await page.getByRole('button', { name: 'Remove background' }).click(); await t.settle(900)
  text = await content()
  t.ck('[mock] before and after are shown with timings and memory', /88 ms inference/.test(text) && /peak memory 500 MB/.test(text) && await page.getByRole('img', { name: /^Original:/ }).count() === 1 && await page.getByRole('img', { name: /^Background removed:/ }).count() === 1)
  t.ck('[mock] the request carries the chosen setting and the model id', /model=silueta/.test(state.calls[0]) && /alpha_matting=1/.test(state.calls[0]), state.calls)
  await page.getByRole('button', { name: 'Keep original' }).click(); await t.settle(200)
  t.ck('Keep original discards the result', /Kept the original photo/.test(await content()) && await page.getByRole('img', { name: /^Background removed:/ }).count() === 0)
  await page.getByRole('button', { name: /^(Retry|Remove background)$/ }).first().click(); await t.settle(900)
  await page.getByRole('button', { name: 'Use edited photo' }).click(); await t.settle(300)
  t.ck('Use edited photo makes it the draft image', /Using the edited photo in this draft/.test(await content()))
  await page.getByRole('button', { name: 'Restore original' }).click(); await t.settle(300)
  t.ck('Restore original undoes it', /Original photo restored/.test(await content()) && !/Using the edited photo/.test(await content()))

  // cancel and stale results
  state.delay = 3000
  await page.getByRole('button', { name: /^(Retry|Remove background)$/ }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await t.settle(300)
  t.ck('Cancel stops the run; the original is unchanged', /Cancelled\. Your original photo is unchanged/.test(await content()))
  await page.getByRole('button', { name: /^(Retry|Remove background)$/ }).first().click(); await t.settle(400)
  await page.getByRole('button', { name: 'Replace photo' }).click().catch(() => {})
  await page.locator('input[type=file]').first().setInputFiles(photoB); await t.settle(4200)
  t.eq('a late result never lands on a replaced photo', await page.getByRole('img', { name: /^Background removed:/ }).count(), 0)
  t.ck('the draft still shows the photo that was chosen', await page.getByRole('img', { name: /^Original:/ }).count() === 1)

  // readiness: a model that is admitted and installed but cannot import a module is unavailable, with the module named
  state.depsMissing = true
  await page.getByLabel('Model').selectOption('silueta'); await page.getByLabel('Model').selectOption('birefnet-general-lite'); await page.getByLabel('Model').selectOption('silueta'); await t.settle(900)
  const missingText = await content()
  t.ck('[mock] a missing Python module makes the model unavailable and says which', /This model is unavailable/.test(missingText) && /skimage/.test(missingText) && /scikit-image/.test(missingText), missingText.slice(0, 300))
  t.eq('[mock] Remove background is not offered while the module is missing', (await page.getByRole('button', { name: 'Remove background' }).count()) === 0 || await page.getByRole('button', { name: 'Remove background' }).isDisabled(), true)
})
