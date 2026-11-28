// DEMO-002: the Operator Console's read model on the marketplace dataset. Pure TypeScript (no React, storage or clock) so Node can load it for the unit tests.
// Everything is derived from the supplied rows and the shared simulation state; nothing is invented. Lifecycle, counts, categories, Trust level, followers and the
// team summary come from the source rows (never from a Seller's session edits), so an Operator inspects what the dataset says. Simulated commerce (Orders, Claims,
// Handoffs, comments, purchased reviews) comes from the simulation state and is labelled internal simulation wherever it is shown.
import type { SimState, World } from '../simulation/orders.ts'
import { isHidden, isPending } from '../simulation/feedback.ts'
import { isVisible } from '../simulation/reviews.ts'
import { POOL_STATUSES, statusOf, type PoolStatus } from '../simulation/relationships.ts'

type Row = Record<string, any> // source rows carry more columns than types.ts names; they are read here by name
export interface Source { catalogue: { sellers: Row[]; products: Row[]; scenes: Row[]; stories: Row[] }; operations: { team_members: Row[]; claims: Row[] } }

export interface SellerRow {
  id: string; name: string; handle: string; lifecycle: string; city: string; area: string; market: string; sellerType: string
  categories: string[]; products: number; published: number; drafts: number; scenes: number; publicScenes: number; stories: number; liveStories: number
  trust: string; followers: number; verification: string; tenureDays: number; profile: string
  team: { total: number; owner: number; active: number; invited: number; revoked: number; suspended: number }; orders: number | null
}
const uniq = <T>(a: T[]) => [...new Set(a)]
const count = (rows: Row[], f: (r: Row) => boolean) => rows.filter(f).length

/** All Sellers (every lifecycle) with the facts an Operator inspects. Counts are computed from the rows; the unit test compares them with the Seller's own count fields. */
export function sellerDirectory(src: Source, sim: SimState | null): SellerRow[] {
  const { catalogue: c, operations: o } = src
  return c.sellers.map(s => {
    const products = c.products.filter(p => p.seller_id === s.seller_id), scenes = c.scenes.filter(x => x.seller_id === s.seller_id), stories = c.stories.filter(x => x.seller_id === s.seller_id)
    const members = o.team_members.filter(m => m.seller_id === s.seller_id)
    return {
      id: s.seller_id, name: s.name, handle: s.handle, lifecycle: s.lifecycle, city: s.city, area: s.area, market: s.market, sellerType: s.seller_type, categories: uniq<string>(s.categories),
      products: products.length, published: count(products, p => p.publication === 'PUBLISHED'), drafts: count(products, p => p.publication === 'DRAFT'),
      scenes: scenes.length, publicScenes: count(scenes, x => x.visibility === 'PUBLIC'), stories: stories.length, liveStories: count(stories, x => x.expected_state === 'Live'),
      trust: s.mvp_trust, followers: s.mvp_demo_followers, verification: s.verification_fixture, tenureDays: s.demo_tenure_days, profile: s.profile,
      team: { total: members.length, owner: count(members, m => m.membership_status === 'OWNER_RELATIONSHIP'), active: count(members, m => m.membership_status === 'ACTIVE'), invited: count(members, m => m.membership_status === 'INVITED'), revoked: count(members, m => m.membership_status === 'REVOKED'), suspended: count(members, m => m.membership_status === 'SUSPENDED') },
      orders: sim ? Object.values(sim.orders).filter(x => x.sellerId === s.seller_id).length : null,
    }
  })
}

export interface CourierRow {
  id: string; name: string; handle: string; verification: string; baseCity: string; cities: string[]; vehicle: string; mvpAvailability: string; availability: string
  relationships: Record<PoolStatus, number>; approved: string[]; orders: number; completed: number
}
/** The five Couriers with their verification, availability (the simulation's current one) and relationships with Sellers, read from the shared state. */
export function courierDirectory(w: World, sim: SimState): CourierRow[] {
  return Object.values(w.couriers).map(c => {
    const rel = Object.fromEntries(POOL_STATUSES.map(st => [st, 0])) as Record<PoolStatus, number>
    const approved: string[] = []
    for (const sellerId of Object.keys(w.sellers)) { const st = statusOf(sim, c.id, sellerId); if (st) { rel[st]++; if (st === 'APPROVED') approved.push(sellerId) } }
    const mine = Object.values(sim.orders).filter(o => o.assignedCourier === c.id)
    return { id: c.id, name: c.name, handle: c.handle, verification: c.verification, baseCity: c.baseCity, cities: c.cities, vehicle: c.vehicle, mvpAvailability: c.mvpAvailability, availability: sim.availability[c.id], relationships: rel, approved, orders: mine.length, completed: mine.filter(o => o.status === 'COMPLETED').length }
  })
}

export type Queue = 'Moderation' | 'Claims' | 'Verification / Recovery' | 'Manual Handoff'
export type CaseKind = 'COURIER_COMMENT' | 'REVIEW_HELD' | 'SCENE_RESTRICTED' | 'SCENE_SELLER_SUSPENDED' | 'CLAIM' | 'COURIER_VERIFICATION' | 'SELLER_VERIFICATION' | 'FAILED_HANDOFF'
export interface OpCase { ref: string; queue: Queue; kind: CaseKind; subject: string; sellerId: string | null; at: string | null; state: string; simulation: boolean }

