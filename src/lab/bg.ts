import catalogueJson from './model-catalogue.json'

/**
 * Background-removal client shared by the Lab (BGR-017/018) and the Product Media Editor (BGR-019). The catalogue is generated
 * from tools/bg-removal/models.json (the single registry); the loopback adapter enforces admission on its own, and this module
 * only keeps the UI honest: nothing is requested for a model the registry does not admit. No photo ever goes anywhere but
 * 127.0.0.1, and nothing here contacts an external service.
 */
export const ADAPTER = 'http://127.0.0.1:8765'
export const TOKEN_KEY = 'adulis.bg-adapter-token'
export const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_BYTES = 10 * 1024 * 1024
export const REQUEST_LIMIT_MS = 70_000

export interface ModelAsset { file: string; bytes: number | null; rembgChecksum?: string | null; actualSha256?: string | null }
export interface ModelSettings { alphaMatting?: boolean; postProcessMask?: boolean; onlyMask?: boolean; decontaminate?: boolean; samPoints?: boolean; clothRegion?: string[] }
/** Verified against the installed rembg source (BGR-FIX-01); see tools/bg-removal/models.json. */
export interface ModelRuntime { inputHandling?: string; dynamicResolution?: boolean; precision?: string; verifiedIn?: string; note?: string }
export interface ModelEntry {
  id: string; label: string; family: string; purpose: string; scope: string; kind: 'local' | 'remote' | 'custom'
  status: string; statusNote: string; blocker: string; admitted: boolean
  evaluationPermission: string; commercialUse: string; redistribution: string; trainingDataConcerns: string; licenceFamily: string
  settings: ModelSettings; assets: ModelAsset[]; resources?: { diskMb: number; ramMbEstimate: number; basis: string }
  modes?: string[]; requirements?: string[]; inputSize?: number[] | null; implementation: string
  runtime?: ModelRuntime
  officialPublisher?: { repo: string; files: string[]; licence: string; hash: string; onnxOfficial: boolean }
}
export interface LicenceFamily { classification: string; code: string; weights: string; data: string; note: string }
export const CATALOGUE = catalogueJson as unknown as { rembg: { version: string; licence: string; release: string; sessionCount: number }; licenceFamilies: Record<string, LicenceFamily>; models: ModelEntry[]; notRegisteredReleaseAssets: string[] }

export const GROUPS: { scope: string; label: string; help: string }[] = [
  { scope: 'general', label: 'General', help: 'All-round removal for most product photos.' },
  { scope: 'lightweight', label: 'Lightweight', help: 'Smaller and faster, usually less detail.' },
  { scope: 'high-detail', label: 'High detail', help: 'Heavier models for fine edges such as hair or lace.' },
  { scope: 'specialised', label: 'Specialised', help: 'Built for one kind of subject, such as people or garments.' },
  { scope: 'interactive', label: 'Interactive', help: 'You point at the subject; it does not find it on its own.' },
  { scope: 'custom', label: 'Custom checkpoint', help: 'Your own checkpoint. None is registered.' },
  { scope: 'external', label: 'External service', help: 'Hosted and paid. Inactive: no photo is ever sent.' },
]

export const STATUS_LABEL: Record<string, string> = {
  admitted: 'Cleared to run', candidate: 'Blocked: evidence incomplete', unresolved: 'Blocked: permission unresolved', restricted: 'Blocked: licence restricted',
  'custom-unregistered': 'No checkpoint registered', 'external-inactive': 'External: inactive',
}

export type Backdrop = 'checker' | 'white' | 'grey' | 'black' | 'edge'
export const BACKDROPS: { id: Backdrop; label: string; css: string }[] = [
  { id: 'checker', label: 'Transparent', css: 'conic-gradient(#d4d4d4 25%, #fff 0 50%, #d4d4d4 0 75%, #fff 0) 0 0 / 16px 16px' },
  { id: 'white', label: 'White', css: '#ffffff' },
  { id: 'grey', label: 'Grey', css: '#808080' },
  { id: 'black', label: 'Black', css: '#000000' },
  { id: 'edge', label: 'Edge check', css: '#ff00ff' },
]

export const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' } }
export const storeToken = (value: string) => { try { sessionStorage.setItem(TOKEN_KEY, value) } catch { /* the token is just not remembered */ } }

export interface LiveEntry { status: string; admitted: boolean; installed: boolean; loaded: boolean; ready: boolean; preflight: { ok: boolean; freeRamMb: number; needRamMb: number } | null }
/** What the adapter machine really runs, read from its installed packages (GET /catalogue). */
export interface Runtime { python: string; platform: string; machine: string; cpuCount: number; freeRamMb: number; ompNumThreads: string | null; packages: Record<string, string | null>; onnxruntimeProviders: string[]; adapterProviders: string[]; decontaminateSupported: boolean; missingRequirements: Record<string, string[]> }
export type Live = { state: 'checking' } | { state: 'offline' } | { state: 'online'; byId: Record<string, LiveEntry>; maxSessions: number; runtime: Runtime | null }

