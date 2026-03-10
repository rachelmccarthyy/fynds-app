"use client";

import { SessionProvider } from "next-auth/react";
import { StoreProvider } from "@/lib/store-context";
import { CheckoutProvider } from "@/lib/checkout-context";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <StoreProvider>
        <CheckoutProvider>{children}</CheckoutProvider>
      </StoreProvider>
    </SessionProvider>
  );
}
