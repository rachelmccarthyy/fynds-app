import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// Server-only admin client — service role key bypasses RLS.
// Never import this in client components or expose to the browser.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Extracts and verifies the Supabase access token from the Authorization header.
 * Returns the authenticated user (anon or permanent) or null.
 * Replaces NextAuth's auth() in API route guards.
 */
export async function getRequestUser(
  req: NextRequest | { headers: { get(key: string): string | null } }
): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

export { supabaseAdmin };
