// COMP-001..003: the marketplace dataset's per-Seller operations records (teams, members, role grants, tasks, team messages, seller summary), typed and
// grouped. Plain TypeScript with no React, so Node can load it for the unit tests. Rows are exactly as supplied; nothing is invented or repaired.
import { INDEX, OPERATIONS } from './import.ts'
import type { Lifecycle, Mode, SrcTask, SrcTeam, SrcTeamMember, SrcTeamMessage } from './types.ts'

export type Role = 'OWNER' | 'ADMIN' | 'SALES_SUPPORT' | 'INVENTORY' | 'ANALYST' | 'CAMPAIGN_MANAGER'
export type MembershipStatus = 'OWNER_RELATIONSHIP' | 'ACTIVE' | 'INVITED' | 'REVOKED' | 'SUSPENDED'
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE'
export type TeamConfiguration = 'FULL_ROLE_COVERAGE' | 'PARTIAL_ROLE_COVERAGE' | 'OWNER_ONLY'
export type Surface = 'COMPANION' | 'CONSOLE'

export interface MemberRow { id: string; sellerId: string; name: string; username: string; owner: boolean; roles: Role[]; status: MembershipStatus; joined: string }
export interface TaskRow {
  id: string; sellerId: string; assignee: string; assignedBy: string; title: string; requiredPermission: string; targetType: 'SELLER' | 'PRODUCT' | 'SCENE'; targetId: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'; status: TaskStatus; due: string; mode: Mode; surface: Surface
}
export interface TeamMessageRow { id: string; sellerId: string; thread: string; sender: string; taskId: string | null; text: string; at: string; mode: Mode }
export interface SellerTeam { sellerId: string; configuration: TeamConfiguration; lifecycle: Lifecycle; members: MemberRow[]; tasks: TaskRow[]; messages: TeamMessageRow[] }

/** role -> permission codes, from role_grants (the only source of what a role can do). */
export const ROLE_GRANTS: Readonly<Record<string, ReadonlySet<string>>> = (() => {
  const out: Record<string, Set<string>> = {}
  for (const g of OPERATIONS.role_grants) (out[g.role_code] ??= new Set()).add(g.permission_code)
  return out
})()

/** The permissions a set of roles holds: the union of each role's grants. A task assignment adds nothing. */
export const permissionsOfRoles = (roles: readonly string[]): ReadonlySet<string> => new Set(roles.flatMap(r => [...(ROLE_GRANTS[r] ?? [])]))

const memberRow = (m: SrcTeamMember): MemberRow => ({
  id: m.member_id, sellerId: m.seller_id, name: m.display_name, username: m.username, owner: m.relationship_type === 'OWNERSHIP',
  roles: m.roles as Role[], status: m.membership_status as MembershipStatus, joined: (m as unknown as { joined_at: string }).joined_at,
})
const taskRow = (t: SrcTask): TaskRow => {
  const r = t as unknown as Record<string, string>
  return {
    id: t.task_id, sellerId: t.seller_id, assignee: t.assignee_id, assignedBy: t.assigned_by, title: t.title, requiredPermission: t.required_permission,
    targetType: r.target_type as TaskRow['targetType'], targetId: r.target_id, priority: r.priority as TaskRow['priority'], status: t.status as TaskStatus,
    due: r.due_date, mode: t.mode, surface: r.execution_surface as Surface,
  }
}
const messageRow = (m: SrcTeamMessage): TeamMessageRow => {
  const r = m as unknown as Record<string, string>
  return { id: m.message_id, sellerId: m.seller_id, thread: m.thread_id, sender: m.sender_member_id, taskId: m.task_id, text: r.text, at: r.sent_at, mode: m.mode }
}

const teams = new Map(OPERATIONS.teams.map(t => [t.seller_id, t as SrcTeam & { configuration: TeamConfiguration }]))

/** The Seller's team as the dataset states it, or undefined for an id that is not a marketplace Seller (the legacy dataset). */
export function teamOf(sellerId: string): SellerTeam | undefined {
  const team = teams.get(sellerId)
  if (!team) return undefined
  const members = (INDEX.membersBySeller.get(sellerId) ?? []).map(memberRow).sort((a, b) => Number(b.owner) - Number(a.owner) || a.id.localeCompare(b.id))
  return {
    sellerId, configuration: team.configuration, lifecycle: team.seller_lifecycle, members,
    tasks: (INDEX.tasksBySeller.get(sellerId) ?? []).map(taskRow),
    messages: OPERATIONS.team_messages.filter(m => m.seller_id === sellerId).map(messageRow).sort((a, b) => a.at.localeCompare(b.at)),
  }
}

/** The Seller a task's target belongs to (SELLER target: itself), or null when the target does not exist. Used to refuse a task that points outside its Seller. */
export function taskTargetSeller(task: Pick<TaskRow, 'targetType' | 'targetId'>): string | null {
  if (task.targetType === 'SELLER') return INDEX.seller.has(task.targetId) ? task.targetId : null
  if (task.targetType === 'PRODUCT') return INDEX.product.get(task.targetId)?.seller_id ?? null
  return INDEX.scene.get(task.targetId)?.seller_id ?? null
}

export interface SellerSummary {
  sellerId: string; followers: number; newFollowers: number; inquiries: number; responded: number; availableProducts: number; lowStockProducts: number; publicScenes: number
}
/** seller_summary for the Seller (the snapshot the dataset supplies), or undefined. */
export function summaryOf(sellerId: string): SellerSummary | undefined {
  const r = OPERATIONS.seller_summary.find(s => s.seller_id === sellerId) as Record<string, number> | undefined
  if (!r) return undefined
  return {
    sellerId, followers: r.followers_snapshot, newFollowers: r.current_new_followers, inquiries: r.current_inquiries, responded: r.current_responded,
    availableProducts: r.available_products, lowStockProducts: r.low_stock_products, publicScenes: r.public_scenes,
  }
}

export const CONFIGURATION_LABEL: Record<TeamConfiguration, string> = { FULL_ROLE_COVERAGE: 'Full team', PARTIAL_ROLE_COVERAGE: 'Partial team', OWNER_ONLY: 'Owner only' }
export const STATUS_LABEL: Record<MembershipStatus, string> = { OWNER_RELATIONSHIP: 'Owner', ACTIVE: 'Active', INVITED: 'Invited', REVOKED: 'Revoked', SUSPENDED: 'Suspended' }
/** Only these memberships can act. Invited, revoked and suspended members cannot. */
export const canAct = (status: MembershipStatus): boolean => status === 'ACTIVE' || status === 'OWNER_RELATIONSHIP'
