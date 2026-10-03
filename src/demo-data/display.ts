// Presentation helpers shared by the surfaces. They hold no demo facts.
import { formatEtb } from './money.ts'
import type { FulfilmentOption } from './derived.ts'
import type { TrustLevel } from './types.ts'

/** The first letters of a name's first two words, upper-cased: 'Ab Cd Ef' → 'AC'. */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('')
}

/** The first word of a name ('Ab Cd' → 'Ab'): how the guided-flow copy refers to people. */
export function firstName(name: string): string {
  return name.split(/\s+/)[0]
}

/** First name and last initial ('Ab Cd' → 'Ab C.'): how people are shown on Seller and Courier surfaces (DEMO_DATA.md › Secondary Buyers). */
export function shortName(fullName: string): string {
  const [first, ...rest] = fullName.split(/\s+/)
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first
}

/** 'Established' for ESTABLISHED: a Trust level as the surfaces print it; '—' before the Seller is admitted. */
export function trustLabel(level: TrustLevel | undefined): string {
  return level ? level[0] + level.slice(1).toLowerCase() : '—'
}

/** '1.2k' for 1,240, '210' for 210: a follower count as profile stats print it. */
export function formatCompactCount(count: number): string {
  return count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count)
}

/** 'Buyer Collection (free) · Courier Delivery ETB 180': a Seller's fulfilment options and charges on one line. */
export function describeFulfilment(options: readonly FulfilmentOption[]): string {
  return options.map(option => (option.charge ? `${option.mode} ${formatEtb(option.charge)}` : `${option.mode} (free)`)).join(' · ')
}
