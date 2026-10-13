# Adulis Correction Work Orders

**Purpose.** This holds the approved implementation work orders for the prototype, listed in the order they are to be executed, except the remediation work orders WO-012 to WO-024, which are listed by number and run in the order given under Execution order. Implement only what an approved work order covers.

**Status.** Execution order approved — 2026-10-02 (WO-001 to WO-011), and amended on 2026-10-04 to add WO-006A between WO-006 and WO-007. Bodies drafted on 2026-10-02 from the approved documents, then updated the same day with the approved work-order decisions and the final decisions. On 2026-10-04, approved amendments discovered during WO-002 extended WO-004 and WO-006 and added WO-006A, and a cleanup the same day made WO-006A PENDING DECISION. On 2026-10-05 its decision was recorded in DEMO_DATA.md: the canonical Maya Buyer Collection scenario, `ADU-24094` (2 October, Paid 17:30 to Completed 17:56). On 2026-10-08, after WO-011's initial verification run, the remediation work orders WO-012 to WO-024 were approved and added after WO-011, which is rerun after them to close it. On 2026-10-09 the owner set their execution order for the prototype's showcase value (see Execution order). APPROVED FOR IMPLEMENTATION: WO-001 to WO-006, WO-006A and WO-007 to WO-024. PENDING DECISION: none. Implementation progress is recorded separately, under Implementation progress.

## Execution order

`plans/you-are-an-expert-quirky-shell.md` states that each work order is executed sequentially and in full before the next begins.

The work orders below are listed in execution order, apart from the remediation work orders WO-012 to WO-024, which are listed by number and run in the order set on 2026-10-09 (below). The sequence was set on 2026-10-02. It re-orders the original Figma correction list based on what the technical audit found, and puts a new work order, WO-001, first. The request that set the order explains why:

> Notice the new first work order:
>
> Canonical Demo Data Foundation.
>
> We did not have that in the original Figma correction list, because Figma Make was primarily a visual generator.
>
> The audit showed Claude is inheriting a real code problem: demo data is copied across individual files.
>
> So Claude must solve that foundation before populating your Sellers.

On 2026-10-04 the sequence was amended to add WO-006A after WO-006 and before WO-007, without renumbering any existing work order. WO-006A records an explicit approved amendment discovered during WO-002. The execution order is now WO-001, WO-002, WO-003, WO-004, WO-005, WO-006, WO-006A, WO-007, WO-008, WO-009, WO-010 and WO-011.

Because execution is sequential, a work order that is PENDING DECISION holds back every work order after it until its decisions are recorded. WO-006A's decision was recorded on 2026-10-05 (the canonical Maya Buyer Collection scenario `ADU-24094`, 2 October, Paid 17:30 to Completed 17:56), so no work order is pending. WO-007 to WO-011 can't start until WO-006A is complete.

On 2026-10-08 the sequence was extended after WO-011's initial verification run, which found 20 confirmed defects (D1 to D20). The remediation work orders WO-012 to WO-024 were added after WO-011, without renumbering any existing work order, and WO-011 is then rerun against the remediated prototype. WO-011 stays open until that final rerun. There is no WO-025.

On 2026-10-09 the owner reprioritised the remediation work orders for the prototype's showcase value: visible UI, UX and frontend corrections run first. Every remediation work order stays required, with its defect mapping and acceptance criteria unchanged; only the order changed. The remaining execution order is:

- Tier 1, direct showcase value: WO-014, WO-016, WO-019, WO-020, WO-021, WO-022, WO-023, WO-024;
- Tier 2, interaction fidelity: WO-015, WO-017, WO-018;
- Tier 3, low showcase value but still required: WO-012, WO-013;
- then the rerun of WO-011, the closure gate.

Two remediation work orders list another as a dependency, and the order keeps both: WO-013 depends on WO-012 for its reusable verification screens and state, and WO-023 lists WO-022 (the focus outlines on the same panels). The other relationships between remediation work orders are coordination only, and none waits for another. Each body's remediation priority (P0 to P3) is unchanged; the tiers set only the execution order. The next work order is WO-024.

Each remediation work order cites the WO-011 defects it fixes under WHY THIS WORK ORDER EXISTS:

- WO-012: D1.
- WO-013: D2.
- WO-014: D7.
- WO-015: D8.
- WO-016: D13.
- WO-017: D16.
- WO-018: D3, D4 and D5.
- WO-019: D17, D18 and D19.
- WO-020: D9, and the name portions of D12 and D15.
- WO-021: D10.
- WO-022: D6, D14, and the focus portions of D12 and D15.
- WO-023: D11.
- WO-024: D20.

## Implementation progress

Implementation progress is separate from approval status (see Work-order conventions). As of 2026-10-13:

- WO-001 — IMPLEMENTED AND MERGED
- WO-002 — IMPLEMENTED AND MERGED
- WO-003 — IMPLEMENTED AND MERGED
- WO-004 — IMPLEMENTED AND MERGED
- WO-005 — IMPLEMENTED AND MERGED
- WO-006 — IMPLEMENTED AND MERGED
- WO-006A — IMPLEMENTED AND MERGED
- WO-007 — IMPLEMENTED AND MERGED
- WO-008 — IMPLEMENTED AND MERGED
- WO-009 — IMPLEMENTED AND MERGED
- WO-010 — IMPLEMENTED AND MERGED
- WO-011 — INITIAL VERIFICATION COMPLETE; REMEDIATION REQUIRED; FINAL RERUN PENDING
- WO-012 — NOT STARTED
- WO-013 — NOT STARTED
- WO-014 — IMPLEMENTED AND MERGED
- WO-015 — NOT STARTED
- WO-016 — IMPLEMENTED AND MERGED
- WO-017 — NOT STARTED
- WO-018 — NOT STARTED
- WO-019 — IMPLEMENTED AND MERGED
- WO-020 — IMPLEMENTED AND MERGED
- WO-021 — IMPLEMENTED AND MERGED
- WO-022 — IMPLEMENTED AND MERGED
- WO-023 — IMPLEMENTED AND MERGED
- WO-024 — NOT STARTED

**Cross-work-order clarification (2026-10-05).** WO-003's availability-revalidation rule remains valid. After WO-004, already-unavailable Products cannot be added to Cart, so the canonical demo no longer naturally reaches the "became unavailable after add-to-cart" branch. Deterministic coverage of that race condition is assigned to WO-006's Checkout test environment. See WO-006 requirement 24.

## Work-order conventions

These apply to every work order below.

**Statuses**

- **APPROVED FOR IMPLEMENTATION:** every requirement derives from the approved documents. It can run once its dependencies are complete.
- **PENDING DECISION:** at least one requirement needs a decision the approved documents don't make. The missing decisions are listed under STATUS. Record each answer in the authoritative document (the rules, the specification or DEMO_DATA.md) first; the work order is then updated and can become APPROVED FOR IMPLEMENTATION.
- Approval status is separate from implementation progress, which is recorded under Implementation progress.

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
- Active-discount presentation on the Buyer-facing surfaces within its scope, including Product Post Detail (requirements 13–17).

**OUT OF SCOPE.**

- Marketplace Search (§8).
- The Shop tab, whose content the specification doesn't define.
- Saved and Collections screens (§9), beyond the Save action.
- Product Post Detail itself, apart from its active-discount presentation (requirements 15–16).
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
13. Where Buyer-facing discovery or Product presentation handled by WO-004 displays a Product with an active canonical discount, the Buyer UI must display the canonical active discounted price consistently. Where appropriate, show both: current discounted price and regular/original price using the existing design system (DD *Discounts*).
14. WO-004 owns Buyer-facing discount PRESENTATION. It does not own Checkout calculation. Do not invent discount values. Use src/demo-data / DEMO_DATA only.
15. WO-004 owns consistent active-discount presentation on Buyer-facing surfaces within its scope, including:
    - Buyer Home / discovery presentation;
    - Discounts channel;
    - Product cards touched by WO-004;
    - Product Post Detail.
16. When a Product has an active canonical discount: Product Post Detail must display the canonical active discounted price. Where appropriate, it must also display the regular/original price using the existing design system. Do not invent discount values. Use canonical DEMO_DATA / src/demo-data values. This remains PRESENTATION behavior (DD *Discounts*).
17. WO-006 continues to own:
    - Cart effective price;
    - Checkout effective price;
    - subtotal calculation;
    - surcharge calculation;
    - payment-summary correctness.

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

1. Requirements 1–17 hold.
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

It also provides a deterministic Checkout testing environment on the three demo Sellers, without redesigning the Checkout architecture: session-only Scenario A (one Seller), Scenario B2 (two Sellers) and Scenario B3 (three Sellers, with sequential payments and partial completion).

**WHY THIS WORK ORDER EXISTS.**

- §13–§17, §51, §52, §56 and Flows C and D in §59 define checkout, together with R4.1–4.7, R5.1–5.9 and R6.9. DD *Seller Orders* holds `ADU-24091`, `ADU-24092` and the payment attempts.
- The audit found a flat ETB 14 surcharge and Order identifiers that collided across surfaces.
- The original Figma correction list's Checkout order, Correction Work Order 03 "Complete Checkout Test Data and Flows", asked for a deterministic Checkout testing environment. On 2026-10-04 its scenarios were reconciled with DD as session-only test runs on valid, in-stock Products. That list's numbering isn't this document's: the Checkout work is WO-006, and WO-003 remains Guest Buyer Authentication States.

**DEPENDENCIES.**

- WO-001, WO-003 (sign-in before ordering, R3.3 and R3.7) and WO-004 (Flow C starts in For You).

**IN SCOPE.**

- **Flow C:** For You → `SHP-AA-001` → hotspot `PRD-AA-001` → Size M, Natural → Add to Cart → Checkout → Courier Delivery → price breakdown → payment → `ADU-24091` Paid, ETB 2,642.25.
- **Flow D:** `PRD-AA-001` ×1 and `PRD-NG-001` ×1 → two Seller carts → Checkout coordinator → separate Seller Orders `ADU-24091` and `ADU-24092`. Nura Glow's first attempt, `PAY-24092-01`, fails at 10:06, and the retry, `PAY-24092-02`, is Paid at 10:07.
- The Buyer screens Seller-specific Cart, Multi-cart summary, Checkout, Gateway transition, Payment Processing and Payment Success (§12, §14–§16), plus the payment Failed and Retry states (§16, §56).
- Session-only Checkout test runs: Scenario A (one Seller), Scenario B2 (two Sellers) and Scenario B3 (three Sellers), with sequential payments, partial completion, a paid example of each fulfilment mode and a prototype-only scenario control (requirements 12–23).
- A deterministic, transient availability-race Checkout test that demonstrates WO-003's revalidation rule: a Product that is purchasable when added becomes unavailable while it is in the Cart (requirement 24).

**OUT OF SCOPE.**

- A test framework or automated tests.
- `ADU-24093`'s purchase through Search, which isn't a guided flow.
- Fulfilment and handoff (Flows G and H).
- Any real payment provider.
- Redesigning the Checkout architecture.
- The Collection QR final handoff, which belongs to WO-006A: a Buyer Collection test stops at its Checkout/payment outcome.
- Recording test runs in DD: like the guest's temporary Cart, they're session state (R3.12).

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
10. When a Product has an active canonical discount and participates in Cart/Checkout (DD *Discounts*):
    - Cart must use the canonical effective Product price;
    - Checkout must use the same effective price;
    - Product subtotal must use that price;
    - the 0.5% Buyer surcharge must use the actual Product subtotal according to the existing canonical surcharge rules (R5.6–5.8);
    - payment summary must reconcile with Checkout;
    - regular price must not silently replace the active discounted price during the transaction.
11. WO-006 owns discount TRANSACTIONAL correctness. Do not change the existing historical Orders whose approved totals predate or do not use the active discounts (DD *Seller Orders*).
12. Scenarios A, B2 and B3 are deterministic, session-only Checkout test runs on the three demo Sellers. Their carts, Seller Orders and payment attempts are transient prototype session state, like the guest's temporary Cart (R3.12): they never become DD records and change no canonical stock, totals or metrics. Flows C and D still produce `ADU-24091` and `ADU-24092` exactly as DD records them.
13. `TEST-*` Orders must not appear in normal canonical Buyer Orders history, Seller Console Orders, Seller Insights, Courier statistics, Reviews, Claims or DEMO_DATA aggregates, unless a later approved work order explicitly requires a test-mode view. They exist only within the active Checkout testing scenario. Resetting the prototype or the test scenario removes them.
14. Test Seller Orders use scenario-scoped transient references, and no reference is reused between different scenarios: Scenario A `TEST-A-01`; Scenario B2 `TEST-B2-01` and `TEST-B2-02`; Scenario B3 `TEST-B3-01`, `TEST-B3-02` and `TEST-B3-03`. These are prototype-session references only, labelled as prototype test Orders. They are not production IDs and are not DEMO_DATA Orders, and they never use `ADU-` numbers.
15. Payment attempt identity stays separate from Seller Order identity: each attempt is referenced `TESTPAY-`, then its Order's scenario and number, then the attempt number. For Order `TEST-B3-02` in the partial-completion run: first attempt `TESTPAY-B3-02-01`, FAILED; retry `TESTPAY-B3-02-02`, SUCCESS. A payment retry must remain attached to the same Seller Order. Do not create a second Seller Order merely because payment failed (R5.9).
16. Scenario A, one Seller: Maya's Addis Atelier cart holds the Linen Overshirt (`PRD-AA-001`) M/Natural ×1 and the Wide-Leg Trousers (`PRD-AA-002`) M/Charcoal ×1. Product → Add to Cart → Addis Atelier Cart → Checkout → choose fulfilment → payment → Paid Seller Order `TEST-A-01`, paid by `TESTPAY-A-01-01`. Make all buttons functional. Either of Addis Atelier's fulfilment options can be chosen and paid (DD *Sellers*):
    - Courier Delivery: Products 4,550.00 + Courier Delivery 180.00 + Adulis surcharge 22.75 = 4,752.75;
    - Buyer Collection: Products 4,550.00 + Buyer Collection (free) + Adulis surcharge 22.75 = 4,572.75.
