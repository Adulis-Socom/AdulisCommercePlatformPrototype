// The attribute LABELS the verified taxonomy defines per leaf (not allowed values, not Product facts). Loaded on demand: the source is large.
export type LeafLabels = Record<string, string[]>
let cache: Promise<LeafLabels> | null = null

export function loadLeafLabels(): Promise<LeafLabels> {
  cache ??= import('../demo-data/taxonomy-attributes.json', { with: { type: 'json' } }).then(module => {
    const all = module.default as unknown as Record<string, { name: string }[]>
    return Object.fromEntries(Object.entries(all).map(([leaf, attributes]) => [leaf, attributes.map(a => a.name)]))
  })
  return cache
}
