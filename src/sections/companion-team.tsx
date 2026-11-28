import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { ACCESS_AREAS, areaAccess, roleInfo, type SellerRole } from '../demo-data/seller-roles'
import { formatAge, initials, type Moment, type SellerId } from '../demo-data'
import { usePrototypeMode } from '../prototype-mode'
import { companionActions, useCompanionSession } from '../companion-session'
import { CONFIGURATION_LABEL, STATUS_LABEL, canAct, permissionsOfRoles, teamOf, type MemberRow, type SellerTeam, type TaskRow, type TaskStatus } from '../marketplace/seller-ops'
import { PERMISSION, TASK_NEXT, decide, decideMessage, decideTask, type Actor, type Context, type Decision } from '../marketplace/permissions'

const ROLE_LABEL = (role: string) => roleInfo(role as SellerRole)?.label ?? role
const TASK_LABEL: Record<TaskStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', DONE: 'Done' }
const TASK_ACTION: Record<TaskStatus, string> = { OPEN: 'Reopen', IN_PROGRESS: 'Start', DONE: 'Mark done' }
const dueText = (due: string) => new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export interface Acting {
  team?: SellerTeam
  member?: MemberRow
  actor?: Actor
  ctx: Context
  /** The decision for a permission, as the acting member: always allowed on the legacy dataset (no team records). */
  can: (permission: string) => Decision
}
const ALLOW: Decision = { allowed: true }

/** COMP-002: the team member the Companion acts as (the Owner unless another is chosen) and the permission decision for what they try to do. */
export function useActing(sellerId: SellerId): Acting {
  const { simulation } = usePrototypeMode()
  const session = useCompanionSession()
  const team = teamOf(sellerId)
  const ctx: Context = { sellerId, lifecycle: team?.lifecycle ?? 'ACTIVE', surface: 'COMPANION', mode: simulation ? 'INTERNAL_SIMULATION' : 'MVP' }
  if (!team) return { ctx, can: () => ALLOW }
  const chosen = team.members.find(m => m.id === session.acting[sellerId])
  const member = chosen ?? team.members[0]
  const actor: Actor = { id: member.id, sellerId, roles: member.owner ? ['OWNER'] : member.roles, status: member.status }
  return { team, member, actor, ctx, can: permission => decide(actor, permission, ctx) }
}

/** A clear refusal: names the missing permission, or the gate that stopped the action. */
export function NotPermitted({ decision, subject }: { decision: Decision; subject?: string }) {
  if (decision.allowed) return null
  return (
    <div role="alert" data-not-permitted={decision.code} className="rounded-xl border border-warning bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">
      <span className="block font-semibold text-text-primary">{decision.code === 'role' ? 'Not permitted for your role' : 'Not permitted'}{subject ? ` · ${subject}` : ''}</span>
      {decision.message}
      {decision.permission && <span className="mt-1 block font-mono text-[10px] text-text-muted" data-missing-permission>{decision.permission}</span>}
    </div>
  )
}

function StatusChip({ status }: { status: MemberRow['status'] }) {
  const tone = status === 'ACTIVE' || status === 'OWNER_RELATIONSHIP' ? 'bg-success-bg text-success' : status === 'INVITED' ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning'
  return <span data-member-status={status} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{STATUS_LABEL[status]}</span>
}
function RoleChips({ member }: { member: MemberRow }) {
  return <span className="flex flex-wrap gap-1">{member.roles.map(r => <span key={r} className="rounded-full bg-brand-muted px-2 py-0.5 text-[10px] font-semibold text-brand-dark">{ROLE_LABEL(r)}</span>)}</span>
}
function Section({ title, trailing, children }: { title: string; trailing?: ReactNode; children: ReactNode }) {
  return <section className="mt-5"><div className="mb-2 flex items-baseline justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>{trailing}</div>{children}</section>
}

type View = { t: 'list' } | { t: 'member'; id: string } | { t: 'task'; id: string }

