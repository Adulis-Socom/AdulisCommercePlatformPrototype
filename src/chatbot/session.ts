// Sending a Buyer message and the Seller's reply (BOT-006). The Bot's answer comes from the one deterministic engine; nothing here touches
// the Cart, inventory, a price or money. The Message keeps the subject it was sent with, and the answer is stored beside it.
import type { Dispatch } from 'react'
import { CONVERSATIONS, contextSubject, type ConversationId, type MessageContext, type Moment } from '../demo-data'
import { contextToSubject, keyFor } from './thread'
import type { WorkspaceState } from '../seller-workspace'
import { conversationKey, newConversation, type ChatMsg } from './chat'
import { respond } from './engine'
import type { LeafLabels } from './taxonomy-labels'
import type { Chip, MessageSubject } from './types'
import { buildWorld, MARKET } from './world'

type Send = { type: 'chat-exchange'; conversation: ReturnType<typeof newConversation>; messages: ChatMsg[]; pending: ReturnType<typeof respond>['pending']; escalate?: string; waiting?: boolean }

export interface BuyerSend { buyerId: string; sellerId: string; text?: string; chip?: Chip; subject: MessageSubject; subjectLabel: string }

/** Appends the Buyer's Message and the Bot's answer (if any) to the shared conversation. Returns the engine result for tests and the Lab. */
export function sendBuyerMessage(state: WorkspaceState, dispatch: Dispatch<Send>, labels: LeafLabels | null, at: Moment, p: BuyerSend) {
  const key = conversationKey(p.buyerId, p.sellerId, MARKET.id)
  const conversation = state.chats[key] ?? newConversation(p.buyerId, p.sellerId, MARKET.id)
  const text = (p.text ?? p.chip?.label ?? '').trim()
  if (!text) return null
  const id = `${key}#${conversation.seq + 1}`
  const lastBuyer = [...conversation.messages].reverse().find(m => m.from === 'buyer')
  const contextShift = !!lastBuyer?.subject && lastBuyer.subject.productId !== p.subject.productId && !!p.subject.productId
  const world = buildWorld(state, labels, at)
  const result = respond(
    { messageId: id, conversationSellerId: p.sellerId, text: p.chip ? undefined : text, chip: p.chip?.id, subject: p.subject, contextShift },
    { mode: conversation.mode, pending: conversation.pending }, world,
  )
  const handoffThis = result.handoff?.originalMessageId === id
  const buyer: ChatMsg = { id, seq: conversation.seq + 1, from: 'buyer', text, subject: p.subject, subjectLabel: p.subjectLabel, ...(handoffThis ? { escalated: true } : {}) }
  const messages = [buyer]
  if (result.text !== null) {
    messages.push({ id: `${id}.bot`, seq: conversation.seq + 2, from: result.speaker, text: result.text, replyTo: id, intent: result.intent, templateId: result.templateId, templateVersion: result.templateVersion, kind: result.kind, dialogue: result.dialogue, chips: result.quickReplies, actions: result.actions })
  }
  dispatch({ type: 'chat-exchange', conversation, messages, pending: conversation.mode === 'human_takeover' ? null : result.pending,
    escalate: result.handoff && !handoffThis ? result.handoff.originalMessageId : undefined, waiting: handoffThis ? true : undefined })
  return result
}

/** A reply from a team member to a seeded or live thread, with the Product or Scene the Seller chose as its explicit context. */
export function replyInThread(state: WorkspaceState, dispatch: Dispatch<{ type: 'chat-seller'; key: string; message: ChatMsg; conversation?: ReturnType<typeof newConversation> }>, id: ConversationId, staffName: string, text: string, context: MessageContext) {
  const body = text.trim()
  if (!body) return
  const key = keyFor(id)
  const c = state.chats[key] ?? newConversation(CONVERSATIONS[id].buyer, CONVERSATIONS[id].seller, MARKET.id)
  const subject = contextToSubject(c.sellerId, context)
  dispatch({ type: 'chat-seller', key, conversation: c, message: { id: `${key}#${c.seq + 1}`, seq: c.seq + 1, from: 'seller', text: body, staff: staffName, subject, subjectLabel: contextSubject(context) } })
}

export function sellerReply(dispatch: Dispatch<{ type: 'chat-seller'; key: string; message: ChatMsg }>, state: WorkspaceState, key: string, text: string, staff: string) {
  const c = state.chats[key]
  const body = text.trim()
  if (!c || !body) return
  dispatch({ type: 'chat-seller', key, message: { id: `${key}#${c.seq + 1}`, seq: c.seq + 1, from: 'seller', text: body, staff } })
}
