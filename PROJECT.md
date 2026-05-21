# Fynds — PROJECT.md
### Build source of truth for Claude Code
*Living doc. Updated as versions ship and validate. The strategy & "why" live in `fynds-product-strategy-and-roadmap.md`; **this** doc is the "what to build, in what order, and how we know a version is done." The former Phase 0 spec has been folded in here (see §7–§10).*

---

## 0. North star
**Fynds reduces the friction of shopping online** — it kills the due diligence of sifting through endless options to find the few that fit a user's taste. Fynds is an **AI personal stylist**; the moat is **taste as friction-reduction** (the more it knows you, the less work finding "the one" takes).

> JTBD: "When I have an occasion, a need, or just a vibe but don't know what to buy or where, I want a stylist who knows my taste and budget to hand me a few right options and how to combine them, so I can look good without doing the hunting myself."

**Every build decision serves three things at once:** lower friction · capture taste signal · mobile-first.

---

## 1. How this doc works
- Structure is **Phase → Version**. Each forward version states: **Scope** (what gets built), **Data tracked** (what it instruments/measures), and **Exit criteria** (the gate to advance).
- **PM term:** the "metric/benchmark that must be validated to move on" is the **exit criteria** (a.k.a. *validation gate* / *release gate*). Infra-only versions use **functional acceptance criteria**; **metric gates** apply once instrumentation + real traffic exist (v0.5.3+).
- Update the **Version Log (§11)** every time a version ships or a gate is met.
- **Phase numbering note (reconciliation with the strategy doc):** here, **Phase 0 = the current shipped baseline** (broken out by code history). The forward foundational work the strategy doc splits across its "Phase 0 (mobile-first core loop)" and "Phase 0.5 (backend/instrumentation)" is consolidated here as **Phase 0.5 versions**. Phases 1+ match the strategy doc.

---

## 2. Tech stack & how to run
**Stack (from current repo):** Next.js 16.1.6 (App Router) · React 19.2.3 · TypeScript 5 · Tailwind 4 · `@anthropic-ai/sdk` 0.78 · `next-auth` 5.0.0-beta (⚠ beta in prod path) · `playwright-core` 1.58 (real checkout only, off by default) · `uuid` 13 · `vitest` 4 (dev, tests).
**Models:** `claude-haiku-4-5-20251001` (chat + product-options) · `claude-sonnet-4-20250514` (generic checkout agent, off by default).
**External:** Serper (`google.serper.dev/shopping`) · Google OAuth (NextAuth) · **Vercel** (production host, serverless).
**No database, no CI** in the baseline. First tests added at v0.5.1.

```bash
npm install
npx playwright install chromium      # real checkout only; skip for mock
# .env.local: ANTHROPIC_API_KEY, SERPER_API_KEY, AUTH_SECRET,
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_URL, NEXTAUTH_SECRET
#   CHECKOUT_REAL=true   # explicit opt-in required; absent/blank → mock (fail-safe)
npm run dev        # :3003
npm run build && npm start   # :3000
npm test                     # vitest run (unit tests)
```

---

## 3. Architecture (Phase 0 baseline)
**Host: Vercel (serverless).** The Playwright checkout agent cannot run on Vercel; `CHECKOUT_REAL=true` is therefore unreachable in production. Real-mode checkout was always experimental and is effectively retired until a long-running host is chosen (see v0.5.5).

```
/shop → ChatInterface
  POST /api/chat            → buildSystemPrompt(+style profile) → Claude Haiku (JSON) → Serper (1 query, or N for outfits)
  POST /api/product-options → scrape Google Shopping + merchant HTML → Claude Haiku → {sizes,colors,other}
  POST /api/checkout        → in-memory session (Map+EventEmitter) → processPurchaseOrder()
                               MOCK (default) | REAL Playwright (requires CHECKOUT_REAL=true; not viable on Vercel)
  GET  /api/checkout/status → SSE stream (owner-only; requires auth)
State: React Context + localStorage (StoreContext, CheckoutContext). No DB.
```

---

## 4. Cross-cutting mandates (apply to EVERY version)
1. **Mobile-first.** The phone is the primary surface, not an adaptation. Concretely, the baseline is backwards (product panel hidden on mobile; products fall back to inline `md:hidden`) — that degraded path must be replaced with a designed phone experience (full-bleed results, bottom-sheet drawers, thumb-reachable + gesture-based actions, PWA shell). Desktop is the responsive adaptation.
2. **Instrument from day one.** No core interaction ships without emitting its event (§7). Impression logging is mandatory — it cannot be backfilled.
3. **Security.** Never put card/PII in a model prompt. Authenticate + rate-limit all API routes. `CHECKOUT_REAL=true` is the explicit opt-in for real browser automation; absent/blank always runs mock.
4. **Friction-reduction.** Every surface should *remove* steps, not add them. Low-friction signal capture; "make getting value and giving signal the same action."
5. **Collaborative, not surveillance** (privacy stance, §10).
6. **The event schema is UI-agnostic** — redesigns change surfaces, not event types.
7. **Follow the Git workflow** for every version — branching, commit cadence, PR handoff. See **§ Git workflow** below.

---

## Git workflow
*Applies to every version from v0.5.1 onward. Claude Code runs all git commands; the owner approves in plain English and does the final merge.*

### STEP ZERO — before the first commit of any session
Confirm `.env.local` and any file with API keys or secrets are in `.gitignore` and **not tracked by git**. Run `git ls-files .env.local` and related secret files; if anything sensitive shows up as tracked, **STOP and report before committing**. A key in git history must be treated as compromised — this is the one mistake that isn't cleanly undoable.

