// SIM-003: the simulated reputation (Seller Service, Product Quality and the reviews behind them) read by the Buyer's Seller and Product pages and the
// Storefront. The simulation provider publishes it on every render, and only while the prototype is in the internal simulation on the marketplace dataset
// (the same publishing pattern as LIVE_PRODUCTS). `null` means "not published": the legacy dataset and the current MVP, which show no purchased reviews.
export interface FeedReview {
  review: string; order: string; buyer: string; rating: number; text: string; written: string
  variant?: string; products?: string[]
  /** Written in this session: a simulation record, not a verified purchase. */
  simulated: boolean
}
export interface ReputationFeed {
  service(seller: string): { average: number; ratings: number } | undefined
  quality(product: string): { average: number; ratings: number } | null
  sellerReviews(seller: string): FeedReview[]
  productReviews(product: string): FeedReview[]
}
export const REPUTATION: { current: ReputationFeed | null } = { current: null }