/**
 * COMP-002: the Seller's team in the Companion, read from the dataset (members, role grants, tasks, team messages). Administration (invite, role change,
 * removal) is the Seller Console's; here a member can see who is on the team, act as a member, work their own tasks and talk to the team.
 */
export function TeamTab({ sellerId, at, focusTask, onConsole }: { sellerId: SellerId; at: Moment; focusTask?: string | null; onConsole: () => void }) {
  const acting = useActing(sellerId)
  const session = useCompanionSession()
  const [view, setView] = useState<View>(focusTask ? { t: 'task', id: focusTask } : { t: 'list' })
  const [choosing, setChoosing] = useState(false)
  const { team, member, actor, ctx } = acting
  if (!team || !member || !actor) return <div className="p-4"><p className="rounded-xl bg-surface-raised p-4 text-sm text-text-secondary">Team records are part of the marketplace dataset.</p></div>
  const statusOf = (t: TaskRow): TaskStatus => session.tasks[t.id] ?? t.status
  const viewTeam = acting.can(PERMISSION.readTeam)
  const nameOf = (id: string) => team.members.find(m => m.id === id)?.name ?? id
  const tasks = team.tasks.map(t => ({ ...t, status: statusOf(t) }))
  const mine = tasks.filter(t => t.assignee === member.id)
  const open = tasks.filter(t => t.status !== 'DONE').length

  if (view.t === 'member') { const m = team.members.find(x => x.id === view.id); if (m) return <MemberDetail team={team} member={m} tasks={tasks} acting={acting} onBack={() => setView({ t: 'list' })} onOpenTask={id => setView({ t: 'task', id })} /> }
  if (view.t === 'task') { const t = tasks.find(x => x.id === view.id); if (t) return <TaskDetail task={t} acting={acting} nameOf={nameOf} onBack={() => setView({ t: 'list' })} /> }

  return (
    <div className="p-4" data-team-tab>
      <div className="flex items-baseline justify-between"><h2 className="font-display text-xl font-semibold">Team</h2><span data-team-config={team.configuration} className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-text-secondary">{CONFIGURATION_LABEL[team.configuration]}</span></div>
      <p className="text-xs text-text-muted" data-team-summary>{team.members.filter(m => canAct(m.status)).length} of {team.members.length} members can act · {open} open task{open === 1 ? '' : 's'}</p>

      <button type="button" onClick={() => setChoosing(true)} aria-haspopup="dialog" data-acting-as={member.id} aria-label={`Acting as ${member.name}. Change`} className="mt-3 flex min-h-14 w-full items-center gap-3 rounded-xl border border-brand bg-brand-muted p-3 text-left">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-surface text-xs font-bold text-brand-dark">{initials(member.name)}</span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wider text-brand-dark">Acting as · prototype</span><span className="block truncate text-sm font-semibold">{member.name}</span><span className="block truncate text-xs text-text-secondary">{member.owner ? 'Owner' : `${member.roles.map(ROLE_LABEL).join(' + ')} · ${STATUS_LABEL[member.status]}`}</span></span>
        <span className="text-xs font-semibold text-brand-text">Change</span>
      </button>
      {!canAct(member.status) && <div className="mt-2"><NotPermitted decision={{ allowed: false, code: 'membership', message: `${member.name} is ${STATUS_LABEL[member.status].toLowerCase()} and cannot act: no Companion action is available to this member.` }} /></div>}

      <Section title="Members" trailing={viewTeam.allowed && <span className="text-xs text-text-muted">{team.members.length}</span>}>
        {!viewTeam.allowed ? <NotPermitted decision={viewTeam} subject="Team members" /> : (
          <ul className="flex flex-col gap-2" aria-label="Team members">
            {team.members.map(m => (
              <li key={m.id}><button type="button" onClick={() => setView({ t: 'member', id: m.id })} data-member={m.id} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">{initials(m.name)}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}{m.id === member.id && <span className="font-normal text-text-muted"> · acting</span>}</span><span className="mt-0.5 block">{m.owner ? <span className="text-xs text-text-muted">Owner · from Seller ownership</span> : <RoleChips member={m} />}</span></span>
                <StatusChip status={m.status} />
              </button></li>
            ))}
          </ul>
        )}
        {team.members.length === 1 && <p className="mt-2 text-xs text-text-muted">Only the Owner is on this team so far.</p>}
      </Section>

      <Section title={`Tasks for ${member.name.split(' ')[0]}`} trailing={<span className="text-xs text-text-muted">{mine.length}</span>}>
        {mine.length === 0 ? <p className="text-sm text-text-muted">No tasks assigned.</p> : <TaskList tasks={mine} nameOf={nameOf} onOpen={id => setView({ t: 'task', id })} />}
      </Section>
      {viewTeam.allowed && tasks.length > mine.length && (
        <Section title="Other team tasks" trailing={<span className="text-xs text-text-muted">{tasks.length - mine.length}</span>}>
          <TaskList tasks={tasks.filter(t => t.assignee !== member.id)} nameOf={nameOf} onOpen={id => setView({ t: 'task', id })} />
        </Section>
      )}

      <Section title="Team thread"><TeamThread team={team} acting={acting} at={at} nameOf={nameOf} /></Section>

      <div data-manage-in-console className="mt-6 rounded-xl bg-info-bg p-3 text-xs leading-relaxed text-info">
        Inviting, role changes and removal are managed in the Seller Console. This is a read-only view of who is on the team.
        <Button size="sm" variant="secondary" onClick={onConsole} style={{ marginTop: 8, width: '100%' }}>Manage in Seller Console</Button>
      </div>
      {choosing && <ActingSheet team={team} current={member.id} onClose={() => setChoosing(false)} onSelect={id => { companionActions.actAs(sellerId, id); setChoosing(false) }} />}
    </div>
  )
}

