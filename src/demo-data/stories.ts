// Seller Stories (PR-003): Seller-originated, temporary promotional and discovery content, shown in Home's Stories row
// and opened in a lightweight viewer. The structure is meant to be populated from the full Seller, Product and Scene
// dataset (PR-009). Until then it holds a few prototype fixtures for the showcase Sellers. They are not DEMO_DATA
// records: no canonical record refers to them, and they change nothing else.
import { buyerVisibleSellers } from './derived.ts'
import type { ProductId } from './records/products.ts'
import type { ShoppablePostId } from './records/posts.ts'
import type { SellerId } from './records/sellers.ts'
import { happenedBefore, type Moment, type Timestamp } from './time.ts'

/** What a Story is for: a discount on a Product, a short Seller update, or a temporary Product promotion. */
export type StoryKind = 'discount' | 'update' | 'promotion'

export type StoryId = `STY-${string}`

export interface SellerStory {
  readonly id: StoryId
  readonly seller: SellerId
  readonly kind: StoryKind
  /** The Seller's short Story text. */
  readonly text: string
  readonly posted: Timestamp
  /** Stories are temporary: from `posted` until `expires`. */
  readonly expires: Timestamp
  /** The Product the Story is about. A discount Story's discount is that Product's active one (DEMO_DATA › Discounts). */
  readonly product?: ProductId
  /** The Scene the Story links to. */
  readonly post?: ShoppablePostId
}

/** One Seller's live Stories, as Home's Stories row shows them: one entry per Seller, its Stories oldest first. */
export interface SellerStoryGroup {
  readonly seller: SellerId
  readonly stories: readonly SellerStory[]
}

// Prototype fixtures: one Story for each showcase Seller on the story day, each linked to that Seller's own records.
export const PROTOTYPE_STORIES: readonly SellerStory[] = [
  { id: 'STY-AA-01', seller: 'SEL-ADDIS-ATELIER', kind: 'discount', text: 'A light dress for warm afternoons, now on discount.', posted: '2026-10-02T08:30:00+03:00', expires: '2026-10-03T08:30:00+03:00', product: 'PRD-AA-004' },
  { id: 'STY-NG-01', seller: 'SEL-NURA-GLOW', kind: 'update', text: 'New in our Scenes: the three-step morning routine, from cleanse to protect.', posted: '2026-10-02T09:40:00+03:00', expires: '2026-10-03T09:40:00+03:00', post: 'SHP-NG-001' },
  { id: 'STY-VH-01', seller: 'SEL-VOLT-HOUSE', kind: 'promotion', text: 'Wireless earbuds, checked before they ship. Collect them at our Megenagna shop.', posted: '2026-10-02T07:45:00+03:00', expires: '2026-10-03T07:45:00+03:00', product: 'PRD-VH-001' },
]

/** The Stories live at `at`: posted before it and not yet expired, from Sellers Buyers can see. */
export function storiesAt(at: Moment): SellerStory[] {
  const sellers = buyerVisibleSellers()
  return PROTOTYPE_STORIES.filter(story => sellers.includes(story.seller) && happenedBefore(story.posted, at) && !happenedBefore(story.expires, at))
}

/** Home's Stories row at `at`: each Seller with live Stories once, the most recently updated Seller first. */
export function storyGroupsAt(at: Moment): SellerStoryGroup[] {
  const live = storiesAt(at)
  const sellers = [...new Set(live.map(story => story.seller))]
  const latest = (seller: SellerId) => live.filter(story => story.seller === seller).map(story => story.posted).sort().pop() ?? ''
  return sellers
    .map(seller => ({ seller, stories: live.filter(story => story.seller === seller).sort((a, b) => a.posted.localeCompare(b.posted)) }))
    .sort((a, b) => latest(b.seller).localeCompare(latest(a.seller)))
}
