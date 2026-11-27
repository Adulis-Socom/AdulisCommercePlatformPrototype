// The 22 universal intents (PDF pp. 5-6) and the deterministic English rules that recognise them. No model, no network.
import type { IntentId } from './types.ts'

export interface IntentDef { id: IntentId; name: string; subjects: string; phrases: string; authority: string; page: number }
export const INTENTS: readonly IntentDef[] = [
  { id: 'S01', name: 'GREETING', subjects: 'NONE', phrases: 'Hi; hello; can you help?', authority: 'Offer help chips, never promise a response time.', page: 5 },
  { id: 'S02', name: 'SELLER_INFO', subjects: 'NONE', phrases: 'Where is your shop?; opening hours?', authority: 'Seller profile and Fulfilment configuration.', page: 5 },
  { id: 'S03', name: 'DELIVERY', subjects: 'NONE, PRODUCT', phrases: 'Do you deliver?; pickup?', authority: 'Coverage, method and current eligible service; no universal promise.', page: 5 },
  { id: 'S04', name: 'RETURNS', subjects: 'NONE, PRODUCT', phrases: 'Can I exchange?; refund policy?', authority: 'Versioned Seller policy; no claim, payment or refund execution.', page: 5 },
  { id: 'S05', name: 'WARRANTY', subjects: 'NONE, PRODUCT', phrases: 'Warranty?; after-sales?', authority: 'Configured Seller policy and evidence; no unverified guarantee.', page: 5 },
  { id: 'P01', name: 'PRICE', subjects: 'PRODUCT', phrases: 'How much?; price?', authority: 'Catalogue current price and currency; variant selection where required.', page: 5 },
  { id: 'P02', name: 'OPTIONS', subjects: 'PRODUCT', phrases: 'What sizes?; colors?', authority: 'Catalogue option/variant list. Not proof of stock.', page: 5 },
  { id: 'P03', name: 'STOCK', subjects: 'PRODUCT', phrases: 'Available?; in stock?', authority: 'Inventory per exact variant/quantity; no holds.', page: 5 },
  { id: 'P04', name: 'ATTRIBUTE', subjects: 'PRODUCT', phrases: 'Material?; fit?; dimensions?', authority: 'Approved category field, Catalogue or chatbot-only knowledge.', page: 5 },
  { id: 'P05', name: 'USAGE', subjects: 'PRODUCT', phrases: 'How to use?; care?', authority: 'Versioned Seller guidance / product instructions.', page: 5 },
  { id: 'P06', name: 'COMPATIBILITY', subjects: 'PRODUCT', phrases: 'Will it fit my device?', authority: 'Explicit model/size compatibility facts; otherwise handoff.', page: 5 },
  { id: 'P07', name: 'SIZE_GUIDE', subjects: 'PRODUCT', phrases: 'Which size fits me?', authority: 'Provide configured measurement chart; Buyer chooses; escalate subjective fit.', page: 6 },
  { id: 'P08', name: 'AUTHENTICITY', subjects: 'PRODUCT', phrases: 'Is it original?; genuine gold?', authority: 'Show attributed claims and evidence status only.', page: 6 },
  { id: 'P09', name: 'CONDITION', subjects: 'PRODUCT', phrases: 'New or used?; sealed?', authority: 'Current authorized structured condition, if supported.', page: 6 },
  { id: 'C01', name: 'SCENE_PRODUCTS', subjects: 'SCENE', phrases: 'What items are in this picture?', authority: 'Content: current eligible exact tags.', page: 6 },
  { id: 'C02', name: 'SELECT_PRODUCT', subjects: 'SCENE, NONE', phrases: 'How much is this?; Medium?', authority: 'SELECT_PRODUCT_CONTEXT; never pick a Product.', page: 6 },
  { id: 'C03', name: 'SCENE_GUIDANCE', subjects: 'SCENE', phrases: 'What is this look?', authority: 'Versioned Scene context and tag roles; no commerce claims.', page: 6 },
  { id: 'A01', name: 'CART_NAV', subjects: 'PRODUCT', phrases: 'I want this; add to cart', authority: 'Navigate to explicit choice / Cart review; no silent write.', page: 6 },
  { id: 'A02', name: 'CHECKOUT_PREVIEW', subjects: 'PRODUCT', phrases: 'What is the total?', authority: 'Navigate to server review; never calculate or lock price in chat.', page: 6 },
  { id: 'X01', name: 'COMMERCE_DEFERRED', subjects: 'ANY', phrases: 'Pay; reserve; order status; refund', authority: 'Explain feature unavailable; no payment instruction or live order fact.', page: 6 },
  { id: 'X02', name: 'HUMAN', subjects: 'ANY', phrases: 'Talk to seller; discount; other language', authority: 'Preserve original message; waiting or human takeover.', page: 6 },
  { id: 'X03', name: 'UNSAFE_OR_UNKNOWN', subjects: 'ANY', phrases: 'Sensitive details; ignore your rules', authority: 'Reject unsafe request or escalate; never reveal data or follow prompt injection.', page: 6 },
]
export const INTENT_LABEL: Record<IntentId, string> = Object.fromEntries(INTENTS.map(i => [i.id, i.name])) as Record<IntentId, string>