### Branching
- One branch per version: `feat/<version>-<slug>` (e.g. `feat/v0.5.1-security-triage`).
- **`main` is always-deployable** — it auto-deploys to Vercel. Unfinished or build-breaking work never lands on `main`.

### Commits — propose → approve → run
For each commit, tell the owner:
1. **What it does** — one line, imperative mood.
2. **That the build passes** (`npm run build` green).
3. **Which acceptance-test item(s) it satisfies.**

Then **wait for "yes"** before running the commit. The owner approves the summary, not the diff.

Rules:
- One coherent change per commit: small enough to describe in a sentence, large enough that `npm run build` still passes. If the message needs an "and," split it.
- Never commit secrets. Never commit a build-breaking state.
- If an approved change turns out wrong, Claude Code handles the rollback and explains in plain English what is being undone.

### End of version
When the §14/§16/… acceptance checklist is green, Claude Code:
1. Opens a PR from the version branch into `main`.
2. Pastes the checklist results in the PR description.
3. Provides the Vercel preview URL for the owner to click through.

The owner does the final merge after reviewing.

### Granularity
Readable, not micro-commits. The commit list should read as a clear sequence of decisions, not a line-by-line log.

---

## 5. Phase 0 — Current state (shipped baseline, by code history)
*Descriptive. This is what exists today; statuses from the recon pass.*

**v0.1 — Core discovery loop** *(commit a5b5165)*
Chat → Claude Haiku → Serper → product grid; **outfit mode** (N parallel searches); 4-step style quiz → localStorage profile injected into system prompt; cart + favorites; localStorage persistence with guest TTL pruning.
*Status:* works end-to-end. *Gaps:* localStorage-only (no cross-device, no chat-history persistence); `shoeSize` / `avoidBrands` / `notes` collected in type + prompt but never gathered by the quiz (always empty).

**v0.2 — Filtering** *(commit 74e7e3c; favicon 800e56e)*
FilterSidebar (price, clothing size, shoe size, gender) — desktop sidebar + mobile chips.
*Status:* present. *Inference:* filters apply client-side to returned results; unclear whether they influence the Claude/Serper query.

**v0.3 — Automated checkout system** *(commit 2559fae)*
6-step checkout UI (cart review → shipping → payment → confirm → processing → complete); CheckoutContext; `/api/checkout` + SSE `/status`; purchase-agent (mock; real = Amazon hardcoded selectors + Generic Sonnet tool-loop ≤15 iters); `/api/product-options`; Dockerfile + Railway.
*Status:* mock works; **real agent untested** against live retailers. *Risks (drive Phase 0.5):* card # + CVV sent in plaintext to Claude (GenericStrategy); fragile hardcoded selectors; instant failure on CAPTCHA/sign-in walls; in-memory session store lost on restart; **no auth on API routes**; `CHECKOUT_MOCK` defaults to REAL if unset.

**Cross-cutting current state:** NextAuth/Google wired but **gates nothing**; no DB; no tests/CI; next-auth v5 beta.

---

## 6. Phase 0.5 — Foundation: secure, backed, instrumented, mobile-first
*Forward work. Dependency-ordered. Each version: Scope · Data tracked · Exit criteria.*

### v0.5.1 — Security & cost triage (stop-ship)
**Scope:** Remove card #/CVV from anything sent to Claude — retire or hard-gate `GenericStrategy` (default to mock until fulfillment V1 lands). Add auth + rate-limiting to `/api/chat`, `/api/product-options`, `/api/checkout`. Make `CHECKOUT_MOCK` fail safe (absent/blank ⇒ mock).
**Data tracked:** `error_event`; basic `api_cost` (server-side, even pre-spine).
**Exit criteria (functional):** (1) code audit confirms **no card/PII in any model prompt**; (2) all API routes reject unauthenticated / over-rate calls; (3) missing/blank `CHECKOUT_MOCK` runs mock, never real.
**Acceptance tests:** §14.
**Known tech debt — rate limiter:** The v0.5.1 rate limiter is **in-memory** (a single `Map` keyed by IP, ~20 lines, no new dependency). **Because Fynds is already on Vercel (serverless), per-instance counters are unreliable now** — a burst from one IP may split across Vercel instances and undercount. This is accepted for the stop-ship given low traffic, but is a **near-term gap to close**. Replace with a durable distributed limiter (`@upstash/ratelimit` + Upstash Redis) as a follow-up task, not deferred to v0.5.5. Priority: before meaningful traffic or public launch.

### v0.5.2 — Backend foundation + identity
**Scope:** Stand up backend (**Supabase** — already in connectors → Postgres + Auth). Move source-of-truth for profile/cart/favorites server-side (localStorage becomes a cache). **Recommended identity model:** Supabase **anonymous auth** on first visit → **link Google identity** on sign-in, so `user_id` (`auth.users.id`) is stable across the anon→signed-in transition and stitching needs no data migration (also retires the next-auth v5 *beta* risk). Emit `identity_merge` for analytics only.
**Schema:** full DDL in **§13**.
**Data tracked:** `session_start/end`, `sign_in`/`sign_up`, `identity_merge`.
**Exit criteria:** (1) profile/cart/favorites persist **across devices** for signed-in users; (2) an anonymous session's data **carries over** automatically on first sign-in (stable `user_id`); (3) persisted entities survive a server restart (checkout sessions may stay ephemeral); (4) **RLS verified** — a user can read/write only their own rows.
**Acceptance tests:** §16.

