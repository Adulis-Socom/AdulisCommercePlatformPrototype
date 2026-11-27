import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Button } from '../components/ui/Button'

/**
 * Seller Console › Products › Media: real photo drafts with an experimental, genuinely local background remover.
 * Drafts live in this component's state only (nothing is uploaded or saved). The remover talks to the loopback adapter in
 * tools/bg-removal; the Product Editor works without it. The component is keyed by Seller and Product, so a Seller or
 * Product switch unmounts it: the in-flight request is aborted, a late result is ignored and every object URL is revoked.
 */

const ADAPTER = 'http://127.0.0.1:8765'
// `admitted` mirrors the status in tools/bg-removal/models.json. The adapter enforces it on its own (403); this flag only
// keeps the UI honest and avoids contacting the adapter for a model that cannot run. Set it true only when models.json does.
const MODELS = [{ id: 'u2netp', label: 'U2-Net-P (lightweight)', admitted: false }]
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const MAX_ITEMS = 5
const REQUEST_LIMIT_MS = 70_000
const TOKEN_KEY = 'adulis.bg-adapter-token'

type Meta = { model: string; inferenceMs: number; loadMs: number; peakMb: number; provider: string; size: string }
type Photo = { url: string; blob: Blob }
type Draft = { id: number; name: string; saved?: string; original?: Photo; edited?: Photo & { meta: Meta }; showing: 'original' | 'edited' }
type Session =
  | { status: 'idle'; note?: string }
  | { status: 'processing' }
  | { status: 'done'; result: Photo & { meta: Meta } }
  | { status: 'error'; message: string }
type Adapter = 'checking' | 'offline' | 'ready' | 'unavailable'
type Backdrop = 'checker' | 'white' | 'dark'

const BACKDROPS: { id: Backdrop; label: string; style: CSSProperties }[] = [
  { id: 'checker', label: 'Transparent', style: { backgroundColor: '#fff', backgroundImage: 'conic-gradient(#d4d4d4 25%, #fff 0 50%, #d4d4d4 0 75%, #fff 0)', backgroundSize: '16px 16px' } },
  { id: 'white', label: 'White', style: { backgroundColor: '#ffffff' } },
  { id: 'dark', label: 'Dark', style: { backgroundColor: '#2b2b2b' } },
]

const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' } }
const storeToken = (value: string) => { try { sessionStorage.setItem(TOKEN_KEY, value) } catch { /* the token is just not remembered */ } }
const shown = (draft: Draft) => (draft.showing === 'edited' && draft.edited ? draft.edited : draft.original)

