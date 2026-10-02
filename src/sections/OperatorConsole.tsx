import { useState, type ReactNode } from 'react'
import { SearchInput, Textarea, TextInput } from '../components/ui/Input'
import {
  ConsoleTopBar, SidebarItem, SidebarSeparator, SidebarGroupLabel,
  IconGrid, IconFlag, IconShield, IconUsers, IconKey, IconClipboard,
  IconActivity, IconGlobe, IconSearch, IconOrders, IconCheck,
} from './ShellHelpers'
import { AdulisLogo } from '../App'

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
      { key: 'work-queue', label: 'Unified Work Queue', icon: <IconActivity size={14} />, badge: 31 },
      { key: 'wq-support', label: 'Support', icon: <IconOrders size={14} />, badge: 12 },
      { key: 'wq-moderation', label: 'Moderation', icon: <IconFlag size={14} />, badge: 5 },
      { key: 'wq-claims', label: 'Claims', icon: <IconClipboard size={14} />, badge: 8 },
      { key: 'wq-verification', label: 'Verification / Recovery', icon: <IconKey size={14} />, badge: 3 },
      { key: 'wq-trust-appeals', label: 'Trust Appeals', icon: <IconShield size={14} />, badge: 2 },
      { key: 'wq-handoff', label: 'Manual Handoff', icon: <IconCheck size={14} />, badge: 1 },
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
      { key: 'gov-approvals', label: 'Founder Decisions', icon: <IconCheck size={14} />, badge: 4 },
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

const WORK_ITEMS = [
  { priority: 'P0', queue: 'Claims', caseRef: 'CLM-2041', subject: 'Item not as described · ADU-24086', market: 'ET-ADD', age: '22h', assigned: 'Unassigned', state: 'Evidence Review' },
  { priority: 'P0', queue: 'Manual Handoff', caseRef: 'HND-0184', subject: 'Delivery evidence conflict · ADU-24083', market: 'ET-ADD', age: '1h', assigned: 'Sara O.', state: 'Manual Review' },
  { priority: 'P1', queue: 'Support', caseRef: 'SUP-4812', subject: 'Order status assistance · ADU-24091', market: 'ET-ADD', age: '14h', assigned: 'Unassigned', state: 'Open' },
  { priority: 'P1', queue: 'Verification / Recovery', caseRef: 'VFY-0831', subject: 'Seller account recovery · @nura-glow', market: 'ET-ADD', age: '3h', assigned: 'Mikael T.', state: 'Identity Check' },
  { priority: 'P1', queue: 'Moderation', caseRef: 'MOD-1208', subject: 'Reported Shoppable Post · SHP-018', market: 'ET-ADD', age: '6h', assigned: 'Unassigned', state: 'Policy Review' },
  { priority: 'P2', queue: 'Trust Appeals', caseRef: 'TRU-0092', subject: 'Seller Trust appeal · @buna-lane', market: 'ET-ADD', age: '8h', assigned: 'Ruth K.', state: 'Appeal Review' },
  { priority: 'P2', queue: 'Support', caseRef: 'SUP-4801', subject: 'Account notification issue · ACC-4821', market: 'ET-ADD', age: '9h', assigned: 'You', state: 'Investigating' },
]

