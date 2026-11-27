// Pure validator for the marketplace source data. No I/O, no React, no demo-data imports (taxonomy and role lists are passed in), so the
// build script, the unit test and the dev-mode runtime check all run the same function. It never repairs anything: a source fact
// that breaks an invariant is reported, and the register records it.
import type { Analytics, Catalogue, OperationsCore } from './types.ts'

export type IssueLevel = 'error' | 'conflict' | 'gap'
/** error: the app relies on this and the import must not proceed. conflict: the source disagrees with itself or with the app rules (registered, not fixed). gap: the dataset lacks something the app can show (registered, never invented). */
export interface Issue { level: IssueLevel; code: string; entity: string; message: string }

export const EXPECTED_COUNTS = {
  sellers: 23, products: 140, scenes: 66, stories: 11, variants: 15, assets: 391,
  buyers: 11, couriers: 5, relationships_and_eligibility: 115, courier_comments: 25, delivery_offers: 33, teams: 23, team_members: 83,
  role_grants: 197, tasks: 71, team_messages: 50, orders: 146, order_lines: 192, order_events: 848, handoffs: 164, review_grants: 138, reviews: 119, product_ratings: 147,
} as const

export const CANONICAL_ROLES = ['OWNER', 'ADMIN', 'SALES_SUPPORT', 'INVENTORY', 'ANALYST', 'CAMPAIGN_MANAGER'] as const
const SCOPE_MODES = new Set(['MVP', 'DEMO', 'INTERNAL_SIMULATION'])

export interface ValidateContext {
  /** Resolves a source taxonomy path against src/demo-data/taxonomy.ts. Omit to skip the taxonomy check. */
  taxonomy?: (major: string, category: string, subcategory: string | null) => { major: boolean; category: boolean; sub: boolean; subListed: boolean }
  /** The roles src/demo-data/seller-roles.ts defines. Omit to use CANONICAL_ROLES. */
  roles?: readonly string[]
}
export type ValidateInput = { base: Catalogue; ops: OperationsCore & Partial<Analytics> }

type Rec = Record<string, unknown>
const dupes = (values: string[]) => values.filter((v, i) => values.indexOf(v) !== i)

