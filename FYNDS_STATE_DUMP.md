# FYNDS_STATE_DUMP.md
_Generated: 2026-05-21. Read-only reconnaissance pass. No code was modified._

---

## 1. Plain-language summary

**FACT.** Fynds is a Next.js web application that acts as an AI-powered fashion shopping assistant. A user types a natural-language request ("comfortable dress for a rooftop dinner") into a chat interface. The server sends that message to Claude (Haiku model), which returns structured JSON classifying the request and generating an optimized search query. That query is passed to the Serper Google Shopping API, which returns live product results displayed in a side panel. For occasion-based queries, Claude returns multiple coordinated outfit pieces and parallel searches are run for each. Users can save products to a favorites list or a cart, select size/color options, and proceed through a multi-step checkout flow backed by a browser-automation agent (Playwright) that attempts to complete purchases on third-party retailer sites. A style quiz on first visit collects gender, aesthetic, budget, and size preferences that are appended to Claude's system prompt on subsequent requests.

---

## 2. Tech stack & dependencies

**FACT** (from `package.json`):

| Layer | Library | Version | Notes |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | Very recent; App Router |
| UI | React / React DOM | 19.2.3 | Very recent |
| Language | TypeScript | ^5 | |
| Styling | Tailwind CSS | ^4 | PostCSS config present |
| AI | @anthropic-ai/sdk | ^0.78.0 | |
| Auth | next-auth | ^5.0.0-beta.30 | **⚠ Beta — not stable API** |
| Browser automation | playwright-core | ^1.58.2 | Chromium only |
| Stealth | puppeteer-extra-plugin-stealth | ^2.11.2 | **⚠ Installed but never imported in source** |
| ID generation | uuid | ^13.0.0 | |
| Fonts | Inter, DM Sans | via next/font/google | |

**INFERENCE.** `puppeteer-extra-plugin-stealth` is likely a leftover from an earlier approach; the anti-detection work is currently done via Playwright's native `addInitScript` in `lib/purchase-agent/browser.ts`.

---

## 3. Architecture overview

**FACT.**

```
Browser
  │
  ├─ GET /          → Landing page (static, "Start Shopping" CTA)
  │
  └─ GET /shop      → ChatInterface (main app)
       │
       ├─ POST /api/chat
       │     ├─ Builds system prompt (base + optional style profile)
       │     ├─ Calls Claude Haiku → returns JSON
       │     │   { search_query, response_text, is_shopping_query,
       │     │     is_outfit_query, outfit_pieces[] }
       │     └─ Calls Serper /shopping for each query
       │         (1 call for item, N parallel calls for outfit)
       │
       ├─ POST /api/product-options
       │     ├─ Fetches Google Shopping page HTML
       │     ├─ Scrapes merchant page HTML
       │     └─ Calls Claude Haiku → returns { sizes, colors, other }
       │
       ├─ POST /api/checkout
       │     ├─ Creates in-memory session (UUID key, Map store)
       │     └─ Spawns background: processPurchaseOrder()
       │           ├─ MOCK_MODE=true → simulated delays, 80% success
       │           └─ MOCK_MODE=false → Playwright browser automation
       │                 ├─ AmazonStrategy  (domain-specific CSS selectors)
       │                 └─ GenericStrategy (Claude Sonnet + tool use loop)
       │
       └─ GET /api/checkout/status?sessionId=…
             └─ Server-Sent Events stream from in-memory SessionStore
```

**Client-side state (all React context + localStorage):**
- `StoreContext` — cart, favorites, style profile
- `CheckoutContext` — checkout step, shipping, payment, live status

---

## 4. File / directory map

**FACT.**

