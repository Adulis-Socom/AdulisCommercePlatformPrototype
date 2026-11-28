// COMP-002: the pure permission decision for a Seller team member acting in the Seller Companion or the Seller Console. No React, no clock, no
// storage: the same inputs always give the same answer, so tests can walk the matrix. It adds NO policy of its own beyond the documented gates:
//
//   1. Seller scope   the actor and the resource belong to the Seller being acted on (nothing crosses Sellers).
//   2. Membership     only ACTIVE members and the derived Owner relationship can act; INVITED, REVOKED and SUSPENDED cannot.
//   3. Role           the permission must be granted to one of the actor's roles by role_grants. A task assignment grants nothing.
//   4. Surface        administration permissions are Console-only (CONSOLE_ONLY); the Companion is the urgent-operations surface.
//   5. Mode           Order, Claim, payment and finance permissions exist only in the INTERNAL_SIMULATION (SIMULATION_ONLY); the MVP has none.
//   6. Lifecycle      a DRAFT or SUSPENDED Seller is read-only: reads pass, every other permission is refused.
//
// OWNER is derived from the ownership relationship and is never assignable; the decision takes whatever roles the member holds.
import { permissionsOfRoles, canAct, taskTargetSeller, type MembershipStatus, type Surface, type TaskRow, type TaskStatus } from './seller-ops.ts'
import type { Lifecycle } from './types.ts'

export type DecisionMode = 'MVP' | 'INTERNAL_SIMULATION'
export interface Actor { id: string; sellerId: string; roles: readonly string[]; status: MembershipStatus }
export interface Context { sellerId: string; lifecycle: Lifecycle; surface: Surface; mode: DecisionMode }
export type DenyCode = 'seller' | 'membership' | 'role' | 'surface' | 'mode' | 'lifecycle' | 'target' | 'assignee' | 'transition'
export type Decision = { allowed: true } | { allowed: false; code: DenyCode; permission?: string; message: string }

const allow: Decision = { allowed: true }
const deny = (code: DenyCode, message: string, permission?: string): Decision => ({ allowed: false, code, message, permission })

/** Permissions that are administration, authoring or standing configuration: they stay in the Seller Console. */
export const CONSOLE_ONLY: readonly RegExp[] = [
  /^seller\.team:(invite|roles_manage|remove)$/, /^seller\.sessions:/, /^seller\.ownership:/, /^seller\.lifecycle:/, /^seller\.finance:settlement_account_update$/,
  /^seller\.couriers:(invite|application_review|relationship_manage|compensation_update)$/, /^seller\.verification:submit$/,
  /^seller\.products:(write|publish|archive)$/, /^seller\.variants:write$/, /^seller\.pricing:write$/, /^seller\.product_media:manage$/,
  /^seller\.scene_posts:(write|publish|archive|tag_products)$/, /^seller\.content_media:manage$/, /^seller\.chatbot:(configure|test)$/,
]
/** Order, Claim, payment and finance permissions: the current MVP has no Orders, payment or Claims. */
export const SIMULATION_ONLY: readonly RegExp[] = [/^seller\.orders:/, /^seller\.claims:/, /^seller\.payments:/, /^seller\.finance:/]
export const isRead = (permission: string): boolean => /(:|_)read$/.test(permission)
export const isConsoleOnly = (permission: string): boolean => CONSOLE_ONLY.some(p => p.test(permission))
export const isSimulationOnly = (permission: string): boolean => SIMULATION_ONLY.some(p => p.test(permission))

const MEMBERSHIP_MESSAGE: Record<string, string> = {
  INVITED: 'This member has been invited but has not joined yet, so cannot act.',
  REVOKED: 'This membership was revoked, so the member cannot act.',
  SUSPENDED: 'This membership is suspended, so the member cannot act.',
}
const roleLabel = (roles: readonly string[]) => (roles.length ? roles.join(' + ').replace(/_/g, ' ').toLowerCase() : 'no role')

