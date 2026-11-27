import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import { type Moment, type SellerId } from '../../demo-data'
import { linkableProducts, sceneIssues, sceneVisibility, toThumbnail, useWorkspace, type WorkspaceState, type WsHotspot, type WsScene } from '../../seller-workspace'
import { Card, Notice, SelectField, Thumb } from './kit'

/** SC-004: Scene authoring. Real photo, caption, same-Seller Product tags with visual hotspots and an accessible list, publication rules, Private state. */

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))
const VISIBILITY = { draft: 'Draft', public: 'Public', private: 'Private' } as const

export default function SceneAuthoring({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state } = useWorkspace()
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [notice, setNotice] = useState('')
  if (editing) return <SceneEditor key={editing.id ?? 'new'} sellerId={sellerId} at={at} id={editing.id} onBack={m => { setEditing(null); if (m) setNotice(m) }} />
  const scenes = Object.values(state.scenes).filter(s => s.seller === sellerId).sort((a, b) => b.updated - a.updated)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-text-muted">A Scene is a photo with a caption and tags for your own in-stock Products. Publishing is simulated.</p><Button onClick={() => { setNotice(''); setEditing({ id: null }) }}>Create Scene</Button></div>
      {notice && <div className="mb-4"><Notice tone="success" role="status">{notice}</Notice></div>}
      {scenes.length === 0
        ? <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center"><div className="font-display text-lg font-semibold">No Scenes yet</div><p className="mt-1 text-sm text-text-muted">Create a Scene from a photo and tag the Products in it. You need at least one published, in-stock Product first.</p></div>
        : <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{scenes.map(scene => {
          const vis = sceneVisibility(scene, state, at)
          return <li key={scene.id} className="border-t border-border first:border-t-0"><button type="button" onClick={() => setEditing({ id: scene.id })} className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-raised"><Thumb src={scene.image} label={scene.caption || 'Scene'} className="h-14 w-14" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{scene.caption || 'Untitled Scene'}</span><span className="block font-mono text-[10px] text-text-muted">{scene.id} · {scene.tags.length} tag{scene.tags.length === 1 ? '' : 's'}</span></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${vis === 'public' ? 'bg-success-bg' : vis === 'private' ? 'bg-warning-bg' : 'bg-surface-raised text-text-muted'}`}>{VISIBILITY[vis]}</span></button></li>
        })}</ul>}
    </div>
  )
}

