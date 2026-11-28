// SIM-003: the reputation feed for the Buyer and Storefront surfaces, built from the visible simulation records only (pure; no React).
import type { FeedReview, ReputationFeed } from '../demo-data/reputation.ts'
import type { SimState } from './orders.ts'
import { productQuality, ratingsOfProduct, sellerService, visibleReviews } from './reviews.ts'

export function buildFeed(s: SimState): ReputationFeed {
  const newest = <T extends { written: string }>(rows: T[]) => rows.sort((a, b) => b.written.localeCompare(a.written))
  return {
    service: seller => { const a = sellerService(s, seller); return a.average === null ? undefined : { average: Number(a.average.toFixed(2)), ratings: a.count } },
    quality: product => { const a = productQuality(s, product); return a.average === null ? null : { average: Number(a.average.toFixed(2)), ratings: a.count } },
    sellerReviews: seller => newest(visibleReviews(s).filter(r => r.sellerId === seller).map((r): FeedReview => ({
      review: r.id, order: r.orderId, buyer: r.buyerId, rating: r.stars, text: r.text, written: r.publishedAt.slice(0, 10), simulated: !r.seeded,
      products: [...new Set((s.lines[r.orderId] ?? []).map(l => l.productId))],
    }))),
    productReviews: product => newest(ratingsOfProduct(s, product).map((p): FeedReview => {
      const r = s.reviews[p.reviewId], line = (s.lines[r.orderId] ?? []).find(l => l.id === p.orderLineId)
      return { review: p.id, order: r.orderId, buyer: r.buyerId, rating: p.stars, text: p.text, written: r.publishedAt.slice(0, 10), variant: line?.variantLabel ?? undefined, simulated: !r.seeded }
    })),
  }
}
