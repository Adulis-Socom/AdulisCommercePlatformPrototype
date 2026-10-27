// Couriers and Seller–Courier relationships (docs/DEMO_DATA.md › Courier, › Supporting Courier), and the Courier
// evaluation fixtures (refinement PR-008).
// Completed-for-this-Seller and total completed deliveries are separate statistics (rules 7.1–7.3); their values after
// 10:25 are derived from the Orders that complete later (derived.ts).
// Each Courier has one global profile; each Seller relationship is separate and private to that Seller (ADU-FUL-01
// §§10–16). The PR-008 fixtures are prototype evaluation data, not DEMO_DATA records: they add no Order, change no
// canonical event, and give Daniel K. no new figure. Bereket M. stays operations-only, outside the Seller-facing ten.
import type { CalendarDate, Moment } from '../time.ts'
import type { CourierAvailability } from '../types.ts'
import type { SellerId } from './sellers.ts'

/** Platform verification (ADU-FUL-01 §§11–12). A platform suspension or block overrides every Seller's approval. */
export type CourierVerification = 'Verified' | 'Pending' | 'Suspended' | 'Blocked'

export interface CourierRecord {
  readonly name: string
  readonly vehicle: string
  readonly usualAreas: readonly string[]
  /** The showcase Courier, or the supporting Courier who appears only in Nile Loom's records and HMR-1001. */
  readonly showcase: boolean
  /** Availability at 10:25, before any of the day's deliveries. */
  readonly availability: CourierAvailability
  /** Total completed deliveries across Sellers, as at 10:25. */
  readonly totalCompletedAt1025: number
  /** Platform verification; Verified where none is given (DEMO_DATA's Couriers are verified and working). */
  readonly verification?: CourierVerification
  /** When the Courier profile was created. Recorded for the PR-008 fixtures only. */
  readonly memberSince?: CalendarDate
  /** A PR-008 evaluation fixture rather than a DEMO_DATA record. */
  readonly evaluation?: true
}

const COURIER_RECORDS = {
  'COU-DANIEL-K': { name: 'Daniel K.', vehicle: 'Motorcycle', usualAreas: ['Bole', 'Kazanchis'], showcase: true, availability: 'Available', totalCompletedAt1025: 64 },
  'COU-BEREKET-M': { name: 'Bereket M.', vehicle: 'Motorcycle', usualAreas: ['Piassa', 'Arat Kilo'], showcase: false, availability: 'Unavailable', totalCompletedAt1025: 38 },
  // ---------- PR-008 Courier evaluation fixtures (prototype; not DEMO_DATA records) ----------
  // A Busy fixture is on an active delivery that isn't modelled: it may be another Seller's, so no Order names it.
  'COU-MEKDES-A': { name: 'Mekdes A.', vehicle: 'Motorcycle', usualAreas: ['Bole', 'CMC', 'Megenagna'], showcase: false, availability: 'Available', totalCompletedAt1025: 212, memberSince: '2024-08-19', evaluation: true },
  'COU-YONAS-G': { name: 'Yonas G.', vehicle: 'Bicycle', usualAreas: ['Bole', 'Kazanchis'], showcase: false, availability: 'Available', totalCompletedAt1025: 37, memberSince: '2026-04-27', evaluation: true },
  'COU-TSION-B': { name: 'Tsion B.', vehicle: 'Motorcycle', usualAreas: ['Kazanchis', 'Sar Bet', 'Mexico'], showcase: false, availability: 'Busy', totalCompletedAt1025: 96, memberSince: '2025-06-10', evaluation: true },
  'COU-DAWIT-H': { name: 'Dawit H.', vehicle: 'Car', usualAreas: ['CMC', 'Ayat', 'Megenagna'], showcase: false, availability: 'Busy', totalCompletedAt1025: 58, memberSince: '2025-09-15', evaluation: true },
  'COU-HELEN-W': { name: 'Helen W.', vehicle: 'On foot', usualAreas: ['Kazanchis'], showcase: false, availability: 'Unavailable', totalCompletedAt1025: 19, memberSince: '2026-07-08', evaluation: true },
  'COU-KALEAB-T': { name: 'Kaleab T.', vehicle: 'Motorcycle', usualAreas: ['Megenagna', 'Ayat'], showcase: false, availability: 'Available', totalCompletedAt1025: 0, verification: 'Pending', memberSince: '2026-09-28', evaluation: true },
  'COU-ROBEL-F': { name: 'Robel F.', vehicle: 'Motorcycle', usualAreas: ['Piassa', 'Mexico', 'Saris'], showcase: false, availability: 'Available', totalCompletedAt1025: 143, memberSince: '2025-03-02', evaluation: true },
  'COU-BETELHEM-S': { name: 'Betelhem S.', vehicle: 'Bicycle', usualAreas: ['Bole', 'Old Airport'], showcase: false, availability: 'Available', totalCompletedAt1025: 11, memberSince: '2026-08-21', evaluation: true },
  'COU-NATNAEL-D': { name: 'Natnael D.', vehicle: 'Motorcycle', usualAreas: ['Kazanchis', 'Megenagna', 'Bole'], showcase: false, availability: 'Unavailable', totalCompletedAt1025: 74, verification: 'Suspended', memberSince: '2025-01-20', evaluation: true },
} satisfies Record<string, CourierRecord>

