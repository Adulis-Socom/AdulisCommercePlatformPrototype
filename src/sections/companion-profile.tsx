import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { BUYERS, BUYER_IDS, initials, sellerProductsAt, trustAt, type Moment, type SellerId } from '../demo-data'
import { LIVE_SELLERS as SELLERS } from '../demo-data/live'
import { buyerKey, defaultSetup, linkableProducts, readiness, sessionOf, useWorkspace } from '../seller-workspace'
import { usePrototypeMode } from '../prototype-mode'
import { companionActions, useCompanionSession } from '../companion-session'
import { CONFIGURATION_LABEL, canAct, summaryOf, teamOf } from '../marketplace/seller-ops'
import { PERMISSION, type Decision } from '../marketplace/permissions'
import { INDEX } from '../marketplace/import'
import { isLegacy } from '../marketplace/registry'
import { NotPermitted, type Acting } from './companion-team'
import { sceneStates } from './companion-alerts'

const LIFECYCLE_LABEL = { ACTIVE: 'Active', DRAFT: 'Draft', SUSPENDED: 'Suspended' } as const
const LIFECYCLE_TONE = { ACTIVE: 'bg-success-bg text-success', DRAFT: 'bg-info-bg text-info', SUSPENDED: 'bg-danger-bg text-danger' } as const
const TRUST_LABEL: Record<string, string> = { NEW: 'New', ESTABLISHED: 'Established', TRUSTED: 'Trusted', REBUILDING: 'Rebuilding' }
/** Notification kinds a member can switch off for themselves. Order notifications exist only in the internal simulation. */
export const PREFERENCES = [
  { id: 'messages', label: 'Buyer messages' }, { id: 'stock', label: 'Stock alerts' }, { id: 'tasks', label: 'Team tasks' }, { id: 'scenes', label: 'Scene and Story alerts' },
] as const

/** Followers: the dataset's snapshot plus this session's Buyer follows and unfollows over the seeded ones. */
function followerCount(sellerId: SellerId, sessionOfBuyer: (id: string) => Record<string, boolean> | undefined): { total: number; delta: number } {
  const snapshot = summaryOf(sellerId)?.followers ?? SELLERS[sellerId].followers ?? 0
  let delta = 0
  for (const id of BUYER_IDS) {
    const choice = sessionOfBuyer(id)?.[sellerId]
    const seeded = (BUYERS[id].follows as readonly string[] | undefined)?.includes(sellerId) ?? false
    if (choice === true && !seeded) delta++
    else if (choice === false && seeded) delta--
  }
  return { total: snapshot + delta, delta }
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="rounded-xl bg-surface-raised p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div><div className="mt-0.5 font-display text-xl font-semibold" data-stat={label}>{value}</div>{detail && <div className="text-[10px] text-text-muted">{detail}</div>}</div>
}

/**
 * COMP-003: the Seller's profile in the Companion: identity, followers, Products and Scenes (public of total), Trust and readiness, the team summary and the
 * shortcuts to the Seller Console and the Storefront. All figures come from the dataset and the session; nothing is invented.
 */
