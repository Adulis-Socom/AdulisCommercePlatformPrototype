# Adulis Canonical Rules

**Purpose.** This is the authoritative list of Adulis prototype invariants: statements that must hold on every surface, in every flow and in all demo data. Where the prototype disagrees with a rule recorded here, the prototype is wrong.

**Status.** APPROVED — 2026-10-02

## Document authority and precedence

1. ADULIS_CANONICAL_RULES.md

   Authoritative product and prototype invariants.

2. ADULIS_PROTOTYPE_SPEC.md

   Approved prototype scope, UX requirements, screen requirements and interactions.

3. DEMO_DATA.md

   Authoritative demo entities and values. Demo data cannot override canonical product rules.

4. CORRECTION_WORK_ORDERS.md

   Approved implementation instructions. A work order cannot silently override Canonical Rules or the Prototype Specification.

5. Current application code

   Implementation only. Existing code is not authoritative when it conflicts with approved documentation.

If two approved documents appear to conflict:
- Canonical Rules win for product invariants.
- The Prototype Specification supplies implementation/detail where Canonical Rules are silent.
- Do not silently choose between genuine contradictions.
- Stop and surface the conflict unless an explicitly approved later decision resolves it.

A later approved product decision supersedes an earlier one only after the authoritative documentation is explicitly updated to record the change.

## Where rules are stated today (not authoritative)

The current prototype states rules informally, and in places inconsistently:

- the canonical-object definitions in `src/sections/PrototypeGuide.tsx`;
- explanatory copy on individual screens across the surfaces;
- `plans/you-are-an-expert-quirky-shell.md`.

None of these is canonical until it's approved and recorded below.

## Rules

**ADULIS CANONICAL PROTOTYPE RULES**

### 1. PRODUCT MODEL

1.1 Product Post represents exactly one sellable Product.

1.2 Product Post owns the canonical commerce presentation of:
- Product identity;
- price;
- variants;
- stock/availability;
- structured attributes;
- fulfilment information.

1.3 Shoppable Post is creative merchandising/discovery content.

1.4 Lifestyle Scene is a presentation pattern of a Shoppable Post, not a separate canonical entity.

1.5 A Shoppable Post may reference zero or more Products belonging to the same Seller.

1.6 A Shoppable Post may be published with zero Product tags.

1.7 A Shoppable Post with zero currently eligible Products is not eligible for For You discovery.

1.8 Loss of Product availability does not automatically archive the Shoppable Post.

### 2. BUYER DISCOVERY

2.1 For You top-level feed units are Shoppable Posts only.

2.2 Product Posts must not independently appear as FYP feed units.

2.3 Buyer Home must expose the following launch discovery channels:
- For You;
- Following;
- Nearby;
- Discounts;
- Locally Made.

For You is the default Buyer Home discovery channel.

2.4 Marketplace Search launches with:
- Product Posts;
- Sellers;
- Shoppable Posts.

2.5 Collections may contain:
- Product Posts;
- whole Shoppable Posts.

2.6 Public Collections are not current MVP functionality.

2.7 Following may show published Shoppable Posts from Sellers the Buyer follows even if those Posts are not FYP eligible, provided the Post itself remains publicly eligible and is not restricted or removed. Examples that may remain visible in Following:
- zero-Product published Shoppable Post;
- published Shoppable Post whose tagged Products are currently unavailable.

2.8 Visibility in Following must not be treated as FYP eligibility.

2.9 Nearby is commerce-relevant discovery. A Shoppable Post shown in Nearby must:
- be published;
- be publicly eligible;
- meet the approved geographic/saved-area criteria;
- have at least one currently eligible Product.

Posts with zero eligible Products must not appear in Nearby.

2.10 Nearby must not use live Buyer GPS.

2.11 Product Posts are the primary content type for the Discounts channel. Discounts may display Products with explicit active discount metadata. For You's Shoppable-Posts-only rule does not apply to Discounts.

2.12 Product Posts are the primary content type for Locally Made. Only Products explicitly marked with approved locally-made metadata may appear. Locally made status must not be inferred from:
- Seller location;
- Seller name;
- language;
- category;
- nationality or ethnicity.

2.13 Unavailable locally-made Products may remain visible after available Products and must clearly show:
"Currently unavailable."

2.14 Nearby must not request or simulate continuous or live Buyer GPS. A guest sees Nearby after choosing an area manually.

### 3. GUEST BUYER

3.1 Guest users may browse public commerce content.

3.2 Guest Orders must not display authenticated Order data.

3.3 Guest Orders must show:
"Sign in to start ordering and track your orders."

3.4 Guest You must show:
"Sign in to see your profile."

3.5 Account-bound actions must request authentication where necessary.

