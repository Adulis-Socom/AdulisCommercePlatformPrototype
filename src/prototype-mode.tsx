import { createContext, useContext, type ReactNode } from 'react'
import { Button } from './components/ui/Button'

/**
 * Prototype mode (FE-001). The ordinary experience is the approved MVP (Nov 24 decisions D24-01..04): discovery, Seller
 * operations, Stories, messaging and a checkout PREVIEW. The historical paid-commerce design (payments, paid Orders,
 * surcharge, handoff, refunds, Claims, purchased Review Grants) stays available only as an internal simulation that is
 * switched on explicitly and always labelled. Surfaces ask `usePrototypeMode()` and show a `SimulationGate` where a screen
 * belongs to the simulation. Nothing here is a security control: it is presentation, as the whole prototype is.
 */
interface PrototypeMode { simulation: boolean; setSimulation: (on: boolean) => void }

const ModeContext = createContext<PrototypeMode>({ simulation: false, setSimulation: () => {} })
export const PrototypeModeProvider = ModeContext.Provider
export const usePrototypeMode = () => useContext(ModeContext)

/** The disclosure the governing decision requires wherever checkout is reviewed (CHECKOUT_NO_PAYMENT_2026-11-24). */
export const CHECKOUT_PREVIEW_NOTICE = 'Checkout preview only. No Order will be placed and no money will be collected.'

/** Shown instead of a screen that belongs to the internal simulation while the prototype is in current-MVP mode. */
export function SimulationGate({ title, children, compact, onBack }: { title: string; children?: ReactNode; compact?: boolean; onBack?: () => void }) {
  const { setSimulation } = usePrototypeMode()
  return (
    <div role="region" aria-label={title} className={`flex flex-col items-center justify-center text-center ${compact ? 'min-h-72 p-6' : 'min-h-[60vh] p-8'}`}>
      <span className="rounded-full bg-surface-raised px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-text-muted">Not in the current MVP</span>
      <h2 className="mt-4 font-display text-xl font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">{children ?? 'This part of the prototype shows the historical paid-commerce design. Release 1 has no payments, paid Orders, fees or delivery handoff.'}</p>
      <Button variant="secondary" size="sm" onClick={() => setSimulation(true)} style={{ marginTop: 20 }}>Open in internal simulation</Button>
      {onBack && <Button variant="tertiary" size="sm" onClick={onBack} style={{ marginTop: 8 }}>Back</Button>}
      <p className="mt-2 max-w-xs text-[11px] leading-snug text-text-muted">The simulation uses demonstration data only. Nothing in it is a live Order or payment.</p>
    </div>
  )
}

/** The persistent label while the internal simulation is on. Zero layout height: it sticks to the bottom-left of the content area. */
export function SimulationBadge() {
  const { simulation, setSimulation } = usePrototypeMode()
  if (!simulation) return null
  return (
    <div className="pointer-events-none sticky bottom-0 left-0 z-[400]" style={{ height: 0 }}>
      <div role="status" className="pointer-events-auto absolute bottom-3 left-3 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border border-warning bg-warning-bg py-1 pl-3 pr-1 text-[11px] font-semibold text-text-primary shadow-md">
        <span><span className="font-mono font-bold">INTERNAL SIMULATION · DEMO</span> <span className="max-sm:hidden font-medium text-text-secondary">Historical paid-commerce design. Not the current MVP.</span></span>
        <button type="button" onClick={() => setSimulation(false)} className="min-h-7 rounded-full bg-surface px-2.5 text-[11px] font-semibold text-brand-text">Back to MVP</button>
      </div>
    </div>
  )
}