### v0.5.3 — Instrumentation spine
**Scope:** `events` table (typed envelope + JSONB `properties`) + `products` dimension keyed by `product_key` (§7). Emit the **minimal event subset** across the existing loop: `query_submitted`, `query_classified` (`parse_ok` + `latency_ms`), `search_executed`, `results_impression`, `product_save`, `product_dismiss`, `buy_clicked` (stub until V1), `api_cost`.
**Data tracked:** the minimal subset → most §8 metrics become computable.
**Exit criteria:** (1) every core-loop interaction emits a well-formed event (envelope complete); (2) `parse_success`, results-latency p75, save rate, and "nothing landed" rate are computable from real data; (3) **impression logging captures shown items + positions** (the un-backfillable one).
**Spec:** §15.

### v0.5.4 — Mobile-first redesign
**Scope:** Rebuild the core experience phone-first (see §4.1): replace the hidden-panel / inline-fallback path with a designed phone layout — full-bleed results, bottom-sheet drawers (cart/favorites/filters), phone-native gestures (swipe to save/dismiss), thumb-reach actions. Add PWA shell (manifest, installable). Set a mobile performance budget. Desktop = responsive adaptation. Add `platform` to every event; carry instrumentation forward.
**Data tracked:** `platform` split on all events; mobile latency; early swipe/dismiss signal if swipe-save lands here.
**Exit criteria:** (1) **mobile parity ≥ 0.9** (intent-session success mobile ÷ desktop); (2) p75 results latency acceptable on a mid-tier phone; (3) core loop fully usable one-handed (no degraded fallback); (4) PWA installable + Lighthouse mobile basics pass.
**Spec:** §17.

### v0.5.5 — Fulfillment V1 (affiliate handoff) + conversion signal
**Scope:** Replace the default purchase path with **affiliate deep-link handoff** (Skimlinks/Sovrn, Rakuten, Amazon Associates). Wire `buy_clicked` (`product_key`, `retailer`, `price_at_event`, `has_affiliate`, `query_id`). Retire Playwright from the default flow (keep behind a flag/experiment) → drop Chromium/Railway dependency for default; Vercel-hostable. Fully closes the v0.5.1 checkout-agent risk in the default path.
**Note:** The Playwright checkout agent cannot run on Vercel (serverless, no persistent process). This version's affiliate handoff path makes that moot for the default flow. If the agent is retained behind a flag for future use, it would require a separate long-running host.
**Data tracked:** `buy_clicked`, click-out rate, `has_affiliate` coverage.
**Exit criteria:** (1) click-out flow works on mobile; (2) click-out rate measurable and non-trivial; (3) default path runs **without** Playwright/Chromium; (4) affiliate attribution confirmed for the top retailers.
**Spec:** §18.

### Phase 0.5 → Phase 1 gate
The full **"core loop solid" bar (§8)** — intent-session success, week-1 return, outfit engagement, technical health, mobile parity, and the qualitative "users describe it like a stylist" signal — holding **directionally and sustained** across a few hundred intent sessions.

---

## 7. Event-logging schema *(folded in from the Phase 0 spec)*

**Principles:** append-only stream separate from app state · **log impressions, not just actions** · capture **negative signal** (`product_dismiss`) + dwell · stable `product_key` · stitch identity (`anon_id`→`user_id`) · cheap to extend + versioned.

**Common envelope (every event):** `event_id` (uuid) · `event_type` · `ts` (UTC) · `anon_id` · `user_id|null` · `session_id` · `platform` (`mobile_web|desktop_web|ios|android`) · `app_version` · `surface` (`grid|inline|outfit|onboarding|drawer`) · `schema_version` · `properties` (json).

**Product identity:** `product_key = hash(normalized_source_domain | normalized_title | canonical_link_sans_query)`. Keep a `products` dimension keyed by `product_key` (latest title/price/source/link/image/attributes); events store `product_key` + `price_at_event` and join to it.

**Event catalog** (properties listed are *in addition to* the envelope):

| Group | Event | Fires when | Key properties |
|---|---|---|---|
| Session/identity | `session_start`/`_end` | open / idle-close | `duration_ms` |
| | `sign_in`/`sign_up` | auth completes | `method` |
| | `identity_merge` | anon→user | `anon_id`, `user_id` |
| Query/search | `query_submitted` | user sends request | `query_id`, `raw_text`, `entry_point` (`chip\|free_text\|more_like_this\|swap\|moodboard`) |
| | `query_classified` | Claude returns JSON | `query_id`, `is_shopping`, `is_outfit`, `generated_query`, `outfit_pieces[]`, `model`, `latency_ms`, **`parse_ok`** |
| | `search_executed` | Serper returns | `query_id`, `provider`, `n_results`, `latency_ms`, `error?` |
| Results | `results_impression` | result set renders | `query_id`, `result_set_id`, `is_outfit`, `items[]{product_key,position}` |
| | `outfit_impression` | outfit renders | `outfit_id`, `query_id`, `pieces[]{category,product_key,position}` |
| Engagement | `product_view` | detail/options open | `product_key`, `query_id`, `position`, `dwell_ms` |
| | `product_save`/`_unsave` | favorite toggle | `product_key`, `query_id`, `position`, `options?` |
| | `product_dismiss` | "not for me" | `product_key`, `query_id`, `reason?` |
| | `more_like_this` | ask for similar | `seed`(`product_key\|outfit_id`) → links new `query_id` |
| | `reaction` | love/like/pass | `target_type`(`product\|outfit\|swap`), `target_key`, `sentiment` |
| | `add_to_cart`/`remove_from_cart` | cart change | `product_key`, `options?` |
| Outfit | `outfit_piece_action` | action on a piece | `outfit_id`, `category`, `product_key`, `action`(`save\|dismiss\|swap_request`) |
| | `swap_request` | "change the shoes" | `outfit_id`, `category`, `from_product_key` → links `query_id` |
| Onboarding | `onboarding_started`/`_completed`/`_skipped` | cold-start flow | `n_swipes` |
| | `onboarding_swipe` | each love/pass | `item_key`, `attributes?`, `sentiment`(`love\|pass`), `step` |
| Conversion | `buy_clicked` | click out to retailer | `product_key`, `retailer`, `price_at_event`, `has_affiliate`, `query_id` |
| | `order_confirmed` | *(Phase 2)* | `order_id`, `items[]`, `total` |
| Visual | `image_uploaded` | photo/moodboard added | `image_id`, `purpose`(`moodboard\|inspo\|closet`), `n_attributes_extracted` |
| Operational | `api_cost` | per AI/search call | `service`(`anthropic\|serper`), `tokens?`, `cost_usd` |
| | `error_event` | handled failure | `scope`, `class` (no PII / no raw payloads) |

