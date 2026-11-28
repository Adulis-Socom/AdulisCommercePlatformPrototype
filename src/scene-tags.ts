// FR-001: Scene tag identity and numbering, pure (no React, no store) so Node can unit-test it (explicit .ts imports only).
//
// A tag has an immutable `id` ("T1", "T2", ...) handed out by a counter that only grows, so an id is never reused. The number a person
// SEES is not stored: it is the tag's place in the Scene's composition (index + 1). Explicit deletion therefore compacts the numbers to
// 1..N, deleting every tag makes the next added tag number 1, and a Product's availability never touches a number (an unavailable tag
// keeps its place and is shown unavailable). A tag may be unpositioned (no x / y): the marketplace dataset gives tagged Products but no
// coordinates, and none are ever invented.

export interface Tag { id: string; product: string }
export interface TagState<T extends Tag = Tag> { tags: T[]; next: number }
export interface Placed { x: number; y: number }

/** The number shown for the tag at `index` of the composition. */
export const tagNumber = (index: number): number => index + 1
const idNumber = (id: string): number => Number(/^T(\d+)$/.exec(id)?.[1]) || 0
const makeId = (n: number) => `T${n}`

/** A Scene's tags with the next free id number; it never goes down, so removing tags never frees an id. */
export function addTag<T extends Tag>(s: TagState<T>, product: string, extra: Omit<T, 'id' | 'product'>): TagState<T> {
  if (s.tags.some(t => t.product === product)) return s // one tag per Product in a Scene
  const n = Math.max(s.next, s.tags.reduce((m, t) => Math.max(m, idNumber(t.id)), 0) + 1)
  return { tags: [...s.tags, { ...extra, id: makeId(n), product } as T], next: n + 1 }
}

export const removeTag = <T extends Tag>(s: TagState<T>, id: string): TagState<T> => ({ ...s, tags: s.tags.filter(t => t.id !== id) })

export type Replacement<T extends Tag> = { ok: true; state: TagState<T> } | { ok: false; reason: string }
/**
 * Swap the Product on a tag, keeping its id, its position and its number. `allowed` is the Seller's own Products a tag may carry now
 * (published, in stock, same Seller); the replacement must be one of them and must not already be tagged in this Scene.
 */
export function replaceTagProduct<T extends Tag>(s: TagState<T>, id: string, product: string, allowed: readonly string[]): Replacement<T> {
  const tag = s.tags.find(t => t.id === id)
  if (!tag) return { ok: false, reason: 'That tag no longer exists.' }
  if (tag.product === product) return { ok: false, reason: 'That Product is already on this tag.' }
  if (!allowed.includes(product)) return { ok: false, reason: 'Choose one of your own published, in-stock Products.' }
  if (s.tags.some(t => t.product === product)) return { ok: false, reason: 'That Product is already tagged in this Scene.' }
  return { ok: true, state: { ...s, tags: s.tags.map(t => (t.id === id ? { ...t, product } : t)) } }
}

/** Tags saved before ids existed (they carried a never-reused number `n`) get ids T<n> and keep their order; the counter stays ahead of every id. */
export function migrateTags<T extends Tag>(raw: readonly (Omit<T, 'id'> & { id?: string; n?: number })[], counter?: number): TagState<T> {
  const used = new Set<string>()
  let top = 0
  const withIds = raw.map((t, i) => {
    let id = typeof t.id === 'string' && t.id ? t.id : makeId(t.n ?? i + 1)
    while (used.has(id)) id = makeId(Math.max(top, idNumber(id)) + 1)
    used.add(id); top = Math.max(top, idNumber(id))
    const { n: _n, ...rest } = t
    return { ...rest, id } as unknown as T
  })
  return { tags: withIds, next: Math.max(counter ?? 0, top + 1) }
}

/** An unpositioned list (the dataset's tagged Products, in order) as tags T1..Tn. */
export const tagsFromProducts = (products: readonly string[]): TagState => migrateTags(products.map(product => ({ product })))
export const isPlaced = <T extends Tag>(t: T): t is T & Placed => typeof (t as Partial<Placed>).x === 'number' && typeof (t as Partial<Placed>).y === 'number'
