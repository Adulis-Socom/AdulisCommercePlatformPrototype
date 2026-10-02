# Adulis Correction Work Orders

**Purpose.** This holds the approved implementation work orders for the prototype, listed in the order they are to be executed. Implement only what an approved work order covers.

**Status.** Execution order approved — 2026-10-02 (WO-001 to WO-011). Bodies drafted on 2026-10-02 from the approved documents, then updated the same day with the approved work-order decisions and the final decisions. APPROVED FOR IMPLEMENTATION: WO-001 to WO-011. PENDING DECISION: none. None is implemented.

## Execution order

`plans/you-are-an-expert-quirky-shell.md` states that each work order is executed sequentially and in full before the next begins.

The work orders below are listed in execution order. The sequence was set on 2026-10-02. It re-orders the original Figma correction list based on what the technical audit found, and puts a new work order, WO-001, first. The request that set the order explains why:

> Notice the new first work order:
>
> Canonical Demo Data Foundation.
>
> We did not have that in the original Figma correction list, because Figma Make was primarily a visual generator.
>
> The audit showed Claude is inheriting a real code problem: demo data is copied across individual files.
>
> So Claude must solve that foundation before populating your Sellers.

Because execution is sequential, a work order that is PENDING DECISION holds back every work order after it until its decisions are recorded. No work order is pending, so execution can start with WO-001 and continue in order.

## Work-order conventions

These apply to every work order below.

**Statuses**

- **APPROVED FOR IMPLEMENTATION:** every requirement derives from the approved documents. It can run once its dependencies are complete.
- **PENDING DECISION:** at least one requirement needs a decision the approved documents don't make. The missing decisions are listed under STATUS. Record each answer in the authoritative document (the rules, the specification or DEMO_DATA.md) first; the work order is then updated and can become APPROVED FOR IMPLEMENTATION.
- No work order is IMPLEMENTED.

**Sources.** Requirements cite their source: **R** with a canonical rule number, **§** with a specification section, **DD** with a DEMO_DATA.md section in italics. Conflicts follow "Document authority and precedence" in ADULIS_CANONICAL_RULES.md. The current code is never a source of requirements. Where WHY THIS WORK ORDER EXISTS mentions what the 2026-10-02 technical audit observed, that's context only.

**Questions.** A point the approved documents don't settle is a question, not a choice for the implementer. Don't implement a guess.

**Standard technical constraints** (from CLAUDE.md):

1. The Figma-generated visual design is the approved baseline. Change rendering only where the work order requires it.
2. Never run `pnpm run format` or `.figma/make/format`.
3. No new dependencies and no configuration changes (package.json, tsconfig.json, vite.config.ts, index.html, .figma/) unless the work order allows them.
4. Keep the class hooks and markup that the media queries in src/index.css select on, unless the work order changes those rules: renaming them silently breaks phone and tablet layouts.
5. Guided-flow targets are untyped strings that each surface maps to a screen; renaming a screen key silently breaks flow steps.
6. Leave the invalid colour values (a CSS variable with a hex alpha suffix) alone unless the work order says otherwise: fixing them changes the approved look.
7. Follow each file's idiom (Tailwind classes or inline styles). TypeScript stays strict.
8. Don't commit unless asked.

**Standard required commands**

- `pnpm exec tsc --noEmit -p tsconfig.json`: type-check; must pass.
- `pnpm run build --outDir <scratch directory> --emptyOutDir`: must pass.
- For browser checks: `FIGMA_DEV_SERVER_HOST=127.0.0.1 pnpm dev`, or `pnpm exec vite preview --outDir <scratch directory> --host 127.0.0.1 --port 4173 --strictPort`.
- `git status --short` and `git diff --stat`: for the completion report.

**Standard completion report**

1. Work order and outcome: completed in full, or stopped, with the reason.
2. Files changed, each with a one-line purpose.
3. Each acceptance criterion with its evidence (command output, screenshot or check result).
4. Type-check and build results.
5. The screens, times and widths checked in the browser.
6. Anything found that the approved documents don't define, listed as questions. Nothing invented.
7. Deviations from the work order, with reasons.
8. Confirmation: formatter not run; no new dependencies or configuration changes; nothing committed.

## Work orders

Each work order below is derived from the approved documents, with sources cited as described in Work-order conventions.

### WO-001 — Canonical Demo Data Foundation

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Make DEMO_DATA.md the prototype's only source of demo facts: one typed, canonical data module that every surface reads, so each Seller, Product, Shoppable Post, Order, Courier, Buyer, Claim and Review presents the same facts everywhere (R18.1–18.2).

**WHY THIS WORK ORDER EXISTS.**

- DEMO_DATA.md is APPROVED (2026-10-02) and is the authority for demo entities and values (Document authority and precedence).
- R18.2 forbids individual screens from keeping their own contradictory copies of canonical entities. The audit found the demo data hard-coded separately in each surface, with conflicting identifiers, statuses, Buyers and totals.
- Every later work order needs one correct, shared source. Populating the Sellers (WO-002) first would copy the problem again.

**DEPENDENCIES.**

- docs/DEMO_DATA.md: APPROVED — 2026-10-02. Satisfied.
- ADULIS_CANONICAL_RULES.md and ADULIS_PROTOTYPE_SPEC.md: both APPROVED.
- No earlier work order.

**IN SCOPE.**

- A canonical data module covering every record in DD:
  - Sellers (including the supporting Seller Nile Loom), with their Store map pins and Seller Console Settings states.
  - Products with discount and Locally made metadata, and the 7-day Product performance figures.
  - Shoppable Posts, with the Seller Console Home record of posts needing action.
  - Buyers (Maya, her delegate Liya, the secondary Buyers) and the guest state.
  - Couriers (Daniel K., Bereket M.).
  - Seller Orders with state histories, payment references, the `ADU-24092` payment attempts and the preparation deadlines.
  - Claims with the `CLM-1002` response deadline, Reviews and Collections.
  - Conversations with their context selector options, and the chatbot.
  - Moderation, Operators, the Solo Coverage scenario `SCV-1001` and the Operator queue cases.
  - Insights, the Buyer Home channel lists, notifications, the Volt House Pre-publication Setup Snapshot, the records created during the demo, and the Story timeline.
- Time-aware state: the 10:25 default snapshot, and the before and after states the Story timeline documents for guided flows (DD *Story timeline*).
- Replacing every hard-coded copy of a canonical fact in existing screens with values read from the module, without changing layout or adding features.
- The exact Flow A–L record mappings (DD *Demo flows and the records they use*).

**OUT OF SCOPE.**

- New screens, channels, states or interactions: those belong to WO-002 to WO-010.
- Copy that isn't a demo fact (marketing text, labels, help text).
- Transient session state, such as a guest's temporary Cart: it isn't canonical data (R3.12).
- Adding, removing or re-sequencing guided-flow steps (§59). Differences found are reported for WO-011.

