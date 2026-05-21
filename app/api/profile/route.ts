import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, getRequestUser } from "@/lib/supabase/server";
import { isTrustedOrigin, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import type { StyleProfile } from "@/lib/types";

function guards(req: NextRequest) {
  if (!isTrustedOrigin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, 30, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  return null;
}

export async function GET(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body: StyleProfile = await req.json();

  const { error } = await supabaseAdmin.from("profiles").upsert({
    user_id: user.id,
    aesthetic: body.aesthetic || null,
    budget_range: body.budgetRange || null,
    sizes: body.sizes ? { default: body.sizes } : {},
    shoe_size: body.shoeSize || null,
    gender: body.gender || null,
    avoid_brands: body.avoidBrands
      ? body.avoidBrands.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    notes: body.notes || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const block = guards(req);
  if (block) return block;

  const user = await getRequestUser(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
