// Dataset selection (DEMO-001/002). The marketplace dataset (docs/references/marketplace) is the default. `?dataset=legacy` in the
// address selects the historical seeded dataset (Addis Atelier, Nura Glow, Volt House) that the regression suites and the guided
// flows were built on. Read once at module load: switching dataset means reloading with the other query. Plain TypeScript, no
// React, safe to load in Node (where there is no `location`, so the marketplace dataset is selected).
export type Dataset = 'legacy' | 'marketplace'

const query = typeof location !== 'undefined' ? location.search : ''
export const DATASET: Dataset = new URLSearchParams(query).get('dataset') === 'legacy' ? 'legacy' : 'marketplace'
export const isLegacy = DATASET === 'legacy'

/** A storage key scoped to the dataset. Legacy keeps its original keys, so the legacy app is exactly as before; marketplace data never mixes with it. */
export const datasetKey = (key: string): string => (isLegacy ? key : `${key}:marketplace`)
