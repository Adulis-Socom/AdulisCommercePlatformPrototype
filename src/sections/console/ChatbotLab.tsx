import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Textarea, TextInput } from '../../components/ui/Input'
import { CHATBOTS, type SellerId } from '../../demo-data'
import { useWorkspace } from '../../seller-workspace'
import type { Knowledge } from './chatbot-engine'

/** SC-006: the Seller's supplementary approved answers (editable, kept in this session). Testing lives in ChatbotTestLab (BOT-005). */

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
          <TextInput label="Buyer question or topic" value={topic} onChange={e => setTopic(e.target.value)} maxLength={80} hint="Used last: Product records and your policies win, and a note that disagrees with a Product record is flagged under Policies. Keywords matter: an answer is used when the question contains at least half of them." />
          <Textarea label="Approved answer" value={answer} onChange={e => setAnswer(e.target.value)} rows={5} maxLength={500} hint="Write only what is true. Do not state prices, warranties or promises you have not set." />
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2"><Button onClick={commit}>Save answer</Button><Button variant="tertiary" onClick={() => setEditing(null)}>Cancel</Button></div>
        </div> : <p className="py-10 text-center text-sm text-text-muted">Choose Edit, or Add an answer.</p>}
      </section>
    </div>
  )
}
