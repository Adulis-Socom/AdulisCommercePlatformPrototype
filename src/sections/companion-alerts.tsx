import { useMemo, useState } from 'react'
import {
  BUYERS, CONVERSATIONS, CONVERSATION_IDS, effectiveMessagesAt, hasAvailableProductAt, restrictionAt, sellerPostsAt, sessionStaffOn, shortName, storiesAt,
  type Moment, type SellerId,
} from '../demo-data'
import { LIVE_POSTS, LIVE_PRODUCTS } from '../demo-data/live'
import { defaultSetup, linkableProducts, productAvailableNow, readiness, sceneVisibility, stockState, storyPhase, useWorkspace, type WorkspaceState } from '../seller-workspace'
import { buildAlerts, unreadCount, type Alert, type AlertInput, type Destination } from '../marketplace/alerts'
import { teamOf, summaryOf } from '../marketplace/seller-ops'
import { isLegacy } from '../marketplace/registry'
import { companionActions, useCompanionSession } from '../companion-session'
import { keyFor, liveAsRecords, seededThreadOf } from '../chatbot/thread'
import { useSim } from '../simulation/store'
import { MODE_LABEL, ordersOfSeller, pendingOffers, type Status } from '../simulation/orders'
import { partyName } from '../simulation/ui'
import { isPending } from '../simulation/feedback'
import { useSellerActions } from '../simulation/surfaces'

const NONE: { alerts: Alert[]; unread: number; stories: AlertInput['stories'] } = { alerts: [], unread: 0, stories: [] }
const ORDER_KIND: Partial<Record<Status, 'new_order' | 'handoff' | 'delivery_failed'>> = {
  PAID: 'new_order', PREPARING: 'new_order', READY_FOR_DELIVERY: 'new_order', READY_FOR_COLLECTION: 'handoff', COURIER_ASSIGNED: 'handoff', OUT_FOR_DELIVERY: 'handoff', DELIVERY_FAILED: 'delivery_failed',
}

/**
 * COMP-001: the selected Seller's alerts, built from the dataset's records (catalogue stock, Scenes, the Inbox, Stories, team tasks, the Seller's lifecycle) and,
 * in the internal simulation only, the shared simulation store (Orders, delivery, Courier offers, held Courier comments). The priority rules are the pure
 * module marketplace/alerts.ts. Marketplace dataset only: the legacy Companion keeps its own Alerts.
 */
export function useCompanionAlerts(sellerId: SellerId, at: Moment, simulation: boolean): { alerts: Alert[]; unread: number; stories: AlertInput['stories'] } {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- isLegacy is a module constant, so the hook order never changes
  const result = isLegacy ? null : useAlertsInner(sellerId, at, simulation)
  return result ?? NONE
}

