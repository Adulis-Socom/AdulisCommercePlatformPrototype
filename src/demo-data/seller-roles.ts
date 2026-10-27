// The Seller team's roles (refinement PR-007; ADU-AUTH-02 §§66–92). There are six: OWNER, from Seller ownership, and
// five assignable team roles: ADMIN and four peer specialists. A team member may hold several team roles, and their
// access is the union of those roles' capabilities, so no combination ever adds OWNER authority. Capabilities are
// grouped by business area and described by responsibility, not by permission codes or counts. This is a prototype
// model: no authorization backend or persistence.
import { STAFF, type StaffId, type SellerId } from './records/sellers.ts'

export type SellerRole = 'OWNER' | 'ADMIN' | 'SALES_SUPPORT' | 'INVENTORY' | 'ANALYST' | 'CAMPAIGN_MANAGER'
/** The roles a team membership can be given. OWNER never is: it comes from owning the Seller. */
export type TeamRole = Exclude<SellerRole, 'OWNER'>

export interface RoleInfo {
  readonly role: SellerRole
  readonly label: string
  readonly summary: string
  /** What the role can't do, in the Seller's words. */
  readonly limits: string
  /** Ownership, delegated administration, or one of the four peer specialists. */
  readonly kind: 'ownership' | 'administration' | 'specialist'
}

/** The six roles: Owner, Admin, then the four specialists, who are peers and listed alphabetically. */
export const SELLER_ROLES: readonly RoleInfo[] = [
  {
    role: 'OWNER', label: 'Owner', kind: 'ownership',
    summary: 'Full business control including ownership and Seller lifecycle, subject to Adulis domain rules.',
    limits: 'Comes from owning the Seller, not from a team role. Like every role, it can’t declare payments, set Trust, decide Claims, create handoff evidence, override Order rules or edit Buyer Reviews.',
  },
  {
    role: 'ADMIN', label: 'Admin', kind: 'administration',
    summary: 'Runs almost all Seller operations and administration except ownership transfer and Seller closure.',
    limits: 'Can’t transfer ownership, close the Seller or make anyone Owner.',
  },
  {
    role: 'ANALYST', label: 'Analyst', kind: 'specialist',
    summary: 'Read-only access to approved business analytics.',
    limits: 'Changes nothing: no Orders, Products, stock, Scenes, settings, team or finances. Sees summaries, not every private record.',
  },
  {
    role: 'CAMPAIGN_MANAGER', label: 'Campaign Manager', kind: 'specialist',
    summary: 'Manages Scenes/content, media, chatbot configuration and discovery/growth analytics.',
    limits: 'Can’t change Product prices, stock, Order states or fulfilment, the team, security, ownership or payment settings.',
  },
  {
    role: 'INVENTORY', label: 'Inventory', kind: 'specialist',
    summary: 'Manages Products, Variants, prices, stock, Order preparation and fulfilment.',
    limits: 'Can’t manage the team, ownership, payment settings, Seller security or the standing Courier pool, and has no general Inbox access.',
  },
  {
    role: 'SALES_SUPPORT', label: 'Sales Support', kind: 'specialist',
    summary: 'Handles Buyer messages, Order support, Claims and delivery/support issues.',
    limits: 'Can’t change Products, prices or stock, prepare Orders or Mark Ready, assign Couriers, create Scenes, or manage the team or security.',
  },
]

export const roleInfo = (role: SellerRole): RoleInfo => SELLER_ROLES.find(info => info.role === role)!
/** The roles Owner or Admin can assign or remove: every role except Owner. */
export const TEAM_ROLES: readonly TeamRole[] = SELLER_ROLES.filter(info => info.role !== 'OWNER').map(info => info.role as TeamRole)

/** The business areas capabilities are grouped in, in display order. */
export const ACCESS_AREAS = [
  'Orders & Fulfilment', 'Products & Inventory', 'Scenes & Content', 'Buyer Communication', 'Claims', 'Automation',
  'Analytics', 'Reviews & Trust', 'Store', 'Couriers', 'Team & Security', 'Seller Lifecycle',
] as const
export type AccessArea = typeof ACCESS_AREAS[number]

/** Manage: create, change and configure. Operate: carry out day-to-day work. Read: view only. */
export type AccessLevel = 'manage' | 'operate' | 'read'

export interface Capability {
  readonly area: AccessArea
  readonly level: AccessLevel
  readonly label: string
  /** The roles that have it. Owner and Admin have every capability except the Owner-only ones. */
  readonly roles: readonly SellerRole[]
  /** Transfer and closure: the Owner's alone, whatever team roles anyone holds. */
  readonly ownerOnly?: boolean
  /** How an Analytics capability is named where a role sees only part of Analytics. */
  readonly scope?: string
}