export type CourierId = keyof typeof COURIER_RECORDS
export const COURIERS: Readonly<Record<CourierId, CourierRecord>> = COURIER_RECORDS
export const COURIER_IDS = Object.keys(COURIER_RECORDS) as CourierId[]
/** The ten Couriers the showcase Sellers can work with: Daniel K. and the nine PR-008 fixtures. */
export const SELLER_FACING_COURIER_IDS = COURIER_IDS.filter(id => COURIERS[id].showcase || COURIERS[id].evaluation)

export interface CourierRelationship {
  readonly seller: SellerId
  readonly courier: CourierId
  /** When the Courier applied, where the relationship began as an application. */
  readonly applied?: CalendarDate
  /** When the Seller invited the Courier, where the relationship began as an invitation; it awaits the Courier. */
  readonly invited?: CalendarDate
  /** When the Seller approved the Courier. Terms are the Seller's current Courier compensation. */
  readonly approved?: CalendarDate | Moment
  /** When the Seller suspended the relationship: the Courier stays in its records but receives no offers. */
  readonly suspended?: CalendarDate
  /** When the Seller removed the Courier from its pool. */
  readonly removed?: CalendarDate
  /** Completed for this Seller, as at 10:25. */
  readonly completedAt1025: number
}

export const COURIER_RELATIONSHIPS: readonly CourierRelationship[] = [
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-DANIEL-K', approved: '2026-04-14', completedAt1025: 41 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-DANIEL-K', approved: '2026-06-02', completedAt1025: 23 },
  { seller: 'SEL-VOLT-HOUSE', courier: 'COU-DANIEL-K', applied: '2026-09-30', approved: { at: '2026-10-02T16:30:00+03:00' }, completedAt1025: 0 },
  { seller: 'SEL-NILE-LOOM', courier: 'COU-BEREKET-M', approved: '2026-06-03', completedAt1025: 38 },
  // ---------- PR-008 evaluation fixtures ----------
  // Addis Atelier (Bole): a broad pool, an applicant and a suspended relationship.
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-YONAS-G', approved: '2026-05-04', completedAt1025: 34 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-MEKDES-A', approved: '2026-08-11', completedAt1025: 9 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-TSION-B', approved: '2026-02-16', completedAt1025: 22 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-DAWIT-H', approved: '2026-06-29', completedAt1025: 6 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-HELEN-W', approved: '2026-07-20', completedAt1025: 4 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-BETELHEM-S', applied: '2026-09-29', completedAt1025: 0 },
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-ROBEL-F', approved: '2025-11-10', suspended: '2026-09-22', completedAt1025: 12 },
  // Nura Glow (Kazanchis): long relationships, a platform-suspended Courier, an applicant and a removed relationship.
  { seller: 'SEL-NURA-GLOW', courier: 'COU-MEKDES-A', approved: '2025-02-24', completedAt1025: 118 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-TSION-B', approved: '2025-07-03', completedAt1025: 41 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-HELEN-W', approved: '2026-07-15', completedAt1025: 13 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-NATNAEL-D', approved: '2025-03-18', completedAt1025: 52 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-DAWIT-H', applied: '2026-09-30', completedAt1025: 0 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-YONAS-G', approved: '2026-06-10', removed: '2026-08-30', completedAt1025: 3 },
  // Volt House (Megenagna): no approved Courier before Flow F; an applicant awaiting verification and an invitation.
  { seller: 'SEL-VOLT-HOUSE', courier: 'COU-KALEAB-T', applied: '2026-10-01', completedAt1025: 0 },
  { seller: 'SEL-VOLT-HOUSE', courier: 'COU-ROBEL-F', invited: '2026-09-26', completedAt1025: 0 },
]