export default function OperatorConsole({ demoTarget }: { demoTarget?: string }) {
  const initialNav = (demoTarget && ALL_NAV_ITEMS.some(item => item.key === demoTarget) ? demoTarget : 'overview') as NavKey
  const [activeNav, setActiveNav] = useState<NavKey>(initialNav)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [soloState, setSoloState] = useState<SoloState>('inactive')

  return (
    <div className="operator-console flex" style={{ height: '100%', background: BG }}>
      <aside className="flex flex-shrink-0 flex-col border-r transition-all duration-300" style={{ width: sidebarOpen ? 240 : 52, background: SURFACE, borderColor: BORDER }}>
        <div className="flex h-14 flex-shrink-0 items-center gap-2 border-b px-3" style={{ borderColor: BORDER }}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: `${ACCENT}20` }}><AdulisLogo size={18} /></div>
          {sidebarOpen && <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold" style={{ color: TEXT }}>Operator Console</p><p className="truncate text-xs" style={{ color: MUTED }}>Adulis Platform</p></div>}
          <button onClick={() => setSidebarOpen(open => !open)} aria-label={sidebarOpen ? 'Collapse Operator navigation' : 'Expand Operator navigation'} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded" style={{ color: MUTED }}><CollapseIcon open={sidebarOpen} /></button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          {NAV_STRUCTURE.map((group, index) => <div key={group.group ?? index}>{group.group && sidebarOpen && <SidebarGroupLabel label={group.group} dark />}{!group.group && index > 0 && <SidebarSeparator dark />}{group.items.map(item => <SidebarItem key={item.key} label={sidebarOpen ? item.label : ''} icon={item.icon} active={activeNav === item.key} onClick={() => setActiveNav(item.key)} dark badge={item.badge} />)}</div>)}
        </nav>
        {sidebarOpen && (soloState === 'active'
          ? <div className="mx-3 mb-3 flex-shrink-0 rounded-xl border p-3" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}><p className="text-xs font-semibold" style={{ color: 'var(--color-danger)' }}>EXCEPTIONAL SOLO COVERAGE</p><p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>Audited · Expires in 42m</p></div>
          : <div className="mx-3 mb-3 flex-shrink-0 rounded-xl border p-3" style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}10` }}><p className="text-xs font-semibold" style={{ color: ACCENT }}>PRIVILEGED SESSION</p><p className="mt-1 text-xs" style={{ color: MUTED }}>Reasoned access · Audit logging · Named actions only</p></div>)}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsoleTopBar dark />
        <div className="flex-1 overflow-y-auto">
          {activeNav === 'overview' && <OverviewPanel onQueue={() => setActiveNav('work-queue')} />}
          {isQueueNav(activeNav) && <WorkQueuePanel key={activeNav} initialQueue={queueForNav(activeNav)} />}
          {activeNav === 'search-global' && <SearchPanel mode="global" />}
          {activeNav === 'search-sellers' && <SearchPanel mode="seller" />}
          {activeNav === 'search-accounts' && <SearchPanel mode="account" />}
          {activeNav === 'gov-config' && <ConfigurationPanel />}
          {activeNav === 'gov-access' && <OperatorAccessPanel soloState={soloState} setSoloState={setSoloState} />}
          {activeNav === 'gov-approvals' && <FounderDecisionsPanel />}
          {activeNav === 'gov-audit' && <AuditPanel />}
          {activeNav === 'gov-health' && <SystemHealthPanel />}
        </div>
      </div>
    </div>
  )
}

function OverviewPanel({ onQueue }: { onQueue: () => void }) {
  const signals = [
    { label: 'Urgent Claims', value: '8', detail: '2 nearing SLA', tone: 'danger' },
    { label: 'Oldest Work', value: '22h', detail: 'CLM-2041', tone: 'danger' },
    { label: 'Moderation backlog', value: '5', detail: 'Oldest 6h', tone: 'warning' },
    { label: 'Recovery / Verification', value: '3', detail: '1 elevated risk', tone: 'warning' },
    { label: 'Manual Handoff', value: '1', detail: 'Evidence conflict', tone: 'danger' },
    { label: 'Trust Appeals', value: '2', detail: 'Oldest 8h', tone: 'warning' },
    { label: 'Pending Approvals', value: '4', detail: '2 consequential', tone: 'warning' },
    { label: 'Security alerts', value: '2', detail: '1 active session risk', tone: 'danger' },
  ]
  const health = [
    ['Claims', '8', '22h', 'Critical'], ['Support', '12', '14h', 'Warning'], ['Moderation', '5', '6h', 'Stable'],
    ['Verification / Recovery', '3', '3h', 'Stable'], ['Trust Appeals', '2', '8h', 'Warning'], ['Manual Handoff', '1', '1h', 'Stable'],
  ]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Core Operations" description="Action-oriented operational risk and queue state · 30 Sep 2026 · 09:41 UTC+3" trailing={<OperatorButton onClick={onQueue}>Open Unified Queue</OperatorButton>} />
      <div className="grid grid-cols-4 gap-3">{signals.map(signal => <OperatorMetric key={signal.label} {...signal} />)}</div>
      <div className="mt-5 grid grid-cols-[1.45fr_1fr] gap-5">
        <DarkPanel title="Queue health" trailing={<button onClick={onQueue} className="text-xs font-semibold" style={{ color: ACCENT }}>View all work</button>}>
          <div className="grid grid-cols-[1.5fr_.6fr_.7fr_.8fr] gap-3 px-3 pb-2 text-[9px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}><span>Queue</span><span>Open</span><span>Oldest</span><span>Health</span></div>
          {health.map(([queue, open, oldest, status]) => <div key={queue} className="grid grid-cols-[1.5fr_.6fr_.7fr_.8fr] items-center gap-3 border-t px-3 py-3 text-xs" style={{ borderColor: BORDER, color: TEXT }}><span className="font-semibold">{queue}</span><span className="font-mono">{open}</span><span className="font-mono" style={{ color: MUTED }}>{oldest}</span><OperatorState tone={status === 'Critical' ? 'danger' : status === 'Warning' ? 'warning' : 'success'}>{status}</OperatorState></div>)}
        </DarkPanel>
        <div className="flex flex-col gap-5">
          <DarkPanel title="Provider incidents"><div className="rounded-xl p-4" style={{ background: RAISED }}><div className="flex items-center justify-between"><span className="text-sm font-semibold" style={{ color: TEXT }}>Payment callback delays</span><OperatorState tone="warning">Monitoring</OperatorState></div><p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>Provider confirmations delayed for 7 Orders. Reconciliation remains active; no Seller action required.</p><div className="mt-3 font-mono text-[10px]" style={{ color: ACCENT }}>INC-074 · started 09:12</div></div></DarkPanel>
          <DarkPanel title="Control posture"><ControlRow label="Queue assignment" value="Audited" /><ControlRow label="Restricted access" value="Reason required" /><ControlRow label="Consequential actions" value="Approval gated" /></DarkPanel>
        </div>
      </div>
    </div>
  )
}

function WorkQueuePanel({ initialQueue }: { initialQueue: QueueFilter }) {
  const [queue, setQueue] = useState<QueueFilter>(initialQueue)
  const [priority, setPriority] = useState('All')
  const [market, setMarket] = useState('All')
  const [age, setAge] = useState('All')
  const [assignment, setAssignment] = useState('All')
  const [status, setStatus] = useState('All')
  const [claimed, setClaimed] = useState<string[]>([])
  const [opened, setOpened] = useState<(typeof WORK_ITEMS)[number] | null>(null)
  const rows = WORK_ITEMS.filter(item =>
    (queue === 'All' || item.queue === queue) &&
    (priority === 'All' || item.priority === priority) &&
    (market === 'All' || item.market === market) &&
    (assignment === 'All' || (assignment === 'Unassigned' ? item.assigned === 'Unassigned' : item.assigned !== 'Unassigned')) &&
    (status === 'All' || item.state === status) &&
    (age === 'All' || (age === 'Over 8h' ? parseInt(item.age) >= 8 : parseInt(item.age) < 8))
  )
  const claim = (caseRef: string) => setClaimed(values => values.includes(caseRef) ? values : [...values, caseRef])
  return (
    <div className="mx-auto max-w-[1500px] p-8">
      <OperatorHeader title="Unified Work Queue" description="Prioritized operational cases across named workflows. Claiming assigns work only." />
      <div className="mb-4 grid grid-cols-6 gap-2">
        <DarkSelect label="Priority" value={priority} options={['All', 'P0', 'P1', 'P2']} onChange={setPriority} />
        <DarkSelect label="Market" value={market} options={['All', 'ET-ADD']} onChange={setMarket} />
        <DarkSelect label="Queue" value={queue} options={['All', 'Support', 'Moderation', 'Claims', 'Verification / Recovery', 'Trust Appeals', 'Manual Handoff']} onChange={value => setQueue(value as QueueFilter)} />
        <DarkSelect label="Age" value={age} options={['All', 'Over 8h', 'Under 8h']} onChange={setAge} />
        <DarkSelect label="Assignment" value={assignment} options={['All', 'Unassigned', 'Assigned']} onChange={setAssignment} />
        <DarkSelect label="Status" value={status} options={['All', 'Open', 'Evidence Review', 'Policy Review', 'Manual Review', 'Investigating']} onChange={setStatus} />
      </div>
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="grid grid-cols-[70px_150px_110px_1.5fr_90px_70px_120px_130px_150px] gap-3 px-4 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Priority</span><span>Queue</span><span>Case</span><span>Subject</span><span>Market</span><span>Age</span><span>Assigned To</span><span>Workflow State</span><span>Actions</span></div>
        {rows.map(item => {
          const isClaimed = claimed.includes(item.caseRef)
          return <div key={item.caseRef} className="grid grid-cols-[70px_150px_110px_1.5fr_90px_70px_120px_130px_150px] items-center gap-3 border-t px-4 py-4 text-xs" style={{ borderColor: BORDER, color: TEXT }}><OperatorState tone={item.priority === 'P0' ? 'danger' : item.priority === 'P1' ? 'warning' : 'neutral'}>{item.priority}</OperatorState><span>{item.queue}</span><span className="font-mono font-semibold" style={{ color: ACCENT }}>{item.caseRef}</span><span className="truncate">{item.subject}</span><span className="font-mono" style={{ color: MUTED }}>{item.market}</span><span className="font-mono">{item.age}</span><span>{isClaimed ? 'You' : item.assigned}</span><span>{item.state}</span><span className="flex gap-1"><button disabled={isClaimed || item.assigned !== 'Unassigned'} onClick={() => claim(item.caseRef)} className="rounded px-2 py-1.5 text-[10px] font-semibold disabled:opacity-40" style={{ background: RAISED, color: TEXT }}>{isClaimed ? 'Claimed' : 'Claim'}</button><button onClick={() => setOpened(item)} className="rounded px-2 py-1.5 text-[10px] font-semibold" style={{ background: ACCENT, color: BG }}>Open</button></span></div>
        })}
      </div>
      <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, background: SURFACE, color: MUTED }}>Claim Work Item changes assignment to the current Operator. It does not alter payment, Order, claim, moderation, verification, Trust, or handoff business state.</div>
      {opened && <CaseWorkspace item={opened} onClose={() => setOpened(null)} />}
    </div>
  )
}

function CaseWorkspace({ item, onClose }: { item: (typeof WORK_ITEMS)[number]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${item.queue} case workspace`} style={{ background: 'rgba(0,0,0,.58)' }} onClick={onClose}>
      <div className="flex h-full w-[920px] flex-col border-l shadow-xl" style={{ borderColor: BORDER, background: BG }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b p-6" style={{ borderColor: BORDER, background: SURFACE }}><div><div className="flex items-center gap-3"><span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{item.caseRef}</span><OperatorState tone={item.priority === 'P0' ? 'danger' : 'warning'}>{item.priority}</OperatorState><OperatorState tone="neutral">{item.state}</OperatorState></div><div className="mt-2 font-display text-2xl font-semibold" style={{ color: TEXT }}>{item.queue} Case Workspace</div><div className="mt-1 text-xs" style={{ color: MUTED }}>{item.subject} · {item.market} · {item.age} old</div></div><button onClick={onClose} aria-label="Close case workspace" className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: RAISED, color: MUTED }}>×</button></div>
        <div className="flex-1 overflow-y-auto p-6">
          {item.queue === 'Support' && <SupportCase />}
          {item.queue === 'Moderation' && <ModerationCase />}
          {item.queue === 'Claims' && <ClaimCase />}
          {item.queue === 'Verification / Recovery' && <VerificationCase />}
          {item.queue === 'Manual Handoff' && <HandoffCase />}
          {item.queue === 'Trust Appeals' && <TrustAppealCase />}
        </div>
      </div>
    </div>
  )
}