```
/
├─ app/
│   ├─ layout.tsx               Root layout; loads fonts; wraps in <Providers>
│   ├─ page.tsx                  Landing page (gradient hero + "Start Shopping" link)
│   ├─ globals.css               Global styles / Tailwind base
│   └─ api/
│       ├─ chat/route.ts         Main AI chat endpoint (Claude + Serper)
│       ├─ product-options/      Scrape + Claude to get size/color options for a product
│       │   └─ route.ts
│       └─ checkout/
│           ├─ route.ts          Start checkout session, spawn purchase agent
│           └─ status/route.ts   SSE stream for live checkout status
│
├─ components/
│   ├─ ChatInterface.tsx          Main UI: chat column + product/outfit column
│   ├─ MessageBubble.tsx          Renders individual chat messages
│   ├─ ProductGrid.tsx            Grid of ProductCard for item search results
│   ├─ ProductCard.tsx            Single product tile (save, cart, options)
│   ├─ OutfitView.tsx             Outfit layout: N pieces each with their products
│   ├─ SearchBar.tsx              Chat input with send button
│   ├─ SuggestedQueries.tsx       Preset query chips shown on first load
│   ├─ LoadingIndicator.tsx       Typing indicator during AI call
│   ├─ StyleQuiz.tsx              4-step onboarding modal (gender/aesthetic/budget/size)
│   ├─ FilterSidebar.tsx          Desktop sidebar + mobile chips for filtering results
│   ├─ Header.tsx                 Top nav (logo, favorites, cart icons, auth)
│   ├─ CartDrawer.tsx             Slide-in cart with checkout CTA
│   ├─ FavoritesDrawer.tsx        Slide-in favorites list
│   ├─ CheckoutFlow.tsx           Multi-step checkout modal controller
│   ├─ Providers.tsx              Wraps app in SessionProvider, StoreProvider, CheckoutProvider
│   └─ checkout/
│       ├─ CartReview.tsx         Step 1: review items before checkout
│       ├─ ShippingForm.tsx       Step 2: shipping address form
│       ├─ PaymentForm.tsx        Step 3: card details form
│       ├─ ConfirmOrder.tsx       Step 4: review before submitting
│       ├─ OrderProgress.tsx      Processing view with per-item status updates
│       └─ OrderComplete.tsx      Final confirmation screen
│
├─ lib/
│   ├─ types.ts                   All shared TypeScript interfaces
│   ├─ constants.ts               Base system prompt + buildSystemPrompt() + WELCOME_MESSAGE
│   ├─ store-context.tsx          Cart/favorites/profile state + localStorage persistence
│   ├─ checkout-context.tsx       Checkout flow state + SSE subscription
│   ├─ auth.ts                    NextAuth config (Google OAuth)
│   └─ purchase-agent/
│       ├─ index.ts               Entry point; routes to mock or real agent
│       ├─ browser.ts             Playwright browser/context/page factory + stealth setup
│       ├─ session-store.ts       In-memory Map + EventEmitter for checkout sessions
│       └─ strategies/
│           ├─ base.ts            RetailerStrategy interface + PurchaseResult type
│           ├─ registry.ts        Strategy lookup by domain
│           ├─ amazon.ts          Hardcoded CSS selector strategy for Amazon
│           └─ generic.ts         AI-guided strategy: Claude Sonnet + 6-tool loop
│
├─ Dockerfile                     Node 20 + Chromium/Playwright deps for Railway deploy
├─ railway.json                   Railway build config (Dockerfile builder)
├─ .vercel/project.json           Vercel project reference
├─ package.json                   Dependencies + scripts
├─ tsconfig.json                  TypeScript config
├─ eslint.config.mjs              ESLint config
└─ fynds/                         Brand assets (images, PDFs, fonts) — not app code
```

**FACT.** `node_modules/` and `.next/` exist but are excluded above.

---

## 5. Data model

**FACT.** There is **no database**. All persistent state lives in browser `localStorage` under these keys:

| Key | Type | TTL | Notes |
|---|---|---|---|
| `fynds-profile` | `StyleProfile` | Permanent (auth) / Permanent (guest) | Persisted on quiz completion; survives refresh |
| `fynds-cart` | `SavedProduct[]` | 1 hour for guests; permanent for signed-in | Pruned by `pruneExpired()` on load and every 60s |
| `fynds-favorites` | `SavedProduct[]` | 1 hour for guests; permanent for signed-in | Same pruning logic |

**INFERENCE.** The "permanent for signed-in" distinction exists in code (TTL pruning is skipped when `session?.user` is truthy) but there is no backend store — signed-in user data still only lives in that user's localStorage. Cross-device sync does not exist.

**FACT.** Key interfaces (from `lib/types.ts`):

