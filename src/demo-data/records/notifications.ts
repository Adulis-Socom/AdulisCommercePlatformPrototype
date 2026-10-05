// Notifications (docs/DEMO_DATA.md › Notifications). They are generated from the story's events and create no facts of
// their own (specification §54), so each one points at its event; its time is the event's time (derived.ts).
// Two notifications have no event time in DEMO_DATA: the low-stock alert and the review reminder.
import type { BuyerId } from './buyers.ts'
import type { ClaimId } from './claims.ts'
import type { ConversationId } from './conversations.ts'
import type { CourierId } from './couriers.ts'
import type { OrderId } from './orders.ts'
import type { ProductId } from './products.ts'
import type { SellerId } from './sellers.ts'
import type { OrderState } from '../types.ts'

export type NotificationEvent =
  /** The Order reached this state (its time is the state's time). */
  | { readonly kind: 'Order Paid'; readonly order: OrderId }
  | { readonly kind: 'New Paid Order'; readonly order: OrderId }
  | { readonly kind: 'Order status'; readonly order: OrderId; readonly state: OrderState }
  /** Delivery Handoff opened: the Courier, or for Seller Delivery the Seller, is ready to complete delivery. */
  | { readonly kind: 'Delivery action'; readonly order: OrderId }
  | { readonly kind: 'Pickup verified'; readonly order: OrderId }
  | { readonly kind: 'Claim status'; readonly claim: ClaimId; readonly state: 'Under Review' | 'Resolved' }
  | { readonly kind: 'Claim'; readonly claim: ClaimId }
  | { readonly kind: 'Buyer message'; readonly conversation: ConversationId; readonly messageIndex: number }
  | { readonly kind: 'Low stock'; readonly product: ProductId }
  | { readonly kind: 'Review reminder'; readonly order: OrderId }
  /** The Delivery Offer; for 'Courier offer issue', the Courier couldn't accept it while he had an active delivery (rule 6.3). */
  | { readonly kind: 'Delivery Offer'; readonly order: OrderId }
  | { readonly kind: 'Courier offer issue'; readonly order: OrderId }
  | { readonly kind: 'Application approved'; readonly seller: SellerId; readonly courier: CourierId }

export interface NotificationRecord {
  readonly recipient: BuyerId | SellerId | CourierId
  readonly event: NotificationEvent
}

export const NOTIFICATIONS: readonly NotificationRecord[] = [
  // Maya
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order Paid', order: 'ADU-24091' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order Paid', order: 'ADU-24092' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order Paid', order: 'ADU-24093' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order Paid', order: 'ADU-24094' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24091', state: 'Ready for Courier' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24091', state: 'Courier Assigned' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24092', state: 'Ready for Courier' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24092', state: 'Courier Assigned' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Delivery action', order: 'ADU-24091' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24093', state: 'Ready for Seller Delivery' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Delivery action', order: 'ADU-24093' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Order status', order: 'ADU-24094', state: 'Ready for Collection' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Claim status', claim: 'CLM-1002', state: 'Under Review' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Claim status', claim: 'CLM-1002', state: 'Resolved' } },
  { recipient: 'BUY-MAYA-TESFAYE', event: { kind: 'Review reminder', order: 'ADU-23978' } },
  // Addis Atelier
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'Claim', claim: 'CLM-1002' } },
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'New Paid Order', order: 'ADU-24091' } },
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'Buyer message', conversation: 'CNV-MAYA-AA', messageIndex: 4 } },
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'Low stock', product: 'PRD-AA-003' } },
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'Pickup verified', order: 'ADU-24091' } },
  { recipient: 'SEL-ADDIS-ATELIER', event: { kind: 'New Paid Order', order: 'ADU-24094' } },
  // Nura Glow
  { recipient: 'SEL-NURA-GLOW', event: { kind: 'New Paid Order', order: 'ADU-24092' } },
  { recipient: 'SEL-NURA-GLOW', event: { kind: 'Courier offer issue', order: 'ADU-24092' } },
  { recipient: 'SEL-NURA-GLOW', event: { kind: 'Pickup verified', order: 'ADU-24092' } },
  // Volt House
  { recipient: 'SEL-VOLT-HOUSE', event: { kind: 'New Paid Order', order: 'ADU-24093' } },
  // Daniel K.
  { recipient: 'COU-DANIEL-K', event: { kind: 'Delivery Offer', order: 'ADU-24091' } },
  { recipient: 'COU-DANIEL-K', event: { kind: 'Delivery Offer', order: 'ADU-24092' } },
  { recipient: 'COU-DANIEL-K', event: { kind: 'Application approved', seller: 'SEL-VOLT-HOUSE', courier: 'COU-DANIEL-K' } },
]
