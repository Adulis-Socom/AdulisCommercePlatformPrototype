// Shared drivers for the WEB-002 / WEB-003 browser suites (public Storefront, marketplace dataset). Not a suite itself (no .test.mjs suffix).
import { readFileSync } from 'node:fs'

const read = f => JSON.parse(readFileSync(new URL(`../src/marketplace/data/${f}.json`, import.meta.url), 'utf8'))
export const cat = read('catalogue')
export const P = Object.fromEntries(cat.products.map(p => [p.product_id, p]))
export const S = Object.fromEntries(cat.sellers.map(s => [s.seller_id, s]))
export const SC = Object.fromEntries(cat.scenes.map(s => [s.scene_id, s]))
export const publicSellers = cat.sellers.filter(s => s.lifecycle === 'ACTIVE').map(s => s.seller_id)
export const publicScenes = id => cat.scenes.filter(s => s.seller_id === id && s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC')
export const publishedProducts = id => cat.products.filter(p => p.seller_id === id && p.publication === 'PUBLISHED')
export const hiddenScenes = cat.scenes.filter(s => !(s.publication === 'PUBLISHED' && s.visibility === 'PUBLIC'))
export const draftProducts = cat.products.filter(p => p.publication !== 'PUBLISHED')
/** The Product's availability as the app words it (the 3-unit low-stock threshold). */
export const availability = p => (p.stock === 0 ? 'Out of Stock' : p.stock <= 3 ? 'Low Stock' : 'Available')
export const money = n => `ETB ${Number(n).toLocaleString('en-US')}`

export function web(page, t, viewport) {
  const sf = () => page.locator('.storefront-phone')
  const text = () => sf().innerText()
  const settle = ms => t.settle(ms ?? 350)
  const click = async (loc, ms = 350) => { await loc.first().click(); await settle(ms) }
  const openStorefront = async (query = '') => { await t.open(query); if (!query) await t.section('04 Seller Storefront'); await settle(500) }
  // Choosing the Seller already shown reopens its Storefront from the first screen (through the Bio Link entry), so a test always starts from the profile.
  const pick = async id => {
    const pill = page.locator('.storefront-toolbar').getByRole('button', { name: S[id].name, exact: true })
    if ((await pill.getAttribute('aria-pressed')) === 'true') await click(page.getByRole('button', { name: 'Bio Link → Storefront' }), 450)
    else await click(pill, 450)
  }
  const tab = async name => { await click(sf().getByRole('tab', { name }), 300) }
  /** Everything persisted in the browser: what must not change when a public action only asks for an install. */
  const storage = () => page.evaluate(() => JSON.stringify([Object.entries(sessionStorage).sort(), Object.entries(localStorage).sort()]))
  const overflow = async label => t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, await page.evaluate(() => { const m = document.querySelector('main.app-main'); return m.scrollWidth <= m.clientWidth + 1 }))
  const dialog = name => page.getByRole('dialog', { name })
  return { sf, text, settle, click, openStorefront, pick, tab, storage, overflow, dialog }
}
