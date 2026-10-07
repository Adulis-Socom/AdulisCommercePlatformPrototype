# Adulis Prototype Specification

**Purpose.** This is the approved master specification for the Adulis functional prototype. It defines what the prototype must include and demonstrate, and prototype work is checked against it.

**Status.** APPROVED — 2026-10-02

## Source

The specification was originally supplied to Figma Make, which generated this prototype. `plans/you-are-an-expert-quirky-shell.md` records that it was received. The approved text is recorded below.

## Approved specification

Recorded verbatim, exactly as approved. Wording, capitalisation and layout are the original's, except where an approved correction has since amended them: sections 4, 7, 12, 14, 17, 19, 22, 23, 29, 30, 31, 36, 38, 39, 43, 50, 55 and 59, on 2026-10-02 (see Revision history). Nothing has been changed to match the current prototype.

```text
You are an expert senior product designer, UX architect, interaction designer, design-system designer, and commerce-platform designer.

Your task is to create a HIGH-FIDELITY, CLICKABLE, PRESENTATION-READY FIGMA PROTOTYPE for a commerce platform named:

ADULIS

This is a comprehensive product ecosystem prototype, not a concept-only landing page.

Demonstrate Adulis across five primary product surfaces:

1. COMPANY WEBSITE

2. SELLER STOREFRONT

3. MOBILE APPLICATION
   - Buyer experience
   - Seller Companion
   - Courier experience

4. SELLER CONSOLE

5. OPERATOR CONSOLE

The prototype must realistically demonstrate Adulis to:
- founders;
- investors;
- potential sellers;
- buyers;
- accelerators;
- engineers;
- designers;
- partners.

Do not generate a collection of disconnected screens.

Build a navigable prototype in which the major user journeys can be completed by clicking from one state and product surface to the next.

Do not create backend code.

Do not invent product behavior that conflicts with the requirements below.

==================================================
1. PRIMARY OBJECTIVE
==================================================

Create a connected Adulis ecosystem illustrating the complete journey:

PUBLIC DISCOVERY
→ SELLER
→ PRODUCT
→ SHOPPABLE CONTENT
→ CART
→ CHECKOUT
→ PAYMENT
→ SELLER FULFILMENT
→ COURIER
→ PHYSICAL HANDOFF
→ COMPLETED ORDER
→ REVIEW / CLAIM
→ TRUST / OPERATIONS

The five Adulis surfaces must feel like one product ecosystem rather than five unrelated applications.

Build a clickable prototype with:
- realistic interactions;
- populated demo data;
- loading states;
- empty states;
- validation states;
- permission states;
- error states;
- overlays;
- bottom sheets;
- modals;
- menus;
- forms;
- filters;
- confirmations;
- status transitions;
- responsive behavior;
- cross-surface navigation.

==================================================
2. FIGMA FILE STRUCTURE
==================================================

Organize the Figma file into:

00 — Prototype Guide
01 — Foundations
02 — Components
03 — Company Website
04 — Seller Storefront
05 — Mobile — Buyer
06 — Mobile — Seller Companion
07 — Mobile — Courier
08 — Seller Console
09 — Operator Console
10 — End-to-End Demo Flows

If Figma Make cannot create multiple actual Figma pages, create clearly labelled top-level canvas sections using this structure.

The Prototype Guide must include:

- Adulis ecosystem map;
- description of each product surface;
- primary user types;
- important domain terminology;
- prototype navigation;
- major end-to-end journeys;
- status legend;
- prototype-only controls;
- notes explaining which controls exist only for demonstration.

==================================================
3. DESIGN DIRECTION
==================================================

Adulis should feel:

MODERN
TRUSTWORTHY
COMMERCE-FOCUSED
VISUAL
SIMPLE
WARM
PREMIUM BUT ACCESSIBLE
MOBILE-FIRST FOR BUYERS
OPERATIONALLY PRECISE FOR SELLERS
SERIOUS AND CONTROLLED FOR OPERATORS

Avoid making Adulis resemble:

- TikTok;
- Instagram;
- Amazon;
- generic Shopify themes;
- cryptocurrency apps;
- generic enterprise dashboards;
- traditional marketplace templates.

Adulis should have its own visual identity.

Use an image-led commerce aesthetic with:

- generous whitespace;
- clear visual hierarchy;
- strong typography;
- polished image presentation;
- rounded but restrained surfaces;
- subtle shadows;
- subtle borders;
- clear commerce cards;
- readable status badges;
- accessible contrast;
- restrained iconography;
- consistent responsive behavior.

If no official Adulis colors are supplied, create a REPLACEABLE prototype color system.

Use semantic tokens:

- brand/accent;
- background;
- surface;
- surface-raised;
- text-primary;
- text-secondary;
- text-muted;
- border;
- success;
- warning;
- danger;
- information.

Use an 8-point spacing system.

Minimum mobile touch target:
44 × 44 px.

Use consistent:
- radius;
- typography;
- spacing;
- shadows;
- icon size;
- button hierarchy;
- form controls;
- cards;
- status indicators;
- navigation.

==================================================
4. RESPONSIVE FRAME TARGETS
==================================================

MOBILE APPLICATION

Primary width:
390 px.

Also verify critical screens at:
360 px Android width.

COMPANY WEBSITE

Desktop:
1440 px.

Mobile:
390 px.

SELLER STOREFRONT

Primary:
390 px phone-first.

Also provide:
1440 px desktop presentation.

Do not transform desktop Storefront into a massive traditional e-commerce portal.

SELLER CONSOLE

Desktop-first:
approximately 1440 px.

Also demonstrate tablet/responsive behavior:
approximately 1024 px.

Seller Console is not the primary phone Seller experience.

OPERATOR CONSOLE

Desktop-first:
approximately 1440 px.

Do not create an offline or casual mobile Operator experience.

------------------------------
SMALLER WIDTHS
------------------------------

Audit widths:

Phone: 360, 390 and 430 px.
Tablet: 768 and 1024 px.
Desktop: 1280, 1440 and 1920 px.

General interpretation of the width categories:

Phone: 360–430 px.
Tablet: 768–1024 px.
Desktop: 1280 px and above.

Continue testing the specifically approved audit widths according to surface relevance. Any mobile-responsive surface must be tested at 360, 390 and 430 px.

SELLER CONSOLE remains desktop-first.

Desktop:
normal sidebar/table layout.

Tablet:
collapsible/drawer navigation;
tables may adapt or internally scroll where appropriate.

Phone:
navigation becomes a drawer;
dense rows convert to stacked cards;
forms stack vertically;
core prototype screens remain inspectable and usable.

Seller Companion remains the preferred mobile Seller operations surface.

OPERATOR CONSOLE remains desktop-first, but must still render correctly at mobile widths for prototype inspection/testing:

- the sidebar becomes a drawer;
- queue tables become cards or safe internal-scroll views;
- case drawers become full-screen panels;
- core prototype interactions remain reachable.

Show a subtle "Desktop recommended" message where appropriate.

This is not a casual mobile Operator experience: do not make mobile Operator the preferred production experience.

PROTOTYPE SHELL at small widths:

- do not leave a desktop prototype sidebar consuming product viewport width;
- keep prototype section navigation reachable;
- prevent the guided-flow card from covering mobile bottom navigation;
- avoid double phone framing when the application itself is viewed on a phone;
- no unintended horizontal document scrolling.

==================================================
5. DEMO DATA
==================================================

Use fictional but realistic demo data.

SELLER A

Addis Atelier
Category: Fashion
Trust: ESTABLISHED
Location: Addis Ababa

Products:
- Linen Overshirt — ETB 2,450
- Wide-Leg Trousers — ETB 2,100
- Structured Shoulder Bag — ETB 3,150

SELLER B

Nura Glow
Category: Cosmetics
Trust: TRUSTED
Location: Addis Ababa

Products:
- Hydrating Face Cream — ETB 1,350
- Lip Tint — ETB 750
- Gentle Cleanser — ETB 980

SELLER C

Volt House
Category: Electronics
Trust: NEW
Location: Addis Ababa

Products:
- Wireless Earbuds — ETB 3,800
- Compact Power Bank — ETB 2,900
- Phone Stand — ETB 650

BUYER

Maya Tesfaye

COURIER

Daniel K.

Example Order references:
ADU-24091
ADU-24092
ADU-24093

Never expose internal database UUIDs.

==================================================
6. CORE PRODUCT MODEL
==================================================

Adulis has two important seller publishing objects.

------------------------------
PRODUCT POST
------------------------------

A Product Post represents exactly ONE sellable Product.

It contains canonical commerce information such as:

- product name;
- images;
- variants;
- current price;
- current availability;
- Seller;
- Trust information;
- description;
- structured attributes;
- fulfilment information;
- reviews;
- Add to Cart;
- Save;
- Chat.

Product Post is the exact commerce object.

------------------------------
SHOPPABLE POST
------------------------------

A Shoppable Post is creative merchandising/discovery content.

Examples:
- styled outfit;
- beauty routine;
- product demonstration;
- tutorial;
- product comparison;
- desk setup;
- lifestyle presentation.

A Lifestyle Scene is a presentation pattern of a Shoppable Post.

Do NOT create Scene as a separate third canonical content entity.

A Shoppable Post:

- uses image-led content;
- includes a caption;
- may reference 0..N same-Seller Product Posts;
- may include visual Product hotspots;
- may be published with zero Product tags;
- does not own Product price;
- does not own Product stock;
- does not own Product variants.

A zero-product Shoppable Post may exist on Seller-owned/public surfaces.

However:

- it is NOT eligible for the For You Page;
- Marketplace Search may exclude it under commerce-oriented Search policy.

If all tagged Products become unavailable:

- keep the Shoppable Post published where appropriate;
- remove misleading purchase affordances;
- remove it from FYP eligibility;
- do NOT automatically archive the Shoppable Post.

==================================================
7. FOR YOU PAGE / FYP
==================================================

Buyer Home is the primary Buyer discovery container.

For You is the default discovery channel inside Buyer Home.

Buyer Home contains these launch discovery tabs:

For You
Following
Nearby
Discounts
Locally Made

The For You tab contains Shoppable Posts only as top-level feed units.

Product Posts do not independently appear as FYP feed units.

Following, Nearby, Discounts and Locally Made are distinct discovery views and must not be treated as synonyms for For You.

Channel content:

Following:
published Shoppable Posts from Sellers the Buyer explicitly follows, even if those Posts are not FYP eligible, provided the Post itself remains publicly eligible and is not restricted or removed.
Examples that may remain visible in Following:
- zero-Product published Shoppable Post;
- published Shoppable Post whose tagged Products are currently unavailable.
Do not treat visibility in Following as FYP eligibility.

Nearby:
commerce-relevant discovery, using explicit Seller/store area data and the Buyer's saved or manually selected discovery area.
A Shoppable Post shown in Nearby must:
- be published;
- be publicly eligible;
- meet the approved geographic/saved-area criteria;
- have at least one currently eligible Product.
Do not include zero-eligible-Product Posts.
Do not require live device location.
Do not use live Buyer GPS or Courier GPS.

Locally Made:
Product Posts are the primary content type.
Only Products explicitly marked with approved locally-made metadata.
Do not infer locally made status from Seller location, Seller name, language, category, nationality or ethnicity.
Unavailable locally-made Products may remain visible after available Products and must clearly show:
Currently unavailable.

Discounts:
Product Posts are the primary content type.
Only Products with explicit active discount metadata:

Regular price
Current discounted price
Active status
End date (optional).

For You's Shoppable-Posts-only rule does not apply to Discounts.

A FYP Shoppable Post unit should include:

- large primary image;
- Seller avatar/logo;
- Seller name;
- the Seller's actual public Trust level (rule 14.6);
- caption;
- Product hotspots;
- “In this post” Product preview;
- Save;
- Share;
- Follow Seller;
- More;
- Not Interested;
- Report.

When Buyer taps a Product hotspot:

→ open lightweight Product preview
or
→ Product list bottom sheet.

Then Buyer may open Product Post Detail.

Support vertical scroll/swipe through Shoppable Posts.

Do NOT imitate TikTok video UI.

Launch FYP is image-led.

No native video feed.

------------------------------
NOT INTERESTED AND MORE
------------------------------

Not Interested is a signed-in personalization action (rule 3.9).

In the prototype:

Tap Not Interested
→ remove/hide the content from the current rendered discovery sequence
→ show confirmation toast.

Do not pretend this modifies a production recommendation model.

More opens an action sheet containing, where relevant:

Not Interested
Report

and other already-approved contextual actions only.

------------------------------
REPORT
------------------------------

Prototype report categories:

- Misleading or inaccurate product information;
- Prohibited or unsafe product;
- Spam or scam;
- Inappropriate or abusive content;
- Intellectual-property concern;
- Other.

These are prototype moderation categories and must not be treated as a complete legal/policy taxonomy.

Guest users cannot submit a content Report (rule 3.7).

If a Guest chooses Report:

→ show authentication requirement
→ Sign in / Create account
→ after successful authentication, continue into the Report flow where practical.

This is the current prototype rule and does not establish that anonymous reporting could never be supported by a future production implementation.

------------------------------
GUEST ACCESS TO HOME CHANNELS
------------------------------

For You: public.
Following: authentication required (rule 3.8).
Nearby: public after manually choosing an area (rule 2.14).
Discounts: public.
Locally Made: public.

Nearby must not request or simulate continuous/live Buyer GPS.

For You, Discounts and Locally Made show a Guest the Guest/default discovery ranking. For deterministic prototype purposes, it may use the same canonical content records, in the same order, as Maya's (DEMO_DATA). Do not describe or model it as Maya's personalized feed.

==================================================
8. MARKETPLACE SEARCH
==================================================

Marketplace Search launches with THREE public entity types:

1. PRODUCT_POST
2. SELLER
3. SHOPPABLE_POST

Recommended tabs:

Top
Products
Posts
Sellers

Create:

- Search landing;
- recent searches;
- suggestions;
- active query;
- Top mixed results;
- Products;
- Posts;
- Sellers;
- zero-result recovery;
- filters;
- category refinement;
- availability filter;
- price range;
- Trust filter where appropriate.

Search and FYP must look and behave differently.

FYP:
passive discovery.

Search:
explicit user intent.

Out-of-stock Products may remain searchable but should rank below relevant available Products and clearly show:

Currently unavailable.

==================================================
9. SAVED / COLLECTIONS
==================================================

Buyer can save:

- Product Posts;
- whole Shoppable Posts.

Create:

Saved
→ Collections
→ default Saved Collection
→ custom Collection
→ Product item
→ Shoppable Post item.

Do not build public Collections in the MVP prototype.

Do not add drag-and-drop manual reordering.

==================================================
10. COMPANY WEBSITE
==================================================

Create a polished global Company Website.

Primary routes:

/
How It Works
For Sellers
For Buyers
Trust & Safety
Availability
Markets / Ethiopia
Pricing
About
Press
Help
Contact
Waitlist
Terms
Privacy
Seller Terms
Refunds & Disputes
Prohibited Products
Report Content
Account Deletion

------------------------------
HEADER
------------------------------

Adulis logo

Navigation:
How It Works
For Sellers
For Buyers
Trust & Safety
Availability
About

Primary CTA:
Join Seller Waitlist

Secondary CTA:
Explore Adulis

------------------------------
HOMEPAGE
------------------------------

SECTION 1 — HERO

Primary message:

“Discover products through the way people actually like to see them used.”

Supporting text:

Adulis combines structured Product Posts with creative Shoppable Posts so buyers can move from inspiration to accurate product information and checkout.

Primary CTA:
Explore How It Works

Secondary CTA:
Sell on Adulis

Hero visual:
Shoppable Post
+
Product Post.

SECTION 2 — THE PROBLEM

Card 1:

SOCIAL COMMERCE IS MESSY

- repeated DMs;
- uncertain stock;
- fragmented buyer journeys;
- weak transaction evidence;
- complicated fulfilment.

Card 2:

TRADITIONAL E-COMMERCE CAN FEEL BORING

- repetitive grids;
- little product context;
- weak inspiration;
- limited understanding of how products are used.

SECTION 3 — THE ADULIS MODEL

Creative Shoppable Posts
+
Canonical Product Posts
+
Seller Storefront
+
Gateway Checkout
+
Trust
+
Fulfilment
+
Handoff.

SECTION 4 — FOR YOU DISCOVERY

Show FYP mobile mockup.

Explain:
commerce-focused discovery, not unrestricted entertainment.

SECTION 5 — SELLER STOREFRONTS

Show a mobile Storefront preview.

SECTION 6 — TRUST & SAFETY

Explain:
- Seller admission;
- Trust;
- gateway payment status;
- Handoff evidence;
- verified Reviews;
- Claims;
- Moderation.

Do NOT claim government-ID Seller verification.

SECTION 7 — HOW COMMERCE WORKS

Discover
→ Product
→ Checkout
→ Payment
→ Seller prepares
→ Fulfilment
→ Handoff
→ Review.

SECTION 8 — GLOBAL AVAILABILITY

Explain:

Adulis is architected for international commerce, but specific checkout, Seller onboarding, fulfilment and policy capabilities depend on Market configuration.

Buttons:
View Availability
View Ethiopia

Do not invent live country coverage.

SECTION 9 — SELLER CTA

“Turn your social-commerce presence into a structured shopping experience.”

CTA:
Join Seller Waitlist.

SECTION 10 — FOOTER

Company
Product
Safety
Legal
Support
Markets

------------------------------
HOW IT WORKS
------------------------------

Show visual Buyer journey:

1. Discover a Shoppable Post or Product
2. Open Product Post
3. Check current Product information
4. Add to Cart
5. Checkout
6. Gateway payment
7. Seller prepares
8. Fulfilment
9. Handoff
10. Review

Do not mention live GPS tracking.

------------------------------
FOR SELLERS
------------------------------

Explain:

- Product Posts;
- Shoppable Posts;
- Seller Storefront;
- Catalogue;
- Inventory;
- Orders;
- Buyer Chat;
- Fulfilment;
- Courier Pools;
- Analytics;
- Trust.

Do not display invented subscription prices.

------------------------------
PRICING
------------------------------

Current state:

“Pricing is coming soon.”

Do not invent subscription tiers.

------------------------------
FOR BUYERS
------------------------------

Explain:

- visual discovery;
- accurate Product information;
- Search;
- Seller Trust;
- Collections;
- structured Chat;
- checkout;
- fulfilment;
- verified Reviews.

------------------------------
TRUST & SAFETY
------------------------------

Explain:

- social-business admission;
- Seller status;
- Trust Ladder;
- gateway-confirmed payment;
- Handoff evidence;
- verified Reviews;
- Claims;
- content reporting.

No government-ID claim.

------------------------------
WAITLIST
------------------------------

Fields:

Business name
Contact name
Phone
Email
Primary social account
Category
Country / Market
Short description

Submit

Create:
success state.

==================================================
11. SELLER STOREFRONT
==================================================

Seller Storefront is:

PUBLIC
ANONYMOUS-READABLE
PHONE-FIRST
READ-HEAVY
SELLER-SCOPED
SHAREABLE
SEO-FRIENDLY

It is NOT Seller Console.

It does NOT execute web checkout.

Primary example:

Addis Atelier.

------------------------------
STOREFRONT HEADER
------------------------------

Logo
Addis Atelier
Trust: Established
Fashion
Short bio

Actions:
Share
Open Adulis

Optional:
Open in Maps

Sections / tabs:

Shop
Posts
Reviews
About

Show:
Seller availability
Products
Shoppable Posts
Reviews
Fulfilment
About.

------------------------------
SELLER SEARCH
------------------------------

Search only within that Seller.

------------------------------
PRODUCT CARD
------------------------------

Image
Product name
Price
Availability
Rating
Open in Adulis
Save where appropriate.

------------------------------
PRODUCT DETAIL
------------------------------

Images
Name
Price
Variants
Availability
Seller
Trust
Description
Attributes
Fulfilment
Reviews
Share
Open in Adulis.

Optional Product demo embed:
poster first
→ “Watch product demo”

Do not auto-load social media embeds.

------------------------------
SHOPPABLE POST DETAIL
------------------------------

Creative image
Caption
Seller
Tagged Products
Hotspots
Share
Open in Adulis.

A zero-tag published post may exist without fake Product buttons.

------------------------------
REVIEWS
------------------------------

Show clearly:

PRODUCT QUALITY

separate from

SELLER SERVICE.

Do not combine both into one rating.

------------------------------
SOCIAL ENTRY FLOW
------------------------------

TikTok / Instagram bio
→ Seller Storefront.

Product-specific social link
→ exact Product Post.

Shoppable link
→ exact Shoppable Post.

If app installed:
Open in Adulis.

If not:
remain on Storefront and show install/open CTA.

==================================================
12. MOBILE APP — BUYER EXPERIENCE
==================================================

Buyer bottom navigation:

Home
Shop
Saved
Orders
You

Home is the Buyer discovery container.

Home defaults to the For You discovery channel.

Home contains:

For You
Following
Nearby
Discounts
Locally Made

FYP refers specifically to the For You channel.

Create these core screens:

1. Splash
2. Public/anonymous entry
3. Home
4. Shoppable Post expanded view
5. Scene Explorer presentation
6. Product tag bottom sheet
7. Product Post Detail
8. Seller profile
9. Shop
10. Search landing
11. Search — Top
12. Search — Products
13. Search — Posts
14. Search — Sellers
15. Saved
16. Collection detail
17. Seller-specific Cart
18. Multi-cart summary
19. Checkout
20. Gateway transition
21. Payment Processing
22. Payment Success
23. Orders
24. Order Detail
25. Courier fulfilment status
26. Buyer delivery scanner
27. Review
28. Claim
29. Chat list
30. Conversation
31. Chatbot
32. Notifications
33. You
34. Account Settings
35. Account deletion.

------------------------------
GUEST AND SIGN-IN
------------------------------

Guest access follows rules 3.1–3.12: what a guest may do, which actions require authentication, and the guest's temporary Cart.

Prototype sign-in:

Phone number
→ Continue
→ 6-digit OTP
→ Signed-in Buyer state.

This authentication presentation does NOT resolve the production multi-role Account architecture (section 61).

Do not build Account merging or role migration.

Guest Report: Report submission requires authentication. A Guest who chooses Report sees the authentication requirement (Sign in / Create account) and, after successful authentication, continues into the Report flow where practical (section 7).

------------------------------
GUEST TEMPORARY CART AFTER SIGN-IN
------------------------------

A Guest's temporary Cart survives successful authentication within the current prototype session (rule 3.10).

Guest browses
→ adds Product(s) to temporary Cart
→ attempts Checkout
→ authentication required
→ phone number
→ OTP
→ signed-in Buyer
→ temporary Cart is preserved
→ Checkout continues.

Preserve:

- Seller grouping;
- Product selections;
- variants;
- quantities.

After authentication and before Checkout continues, revalidate current Product availability (rule 3.11). If an item is no longer available:

- show the Buyer what changed;
- do not silently create an invalid Order.

The Guest Cart is transient prototype/session state. It is NOT a canonical Seller Order, and it does NOT require a new permanent Order record in DEMO_DATA merely because a tester added arbitrary Products. Seller Orders are created only through the Checkout/payment flow. Resetting the prototype returns the application to the approved canonical demo-data baseline (rule 3.12).

==================================================
13. BUYER PRODUCT FLOW
==================================================

For You
→ Shoppable Post
→ Product hotspot
→ Product preview
→ Product Post
→ Variant
→ Quantity
→ Add to Cart.

Product Detail shows:

- image gallery;
- Product name;
- price;
- Variant;
- quantity;
- availability;
- Seller;
- Trust;
- Save;
- Share;
- Chat;
- description;
- structured specifications;
- fulfilment;
- Reviews;
- optional Product demo;
- Add to Cart.

Before Add to Cart and Checkout:
current availability must appear server-resolved.

==================================================
14. MULTI-CART
==================================================

A Buyer may add Products from different Sellers.

Create a screen:

YOUR CARTS

ADDIS ATELIER
1 item
ETB ...

NURA GLOW
1 item
ETB ...

The sample follows the canonical multi-Seller Flow D demo: one Product per Seller cart.

A Seller-specific Cart may contain multiple Products.

Each Seller remains separate.

The Checkout experience may coordinate several Seller carts.

Never make the UI imply one cross-Seller Order.

==================================================
15. CHECKOUT
==================================================

Show one Seller Order pricing breakdown at a time where appropriate.

Example:

Products                    ETB 2,450
Courier Delivery              ETB 180
Adulis surcharge 0.5%        ETB 12.25
--------------------------------------
Total                       ETB 2,642.25

Use appropriate currency rounding in final prototype copy.

The 0.5% Adulis surcharge is separate from Courier Delivery.

Current surcharge calculation does not include Courier Delivery charge.

Fulfilment options:

Buyer Collection
Seller Delivery
Courier Delivery

Courier Delivery must show delivery charge before payment.

==================================================
16. PAYMENT
==================================================

Use:

Secure payment

or a configured provider example where appropriate.

States:

Processing
Paid
Failed
Retry
Reconciling / Checking payment.

Important:

Backend/provider establishes PAID.

Never include:

Seller Confirm Payment
Seller Accept Payment
Upload payment screenshot as canonical payment proof.

==================================================
17. ORDER EXPERIENCE
==================================================

Order timeline by fulfilment mode:

COURIER DELIVERY:
Paid
Preparing
Ready for Courier
Courier Assigned
Pickup Verified
Out for Delivery
Delivery Handoff
Completed.

SELLER DELIVERY:
Paid
Preparing
Ready for Seller Delivery
Out for Seller Delivery
Delivery Handoff
Completed.

BUYER COLLECTION:
Paid
Preparing
Ready for Collection
Collection Handoff
Completed.

Do not show Courier-specific states for Seller Delivery or Buyer Collection.

Do NOT create live Courier maps.

Do NOT show moving Courier icons.

Instead show useful progress:

Pickup confirmed — 2:14 PM
Courier is delivering your Order
Delivery verification pending.

Show:
Order products
Seller
Payment summary
Fulfilment
Courier
Handoff
Chat
Claim
Review eligibility.

==================================================
18. DELEGATED RECIPIENT
==================================================

Order Detail action:

Someone else will receive this

Buyer enters:

Recipient name
Phone number

Explain:

This person may receive this Order on your behalf.

Do not transfer:

- Order ownership;
- refund rights;
- Claim ownership;
- Review rights;
- payment information.

Show status:

Recipient authorized.

==================================================
19. FINAL COURIER HANDOFF
==================================================

THIS DIRECTION IS CRITICAL.

DO NOT BUILD:

Buyer displays final QR
→ Courier scans.

CURRENT FLOW:

Courier reaches Buyer or delegate
→ Courier opens Delivery Handoff
→ Courier displays short-lived DELIVERY QR
→ Buyer/delegate opens scanner
→ Buyer/delegate scans Courier QR
→ server verifies
→ Delivery Verified
→ Order Completed.

Buyer UI:

Courier is ready to complete delivery

Button:
Scan Delivery QR

Then:

Camera
→ Verifying
→ Delivery Confirmed.

Fallback:

Having trouble scanning?
Use verification code.

Manual Verification is Operator-only emergency recovery.

Do not expose it as normal Buyer interaction.

------------------------------
SELLER DELIVERY AND BUYER COLLECTION
------------------------------

All three physical fulfilment modes must be capable of reaching a verified final Handoff and Order completion.

SELLER DELIVERY:
Seller or authorized Seller delivery actor displays Delivery QR
→ Buyer/delegate scans.

BUYER COLLECTION:
Seller displays Collection QR
→ Buyer/delegate scans.

For all three:
QR is primary.
OTP is fallback.
Manual Verification is Operator-only emergency recovery.

The existing Pickup/Delivery location checkpoint model remains specific to Courier Delivery unless a later approved system-design decision extends it.

Do NOT add location checkpoints to Seller Delivery or Buyer Collection.

==================================================
20. REVIEW EXPERIENCE
==================================================

Review becomes available after qualifying final Handoff.

Create:

Rate your Order

SELLER SERVICE
1–5 stars

PRODUCT QUALITY
1–5 stars for each eligible Product

Optional review text.

Do not create open comments under Products or Shoppable Posts.

==================================================
21. CLAIM EXPERIENCE
==================================================

From Order Detail:

Problem with this Order?

→ Open Claim.

Claim flow:

Choose issue
→ Explain issue
→ Add allowed evidence
→ Review
→ Submit.

Claim statuses:

Open
Evidence Required
Under Review
Resolved.

Claim UI must not allow the Buyer to modify payment, Order state or Trust.

==================================================
22. BUYER–SELLER CHAT
==================================================

One ongoing Buyer ↔ Seller Conversation per Seller relationship/Market.

Do not create a separate thread for every Product.

Messages may contain contextual chips:

Talking about:
Linen Overshirt

Talking about:
Autumn Layers Shoppable Post

Talking about:
Order ADU-24091

Create:

Conversation list
Conversation detail
Context selector
Messages
Quick Replies
Chatbot
Escalate to Seller.

Context selector:

Offer only records relevant to the current Buyer–Seller relationship (rules 12.5–12.6):

1. General / Seller
2. Product Post
3. Shoppable Post
4. Order

Product Post and Shoppable Post choices must belong to the current Seller and be publicly eligible for the relevant Buyer. Exclude draft, restricted and removed records.

Order choices must belong to the current Buyer and the current Seller.

Never expose another Buyer's Order or another Seller's record.

Historical message context remains immutable when the current composer context changes.

Chat text must never appear as canonical payment, stock or Order authority.

==================================================
23. MOBILE — SELLER COMPANION
==================================================

Seller Companion is lightweight operational Seller mobile UX.

Do NOT duplicate the Seller Console.

Primary navigation:

Alerts
Orders
Inbox
More

Create:

1. Alerts
2. Seller context selector if necessary
3. Paid Orders
4. Order Detail
5. Prepare Order
6. Mark Ready
7. Assign Courier
8. Pickup QR
9. Pickup Verified
10. Delivery status
11. Inbox
12. Conversation
13. Claim response
14. Inventory warning
15. More / Open Seller Console.

------------------------------
SELLER ORDER DETAIL
------------------------------

Show:

Order ADU-24091
PAID
Buyer-safe information
Products
Quantities
Payment status — read-only
Fulfilment
Courier
Pickup Handoff
Delivery status
Chat
Allowed actions.

Never include:

Confirm Payment
Accept Payment
Approve Payment.

------------------------------
MARK READY
------------------------------

PAID
→ Preparing
→ Mark Ready.

Show confirmation.

------------------------------
ASSIGN COURIER
------------------------------

Display approved Seller Courier Pool.

Courier card:

Daniel K.
Available
Completed for the current Seller
Total completed deliveries
Relationship status
Compensation for this Order.

Seller-specific completed deliveries are the primary Seller-facing performance number.

Platform-wide total is secondary context.

Example:

Daniel K.
Available
41 completed for your store
64 total completed deliveries
ETB 180 for this delivery

For a Courier with no completed deliveries for this Seller:

0 completed for your store
66 total completed deliveries

Do not expose other Seller identities or private Courier relationships.

Seller selects Courier
→ Delivery offer / assignment.

No public bidding marketplace.

==================================================
24. MOBILE — COURIER EXPERIENCE
==================================================

Courier is an authenticated operational actor.

Primary navigation:

Assignments
Active Delivery
History
Account

Secondary:
Seller Invitations / Opportunities.

Create:

1. Courier Home
2. Availability
3. Seller Pool Invitations
4. Applications / Opportunities
5. Delivery Offers
6. Offer Detail
7. Accept Delivery
8. Active Assignment
9. Pickup
10. Pickup QR Scanner
11. Pickup Verified
12. Delivery
13. Display Delivery QR
14. Waiting for Recipient
15. Delivery Verified
16. History
17. Courier Profile.

Availability:

Available
Busy
Unavailable.

A Courier may be approved by multiple Sellers.

However:

MVP allows ONE active accepted delivery at a time.

Do NOT create:

- multi-stop batching;
- simultaneous routes;
- route optimization;
- open delivery auction;
- public bidding;
- Courier wallet;
- Adulis balance;
- surge pricing.

==================================================
25. PICKUP HANDOFF
==================================================

Seller and Courier physically meet.

SELLER:
displays Pickup QR.

COURIER:
scans Pickup QR.

Then:

Verifying
→ Pickup Verified.

After successful Pickup:
attempt best-effort Pickup location checkpoint.

Possible:

Pickup location recorded.

or

Location unavailable.

Location failure must NOT reverse successful Pickup verification.

==================================================
26. COURIER LOCATION
==================================================

There is NO continuous GPS in the MVP.

Do not create:

- live tracking;
- background route recording;
- moving-map experience;
- periodic route points;
- route history;
- geofence completion.

Current location collection:

PICKUP CHECKPOINT
+
DELIVERY CHECKPOINT

only.

Checkpoint is supporting evidence.

It does not prove Handoff.

==================================================
27. FINAL DELIVERY — COURIER
==================================================

Courier reaches recipient.

Courier taps:

Complete Delivery.

Courier App generates:

DELIVERY QR.

Courier displays QR.

Buyer/delegate scans.

Courier sees:

Waiting for recipient verification...

Then:

Delivery Verified.

Attempt Delivery checkpoint location.

Then:

Order Completed.

==================================================
28. SELLER CONSOLE
==================================================

Seller Console is the full Seller:

CREATE
CONFIGURE
MANAGE
ADMINISTER

environment.

Desktop navigation:

Home
Orders
Products
Content
Inbox

separator

Insights
Store
Automation
Settings

Top bar:

Seller name
Seller selector where relevant
Search
Notifications
Help
Account.

==================================================
29. SELLER CONSOLE — HOME
==================================================

Two states.

------------------------------
PRE-PUBLICATION
------------------------------

Publication Readiness Hub.

Cards may include:

Social-commerce eligibility
Social account verification
Store profile
Fulfilment setup
First Product Post
Payment-provider readiness where required.

Do NOT include government ID.

Do NOT require Shoppable Post before Store launch.

------------------------------
ACTIVE SELLER
------------------------------

Daily Operations Brief.

Prioritize:

1. Paid Orders needing preparation
2. Claims/deadlines
3. Orders ready for fulfilment
4. Delivery exceptions
5. Low / uncertain stock
6. Buyer messages
7. Shoppable Posts needing action
8. Moderation issues
9. 7-day performance summary

Do not show abandoned checkout attempts as Seller work.

------------------------------
SHOPPABLE POSTS NEEDING ACTION
------------------------------

A Shoppable Post belongs in the "needs attention/action" area (7. Shoppable Posts needing action) when it is:

- published;
- previously associated with commerce Products;
- currently left with zero eligible tagged Products because its tagged Products became unavailable/ineligible;
- and therefore has lost its current commerce-discovery eligibility.

DEMO_DATA records which Shoppable Posts currently meet this condition.

The Seller-facing message may communicate:

Needs attention

No tagged products are currently available. This post is no longer eligible for For You discovery.

Do NOT classify a Shoppable Post as needing action solely because:

- it was intentionally published with zero Product tags;
- it is a Draft;
- it has poor performance;
- one tagged Product is unavailable while at least one other tagged Product remains eligible.

Moderation problems remain in their separate moderation priority/state (8. Moderation issues) and are not duplicated here.

The Shoppable Post remains published according to the existing canonical rules (rule 1.8).

==================================================
30. SELLER CONSOLE — ORDERS
==================================================

Buckets:

Needs Action
Preparing
Ready / Awaiting Fulfilment
In Fulfilment
Completed
Cancelled / Refunded.

Buckets are mode-neutral.

Order rows and Order Detail show the specific fulfilment state, for example Ready for Collection or Out for Seller Delivery.

Keep Courier-specific labels where Courier Delivery is selected.

Order row:

Order reference
Buyer-safe identity
Paid state
Total
Fulfilment
Market-local time
Operational state
Courier
Allowed action.

Order Detail:

Product snapshot
Payment summary
Buyer fulfilment information
Preparation
Courier
Pickup
Delivery Handoff
Checkpoint evidence
Chat
Claim
Timeline.

No live GPS.

==================================================
31. SELLER CONSOLE — PRODUCTS
==================================================

Product list:

Image
Product name
Status
Variants
Price
Stock
Availability
Performance summary.

Product Editor:

Media
Name
Category
Description
Attributes
Variants
Price
Inventory
Fulfilment
Optional approved external Product demo
Preview
Publish.

Product Post = one Product.

Performance summary figures come from DEMO_DATA, derived deterministically from the Seller's 7-day Insights. No screen invents different figures.

==================================================
32. SELLER CONSOLE — CONTENT
==================================================

Content list:

Shoppable Posts
Drafts
Published
Restricted / Removed.

Card:

Media
Caption
Publication state
Moderation
Product tag count
Current Product availability
Performance.

------------------------------
SHOPPABLE POST EDITOR
------------------------------

Steps:

1. Select/upload media
2. Caption
3. Optional Product selection
4. Optional hotspots
5. Preview
6. Publish

Product tag selection is OPTIONAL for publication.

If zero eligible Products:

Show:

Published
Not eligible for For You discovery.

Do not prevent publication solely because Product count = 0.

Only same-Seller Products may be tagged.

==================================================
33. SELLER CONSOLE — INBOX
==================================================

Conversation list:

Buyer
Last message
Context chip
Unread
Response state.

Conversation:

Buyer context
Product/Post/Order anchor
Quick Replies
Manual Seller response
Chatbot escalation.

Internally, individual staff actor identity should remain attributable.

==================================================
34. SELLER CONSOLE — INSIGHTS
==================================================

Dashboard cards:

Paid Orders
Completed Orders
GMV
Product views
Shoppable qualified impressions
Product-tag CTR
Storefront visits
Claims
Cancellation rate
Response reliability
Fulfilment reliability.

Content performance:

Shoppable Post
Impressions
Saves
Tag clicks
Product views
Checkout starts
Paid Orders influenced.

Do NOT show raw recommendation weights.

Also create:

Trust
Reviews
Claims.

==================================================
35. TRUST UI
==================================================

Current Trust Levels:

NEW
REBUILDING
ESTABLISHED
TRUSTED

Trust is read-only.

Money cannot increase Trust.

Ads cannot increase Trust.

Subscription cannot increase Trust.

Seller cannot directly edit Trust.

Operator cannot type a Trust level manually.

Show factual reputation evidence only.

==================================================
36. SELLER CONSOLE — STORE
==================================================

Sections:

Store Profile
Handle
Physical Location
Availability
Fulfilment
Couriers
Verification.

Physical store location:

Use structured map/provider location.

Do not rely solely on free-text address.

In the prototype, show the approved Seller area/neighborhood and a fictional prototype map pin appropriate to that area (DEMO_DATA). Do not claim a real street address unless one has explicitly been approved. The map pin is demonstration data only.

Fulfilment:

Buyer Collection
Seller Delivery
Courier Delivery.

------------------------------
COURIER MANAGEMENT
------------------------------

Tabs:

Approved Couriers
Applications
Invitations
Suspended.

Courier Detail:

Name
Status
Availability
Seller relationship
Completed Seller deliveries
Current terms
Compensation
Relationship history.

Seller actions:

Invite
Approve
Reject
Suspend
Remove
Update future compensation.

Do not expose confidential relationships the Courier has with other Sellers.

==================================================
37. SELLER CONSOLE — AUTOMATION
==================================================

Chatbot:

Overview
Answers
Testing
Insights.

Show:

Configured answers
Topic/intent
Status
Preview
Test conversation
Unmatched questions
Escalation metrics.

==================================================
38. SELLER CONSOLE — SETTINGS
==================================================

Sections:

Team
Roles & Permissions
Sessions & Devices
Security
Ownership
Account / Seller lifecycle
Notifications
Payment-provider status.

Seller team members use individual credentials.

Do not create shared team passwords.

Use permissions rather than simplistic frontend role checks.

The prototype demonstrates every area above with realistic prototype states. Where DEMO_DATA defines no additional staff, show the Seller Owner as the primary member and use empty/default states rather than inventing a large Seller team. Supporting presentation values come from DEMO_DATA. Do not introduce new Seller-role product rules.

==================================================
39. OPERATOR CONSOLE
==================================================

Operator Console is a privileged CONTROL PLANE.

Visually differentiate it from Seller Console.

It should feel:

SECURE
SERIOUS
AUDITABLE
PRECISE
CONTROLLED
DENSE BUT READABLE.

Primary navigation:

Overview

WORK QUEUES
Support
Moderation
Claims
Verification / Recovery
Trust Appeals
Handoff Manual Review

SEARCH
Sellers
Accounts

GOVERNANCE
Configuration
Operator Access
Approvals
Audit
System Health.

Do NOT create generic:

Edit User
Edit Order
Change Payment
Edit Trust

screens.

Operator actions must be controlled domain actions.

------------------------------
OPERATOR SIDEBAR
------------------------------

Desktop has two persistent states:

EXPANDED
COLLAPSED ICON RAIL

Expanded contains a Collapse control.

Collapsed keeps an always-accessible Expand control.

Collapsed icons have labels through tooltip/focus treatment.

The state transition works repeatedly (Expanded → Collapsed → Expanded → Collapsed) without becoming trapped.

Preserve the active Operator destination.

At tablet and phone widths, use a temporary drawer rather than the desktop collapsed rail.

Closing the drawer must not permanently change the desktop sidebar state.

==================================================
40. OPERATOR OVERVIEW
==================================================

Show operational brief:

Urgent Claims
Oldest unresolved work
Moderation backlog
Verification / Recovery
Manual Handoff requests
Trust appeals
Safety restrictions
Pending approvals
Failed review-reminder jobs
Security warnings
Queue health
Provider incidents.

Do not make this a vanity KPI dashboard.

==================================================
41. OPERATOR WORK QUEUE
==================================================

Columns:

Priority
Queue
Case
Subject
Market
Age
Assigned To
Workflow State.

Filters:

Priority
Market
Queue
Age
Assignment
Status.

Actions:

Claim item
Open case.

Claiming a work item changes Operator workflow only.

It must not alter underlying domain truth.

==================================================
42. SUPPORT CASE
==================================================

Show:

Account / Seller
Order
Order timeline
Payment summary
Fulfilment
Handoff
Chat
Claims
Support notes.

Use named actions.

Do not create arbitrary “Save Changes” admin forms.

==================================================
43. MODERATION CASE
==================================================

Queue can include:

Product Posts
Shoppable Posts
Reviews
Seller safety cases.

Case screen:

Reported entity
Exact revision
Report reason
Evidence
Seller
Related Products
History
Policy.

Report reason uses the prototype report categories in section 7.

Actions:

No Action
Restrict
Remove
Restore
Escalate
Temporary Seller Safety Action where authorized.

If a Shoppable Post is removed:

demonstrate that it disappears from:

FYP
Search
Storefront.

==================================================
44. CLAIM CASE
==================================================

Show:

Buyer
Seller
Order
Products
Provider payment status
Adulis surcharge
Courier Delivery charge
Courier assignment
Pickup Handoff
Delivery Handoff
Checkpoint evidence
Chat evidence
Submitted evidence
Claim timeline.

Actions:

Request Evidence
Propose Decision
Escalate
Resolve according to governance.

Operator cannot manually mark unpaid Order as Paid.

==================================================
45. VERIFICATION / RECOVERY
==================================================

Current launch queues focus on:

- social account control;
- social business-page verification fallback;
- account linkage issues;
- phone/account recovery;
- suspicious recovery;
- Seller admission appeal.

Do NOT create:

National ID upload
Passport upload
Selfie verification
Government identity-document queue.

==================================================
46. HANDOFF MANUAL REVIEW
==================================================

Show:

Order
Seller
Buyer/delegate
Courier
Assignment
Pickup evidence
Delivery attempts
OTP attempts
Checkpoint evidence
Timestamps
Claim context
Support context.

Actions:

Approve Manual Verification
Reject
Escalate.

Require:

Reason
Audit record
Approval where appropriate.

Manual Verification is emergency recovery only.

==================================================
47. TRUST APPEALS
==================================================

Show:

Current Trust Level
Trust history
Evidence summary
Policy version
Appeal reason
Related Claim/Review/Handoff evidence.

Do not allow Operator to type a new Trust Level directly.

==================================================
48. OPERATOR GLOBAL SEARCH
==================================================

Search:

Account
Seller
Order
Claim
Content.

Never show internal database UUIDs publicly.

Restricted-data access should support:

Reason for Access

where appropriate.

==================================================
49. OPERATOR GOVERNANCE
==================================================

Configuration:

Market configuration
Feature flags
Provider status
Operational policy.

Operator Access:

Operator
Grants
Status
Last session
Security credential.

Approvals:

Pending consequential actions.

Audit:

Actor
Action
Target
Reason
Timestamp
Result.

System Health:

Database
Queues
Background jobs
Payment reconciliation
Notifications
Media
Privacy workflows
Provider health.

==================================================
50. FOUNDER OPERATIONS
==================================================

Current launch Operator scenario:

CEO
+
COO/CTO.

For consequential actions:

Reviewer
→ Proposal
→ Other Founder Approval
→ Domain action.

Create:

Needs My Review
Needs My Approval
Decision Proposal
Approval
Returned Proposal.

------------------------------
SOLO COVERAGE
------------------------------

Create a clearly privileged state:

SOLO COVERAGE ACTIVE

Requirements:

- other founder unavailable;
- fresh strong reauthentication;
- reason required;
- temporary expiry;
- audit warning;
- prominent banner.

Do not make Solo Coverage normal daily behavior.

Expected duration options:

30 minutes
1 hour
4 hours
Rest of day
1 day
3 days
1 week
Custom date/time

Custom must allow durations extending to multiple weeks.

Custom lets a Founder choose an expected return beyond the preset duration options, including multiple weeks, up to the current configured maximum of 28 days from the original Solo Coverage activation (rule 16.4):

- the UI must not allow a Custom end later than that maximum;
- extensions use the same absolute maximum, still measured from the original activation;
- if an entered Custom time exceeds the maximum, activation or extension is blocked with clear explanatory copy;
- the maximum is calculated in the Market-local timeline but represents an absolute duration from the activation.

Expected duration is an estimate and temporary governance boundary, not permanent authority.

At expected expiry, Solo Coverage automatically becomes inactive (rules 16.6–16.7). Before expiry, an authorized Founder may extend it (rule 16.8) or stop it early (rule 16.9).

Also create a small Future Staff Operations prototype showing:

- COO/CTO operational ownership;
- Support;
- Moderation;
- Claim Review;
- Verification/Recovery;
- queue assignment;
- escalation;
- risk-based approvals.

Do not duplicate the entire Console.

==================================================
51. PAYMENT RULES
==================================================

Canonical current flow:

Buyer Checkout
→ PSP / payment provider
→ backend verification
→ PAID Seller Order.

Never show:

Seller confirms payment.
Seller accepts payment.
Buyer screenshot establishes PAID.
Operator manually changes payment to PAID.

Current Adulis transaction fee:

0.5% Buyer-side Checkout surcharge.

Show it in Buyer Checkout.

Keep it visually separate from:

Courier Delivery charge.

==================================================
52. COURIER COMMERCIAL MODEL
==================================================

For Courier Delivery:

Seller defines Courier compensation.

Buyer sees Courier Delivery charge before paying.

Current MVP:

Courier Delivery charge corresponds to the snapshotted Courier compensation.

Courier must see compensation BEFORE accepting Delivery Offer.

Example:

Products                    ETB 2,450
Courier Delivery              ETB 180
Adulis surcharge 0.5%        ETB 12.25
--------------------------------------
Total                       ETB 2,642.25

Seller changing future Courier rates must not alter already-paid Orders.

==================================================
53. SELLER VERIFICATION
==================================================

DO NOT USE:

National ID
Passport
Government ID
Selfie + ID
ID scan.

Current Seller admission may use:

- social-commerce presence;
- social account control;
- business-page verification;
- required Seller information;
- Market policy;
- PSP onboarding state where required.

Do not display:

Government ID Verified.

==================================================
54. NOTIFICATIONS
==================================================

Create Notification Center examples for:

Buyer:
Order Paid
Ready
Courier assigned
Delivery action
Claim status
Review reminder.

Seller:
New Paid Order
Preparation deadline
Courier offer/assignment issue
Pickup verified
Buyer message
Claim
Low stock
Trust change.

Courier:
Seller Pool invitation
Application approved
Delivery Offer
Assignment
Terms updated.

Notifications attract attention.

They do not create business truth.

==================================================
55. DESIGN SYSTEM COMPONENTS
==================================================

Create reusable Figma components and variants.

FOUNDATIONS:

Typography
Color tokens
Spacing
Radius
Elevation
Grid
Icons
Responsive rules.

BUTTONS:

Primary
Secondary
Tertiary
Destructive
Text
Icon
Loading
Disabled.

FIELDS:

Text
Phone
Email
Search
Select
Multi-select
Textarea
OTP
Price
Quantity
Structured location
Date/time.

CARDS:

Product
Shoppable Post
Seller
Order
Courier
Claim
Notification
Review
Trust
Metric
Work Item.

STATUS COMPONENTS:

Order status variants:

Paid
Preparing

Courier Delivery:
Ready for Courier
Courier Assigned
Pickup Verified
Out for Delivery
Delivery Handoff

Seller Delivery:
Ready for Seller Delivery
Out for Seller Delivery
Delivery Handoff

Buyer Collection:
Ready for Collection
Collection Handoff

Common terminal states:
Completed
Cancelled
Refunded

Do not use Courier-specific states for Seller Delivery or Buyer Collection.

Ready / Awaiting Fulfilment and In Fulfilment are broad Seller Console operational grouping labels, not replacements for the specific Order states shown on individual Orders.

Other status components:

Processing
Claim Open
Published
Draft
Restricted
Unavailable
Trusted
Established
Rebuilding
New.

NAVIGATION:

Mobile bottom nav
Seller sidebar
Operator sidebar
Website header
Storefront tabs
Tabs
Breadcrumbs.

OVERLAYS:

Modal
Bottom sheet
Popover
Menu
Confirmation
Step-Up
QR Display
QR Scanner
OTP
Toast.

STATES:

Skeleton
Empty
Error
Permission denied
No entitlement
Stale
Conflict
Network error.

==================================================
56. UX STATE REQUIREMENTS
==================================================

Do not prototype only happy paths.

Use:

LOADING
EMPTY
READY
STALE
NO_PERMISSION
NO_ENTITLEMENT
BLOCKED
VALIDATION
CONFLICT
PROCESSING
SUCCESS
FAILED
TERMINAL.

Examples:

Payment:
Processing / Paid / Failed.

Product:
Available / Low Stock / Out of Stock / Removed.

Shoppable Post:
Draft / Published / Published but not FYP Eligible / Restricted.

Courier:
Available / Busy / Unavailable.

Delivery Offer:
Open / Accepted / Expired.

Handoff:
Ready / QR Active / Verifying / Verified / Failed / OTP fallback.

Claim:
Open / Evidence Required / Under Review / Resolved.

==================================================
57. ACCESSIBILITY
==================================================

Use WCAG-style accessible interaction principles.

Include:

- strong contrast;
- readable type;
- visible keyboard focus;
- keyboard-accessible desktop controls;
- minimum 44px mobile touch targets;
- semantic labels;
- clear validation;
- text + icon status;
- accessible error states;
- accessible Product list in addition to visual hotspots.

Product hotspots must never be the only method of discovering tagged Products.

==================================================
58. PROTOTYPE INTERACTIONS
==================================================

Use smooth but restrained transitions.

FYP:
vertical scroll/swipe.

Product hotspot:
tap
→ bottom sheet.

Cart:
Add
→ confirmation
→ badge update.

Checkout:
Continue
→ Payment Processing
→ Paid.

Seller:
Mark Ready
→ confirmation
→ state transition.

Courier:
Accept Offer
→ Active Delivery.

Pickup:
scan Seller QR
→ Verifying
→ Verified.

Final Delivery:
Courier shows QR
→ Buyer scans
→ Verified.

Claim:
Submit
→ Claim Created.

Operator:
Claim Work Item
→ Review
→ Proposal
→ Approval.

Use Smart Animate where useful.

Do not over-animate.

==================================================
59. END-TO-END DEMO FLOWS
==================================================

Create labelled prototype entry points.

------------------------------
FLOW A — SELLER ACQUISITION
------------------------------

Company Website
→ For Sellers
→ How Adulis Works
→ Seller Waitlist
→ Success.

------------------------------
FLOW B — SOCIAL ENTRY
------------------------------

External social link
→ Addis Atelier Storefront
→ Product
→ Open in Adulis
→ Native Product Detail.

------------------------------
FLOW C — DISCOVERY TO PURCHASE
------------------------------

For You
→ Shoppable Post
→ Product hotspot
→ Product Detail
→ Variant
→ Add to Cart
→ Checkout
→ Courier Delivery
→ Price breakdown
→ Payment
→ Paid Order.

------------------------------
FLOW D — MULTI-SELLER CART
------------------------------

Add Product from Addis Atelier
+
Product from Nura Glow
→ two Seller carts
→ Checkout coordinator
→ separate Seller Orders.

------------------------------
FLOW E — SELLER CONTENT
------------------------------

Seller Console
→ Products
→ Create Product Post
→ Publish
→ Content
→ Create Shoppable Post
→ Tag Product
→ Add hotspot
→ Preview
→ Publish.

Also show:

Create Shoppable Post
→ no Product selected
→ Publish
→ status:
Published
Not Eligible for For You.

------------------------------
FLOW F — COURIER POOL
------------------------------

Seller Console
→ Store
→ Couriers
→ Application
→ Daniel K.
→ Approve
→ Set Compensation.

------------------------------
FLOW G — FULFILMENT
------------------------------

Paid Order
→ Seller Companion
→ Prepare
→ Mark Ready
→ Assign / Offer to Daniel
→ Seller displays Pickup QR
→ Courier scans
→ Pickup Verified
→ checkpoint location attempted
→ Courier delivers
→ Courier displays Delivery QR
→ Buyer scans
→ Delivery Verified
→ checkpoint attempted
→ Completed.

NO live GPS.

------------------------------
FLOW H — DELEGATED RECIPIENT
------------------------------

Buyer Order
→ Someone Else Will Receive
→ Recipient Name + Phone
→ Authorized
→ Courier displays Delivery QR
→ Delegate scans
→ Completed
→ Review remains Buyer-owned.

------------------------------
FLOW I — REVIEW
------------------------------

Completed Order
→ Review Available
→ Seller Service
→ Product Quality
→ Submit.

------------------------------
FLOW J — CLAIM
------------------------------

Order
→ Problem with Order
→ Claim
→ Submit
→ Operator Claims Queue
→ Case
→ Review
→ Resolution.

------------------------------
FLOW K — MODERATION
------------------------------

Buyer Reports Shoppable Post
→ Operator Moderation Queue
→ Open Case
→ Restrict
→ remove from FYP
→ remove from Search
→ remove from Storefront.

------------------------------
FLOW L — CHATBOT ESCALATION
------------------------------

Product Detail
→ Chat
→ Chatbot
→ unanswered
→ Talk to Seller
→ Seller Companion Inbox.

==================================================
60. FEATURES THAT MUST NOT BE SHOWN AS CURRENT MVP
==================================================

DO NOT BUILD OR PRESENT AS CURRENT:

- Seller payment confirmation;
- manual payment screenshot as payment authority;
- escrow;
- Adulis holding Buyer funds;
- government-ID Seller KYC;
- continuous Courier GPS;
- live Courier map;
- route history;
- background route tracking;
- multi-stop Courier batching;
- route optimization;
- automatic nearby-Courier dispatch;
- open Courier bidding marketplace;
- Courier wallet;
- dynamic surge pricing;
- native Seller video FYP;
- Product Posts as FYP feed units;
- unrestricted social comments;
- cross-Seller Product tags inside a Shoppable Post;
- Similar Finds;
- Complete the Scene;
- seller-controlled recommendation boosts;
- public Collection profiles;
- Storefront web Checkout;
- Storefront web Buyer Chat;
- Storefront web Claims;
- Storefront Review creation;
- arbitrary Operator “edit anything” UI.

==================================================
61. ACCOUNT ARCHITECTURE PROTOTYPE RULE
==================================================

There is an unresolved backend architecture decision regarding whether one person ultimately has:

one multi-relationship Account

or

separate role-purpose Accounts.

Do NOT make the prototype resolve this architecture.

Instead create an INTERNAL prototype-only launcher:

View as Buyer
View as Seller Companion
View as Courier
Open Seller Console
Open Operator Console.

Clearly label:

PROTOTYPE NAVIGATION — NOT PRODUCTION UI.

Inside each real product surface, show only the current operating context.

Do not create Account merge/migration screens.

==================================================
62. FIDELITY EXPECTATION
==================================================

Do NOT produce low-fidelity wireframes.

Create high-fidelity product screens with:

- realistic images/placeholders;
- realistic product content;
- populated data;
- polished spacing;
- realistic tables;
- complete form states;
- coherent responsive behavior;
- realistic statuses;
- clickable interactions;
- reusable components;
- connected journeys.

Prioritize:

1. correct product architecture;
2. navigation;
3. major MVP screens;
4. end-to-end flows;
5. visual consistency;
6. component reuse;
7. secondary states.

Do not waste effort on obscure administrative edge cases before the core product is complete.

==================================================
63. FINAL PROTOTYPE AUDIT
==================================================

Before finalizing, verify every item:

[ ] FYP contains Shoppable Posts only.

[ ] Product Post represents exactly one sellable Product.

[ ] Marketplace Search contains Products + Posts + Sellers.

[ ] Collections support Product Posts and whole Shoppable Posts.

[ ] A Shoppable Post may publish with zero Product tags.

[ ] Zero-product Shoppable Post is not FYP eligible.

[ ] Seller never confirms payment.

[ ] Backend/provider establishes PAID.

[ ] Adulis surcharge is 0.5% Buyer-side.

[ ] Courier Delivery charge is shown separately.

[ ] Seller displays Pickup QR.

[ ] Courier scans Pickup QR.

[ ] Courier displays final Delivery QR.

[ ] Buyer/delegate scans final Delivery QR.

[ ] QR is primary.

[ ] OTP is fallback.

[ ] Manual Verification is emergency Operator recovery.

[ ] No continuous Courier GPS exists.

[ ] Only Pickup and Delivery checkpoint location exists.

[ ] Courier may work with multiple Seller pools.

[ ] One active accepted delivery per Courier exists in MVP.

[ ] No Courier bidding marketplace exists.

[ ] No Courier wallet exists.

[ ] Delegated recipient does not gain Buyer ownership rights.

[ ] Reviews require final verified Handoff.

[ ] Product-quality and Seller-service ratings are separate.

[ ] No government-ID Seller verification is shown.

[ ] Seller Console is full administration.

[ ] Seller Companion remains lightweight operations.

[ ] Seller Storefront has no web Checkout.

[ ] Operator actions are domain-controlled.

[ ] Operator cannot directly change payment truth.

[ ] Trust cannot be purchased.

[ ] Trust cannot be directly edited.

[ ] Current Trust Levels are NEW / REBUILDING / ESTABLISHED / TRUSTED.

[ ] Deferred features are not presented as active MVP.

If any generated screen violates these rules, correct it before considering the prototype complete.

==================================================
64. FINAL OUTPUT
==================================================

Create one cohesive, presentation-ready Adulis ecosystem prototype demonstrating:

- Company Website;
- Seller Storefront;
- Mobile Buyer;
- Mobile Seller Companion;
- Mobile Courier;
- Seller Console;
- Operator Console;
- major cross-surface MVP workflows.

The finished prototype should allow a stakeholder to understand:

what Adulis is,
who it serves,
how discovery works,
how Sellers operate,
how Buyers purchase,
how Couriers fulfil Orders,
how physical Handoff is verified,
how Trust and Reviews work,
and how platform operations control exceptional cases.

The final result should feel like one real commerce platform ready for product review, investor demonstration, usability testing and engineering handoff.
```

