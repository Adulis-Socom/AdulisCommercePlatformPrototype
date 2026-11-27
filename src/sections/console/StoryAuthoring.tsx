import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Input'
import { type Moment, type SellerId } from '../../demo-data'
import { STORY_LIFETIME_HOURS, linkableProducts, readiness, sceneVisibility, storyPhase, toThumbnail, useWorkspace, type StoryPhase, type WsStory } from '../../seller-workspace'
import { Card, Notice, SelectField, Thumb } from './kit'

/** SC-005: Seller Stories (ADU-STORY-01). One still photo, optional short text, at most one same-Seller Product or Scene link, 24 simulated hours. */

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const PHASE: Record<StoryPhase, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-surface-raised text-text-muted' }, live: { label: 'Live', cls: 'bg-success-bg' }, expired: { label: 'Expired', cls: 'bg-surface-raised text-text-muted' },
  withdrawn: { label: 'Withdrawn', cls: 'bg-surface-raised text-text-muted' }, hidden: { label: 'Hidden', cls: 'bg-warning-bg' },
}
const left = (h: number) => (h >= 1 ? `${Math.floor(h)} h left` : 'under 1 h left')

export default function StoryAuthoring({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state, dispatch } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const stories = Object.values(state.stories).filter(s => s.seller === sellerId).sort((a, b) => Number(b.id.slice(-3)) - Number(a.id.slice(-3)))
  if (editing) return <StoryEditor sellerId={sellerId} at={at} onBack={m => { setEditing(false); if (m) setNotice(m) }} />
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-text-muted">A Story is one photo with optional short text and one link to your own Product or Scene. It stays live for {STORY_LIFETIME_HOURS} hours. Buyers cannot reply, react or comment.</p><Button onClick={() => { setNotice(''); setEditing(true) }}>Create Story</Button></div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 text-xs" role="group" aria-label="Prototype clock">
        <span className="font-semibold">Prototype clock: hour {state.clockHours}</span><span className="text-text-muted">Simulated time for demonstration, so expiry can be seen without waiting.</span>
        <span className="flex-1" />
        {[1, 12, 24].map(h => <Button key={h} size="sm" variant="secondary" onClick={() => dispatch({ type: 'clock', hours: h })}>+{h} h</Button>)}
        <Button size="sm" variant="tertiary" onClick={() => dispatch({ type: 'clock', hours: -state.clockHours })} disabled={state.clockHours === 0}>Reset</Button>
      </div>
      {notice && <div className="mb-4"><Notice tone="success" role="status">{notice}</Notice></div>}
      {stories.length === 0
        ? <div className="rounded-2xl border border-dashed border-border-strong bg-surface p-10 text-center"><div className="font-display text-lg font-semibold">No Stories yet</div><p className="mt-1 text-sm text-text-muted">Share a photo that links to a Product or Scene. It disappears after {STORY_LIFETIME_HOURS} hours.</p></div>
        : <ul className="overflow-hidden rounded-2xl border border-border bg-surface">{stories.map(story => {
          const { phase, hoursLeft } = storyPhase(story, state, at)
          const target = story.link ? (story.link.kind === 'product' ? linkableProducts(state, sellerId, at, true).find(p => p.id === story.link!.id)?.name : state.scenes[story.link.id]?.caption) : null
          return (
            <li key={story.id} className="flex flex-wrap items-center gap-4 border-t border-border p-4 first:border-t-0">
              <Thumb src={story.image} label="Story" className="h-14 w-14" />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{story.text || 'Photo only'}</div><div className="font-mono text-[10px] text-text-muted">{story.id}{target ? ` · links to ${target}` : ''}{phase === 'live' || phase === 'hidden' ? ` · ${left(hoursLeft)}` : ''}</div>{phase === 'hidden' && <div className="text-xs text-warning">Hidden from Buyers: the linked {story.link?.kind} is not available right now.</div>}</div>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PHASE[phase].cls}`}>{PHASE[phase].label}</span>
              {(phase === 'live' || phase === 'hidden') && <Button size="sm" variant="tertiary" onClick={() => dispatch({ type: 'story', item: { ...story, status: 'withdrawn' } })}>Withdraw</Button>}
              {phase === 'draft' && <Button size="sm" variant="tertiary" onClick={() => dispatch({ type: 'remove', collection: 'stories', id: story.id })}>Delete</Button>}
            </li>
          )
        })}</ul>}
    </div>
  )
}

function StoryEditor({ sellerId, at, onBack }: { sellerId: SellerId; at: Moment; onBack: (message?: string) => void }) {
  const { state, dispatch, next } = useWorkspace()
  const [image, setImage] = useState<string | null>(null); const [alt, setAlt] = useState(''); const [text, setText] = useState('')
  const [kind, setKind] = useState<'none' | 'product' | 'scene'>('none'); const [target, setTarget] = useState('')
  const [attempted, setAttempted] = useState(false); const [fileError, setFileError] = useState('')
  const summary = useRef<HTMLDivElement>(null)
  const products = linkableProducts(state, sellerId, at)
  const scenes = useMemo(() => Object.values(state.scenes).filter(s => s.seller === sellerId && sceneVisibility(s, state, at) === 'public'), [state, sellerId, at])
  const setup = state.setup[sellerId]
  const published = linkableProducts(state, sellerId, at, true).length
  const notReady = setup && !readiness(setup, published).every(i => i.done)
  const linkName = kind === 'product' ? products.find(p => p.id === target)?.name : kind === 'scene' ? scenes.find(s => s.id === target)?.caption : undefined

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!ACCEPT.includes(file.type)) { setFileError('Choose one JPEG, PNG or WebP photo. Video is not supported.'); return }
    if (file.size > 10 * 1024 * 1024) { setFileError('That photo is larger than 10 MB.'); return }
    setFileError(''); setImage(await toThumbnail(file, 720))
  }
  const problems = (): string[] => {
    const list: string[] = []
    if (notReady) list.push('Complete your Store setup before publishing a Story.')
    if (!image) list.push('Choose one photo.')
    if (image && alt.trim().length < 3) list.push('Describe the photo for people who cannot see it.')
    if (kind !== 'none' && !target) list.push(`Choose the ${kind} to link, or choose “No link”.`)
    return list
  }
  const errors = attempted ? problems() : []
  const build = (status: WsStory['status']): WsStory => ({ id: next('story'), seller: sellerId, image, alt, text: text.trim(), link: kind === 'none' || !target ? null : { kind, id: target }, status, publishedAt: status === 'published' ? state.clockHours : null })
  const publish = () => {
    if (problems().length) { setAttempted(true); requestAnimationFrame(() => summary.current?.focus()); return }
    dispatch({ type: 'story', item: build('published') }); onBack(`Story published (simulated). It stays live for ${STORY_LIFETIME_HOURS} prototype hours.`)
  }
  const saveDraft = () => {
    if (!image) { setAttempted(true); requestAnimationFrame(() => summary.current?.focus()); return }
    dispatch({ type: 'story', item: build('draft') }); onBack('Draft saved.')
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">Create Story</h2><Button variant="tertiary" onClick={() => onBack()}>← Back to Stories</Button></div>
      {notReady && <div className="mb-4"><Notice tone="warning" role="status" title="Store setup is incomplete">Stories can be published once your Store setup is ready. You can still save a draft.</Notice></div>}
      {errors.length > 0 && <div ref={summary} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-danger bg-danger-bg p-4 text-sm outline-none"><ul className="list-disc pl-5">{errors.map(e => <li key={e}>{e}</li>)}</ul></div>}
      <div className="grid grid-cols-[1.2fr_.8fr] gap-5 max-lg:grid-cols-1">
        <div className="flex flex-col gap-5">
          <Card step="01" title="Photo" hint="One still photo. Backgrounds are not removed. Photos stay in this session only.">
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:bg-surface-raised">{image ? 'Replace photo' : 'Choose photo'}<input type="file" accept={ACCEPT.join(',')} className="sr-only" onChange={e => { void onFile(e.target.files?.[0]); e.target.value = '' }} /></label>
            {fileError && <p role="alert" className="mt-2 text-xs text-danger">{fileError}</p>}
            {image && <div className="mt-3"><TextInput label="Photo description (for people who cannot see it)" value={alt} onChange={e => setAlt(e.target.value)} maxLength={140} /></div>}
          </Card>
          <Card step="02" title="Short text (optional)"><TextInput label="Text" value={text} onChange={e => setText(e.target.value)} maxLength={120} hint={`${text.length} / 120. A Story cannot announce a discount that is not already active on the Product.`} /></Card>
          <Card step="03" title="Link (optional)" hint="At most one of your own Products or Scenes. Eligible items only.">
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <SelectField label="Link to" value={kind} onChange={v => { setKind(v as typeof kind); setTarget('') }} options={[{ value: 'none', label: 'No link' }, { value: 'product', label: 'A Product' }, { value: 'scene', label: 'A Scene' }]} />
              {kind === 'product' && <SelectField label="Product" value={target} onChange={setTarget} placeholder="Choose a Product" options={products.map(p => ({ value: p.id, label: p.name }))} />}
              {kind === 'scene' && <SelectField label="Scene" value={target} onChange={setTarget} placeholder={scenes.length ? 'Choose a Scene' : 'No public Scenes yet'} options={scenes.map(s => ({ value: s.id, label: s.caption || s.id }))} disabled={!scenes.length} />}
            </div>
            {kind === 'scene' && !scenes.length && <p className="mt-2 text-xs text-text-muted">Only published, public Scenes can be linked. A Private Scene cannot be exposed through a Story.</p>}
          </Card>
          <div className="sticky bottom-0 z-10 flex gap-2 border-t border-border bg-background/95 py-3 backdrop-blur"><Button variant="secondary" onClick={saveDraft}>Save draft</Button><Button onClick={publish}>Publish Story</Button></div>
        </div>
        <aside aria-label="Story preview" className="h-fit lg:sticky lg:top-4">
          <div className="mx-auto w-64 overflow-hidden rounded-3xl border border-border bg-ink">
            <div className="relative aspect-[9/16]">
              {image ? <img src={image} alt={alt || 'Story photo'} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-white/70">No photo yet</div>}
              <div className="absolute inset-x-0 top-0 h-1.5 bg-white/30"><div className="h-full w-full bg-white/80" /></div>
              {text && <p className="absolute inset-x-3 bottom-16 rounded-lg bg-black/55 p-2 text-sm text-white">{text}</p>}
              {linkName && <span className="absolute inset-x-3 bottom-4 rounded-full bg-white px-3 py-2 text-center text-xs font-semibold text-ink">View {kind === 'product' ? 'Product' : 'Scene'}: {linkName}</span>}
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-text-muted">Buyer preview · simulated · expires after {STORY_LIFETIME_HOURS} h</p>
        </aside>
      </div>
    </div>
  )
}