**IMPLEMENTATION REQUIREMENTS.**

1. One module, or one folder, under src/ is the only place canonical demo facts are defined. Surfaces import from it (R18.2).
2. Identifiers, names, prices, counts, statuses, timestamps and text are exactly as in DD. Identifiers are prototype identifiers, never internal database UUIDs (§5; DD *Conventions*).
3. Money follows DD: amounts are exact to two decimals, and the Adulis surcharge is 0.5% of the Products subtotal, excluding the delivery charge (R5.6–5.8). All 10 Orders reproduce DD's totals.
4. Each Order's state history follows its fulfilment mode's timeline (R4.4–4.7; DD *Seller Orders*). A failed payment attempt belongs to its Order and never creates a second one (R5.9).
5. Surfaces show the 10:25 snapshot by default; a guided-flow step shows the state at that step's documented time (DD *Story timeline*).
6. Supporting records (Nile Loom, Bereket M., the secondary Buyers) appear only where DD places them (DD *Supporting operations-only Seller*, DD *Supporting Courier*, DD *Secondary Buyers*).
7. Where a screen shows a demo fact DD doesn't define, don't invent a replacement: list it in the completion report. DD requires anything missing to be added to DD first, with approval (DD *Canonical dataset*).

**DATA REQUIREMENTS.**

- Source: DD in full. No value from the current code survives unless DD has the same value.
- Derived facts reproduce DD (DD *Sellers*, DD *Courier*, DD *Reviews*, DD *Insights*, DD *Product performance (7 days)*):
  - Seller completed counts: 128, 412 and 9 at 10:25, each rising by one when a later Order completes.
  - Daniel's totals: 64, then 65 at 14:52, then 66 at 16:05.
  - Review counts and Insights figures.
  - Product performance figures that sum to each Seller's Insights.

**VISUAL / UX REQUIREMENTS.**

- Layout, styling and interaction don't change; only the values shown change.
- DD defines no imagery. §62 allows realistic images or placeholders: keep an existing image only where it depicts the record it now illustrates, and show a neutral placeholder otherwise.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- A TypeScript type for each record type. The prototype stays client-only: no runtime fetching.
- No state-management library or router (no new dependencies).

**VALIDATION.**

- Type-check and build pass.
- A consistency check of the module against DD, run as a temporary script outside the repository with no new dependencies. It covers:
  - identifiers unique, references resolve, payment attempts;
  - the arithmetic of all 10 Orders, and state histories by mode;
  - discount and Locally made metadata, Product performance sums;
  - deadlines, Home channel lists, the posts needing action, context selector options and Courier card values.
- A search of src/ for canonical names, identifiers and prices outside the module finds none apart from imports.
- In the browser, every surface at 10:25, and each guided-flow step, shows DD's values.

**ACCEPTANCE CRITERIA.**

1. Every DD record exists exactly once in the module, with DD's values.
2. No canonical demo fact is defined outside the module (search evidence).
3. Every surface shows DD's values at 10:25, and each guided-flow step shows its documented state.
4. All 10 Orders show DD's totals, and the Seller, Daniel and review counts match DD at each documented time.
5. Layout and styling are unchanged, apart from placeholders where an existing image depicted a different item.
6. Type-check and build pass; the formatter wasn't run; no new dependencies or configuration changes.
7. The completion report lists every demo fact found that DD doesn't define, and none was invented.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus: the module's location and its record count by type; the screens switched to the module; the list of facts DD doesn't define.

### WO-002 — Populate Three Complete Seller Accounts

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Present Addis Atelier, Nura Glow and Volt House as complete, consistent Seller accounts on every Seller surface (Seller Console, Seller Companion, Seller Storefront), using DD's records.

**WHY THIS WORK ORDER EXISTS.**

- DD defines three primary showcase Sellers, each with five Products and five Shoppable Posts (DD *Sellers*, DD *Products*, DD *Shoppable Posts*); §5 names the same three Sellers.
- §11, §23 and §28–§38 define the Seller surfaces. The audit found them built around a single Seller.

**DEPENDENCIES.**

- WO-001 (the canonical data module).

**IN SCOPE.**

- Choosing the Seller on the Seller Console (Seller selector, §28) and on the Seller Companion (Seller context selector, §23). Prototype switching isn't an account-architecture decision (R17.2, §61).
- For each Seller, the Seller Console: Home with the Daily Operations Brief, including Shoppable Posts needing action (§29), Orders (§30), Products with the Performance summary (§31), Content (§32), Inbox (§33), Insights (§34), Trust (§35), Store with the map and Courier management (§36), Automation (§37) and Settings (§38).
- Volt House's pre-publication Home: the Publication Readiness Hub, shown as DD's historical setup snapshot (§29; DD *Sellers*).
- For each Seller, the Seller Companion: Alerts, Orders, Inbox and More (§23).
- For each Seller, the Storefront at 390 px and 1440 px (§11, §4).

**OUT OF SCOPE.**

- Courier metric presentation (WO-008), conversation context (WO-005), checkout (WO-006) and responsive repair (WO-007).
- Inbox unread counts and response-state labels (§33): unchanged, the same boundary as WO-005.
- Nile Loom's own surfaces: it's operations-only (DD *Supporting operations-only Seller*).
- Seller actions with no DD record: inviting, rejecting, suspending or removing a Courier, and editing Products or Store settings.

**IMPLEMENTATION REQUIREMENTS.**