## Revision history

- 2026-10-02: File created as an empty scaffold. No specification content recorded.
- 2026-10-02: Approved specification recorded verbatim (APPROVED — 2026-10-02). The received copy ends partway through section 63, so the remainder is still pending.
- 2026-10-02: Remainder received and appended verbatim: the rest of section 63 and section 64 (FINAL OUTPUT). The approved specification is now recorded in full.
- 2026-10-02:
  - clarified Buyer Home vs For You (section 7 amended);
  - established documentation authority precedence (recorded in ADULIS_CANONICAL_RULES.md).
- 2026-10-02:
  - Buyer bottom navigation and screen inventory: For You renamed to Home (section 12 amended);
  - clarified Home vs For You: Home defaults to the For You channel and contains the five launch discovery channels; FYP refers specifically to the For You channel.
- 2026-10-02: Demo-data open decisions resolved:
  - Flow G corrected to Mark Ready → Assign / Offer to Daniel (section 59);
  - the multi-cart sample now shows one Product per Seller cart, matching the Flow D demo; a Seller-specific Cart may still contain multiple Products (section 14);
  - Seller Delivery and Buyer Collection final Handoff added; location checkpoints remain specific to Courier Delivery (section 19);
  - Buyer Home channel content sources clarified (section 7).
- 2026-10-02: Final corrections before demo-data approval:
  - Order timelines by fulfilment mode, with no Courier-specific states for Seller Delivery or Buyer Collection (section 17);
  - Seller Console grouping made mode-neutral: Ready / Awaiting Fulfilment and In Fulfilment (sections 29 and 30);
  - the Seller Companion Courier card distinguishes completed for the current Seller from total completed deliveries (section 23);
  - content rules for Following, Nearby, Discounts and Locally Made (section 7).