3.6 Guest users may:
- browse Home;
- browse For You;
- browse Nearby after selecting an area;
- browse Discounts;
- browse Locally Made;
- browse Shop/Search where already supported;
- open Sellers;
- open Product Posts;
- open Shoppable Posts;
- read public Reviews/Trust;
- Share;
- add Products to a temporary prototype Cart.

3.7 Authentication is required for:
- Checkout / placing an Order;
- Save;
- Collections;
- Follow Seller;
- Buyer–Seller Chat;
- personal Notifications;
- Review submission;
- Report submission;
- Claims;
- Orders history;
- personal Profile;
- Account settings.

3.8 The Following Home channel requires authentication because it depends on the Buyer's followed-Seller relationships.

3.9 Not Interested is a signed-in personalization action.

3.10 A guest's temporary Cart survives successful authentication within the current prototype session. Its Seller grouping, Product selections, variants and quantities are preserved. When authentication was required at Checkout, Checkout continues after it.

3.11 After authentication and before Checkout continues, current Product availability is revalidated. If an item is no longer available, the Buyer is shown what changed, and no invalid Order is silently created.

3.12 The guest Cart is transient prototype/session state. It is not a canonical Seller Order, and it does not require a new permanent Order record in DEMO_DATA.md. Seller Orders are created only through the Checkout/payment flow. Resetting the prototype returns the application to the approved canonical demo-data baseline.

### 4. CART AND ORDER MODEL

4.1 Products from different Sellers remain Seller-separated.

4.2 A coordinated multi-cart experience must not create one cross-Seller Order.

4.3 Each Seller produces its own Seller Order.

4.4 Courier Delivery Order timeline (its operational steps are rule 6.10):
Paid
→ Preparing
→ Ready for Courier
→ Courier Assigned
→ Pickup Verified
→ Out for Delivery
→ Delivery Handoff
→ Completed

4.5 Seller Delivery Order timeline:
Paid
→ Preparing
→ Ready for Seller Delivery
→ Out for Seller Delivery
→ Delivery Handoff
→ Completed

4.6 Buyer Collection Order timeline:
Paid
→ Preparing
→ Ready for Collection
→ Collection Handoff
→ Completed

4.7 Courier-specific states must not be shown for Seller Delivery or Buyer Collection Orders.

### 5. PAYMENT

5.1 Seller never establishes PAID.

5.2 Seller must not have Confirm Payment or Accept Payment controls.

5.3 Payment provider/backend verification establishes PAID in the real product model.

5.4 Buyer payment screenshot is not canonical payment proof.

5.5 Operator must not manually type or arbitrarily set an Order to PAID.

5.6 Current Adulis transaction fee is a 0.5% Buyer-side Checkout surcharge.

5.7 Courier Delivery charge is separate from the Adulis surcharge.

5.8 Current surcharge basis excludes Courier Delivery charge.

5.9 A failed payment attempt and its retry belong to the same Seller Order. A failed attempt never creates a second Seller Order.

### 6. COURIER MODEL

6.1 Courier has a persistent Courier identity.

6.2 A Courier may maintain relationships with multiple Sellers.

6.3 MVP allows one active accepted delivery per Courier at a time.

6.4 No open Courier bidding marketplace exists in MVP.

6.5 No multi-stop batching exists in MVP.

6.6 No Courier wallet exists in MVP.

6.7 No surge pricing exists in MVP.

6.8 Seller defines Courier compensation.

6.9 Buyer sees Courier Delivery charge before payment.

6.10 For Courier Delivery, the canonical operational sequence is:
PAID
→ PREPARING
→ READY
→ Courier selected / Delivery Offer created
→ Courier accepts
→ Pickup Handoff
→ IN DELIVERY
→ Final Delivery Handoff
→ COMPLETED

6.11 Seller must Mark Ready before the Courier is assigned/offered the Delivery.

### 7. COURIER METRICS

7.1 Seller Console Courier view distinguishes:

- Completed for the current Seller;
- Total completed deliveries across Sellers.

7.2 A newly invited Courier has zero completed deliveries for that Seller even if the Courier has platform-wide history.

7.3 Other Sellers' identities, Orders, compensation or private Courier relationships must not be exposed.

7.4 Any Seller-facing Courier selection/card, including Seller Companion, must distinguish completed deliveries for the current Seller from total completed deliveries. Seller-specific performance is visually primary; the platform-wide total is secondary context.

### 8. HANDOFF

8.1 Pickup Handoff:
Seller displays Pickup QR.
Courier scans Pickup QR.

8.2 Final Delivery Handoff:
Courier displays Delivery QR.
Buyer or authorized delegate scans Delivery QR.

8.3 QR is the primary Handoff method.

