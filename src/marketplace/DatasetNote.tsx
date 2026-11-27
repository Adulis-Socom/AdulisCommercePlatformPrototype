import { isLegacy } from './registry'

/** Surfaces whose Orders, couriers, claims, moderation and board fixtures are still the historical narrative (later work orders adapt them to the marketplace data). */
const HISTORICAL = new Set(['07-courier', '09-operator-console', '11-system-states'])

/**
 * Marketplace dataset only: a persistent label on the surfaces that have not been rebuilt on the marketplace operations data yet, so a
 * historical Seller, Order or courier name on them is read as a labelled fixture, never as marketplace data. Zero layout height, like SimulationBadge.
 */
export function DatasetNote({ section }: { section: string }) {
  if (isLegacy || !HISTORICAL.has(section)) return null
  return (
    <div className="pointer-events-none sticky bottom-0 right-0 z-[400]" style={{ height: 0 }}>
      <div role="note" className="pointer-events-auto absolute bottom-3 right-3 max-w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-surface px-3 py-2 text-[11px] leading-snug text-text-secondary shadow-md">
        <span className="font-mono font-bold text-text-primary">MARKETPLACE DATASET</span> Orders, couriers, claims and moderation here are still the historical fixtures; they move to the marketplace data in a later work order.
      </div>
    </div>
  )
}