- 2026-10-02: Final demo-data approval pass:
  - the Seller Companion Courier card example now uses the canonical Addis Atelier state, 41 completed for your store and 64 total completed deliveries; the newly invited example (0 and 66) is unchanged (section 23);
  - the Order status variants now follow the fulfilment-specific states, replacing the generic Ready, Assigned, In Delivery and Delivery Verified; Ready / Awaiting Fulfilment and In Fulfilment are grouping labels only (section 55).
- 2026-10-02: Seller Companion Courier card wording (section 23): the 0-for-this-Seller example is now labelled "For a Courier with no completed deliveries for this Seller", because the canonical record behind it (Daniel K. at Volt House) began with an application, not an invitation. The values (0 and 66) and the metric rules are unchanged.
- 2026-10-02: Work-order decisions recorded:
  - smaller-width behaviour for the Seller Console, Operator Console and prototype shell, with the audit widths (section 4);
  - For You units show the Seller's actual public Trust level; Not Interested and More, the Report categories and guest access to the Home channels (section 7);
  - guest access and the prototype sign-in sequence (section 12);
  - the chat context selector (section 22);
  - Product performance figures come from DEMO_DATA (section 31);
  - the Store area with a fictional map pin (section 36);
  - Settings demonstrated with realistic prototype states (section 38);
  - the Operator sidebar (section 39);
  - Report reasons use the section 7 categories (section 43);
  - Solo Coverage duration options and expiry (section 50).
