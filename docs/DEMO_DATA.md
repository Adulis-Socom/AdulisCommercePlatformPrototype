# Adulis Demo Data

**Purpose.** This defines the single canonical demo dataset used across every surface of the prototype. That covers the people, sellers, products, posts, orders, deliveries and cases the demo shows, with their identifiers, values and states. Every surface should present these same records, so the demo tells one consistent story.

**Status.** APPROVED — 2026-10-02. This is the authoritative canonical prototype demo dataset under the document precedence in [ADULIS_CANONICAL_RULES.md](ADULIS_CANONICAL_RULES.md).

## Current state (context only, not canonical)

Today each surface keeps its own hard-coded copy of the demo data, mostly inside its file under `src/sections/`. The copies disagree in places (identifiers, statuses, people, totals). Nothing in the current code is canonical until it's recorded here.

## Canonical dataset

This is the only demo story. Every name, identifier, price, count, status and timestamp the prototype shows comes from here. Anything the prototype needs that isn't here gets added here first, with approval, rather than written into a screen.

The dataset starts from the approved specification (Sellers, their first three Products, Buyer, Courier, Order references and the checkout example) and follows the canonical rules. Every other value is a demo choice made in this document.

The primary story belongs to the three showcase Sellers, Maya and Daniel K. Supporting records (the operations-only Seller Nile Loom, the supporting Courier Bereket M. and three secondary Buyers) exist only to make Seller and Operator surfaces realistic. They never replace the primary actors.

### Conventions

- **Identifiers** are prototype identifiers, not production database IDs. Each identifies exactly one record. Sequence numbers don't imply chronological order.

  | Record | Format | Example |
  |---|---|---|
  | Seller | `SEL-<NAME>` | `SEL-ADDIS-ATELIER` |
  | Product | `PRD-<seller code>-NNN` | `PRD-AA-001` |
  | Shoppable Post | `SHP-<seller code>-NNN` | `SHP-NG-001` |
  | Buyer | `BUY-<NAME>` | `BUY-MAYA-TESFAYE` |
  | Courier | `COU-<NAME>` | `COU-DANIEL-K` |
  | Seller Order | `ADU-NNNNN` | `ADU-24091` |
  | Payment reference | `PAY-<order number>-<attempt>` | `PAY-24091-01` |
  | Claim | `CLM-NNNN` | `CLM-1002` |
  | Review | `REV-NNNN` | `REV-1001` |
  | Collection | `COL-<OWNER>-<NAME>` | `COL-MAYA-SAVED` |
  | Conversation | `CNV-<BUYER>-<seller code>` | `CNV-MAYA-AA` |
  | Moderation case | `MOD-NNNN` | `MOD-1001` |
  | Support case | `SUP-NNNN` | `SUP-1001` |
  | Verification / Recovery case | `VER-NNNN` | `VER-1001` |
  | Trust Appeal | `TAP-NNNN` | `TAP-1001` |
  | Handoff Manual Review | `HMR-NNNN` | `HMR-1001` |
  | Solo Coverage period | `SCV-NNNN` | `SCV-1001` |
  | Founder decision | `DEC-NNNN` | `DEC-1001` |
  | Seller team member | `STF-<seller code>-NN` | `STF-AA-01` |
  | Operator | `OPR-<ROLE>` | `OPR-CEO` |

  Seller codes: `AA` Addis Atelier, `NG` Nura Glow, `VH` Volt House, `NL` Nile Loom (supporting operations-only Seller).
- **Market:** Ethiopia (`MKT-ET`). City: Addis Ababa. Currency: ETB. Market-local time: EAT (UTC+3).
- **Money:** amounts are exact to two decimals. The Adulis surcharge is 0.5% of the Products subtotal; it excludes the delivery charge (rules 5.6–5.8).
- **Demo-data values:** fulfilment charges, Courier compensation, discounts, Claim outcomes, preparation and Claim deadlines, map pins, Product performance figures and Settings states belong to this fictional story only. They don't establish platform-wide Adulis policy or service levels.
- **Default canonical demo snapshot:** Friday 2 October 2026, 10:25 EAT. Every surface shows this state unless a guided flow explicitly documents a state before or after it (see Story timeline).

### Story at a glance

On Friday 2 October 2026, Maya Tesfaye sees the Linen Overshirt in Addis Atelier's "Autumn Layers" Shoppable Post. In one coordinated checkout she buys it, together with the Hydrating Face Cream from Nura Glow, as two separate Seller Orders: ADU-24091 and ADU-24092. She also buys a Phone Stand from Volt House (ADU-24093, Seller Delivery).

Daniel K. delivers ADU-24091 to Maya, then ADU-24092 to her sister Liya, whom Maya has authorized to receive it. Late in the afternoon Volt House delivers the Phone Stand itself. Maya then reviews ADU-24091.

Earlier that morning Maya opened a Claim about trousers from an earlier Addis Atelier order and reported a misleading Volt House post. The Founders resolve both in the Operator Console. Volt House, a NEW Seller, approves Daniel into its Courier pool.

### Sellers

The three primary showcase Sellers:

| ID | Name | Handle | Category | Trust | Location | On Adulis since | Followers |
|---|---|---|---|---|---|---|---|
| `SEL-ADDIS-ATELIER` | Addis Atelier | @addisatelier | Fashion | ESTABLISHED | Bole, Addis Ababa | March 2026 | 1,240 |
| `SEL-NURA-GLOW` | Nura Glow | @nuraglow | Cosmetics | TRUSTED | Kazanchis, Addis Ababa | January 2026 | 3,860 |
| `SEL-VOLT-HOUSE` | Volt House | @volthouse | Electronics | NEW | Megenagna, Addis Ababa | September 2026 | 210 |

All three Stores are open. Each Seller was admitted on social-commerce presence and verified social account control; no government ID is involved (rule 13.1). Each has an Instagram and a TikTok account under the same handle.

Storefront share links use these handles only. No production Adulis Storefront domain is approved, so the dataset holds no public URL and no placeholder domain.

The Courier Delivery charges (Addis Atelier ETB 180.00; Nura Glow ETB 150.00; Volt House ETB 200.00 once it approves Daniel K. in Flow F) are demo-data values only. They don't establish a platform-wide Courier pricing policy. Each equals that Seller's Courier compensation (specification §52).

Totals are as at 10:25. Each Order completed later on 2 October adds one to its Seller's completed count: Addis Atelier 129 from 14:52, Nura Glow 413 from 16:05 and Volt House 10 from 17:05.

**Addis Atelier** (`SEL-ADDIS-ATELIER`)

- Bio: "Contemporary clothing and accessories, designed and finished in Addis Ababa."
- Fulfilment:
  - Buyer Collection: free, at the Bole studio, Monday–Saturday 10:00–18:00.
  - Courier Delivery: ETB 180.00.
  - No Seller Delivery.
- Courier compensation (current terms): ETB 180.00 per delivery. Approved Courier: Daniel K.
- Team: Hiwot Haile, Owner (`STF-AA-01`); Abel Tadesse, Operations (`STF-AA-02`).
- Trust history: NEW (March 2026) → ESTABLISHED (1 August 2026).
- Totals: 128 completed Orders. Seller Service 4.8 from 96 ratings.

**Nura Glow** (`SEL-NURA-GLOW`)

- Bio: "Gentle skincare and colour for everyday routines."
- Fulfilment:
  - Seller Delivery: ETB 120.00, within Addis Ababa.
  - Courier Delivery: ETB 150.00.
  - No Buyer Collection.
- Courier compensation (current terms): ETB 150.00 per delivery. Approved Courier: Daniel K.
- Team: Nardos Ayele, Owner (`STF-NG-01`).
- Trust history: NEW (January 2026) → ESTABLISHED (April 2026) → TRUSTED (15 August 2026).
- Totals: 412 completed Orders. Seller Service 4.9 from 262 ratings.

**Volt House** (`SEL-VOLT-HOUSE`)

- Bio: "Everyday tech accessories, checked before they ship."
- Fulfilment:
  - Buyer Collection: free, at the Megenagna shop, Monday–Saturday 09:00–19:00.
  - Seller Delivery: ETB 100.00.
  - Courier Delivery: ETB 200.00 from Flow F (16:30), when Volt House approves Daniel K. and sets his compensation. Before that it has no approved Courier.
- Team: Ermias Bekele, Owner (`STF-VH-01`).
- Trust history: NEW (admitted 10 September 2026).
- Totals: 9 completed Orders. Seller Service 4.6 from 7 ratings.

**Volt House — Pre-publication Setup Snapshot** (historical/setup snapshot)

This snapshot shows the Seller Console Home in its pre-publication state: the Publication Readiness Hub (specification §29). It replays Volt House's setup on Wednesday 9 September 2026 at 16:00, the day before it was admitted and published. It doesn't alter Volt House's canonical current state, which is published, NEW and open.

| Readiness card | State on 9 September |
|---|---|
| Social-commerce eligibility | Complete: @volthouse on Instagram and TikTok, with social account control verified |
| Store setup | Complete: Store profile, handle @volthouse and the Megenagna shop location |
| Fulfilment setup | Complete: Buyer Collection (free) and Seller Delivery (ETB 100.00); no Courier yet |
| First Product readiness | Ready: `PRD-VH-001` Wireless Earbuds is a complete draft, ready to publish |
| Payment-provider readiness | In progress: provider onboarding submitted, awaiting the provider's confirmation |

No government ID is requested anywhere (rule 13.1), and no Shoppable Post is required before the Store launches (§29). Provider onboarding is separate from Adulis admission (rule 13.2). The provider confirmed on 10 September, and Volt House was admitted and published that day.

**Store map pins** (specification §36). Each pin is a neighborhood-level fictional prototype pin, placed within the Seller's approved area and rounded to approximately two decimal places (about 1 km). The pins demonstrate structured location and map UI. None is a street address, and no street address is approved: a pin must never be represented as a verified real-world business street address.

| Seller | Area | Fictional map pin |
|---|---|---|
| Addis Atelier | Bole, Addis Ababa | 8.99° N, 38.79° E |
| Nura Glow | Kazanchis, Addis Ababa | 9.02° N, 38.77° E |
| Volt House | Megenagna, Addis Ababa | 9.02° N, 38.80° E |

