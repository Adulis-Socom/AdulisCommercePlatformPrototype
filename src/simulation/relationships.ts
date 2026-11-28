// COURIER-002 (FR-006): Courier / Seller relationships on the supplied 115 relationship_and_eligibility rows. Pure TypeScript (no React, storage or clock).
// A null relationship_status is NOT a pool membership: it is classified as an opportunity, an outside-coverage pair, a verification requirement or an
// ineligible Seller. Relationship status changes (Apply, Accept invitation, Withdraw) are session actions folded over the seed; the seed is never mutated.
import { isoAt } from './clock.ts'
import type { Action, Party, Result, SimState, World } from './orders.ts'

export const POOL_STATUSES = ['APPROVED', 'INVITED', 'APPLIED', 'REJECTED', 'SUSPENDED', 'REMOVED'] as const
export type PoolStatus = (typeof POOL_STATUSES)[number]
export type PoolGroup = 'RELATIONSHIP' | 'ELIGIBLE' | 'OUTSIDE_COVERAGE' | 'VERIFICATION_REQUIRED' | 'SELLER_INELIGIBLE' | 'NO_OPPORTUNITY'
export const GROUP_LABEL: Record<PoolGroup, string> = {
  RELATIONSHIP: 'Pool relationship', ELIGIBLE: 'Eligible to apply', OUTSIDE_COVERAGE: 'Outside your coverage', VERIFICATION_REQUIRED: 'Verification required',
  SELLER_INELIGIBLE: 'Seller not accepting Couriers', NO_OPPORTUNITY: 'No declared opportunity',
}
export const STATUS_LABEL: Record<PoolStatus, string> = { APPROVED: 'Approved', INVITED: 'Invited', APPLIED: 'Application pending', REJECTED: 'Rejected', SUSPENDED: 'Suspended', REMOVED: 'Removed' }
export const key = (courierId: string, sellerId: string) => `${courierId}|${sellerId}`

export const statusOf = (s: SimState, courierId: string, sellerId: string): PoolStatus | null => (s.relStatus[key(courierId, sellerId)] as PoolStatus | null | undefined) ?? null

export interface Classified { group: PoolGroup; status: PoolStatus | null; detail: string }
/**
 * Where a Courier/Seller pair stands now. A pair with a status is a relationship (whatever the status). Without one the first failing rule wins, in the
 * order the dataset follows: Seller not ACTIVE, Seller outside the Courier's service cities, Courier not VERIFIED, then whether the Seller declared an
 * opportunity. tests/unit/courier-reviews.mjs proves this reproduces opportunity_state for all 115 rows at seed.
 */
export function classify(w: World, s: SimState, courierId: string, sellerId: string): Classified {
  const c = w.couriers[courierId], sl = w.sellers[sellerId], rel = w.relationships[key(courierId, sellerId)]
  const status = statusOf(s, courierId, sellerId)
  if (status) return { group: 'RELATIONSHIP', status, detail: STATUS_LABEL[status] }
  if (!c || !sl) return { group: 'SELLER_INELIGIBLE', status: null, detail: 'Unknown pair' }
  if (sl.lifecycle !== 'ACTIVE') return { group: 'SELLER_INELIGIBLE', status: null, detail: `${sl.name} is ${sl.lifecycle.toLowerCase()}: it cannot take Couriers` }
  if (!c.cities.includes(sl.city)) return { group: 'OUTSIDE_COVERAGE', status: null, detail: `${sl.name} is in ${sl.city}; you cover ${c.cities.join(', ')}` }
  if (c.verification !== 'VERIFIED') return { group: 'VERIFICATION_REQUIRED', status: null, detail: `Verification is ${c.verification.toLowerCase()}: only VERIFIED Couriers can apply or accept` }
  return rel?.declared ? { group: 'ELIGIBLE', status: null, detail: `Eligible to apply in ${sl.city}` } : { group: 'NO_OPPORTUNITY', status: null, detail: `${sl.name} has not declared a Courier opportunity` }
}
export const canApply = (w: World, s: SimState, courierId: string, sellerId: string) => classify(w, s, courierId, sellerId).group === 'ELIGIBLE'

/** Every Seller for one Courier, grouped. Pool memberships (a status) first by status order, then the pairs without one by group. */
export function poolsOf(w: World, s: SimState, courierId: string) {
  const rows = Object.keys(w.sellers).map(sellerId => ({ sellerId, relId: w.relationships[key(courierId, sellerId)]?.id ?? `${courierId}-${sellerId}`, ...classify(w, s, courierId, sellerId) }))
  const byStatus = (st: PoolStatus) => rows.filter(r => r.status === st)
  return { rows, byStatus, byGroup: (g: PoolGroup) => rows.filter(r => r.group === g) }
}

