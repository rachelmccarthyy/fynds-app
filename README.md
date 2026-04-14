# Fynds AI

**AI-powered personal shopping tool that translates how people actually describe what they want into real, shoppable product recommendations.**

[Live App](https://fynds-app-eta.vercel.app)

## The Problem

People don't think in search keywords. They think in contexts: "something for a rooftop dinner in July" or "comfortable but not frumpy." Traditional e-commerce search forces users to translate their intent into the platform's language. Fynds flips that — it treats AI as a translation layer between how people naturally express what they want and what's actually available to buy.

## How It Works

Users start with a style profile quiz that captures aesthetic preferences, budget, and sizing. This reduces the cold-start problem by giving the AI enough context to be useful from the first query. From there, users describe what they're looking for in plain English and Fynds returns real, shoppable product recommendations from across the web.

The core UX is a "Chat-to-Cart" flow designed in Figma and refined through iterative usability testing.

## Product Decisions

- **Style profile as onboarding:** The quiz isn't just data collection — it's a product decision about reducing cold-start friction. Without it, the AI would need several rounds of back-and-forth to give useful recommendations.
- **AI as translation, not conversation:** The Claude API isn't used as a chatbot. It's a translation service between natural-language intent and structured product search. This distinction shaped the entire UX.
- **Monetization model:** Affiliate commissions + transaction fees, designed around scalable unit economics from day one.

## Stack

Next.js · TypeScript · Claude API (Anthropic) · React · Vercel

## Validation

20+ customer discovery interviews conducted to validate demand and refine the core value proposition before building.

---

Built by [Rachel McCarthy](https://rachelmccarthy.io)
