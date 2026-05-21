"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import {
  CheckoutStep,
  ShippingAddress,
  PaymentDetails,
  CheckoutStatus,
  OrderItem,
} from "./types";
import { useStore } from "./store-context";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";

interface CheckoutContextType {
  step: CheckoutStep;
  shipping: ShippingAddress | null;
  payment: PaymentDetails | null;
  checkoutStatus: CheckoutStatus | null;
  isCheckoutOpen: boolean;
  items: OrderItem[];
  setStep: (step: CheckoutStep) => void;
  setShipping: (address: ShippingAddress) => void;
  setPayment: (payment: PaymentDetails) => void;
  startCheckout: () => void;
  closeCheckout: () => void;
  submitOrder: () => Promise<void>;
}

const CheckoutContext = createContext<CheckoutContextType | null>(null);

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const { cart, setIsCartOpen } = useStore();
  const { accessToken } = useSupabaseAuth();
  const [step, setStep] = useState<CheckoutStep>("cart_review");
  const [shipping, setShipping] = useState<ShippingAddress | null>(null);
  const [payment, setPaymentState] = useState<PaymentDetails | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus | null>(
    null
  );
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const items: OrderItem[] = cart.map((p) => ({
    product: p,
    quantity: 1,
    retailer: p.source,
    retailerDomain: extractDomain(p.link),
    options: p.options,
  }));

  const startCheckout = useCallback(() => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
    setStep("cart_review");
    setCheckoutStatus(null);
  }, [setIsCartOpen]);

  const closeCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
    setStep("cart_review");
    setPaymentState(null);
    setCheckoutStatus(null);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const setPayment = useCallback((p: PaymentDetails) => {
    setPaymentState(p);
  }, []);

  const submitOrder = useCallback(async () => {
    if (!shipping || !payment) return;

    setStep("processing");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ items, shipping, payment }),
      });

      if (!res.ok) throw new Error("Checkout failed to start");

      const { sessionId } = await res.json();

      // Connect to SSE stream. EventSource doesn't support custom headers,
      // so the token is passed as a query param for server-side verification.
      const sseUrl = `/api/checkout/status?sessionId=${sessionId}${
        accessToken ? `&token=${encodeURIComponent(accessToken)}` : ""
      }`;
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const status: CheckoutStatus = JSON.parse(event.data);
          setCheckoutStatus(status);

          if (
            status.overallStatus === "completed" ||
            status.overallStatus === "failed" ||
            status.overallStatus === "partial"
          ) {
            setStep("complete");
            es.close();
            eventSourceRef.current = null;
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch {
      setStep("complete");
      setCheckoutStatus({
        sessionId: "error",
        overallStatus: "failed",
        items: items.map((item) => ({
          productLink: item.product.link,
          status: "failed",
          message: "Failed to start checkout process",
          retailer: item.retailer,
        })),
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
    }
  }, [shipping, payment, items]);

  return (
    <CheckoutContext.Provider
      value={{
        step,
        shipping,
        payment,
        checkoutStatus,
        isCheckoutOpen,
        items,
        setStep,
        setShipping,
        setPayment,
        startCheckout,
        closeCheckout,
        submitOrder,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (!context)
    throw new Error("useCheckout must be used within CheckoutProvider");
  return context;
}
