"use client";

import { useCheckout } from "@/lib/checkout-context";
import { ItemStatus } from "@/lib/types";

const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Waiting...",
  navigating: "Navigating to store...",
  adding_to_cart: "Adding to cart...",
  filling_shipping: "Entering shipping info...",
  filling_payment: "Entering payment...",
  confirming: "Confirming order...",
  completed: "Purchased!",
  failed: "Failed",
  captcha_required: "Manual action needed",
};

const STATUS_COLORS: Record<ItemStatus, string> = {
  pending: "text-muted",
  navigating: "text-blue-600",
  adding_to_cart: "text-blue-600",
  filling_shipping: "text-blue-600",
  filling_payment: "text-blue-600",
  confirming: "text-amber-600",
  completed: "text-green-600",
  failed: "text-red-500",
  captcha_required: "text-amber-600",
};

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "completed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (status === "captcha_required") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (status === "pending") {
    return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
  }
  // Active states — spinner
  return (
    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
  );
}

export default function OrderProgress() {
  const { checkoutStatus } = useCheckout();

  if (!checkoutStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5">
        <div className="w-8 h-8 rounded-full border-3 border-pink border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-fg font-medium">Starting checkout...</p>
        <p className="text-xs text-muted mt-1">Connecting to purchase agent</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <h2 className="text-lg font-semibold text-fg mb-1">Processing Your Order</h2>
      <p className="text-xs text-muted mb-4">
        Our AI agent is purchasing items from each retailer.
      </p>

      <div className="flex-1 overflow-y-auto space-y-3">
        {checkoutStatus.items.map((item) => (
          <div key={item.productLink} className="p-3 bg-surface rounded-lg">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <StatusIcon status={item.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-fg">{item.retailer}</p>
                <p className={`text-[11px] mt-0.5 ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </p>
                {item.message && item.message !== STATUS_LABELS[item.status] && (
                  <p className="text-[10px] text-muted mt-0.5">{item.message}</p>
                )}
                {item.manualCheckoutUrl && (
                  <a
                    href={item.manualCheckoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-pink hover:underline mt-1 inline-block"
                  >
                    Complete manually &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
