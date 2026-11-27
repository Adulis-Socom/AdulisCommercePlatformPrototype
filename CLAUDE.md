# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Functional prototype of the Adulis commerce platform (buyers, sellers, couriers, operators), exported from Figma Make and now developed locally. React 19 + Vite 8 + Tailwind CSS v4 + TypeScript (strict), client-only: no backend, router, data layer, or tests.

- The Figma-generated visual design is the approved baseline. Preserve existing rendering unless a work order explicitly asks for a visual change.
- `AGENTS.md` is the Figma Make scaffold note. Its "dev server is already running on `$PORT`" only applies inside Figma Make; locally, start it yourself.
- Authoritative product/prototype invariants are in `docs/ADULIS_CANONICAL_RULES.md`. Existing `PrototypeGuide.tsx`, screen copy and current implementation are not authoritative when they conflict with approved documentation.

## Before major prototype changes

Read these first. They hold approved decisions. Sections marked pending have none yet: treat them as unknown rather than filling gaps from the current code.

- `docs/ADULIS_PROTOTYPE_SPEC.md`: approved master prototype specification.
- `docs/ADULIS_CANONICAL_RULES.md`: authoritative prototype invariants.
- `docs/DEMO_DATA.md`: the single canonical demo dataset for every surface.
- `docs/CORRECTION_WORK_ORDERS.md`: approved work orders, in execution order.

If these documents disagree with each other or with the code, follow the "Document authority and precedence" section in `docs/ADULIS_CANONICAL_RULES.md`.

## Commands

pnpm on Node 22 (versions pinned in `.mise.toml`).

- `pnpm install`
- `pnpm dev` — Vite on `$PORT` or 8443 (`strictPort`). Binds `0.0.0.0` unless `FIGMA_DEV_SERVER_HOST` is set (use `127.0.0.1` for local work). `pnpm run preview` uses the same host/port settings.
- `pnpm run data:build` regenerates `src/marketplace/data/*.json` from `docs/references/marketplace/*.json` (pinned SHA-256, shared validator; the Excel files are never read). Commit the generated files.
- `pnpm exec tsc --noEmit -p tsconfig.json` — type-check; there is no script for it. The CLI runs TypeScript 5.9.x while VS Code bundles 6.x, so `tsconfig.json` must satisfy both. Don't add `baseUrl` (deprecated in 6.x) or `"ignoreDeprecations": "6.0"` (rejected by 5.9 with TS5103).
- `pnpm run build` → `dist/` (gitignored); add `--outDir <dir>` to build elsewhere.
- No linter exists. Browser tests: `pnpm test` (`node tests/run.mjs [outDir]`) starts its own Vite on port 8450, drives the installed Edge through the pinned `playwright-core`, writes raw logs plus a summary (tested SHA) and exits non-zero on any failed check or unexpected browser error. A failing suite is retried once and both attempts are recorded. One suite: `APP_URL=http://127.0.0.1:8451/ node tests/<name>.test.mjs` against a running dev server. `tests/legacy.mjs` adapts the earlier PROTO-OVERNIGHT-001 suites. `knownGap(...)` records a documented missing feature and fails when the gap closes.
- Chatbot engine tests need no browser: `pnpm run test:unit` (Node strips the TypeScript types; engine files therefore import with explicit `.ts` and avoid enums/parameter properties). It executes all 113 engine-run scenario groups against synthetic fixtures and compares every answer with the PDF's Bot line.
- The browser harness never exits per suite: runs are serialised, the exit status is computed once, a suite that asserts nothing fails, `knownGap` is counted separately, and `tests/suites.json` lists how many viewport runs each file must complete (add new files there).
- Python tests for the background-removal adapter: `tools/bg-removal/.venv/Scripts/python -m unittest test_adapter test_adapter_multi test_adapter_custom` (system Python hangs). The Lab and Media Editor browser tests use a MOCKED adapter and say so.
- **Never run `pnpm run format` (or `.figma/make/format`).** oxfmt has no config and its defaults (double quotes, reflowed lines, LF) match neither the code style nor the CRLF checkout, so it rewrites every file. `oxfmt --check` already fails on all files for that reason.

## Architecture

