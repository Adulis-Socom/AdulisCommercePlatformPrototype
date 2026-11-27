import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { SURFACE_DEFAULTS, type Moment, type SellerId } from '../demo-data'
import { LIVE_SELLERS } from '../demo-data/live'
import { conversationKey, threadStatus, type ChatMsg } from '../chatbot/chat'
import { sendBuyerMessage } from '../chatbot/session'
import { useLeafLabels } from '../chatbot/useLabels'
import type { BotAction, Chip, MessageSubject } from '../chatbot/types'
import { botConfigOf, MARKET, productFacts, publicScenes, sceneTitle } from '../chatbot/world'
import { linkableProducts, useWorkspace } from '../seller-workspace'

/**
 * BOT-006: the Buyer's one conversation with a Seller (per Buyer, Seller and Market). The Buyer picks a Scene first (optional) and a Product
 * second; the choice is stamped on each Message when it is sent and never changes it afterwards. The same deterministic engine answers; a
 * person can take over from the Seller Inbox. Nothing here writes to the Cart: "Open Cart review" only navigates.
 */
export const BUYER_ID = SURFACE_DEFAULTS.buyer

const STATUS_TEXT = {
  bot: 'Automated assistant. It reads the Seller’s listed details. It cannot take payment, hold stock, change a price or place an Order.',
  waiting: 'Your message is with the Seller. We can’t promise a reply time. The assistant can still answer simple questions.',
  human: 'The Seller is answering personally. The assistant is paused for this conversation.',
  'bot-off': 'Automated help is off for this Seller. Your messages go to the Seller. We can’t promise a reply time.',
} as const

