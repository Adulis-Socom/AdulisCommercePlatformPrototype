// Shared vocabulary of the canonical demo dataset (docs/DEMO_DATA.md, docs/ADULIS_CANONICAL_RULES.md).
// This folder is plain TypeScript with no React, so a checker outside the repository can load it with Node.

export type SellerCode = 'AA' | 'NG' | 'VH' | 'NL'

export type TrustLevel = 'NEW' | 'ESTABLISHED' | 'TRUSTED' | 'REBUILDING'

export type FulfilmentMode = 'Buyer Collection' | 'Seller Delivery' | 'Courier Delivery'

export type Availability = 'Available' | 'Low Stock' | 'Out of Stock'

export type PublicationState = 'Published' | 'Draft'

// Seller Order states (rules 4.4–4.6). Each Order passes only through its own fulfilment mode's states (rule 4.7).
export type CourierDeliveryState = 'Paid' | 'Preparing' | 'Ready for Courier' | 'Courier Assigned' | 'Pickup Verified' | 'Out for Delivery' | 'Delivery Handoff' | 'Completed'
export type SellerDeliveryState = 'Paid' | 'Preparing' | 'Ready for Seller Delivery' | 'Out for Seller Delivery' | 'Delivery Handoff' | 'Completed'
export type BuyerCollectionState = 'Paid' | 'Preparing' | 'Ready for Collection' | 'Collection Handoff' | 'Completed'
export type OrderState = CourierDeliveryState | SellerDeliveryState | BuyerCollectionState

export const ORDER_TIMELINES: Readonly<Record<FulfilmentMode, readonly OrderState[]>> = {
  'Courier Delivery': ['Paid', 'Preparing', 'Ready for Courier', 'Courier Assigned', 'Pickup Verified', 'Out for Delivery', 'Delivery Handoff', 'Completed'],
  'Seller Delivery': ['Paid', 'Preparing', 'Ready for Seller Delivery', 'Out for Seller Delivery', 'Delivery Handoff', 'Completed'],
  'Buyer Collection': ['Paid', 'Preparing', 'Ready for Collection', 'Collection Handoff', 'Completed'],
}

export type ClaimState = 'Open' | 'Under Review' | 'Resolved'

export type CourierAvailability = 'Available' | 'Busy' | 'Unavailable'
