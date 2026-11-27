import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import type { Moment, SellerId } from '../../demo-data'
import { blankBotConfig, botReadiness, type BotConfig } from '../../chatbot/config'
import type { ProductKnowledge } from '../../chatbot/types'
import { useLeafLabels } from '../../chatbot/useLabels'
import { botConfigOf, productFacts, publicScenes, sceneTitle, sellerFacts } from '../../chatbot/world'
import { linkableProducts, useWorkspace } from '../../seller-workspace'
import { Notice, SelectField } from './kit'

/**
 * BOT-004: structured chatbot knowledge and policy. It only collects what the Product, Seller and Fulfilment records do not already hold,
 * shows the canonical facts it will reuse, names every gap and every conflict. A gap restricts automation; it never blocks publishing.
 */
const cap = (s: string, n = 300) => s.slice(0, n)
const lines = (text: string) => text.split('\n').map(l => l.trim()).filter(Boolean)

export function BotSetup({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state, dispatch } = useWorkspace()
  const labels = useLeafLabels()
  const saved = botConfigOf(state, sellerId)
  const [form, setForm] = useState<BotConfig>(() => structuredClone(saved))
  const [productId, setProductId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const seller = sellerFacts(state, sellerId)
  const scenes = publicScenes(state, at, sellerId)
  const products = linkableProducts(state, sellerId, at, true)
  const facts = productId ? productFacts(state, labels, at, sellerId, productId) : null
  const know: ProductKnowledge = form.products[productId] ?? {}
  const setKnow = (patch: Partial<ProductKnowledge>) => setForm(f => ({ ...f, products: { ...f.products, [productId]: { ...f.products[productId], ...patch } } }))
  const set = (patch: Partial<BotConfig>) => { setForm(f => ({ ...f, ...patch })); setNotice('') }
  const readiness = useMemo(() => botReadiness(form, { collectionOn: !!seller?.methods.includes('Buyer Collection'), publicSceneCount: scenes.length, scenesWithContext: scenes.filter(s => form.scenes[s.id]?.trim()).length }), [form, seller, scenes])

  // A Seller note that disagrees with a Product record's value for the same field (never silently resolved in the note's favour).
  const conflicts = useMemo(() => {
    const out: { topic: string; product: string; label: string; value: string; note: string }[] = []
    for (const entry of seller?.supplementary ?? []) {
      for (const p of products) {
        const f = productFacts(state, labels, at, sellerId, p.id)
        const hit = f?.attributes.find(a => entry.topic.toLowerCase().includes(a.label.toLowerCase()) && a.value.trim() && !entry.answer.toLowerCase().includes(a.value.trim().toLowerCase()))
        if (f && hit) out.push({ topic: entry.topic, product: f.name, label: hit.label, value: hit.value, note: entry.answer })
      }
    }
    return out
  }, [state, labels, at, sellerId, products, seller])

  const save = () => {
    const r = form.returns
    const partial = Object.values(r).some(v => v.trim()) && !Object.values(r).every(v => v.trim())
    if (form.warrantyOffered === 'yes' && !form.warranty.trim()) return setError('Add the warranty summary, or choose "Not set".')
    if (partial) { setNotice(''); setError('Returns and exchanges is partly filled. The assistant uses it only when all four parts are present: add the rest or clear them.'); return }
    setError('')
    dispatch({ type: 'bot', seller: sellerId, config: { ...form, products: Object.fromEntries(Object.entries(form.products).filter(([, k]) => Object.values(k).some(v => (Array.isArray(v) ? v.length : String(v ?? '').trim())))) } })
    setNotice('Saved. Missing items only limit what the assistant answers; they never stop a Product from being published.')
  }
  const dirty = JSON.stringify(form) !== JSON.stringify({ ...blankBotConfig(), ...saved })

  return (
    <div className="grid grid-cols-[1fr_20rem] gap-5 max-xl:grid-cols-1">
      <div className="flex flex-col gap-5">
        <Block title="The assistant" hint="Off means every Buyer message goes to a person, with a static status.">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => set({ enabled: e.target.checked })} /> Automated assistant is on for Buyers</label>
        </Block>
        <Block title="Returns and exchanges" hint="No default window or terms exist. Fill all four parts or leave all blank; a partly filled policy is never used.">
          {(['eligibility', 'window', 'condition', 'process'] as const).map(k => <TextInput key={k} label={{ eligibility: 'Who or what is eligible', window: 'Time window', condition: 'Condition of the item', process: 'How to return or exchange' }[k]} value={form.returns[k]} maxLength={140} onChange={e => set({ returns: { ...form.returns, [k]: cap(e.target.value, 140) } })} />)}
        </Block>
        <Block title="Warranty and service" hint="Only if you offer one. The assistant repeats your words and never adds a duration.">
          <div role="radiogroup" aria-label="Warranty" className="flex gap-1">{([['', 'Not set'], ['yes', 'I offer a warranty'], ['no', 'No warranty']] as const).map(([v, label]) => <button key={v} role="radio" aria-checked={form.warrantyOffered === v} onClick={() => set({ warrantyOffered: v })} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${form.warrantyOffered === v ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border'}`}>{label}</button>)}</div>
          {form.warrantyOffered === 'yes' && <Textarea label="Warranty summary (duration, what it covers, how to claim service)" value={form.warranty} rows={3} maxLength={300} onChange={e => set({ warranty: cap(e.target.value) })} />}
        </Block>
        <Block title="Sizing and measurements" hint="A chart the Buyer compares with their own measurements. The assistant never says a size will fit.">
          <Textarea label="Size guide for all your Products" value={form.sizeGuide} rows={3} maxLength={400} onChange={e => set({ sizeGuide: cap(e.target.value, 400) })} />
        </Block>
        <Block title="Collection, hours and handoff" hint="Your name, area, collection place and delivery methods are read from Store setup and are not asked again.">
          {seller?.methods.includes('Buyer Collection') && <TextInput label="Collection hours" value={form.collectionHours} maxLength={120} onChange={e => set({ collectionHours: cap(e.target.value, 120) })} hint={seller.collectionPlace ? `Collection place (from Store setup): ${seller.collectionPlace}` : 'Set the collection place in Store setup.'} />}
          <TextInput label="Who answers handoffs (a note for your team)" value={form.handoffRoute} maxLength={120} onChange={e => set({ handoffRoute: cap(e.target.value, 120) })} hint="Questions the assistant cannot answer reach your Inbox. No reply time is ever promised to Buyers." />
        </Block>
        <Block title="Product guidance" hint="Name, price, options and category details come from the Product record. Add only what it cannot hold.">
          <SelectField label="Product" value={productId} onChange={setProductId} placeholder="Choose a Product" options={products.map(p => ({ value: p.id, label: p.name }))} />
          {facts && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-surface-raised p-3 text-xs"><div className="font-semibold">Already known from the Product record (not asked again)</div>
                <ul className="mt-1 list-disc pl-4 text-text-secondary"><li>Name: {facts.name}</li><li>Price: {facts.price === null ? 'not set' : `ETB ${(facts.price / 100).toLocaleString('en-US')}`}</li><li>Options: {facts.options.length ? facts.options.map(o => `${o.name} (${o.values.join(', ')})`).join('; ') : 'none'}</li><li>{facts.attributes.length || facts.listedDetails.length} listed detail{facts.attributes.length + facts.listedDetails.length === 1 ? '' : 's'}{facts.categoryPath ? ` · ${facts.categoryPath}` : ''}</li></ul>
                {!facts.taxonomyLabels.length && <p className="mt-1 text-warning">This category defines no attribute fields yet, so detail questions go to you unless you add guidance below.</p>}
              </div>
              <Textarea label="Care (washing, storage, handling)" value={know.care ?? ''} rows={2} maxLength={300} onChange={e => setKnow({ care: cap(e.target.value) })} />
              <Textarea label="Usage or label instructions (cosmetics: from the label; no medical advice)" value={know.instructions ?? ''} rows={2} maxLength={300} onChange={e => setKnow({ instructions: cap(e.target.value) })} />
              <Textarea label="Compatibility: exact models or sizes, one per line" value={(know.compatibility ?? []).join('\n')} rows={3} maxLength={400} onChange={e => setKnow({ compatibility: lines(e.target.value).slice(0, 20) })} />
              <TextInput label="Size guide for this Product (overrides the general one)" value={know.sizeGuide ?? ''} maxLength={300} onChange={e => setKnow({ sizeGuide: cap(e.target.value) })} />
              <TextInput label="Authenticity statement (shown as your own claim, never as verified)" value={know.authenticity ?? ''} maxLength={200} onChange={e => setKnow({ authenticity: cap(e.target.value, 200) })} />
              <TextInput label="Condition" value={know.condition ?? ''} maxLength={100} onChange={e => setKnow({ condition: cap(e.target.value, 100) })} />
              <TextInput label="Warranty for this Product (overrides the general one)" value={know.warranty ?? ''} maxLength={200} onChange={e => setKnow({ warranty: cap(e.target.value, 200) })} />
            </div>
          )}
        </Block>
        <Block title="Scene context" hint="Purpose, styling and how the tagged Products go together. Only public Scenes are listed.">
          {scenes.length === 0 && <p className="text-sm text-text-muted">No public Scenes yet.</p>}
          {scenes.map(s => <Textarea key={s.id} label={`${sceneTitle(state, s.id)}`} value={form.scenes[s.id] ?? ''} rows={2} maxLength={300} onChange={e => set({ scenes: { ...form.scenes, [s.id]: cap(e.target.value) } })} />)}
        </Block>
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        {notice && <Notice tone="success" title="Saved">{notice}</Notice>}
        <div><Button onClick={save} disabled={!dirty}>Save knowledge and policies</Button></div>
      </div>
      <aside aria-label="Knowledge readiness" className="h-fit rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Knowledge readiness</h2>
        <p className="mb-2 text-xs text-text-muted">Gaps limit automation. They never stop a Product from publishing.</p>
        <ul className="flex flex-col gap-2">{readiness.map(r => <li key={r.key} className="text-xs"><span className={`mr-1 rounded-full px-1.5 py-0.5 font-semibold ${r.status === 'ready' ? 'bg-success-bg text-success' : r.status === 'missing' ? 'bg-warning-bg text-warning' : 'bg-surface-raised text-text-muted'}`}>{r.status === 'ready' ? 'Ready' : r.status === 'missing' ? 'Missing' : 'Not needed'}</span><span className="font-semibold">{r.label}</span><div className="text-text-muted">{r.effect}</div></li>)}</ul>
        {conflicts.length > 0 && (
          <div className="mt-3"><div className="text-xs font-semibold text-warning">Conflicting knowledge</div>
            <ul className="mt-1 text-xs text-text-secondary">{conflicts.map((c, i) => <li key={i} className="mb-1">Your answer “{c.topic}” says “{c.note}”, but {c.product} lists {c.label}: {c.value}. Buyers get the Product record. Fix the answer or the Product.</li>)}</ul></div>
        )}
      </aside>
    </div>
  )
}

function Block({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-display text-lg font-semibold">{title}</h2><p className="mb-3 text-xs text-text-muted">{hint}</p><div className="flex flex-col gap-3">{children}</div></section>
}
