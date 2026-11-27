import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { TextInput } from '../../components/ui/Input'
import type { Moment, SellerId } from '../../demo-data'
import { respond } from '../../chatbot/engine'
import { INTENT_LABEL } from '../../chatbot/intents'
import { DIALOGUE_LIBRARY_VERSION, SCENARIOS } from '../../chatbot/library'
import { useLeafLabels } from '../../chatbot/useLabels'
import type { BotResult, ChatState, Chip, MessageSubject } from '../../chatbot/types'
import { botConfigOf, buildWorld, productFacts, publicScenes, sceneTitle } from '../../chatbot/world'
import { linkableProducts, useWorkspace } from '../../seller-workspace'
import { Notice, SelectField } from './kit'

/**
 * BOT-005: the Seller's Chatbot Test Lab. Isolated: it reads the SAME effective data the Buyer's assistant reads, but its conversation is local
 * and never touches a Buyer conversation, the Cart, inventory or any price. It shows how an answer was decided, and the coverage of the 114
 * documented dialogue groups. Feedback here is a note for an authorised reviewer; it never edits a template or trains anything.
 */
type Turn = { text: string; subjectLabel: string; result: BotResult; id: string }
type Feedback = { id: string; signal: 'green' | 'yellow' | 'red'; note: string; expected: string; turn: string; template: string }
const KIND: Record<BotResult['kind'], string> = { answer: 'Answered', clarify: 'Needs a choice', 'handoff-offer': 'Offered to the Seller', handoff: 'Handed to the Seller', denied: 'Refused', deferred: 'Not available yet', 'no-reply': 'Assistant silent' }
const SIGNAL = { green: 'Correct', yellow: 'Needs review', red: 'Wrong or urgent' } as const

