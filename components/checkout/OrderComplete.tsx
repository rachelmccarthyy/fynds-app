"use client";

import { useCheckout } from "@/lib/checkout-context";
import { useStore } from "@/lib/store-context";

export default function OrderComplete() {
  const { checkoutStatus, closeCheckout } = useCheckout();
  const { clearCart } = useStore();

  if (!checkoutStatus) return null;

  const succeeded = checkoutStatus.items.filter((i) => i.status === "completed");
  const failed = checkoutStatus.items.filter(
    (i) => i.status === "failed" || i.status === "captcha_required"
  );

  const handleDone = () => {
    if (succeeded.length > 0) clearCart();
    closeCheckout();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {/* Overall status */}
        <div className="text-center mb-6">
          {checkoutStatus.overallStatus === "completed" ? (
            <>
              <div className="w-16 h-16 mx-auto mb-3 bg-green-50 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-fg">All Items Purchased!</h2>
              <p className="text-xs text-muted mt-1">Your orders have been placed successfully.</p>
            </>
          ) : checkoutStatus.overallStatus === "failed" ? (
            <>
              <div className="w-16 h-16 mx-auto mb-3 bg-red-50 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-fg">Checkout Failed</h2>
              <p className="text-xs text-muted mt-1">We couldn&apos;t complete the purchases.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-fg">Partially Completed</h2>
              <p className="text-xs text-muted mt-1">
                {succeeded.length} of {checkoutStatus.items.length} items purchased.
              </p>
            </>
          )}
        </div>

        {/* Succeeded items */}
        {succeeded.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">
              Purchased
            </h3>
            <div className="space-y-2">
              {succeeded.map((item) => (
                <div key={item.productLink} className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs font-medium text-fg">{item.retailer}</p>
                  {(item.confirmationNumber || item.confirmation?.orderNumber) && (
                    <p className="text-[10px] text-green-700 mt-0.5 font-mono">
                      Order #: {item.confirmation?.orderNumber || item.confirmationNumber}
                    </p>
                  )}
                  {item.confirmation?.orderTotal && (
                    <p className="text-[10px] text-fg mt-0.5">
                      Total: {item.confirmation.orderTotal}
                    </p>
                  )}
                  {item.confirmation?.estimatedDelivery && (
                    <p className="text-[10px] text-fg mt-0.5">
                      Est. delivery: {item.confirmation.estimatedDelivery}
                    </p>
                  )}
                  {item.confirmation?.itemDetails && (
                    <p className="text-[10px] text-muted mt-0.5">
                      {item.confirmation.itemDetails}
                    </p>
                  )}
                  <p className="text-[10px] text-muted mt-0.5">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed items */}
        {failed.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
              Not Completed
            </h3>
            <div className="space-y-2">
              {failed.map((item) => (
                <div key={item.productLink} className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-fg">{item.retailer}</p>
                  <p className="text-[10px] text-red-600 mt-0.5">{item.message}</p>
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
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={handleDone}
          className="w-full py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