function useAlertsInner(sellerId: SellerId, at: Moment, simulation: boolean) {
  const { state: ws } = useWorkspace()
  const session = useCompanionSession()
  const { sim } = useSim()
  const actions = useSellerActions(sellerId)
  const seller = lifecycleOf(sellerId)
  const team = teamOf(sellerId)
  const staffId = sessionStaffOn(sellerId, 'Seller Companion') ?? ('STF-AA-01' as never)
  const own = session.alerts[sellerId] ?? { read: [], dismissed: [] }

  const input = useMemo<AlertInput>(() => {
    const products = linkableProducts(ws, sellerId, at, true).map(p => ({ id: p.id, name: p.name, stock: p.stock, published: true }))
    const msOf = (id: keyof typeof CONVERSATIONS) => effectiveMessagesAt(id, at, liveAsRecords(ws.chats[keyFor(id)], staffId, at)).filter(m => simulation || !('order' in m.context))
    const waiting: { id: string; buyer: string; text: string }[] = CONVERSATION_IDS.filter(id => CONVERSATIONS[id].seller === sellerId).flatMap(id => {
      const last = msOf(id).at(-1)
      return last && last.from === 'buyer' ? [{ id, buyer: shortName(BUYERS[CONVERSATIONS[id].buyer].name), text: last.text }] : []
    })
    for (const c of Object.values(ws.chats)) {
      const thread = seededThreadOf(c)
      if (c.sellerId !== sellerId || !c.waiting || (thread && waiting.some(w => w.id === thread))) continue
      waiting.push({ id: thread ?? c.key, buyer: shortName(BUYERS[c.buyerId as keyof typeof BUYERS]?.name ?? 'Buyer'), text: c.messages.at(-1)?.text ?? '' })
    }
    const stories = [
      ...storiesAt(at).filter(s => s.seller === sellerId).map(s => ({ id: s.id as string, text: s.text, hoursLeft: (Date.parse(s.expires) - Date.parse(at.at)) / 3600000 })),
      ...Object.values(ws.stories).filter(s => s.seller === sellerId).flatMap(s => { const p = storyPhase(s, ws, at); return p.phase === 'live' ? [{ id: s.id, text: s.text || 'Story', hoursLeft: p.hoursLeft }] : [] }),
    ]
    const names = new Map(team?.members.map(m => [m.id, m.name.split(' ')[0]]))
    const tasks = (team?.tasks ?? []).filter(t => simulation || t.mode !== 'INTERNAL_SIMULATION').map(t => ({ id: t.id, title: t.title, due: t.due, status: session.tasks[t.id] ?? t.status, priority: t.priority, assignee: names.get(t.assignee) ?? t.assignee }))
    const published = products.length
    const setupOpen = seller === 'DRAFT' ? readiness(ws.setup[sellerId] ?? defaultSetup(sellerId), published).flatMap(i => i.problems) : []
    const orders = simulation ? [
      ...actions.map(({ order, text }) => ({ id: order.id, kind: ORDER_KIND[order.status] ?? 'new_order', title: text, detail: `${order.id} · ${MODE_LABEL[order.mode]} · ${partyName(order.buyerId)}` })),
      ...ordersOfSeller(sim, sellerId).filter(o => pendingOffers(sim, o.id).length).map(o => ({ id: o.id, kind: 'offer_pending' as const, title: 'Delivery offer pending', detail: `${o.id} · waiting for a Courier to accept` })),
    ] : []
    const moderation = simulation ? Object.values(sim.comments).filter(c => c.sellerId === sellerId && isPending(c)).map(c => ({ id: c.id, title: 'Courier comment held for review', detail: `${c.orderId} · ${c.topic.toLowerCase()}` })) : []
    return { sellerId, lifecycle: seller, simulation, today: at.at.slice(0, 10), setupOpen, products, scenes: sceneStates(ws, sellerId, at), inbox: waiting, stories, tasks, summary: summaryOf(sellerId), orders, moderation }
  }, [ws, sellerId, at, simulation, session.tasks, seller, sim, actions, staffId, team])

  const alerts = useMemo(() => buildAlerts(input), [input])
  return { alerts, unread: unreadCount(alerts, own.read, own.dismissed), stories: input.stories }
}

/** The Seller's Scenes (dataset and authored) as the alert rules read them: publication, effective visibility and how many tagged Products are available now. */
export function sceneStates(ws: WorkspaceState, sellerId: SellerId, at: Moment): AlertInput['scenes'][number][] {
  const seeded = sellerPostsAt(sellerId, at).map(id => {
    const p = LIVE_POSTS[id]
    const available = p.tags.filter(t => hasAvailableProductAt([t], at)).length
    const restricted = p.restricted?.reason ?? (restrictionAt(id, at) ? 'moderation case' : undefined)
    const status = p.publication === 'Published' ? 'published' : p.publication === 'Archived' ? 'archived' : 'draft'
    const visibility = status !== 'published' ? status : restricted ? 'restricted' : p.tags.length > 0 && available === 0 ? 'private' : 'public'
    return { id, title: p.title, status, visibility, tags: p.tags.length, availableTags: available, restrictedReason: restricted } as AlertInput['scenes'][number]
  })
  const authored = Object.values(ws.scenes).filter(s => s.seller === sellerId).map(s => ({
    id: s.id, title: s.caption || 'Scene', status: s.status, visibility: sceneVisibility(s, ws, at), tags: s.tags.length,
    availableTags: s.tags.filter(t => productAvailableNow(ws, t.product, sellerId, at)).length, restrictedReason: s.restricted?.reason,
  }) as AlertInput['scenes'][number])
  return [...seeded, ...authored]
}

/** The Seller's lifecycle (the dataset's; DRAFT and SUSPENDED Sellers are inspectable here). */
function lifecycleOf(sellerId: SellerId): 'ACTIVE' | 'DRAFT' | 'SUSPENDED' {
  return teamOf(sellerId)?.lifecycle ?? 'ACTIVE'
}

const PRIORITY_STYLE = {
  critical: { card: 'border-danger bg-danger-bg', dot: 'bg-danger', label: 'Critical', text: 'text-danger' },
  high: { card: 'border-warning bg-warning-bg', dot: 'bg-warning', label: 'High priority', text: 'text-warning' },
} as const