function SupportCase() {
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState(['09:18 · Buyer reports Order status has not refreshed.', '09:24 · Provider and fulfilment records checked.'])
  return (
    <div className="grid grid-cols-[1.35fr_.65fr] gap-5">
      <div className="flex flex-col gap-5">
        <CaseSection title="Account / Seller"><CaseGrid rows={[['Account', 'ACC-4821 · Maya T.'], ['Seller', 'SELL-ADDIS-ATELIER · Addis Atelier'], ['Relationship', 'Buyer–Seller Order thread'], ['Account state', 'Active']]} /></CaseSection>
        <CaseSection title="Order"><CaseGrid rows={[['Seller Order', 'ADU-24091'], ['Product', 'Habesha Kemis — Classic White'], ['Status', 'Paid · Needs preparation'], ['Total', 'ETB 2,994']]} /></CaseSection>
        <CaseSection title="Payment"><CaseGrid rows={[['Provider fact', 'Paid · confirmed 09:42'], ['Provider reference', 'PAY-8A41-0926'], ['Authority', 'Provider + Adulis backend'], ['Operator control', 'Read-only']]} /><CaseNotice>Payment is externally established. This workspace contains no payment-state control.</CaseNotice></CaseSection>
        <CaseSection title="Fulfilment and Handoff"><CaseGrid rows={[['Fulfilment', 'Courier Delivery'], ['Courier', 'Not assigned'], ['Pickup', 'Pending'], ['Delivery', 'Pending']]} /></CaseSection>
        <CaseSection title="Chat and Claims"><EvidenceLine label="Buyer–Seller chat" value="4 messages · last at 09:16" /><EvidenceLine label="Claims" value="No active Claim" /></CaseSection>
      </div>
      <div className="flex flex-col gap-5">
        <CaseSection title="Support notes">{notes.map((item, index) => <div key={index} className="border-l py-1 pl-3 text-xs leading-relaxed" style={{ borderColor: ACCENT, color: MUTED }}>{item}</div>)}<div className="mt-4"><Textarea label="New support note" value={note} onChange={event => setNote(event.target.value)} rows={4} placeholder="Add a factual case note." /></div><OperatorButton disabled={!note} onClick={() => { setNotes(values => [...values, `09:41 · ${note}`]); setNote('') }}>Add Support Note</OperatorButton></CaseSection>
        <CaseSection title="Purpose-specific actions"><CaseAction label="Send status explanation" detail="Send the buyer a summary of the recorded Order state." /><CaseAction label="Escalate fulfilment issue" detail="Move this case to a named fulfilment workflow." /><CaseAction label="Close support case" detail="Resolve the support request without changing Order state." /></CaseSection>
      </div>
    </div>
  )
}