export function BuyerChat({ sellerId, at, startProductId, startSceneId, history, onOpenProduct, onOpenCart }: {
  sellerId: string; at: Moment; startProductId?: string; startSceneId?: string
  /** The seeded conversation so far (DEMO_DATA), rendered by the app, shown above this session's messages. */
  history: ReactNode
  onOpenProduct: (productId: string) => void; onOpenCart: () => void
}) {
  const { state, dispatch } = useWorkspace()
  const labels = useLeafLabels()
  const seller = LIVE_SELLERS[sellerId as SellerId]?.name ?? 'the Seller'
  const key = conversationKey(BUYER_ID, sellerId, MARKET.id)
  const conversation = state.chats[key]
  const config = botConfigOf(state, sellerId)
  const scenes = useMemo(() => publicScenes(state, at, sellerId), [state, at, sellerId])
  const [sceneId, setSceneId] = useState(startSceneId ?? '')
  // The Scene revision the Buyer opened. It is captured when the Scene is chosen, so an edit made meanwhile is detected as stale.
  const [sceneRev, setSceneRev] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [productId, setProductId] = useState(startProductId ?? '')
  const [variant, setVariant] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const sceneChoice = scenes.find(s => s.id === sceneId)
  const openedRev = sceneChoice ? sceneRev ?? sceneChoice.revision : null
  // Products filtered by the chosen Scene; with no Scene, every Product of this Seller the Buyer may see (seeded and authored).
  const shownProducts = sceneChoice ? sceneChoice.products : linkableProducts(state, sellerId as SellerId, at, true)
  const product = productId ? productFacts(state, labels, at, sellerId, productId) : null
  const status = threadStatus(conversation, config.enabled)
  const list = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLSelectElement>(null)
  const productRef = useRef<HTMLSelectElement>(null)
  const count = conversation?.messages.length ?? 0
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }) }, [count])

  const subject = (): MessageSubject => ({
    sellerId,
    ...(sceneChoice ? { scene: { id: sceneChoice.id, revision: openedRev ?? sceneChoice.revision } } : {}),
    ...(productId ? { productId } : {}),
    ...(productId && Object.keys(variant).length ? { variant: { ...variant } } : {}),
  })
  const labelFor = (s: MessageSubject) => {
    const prod = s.productId ? productFacts(state, labels, at, sellerId, s.productId) : null
    const sc = s.scene ? sceneTitle(state, s.scene.id) : ''
    return prod ? `${prod.name}${sc ? ` · ${sc} Scene` : ''}` : sc ? `${sc} Scene` : `General question for ${seller}`
  }
  const subjectLabel = () => (product ? `${product.name}${sceneChoice ? ` · ${sceneTitle(state, sceneChoice.id)} Scene` : ''}` : sceneChoice ? `${sceneTitle(state, sceneChoice.id)} Scene` : `General question for ${seller}`)
  const send = (chip?: Chip, area?: string) => {
    const body = chip ? undefined : text.trim()
    if (!chip && !body) return
    // A quick reply acts on the subject of the response that offered it, not on what the composer shows now.
    const target = chip?.subject ?? subject()
    sendBuyerMessage(state, dispatch, labels, at, { buyerId: BUYER_ID, sellerId, text: body, chip, subject: { ...target, ...(area ? { area } : {}) }, subjectLabel: chip?.subject ? labelFor(chip.subject) : subjectLabel() })
    setNotice('')
    if (!chip) setText('')
  }
  const pickChip = (chip: Chip) => {
    if (chip.id.startsWith('select-product:')) { setProductId(chip.id.slice('select-product:'.length)); setVariant({}); return }
    if (chip.id === 'select-product' || chip.id === 'choose-product' || chip.id === 'select-size') { productRef.current?.focus(); return }
    if (chip.id.startsWith('option:')) { document.getElementById(`opt-${chip.id.slice(7)}`)?.focus(); return }
    if (chip.id === 'reopen-scene') { const live = scenes.find(s => s.id === (chip.subject?.scene?.id ?? sceneId)); if (live) { setSceneId(live.id); setSceneRev(live.revision); setNotice('Scene reopened at its current version.') } else setNotice('That Scene is no longer available.'); return }
    // Navigation targets the Product the response was about, and only while it is still viewable (a stale action never opens a hidden item).
    if (chip.id === 'open-product') { const id = chip.subject?.productId ?? productId; if (id && productFacts(state, labels, at, sellerId, id)?.viewable) onOpenProduct(id); else setNotice('That item is no longer available to view here.'); return }
    if (chip.id === 'open-cart') { onOpenCart(); return }
    send(chip, chip.id.startsWith('area:') ? chip.id.slice(5) : undefined)
  }
  const last = conversation?.messages[conversation.messages.length - 1]
  const offered = last && (last.from === 'bot' || last.from === 'ui') && conversation?.mode === 'bot' ? last : null
  const actionNames = (offered?.actions ?? []).flatMap((a: BotAction) => (a.kind === 'select-option' ? a.names : []))

  return (
    <>
      <div role="status" className="border-b border-border bg-warning-bg px-4 py-2 text-[11px] leading-relaxed text-text-secondary">{STATUS_TEXT[status]}</div>
      <div ref={list} role="list" aria-label="Messages" className="flex-1 overflow-y-auto bg-surface-raised p-4">
        {history}
        {conversation?.messages.map(m => <Bubble key={m.id} m={m} seller={seller} />)}
        {!history && !count && <p className="text-center text-sm text-text-muted">Ask about a Product, delivery or returns. Choose a Scene or Product below so the answer comes from its own record.</p>}
      </div>
      {notice && <div role="status" className="border-t border-border bg-surface px-3 pt-2 text-xs font-semibold text-text-secondary">{notice}</div>}
      {offered?.chips && offered.chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border bg-surface px-3 pt-2" aria-label="Quick replies">
          {offered.chips.map(chip => <button key={chip.id} type="button" onClick={() => pickChip(chip)} className="min-h-9 rounded-full border border-brand bg-brand-muted px-3 text-xs font-semibold text-brand-text">{chip.label}</button>)}
        </div>
      )}
      <div className="border-t border-border bg-surface p-3 pb-5">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <label className="flex flex-col text-[10px] font-semibold text-text-muted">Scene (optional)
            <select ref={sceneRef} aria-label="Scene (optional)" value={sceneId} onChange={e => { setSceneId(e.target.value); setSceneRev(scenes.find(s => s.id === e.target.value)?.revision ?? null); const next = scenes.find(s => s.id === e.target.value); if (next && productId && !next.products.some(p => p.id === productId)) { setProductId(''); setVariant({}) } }} className="mt-0.5 h-10 rounded-lg border border-border bg-surface px-2 text-sm font-normal text-text-primary">
              <option value="">No Scene</option>
              {scenes.map(s => <option key={s.id} value={s.id}>{sceneTitle(state, s.id)}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-semibold text-text-muted">Product
            <select ref={productRef} aria-label="Product" value={productId} onChange={e => { setProductId(e.target.value); setVariant({}) }} className="mt-0.5 h-10 rounded-lg border border-border bg-surface px-2 text-sm font-normal text-text-primary">
              <option value="">{sceneChoice ? 'Choose a Product in this Scene' : 'No Product selected'}</option>
              {shownProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        {product && product.options.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Product options">
            {product.options.map(o => (
              <label key={o.name} className={`flex flex-col text-[10px] font-semibold ${actionNames.includes(o.name) ? 'text-brand-text' : 'text-text-muted'}`}>{o.name}
                <select id={`opt-${o.name}`} aria-label={o.name} value={variant[o.name] ?? ''} onChange={e => setVariant(v => { const next = { ...v }; if (e.target.value) next[o.name] = e.target.value; else delete next[o.name]; return next })} className="mt-0.5 h-9 rounded-lg border border-border bg-surface px-2 text-sm font-normal text-text-primary">
                  <option value="">Choose {o.name.toLowerCase()}</option>
                  {o.values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input aria-label="Message" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} maxLength={300} placeholder={product ? `Ask about ${product.name}` : sceneChoice ? 'Ask about this Scene' : `Message ${seller}`} className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm" />
          <Button size="md" onClick={() => send()}>Send</Button>
        </div>
        <div className="mt-1 text-[10px] text-text-muted">Talking about: {subjectLabel()}. Changing this never changes a message already sent.</div>
      </div>
    </>
  )
}

function Bubble({ m, seller }: { m: ChatMsg; seller: string }) {
  if (m.from === 'ui') return <div role="listitem" className="my-3 text-center text-[11px] font-semibold text-text-muted">{m.text}</div>
  const mine = m.from === 'buyer'
  return (
    <div role="listitem" className={`${mine ? 'ml-auto items-end' : 'items-start'} mt-3 flex max-w-[82%] flex-col`}>
      {mine && <span className="mb-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-text-secondary">Talking about: {m.subjectLabel ?? 'General'}</span>}
      {!mine && <span className="mb-1 text-[10px] font-semibold text-text-muted">{m.from === 'bot' ? 'Automated assistant' : seller}{m.from === 'seller' && m.subjectLabel && m.subjectLabel !== `General question for ${seller}` ? ` · about ${m.subjectLabel}` : ''}</span>}
      <div className={`${mine ? 'rounded-tr-sm bg-brand text-on-brand' : 'rounded-tl-sm bg-surface shadow-sm'} rounded-2xl p-3 text-sm`}>{m.text}</div>
      {mine && m.escalated && <span className="mt-1 text-[10px] font-semibold text-success">Sent to {seller}</span>}
    </div>
  )
}