```ts
StyleProfile     { aesthetic, budgetRange, sizes, shoeSize, gender, avoidBrands, notes }
Product          { title, price, source, link, imageUrl, position, rating?, ratingCount?,
                   productId?, delivery? }
SavedProduct     extends Product + { savedAt: number, options?: ProductOptions }
ProductOptions   { size?, color?, notes? }
Message          { id, role, content, products?, outfitPieces? }
OutfitPiece      { category, search_query, styling_note }
CheckoutStatus   { sessionId, overallStatus, items: ItemStatusUpdate[], startedAt, completedAt? }
```

**FACT.** Checkout session state lives in a server-side in-memory `Map` (`lib/purchase-agent/session-store.ts`). It is cleaned up 5 minutes after completion. A server restart clears all active sessions.

---

## 6. External dependencies

**FACT** (from `.env.local` key names and source code):

| Service | Purpose | Env var(s) | Cost/limit notes |
|---|---|---|---|
| Anthropic API | Chat (Haiku), product options (Haiku), generic checkout agent (Sonnet) | `ANTHROPIC_API_KEY` | Billed per token; Sonnet >> Haiku cost |
| Serper | Google Shopping search | `SERPER_API_KEY` | Billed per query; outfit mode = N queries per turn |
| Google OAuth | User sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Free; requires GCP project |
| NextAuth | Session management | `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Self-hosted |
| Vercel | Hosting (previous or parallel) | project config in `.vercel/` | Billed by usage |
| Railway | Hosting (Dockerfile; needed for Playwright) | project config in `railway.json` | Billed by usage |
| Playwright / Chromium | Real checkout automation | bundled in Dockerfile | No API key; ToS risk with retailers |

**FACT.** Models used:
- `claude-haiku-4-5-20251001` — chat + product-options
- `claude-sonnet-4-20250514` — generic checkout strategy (AI-guided agentic loop)

**FACT.** `CHECKOUT_MOCK` env var: if value is exactly the string `"true"`, mock mode runs. Any other value (including unset) triggers the real Playwright agent.

---

## 7. How to run it

**FACT** (from `package.json`, `Dockerfile`, `.env.local`):

```bash
# Install dependencies
npm install

# Install Playwright browser (required for real checkout; skip for mock-only)
npx playwright install chromium

# Create .env.local with:
#   ANTHROPIC_API_KEY=...
#   SERPER_API_KEY=...
#   AUTH_SECRET=...
#   GOOGLE_CLIENT_ID=...
#   GOOGLE_CLIENT_SECRET=...
#   NEXTAUTH_URL=http://localhost:3003
#   NEXTAUTH_SECRET=...
#   CHECKOUT_MOCK=true      # set to "true" to avoid real browser automation

# Run dev server
npm run dev        # starts on port 3003