**Seller Console Settings** (specification §38). Realistic prototype states for the three primary Sellers. Each Owner is the primary member. This dataset names no other staff except Abel Tadesse at Addis Atelier, so the other areas use default or empty states. No Seller-role rules are defined: each role shows its default permission set, without itemised permissions.

| Area | Addis Atelier | Nura Glow | Volt House |
|---|---|---|---|
| Team | Hiwot Haile, Owner (primary member); Abel Tadesse, Operations | Nardos Ayele, Owner | Ermias Bekele, Owner |
| Roles & Permissions | Owner and Operations, each with its default permission set | Owner, default permission set | Owner, default permission set |
| Sessions & Devices | Hiwot H.: Seller Console in a desktop browser. Abel T.: Seller Companion on a phone. No unrecognised devices. | Nardos A.: Seller Console in a desktop browser and Seller Companion on a phone. No unrecognised devices. | Ermias B.: Seller Console in a desktop browser and Seller Companion on a phone. No unrecognised devices. |
| Security | Individual credentials for each member; no shared team password. No open security alerts. | Same | Same |
| Ownership | Owner: Hiwot Haile. No transfer pending. | Owner: Nardos Ayele. No transfer pending. | Owner: Ermias Bekele. No transfer pending. |
| Account / Seller Lifecycle | Published and open; on Adulis since March 2026 | Published and open; on Adulis since January 2026 | Published and open; admitted and published 10 September 2026 |
| Notifications | Default: every Seller notification type on (specification §54) | Same | Same |
| Payment-provider Status | Ready | Ready | Ready, confirmed 10 September 2026 |

Provider names aren't shown: payment is labelled "Secure payment".

### Supporting operations-only Seller

**Nile Loom** (`SEL-NILE-LOOM`): Supporting operations-only Seller — not one of the three primary showcase Sellers.

It exists to give the Operator Console a realistic Trust Appeal (`TAP-1001`) and a historical failed handoff (`HMR-1001`). It doesn't need the five-Product, five-post setup of the primary Sellers. It isn't part of any Buyer-facing demo surface (Home channels, Search, Storefront) or of guided flows A–L.

- Handle: @nileloom. Category: Home textiles. Location: Piassa, Addis Ababa. On Adulis since February 2026.
- Trust: REBUILDING. Trust history: NEW (February 2026) → ESTABLISHED (May 2026) → REBUILDING (16 September 2026).
- Fulfilment: Courier Delivery, ETB 160.00 (a demo-data value only). No Buyer Collection or Seller Delivery.
- Courier compensation (current terms): ETB 160.00 per delivery. Approved Courier: Bereket M. (supporting).
- Product: `PRD-NL-001` Woven Cotton Throw. ETB 1,800.00; Colour Natural/Grey; stock 7; Available; Product Quality 3.9 (21). "A soft woven throw for sofas and beds." 100% cotton; 130 × 170 cm. Not marked locally made.
- No Shoppable Posts.

### Products

Stock is as at the 10:25 snapshot, after the morning's Orders. Product Quality shows the average with the number of ratings in brackets. Price is the regular price; three Products also have an active demo discount (see Discounts).

| ID | Product | Price (ETB) | Variants | Stock | Availability | Product Quality | Locally made |
|---|---|---|---|---|---|---|---|
| `PRD-AA-001` | Linen Overshirt | 2,450.00 | Size S/M/L/XL; Colour Natural/Olive | 14 | Available | 4.8 (36) | Yes |
| `PRD-AA-002` | Wide-Leg Trousers | 2,100.00 | Size S/M/L/XL; Colour Sand/Charcoal | 9 | Available | 4.7 (24) | Yes |
| `PRD-AA-003` | Structured Shoulder Bag | 3,150.00 | Colour Tan/Black | 2 | Low Stock | 4.9 (19) | Yes |
| `PRD-AA-004` | Cotton Shirt Dress | 2,750.00 | Size S/M/L/XL; Colour White/Indigo | 6 | Available | 4.6 (12) | Yes |
| `PRD-AA-005` | Woven Leather Belt | 950.00 | Size S/M/L; Colour Brown | 0 | Out of Stock (since 24 September) | 4.5 (9) | Yes |
| `PRD-NG-001` | Hydrating Face Cream | 1,350.00 | 50 ml | 40 | Available | 4.9 (88) | No |
| `PRD-NG-002` | Lip Tint | 750.00 | Shade Rose/Berry/Coral | 55 | Available | 4.7 (64) | No |
| `PRD-NG-003` | Gentle Cleanser | 980.00 | 150 ml | 33 | Available | 4.8 (71) | No |
| `PRD-NG-004` | Vitamin C Serum | 1,650.00 | 30 ml | 3 | Low Stock | 4.6 (22) | No |
| `PRD-NG-005` | Mineral Sunscreen SPF 50 | 1,200.00 | 50 ml | 21 | Available | 4.8 (30) | No |
| `PRD-VH-001` | Wireless Earbuds | 3,800.00 | Colour Black/White | 12 | Available | 4.5 (4) | No |
| `PRD-VH-002` | Compact Power Bank | 2,900.00 | 10,000 mAh; Colour Black | 0 | Out of Stock | No ratings yet | No |
| `PRD-VH-003` | Phone Stand | 650.00 | Colour Grey | 24 | Available | 4.7 (3) | No |
| `PRD-VH-004` | USB-C Fast Charger | 1,450.00 | 30 W | 18 | Available | No ratings yet | No |
| `PRD-VH-005` | Braided USB-C Cable | 450.00 | 1.5 m | 60 | Available | No ratings yet | No |

The first three Products of each Seller are the approved specification's. Fulfilment options and charges come from the Seller.

"Locally made" is explicit, approved Product metadata, set Product by Product; it's never derived from another field. In the current canonical dataset only Addis Atelier's Products are marked Locally Made (rule 2.12). Nothing is inferred from Seller location, Seller name, language, category, nationality or ethnicity.

Descriptions and attributes:

- `PRD-AA-001` "A relaxed overshirt in washed linen, cut to layer over a tee or under a coat." 100% linen; relaxed fit; made in Addis Ababa; hand wash cold.
- `PRD-AA-002` "High-waisted trousers with a soft wide leg and a side zip." 70% cotton, 30% linen; made in Addis Ababa.
- `PRD-AA-003` "A firm leather shoulder bag that fits a 13-inch laptop." Full-grain leather; inner width 34 cm; made in Addis Ababa.
- `PRD-AA-004` "A belted shirt dress in crisp cotton poplin." 100% cotton; made in Addis Ababa.
- `PRD-AA-005` "A hand-woven leather belt with a brass buckle." Leather and brass; made in Addis Ababa.
- `PRD-NG-001` "A lightweight daily moisturiser." 50 ml; fragrance-free.
- `PRD-NG-002` "A sheer, buildable tint for lips and cheeks." 6 ml.
- `PRD-NG-003` "A low-foam cleanser for morning and evening." 150 ml.
- `PRD-NG-004` "A brightening serum for daily use." 30 ml.
- `PRD-NG-005` "A mineral sunscreen that wears well under make-up." 50 ml; SPF 50.
- `PRD-VH-001` "Compact earbuds with a pocket-size charging case." Bluetooth 5.3; up to 6 hours per charge.
- `PRD-VH-002` "A slim power bank for phones and earbuds." 10,000 mAh; USB-C in and out.
- `PRD-VH-003` "An adjustable aluminium stand for phones and small tablets." Aluminium; adjustable angle.
- `PRD-VH-004` "A 30 W wall charger for phones and tablets." 30 W; USB-C.
- `PRD-VH-005` "A durable braided USB-C to USB-C cable." 1.5 m.

#### Discounts

Active demo discounts:

| Product | Regular price (ETB) | Current discounted price (ETB) | Discount | Status | End date |
|---|---|---|---|---|---|
| `PRD-AA-004` Cotton Shirt Dress | 2,750.00 | 2,200.00 | 20% | Active | 11 October 2026 |
| `PRD-VH-005` Braided USB-C Cable | 450.00 | 360.00 | 20% | Active | 15 October 2026 |
| `PRD-NG-005` Mineral Sunscreen SPF 50 | 1,200.00 | 1,020.00 | 15% | Active | None |

- None of these Products appears in a recorded Order, so no historical Order total changes. A new Order for one of them uses the current discounted price.
- These values are canonical demo data. They don't establish a production discount-management system or a Seller Console discount workflow unless that's separately approved.

#### Product performance (7 days)

Deterministic Product-level figures for the Product list's Performance summary (specification §31), derived from each Seller's 7-day Insights, over the same window: the 7 days to 10:25 on 2 October. Screens show these figures and don't compute their own.

| Product | Product views | Units sold | GMV (ETB) |
|---|---|---|---|
| `PRD-AA-001` Linen Overshirt | 430 | 4 | 9,800.00 |
| `PRD-AA-002` Wide-Leg Trousers | 250 | 1 | 2,100.00 |
| `PRD-AA-003` Structured Shoulder Bag | 210 | 0 | 0.00 |
| `PRD-AA-004` Cotton Shirt Dress | 190 | 1 | 2,750.00 |
| `PRD-AA-005` Woven Leather Belt | 100 | 0 | 0.00 |
| `PRD-NG-001` Hydrating Face Cream | 820 | 6 | 8,100.00 |
| `PRD-NG-002` Lip Tint | 900 | 10 | 7,500.00 |
| `PRD-NG-003` Gentle Cleanser | 520 | 3 | 2,940.00 |
| `PRD-NG-004` Vitamin C Serum | 430 | 2 | 3,300.00 |
| `PRD-NG-005` Mineral Sunscreen SPF 50 | 290 | 0 | 0.00 |
| `PRD-VH-001` Wireless Earbuds | 140 | 1 | 3,800.00 |
| `PRD-VH-002` Compact Power Bank | 40 | 0 | 0.00 |
| `PRD-VH-003` Phone Stand | 90 | 1 | 650.00 |
| `PRD-VH-004` USB-C Fast Charger | 95 | 1 | 1,450.00 |
| `PRD-VH-005` Braided USB-C Cable | 55 | 0 | 0.00 |