/** Critical and high alerts as prominent cards, routine ones as compact rows, activity in its own section. Each actionable alert opens its destination. */
export function AlertsHub({ sellerId, alerts, onOpen }: { sellerId: SellerId; alerts: readonly Alert[]; onOpen: (alert: Alert) => void }) {
  const session = useCompanionSession()
  const [showDismissed, setShowDismissed] = useState(false)
  const own = session.alerts[sellerId] ?? { read: [], dismissed: [] }
  const visible = alerts.filter(a => showDismissed || !own.dismissed.includes(a.id))
  const hiddenCount = alerts.filter(a => own.dismissed.includes(a.id)).length
  const prominent = visible.filter(a => a.priority === 'critical' || a.priority === 'high')
  const routine = visible.filter(a => a.priority === 'routine')
  const info = visible.filter(a => a.priority === 'info')
  const isRead = (id: string) => own.read.includes(id)
  const open = (a: Alert) => { companionActions.markRead(sellerId, [a.id]); onOpen(a) }
  return (
    <div data-alerts-hub>
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Needs attention</span><span data-alert-count className="text-xs text-text-muted">{prominent.filter(a => !isRead(a.id)).length} open</span></div>
      <div className="flex flex-col gap-3 px-4">
        {prominent.length === 0 && <p className="text-sm text-text-muted">Nothing urgent right now.</p>}
        {prominent.map(a => {
          const style = PRIORITY_STYLE[a.priority as 'critical' | 'high']
          const actionable = a.dest.type !== 'none'
          return (
            <article key={a.id} data-alert={a.id} data-priority={a.priority} data-read={isRead(a.id) ? 'true' : undefined} className={`overflow-hidden rounded-2xl border ${style.card} ${isRead(a.id) ? 'opacity-70' : ''}`}>
              <button type="button" onClick={() => open(a)} disabled={!actionable} {...(a.kind === 'new_order' || a.kind === 'handoff' || a.kind === 'delivery_failed' ? { 'data-order-alert': a.id.replace('order:', '') } : {})} className="flex w-full items-start gap-3 px-4 pb-3 pt-3 text-left">
                <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${style.dot}`} />
                <span className="min-w-0 flex-1"><span className={`block text-[10px] font-semibold uppercase tracking-wider ${style.text}`}>{style.label}</span><span className="mt-0.5 block font-display text-base font-semibold text-text-primary">{a.title}</span><span className="mt-0.5 block text-xs text-text-secondary">{a.detail}</span></span>
                {a.action && actionable && <span className="mt-1 flex-shrink-0 text-xs font-semibold text-brand-text">{a.action}</span>}
              </button>
              <div className="flex border-t border-border/60 text-xs font-semibold text-text-secondary">
                <button type="button" onClick={() => companionActions.markRead(sellerId, [a.id])} disabled={isRead(a.id)} aria-label={`Mark as read: ${a.title}`} className="min-h-10 flex-1 disabled:opacity-50">{isRead(a.id) ? 'Read' : 'Mark as read'}</button>
                <button type="button" onClick={() => companionActions.dismiss(sellerId, a.id)} aria-label={`Dismiss: ${a.title}`} className="min-h-10 flex-1 border-l border-border/60">Dismiss</button>
              </div>
            </article>
          )
        })}
      </div>
      <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Routine</div>
      {routine.length === 0 && <p className="px-4 text-sm text-text-muted">No routine alerts.</p>}
      <ul>
        {routine.map(a => (
          <li key={a.id} data-alert={a.id} data-priority="routine" data-read={isRead(a.id) ? 'true' : undefined} className={`flex items-center border-b border-border ${isRead(a.id) ? 'opacity-60' : ''}`}>
            <button type="button" onClick={() => open(a)} disabled={a.dest.type === 'none'} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left">
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-info" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{a.title}</span><span className="block truncate text-xs text-text-secondary">{a.detail}</span></span>
            </button>
            <button type="button" onClick={() => companionActions.markRead(sellerId, [a.id])} disabled={isRead(a.id)} aria-label={`Mark as read: ${a.title}`} className="h-11 w-11 flex-shrink-0 text-sm text-text-secondary disabled:opacity-40">✓</button>
            <button type="button" onClick={() => companionActions.dismiss(sellerId, a.id)} aria-label={`Dismiss: ${a.title}`} className="h-11 w-11 flex-shrink-0 text-lg text-text-secondary">×</button>
          </li>
        ))}
      </ul>
      <div className="px-4 pb-2 pt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Activity</div>
      <ul data-alerts-activity className="px-4 pb-4">
        {info.length === 0 && <li className="text-sm text-text-muted">No recent activity.</li>}
        {info.map(a => <li key={a.id} data-alert={a.id} data-priority="info" className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"><span className="text-sm font-semibold">{a.title}</span><span className="text-right text-xs text-text-muted">{a.detail}</span></li>)}
      </ul>
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between gap-2 px-4 pb-6 text-xs text-text-muted">
          <span>{hiddenCount} dismissed alert{hiddenCount === 1 ? '' : 's'}</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setShowDismissed(v => !v)} aria-pressed={showDismissed} className="min-h-9 rounded-lg border border-border px-3 font-semibold">{showDismissed ? 'Hide' : 'Show'}</button>
            <button type="button" onClick={() => companionActions.restoreDismissed(sellerId)} className="min-h-9 rounded-lg border border-border px-3 font-semibold">Restore all</button>
          </span>
        </div>
      )}
    </div>
  )
}

/** A Scene as an alert destination: its state and why, with every tagged Product's availability. Editing stays in the Seller Console. */
export function SceneDetail({ sellerId, sceneId, at }: { sellerId: SellerId; sceneId: string; at: Moment }) {
  const { state: ws } = useWorkspace()
  const authored = ws.scenes[sceneId]
  const seeded = !authored && sceneId in LIVE_POSTS ? LIVE_POSTS[sceneId as keyof typeof LIVE_POSTS] : undefined
  const title = authored ? authored.caption || 'Scene' : seeded?.title ?? sceneId
  const tags = authored ? authored.tags.map(t => t.product) : seeded ? [...seeded.tags] : []
  const available = (id: string) => (authored ? productAvailableNow(ws, id, sellerId, at) : hasAvailableProductAt([id as never], at))
  const nameOf = (id: string) => (id in LIVE_PRODUCTS ? LIVE_PRODUCTS[id as keyof typeof LIVE_PRODUCTS].name : ws.products[id]?.name ?? id)
  const state = authored ? sceneVisibility(authored, ws, at) : seeded?.restricted ? 'restricted' : seeded?.publication !== 'Published' ? (seeded?.publication ?? 'draft').toLowerCase() : tags.length > 0 && !tags.some(available) ? 'private' : 'public'
  return (
    <div data-scene-detail={sceneId} className="p-4">
      <div className="rounded-2xl bg-surface-raised p-4"><div className="text-xs text-text-muted">{sceneId}</div><h2 className="font-display text-xl font-semibold">{title}</h2><div className="mt-1 text-sm font-semibold capitalize">{state}</div>
        {state === 'private' && <p className="mt-1 text-xs leading-relaxed text-text-secondary">Every tagged Product is unavailable, so the Scene is Private. It returns on its own once one of them is back in stock.</p>}
        {state === 'restricted' && <p className="mt-1 text-xs leading-relaxed text-text-secondary">Restricted by Adulis moderation{seeded?.restricted ? `: ${seeded.restricted.reason}` : ''}. Restocking does not lift this.</p>}</div>
      <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Tagged Products</div>
      <ul className="flex flex-col gap-2">{tags.map(id => { const stock = id in LIVE_PRODUCTS ? LIVE_PRODUCTS[id as keyof typeof LIVE_PRODUCTS].stock : undefined; return (
        <li key={id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"><span className="min-w-0 truncate font-semibold">{nameOf(id)}</span><span className={`flex-shrink-0 text-xs font-semibold ${available(id) ? 'text-success' : 'text-danger'}`}>{available(id) ? (stock !== undefined ? stockState(stock) : 'Available') : 'Unavailable'}</span></li>) })}
        {tags.length === 0 && <li className="text-sm text-text-muted">No Products tagged.</li>}</ul>
      <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">Edit Scenes in the Seller Console.</p>
    </div>
  )
}

/** A live Story as an alert destination. Stories are authored and withdrawn in the Seller Console. */
export function StoryDetail({ story }: { story?: AlertInput['stories'][number] }) {
  return (
    <div data-story-detail className="p-4">
      <div className="rounded-2xl bg-surface-raised p-4"><h2 className="font-display text-xl font-semibold">{story?.text ?? 'Story'}</h2><div className="mt-1 text-sm text-text-secondary">{story ? `${Math.max(0, Math.round(story.hoursLeft))} h left of 24` : 'This Story is no longer live.'}</div></div>
      <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">Stories expire after 24 hours. Author or withdraw them in the Seller Console.</p>
    </div>
  )
}

export type { Destination }