17. Scenario B2 — Two-Seller Checkout: Your Carts shows ADDIS ATELIER (Linen Overshirt M/Natural ×1, ETB 2,450) and NURA GLOW (Hydrating Face Cream 50 ml ×1, ETB 1,350; Lip Tint Rose ×1, ETB 750), with the same canonical Products, variants, prices and fulfilment as the corresponding carts in Scenario B3. The two Seller carts produce two independent Seller Orders and two independent payment operations. Do not create one marketplace-wide Order (R4.1–4.3, §14):
    - `TEST-B2-01`, Addis Atelier, Courier Delivery: 2,450.00 + 180.00 + 12.25 = 2,642.25, paid by `TESTPAY-B2-01-01`;
    - `TEST-B2-02`, Nura Glow, Seller Delivery: 2,100.00 + 120.00 + 10.50 = 2,230.50, paid by `TESTPAY-B2-02-01`.
18. Scenario B3 — Three-Seller Checkout: Your Carts shows ADDIS ATELIER (Linen Overshirt (`PRD-AA-001`) M/Natural ×1, ETB 2,450), NURA GLOW (Hydrating Face Cream (`PRD-NG-001`) 50 ml ×1, ETB 1,350; Lip Tint (`PRD-NG-002`) Rose ×1, ETB 750) and VOLT HOUSE (Phone Stand (`PRD-VH-003`) Grey ×1, ETB 650). The Buyer may coordinate Checkout from one multi-cart UI, but each Seller produces a separate Seller Order. Do not produce one marketplace-wide Order (R4.1–4.3, §14):
    - `TEST-B3-01`, Addis Atelier, Courier Delivery: 2,450.00 + 180.00 + 12.25 = 2,642.25;
    - `TEST-B3-02`, Nura Glow, Seller Delivery: 2,100.00 + 120.00 + 10.50 = 2,230.50;
    - `TEST-B3-03`, Volt House, Seller Delivery: 650.00 + 100.00 + 3.25 = 753.25.
19. Scenario B3 prototypes multiple payments in sequence clearly: Seller Order 1 → Payment → Success, then "1 of 3 orders paid"; Seller Order 2 → Payment → Success, then "2 of 3 orders paid"; Seller Order 3 → Payment → Success; finally "Your orders are confirmed", showing the 3 separate Order references.
20. Scenario B3 also prototypes partial completion: Order 1 — PAID, Order 2 — PAYMENT FAILED, Order 3 — NOT YET PAID, with Retry Order 2: `TESTPAY-B3-02-01` failed, and the retry `TESTPAY-B3-02-02` succeeds on the same Order, `TEST-B3-02` (R5.9). Do not roll back already successful independent Seller Orders merely because another Seller payment failed (R4.3).
21. Each fulfilment mode has a testable Checkout/payment example (§15): Buyer Collection and Courier Delivery in Scenario A; Courier Delivery for `TEST-B2-01` and `TEST-B3-01`; Seller Delivery for `TEST-B2-02`, `TEST-B3-02` and `TEST-B3-03`. Courier Delivery shows the Products subtotal, the Courier Delivery charge, the Adulis 0.5% surcharge and the Total. Buyer Collection shows its approved fulfilment charge according to DD (free), and Seller Delivery uses the Seller's approved DD charge (Nura Glow ETB 120.00, Volt House ETB 100.00). Volt House offers Courier Delivery only from 16:30. Do not invent prices or charges (DD *Sellers*).
22. WO-006 may test Buyer Collection → price breakdown → payment → payment success using a `TEST-*` Order. This doesn't create a canonical Buyer Collection Order in DD and doesn't resolve WO-006A: the pending canonical Maya Buyer Collection scenario is required only before WO-006A implements the normal Buyer-app final Collection Handoff. WO-006 stops the Buyer Collection test after the Checkout/payment outcome and doesn't simulate the Collection QR final handoff.
23. A prototype-only control labelled "PROTOTYPE NAVIGATION — NOT PRODUCTION UI" (§61) loads the Scenario A, Scenario B2 or Scenario B3 carts and, for Scenario B3, picks "All payments succeed" or "Order 2 payment fails". It's listed among the Prototype Guide's prototype-only controls (§2) and is never a Buyer feature.
24. A deterministic, transient Checkout test for availability revalidation demonstrates WO-003's already-approved revalidation rule (R3.11, §12) through this Checkout testing environment. It tests the legitimate race: the Product is purchasable when added → the Product enters the Cart → before Checkout confirmation, the test scenario changes that Product's availability → Checkout revalidates → the Buyer is told that the Product is no longer available → Checkout cannot proceed with the invalid line. It is additional coverage: Scenarios A, B2 and B3 and requirements 1–23 are unchanged.
    - The Product must be purchasable when it is initially added to the Cart.
    - The availability change happens only after the Product is already in the Cart.
    - The availability change is transient prototype/test-session state (R3.12).
    - Do not edit a canonical DEMO_DATA Product record merely to create this race.
    - Do not make an already-out-of-stock Product addable.
    - Revalidation must identify the affected Product.
    - Do not silently substitute another Product, silently change the Variant, silently change the quantity, or silently remove the line without telling the Buyer.
    - Checkout stays blocked for that Seller cart until the invalid line is resolved according to the test UI.
    - The scenario does not create a Seller Order merely because revalidation ran.
    - No payment attempt is created until the cart passes revalidation.
    - Other Seller carts remain independent (R4.1–4.3).
    - Reset removes the transient availability override and restores the canonical demo state (R3.12).
    - Do not assign a production Order ID. Do not turn the transient availability override into canonical Inventory truth.

**DATA REQUIREMENTS.**

- DD *Products* (prices and variants), DD *Sellers* (fulfilment options and charges), DD *Buyer* (delivery address detail), and DD *Seller Orders* (`ADU-24091`, `ADU-24092`, and the payment references and attempts).
- The test runs use only DD *Products* (`PRD-AA-001`, `PRD-AA-002`, `PRD-NG-001`, `PRD-NG-002` and `PRD-VH-003`, with their variants and prices) and DD *Sellers* (fulfilment options and charges).

**VISUAL / UX REQUIREMENTS.**

- The existing checkout layouts.
- §56 states: Processing, Failed with a Retry action, and Paid.
- §57 accessibility, at 390 px and 360 px (§4).
- The test runs reuse the existing Seller-specific Cart, Your carts, Checkout and payment screens.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Prices, totals and payment attempts come from the WO-001 module; no screen computes its own surcharge.
- No test framework.
- Test runs compute their totals with the WO-001 module's money rules (the surcharge is 0.5% of the Products subtotal, R5.6–5.8) and keep their carts, Orders and payment attempts in session state; resetting the prototype or the test scenario clears them (R3.12).

**VALIDATION.**

- Type-check and build pass.
- Run Flows C and D in the browser and compare every amount, identifier, attempt and time with DD.
- Check that the surcharge is separate and that all wording is per Seller.
- From the prototype-only control, run Scenario A with each Addis Atelier fulfilment option, Scenario B2 and both Scenario B3 outcomes, and compare every item, amount, reference, attempt and progress message with requirements 12–23.
- Choose each fulfilment mode: Buyer Collection, Seller Delivery and Courier Delivery each complete payment on a `TEST-*` Order, and the Buyer Collection test stops at its payment outcome.
- Check that no `TEST-*` Order appears in Buyer Orders history, Seller Console Orders, Seller Insights, Courier statistics, Reviews or Claims, and that resetting the prototype or the test scenario removes every test run while `ADU-24091` and `ADU-24092` stay unchanged.
- Run the availability-race test (requirement 24): add a purchasable Product, let the test scenario change its availability while it is in the Cart, and confirm that revalidation names the Product and blocks that Seller cart until the line is resolved, with nothing silently changed, no Seller Order and no payment attempt, the other Seller carts independent, and the canonical state restored on reset.

**ACCEPTANCE CRITERIA.**

1. Flow C finishes with `ADU-24091` Paid at ETB 2,642.25.
2. Flow D finishes with two separate Paid Orders, `ADU-24091` and `ADU-24092`, at DD's totals, after the failed attempt and the retry.
3. Single-Seller Checkout is fully clickable.
4. Two-Seller Checkout is testable.
5. Three-Seller Checkout is testable.
6. Seller Orders stay independent.
7. Sequential payment progress is understandable.
8. Payment failure in one Seller Order does not rewrite successful payments.
9. Requirements 1–23 hold.
10. The standard checks pass.
11. Requirement 24 holds: in the availability-race test, the Buyer is told which Product is no longer available, and Checkout cannot proceed with that line.

**REQUIRED COMMANDS.** The standard commands.

**COMPLETION REPORT FORMAT.** The standard report, plus screenshots of each price breakdown, of the failed and retried payment, and of Scenario B3's payment progress and partial completion.

### WO-006A — Buyer Final Handoff Verification

**STATUS.** APPROVED FOR IMPLEMENTATION. Its decision, the canonical Maya Buyer Collection scenario, was recorded in DEMO_DATA on 2026-10-05 (DD *Seller Orders*, DD *Story timeline*, DD *Demo flows and the records they use*). WO-006A's Buyer Collection final Handoff uses exactly this scenario:

- Buyer: Maya (`BUY-MAYA-TESFAYE`), who receives the Order herself; no authorized recipient.
- Order: `ADU-24094`. Payment: `PAY-24094-01`, its one provider-confirmed attempt.
- Seller: Addis Atelier (`SEL-ADDIS-ATELIER`). Product: `PRD-AA-002` Wide-Leg Trousers, M / Charcoal ×1. Total ETB 2,110.50.
- Fulfilment mode: Buyer Collection, at Addis Atelier's Bole studio. No Courier.
- Timestamps, 2 October 2026: Paid 17:30 → Preparing 17:40 → Ready for Collection 17:50 → Collection Handoff 17:55 → Completed 17:56.
- Collection QR handoff: the Seller displays and Maya scans. At 17:55 Abel T. (`STF-AA-02`) displays the Collection QR at the Bole studio; at 17:56 Maya scans it. The final Handoff is recorded on `ADU-24094` itself, with no separate Handoff identifier.
- OTP fallback context: if the QR scan can't complete, Maya enters the verification code sent to her phone. DEMO_DATA records no OTP or Manual Verification event; the canonical success is QR.
- Completion state: Completed at 17:56, by the verified final Collection Handoff only.
- Review Grant: Maya is eligible for review from 17:56; not reviewed. That per-Order eligibility is the dataset's one Review Grant for her, with no separate Review Grant identifier.
- Affected canonical aggregates: Addis Atelier's completed Orders reach 130 from 17:56. Nothing at or before 17:20 changes.
- Flow: M — Buyer Collection Final Handoff, mapped in DEMO_DATA only; WO-006A implements its screens.

Do not use another Buyer's Order in Maya's Buyer app:

- `ADU-23952` must not be used as Maya's Order;
- `ADU-24041` must not be used as Maya's Order;
- another Buyer's Order must never be exposed in Maya's Buyer app.

**OBJECTIVE.** Complete the Buyer/delegate side of the canonical final-Handoff flows in the Buyer app. The current prototype Buyer scanner is Courier-specific and does not support the approved Seller Delivery and Buyer Collection final handoffs.

**WHY THIS WORK ORDER EXISTS.**

- R8.7 requires all three physical fulfilment modes to be capable of reaching a verified final Handoff and Order completion. R8.2, R8.8 and R8.9 set who displays each final QR, which the Buyer or an authorized delegate scans, and §19 adds the Buyer's scanner and its verification-code fallback.
- DD *Seller Orders* and DD *Story timeline* record the canonical final Handoffs, including the delegated recipient for `ADU-24092` (DD *Buyer*).
- It records an explicit approved amendment discovered during WO-002 (2026-10-04).

**DEPENDENCIES.**

- Execution position: after WO-006, before WO-007, so WO-001 to WO-006 are complete when it starts. Existing work orders WO-007 to WO-011 aren't renumbered.
- A canonical Maya Buyer Collection scenario approved in DEMO_DATA.md: recorded on 2026-10-05 as `ADU-24094`, Paid 17:30 to Completed 17:56 on 2 October (DD *Seller Orders*, DD *Story timeline*). Satisfied.

**IN SCOPE.**

- The Buyer/delegate side of the final Handoff in the Buyer app, for Courier Delivery, Seller Delivery and Buyer Collection (R8.7–8.10, §12, §19).
- The QR scan as the primary method and OTP as the fallback, for each mode (R8.3–8.4, R8.10).
- Buyer instructions specific to each mode (requirements 1–3).

**OUT OF SCOPE.**

- Manual Verification as Buyer or Seller functionality: it stays Operator-only emergency recovery (R8.5–8.6, §46).
- Everything TECHNICAL CONSTRAINTS rules out.

**IMPLEMENTATION REQUIREMENTS.**

