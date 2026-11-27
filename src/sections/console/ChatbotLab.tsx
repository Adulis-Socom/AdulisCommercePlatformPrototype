import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import { CHATBOTS, PRODUCTS, type Moment, type ProductId, type SellerId } from '../../demo-data'
import { linkableProducts, parseMoney, productStock, sceneVisibility, useWorkspace, type WorkspaceState } from '../../seller-workspace'
import { respond, type Knowledge, type Outcome, type ProductFacts, type StoreFacts, type Subject } from './chatbot-engine'
import { Notice, SelectField } from './kit'

/** SC-006: the Seller's approved answers (editable, kept in this session) and a deterministic test of how the chatbot would reply. */

export function useKnowledge(sellerId: SellerId): [Knowledge[], (entries: Knowledge[]) => void] {
  const { state, dispatch } = useWorkspace()
  const seeded = (CHATBOTS[sellerId]?.answers ?? []).map((a, i) => ({ id: `seed-${i}`, topic: a.topic, answer: a.answer }))
  return [state.knowledge[sellerId] ?? seeded, entries => dispatch({ type: 'knowledge', seller: sellerId, entries })]
}

export function ChatbotAnswers({ sellerId }: { sellerId: SellerId }) {
  const [entries, save] = useKnowledge(sellerId)
  const [editing, setEditing] = useState<string | null>(null)
  const [topic, setTopic] = useState(''); const [answer, setAnswer] = useState(''); const [error, setError] = useState('')
  const open = (e?: Knowledge) => { setEditing(e?.id ?? 'new'); setTopic(e?.topic ?? ''); setAnswer(e?.answer ?? ''); setError('') }
  const commit = () => {
    if (topic.trim().length < 3) return setError('Enter the Buyer question or topic (at least 3 characters).')
    if (answer.trim().length < 5) return setError('Write the answer Buyers should receive.')
    const entry = { id: editing === 'new' ? `ans-${Date.now().toString(36)}` : editing!, topic: topic.trim(), answer: answer.trim() }
    save(editing === 'new' ? [...entries, entry] : entries.map(e => (e.id === editing ? entry : e))); setEditing(null)
  }
  return (
    <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Approved answers</h2><Button size="sm" onClick={() => open()}>Add an answer</Button></div>
        {entries.length === 0 && <p className="text-sm text-text-muted">No approved answers yet. Without them the assistant only reads facts from your Product records and sends everything else to you.</p>}
        <ul className="divide-y divide-border">{entries.map(e => <li key={e.id} className="flex items-start gap-3 py-3"><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{e.topic}</div><div className="text-xs text-text-secondary">{e.answer}</div></div><Button size="sm" variant="tertiary" onClick={() => open(e)} aria-label={`Edit answer: ${e.topic}`}>Edit</Button><Button size="sm" variant="tertiary" onClick={() => save(entries.filter(x => x.id !== e.id))} aria-label={`Delete answer: ${e.topic}`}>Delete</Button></li>)}</ul>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5" aria-label="Edit answer">
        {editing ? <div className="flex flex-col gap-4">
          <TextInput label="Buyer question or topic" value={topic} onChange={e => setTopic(e.target.value)} maxLength={80} hint="Keywords matter: an answer is used when the question contains at least half of them." />
          <Textarea label="Approved answer" value={answer} onChange={e => setAnswer(e.target.value)} rows={5} maxLength={500} hint="Write only what is true. Do not state prices, warranties or promises you have not set." />
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2"><Button onClick={commit}>Save answer</Button><Button variant="tertiary" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div> : <p className="py-10 text-center text-sm text-text-muted">Choose Edit, or Add an answer.</p>}
      </section>
    </div>
  )
}

function factsOf(state: WorkspaceState, id: string, seller: SellerId, at: Moment): ProductFacts | null {
  const known = linkableProducts(state, seller, at, true).find(p => p.id === id)
  if (!known) return null
  const o = state.products[id]
  if (o) {
    const prices = o.variants.map(v => parseMoney(v.price || o.price)).filter((n): n is number => n !== null)
    return { id, name: o.name, fromPrice: prices.length ? Math.min(...prices) : parseMoney(o.price), stock: productStock(o), options: o.options.length ? o.options : o.seeded ? PRODUCTS[id as ProductId].variants.map(v => ({ name: v.name ?? 'Option', values: [...v.options] })) : [], description: o.description, attributes: [...Object.entries(o.attributes).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), ...o.customAttributes.filter(a => a.name && a.value).map(a => `${a.name}: ${a.value}`)], fulfilment: o.fulfilment }
  }
  const seed = PRODUCTS[id as ProductId]
  return { id, name: seed.name, fromPrice: seed.price, stock: seed.stock, options: seed.variants.map(v => ({ name: v.name ?? 'Option', values: [...v.options] })), description: seed.description ?? '', attributes: [...seed.attributes], fulfilment: [] }
}

const OUTCOME_LABEL: Record<Outcome['kind'], string> = { answered: 'Answered', 'select-product': 'Needs a Product', escalate: 'Handed to the Seller' }

