"use client";

import { useCheckout } from "@/lib/checkout-context";
import Image from "next/image";

export default function CartReview() {
  const { items, setStep } = useCheckout();

  // Group items by retailer
  const grouped = items.reduce(
    (acc, item) => {
      const key = item.retailerDomain;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <h2 className="text-lg font-semibold text-fg mb-1">Review Your Items</h2>
        <p className="text-xs text-muted mb-4">
          Fynds will purchase these items on your behalf from each retailer.
        </p>

        {Object.entries(grouped).map(([domain, groupItems]) => (
          <div key={domain} className="mb-4">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">
              {domain} ({groupItems.length} {groupItems.length === 1 ? "item" : "items"})
            </div>
            <div className="space-y-2">
              {groupItems.map((item) => (
                <div
                  key={item.product.link}
                  className="flex gap-3 p-3 bg-surface rounded-lg"
                >
                  <div className="shrink-0 w-14 h-14 relative bg-white rounded overflow-hidden">
                    {item.product.imageUrl ? (
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        fill
                        className="object-contain p-1"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted text-[10px]">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs font-medium text-fg line-clamp-2 leading-snug">
                      {item.product.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-semibold text-pink">
                        {item.product.price}
                      </p>
                      <span className="text-[9px] text-muted">
                        from {item.retailer}
                      </span>
                    </div>
                    {/* Rating */}
                    {item.product.rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] text-amber-600">
                          {"★".repeat(Math.round(item.product.rating))}{"☆".repeat(5 - Math.round(item.product.rating))}
                        </span>
                        <span className="text-[9px] text-muted">
                          {item.product.rating}
                          {item.product.ratingCount ? ` (${item.product.ratingCount > 1000 ? `${(item.product.ratingCount / 1000).toFixed(1)}k` : item.product.ratingCount})` : ""}
                        </span>
                      </div>
                    )}
                    {/* User-selected options */}
                    {item.options && (item.options.size || item.options.color || item.options.notes) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.options.size && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink/10 text-pink rounded font-medium">
                            Size: {item.options.size}
                          </span>
                        )}
                        {item.options.color && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink/10 text-pink rounded font-medium">
                            Color: {item.options.color}
                          </span>
                        )}
                        {item.options.notes && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-white rounded text-muted font-medium">
                            {item.options.notes}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Delivery info */}
                    {item.product.delivery && (
                      <p className="text-[9px] text-green-600 mt-0.5">{item.product.delivery}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <span className="font-semibold">How it works:</span> An AI agent will navigate
            to each retailer&apos;s website and complete the purchase using the shipping and
            payment details you provide. Your payment info is never stored.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <button
          onClick={() => setStep("shipping")}
          className="w-full py-3 bg-pink text-white text-sm font-semibold rounded-xl hover:bg-pink-dark transition-colors"
        >
          Continue to Shipping
        </button>
      </div>
    </div>
  );
}