- For each Seller, Product views add up to the Insights Product views (1,180, 2,960 and 420), and GMV adds up to the Insights GMV (14,650.00, 21,840.00 and 5,900.00). Each GMV is units sold × the price paid.
- Units sold include every modelled Order in the window: `ADU-23978`, `ADU-24041` and `ADU-24091` (Addis Atelier); `ADU-24007` and `ADU-24092` (Nura Glow); `ADU-24093` (Volt House). Units can exceed Paid Orders because an Order can hold more than one unit: Nura Glow sold 21 units in 18 Paid Orders, while Addis Atelier and Volt House sold one unit per Order.
- The Cotton Shirt Dress's GMV is one sale at its regular price, ETB 2,750.00. That sale occurred before the Product's currently demonstrated discount became active, and the later discount is never applied retroactively to the historical Order or performance record. No unit was sold at a discounted price in the window.

### Shoppable Posts

Every tag is a same-Seller Product (rule 1.5).

| ID | Title | Type | Tagged Products | Hotspots | Publication | For You | Notes |
|---|---|---|---|---|---|---|---|
| `SHP-AA-001` | Autumn Layers | Styled outfit | AA-001, AA-002, AA-003 | 3 | Published | Eligible | First post in Maya's For You (Flow C) |
| `SHP-AA-002` | Linen, three ways | Tutorial | AA-001 | 1 | Published | Eligible | |
| `SHP-AA-003` | Desk to dinner | Lifestyle presentation | AA-004, AA-003 | 2 | Published | Eligible | |
| `SHP-AA-004` | Inside the Bole studio | Lifestyle presentation | none | 0 | Published | Not eligible: no Products | Shown on the Storefront |
| `SHP-AA-005` | Belt detail | Product demonstration | AA-005 | 1 | Published | Not eligible: tagged Product out of stock | Stays published; purchase affordances removed (rule 1.8) |
| `SHP-NG-001` | Morning routine in three steps | Beauty routine | NG-003, NG-001, NG-005 | 3 | Published | Eligible | |
| `SHP-NG-002` | Find your Lip Tint shade | Product comparison | NG-002 | 1 | Published | Eligible | |
| `SHP-NG-003` | Vitamin C, explained | Tutorial | NG-004 | 1 | Published | Eligible | Tagged Product is Low Stock but available |
| `SHP-NG-004` | Sunday reset | Lifestyle presentation | NG-001, NG-002 | 2 | Published | Eligible | |
| `SHP-NG-005` | Behind our formulas | Lifestyle presentation | none | 0 | Draft | Not eligible | |
| `SHP-VH-001` | Desk setup for small spaces | Desk setup | VH-003, VH-004, VH-005 | 3 | Published | Eligible | |
| `SHP-VH-002` | Earbuds for the commute | Product demonstration | VH-001 | 1 | Published | Eligible | |
| `SHP-VH-003` | Which charger do I need? | Product comparison | VH-004, VH-005 | 2 | Published | Eligible | |
| `SHP-VH-004` | Fast charging, explained | Tutorial | VH-004 | 1 | Published | Eligible until restricted in Flow K | Reported by Maya (`MOD-1001`) |
| `SHP-VH-005` | Unboxing our first shipment | Lifestyle presentation | none | 0 | Published | Not eligible: no Products | |

Captions:

- `SHP-AA-001` "Autumn Layers: our linen overshirt over wide-leg trousers, finished with the structured bag."
- `SHP-AA-002` "One linen overshirt, three ways to wear it this week."
- `SHP-AA-003` "From the desk to dinner in one cotton shirt dress."
- `SHP-AA-004` "A morning inside our Bole studio, where every piece is finished."
- `SHP-AA-005` "A closer look at the hand-woven belt."
- `SHP-NG-001` "Cleanse, moisturise, protect: our three-step morning routine."
- `SHP-NG-002` "Rose, Berry or Coral? Find your Lip Tint shade."
- `SHP-NG-003` "How to add Vitamin C to your routine, step by step."
- `SHP-NG-004` "A slow Sunday reset with our face cream and tint."
- `SHP-NG-005` "Behind our formulas: how we test every batch."
- `SHP-VH-001` "A tidy desk setup for small spaces."
- `SHP-VH-002` "Earbuds that keep up with the commute."
- `SHP-VH-003` "Which charger and cable do you actually need?"
- `SHP-VH-004` "Fast charging, explained: our 30 W charger fully charges any laptop in 30 minutes." (Published 28 September 2026. This claim is what Maya reports: the tagged charger is described as being for phones and tablets.)
- `SHP-VH-005` "Unboxing our first shipment of the season."

**Seller Console Home: Shoppable Posts needing action** (specification §29). Throughout 2 October, `SHP-AA-005` is the only post that meets the condition. It's published and tagged with `PRD-AA-005`, which has been out of stock since 24 September, so it's left with zero eligible tagged Products and has lost For You eligibility. It stays published (rule 1.8).

- Addis Atelier's Home lists `SHP-AA-005` under Shoppable Posts needing action, with the title "Needs attention" and the message "No tagged products are currently available. This post is no longer eligible for For You discovery."
- Nura Glow and Volt House have no Shoppable Post needing action.
- Not listed, because none meets the condition:
  - `SHP-AA-004`, `SHP-VH-005` and, from 12:30, `SHP-AA-007`: published with zero Product tags by design;
  - `SHP-NG-005`: a Draft;
  - `SHP-VH-004`: its restriction at 11:05 (Flow K) is a moderation problem, shown only under Moderation issues, and its tagged Product stays available;
  - every other published post: at least one tagged Product stays available.

### Buyer

**Maya Tesfaye** (`BUY-MAYA-TESFAYE`)

- Market Ethiopia. Signed in throughout the story.
- Shown to Sellers and Couriers as: Maya T.
- Delivery address: Kazanchis, Addis Ababa. The detail the assigned Courier (or, for Seller Delivery, the Seller) receives is Building 7, Apartment 12. Phone (masked): +251 9•• ••• •12.
- Follows Addis Atelier and Nura Glow, not Volt House.
- Saved discovery area: Kazanchis. See Buyer Home channels for what each channel shows her.
- Recent searches: "linen", "lip tint". Zero-result example query: "tripod".
- Carts: empty at 10:25. Her carts were checked out at 10:05 (Addis Atelier), 10:07 (Nura Glow) and 10:15 (Volt House).
- Collections, all private (rule 2.6):
  - `COL-MAYA-SAVED` "Saved" (the default Collection):
    - `PRD-NG-004` Vitamin C Serum;
    - `PRD-VH-002` Compact Power Bank, shown as "Currently unavailable";
    - `SHP-VH-001` Desk setup for small spaces, saved as a whole post.
  - `COL-MAYA-AUTUMN` "Autumn wardrobe":
    - `PRD-AA-001` Linen Overshirt;
    - `PRD-AA-002` Wide-Leg Trousers;
    - `SHP-AA-001` Autumn Layers, saved as a whole post.
  - `COL-MAYA-SKINCARE` "Skincare routine":
    - `PRD-NG-001` Hydrating Face Cream;
    - `PRD-NG-003` Gentle Cleanser;
    - `SHP-NG-001` Morning routine in three steps, saved as a whole post.

**Delegated recipient for `ADU-24092` only:** Liya Tesfaye, Maya's sister.

- Phone (masked): +251 9•• ••• •47.
- Authorized by Maya at 12:10 on 2 October (Flow H).
- Shown to the Courier as: Liya T. (authorized recipient).
- She receives the package only. Ownership, Claim, refund, Review and account rights stay with Maya (rule 10.2).

**Guest state (prototype-only)**

- Outside the story, the Buyer app can be viewed as a guest (rules 3.1–3.12). A guest has no Buyer data: no Orders, Collections, conversations or notifications.
- For You, Discounts and Locally Made show a guest the Guest/default discovery ranking. For deterministic prototype purposes, it uses the same canonical content records, in the same order, as Maya's lists under Buyer Home channels. It isn't Maya's personalized feed and is never described or modelled as one.
- Nearby shows the list for the area the guest chooses manually; a guest has no saved area, and no live GPS is used (rule 2.14). Following needs sign-in (rule 3.8).
- Report submission needs sign-in (rule 3.7).
- A guest's temporary prototype Cart is transient session state, not a canonical record or Seller Order. It needs no Order record in this dataset (rule 3.12).
- Signing in (phone number → Continue → 6-digit OTP) shows Maya's signed-in state. A guest's temporary Cart is preserved through sign-in and revalidated before Checkout continues (rules 3.10–3.11). Maya's canonical carts are empty at 10:25, so it's her only cart content.

### Buyer Home channels

Maya's Home opens on For You, the default channel (rule 2.3). Each channel has its own source and a fixed demo order, so every surface shows the same content. The lists are as at 10:25, with later changes noted. Only For You is limited to Shoppable Posts (rules 2.1–2.2). Product Posts are the primary content of Discounts and Locally Made (rules 2.11–2.12). Guest access (rules 2.14 and 3.6–3.8): For You, Discounts and Locally Made are public, as the Guest/default discovery ranking (see Guest state under Buyer); Nearby is public once an area is chosen manually; Following needs sign-in.

**For You** (eligible Shoppable Posts only, as top-level feed units; rules 2.1 and 1.7)

- Order: `SHP-AA-001` first (Flow C), then the other eligible posts in turn by Seller (Nura Glow, Volt House, Addis Atelier), each Seller's in ID order: `SHP-AA-001`, `SHP-NG-001`, `SHP-VH-001`, `SHP-AA-002`, `SHP-NG-002`, `SHP-VH-002`, `SHP-AA-003`, `SHP-NG-003`, `SHP-VH-003`, `SHP-NG-004`, `SHP-VH-004`.
- Not eligible: `SHP-AA-004`, `SHP-AA-005`, `SHP-NG-005` and `SHP-VH-005`.
- `SHP-VH-004` drops out when it's restricted at 11:05 (Flow K). `SHP-AA-006` is added last when it's published at 12:30 (Flow E); `SHP-AA-007` isn't eligible.

**Following** (Sellers Maya explicitly follows: Addis Atelier and Nura Glow; rules 2.7–2.8)

