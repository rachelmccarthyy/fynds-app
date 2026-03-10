import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { url, title, source } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Step 1: Fetch the Google Shopping page
    const googleHtml = await fetchPage(url);

    // Step 2: Try to get merchant page
    let merchantContent = "";
    if (googleHtml) {
      const merchantUrl = extractMerchantUrl(googleHtml, source);
      if (merchantUrl) {
        const mHtml = await fetchPage(merchantUrl);
        if (mHtml.length > 5000) {
          merchantContent = stripToText(mHtml).slice(0, 6000);
        }
      }
    }

    const googleText = googleHtml ? stripToText(googleHtml).slice(0, 6000) : "";

    // Step 3: Ask Claude to determine what options this product has
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `I need the available purchase options for this product. Analyze the product info and page data below.

Product: "${title}"
Retailer: ${source}

${merchantContent ? `MERCHANT PAGE TEXT:\n${merchantContent}\n\n` : ""}${googleText ? `GOOGLE SHOPPING PAGE TEXT:\n${googleText}` : ""}

Return ONLY a JSON object with available options a buyer would need to select:

{"sizes": [...], "colors": [...], "other": [...]}

Important rules:
1. For SHOES: The page may only show ONE size in the listing, but the shoe is sold in a full range. Return the standard US size range for the gender. Women's: ["5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"]. Men's: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "12.5", "13", "14"]. If the page shows an explicit list of available sizes, use that instead.
2. For CLOTHING: use standard sizes ["XXS", "XS", "S", "M", "L", "XL", "XXL"] or numeric sizes as appropriate for the garment type.
3. For COLORS: If the page lists multiple colorways, include them all. If only one color is shown, include it so the user confirms. Look for color names in the product title and page data.
4. For OTHER: include width, fit, length, inseam, or any other selectable variant mentioned (e.g., [{"label": "Width", "values": ["Regular", "Wide"]}]).
5. If the product doesn't need variants (e.g., one-size accessories, bags), return empty arrays.
6. Use the product title, category, and page data to determine the product type and return appropriate options.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const options = JSON.parse(cleaned);
      return NextResponse.json({
        sizes: Array.isArray(options.sizes) ? options.sizes : [],
        colors: Array.isArray(options.colors) ? options.colors : [],
        other: Array.isArray(options.other) ? options.other : [],
      });
    } catch {
      return NextResponse.json({ sizes: [], colors: [], other: [] });
    }
  } catch {
    return NextResponse.json({ sizes: [], colors: [], other: [] });
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

function extractMerchantUrl(
  googleHtml: string,
  source: string
): string | null {
  const sourceLower = source.toLowerCase().replace(/['']/g, "");

  const domainMap: Record<string, string> = {
    "dicks sporting goods": "dickssportinggoods.com",
    "finish line": "finishline.com",
    "foot locker": "footlocker.com",
    nike: "nike.com",
    adidas: "adidas.com",
    nordstrom: "nordstrom.com",
    amazon: "amazon.com",
    "amazon.com": "amazon.com",
    zappos: "zappos.com",
    asos: "asos.com",
    zara: "zara.com",
    "h&m": "hm.com",
    macys: "macys.com",
    "macy's": "macys.com",
    target: "target.com",
    walmart: "walmart.com",
    goat: "goat.com",
    stockx: "stockx.com",
    "jd sports": "jdsports.com",
    "neiman marcus": "neimanmarcus.com",
    saks: "saksfifthavenue.com",
    bloomingdales: "bloomingdales.com",
    "bloomingdale's": "bloomingdales.com",
    revolve: "revolve.com",
    ssense: "ssense.com",
    farfetch: "farfetch.com",
    lululemon: "lululemon.com",
    puma: "puma.com",
    "new balance": "newbalance.com",
    "urban outfitters": "urbanoutfitters.com",
    gap: "gap.com",
    uniqlo: "uniqlo.com",
  };

  const domain =
    domainMap[sourceLower] ||
    sourceLower.replace(/[^a-z0-9]/g, "") + ".com";

  const escapedDomain = domain.replace(/\./g, "\\.");
  const urlPattern = new RegExp(
    `https?://(?:www\\.)?${escapedDomain}[^"'\\s<>]*`,
    "gi"
  );
  const matches = googleHtml.match(urlPattern);

  if (matches && matches.length > 0) {
    let bestUrl = "";
    for (const m of matches) {
      const cleaned = m.replace(/&amp;/g, "&");
      const endIdx = cleaned.search(/[<>"'\\]/);
      const url = endIdx > 0 ? cleaned.slice(0, endIdx) : cleaned;
      if (url.length > bestUrl.length) {
        bestUrl = url;
      }
    }
    if (bestUrl) return bestUrl;
  }

  return null;
}

function stripToText(html: string): string {
  // Remove scripts, styles, SVGs, comments
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/data:image\/[^"']*/gi, "");

  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // Decode HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#32;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&#\d+;/g, " ")
    .replace(/&\w+;/g, " ");

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}
