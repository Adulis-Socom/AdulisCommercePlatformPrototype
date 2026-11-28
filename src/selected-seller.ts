// COMP-003: the one "selected Seller" the Seller surfaces agree on. The Seller Console picker, the Companion's Switch Seller and the Storefront pills all read it
// when they open and write it when the user chooses a Seller, so opening the Console or the Storefront from the Companion lands on the same Seller, and coming
// back keeps it. A guided-flow step's own Seller still wins where a surface reads one (the flows set it), so the historical flows are unchanged.
// Session only (sessionStorage, namespaced by dataset); a reload returns to the surface default, as the whole prototype does.
import { useSyncExternalStore } from 'react'
import { datasetKey } from './marketplace/registry'

const KEY = datasetKey('adulis.selected-seller.v1')
let current: string | undefined = (() => { try { return sessionStorage.getItem(KEY) ?? undefined } catch { return undefined } })()
const listeners = new Set<() => void>()

export const getSelectedSeller = (): string | undefined => current
export function setSelectedSeller(id: string): void {
  if (id === current) return
  current = id
  try { sessionStorage.setItem(KEY, id) } catch { /* the choice still holds until reload */ }
  listeners.forEach(l => l())
}
export const useSelectedSeller = (): string | undefined => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, getSelectedSeller)
