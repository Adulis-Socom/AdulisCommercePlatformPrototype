import { useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import { PRODUCTS, SHOPPABLE_POSTS, hasAvailableTagAt, isPubliclyEligibleAt, type Moment, type SellerId } from '../../demo-data'
import { isLegacy } from '../../marketplace/registry'
import { addTag, removeTag, replaceTagProduct, tagNumber, type TagState } from '../../scene-tags'
import { hotspotNumber, linkableProducts, sceneIssues, sceneReasons, sceneVisibility, seededSceneTags, toThumbnail, useWorkspace, type SceneVisibility, type WorkspaceState, type WsHotspot, type WsScene } from '../../seller-workspace'
import { Card, Notice, SelectField, Thumb } from './kit'

/** SC-004: Scene authoring. Real photo, caption, same-Seller Product tags with visual hotspots and an accessible list, publication rules, Private state. */

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))
const VISIBILITY: Record<SceneVisibility, string> = { draft: 'Draft', public: 'Public', private: 'Private', archived: 'Archived', restricted: 'Restricted' }
const BADGE: Record<SceneVisibility, string> = { public: 'bg-success-bg', private: 'bg-warning-bg', restricted: 'bg-danger-bg text-danger', draft: 'bg-surface-raised text-text-muted', archived: 'bg-surface-raised text-text-muted' }