export function ProductMediaEditor({ placeholders, onCover, saved, onPhotos }: { placeholders: number; onCover: (url: string | null) => void; saved?: string[]; onPhotos?: (photos: { blob: Blob; src?: string }[]) => void }) {
  const nextId = useRef(placeholders)
  const [drafts, setDrafts] = useState<Draft[]>(() => Array.from({ length: placeholders }, (_, id) => ({ id, name: `Demo placeholder ${id + 1}`, showing: 'original' as const })))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [session, setSession] = useState<Session>({ status: 'idle' })
  const [adapter, setAdapter] = useState<Adapter>('checking')
  const [token, setToken] = useState(readToken)
  const [model, setModel] = useState(MODELS[0].id)
  const [backdrop, setBackdrop] = useState<Backdrop>('checker')
  const [elapsed, setElapsed] = useState(0)
  const [notice, setNotice] = useState('')
  const urls = useRef(new Set<string>())
  const run = useRef(0)
  const request = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const replacing = useRef<number | null>(null)

  const track = (blob: Blob): Photo => { const url = URL.createObjectURL(blob); urls.current.add(url); return { url, blob } }
  const release = (photo?: Photo) => { if (photo && urls.current.delete(photo.url)) URL.revokeObjectURL(photo.url) }

  // Invalidates whatever is in flight or showing: a late response from an earlier run can no longer land.
  const reset = useCallback((note?: string) => {
    run.current += 1
    request.current?.abort()
    request.current = null
    setSession(previous => { if (previous.status === 'done') { if (urls.current.delete(previous.result.url)) URL.revokeObjectURL(previous.result.url) } return { status: 'idle', note } })
  }, [])

  useEffect(() => () => {
    run.current += 1
    request.current?.abort()
    urls.current.forEach(url => URL.revokeObjectURL(url))
    urls.current.clear()
  }, [])

  const cover = drafts.map(shown).find(Boolean)?.url ?? null
  useEffect(() => { onCover(cover) }, [cover, onCover])

  // SC-002: photos saved in the Seller workspace (thumbnails) come back as drafts once; the shown photos are reported upward,
  // with the saved source for an untouched one so it is not re-encoded. Nothing is reported until the saved photos have loaded.
  const [savedReady, setSavedReady] = useState(!saved?.length)
  useEffect(() => {
    if (!saved?.length) return
    let live = true
    Promise.all(saved.map(async src => ({ src, blob: await (await fetch(src)).blob() }))).then(items => {
      if (!live) return
      setDrafts(list => [...list, ...items.map(({ src, blob }, index) => ({ id: nextId.current++, name: `Saved photo ${index + 1}`, saved: src, original: track(blob), showing: 'original' as const }))].slice(0, MAX_ITEMS))
      setSavedReady(true)
    }).catch(() => setSavedReady(true))
    return () => { live = false }
  }, [])
  useEffect(() => {
    if (!savedReady || !onPhotos) return
    onPhotos(drafts.flatMap(draft => { const photo = shown(draft); return photo ? [{ blob: photo.blob, src: photo === draft.original ? draft.saved : undefined }] : [] }))
  }, [drafts, savedReady])

  const editing = drafts.find(draft => draft.id === editingId && draft.original)

  const modelAdmitted = MODELS.find(entry => entry.id === model)?.admitted === true
  const unavailable = !modelAdmitted || adapter === 'unavailable'

  const checkAdapter = useCallback(async () => {
    if (!modelAdmitted) { setAdapter('unavailable'); return } // no request is made for a model that may not run
    setAdapter('checking')
    try {
      const response = await fetch(`${ADAPTER}/health`, { signal: AbortSignal.timeout(3000) })
      const body = await response.json()
      const entry = response.ok ? (body.models as { id: string; ready: boolean; status?: string }[] | undefined)?.find(item => item.id === model) : undefined
      setAdapter(entry && entry.status !== undefined && entry.status !== 'admitted' ? 'unavailable' : entry?.ready ? 'ready' : 'offline')
    } catch { setAdapter('offline') }
  }, [model, modelAdmitted])
  useEffect(() => { if (editing) void checkAdapter() }, [editing?.id, checkAdapter])

  useEffect(() => {
    if (session.status !== 'processing') return
    const started = performance.now()
    setElapsed(0)
    const timer = setInterval(() => setElapsed(performance.now() - started), 100)
    return () => clearInterval(timer)
  }, [session.status])

  const accept = (file: File | undefined): Blob | null => {
    if (!file) return null
    if (!ACCEPT.includes(file.type)) { setNotice('Choose a JPEG, PNG or WebP photo.'); return null }
    if (file.size > MAX_BYTES) { setNotice('That photo is larger than 10 MB. Choose a smaller one.'); return null }
    setNotice('')
    return file
  }

  const onFile = (file: File | undefined) => {
    const blob = accept(file)
    const target = replacing.current
    replacing.current = null
    if (!blob || !file) return
    if (target === null) {
      const id = nextId.current++
      setDrafts(list => (list.length >= MAX_ITEMS ? list : [...list, { id, name: file.name, original: track(blob), showing: 'original' }]))
      return
    }
    const old = drafts.find(draft => draft.id === target)
    release(old?.original); release(old?.edited)
    if (editingId === target) reset()
    setDrafts(list => list.map(draft => (draft.id === target ? { id: target, name: file.name, original: track(blob), showing: 'original' } : draft)))
  }

  const remove = (id: number) => {
    const old = drafts.find(draft => draft.id === id)
    release(old?.original); release(old?.edited)
    if (editingId === id) { reset(); setEditingId(null) }
    setDrafts(list => list.filter(draft => draft.id !== id))
  }

  const select = (id: number) => { if (id !== editingId) { reset(); setEditingId(id) } }
  const close = () => { reset(); setEditingId(null) }

  const start = async () => {
    if (!editing?.original) return
    const mine = ++run.current
    const controller = new AbortController()
    request.current?.abort()
    request.current = controller
    const limit = setTimeout(() => controller.abort(), REQUEST_LIMIT_MS)
    setSession({ status: 'processing' })
    try {
      const response = await fetch(`${ADAPTER}/remove?model=${encodeURIComponent(model)}`, { method: 'POST', body: editing.original.blob, headers: { 'X-Adulis-Token': token.trim(), 'Content-Type': editing.original.blob.type }, signal: controller.signal })
      if (!response.ok) {
        const message = (await response.json().catch(() => null))?.error as string | undefined
        throw new Error(response.status === 401 ? 'The adapter did not accept that token. Copy it again from the adapter window.' : message ?? `The adapter answered ${response.status}.`)
      }
      const blob = await response.blob()
      if (mine !== run.current) return // cancelled, or the selection changed: this result is stale
      const header = (name: string) => response.headers.get(name) ?? ''
      const meta: Meta = { model: header('X-Model'), inferenceMs: Number(header('X-Inference-Ms')), loadMs: Number(header('X-Load-Ms')), peakMb: Number(header('X-Peak-Rss-Mb')), provider: header('X-Provider'), size: header('X-Input-Size') }
      setSession({ status: 'done', result: { ...track(blob), meta } })
    } catch (error) {
      if (mine !== run.current) return
      const timedOut = controller.signal.aborted
      setSession({ status: 'error', message: timedOut ? 'This is taking too long, so the request was stopped. Your original photo is unchanged.' : error instanceof TypeError ? 'Could not reach the adapter. Check that it is running, then try again.' : (error as Error).message })
      if (error instanceof TypeError) setAdapter('offline')
    } finally {
      clearTimeout(limit)
      if (request.current === controller) request.current = null
    }
  }

  const adopt = () => {
    if (session.status !== 'done' || !editing) return
    release(editing.edited)
    setDrafts(list => list.map(draft => (draft.id === editing.id ? { ...draft, edited: session.result, showing: 'edited' } : draft)))
    setSession({ status: 'idle', note: 'Edited photo is now the draft image.' }) // the URL now belongs to the draft
  }

  const restore = () => {
    if (!editing) return
    release(editing.edited)
    setDrafts(list => list.map(draft => (draft.id === editing.id ? { id: draft.id, name: draft.name, original: draft.original, showing: 'original' } : draft)))
    setSession({ status: 'idle', note: 'Original photo restored.' })
  }

  const onPanelKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); close() } }
  const backdropStyle = BACKDROPS.find(entry => entry.id === backdrop)!.style
  const busy = session.status === 'processing'

  return (
    <div>
      <input ref={fileInput} type="file" accept={ACCEPT.join(',')} className="sr-only" tabIndex={-1} aria-hidden="true" onChange={event => { onFile(event.target.files?.[0]); event.target.value = '' }} />
      <div className="grid grid-cols-5 gap-3">
        {drafts.map((draft, index) => {
          const photo = shown(draft)
          const size = index === 0 ? 'h-56' : 'h-32'
          return (
            <div key={draft.id} className="relative">
              {photo ? (
                <button type="button" onClick={() => select(draft.id)} aria-pressed={draft.id === editingId} aria-label={`Edit photo ${index + 1}: ${draft.name}${draft.showing === 'edited' ? ', background removed' : ''}`} className={`block w-full overflow-hidden rounded-xl border-2 ${draft.id === editingId ? 'border-brand' : 'border-transparent'}`} style={draft.showing === 'edited' ? BACKDROPS[0].style : { backgroundColor: 'var(--color-surface-raised)' }}>
                  <img src={photo.url} alt={draft.name} className={`${size} w-full object-contain`} />
                </button>
              ) : (
                <div className={`${size} rounded-xl bg-gradient-to-br from-brand-muted to-warning-bg`} role="img" aria-label={draft.name} />
              )}
              {draft.showing === 'edited' && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-text-inverse">Background removed</span>}
              <button type="button" onClick={() => remove(draft.id)} aria-label={`Remove photo ${index + 1}`} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-surface text-sm font-semibold text-text-secondary shadow-sm">×</button>
            </div>
          )
        })}
        {drafts.length < MAX_ITEMS && <button type="button" onClick={() => { replacing.current = null; fileInput.current?.click() }} className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-raised px-1 text-center text-sm font-semibold leading-tight text-text-muted">+ Add media</button>}
      </div>
      <p className="mt-2 text-[11px] text-text-muted">JPEG, PNG or WebP, up to 10 MB each. Photos stay in this draft: nothing is uploaded or saved. Select a photo to edit it.</p>
      <p role="status" className="mt-1 min-h-4 text-xs font-semibold text-warning">{notice}</p>

      {editing?.original && (
        <div onKeyDown={onPanelKey} className="mt-3 rounded-2xl border border-border bg-surface-raised p-4" role="group" aria-label={`Edit photo: ${editing.name}`}>
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="font-display text-base font-semibold">Remove background</h3><p className="text-xs text-text-muted">Experimental. Runs on this computer only; the photo is not sent to any online service. {editing.name}</p></div>
            <div className="flex shrink-0 gap-2"><Button size="sm" variant="tertiary" onClick={() => { replacing.current = editing.id; fileInput.current?.click() }}>Replace photo</Button><Button size="sm" variant="tertiary" onClick={close}>Done</Button></div>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-text-secondary">Model
              <select value={model} disabled={busy} onChange={event => { setModel(event.target.value); reset() }} className="mt-1 block h-10 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-text-primary">
                {MODELS.map(entry => <option key={entry.id} value={entry.id}>{entry.label}{entry.admitted ? '' : ' (unavailable)'}</option>)}
              </select>
            </label>
            <label className="min-w-48 flex-1 text-xs font-semibold text-text-secondary">Adapter token
              <input value={token} disabled={busy || unavailable} onChange={event => { setToken(event.target.value); storeToken(event.target.value) }} placeholder="Paste the token the adapter printed" autoComplete="off" spellCheck={false} className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 font-mono text-xs text-text-primary" />
            </label>
            {busy
              ? <Button variant="secondary" onClick={() => reset('Cancelled. Your original photo is unchanged.')}>Cancel</Button>
              : <Button onClick={start} disabled={unavailable || adapter !== 'ready' || !token.trim()}>{session.status === 'done' || session.status === 'error' ? 'Retry' : 'Remove background'}</Button>}
          </div>

          <p role="status" className={`mb-3 text-xs ${adapter === 'ready' && !unavailable ? 'text-success' : 'text-text-muted'}`}>
            {unavailable && <><span className="font-semibold text-text-primary">This model is unavailable.</span> Adulis has not confirmed permission to use this exact model file, so background removal is switched off and nothing is run or sent anywhere. Your photo is unchanged, and you can keep adding, replacing and previewing photos as usual.</>}
            {!unavailable && adapter === 'checking' && 'Checking for the local adapter…'}
            {!unavailable && adapter === 'ready' && 'Local adapter connected.'}
            {!unavailable && adapter === 'offline' && <>The local adapter is not running. Start it (see tools/bg-removal/README.md), then <button type="button" onClick={checkAdapter} className="font-semibold text-brand-text underline">check again</button>. The rest of the Product Editor works without it.</>}
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <figure>
              <figcaption className="mb-1.5 flex h-8 items-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">Original</figcaption>
              <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl border border-border bg-surface"><img src={editing.original.url} alt={`Original: ${editing.name}`} className="max-h-full max-w-full object-contain" /></div>
            </figure>
            <figure>
              <figcaption className="mb-1.5 flex h-8 items-center justify-between gap-2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                <span>{session.status === 'done' ? 'Result' : editing.showing === 'edited' ? 'Draft photo' : 'Result'}</span>
                <span role="radiogroup" aria-label="Preview background" className="flex gap-1 normal-case tracking-normal">
                  {BACKDROPS.map(entry => <button key={entry.id} type="button" role="radio" aria-checked={backdrop === entry.id} onClick={() => setBackdrop(entry.id)} className={`min-h-8 rounded-full border px-2.5 text-[11px] font-semibold ${backdrop === entry.id ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{entry.label}</button>)}
                </span>
              </figcaption>
              <div className="flex h-72 items-center justify-center overflow-hidden rounded-xl border border-border" style={backdropStyle}>
                {session.status === 'done' && <img src={session.result.url} alt={`Background removed: ${editing.name}`} className="max-h-full max-w-full object-contain" />}
                {session.status !== 'done' && editing.showing === 'edited' && editing.edited && <img src={editing.edited.url} alt={`Current draft with background removed: ${editing.name}`} className="max-h-full max-w-full object-contain" />}
                {session.status !== 'done' && !(editing.showing === 'edited' && editing.edited) && (
                  <div role="status" className="px-6 text-center text-xs font-medium text-text-secondary" style={{ background: 'var(--color-surface)', borderRadius: 12, padding: 12 }}>
                    {busy ? <>Removing the background… <span className="font-mono">{(elapsed / 1000).toFixed(1)} s</span></> : session.status === 'error' ? <span className="text-danger">{session.message}</span> : session.note ?? (unavailable ? 'Background removal is unavailable, so there is no result to show.' : 'Run “Remove background” to see the result here.')}
                  </div>
                )}
              </div>
            </figure>
          </div>

          {session.status === 'done' && (
            <div className="mt-3">
              <p className="font-mono text-[11px] text-text-secondary">{session.result.meta.model} · {session.result.meta.inferenceMs} ms inference · {session.result.meta.loadMs ? `model load ${session.result.meta.loadMs} ms · ` : ''}adapter peak memory {session.result.meta.peakMb} MB · {session.result.meta.provider === 'CPUExecutionProvider' ? 'CPU' : session.result.meta.provider} · {session.result.meta.size}</p>
              <div className="mt-3 flex flex-wrap gap-2"><Button onClick={adopt}>Use edited photo</Button><Button variant="tertiary" onClick={() => reset('Kept the original photo.')}>Keep original</Button><Button variant="secondary" onClick={start} disabled={adapter !== 'ready'}>Retry</Button></div>
            </div>
          )}
          {session.status !== 'done' && editing.showing === 'edited' && <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-success">Using the edited photo in this draft.</span><Button size="sm" variant="tertiary" onClick={restore}>Restore original</Button></div>}
          {session.status === 'idle' && session.note && editing.showing === 'edited' && <p role="status" className="mt-2 text-xs text-text-muted">{session.note}</p>}
        </div>
      )}
    </div>
  )
}