export function ProfileTab({ sellerId, at, acting, onConsole, onStorefront }: { sellerId: SellerId; at: Moment; acting: Acting; onConsole: () => void; onStorefront: () => void }) {
  const { state: ws } = useWorkspace()
  const session = useCompanionSession()
  const { simulation } = usePrototypeMode()
  const seller = SELLERS[sellerId]
  const team = teamOf(sellerId)
  const lifecycle = team?.lifecycle ?? 'ACTIVE'
  const follows = followerCount(sellerId, id => sessionOf(ws, buyerKey('mvp', id)).follows)
  const productsTotal = sellerProductsAt(sellerId, at).length + Object.values(ws.products).filter(p => p.seller === sellerId && !p.seeded).length
  const productsPublic = lifecycle === 'ACTIVE' ? linkableProducts(ws, sellerId, at, true).length : 0
  const scenes = sceneStates(ws, sellerId, at)
  const scenesPublic = lifecycle === 'ACTIVE' ? scenes.filter(s => s.visibility === 'public').length : 0
  const readinessItems = readiness(ws.setup[sellerId] ?? defaultSetup(sellerId), linkableProducts(ws, sellerId, at, true).length)
  const done = readinessItems.filter(i => i.done).length
  const trust = trustAt(sellerId, at)
  const showcase = !isLegacy ? INDEX.seller.get(sellerId) : undefined
  const open = session.storeOpen[sellerId] ?? lifecycle === 'ACTIVE'
  const members = team?.members ?? []
  const roles = [...new Set(members.flatMap(m => (m.owner ? ['OWNER'] : m.roles)))]
  const openTasks = (team?.tasks ?? []).filter(t => (session.tasks[t.id] ?? t.status) !== 'DONE').length
  return (
    <div className="p-4" data-profile-tab>
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-muted font-display text-xl font-bold text-brand-dark" data-logo-placeholder>{initials(seller.name)}</span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold" data-profile-name>{seller.name}</h2>
          <div className="text-sm text-text-secondary" data-profile-handle>{seller.handle}</div>
          <div className="text-xs text-text-muted" data-profile-area>{seller.area}{seller.city ? `, ${seller.city}` : ''}</div>
          <div className="mt-1 flex flex-wrap gap-1.5"><span data-lifecycle={lifecycle} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LIFECYCLE_TONE[lifecycle]}`}>{LIFECYCLE_LABEL[lifecycle]}</span><span data-store-open={open} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${open ? 'bg-success-bg text-success' : 'bg-surface-raised text-text-secondary'}`}>{open ? 'Store open' : 'Store closed'}</span></div>
        </div>
      </div>
      {seller.bio && <p className="mt-3 text-sm leading-relaxed text-text-secondary" data-profile-bio>{seller.bio}</p>}
      {lifecycle !== 'ACTIVE' && <p data-lifecycle-note className="mt-3 rounded-xl bg-surface-raised p-3 text-xs leading-relaxed text-text-secondary">{lifecycle === 'DRAFT' ? 'This store is a draft: Buyers cannot see it and the Companion is read-only until it goes live.' : 'This store is suspended: it is hidden from Buyers and the Companion is read-only.'}</p>}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Followers" value={follows.total.toLocaleString('en-US')} detail={follows.delta ? `${follows.delta > 0 ? '+' : ''}${follows.delta} this session` : undefined} />
        <Stat label="Products" value={`${productsPublic} of ${productsTotal}`} detail="public of total" />
        <Stat label="Scenes" value={`${scenesPublic} of ${scenes.length}`} detail="public of total" />
      </div>

      <section className="mt-5" data-trust>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Trust and readiness</h3>
        <div className="rounded-xl border border-border p-3 text-sm">
          <div className="flex justify-between"><span className="text-text-muted">Trust level</span><span className="font-semibold" data-trust-level>{trust ? TRUST_LABEL[trust] ?? trust : '—'}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-text-muted">Setup</span><span className="font-semibold" data-readiness>{done} of {readinessItems.length} complete</span></div>
          {readinessItems.filter(i => !i.done).slice(0, 2).map(i => <p key={i.key} className="mt-1 text-xs text-text-secondary">{i.title}: {i.problems[0]}</p>)}
        </div>
        {simulation && showcase && (
          <div data-trust-showcase className="mt-2 rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary"><span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-warning">Historical Trust showcase · internal simulation</span>{showcase.trust_showcase}. Not a current MVP Trust rule.</div>
        )}
      </section>

      {team && (
        <section className="mt-5" data-team-summary-card>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Team</h3>
          <div className="rounded-xl border border-border p-3 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Configuration</span><span className="font-semibold">{CONFIGURATION_LABEL[team.configuration]}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-text-muted">Active members</span><span className="font-semibold">{members.filter(m => canAct(m.status)).length} of {members.length}</span></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-text-muted">Roles</span><span className="text-right font-semibold">{roles.map(r => r.replace(/_/g, ' ').toLowerCase()).join(', ')}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-text-muted">Open tasks</span><span className="font-semibold">{openTasks}</span></div>
          </div>
        </section>
      )}

      <section className="mt-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Open</h3>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={onConsole} data-open-console className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border p-3 text-left"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted font-bold text-brand-dark">SC</span><span className="flex-1"><span className="block text-sm font-semibold">Seller Console</span><span className="text-xs text-text-muted">Opens {seller.name}</span></span><span aria-hidden="true">›</span></button>
          <button type="button" onClick={onStorefront} disabled={lifecycle !== 'ACTIVE'} data-open-storefront className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border p-3 text-left disabled:opacity-60"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-muted font-bold text-brand-dark">SF</span><span className="flex-1"><span className="block text-sm font-semibold">Storefront</span><span className="text-xs text-text-muted">{lifecycle === 'ACTIVE' ? `Public page of ${seller.name}` : `A ${LIFECYCLE_LABEL[lifecycle].toLowerCase()} store has no public Storefront`}</span></span><span aria-hidden="true">›</span></button>
        </div>
      </section>
      {acting.member && <p className="mt-4 text-center text-[10px] text-text-muted">Acting as {acting.member.name}</p>}
    </div>
  )
}

