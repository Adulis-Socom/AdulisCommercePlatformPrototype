// Deterministic Buyer-question engine (BOT-002, BOT-003). Pure: the same input, state and facts always give the same result.
// No model, no network, no clock, no randomness. It reads facts through `World`, never writes anything, and never invents a fact.
//
// Authority order (BOT-003): 1 validate conversation and subject; 2 resolve intent and commercial restrictions; 3 current canonical
// Product and Variant facts; 4 configured Seller policy; 5 supplementary, non-conflicting Seller knowledge; 6 clarify or escalate.
import { ATTRIBUTE_WORDS, CLAUSE_RULES, GEEZ, INTENT_LABEL, NON_ENGLISH_WORDS, RULES } from './intents.ts'
import { SCRIPTED_QUESTIONS, dialogueForCategory, normQuestion } from './library.ts'
import { TEMPLATES, TEMPLATE_VERSION, render, type TemplateId } from './templates.ts'
import {
  subjectKind, type BotInput, type MessageSubject, type BotResult, type Chip, type ChatState, type IntentId, type Pending, type ProductFacts,
  type ResultKind, type SceneFacts, type SellerFacts, type Slot, type World,
} from './types.ts'

const STOP = new Set('the a an is are do does you your i it this that of to for in on can what how my me we have there be and or with which when where will would should could please just tell about item'.split(' '))
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '')
const words = (text: string) => text.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/).map(w => stem(w)).filter(w => w && !STOP.has(w))
const SYNONYMS: Record<string, string[]> = {
  material: ['fabric', 'made', 'composition', 'textile', 'cloth'], transparency: ['see', 'through', 'sheer', 'transparent', 'layer', 'underneath', 'opaque'],
  length: ['long', 'short'], rise: ['waist'], stretch: ['stretchy', 'elastic'], closure: ['fasten', 'close', 'zip', 'button', 'zipper'],
  piece: ['include', 'included', 'come', 'set'], lining: ['lined'], warmth: ['warm'], insulation: ['warm'], weather: ['rain', 'protect'],
  activity: ['designed', 'intended', 'sport'], support: ['support'], padding: ['padded'], coverage: ['cover'], colour: ['color', 'shade'],
  care: ['wash', 'clean', 'laundry'], width: ['wide'], heel: ['high'], capacity: ['hold', 'litre', 'liter'], dimension: ['big', 'tall', 'height', 'size'],
  age: ['kid', 'old', 'child'], quantity: ['pair', 'single'], compatibility: ['work', 'laptop', 'device'], feel: ['soft', 'texture'],
}
/** "Size M, Black": the first option carries its name, the rest only their values (C-03, C-04). */
const variantText = (options: { name: string }[], values: Record<string, string>) => options.filter(o => values[o.name]).map((o, i) => (i === 0 ? `${o.name} ${values[o.name]}` : values[o.name])).join(', ')
const money = (santim: number) => (santim / 100).toLocaleString('en-US', { minimumFractionDigits: santim % 100 ? 2 : 0, maximumFractionDigits: 2 })
const sentence = (names: string[]) => names.join(' and ')
const withArticle = (names: string[]) => { const t = sentence(names.map(n => n.toLowerCase())); return /^[aeiou]/.test(t) ? `an ${t}` : `a ${t}` }
const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const QTY_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }
const SIZE_ALIASES: Record<string, string[]> = { S: ['small'], M: ['medium'], L: ['large'], XL: ['extra large', 'x-large', 'xl'], XXL: ['xxl', '2xl'], XS: ['extra small', 'x-small'] }

interface Detected { option: string; value: string; said: string }

class Run {
  trace: string[] = []
  slots: Slot[] = []
  missing: string[] = []
  conflicts: BotResult['conflicts'] = []
  slot(name: string, value: string, source: string) { this.slots.push({ name, value, source }) }
}

