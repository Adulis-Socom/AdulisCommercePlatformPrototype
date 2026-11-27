// Shared drivers for the SIM-001 / SIM-002 browser suites (marketplace dataset, internal simulation). Not a suite itself (no .test.mjs suffix).
import { readFileSync } from 'node:fs'

const read = f => JSON.parse(readFileSync(new URL(`../src/marketplace/data/${f}.json`, import.meta.url), 'utf8'))
export const cat = read('catalogue'), ops = read('operations')
export const sellerName = id => cat.sellers.find(s => s.seller_id === id).name
export const SIM_KEY = 'adulis.simulation.v1:marketplace|simulation'
export const WS_KEY = 'adulis.seller-workspace.v1:marketplace'

export function drivers(page, t, viewport) {
  const phone = viewport.width <= 640
  const main = () => page.locator('main.app-main').innerText()
  const settle = ms => t.settle(ms ?? 350)
  const click = async (name, scope = page) => { await scope.getByRole('button', { name, exact: typeof name === 'string' }).first().click(); await settle(300) }
  // The prototype-mode switch lives in the section sidebar, which phone widths hide: widen the window just for the switch.
  const setMode = async simulation => {
    if (phone) await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByRole('button', { name: simulation ? 'Internal simulation' : 'Current MVP', exact: true }).click(); await settle(500)
    if (phone) { await page.setViewportSize(viewport); await settle(300) }
  }
  // Re-selecting the section that is already open does not remount it, so an Order detail left open stays open: close it.
  const closeDetail = async () => { const b = page.locator('[data-order-detail] button').filter({ hasText: /^← / }).first(); if (await b.count()) { await b.click(); await settle(300) } }
  const consoleOrders = async (seller) => {
    await t.section('08 Seller Console'); await settle(400)
    if (seller) { await page.getByRole('button', { name: /Switch Seller/ }).click(); await settle(300); await page.getByRole('menuitemradio', { name: new RegExp(sellerName(seller)) }).click(); await settle(500) }
    if (phone) { await page.getByRole('button', { name: 'Open Seller Console navigation' }).click(); await settle(300); await page.locator('.seller-console-sidebar').getByRole('button', { name: /^Orders/ }).first().click() }
    else await page.getByRole('button', { name: /^Orders/ }).first().click()
    await settle(500); await closeDetail()
  }
  const companion = async (tab, seller) => {
    await t.section('06 Mobile — Seller Companion'); await settle(400)
    if (seller) { await page.getByRole('button', { name: /Switch Seller/ }).first().click(); await settle(300); await page.getByRole('dialog', { name: 'Switch Seller' }).getByRole('button', { name: new RegExp(sellerName(seller)) }).click(); await settle(500) }
    if (tab) await page.locator('main.app-main nav').last().getByRole('button', { name: new RegExp('(^|\\s)' + tab + '$') }).click(); await settle(400); await closeDetail() }
  const buyerOrders = async id => {
    await t.section('05 Mobile — Buyer'); await page.getByRole('button', { name: 'Explore as guest' }).click(); await settle(400)
    await page.getByLabel('Buyer account (prototype)').selectOption(id); await settle(600)
    await page.getByRole('button', { name: /^Orders/, exact: false }).last().click(); await settle(500); await closeDetail()
  }
  const courier = async (id, tab) => {
    await t.section('07 Mobile — Courier'); await settle(400)
    if (id) { await page.locator('#courier-account').selectOption(id); await settle(300) }
    if (tab) { await page.locator('[data-surface="marketplace-courier"] nav').getByRole('button', { name: new RegExp('^' + tab) }).click(); await settle(400) }
  }
  const row = id => page.locator(`[data-order-row="${id}"]`).first()
  const openOrder = async id => { await row(id).click(); await settle(400); }
  const detailText = () => page.locator('[data-order-detail]').first().innerText()
  const status = async () => (await page.locator('[data-order-detail] [data-status]').first().getAttribute('data-status'))
  const token = async () => (await page.locator('[data-token]').first().innerText()).trim()
  const lastResult = async () => { const m = page.locator('[data-sim-result]').last(); return { kind: await m.getAttribute('data-sim-result'), text: (await m.innerText()).trim() } }
  const act = async name => { await page.locator('[data-order-detail]').getByRole('button', { name, exact: typeof name === 'string' }).first().click(); await settle(300) }
  const scan = async ({ stage, token: tok, order } = {}) => {
    const panel = page.locator('section:has(h3:text("Scan a handoff code"))').last()
    if (order !== undefined) await panel.locator('input').first().fill(order)
    if (stage) await panel.locator('select').selectOption(stage)
    await panel.getByPlaceholder('ADU-SIM-XXXX-XXXX').fill(tok ?? '')
    await panel.getByRole('button', { name: 'Scan', exact: true }).click(); await settle(300)
    return lastResult()
  }
  const advance = async m => { await page.getByRole('button', { name: `Advance simulated time by ${m} minutes` }).first().click(); await settle(250) }
  const simState = () => page.evaluate(k => sessionStorage.getItem(k), SIM_KEY)
  const wsState = () => page.evaluate(k => sessionStorage.getItem(k), WS_KEY)
  const newOrder = async ({ buyer = 'BY-02', mode = 'BUYER_COLLECTION' } = {}) => {
    await page.locator('#neworder-buyer').selectOption(buyer); await page.locator('#neworder-mode').selectOption(mode)
    await click('Record demonstration Order')
    const r = await lastResult()
    return { ...r, id: (r.text.match(/SIM-O-D\d+/) ?? [])[0] }
  }
  return { phone, main, settle, click, setMode, consoleOrders, companion, buyerOrders, courier, row, openOrder, detailText, status, token, lastResult, act, scan, advance, simState, wsState, newOrder }
}
