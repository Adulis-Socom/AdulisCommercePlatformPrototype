// Typed rows of the marketplace source JSON (docs/references/marketplace). Values are exactly as supplied: money is whole ETB
// (the app converts to santim in adapt.ts), ids are the stable source ids, nothing is renamed. Only the fields the app reads
// are named; every other column stays in the generated JSON untouched.

export type Lifecycle = 'ACTIVE' | 'DRAFT' | 'SUSPENDED'
export type Mode = 'MVP' | 'DEMO' | 'INTERNAL_SIMULATION'

export interface SrcSeller {
  seller_id: string; name: string; handle: string; owner_label: string; city: string; area: string; market: string
  seller_type: string; lifecycle: Lifecycle; verification_fixture: string; demo_tenure_days: number
  mvp_trust: 'NEW' | 'ESTABLISHED' | 'TRUSTED' | 'REBUILDING'; trust_showcase: string; trust_scope: string
  origin_focus: string; coverage: string; fulfilment: string; hours: string; contact: string; profile: string
  categories: string[]; scenario: string; product_count: number; scene_count: number; public_scene_count: number
  mvp_demo_followers: number; followed_by_demo_buyer: boolean; published_product_count: number
}
export interface SrcProduct {
  product_id: string; seller_id: string; seller: string; major: string; category: string; subcategory: string | null
  taxonomy_coverage: string; name: string; regular_etb: number; discount_pct: number; current_etb: number; stock: number
  publication: 'PUBLISHED' | 'DRAFT'; locally_made: 'Yes' | 'No'; variant_idea: string | null; photo_search: string; asset_status: string
}
export interface SrcVariant { variant_id: string; product_id: string; variant_label: string; regular_etb: number; current_etb: number; stock: number; scenario: string }
export interface SrcScene {
  scene_id: string; seller_id: string; title: string; caption: string; product_ids: string[]; tag_names: string[]
  publication: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'; visibility: 'PUBLIC' | 'PRIVATE'; reason: string; available_tags: number
  demo_likes: number; demo_saves: number; demo_following_candidate: boolean
}
export interface SrcStory { story_id: string; seller_id: string; link_id: string | null; age_hours: number | null; expected_state: string; text: string }
export interface Catalogue {
  metadata: Record<string, unknown>; sellers: SrcSeller[]; products: SrcProduct[]; variants: SrcVariant[]; scenes: SrcScene[]
  stories: SrcStory[]; scenarios: Record<string, unknown>[]; assets: Record<string, unknown>[]
}

