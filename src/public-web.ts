// WEB-002: the public web's pure rules. No React, no store: Node unit-tests it (explicit imports only).
//
// A public link is `?surface=storefront&seller=DS-01&scene=DS-01-S01&product=DS-01-P01`. It names records only; the app decides what is public when it
// resolves them, so a crafted link can never reach a Draft or Suspended Seller, an unpublished Product or a hidden Scene. `?dataset=` is carried along.

export interface PublicLink { surface: 'storefront' | 'home'; seller?: string; scene?: string; product?: string; /** An id that is not shaped like one: never resolved. */ bad?: boolean }

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/
const KEYS = ['seller', 'scene', 'product'] as const

/** The link a query string carries, or undefined when it names no public surface. */
export function parsePublicLink(search: string): PublicLink | undefined {
  const q = new URLSearchParams(search)
  const surface = q.get('surface')
  if (surface !== 'storefront' && surface !== 'home') return undefined
  const link: PublicLink = { surface }
  for (const key of KEYS) {
    const value = q.get(key)
    if (value === null) continue
    if (ID.test(value)) link[key] = value
    else link.bad = true
  }
  return link
}

/** The shareable address for a public view: the page's own origin and path, the dataset when one is chosen, then the link. */
export function publicUrl(link: Omit<PublicLink, 'bad'>, where: { origin: string; pathname: string; search: string }): string {
  const q = new URLSearchParams()
  const dataset = new URLSearchParams(where.search).get('dataset')
  if (dataset) q.set('dataset', dataset)
  q.set('surface', link.surface)
  for (const key of KEYS) if (link[key]) q.set(key, link[key]!)
  return `${where.origin}${where.pathname}?${q.toString()}`
}

/** What a public page cannot do without an account, and the sentence the Install prompt opens with. Nothing is created by any of them. */
export type InstallAction = 'like' | 'save' | 'follow' | 'chat' | 'cart'
const PHRASE: Record<InstallAction, (what: string) => string> = {
  like: what => `like ${what}`,
  save: what => `save ${what}`,
  follow: what => `follow ${what}`,
  chat: what => `chat with ${what}`,
  cart: what => `add ${what} to your Cart`,
}
export const installMessage = (action: InstallAction, what: string): string => `Install Adulis to ${PHRASE[action](what)}`
