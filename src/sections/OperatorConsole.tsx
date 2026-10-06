import { useState, type CSSProperties, type ReactNode } from 'react'
import { SearchInput, Textarea, TextInput } from '../components/ui/Input'
import {
  ConsoleTopBar, SidebarItem, SidebarSeparator, SidebarGroupLabel, useDrawer,
  IconGrid, IconFlag, IconShield, IconUsers, IconKey, IconClipboard,
  IconActivity, IconGlobe, IconSearch, IconOrders, IconCheck,
} from './ShellHelpers'
import { AdulisLogo } from '../App'
import { useStory } from '../StoryClock'
import {
  AUDIT_LOG, BUYERS, CLAIMS, CLAIM_IDS, CONVERSATIONS, CONVERSATION_IDS, COURIERS, DECISIONS, HANDOFF_REVIEWS, MARKET, MODERATION_CASES, ORDERS,
  ORDER_IDS, OPERATORS, PRODUCTS, SELLERS, SELLER_IDS, SHOPPABLE_POSTS, SHOPPABLE_POST_IDS, STAFF, SUPPORT_CASES, TRUST_APPEALS, VERIFICATION_CASES,
  claimStateAt, claimSubmitted, formatAge, formatClock, formatDate, formatDayMonth, formatEtb, formatMonthShortYear, happenedBefore,
  isForYouEligibleAt, isPubliclyEligibleAt, lineOptions, messagesAt, minutesBetween, orderStateAt, orderTotals, paidAt, paymentReference,
  restrictionAt, shortName, stateTime, trustAt, trustLabel,
  type ClaimId, type HandoffReviewId, type ModerationId, type Moment, type SupportId, type Timestamp, type TrustAppealId, type VerificationId,
} from '../demo-data'

type NavKey =
  | 'overview'
  | 'work-queue' | 'wq-support' | 'wq-moderation' | 'wq-claims' | 'wq-verification' | 'wq-trust-appeals' | 'wq-handoff'
  | 'search-global' | 'search-sellers' | 'search-accounts'
  | 'gov-config' | 'gov-access' | 'gov-approvals' | 'gov-audit' | 'gov-health'

type QueueFilter = 'All' | 'Support' | 'Moderation' | 'Claims' | 'Verification / Recovery' | 'Trust Appeals' | 'Manual Handoff'
type FounderActor = 'CEO' | 'COO/CTO'
type SoloState = 'inactive' | 'active' | 'expired'

interface NavItem { key: NavKey; label: string; icon: ReactNode; badge?: number }

const NAV_STRUCTURE: { group?: string; items: NavItem[] }[] = [
  { items: [{ key: 'overview', label: 'Overview', icon: <IconGrid size={14} /> }] },
  {
    group: 'WORK QUEUES',
    items: [
      { key: 'work-queue', label: 'Unified Work Queue', icon: <IconActivity size={14} /> },
      { key: 'wq-support', label: 'Support', icon: <IconOrders size={14} /> },
      { key: 'wq-moderation', label: 'Moderation', icon: <IconFlag size={14} /> },
      { key: 'wq-claims', label: 'Claims', icon: <IconClipboard size={14} /> },
      { key: 'wq-verification', label: 'Verification / Recovery', icon: <IconKey size={14} /> },
      { key: 'wq-trust-appeals', label: 'Trust Appeals', icon: <IconShield size={14} /> },
      { key: 'wq-handoff', label: 'Manual Handoff', icon: <IconCheck size={14} /> },
    ],
  },
  {
    group: 'SEARCH',
    items: [
      { key: 'search-global', label: 'Global Search', icon: <IconSearch size={14} /> },
      { key: 'search-sellers', label: 'Seller Search', icon: <IconUsers size={14} /> },
      { key: 'search-accounts', label: 'Account Search', icon: <IconKey size={14} /> },
    ],
  },
  {
    group: 'FOUNDER GOVERNANCE',
    items: [
      { key: 'gov-config', label: 'Configuration', icon: <IconGlobe size={14} /> },
      { key: 'gov-access', label: 'Operator Access', icon: <IconKey size={14} /> },
      { key: 'gov-approvals', label: 'Founder Decisions', icon: <IconCheck size={14} /> },
      { key: 'gov-audit', label: 'Audit', icon: <IconClipboard size={14} /> },
      { key: 'gov-health', label: 'System Health', icon: <IconActivity size={14} /> },
    ],
  },
]

const ALL_NAV_ITEMS = NAV_STRUCTURE.flatMap(group => group.items)
const BG = 'var(--color-operator-bg)'
const SURFACE = 'var(--color-operator-surface)'
const RAISED = 'var(--color-operator-raised)'
const BORDER = 'var(--color-operator-border)'
const TEXT = 'var(--color-operator-text)'
const MUTED = 'var(--color-operator-muted)'
const ACCENT = 'var(--color-operator-accent)'

const keys = <T extends string>(record: Readonly<Record<T, unknown>>) => Object.keys(record) as T[]

interface WorkItem {
  priority: string
  queue: Exclude<QueueFilter, 'All'>
  caseRef: string
  subject: string
  market: string
  age: string
  /** Whole minutes the case has been open, for the age filter. */
  minutes: number
  assigned: string
  state: string
}

/**
 * The open Operator work at the story moment (DEMO_DATA › Operator queues at 10:25, and the cases' later events), in
 * DEMO_DATA's queue order. DEMO_DATA gives the cases no priority.
 */
function workItems(at: Moment): WorkItem[] {
  const item = (queue: WorkItem['queue'], caseRef: string, subject: string, opened: Timestamp, assigned: string, state: string): WorkItem =>
    ({ priority: '—', queue, caseRef, subject, market: MARKET.id, age: formatAge(opened, at.at), minutes: minutesBetween(opened, at.at), assigned, state })
  const open = (opened: Timestamp, closed?: Timestamp) => happenedBefore(opened, at) && !(closed && happenedBefore(closed, at))
  const items: WorkItem[] = []
  for (const id of CLAIM_IDS) {
    const state = claimStateAt(id, at)
    const reviewer = CLAIMS[id].history.find(entry => entry.state === 'Under Review' && happenedBefore(entry.at, at))?.by
    if (state && state !== 'Resolved') items.push(item('Claims', id, `${CLAIMS[id].issue} · ${CLAIMS[id].order}`, claimSubmitted(id), reviewer ? OPERATORS[reviewer].role : 'Unassigned', state))
  }
  for (const id of keys(MODERATION_CASES)) {
    const m = MODERATION_CASES[id]
    if (open(m.reported, m.action.at)) items.push(item('Moderation', id, `Reported Shoppable Post · ${m.post}`, m.reported, 'Unassigned', 'Open'))
  }
  for (const id of keys(SUPPORT_CASES)) {
    const s = SUPPORT_CASES[id]
    if (open(s.raised, s.resolved.at)) items.push(item('Support', id, `Seller support request · ${s.order}`, s.raised, 'Unassigned', 'Open'))
  }
  for (const id of keys(VERIFICATION_CASES)) {
    const v = VERIFICATION_CASES[id]
    if (open(v.submitted)) items.push(item('Verification / Recovery', id, `${v.kind} · ${shortName(BUYERS[v.buyer].name)}`, v.submitted, 'Unassigned', 'Open'))
  }
  for (const id of keys(TRUST_APPEALS)) {
    const t = TRUST_APPEALS[id]
    if (open(t.submitted)) items.push(item('Trust Appeals', id, `Seller Trust appeal · ${SELLERS[t.seller].handle}`, t.submitted, 'Unassigned', 'Open'))
  }
  for (const id of keys(HANDOFF_REVIEWS)) {
    const h = HANDOFF_REVIEWS[id]
    if (open(h.escalated.at)) items.push(item('Manual Handoff', id, `Failed final handoff · ${h.order}`, h.escalated.at, 'Unassigned', 'Open'))
  }
  return items
}

/** 'Today · HH:MM' on the story day, otherwise the day and month with the time. */
function whenLabel(time: Timestamp, at: Moment) {
  return `${time.slice(0, 10) === at.at.slice(0, 10) ? 'Today' : formatDayMonth(time)} · ${formatClock(time)}`
}

/** Founder decisions proposed and awaiting the other Founder's approval at the story moment. */
function pendingDecisions(at: Moment) {
  return keys(DECISIONS).filter(id => happenedBefore(DECISIONS[id].proposed, at) && !happenedBefore(DECISIONS[id].approved, at))
}

