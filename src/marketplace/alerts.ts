// COMP-001: the Companion's alert priority rules, pure (no React, no storage, no clock: "today" is passed in). Alerts are built only from records
// the caller reads for the selected Seller; this module decides which become alerts, their priority and where each one opens.
//
// Priority (the documented thresholds; none is commercial policy):
//   critical  the Seller is SUSPENDED; (simulation only) a delivery failed, or a Scene is restricted by moderation.
//   high      a published Product is out of stock; a published Scene is Private because its tagged Products are unavailable; the Seller is DRAFT (setup
//             open); a Buyer is waiting for a reply; a team task is overdue, or due within TASK_DUE_SOON_DAYS and HIGH priority;
//             (simulation only) a new paid Order, or a handoff, needs the Seller.
//   routine   a published Product is low (1..LOW_STOCK_AT, the app's existing threshold); a public Scene has some unavailable tags; a team task is due
//             within TASK_DUE_SOON_DAYS (not HIGH); a live Story has STORY_EXPIRING_HOURS or fewer left; (simulation only) a Courier offer is pending.
//   info      activity, not work: Followers, the response rate, live Stories, finished tasks. Always its own section.
// A DRAFT or SUSPENDED Seller gets no stock, Scene, Story or Inbox alerts (it is not selling); it gets its lifecycle alert, its tasks and its activity.
// Orders, delivery, handoff and moderation inputs are read only when `simulation` is true: the current MVP never produces them.

/** The app's existing "low stock" threshold (seller-workspace re-exports it): 1 to 3 units. */
export const LOW_STOCK_AT = 3
/** A live Story with this many hours or fewer left is "expiring" (a display threshold; Stories live 24 hours). */
export const STORY_EXPIRING_HOURS = 6
/** A task due within this many days of today is "due soon". */
export const TASK_DUE_SOON_DAYS = 1

export type Priority = 'critical' | 'high' | 'routine' | 'info'
export const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, routine: 2, info: 3 }
export type Destination =
  | { type: 'product'; id: string } | { type: 'scene'; id: string } | { type: 'inbox'; id?: string } | { type: 'task'; id: string }
  | { type: 'order'; id: string } | { type: 'profile' } | { type: 'story'; id: string } | { type: 'none' }
export interface Alert { id: string; kind: string; priority: Priority; title: string; detail: string; dest: Destination; action?: string }

export interface AlertInput {
  sellerId: string
  lifecycle: 'ACTIVE' | 'DRAFT' | 'SUSPENDED'
  simulation: boolean
  /** YYYY-MM-DD of the story clock. */
  today: string
  /** Open setup steps (readiness problems) for a DRAFT Seller. */
  setupOpen?: readonly string[]
  products: readonly { id: string; name: string; stock: number; published: boolean }[]
  scenes: readonly { id: string; title: string; status: 'published' | 'draft' | 'archived'; visibility: 'public' | 'private' | 'restricted' | 'draft' | 'archived'; tags: number; availableTags: number; restrictedReason?: string }[]
  /** Buyers waiting for the Seller's reply (thread id optional when the thread is a live assistant conversation). */
  inbox: readonly { id: string; buyer: string; text: string }[]
  stories: readonly { id: string; text: string; hoursLeft: number }[]
  tasks: readonly { id: string; title: string; due: string; status: 'OPEN' | 'IN_PROGRESS' | 'DONE'; priority: 'HIGH' | 'MEDIUM' | 'LOW'; assignee: string }[]
  summary?: { followers: number; newFollowers: number; inquiries: number; responded: number }
  /** Simulation only. */
  orders?: readonly { id: string; kind: 'new_order' | 'handoff' | 'delivery_failed' | 'offer_pending'; title: string; detail: string }[]
  /** Simulation only: moderation items (a Scene restricted, a Courier comment held for review). */
  moderation?: readonly { id: string; title: string; detail: string }[]
}

const dayMs = 86400000
/** Whole days from `today` to `due` (negative when overdue). */
export const daysUntil = (due: string, today: string): number => Math.round((Date.parse(due.slice(0, 10)) - Date.parse(today.slice(0, 10))) / dayMs)

export const stockLevel = (stock: number): 'out' | 'low' | 'ok' => (stock <= 0 ? 'out' : stock <= LOW_STOCK_AT ? 'low' : 'ok')

