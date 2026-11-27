// Scripted chatbot (BOT-001..006): shared types. Deterministic, English-first, no model and no network.
export type ScenarioGroup = 'C' | 'F' | 'G'
export type TurnRole = 'Buyer' | 'Bot' | 'UI' | 'Seller' | 'Operator'
export interface SourceTurn { role: TurnRole; text: string }
export interface SourceScenario {
  id: string; group: ScenarioGroup; title: string; page: number; pageEnd: number
  /** F-series: the Fashion branch (e.g. "Women’s Clothing"). */
  branch: string | null
  context: string; turns: SourceTurn[]; decision: string; ifMissing: string; additionalFields: string[]; whenAvailable: string
  source: { workbook: string; sheet: string; exampleCells: string[] } | null
  subjectText: string; intentText: string
}
export interface DialogueSource { source: { file: string; sha256: string; pages: number }; counts: Record<ScenarioGroup, number>; scenarios: SourceScenario[] }

export type IntentId =
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05'
  | 'P01' | 'P02' | 'P03' | 'P04' | 'P05' | 'P06' | 'P07' | 'P08' | 'P09'
  | 'C01' | 'C02' | 'C03' | 'A01' | 'A02' | 'X01' | 'X02' | 'X03'

/**
 * What a Message is about. It is stored WITH the Message when it is sent and never re-read from the composer, so changing the
 * selection later cannot change an earlier answer (ADU-CHATBOT-01 immutable message-level subject).
 */
export interface MessageSubject {
  sellerId: string
  /** An explicitly selected Scene; `revision` pins the Scene version the Buyer saw. */
  scene?: { id: string; revision: number }
  productId?: string
  /** Option name -> chosen value (an exact Variant when every option is present). */
  variant?: Record<string, string>
  quantity?: number
  area?: string
}
export type SubjectKind = 'NONE' | 'SCENE_POST' | 'PRODUCT_POST'
export const subjectKind = (s: MessageSubject): SubjectKind => (s.productId ? 'PRODUCT_POST' : s.scene ? 'SCENE_POST' : 'NONE')

// ---- Facts the engine may read (resolved by world.ts from the shared effective data, or by fixtures in tests) ----
export interface SellerReturns { eligibility: string; window: string; condition: string; process: string }
export interface SellerFacts {
  id: string; name: string; handle: string; bio: string
  collectionPlace: string; collectionHours: string
  /** Every area the Market lists (so a named city can be recognised even when this Seller does not serve it). */
  knownAreas: string[]
  methods: ('Buyer Collection' | 'Seller Delivery' | 'Courier Delivery')[]; deliveryFee: string; coverage: string[]
  returns: Partial<SellerReturns> | null
  warranty: { summary: string } | null
  sizeGuide: string
  botEnabled: boolean
  /** Supplementary Seller Q&A: consulted last, and never allowed to contradict a canonical fact. */
  supplementary: { id: string; topic: string; answer: string }[]
}
export interface ProductKnowledge { care?: string; usage?: string; sizeGuide?: string; compatibility?: string[]; authenticity?: string; condition?: string; warranty?: string; instructions?: string }
export interface ProductFacts {
  id: string; sellerId: string; name: string; description: string
  categoryId: string | null; categoryPath: string
  /** Taxonomy attribute labels defined for this leaf (not facts: allowed fields). */
  taxonomyLabels: string[]
  attributes: { label: string; value: string }[]
  listedDetails: string[]
  options: { name: string; values: string[] }[]
  /** Exact Variants with their own price (santim) and stock; null when the record keeps no per-Variant data. */
  variants: { label: string; values: Record<string, string>; price: number | null; stock: number }[] | null
  /** Current effective price in santim (discount applied), or null when none is set. */
  price: number | null; regularPrice: number | null; stock: number
  fulfilment: string[]; knowledge: ProductKnowledge
  viewable: boolean
}
export interface SceneFacts { id: string; revision: number; viewable: boolean; summary: string; products: { id: string; name: string }[] }
export interface World {
  seller(id: string): SellerFacts | null
  /** May throw to model a failed read; the engine then answers with the unavailable-read template. */
  product(sellerId: string, productId: string): ProductFacts | null
  scene(sellerId: string, sceneId: string): SceneFacts | null
  eligibleProducts(sellerId: string): { id: string; name: string }[]
}

// ---- Engine input / output ----
/** A clarification belongs to the Message that raised it and to that Message's subject (`subjectKey`); it is never reapplied to another subject. */
export type Pending = (
  | { kind: 'offer-handoff'; messageId: string }
  | { kind: 'pick-intent'; intents: IntentId[]; messageId: string }
  | { kind: 'need-device'; messageId: string }
  | { kind: 'need-area'; messageId: string }
) & { subjectKey?: string }
export interface ChatState { mode: 'bot' | 'human_takeover' | 'bot_disabled'; pending?: Pending | null }
export interface BotInput {
  messageId: string; conversationSellerId: string; text?: string; chip?: string; subject: MessageSubject
  /** True when the previous Buyer message in this conversation was about a different Product: the answer then names its Product. */
  contextShift?: boolean
}
/** A quick reply is bound to the subject of the response that offered it, not to whatever the composer shows when it is tapped. */
export interface Chip { id: string; label: string; subject?: MessageSubject }
export type BotAction = { kind: 'open-product'; productId: string } | { kind: 'open-cart'; productId?: string } | { kind: 'show-size-guide' } | { kind: 'select-product' } | { kind: 'select-option'; names: string[] } | { kind: 'select-area' }
export interface Slot { name: string; value: string; source: string }
export type ResultKind = 'answer' | 'clarify' | 'handoff-offer' | 'handoff' | 'denied' | 'deferred' | 'no-reply'
export interface BotResult {
  kind: ResultKind
  intent: IntentId | null
  /** Source dialogue ids (C-/F-/G-) whose scripted behaviour produced this result. */
  dialogue: string[]
  templateId: string; templateVersion: string
  /** The rendered reply; null when the Bot is silent (human takeover). */
  text: string | null
  speaker: 'bot' | 'ui'
  quickReplies: Chip[]; actions: BotAction[]
  slots: Slot[]; missing: string[]; reason: string
  /** The subject of the Message this result answers (what its quick replies and actions act on). */
  subject: MessageSubject
  conflicts: { topic: string; canonical: string; supplementary: string }[]
  handoff: { originalMessageId: string } | null
  pending: Pending | null
  subjectKind: SubjectKind
  trace: string[]
  /** Always empty: a reply never changes the Cart, inventory, a price, a Reservation, an Order or any money. */
  sideEffects: []
}