export default function OperatorConsole({ demoTarget }: { demoTarget?: string }) {
  const initialNav = (demoTarget && ALL_NAV_ITEMS.some(item => item.key === demoTarget) ? demoTarget : 'overview') as NavKey
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [soloState, setSoloState] = useState<SoloState>('inactive')
  // On a phone the sidebar is a drawer, opened from the top bar's menu button (index.css; spec §4).
  const drawer = useDrawer()
  const open = (key: NavKey) => { setActiveNav(key); drawer.close() }
  const labelled = sidebarOpen || drawer.open
  // The story moment of the guided-flow step (the 10:25 snapshot otherwise). Queue badges count its open work.
  const { moment: at } = useStory()
  const work = workItems(at)
  const queueCount = (queue: QueueFilter) => work.filter(item => queue === 'All' || item.queue === queue).length
  const badges: Partial<Record<NavKey, number>> = {
    'work-queue': queueCount('All'), 'wq-support': queueCount('Support'), 'wq-moderation': queueCount('Moderation'), 'wq-claims': queueCount('Claims'),
    'wq-verification': queueCount('Verification / Recovery'), 'wq-trust-appeals': queueCount('Trust Appeals'), 'wq-handoff': queueCount('Manual Handoff'),
    'gov-approvals': pendingDecisions(at).length,
  }

  return (
    <div className="operator-console flex" style={{ height: '100%', background: BG }}>
      <aside id={drawer.id} {...drawer.panelProps('Operator navigation')} className={`operator-console-sidebar flex flex-shrink-0 flex-col border-r transition-all duration-300${drawer.open ? ' is-open' : ''}`} style={{ width: sidebarOpen ? 240 : 52, background: SURFACE, borderColor: BORDER }}>
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b px-3" style={{ borderColor: BORDER }}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${ACCENT}20` }}><AdulisLogo size={18} /></div>
          {labelled && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold" style={{ color: TEXT }}>Operator Console</p><p className="truncate text-xs" style={{ color: MUTED }}>Adulis Platform</p></div>}
          <button onClick={() => setSidebarOpen(open => !open)} aria-label={sidebarOpen ? 'Collapse Operator navigation' : 'Expand Operator navigation'} className="console-collapse-button flex h-6 w-6 flex-shrink-0 items-center justify-center rounded" style={{ color: MUTED }}><CollapseIcon open={sidebarOpen} /></button>
          <button ref={drawer.closeRef} onClick={drawer.close} aria-label="Close Operator navigation" className="console-drawer-close flex-shrink-0 items-center justify-center rounded-lg text-lg" style={{ color: MUTED }}>×</button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          {NAV_STRUCTURE.map((group, index) => <div key={group.group ?? index}>{group.group && labelled && <SidebarGroupLabel label={group.group} dark />}{!group.group && index > 0 && <SidebarSeparator dark />}{group.items.map(item => <SidebarItem key={item.key} label={labelled ? item.label : ''} icon={item.icon} active={activeNav === item.key} onClick={() => open(item.key)} dark badge={badges[item.key]} />)}</div>)}
        </nav>
        {labelled && (soloState === 'active'
          ? <div className="mx-3 mb-3 flex-shrink-0 rounded-xl border p-3" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}><p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>EXCEPTIONAL SOLO COVERAGE</p><p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Audited · Expires in 42m</p></div>
          : <div className="mx-3 mb-3 flex-shrink-0 rounded-xl border p-3" style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}10` }}><p className="text-xs font-semibold" style={{ color: ACCENT }}>PRIVILEGED SESSION</p><p className="mt-1 text-xs" style={{ color: MUTED }}>Reasoned access · Audit logging · Named actions only</p></div>)}
      </aside>
      {drawer.open && <div className="console-drawer-backdrop" aria-hidden="true" onClick={drawer.close} />}

      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleTopBar dark menu={drawer.menu('Open Operator navigation')} />
        <div className="operator-content flex-1 overflow-y-auto">
          {/* Below desktop widths (index.css): the Operator Console stays desktop-first (spec §4). */}
          <p className="operator-desktop-note" role="note">Desktop recommended</p>
          {activeNav === 'overview' && <OverviewPanel at={at} work={work} onQueue={() => setActiveNav('work-queue')} />}
          {isQueueNav(activeNav) && <WorkQueuePanel key={activeNav} at={at} work={work} initialQueue={queueForNav(activeNav)} />}
          {activeNav === 'search-global' && <SearchPanel at={at} mode="global" />}
          {activeNav === 'search-sellers' && <SearchPanel at={at} mode="seller" />}
          {activeNav === 'search-accounts' && <SearchPanel at={at} mode="account" />}
          {activeNav === 'gov-config' && <ConfigurationPanel />}
          {activeNav === 'gov-access' && <OperatorAccessPanel soloState={soloState} setSoloState={setSoloState} />}
          {activeNav === 'gov-approvals' && <FounderDecisionsPanel at={at} />}
          {activeNav === 'gov-audit' && <AuditPanel />}
          {activeNav === 'gov-health' && <SystemHealthPanel />}
        </div>
      </div>
    </div>
  )
}

function OverviewPanel({ at, work, onQueue }: { at: Moment; work: WorkItem[]; onQueue: () => void }) {
  // The operational brief from the open work at the story moment. DEMO_DATA defines no SLA, risk ratings, security
  // alerts or provider incidents.
  const inQueue = (queue: WorkItem['queue']) => work.filter(item => item.queue === queue)
  const oldestOf = (items: WorkItem[]) => items.slice().sort((a, b) => b.minutes - a.minutes)[0]
  const oldest = (items: WorkItem[]) => (items.length ? `Oldest ${oldestOf(items).age}` : '—')
  const pending = pendingDecisions(at).length
  const signals = [
    { label: 'Urgent Claims', value: String(inQueue('Claims').length), detail: oldest(inQueue('Claims')), tone: 'danger' },
    { label: 'Oldest Work', value: work.length ? oldestOf(work).age : '—', detail: work.length ? oldestOf(work).caseRef : '—', tone: 'danger' },
    { label: 'Moderation backlog', value: String(inQueue('Moderation').length), detail: oldest(inQueue('Moderation')), tone: 'warning' },
    { label: 'Recovery / Verification', value: String(inQueue('Verification / Recovery').length), detail: oldest(inQueue('Verification / Recovery')), tone: 'warning' },
    { label: 'Manual Handoff', value: String(inQueue('Manual Handoff').length), detail: oldest(inQueue('Manual Handoff')), tone: 'danger' },
    { label: 'Trust Appeals', value: String(inQueue('Trust Appeals').length), detail: oldest(inQueue('Trust Appeals')), tone: 'warning' },
    { label: 'Pending Approvals', value: String(pending), detail: '—', tone: 'warning' },
    { label: 'Security alerts', value: '—', detail: '—', tone: 'danger' },
  ]
  const health = (['Claims', 'Support', 'Moderation', 'Verification / Recovery', 'Trust Appeals', 'Manual Handoff'] as const).map(queue => {
    const items = inQueue(queue)
    return [queue, String(items.length), items.length ? oldestOf(items).age : '—', '—']
  })
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Core Operations" description={`Action-oriented operational risk and queue state · ${formatDate(at.at)} · ${formatClock(at.at)} UTC+3`} trailing={<OperatorButton onClick={onQueue}>Open Unified Queue</OperatorButton>} />
      <div className="grid grid-cols-4 gap-3">{signals.map(signal => <OperatorMetric key={signal.label} {...signal} />)}</div>
      <div className="mt-5 grid grid-cols-[1.45fr_1fr] gap-5">
        <DarkPanel title="Queue health" trailing={<button onClick={onQueue} className="text-xs font-semibold" style={{ color: ACCENT }}>View all work</button>}>
          <div className="grid grid-cols-[1.5fr_.6fr_.7fr_.8fr] gap-3 px-3 pb-2 text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}><span>Queue</span><span>Open</span><span>Oldest</span><span>Health</span></div>
          {health.map(([queue, open, oldestAge, status]) => <div key={queue} className="grid grid-cols-[1.5fr_.6fr_.7fr_.8fr] items-center gap-3 border-t px-3 py-3 text-xs" style={{ borderColor: BORDER, color: TEXT }}><span className="font-semibold">{queue}</span><span className="font-mono">{open}</span><span className="font-mono" style={{ color: MUTED }}>{oldestAge}</span><OperatorState tone="neutral">{status}</OperatorState></div>)}
        </DarkPanel>
        <div className="flex flex-col gap-5">
          <DarkPanel title="Provider incidents"><div className="rounded-xl p-4 text-xs" style={{ background: RAISED, color: MUTED }}>—</div></DarkPanel>
          <DarkPanel title="Control posture"><ControlRow label="Queue assignment" value="Audited" /><ControlRow label="Restricted access" value="Reason required" /><ControlRow label="Consequential actions" value="Approval gated" /></DarkPanel>
        </div>
      </div>
    </div>
  )
}

function WorkQueuePanel({ at, work, initialQueue }: { at: Moment; work: WorkItem[]; initialQueue: QueueFilter }) {
  const [queue, setQueue] = useState<QueueFilter>(initialQueue)
  const [priority, setPriority] = useState('All')
  const [market, setMarket] = useState('All')
  const [age, setAge] = useState('All')
  const [assignment, setAssignment] = useState('All')
  const [status, setStatus] = useState('All')
  const [claimed, setClaimed] = useState<string[]>([])
  const [opened, setOpened] = useState<WorkItem | null>(null)
  // The age filter compares whole minutes, so cases opened minutes or days ago are classed correctly.
  const rows = work.filter(item =>
    (queue === 'All' || item.queue === queue) &&
    (priority === 'All' || item.priority === priority) &&
    (market === 'All' || item.market === market) &&
    (assignment === 'All' || (assignment === 'Unassigned' ? item.assigned === 'Unassigned' : item.assigned !== 'Unassigned')) &&
    (status === 'All' || item.state === status) &&
    (age === 'All' || (age === 'Over 8h' ? item.minutes >= 8 * 60 : item.minutes < 8 * 60))
  )
  const claim = (caseRef: string) => setClaimed(values => values.includes(caseRef) ? values : [...values, caseRef])
  return (
    <div className="mx-auto max-w-[1500px] p-8">
      <OperatorHeader title="Unified Work Queue" description="Prioritized operational cases across named workflows. Claiming assigns work only." />
      <div className="mb-4 grid grid-cols-6 gap-2">
        <DarkSelect label="Priority" value={priority} options={['All', 'P0', 'P1', 'P2']} onChange={setPriority} />
        <DarkSelect label="Market" value={market} options={['All', MARKET.id]} onChange={setMarket} />
        <DarkSelect label="Queue" value={queue} options={['All', 'Support', 'Moderation', 'Claims', 'Verification / Recovery', 'Trust Appeals', 'Manual Handoff']} onChange={value => setQueue(value as QueueFilter)} />
        <DarkSelect label="Age" value={age} options={['All', 'Over 8h', 'Under 8h']} onChange={setAge} />
        <DarkSelect label="Assignment" value={assignment} options={['All', 'Unassigned', 'Assigned']} onChange={setAssignment} />
        <DarkSelect label="Status" value={status} options={['All', ...new Set(work.map(item => item.state))]} onChange={setStatus} />
      </div>
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '1180px' } as CSSProperties}>
        <div className="rtable-head grid grid-cols-[70px_150px_110px_1.5fr_90px_70px_120px_130px_150px] gap-3 px-4 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Priority</span><span>Queue</span><span>Case</span><span>Subject</span><span>Market</span><span>Age</span><span>Assigned To</span><span>Workflow State</span><span>Actions</span></div>
        {rows.map(item => {
          const isClaimed = claimed.includes(item.caseRef)
          return <div key={item.caseRef} className="rtable-row grid grid-cols-[70px_150px_110px_1.5fr_90px_70px_120px_130px_150px] items-center gap-3 border-t px-4 py-4 text-xs" style={{ borderColor: BORDER, color: TEXT }}><span className="rtable-cell" data-label="Priority"><OperatorState tone={item.priority === 'P0' ? 'danger' : item.priority === 'P1' ? 'warning' : 'neutral'}>{item.priority}</OperatorState></span><span data-label="Queue">{item.queue}</span><span className="rtable-primary font-mono font-semibold" style={{ color: ACCENT }}>{item.caseRef}</span><span data-label="Subject" className="rtable-wide truncate">{item.subject}</span><span data-label="Market" className="font-mono" style={{ color: MUTED }}>{item.market}</span><span data-label="Age" className="font-mono">{item.age}</span><span data-label="Assigned To">{isClaimed ? 'You' : item.assigned}</span><span data-label="Workflow State">{item.state}</span><span className="rtable-wide flex gap-1"><button disabled={isClaimed || item.assigned !== 'Unassigned'} onClick={() => claim(item.caseRef)} className="rounded px-2 py-1.5 text-[10px] font-semibold disabled:opacity-40" style={{ background: RAISED, color: TEXT }}>{isClaimed ? 'Claimed' : 'Claim'}</button><button onClick={() => setOpened(item)} className="rounded px-2 py-1.5 text-[10px] font-semibold" style={{ background: ACCENT, color: BG }}>Open</button></span></div>
        })}
      </div>
      <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, background: SURFACE, color: MUTED }}>Claim Work Item changes assignment to the current Operator. It does not alter payment, Order, claim, moderation, verification, Trust, or handoff business state.</div>
      {opened && <CaseWorkspace item={opened} at={at} onClose={() => setOpened(null)} />}
    </div>
  )
}

function CaseWorkspace({ item, at, onClose }: { item: WorkItem; at: Moment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${item.queue} case workspace`} style={{ background: 'rgba(0,0,0,.58)' }} onClick={onClose}>
      <div className="operator-panel flex h-full w-[920px] flex-col border-l shadow-xl" style={{ borderColor: BORDER, background: BG }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b p-6" style={{ borderColor: BORDER, background: SURFACE }}><div><div className="flex items-center gap-3"><span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{item.caseRef}</span><OperatorState tone={item.priority === 'P0' ? 'danger' : 'warning'}>{item.priority}</OperatorState><OperatorState tone="neutral">{item.state}</OperatorState></div><div className="mt-2 font-display text-2xl font-semibold" style={{ color: TEXT }}>{item.queue} Case Workspace</div><div className="mt-1 text-xs" style={{ color: MUTED }}>{item.subject} · {item.market} · {item.age} old</div></div><button onClick={onClose} aria-label="Close case workspace" className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: RAISED, color: MUTED }}>×</button></div>
        <div className="flex-1 overflow-y-auto p-6">
          {item.queue === 'Support' && <SupportCase id={item.caseRef as SupportId} at={at} />}
          {item.queue === 'Moderation' && <ModerationCase id={item.caseRef as ModerationId} at={at} />}
          {item.queue === 'Claims' && <ClaimCase id={item.caseRef as ClaimId} at={at} />}
          {item.queue === 'Verification / Recovery' && <VerificationCase id={item.caseRef as VerificationId} at={at} />}
          {item.queue === 'Manual Handoff' && <HandoffCase id={item.caseRef as HandoffReviewId} />}
          {item.queue === 'Trust Appeals' && <TrustAppealCase id={item.caseRef as TrustAppealId} at={at} />}
        </div>
      </div>
    </div>
  )
}

/** 'Verified · QR' style evidence for a recorded handoff, or 'Not verified'. */
function handoffText(evidence: { method: string } | undefined, how: string) {
  if (!evidence) return '—'
  return evidence.method === 'Not verified' ? 'Not verified' : evidence.method === 'QR' ? `Verified · ${how}` : `Verified · ${evidence.method}`
}

/** 'D Mon HH:MM': a day and time on the story timeline. */
function dayTime(time: Timestamp) {
  return `${formatDayMonth(time)} ${formatClock(time)}`
}

/** The Buyer–Seller messages sent about an Order by the story moment. */
function orderMessages(orderId: keyof typeof ORDERS, at: Moment) {
  const conversation = CONVERSATION_IDS.find(id => CONVERSATIONS[id].buyer === ORDERS[orderId].buyer && CONVERSATIONS[id].seller === ORDERS[orderId].seller)
  return conversation ? messagesAt(conversation, at).filter(m => 'order' in m.context && m.context.order === orderId) : []
}

function SupportCase({ id, at }: { id: SupportId; at: Moment }) {
  // The Seller's support request as DEMO_DATA records it, with the Operator's reply once it has been sent.
  const support = SUPPORT_CASES[id]
  const order = ORDERS[support.order]
  const seller = SELLERS[support.seller]
  const totals = orderTotals(support.order)
  const paid = paidAt(support.order)
  const happened = (state: 'Pickup Verified' | 'Completed') => { const t = stateTime(support.order, state); return !!t && happenedBefore(t, at) }
  const messages = orderMessages(support.order, at)
  const claims = CLAIM_IDS.filter(claim => CLAIMS[claim].order === support.order && claimStateAt(claim, at) !== null && claimStateAt(claim, at) !== 'Resolved')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([
    `${formatClock(support.raised)} · ${shortName(STAFF[support.raisedBy].name)} (${seller.name}): “${support.message}”`,
    ...(happenedBefore(support.resolved.at, at) ? [`${formatClock(support.resolved.at)} · ${OPERATORS[support.resolved.by].role} replied with ${support.resolved.replySummary}.`] : []),
  ])
  return (
    <div className="grid grid-cols-[1.35fr_.65fr] gap-5">
      <div className="flex flex-col gap-5">
        <CaseSection title="Account / Seller"><CaseGrid rows={[['Account', `${shortName(STAFF[support.raisedBy].name)} · ${STAFF[support.raisedBy].role}`], ['Seller', `${support.seller} · ${seller.name}`], ['Relationship', `Seller Order with ${shortName(BUYERS[order.buyer].name)}`], ['Account state', '—']]} /></CaseSection>
        <CaseSection title="Order"><CaseGrid rows={[['Seller Order', support.order], ['Product', order.lines.map(line => PRODUCTS[line.product].name).join(', ')], ['Status', orderStateAt(support.order, at) ?? '—'], ['Total', formatEtb(totals.total)]]} /></CaseSection>
        <CaseSection title="Payment"><CaseGrid rows={[['Provider fact', `Paid · confirmed ${formatClock(paid)}`], ['Provider reference', paymentReference(support.order)], ['Authority', 'Provider + Adulis backend'], ['Operator control', 'Read-only']]} /><CaseNotice>Payment is externally established. This workspace contains no payment-state control.</CaseNotice></CaseSection>
        <CaseSection title="Fulfilment and Handoff"><CaseGrid rows={[['Fulfilment', order.fulfilment], ['Courier', order.courier ? COURIERS[order.courier].name : '—'], ['Pickup', order.fulfilment !== 'Courier Delivery' ? '—' : happened('Pickup Verified') ? 'Verified' : 'Pending'], ['Delivery', happened('Completed') ? 'Verified' : 'Pending']]} /></CaseSection>
        <CaseSection title="Chat and Claims"><EvidenceLine label="Buyer–Seller chat" value={messages.length ? `${messages.length} message${messages.length === 1 ? '' : 's'} · last at ${formatClock(messages[messages.length - 1].at)}` : '—'} /><EvidenceLine label="Claims" value={claims.length ? claims.join(', ') : 'No active Claim'} /></CaseSection>
      </div>
      <div className="flex flex-col gap-5">
        <CaseSection title="Support notes">{notes.map((item, index) => <div key={index} className="border-l py-1 pl-3 text-xs leading-relaxed" style={{ borderColor: ACCENT, color: MUTED }}>{item}</div>)}<div className="mt-4"><Textarea label="New support note" value={note} onChange={event => setNote(event.target.value)} rows={4} placeholder="Add a factual case note." /></div><OperatorButton disabled={!note} onClick={() => { setNotes(values => [...values, `${formatClock(at.at)} · ${note}`]); setNote('') }}>Add Support Note</OperatorButton></CaseSection>
        <CaseSection title="Purpose-specific actions"><CaseAction label="Send status explanation" detail="Send the buyer a summary of the recorded Order state." /><CaseAction label="Escalate fulfilment issue" detail="Move this case to a named fulfilment workflow." /><CaseAction label="Close support case" detail="Resolve the support request without changing Order state." /></CaseSection>
      </div>
    </div>
  )
}

function ModerationCase({ id, at }: { id: ModerationId; at: Moment }) {
  // The report as DEMO_DATA records it. Restrict takes the post off For You, Search and the Storefront (Flow K).
  const report = MODERATION_CASES[id]
  const post = SHOPPABLE_POSTS[report.post]
  const seller = SELLERS[post.seller]
  const [target, setTarget] = useState('Shoppable Post')
  const [action, setAction] = useState('')
  const targets = ['Product Post', 'Shoppable Post', 'Review', 'Seller safety case']
  const distribution = [isForYouEligibleAt(report.post, at) && 'FYP', isPubliclyEligibleAt(report.post, at) && 'Search', isPubliclyEligibleAt(report.post, at) && 'Storefront'].filter(Boolean).join(' · ') || '—'
  const reports = keys(MODERATION_CASES).filter(other => MODERATION_CASES[other].post === report.post && happenedBefore(MODERATION_CASES[other].reported, at)).length
  const revision = post.published ? `Revision published ${formatDate(post.published)}` : '—'
  const history = [
    post.published && `${formatDayMonth(post.published)} · Revision published`,
    `${dayTime(report.reported)} · Report received`,
    happenedBefore(report.action.at, at) && `${dayTime(report.action.at)} · ${report.action.kind} by ${OPERATORS[report.action.by].role}`,
  ].filter((event): event is string => !!event)
  const removedFromSearch = action.startsWith('Restricted') || action.startsWith('Removed')
  return (
    <div className="space-y-5">
      <div className="flex gap-2">{targets.map(value => <button key={value} onClick={() => setTarget(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: target === value ? ACCENT : BORDER, background: target === value ? `${ACCENT}18` : SURFACE, color: target === value ? ACCENT : MUTED }}>{value}</button>)}</div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Entity and exact revision"><CaseGrid rows={[['Entity', `${target} · ${report.post}`], ['Exact revision', revision], ['Publication', restrictionAt(report.post, at) ? 'Restricted' : post.publication], ['Current distribution', distribution]]} /></CaseSection>
        <CaseSection title="Report"><CaseGrid rows={[['Report reason', report.reason], ['Reporter', 'Buyer account · presentation-safe'], ['Submitted', `${formatDayMonth(report.reported)} · ${formatClock(report.reported)}`], ['Report count', `${reports} linked report${reports === 1 ? '' : 's'}`]]} /></CaseSection>
        <CaseSection title="Evidence"><EvidenceLine label="Reported frame" value="—" /><EvidenceLine label="Revision snapshot" value={revision} /><EvidenceLine label="Related chat" value="No linked chat evidence" /></CaseSection>
        <CaseSection title="Seller and Products"><CaseGrid rows={[['Seller', `${seller.name} · ${seller.handle}`], ['Trust', `${trustAt(post.seller, at) ?? '—'} · read-only`], ['Tagged Products', post.tags.join(', ') || '—'], ['Availability', post.tags.map(product => PRODUCTS[product].availability).join(', ') || '—']]} /></CaseSection>
        <CaseSection title="Policy"><CaseGrid rows={[['Policy', '—'], ['Policy version', '—'], ['Decision standard', '—'], ['Prior history', '—']]} /></CaseSection>
        <CaseSection title="History"><CaseTimeline events={history} /></CaseSection>
      </div>
      <CaseSection title="Moderation actions">
        <div className="flex flex-wrap gap-2"><OperatorButton variant="secondary" onClick={() => setAction('No Action recorded. Entity distribution remains unchanged.')}>No Action</OperatorButton><OperatorButton onClick={() => setAction('Restricted. Entity removed from FYP, Search and Storefront while remaining visible in the Seller workspace.')}>Restrict</OperatorButton><OperatorButton onClick={() => setAction('Removed. Entity is no longer visible in FYP, Search, or Storefront.')}>Remove</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Restored. Eligible surfaces will republish after policy state refresh.')}>Restore</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Escalated to senior moderation review.')}>Escalate</OperatorButton></div>
        <div className="mt-4 grid grid-cols-3 gap-3"><DistributionEffect surface="FYP" affected={removedFromSearch} /><DistributionEffect surface="Search" affected={removedFromSearch} /><DistributionEffect surface="Storefront" affected={removedFromSearch} /></div>
      </CaseSection>
    </div>
  )
}