/** The three-dot menu: quick settings (store open, notifications), profile customisation, Seller switch and the surface shortcuts. */
export function ProfileMenu({ sellerId, acting, onClose, onEdit, onSwitchSeller, onConsole, onStorefront, onTeam }: {
  sellerId: SellerId; acting: Acting; onClose: () => void; onEdit: () => void; onSwitchSeller: () => void; onConsole: () => void; onStorefront: () => void; onTeam: () => void
}) {
  const session = useCompanionSession()
  const { simulation } = usePrototypeMode()
  const [refused, setRefused] = useState<Decision | null>(null)
  const lifecycle = acting.ctx.lifecycle
  const open = session.storeOpen[sellerId] ?? lifecycle === 'ACTIVE'
  const memberId = acting.member?.id ?? 'owner'
  const pref = (id: string) => session.prefs[`${sellerId}|${memberId}`]?.[id] ?? true
  const toggleStore = () => {
    const decision = acting.can(PERMISSION.setAvailability)
    setRefused(decision.allowed ? null : decision)
    if (decision.allowed) companionActions.setStoreOpen(sellerId, !open)
  }
  const edit = () => {
    const decision = acting.can(PERMISSION.updateProfile)
    if (decision.allowed) { onClose(); onEdit() } else setRefused(decision)
  }
  const item = 'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-border px-3 text-left text-sm font-semibold'
  return (
    <div role="dialog" aria-modal="true" aria-label="Profile menu" className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="max-h-[88%] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="mb-3 font-display text-lg font-semibold">Profile menu</div>
        <div className="flex flex-col gap-2">
          <button type="button" role="switch" aria-checked={open} onClick={toggleStore} data-toggle-store className={item}><span>Store open</span><span className={open ? 'text-success' : 'text-text-muted'}>{open ? 'On' : 'Off'}</span></button>
          <button type="button" onClick={edit} data-edit-profile className={item}><span>Edit profile</span><span aria-hidden="true">›</span></button>
          {refused && <NotPermitted decision={refused} />}
          <button type="button" onClick={() => { onClose(); onSwitchSeller() }} className={item}><span>Switch Seller</span><span aria-hidden="true">›</span></button>
          <button type="button" onClick={() => { onClose(); onTeam() }} className={item}><span>Act as a team member</span><span aria-hidden="true">›</span></button>
          <button type="button" onClick={onConsole} className={item}><span>Open Seller Console</span><span aria-hidden="true">›</span></button>
          <button type="button" onClick={onStorefront} disabled={lifecycle !== 'ACTIVE'} className={`${item} disabled:opacity-60`}><span>Open Storefront</span><span aria-hidden="true">›</span></button>
        </div>
        <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-text-muted">Notifications for {acting.member?.name.split(' ')[0] ?? 'you'}</div>
        <div className="flex flex-col gap-2" data-notification-prefs>
          {PREFERENCES.map(p => <button key={p.id} type="button" role="switch" aria-checked={pref(p.id)} onClick={() => companionActions.setPref(sellerId, memberId, p.id, !pref(p.id))} className={item}><span>{p.label}</span><span className={pref(p.id) ? 'text-success' : 'text-text-muted'}>{pref(p.id) ? 'On' : 'Off'}</span></button>)}
          {simulation && <button type="button" role="switch" aria-checked={pref('orders')} onClick={() => companionActions.setPref(sellerId, memberId, 'orders', !pref('orders'))} className={item}><span>Order and delivery (internal simulation)</span><span className={pref('orders') ? 'text-success' : 'text-text-muted'}>{pref('orders') ? 'On' : 'Off'}</span></button>}
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-text-muted">Quick settings apply to this prototype session. Language is English only; the theme is chosen with Theme Lab.</p>
      </div>
    </div>
  )
}

/** Edit the store's name, handle, bio and area through the same Seller overlay Store setup writes, so the Buyer and the Storefront show the change. */
export function EditProfileSheet({ sellerId, onClose }: { sellerId: SellerId; onClose: () => void }) {
  const { state, dispatch } = useWorkspace()
  const seller = SELLERS[sellerId]
  const [form, setForm] = useState({ name: seller.name, handle: seller.handle, bio: seller.bio ?? '', area: seller.area ?? '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const field = (key: keyof typeof form, label: string, multiline = false) => (
    <label className="mb-3 block text-xs font-semibold text-text-secondary">{label}
      {multiline
        ? <textarea value={form[key]} rows={3} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setSaved(false) }} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary" />
        : <input value={form[key]} onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setSaved(false) }} className="mt-1 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal text-text-primary" />}
      {errors[key] && <span role="alert" className="mt-1 block font-normal text-danger">{errors[key]}</span>}
    </label>
  )
  const save = () => {
    const e: Record<string, string> = {}
    if (form.name.trim().length < 2) e.name = 'Add a store name.'
    if (!/^@?[a-z0-9._]{3,30}$/i.test(form.handle.trim())) e.handle = 'Use 3 to 30 letters, numbers, dots or underscores.'
    if (form.bio.trim().length < 20) e.bio = 'Write at least 20 characters.'
    if (form.area.trim().length < 2) e.area = 'Add the area.'
    setErrors(e)
    if (Object.keys(e).length) return
    const base = state.setup[sellerId] ?? defaultSetup(sellerId)
    dispatch({ type: 'setup', seller: sellerId, setup: { ...base, storeName: form.name.trim(), handle: form.handle.trim(), about: form.bio.trim(), area: form.area.trim(), blank: false } })
    setSaved(true)
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Edit profile" className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="max-h-[90%] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="mb-3 font-display text-lg font-semibold">Edit profile</div>
        {field('name', 'Store name')}{field('handle', 'Handle')}{field('area', 'Area')}{field('bio', 'Bio', true)}
        {saved && <p role="status" data-profile-saved className="mb-3 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">Saved. Buyers and the Storefront show these details.</p>}
        <div className="flex gap-2"><Button onClick={save} style={{ flex: 1 }}>Save profile</Button><Button variant="tertiary" onClick={onClose}>Close</Button></div>
      </div>
    </div>
  )
}

