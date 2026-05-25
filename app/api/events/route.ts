import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getClientIp, checkRateLimit, isTrustedOrigin } from "@/lib/rate-limit";

// v0.5.3 client-origin event types only. Server-origin types (query_classified,
// search_executed, api_cost, identity_merge) bypass this route via trackServer().
const VALID_EVENT_TYPES = new Set([
  "session_start",
  "session_end",
  "results_impression",
  "product_save",
  "product_unsave",
  "product_dismiss",
  "buy_clicked",
  "error_event",
]);

const VALID_PLATFORMS = new Set([
  "mobile_web",
  "desktop_web",
  "ios",
  "android",
]);

type ValidationResult =
  | { valid: true; data: Record<string, unknown> }
  | { valid: false; reason: string };

function validateEvent(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, reason: "event is not an object" };
  }
  const e = raw as Record<string, unknown>;

  if (!e.event_type || typeof e.event_type !== "string") {
    return { valid: false, reason: "event_type missing or not a string" };
  }
  if (!VALID_EVENT_TYPES.has(e.event_type)) {
    return { valid: false, reason: `unknown event_type "${e.event_type}"` };
  }
  if (!e.session_id || typeof e.session_id !== "string") {
    return { valid: false, reason: "session_id missing or not a string" };
  }
  if (!e.platform || typeof e.platform !== "string" || !VALID_PLATFORMS.has(e.platform)) {
    return { valid: false, reason: `invalid platform "${e.platform ?? ""}"` };
  }

  return {
    valid: true,
    data: {
      event_type:     e.event_type,
      session_id:     e.session_id,
      platform:       e.platform,
      anon_id:        typeof e.anon_id === "string"       ? e.anon_id        : null,
      app_version:    typeof e.app_version === "string"   ? e.app_version    : null,
      surface:        typeof e.surface === "string"        ? e.surface        : null,
      schema_version: typeof e.schema_version === "number" ? e.schema_version : 1,
      properties:     e.properties && typeof e.properties === "object" && !Array.isArray(e.properties)
                        ? e.properties
                        : {},
      // ts intentionally absent — DB default now() is the server stamp; client value ignored
    },
  };
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  // Generous limit: batched impressions are high-volume; 1 request = 1 unit regardless of batch size.
  // TODO(upstash): replace with @upstash/ratelimit + Upstash Redis before public launch —
  //   in-memory counter is per-instance and unreliable on Vercel serverless (see PROJECT.md §6).
  if (!checkRateLimit(ip, 300, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Both transports (fetch and sendBeacon) use { events: EventPayload[], token?: string }.
  // Fetch path: token absent, identity from Authorization: Bearer header.
  // Beacon path: token in body, can't set headers.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json({ error: "Body must be { events: [...], token?: string }" }, { status: 400 });
  }
  const wrapper = parsed as Record<string, unknown>;

  // Strip order: extract token first, before events touches anything. Token never reaches a row.
  const bodyToken = typeof wrapper.token === "string" ? wrapper.token : null;
  const events = wrapper.events;

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "events must be an array" }, { status: 400 });
  }
  if (events.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 });
  }
  if (events.length > 100) {
    return NextResponse.json({ error: "Batch exceeds maximum of 100 events" }, { status: 400 });
  }

  // Derive user_id: Bearer header (fetch path) takes precedence; body.token (beacon path) fallback.
  // Both paths verify via getUser() — never trust the raw value.
  // Missing/invalid token → user_id null; insert still proceeds (anonymous sessions accepted).
  let userId: string | null = null;
  const authHeader = request.headers.get("authorization");
  const rawToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : bodyToken;

  if (rawToken) {
    const { data: { user } } = await supabaseAdmin().auth.getUser(rawToken);
    if (user) userId = user.id;
  }

  // validate-then-insert-valid: bad events dropped loudly, valid events inserted.
  // All-or-nothing would silently lose good rows on sendBeacon unload flushes where
  // the client can't see the 400 or retry. One console.error per drop keeps bugs visible.
  // TODO: aggregate dropped-event counter by type when Upstash lands for a metrics signal.
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < events.length; i++) {
    const result = validateEvent(events[i]);
    if (!result.valid) {
      console.error(
        `[fynds:events] dropped event[${i}]: ${result.reason}`,
        JSON.stringify(events[i]).slice(0, 200)
      );
      continue;
    }
    rows.push({ ...result.data, user_id: userId });
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, dropped: events.length });
  }

  const { error } = await supabaseAdmin().from("events").insert(rows);
  if (error) {
    // Insert failure is logged, never re-emitted to events (no recursive loop).
    console.error("[fynds:events] insert failed:", error.message);
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length,
    dropped: events.length - rows.length,
  });
}
