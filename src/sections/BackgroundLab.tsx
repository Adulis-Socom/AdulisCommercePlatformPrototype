import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Button } from '../components/ui/Button'
import {
  ACCEPT, BACKDROPS, CATALOGUE, CRITERIA, DEFAULT_SETTINGS, GROUPS, MAX_BYTES, REQUEST_LIMIT_MS, STATUS_LABEL,
  effectiveSettings, emptyScore, fetchLive, overall, photoProblem, pointsProblem, readToken, runModel, runState, settingsProblem, sha256Hex, storeToken, unloadModels,
  type Backdrop, type Live, type ModelEntry, type Point, type RunMeta, type RunSettings, type Score,
} from '../lab/bg'

/**
 * Background Removal Lab (BGR-017/018): an experimental tool for comparing background-removal models on a Founder's own photos.
 * Nothing here is part of Seller authoring. Photos stay in this browser tab and go only to the loopback adapter. A model that is
 * not cleared by the registry is listed with its reasons and cannot be selected or run; nothing is ever fabricated.
 */
const MAX_PHOTOS = 6
type Photo = { id: number; name: string; blob: Blob; url: string; width: number; height: number }
type Row = {
  key: string; photo: number; model: string; status: 'queued' | 'running' | 'done' | 'error' | 'cancelled'; blob?: Blob; url?: string; maskUrl?: string
  meta?: RunMeta; error?: string; settings: ReturnType<typeof effectiveSettings>; score: Score
  /** Warm timing (a second run of the same request) and what the browser measured itself. */
  extra?: { warmMs: number | null; coldMs: number | null; inputHash: string; outputHash: string; outputDims: string }
}