**Ship-first subset (v0.5.3):** `session_start/end`, `identity_merge`, `query_submitted`, `query_classified` (+`parse_ok`+`latency_ms`), `search_executed`, `results_impression`, `product_save`, `product_dismiss`, `buy_clicked`, `api_cost`. Add the rest as each surface ships.

**Storage:** one append-only `events` table (typed envelope columns + JSONB `properties`) + a `products` dimension. No warehouse needed yet; slots into the v0.5.2 backend.

---

## 8. "Core loop solid" metrics + gate *(folded in)*
The loop: **open → describe a need → curated results → engage → click out.** "Solid" = it reliably delivers something worth acting on, on a phone, often enough to return. Not measuring revenue yet — V1 is an affiliate handoff, so **click-out is the conversion proxy**.

> ⚠ The tripwires below are **calibration starting points, not validated benchmarks** (no Fynds data yet). Read them as "directionally clearing and sustained," and treat the qualitative stylist signal as co-equal until N is large.

| Metric | Tells you | Starting tripwire |
|---|---|---|
| Activation (first-session positive action) | aha in session 1 | ≥ 45% |
| Intent-session success | does an ask go somewhere | ≥ 50% |
| Click-out rate | purchase intent (V1 proxy) | ≥ 20–25% |
| Outfit engagement | differentiated output landing | ≥ 50% |
| Week-1 return | truest early PMF signal | ≥ 25–30% |
| Save rate | result relevance (watch) | baseline |
| "Nothing landed" rate | curation misses (watch) | trend down |
| Parse success | pipeline reliability | ≥ 99% |
| Results latency p75 | feels fast on a phone | ≤ ~3s |
| Mobile parity | mobile isn't degraded | ≥ 0.9 |
| Cost / active session | API spend guardrail | set ceiling after baseline |

**Phase-1-ready gate:** (1) intent-session success + week-1 return clearing and stable; (2) real outfit engagement; (3) parse ≥99%, latency + error rate healthy; (4) mobile parity ≥0.9; (5) qualitative — users unprompted describe it as a *stylist*, not a search box. If (1)–(2) won't clear, the problem is curation quality — fix that before adding Phase 1 surface area.

---

## 9. Events → metrics mapping *(folded in)*
| Metric | Built from |
|---|---|
| Activation | `query_submitted` + (`product_save`\|`buy_clicked`) in first `session_id` |
| Intent-session success | `search_executed.n_results>0` + (`product_save`\|`buy_clicked`) per session |
| Click-out rate | `buy_clicked` ÷ sessions with results |
| Outfit engagement | `outfit_piece_action` ÷ `outfit_impression` |
| Week-1 return | distinct `user_id`/`anon_id` with `session_start` in days 1–7 |
| Save rate | `product_save` ÷ Σ `results_impression.items` |
| "Nothing landed" | sessions with results + zero positive engagement |
| Parse success | `query_classified.parse_ok` true-rate |
| Latency p75 | `query_classified.latency_ms` + `search_executed.latency_ms` |
| Mobile parity | intent-session success split by `platform` |
| Cost / active session | Σ `api_cost.cost_usd` ÷ active sessions |

*If a §8 metric has no row here, it isn't instrumented — add the event before promising it.*

---

## 10. Privacy / consent
Log behavior to *serve* the user (a sharper stylist), be transparent that Fynds learns from taste, and gate identified logging on sign-in/consent. Keep raw query text + images tied to the user's own account; keep PII out of `error_event` and analytics rollups. Stance: **collaborative, not surveillance.**

---

## 11. Version log *(update as you ship)*
| Version | Status | Shipped | Gate met? | Notes |
|---|---|---|---|---|
| v0.1 core loop | ✅ shipped | a5b5165 | n/a | baseline |
| v0.2 filtering | ✅ shipped | 74e7e3c | n/a | baseline |
| v0.3 checkout system | ⚠ shipped, untested/risky | 2559fae | n/a | drives 0.5.1 |
| v0.5.1 security triage | ✅ shipped | — | ✅ functional | stop-ship; in-memory rate limiter is near-term tech debt (replace before public launch, not deferred to v0.5.5); railway.json deleted — host is Vercel; **manual deploy step**: confirm CHECKOUT_REAL is absent in Vercel env dashboard |
| v0.5.2 backend + identity | ⬜ planned | — | — | |
| v0.5.3 instrumentation | ⬜ planned | — | — | |
| v0.5.4 mobile-first | ⬜ planned | — | — | |
| v0.5.5 fulfillment V1 | ⬜ planned | — | — | |

