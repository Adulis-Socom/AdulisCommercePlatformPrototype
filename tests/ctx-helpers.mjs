// Drivers for the Seller Console's "Talking about" selector (FR-002: a combobox with a listbox popover, no longer a native <select>). Not a suite.
export const ctx = page => page.getByRole('combobox', { name: 'Talking about' })

/** Open the selector, read every choice (and its group), close it again. */
export async function ctxOptions(page) {
  await ctx(page).click()
  const listbox = page.getByRole('listbox', { name: 'Talking about' })
  await listbox.waitFor()
  const out = await listbox.evaluate(el => ({
    texts: [...el.querySelectorAll('[role=option]')].map(o => o.textContent.trim()),
    groups: [...el.querySelectorAll('[role=group]')].map(g => [g.getAttribute('aria-label'), [...g.querySelectorAll('[role=option]')].map(o => o.textContent.trim())]),
  }))
  await page.keyboard.press('Escape')
  return out
}

/** Choose a context by its exact label (string) or a pattern. */
export async function ctxPick(page, match) {
  await ctx(page).click()
  await page.getByRole('option', { name: match, exact: typeof match === 'string' }).first().click()
}