/** Every alert for the Seller, most important first (priority, then the order the inputs came in). Pure: the same input always gives the same list. */
export function buildAlerts(input: AlertInput): Alert[] {
  const out: Alert[] = []
  const add = (a: Alert) => out.push(a)
  const selling = input.lifecycle === 'ACTIVE'

  if (input.lifecycle === 'SUSPENDED') add({ id: 'seller:suspended', kind: 'seller_suspended', priority: 'critical', title: 'Store suspended', detail: 'Your store is hidden from Buyers and the team is read-only until Adulis lifts the suspension.', dest: { type: 'profile' }, action: 'View' })
  if (input.lifecycle === 'DRAFT') add({ id: 'seller:draft', kind: 'seller_draft', priority: 'high', title: 'Store not live yet', detail: input.setupOpen?.length ? `${input.setupOpen.length} setup step${input.setupOpen.length === 1 ? '' : 's'} open: ${input.setupOpen[0]}` : 'Finish setup in the Seller Console to go live.', dest: { type: 'profile' }, action: 'View' })

  if (selling) {
    for (const p of input.products) {
      if (!p.published) continue
      const level = stockLevel(p.stock)
      if (level === 'out') add({ id: `product:out:${p.id}`, kind: 'out_of_stock', priority: 'high', title: 'Out of stock', detail: `${p.name} is hidden from Buyers until it is restocked.`, dest: { type: 'product', id: p.id }, action: 'Restock' })
      else if (level === 'low') add({ id: `product:low:${p.id}`, kind: 'low_stock', priority: 'routine', title: 'Low stock', detail: `${p.name} · ${p.stock} left`, dest: { type: 'product', id: p.id }, action: 'Review' })
    }
    for (const s of input.scenes) {
      if (s.status !== 'published') continue
      if (s.visibility === 'private') add({ id: `scene:private:${s.id}`, kind: 'scene_private', priority: 'high', title: 'Scene is Private', detail: `${s.title} · ${s.availableTags} of ${s.tags} tagged Products available`, dest: { type: 'scene', id: s.id }, action: 'Review' })
      else if (s.visibility === 'public' && s.availableTags < s.tags) add({ id: `scene:tags:${s.id}`, kind: 'scene_tags', priority: 'routine', title: 'Scene tag unavailable', detail: `${s.title} · ${s.tags - s.availableTags} tagged Product${s.tags - s.availableTags === 1 ? '' : 's'} unavailable`, dest: { type: 'scene', id: s.id }, action: 'Review' })
    }
    for (const t of input.inbox) add({ id: `inbox:${t.id}`, kind: 'buyer_waiting', priority: 'high', title: 'Buyer is waiting', detail: `${t.buyer} · ${t.text}`, dest: { type: 'inbox', id: t.id }, action: 'Reply' })
    for (const s of input.stories) if (s.hoursLeft <= STORY_EXPIRING_HOURS) add({ id: `story:${s.id}`, kind: 'story_expiring', priority: 'routine', title: 'Story expiring', detail: `${s.text} · ${Math.max(0, Math.round(s.hoursLeft))} h left`, dest: { type: 'story', id: s.id }, action: 'View' })
  }

  for (const t of input.tasks) {
    if (t.status === 'DONE') continue
    const days = daysUntil(t.due, input.today)
    if (days < 0) add({ id: `task:${t.id}`, kind: 'task_overdue', priority: 'high', title: 'Task overdue', detail: `${t.title} · ${t.assignee} · was due ${t.due}`, dest: { type: 'task', id: t.id }, action: 'Open' })
    else if (days <= TASK_DUE_SOON_DAYS) add({ id: `task:${t.id}`, kind: 'task_due', priority: t.priority === 'HIGH' ? 'high' : 'routine', title: days === 0 ? 'Task due today' : 'Task due tomorrow', detail: `${t.title} · ${t.assignee}`, dest: { type: 'task', id: t.id }, action: 'Open' })
  }

  if (input.simulation) {
    for (const o of input.orders ?? []) add({ id: `order:${o.id}`, kind: o.kind, priority: o.kind === 'delivery_failed' ? 'critical' : o.kind === 'offer_pending' ? 'routine' : 'high', title: o.title, detail: o.detail, dest: { type: 'order', id: o.id }, action: 'Open' })
    for (const m of input.moderation ?? []) add({ id: `moderation:${m.id}`, kind: 'moderation', priority: 'critical', title: m.title, detail: m.detail, dest: { type: 'none' } })
    if (selling) for (const s of input.scenes) if (s.visibility === 'restricted') add({ id: `scene:restricted:${s.id}`, kind: 'scene_restricted', priority: 'critical', title: 'Scene restricted', detail: `${s.title} · ${s.restrictedReason ?? 'moderation restriction'}`, dest: { type: 'scene', id: s.id }, action: 'Review' })
  }

  const sm = input.summary
  if (sm) {
    add({ id: 'info:followers', kind: 'followers', priority: 'info', title: `${sm.followers.toLocaleString('en-US')} followers`, detail: `${sm.newFollowers} new this period`, dest: { type: 'none' } })
    add({ id: 'info:response', kind: 'response', priority: 'info', title: 'Buyer inquiries', detail: `${sm.responded} of ${sm.inquiries} answered this period`, dest: { type: 'inbox' } })
  }
  if (selling && input.stories.length) add({ id: 'info:stories', kind: 'stories', priority: 'info', title: `${input.stories.length} live Stor${input.stories.length === 1 ? 'y' : 'ies'}`, detail: input.stories.map(s => `${Math.max(0, Math.round(s.hoursLeft))} h left`).join(' · '), dest: { type: 'none' } })
  const done = input.tasks.filter(t => t.status === 'DONE').length
  if (done) add({ id: 'info:tasks', kind: 'tasks_done', priority: 'info', title: `${done} task${done === 1 ? '' : 's'} finished`, detail: 'Completed by the team', dest: { type: 'none' } })

  return out.map((a, i) => ({ a, i })).sort((x, y) => PRIORITY_RANK[x.a.priority] - PRIORITY_RANK[y.a.priority] || x.i - y.i).map(x => x.a)
}

/** Alerts that need the Seller (critical, high, routine) and are neither read nor dismissed: the tab badge. */
export const unreadCount = (alerts: readonly Alert[], read: readonly string[], dismissed: readonly string[]): number =>
  alerts.filter(a => a.priority !== 'info' && !read.includes(a.id) && !dismissed.includes(a.id)).length
