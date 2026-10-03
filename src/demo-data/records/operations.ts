// Operators, Founder decisions, Operator queue cases, Solo Coverage and the audit log (docs/DEMO_DATA.md › Moderation,
// › Operators, › Operator queues at 10:25). Operators are roles; the approved specification doesn't name them.
import type { CalendarDate, Timestamp } from '../time.ts'
import type { BuyerId } from './buyers.ts'
import type { CourierId } from './couriers.ts'
import type { OrderId } from './orders.ts'
import type { ShoppablePostId } from './posts.ts'
import type { SellerId, StaffId } from './sellers.ts'

const OPERATOR_RECORDS = {
  'OPR-CEO': { title: 'Founder, CEO', role: 'CEO' },
  'OPR-COO-CTO': { title: 'Founder, COO/CTO', role: 'COO/CTO' },
} satisfies Record<string, { readonly title: string; readonly role: string }>

export type OperatorId = keyof typeof OPERATOR_RECORDS
export const OPERATORS: Readonly<Record<OperatorId, { readonly title: string; readonly role: string }>> = OPERATOR_RECORDS

export interface DecisionRecord {
  readonly text: string
  readonly proposedBy: OperatorId
  readonly proposed: Timestamp
  readonly approvedBy: OperatorId
  readonly approved: Timestamp
}

/** Founder decisions under dual review. DEC-1001 is referenced from the Claim it resolves (records/claims.ts). */
const DECISION_RECORDS = {
  'DEC-1001': {
    text: "Resolve CLM-1002 in the Buyer's favour: Addis Atelier exchanges the trousers for the colour shown in the listing.",
    proposedBy: 'OPR-COO-CTO', proposed: '2026-10-02T11:20:00+03:00',
    approvedBy: 'OPR-CEO', approved: '2026-10-02T11:45:00+03:00',
  },
} satisfies Record<string, DecisionRecord>

export type DecisionId = keyof typeof DECISION_RECORDS
export const DECISIONS: Readonly<Record<DecisionId, DecisionRecord>> = DECISION_RECORDS

export interface ModerationRecord {
  readonly post: ShoppablePostId
  readonly reportedBy: BuyerId
  readonly reported: Timestamp
  /** A report category (specification §7). */
  readonly reason: string
  /** Restrict removes the post from For You, Search and the Seller's Storefront; its tagged Products are unaffected. */
  readonly action: { readonly kind: 'Restrict'; readonly by: OperatorId; readonly at: Timestamp }
}

const MODERATION_RECORDS = {
  // On the revision of SHP-VH-004 published 28 September 2026. Open at 10:25; Flow K restricts it.
  'MOD-1001': {
    post: 'SHP-VH-004', reportedBy: 'BUY-MAYA-TESFAYE', reported: '2026-10-02T09:40:00+03:00',
    reason: 'Misleading or inaccurate product information',
    action: { kind: 'Restrict', by: 'OPR-COO-CTO', at: '2026-10-02T11:05:00+03:00' },
  },
} satisfies Record<string, ModerationRecord>

export type ModerationId = keyof typeof MODERATION_RECORDS
export const MODERATION_CASES: Readonly<Record<ModerationId, ModerationRecord>> = MODERATION_RECORDS

export interface SupportRecord {
  readonly seller: SellerId
  readonly raisedBy: StaffId
  readonly order: OrderId
  readonly raised: Timestamp
  readonly message: string
  /** DEMO_DATA summarises the reply rather than quoting it. */
  readonly resolved: { readonly at: Timestamp; readonly by: OperatorId; readonly replySummary: string }
}

const SUPPORT_RECORDS = {
  'SUP-1001': {
    seller: 'SEL-VOLT-HOUSE', raisedBy: 'STF-VH-01', order: 'ADU-24093', raised: '2026-10-02T10:18:00+03:00',
    message: 'This is our first Seller Delivery order. How do we complete the handoff with the Buyer?',
    // No Order fact changes.
    resolved: { at: '2026-10-02T11:00:00+03:00', by: 'OPR-COO-CTO', replySummary: 'the Seller Delivery steps: the Seller displays the Delivery QR, the Buyer scans it, and OTP is the fallback' },
  },
} satisfies Record<string, SupportRecord>

export type SupportId = keyof typeof SUPPORT_RECORDS
export const SUPPORT_CASES: Readonly<Record<SupportId, SupportRecord>> = SUPPORT_RECORDS

export interface VerificationRecord {
  readonly buyer: BuyerId
  readonly kind: string
  readonly submitted: Timestamp
  readonly message: string
  /** Evidence is the account history; no identity documents are requested (specification §45). */
  readonly evidenceOrders: readonly OrderId[]
}

const VERIFICATION_RECORDS = {
  // Open and unassigned at 10:25; no guided flow resolves it. It explains the failed OTP codes in HMR-1001.
  'VER-1001': {
    buyer: 'BUY-HANA-GIRMA', kind: 'Phone/account recovery', submitted: '2026-10-02T08:40:00+03:00',
    message: "I changed my phone number and can't receive codes on the old one. Please move my account to my new number.",
    evidenceOrders: ['ADU-24074'],
  },
} satisfies Record<string, VerificationRecord>

export type VerificationId = keyof typeof VERIFICATION_RECORDS
export const VERIFICATION_CASES: Readonly<Record<VerificationId, VerificationRecord>> = VERIFICATION_RECORDS

