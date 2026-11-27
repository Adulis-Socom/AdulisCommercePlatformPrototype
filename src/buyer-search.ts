// FIX-005: real frontend search over the EFFECTIVE Products, Scenes and Sellers (seeded and authored alike). Pure: it ranks documents it is
// given, so updated names, new Products and unpublished or restricted items are decided by whoever builds the documents (the Buyer app builds them
// from the live records, which already exclude unpublished and restricted content).
export interface ProductDoc {
  id: string; name: string; description: string; sellerId: string; sellerName: string
  /** "Fashion › Women’s Clothing › Dresses" (authored) or the Seller's category (seeded Products carry no taxonomy). */
  category: string
  attributes: { label: string; value: string }[]; details: string[]
  available: boolean; locallyMade: boolean
}
export interface SceneDoc { id: string; title: string; caption: string; sellerId: string; sellerName: string; productNames: string[] }
export interface SellerDoc { id: string; name: string; handle: string; bio: string; area: string; category: string }

/** Lower-case, strip accents and compatibility forms (NFKC + NFD), split on anything that is not a letter or digit in ANY script (Amharic included). */
export function tokens(text: string): string[] {
  return text.normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}
/** Every query token must be a prefix of some word of the field text; the score weights where it matched. */
function score(query: string[], fields: [string, number][]): number {
  const words = fields.map(([text, weight]) => ({ words: tokens(text), weight }))
  let total = 0
  for (const q of query) {
    let best = 0
    for (const f of words) if (f.words.some(w => w === q)) best = Math.max(best, f.weight * 2); else if (f.words.some(w => w.startsWith(q))) best = Math.max(best, f.weight)
    if (!best) return 0
    total += best
  }
  return total
}

export interface ProductFilters { availableOnly: boolean; category: string; attribute: { label: string; value: string } | null; locallyMade: boolean }
export const NO_FILTERS: ProductFilters = { availableOnly: false, category: '', attribute: null, locallyMade: false }

export function searchProducts(docs: readonly ProductDoc[], query: string, f: ProductFilters = NO_FILTERS): ProductDoc[] {
  const q = tokens(query)
  if (!q.length) return []
  return docs
    .map(d => ({ d, s: score(q, [[d.name, 5], [d.sellerName, 3], [d.category, 2], [d.attributes.map(a => `${a.label} ${a.value}`).join(' '), 2], [d.details.join(' '), 2], [d.description, 1]]) }))
    .filter(r => r.s > 0)
    .filter(r => (!f.availableOnly || r.d.available) && (!f.category || r.d.category.startsWith(f.category)) && (!f.locallyMade || r.d.locallyMade)
      && (!f.attribute || r.d.attributes.some(a => a.label === f.attribute!.label && tokens(a.value).join(' ') === tokens(f.attribute!.value).join(' '))))
    // currently available first, then by relevance, then by name (stable and explainable)
    .sort((a, b) => Number(b.d.available) - Number(a.d.available) || b.s - a.s || a.d.name.localeCompare(b.d.name))
    .map(r => r.d)
}
export function searchScenes(docs: readonly SceneDoc[], query: string): SceneDoc[] {
  const q = tokens(query)
  if (!q.length) return []
  return docs.map(d => ({ d, s: score(q, [[d.title, 5], [d.productNames.join(' '), 3], [d.sellerName, 3], [d.caption, 1]]) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s || a.d.title.localeCompare(b.d.title)).map(r => r.d)
}
export function searchSellers(docs: readonly SellerDoc[], query: string): SellerDoc[] {
  const q = tokens(query)
  if (!q.length) return []
  return docs.map(d => ({ d, s: score(q, [[d.name, 5], [d.handle, 4], [d.category, 2], [d.area, 2], [d.bio, 1]]) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s || a.d.name.localeCompare(b.d.name)).map(r => r.d)
}

/** Category and attribute choices that actually apply to the matching Products (never a filter that would return nothing). */
export function facets(matches: readonly ProductDoc[]): { categories: { name: string; count: number }[]; attributes: { label: string; value: string; count: number }[] } {
  const cats = new Map<string, number>()
  for (const d of matches) {
    const parts = d.category.split(' › ').filter(Boolean)
    for (let i = 1; i <= Math.min(parts.length, 2); i++) { const key = parts.slice(0, i).join(' › '); cats.set(key, (cats.get(key) ?? 0) + 1) }
  }
  const attrs = new Map<string, { label: string; value: string; count: number }>()
  for (const d of matches) for (const a of d.attributes) { const key = `${a.label}\u0000${tokens(a.value).join(' ')}`; const cur = attrs.get(key); if (cur) cur.count++; else attrs.set(key, { label: a.label, value: a.value, count: 1 }) }
  return {
    categories: [...cats].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    attributes: [...attrs.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 30),
  }
}