1. **Courier Delivery:** Courier displays Delivery QR → Buyer or authorized delegate scans → verification → Delivery Handoff → Completed. Buyer instructions must refer to the Courier (R4.4, R8.2, §19).
2. **Seller Delivery:** Seller or authorized Seller delivery actor displays Delivery QR → Buyer or authorized delegate scans → verification → Delivery Handoff → Completed. Buyer instructions must refer to the Seller/delivery actor, not the Courier (R4.5, R8.8, §19).
3. **Buyer Collection:** Seller displays Collection QR → Buyer or authorized delegate scans → verification → Collection Handoff → Completed. Buyer instructions must refer to the Seller/collection handoff (R4.6, R8.9, §19).
4. For all supported final Handoff modes: QR is primary. OTP is fallback. Manual Verification is Operator-only emergency recovery (R8.3–8.6, R8.10, §19).
5. Do not instruct the Buyer to obtain the OTP from the Courier. Use approved canonical recipient/OTP information from DEMO_DATA. For the current primary Buyer scenario, wording may state: "Enter the verification code sent to your phone." Where an approved delegated-recipient scenario applies, use the approved recipient data rather than inventing a new OTP-routing policy (R10.1–10.2; DD *Buyer*).

**DATA REQUIREMENTS.**

- DD *Buyer* (Maya, and Liya Tesfaye as the delegated recipient for `ADU-24092` only), DD *Seller Orders* (each Order's state history, and who displays and who scans each final QR) and DD *Story timeline*.
- For Buyer Collection, the canonical Maya Buyer Collection scenario `ADU-24094` (DD *Seller Orders*): Paid 17:30, Ready for Collection 17:50, Collection Handoff 17:55 and Completed 17:56 on 2 October (DD *Story timeline*), and Flow M (DD *Demo flows and the records they use*). Another Buyer's Order is never exposed in Maya's Buyer app.

**VISUAL / UX REQUIREMENTS.**

- The existing Buyer app layout and components.
- The §56 Handoff states: Ready, QR Active, Verifying, Verified, Failed and OTP fallback.
- §57 accessibility, at 390 px and 360 px (§4).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- WO-006A must not:
  - add live/background GPS;
  - add Courier pickup behavior to Seller Delivery;
  - add Courier-specific states to Seller Delivery or Buyer Collection;
  - change Seller-side handoff direction;
  - introduce a new payment flow;
  - redesign unrelated Buyer navigation;
  - resolve production Account architecture.
- Reuse existing QR/OTP/Handoff primitives where possible.

**VALIDATION.**

- WO-006A must verify:
  - Courier Delivery instructions are Courier-specific;
  - Seller Delivery instructions are Seller-specific;
  - Buyer Collection instructions are collection-specific;
  - Buyer/delegate scans the giver's displayed QR;
  - QR can complete the appropriate Handoff;
  - OTP fallback can complete the same Handoff;
  - no screen tells the Buyer to get an OTP from the Courier unless that is explicitly supported;
  - Manual Verification remains Operator-only;
  - canonical Order state reaches Completed correctly;
  - delegated-recipient behavior remains consistent with DEMO_DATA;
  - no unrelated Buyer behavior changes.
- Use the standard type-check, build, canonical checkers, source scan and visual/smoke gates.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–5 hold.
2. Every item WO-006A must verify (VALIDATION) is verified, with evidence.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus the canonical checkers, the source scan and the visual/smoke gates.

**COMPLETION REPORT FORMAT.** The standard report.

### WO-007 — Full Responsive Layout Repair

**STATUS.** APPROVED FOR IMPLEMENTATION.

**OBJECTIVE.** Every prototype section lays out without unintended horizontal scrolling or clipped content at its relevant audit widths, following §4's smaller-width behaviour for the consoles and the prototype shell.

**WHY THIS WORK ORDER EXISTS.**

- §3 requires consistent responsive behaviour and 44 × 44 px touch targets. §4 sets the target widths, the audit widths and the smaller-width behaviour, and §62 expects coherent responsive behaviour.
- The audit measured overflow on several surfaces: Company Website pages with no 390 px layout, the Seller Console at phone widths, and the Operator Console from 1024 px to 1440 px. It also found the flow-guide card covering the Buyer bottom navigation.

**DEPENDENCIES.**

- WO-001 to WO-006A in execution order, so the repair follows the content and structure changes. WO-007 must start only after the Buyer final-Handoff implementation (WO-006A) is complete.

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

**STATUS.** APPROVED FOR IMPLEMENTATION. It runs last and can't start until WO-001 to WO-010, including WO-006A, are complete.

**OBJECTIVE.** After WO-001 to WO-010, including WO-006A, verify the whole prototype against the approved documents and report every defect, without fixing any.

**WHY THIS WORK ORDER EXISTS.**

- §63 requires every audit item to be verified, with any violation corrected before the prototype counts as complete.
- §64 describes the expected result, and R18.1–18.2 require consistency across surfaces.

**DEPENDENCIES.**

- WO-001 to WO-010, including WO-006A, all complete.

**IN SCOPE.**

- All 36 §63 audit items.
- All 116 canonical rules (R1.1 to R18.2), each checked on the surfaces it governs.
- §60: nothing deferred is presented as current MVP.
- Flows A–L (§59) with DD's exact record mappings, at their documented times (DD *Demo flows and the records they use*).
- WO-006A's Buyer final Handoffs, regression-tested as part of the completed prototype.
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

### WO-012 — Website Account Deletion Verification Gate

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P0.

**OBJECTIVE.** An anonymous Company Website visitor can't go from the Account Deletion page to a deletion request. The request needs the purpose-bound deletion verification first: phone number, 6-digit OTP, and a short-lived deletion capability for this flow only. A preview of the consequences and an explicit confirmation follow, and the page shows the Platform's result. Public Website browsing stays anonymous, with no general Website login.

**WHY THIS WORK ORDER EXISTS.**

- R3.5 requires account-bound actions to request authentication, and R3.7 requires it for Account settings. Deleting an Account is account-bound and destructive.
- §12 (Company Website verification, recorded on 2026-10-08) defines the flow: phone number → 6-digit OTP → deletion verification succeeds → a short-lived deletion capability for this deletion flow only → preview of the consequences → explicit confirmation → the Platform's result. In the prototype the verification resolves to the demo Buyer, Maya Tesfaye, and at the 10:25 story snapshot her active Orders block the deletion.
- WO-011's initial verification run (2026-10-08) found defect D1 (checklist item R3.5). An anonymous visitor could continue to the deletion steps, type DELETE and get "Account deletion requested.", with no verification and no Account identified.

**DEPENDENCIES.**

- WO-003: the Buyer app's prototype sign-in (phone number, Continue, 6-digit code) and its validation, reused here as a pattern.
- WO-007: the Website's layouts at the §4 widths, including its 390 px layout and 390 px preview.

**IN SCOPE.**

- Company Website › Account Deletion, in the desktop layout, the 390 px layout and the 390 px preview.
- The deletion verification (phone number and 6-digit OTP) and the short-lived deletion capability it gives.
- The preview of the consequences, the explicit confirmation and the Platform's result.
- Phone and OTP screens that WO-013 can reuse without sharing any capability.

**OUT OF SCOPE.**

- A general Website login, a persistent Website session, a Website-owned Account and a shared Website account session (§12).
- Real authentication, real deletion, a production backend session and retention policy (§12, §61).
- The account architecture and account roles (R17.1–17.2, §61).
- Report Content (WO-013), the Website's copy corrections (WO-018) and the focus styling of the Website's existing fields (WO-022).
- The Buyer app's Account Settings and Account deletion screens.
- Any change to DEMO_DATA.md.

**IMPLEMENTATION REQUIREMENTS.**

1. Without a valid deletion capability, the Account Deletion page offers no way to request deletion: no reason step, no typed DELETE confirmation, no Delete My Account and no deletion result. Its action starts the deletion verification (R3.5, R3.7, §12).
2. The verification is phone number → 6-digit OTP. An incomplete entry shows a validation message, as the Buyer app's prototype sign-in does (§12, §56).
3. No Account ID is asked for or accepted from the visitor: the verification identifies the Account (§12).
4. Successful verification gives a short-lived deletion capability that only this deletion flow uses. It resolves deterministically to the demo Buyer, Maya Tesfaye (DD *Buyer*), and creates no Website Account record (§12).
5. With the capability, the visitor sees the preview of the consequences, then the explicit confirmation: the existing reason, the typed DELETE and Delete My Account. Only the explicit confirmation requests deletion.
6. The result is the Platform's. At the 10:25 story snapshot Maya has active Orders (DD *Story timeline*: `ADU-24091` and `ADU-24093` Paid, `ADU-24092` Preparing). So the page shows "deletion requested, but currently blocked by active Orders" (§12), and nothing says the Account will be deleted. The Website section calculates no blockers itself.
7. The deletion capability authorizes nothing else. It isn't accepted by Report Content (WO-013), authorizes no Buyer or Seller commerce action, and never becomes a general Website login or session (§12).
8. The capability is transient prototype state that ends with its flow. Cancelling, leaving the page, finishing the flow, resetting the prototype or reloading returns the Website to the anonymous state, with nothing further requested. It is never a canonical record (§12).
9. Nothing names a role or chooses an account type (§61, R17.1).
10. Requirements 1–9 hold in the desktop layout, the 390 px layout and the 390 px preview.

**DATA REQUIREMENTS.**

- DD *Buyer* (Maya Tesfaye) and the states of her Orders at 10:25 (DD *Seller Orders*, DD *Story timeline*), read only.
- No new demo record and no Website Account record.

**VISUAL / UX REQUIREMENTS.**

- The existing Website layout, components, buttons and field styles (the Figma baseline), in the Website's inline-style idiom.
- §57: every new control is named and keyboard-reachable, shows the global keyboard focus indicator without suppressing it, and is at least 44 × 44 px at phone widths.
- The §4 widths: 360, 390, 430, 768, 1024, 1280, 1440 and 1920, with no overflow or clipping.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Transient session state only, with no new dependency. Surfaces share no state, so the Buyer app's sign-in is reused as a pattern, not as shared state.
- Keep the Website's class hooks and the markup its responsive rules select on.

**VALIDATION.**

- Type-check, build and the documentation checkers (`run-all.cjs`) pass.
- A focused browser checker, at every Website width and in the 390 px preview:
  - an anonymous visitor never reaches the confirmation or a deletion result without verification;
  - an incomplete phone number or code shows the validation message;
  - after verification come the preview, the confirmation and then "deletion requested, but currently blocked by active Orders", never a statement that the Account will be deleted;
  - cancelling, leaving and reloading each return to the anonymous state with nothing requested;
  - no Account ID can be entered.
- **Red/green.** On the f868fc4 reference build the anonymous-request check fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - the gate removed;
  - an incomplete code accepted;
  - cancelling treated as verified;
  - the confirmation reachable before verification;
  - the capability surviving a reload;
  - a successful deletion shown at 10:25;
  - an Account ID accepted from the visitor.
- **Earlier suites:** WO-003 (the Buyer app's sign-in, unchanged), the WO-007 audit for the Website, and WO-011's checklist item R3.5.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–10 hold at every §4 width and in the 390 px preview.
2. No path without verification produces a deletion request.
3. WO-011's checklist item R3.5 passes on the candidate.
4. Outside Account Deletion, the Website renders as at f868fc4, apart from accepted noise.
5. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the red/green and mutation results, and screenshots at 390 and 1440 of the anonymous page, the verification, the preview, the confirmation and the blocked result.

### WO-013 — Website Content Report Account Verification Gate

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P0.

**OBJECTIVE.** A guest can view the Company Website's Report Content page but can't submit a Report. Submission needs the purpose-bound report verification: phone number, 6-digit OTP, a verified Account and a short-lived report-submission capability. The capability is separate from WO-012's deletion capability.

**WHY THIS WORK ORDER EXISTS.**

- R3.7 requires authentication for Report submission, and §7 says: "Guest users cannot submit a content Report (rule 3.7)."
- §12 (Company Website verification, recorded on 2026-10-08) defines the Report flow: phone number → 6-digit OTP → verified Account → a short-lived report-submission capability → the Report form is submitted. It also says the deletion and report-submission capabilities are separate, and the two flows may share the phone and OTP screens but never the capability.
- WO-011's initial verification run (2026-10-08) found defect D2 (checklist item R3.7). The form accepted an anonymous Report, asking only for "Your email (optional — for follow-up)", and showed "Report submitted." with no verification.

**DEPENDENCIES.**

- WO-012, only for its reusable phone and OTP screens and verification state plumbing, not for any authorization (§12).
- WO-003: the Buyer app's Report gate for a guest (§7, §12), applied here as a pattern.
- WO-007.

**IN SCOPE.**

- Company Website › Report Content, in the desktop layout, the 390 px layout and the 390 px preview.
- The report verification and the short-lived report-submission capability it gives.
- Returning to the Report form after verification, and its submission.

**OUT OF SCOPE.**

- Anonymous reporting (R3.7).
- The form's report categories and its other wording.
- Any moderation case, record or queue entry. A submitted Report is session-only, and `MOD-1001` is unchanged.
- The Buyer app's Report flow (WO-003, WO-004).
- A general Website login or session; Account Deletion (WO-012); field focus styling (WO-022).

**IMPLEMENTATION REQUIREMENTS.**

1. A guest can view the Report Content page and fill in the form. Without a valid report-submission capability, Submit Report submits nothing and "Report submitted." never appears; choosing to submit starts the report verification (R3.7, §7, §12).
2. The verification is phone number → 6-digit OTP, with the validation message for an incomplete entry (§12, §56). It reuses WO-012's phone and OTP screens. No Account ID is asked for or accepted (§12).
3. Successful verification gives a short-lived report-submission capability that only Report Content uses. The visitor returns to the Report form with the entries already made kept where practical (content type, link or description, reason and detail), and submits it (§7).
4. The report-submission capability and WO-012's deletion capability are separate. A deletion verification doesn't let a Report be submitted, and a report verification doesn't open the deletion confirmation (§12).
5. The capability authorizes no Buyer or Seller commerce action and never becomes a general Website login or session. It ends with its flow: submitting the Report, cancelling, leaving, resetting the prototype or reloading returns the visitor to the guest state (§12).
6. A submitted Report is transient prototype state and creates no canonical record (DD *Moderation* unchanged).
7. Requirements 1–6 hold in the desktop layout, the 390 px layout and the 390 px preview.

**DATA REQUIREMENTS.**

- No new demo record and no Website Account record.
- `MOD-1001` and the Moderation queue are unchanged (DD *Moderation*).

**VISUAL / UX REQUIREMENTS.**

- The existing Website layout, components and field styles, in the Website's inline-style idiom.
- §57: every new control is named and keyboard-reachable, shows the global keyboard focus indicator without suppressing it, and is at least 44 × 44 px at phone widths.
- The §4 widths, with no overflow or clipping.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Transient session state only, with no new dependency.
- Reuse WO-012's phone and OTP screens rather than duplicating them, with a separate capability.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused browser checker, at every Website width and in the 390 px preview:
  - a guest's Submit Report starts verification and never shows "Report submitted.";
  - an incomplete entry shows the validation message;
  - after verification the entries survive where practical and the Report submits;
  - cancelling submits nothing;
  - a deletion verification doesn't allow a Report, and a report verification doesn't open the deletion confirmation;
  - after one submission, another Report needs verification again.
- **Red/green.** On the f868fc4 reference build the guest-submission check fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - the gate removed;
  - submission allowed when the optional email is filled in;
  - the deletion capability accepted for a Report;
  - the report capability accepted for deletion;
  - the capability kept after submission or a reload;
  - cancelling treated as verified.
- **Earlier suites:** WO-012's focused checker and mutation test; WO-003 and WO-004 (the Buyer app's Report gate, unchanged); the WO-007 audit for the Website; WO-011's checklist item R3.7.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold at every §4 width and in the 390 px preview.
2. No path without the report verification produces "Report submitted."
3. WO-011's checklist item R3.7 passes on the candidate.
4. Outside Report Content and the phone and OTP screens it shares with WO-012, the Website renders as at f868fc4, apart from accepted noise.
5. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the red/green and mutation results, and screenshots at 390 and 1440 of the guest page, the verification, the form after verification and the submitted Report.

### WO-014 — Shoppable Post FYP Availability Eligibility

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P1.

**OBJECTIVE.** Seller Console › Create Shoppable Post presents For You eligibility from the tagged Products' current availability. A Shoppable Post with no currently available tagged Product is never shown as For You eligible, and the editor says why, in the approved wording.

**WHY THIS WORK ORDER EXISTS.**

- R1.7: "A Shoppable Post with zero currently eligible Products is not eligible for For You discovery." R1.6 still allows it to be published, R1.8 keeps it published when availability is lost, and §56 lists "Published but not FYP Eligible".
- DD *Shoppable Posts*: `SHP-AA-005`, tagged only with `PRD-AA-005` (Out of Stock since 24 September), is "Not eligible: tagged Product out of stock". `SHP-NG-003`, whose tagged Product is Low Stock, is "Eligible".
- WO-011's initial verification run (2026-10-08) found defect D7 (checklist item R1.7). The editor treated any tag as eligible, so a post tagged only with the out-of-stock Woven Leather Belt showed "FYP Eligible" in the eligibility step, the Preview and the publish confirmation.

**DEPENDENCIES.**

- WO-001: the shared data module's tag-availability rule.
- WO-002: Seller Console › Content for each Seller.
- WO-004: For You eligibility as Buyers see it.

**IN SCOPE.**

- Seller Console › Content › Create Shoppable Post: the eligibility shown in step 05 "Preview and eligibility", in the Preview panel and in the publish confirmation.
- All three Sellers, through the Seller switcher.
- The Seller Console's story moments: 10:25 by default, and 12:30 at Flows E and E2.

**OUT OF SCOPE.**

- Existing posts' detail and the Home "Needs attention" card, which already derive eligibility from the shared module.
- Buyer surfaces (WO-004).
- Publication rules: eligibility never controls publication (R1.6).
- Product availability and the posts in DD.
- A per-Product availability display in the editor's Product list, which no rule requires.
- Renaming the Shoppable Post entity: it keeps its current name in this remediation cycle.

**IMPLEMENTATION REQUIREMENTS.**

1. The editor's post is For You eligible exactly when at least one tagged Product is currently available at the story moment, by the shared module's rule: the Product exists at that moment and isn't Out of Stock. Low Stock counts as available (R1.7; DD *Shoppable Posts*, `SHP-NG-003`).
2. With no tags, the editor's existing not-eligible states and publish message are unchanged (R1.6).
3. With tags but none currently available, step 05 and the Preview read "For You eligibility: Not eligible — no tagged Product is currently available." Where a publication badge or confirmation is shown, it reads "Published · Not eligible for For You". Nothing shows the post as FYP Eligible.
4. Positive eligibility keeps its existing wording.
5. Publish stays available in every case (R1.6, R1.8).
6. Eligibility follows the story moment: `PRD-AA-006` counts only from 12:30 (DD *Products*).
7. The section keeps no copy of the rule: the editor uses the shared module's rule (R18.2).

**DATA REQUIREMENTS.**

- DD *Products*: `PRD-AA-005` and `PRD-VH-002` are Out of Stock; `PRD-AA-003` and `PRD-NG-004` are Low Stock; `PRD-AA-006` exists from 12:30.
- DD *Shoppable Posts*: `SHP-AA-005`, `SHP-NG-003`, `SHP-AA-006` and `SHP-AA-007`.
- No new record. A post published in the editor is session-only.

**VISUAL / UX REQUIREMENTS.**

- The existing editor and badges, in Tailwind classes.
- The Seller Console at 1440 and 1024, and its drawer layout at phone widths as WO-007 left it.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Availability is read from the WO-001 module at the current story moment.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - **In the browser, at 1440 and 1024:**
    - Addis Atelier with only the Woven Leather Belt tagged: requirement 3's wording in step 05, the Preview and the publish confirmation;
    - the Belt and the Linen Overshirt: FYP Eligible;
    - no tags: unchanged;
    - Volt House with only the Compact Power Bank: not eligible;
    - Nura Glow with only the Vitamin C Serum (Low Stock): eligible.
  - **Module parity:** for every subset of each Seller's taggable Products at 10:25 and at 12:30, the editor's eligibility equals the module's rule.
- **Red/green.** On the f868fc4 reference build "Belt only is not eligible" fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - eligibility back to "any tag";
  - Low Stock treated as unavailable;
  - the story moment ignored;
  - requirement 3's wording replaced;
  - Publish disabled when not eligible.
- **Earlier suites:** WO-004; the WO-001 module checker; WO-011's checklist items R1.5–R1.7 and Flow E; smoke Flows E and E2; the WO-007 audit for the Seller Console.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold at the listed widths and moments.
2. WO-011's checklist item R1.7 passes on the candidate, and R1.5, R1.6 and Flow E still pass.
3. Rendering differs from f868fc4 only in the editor's eligibility states.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the eligibility shown for each case above, and the red/green and mutation results.

### WO-015 — Seller Console Courier Delivery Offer Flow

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P1.

**OBJECTIVE.** In the Seller Console, a Courier Delivery Order at Ready for Courier lets the Seller select an approved Courier and send the Delivery Offer, and the Console then shows "Awaiting Courier acceptance". Only the Courier accepts, and Courier Assigned follows only that acceptance. The Seller Console never simulates the Courier's acceptance.

**WHY THIS WORK ORDER EXISTS.**

- R6.10: PAID → PREPARING → READY → Courier selected / Delivery Offer created → Courier accepts → Pickup Handoff → IN DELIVERY → Final Delivery Handoff → COMPLETED. R6.11 requires Mark Ready first, and R4.4 gives the Courier Delivery timeline. R6.3 allows one active accepted delivery, R6.8 shows the Seller-defined compensation before acceptance, and R7.1–7.4 put the Seller-specific figures first.
- DD *Story timeline*: `ADU-24091` is Ready for Courier at 13:30 and gets a Delivery Offer to Daniel K. (ETB 180.00) at 13:35, which he accepts at 13:37. `ADU-24092` is Ready for Courier at 13:45 and gets its offer at 13:50, which he can't accept while `ADU-24091` is active; he accepts it at 14:58.
- The owner's remediation decisions of 2026-10-08 fix the actor boundary:
  - the Seller marks Ready for Courier and sends the Delivery Offer;
  - the Seller Console then shows "Awaiting Courier acceptance";
  - the Courier receives the Delivery Offer and accepts it, and only then is the Order Courier Assigned;
  - the Seller Console has no "Simulate courier acceptance", and the Seller never accepts on the Courier's behalf;
  - where a demonstration must show the acceptance, it uses the Courier surface or the existing approved Courier flow.
- WO-011's initial verification run (2026-10-08) found defect D8 (checklist item R6.10). On `ADU-24091` at Ready for Courier, "Assign Approved Courier" set Courier Assigned directly, with no Delivery Offer and no acceptance. The Order Detail's prototype fulfilment-state controls can also set Courier Assigned.

**DEPENDENCIES.**

- WO-001: the Orders' offers, the rule that blocks an offer for a Busy Courier, and the state histories.
- WO-002: each Seller's approved Courier pool.
- WO-008: the Courier selection card, both figures, availability as text plus icon, and offer semantics.

**IN SCOPE.**

- Seller Console › Orders › Order Detail for Courier Delivery Orders:
  - the header action;
  - Fulfilment evidence › Courier assignment;
  - the prototype fulfilment-state controls.
- The Courier selection: the Seller's approved pool, showing completed for this Seller (primary), total completed (secondary), availability and compensation.
- The pending-offer state, "Awaiting Courier acceptance".
- The moments of DD's offers and acceptances.

**OUT OF SCOPE.**

- The Seller Companion and the Courier app, which are unchanged (WO-008).
- Seller Delivery and Buyer Collection Orders, which have no Courier (R4.7).
- Dispatch, bidding, wallets and surge pricing (R6.4–6.7, §60).
- Prototype Guide and Master Demo wording (WO-019).
- Any new canonical Courier record.

**IMPLEMENTATION REQUIREMENTS.**

1. At Ready for Courier, the Seller's action is to select an approved Courier and send the Delivery Offer (R6.10). No Seller Console action assigns a Courier directly.
2. The selection lists only the Seller's approved Couriers at the story moment (DD *Courier*):

   | Seller | Approved Couriers |
   |---|---|
   | Addis Atelier | Daniel K., ETB 180.00 |
   | Nura Glow | Daniel K., ETB 150.00 |
   | Volt House | None until Flow F approves Daniel K. at 16:30, at ETB 200.00 |

   Each shows completed for this Seller first, then total completed, availability as text plus icon, and the compensation (R7.1–7.4, R6.8; WO-008).
3. After the offer is sent, the Order stays Ready for Courier. Courier assignment shows "Awaiting Courier acceptance", with the Courier and the offered compensation (R6.8). A Busy Courier can be sent an offer but can't accept it while on an active delivery (R6.3; DD *Story timeline*, 13:50).
4. The Seller Console has no control that accepts the Delivery Offer or simulates the Courier's acceptance, and no Seller-labelled accept action.
5. Courier Assigned comes only from the Courier's acceptance. In the Console that means DD's moments, derived from the shared module. A demonstration of the acceptance uses the Courier surface or the existing approved Courier flow.
6. For a Courier Delivery Order, the prototype fulfilment-state controls give no route to Courier Assigned. They step only through the states the Seller reaches by its own actions: Paid, Preparing and Ready for Courier.
7. At DD's moments, the Order Detail derives the offer and the acceptance from the shared module (DD *Story timeline*):
   - `ADU-24091`: Ready for Courier at 13:30; offer sent at 13:35 and awaiting acceptance; Courier Assigned at 13:37.
   - `ADU-24092`: Ready for Courier at 13:45; offer sent at 13:50 and awaiting acceptance while Daniel K. is busy until 14:52; Courier Assigned at 14:58.
8. No offer can be sent before Mark Ready (R6.11).
9. No other Seller's identity, Orders, compensation or relationships appear (R7.3).

**DATA REQUIREMENTS.**

- DD *Seller Orders*: the histories and offers of `ADU-24091` and `ADU-24092`.
- DD *Courier*: relationships, compensation and counts.
- DD *Story timeline*: 13:30 to 14:58.
- An offer sent in a session at another moment is transient prototype state. DEMO_DATA.md is unchanged, and no Courier record is added.

**VISUAL / UX REQUIREMENTS.**

- The existing Order Detail cards and buttons, and WO-008's card pattern for the selection, in Tailwind classes.
- "Awaiting Courier acceptance" uses the existing status badge. WO-021 defines the shared status-icon mapping it uses.
- The Seller Console at 1440 and 1024, and its drawer layout at phone widths as WO-007 left it.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- The canonical sequence comes from the shared module, not from a copy of the Seller Companion's logic.
- Guided-flow targets are unchanged.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - **In the browser, Addis Atelier's `ADU-24091` at 1440 and 1024:** Start Preparation → Mark Ready → select Daniel K. (41 completed for your store, 64 total, ETB 180.00) → send the Delivery Offer. Then the Order is Ready for Courier with "Awaiting Courier acceptance". It isn't Courier Assigned, there is no accept or simulate control, and no state control reaches Courier Assigned.
  - **Nura Glow's `ADU-24092`:** Daniel K. at ETB 150.00. The Busy case at 13:50 comes from the module.
  - **Module:** the derived offer and acceptance at 13:35, 13:37, 13:50 and 14:58.
- **Red/green.** On the f868fc4 reference build "no Courier Assigned without the Courier's acceptance" fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - the offer step skipped;
  - a Seller accept control or "Simulate courier acceptance" added to the Console;
  - a state control reaching Courier Assigned restored;
  - an unapproved Courier listed;
  - the compensation hidden before acceptance;
  - a Busy Courier able to accept;
  - an offer before Mark Ready.
- **Earlier suites:**
  - WO-008's suite, module checks and mutations: the Seller Companion is unchanged;
  - WO-006A, for handoffs;
  - the WO-001 module checker;
  - WO-011's checklist item R6.10;
  - smoke Flows G and H;
  - the WO-007 audit for the Seller Console.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–9 hold at 1440 and 1024 and at DD's moments.
2. WO-011's checklist item R6.10 passes on the candidate.
3. The Seller Companion is unchanged: WO-008's suite and mutations pass.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus screenshots of the selection, "Awaiting Courier acceptance" and Courier Assigned at a DD moment, and the red/green and mutation results.

### WO-016 — Search Out-of-Stock Product Availability

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P1.

**OBJECTIVE.** Marketplace Search's Product results follow §8's availability filter. The filter is off by default: available Products come first, and every unavailable Product shows "Currently unavailable" and never looks available or purchasable. With the filter on, unavailable Products are excluded.

**WHY THIS WORK ORDER EXISTS.**

- §8: "Out-of-stock Products may remain searchable but should rank below relevant available Products and clearly show: Currently unavailable." §8's availability filter, recorded on 2026-10-08, is off by default and excludes unavailable Products when on. R18.1 requires the same Product to present the same facts everywhere.
- DD *Products*: `PRD-AA-005` Woven Leather Belt and `PRD-VH-002` Compact Power Bank are Out of Stock.
- WO-011's initial verification run (2026-10-08) found defect D13 (checklist item F.01). For the query "linen" at 10:25, Products listed every Product in ID order with a price. The Belt and the Power Bank sat among available Products with no "Currently unavailable", under an "Available" chip shown as active.
- Marketplace Search was out of WO-004's scope, so no earlier work order owned it.

**DEPENDENCIES.**

- WO-001: Product availability at the story moment.
- WO-004: the discovery lists' presentation of an unavailable Product. An out-of-stock Product can be viewed but not bought.

**IN SCOPE.**

- Buyer › Search: the Products tab, and the Products preview on the Top tab.
- The availability filter.
- A guest and signed-in Maya alike (R3.6).
- 10:25, and 12:30 (when `PRD-AA-006` appears).

**OUT OF SCOPE.**

- Query matching and the result corpus.
- The Posts and Sellers tabs, and the Price and Category chips.
- Product Post Detail, which is unchanged.
- Other discovery channels (WO-004).
- Product availability data (DEMO_DATA.md unchanged).

**IMPLEMENTATION REQUIREMENTS.**

1. The availability filter is off by default (§8).
2. With it off, in Products and in Top's Products preview, currently available Products come before unavailable Products, where other ranking conditions don't override the canonical eligibility rules (§8). Each group keeps its current relative order.
3. With it off, unavailable Products may remain in the results. Each one shows "Currently unavailable" and is presented as the discovery lists present an unavailable Product, so it never looks available or purchasable (§8, R18.1; WO-004).
4. With it on, unavailable Products are excluded from the Product results (§8).
5. The filter's state is shown as text and exposed to assistive technology, not by colour alone (§57).
6. Opening an unavailable result opens its Product Post Detail, where it can't be bought (WO-004).
7. Requirements 1–6 hold for a guest and for Maya.

**DATA REQUIREMENTS.**

- DD *Products*: availability and prices.
- DD *Buyer*: the recent searches "linen" and "lip tint", and the zero-result query "tripod".
- No new record.

**VISUAL / UX REQUIREMENTS.**

- The existing Search tabs, chips and Product cards, in Tailwind classes. The filter chip's default look changes from active to inactive, as §8 requires.
- 360, 390 and 430, and the Buyer phone frame at 1440.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Availability comes from the WO-001 module at the story moment, with no copied lists.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker, as a guest and as Maya, at 360, 390, 430 and 1440, at 10:25 and 12:30:
  - the filter is off by default;
  - available Products come first, then unavailable ones;
  - the Belt and the Power Bank show "Currently unavailable", with no purchase affordance;
  - with the filter on they're excluded, and turning it off brings them back;
  - opening the Belt opens a Product Post Detail where it can't be bought;
  - "tripod" still shows zero results.
- **Red/green.** On the f868fc4 reference build the ranking and label checks fail; on the candidate they pass.
- **Mutations**, each of which must be caught:
  - the filter on by default;
  - the ranking dropped;
  - the label dropped;
  - a purchasable presentation restored;
  - the filter on but not excluding;
  - the Top preview left unranked.
- **Earlier suites:** WO-004; WO-003 (guest Search); WO-011's checklist item F.01, with R2.4 and §63.03 still passing; the WO-007 audit for the Buyer app.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold at the listed widths and moments.
2. WO-011's checklist item F.01 passes on the candidate.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the observed Product order with the filter off and on, as a guest and as Maya, at 10:25 and 12:30, and the red/green and mutation results.

### WO-017 — Payment Failure Seller Order Copy

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P1.

**OBJECTIVE.** The System States "Payment failed" card states the failed attempt truthfully: no payment was confirmed, and the existing Seller Order remains in place for the retry.

**WHY THIS WORK ORDER EXISTS.**

- R5.9: "A failed payment attempt and its retry belong to the same Seller Order. A failed attempt never creates a second Seller Order."
- DD *Seller Orders*: `PAY-24092-01` belongs to `ADU-24092` and fails at 10:06, and `PAY-24092-02` pays the same `ADU-24092` at 10:07. There is one Seller Order.
- WO-011's initial verification run (2026-10-08) found defect D16 (checklist item R5.9). The card said "No charge was confirmed and no Seller Order was created.", followed by "The Nura Glow Cart remains saved."

**DEPENDENCIES.**

- WO-001: payment attempts.
- WO-006: Flow D's failed attempt and retry, and the Buyer's own payment-failure screen.

**IN SCOPE.**

- The System States › Buyer › "Payment failed" card's description and detail.

**OUT OF SCOPE.**

- The card's title, its action and its retry outcome, which already says "The previous failed attempt remains recorded."
- The other System States cards.
- Checkout behaviour and the Buyer's own payment-failure screen.

**IMPLEMENTATION REQUIREMENTS.**

1. The card's description reads exactly: "Payment attempt failed. No payment was confirmed. The existing Seller Order remains in place for retry."
2. The card no longer says that no Seller Order was created, in any wording.
3. The card's Cart sentence is removed: the canonical scenario doesn't require it.
4. The case stays `ADU-24092`'s: `PAY-24092-01` failed, the retry `PAY-24092-02` succeeds on that same Seller Order, and there is one Seller Order (R5.9; DD *Seller Orders*).

**DATA REQUIREMENTS.**

- DD *Seller Orders* (payment attempts). No new record.

**VISUAL / UX REQUIREMENTS.**

- The existing card, at the System States section's §4 widths, with no overflow.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker on the captured System States text at every width:
  - the approved description is present;
  - nothing says no Seller Order was created;
  - the card has no Cart sentence;
  - the retry outcome is unchanged.
- **Red/green.** On the f868fc4 reference build these checks fail; on the candidate they pass.
- **Mutations**, each of which must be caught:
  - the old sentence restored;
  - the Cart sentence restored;
  - the approved description altered;
  - the retry outcome changed.
- **Earlier suites:** WO-006 (the Buyer's failure screen and Flow D); WO-011's checklist item R5.9; the WO-007 audit for System States.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–4 hold.
2. WO-011's checklist item R5.9 passes on the candidate.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the card's before and after text.

### WO-018 — Company Website Canonical Copy Corrections

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** The Company Website's copy matches the rules:
- Collections are private, and sharing them isn't advertised;
- at final Courier delivery, the Courier displays the Delivery QR and the Buyer or authorized delegate scans it;
- Adulis Seller admission doesn't require government-issued ID, stated without qualification.

**WHY THIS WORK ORDER EXISTS.**

- WO-011's initial verification run (2026-10-08) found three copy defects:
  - **D3** (checklist items R2.6, §60.23 and §63.36): the For Buyers page's Collections card said "Share collections with friends." This is against R2.6, §9 ("Do not build public Collections in the MVP prototype"), §60 ("public Collection profiles") and DD *Buyer* ("Collections, all private (rule 2.6)").
  - **D4** (checklist items R8.2 and §63.13): the For Sellers page's Courier Fulfilment card said "A Pickup QR verifies collection; the buyer's Delivery QR confirms receipt." This is against R8.2 and §19 ("THIS DIRECTION IS CRITICAL").
  - **D5** (checklist item R13.1, owner-confirmed): Trust & Safety said "We do not require government-issued ID as part of the standard admission process.", and the 390 px note "Adulis does not require government-issued ID as part of the standard seller admission process." R13.1 is unconditional, and R13.2 keeps provider KYC separate.
- The owner approved the replacement copy on 2026-10-08.

**DEPENDENCIES.**

- WO-001.
- WO-003: the Website's account wording stays consistent with the authentication rules.
- WO-006A: the direction wording for the final QR.
- Coordinates with WO-012 and WO-013, which change the same Company Website in separate regions. WO-018 does not wait for them, and verification behaviour is not WO-018's.

**IN SCOPE.**

- The four sentences above, in every layout where they appear.

**OUT OF SCOPE.**

- Any other Website copy, and layout.
- Account Deletion and Report Content (WO-012, WO-013).
- Renaming the Shoppable Post entity: it keeps its current name in this remediation cycle.

**IMPLEMENTATION REQUIREMENTS.**

1. **D3.** The Collections card reads exactly: "Save Product Posts and Shoppable Posts into private Collections and come back to them later." It has no sharing language: no sharing with friends and no public Collections (R2.6, §9).
2. **D4.** The Courier Fulfilment card's QR sentence becomes: "A Pickup QR verifies collection. At final Courier delivery, the Courier displays the Delivery QR and the Buyer or authorized delegate scans it." Nothing calls it the buyer's Delivery QR (R8.2, §19).
3. **D5.** The Trust & Safety sentence and the 390 px note each read exactly: "Adulis does not require government-issued ID for Seller admission. Payment-provider KYC, where required, is separate." Neither is qualified with "standard", "ordinary", "normally" or "in most cases" (R13.1, R13.2).
4. No Government ID, passport, national ID, selfie or identity-image requirement appears anywhere, and no exception to R13.1 is introduced.
5. The rest of each card is unchanged.

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- The existing cards and text styles, at the §4 widths, with no overflow or clipping.

**TECHNICAL CONSTRAINTS.**

- The standard constraints. Copy changes only.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker on the captured Website text at every width and in the 390 px preview:
  - each old sentence is absent and its replacement present;
  - no sharing or public-Collection wording;
  - no "the buyer's Delivery QR";
  - no "standard" admission qualifier;
  - no ID-requirement wording.
- **Red/green.** On the f868fc4 reference build all three defects are detected; on the candidate none is.
- **Mutations**, each of which must be caught:
  - any one old sentence restored;
  - "standard" reintroduced in either place;
  - "the buyer's" reintroduced;
  - sharing language reintroduced;
  - the KYC sentence dropped.
- **Earlier suites:** WO-011's checklist items R2.6, R8.2, R13.1, §60.23, §63.13 and §63.36, with §60.05 and §63.27 still passing; the WO-007 audit for the Website; a capture comparison in which only these sentences change.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–5 hold in every layout.
2. The six WO-011 checklist items above pass on the candidate.
3. Only these sentences differ from f868fc4.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus each sentence's before and after text, with its location.

### WO-019 — Prototype Guide and Master Demo Canonical Flow Corrections

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** The Prototype Guide and the Master Demo describe the canonical flows:
- Courier Delivery runs: Seller prepares → Ready for Courier → Seller sends Delivery Offer → Courier accepts Delivery Offer → Courier Assigned → pickup and delivery;
- the Seller never accepts the Delivery Offer;
- the launcher uses §61's labels;
- the Guide's flow count matches DD's 13 flows.

**WHY THIS WORK ORDER EXISTS.**

- R6.10 and R6.11 set the sequence, R4.4 the Courier Delivery timeline, and §59 Flow G the fulfilment path. §61 names the launcher entries.
- WO-011's initial verification run (2026-10-08) found three defects:
  - **D17** (checklist items R4.4 and R6.11). The Guide's journey step 7 read "Seller prepares order → assigns courier from their pool → marks Ready for Pickup". The Guide's Flow G path put Assign before Mark Ready, and its Seller Order card read "Status: Paid → Preparing → Ready → Assigned → …". The Master Demo's Courier step was titled "Assign Courier and Mark Ready" and told the Seller to "accept the delivery offer", and Flow G's first step to "accept the offer". Both give the Courier's acceptance to the Seller.
  - **D18** (checklist item F.03). The launcher rendered "View as" before each role, giving "View as Seller", "View as Seller Console" and "View as Operator Console".
  - **D19** (checklist item F.04). The Guide said "seven product surfaces and fourteen end-to-end demo flows"; DD *Demo flows and the records they use* has 13 (A–M).
- The owner's remediation decisions of 2026-10-08 require §59's and §61's exact wording wherever those sections define the copy.

**DEPENDENCIES.**

- WO-001: the canonical flow list, whose 13 flows are DD's A–M.
- WO-006: Flows C and D.
- WO-006A: Flow M and the Master Demo's flow order.
- WO-008: Flows F, G and H, and offer semantics.
- Coordinates with WO-015: both must follow the same approved Courier sequence; neither waits for the other.

**IN SCOPE.**

- The Guide's journey step 7, its Flow G path, its Seller Order card's status rule, its launcher labels and its flow count.
- The Master Demo's Courier step: its title and instruction.
- Flow G's first step: its instruction.

**OUT OF SCOPE.**

- Flow targets and stage structure: no screen key or target changes (standard constraint 5).
- The Master Demo step whose target is inert (accepted).
- Flow titles that no rule contradicts, and Flow K's wording.
- The Guide's other content.
- Any canonical Courier record.

**IMPLEMENTATION REQUIREMENTS.**

1. The Guide's journey step 7 reads: "Seller prepares the order → marks it Ready for Courier → sends a Delivery Offer to an approved Courier from their pool → the Courier accepts the Delivery Offer → Courier Assigned" (R6.10, R6.11).
2. The Guide's Flow G path is §59 Flow G's, word for word: "Paid Order → Seller Companion → Prepare → Mark Ready → Assign / Offer to Daniel → Seller displays Pickup QR → Courier scans → Pickup Verified → checkpoint location attempted → Courier delivers → Courier displays Delivery QR → Buyer scans → Delivery Verified → checkpoint attempted → Completed." The Courier's name is read from the shared data.
3. The Guide's Seller Order card lists the three timelines with their canonical names (R4.4–4.6):
   - Courier Delivery: Paid → Preparing → Ready for Courier → Courier Assigned → Pickup Verified → Out for Delivery → Delivery Handoff → Completed;
   - Seller Delivery: Paid → Preparing → Ready for Seller Delivery → Out for Seller Delivery → Delivery Handoff → Completed;
   - Buyer Collection: Paid → Preparing → Ready for Collection → Collection Handoff → Completed.
4. The Master Demo's Courier step:
   - title: "Mark Ready and Offer to Courier";
   - instruction: "Prepare the Paid Order, Mark Ready, select Daniel K. and send the Delivery Offer; Daniel K. accepts it (simulated in the prototype)."
5. Flow G's first step instruction: "Prepare the Paid Order, Mark Ready, select Daniel and send the Delivery Offer; Daniel accepts it (simulated in the prototype); then display the Seller Pickup QR."
6. Nothing in the Guide or the Master Demo tells the Seller to accept a Delivery Offer, assigns a Courier before Mark Ready, or calls the Courier Delivery Ready state "Ready for Pickup" (R4.4, R6.10, R6.11).
7. The launcher's entries read exactly, in this order: "View as Buyer", "View as Seller Companion", "View as Courier", "Open Seller Console", "Open Operator Console". The block keeps its "PROTOTYPE NAVIGATION — NOT PRODUCTION UI" label (§61).
8. The Guide's sentence reads "seven product surfaces and 13 end-to-end demo flows". The 13 is rendered from the canonical flow list (the flows A–M of DD *Demo flows and the records they use*), not typed as a literal. MASTER and the auxiliary E2 run aren't counted. The Guide's flow list shows the same 13.

**DATA REQUIREMENTS.**

- DD *Demo flows and the records they use*.
- DD *Courier* (the Courier's name).

**VISUAL / UX REQUIREMENTS.**

- The existing Guide and flow-card layouts, at the §4 widths, with no overflow.
- The flow card's docked and floating presentations are unchanged.

**TECHNICAL CONSTRAINTS.**

- The standard constraints. Constraint 5 especially: titles and instructions only, with no target or screen-key change.
- Regression suites that assert the old wording are updated in the regression folder, and each change is listed in the completion report. No check is weakened: the old assertion becomes the new wording's assertion.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - the Guide's text at every width has requirements 1–3, 7 and 8, and none of "marks Ready for Pickup", an Assign step before Mark Ready, "Ready → Assigned", "fourteen", "View as Seller Console", "View as Operator Console" or a bare "View as Seller";
  - every Master Demo and Flow G card text has requirements 4–5, and no "accept the delivery offer" or "accept the offer";
  - the displayed count equals the length of the canonical flow list.
- **Red/green.** On the f868fc4 reference build these checks fail; on the candidate they pass.
- **Mutations**, each of which must be caught:
  - a hard-coded "fourteen";
  - the Assign → Mark Ready order restored;
  - "accept the delivery offer" restored;
  - the "View as" pattern for every entry restored;
  - a flow added to the canonical list without the count following;
  - "Ready for Pickup" restored.
- **Earlier suites:**
  - smoke every flow from its first step, at 390 and 1440;
  - WO-006, WO-006A and WO-008's flow-card checks;
  - the WO-001 module checker;
  - WO-011's checklist items R4.4, R6.11, F.03 and F.04, with its Demo-flow items still passing;
  - the WO-007 audit for the Guide and the flow steps.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–8 hold.
2. The WO-011 checklist items above pass on the candidate, and every flow still walks from its first step.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus each changed text with its before and after, and the list of regression assertions updated.

### WO-020 — Accessible Names and Control Semantics

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** Every control named in D9, D12 (name portion) and D15 (Back-button name portion) has an accessible name, and the Seller Console's switches expose their role and state.

**WHY THIS WORK ORDER EXISTS.**

- §57 calls for semantic labels and keyboard-accessible desktop controls. §28 lists the Seller Console top bar's Notifications and Help. §39 gives the Operator rail's collapsed icons their labels, which WO-009 implemented.
- WO-011's initial verification run (2026-10-08) found these defects, all under checklist item §57.06:
  - **D9.** The Seller Console's desktop rail, when collapsed, had 13 buttons with no usable name: 10 had none and 3 read only a count. The Seller Console's on/off switches had no name, role or state.
  - **D12, name portion.** The console top bar's Notifications and Help icon buttons had no name, in the Seller and the Operator Console.
  - **D15, Back-button name portion.** The Seller Storefront search screen's icon-only Back button had no name.

**DEPENDENCIES.**

- WO-007: the Seller Console tablet rail, whose buttons are named, and the drawers.
- WO-009: collapsed sidebar items that keep their label as a visually hidden name, and the Operator rail.

**IN SCOPE.**

- The Seller Console's collapsed desktop rail.
- The Seller Console's switches and every use of them: Store availability, the Automation and Settings rows, the Product editor's demo media and the Shoppable Post editor's hotspots.
- The top bar icon buttons in both consoles.
- The Seller Storefront search screen's Back button.

**OUT OF SCOPE.**

- Sidebar redesign, and any change to the Operator rail (WO-009).
- A visible tooltip on the Seller rail: §39 requires one for the Operator rail only.
- Focus styling (WO-022).
- The Components board's icon-button specimens.

**IMPLEMENTATION REQUIREMENTS.**

1. In the collapsed desktop state, each of the 13 Seller rail buttons has its destination's label, with any count, as its accessible name, as WO-009's collapsed Operator items keep theirs. The collapsed rail's appearance is unchanged, and so are the expanded state, the tablet rail and the drawer (WO-007).
2. Each Seller Console switch exposes the switch role, its on/off state and an accessible name taken from the row it controls (§57).
3. The top bar icon buttons are named "Notifications" and "Help" (§28), in both consoles.
4. The Storefront search Back button is named "Back to {Seller name}", matching the Storefront's other Back buttons, which show the Seller's name.
5. The Collapse and Expand controls keep their names, and keyboard order is unchanged (§57).

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- No visible change.
- The collapsed rail at 1440 and 1280; the tablet rail at 1024 and 768, unchanged; the Storefront at 390.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Keep the Seller Console sidebar's class hook and the markup its responsive rules select on.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker, reading the accessibility tree and not only the labelling attributes:
  - with the Seller rail collapsed at 1440 and 1280, all 13 buttons are named, with names equal to the expanded labels;
  - every switch has the switch role, its state and a name;
  - the top bar buttons are named in both consoles;
  - the Storefront Back button is named at 390.
- **Red/green.** On the f868fc4 reference build all four checks fail; on the candidate they pass.
- **Mutations**, each of which must be caught:
  - one rail name dropped;
  - a switch's role or state dropped;
  - one top bar name dropped;
  - the Back button's name dropped;
  - the tablet rail's names broken.
- **Earlier suites:** WO-007's suite and audit for the Seller tablet rail and drawer; WO-009's suite and mutations; WO-011's checklist item §57.06, with §57.04 still passing; a capture comparison showing no visual change.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–5 hold.
2. WO-011's checklist item §57.06 passes on the candidate.
3. At rest, rendering is identical to f868fc4, apart from accepted noise.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the accessible names before and after, from the accessibility tree.

### WO-021 — Status Icon Accessibility

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** Every status that the shared status badge (StatusBadge) shows reads as text plus a meaningful icon. The badge maps statuses centrally to five semantic icon families, using icons the prototype already draws. Text stays the primary label, and canonical state names don't change.

**WHY THIS WORK ORDER EXISTS.**

- §57 lists "text + icon status". WO-008 and WO-010 applied it to Courier availability and the Solo Coverage banner.
- WO-011's initial verification run (2026-10-08) found defect D10 (checklist item §57.08). The Seller Console's status badges showed text alone or text with a colour dot, for example in the Orders rows, the Order Detail header and "Paid · read-only".
- The owner approved the icon families on 2026-10-08, with the existing icons only and no new icon dependency.

**DEPENDENCIES.**

- WO-007: badge layouts at the audit widths.
- WO-008: the existing text-plus-icon pattern and the badge's icon option.
- Coordinates with WO-015: if WO-015 introduces or displays "Awaiting Courier acceptance", that status belongs to WO-021's pending / in-progress icon family. Neither work order waits for the other, and WO-021 may define the mapping before WO-015 exists.

**IN SCOPE.**

- An inventory of every status the shared status badge renders, on every surface and on the Components board.
- The central mapping of those statuses to icon families, applied to every use of the badge.

**OUT OF SCOPE.**

- Canonical state names and labels (R4.4–4.6, §55).
- Colours.
- Status displays that the shared status badge doesn't draw: the mobile apps' own status chips and the Trust badge components.
- Decorative icons with no status meaning.
- A new icon dependency or icon library.

**IMPLEMENTATION REQUIREMENTS.**

1. The shared status badge maps every status centrally to one of five families. Each family uses an icon the prototype already draws:

   | Family | Examples | Icon |
   |---|---|---|
   | Success | paid, verified, approved, completed, published; active where success semantics apply | an existing check or success icon |
   | Pending / in progress | pending, preparing, awaiting, ready, assigned; out for delivery or processing where appropriate | an existing clock, activity or progress icon |
   | Warning / attention | needs attention, claim or dispute, warning; rebuilding or an equivalent warning state where applicable | an existing warning icon |
   | Failure / negative | failed, rejected, cancelled, removed, suspended | an existing error or X icon |
   | Informational / neutral | read-only, a neutral informational status, any other status with no positive or negative implication | an existing information icon |

2. The icon replaces the dot. The text remains the primary label and the icon reinforces it. The icon is hidden from assistive technology, so the accessible name stays the text (§57).
3. Colour is never the only status cue (§57).
4. Canonical state names and labels are unchanged.
5. There is one mapping, in the shared badge, with no per-surface copies.
6. Every actual status of the shared badge is inventoried and mapped explicitly. If an actual status doesn't fit a family, stop and report it rather than guessing.
7. Badge width at the audit widths causes no overflow or clipping (WO-007).

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- An icon replaces the dot in every affected badge, and nothing else changes.
- The Seller Console at 1440 and 1024, the Components board, and the §4 widths for overflow.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- One mapping in the shared badge, with no per-surface copies.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - a source and render inventory in which every use of the shared badge renders its family's icon and no dot;
  - the applied mapping equals the completion report's table;
  - the text names are unchanged;
  - the icons are hidden from assistive technology.
- **Red/green.** On the f868fc4 reference build "no dot-only badge" fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - one status reverted to a dot;
  - a status mapped to the wrong family;
  - the icon exposed as the name;
  - a label changed;
  - a per-surface override of the mapping.
- **Earlier suites:** WO-008 (the Courier status icons, unchanged); the WO-007 audit, for badge widths; WO-011's checklist item §57.08; a capture comparison in which only the badges differ.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–7 hold.
2. WO-011's checklist item §57.08 passes on the candidate.
3. Visual differences from f868fc4 are exactly the approved icon changes.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the inventory and the explicit mapping table (every status, its family and its icon), and before and after screenshots of the Seller Console's Orders and Order Detail.

### WO-022 — Keyboard Focus Indicators and Focus Contrast

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** Every keyboard focus indicator named in D6, D12 (focus portion), D14 and D15 (field-focus portion) is visible, with at least 3:1 contrast against what is behind it, using the existing focus tokens.

**WHY THIS WORK ORDER EXISTS.**

- §57 calls for visible keyboard focus and "WCAG-style accessible interaction principles", and WCAG sets 3:1 for a focus indicator.
- CLAUDE.md: every control shows the global 3 px info-blue outline offset 2 px; it must not be suppressed inline; on a dark or photo surface where the blue lacks contrast, the light inverse token is used.
- WO-011's initial verification run (2026-10-08) measured the rendered outlines and found these defects, under checklist item §57.03:
  - **D6.** The Company Website's form fields showed no focus indicator, because it was suppressed inline.
  - **D15, field-focus portion.** The Seller Storefront's search field showed no focus indicator, for the same reason.
  - **D12, focus portion.** The Operator Console's main-area controls showed the info outline at 2.66:1 on its `#1C2028` panels. Only the Operator sidebar uses the inverse outline.
  - **D14.** The Courier Pickup scanner's close control and "Simulate QR detected" showed the info outline at 2.95:1 on its `#1A1512` surface.

**DEPENDENCIES.**

- WO-007.
- WO-009: the inverse outline already used in the Operator sidebar.
- Coordinates with WO-012 and WO-013: their later verification fields must use the same approved focus treatment. WO-022 does not wait for them.

**IN SCOPE.**

- Every Company Website field and select that exists when WO-022 runs, including the 390 px home waitlist. The verification fields WO-012 and WO-013 add later must reuse the focus treatment WO-022 establishes; WO-022 doesn't build them.
- The Seller Storefront search field.
- Focusable controls in the Operator Console's main area, its panels and its case workspaces.
- The Courier Pickup scanner's controls.

**OUT OF SCOPE.**

- Any brand colour, and the global outline's colour or width elsewhere.
- Hover and pressed styles.
- Accessible names (WO-020).
- The invalid colour values (standard constraint 6).

**IMPLEMENTATION REQUIREMENTS.**

1. Website fields and the Storefront search field: nothing inline suppresses the global keyboard focus outline. Each shows the 3 px info outline, which renders 6.14:1 on `#FFFFFF`, 5.50:1 on `#F5F2ED` and 5.79:1 on `#FAF8F5`.
2. Operator Console main area: focused controls use the light inverse outline (`#FAF8F5`), as the Operator sidebar already does. It renders 15.40:1 on `#1C2028`, 13.43:1 on `#252B35` and 17.42:1 on `#111418`.
3. Courier Pickup scanner: its controls use the inverse outline on its dark surface, as the Buyer entry and camera screens do. It renders 17.08:1 on `#1A1512`.
4. Focus stays keyboard-only, with no outline on mouse or touch activation (CLAUDE.md).
5. Every indicator in scope renders at least 3:1 against what is behind it, measured from pixels (the median over the outline), at the widths below.

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- Focus only: nothing changes at rest.
- The Website at 390, 1024 and 1440; the Storefront at 390 and 1440; the Operator Console at 1440 and 1024; the Courier at 360, 390 and 430.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- Existing tokens only, through the stylesheet's rules or the file's idiom.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker, reusing WO-011's pixel measurement of focus outlines. It applies keyboard focus, then compares screenshots focused and blurred:

  | Control | Before (f868fc4) | After (required) |
  |---|---|---|
  | Website Content Type, link, detail, email, deletion reason | no outline pixels | ≥ 3:1 |
  | Storefront search | no outline pixels | ≥ 3:1 |
  | Operator View all work, Claim, Open | 2.66:1 | ≥ 3:1 |
  | Courier close control, Simulate QR detected | 2.95:1 | ≥ 3:1 |

  It also checks that no outline appears on a mouse click.
- **Red/green.** On the f868fc4 reference build the "before" column fails; on the candidate every control passes.
- **Mutations**, each of which must be caught:
  - one inline suppression restored;
  - the Operator rule limited to the sidebar again;
  - the scanner back on the info outline;
  - the outline shown on mouse focus.
- **Earlier suites:** WO-003's and WO-004's focus audits; WO-009 (the Operator sidebar outline); WO-010 (the Solo Coverage focus checks); WO-006A (the Buyer camera); WO-011's checklist item §57.03; a capture comparison with no difference at rest.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–5 hold, with the before and after values recorded.
2. WO-011's checklist item §57.03 passes on the candidate.
3. At rest, capture is identical to f868fc4, apart from accepted noise.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the before and after contrast table, measured from pixels.

### WO-023 — Operator Muted-Text Contrast

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P2.

**OBJECTIVE.** Operator Console muted text reaches at least 4.5:1 on every background it is rendered on, by taking the approved value `#8C95A9`. No other Operator colour and no Seller Console colour changes.

**WHY THIS WORK ORDER EXISTS.**

- §57 calls for strong contrast, "WCAG-style": 4.5:1 for text of normal size.
- WO-011's initial verification run (2026-10-08) found defect D11 (checklist item §57.01). The Operator muted value `#7A8499` gives:
  - 3.79:1 on the raised `#252B35`, used for table headers, a chart label and notes;
  - 4.34:1 on the surface `#1C2028`, used for the Claim Work Item note and the "Desktop recommended" note;
  - 4.91:1 on `#111418`.
- The owner approved `#8C95A9` on 2026-10-08, only for the Operator muted-text treatment that fails. It gives 6.14:1 on `#111418`, 5.43:1 on `#1C2028` and 4.73:1 on `#252B35`.

**DEPENDENCIES.**

- WO-009: the Operator Console as it now renders.
- WO-010: the Solo Coverage panels use the muted treatment.
- WO-022: the focus outlines on the same panels.

**IN SCOPE.**

- The Operator muted-text treatment, wherever the Operator Console renders it.

**OUT OF SCOPE.**

- Operator primary text, accents, navigation, cards, buttons and borders: their own colours don't change.
- Every Seller Console colour (its muted text is a separate token).
- The Foundations board's printed colour values, which CLAUDE.md notes are partly stale.
- The invalid tints (standard constraint 6).
- Type sizes.

**IMPLEMENTATION REQUIREMENTS.**

1. The Operator muted-text value becomes `#8C95A9`, in place of `#7A8499`.
2. The new value is used only for the Operator muted-text treatment. Operator primary text, accents, navigation, cards and buttons, and the Seller Console, are not recoloured.
3. Every element in the treatment reaches at least 4.5:1 on every background it is rendered on, and its contrast is measured before and after.
4. If the muted value turns out to colour something other than muted text and the muted icons drawn with it, for example a navigation item's state, a card or a button's own colour, stop and report it before changing that element.
5. The change is made once, where the treatment is defined, with no per-use overrides.

**DATA REQUIREMENTS.**

- None.

**VISUAL / UX REQUIREMENTS.**

- A visual change to Operator muted text, and the muted icons drawn with it, only.
- The Operator Console at 1440, 1024 and 390 (the drawer).

**TECHNICAL CONSTRAINTS.**

- The standard constraints.
- One change where the treatment is defined, with no per-use overrides.
- The Foundations board is unchanged.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - every Operator element rendered in the treatment, at the widths above, is at least 4.5:1 against its rendered background, from computed style and pixels;
  - the value equals `#8C95A9`;
  - the other Operator colours and the Seller Console's colours are unchanged.
- **Red/green.** On the f868fc4 reference build it fails at 3.79:1; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - the value reverted;
  - a value under 4.5:1 on the raised background;
  - a per-use override left at the old value;
  - another Operator colour changed;
  - a Seller Console colour changed.
- **Earlier suites:** WO-009's and WO-010's suites and mutations; the WO-007 audit for the Operator Console; WO-011's checklist item §57.01; `run-all.cjs`.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–5 hold, with the exact before and after contrast values recorded for every background.
2. WO-011's checklist item §57.01 passes on the candidate.
3. Only Operator muted text, and the muted icons drawn with it, differ from f868fc4.
4. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus the before and after contrast table for every background, and before and after screenshots of the Unified Work Queue at 1440.

### WO-024 — Courier Card Design-System Figures

**STATUS.** APPROVED FOR IMPLEMENTATION. Remediation priority P3.

**OBJECTIVE.** The Components board's Courier Card and Assign Courier specimens show the approved two-number model, with DD's figures: completed for this Seller as the primary figure, and total completed deliveries across Sellers as secondary context.

**WHY THIS WORK ORDER EXISTS.**

- R7.4: "Any Seller-facing Courier selection/card … must distinguish completed deliveries for the current Seller from total completed deliveries." §23 gives the card. DD *Courier* gives the 13:35 Addis Atelier card: "Daniel K. · Available · 41 completed for your store · 64 total completed deliveries · ETB 180.00 for this delivery".
- WO-011's initial verification run (2026-10-08) found defect D20 (checklist item R7.4), which the owner confirmed at lower priority. The design-system Courier Card had a single deliveries figure ("41 deliveries"), and the Assign Courier modal specimen read "41 completed deliveries".
- The design-system card is used only on the Components board. The Seller Companion and the Seller Console have their own cards, which already pass (WO-008).

**DEPENDENCIES.**

- WO-008: the Seller-specific and total figures at the story moment (41 and 64, and ETB 180.00, for Addis Atelier and Daniel K. at 10:25).

**IN SCOPE.**

- The design-system Courier Card and its data.
- The Components board's Courier Card specimen and Assign Courier modal specimen.

**OUT OF SCOPE.**

- The Seller Companion, the Seller Console and the Courier app, which are unchanged.
- Courier data (DEMO_DATA.md unchanged).
- The modal specimen's other wording.

**IMPLEMENTATION REQUIREMENTS.**

1. The card shows "41 completed for your store" as the primary figure and "64 total completed deliveries" as the secondary figure, in DD's wording, read from the shared module at the board's moment (R7.4, §23; DD *Courier*).
2. The Assign Courier modal specimen shows the same two figures, in the same order and prominence, with the compensation.
3. Visual primacy follows R7.4, within the existing component styles.
4. No product surface and no Courier data changes.

**DATA REQUIREMENTS.**

- DD *Courier*: Daniel K. and Addis Atelier, 41 and 64, ETB 180.00, from the shared module at 10:25.

**VISUAL / UX REQUIREMENTS.**

- The Components board at its widths. The specimen exception for controls under 44 px still applies.

**TECHNICAL CONSTRAINTS.**

- The standard constraints.

**VALIDATION.**

- Type-check, build and `run-all.cjs` pass.
- A focused checker:
  - the board's Commerce Cards and Overlays texts show both figures, in order, equal to the module's values;
  - the Seller Companion and Seller Console card texts are unchanged.
- **Red/green.** On the f868fc4 reference build "two figures" fails; on the candidate it passes.
- **Mutations**, each of which must be caught:
  - the total dropped;
  - the order swapped;
  - a literal 41 in place of the module's value.
- **Earlier suites:** WO-008's suite and module checks; WO-011's checklist item R7.4; a Components capture comparison.

**ACCEPTANCE CRITERIA.**

1. Requirements 1–4 hold.
2. WO-011's checklist item R7.4 passes on the candidate.
3. The standard checks pass.

**REQUIRED COMMANDS.** The standard commands, plus `node ../AdulisCommercePlatformPrototype-regression/checkers/run-all.cjs` from the repository root, this work order's focused checker on the f868fc4 reference build and on the candidate build, and its mutation test.

**COMPLETION REPORT FORMAT.** The standard report, plus before and after screenshots of both specimens.

## Revision history

- 2026-10-02: File created as an empty scaffold. No work orders recorded.
- 2026-10-02: Execution order recorded: WO-001 to WO-011, titles exactly as given. The sequence re-orders the original Figma correction list based on the audit's findings and puts the new WO-001 (Canonical Demo Data Foundation) first. No work-order texts received yet.
- 2026-10-02: WO-001's dependency note corrected: DEMO_DATA.md is now READY FOR FINAL APPROVAL (it was PROPOSED). Nothing else changed.
- 2026-10-02: WO-001's dependency note updated: DEMO_DATA.md is APPROVED, so the demo-data dependency is satisfied. WO-001's text is still pending. Nothing else changed.
- 2026-10-02: Bodies drafted for all 11 work orders from the approved rules, specification and DEMO_DATA.md, each with the 14 required sections, and work-order conventions added. WO-001, WO-008 and WO-011 are APPROVED FOR IMPLEMENTATION. WO-002 to WO-007, WO-009 and WO-010 are PENDING DECISION, each with its missing decisions listed. None is implemented.
- 2026-10-02: Approved work-order decisions applied after the rules (2.14, 3.6–3.9, 5.9, 12.5–12.6, 14.6, 16.6–16.9), the specification (sections 4, 7, 12, 22, 31, 36, 38, 39, 43 and 50) and DEMO_DATA.md were updated. WO-005, WO-006, WO-007, WO-009 and WO-010 are now APPROVED FOR IMPLEMENTATION. WO-002 (posts needing action), WO-003 (guest Report; the temporary Cart at sign-in) and WO-004 (guest Report) stay PENDING DECISION. None is implemented.
- 2026-10-02: Final work-order decisions applied after the rules (3.7 changed; 3.10–3.12 added), the specification (sections 4, 7, 12 and 29) and DEMO_DATA.md were updated. WO-002, WO-003 and WO-004 are now APPROVED FOR IMPLEMENTATION, so all eleven are. WO-001, WO-007 and WO-011 were updated to match. None is implemented.
- 2026-10-04: Approved amendments discovered during WO-002 recorded. WO-004 gains requirements 13 and 14: it owns Buyer-facing discount presentation, not Checkout calculation. WO-006 gains requirements 10 and 11: it owns discounted Cart/Checkout (transactional) correctness, and the existing historical Orders don't change. New WO-006A — Buyer Final Handoff Verification is APPROVED FOR IMPLEMENTATION and runs after WO-006 and before WO-007; no existing work order is renumbered. The acceptance criteria of WO-004 and WO-006 now cover their new requirements, and the status line and execution order were updated to match. No other work order and no canonical demo record changed. WO-004, WO-006 and WO-006A are not implemented.
- 2026-10-04: Post-WO-002 cleanup. Implementation progress added as its own section, separate from approval status: WO-001 and WO-002 are implemented and merged; WO-003 to WO-011, including WO-006A, are not started. Dependencies on WO-006A made explicit: WO-007 depends on WO-001 to WO-006A, and WO-011 on WO-001 to WO-010 including WO-006A, which it regression-tests. WO-006A is now PENDING DECISION until a canonical Maya Buyer Collection scenario is approved in DEMO_DATA.md; `ADU-23952` and `ADU-24041` must not be used as Maya's Orders, and WO-003 to WO-006 aren't blocked. Product Post Detail discount presentation is assigned to WO-004 (requirements 15–17); WO-006 still owns transactional discount correctness. The status line, the Statuses convention and the execution-order note were updated to match. No canonical demo record changed, and no work order was implemented in this pass.
- 2026-10-04: WO-006 extended with the Checkout testing environment from the original Figma correction list's Correction Work Order 03, reconciled with DEMO_DATA.md as approved: session-only Scenario A (Addis Atelier: Linen Overshirt M/Natural and Wide-Leg Trousers M/Charcoal) and Scenario B (Addis Atelier, Nura Glow and Volt House, with sequential payments and partial completion); `TEST-` references; fixed fulfilment modes, with Buyer Collection selectable but not paid; and a prototype-only scenario control. These are requirements 12–19 and acceptance criteria 3–8. The original Overshirt M/Sand, Trousers M/Black and Compact Power Bank were replaced, because DEMO_DATA.md has no such variants and the Power Bank is out of stock. Flows C and D, every other work order and every canonical demo record are unchanged. WO-006 stays APPROVED FOR IMPLEMENTATION, in sequence and not started.
- 2026-10-04: WO-006 documentation correction. The Checkout work is confirmed as WO-006, not WO-003, which remains Guest Buyer Authentication States; WHY now says so. Scenario B is renamed Scenario B3 (three Sellers), and the new Scenario B2 adds explicit two-Seller coverage with Scenario B3's Addis Atelier and Nura Glow carts. Test Orders use scenario-scoped references (`TEST-A-01`, `TEST-B2-01`, `TEST-B2-02`, `TEST-B3-01` to `TEST-B3-03`), and payment attempts have their own `TESTPAY-` references, with a retry staying on the same Seller Order. Buyer Collection can now be paid on a test Order (Scenario A), stopping at the payment outcome, without creating a DEMO_DATA Order or resolving WO-006A. Test Orders stay out of canonical Orders, Insights, statistics, Reviews, Claims and aggregates. These are requirements 12–23. No guest-cart Order reference is resolved, and WO-003 is unchanged. No canonical demo record changed; WO-006 stays APPROVED FOR IMPLEMENTATION and not started.
- 2026-10-04: Post-WO-003 reconciliation. Implementation progress records WO-003 — Guest Buyer Authentication States as implemented and merged into main. WO-004 to WO-011, including WO-006A, are still not started. No work-order text, approval status or dependency changed.
- 2026-10-05: Post-WO-004 reconciliation. Implementation progress records WO-004 — Buyer Home / Discovery / FYP Rebuild as implemented and merged into main; WO-005 is next. WO-003's availability-revalidation rule is preserved. Already-unavailable Products can no longer be added to Cart, so deterministic coverage of the "became unavailable after add-to-cart" race is assigned to WO-006 as requirement 24, with acceptance criterion 11, in addition to its existing scenarios. WO-006A's blocker is unchanged. No approval status, dependency, execution order or canonical demo record changed; WO-005 to WO-011, including WO-006A, are not started.
- 2026-10-05: Post-WO-005 reconciliation. Implementation progress records WO-005 — Buyer–Seller Chat Context Rebuild as implemented and merged into main; WO-006 is next. WO-006's requirement 24 remains the approved deterministic availability-race coverage. WO-006A's blocker is unchanged. No approval status, dependency, execution order, canonical demo record or later work order changed; WO-006 to WO-011, including WO-006A, are not started.
- 2026-10-05: Post-WO-006 reconciliation. Implementation progress records WO-006 — Single-Seller and Multi-Seller Checkout Test Flows as implemented and merged into main. WO-006A is next but remains blocked pending a canonical Maya Buyer Collection scenario, as its progress line now states; a separate canonical-data reconciliation will handle that blocker. No approval status, canonical demo record, dependency or execution order changed; WO-006A to WO-011 are not started.
- 2026-10-05: WO-006A's canonical-data blocker resolved. DEMO_DATA.md now records a canonical Maya Buyer Collection Order with Addis Atelier, `ADU-24094`, after the previous 17:20 story horizon. Addis Atelier displays the Collection QR and Maya scans it; QR is the canonical successful path, the verified final Handoff completes the Order, and exactly one Review Grant becomes available to Maya. WO-006A is now APPROVED FOR IMPLEMENTATION and pinned to that scenario; it remains NOT STARTED and is ready for implementation. No Samuel A. Order or other earlier Order was reassigned, and no dependency or execution order changed.
- 2026-10-06: Post-WO-006A reconciliation. Implementation progress records WO-006A — Buyer Final Handoff Verification as implemented and merged into main. The Buyer-facing final Handoff is complete for Courier Delivery, Seller Delivery and Buyer Collection, and Flow M — Buyer Collection Final Handoff is implemented. The method hierarchy is preserved: QR primary, OTP fallback, Manual Verification Operator-only emergency recovery. The presenter displays the final QR and the recipient scans it. No canonical demo record changed during implementation. WO-007 is next and remains not started. No approval status, work-order body, dependency or execution order changed.
- 2026-10-06: Post-WO-007 reconciliation. Implementation progress records WO-007 — Full Responsive Layout Repair as implemented and merged into main. All twelve prototype sections were repaired across the approved audit widths: the responsive overflow, clipping and guided-flow accessibility issues that WO-007 owns were addressed, and the Seller Console and Operator Console responsive behaviour was implemented. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-008 is next and remains not started. No approval status, work-order body, dependency or execution order changed.
- 2026-10-07: Post-WO-008 reconciliation. Implementation progress records WO-008 — Courier Seller-Specific vs Platform Totals as implemented and merged into main. Seller-specific Courier completion counts are now separated from the Courier's platform-wide completion total: Seller-facing Courier views show completed deliveries for the current Seller first, with the total across Sellers as secondary context. Seller–Courier relationship status presentation was corrected where WO-008 owned it. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-009 is next and remains not started. No approval status, work-order body, dependency or execution order changed.
- 2026-10-07: Post-WO-009 reconciliation. Implementation progress records WO-009 — Operator Sidebar Collapse / Expand as implemented and merged into main. The desktop Operator navigation now switches reliably between its Expanded and Collapsed states: the collapsed icon rail keeps an always-accessible Expand control, and each destination keeps its label and context through tooltip and focus treatment. At tablet and phone widths the Operator navigation is the temporary drawer, and the active destination is preserved through every sidebar transition. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-010 is next and remains not started. No approval status, work-order body, dependency or execution order changed.
- 2026-10-08: Post-WO-010 reconciliation. Implementation progress records WO-010 — Solo Coverage Duration as implemented and merged into main. `SCV-1001`'s Solo Coverage state is derived from the prototype's story clock, and the record remains canonical and read-only; its 22 September replay is available. While Solo Coverage is active, a persistent warning and status treatment shows. Activation, extension and early stop are demonstrated as prototype behaviour without creating canonical demo records. The configured maximum continuous duration is 28 days from the original activation, an extension cannot restart it, and Market-local time is used. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-011 is next and remains not started. No approval status, work-order body, dependency or execution order changed.
- 2026-10-08: Post-WO-011 remediation work orders added. WO-011's initial verification run found 20 confirmed defects (D1 to D20). The remediation work orders WO-012 to WO-024 are APPROVED FOR IMPLEMENTATION and not started, and each cites the defects it fixes. The purpose-bound Company Website verification for Account Deletion and Report Content, and the Marketplace Search availability filter, were first resolved in the specification (sections 12 and 8). WO-011 remains open: its progress is INITIAL VERIFICATION COMPLETE; REMEDIATION REQUIRED; FINAL RERUN PENDING, and it is rerun after WO-024 to close it, with no WO-025. WO-011's body is unchanged, and no canonical demo record changed.
- 2026-10-09: Remediation execution order reprioritised for the prototype's showcase value, visible UI, UX and frontend corrections first: Tier 1 WO-014, WO-016, WO-019, WO-020, WO-021, WO-022, WO-023 and WO-024; Tier 2 WO-015, WO-017 and WO-018; Tier 3 WO-012 and WO-013; then the rerun of WO-011, which remains the closure gate. No remediation scope was removed. Four dependency lines written on 2026-10-08 (in WO-018, WO-019, WO-021 and WO-022) were drafting errors and now state coordination relationships, as do the two lines that assumed the same order (WO-022's scope and WO-015's status icon). WO-013 → WO-012 remains the only in-series dependency affected by this ordering. No canonical demo record or product rule changed, and every remediation work order remains NOT STARTED.
- 2026-10-09: Post-WO-014 reconciliation. Implementation progress records WO-014 — Shoppable Post FYP Availability Eligibility as implemented and merged into main (implementation commit `3d13e35`). For You eligibility in Seller Console › Create Shoppable Post now derives from the current availability of the tagged Products, by the shared tag-availability rule, so a post with no currently available tagged Product is never shown as For You eligible. The editor's eligibility step, the Preview and the publish confirmation share one derived result, and the publish confirmation's phone presentation was corrected. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-016 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-10: Post-WO-016 reconciliation. Implementation progress records WO-016 — Search Out-of-Stock Product Availability as implemented and merged into main (implementation commit `2db439a`). Buyer › Search's Product results now rank currently available Products before unavailable ones, and an unavailable Product's card says "Currently unavailable" instead of presenting a purchasable price. The Available filter is off by default and, when turned on, excludes unavailable Products. Seller and Shoppable Post Search results are unchanged. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-019 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-11: Post-WO-019 reconciliation. Implementation progress records WO-019 — Prototype Guide and Master Demo Canonical Flow Corrections as implemented and merged into main (implementation commit `9c9e07b`). The Prototype Guide and the Master Demo now tell the canonical Courier sequence: the Seller marks the Order Ready for Courier and sends the Delivery Offer, and the Courier accepts it before Courier Assigned; journey step 7 identifies the Seller, the Seller Team and the Courier. The launcher's labels match the approved prototype specification, and the Guide counts the 13 canonical flows, A–M, with the Master Demo kept separate from them. WO-011's final rerun is to capture Master Demo step 10 under its current title. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-020 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-11: Post-WO-020 reconciliation. Implementation progress records WO-020 — Accessible Names and Control Semantics as implemented and merged into main (implementation commit `7152bf1`). The Seller Console's collapsed desktop navigation keeps each destination's name for assistive technology, and its switches expose a stable name, the switch role and their on/off state; the Store's availability switch is named "Store availability", a name that doesn't change with its state. The shared console top bar's Notifications and Help buttons are named in both consoles, and the Storefront search screen's Back button names the Storefront's current Seller. No visible styling changed, no canonical demo record changed, and the earlier work orders' regression checks remained green. WO-011's checklist item §57.06 (semantic labels) now passes; §57.03 (visible keyboard focus) remains for WO-022. WO-021 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-12: Post-WO-021 reconciliation. Implementation progress records WO-021 — Status Icon Accessibility as implemented and merged into main (implementation commit `7a6dd38`). Ordinary statuses in the shared status badge now show their text with a semantic icon, which replaces the former colour dot, and the status-to-icon mapping is defined once, centrally, in the shared status badge (`Badge.tsx`). The owner's mapping decisions Q1–Q12 are applied: Unavailable is Informational, the payment provider's Ready is Success, an Order's Ready states are Pending, and the Trust levels are excluded from the conversion and unchanged. The approved baseline-alignment refinement (option B) is part of the result, so badges with a semantic icon keep their text baseline within 1 px of the reference. The Shoppable Post specimen's overlap is pre-existing, measured at 43% before and 46% after, within the approved gate, and there is no new clipping or occlusion. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-011's checklist item §57.08 (text plus icon status) now passes; §57.03 (visible keyboard focus) remains pending WO-022, and §57.01 (strong contrast) pending WO-023. WO-022 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-13: Post-WO-022 reconciliation. Implementation progress records WO-022 — Keyboard Focus Indicators and Focus Contrast as implemented and merged into main (implementation commit `b74fa16`). The Company Website's form fields and the Seller Storefront's search field no longer suppress their focus outline, so they show the standard accessible info outline on their light surfaces. The Operator Console's controls use the light inverse focus outline on its dark surfaces, and its search field's Clear button keeps the info outline on the field's white surface. The Courier Pickup scanner's controls use the inverse focus outline. Only existing colours and tokens are used. No canonical demo record changed, and the earlier work orders' regression checks remained green. WO-011's checklist item §57.03 (visible keyboard focus) now passes; §57.06 (semantic labels) and §57.08 (text plus icon status) remain passing, and §57.01 (strong contrast) remains pending WO-023. WO-023 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.
- 2026-10-13: Post-WO-023 reconciliation. Implementation progress records WO-023 — Operator Muted-Text Contrast as implemented and merged into main (implementation commit `eccf807`). The Operator muted-text value changed from `#7A8499` to `#8C95A9`, once, where the treatment is defined, with no per-use override. Operator muted text and the muted icons drawn with it now use the new value. As the owner decided, the elements that share the treatment change with it too: the unselected option labels, the neutral status chips, the pending workflow step numbers and the past-event timeline markers. The navigation items' colours, the Operator's primary text and its other colours, the Seller Console's colours and the Foundations board's printed specimen values are unchanged. No canonical demo record changed. WO-011's checklist item §57.01 (strong contrast) now passes; §57.03 (visible keyboard focus), §57.06 (semantic labels) and §57.08 (text plus icon status) remain passing. WO-024 is next and remains not started, as the execution order now states. No approval status, work-order body, dependency or execution order changed.

## Related documents

- [ADULIS_PROTOTYPE_SPEC.md](ADULIS_PROTOTYPE_SPEC.md): the approved master prototype specification.
- [ADULIS_CANONICAL_RULES.md](ADULIS_CANONICAL_RULES.md): the authoritative prototype invariants.
- [DEMO_DATA.md](DEMO_DATA.md): the single canonical demo dataset used across every surface.
