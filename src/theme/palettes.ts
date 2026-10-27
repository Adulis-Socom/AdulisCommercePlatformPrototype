/**
 * Theme Lab's palette registry: the one place the candidate Adulis colour systems are defined (design evaluation only;
 * none of them is a brand decision). Each system gives seven base roles per mode; every other colour the prototype
 * shows under it is derived from these in tokens.ts.
 */

export type ThemeMode = 'light' | 'dark'

export interface PaletteRoles {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  border: string
}

export interface Palette {
  id: string
  name: string
  personality?: string
  light: PaletteRoles
  /** Absent for Baseline, which has no approved dark design. */
  dark?: PaletteRoles
}

/** A candidate system: Light and Dark. */
export interface CandidatePalette extends Palette {
  personality: string
  dark: PaletteRoles
}

export const BASELINE_ID = 'baseline'

/**
 * Baseline is the current approved prototype, as it stands. Its roles are the existing index.css tokens (brand,
 * text-secondary, brand-light, background, surface, text-primary, border), and it renders from index.css itself,
 * unchanged. There is no approved dark design for it, so it has no Dark roles and Theme Lab's mode doesn't apply to it.
 */
export const BASELINE: Palette = {
  id: BASELINE_ID,
  name: 'Baseline — Current Adulis',
  light: { primary: '#A04720', secondary: '#5C4F45', accent: '#D97B45', background: '#FAF8F5', surface: '#FFFFFF', text: '#1A1512', border: '#E8E0D8' },
}

export const isCandidate = (palette: Palette): palette is CandidatePalette => palette.dark !== undefined

/** A system's roles in a mode; Baseline has Light only. */
export const rolesIn = (palette: Palette, mode: ThemeMode): PaletteRoles => (mode === 'dark' && palette.dark) || palette.light

export const CANDIDATES: readonly CandidatePalette[] = [
  {
    id: 'terracotta-ink',
    name: 'Terracotta & Ink',
    personality: 'Warm · established · sophisticated · culturally grounded',
    light: { primary: '#A4472B', secondary: '#253238', accent: '#BC914B', background: '#FAF8F4', surface: '#FFFFFF', text: '#241F1B', border: '#E5DDD5' },
    dark: { primary: '#E08B6D', secondary: '#AAB9B2', accent: '#D6AF70', background: '#171715', surface: '#252522', text: '#F5F1EA', border: '#414039' },
  },
  {
    id: 'midnight-teal-coral',
    name: 'Midnight Teal & Coral',
    personality: 'Contemporary · confident · approachable · energetic',
    light: { primary: '#075B60', secondary: '#22323F', accent: '#E96B55', background: '#F7F9F8', surface: '#FFFFFF', text: '#18272B', border: '#DFE8E6' },
    dark: { primary: '#67C9C1', secondary: '#A4B8C1', accent: '#FF937F', background: '#101B20', surface: '#1B2B30', text: '#F0F7F6', border: '#35494D' },
  },
  {
    id: 'oxblood-porcelain',
    name: 'Oxblood & Porcelain',
    personality: 'Fashion-forward · premium · editorial · memorable',
    light: { primary: '#752D3B', secondary: '#765D56', accent: '#C77C83', background: '#FBF8F7', surface: '#FFFFFF', text: '#251F22', border: '#E8DCDF' },
    dark: { primary: '#E5A0AA', secondary: '#BCA2A5', accent: '#F1BCC1', background: '#1B1418', surface: '#2A2025', text: '#F8F1F1', border: '#46353D' },
  },
  {
    id: 'cobalt-apricot',
    name: 'Cobalt & Apricot',
    personality: 'Youthful · energetic · confident · digital-native',
    light: { primary: '#244AC0', secondary: '#202B48', accent: '#F4A77B', background: '#F8FAFE', surface: '#FFFFFF', text: '#1A2440', border: '#DFE5F1' },
    dark: { primary: '#88A6FF', secondary: '#A9BBDD', accent: '#FFC09A', background: '#111522', surface: '#1C2335', text: '#F3F6FF', border: '#35415B' },
  },
  {
    id: 'forest-tangerine',
    name: 'Forest Green & Tangerine',
    personality: 'Confident · grounded · welcoming · lively',
    light: { primary: '#215A46', secondary: '#68745A', accent: '#E7793F', background: '#FAFAF5', surface: '#FFFFFF', text: '#1E2922', border: '#E0E6DD' },
    dark: { primary: '#78C8A1', secondary: '#ADC5AF', accent: '#FFAA72', background: '#131B17', surface: '#202B24', text: '#F2F7F0', border: '#3A4B40' },
  },
  {
    id: 'aubergine-copper',
    name: 'Aubergine & Copper',
    personality: 'Creative · sophisticated · distinctive · urban',
    light: { primary: '#52364F', secondary: '#75677A', accent: '#B96543', background: '#F9F7FA', surface: '#FFFFFF', text: '#27212B', border: '#E6DFE8' },
    dark: { primary: '#D2A5CC', secondary: '#B9A9C0', accent: '#F0A17E', background: '#19151C', surface: '#29222E', text: '#F6F1F7', border: '#463B4B' },
  },
  {
    id: 'ink-persimmon',
    name: 'Ink Black & Persimmon',
    personality: 'Bold · minimal · fashionable · direct',
    light: { primary: '#C84C32', secondary: '#242629', accent: '#CC9B55', background: '#FAFAF8', surface: '#FFFFFF', text: '#202124', border: '#E5E5E1' },
    dark: { primary: '#F48A70', secondary: '#B8B9BB', accent: '#E2BD82', background: '#121314', surface: '#202123', text: '#F7F6F3', border: '#393A3C' },
  },
  {
    id: 'indigo-lime',
    name: 'Deep Indigo & Lime',
    personality: 'Progressive · playful · energetic · unconventional',
    light: { primary: '#373B85', secondary: '#62658A', accent: '#B4D45B', background: '#F8F9FC', surface: '#FFFFFF', text: '#20233A', border: '#E1E3EF' },
    dark: { primary: '#A5ADFF', secondary: '#B6B8D7', accent: '#D1F078', background: '#111321', surface: '#20243A', text: '#F4F5FF', border: '#393F59' },
  },
  {
    id: 'petrol-saffron',
    name: 'Petrol Blue & Saffron',
    personality: 'International · dependable · distinctive · warm',
    light: { primary: '#176377', secondary: '#354952', accent: '#D99A24', background: '#F8FAF9', surface: '#FFFFFF', text: '#1D2A30', border: '#DEE7E8' },
    dark: { primary: '#73C5D6', secondary: '#A8BEC5', accent: '#F3C568', background: '#10191E', surface: '#1C2B32', text: '#F1F7F8', border: '#354B53' },
  },
  {
    id: 'espresso-poppy',
    name: 'Espresso & Poppy',
    personality: 'Human · vibrant · expressive · premium',
    light: { primary: '#C43E38', secondary: '#49342D', accent: '#D99B80', background: '#FBF8F3', surface: '#FFFFFF', text: '#29211E', border: '#E9E1D9' },
    dark: { primary: '#FF8980', secondary: '#C6ADA0', accent: '#F2BAA0', background: '#191613', surface: '#29221D', text: '#FAF4ED', border: '#483B34' },
  },
]

/** Baseline first, then the ten candidates in their proposal order. */
export const PALETTES: readonly Palette[] = [BASELINE, ...CANDIDATES]

export const paletteById = (id: string): Palette | undefined => PALETTES.find(palette => palette.id === id)