export default function SceneAuthoring({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state } = useWorkspace()
  const [editing, setEditing] = useState<{ id: string | null } | null>(null)
  const [notice, setNotice] = useState('')
  const [editingSeeded, setEditingSeeded] = useState<string | null>(null)
  if (editingSeeded) return <SeededSceneEditor key={editingSeeded} sceneId={editingSeeded} sellerId={sellerId} at={at} onBack={() => setEditingSeeded(null)} />
  if (editing) return <SceneEditor key={editing.id ?? 'new'} sellerId={sellerId} at={at} id={editing.id} onBack={m => { setEditing(null); if (m) setNotice(m) }} />
  const scenes = Object.values(state.scenes).filter(s => s.seller === sellerId).sort((a, b) => b.updated - a.updated)
  // FR-001: the marketplace dataset's own Scenes (no photo, tags without coordinates); the Seller edits their tag composition here.
  const seeded = isLegacy ? [] : Object.entries(SHOPPABLE_POSTS).filter(([, p]) => p.seller === sellerId).map(([id]) => id)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-text-muted">A Scene is a photo with a caption and tags for your own in-stock Products. Publishing is simulated.</p><Button onClick={() => { setNotice(''); setEditing({ id: null }) }}>Create Scene</Button></div>
      {notice && <div className="mb-4"><Notice tone="success" role="status">{notice}</Notice></div>}
      {scenes.length === 0 && seeded.length === 0
        ? <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center"><div className="font-display text-lg font-semibold">No Scenes yet</div><p className="mt-1 text-sm text-text-muted">Create a Scene from a photo and tag the Products in it. You need at least one published, in-stock Product first.</p></div>
        : <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{scenes.map(scene => {
          const vis = sceneVisibility(scene, state, at)
          return <li key={scene.id} className="border-t border-border first:border-t-0"><button type="button" onClick={() => setEditing({ id: scene.id })} className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-raised"><Thumb src={scene.image} label={scene.caption || 'Scene'} className="h-14 w-14" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{scene.caption || 'Untitled Scene'}</span><span className="block font-mono text-[10px] text-text-muted">{scene.id} · {scene.tags.length} tag{scene.tags.length === 1 ? '' : 's'}</span>{sceneReasons(scene, state, at)[0] && <span className="block text-xs text-warning">{sceneReasons(scene, state, at)[0]}</span>}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[vis]}`}>{VISIBILITY[vis]}</span></button></li>
        })}</ul>}
      {seeded.length > 0 && <section aria-label="Dataset Scenes" className={scenes.length ? 'mt-6' : ''}>
        <h2 className="font-display text-lg font-semibold">Scenes from your catalogue</h2>
        <p className="mb-2 mt-0.5 max-w-2xl text-xs text-text-muted">These Scenes come with your catalogue. They have no photo yet and their tags have no positions, so each tag is listed with its number. You can change which Products are tagged.</p>
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{seeded.map(id => {
          const label = seededStatus(id, at)
          const post = SHOPPABLE_POSTS[id as keyof typeof SHOPPABLE_POSTS]
          const count = seededSceneTags(state, id).tags.length
          return <li key={id} className="border-t border-border first:border-t-0"><button type="button" aria-label={`${post.title} (${id})`} onClick={() => { setNotice(''); setEditingSeeded(id) }} className="flex w-full items-center gap-4 p-4 text-left hover:bg-surface-raised"><Thumb label={post.title} className="h-14 w-14" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{post.title}</span><span className="block font-mono text-[10px] text-text-muted">{id} · {count} tag{count === 1 ? '' : 's'} · unpositioned</span></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[label]}`}>{VISIBILITY[label]}</span></button></li>
        })}</ul>
      </section>}
    </div>
  )
}

/** A dataset Scene's state for the Seller: its own Draft / Archived / Restricted, else Public while a tagged Product is available and Private when none is. */
function seededStatus(id: string, at: Moment): SceneVisibility {
  const post = SHOPPABLE_POSTS[id as keyof typeof SHOPPABLE_POSTS]
  if (post.publication === 'Draft') return 'draft'
  if (post.publication === 'Archived') return 'archived'
  if (post.restricted) return 'restricted'
  return isPubliclyEligibleAt(id as never, at) && hasAvailableTagAt(id as never, at) ? 'public' : 'private'
}

/**
 * FR-001: one tag row's two actions, shared by both editors: Replace Product (a same-Seller, in-stock Product that is not already tagged in the
 * Scene; the tag keeps its id, position and number) and Remove. `n` is the displayed number.
 */
function TagActions({ n, options, onReplace, onRemove }: { n: number; options: { value: string; label: string }[]; onReplace: (product: string) => string | null; onRemove: () => void }) {
  const [open, setOpen] = useState(false); const [error, setError] = useState('')
  const choose = (value: string) => { if (!value) return; const reason = onReplace(value); setError(reason ?? ''); if (!reason) setOpen(false) }
  return (
    <>
      <Button variant="tertiary" size="sm" aria-expanded={open} aria-label={`Replace Product on tag ${n}`} disabled={!options.length && !open} onClick={() => { setOpen(!open); setError('') }}>Replace Product</Button>
      <Button variant="tertiary" size="sm" aria-label={`Remove tag ${n}`} onClick={onRemove}>Remove</Button>
      {open && <div className="flex w-full flex-wrap items-end gap-2 pl-9"><div className="min-w-56 flex-1"><SelectField label={`Replacement for tag ${n}`} value="" onChange={choose} placeholder="Choose a Product" options={options} error={error || undefined} /></div><Button variant="tertiary" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>}
    </>
  )
}

/** Tag composition of a dataset Scene: edits apply at once (there is no photo or caption to publish) and every surface reads them. */
function SeededSceneEditor({ sceneId, sellerId, at, onBack }: { sceneId: string; sellerId: SellerId; at: Moment; onBack: () => void }) {
  const { state, dispatch } = useWorkspace()
  const post = SHOPPABLE_POSTS[sceneId as keyof typeof SHOPPABLE_POSTS]
  const tags = seededSceneTags(state, sceneId)
  const [pick, setPick] = useState(''); const [banner, setBanner] = useState('')
  const eligible = linkableProducts(state, sellerId, at)
  const free = eligible.filter(p => !tags.tags.some(t => t.product === p.id))
  const choices = free.map(p => ({ value: p.id, label: `${p.name} (${p.stock} in stock)` }))
  const nameOf = (pid: string) => state.products[pid]?.name || PRODUCTS[pid as keyof typeof PRODUCTS]?.name || pid
  const live = new Set(eligible.map(p => p.id))
  const save = (next: TagState, message: string) => { dispatch({ type: 'scene-tags', scene: sceneId, tags: next }); setBanner(message) }
  const visibility = seededStatus(sceneId, at)
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-2xl font-semibold">{post.title} <span className="font-mono text-xs font-normal text-text-muted">{sceneId}</span></h2><Button variant="tertiary" onClick={onBack}>← Back to Scenes</Button></div>
      {banner && <div className="mb-4"><Notice tone="success" role="status">{banner}</Notice></div>}
      <div className="mb-4"><Notice tone="info">{post.caption} <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[visibility]}`}>{VISIBILITY[visibility]}</span><br />The catalogue gives this Scene no photo and no hotspot positions, so none are shown or invented: its tags are listed and numbered in order.</Notice></div>
      <Card step="03" title="Tagged Products" hint="Numbers follow the order below. Removing a tag renumbers the rest; a Product going out of stock never does.">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1"><SelectField label="Product to tag" value={pick} onChange={setPick} placeholder={free.length ? 'Choose a Product' : 'No more eligible Products'} options={choices} disabled={!free.length} /></div>
          <Button variant="secondary" disabled={!pick} onClick={() => { save(addTag(tags, pick, {}), 'Tag added.'); setPick('') }}>Add tag</Button>
        </div>
        {tags.tags.length === 0 && <p className="mt-3 text-sm text-text-muted">No Products are tagged in this Scene.</p>}
        {tags.tags.length > 0 && <ul aria-label="Tags" className="mt-3 flex flex-col gap-2">{tags.tags.map((t, i) => (
          <li key={t.id} data-tag-id={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
            <span data-tag-number className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">{tagNumber(i)}</span>
            <span className="min-w-32 flex-1 text-sm font-semibold">{nameOf(t.product)}{!live.has(t.product) && <span className="ml-2 text-xs font-semibold text-warning">Unavailable now</span>}<span className="ml-2 text-xs font-normal text-text-muted">Unpositioned</span></span>
            <TagActions n={tagNumber(i)} options={choices}
              onReplace={value => { const r = replaceTagProduct(tags, t.id, value, free.map(p => p.id)); if (!r.ok) return r.reason; save(r.state, `Tag ${tagNumber(i)} now shows ${nameOf(value)}.`); return null }}
              onRemove={() => save(removeTag(tags, t.id), `Tag ${tagNumber(i)} removed.`)} />
          </li>
        ))}</ul>}
      </Card>
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
  const reasons = s.id ? sceneReasons({ ...s }, state, at) : []
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
  // FR-001: tags carry an immutable id; the number shown is the tag's place in the list (src/scene-tags.ts).
  const tagState = (): TagState<WsHotspot> => ({ tags: s.tags, next: s.nextTag ?? 1 })
  const applyTags = (next: TagState<WsHotspot>) => set({ tags: next.tags, nextTag: next.next })
  const placeTag = (x = 50, y = 50) => { if (!pick) return; applyTags(addTag(tagState(), pick, { x, y })); setPick('') }
  const onImageClick = (event: MouseEvent<HTMLImageElement>) => { const r = event.currentTarget.getBoundingClientRect(); placeTag(clamp(((event.clientX - r.left) / r.width) * 100), clamp(((event.clientY - r.top) / r.height) * 100)) }
  const moveTag = (i: number, patch: Partial<WsHotspot>) => set({ tags: s.tags.map((t, j) => (j === i ? { ...t, ...patch } : t)) })
  const onTagKey = (i: number, e: KeyboardEvent) => {
    const t = s.tags[i]; const step = e.shiftKey ? 10 : 2
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key as 'ArrowLeft']
    if (d) { e.preventDefault(); moveTag(i, { x: clamp(t.x + d[0]), y: clamp(t.y + d[1]) }) }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); applyTags(removeTag(tagState(), t.id)) }
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
      {s.id && reasons.length > 0 && <div className="mb-4"><Notice tone="warning" role="status" title={`${VISIBILITY[visibility]} right now`}><ul className="list-disc pl-5">{reasons.map(r => <li key={r}>{r}</li>)}</ul>{visibility === 'private' && <p className="mt-1">It becomes public again on its own as soon as every gate passes.</p>}</Notice></div>}
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
              <Button variant="secondary" disabled={!pick || !s.image} onClick={() => placeTag()}>Place at centre</Button>
            </div>
            {eligible.length === 0 && <div className="mt-3"><Notice tone="warning">You have no published, in-stock Products to tag. Publish a Product with stock first.</Notice></div>}
            {!s.image && eligible.length > 0 && <p className="mt-2 text-xs text-text-muted">Choose a photo first to place hotspots.</p>}
            {s.image && (
              <div className="mt-3">
                <div className="relative inline-block max-w-full leading-[0]">
                  <img src={s.image} alt={s.alt || 'Scene photo'} onClick={onImageClick} className={`block max-h-[420px] min-w-56 max-w-full rounded-xl ${pick ? 'cursor-crosshair ring-2 ring-brand' : ''}`} />
                  {s.tags.map((t, i) => <button key={t.id} data-tag-id={t.id} data-tag-number={hotspotNumber(s, i)} type="button" aria-label={`Hotspot ${hotspotNumber(s, i)}: ${nameOf(t.product)}. Arrow keys move it, Delete removes it.`} onKeyDown={e => onTagKey(i, e)} className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold leading-none shadow-md ${availableIds.has(t.product) ? 'bg-brand text-on-brand' : 'bg-text-muted text-white'}`} style={{ left: `${t.x}%`, top: `${t.y}%` }}>{hotspotNumber(s, i)}</button>)}
                </div>
                {pick && <p className="mt-1 text-xs font-semibold text-brand-text" role="status">Click the photo to place “{nameOf(pick)}”.</p>}
              </div>
            )}
            {err('tags') && <p className="mt-2 text-xs text-danger">{err('tags')}</p>}
            {s.tags.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">{s.tags.map((t, i) => (
                <li key={t.id} data-tag-id={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                  <span data-tag-number className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-on-brand">{hotspotNumber(s, i)}</span>
                  <span className="min-w-32 flex-1 text-sm font-semibold">{nameOf(t.product)}{!availableIds.has(t.product) && <span className="ml-2 text-xs font-semibold text-warning">Unavailable now</span>}</span>
                  <label className="text-xs">X % <input type="number" min={0} max={100} value={t.x} onChange={e => moveTag(i, { x: clamp(Number(e.target.value)) })} className="ml-1 h-9 w-16 rounded-lg border border-border px-2" aria-label={`Hotspot ${hotspotNumber(s, i)} horizontal position, percent`} /></label>
                  <label className="text-xs">Y % <input type="number" min={0} max={100} value={t.y} onChange={e => moveTag(i, { y: clamp(Number(e.target.value)) })} className="ml-1 h-9 w-16 rounded-lg border border-border px-2" aria-label={`Hotspot ${hotspotNumber(s, i)} vertical position, percent`} /></label>
                  <TagActions n={hotspotNumber(s, i)} options={untagged.map(p => ({ value: p.id, label: `${p.name} (${p.stock} in stock)` }))}
                    onReplace={value => { const r = replaceTagProduct(tagState(), t.id, value, untagged.map(p => p.id)); if (!r.ok) return r.reason; applyTags(r.state); return null }}
                    onRemove={() => applyTags(removeTag(tagState(), t.id))} />
                </li>
              ))}</ul>
            )}
          </Card>
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 py-3 backdrop-blur">
            {s.status === 'draft' && <><Button variant="secondary" onClick={saveDraft}>Save draft</Button><Button onClick={publish}>Publish Scene</Button></>}
            {s.status === 'published' && <><Button onClick={publish} disabled={!dirty}>Save changes</Button><Button variant="tertiary" onClick={() => persist('draft', 'Returned to draft. Buyers no longer see this Scene.')}>Return to draft</Button><Button variant="tertiary" onClick={() => persist('archived', 'Archived. Buyers no longer see this Scene; return it to draft to publish it again.')}>Archive</Button></>}
            {s.status === 'archived' && <Button variant="secondary" onClick={() => persist('draft', 'Returned to draft. Edit it, then publish again.')}>Return to draft</Button>}
            {s.id && s.status === 'draft' && <Button variant="tertiary" onClick={() => { dispatch({ type: 'remove', collection: 'scenes', id: s.id }); onBack('Draft deleted.') }}>Delete draft</Button>}
            <span role="status" className="text-xs text-text-muted">{dirty ? 'Unsaved changes' : s.id ? 'All changes saved' : ''}</span>
          </div>
        </div>
        <ScenePreview s={s} state={state} at={at} visibility={visibility} nameOf={nameOf} />
      </div>
    </div>
  )
}

function ScenePreview({ s, state, at, visibility, nameOf }: { s: WsScene; state: WorkspaceState; at: Moment; visibility: SceneVisibility; nameOf: (id: string) => string }) {
  const ok = new Set(linkableProducts(state, s.seller, at).map(p => p.id))
  return (
    <aside aria-label="Scene preview" className="h-fit rounded-2xl border border-border bg-surface p-4 lg:sticky lg:top-4">
      <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">Buyer preview · simulated</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[visibility]}`}>{VISIBILITY[visibility]}</span></div>
      <div className="relative overflow-hidden rounded-xl bg-surface-raised leading-[0]">
        {s.image ? <img src={s.image} alt={s.alt || 'Scene photo'} className="block w-full" /> : <div className="flex aspect-[4/5] items-center justify-center text-xs leading-normal text-text-muted">No photo yet</div>}
        {s.image && s.tags.filter(t => ok.has(t.product)).map(t => <span key={t.id} aria-hidden="true" className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-brand text-[10px] font-bold leading-none text-on-brand" style={{ left: `${t.x}%`, top: `${t.y}%` }}>{hotspotNumber(s, s.tags.indexOf(t))}</span>)}
      </div>
      <p className="mt-3 text-sm leading-relaxed">{s.caption || 'Your caption appears here.'}</p>
      {s.tags.some(t => ok.has(t.product)) && <ul className="mt-2 text-xs text-text-secondary">{s.tags.filter(t => ok.has(t.product)).map(t => <li key={t.product}>{hotspotNumber(s, s.tags.indexOf(t))} · {nameOf(t.product)}</li>)}</ul>}
      <p className="mt-3 text-[11px] text-text-muted">Products out of stock are not shown as tags. A Scene with no available tagged Product is Private.</p>
    </aside>
  )
}