function ClaimCase({ id, at }: { id: ClaimId; at: Moment }) {
  // The Claim, its Order's payment, handoff and checkpoint evidence, and its history by the story moment.
  const claim = CLAIMS[id]
  const order = ORDERS[claim.order]
  const seller = SELLERS[order.seller]
  const line = order.lines.find(item => item.product === claim.product) ?? order.lines[0]
  const totals = orderTotals(claim.order)
  const paid = paidAt(claim.order)
  const pickedUp = stateTime(claim.order, 'Pickup Verified')
  const completed = stateTime(claim.order, 'Completed')
  const location = order.finalHandoff?.location
  const messages = orderMessages(claim.order, at)
  const [action, setAction] = useState('')
  const timeline = [
    `${dayTime(paid)} · Provider payment confirmed`,
    pickedUp && `${dayTime(pickedUp)} · Pickup verified`,
    completed && `${dayTime(completed)} · Delivery verified`,
    ...claim.history.filter(entry => happenedBefore(entry.at, at)).map(entry => `${dayTime(entry.at)} · ${entry.state === 'Open' ? 'Claim submitted' : `Claim ${entry.state}${entry.by ? ` · ${OPERATORS[entry.by].role}` : ''}`}`),
  ].filter((event): event is string => !!event)
  return (
    <div className="space-y-5">
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Parties"><CaseGrid rows={[['Buyer', `${shortName(BUYERS[order.buyer].name)} · ${order.buyer}`], ['Seller', `${seller.name} · ${seller.handle}`], ['Seller Order', claim.order], ['Claim', `${id} · ${claim.issue}`]]} /></CaseSection>
        <CaseSection title="Products"><EvidenceLine label="Product" value={PRODUCTS[claim.product].name} /><EvidenceLine label="Variant" value={lineOptions(line)} /><EvidenceLine label="Quantity" value={String(line.quantity)} /></CaseSection>
        <CaseSection title="Provider payment fact"><CaseGrid rows={[['Payment', 'Paid · provider confirmed'], ['Provider reference', paymentReference(claim.order)], ['Products', formatEtb(totals.products)], ['Adulis surcharge', formatEtb(totals.surcharge)], [`${order.fulfilment} charge`, formatEtb(totals.delivery)], ['Total', formatEtb(totals.total)]]} /><CaseNotice>Payment fact is read-only and cannot be changed from a Claim.</CaseNotice></CaseSection>
        <CaseSection title="Assignment and Handoff"><CaseGrid rows={[['Courier assignment', order.courier ? `${COURIERS[order.courier].name} · approved relationship` : '—'], ['Pickup', handoffText(order.pickup, 'Seller Pickup QR')], ['Delivery', handoffText(order.finalHandoff, 'Recipient scan')], ['Final handoff', completed ? `${formatDayMonth(completed)} · ${formatClock(completed)}` : '—']]} /></CaseSection>
        <CaseSection title="Checkpoint evidence"><EvidenceLine label="Pickup checkpoint" value={order.pickup?.location && pickedUp ? `Location ${order.pickup.location} · ${formatClock(pickedUp)}` : '—'} /><EvidenceLine label="Delivery checkpoint" value={location ? `Location ${location}${location === 'unavailable' ? ' · handoff remains valid' : ''}` : '—'} /></CaseSection>
        <CaseSection title="Chat evidence"><CaseTimeline events={messages.length ? messages.map(m => `${dayTime(m.at)} · ${m.from === 'buyer' ? 'Buyer' : 'Seller'}: ${m.text}`) : ['—']} /></CaseSection>
        <CaseSection title="Submitted evidence"><div className="grid grid-cols-3 gap-2">{Array.from({ length: claim.evidencePhotos }, (_, index) => <EvidenceTileDark key={index} label={`Buyer photo ${index + 1}`} />)}</div></CaseSection>
        <CaseSection title="Timeline"><CaseTimeline events={timeline} /></CaseSection>
      </div>
      <CaseSection title="Claim actions"><div className="flex gap-2"><OperatorButton variant="secondary" onClick={() => setAction('Evidence request sent to the relevant party. Claim state moved to Evidence Required.')}>Request Evidence</OperatorButton><OperatorButton onClick={() => setAction('Decision proposal drafted for required review. No payment fact was changed.')}>Propose Decision</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Claim escalated to senior review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function VerificationCase({ id, at }: { id: VerificationId; at: Moment }) {
  // The recovery request as DEMO_DATA records it: the evidence is the account history; no identity documents.
  const request = VERIFICATION_CASES[id]
  const [focus, setFocus] = useState('Suspicious recovery')
  const [action, setAction] = useState('')
  const focuses = ['Social account control', 'Social business verification', 'Account linkage', 'Phone recovery', 'Suspicious recovery', 'Seller admission appeal']
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{focuses.map(value => <button key={value} onClick={() => setFocus(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: focus === value ? ACCENT : BORDER, background: focus === value ? `${ACCENT}18` : SURFACE, color: focus === value ? ACCENT : MUTED }}>{value}</button>)}</div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Recovery subject"><CaseGrid rows={[['Account', `${shortName(BUYERS[request.buyer].name)} · ${request.buyer}`], ['Case focus', focus], ['Account linkage', `Account history · ${request.evidenceOrders.join(', ')}`], ['Risk', '—']]} /></CaseSection>
        <CaseSection title="Social account control"><EvidenceLine label="Connected account" value="—" /><EvidenceLine label="Business page" value="—" /><EvidenceLine label="Linkage history" value="—" /></CaseSection>
        <CaseSection title="Phone recovery"><CaseGrid rows={[['Request', `“${request.message}”`], ['Request type', request.kind], ['Request time', whenLabel(request.submitted, at)], ['Previous phone', '—']]} /></CaseSection>
        <CaseSection title="Seller admission appeal"><CaseGrid rows={[['Admission state', '—'], ['Appeal history', '—'], ['Market', MARKET.id], ['Policy', '—']]} /></CaseSection>
      </div>
      <CaseNotice>Recovery decisions use account control, business verification, linkage history, phone signals, and risk review. Only the supported evidence shown here is requested.</CaseNotice>
      <CaseSection title="Verification / Recovery actions"><div className="flex gap-2"><OperatorButton onClick={() => setAction(`${focus} approved with audit record.`)}>Approve Supported Recovery</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction(`${focus} rejected; existing account linkage remains unchanged.`)}>Reject Recovery</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Escalated for additional risk review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function HandoffCase({ id }: { id: HandoffReviewId }) {
  // The failed final handoff as DEMO_DATA records it: no delivery checkpoint, because the handoff wasn't verified.
  const review = HANDOFF_REVIEWS[id]
  const order = ORDERS[review.order]
  const buyer = shortName(BUYERS[order.buyer].name)
  const courier = order.courier ? COURIERS[order.courier].name : '—'
  const pickedUp = stateTime(review.order, 'Pickup Verified')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('')
  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}><div className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Exceptional manual review</div><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Normal QR and OTP verification did not produce a conclusive automated result. Manual Verification is exceptional, reasoned, and audited.</p></div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Order and parties"><CaseGrid rows={[['Order', review.order], ['Buyer / delegate', order.recipient ? `${buyer} / ${shortName(order.recipient.name)}` : buyer], ['Seller', SELLERS[order.seller].name], ['Courier', courier]]} /></CaseSection>
        <CaseSection title="Pickup"><CaseGrid rows={[['Seller Pickup QR', pickedUp ? `Verified · ${formatClock(pickedUp)}` : '—'], ['Courier assignment', courier], ['Package custody', pickedUp ? 'Transferred' : '—'], ['Pickup checkpoint', order.pickup?.location ? `Location ${order.pickup.location}` : '—']]} /></CaseSection>
        <CaseSection title="Delivery attempts"><CaseTimeline events={[`${formatClock(review.deliveryAttempt.at)} · QR scan failed: ${review.deliveryAttempt.qrFailure}`, `${formatClock(review.otp.from)}–${formatClock(review.otp.to)} · ${review.otp.codesSent} OTP codes sent`, `${formatClock(review.escalated.at)} · Escalated by ${courier}: “${review.escalated.note}”`]} /></CaseSection>
        <CaseSection title="OTP attempts"><CaseGrid rows={[['Codes sent', String(review.otp.codesSent)], ['Window', `${formatClock(review.otp.from)}–${formatClock(review.otp.to)}`], ['Outcome', review.otp.outcome], ['Recipient', buyer]]} /></CaseSection>
        <CaseSection title="Checkpoint evidence"><EvidenceLine label="Pickup checkpoint" value={order.pickup?.location && pickedUp ? `Location ${order.pickup.location} · ${formatClock(pickedUp)}` : '—'} /><EvidenceLine label="Delivery checkpoint" value="None · handoff not verified" /></CaseSection>
        <CaseSection title="Timestamps"><CaseGrid rows={[['Courier arrival', '—'], ['First handoff attempt', dayTime(review.deliveryAttempt.at)], ['Last OTP attempt', dayTime(review.otp.to)], ['Case created', dayTime(review.escalated.at)]]} /></CaseSection>
      </div>
      <CaseSection title="Manual Verification decision"><Textarea label="Required decision reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Explain how the available handoff evidence supports this exceptional decision." /><div className="mt-4 flex gap-2"><OperatorButton disabled={!reason} onClick={() => setAction('Manual Verification approved with required reason and audit record.')}>Approve Manual Verification</OperatorButton><OperatorButton variant="secondary" disabled={!reason} onClick={() => setAction('Manual Verification rejected. Existing verified business state remains unchanged.')}>Reject</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Manual Handoff case escalated for senior review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function TrustAppealCase({ id, at }: { id: TrustAppealId; at: Moment }) {
  // The appeal and its evidence summary as DEMO_DATA records them. Operators can't type a Trust level.
  const appeal = TRUST_APPEALS[id]
  const seller = SELLERS[appeal.seller]
  const evidence = appeal.evidence
  const [action, setAction] = useState('')
  const since = (date: string) => (date.length > 7 ? formatDayMonth(date) : formatMonthShortYear(date))
  return (
    <div className="space-y-5">
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Current Trust level"><div className="font-display text-3xl font-semibold" style={{ color: TEXT }}>{trustAt(appeal.seller, at) ?? '—'}</div><p className="mt-2 text-xs" style={{ color: MUTED }}>Read-only, domain-controlled Trust state.</p></CaseSection>
        <CaseSection title="Appeal"><CaseGrid rows={[['Seller', `${seller.name} · ${seller.handle}`], ['Submitted', `${formatDayMonth(appeal.submitted)} · ${formatClock(appeal.submitted)}`], ['Appeal reason', appeal.reason], ['Requested outcome', '—']]} /></CaseSection>
        <CaseSection title="History"><CaseTimeline events={[...seller.trustHistory.map(change => `${since(change.since)} · ${change.level}`), `${formatDayMonth(appeal.submitted)} · Appeal submitted`]} /></CaseSection>
        <CaseSection title="Evidence"><EvidenceLine label="Fulfilment reliability" value={`${evidence.fulfilmentReliabilityPercent}% · ${formatDayMonth(evidence.from)} – ${formatDayMonth(evidence.to)}`} /><EvidenceLine label="Claims" value={`${evidence.upheldClaims.total} upheld · ${evidence.upheldClaims.notAsDescribed} not as described, ${evidence.upheldClaims.damaged} damaged`} /><EvidenceLine label="Paid Orders" value={String(evidence.paidOrders)} /></CaseSection>
        <CaseSection title="Policy"><CaseGrid rows={[['Policy', '—'], ['Evaluation window', `${formatDate(evidence.from)} – ${formatDate(evidence.to)}`], ['Current policy version', appeal.policyVersion], ['Decision source', 'Domain workflow + approved review']]} /></CaseSection>
        <CaseSection title="Control boundary"><CaseNotice>Operators review evidence and record an appeal outcome. Trust levels are not directly typed, selected, or edited.</CaseNotice></CaseSection>
      </div>
      <CaseSection title="Appeal actions"><div className="flex gap-2"><OperatorButton onClick={() => setAction('Appeal evidence accepted for domain re-evaluation. Trust level was not directly changed.')}>Submit for Re-evaluation</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction(`Appeal denied under ${appeal.policyVersion}. Current level remains domain-controlled.`)}>Deny Appeal</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Trust Appeal escalated for senior review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function CaseSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}><div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{title}</div>{children}</section>
}

function CaseGrid({ rows }: { rows: [string, string][] }) {
  return <div className="grid grid-cols-2 gap-4">{rows.map(([label, value]) => <DarkField key={label} label={label} value={value} />)}</div>
}

function EvidenceLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-4 border-t py-3 first:border-t-0 first:pt-0 last:pb-0" style={{ borderColor: BORDER }}><span className="text-xs" style={{ color: MUTED }}>{label}</span><span className="text-right text-xs font-semibold" style={{ color: TEXT }}>{value}</span></div>
}