/**
 * Open Operator work from the dataset's own states: Courier comments pending moderation, reviews held by moderation, Scenes restricted by moderation or hidden
 * because the Seller is suspended, the one Claim, Couriers (and Sellers) whose verification is not complete, and Orders whose delivery failed. `simulation` marks
 * cases that exist only in the internal simulation (the current MVP hides them). There are no Support or Trust Appeal records in the dataset, so those queues are empty.
 */
export function opCases(src: Source, w: World, sim: SimState): OpCase[] {
  const { catalogue: c, operations: o } = src
  const out: OpCase[] = []
  for (const x of Object.values(sim.comments).filter(isPending)) out.push({ ref: x.id, queue: 'Moderation', kind: 'COURIER_COMMENT', subject: `Courier comment about ${w.couriers[x.courierId]?.name ?? x.courierId} from ${w.sellers[x.sellerId]?.name ?? x.sellerId}`, sellerId: x.sellerId, at: x.createdAt, state: 'Pending moderation', simulation: true })
  for (const r of Object.values(sim.reviews).filter(v => !isVisible(v))) out.push({ ref: r.id, queue: 'Moderation', kind: 'REVIEW_HELD', subject: `Review of ${w.sellers[r.sellerId]?.name ?? r.sellerId} held by moderation`, sellerId: r.sellerId, at: r.publishedAt, state: 'Hidden by moderation', simulation: true })
  for (const s of c.scenes) {
    if (/moderation restriction/i.test(s.reason ?? '')) out.push({ ref: s.scene_id, queue: 'Moderation', kind: 'SCENE_RESTRICTED', subject: `Scene "${s.title}" restricted by moderation`, sellerId: s.seller_id, at: null, state: 'Restricted', simulation: false })
    else if (/seller suspended/i.test(s.reason ?? '')) out.push({ ref: s.scene_id, queue: 'Moderation', kind: 'SCENE_SELLER_SUSPENDED', subject: `Scene "${s.title}" hidden: Seller suspended`, sellerId: s.seller_id, at: null, state: 'Hidden', simulation: false })
  }
  for (const k of o.claims) out.push({ ref: k.claim_id, queue: 'Claims', kind: 'CLAIM', subject: `${String(k.basis).replace(/_/g, ' ').toLowerCase()} · Order ${k.order_id} · ${w.sellers[k.seller_id]?.name ?? k.seller_id}`, sellerId: k.seller_id, at: k.decided_at, state: `${String(k.outcome).replace(/_/g, ' ').toLowerCase()} · remedy ${String(k.remedy_state).replace(/_/g, ' ').toLowerCase()}`, simulation: true })
  for (const x of Object.values(w.couriers).filter(v => v.verification !== 'VERIFIED')) out.push({ ref: x.id, queue: 'Verification / Recovery', kind: 'COURIER_VERIFICATION', subject: `Courier verification · ${x.name}`, sellerId: null, at: null, state: x.verification.toLowerCase(), simulation: false })
  for (const s of c.sellers.filter(v => /^pending/i.test(v.verification_fixture))) out.push({ ref: s.seller_id, queue: 'Verification / Recovery', kind: 'SELLER_VERIFICATION', subject: `Seller verification · ${s.name}`, sellerId: s.seller_id, at: null, state: String(s.verification_fixture).toLowerCase(), simulation: false })
  for (const x of Object.values(sim.orders).filter(v => v.status === 'DELIVERY_FAILED')) out.push({ ref: x.id, queue: 'Manual Handoff', kind: 'FAILED_HANDOFF', subject: `Failed final handoff · Order ${x.id} · ${w.sellers[x.sellerId]?.name ?? x.sellerId}`, sellerId: x.sellerId, at: (sim.events[x.id] ?? []).at(-1)?.at ?? null, state: `delivery failed · ${String(x.attemptReason ?? 'no reason recorded').replace(/_/g, ' ').toLowerCase()}`, simulation: true })
  return out
}

/** Moderation decisions made in this session: a comment or review whose visibility now differs from the seed's. */
export function sessionDecisions(base: SimState, sim: SimState) {
  const out: { kind: 'COMMENT' | 'REVIEW'; id: string; was: string; now: string }[] = []
  for (const c of Object.values(sim.comments)) { const b = base.comments[c.id]; if (b && (b.moderation !== c.moderation || b.visibility !== c.visibility)) out.push({ kind: 'COMMENT', id: c.id, was: b.moderation, now: isHidden(c) ? 'HIDDEN' : isPending(c) ? 'PENDING' : 'VISIBLE' }) }
  for (const r of Object.values(sim.reviews)) { const b = base.reviews[r.id]; if (b && b.visibility !== r.visibility) out.push({ kind: 'REVIEW', id: r.id, was: b.visibility, now: isVisible(r) ? 'PUBLISHED' : 'HIDDEN' }) }
  return out
}