export function respond(input: BotInput, state: ChatState, world: World): BotResult {
  const run = new Run()
  const kind = subjectKind(input.subject)
  // The subject this response is about: the Message's own, plus any Variant its text names. Quick replies and clarifications bind to it.
  let bound: MessageSubject = input.subject
  const base = (r: Partial<BotResult> & Pick<BotResult, 'kind' | 'templateId' | 'text'>): BotResult => {
    const res: BotResult = {
      intent: null, dialogue: [], templateVersion: TEMPLATE_VERSION, speaker: 'bot', quickReplies: [], actions: [], slots: run.slots, missing: run.missing, reason: '',
      conflicts: run.conflicts, handoff: null, pending: null, subjectKind: kind, subject: bound, trace: run.trace, sideEffects: [], ...r,
    }
    // Bind everything the Buyer can tap to THIS response's subject, so a later change of the composer cannot redirect it.
    res.quickReplies = res.quickReplies.map(c => ({ ...c, subject: c.subject ?? bound }))
    res.pending = res.pending ? { ...res.pending, subjectKey: subjectKey(input.subject), ...(bound.variant && Object.keys(bound.variant).length ? { variant: { ...bound.variant } } : {}) } : null
    return res
  }
  const say = (id: TemplateId, slots: Record<string, string>, r: Omit<Partial<BotResult>, 'text' | 'templateId'> & { kind: ResultKind }) =>
    base({ ...r, templateId: id, text: render(id, slots), speaker: id.startsWith('UI-') ? 'ui' : 'bot' })
  const offer = (id: TemplateId, slots: Record<string, string>, r: Omit<Partial<BotResult>, 'text' | 'templateId' | 'kind' | 'pending'> & { reason: string }) =>
    say(id, slots, { ...r, kind: 'handoff-offer', pending: { kind: 'offer-handoff', messageId: input.messageId }, quickReplies: r.quickReplies ?? (id === 'T-ATTR-UNKNOWN' && input.subject.productId ? VIEW_PRODUCT(input.subject.productId).quickReplies : [{ id: 'talk-to-seller', label: 'Talk to seller' }]), actions: r.actions ?? (id === 'T-ATTR-UNKNOWN' && input.subject.productId ? VIEW_PRODUCT(input.subject.productId).actions : []) })
  const handoff = (id: TemplateId, originalMessageId: string, r: Omit<Partial<BotResult>, 'text' | 'templateId' | 'kind' | 'handoff'> = {}) =>
    say(id, {}, { ...r, kind: 'handoff', handoff: { originalMessageId } })
  const TALK: Chip = { id: 'talk-to-seller', label: 'Talk to seller' }

  try {
    // ---- 0. conversation mode: a human has taken over or the Seller turned the bot off ----
    if (state.mode === 'human_takeover') {
      run.trace.push('mode: human takeover, so the Bot stays silent and the Message is kept for the Seller')
      return base({ kind: 'no-reply', templateId: 'NONE', text: null, reason: 'HUMAN_TAKEOVER' })
    }
    const seller = world.seller(input.conversationSellerId)
    if (state.mode === 'bot_disabled' || (seller && !seller.botEnabled)) {
      run.trace.push('mode: bot disabled for this Seller; static status, Message goes to the Seller')
      return say('UI-BOT-OFF', {}, { kind: 'handoff', handoff: { originalMessageId: input.messageId }, reason: 'BOT_DISABLED', dialogue: ['C-18'] })
    }

    // ---- 1. validate the conversation and the Message's own subject ----
    const denied = (why: string) => { run.trace.push(`subject denied: ${why}`); return say('T-UNSAFE', {}, { kind: 'denied', intent: 'X03', reason: 'INVALID_SUBJECT', dialogue: ['C-19'], quickReplies: [TALK] }) }
    if (!seller || input.subject.sellerId !== input.conversationSellerId) return denied('Seller mismatch or unknown Seller')
    const sel: SellerFacts = seller
    let product: ProductFacts | null = null
    let scene: SceneFacts | null = null
    let readFailure: unknown = null // a failed read must not stop a handoff, but nothing else may be answered without it
    try {
      if (input.subject.scene) {
        scene = world.scene(seller.id, input.subject.scene.id)
        if (!scene) return denied('Scene not found for this Seller')
      }
      if (input.subject.productId) {
        product = world.product(seller.id, input.subject.productId)
        if (!product || product.sellerId !== seller.id) return denied('Product not found for this Seller')
        if (scene && scene.viewable && scene.revision === input.subject.scene!.revision && !scene.products.some(p => p.id === product!.id)) return denied('Product is not tagged in the stated Scene')
      }
    } catch (error) { readFailure = error }
    const text = (input.text ?? '').trim()
    const chip = input.chip ?? ''
    if (scene && !scene.viewable) {
      run.trace.push('Scene is no longer viewable')
      const detail = /caption|descri|what('s| is) (in|inside)|items|products|details|new|changed/i.test(text)
      return say(detail ? 'T-SCENE-NO-DETAILS' : 'T-SCENE-UNAVAILABLE', {}, { kind: 'denied', intent: detail ? 'C03' : 'C02', reason: 'SCENE_UNAVAILABLE', dialogue: ['C-09'], quickReplies: [{ id: 'choose-product', label: 'Choose a current Product' }, TALK], pending: { kind: 'offer-handoff', messageId: input.messageId } })
    }
    if (product && !product.viewable) {
      run.trace.push('Product is no longer viewable')
      return say('T-SUBJECT-UNAVAILABLE', {}, { kind: 'denied', intent: 'C02', reason: 'PRODUCT_UNAVAILABLE', dialogue: ['C-09'], quickReplies: [{ id: 'choose-product', label: 'Choose a current Product' }, TALK] })
    }
    run.trace.push(`subject: ${kind}${product ? ` ${product.id}` : ''}${scene ? ` in scene ${scene.id}@${input.subject.scene!.revision}` : ''}`)
    const p = product
    // A clarification raised for another subject is dropped, never reapplied to this one.
    let pend = state.pending ?? null
    if (pend && pend.kind !== 'offer-handoff' && pend.subjectKey && pend.subjectKey !== subjectKey(input.subject)) { run.trace.push('pending clarification belongs to an earlier Message about a different subject, so it is dropped'); pend = null }
    // ...and to its exact Variant: a composer choice that contradicts the Variant it was raised for is a different question.
    if (pend && pend.kind !== 'offer-handoff' && pend.variant && input.subject.variant && Object.entries(input.subject.variant).some(([option, value]) => pend!.variant![option] !== undefined && pend!.variant![option] !== value)) { run.trace.push('pending clarification was raised for a different Variant, so it is dropped'); pend = null }

    // ---- chips (canonical quick replies) ----
    const goHuman = (originalId: string, offered: boolean) => handoff(offered ? 'T-HANDOFF-SENT' : 'T-HANDOFF', originalId, { intent: 'X02', reason: 'BUYER_ASKED_FOR_SELLER', dialogue: offered ? ['C-06', 'C-14', 'C-18'] : ['C-17'] })
    if (chip === 'talk-to-seller' || chip === 'send-offer') {
      const pending = pend?.kind === 'offer-handoff' ? pend : null
      run.trace.push('chip: talk to seller')
      return goHuman(pending?.messageId ?? input.messageId, !!pending)
    }

    // ---- 2. text pipeline ----
    const hasText = text.length > 0 || chip !== ''
    if (!hasText) return say('T-UNKNOWN-OFFER', {}, { kind: 'clarify', intent: 'X03', reason: 'EMPTY_MESSAGE' })
    const chipIntent = CHIP_INTENT[chip]
    const t = text
    // A Variant named in this Message's text is part of ITS subject: record it so chips and clarifications carry the exact Variant.
    if (p && t) {
      const named = detectVariant(t, p)
      if (named.length) bound = { ...input.subject, variant: { ...(input.subject.variant ?? {}), ...Object.fromEntries(named.map(d => [d.option, d.value])) } }
    }
    if (!chipIntent && (GEEZ.test(t) || NON_ENGLISH_WORDS.test(t))) {
      run.trace.push('language: not English, so automated English NLU is bypassed and the original text goes to the Seller')
      return handoff('T-HANDOFF', input.messageId, { intent: 'X02', reason: 'UNSUPPORTED_LANGUAGE', dialogue: ['C-17'] })
    }
    const confirm = RULES.confirmYes.test(t) || RULES.sendOffer.test(t) || RULES.talk.test(t)
    if (confirm && pend?.kind === 'offer-handoff') {
      run.trace.push('confirmation of the offer to send the earlier question to the Seller')
      return goHuman(pend.messageId, true)
    }
    if (RULES.talk.test(t) && !chipIntent) return goHuman(pend?.kind === 'offer-handoff' ? pend.messageId : input.messageId, pend?.kind === 'offer-handoff')
    if (!chipIntent && RULES.unsafe.test(t)) { run.trace.push('rule: unsafe or prompt-injection request'); return say('T-UNSAFE', {}, { kind: 'denied', intent: 'X03', reason: 'UNSAFE_REQUEST', dialogue: ['C-19'], quickReplies: [TALK] }) }
    if (!chipIntent && RULES.sensitive.test(t)) { run.trace.push('rule: sensitive financial detail'); return say('T-SENSITIVE', {}, { kind: 'denied', intent: 'X03', reason: 'SENSITIVE_DETAILS', dialogue: ['C-16'], quickReplies: [TALK] }) }
    if (!chipIntent && RULES.reserve.test(t)) { run.trace.push('rule: reservation request'); return say('T-NO-RESERVE', {}, { kind: 'deferred', intent: 'X01', reason: 'NO_RESERVATIONS', dialogue: ['C-03'], quickReplies: [{ id: 'open-cart', label: 'Review in Cart' }, TALK], actions: [{ kind: 'open-cart', productId: p?.id }] }) }
    if (!chipIntent && RULES.commerce.test(t) && !/refund policy|return policy/i.test(t)) {
      run.trace.push('rule: commerce is deferred in this release')
      const id: TemplateId = /\b(mark|set)\b/i.test(t) ? 'T-PAYMENT-SHORT' : /\b(confirm|paid|already|sent|transferred)\b/i.test(t) ? 'T-PAYMENT-NO-CONFIRM' : 'T-PAYMENT-DEFERRED'
      return say(id, {}, { kind: 'deferred', intent: 'X01', reason: 'COMMERCE_DEFERRED', dialogue: id === 'T-PAYMENT-SHORT' ? ['C-19'] : id === 'T-PAYMENT-NO-CONFIRM' ? ['C-16'] : ['C-15'], quickReplies: id === 'T-PAYMENT-DEFERRED' ? [{ id: 'open-cart', label: 'Review Cart' }, TALK] : [TALK], actions: id === 'T-PAYMENT-DEFERRED' ? [{ kind: 'open-cart', productId: p?.id }] : [], pending: id === 'T-PAYMENT-SHORT' ? null : { kind: 'offer-handoff', messageId: input.messageId } })
    }
    if (!chipIntent && RULES.negotiate.test(t)) {
      run.trace.push('rule: negotiation request; the Bot never changes or negotiates a price')
      return say('T-NO-NEGOTIATE', {}, { kind: 'handoff-offer', intent: 'X02', reason: 'NEGOTIATION', dialogue: ['C-14'], quickReplies: [{ id: 'send-offer', label: 'Send my offer' }, TALK], pending: { kind: 'offer-handoff', messageId: input.messageId } })
    }
    if (!chipIntent && RULES.execute.test(t)) {
      return offer('T-NO-EXECUTE', {}, { intent: 'S04', reason: 'CANNOT_EXECUTE', dialogue: ['C-12'] })
    }
    if (!chipIntent && RULES.medical.test(t)) {
      run.trace.push('rule: medical or treatment wording')
      return say('T-MEDICAL', {}, { kind: 'answer', intent: 'P05', reason: 'MEDICAL_BOUNDARY', dialogue: ['C-21'], quickReplies: [{ id: 'show-instructions', label: 'Show the instructions' }, TALK] })
    }
    if (!chipIntent && RULES.priceChanged.test(t)) return say('T-PRICE-CHANGED', {}, { kind: 'answer', intent: 'A02', dialogue: ['C-15'], reason: 'PRICE_CAN_CHANGE', actions: [{ kind: 'open-cart', productId: p?.id }], quickReplies: [{ id: 'open-cart', label: 'Open Cart review' }, TALK] })
    if (!chipIntent && RULES.greeting.test(t)) {
      return say('T-GREETING', {}, { kind: 'answer', intent: 'S01', dialogue: ['C-01'], reason: 'GREETING', quickReplies: [{ id: 'product-details', label: 'Product details' }, { id: 'delivery-pickup', label: 'Delivery & pickup' }, { id: 'returns-exchanges', label: 'Returns & exchanges' }, TALK] })
    }

    if (readFailure) throw readFailure
    if (scene && scene.viewable && input.subject.scene && input.subject.scene.revision !== scene.revision) {
      run.trace.push(`Scene revision ${input.subject.scene.revision} is stale (live revision ${scene.revision})`)
      return say('T-SCENE-REVISED', {}, { kind: 'clarify', intent: 'C02', reason: 'SCENE_REVISION_STALE', dialogue: ['C-07', 'C-09'], quickReplies: [{ id: 'reopen-scene', label: 'Reopen the Scene' }, TALK] })
    }
    // pending clarifications that consume the next message
    if (pend?.kind === 'need-device' && !chipIntent) {
      run.trace.push('pending: device named for a compatibility check')
      return answerDevice(t, p)
    }
    if (pend?.kind === 'need-area' || (/^area:/.test(chip))) {
      const area = /^area:/.test(chip) ? chip.slice(5) : areaIn(t, seller) ?? input.subject.area
      if (area && seller.knownAreas.some(a => eq(a, area))) return answerArea(seller, area, p)
    }

    // ---- 3. intent ----
    // A question the PDF scripts for this very leaf is an attribute question, whatever else its words resemble (e.g. "How much compression").
    const scripted = !!p && !!p.categoryId && !!SCRIPTED_QUESTIONS[p.categoryId]?.[normQuestion(t)]
    let clauses = chipIntent ? [chipIntent] : scripted ? ['P04' as IntentId] : classify(t)
    run.trace.push(`clauses: ${clauses.map(c => c ?? '-').join(', ')}`)
    const distinct = [...new Set(clauses.filter((c): c is IntentId => !!c))]
    if (!chipIntent && distinct.length >= 2) {
      const chosen = distinct.slice(0, 4)
      run.trace.push(`multiple intents (${chosen.join(', ')}): one detail at a time`)
      return say('T-MULTI-INTENT', {}, { kind: 'clarify', intent: 'X02', reason: 'MULTIPLE_INTENTS', dialogue: ['C-13', 'C-20'], pending: { kind: 'pick-intent', intents: chosen, messageId: input.messageId },
        quickReplies: [...chosen.sort((a, b) => CHIP_ORDER.indexOf(a) - CHIP_ORDER.indexOf(b)).map(i => ({ id: `intent:${i}`, label: CHIP_LABEL[i] ?? INTENT_LABEL[i] })), TALK] })
    }
    const labelsOf = (x: ProductFacts) => [...new Set([...x.attributes.map(a => a.label), ...x.taxonomyLabels])]
    const gap = !!p && p.taxonomyLabels.length === 0 && p.attributes.length === 0 && p.listedDetails.length === 0
    const intent: IntentId = (distinct[0] ?? (ATTRIBUTE_WORDS.test(t) || (p && pickLabel(t, labelsOf(p), p.categoryId)) || gap ? 'P04' : null)) as IntentId
    if (!intent) {
      run.trace.push('no rule matched')
      const supp = supplementary(t, seller, run)
      if (supp) return say('T-SUPPLEMENTARY', { seller_answer: supp.answer }, { kind: 'answer', intent: 'X03', reason: 'SUPPLEMENTARY_ONLY', dialogue: [] })
      return offer('T-UNKNOWN-OFFER', {}, { intent: 'X03', reason: 'NO_MATCHING_INTENT' })
    }
    run.trace.push(`intent: ${intent} ${INTENT_LABEL[intent]}`)

    // ---- 4/5. facts per intent ----
    const needsProduct: IntentId[] = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'A01', 'A02']
    if (needsProduct.includes(intent) && !p) {
      if (scene) {
        const names = scene.products
        if (!names.length) return say('T-SELECT-PRODUCT', {}, { kind: 'clarify', intent: 'C02', reason: 'SCENE_HAS_NO_ELIGIBLE_PRODUCTS', dialogue: ['C-07'], quickReplies: [TALK] })
        run.trace.push('Scene with no selected Product: ask which, never guess')
        return say('T-SCENE-SELECT', {}, { kind: 'clarify', intent: 'C02', reason: 'PRODUCT_SELECTION_REQUIRED', dialogue: ['C-07'], actions: [{ kind: 'select-product' }],
          quickReplies: names.map(n => ({ id: `select-product:${n.id}`, label: `${n.name}${n.available === false ? ' (out of stock)' : ''}` })) })
      }
      return say('T-SELECT-PRODUCT', {}, { kind: 'clarify', intent: 'C02', reason: 'PRODUCT_SELECTION_REQUIRED', dialogue: ['C-01', 'C-02'], actions: [{ kind: 'select-product' }], quickReplies: [{ id: 'select-product', label: 'Select Product' }, TALK] })
    }
    const dlg = (...ids: string[]) => [...ids, ...(p ? dialogueForCategory(p.categoryId) : [])]
    const unknown = (reason: string, id: TemplateId = 'T-ATTR-UNKNOWN', ids: string[] = []) => { run.missing.push(reason); return offer(id, {}, { intent, reason, dialogue: ids.length ? ids : dlg() }) }

    switch (intent) {
      case 'S01': return say('T-GREETING', {}, { kind: 'answer', intent, dialogue: ['C-01'], reason: 'GREETING', quickReplies: GREETING_CHIPS })
      case 'S02': {
        if (!seller.bio && !seller.collectionPlace) return unknown('SELLER_PROFILE_MISSING')
        if (/hours?|open/i.test(t)) {
          if (!seller.collectionHours) return unknown('COLLECTION_HOURS_MISSING')
          run.slot('approved_collection_details', seller.collectionHours, 'Seller setup: collection hours')
          return say('T-COLLECTION', { approved_collection_details: [seller.collectionPlace, seller.collectionHours].filter(Boolean).join(', ') }, { kind: 'answer', intent, dialogue: ['C-11'], reason: 'SELLER_HOURS' })
        }
        run.slot('seller', seller.name, 'Seller profile')
        return say('T-SELLER-INFO', { seller: seller.name, handle: seller.handle, bio: seller.bio || [seller.collectionPlace && `Collection: ${seller.collectionPlace}.`].filter(Boolean).join(' ') || 'No description is listed.' }, { kind: 'answer', intent, dialogue: [], reason: 'SELLER_PROFILE' })
      }
      case 'S03': {
        if (/\b(collect|pick ?up|collection)\b/i.test(t)) {
          if (!seller.methods.includes('Buyer Collection') || !seller.collectionPlace) return unknown('COLLECTION_NOT_LISTED')
          run.slot('approved_collection_details', seller.collectionPlace, 'Seller setup: collection place')
          return say('T-COLLECTION', { approved_collection_details: [seller.collectionPlace, seller.collectionHours].filter(Boolean).join(', ') }, { kind: 'answer', intent, dialogue: ['C-11'], reason: 'COLLECTION_DETAILS' })
        }
        // A city named in free text is not trusted (C-11): the Buyer picks the area from the selector.
        const area = input.subject.area
        if (!seller.methods.length) return unknown('FULFILMENT_NOT_CONFIGURED')
        if (area) return answerArea(seller, area, p)
        if (!seller.methods.some(m => m !== 'Buyer Collection')) {
          return say('T-DELIVERY-METHODS', { methods: seller.methods.join(', ') }, { kind: 'answer', intent, dialogue: ['C-11'], reason: 'METHODS_LISTED' })
        }
        return say('T-ASK-AREA', {}, { kind: 'clarify', intent, reason: 'AREA_REQUIRED', dialogue: ['C-11'], actions: [{ kind: 'select-area' }], pending: { kind: 'need-area', messageId: input.messageId },
          quickReplies: seller.knownAreas.filter(a => !/nationwide/i.test(a)).map(a => ({ id: `area:${a}`, label: a })) })
      }
      case 'S04': {
        const r = seller.returns
        const need = ['eligibility', 'window', 'condition', 'process'] as const
        const absent = need.filter(k => !r?.[k]?.trim())
        if (!r || absent.length) {
          run.missing.push(...(r ? absent.map(a => `returns.${a}`) : ['returns policy']))
          // A restricted policy is answered only from its complete structured configuration: a Seller note never fills the gap.
          return offer('T-ATTR-UNKNOWN', {}, { intent, reason: 'RETURNS_POLICY_INCOMPLETE', dialogue: ['C-12'] })
        }
        need.forEach(k => run.slot(k, r[k]!, 'Seller policy: returns and exchanges'))
        return say('T-RETURNS', { exchange_eligibility: r.eligibility!, window: r.window!, condition: r.condition!, process: r.process! }, { kind: 'answer', intent, dialogue: ['C-12'], reason: 'RETURNS_POLICY', quickReplies: [TALK] })
      }
      case 'S05': {
        const summary = p?.knowledge.warranty?.trim() || seller.warranty?.summary.trim()
        if (!summary) {
          run.missing.push('warranty')
          return offer('T-ATTR-UNKNOWN', {}, { intent, reason: 'WARRANTY_NOT_CONFIGURED', dialogue: ['C-13'] })
        }
        run.slot('approved_warranty_summary', summary, p?.knowledge.warranty ? 'Product knowledge: warranty' : 'Seller policy: warranty')
        return say('T-WARRANTY', { approved_warranty_summary: summary }, { kind: 'answer', intent, dialogue: ['C-13'], reason: 'WARRANTY_POLICY', quickReplies: [TALK] })
      }
      case 'C01': {
        if (!scene) return say('T-SELECT-PRODUCT', {}, { kind: 'clarify', intent, reason: 'SCENE_REQUIRED', dialogue: ['C-08'], quickReplies: [TALK] })
        if (!scene.products.length) return unknown('SCENE_HAS_NO_ELIGIBLE_PRODUCTS', 'T-ATTR-UNKNOWN', ['C-08'])
        run.slot('eligible_tagged_product_names', scene.products.map(x => x.name).join(', '), 'Scene tags (current, eligible)')
        return say('T-SCENE-ITEMS', { eligible_tagged_product_names: scene.products.map(x => x.name).join(', ') }, { kind: 'answer', intent, dialogue: ['C-08'], reason: 'SCENE_PRODUCTS', actions: [{ kind: 'select-product' }],
          quickReplies: scene.products.map(x => ({ id: `select-product:${x.id}`, label: `${x.name}${x.available === false ? ' (out of stock)' : ''}` })) })
      }
      case 'C02': return say('T-SELECT-PRODUCT', {}, { kind: 'clarify', intent, reason: 'PRODUCT_SELECTION_REQUIRED', dialogue: ['C-02'], actions: [{ kind: 'select-product' }], quickReplies: [TALK] })
      case 'C03': {
        if (!scene) return say('T-SELECT-PRODUCT', {}, { kind: 'clarify', intent, reason: 'SCENE_REQUIRED', dialogue: ['C-08'], quickReplies: [TALK] })
        if (!scene.summary.trim()) return unknown('SCENE_CONTEXT_NOT_CONFIGURED', 'T-ATTR-UNKNOWN', ['C-08'])
        run.slot('scene_context_summary', scene.summary, 'Seller Scene context')
        return say('T-SCENE-CONTEXT', { scene_context_summary: scene.summary.replace(/[.\s]+$/, '') }, { kind: 'answer', intent, dialogue: ['C-08'], reason: 'SCENE_CONTEXT' })
      }
      case 'A01': return say('T-CART-NAV', {}, { kind: 'answer', intent, dialogue: ['C-15'], reason: 'NAVIGATE_ONLY', actions: [{ kind: 'open-product', productId: p!.id }, { kind: 'open-cart', productId: p!.id }],
        quickReplies: [{ id: 'open-product', label: 'Open Product' }, { id: 'open-cart', label: 'Open Cart review' }, TALK] })
      case 'A02': return say('T-CHECKOUT-PREVIEW', {}, { kind: 'answer', intent, dialogue: ['C-15'], reason: 'TOTALS_LIVE_IN_CART', actions: [{ kind: 'open-cart', productId: p!.id }], quickReplies: [{ id: 'open-cart', label: 'Open Cart review' }, TALK] })
      case 'X01': case 'X02': case 'X03': return offer('T-UNKNOWN-OFFER', {}, { intent, reason: 'NEEDS_A_PERSON' })
    }

    // ---- Product intents (p is set) ----
    const prod = p!
    const detected = detectVariant(t, prod)
    const chosen: Record<string, string> = { ...(pend && pend.kind !== 'offer-handoff' ? pend.variant ?? {} : {}), ...(input.subject.variant ?? {}), ...Object.fromEntries(detected.map(d => [d.option, d.value])) }
    const missingOptions = prod.options.filter(o => !chosen[o.name]).map(o => o.name)
    const exact = prod.options.length > 0 && missingOptions.length === 0
    const variantLabel = variantText(prod.options, chosen)
    const matching = prod.variants ? prod.variants.filter(v => Object.entries(chosen).every(([k, val]) => !v.values[k] || eq(v.values[k], val))) : null
    const qty = quantityIn(t) ?? input.subject.quantity ?? null
    const priceNote = (santim: number) => { run.slot('price', `ETB ${money(santim)}`, prod.regularPrice !== null && santim < prod.regularPrice ? 'Product record: current price (active discount applied)' : 'Product record: current price'); }
    run.slot('product', prod.name, 'Product record')
    if (Object.keys(chosen).length) run.slot('variant', variantLabel, 'Buyer selection (this Message)')

    switch (intent) {
      case 'P01': {
        if (prod.price === null && !(matching ?? []).some(v => v.price !== null)) return unknown('PRICE_NOT_SET', 'T-ATTR-UNKNOWN', ['C-02'])
        const prices = matching ? [...new Set(matching.map(v => v.price).filter((x): x is number => x !== null))] : prod.price !== null ? [prod.price] : []
        if (prices.length === 0) return unknown('VARIANT_PRICE_NOT_SET', 'T-ATTR-UNKNOWN', ['C-03'])
        if (prices.length > 1) {
          return say('T-PRICE-OPTIONS', { required_options: withArticle(missingOptions.length ? missingOptions : prod.options.map(o => o.name)) }, { kind: 'clarify', intent, reason: 'PRICE_DEPENDS_ON_OPTION', dialogue: ['C-03'], actions: [{ kind: 'select-option', names: missingOptions }],
            quickReplies: missingOptions.map(n => ({ id: `option:${n}`, label: n })) })
        }
        priceNote(prices[0])
        return say('T-PRICE', { product: prod.name, variant: exact ? `(${variantLabel}) ` : '', currency: 'ETB', amount: money(prices[0]) }, { kind: 'answer', intent, dialogue: ['C-02', 'C-03'], reason: 'PRICE_READ' })
      }
      case 'P02': {
        if (/available|in stock|other/i.test(t) || chip === 'view-options') return availableOptions(prod, intent)
        if (!prod.options.length) return unknown('NO_OPTIONS_LISTED', 'T-ATTR-UNKNOWN', ['C-03'])
        const list = prod.options.map(o => `${o.name}: ${o.values.join(', ')}`).join('; ')
        run.slot('options', list, 'Product record: options (not proof of stock)')
        return say('T-OPTIONS-LIST', { product: prod.name, options: list }, { kind: 'answer', intent, dialogue: ['C-03'], reason: 'OPTIONS_LISTED' })
      }
      case 'P03': {
        if (/\bsize\s+(\d+|[a-z]{1,3})\b/i.test(t) && !prod.options.some(o => /size/i.test(o.name))) return unknown('SIZE_OPTION_NOT_LISTED', 'T-ATTR-UNKNOWN', dlg('C-04'))
        if (chip === 'view-options' || /available options|other options|alternatives/i.test(t)) return availableOptions(prod, intent)
        if (prod.options.length && !exact) {
          if (detected.length) {
            run.trace.push('partial option named: ask for the rest')
            return say('T-SCENE-OPTION', { value: detected[0].said, product: prod.name, remaining_options: withArticle(missingOptions) }, { kind: 'clarify', intent, reason: 'OPTION_INCOMPLETE', dialogue: ['C-07', 'C-03'], actions: [{ kind: 'select-option', names: missingOptions }], quickReplies: missingOptions.map(n => ({ id: `option:${n}`, label: n })) })
          }
          return say('T-STOCK-OPTION', { required_options: withArticle(missingOptions) }, { kind: 'clarify', intent, reason: 'EXACT_OPTION_REQUIRED', dialogue: ['C-03'], actions: [{ kind: 'select-option', names: missingOptions }], quickReplies: missingOptions.map(n => ({ id: `option:${n}`, label: n })) })
        }
        let stock: number, label: string, price: number | null
        if (prod.options.length) {
          if (!prod.variants) { run.trace.push('record keeps no per-Variant stock'); return unknown('VARIANT_STOCK_NOT_RECORDED', 'T-UNAVAILABLE-READ', ['C-18']) }
          const v = matching![0]
          if (!v) return unknown('COMBINATION_NOT_LISTED', 'T-ATTR-UNKNOWN', ['C-04'])
          stock = v.stock; label = variantLabel; price = v.price
          run.slot('stock', String(stock), 'Inventory: exact Variant')
        } else { stock = prod.stock; label = prod.name; price = prod.price; run.slot('stock', String(stock), 'Inventory: Product') }
        if (qty !== null) {
          run.slot('quantity', String(qty), 'Buyer request (this Message)')
          return stock >= qty ? say('T-QTY-OK', { quantity: String(qty) }, { kind: 'answer', intent, dialogue: ['C-04'], reason: 'QUANTITY_AVAILABLE' }) : say('T-QTY-NO', {}, { kind: 'answer', intent, dialogue: ['C-04'], reason: 'QUANTITY_NOT_AVAILABLE', quickReplies: [{ id: 'view-options', label: 'View available options' }, TALK] })
        }
        if (stock <= 0) return say('T-STOCK-OUT', { variant: label }, { kind: 'answer', intent, dialogue: ['C-04'], reason: 'OUT_OF_STOCK', quickReplies: [{ id: 'view-options', label: 'View available options' }, TALK] })
        if (price !== null) { priceNote(price); return say('T-STOCK-IN-PRICE', { variant: label, currency: 'ETB', amount: money(price) }, { kind: 'answer', intent, dialogue: ['C-03'], reason: 'IN_STOCK' }) }
        return say('T-STOCK-IN', { variant: label }, { kind: 'answer', intent, dialogue: ['C-03'], reason: 'IN_STOCK' })
      }
      case 'P05': {
        const care = /\b(care|wash\w*|clean|iron\w*|dry clean|laundry)\b/i.test(t)
        const labelled = prod.attributes.find(a => /^(care|usage|how to use|instructions?)/i.test(a.label) && a.value.trim())
        if (/\binstructions?\b|how (do|to|should|can) i (use|apply)|directions|show/i.test(t)) {
          const ins = prod.knowledge.instructions?.trim() || prod.knowledge.usage?.trim() || labelled?.value
          if (ins) { noteClash(/\b(use|usage|instruction|apply|direction|how)\b/i, ins); run.slot('approved_label_instructions', ins, 'Product knowledge: instructions'); return say('T-INSTRUCTIONS', { approved_label_instructions: ins.replace(/[.\s]+$/, '') }, { kind: 'answer', intent, dialogue: ['C-21'], reason: 'INSTRUCTIONS' }) }
        }
        if (care) {
          const value = labelled?.value || prod.knowledge.care?.trim()
          if (value) {
            noteClash(/\b(care|wash|clean|iron|dry|launder)/i, value)
            run.slot('care', value, labelled ? `Taxonomy attribute: ${labelled.label}` : 'Product knowledge: care')
            return say('T-ATTR', { attribute_label: labelled?.label ?? 'Care', attribute_value: value, product_or_variant: 'this item' }, { kind: 'answer', intent, dialogue: dlg('C-06'), reason: 'CARE_LISTED' })
          }
          const careLine = prod.listedDetails.find(d => /\b(wash|care|clean|iron|dry|tumble)\b/i.test(d))
          if (careLine) { noteClash(/\b(care|wash|clean|iron|dry|launder)/i, careLine); run.slot('care', careLine, 'Product record: Seller detail line (unlabelled)'); return say('T-DETAILS-LISTED', { product: prod.name, details: careLine }, { kind: 'answer', intent, dialogue: dlg('C-06'), reason: 'UNLABELLED_CARE_LINE' }) }
          const supp = supplementary(t, seller, run, prod)
          if (supp) return say('T-SUPPLEMENTARY', { seller_answer: supp.answer }, { kind: 'answer', intent, dialogue: dlg('C-06'), reason: 'SUPPLEMENTARY_CARE' })
          run.missing.push('care')
          return offer(prod.taxonomyLabels.length ? 'T-CARE-MISSING' : 'T-ATTR-UNKNOWN', {}, { intent, reason: 'CARE_NOT_LISTED', dialogue: dlg('C-06') })
        }
        const usage = prod.knowledge.usage?.trim() || labelled?.value
        if (usage) { noteClash(/\b(use|usage|instruction|apply|direction)/i, usage); run.slot('usage', usage, 'Product knowledge: usage'); return say('T-INSTRUCTIONS', { approved_label_instructions: usage.replace(/[.\s]+$/, '') }, { kind: 'answer', intent, dialogue: dlg('C-21'), reason: 'USAGE_LISTED' }) }
        return unknown('USAGE_NOT_LISTED', 'T-ATTR-UNKNOWN', dlg('C-21'))
      }
      case 'P06': {
        const attr = prod.attributes.find(a => /compatib/i.test(a.label) && a.value.trim())
        if (attr) return attrAnswer(attr.label, attr.value)
        const list = prod.knowledge.compatibility ?? []
        if (!list.length) {
          if (!prod.taxonomyLabels.length) return unknown('CATEGORY_HAS_NO_DEFINED_FIELDS', 'T-ATTR-UNKNOWN', dlg('C-20'))
          return offer('T-COMPAT-UNCONFIRMED', {}, { intent, reason: 'NO_COMPATIBILITY_FACTS', dialogue: dlg('C-20') })
        }
        const m = matchDevice(t, list)
        if (m.kind === 'match') return say('T-COMPAT-MATCH', { device: m.entry }, { kind: 'answer', intent, dialogue: dlg('C-20'), reason: 'COMPATIBILITY_LISTED' })
        if (m.kind === 'ambiguous') return ambiguousDevice(m.entries)
        return say('T-ASK-DEVICE', {}, { kind: 'clarify', intent, reason: 'DEVICE_REQUIRED', dialogue: dlg('C-20'), pending: { kind: 'need-device', messageId: input.messageId }, quickReplies: [TALK] })
      }
      case 'P07': {
        const guide = prod.knowledge.sizeGuide?.trim() || seller.sizeGuide.trim()
        if (!guide) return unknown('SIZE_GUIDE_NOT_CONFIGURED', 'T-ATTR-UNKNOWN', dlg('C-05'))
        if (chip === 'view-size-guide') { run.slot('size_guide', guide, 'Seller size guide'); return say('T-SIZE-GUIDE-CONTENT', { size_guide: guide }, { kind: 'answer', intent, dialogue: dlg('C-05'), reason: 'SIZE_GUIDE_SHOWN' }) }
        if (/definitely|guarantee|for sure|certain(ly)?|will .* fit|sure/i.test(t)) return offer('T-SIZE-NO-GUARANTEE', {}, { intent, reason: 'FIT_NOT_GUARANTEED', dialogue: dlg('C-05') })
        return say('T-SIZE-GUIDE', {}, { kind: 'answer', intent, dialogue: dlg('C-05'), reason: 'SIZE_GUIDE_AVAILABLE', actions: [{ kind: 'show-size-guide' }, { kind: 'select-option', names: prod.options.map(o => o.name) }],
          quickReplies: [{ id: 'view-size-guide', label: 'View size guide' }, { id: 'select-size', label: 'Select size' }, TALK] })
      }
      case 'P08': {
        const attr = prod.attributes.find(a => /authentic|provenance|evidence|origin/i.test(a.label) && a.value.trim())
        if (attr) return attrAnswer(attr.label, attr.value)
        const claim = prod.knowledge.authenticity?.trim()
        if (claim) { run.slot('authenticity_claim', claim, 'Seller statement (not platform verification)'); return say('T-AUTHENTICITY', { authenticity_claim: claim.replace(/[.\s]+$/, '') }, { kind: 'answer', intent, dialogue: dlg('C-13'), reason: 'SELLER_CLAIM_ATTRIBUTED' }) }
        run.missing.push('authenticity evidence')
        return offer(prod.taxonomyLabels.length ? 'T-AUTHENTICITY-MISSING' : 'T-ATTR-UNKNOWN', {}, { intent, reason: 'NO_AUTHENTICITY_EVIDENCE', dialogue: dlg('C-13') })
      }
      case 'P09': {
        const attr = prod.attributes.find(a => /condition/i.test(a.label) && a.value.trim())
        if (attr) return attrAnswer(attr.label, attr.value)
        if (prod.knowledge.condition?.trim()) return attrAnswer('Condition', prod.knowledge.condition.trim())
        return unknown('CONDITION_NOT_LISTED', 'T-ATTR-UNKNOWN', dlg())
      }
      case 'P04': {
        if (chip === 'product-details') {
          if (prod.description.trim()) { run.slot('description', prod.description, 'Product record: description'); return say('T-DESCRIPTION', { product: prod.name, description: prod.description.trim() }, { kind: 'answer', intent, dialogue: ['C-01'], reason: 'PRODUCT_DESCRIPTION' }) }
          if (prod.listedDetails.length) return say('T-DETAILS-LISTED', { product: prod.name, details: prod.listedDetails.join('; ') }, { kind: 'answer', intent, dialogue: ['C-01'], reason: 'UNLABELLED_DETAILS' })
          return unknown('NO_DESCRIPTION', 'T-ATTR-UNKNOWN', ['C-01'])
        }
        return answerAttribute(t, prod)
      }
    }
    return offer('T-UNKNOWN-OFFER', {}, { intent, reason: 'UNHANDLED' })

    // ---- helpers (closures over this Message) ----
    function attrAnswer(label: string, value: string) {
      run.slot(label, value, `Taxonomy attribute: ${label}`)
      const useName = !!input.subject.scene || input.contextShift
      const id: TemplateId = input.contextShift && !input.subject.scene ? 'T-ATTR-FOR' : 'T-ATTR'
      return say(id, { attribute_label: label, attribute_value: value, product_or_variant: useName ? prod.name : 'this item', product: prod.name }, { kind: 'answer', intent: intent!, dialogue: dlg('C-10'), reason: 'ATTRIBUTE_LISTED' })
    }
    function answerAttribute(question: string, pr: ProductFacts) {
      const candidates = [...new Set([...pr.attributes.map(a => a.label), ...pr.taxonomyLabels])]
      const label = pickLabel(question, candidates, pr.categoryId)
      run.trace.push(`attribute label: ${label ?? 'none matched'}`)
      if (label) {
        const own = pr.attributes.find(a => eq(a.label, label))
        const option = pr.options.find(o => eq(o.name, label))
        if (option) {
          const value = chosen[option.name]
          if (value) return attrAnswer(label, value)
          return say('T-STOCK-OPTION', { required_options: withArticle([option.name]) }, { kind: 'clarify', intent: 'P04', reason: 'OPTION_SELECTION_REQUIRED', dialogue: dlg(), actions: [{ kind: 'select-option', names: [option.name] }], quickReplies: [{ id: `option:${option.name}`, label: option.name }] })
        }
        if (own?.value.trim()) {
          const clash = supplementary(label, sel, run, pr, true)
          if (clash && !agrees(own.value, clash.answer)) {
            run.conflicts.push({ topic: clash.topic, canonical: own.value, supplementary: clash.answer })
            run.trace.push('conflict: Seller note disagrees with the Catalogue; the Catalogue value is used')
          }
          return attrAnswer(label, own.value.trim())
        }
        const supp = supplementary(`${label} ${question}`, sel, run, pr)
        if (supp) return say('T-SUPPLEMENTARY', { seller_answer: supp.answer }, { kind: 'answer', intent: 'P04', reason: 'SUPPLEMENTARY_ONLY', dialogue: dlg() })
        run.missing.push(label)
        return offer('T-ATTR-UNKNOWN', {}, { intent: 'P04', reason: 'ATTRIBUTE_NOT_LISTED', dialogue: dlg(), ...VIEW_PRODUCT(pr.id) })
      }
      if (pr.listedDetails.length && !pr.attributes.length && ATTRIBUTE_WORDS.test(question)) {
        run.slot('details', pr.listedDetails.join('; '), 'Product record: Seller detail lines (unlabelled)')
        return say('T-DETAILS-LISTED', { product: pr.name, details: pr.listedDetails.join('; ') }, { kind: 'answer', intent: 'P04', reason: 'UNLABELLED_DETAILS', dialogue: dlg() })
      }
      const supp = supplementary(question, sel, run, pr)
      if (supp) return say('T-SUPPLEMENTARY', { seller_answer: supp.answer }, { kind: 'answer', intent: 'P04', reason: 'SUPPLEMENTARY_ONLY', dialogue: dlg() })
      run.missing.push('attribute')
      return offer('T-ATTR-UNKNOWN', {}, { intent: 'P04', reason: pr.taxonomyLabels.length ? 'ATTRIBUTE_NOT_LISTED' : 'CATEGORY_HAS_NO_DEFINED_FIELDS', dialogue: dlg(), ...VIEW_PRODUCT(pr.id) })
    }
    function availableOptions(pr: ProductFacts, why: IntentId) {
      if (!pr.options.length || !pr.variants) return offer('T-UNAVAILABLE-READ', {}, { intent: why, reason: 'VARIANT_STOCK_NOT_RECORDED', dialogue: ['C-18'] })
      const labels = pr.variants.filter(v => v.stock > 0).map(v => variantText(pr.options, v.values))
      if (!labels.length) return say('T-NO-AVAILABLE-OPTIONS', {}, { kind: 'answer', intent: why, reason: 'NO_OPTION_IN_STOCK', dialogue: ['C-04'], quickReplies: [TALK] })
      run.slot('available_variant_labels', labels.join('; '), 'Inventory: Variants with stock')
      return say('T-AVAILABLE-OPTIONS', { available_variant_labels: labels.join('; ') }, { kind: 'answer', intent: why, reason: 'AVAILABLE_OPTIONS', dialogue: ['C-04'] })
    }
    function answerArea(s: SellerFacts, area: string, pr: ProductFacts | null) {
      const delivers = s.methods.some(m => m !== 'Buyer Collection')
      const covered = s.coverage.some(c => eq(c, area) || /nationwide/i.test(c))
      const methods = (pr ? s.methods.filter(m => pr.fulfilment.includes(m)) : s.methods).filter(m => m !== 'Buyer Collection')
      run.slot('area', area, 'Buyer selection (this Message)')
      if (delivers && covered && methods.length) return say('T-DELIVERY-OK', { area, methods: methods.join(', ') }, { kind: 'answer', intent: 'S03', reason: 'AREA_COVERED', dialogue: ['C-11'] })
      return say('T-DELIVERY-NO-AREA', {}, { kind: 'answer', intent: 'S03', reason: 'AREA_NOT_LISTED', dialogue: ['C-11'], quickReplies: [{ id: 'delivery-pickup', label: 'Collection options' }, TALK] })
    }
    function ambiguousDevice(entries: string[]) {
      run.trace.push(`device text is not an exact listed model (${entries.length} could match): ask for the exact model`)
      return say('T-COMPAT-AMBIGUOUS', { candidates: entries.join(', ') }, { kind: 'clarify', intent: 'P06', reason: 'DEVICE_AMBIGUOUS', dialogue: ['C-20'], pending: { kind: 'need-device', messageId: input.messageId }, quickReplies: [{ id: 'talk-to-seller', label: 'Talk to seller' }] })
    }
    /** Reports a Seller note that disagrees with a canonical care or usage fact; the canonical fact is always the one used. */
    function noteClash(topic: RegExp, canonical: string) {
      const note = noteOnTopic(sel, topic)
      if (note && !agrees(canonical, note.answer)) { run.conflicts.push({ topic: note.topic, canonical, supplementary: note.answer }); run.trace.push('conflict: a Seller note disagrees with the canonical fact; the canonical fact is used') }
    }
    function answerDevice(device: string, pr: ProductFacts | null) {
      const list = pr?.knowledge.compatibility ?? []
      const m = matchDevice(device, list)
      if (m.kind === 'match') return say('T-COMPAT-MATCH', { device: m.entry }, { kind: 'answer', intent: 'P06', reason: 'COMPATIBILITY_LISTED', dialogue: ['C-20'] })
      if (m.kind === 'ambiguous') return ambiguousDevice(m.entries)
      return offer('T-COMPAT-UNCONFIRMED', {}, { intent: 'P06', reason: 'DEVICE_NOT_ON_APPROVED_LIST', dialogue: ['C-20'] })
    }
  } catch (error) {
    // A failed read is never reported as "zero stock" or "unknown"; the Buyer is offered the Seller.
    run.trace.push(`read failed: ${error instanceof Error ? error.message : String(error)}`)
    return base({ kind: 'handoff-offer', templateId: 'T-UNAVAILABLE-READ', text: render('T-UNAVAILABLE-READ', {}), intent: null, reason: 'READ_FAILED', dialogue: ['C-18'],
      pending: { kind: 'offer-handoff', messageId: input.messageId }, quickReplies: [{ id: 'talk-to-seller', label: 'Talk to seller' }] })
  }
}