8.4 OTP is fallback.

8.5 Manual Verification is emergency Operator recovery.

8.6 Manual Verification must not be normal Buyer or Seller functionality.

8.7 All three physical fulfilment modes must be capable of reaching a verified final Handoff and Order completion:
- Courier Delivery;
- Seller Delivery;
- Buyer Collection.

8.8 Seller Delivery final Handoff:
Seller or authorized Seller delivery actor displays Delivery QR.
Buyer/delegate scans.

8.9 Buyer Collection final Handoff:
Seller displays Collection QR.
Buyer/delegate scans.

8.10 For all three fulfilment modes:
QR is primary.
OTP is fallback.
Manual Verification is Operator-only emergency recovery.

### 9. LOCATION

9.1 No continuous Courier GPS exists in MVP.

9.2 No live Courier route map exists in MVP.

9.3 No background route history exists in MVP.

9.4 Location evidence is limited to:
- Pickup checkpoint;
- Delivery checkpoint.

9.5 Location checkpoint failure must not invalidate an otherwise successfully verified Handoff.

9.6 The existing Pickup/Delivery location checkpoint model remains specific to Courier Delivery unless a later approved system-design decision extends it.

### 10. DELEGATED RECIPIENT

10.1 Buyer may authorize one recipient for an Order using name and phone.

10.2 Delegation does not transfer:
- Order ownership;
- Claim ownership;
- refund rights;
- Review rights;
- account rights.

### 11. REVIEWS

11.1 Review eligibility follows qualifying final verified Handoff.

11.2 Product Quality and Seller Service are separate ratings.

11.3 Open social comments are not part of current MVP.

### 12. CHAT

12.1 Buyer and Seller maintain one ongoing relationship conversation per applicable context/Market rather than one separate conversation per Product.

12.2 Messages may carry context for:
- Seller/general;
- Product Post;
- Shoppable Post;
- Order.

12.3 Changing current chat context must not rewrite historical message context.

12.4 Chat is communication only and cannot establish canonical payment, stock or Order truth.

12.5 The chat context selector may offer only records relevant to the current Buyer–Seller relationship:
- General / Seller;
- Product Posts and Shoppable Posts that belong to the current Seller and are publicly eligible for that Buyer, never draft, restricted or removed records;
- Orders that belong to both the current Buyer and the current Seller.

12.6 Chat must never expose another Buyer's Order or another Seller's record.

### 13. SELLER VERIFICATION

13.1 Current Adulis Seller admission does not use:
- National ID;
- passport;
- government-ID scan;
- selfie-plus-ID verification.

13.2 PSP/provider KYC, where externally required, is separate from Adulis Seller admission.

### 14. TRUST

14.1 Current Trust Levels are:
- NEW;
- REBUILDING;
- ESTABLISHED;
- TRUSTED.

14.2 Trust is evidence-derived.

14.3 Seller cannot directly edit Trust.

14.4 Operator cannot manually type a Trust Level.

14.5 Money, advertising or subscription purchase cannot directly increase Trust.

14.6 Show the Seller's actual public Trust level wherever Seller identity materially informs a commerce decision, including Home discovery content, Seller cards, Seller profile, Product detail and Seller Storefront. NEW and REBUILDING must not be hidden solely because the level is lower.

### 15. SELLER SURFACES

15.1 Seller Console is the full Seller administration environment.

15.2 Seller Companion is lightweight operational mobile functionality.

15.3 Seller Storefront is public/read-oriented and does not perform web Checkout.

### 16. OPERATOR

16.1 Operator actions must be domain-controlled rather than generic Edit Everything interfaces.

16.2 Consequential Founder actions use dual review where required.

16.3 Solo Coverage is exceptional and audited.

16.4 Expected Solo Coverage duration may range from minutes through multiple weeks, up to the current configured maximum continuous Solo Coverage duration of 28 days. The maximum is calculated from the session's original activation time: neither the Custom expected return nor an extension may move the expected return beyond the original activation time plus 28 days, and an extension does not restart the maximum-duration clock. Solo Coverage still ends earlier under its existing shutdown rules (16.6, 16.9).

16.5 Expected duration is an estimate, not permanent authorization.

16.6 When the expected Solo Coverage duration passes, Solo Coverage automatically becomes inactive and normal dual-review requirements resume.

16.7 When Solo Coverage becomes inactive, unfinished consequential actions that require dual review remain blocked or pending. Nothing is approved automatically because Solo Coverage expired.

16.8 Before expiry, an authorized Founder may extend Solo Coverage. Extension requires a deliberate action, fresh strong reauthentication, a reason, an updated expected return and an audit entry.