**Two datasets (DEMO-001/002).** The app boots on the *marketplace* dataset (23 Sellers, 140 Products, 66 Scenes, 11 Buyers; `src/marketplace/`: `registry.ts` selects by `?dataset=` at load, `adapt.ts` maps source rows onto the existing record shapes, `validate.ts` is the pure validator). `?dataset=legacy` boots the historical seeded app unchanged (Addis Atelier, Nura Glow, Volt House); the guided flows, Checkout tests and every earlier browser suite are legacy-only (the harness appends `?dataset=legacy` unless `tests/suites.json` marks a suite `{ runs, dataset: "marketplace" }`). `src/demo-data/base.ts` is the one place the active base maps live (marketplace records first, legacy ones reachable by id only); `derived.ts`, `live.ts` and the barrel read it. Photos and Scene hotspot coordinates do not exist yet: Scenes are `positioned: false` with a "photo pending" placeholder, and nothing may invent coordinates. Courier, Operator, System States and the Orders/Reviews surfaces still show the historical fixtures on the marketplace dataset (labelled by `DatasetNote`) until their work orders.

**One SPA hosts every surface.** `src/App.tsx` is a prototype shell: a sidebar of 12 sections switched with `useState` (default: Master Demo). Each section is one file in `src/sections/`: seven product surfaces (Company Website, Seller Storefront, Mobile Buyer, Seller Companion, Courier, Seller Console, Operator Console) plus Prototype Guide, Foundations, Components showcase, Master Demo (`DemoFlows.tsx`) and System States. There is no URL state, so refresh always returns to the Master Demo.

**Guided flows drive cross-surface navigation.** `FLOW_DEFINITIONS` in `DemoFlows.tsx` lists flow stages as `{ section, target }`. `App.tsx` renders the flow-guide card (docked or floating by width; see Styling and responsive behaviour) and passes `target` to the section as its `demoTarget` prop, and each surface maps that string to its own initial screen, tab, or nav key. The mapping is untyped, so renaming a screen key inside a surface silently breaks flow steps. The rendered section is keyed by section + flow stage, so every flow step remounts it and resets its state. `PrototypeGuide.tsx` keeps a separate `DEMO_FLOWS` description list that has already drifted from `FLOW_DEFINITIONS`.

**Prototype mode (FE-001): current MVP vs internal simulation.** `src/prototype-mode.tsx` holds a context (`usePrototypeMode()`, state in `App.tsx`, switch in the sidebar footer). The default is the approved MVP (Nov 24 decisions: no payment, paid Order, surcharge, handoff, Claims or purchased Review Grants; checkout is a review with the disclosure "Checkout preview only. No Order will be placed and no money will be collected."). The historical paid-commerce design is the *simulation*: surfaces show `SimulationGate` in place of those screens until it is on, and a persistent "INTERNAL SIMULATION · DEMO" badge shows while it is. A `FlowDefinition` with `simulation: true` switches it on when started; flows `MVP` and `CR` are the current-MVP walkthroughs. New commerce-flavoured screens must be gated the same way. Use "Scene Post", not "Shoppable Post", in anything user-facing (internal identifiers such as `SHOPPABLE_POSTS` keep their names).

**Surfaces are self-contained state machines.** Each surface is a large default-export component with many file-local subcomponents and its own `useState` screen machine, e.g. the `Screen` union in `MobileBuyer.tsx`, or `PageKey` plus a desktop/390px view toggle in `CompanyWebsite.tsx`. Surfaces share no state except the Seller workspace below. Continuity between them is only narrative, via matching hard-coded names and IDs.

**Effective records (FIX-001).** `src/demo-data/live.ts` holds `LIVE_PRODUCTS` / `LIVE_SELLERS`: the seeded record with the Seller's overrides applied (name, price, stock, photo, store identity). The workspace provider publishes them on every render; Buyer, Storefront, Companion and the visibility rules in `derived.ts` read them (the surfaces import them as `PRODUCTS` / `SELLERS`), while historical Orders keep the seeded values. Surfaces that read them call `useWorkspace()` so they re-render on a change.

