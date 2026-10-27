/**
 * Derives Theme Lab's --adulis-* tokens from a palette's seven base roles. Everything here is a mix of those roles
 * (sRGB, as CSS color-mix(in srgb) computes it) or a choice between two of them; nothing adds a colour of its own.
 * Foregrounds are chosen, and where needed pulled toward the text colour, until they read at WCAG AA (4.5:1) on the
 * surfaces they sit on. theme-tokens.css maps the prototype's existing colour tokens onto these.
 */

import type { Palette, PaletteRoles, ThemeMode } from './palettes'

type Rgb = [number, number, number]

const rgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const hex = ([r, g, b]: Rgb): string => `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** `weight` of `a` mixed into `b`: color-mix(in srgb, a weight, b). */
export const mix = (a: string, b: string, weight: number): string => {
  const [x, y] = [rgb(a), rgb(b)]
  return hex([0, 1, 2].map(i => x[i] * weight + y[i] * (1 - weight)) as Rgb)
}

const alpha = (color: string, opacity: number): string => `rgba(${rgb(color).join(', ')}, ${opacity})`

const luminance = (color: string): number => {
  const [r, g, b] = rgb(color).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string): number => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const AA = 4.5

/** `color`, moved toward `toward` in 2% steps only as far as it takes to reach `ratio` against every background. */
const readableOn = (color: string, backgrounds: string[], toward: string, ratio = AA): string => {
  for (let step = 0; step <= 50; step++) {
    const candidate = mix(toward, color, step / 50)
    if (backgrounds.every(background => contrast(candidate, background) >= ratio)) return candidate
  }
  return toward
}

/** The lightest-touch mix of `color` toward `away` that still reads at AA on every background (muted text). */
const mutedOn = (color: string, backgrounds: string[], away: string): string => {
  for (let step = 20; step > 0; step--) {
    const candidate = mix(away, color, step / 50)
    if (backgrounds.every(background => contrast(candidate, background) >= AA)) return candidate
  }
  return color
}

/** The functional colours from index.css. Theme Lab never recolours them; Dark mode only lightens each within its own
 *  hue until it reads on the dark surfaces, and tints its soft background from it. */
export const STATUS = {
  success: '#2D7A4F',
  warning: '#936313',
  danger: '#C2372D',
  info: '#2D5CC2',
  courier: '#2D7A7A',
} as const

export interface Inks {
  /** The conventional foreground for the mode (light ink in Light, dark ink in Dark). */
  preferred: string
  other: string
}

const inks = (roles: PaletteRoles, mode: ThemeMode): Inks =>
  mode === 'light' ? { preferred: roles.surface, other: roles.text } : { preferred: roles.background, other: roles.text }

/** The conventional ink when it reads at AA on `fill`, otherwise whichever of the palette's two inks reads better. */
export const foregroundOn = (fill: string, { preferred, other }: Inks): string =>
  contrast(preferred, fill) >= AA || contrast(preferred, fill) >= contrast(other, fill) ? preferred : other

/** The Dark primary, readable on the console's surfaces and on its own 20% tint (the sidebar's count badges). */
const operatorAccent = (dark: PaletteRoles, raised: string): string => {
  for (let step = 0; step <= 50; step++) {
    const candidate = mix(dark.text, dark.primary, step / 50)
    if ([dark.surface, raised, dark.background, mix(candidate, dark.surface, 0.2)].every(background => contrast(candidate, background) >= AA)) return candidate
  }
  return dark.text
}

/** The Operator Console stays a dark console under every system, as it is in the Baseline; it takes the Dark roles, and
 *  its functional colours take their dark-surface forms in both modes. */
const operatorTokens = (dark: PaletteRoles): Record<string, string> => {
  const raised = mix(dark.text, dark.surface, 0.07)
  // Its functional colours in their dark-surface forms. The Baseline shows Operator cautions in its orange accent; under
  // a candidate, --adulis-operator-warning keeps them the warning amber.
  const status: Record<string, string> = { '--adulis-operator-on-status': dark.background }
  for (const [name, base] of Object.entries(STATUS)) {
    const soft = mix(base, dark.surface, 0.2)
    status[`--adulis-operator-${name}`] = readableOn(base, [soft, dark.surface, raised, dark.background], dark.text)
    status[`--adulis-operator-${name}-soft`] = soft
  }
  return {
    ...status,
    '--adulis-operator-bg': dark.background,
    '--adulis-operator-surface': dark.surface,
    '--adulis-operator-raised': raised,
    '--adulis-operator-border': dark.border,
    '--adulis-operator-text': dark.text,
    '--adulis-operator-muted': readableOn(dark.secondary, [dark.surface, raised, dark.background], dark.text),
    '--adulis-operator-accent': operatorAccent(dark, raised),
  }
}

/** Every --adulis-* token for `palette` in `mode`, as CSS custom properties. */
export function themeTokens(palette: Palette, mode: ThemeMode): Record<string, string> {
  const roles = palette[mode]
  const { primary, secondary, accent, background, surface, text, border } = roles
  const ink = inks(roles, mode)
  const raised = mode === 'light' ? mix(text, background, 0.04) : mix(text, surface, 0.07)
  const primarySoft = mix(primary, surface, 0.14)
  const accentSoft = mix(accent, surface, 0.18)
  // Text reads on the surfaces and on the soft tints (selected rows, hero bands).
  const textBackgrounds = [surface, raised, background, primarySoft, accentSoft]
  const onPrimary = foregroundOn(primary, ink)
  const secondaryText = readableOn(secondary, textBackgrounds, text)
  const tokens: Record<string, string> = {
    '--adulis-primary': primary,
    '--adulis-secondary': secondary,
    '--adulis-accent': accent,
    '--adulis-background': background,
    '--adulis-surface': surface,
    '--adulis-text': text,
    '--adulis-border': border,
    '--adulis-primary-hover': mix(text, primary, 0.12),
    // Primary as text (links, active labels, prices): the primary itself wherever it already reads at AA.
    '--adulis-primary-text': readableOn(primary, textBackgrounds, text),
    '--adulis-primary-strong': readableOn(mix(text, primary, 0.12), textBackgrounds, text),
    '--adulis-primary-soft': primarySoft,
    '--adulis-accent-soft': accentSoft,
    '--adulis-surface-secondary': raised,
    '--adulis-secondary-text': secondaryText,
    '--adulis-muted-text': mutedOn(secondaryText, textBackgrounds, surface),
    '--adulis-border-strong': mix(text, border, 0.16),
    '--adulis-focus-ring': [background, surface].every(b => contrast(primary, b) >= 3) ? primary : readableOn(primary, [background, surface], text, 3),
    '--adulis-on-primary': onPrimary,
    // Secondary copy on a primary band: the Baseline's 82% on-primary, or full strength where 82% would read below AA.
    '--adulis-on-primary-muted': contrast(mix(onPrimary, primary, 0.82), primary) >= AA ? mix(onPrimary, primary, 0.82) : onPrimary,
    '--adulis-on-secondary': foregroundOn(secondary, ink),
    '--adulis-on-accent': foregroundOn(accent, ink),
    '--adulis-hover': mix(text, surface, 0.05),
    '--adulis-selected': primarySoft,
    // Dark immersive surfaces (Story viewer, camera, toasts, QR modules) stay dark in both modes; light text on them
    // and on photographs stays light.
    '--adulis-ink': mode === 'light' ? text : background,
    '--adulis-inverse-text': mode === 'light' ? background : text,
    '--adulis-overlay': mode === 'light' ? alpha(text, 0.48) : alpha(background, 0.72),
    ...operatorTokens(palette.dark),
  }
  if (mode === 'dark') {
    for (const [name, base] of Object.entries(STATUS)) {
      const soft = mix(base, surface, 0.2)
      tokens[`--adulis-${name}`] = readableOn(base, [soft, ...textBackgrounds], text)
      tokens[`--adulis-${name}-soft`] = soft
    }
    // Solid status fills are the lightened colours, so their text is the dark ink.
    tokens['--adulis-on-status'] = ink.preferred
  }
  return tokens
}