export function validateMarketplace({ base, ops }: ValidateInput, ctx: ValidateContext = {}): Issue[] {
  const out: Issue[] = []
  const add = (level: IssueLevel, code: string, entity: string, message: string) => out.push({ level, code, entity, message })
  const err = (code: string, entity: string, message: string) => add('error', code, entity, message)
  const conflict = (code: string, entity: string, message: string) => add('conflict', code, entity, message)

  // ---- counts ----
  const all: Record<string, Rec[]> = { ...(base as unknown as Record<string, Rec[]>), ...(ops as unknown as Record<string, Rec[]>) }
  for (const [table, n] of Object.entries(EXPECTED_COUNTS)) if (all[table]?.length !== n) err('count', table, `${table}: ${all[table]?.length} rows, expected ${n}`)

  // ---- primary keys ----
  const keys: [string, (r: any) => string][] = [
    ['sellers', r => r.seller_id], ['products', r => r.product_id], ['variants', r => r.variant_id], ['scenes', r => r.scene_id], ['stories', r => r.story_id], ['assets', r => r.asset_id],
    ['buyers', r => r.buyer_id], ['collections', r => r.collection_id], ['cart_lines', r => r.cart_line_id], ['chat_messages', r => r.message_id], ['couriers', r => r.courier_id],
    ['relationships_and_eligibility', r => r.relationship_id], ['courier_comments', r => r.comment_id], ['delivery_offers', r => r.offer_id], ['teams', r => r.team_id],
    ['team_members', r => r.member_id], ['tasks', r => r.task_id], ['team_messages', r => r.message_id], ['orders', r => r.order_id], ['order_lines', r => r.order_line_id],
    ['handoffs', r => r.handoff_id], ['claims', r => r.claim_id], ['review_grants', r => r.grant_id], ['reviews', r => r.review_id], ['product_ratings', r => r.item_review_id],
    ['order_events', r => `${r.order_id}#${r.event_index}`], ['follows', r => `${r.buyer_id}>${r.seller_id}`], ['saves', r => `${r.collection_id}:${r.entity_type}:${r.entity_id}`],
    ['teams', r => r.seller_id], ['seller_summary', r => r.seller_id], ['seller_reputation', r => r.seller_id], ['product_reputation', r => r.product_id],
  ]
  for (const [table, key] of keys) for (const d of dupes((all[table] ?? []).map(key))) err('duplicate-id', table, `${table}: duplicate key ${d}`)

  // ---- indexes ----
  const sellers = new Map(base.sellers.map(s => [s.seller_id, s]))
  const products = new Map(base.products.map(p => [p.product_id, p]))
  const variants = new Map(base.variants.map(v => [v.variant_id, v]))
  const scenes = new Map(base.scenes.map(s => [s.scene_id, s]))
  const buyers = new Set(ops.buyers.map(b => b.buyer_id))
  const couriers = new Set(ops.couriers.map(c => c.courier_id))
  const members = new Map(ops.team_members.map(m => [m.member_id, m]))
  const orders = new Map(ops.orders.map(o => [o.order_id, o]))
  const lines = new Map(ops.order_lines.map(l => [l.order_line_id, l]))
  const handoffs = new Map(ops.handoffs.map(h => [h.handoff_id, h]))
  const grants = new Map(ops.review_grants.map(g => [g.grant_id, g]))
  const reviews = new Map(ops.reviews.map(r => [r.review_id, r]))
  const linesOf = (orderId: string) => ops.order_lines.filter(l => l.order_id === orderId)
  const lifecycle = (sellerId: string) => sellers.get(sellerId)?.lifecycle
  const need = (set: { has(k: string): boolean }, id: string | null | undefined, code: string, entity: string, what: string) => {
    if (id == null) return false
    if (!set.has(id)) { err(code, entity, `${entity}: ${what} ${id} does not exist`); return false }
    return true
  }

  // ---- catalogue references, prices, taxonomy, Variants ----
  for (const p of base.products) {
    const e = p.product_id
    need(sellers, p.seller_id, 'ref', e, 'seller')
    if (p.discount_pct > 0 ? p.current_etb !== Math.round(p.regular_etb * (100 - p.discount_pct) / 100) : p.current_etb !== p.regular_etb) conflict('price', e, `${e}: current ${p.current_etb} does not follow regular ${p.regular_etb} and discount ${p.discount_pct}%`)
    if (!Number.isInteger(p.regular_etb) || !Number.isInteger(p.current_etb) || p.regular_etb <= 0) err('price', e, `${e}: prices must be positive whole ETB`)
    if (!Number.isInteger(p.stock) || p.stock < 0) err('stock', e, `${e}: stock must be a whole number from 0`)
    if (ctx.taxonomy) {
      const t = ctx.taxonomy(p.major, p.category, p.subcategory)
      if (!t.major || !t.category) conflict('taxonomy', e, `${e}: ${p.major} › ${p.category} is not in src/demo-data/taxonomy`)
      else if (p.subcategory && !t.sub) conflict('taxonomy', e, `${e}: subcategory "${p.subcategory}" is not under ${p.category}`)
      else if (!p.subcategory) add('gap', 'taxonomy-gap', e, `${e}: source gives no subcategory (${p.taxonomy_coverage}); category-only, nothing supplied`)
    }
  }
  const byProduct = new Map<string, typeof base.variants>()
  for (const v of base.variants) {
    need(products, v.product_id, 'ref', v.variant_id, 'product')
    byProduct.set(v.product_id, [...(byProduct.get(v.product_id) ?? []), v])
    if (!Number.isInteger(v.stock) || v.stock < 0) err('stock', v.variant_id, `${v.variant_id}: stock must be a whole number from 0`)
    if (v.current_etb > v.regular_etb) conflict('price', v.variant_id, `${v.variant_id}: current price above regular`)
  }
  for (const [pid, vs] of byProduct) {
    const p = products.get(pid)
    if (!p) continue
    const sum = vs.reduce((a, v) => a + v.stock, 0)
    if (sum !== p.stock) conflict('variant-stock', pid, `${pid}: Variant stock sums to ${sum} but the Product says ${p.stock}`)
    if (Math.min(...vs.map(v => v.current_etb)) !== p.current_etb) conflict('variant-price', pid, `${pid}: no Variant carries the Product's current price ${p.current_etb}`)
    if (dupes(vs.map(v => v.variant_label)).length) conflict('variant-label', pid, `${pid}: two Variants share a label`)
  }
  for (const s of base.scenes) {
    const e = s.scene_id
    need(sellers, s.seller_id, 'ref', e, 'seller')
    for (const pid of s.product_ids) if (need(products, pid, 'ref', e, 'tagged product') && products.get(pid)!.seller_id !== s.seller_id) err('ownership', e, `${e}: tags ${pid} of another Seller`)
    if (s.tag_names.length !== s.product_ids.length) err('ref', e, `${e}: tag_names and product_ids differ in length`)
    // Public visibility derives from Product stock (rule 1.8): PUBLIC needs a published tagged Product in stock.
    const live = s.product_ids.filter(pid => { const p = products.get(pid); return p && p.stock > 0 && p.publication === 'PUBLISHED' }).length
    // PRIVATE with stock left is legitimate only for an independent gate the source names (moderation restriction, suspended Seller); the app honours both.
    const explained = s.visibility === 'PRIVATE' && live > 0 && /moderation restriction|Seller suspended/i.test(s.reason)
    if (explained) add('gap', 'scene-gate-note', e, `${e}: PRIVATE despite stock because "${s.reason}"; honoured as an independent gate`)
    else if (s.publication === 'PUBLISHED' && (s.visibility === 'PUBLIC') !== live > 0) conflict('scene-visibility', e, `${e}: source says ${s.visibility}, tagged Products in stock say ${live > 0 ? 'PUBLIC' : 'PRIVATE'}`)
    if (s.publication !== 'PUBLISHED' && s.visibility === 'PUBLIC') conflict('scene-visibility', e, `${e}: ${s.publication} Scene marked PUBLIC`)
    if (s.available_tags !== live) conflict('scene-available-tags', e, `${e}: available_tags ${s.available_tags}, in-stock published tags ${live}`)
    if (lifecycle(s.seller_id) !== 'ACTIVE' && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC') conflict('lifecycle', e, `${e}: public Scene of a ${lifecycle(s.seller_id)} Seller (the app hides it by lifecycle)`)
  }
  for (const st of base.stories) {
    need(sellers, st.seller_id, 'ref', st.story_id, 'seller')
    if (st.link_id && !scenes.has(st.link_id) && !products.has(st.link_id)) err('ref', st.story_id, `${st.story_id}: link ${st.link_id} is neither a Scene nor a Product`)
    const owner = st.link_id ? (scenes.get(st.link_id) ?? products.get(st.link_id))?.seller_id : st.seller_id
    if (owner && owner !== st.seller_id) err('ownership', st.story_id, `${st.story_id}: links another Seller's record`)
  }

  // ---- lifecycle ----
  for (const s of base.sellers) {
    if (s.lifecycle === 'DRAFT') {
      const has = [['products', base.products.filter(p => p.seller_id === s.seller_id).length], ['orders', ops.orders.filter(o => o.seller_id === s.seller_id).length], ['reviews', ops.reviews.filter(r => r.seller_id === s.seller_id).length], ['followers', ops.follows.filter(f => f.seller_id === s.seller_id).length]] as const
      for (const [what, n] of has) if (n) conflict('lifecycle', s.seller_id, `${s.seller_id}: DRAFT Seller has ${n} ${what} (draft Sellers have no history)`)
    }
    if (s.lifecycle !== 'ACTIVE') {
      for (const [table, rows] of [['follows', ops.follows], ['cart_lines', ops.cart_lines], ['chat_messages', ops.chat_messages]] as const) {
        const n = (rows as { seller_id: string }[]).filter(r => r.seller_id === s.seller_id).length
        if (n) conflict('lifecycle', s.seller_id, `${s.seller_id}: ${s.lifecycle} Seller is referenced by ${n} ${table} row(s) (publicly hidden)`)
      }
    }
  }

  // ---- buyer-owned records ----
  const collections = new Map(ops.collections.map(c => [c.collection_id, c]))
  for (const f of ops.follows) { need(buyers, f.buyer_id, 'ref', 'follows', 'buyer'); need(sellers, f.seller_id, 'ref', 'follows', 'seller') }
  for (const c of ops.collections) need(buyers, c.buyer_id, 'ref', c.collection_id, 'buyer')
  for (const buyer of buyers) if (ops.collections.filter(c => c.buyer_id === buyer && c.is_default).length > 1) err('ownership', buyer, `${buyer}: more than one default Collection`)
  const publicProduct = (id: string) => { const p = products.get(id); return !!p && p.publication === 'PUBLISHED' && lifecycle(p.seller_id) === 'ACTIVE' }
  const publicScene = (id: string) => { const s = scenes.get(id); return !!s && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC' && lifecycle(s.seller_id) === 'ACTIVE' }
  for (const s of ops.saves) {
    const e = `save ${s.collection_id}:${s.entity_id}`
    need(buyers, s.buyer_id, 'ref', e, 'buyer')
    const c = collections.get(s.collection_id)
    if (!c) err('ref', e, `${e}: Collection ${s.collection_id} does not exist`)
    else if (c.buyer_id !== s.buyer_id) err('ownership', e, `${e}: Collection belongs to ${c.buyer_id}, not ${s.buyer_id}`)
    if (!(s.entity_type === 'PRODUCT' ? products : scenes).has(s.entity_id)) err('ref', e, `${e}: ${s.entity_type} ${s.entity_id} does not exist`)
    else if (!(s.entity_type === 'PRODUCT' ? publicProduct : publicScene)(s.entity_id)) conflict('lifecycle', e, `${e}: saved ${s.entity_type} ${s.entity_id} is not publicly eligible`)
  }
  for (const l of ops.cart_lines) {
    const e = l.cart_line_id
    need(buyers, l.buyer_id, 'ref', e, 'buyer')
    const p = products.get(l.product_id)
    if (!p) { err('ref', e, `${e}: product ${l.product_id} does not exist`); continue }
    if (p.seller_id !== l.seller_id) err('ownership', e, `${e}: ${l.product_id} belongs to ${p.seller_id}, not ${l.seller_id}`)
    if (!ops.cart_lines.every(x => !e.startsWith(x.buyer_id) || x.buyer_id === l.buyer_id)) err('ownership', e, `${e}: id prefix does not match buyer`)
    if (l.variant_id) { const v = variants.get(l.variant_id); if (!v) err('ref', e, `${e}: variant ${l.variant_id} does not exist`); else if (v.product_id !== l.product_id) err('ref', e, `${e}: variant ${l.variant_id} is not a variant of ${l.product_id}`) }
    if (!(l.quantity > 0)) err('quantity', e, `${e}: quantity must be positive`)
    if (!publicProduct(l.product_id)) conflict('lifecycle', e, `${e}: Cart line for a Product that is not publicly eligible`)
  }
  for (const m of ops.chat_messages) {
    const e = m.message_id
    need(buyers, m.buyer_id, 'ref', e, 'buyer'); need(sellers, m.seller_id, 'ref', e, 'seller')
    if (m.conversation_id !== `${m.buyer_id}-${m.seller_id}-CHAT`) conflict('conversation', e, `${e}: conversation id ${m.conversation_id} is not buyer+seller scoped`)
    if (m.product_id && products.get(m.product_id)?.seller_id !== m.seller_id) err('ownership', e, `${e}: product context is not this Seller's`)
    if (m.scene_id && scenes.get(m.scene_id)?.seller_id !== m.seller_id) err('ownership', e, `${e}: Scene context is not this Seller's`)
  }

  // ---- couriers ----
  const rels = new Set<string>()
  for (const r of ops.relationships_and_eligibility) {
    need(couriers, r.courier_id, 'ref', r.relationship_id, 'courier'); need(sellers, r.seller_id, 'ref', r.relationship_id, 'seller')
    if (r.relationship_id !== `${r.courier_id}-${r.seller_id}`) conflict('relationship', r.relationship_id, `${r.relationship_id}: id does not match courier and Seller`)
    rels.add(`${r.courier_id}|${r.seller_id}`)
  }
  if (rels.size !== couriers.size * sellers.size) err('relationship', 'relationships', `Every courier/Seller pair must appear once: ${rels.size} of ${couriers.size * sellers.size}`)
  for (const c of ops.courier_comments) {
    const o = orders.get(c.order_id)
    if (!need(orders, c.order_id, 'ref', c.comment_id, 'order') || !o) continue
    need(couriers, c.courier_id, 'ref', c.comment_id, 'courier')
    if (o.seller_id !== c.seller_id) err('ownership', c.comment_id, `${c.comment_id}: order is ${o.seller_id}'s, comment says ${c.seller_id}`)
    if ((o.assigned_courier_id ?? o.courier_id) !== c.courier_id) err('ownership', c.comment_id, `${c.comment_id}: courier ${c.courier_id} was not the order's courier`)
  }
  for (const f of ops.delivery_offers) {
    need(orders, f.order_id, 'ref', f.offer_id, 'order'); need(couriers, f.courier_id, 'ref', f.offer_id, 'courier')
    if (orders.get(f.order_id) && orders.get(f.order_id)!.seller_id !== f.seller_id) err('ownership', f.offer_id, `${f.offer_id}: Seller differs from the order's`)
  }

  // ---- teams and permissions ----
  const canonical = new Set(ctx.roles ?? CANONICAL_ROLES)
  for (const t of ops.teams) { need(sellers, t.seller_id, 'ref', t.team_id, 'seller'); if (lifecycle(t.seller_id) !== t.seller_lifecycle) conflict('lifecycle', t.team_id, `${t.team_id}: team lifecycle ${t.seller_lifecycle} differs from the Seller's ${lifecycle(t.seller_id)}`) }
  for (const s of base.sellers) {
    const owners = ops.team_members.filter(m => m.seller_id === s.seller_id && m.relationship_type === 'OWNERSHIP')
    if (owners.length !== 1) err('ownership', s.seller_id, `${s.seller_id}: ${owners.length} owner relationships, expected 1`)
  }
  for (const m of ops.team_members) {
    need(sellers, m.seller_id, 'ref', m.member_id, 'seller')
    for (const r of m.roles) if (!canonical.has(r)) err('permission', m.member_id, `${m.member_id}: role ${r} is not canonical`)
    if (m.relationship_type === 'TEAM' && m.roles.includes('OWNER')) err('permission', m.member_id, `${m.member_id}: OWNER is derived, never assignable`)
  }
  for (const g of ops.role_grants) if (!canonical.has(g.role_code)) err('permission', g.permission_code, `role_grants: ${g.role_code} is not a canonical role`)
  for (const role of canonical) if (!ops.role_grants.some(g => g.role_code === role)) conflict('permission', role, `role_grants: canonical role ${role} has no grants`)
  const grantFor = (role: string, permission: string) => ops.role_grants.some(g => g.role_code === role && g.permission_code === permission)
  for (const t of ops.tasks) {
    const a = members.get(t.assignee_id), by = members.get(t.assigned_by)
    need(sellers, t.seller_id, 'ref', t.task_id, 'seller')
    if (!a) err('ref', t.task_id, `${t.task_id}: assignee ${t.assignee_id} is not a member`)
    else {
      if (a.seller_id !== t.seller_id) err('ownership', t.task_id, `${t.task_id}: assignee belongs to ${a.seller_id}`)
      if (!['OWNER_RELATIONSHIP', 'ACTIVE'].includes(a.membership_status)) err('permission', t.task_id, `${t.task_id}: assignee membership is ${a.membership_status}`)
      if (!a.roles.some(r => grantFor(r, t.required_permission))) conflict('permission', t.task_id, `${t.task_id}: assignee roles ${a.roles.join('+')} hold no grant for ${t.required_permission}`)
    }
    if (!by) err('ref', t.task_id, `${t.task_id}: assigned_by ${t.assigned_by} is not a member`)
    else if (by.seller_id !== t.seller_id) err('ownership', t.task_id, `${t.task_id}: assigner belongs to ${by.seller_id}`)
  }
  const tasks = new Set(ops.tasks.map(t => t.task_id))
  for (const m of ops.team_messages) {
    const s = members.get(m.sender_member_id)
    if (!s) err('ref', m.message_id, `${m.message_id}: sender ${m.sender_member_id} is not a member`)
    else if (s.seller_id !== m.seller_id) err('ownership', m.message_id, `${m.message_id}: sender belongs to ${s.seller_id}`)
    if (m.task_id) need(tasks, m.task_id, 'ref', m.message_id, 'task')
  }

  // ---- orders, handoffs, claims, reviews ----
  const parties = new Set<string>([...sellers.keys(), ...buyers, ...couriers, ...members.keys()])
  for (const o of ops.orders) {
    const e = o.order_id
    need(buyers, o.buyer_id, 'ref', e, 'buyer'); need(sellers, o.seller_id, 'ref', e, 'seller'); need(couriers, o.courier_id, 'ref', e, 'courier')
    need(couriers, o.assigned_courier_id, 'ref', e, 'assigned courier'); need(couriers, o.offer_target_courier_id, 'ref', e, 'offer target courier')
    if (o.source_scene_id) need(scenes, o.source_scene_id, 'ref', e, 'source Scene')
    const ls = linesOf(e)
    if (!ls.length) err('order-lines', e, `${e}: no lines`)
    if (o.merchandise_etb !== ls.reduce((a, l) => a + l.line_etb, 0)) err('order-total', e, `${e}: merchandise ${o.merchandise_etb} != sum of lines ${ls.reduce((a, l) => a + l.line_etb, 0)}`)
    if (o.total_etb !== o.merchandise_etb + o.delivery_etb) err('order-total', e, `${e}: total ${o.total_etb} != merchandise ${o.merchandise_etb} + delivery ${o.delivery_etb}`)
    if (o.mode !== 'INTERNAL_SIMULATION') conflict('scope', e, `${e}: Orders are internal-simulation only, source says ${o.mode}`)
    if (o.payment_state !== 'SIMULATED_PAID') conflict('scope', e, `${e}: payment_state ${o.payment_state}`)
    if (o.status === 'COMPLETED') {
      const h = o.final_handoff_id ? handoffs.get(o.final_handoff_id) : null
      if (!h) err('handoff', e, `${e}: completed without a final handoff`)
    }
    if (lifecycle(o.seller_id) === 'DRAFT') conflict('lifecycle', e, `${e}: Order of a DRAFT Seller`)
    const evs = ops.order_events.filter(x => x.order_id === e).sort((a, b) => a.event_index - b.event_index)
    if (evs.some((x, i) => x.event_index !== i + 1)) err('order-events', e, `${e}: event_index is not 1..n`)
    if (evs.length && evs[evs.length - 1].state !== o.scenario_status && evs[evs.length - 1].state !== o.status) conflict('order-events', e, `${e}: last event ${evs[evs.length - 1].state} differs from status ${o.status}`)
  }
  for (const l of ops.order_lines) {
    const e = l.order_line_id, o = orders.get(l.order_id), p = products.get(l.product_id)
    if (!o) { err('ref', e, `${e}: order ${l.order_id} does not exist`); continue }
    if (!p) err('ref', e, `${e}: product ${l.product_id} does not exist`)
    else if (p.seller_id !== o.seller_id) err('ownership', e, `${e}: ${l.product_id} belongs to ${p.seller_id}, order is ${o.seller_id}'s`)
    if (l.variant_id) { const v = variants.get(l.variant_id); if (!v) err('ref', e, `${e}: variant ${l.variant_id} does not exist`); else if (v.product_id !== l.product_id) err('ref', e, `${e}: variant is not of ${l.product_id}`) }
    if (l.line_etb !== l.unit_etb * l.quantity) err('order-total', e, `${e}: line ${l.line_etb} != unit ${l.unit_etb} x ${l.quantity}`)
  }
  for (const ev of ops.order_events) need(orders, ev.order_id, 'ref', 'order_events', 'order')
  for (const h of ops.handoffs) {
    const e = h.handoff_id, o = orders.get(h.order_id)
    if (!o) { err('ref', e, `${e}: order ${h.order_id} does not exist`); continue }
    for (const [what, id] of [['presenter', h.presenter_id], ['scanner', h.scanner_id]] as const) if (!parties.has(id)) err('handoff', e, `${e}: ${what} ${id} is not a real party`)
    if (![o.seller_id, o.courier_id, o.assigned_courier_id, o.buyer_id].includes(h.presenter_id) && !members.has(h.presenter_id)) err('handoff', e, `${e}: presenter ${h.presenter_id} is not a party to ${h.order_id}`)
  }
  for (const o of ops.orders) if (o.final_handoff_id) {
    const h = handoffs.get(o.final_handoff_id)
    if (!h) err('handoff', o.order_id, `${o.order_id}: final_handoff_id ${o.final_handoff_id} does not exist`)
    else if (h.order_id !== o.order_id || h.stage !== 'DELIVERY') err('handoff', o.order_id, `${o.order_id}: final handoff ${h.handoff_id} is for ${h.order_id} stage ${h.stage}, expected this order's DELIVERY`)
  }
  for (const c of ops.claims) { const o = orders.get(c.order_id); if (!o) err('ref', c.claim_id, `${c.claim_id}: order does not exist`); else if (o.buyer_id !== c.buyer_id || o.seller_id !== c.seller_id) err('ownership', c.claim_id, `${c.claim_id}: buyer/seller differ from the order`) }
  const perOrder = new Map<string, number>()
  for (const g of ops.review_grants) {
    const o = orders.get(g.order_id)
    perOrder.set(g.order_id, (perOrder.get(g.order_id) ?? 0) + 1)
    if (!o) { err('ref', g.grant_id, `${g.grant_id}: order does not exist`); continue }
    if (o.buyer_id !== g.buyer_id || o.seller_id !== g.seller_id) err('review', g.grant_id, `${g.grant_id}: buyer/seller differ from the order`)
    if (g.final_handoff_id && handoffs.get(g.final_handoff_id)?.order_id !== g.order_id) err('review', g.grant_id, `${g.grant_id}: final handoff is not this order's`)
  }
  for (const [orderId, n] of perOrder) if (n > 1) err('review', orderId, `${orderId}: ${n} review grants (one per order)`)
  const perGrant = new Map<string, number>()
  for (const r of ops.reviews) {
    const g = grants.get(r.grant_id)
    perGrant.set(r.grant_id, (perGrant.get(r.grant_id) ?? 0) + 1)
    if (!g) { err('ref', r.review_id, `${r.review_id}: grant ${r.grant_id} does not exist`); continue }
    if (g.buyer_id !== r.buyer_id || g.seller_id !== r.seller_id || g.order_id !== r.order_id) err('review', r.review_id, `${r.review_id}: buyer, Seller or order differ from its grant`)
    if (!(r.seller_service_stars >= 1 && r.seller_service_stars <= 5)) err('review', r.review_id, `${r.review_id}: stars out of range`)
    if (lifecycle(r.seller_id) === 'SUSPENDED' && r.visibility === 'PUBLISHED') add('gap', 'lifecycle-note', r.review_id, `${r.review_id}: published review of a SUSPENDED Seller (internal history only; never shown publicly)`)
  }
  for (const [g, n] of perGrant) if (n > 1) err('review', g, `${g}: ${n} reviews (one per grant)`)
  for (const q of ops.product_ratings) {
    const r = reviews.get(q.review_id), l = lines.get(q.order_line_id)
    if (!r) { err('ref', q.item_review_id, `${q.item_review_id}: review does not exist`); continue }
    if (!l) { err('ref', q.item_review_id, `${q.item_review_id}: order line does not exist`); continue }
    if (l.order_id !== r.order_id) err('review', q.item_review_id, `${q.item_review_id}: line is of another order`)
    if (!l.received) err('review', q.item_review_id, `${q.item_review_id}: rates a line that was not received`)
    if (l.product_id !== q.product_id) err('review', q.item_review_id, `${q.item_review_id}: product differs from the line's`)
  }

  // ---- dataset scope ----
  // `scenarios` and `assets` are catalogue prose: their `mode` column labels a scenario, it is not a dataset scope.
  for (const [table, rows] of Object.entries(all)) if (Array.isArray(rows) && table !== 'scenarios' && table !== 'assets') for (const row of rows) {
    const mode = (row as { mode?: string }).mode
    if (mode !== undefined && !SCOPE_MODES.has(mode)) err('scope', table, `${table}: mode ${mode} is not MVP, DEMO or INTERNAL_SIMULATION`)
  }
  if (ops.seller_weekly && ops.seller_weekly.length !== base.sellers.length * 8) conflict('analytics', 'seller_weekly', `seller_weekly: ${ops.seller_weekly.length} rows, expected 8 weeks x ${base.sellers.length}`)
  return out
}