function ModerationCase() {
  const [target, setTarget] = useState('Shoppable Post')
  const [action, setAction] = useState('')
  const targets = ['Product Post', 'Shoppable Post', 'Review', 'Seller safety case']
  return (
    <div className="space-y-5">
      <div className="flex gap-2">{targets.map(value => <button key={value} onClick={() => setTarget(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: target === value ? ACCENT : BORDER, background: target === value ? `${ACCENT}18` : SURFACE, color: target === value ? ACCENT : MUTED }}>{value}</button>)}</div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Entity and exact revision"><CaseGrid rows={[['Entity', `${target} · SHP-018`], ['Exact revision', 'Revision 7 · published 29 Sep, 16:32'], ['Publication', 'Published'], ['Current distribution', 'FYP · Search · Storefront']]} /></CaseSection>
        <CaseSection title="Report"><CaseGrid rows={[['Report reason', 'Potentially misleading availability statement'], ['Reporter', 'Buyer account · presentation-safe'], ['Submitted', '30 Sep · 03:41'], ['Report count', '2 linked reports']]} /></CaseSection>
        <CaseSection title="Evidence"><EvidenceLine label="Reported frame" value="Media frame 2 · caption segment captured" /><EvidenceLine label="Revision snapshot" value="Immutable revision 7" /><EvidenceLine label="Related chat" value="No linked chat evidence" /></CaseSection>
        <CaseSection title="Seller and Products"><CaseGrid rows={[['Seller', 'Addis Atelier · @addisatelier'], ['Trust', 'ESTABLISHED · read-only'], ['Tagged Products', 'PRD-001, PRD-002'], ['Availability', 'Both currently available']]} /></CaseSection>
        <CaseSection title="Policy"><CaseGrid rows={[['Policy', 'Content Accuracy 3.2'], ['Policy version', 'ET-CONTENT-2026.09'], ['Decision standard', 'Materially misleading commerce claim'], ['Prior history', '1 No Action · 0 restrictions']]} /></CaseSection>
        <CaseSection title="History"><CaseTimeline events={['29 Sep 16:32 · Revision 7 published', '30 Sep 03:41 · First report received', '30 Sep 06:02 · Second report linked', '30 Sep 09:41 · Operator opened case']} /></CaseSection>
      </div>
      <CaseSection title="Moderation actions">
        <div className="flex flex-wrap gap-2"><OperatorButton variant="secondary" onClick={() => setAction('No Action recorded. Entity distribution remains unchanged.')}>No Action</OperatorButton><OperatorButton onClick={() => setAction('Restricted. Entity removed from FYP and Search while remaining visible in the Seller workspace.')}>Restrict</OperatorButton><OperatorButton onClick={() => setAction('Removed. Entity is no longer visible in FYP, Search, or Storefront.')}>Remove</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Restored. Eligible surfaces will republish after policy state refresh.')}>Restore</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Escalated to senior moderation review.')}>Escalate</OperatorButton></div>
        <div className="mt-4 grid grid-cols-3 gap-3"><DistributionEffect surface="FYP" affected={action.startsWith('Restricted') || action.startsWith('Removed')} /><DistributionEffect surface="Search" affected={action.startsWith('Restricted') || action.startsWith('Removed')} /><DistributionEffect surface="Storefront" affected={action.startsWith('Removed')} /></div>
      </CaseSection>
    </div>
  )
}