export interface TrustAppealRecord {
  readonly seller: SellerId
  readonly submitted: Timestamp
  readonly evidence: {
    readonly from: CalendarDate
    readonly to: CalendarDate
    readonly paidOrders: number
    /** Counted here but not modelled individually. */
    readonly upheldClaims: { readonly total: number; readonly notAsDescribed: number; readonly damaged: number }
    readonly fulfilmentReliabilityPercent: number
  }
  readonly policyVersion: string
  readonly reason: string
}

const TRUST_APPEAL_RECORDS = {
  // Open and unassigned at 10:25; no guided flow resolves it. Operators can't type a Trust level (rules 14.2–14.4).
  'TAP-1001': {
    seller: 'SEL-NILE-LOOM', submitted: '2026-09-29T15:20:00+03:00',
    evidence: { from: '2026-07-01', to: '2026-08-31', paidOrders: 52, upheldClaims: { total: 7, notAsDescribed: 5, damaged: 2 }, fulfilmentReliabilityPercent: 84 },
    policyVersion: 'Trust policy v3',
    reason: 'Five of the seven upheld Claims came from one supplier batch of throws that was mislabelled as 100% cotton. We recalled the batch on 10 September and ask that these Claims be reviewed as one incident.',
  },
} satisfies Record<string, TrustAppealRecord>

export type TrustAppealId = keyof typeof TRUST_APPEAL_RECORDS
export const TRUST_APPEALS: Readonly<Record<TrustAppealId, TrustAppealRecord>> = TRUST_APPEAL_RECORDS

export interface HandoffReviewRecord {
  readonly order: OrderId
  readonly deliveryAttempt: { readonly at: Timestamp; readonly qrFailure: string }
  readonly otp: { readonly codesSent: number; readonly from: Timestamp; readonly to: Timestamp; readonly outcome: string }
  readonly escalated: { readonly at: Timestamp; readonly by: CourierId; readonly note: string }
}

const HANDOFF_REVIEW_RECORDS = {
  // The failed final handoff on ADU-24074. No delivery checkpoint, because the handoff wasn't verified. Open and
  // unassigned at 10:25; a decision needs a reason, an audit record and approval where appropriate (rule 8.5).
  'HMR-1001': {
    order: 'ADU-24074',
    deliveryAttempt: { at: '2026-10-01T19:40:00+03:00', qrFailure: "The recipient's phone camera wasn't working." },
    otp: { codesSent: 3, from: '2026-10-01T19:42:00+03:00', to: '2026-10-01T19:50:00+03:00', outcome: 'None arrived, because the number is no longer in use.' },
    escalated: { at: '2026-10-01T19:55:00+03:00', by: 'COU-BEREKET-M', note: 'Recipient present; QR and OTP both failed.' },
  },
} satisfies Record<string, HandoffReviewRecord>

export type HandoffReviewId = keyof typeof HANDOFF_REVIEW_RECORDS
export const HANDOFF_REVIEWS: Readonly<Record<HandoffReviewId, HandoffReviewRecord>> = HANDOFF_REVIEW_RECORDS

/** The Operator queues, each holding at least one canonical record at 10:25. */
export const OPERATOR_QUEUES = ['Claims', 'Moderation', 'Support', 'Verification / Recovery', 'Trust Appeals', 'Handoff Manual Review'] as const
export type OperatorQueue = (typeof OPERATOR_QUEUES)[number]

export interface SoloCoverageRecord {
  readonly actor: OperatorId
  readonly otherFounder: OperatorId
  readonly reason: string
  /** After fresh strong reauthentication. */
  readonly activated: Timestamp
  readonly expectedDuration: string
  readonly expires: Timestamp
  /** Replay snapshot with the SOLO COVERAGE ACTIVE banner and the audit warning (specification §50). */
  readonly replay: Timestamp
}

/**
 * Solo Coverage governance scenario: a historical snapshot outside the 2 October timeline. Both Founders are active on
 * 2 October. It became inactive automatically at expiry; no consequential action was pending, no extension, no early stop.
 */
const SOLO_COVERAGE_RECORDS = {
  'SCV-1001': {
    actor: 'OPR-CEO', otherFounder: 'OPR-COO-CTO', reason: 'COO/CTO unavailable',
    activated: '2026-09-21T09:00:00+03:00', expectedDuration: '3 days', expires: '2026-09-24T09:00:00+03:00',
    replay: '2026-09-22T10:00:00+03:00',
  },
} satisfies Record<string, SoloCoverageRecord>

export type SoloCoverageId = keyof typeof SOLO_COVERAGE_RECORDS
export const SOLO_COVERAGE: Readonly<Record<SoloCoverageId, SoloCoverageRecord>> = SOLO_COVERAGE_RECORDS

/** Audit records (specification §49). */
export const AUDIT_LOG: readonly { readonly at: Timestamp; readonly actor: string; readonly action: string; readonly target: SoloCoverageId; readonly reason: string; readonly result: 'Succeeded' }[] = [
  { at: '2026-09-21T09:00:00+03:00', actor: 'CEO', action: 'Solo Coverage activated, expected duration 3 days', target: 'SCV-1001', reason: 'COO/CTO unavailable', result: 'Succeeded' },
  { at: '2026-09-24T09:00:00+03:00', actor: 'System', action: 'Solo Coverage expired', target: 'SCV-1001', reason: 'Expected duration reached', result: 'Succeeded' },
]