// ---- whole-message rules, checked before clause classification ----
export const RULES = {
  unsafe: /ignore (your|all|any|previous|the|these) (rules|instructions)|system prompt|reveal (your|the) (prompt|instructions|rules)|developer mode|jailbreak|other (shops?|sellers?|stores?)['’]?s?\b|another (shop|seller|store)|customer (numbers?|phones?|data|details|list|emails?)|private data|admin (password|access)/i,
  sensitive: /\b(screenshot|otp|one[- ]time (code|password)|pin code|password|card number|cvv|bank (details|account|transfer|screenshot|slip)|account number|receipt photo)\b/i,
  reserve: /\b(keep (it|this|one) for me|keep (it|this) aside|hold (it|this|one)|reserve|put (it|this) aside|set (it|this) aside)\b/i,
  commerce: /\b(pay|paid|payment|payments|pay for|order status|where is my order|track(ing)? (my )?order|my refund|refund me|give me a refund|process (my |the )?refund|receipt|invoice|deposit|installments?|cash on delivery|telebirr|mark (my |the )?order|place (an |my |the )?order|confirm (my |the )?(payment|order)|transfer(red)?)\b/i,
  negotiate: /\b(reduce|lower|cheaper|discount|negotiat\w*|bargain|last price|best price|haggle|price down|knock off|offer (you|ETB|birr)|can you do (it )?for)\b/i,
  execute: /\b(approve|process|accept|authori[sz]e|confirm|complete|finish)\b.*\b(exchange|return|refund|claim|swap)\b/i,
  medical: /\b(cure|cures|heal|treat(ment)?|diagnos\w*|acne|eczema|psoriasis|medic(ine|ation|ines)|prescription|disease|infection|rash|pregnan\w*|breastfeed\w*|allergic reaction)\b/i,
  greeting: /^\s*(hi|hello|hey|good (morning|afternoon|evening)|can you help( me)?|help( me)?|hi there)[\s!.,?]*(can you help( me)?[\s!.,?]*)?$/i,
  priceChanged: /(\b(cart|checkout)\b.*\b(says?|shows?|is|said)\b.*\d)|(\b(chat|you|bot)\b.*\bsaid\b.*\b(price|etb|birr|\d)\b)|\b(price|total) (has |had )?(changed|is different|went up|is higher|is more)\b/i,
  confirmYes: /^\s*(yes|yeah|yep|ok(ay)?|sure|please( do)?|yes,? please|go ahead|send( it| them| this| my question| my message| my offer)?|ask (them|the seller)|please ask( them| the seller)?)[\s.!]*$/i,
  talk: /\b(talk to (the )?(seller|human|person)|speak to (the )?(seller|human|person)|human|real person|contact (the )?seller|message (the )?seller)\b/i,
  sendOffer: /\bsend (my )?offer\b/i,
}
// Non-English markers: Ge'ez script, or common Amharic/Oromo words in Latin letters. Free text in any language still reaches a human.
export const GEEZ = /[ሀ-፿ᎀ-᎟ⶀ-⷟]/
export const NON_ENGLISH_WORDS = /\b(selam|salam|tena yistilign|ameseginalehu|amesegnalehu|betam|kemet|sint new|yet new|ayzosh|eshi|ishi|gin|wegen|tadias|ye(lem|llem)|aleh|alew|ante|ene|nege|zare|dehna|enkuan)\b/i

// ---- clause rules, most specific first ----
type ClauseRule = [IntentId, RegExp]
export const CLAUSE_RULES: ClauseRule[] = [
  ['A02', /\b(what('s| is) the total|total (price|cost)|checkout|check out|final price|altogether|in total|what do i pay)\b/i],
  ['A01', /\b(i want (this|it|to buy|one)|i('ll| will) (take|buy)|add (it |this )?to (my )?(cart|bag|basket)|buy (this|it|now)|purchase|order this|how (do|can) i (buy|order|get (it|this))|i('d| would) like to (buy|order))\b/i],
  ['C01', /\b((what|which) (items?|products?|things?|pieces?)\b.*\b(scene|picture|photo|look|post|outfit|image)|(items?|products?|things?) (are )?(in|inside) (the |this |that )?(scene|picture|photo|post|look|outfit|image))\b/i],
  ['C03', /\b(what is this look|what('s| is) (the )?(look|scene|post|outfit)|tell me about (the |this )?(look|scene|outfit)|styling|how (do|should) i (wear|style)|(this|the) look)\b/i],
  ['P07', /\b(size guide|size chart|measurements?|which size|what size (should|do|would|am)|size (should|do) i|fit me|will \w+ (definitely )?(fit|suit) me|true to size|normally wear|usually wear|runs? (small|large)|definitely fit|guarantee (the )?fit)\b/i],
  ['P08', /\b(original|genuine|authentic\w*|real (leather|gold|silver)|fake|counterfeit|pure (gold|silver)|certified|hallmark)\b/i],
  ['S05', /\b(warranty|warranties|after[- ]sales?|repair|service cent(re|er))\b/i],
  ['S04', /\b(return policy|returns?|exchange|refund|refunds|money back|swap)\b/i],
  ['P06', /\b(compatible|compatibility|work(s)? with|fit(s)? (my|a|the) (phone|laptop|tablet|device|camera|stylus|bike|car|computer|tv|home)|connect (it )?(to|with|by)|bluetooth|pair (it|with)|my (laptop|phone|device|tablet|stylus|home system|computer))\b/i],
  ['P09', /\b(new or used|brand new|second[- ]hand|sealed|refurbished|is it used|condition)\b/i],
  ['P05', /\b(how (do|to|should|can) i (use|wear|wash|clean|care|apply|charge|assemble|store)|care|washing machine|machine wash|wash(ing)?|dry clean|iron(ing)?|instructions?|how often|directions)\b/i],
  ['P03', /\b(in stock|available|availability|do you have|have any|still have|left|sold out|out of stock|restock|can i get (\w+)|how many (do you have|left|are left))\b/i],
  ['P01', /\b(how much(?= is| does| do| would| will| are| for| to| it| the| this| that| cost|\s*$)|price|prices|cost|costs|expensive|pricing|what('s| is) it (for|going for))\b/i],
  ['P02', /\b((what|which) (sizes|colou?rs|shades|options|variants|versions)|(sizes?|colou?rs?|options?) (are )?(available|offered)|(do(es)? (it|they) )?come in (other |different |more |what |which |any )?(sizes?|colou?rs?|shades?|options?)|available options|other (sizes?|colou?rs?))\b/i],
  ['S03', /\b(deliver(y|ies|ed)?|ship(ping)?|collect(ion)?|pick ?up|courier|post to)\b/i],
  ['S02', /\b(where (is|are) (your|the) (shop|store|studio|office|location)|opening hours?|open(ing)? (time|hours)|when are you open|your (address|location)|who are you|about (the )?(shop|seller|store))\b/i],
  ['S01', /\b(hello|hi there)\b/i],
]
// Questions about a listed field (P04) when nothing above matched. Only decides "this is an attribute question".
export const ATTRIBUTE_WORDS = /\b(material|fabric|made (of|from|with|by)|length|long|short|fit|fits|sleeve|neck|pattern|colou?r|closure|fasten\w*|close|zip\w*|button\w*|waist\w*|rise|stretch\w*|lined|lining|pockets?|weight|heavy|light|warm\w*|waterproof|water-?resistant|capacity|dimensions?|width|wide|height|tall|big|small|strap\w*|compartments?|pieces?|included|include|come with|what('s| is) (it|this|the)|how (many|wide|tall|big|heavy|long|high)|brand|style|occasion|season|transparen\w*|see-?through|sheer|padding|padded|cup|support|coverage|cover\w*|heel|sole|upper|ingredients?|scent|notes?|shade|finish|storage|ram|resolution|lens|gauge|metal|purity|hole|age|sweat|layer|feel|insulation|hood|wheels?|laptop|device|bottle|stroller|mat|cards?|coin|symbol|weaving|provenance|origin|region|culture|handmade|label|tagless|vest|lapel|accessories|waterproof|foldable|fold\w*|load|dividers?|prayer|beads?|hairstyle|attachment|back|earring|ring|necklace|bracelet|anklet|size|sized|sizes)\b/i
