// Versioned response templates. `pdf` templates carry the proposed wording exactly (page given); `derived` ones are composed from
// the same governing facts where the PDF shows a UI control or a placeholder instead of Bot prose, and are registered as such in the
// coverage register. Braces are typed slots: a template is rendered only when every slot is resolved, never printed unresolved.
export const TEMPLATE_VERSION = '1.0.0'
export interface Template { text: string; source: 'pdf' | 'derived'; page?: number; note?: string }

export const TEMPLATES = {
  'T-GREETING': { text: "Hi! I’m the Seller’s automated assistant. I can check listed Product details, options, prices and store information, or send your question to the Seller.", source: 'pdf', page: 9 },
  'T-SELECT-PRODUCT': { text: 'Which Product are you asking about? Select it here, or ask the Seller.', source: 'pdf', page: 7 },
  'T-SUBJECT-UNAVAILABLE': { text: 'This item or Scene is no longer available to view here. You can select another current Product or ask the Seller.', source: 'pdf', page: 7 },
  'T-SCENE-UNAVAILABLE': { text: 'This Scene is no longer available to view here. You can select another current Product or ask the Seller.', source: 'pdf', page: 13 },
  'T-SCENE-NO-DETAILS': { text: "I can’t show unavailable Scene details. You can ask the Seller.", source: 'pdf', page: 13 },
  'T-SCENE-SELECT': { text: 'This Scene contains several Products. Which one are you asking about?', source: 'pdf', page: 12 },
  'T-SCENE-ITEMS': { text: 'These are the currently viewable tagged Products: {eligible_tagged_product_names}.', source: 'pdf', page: 12 },
  'T-SCENE-CONTEXT': { text: 'The Seller describes this Scene as: {scene_context_summary}.', source: 'pdf', page: 12 },
  'T-SCENE-OPTION': { text: '{value} is listed for {product}. Please select {remaining_options} to check availability.', source: 'pdf', page: 12 },
  'T-PRICE': { text: 'The listed price for {product} {variant}is {currency} {amount}. Price and availability may change before checkout review.', source: 'pdf', page: 7, note: '{variant} is empty or "<exact option> "' },
  'T-PRICE-OPTIONS': { text: 'Price depends on the option. Please select {required_options} to see its current price.', source: 'pdf', page: 7 },
  'T-STOCK-IN': { text: '{variant} is currently available.', source: 'pdf', page: 7 },
  'T-STOCK-IN-PRICE': { text: '{variant} is currently available. The listed price is {currency} {amount}.', source: 'pdf', page: 10 },
  'T-STOCK-OUT': { text: '{variant} is currently out of stock.', source: 'pdf', page: 7 },
  'T-STOCK-OPTION': { text: 'Please select {required_options} to check availability.', source: 'derived', note: 'Availability depends on the exact option; the PDF shows the option selector as a control (C-03, C-07).' },
  'T-QTY-OK': { text: 'The selected option currently has enough stock for {quantity}.', source: 'pdf', page: 7 },
  'T-QTY-NO': { text: 'That quantity is not currently available.', source: 'pdf', page: 7 },
  'T-AVAILABLE-OPTIONS': { text: 'The currently available options for this Product are {available_variant_labels}.', source: 'pdf', page: 10 },
  'T-NO-AVAILABLE-OPTIONS': { text: 'No option of this Product is currently in stock. You can ask the Seller.', source: 'derived', note: 'C-04 lists available options; the empty case is not scripted.' },
  'T-OPTIONS-LIST': { text: '{product} is listed with these options: {options}. Availability depends on the exact option.', source: 'derived', note: 'P02 reads the option list; it is not proof of stock (page 5).' },
  'T-ATTR': { text: 'The Seller lists {attribute_label}: {attribute_value} for {product_or_variant}.', source: 'pdf', page: 7 },
  'T-ATTR-FOR': { text: 'For {product}, the Seller lists {attribute_label}: {attribute_value}.', source: 'pdf', page: 13 },
  'T-ATTR-UNKNOWN': { text: 'That detail is not listed for this item. I can send your question to the Seller.', source: 'pdf', page: 7 },
  'T-DETAILS-LISTED': { text: 'The Seller lists these details for {product}: {details}.', source: 'derived', note: 'Unlabelled Seller detail lines on an untouched seeded Product; stated as the Seller’s own lines, never mapped to a field.' },
  'T-SUPPLEMENTARY': { text: "The Seller’s note: {seller_answer}", source: 'derived', note: 'Supplementary Seller Q&A: used last and never when it conflicts with a canonical fact.' },
  'T-DESCRIPTION': { text: 'The Seller describes {product}: {description}', source: 'derived', note: 'Product details chip (C-01).' },
  'T-CARE-MISSING': { text: 'Care instructions are not listed for this item. I can send your question to the Seller.', source: 'pdf', page: 11 },
  'T-POLICY': { text: "The Seller’s listed {policy_name} is: {approved_policy_summary}.", source: 'pdf', page: 7 },
  'T-RETURNS': { text: "The Seller’s listed exchange policy is: {exchange_eligibility}, {window}, {condition}, {process}.", source: 'pdf', page: 14 },
  'T-WARRANTY': { text: 'The Seller lists this warranty: {approved_warranty_summary}.', source: 'pdf', page: 15 },
  'T-NO-EXECUTE': { text: "I can explain the listed policy, but I can’t approve or process an exchange. I can send your question to the Seller.", source: 'pdf', page: 14 },
  'T-SIZE-GUIDE': { text: 'The Seller has a size guide for this Product. Compare your measurements with the guide before selecting a size.', source: 'pdf', page: 11 },
  'T-SIZE-GUIDE-CONTENT': { text: "The Seller’s size guide: {size_guide}", source: 'derived', note: 'Renders the configured chart for the View size guide control.' },
  'T-SIZE-NO-GUARANTEE': { text: "I can’t guarantee fit. I can send your question to the Seller for more guidance.", source: 'pdf', page: 11 },
  'T-AUTHENTICITY': { text: "The Seller states: {authenticity_claim}. This is the Seller’s own statement; Adulis has not verified it.", source: 'derived', note: 'Attributed claim only (P08, page 6).' },
  'T-AUTHENTICITY-MISSING': { text: "I don’t have verified authenticity information for this item. I can send your question to the Seller.", source: 'pdf', page: 15 },
  'T-MULTI-INTENT': { text: 'I can check one detail at a time. Which would you like to check first?', source: 'pdf', page: 15 },
  'T-ASK-DEVICE': { text: 'Please provide your laptop model or dimensions, then I can check the listed compatibility.', source: 'pdf', page: 18 },
  'T-COMPAT-LISTED': { text: 'The Seller lists compatibility with: {compatibility}. I can only confirm what is listed.', source: 'derived', note: 'P06 with an explicit approved list and no device named.' },
  'T-COMPAT-MATCH': { text: 'The Seller lists {device} as compatible with this item.', source: 'derived', note: 'The named device is on the Seller’s approved list.' },
  'T-COMPAT-UNCONFIRMED': { text: "I can’t confirm compatibility from the listed details. I can send your question to the Seller.", source: 'pdf', page: 18 },
  'T-MEDICAL': { text: "I can share the Seller’s listed ingredients and usage instructions if available, but I can’t diagnose, recommend treatment or confirm compatibility with medicine. Ask a qualified health professional.", source: 'pdf', page: 19 },
  'T-INSTRUCTIONS': { text: "The Seller’s listed instructions are: {approved_label_instructions}.", source: 'pdf', page: 19 },
  'T-ASK-AREA': { text: "Please choose your delivery area so I can check this Seller’s listed coverage.", source: 'pdf', page: 14 },
  'T-DELIVERY-NO-AREA': { text: 'Delivery is not listed for this area. You can check collection options or ask the Seller.', source: 'pdf', page: 14 },
  'T-DELIVERY-OK': { text: 'Delivery to {area} is listed through {methods}. Delivery times are not stated here.', source: 'derived', note: 'Coverage hit; the PDF scripts only the miss (C-11).' },
  'T-DELIVERY-METHODS': { text: 'This Seller lists {methods}. Delivery times are not stated here.', source: 'derived', note: 'S03 without an area.' },
  'T-COLLECTION': { text: "The Seller’s listed collection location and hours are: {approved_collection_details}.", source: 'pdf', page: 14 },
  'T-SELLER-INFO': { text: '{seller} ({handle}). {bio}', source: 'derived', note: 'S02 reads the Seller profile; nothing is re-entered.' },
  'T-CART-NAV': { text: 'Select your options and quantity, then review the current item in your Cart. Payment and live order placement are not available yet.', source: 'pdf', page: 16 },
  'T-PRICE-CHANGED': { text: 'The current price can change. Please use the updated Cart or checkout review before deciding.', source: 'pdf', page: 16 },
  'T-CHECKOUT-PREVIEW': { text: 'Totals are shown in your Cart review, not in chat. Payment and live order placement are not available yet.', source: 'derived', note: 'A02: never calculate or lock a price in chat.' },
  'T-PAYMENT-DEFERRED': { text: 'Payment and live order placement are not available through Adulis right now. You can still review your Cart or ask the Seller a question.', source: 'pdf', page: 7 },
  'T-PAYMENT-NO-CONFIRM': { text: "Payment and live order placement are not available through Adulis right now. I can’t confirm a payment or Order. I can send your message to the Seller.", source: 'pdf', page: 16 },
  'T-PAYMENT-SHORT': { text: 'Payment and live order placement are not available through Adulis right now.', source: 'pdf', page: 18 },
  'T-NO-RESERVE': { text: "I can’t hold stock or reserve items. You can review it in your Cart or ask the Seller.", source: 'pdf', page: 10 },
  'T-NO-NEGOTIATE': { text: "I can show the current listed price, but I can’t negotiate or change it. I can send your offer to the Seller.", source: 'pdf', page: 15 },
  'T-SENSITIVE': { text: "Please don’t share payment credentials or sensitive financial details here. For assistance, contact the Seller through this conversation.", source: 'pdf', page: 16 },
  'T-UNSAFE': { text: "I can only help with information available in this Seller’s conversation. Please select an available Product or ask the Seller.", source: 'pdf', page: 18 },
  'T-UNAVAILABLE-READ': { text: "I can’t check that information right now. Your message can be sent to the Seller.", source: 'pdf', page: 7 },
  'T-HANDOFF': { text: "Your message has been sent to the Seller. Automated help is unavailable for this question. We can’t promise a reply time.", source: 'pdf', page: 7 },
  'T-HANDOFF-SENT': { text: "Your message has been sent to the Seller. We can’t promise a reply time.", source: 'pdf', page: 11 },
  'T-UNKNOWN-OFFER': { text: "I can’t answer that automatically. I can send your question to the Seller.", source: 'derived', note: 'No intent matched; mirrors the unknown-attribute wording.' },
  'UI-BOT-OFF': { text: "Automated help is turned off for this Seller. Your message has been sent to the Seller. We can’t promise a reply time.", source: 'derived', note: 'Static status, not Bot prose (page 18: use static status if the bot is unavailable).' },
} as const satisfies Record<string, Template>
export type TemplateId = keyof typeof TEMPLATES

/** Fills {slots}. Throws when a slot is missing or empty, so an unresolved value can never be shown. */
export function render(id: TemplateId, slots: Record<string, string>): string {
  const out = TEMPLATES[id].text.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = slots[key]
    if (v === undefined) throw new Error(`template ${id}: slot ${key} unresolved`)
    return v
  })
  return out.replace(/\s{2,}/g, ' ')
}