function CaseTimeline({ events }: { events: string[] }) {
  return <div>{events.map((event, index) => <div key={event} className="flex gap-3 pb-3 last:pb-0"><span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: index === events.length - 1 ? ACCENT : MUTED }} /><span className="text-xs leading-relaxed" style={{ color: index === events.length - 1 ? TEXT : MUTED }}>{event}</span></div>)}</div>
}

function CaseNotice({ children }: { children: ReactNode }) {
  return <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed" style={{ background: RAISED, color: MUTED }}>{children}</div>
}

function CaseAction({ label, detail }: { label: string; detail: string }) {
  const [done, setDone] = useState(false)
  return <button onClick={() => setDone(true)} className="mb-2 w-full rounded-lg border p-3 text-left last:mb-0" style={{ borderColor: BORDER, background: done ? `${ACCENT}14` : RAISED }}><span className="block text-xs font-semibold" style={{ color: done ? ACCENT : TEXT }}>{done ? 'Recorded · ' : ''}{label}</span><span className="mt-1 block text-[10px]" style={{ color: MUTED }}>{detail}</span></button>
}

function DistributionEffect({ surface, affected }: { surface: string; affected: boolean }) {
  return <div className="rounded-lg p-3" style={{ background: RAISED }}><div className="text-xs font-semibold" style={{ color: TEXT }}>{surface}</div><div className="mt-1 text-[10px]" style={{ color: affected ? 'var(--color-danger)' : 'var(--color-success)' }}>{affected ? 'Removed from surface' : 'No distribution change'}</div></div>
}

