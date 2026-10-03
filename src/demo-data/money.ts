// Money (docs/DEMO_DATA.md › Conventions; rules 5.6–5.8). Amounts are held in santim, ETB's minor unit
// (1 birr = 100 santim), so every DEMO_DATA amount is exact.

/** An amount of ETB in santim. */
export type Santim = number

/** Reads an amount written as in DEMO_DATA ('2,450.00') into santim. */
export function etb(text: string): Santim {
  const m = /^(\d{1,3}(?:,\d{3})*)\.(\d{2})$/.exec(text)
  if (!m) throw new Error(`Not an ETB amount: ${text}`)
  return Number(m[1].replace(/,/g, '')) * 100 + Number(m[2])
}

/** '2,450' for whole-birr amounts, '12.25' otherwise: whole birr show no decimal zeros, other amounts two decimals. */
export function formatAmount(amount: Santim): string {
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`Not an amount in santim: ${amount}`)
  const whole = String(Math.floor(amount / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const santim = amount % 100
  return santim === 0 ? whole : `${whole}.${String(santim).padStart(2, '0')}`
}

/** 'ETB 2,450', 'ETB 12.25' */
export function formatEtb(amount: Santim): string {
  return `ETB ${formatAmount(amount)}`
}

/**
 * The Adulis surcharge: 0.5% of the Products subtotal, excluding any delivery charge (rules 5.6–5.8).
 * No rounding rule is approved, so an amount that isn't a whole number of santim is an error, never rounded.
 */
export function adulisSurcharge(productsSubtotal: Santim): Santim {
  const surcharge = (productsSubtotal * 5) / 1000
  if (!Number.isInteger(surcharge)) throw new Error(`0.5% of ${formatEtb(productsSubtotal)} is not a whole number of santim`)
  return surcharge
}
