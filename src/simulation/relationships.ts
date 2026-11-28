// COURIER-002 (FR-006): Courier / Seller relationships on the supplied 115 relationship_and_eligibility rows. Pure TypeScript (no React, storage or clock).
// A null relationship_status is NOT a pool membership: it is classified as an opportunity, an outside-coverage pair, a verification requirement or an
// ineligible Seller. Relationship status changes (Apply, Accept invitation, Withdraw) are session actions folded over the seed; the seed is never mutated.
import { isoAt } from './clock.ts'
import { decide } from '../marketplace/permissions.ts'
import type { Lifecycle } from '../marketplace/types.ts'
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

// ---------- Seller-side decisions (DEMO-002, OB-12) ----------
// A Seller's team member approves or rejects an application, invites a Courier, suspends, reinstates or removes one. Each is a session action over the seed. The
// member is checked by the same pure permission model the Companion uses (role grants, membership status, Seller lifecycle); the Courier's own rules still apply
// (only a VERIFIED Courier is approved, invited or reinstated, and an invitation needs the Courier to cover the Seller's city). A change takes effect at once:
// canReceiveOffers() reads the same relationship status, so an approved Courier is eligible and a suspended or removed one is not.
export const SELLER_OPS = ['APPROVE', 'REJECT', 'INVITE', 'SUSPEND', 'REINSTATE', 'REMOVE'] as const
export type SellerCourierOp = (typeof SELLER_OPS)[number]
export const OP_PERMISSION: Record<SellerCourierOp, string> = {
  APPROVE: 'seller.couriers:application_review', REJECT: 'seller.couriers:application_review', INVITE: 'seller.couriers:invite',
  SUSPEND: 'seller.couriers:relationship_manage', REINSTATE: 'seller.couriers:relationship_manage', REMOVE: 'seller.couriers:relationship_manage',
}
export const OP_LABEL: Record<SellerCourierOp, string> = { APPROVE: 'Approve', REJECT: 'Reject', INVITE: 'Invite', SUSPEND: 'Suspend', REINSTATE: 'Reinstate', REMOVE: 'Remove' }
type SellerAction = Extract<Action, { type: 'SELLER_COURIER' }>
/** Which operations make sense for a relationship status (the Seller Console offers exactly these). A null status can only be invited. */
export const opsFor = (status: PoolStatus | null): SellerCourierOp[] =>
  status === 'APPLIED' ? ['APPROVE', 'REJECT'] : status === 'APPROVED' ? ['SUSPEND', 'REMOVE'] : status === 'SUSPENDED' ? ['REINSTATE', 'REMOVE'] : status === null || status === 'REJECTED' || status === 'REMOVED' ? ['INVITE'] : []

export function sellerCourierAction(w: World, s: SimState, a: SellerAction): Result {
  const sellerId = a.actor.id, seller = w.sellers[sellerId], courier = w.couriers[a.courierId], member = w.members[a.member]
  if (a.actor.role !== 'SELLER' || !seller) return fail('WRONG_PARTY', 'Only a Seller manages its own Courier relationships')
  if (!courier || !w.relationships[key(a.courierId, sellerId)]) return fail('NO_COURIER', 'Unknown Courier')
  if (!member) return fail('NO_MEMBER', 'Choose a team member to act as')
  const verdict = decide({ id: member.id, sellerId: member.sellerId, roles: member.roles, status: member.status as never }, OP_PERMISSION[a.op], { sellerId, lifecycle: seller.lifecycle as Lifecycle, surface: 'CONSOLE', mode: 'MVP' })
  if (!verdict.allowed) return fail(`DENIED_${verdict.code.toUpperCase()}`, verdict.message)
  const status = statusOf(s, a.courierId, sellerId), who = courier.name
  const verified = courier.verification === 'VERIFIED'
  const go = (to: PoolStatus, text: string, ev = to as string): Result => ({ ok: true, state: set(w, s, a.courierId, sellerId, to, ev, `Session action: ${text} (simulation)`), note: text })
  if (a.op === 'APPROVE' || a.op === 'REJECT') {
    if (status !== 'APPLIED') return fail('NOT_APPLIED', `${who} has no pending application to ${seller.name}`)
    if (a.op === 'REJECT') return go('REJECTED', `${who}'s application rejected`)
    if (!verified) return fail('NOT_VERIFIED', `Verification is ${courier.verification.toLowerCase()}: only a VERIFIED Courier can be approved`)
    return go('APPROVED', `${who} approved: now an approved Courier for ${seller.name}`)
  }
  if (a.op === 'INVITE') {
    if (status === 'APPROVED' || status === 'INVITED' || status === 'SUSPENDED') return fail('ALREADY_RELATED', `${who} already has a relationship with ${seller.name} (${STATUS_LABEL[status].toLowerCase()})`)
    if (status === 'APPLIED') return fail('ALREADY_APPLIED', `${who} has applied: review the application instead of inviting`)
    if (!verified) return fail('NOT_VERIFIED', `Verification is ${courier.verification.toLowerCase()}: only a VERIFIED Courier can be invited`)
    if (!courier.cities.includes(seller.city)) return fail('OUTSIDE_COVERAGE', `${who} covers ${courier.cities.join(', ')}, not ${seller.city}`)
    return go('INVITED', `${who} invited`)
  }
  if (a.op === 'SUSPEND') return status === 'APPROVED' ? go('SUSPENDED', `${who} suspended: no offers from ${seller.name}`) : fail('NOT_APPROVED', 'Only an approved Courier can be suspended')
  if (a.op === 'REINSTATE') {
    if (status !== 'SUSPENDED') return fail('NOT_SUSPENDED', 'Only a suspended Courier can be reinstated')
    return verified ? go('APPROVED', `${who} reinstated`) : fail('NOT_VERIFIED', `Verification is ${courier.verification.toLowerCase()}: only a VERIFIED Courier can be reinstated`)
  }
  return status === 'APPROVED' || status === 'SUSPENDED' ? go('REMOVED', `${who} removed from ${seller.name}'s Couriers`) : fail('NOT_IN_POOL', 'Only an approved or suspended Courier can be removed')
}

/** The Couriers a Seller does not currently work with (no status, rejected or removed), each with whether an invitation would be accepted and why not. */
export function inviteCandidates(w: World, s: SimState, sellerId: string) {
  const seller = w.sellers[sellerId]
  return Object.values(w.couriers).filter(c => { const st = statusOf(s, c.id, sellerId); return st === null || st === 'REJECTED' || st === 'REMOVED' }).map(c => ({
    courierId: c.id, status: statusOf(s, c.id, sellerId),
    blocker: c.verification !== 'VERIFIED' ? `Verification ${c.verification.toLowerCase()}` : !c.cities.includes(seller.city) ? `Covers ${c.cities.join(', ')}, not ${seller.city}` : null,
  }))
}
