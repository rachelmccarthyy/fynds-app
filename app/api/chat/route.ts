import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  ChatRequest,
  ChatResponse,
  ClaudeParseResult,
  Product,
  OutfitPieceResult,
} from "@/lib/types";
import { buildSystemPrompt } from "@/lib/constants";

const anthropic = new Anthropic();

async function searchProducts(query: string): Promise<Product[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error("SERPER_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch("https://google.serper.dev/shopping", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 12 }),
    });

    if (!res.ok) {
      console.error("Serper API error:", res.status);
      return [];
    }

    const data = await res.json();
    const shopping = data.shopping || [];

    return shopping.map(
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
  } catch (error) {
    console.error("Serper fetch error:", error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, history, styleProfile } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(styleProfile);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    let rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown code fences if Claude wraps the JSON
    rawText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: ClaudeParseResult;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        search_query: "",
        response_text: rawText,
        is_shopping_query: false,
        is_outfit_query: false,
      };
    }

    let products: Product[] = [];
    let outfitPieces: OutfitPieceResult[] | undefined;

    if (parsed.is_outfit_query && parsed.outfit_pieces?.length) {
      // Run parallel searches for each outfit piece
      const pieceResults = await Promise.all(
        parsed.outfit_pieces.map(async (piece) => {
          const pieceProducts = await searchProducts(piece.search_query);
          return {
            ...piece,
            products: pieceProducts.slice(0, 4),
          };
        })
      );
      outfitPieces = pieceResults;
    } else if (parsed.is_shopping_query && parsed.search_query) {
      products = await searchProducts(parsed.search_query);
    }

    const chatResponse: ChatResponse = {
      message: parsed.response_text,
      products,
      outfitPieces,
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
