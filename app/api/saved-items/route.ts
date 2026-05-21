import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getRequestUser } from "@/lib/supabase/server";
import { isTrustedOrigin, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { computeProductKey } from "@/lib/product-key";
import type { Product, ProductOptions } from "@/lib/types";

function guards(req: NextRequest) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 30, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  return null;
}

function parsePrice(price: string): number | null {
  const n = parseFloat(price.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? null : n;
}

export async function GET(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body: { kind: "favorite" | "cart"; product: Product; options?: ProductOptions } =
    await req.json();

  const productKey = computeProductKey(body.product);

  // Upsert product dimension first (FK required; only service role can write products)
  const { error: productErr } = await supabaseAdmin.from("products").upsert(
    {
      product_key: productKey,
      title: body.product.title,
      source: body.product.source,
      link: body.product.link,
      image_url: body.product.imageUrl,
      latest_price: parsePrice(body.product.price),
      last_seen: new Date().toISOString(),
    },
    { onConflict: "product_key" }
  );
  if (productErr) return NextResponse.json({ error: productErr.message }, { status: 500 });

  // Upsert saved item (update snapshot + options if already saved)
  const { error: itemErr } = await supabaseAdmin.from("saved_items").upsert(
    {
      user_id: user.id,
      kind: body.kind,
      product_key: productKey,
      product_snapshot: body.product,
      options: body.options ?? {},
    },
    { onConflict: "user_id,kind,product_key" }
  );
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, productKey });
}

export async function DELETE(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body: { kind: "favorite" | "cart"; productKey?: string; all?: boolean } =
    await req.json();

  let query = supabaseAdmin
    .from("saved_items")
    .delete()
    .eq("user_id", user.id)
    .eq("kind", body.kind);

  if (!body.all) {
    if (!body.productKey) return NextResponse.json({ error: "productKey required" }, { status: 400 });
    query = query.eq("product_key", body.productKey);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