export function ChatbotTest({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state } = useWorkspace()
  const [knowledge] = useKnowledge(sellerId)
  const [mode, setMode] = useState<'general' | 'product' | 'scene'>('product')
  const products = linkableProducts(state, sellerId, at, true)
  const scenes = Object.values(state.scenes).filter(s => s.seller === sellerId && sceneVisibility(s, state, at) === 'public')
  const [productId, setProductId] = useState(''); const [sceneId, setSceneId] = useState('')
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<{ q: string; subject: string; outcome: Outcome } | null>(null)
  const setup = state.setup[sellerId]
  const store: StoreFacts = useMemo(() => ({ methods: setup ? [setup.collection.on && 'Buyer Collection', setup.sellerDelivery.on && 'Seller Delivery', setup.courier && 'Courier Delivery'].filter(Boolean) as string[] : [], collectionPlace: setup?.collection.on ? setup.collection.place : '', deliveryFee: setup?.sellerDelivery.on ? setup.sellerDelivery.fee : '' }), [setup])
  const scene = scenes.find(s => s.id === sceneId)
  const sceneProducts = scene ? scene.tags.map(t => factsOf(state, t.product, sellerId, at)).filter((p): p is ProductFacts => !!p) : []

  const run = () => {
    let subject: Subject; let label: string
    if (mode === 'general') { subject = { kind: 'general' }; label = 'General question for the Seller' }
    else if (mode === 'scene') {
      if (!scene) return setResult({ q: question, subject: 'No Scene chosen', outcome: { kind: 'escalate', code: 'EMPTY', reason: 'Choose a Scene to test.' } })
      const chosen = productId ? sceneProducts.find(p => p.id === productId) : undefined
      subject = chosen ? { kind: 'product', product: chosen, scene: { id: scene.id, caption: scene.caption } } : { kind: 'scene', scene: { id: scene.id, caption: scene.caption }, products: sceneProducts }
      label = chosen ? `Product “${chosen.name}” (from Scene “${scene.caption}”)` : `Scene “${scene.caption}” (no Product chosen)`
    } else {
      const p = factsOf(state, productId, sellerId, at)
      if (!p) return setResult({ q: question, subject: 'No Product chosen', outcome: { kind: 'select-product', message: 'Choose a Product to ask about.', choices: [] } })
      subject = { kind: 'product', product: p }; label = `Product “${p.name}”`
    }
    setResult({ q: question, subject: label, outcome: respond(question, subject, knowledge, store) })
  }
  const examples = ['How much is this?', 'Is it in stock?', 'What sizes does it come in?', 'What is it made of?', 'Do you deliver?', 'Can I pay with Telebirr?', 'Is there a warranty?']
  return (
    <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Test a Buyer question</h2>
        <p className="mb-3 text-xs text-text-muted">Deterministic demonstration: no AI model is used. Wording is a prototype proposal, not approved copy.</p>
        <div role="radiogroup" aria-label="What the Buyer is asking about" className="mb-3 flex gap-1">{([['product', 'A Product'], ['scene', 'A Scene'], ['general', 'The Seller']] as const).map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => { setMode(k); setResult(null) }} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${mode === k ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{l}</button>)}</div>
        <div className="flex flex-col gap-3">
          {mode === 'scene' && <SelectField label="Scene" value={sceneId} onChange={v => { setSceneId(v); setProductId('') }} placeholder={scenes.length ? 'Choose a Scene' : 'No public Scenes yet'} options={scenes.map(s => ({ value: s.id, label: s.caption || s.id }))} disabled={!scenes.length} />}
          {mode === 'product' && <SelectField label="Product" value={productId} onChange={setProductId} placeholder="Choose a Product" options={products.map(p => ({ value: p.id, label: p.name }))} />}
          {mode === 'scene' && scene && <SelectField label="Product in this Scene (optional)" value={productId} onChange={setProductId} placeholder="Not chosen yet" options={sceneProducts.map(p => ({ value: p.id, label: p.name }))} />}
          <TextInput label="Buyer question" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') run() }} maxLength={200} />
          <div className="flex flex-wrap gap-1.5" aria-label="Example questions">{examples.map(x => <button key={x} type="button" onClick={() => setQuestion(x)} className="min-h-8 rounded-full bg-surface-raised px-3 text-xs font-semibold text-text-secondary">{x}</button>)}</div>
          <div><Button onClick={run}>Run test</Button></div>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-5" aria-label="Assistant response" aria-live="polite">
        <h2 className="mb-3 font-display text-lg font-semibold">Assistant response</h2>
        {!result ? <p className="py-10 text-center text-sm text-text-muted">Run a test to see exactly how the assistant would respond.</p> : (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-surface-raised p-3 text-sm"><span className="text-xs font-semibold text-text-muted">Buyer</span><div>{result.q || '—'}</div></div>
            <div className="text-xs text-text-muted">Subject resolved: <span className="font-semibold text-text-primary">{result.subject}</span></div>
            {result.outcome.kind === 'answered' && <><div className="rounded-xl bg-brand-muted p-3 text-sm">{result.outcome.text}</div><div className="text-xs text-text-muted">Source: {result.outcome.source}</div></>}
            {result.outcome.kind === 'select-product' && <><Notice tone="info" title="Needs a Product">{result.outcome.message}</Notice>{result.outcome.choices.length > 0 && <div className="flex flex-wrap gap-1.5">{result.outcome.choices.map(c => <span key={c} className="rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold">{c}</span>)}</div>}</>}
            {result.outcome.kind === 'escalate' && <Notice tone="warning" title="Human handoff">{result.outcome.reason}<div className="mt-1 font-mono text-[10px]">{result.outcome.code}</div><div className="mt-1">The Buyer’s original message is kept and waits in your Inbox for a person to reply.</div></Notice>}
            <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${result.outcome.kind === 'answered' ? 'bg-success-bg' : 'bg-warning-bg'}`}>{OUTCOME_LABEL[result.outcome.kind]}</span>
          </div>
        )}
      </section>
    </div>
  )
}