// ---- classification ----
const CHIP_INTENT: Record<string, IntentId> = {
  'product-details': 'P04', 'delivery-pickup': 'S03', 'returns-exchanges': 'S04', 'view-options': 'P03', 'view-size-guide': 'P07', 'show-instructions': 'P05',
  'intent:P01': 'P01', 'intent:P02': 'P02', 'intent:P03': 'P03', 'intent:P04': 'P04', 'intent:P05': 'P05', 'intent:P06': 'P06', 'intent:P07': 'P07', 'intent:P08': 'P08', 'intent:P09': 'P09',
  'intent:S02': 'S02', 'intent:S03': 'S03', 'intent:S04': 'S04', 'intent:S05': 'S05', 'intent:A01': 'A01', 'intent:A02': 'A02',
}
const VIEW_PRODUCT = (id?: string): Pick<BotResult, 'quickReplies' | 'actions'> => ({ quickReplies: [{ id: 'talk-to-seller', label: 'Talk to seller' }, { id: 'open-product', label: 'View Product' }], actions: id ? [{ kind: 'open-product', productId: id }] : [] })
const CHIP_ORDER: IntentId[] = ['P01', 'P02', 'P03', 'S03', 'S04', 'S05', 'P08', 'P06', 'P07', 'P05', 'P09', 'P04', 'S02', 'A01', 'A02']
const CHIP_LABEL: Partial<Record<IntentId, string>> = { P01: 'Price', P02: 'Options', P03: 'Availability', P04: 'Product details', P05: 'Care & use', P06: 'Compatibility', P07: 'Size guide', P08: 'Authenticity', P09: 'Condition', S03: 'Delivery & pickup', S04: 'Returns & exchanges', S05: 'Warranty', S02: 'Seller info', A01: 'Add to Cart', A02: 'Total' }
const GREETING_CHIPS: Chip[] = [{ id: 'product-details', label: 'Product details' }, { id: 'delivery-pickup', label: 'Delivery & pickup' }, { id: 'returns-exchanges', label: 'Returns & exchanges' }, { id: 'talk-to-seller', label: 'Talk to seller' }]