---

## 12. Later phases (see strategy doc for full detail)
- **Phase 1** — moat + low-cost wins: taste-learning ranking layer + signal-capture surfaces (swipe onboarding, "more like this," dismiss, outfit/swap reactions), wishlist, visual input, cheapest-price finder.
- **Phase 2** — data loop: closet → outfit recs from owned items → recs from purchases.
- **Phase 3** — stickiness/ops: budget/spend, shipping tracking, receipts.
- **Phase 4** — social/network: shared moodboards, friends' closets, follow brands.
- **Plat** (parallel, gated) — native app for push + camera, once engagement is proven.
- **Exp** (gated) — auto-buy on price drop.

---

## 13. v0.5.2 data model (Supabase / Postgres)
Runnable as a single migration. Identity is handled by **Supabase Auth** (`auth.users`): anonymous sign-in on first visit, then `linkIdentity(Google)` on sign-in. Because `user_id` is the same `auth.users.id` before and after linking, no stitching job or re-keying is needed — profile/cart/favorites keyed on `user_id` carry over automatically.

```sql
-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 1) Product dimension (canonical product identity; lightly used here, load-bearing in v0.5.3)
create table public.products (
  product_key   text primary key,            -- hash(domain | normalized_title | canonical_link)
  title         text,
  source        text,                         -- merchant / retailer
  link          text,
  image_url     text,
  latest_price  numeric(12,2),
  attributes    jsonb       not null default '{}'::jsonb,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);

-- 2) Style profile (1:1 with a user)
create table public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  aesthetic    text,
  budget_range text,
  sizes        jsonb       not null default '{}'::jsonb,   -- {top, bottom, dress, ...}
  shoe_size    text,
  gender       text,
  avoid_brands text[]      not null default '{}',
  notes        text,
  updated_at   timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function set_updated_at();

-- 3) Saved items (favorites + cart, unified)
create type saved_kind as enum ('favorite', 'cart');

create table public.saved_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid       not null references auth.users(id)    on delete cascade,
  kind             saved_kind not null,
  product_key      text       not null references public.products(product_key),
  product_snapshot jsonb      not null,                 -- title/price/source/link/image AT SAVE TIME
  options          jsonb      not null default '{}'::jsonb,   -- {size, color, notes}
  saved_at         timestamptz not null default now(),
  unique (user_id, kind, product_key)
);
create index saved_items_user_kind_idx on public.saved_items (user_id, kind, saved_at desc);

-- Row Level Security: a user touches only their own rows
alter table public.profiles    enable row level security;
alter table public.saved_items enable row level security;
create policy "own profile"     on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved_items" on public.saved_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- products is a shared read-only dimension; writes happen server-side (service role)
alter table public.products enable row level security;
create policy "products readable" on public.products for select using (true);
```

**Operational notes**
- On save: **upsert the `products` row first** (seeds the dimension + satisfies the FK), then insert `saved_items`. Keep `product_snapshot` regardless so a saved item survives price/inventory drift in `products`.
- **Out of scope for v0.5.2** (don't build yet): the full `events` table + impression logging (that's v0.5.3, §7) and any `checkout_sessions` table (may stay in-memory for now).
- **If you keep NextAuth instead of Supabase Auth** (not recommended): replace `auth.users` references with an app `users` table, add `anonymous_identities (anon_id text pk, merged_into_user_id uuid)`, and run a server-side merge that re-keys `profiles`/`saved_items` from `anon_id` to `user_id` on first sign-in. The recommended Supabase-anon path avoids all of that.

---

## 14. v0.5.1 acceptance tests
Run once Claude Code reports v0.5.1 done; each block maps to an exit criterion. The repo has no tests today — converting these runtime checks into the repo's first automated tests is encouraged.

**EC1 — no card/PII reaches the model**
- [ ] Static: find where payment fields (card number, CVV, expiry, name-on-card) are constructed; confirm none flow into any Anthropic `messages` or system prompt.
- [ ] `GenericStrategy` is removed, or hard-gated behind an explicit off-by-default flag; confirm the flag defaults off.
- [ ] Runtime: run a mock checkout and inspect the outbound Anthropic payload — no PAN/CVV anywhere.
- [ ] Negative: try to run the generic agent with card data → blocked, or card fields stripped/tokenized before any model call.

**EC2 — API routes protected (auth where it matters, rate-limit everywhere)**
- [ ] `/api/checkout`: unauthenticated call → 401/403 (checkout is never anonymous).
- [ ] `/api/chat` and `/api/product-options`: callable WITHOUT login (no signup wall), but reject cross-origin / off-app callers and enforce a per-IP rate limit; exceed → 429.
- [ ] `/api/checkout/status`: only the owning user can stream a session's status; mismatched/anonymous requests are rejected.
- [ ] Normal happy path on all three → 200 (core loop works for a cold visitor on chat/options).
- [ ] Rate limit + origin check applied to all three routes and all methods used (no sub-path bypass).
- [ ] When anon auth lands (v0.5.2), revisit gating chat/options on ANY valid session (including anonymous) so limits can be per-user, not just per-IP.

