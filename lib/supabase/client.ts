import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface missing env vars clearly rather than making cryptic auth failures.
  console.error(
    "[fynds:supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
    "Auth will not work. Add these to .env.local (dev) or Vercel env vars (preview/prod)."
  );
}

// Browser-side singleton. Session is persisted in localStorage by the SDK.
// Safe to import in client components — uses anon key (RLS-constrained).
// Fallback placeholders prevent createClient from throwing at build time when
// NEXT_PUBLIC_ vars aren't set in the build environment. Auth calls fail at runtime instead.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);