1. Each Seller shows exactly its DD profile: name, handle, category, Trust, location, bio, fulfilment options and charges, team, totals and followers (DD *Sellers*).
2. Products, five per Seller, with name, price, variants, stock, availability, Product Quality, attributes, Locally made and any active discount (DD *Products*, DD *Discounts*). A Product Post represents exactly one Product (R1.1).
3. The Product list's Performance summary shows DD's figures (product views, units sold and GMV over 7 days); no screen computes its own (§31; DD *Product performance (7 days)*). The Cotton Shirt Dress's sale counts at its regular ETB 2,750.00 price: it happened before the current discount, which is never applied retroactively.
4. Shoppable Posts, five per Seller, with DD's publication state, tags, hotspot count, For You eligibility and caption. A post with no tags, or whose Product is out of stock, stays published without fake Product buttons (R1.5–1.8, §11, §32).
5. Orders, Reviews, Claims and Conversations by Seller as in DD, with each Order labelled by its mode-specific state (R4.4–4.7, §30; DD *Seller Orders*). Preparation deadlines and the `CLM-1002` response deadline are DD's fictional record-specific demo timestamps, never presented as Adulis-wide preparation or Claim SLA policy (DD *Seller Orders*, DD *Claims*).
6. Trust is read-only and evidence-based, and the Seller's actual public Trust level shows on the Seller profile and Storefront (R14.1–14.6, §35). No screen mentions government ID (R13.1, §29, §53).
7. Store shows the approved area and DD's fictional map pin on an illustrative map with no external map service. No street address is shown, and the pin is never represented as a verified real-world business street address (§36; DD *Sellers*).
8. Settings shows all eight §38 areas with DD's prototype states (DD *Sellers*). The Owner is the primary member, and no new Seller-role rules are introduced (§38).
9. Automation shows Addis Atelier's chatbot as in DD. DD records none for Nura Glow or Volt House, so they show the empty state (§37, §56; DD *Conversations*).
10. Payment status is read-only, with no Confirm Payment or Accept Payment controls (R5.1–5.2, §23). The Storefront is public and read-oriented, has no web Checkout and shares by handle only (R15.3, §11; DD *Sellers*).
11. The Daily Operations Brief follows §29's priorities. Shoppable Posts needing action lists a post only when it's published, was associated with Products, and is now left with zero eligible tagged Products because they became unavailable or ineligible, so it has lost commerce-discovery eligibility (§29):
    - In DD that's `SHP-AA-005` alone, on Addis Atelier's Home, titled "Needs attention", with "No tagged products are currently available. This post is no longer eligible for For You discovery." (DD *Shoppable Posts*).
    - A post is never listed only because it was published with zero tags by design, is a Draft, performs poorly, or has one unavailable tagged Product while another stays eligible.
    - Moderation problems appear only under Moderation issues, and a listed post stays published (R1.8).

**DATA REQUIREMENTS.**

- DD *Sellers* (including the map pins, the Settings states and the Volt House snapshot), DD *Products*, DD *Discounts*, DD *Product performance (7 days)*, DD *Shoppable Posts* (including the posts needing action), DD *Seller Orders*, DD *Claims*, DD *Reviews*, DD *Conversations*, DD *Notifications* and DD *Insights*.

**VISUAL / UX REQUIREMENTS.**