**EC3 — `CHECKOUT_MOCK` fail-safe (default = mock)**
- [ ] Unset → mock (no Playwright). 
- [ ] Blank → mock.
- [ ] `CHECKOUT_MOCK="true"` → mock.
- [ ] `CHECKOUT_MOCK="false"` → mock (must NOT silently run real).
- [ ] Real mode runs ONLY via the new explicit opt-in (e.g. `CHECKOUT_REAL=true`); confirm it's required and documented in the `.env` notes.
- [ ] Static: no remaining check that runs real when the flag is merely absent/non-`"true"`.

**Regression / done**
- [ ] `npm run build` passes; no new heavy dependency added without being flagged.
- [ ] Core chat → products flow works end-to-end for an authenticated user.
- [ ] §11 Version Log updated (v0.5.1 status + gate).

---

## 15. v0.5.3 instrumentation spec
Implements the §7 event spine on the existing loop. The event *catalog* is §7; this section is the table DDL, the where-to-emit wiring, and acceptance tests.

### Events table (Supabase / Postgres)
```sql
create table public.events (
  event_id       uuid primary key default gen_random_uuid(),
  event_type     text not null,
  ts             timestamptz not null default now(),   -- server-stamped on ingest
  anon_id        text,
  user_id        uuid references auth.users(id) on delete set null,
  session_id     text not null,
  platform       text not null,           -- mobile_web | desktop_web | ios | android
  app_version    text,
  surface        text,                    -- grid | inline | outfit | onboarding | drawer
  schema_version int  not null default 1,
  properties     jsonb not null default '{}'::jsonb
);
create index events_type_ts_idx on public.events (event_type, ts desc);
create index events_session_idx on public.events (session_id, ts);
create index events_user_ts_idx on public.events (user_id, ts desc);
create index events_query_idx   on public.events ((properties->>'query_id'));
create index events_props_gin   on public.events using gin (properties);

alter table public.events enable row level security;   -- no client policies; writes via service role only
```
Highest volume is `results_impression` — keep it **one row per result set** with an `items[]` array in `properties`, not one row per item. Monthly time-partitioning can come later; not needed now.

### Transport
- **Client-origin events** (impressions, views, saves, dismisses, buy-clicks, session start/end): a thin `track()` helper → batched → **`POST /api/events`**. Server validates the envelope, stamps `ts`, derives `user_id`/`anon_id` from auth context, inserts via service role, and rate-limits the route (inherits the v0.5.1 guard). Clients never write `events` directly.
- **Server-origin events** (`query_classified`, `search_executed`, `api_cost`, `identity_merge`, server `error_event`): inserted directly server-side.
- **`query_id`**: generated client-side on submit and threaded into `/api/chat`, so the client and server events for one query share it.
- **`product_key`**: computed server-side (§7) and attached to each product in the `/api/chat` response, so the client logs the same key the server knows. On response, **upsert `products`** for each shown product (fills the §13 dimension).

### Where to emit (minimal subset)
| Event | Origin | Location | Key props |
|---|---|---|---|
| `session_start` / `_end` | client | app shell mount / visibility | `duration_ms` |
| `identity_merge` | server | Supabase link-identity callback | `anon_id`, `user_id` |
| `query_submitted` | client | SearchBar send | `query_id`, `raw_text`, `entry_point` |
| `query_classified` | server | `/api/chat` after Claude + `JSON.parse` | `query_id`, `parse_ok`, `latency_ms`, `model`, `is_shopping`, `is_outfit`, `generated_query`, `outfit_pieces[]` |
| `search_executed` | server | `/api/chat` after each Serper call | `query_id`, `provider`, `n_results`, `latency_ms`, `error?`, `piece_category?` |
| `results_impression` | client | result set enters viewport | `query_id`, `result_set_id`, `is_outfit`, `items[]{product_key,position}` |
| `product_save` / `_unsave` | client | ProductCard save toggle | `product_key`, `query_id`, `position`, `options?` |
| `product_dismiss` | client | dismiss control* | `product_key`, `query_id`, `reason?` |
| `buy_clicked` | client | click-out / checkout entry (stub until V1) | `product_key`, `retailer`, `price_at_event`, `has_affiliate=false`, `query_id` |
| `api_cost` | server | after each Anthropic + Serper call | `service`, `tokens?`, `cost_usd` |
| `error_event` | server + client | catch blocks / error boundary | `scope`, `class` (no PII) |

\*A full dismiss/swipe affordance arrives with the mobile redesign (v0.5.4); for now wire `product_dismiss` to whatever minimal dismiss exists so the negative signal starts flowing.

### Acceptance tests
**EC1 — every interaction emits a well-formed event**
- [ ] Full session (open → query → results → save → dismiss → buy-click) yields one row per expected event, complete envelope (no null required fields).
- [ ] `query_classified.parse_ok` recorded for both valid and (forced) invalid Claude JSON.

**EC2 — metrics computable**
- [ ] §9 queries for parse-success, latency p75, save rate, and "nothing landed" return sane numbers from real rows.
- [ ] `api_cost` rows exist for each Anthropic + Serper call; cost/active-session computes.

**EC3 — impressions capture shown items + positions**
- [ ] `results_impression.items[]` matches rendered order (product_key + position) for a real search.
- [ ] The same product yields the same `product_key` across two different searches.

**Guards / done**
- [ ] `/api/events` rejects unauthenticated / over-rate calls (inherits v0.5.1).
- [ ] No PII in `error_event`.
- [ ] §11 Version Log updated.

---

## 16. v0.5.2 acceptance tests
Run once Claude Code reports v0.5.2 done; each block maps to an exit criterion.