function TaskList({ tasks, nameOf, onOpen }: { tasks: readonly TaskRow[]; nameOf: (id: string) => string; onOpen: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map(t => (
        <li key={t.id}><button type="button" onClick={() => onOpen(t.id)} data-task={t.id} data-task-status={t.status} className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left">
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{t.title}</span><span className="block text-xs text-text-secondary">{nameOf(t.assignee).split(' ')[0]} · due {dueText(t.due)} · {t.surface === 'COMPANION' ? 'Companion' : 'Console'}</span></span>
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.status === 'DONE' ? 'bg-success-bg text-success' : t.status === 'IN_PROGRESS' ? 'bg-info-bg text-info' : 'bg-surface-raised text-text-secondary'}`}>{TASK_LABEL[t.status]}</span>
        </button></li>
      ))}
    </ul>
  )
}

function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  return <div className="border-b border-border bg-surface px-4 py-2"><button type="button" onClick={onBack} aria-label={`Back to ${label}`} className="min-h-11 text-sm font-semibold text-brand-text">‹ {label}</button></div>
}

function MemberDetail({ team, member, tasks, acting, onBack, onOpenTask }: { team: SellerTeam; member: MemberRow; tasks: readonly TaskRow[]; acting: Acting; onBack: () => void; onOpenTask: (id: string) => void }) {
  const roles: SellerRole[] = member.owner ? ['OWNER'] : (member.roles as SellerRole[])
  const active = canAct(member.status)
  const perms = permissionsOfRoles(roles)
  const areas = ACCESS_AREAS.map(area => ({ area, access: areaAccess(roles, area) })).filter(a => a.access.level !== 'none' && a.access.level !== 'not-permitted')
  const own = tasks.filter(t => t.assignee === member.id)
  return (
    <div data-member-detail={member.id}>
      <BackBar onBack={onBack} label="Team" />
      <div className="p-4">
        <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted text-sm font-bold text-brand-dark">{initials(member.name)}</span><span className="min-w-0 flex-1"><span className="block font-display text-lg font-semibold">{member.name}</span><span className="block text-xs text-text-muted">{member.username}</span></span><StatusChip status={member.status} /></div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Roles</dt><dd>{member.owner ? <span className="text-sm">Owner <span className="text-xs text-text-muted">· from Seller ownership, not a team role</span></span> : <RoleChips member={member} />}</dd>
          <dt className="text-text-muted">Joined</dt><dd>{new Date(member.joined).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</dd>
          <dt className="text-text-muted">Seller</dt><dd>{CONFIGURATION_LABEL[team.configuration]}</dd>
        </dl>
        <Section title="Permissions summary">
          {!active ? <p data-no-access className="rounded-xl bg-warning-bg p-3 text-xs leading-relaxed text-text-secondary">{STATUS_LABEL[member.status]}: no access. The roles below would grant {perms.size} permissions once the membership is active.</p> : <p className="text-xs text-text-secondary" data-permission-count>{perms.size} permissions from the role grants of {roles.map(ROLE_LABEL).join(' + ')}. Task assignment never adds permissions.</p>}
          <ul className="mt-2 flex flex-col gap-1">{areas.map(a => <li key={a.area} className="flex justify-between gap-2 text-xs"><span>{a.area}</span><span className="font-semibold capitalize text-text-secondary">{a.access.level === 'owner-only' ? 'owner only' : a.access.level}{a.access.scope ? ` · ${a.access.scope}` : ''}</span></li>)}</ul>
        </Section>
        <Section title="Assigned tasks" trailing={<span className="text-xs text-text-muted">{own.length}</span>}>{own.length === 0 ? <p className="text-sm text-text-muted">No tasks assigned.</p> : <TaskList tasks={own} nameOf={id => team.members.find(m => m.id === id)?.name ?? id} onOpen={onOpenTask} />}</Section>
        <p className="mt-5 text-center text-xs text-text-muted">{acting.member?.id === member.id ? 'You are acting as this member.' : 'Choose “Acting as” on the Team tab to act as this member.'}</p>
      </div>
    </div>
  )
}

function TaskDetail({ task, acting, nameOf, onBack }: { task: TaskRow; acting: Acting; nameOf: (id: string) => string; onBack: () => void }) {
  const [refused, setRefused] = useState<Decision | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const { actor, ctx } = acting
  const next = TASK_NEXT[task.status]
  const move = (to: TaskStatus) => {
    if (!actor) return
    const decision = decideTask(actor, task, to, ctx)
    setRefused(decision.allowed ? null : decision)
    if (decision.allowed) { companionActions.setTask(task.id, to); setDone(`Task is now ${TASK_LABEL[to].toLowerCase()}.`) } else setDone(null)
  }
  return (
    <div data-task-detail={task.id} data-task-status={task.status}>
      <BackBar onBack={onBack} label="Team" />
      <div className="p-4">
        <div className="rounded-2xl bg-surface-raised p-4"><div className="text-xs text-text-muted">{task.id}</div><h2 className="font-display text-xl font-semibold">{task.title}</h2><div className="mt-1 text-sm font-semibold">{TASK_LABEL[task.status]}</div></div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">Assigned to</dt><dd>{nameOf(task.assignee)}</dd>
          <dt className="text-text-muted">Assigned by</dt><dd>{nameOf(task.assignedBy)}</dd>
          <dt className="text-text-muted">Priority</dt><dd className="capitalize">{task.priority.toLowerCase()}</dd>
          <dt className="text-text-muted">Due</dt><dd>{dueText(task.due)}</dd>
          <dt className="text-text-muted">Done in</dt><dd>{task.surface === 'COMPANION' ? 'Seller Companion' : 'Seller Console'}</dd>
          <dt className="text-text-muted">Needs</dt><dd className="font-mono text-xs">{task.requiredPermission}</dd>
          <dt className="text-text-muted">About</dt><dd>{task.targetType === 'SELLER' ? 'The store' : task.targetId}</dd>
        </dl>
        <p className="mt-3 text-xs text-text-muted">Being assigned a task does not grant its permission: the member acting must hold it through a role.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {next.map(to => <Button key={to} size="sm" variant={to === 'DONE' || to === 'IN_PROGRESS' ? 'primary' : 'secondary'} onClick={() => move(to)}>{TASK_ACTION[to]}</Button>)}
          {next.length === 0 && <span className="text-xs text-text-muted">A finished task is final.</span>}
        </div>
        {refused && <div className="mt-3" data-task-refused><NotPermitted decision={refused} subject="Task update" /></div>}
        {done && <p role="status" data-task-updated className="mt-3 rounded-xl bg-success-bg p-3 text-sm font-semibold text-success">{done}</p>}
      </div>
    </div>
  )
}

function TeamThread({ team, acting, at, nameOf }: { team: SellerTeam; acting: Acting; at: Moment; nameOf: (id: string) => string }) {
  const session = useCompanionSession()
  const [text, setText] = useState('')
  const [refused, setRefused] = useState<Decision | null>(null)
  const local = session.messages[team.sellerId] ?? []
  const titleOf = (id?: string | null) => team.tasks.find(t => t.id === id)?.title
  const send = () => {
    const body = text.trim()
    if (!body || !acting.actor) return
    const decision = decideMessage(acting.actor, acting.ctx)
    setRefused(decision.allowed ? null : decision)
    if (!decision.allowed) return
    companionActions.postMessage(team.sellerId, { sender: acting.actor.id, text: body })
    setText('')
  }
  const all = [...team.messages.map(m => ({ key: m.id, sender: m.sender, text: m.text, taskId: m.taskId, when: formatAge(m.at, at.at) })), ...local.map(m => ({ key: m.id, sender: m.sender, text: m.text, taskId: m.taskId ?? null, when: 'Just now' }))]
  return (
    <div data-team-thread>
      {all.length === 0 && <p className="text-sm text-text-muted">No team messages yet.</p>}
      <ul className="flex flex-col gap-2" aria-label="Team messages">
        {all.map(m => (
          <li key={m.key} data-team-message className="rounded-xl bg-surface-raised p-3">
            <div className="flex justify-between gap-2 text-[10px]"><span className="font-semibold text-text-secondary">{nameOf(m.sender)}</span><span className="text-text-muted">{m.when}</span></div>
            {titleOf(m.taskId) && <div className="mt-0.5 text-[10px] text-text-muted">Re: {titleOf(m.taskId)}</div>}
            <div className="mt-1 text-sm">{m.text}</div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input aria-label="Message the team" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder={`Message as ${acting.member?.name.split(' ')[0] ?? 'member'}`} className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm" />
        <Button onClick={send}>Send</Button>
      </div>
      {refused && <div className="mt-2" data-message-refused><NotPermitted decision={refused} subject="Team message" /></div>}
    </div>
  )
}

/** Choose which team member the Companion acts as (prototype control). Members who cannot act are listed so the refusal can be seen. */
function ActingSheet({ team, current, onClose, onSelect }: { team: SellerTeam; current: string; onClose: () => void; onSelect: (id: string) => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Act as" className="absolute inset-0 z-30 flex flex-col justify-end bg-black/40" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="max-h-[85%] overflow-y-auto rounded-t-3xl bg-surface px-4 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-strong" />
        <div className="font-display text-lg font-semibold">Act as</div>
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">Prototype · the Companion follows this member’s permissions</div>
        {team.members.map(m => (
          <button key={m.id} autoFocus={m.id === current} onClick={() => onSelect(m.id)} aria-current={m.id === current ? 'true' : undefined} data-act-as={m.id} className={`mb-2 flex min-h-14 w-full items-center gap-3 rounded-xl border p-3 text-left ${m.id === current ? 'border-brand bg-brand-muted' : 'border-border'}`}>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-muted text-xs font-bold text-brand-dark">{initials(m.name)}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span><span className="block text-xs text-text-muted">{m.owner ? 'Owner' : m.roles.map(ROLE_LABEL).join(' + ')}</span></span>
            <StatusChip status={m.status} />
          </button>
        ))}
      </div>
    </div>
  )
}