/** The adapter's live view of every model. The adapter, not this UI, decides admission. */
export async function fetchLive(signal?: AbortSignal): Promise<Live> {
  try {
    const response = await fetch(`${ADAPTER}/catalogue`, { signal: signal ?? AbortSignal.timeout(3000) })
    if (!response.ok) return { state: 'offline' }
    const body = (await response.json()) as { maxSessions: number; runtime?: Runtime; models: (LiveEntry & { id: string })[] }
    return { state: 'online', maxSessions: body.maxSessions, runtime: body.runtime ?? null, byId: Object.fromEntries(body.models.map(entry => [entry.id, entry])) }
  } catch { return { state: 'offline' } }
}

/**
 * A model can be run only when the adapter (which reads the registry itself) admits it, has it installed and has the memory.
 * The shipped catalogue is a generated mirror used while the adapter is not answering: it can only ever say "no".
 */
export function runState(model: ModelEntry, live: Live): { runnable: boolean; reason: string } {
  if (live.state === 'checking') return { runnable: false, reason: 'Checking the local adapter…' }
  if (live.state === 'offline') return { runnable: false, reason: model.admitted ? 'The local adapter is not running.' : model.blocker }
  const entry = live.byId[model.id]
  if (!entry?.admitted) return { runnable: false, reason: entry ? model.blocker : 'The adapter does not know this model.' }
  if (!entry.installed) return { runnable: false, reason: 'Not installed yet.' }
  if (entry.preflight && !entry.preflight.ok) return { runnable: false, reason: `Not enough free memory (${entry.preflight.freeRamMb} MB free, about ${entry.preflight.needRamMb} MB needed).` }
  return { runnable: true, reason: '' }
}

export interface Point { x: number; y: number; label: 0 | 1 }
/** `points` belong to ONE photograph: the Lab keeps them per photo and builds the settings for each run, never reusing another photo's. */
export interface RunSettings { onlyMask: boolean; alphaMatting: boolean; postProcessMask: boolean; decontaminate: boolean; fg: number; bg: number; erode: number; points: Point[]; cloth: string }
/** rembg 2.0.88 alpha-matting defaults (rembg/bg.py). */
export const DEFAULT_SETTINGS: RunSettings = { onlyMask: false, alphaMatting: false, postProcessMask: false, decontaminate: false, fg: 240, bg: 10, erode: 10, points: [], cloth: '' }
export const MAX_MATTING_PIXELS = 4_000_000
export const MAX_PIXELS = 16_000_000

/** Why these settings cannot be used with this model, or '' when they are fine. Incompatible settings are never silently combined. */
export function settingsProblem(model: ModelEntry, s: RunSettings): string {
  const own = model.settings
  if (s.onlyMask && s.alphaMatting) return 'Alpha matting changes the cut-out, so it cannot be combined with a mask-only result.'
  if (s.decontaminate && own.decontaminate && s.onlyMask) return 'Colour decontamination recolours the cut-out, so it cannot be combined with a mask-only result.'
  if (s.decontaminate && own.decontaminate && s.alphaMatting && own.alphaMatting) return 'Alpha matting already estimates the foreground colour, so choose either matting or decontamination.'
  if (s.alphaMatting && own.alphaMatting) {
    if (![s.fg, s.bg, s.erode].every(Number.isInteger) || s.fg < 1 || s.fg > 255 || s.bg < 0 || s.bg > 254 || s.erode < 0 || s.erode > 50) return 'Matting thresholds must be whole numbers: foreground 1-255, background 0-254, erode 0-50.'
    if (s.fg <= s.bg) return 'The foreground threshold must be higher than the background threshold.'
  }
  if (own.clothRegion && !s.cloth) return 'Choose a clothing region.'
  return ''
}

/** SAM needs foreground points on the very photograph it will cut; '' when this model needs none or they are present. */
export function pointsProblem(model: ModelEntry, points: Point[]): string {
  return model.scope === 'interactive' && !points.some(p => p.label === 1) ? 'Click this photograph to add at least one foreground point.' : ''
}

/** Why this photograph cannot be run with these settings (size limits), or ''. */
export function photoProblem(width: number, height: number, s: RunSettings, models: ModelEntry[]): string {
  if (width * height > MAX_PIXELS) return 'This photograph is larger than 16 megapixels.'
  if (s.alphaMatting && models.some(m => m.settings.alphaMatting) && width * height > MAX_MATTING_PIXELS) return 'Alpha matting is limited to 4 megapixels; use a smaller photograph or turn matting off.'
  return ''
}

