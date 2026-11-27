/**
 * SC-006: the deterministic Buyer-question responder used by the Seller's chatbot test. No model, no network, no memory:
 * the same question and facts always give the same outcome. It never invents a fact, price, policy, warranty or stock value:
 * anything it cannot read from the Seller's approved answers or the Seller's own records is escalated to a human.
 * The dialogue rules follow ADU-CHATBOT-01 (explicit subject, no guessing between Products in a Scene, unsupported topics go
 * to a human) and the Nov 24 amendment (no payment or order flows while checkout is a preview). The proposed script library
 * is a reference only: its draft wording is not adopted here.
 */
export interface Knowledge { id: string; topic: string; answer: string }
export interface ProductFacts { id: string; name: string; fromPrice: number | null; stock: number; options: { name: string; values: string[] }[]; description: string; attributes: string[]; fulfilment: string[] }
export interface StoreFacts { methods: string[]; collectionPlace: string; deliveryFee: string }
export type Subject =
  | { kind: 'general' }
  | { kind: 'product'; product: ProductFacts; scene?: { id: string; caption: string } }
  | { kind: 'scene'; scene: { id: string; caption: string }; products: ProductFacts[] }

export type Outcome =
  | { kind: 'answered'; text: string; source: string }
  | { kind: 'select-product'; message: string; choices: string[] }
  | { kind: 'escalate'; code: 'UNSUPPORTED_COMMERCE' | 'NO_APPROVED_ANSWER' | 'MISSING_INFORMATION' | 'EMPTY'; reason: string }

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'does', 'you', 'your', 'i', 'it', 'this', 'that', 'of', 'to', 'for', 'in', 'on', 'can', 'what', 'how', 'my', 'me', 'we', 'have', 'there', 'be', 'and', 'or', 'with', 'any', 'about', 'please'])
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w))
const has = (q: string, re: RegExp) => re.test(q.toLowerCase())

/** Payment, ordering, refund and Claim talk is never answered by automation in Release 1 (checkout is a preview only). */
const COMMERCE = /\b(pay|paid|payment|checkout|order(ed|ing)?|refund|claim|receipt|invoice|deposit|installment|cash on delivery|track(ing)?)\b/
const birr = (santim: number) => `ETB ${(santim / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export function respond(question: string, subject: Subject, knowledge: readonly Knowledge[], store: StoreFacts): Outcome {
  const q = question.trim()
  if (!q) return { kind: 'escalate', code: 'EMPTY', reason: 'Type a Buyer question to test.' }
  if (has(q, COMMERCE)) return { kind: 'escalate', code: 'UNSUPPORTED_COMMERCE', reason: 'Payments, orders, refunds and Claims are not handled by automation in this release. Checkout is a preview and no Order is placed, so a person replies.' }

  // 1. The Seller's own approved answers: at least half of a topic's keywords must appear in the question.
  const qw = new Set(words(q))
  let best: { entry: Knowledge; score: number } | null = null
  for (const entry of knowledge) {
    const tw = words(entry.topic)
    if (!tw.length) continue
    const score = tw.filter(w => qw.has(w)).length / tw.length
    if (score >= 0.5 && (!best || score > best.score)) best = { entry, score }
  }
  if (best) return { kind: 'answered', text: best.entry.answer, source: `Seller-approved answer: “${best.entry.topic}”` }

  // 2. Facts about a Product need an explicit Product. Never guess among the Products in a Scene.
  const productIntent = has(q, /\b(price|cost|how much|expensive|in stock|available|availability|left|stock|size|sizes|colou?rs?|shade|variant|option|material|made of|fabric|ingredient|care|describe|description|tell me about|details?)\b/)
  if (productIntent && subject.kind !== 'product') {
    const choices = subject.kind === 'scene' ? subject.products.map(p => p.name) : []
    return { kind: 'select-product', choices, message: subject.kind === 'scene' ? 'Which Product in this Scene do you mean? Choose one so the answer comes from its own record.' : 'Which Product do you mean? Choose a Product so the answer comes from its own record.' }
  }
  if (subject.kind === 'product') {
    const p = subject.product
    if (has(q, /\b(price|cost|how much|expensive)\b/)) return p.fromPrice === null
      ? { kind: 'escalate', code: 'MISSING_INFORMATION', reason: `${p.name} has no price set yet, so the assistant cannot state one.` }
      : { kind: 'answered', text: `${p.name} is ${p.options.length ? 'from ' : ''}${birr(p.fromPrice)}.`, source: 'Product record: price' }
    if (has(q, /\b(in stock|available|availability|left|stock)\b/)) return { kind: 'answered', text: p.stock <= 0 ? `${p.name} is out of stock right now.` : `${p.name} is in stock.`, source: 'Product record: stock state (no quantity is revealed)' }
    if (has(q, /\b(size|sizes|colou?rs?|shade|variant|option)\b/)) return p.options.length
      ? { kind: 'answered', text: `${p.name} comes in ${p.options.map(o => `${o.name}: ${o.values.join(', ')}`).join('; ')}.`, source: 'Product record: options' }
      : { kind: 'escalate', code: 'MISSING_INFORMATION', reason: `${p.name} lists no options, so the assistant cannot answer. The Seller can reply.` }
    if (has(q, /\b(material|made of|fabric|ingredient|care)\b/)) return p.attributes.length
      ? { kind: 'answered', text: `Details recorded for ${p.name}: ${p.attributes.join('; ')}.`, source: 'Product record: attributes' }
      : { kind: 'escalate', code: 'MISSING_INFORMATION', reason: `The Seller has not recorded material or care details for ${p.name}. The assistant will not guess.` }
    if (has(q, /\b(describe|description|tell me about|details?)\b/)) return p.description.trim()
      ? { kind: 'answered', text: p.description.trim(), source: 'Product record: description' }
      : { kind: 'escalate', code: 'MISSING_INFORMATION', reason: `${p.name} has no description yet.` }
  }

  // 3. Fulfilment as the Seller configured it. A fee or place is stated only when set.
  if (has(q, /\b(deliver|delivery|collect|collection|pick ?up|ship|shipping)\b/)) {
    if (!store.methods.length) return { kind: 'escalate', code: 'MISSING_INFORMATION', reason: 'No fulfilment method is configured in Store setup, so the assistant cannot answer.' }
    const parts = store.methods.map(m => (m === 'Buyer Collection' && store.collectionPlace ? `Buyer Collection (${store.collectionPlace})` : m === 'Seller Delivery' && store.deliveryFee !== '' ? `Seller Delivery (ETB ${store.deliveryFee})` : m))
    return { kind: 'answered', text: `This Seller offers ${parts.join(', ')}. Delivery times are not stated by the assistant.`, source: 'Store setup: fulfilment' }
  }

  // 4. Everything else, including warranty, returns, discounts and custom requests with no approved answer, goes to a person.
  return { kind: 'escalate', code: 'NO_APPROVED_ANSWER', reason: 'No approved answer covers this. The assistant does not invent policies, prices, warranties or promises, so it hands over to the Seller.' }
}