type Specialist = Exclude<TeamRole, 'ADMIN'>
const can = (area: AccessArea, level: AccessLevel, label: string, specialists: readonly Specialist[], scope?: string): Capability => ({ area, level, label, roles: ['OWNER', 'ADMIN', ...specialists], scope })
const ownerOnly = (label: string): Capability => ({ area: 'Seller Lifecycle', level: 'manage', label, roles: ['OWNER'], ownerOnly: true })

/** Every capability, by business area. Payment status is read-only for every role: no role confirms a payment. */
export const CAPABILITIES: readonly Capability[] = [
  can('Orders & Fulfilment', 'read', 'See Orders, their Products and quantities', ['SALES_SUPPORT', 'INVENTORY']),
  can('Orders & Fulfilment', 'read', 'See payment status from the payment provider', ['SALES_SUPPORT']),
  can('Orders & Fulfilment', 'read', 'See fulfilment and Courier delivery status', ['SALES_SUPPORT', 'INVENTORY']),
  can('Orders & Fulfilment', 'operate', 'Prepare paid Orders and Mark Ready', ['INVENTORY']),
  can('Orders & Fulfilment', 'operate', 'Choose fulfilment and assign an eligible Courier', ['INVENTORY']),
  can('Orders & Fulfilment', 'operate', 'Hand Orders over at the Seller pickup', ['INVENTORY']),
  can('Products & Inventory', 'read', 'See Products, Variants, prices and availability', ['SALES_SUPPORT', 'INVENTORY', 'CAMPAIGN_MANAGER']),
  can('Products & Inventory', 'manage', 'Create, edit, publish and archive Products', ['INVENTORY']),
  can('Products & Inventory', 'manage', 'Manage Variants and prices', ['INVENTORY']),
  can('Products & Inventory', 'manage', 'Manage Product photos', ['INVENTORY']),
  can('Products & Inventory', 'manage', 'Update stock and confirm it’s accurate', ['INVENTORY']),
  can('Scenes & Content', 'read', 'See Scenes and their status', ['CAMPAIGN_MANAGER']),
  can('Scenes & Content', 'manage', 'Create, edit, preview, publish and archive Scenes', ['CAMPAIGN_MANAGER']),
  can('Scenes & Content', 'manage', 'Tag Products and place hotspots', ['CAMPAIGN_MANAGER']),
  can('Scenes & Content', 'manage', 'Manage Scene media', ['CAMPAIGN_MANAGER']),
  can('Scenes & Content', 'operate', 'Respond to content moderation', ['CAMPAIGN_MANAGER']),
  can('Buyer Communication', 'read', 'Read Buyer conversations in the Seller Inbox', ['SALES_SUPPORT']),
  can('Buyer Communication', 'operate', 'Reply to Buyers', ['SALES_SUPPORT']),
  can('Buyer Communication', 'operate', 'Take over chatbot escalations', ['SALES_SUPPORT']),
  can('Claims', 'read', 'See Claims on the Seller’s Orders', ['SALES_SUPPORT']),
  can('Claims', 'operate', 'Respond to Claims and submit evidence', ['SALES_SUPPORT']),
  can('Claims', 'operate', 'Propose permitted remedies', ['SALES_SUPPORT']),
  can('Automation', 'read', 'See the chatbot’s setup', ['SALES_SUPPORT', 'CAMPAIGN_MANAGER']),
  can('Automation', 'manage', 'Configure and test the chatbot', ['CAMPAIGN_MANAGER']),
  can('Analytics', 'read', 'Seller performance overview', ['ANALYST'], 'overview'),
  can('Analytics', 'read', 'Scene performance and content-to-commerce', ['ANALYST', 'CAMPAIGN_MANAGER'], 'Scenes'),
  can('Analytics', 'read', 'Discovery and For You exposure', ['ANALYST', 'CAMPAIGN_MANAGER'], 'discovery'),
  can('Analytics', 'read', 'Product performance', ['ANALYST', 'INVENTORY'], 'Products'),
  can('Analytics', 'read', 'Inventory and fulfilment summaries', ['ANALYST', 'INVENTORY'], 'fulfilment'),
  can('Analytics', 'read', 'Chatbot analytics', ['ANALYST', 'CAMPAIGN_MANAGER'], 'chatbot'),
  can('Analytics', 'read', 'Claim, cancellation and response-quality summaries', ['ANALYST', 'SALES_SUPPORT'], 'service quality'),
  can('Reviews & Trust', 'read', 'Read Reviews, ratings and the Trust level', ['SALES_SUPPORT', 'INVENTORY', 'CAMPAIGN_MANAGER']),
  can('Reviews & Trust', 'read', 'See content moderation notices', ['CAMPAIGN_MANAGER']),
  can('Store', 'read', 'See the Store profile, location and fulfilment options', ['SALES_SUPPORT', 'INVENTORY']),
  can('Store', 'manage', 'Update the Store profile, location, fulfilment options and availability', []),
  can('Store', 'read', 'See verification, payment-provider and payout status', []),
  can('Store', 'manage', 'Change the settlement account', []),
  can('Couriers', 'read', 'See the Courier pool and Courier availability', ['INVENTORY']),
  can('Couriers', 'manage', 'Invite Couriers and review applications', []),
  can('Couriers', 'manage', 'Manage Courier relationships and compensation', []),
  can('Team & Security', 'read', 'See team members and their roles', []),
  can('Team & Security', 'manage', 'Invite and remove team members', []),
  can('Team & Security', 'manage', 'Assign and remove team roles (never Owner)', []),
  can('Team & Security', 'manage', 'See and end team sessions', []),
  ownerOnly('Transfer ownership'),
  ownerOnly('Close the Seller'),
]

