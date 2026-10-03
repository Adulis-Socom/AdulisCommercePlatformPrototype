// Reviews (docs/DEMO_DATA.md › Reviews). The Buyer and Seller come from the Order. Seller and Product rating totals
// (records/sellers.ts, records/products.ts) include every review except REV-1003, which is written in Flow I.
import type { CalendarDate, Moment } from '../time.ts'
import type { OrderId } from './orders.ts'
import type { ProductId } from './products.ts'

export interface ReviewRecord {
  readonly order: OrderId
  readonly sellerService: number
  /** Product Quality, one rating per reviewed Product. */
  readonly productQuality: readonly { readonly product: ProductId; readonly rating: number }[]
  readonly text: string
  readonly written: CalendarDate | Moment
}

const REVIEW_RECORDS = {
  'REV-1001': { order: 'ADU-23864', sellerService: 5, productQuality: [{ product: 'PRD-NG-003', rating: 5 }, { product: 'PRD-NG-002', rating: 4 }], text: 'Gentle on my skin. The tint arrived with a cracked cap, but Nura Glow sorted it quickly.', written: '2026-09-15' },
  'REV-1002': { order: 'ADU-23921', sellerService: 5, productQuality: [{ product: 'PRD-AA-003', rating: 5 }], text: 'Beautifully finished, and it really does fit my laptop.', written: '2026-09-20' },
  'REV-1003': { order: 'ADU-24091', sellerService: 5, productQuality: [{ product: 'PRD-AA-001', rating: 5 }], text: 'Lovely fabric and the fit is spot on.', written: { at: '2026-10-02T17:20:00+03:00' } },
  'REV-1004': { order: 'ADU-23952', sellerService: 5, productQuality: [{ product: 'PRD-VH-001', rating: 4 }], text: 'Good sound for the price, and collecting at the Megenagna shop was quick.', written: '2026-09-23' },
  'REV-1005': { order: 'ADU-24007', sellerService: 5, productQuality: [{ product: 'PRD-NG-003', rating: 5 }], text: 'Low-foam and gentle. It arrived the next morning.', written: '2026-09-29' },
  'REV-1006': { order: 'ADU-24041', sellerService: 5, productQuality: [{ product: 'PRD-AA-001', rating: 5 }], text: 'Great fit, and picking it up from the Bole studio was easy.', written: '2026-10-01' },
} satisfies Record<string, ReviewRecord>

export type ReviewId = keyof typeof REVIEW_RECORDS
export const REVIEWS: Readonly<Record<ReviewId, ReviewRecord>> = REVIEW_RECORDS
export const REVIEW_IDS = Object.keys(REVIEW_RECORDS) as ReviewId[]