function EvidenceTileDark({ label }: { label: string }) {
  return <div className="flex h-20 items-end rounded-lg border p-3 text-[10px] font-semibold" style={{ borderColor: BORDER, background: RAISED, color: MUTED }}>{label}</div>
}

function ActionResult({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border p-4 text-sm font-semibold" style={{ borderColor: `${ACCENT}50`, background: `${ACCENT}12`, color: ACCENT }}>{children}</div>
}

type SearchEntity = 'Account' | 'Seller' | 'Order' | 'Claim' | 'Content'
interface SearchResult { type: SearchEntity; ref: string; title: string; detail: string; restricted: boolean }

/** Every searchable canonical record at the story moment: Buyer accounts, Sellers, Orders, Claims and Shoppable Posts. */
function searchRecords(at: Moment): SearchResult[] {
  const post = (id: (typeof SHOPPABLE_POST_IDS)[number]) => (SHOPPABLE_POSTS[id].publication === 'Draft' ? 'Draft' : restrictionAt(id, at) ? 'Restricted' : 'Published')
  return [
    ...keys(BUYERS).map(id => ({ type: 'Account' as const, ref: id, title: BUYERS[id].name, detail: `Buyer account · ${MARKET.city}`, restricted: true })),
    ...SELLER_IDS.map(id => ({ type: 'Seller' as const, ref: id, title: SELLERS[id].name, detail: `${SELLERS[id].handle} · ${trustLabel(trustAt(id, at))}${SELLERS[id].storeOpen ? ' · Store open' : ''}`, restricted: true })),
    ...ORDER_IDS.filter(id => orderStateAt(id, at) !== null).map(id => ({ type: 'Order' as const, ref: id, title: `${SELLERS[ORDERS[id].seller].name} → ${shortName(BUYERS[ORDERS[id].buyer].name)}`, detail: `${orderStateAt(id, at)} · ${MARKET.id}`, restricted: false })),
    ...CLAIM_IDS.filter(id => claimStateAt(id, at) !== null).map(id => ({ type: 'Claim' as const, ref: id, title: CLAIMS[id].issue, detail: `${claimStateAt(id, at)} · ${CLAIMS[id].order}`, restricted: false })),
    ...SHOPPABLE_POST_IDS.filter(id => happenedBefore(SHOPPABLE_POSTS[id].created, at)).map(id => ({ type: 'Content' as const, ref: id, title: SHOPPABLE_POSTS[id].title, detail: `${post(id)} · ${SELLERS[SHOPPABLE_POSTS[id].seller].name}`, restricted: false })),
  ]
}

function SearchPanel({ at, mode }: { at: Moment; mode: 'global' | 'seller' | 'account' }) {
  const [query, setQuery] = useState(mode === 'seller' ? 'addis' : mode === 'account' ? 'Maya' : '')
  const [type, setType] = useState(mode === 'global' ? 'All' : mode === 'seller' ? 'Seller' : 'Account')
  const [accessTarget, setAccessTarget] = useState<string | null>(null)
  const [accessGranted, setAccessGranted] = useState<string[]>([])
  const [opened, setOpened] = useState<SearchResult | null>(null)
  const results = searchRecords(at).filter(result => {
    const scopeMatch = (type === 'All' || result.type === type) && (mode === 'global' || result.type.toLowerCase() === mode)
    const queryMatch = !query || `${result.ref} ${result.title} ${result.detail}`.toLowerCase().includes(query.toLowerCase())
    return scopeMatch && queryMatch
  })
  return (
    <div className="mx-auto max-w-6xl p-8">
      <OperatorHeader title={mode === 'global' ? 'Global Search' : mode === 'seller' ? 'Seller Search' : 'Account Search'} description="Search presentation-safe public and business references. Internal UUIDs are never displayed." />
      <div className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="grid grid-cols-[1fr_180px] gap-3"><SearchInput value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} placeholder="Search name, handle, or public reference" /><DarkSelect label="Entity type" value={type} options={mode === 'global' ? ['All', 'Account', 'Seller', 'Order', 'Claim', 'Content'] : [mode === 'seller' ? 'Seller' : 'Account']} onChange={setType} /></div>
      </div>
      <div className="rtable rtable-scroll mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '640px' } as CSSProperties}>
        <div className="rtable-head grid grid-cols-[110px_220px_1fr_150px] gap-4 px-5 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Type</span><span>Reference</span><span>Result</span><span>Access</span></div>
        {results.map(result => {
          const granted = accessGranted.includes(result.ref)
          return <div key={result.ref} className="rtable-row grid grid-cols-[110px_220px_1fr_150px] items-center gap-4 border-t px-5 py-4" style={{ borderColor: BORDER }}><span className="rtable-cell" data-label="Type"><OperatorState tone="neutral">{result.type}</OperatorState></span><span className="rtable-primary font-mono text-xs font-semibold" style={{ color: ACCENT }}>{result.ref}</span><span data-label="Result" className="rtable-wide"><span className="block text-sm font-semibold" style={{ color: TEXT }}>{result.title}</span><span className="text-xs" style={{ color: MUTED }}>{result.detail}</span></span>{result.restricted && !granted ? <button onClick={() => setAccessTarget(result.ref)} className="rounded px-3 py-2 text-xs font-semibold" style={{ background: RAISED, color: ACCENT }}>Reason for Access</button> : <OperatorButton variant="secondary" onClick={() => setOpened(result)}>Open</OperatorButton>}</div>
        })}
      </div>
      <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, color: MUTED }}>Search is scoped to supported domain entities: Account, Seller, Order, Claim, and Content. Generic database browsing or editing is not available.</div>
      {accessTarget && <ReasonForAccessOverlay target={accessTarget} onClose={() => setAccessTarget(null)} onConfirm={() => { setAccessGranted(values => [...values, accessTarget]); setAccessTarget(null) }} />}
      {opened && <SearchResultDrawer reference={opened.ref} entity={opened.type} onClose={() => setOpened(null)} />}
    </div>
  )
}

