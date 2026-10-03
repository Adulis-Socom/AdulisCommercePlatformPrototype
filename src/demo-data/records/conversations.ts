// Conversations and the Addis Atelier chatbot (docs/DEMO_DATA.md › Conversations). One ongoing conversation per Buyer and
// Seller (rule 12.1); each message keeps the context it was sent with (rule 12.3). Context selector options are derived.
import type { Timestamp } from '../time.ts'
import type { BuyerId } from './buyers.ts'
import type { OrderId } from './orders.ts'
import type { ShoppablePostId } from './posts.ts'
import type { ProductId } from './products.ts'
import type { SellerId, StaffId } from './sellers.ts'

export type MessageContext = { readonly product: ProductId } | { readonly post: ShoppablePostId } | { readonly order: OrderId }

export interface MessageRecord {
  readonly at: Timestamp
  /** The Buyer, or the Seller team member who replied (Buyers see the Seller; Seller surfaces show the member). */
  readonly from: 'buyer' | StaffId
  readonly context: MessageContext
  readonly text: string
  /** Asked of the Seller's chatbot, which had no approved answer, so the Buyer chose Talk to Seller. */
  readonly escalatedFromChatbot?: boolean
}

export interface ConversationRecord {
  readonly buyer: BuyerId
  readonly seller: SellerId
  readonly messages: readonly MessageRecord[]
}

const CONVERSATION_RECORDS = {
  'CNV-MAYA-AA': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-ADDIS-ATELIER',
    messages: [
      { at: '2026-09-17T19:10:00+03:00', from: 'buyer', context: { product: 'PRD-AA-003' }, text: 'Is the bag big enough for a 13-inch laptop?' },
      { at: '2026-09-17T19:32:00+03:00', from: 'STF-AA-02', context: { product: 'PRD-AA-003' }, text: 'Yes, it fits most 13-inch laptops. The inner width is 34 cm.' },
      { at: '2026-09-24T20:05:00+03:00', from: 'buyer', context: { post: 'SHP-AA-001' }, text: 'Which trousers are in the Autumn Layers post?' },
      { at: '2026-09-24T20:20:00+03:00', from: 'STF-AA-01', context: { post: 'SHP-AA-001' }, text: "Those are our Wide-Leg Trousers in Sand. They're tagged in the post." },
      { at: '2026-10-02T10:12:00+03:00', from: 'buyer', context: { order: 'ADU-24091' }, text: "Hi! I'll be home in Kazanchis after 2 PM today." },
      { at: '2026-10-02T10:41:00+03:00', from: 'STF-AA-02', context: { order: 'ADU-24091' }, text: "Thanks, Maya. We've started preparing your overshirt." },
      { at: '2026-10-02T11:35:00+03:00', from: 'buyer', context: { product: 'PRD-AA-001' }, text: 'Does the Linen Overshirt come in navy?', escalatedFromChatbot: true },
      { at: '2026-10-02T11:48:00+03:00', from: 'STF-AA-02', context: { product: 'PRD-AA-001' }, text: "Not at the moment. We'll let you know if we add navy." },
    ],
  },
  'CNV-MAYA-NG': {
    buyer: 'BUY-MAYA-TESFAYE', seller: 'SEL-NURA-GLOW',
    messages: [
      { at: '2026-09-12T13:10:00+03:00', from: 'buyer', context: { order: 'ADU-23864' }, text: "The Lip Tint cap was cracked when it arrived. I've opened a claim." },
      { at: '2026-09-12T13:20:00+03:00', from: 'STF-NG-01', context: { order: 'ADU-23864' }, text: "So sorry, Maya. We'll make it right." },
      // Coordination only: the authorization itself is the recipient record on ADU-24092 (rule 12.4).
      { at: '2026-10-02T12:15:00+03:00', from: 'buyer', context: { order: 'ADU-24092' }, text: 'My sister Liya will receive this order.' },
      { at: '2026-10-02T12:22:00+03:00', from: 'STF-NG-01', context: { order: 'ADU-24092' }, text: "Thank you, we'll keep that in mind." },
    ],
  },
  'CNV-SAMUEL-AA': {
    buyer: 'BUY-SAMUEL-ALEMU', seller: 'SEL-ADDIS-ATELIER',
    messages: [
      { at: '2026-09-29T13:25:00+03:00', from: 'buyer', context: { order: 'ADU-24041' }, text: 'Can I collect tomorrow afternoon?' },
      { at: '2026-09-29T13:40:00+03:00', from: 'STF-AA-02', context: { order: 'ADU-24041' }, text: 'Yes, it will be ready from 11:00. The studio is open until 18:00.' },
    ],
  },
} satisfies Record<string, ConversationRecord>

export type ConversationId = keyof typeof CONVERSATION_RECORDS
export const CONVERSATIONS: Readonly<Record<ConversationId, ConversationRecord>> = CONVERSATION_RECORDS
export const CONVERSATION_IDS = Object.keys(CONVERSATION_RECORDS) as ConversationId[]

/** Seller chatbots (Automation, specification §37). Only Addis Atelier has one; its unmatched question is a message above. */
export const CHATBOTS: Readonly<Partial<Record<SellerId, { readonly answers: readonly { readonly topic: string; readonly answer: string }[] }>>> = {
  'SEL-ADDIS-ATELIER': {
    answers: [
      { topic: 'Collection hours', answer: 'Our Bole studio is open Monday to Saturday, 10:00–18:00.' },
      { topic: 'Sizing', answer: "Each Product Post has a size guide. Send us your measurements and we'll help." },
      { topic: 'Linen care', answer: 'Hand wash linen cold and dry it flat.' },
    ],
  },
}
