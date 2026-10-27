import { useEffect, useRef, useState, type RefObject } from 'react'
import PrototypeGuide from './sections/PrototypeGuide'
import Foundations from './sections/Foundations'
import Components from './sections/Components'
import CompanyWebsite from './sections/CompanyWebsite'
import SellerStorefront from './sections/SellerStorefront'
import MobileBuyer from './sections/MobileBuyer'
import MobileSellerCompanion from './sections/MobileSellerCompanion'
import MobileCourier from './sections/MobileCourier'
import SellerConsole from './sections/SellerConsole'
import OperatorConsole from './sections/OperatorConsole'
import DemoFlows, { FLOW_DEFINITIONS, type FlowId } from './sections/DemoFlows'
import SystemStates from './sections/SystemStates'
import { stageFor } from './demo-data'
import { StoryProvider } from './StoryClock'
import { ThemeLab } from './theme/ThemeLab'

export type SectionKey =
  | '00-guide'
  | '01-foundations'
  | '02-components'
  | '03-website'
  | '04-storefront'
  | '05-buyer'
  | '06-seller-companion'
  | '07-courier'
  | '08-seller-console'
  | '09-operator-console'
  | '10-demo-flows'
  | '11-system-states'

const SECTIONS: { key: SectionKey; label: string; short: string }[] = [
  { key: '00-guide',           label: '00 — Prototype Guide',           short: '00' },
  { key: '01-foundations',     label: '01 — Foundations',               short: '01' },
  { key: '02-components',      label: '02 — Components',                short: '02' },
  { key: '03-website',         label: '03 — Company Website',           short: '03' },
  { key: '04-storefront',      label: '04 — Seller Storefront',         short: '04' },
  { key: '05-buyer',           label: '05 — Mobile — Buyer',            short: '05' },
  { key: '06-seller-companion',label: '06 — Mobile — Seller Companion', short: '06' },
  { key: '07-courier',         label: '07 — Mobile — Courier',          short: '07' },
  { key: '08-seller-console',  label: '08 — Seller Console',            short: '08' },
  { key: '09-operator-console',label: '09 — Operator Console',          short: '09' },
  { key: '10-demo-flows',      label: '10 — ADULIS MASTER DEMO',        short: '10' },
  { key: '11-system-states',   label: '11 — System States',              short: '11' },
]

function SectionContent({ active, onNavigate, demoTarget, onStartFlow }: { active: SectionKey; onNavigate: (s: string) => void; demoTarget?: string; onStartFlow: (id: FlowId) => void }) {
  switch (active) {
    case '00-guide':            return <PrototypeGuide onNavigate={onNavigate} />
    case '01-foundations':      return <Foundations />
    case '02-components':       return <Components />
    case '03-website':          return <CompanyWebsite demoTarget={demoTarget} />
    case '04-storefront':       return <SellerStorefront demoTarget={demoTarget} />
    case '05-buyer':            return <MobileBuyer demoTarget={demoTarget} />
    case '06-seller-companion': return <MobileSellerCompanion demoTarget={demoTarget} />
    case '07-courier':          return <MobileCourier demoTarget={demoTarget} />
    case '08-seller-console':   return <SellerConsole demoTarget={demoTarget} />
    case '09-operator-console': return <OperatorConsole demoTarget={demoTarget} />
    case '10-demo-flows':       return <DemoFlows onStart={onStartFlow} />
    case '11-system-states':    return <SystemStates />
  }
}

/** How far Theme Lab keeps from the Website header's controls, and how far below the header it sits when moved. */
const HEADER_CLEARANCE = 8
const BELOW_HEADER_GAP = 10

/**
 * Keeps Theme Lab reachable while the Company Website's sticky header holds the top line. Wherever the header's own
 * controls would reach Theme Lab's usual place (its navigation does at some desktop widths), Theme Lab moves to just
 * below the header, 8 px from main's right edge; elsewhere it stays where index.css puts it. The position is written to
 * the element itself, so scrolling never re-renders the shell. Phones keep Theme Lab in the section bar.
 */
