# Fynds — Product Strategy & Roadmap
*Running doc · last updated 2026-05-21 · status: working draft*

**Tagline:** *Fynds takes the friction out of shopping — no more sifting through endless options to find the few things that actually fit your taste.*

## How to use this doc
A living document for Fynds product strategy. **Section 1 is the anchor** — the core value everything else is measured against; **Section 3** is the platform & UX philosophy that shapes how every feature gets built. Sections 5–6 are a *preliminary* prioritization, not a spec; the real ordering should be re-derived once each shipped version produces usage data.

---

## 1. Core value — the anchor

**Problem statement.**
Online clothes shopping is a *discovery-and-decision* problem, not an inventory problem. The inventory already exists (effectively all of Google Shopping). The real cost is **friction** — the due diligence of sifting through endless near-misses to find the few things that fit your taste, body, and budget. What's missing is **judgment**: someone who knows you and can collapse that friction into a few right answers — including how to wear them together — instead of leaving you to burn an evening across 40 tabs.

**Job to be done.**
> "When I have an occasion, a need, or just a vibe but don't know what to buy or where, I want a stylist who knows my taste and budget to hand me a few right options and how to combine them, so I can look good without doing the hunting myself."

**What Fynds is:** an AI personal stylist.
**What Fynds is not:** a search engine, a marketplace, or a checkout robot. (Those are commodities or owned by giants — see §2.)

**The moat.**
Taste — a style-aware model of *this user* that makes results feel hand-picked, so the friction of finding "the one" keeps dropping the more Fynds knows you. Generic agents (ChatGPT Instant Checkout, Google Universal Cart) will win discovery breadth and checkout; they will not win fashion-specific, personalized friction-reduction for a given person. That personalization layer — **taste as friction-reduction** — is the defensible core, and every roadmap decision should protect it.

**Decision — locked 2026-05-21:** Stylist wedge confirmed over the "shopping hub" framing. The roadmap is ordered stylist-first.

---

## 2. Operating principle: anchor, then layer

Build and validate the core loop first; treat everything else as layers that attach *after* the core works and starts to scale. This doc exists partly to keep the brainstorm from pulling focus before the anchor is solid.

Two consequences:

1. **The core engine is "taste-driven curation + outfit coordination," and taste-learning is part of that core — not a later feature.** It's the product, not an enhancement. The only reason it appears later in the roadmap is that it needs usage data to exist; the data capture should begin in the very first shipped version.

