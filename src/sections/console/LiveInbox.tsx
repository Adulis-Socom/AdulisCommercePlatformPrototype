import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { BUYERS, type BuyerId } from '../../demo-data'
import { threadStatus, type ChatMsg, type Conversation } from '../../chatbot/chat'
import { sellerReply } from '../../chatbot/session'
import { botConfigOf } from '../../chatbot/world'
import { useWorkspace } from '../../seller-workspace'

/**
 * BOT-006 Seller Inbox continuity: the conversations the Buyer app created this session, with exactly the messages the Buyer saw, the
 * Assistant's answers (with the intent and template that produced each), every question handed to the Seller with its original text, and a
 * person's reply. A person's reply (or Take over) silences the Assistant until it is handed back.
 */
const STATUS = { bot: 'Assistant answering', waiting: 'Waiting for you', human: 'You are answering', 'bot-off': 'Assistant off' } as const
const TONE = { bot: 'bg-surface-raised text-text-secondary', waiting: 'bg-warning-bg text-warning', human: 'bg-success-bg text-success', 'bot-off': 'bg-surface-raised text-text-muted' } as const
const shortBuyer = (id: string) => { const name = BUYERS[id as BuyerId]?.name ?? 'Buyer'; const [first, ...rest] = name.split(' '); return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first }

export function LiveInbox({ sellerId, author, compact }: { sellerId: string; author: string; compact?: boolean }) {
  const { state, dispatch } = useWorkspace()
  const convs = Object.values(state.chats).filter(c => c.sellerId === sellerId).sort((a, b) => (b.messages.at(-1)?.seq ?? 0) - (a.messages.at(-1)?.seq ?? 0))
  const [open, setOpen] = useState<string | null>(null)
  const [reply, setReply] = useState('')
  if (!convs.length) return null
  const enabled = botConfigOf(state, sellerId).enabled
  const current = convs.find(c => c.key === open) ?? null
  const waiting = convs.filter(c => c.waiting).length
  return (
    <section aria-label="Assistant conversations" className={`${compact ? 'border-b border-border' : 'mb-4 rounded-xl border border-border'} bg-surface`}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="font-display text-base font-semibold">Assistant conversations</h2>
        <span className="text-xs text-text-muted">{convs.length} conversation{convs.length === 1 ? '' : 's'}{waiting ? ` · ${waiting} waiting for you` : ''}</span>
      </div>
      <ul>
        {convs.map(c => {
          const status = threadStatus(c, enabled)
          const last = c.messages.at(-1)
          return (
            <li key={c.key} className="border-b border-border last:border-b-0">
              <button onClick={() => { setOpen(open === c.key ? null : c.key); setReply('') }} aria-expanded={open === c.key} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-xs font-bold text-brand-dark">{shortBuyer(c.buyerId).slice(0, 1)}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{shortBuyer(c.buyerId)}</span><span className="block truncate text-xs text-text-secondary">{last?.text}</span></span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TONE[status]}`}>{STATUS[status]}</span>
              </button>
              {open === c.key && current && (
                <div className="bg-surface-raised px-4 pb-4">
                  <div role="list" aria-label={`Messages with ${shortBuyer(c.buyerId)}`} className="flex max-h-96 flex-col gap-2 overflow-y-auto py-3">
                    {c.messages.map(m => <Row key={m.id} m={m} />)}
                  </div>
                  {c.waiting && <p role="status" className="mb-2 text-xs font-semibold text-warning">Handed to you by the Assistant. The Buyer was told we can’t promise a reply time.</p>}
                  <div className="flex gap-2">
                    <input aria-label="Reply to Buyer" value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { sellerReply(dispatch, state, c.key, reply, author); setReply('') } }} placeholder={`Reply as ${author}`} className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm" />
                    <Button onClick={() => { sellerReply(dispatch, state, c.key, reply, author); setReply('') }}>Send to Buyer</Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    {c.mode === 'human_takeover'
                      ? <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'chat-mode', key: c.key, mode: 'bot' })}>Hand back to the Assistant</Button>
                      : <Button size="sm" variant="secondary" onClick={() => dispatch({ type: 'chat-mode', key: c.key, mode: 'human_takeover' })}>Take over</Button>}
                    <span>{c.mode === 'human_takeover' ? 'The Assistant is silent in this conversation.' : 'Replying also pauses the Assistant here.'}</span>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Row({ m }: { m: ChatMsg }) {
  if (m.from === 'ui') return <div role="listitem" className="text-center text-[11px] font-semibold text-text-muted">{m.text}</div>
  const buyer = m.from === 'buyer'
  return (
    <div role="listitem" className={`flex max-w-[85%] flex-col ${buyer ? 'items-start' : 'ml-auto items-end'}`}>
      {buyer && <span className="mb-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">Talking about: {m.subjectLabel ?? 'General'}</span>}
      {!buyer && <span className="mb-1 text-[10px] font-semibold text-text-muted">{m.from === 'bot' ? `Automated assistant${m.intent ? ` · ${m.intent} · ${m.templateId} v${m.templateVersion}` : ''}` : m.staff}</span>}
      <div className={`rounded-2xl p-3 text-sm ${buyer ? 'bg-surface shadow-sm' : m.from === 'bot' ? 'bg-brand-muted' : 'bg-brand text-on-brand'}`}>{m.text}</div>
      {buyer && m.escalated && <span className="mt-1 text-[10px] font-semibold text-warning">Original question retained · handed to the Seller</span>}
      {m.from === 'bot' && m.dialogue && m.dialogue.length > 0 && <span className="mt-1 text-[10px] text-text-muted">Script: {m.dialogue.join(', ')}</span>}
    </div>
  )
}

export type { Conversation }