/** What no role can do, the Owner included: these are Adulis's domain truth, not Seller permissions. */
export const NO_ROLE_CAN: readonly string[] = [
  'Declare a payment successful: payment status comes from the payment provider and Adulis',
  'Set, buy or upgrade a Trust level',
  'Decide a Claim: Adulis decides every Claim',
  'Create handoff evidence, or move an Order past the rules for its state',
  'Edit or delete a Buyer’s Review, or change a rating',
  'Act on another Seller’s records',
]

/** The capabilities a set of roles holds: the union of each role's. Team roles alone never include Owner-only ones. */
export function capabilitiesOf(roles: readonly SellerRole[]): Capability[] {
  return CAPABILITIES.filter(capability => roles.some(role => capability.roles.includes(role)))
}

const RANK: Record<AccessLevel, number> = { read: 1, operate: 2, manage: 3 }

/**
 * A role set's access to an area: its highest level there, or none; 'owner-only' for the Owner's lifecycle authority,
 * and 'not-permitted' for everyone else's. `scope` names a part of Analytics where the roles see only some of it.
 */
export function areaAccess(roles: readonly SellerRole[], area: AccessArea): { level: AccessLevel | 'none' | 'owner-only' | 'not-permitted'; scope?: string } {
  const all = CAPABILITIES.filter(capability => capability.area === area)
  const held = capabilitiesOf(roles).filter(capability => capability.area === area)
  if (all.every(capability => capability.ownerOnly)) return { level: held.length ? 'owner-only' : 'not-permitted' }
  if (!held.length) return { level: 'none' }
  const level = held.reduce<AccessLevel>((top, capability) => (RANK[capability.level] > RANK[top] ? capability.level : top), 'read')
  const partial = held.length < all.length && held.every(capability => capability.scope)
  return { level, scope: partial ? held.map(capability => capability.scope).join(', ') : undefined }
}

export type MemberStatus = 'Active' | 'Suspended' | 'Removed'

/** A Seller team member as Settings shows them: the Owner by ownership, or a member with their team roles. */
export interface TeamMember {
  readonly staff: StaffId
  readonly name: string
  readonly owner: boolean
  readonly roles: readonly TeamRole[]
  readonly status: MemberStatus
}

/**
 * The team roles DEMO_DATA's staff hold. DEMO_DATA records Abel Tadesse as "Operations" with its default permission
 * set; in the canonical model that is Inventory with Sales Support, which covers what the story has him do: prepare
 * Orders and hand them over at the Bole studio, and answer Buyers in the Inbox.
 */
const TEAM_ROLES_OF: Record<'Operations', readonly TeamRole[]> = { Operations: ['INVENTORY', 'SALES_SUPPORT'] }

/** The Seller's team: its Owner first, then its members, all Active (DEMO_DATA › Seller Console Settings). */
export function sellerTeam(seller: SellerId): TeamMember[] {
  return (Object.keys(STAFF) as StaffId[])
    .filter(id => STAFF[id].seller === seller)
    .map(id => {
      const { name, role } = STAFF[id]
      return role === 'Owner'
        ? { staff: id, name, owner: true, roles: [], status: 'Active' as const }
        : { staff: id, name, owner: false, roles: TEAM_ROLES_OF[role], status: 'Active' as const }
    })
    .sort((a, b) => Number(b.owner) - Number(a.owner))
}

/** A member's roles for access: OWNER for the Owner; a suspended or removed member's roles grant nothing. */
export function memberRoles(member: TeamMember): SellerRole[] {
  if (member.status !== 'Active') return []
  return member.owner ? ['OWNER'] : [...member.roles]
}