function SearchResultDrawer({ reference, entity, onClose }: { reference: string; entity: SearchEntity; onClose: () => void }) {
  // The result's own record type, never guessed from its reference.
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,.58)' }} onClick={onClose}>
      <div className="operator-panel h-full w-[480px] border-l p-6 shadow-xl" style={{ borderColor: BORDER, background: SURFACE }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><div className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{reference}</div><div className="mt-1 font-display text-2xl font-semibold" style={{ color: TEXT }}>{entity} summary</div></div><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: RAISED, color: MUTED }}>×</button></div>
        <div className="mt-6 grid grid-cols-2 gap-5"><DarkField label="Entity type" value={entity} /><DarkField label="Market" value={MARKET.id} /><DarkField label="Reference" value={reference} /><DarkField label="Access" value={entity === 'Account' || entity === 'Seller' ? 'Reason recorded' : 'Operational'} /></div>
        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: BORDER, background: RAISED }}><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Presentation-safe summary</div><p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT }}>Supported domain information is shown through named workflows. Raw database fields and internal identifiers are not available.</p></div>
        <div className="mt-6 text-xs" style={{ color: MUTED }}>Opening this result is recorded in the Operator audit trail.</div>
      </div>
    </div>
  )
}

function ReasonForAccessOverlay({ target, onClose, onConfirm }: { target: string; onClose: () => void; onConfirm: () => void }) {
  const [reason, setReason] = useState('')
  const [caseRef, setCaseRef] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.68)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border p-6 shadow-xl" style={{ borderColor: BORDER, background: SURFACE }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${ACCENT}18`, color: ACCENT }}><IconKey size={18} /></span><div><div className="font-display text-xl font-semibold" style={{ color: TEXT }}>Reason for Access</div><div className="mt-1 font-mono text-xs" style={{ color: MUTED }}>{target} · Restricted information</div></div></div>
        <p className="mt-5 text-sm leading-relaxed" style={{ color: MUTED }}>Provide a work-related reason before viewing restricted account or Seller information. Access is time-stamped and written to the audit log.</p>
        <div className="mt-5"><TextInput label="Case or work reference" value={caseRef} onChange={event => setCaseRef(event.target.value)} placeholder={`e.g. ${keys(SUPPORT_CASES)[0]}`} /></div>
        <div className="mt-4"><Textarea label="Access reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this information is required for the current workflow." rows={4} /></div>
        <div className="mt-5 flex justify-end gap-2"><OperatorButton variant="secondary" onClick={onClose}>Cancel</OperatorButton><OperatorButton disabled={!reason || !caseRef} onClick={onConfirm}>Record Reason & Continue</OperatorButton></div>
      </div>
    </div>
  )
}

function FounderDecisionsPanel({ at }: { at: Moment }) {
  // DEMO_DATA's Founder decision under dual review (Flow J): the Claim it resolves, its evidence and its history. The
  // panel opens at the decision's state at the story moment, with the Founder who acts next.
  const { focus } = useStory()
  const decisionId = focus?.decision ?? keys(DECISIONS)[0]
  const decision = DECISIONS[decisionId]
  const claimId = CLAIM_IDS.find(id => CLAIMS[id].decision === decisionId)
  const claim = claimId && CLAIMS[claimId]
  const order = claim && ORDERS[claim.order]
  const role = (id: keyof typeof OPERATORS) => OPERATORS[id].role as FounderActor
  const proposed = happenedBefore(decision.proposed, at)
  const approved = happenedBefore(decision.approved, at)
  const [actor, setActor] = useState<FounderActor>(approved ? role(decision.approvedBy) : proposed ? role(decision.approvedBy) : role(decision.proposedBy))
  const [phase, setPhase] = useState<'review' | 'proposal' | 'approval' | 'returned' | 'executed'>(approved ? 'executed' : proposed ? 'approval' : 'review')
  const [proposal, setProposal] = useState(proposed ? decision.text : '')
  const [proposer, setProposer] = useState<FounderActor | null>(proposed ? role(decision.proposedBy) : null)
  const [returnReason, setReturnReason] = useState('')
  const history = [
    ...(claim ? claim.history.filter(entry => happenedBefore(entry.at, at)).map(entry => `${dayTime(entry.at)} · ${entry.state === 'Open' ? `${claimId} submitted` : `${claimId} ${entry.state}${entry.by ? ` · ${OPERATORS[entry.by].role}` : ''}`}`) : []),
    ...(proposed ? [`${dayTime(decision.proposed)} · ${role(decision.proposedBy)} proposed ${decisionId}`] : []),
    ...(approved ? [`${dayTime(decision.approved)} · ${role(decision.approvedBy)} approved ${decisionId}`] : []),
  ]
  const otherFounder = actor === 'CEO' ? 'COO/CTO' : 'CEO'
  const needsReview = phase === 'review' || phase === 'returned'
  const needsApproval = phase === 'approval' && proposer !== actor
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Founder Decisions" description="Material decisions require evidence, a proposal, and review by the other Founder." trailing={<FounderSwitcher actor={actor} setActor={setActor} />} />
      <div className="mb-5 grid grid-cols-2 gap-4">
        <button className="rounded-2xl border p-5 text-left" style={{ borderColor: needsReview ? ACCENT : BORDER, background: needsReview ? `${ACCENT}10` : SURFACE }}><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Needs My Review</div><div className="mt-2 font-mono text-3xl font-bold" style={{ color: needsReview ? ACCENT : TEXT }}>{needsReview ? 1 : 0}</div><div className="mt-1 text-xs" style={{ color: MUTED }}>{actor} review queue</div></button>
        <button className="rounded-2xl border p-5 text-left" style={{ borderColor: needsApproval ? ACCENT : BORDER, background: needsApproval ? `${ACCENT}10` : SURFACE }}><div className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Needs My Approval</div><div className="mt-2 font-mono text-3xl font-bold" style={{ color: needsApproval ? ACCENT : TEXT }}>{needsApproval ? 1 : 0}</div><div className="mt-1 text-xs" style={{ color: MUTED }}>{needsApproval ? `Proposal by ${proposer}` : 'No proposal awaiting this Founder'}</div></button>
      </div>
      <div className="grid grid-cols-[1.35fr_.65fr] gap-5">
        <div className="flex flex-col gap-5">
          <DarkPanel title={`Material decision · ${proposed || !claimId ? decisionId : claimId}`}>
            <div className="flex items-start justify-between"><div><div className="font-display text-xl font-semibold" style={{ color: TEXT }}>{claim ? `${claimId} · ${claim.issue}` : decisionId}</div><p className="mt-1 text-xs" style={{ color: MUTED }}>Controlled domain action · Claim decision</p></div><OperatorState tone={phase === 'executed' ? 'success' : phase === 'returned' ? 'danger' : 'warning'}>{phase === 'review' ? 'Evidence Review' : phase === 'proposal' ? 'Proposal Draft' : phase === 'approval' ? 'Awaiting Approval' : phase === 'returned' ? 'Returned' : 'Executed'}</OperatorState></div>
          </DarkPanel>
          <DarkPanel title="Review evidence">
            {claim && order && claimId && <div className="grid grid-cols-2 gap-4"><GovernanceEvidence title="Claim" value={`${claim.issue}: “${claim.statement}”`} source={claimId} /><GovernanceEvidence title="Evidence" value={`${claim.evidencePhotos} Buyer photo${claim.evidencePhotos === 1 ? '' : 's'}`} source={claimId} /><GovernanceEvidence title="Payment" value={`Paid · ${formatEtb(orderTotals(claim.order).total)}`} source={paymentReference(claim.order)} /><GovernanceEvidence title="Handoff" value={`${handoffText(order.finalHandoff, 'Recipient scan')}${order.finalHandoff?.location ? ` · location ${order.finalHandoff.location}` : ''}`} source={claim.order} /></div>}
            <div className="mt-4"><CaseTimeline events={history.length ? history : ['—']} /></div>
          </DarkPanel>
          {(phase === 'proposal' || phase === 'returned') && (
            <DarkPanel title="Decision Proposal">
              {phase === 'returned' && <div className="mb-4 rounded-lg p-3 text-xs" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>Returned for Changes: {returnReason || 'Clarify rollback trigger and first-day queue owner.'}</div>}
              <Textarea label="Proposed controlled action" value={proposal} onChange={event => setProposal(event.target.value)} rows={5} placeholder="State the proposed domain action, evidence basis, safeguards, and rollback condition." />
              <div className="mt-4 flex justify-end"><OperatorButton disabled={!proposal} onClick={() => { setProposer(actor); setPhase('approval') }}>Create Proposal for {otherFounder} Approval</OperatorButton></div>
            </DarkPanel>
          )}
          {phase === 'approval' && (
            <DarkPanel title="Approval">
              <CaseNotice>Proposal created by {proposer}. The other Founder must approve or return it. The proposer cannot self-approve.</CaseNotice>
              <div className="mt-4 rounded-xl p-4 text-sm leading-relaxed" style={{ background: RAISED, color: TEXT }}>{proposal}</div>
              <div className="mt-4"><Textarea label="Return for Changes reason" value={returnReason} onChange={event => setReturnReason(event.target.value)} rows={3} placeholder="Required only when returning the proposal." /></div>
              <div className="mt-4 flex gap-2"><OperatorButton disabled={actor === proposer} onClick={() => setPhase('executed')}>Approve & Execute Controlled Action</OperatorButton><OperatorButton variant="secondary" disabled={actor === proposer || !returnReason} onClick={() => { setPhase('returned'); if (proposer) setActor(proposer) }}>Return for Changes</OperatorButton></div>
              {actor === proposer && <div className="mt-3 text-xs" style={{ color: ACCENT }}>Switch to {otherFounder} to demonstrate independent approval.</div>}
            </DarkPanel>
          )}
          {phase === 'executed' && <ActionResult>Approved by {actor}. Controlled action executed and written to Audit.</ActionResult>}
        </div>
        <div className="flex flex-col gap-5">
          <DarkPanel title="Workflow">
            <GovernanceStep number="01" label="Review evidence" active={phase === 'review'} done={phase !== 'review'} />
            <GovernanceStep number="02" label="Create Proposal" active={phase === 'proposal' || phase === 'returned'} done={phase === 'approval' || phase === 'executed'} />
            <GovernanceStep number="03" label="Other Founder approves or returns" active={phase === 'approval'} done={phase === 'executed'} />
            <GovernanceStep number="04" label="Controlled domain action" active={phase === 'executed'} done={phase === 'executed'} />
            <GovernanceStep number="05" label="Audit record" active={phase === 'executed'} done={phase === 'executed'} />
          </DarkPanel>
          {phase === 'review' && <OperatorButton onClick={() => setPhase('proposal')}>Review Complete · Create Proposal</OperatorButton>}
          <DarkPanel title="Approval History"><ApprovalHistory at={at} /></DarkPanel>
        </div>
      </div>
    </div>
  )
}

