/**
 * Theme Lab's state: the chosen colour system and mode, kept in this browser only (a prototype preference, never an
 * account setting). Applying a theme only rewrites custom properties and two attributes on <html>; no surface
 * re-renders or remounts, so every surface keeps its state.
 */

import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { BASELINE_ID, isCandidate, paletteById, type ThemeMode } from './palettes'
import { themeTokens } from './tokens'

export type ModeChoice = ThemeMode | 'system'

export interface ThemeChoice {
  palette: string
  mode: ModeChoice
}

/** Nothing chosen yet: the current prototype, as approved. */
export const DEFAULT_CHOICE: ThemeChoice = { palette: BASELINE_ID, mode: 'light' }

const STORAGE_KEY = 'adulis.theme-lab'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function readStoredChoice(): ThemeChoice {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ThemeChoice> | null
    if (stored && typeof stored.palette === 'string' && paletteById(stored.palette) && (stored.mode === 'light' || stored.mode === 'dark' || stored.mode === 'system')) {
      return { palette: stored.palette, mode: stored.mode }
    }
  } catch {
    // Storage unavailable or unreadable: start from the Baseline.
  }
  return DEFAULT_CHOICE
}

function storeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice))
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
}

const systemMode = (): ThemeMode => (window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light')

export const resolveMode = (mode: ModeChoice, system: ThemeMode = systemMode()): ThemeMode => (mode === 'system' ? system : mode)

/**
 * Marks <html> with the choice and writes its tokens. Baseline writes none, in any mode: it has no approved dark
 * design, so index.css applies unchanged and <html> is marked Light.
 */
export function applyTheme(paletteId: string, mode: ThemeMode) {
  const palette = paletteById(paletteId) ?? paletteById(BASELINE_ID)!
  const root = document.documentElement
  const previous: string[] = []
  for (let i = 0; i < root.style.length; i++) if (root.style[i].startsWith('--adulis-')) previous.push(root.style[i])
  for (const name of previous) root.style.removeProperty(name)
  const effective = isCandidate(palette) ? mode : 'light'
  if (isCandidate(palette)) {
    for (const [name, value] of Object.entries(themeTokens(palette, effective))) root.style.setProperty(name, value)
  }
  root.dataset.adulisTheme = palette.id
  root.dataset.adulisMode = effective
}

interface ThemeLabState {
  choice: ThemeChoice
  /** The mode in effect: the chosen one, or the device's for System; always Light for Baseline. */
  mode: ThemeMode
  choose: (change: Partial<ThemeChoice>) => void
}

const ThemeLabContext = createContext<ThemeLabState | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState(readStoredChoice)
  const [system, setSystem] = useState(systemMode)
  const candidate = isCandidate(paletteById(choice.palette) ?? paletteById(BASELINE_ID)!)
  // The chosen mode is kept while Baseline is showing, and applies again on moving to a candidate.
  const mode = candidate ? resolveMode(choice.mode, system) : 'light'

  useEffect(() => {
    if (!candidate || choice.mode !== 'system' || !window.matchMedia) return
    const query = window.matchMedia(DARK_QUERY)
    const follow = () => setSystem(query.matches ? 'dark' : 'light')
    follow()
    query.addEventListener('change', follow)
    return () => query.removeEventListener('change', follow)
  }, [candidate, choice.mode])

  useLayoutEffect(() => applyTheme(choice.palette, mode), [choice.palette, mode])

  const choose = (change: Partial<ThemeChoice>) => {
    const next = { ...choice, ...change }
    setChoice(next)
    storeChoice(next)
  }

  // App is passed in as `children`, so a theme change re-renders only Theme Lab itself, never the surfaces.
  return <ThemeLabContext.Provider value={{ choice, mode, choose }}>{children}</ThemeLabContext.Provider>
}

export function useThemeLab(): ThemeLabState {
  const state = useContext(ThemeLabContext)
  if (!state) throw new Error('useThemeLab needs ThemeProvider')
  return state
}