/** May `actor` use `permission` in `ctx`? The first gate that refuses names the reason (and the missing permission for a role refusal). */
export function decide(actor: Actor, permission: string, ctx: Context): Decision {
  if (actor.sellerId !== ctx.sellerId) return deny('seller', 'This member belongs to another Seller and cannot act on this one.', permission)
  if (!canAct(actor.status)) return deny('membership', MEMBERSHIP_MESSAGE[actor.status] ?? 'This membership cannot act.', permission)
  if (!permissionsOfRoles(actor.roles).has(permission)) return deny('role', `Not permitted for your role (${roleLabel(actor.roles)}). Missing permission: ${permission}.`, permission)
  if (ctx.surface === 'COMPANION' && isConsoleOnly(permission)) return deny('surface', `${permission} is managed in the Seller Console, not in the Companion.`, permission)
  if (ctx.mode === 'MVP' && isSimulationOnly(permission)) return deny('mode', `${permission} belongs to the internal simulation. The current MVP has no Orders, payment or Claims.`, permission)
  if (ctx.lifecycle !== 'ACTIVE' && !isRead(permission)) return deny('lifecycle', `This Seller is ${ctx.lifecycle.toLowerCase()}, so it is read-only until it is active.`, permission)
  return allow
}

/** Permission names the Companion gates on, in one place. */
export const PERMISSION = {
  viewProducts: 'seller.products:read', writeStock: 'seller.inventory:write', readInbox: 'seller.inbox:read', replyInbox: 'seller.inbox:reply',
  readTeam: 'seller.team:read', updateProfile: 'seller.store:profile_update', setAvailability: 'seller.store:availability_update', readStore: 'seller.store:read',
} as const

/** The task statuses the dataset has, and the moves between them: forward one step, or an in-progress task back to open. DONE is final; the dataset has no BLOCKED. */
export const TASK_NEXT: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = { OPEN: ['IN_PROGRESS'], IN_PROGRESS: ['DONE', 'OPEN'], DONE: [] }

const hasAdminRole = (actor: Actor) => actor.roles.includes('OWNER') || actor.roles.includes('ADMIN')

/**
 * May `actor` move `task` to `to`? Same gates as decide(), applied to the task: the task is in the actor's Seller and its target belongs to that
 * Seller; the actor can act; the task's mode and execution surface match; the actor themselves holds the task's required_permission (being assigned
 * grants nothing); only the assignee, or an Owner or Admin, updates it; the Seller is active; and the move is one the status flow allows.
 */
export function decideTask(actor: Actor, task: TaskRow, to: TaskStatus, ctx: Context): Decision {
  if (task.sellerId !== ctx.sellerId || actor.sellerId !== ctx.sellerId) return deny('seller', 'This task belongs to another Seller.')
  if (taskTargetSeller(task) !== task.sellerId) return deny('target', 'This task points at a record that is not this Seller’s, so it cannot be changed.')
  if (!canAct(actor.status)) return deny('membership', MEMBERSHIP_MESSAGE[actor.status] ?? 'This membership cannot act.')
  if (task.mode === 'INTERNAL_SIMULATION' && ctx.mode !== 'INTERNAL_SIMULATION') return deny('mode', 'This task belongs to the internal simulation.')
  if (task.surface !== ctx.surface) return deny('surface', task.surface === 'CONSOLE' ? 'This task is completed in the Seller Console.' : 'This task is completed in the Seller Companion.')
  if (!permissionsOfRoles(actor.roles).has(task.requiredPermission)) return deny('role', `Not permitted for your role (${roleLabel(actor.roles)}). Missing permission: ${task.requiredPermission}. Being assigned a task does not grant it.`, task.requiredPermission)
  if (actor.id !== task.assignee && !hasAdminRole(actor)) return deny('assignee', 'Only the assignee, an Admin or the Owner can update this task.')
  if (ctx.lifecycle !== 'ACTIVE') return deny('lifecycle', `This Seller is ${ctx.lifecycle.toLowerCase()}, so tasks are read-only.`)
  if (!TASK_NEXT[task.status].includes(to)) return deny('transition', `A ${task.status.replace('_', ' ').toLowerCase()} task cannot move to ${to.replace('_', ' ').toLowerCase()}.`)
  return allow
}

/** May `actor` post to the Seller's internal team thread? Any member who can act, while the Seller is active. */
export function decideMessage(actor: Actor, ctx: Context): Decision {
  if (actor.sellerId !== ctx.sellerId) return deny('seller', 'This member belongs to another Seller.')
  if (!canAct(actor.status)) return deny('membership', MEMBERSHIP_MESSAGE[actor.status] ?? 'This membership cannot act.')
  if (ctx.lifecycle !== 'ACTIVE') return deny('lifecycle', `This Seller is ${ctx.lifecycle.toLowerCase()}, so the team thread is read-only.`)
  return allow
}