function ClaimCase() {
  const [action, setAction] = useState('')
  return (
    <div className="space-y-5">
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Parties"><CaseGrid rows={[['Buyer', 'Maya T. · ACC-4821'], ['Seller', 'Addis Atelier · @addisatelier'], ['Seller Order', 'ADU-24086'], ['Claim', 'CLM-2041 · Item not as described']]} /></CaseSection>
        <CaseSection title="Products"><EvidenceLine label="Product" value="Habesha Kemis — Classic White" /><EvidenceLine label="Variant" value="Size M · Gold border" /><EvidenceLine label="Quantity" value="1" /></CaseSection>
        <CaseSection title="Provider payment fact"><CaseGrid rows={[['Payment', 'Paid · provider confirmed'], ['Provider reference', 'PAY-8A41-0819'], ['Products', 'ETB 2,800'], ['Adulis surcharge', 'ETB 14'], ['Courier Delivery charge', 'ETB 180'], ['Total', 'ETB 2,994']]} /><CaseNotice>Payment fact is read-only and cannot be changed from a Claim.</CaseNotice></CaseSection>
        <CaseSection title="Assignment and Handoff"><CaseGrid rows={[['Courier assignment', 'Daniel K. · approved relationship'], ['Pickup', 'Verified · Seller Pickup QR'], ['Delivery', 'Verified · Recipient scan'], ['Final handoff', '30 Sep · 11:06']]} /></CaseSection>
        <CaseSection title="Checkpoint evidence"><EvidenceLine label="Pickup checkpoint" value="Location recorded · 10:14" /><EvidenceLine label="Delivery checkpoint" value="Location unavailable · handoff remains valid" /></CaseSection>
        <CaseSection title="Chat evidence"><CaseTimeline events={['09:16 · Buyer asked about border colour', '09:18 · Seller confirmed Gold selection', '11:42 · Buyer reported Silver item received']} /></CaseSection>
        <CaseSection title="Submitted evidence"><div className="grid grid-cols-3 gap-2"><EvidenceTileDark label="Buyer item photo" /><EvidenceTileDark label="Package label" /><EvidenceTileDark label="Product revision" /></div></CaseSection>
        <CaseSection title="Timeline"><CaseTimeline events={['09:42 · Provider payment confirmed', '10:14 · Pickup verified', '11:06 · Delivery verified', '11:42 · Claim submitted', '12:05 · Seller response received']} /></CaseSection>
      </div>
      <CaseSection title="Claim actions"><div className="flex gap-2"><OperatorButton variant="secondary" onClick={() => setAction('Evidence request sent to the relevant party. Claim state moved to Evidence Required.')}>Request Evidence</OperatorButton><OperatorButton onClick={() => setAction('Decision proposal drafted for required review. No payment fact was changed.')}>Propose Decision</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Claim escalated to senior review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function VerificationCase() {
  const [focus, setFocus] = useState('Suspicious recovery')
  const [action, setAction] = useState('')
  const focuses = ['Social account control', 'Social business verification', 'Account linkage', 'Phone recovery', 'Suspicious recovery', 'Seller admission appeal']
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">{focuses.map(value => <button key={value} onClick={() => setFocus(value)} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: focus === value ? ACCENT : BORDER, background: focus === value ? `${ACCENT}18` : SURFACE, color: focus === value ? ACCENT : MUTED }}>{value}</button>)}</div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Recovery subject"><CaseGrid rows={[['Seller', 'Nura Glow · @nura-glow'], ['Case focus', focus], ['Account linkage', 'Seller profile ↔ social business page'], ['Risk', 'Elevated · recent phone change']]} /></CaseSection>
        <CaseSection title="Social account control"><EvidenceLine label="Connected account" value="@nura-glow · active session challenge passed" /><EvidenceLine label="Business page" value="Nura Glow Beauty · administrative control confirmed" /><EvidenceLine label="Linkage history" value="Linked 18 months · no prior disputes" /></CaseSection>
        <CaseSection title="Phone recovery"><CaseGrid rows={[['Previous phone', 'Ending 4421 · inactive'], ['Requested phone', 'Ending 8083'], ['Request time', 'Today · 06:14'], ['Recent change', 'Session reset requested 2h later']]} /></CaseSection>
        <CaseSection title="Seller admission appeal"><CaseGrid rows={[['Admission state', 'Existing Seller · not applicable'], ['Appeal history', 'No prior admission appeals'], ['Market', 'ET-ADD'], ['Policy', 'Seller Admission 2.4']]} /></CaseSection>
      </div>
      <CaseNotice>Recovery decisions use account control, business verification, linkage history, phone signals, and risk review. Only the supported evidence shown here is requested.</CaseNotice>
      <CaseSection title="Verification / Recovery actions"><div className="flex gap-2"><OperatorButton onClick={() => setAction(`${focus} approved with audit record.`)}>Approve Supported Recovery</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction(`${focus} rejected; existing account linkage remains unchanged.`)}>Reject Recovery</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Escalated for additional risk review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function HandoffCase() {
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('')
  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-danger)', background: 'var(--color-danger-bg)' }}><div className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>Exceptional manual review</div><p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Normal QR and OTP verification did not produce a conclusive automated result. Manual Verification is exceptional, reasoned, and audited.</p></div>
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Order and parties"><CaseGrid rows={[['Order', 'ADU-24083'], ['Buyer / delegate', 'Maya T. / Rahel T.'], ['Seller', 'Addis Atelier'], ['Courier', 'Daniel K.']]} /></CaseSection>
        <CaseSection title="Pickup"><CaseGrid rows={[['Seller Pickup QR', 'Verified · 10:14'], ['Courier assignment', 'Daniel K.'], ['Package custody', 'Transferred'], ['Pickup checkpoint', 'Location recorded']]} /></CaseSection>
        <CaseSection title="Delivery attempts"><CaseTimeline events={['11:02 · Delivery QR presented', '11:04 · Recipient scan timed out', '11:06 · Second QR attempt failed', '11:09 · OTP fallback attempted']} /></CaseSection>
        <CaseSection title="OTP attempts"><CaseGrid rows={[['Attempt 1', '11:09 · expired'], ['Attempt 2', '11:12 · provider timeout'], ['Attempt limit', 'Reached'], ['Recipient', 'Delegated recipient Rahel T.']]} /></CaseSection>
        <CaseSection title="Checkpoint evidence"><EvidenceLine label="Pickup checkpoint" value="Location recorded · 10:14" /><EvidenceLine label="Delivery checkpoint" value="Location recorded · 11:03" /></CaseSection>
        <CaseSection title="Timestamps"><CaseGrid rows={[['Courier arrival', '11:01:22'], ['First handoff attempt', '11:02:18'], ['Last OTP attempt', '11:12:09'], ['Case created', '11:13:44']]} /></CaseSection>
      </div>
      <CaseSection title="Manual Verification decision"><Textarea label="Required decision reason" value={reason} onChange={event => setReason(event.target.value)} rows={4} placeholder="Explain how the available handoff evidence supports this exceptional decision." /><div className="mt-4 flex gap-2"><OperatorButton disabled={!reason} onClick={() => setAction('Manual Verification approved with required reason and audit record.')}>Approve Manual Verification</OperatorButton><OperatorButton variant="secondary" disabled={!reason} onClick={() => setAction('Manual Verification rejected. Existing verified business state remains unchanged.')}>Reject</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Manual Handoff case escalated for senior review.')}>Escalate</OperatorButton></div></CaseSection>
    </div>
  )
}