16.9 A Founder may stop Solo Coverage early. Solo Coverage must never continue silently or indefinitely.

### 17. ACCOUNT ARCHITECTURE

17.1 The final production Account model remains unresolved.

17.2 Prototype role switching must not be treated as a production Account architecture decision.

### 18. DEMO CONSISTENCY

18.1 The same canonical Seller, Product, Shoppable Post, Order, Courier, Buyer, Claim and Review must present the same facts on every surface.

18.2 Individual screens must not create their own contradictory copies of canonical demo entities.

## Revision history

- 2026-10-02: File created as an empty scaffold. No rules recorded.
- 2026-10-02: Approved rules recorded (APPROVED — 2026-10-02): 81 rules in 18 sections.
- 2026-10-02:
  - clarified Buyer Home vs For You (rule 2.3 replaced);
  - established documentation authority precedence ("Document authority and precedence" section added).
- 2026-10-02: Demo-data open decisions resolved. Seven rules added; no existing rule changed or renumbered:
  - 6.10–6.11: the Courier Delivery operational sequence, and Mark Ready before a Courier is assigned or offered the Delivery;
  - 8.7–8.10: a verified final Handoff for all three fulfilment modes (Courier Delivery, Seller Delivery, Buyer Collection);
  - 9.6: location checkpoints remain specific to Courier Delivery.

  The rule set now has 88 rules in 18 sections (previously 81).
- 2026-10-02: Final corrections before demo-data approval. Eleven rules added; no existing rule changed or renumbered:
  - 2.7–2.8: Following may show publicly eligible posts that aren't FYP eligible; visibility in Following isn't FYP eligibility;
  - 2.9–2.10: Nearby shows only posts with at least one currently eligible Product, without live Buyer GPS;
  - 2.11: Product Posts are the primary content of Discounts;
  - 2.12–2.13: Product Posts are the primary content of Locally Made, with explicit metadata only and unavailable Products shown last;
  - 4.4–4.7: mode-specific Order timelines for Courier Delivery, Seller Delivery and Buyer Collection, with no Courier-specific states outside Courier Delivery.

  The rule set now has 99 rules in 18 sections (previously 88).
- 2026-10-02: Final demo-data approval pass. One rule added; no existing rule changed or renumbered:
  - 7.4: any Seller-facing Courier selection or card, including the Seller Companion, distinguishes completed deliveries for the current Seller (primary) from total completed deliveries (secondary).

  The rule set now has 100 rules in 18 sections (previously 99).
- 2026-10-02: Work-order decisions recorded. Thirteen rules added; no existing rule changed or renumbered:
  - 2.14: Nearby never requests or simulates live Buyer GPS, and a guest chooses an area manually;
  - 3.6–3.9: what a guest may do, what requires authentication, Following requires authentication, and Not Interested is a signed-in action;
  - 5.9: a failed payment attempt and its retry belong to the same Seller Order;
  - 12.5–12.6: what the chat context selector may offer, and no exposure of another Buyer's or Seller's records;
  - 14.6: the actual public Trust level is shown wherever Seller identity informs a commerce decision;
  - 16.6–16.9: Solo Coverage expiry, blocked actions after expiry, extension, and stopping early.

  The rule set now has 113 rules in 18 sections (previously 100). In 16.9, "stop Solo Coverage early" records the approved decision on ending Solo Coverage early.
- 2026-10-02: Final work-order decisions recorded. Three rules added and one changed; no rule renumbered:
  - 3.7 changed: Report submission added to the actions that require authentication. This is the current prototype rule. It doesn't establish that a future production implementation could never support anonymous reporting;
  - 3.10–3.12: a guest's temporary Cart survives authentication with its Seller grouping, selections, variants and quantities, and Checkout continues; availability is revalidated first, and no invalid Order is created; the guest Cart is transient session state, not a canonical Seller Order.

  The rule set now has 116 rules in 18 sections (previously 113).
- 2026-10-07: Solo Coverage maximum recorded. One rule changed; no rule added or renumbered:
  - 16.4 changed: the previously unspecified Solo Coverage maximum is resolved. The current configured maximum continuous duration is 28 days, measured from the session's original activation; it applies to the Custom expected return and to extensions, and an extension doesn't restart it. No canonical demo record changed; `SCV-1001` is unchanged.

  The rule set still has 116 rules in 18 sections.

## Related documents

- [ADULIS_PROTOTYPE_SPEC.md](ADULIS_PROTOTYPE_SPEC.md): the approved master prototype specification.
- [DEMO_DATA.md](DEMO_DATA.md): the single canonical demo dataset used across every surface.
- [CORRECTION_WORK_ORDERS.md](CORRECTION_WORK_ORDERS.md): approved implementation work orders, in execution order.