function OperatorAccessPanel({ soloState, setSoloState }: { soloState: SoloState; setSoloState: (state: SoloState) => void }) {
  const [actor, setActor] = useState<FounderActor>('COO/CTO')
  const [reauth, setReauth] = useState(false)
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('60 minutes')
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Operator Access" description="Founder access, exceptional Solo Coverage, and future staff reference." trailing={<FounderSwitcher actor={actor} setActor={setActor} />} />
      <div className="grid grid-cols-[1.2fr_.8fr] gap-5">
        <div className="flex flex-col gap-5">
          <DarkPanel title="Current Founder access">
            <AccessRow name="CEO" scope="Material review · Approval · Controlled actions" status="Active" />
            <AccessRow name="COO/CTO" scope="Operations · Technical governance · Approval" status="Active" />
            <CaseNotice>Material decisions normally require both Founders. Solo Coverage is not an everyday operating mode.</CaseNotice>
          </DarkPanel>
          <DarkPanel title="Future Staff Operations · Reference">
            <div className="mb-3 text-xs" style={{ color: MUTED }}>Future staffing assigns focused queues and escalation paths without duplicating the Founder Console.</div>
            <FutureRole role="COO/CTO" queues="Cross-queue operations" escalation="CEO for material decisions" />
            <FutureRole role="Support" queues="Support queue" escalation="COO/CTO · Claims where needed" />
            <FutureRole role="Moderator" queues="Moderation queue" escalation="COO/CTO · Policy review" />
            <FutureRole role="Claim Reviewer" queues="Claims queue" escalation="COO/CTO · Material decisions" />
            <FutureRole role="Verification/Recovery Staff" queues="Verification / Recovery" escalation="COO/CTO · Elevated risk" />
          </DarkPanel>
        </div>
        <DarkPanel title="Solo Coverage">
          {soloState === 'active' && <div className="mb-5 rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}><div className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Exceptional Solo Coverage active</div><div className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Activated by {actor} · Reason audited · Expires in 42m</div><button onClick={() => setSoloState('expired')} className="mt-3 text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>Preview Expiry State</button></div>}
          {soloState === 'expired' && <div className="mb-5 rounded-xl p-4" style={{ background: RAISED }}><div className="text-sm font-semibold" style={{ color: TEXT }}>Solo Coverage expired</div><div className="mt-1 text-xs" style={{ color: MUTED }}>Dual-review requirements are restored. A new activation requires fresh reauthentication.</div><OperatorButton variant="secondary" onClick={() => { setSoloState('inactive'); setReauth(false); setConfirmed(false); setReason('') }}>Start New Activation</OperatorButton></div>}
          {soloState === 'inactive' && <>
            <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)', background: `${ACCENT}08` }}><div className="text-sm font-semibold" style={{ color: ACCENT }}>Exceptional use only</div><p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>Use only when the other Founder is genuinely unavailable and delay would create material operational risk.</p></div>
            <div className="mt-5"><button onClick={() => setReauth(true)} className="flex w-full items-center justify-between rounded-lg border p-3 text-left" style={{ borderColor: reauth ? 'var(--color-success)' : BORDER, background: RAISED }}><span><span className="block text-xs font-semibold" style={{ color: TEXT }}>Fresh reauthentication</span><span className="text-[10px]" style={{ color: MUTED }}>Required immediately before activation</span></span><OperatorState tone={reauth ? 'success' : 'warning'}>{reauth ? 'Verified' : 'Required'}</OperatorState></button></div>
            <div className="mt-4"><Textarea label="Exceptional reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Explain why dual review is temporarily unavailable and why delay creates risk." /></div>
            <div className="mt-4"><div className="mb-2 text-xs font-semibold" style={{ color: MUTED }}>Expected duration</div><div className="flex gap-2">{['30 minutes', '60 minutes', '2 hours'].map(value => <button key={value} onClick={() => setDuration(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: duration === value ? ACCENT : BORDER, color: duration === value ? ACCENT : MUTED, background: duration === value ? `${ACCENT}12` : SURFACE }}>{value}</button>)}</div></div>
            <button onClick={() => setConfirmed(!confirmed)} className="mt-4 flex items-start gap-3 text-left"><span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border" style={{ borderColor: confirmed ? ACCENT : BORDER, background: confirmed ? ACCENT : SURFACE, color: BG }}>{confirmed && '✓'}</span><span className="text-xs leading-relaxed" style={{ color: MUTED }}>I confirm this is exceptional, time-bound, audited, and that normal dual-review controls resume at expiry.</span></button>
            <OperatorButton disabled={!reauth || !reason || !confirmed} onClick={() => setSoloState('active')}>Activate Solo Coverage for {duration}</OperatorButton>
          </>}
        </DarkPanel>
      </div>
    </div>
  )
}

function AuditPanel() {
  const [filter, setFilter] = useState('All')
  // DEMO_DATA's audit records (specification §49), most recent first.
  const events = AUDIT_LOG.slice().reverse()
    .map(event => [dayTime(event.at), event.actor, event.action, event.target, event.reason, event.result])
    .filter(event => filter === 'All' || event[1] === filter)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Audit" description="Immutable record of privileged access, Founder decisions, and controlled actions." trailing={<DarkSelect label="Actor" value={filter} options={['All', 'CEO', 'COO/CTO', 'System']} onChange={setFilter} />} />
      <div className="rtable rtable-scroll overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE, '--rtable-min': '640px' } as CSSProperties}>
        <div className="rtable-head grid grid-cols-[110px_120px_1.2fr_180px_1.4fr_100px] gap-3 px-4 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Timestamp</span><span>Actor</span><span>Action</span><span>Target</span><span>Reason</span><span>Result</span></div>
        {events.map(event => <div key={`${event[0]}-${event[2]}`} className="rtable-row grid grid-cols-[110px_120px_1.2fr_180px_1.4fr_100px] items-center gap-3 border-t px-4 py-4 text-xs" style={{ borderColor: BORDER, color: TEXT }}><span className="rtable-primary font-mono" style={{ color: MUTED }}>{event[0]}</span><span data-label="Actor" className="font-semibold">{event[1]}</span><span data-label="Action">{event[2]}</span><span data-label="Target" className="font-mono" style={{ color: ACCENT }}>{event[3]}</span><span data-label="Reason" className="rtable-wide" style={{ color: MUTED }}>{event[4]}</span><span className="rtable-cell" data-label="Result"><OperatorState tone={event[5] === 'Succeeded' ? 'success' : event[5] === 'Returned' ? 'warning' : 'neutral'}>{event[5]}</OperatorState></span></div>)}
      </div>
    </div>
  )
}