export interface SrcBuyer { buyer_id: string; display_name: string; handle: string; market: string; city: string; area: string; persona: string; account_state: string; joined_date: string }
export interface SrcFollow { buyer_id: string; seller_id: string; followed_at: string; mode: Mode }
export interface SrcCollection { collection_id: string; buyer_id: string; name: string; is_default: boolean; visibility: string }
export interface SrcSave { buyer_id: string; collection_id: string; entity_type: 'PRODUCT' | 'SCENE'; entity_id: string; saved_at: string }
export interface SrcCartLine { cart_line_id: string; buyer_id: string; seller_id: string; product_id: string; variant_id: string | null; quantity: number; seen_unit_etb: number; mode: Mode; state: string }
export interface SrcChatMessage { message_id: string; conversation_id: string; buyer_id: string; seller_id: string; sender: 'BUYER' | 'SELLER'; product_id: string | null; scene_id: string | null; text: string; sent_at: string; mode: Mode }
export interface SrcCourier { courier_id: string; name: string; handle: string; base_city: string; service_cities: string[]; vehicle: string; verification: string }
export interface SrcRelationship { relationship_id: string; courier_id: string; seller_id: string; relationship_status: string | null }
export interface SrcCourierComment { comment_id: string; courier_id: string; seller_id: string; order_id: string; mode: Mode }
export interface SrcDeliveryOffer { offer_id: string; order_id: string; seller_id: string; courier_id: string; relationship_id: string; mode: Mode }
export interface SrcTeam { team_id: string; seller_id: string; seller_lifecycle: Lifecycle }
export interface SrcTeamMember { member_id: string; account_id: string; seller_id: string; display_name: string; username: string; relationship_type: 'OWNERSHIP' | 'TEAM'; roles: string[]; membership_status: string }
export interface SrcRoleGrant { role_code: string; permission_code: string }
export interface SrcTask { task_id: string; seller_id: string; assignee_id: string; assigned_by: string; title: string; required_permission: string; status: string; mode: Mode }
export interface SrcTeamMessage { message_id: string; seller_id: string; thread_id: string; sender_member_id: string; task_id: string | null; mode: Mode }
export interface SrcOrder {
  order_id: string; buyer_id: string; seller_id: string; courier_id: string | null; fulfilment_mode: string; status: string; scenario_status: string
  paid_at: string; merchandise_etb: number; delivery_etb: number; total_etb: number; payment_state: string; final_handoff_id: string | null
  source_scene_id: string | null; mode: Mode; assigned_courier_id: string | null; offer_target_courier_id: string | null
}
export interface SrcOrderLine { order_line_id: string; order_id: string; product_id: string; variant_id: string | null; variant_label: string | null; product_name_snapshot: string; quantity: number; unit_etb: number; line_etb: number; received: boolean }
export interface SrcOrderEvent { order_id: string; event_index: number; state: string; at: string; mode: Mode }
export interface SrcHandoff { handoff_id: string; order_id: string; stage: string; presenter_id: string; scanner_id: string; result: string; mode: Mode }
export interface SrcClaim { claim_id: string; order_id: string; buyer_id: string; seller_id: string; mode: Mode }
export interface SrcReviewGrant { grant_id: string; order_id: string; buyer_id: string; seller_id: string; basis: string; final_handoff_id: string | null; claim_id: string | null; state: string; mode: Mode }
export interface SrcReview { review_id: string; grant_id: string; order_id: string; buyer_id: string; seller_id: string; seller_service_stars: number; visibility: string; mode: Mode }
export interface SrcProductRating { item_review_id: string; review_id: string; order_line_id: string; product_id: string; product_quality_stars: number; mode: Mode }
type Row = Record<string, unknown>
export interface Operations {
  metadata: { dataset_id: string; snapshot: string; base_source_sha256: string } & Record<string, unknown>
  buyers: SrcBuyer[]; follows: SrcFollow[]; collections: SrcCollection[]; saves: SrcSave[]; cart_lines: SrcCartLine[]; chat_messages: SrcChatMessage[]
  couriers: SrcCourier[]; relationships_and_eligibility: SrcRelationship[]; relationship_events: Row[]; opportunities: Row[]
  courier_comments: SrcCourierComment[]; delivery_offers: SrcDeliveryOffer[]; simulation_courier_settings: Row[]
  teams: SrcTeam[]; team_members: SrcTeamMember[]; role_grants: SrcRoleGrant[]; tasks: SrcTask[]; team_messages: SrcTeamMessage[]
  orders: SrcOrder[]; order_lines: SrcOrderLine[]; order_events: SrcOrderEvent[]; handoffs: SrcHandoff[]; claims: SrcClaim[]
  review_grants: SrcReviewGrant[]; reviews: SrcReview[]; product_ratings: SrcProductRating[]
  seller_reputation: Row[]; product_reputation: Row[]; seller_summary: Row[]
  seller_weekly: Row[]; scene_weekly: Row[]; product_weekly: Row[]; simulation_weekly: Row[]; simulation_product_period: Row[]; simulation_scene_period: Row[]
}
/** The weekly analytics arrays, generated into analytics.json and loaded on demand. */
export const ANALYTICS_KEYS = ['seller_weekly', 'scene_weekly', 'product_weekly', 'simulation_weekly', 'simulation_product_period', 'simulation_scene_period'] as const
export type Analytics = Pick<Operations, (typeof ANALYTICS_KEYS)[number]>
export type OperationsCore = Omit<Operations, (typeof ANALYTICS_KEYS)[number]>