/** One intent per clause (split at commas, "and", question marks), so "How much, is it original, and will it fit my laptop?" is three. */
function classify(text: string): (IntentId | null)[] {
  const clauses = text.split(/[,;?]|\band\b|\balso\b|\bplus\b/i).map(c => c.trim()).filter(Boolean)
  const whole = clauses.length ? clauses : [text]
  const out = whole.map(c => {
    for (const [id, re] of CLAUSE_RULES) if (re.test(c)) return id
    return null
  })
  const found = out.filter(Boolean)
  return found.length ? out : [ATTRIBUTE_WORDS.test(text) ? 'P04' : null]
}

function areaIn(text: string, seller: SellerFacts): string | null {
  return seller.knownAreas.find(a => !/nationwide/i.test(a) && new RegExp(`\\b${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) ?? null
}

function quantityIn(text: string): number | null {
  const m = /\b(?:get|buy|take|need|want|order|have)\s+(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten)\b|\b(\d{1,3}|two|three|four|five|six|seven|eight|nine|ten)\s*(?:pieces?|pcs|items?|units?|of (?:them|these|it))\b/i.exec(text)
  const raw = (m?.[1] ?? m?.[2])?.toLowerCase()
  if (!raw) return null
  const n = /^\d+$/.test(raw) ? Number(raw) : QTY_WORDS[raw]
  return n >= 1 && n <= 999 ? n : null
}

/** Option values the Buyer named in THIS Message ("size M in black", "Medium"). A single-letter size needs a capital or the word "size". */
function detectVariant(text: string, product: ProductFacts): Detected[] {
  const found: Detected[] = []
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const bare = (alias: string) => alias.length === 1
    ? new RegExp(`\\bsize\\s+${esc(alias)}\\b`, 'i').exec(text) ?? new RegExp(`(?<![A-Za-z'])${esc(alias.toUpperCase())}(?![A-Za-z'])`).exec(text)
    : new RegExp(`(?<![A-Za-z'])${esc(alias)}(?![A-Za-z'])`, 'i').exec(text)
  for (const option of product.options) {
    // A value that two options share ("Plain" as a Tier and as a Grade) is never guessed: it counts only beside its option's own name,
    // "Tier Plain" first, "Plain tier" only when no "name value" pairing was written.
    const named = (value: string, valueFirst: boolean) => new RegExp(valueFirst
      ? `(?<![A-Za-z'])${esc(value)}\\s+${esc(option.name)}(?![A-Za-z'])`
      : `(?<![A-Za-z'])${esc(option.name)}\\s*[:=-]?\\s*${esc(value)}(?![A-Za-z'])`, 'i').exec(text)
    const shared = (value: string) => product.options.some(o => o !== option && o.values.some(v => eq(v, value)))
    for (const valueFirst of [false, true]) {
      if (found.some(f => f.option === option.name)) break
      for (const value of option.values) {
        if (found.some(f => f.option === option.name)) break
        for (const alias of [value, ...(SIZE_ALIASES[value.toUpperCase()] ?? [])]) {
          const m = shared(value) ? named(value, valueFirst) : valueFirst ? null : bare(alias)
          if (m) { found.push({ option: option.name, value, said: alias.length === 1 || shared(value) ? value : m[0].replace(/^./, c => c.toUpperCase()) }); break }
        }
      }
    }
  }
  return found
}

/** Words that may follow a model name without extending it ("Acme Air 13 laptop"); any other following word makes it a different model. */
const DEVICE_BOUNDARY = new Set('the a an is are do does will would can could it this that my your laptop computer notebook phone mobile tablet device model work works fit fits with for and or ok thanks please then bag case cover charger fit?'.split(' '))
const deviceTokens = (text: string) => normQuestion(text).replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').split(' ').filter(Boolean)
function hasSpan(tokens: string[], seq: string[]): boolean {
  for (let i = 0; i + seq.length <= tokens.length; i++) {
    if (seq.every((w, j) => tokens[i + j] === w)) { const next = tokens[i + seq.length]; if (next === undefined || DEVICE_BOUNDARY.has(next)) return true }
  }
  return false
}
/**
 * Exact normalised model matching (BOT-FIX-02). An entry may list aliases with "|". The whole model name must appear and must not be
 * continued by another model word, so "Acme Air 13 Pro" never matches "Acme Air 13". A name that fits several entries only partly
 * ("Acme Air") is ambiguous and needs the exact model; anything else is not confirmed.
 */
function matchDevice(text: string, list: string[]): { kind: 'match'; entry: string } | { kind: 'ambiguous'; entries: string[] } | { kind: 'none' } {
  const tokens = deviceTokens(text)
  const entries = list.map(raw => ({ label: raw.split('|')[0].trim(), aliases: raw.split('|').map(deviceTokens).filter(a => a.length) }))
  const exact = entries.filter(e => e.aliases.some(a => hasSpan(tokens, a)))
  if (exact.length === 1) return { kind: 'match', entry: exact[0].label }
  if (exact.length > 1) return { kind: 'ambiguous', entries: exact.map(e => e.label) }
  const partial = entries.filter(e => e.aliases.some(a => { for (let k = a.length - 1; k >= 2; k--) if (hasSpan(tokens, a.slice(0, k))) return true; return false }))
  return partial.length ? { kind: 'ambiguous', entries: partial.map(e => e.label) } : { kind: 'none' }
}

/** A note agrees with a canonical value when every meaningful word of the value appears in the note. */
const agrees = (canonical: string, note: string) => { const n = new Set(words(note)); return words(canonical).every(w => n.has(w)) }
/** The Seller's supplementary note whose TOPIC concerns care or usage (never a restricted policy). */
const RESTRICTED_POLICY = /\b(return|returns|refund|refunds|exchange|exchanges|warranty|warranties|guarantee|guarantees|after[- ]sales?|service cent(re|er)|repair|repairs)\b/i
const noteOnTopic = (seller: SellerFacts, topic: RegExp) => seller.supplementary.find(e => topic.test(e.topic) && !RESTRICTED_POLICY.test(e.topic))

/** The attribute label a Buyer question is about: a scripted phrase for this leaf first, then label-word and synonym overlap. */
function pickLabel(question: string, candidates: string[], categoryId: string | null): string | null {
  const scripted = categoryId ? SCRIPTED_QUESTIONS[categoryId]?.[normQuestion(question)] : undefined
  if (scripted) { const hit = candidates.find(c => eq(c, scripted)); if (hit) return hit }
  const q = new Set(words(question))
  let best: { label: string; score: number } | null = null
  for (const label of candidates) {
    const tokens = words(label)
    if (!tokens.length) continue
    let score = 0
    for (const tk of tokens) {
      if (q.has(tk)) score += 3
      else if ((SYNONYMS[tk] ?? []).some(s => q.has(stem(s)))) score += 2
    }
    score = score / Math.sqrt(tokens.length)
    if (score >= 2 && (!best || score > best.score)) best = { label, score }
  }
  return best?.label ?? null
}

/** Supplementary Seller Q&A: topic words must cover at least half of the topic. Used only after canonical facts and configured policy. */
function supplementary(text: string, seller: SellerFacts, run: Run, product?: ProductFacts, forConflict = false): { topic: string; answer: string } | null {
  // Returns, refunds, exchanges, warranty and service are restricted policies: only their complete structured configuration may answer them.
  if (RESTRICTED_POLICY.test(text)) return null
  const q = new Set(words(text))
  let best: { entry: SellerFacts['supplementary'][number]; score: number } | null = null
  for (const entry of seller.supplementary) {
    if (RESTRICTED_POLICY.test(entry.topic)) continue
    const tw = words(entry.topic)
    if (!tw.length) continue
    const score = tw.filter(w => q.has(w)).length / tw.length
    if (score >= 0.5 && (!best || score > best.score)) best = { entry, score }
  }
  if (!best) return null
  if (!forConflict) { run.slot('seller_answer', best.entry.answer, `Seller-approved answer: “${best.entry.topic}” (supplementary)`); void product }
  return { topic: best.entry.topic, answer: best.entry.answer }
}

/** Identifies the subject a clarification or quick reply belongs to: Seller, Scene and its revision, Product. */
export const subjectKey = (s: MessageSubject) => `${s.sellerId}|${s.scene ? `${s.scene.id}@${s.scene.revision}` : ''}|${s.productId ?? ''}`

export type { Pending }