function ConfigurationPanel() {
  const [proposal, setProposal] = useState('')
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Configuration" description="Current launch configuration. Material changes enter Founder Decision flow." />
      {proposal && <ActionResult>{proposal}</ActionResult>}
      <div className="mt-5 grid grid-cols-2 gap-5">
        {/* DEMO_DATA defines the market and the Trust policy version only; other settings and statuses are undefined. */}
        <DarkPanel title="Market configuration"><ConfigRow label="Market" value={`${MARKET.id} · ${MARKET.city}`} /><ConfigRow label="Seller admission" value="—" /><ConfigRow label="Buyer availability" value="—" /><ConfigRow label="Courier mode" value="Approved Seller Pools" /><ProposeButton onClick={() => setProposal(`Decision Proposal created for ${MARKET.id} market configuration change.`)}>Propose Market Change</ProposeButton></DarkPanel>
        <DarkPanel title="Feature flags"><ConfigRow label="Buyer Discovery" value="Enabled" /><ConfigRow label="Seller Companion" value="Enabled" /><ConfigRow label="Courier Mode" value="Enabled" /><ConfigRow label="Manual Handoff" value="Exceptional only" /><ProposeButton onClick={() => setProposal('Decision Proposal created for launch feature flag change.')}>Propose Flag Change</ProposeButton></DarkPanel>
        <DarkPanel title="Provider status"><ConfigRow label="Payment provider" value="—" /><ConfigRow label="Callback reconciliation" value="—" /><ConfigRow label="Notifications" value="—" /><ConfigRow label="Media processing" value="—" /></DarkPanel>
        <DarkPanel title="Policy versions"><ConfigRow label="Seller Admission" value="—" /><ConfigRow label="Content Accuracy" value="—" /><ConfigRow label="Seller Trust" value={[...new Set(keys(TRUST_APPEALS).map(id => TRUST_APPEALS[id].policyVersion))].join(', ') || '—'} /><ConfigRow label="Claims" value="—" /><ProposeButton onClick={() => setProposal('Decision Proposal created for policy version activation.')}>Propose Policy Activation</ProposeButton></DarkPanel>
      </div>
    </div>
  )
}

function SystemHealthPanel() {
  // The specification's service list (§49). DEMO_DATA records no service status, metrics or incidents.
  const systems = ['Database', 'Queues', 'Background jobs', 'Payment reconciliation', 'Notifications', 'Media', 'Privacy services', 'Payment provider'].map(name => [name, '—', '—'])
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="System Health" description="Launch-critical services, incidents, and recovery posture." />
      <div className="grid grid-cols-4 gap-4">{systems.map(([name, status, detail]) => <div key={name} className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}><div className="flex items-start justify-between"><span className="text-sm font-semibold" style={{ color: TEXT }}>{name}</span><span className="h-2.5 w-2.5 rounded-full bg-border-strong" /></div><div className="mt-5 font-mono text-xs font-semibold" style={{ color: MUTED }}>{status}</div><div className="mt-1 text-[10px]" style={{ color: MUTED }}>{detail}</div></div>)}</div>
      <div className="mt-5 grid grid-cols-[1.3fr_.7fr] gap-5"><DarkPanel title="Active incident"><div className="text-xs" style={{ color: MUTED }}>—</div></DarkPanel><DarkPanel title="Launch posture"><ControlRow label="Critical services" value="—" /><ControlRow label="Data loss" value="—" /><ControlRow label="Manual intervention" value="—" /><ControlRow label="Next review" value="—" /></DarkPanel></div>
    </div>
  )
}

function FounderSwitcher({ actor, setActor }: { actor: FounderActor; setActor: (actor: FounderActor) => void }) {
  return <div className="flex rounded-lg p-1" style={{ background: RAISED }}>{(['CEO', 'COO/CTO'] as FounderActor[]).map(value => <button key={value} onClick={() => setActor(value)} className="rounded px-3 py-2 text-xs font-semibold" style={{ background: actor === value ? SURFACE : 'transparent', color: actor === value ? ACCENT : MUTED }}>{value}</button>)}</div>
}

function GovernanceEvidence({ title, value, source }: { title: string; value: string; source: string }) {
  return <div className="rounded-lg border p-3" style={{ borderColor: BORDER, background: RAISED }}><div className="text-xs font-semibold" style={{ color: TEXT }}>{title}</div><div className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>{value}</div><div className="mt-2 font-mono text-[9px]" style={{ color: ACCENT }}>{source}</div></div>
}

function GovernanceStep({ number, label, active, done }: { number: string; label: string; active?: boolean; done?: boolean }) {
  return <div className="flex items-center gap-3 border-t py-3 first:border-t-0" style={{ borderColor: BORDER }}><span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold" style={{ background: active || done ? ACCENT : RAISED, color: active || done ? BG : MUTED }}>{done ? '✓' : number}</span><span className="text-xs font-semibold" style={{ color: active ? ACCENT : done ? TEXT : MUTED }}>{label}</span></div>
}

function ApprovalHistory({ at }: { at: Moment }) {
  // Founder decisions approved by the story moment.
  return <div>{keys(DECISIONS).filter(id => happenedBefore(DECISIONS[id].approved, at)).map(id => <ApprovalHistoryRow key={id} refId={id} decision={DECISIONS[id].text} result="Approved" actors={`${OPERATORS[DECISIONS[id].proposedBy].role} → ${OPERATORS[DECISIONS[id].approvedBy].role}`} />)}</div>
}

function ApprovalHistoryRow({ refId, decision, result, actors }: { refId: string; decision: string; result: string; actors: string }) {
  return <div className="border-t py-3 first:border-t-0" style={{ borderColor: BORDER }}><div className="flex justify-between"><span className="font-mono text-[10px]" style={{ color: ACCENT }}>{refId}</span><OperatorState tone={result === 'Approved' ? 'success' : 'warning'}>{result}</OperatorState></div><div className="mt-1 text-xs font-semibold" style={{ color: TEXT }}>{decision}</div><div className="mt-1 text-[10px]" style={{ color: MUTED }}>{actors}</div></div>
}

function AccessRow({ name, scope, status }: { name: string; scope: string; status: string }) {
  return <div className="flex items-center justify-between border-t py-4 first:border-t-0" style={{ borderColor: BORDER }}><span><span className="block text-sm font-semibold" style={{ color: TEXT }}>{name}</span><span className="text-xs" style={{ color: MUTED }}>{scope}</span></span><OperatorState tone="success">{status}</OperatorState></div>
}

function FutureRole({ role, queues, escalation }: { role: string; queues: string; escalation: string }) {
  return <div className="grid grid-cols-[150px_1fr_1fr] gap-3 border-t py-3 text-xs first:border-t-0" style={{ borderColor: BORDER }}><span className="font-semibold" style={{ color: TEXT }}>{role}</span><span style={{ color: MUTED }}>{queues}</span><span style={{ color: MUTED }}>{escalation}</span></div>
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-t py-3 first:border-t-0" style={{ borderColor: BORDER }}><span className="text-xs" style={{ color: MUTED }}>{label}</span><span className="text-xs font-semibold" style={{ color: TEXT }}>{value}</span></div>
}

function ProposeButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="mt-3 text-xs font-semibold" style={{ color: ACCENT }}>{children} →</button>
}

function OperatorHeader({ title, description, trailing }: { title: string; description: string; trailing?: ReactNode }) {
  return <div className="mb-6 flex items-start justify-between"><div><h1 className="font-display text-3xl font-semibold" style={{ color: TEXT }}>{title}</h1><p className="mt-1 text-xs font-mono" style={{ color: MUTED }}>{description}</p></div>{trailing}</div>
}

function DarkPanel({ title, trailing, children }: { title: string; trailing?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border p-5" style={{ borderColor: BORDER, background: SURFACE }}><div className="mb-4 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{title}</h2>{trailing}</div>{children}</section>
}

function OperatorMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  const color = tone === 'danger' ? 'var(--color-danger)' : ACCENT
  return <div className="rounded-xl border p-4" style={{ borderColor: BORDER, background: SURFACE }}><div className="text-xs" style={{ color: MUTED }}>{label}</div><div className="mt-2 font-mono text-2xl font-bold" style={{ color }}>{value}</div><div className="mt-1 text-[10px]" style={{ color: MUTED }}>{detail}</div></div>
}

function OperatorState({ children, tone }: { children: ReactNode; tone: 'danger' | 'warning' | 'success' | 'neutral' }) {
  const color = tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? ACCENT : tone === 'success' ? 'var(--color-success)' : MUTED
  return <span className="inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color, background: `${color}18` }}>{children}</span>
}

function OperatorButton({ children, onClick, variant = 'primary', disabled }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-40" style={{ background: variant === 'primary' ? ACCENT : RAISED, color: variant === 'primary' ? BG : TEXT, border: `1px solid ${variant === 'secondary' ? BORDER : 'transparent'}` }}>{children}</button>
}

function DarkSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className="relative"><button onClick={() => setOpen(!open)} className="w-full rounded-lg border px-3 py-2 text-left" style={{ borderColor: BORDER, background: SURFACE }}><span className="block text-[9px] uppercase" style={{ color: MUTED }}>{label}</span><span className="mt-0.5 block truncate text-xs font-semibold" style={{ color: TEXT }}>{value} ▾</span></button>{open && <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border shadow-xl" style={{ borderColor: BORDER, background: RAISED }}>{options.map(option => <button key={option} onClick={() => { onChange(option); setOpen(false) }} className="w-full border-b px-3 py-2 text-left text-xs last:border-b-0" style={{ borderColor: BORDER, color: option === value ? ACCENT : TEXT }}>{option}</button>)}</div>}</div>
}

function DarkField({ label, value }: { label: string; value: string }) {
  return <div><div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>{label}</div><div className="mt-1 text-sm" style={{ color: TEXT }}>{value}</div></div>
}

function ControlRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between border-t py-3 first:border-t-0" style={{ borderColor: BORDER }}><span className="text-xs" style={{ color: MUTED }}>{label}</span><span className="font-mono text-xs font-semibold" style={{ color: TEXT }}>{value}</span></div>
}

function CollapseIcon({ open }: { open: boolean }) {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d={open ? 'M9 3L5 7L9 11' : 'M5 3L9 7L5 11'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

function isQueueNav(nav: NavKey) {
  return nav === 'work-queue' || nav.startsWith('wq-')
}

function queueForNav(nav: NavKey): QueueFilter {
  const map: Partial<Record<NavKey, QueueFilter>> = {
    'wq-support': 'Support', 'wq-moderation': 'Moderation', 'wq-claims': 'Claims',
    'wq-verification': 'Verification / Recovery', 'wq-trust-appeals': 'Trust Appeals', 'wq-handoff': 'Manual Handoff',
  }
  return map[nav] ?? 'All'
}
