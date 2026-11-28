// DEMO-002: the shared asset manifest. The 391 photograph and logo references in the supplied catalogue (`assets`), keyed by the supplied asset_id,
// with the supplied filename, role, priority and wave. Every one is `pending founder supply`: no photograph is bundled, downloaded or invented, and a
// surface that needs a picture shows the labelled placeholder from `placeholderFor`. Plain TypeScript, safe in Node. When the founder supplies the files,
// only `status` and the file location change here; the IDs and filenames are the contract.
import { CATALOGUE } from './import.ts'

export type AssetRole = 'logo' | 'cover' | 'Product cover' | 'Product detail' | 'Scene still'
export type AssetPriority = 'P0' | 'P1' | 'P2'
export const ASSET_STATUS = 'pending founder supply' as const

export interface AssetEntry {
  assetId: string
  /** The Seller, Product or Scene the picture belongs to (the supplied entity_id; a Seller's own logo and cover use the Seller id). */
  entityId: string
  sellerId: string
  filename: string
  role: AssetRole
  priority: AssetPriority
  wave: string
  /** The supplied art direction for the picture. */
  brief: string
  status: typeof ASSET_STATUS
}

export const ASSET_MANIFEST: Readonly<Record<string, AssetEntry>> = Object.fromEntries(
  CATALOGUE.assets.map(row => {
    const r = row as Record<string, string>
    const entry: AssetEntry = {
      assetId: r.asset_id, entityId: r.entity_id, sellerId: r.seller_id, filename: r.filename, role: r.role as AssetRole,
      priority: r.priority as AssetPriority, wave: r.wave, brief: r.brief, status: ASSET_STATUS,
    }
    return [entry.assetId, entry]
  }),
)

export const ASSETS: readonly AssetEntry[] = Object.values(ASSET_MANIFEST)
export const assetFor = (assetId: string): AssetEntry | undefined => ASSET_MANIFEST[assetId]
export const assetsOf = (entityId: string): readonly AssetEntry[] => ASSETS.filter(a => a.entityId === entityId)

/** What a surface shows in place of a picture: a label that says so, never a stock photograph. */
export function placeholderFor(assetId: string): { label: string; filename: string; role: AssetRole | null; status: typeof ASSET_STATUS } {
  const a = ASSET_MANIFEST[assetId]
  return { label: 'Photo pending', filename: a?.filename ?? `${assetId} (not in the manifest)`, role: a?.role ?? null, status: ASSET_STATUS }
}

/** Counts per role, priority and wave (what ASSET_REGISTER.md reports). */
export function assetCounts(): { total: number; role: Record<string, number>; priority: Record<string, number>; wave: Record<string, number> } {
  const out = { total: ASSETS.length, role: {} as Record<string, number>, priority: {} as Record<string, number>, wave: {} as Record<string, number> }
  for (const a of ASSETS) {
    out.role[a.role] = (out.role[a.role] ?? 0) + 1
    out.priority[a.priority] = (out.priority[a.priority] ?? 0) + 1
    out.wave[a.wave] = (out.wave[a.wave] ?? 0) + 1
  }
  return out
}
