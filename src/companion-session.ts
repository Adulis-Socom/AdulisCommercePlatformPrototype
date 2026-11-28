// COMP-001..003: what the Seller Companion keeps in the session, per Seller, namespaced by dataset: the acting team member, task status changes, internal team
// messages, alert read / dismissed marks, and the quick settings (store open, notification preferences). Prototype persistence only (sessionStorage); the
// dataset's records are never mutated: a task's status here is an overlay over the dataset's, a message is appended after the dataset's.
import { useSyncExternalStore } from 'react'
import { datasetKey } from './marketplace/registry'
import type { TaskStatus } from './marketplace/seller-ops'

export interface TeamNote { id: string; sender: string; text: string; seq: number; taskId?: string }
export interface CompanionSession {
  /** Seller id -> the member the Companion acts as (absent = the Owner). */
  acting: Record<string, string>
  tasks: Record<string, TaskStatus>
  messages: Record<string, TeamNote[]>
  alerts: Record<string, { read: string[]; dismissed: string[] }>
  storeOpen: Record<string, boolean>
  /** `seller|member` -> preference id -> on. Absent = on. */
  prefs: Record<string, Record<string, boolean>>
}
const KEY = datasetKey('adulis.companion-session.v1')
const EMPTY: CompanionSession = { acting: {}, tasks: {}, messages: {}, alerts: {}, storeOpen: {}, prefs: {} }
let state: CompanionSession = (() => { try { return { ...EMPTY, ...JSON.parse(sessionStorage.getItem(KEY) ?? 'null') } } catch { return EMPTY } })()
const listeners = new Set<() => void>()
function update(next: CompanionSession) {
  state = next
  try { sessionStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota: it still works until reload */ }
  listeners.forEach(l => l())
}
export const useCompanionSession = (): CompanionSession => useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l) } }, () => state)

export const companionActions = {
  actAs: (seller: string, member: string) => update({ ...state, acting: { ...state.acting, [seller]: member } }),
  setTask: (task: string, status: TaskStatus) => update({ ...state, tasks: { ...state.tasks, [task]: status } }),
  postMessage: (seller: string, note: Omit<TeamNote, 'seq' | 'id'>) => {
    const list = state.messages[seller] ?? []
    update({ ...state, messages: { ...state.messages, [seller]: [...list, { ...note, seq: list.length + 1, id: `${seller}-LOCAL-${list.length + 1}` }] } })
  },
  markRead: (seller: string, ids: string[]) => {
    const own = state.alerts[seller] ?? { read: [], dismissed: [] }
    update({ ...state, alerts: { ...state.alerts, [seller]: { ...own, read: [...new Set([...own.read, ...ids])] } } })
  },
  dismiss: (seller: string, id: string) => {
    const own = state.alerts[seller] ?? { read: [], dismissed: [] }
    update({ ...state, alerts: { ...state.alerts, [seller]: { ...own, dismissed: [...new Set([...own.dismissed, id])] } } })
  },
  restoreDismissed: (seller: string) => {
    const own = state.alerts[seller] ?? { read: [], dismissed: [] }
    update({ ...state, alerts: { ...state.alerts, [seller]: { ...own, dismissed: [] } } })
  },
  setStoreOpen: (seller: string, open: boolean) => update({ ...state, storeOpen: { ...state.storeOpen, [seller]: open } }),
  setPref: (seller: string, member: string, pref: string, on: boolean) => {
    const key = `${seller}|${member}`
    update({ ...state, prefs: { ...state.prefs, [key]: { ...(state.prefs[key] ?? {}), [pref]: on } } })
  },
}