**Scripted chatbot (BOT-001..006).** `src/chatbot/` is a deterministic, English-first engine: no model, network, clock or side effect. `dialogue-source.generated.ts` is generated from the founder-review PDF by `tools/chatbot/extract_dialogues.py` (22 C + 66 F + 26 G scenario groups; re-run it, never hand-edit). `engine.ts` resolves in authority order (validate subject, commercial restrictions, canonical Product/Variant facts, configured Seller policy, supplementary Seller notes, clarify or hand off); a Seller note can never override a Product record. `world.ts` reads the same effective data as every surface; `session.ts` stamps each Buyer Message with its own immutable subject and appends the reply to a shared per-Buyer+Seller+Market conversation in the workspace store (`state.chats`). Surfaces: `sections/buyer-chat.tsx` (Buyer: Scene selector first, Product second), `console/LiveInbox.tsx` (Seller Inbox and Companion, takeover and hand-back), `console/BotSetup.tsx` (Policies tab), `console/ChatbotTestLab.tsx` (isolated Test Lab, 114-group coverage matrix, feedback that never edits templates). Replies never touch the Cart, stock, a price or money. Wording marked `derived` in `templates.ts` is not in the PDF.

**Background removal (BGR-014..019).** `tools/bg-removal/models.json` is the single registry of the 23 rembg sessions; nothing is admitted, so nothing runs. `src/lab/model-catalogue.json` is generated from it (`export_catalogue.py`), `src/lab/bg.ts` is the shared client, `sections/BackgroundLab.tsx` is the Lab (Prototype Guide > Experimental Tools) and `ProductMediaEditor.tsx` uses the same registry. Never add a model-admission flag or environment bypass.

**Seller workspace (SC-001..SC-006, MB-001/003, SF-001, MC-001).** `src/seller-workspace.tsx` is a session store (`useReducer` plus `sessionStorage`) for what a Seller authors in the Seller Console: Store setup, Products, Scenes, Stories and chatbot answers. Seeded DEMO_DATA is never mutated: edits to a seeded Product are stored as overrides under its id, authored ids look like `PRD-NEW-001`. The derived rules (stock state, publication issues, Scene Private/restore, 24-hour Story phase) live there too, so the Seller Console, the Buyer (`sections/buyer-authored.tsx`), the Storefront and the Companion Catalogue (`sections/companion-catalogue.tsx`) read the same data and stay consistent. Taxonomy comes from `src/demo-data/taxonomy*.ts`, generated from a submitted, unratified manifest. In MVP mode, content describing Orders, payment, handoff or Claims is hidden by `usePrototypeMode()` (message-level in the Inboxes, panel-level elsewhere); the internal simulation keeps it.

**Demo data is hard-coded per surface.** It lives in module constants (`ORDERS`/`PRODUCTS` in SellerConsole, `PRODUCTS`/`POSTS`/`REVIEWS` in SellerStorefront, `DELIVERY` in MobileCourier, `WORK_ITEMS` in OperatorConsole, `PRODUCT`/`PHOTOS` in MobileBuyer) and, mostly, in JSX string literals; money is usually a pre-formatted string ("ETB 2,994").
- The story the current code tells (not yet the approved dataset): buyer Maya Tesfaye, seller Addis Atelier, Habesha Kemis ETB 2,800 + Courier Delivery ETB 180 + 0.5% Adulis surcharge ETB 14 = ETB 2,994 on Seller Order ADU-24091; courier Daniel K.; claim CLM-2041; moderation case MOD-1208 on Shoppable Post SHP-018.
- Each surface re-declares these entities, and the copies already conflict (IDs, statuses, buyers, totals). Search all of `src/` for an entity before changing it.

**UI layers**
- `src/sections/ShellHelpers.tsx`: `PhoneFrame` (the simulated device for Buyer, Companion and Courier: a 390×844 bezel on wider screens; at phone widths it fills the viewport with no outer device frame, keeping its status bar and story clock), `BottomNav`, `ConsoleTopBar`, sidebar items and the icon set shared by the mobile apps and both consoles. Storefront and Website build their own phone frames, which drop their bezel at phone widths the same way.
- `src/components/ui/`: inline-styled component library. Outside the Components showcase, only `Button`, the text inputs, `StatusBadge`, `Skeleton`, `OrderTimeline` and `SystemStatePanel` are used; surfaces implement their own cards, QR codes and navigation locally.
- Sheets inside phone surfaces are `absolute inset-0` within the frame. The library `Modal`/`BottomSheet` are `position: fixed` and would cover the whole page, not the phone.
- `AdulisLogo` is exported from `App.tsx` and imported back by several sections and `components/ui/Navigation.tsx`. That's a circular import that works only because the logo is used at render time.

