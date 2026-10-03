// Claims (docs/DEMO_DATA.md › Claims). The Buyer, Seller and Product variant come from the Order. Outcomes are those of
// these fictional cases only; they don't establish replacement, refund or exchange policy.
import type { Timestamp } from '../time.ts'
import type { ClaimState } from '../types.ts'
import type { DecisionId, OperatorId } from './operations.ts'
import type { OrderId } from './orders.ts'
import type { ProductId } from './products.ts'

export interface ClaimRecord {
  readonly order: OrderId
  readonly product: ProductId
  readonly issue: 'Item damaged' | 'Item not as described'
  readonly statement: string
  readonly evidencePhotos: number
  /** Oldest first; the first entry is the submission. */
  readonly history: readonly { readonly state: ClaimState; readonly at: Timestamp; readonly by?: OperatorId }[]
  readonly outcome?: string
  /** The Founder decision that resolved it. */
  readonly decision?: DecisionId
  /** Fictional record-specific Seller response deadline; not Claim SLA policy. */
  readonly responseDeadline?: Timestamp
}

const CLAIM_RECORDS = {
  'CLM-1001': {
    order: 'ADU-23864', product: 'PRD-NG-002', issue: 'Item damaged',
    statement: 'The Lip Tint cap was cracked when it arrived.', evidencePhotos: 1,
    history: [{ state: 'Open', at: '2026-09-12T13:05:00+03:00' }, { state: 'Resolved', at: '2026-09-14T10:30:00+03:00' }],
    outcome: 'Nura Glow provided a replacement Lip Tint.',
  },
  // Open and unassigned in the Operator Claims queue at 10:25; Flow J resolves it through Founder dual review.
  'CLM-1002': {
    order: 'ADU-23978', product: 'PRD-AA-002', issue: 'Item not as described',
    statement: 'The trousers are much darker than the Sand colour shown in the photos.', evidencePhotos: 2,
    history: [
      { state: 'Open', at: '2026-10-02T09:12:00+03:00' },
      { state: 'Under Review', at: '2026-10-02T10:50:00+03:00', by: 'OPR-COO-CTO' },
      { state: 'Resolved', at: '2026-10-02T11:45:00+03:00' },
    ],
    decision: 'DEC-1001',
    responseDeadline: '2026-10-03T12:00:00+03:00',
  },
} satisfies Record<string, ClaimRecord>

export type ClaimId = keyof typeof CLAIM_RECORDS
export const CLAIMS: Readonly<Record<ClaimId, ClaimRecord>> = CLAIM_RECORDS
export const CLAIM_IDS = Object.keys(CLAIM_RECORDS) as ClaimId[]
