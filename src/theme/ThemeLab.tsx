/**
 * Theme Lab: the prototype's design-evaluation control, mounted once in the shell's top-right corner. It switches the
 * candidate colour systems and the mode for every surface at once. It is a prototype tool, not a Buyer-facing feature,
 * and none of the systems it offers is a brand decision.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { BASELINE_ID, PALETTES, paletteById, type Palette, type ThemeMode } from './palettes'
import { DEFAULT_CHOICE, useThemeLab, type ModeChoice } from './ThemeProvider'

const MODES: { value: ModeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

const modeLabel = (choice: ModeChoice, mode: ThemeMode) => (choice === 'system' ? `System (${mode === 'dark' ? 'Dark' : 'Light'})` : choice === 'dark' ? 'Dark' : 'Light')

/** The system's Primary and Accent in the mode in effect. */
function Swatches({ palette, mode }: { palette: Palette; mode: ThemeMode }) {
  return (
    <span aria-hidden="true" className="flex flex-shrink-0 items-center">
      <span className="theme-lab-swatch" style={{ background: palette[mode].primary }} />
      <span className="theme-lab-swatch -ml-1" style={{ background: palette[mode].accent }} />
    </span>
  )
}

export function ThemeLab() {
  const { choice, mode, choose } = useThemeLab()
  const [open, setOpen] = useState(false)
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const palette = paletteById(choice.palette) ?? PALETTES[0]
  const index = PALETTES.indexOf(palette)
  const step = (direction: -1 | 1) => choose({ palette: PALETTES[(index + direction + PALETTES.length) % PALETTES.length].id })
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  // A click or tap anywhere else closes it; the surface underneath keeps its state.
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus()
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      close()
    }
  }

  return (
    <div className="theme-lab" onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        aria-label={`Theme Lab: ${palette.name}, ${modeLabel(choice.mode, mode)}`}
        className="theme-lab-trigger"
      >
        <span className="theme-lab-tag">Theme Lab</span>
        <Swatches palette={palette} mode={mode} />
        <span className="theme-lab-current">{palette.name} · {modeLabel(choice.mode, mode)}</span>
        <svg className="theme-lab-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>

      {open && (
        <div ref={panel} id={`${id}-panel`} role="dialog" aria-label="Theme Lab" className="theme-lab-panel">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Theme Lab</h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">Prototype · design evaluation</p>
            </div>
            <button type="button" onClick={close} aria-label="Close Theme Lab" className="theme-lab-close">×</button>
          </div>

          <div className="mt-3 rounded-xl border border-border bg-surface-raised p-3">
            <div className="flex items-center gap-2">
              <Swatches palette={palette} mode={mode} />
              <span className="min-w-0 flex-1 text-sm font-semibold text-text-primary">{palette.name}</span>
            </div>
            <p className="mt-1 text-xs text-text-muted">{palette.personality ?? 'The current prototype colours, for comparison.'}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => step(-1)} className="theme-lab-step">‹ Previous</button>
              <button type="button" onClick={() => step(1)} className="theme-lab-step">Next ›</button>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className="theme-lab-legend">Color system</legend>
            {PALETTES.map((option, position) => (
              <label key={option.id} className="theme-lab-option">
                <input type="radio" name={`${id}-palette`} value={option.id} checked={option.id === palette.id} onChange={() => choose({ palette: option.id })} />
                <Swatches palette={option} mode={mode} />
                <span className="min-w-0 flex-1">
                  {option.id !== BASELINE_ID && <span className="mr-1.5 font-mono text-[10px] text-text-muted">{position}</span>}
                  {option.name}
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="mt-4">
            <legend className="theme-lab-legend">Mode</legend>
            <div className="theme-lab-modes">
              {MODES.map(option => (
                <label key={option.value} className="theme-lab-mode">
                  <input type="radio" name={`${id}-mode`} value={option.value} checked={choice.mode === option.value} onChange={() => choose({ mode: option.value })} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            {palette.id === BASELINE_ID && mode === 'dark' && (
              <p className="mt-2 text-xs text-text-muted">The current prototype has no dark design. Baseline Dark uses the dark colours it already has, the Operator Console's.</p>
            )}
          </fieldset>

          <button type="button" onClick={() => choose(DEFAULT_CHOICE)} disabled={choice.palette === DEFAULT_CHOICE.palette && choice.mode === DEFAULT_CHOICE.mode} className="theme-lab-reset">
            Reset to Baseline
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
            Candidates for comparison only. Status colours keep their meaning, photography is never recoloured, and the Operator Console stays dark in both modes.
          </p>
        </div>
      )}
    </div>
  )
}