const tone = (status: string) => (status === 'admitted' ? 'bg-success-bg text-success' : status === 'external-inactive' || status === 'custom-unregistered' ? 'bg-surface-raised text-text-muted' : 'bg-warning-bg text-warning')
const mb = (bytes: number | null) => (bytes ? `${Math.round(bytes / 1048576)} MB` : 'size unknown')
const download = (name: string, blob: Blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
const safe = (text: string) => text.replace(/[^a-z0-9._-]+/gi, '_')

export default function BackgroundLab({ onClose }: { onClose: () => void }) {
  const [live, setLive] = useState<Live>({ state: 'checking' })
  const [token, setToken] = useState(readToken)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [settings, setSettings] = useState<RunSettings>(DEFAULT_SETTINGS)
  // SAM points belong to ONE photograph each. They are never shared, so another photo's coordinates are never reused.
  const [pointsByPhoto, setPointsByPhoto] = useState<Record<number, Point[]>>({})
  const pointsRef = useRef(pointsByPhoto)
  pointsRef.current = pointsByPhoto
  const [measureWarm, setMeasureWarm] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)
  const [viewKey, setViewKey] = useState<string | null>(null)
  const [backdrop, setBackdrop] = useState<Backdrop>('checker')
  const [zoom, setZoom] = useState(100)
  const [fullRes, setFullRes] = useState(false)
  const [showMask, setShowMask] = useState(false)
  const [activePhoto, setActivePhoto] = useState<number | null>(null)
  const next = useRef(1)
  const photosRef = useRef(photos)
  photosRef.current = photos
  const cancel = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const urls = useRef(new Set<string>())
  const fileInput = useRef<HTMLInputElement>(null)
  const replacing = useRef<number | null>(null)

  const track = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.current.add(url); return url }
  const release = (url?: string) => { if (url && urls.current.delete(url)) URL.revokeObjectURL(url) }
  useEffect(() => () => { cancel.current = true; controller.current?.abort(); urls.current.forEach(u => URL.revokeObjectURL(u)); urls.current.clear() }, [])

  const refresh = useCallback(async () => { setLive({ state: 'checking' }); setLive(await fetchLive()) }, [])
  useEffect(() => { void refresh() }, [refresh])

  const states = useMemo(() => Object.fromEntries(CATALOGUE.models.map(m => [m.id, runState(m, live)])), [live])
  const runnable = CATALOGUE.models.filter(m => states[m.id].runnable)
  const chosen = CATALOGUE.models.filter(m => selected.includes(m.id) && states[m.id].runnable)
  const interactive = chosen.some(m => m.settings.samPoints)
  const cloth = chosen.find(m => m.settings.clothRegion)
  const problems = chosen.map(m => ({ m, text: settingsProblem(m, settings) })).filter(p => p.text)
  const photo = photos.find(p => p.id === activePhoto) ?? photos[0]

  // ---- photos ----
  const addPhoto = async (file: File | undefined) => {
    const target = replacing.current; replacing.current = null
    if (!file) return
    if (!ACCEPT.includes(file.type)) { setNotice('Choose a JPEG, PNG or WebP photo.'); return }
    if (file.size > MAX_BYTES) { setNotice('That photo is larger than 10 MB.'); return }
    if (file.size === 0) { setNotice('That file is empty.'); return }
    const url = track(file)
    const size = await new Promise<{ width: number; height: number } | null>(resolve => { const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = () => resolve(null); img.src = url })
    if (!size) { release(url); setNotice('That file could not be read as an image.'); return }
    if (size.width * size.height > 16_000_000) { release(url); setNotice('That photo is larger than 16 megapixels, which the adapter refuses.'); return }
    setNotice('')
    if (target !== null) {
      const old = photos.find(p => p.id === target); release(old?.url)
      rows.filter(r => r.photo === target).forEach(r => { release(r.url); release(r.maskUrl) })
      setRows(list => list.filter(r => r.photo !== target))
      setPhotos(list => list.map(p => (p.id === target ? { id: target, name: file.name, blob: file, url, ...size } : p)))
      setPointsByPhoto(map => { const { [target]: _gone, ...rest } = map; return rest }) // a replaced photo starts with no points
      return
    }
    if (photos.length >= MAX_PHOTOS) { release(url); setNotice(`Up to ${MAX_PHOTOS} photos at a time.`); return }
    const id = next.current++
    setPhotos(list => [...list, { id, name: file.name, blob: file, url, ...size }]); setActivePhoto(id)
  }
  const removePhoto = (id: number) => {
    const old = photos.find(p => p.id === id); release(old?.url)
    rows.filter(r => r.photo === id).forEach(r => { release(r.url); release(r.maskUrl) })
    setRows(list => list.filter(r => r.photo !== id)); setPhotos(list => list.filter(p => p.id !== id))
    setPointsByPhoto(map => { const { [id]: _gone, ...rest } = map; return rest })
  }

  const pickPoint = (event: MouseEvent<HTMLImageElement>, label: 0 | 1) => {
    if (!photo) return
    const box = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - box.left) / box.width) * photo.width, y = ((event.clientY - box.top) / box.height) * photo.height
    setPointsByPhoto(map => ({ ...map, [photo.id]: [...(map[photo.id] ?? []), { x, y, label }].slice(0, 8) }))
  }
  /** The settings for ONE photograph: the shared choices plus that photograph's own points. */
  const settingsFor = (photoId: number): RunSettings => ({ ...settings, points: pointsRef.current[photoId] ?? [] })

  // ---- running: one model at a time, photo by photo; a failure stays on its own row ----
  const execute = async (queue: Row[]) => {
    cancel.current = false; setRunning(true)
    for (const row of queue) {
      if (cancel.current) { setRows(list => list.map(r => (r.status === 'queued' || r.key === row.key ? { ...r, status: r.status === 'done' ? 'done' : 'cancelled' } : r))); break }
      const model = CATALOGUE.models.find(m => m.id === row.model)!
      const source = photos.find(p => p.id === row.photo)
      if (!source) continue
      const ctl = new AbortController(); controller.current = ctl
      const limit = setTimeout(() => ctl.abort(), REQUEST_LIMIT_MS)
      setRows(list => list.map(r => (r.key === row.key ? { ...r, status: 'running' } : r)))
      const runSettings = settingsFor(source.id)
      const preflight = pointsProblem(model, runSettings.points) || photoProblem(source.width, source.height, runSettings, [model])
      if (preflight) { // never send a request that is known to be wrong for THIS photograph
        setRows(list => list.map(r => (r.key === row.key ? { ...r, status: 'error', error: preflight, settings: effectiveSettings(model, runSettings) } : r)))
        clearTimeout(limit); controller.current = null
        continue
      }
      try {
        const out = await runModel({ model, blob: source.blob, settings: runSettings, token, signal: ctl.signal })
        if (!photosRef.current.some(p => p.id === source.id && p.url === source.url)) continue // the photo was removed or replaced meanwhile: drop the stale result
        let warmMs: number | null = out.meta.cold ? null : out.meta.inferenceMs
        if (measureWarm && out.meta.cold && !cancel.current) { // the same request again, now that the model is loaded
          try { warmMs = (await runModel({ model, blob: source.blob, settings: runSettings, token, signal: ctl.signal })).meta.inferenceMs } catch { warmMs = null }
        }
        const size = await createImageBitmap(out.blob).then(b => `${b.width}x${b.height}`).catch(() => '')
        const extra = { warmMs, coldMs: out.meta.cold ? out.meta.loadMs + out.meta.inferenceMs : null, inputHash: await sha256Hex(source.blob), outputHash: await sha256Hex(out.blob), outputDims: size }
        const url = track(out.blob)
        setRows(list => list.map(r => (r.key === row.key ? { ...r, status: 'done', blob: out.blob, url, meta: out.meta, extra } : r)))
        setViewKey(k => k ?? row.key)
      } catch (error) {
        const aborted = ctl.signal.aborted
        const message = cancel.current ? 'Cancelled.' : aborted ? 'Stopped: this took too long.' : error instanceof TypeError ? 'Could not reach the adapter.' : (error as Error).message
        setRows(list => list.map(r => (r.key === row.key ? { ...r, status: cancel.current ? 'cancelled' : 'error', error: message } : r)))
        if (error instanceof TypeError) void refresh()
      } finally { clearTimeout(limit); controller.current = null }
    }
    setRunning(false)
  }
  const start = () => {
    if (!photos.length || !chosen.length || problems.length) return
    if (interactive && !photos.some(p => (pointsByPhoto[p.id] ?? []).some(q => q.label === 1))) return
    const queue: Row[] = photos.flatMap(p => chosen.map(m => ({ key: `${p.id}:${m.id}:${next.current++}`, photo: p.id, model: m.id, status: 'queued' as const, settings: effectiveSettings(m, settingsFor(p.id)), score: emptyScore() })))
    setRows(list => [...list, ...queue]); void execute(queue)
  }
  const retry = (row: Row) => {
    const fresh: Row = { ...row, key: `${row.photo}:${row.model}:${next.current++}`, status: 'queued', error: undefined, blob: undefined, url: undefined, maskUrl: undefined, meta: undefined, score: emptyScore(), settings: effectiveSettings(CATALOGUE.models.find(m => m.id === row.model)!, settings) }
    release(row.url); release(row.maskUrl)
    setRows(list => list.map(r => (r.key === row.key ? fresh : r))); void execute([fresh])
  }
  const stop = () => { cancel.current = true; controller.current?.abort() }

  // ---- inspection ----
  const viewed = rows.find(r => r.key === viewKey && r.status === 'done')
  const viewedPhoto = photos.find(p => p.id === viewed?.photo)
  const alphaMask = async (row: Row) => {
    if (row.maskUrl || !row.blob) return
    const bitmap = await createImageBitmap(row.blob)
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!; ctx.drawImage(bitmap, 0, 0)
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let i = 0; i < data.data.length; i += 4) { const a = data.data[i + 3]; data.data[i] = data.data[i + 1] = data.data[i + 2] = a; data.data[i + 3] = 255 }
    ctx.putImageData(data, 0, 0)
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'))
    const url = track(blob)
    setRows(list => list.map(r => (r.key === row.key ? { ...r, maskUrl: url } : r)))
  }
  useEffect(() => { if (showMask && viewed) void alphaMask(viewed) }, [showMask, viewKey])
  const setScore = (key: string, patch: Partial<Score>) => setRows(list => list.map(r => (r.key === key ? { ...r, score: { ...r.score, ...patch } } : r)))

  // ---- export ----
  const exportRows = async () => Promise.all(rows.filter(r => r.status !== 'queued').map(async r => {
    const p = photos.find(x => x.id === r.photo)!
    const m = CATALOGUE.models.find(x => x.id === r.model)!
    const o = overall(r.score)
    return {
      photo: p.name, inputSha256: r.extra?.inputHash ?? await sha256Hex(p.blob), inputDimensions: `${p.width}x${p.height}`, outputSha256: r.extra?.outputHash ?? null, outputDimensions: r.extra?.outputDims || r.meta?.outputSize || null,
      adapterAgreesOnInput: r.meta && r.extra ? r.meta.inputSha256 === r.extra.inputHash : null,
      model: r.model, checkpoint: m.assets.map(a => a.file).join(' + '), checkpointSha256: r.meta?.checkpointSha256.join(' + ') ?? null, status: r.status,
      settings: r.settings, provider: r.meta?.provider ?? null,
      coldMs: r.extra?.coldMs ?? null, warmInferenceMs: r.extra?.warmMs ?? null, loadMs: r.meta?.loadMs ?? null, inferenceMs: r.meta?.inferenceMs ?? null, cold: r.meta?.cold ?? null,
      modelLoadDeltaMb: r.meta?.loadDeltaMb ?? null, processPeakMemoryMb: r.meta?.peakMb ?? null, rssAfterRunMb: r.meta?.rssMb ?? null,
      outputBytes: r.meta?.bytes ?? null, error: r.error ?? null,
      ratings: r.score.ratings, overall: o.value, decision: r.score.decision, criticalMisrepresentation: r.score.critical, rejected: o.rejected,
      registryStatus: m.status, evaluationPermission: m.evaluationPermission, commercialUse: m.commercialUse,
    }
  }))
  const exportJson = async () => download('background-removal-benchmark.json', new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), rembg: CATALOGUE.rembg, runtime: live.state === 'online' ? live.runtime : null,
    notes: ['modelLoadDeltaMb is the growth in resident memory when this model was loaded cold (approximate footprint); processPeakMemoryMb is the adapter process high-water mark since it started, cumulative over every model run so far, not one model.', 'coldMs is load plus inference for the first run; warmInferenceMs is a repeat of the same request (only when "time a warm run" was on, otherwise null unless the model was already loaded).', 'Nothing is estimated: empty fields were not measured.'],
    rows: await exportRows() }, null, 2)], { type: 'application/json' }))
  const exportCsv = async () => {
    const data = await exportRows()
    const cols = ['photo', 'inputSha256', 'inputDimensions', 'outputSha256', 'outputDimensions', 'adapterAgreesOnInput', 'model', 'checkpoint', 'checkpointSha256', 'status', 'provider', 'coldMs', 'warmInferenceMs', 'loadMs', 'inferenceMs', 'cold', 'modelLoadDeltaMb', 'processPeakMemoryMb', 'rssAfterRunMb', 'outputBytes', 'error', 'overall', 'decision', 'criticalMisrepresentation', 'rejected', 'registryStatus', 'evaluationPermission', 'commercialUse'] as const
    const cell = (v: unknown) => { const t = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
    const head = [...cols, 'settings', ...CRITERIA.map(c => `rating ${c}`)]
    const lines = data.map(r => [...cols.map(c => cell(r[c])), cell(JSON.stringify(r.settings)), ...CRITERIA.map(c => cell(r.ratings[c]))].join(','))
    download('background-removal-benchmark.csv', new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' }))
  }

  const backdropCss = BACKDROPS.find(b => b.id === backdrop)!.css
  const photoName = (id: number) => photos.find(p => p.id === id)?.name ?? 'removed photo'
  const modelLabel = (id: string) => CATALOGUE.models.find(m => m.id === id)?.label ?? id

  return (
    <div className="mx-auto max-w-6xl p-6 text-text-primary" aria-label="Background Removal Lab">
      <input ref={fileInput} type="file" accept={ACCEPT.join(',')} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={event => { void addPhoto(event.target.files?.[0]); event.target.value = '' }} />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Experimental tool · not part of Seller authoring</p>
          <h1 className="font-display text-3xl font-semibold">Background Removal Lab</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-secondary">Compare background-removal models on your own photos. Everything runs on this computer through a local adapter; photos are never sent to an online service. Models appear here whether or not they may run, with the reason.</p>
        </div>
        <Button variant="tertiary" onClick={onClose}>← Back to the Guide</Button>
      </div>

      <section aria-label="Adapter" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-3">
        <div role="status" className="min-w-56 flex-1 text-sm">
          {live.state === 'checking' && 'Checking for the local adapter…'}
          {live.state === 'offline' && <>The local adapter is not running, so nothing can be executed. Start it (tools/bg-removal/README.md), then <button type="button" onClick={refresh} className="font-semibold text-brand-text underline">check again</button>.</>}
          {live.state === 'online' && <>Local adapter connected. {runnable.length === 0 ? <strong>No model is cleared to run, so nothing can be executed.</strong> : `${runnable.length} model${runnable.length === 1 ? '' : 's'} can run.`} Up to {live.maxSessions} model{live.maxSessions === 1 ? '' : 's'} stay loaded.</>}
          {live.state === 'offline' && runnable.length === 0 && <> No model is cleared to run in the registry either.</>}
        </div>
        <label className="min-w-48 text-xs font-semibold text-text-secondary">Adapter token
          <input value={token} onChange={event => { setToken(event.target.value); storeToken(event.target.value) }} placeholder="Paste the token the adapter printed" autoComplete="off" spellCheck={false} className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 font-mono text-xs" />
        </label>
        <Button variant="secondary" size="sm" disabled={running || live.state !== 'online' || !token.trim()} onClick={async () => { await unloadModels(token); void refresh() }}>Unload models</Button>
      </section>

      <section aria-label="Photos" className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">1. Photos</h2><Button size="sm" disabled={photos.length >= MAX_PHOTOS || running} onClick={() => { replacing.current = null; fileInput.current?.click() }}>Add photo</Button></div>
        <p className="mb-2 text-xs text-text-muted">JPEG, PNG or WebP, up to 10 MB, up to {MAX_PHOTOS} photos. Kept in this tab only; originals are never changed.</p>
        <p role="status" className="min-h-4 text-xs font-semibold text-warning">{notice}</p>
        {photos.length === 0 ? <p className="text-sm text-text-muted">No photos yet.</p> : (
          <ul className="flex flex-wrap gap-3">{photos.map(p => (
            <li key={p.id} className={`w-40 rounded-xl border-2 p-2 ${photo?.id === p.id ? 'border-brand' : 'border-border'}`}>
              <button type="button" aria-pressed={photo?.id === p.id} aria-label={`Show original: ${p.name}`} onClick={() => setActivePhoto(p.id)} className="block w-full"><img src={p.url} alt={p.name} className="h-28 w-full rounded-lg bg-surface-raised object-contain" /></button>
              <div className="mt-1 truncate text-xs font-semibold" title={p.name}>{p.name}</div>
              <div className="font-mono text-[10px] text-text-muted">{p.width}×{p.height} · {(p.blob.size / 1024).toFixed(0)} KB</div>
              <div className="mt-1 flex gap-1"><Button size="sm" variant="tertiary" disabled={running} onClick={() => { replacing.current = p.id; fileInput.current?.click() }}>Replace</Button><Button size="sm" variant="tertiary" disabled={running} onClick={() => removePhoto(p.id)} aria-label={`Remove ${p.name}`}>Remove</Button></div>
            </li>))}</ul>)}
      </section>

      <section aria-label="Model catalogue" className="mb-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">2. Models</h2>
        <p className="mb-3 text-xs text-text-muted">{CATALOGUE.models.length} registered sessions (rembg {CATALOGUE.rembg.version}). A model can be selected only when the registry clears it, it is installed and this computer has the memory. Everything else is shown with its reason and cannot run.</p>
        {GROUPS.map(group => {
          const members = CATALOGUE.models.filter(m => m.scope === group.scope)
          if (!members.length) return null
          return (
            <div key={group.scope} className="mb-4">
              <h3 className="text-sm font-semibold">{group.label} <span className="font-normal text-text-muted">· {group.help}</span></h3>
              <ul className="mt-2 grid grid-cols-2 gap-3 max-md:grid-cols-1">{members.map(m => <ModelCard key={m.id} model={m} state={states[m.id]} live={live} checked={selected.includes(m.id)} disabled={running} onToggle={on => setSelected(list => (on ? [...list, m.id] : list.filter(id => id !== m.id)))} />)}</ul>
            </div>)
        })}
        {CATALOGUE.notRegisteredReleaseAssets.length > 0 && <p className="text-[11px] text-text-muted">The rembg release also hosts {CATALOGUE.notRegisteredReleaseAssets.length} other files (larger SAM variants, BiRefNet HR, ViTMatte learned-matting models, a portrait matting model) that rembg {CATALOGUE.rembg.version}'s sessions do not use or that are not registered here. They are not runnable.</p>}
      </section>

      <section aria-label="Settings and run" className="mb-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">3. Settings and run</h2>
        {chosen.length === 0 ? <p className="mt-1 text-sm text-text-muted">{runnable.length === 0 ? 'No model is cleared to run, so there is nothing to configure or run.' : 'Select at least one model above.'}</p> : (
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.alphaMatting} disabled={running || settings.onlyMask || !chosen.some(m => m.settings.alphaMatting)} onChange={e => setSettings(s => ({ ...s, alphaMatting: e.target.checked }))} /> Alpha matting (refines soft edges; slower)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.postProcessMask} disabled={running || !chosen.some(m => m.settings.postProcessMask)} onChange={e => setSettings(s => ({ ...s, postProcessMask: e.target.checked }))} /> Post-process the mask (smooth the outline)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.onlyMask} disabled={running || settings.alphaMatting || !chosen.some(m => m.settings.onlyMask)} onChange={e => setSettings(s => ({ ...s, onlyMask: e.target.checked }))} /> Mask only (black and white mask instead of a cut-out)</label>
            {settings.alphaMatting && <p className="text-xs text-text-muted">Mask only is off while alpha matting is on: matting changes the cut-out, so the two are never combined.</p>}
            {settings.alphaMatting && (
              <fieldset className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-2" aria-label="Matting thresholds">
                {([['fg', 'Foreground threshold (1-255)'], ['bg', 'Background threshold (0-254)'], ['erode', 'Erode size (0-50)']] as const).map(([key, label]) => (
                  <label key={key} className="flex flex-col text-xs">{label}<input type="number" value={settings[key]} disabled={running} onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))} className="h-9 w-28 rounded-lg border border-border bg-surface px-2 text-sm" /></label>))}
                <span className="text-xs text-text-muted">rembg defaults 240 / 10 / 10. Limited to 4 megapixels.</span>
              </fieldset>)}
            <label className="flex items-center gap-2"><input type="checkbox" checked={settings.decontaminate} disabled={running || settings.onlyMask || settings.alphaMatting || !chosen.some(m => m.settings.decontaminate)} onChange={e => setSettings(s => ({ ...s, decontaminate: e.target.checked }))} /> Colour decontamination (removes background colour from soft edges; off while matting is on, which does this itself)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={measureWarm} disabled={running} onChange={e => setMeasureWarm(e.target.checked)} /> Time a warm run too (repeats each first run once the model is loaded)</label>
            {cloth && <label className="flex items-center gap-2">Clothing region <select value={settings.cloth} disabled={running} onChange={e => setSettings(s => ({ ...s, cloth: e.target.value }))} className="h-9 rounded-lg border border-border bg-surface px-2"><option value="">Choose…</option>{cloth.settings.clothRegion!.map(r => <option key={r} value={r}>{r}</option>)}</select></label>}
            {interactive && photo && (
              <div>
                <p className="text-xs text-text-muted">SAM is interactive: it does not find the subject by itself. Points belong to the photograph shown ({photo.name}): {(pointsByPhoto[photo.id] ?? []).length} placed here. Other photographs need their own. Click = foreground; hold Shift for background.</p>
                <div className="relative mt-1 inline-block"><img src={photo.url} alt={`Place points on ${photo.name}`} onClick={e => pickPoint(e, e.shiftKey ? 0 : 1)} className="max-h-64 cursor-crosshair rounded-lg border border-border" />
                  {(pointsByPhoto[photo.id] ?? []).map((p, i) => <span key={i} aria-hidden="true" className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${(p.x / photo.width) * 100}%`, top: `${(p.y / photo.height) * 100}%`, background: p.label ? '#16a34a' : '#dc2626' }} />)}</div>
                <Button size="sm" variant="tertiary" onClick={() => setPointsByPhoto(map => ({ ...map, [photo.id]: [] }))}>Clear points for this photo</Button>
              </div>)}
            {chosen.some(m => m.runtime && !m.runtime.dynamicResolution && m.family === 'birefnet') && <p className="text-xs text-text-muted">BiRefNet sessions in rembg resize every photograph to 1024 x 1024 (verified in the installed rembg); the dynamic-resolution variant does not change that here.</p>}
            {interactive && photos.filter(p => !(pointsByPhoto[p.id] ?? []).some(q => q.label === 1)).map(p => <p key={p.id} className="text-xs text-warning">{p.name}: no foreground point yet, so SAM will skip it.</p>)}
            {problems.map(p => <p key={p.m.id} role="alert" className="text-xs font-semibold text-warning">{p.m.label}: {p.text}</p>)}
          </div>)}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={start} disabled={running || !photos.length || !chosen.length || problems.length > 0 || !token.trim() || (interactive && !photos.some(p => (pointsByPhoto[p.id] ?? []).some(q => q.label === 1)))}>Run {photos.length > 1 || chosen.length > 1 ? `comparison (${photos.length * chosen.length} runs, one at a time)` : 'model'}</Button>
          {running && <Button variant="secondary" onClick={stop}>Cancel</Button>}
          {!token.trim() && chosen.length > 0 && <span className="text-xs text-text-muted">Paste the adapter token to run.</span>}
        </div>
      </section>

      <section aria-label="Results" className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">4. Results</h2>
          <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!rows.some(r => r.status !== 'queued')} onClick={exportCsv}>Export CSV</Button><Button size="sm" variant="secondary" disabled={!rows.some(r => r.status !== 'queued')} onClick={exportJson}>Export JSON</Button></div></div>
        {rows.length === 0 ? <p className="text-sm text-text-muted">No runs yet. Results appear here as real output from the adapter; nothing is simulated.</p> : (
          <>
            <ul className="mb-3 flex flex-col gap-1">{rows.map(r => (
              <li key={r.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                <span className="min-w-40 flex-1"><strong>{modelLabel(r.model)}</strong> · {photoName(r.photo)}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${r.status === 'done' ? 'bg-success-bg text-success' : r.status === 'error' ? 'bg-danger-bg text-danger' : 'bg-surface-raised text-text-muted'}`}>{r.status === 'done' ? 'Done' : r.status === 'error' ? 'Failed' : r.status === 'cancelled' ? 'Cancelled' : r.status === 'running' ? 'Running…' : 'Queued'}</span>
                {r.meta && <span className="font-mono text-text-secondary">{r.meta.inferenceMs} ms{r.meta.loadMs ? ` · load ${r.meta.loadMs} ms` : ''} · {r.meta.cold ? 'cold' : 'warm'} · peak {r.meta.peakMb} MB · {r.meta.size} · {(r.meta.bytes / 1024).toFixed(0)} KB</span>}
                {r.error && <span role="alert" className="text-danger">{r.error}</span>}
                {r.status === 'done' && <Button size="sm" variant="tertiary" aria-pressed={viewKey === r.key} onClick={() => setViewKey(r.key)}>Compare</Button>}
                {(r.status === 'error' || r.status === 'cancelled') && <Button size="sm" variant="tertiary" disabled={running} onClick={() => retry(r)}>Retry</Button>}
              </li>))}</ul>

            {viewed && viewedPhoto && (
              <div aria-label="Comparison">
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
                  <span role="radiogroup" aria-label="Preview background" className="flex flex-wrap gap-1">{BACKDROPS.map(b => <button key={b.id} type="button" role="radio" aria-checked={backdrop === b.id} onClick={() => setBackdrop(b.id)} className={`min-h-8 rounded-full border px-2.5 font-semibold ${backdrop === b.id ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{b.label}</button>)}</span>
                  <label className="flex items-center gap-1">Zoom <input type="range" min={50} max={400} step={10} value={zoom} disabled={fullRes} onChange={e => setZoom(Number(e.target.value))} aria-label="Zoom percent" /> {fullRes ? '1:1' : `${zoom}%`}</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={fullRes} onChange={e => setFullRes(e.target.checked)} /> Original resolution</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={showMask} onChange={e => setShowMask(e.target.checked)} /> Show mask (alpha)</label>
                </div>
                <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                  <figure><figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Original</figcaption><div className="h-96 overflow-auto rounded-xl border border-border bg-surface-raised"><img src={viewedPhoto.url} alt={`Original: ${viewedPhoto.name}`} style={fullRes ? undefined : { width: `${zoom}%`, maxWidth: 'none' }} /></div></figure>
                  <figure><figcaption className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{modelLabel(viewed.model)}{showMask ? ' · mask' : ''}</figcaption><div className="h-96 overflow-auto rounded-xl border border-border" style={{ background: showMask ? '#000' : backdropCss }}>{viewed.url && <img src={showMask && viewed.maskUrl ? viewed.maskUrl : viewed.url} alt={`${modelLabel(viewed.model)} result for ${viewedPhoto.name}${showMask ? ', mask' : ''}`} style={fullRes ? undefined : { width: `${zoom}%`, maxWidth: 'none' }} />}</div></figure>
                </div>
                <div className="mt-2 flex flex-wrap gap-2"><a href={viewed.url} download={`${safe(viewedPhoto.name)}.${safe(viewed.model)}.png`} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold">Download processed image</a></div>
                <ScoreForm score={viewed.score} onChange={patch => setScore(viewed.key, patch)} />
              </div>)}
          </>)}
      </section>
    </div>
  )
}

function ModelCard({ model, state, live, checked, disabled, onToggle }: { model: ModelEntry; state: { runnable: boolean; reason: string }; live: Live; checked: boolean; disabled: boolean; onToggle: (on: boolean) => void }) {
  const family = CATALOGUE.licenceFamilies[model.licenceFamily]
  const entry = live.state === 'online' ? live.byId[model.id] : undefined
  const status = entry?.status ?? model.status
  return (
    <li className={`rounded-xl border p-3 ${state.runnable ? 'border-border' : 'border-border opacity-90'}`} aria-label={`${model.label}, ${STATUS_LABEL[status] ?? status}`}>
      <div className="flex items-start justify-between gap-2">
        <label className={`flex min-w-0 flex-1 items-start gap-2 ${state.runnable ? '' : 'cursor-not-allowed'}`}>
          <input type="checkbox" checked={checked && state.runnable} disabled={!state.runnable || disabled} onChange={e => onToggle(e.target.checked)} aria-label={`Select ${model.label}`} className="mt-1" />
          <span className="min-w-0"><span className="block text-sm font-semibold">{model.label}</span><span className="block font-mono text-[10px] text-text-muted">{model.id}</span></span>
        </label>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone(status)}`}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      <p className="mt-1 text-xs text-text-secondary">{model.purpose}</p>
      {!state.runnable && <p className="mt-1 text-xs font-semibold text-warning">Cannot run: {state.reason}</p>}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        <dt className="text-text-muted">Checkpoint</dt><dd>{model.assets.length ? model.assets.map(a => a.file).join(', ') : model.kind === 'remote' ? 'hosted service (no file)' : model.id === 'birefnet-general-fp16' ? 'converted from birefnet-general on first use' : 'none registered'}</dd>
        <dt className="text-text-muted">Evaluation</dt><dd>{model.evaluationPermission}</dd>
        <dt className="text-text-muted">Commercial use</dt><dd>{model.commercialUse}</dd>
        <dt className="text-text-muted">Installed</dt><dd>{model.kind !== 'local' ? 'not applicable' : entry ? (entry.installed ? 'yes' : 'no') : 'unknown (adapter offline)'}</dd>
        <dt className="text-text-muted">Resources</dt><dd>{model.resources ? `${mb(model.resources.diskMb * 1048576)} on disk · about ${model.resources.ramMbEstimate} MB memory (estimate)` : 'not applicable'}{model.inputSize ? ` · ${model.inputSize.join('×')} input` : ''}</dd>
      </dl>
      <details className="mt-1 text-[11px]">
        <summary className="cursor-pointer font-semibold text-brand-text">Licence evidence and notes</summary>
        <p className="mt-1"><strong>{family.classification}.</strong> Code: {family.code}. Weights: {family.weights}. Training data: {family.data}.</p>
        <p className="mt-1">{model.statusNote}</p>
        {model.modes && <p className="mt-1">Mode: {model.modes.join('; ')}</p>}
        {model.requirements && <p className="mt-1">Needs: {model.requirements.join(', ')}.</p>}
        <p className="mt-1 text-text-muted">Summarised from public pages on 2026-11-27 for engineering triage. Not legal advice; a person must re-read the sources before any admission.</p>
      </details>
    </li>
  )
}

function ScoreForm({ score, onChange }: { score: Score; onChange: (patch: Partial<Score>) => void }) {
  const o = overall(score)
  return (
    <fieldset className="mt-3 rounded-xl border border-border p-3">
      <legend className="px-1 text-xs font-semibold">Manual quality score (1 poor to 5 excellent)</legend>
      <div className="grid grid-cols-4 gap-2 max-md:grid-cols-2">{CRITERIA.map(c => (
        <label key={c} className="text-[11px] font-semibold text-text-secondary">{c}
          <select value={score.ratings[c] ?? ''} onChange={e => onChange({ ratings: { ...score.ratings, [c]: e.target.value ? Number(e.target.value) : undefined } })} className="mt-1 block h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal"><option value="">Not rated</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>
        </label>))}</div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-1"><input type="checkbox" checked={score.critical} onChange={e => onChange({ critical: e.target.checked })} /> Critical misrepresentation (shows a different product than the photo)</label>
        <span role="radiogroup" aria-label="Commercial decision" className="flex gap-1">{(['accept', 'reject'] as const).map(d => <button key={d} type="button" role="radio" aria-checked={score.decision === d} onClick={() => onChange({ decision: score.decision === d ? null : d })} className={`min-h-8 rounded-full border px-3 font-semibold ${score.decision === d ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface'}`}>{d === 'accept' ? 'Accept commercially' : 'Reject commercially'}</button>)}</span>
        <span role="status" className="font-semibold">{score.critical ? 'Overridden: rejected for critical misrepresentation (no score).' : o.value === null ? 'No score yet.' : `Overall ${o.value} / 5${o.rejected ? ' · rejected' : ''}`}</span>
      </div>
    </fieldset>
  )
}
