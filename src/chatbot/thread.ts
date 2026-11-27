// FIX-007: one thread per Buyer, Seller and Market. Seeded DEMO_DATA history and this session's messages (Buyer, Assistant, Seller) are one
// ordered list on every surface. This module turns the shared conversation store into the record shape the older Inbox and Buyer views already
// render, and turns a Seller's chosen reply context into the explicit Product/Scene subject stored with the reply.
import { MARKET, STAFF, SURFACE_DEFAULTS, conversationBetween, type ConversationId, type MessageContext, type MessageRecord, type SellerId, type StaffId } from '../demo-data'
import { CONVERSATIONS } from '../demo-data'
import { conversationKey, newConversation, type ChatMsg, type Conversation } from './chat'
import type { MessageSubject } from './types'

/** The store's key for a seeded thread's Buyer and Seller. */
export const keyFor = (id: ConversationId) => conversationKey(CONVERSATIONS[id].buyer, CONVERSATIONS[id].seller, MARKET.id)
export const BUYER_ID = SURFACE_DEFAULTS.buyer
/** True when a Seller-side live conversation belongs to a seeded thread (so its messages appear inside that thread, not as a second list entry). */
export const seededThreadOf = (c: Conversation): ConversationId | undefined => conversationBetween(c.buyerId as never, c.sellerId as SellerId)

export function subjectToContext(subject: MessageSubject | undefined): MessageContext {
  if (subject?.productId) return { product: subject.productId } as MessageContext
  if (subject?.scene) return { post: subject.scene.id } as MessageContext
  return { general: true }
}
/** The explicit subject a Seller reply carries: the Product or the Scene the Seller chose (orders belong to the simulation and stay a label). */
export function contextToSubject(sellerId: string, context: MessageContext, revision?: number): MessageSubject {
  if ('product' in context) return { sellerId, productId: context.product }
  if ('post' in context) return { sellerId, scene: { id: context.post, revision: revision ?? 0 } }
  return { sellerId }
}

/** The conversation's live messages in the shape the Inbox views render. Automated answers carry `automated`, Seller replies the team member's name. */
export function liveAsRecords(c: Conversation | undefined, fallbackStaff: StaffId, at: { at: string }): MessageRecord[] {
  if (!c) return []
  return c.messages.map((m: ChatMsg, i): MessageRecord => ({
    at: at.at, sequence: 1000 + (m.seq || i), from: m.from === 'buyer' ? 'buyer' : fallbackStaff,
    context: m.from === 'seller' || m.from === 'buyer' ? subjectToContext(m.subject) : subjectToContext(c.messages.find(x => x.id === m.replyTo)?.subject),
    text: m.text, ...(m.escalated ? { escalatedFromChatbot: true } : {}),
    ...(m.from === 'bot' || m.from === 'ui' ? { automated: true } : {}), ...(m.from === 'seller' ? { author: m.staff } : {}),
  }))
}

export { newConversation }
export { STAFF }