2. **A large share of the brainstorm is actually a *different product*.** A "shopping life manager" (budget, spend, receipts, shipping tracking) and a "social shopping network" (shared moodboards, friends' closets, follow brands). Both are legitimate and could be great retention layers — but neither is the wedge. Shipping them early would repeat the scope-sprawl already visible in the codebase (auth that gates nothing; profile fields collected but never used). Capture them; defer them.

*Fulfillment context (from prior discussion): checkout is being commoditized by open protocols and giant platforms, so the near-term fulfillment ladder is V1 affiliate handoff → V2 Shopify-merchant API checkout → V3 managed/protocol checkout. The feature roadmap below assumes that ladder runs underneath it.*

---

## 3. Platform & UX strategy (philosophy / guidelines)

**Decision — locked 2026-05-21:** Mobile-first responsive web (PWA) on the existing Next.js codebase. Desktop is the *adaptation*, not the starting point. No native apps until engagement is proven (see "Platform track" below).

**Why mobile-first.** Fashion shopping is a phone behavior — couch, bed, commute, impulse — and the richest taste signal comes from phone-native gestures (swipe, save, scroll, snap). Desktop-first would optimize the wrong moment. Today the build has this backwards: the product panel is hidden on mobile and products fall back to inline, so mobile is a *degraded desktop view* rather than a designed surface. Fixing that is a Phase 0.5 requirement (PROJECT.md v0.5.4).

**Why not native (yet).** Native-in-parallel triples the surface (web + iOS + Android), adds app-store release friction exactly when UX needs to iterate fastest, and splits a small team before the core loop is even proven. One responsive web/PWA codebase keeps iteration fast and cheap.

**The core principle: UX is the data pipeline.** The backend is necessary plumbing, but whether a taste model ever exists comes down to the UX. Every core interaction should be **low-friction** and double as a labeled training example — and the moment "tell us your taste" feels like a *form*, both the friction-reduction promise and the flywheel stall. So the rule for every surface: **make getting value and giving signal the same action.**

**Signal-capture guidelines:**
- **Onboard by doing, not declaring.** A quick visual "love it / not for me" round beats a quiz for cold-start — more signal, and it feels like play. Keep the quiz as a skippable supplement.
- **Capture the negative signal.** Saves are easy; dismiss / "show me less like this" is gold and usually thrown away. A cheap differentiator for the taste model.
- **Make browsing active.** "More like this" on any item or outfit turns passive scrolling into preference-tuning — useful to the user, rich for the model.
- **React to outfits, not just items.** Let people respond to whole looks and to swaps ("keep the top, change the shoes"). Compositional taste is the differentiated signal.
- **Express taste visually.** Allow image input (photo, moodboard), not just text — fashion is visual, and vision models can extract the attributes.
- **Show the model getting smarter.** A visible "your style is getting sharper" payoff gives people a reason to keep feeding it. The flywheel needs a visible reward.

**Stance: collaborative, not surveillance.** Instagram-style targeting learns by watching without consent. A stylist can learn the same things *collaboratively* — "help me dress you better" — which is more honest and a brand difference worth leaning into.

**Platform track (parallel, gated).** Stay on mobile-first responsive web / PWA throughout the phases below. Go native only when engagement is proven and you specifically need the two things native does better:
- **Push notifications** — "price drop on your saved dress," "new drop from a brand you follow." The re-engagement engine that keeps the flywheel spinning; iOS PWA push is still unreliable, which is the main reason to go native at all.
- **Camera** — "snap your closet / snap this inspo" as a first-class input.

Trigger to build native: proven retention **plus** a re-engagement or camera need the PWA can't serve. Not before.

---

## 4. Feature backlog (captured)

Grouped by what each one actually serves.

**Core engine (the moat)**
- Taste learning — results get more aligned/targeted over time from user signal (*the "big one"*)
- Outfit coordination — exists for queries today; extend to the user's owned items
- Signal-capture surfaces — swipe onboarding, "more like this," dismiss / "show less," outfit & swap reactions (the UX that *is* the data pipeline — see §3)

**Core-adjacent, high-fit**
- Wishlist (≈ already exists as favorites)
- Visual input — photo / moodboard create-import → shopping recs from the aesthetic
- Cheapest-price finder across sites, including shipping

**Data-loop extensions (need purchase data)**
- "What's in your closet" (recent purchases)
- Outfit combos from items the user already owns
- Recs based on what the user has already bought

**Stickiness / shopping-ops layer (adjacent product)**
- Shipping tracking
- Receipts
- Spend + budget tracker

**Social / network layer (adjacent product, post-PMF)**
- Share moodboards / collaborators
- Shop a friend's closet (ShopMy-style) → add to cart/wishlist
- Follow brands

**Platform / re-engagement (native, later — see §3)**
- Push notifications — price-drop & back-in-stock & new-drop alerts (the re-engagement engine)
- Camera capture — snap your closet / snap inspo as first-class input

**High-risk experiment**
- Auto-buy on price drop / discount threshold (set % off or price ≤ $X) — "like buying stocks"

---

## 5. Prioritization view (preliminary)

Each feature is mapped to its roadmap **phase** (see §6) and scored against **serves core?**, **impact**, **complexity / cost**, and **dependency** (what must exist first). Tiers: **Now / Near / Later / Deferred**.

| Phase | Feature | Serves core | Impact | Complexity / cost | Depends on | Tier |
|---|---|---|---|---|---|---|
| **0.5** | Taste-signal capture (saves, clicks, dismissals) | Core | High | Low (logging) | Backend + accounts | **Now** |
| **1** | Wishlist | Adjacent | Low | Very low (mostly exists) | — | **Now** |
| **1** | Taste-learning ranking layer | Core | Very high | High | Signal data + backend | **Near** |
| **1** | Swipe onboarding (visual love/pass cold-start) | Core | High | Low-med | Signal logging | **Near** |
| **1** | "More like this" / dismiss (active + negative signal) | Core | High | Low-med | Signal logging | **Near** |
| **1** | Visual input (photo / moodboard) → recs | Core-adjacent | High | Medium (vision) | — | **Near** |
| **1** | Cheapest-price finder (+ shipping) | Core-adjacent | High | Medium (product matching) | — | **Near** |
| **2** | Closet (purchase history) | Enabler | Medium | Medium (order capture) | Checkout / order data | **Later** |
| **2** | Outfit recs from owned items | Core | High | Medium | Closet | **Later** |
| **2** | Recs based on purchases | Core | High | Medium | Closet | **Later** |
| **3** | Budget / spend tracker | Adjacent | Medium | Medium-high | Order / receipt data | **Later** |
| **3** | Shipping tracking | Adjacent | Medium | High (carrier / email parsing) | Order data | **Later** |
| **3** | Receipts | Adjacent | Low-med | High (email parsing) | Email access | **Later** |
| **4** | Share / collaborate moodboards | Adjacent | Medium | High (social graph, perms) | Accounts + base | **Later** |
| **4** | Follow brands | Adjacent | Low-med | Medium | Accounts | **Later** |
| **4** | Shop friends' closets | Adjacent | Medium | High | Closet + social graph | **Deferred** |
| **Plat** | Push — price-drop / back-in-stock / new-drop alerts | Re-engagement | High | Medium (native) | Saves + price monitoring + native | **Later** |
| **Plat** | Camera capture (closet / inspo input) | Core-adjacent | Medium | Medium (native) | Native + closet | **Later** |
| **Exp** | Auto-buy on price drop | Adjacent | Med (cool) | High + high **risk** | Reliable checkout + stored payment auth | **Deferred** |

*Note on the calls above:* a backend + accounts is the unlock for almost everything — the localStorage-only architecture caps the roadmap at "anonymous single-device toy." That migration is the highest-leverage non-feature on the list. Phase labels **Plat** (native platform track) and **Exp** (gated experiment) run in parallel to the numbered sequence, not inside it.

---

## 6. Preliminary phased roadmap

Phase 0 = what's already shipped; **Phase 0.5** = the foundational sprint, specced version-by-version in **PROJECT.md §6**; Phases 1+ layer on after the core is solid. Each phase lists its **unlock** (what must exist first), the headline work, and why it's there. Re-check ordering against real data after each shipped version.

**Phase 0 — Current shipped baseline**
The working core: chat → curated products, outfit mode, style quiz, cart/favorites (localStorage), filtering, and a risky, untested automated-checkout system. This is the starting point, not the destination — PROJECT.md §5 breaks it into versions (v0.1–v0.3) with its gaps and risks.

**Phase 0.5 — Foundation: secure, backed, instrumented, mobile-first** *(in progress)*
The sprint that turns the prototype into something that can actually learn: security triage (kill the plaintext-card path, lock down API routes), a real backend + identity layer, the event-logging spine that instruments taste signal from day one, the mobile-first redesign (the phone becomes the primary surface, not a degraded view), and fulfillment V1 (affiliate handoff). Specced version-by-version with data tracked + exit criteria in **PROJECT.md §6** (v0.5.1–v0.5.5).
*Why:* you can't learn taste from data you didn't capture, on a surface people don't actually use. This is the gate to everything downstream.
*Exit:* the "core loop solid" bar — intent-session success, week-1 return, outfit engagement, technical health, mobile parity, and users describing it like a stylist.

**Phase 1 — The moat + low-cost wins**
The mobile signal-capture surfaces that *are* the data pipeline (see §3): swipe onboarding, "more like this," dismiss / negative signal, outfit & swap reactions — paired with the **taste-learning ranking layer** that turns that signal into re-ranked results. Plus the cheap, high-fit wins: wishlist, visual input, cheapest-price finder.
*Why:* the signal surfaces and the ranking layer are two halves of one flywheel — this is the actual differentiator, and the wins reinforce the "save me the hunt, in my taste" promise.

**Phase 2 — The data loop**
Closet (purchase history) → outfit recs from owned items → recs based on purchases.
*Why:* the compounding spine — every purchase feeds richer styling and a sharper taste model. Needs the Phase 0.5 backend and real order/purchase data.

**Phase 3 — Stickiness / shopping-ops**
Budget + spend tracker, shipping tracking, receipts.
*Why later:* a legitimate retention layer, but a different JTBD; only worth building once the core has users to retain.

**Phase 4 — Social / network**
Shared & collaborative moodboards, shop-friends'-closets, follow brands.
*Why last:* network features need user density to work, and this is finally where sign-in pays for itself.

**Platform track (parallel, gated) — native app**
Stay on mobile-first responsive web / PWA throughout the phases above. Go native only once engagement is proven and you specifically need **push** (price-drop / back-in-stock / new-drop alerts — the re-engagement engine; iOS PWA push is still unreliable) or **camera** (snap your closet / inspo). Trigger: proven retention + a need the PWA can't serve. See §3.
*Why gated:* two native codebases before the core loop is proven is the classic pre-PMF trap.

**Experiments (un-phased, gated on trust + checkout reliability)**
Auto-buy on price drop.
*Why gated:* it spends a user's money autonomously — needs rock-solid checkout, stored payment authorization, and a high trust bar. Revisit only after Phase 2+ and a reliable V3 checkout.

---

## 7. Open decisions / inputs needed

- **Literal checkout vs. seamless handoff** (from prior discussion): does "end-to-end" require the purchase to execute inside Fynds, or is a smooth handoff acceptable early? This changes how much weight Phase 0 fulfillment carries.
- **Data-dependent ranking:** several "Later" items can't truly be prioritized until V1/V2 produce usage data (conversion, save rates, dominant query types). Treat the §5 tiers as hypotheses to revise.
