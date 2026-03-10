"use client";

import { useCheckout } from "@/lib/checkout-context";
import CartReview from "./checkout/CartReview";
import ShippingForm from "./checkout/ShippingForm";
import PaymentForm from "./checkout/PaymentForm";
import ConfirmOrder from "./checkout/ConfirmOrder";
import OrderProgress from "./checkout/OrderProgress";
import OrderComplete from "./checkout/OrderComplete";

const STEP_LABELS = [
  { key: "cart_review", label: "Review" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
  { key: "confirm", label: "Confirm" },
] as const;

export default function CheckoutFlow() {
  const { isCheckoutOpen, step, closeCheckout } = useCheckout();

  if (!isCheckoutOpen) return null;

  const isProcessing = step === "processing" || step === "complete";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50"
        onClick={isProcessing ? undefined : closeCheckout}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-semibold text-fg">Checkout</h1>
            {!isProcessing && (
              <button
                onClick={closeCheckout}
                className="p-1 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Close checkout"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Step indicators */}
          {!isProcessing && (
            <div className="flex gap-1">
              {STEP_LABELS.map(({ key, label }) => (
                <div key={key} className="flex-1">
                  <div
                    className={`h-1 rounded-full transition-colors ${
                      STEP_LABELS.findIndex((s) => s.key === key) <=
                      STEP_LABELS.findIndex((s) => s.key === step)
                        ? "bg-pink"
                        : "bg-gray-200"
                    }`}
                  />
                  <p className="text-[9px] text-muted mt-1 text-center">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 min-h-0">
          {step === "cart_review" && <CartReview />}
          {step === "shipping" && <ShippingForm />}
          {step === "payment" && <PaymentForm />}
          {step === "confirm" && <ConfirmOrder />}
          {step === "processing" && <OrderProgress />}
          {step === "complete" && <OrderComplete />}
        </div>
      </div>
    </>
  );
}