function SceneEditor({ sellerId, at, id, onBack }: { sellerId: SellerId; at: Moment; id: string | null; onBack: (message?: string) => void }) {
  const { state, dispatch, next } = useWorkspace()
  const initial: WsScene = useMemo(() => (id && state.scenes[id]) || { id: '', seller: sellerId, status: 'draft', caption: '', image: null, alt: '', tags: [], updated: 0 }, [])
  const [s, setS] = useState<WsScene>(initial)
  const baseline = useRef(JSON.stringify(initial))
  const [attempted, setAttempted] = useState(false)
  const [banner, setBanner] = useState(''); const [fileError, setFileError] = useState('')
  const [pick, setPick] = useState(''); const [leave, setLeave] = useState(false)
  const summary = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<WsScene>) => setS(prev => ({ ...prev, ...patch }))
  const eligible = linkableProducts(state, sellerId, at)
  const nameOf = (pid: string) => linkableProducts(state, sellerId, at, true).find(p => p.id === pid)?.name ?? pid
  const availableIds = new Set(eligible.map(p => p.id))
  const visibility = sceneVisibility({ ...s, status: s.status }, state, at)
  const dirty = JSON.stringify(s) !== baseline.current
  const errors = attempted ? sceneIssues(s, state, at) : []
  const err = (f: string) => errors.find(e => e.field === f)?.message
  const untagged = eligible.filter(p => !s.tags.some(t => t.product === p.id))

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) { setFileError('Choose a JPEG, PNG or WebP photo. Video is not supported.'); return }
    if (file.size > MAX_BYTES) { setFileError('That photo is larger than 10 MB.'); return }
    setFileError(''); set({ image: await toThumbnail(file, 900) })
  }
  const addTag = (x = 50, y = 50) => { if (!pick) return; set({ tags: [...s.tags, { product: pick, x, y }] }); setPick('') }
  const onImageClick = (event: MouseEvent<HTMLImageElement>) => { const r = event.currentTarget.getBoundingClientRect(); addTag(clamp(((event.clientX - r.left) / r.width) * 100), clamp(((event.clientY - r.top) / r.height) * 100)) }
  const moveTag = (i: number, patch: Partial<WsHotspot>) => set({ tags: s.tags.map((t, j) => (j === i ? { ...t, ...patch } : t)) })
  const onTagKey = (i: number, e: KeyboardEvent) => {
    const t = s.tags[i]; const step = e.shiftKey ? 10 : 2
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key as 'ArrowLeft']
    if (d) { e.preventDefault(); moveTag(i, { x: clamp(t.x + d[0]), y: clamp(t.y + d[1]) }) }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); set({ tags: s.tags.filter((_, j) => j !== i) }) }
  }

  const persist = (status: WsScene['status'], message: string) => {
    const saved = { ...s, id: s.id || next('scene'), status, updated: Date.now() }
    dispatch({ type: 'scene', item: saved }); setS(saved); baseline.current = JSON.stringify(saved); setAttempted(false); setBanner(message)
  }
  const saveDraft = () => persist('draft', 'Draft saved. Nothing is visible to Buyers.')
  const publish = () => {
    const issues = sceneIssues(s, state, at)
    if (issues.length) { setAttempted(true); setBanner(''); requestAnimationFrame(() => summary.current?.focus()); return }
    persist('published', s.status === 'published' ? 'Changes saved.' : 'Published (simulated). Buyers see this Scene while at least one tagged Product is in stock.')
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-2xl font-semibold">{id ? 'Edit Scene' : 'Create Scene'} <span className="font-mono text-xs font-normal text-text-muted">{s.id || 'New'}</span></h2><Button variant="tertiary" onClick={() => (dirty ? setLeave(true) : onBack())}>← Back to Scenes</Button></div>
      {leave && <div className="mb-4"><Notice tone="warning" role="alert" title="Leave without saving?"><div className="mt-2 flex gap-2"><Button size="sm" onClick={() => onBack()}>Discard changes</Button><Button size="sm" variant="tertiary" onClick={() => setLeave(false)}>Keep editing</Button></div></Notice></div>}
      {banner && <div className="mb-4"><Notice tone="success" role="status">{banner}</Notice></div>}
      {s.status === 'published' && visibility === 'private' && <div className="mb-4"><Notice tone="warning" role="status" title="Private right now">Every Product tagged here is out of stock or unpublished, so Buyers cannot see this Scene. It becomes public again on its own as soon as a tagged Product is back in stock.</Notice></div>}
      {errors.length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg p-4 text-sm outline-none"><div className="font-semibold">{errors.length} thing{errors.length === 1 ? '' : 's'} to fix before publishing</div><ul className="mt-1 list-disc pl-5">{errors.map(e => <li key={e.field}>{e.message}</li>)}</ul></div>}
      <div className="grid grid-cols-[1.2fr_.8fr] gap-5 max-lg:grid-cols-1">
        <div className="flex flex-col gap-5">
          <Card step="01" title="Photo" hint="One photo, shown as you upload it. Backgrounds are never removed automatically, and video is not supported.">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-raised">{s.image ? 'Replace photo' : 'Choose photo'}<input type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={e => { void onFile(e.target.files?.[0]); e.target.value = '' }} /></label>
              {s.image && <Button variant="tertiary" size="sm" onClick={() => set({ image: null })}>Remove photo</Button>}
            </div>
            {fileError && <p role="alert" className="mt-2 text-xs text-danger">{fileError}</p>}
            {err('image') && <p className="mt-2 text-xs text-danger">{err('image')}</p>}
            {s.image && <div className="mt-3"><TextInput label="Photo description (for people who cannot see it)" value={s.alt} error={err('alt')} onChange={e => set({ alt: e.target.value })} maxLength={140} placeholder="e.g. A woman in a white linen dress on a balcony" /></div>}
          </Card>
          <Card step="02" title="Caption">
            <Textarea label="Caption" value={s.caption} error={err('caption')} onChange={e => set({ caption: e.target.value })} rows={3} maxLength={300} hint={`${s.caption.length} / 300`} />
          </Card>
          <Card step="03" title="Tag your Products" hint="Choose a Product, then click the photo to place its hotspot, or use the buttons and position fields. Only your published, in-stock Products can be tagged.">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-56 flex-1"><SelectField label="Product to tag" value={pick} onChange={setPick} placeholder={untagged.length ? 'Choose a Product' : 'No more eligible Products'} options={untagged.map(p => ({ value: p.id, label: `${p.name} (${p.stock} in stock)` }))} disabled={!untagged.length} /></div>
              <Button variant="secondary" disabled={!pick || !s.image} onClick={() => addTag()}>Place at centre</Button>
            </div>
            {eligible.length === 0 && <div className="mt-3"><Notice tone="warning">You have no published, in-stock Products to tag. Publish a Product with stock first.</Notice></div>}
            {!s.image && eligible.length > 0 && <p className="mt-2 text-xs text-text-muted">Choose a photo first to place hotspots.</p>}
            {s.image && (
              <div className="mt-3">
                <div className="relative inline-block max-w-full leading-[0]">
                  <img src={s.image} alt={s.alt || 'Scene photo'} onClick={onImageClick} className={`block max-h-[420px] min-w-56 max-w-full rounded-xl ${pick ? 'cursor-crosshair ring-2 ring-brand' : ''}`} />
                  {s.tags.map((t, i) => <button key={i} type="button" aria-label={`Hotspot ${i + 1}: ${nameOf(t.product)}. Arrow keys move it, Delete removes it.`} onKeyDown={e => onTagKey(i, e)} className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold leading-none shadow-md ${availableIds.has(t.product) ? 'bg-brand text-on-brand' : 'bg-text-muted text-white'}`} style={{ left: `${t.x}%`, top: `${t.y}%` }}>{i + 1}</button>)}
                </div>
                {pick && <p className="mt-1 text-xs font-semibold text-brand-text" role="status">Click the photo to place “{nameOf(pick)}”.</p>}
              </div>
            )}
            {err('tags') && <p className="mt-2 text-xs text-danger">{err('tags')}</p>}
            {s.tags.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">{s.tags.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">{i + 1}</span>
                  <span className="min-w-32 flex-1 text-sm font-semibold">{nameOf(t.product)}{!availableIds.has(t.product) && <span className="ml-2 text-xs font-semibold text-warning">Unavailable now</span>}</span>
                  <label className="text-xs">X % <input type="number" min={0} max={100} value={t.x} onChange={e => moveTag(i, { x: clamp(Number(e.target.value)) })} className="ml-1 h-9 w-16 rounded-lg border border-border px-2" aria-label={`Hotspot ${i + 1} horizontal position, percent`} /></label>
                  <label className="text-xs">Y % <input type="number" min={0} max={100} value={t.y} onChange={e => moveTag(i, { y: clamp(Number(e.target.value)) })} className="ml-1 h-9 w-16 rounded-lg border border-border px-2" aria-label={`Hotspot ${i + 1} vertical position, percent`} /></label>
                  <Button variant="tertiary" size="sm" aria-label={`Remove tag ${i + 1}`} onClick={() => set({ tags: s.tags.filter((_, j) => j !== i) })}>Remove</Button>
                </li>
              ))}</ul>
            )}
          </Card>
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 py-3 backdrop-blur">
            {s.status === 'draft' ? <><Button variant="secondary" onClick={saveDraft}>Save draft</Button><Button onClick={publish}>Publish Scene</Button></> : <><Button onClick={publish} disabled={!dirty}>Save changes</Button><Button variant="tertiary" onClick={() => persist('draft', 'Returned to draft. Buyers no longer see this Scene.')}>Return to draft</Button></>}
            {s.id && s.status === 'draft' && <Button variant="tertiary" onClick={() => { dispatch({ type: 'remove', collection: 'scenes', id: s.id }); onBack('Draft deleted.') }}>Delete draft</Button>}
            <span role="status" className="text-xs text-text-muted">{dirty ? 'Unsaved changes' : s.id ? 'All changes saved' : ''}</span>
          </div>
        </div>
        <ScenePreview s={s} state={state} at={at} visibility={visibility} nameOf={nameOf} />
      </div>
    </div>
  )
}

function ScenePreview({ s, state, at, visibility, nameOf }: { s: WsScene; state: WorkspaceState; at: Moment; visibility: 'draft' | 'public' | 'private'; nameOf: (id: string) => string }) {
  const ok = new Set(linkableProducts(state, s.seller, at).map(p => p.id))
  return (
    <aside aria-label="Scene preview" className="h-fit rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-4">
      <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Buyer preview · simulated</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${visibility === 'public' ? 'bg-success-bg' : visibility === 'private' ? 'bg-warning-bg' : 'bg-surface-raised text-text-muted'}`}>{VISIBILITY[visibility]}</span></div>
      <div className="relative overflow-hidden rounded-xl bg-surface-raised leading-[0]">
        {s.image ? <img src={s.image} alt={s.alt || 'Scene photo'} className="block w-full" /> : <div className="flex aspect-[4/5] items-center justify-center text-xs leading-normal text-text-muted">No photo yet</div>}
        {s.image && s.tags.filter(t => ok.has(t.product)).map((t, i) => <span key={i} aria-hidden="true" className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand text-[10px] font-bold leading-none text-on-brand" style={{ left: `${t.x}%`, top: `${t.y}%` }}>{s.tags.indexOf(t) + 1}</span>)}
      </div>
      <p className="mt-3 text-sm leading-relaxed">{s.caption || 'Your caption appears here.'}</p>
      {s.tags.some(t => ok.has(t.product)) && <ul className="mt-2 text-xs text-text-secondary">{s.tags.filter(t => ok.has(t.product)).map(t => <li key={t.product}>{s.tags.indexOf(t) + 1} · {nameOf(t.product)}</li>)}</ul>}
      <p className="mt-3 text-[11px] text-text-muted">Products out of stock are not shown as tags. A Scene with no available tagged Product is Private.</p>
    </aside>
  )
}
