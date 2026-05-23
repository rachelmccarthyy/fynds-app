import { NextRequest, NextResponse, after } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  ChatRequest,
  ChatResponse,
  ClaudeParseResult,
  Product,
  OutfitPieceResult,
} from "@/lib/types";
import { buildSystemPrompt } from "@/lib/constants";
import { getClientIp, checkRateLimit, isTrustedOrigin } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/server";
import { computeProductKey } from "@/lib/product-key";
import { trackServer } from "@/lib/analytics/server-track";

const anthropic = new Anthropic();

// rates: Anthropic Haiku 4.5, verified 2026-05
const HAIKU_INPUT_COST_PER_TOKEN  = 1.00 / 1_000_000; // $1.00/MTok input
const HAIKU_OUTPUT_COST_PER_TOKEN = 5.00 / 1_000_000; // $5.00/MTok output

function parsePrice(price: string): number | null {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

interface SearchResult {
  products: Product[];
  latencyMs: number;
  error?: string;
}

async function searchProducts(query: string): Promise<SearchResult> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { products: [], latencyMs: 0, error: "SERPER_API_KEY not set" };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 12 }),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return { products: [], latencyMs, error: `Serper HTTP ${res.status}` };
    }

    const data = await res.json();
    const shopping = data.shopping || [];

    const products: Product[] = shopping.map(
      (
        item: {
          title?: string;
          price?: string;
          source?: string;
          link?: string;
          imageUrl?: string;
          position?: number;
          rating?: number;
          ratingCount?: number;
          productId?: string;
          delivery?: string;
        },
        index: number
      ) => ({
        title: item.title || "",
        price: item.price || "",
        source: item.source || "",
        link: item.link || "",
        imageUrl: item.imageUrl || "",
        position: item.position || index + 1,
        rating: item.rating,
        ratingCount: item.ratingCount,
        productId: item.productId,
        delivery: item.delivery,
      })
    );

    return { products, latencyMs };
  } catch (err) {
    return {
      products: [],
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "fetch error",
    };
  }
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body: ChatRequest = await request.json();
    const { message, history, styleProfile, query_id, session_id, platform, anon_id } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Optional: derive user_id from Bearer token for event attribution.
    // Chat is not auth-gated — missing/invalid token inserts events with user_id null.
    let userId: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabaseAdmin().auth.getUser(token);
      if (user) userId = user.id;
    }

    const systemPrompt = buildSystemPrompt(styleProfile);
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Capture latency + usage before after() so the closure has concrete values
    const claudeStart = Date.now();
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });
    const claudeLatencyMs = Date.now() - claudeStart;
    const usage = response.usage;

    let rawText =
      response.content[0].type === "text" ? response.content[0].text : "";
    rawText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ClaudeParseResult;
    let parseOk = true;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // parse_ok=false emits in the after() block — failure is never invisible
      parseOk = false;
      parsed = {
        search_query: "",
        response_text: rawText,
        is_shopping_query: false,
        is_outfit_query: false,
      };
    }

    type SerperCall = { result: SearchResult; pieceCategory?: string };
    const serperCalls: SerperCall[] = [];

    let products: Product[] = [];
    let outfitPieces: OutfitPieceResult[] | undefined;

    if (parsed.is_outfit_query && parsed.outfit_pieces?.length) {
      const pieceResults = await Promise.all(
        parsed.outfit_pieces.map(async (piece) => {
          const result = await searchProducts(piece.search_query);
          serperCalls.push({ result, pieceCategory: piece.category });
          return { ...piece, products: result.products.slice(0, 4) };
        })
      );
      outfitPieces = pieceResults;
    } else if (parsed.is_shopping_query && parsed.search_query) {
      const result = await searchProducts(parsed.search_query);
      serperCalls.push({ result });
      products = result.products;
    }

    // Compute product_key once — attached to the response and reused in after()
    const annotatedProducts = products.map((p) => ({
      ...p,
      product_key: computeProductKey(p),
    }));
    const annotatedOutfitPieces = outfitPieces?.map((piece) => ({
      ...piece,
      products: piece.products.map((p) => ({
        ...p,
        product_key: computeProductKey(p),
      })),
    }));

    const chatResponse: ChatResponse = {
      message: parsed.response_text,
      products: annotatedProducts,
      outfitPieces: annotatedOutfitPieces,
    };

    // All server-side events + products upsert run after the response is sent.
    // after() keeps the Vercel runtime alive until the block settles — a bare
    // void promise().catch() would be frozen/dropped the moment the response returns.
    const eventBase = {
      user_id:    userId,
      anon_id:    anon_id    ?? null,
      session_id: session_id ?? "server",
      platform:   platform   ?? "desktop_web",
    };

    after(async () => {
      try {
        // query_classified — emits in both parse_ok=true and false branches
        await trackServer({
          ...eventBase,
          event_type: "query_classified",
          properties: {
            query_id:        query_id ?? null,
            parse_ok:        parseOk,
            latency_ms:      claudeLatencyMs,
            model:           "claude-haiku-4-5-20251001",
            is_shopping:     parsed.is_shopping_query,
            is_outfit:       parsed.is_outfit_query,
            generated_query: parsed.search_query || null,
            outfit_pieces:   parsed.outfit_pieces?.map((p) => p.category) ?? [],
          },
        });

        // search_executed — one row per Serper call; outfit mode rows carry piece_category
        for (const { result, pieceCategory } of serperCalls) {
          await trackServer({
            ...eventBase,
            event_type: "search_executed",
            properties: {
              query_id:   query_id ?? null,
              provider:   "serper",
              n_results:  result.products.length,
              latency_ms: result.latencyMs,
              ...(result.error     ? { error: result.error }             : {}),
              ...(pieceCategory    ? { piece_category: pieceCategory }   : {}),
            },
          });
        }

        // api_cost — Anthropic: real cost_usd from token counts at haiku-4-5 rates
        const costUsd =
          usage.input_tokens  * HAIKU_INPUT_COST_PER_TOKEN +
          usage.output_tokens * HAIKU_OUTPUT_COST_PER_TOKEN;
        await trackServer({
          ...eventBase,
          event_type: "api_cost",
          properties: {
            query_id:      query_id ?? null,
            service:       "anthropic",
            model:         "claude-haiku-4-5-20251001",
            input_tokens:  usage.input_tokens,
            output_tokens: usage.output_tokens,
            cost_usd:      Math.round(costUsd * 1_000_000) / 1_000_000,
          },
        });

        // api_cost — Serper: cost_usd null (no per-call billing API; EC2 Serper cost pending)
        for (const { result } of serperCalls) {
          if (!result.error) {
            await trackServer({
              ...eventBase,
              event_type: "api_cost",
              properties: {
                query_id: query_id ?? null,
                service:  "serper",
                cost_usd: null, // TODO: wire real cost when Serper billing API available
              },
            });
          }
        }

        // Upsert products dimension for all shown products (deduped by product_key)
        const allAnnotated = [
          ...annotatedProducts,
          ...(annotatedOutfitPieces ?? []).flatMap((piece) => piece.products),
        ];
        const seen = new Set<string>();
        const uniqueProducts = allAnnotated.filter((p) => {
          if (!p.product_key || seen.has(p.product_key)) return false;
          seen.add(p.product_key);
          return true;
        });

        if (uniqueProducts.length > 0) {
          const { error: upsertErr } = await supabaseAdmin()
            .from("products")
            .upsert(
              uniqueProducts.map((p) => ({
                product_key:  p.product_key,
                title:        p.title,
                source:       p.source,
                link:         p.link,
                image_url:    p.imageUrl,
                latest_price: parsePrice(p.price),
                last_seen:    new Date().toISOString(),
              })),
              { onConflict: "product_key" }
            );
          if (upsertErr) {
            console.error("[fynds:chat] products upsert failed:", upsertErr.message);
          }
        }
      } catch (err) {
        console.error("[fynds:chat] after() block failed:", err);
      }
    });

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
