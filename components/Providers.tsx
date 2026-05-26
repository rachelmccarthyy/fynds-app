"use client";

import { SupabaseAuthProvider } from "@/lib/supabase/auth-context";
import { StoreProvider } from "@/lib/store-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import SessionTracker from "@/components/SessionTracker";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <SessionTracker />
      <StoreProvider>
        <CheckoutProvider>{children}</CheckoutProvider>
      </StoreProvider>
    </SupabaseAuthProvider>
  );
}
