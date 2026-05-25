import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isTrustedOrigin, getClientIp, checkRateLimit } from "@/lib/rate-limit";
import { trackServer } from "@/lib/analytics/server-track";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ip = getClientIp(request);
  if (!checkRateLimit(ip, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const token = typeof body.token === "string" ? body.token : null;
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin().auth.getUser(token);

    if (error || !user || user.is_anonymous) {
      return NextResponse.json({ error: "Invalid or anonymous user" }, { status: 401 });
    }

    await trackServer({
      event_type: "identity_merge",
      user_id: user.id,
      anon_id:    typeof body.anon_id === "string"    ? body.anon_id    : null,
      session_id: typeof body.session_id === "string"  ? body.session_id : null,
      platform:   typeof body.platform === "string"    ? body.platform   : null,
      properties: {
        anon_id: typeof body.anon_id === "string" ? body.anon_id : null,
        user_id: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[fynds:identity-merge] failed:", err);
    try {
      await trackServer({
        event_type: "error_event",
        properties: {
          scope: "identity-merge",
          class: err instanceof Error ? err.constructor.name : "unknown",
        },
      });
    } catch { /* never surface a logging failure */ }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