function TrustAppealCase() {
  const [action, setAction] = useState('')
  return (
    <div className="space-y-5">
      {action && <ActionResult>{action}</ActionResult>}
      <div className="grid grid-cols-2 gap-5">
        <CaseSection title="Current Trust level"><div className="font-display text-3xl font-semibold" style={{ color: TEXT }}>REBUILDING</div><p className="mt-2 text-xs" style={{ color: MUTED }}>Read-only, domain-controlled Trust state.</p></CaseSection>
        <CaseSection title="Appeal"><CaseGrid rows={[['Seller', 'Buna Lane · @buna-lane'], ['Submitted', '29 Sep · 14:12'], ['Appeal reason', 'Reliability improvements since restriction'], ['Requested outcome', 'Re-evaluation under current policy']]} /></CaseSection>
        <CaseSection title="History"><CaseTimeline events={['12 Jun · NEW', '03 Aug · ESTABLISHED', '18 Sep · REBUILDING after fulfilment threshold', '29 Sep · Appeal submitted']} /></CaseSection>
        <CaseSection title="Evidence"><EvidenceLine label="Fulfilment reliability" value="94% over last 30 days" /><EvidenceLine label="Claims" value="1 open · 3 resolved" /><EvidenceLine label="Response reliability" value="97%" /></CaseSection>
        <CaseSection title="Policy"><CaseGrid rows={[['Policy', 'Seller Trust 4.1'], ['Evaluation window', '30 and 90 day outcomes'], ['Current policy version', 'TRUST-2026.09'], ['Decision source', 'Domain workflow + approved review']]} /></CaseSection>
        <CaseSection title="Control boundary"><CaseNotice>Operators review evidence and record an appeal outcome. Trust levels are not directly typed, selected, or edited.</CaseNotice></CaseSection>
      </div>
      <CaseSection title="Appeal actions"><div className="flex gap-2"><OperatorButton onClick={() => setAction('Appeal evidence accepted for domain re-evaluation. Trust level was not directly changed.')}>Submit for Re-evaluation</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Appeal denied under Seller Trust 4.1. Current level remains domain-controlled.')}>Deny Appeal</OperatorButton><OperatorButton variant="secondary" onClick={() => setAction('Trust Appeal escalated for senior review.')}>Escalate</OperatorButton></div></CaseSection>
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

function SearchPanel({ mode }: { mode: 'global' | 'seller' | 'account' }) {
  const [query, setQuery] = useState(mode === 'seller' ? 'addis' : mode === 'account' ? 'Maya' : '')
  const [type, setType] = useState(mode === 'global' ? 'All' : mode === 'seller' ? 'Seller' : 'Account')
  const [accessTarget, setAccessTarget] = useState<string | null>(null)
  const [accessGranted, setAccessGranted] = useState<string[]>([])
  const [openedRef, setOpenedRef] = useState<string | null>(null)
  const results = [
    { type: 'Account', ref: 'ACC-4821', title: 'Maya Tesfaye', detail: 'Buyer account · Active · Addis Ababa', restricted: true },
    { type: 'Seller', ref: 'SELL-ADDIS-ATELIER', title: 'Addis Atelier', detail: '@addisatelier · Established · Active Store', restricted: true },
    { type: 'Order', ref: 'ADU-24091', title: 'Addis Atelier → Maya T.', detail: 'Paid · Needs preparation · ET-ADD', restricted: false },
    { type: 'Claim', ref: 'CLM-2041', title: 'Item not as described', detail: 'Evidence Review · ADU-24086', restricted: false },
    { type: 'Content', ref: 'SHP-018', title: 'Spring styling in Addis Ababa', detail: 'Published · Addis Atelier', restricted: false },
  ].filter(result => {
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
      <div className="mt-5 overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="grid grid-cols-[110px_220px_1fr_150px] gap-4 px-5 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Type</span><span>Reference</span><span>Result</span><span>Access</span></div>
        {results.map(result => {
          const granted = accessGranted.includes(result.ref)
          return <div key={result.ref} className="grid grid-cols-[110px_220px_1fr_150px] items-center gap-4 border-t px-5 py-4" style={{ borderColor: BORDER }}><OperatorState tone="neutral">{result.type}</OperatorState><span className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{result.ref}</span><span><span className="block text-sm font-semibold" style={{ color: TEXT }}>{result.title}</span><span className="text-xs" style={{ color: MUTED }}>{result.detail}</span></span>{result.restricted && !granted ? <button onClick={() => setAccessTarget(result.ref)} className="rounded px-3 py-2 text-xs font-semibold" style={{ background: RAISED, color: ACCENT }}>Reason for Access</button> : <OperatorButton variant="secondary" onClick={() => setOpenedRef(result.ref)}>Open</OperatorButton>}</div>
        })}
      </div>
      <div className="mt-4 rounded-xl border p-3 text-xs" style={{ borderColor: BORDER, color: MUTED }}>Search is scoped to supported domain entities: Account, Seller, Order, Claim, and Content. Generic database browsing or editing is not available.</div>
      {accessTarget && <ReasonForAccessOverlay target={accessTarget} onClose={() => setAccessTarget(null)} onConfirm={() => { setAccessGranted(values => [...values, accessTarget]); setAccessTarget(null) }} />}
      {openedRef && <SearchResultDrawer reference={openedRef} onClose={() => setOpenedRef(null)} />}
    </div>
  )
}

function SearchResultDrawer({ reference, onClose }: { reference: string; onClose: () => void }) {
  const entity = reference.startsWith('ACC') ? 'Account' : reference.startsWith('SELL') ? 'Seller' : reference.startsWith('ADU') ? 'Order' : reference.startsWith('CLM') ? 'Claim' : 'Content'
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,.58)' }} onClick={onClose}>
      <div className="h-full w-[480px] border-l p-6 shadow-xl" style={{ borderColor: BORDER, background: SURFACE }} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between"><div><div className="font-mono text-xs font-semibold" style={{ color: ACCENT }}>{reference}</div><div className="mt-1 font-display text-2xl font-semibold" style={{ color: TEXT }}>{entity} summary</div></div><button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-lg" style={{ background: RAISED, color: MUTED }}>×</button></div>
        <div className="mt-6 grid grid-cols-2 gap-5"><DarkField label="Entity type" value={entity} /><DarkField label="Market" value="ET-ADD" /><DarkField label="Reference" value={reference} /><DarkField label="Access" value={entity === 'Account' || entity === 'Seller' ? 'Reason recorded' : 'Operational'} /></div>
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
        <div className="mt-5"><TextInput label="Case or work reference" value={caseRef} onChange={event => setCaseRef(event.target.value)} placeholder="e.g. SUP-4812" /></div>
        <div className="mt-4"><Textarea label="Access reason" value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this information is required for the current workflow." rows={4} /></div>
        <div className="mt-5 flex justify-end gap-2"><OperatorButton variant="secondary" onClick={onClose}>Cancel</OperatorButton><OperatorButton disabled={!reason || !caseRef} onClick={onConfirm}>Record Reason & Continue</OperatorButton></div>
      </div>
    </div>
  )
}

function FounderDecisionsPanel() {
  const [actor, setActor] = useState<FounderActor>('CEO')
  const [phase, setPhase] = useState<'review' | 'proposal' | 'approval' | 'returned' | 'executed'>('review')
  const [proposal, setProposal] = useState('')
  const [proposer, setProposer] = useState<FounderActor | null>(null)
  const [returnReason, setReturnReason] = useState('')
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
          <DarkPanel title="Material decision · GOV-AP-104">
            <div className="flex items-start justify-between"><div><div className="font-display text-xl font-semibold" style={{ color: TEXT }}>Enable Seller admission in ET-ADD</div><p className="mt-1 text-xs" style={{ color: MUTED }}>Controlled domain action · Market configuration</p></div><OperatorState tone={phase === 'executed' ? 'success' : phase === 'returned' ? 'danger' : 'warning'}>{phase === 'review' ? 'Evidence Review' : phase === 'proposal' ? 'Proposal Draft' : phase === 'approval' ? 'Awaiting Approval' : phase === 'returned' ? 'Returned' : 'Executed'}</OperatorState></div>
          </DarkPanel>
          <DarkPanel title="Review evidence">
            <div className="grid grid-cols-2 gap-4"><GovernanceEvidence title="Market readiness" value="Operational readiness checklist complete" source="OPS-ET-2026-09" /><GovernanceEvidence title="Provider readiness" value="Payments and reconciliation healthy" source="INC status · green" /><GovernanceEvidence title="Queue capacity" value="Projected launch queue within coverage" source="Capacity review 30 Sep" /><GovernanceEvidence title="Policy" value="Seller Admission 2.4 approved" source="POL-SELLER-2.4" /></div>
            <div className="mt-4"><CaseTimeline events={['28 Sep · COO/CTO attached provider readiness', '29 Sep · CEO requested queue capacity evidence', '30 Sep · Capacity evidence added', '30 Sep · Case ready for Founder review']} /></div>
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
          {phase === 'executed' && <ActionResult>Approved by {actor}. Controlled market configuration action executed and written to Audit.</ActionResult>}
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
          <DarkPanel title="Approval History"><ApprovalHistory /></DarkPanel>
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
  const events = [
    ['09:41:22', 'COO/CTO', 'Opened restricted Seller', 'SELL-ADDIS-ATELIER', 'SUP-4812 · support investigation', 'Success'],
    ['09:34:08', 'System', 'Assigned work priority', 'CLM-2041', 'SLA evaluation', 'Success'],
    ['09:12:44', 'CEO', 'Approved Decision Proposal', 'GOV-AP-099', 'Provider incident safeguard', 'Success'],
    ['08:58:11', 'COO/CTO', 'Returned for Changes', 'GOV-AP-101', 'Rollback evidence incomplete', 'Returned'],
    ['08:31:02', 'COO/CTO', 'Activated Solo Coverage', 'COV-018', 'CEO unreachable · urgent provider incident', 'Expired'],
  ].filter(event => filter === 'All' || event[1] === filter)
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="Audit" description="Immutable record of privileged access, Founder decisions, and controlled actions." trailing={<DarkSelect label="Actor" value={filter} options={['All', 'CEO', 'COO/CTO', 'System']} onChange={setFilter} />} />
      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: BORDER, background: SURFACE }}>
        <div className="grid grid-cols-[110px_120px_1.2fr_180px_1.4fr_100px] gap-3 px-4 py-3 text-[9px] font-semibold uppercase tracking-wider" style={{ background: RAISED, color: MUTED }}><span>Timestamp</span><span>Actor</span><span>Action</span><span>Target</span><span>Reason</span><span>Result</span></div>
        {events.map(event => <div key={`${event[0]}-${event[2]}`} className="grid grid-cols-[110px_120px_1.2fr_180px_1.4fr_100px] items-center gap-3 border-t px-4 py-4 text-xs" style={{ borderColor: BORDER, color: TEXT }}><span className="font-mono" style={{ color: MUTED }}>{event[0]}</span><span className="font-semibold">{event[1]}</span><span>{event[2]}</span><span className="font-mono" style={{ color: ACCENT }}>{event[3]}</span><span style={{ color: MUTED }}>{event[4]}</span><OperatorState tone={event[5] === 'Success' ? 'success' : event[5] === 'Returned' ? 'warning' : 'neutral'}>{event[5]}</OperatorState></div>)}
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
        <DarkPanel title="Market configuration"><ConfigRow label="Market" value="ET-ADD · Addis Ababa" /><ConfigRow label="Seller admission" value="Controlled launch" /><ConfigRow label="Buyer availability" value="Active" /><ConfigRow label="Courier mode" value="Approved Seller Pools" /><ProposeButton onClick={() => setProposal('Decision Proposal created for ET-ADD market configuration change.')}>Propose Market Change</ProposeButton></DarkPanel>
        <DarkPanel title="Feature flags"><ConfigRow label="Buyer Discovery" value="Enabled" /><ConfigRow label="Seller Companion" value="Enabled" /><ConfigRow label="Courier Mode" value="Enabled" /><ConfigRow label="Manual Handoff" value="Exceptional only" /><ProposeButton onClick={() => setProposal('Decision Proposal created for launch feature flag change.')}>Propose Flag Change</ProposeButton></DarkPanel>
        <DarkPanel title="Provider status"><ConfigRow label="Payment provider" value="Operational · monitoring incident" /><ConfigRow label="Callback reconciliation" value="Active" /><ConfigRow label="Notifications" value="Operational" /><ConfigRow label="Media processing" value="Operational" /></DarkPanel>
        <DarkPanel title="Policy versions"><ConfigRow label="Seller Admission" value="2.4" /><ConfigRow label="Content Accuracy" value="3.2" /><ConfigRow label="Seller Trust" value="4.1" /><ConfigRow label="Claims" value="2.8" /><ProposeButton onClick={() => setProposal('Decision Proposal created for policy version activation.')}>Propose Policy Activation</ProposeButton></DarkPanel>
      </div>
    </div>
  )
}

