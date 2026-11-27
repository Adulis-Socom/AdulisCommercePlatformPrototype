# Adulis marketplace operational fixtures — integration notes

Snapshot: 2026-11-27 10:00 EAT. Dataset: ADULIS-MARKETPLACE-OPS-001.

Use **Adulis_Demo_Data_Fixtures.json** for the original catalogue and **Adulis_Operations_Complete.json** for the supplemental operational fixtures. The five Excel workbooks are review mirrors, not competing import sources. Keep all IDs intact. Guest is anonymous; no real credentials. Do not manufacture exact inventory from variant_idea or supply missing taxonomy fields.

## Modes

Current MVP: discovery, follows, private collections, review-only Cart, chat, seller/team/catalogue operations. Internal simulation: all Orders, paid labels, courier offers and compensation, handoffs, purchased reviews, historical Trust showcases. No PSP, real payments, reservations, stock holds or external calls. All fictional; no production rights or verified real purchases. Draft seller has no history. Suspended seller historical records are internal only. Shared courier comments are a provisional prototype experiment, not production policy.

## Integration keys

- seller_id, product_id, scene_id and source variant_id join to original marketplace; use stable IDs.
- buyer_id scopes follows, saves, cart, conversations and simulated order history.
- relationship_id joins courier/seller relationship and eligibility rows; null status is not a pool membership.
- order_id joins order lines, timeline, handoffs, offers, claims and grants. Review grants link one Buyer/order; ratings only reference received order lines.
- member_id joins tasks/messages; use actual canonical permissions and surface/mode gates.
- Analytics are synthetic aggregate observations; selectable buyer accounts are not the full audience. Seller summary compares two 28-day windows ending 26 Nov. Merchandise GMV is simulated paid merchandise subtotal, not revenue. Counts of orders across product rows are not additive across multiple-line orders. Current-day active orders are excluded from historical periods. Blank rates and ratings mean insufficient evidence.
- Images and coordinates are pending founder supply. Keep source Scene product_ids; use explicit unpositioned tags and labelled placeholders. Never infer coordinates or falsely claim image verification.

## Validation completed

- PASS — Base source hash matches
- PASS — Exactly one team and analytics summary per Seller
- PASS — All primary IDs unique
- PASS — Every courier/Seller combination exactly once
- PASS — All cart lines valid and buyer-owned
- PASS — All collection entries buyer-owned and publicly eligible at baseline
- PASS — All orders have one seller, correct line prices and totals
- PASS — All orders simulation-only and completed orders have final handoff
- PASS — One grant per order; final receipt or explicit failure claim
- PASS — One review per grant, exact buyer and seller
- PASS — Product ratings anchored to received lines; no failure-only ratings
- PASS — Courier comments match simulated order seller and assigned courier
- PASS — Team tasks scoped to Seller and assigned active membership
- PASS — Weekly metrics cover each Seller, Scene and Product for eight weeks
- PASS — Scene attribution reconciles to Product opens weekly
- PASS — Published review coverage for all 22 non-draft sellers
- PASS — All five Excel files are structurally valid ZIP containers

These are data integrity checks, not application runtime or production validation.
