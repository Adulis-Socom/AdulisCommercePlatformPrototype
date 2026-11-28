// Shared drivers for the COMP-001..003 browser suites (Seller Companion on the marketplace dataset). Not a suite itself (no .test.mjs suffix).
import { drivers, ops, cat, sellerName } from './sim-helpers.mjs'

export { ops, cat, sellerName }
export const SESSION_KEY = 'adulis.companion-session.v1:marketplace'
export const WS_KEY = 'adulis.seller-workspace.v1:marketplace'
export const SELLER_KEY = 'adulis.selected-seller.v1:marketplace'
export const cap = s => s.charAt(0) + s.slice(1).toLowerCase()
export const dsProducts = id => cat.products.filter(p => p.seller_id === id && p.publication === 'PUBLISHED')
export const lowOf = id => dsProducts(id).filter(p => p.stock >= 1 && p.stock <= 3)
export const outOf = id => dsProducts(id).filter(p => p.stock === 0)

export function comp(page, t, viewport) {
  const d = drivers(page, t, viewport)
  const text = () => page.locator('main.app-main').innerText()
  const nav = () => page.locator('main.app-main nav').last()
  const tab = async name => { await nav().getByRole('button', { name: new RegExp('(^|\\s)' + name + '$') }).click(); await t.settle(450) }
  const tabNames = async () => (await nav().getByRole('button').allInnerTexts()).map(x => x.replace(/^\d+\s*/, '').replace(/\s*\d+$/, '').trim())
  const open = async (seller, name = 'Alerts') => { await t.open(); await d.companion(name, seller) }
  const actAs = async id => { await tab('Team'); if (!(await page.locator('[data-acting-as]').count())) { await page.getByRole('button', { name: 'Back to Team' }).first().click(); await t.settle(300) } ; await page.locator('[data-acting-as]').click(); await t.settle(250); await page.locator(`[data-act-as="${id}"]`).click(); await t.settle(300) }
  const store = key => page.evaluate(k => { try { return JSON.parse(sessionStorage.getItem(k) ?? 'null') } catch { return null } }, key)
  const overflow = async label => t.ck(`${label}: no horizontal page overflow at ${viewport.width}px`, await page.evaluate(() => { const m = document.querySelector('main.app-main'); return m.scrollWidth <= m.clientWidth + 1 }))
  const alert = id => page.locator(`[data-alert="${id}"]`)
  const click = async (loc, ms = 400) => { await loc.first().click(); await t.settle(ms) }
  const backToAlerts = async () => { await page.getByRole('button', { name: 'Back to Alerts' }).first().click(); await t.settle(400) }
  return { ...d, text, nav, tab, tabNames, open, actAs, store, overflow, alert, click, backToAlerts }
}