**EC1 — cross-device persistence (signed-in)**
- [ ] Sign in on browser A, complete the quiz + save a favorite + add to cart; sign in as the same user on browser B → profile, favorites, cart all present.
- [ ] A mutation on B (remove a favorite) reflects on A after refresh — server is source of truth, localStorage is cache.
- [ ] Clearing localStorage on A loses nothing — it re-hydrates from the backend on next load.

**EC2 — anon → signed-in carry-over (stable user_id)**
- [ ] As an anonymous visitor, complete the quiz + save items, then sign in with Google → same profile/favorites/cart, no loss, no duplicates.
- [ ] `user_id` is the same `auth.users.id` before and after sign-in (anon→permanent link, not a new user row).
- [ ] An `identity_merge` event is emitted (analytics only; confirm no data-migration job ran).

**EC3 — survives restart**
- [ ] Restart / redeploy; signed-in user's profile/favorites/cart persist (Postgres, not memory).
- [ ] An in-flight checkout session may be lost — confirm that's the only thing lost and it fails gracefully (no crash).

**EC4 — RLS isolation**
- [ ] As user A (client/anon key), select user B's `profiles` / `saved_items` → returns nothing.
- [ ] As user A, write to user B's rows → denied.
- [ ] `products` is readable by anyone but not client-writable (writes only via service role).
- [ ] RLS is actually enabled on `profiles` and `saved_items` (not left off).

**Data model / wiring**
- [ ] §13 migration applies cleanly: tables, `saved_kind` enum, indexes, `updated_at` trigger, RLS policies all present.
- [ ] On save, `products` is upserted before the `saved_items` insert (FK satisfied); `product_snapshot` stored.
- [ ] `profiles.updated_at` bumps on update (trigger works).

**Regression / done**
- [ ] Core chat → products → save flow works for both anonymous and signed-in users.
- [ ] localStorage still functions as an offline-tolerant cache, but the server is authoritative.
- [ ] `npm run build` passes.
- [ ] §11 Version Log updated (v0.5.2 status + gate).

---

## 17. v0.5.4 mobile-first redesign spec
Turns the phone from a degraded fallback into the designed primary surface (mandate §4.1). The current build stacks the chat and drops products into an inline `md:hidden` fallback with the product panel hidden on mobile; this version replaces that with a phone-native experience and makes desktop the responsive adaptation.

**In scope:** mobile shell + layout, bottom-sheet drawers, swipe gestures (which double as save/dismiss signal), mobile-native ProductCard / OutfitView, a phone-first pass on the existing style quiz, PWA installability, a mobile performance budget, and carrying §7 instrumentation forward.
**Out of scope (later):** the visual swipe *onboarding* game, "more like this" recs, and the taste-learning ranking layer are **Phase 1**; push + camera are the **native Plat track**. Build the gesture *surfaces* here; the intelligence behind them comes later.

### Requirements
**Shell & layout** — Single-column, full-bleed, app-like. Input anchored in the bottom thumb zone; results are a first-class full-width surface above it (not crammed inline). Primary destinations (chat, favorites, cart) reachable one-handed. Desktop's two-column layout is rebuilt *from* these mobile components and scaled up at `md:`/`lg:` — mobile-first base styles, not desktop-with-overrides.

**Bottom sheets** — `CartDrawer`, `FavoritesDrawer`, and `FilterSidebar` become bottom sheets on mobile (slide up, swipe-to-dismiss, thumb-reachable); they stay side drawers / sidebar on desktop.

**Gestures (and they are signal)** — On a product card: swipe-right = **save**, swipe-left = **dismiss** ("not for me"), tap = open detail/options. This delivers the proper dismiss affordance that v0.5.3 stubbed, and each gesture emits the matching event (`product_save` / `product_dismiss`). Smooth motion with momentum; respect reduced-motion.

**Cards & outfits** — `ProductCard`: image-forward, legible price + source, large tap targets, swipe-enabled. `OutfitView`: vertical stack of pieces, whole-outfit save, per-piece save/dismiss; leave room for a per-piece swap affordance (swap logic is Phase 1).

**Onboarding** — Redesign the existing 4-step style quiz to be phone-native (full-screen steps, big targets, easy skip). The visual swipe onboarding is Phase 1.

