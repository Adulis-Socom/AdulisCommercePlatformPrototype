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
export interface ModelSettings { alphaMatting?: boolean; postProcessMask?: boolean; onlyMask?: boolean; samPoints?: boolean; clothRegion?: string[]; dynamicResolution?: boolean }
export interface ModelEntry {
  id: string; label: string; family: string; purpose: string; scope: string; kind: 'local' | 'remote' | 'custom'
  status: string; statusNote: string; blocker: string; admitted: boolean
  evaluationPermission: string; commercialUse: string; redistribution: string; trainingDataConcerns: string; licenceFamily: string
  settings: ModelSettings; assets: ModelAsset[]; resources?: { diskMb: number; ramMbEstimate: number; basis: string }
  modes?: string[]; requirements?: string[]; inputSize?: number[] | null; implementation: string
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
export type Live = { state: 'checking' } | { state: 'offline' } | { state: 'online'; byId: Record<string, LiveEntry>; maxSessions: number }

/** The adapter's live view of every model. The adapter, not this UI, decides admission. */
export async function fetchLive(signal?: AbortSignal): Promise<Live> {
  try {
    const response = await fetch(`${ADAPTER}/catalogue`, { signal: signal ?? AbortSignal.timeout(3000) })
    if (!response.ok) return { state: 'offline' }
    const body = (await response.json()) as { maxSessions: number; models: (LiveEntry & { id: string })[] }
    return { state: 'online', maxSessions: body.maxSessions, byId: Object.fromEntries(body.models.map(entry => [entry.id, entry])) }
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

export interface RunSettings { onlyMask: boolean; alphaMatting: boolean; postProcessMask: boolean; points: { x: number; y: number; label: 0 | 1 }[]; cloth: string }
export const DEFAULT_SETTINGS: RunSettings = { onlyMask: false, alphaMatting: false, postProcessMask: false, points: [], cloth: '' }

/** Why these settings cannot be used with this model, or '' when they are fine. Incompatible settings are never silently combined. */
export function settingsProblem(model: ModelEntry, s: RunSettings): string {
  const own = model.settings
  if (s.onlyMask && s.alphaMatting) return 'Alpha matting changes the cut-out, so it cannot be combined with a mask-only result.'
  if (model.scope === 'interactive' && !s.points.some(p => p.label === 1)) return 'Click the photo to add at least one foreground point.'
  if (own.clothRegion && !s.cloth) return 'Choose a clothing region.'
  return ''
}

export function settingsQuery(model: ModelEntry, s: RunSettings): string {
  const q = new URLSearchParams({ model: model.id })
  if (s.onlyMask && model.settings.onlyMask) q.set('only_mask', '1')
  if (s.alphaMatting && model.settings.alphaMatting) q.set('alpha_matting', '1')
  if (s.postProcessMask && model.settings.postProcessMask) q.set('post_process_mask', '1')
  if (model.settings.samPoints && s.points.length) q.set('points', s.points.map(p => `${Math.round(p.x)},${Math.round(p.y)},${p.label}`).join(';'))
  if (model.settings.clothRegion && s.cloth) q.set('cloth', s.cloth)
  return q.toString()
}

/** The settings that actually applied to this model (what the export records), not everything on screen. */
export function effectiveSettings(model: ModelEntry, s: RunSettings) {
  return {
    onlyMask: !!(s.onlyMask && model.settings.onlyMask), alphaMatting: !!(s.alphaMatting && model.settings.alphaMatting), postProcessMask: !!(s.postProcessMask && model.settings.postProcessMask),
    points: model.settings.samPoints ? s.points : [], cloth: model.settings.clothRegion ? s.cloth : '', dynamicResolution: !!model.settings.dynamicResolution,
  }
}

export interface RunMeta { model: string; inferenceMs: number; loadMs: number; peakMb: number; rssMb: number; cold: boolean; provider: string; size: string; bytes: number }

export async function runModel(args: { model: ModelEntry; blob: Blob; settings: RunSettings; token: string; signal: AbortSignal }): Promise<{ blob: Blob; meta: RunMeta }> {
  const { model, blob, settings, token, signal } = args
  const response = await fetch(`${ADAPTER}/remove?${settingsQuery(model, settings)}`, { method: 'POST', body: blob, headers: { 'X-Adulis-Token': token.trim(), 'Content-Type': blob.type }, signal })
  if (!response.ok) {
    const message = (await response.json().catch(() => null))?.error as string | undefined
    throw new Error(response.status === 401 ? 'The adapter did not accept that token. Copy it again from the adapter window.' : message ?? `The adapter answered ${response.status}.`)
  }
  const out = await response.blob()
  const h = (name: string) => response.headers.get(name) ?? ''
  return { blob: out, meta: { model: h('X-Model'), inferenceMs: Number(h('X-Inference-Ms')), loadMs: Number(h('X-Load-Ms')), peakMb: Number(h('X-Peak-Rss-Mb')), rssMb: Number(h('X-Rss-Mb')), cold: h('X-Cold') === '1', provider: h('X-Provider'), size: h('X-Input-Size'), bytes: out.size } }
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
