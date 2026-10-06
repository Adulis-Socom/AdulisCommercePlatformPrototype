// Guided-flow scenario configuration: the story moment, the Seller and the canonical records each flow step shows.
// This is prototype orchestration, not business data. Each step shows the state just before its first documented
// event (docs/DEMO_DATA.md › Story timeline); a step that follows an event uses that event's time and a later sequence.
// Flows A–M follow DEMO_DATA's "Demo flows and the records they use". MASTER and E2 are inherited, non-canonical
// presentation paths: their mappings only let those steps read the canonical data, and MASTER may move back in time.
import type { Moment } from '../time.ts'
import { DEFAULT_SNAPSHOT } from '../time.ts'
import type { ClaimId } from '../records/claims.ts'
import type { ConversationId } from '../records/conversations.ts'
import type { CourierId } from '../records/couriers.ts'
import type { DecisionId, ModerationId } from '../records/operations.ts'
import type { OrderId } from '../records/orders.ts'
import type { ShoppablePostId } from '../records/posts.ts'
import type { ProductId } from '../records/products.ts'
import type { SellerId } from '../records/sellers.ts'

/** The canonical records a step is about. */
export interface StoryFocus {
  readonly product?: ProductId
  readonly post?: ShoppablePostId
  readonly order?: OrderId
  readonly claim?: ClaimId
  readonly moderation?: ModerationId
  readonly decision?: DecisionId
  readonly conversation?: ConversationId
  readonly courier?: CourierId
}

export interface StoryStage {
  readonly moment: Moment
  /** The Seller whose surfaces the step shows, when it isn't the surface default. */
  readonly seller?: SellerId
  readonly focus?: StoryFocus
}

/** Outside a guided flow every surface shows the 10:25 snapshot. */
export const DEFAULT_STAGE: StoryStage = { moment: DEFAULT_SNAPSHOT }

export type CanonicalFlowId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
export type InheritedFlowId = 'MASTER' | 'E2'