## Styling and responsive behaviour

- **Tailwind v4** via `@tailwindcss/vite`; there is no Tailwind or PostCSS config.
  - Tokens live in `@theme inline` in `src/index.css`. Use them as utilities (`bg-brand`, `text-text-muted`, `bg-courier-muted`, `font-display`) or as `var(--color-…)` in inline styles.
  - Tailwind's automatic source detection scans every non-gitignored file, Markdown included, so a utility-like word in a doc (this file too) adds a CSS rule to the build.
  - `index.css` is the source of truth; the hex values shown on the Foundations board are partly stale.
  - Keep the Google Fonts `@import url(...)` lines first in `index.css`.
- **Match the file's idiom.** The mobile apps and consoles mostly use Tailwind classes; Website, Storefront, Guide, Foundations and `components/ui` mostly use inline `style={{}}`.
- **Layout is desktop-first in fixed pixels.** Responsive rules in `index.css` adapt it by width category: phone (up to 640 px), tablet (641–1200 px, with some rules shared by everything up to 1200 px) and desktop (above 1200 px, the approved baseline). Targeted rules cover a range where needed, such as 1201–1439 px for the guided-flow card, and console panels adapt to their own width.
  - They override inline styles with `!important` and select by class hooks *and* DOM shape (`.app-sidebar > div:first-child > div`, `.seller-console-sidebar nav button > .flex-1`, `.phone-stage > p`, `.storefront-identity > div:last-child`, …). Keep those class names and the markup they target, or the overrides silently stop applying.
  - Only `SystemStates.tsx` and `DemoFlows.tsx` use Tailwind responsive variants.
  - Operator Console is desktop-first, and desktop remains its preferred experience, but it has no fixed-width canvas: it fits the host width without page overflow. Below desktop widths it shows a subtle "Desktop recommended" note. On a phone its navigation is a drawer, queue rows become cards, and the case and search panels go full-screen; elsewhere its wide tables scroll inside their own frames.
  - While a guided flow runs, the flow-guide card is docked below the content at up to 1200 px, so it never lies over the product. From 1201 to 1439 px it floats as on desktop, and the content gets extra scroll room so nothing stays under it. From 1440 px the established floating presentation is unchanged.
- **Invalid colour gotcha.** Appending hex alpha to a CSS variable (`` `${'var(--x)'}20` ``) produces invalid CSS that the browser drops.
  - Operator Console tints and the `Input` focus glow are affected, and the approved visuals render *without* them. Fixing them changes the look, so get sign-off first.
  - For translucent token colours, use Tailwind opacity modifiers (`border-brand/20`, already used) or `color-mix()` inline.
- **Keyboard focus.** Every control, the shared `Button` included, shows the global `:focus-visible` outline from `index.css`: 3 px of the info blue (`--color-info`), offset 2 px.
  - It appears for keyboard focus only, not on mouse or touch activation. Don't suppress it with an inline `outline: none`, and don't bring back the old hex-alpha focus shadow.
  - On a dark or photo surface where the blue lacks contrast, use the light inverse token instead: `outlineColor: 'var(--color-text-inverse)'`, as on the Buyer entry screen.
  - This is accessibility behaviour, not a brand-colour rule.

## Repo notes

- Figma Make integration: `.figma/make/*` scripts (bash plus the `figma` CLI) and the custom plugins in `vite.config.ts`.
  - The plugins read page metadata from `.figma/make/site.json`, replay the error overlay, add a react-refresh fallback and a dev-only stories route.
- The `@/` → `src` alias is configured but unused; imports are relative.
- Git stores LF; Git for Windows' `core.autocrlf=true` checks out CRLF.
- `.gitattributes` sends images, fonts and video to Git LFS.
- There are no local assets. The only external resources are Google Fonts (`index.css`) and four hotlinked Unsplash photos in `MobileBuyer.tsx`.
