// SIM-001: the one shared internal-simulation store. Marketplace dataset only. It is separate from the MVP Seller workspace store: it never reads or
// writes stock, the Cart, Collections, follows, Trust or any financial state. State is the seed (operations.json) folded over a log of accepted
// actions; only the log is kept in sessionStorage (namespaced by dataset and the simulation), so "Reset simulation" is clearing the log.
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { isLegacy, datasetKey } from '../marketplace/registry'
import { CATALOGUE, OPERATIONS } from '../marketplace/import'
import { usePrototypeMode } from '../prototype-mode'
import { REPUTATION } from '../demo-data/reputation'
import { buildFeed } from './feed'
import { apply, buildWorld, seedState, type Action, type Result, type SimState, type World } from './orders'

export const STORAGE_KEY = `${datasetKey('adulis.simulation.v1')}|simulation`
export const WORLD: World = buildWorld(OPERATIONS, CATALOGUE as unknown as Parameters<typeof buildWorld>[1])
let seeded: SimState | null = null
export const seed = (): SimState => (seeded ??= seedState(OPERATIONS))

function load(): { log: Action[]; state: SimState } {
  try {
    const log = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]') as Action[]
    let state = seed()
    for (const action of log) { const r = apply(WORLD, state, action); if (!r.ok) throw new Error('log no longer replays'); state = r.state }
    return { log, state }
  } catch { try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* storage unavailable: the simulation just starts from the seed */ } return { log: [], state: seed() } }
}

interface SimContext { sim: SimState; act: (action: Action) => Result; reset: () => void }
const Ctx = createContext<SimContext | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState(() => (isLegacy ? { log: [] as Action[], state: null as unknown as SimState } : load()))
  const live = useRef(store)
  live.current = store
  const act = useCallback((action: Action): Result => {
    const result = apply(WORLD, live.current.state, action)
    if (result.ok) {
      const next = { log: [...live.current.log, action], state: result.state }
      live.current = next
      setStore(next)
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next.log)) } catch { /* not persisted */ }
    }
    return result
  }, [])
  const reset = useCallback(() => {
    try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* nothing stored */ }
    const next = { log: [] as Action[], state: seed() }
    live.current = next
    setStore(next)
  }, [])
  // SIM-003: publish the simulated reputation for the Buyer and Storefront pages, in the internal simulation only (the MVP shows no purchased reviews).
  const { simulation } = usePrototypeMode()
  REPUTATION.current = !isLegacy && simulation ? buildFeed(store.state) : null
  const value = useMemo(() => ({ sim: store.state, act, reset }), [store, act, reset])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSim(): SimContext {
  const c = useContext(Ctx)
  if (!c || !c.sim) throw new Error('useSim is only available on the marketplace dataset')
  return c
}

/** The simulation state, or null on the legacy dataset (which has no store). isLegacy is a module constant, so the hook order never changes. */
export function useSimOrNull(): SimState | null {
  if (isLegacy) return null
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useSim().sim
}
