// BUYER-FIX-02: the Buyer's private Collections as plain data and pure rules. A Collection holds Save keys ("product:ID" / "post:ID"); the default
// "Saved" Collection always exists and can be neither renamed nor deleted. Nothing here reads a Product or Scene: an item whose record is gone stays in
// its Collection (shown as unavailable by the screens) until the Buyer removes it.
export interface BuyerCollection { id: string; name: string; isDefault: boolean; items: string[] }

export const MAX_COLLECTION_NAME = 40
export const MAX_COLLECTIONS = 50

/** The Buyer's Collections from a seed list, with a default one guaranteed. */
export function ensureDefault(list: readonly BuyerCollection[]): BuyerCollection[] {
  const copy = list.map(c => ({ ...c, items: [...new Set(c.items)] }))
  if (copy.some(c => c.isDefault)) return copy
  return [{ id: 'COL-SAVED', name: 'Saved', isDefault: true, items: [] }, ...copy]
}

/** A name problem, or null when the name is acceptable (trimmed, 1 to 40 characters, not already used by another Collection, ignoring case and spacing). */
export function nameProblem(name: string, list: readonly BuyerCollection[], exceptId?: string): string | null {
  const t = name.trim().replace(/\s+/g, ' ')
  if (!t) return 'Give the Collection a name.'
  if (t.length > MAX_COLLECTION_NAME) return `Use at most ${MAX_COLLECTION_NAME} characters.`
  if (list.some(c => c.id !== exceptId && c.name.trim().toLowerCase() === t.toLowerCase())) return 'You already have a Collection with this name.'
  return null
}

export const clean = (name: string) => name.trim().replace(/\s+/g, ' ')

/** Next id like COL-NEW-001, never reusing one. */
export function nextId(list: readonly BuyerCollection[]): string {
  const max = list.reduce((m, c) => { const n = /^COL-NEW-(\d+)$/.exec(c.id); return n ? Math.max(m, Number(n[1])) : m }, 0)
  return `COL-NEW-${String(max + 1).padStart(3, '0')}`
}

export function create(list: readonly BuyerCollection[], name: string, items: readonly string[] = []): { list: BuyerCollection[]; id: string } | { error: string } {
  const error = nameProblem(name, list) ?? (list.length >= MAX_COLLECTIONS ? `You can keep up to ${MAX_COLLECTIONS} Collections.` : null)
  if (error) return { error }
  const id = nextId(list)
  return { list: [...list, { id, name: clean(name), isDefault: false, items: [...new Set(items)] }], id }
}

export function rename(list: readonly BuyerCollection[], id: string, name: string): { list: BuyerCollection[] } | { error: string } {
  const target = list.find(c => c.id === id)
  if (!target) return { error: 'This Collection no longer exists.' }
  if (target.isDefault) return { error: 'The Saved Collection keeps its name.' }
  const error = nameProblem(name, list, id)
  return error ? { error } : { list: list.map(c => (c.id === id ? { ...c, name: clean(name) } : c)) }
}

/** Deleting a Collection removes the Collection only; an item that was in no other Collection is no longer saved. */
export function remove(list: readonly BuyerCollection[], id: string): { list: BuyerCollection[] } | { error: string } {
  const target = list.find(c => c.id === id)
  if (!target) return { error: 'This Collection no longer exists.' }
  if (target.isDefault) return { error: 'The Saved Collection cannot be deleted.' }
  return { list: list.filter(c => c.id !== id) }
}

/** Adds an item to a Collection once: false when it is already there (a duplicate is never added). */
export function add(list: readonly BuyerCollection[], id: string, key: string): { list: BuyerCollection[]; added: boolean } {
  const target = list.find(c => c.id === id)
  if (!target || target.items.includes(key)) return { list: [...list], added: false }
  return { list: list.map(c => (c.id === id ? { ...c, items: [...c.items, key] } : c)), added: true }
}

export const removeItem = (list: readonly BuyerCollection[], id: string, key: string): BuyerCollection[] => list.map(c => (c.id === id ? { ...c, items: c.items.filter(k => k !== key) } : c))
/** The Buyer unsaves an item: it leaves every Collection. */
export const unsave = (list: readonly BuyerCollection[], key: string): BuyerCollection[] => list.map(c => ({ ...c, items: c.items.filter(k => k !== key) }))
export const isSaved = (list: readonly BuyerCollection[], key: string) => list.some(c => c.items.includes(key))
export const collectionsOf = (list: readonly BuyerCollection[], key: string) => list.filter(c => c.items.includes(key))

/** Items of a Collection split by kind, in the order saved. */
export function split(c: BuyerCollection): { products: string[]; posts: string[] } {
  return { products: c.items.filter(k => k.startsWith('product:')).map(k => k.slice('product:'.length)), posts: c.items.filter(k => k.startsWith('post:')).map(k => k.slice('post:'.length)) }
}

/** Sessions that stored the earlier "saved changes" map: apply it on top of the seed (true adds to the default Collection, false removes everywhere). */
export function applyLegacySaves(list: readonly BuyerCollection[], saved: Readonly<Record<string, boolean>> | null | undefined): BuyerCollection[] {
  let out = ensureDefault(list)
  const def = out.find(c => c.isDefault)!.id
  for (const [key, on] of Object.entries(saved ?? {})) out = on ? add(out, def, key).list : unsave(out, key)
  return out
}

/** A stored list read back from the session: shapes repaired, duplicates dropped, a default guaranteed. */
export function normalize(raw: unknown): BuyerCollection[] | null {
  if (!Array.isArray(raw)) return null
  const seen = new Set<string>()
  const list: BuyerCollection[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const c = item as Partial<BuyerCollection>
    if (typeof c.id !== 'string' || seen.has(c.id)) continue
    seen.add(c.id)
    list.push({ id: c.id, name: typeof c.name === 'string' && c.name.trim() ? clean(c.name).slice(0, MAX_COLLECTION_NAME) : 'Collection', isDefault: c.isDefault === true, items: Array.isArray(c.items) ? [...new Set(c.items.filter((k): k is string => typeof k === 'string' && /^(product|post):.+/.test(k)))] : [] })
  }
  return ensureDefault(list.map((c, i, all) => (c.isDefault && all.findIndex(x => x.isDefault) !== i ? { ...c, isDefault: false } : c)))
}
