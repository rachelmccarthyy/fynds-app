import { createClient } from "@supabase/supabase-js";

// Browser-side singleton. Session is persisted in localStorage by the SDK.
// Safe to import in client components — uses anon key (RLS-constrained).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
