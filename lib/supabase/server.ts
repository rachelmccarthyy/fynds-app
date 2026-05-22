import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Server-only admin client — service role key bypasses RLS.
// Never import this in client components or expose to the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // Fail loudly at startup so the missing var is obvious in logs,
  // rather than a cryptic "supabaseUrl is required" throw from the SDK.
  throw new Error(
    "[fynds:supabase] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as server env vars. " +
    "Add them in Vercel → Project Settings → Environment Variables (Production + Preview)."
  );
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * Extracts and verifies the Supabase access token from an API request.
 * Checks Authorization: Bearer <token> header first, then ?token= query param
 * (EventSource/SSE connections cannot set custom headers).
 * Returns the authenticated user (anon or permanent) or null.
 * Replaces NextAuth's auth() in API route guards.
 */
export async function getRequestUser(
  req: NextRequest
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // SSE fallback: EventSource can't set headers, so the client passes ?token=
  if (!token) {
    token = req.nextUrl.searchParams.get("token");
  }

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

export { supabaseAdmin };
