// Couriers and Seller–Courier relationships (docs/DEMO_DATA.md › Courier, › Supporting Courier).
// Completed-for-this-Seller and total completed deliveries are separate statistics (rules 7.1–7.3); their values after
// 10:25 are derived from the Orders that complete later (derived.ts).
import type { CalendarDate, Moment } from '../time.ts'
import type { CourierAvailability } from '../types.ts'
import type { SellerId } from './sellers.ts'

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
}

const COURIER_RECORDS = {
  'COU-DANIEL-K': { name: 'Daniel K.', vehicle: 'Motorcycle', usualAreas: ['Bole', 'Kazanchis'], showcase: true, availability: 'Available', totalCompletedAt1025: 64 },
  'COU-BEREKET-M': { name: 'Bereket M.', vehicle: 'Motorcycle', usualAreas: ['Piassa', 'Arat Kilo'], showcase: false, availability: 'Unavailable', totalCompletedAt1025: 38 },
} satisfies Record<string, CourierRecord>

export type CourierId = keyof typeof COURIER_RECORDS
export const COURIERS: Readonly<Record<CourierId, CourierRecord>> = COURIER_RECORDS
export const COURIER_IDS = Object.keys(COURIER_RECORDS) as CourierId[]

export interface CourierRelationship {
  readonly seller: SellerId
  readonly courier: CourierId
  /** When the Courier applied, where the relationship began as an application. */
  readonly applied?: CalendarDate
  /** When the Seller approved the Courier. Terms are the Seller's current Courier compensation. */
  readonly approved: CalendarDate | Moment
  /** Completed for this Seller, as at 10:25. */
  readonly completedAt1025: number
}

export const COURIER_RELATIONSHIPS: readonly CourierRelationship[] = [
  { seller: 'SEL-ADDIS-ATELIER', courier: 'COU-DANIEL-K', approved: '2026-04-14', completedAt1025: 41 },
  { seller: 'SEL-NURA-GLOW', courier: 'COU-DANIEL-K', approved: '2026-06-02', completedAt1025: 23 },
  { seller: 'SEL-VOLT-HOUSE', courier: 'COU-DANIEL-K', applied: '2026-09-30', approved: { at: '2026-10-02T16:30:00+03:00' }, completedAt1025: 0 },
  { seller: 'SEL-NILE-LOOM', courier: 'COU-BEREKET-M', approved: '2026-06-03', completedAt1025: 38 },
]