- Nura Glow and Volt House reuse the existing Seller surfaces' layouts and components; no redesign.
- Empty sections use the §56 empty state (for example, no Courier invitations).
- §57 accessibility. The Storefront is phone-first at 390 px with a 1440 px desktop presentation; the Seller Console is checked at about 1440 px and 1024 px (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- All Seller data comes from the WO-001 module. The map is a local illustration, not a map service or a new dependency.

**VALIDATION.**

- Type-check and build pass.
- For each Seller in the browser, compare with DD: the Seller Console at 1440 px and 1024 px, the Companion at 390 px, and the Storefront at 390 px and 1440 px.
- Check each Seller's Daily Operations Brief against DD *Shoppable Posts* at 10:25, 11:05 and 12:30.

**ACCEPTANCE CRITERIA.**

1. Each Seller can be selected on the Seller Console and the Companion, and shows only its own DD data.
2. Each Storefront shows its DD profile, five Products, its published posts and its Reviews, and has no web Checkout.
3. The Volt House snapshot shows the Readiness Hub as DD records it, and Volt House's current state is unchanged.
4. Settings, the map pin, the Performance summary and the deadlines match DD exactly.
5. No Seller surface shows government ID, Seller payment confirmation or editable Trust.
6. The Daily Operations Brief lists `SHP-AA-005` as Addis Atelier's only Shoppable Post needing action, with §29's message, and none for Nura Glow or Volt House, at every time checked.
7. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus a screenshot list for each Seller and surface.

### WO-003 — Guest Buyer Authentication States

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** A guest can browse public commerce content in the Buyer app, sees the approved guest messages, and is asked to sign in, through the prototype sign-in sequence, for account-bound actions, including Report. Signing in returns the app to Maya's signed-in state, and a guest's temporary Cart survives sign-in.

**WHY THIS WORK ORDER EXISTS.**

- R3.1–3.12 define the guest Buyer. §12 lists the Public/anonymous entry screen and defines the prototype sign-in sequence, Report for a guest and the temporary Cart through sign-in. §7 defines Report, and DD *Buyer* defines the guest state.
- The audit found a guest banner while account actions stayed available (for example checking out as Maya).

**DEPENDENCIES.**

- WO-001.
- WO-004 applies the guest behaviour to the Home channels.

**IN SCOPE.**

- The Public/anonymous entry screen (§12).
- Guest browsing and actions as R3.6 allows, including Share and the temporary prototype Cart.
- Sign-in requests for every action R3.7 lists, including Report submission, and for Not Interested (R3.9).
- Report for a guest: the authentication requirement first, then the Report flow where practical (§7, §12).
- The temporary Cart through sign-in: preserved, revalidated, then Checkout continues (R3.10–3.12, §12).
- Guest Orders and guest You (R3.2–3.4).
- The prototype sign-in sequence: Phone number → Continue → 6-digit OTP → signed-in Buyer state (§12).
- A prototype-only control to enter and leave the guest state (§2, §61).

**OUT OF SCOPE.**

- Real authentication, real account creation, and account merge or role migration (§12, §61).
- Guest behaviour inside the Home channels (WO-004).
- Payment and Order creation once Checkout continues: they follow the Checkout/payment flow (§15–§16, R3.12).
- Seller, Courier and Operator sign-in.

**IMPLEMENTATION REQUIREMENTS.**

1. Guest Orders shows exactly "Sign in to start ordering and track your orders." and no Order data (R3.2–3.3).
2. Guest You shows exactly "Sign in to see your profile." (R3.4).
3. A guest can do everything R3.6 lists and nothing that R3.7 or R3.9 reserves without signing in.
4. Each action R3.7 lists, including Report submission, and Not Interested, asks the guest to sign in instead of acting (R3.5, R3.7, R3.9). A guest who chooses Report sees the authentication requirement (Sign in / Create account) and, after successful authentication, continues into the Report flow where practical (§7, §12).
5. Sign-in is the §12 sequence: phone number, Continue, a 6-digit code, then Maya's signed-in state (DD *Buyer*). Sign in / Create account leads into this same sequence. It doesn't resolve the production account architecture (R17.1–17.2, §61), and an incomplete entry shows a validation message (§56).
6. A guest's temporary Cart survives successful authentication within the session, with its Seller grouping, Product selections, variants and quantities unchanged. When sign-in was required at Checkout, Checkout continues after it (R3.10, §12).
7. After authentication and before Checkout continues, current Product availability is revalidated. If an item is no longer available, the Buyer is shown what changed, and no invalid Order is silently created (R3.11, §12).
8. The temporary Cart is transient prototype/session state: not a canonical Seller Order, and never a DD record. Seller Orders are created only through the Checkout/payment flow, and resetting the prototype returns the application to DD's canonical baseline (R3.12; DD *Buyer*).
9. The guest switch is a prototype-only control labelled "PROTOTYPE NAVIGATION — NOT PRODUCTION UI" (§61) and listed among the Prototype Guide's prototype-only controls (§2).

**DATA REQUIREMENTS.**

- A guest has no Buyer data: no Orders, Collections, conversations or notifications (DD *Buyer*).
- Public content comes from DD (DD *Sellers*, DD *Products*, DD *Shoppable Posts*, DD *Reviews*). Maya's data appears only after sign-in.
- The temporary Cart holds the guest's selections of DD Products as session state and is never added to the WO-001 module (R3.12). Maya's canonical carts are empty at 10:25 (DD *Buyer*).

**VISUAL / UX REQUIREMENTS.**

- The existing Buyer app layout and components, with the guest messages worded exactly as above.
- §57 accessibility, at 390 px and 360 px (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- The guest state, the temporary Cart and the sign-in sequence are prototype session state only, with no backend. Resetting the prototype returns it to DD's baseline (R3.12).

**VALIDATION.**

- Type-check and build pass.
- In the browser as a guest:
  - try every R3.6 action and every R3.7 action, including Report;
  - check the Orders and You messages;
  - run the sign-in sequence and confirm Maya's data appears afterwards.
- As a guest, add Products from two Sellers with variants and quantities, choose Checkout, sign in, and confirm the Cart is unchanged and Checkout continues.
- Confirm availability is revalidated before Checkout continues, and that an item no longer available produces a message showing what changed, not an Order.
- Reset the prototype and confirm DD's baseline returns.

**ACCEPTANCE CRITERIA.**

1. Guest Orders and guest You show exactly the R3.3 and R3.4 texts.
2. Every R3.6 action works for a guest; every R3.7 action, and Not Interested, asks for sign-in.
3. No authenticated Order or profile data is visible to a guest.
4. The sign-in sequence shows Maya's DD state.
5. A guest who chooses Report authenticates first, then continues into the Report flow where practical.
6. The temporary Cart survives sign-in with its Seller grouping, selections, variants and quantities. Availability is revalidated before Checkout continues, and no invalid Order is created.
7. Resetting the prototype returns it to DD's baseline.
8. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus the list of guest actions checked.

### WO-004 — Buyer Home / Discovery / FYP Rebuild

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Rebuild Buyer Home, where all Buyer discovery happens, with five channels: For You (the default), Following, Nearby, Discounts and Locally Made. Each channel follows its approved content rules, guest access and DD's fixed demo lists.

**WHY THIS WORK ORDER EXISTS.**

- R2.1–2.14, R3.7–3.9 and R14.6 set the rules. §7 and §12 define Home, its navigation, the For You unit, Not Interested, More and Report, and DD *Buyer Home channels* defines the lists.

**DEPENDENCIES.**

- WO-001 and WO-003.

**IN SCOPE.**

- Home in the bottom navigation (Home, Shop, Saved, Orders, You), opening on For You (R2.3, §12).
- The five channel tabs, with DD's lists and their timed changes, for Maya and for a guest (DD *Buyer Home channels*; §7 guest access).
- The For You unit (§7): large primary image, Seller avatar or logo, Seller name, the Seller's actual public Trust level, caption, Product hotspots, the "In this post" preview, and Save, Share, Follow Seller, More, Not Interested and Report.
- Not Interested, the More action sheet and the Report categories (§7).
- Hotspot → lightweight Product preview or Product list bottom sheet → Product Post Detail (§7, §13).
- Vertical scroll or swipe, image-led, with no video feed (§7, §58).
- Nearby's saved area for Maya, and manual area selection (R2.9–2.10, R2.14).

**OUT OF SCOPE.**

- Marketplace Search (§8).
- The Shop tab, whose content the specification doesn't define.
- Saved and Collections screens (§9), beyond the Save action.
- Product Post Detail itself.
- Everything §60 rules out.

**IMPLEMENTATION REQUIREMENTS.**

1. Home opens on For You (R2.3). The five channels are distinct, and none is treated as a synonym for For You (§7).
2. For You shows DD's list in DD's order, Shoppable Posts only. `SHP-VH-004` leaves at 11:05 and `SHP-AA-006` joins last at 12:30. Ineligible posts never appear (R1.7, R2.1–2.2).
3. Following shows DD's list for Maya, and appearing there doesn't make a post FYP eligible (R2.7–2.8). A guest is asked to sign in (R3.8).
4. Nearby shows DD's Kazanchis list for Maya by default and reorders by DD's proximity metadata when Bole or Megenagna is selected. A guest sees Nearby after choosing an area. Posts with no eligible Product never appear, and live or simulated Buyer GPS is never used (R2.9–2.10, R2.14).
5. Discounts lists `PRD-AA-004`, `PRD-VH-005` and `PRD-NG-005` in DD's order, each with its regular price, discounted price and expiry date where set (R2.11; DD *Discounts*).
6. Locally Made lists `PRD-AA-001` to `PRD-AA-004` (then `PRD-AA-006` after 12:30), with `PRD-AA-005` last, marked "Currently unavailable" (R2.12–2.13).
7. A guest sees the Guest/default discovery ranking in For You, Discounts and Locally Made. For deterministic prototype purposes it uses the same canonical records, in the same order, as Maya's lists, and it's never described or modelled as Maya's personalized feed (§7; DD *Buyer*).
8. Each unit shows the Seller's actual public Trust level, with NEW and REBUILDING never hidden (R14.6, §7).
9. Not Interested is for signed-in Buyers (R3.9): it removes or hides the post from the current rendered list and shows a confirmation toast, without claiming to change a recommendation model (§7).
10. More opens an action sheet with Not Interested, Report and other already-approved contextual actions only. Report offers the six §7 categories. A guest who chooses Report is asked to authenticate first, then continues into the Report flow where practical (R3.7, §7).
11. Save adds the item to Maya's default Saved Collection, `COL-MAYA-SAVED`, and Follow Seller reflects DD's follows. A guest is asked to sign in for both (R3.7). Share uses handles only, never a URL (DD *Buyer*, DD *Sellers*).
12. Hotspots are never the only way to find tagged Products: the "In this post" list is always available (§57).

**DATA REQUIREMENTS.**

- DD *Buyer Home channels*, DD *Shoppable Posts*, DD *Products*, DD *Discounts*, DD *Buyer* (including the guest state), DD *Sellers* and DD *Moderation*.
- Imagery as in WO-001 (placeholders unless approved images exist, §62); the hotspot count for each post comes from DD.

**VISUAL / UX REQUIREMENTS.**

- An image-led commerce aesthetic that doesn't imitate TikTok (§3, §7), built from the existing design tokens and components.
- §57 accessibility, at 390 px and 360 px (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Channel lists come from the WO-001 module; no screen computes its own. Hiding a post with Not Interested affects only the current rendering.

**VALIDATION.**

- Type-check and build pass.
- Compare each channel with DD at 10:25, 11:05 and 12:30, both for Maya and for a guest.
- Check Nearby for each of the three areas.
- Check Not Interested, More and Report, as Maya and as a guest.
- Check that tagged Products can be reached by keyboard and screen reader without the hotspots.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–12 hold.
2. Each channel matches DD at each documented time.
3. A guest who chooses Report is asked to authenticate, and a Report is submitted only when signed in.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus each channel's observed list at 10:25, 11:05 and 12:30.

### WO-005 — Buyer–Seller Chat Context Rebuild

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** One ongoing conversation per Buyer and Seller in the Market, in which each message keeps the context it was sent with, and the context selector offers only records from that Buyer–Seller relationship. This applies in the Buyer app and in the Seller Inbox on the Seller Console and the Companion.

**WHY THIS WORK ORDER EXISTS.**

- R12.1–12.6, §22, §23 and §33 define chat, and DD *Conversations* holds the canonical conversations and their context selector options.
- The audit found context chips that changed only the placeholder text; no message kept its context.

**DEPENDENCIES.**

- WO-001, and WO-002 for the Seller Inbox of each Seller.

**IN SCOPE.**

- Buyer: Chat list, Conversation, Chatbot and Talk to Seller (§12, §22; Flow L in §59).
- Seller: the Seller Console Inbox (§33) and the Companion Inbox and Conversation (§23), showing the Buyer, the last message, the context chip, the Product, Post or Order anchor, and the team member who replied (§33).
- Per-message context and the context selector (R12.2–12.6, §22).
- Opening chat from Product Post Detail starts with that Product as the context (Flow L; DD *Conversations*).

**OUT OF SCOPE.**

- Quick Replies (§22, §33), unread counts and response-state labels (§33): they aren't about context, so they stay unchanged.
- The Seller Console Automation screens (§37).

**IMPLEMENTATION REQUIREMENTS.**

1. Exactly one conversation per Buyer and Seller pair in the Market (R12.1): `CNV-MAYA-AA` and `CNV-MAYA-NG` for Maya, and `CNV-SAMUEL-AA` on Addis Atelier's side only.
2. Every message stores and shows its own context. Changing the composer's context never changes earlier messages (R12.2–12.3), and DD's messages show DD's contexts.
3. The selector offers only General / Seller, the current Seller's publicly eligible Product Posts and Shoppable Posts (never draft, restricted or removed records), and Orders belonging to both the current Buyer and the current Seller (R12.5, §22). For each conversation, the options are exactly DD's list, including the changes after 12:30 (DD *Conversations*).
4. Nothing ever shows another Buyer's Order or another Seller's record (R12.6).
5. Seller surfaces show which team member replied (Abel T., Hiwot H., Nardos A.); the Buyer sees the Seller (DD *Conversations*).
6. The chatbot answers only with DD's three configured answers. The navy question is unmatched and offers Talk to Seller (Flow L; DD *Conversations*).
7. Chat never changes payment, stock or Order state, and the message about Liya is coordination only (R12.4).
8. Maya has no conversation with Volt House (DD *Conversations*).

**DATA REQUIREMENTS.**

- DD *Conversations* (messages, contexts, context selector options and the chatbot), and the Products, Shoppable Posts and Orders their contexts refer to.

**VISUAL / UX REQUIREMENTS.**

- The existing chat layouts, with context chips in the §22 form ("Talking about: …").
- §57 accessibility. The Companion and Buyer app at 390 px, the Seller Console at 1440 px.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Messages, contexts and selector options come from the WO-001 module.

**VALIDATION.**

- Type-check and build pass.
- Open both of Maya's conversations and compare the selector options with DD at 10:25 and after 12:30.
- Change the context and send a message, then confirm earlier messages are unchanged.
- Check that the Seller Inbox shows contexts and staff names.
- Run Flow L from start to finish.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–8 hold.
2. Flow L matches DD (the 11:35 question and the 11:48 reply).
3. No selector anywhere offers another Buyer's Order, another Seller's record, or a draft, restricted or removed post.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus the observed context of every DD message and the selector options for each conversation.

### WO-006 — Single-Seller and Multi-Seller Checkout Test Flows

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** The approved guided Flows C (single Seller) and D (several Sellers) work from start to finish as functional prototype flows, using DD's records:

- Product, Variant and Add to Cart;
- Seller-specific carts;
- Checkout with a fulfilment choice and a price breakdown;
- Secure payment, including Nura Glow's failed first attempt and its retry;
- Paid Seller Orders.

**WHY THIS WORK ORDER EXISTS.**

- §13–§17, §51, §52, §56 and Flows C and D in §59 define checkout, together with R4.1–4.7, R5.1–5.9 and R6.9. DD *Seller Orders* holds `ADU-24091`, `ADU-24092` and the payment attempts.
- The audit found a flat ETB 14 surcharge and Order identifiers that collided across surfaces.

**DEPENDENCIES.**

- WO-001, WO-003 (sign-in before ordering, R3.3 and R3.7) and WO-004 (Flow C starts in For You).

**IN SCOPE.**

- **Flow C:** For You → `SHP-AA-001` → hotspot `PRD-AA-001` → Size M, Natural → Add to Cart → Checkout → Courier Delivery → price breakdown → payment → `ADU-24091` Paid, ETB 2,642.25.
- **Flow D:** `PRD-AA-001` ×1 and `PRD-NG-001` ×1 → two Seller carts → Checkout coordinator → separate Seller Orders `ADU-24091` and `ADU-24092`. Nura Glow's first attempt, `PAY-24092-01`, fails at 10:06, and the retry, `PAY-24092-02`, is Paid at 10:07.
- The Buyer screens Seller-specific Cart, Multi-cart summary, Checkout, Gateway transition, Payment Processing and Payment Success (§12, §14–§16), plus the payment Failed and Retry states (§16, §56).

**OUT OF SCOPE.**

- A test framework or automated tests.
- `ADU-24093`'s purchase through Search, which isn't a guided flow.
- Fulfilment and handoff (Flows G and H).
- Any real payment provider.

**IMPLEMENTATION REQUIREMENTS.**

1. Carts stay separated by Seller, and no data or wording implies one cross-Seller Order (R4.1–4.3, §14).
2. Show one Seller Order's price breakdown at a time where appropriate (§15):
   - `ADU-24091`: Products 2,450.00 + Courier Delivery 180.00 + surcharge 12.25 = 2,642.25.
   - `ADU-24092`: 1,350.00 + 150.00 + 6.75 = 1,506.75.
3. The surcharge is shown separately and excludes the delivery charge (R5.6–5.8). The Courier Delivery charge is shown before payment (R6.9, §15).
4. Fulfilment options are each Seller's own (DD *Sellers*): Addis Atelier offers Buyer Collection (free) or Courier Delivery (ETB 180.00); Nura Glow offers Seller Delivery (ETB 120.00) or Courier Delivery (ETB 150.00).
5. Payment is labelled "Secure payment" and names no provider, and PAID comes only from provider or backend confirmation (R5.1–5.5, §16, §51). The references are `PAY-24091-01`, `PAY-24092-01` and `PAY-24092-02` (DD *Seller Orders*).
6. In Flow D, `PAY-24092-01` shows Failed, Maya retries, and `PAY-24092-02` brings `ADU-24092` to Paid at 10:07. The failure creates no second Seller Order, and the final state is Paid (R5.9; DD *Seller Orders*, DD *Story timeline*).
7. Flow D produces two Paid Orders, at 10:05 and 10:07, each with its own payment (DD *Story timeline*).
8. There are no Seller Confirm or Accept Payment controls and no payment-screenshot upload (R5.2, R5.4, §16).
9. Each Order's timeline starts at Paid and follows its mode's states (R4.4–4.7).

**DATA REQUIREMENTS.**

- DD *Products* (prices and variants), DD *Sellers* (fulfilment options and charges), DD *Buyer* (delivery address detail), and DD *Seller Orders* (`ADU-24091`, `ADU-24092`, and the payment references and attempts).

**VISUAL / UX REQUIREMENTS.**

- The existing checkout layouts.
- §56 states: Processing, Failed with a Retry action, and Paid.
- §57 accessibility, at 390 px and 360 px (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Prices, totals and payment attempts come from the WO-001 module; no screen computes its own surcharge.
- No test framework.

**VALIDATION.**

- Type-check and build pass.
- Run Flows C and D in the browser and compare every amount, identifier, attempt and time with DD.
- Check that the surcharge is separate and that all wording is per Seller.

**ACCEPTANCE CRITERIA.**

1. Flow C finishes with `ADU-24091` Paid at ETB 2,642.25.
2. Flow D finishes with two separate Paid Orders, `ADU-24091` and `ADU-24092`, at DD's totals, after the failed attempt and the retry.
3. Requirements 1–9 hold.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus screenshots of each price breakdown and of the failed and retried payment.

### WO-007 — Full Responsive Layout Repair

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Every prototype section lays out without unintended horizontal scrolling or clipped content at its relevant audit widths, following §4's smaller-width behaviour for the consoles and the prototype shell.

**WHY THIS WORK ORDER EXISTS.**

- §3 requires consistent responsive behaviour and 44 × 44 px touch targets. §4 sets the target widths, the audit widths and the smaller-width behaviour, and §62 expects coherent responsive behaviour.
- The audit measured overflow on several surfaces: Company Website pages with no 390 px layout, the Seller Console at phone widths, and the Operator Console from 1024 px to 1440 px. It also found the flow-guide card covering the Buyer bottom navigation.

**DEPENDENCIES.**

- WO-001 to WO-006, so the repair follows the content and structure changes.

**IN SCOPE.**

- All twelve prototype sections: Prototype Guide, Foundations, Components, Company Website, Seller Storefront, Buyer, Seller Companion, Courier, Seller Console, Operator Console, Master Demo and System States. Product surfaces come first.
- The audit widths (§4): 360, 390 and 430 px (phone), 768 and 1024 px (tablet), and 1280, 1440 and 1920 px (desktop). As a general interpretation, the width categories are phone 360–430 px, tablet 768–1024 px and desktop 1280 px and above (§4).

**OUT OF SCOPE.**

- Redesign and new features.
- The invalid colour values.
- Keyboard focus styling, unless a responsive change breaks focus (WO-011 reports the rest).
- A mobile Operator experience preferred over desktop (§4).

**IMPLEMENTATION REQUIREMENTS.**

1. Each section is tested at the specifically approved §4 audit widths relevant to it. Every mobile-responsive surface is tested at 360, 390 and 430 px.
2. No unintended horizontal document scrolling and no clipped content at any tested width (§4).
3. Seller Console (§4):
   - Desktop: the normal sidebar and table layout.
   - Tablet: collapsible or drawer navigation, with tables that adapt or scroll internally.
   - Phone: a drawer for navigation, stacked cards for dense rows, forms stacked vertically, and core screens that stay inspectable and usable.
4. Operator Console renders correctly at mobile widths (§4): a drawer for the sidebar, cards or safe internal-scroll views for queue tables, full-screen panels for case drawers, and core prototype interactions still reachable. A subtle "Desktop recommended" message shows where appropriate.
5. The prototype shell at small widths (§4):
   - no desktop prototype sidebar taking product viewport width;
   - section navigation still reachable;
   - the guided-flow card never covering mobile bottom navigation;
   - no double phone framing when the application itself is viewed on a phone.
6. Mobile touch targets are at least 44 × 44 px (§3, §57).
7. The desktop Storefront stays a Storefront, not a large traditional e-commerce portal (§4).
8. Rendering at 1440 px is unchanged except where it overflowed (the visual baseline).

**DATA REQUIREMENTS.**

- None beyond WO-001.

**VISUAL / UX REQUIREMENTS.**

- The approved baseline at desktop widths, consistent behaviour between widths (§3), and the §4 smaller-width behaviour.
- The Seller Companion remains the preferred mobile Seller surface (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints, except that this work order may change the responsive rules in src/index.css and the responsive classes in components.
- Keep any class hooks those rules still use.

**VALIDATION.**

- Type-check and build pass.
- For every section at each tested width: compare the document's scroll width with the viewport width, take screenshots, and audit touch targets at the phone widths.

**ACCEPTANCE CRITERIA.**

1. Zero unintended horizontal scrolling measured for every section at each tested width.
2. No clipped content in the screenshots.
3. The Seller Console, Operator Console and prototype shell behave as §4 describes at each width category.
4. Touch targets of at least 44 px at the phone widths.
5. Desktop rendering is unchanged except for the overflow fixes.
6. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus a browser measurement at each width.

**COMPLETION REPORT FORMAT.** The standard report, plus a table of sections by width (before and after), with the reason for any width skipped as not relevant.

### WO-008 — Courier Seller-Specific vs Platform Totals

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Every Seller-facing Courier view and card shows "completed for this Seller" as the primary figure and "total completed deliveries" as secondary context, with DD's values at each point in the story, and shows nothing about other Sellers.

**WHY THIS WORK ORDER EXISTS.**

- R6.2, R6.3, R6.8 and R7.1–7.4 define Courier relationships and metrics; §23 gives the card and its examples (41 and 64; 0 and 66), §36 Courier management, and DD *Courier* the values.
- The audit found one combined figure (126) on Seller surfaces, 218 in the Courier app, and Daniel listed at one Seller as both approved and an applicant.

**DEPENDENCIES.**

- WO-001.
- WO-002 (each Seller's Store and Courier pool).

**IN SCOPE.**

- The Seller Companion Assign Courier card (§23).
- Seller Console Store → Couriers: the Approved, Applications, Invitations and Suspended tabs, and Courier Detail (§36).
- Daniel's relationships (DD *Courier*):
  - Addis Atelier: approved on 14 April at ETB 180.00.
  - Nura Glow: approved on 2 June at ETB 150.00.
  - Volt House: application pending from 30 September until Flow F approves it at 16:30, at ETB 200.00.
- The Courier app's totals: 64 at 10:25, then 65, then 66 (DD *Courier*).

**OUT OF SCOPE.**

- Courier invitations, suspensions and removals (DD has none).
- Bereket M., who is a supporting Courier seen only by Operators (DD *Supporting Courier*).
- Dispatch, bidding and wallets (R6.4–6.7, §60).

**IMPLEMENTATION REQUIREMENTS.**

1. Every Seller-facing Courier selection or card shows completed-for-this-Seller first and more prominently, and the total second (R7.4, §23).
2. DD's values at DD's times (DD *Courier*):

   | Time | Seller | Card |
   |---|---|---|
   | 13:35 | Addis Atelier | Available · 41 completed for your store · 64 total · ETB 180.00 |
   | 13:50 | Nura Glow | Busy · 23 completed for your store · 64 total · ETB 150.00 |
   | 16:30 | Volt House | 0 completed for your store · 66 total · ETB 200.00 per delivery |

3. A Courier with no completed deliveries for a Seller shows 0 for that Seller, even with platform history (R7.2).
4. No Seller sees another Seller's identity, Orders, compensation or Courier relationship (R7.3, §36).
5. The compensation shown is the Seller-defined, snapshotted amount, shown before acceptance (R6.8, §52).
6. Daniel holds at most one active accepted delivery (R6.3). He's Busy from 13:37 to 14:52 and from 14:58 to 16:05 (DD *Seller Orders*).
7. Courier Detail shows name, status, availability, Seller relationship, completed for this Seller, total completed, current terms, compensation and relationship history (§36, R7.1).

**DATA REQUIREMENTS.**

- DD *Courier* (Daniel's relationships and his counts through 2 October) and the state histories of `ADU-24091` and `ADU-24092` (DD *Seller Orders*).

**VISUAL / UX REQUIREMENTS.**

- Visual primacy as R7.4 requires, within the existing components.
- Status as text plus icon (§57). The Companion at 390 px, the Seller Console at 1440 px.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Counts are read or derived from the WO-001 module at the current story time.

**VALIDATION.**

- Type-check and build pass.
- Check each card and view against DD at 10:25, 13:35, 13:50 and 16:30.
- Confirm no other-Seller information appears.
- Check the Courier app's totals.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold at every documented time.
2. The §23 examples and DD's card values match what's shown.
3. Daniel appears at Volt House as an applicant until 16:30 and as approved after that, never as both.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus a screenshot of each card at its documented time.

### WO-009 — Operator Sidebar Collapse / Expand

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** The Operator sidebar has two persistent desktop states, Expanded and a Collapsed icon rail, that switch reliably in both directions. At tablet and phone widths it becomes a temporary drawer, and the navigation is unchanged throughout.

**WHY THIS WORK ORDER EXISTS.**

- It has been on the approved execution order since 2026-10-02, carried over from the original Figma correction list.
- §39 now defines the sidebar's behaviour (OPERATOR SIDEBAR). §4 sets the Operator Console's widths, and §57 requires keyboard access.

**DEPENDENCIES.**

- WO-001.
- WO-007 (the Operator Console at smaller widths).

**IN SCOPE.**

- The Operator Console sidebar on desktop (Expanded and Collapsed icon rail) and its temporary drawer at tablet and phone widths.

**OUT OF SCOPE.**

- Navigation items, labels and order, which §39 fixes.
- The rest of the Operator Console layout.
- A mobile Operator experience preferred over desktop (§4).

**IMPLEMENTATION REQUIREMENTS.**

1. Desktop has two persistent states, Expanded and Collapsed icon rail (§39).
2. Expanded contains a Collapse control, and Collapsed keeps an always-accessible Expand control.
3. In the Collapsed state, each icon has its label through tooltip and focus treatment.
4. The states switch repeatedly (Expanded → Collapsed → Expanded → Collapsed) without becoming trapped.
5. The active Operator destination is preserved through every change.
6. At tablet and phone widths (§4) a temporary drawer replaces the Collapsed rail. Closing the drawer never permanently changes the desktop state.
7. §39's navigation items, groups and order are unchanged, and the controls are keyboard-accessible with visible focus and semantic labels (§57).

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- The Operator Console stays visually distinct from the Seller Console (§39).
- The Collapsed rail uses the existing navigation icons.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.

**VALIDATION.**

- Type-check and build pass.
- At 1280, 1440 and 1920 px, toggle the sidebar repeatedly with keyboard and pointer from several destinations.
- At 360–1024 px, open and close the drawer, then return to a desktop width and confirm the desktop state is unchanged.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold.
2. No sequence of toggles leaves the sidebar stuck in one state.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus screenshots of the Expanded, Collapsed and drawer states.

### WO-010 — Solo Coverage Duration

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Solo Coverage activation offers the approved expected-duration options, from minutes to multiple weeks, and presents the duration as an estimate and a temporary governance boundary. The approved expiry, extension and early-stop behaviour applies, and DD's scenario `SCV-1001` is the demonstration.

**WHY THIS WORK ORDER EXISTS.**

- R16.3–16.9 and §50 define Solo Coverage, its duration options and its expiry. DD *Operators* records the scenario.
- The audit found only 30-minute, 60-minute and 2-hour options, and an active banner reading "Expires in 42m".

**DEPENDENCIES.**

- WO-001.

**IN SCOPE.**

- Activation with the duration options.
- The active banner and audit warning.
- Expiry, extension and early stop.
- The audit records.
- The `SCV-1001` replay snapshot.

**OUT OF SCOPE.**

- The rest of Founder Operations (the review and approval flow in §50).
- The Future Staff Operations prototype.
- Real authentication.

**IMPLEMENTATION REQUIREMENTS.**

1. Activation requires the other Founder to be unavailable, fresh strong reauthentication, a reason, an expected duration and a temporary expiry (§50).
2. The duration options are 30 minutes, 1 hour, 4 hours, Rest of day, 1 day, 3 days, 1 week and Custom date/time. Custom allows durations of multiple weeks (§50, R16.4).
3. The expected duration is presented as an estimate and a temporary governance boundary, never as permanent authority (R16.5, §50).
4. At the expected expiry, Solo Coverage becomes inactive automatically and normal dual review resumes. Unfinished consequential actions that require dual review stay blocked or pending, and nothing is approved because Solo Coverage expired (R16.6–16.7).
5. Before expiry, a Founder may extend Solo Coverage. Extension takes a deliberate action, fresh strong reauthentication, a reason, an updated expected return and an audit entry (R16.8).
6. A Founder may stop Solo Coverage early, and it never continues silently or indefinitely (R16.9).
7. While active, a prominent SOLO COVERAGE ACTIVE banner and an audit warning show. Solo Coverage is never presented as normal daily behaviour (R16.3, §50).
8. Audit records show actor, action, target, reason, timestamp and result (§49).
9. The demonstration is `SCV-1001` as DD records it:
   - the CEO role activates it, with the COO/CTO role unavailable, for an expected 3 days;
   - the replay snapshot is at 10:00 on 22 September 2026, and expiry at 09:00 on 24 September;
   - DD lists two audit records;
   - roles only, never personal Founder names (DD *Operators*).

**DATA REQUIREMENTS.**

- DD *Operators* (`SCV-1001` and its audit records) and DD *Story timeline*.

**VISUAL / UX REQUIREMENTS.**

- A clearly privileged state in the Operator Console style (§39, §50).
- §57 accessibility.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Times come from the WO-001 module, never from the device clock.

**VALIDATION.**

- Type-check and build pass.
- Open the `SCV-1001` replay snapshot and check the banner, the audit warning and the audit records.
- Walk through every duration option and the Custom option to more than 2 weeks.
- Check that expiry blocks rather than approves pending dual-review actions, and that extension and early stop each require their steps.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–9 hold.
2. No path continues Solo Coverage silently or approves an action because of expiry.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus screenshots of activation, the active banner, extension and expiry.

### WO-011 — Full Prototype Regression Test

**STATUS.** APPROVED FOR IMPLEMENTATION. It runs last and can't start until WO-001 to WO-010 are complete.

**OBJECTIVE.** After WO-001 to WO-010, verify the whole prototype against the approved documents and report every defect, without fixing any.

**WHY THIS WORK ORDER EXISTS.**

- §63 requires every audit item to be verified, with any violation corrected before the prototype counts as complete.
- §64 describes the expected result, and R18.1–18.2 require consistency across surfaces.

**DEPENDENCIES.**

- WO-001 to WO-010, all complete.

**IN SCOPE.**

- All 36 §63 audit items.
- All 116 canonical rules (R1.1 to R18.2), each checked on the surfaces it governs.
- §60: nothing deferred is presented as current MVP.
- Flows A–L (§59) with DD's exact record mappings, at their documented times (DD *Demo flows and the records they use*).
- DD consistency on every surface (R18.1).
- The §4 audit widths, and §57 accessibility including visible keyboard focus.
- Type-check and build.

**OUT OF SCOPE.**

- Fixing defects: each becomes a new work order.
- Performance testing.
- Adding test infrastructure, which would be a configuration change.

**IMPLEMENTATION REQUIREMENTS.**

1. Build a written checklist from §63, R1.1 to R18.2, §60, §57 and DD *Demo flows and the records they use*, and record pass or fail, with evidence, for every item.
2. Walk every flow, A to L, from its first step, at DD's documented times.
3. Compare every canonical value seen with DD.
4. Check each section at its §4 audit widths for overflow and touch targets.
5. Don't change src/ during the run.

**DATA REQUIREMENTS.**

- DD in full, as the expected values.

**VISUAL / UX REQUIREMENTS.**

- Check against the approved baseline and the expectations in §3, §57 and §62.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Browser automation may run from outside the repository, with no new dependencies.

**VALIDATION.**

- Every checklist item has a result and evidence.

**ACCEPTANCE CRITERIA.**

1. Every checklist item has a recorded result with evidence.
2. Every failure names its location, the source it violates (R, § or DD) and a suggested work order.
3. src/ is unchanged by the run.
4. Type-check and build results are recorded.

**REQUIRED COMMANDS.** The standard commands, plus browser automation for flows and widths.

**COMPLETION REPORT FORMAT.** The standard report, plus the full checklist with results and the defects grouped by section.

## Revision history

- 2026-10-02: File created as an empty scaffold. No work orders recorded.
- 2026-10-02: Execution order recorded: WO-001 to WO-011, titles exactly as given. The sequence re-orders the original Figma correction list based on the audit's findings and puts the new WO-001 (Canonical Demo Data Foundation) first. No work-order texts received yet.
- 2026-10-02: WO-001's dependency note corrected: DEMO_DATA.md is now READY FOR FINAL APPROVAL (it was PROPOSED). Nothing else changed.
- 2026-10-02: WO-001's dependency note updated: DEMO_DATA.md is APPROVED, so the demo-data dependency is satisfied. WO-001's text is still pending. Nothing else changed.
- 2026-10-02: Bodies drafted for all 11 work orders from the approved rules, specification and DEMO_DATA.md, each with the 14 required sections, and work-order conventions added. WO-001, WO-008 and WO-011 are APPROVED FOR IMPLEMENTATION. WO-002 to WO-007, WO-009 and WO-010 are PENDING DECISION, each with its missing decisions listed. None is implemented.
- 2026-10-02: Approved work-order decisions applied after the rules (2.14, 3.6–3.9, 5.9, 12.5–12.6, 14.6, 16.6–16.9), the specification (sections 4, 7, 12, 22, 31, 36, 38, 39, 43 and 50) and DEMO_DATA.md were updated. WO-005, WO-006, WO-007, WO-009 and WO-010 are now APPROVED FOR IMPLEMENTATION. WO-002 (posts needing action), WO-003 (guest Report; the temporary Cart at sign-in) and WO-004 (guest Report) stay PENDING DECISION. None is implemented.
- 2026-10-02: Final work-order decisions applied after the rules (3.7 changed; 3.10–3.12 added), the specification (sections 4, 7, 12 and 29) and DEMO_DATA.md were updated. WO-002, WO-003 and WO-004 are now APPROVED FOR IMPLEMENTATION, so all eleven are. WO-001, WO-007 and WO-011 were updated to match. None is implemented.

## Related documents

- [ADULIS_PROTOTYPE_SPEC.md](ADULIS_PROTOTYPE_SPEC.md): the approved master prototype specification.
- [ADULIS_CANONICAL_RULES.md](ADULIS_CANONICAL_RULES.md): the authoritative prototype invariants.
- [DEMO_DATA.md](DEMO_DATA.md): the single canonical demo dataset used across every surface.