- 2026-10-02: Final work-order decisions recorded:
  - width categories as a general interpretation (phone 360–430 px, tablet 768–1024 px, desktop 1280 px and above), with testing continuing at the specific audit widths (section 4);
  - a guest who chooses Report authenticates first, and Guest Home's For You, Discounts and Locally Made use the Guest/default discovery ranking, not Maya's personalized feed (section 7);
  - Report for a guest, and the guest's temporary Cart through sign-in as transient session state (section 12);
  - which Shoppable Posts need action on the Seller Console Home, and the Seller-facing message (section 29).
- 2026-10-07: Solo Coverage maximum recorded (section 50). The previously unspecified maximum is resolved: Custom allows multiple weeks up to the current configured maximum continuous duration of 28 days, measured from the original activation; extensions use the same maximum; an entered time beyond it blocks activation or extension with explanatory copy; it is calculated in the Market-local timeline as an absolute duration from the activation. No canonical demo record changed; `SCV-1001` is unchanged.

## Related documents

- [ADULIS_CANONICAL_RULES.md](ADULIS_CANONICAL_RULES.md): the authoritative prototype invariants.
- [DEMO_DATA.md](DEMO_DATA.md): the single canonical demo dataset used across every surface.
- [CORRECTION_WORK_ORDERS.md](CORRECTION_WORK_ORDERS.md): approved implementation work orders, in execution order.
