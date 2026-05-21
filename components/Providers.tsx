"use client";

import { SupabaseAuthProvider } from "@/lib/supabase/auth-context";
import { StoreProvider } from "@/lib/store-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <StoreProvider>
        <CheckoutProvider>{children}</CheckoutProvider>
      </StoreProvider>
    </SupabaseAuthProvider>
  );
}
