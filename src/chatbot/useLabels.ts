import { useEffect, useState } from 'react'
import { loadLeafLabels, type LeafLabels } from './taxonomy-labels'

/** The taxonomy attribute labels per leaf, once loaded (null until then; the engine still works from the Product's own fields). */
export function useLeafLabels(): LeafLabels | null {
  const [labels, setLabels] = useState<LeafLabels | null>(null)
  useEffect(() => { let live = true; void loadLeafLabels().then(l => { if (live) setLabels(l) }); return () => { live = false } }, [])
  return labels
}
