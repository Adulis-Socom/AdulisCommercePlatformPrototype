// The dialogue library (BOT-001): the 114 scenario groups extracted from the PDF, indexed for the engine and the coverage register.
// Versioned: bump DIALOGUE_LIBRARY_VERSION when any wording, rule or mapping changes, so a stored answer stays attributable.
import { DIALOGUE_SOURCE } from './dialogue-source.generated.ts'
import { TAXONOMY } from '../demo-data/taxonomy.ts'
import type { SourceScenario } from './types.ts'

export const DIALOGUE_LIBRARY_VERSION = '1.0.0'
export const SCENARIOS: readonly SourceScenario[] = DIALOGUE_SOURCE.scenarios
export const scenarioById = (id: string) => SCENARIOS.find(s => s.id === id)

const straight = (text: string) => text.replace(/[‘’]/g, "'").toLowerCase().trim()
export const normQuestion = (text: string) => straight(text).replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Taxonomy leaf id (e.g. "fashion/womens-clothing/dresses") for each F scenario, matched by the names the PDF and the taxonomy share. */
export const LEAF_OF_F: Record<string, string> = {}
/** The F scenario that scripts a taxonomy leaf. */
export const F_OF_LEAF: Record<string, string> = {}
/** Taxonomy id (category, or subcategory without an attribute workbook) -> the G scenario that scripts its gap. */
export const G_OF_CATEGORY: Record<string, string> = {}
/** Scripted buyer questions per leaf: normalised question -> attribute label the PDF answers with. */
export const SCRIPTED_QUESTIONS: Record<string, Record<string, string>> = {}

const fashion = TAXONOMY.find(m => m.id === 'fashion')
for (const s of SCENARIOS.filter(x => x.group === 'F')) {
  const category = fashion?.categories.find(c => straight(c.name) === straight(s.branch ?? ''))
  const sub = category?.subcategories.find(x => straight(x.name) === straight(s.title))
  if (!sub) continue
  LEAF_OF_F[s.id] = sub.id
  F_OF_LEAF[sub.id] = s.id
  const questions: Record<string, string> = {}
  const buyer = s.turns.filter(t => t.role === 'Buyer'), bot = s.turns.filter(t => t.role === 'Bot')
  buyer.forEach((q, i) => {
    const label = /^The Seller lists ([^:]+):/.exec(bot[i]?.text ?? '')?.[1]
    if (label) questions[normQuestion(q.text)] = label.trim()
  })
  SCRIPTED_QUESTIONS[sub.id] = questions
}
for (const s of SCENARIOS.filter(x => x.group === 'G')) {
  const [a, b] = s.title.split(' / ').map(straight)
  for (const major of TAXONOMY) {
    for (const category of major.categories) {
      if (straight(major.name) === a && straight(category.name) === b) G_OF_CATEGORY[category.id] = s.id
      if (straight(category.name) === a) for (const sub of category.subcategories) if (straight(sub.name) === b) G_OF_CATEGORY[sub.id] = s.id
    }
  }
}

/** Dialogue ids (F-xx, or G-xx for a name-only category) that script a taxonomy id. */
export function dialogueForCategory(categoryId: string | null): string[] {
  if (!categoryId) return []
  const f = F_OF_LEAF[categoryId]
  if (f) return [f]
  const parts = categoryId.split('/')
  const g = G_OF_CATEGORY[categoryId] ?? G_OF_CATEGORY[parts.slice(0, 2).join('/')]
  return g ? [g] : []
}