function useThemeLabClearOfWebsiteHeader(slot: RefObject<HTMLDivElement | null>, main: RefObject<HTMLElement | null>, active: SectionKey) {
  useEffect(() => {
    const element = slot.current
    const scroller = main.current
    if (!element || !scroller || active !== '03-website') return
    const wide = window.matchMedia('(min-width: 641px)')
    let frame = 0
    const place = () => {
      frame = 0
      const header = scroller.querySelector<HTMLElement>('.website-header')
      // Theme Lab's usual place, from index.css, with room around it.
      const style = getComputedStyle(element)
      const top = parseFloat(style.getPropertyValue('--theme-lab-top')) || 6
      const right = parseFloat(style.getPropertyValue('--theme-lab-right')) || 8
      const viewport = document.documentElement.clientWidth
      const usual = { left: viewport - right - 44 - HEADER_CLEARANCE, right: viewport - right + HEADER_CLEARANCE, top: top - HEADER_CLEARANCE, bottom: top + 44 + HEADER_CLEARANCE }
      const reached = wide.matches && !!header && [...header.querySelectorAll('button, a[href], input')].some(control => {
        const box = control.getBoundingClientRect()
        return box.width > 0 && box.left < usual.right && box.right > usual.left && box.top < usual.bottom && box.bottom > usual.top
      })
      if (!reached || !header) {
        delete element.dataset.belowHeader
        return
      }
      const edge = scroller.getBoundingClientRect().left + scroller.clientWidth
      element.style.setProperty('--theme-lab-below-top', `${Math.round(header.getBoundingClientRect().bottom) + BELOW_HEADER_GAP}px`)
      element.style.setProperty('--theme-lab-below-right', `${Math.round(viewport - edge) + 8}px`)
      element.dataset.belowHeader = ''
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place)
    }
    place()
    // Scrolling, a change of Website page or view, and any change to main's size (window, sidebar, flow card).
    const content = new MutationObserver(schedule)
    content.observe(scroller, { childList: true, subtree: true })
    const size = new ResizeObserver(schedule)
    size.observe(scroller)
    scroller.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      content.disconnect()
      size.disconnect()
      scroller.removeEventListener('scroll', schedule)
      delete element.dataset.belowHeader
    }
  }, [slot, main, active])
}