function SystemHealthPanel() {
  const systems = [
    ['Database', 'Operational', '18ms'], ['Queues', 'Operational', '31 open work items'], ['Background jobs', 'Operational', '0 failed'],
    ['Payment reconciliation', 'Degraded', '7 callbacks delayed'], ['Notifications', 'Operational', '99.8% delivered'], ['Media', 'Operational', '42s p95'],
    ['Privacy services', 'Operational', 'No active incident'], ['Payment provider', 'Monitoring', 'INC-074'],
  ]
  return (
    <div className="mx-auto max-w-7xl p-8">
      <OperatorHeader title="System Health" description="Launch-critical services, incidents, and recovery posture." />
      <div className="grid grid-cols-4 gap-4">{systems.map(([name, status, detail]) => <div key={name} className="rounded-2xl border p-5" style={{ borderColor: status === 'Degraded' ? ACCENT : BORDER, background: SURFACE }}><div className="flex items-start justify-between"><span className="text-sm font-semibold" style={{ color: TEXT }}>{name}</span><span className={`h-2.5 w-2.5 rounded-full ${status === 'Operational' ? 'bg-success' : 'bg-warning'}`} /></div><div className="mt-5 font-mono text-xs font-semibold" style={{ color: status === 'Operational' ? 'var(--color-success)' : ACCENT }}>{status}</div><div className="mt-1 text-[10px]" style={{ color: MUTED }}>{detail}</div></div>)}</div>
      <div className="mt-5 grid grid-cols-[1.3fr_.7fr] gap-5"><DarkPanel title="Active incident"><div className="flex items-start justify-between"><div><div className="text-sm font-semibold" style={{ color: TEXT }}>INC-074 · Payment callback delays</div><p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>Provider confirmations delayed for 7 Orders. Reconciliation is checking provider truth. Seller payment state remains externally controlled.</p></div><OperatorState tone="warning">Monitoring</OperatorState></div><CaseTimeline events={['09:12 · Alert opened', '09:18 · Reconciliation capacity increased', '09:29 · Delay reduced', '09:41 · Monitoring continues']} /></DarkPanel><DarkPanel title="Launch posture"><ControlRow label="Critical services" value="7 / 8 operational" /><ControlRow label="Data loss" value="None detected" /><ControlRow label="Manual intervention" value="Not required" /><ControlRow label="Next review" value="10:00 UTC+3" /></DarkPanel></div>
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

function ApprovalHistory() {
  return <div><ApprovalHistoryRow refId="GOV-AP-099" decision="Provider incident safeguard" result="Approved" actors="COO/CTO → CEO" /><ApprovalHistoryRow refId="GOV-AP-101" decision="Queue SLA change" result="Returned" actors="CEO → COO/CTO" /><ApprovalHistoryRow refId="GOV-AP-096" decision="Policy 3.2 activation" result="Approved" actors="CEO → COO/CTO" /></div>
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