**PWA** — `manifest.json` (name, icons, `display: standalone`, theme), installable / add-to-home-screen, launches without browser chrome. App-shell caching via a service worker + offline-tolerant read of favorites / last results (don't over-build offline). Respect iOS safe-area insets (`env(safe-area-inset-*)`). **No push here** — push is the native track (iOS PWA push is unreliable).

**Performance budget** — Mobile (throttled mid-tier): LCP ≤ ~2.5s, low CLS, good INP on `/shop`. Product images via `next/image` with responsive sizes + below-fold lazy-load; reserve image space to avoid shift. Keep responses snappy (Haiku already chosen for latency) with clear streaming/loading states.

**Instrumentation carry-forward** — Populate `platform` (`mobile_web`/`desktop_web`) and `surface` correctly on every event; wire swipe-save/dismiss to the v0.5.3 events. The §7 schema is UI-agnostic and must not change — only new surfaces emit.

### Acceptance tests
**EC1 — mobile parity ≥ 0.9**
- [ ] With v0.5.3 events flowing, intent-session success split by `platform` (§9): mobile ÷ desktop ≥ 0.9 over a representative window.
- [ ] No mobile-only cliff in the funnel (query → results → save / click-out) vs desktop.

**EC2 — mobile performance**
- [ ] Lighthouse mobile (throttled): LCP ≤ ~2.5s, low CLS, good INP on the results view.
- [ ] Images lazy-load below the fold with reserved space (no layout shift on load).

**EC3 — one-handed usability (no degraded fallback)**
- [ ] The `md:hidden` inline-fallback path is gone; mobile has a designed results surface.
- [ ] Send / save / cart / favorites reachable in the thumb zone; drawers are swipe-to-dismiss bottom sheets.
- [ ] Swipe-right saves, swipe-left dismisses, tap opens detail — each emits the right event.
- [ ] Safe-area insets respected in standalone (nothing under the notch / home indicator).

**EC4 — PWA**
- [ ] Manifest + icons valid; Add-to-Home-Screen installs; launches standalone.
- [ ] App shell cached; offline read of favorites / last results doesn't crash.
- [ ] Lighthouse PWA basics pass.

**Done**
- [ ] Every event carries correct `platform` / `surface`; §7 schema unchanged.
- [ ] `npm run build` passes; desktop still works (responsive adaptation).
- [ ] §11 Version Log updated.

---

## 18. v0.5.5 fulfillment V1 spec (affiliate handoff)
Implements the "seamless handoff" answer to the literal-checkout-vs-handoff open question (strategy doc §7): the default purchase path is **discovery → review → click out to the retailer's own checkout with affiliate tracking**, not an in-app robot. Fynds never touches payment — which **permanently closes** the v0.5.1 card-handling risk — and earns commission on click-throughs/conversions. (True in-app transaction via Shopify Storefront API / ACP-UCP is the later fulfillment ladder, not this version.)

**In scope:** affiliate link-wrapping for top retailers + an aggregator for breadth; the mobile-first handoff CTA/UX; real `buy_clicked` instrumentation (the v0.5.3 stub becomes real); retiring Playwright from the default flow and dropping the Chromium/Railway dependency (Vercel-hostable); collapsing the in-app checkout to review→handoff and **removing payment/shipping collection** from the default path; FTC affiliate disclosure.
**Out of scope (later):** real in-app transactions (Shopify Storefront API = fulfillment V2; ACP/UCP protocols = V3); auto-buy on price drop (**Exp**); confirmed-order / purchase-history capture (**Phase 2** closet).

### Requirements
**Affiliate integration** — Wrap the retailer link from each Serper result with an affiliate tag. Recommended start: a link-wrapping aggregator (**Skimlinks / Sovrn**) for broad auto-coverage + **Amazon Associates** for Amazon; add direct networks (Rakuten, Awin/ShareASale, CJ) for top retailers over time. Maintain a `retailer domain → program/tag` map; domains with no program fall back to a plain link with `has_affiliate=false` (never a broken link).

**Handoff UX (mobile-first, per v0.5.4)** — A clear, thumb-reachable "Buy at {retailer}" CTA on the card, detail view, and buy-list. Opens the retailer in a new tab / in-app browser. The cart becomes a **buy-list**: items the user intends to purchase, each with its own retailer handoff (there is no single cross-retailer transaction in the affiliate model — that's the Universal-Cart future).

**Checkout collapse** — The v0.3 six-step in-app checkout (cart review → shipping → payment → confirm → processing → complete) collapses to **review → handoff**. `PaymentForm` and `ShippingForm` are removed from the default path (Fynds collects no payment or shipping). This is the permanent structural fix for the plaintext-card risk.

**Retire the agent** — The Playwright purchase agent is off by default (already gated in v0.5.1); remove the Chromium/Playwright dependency from the default build so the app boots without it and is deployable to **Vercel**. Keep the agent behind an explicit experiment flag only if you intend to revisit it; otherwise remove it.

**Instrumentation** — `buy_clicked` becomes real: `product_key`, `retailer`, `price_at_event`, `has_affiliate`, `query_id`, fired on click-out (the V1 conversion proxy, §8). Attribution is delayed/aggregate, so **click-out is the metric**, not confirmed sales.

**Compliance** — Show the FTC affiliate disclosure where required ("Fynds may earn a commission"), and follow each network's ToS.

### Acceptance tests
**EC1 — click-out works on mobile**
- [ ] On a phone, "Buy at {retailer}" is thumb-reachable and opens the right product at the retailer (new tab / in-app browser).
- [ ] Works from the product card, detail view, and buy-list.

**EC2 — click-out rate measurable & non-trivial**
- [ ] `buy_clicked` fires with all fields; click-out rate computes from §9 and is non-trivial.

**EC3 — default path has no Playwright/Chromium**
- [ ] Default build/run loads no Playwright/Chromium; the full loop works without it.
- [ ] The browser-automation agent is off by default (flag) or removed; if kept, it's clearly an experiment.
- [ ] Deployable to Vercel (no persistent-process / Chromium requirement in the default path).

**EC4 — affiliate attribution**
- [ ] Wrapped links carry the correct tag/format per retailer; a test click registers in the network dashboard (or the wrapper confirms tracking).
- [ ] Domains without a program fall back to a plain link (`has_affiliate=false`), no broken links.

**Compliance / security / done**
- [ ] FTC affiliate disclosure shown where required.
- [ ] Payment/shipping collection removed from the default checkout path — re-confirms v0.5.1 EC1 permanently (no card data anywhere).
- [ ] `npm run build` passes; §11 Version Log updated.

**Gate note:** with v0.5.5 shipped, click-out + mobile + instrumentation all exist — so the full **"core loop solid" bar (§8)** becomes evaluable. v0.5.5 is the last version before the Phase 0.5 → Phase 1 decision.