# Production build
npm run build
npm start          # starts on port 3000
```

**FACT.** Docker (for Railway deployment):
```bash
docker build -t fynds-app .
docker run -p 3000:3000 --env-file .env.local fynds-app
```

**FACT.** No database migrations, seed scripts, or test commands exist.

---

## 8. Current functional state

### Works end-to-end (FACT)

- **Chat → product search**: user message → Claude Haiku → Serper → product grid. Verified in source; pipeline is complete.
- **Outfit mode**: occasion query → Claude returns `outfit_pieces[]` → parallel Serper searches → `OutfitView`. Complete in source.
- **Style quiz**: 4-step modal on first visit, profile saved to `localStorage`, injected into system prompt on every request.
- **localStorage persistence**: cart, favorites, and style profile survive page refresh. Guest TTL pruning is implemented.
- **Cart + favorites drawers**: add/remove/toggle products, drawer open/close state.
- **Checkout flow UI**: all 6 steps (cart review → shipping → payment → confirm → processing → complete) are implemented as components.
- **Checkout mock mode**: when `CHECKOUT_MOCK=true`, simulated steps with 80% success / 20% CAPTCHA failure. SSE stream works.
- **Product options modal**: fetches Google Shopping + merchant page HTML, Claude returns sizes/colors/other variants.
- **Mobile layout**: chat column stacks on mobile; products render inline in chat (`md:hidden` blocks); product panel hidden on mobile.
- **Filter sidebar**: desktop sidebar + mobile chips present (FilterSidebar component).

### Half-built or uncertain (FACT + INFERENCE)

- **Auth (Google OAuth)**: NextAuth is configured with Google provider. `StoreContext` reads `session?.user` to conditionally skip TTL pruning. **However**, no route is actually protected — `/shop` is accessible without sign-in, and there is no UI prompt to sign in except via the Header. **INFERENCE**: Auth was wired up but the user flow that requires or rewards sign-in (e.g., cross-device profile sync) was never completed.
- **Real checkout agent (Playwright)**: Amazon strategy is fully implemented with hardcoded selectors; Generic strategy uses Claude Sonnet in an agentic tool-use loop up to 15 iterations. Whether this works against live retailer sites is **unknown** — it has not been tested in CI, has no test coverage, and real-world reliability depends on retailer DOM stability and bot detection.
- **Filter sidebar integration**: `FilterSidebar` component exists and renders. **INFERENCE**: filters likely apply to already-returned products client-side; unclear whether they influence the Claude search query.

### Dead / unused (FACT)

- **`puppeteer-extra-plugin-stealth`**: listed in `package.json` dependencies but never imported in any source file.
- **Chat history persistence**: message history lives in React state only. A page refresh loses the entire conversation.
- **`shoeSize` field in StyleProfile**: collected in the style quiz type definition; the quiz component does not have a shoe size step — it stops at 4 steps (gender, aesthetic, budget, clothing size). The field is always `""`.
- **`avoidBrands` and `notes` fields in StyleProfile**: present in the type and in `buildSystemPrompt()`, but not collected in the quiz UI.

---

## 9. Evolution from git history

**FACT** (from `git log --oneline`, 4 commits total):

| Commit | Message | What it represents |
|---|---|---|
| `a5b5165` | Initial commit: Fynds AI shopping assistant | Full working chat + Serper product search + style quiz + cart/favorites + outfit mode. Not a skeleton — core product was shipped in one commit. |
| `74e7e3c` | Add filter sidebar with price, clothing size, shoe size, and gender filters | Added `FilterSidebar` component with desktop/mobile variants. |
| `800e56e` | Update favicon | Asset only. |
| `2559fae` | Add automated checkout system with AI purchase agent | Entire checkout subsystem: UI flow, `CheckoutContext`, `/api/checkout`, `/api/checkout/status` (SSE), `lib/purchase-agent/` (mock + real), `app/api/product-options/`, Dockerfile, Railway config. |

**FACT.** No stale branches, reverted commits, or deleted features are visible. Development appears to be in an active or recently-active phase. **INFERENCE**: the project was developed in two large pushes rather than incremental commits, suggesting solo or small-team development.

---

## 10. Decisions baked into the code

**FACT + INFERENCE** (all inferences marked):

| Decision | Evidence | Likely reason (INFERENCE) |
|---|---|---|
| Claude Haiku for chat | `model: "claude-haiku-4-5-20251001"` in chat route | Latency and cost — chat needs to feel fast |
| Claude Sonnet for checkout agent | `model: "claude-sonnet-4-20250514"` in generic strategy | Checkout requires multi-step reasoning; accuracy >> cost for agentic loops |
| JSON-in-text output (not tool use) for chat | System prompt instructs Claude to return JSON; server does `JSON.parse()` | Simpler to implement; tool use adds schema definition overhead. Trade-off: less reliable |
| Serper for product data | `google.serper.dev/shopping` | Live Google Shopping results without building a product database; broadest possible inventory |
| No database | localStorage only | Early stage / avoids infra cost; limits cross-device use and signed-in value |
| SSE for checkout status | `text/event-stream` in status route | Checkout takes 30–180s per item; SSE is simpler than WebSockets for one-direction streaming |
| In-memory session store | `Map` + `EventEmitter` | No database; acceptable for short-lived checkout sessions. Doesn't survive restarts |
| Mock mode toggle | `CHECKOUT_MOCK` env var | Allows demo/dev without triggering real purchases |
| Railway over Vercel for production | `railway.json` with Dockerfile | Playwright requires a persistent process and system deps; Vercel serverless can't run Chromium reliably |
| next-auth v5 beta | `^5.0.0-beta.30` | v5 is the current active development branch; v4 is maintenance only. Risk: breaking API changes |

---

## 11. Risks / fragility

**FACT** (from source):

1. **Payment data in plaintext to Claude**: `GenericStrategy` includes the full card number and CVV in the system prompt sent to Claude API (`lib/purchase-agent/strategies/generic.ts:136–138`). This is a significant security concern.

2. **Real checkout agent fragility**: Amazon strategy uses hardcoded CSS selectors (`#buy-now-button`, `#add-to-cart-button`, `#submitOrderButtonId`, etc.) that break whenever Amazon updates its DOM. Generic strategy caps at 15 iterations; complex checkout flows may exceed this.

