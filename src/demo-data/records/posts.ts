// Shoppable Posts (docs/DEMO_DATA.md › Shoppable Posts, › Records created during the demo). Every tag is a
// same-Seller Product (rule 1.5). For You eligibility is derived (derived.ts), never stored.
import type { CalendarDate, Moment } from '../time.ts'
import type { PublicationState } from '../types.ts'
import type { ProductId } from './products.ts'
import type { SellerId, StaffId } from './sellers.ts'

export interface ShoppablePostRecord {
  readonly seller: SellerId
  readonly title: string
  /** Absent for the records created during the demo: DEMO_DATA gives them no type. */
  readonly type?: string
  readonly tags: readonly ProductId[]
  readonly hotspots: number
  readonly publication: PublicationState
  readonly caption: string
  /** Publication date where DEMO_DATA records one. */
  readonly published?: CalendarDate
  /** For records created during the demo. */
  readonly created?: Moment
  readonly createdBy?: StaffId
}

const POST_RECORDS = {
  'SHP-AA-001': { seller: 'SEL-ADDIS-ATELIER', title: 'Autumn Layers', type: 'Styled outfit', tags: ['PRD-AA-001', 'PRD-AA-002', 'PRD-AA-003'], hotspots: 3, publication: 'Published', caption: 'Autumn Layers: our linen overshirt over wide-leg trousers, finished with the structured bag.' },
  'SHP-AA-002': { seller: 'SEL-ADDIS-ATELIER', title: 'Linen, three ways', type: 'Tutorial', tags: ['PRD-AA-001'], hotspots: 1, publication: 'Published', caption: 'One linen overshirt, three ways to wear it this week.' },
  'SHP-AA-003': { seller: 'SEL-ADDIS-ATELIER', title: 'Desk to dinner', type: 'Lifestyle presentation', tags: ['PRD-AA-004', 'PRD-AA-003'], hotspots: 2, publication: 'Published', caption: 'From the desk to dinner in one cotton shirt dress.' },
  'SHP-AA-004': { seller: 'SEL-ADDIS-ATELIER', title: 'Inside the Bole studio', type: 'Lifestyle presentation', tags: [], hotspots: 0, publication: 'Published', caption: 'A morning inside our Bole studio, where every piece is finished.' },
  'SHP-AA-005': { seller: 'SEL-ADDIS-ATELIER', title: 'Belt detail', type: 'Product demonstration', tags: ['PRD-AA-005'], hotspots: 1, publication: 'Published', caption: 'A closer look at the hand-woven belt.' },
  'SHP-NG-001': { seller: 'SEL-NURA-GLOW', title: 'Morning routine in three steps', type: 'Beauty routine', tags: ['PRD-NG-003', 'PRD-NG-001', 'PRD-NG-005'], hotspots: 3, publication: 'Published', caption: 'Cleanse, moisturise, protect: our three-step morning routine.' },
  'SHP-NG-002': { seller: 'SEL-NURA-GLOW', title: 'Find your Lip Tint shade', type: 'Product comparison', tags: ['PRD-NG-002'], hotspots: 1, publication: 'Published', caption: 'Rose, Berry or Coral? Find your Lip Tint shade.' },
  'SHP-NG-003': { seller: 'SEL-NURA-GLOW', title: 'Vitamin C, explained', type: 'Tutorial', tags: ['PRD-NG-004'], hotspots: 1, publication: 'Published', caption: 'How to add Vitamin C to your routine, step by step.' },
  'SHP-NG-004': { seller: 'SEL-NURA-GLOW', title: 'Sunday reset', type: 'Lifestyle presentation', tags: ['PRD-NG-001', 'PRD-NG-002'], hotspots: 2, publication: 'Published', caption: 'A slow Sunday reset with our face cream and tint.' },
  'SHP-NG-005': { seller: 'SEL-NURA-GLOW', title: 'Behind our formulas', type: 'Lifestyle presentation', tags: [], hotspots: 0, publication: 'Draft', caption: 'Behind our formulas: how we test every batch.' },
  'SHP-VH-001': { seller: 'SEL-VOLT-HOUSE', title: 'Desk setup for small spaces', type: 'Desk setup', tags: ['PRD-VH-003', 'PRD-VH-004', 'PRD-VH-005'], hotspots: 3, publication: 'Published', caption: 'A tidy desk setup for small spaces.' },
  'SHP-VH-002': { seller: 'SEL-VOLT-HOUSE', title: 'Earbuds for the commute', type: 'Product demonstration', tags: ['PRD-VH-001'], hotspots: 1, publication: 'Published', caption: 'Earbuds that keep up with the commute.' },
  'SHP-VH-003': { seller: 'SEL-VOLT-HOUSE', title: 'Which charger do I need?', type: 'Product comparison', tags: ['PRD-VH-004', 'PRD-VH-005'], hotspots: 2, publication: 'Published', caption: 'Which charger and cable do you actually need?' },
  // Reported by Maya (MOD-1001); restricted in Flow K at 11:05.
  'SHP-VH-004': { seller: 'SEL-VOLT-HOUSE', title: 'Fast charging, explained', type: 'Tutorial', tags: ['PRD-VH-004'], hotspots: 1, publication: 'Published', caption: 'Fast charging, explained: our 30 W charger fully charges any laptop in 30 minutes.', published: '2026-09-28' },
  'SHP-VH-005': { seller: 'SEL-VOLT-HOUSE', title: 'Unboxing our first shipment', type: 'Lifestyle presentation', tags: [], hotspots: 0, publication: 'Published', caption: 'Unboxing our first shipment of the season.' },
  // Created in Flow E at 12:30, after PRD-AA-006 (SHP-AA-007 is the zero-product path).
  'SHP-AA-006': { seller: 'SEL-ADDIS-ATELIER', title: 'Weekend in linen', tags: ['PRD-AA-006', 'PRD-AA-001'], hotspots: 2, publication: 'Published', caption: 'A weekend in linen: the new midi skirt with our overshirt.', created: { at: '2026-10-02T12:30:00+03:00', sequence: 2 }, createdBy: 'STF-AA-01' },
  'SHP-AA-007': { seller: 'SEL-ADDIS-ATELIER', title: 'Fabric swatches', tags: [], hotspots: 0, publication: 'Published', caption: "This season's linen swatches, straight from the studio.", created: { at: '2026-10-02T12:30:00+03:00', sequence: 3 }, createdBy: 'STF-AA-01' },
} satisfies Record<string, ShoppablePostRecord>

export type ShoppablePostId = keyof typeof POST_RECORDS
export const SHOPPABLE_POSTS: Readonly<Record<ShoppablePostId, ShoppablePostRecord>> = POST_RECORDS
export const SHOPPABLE_POST_IDS = Object.keys(POST_RECORDS) as ShoppablePostId[]

/** Seller Console Home › Shoppable Posts needing action (specification §29). */
export const POST_NEEDS_ATTENTION = {
  title: 'Needs attention',
  message: 'No tagged products are currently available. This post is no longer eligible for For You discovery.',
} as const