export function ChatbotTestLab({ sellerId, at }: { sellerId: SellerId; at: Moment }) {
  const { state } = useWorkspace()
  const labels = useLeafLabels()
  const [mode, setMode] = useState<'general' | 'product' | 'scene'>('product')
  const [sceneId, setSceneId] = useState(''); const [productId, setProductId] = useState('')
  const [variant, setVariant] = useState<Record<string, string>>({})
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [chatState, setChatState] = useState<ChatState>({ mode: 'bot', pending: null })
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [signal, setSignal] = useState<Feedback['signal'] | null>(null)
  const [note, setNote] = useState(''); const [expected, setExpected] = useState(''); const [noteError, setNoteError] = useState('')
  const [scenarioId, setScenarioId] = useState('')
  const [matrix, setMatrix] = useState<null | { id: string; group: string; title: string; page: number; how: string; steps: number; passed: number; failures: string[] }[]>(null)
  const config = botConfigOf(state, sellerId)
  const world = useMemo(() => buildWorld(state, labels, at), [state, labels, at])
  const products = linkableProducts(state, sellerId, at, true)
  const scenes = publicScenes(state, at, sellerId)
  const scene = scenes.find(s => s.id === sceneId)
  const sceneProducts = scene?.products ?? []
  const product = productId ? productFacts(state, labels, at, sellerId, productId) : null
  const last = turns[turns.length - 1]

  const subject = (): { subject: MessageSubject; label: string } => {
    const s: MessageSubject = { sellerId }
    if (mode === 'scene' && scene) s.scene = { id: scene.id, revision: scene.revision }
    if (mode !== 'general' && productId) { s.productId = productId; if (Object.keys(variant).length) s.variant = { ...variant } }
    const name = product && mode !== 'general' ? `Product “${product.name}”${mode === 'scene' && scene ? ` (from Scene “${sceneTitle(state, scene.id)}”)` : ''}` : mode === 'scene' && scene ? `Scene “${sceneTitle(state, scene.id)}” (no Product chosen)` : mode === 'general' ? 'General question for the Seller' : 'No Product chosen'
    return { subject: s, label: name }
  }
  const run = (chip?: Chip) => {
    const text = chip ? chip.label : question.trim()
    if (!text) { setTurns(t => [...t, { id: `t${t.length}`, text: '', subjectLabel: subject().label, result: emptyResult() }]); return }
    const { subject: s, label } = subject()
    if (chip && (chip.id.startsWith('select-product:') || chip.id === 'select-product' || chip.id === 'choose-product' || chip.id.startsWith('option:') || chip.id === 'open-product' || chip.id === 'open-cart')) {
      if (chip.id.startsWith('select-product:')) { setProductId(chip.id.slice(15)); setVariant({}) }
      return // a selector or navigation chip, not a message
    }
    const id = `lab#${turns.length + 1}`
    const result = respond({ messageId: id, conversationSellerId: sellerId, text: chip ? undefined : text, chip: chip?.id, subject: chip?.id.startsWith('area:') ? { ...s, area: chip.id.slice(5) } : s,
      contextShift: false }, chatState, world)
    setTurns(t => [...t, { id, text, subjectLabel: label, result }])
    setChatState(c => ({ ...c, pending: c.mode === 'human_takeover' ? null : result.pending }))
    setSignal(null); setNote(''); setExpected(''); setNoteError('')
    if (!chip) setQuestion('')
  }
  const submitFeedback = () => {
    if (!last || !signal) return
    if (signal !== 'green' && (note.trim().length < 5 || expected.trim().length < 5)) { setNoteError('Describe what happened and what the assistant should have answered.'); return }
    setFeedback(f => [...f, { id: `fb${f.length + 1}`, signal, note: note.trim(), expected: expected.trim(), turn: last.text, template: `${last.result.templateId} v${last.result.templateVersion}` }])
    setSignal(null); setNote(''); setExpected(''); setNoteError('')
  }
  const loadScenario = (id: string) => {
    setScenarioId(id)
    const s = SCENARIOS.find(x => x.id === id)
    const first = s?.turns.find(t => t.role === 'Buyer')
    if (first) setQuestion(first.text.replace(/^\[[^\]]*\]\s*/, ''))
  }
  const runMatrix = async () => {
    if (!labels) return
    const { runCoverage } = await import('../../chatbot/coverage')
    setMatrix(runCoverage(labels))
  }
  const examples = ['How much is this?', 'Is it in stock?', 'What sizes does it come in?', 'What is it made of?', 'Do you deliver?', 'Can I return it?', 'Is there a warranty?', 'Can I pay with Telebirr?', 'Can you reduce the price?']
  const summary = matrix && { ok: matrix.filter(r => r.how === 'ui' || (!r.failures.length && r.passed === r.steps)).length, total: matrix.length, steps: matrix.reduce((a, r) => a + r.steps, 0), passed: matrix.reduce((a, r) => a + r.passed, 0) }

  return (
    <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-1 font-display text-lg font-semibold">Test a Buyer question</h2>
        <p className="mb-3 text-xs text-text-muted">Deterministic and isolated: no AI model, and nothing here reaches a Buyer, the Cart or stock. Dialogue library v{DIALOGUE_LIBRARY_VERSION}. Wording is a prototype proposal, not approved copy.</p>
        <div role="radiogroup" aria-label="What the Buyer is asking about" className="mb-3 flex gap-1">{([['product', 'A Product'], ['scene', 'A Scene'], ['general', 'The Seller']] as const).map(([k, label]) => <button key={k} role="radio" aria-checked={mode === k} onClick={() => setMode(k)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${mode === k ? 'border-brand bg-brand-muted text-brand-dark' : 'border-border bg-surface text-text-secondary'}`}>{label}</button>)}</div>
        <div className="flex flex-col gap-3">
          {mode === 'scene' && <SelectField label="Scene" value={sceneId} onChange={v => { setSceneId(v); setProductId(''); setVariant({}) }} placeholder={scenes.length ? 'Choose a Scene' : 'No public Scenes yet'} options={scenes.map(s => ({ value: s.id, label: sceneTitle(state, s.id) }))} />}
          {mode === 'product' && <SelectField label="Product" value={productId} onChange={v => { setProductId(v); setVariant({}) }} placeholder="Choose a Product" options={products.map(p => ({ value: p.id, label: p.name }))} />}
          {mode === 'scene' && scene && <SelectField label="Product in this Scene (optional)" value={productId} onChange={v => { setProductId(v); setVariant({}) }} placeholder="Not chosen yet" options={sceneProducts.map(p => ({ value: p.id, label: p.name }))} />}
          {mode !== 'general' && product && product.options.map(o => <SelectField key={o.name} label={`Exact ${o.name.toLowerCase()} (optional)`} value={variant[o.name] ?? ''} onChange={v => setVariant(cur => { const next = { ...cur }; if (v) next[o.name] = v; else delete next[o.name]; return next })} placeholder={`Any ${o.name.toLowerCase()}`} options={o.values.map(v => ({ value: v, label: v }))} />)}
          <SelectField label="Documented scenario (loads its first Buyer line)" value={scenarioId} onChange={loadScenario} placeholder="Choose one of 114" options={SCENARIOS.map(s => ({ value: s.id, label: `${s.id} · ${s.title}` }))} />
          <TextInput label="Buyer question" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') run() }} maxLength={300} />
          <div className="flex flex-wrap gap-1.5" aria-label="Example questions">{examples.map(x => <button key={x} type="button" onClick={() => setQuestion(x)} className="min-h-8 rounded-full bg-surface-raised px-3 text-xs font-semibold text-text-secondary">{x}</button>)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => run()}>Run test</Button>
            <Button variant="secondary" onClick={() => { setTurns([]); setChatState({ mode: 'bot', pending: null }) }}>New conversation</Button>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={chatState.mode === 'human_takeover'} onChange={e => setChatState(c => ({ ...c, mode: e.target.checked ? 'human_takeover' : 'bot' }))} /> A person has taken over</label>
          </div>
          {!config.enabled && <Notice tone="info" title="The assistant is switched off">Buyers get a static status and their message goes to you. The test still shows what the assistant would say.</Notice>}
        </div>
        <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Coverage of the 114 documented dialogue groups</summary>
          <p className="mt-2 text-xs text-text-muted">Runs every scripted Buyer line through the engine against synthetic fixture facts and compares each answer with the PDF's Bot line, character for character. C-22 (Seller feedback) is exercised in this Lab's feedback controls.</p>
          <Button size="sm" variant="secondary" onClick={() => void runMatrix()} disabled={!labels}>Run all groups</Button>
          {summary && <p role="status" className="mt-2 text-sm font-semibold">{summary.ok} of {summary.total} groups pass · {summary.passed} of {summary.steps} steps</p>}
          {matrix && <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-surface-raised"><tr><th className="p-1.5">ID</th><th className="p-1.5">Scenario</th><th className="p-1.5">PDF p.</th><th className="p-1.5">Steps</th><th className="p-1.5">Result</th></tr></thead><tbody>
            {matrix.map(r => { const ok = r.how === 'ui' || (!r.failures.length && r.passed === r.steps); return <tr key={r.id} className="border-t border-border"><td className="p-1.5 font-mono">{r.id}</td><td className="p-1.5">{r.title}</td><td className="p-1.5">{r.page}</td><td className="p-1.5">{r.how === 'ui' ? 'feedback (below)' : `${r.passed}/${r.steps}`}</td><td className={`p-1.5 font-semibold ${ok ? 'text-success' : 'text-danger'}`} title={r.failures.join('\n')}>{ok ? (r.how === 'ui' ? 'Browser check' : 'Pass') : 'Fail'}</td></tr> })}
          </tbody></table></div>}
        </details>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5" aria-label="Assistant response" aria-live="polite">
        <h2 className="mb-3 font-display text-lg font-semibold">Assistant response</h2>
        {!last ? <p className="py-10 text-center text-sm text-text-muted">Run a test to see exactly how the assistant would respond, and why.</p> : (
          <div className="flex flex-col gap-3">
            <ol aria-label="Conversation" className="flex max-h-60 flex-col gap-2 overflow-y-auto rounded-xl bg-surface-raised p-3">
              {turns.map(t => <li key={t.id} className="text-sm"><div className="text-[11px] font-semibold text-text-muted">Buyer · {t.subjectLabel}</div><div>{t.text || '—'}</div>{t.result.text !== null && <div className="mt-1 rounded-lg bg-brand-muted p-2">{t.result.text}</div>}{t.result.text === null && <div className="mt-1 text-xs text-text-muted">The assistant stays silent while a person has the conversation.</div>}</li>)}
            </ol>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="font-semibold text-text-muted">Outcome</dt><dd><span className={`rounded-full px-2 py-0.5 font-semibold ${last.result.kind === 'answer' ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>{KIND[last.result.kind]}</span></dd>
              <dt className="font-semibold text-text-muted">Message subject</dt><dd>{last.subjectLabel} · {last.result.subjectKind}</dd>
              <dt className="font-semibold text-text-muted">Matched intent</dt><dd>{last.result.intent ? `${last.result.intent} ${INTENT_LABEL[last.result.intent]}` : 'none'}</dd>
              <dt className="font-semibold text-text-muted">Dialogue</dt><dd>{last.result.dialogue.length ? [...new Set(last.result.dialogue)].join(', ') : 'none'}</dd>
              <dt className="font-semibold text-text-muted">Template</dt><dd className="font-mono">{last.result.templateId} v{last.result.templateVersion}</dd>
              <dt className="font-semibold text-text-muted">Reason</dt><dd className="font-mono">{last.result.reason || '—'}</dd>
            </dl>
            <div><div className="text-xs font-semibold text-text-muted">Resolved facts and where they came from</div>
              {last.result.slots.length ? <ul className="mt-1 text-xs">{last.result.slots.map((s, i) => <li key={i}><span className="font-semibold">{s.name}</span>: {s.value} <span className="text-text-muted">· {s.source}</span></li>)}</ul> : <p className="text-xs text-text-muted">No fact was read for this answer.</p>}</div>
            {last.result.missing.length > 0 && <Notice tone="warning" title="Missing information">{last.result.missing.join(', ')}. The assistant did not guess; the question goes to you.</Notice>}
            {last.result.conflicts.length > 0 && <Notice tone="warning" title="Conflicting knowledge">{last.result.conflicts.map(c => `Your note for “${c.topic}” says “${c.supplementary}” but the Product record says “${c.canonical}”. The Product record was used. Fix the note.`).join(' ')}</Notice>}
            {last.result.quickReplies.length > 0 && <div className="flex flex-wrap gap-1.5" aria-label="Quick replies">{last.result.quickReplies.map(c => <button key={c.id} type="button" onClick={() => run(c)} className="min-h-8 rounded-full border border-brand bg-brand-muted px-3 text-xs font-semibold text-brand-text">{c.label}</button>)}</div>}
            <details><summary className="cursor-pointer text-xs font-semibold">How this was decided</summary><ol className="mt-1 list-decimal pl-5 text-[11px] text-text-secondary">{last.result.trace.map((t, i) => <li key={i}>{t}</li>)}</ol></details>
            <fieldset className="rounded-xl border border-border p-3"><legend className="px-1 text-xs font-semibold">Was this answer right?</legend>
              <div className="flex gap-2" role="group" aria-label="Feedback signal">{(['green', 'yellow', 'red'] as const).map(s => <button key={s} type="button" aria-pressed={signal === s} onClick={() => setSignal(s)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${signal === s ? 'border-brand bg-brand-muted' : 'border-border'}`}><span aria-hidden="true">{s === 'green' ? '🟢' : s === 'yellow' ? '🟡' : '🔴'}</span> {SIGNAL[s]}</button>)}</div>
              {signal && signal !== 'green' && <div className="mt-2 flex flex-col gap-2"><TextInput label="What happened?" value={note} onChange={e => setNote(e.target.value)} maxLength={300} /><TextInput label="What should the assistant have answered or done?" value={expected} onChange={e => setExpected(e.target.value)} maxLength={300} />{noteError && <p role="alert" className="text-xs text-danger">{noteError}</p>}</div>}
              {signal && <div className="mt-2"><Button size="sm" onClick={submitFeedback}>Save feedback</Button></div>}
              <p className="mt-2 text-[10px] text-text-muted">Feedback is kept for an authorised reviewer. It never edits a template, changes the live assistant or trains anything.</p>
              {feedback.length > 0 && <ul aria-label="Feedback log" className="mt-2 text-xs">{feedback.map(f => <li key={f.id}>{SIGNAL[f.signal]} · {f.template} · “{f.turn}”{f.note ? ` · ${f.note}` : ''}{f.expected ? ` · expected: ${f.expected}` : ''}</li>)}</ul>}
            </fieldset>
          </div>
        )}
      </section>
    </div>
  )
}

function emptyResult(): BotResult {
  return { kind: 'clarify', intent: null, dialogue: [], templateId: 'NONE', templateVersion: '1.0.0', text: 'Type a Buyer question to test.', speaker: 'ui', quickReplies: [], actions: [], slots: [], missing: [], reason: 'EMPTY_MESSAGE', conflicts: [], handoff: null, pending: null, subjectKind: 'NONE', trace: [], sideEffects: [] }
}
