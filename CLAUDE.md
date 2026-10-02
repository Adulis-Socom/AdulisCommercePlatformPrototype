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
- `pnpm exec tsc --noEmit -p tsconfig.json` — type-check; there is no script for it. The CLI runs TypeScript 5.9.x while VS Code bundles 6.x, so `tsconfig.json` must satisfy both. Don't add `baseUrl` (deprecated in 6.x) or `"ignoreDeprecations": "6.0"` (rejected by 5.9 with TS5103).
- `pnpm run build` → `dist/` (gitignored); add `--outDir <dir>` to build elsewhere.
- No linter or test runner exists.
- **Never run `pnpm run format` (or `.figma/make/format`).** oxfmt has no config and its defaults (double quotes, reflowed lines, LF) match neither the code style nor the CRLF checkout, so it rewrites every file. `oxfmt --check` already fails on all files for that reason.

## Architecture

**One SPA hosts every surface.** `src/App.tsx` is a prototype shell: a sidebar of 12 sections switched with `useState` (default: Master Demo). Each section is one file in `src/sections/`: seven product surfaces (Company Website, Seller Storefront, Mobile Buyer, Seller Companion, Courier, Seller Console, Operator Console) plus Prototype Guide, Foundations, Components showcase, Master Demo (`DemoFlows.tsx`) and System States. There is no URL state, so refresh always returns to the Master Demo.

**Guided flows drive cross-surface navigation.** `FLOW_DEFINITIONS` in `DemoFlows.tsx` lists flow stages as `{ section, target }`. `App.tsx` renders the floating flow-guide card and passes `target` to the section as its `demoTarget` prop, and each surface maps that string to its own initial screen, tab, or nav key. The mapping is untyped, so renaming a screen key inside a surface silently breaks flow steps. The rendered section is keyed by section + flow stage, so every flow step remounts it and resets its state. `PrototypeGuide.tsx` keeps a separate `DEMO_FLOWS` description list that has already drifted from `FLOW_DEFINITIONS`.

**Surfaces are self-contained state machines.** Each surface is a large default-export component with many file-local subcomponents and its own `useState` screen machine, e.g. the `Screen` union in `MobileBuyer.tsx`, or `PageKey` plus a desktop/390px view toggle in `CompanyWebsite.tsx`. Surfaces share no state. Continuity between them is only narrative, via matching hard-coded names and IDs.

**Demo data is hard-coded per surface.** It lives in module constants (`ORDERS`/`PRODUCTS` in SellerConsole, `PRODUCTS`/`POSTS`/`REVIEWS` in SellerStorefront, `DELIVERY` in MobileCourier, `WORK_ITEMS` in OperatorConsole, `PRODUCT`/`PHOTOS` in MobileBuyer) and, mostly, in JSX string literals; money is usually a pre-formatted string ("ETB 2,994").
- The story the current code tells (not yet the approved dataset): buyer Maya Tesfaye, seller Addis Atelier, Habesha Kemis ETB 2,800 + Courier Delivery ETB 180 + 0.5% Adulis surcharge ETB 14 = ETB 2,994 on Seller Order ADU-24091; courier Daniel K.; claim CLM-2041; moderation case MOD-1208 on Shoppable Post SHP-018.
- Each surface re-declares these entities, and the copies already conflict (IDs, statuses, buyers, totals). Search all of `src/` for an entity before changing it.

**UI layers**
- `src/sections/ShellHelpers.tsx`: `PhoneFrame` (390×844 simulated device for Buyer, Companion and Courier), `BottomNav`, `ConsoleTopBar`, sidebar items and the icon set shared by the mobile apps and both consoles. Storefront and Website build their own phone frames.
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
- **Layout is desktop-first in fixed pixels.** Phone and tablet behaviour comes from two media queries in `index.css` (`max-width: 640px` and `641px–1200px`).
  - They override inline styles with `!important` and select by class hooks *and* DOM shape (`.app-sidebar > div:first-child > div`, `.seller-console-sidebar nav button > .flex-1`, `.phone-stage > p`, `.storefront-identity > div:last-child`, …). Keep those class names and the markup they target, or the overrides silently stop applying.
  - Only `SystemStates.tsx` and `DemoFlows.tsx` use Tailwind responsive variants.
  - Operator Console is intentionally desktop-only (`min-width: 1180px` inside a horizontally scrolling `main`).
- **Invalid colour gotcha.** Appending hex alpha to a CSS variable (`` `${'var(--x)'}20` ``) produces invalid CSS that the browser drops.
  - Operator Console tints, the `Button` focus indicator and the `Input` focus glow are affected, and the approved visuals render *without* them. Fixing them changes the look, so get sign-off first.
  - For translucent token colours, use Tailwind opacity modifiers (`border-brand/20`, already used) or `color-mix()` inline.

## Repo notes

- Figma Make integration: `.figma/make/*` scripts (bash plus the `figma` CLI) and the custom plugins in `vite.config.ts`.
  - The plugins read page metadata from `.figma/make/site.json`, replay the error overlay, add a react-refresh fallback and a dev-only stories route.
- The `@/` → `src` alias is configured but unused; imports are relative.
- Git stores LF; Git for Windows' `core.autocrlf=true` checks out CRLF.
- `.gitattributes` sends images, fonts and video to Git LFS.
- There are no local assets. The only external resources are Google Fonts (`index.css`) and four hotlinked Unsplash photos in `MobileBuyer.tsx`.