3. **CAPTCHA and sign-in walls**: The Amazon strategy immediately returns failure if it hits a sign-in page or CAPTCHA. A substantial fraction of real purchase attempts will hit one of these.

4. **In-memory session store**: Restarting the Railway process during an active checkout loses all session state. The SSE client gets an error; no recovery path exists.

5. **No auth on API routes**: `/api/chat`, `/api/product-options`, `/api/checkout` have no authentication checks. Any caller with the URL can invoke them and incur Anthropic/Serper API costs.

6. **`CHECKOUT_MOCK` default is real**: The check is `=== "true"` — if the variable is absent, real Playwright runs. An accidental production deploy without this set would trigger real checkout attempts.

7. **JSON parse reliability for chat**: The entire product-display pipeline depends on Claude returning valid JSON. The fallback degrades silently (user gets text, no products). Code fences are stripped, but other malformed output isn't handled.

8. **next-auth v5 beta**: `^5.0.0-beta.30` — beta software in a production path.

9. **No tests**: Zero test files in the repo. No CI configuration.

10. **Chat history not persisted**: Every page refresh starts a new session with no history. The style profile persists but the conversation does not.

11. **`shoeSize`, `avoidBrands`, `notes` fields in StyleProfile**: collected in the type, handled in `buildSystemPrompt()`, but the quiz never collects them. They are always empty strings passed to Claude.

---

## 12. OPEN QUESTIONS — what the code can't tell me

_(Phrased as direct questions to the human. These are gaps a strategic planning doc needs.)_

**Product / vision**

1. Who is the target user? Is this aimed at a specific demographic (age, income, fashion-savviness), or is it broad?
2. What problem does Fynds solve that users can't solve today with Google Shopping, Pinterest, or just Googling?
3. Is Fynds intended to be a consumer product, a B2B tool (e.g., for stylists), or something else? Is that decided?
4. What does success look like in 6 months? Any specific metrics (users, revenue, retention, conversion)?

**Decisions made**

5. Why Google Shopping (via Serper) over building a curated product catalog? Was a catalog approach considered and rejected?
6. Why chat as the primary interface rather than a feed or filter-first UI? Was this deliberately chosen or was it the first thing that worked?
7. Why those four style quiz fields (gender, aesthetic, budget, size)? The type has `shoeSize`, `avoidBrands`, and `notes` but the quiz doesn't collect them — were those fields planned and deferred, or is the quiz intentionally minimal?
8. Was the checkout agent meant to ship to real users, or is it a demo/proof-of-concept? Is mock mode the intended production state?

**What's intentionally out of scope**

9. Is there a deliberate decision not to persist chat history? Or is that just not built yet?
10. Is there a reason not to use Claude's structured output / tool-use API for the chat response (instead of JSON-in-text)?
11. Auth is wired but doesn't gate anything. What was the intended value of signing in? Cross-device sync? Saved history? Something else?

**Where it's going**

12. What is the next thing planned to ship? Is mobile the agreed next milestone?
13. Is there a monetization model? (Affiliate links, subscription, retailer partnerships, something else?)
14. The checkout agent is the most complex and risky part of the codebase. Is it core to the product vision, or is it an experiment that could be cut?
15. Are there known users / testers giving feedback, or is this still pre-user?

**Technical gaps**

16. Is Railway the active production deployment, or Vercel, or both? Which URL do real users hit?
17. Has the real checkout agent (non-mock) ever been tested end-to-end against a live retailer? If so, what was the success rate?
18. The `puppeteer-extra-plugin-stealth` package is installed but unused. Was it deliberately removed from the implementation, or is it waiting to be wired in?
19. Are there any Serper or Anthropic API usage limits or cost constraints that are already being hit?
20. Is there a deployment process / CI, or is it manual push-to-Railway/Vercel?