/** Relationship history (relationship_events plus this session's actions), oldest first. */
export const historyOf = (w: World, s: SimState, courierId: string, sellerId: string) => s.relEvents[w.relationships[key(courierId, sellerId)]?.id ?? ''] ?? []

export type Viewer = { role: 'COURIER' | 'SELLER' | 'BUYER' | 'PUBLIC' | 'OPERATOR'; id: string }
/** Private relationship rows: a Courier sees their own pairs, a Seller sees only pairs with a status for that Seller; nobody else sees any (never a Buyer or the public). */
export function visibleRelationships(w: World, s: SimState, viewer: Viewer) {
  const pairs = Object.values(w.relationships).map(r => ({ courierId: r.courierId, sellerId: r.sellerId, relId: r.id }))
  const mine = viewer.role === 'COURIER' ? pairs.filter(p => p.courierId === viewer.id) : viewer.role === 'SELLER' ? pairs.filter(p => p.sellerId === viewer.id && statusOf(s, p.courierId, p.sellerId)) : []
  return mine.map(p => ({ ...p, status: statusOf(s, p.courierId, p.sellerId), group: classify(w, s, p.courierId, p.sellerId).group }))
}
/** The per-relationship private note (current_note_private): readable only by the Courier it is about. */
export const privateNote = (w: World, viewer: Viewer, courierId: string, sellerId: string): string | null => (viewer.role === 'COURIER' && viewer.id === courierId ? w.relationships[key(courierId, sellerId)]?.note ?? null : null)

// ---------- actions ----------
const fail = (code: string, reason: string): Result => ({ ok: false, code, reason })
type RelAction = Extract<Action, { type: 'APPLY' | 'ACCEPT_INVITATION' | 'WITHDRAW' }>
const own = (a: Party, courierId: string) => a.role === 'COURIER' && a.id === courierId

function set(w: World, s: SimState, courierId: string, sellerId: string, status: PoolStatus | null, eventStatus: string, note: string): SimState {
  const relId = w.relationships[key(courierId, sellerId)].id
  return {
    ...s, relStatus: { ...s.relStatus, [key(courierId, sellerId)]: status },
    relEvents: { ...s.relEvents, [relId]: [...(s.relEvents[relId] ?? []), { status: eventStatus, at: isoAt(s.now), note, session: true }] },
  }
}

export function relationshipAction(w: World, s: SimState, a: RelAction): Result {
  if (a.actor.role !== 'COURIER' || !w.couriers[a.actor.id]) return fail('WRONG_PARTY', 'Only a Courier changes their own relationships')
  if (!w.sellers[a.sellerId] || !w.relationships[key(a.actor.id, a.sellerId)]) return fail('NO_SELLER', 'Unknown Seller')
  const courierId = a.actor.id, cl = classify(w, s, courierId, a.sellerId), name = w.sellers[a.sellerId].name
  if (a.type === 'APPLY') {
    if (cl.group === 'ELIGIBLE') return { ok: true, state: set(w, s, courierId, a.sellerId, 'APPLIED', 'APPLIED', 'Session action: application sent (simulation)'), note: `Application sent to ${name}. It stays pending: a Seller decision is not part of this prototype.` }
    if (cl.group === 'RELATIONSHIP') return fail('ALREADY_RELATED', `You already have a relationship with ${name} (${STATUS_LABEL[cl.status!].toLowerCase()}): you cannot apply again`)
    return fail(cl.group, `${GROUP_LABEL[cl.group]}: ${cl.detail}`)
  }
  if (a.type === 'ACCEPT_INVITATION') {
    if (cl.status !== 'INVITED') return fail('NOT_INVITED', `${name} has not invited you`)
    if (w.couriers[courierId].verification !== 'VERIFIED') return fail('NOT_VERIFIED', `Verification is ${w.couriers[courierId].verification.toLowerCase()}: only VERIFIED Couriers can accept an invitation`)
    if (w.sellers[a.sellerId].lifecycle !== 'ACTIVE') return fail('SELLER_INELIGIBLE', `${name} is ${w.sellers[a.sellerId].lifecycle.toLowerCase()} and cannot take Couriers`)
    return { ok: true, state: set(w, s, courierId, a.sellerId, 'APPROVED', 'APPROVED', 'Session action: invitation accepted (simulation)'), note: `Invitation accepted: you are an approved Courier for ${name}.` }
  }
  if (cl.status !== 'APPLIED') return fail('NOT_APPLIED', 'Only a pending application can be withdrawn')
  return { ok: true, state: set(w, s, courierId, a.sellerId, null, 'WITHDRAWN', 'Session action: application withdrawn (simulation)'), note: `Application to ${name} withdrawn.` }
}
