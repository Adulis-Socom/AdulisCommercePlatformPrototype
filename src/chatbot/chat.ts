// Shared conversation state (BOT-006). One private conversation per Buyer + Seller + Market. Every Buyer message keeps the subject it was
// sent with (immutable); the Bot's answer, the Seller's replies and any handoff live in the same thread, so the Seller Inbox sees exactly
// what the Buyer saw. Prototype only: session storage, no messaging backend.
import type { BotAction, Chip, IntentId, MessageSubject, Pending, ResultKind } from './types.ts'

export interface ChatMsg {
  id: string; seq: number
  from: 'buyer' | 'bot' | 'seller' | 'ui'
  text: string
  /** Buyer messages only: the subject chosen when the message was sent, and its display names at that moment. Never edited afterwards. */
  subject?: MessageSubject; subjectLabel?: string
  /** Bot/ui messages: what produced the reply (kept so a stored answer stays attributable to its template version). */
  replyTo?: string; intent?: IntentId | null; templateId?: string; templateVersion?: string; kind?: ResultKind; dialogue?: string[]
  chips?: Chip[]; actions?: BotAction[]
  /** Buyer messages only: forwarded to the Seller (the original text is retained exactly once). */
  escalated?: boolean
  /** Seller messages: the team member's display name. */
  staff?: string
}
export interface Conversation {
  key: string; sellerId: string; buyerId: string; marketId: string
  messages: ChatMsg[]
  /** `human_takeover` silences the Bot until the Seller hands the conversation back. */
  mode: 'bot' | 'human_takeover'
  pending: Pending | null
  /** True from a handoff until a person replies. */
  waiting: boolean
  seq: number
}
export const conversationKey = (buyerId: string, sellerId: string, marketId: string) => `${buyerId}|${sellerId}|${marketId}`
export const newConversation = (buyerId: string, sellerId: string, marketId: string): Conversation => ({ key: conversationKey(buyerId, sellerId, marketId), sellerId, buyerId, marketId, messages: [], mode: 'bot', pending: null, waiting: false, seq: 0 })

/** The thread status the Buyer and the Seller both see. */
export const threadStatus = (c: Conversation | undefined, botEnabled: boolean): 'bot' | 'waiting' | 'human' | 'bot-off' =>
  c?.mode === 'human_takeover' ? 'human' : c?.waiting ? 'waiting' : botEnabled ? 'bot' : 'bot-off'