/** Flows A–M, one entry per step of FLOW_DEFINITIONS (src/sections/DemoFlows.tsx). */
export const CANONICAL_FLOW_STAGES: Readonly<Record<CanonicalFlowId, readonly StoryStage[]>> = {
  // A — Seller acquisition: no canonical records; the waitlist form is filled in live.
  A: [DEFAULT_STAGE],
  // B — Social entry: DEMO_DATA gives it no time, so the 10:25 snapshot.
  B: [
    { moment: DEFAULT_SNAPSHOT, seller: 'SEL-ADDIS-ATELIER', focus: { product: 'PRD-AA-001' } },
    { moment: DEFAULT_SNAPSHOT, focus: { product: 'PRD-AA-001' } },
  ],
  // C — Discovery to purchase (replay): before ADU-24091 is paid at 10:05.
  C: [{ moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { post: 'SHP-AA-001', product: 'PRD-AA-001', order: 'ADU-24091' } }],
  // D — Multi-Seller cart (replay): before ADU-24091 is paid at 10:05.
  D: [
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { product: 'PRD-AA-001' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { product: 'PRD-NG-001', order: 'ADU-24091' } },
  ],
  // E — Seller content at 12:30: before PRD-AA-006, then before SHP-AA-006.
  E: [
    { moment: { at: '2026-10-02T12:30:00+03:00', sequence: 1 }, seller: 'SEL-ADDIS-ATELIER', focus: { product: 'PRD-AA-006' } },
    { moment: { at: '2026-10-02T12:30:00+03:00', sequence: 2 }, seller: 'SEL-ADDIS-ATELIER', focus: { product: 'PRD-AA-006', post: 'SHP-AA-006' } },
  ],
  // F — Courier pool: Volt House, before it approves Daniel K. at 16:30.
  F: [{ moment: { at: '2026-10-02T16:30:00+03:00' }, seller: 'SEL-VOLT-HOUSE', focus: { courier: 'COU-DANIEL-K' } }],
  // G — Fulfilment of ADU-24091: before preparation (10:40), before the pickup scan (14:14), before Maya's scan (14:52).
  G: [
    { moment: { at: '2026-10-02T10:40:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:14:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:52:00+03:00' }, focus: { order: 'ADU-24091' } },
  ],
  // H — Delegated recipient on ADU-24092: before Maya authorizes Liya (12:10), before Liya's scan (16:05).
  H: [
    { moment: { at: '2026-10-02T12:10:00+03:00' }, focus: { order: 'ADU-24092' } },
    { moment: { at: '2026-10-02T16:05:00+03:00' }, seller: 'SEL-NURA-GLOW', focus: { order: 'ADU-24092', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T16:05:00+03:00' }, focus: { order: 'ADU-24092' } },
  ],
  // I — Review: before REV-1003 is written at 17:20.
  I: [{ moment: { at: '2026-10-02T17:20:00+03:00' }, focus: { order: 'ADU-24091' } }],
  // J — Claim: CLM-1002 on ADU-23978 (replay before 09:12), then before the COO/CTO claims it at 10:50.
  J: [
    { moment: { at: '2026-10-02T09:12:00+03:00' }, focus: { order: 'ADU-23978', claim: 'CLM-1002' } },
    { moment: { at: '2026-10-02T10:50:00+03:00' }, focus: { claim: 'CLM-1002', decision: 'DEC-1001' } },
  ],
  // K — Moderation: Maya reports SHP-VH-004 (replay before 09:40), then before the Restrict at 11:05.
  K: [
    { moment: { at: '2026-10-02T09:40:00+03:00' }, focus: { post: 'SHP-VH-004' } },
    { moment: { at: '2026-10-02T11:05:00+03:00' }, focus: { moderation: 'MOD-1001', post: 'SHP-VH-004' } },
  ],
  // L — Chatbot escalation on PRD-AA-001: before the question (11:35), before the Seller's reply (11:48).
  L: [
    { moment: { at: '2026-10-02T11:35:00+03:00' }, focus: { product: 'PRD-AA-001', conversation: 'CNV-MAYA-AA' } },
    { moment: { at: '2026-10-02T11:48:00+03:00' }, focus: { conversation: 'CNV-MAYA-AA' } },
  ],
  // M — Buyer Collection final Handoff on ADU-24094 (WO-006A): M1 after it's Ready for Collection (17:50); M2 after
  // Abel T. opens the Collection Handoff at the Bole studio (17:55), on the Seller Companion and then in Maya's app,
  // before her scan (17:56); M3 after the verified scan completes it.
  M: [
    { moment: { at: '2026-10-02T17:50:00+03:00', sequence: 1 }, focus: { order: 'ADU-24094' } },
    { moment: { at: '2026-10-02T17:55:00+03:00', sequence: 1 }, seller: 'SEL-ADDIS-ATELIER', focus: { order: 'ADU-24094' } },
    { moment: { at: '2026-10-02T17:55:00+03:00', sequence: 1 }, focus: { order: 'ADU-24094' } },
    { moment: { at: '2026-10-02T17:56:00+03:00', sequence: 1 }, focus: { order: 'ADU-24094' } },
  ],
}

/** Inherited, non-canonical paths. Each step borrows the moment of the canonical step it repeats. */
export const INHERITED_FLOW_STAGES: Readonly<Record<InheritedFlowId, readonly StoryStage[]>> = {
  MASTER: [
    { moment: { at: '2026-10-02T10:05:00+03:00' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, seller: 'SEL-ADDIS-ATELIER', focus: { product: 'PRD-AA-001' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { post: 'SHP-AA-001', product: 'PRD-AA-001' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { product: 'PRD-AA-001' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { product: 'PRD-NG-001', order: 'ADU-24091' } },
    { moment: { at: '2026-10-02T10:05:00+03:00' }, focus: { order: 'ADU-24091' } },
    // Just after ADU-24091 is paid.
    { moment: { at: '2026-10-02T10:05:00+03:00', sequence: 1 }, focus: { order: 'ADU-24091' } },
    { moment: { at: '2026-10-02T10:05:00+03:00', sequence: 1 }, focus: { order: 'ADU-24091' } },
    { moment: { at: '2026-10-02T10:40:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:14:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:14:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:48:00+03:00' }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    // Just after Daniel opens Delivery Handoff.
    { moment: { at: '2026-10-02T14:48:00+03:00', sequence: 1 }, focus: { order: 'ADU-24091', courier: 'COU-DANIEL-K' } },
    { moment: { at: '2026-10-02T14:52:00+03:00' }, focus: { order: 'ADU-24091' } },
    // Just after the Order completes.
    { moment: { at: '2026-10-02T14:52:00+03:00', sequence: 1 }, focus: { order: 'ADU-24091' } },
    { moment: { at: '2026-10-02T17:20:00+03:00' }, focus: { order: 'ADU-24091' } },
    // Just after REV-1003.
    { moment: { at: '2026-10-02T17:20:00+03:00', sequence: 1 }, seller: 'SEL-ADDIS-ATELIER' },
    // Back to Flow J's Operator steps.
    { moment: { at: '2026-10-02T10:50:00+03:00' }, focus: { claim: 'CLM-1002', decision: 'DEC-1001' } },
    { moment: { at: '2026-10-02T11:20:00+03:00' }, focus: { claim: 'CLM-1002', decision: 'DEC-1001' } },
  ],
  // E2 repeats Flow E's zero-product path: after SHP-AA-006, before SHP-AA-007.
  E2: [{ moment: { at: '2026-10-02T12:30:00+03:00', sequence: 3 }, seller: 'SEL-ADDIS-ATELIER', focus: { post: 'SHP-AA-007' } }],
}

/** The scenario for a guided-flow step, or the 10:25 default outside a flow. */
export function stageFor(flow: CanonicalFlowId | InheritedFlowId | null | undefined, step: number): StoryStage {
  if (!flow) return DEFAULT_STAGE
  const stages = flow in CANONICAL_FLOW_STAGES ? CANONICAL_FLOW_STAGES[flow as CanonicalFlowId] : INHERITED_FLOW_STAGES[flow as InheritedFlowId]
  return stages[step] ?? DEFAULT_STAGE
}