export function settingsQuery(model: ModelEntry, s: RunSettings): string {
  const q = new URLSearchParams({ model: model.id })
  if (s.onlyMask && model.settings.onlyMask) q.set('only_mask', '1')
  if (s.alphaMatting && model.settings.alphaMatting) q.set('alpha_matting', '1')
  if (s.postProcessMask && model.settings.postProcessMask) q.set('post_process_mask', '1')
  if (s.decontaminate && model.settings.decontaminate && !s.alphaMatting) q.set('decontaminate', '1')
  if (s.alphaMatting && model.settings.alphaMatting) { q.set('fg_threshold', String(s.fg)); q.set('bg_threshold', String(s.bg)); q.set('erode_size', String(s.erode)) }
  if (model.settings.samPoints && s.points.length) q.set('points', s.points.map(p => `${Math.round(p.x)},${Math.round(p.y)},${p.label}`).join(';'))
  if (model.settings.clothRegion && s.cloth) q.set('cloth', s.cloth)
  return q.toString()
}

/** The settings that actually applied to this model (what the export records), not everything on screen. */
export function effectiveSettings(model: ModelEntry, s: RunSettings) {
  return {
    onlyMask: !!(s.onlyMask && model.settings.onlyMask), alphaMatting: !!(s.alphaMatting && model.settings.alphaMatting), postProcessMask: !!(s.postProcessMask && model.settings.postProcessMask),
    decontaminate: !!(s.decontaminate && model.settings.decontaminate && !s.alphaMatting),
    matting: s.alphaMatting && model.settings.alphaMatting ? { foregroundThreshold: s.fg, backgroundThreshold: s.bg, erodeSize: s.erode } : null,
    points: model.settings.samPoints ? s.points : [], cloth: model.settings.clothRegion ? s.cloth : '',
  }
}

/** `peakMb` is the adapter PROCESS's high-water mark since it started (cumulative over every model run so far); `loadDeltaMb` is the RSS growth of this cold load (approximate model footprint, null when warm). */
export interface RunMeta { model: string; inferenceMs: number; loadMs: number; peakMb: number; rssMb: number; loadDeltaMb: number | null; cold: boolean; provider: string; size: string; outputSize: string; bytes: number; inputSha256: string; outputSha256: string; checkpointSha256: string[] }

export async function runModel(args: { model: ModelEntry; blob: Blob; settings: RunSettings; token: string; signal: AbortSignal }): Promise<{ blob: Blob; meta: RunMeta }> {
  const { model, blob, settings, token, signal } = args
  const response = await fetch(`${ADAPTER}/remove?${settingsQuery(model, settings)}`, { method: 'POST', body: blob, headers: { 'X-Adulis-Token': token.trim(), 'Content-Type': blob.type }, signal })
  if (!response.ok) {
    const message = (await response.json().catch(() => null))?.error as string | undefined
    throw new Error(response.status === 401 ? 'The adapter did not accept that token. Copy it again from the adapter window.' : message ?? `The adapter answered ${response.status}.`)
  }
  const out = await response.blob()
  const h = (name: string) => response.headers.get(name) ?? ''
  return { blob: out, meta: { model: h('X-Model'), inferenceMs: Number(h('X-Inference-Ms')), loadMs: Number(h('X-Load-Ms')), peakMb: Number(h('X-Peak-Rss-Mb')), rssMb: Number(h('X-Rss-Mb')), loadDeltaMb: h('X-Load-Delta-Mb') === '' ? null : Number(h('X-Load-Delta-Mb')), cold: h('X-Cold') === '1', provider: h('X-Provider'), size: h('X-Input-Size'), outputSize: h('X-Output-Size'), bytes: out.size, inputSha256: h('X-Input-Sha256'), outputSha256: h('X-Output-Sha256'), checkpointSha256: h('X-Checkpoint-Sha256').split(',').filter(Boolean) } }
}

export async function unloadModels(token: string): Promise<boolean> {
  try { return (await fetch(`${ADAPTER}/unload`, { method: 'POST', headers: { 'X-Adulis-Token': token.trim() } })).ok } catch { return false }
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ---- manual scoring (BGR-018) ----
export const CRITERIA = ['Detail', 'Completeness', 'Fine edge', 'Colour and texture', 'Removal completeness', 'Transparency', 'Overall presentation'] as const
export interface Score { ratings: Partial<Record<(typeof CRITERIA)[number], number>>; decision: 'accept' | 'reject' | null; critical: boolean }
export const emptyScore = (): Score => ({ ratings: {}, decision: null, critical: false })
/** Mean of the rated criteria (1-5). A critical misrepresentation overrides everything: the result is rejected and has no score. */
export function overall(score: Score): { value: number | null; rejected: boolean } {
  if (score.critical) return { value: null, rejected: true }
  const values = Object.values(score.ratings).filter((v): v is number => typeof v === 'number')
  return { value: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null, rejected: score.decision === 'reject' }
}
