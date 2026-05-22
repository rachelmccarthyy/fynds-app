import "server-only";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Lazy singleton — created on first request, not at module import time.
// Module-level createClient() crashes Next.js page-data collection when
// SUPABASE_SERVICE_ROLE_KEY is only available at runtime (not build time).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any, any, any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function supabaseAdmin(): SupabaseClient<any, any, any> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "[fynds:supabase] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
      "Add them in Vercel → Project Settings → Environment Variables (Production + Preview)."
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _admin = createClient<any, any, any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

/**
 * Extracts and verifies the Supabase access token from an API request.
 * Checks Authorization: Bearer <token> header first, then ?token= query param
 * (EventSource/SSE connections cannot set custom headers).
 * Returns the authenticated user (anon or permanent) or null.
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
  } = await supabaseAdmin().auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email };
}