- Their published, publicly eligible Shoppable Posts, in turn by Seller, each Seller's in ID order: `SHP-AA-001`, `SHP-NG-001`, `SHP-AA-002`, `SHP-NG-002`, `SHP-AA-003`, `SHP-NG-003`, `SHP-AA-004`, `SHP-NG-004`, `SHP-AA-005`.
- Following isn't limited by For You eligibility. `SHP-AA-004` (no Products) and `SHP-AA-005` (its Product is out of stock, so it shows no purchase affordances; rule 1.8) appear here, and appearing here doesn't make them FYP eligible. `SHP-NG-005` is a Draft and doesn't appear. A restricted or removed post would drop out.
- After Flow E (12:30), `SHP-AA-006` and then `SHP-AA-007` appear first.

**Nearby** (commerce-relevant; explicit store areas and Maya's discovery area; no live Buyer GPS and no Courier GPS; rules 2.9–2.10)

- Maya's saved discovery area is Kazanchis, the area of her delivery address. She can also select Bole or Megenagna manually.
- Store areas: Addis Atelier, Bole; Nura Glow, Kazanchis; Volt House, Megenagna. All three are in the demo proximity metadata, so all three meet the area criteria; the metadata sets their order. Nile Loom isn't part of Buyer discovery.
- Demo proximity order (explicit demo metadata, not a measured distance):

  | Discovery area | 1st | 2nd | 3rd |
  |---|---|---|---|
  | Kazanchis (Maya's saved area) | Nura Glow | Volt House | Addis Atelier |
  | Bole | Addis Atelier | Nura Glow | Volt House |
  | Megenagna | Volt House | Nura Glow | Addis Atelier |

- Content: each Seller's published, publicly eligible Shoppable Posts that have at least one currently eligible Product, Seller by Seller in proximity order, each Seller's in ID order. For Kazanchis: `SHP-NG-001` to `SHP-NG-004`, then `SHP-VH-001` to `SHP-VH-004`, then `SHP-AA-001` to `SHP-AA-003`.
- Not in Nearby: `SHP-AA-004` and `SHP-VH-005` (no Products), `SHP-AA-005` (its only Product is out of stock) and `SHP-NG-005` (Draft).
- `SHP-VH-004` drops out when it's restricted at 11:05. From 12:30, `SHP-AA-006` follows `SHP-AA-003`; `SHP-AA-007` has no Products and stays out.

**Discounts** (Product Posts with explicit active discount metadata; rule 2.11; see Discounts under Products)

- Order (largest discount first, then the larger ETB saving): `PRD-AA-004` (20%, saves 550.00), `PRD-VH-005` (20%, saves 90.00), `PRD-NG-005` (15%, saves 180.00).

**Locally Made** (Product Posts with explicit approved metadata only; rules 2.12–2.13; see the Locally made column under Products)

- The available Products marked locally made, in ID order: `PRD-AA-001`, `PRD-AA-002`, `PRD-AA-003`, `PRD-AA-004`. Then `PRD-AA-005`, which is out of stock and clearly shows "Currently unavailable".
- `PRD-AA-006` joins after `PRD-AA-004` when it's published at 12:30 (Flow E).
- In the current canonical dataset only Addis Atelier Products are Locally Made. Nothing is inferred from Seller location, Seller name, language, category, nationality or ethnicity.

### Secondary Buyers

Three fictional Buyers support realistic Seller Console lists, Reviews, Insights and Operator cases. They don't replace Maya as the primary Buyer, have no guided flows and never appear in Maya's private data (her Orders, Carts, Collections or conversations). Seller and Courier surfaces show them only by their Buyer-safe display name.

| ID | Name | Shown as | Records |
|---|---|---|---|
| `BUY-SAMUEL-ALEMU` | Samuel Alemu | Samuel A. | Orders `ADU-23952` (Volt House) and `ADU-24041` (Addis Atelier); Reviews `REV-1004` and `REV-1006`; conversation `CNV-SAMUEL-AA` |
| `BUY-SELAM-KEBEDE` | Selam Kebede | Selam K. | Order `ADU-24007` (Nura Glow); Review `REV-1005` |
| `BUY-HANA-GIRMA` | Hana Girma | Hana G. | Order `ADU-24074` (Nile Loom); cases `HMR-1001` and `VER-1001` |

Selam's delivery area is Gerji and Hana's is Arat Kilo, both in Addis Ababa. Samuel collects his Orders in person.

### Courier

**Daniel K.** (`COU-DANIEL-K`)

- Vehicle: motorcycle. Usual area: Bole and Kazanchis.
- At 10:25: Available, with no active delivery.
- "Completed for this Seller" and "Total completed deliveries across Sellers" are separate statistics (rules 7.1–7.2). At 10:25 his total across Sellers is 64.

| Seller | Relationship | Since | Current terms | Completed for this Seller (10:25) |
|---|---|---|---|---|
| Addis Atelier | Approved | 14 April 2026 | ETB 180.00 per delivery | 41 |
| Nura Glow | Approved | 2 June 2026 | ETB 150.00 per delivery | 23 |
| Volt House | Application pending (submitted 30 September 2026) | — | — | 0 |

- During 2 October:
  - `ADU-24091` completes at 14:52: completed for Addis Atelier becomes 42, and the total becomes 65.
  - `ADU-24092` completes at 16:05: completed for Nura Glow becomes 24, and the total becomes 66.
- In Flow F (16:30), Volt House approves the application and sets compensation to ETB 200.00. Its console then shows "Completed for Volt House: 0" and "Total completed deliveries across Sellers: 66". It shows nothing about his other Sellers (rules 7.1–7.3).
- Seller-facing Courier cards (specification §23; rules 7.1–7.3). Completed for that Seller is the primary number, and the total across Sellers is secondary context. No card names another Seller or a private Courier relationship.

  | When | Seller and surface | Card |
  |---|---|---|
  | 13:35 (Flow G) | Addis Atelier, Seller Companion Assign Courier | Daniel K. · Available · 41 completed for your store · 64 total completed deliveries · ETB 180.00 for this delivery |
  | 13:50 (Flow H) | Nura Glow, Seller Companion Assign Courier | Daniel K. · Busy · 23 completed for your store · 64 total completed deliveries · ETB 150.00 for this delivery |
  | 16:30 (Flow F) | Volt House, Seller Console Couriers (newly approved) | Daniel K. · 0 completed for your store · 66 total completed deliveries · ETB 200.00 per delivery |

- His recent history:
  - `ADU-23978` Addis Atelier, 26 September, ETB 180.00;
  - `ADU-23921` Addis Atelier, 19 September, ETB 180.00;
  - `ADU-23864` Nura Glow, 12 September, ETB 150.00.

### Supporting Courier

**Bereket M.** (`COU-BEREKET-M`): supporting Courier, not a Courier showcase experience.

He exists only for historical and Operator demo data: the failed handoff on `ADU-24074` (`HMR-1001`). He has no guided flow and appears only in Nile Loom's records and in that Operator case.

- Vehicle: motorcycle. Usual area: Piassa and Arat Kilo.
- Relationship: approved by Nile Loom since 3 June 2026, at ETB 160.00 per delivery. He has no relationship with the three primary Sellers.
- Completed for Nile Loom: 38. Total completed deliveries across Sellers: 38.
- On 2 October he's Unavailable, has no active delivery and receives no Delivery Offers.

### Seller Orders

All amounts are in ETB. Every Order is Paid by payment-provider confirmation; no Seller or Operator action sets PAID (rules 5.1–5.5). Checkout and Order screens label the payment "Secure payment" and name no provider brand.

| Order | Buyer | Seller | Items | Products | Fulfilment | Surcharge | Total | Paid | Status at 10:25 |
|---|---|---|---|---|---|---|---|---|---|
| `ADU-23864` | Maya | Nura Glow | Gentle Cleanser 150 ml ×1; Lip Tint, Rose ×1 | 1,730.00 | Courier Delivery 150.00 (Daniel K.) | 8.65 | 1,888.65 | 11 Sep 18:20 | Completed 12 Sep |
| `ADU-23921` | Maya | Addis Atelier | Structured Shoulder Bag, Tan ×1 | 3,150.00 | Courier Delivery 180.00 (Daniel K.) | 15.75 | 3,345.75 | 18 Sep 08:50 | Completed 19 Sep |
| `ADU-23952` | Samuel A. | Volt House | Wireless Earbuds, Black ×1 | 3,800.00 | Buyer Collection (free) | 19.00 | 3,819.00 | 22 Sep 12:40 | Completed 22 Sep |
| `ADU-23978` | Maya | Addis Atelier | Wide-Leg Trousers, M, Sand ×1 | 2,100.00 | Courier Delivery 180.00 (Daniel K.) | 10.50 | 2,290.50 | 25 Sep 17:30 | Completed 26 Sep |
| `ADU-24007` | Selam K. | Nura Glow | Gentle Cleanser 150 ml ×1 | 980.00 | Seller Delivery 120.00 | 4.90 | 1,104.90 | 27 Sep 11:00 | Completed 28 Sep |
| `ADU-24041` | Samuel A. | Addis Atelier | Linen Overshirt, L, Olive ×1 | 2,450.00 | Buyer Collection (free) | 12.25 | 2,462.25 | 29 Sep 13:10 | Completed 30 Sep |
| `ADU-24074` | Hana G. | Nile Loom | Woven Cotton Throw, Natural ×1 | 1,800.00 | Courier Delivery 160.00 (Bereket M.) | 9.00 | 1,969.00 | 1 Oct 14:05 | Delivery Handoff not verified; `HMR-1001` open |
| `ADU-24091` | Maya | Addis Atelier | Linen Overshirt, M, Natural ×1 | 2,450.00 | Courier Delivery 180.00 | 12.25 | 2,642.25 | 2 Oct 10:05 | Paid |
| `ADU-24092` | Maya | Nura Glow | Hydrating Face Cream 50 ml ×1 | 1,350.00 | Courier Delivery 150.00 | 6.75 | 1,506.75 | 2 Oct 10:07 | Preparing |
| `ADU-24093` | Maya | Volt House | Phone Stand, Grey ×1 | 650.00 | Seller Delivery 100.00 | 3.25 | 753.25 | 2 Oct 10:15 | Paid |

`ADU-24091` is the specification's checkout example: Products 2,450.00, Courier Delivery 180.00, surcharge 12.25, Total 2,642.25.

Payment references: every Order except `ADU-24092` was paid on its first attempt, so its reference is `PAY-<order number>-01` (for example `PAY-24091-01` for `ADU-24091`). `ADU-24092` took two attempts:

| Attempt | Order | Time | Status |
|---|---|---|---|
| `PAY-24092-01` | `ADU-24092` | 2 Oct 10:06 | Failed (transient) |
| `PAY-24092-02` | `ADU-24092` | 2 Oct 10:07 | Paid: provider/backend confirmation |

The failed attempt demonstrates transient payment behaviour. It doesn't create a second Seller Order (rule 5.9), and `ADU-24092` is Paid at 10:07. A payment reference records the provider/backend confirmation context. It isn't a Seller confirmation, and it isn't Buyer proof of payment (rules 5.1–5.4).

Preparation deadlines are fictional record-specific demo timestamps. They don't establish Adulis-wide preparation or Claim SLA policy:

| Order | Prepare by | Met |
|---|---|---|
| `ADU-24091` | 2 Oct 16:00 | Ready for Courier at 13:30 |
| `ADU-24092` | 2 Oct 16:00 | Ready for Courier at 13:45 |
| `ADU-24093` | 2 Oct 18:00 | Ready for Seller Delivery at 16:00 |

State histories (rules 4.4–4.7). Each Order passes only through its own fulfilment mode's states. Times are EAT; a state shown without a time happened but isn't timed in this dataset. QR is primary and OTP is the fallback (rules 8.1–8.10); location checkpoints apply to Courier Delivery only (rule 9.6).

- `ADU-23864` (Courier Delivery): Paid 11 Sep 18:20 → Preparing → Ready for Courier → Courier Assigned → Pickup Verified 12 Sep 10:55 → Out for Delivery → Delivery Handoff → Completed 11:40. QR at pickup and at delivery; both locations recorded.
- `ADU-23921` (Courier Delivery): Paid 18 Sep 08:50 → Preparing → Ready for Courier → Courier Assigned → Pickup Verified 19 Sep 11:20 → Out for Delivery → Delivery Handoff → Completed 12:10. Pickup by QR, location recorded. Maya's camera permission was off, so the delivery QR scan failed and the handoff was verified by OTP fallback; delivery location recorded.
- `ADU-23952` (Buyer Collection): Paid 22 Sep 12:40 → Preparing → Ready for Collection 15:00 → Collection Handoff → Completed 17:30. At the Megenagna shop, Volt House (Ermias B.) displays the Collection QR and Samuel A. scans it.
- `ADU-23978` (Courier Delivery): Paid 25 Sep 17:30 → Preparing → Ready for Courier → Courier Assigned → Pickup Verified 26 Sep 10:35 → Out for Delivery → Delivery Handoff → Completed 11:20. QR at pickup and at delivery. The delivery location was unavailable, but the handoff remains verified (rule 9.5).
- `ADU-24007` (Seller Delivery): Paid 27 Sep 11:00 → Preparing → Ready for Seller Delivery 15:30 → Out for Seller Delivery 28 Sep 10:30 → Delivery Handoff → Completed 11:15. Nura Glow (Nardos A.) displays the Delivery QR and Selam K. scans it.
- `ADU-24041` (Buyer Collection): Paid 29 Sep 13:10 → Preparing → Ready for Collection 30 Sep 11:00 → Collection Handoff → Completed 16:20. At the Bole studio, Addis Atelier (Abel T.) displays the Collection QR and Samuel A. scans it.
- `ADU-24074` (Courier Delivery): Paid 1 Oct 14:05 → Preparing → Ready for Courier 17:20 → Courier Assigned 17:28 → Pickup Verified 17:55 → Out for Delivery 17:56 → Delivery Handoff 19:40, not verified. It stays at Delivery Handoff while `HMR-1001` is open (see Operator queues at 10:25).
- `ADU-24091` (Courier Delivery): Paid 2 Oct 10:05 → Preparing 10:40 → Ready for Courier 13:30 → Courier Assigned 13:37 → Pickup Verified 14:14 → Out for Delivery 14:16 → Delivery Handoff 14:48 → Completed 14:52.
- `ADU-24092` (Courier Delivery): Paid 2 Oct 10:07 → Preparing 10:20 → Ready for Courier 13:45 → Courier Assigned 14:58 → Pickup Verified 15:24 → Out for Delivery 15:26 → Delivery Handoff → Completed 16:05. Liya Tesfaye, the authorized recipient, scans the Delivery QR.
- `ADU-24093` (Seller Delivery): Paid 2 Oct 10:15 → Preparing 11:30 → Ready for Seller Delivery 16:00 → Out for Seller Delivery 16:40 → Delivery Handoff 17:03 → Completed 17:05. Volt House (Ermias B.) displays the Delivery QR at Maya's address and she scans it.

Reviews and Claims by Order:

- `ADU-23864`: `REV-1001`; `CLM-1001` (Resolved).
- `ADU-23921`: `REV-1002`.
- `ADU-23952`: `REV-1004`.
- `ADU-23978`: eligible for review but not reviewed; `CLM-1002` is Open at 10:25.
- `ADU-24007`: `REV-1005`.
- `ADU-24041`: `REV-1006`.
- `ADU-24074`: not completed, so not eligible for review (rule 11.1).
- `ADU-24091`: `REV-1003`, written in Flow I.
- `ADU-24092`: eligible for review from 16:05. The review right is Maya's, not Liya's.
- `ADU-24093`: eligible for review from 17:05; not reviewed.

### Claims

| Claim | Order | Buyer → Seller | Product | Issue | Submitted | Status at 10:25 |
|---|---|---|---|---|---|---|
| `CLM-1001` | `ADU-23864` | Maya → Nura Glow | Lip Tint, Rose | Item damaged: "The Lip Tint cap was cracked when it arrived." Evidence: 1 photo. | 12 Sep 13:05 | Resolved 14 Sep 10:30: Nura Glow provided a replacement Lip Tint. |
| `CLM-1002` | `ADU-23978` | Maya → Addis Atelier | Wide-Leg Trousers, M, Sand | Item not as described: "The trousers are much darker than the Sand colour shown in the photos." Evidence: 2 photos. | 2 Oct 09:12 | Open, unassigned in the Operator Claims queue |

In Flow J, `CLM-1002` goes through Founder dual review. No payment fact changes.

1. At 10:50 the COO/CTO claims the work item, and the Claim moves to Under Review.
2. At 11:20 the COO/CTO proposes `DEC-1001`: "Resolve CLM-1002 in the Buyer's favour: Addis Atelier exchanges the trousers for the colour shown in the listing."
3. At 11:45 the CEO approves, and the Claim is Resolved.

The replacement in `CLM-1001` and the exchange in `CLM-1002` are outcomes of these fictional demo cases only. They don't establish universal Adulis replacement, refund or exchange policy.

Seller response deadline for `CLM-1002`: 3 October 2026, 12:00. It's a fictional record-specific demo timestamp and doesn't establish Adulis-wide preparation or Claim SLA policy. The Claim is resolved earlier, at 11:45 on 2 October (Flow J).

### Reviews

| Review | Order | Buyer | Seller Service | Product Quality | Text | Date |
|---|---|---|---|---|---|---|
| `REV-1001` | `ADU-23864` (Nura Glow) | Maya | 5 | Gentle Cleanser 5; Lip Tint 4 | "Gentle on my skin. The tint arrived with a cracked cap, but Nura Glow sorted it quickly." | 15 Sep 2026 |
| `REV-1002` | `ADU-23921` (Addis Atelier) | Maya | 5 | Structured Shoulder Bag 5 | "Beautifully finished, and it really does fit my laptop." | 20 Sep 2026 |
| `REV-1003` | `ADU-24091` (Addis Atelier) | Maya | 5 | Linen Overshirt 5 | "Lovely fabric and the fit is spot on." | 2 Oct 2026 17:20, written in Flow I |
| `REV-1004` | `ADU-23952` (Volt House) | Samuel A. | 5 | Wireless Earbuds 4 | "Good sound for the price, and collecting at the Megenagna shop was quick." | 23 Sep 2026 |
| `REV-1005` | `ADU-24007` (Nura Glow) | Selam K. | 5 | Gentle Cleanser 5 | "Low-foam and gentle. It arrived the next morning." | 29 Sep 2026 |
| `REV-1006` | `ADU-24041` (Addis Atelier) | Samuel A. | 5 | Linen Overshirt 5 | "Great fit, and picking it up from the Bole studio was easy." | 1 Oct 2026 |

The Seller and Product totals above include every review except `REV-1003`. Once `REV-1003` is written, the rating counts for Addis Atelier (97) and the Linen Overshirt (37) each rise by one; the rounded averages stay the same. Other reviewers are counted in the totals but not named.

### Conversations

There is one ongoing conversation per Buyer and Seller in the Market (rule 12.1), and each message keeps the context it was sent with (rule 12.3). Buyers see replies from the Seller; the Seller's own surfaces show which team member replied.

**`CNV-MAYA-AA`** (Maya ↔ Addis Atelier)

| When | From | Context | Message |
|---|---|---|---|
| 17 Sep 19:10 | Maya | Product Post: Structured Shoulder Bag | "Is the bag big enough for a 13-inch laptop?" |
| 17 Sep 19:32 | Addis Atelier (Abel T.) | Product Post: Structured Shoulder Bag | "Yes, it fits most 13-inch laptops. The inner width is 34 cm." |
| 24 Sep 20:05 | Maya | Shoppable Post: Autumn Layers | "Which trousers are in the Autumn Layers post?" |
| 24 Sep 20:20 | Addis Atelier (Hiwot H.) | Shoppable Post: Autumn Layers | "Those are our Wide-Leg Trousers in Sand. They're tagged in the post." |
| 2 Oct 10:12 | Maya | Order ADU-24091 | "Hi! I'll be home in Kazanchis after 2 PM today." |
| 2 Oct 10:41 | Addis Atelier (Abel T.) | Order ADU-24091 | "Thanks, Maya. We've started preparing your overshirt." |
| 2 Oct 11:35 | Maya, to the chatbot | Product Post: Linen Overshirt | "Does the Linen Overshirt come in navy?" There is no approved answer, so Maya chooses Talk to Seller (Flow L). |
| 2 Oct 11:48 | Addis Atelier (Abel T.) | Product Post: Linen Overshirt | "Not at the moment. We'll let you know if we add navy." |

**`CNV-MAYA-NG`** (Maya ↔ Nura Glow)

| When | From | Context | Message |
|---|---|---|---|
| 12 Sep 13:10 | Maya | Order ADU-23864 | "The Lip Tint cap was cracked when it arrived. I've opened a claim." |
| 12 Sep 13:20 | Nura Glow (Nardos A.) | Order ADU-23864 | "So sorry, Maya. We'll make it right." |
| 2 Oct 12:15 | Maya | Order ADU-24092 | "My sister Liya will receive this order." |
| 2 Oct 12:22 | Nura Glow (Nardos A.) | Order ADU-24092 | "Thank you, we'll keep that in mind." |

The message about Liya is coordination only. The authorization itself is the delegated-recipient record on `ADU-24092` (rule 12.4). Maya has no conversation with Volt House.

**`CNV-SAMUEL-AA`** (Samuel A. ↔ Addis Atelier)

| When | From | Context | Message |
|---|---|---|---|
| 29 Sep 13:25 | Samuel A. | Order ADU-24041 | "Can I collect tomorrow afternoon?" |
| 29 Sep 13:40 | Addis Atelier (Abel T.) | Order ADU-24041 | "Yes, it will be ready from 11:00. The studio is open until 18:00." |

**Context selector options** (rules 12.5–12.6), at 10:25:

- `CNV-MAYA-AA`: General / Seller; Product Posts `PRD-AA-001` to `PRD-AA-005`; Shoppable Posts `SHP-AA-001` to `SHP-AA-005`; Orders `ADU-23921`, `ADU-23978` and `ADU-24091`. `PRD-AA-006`, `SHP-AA-006` and `SHP-AA-007` join after 12:30 (Flow E).
- `CNV-MAYA-NG`: General / Seller; Product Posts `PRD-NG-001` to `PRD-NG-005`; Shoppable Posts `SHP-NG-001` to `SHP-NG-004` (`SHP-NG-005` is a Draft); Orders `ADU-23864` and `ADU-24092`.
- `CNV-SAMUEL-AA`, on Samuel A.'s side: General / Seller; the same Addis Atelier Product Posts and Shoppable Posts; Order `ADU-24041` only.

**Addis Atelier chatbot (Automation)**

- Configured answers:
  - Collection hours: "Our Bole studio is open Monday to Saturday, 10:00–18:00."
  - Sizing: "Each Product Post has a size guide. Send us your measurements and we'll help."
  - Linen care: "Hand wash linen cold and dry it flat."
- Unmatched question: "Does the Linen Overshirt come in navy?" (2 Oct 11:35, escalated to the Seller).

### Moderation

**`MOD-1001`**: a report on `SHP-VH-004` "Fast charging, explained" (Volt House), on the revision published 28 September 2026.

- Maya reports it at 09:40 on 2 October. Reason: Misleading or inaccurate product information (a report category, specification §7).
- At 10:25 the case is Open in the Moderation queue. The post is still published and eligible for For You.
- In Flow K, at 11:05, the COO/CTO opens the case and chooses Restrict.
  - `SHP-VH-004` disappears from For You, Search and the Volt House Storefront.
  - It shows as Restricted in Volt House's Seller Console.
  - `PRD-VH-004` itself is unaffected.

### Operators

- Founder, CEO (`OPR-CEO`) and Founder, COO/CTO (`OPR-COO-CTO`). The approved specification doesn't name them.
- `DEC-1001` (Flow J) is proposed by the COO/CTO and approved by the CEO. See `CLM-1002`.

**`SCV-1001`** (Solo Coverage governance scenario; prototype governance data). A historical governance snapshot outside the 2 October timeline, like the Volt House pre-publication snapshot: both Founders are active on 2 October. It uses roles only, with no personal Founder names.

- Actor: Founder, CEO role (`OPR-CEO`). Other Founder: Founder, COO/CTO role (`OPR-COO-CTO`).
- Reason: "COO/CTO unavailable".
- Activated: Monday 21 September 2026, 09:00 EAT, after fresh strong reauthentication.
- Expected duration: 3 days (the selected option). Expected return and expiry: Thursday 24 September 2026, 09:00 EAT.
- Replay snapshot: Tuesday 22 September 2026, 10:00 EAT, with the SOLO COVERAGE ACTIVE banner and the audit warning showing (specification §50).
- At 09:00 on 24 September it became inactive automatically, and normal dual review resumed (rules 16.6–16.7). No consequential action was pending, and there was no extension and no early stop.
- Audit records (specification §49):

  | Timestamp | Actor | Action | Target | Reason | Result |
  |---|---|---|---|---|---|
  | 21 Sep 2026 09:00 | CEO | Solo Coverage activated, expected duration 3 days | `SCV-1001` | COO/CTO unavailable | Succeeded |
  | 24 Sep 2026 09:00 | System | Solo Coverage expired | `SCV-1001` | Expected duration reached | Succeeded |

### Operator queues at 10:25

Every Operator queue holds at least one canonical record at the default snapshot:

| Queue | Record | State at 10:25 |
|---|---|---|
| Claims | `CLM-1002` | Open, unassigned (Flow J resolves it) |
| Moderation | `MOD-1001` | Open (Flow K restricts the post) |
| Support | `SUP-1001` | Open, unassigned |
| Verification / Recovery | `VER-1001` | Open, unassigned |
| Trust Appeals | `TAP-1001` | Open, unassigned |
| Handoff Manual Review | `HMR-1001` | Open, unassigned |

**`SUP-1001`** (Support): Volt House asks how to complete a Seller Delivery handoff.

- Raised at 10:18 on 2 October by Volt House (Ermias B.) about `ADU-24093` (Maya T., Seller Delivery): "This is our first Seller Delivery order. How do we complete the handoff with the Buyer?"
- At 11:00 the COO/CTO replies with the Seller Delivery steps: the Seller displays the Delivery QR, the Buyer scans it, and OTP is the fallback (rules 8.8 and 8.10). The case is Resolved. No Order fact changes.

**`VER-1001`** (Verification / Recovery): phone/account recovery for Hana G.

- Submitted at 08:40 on 2 October: "I changed my phone number and can't receive codes on the old one. Please move my account to my new number."
- Evidence: her account history, including `ADU-24074`. No identity documents are requested (specification §45).
- Open, unassigned at 10:25. No guided flow resolves it. It explains the failed OTP codes in `HMR-1001`.

**`TAP-1001`** (Trust Appeal): Nile Loom appeals its REBUILDING level.

- Submitted by Nile Loom at 15:20 on 29 September 2026.
- Current Trust Level: REBUILDING, since 16 September 2026. Trust history: NEW (February 2026) → ESTABLISHED (May 2026) → REBUILDING (16 September 2026).
- Evidence summary (1 July – 31 August 2026): 52 Paid Orders; 7 upheld Claims (5 item not as described, 2 item damaged); fulfilment reliability 84%. These Claims are counted here but not modelled individually in this dataset.
- Policy version: Trust policy v3 (a demo value).
- Appeal reason: "Five of the seven upheld Claims came from one supplier batch of throws that was mislabelled as 100% cotton. We recalled the batch on 10 September and ask that these Claims be reviewed as one incident."
- Open, unassigned at 10:25. No guided flow resolves it. Operators can't type a Trust Level; any change has to come from re-evaluated evidence (rules 14.2–14.4).

**`HMR-1001`** (Handoff Manual Review): the failed final handoff on `ADU-24074`.

- Order `ADU-24074`: Nile Loom → Hana G., Courier Delivery by Bereket M. Daniel K. isn't involved.
- Assignment: Nile Loom marked the Order Ready for Courier at 17:20 on 1 October. The Delivery Offer went to Bereket M. at 17:25, and he accepted at 17:28.
- Pickup evidence: Pickup Verified at 17:55 by QR; pickup location recorded.
- Delivery attempt at 19:40: the QR scan failed because the recipient's phone camera wasn't working.
- OTP attempts: three codes sent to the registered number between 19:42 and 19:50. None arrived, because the number is no longer in use (see `VER-1001`).
- Checkpoint evidence: no delivery checkpoint, because the handoff wasn't verified.
- Escalated by Bereket M. at 19:55: "Recipient present; QR and OTP both failed."
- Open, unassigned at 10:25 on 2 October. The Order stays at Delivery Handoff, unverified. Approving Manual Verification, rejecting or escalating needs a reason, an audit record and approval where appropriate (rule 8.5; specification §46). No guided flow resolves it.

### Story timeline

All times are EAT. 10:25 on 2 October is the **default canonical demo snapshot**: every surface shows that state when it's opened outside a guided flow. Guided flows may intentionally show states before or after it, as documented here. Flows marked *replay* show how a record created before 10:25 came about. The other flows move the story forward from 10:25 in the order below, so each one's state includes everything earlier in the day (Flow F at 16:30, for example, comes after Flows G and H).

**Before 2 October 2026**

- January 2026: Nura Glow joins (NEW). It becomes ESTABLISHED in April and TRUSTED on 15 August.
- February 2026: Nile Loom joins (NEW). It becomes ESTABLISHED in May.
- March 2026: Addis Atelier joins (NEW). It becomes ESTABLISHED on 1 August.
- 14 April: Addis Atelier approves Daniel K. Nura Glow approves him on 2 June.
- 3 June: Nile Loom approves Bereket M.
- 9 September: Volt House sets up its Store (the Pre-publication Setup Snapshot).
- 10 September: Volt House is admitted (NEW) and publishes its Store.
- 11–15 September:
  - `ADU-23864` is paid on 11 Sep and delivered on 12 Sep.
  - `CLM-1001` is submitted on 12 Sep and resolved on 14 Sep.
  - `REV-1001` is written on 15 Sep.
- 16 September: Nile Loom moves to REBUILDING.
- 17–20 September:
  - On 17 Sep Maya asks about the bag in `CNV-MAYA-AA`.
  - `ADU-23921` is paid on 18 Sep and delivered on 19 Sep by OTP fallback.
  - `REV-1002` is written on 20 Sep.
- 21 September: The CEO activates Solo Coverage (`SCV-1001`) at 09:00, with an expected duration of 3 days.
- 22 September: Samuel A. pays for `ADU-23952` (Volt House) and collects it the same day.
- 23 September: `REV-1004` is written.
- 24 September: `SCV-1001` expires at 09:00 and normal dual review resumes. `PRD-AA-005` sells out. Maya asks about Autumn Layers in `CNV-MAYA-AA`.
- 25–26 September: `ADU-23978` is paid on 25 Sep and delivered on 26 Sep; the delivery location was unavailable.
- 27 September: Selam K. pays for `ADU-24007` (Nura Glow).
- 28 September: Nura Glow delivers `ADU-24007` by Seller Delivery. `SHP-VH-004` is published.
- 29 September:
  - `REV-1005` is written.
  - Samuel A. pays for `ADU-24041` (Addis Atelier) and asks about collection in `CNV-SAMUEL-AA`.
  - Nile Loom submits `TAP-1001`.
- 30 September: Samuel A. collects `ADU-24041`. Daniel K. applies to Volt House.
- 1 October:
  - `REV-1006` is written.
  - Hana G. pays for `ADU-24074` (Nile Loom) at 14:05. Its final handoff fails at 19:40, and Bereket M. escalates it to `HMR-1001` at 19:55.

**Friday 2 October 2026**

| Time | Event | Flow |
|---|---|---|
| 08:40 | Hana G. submits `VER-1001` (phone/account recovery) | |
| 09:12 | Maya submits `CLM-1002` on `ADU-23978` | J (replay) |
| 09:40 | Maya reports `SHP-VH-004`, opening `MOD-1001` | K (replay) |
| 10:05 | `ADU-24091` paid (Addis Atelier) | C, D (replay) |
| 10:06 | The first payment attempt for `ADU-24092`, `PAY-24092-01`, fails; Maya retries | D (replay) |
| 10:07 | `ADU-24092` paid (Nura Glow) on the retry, `PAY-24092-02` | D (replay) |
| 10:12 | Maya messages Addis Atelier about `ADU-24091` | |
| 10:15 | `ADU-24093` paid (Volt House); Maya found the Phone Stand through Search | |
| 10:18 | Volt House opens `SUP-1001` about `ADU-24093` | |
| 10:20 | Nura Glow starts preparing `ADU-24092` | |
| **10:25** | **Default snapshot** | |
| 10:40 | Addis Atelier (Abel T.) starts preparing `ADU-24091`, and replies to Maya at 10:41 | G |
| 10:50 | COO/CTO claims `CLM-1002`, which moves to Under Review | J |
| 11:00 | COO/CTO answers `SUP-1001`, which is Resolved | |
| 11:05 | COO/CTO restricts `SHP-VH-004` (`MOD-1001`) | K |
| 11:20 | COO/CTO proposes `DEC-1001` | J |
| 11:30 | Volt House starts preparing `ADU-24093` | |
| 11:35 | Maya asks the Addis Atelier chatbot about navy and escalates to the Seller | L |
| 11:45 | CEO approves `DEC-1001`; `CLM-1002` is Resolved | J |
| 11:48 | Addis Atelier replies from the Seller Companion Inbox | L |
| 12:10 | Maya authorizes Liya Tesfaye to receive `ADU-24092` | H |
| 12:30 | Addis Atelier (Hiwot H.) publishes `PRD-AA-006`, `SHP-AA-006` and `SHP-AA-007` | E |
| 13:30 | Addis Atelier marks `ADU-24091` Ready for Courier | G |
| 13:35 | Delivery Offer for `ADU-24091` to Daniel K. (ETB 180.00); he accepts at 13:37 and is Courier Assigned | G |
| 13:45 | Nura Glow marks `ADU-24092` Ready for Courier | H |
| 13:50 | Delivery Offer for `ADU-24092` to Daniel K. (ETB 150.00); he can't accept it while `ADU-24091` is active (rule 6.3) | H |
| 14:14 | Daniel scans Addis Atelier's Pickup QR: Pickup Verified, pickup location recorded ("Pickup confirmed — 2:14 PM") | G |
| 14:16 | Out for Delivery | G |
| 14:48 | Daniel opens Delivery Handoff and displays the Delivery QR | G |
| 14:52 | Maya scans it: Delivery Verified, delivery location recorded, Order Completed | G |
| 14:58 | Daniel accepts the `ADU-24092` offer and is Courier Assigned | H |
| 15:24 | Pickup Verified for `ADU-24092`; the pickup location is unavailable, but the verification stands (rule 9.5) | H |
| 15:26 | Out for Delivery | H |
| 16:00 | Volt House marks `ADU-24093` Ready for Seller Delivery | |
| 16:05 | Liya scans Daniel's Delivery QR: Delivery Verified, delivery location recorded, Order Completed | H |
| 16:30 | Volt House (Ermias B.) approves Daniel K. and sets compensation to ETB 200.00 | F |
| 16:40 | Volt House (Ermias B.) sets out with `ADU-24093`: Out for Seller Delivery | |
| 17:03 | Volt House (Ermias B.) opens Delivery Handoff for `ADU-24093` and displays the Delivery QR at Maya's address | |
| 17:05 | Maya scans it: Delivery Verified, Order Completed; no location checkpoint (rule 9.6) | |
| 17:20 | Maya reviews `ADU-24091` (`REV-1003`) | I |

### Records created during the demo

- `PRD-AA-006` Linen Midi Skirt (Flow E).
  - Price: ETB 1,950.00.
  - Variants: Size S/M/L/XL; Colour Natural.
  - Stock: 10. Available.
  - Made in Addis Ababa. Locally made: Yes.
- `SHP-AA-006` "Weekend in linen" (Flow E).
  - Tags `PRD-AA-006` and `PRD-AA-001`, with 2 hotspots.
  - Published and eligible for For You.
  - Caption: "A weekend in linen: the new midi skirt with our overshirt."
- `SHP-AA-007` "Fabric swatches" (Flow E, zero-product path).
  - No Products.
  - Published, but not eligible for For You.
  - Caption: "This season's linen swatches, straight from the studio."
- `REV-1003` and `DEC-1001`: see Reviews and Claims.

### Demo flows and the records they use

| Flow | Records |
|---|---|
| A — Seller acquisition | No canonical records; the waitlist form is filled in live. |
| B — Social entry | Addis Atelier Storefront → `PRD-AA-001` Linen Overshirt → Open in Adulis → Buyer Product Detail for `PRD-AA-001` |
| C — Discovery to purchase | `SHP-AA-001` → hotspot `PRD-AA-001` → Size M, Natural → Courier Delivery → `ADU-24091` (ETB 2,642.25) |
| D — Multi-Seller cart | Carts: Addis Atelier (`PRD-AA-001` ×1) and Nura Glow (`PRD-NG-001` ×1) → `ADU-24091` and `ADU-24092`; Nura Glow's first payment attempt `PAY-24092-01` fails and the retry `PAY-24092-02` succeeds |
| E — Seller content | Addis Atelier creates `PRD-AA-006`, `SHP-AA-006` and `SHP-AA-007` |
| F — Courier pool | Volt House approves `COU-DANIEL-K`; compensation ETB 200.00 |
| G — Fulfilment | `ADU-24091`: Addis Atelier → Daniel K. → Maya |
| H — Delegated recipient | `ADU-24092`: Nura Glow → Daniel K. → Liya Tesfaye |
| I — Review | `REV-1003` on `ADU-24091` |
| J — Claim | `CLM-1002` on `ADU-23978` → `DEC-1001` |
| K — Moderation | `MOD-1001` on `SHP-VH-004` |
| L — Chatbot escalation | Question on `PRD-AA-001` → `CNV-MAYA-AA` → Addis Atelier Seller Companion Inbox |

These mappings are exact. No individual screen may substitute a different Seller, Product, Order, Courier, Claim or Buyer without a documented scenario reason.

### Notifications

Notifications are generated from the events above. They don't create facts of their own (specification §54).

- **Maya:**
  - Order Paid: `ADU-24091`, `ADU-24092`, `ADU-24093`.
  - `ADU-24091` Ready for Courier (13:30), then Courier Assigned (13:37).
  - `ADU-24092` Ready for Courier (13:45), then Courier Assigned (14:58).
  - Delivery action for `ADU-24091`, "Courier is ready to complete delivery" (14:48).
  - `ADU-24093` Ready for Seller Delivery (16:00), then a Delivery action, "Volt House is ready to complete delivery" (17:03).
  - Claim status: `CLM-1002` Under Review (10:50), then Resolved (11:45).
  - Review reminder for `ADU-23978`.
- **Addis Atelier:**
  - Claim `CLM-1002` (09:12).
  - New Paid Order `ADU-24091` (10:05).
  - Buyer message (10:12).
  - Low stock, `PRD-AA-003` (2 left).
  - Pickup verified, `ADU-24091` (14:14).
- **Nura Glow:**
  - New Paid Order `ADU-24092` (10:07).
  - Courier offer/assignment issue (13:50): Daniel K. can't accept the offer while he has an active delivery (rule 6.3).
  - Pickup verified, `ADU-24092` (15:24).
- **Volt House:**
  - New Paid Order `ADU-24093` (10:15).
- **Daniel K.:**
  - Delivery Offers for `ADU-24091` (13:35) and `ADU-24092` (13:50).
  - Application approved by Volt House (16:30).

### Insights

Deterministic Insights figures (specification §34) for the three primary Sellers, covering the 7 days to 10:25 on 2 October. Screens show these figures and don't compute their own.

- Counts include Orders by Buyers who aren't modelled individually. Every modelled Order in the window is included: Addis Atelier `ADU-23978`, `ADU-24041` and `ADU-24091`; Nura Glow `ADU-24007` and `ADU-24092`; Volt House `ADU-24093`.
- Shoppable qualified impressions are the sum of the post impressions below. Product-tag CTR is tag clicks divided by the impressions of posts with purchasable tags.
- Product-level figures are under Products (Product performance, 7 days).

| Metric | Addis Atelier | Nura Glow | Volt House |
|---|---|---|---|
| Paid Orders | 6 | 18 | 3 |
| Completed Orders | 5 | 17 | 2 |
| GMV (Product value of Paid Orders) | ETB 14,650.00 | ETB 21,840.00 | ETB 5,900.00 |
| Product views | 1,180 | 2,960 | 420 |
| Shoppable qualified impressions | 10,050 | 18,400 | 3,940 |
| Product-tag CTR | 5.1% | 6.2% | 5.3% |
| Storefront visits | 640 | 1,120 | 180 |
| Claims | 1 | 0 | 0 |
| Cancellation rate | 0% | 0% | 0% |
| Response reliability | 96% | 98% | 92% |
| Fulfilment reliability | 98% | 99% | 100% |

Content performance, Addis Atelier:

| Shoppable Post | Impressions | Saves | Tag clicks | Product views | Checkout starts | Paid Orders influenced |
|---|---|---|---|---|---|---|
| `SHP-AA-001` Autumn Layers | 4,210 | 318 | 262 | 214 | 19 | 4 |
| `SHP-AA-002` Linen, three ways | 2,480 | 141 | 96 | 77 | 6 | 1 |
| `SHP-AA-003` Desk to dinner | 2,010 | 120 | 88 | 70 | 5 | 1 |
| `SHP-AA-004` Inside the Bole studio | 1,140 | 64 | — | — | — | — |
| `SHP-AA-005` Belt detail | 210 | 9 | — | — | — | — |

Content performance, Nura Glow (`SHP-NG-005` is a Draft and has no figures):

| Shoppable Post | Impressions | Saves | Tag clicks | Product views | Checkout starts | Paid Orders influenced |
|---|---|---|---|---|---|---|
| `SHP-NG-001` Morning routine in three steps | 6,400 | 520 | 410 | 340 | 22 | 6 |
| `SHP-NG-002` Find your Lip Tint shade | 5,100 | 410 | 330 | 270 | 18 | 5 |
| `SHP-NG-003` Vitamin C, explained | 3,900 | 260 | 240 | 200 | 9 | 2 |
| `SHP-NG-004` Sunday reset | 3,000 | 190 | 160 | 130 | 6 | 2 |

Content performance, Volt House (`ADU-24093` came from Search, so no post counts it as influenced):

| Shoppable Post | Impressions | Saves | Tag clicks | Product views | Checkout starts | Paid Orders influenced |
|---|---|---|---|---|---|---|
| `SHP-VH-001` Desk setup for small spaces | 1,250 | 64 | 70 | 55 | 4 | 1 |
| `SHP-VH-002` Earbuds for the commute | 980 | 41 | 52 | 44 | 3 | 1 |
| `SHP-VH-003` Which charger do I need? | 760 | 30 | 38 | 30 | 2 | 0 |
| `SHP-VH-004` Fast charging, explained | 640 | 22 | 31 | 25 | 1 | 0 |
| `SHP-VH-005` Unboxing our first shipment | 310 | 8 | — | — | — | — |

### Decisions applied

The eight open decisions in the proposed dataset were resolved on 2026-10-02. They're applied above:

1. **Ready vs Courier Assigned.** For Courier Delivery, the Seller marks Ready before a Courier is offered or assigned the Delivery (rules 6.10–6.11). Specification Flow G is corrected to match.
2. **Multi-cart item counts.** Flow D uses one Product per Seller cart, and the single-item checkout example (`ADU-24091`, ETB 2,642.25) is kept. This is a demo-story choice: a Seller-specific Cart can still hold several Products (specification §14).
3. **Seller Delivery and Buyer Collection handoff.** All three fulfilment modes reach a verified final handoff by QR, with OTP as the fallback (rules 8.7–8.10). Location checkpoints stay specific to Courier Delivery (rule 9.6). `ADU-24093` now completes.
4. **Operator queue records.** `SUP-1001`, `VER-1001`, `TAP-1001` and `HMR-1001`, using the supporting Seller Nile Loom and the supporting Courier Bereket M.
5. **Seller Console pre-publication state.** The Volt House Pre-publication Setup Snapshot.
6. **Other Buyers.** The secondary Buyers Samuel A., Selam K. and Hana G.
7. **Home channels.** Content and ordering for all five channels (see Buyer Home channels).
8. **Missing values.** Insights for all three primary Sellers; handles only for share links; "Secure payment" with `PAY-` references.

Final corrections before approval (2026-10-02): every Order's state history follows its fulfilment mode's timeline (rules 4.4–4.7); Following, Nearby, Discounts and Locally Made follow rules 2.7–2.13; and Seller-facing Courier cards show completed-for-this-Seller first and the total second (specification §23).

Work-order decisions (2026-10-02) added: Store map pins and Settings states for the three primary Sellers; Product performance (7 days); preparation deadlines and the `CLM-1002` response deadline; the failed and retried payment for `ADU-24092`; the guest state; context selector options; the Report category on `MOD-1001`; and the Solo Coverage scenario `SCV-1001`.

Final work-order decisions (2026-10-02) added the Seller Console Home record of Shoppable Posts needing action (`SHP-AA-005` only). The guest state now uses the Guest/default discovery ranking, requires sign-in for Report submission, and keeps a temporary Cart through sign-in as transient session state (rules 3.7 and 3.10–3.12). The values added with the work-order decisions were confirmed without change:

- `SCV-1001`: active from 21 to 24 September 2026, with the replay snapshot at 10:00 on 22 September 2026. It's historical relative to the canonical 2 October 2026 snapshot and needs no personal Founder names.
- Product performance: the Cotton Shirt Dress's one sale at its regular ETB 2,750.00 price, before its current discount became active.
- The deadlines for `ADU-24091`, `ADU-24092`, `ADU-24093` and `CLM-1002`: fictional, record-specific demo timestamps, not Adulis-wide policy.
- The Store map pins: neighborhood-level and fictional, rounded to approximately two decimal places.

No open dataset decisions remain. The 15 primary Product names were approved on 2026-10-02 exactly as listed under Products. No work-order decision is open either (see CORRECTION_WORK_ORDERS.md).

## Revision history

- 2026-10-02: File created as an empty scaffold. No dataset recorded.
- 2026-10-02: Proposed canonical dataset drafted (status PROPOSED), awaiting approval.
- 2026-10-02: All eight open decisions resolved and applied; status set to READY FOR FINAL APPROVAL.
  - Added: the supporting Seller Nile Loom (`SEL-NILE-LOOM`, with `PRD-NL-001`); the supporting Courier Bereket M. (`COU-BEREKET-M`); three secondary Buyers; Orders `ADU-23952`, `ADU-24007`, `ADU-24041` and `ADU-24074`; Reviews `REV-1004` to `REV-1006`; `CNV-SAMUEL-AA`; Operator cases `SUP-1001`, `VER-1001`, `TAP-1001` and `HMR-1001`; the Volt House Pre-publication Setup Snapshot; Buyer Home channel content; active demo discounts; the Locally made flag; payment references; Insights for Nura Glow and Volt House.
  - Changed: `ADU-24093` now completes by Seller Delivery at 17:05. Daniel K.'s total at Flow F (16:30) is corrected from 64 to 66, because Flows G and H complete two deliveries before it. Maya's carts now include the Volt House cart checked out at 10:15.
  - Documented: demo-value disclaimers for Courier Delivery charges, discounts and Claim outcomes; the default canonical demo snapshot; exact Flow A–L mappings.
- 2026-10-02: Final corrections before approval; status unchanged (READY FOR FINAL APPROVAL).
  - Every Order has a state history in its fulfilment mode's timeline (rules 4.4–4.7). `ADU-24093` goes Out for Seller Delivery at 16:40, and `ADU-24007` at 10:30 on 28 September.
  - Nearby shows only posts with at least one currently eligible Product (rule 2.9). `SHP-AA-004`, `SHP-AA-005` and `SHP-VH-005` leave it, and `SHP-AA-007` stays out after Flow E.
  - Following, Discounts and Locally Made wording aligned with rules 2.7–2.8 and 2.11–2.13.
  - Seller-facing Courier card values added for Flows G, H and F.
- 2026-10-02: APPROVED — 2026-10-02, after a final validation pass. The 15 primary Product names were approved exactly as listed under Products; no Product values changed. This is now the authoritative canonical prototype demo dataset.
- 2026-10-02: Work-order decisions recorded; status unchanged (APPROVED).
  - Added: Store map pins and Seller Console Settings states; Product performance (7 days); preparation deadlines and the `CLM-1002` response deadline; payment attempts `PAY-24092-01` (failed) and `PAY-24092-02` (paid); the guest state; context selector options; and the Solo Coverage scenario `SCV-1001` with its audit records.
  - Changed: `MOD-1001`'s reason now uses the report category "Misleading or inaccurate product information". The payment-reference note, the Flow D mapping and the 2 October timeline now include the failed first attempt at 10:06.
- 2026-10-02: Final work-order decisions recorded; status unchanged (APPROVED).
  - Added: the Seller Console Home record of Shoppable Posts needing action (`SHP-AA-005` only).
  - Changed: the guest state uses the Guest/default discovery ranking rather than describing Maya's lists as viewer-independent; Report submission needs sign-in; the temporary Cart survives sign-in as transient session state. The map-pin, deadline and Product performance notes now state the approved terms.
  - Confirmed, with no value changed: `SCV-1001`'s dates, the Cotton Shirt Dress sale at its regular price, the four record-specific deadlines and the map pins.

## Related documents

- [ADULIS_PROTOTYPE_SPEC.md](ADULIS_PROTOTYPE_SPEC.md): the approved master prototype specification.
- [ADULIS_CANONICAL_RULES.md](ADULIS_CANONICAL_RULES.md): the authoritative prototype invariants.
- [CORRECTION_WORK_ORDERS.md](CORRECTION_WORK_ORDERS.md): approved implementation work orders, in execution order.