export default function App() {
  const [active, setActive] = useState<SectionKey>('10-demo-flows')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [journey, setJourney] = useState<{ id: FlowId; stage: number } | null>(null)
  const flow = journey ? FLOW_DEFINITIONS.find(item => item.id === journey.id)! : null
  const flowStage = flow && journey ? flow.stages[journey.stage] : null
  const themeLabSlot = useRef<HTMLDivElement>(null)
  const mainArea = useRef<HTMLElement>(null)
  useThemeLabClearOfWebsiteHeader(themeLabSlot, mainArea, active)

  const startFlow = (id: FlowId) => {
    const definition = FLOW_DEFINITIONS.find(item => item.id === id)!
    setJourney({ id, stage: 0 })
    setActive(definition.stages[0].section as SectionKey)
  }

  const moveFlow = (direction: -1 | 1) => {
    if (!journey || !flow) return
    const stage = Math.max(0, Math.min(flow.stages.length - 1, journey.stage + direction))
    setJourney({ ...journey, stage })
    setActive(flow.stages[stage].section as SectionKey)
  }

  return (
    <div className={`app-shell flex h-screen overflow-hidden${journey ? ' flow-active' : ''}`} style={{ background: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>
      {/* Sidebar */}
      <aside
        className="app-sidebar flex flex-col flex-shrink-0 border-r transition-all duration-300"
        style={{
          width: sidebarOpen ? 264 : 48,
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center gap-3 px-4 border-b flex-shrink-0"
          style={{ height: 56, borderColor: 'var(--color-border)' }}
        >
          {sidebarOpen && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AdulisLogo size={24} />
              <span className="font-display font-semibold text-sm tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                Adulis Prototype
              </span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex-shrink-0 flex items-center justify-center rounded transition-colors hover:opacity-70"
            style={{ width: 28, height: 28, color: 'var(--color-text-muted)' }}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <IconChevronLeft /> : <IconChevronRight />}
          </button>
        </div>

        {/* Nav items */}
        <nav className="app-section-nav flex-1 overflow-y-auto py-2" aria-label="Prototype sections">
          {SECTIONS.map(s => {
            const isActive = active === s.key
            return (
              <button
                key={s.key}
                onClick={() => { setJourney(null); setActive(s.key) }}
                aria-current={isActive ? 'page' : undefined}
                aria-label={s.label.replace(/^\d+ — /, '')}
                className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors rounded-lg mx-1 mb-0.5"
                style={{
                  width: 'calc(100% - 8px)',
                  background: isActive ? 'var(--color-brand-muted)' : 'transparent',
                  color: isActive ? 'var(--color-brand-dark)' : 'var(--color-text-secondary)',
                }}
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded font-mono text-xs font-medium"
                  style={{
                    width: 28,
                    height: 28,
                    background: isActive ? 'var(--color-brand)' : 'var(--color-surface-raised)',
                    color: isActive ? 'var(--color-on-brand)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.short}
                </span>
                {sidebarOpen && (
                  <span className="text-xs font-medium leading-tight truncate">{s.label.replace(/^\d+ — /, '')}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Sidebar footer */}
        {sidebarOpen && (
          <div className="flex-shrink-0 p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div
              className="rounded-lg p-3 text-xs leading-relaxed"
              style={{ background: 'var(--color-surface-raised)', color: 'var(--color-text-muted)' }}
            >
              <div className="font-semibold mb-1" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                PROTOTYPE v0.1
              </div>
              ADULIS MASTER DEMO
            </div>
          </div>
        )}
      </aside>

      {/* Theme Lab, the prototype's colour-system comparison (design evaluation), mounted once for every section. It
          floats at the top right, outside every surface's layout; `data-section` lets index.css place it beside a
          section's own top-right controls rather than over them, and the hook above keeps it clear of the Website's
          sticky header. On a phone it sits at the end of the section bar. */}
      <div ref={themeLabSlot} className="app-topbar" data-section={active}>
        <ThemeLab />
      </div>

      {/* Main content. `data-section` lets index.css's responsive rules address a section without changing it. */}
      <main ref={mainArea} data-section={active} className={`app-main relative flex-1 overflow-y-auto ${active === '09-operator-console' ? 'operator-viewport' : ''}`}>
        <StoryProvider stage={stageFor(journey?.id, journey?.stage ?? 0)}>
          <SectionContent key={`${active}-${journey?.stage ?? 'standard'}`} active={active} onNavigate={(s) => { setJourney(null); setActive(s as SectionKey) }} demoTarget={flowStage?.target} onStartFlow={startFlow} />
        </StoryProvider>
      </main>

      {/* The guided-flow card. On desktop it floats over the bottom-right corner. Below desktop widths index.css docks it
          under main, in its own row of the shell, so it never covers the product (WO-007). */}
      {journey && flow && flowStage && (
        <div className="flow-guide fixed bottom-5 right-5 z-[500] w-96 rounded-2xl border border-border bg-surface p-4 shadow-xl" role="dialog" aria-label="Guided prototype flow">
          <div className="flow-guide-head flex items-start justify-between"><div className="flow-guide-heading"><div className="font-mono text-[10px] font-bold uppercase tracking-wider text-brand-text">Flow {flow.id} · Step {journey.stage + 1} of {flow.stages.length}</div><div className="flow-guide-title mt-1 font-display text-lg font-semibold">{flowStage.title}</div></div><button onClick={() => setJourney(null)} aria-label="Close guided flow" className="flow-guide-close flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-text-muted">×</button></div>
          <p className="flow-guide-instruction mt-2 text-xs leading-relaxed text-text-secondary">{flowStage.instruction}</p>
          <div className="flow-guide-actions mt-4 flex items-center gap-2"><button disabled={journey.stage === 0} onClick={() => moveFlow(-1)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary disabled:opacity-40">Previous</button><span className="flex-1" />{journey.stage < flow.stages.length - 1 ? <button onClick={() => moveFlow(1)} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-on-brand">Next frame →</button> : <button onClick={() => { setJourney(null); setActive('10-demo-flows') }} className="rounded-lg bg-success px-3 py-2 text-xs font-semibold text-on-status">Finish demo</button>}</div>
        </div>
      )}
    </div>
  )
}

/* ─── Shared micro-components ─── */

export function AdulisLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Adulis">
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path
        d="M9 23L16 9L23 23"
        stroke="var(--color-on-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 18.5H20.5"
        stroke="var(--color-on-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
